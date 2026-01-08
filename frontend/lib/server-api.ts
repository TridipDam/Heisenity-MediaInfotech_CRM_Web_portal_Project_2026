// lib/server-api.ts
// Client-side API functions (no server-only imports)

export type CreateAttendanceRequest = {
    employeeId: string
    latitude?: number
    longitude?: number
    photo?: string
    status?: 'PRESENT' | 'LATE'
    location?: string // Add location text field
    action?: 'check-in' | 'check-out' // Add action parameter
}

export type CreateAttendanceResponse = {
    success: boolean
    message: string
    data?: {
        employeeId: string
        timestamp: string
        location: string
        ipAddress: string
        deviceInfo: string
        photo?: string
        status: 'PRESENT' | 'LATE'
    }
    error?: string
}

export type DeviceInfo = {
  os: string
  browser: string
  device: string
}

export type LocationData = {
  address: string
  city: string
  state: string
}

export type LocationInfo = {
  success: boolean
  coordinates: {
    latitude: number
    longitude: number
  }
  location: LocationData
  humanReadableLocation: string
  timestamp: string
}

export type RemainingAttemptsResponse = {
  success: boolean
  data: {
    remainingAttempts: number
    isLocked: boolean
    status?: string
  }
  error?: string
}

export type AssignedLocationResponse = {
  success: boolean
  data?: {
    id: string
    latitude: number
    longitude: number
    radius: number
    address?: string
    city?: string
    state?: string
    startTime: string
    endTime: string
    assignedBy: string
  }
  error?: string
}

export async function createAttendance(data: CreateAttendanceRequest): Promise<CreateAttendanceResponse> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            cache: 'no-store'
        })

        const response = await res.json()

        if (!res.ok) {
            throw new Error(response.error || `Failed to create attendance: ${res.status}`)
        }

        return response
    } catch (error) {
        console.error('createAttendance error:', error)
        throw error
    }
}

export async function getLocationInfo(latitude: number, longitude: number): Promise<LocationInfo> {
    try {
        console.log('Making request to:', `${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/location?latitude=${latitude}&longitude=${longitude}`)
        
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/location?latitude=${latitude}&longitude=${longitude}`,
            {
                cache: 'no-store'
            }
        )

        console.log('Response status:', res.status)
        console.log('Response ok:', res.ok)

        if (!res.ok) {
            const errorText = await res.text()
            console.error('Response error:', errorText)
            throw new Error(`Failed to fetch location info: ${res.status} ${errorText}`)
        }

        const locationInfo = await res.json()
        console.log('Location info response:', locationInfo)
        return locationInfo
    } catch (error) {
        console.error('getLocationInfo error:', error)
        throw error
    }
}

export async function getRemainingAttempts(employeeId: string): Promise<RemainingAttemptsResponse> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/attempts/${employeeId}`, {
            cache: 'no-store'
        })

        const response = await res.json()

        if (!res.ok) {
            throw new Error(response.error || `Failed to get remaining attempts: ${res.status}`)
        }

        return response
    } catch (error) {
        console.error('getRemainingAttempts error:', error)
        throw error
    }
}

export async function getAssignedLocation(employeeId: string): Promise<AssignedLocationResponse> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/assigned-location/${employeeId}`, {
            cache: 'no-store'
        })

        const response = await res.json()

        if (!res.ok) {
            throw new Error(response.error || `Failed to get assigned location: ${res.status}`)
        }

        return response
    } catch (error) {
        console.error('getAssignedLocation error:', error)
        throw error
    }
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/device`, {
            cache: 'no-store'
        })

        const response = await res.json()

        if (!res.ok) {
            throw new Error(response.error || `Failed to get device info: ${res.status}`)
        }

        return response
    } catch (error) {
        console.error('getDeviceInfo error:', error)
        throw error
    }
}

export type AttendanceRecord = {
    id: string
    employeeId: string
    employeeName: string
    email: string
    phone?: string
    teamId?: string
    isTeamLeader: boolean
    date: string
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
    taskStartTime?: string
    taskEndTime?: string
    taskLocation?: string
    createdAt: string
    updatedAt: string
    assignedTask?: AssignedTask
    workedHours?: string
    overtime?: string
}

