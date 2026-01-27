"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { useSession } from "next-auth/react"
import { GenerateLabelsDialog } from "./GenerateLabelsDialog"
import { getAvailableUnits } from "@/lib/server-api"
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Package, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Save,
  X,
  QrCode
} from "lucide-react"

interface Product {
  id: string
  sku: string
  productName: string
  description?: string
  boxQty: number
  totalUnits: number
  availableUnits?: number // Add available units from inventory
  reorderThreshold?: number
  unitPrice?: number
  supplier?: string
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface BarcodeHistory {
  id: string
  barcodeValue: string
  serialNumber: string
  boxQty: number
  status: string
  createdAt: string
  product: {
    productName: string
    sku: string
  }
  lastTransaction?: {
    type: string
    createdAt: string
    employee?: {
      name: string
      employeeId: string
    }
  }
}

const getStockStatus = (totalUnits: number, availableUnits?: number, reorderThreshold?: number) => {
  const available = availableUnits ?? totalUnits;
  const threshold = reorderThreshold ?? 10;
  
  if (available === 0) return "out_of_stock"
  if (available <= threshold) return "low_stock"
  return "in_stock"
}

export function ProductManagement() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [availableUnitsMap, setAvailableUnitsMap] = React.useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedStatus, setSelectedStatus] = React.useState("all")
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true)
  const [isLabelDialogOpen, setIsLabelDialogOpen] = React.useState(false)
  const [selectedProductForLabels, setSelectedProductForLabels] = React.useState<Product | null>(null)
  
  // Barcode history state
  const [barcodeHistory, setBarcodeHistory] = React.useState<BarcodeHistory[]>([])
  const [isLoadingBarcodes, setIsLoadingBarcodes] = React.useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = React.useState<Product | null>(null)
  const [isBarcodeHistoryOpen, setIsBarcodeHistoryOpen] = React.useState(false)
  const [barcodeSearchTerm, setBarcodeSearchTerm] = React.useState("")
  const [barcodePagination, setBarcodePagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  const { toast } = useToast()
  const { isAuthenticated } = useAuthenticatedFetch()
  const { data: session } = useSession()

  // Form state for adding/editing products
  const [formData, setFormData] = React.useState({
    sku: "",
    productName: "",
    description: "",
    boxQty: "",
    totalUnits: "",
    unitPrice: "",
    supplier: "",
    status: "ACTIVE"
  })

  const fetchProducts = React.useCallback(async () => {
    try {
      setIsLoadingProducts(true)
      
      if (!isAuthenticated) {
        throw new Error('Not authenticated')
      }
      
      // Call backend directly
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken
      const response = await fetch(`${backendUrl}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const productsData = data.data
          setProducts(productsData)
          
          // Fetch available units for each product
          const availableUnitsPromises = productsData.map(async (product: Product) => {
            try {
              const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken;
              const availableResponse = await getAvailableUnits(product.id, sessionToken);
              if (availableResponse.success && availableResponse.data) {
                return {
                  productId: product.id,
                  availableUnits: availableResponse.data.availableUnits
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch available units for product ${product.id}:`, error)
            }
            return {
              productId: product.id,
              availableUnits: product.totalUnits // Fallback to total units
            }
          })
          
          const availableUnitsResults = await Promise.all(availableUnitsPromises)
          const availableUnitsMap = availableUnitsResults.reduce((acc, result) => {
            acc[result.productId] = result.availableUnits
            return acc
          }, {} as Record<string, number>)
          
          setAvailableUnitsMap(availableUnitsMap)
        } else {
          throw new Error(data.error || 'Failed to fetch products')
        }
      } else {
        throw new Error('Failed to fetch products')
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      })
    } finally {
      setIsLoadingProducts(false)
    }
  }, [isAuthenticated, session, toast])

  const refreshInventoryData = React.useCallback(async () => {
    if (!products.length) return;
    
    try {
      const availableUnitsPromises = products.map(async (product: Product) => {
        try {
          const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken;
          const availableResponse = await getAvailableUnits(product.id, sessionToken);
          if (availableResponse.success && availableResponse.data) {
            return {
              productId: product.id,
              availableUnits: availableResponse.data.availableUnits
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch available units for product ${product.id}:`, error)
        }
        return {
          productId: product.id,
          availableUnits: product.totalUnits // Fallback to total units
        }
      })
      
      const availableUnitsResults = await Promise.all(availableUnitsPromises)
      const newAvailableUnitsMap = availableUnitsResults.reduce((acc, result) => {
        acc[result.productId] = result.availableUnits
        return acc
      }, {} as Record<string, number>)
      
      setAvailableUnitsMap(newAvailableUnitsMap)
      
      toast({
        title: "Success",
        description: "Inventory data refreshed successfully"
      })
    } catch (error) {
      console.error('Error refreshing inventory data:', error)
      toast({
        title: "Error",
        description: "Failed to refresh inventory data",
        variant: "destructive"
      })
    }
  }, [products, session, toast])

  // Auto-refresh inventory data every 30 seconds to catch any changes
  React.useEffect(() => {
    if (!products.length || !isAuthenticated) return;

    const interval = setInterval(() => {
      refreshInventoryData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [products.length, isAuthenticated, refreshInventoryData]);

  // Fetch products on component mount
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchProducts()
    }
  }, [isAuthenticated, fetchProducts])

  const fetchBarcodeHistory = async (productId: string, page: number = 1) => {
    try {
      setIsLoadingBarcodes(true)
      
      if (!isAuthenticated) {
        throw new Error('Not authenticated')
      }
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken
      const response = await fetch(`${backendUrl}/products/${productId}/barcode-history?page=${page}&limit=10`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBarcodeHistory(data.data.barcodes)
          setBarcodePagination(data.data.pagination)
        } else {
          throw new Error(data.error || 'Failed to fetch barcode history')
        }
      } else {
        throw new Error('Failed to fetch barcode history')
      }
    } catch (error) {
      console.error('Error fetching barcode history:', error)
      toast({
        title: "Error",
        description: "Failed to load barcode history",
        variant: "destructive"
      })
    } finally {
      setIsLoadingBarcodes(false)
    }
  }

  const handleViewBarcodeHistory = (product: Product) => {
    setSelectedProductForHistory(product)
    setIsBarcodeHistoryOpen(true)
    fetchBarcodeHistory(product.id)
  }

  // Calculate summary statistics
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.isActive).length
  const lowStockProducts = products.filter(p => {
    const availableUnits = availableUnitsMap[p.id]
    return getStockStatus(p.totalUnits, availableUnits, p.reorderThreshold) === "low_stock"
  }).length
  const outOfStockProducts = products.filter(p => {
    const availableUnits = availableUnitsMap[p.id]
    return getStockStatus(p.totalUnits, availableUnits, p.reorderThreshold) === "out_of_stock"
  }).length

  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const availableUnits = availableUnitsMap[product.id]
    const status = getStockStatus(product.totalUnits, availableUnits, product.reorderThreshold)
    const matchesStatus = selectedStatus === "all" || status === selectedStatus
    
    return matchesSearch && matchesStatus && product.isActive
  })

  const resetForm = () => {
    setFormData({
      sku: "",
      productName: "",
      description: "",
      boxQty: "",
      totalUnits: "",
      unitPrice: "",
      supplier: "",
      status: "ACTIVE"
    })
    setEditingProduct(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Check authentication
      if (!isAuthenticated) {
        throw new Error('Not authenticated')
      }

      // Validate required fields
      if (!formData.productName || !formData.boxQty || !formData.totalUnits) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        })
        return
      }

      const productData = {
        sku: formData.sku || undefined,
        productName: formData.productName,
        description: formData.description || undefined,
        boxQty: parseInt(formData.boxQty),
        totalUnits: parseInt(formData.totalUnits),
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : undefined,
        supplier: formData.supplier || undefined,
        status: formData.status
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken
      let response

      if (editingProduct) {
        // Update existing product
        response = await fetch(`${backendUrl}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify(productData)
        })
      } else {
        // Create new product
        response = await fetch(`${backendUrl}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify(productData)
        })
      }

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast({
            title: "Success",
            description: editingProduct ? "Product updated successfully" : "Product created successfully"
          })
          resetForm()
          setIsAddProductOpen(false)
          fetchProducts() // Refresh the products list
        } else {
          throw new Error(data.error || 'Failed to save product')
        }
      } else {
        const errorData = await response.json()
        if (response.status === 409) {
          // SKU conflict - suggest clearing the SKU field
          toast({
            title: "SKU Already Exists",
            description: "This SKU is already in use. Clear the SKU field to auto-generate a unique one.",
            variant: "destructive"
          })
        } else {
          throw new Error(errorData.error || 'Failed to save product')
        }
      }
    } catch (error: unknown) {
      console.error('Error saving product:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save product"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      sku: product.sku,
      productName: product.productName,
      description: product.description || "",
      boxQty: product.boxQty.toString(),
      totalUnits: product.totalUnits.toString(),
      unitPrice: product.unitPrice?.toString() || "",
      supplier: product.supplier || "",
      status: product.status
    })
    setIsAddProductOpen(true)
  }

  const handleDelete = async (productId: string) => {
    try {
      if (!isAuthenticated) {
        throw new Error('Not authenticated')
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken
      const response = await fetch(`${backendUrl}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast({
            title: "Success",
            description: "Product deleted successfully"
          })
          fetchProducts() // Refresh the products list
        } else {
          throw new Error(data.error || 'Failed to delete product')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete product')
      }
    } catch (error: unknown) {
      console.error('Error deleting product:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete product"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  const handleGenerateLabels = (product: Product) => {
    setSelectedProductForLabels(product)
    setIsLabelDialogOpen(true)
  }

  if (isLoadingProducts) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access product management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="border-gray-300 hover:bg-gray-50"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Stock
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-300 hover:bg-gray-50"
                onClick={() => {
                  fetchProducts();
                  refreshInventoryData();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export Products
              </Button>
              <Dialog open={isAddProductOpen} onOpenChange={(open) => {
                setIsAddProductOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? "Edit Product" : "Add New Product"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU (Optional)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="sku"
                            value={formData.sku}
                            onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                            placeholder="Auto-generated if empty"
                            className="flex-1"
                          />
                          {formData.sku && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData(prev => ({ ...prev, sku: "" }))}
                              className="px-3"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Leave empty to auto-generate a unique SKU
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="productName">Product Name *</Label>
                        <Input
                          id="productName"
                          value={formData.productName}
                          onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                          placeholder="Enter product name"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter product description"
                        rows={3}
                        maxLength={200}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500">
                        {formData.description.length}/200 characters
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="boxQty">Box Quantity *</Label>
                        <Input
                          id="boxQty"
                          type="number"
                          value={formData.boxQty}
                          onChange={(e) => setFormData(prev => ({ ...prev, boxQty: e.target.value }))}
                          placeholder="box quantity"
                          required
                          min="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalUnits">Total Units *</Label>
                        <Input
                          id="totalUnits"
                          type="number"
                          value={formData.totalUnits}
                          onChange={(e) => setFormData(prev => ({ ...prev, totalUnits: e.target.value }))}
                          placeholder="Current stock"
                          required
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">Unit Price</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          step="0.01"
                          value={formData.unitPrice}
                          onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
                          placeholder="Price per unit"
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supplier">Supplier</Label>
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                          placeholder="Supplier name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="DISCONTINUED">Discontinued</option>
                        <option value="OUT_OF_STOCK">Out of Stock</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          resetForm()
                          setIsAddProductOpen(false)
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
              <div className="text-sm text-gray-500">Total Products</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{activeProducts}</div>
              <div className="text-sm text-green-600">Active Products</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">{lowStockProducts}</div>
              <div className="text-sm text-amber-600">Low Stock</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{outOfStockProducts}</div>
              <div className="text-sm text-red-600">Out of Stock</div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <Card className="bg-white shadow-sm border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products, SKU, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                      <Filter className="h-4 w-4 mr-2" />
                      Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedStatus("all")}>All Status</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedStatus("in_stock")}>In Stock</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedStatus("low_stock")}>Low Stock</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedStatus("out_of_stock")}>Out of Stock</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="bg-white shadow-sm border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 border-b border-gray-200">
                <TableHead className="w-[280px] py-4 px-6 font-semibold text-gray-700">Product Details</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Status</TableHead>
                <TableHead className="w-[140px] py-4 px-6 font-semibold text-gray-700">Stock Levels</TableHead>
                <TableHead className="w-[100px] py-4 px-6 font-semibold text-gray-700">Unit Price</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Total Value</TableHead>
                <TableHead className="w-[150px] py-4 px-6 font-semibold text-gray-700">Supplier</TableHead>
                <TableHead className="w-[60px] py-4 px-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {searchTerm || selectedStatus !== "all" ? "No products found matching your criteria" : "No products available"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product, index) => {
                  return (
                    <TableRow 
                      key={product.id} 
                      className={`hover:bg-gray-50/50 border-b border-gray-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            <Package className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate max-w-[180px]" title={product.productName}>
                              {product.productName}
                            </p>
                            <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            {product.description && (
                              <p className="text-xs text-gray-400 truncate max-w-[200px]" title={product.description}>
                                {product.description.length > 50 
                                  ? `${product.description.substring(0, 50)}...` 
                                  : product.description
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge className={`${
                          product.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                          product.status === 'INACTIVE' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                          product.status === 'DISCONTINUED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        } font-medium`}>
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm">
                              <div className="font-semibold text-gray-900">
                                {availableUnitsMap[product.id] ?? product.totalUnits} / {product.totalUnits}
                              </div>
                              <div className="text-xs text-gray-500">
                                Available / Total
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (availableUnitsMap[product.id] ?? product.totalUnits) === 0
                                  ? 'bg-red-500' 
                                  : (availableUnitsMap[product.id] ?? product.totalUnits) <= (product.reorderThreshold ?? 10)
                                    ? 'bg-amber-500' 
                                    : 'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.min(((availableUnitsMap[product.id] ?? product.totalUnits) / Math.max(product.totalUnits, 1)) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm">
                          {product.unitPrice ? (
                            <span className="font-semibold text-gray-900">₹{product.unitPrice.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm">
                          {product.unitPrice ? (
                            <div>
                              <span className="font-semibold text-gray-900">
                                ₹{(product.unitPrice * (availableUnitsMap[product.id] ?? product.totalUnits)).toFixed(2)}
                              </span>
                              <div className="text-xs text-gray-500">Available Value</div>
                              {availableUnitsMap[product.id] !== product.totalUnits && (
                                <div className="text-xs text-gray-400">
                                  Total: ₹{(product.unitPrice * product.totalUnits).toFixed(2)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {product.supplier || <span className="text-gray-400">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateLabels(product)}>
                              <Package className="h-4 w-4 mr-2" />
                              Generate Labels
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewBarcodeHistory(product)}>
                              <QrCode className="h-4 w-4 mr-2" />
                              Barcode History
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 bg-white rounded-lg p-4 border border-gray-200">
          <div>
            Showing {filteredProducts.length} of {totalProducts} products
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200">
                1
              </Button>
            </div>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Generate Labels Dialog */}
      <GenerateLabelsDialog
        product={selectedProductForLabels}
        isOpen={isLabelDialogOpen}
        onClose={() => {
          setIsLabelDialogOpen(false)
          setSelectedProductForLabels(null)
        }}
      />

      {/* Barcode History Dialog */}
      <Dialog open={isBarcodeHistoryOpen} onOpenChange={setIsBarcodeHistoryOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Barcode Generation History
              {selectedProductForHistory && (
                <span className="text-sm font-normal text-gray-500">
                  - {selectedProductForHistory.productName} ({selectedProductForHistory.sku})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by barcode value or serial number..."
                  value={barcodeSearchTerm}
                  onChange={(e) => setBarcodeSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => selectedProductForHistory && fetchBarcodeHistory(selectedProductForHistory.id)}
                disabled={isLoadingBarcodes}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingBarcodes ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Barcode History Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50 z-10">
                    <TableRow>
                      <TableHead className="w-[200px]">Barcode Value</TableHead>
                      <TableHead className="w-[150px]">Serial Number</TableHead>
                      <TableHead className="w-[150px]">Created Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingBarcodes ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading barcode history...
                        </TableCell>
                      </TableRow>
                    ) : barcodeHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                          <QrCode className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          No barcodes generated for this product yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      barcodeHistory
                        .filter(barcode => 
                          barcodeSearchTerm === "" || 
                          barcode.barcodeValue.toLowerCase().includes(barcodeSearchTerm.toLowerCase()) ||
                          barcode.serialNumber.toLowerCase().includes(barcodeSearchTerm.toLowerCase())
                        )
                        .map((barcode) => (
                          <TableRow key={barcode.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">
                              {barcode.barcodeValue}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {barcode.serialNumber}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{new Date(barcode.createdAt).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(barcode.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {barcodePagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((barcodePagination.page - 1) * barcodePagination.limit) + 1} to{' '}
                  {Math.min(barcodePagination.page * barcodePagination.limit, barcodePagination.total)} of{' '}
                  {barcodePagination.total} barcodes
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={barcodePagination.page === 1 || isLoadingBarcodes}
                    onClick={() => {
                      const newPage = barcodePagination.page - 1
                      setBarcodePagination(prev => ({ ...prev, page: newPage }))
                      if (selectedProductForHistory) {
                        fetchBarcodeHistory(selectedProductForHistory.id, newPage)
                      }
                    }}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-500">
                    Page {barcodePagination.page} of {barcodePagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={barcodePagination.page === barcodePagination.totalPages || isLoadingBarcodes}
                    onClick={() => {
                      const newPage = barcodePagination.page + 1
                      setBarcodePagination(prev => ({ ...prev, page: newPage }))
                      if (selectedProductForHistory) {
                        fetchBarcodeHistory(selectedProductForHistory.id, newPage)
                      }
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsBarcodeHistoryOpen(false)
                setSelectedProductForHistory(null)
                setBarcodeHistory([])
                setBarcodeSearchTerm("")
                setBarcodePagination({ page: 1, limit: 10, total: 0, totalPages: 0 })
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}