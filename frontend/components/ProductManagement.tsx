"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Package, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Truck,
  ShoppingCart,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Save,
  X
} from "lucide-react"

interface Product {
  id: string
  sku: string
  productName: string
  description?: string
  boxQty: number
  totalUnits: number
  reorderThreshold: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const getStockStatus = (totalUnits: number, reorderThreshold: number) => {
  if (totalUnits === 0) return "out_of_stock"
  if (totalUnits <= reorderThreshold) return "low_stock"
  return "in_stock"
}

const getStatusBadge = (status: string) => {
  const variants = {
    in_stock: "bg-green-50 text-green-700 border-green-200",
    low_stock: "bg-amber-50 text-amber-700 border-amber-200",
    out_of_stock: "bg-red-50 text-red-700 border-red-200"
  }
  
  const labels = {
    in_stock: "In Stock",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock"
  }
  
  return (
    <Badge className={`${variants[status as keyof typeof variants]} font-medium`}>
      {labels[status as keyof typeof labels]}
    </Badge>
  )
}

export function ProductManagement() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedStatus, setSelectedStatus] = React.useState("all")
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true)
  const [isLabelDialogOpen, setIsLabelDialogOpen] = React.useState(false)
  const [selectedProductForLabels, setSelectedProductForLabels] = React.useState<Product | null>(null)
  const { toast } = useToast()
  const { authenticatedFetch, isAuthenticated } = useAuthenticatedFetch()
  const { data: session } = useSession()

  // Form state for adding/editing products
  const [formData, setFormData] = React.useState({
    sku: "",
    productName: "",
    description: "",
    boxQty: "",
    totalUnits: "",
    reorderThreshold: ""
  })

  // Fetch products on component mount
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchProducts()
    }
  }, [isAuthenticated])

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true)
      
      if (!isAuthenticated) {
        throw new Error('Not authenticated')
      }
      
      // Call backend directly
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.user?.sessionToken}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProducts(data.data)
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
  }

  // Calculate summary statistics
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.isActive).length
  const lowStockProducts = products.filter(p => getStockStatus(p.totalUnits, p.reorderThreshold) === "low_stock").length
  const outOfStockProducts = products.filter(p => getStockStatus(p.totalUnits, p.reorderThreshold) === "out_of_stock").length

  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const status = getStockStatus(product.totalUnits, product.reorderThreshold)
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
      reorderThreshold: ""
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
        reorderThreshold: parseInt(formData.reorderThreshold) || 0
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      let response

      if (editingProduct) {
        // Update existing product
        response = await fetch(`${backendUrl}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(session as any)?.user?.sessionToken}`,
          },
          body: JSON.stringify(productData)
        })
      } else {
        // Create new product
        response = await fetch(`${backendUrl}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(session as any)?.user?.sessionToken}`,
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
    } catch (error: any) {
      console.error('Error saving product:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
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
      reorderThreshold: product.reorderThreshold.toString()
    })
    setIsAddProductOpen(true)
  }

  const handleDelete = async (productId: string) => {
    try {
      if (!isAuthenticated) {
        throw new Error('Not authenticated')
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.user?.sessionToken}`,
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
    } catch (error: any) {
      console.error('Error deleting product:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
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
              <p className="text-gray-600">Manage your product catalog and inventory items</p>
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
                onClick={fetchProducts}
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

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="boxQty">Box Quantity *</Label>
                        <Input
                          id="boxQty"
                          type="number"
                          value={formData.boxQty}
                          onChange={(e) => setFormData(prev => ({ ...prev, boxQty: e.target.value }))}
                          placeholder="Units per box"
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
                      <div className="space-y-2">
                        <Label htmlFor="reorderThreshold">Reorder Threshold</Label>
                        <Input
                          id="reorderThreshold"
                          type="number"
                          value={formData.reorderThreshold}
                          onChange={(e) => setFormData(prev => ({ ...prev, reorderThreshold: e.target.value }))}
                          placeholder="Minimum stock level"
                          min="0"
                        />
                      </div>
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
                <TableHead className="w-[320px] py-4 px-6 font-semibold text-gray-700">Product Details</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Status</TableHead>
                <TableHead className="w-[100px] py-4 px-6 font-semibold text-gray-700">Box Qty</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Total Units</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Reorder Level</TableHead>
                <TableHead className="w-[150px] py-4 px-6 font-semibold text-gray-700">Created</TableHead>
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
                  const status = getStockStatus(product.totalUnits, product.reorderThreshold)
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
                        {getStatusBadge(status)}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="font-semibold text-gray-900">{product.boxQty}</span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="space-y-1">
                          <span className="font-semibold text-gray-900">{product.totalUnits}</span>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                product.totalUnits === 0
                                  ? 'bg-red-500' 
                                  : product.totalUnits <= product.reorderThreshold 
                                    ? 'bg-amber-500' 
                                    : 'bg-green-500'
                              }`}
                              style={{ 
                                width: `${Math.min((product.totalUnits / Math.max(product.reorderThreshold * 2, 100)) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="text-gray-600">{product.reorderThreshold}</span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          <p>{new Date(product.createdAt).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(product.createdAt).toLocaleTimeString()}
                          </p>
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
    </div>
  )
}