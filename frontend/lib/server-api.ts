// lib/server-api.ts
// Client-side API functions (no server-only imports)

export type CreateAttendanceRequest = {
    employeeId: string
    latitude?: number
    longitude?: number
    photo?: string
    status?: 'PRESENT' | 'LATE'
    location?: string // Add location text field
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
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'MARKDOWN'
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
    employeeId: string
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
    data?: AssignedTask
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