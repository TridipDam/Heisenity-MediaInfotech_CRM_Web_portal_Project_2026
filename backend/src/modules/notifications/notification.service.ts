import { prisma } from '@/lib/prisma'

export interface AdminNotification {
  id: string
  type: 'VEHICLE_UNASSIGNED' | 'TASK_COMPLETED' | 'ATTENDANCE_ALERT' | 'ATTENDANCE_APPROVAL_REQUEST' | 'ATTENDANCE_APPROVED' | 'ATTENDANCE_REJECTED'
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

export class NotificationService {
  // Create a new admin notification
  async createAdminNotification(data: {
    type: AdminNotification['type']
    title: string
    message: string
    data?: any
  }) {
    try {
      const notification = await prisma.adminNotification.create({
        data: {
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data ? JSON.stringify(data.data) : null,
          isRead: false
        }
      })

      return {
        success: true,
        data: notification
      }
    } catch (error) {
      console.error('Error creating admin notification:', error)
      return {
        success: false,
        error: 'Failed to create notification'
      }
    }
  }

  // Get all admin notifications
  async getAdminNotifications(filters?: {
    isRead?: boolean
    type?: AdminNotification['type']
    limit?: number
  }) {
    try {
      const where: any = {}
      
      if (filters?.isRead !== undefined) {
        where.isRead = filters.isRead
      }
      
      if (filters?.type) {
        where.type = filters.type
      }

      const notifications = await prisma.adminNotification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: filters?.limit || 50
      })

      return {
        success: true,
        data: notifications.map(notification => ({
          ...notification,
          data: notification.data ? JSON.parse(notification.data) : null
        }))
      }
    } catch (error) {
      console.error('Error fetching admin notifications:', error)
      return {
        success: false,
        error: 'Failed to fetch notifications'
      }
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      const notification = await prisma.adminNotification.update({
        where: { id: notificationId },
        data: { isRead: true }
      })

      return {
        success: true,
        data: notification
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return {
        success: false,
        error: 'Failed to mark notification as read'
      }
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      await prisma.adminNotification.updateMany({
        where: { isRead: false },
        data: { isRead: true }
      })

      return {
        success: true,
        message: 'All notifications marked as read'
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return {
        success: false,
        error: 'Failed to mark all notifications as read'
      }
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string) {
    try {
      await prisma.adminNotification.delete({
        where: { id: notificationId }
      })

      return {
        success: true,
        message: 'Notification deleted'
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      return {
        success: false,
        error: 'Failed to delete notification'
      }
    }
  }

  // Get unread notification count
  async getUnreadCount() {
    try {
      const count = await prisma.adminNotification.count({
        where: { isRead: false }
      })

      return {
        success: true,
        data: { count }
      }
    } catch (error) {
      console.error('Error getting unread count:', error)
      return {
        success: false,
        error: 'Failed to get unread count'
      }
    }
  }

  // Remove attendance approval notification when approved/rejected
  async removeAttendanceApprovalNotification(attendanceId: string) {
    try {
      // Find and delete the original approval request notification using JSON path query
      const deletedNotifications = await prisma.adminNotification.deleteMany({
        where: {
          AND: [
            { type: 'ATTENDANCE_APPROVAL_REQUEST' },
            {
              OR: [
                { data: { contains: `"attendanceId":"${attendanceId}"` } },
                { data: { contains: `"attendanceId": "${attendanceId}"` } }
              ]
            }
          ]
        }
      })

      console.log(`Removed ${deletedNotifications.count} attendance approval notification(s) for attendance ID: ${attendanceId}`)
      
      return {
        success: true,
        message: 'Attendance approval notification removed',
        count: deletedNotifications.count
      }
    } catch (error) {
      console.error('Error removing attendance approval notification:', error)
      return {
        success: false,
        error: 'Failed to remove attendance approval notification'
      }
    }
  }
}