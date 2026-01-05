import { prisma } from "@/lib/prisma";
import { AttendanceRecord, LocationData, GeolocationCoordinates } from "./attendance.types";
import { getHumanReadableLocation, getLocationFromCoordinates } from "@/utils/geolocation";
import { getDeviceInfo } from "@/utils/deviceinfo";

// Simple coordinate comparison within 50 meter radius (approximately 0.0005 degrees)
function isWithinRadius(lat1: number, lon1: number, lat2: number, lon2: number, radiusMeters: number = 50): boolean {
  // Approximate conversion: 1 degree ≈ 111,000 meters
  const radiusDegrees = radiusMeters / 111000;
  
  const latDiff = Math.abs(lat1 - lat2);
  const lonDiff = Math.abs(lon1 - lon2);
  
  return latDiff <= radiusDegrees && lonDiff <= radiusDegrees;
}

// Check if employee is within allowed location
async function validateEmployeeLocation(
  employeeId: string, 
  coordinates: GeolocationCoordinates
): Promise<{ isValid: boolean; message: string; allowedLocation?: any; currentLocation?: string }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find user
  const employee = await prisma.fieldEngineer.findUnique({
    where: { employeeId }
  });

  if (!employee) {
    return { isValid: false, message: "Employee not found" };
  }

  // Get today's assigned location for the employee
  const dailyLocation = await prisma.dailyLocation.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: today
      }
    }
  });

  if (!dailyLocation) {
    return { isValid: false, message: "No location assigned for today. Please contact your administrator." };
  }

  // Check if current time is within allowed time range
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
  const startTime = dailyLocation.startTime.getHours() * 60 + dailyLocation.startTime.getMinutes();
  const endTime = dailyLocation.endTime.getHours() * 60 + dailyLocation.endTime.getMinutes();

  if (currentTime < startTime || currentTime > endTime) {
    return { 
      isValid: false, 
      message: `Attendance can only be marked between ${dailyLocation.startTime.toLocaleTimeString()} and ${dailyLocation.endTime.toLocaleTimeString()}`,
      allowedLocation: dailyLocation
    };
  }

  // Get human-readable location for current coordinates
  const currentLocationString = await getHumanReadableLocation(coordinates);

  // Check coordinates match within 50 meter radius
  const isLocationValid = isWithinRadius(
    coordinates.latitude,
    coordinates.longitude,
    parseFloat(dailyLocation.latitude.toString()),
    parseFloat(dailyLocation.longitude.toString()),
    50 // Fixed 50 meter radius
  );

  if (isLocationValid) {
    return { 
      isValid: true, 
      message: "Location validated successfully", 
      allowedLocation: dailyLocation,
      currentLocation: currentLocationString
    };
  }

  return { 
    isValid: false, 
    message: `Location mismatch. Please ensure you are at the assigned location within 50 meters.`,
    allowedLocation: dailyLocation,
    currentLocation: currentLocationString
  };
}

