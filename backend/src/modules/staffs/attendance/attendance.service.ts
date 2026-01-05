import { prisma } from "@/lib/prisma";
import { AttendanceRecord, LocationData, GeolocationCoordinates } from "./attendance.types";
import { getHumanReadableLocation, getLocationFromCoordinates } from "@/utils/geolocation";
import { getDeviceInfo } from "@/utils/deviceinfo";

// Create attendance record with geolocation
export async function createAttendanceRecord(data: {
  employeeId: string;
  coordinates?: GeolocationCoordinates;
  ipAddress: string;
  userAgent: string;
  photo?: string;
  status: 'PRESENT' | 'LATE';
}): Promise<AttendanceRecord> {
  let locationData = null;
  let locationString = "Location not provided";
  
  // Get location data if coordinates are provided
  if (data.coordinates) {
    locationData = await getLocationFromCoordinates(data.coordinates);
    locationString = await getHumanReadableLocation(data.coordinates);
  }
  
  // Get device information
  const deviceInfo = getDeviceInfo(data.userAgent);
  const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    // First, find the user by employeeId
    const user = await prisma.user.findUnique({
      where: { employeeId: data.employeeId }
    });
    
    if (!user) {
      throw new Error(`User with employee ID ${data.employeeId} not found`);
    }
    
    // Check if attendance record exists for today
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today
        }
      }
    });
    
    let savedRecord;
    
    if (existingAttendance) {
      // Update existing record (for check-out)
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
          updatedAt: new Date()
        }
      });
    } else {
      // Create new record (for check-in)
      savedRecord = await prisma.attendance.create({
        data: {
          userId: user.id,
          date: today,
          clockIn: data.status === 'PRESENT' ? new Date() : null,
          latitude: data.coordinates ? data.coordinates.latitude : null,
          longitude: data.coordinates ? data.coordinates.longitude : null,
          location: locationString,
          ipAddress: data.ipAddress,
          deviceInfo: deviceString,
          photo: data.photo,
          status: data.status,
          lockedReason: "" // Required field, empty by default
        }
      });
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
    const user = await prisma.user.findUnique({
      where: { employeeId }
    });
    
    if (!user) {
      return [];
    }
    
    const whereClause: any = {
      userId: user.id
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
  userId: string;
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
        userId: data.userId,
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
        userId: data.userId,
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
export async function getAttendanceOverrides(userId: string, startDate?: Date, endDate?: Date) {
  try {
    const whereClause: any = { userId };
    
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