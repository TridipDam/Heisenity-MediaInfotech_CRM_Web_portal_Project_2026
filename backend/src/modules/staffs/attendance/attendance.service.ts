import { prisma } from '../../../lib/prisma'
import {
  AttendanceRecord
} from './attendance.types'
import { getDeviceInfo } from '../../../utils/deviceinfo'
import { VehicleService } from '../vehicles/vehicle.service'
import { NotificationService } from '../../notifications/notification.service'

// Environment-configurable defaults
const DEFAULT_FLEXIBLE_WINDOW_MINUTES = Number(process.env.DEFAULT_FLEXIBLE_WINDOW_MINUTES || 120)
const MAX_ATTEMPTS = 3

// Helper functions to convert between AttemptCount enum and numbers
function attemptCountToNumber(attemptCount: any): number {
  if (attemptCount === 'ZERO') return 0
  if (attemptCount === 'ONE') return 1
  if (attemptCount === 'TWO') return 2
  if (attemptCount === 'THREE') return 3
  return 0
}

function numberToAttemptCount(num: number): any {
  if (num <= 0) return 'ZERO'
  if (num === 1) return 'ONE'
  if (num === 2) return 'TWO'
  if (num >= 3) return 'THREE'
  return 'ZERO'
}

// Create attendance record without location validation
export async function createAttendanceRecord(data: {
  employeeId: string
  ipAddress: string
  userAgent: string
  photo?: string
  status: 'PRESENT' | 'LATE'
  locationText?: string
  action?: 'check-in' | 'check-out' | 'task-checkout'
}): Promise<AttendanceRecord> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const employee = await prisma.employee.findUnique({ where: { employeeId: data.employeeId } })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')

  // Get existing attendance record
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } }
  })

  if (existing && existing.locked) throw new Error('ATTENDANCE_LOCKED')

  const deviceInfo = getDeviceInfo(data.userAgent)
  const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`
  
  // Use provided location text or default
  const locationText = data.locationText || 'Office Location'

  const updateData: any = {
    ipAddress: data.ipAddress,
    deviceInfo: deviceString,
    photo: data.photo ?? existing?.photo,
    status: data.status,
    source: 'SELF',
    updatedAt: new Date(),
    attemptCount: 'ZERO'
  }

  // Check if this is the first check-in of the day (requires approval)
  const isFirstCheckIn = !existing?.clockIn && (data.action === 'check-in' || (!data.action && (data.status === 'PRESENT' || data.status === 'LATE')))

  // Handle check-in/check-out logic
  if (data.action === 'check-in') {
    if (!existing?.clockIn) {
      updateData.clockIn = new Date()
      // Set approval status to PENDING for first check-in
      updateData.approvalStatus = 'PENDING'
    }
    
    const taskCheckinTime = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })
    updateData.taskStartTime = taskCheckinTime
    
    if (existing && existing.source === 'ADMIN' && !existing.clockIn) {
      updateData.clockOut = null
    }

  } else if (data.action === 'check-out') {
    const checkoutTime = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })

    updateData.clockOut = new Date()
    updateData.taskEndTime = checkoutTime

    if (existing && existing.source === 'ADMIN' && !existing.clockIn) {
      throw new Error('CANNOT_CHECKOUT_WITHOUT_CHECKIN')
    }

  } else if (data.action === 'task-checkout') {
    const taskCheckoutTime = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    })

    updateData.taskEndTime = taskCheckoutTime

  } else {
    if (!existing?.clockIn && (data.status === 'PRESENT' || data.status === 'LATE')) {
      updateData.clockIn = new Date()
      // Set approval status to PENDING for first check-in
      updateData.approvalStatus = 'PENDING'
    }
  }

  const saved = existing
    ? await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          ...updateData,
          clockIn: updateData.clockIn !== undefined ? updateData.clockIn : existing.clockIn,
          clockOut: updateData.clockOut !== undefined ? updateData.clockOut : existing.clockOut,
          approvalStatus: updateData.approvalStatus !== undefined ? updateData.approvalStatus : existing.approvalStatus
        }
      })
    : await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date: today,
          clockIn: updateData.clockIn || (data.status === 'PRESENT' || data.status === 'LATE' ? new Date() : null),
          clockOut: updateData.clockOut || null,
          ipAddress: data.ipAddress,
          deviceInfo: deviceString,
          photo: data.photo,
          status: data.status,
          source: 'SELF',
          lockedReason: '',
          locked: false,
          attemptCount: 'ZERO',
          approvalStatus: updateData.approvalStatus || 'PENDING'
        }
      })

  // Create notification for admin when employee checks in for the first time
  if (isFirstCheckIn) {
    try {
      const notificationService = new NotificationService()
      await notificationService.createAdminNotification({
        type: 'ATTENDANCE_APPROVAL_REQUEST',
        title: 'Attendance Approval Required',
        message: `${employee.name} (${data.employeeId}) has checked in and requires attendance approval.`,
        data: {
          attendanceId: saved.id,
          employeeId: data.employeeId,
          employeeName: employee.name,
          employeeRole: employee.role,
          checkInTime: saved.clockIn?.toISOString(),
          location: locationText,
          status: data.status,
          photo: saved.photo
        }
      })
      
      console.log(`Attendance approval notification created for employee ${data.employeeId}`)
    } catch (error) {
      console.error('Error creating attendance approval notification:', error)
    }
  }

  // Auto-unassign vehicle on checkout
  if (data.action === 'check-out') {
    try {
      const vehicleService = new VehicleService()
      const notificationService = new NotificationService()
      
      const vehicleResult = await vehicleService.getEmployeeVehicle(data.employeeId)
      
      if (vehicleResult.success && vehicleResult.data) {
        const vehicle = vehicleResult.data
        
        const unassignResult = await vehicleService.unassignVehicle(vehicle.id)
        
        if (unassignResult.success) {
          await notificationService.createAdminNotification({
            type: 'VEHICLE_UNASSIGNED',
            title: 'Vehicle Auto-Unassigned',
            message: `Vehicle ${vehicle.vehicleNumber} (${vehicle.make} ${vehicle.model}) has been automatically unassigned from ${employee.name} (${data.employeeId}) after checkout.`,
            data: {
              vehicleId: vehicle.id,
              vehicleNumber: vehicle.vehicleNumber,
              employeeId: data.employeeId,
              employeeName: employee.name,
              checkoutTime: saved.clockOut?.toISOString()
            }
          })
          
          console.log(`Vehicle ${vehicle.vehicleNumber} auto-unassigned from employee ${data.employeeId} after checkout`)
        }
      }
    } catch (error) {
      console.error('Error auto-unassigning vehicle on checkout:', error)
    }
  }

  return {
    employeeId: data.employeeId,
    timestamp: saved.createdAt.toISOString(),
    location: locationText,
    ipAddress: saved.ipAddress || data.ipAddress || '',
    deviceInfo: saved.deviceInfo || deviceString || '',
    photo: saved.photo || data.photo || undefined,
    status: saved.status as any
  }
}

// Get remaining attempts (updated to numeric)
export async function getRemainingAttempts(employeeId: string): Promise<{ remainingAttempts: number; isLocked: boolean; status?: string }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const employee = await prisma.employee.findUnique({ where: { employeeId } })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')

  const attendance = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } }
  })

  if (!attendance) {
    return { remainingAttempts: MAX_ATTEMPTS, isLocked: false }
  }

  if (attendance.locked) {
    return { remainingAttempts: 0, isLocked: true, status: attendance.status }
  }

  const used = attemptCountToNumber(attendance.attemptCount)
  return { remainingAttempts: Math.max(0, MAX_ATTEMPTS - used), isLocked: false, status: attendance.status }
}

const STANDARD_WORK_MINUTES = 8 * 60

export function calculateWorkAndOvertimeFromAttendance(
  clockIn?: Date | null,
  clockOut?: Date | null
): {
  workedMinutes: number
  overtimeMinutes: number
} | null {
  if (!clockIn || !clockOut) return null

  const diffMs = clockOut.getTime() - clockIn.getTime()
  if (diffMs <= 0) return null

  const totalMinutes = Math.floor(diffMs / (1000 * 60))

  const workedMinutes = Math.min(totalMinutes, STANDARD_WORK_MINUTES)
  const overtimeMinutes = Math.max(totalMinutes - STANDARD_WORK_MINUTES, 0)

  return {
    workedMinutes,
    overtimeMinutes
  }
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

// Approve attendance
export async function approveAttendance(attendanceId: string, adminId: string, reason?: string): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            role: true
          }
        }
      }
    })

    if (!attendance) {
      return { success: false, message: 'Attendance record not found' }
    }

    if (attendance.approvalStatus === 'APPROVED') {
      return { success: false, message: 'Attendance already approved' }
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date(),
        approvalReason: reason || 'Approved by admin'
      }
    })

    // Create notification for approval
    const notificationService = new NotificationService()
    
    // First, remove the original approval request notification
    await notificationService.removeAttendanceApprovalNotification(attendanceId)
    
    // Then create the approval confirmation notification
    await notificationService.createAdminNotification({
      type: 'ATTENDANCE_APPROVED',
      title: 'Attendance Approved',
      message: `Attendance for ${attendance.employee.name} (${attendance.employee.employeeId}) has been approved.`,
      data: {
        attendanceId: attendanceId,
        employeeId: attendance.employee.employeeId,
        employeeName: attendance.employee.name,
        employeeRole: attendance.employee.role,
        approvedBy: adminId,
        approvedAt: updatedAttendance.approvedAt?.toISOString(),
        reason: reason || 'Approved by admin'
      }
    })

    console.log(`Attendance approved for employee ${attendance.employee.employeeId} by admin ${adminId}`)

    return {
      success: true,
      message: 'Attendance approved successfully',
      data: updatedAttendance
    }
  } catch (error) {
    console.error('Error approving attendance:', error)
    return { success: false, message: 'Failed to approve attendance' }
  }
}

// Reject attendance
export async function rejectAttendance(attendanceId: string, adminId: string, reason: string): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            role: true
          }
        }
      }
    })

    if (!attendance) {
      return { success: false, message: 'Attendance record not found' }
    }

    if (attendance.approvalStatus === 'REJECTED') {
      return { success: false, message: 'Attendance already rejected' }
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        approvalStatus: 'REJECTED',
        rejectedBy: adminId,
        rejectedAt: new Date(),
        approvalReason: reason,
        // Reset clock in/out times when rejected
        clockIn: null,
        clockOut: null,
        status: 'ABSENT'
      }
    })

    // Create notification for rejection
    const notificationService = new NotificationService()
    
    // First, remove the original approval request notification
    await notificationService.removeAttendanceApprovalNotification(attendanceId)
    
    // Then create the rejection confirmation notification
    await notificationService.createAdminNotification({
      type: 'ATTENDANCE_REJECTED',
      title: 'Attendance Rejected',
      message: `Attendance for ${attendance.employee.name} (${attendance.employee.employeeId}) has been rejected. Reason: ${reason}`,
      data: {
        attendanceId: attendanceId,
        employeeId: attendance.employee.employeeId,
        employeeName: attendance.employee.name,
        employeeRole: attendance.employee.role,
        rejectedBy: adminId,
        rejectedAt: updatedAttendance.rejectedAt?.toISOString(),
        reason: reason
      }
    })

    console.log(`Attendance rejected for employee ${attendance.employee.employeeId} by admin ${adminId}`)

    return {
      success: true,
      message: 'Attendance rejected successfully',
      data: updatedAttendance
    }
  } catch (error) {
    console.error('Error rejecting attendance:', error)
    return { success: false, message: 'Failed to reject attendance' }
  }
}

// Get pending attendance approvals
export async function getPendingAttendanceApprovals(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const pendingAttendances = await prisma.attendance.findMany({
      where: {
        approvalStatus: 'PENDING'
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            email: true,
            phone: true,
            role: true,
            teamId: true,
            isTeamLeader: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedData = pendingAttendances.map(attendance => ({
      id: attendance.id,
      employeeId: attendance.employee.employeeId,
      employeeName: attendance.employee.name,
      email: attendance.employee.email,
      phone: attendance.employee.phone,
      role: attendance.employee.role,
      teamId: attendance.employee.teamId,
      isTeamLeader: attendance.employee.isTeamLeader,
      date: attendance.date.toISOString().split('T')[0],
      clockIn: attendance.clockIn?.toISOString(),
      status: attendance.status,
      location: attendance.location || 'Office Location',
      photo: attendance.photo,
      approvalStatus: attendance.approvalStatus,
      createdAt: attendance.createdAt.toISOString()
    }))

    return {
      success: true,
      data: formattedData
    }
  } catch (error) {
    console.error('Error getting pending attendance approvals:', error)
    return {
      success: false,
      error: 'Failed to get pending attendance approvals'
    }
  }
}