// Create attendance record with geolocation and location validation
export async function createAttendanceRecord(data: {
  employeeId: string;
  coordinates?: GeolocationCoordinates;
  ipAddress: string;
  userAgent: string;
  photo?: string;
  status: 'PRESENT' | 'LATE';
  locationText?: string; // Add support for admin-provided location text
}): Promise<AttendanceRecord> {
  let locationString = data.locationText || "Location not provided";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Find the employee by employeeId
  const employee = await prisma.fieldEngineer.findUnique({
    where: { employeeId: data.employeeId }
  });
  
  if (!employee) {
    throw new Error(`Employee with employee ID ${data.employeeId} not found`);
  }

  // Check existing attendance record for attempt count
  let existingAttendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: today
      }
    }
  });

  // If coordinates provided and not admin entry (0,0), validate location
  if (data.coordinates && (data.coordinates.latitude !== 0 || data.coordinates.longitude !== 0)) {
    const locationValidation = await validateEmployeeLocation(data.employeeId, data.coordinates);
    
    if (!locationValidation.isValid) {
      // Increment attempt count
      let currentAttempts = 0;
      if (existingAttendance) {
        switch (existingAttendance.attemptCount) {
          case 'ZERO': currentAttempts = 0; break;
          case 'ONE': currentAttempts = 1; break;
          case 'TWO': currentAttempts = 2; break;
          case 'THREE': currentAttempts = 3; break;
        }
      }

      currentAttempts++;
      
      // If this is the 3rd failed attempt, mark as ABSENT and lock
      if (currentAttempts >= 3) {
        await prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: today
            }
          },
          update: {
            status: 'ABSENT',
            attemptCount: 'THREE',
            latitude: data.coordinates.latitude,
            longitude: data.coordinates.longitude,
            location: locationValidation.currentLocation || locationString,
            ipAddress: data.ipAddress,
            deviceInfo: `${getDeviceInfo(data.userAgent).os} - ${getDeviceInfo(data.userAgent).browser} - ${getDeviceInfo(data.userAgent).device}`,
            lockedReason: "Maximum location validation attempts exceeded",
            locked: true,
            updatedAt: new Date()
          },
          create: {
            employeeId: employee.id,
            date: today,
            status: 'ABSENT',
            attemptCount: 'THREE',
            latitude: data.coordinates.latitude,
            longitude: data.coordinates.longitude,
            location: locationValidation.currentLocation || locationString,
            ipAddress: data.ipAddress,
            deviceInfo: `${getDeviceInfo(data.userAgent).os} - ${getDeviceInfo(data.userAgent).browser} - ${getDeviceInfo(data.userAgent).device}`,
            lockedReason: "Maximum location validation attempts exceeded",
            locked: true
          }
        });

        throw new Error(`Maximum attempts exceeded. You have been marked as ABSENT for today. Reason: ${locationValidation.message}`);
      }

      // Update attempt count and throw error - NO ATTENDANCE RECORDED
      const attemptCountMap = ['ZERO', 'ONE', 'TWO', 'THREE'] as const;
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: today
          }
        },
        update: {
          attemptCount: attemptCountMap[currentAttempts] as any,
          updatedAt: new Date()
        },
        create: {
          employeeId: employee.id,
          date: today,
          status: 'PRESENT', // Temporary status, will be updated when location is correct
          attemptCount: attemptCountMap[currentAttempts] as any,
          location: "",
          ipAddress: data.ipAddress,
          deviceInfo: `${getDeviceInfo(data.userAgent).os} - ${getDeviceInfo(data.userAgent).browser} - ${getDeviceInfo(data.userAgent).device}`,
          lockedReason: ""
        }
      });

      throw new Error(`${locationValidation.message} Attempt ${currentAttempts}/3. ${3 - currentAttempts} attempts remaining.`);
    }

    // Location is valid, get location data
    locationString = locationValidation.currentLocation || await getHumanReadableLocation(data.coordinates);
  } else if (data.coordinates && data.coordinates.latitude === 0 && data.coordinates.longitude === 0) {
    // Admin entry with 0,0 coordinates - use provided location text
    locationString = data.locationText || "Admin Entry";
  } else if (!data.coordinates && data.locationText) {
    // No coordinates but location text provided (admin entry)
    locationString = data.locationText;
  } else {
    throw new Error("Location coordinates or location text are required for attendance");
  }
  
  // Get device information
  const deviceInfo = getDeviceInfo(data.userAgent);
  const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;
  
  try {
    let savedRecord;
    
    if (existingAttendance && !existingAttendance.locked) {
      // Update existing record (for check-out or corrections)
      savedRecord = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          latitude: data.coordinates ? data.coordinates.latitude : existingAttendance.latitude,
          longitude: data.coordinates ? data.coordinates.longitude : existingAttendance.longitude,
          location: locationString,
          ipAddress: data.ipAddress,
          deviceInfo: deviceString,
          photo: data.photo || existingAttendance.photo,
          status: data.status,
          clockIn: data.status === 'PRESENT' && !existingAttendance.clockIn ? new Date() : existingAttendance.clockIn,
          updatedAt: new Date()
        }
      });
    } else if (!existingAttendance) {
      // Create new record (for check-in)
      savedRecord = await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date: today,
          clockIn: data.status === 'PRESENT' ? new Date() : null,
          latitude: data.coordinates ? data.coordinates.latitude : null,
          longitude: data.coordinates ? data.coordinates.longitude : null,
          location: locationString,
          ipAddress: data.ipAddress,
          deviceInfo: deviceString,
          photo: data.photo,
          status: data.status,
          lockedReason: "",
          attemptCount: 'ZERO'
        }
      });
    } else {
      throw new Error("Attendance record is locked or already processed for today");
    }
    
    // Convert to AttendanceRecord format
    const attendanceRecord: AttendanceRecord = {
      employeeId: data.employeeId,
      timestamp: savedRecord.createdAt.toISOString(),
      location: savedRecord.location || locationString,
      ipAddress: savedRecord.ipAddress || data.ipAddress,
      deviceInfo: savedRecord.deviceInfo || deviceString,
      photo: savedRecord.photo || data.photo,
      status: savedRecord.status as any
    };
    
    return attendanceRecord;
  } catch (error) {
    console.error('Error creating attendance record:', error);
    throw error;
  }
}