export type AssignedTask = {
    id: string
    title: string
    description: string
    category?: string
    location?: string
    startTime?: string
    endTime?: string
    assignedBy: string
    assignedAt: string
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
}

export type CreateTaskRequest = {
    employeeId?: string
    teamId?: string
    title: string
    description: string
    category?: string
    location?: string
    startTime?: string
    endTime?: string
}

export type CreateTaskResponse = {
    success: boolean
    message: string
    data?: {
        type: 'individual' | 'team'
        task?: AssignedTask
        teamName?: string
        memberCount?: number
        tasks?: AssignedTask[]
    }
    error?: string
}

export type GetAttendanceResponse = {
    success: boolean
    data?: {
        records: AttendanceRecord[]
        pagination: {
            page: number
            limit: number
            total: number
            totalPages: number
        }
    }
    error?: string
}

export async function getAttendanceRecords(params?: {
    page?: number
    limit?: number
    date?: string
    dateFrom?: string
    dateTo?: string
    employeeId?: string
    status?: string
}): Promise<GetAttendanceResponse> {
    try {
        const searchParams = new URLSearchParams()
        
        if (params?.page) searchParams.append('page', params.page.toString())
        if (params?.limit) searchParams.append('limit', params.limit.toString())
        if (params?.date) searchParams.append('date', params.date)
        if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
        if (params?.status) searchParams.append('status', params.status)

        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
        
        const res = await fetch(url, {
            cache: 'no-store'
        })

        const response = await res.json()

        if (!res.ok) {
            throw new Error(response.error || `Failed to get attendance records: ${res.status}`)
        }

        return response
    } catch (error) {
        console.error('getAttendanceRecords error:', error)
        throw error
    }
}

export type DeleteAttendanceResponse = {
    success: boolean
    message: string
    error?: string
}

