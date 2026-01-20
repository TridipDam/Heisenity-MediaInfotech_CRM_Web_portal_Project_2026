import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Users,
  Search,
  MapPin,
  Shield,
  Car,
  Ticket as TicketIcon
} from "lucide-react"
import { getAllEmployees, Employee, assignTask, CreateTaskRequest, getAllTeams, Team, getAllVehicles, Vehicle, assignVehicle, getAllTickets, Ticket } from "@/lib/server-api"
import { showToast } from "@/lib/toast-utils"

interface AssignTaskPageProps {
  onBack: () => void
  preSelectedEmployeeId?: string
  onTaskAssigned?: () => void
}

export function AssignTaskPage({ onBack, preSelectedEmployeeId, onTaskAssigned }: AssignTaskPageProps) {
  const searchParams = useSearchParams()
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [teams, setTeams] = React.useState<Team[]>([])
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [assignmentType, setAssignmentType] = React.useState<'individual' | 'team'>('team')
  const [selectedTeam, setSelectedTeam] = React.useState<string>("")
  const [selectedEmployee, setSelectedEmployee] = React.useState<string>(preSelectedEmployeeId || "")
  const [selectedVehicle, setSelectedVehicle] = React.useState<string>("none")
  const [selectedTicket, setSelectedTicket] = React.useState<string>("none")
  const [taskData, setTaskData] = React.useState({
    title: "",
    description: "",
    category: "",
    location: "",
  })
  const [submitting, setSubmitting] = React.useState(false)

  // Fetch employees and teams on component mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [employeesResponse, teamsResponse, vehiclesResponse, ticketsResponse] = await Promise.all([
          getAllEmployees({ limit: 1000, role: 'FIELD_ENGINEER' }),
          getAllTeams(),
          getAllVehicles({ status: 'AVAILABLE' }),
          getAllTickets({ status: 'OPEN', limit: 100 })
        ])
        
        if (employeesResponse.success && employeesResponse.data) {
          setEmployees(employeesResponse.data.employees)
        }
        
        if (teamsResponse.success && teamsResponse.data) {
          setTeams(teamsResponse.data)
        }

        if (vehiclesResponse.success && vehiclesResponse.data) {
          setVehicles(vehiclesResponse.data)
        }

        if (ticketsResponse.success && ticketsResponse.data) {
          setTickets(ticketsResponse.data)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle URL parameters for pre-selecting ticket
  React.useEffect(() => {
    const ticketId = searchParams.get('ticketId')
    const ticketTitle = searchParams.get('ticketTitle')
    
    if (ticketId) {
      // Pre-select the ticket when it's available in the tickets list
      if (tickets.length > 0) {
        const ticketExists = tickets.find(t => t.id === ticketId)
        if (ticketExists) {
          setSelectedTicket(ticketId)
          
          // Pre-populate task title with ticket title if provided
          if (ticketTitle && !taskData.title) {
            setTaskData(prev => ({
              ...prev,
              title: `Task for: ${decodeURIComponent(ticketTitle)}`,
              description: `Task created to handle ticket: ${ticketExists.ticketId} - ${ticketExists.title}`
            }))
          }
        }
      }
    }
  }, [searchParams, tickets, taskData.title])

  // Filter employees based on search term and selected team (only for individual assignment)
  const filteredEmployees = React.useMemo(() => {
    if (assignmentType === 'team') return []
    
    let filtered = employees

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(employee => 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [employees, searchTerm, assignmentType])

  const selectedEmployeeData = employees.find(emp => emp.employeeId === selectedEmployee)
  const selectedTeamData = teams.find(team => team.id === selectedTeam)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!taskData.title || !taskData.description) {
      showToast.error('Please fill in all required fields')
      return
    }

    if (assignmentType === 'team' && !selectedTeam) {
      showToast.error('Please select a team')
      return
    }

    if (assignmentType === 'individual' && !selectedEmployee) {
      showToast.error('Please select an employee')
      return
    }

    setSubmitting(true)
    
    try {
      const taskRequest: CreateTaskRequest = {
        ...(assignmentType === 'team' ? { teamId: selectedTeam } : { employeeId: selectedEmployee }),
        title: taskData.title,
        description: taskData.description,
        category: taskData.category || undefined,
        location: taskData.location || undefined,
        ticketId: selectedTicket && selectedTicket !== "none" ? selectedTicket : undefined,
      }

      const response = await assignTask(taskRequest)
      
      if (response.success) {
        // Handle vehicle assignment
        let vehicleAssigned = false
        
        if (selectedVehicle && selectedVehicle !== "none") {
          try {
            let targetEmployeeId: string | undefined
            
            if (assignmentType === 'individual') {
              targetEmployeeId = selectedEmployee
            } else if (assignmentType === 'team' && selectedTeamData?.teamLeader) {
              targetEmployeeId = selectedTeamData.teamLeader.employeeId
            }
            
            if (targetEmployeeId) {
              const vehicleResponse = await assignVehicle(selectedVehicle, { employeeId: targetEmployeeId })
              if (vehicleResponse.success) {
                vehicleAssigned = true
                console.log('Vehicle assigned successfully')
              } else {
                console.warn('Task assigned but vehicle assignment failed:', vehicleResponse.error)
              }
            }
          } catch (vehicleError) {
            console.warn('Task assigned but vehicle assignment failed:', vehicleError)
          }
        }

        // Show success message
        if (assignmentType === 'team') {
          const vehicleMsg = vehicleAssigned && selectedTeamData?.teamLeader 
            ? ` Vehicle has been assigned to team leader ${selectedTeamData.teamLeader.name}.` 
            : ''
          showToast.success(`Task assigned successfully to team "${response.data?.teamName}" with ${response.data?.memberCount} members! All team members' attendance status has been automatically updated to PRESENT.${vehicleMsg}`)
        } else {
          const vehicleMsg = vehicleAssigned ? ' Vehicle has also been assigned to the employee.' : ''
          showToast.success(`Task assigned successfully! Employee attendance status has been automatically updated to PRESENT.${vehicleMsg}`)
        }
        
        if (onTaskAssigned) {
          onTaskAssigned()
        }
        onBack()
      } else {
        throw new Error(response.error || 'Failed to assign task')
      }
    } catch (error) {
      console.error('Error assigning task:', error)
      showToast.error('Failed to assign task. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setTaskData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBack}
              className="border-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Task Management
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-blue-600" />
                Assign Task
              </h1>
              <p className="text-gray-600">Assign a new task to an employee</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignment Type & Selection */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Assignment Target
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Assignment Type Selection */}
                <div className="space-y-2">
                  <Label>Assignment Type</Label>
                  <Select value={assignmentType} onValueChange={(value: 'individual' | 'team') => {
                    setAssignmentType(value)
                    setSelectedTeam("")
                    setSelectedEmployee("")
                    setSelectedVehicle("none") // Reset vehicle selection when changing assignment type
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span>Assign to Team</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="individual">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-500" />
                          <span>Assign to Individual</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Team Selection */}
                {assignmentType === 'team' && (
                  <div className="space-y-2">
                    <Label htmlFor="team-select">Select Team *</Label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a team..." />
                      </SelectTrigger>
                      <SelectContent>
                        {loading ? (
                          <SelectItem value="loading" disabled>
                            Loading teams...
                          </SelectItem>
                        ) : teams.length === 0 ? (
                          <SelectItem value="no-teams" disabled>
                            No teams found
                          </SelectItem>
                        ) : (
                          teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-3 py-1">
                                <Users className="h-4 w-4 text-blue-500" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{team.name}</p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                                    {team.teamLeader && ` • Leader: ${team.teamLeader.name}`}
                                  </p>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Individual Employee Selection */}
                {assignmentType === 'individual' && (
                  <>

                    {/* Employee Dropdown */}
                    <div className="space-y-2">
                      <Label htmlFor="employee-select">Employee *</Label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose an employee..." />
                        </SelectTrigger>
                        <SelectContent>
                          {loading ? (
                            <SelectItem value="loading" disabled>
                              Loading employees...
                            </SelectItem>
                          ) : filteredEmployees.length === 0 ? (
                            <SelectItem value="no-results" disabled>
                              No employees found
                            </SelectItem>
                          ) : (
                            filteredEmployees.map((employee) => (
                              <SelectItem key={employee.employeeId} value={employee.employeeId}>
                                <div className="flex items-center gap-3 py-1">
                                  <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                    {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{employee.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{employee.employeeId} • {employee.email}</p>
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Selection Preview */}
                {assignmentType === 'team' && selectedTeamData && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{selectedTeamData.name}</p>
                        {selectedTeamData.description && (
                          <p className="text-sm text-gray-600 mt-1">{selectedTeamData.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                            {selectedTeamData.members.length} Members
                          </Badge>
                          {selectedTeamData.teamLeader && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Leader: {selectedTeamData.teamLeader.name}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Team Members:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedTeamData.members.slice(0, 3).map((member) => (
                              <span key={member.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {member.name}
                              </span>
                            ))}
                            {selectedTeamData.members.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{selectedTeamData.members.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {assignmentType === 'individual' && selectedEmployeeData && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {selectedEmployeeData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{selectedEmployeeData.name}</p>
                        <p className="text-sm text-gray-600">{selectedEmployeeData.employeeId}</p>
                        <p className="text-xs text-gray-500">{selectedEmployeeData.email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {selectedEmployeeData.isTeamLeader && (
                            <Badge className="bg-green-50 text-green-700 border-green-200 text-xs flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Team Leader
                            </Badge>
                          )}
                          {selectedEmployeeData.teamId && (
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                              {teams.find(t => t.id === selectedEmployeeData.teamId)?.name || 'Team Member'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Task Details Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Task Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Related Ticket */}
                  <div className="space-y-2 mb-2">
                    <Label htmlFor="related-ticket" className="flex items-center gap-2">
                      <TicketIcon className="h-4 w-4 text-gray-500" />
                      Related Ticket (Optional)
                      {searchParams.get('ticketId') && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          Pre-selected from ticket
                        </span>
                      )}
                    </Label>
                    <Select value={selectedTicket} onValueChange={setSelectedTicket}>
                      <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select a related ticket..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No related ticket</SelectItem>
                        {loading ? (
                          <SelectItem value="loading" disabled>
                            Loading tickets...
                          </SelectItem>
                        ) : tickets.length === 0 ? (
                          <SelectItem value="no-tickets" disabled>
                            No open tickets found
                          </SelectItem>
                        ) : (
                          tickets.map((ticket) => (
                            <SelectItem key={ticket.id} value={ticket.id}>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{ticket.ticketId}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                      ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {ticket.priority}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 truncate mt-0.5">{ticket.title}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedTicket && selectedTicket !== "none" && tickets.find(t => t.id === selectedTicket) && (
                      <div className="mt-3 mb-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        {(() => {
                          const ticket = tickets.find(t => t.id === selectedTicket)!
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <TicketIcon className="h-4 w-4 text-blue-600" />
                                  <span className="font-semibold text-blue-900">{ticket.ticketId}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                                    ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                    ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {ticket.priority}
                                  </span>
                                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                    {ticket.category}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 mb-1">{ticket.title}</p>
                                <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                              </div>
                              {ticket.reporter && (
                                <div className="text-xs text-gray-500">
                                  Created by: {ticket.reporter.name}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Task Title */}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="task-title">Task Title *</Label>
                    <Input
                      id="task-title"
                      placeholder="Enter task title..."
                      value={taskData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Task Description */}
                  <div className="space-y-2">
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea
                      id="task-description"
                      placeholder="Describe the task in detail..."
                      value={taskData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[100px]"
                      required
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      placeholder="Enter task location (e.g., Office, Remote, Conference Room A)..."
                      value={taskData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Vehicle Assignment */}
                  <div className="space-y-2">
                    <Label htmlFor="vehicle" className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-500" />
                      Assign Vehicle (Optional)
                    </Label>
                    {assignmentType === 'team' && selectedTeamData && !selectedTeamData.teamLeader && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-700 font-medium">
                          ⚠ This team has no team leader
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Vehicle can only be assigned to the team leader. Please assign a team leader first.
                        </p>
                      </div>
                    )}
                    {assignmentType === 'team' && selectedTeamData && selectedTeamData.teamLeader && (
                      <>
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                          <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select a vehicle to assign to team leader..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No vehicle assignment</SelectItem>
                            {vehicles.filter(v => v.status === 'AVAILABLE').map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                <div className="flex items-center gap-2">
                                  <Car className="h-4 w-4" />
                                  <span>
                                    {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                                    {vehicle.year && ` (${vehicle.year})`}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedVehicle && selectedVehicle !== "none" && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-700 font-medium">
                              ✓ Vehicle will be assigned to team leader: {selectedTeamData.teamLeader.name}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              The vehicle status will be updated to &quot;ASSIGNED&quot; after task creation
                            </p>
                          </div>
                        )}
                        {vehicles.filter(v => v.status === 'AVAILABLE').length === 0 && (
                          <p className="text-sm text-gray-500">
                            No available vehicles to assign. All vehicles are currently assigned.
                          </p>
                        )}
                      </>
                    )}
                    {assignmentType === 'individual' && (
                      <>
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                          <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select a vehicle to assign..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No vehicle assignment</SelectItem>
                            {vehicles.filter(v => v.status === 'AVAILABLE').map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                <div className="flex items-center gap-2">
                                  <Car className="h-4 w-4" />
                                  <span>
                                    {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                                    {vehicle.year && ` (${vehicle.year})`}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedVehicle && selectedVehicle !== "none" && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-700 font-medium">
                              ✓ Vehicle will be assigned to the selected employee
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              The vehicle status will be updated to &quot;ASSIGNED&quot; after task creation
                            </p>
                          </div>
                        )}
                        {vehicles.filter(v => v.status === 'AVAILABLE').length === 0 && (
                          <p className="text-sm text-gray-500">
                            No available vehicles to assign. All vehicles are currently assigned.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <AlertCircle className="h-4 w-4" />
                      Fields marked with * are required
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onBack}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={
                          submitting || 
                          !taskData.title || 
                          !taskData.location ||
                          (assignmentType === 'team' && !selectedTeam) ||
                          (assignmentType === 'individual' && !selectedEmployee)
                        }
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Assigning...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {assignmentType === 'team' ? 'Assign to Team' : 'Assign to Employee'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}