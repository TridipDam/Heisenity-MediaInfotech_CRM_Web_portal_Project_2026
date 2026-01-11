"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { DateRangePicker } from "@/components/DateRangePicker"
import { showToast, showConfirm } from "@/lib/toast-utils"

import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Loader2,
  RefreshCw,
  X,
  ClockIcon,
  Timer,
  Calendar
} from "lucide-react"
import { getAttendanceRecords, getAllEmployees, deleteAttendanceRecord, exportAttendanceToExcel, exportAttendanceToPDF, ExportParams, AttendanceRecord, Employee } from "@/lib/server-api"

interface DateRange {
  from: Date | null
  to: null | Date
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
    ABSENT: "bg-red-50 text-red-700 border-red-200"
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const STANDARD_WORK_HOURS = 8

const calculateWorkHours = (clockIn?: string, clockOut?: string) => {
  if (!clockIn) {
    return { worked: '-', overtime: '-', totalHours: 0 }
  }

  const start = new Date(clockIn)
  const end = clockOut ? new Date(clockOut) : new Date()

  const diffMs = end.getTime() - start.getTime()
  if (diffMs <= 0) {
    return { worked: '-', overtime: '-', totalHours: 0 }
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const totalHours = totalMinutes / 60
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
    overtime: overtimeMinutes > 0 ? format(overtimeMinutes) : '0h 0m',
    totalHours: totalHours
  }
}

export function AttendanceManagementPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }))
  const [combinedData, setCombinedData] = React.useState<ExtendedAttendanceRecord[]>([])
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
    dateRange: { from: new Date(), to: null } as DateRange
  })
  const [deleteLoading, setDeleteLoading] = React.useState<string | null>(null)
  const [deletedRecords, setDeletedRecords] = React.useState<Set<string>>(new Set())
  const [exportLoading, setExportLoading] = React.useState<'excel' | 'pdf' | null>(null)

  const fetchAttendanceData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all employees first
      const employeesResponse = await getAllEmployees({ limit: 1000 })

      let employees: Employee[] = []
      if (employeesResponse.success && employeesResponse.data) {
        employees = employeesResponse.data.employees
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

            if (deletedRecords.has(employee.employeeId)) {
              return null
            }

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
        }).filter(Boolean)

        // Apply client-side search filter if needed
        let filteredCombined = combined.filter((record): record is ExtendedAttendanceRecord => record !== null)
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filteredCombined = filteredCombined.filter(record =>
            record.employeeName.toLowerCase().includes(searchLower) ||
            record.employeeId.toLowerCase().includes(searchLower) ||
            record.email.toLowerCase().includes(searchLower)
          )
        }

        // Apply status filter
        if (filters.status) {
          filteredCombined = filteredCombined.filter(record => record.status === filters.status)
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
  }, [filters.search, filters.status, filters.dateRange.from, filters.dateRange.to])

  const handleRefresh = () => {
    fetchAttendanceData()
  }

  const handleDeleteRecord = async (record: ExtendedAttendanceRecord) => {
    if (!record.hasAttendance) return

    showConfirm(
      `Are you sure you want to delete the attendance record for ${record.employeeName} on ${new Date(record.date).toLocaleDateString()}?`,
      async () => {
        try {
          setDeleteLoading(record.id)
          const response = await deleteAttendanceRecord(record.id)

          if (response.success) {
            fetchAttendanceData()
            showToast.success('Attendance record deleted successfully')
          } else {
            showToast.error(response.error || 'Failed to delete attendance record')
          }
        } catch (error) {
          console.error('Error deleting attendance record:', error)
          showToast.error('Failed to delete attendance record')
        } finally {
          setDeleteLoading(null)
        }
      },
      'Delete Attendance Record'
    )
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      setExportLoading(format)

      const exportParams: ExportParams = {}

      if (filters.dateRange.from) {
        exportParams.dateFrom = filters.dateRange.from.toISOString().split('T')[0]
      }

      if (filters.dateRange.to) {
        exportParams.dateTo = filters.dateRange.to.toISOString().split('T')[0]
      }

      if (filters.dateRange.from && !filters.dateRange.to) {
        const singleDate = filters.dateRange.from.toISOString().split('T')[0]
        exportParams.dateFrom = singleDate
        exportParams.dateTo = singleDate
      }

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
      showToast.error(`Failed to export to ${format.toUpperCase()}`)
    } finally {
      setExportLoading(null)
    }
  }

  const handleDateChange = (direction: 'prev' | 'next') => {
    let targetDate: Date

    if (filters.dateRange.from && !filters.dateRange.to) {
      targetDate = new Date(filters.dateRange.from)
    } else {
      targetDate = new Date()
    }

    if (direction === 'prev') {
      targetDate.setDate(targetDate.getDate() - 1)
    } else {
      targetDate.setDate(targetDate.getDate() + 1)
    }

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

    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleDateRangeChange = (range: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange: range }))
    setDeletedRecords(new Set())

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

    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = combinedData.length
    const present = combinedData.filter(r => r.status === 'PRESENT').length
    const late = combinedData.filter(r => r.status === 'LATE').length
    const absent = combinedData.filter(r => r.status === 'ABSENT').length

    const totalOvertimeMinutes = combinedData
      .filter(r => r.clockIn && r.clockOut && r.hasAttendance)
      .reduce((acc, r) => {
        const { totalHours } = calculateWorkHours(r.clockIn, r.clockOut)
        const overtimeHours = Math.max(0, totalHours - STANDARD_WORK_HOURS)
        return acc + (overtimeHours * 60)
      }, 0)

    const avgHours = combinedData
      .filter(r => r.clockIn && r.hasAttendance)
      .reduce((acc, r) => {
        const clockInTime = new Date(r.clockIn!)
        const endTime = r.clockOut ? new Date(r.clockOut) : new Date()
        const diffHours = (endTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
        return acc + Math.max(0, diffHours)
      }, 0) / Math.max(1, combinedData.filter(r => r.clockIn && r.hasAttendance).length)

    return {
      total,
      present,
      late,
      absent,
      avgHours,
      totalOvertimeHours: totalOvertimeMinutes / 60
    }
  }, [combinedData])

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
              <p className="text-gray-600">Monitor employee clock-in, clock-out, and overtime records</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Present</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
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
                  <ClockIcon className="h-4 w-4 text-blue-600" />
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

          <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Overtime</CardTitle>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Timer className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{stats.totalOvertimeHours.toFixed(1)}</span>
                </div>
                <p className="text-xs text-gray-500">overtime hours</p>
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
              </div>

              {/* Filter Summary Row */}
              {(filters.search || filters.status || filters.dateRange.from) && (
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
                    <TableHead className="w-[100px] py-4 px-6 font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Clock In</TableHead>
                    <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Clock Out</TableHead>
                    <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Overtime</TableHead>
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
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
                              {record.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
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
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatDate(record.date)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">
                            {record.hasAttendance && record.clockIn ? formatTime(record.clockIn) : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-semibold text-orange-600">
                            {record.hasAttendance && record.clockOut ? formatTime(record.clockOut) :
                              (record.hasAttendance && record.clockIn ? 'Working...' : '-')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {(() => {
                          const time = record.hasAttendance
                            ? calculateWorkHours(record.clockIn, record.clockOut)
                            : { worked: '-', overtime: '-' }

                          return (
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-orange-600" />
                              <span
                                className={`text-sm font-semibold ${time.overtime !== '0h 0m' && time.overtime !== '-' ? 'text-red-600' : 'text-gray-500'
                                  }`}
                              >
                                {time.overtime}
                              </span>
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
    </div>
  )
}