export async function deleteAttendanceRecord(id: string): Promise<DeleteAttendanceResponse> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/${id}`, {
            method: 'DELETE',
            cache: 'no-store'
        })

        const response = await res.json()

        if (!res.ok) {
            throw new Error(response.error || `Failed to delete attendance record: ${res.status}`)
        }

        return response
    } catch (error) {
        console.error('deleteAttendanceRecord error:', error)
        throw error
    }
}
// Employee ID Generator Types
export type GenerateEmployeeIdResponse = {
  success: boolean
  message: string
  data?: {
    employeeId: string
  }
  error?: string
}

export type CheckEmployeeIdAvailabilityResponse = {
  success: boolean
  message: string
  data?: {
    employeeId: string
    available: boolean
  }
  error?: string
}

export type GetNextAvailableIdsResponse = {
  success: boolean
  message: string
  data?: {
    nextAvailableIds: string[]
  }
  error?: string
}

export type ValidateEmployeeIdResponse = {
  success: boolean
  message: string
  data?: {
    employeeId: string
    valid: boolean
  }
  error?: string
}

// Employee ID Generator API Functions
export async function generateNextEmployeeId(): Promise<GenerateEmployeeIdResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employee-id/generate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log('Generate ID response:', data)
    return data
  } catch (error) {
    console.error('Error generating employee ID:', error)
    return {
      success: false,
      message: 'Failed to generate employee ID',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function checkEmployeeIdAvailability(employeeId: string): Promise<CheckEmployeeIdAvailabilityResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employee-id/check/${employeeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error checking employee ID availability:', error)
    return {
      success: false,
      message: 'Failed to check employee ID availability',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function getNextAvailableEmployeeIds(count: number = 5): Promise<GetNextAvailableIdsResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employee-id/preview?count=${count}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error getting next available employee IDs:', error)
    return {
      success: false,
      message: 'Failed to get next available employee IDs',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function validateEmployeeIdFormat(employeeId: string): Promise<ValidateEmployeeIdResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employee-id/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employeeId })
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error validating employee ID format:', error)
    return {
      success: false,
      message: 'Failed to validate employee ID format',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Field Engineer Types
export type FieldEngineer = {
  id: string
  name: string
  employeeId: string
  email: string
  phone?: string
  teamId?: string
  isTeamLeader: boolean
  status: string
  createdAt: string
  updatedAt: string
}

export type GetFieldEngineersResponse = {
  success: boolean
  message: string
  data?: {
    fieldEngineers: FieldEngineer[]
    total: number
  }
  error?: string
}

export type GetFieldEngineerResponse = {
  success: boolean
  message: string
  data?: FieldEngineer
  error?: string
}

export type CreateFieldEngineerRequest = {
  name: string
  employeeId: string
  email: string
  password: string
  phone?: string
  teamId?: string
  isTeamLeader?: boolean
}

export type CreateFieldEngineerResponse = {
  success: boolean
  message: string
  data?: FieldEngineer
  error?: string
}

// Field Engineer API Functions
export async function getAllFieldEngineers(params?: {
  status?: string
  search?: string
}): Promise<GetFieldEngineersResponse> {
  try {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.search) queryParams.append('search', params.search)
    
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/field-engineers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error getting field engineers:', error)
    return {
      success: false,
      message: 'Failed to get field engineers',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function getFieldEngineerByEmployeeId(employeeId: string): Promise<GetFieldEngineerResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/field-engineers/${employeeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error getting field engineer:', error)
    return {
      success: false,
      message: 'Failed to get field engineer',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function createFieldEngineer(fieldEngineer: CreateFieldEngineerRequest): Promise<CreateFieldEngineerResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/field-engineers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fieldEngineer)
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error creating field engineer:', error)
    return {
      success: false,
      message: 'Failed to create field engineer',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Employee Management Types
export type Employee = {
  id: string
  name: string
  employeeId: string
  email: string
  phone?: string
  teamId?: string
  isTeamLeader: boolean
  status: string
  createdAt: string
  updatedAt: string
  assignedBy?: string
}

export type GetEmployeesResponse = {
  success: boolean
  data?: {
    employees: Employee[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
}

export type CreateEmployeeRequest = {
  name: string
  email: string
  password: string
  phone?: string
  teamId?: string
  isTeamLeader?: boolean
  assignedBy?: string
}

export type CreateEmployeeResponse = {
  success: boolean
  message: string
  data?: Employee
  error?: string
}

export type UpdateEmployeeRequest = {
  name?: string
  email?: string
  phone?: string
  teamId?: string
  isTeamLeader?: boolean
  status?: string
  password?: string
}

export type UpdateEmployeeResponse = {
  success: boolean
  message: string
  data?: Employee
  error?: string
}

export type GetNextEmployeeIdResponse = {
  success: boolean
  data?: {
    nextEmployeeId: string
  }
  error?: string
}

// Employee Management API Functions
export async function getAllEmployees(params?: {
  page?: number
  limit?: number
  search?: string
  status?: string
}): Promise<GetEmployeesResponse> {
  try {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status) searchParams.append('status', params.status)

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/employees${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    const res = await fetch(url, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to get employees: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getAllEmployees error:', error)
    throw error
  }
}

export async function createEmployee(employee: CreateEmployeeRequest): Promise<CreateEmployeeResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(employee),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to create employee: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('createEmployee error:', error)
    throw error
  }
}

export async function updateEmployee(id: string, employee: UpdateEmployeeRequest): Promise<UpdateEmployeeResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(employee),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to update employee: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('updateEmployee error:', error)
    throw error
  }
}

export async function deleteEmployee(id: string): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees/${id}`, {
      method: 'DELETE',
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to delete employee: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('deleteEmployee error:', error)
    throw error
  }
}

export async function getEmployeeById(id: string): Promise<{ success: boolean; data?: Employee; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees/${id}`, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to get employee: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getEmployeeById error:', error)
    throw error
  }
}

export async function getNextEmployeeId(): Promise<GetNextEmployeeIdResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees/next-id`, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to get next employee ID: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getNextEmployeeId error:', error)
    throw error
  }
}

