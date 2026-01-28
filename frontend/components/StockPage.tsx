"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import BarcodeScanner from "@/components/barcodeScanner/BarcodeScanner"
import { exportTransactionsToExcel } from "@/lib/server-api"
import { showToast } from "@/lib/toast-utils"
import { 
  Search, 
  Filter, 
  Download, 
  Package, 
  TrendingUp,
  AlertTriangle,
  XCircle,
  MoreVertical,
  BarChart3,
  Eye,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  User,
  Loader2
} from "lucide-react"

interface InventoryTransaction {
  id: string;
  transactionType: 'CHECKOUT' | 'RETURN' | 'ADJUST';
  checkoutQty: number;
  returnedQty: number;
  usedQty: number;
  remarks: string | null;
  createdAt: string;
  barcode: {
    id: string;
    barcodeValue: string;
    serialNumber: string;
    status: string;
    boxQty: number;
  };
  product: {
    id: string;
    sku: string;
    productName: string;
    description: string | null;
  };
  employee: {
    id: string;
    name: string;
    employeeId: string;
  };
}

interface TransactionSummary {
  totalTransactions: number;
  checkoutTransactions: number;
  returnTransactions: number;
  adjustTransactions: number;
  totalItemsCheckedOut: number;
  totalItemsReturned: number;
}

const getTransactionIcon = (type: string) => {
  switch (type) {
    case "CHECKOUT":
      return <ArrowUpCircle className="h-4 w-4 text-blue-600" />
    case "RETURN":
      return <ArrowDownCircle className="h-4 w-4 text-green-600" />
    case "ADJUST":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />
    default:
      return <Package className="h-4 w-4 text-gray-400" />
  }
}

const getTransactionBadge = (type: string) => {
  const variants = {
    CHECKOUT: "bg-blue-50 text-blue-700 border-blue-200",
    RETURN: "bg-green-50 text-green-700 border-green-200",
    ADJUST: "bg-amber-50 text-amber-700 border-amber-200"
  }
  
  const labels = {
    CHECKOUT: "Checkout",
    RETURN: "Return",
    ADJUST: "Adjust"
  }
  
  return (
    <Badge className={`${variants[type as keyof typeof variants]} font-medium`}>
      {labels[type as keyof typeof labels]}
    </Badge>
  )
}

const formatDateTime = (dateString: string) => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString))
}

