import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddAttendanceRecord } from "@/components/AddAttendanceRecord"
import { AssignTaskPage } from "@/components/AssignTaskPage"
import { DateRangePicker } from "@/components/DateRangePicker"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Loader2,
  RefreshCw,
  Plus,
  X,
  UserPlus,
  Car
} from "lucide-react"
import { getAttendanceRecords, getAllEmployees, getAllTeams, AttendanceRecord, Employee, Team, deleteAttendanceRecord, exportAttendanceToExcel, exportAttendanceToPDF, ExportParams } from "@/lib/server-api"

interface DateRange {
  from: Date | null
  to: Date | null
}

interface ExtendedAttendanceRecord extends AttendanceRecord {
  hasAttendance: boolean
}

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

const STANDARD_WORK_HOURS = 8

// Team color mapping for visual distinction
const TEAM_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200', 
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-red-100 text-red-700 border-red-200'
]

const getTeamInfo = (teamId: string | undefined, teams: Team[]) => {
  if (!teamId) {
    return { name: 'No Team', color: 'bg-gray-100 text-gray-600 border-gray-200' }
  }
  
  const team = teams.find(t => t.id === teamId)
  if (!team) {
    return { name: 'Unknown Team', color: 'bg-gray-100 text-gray-600 border-gray-200' }
  }
  
  // Use team index to get consistent color
  const teamIndex = teams.findIndex(t => t.id === teamId)
  const colorIndex = teamIndex % TEAM_COLORS.length
  
  return {
    name: team.name,
    color: TEAM_COLORS[colorIndex]
  }
}

