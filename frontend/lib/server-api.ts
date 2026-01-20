// lib/server-api.ts
// Client-side API functions (no server-only imports)

export type CreateAttendanceRequest = {
    employeeId: string
    latitude?: number
    longitude?: number
    photo?: string
    status?: 'PRESENT' | 'LATE'
    location?: string // Add location text field
    action?: 'check-in' | 'check-out' | 'task-checkout' // Add task-checkout action
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

export type RemainingAttemptsResponse = {
  success: boolean
  data: {
    remainingAttempts: number
    isLocked: boolean
    status?: string
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

export async function dayClockOut(employeeId: string): Promise<{ success: boolean; message: string; data?: { clockOut: string }; error?: string }> {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/day-clock-out`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ employeeId }),
            cache: 'no-store'
        })

        const response = await res.json()

        if (!res.ok) {
            throw new Error(response.error || response.message || `Failed to clock out: ${res.status}`)
        }

        return response
    } catch (error) {
        console.error('dayClockOut error:', error)
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

export async function getDeviceInfo(): Promise<DeviceInfo> {
    try {
        // Generate device info on client side
        const userAgent = navigator.userAgent
        
        // Simple browser detection
        let browser = 'Unknown'
        if (userAgent.includes('Chrome')) browser = 'Chrome'
        else if (userAgent.includes('Firefox')) browser = 'Firefox'
        else if (userAgent.includes('Safari')) browser = 'Safari'
        else if (userAgent.includes('Edge')) browser = 'Edge'
        
        // Simple OS detection
        let os = 'Unknown'
        if (userAgent.includes('Windows')) os = 'Windows'
        else if (userAgent.includes('Mac')) os = 'macOS'
        else if (userAgent.includes('Linux')) os = 'Linux'
        else if (userAgent.includes('Android')) os = 'Android'
        else if (userAgent.includes('iOS')) os = 'iOS'
        
        // Simple device detection
        let device = 'Desktop'
        if (userAgent.includes('Mobile')) device = 'Mobile'
        else if (userAgent.includes('Tablet')) device = 'Tablet'
        
        return {
            browser,
            os,
            device
        }
    } catch (error) {
        console.error('getDeviceInfo error:', error)
        // Return fallback device info
        return {
            browser: 'Unknown',
            os: 'Unknown',
            device: 'Unknown'
        }
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
    approvalStatus?: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'
    approvedBy?: string
    approvedAt?: string
    rejectedBy?: string
    rejectedAt?: string
    approvalReason?: string
    createdAt: string
    updatedAt: string
    workedHours?: string
    overtime?: string
}

export type AssignedTask = {
    id: string
    title: string
    description: string
    category?: string
    location?: string
    checkIn?: string        // Actual check-in time
    checkOut?: string       // Actual check-out time
    assignedBy: string
    assignedAt: string
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    relatedTicketId?: string
}

export type CreateTaskRequest = {
    employeeId?: string
    teamId?: string
    title: string
    description: string
    category?: string
    location?: string
    ticketId?: string
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
    role?: string
}): Promise<GetAttendanceResponse> {
    try {
        const searchParams = new URLSearchParams()
        
        if (params?.page) searchParams.append('page', params.page.toString())
        if (params?.limit) searchParams.append('limit', params.limit.toString())
        if (params?.date) searchParams.append('date', params.date)
        if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
        if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
        if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
        if (params?.status) searchParams.append('status', params.status)
        if (params?.role) searchParams.append('role', params.role)

        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
        
        console.log('Fetching attendance records from:', url)
        
        const res = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        })

        const response = await res.json()
        
        console.log('Attendance records response:', response)

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

// Employee ID Generator API Functions (Legacy - using new endpoint now)
// export async function generateNextEmployeeId(): Promise<GenerateEmployeeIdResponse> {
//   try {
//     const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employee-id/generate`, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     })

//     const data = await response.json()
//     console.log('Generate ID response:', data)
//     return data
//   } catch (error) {
//     console.error('Error generating employee ID:', error)
//     return {
//       success: false,
//       message: 'Failed to generate employee ID',
//       error: error instanceof Error ? error.message : 'Unknown error'
//     }
//   }
// }

export async function checkEmployeeIdAvailability(employeeId: string): Promise<CheckEmployeeIdAvailabilityResponse> {
  // For now, just return available since the backend validation happens during creation
  return {
    success: true,
    message: 'Available',
    data: { employeeId, available: true }
  }
}

export async function getNextAvailableEmployeeIds(count: number = 5): Promise<GetNextAvailableIdsResponse> {
  // For now, return empty array since the component has fallback logic
  return {
    success: false,
    message: 'Using fallback method',
    error: 'Backend preview not available'
  }
}

export async function validateEmployeeIdFormat(employeeId: string): Promise<ValidateEmployeeIdResponse> {
  // Client-side validation for role-based IDs
  const patterns = {
    FIELD_ENGINEER: /^FE\d{3}$/,
    IN_OFFICE: /^IO\d{3}$/,
    LEGACY: /^EMP\d{3}$/
  }
  
  const isValid = Object.values(patterns).some(pattern => pattern.test(employeeId))
  
  return {
    success: true,
    message: isValid ? 'Valid format' : 'Invalid format',
    data: { employeeId, valid: isValid }
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
  salary?: number
  address?: string
  aadharCard?: string
  panCard?: string
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
  role?: string
  sickLeaveBalance?: number
  casualLeaveBalance?: number
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
  role?: 'FIELD_ENGINEER' | 'IN_OFFICE'
  sickLeaveBalance?: number
  casualLeaveBalance?: number
  salary?: number
  address?: string
  aadharCard?: string
  panCard?: string
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
  sickLeaveBalance?: number
  casualLeaveBalance?: number
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
    role?: string
  }
  error?: string
}

// Employee Management API Functions
export async function getAllEmployees(params?: {
  page?: number
  limit?: number
  search?: string
  status?: string
  role?: string
}): Promise<GetEmployeesResponse> {
  try {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.role) searchParams.append('role', params.role)

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

export async function getNextEmployeeId(role: 'FIELD_ENGINEER' | 'IN_OFFICE' = 'IN_OFFICE'): Promise<GetNextEmployeeIdResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees/next-id?role=${role}`, {
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

export type UpdateTeamRequest = {
  name?: string
  description?: string
}

export type UpdateTeamResponse = {
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

export async function updateTeam(teamId: string, updateData: UpdateTeamRequest): Promise<UpdateTeamResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to update team: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('updateTeam error:', error)
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

export type GetAllTasksResponse = {
  success: boolean
  data?: {
    tasks: Array<{
      id: string
      employeeId: string
      employeeName: string
      employeeEmail: string
      title: string
      description: string
      category?: string
      location?: string
      startTime?: string
      endTime?: string
      assignedBy: string
      assignedAt: string
      status: string
      createdAt: string
      updatedAt: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
}

export async function getAllTasks(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<GetAllTasksResponse> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response: GetAllTasksResponse = await res.json()
    
    if (!res.ok) {
      throw new Error(response.error || 'Failed to get tasks')
    }

    return response
  } catch (error) {
    console.error('getAllTasks error:', error)
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
  role?: string
  quickRange?: 'yesterday' | '15days' | '30days' // Quick date range options
}

export async function exportAttendanceToExcel(params?: ExportParams, token?: string): Promise<void> {
  try {
    let authToken: string | undefined = token;
    
    // If no token provided, try to get it from session
    if (!authToken) {
      authToken = await getSessionToken() || undefined;
    }
    
    if (!authToken) {
      throw new Error('No authentication token available')
    }

    const searchParams = new URLSearchParams()
    
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
    if (params?.date) searchParams.append('date', params.date)
    if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.role) searchParams.append('role', params.role)
    if (params?.quickRange) searchParams.append('quickRange', params.quickRange)

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/export/excel${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    // Use fetch with authentication
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`)
    }

    // Get the blob from response
    const blob = await response.blob()
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the blob URL
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('exportAttendanceToExcel error:', error)
    throw error
  }
}

