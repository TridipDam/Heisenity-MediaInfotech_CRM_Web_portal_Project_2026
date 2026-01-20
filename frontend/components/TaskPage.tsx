"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AssignTaskPage } from "@/components/AssignTaskPage"
import { VehiclesPage } from "@/components/VehiclesPage"
import { showToast } from "@/lib/toast-utils"
import {
  ChevronLeft,
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
  X,
  UserPlus,
  Car,
  Timer,
  Calendar
} from "lucide-react"
import { getAttendanceRecords, getAllEmployees, getAllTeams, getAllVehicles, getAllTasks, AttendanceRecord, Employee, Team, Vehicle, exportTasksToExcel, ExportParams, getAllTickets, Ticket } from "@/lib/server-api"

interface ExtendedAttendanceRecord extends AttendanceRecord {
  hasAttendance: boolean
  taskStartTime?: string
  taskEndTime?: string
  taskLocation?: string
  assignedTask?: {
    id: string
    title: string
    description: string
    category?: string
    status: string
    location?: string
    startTime?: string
    endTime?: string
    assignedBy: string
    assignedAt: string
    relatedTicketId?: string
  }
}

const getAssignedVehicle = (employeeId: string, employeeName: string, vehicles: Vehicle[]) => {
  // Find vehicle assigned to this employee by matching the employee display ID
  const assignedVehicle = vehicles.find(vehicle =>
    vehicle.status === 'ASSIGNED' && vehicle.employeeId === employeeId
  )

  if (assignedVehicle) {
    return {
      id: assignedVehicle.vehicleNumber,
      model: `${assignedVehicle.make} ${assignedVehicle.model}${assignedVehicle.year ? ` (${assignedVehicle.year})` : ''}`
    }
  }

  return null
}