// Get location data from coordinates
export async function getLocationData(coordinates: GeolocationCoordinates): Promise<LocationData | null> {
  return await getLocationFromCoordinates(coordinates);
}

// Validate coordinates
export function validateCoordinates(coordinates: GeolocationCoordinates): boolean {
  const { latitude, longitude } = coordinates;
  
  // Check if coordinates are valid
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  
  // Check latitude range (-90 to 90)
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  
  // Check longitude range (-180 to 180)
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  
  return true;
}

// Get attendance records for an employee
export async function getEmployeeAttendance(employeeId: string, startDate?: Date, endDate?: Date) {
  try {
    const employee = await prisma.fieldEngineer.findUnique({
      where: { employeeId }
    });
    
    if (!employee) {
      return [];
    }
    
    const whereClause: any = {
      employeeId: employee.id
    };
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startDate;
      if (endDate) whereClause.date.lte = endDate;
    }
    
    return await prisma.attendance.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc'
      }
    });
  } catch (error) {
    console.error('Error getting employee attendance:', error);
    return [];
  }
}

// Get all attendance records with pagination
export async function getAllAttendance(page: number = 1, limit: number = 50) {
  const skip = (page - 1) * limit;
  
  try {
    return await prisma.attendance.findMany({
      skip,
      take: limit,
      orderBy: {
        date: 'desc'
      }
    });
  } catch (error) {
    console.error('Error getting all attendance:', error);
    return [];
  }
}

// Create attendance override (admin function)
export async function createAttendanceOverride(data: {
  employeeId: string;
  date: Date;
  adminId: string;
  oldStatus: string;
  newStatus: string;
  reason: string;
}) {
  try {
    // Create the override record
    const override = await prisma.attendanceOverride.create({
      data: {
        employeeId: data.employeeId,
        date: data.date,
        adminId: data.adminId,
        oldStatus: data.oldStatus as any,
        newStatus: data.newStatus as any,
        reason: data.reason
      }
    });

    // Update the actual attendance record
    await prisma.attendance.updateMany({
      where: {
        employeeId: data.employeeId,
        date: data.date
      },
      data: {
        status: data.newStatus as any,
        updatedAt: new Date()
      }
    });

    return override;
  } catch (error) {
    console.error('Error creating attendance override:', error);
    throw error;
  }
}

// Get attendance overrides for a user
export async function getAttendanceOverrides(employeeId: string, startDate?: Date, endDate?: Date) {
  try {
    const whereClause: any = { employeeId };
    
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startDate;
      if (endDate) whereClause.date.lte = endDate;
    }
    
    return await prisma.attendanceOverride.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc'
      }
    });
  } catch (error) {
    console.error('Error getting attendance overrides:', error);
    return [];
  }
}

// Get remaining location attempts for an employee today
export async function getRemainingAttempts(employeeId: string): Promise<{ remainingAttempts: number; isLocked: boolean; status?: string }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employee = await prisma.fieldEngineer.findUnique({
    where: { employeeId }
  });

  if (!employee) {
    throw new Error(`Employee with employee ID ${employeeId} not found`);
  }

  const attendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: today
      }
    }
  });

  if (!attendance) {
    return { remainingAttempts: 3, isLocked: false };
  }

  if (attendance.locked) {
    return { remainingAttempts: 0, isLocked: true, status: attendance.status };
  }

  let usedAttempts = 0;
  switch (attendance.attemptCount) {
    case 'ZERO': usedAttempts = 0; break;
    case 'ONE': usedAttempts = 1; break;
    case 'TWO': usedAttempts = 2; break;
    case 'THREE': usedAttempts = 3; break;
  }

  return { 
    remainingAttempts: Math.max(0, 3 - usedAttempts), 
    isLocked: false,
    status: attendance.status 
  };
}

// Get employee's assigned location for today
export async function getTodayAssignedLocation(employeeId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employee = await prisma.fieldEngineer.findUnique({
    where: { employeeId }
  });

  if (!employee) {
    throw new Error(`Employee with employee ID ${employeeId} not found`);
  }

  return await prisma.dailyLocation.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: today
      }
    }
  });
}