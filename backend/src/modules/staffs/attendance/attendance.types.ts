import { ATTENDANCE_STATUS } from "./attendance.constants"

export type AttendanceStatus =
  typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS]

export interface AttendanceRecord {
  employeeId: string
  timestamp: string
  location: string
  ipAddress: string
  deviceInfo: string
  photo?: string
  status: AttendanceStatus
}

export interface LocationData {
  address: string
  city: string
  state: string
}

export interface GeolocationCoordinates {
  latitude: number
  longitude: number
}

export interface GeolocationCoordinates {
  latitude: number
  longitude: number
}