"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Clock, MapPin, User, Calendar, Camera } from "lucide-react"
import { showToast } from "@/lib/toast-utils"

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

interface AttendanceApprovalPopupProps {
  isOpen: boolean
  onClose: () => void
  data: AttendanceApprovalData | null
  onActionComplete?: () => void // Add callback for when action is completed
}

export function AttendanceApprovalPopup({ isOpen, onClose, data, onActionComplete }: AttendanceApprovalPopupProps) {
  const { data: session } = useSession()
  const [isApproving, setIsApproving] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [showRejectForm, setShowRejectForm] = React.useState(false)

  const handleApprove = async () => {
    if (!data || !session?.user) return

    setIsApproving(true)
    try {
      // Get admin ID from session
      const adminId = (session.user as any).adminId || session.user.id

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/${data.attendanceId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId,
          reason: 'Approved by admin'
        })
      })

      const result = await response.json()

      if (result.success) {
        showToast.success('Attendance approved successfully')
        onActionComplete?.() // Trigger refresh
        onClose()
      } else {
        showToast.error(result.error || 'Failed to approve attendance')
      }
    } catch (error) {
      console.error('Error approving attendance:', error)
      showToast.error('Failed to approve attendance')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!data || !rejectionReason.trim() || !session?.user) {
      showToast.error('Please provide a reason for rejection')
      return
    }

    setIsRejecting(true)
    try {
      // Get admin ID from session
      const adminId = (session.user as any).adminId || session.user.id

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/${data.attendanceId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId,
          reason: rejectionReason
        })
      })

      const result = await response.json()

      if (result.success) {
        showToast.success('Attendance rejected successfully')
        onActionComplete?.() // Trigger refresh
        onClose()
        setRejectionReason("")
        setShowRejectForm(false)
      } else {
        showToast.error(result.error || 'Failed to reject attendance')
      }
    } catch (error) {
      console.error('Error rejecting attendance:', error)
      showToast.error('Failed to reject attendance')
    } finally {
      setIsRejecting(false)
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'FIELD_ENGINEER':
        return 'bg-blue-100 text-blue-800'
      case 'IN_OFFICE':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800'
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Attendance Approval Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="h-8 w-8 text-gray-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{data.employeeName}</h3>
              <p className="text-sm text-gray-600">ID: {data.employeeId}</p>
            </div>
            <Badge className={getRoleBadgeColor(data.employeeRole)}>
              {data.employeeRole.replace('_', ' ')}
            </Badge>
          </div>

          {/* Check-in Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{formatDate(data.checkInTime)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Check-in Time:</span>
              <span className="font-medium">{formatTime(data.checkInTime)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">{data.location}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Status:</span>
              <Badge className={getStatusBadgeColor(data.status)}>
                {data.status}
              </Badge>
            </div>
          </div>

          {/* Photo if available */}
          {data.photo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Check-in Photo:</span>
              </div>
              <div className="flex justify-center">
                <img 
                  src={data.photo} 
                  alt="Check-in photo" 
                  className="max-w-full h-32 object-cover rounded-lg border"
                />
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {showRejectForm && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason for Rejection</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a reason for rejecting this attendance..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {!showRejectForm ? (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isApproving ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                  onClick={() => setShowRejectForm(true)}
                  variant="destructive"
                  className="flex-1"
                >
                  Reject
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setShowRejectForm(false)
                    setRejectionReason("")
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}