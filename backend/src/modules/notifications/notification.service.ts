import { prisma } from '../../lib/prisma'

export interface AdminNotification {
  id: string
  type: 'VEHICLE_UNASSIGNED' | 'TASK_COMPLETED' | 'ATTENDANCE_ALERT' | 'ATTENDANCE_APPROVAL_REQUEST' | 'ATTENDANCE_APPROVED' | 'ATTENDANCE_REJECTED' | 'TICKET_CREATED' | 'TICKET_ASSIGNED' | 'LOW_STOCK'
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

  // Accept ticket from notification
  async acceptTicketFromNotification(notificationId: string, userId: string, userType: 'ADMIN' | 'EMPLOYEE' = 'EMPLOYEE') {
    try {
      // Get the notification
      const notification = await prisma.adminNotification.findUnique({
        where: { id: notificationId }
      })

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        }
      }

      if (notification.type !== 'TICKET_CREATED') {
        return {
          success: false,
          error: 'This notification is not for ticket assignment'
        }
      }

      const notificationData = notification.data ? JSON.parse(notification.data) : null
      if (!notificationData?.ticketId) {
        return {
          success: false,
          error: 'Ticket ID not found in notification'
        }
      }

      // Check if ticket is already assigned
      const existingTicket = await prisma.supportTicket.findUnique({
        where: { ticketId: notificationData.ticketId },
        select: { assigneeId: true, status: true }
      })

      if (existingTicket?.assigneeId) {
        // Remove all TICKET_CREATED notifications for this ticket since it's already assigned
        await this.removeTicketCreatedNotifications(notificationData.ticketId)
        return {
          success: false,
          error: 'This ticket has already been assigned to someone else'
        }
      }

      let assigneeEmployee;
      let assigneeName;
      let assigneeDisplayId;

      if (userType === 'ADMIN') {
        // Handle admin acceptance
        const admin = await prisma.admin.findUnique({
          where: { adminId: userId },
          select: { id: true, name: true, adminId: true, email: true }
        })

        if (!admin) {
          return {
            success: false,
            error: 'Admin not found'
          }
        }

        // Create or find an employee record for this admin
        const adminEmployeeId = `ADMIN_${admin.adminId}`
        assigneeEmployee = await prisma.employee.findUnique({
          where: { employeeId: adminEmployeeId },
          select: { id: true, name: true, employeeId: true }
        })

        if (!assigneeEmployee) {
          // Create an employee record for this admin
          assigneeEmployee = await prisma.employee.create({
            data: {
              name: `${admin.name} (Admin)`,
              employeeId: adminEmployeeId,
              email: admin.email,
              password: 'N/A', // Admins don't use employee login
              role: 'IN_OFFICE',
              status: 'ACTIVE'
            },
            select: { id: true, name: true, employeeId: true }
          })
        } else {
          // Update existing record to ensure it has the correct name
          assigneeEmployee = await prisma.employee.update({
            where: { employeeId: adminEmployeeId },
            data: {
              name: `${admin.name} (Admin)`,
              email: admin.email
            },
            select: { id: true, name: true, employeeId: true }
          })
        }

        assigneeName = admin.name
        assigneeDisplayId = admin.adminId
      } else {
        // Handle employee acceptance
        assigneeEmployee = await prisma.employee.findUnique({
          where: { employeeId: userId },
          select: { id: true, name: true, employeeId: true }
        })

        if (!assigneeEmployee) {
          return {
            success: false,
            error: 'Employee not found'
          }
        }

        assigneeName = assigneeEmployee.name
        assigneeDisplayId = assigneeEmployee.employeeId
      }

