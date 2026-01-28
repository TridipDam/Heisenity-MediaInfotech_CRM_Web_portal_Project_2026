"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QRScanner } from "@/components/QRScanner"
import { NotificationBell } from "@/components/NotificationBell"
import { 
  Users, 
  Ticket, 
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Truck,
  FileText,
  Calendar,
  Eye
} from "lucide-react"
import Link from "next/link"
import { getAllTickets, getAttendanceRecords, getDatabaseStats } from "@/lib/server-api"
import { useSession } from "next-auth/react"

type DatabaseStats = {
  admins: number
  employees: number
  teams: number
  attendance: number
  tasks: number
  vehicles: number
  petrolBills: number
  payrollRecords: number
  notifications: number
  userSessions: number
  pendingCustomerSupport: number
  totalCustomers: number
}

type LeaveApplication = {
  id: string
  employeeName: string
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  status: string
  appliedAt: string
}

type TicketData = {
  id: string
  ticketId: string
  priority: string
  status: string
  reporter?: {
    name: string
  }
}

export function Dashboard() {
  const { data: session, status } = useSession()
  const [lastScannedProduct, setLastScannedProduct] = React.useState<string | null>(null)
  const [leaveApplications, setLeaveApplications] = React.useState<LeaveApplication[]>([])
  const [loadingLeaves, setLoadingLeaves] = React.useState(true)
  const [dbStats, setDbStats] = React.useState<DatabaseStats>({
    admins: 0,
    employees: 0,
    teams: 0,
    attendance: 0,
    tasks: 0,
    vehicles: 0,
    petrolBills: 0,
    payrollRecords: 0,
    notifications: 0,
    userSessions: 0,
    pendingCustomerSupport: 0,
    totalCustomers: 0
  })
  const [todayAttendance, setTodayAttendance] = React.useState({ present: 0, total: 0 })
  const [recentTickets, setRecentTickets] = React.useState<TicketData[]>([])
  const [loadingStats, setLoadingStats] = React.useState(true)

  const handleProductScan = (productId: string) => {
    setLastScannedProduct(productId)
    // Auto-hide notification after 5 seconds
    setTimeout(() => setLastScannedProduct(null), 5000)
  }

  // Fetch database statistics
  React.useEffect(() => {
    const fetchDatabaseStats = async () => {
      // Don't fetch if not authenticated
      if (status !== "authenticated" || !session?.user) {
        console.log("Not authenticated, skipping database stats fetch")
        setLoadingStats(false)
        return
      }

      try {
        const response = await getDatabaseStats()
        
        if (response.success && response.data) {
          setDbStats(response.data)
        } else {
          // Fallback: try to get employee count without role filtering
          try {
            const employeeResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees?limit=1000`, {
              cache: 'no-store'
            })
            const employeeData = await employeeResponse.json()
            
            if (employeeData.success && employeeData.data) {
              setDbStats(prev => ({
                ...prev,
                employees: employeeData.data.pagination?.total || employeeData.data.employees?.length || 0
              }))
            }
          } catch (fallbackError) {
            console.error('Fallback employee count failed:', fallbackError)
          }
        }
      } catch (error) {
        console.error('Error fetching database stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchDatabaseStats()
  }, [status, session]) // Add dependencies

  // Fetch today's attendance data
  React.useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const response = await getAttendanceRecords({ date: today, limit: 1000 })
        
        if (response.success && response.data) {
          const records = response.data.records
          const presentCount = records.filter(record => 
            record.status === 'PRESENT' || record.status === 'LATE'
          ).length
          
          setTodayAttendance({
            present: presentCount,
            total: dbStats.employees || records.length
          })
        }
      } catch (error) {
        console.error('Error fetching today attendance:', error)
        // Set fallback data on error
        setTodayAttendance({
          present: 0,
          total: dbStats.employees || 0
        })
      }
    }

    if (dbStats.employees > 0) {
      fetchTodayAttendance()
    }
  }, [dbStats.employees])

  // Fetch recent tickets
  React.useEffect(() => {
    const fetchRecentTickets = async () => {
      // Don't fetch if not authenticated
      if (status !== "authenticated" || !session?.user) {
        console.log("Not authenticated, skipping ticket fetch")
        return
      }

      try {
        console.log("Session status:", status)
        console.log("Session data:", session)
        console.log("Session token:", (session?.user as any)?.sessionToken)
        
        const response = await getAllTickets({ 
          limit: 3,
          token: (session?.user as any)?.sessionToken
        })
        
        if (response.success && response.data) {
          setRecentTickets(response.data)
        }
      } catch (error) {
        console.error('Error fetching recent tickets:', error)
        // Set empty array on error to show "No recent tickets" message
        setRecentTickets([])
      }
    }

    fetchRecentTickets()
  }, [status, session]) // Add dependencies

  // Fetch recent leave applications
  React.useEffect(() => {
    const fetchLeaveApplications = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/leave/applications`)
        const result = await response.json()
        
        if (result.success) {
          // Get only pending applications, sorted by most recent
          const pendingApplications = (result.data || [])
            .filter((app: LeaveApplication) => app.status === 'PENDING')
            .sort((a: LeaveApplication, b: LeaveApplication) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
            .slice(0, 3) // Show only 3 most recent
          
          setLeaveApplications(pendingApplications)
        }
      } catch (error) {
        console.error('Error fetching leave applications:', error)
      } finally {
        setLoadingLeaves(false)
      }
    }

    fetchLeaveApplications()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Scan notification */}
      {lastScannedProduct && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
          <Package className="h-4 w-4" />
          <span className="text-sm font-medium">Product {lastScannedProduct} scanned!</span>
        </div>
      )}
      
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening in your organization.</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <QRScanner onScan={handleProductScan} />
            </div>
          </div>
        </div>

        {/* Customer Support Notification Banner */}
        {dbStats.pendingCustomerSupport > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="shrink-0">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-900">
                    {dbStats.pendingCustomerSupport} New Customer Support {dbStats.pendingCustomerSupport === 1 ? 'Request' : 'Requests'}
                  </p>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Customer support requests are waiting for staff attention
                  </p>
                </div>
              </div>
              <Link href="/customer-support-requests">
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  View Requests ({dbStats.pendingCustomerSupport})
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Employees</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {loadingStats ? '...' : dbStats.employees}
                  </span>
                </div>
                <p className="text-sm text-gray-500">registered employees</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Stock Items</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Package className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">1,247</span>
                </div>
                <p className="text-sm text-gray-500">items in inventory</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active Tasks</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Ticket className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {loadingStats ? '...' : dbStats.tasks}
                  </span>
                </div>
                <p className="text-sm text-gray-500">total tasks</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Present Today</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {loadingStats ? '...' : todayAttendance.present}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {todayAttendance.total > 0 
                    ? `${((todayAttendance.present / todayAttendance.total) * 100).toFixed(1)}% attendance`
                    : 'attendance today'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Leave Applications */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Pending Leave Applications
                </CardTitle>
                <Link href="/leave-management">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingLeaves ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : leaveApplications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No pending leave applications</p>
                </div>
              ) : (
                leaveApplications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {application.employeeName} ({application.employeeId})
                        </p>
                        <p className="text-sm text-gray-500">
                          {application.leaveType.replace('_', ' ')} - {new Date(application.startDate).toLocaleDateString()} to {new Date(application.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Pending
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-amber-500" />
                  Recent Tickets
                </CardTitle>
                <Link href="/tickets">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Ticket className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No recent tickets</p>
                </div>
              ) : (
                recentTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' 
                          ? 'bg-red-50' 
                          : ticket.priority === 'MEDIUM' 
                          ? 'bg-amber-50' 
                          : 'bg-blue-50'
                      }`}>
                        {ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        ) : ticket.priority === 'MEDIUM' ? (
                          <Clock className="h-4 w-4 text-amber-600" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{ticket.ticketId}</p>
                        <p className="text-sm text-gray-500">
                          {ticket.ticketId} • {ticket.reporter?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <Badge className={
                      ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL'
                        ? "bg-red-50 text-red-700 border-red-200"
                        : ticket.priority === 'MEDIUM'
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }>
                      {ticket.priority}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Vehicle Overview */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" />
                  Vehicle Overview
                </CardTitle>
                <Link href="/vehicles">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Truck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Total Vehicles</p>
                    <p className="text-sm text-gray-500">Fleet inventory</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-700">
                  {loadingStats ? '...' : dbStats.vehicles}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Available</p>
                    <p className="text-sm text-gray-500">Ready for assignment</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-700">-</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Assigned</p>
                    <p className="text-sm text-gray-500">Currently in use</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-700">-</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stock Overview - Keep as Mock Data */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-green-500" />
                Stock Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Package className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Items In Stock</p>
                      <p className="text-sm text-gray-500">Available inventory</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-700">1,189</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Low Stock Items</p>
                      <p className="text-sm text-gray-500">Need restocking</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-amber-700">23</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Truck className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Pending Orders</p>
                      <p className="text-sm text-gray-500">Orders in transit</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-700">7</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}