// Task Assignment API Functions
export async function assignTask(task: CreateTaskRequest): Promise<CreateTaskResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to assign task: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('assignTask error:', error)
    throw error
  }
}

// Team API Types
export type TeamMember = {
  id: string
  name: string
  employeeId: string
  email: string
  isTeamLeader: boolean
}

export type Team = {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  members: TeamMember[]
  teamLeader?: TeamMember
}

export type TeamWithMembers = Team

export type GetTeamsResponse = {
  success: boolean
  data?: Team[]
  error?: string
}

export type GetTeamResponse = {
  success: boolean
  data?: Team
  error?: string
}

export type CreateTeamRequest = {
  name: string
  description?: string
  memberIds?: string[]
  teamLeaderId?: string
}

export type CreateTeamResponse = {
  success: boolean
  data?: Team | TeamWithMembers
  message?: string
  error?: string
}

export type UpdateTeamMembersRequest = {
  memberIds: string[]
  teamLeaderId?: string
}

export type UpdateTeamMembersResponse = {
  success: boolean
  data?: TeamWithMembers
  message?: string
  error?: string
}

// Team API Functions
export async function getAllTeams(): Promise<GetTeamsResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/teams`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to fetch teams: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getAllTeams error:', error)
    throw error
  }
}

export async function getTeamById(teamId: string): Promise<GetTeamResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/teams/${teamId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to fetch team: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getTeamById error:', error)
    throw error
  }
}

export async function createTeam(teamData: CreateTeamRequest): Promise<CreateTeamResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teamData),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to create team: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('createTeam error:', error)
    throw error
  }
}

export async function updateTeamMembers(teamId: string, updateData: UpdateTeamMembersRequest): Promise<UpdateTeamMembersResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/teams/${teamId}/members`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to update team members: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('updateTeamMembers error:', error)
    throw error
  }
}

export type DeleteTeamResponse = {
  success: boolean
  message: string
  error?: string
}

export async function deleteTeam(teamId: string): Promise<DeleteTeamResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to delete team: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('deleteTeam error:', error)
    throw error
  }
}

export type GetEmployeeTasksResponse = {
  success: boolean
  data?: {
    tasks: AssignedTask[]
    total: number
  }
  error?: string
}

