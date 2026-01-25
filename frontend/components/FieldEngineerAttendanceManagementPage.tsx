"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AddAttendanceRecord } from "@/components/AddAttendanceRecord"
import { showToast } from "@/lib/toast-utils"

import {
  Search,
  Filter,
  Download,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  ClockIcon,
  Timer,
  Calendar,
  Plus,
  MoreVertical,
  Edit
} from "lucide-react"
import { getAttendanceRecords, getAllEmployees, exportAttendanceToExcel, ExportParams, AttendanceRecord, Employee } from "@/lib/server-api"



interface ExtendedAttendanceRecord extends AttendanceRecord {
  hasAttendance: boolean
}

interface AttendanceSessionRow {
  id: string
  employeeId: string
  employeeName: string
  email: string
  phone?: string
  teamId?: string
  isTeamLeader: boolean
  date: string
  sessionId?: string
  sessionNumber?: number
  clockIn?: string
  clockOut?: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'MARKDOWN'
  source: 'SELF' | 'ADMIN'
  location?: string
  latitude?: number
  longitude?: number
  ipAddress?: string
  deviceInfo?: string
  photo?: string
  locked: boolean
  lockedReason?: string
  attemptCount: 'ZERO' | 'ONE' | 'TWO' | 'THREE'
  approvalStatus?: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  approvalReason?: string
  createdAt: string
  updatedAt: string
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
    MARKDOWN: "bg-gray-50 text-gray-700 border-gray-200"
  }

  return (
    <Badge className={`${variants[status as keyof typeof variants] || 'bg-gray-50 text-gray-700 border-gray-200'} font-medium text-xs`}>
      {status}
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

// UTC (DB) → local (datetime-local input)
const toLocalInput = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// local (datetime-local input) → UTC (DB)
const fromLocalInput = (value?: string) => {
  if (!value) return null
  return new Date(value).toISOString()
}


export function AttendanceManagementPage() {
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [currentDate, setCurrentDate] = React.useState(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }))
  const [combinedData, setCombinedData] = React.useState<AttendanceSessionRow[]>([])
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
    status: ''
  })
  const [exportLoading, setExportLoading] = React.useState<'excel' | 'pdf' | null>(null)

  // Edit dialog state
  const [editDialog, setEditDialog] = React.useState<{
    open: boolean
    record: AttendanceSessionRow | null
    clockIn: string
    clockOut: string
    loading: boolean
  }>({
    open: false,
    record: null,
    clockIn: '',
    clockOut: '',
    loading: false
  })

  const fetchAttendanceData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all employees first (only FIELD_ENGINEER employees)
      const employeesResponse = await getAllEmployees({ limit: 1000, role: 'FIELD_ENGINEER' })

      let employees: Employee[] = []
      if (employeesResponse.success && employeesResponse.data) {
        employees = employeesResponse.data.employees
      }

      const params: Record<string, string | number> = {
        page: pagination.page,
        limit: pagination.limit
      }

      // Use today's date for filtering
      params.date = new Date().toISOString().split('T')[0]

      if (filters.status) {
        params.status = filters.status
      }

      // Add role filter for FIELD_ENGINEER employees only
      params.role = 'FIELD_ENGINEER'

      const response = await getAttendanceRecords(params)

      if (response.success && response.data) {
        const records = response.data.records

        // Create combined data: all employees with their attendance sessions as separate rows
        const combined: AttendanceSessionRow[] = []

        employees.forEach(employee => {
          const attendanceRecord = records.find(record => record.employeeId === employee.employeeId)

          if (attendanceRecord && attendanceRecord.sessions && attendanceRecord.sessions.length > 0) {
            // Create a row for each session
            attendanceRecord.sessions.forEach((session, index) => {
              combined.push({
                id: `${attendanceRecord.id}-session-${session.id}`,
                employeeId: attendanceRecord.employeeId,
                employeeName: attendanceRecord.employeeName,
                email: attendanceRecord.email,
                phone: attendanceRecord.phone,
                teamId: attendanceRecord.teamId,
                isTeamLeader: attendanceRecord.isTeamLeader,
                date: attendanceRecord.date,
                sessionId: session.id,
                sessionNumber: index + 1,
                clockIn: session.clockIn,
                clockOut: session.clockOut,
                status: attendanceRecord.status,
                source: attendanceRecord.source,
                location: session.location || attendanceRecord.location,
                latitude: attendanceRecord.latitude,
                longitude: attendanceRecord.longitude,
                ipAddress: session.ipAddress || attendanceRecord.ipAddress,
                deviceInfo: session.deviceInfo || attendanceRecord.deviceInfo,
                photo: session.photo || attendanceRecord.photo,
                locked: attendanceRecord.locked,
                lockedReason: attendanceRecord.lockedReason,
                attemptCount: attendanceRecord.attemptCount,
                approvalStatus: attendanceRecord.approvalStatus,
                approvedBy: attendanceRecord.approvedBy,
                approvedAt: attendanceRecord.approvedAt,
                rejectedBy: attendanceRecord.rejectedBy,
                rejectedAt: attendanceRecord.rejectedAt,
                approvalReason: attendanceRecord.approvalReason,
                createdAt: session.createdAt,
                updatedAt: attendanceRecord.updatedAt,
                hasAttendance: true
              })
            })
          } else if (attendanceRecord) {
            // Single row for attendance without sessions (fallback)
            combined.push({
              id: attendanceRecord.id,
              employeeId: attendanceRecord.employeeId,
              employeeName: attendanceRecord.employeeName,
              email: attendanceRecord.email,
              phone: attendanceRecord.phone,
              teamId: attendanceRecord.teamId,
              isTeamLeader: attendanceRecord.isTeamLeader,
              date: attendanceRecord.date,
              clockIn: attendanceRecord.clockIn,
              clockOut: attendanceRecord.clockOut,
              status: attendanceRecord.status,
              source: attendanceRecord.source,
              location: attendanceRecord.location,
              latitude: attendanceRecord.latitude,
              longitude: attendanceRecord.longitude,
              ipAddress: attendanceRecord.ipAddress,
              deviceInfo: attendanceRecord.deviceInfo,
              photo: attendanceRecord.photo,
              locked: attendanceRecord.locked,
              lockedReason: attendanceRecord.lockedReason,
              attemptCount: attendanceRecord.attemptCount,
              approvalStatus: attendanceRecord.approvalStatus,
              approvedBy: attendanceRecord.approvedBy,
              approvedAt: attendanceRecord.approvedAt,
              rejectedBy: attendanceRecord.rejectedBy,
              rejectedAt: attendanceRecord.rejectedAt,
              approvalReason: attendanceRecord.approvalReason,
              createdAt: attendanceRecord.createdAt,
              updatedAt: attendanceRecord.updatedAt,
              hasAttendance: true
            })
          } else {
            // Create a placeholder record for employees without attendance
            combined.push({
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
            })
          }
        })

        // Apply client-side search filter if needed
        let filteredCombined = combined
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
  }, [filters.search, filters.status])

  const handleRefresh = () => {
    fetchAttendanceData()
  }

  const handleRecordAdded = () => {
    // Employee added - refresh the attendance data
    setShowAddForm(false)
    // Refresh data to show the new employee
    setTimeout(() => {
      fetchAttendanceData()
    }, 1000)
  }

  const handleExport = async (quickRange?: 'yesterday' | '15days' | '30days') => {
    try {
      setExportLoading('excel')

      const exportParams: ExportParams = {
        role: 'FIELD_ENGINEER',
        quickRange: quickRange
      }

      // Only use custom date range if no quick range is specified
      if (!quickRange) {
        // Use today's date
        exportParams.date = new Date().toISOString().split('T')[0]
      }

      if (filters.status) {
        exportParams.status = filters.status
      }

      await exportAttendanceToExcel(exportParams)
      showToast.success('Export successful')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      showToast.error('Failed to export to Excel')
    } finally {
      setExportLoading(null)
    }
  }



  // Edit attendance functions
  const handleEditAttendance = (record: AttendanceSessionRow) => {
    setEditDialog({
      open: true,
      record,
      clockIn: toLocalInput(record.clockIn),
      clockOut: toLocalInput(record.clockOut),
      loading: false
    })
  }

  const handleSaveEdit = async () => {
    if (!editDialog.record) return

    setEditDialog(prev => ({ ...prev, loading: true }))

    try {
      let url: string
      
      // Check if this is a session update or attendance record update
      if (editDialog.record.sessionId) {
        // This is a session update - extract attendanceId from the composite ID
        const attendanceId = editDialog.record.id.split('-session-')[0]
        url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/${attendanceId}/sessions/${editDialog.record.sessionId}`
      } else {
        // This is a direct attendance record update
        url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/${editDialog.record.id}`
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clockIn: fromLocalInput(editDialog.clockIn),
          clockOut: fromLocalInput(editDialog.clockOut),
        }),
      })

      if (response.ok) {
        showToast.success('Attendance updated successfully')
        setEditDialog({ open: false, record: null, clockIn: '', clockOut: '', loading: false })
        fetchAttendanceData() // Refresh data
      } else {
        const error = await response.json()
        showToast.error(error.message || 'Failed to update attendance')
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
      showToast.error('Failed to update attendance')
    } finally {
      setEditDialog(prev => ({ ...prev, loading: false }))
    }
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    // Group sessions by employee to get unique employee counts
    const employeeGroups = combinedData.reduce((acc, record) => {
      if (!acc[record.employeeId]) {
        acc[record.employeeId] = {
          status: record.status,
          sessions: []
        }
      }
      if (record.hasAttendance && record.clockIn) {
        acc[record.employeeId].sessions.push(record)
      }
      return acc
    }, {} as Record<string, { status: string, sessions: AttendanceSessionRow[] }>)

    const employees = Object.values(employeeGroups)
    const total = employees.length
    const present = employees.filter(e => e.status === 'PRESENT').length
    const late = employees.filter(e => e.status === 'LATE').length
    const absent = employees.filter(e => e.status === 'ABSENT').length

    const totalOvertimeMinutes = employees
      .flatMap(e => e.sessions)
      .filter(s => s.clockIn && s.clockOut)
      .reduce((acc, s) => {
        const { totalHours } = calculateWorkHours(s.clockIn, s.clockOut)
        const overtimeHours = Math.max(0, totalHours - STANDARD_WORK_HOURS)
        return acc + (overtimeHours * 60)
      }, 0)

    const totalWorkingHours = employees
      .flatMap(e => e.sessions)
      .filter(s => s.clockIn)
      .reduce((acc, s) => {
        const clockInTime = new Date(s.clockIn!)
        const endTime = s.clockOut ? new Date(s.clockOut) : new Date()
        const diffHours = (endTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
        return acc + Math.max(0, diffHours)
      }, 0)

    const avgHours = totalWorkingHours / Math.max(1, employees.filter(e => e.sessions.length > 0).length)

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
      {showAddForm ? (
        <AddAttendanceRecord
          onRecordAdded={handleRecordAdded}
          onBack={() => setShowAddForm(false)}
          role="FIELD_ENGINEER"
        />
      ) : (
        <div className="p-6 space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900">Field Engineer Attendance</h1>
                <p className="text-gray-600">Monitor field engineer clock-in, clock-out, and overtime records</p>
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
                      {exportLoading ? 'Exporting...' : 'Export to Excel'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleExport()}
                      disabled={exportLoading !== null}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Current Filter
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport('yesterday')}
                      disabled={exportLoading !== null}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Yesterday
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport('15days')}
                      disabled={exportLoading !== null}
                    >
                      <Timer className="h-4 w-4 mr-2" />
                      Last 15 Days
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport('30days')}
                      disabled={exportLoading !== null}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Last 30 Days
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field Engineer
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Status Indicators */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
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
                  <p className="text-xs text-gray-500">field engineers present</p>
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
                  <p className="text-xs text-gray-500">field engineers absent</p>
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
                      placeholder="Search field engineers..."
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
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
                {(filters.search || filters.status) && (
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
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const today = new Date()
                        setFilters({
                          search: '',
                          status: ''
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
                    {combinedData.length} attendance sessions found
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
                  <p className="text-gray-600 font-medium">No attendance sessions found</p>
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
                      <TableHead className="w-[80px] py-4 px-6 font-semibold text-gray-700">Session</TableHead>
                      <TableHead className="w-[100px] py-4 px-6 font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Clock In</TableHead>
                      <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Clock Out</TableHead>
                      <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Overtime</TableHead>
                      <TableHead className="w-[60px] py-4 px-6 font-semibold text-gray-700">Actions</TableHead>
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
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm ${record.hasAttendance
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                }`}>
                                {record.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </div>
                              {record.hasAttendance ? (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                  {getStatusIcon(record.status)}
                                </div>
                              ) : (
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
                          {record.sessionNumber ? (
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                              #{record.sessionNumber}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.status)}
                            {getStatusBadge(record.status)}
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
                          {record.hasAttendance && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditAttendance(record)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Times
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
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
                Showing {combinedData.length} attendance sessions from {stats.total} field engineers
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


      {/* Edit Attendance Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => {
        if (!open) {
          setEditDialog({ open: false, record: null, clockIn: '', clockOut: '', loading: false })
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance Times</DialogTitle>
          </DialogHeader>
          {editDialog.record && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p><strong>Employee:</strong> {editDialog.record?.employeeName}</p>
                <p><strong>Date:</strong> {editDialog.record ? formatDate(editDialog.record.date) : ''}</p>
                {editDialog.record?.sessionNumber && (
                  <p><strong>Session:</strong> #{editDialog.record.sessionNumber}</p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="clockIn">Clock In Time</Label>
                  <Input
                    id="clockIn"
                    type="datetime-local"
                    value={editDialog.clockIn}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, clockIn: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="clockOut">Clock Out Time</Label>
                  <Input
                    id="clockOut"
                    type="datetime-local"
                    value={editDialog.clockOut}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, clockOut: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveEdit}
                  disabled={editDialog.loading}
                  className="flex-1"
                >
                  {editDialog.loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditDialog({ open: false, record: null, clockIn: '', clockOut: '', loading: false })}
                  disabled={editDialog.loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}