export async function exportTasksToExcel(params?: ExportParams, token?: string): Promise<void> {
  try {
    let authToken: string | undefined = token;
    
    // If no token provided, try to get it from session
    if (!authToken) {
      authToken = await getSessionToken() || undefined;
    }
    
    if (!authToken) {
      throw new Error('No authentication token available')
    }

    const searchParams = new URLSearchParams()
    
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
    if (params?.date) searchParams.append('date', params.date)
    if (params?.employeeId) searchParams.append('employeeId', params.employeeId)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.role) searchParams.append('role', params.role)
    if (params?.quickRange) searchParams.append('quickRange', params.quickRange)

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/export/excel${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    // Use fetch with authentication
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`)
    }

    // Get the blob from response
    const blob = await response.blob()
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `task-management-report-${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the blob URL
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('exportTasksToExcel error:', error)
    throw error
  }
}

export async function exportCustomersToExcel(params?: { search?: string; status?: string; dateFrom?: string; dateTo?: string; quickRange?: 'yesterday' | '15days' | '30days' }, token?: string): Promise<void> {
  try {
    let authToken: string | undefined = token;
    
    // If no token provided, try to get it from session
    if (!authToken) {
      authToken = await getSessionToken() || undefined;
    }
    
    if (!authToken) {
      throw new Error('No authentication token available')
    }

    const searchParams = new URLSearchParams()
    
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
    if (params?.quickRange) searchParams.append('quickRange', params.quickRange)

    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/customers/export/excel${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    // Use fetch with authentication
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`)
    }

    // Get the blob from response
    const blob = await response.blob()
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `customers-export-${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the blob URL
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('exportCustomersToExcel error:', error)
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
  status: 'AVAILABLE' | 'ASSIGNED'
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

export type DeleteVehicleResponse = {
  success: boolean
  message?: string
  error?: string
}

export async function deleteVehicle(vehicleId: string): Promise<DeleteVehicleResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || 'Failed to delete vehicle')
    }

    return response
  } catch (error) {
    console.error('deleteVehicle error:', error)
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
// Complete a task (updates task end time without affecting attendance clock out)
export async function completeTask(taskId: string, employeeId: string): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employeeId }),
      cache: 'no-store'
    })
    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to complete task: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('completeTask error:', error)
    throw error
  }
}

