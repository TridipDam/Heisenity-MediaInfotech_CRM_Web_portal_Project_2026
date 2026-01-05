"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { AddAttendanceRecord } from "@/components/AddAttendanceRecord"
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Clock, 
  MapPin,  
  Users, 
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Loader2,
  RefreshCw,
  Plus
} from "lucide-react"
import { getAttendanceRecords, AttendanceRecord } from "@/lib/server-api"

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PRESENT":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "LATE":
      return <AlertCircle className="h-4 w-4 text-amber-600" />
    case "ABSENT":
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

const getStatusBadge = (status: string) => {
  const variants = {
    PRESENT: "bg-green-50 text-green-700 border-green-200",
    LATE: "bg-amber-50 text-amber-700 border-amber-200",
    ABSENT: "bg-red-50 text-red-700 border-red-200",
    MARKDOWN: "bg-blue-50 text-blue-700 border-blue-200"
  }
  
  return (
    <Badge className={`${variants[status as keyof typeof variants]} capitalize font-medium`}>
      {status.toLowerCase()}
    </Badge>
  )
}

const formatTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const calculateWorkHours = (clockIn?: string) => {
  if (!clockIn) return '-'
  
  const clockInTime = new Date(clockIn)
  const now = new Date()
  const diffMs = now.getTime() - clockInTime.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  return `${diffHours}h ${diffMinutes}m`
}

