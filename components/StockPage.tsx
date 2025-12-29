"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
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
  RefreshCw
} from "lucide-react"

// Mock data for stock items with comprehensive inventory information
const stockData = [
  {
    id: 1,
    name: "4K Security Camera - Model X1",
    sku: "CAM-X1-4K",
    category: "Cameras",
    brand: "VisionTech",
    currentStock: 245,
    minStock: 50,
    maxStock: 500,
    unitPrice: 24999.00,
    totalValue: 6124755.00,
    supplier: "TechSupply Co.",
    location: "Warehouse A - Shelf 12",
    status: "in_stock",
    lastRestocked: "2024-12-20",
    expiryDate: null,
    description: "Professional 4K security camera with night vision",
    image: "camera_x1.jpg"
  },
  {
    id: 2,
    name: "Fiber Optic Cable - 100m",
    sku: "FOC-100M",
    category: "Cables",
    brand: "FiberLink",
    currentStock: 15,
    minStock: 25,
    maxStock: 100,
    unitPrice: 7450.00,
    totalValue: 111750.00,
    supplier: "Cable Solutions Ltd",
    location: "Warehouse B - Section 3",
    status: "low_stock",
    lastRestocked: "2024-12-15",
    expiryDate: null,
    description: "High-quality single-mode fiber optic cable",
    image: "fiber_cable.jpg"
  },
  {
    id: 3,
    name: "Network Switch - 24 Port",
    sku: "NSW-24P",
    category: "Network Equipment",
    brand: "NetCore",
    currentStock: 0,
    minStock: 10,
    maxStock: 50,
    unitPrice: 37500.00,
    totalValue: 0,
    supplier: "Network Pro Inc",
    location: "Warehouse A - Shelf 8",
    status: "out_of_stock",
    lastRestocked: "2024-11-28",
    expiryDate: null,
    description: "Managed 24-port Gigabit Ethernet switch",
    image: "network_switch.jpg"
  },
  {
    id: 4,
    name: "Power Supply Unit - 12V 5A",
    sku: "PSU-12V5A",
    category: "Power Supplies",
    brand: "PowerMax",
    currentStock: 180,
    minStock: 30,
    maxStock: 200,
    unitPrice: 3825.00,
    totalValue: 688500.00,
    supplier: "ElectroSupply Corp",
    location: "Warehouse C - Bin 15",
    status: "in_stock",
    lastRestocked: "2024-12-22",
    expiryDate: null,
    description: "Regulated switching power supply unit",
    image: "power_supply.jpg"
  },
  {
    id: 5,
    name: "Mounting Bracket Set",
    sku: "MBS-STD",
    category: "Accessories",
    brand: "MountTech",
    currentStock: 320,
    minStock: 100,
    maxStock: 500,
    unitPrice: 1040.00,
    totalValue: 332800.00,
    supplier: "Hardware Plus",
    location: "Warehouse A - Shelf 20",
    status: "in_stock",
    lastRestocked: "2024-12-18",
    expiryDate: null,
    description: "Universal mounting bracket for cameras",
    image: "mounting_bracket.jpg"
  },
  {
    id: 6,
    name: "Ethernet Cable - Cat6 50m",
    sku: "ETH-CAT6-50",
    category: "Cables",
    brand: "CableMax",
    currentStock: 8,
    minStock: 20,
    maxStock: 80,
    unitPrice: 2975.00,
    totalValue: 23800.00,
    supplier: "Cable Solutions Ltd",
    location: "Warehouse B - Section 2",
    status: "low_stock",
    lastRestocked: "2024-12-10",
    expiryDate: null,
    description: "Cat6 UTP ethernet cable for high-speed data",
    image: "ethernet_cable.jpg"
  },
  {
    id: 7,
    name: "Hard Drive - 2TB Surveillance",
    sku: "HDD-2TB-SUR",
    category: "Storage",
    brand: "DataVault",
    currentStock: 95,
    minStock: 20,
    maxStock: 150,
    unitPrice: 10400.00,
    totalValue: 988000.00,
    supplier: "Storage Solutions Inc",
    location: "Warehouse C - Secure Area",
    status: "in_stock",
    lastRestocked: "2024-12-25",
    expiryDate: null,
    description: "Surveillance-grade 2TB hard drive",
    image: "hard_drive.jpg"
  },
  {
    id: 8,
    name: "Cleaning Kit - Camera Lens",
    sku: "CLK-LENS",
    category: "Maintenance",
    brand: "CleanTech",
    currentStock: 45,
    minStock: 15,
    maxStock: 100,
    unitPrice: 1580.00,
    totalValue: 71100.00,
    supplier: "Maintenance Supplies Co",
    location: "Warehouse A - Shelf 5",
    status: "in_stock",
    lastRestocked: "2024-12-20",
    expiryDate: "2026-12-31",
    description: "Professional camera lens cleaning kit",
    image: "cleaning_kit.jpg"
  }
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "in_stock":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "low_stock":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />
    case "out_of_stock":
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Package className="h-4 w-4 text-gray-400" />
  }
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export function StockPage() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [selectedStatus, setSelectedStatus] = React.useState("all")

  // Calculate summary statistics
  const totalItems = stockData.length
  const totalValue = stockData.reduce((sum, item) => sum + item.totalValue, 0)
  const lowStockItems = stockData.filter(item => item.status === "low_stock").length
  const outOfStockItems = stockData.filter(item => item.status === "out_of_stock").length
  const inStockItems = stockData.filter(item => item.status === "in_stock").length

  // Filter data based on search and filters
  const filteredData = stockData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
              <p className="text-gray-600">Monitor and manage inventory levels and supplies</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export Inventory
              </Button>
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Stock
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</div>
              <div className="text-sm text-gray-500">Total Value</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">{lowStockItems}</div>
              <div className="text-sm text-amber-600">Low Stock</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{outOfStockItems}</div>
              <div className="text-sm text-red-600">Out of Stock</div>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Items In Stock</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{inStockItems}</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+8.2%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">vs last month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Low Stock Alerts</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{lowStockItems}</span>
                  <div className="flex items-center gap-1 text-red-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+2</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">need restocking</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Value</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{formatCurrency(totalValue / 1000)}K</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+12.5%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">inventory value</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Pending Orders</CardTitle>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Truck className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">7</span>
                  <div className="flex items-center gap-1 text-blue-600">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-sm font-medium">-3</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">orders in transit</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="bg-white shadow-sm border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search items, SKU, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                      <Filter className="h-4 w-4 mr-2" />
                      Category
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedCategory("all")}>All Categories</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Cameras")}>Cameras</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Cables")}>Cables</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Network Equipment")}>Network Equipment</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Power Supplies")}>Power Supplies</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Storage")}>Storage</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Accessories")}>Accessories</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

        {/* Stock Table */}
        <Card className="bg-white shadow-sm border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 border-b border-gray-200">
                <TableHead className="w-[300px] py-4 px-6 font-semibold text-gray-700">Item Details</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Status</TableHead>
                <TableHead className="w-[150px] py-4 px-6 font-semibold text-gray-700">Stock Levels</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Unit Price</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Total Value</TableHead>
                <TableHead className="w-[180px] py-4 px-6 font-semibold text-gray-700">Location</TableHead>
                <TableHead className="py-4 px-6 font-semibold text-gray-700">Supplier</TableHead>
                <TableHead className="w-[60px] py-4 px-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item, index) => (
                <TableRow 
                  key={item.id} 
                  className={`hover:bg-gray-50/50 border-b border-gray-100 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                          <Package className="h-6 w-6" />
                        </div>
                        {getStatusIcon(item.status) && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                            {getStatusIcon(item.status)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        <p className="text-xs text-gray-400">{item.category} • {item.brand}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    {getStatusBadge(item.status)}
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{item.currentStock}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-sm text-gray-500">{item.maxStock}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            item.currentStock <= item.minStock 
                              ? 'bg-red-500' 
                              : item.currentStock <= item.minStock * 2 
                                ? 'bg-amber-500' 
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((item.currentStock / item.maxStock) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-400">Min: {item.minStock}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <span className="font-semibold text-gray-900">{formatCurrency(item.unitPrice)}</span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <span className="font-semibold text-gray-900">{formatCurrency(item.totalValue)}</span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="text-sm text-gray-600">
                      <p className="truncate">{item.location}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="text-sm text-gray-600">
                      <p className="truncate">{item.supplier}</p>
                      <p className="text-xs text-gray-400">Last: {item.lastRestocked}</p>
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
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Reorder
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 bg-white rounded-lg p-4 border border-gray-200">
          <div>
            Showing {filteredData.length} of {totalItems} items
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                3
              </Button>
            </div>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}