// Admin Notification Types
export type AdminNotification = {
  id: string
  type: 'VEHICLE_UNASSIGNED' | 'TASK_COMPLETED' | 'ATTENDANCE_ALERT'
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export type GetAdminNotificationsResponse = {
  success: boolean
  data?: AdminNotification[]
  error?: string
}

export type GetUnreadCountResponse = {
  success: boolean
  data?: { count: number }
  error?: string
}

export type NotificationActionResponse = {
  success: boolean
  message?: string
  error?: string
}

// Admin Notification API Functions
export async function getAdminNotifications(params?: {
  isRead?: boolean
  type?: string
  limit?: number
}): Promise<GetAdminNotificationsResponse> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.isRead !== undefined) searchParams.append('isRead', params.isRead.toString())
    if (params?.type) searchParams.append('type', params.type)
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return await res.json()
  } catch (error) {
    console.error('Error fetching admin notifications:', error)
    return {
      success: false,
      error: 'Failed to fetch notifications'
    }
  }
}

export async function getUnreadNotificationCount(): Promise<GetUnreadCountResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/unread-count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return await res.json()
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return {
      success: false,
      error: 'Failed to fetch unread count'
    }
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<NotificationActionResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return await res.json()
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return {
      success: false,
      error: 'Failed to mark notification as read'
    }
  }
}

export async function markAllNotificationsAsRead(): Promise<NotificationActionResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return await res.json()
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return {
      success: false,
      error: 'Failed to mark all notifications as read'
    }
  }
}

export async function deleteNotification(notificationId: string): Promise<NotificationActionResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return await res.json()
  } catch (error) {
    console.error('Error deleting notification:', error)
    return {
      success: false,
      error: 'Failed to delete notification'
    }
  }
}

export async function getEmployeeByEmployeeId(employeeId: string): Promise<{ success: boolean; data?: Employee; error?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees/by-employee-id/${employeeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    const response = await res.json()
    return response
  } catch (error) {
    console.error('getEmployeeByEmployeeId error:', error)
    return {
      success: false,
      error: 'Failed to get employee details'
    }
  }
}


