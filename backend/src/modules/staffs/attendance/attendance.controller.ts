// controllers/attendance.controller.ts
import { Request, Response } from 'express'
import { getDeviceInfo } from '@/utils/deviceinfo'
import { getHumanReadableLocation, getLocationFromCoordinates } from '@/utils/geolocation'
import { createAttendanceRecord } from './attendance.service'
import { GeolocationCoordinates } from './attendance.types'

export const createAttendance = async (req: Request, res: Response) => {
  try {
    const { employeeId, latitude, longitude, photo, status = 'PRESENT', location } = req.body

    // Validate required fields
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      })
    }

    // Get IP address and user agent
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown' 
    const userAgent = req.headers['user-agent'] || ''

    // Prepare coordinates if provided
    let coordinates: GeolocationCoordinates | undefined
    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      
      // Validate coordinates (allow 0,0 for admin entries)
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          error: 'Invalid coordinates provided'
        })
      }
      
      coordinates = { latitude: lat, longitude: lng }
    }

    console.log('Creating attendance record for employee:', employeeId)

    // Create attendance record with retry logic
    let attendance
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        attendance = await createAttendanceRecord({
          employeeId,
          coordinates,
          ipAddress,
          userAgent,
          photo,
          status: status as 'PRESENT' | 'LATE',
          locationText: location // Pass location text for admin entries
        })
        break // Success, exit retry loop
      } catch (error) {
        retryCount++
        console.error(`Attempt ${retryCount} failed:`, error)
        
        if (retryCount >= maxRetries) {
          throw error // Re-throw after max retries
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: attendance
    })
  } catch (error) {
    console.error('Error creating attendance:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create attendance record'
    if (error instanceof Error) {
      if (error.message.includes('pool timeout')) {
        errorMessage = 'Database connection timeout. Please try again in a moment.'
      } else if (error.message.includes('not found')) {
        errorMessage = 'Employee ID not found. Please check your employee ID.'
      } else {
        errorMessage = error.message
      }
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
}



export const detectDevice = (req: Request, res: Response) => {
  try {
    const userAgent = req.headers['user-agent'] || ''
    const device = getDeviceInfo(userAgent)

    return res.status(200).json({
      success: true,
      device
    })
  } catch (error) {
    console.error('Error getting device data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get device data'
    })
  }
}

export const getLocationData = async (req: Request, res: Response) => {
  try {
    // Priority: query > body > params
    let latitude: string | undefined
    let longitude: string | undefined

    // Check query parameters first (GET request with ?lat=x&lng=y)
    if (req.query && Object.keys(req.query).length > 0) {
      latitude = String(req.query.latitude || req.query.lat || '')
      longitude = String(req.query.longitude || req.query.lng || '')
    }

    // Check POST body
    if ((!latitude || !longitude) && req.body) {
      latitude = req.body.latitude
      longitude = req.body.longitude
    }

    // Check URL params (/location/lat/lng)
    if ((!latitude || !longitude) && req.params) {
      latitude = req.params.latitude
      longitude = req.params.longitude
    }

    console.log('Extracted coordinates:', { latitude, longitude })

    // Validate that we have coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
        example: '/api/v1/attendance/location?latitude=40.7128&longitude=-74.0060',
        received: { latitude, longitude }
      })
    }

    // Convert to numbers
    const lat = parseFloat(String(latitude))
    const lng = parseFloat(String(longitude))

    // Validate numbers
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude must be valid numbers',
        received: { latitude, longitude },
        hint: 'Make sure values are numbers between -180 and 180'
      })
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates out of range',
        hint: 'Latitude must be between -90 and 90, Longitude between -180 and 180',
        received: { latitude: lat, longitude: lng }
      })
    }

    console.log('Processing valid coordinates:', { lat, lng })

    // Get location data
    const locationData = await getLocationFromCoordinates({
      latitude: lat,
      longitude: lng
    })

    const humanReadableLocation = await getHumanReadableLocation({
      latitude: lat,
      longitude: lng
    })

    return res.status(200).json({
      success: true,
      coordinates: { latitude: lat, longitude: lng },
      location: {
        address: locationData?.address || 'Unknown Address',
        city: locationData?.city || 'Unknown City',
        state: locationData?.state || 'Unknown State'
      },
      humanReadableLocation,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error getting location data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get location data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const checkRemainingAttempts = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      })
    }

    const { getRemainingAttempts } = await import('./attendance.service')
    const attemptInfo = await getRemainingAttempts(employeeId)

    return res.status(200).json({
      success: true,
      data: attemptInfo
    })
  } catch (error) {
    console.error('Error checking remaining attempts:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check remaining attempts'
    })
  }
}