      // Update the ticket to assign it to the user
      const updatedTicket = await prisma.supportTicket.update({
        where: { ticketId: notificationData.ticketId },
        data: {
          assigneeId: assigneeEmployee.id,
          status: 'OPEN'
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true,
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true,
            }
          }
        }
      })

      // Create history entry
      await prisma.ticketHistory.create({
        data: {
          ticketId: updatedTicket.id,
          action: 'ASSIGNED',
          field: 'assigneeId',
          newValue: assigneeEmployee.id,
          changedBy: assigneeEmployee.id,
        }
      })

      // Remove ALL TICKET_CREATED notifications for this ticket from all users
      await this.removeTicketCreatedNotifications(notificationData.ticketId)

      // Create a new notification for ticket assignment
      await this.createAdminNotification({
        type: 'TICKET_ASSIGNED',
        title: 'Ticket Assigned',
        message: `Ticket ${notificationData.ticketId} has been assigned to ${assigneeName}${userType === 'ADMIN' ? ' (Admin)' : ''}`,
        data: {
          ticketId: notificationData.ticketId,
          ticketInternalId: updatedTicket.id,
          assigneeId: assigneeDisplayId,
          assigneeName: assigneeName,
          assigneeType: userType,
          assignedAt: new Date().toISOString(),
          priority: notificationData.priority,
          description: notificationData.description,
          reporterName: notificationData.reporterName
        }
      })

      return {
        success: true,
        data: updatedTicket,
        message: `Ticket accepted and assigned to ${assigneeName}${userType === 'ADMIN' ? ' (Admin)' : ''} successfully`
      }
    } catch (error) {
      console.error('Error accepting ticket from notification:', error)
      return {
        success: false,
        error: 'Failed to accept ticket'
      }
    }
  }

  // Remove all TICKET_CREATED notifications for a specific ticket
  async removeTicketCreatedNotifications(ticketId: string) {
    try {
      const deletedNotifications = await prisma.adminNotification.deleteMany({
        where: {
          AND: [
            { type: 'TICKET_CREATED' },
            {
              OR: [
                { data: { contains: `"ticketId":"${ticketId}"` } },
                { data: { contains: `"ticketId": "${ticketId}"` } }
              ]
            }
          ]
        }
      })

      console.log(`Removed ${deletedNotifications.count} TICKET_CREATED notification(s) for ticket ID: ${ticketId}`)
      
      return {
        success: true,
        message: 'Ticket created notifications removed',
        count: deletedNotifications.count
      }
    } catch (error) {
      console.error('Error removing ticket created notifications:', error)
      return {
        success: false,
        error: 'Failed to remove ticket created notifications'
      }
    }
  }

  // Create low stock notification
  async createLowStockNotification(productId: string, productName: string, currentUnits: number, reorderThreshold: number) {
    try {
      const notification = await prisma.adminNotification.create({
        data: {
          type: 'LOW_STOCK',
          title: 'Low Stock Alert',
          message: `${productName} is running low on stock. Current units: ${currentUnits}, Reorder threshold: ${reorderThreshold}`,
          data: JSON.stringify({
            productId,
            productName,
            currentUnits,
            reorderThreshold,
            alertedAt: new Date().toISOString()
          }),
          isRead: false
        }
      })

      console.log(`Low stock notification created for product: ${productName} (ID: ${productId})`)

      return {
        success: true,
        data: notification,
        message: 'Low stock notification created'
      }
    } catch (error) {
      console.error('Error creating low stock notification:', error)
      return {
        success: false,
        error: 'Failed to create low stock notification'
      }
    }
  }

  // Check and create low stock notifications for products
  async checkLowStockProducts() {
    try {
      // Get all active products
      const products = await prisma.product.findMany({
        where: {
          isActive: true
        }
      })

      // Filter products where currentUnits <= reorderThreshold
      const lowStockProducts = products.filter(product => {
        const current = product.currentUnits || 0
        const threshold = product.reorderThreshold || 0
        return current <= threshold && threshold > 0
      })

      if (lowStockProducts.length === 0) {
        return {
          success: true,
          message: 'No low stock products found',
          count: 0
        }
      }

      // Create notifications for each low stock product
      const notifications: any[] = []
      for (const product of lowStockProducts) {
        const notif = await this.createLowStockNotification(
          product.id.toString(),
          product.productName,
          product.currentUnits || 0,
          product.reorderThreshold || 0
        )
        if (notif.success) {
          notifications.push(notif.data)
        }
      }

      return {
        success: true,
        message: `Created ${notifications.length} low stock notifications`,
        count: notifications.length,
        data: notifications
      }
    } catch (error) {
      console.error('Error checking low stock products:', error)
      return {
        success: false,
        error: 'Failed to check low stock products'
      }
    }
  }
}