const getTaskStatusBadge = (status: string) => {
  const variants = {
    PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
    COMPLETED: "bg-green-50 text-green-700 border-green-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200"
  }

  return (
    <Badge className={`${variants[status as keyof typeof variants]} capitalize font-medium text-xs`}>
      {status.toLowerCase().replace('_', ' ')}
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


const getTicketInfo = (ticketId: string | undefined, tickets: Ticket[]) => {
  if (!ticketId) return null
  return tickets.find(ticket => ticket.id === ticketId)
}

export function TaskPage() {
  const searchParams = useSearchParams()
  const [showAssignPage, setShowAssignPage] = React.useState(false)
  const [showVehiclePage, setShowVehiclePage] = React.useState(false)
  const [combinedData, setCombinedData] = React.useState<ExtendedAttendanceRecord[]>([])
  const [teams, setTeams] = React.useState<Team[]>([])
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [tickets, setTickets] = React.useState<Ticket[]>([])
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
    teamId: ''
  })
  const [selectedEmployee, setSelectedEmployee] = React.useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = React.useState<ExtendedAttendanceRecord | null>(null)
  const [showViewDetails, setShowViewDetails] = React.useState(false)
  const [exportLoading, setExportLoading] = React.useState<'excel' | null>(null)
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date())

  const fetchAttendanceData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all employees, teams, vehicles, and tickets first
      const [employeesResponse, teamsResponse, vehiclesResponse, ticketsResponse] = await Promise.all([
        getAllEmployees({ limit: 1000, role: 'FIELD_ENGINEER' }), // Get only field engineers
        getAllTeams(), // Get all teams
        getAllVehicles(), // Get all vehicles
        getAllTickets({ limit: 1000 }) // Get all tickets
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

      let vehiclesData: Vehicle[] = []
      if (vehiclesResponse.success && vehiclesResponse.data) {
        vehiclesData = vehiclesResponse.data
        setVehicles(vehiclesData)
      }

      let ticketsData: Ticket[] = []
      if (ticketsResponse.success && ticketsResponse.data) {
        ticketsData = ticketsResponse.data
        setTickets(ticketsData)
      }

      const params: Record<string, string | number> = {
        page: pagination.page,
        limit: pagination.limit
      }

      // If no date is specified, default to today
      params.date = new Date().toISOString().split('T')[0]

      // Note: Task status filtering is done client-side after fetching all data

      const response = await getAttendanceRecords(params)

      if (response.success && response.data) {
        const records = response.data.records

        // Fetch all tasks
        const tasksResponse = await getAllTasks({ limit: 1000 })
        const allTasks = tasksResponse.success && tasksResponse.data ? tasksResponse.data.tasks : []

        // Create combined data: all employees with their attendance status and task assignments
        const combined = employees.map(employee => {
          const attendanceRecord = records.find(record => record.employeeId === employee.employeeId)

          // Get the currently IN_PROGRESS task, or the most recent one
          const employeeTasks = allTasks.filter((task: { employeeId: string; status: string }) => task.employeeId === employee.employeeId)
          const assignedTask = employeeTasks.find((task: { status: string }) => task.status === 'IN_PROGRESS') ||
            employeeTasks.sort((a: { assignedAt: string }, b: { assignedAt: string }) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0]


          if (attendanceRecord) {
            return {
              ...attendanceRecord,
              hasAttendance: true,
              assignedTask: assignedTask || undefined,
              taskLocation: assignedTask?.location || undefined
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
              hasAttendance: false,
              assignedTask: assignedTask || undefined,
              taskLocation: assignedTask?.location || undefined
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

        // Apply status filter (filter by task status)
        if (filters.status) {
          filteredCombined = filteredCombined.filter(record => 
            record.assignedTask?.status === filters.status
          )
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
      setLastUpdated(new Date())
    }
  }, [pagination.page, pagination.limit, filters])

  React.useEffect(() => {
    fetchAttendanceData()
  }, [fetchAttendanceData])

  // Reset pagination when filters change (except page)
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [filters.search, filters.status, filters.teamId])

  // Handle URL parameters for direct navigation to assign task
  React.useEffect(() => {
    const action = searchParams.get('action')
    const ticketId = searchParams.get('ticketId')
    
    if (action === 'assign') {
      setShowAssignPage(true)
      
      // If there's a ticket ID, we could potentially pre-select it in the assign page
      if (ticketId) {
        console.log('Assigning task for ticket:', ticketId)
      }
    }
  }, [searchParams])

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

  const handleExport = async (quickRange?: 'yesterday' | '15days' | '30days') => {
    try {
      setExportLoading('excel')

      // Prepare export parameters based on current filters
      const exportParams: ExportParams = {
        quickRange: quickRange
      }

      // If no quick range is specified, use current filters
      if (!quickRange) {
        // Default to today if no date is specified
        exportParams.date = new Date().toISOString().split('T')[0]

        if (filters.status) {
          exportParams.status = filters.status
        }
      }

      await exportTasksToExcel(exportParams)
      showToast.success('Export successful')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      showToast.error('Failed to export to Excel')
    } finally {
      setExportLoading(null)
    }
  }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = combinedData.length
    const pending = combinedData.filter(r => r.assignedTask?.status === 'PENDING').length
    const inProgress = combinedData.filter(r => r.assignedTask?.status === 'IN_PROGRESS').length
    const completed = combinedData.filter(r => r.assignedTask?.status === 'COMPLETED').length
    const noTask = combinedData.filter(r => !r.assignedTask).length

    const avgHours = combinedData
      .filter(r => r.clockIn && r.hasAttendance)
      .reduce((acc, r) => {
        const clockInTime = new Date(r.clockIn!)
        const endTime = r.clockOut ? new Date(r.clockOut) : new Date()
        const diffHours = (endTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
        return acc + Math.max(0, diffHours) // Ensure non-negative hours
      }, 0) / Math.max(1, combinedData.filter(r => r.clockIn && r.hasAttendance).length)

    return { total, pending, inProgress, completed, noTask, avgHours }
  }, [combinedData])

  return (
    <div className="min-h-screen bg-gray-50/30">
      {showAssignPage ? (
        <AssignTaskPage
          onBack={() => setShowAssignPage(false)}
          preSelectedEmployeeId={selectedEmployee || undefined}
          onTaskAssigned={fetchAttendanceData}
        />
      ) : showVehiclePage ? (
        <div>
          {/* Back button for Vehicle Page */}
          <div className="p-6 pb-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVehiclePage(false)}
              className="border-gray-300 hover:bg-gray-50 mb-4"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Task Management
            </Button>
          </div>
          <VehiclesPage />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
                <p className="text-gray-600">Monitor and manage employee everyday task records</p>
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
                  onClick={() => setShowVehiclePage(true)}
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
              </div>
            </div>

            <Separator className="my-4" />

            {/* Live Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-gray-500 font-normal">
                  <Clock className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>

              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">In Progress</CardTitle>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{stats.inProgress}</span>
                  </div>
                  <p className="text-xs text-gray-500">tasks in progress</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Completed</CardTitle>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{stats.completed}</span>
                  </div>
                  <p className="text-xs text-gray-500">tasks completed</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Pending</CardTitle>
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{stats.pending}</span>
                  </div>
                  <p className="text-xs text-gray-500">tasks pending</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">No Task</CardTitle>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Users className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{stats.noTask}</span>
                  </div>
                  <p className="text-xs text-gray-500">employees without tasks</p>
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
                        <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'PENDING' }))}>
                          Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'IN_PROGRESS' }))}>
                          In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'COMPLETED' }))}>
                          Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, status: 'CANCELLED' }))}>
                          Cancelled
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
                {(filters.search || filters.status || filters.teamId) && (
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
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilters({
                          search: '',
                          status: '',
                          teamId: ''
                        })
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
                  <p className="text-gray-600 font-medium">No tasks found</p>
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
                      <TableHead className="w-[180px] py-4 px-6 font-semibold text-gray-700">Assigned Vehicle</TableHead>
                      <TableHead className="w-[200px] py-4 px-6 font-semibold text-gray-700">Assigned Task</TableHead>
                      <TableHead className="w-[180px] py-4 px-6 font-semibold text-gray-700">Location</TableHead>
                      <TableHead className="w-[200px] py-4 px-6 font-semibold text-gray-700">Related Ticket</TableHead>
                      <TableHead className="w-[60px] py-4 px-6"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinedData.map((record, index) => (
                      <TableRow
                        key={record.id}
                        className={`hover:bg-gray-50/50 border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              {(() => {
                                return (
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm ${
                                    record.assignedTask 
                                      ? record.assignedTask.status === 'COMPLETED'
                                        ? 'bg-gradient-to-br from-green-500 to-green-600'
                                        : record.assignedTask.status === 'IN_PROGRESS'
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                        : record.assignedTask.status === 'PENDING'
                                        ? 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                                        : record.assignedTask.status === 'CANCELLED'
                                        ? 'bg-gradient-to-br from-red-500 to-red-600'
                                        : 'bg-gradient-to-br from-blue-500 to-blue-600' // default blue for unknown status
                                      : 'bg-gradient-to-br from-blue-500 to-blue-600' // default blue when no task
                                  }`}>
                                    {record.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </div>
                                )
                              })()}
                              {record.assignedTask ? (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                  {(() => {
                                    switch (record.assignedTask.status) {
                                      case "PENDING":
                                        return <Clock className="h-4 w-4 text-yellow-600" />
                                      case "IN_PROGRESS":
                                        return <CheckCircle className="h-4 w-4 text-blue-600" />
                                      case "COMPLETED":
                                        return <CheckCircle className="h-4 w-4 text-green-600" />
                                      case "CANCELLED":
                                        return <XCircle className="h-4 w-4 text-red-600" />
                                      default:
                                        return <Clock className="h-4 w-4 text-gray-400" />
                                    }
                                  })()}
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
                          <div className="space-y-1">
                            {record.assignedTask ? (
                              <div>
                                {getTaskStatusBadge(record.assignedTask.status)}
                              </div>
                            ) : (
                              <Badge className="bg-gray-50 text-gray-500 border-gray-200">
                                No task assigned
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="space-y-1">
                            {(() => {
                              const attendanceStart = record.clockIn
                              const attendanceEnd = record.clockOut

                              const task = record.assignedTask
                              const taskStart = task?.startTime
                              const taskEnd = task?.endTime

                              // Show task times if available, otherwise show attendance times
                              const displayStart = taskStart || attendanceStart
                              const displayEnd = taskEnd || attendanceEnd

                              return (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-green-600">
                                      {displayStart ? formatTime(displayStart) : '-'}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-sm font-semibold text-orange-600">
                                      {displayEnd
                                        ? formatTime(displayEnd)
                                        : displayStart
                                          ? 'Working...'
                                          : '-'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {displayStart
                                      ? new Date(displayStart).toLocaleDateString()
                                      : '-'}
                                  </div>
                                  {taskStart && attendanceStart && taskStart !== attendanceStart && (
                                    <div className="text-xs text-blue-600">
                                      Task: {formatTime(taskStart)}
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </TableCell>
                        {(() => {
                          return (
                            <>
                              {/* Assigned Vehicle */}
                              <TableCell className="py-4 px-6">
                                <div className="space-y-1">
                                  {/* Show actual vehicle assigned by admin */}
                                  {(() => {
                                    const assignedVehicle = getAssignedVehicle(record.employeeId, record.employeeName, vehicles)

                                    if (assignedVehicle) {
                                      return (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <Car className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-semibold text-gray-900">
                                              {assignedVehicle.id}
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {assignedVehicle.model}
                                          </div>
                                        </div>
                                      )
                                    } else {
                                      return (
                                        <div className="flex items-center gap-2">
                                          <Car className="h-4 w-4 text-gray-400" />
                                          <span className="text-sm text-gray-500">
                                            Not assigned
                                          </span>
                                        </div>
                                      )
                                    }
                                  })()}
                                </div>
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
                                {record.assignedTask.category && (
                                  <span className="text-xs text-gray-500">
                                    {record.assignedTask.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No task assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6 max-w-[180px]">
                          <div className="flex items-start gap-2 text-gray-600">
                            <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span
                                className="text-sm text-gray-900 block truncate"
                                title={record.assignedTask?.location || 'Not provided'}
                              >
                                {record.assignedTask?.location || 'Not provided'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 max-w-[200px]">
                          <div className="min-w-0">
                            {record.assignedTask?.relatedTicketId ? (
                              (() => {
                                const ticket = getTicketInfo(record.assignedTask.relatedTicketId, tickets)
                                return ticket ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-blue-600">
                                      {ticket.ticketId}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                      ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {ticket.priority}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">Ticket not found</span>
                                )
                              })()
                            ) : (
                              <span className="text-sm text-gray-500">No related ticket</span>
                            )}
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
          {
            !loading && !error && combinedData.length > 0 && (
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
            )
          }
        </div >
      )
      }

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
                    <label className="text-sm font-medium text-gray-500">Task Status</label>
                    <div className="mt-1">
                      {selectedRecord.assignedTask ? (
                        getTaskStatusBadge(selectedRecord.assignedTask.status)
                      ) : (
                        <Badge className="bg-gray-50 text-gray-500 border-gray-200">No task assigned</Badge>
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
                        <label className="text-sm font-medium text-gray-500">Assigned Vehicle</label>
                        <p className="text-sm text-gray-900">
                          {(() => {
                            const assignedVehicle = getAssignedVehicle(selectedRecord.employeeId, selectedRecord.employeeName, vehicles)

                            if (assignedVehicle) {
                              return `${assignedVehicle.id} - ${assignedVehicle.model}`
                            } else {
                              return 'Not assigned'
                            }
                          })()}
                        </p>
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
                        <label className="text-sm font-medium text-gray-500">Related Ticket</label>
                        <p className="text-sm text-gray-900">
                          {selectedRecord.assignedTask?.relatedTicketId ? (
                            (() => {
                              const ticket = getTicketInfo(selectedRecord.assignedTask.relatedTicketId, tickets)
                              return ticket ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-blue-600">{ticket.ticketId}</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                    ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {ticket.priority}
                                  </span>
                                  <span className="text-xs text-gray-500">- {ticket.ticketId}</span>
                                </div>
                              ) : 'Ticket not found'
                            })()
                          ) : 'No related ticket'}
                        </p>
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
                            {selectedRecord.assignedTask.status !== 'PENDING' ? (
                              <Badge
                                className={`text-xs ${selectedRecord.assignedTask.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  selectedRecord.assignedTask.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}
                              >
                                {selectedRecord.assignedTask.status.toLowerCase().replace('_', ' ')}
                              </Badge>
                            ) : (
                              <p className="text-sm text-gray-900">-</p>
                            )}
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
                          <label className="text-sm font-medium text-gray-500">Assigned Start Time</label>
                          <p className="text-sm text-gray-900">{selectedRecord.assignedTask.startTime || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Assigned End Time</label>
                          <p className="text-sm text-gray-900">{selectedRecord.assignedTask.endTime || 'Not specified'}</p>
                        </div>
                      </div>
                      {/* Show actual task timing if different from assigned times */}
                      {(selectedRecord.taskStartTime || selectedRecord.taskEndTime) && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Actual Start Time</label>
                            <p className="text-sm font-semibold text-green-600">
                              {selectedRecord.taskStartTime || 'Not started'}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Actual End Time</label>
                            <p className="text-sm font-semibold text-orange-600">
                              {selectedRecord.taskEndTime || 'Not finished'}
                            </p>
                          </div>
                        </div>
                      )}
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
    </div >
  )
}