// Feature Access API Functions
export type StaffPortalFeature = 'DASHBOARD' | 'PROJECT' | 'TASK_MANAGEMENT' | 'CUSTOMERS' | 'TEAMS' | 'TENDERS' | 'STOCK' | 'LEAVE_MANAGEMENT' | 'FIELD_ENGINEER_ATTENDANCE' | 'INOFFICE_ATTENDANCE' | 'CUSTOMER_SUPPORT_REQUESTS' | 'STAFF_FEATURE_ACCESS'

export type GetMyFeaturesResponse = {
  success: boolean
  data?: {
    allowedFeatures: StaffPortalFeature[]
  }
  error?: string
}

export type GetAllStaffFeatureAccessResponse = {
  success: boolean
  data?: Array<{
    id: string
    employeeId: string
    name: string
    email: string
    role: string
    features: Record<StaffPortalFeature, boolean>
  }>
  error?: string
}

export type UpdateFeatureAccessRequest = {
  features: Array<{
    feature: StaffPortalFeature
    isAllowed: boolean
  }>
}

export type UpdateFeatureAccessResponse = {
  success: boolean
  message: string
  error?: string
}

/**
 * Get session token from NextAuth session
 */
async function getSessionToken(): Promise<string | null> {
  try {
    const { getSession } = await import('next-auth/react')
    const session = await getSession()
    return (session?.user as any)?.sessionToken || null
  } catch (error) {
    console.error('Error getting session token:', error)
    return null
  }
}

/**
 * Get allowed features for the logged-in staff member
 */
export async function getMyFeatures(): Promise<GetMyFeaturesResponse> {
  try {
    const token = await getSessionToken()
    if (!token) {
      return {
        success: false,
        error: 'Not authenticated'
      }
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/feature-access/my-features`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    })

    const response = await res.json()
    return response
  } catch (error) {
    console.error('getMyFeatures error:', error)
    return {
      success: false,
      error: 'Failed to get allowed features'
    }
  }
}

/**
 * Get all staff with their feature access (Admin only)
 */
export async function getAllStaffFeatureAccess(): Promise<GetAllStaffFeatureAccessResponse> {
  try {
    const token = await getSessionToken()
    if (!token) {
      return {
        success: false,
        error: 'Not authenticated'
      }
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/feature-access/staff`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    })

    const response = await res.json()
    return response
  } catch (error) {
    console.error('getAllStaffFeatureAccess error:', error)
    return {
      success: false,
      error: 'Failed to get staff feature access'
    }
  }
}

/**
 * Update feature access for a staff member (Admin only)
 */
export async function updateStaffFeatureAccess(
  employeeId: string,
  data: UpdateFeatureAccessRequest
): Promise<UpdateFeatureAccessResponse> {
  try {
    const token = await getSessionToken()
    if (!token) {
      return {
        success: false,
        message: '',
        error: 'Not authenticated'
      }
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/feature-access/staff/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    })

    const response = await res.json()
    return response
  } catch (error) {
    console.error('updateStaffFeatureAccess error:', error)
    return {
      success: false,
      message: '',
      error: 'Failed to update feature access'
    }
  }
}

// =============================================================================
// TASK CHECK-IN/CHECK-OUT API FUNCTIONS
// =============================================================================

export type TaskCheckInRequest = {
  employeeId: string
  taskId: string
  photo?: string
  location?: string
}

export type TaskCheckOutRequest = {
  employeeId: string
  taskId: string
}

export type TaskStatusResponse = {
  success: boolean
  message?: string
  data?: {
    hasActiveTask: boolean
    currentTask: AssignedTask | null
    taskStartTime: string | null
    taskEndTime: string | null
  }
}

export type TaskAttendanceResponse = {
  success: boolean
  message: string
  data?: {
    taskId: string
    taskStartTime?: string
    taskEndTime?: string
    taskStatus: string
  }
}

export async function taskCheckIn(data: TaskCheckInRequest): Promise<TaskAttendanceResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || response.message || `Failed to check in to task: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('taskCheckIn error:', error)
    throw error
  }
}

export async function taskCheckOut(data: TaskCheckOutRequest): Promise<TaskAttendanceResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || response.message || `Failed to check out from task: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('taskCheckOut error:', error)
    throw error
  }
}

export async function getTaskStatus(employeeId: string): Promise<TaskStatusResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tasks/status/${employeeId}`, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || response.message || `Failed to get task status: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getTaskStatus error:', error)
    throw error
  }
}