export function AttendancePage() {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [currentDate, setCurrentDate] = React.useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }))
  const [attendanceData, setAttendanceData] = React.useState<AttendanceRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = React.useState({
    search: '',
    status: '',
    date: new Date().toISOString().split('T')[0]
  })

  const fetchAttendanceData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: Record<string, string | number> = {
        page: pagination.page,
        limit: pagination.limit
      }
      
      if (filters.date) {
        params.date = filters.date
      }
      
      if (filters.status) {
        params.status = filters.status
      }

      const response = await getAttendanceRecords(params)
      
      if (response.success && response.data) {
        let records = response.data.records
        
        // Apply client-side search filter if needed
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          records = records.filter(record => 
            record.employeeName.toLowerCase().includes(searchLower) ||
            record.employeeId.toLowerCase().includes(searchLower) ||
            record.email.toLowerCase().includes(searchLower)
          )
        }
        
        setAttendanceData(records)
        setPagination(response.data.pagination)
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  React.useEffect(() => {
    fetchAttendanceData()
  }, [fetchAttendanceData])

  const handleRecordAdded = (newRecord: AttendanceRecord) => {
    setAttendanceData(prev => [newRecord, ...prev])
    setShowAddForm(false)
    // Refresh data to get the complete record
    setTimeout(() => {
      fetchAttendanceData()
    }, 1000)
  }

  const handleRefresh = () => {
    fetchAttendanceData()
  }

  const handleDateChange = (direction: 'prev' | 'next') => {
    const currentDateObj = new Date(filters.date)
    if (direction === 'prev') {
      currentDateObj.setDate(currentDateObj.getDate() - 1)
    } else {
      currentDateObj.setDate(currentDateObj.getDate() + 1)
    }
    
    const newDate = currentDateObj.toISOString().split('T')[0]
    setFilters(prev => ({ ...prev, date: newDate }))
    setCurrentDate(currentDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }))
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = attendanceData.length
    const present = attendanceData.filter(r => r.status === 'PRESENT').length
    const late = attendanceData.filter(r => r.status === 'LATE').length
    const absent = attendanceData.filter(r => r.status === 'ABSENT').length
    
    const avgHours = attendanceData
      .filter(r => r.clockIn)
      .reduce((acc, r) => {
        const clockInTime = new Date(r.clockIn!)
        const now = new Date()
        const diffHours = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
        return acc + diffHours
      }, 0) / Math.max(1, attendanceData.filter(r => r.clockIn).length)

    return { total, present, late, absent, avgHours }
  }, [attendanceData])

  return (
    <div className="min-h-screen bg-gray-50/30">
      {showAddForm ? (
        <AddAttendanceRecord 
          onRecordAdded={handleRecordAdded}
          onBack={() => setShowAddForm(false)}
        />
      ) : (
        <div className="p-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Employee Attendance</h1>
              <p className="text-gray-600">Monitor and manage employee attendance records</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="border-gray-300 hover:bg-gray-50"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => handleDateChange('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-gray-700 px-3">{currentDate}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => handleDateChange('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Present</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{stats.present}</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+5.2%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">vs yesterday</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Late Arrivals</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{stats.late}</span>
                  <div className="flex items-center gap-1 text-red-600">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-sm font-medium">-2.1%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">vs yesterday</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Absent</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{stats.absent}</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-sm font-medium">-12.5%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">vs yesterday</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg. Hours</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{stats.avgHours.toFixed(1)}</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+0.3h</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">hours per day</p>
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
                    placeholder="Search employees..."
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                      <Calendar className="h-4 w-4 mr-2" />
                      Date Range
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }))}>
                      Today
                    </DropdownMenuItem>
                    <DropdownMenuItem>This Week</DropdownMenuItem>
                    <DropdownMenuItem>This Month</DropdownMenuItem>
                    <DropdownMenuItem>Custom Range</DropdownMenuItem>
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
                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: '' }))}>
                      All Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'PRESENT' }))}>
                      Present
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'LATE' }))}>
                      Late
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'ABSENT' }))}>
                      Absent
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card className="bg-white shadow-sm border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading attendance data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-red-600 font-medium">Error loading data</p>
                <p className="text-gray-500 text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleRefresh}
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">No attendance records found</p>
                <p className="text-gray-500 text-sm">Try adjusting your filters or add a new record</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 border-b border-gray-200">
                  <TableHead className="w-[280px] py-4 px-6 font-semibold text-gray-700">Employee</TableHead>
                  <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="w-[200px] py-4 px-6 font-semibold text-gray-700">Time In</TableHead>
                  <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Hours</TableHead>
                  <TableHead className="w-[180px] py-4 px-6 font-semibold text-gray-700">Location</TableHead>
                  <TableHead className="py-4 px-6 font-semibold text-gray-700">Device Info</TableHead>
                  <TableHead className="w-[60px] py-4 px-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.map((record, index) => (
                  <TableRow 
                    key={record.id} 
                    className={`hover:bg-gray-50/50 border-b border-gray-100 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {record.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          {getStatusIcon(record.status) && (
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                              {getStatusIcon(record.status)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{record.employeeName}</p>
                          <p className="text-sm text-gray-500">{record.employeeId}</p>
                          <p className="text-xs text-gray-400">{record.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getStatusBadge(record.status)}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatTime(record.clockIn)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {record.clockIn ? new Date(record.clockIn).toLocaleDateString() : '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <span className="font-semibold text-gray-900">{calculateWorkHours(record.clockIn)}</span>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm truncate">{record.location || 'Not provided'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <span className="text-sm text-gray-600 line-clamp-2">{record.deviceInfo || 'Not provided'}</span>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Record</DropdownMenuItem>
                          <DropdownMenuItem>Send Message</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Footer */}
        {!loading && !error && attendanceData.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-500 bg-white rounded-lg p-4 border border-gray-200">
            <div>
              Showing {attendanceData.length} of {pagination.total} records
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-blue-50 text-blue-600 border-blue-200"
                >
                  {pagination.page}
                </Button>
                {pagination.totalPages > 1 && (
                  <>
                    {pagination.page < pagination.totalPages && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      >
                        {pagination.page + 1}
                      </Button>
                    )}
                    {pagination.page < pagination.totalPages - 1 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 2 }))}
                      >
                        {pagination.page + 2}
                      </Button>
                    )}
                  </>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  )
}