export function StockPage() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedTransactionType, setSelectedTransactionType] = React.useState("all")
  const [selectedEmployee, setSelectedEmployee] = React.useState("all")
  const [transactions, setTransactions] = React.useState<InventoryTransaction[]>([])
  const [summary, setSummary] = React.useState<TransactionSummary>({
    totalTransactions: 0,
    checkoutTransactions: 0,
    returnTransactions: 0,
    adjustTransactions: 0,
    totalItemsCheckedOut: 0,
    totalItemsReturned: 0
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [exportLoading, setExportLoading] = React.useState<boolean>(false)

  // Fetch inventory transactions
  const fetchTransactions = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        throw new Error('Backend URL not configured')
      }

      // Get session token from NextAuth session
      const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken

      if (!sessionToken) {
        throw new Error('Authentication required - please log in')
      }

      const response = await fetch(`${backendUrl}/products/transactions?limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        const fetchedTransactions = data.data.transactions || []
        setTransactions(fetchedTransactions)
        
        // Calculate summary
        const newSummary: TransactionSummary = {
          totalTransactions: fetchedTransactions.length,
          checkoutTransactions: fetchedTransactions.filter((t: InventoryTransaction) => t.transactionType === 'CHECKOUT').length,
          returnTransactions: fetchedTransactions.filter((t: InventoryTransaction) => t.transactionType === 'RETURN').length,
          adjustTransactions: fetchedTransactions.filter((t: InventoryTransaction) => t.transactionType === 'ADJUST').length,
          totalItemsCheckedOut: fetchedTransactions.reduce((sum: number, t: InventoryTransaction) => sum + t.checkoutQty, 0),
          totalItemsReturned: fetchedTransactions.reduce((sum: number, t: InventoryTransaction) => sum + t.returnedQty, 0)
        }
        setSummary(newSummary)
      } else {
        throw new Error(data.error || 'Invalid response format')
      }
    } catch (err: unknown) {
      console.error('Error fetching transactions:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [session])

  // Load transactions on component mount and when session changes
  React.useEffect(() => {
    if (session) {
      fetchTransactions()
    }
  }, [fetchTransactions, session])

  const handleExport = async (quickRange?: 'yesterday' | '15days' | '30days') => {
    try {
      setExportLoading(true)

      const exportParams: { quickRange?: 'yesterday' | '15days' | '30days' } = {}
      
      if (quickRange) {
        exportParams.quickRange = quickRange
      }

      await exportTransactionsToExcel(exportParams)
      showToast.success('Export successful')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      showToast.error('Failed to export to Excel')
    } finally {
      setExportLoading(false)
    }
  }

  // Handle barcode scan
  const handleBarcodeScan = React.useCallback((barcodeValue: string) => {
    console.log('Barcode scanned:', barcodeValue)
    // The inventory change will be handled by the onInventoryChange callback
  }, [])

  // Handle inventory change (when barcode is scanned and transaction is created)
  const handleInventoryChange = React.useCallback(() => {
    console.log('Inventory changed, refreshing transactions...')
    // Refresh transactions to show the new one - increased delay to ensure transaction is processed
    setTimeout(() => {
      fetchTransactions()
    }, 2000) // Increased from 1000ms to 2000ms
  }, [fetchTransactions])

  // Filter transactions based on search and filters
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = transaction.product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.barcode.barcodeValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.employee.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesTransactionType = selectedTransactionType === "all" || transaction.transactionType === selectedTransactionType
      const matchesEmployee = selectedEmployee === "all" || transaction.employee.id === selectedEmployee
      
      return matchesSearch && matchesTransactionType && matchesEmployee
    })
  }, [transactions, searchTerm, selectedTransactionType, selectedEmployee])

  // Get unique employees for filter
  const uniqueEmployees = React.useMemo(() => {
    const employees = transactions.map(t => t.employee)
    const unique = employees.filter((employee, index, self) => 
      index === self.findIndex(e => e.id === employee.id)
    )
    return unique
  }, [transactions])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading inventory transactions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 mb-4">Error loading transactions: {error}</p>
          <Button onClick={fetchTransactions} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
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
              <h1 className="text-3xl font-bold text-gray-900">Inventory Transactions</h1>
            </div>
            <div className="flex items-center gap-3">
              <BarcodeScanner 
                onScan={handleBarcodeScan} 
                onInventoryChange={handleInventoryChange}
              />
              <Button 
                variant="outline" 
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={() => window.location.href = '/products'}
              >
                <Package className="h-4 w-4 mr-2" />
                Products
              </Button>
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50" onClick={fetchTransactions}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-gray-300 hover:bg-gray-50"
                    disabled={exportLoading}
                  >
                    {exportLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport()}>
                    Current Filter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('yesterday')}>
                    Yesterday
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('15days')}>
                    Last 15 Days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('30days')}>
                    Last 30 Days
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{summary.totalTransactions}</div>
              <div className="text-sm text-gray-500">Total Transactions</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{summary.checkoutTransactions}</div>
              <div className="text-sm text-blue-600">Checkouts</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{summary.returnTransactions}</div>
              <div className="text-sm text-green-600">Returns</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">{summary.totalItemsCheckedOut - summary.totalItemsReturned}</div>
              <div className="text-sm text-amber-600">Net Items Out</div>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Items Checked Out</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{summary.totalItemsCheckedOut}</span>
                  <div className="flex items-center gap-1 text-blue-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">Total</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">units checked out</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Items Returned</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <ArrowDownCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{summary.totalItemsReturned}</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">Total</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">units returned</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active Checkouts</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{summary.totalItemsCheckedOut - summary.totalItemsReturned}</span>
                  <div className="flex items-center gap-1 text-amber-600">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm font-medium">Net</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">items currently out</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Recent Activity</CardTitle>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{transactions.filter(t => new Date(t.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}</span>
                  <div className="flex items-center gap-1 text-purple-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">24h</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">transactions today</p>
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
                    placeholder="Search products, barcodes, or employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                      <Filter className="h-4 w-4 mr-2" />
                      Transaction Type
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedTransactionType("all")}>All Types</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedTransactionType("CHECKOUT")}>Checkout</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedTransactionType("RETURN")}>Return</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                      <User className="h-4 w-4 mr-2" />
                      Employee
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedEmployee("all")}>All Employees</DropdownMenuItem>
                    {uniqueEmployees.map(employee => (
                      <DropdownMenuItem key={employee.id} onClick={() => setSelectedEmployee(employee.id)}>
                        {employee.name} ({employee.employeeId})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-white shadow-sm border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 border-b border-gray-200">
                <TableHead className="w-[300px] py-4 px-6 font-semibold text-gray-700">Product Details</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Transaction</TableHead>
                <TableHead className="w-[100px] py-4 px-6 font-semibold text-gray-700">Quantity</TableHead>
                <TableHead className="w-[150px] py-4 px-6 font-semibold text-gray-700">Serial No.</TableHead>
                <TableHead className="w-[180px] py-4 px-6 font-semibold text-gray-700">Employee</TableHead>
                <TableHead className="w-[150px] py-4 px-6 font-semibold text-gray-700">Date & Time</TableHead>
                <TableHead className="py-4 px-6 font-semibold text-gray-700">Remarks</TableHead>
                <TableHead className="w-[60px] py-4 px-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-gray-400" />
                      <p className="text-gray-500">No transactions found</p>
                      <p className="text-sm text-gray-400">Try scanning a barcode or adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction, index) => (
                  <TableRow 
                    key={transaction.id} 
                    className={`hover:bg-gray-50/50 border-b border-gray-100 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            <Package className="h-6 w-6" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                            {getTransactionIcon(transaction.transactionType)}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{transaction.product.productName}</p>
                          <p className="text-sm text-gray-500">SKU: {transaction.product.sku}</p>
                          {transaction.product.description && (
                            <p className="text-xs text-gray-400 truncate">{transaction.product.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getTransactionBadge(transaction.transactionType)}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="space-y-1">
                        {transaction.checkoutQty > 0 && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <ArrowUpCircle className="h-3 w-3" />
                            <span className="text-sm font-medium">{transaction.checkoutQty * transaction.barcode.boxQty}</span>
                          </div>
                        )}
                        {transaction.returnedQty > 0 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <ArrowDownCircle className="h-3 w-3" />
                            <span className="text-sm font-medium">{transaction.returnedQty}</span>
                          </div>
                        )}
                        {transaction.usedQty > 0 && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-sm font-medium">{transaction.usedQty}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="space-y-1">
                        <p className="font-mono text-sm text-gray-900">{transaction.barcode.barcodeValue}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">{transaction.employee.name}</p>
                        <p className="text-sm text-gray-500">{transaction.employee.employeeId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="text-sm text-gray-600">
                        <p>{formatDateTime(transaction.createdAt)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="text-sm text-gray-600">
                        <p className="truncate max-w-[200px]" title={transaction.remarks || ''}>
                          {transaction.remarks || '-'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 bg-white rounded-lg p-4 border border-gray-200">
          <div>
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
          <div className="text-xs text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}