export const getAssignedLocation = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      })
    }

    const { getTodayAssignedLocation } = await import('./attendance.service')
    const assignedLocation = await getTodayAssignedLocation(employeeId)

    if (!assignedLocation) {
      return res.status(404).json({
        success: false,
        error: 'No location assigned for today. Please contact your administrator.'
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        id: assignedLocation.id,
        latitude: parseFloat(assignedLocation.latitude.toString()),
        longitude: parseFloat(assignedLocation.longitude.toString()),
        radius: assignedLocation.radius,
        address: assignedLocation.address,
        city: assignedLocation.city,
        state: assignedLocation.state,
        startTime: assignedLocation.startTime,
        endTime: assignedLocation.endTime,
        assignedBy: assignedLocation.assignedBy
      }
    })
  } catch (error) {
    console.error('Error getting assigned location:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get assigned location'
    })
  }
}

export const getAttendanceRecords = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', date, dateFrom, dateTo, employeeId, status } = req.query

    const pageNum = parseInt(page as string) || 1
    const limitNum = parseInt(limit as string) || 50
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const whereClause: any = {}
    
    // Handle date filtering with proper timezone handling
    if (dateFrom && dateTo) {
      // Date range filtering - ensure we're comparing dates only, not datetime
      const fromDateStr = dateFrom as string
      const toDateStr = dateTo as string
      
      // Create date objects for the start and end of the day range
      const fromDate = new Date(fromDateStr)
      const toDate = new Date(toDateStr)
      
      // Set to start of day for fromDate and end of day for toDate
      fromDate.setHours(0, 0, 0, 0)
      toDate.setHours(23, 59, 59, 999)
      
      whereClause.date = {
        gte: fromDate,
        lte: toDate
      }
    } else if (dateFrom) {
      // From date only
      const fromDate = new Date(dateFrom as string)
      fromDate.setHours(0, 0, 0, 0)
      whereClause.date = {
        gte: fromDate
      }
    } else if (dateTo) {
      // To date only
      const toDate = new Date(dateTo as string)
      toDate.setHours(23, 59, 59, 999)
      whereClause.date = {
        lte: toDate
      }
    } else if (date) {
      // Single date filtering (legacy support)
      const targetDate = new Date(date as string)
      targetDate.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date as string)
      endOfDay.setHours(23, 59, 59, 999)
      
      whereClause.date = {
        gte: targetDate,
        lte: endOfDay
      }
    }

    if (employeeId) {
      // Find employee by employeeId
      const { prisma } = await import('@/lib/prisma')
      const employee = await prisma.fieldEngineer.findUnique({
        where: { employeeId: employeeId as string }
      })
      if (employee) {
        whereClause.employeeId = employee.id
      } else {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        })
      }
    }

    if (status) {
      whereClause.status = status
    }

    const { prisma } = await import('@/lib/prisma')
    
    // Get attendance records with employee details and assigned tasks
    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            email: true,
            phone: true,
            teamId: true,
            isTeamLeader: true
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

    // Get total count for pagination
    const totalCount = await prisma.attendance.count({
      where: whereClause
    })

    // Format the response
    const formattedRecords = attendanceRecords.map(record => ({
      id: record.id,
      employeeId: record.employee.employeeId,
      employeeName: record.employee.name,
      email: record.employee.email,
      phone: record.employee.phone,
      teamId: record.employee.teamId,
      isTeamLeader: record.employee.isTeamLeader,
      date: record.date.toISOString().split('T')[0],
      clockIn: record.clockIn?.toISOString(),
      status: record.status,
      location: record.location,
      latitude: record.latitude ? parseFloat(record.latitude.toString()) : null,
      longitude: record.longitude ? parseFloat(record.longitude.toString()) : null,
      ipAddress: record.ipAddress,
      deviceInfo: record.deviceInfo,
      photo: record.photo,
      locked: record.locked,
      lockedReason: record.lockedReason,
      attemptCount: record.attemptCount,
      taskStartTime: record.taskStartTime,
      taskEndTime: record.taskEndTime,
      taskLocation: record.taskLocation,
      assignedTask: record.assignedTask ? {
        id: record.assignedTask.id,
        title: record.assignedTask.title,
        description: record.assignedTask.description,
        category: record.assignedTask.category,
        location: record.assignedTask.location,
        startTime: record.assignedTask.startTime,
        endTime: record.assignedTask.endTime,
        assignedBy: record.assignedTask.assignedBy,
        assignedAt: record.assignedTask.assignedAt.toISOString(),
        status: record.assignedTask.status
      } : undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    }))

    return res.status(200).json({
      success: true,
      data: {
        records: formattedRecords,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      },
      meta: {
        dateRange: {
          from: dateFrom || null,
          to: dateTo || null,
          single: date || null
        },
        filters: {
          employeeId: employeeId || null,
          status: status || null
        }
      }
    })
  } catch (error) {
    console.error('Error getting attendance records:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get attendance records'
    })
  }
}