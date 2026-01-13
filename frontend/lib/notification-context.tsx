"use client"

import * as React from "react"
import { VehicleUnassignedPopup } from "@/components/VehicleUnassignedPopup"
import { AttendanceApprovalPopup } from "@/components/AttendanceApprovalPopup"

interface VehicleUnassignedData {
  vehicleId: string
  vehicleNumber: string
  employeeId: string
  employeeName: string
  checkoutTime: string
  location: string
}

interface AttendanceApprovalData {
  attendanceId: string
  employeeId: string
  employeeName: string
  employeeRole: string
  checkInTime: string
  location: string
  status: string
  photo?: string
}

interface NotificationContextType {
  showVehicleUnassignedNotification: (data: VehicleUnassignedData) => void
  showAttendanceApprovalNotification: (data: AttendanceApprovalData) => void
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [vehicleUnassignedData, setVehicleUnassignedData] = React.useState<VehicleUnassignedData | null>(null)
  const [showVehiclePopup, setShowVehiclePopup] = React.useState(false)
  
  const [attendanceApprovalData, setAttendanceApprovalData] = React.useState<AttendanceApprovalData | null>(null)
  const [showAttendancePopup, setShowAttendancePopup] = React.useState(false)

  const showVehicleUnassignedNotification = React.useCallback((data: VehicleUnassignedData) => {
    setVehicleUnassignedData(data)
    setShowVehiclePopup(true)
  }, [])

  const showAttendanceApprovalNotification = React.useCallback((data: AttendanceApprovalData) => {
    setAttendanceApprovalData(data)
    setShowAttendancePopup(true)
  }, [])

  const closeVehiclePopup = React.useCallback(() => {
    setShowVehiclePopup(false)
    setVehicleUnassignedData(null)
  }, [])

  const closeAttendancePopup = React.useCallback(() => {
    setShowAttendancePopup(false)
    setAttendanceApprovalData(null)
  }, [])

  // Poll for new notifications every 10 seconds (only for admin users)
  React.useEffect(() => {
    let interval: NodeJS.Timeout

    const pollNotifications = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications?isRead=false&limit=5`)
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && result.data.length > 0) {
            for (const notification of result.data) {
              // Handle vehicle unassigned notifications
              if (notification.type === 'VEHICLE_UNASSIGNED' && 
                  notification.data &&
                  (!vehicleUnassignedData || vehicleUnassignedData.vehicleId !== notification.data.vehicleId)) {
                
                showVehicleUnassignedNotification(notification.data)
                
                // Mark as read
                await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/${notification.id}/read`, {
                  method: 'PUT'
                })
                break // Show only one notification at a time
              }
              
              // Handle attendance approval notifications
              if (notification.type === 'ATTENDANCE_APPROVAL_REQUEST' && 
                  notification.data &&
                  (!attendanceApprovalData || attendanceApprovalData.attendanceId !== notification.data.attendanceId)) {
                
                showAttendanceApprovalNotification(notification.data)
                
                // Mark as read
                await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/${notification.id}/read`, {
                  method: 'PUT'
                })
                break // Show only one notification at a time
              }
            }
          }
        }
      } catch (error) {
        console.error('Error polling notifications:', error)
      }
    }

    // Start polling after component mounts
    const startPolling = () => {
      interval = setInterval(pollNotifications, 10000) // Poll every 10 seconds
    }

    // Check if user is admin before starting polling
    const checkUserAndStartPolling = async () => {
      try {
        // This would typically check the user session
        // For now, we'll assume admin users are on the dashboard
        if (window.location.pathname.includes('/dashboard')) {
          startPolling()
        }
      } catch (error) {
        console.error('Error checking user type:', error)
      }
    }

    checkUserAndStartPolling()

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [vehicleUnassignedData, attendanceApprovalData, showVehicleUnassignedNotification, showAttendanceApprovalNotification])

  const value = React.useMemo(() => ({
    showVehicleUnassignedNotification,
    showAttendanceApprovalNotification
  }), [showVehicleUnassignedNotification, showAttendanceApprovalNotification])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <VehicleUnassignedPopup
        isOpen={showVehiclePopup}
        onClose={closeVehiclePopup}
        data={vehicleUnassignedData}
      />
      <AttendanceApprovalPopup
        isOpen={showAttendancePopup}
        onClose={closeAttendancePopup}
        data={attendanceApprovalData}
        onActionComplete={() => {
          // Force a refresh of notifications by clearing current data
          // This will trigger the polling to fetch fresh notifications
          setAttendanceApprovalData(null)
        }}
      />
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = React.useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}