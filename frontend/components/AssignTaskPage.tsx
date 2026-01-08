import * as React from "react"
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
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
  Search,
  MapPin,
  Shield,
  Car
} from "lucide-react"
import { getAllEmployees, Employee, assignTask, CreateTaskRequest, getAllTeams, Team } from "@/lib/server-api"

interface AssignTaskPageProps {
  onBack: () => void
  preSelectedEmployeeId?: string
  onTaskAssigned?: () => void
}

export function AssignTaskPage({ onBack, preSelectedEmployeeId, onTaskAssigned }: AssignTaskPageProps) {
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [teams, setTeams] = React.useState<Team[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [assignmentType, setAssignmentType] = React.useState<'individual' | 'team'>('team')
  const [selectedTeam, setSelectedTeam] = React.useState<string>("")
  const [selectedEmployee, setSelectedEmployee] = React.useState<string>(preSelectedEmployeeId || "")
  const [taskData, setTaskData] = React.useState({
    title: "",
    description: "",
    category: "",
    location: "",
    startTime: "",
    endTime: ""
  })
  const [submitting, setSubmitting] = React.useState(false)

  // Fetch employees and teams on component mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [employeesResponse, teamsResponse] = await Promise.all([
          getAllEmployees({ limit: 1000 }),
          getAllTeams()
        ])
        
        if (employeesResponse.success && employeesResponse.data) {
          setEmployees(employeesResponse.data.employees)
        }
        
        if (teamsResponse.success && teamsResponse.data) {
          setTeams(teamsResponse.data)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
      alert('Please fill in all required fields')
      return
    }

    if (assignmentType === 'team' && !selectedTeam) {
      alert('Please select a team')
      return
    }

    if (assignmentType === 'individual' && !selectedEmployee) {
      alert('Please select an employee')
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
        startTime: taskData.startTime || undefined,
        endTime: taskData.endTime || undefined
      }

      const response = await assignTask(taskRequest)
      
      if (response.success) {
        if (assignmentType === 'team') {
          alert(`Task assigned successfully to team "${response.data?.teamName}" with ${response.data?.memberCount} members! All team members' attendance status has been automatically updated to PRESENT.`)
        } else {
          alert('Task assigned successfully! Employee attendance status has been automatically updated to PRESENT.')
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
      alert('Failed to assign task. Please try again.')
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
              Back to Attendance
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-600 hover:bg-purple-50"
              onClick={() => window.open('/vehicles', '_blank')}
            >
              <Car className="h-4 w-4 mr-2" />
              Vehicles
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
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search employees..."
                        className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

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
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
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
                  {/* Task Title */}
                  <div className="space-y-2">
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
                      Location *
                    </Label>
                    <Input
                      id="location"
                      placeholder="Enter task location (e.g., Office, Remote, Conference Room A)..."
                      value={taskData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* Start Time */}
                  <div className="space-y-2">
                    <Label htmlFor="start-time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      Start Time *
                    </Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={taskData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <Label htmlFor="end-time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      End Time (Optional)
                    </Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={taskData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
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
                          !taskData.startTime ||
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