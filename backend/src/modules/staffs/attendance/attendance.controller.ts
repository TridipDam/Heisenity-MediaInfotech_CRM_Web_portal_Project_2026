// controllers/attendance.controller.ts
import { Request, Response } from 'express'
import { prisma } from '@/lib/prisma'
import { getDeviceInfo } from '@/utils/deviceinfo'
import { getHumanReadableLocation, getCoordinatesFromMapMyIndia } from '@/utils/geolocation'
import { createAttendanceRecord, getRemainingAttempts, getTodayAssignedLocation } from './attendance.service'
import { GeolocationCoordinates } from './attendance.types'

export const getAttendanceRecords = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      date,
      dateFrom,
      dateTo,
      employeeId,
      status
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    if (employeeId) {
      // Find employee by employeeId first
      const employee = await prisma.employee.findUnique({
        where: { employeeId: employeeId as string }
      })
      if (employee) {
        where.employeeId = employee.id
      } else {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        })
      }
    }

    if (status) {
      where.status = status
    }

    if (date) {
      const targetDate = new Date(date as string)
      targetDate.setHours(0, 0, 0, 0)
      where.date = targetDate
    } else if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string)
        fromDate.setHours(0, 0, 0, 0)
        where.date.gte = fromDate
      }
      if (dateTo) {
        const toDate = new Date(dateTo as string)
        toDate.setHours(23, 59, 59, 999)
        where.date.lte = toDate
      }
    }

    // Get total count for pagination
    const total = await prisma.attendance.count({ where })

    // Get attendance records with employee details
    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            email: true,
            phone: true,
            teamId: true,
            isTeamLeader: true,
            role: true
          }
        },
        assignedTask: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            location: true,
            startTime: true,
            endTime: true,
            assignedBy: true,
            assignedAt: true,
            status: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limitNum
    })

    // Transform the data to match frontend expectations
    const records = attendances.map(attendance => ({
      id: attendance.id,
      employeeId: attendance.employee.employeeId,
      employeeName: attendance.employee.name,
      email: attendance.employee.email,
      phone: attendance.employee.phone,
      teamId: attendance.employee.teamId,
      isTeamLeader: attendance.employee.isTeamLeader,
      role: attendance.employee.role,
      date: attendance.date.toISOString().split('T')[0],
      clockIn: attendance.clockIn?.toISOString(),
      clockOut: attendance.clockOut?.toISOString(),
      status: attendance.status,
      source: attendance.source,
      location: attendance.location,
      latitude: attendance.latitude ? Number(attendance.latitude) : undefined,
      longitude: attendance.longitude ? Number(attendance.longitude) : undefined,
      ipAddress: attendance.ipAddress,
      deviceInfo: attendance.deviceInfo,
      photo: attendance.photo,
      locked: attendance.locked,
      lockedReason: attendance.lockedReason,
      attemptCount: attendance.attemptCount,
      taskStartTime: attendance.taskStartTime,
      taskEndTime: attendance.taskEndTime,
      taskLocation: attendance.taskLocation,
      createdAt: attendance.createdAt.toISOString(),
      updatedAt: attendance.updatedAt.toISOString(),
      assignedTask: attendance.assignedTask ? {
        id: attendance.assignedTask.id,
        title: attendance.assignedTask.title,
        description: attendance.assignedTask.description,
        category: attendance.assignedTask.category,
        location: attendance.assignedTask.location,
        startTime: attendance.assignedTask.startTime,
        endTime: attendance.assignedTask.endTime,
        assignedBy: attendance.assignedTask.assignedBy,
        assignedAt: attendance.assignedTask.assignedAt.toISOString(),
        status: attendance.assignedTask.status
      } : undefined
    }))

    const totalPages = Math.ceil(total / limitNum)

    return res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      }
    })
  } catch (error) {
    console.error({ event: 'get_attendance_records_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to get attendance records' })
  }
}

export const checkRemainingAttempts = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' })
    }

    const result = await getRemainingAttempts(employeeId)

    return res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error({ event: 'check_remaining_attempts_error', error: error instanceof Error ? error.message : error })

    let errorMessage = 'Failed to check remaining attempts'
    let statusCode = 500

    if (error instanceof Error && error.message === 'EMPLOYEE_NOT_FOUND') {
      statusCode = 404
      errorMessage = 'Employee not found'
    }

    return res.status(statusCode).json({ success: false, error: errorMessage })
  }
}

export const getAssignedLocation = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' })
    }

    const assignedLocation = await getTodayAssignedLocation(employeeId)

    if (!assignedLocation) {
      return res.status(404).json({
        success: false,
        error: 'No assigned location found for today'
      })
    }

    // Convert Decimal to number for JSON response
    const response = {
      success: true,
      data: {
        id: assignedLocation.id,
        latitude: Number(assignedLocation.latitude),
        longitude: Number(assignedLocation.longitude),
        radius: assignedLocation.radius,
        address: assignedLocation.address,
        city: assignedLocation.city,
        state: assignedLocation.state,
        startTime: assignedLocation.startTime.toISOString(),
        endTime: assignedLocation.endTime.toISOString(),
        assignedBy: assignedLocation.assignedBy
      }
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error({ event: 'get_assigned_location_error', error: error instanceof Error ? error.message : error })

    let errorMessage = 'Failed to get assigned location'
    let statusCode = 500

    if (error instanceof Error && error.message === 'EMPLOYEE_NOT_FOUND') {
      statusCode = 404
      errorMessage = 'Employee not found'
    }

    return res.status(statusCode).json({ success: false, error: errorMessage })
  }
}