// =============================================================================
// DAILY CLOCK-IN/CLOCK-OUT API FUNCTIONS
// =============================================================================

export type DailyClockInRequest = {
  employeeId: string
  photo?: string
  locationText?: string
}

export type DailyClockOutRequest = {
  employeeId: string
}

export type DailyAttendanceResponse = {
  success: boolean
  message: string
  data?: {
    attendanceId: string
    clockIn?: string
    clockOut?: string
    approvalStatus: string
    needsApproval: boolean
  }
}

export type DailyAttendanceStatusResponse = {
  success: boolean
  message?: string
  data?: {
    hasAttendance: boolean
    clockIn: string | null
    clockOut: string | null
    approvalStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'
    needsApproval: boolean
    isPendingApproval: boolean
    canClockOut: boolean
    workHours: string | null
    approvalReason: string | null
    rejectedBy: string | null
    rejectedAt: string | null
  }
}

export async function dailyClockIn(data: DailyClockInRequest): Promise<DailyAttendanceResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/clock-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || response.message || `Failed to clock in: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('dailyClockIn error:', error)
    throw error
  }
}

export async function dailyClockOut(data: DailyClockOutRequest): Promise<DailyAttendanceResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/clock-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || response.message || `Failed to clock out: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('dailyClockOut error:', error)
    throw error
  }
}

export async function getDailyAttendanceStatus(employeeId: string): Promise<DailyAttendanceStatusResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/daily-status/${employeeId}`, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || response.message || `Failed to get daily attendance status: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getDailyAttendanceStatus error:', error)
    throw error
  }
}

// =============================================================================
// TICKET MANAGEMENT API FUNCTIONS
// =============================================================================

export type TicketCategory = 'AUTHENTICATION' | 'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'SECURITY' | 'DATABASE' | 'MAINTENANCE' | 'SETUP' | 'OTHER'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED'

export type Ticket = {
  id: string
  ticketId: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  department?: string
  assigneeId?: string
  reporterId: string
  dueDate?: string
  estimatedHours?: number
  tags?: string[]
  customerName?: string
  customerId?: string
  customerPhone?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  closedAt?: string
  assignee?: {
    id: string
    name: string
    employeeId: string
    email: string
  }
  reporter?: {
    id: string
    name: string
    employeeId: string
    email: string
  }
}

export type GetTicketsResponse = {
  success: boolean
  data?: Ticket[]
  error?: string
}

export type GetTicketResponse = {
  success: boolean
  data?: Ticket
  error?: string
}

export async function getAllTickets(params?: {
  status?: TicketStatus
  priority?: TicketPriority
  category?: TicketCategory
  search?: string
  limit?: number
}): Promise<GetTicketsResponse> {
  try {
    const token = await getSessionToken()
    if (!token) {
      return {
        success: false,
        error: 'Not authenticated'
      }
    }

    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.priority) searchParams.append('priority', params.priority)
    if (params?.category) searchParams.append('category', params.category)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tickets?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to fetch tickets: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getAllTickets error:', error)
    return {
      success: false,
      error: 'Failed to fetch tickets'
    }
  }
}

export async function getTicketById(ticketId: string): Promise<GetTicketResponse> {
  try {
    const token = await getSessionToken()
    if (!token) {
      return {
        success: false,
        error: 'Not authenticated'
      }
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tickets/${ticketId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to fetch ticket: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getTicketById error:', error)
    return {
      success: false,
      error: 'Failed to fetch ticket'
    }
  }
}

// =============================================================================
// DATABASE STATS API FUNCTIONS
// =============================================================================

export type DatabaseStats = {
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

export type GetDatabaseStatsResponse = {
  success: boolean
  data?: DatabaseStats
  error?: string
}

export async function getDatabaseStats(): Promise<GetDatabaseStatsResponse> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/database/stats`, {
      cache: 'no-store'
    })

    const response = await res.json()

    if (!res.ok) {
      throw new Error(response.error || `Failed to get database stats: ${res.status}`)
    }

    return response
  } catch (error) {
    console.error('getDatabaseStats error:', error)
    return {
      success: false,
      error: 'Failed to fetch database statistics'
    }
  }
}