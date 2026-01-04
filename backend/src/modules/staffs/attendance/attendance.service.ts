import { prisma } from "@/lib/db";
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
  status: string;
}): Promise<AttendanceRecord> {
  let locationString = "Location not provided";
  
  // Get human-readable location if coordinates are provided
  if (data.coordinates) {
    locationString = await getHumanReadableLocation(data.coordinates);
  }
  
  // Get device information
  const deviceInfo = getDeviceInfo(data.userAgent);
  const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;
  
  const attendanceRecord: AttendanceRecord = {
    employeeId: data.employeeId,
    timestamp: new Date().toISOString(),
    location: locationString,
    ipAddress: data.ipAddress,
    deviceInfo: deviceString,
    photo: data.photo,
    status: data.status as any
  };
  
  // TODO: Save to database when Prisma schema is ready
  // const savedRecord = await prisma.attendance.create({
  //   data: attendanceRecord
  // });
  
  return attendanceRecord;
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
  // TODO: Implement database query when Prisma schema is ready
  // return await prisma.attendance.findMany({
  //   where: {
  //     employeeId,
  //     timestamp: {
  //       gte: startDate,
  //       lte: endDate
  //     }
  //   },
  //   orderBy: {
  //     timestamp: 'desc'
  //   }
  // });
  
  return [];
}

// Get all attendance records with pagination
export async function getAllAttendance(page: number = 1, limit: number = 50) {
  const skip = (page - 1) * limit;
  
  // TODO: Implement database query when Prisma schema is ready
  // return await prisma.attendance.findMany({
  //   skip,
  //   take: limit,
  //   orderBy: {
  //     timestamp: 'desc'
  //   }
  // });
  
  return [];
}