export const getLocationData = async (req: Request, res: Response) => {
  try {
    let latitude: number, longitude: number

    // Handle different ways of receiving coordinates
    if (req.method === 'GET') {
      // From query parameters or URL parameters
      const lat = req.query.latitude || req.params.latitude
      const lng = req.query.longitude || req.params.longitude

      if (!lat || !lng) {
        return res.status(400).json({ success: false, error: 'Latitude and longitude are required' })
      }

      latitude = parseFloat(lat as string)
      longitude = parseFloat(lng as string)
    } else if (req.method === 'POST') {
      // From request body
      latitude = req.body.latitude
      longitude = req.body.longitude
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates provided' })
    }

    const coordinates = { latitude, longitude }

    // Get location data using geolocation utility (reverse geocoding)
    const humanReadableLocation = await getHumanReadableLocation(coordinates)

    // For locationData, we can use the coordinates string format for forward geocoding if needed
    const coordinatesString = `${latitude},${longitude}`
    const locationData = await getCoordinatesFromMapMyIndia(coordinatesString)

    const response = {
      success: true,
      coordinates,
      location: locationData || {
        address: '',
        city: '',
        state: ''
      },
      humanReadableLocation,
      timestamp: new Date().toISOString()
    }

    return res.status(200).json(response)
  } catch (error) {
    console.error({ event: 'get_location_data_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to get location data' })
  }
}

export const detectDevice = async (req: Request, res: Response) => {
  try {
    const userAgent = req.headers['user-agent'] || ''
    const device = getDeviceInfo(userAgent)

    return res.status(200).json({ success: true, device })
  } catch (error) {
    console.error({ event: 'detect_device_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to detect device info' })
  }
}

export const deleteAttendanceRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ success: false, error: 'Attendance record ID is required' })
    }

    // Check if the attendance record exists
    const existingRecord = await prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true
          }
        }
      }
    })

    if (!existingRecord) {
      return res.status(404).json({ success: false, error: 'Attendance record not found' })
    }

    // Delete all attendance records for this employee
    await prisma.attendance.delete({
      where: { id }
    })

    // Delete the employee from employee table
    await prisma.employee.delete({
      where: { id: existingRecord.employeeId }
    })


    return res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    })
  } catch (error) {
    console.error({ event: 'delete_attendance_record_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to delete attendance record' })
  }
}

export const createAttendance = async (req: Request, res: Response) => {
  try {
    const { employeeId, latitude, longitude, photo, status = 'PRESENT', location, bypassLocationValidation, action } = req.body

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' })
    }

    // Validate action parameter
    if (action && !['check-in', 'check-out', 'task-checkout'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action. Must be "check-in", "check-out", or "task-checkout"' })
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || ''

    let coordinates: GeolocationCoordinates | undefined
    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ success: false, error: 'Invalid coordinates provided' })
      }

      // Never accept 0,0 as valid user-provided coordinates (placeholder).
      const isZeroZero = lat === 0 && lng === 0
      const isAdminEntry = !!location || (bypassLocationValidation === true || bypassLocationValidation === 'true')
      if (isZeroZero && !isAdminEntry) {
        return res.status(400).json({ success: false, error: 'Invalid coordinates: placeholder coordinates (0,0) are not allowed' })
      }

      coordinates = { latitude: lat, longitude: lng }
    }

    console.info({ event: 'create_attendance_request', employeeId, hasCoordinates: !!coordinates, ipAddress, action })

    // Call service (service handles atomic attempts and validation)
    const attendance = await createAttendanceRecord({
      employeeId,
      coordinates,
      ipAddress,
      userAgent,
      photo,
      status: status as 'PRESENT' | 'LATE',
      locationText: location,
      bypassLocationValidation: bypassLocationValidation === true || bypassLocationValidation === 'true',
      action: action as 'check-in' | 'check-out' | 'task-checkout' | undefined
    })

    return res.status(201).json({ success: true, message: 'Attendance recorded successfully', data: attendance })
  } catch (error) {
    console.error({ event: 'create_attendance_error', error: error instanceof Error ? error.message : error })
    // Provide structured error codes where possible
    let errorMessage = 'Failed to create attendance record'
    let statusCode = 500
    if (error instanceof Error) {
      if ((error as any).message === 'EMPLOYEE_NOT_FOUND') {
        statusCode = 404
        errorMessage = 'Employee not found'
      } else if ((error as any).message === 'INVALID_COORDINATES' || (error as any).message === 'MISSING_COORDINATES') {
        statusCode = 400
        errorMessage = 'Invalid or missing coordinates'
      } else if ((error as any).message === 'MAX_ATTEMPTS_EXCEEDED' || (error as any).code === 'MAX_ATTEMPTS_EXCEEDED') {
        statusCode = 403
        errorMessage = error.message
      } else {
        errorMessage = error.message
      }
    }
    return res.status(statusCode).json({ success: false, error: errorMessage })
  }
}
