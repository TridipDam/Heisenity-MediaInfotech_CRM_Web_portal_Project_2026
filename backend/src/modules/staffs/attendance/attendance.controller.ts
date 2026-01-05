// controllers/attendance.controller.ts
import { Request, Response } from 'express'
import { getDeviceInfo } from '@/utils/deviceinfo'
import { getHumanReadableLocation, getLocationFromCoordinates } from '@/utils/geolocation'
import { createAttendanceRecord } from './attendance.service'
import { GeolocationCoordinates } from './attendance.types'

export const createAttendance = async (req: Request, res: Response) => {
  try {
    const { employeeId, latitude, longitude, photo, status = 'PRESENT' } = req.body

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
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      
      // Validate coordinates
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
          status: status as 'PRESENT' | 'LATE'
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