const calculateWorkHours = (clockIn?: string, clockOut?: string) => {
  if (!clockIn) {
    return { worked: '-', overtime: '-' }
  }

  const start = new Date(clockIn)
  
  // If no clockOut, calculate hours worked so far (for ongoing work)
  const end = clockOut ? new Date(clockOut) : new Date()

  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) {
    return { worked: '-', overtime: '-' }
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const standardMinutes = STANDARD_WORK_HOURS * 60

  const workedMinutes = Math.min(totalMinutes, standardMinutes)
  const overtimeMinutes = Math.max(totalMinutes - standardMinutes, 0)

  const format = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m}m`
  }

  return {
    worked: format(workedMinutes),
    overtime: overtimeMinutes > 0 ? format(overtimeMinutes) : '0h 0m'
  }
}


export function AttendancePage() {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [showAssignPage, setShowAssignPage] = React.useState(false)
  const [currentDate, setCurrentDate] = React.useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }))
  const [combinedData, setCombinedData] = React.useState<ExtendedAttendanceRecord[]>([])
  const [teams, setTeams] = React.useState<Team[]>([])
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
    teamId: '',
    dateRange: { from: new Date(), to: null } as DateRange
  })
  const [selectedEmployee, setSelectedEmployee] = React.useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = React.useState<ExtendedAttendanceRecord | null>(null)
  const [showViewDetails, setShowViewDetails] = React.useState(false)
  const [deleteLoading, setDeleteLoading] = React.useState<string | null>(null)
  const [exportLoading, setExportLoading] = React.useState<'excel' | 'pdf' | null>(null)

  const fetchAttendanceData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all employees and teams first
      const [employeesResponse, teamsResponse] = await Promise.all([
        getAllEmployees({ limit: 1000 }), // Get all employees
        getAllTeams() // Get all teams
      ])
      
      let employees: Employee[] = []
      if (employeesResponse.success && employeesResponse.data) {
        employees = employeesResponse.data.employees
      }

      let teamsData: Team[] = []
      if (teamsResponse.success && teamsResponse.data) {
        teamsData = teamsResponse.data
        setTeams(teamsData)
      }

      const params: Record<string, string | number> = {
        page: pagination.page,
        limit: pagination.limit
      }

      // Handle date range filtering
      if (filters.dateRange.from) {
        params.dateFrom = filters.dateRange.from.toISOString().split('T')[0]
      }

      if (filters.dateRange.to) {
        params.dateTo = filters.dateRange.to.toISOString().split('T')[0]
      }

      // If we have a single date (from but no to), use it as both from and to
      if (filters.dateRange.from && !filters.dateRange.to) {
        const singleDate = filters.dateRange.from.toISOString().split('T')[0]
        params.dateFrom = singleDate
        params.dateTo = singleDate
      }

      // If no date range is selected at all, default to today
      if (!filters.dateRange.from && !filters.dateRange.to) {
        params.date = new Date().toISOString().split('T')[0]
      }

      if (filters.status) {
        params.status = filters.status
      }

      const response = await getAttendanceRecords(params)

      if (response.success && response.data) {
        const records = response.data.records

        // Create combined data: all employees with their attendance status
        const combined = employees.map(employee => {
          const attendanceRecord = records.find(record => record.employeeId === employee.employeeId)

          if (attendanceRecord) {
            return {
              ...attendanceRecord,
              hasAttendance: true
            }
          } else {
            // Create a placeholder record for employees without attendance
            return {
              id: `placeholder-${employee.id}`,
              employeeId: employee.employeeId,
              employeeName: employee.name,
              email: employee.email,
              phone: employee.phone,
              teamId: employee.teamId,
              isTeamLeader: employee.isTeamLeader,
              date: new Date().toISOString().split('T')[0],
              status: 'ABSENT' as const,
              source: 'ADMIN' as const,
              location: undefined,
              latitude: undefined,
              longitude: undefined,
              ipAddress: undefined,
              deviceInfo: undefined,
              photo: undefined,
              locked: false,
              lockedReason: undefined,
              attemptCount: 'ZERO' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              hasAttendance: false
            }
          }
        })

        // Apply client-side search filter if needed
        let filteredCombined = combined
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filteredCombined = combined.filter(record =>
            record.employeeName.toLowerCase().includes(searchLower) ||
            record.employeeId.toLowerCase().includes(searchLower) ||
            record.email.toLowerCase().includes(searchLower)
          )
        }

        // Apply status filter
        if (filters.status) {
          filteredCombined = filteredCombined.filter(record => record.status === filters.status)
        }

        // Apply team filter
        if (filters.teamId) {
          filteredCombined = filteredCombined.filter(record => record.teamId === filters.teamId)
        }

        setCombinedData(filteredCombined)

        // Update pagination based on combined data
        setPagination(prev => ({
          ...prev,
          total: filteredCombined.length,
          totalPages: Math.ceil(filteredCombined.length / prev.limit)
        }))
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

  // Reset pagination when filters change (except page)
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [filters.search, filters.status, filters.teamId, filters.dateRange.from, filters.dateRange.to])

  const handleRecordAdded = () => {
    // Employee added - refresh the attendance data
    setShowAddForm(false)
    // Refresh data to show the new employee
    setTimeout(() => {
      fetchAttendanceData()
    }, 1000)
  }

  const handleRefresh = () => {
    fetchAttendanceData()
  }

  const handleAssignTask = (employeeId: string) => {
    setSelectedEmployee(employeeId)
    setShowAssignPage(true)
  }

  const handleViewDetails = (record: ExtendedAttendanceRecord) => {
    setSelectedRecord(record)
    setShowViewDetails(true)
  }

  const handleDeleteRecord = async (record: ExtendedAttendanceRecord) => {
    if (!record.hasAttendance) {
      return // Can't delete placeholder records
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the attendance record for ${record.employeeName} on ${new Date(record.date).toLocaleDateString()}?`
    )

    if (!confirmDelete) return

    try {
      setDeleteLoading(record.id)
      const response = await deleteAttendanceRecord(record.id)
      
      if (response.success) {
        // Refresh the data to reflect the deletion
        fetchAttendanceData()
      } else {
        alert(response.error || 'Failed to delete attendance record')
      }
    } catch (error) {
      console.error('Error deleting attendance record:', error)
      alert('Failed to delete attendance record')
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      setExportLoading(format)
      
      // Prepare export parameters based on current filters
      const exportParams: ExportParams = {}
      
      if (filters.dateRange.from) {
        exportParams.dateFrom = filters.dateRange.from.toISOString().split('T')[0]
      }
      
      if (filters.dateRange.to) {
        exportParams.dateTo = filters.dateRange.to.toISOString().split('T')[0]
      }
      
      // If we have a single date (from but no to), use it as both from and to
      if (filters.dateRange.from && !filters.dateRange.to) {
        const singleDate = filters.dateRange.from.toISOString().split('T')[0]
        exportParams.dateFrom = singleDate
        exportParams.dateTo = singleDate
      }
      
      // If no date range is selected at all, default to today
      if (!filters.dateRange.from && !filters.dateRange.to) {
        exportParams.date = new Date().toISOString().split('T')[0]
      }
      
      if (filters.status) {
        exportParams.status = filters.status
      }

      if (format === 'excel') {
        await exportAttendanceToExcel(exportParams)
      } else {
        await exportAttendanceToPDF(exportParams)
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error)
      alert(`Failed to export to ${format.toUpperCase()}`)
    } finally {
      setExportLoading(null)
    }
  }

  const handleDateChange = (direction: 'prev' | 'next') => {
    let targetDate: Date

    if (filters.dateRange.from && !filters.dateRange.to) {
      // Single date selected
      targetDate = new Date(filters.dateRange.from)
    } else {
      // No date or range selected, use today
      targetDate = new Date()
    }

    if (direction === 'prev') {
      targetDate.setDate(targetDate.getDate() - 1)
    } else {
      targetDate.setDate(targetDate.getDate() + 1)
    }

    // Update both the display and the filter
    setFilters(prev => ({
      ...prev,
      dateRange: { from: targetDate, to: null }
    }))

    setCurrentDate(targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }))

    // Reset pagination to first page when date changes
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleDateRangeChange = (range: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange: range }))

    // Update current date display
    if (range.from) {
      if (range.to && range.from.toDateString() !== range.to.toDateString()) {
        setCurrentDate(`${range.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${range.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`)
      } else {
        setCurrentDate(range.from.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }))
      }
    } else {
      setCurrentDate(new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }))
    }

    // Reset pagination to first page when date changes
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = combinedData.length
    const present = combinedData.filter(r => r.status === 'PRESENT').length
    const late = combinedData.filter(r => r.status === 'LATE').length
    const absent = combinedData.filter(r => r.status === 'ABSENT').length

    const avgHours = combinedData
      .filter(r => r.clockIn && r.hasAttendance)
      .reduce((acc, r) => {
        const clockInTime = new Date(r.clockIn!)
        const endTime = r.clockOut ? new Date(r.clockOut) : new Date()
        const diffHours = (endTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
        return acc + Math.max(0, diffHours) // Ensure non-negative hours
      }, 0) / Math.max(1, combinedData.filter(r => r.clockIn && r.hasAttendance).length)

    return { total, present, late, absent, avgHours }
  }, [combinedData])

  return (
    <div className="min-h-screen bg-gray-50/30">
      {showAddForm ? (
        <AddAttendanceRecord
          onRecordAdded={handleRecordAdded}
          onBack={() => setShowAddForm(false)}
        />
      ) : showAssignPage ? (
        <AssignTaskPage
          onBack={() => setShowAssignPage(false)}
          preSelectedEmployeeId={selectedEmployee || undefined}
          onTaskAssigned={fetchAttendanceData}
        />
      ) : (
        <div className="p-6 space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900">Employee Attendance</h1>
                <p className="text-gray-600">Monitor and manage employee attendance records</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  onClick={() => window.open('/vehicles', '_blank')}
                >
                  <Car className="h-4 w-4 mr-2" />
                  Vehicles
                </Button>
                <Button
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  onClick={() => setShowAssignPage(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="border-gray-300 hover:bg-gray-50"
                      disabled={exportLoading !== null}
                    >
                      {exportLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {exportLoading ? `Exporting ${exportLoading.toUpperCase()}...` : 'Export'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => handleExport('excel')}
                      disabled={exportLoading !== null}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleExport('pdf')}
                      disabled={exportLoading !== null}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Date Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-white"
                    onClick={() => handleDateChange('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="px-3 py-1">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      {currentDate}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-white"
                    onClick={() => handleDateChange('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Badge variant="outline" className="text-gray-500 font-normal">
                  <Clock className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>

              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Present</CardTitle>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{stats.present}</span>
                  </div>
                  <p className="text-xs text-gray-500">employees present</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Late Arrivals</CardTitle>
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{stats.late}</span>
                  </div>
                  <p className="text-xs text-gray-500">late arrivals</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Absent</CardTitle>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{stats.absent}</span>
                  </div>
                  <p className="text-xs text-gray-500">employees absent</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Avg. Hours</CardTitle>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{stats.avgHours.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-gray-500">hours per day</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Main Filter Row */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search employees..."
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </div>

                  {/* Date Range Picker */}
                  <div className="shrink-0">
                    <DateRangePicker
                      value={filters.dateRange}
                      onChange={handleDateRangeChange}
                      placeholder="Select date range"
                      className="w-[240px]"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="border-gray-300 hover:bg-gray-50 min-w-[100px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <span className="flex-1 text-left">
                            {filters.status || 'Status'}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
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

                  {/* Team Filter */}
                  <div className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="border-gray-300 hover:bg-gray-50 min-w-[120px]">
                          <Users className="h-4 w-4 mr-2" />
                          <span className="flex-1 text-left">
                            {filters.teamId ? teams.find(t => t.id === filters.teamId)?.name || 'Team' : 'All Teams'}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, teamId: '' }))}>
                          All Teams
                        </DropdownMenuItem>
                        {teams.map((team) => (
                          <DropdownMenuItem 
                            key={team.id}
                            onClick={() => setFilters(prev => ({ ...prev, teamId: team.id }))}
                          >
                            {team.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Filter Summary Row */}
                {(filters.search || filters.status || filters.teamId || filters.dateRange.from) && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      {filters.search && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                          Search: &quot;{filters.search}&quot;
                          <X
                            className="ml-1 h-3 w-3 cursor-pointer hover:text-blue-900"
                            onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                          />
                        </Badge>
                      )}

                      {filters.status && (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                          {filters.status}
                          <X
                            className="ml-1 h-3 w-3 cursor-pointer hover:text-green-900"
                            onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                          />
                        </Badge>
                      )}

                      {filters.teamId && (
                        <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                          Team: {teams.find(t => t.id === filters.teamId)?.name || 'Unknown'}
                          <X
                            className="ml-1 h-3 w-3 cursor-pointer hover:text-purple-900"
                            onClick={() => setFilters(prev => ({ ...prev, teamId: '' }))}
                          />
                        </Badge>
                      )}

                      {filters.dateRange.from && (
                        <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                          {filters.dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {filters.dateRange.to && filters.dateRange.from.toDateString() !== filters.dateRange.to.toDateString() &&
                            ` - ${filters.dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          }
                          <X
                            className="ml-1 h-3 w-3 cursor-pointer hover:text-purple-900"
                            onClick={() => setFilters(prev => ({ ...prev, dateRange: { from: null, to: null } }))}
                          />
                        </Badge>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const today = new Date()
                        setFilters({
                          search: '',
                          status: '',
                          teamId: '',
                          dateRange: { from: today, to: null }
                        })
                        setCurrentDate(today.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }))
                        setPagination(prev => ({ ...prev, page: 1 }))
                      }}
                      className="text-gray-500 hover:text-gray-700 h-7"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear All
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-gray-600">
                    {combinedData.length} employees found
                  </Badge>
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
            ) : combinedData.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">No employees found</p>
                  <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 border-b border-gray-200">
                      <TableHead className="w-[280px] py-4 px-6 font-semibold text-gray-700">Employee</TableHead>
                      <TableHead className="w-[140px] py-4 px-6 font-semibold text-gray-700">Team</TableHead>
                      <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="w-[200px] py-4 px-6 font-semibold text-gray-700">
                        <div className="space-y-1">
                          <span>Time In/Out</span>
                          <div className="flex items-center gap-2 text-xs font-normal text-gray-500">
                            <span className="text-green-600">In</span>
                            <span>→</span>
                            <span className="text-orange-600">Out</span>
                          </div>
                        </div>
                      </TableHead>
                      <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Hours</TableHead>
                      <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Overtime</TableHead>
                      <TableHead className="w-[200px] py-4 px-6 font-semibold text-gray-700">Assigned Task</TableHead>
                      <TableHead className="w-[180px] py-4 px-6 font-semibold text-gray-700">Location</TableHead>
                      <TableHead className="w-[200px] py-4 px-6 font-semibold text-gray-700">Device Info</TableHead>
                      <TableHead className="w-[60px] py-4 px-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinedData.map((record, index) => (
                      <TableRow
                        key={record.id}
                        className={`hover:bg-gray-50/50 border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          } ${!record.hasAttendance ? 'opacity-60' : ''}`}
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              {(() => {
                                return (
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm ${
                                    record.teamId ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                  }`}>
                                    {record.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </div>
                                )
                              })()}
                              {record.hasAttendance && getStatusIcon(record.status) && (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                  {getStatusIcon(record.status)}
                                </div>
                              )}
                              {!record.hasAttendance && (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                  <XCircle className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 truncate">{record.employeeName}</p>
                              <p className="text-xs text-gray-500 font-medium">{record.employeeId}</p>
                              <p className="text-xs text-gray-400">{record.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          {(() => {
                            const teamInfo = getTeamInfo(record.teamId, teams)
                            return (
                              <div className="space-y-1">
                                <Badge className={`${teamInfo.color} font-medium`}>
                                  {teamInfo.name}
                                </Badge>
                                {record.isTeamLeader && (
                                  <div className="flex items-center gap-1">
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                      Team Leader
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          {record.hasAttendance ? (
                            getStatusBadge(record.status)
                          ) : (
                            <Badge className="bg-gray-50 text-gray-500 border-gray-200">
                              No Record
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="space-y-1">
                            {/* Show task timing if available, otherwise show clock in/out times */}
                            {record.taskStartTime && record.taskEndTime ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-green-600">
                                  {record.taskStartTime}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className="text-sm font-semibold text-orange-600">
                                  {record.taskEndTime}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-green-600">
                                  {record.hasAttendance && record.clockIn ? formatTime(record.clockIn) : '-'}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className="text-sm font-semibold text-orange-600">
                                  {record.hasAttendance && record.clockOut ? formatTime(record.clockOut) : 
                                   (record.hasAttendance && record.clockIn ? 'Working...' : '-')}
                                </span>
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {record.hasAttendance && record.clockIn ? new Date(record.clockIn).toLocaleDateString() : '-'}
                            </div>
                          </div>
                        </TableCell>
                        {(() => {
                          const time = record.hasAttendance
                            ? calculateWorkHours(record.clockIn, record.clockOut)
                            : { worked: '-', overtime: '-' }

                          return (
                            <>
                              {/* Work Hours */}
                              <TableCell className="py-4 px-6">
                                <span className="font-semibold text-gray-900">
                                  {time.worked}
                                </span>
                              </TableCell>

                              {/* Overtime */}
                              <TableCell className="py-4 px-6">
                                <span
                                  className={`font-semibold ${time.overtime !== '0h 0m' && time.overtime !== '-' ? 'text-red-600' : 'text-gray-500'
                                    }`}
                                >
                                  {time.overtime}
                                </span>
                              </TableCell>

                            </>
                          )
                        })()}
                        <TableCell className="py-4 px-6">
                          {record.assignedTask ? (
                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {record.assignedTask.title}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`text-xs ${record.assignedTask.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    record.assignedTask.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      record.assignedTask.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                                        'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}
                                >
                                  {record.assignedTask.status.toLowerCase().replace('_', ' ')}
                                </Badge>
                                {record.assignedTask.category && (
                                  <span className="text-xs text-gray-500">
                                    {record.assignedTask.category}
                                  </span>
                                )}
                              </div>
                              {/* Display task location from attendance record */}
                              {record.taskLocation && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span
                                    className="truncate max-w-[120px]"
                                    title={record.taskLocation}
                                  >
                                    {record.taskLocation}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No task assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6 max-w-[180px]">
                          <div className="flex items-start gap-2 text-gray-600">
                            <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              {record.hasAttendance ? (
                                <div className="space-y-1">
                                  <span
                                    className="text-sm text-gray-900 block truncate"
                                    title={record.location || 'Not provided'}
                                  >
                                    {record.location || 'Not provided'}
                                  </span>
                                  {/* Show task location if different from main location */}
                                  {record.taskLocation && record.taskLocation !== record.location && (
                                    <span
                                      className="text-xs text-gray-500 block truncate"
                                      title={`Task: ${record.taskLocation}`}
                                    >
                                      Task: {record.taskLocation}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">-</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 max-w-[200px]">
                          <div className="min-w-0">
                            <span
                              className="text-sm text-gray-600 block truncate"
                              title={record.hasAttendance ? (record.deviceInfo || 'Not provided') : '-'}
                            >
                              {record.hasAttendance ? (record.deviceInfo || 'Not provided') : '-'}
                            </span>
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
                              <DropdownMenuItem onClick={() => handleViewDetails(record)}>
                                View Details
                              </DropdownMenuItem>
                              {record.hasAttendance && (
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteRecord(record)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={deleteLoading === record.id}
                                >
                                  {deleteLoading === record.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    'Delete Record'
                                  )}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleAssignTask(record.employeeId)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Assign Task
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Footer */}
          {!loading && !error && combinedData.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-500 bg-white rounded-lg p-4 border border-gray-200">
              <div>
                Showing {combinedData.length} of {pagination.total} employees
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

      {/* View Details Modal */}
      <Dialog open={showViewDetails} onOpenChange={setShowViewDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Employee Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Employee Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-sm text-gray-900">{selectedRecord.employeeName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Employee ID</label>
                    <p className="text-sm text-gray-900">{selectedRecord.employeeId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{selectedRecord.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm text-gray-900">{selectedRecord.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Attendance Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Attendance Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date</label>
                    <p className="text-sm text-gray-900">{new Date(selectedRecord.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      {selectedRecord.hasAttendance ? getStatusBadge(selectedRecord.status) : (
                        <Badge className="bg-gray-50 text-gray-500 border-gray-200">No Record</Badge>
                      )}
                    </div>
                  </div>
                  {selectedRecord.hasAttendance && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Clock In</label>
                        <p className="text-sm text-gray-900">{selectedRecord.clockIn ? formatTime(selectedRecord.clockIn) : '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Clock Out</label>
                        <p className="text-sm text-gray-900">{selectedRecord.clockOut ? formatTime(selectedRecord.clockOut) : 'Working...'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Work Hours</label>
                        <p className="text-sm text-gray-900">{calculateWorkHours(selectedRecord.clockIn, selectedRecord.clockOut).worked}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Overtime</label>
                        <p className="text-sm text-gray-900">{calculateWorkHours(selectedRecord.clockIn, selectedRecord.clockOut).overtime}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedRecord.hasAttendance && (
                <>
                  <Separator />

                  {/* Location Information */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Location Information</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-sm text-gray-900">{selectedRecord.location || 'Not provided'}</p>
                      </div>
                      {selectedRecord.latitude && selectedRecord.longitude && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Coordinates</label>
                          <p className="text-sm text-gray-900">{selectedRecord.latitude}, {selectedRecord.longitude}</p>
                        </div>
                      )}
                      {selectedRecord.taskLocation && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Task Location</label>
                          <p className="text-sm text-gray-900">{selectedRecord.taskLocation}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Technical Information */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Technical Information</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Device Info</label>
                        <p className="text-sm text-gray-900">{selectedRecord.deviceInfo || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">IP Address</label>
                        <p className="text-sm text-gray-900">{selectedRecord.ipAddress || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Source</label>
                        <p className="text-sm text-gray-900">{selectedRecord.source}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created At</label>
                        <p className="text-sm text-gray-900">{new Date(selectedRecord.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Assigned Task Information */}
              {selectedRecord.assignedTask && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Assigned Task</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Title</label>
                        <p className="text-sm text-gray-900">{selectedRecord.assignedTask.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Description</label>
                        <p className="text-sm text-gray-900">{selectedRecord.assignedTask.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Category</label>
                          <p className="text-sm text-gray-900">{selectedRecord.assignedTask.category || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Status</label>
                          <div className="mt-1">
                            <Badge
                              className={`text-xs ${selectedRecord.assignedTask.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                selectedRecord.assignedTask.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  selectedRecord.assignedTask.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                            >
                              {selectedRecord.assignedTask.status.toLowerCase().replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {selectedRecord.assignedTask.location && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Task Location</label>
                          <p className="text-sm text-gray-900">{selectedRecord.assignedTask.location}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Start Time</label>
                          <p className="text-sm text-gray-900">{selectedRecord.assignedTask.startTime || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">End Time</label>
                          <p className="text-sm text-gray-900">{selectedRecord.assignedTask.endTime || 'Not specified'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Assigned By</label>
                        <p className="text-sm text-gray-900">{selectedRecord.assignedTask.assignedBy}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Assigned At</label>
                        <p className="text-sm text-gray-900">{new Date(selectedRecord.assignedTask.assignedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}