export async function getEmployeeTasks(employeeId: string, status?: string): Promise<GetEmployeeTasksResponse> {
  try {
    const searchParams = new URLSearchParams()
    if (status) searchParams.append('status', status)
    
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/employee/${employeeId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    const res = await fetch(url, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to get employee tasks: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getEmployeeTasks error:', error)
    throw error
  }
}

// Export Functions
export type ExportParams = {
  dateFrom?: string
  dateTo?: string
  date?: string
  employeeId?: string
  status?: string
}

export async function exportAttendanceToExcel(params?: ExportParams): Promise<void> {
  try {
    const searchParams = new URLSearchParams()
    
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
    if (params?.date) searchParams.append('date', params.date)
    if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
    if (params?.status) searchParams.append('status', params.status)

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/export/excel${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    // Create a temporary link to trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('exportAttendanceToExcel error:', error)
    throw error
  }
}

export async function exportAttendanceToPDF(params?: ExportParams): Promise<void> {
  try {
    const searchParams = new URLSearchParams()
    
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
    if (params?.date) searchParams.append('date', params.date)
    if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
    if (params?.status) searchParams.append('status', params.status)

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/export/pdf${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    // Create a temporary link to trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('exportAttendanceToPDF error:', error)
    throw error
  }
}

// Vehicle Management Types
export type Vehicle = {
  id: string
  vehicleNumber: string
  make: string
  model: string
  year?: number
  type: 'CAR' | 'BIKE' | 'TRUCK' | 'VAN'
  status: 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'OUT_OF_SERVICE'
  assignedTo?: string
  assignedAt?: string
  createdAt: string
  updatedAt: string
  employeeName?: string
  employeeId?: string
}

export type PetrolBill = {
  id: string
  vehicleId: string
  employeeId: string
  amount: number
  date: string
  imageUrl?: string
  description?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  employeeName?: string
  employeeIdNumber?: string
  vehicleNumber?: string
}

export type GetVehiclesResponse = {
  success: boolean
  data?: Vehicle[]
  error?: string
}

export type GetVehicleResponse = {
  success: boolean
  data?: Vehicle & {
    petrolBills?: PetrolBill[]
  }
  error?: string
}

export type CreateVehicleRequest = {
  vehicleNumber: string
  make: string
  model: string
  year?: number
  type: 'CAR' | 'BIKE' | 'TRUCK' | 'VAN'
}

export type CreateVehicleResponse = {
  success: boolean
  data?: Vehicle
  message?: string
  error?: string
}

export type AssignVehicleRequest = {
  employeeId: string
}

export type AssignVehicleResponse = {
  success: boolean
  data?: Vehicle
  message?: string
  error?: string
}

export type GetPetrolBillsResponse = {
  success: boolean
  data?: PetrolBill[]
  error?: string
}

export type CreatePetrolBillRequest = {
  vehicleId: string
  amount: number
  date: string
  imageUrl?: string
  description?: string
}

export type CreatePetrolBillResponse = {
  success: boolean
  data?: PetrolBill
  message?: string
  error?: string
}

export type ApprovePetrolBillRequest = {
  status: 'APPROVED' | 'REJECTED'
}

export type ApprovePetrolBillResponse = {
  success: boolean
  data?: PetrolBill
  message?: string
  error?: string
}

// Vehicle Management API Functions
export async function getAllVehicles(params?: {
  status?: string
  assignedTo?: string
  type?: string
}): Promise<GetVehiclesResponse> {
  try {
    const searchParams = new URLSearchParams()
    
    if (params?.status) searchParams.append('status', params.status)
    if (params?.assignedTo) searchParams.append('assignedTo', params.assignedTo)
    if (params?.type) searchParams.append('type', params.type)

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    const res = await fetch(url, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to get vehicles: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getAllVehicles error:', error)
    throw error
  }
}

export async function getVehicleById(vehicleId: string): Promise<GetVehicleResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles/${vehicleId}`, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to get vehicle: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getVehicleById error:', error)
    throw error
  }
}

export async function createVehicle(vehicle: CreateVehicleRequest): Promise<CreateVehicleResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vehicle),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to create vehicle: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('createVehicle error:', error)
    throw error
  }
}

export async function assignVehicle(vehicleId: string, data: AssignVehicleRequest): Promise<AssignVehicleResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles/${vehicleId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to assign vehicle: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('assignVehicle error:', error)
    throw error
  }
}

export async function unassignVehicle(vehicleId: string): Promise<AssignVehicleResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles/${vehicleId}/unassign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to unassign vehicle: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('unassignVehicle error:', error)
    throw error
  }
}

export async function getEmployeeVehicle(employeeId: string): Promise<GetVehicleResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles/employee/${employeeId}`, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to get employee vehicle: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getEmployeeVehicle error:', error)
    throw error
  }
}

export async function getAllPetrolBills(params?: {
  status?: string
  employeeId?: string
  vehicleId?: string
}): Promise<GetPetrolBillsResponse> {
  try {
    const searchParams = new URLSearchParams()
    
    if (params?.status) searchParams.append('status', params.status)
    if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
    if (params?.vehicleId) searchParams.append('vehicleId', params.vehicleId)

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/petrol-bills${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    const res = await fetch(url, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to get petrol bills: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getAllPetrolBills error:', error)
    throw error
  }
}

export async function createPetrolBill(bill: CreatePetrolBillRequest): Promise<CreatePetrolBillResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/petrol-bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bill),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to create petrol bill: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('createPetrolBill error:', error)
    throw error
  }
}

export async function approvePetrolBill(billId: string, data: ApprovePetrolBillRequest): Promise<ApprovePetrolBillResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/petrol-bills/${billId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to approve petrol bill: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('approvePetrolBill error:', error)
    throw error
  }
}