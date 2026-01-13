"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSession } from "next-auth/react"
import { showToast } from "@/lib/toast-utils"
import { Camera, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react"
import { useEffect, useRef, useState, useCallback } from "react"
import { DeviceInfo, createAttendance, getRemainingAttempts, getAttendanceRecords, getEmployeeTasks, AssignedTask, getEmployeeByEmployeeId } from "@/lib/server-api"

interface CustomUser {
  id: string
  email: string
  name: string
  userType: string
  employeeId?: string
}

interface EmployeeSelfAttendanceProps {
  onAttendanceMarked?: (data: AttendanceData) => void
  deviceInfo?: DeviceInfo
}

interface AttendanceData {
  employeeId: string
  timestamp: string
  location?: string
  ipAddress?: string
  deviceInfo?: DeviceInfo
  photo?: string
  status: 'check-in' | 'check-out'
}

export function EmployeeSelfAttendance({ onAttendanceMarked, deviceInfo }: EmployeeSelfAttendanceProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [currentAttendanceStatus, setCurrentAttendanceStatus] = useState<{
    hasCheckedIn: boolean
    hasCheckedOut: boolean
    clockIn?: string
    clockOut?: string
    hasAdminRecord?: boolean
  } | null>(null)
  const [employeeId, setEmployeeId] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [ipAddress, setIpAddress] = useState<string>("")
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3)
  const [isLocked, setIsLocked] = useState(false)
  const [currentTasks, setCurrentTasks] = useState<AssignedTask[]>([])
  const [employeeRole, setEmployeeRole] = useState<'FIELD_ENGINEER' | 'IN_OFFICE' | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Auto-fill employee ID from session
  useEffect(() => {
    if (session?.user) {
      const user = session.user as CustomUser
      if (user.userType === 'EMPLOYEE' && user.employeeId) {
        setEmployeeId(user.employeeId)
      }
    }
  }, [session])

  // Get employee role
  const getEmployeeRole = async (empId: string) => {
    try {
      const response = await getEmployeeByEmployeeId(empId)
      if (response.success && response.data && response.data.role) {
        const role = response.data.role as 'FIELD_ENGINEER' | 'IN_OFFICE'
        setEmployeeRole(role)
      }
    } catch (error) {
      console.error('Error getting employee role:', error)
    }
  }

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Get IP address
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('Unknown'))
  }, [])

  // Check remaining attempts
  const checkAttempts = async (empId: string) => {
    try {
      const response = await getRemainingAttempts(empId)
      if (response.success) {
        setRemainingAttempts(response.data.remainingAttempts)
        setIsLocked(response.data.isLocked)
      }
    } catch (error) {
      console.error('Error checking attempts:', error)
    }
  }

  // Check current tasks
  const checkCurrentTasks = async (empId: string) => {
    try {
      const response = await getEmployeeTasks(empId)
      if (response.success && response.data) {
        const pendingTasks = response.data.tasks.filter(
          (task: AssignedTask) => task.status === 'PENDING' || task.status === 'IN_PROGRESS'
        )
        setCurrentTasks(pendingTasks)
      }
    } catch (error) {
      console.error('Error getting current tasks:', error)
    }
  }

  // Check current attendance status
  const checkCurrentAttendanceStatus = useCallback(async (empId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await getAttendanceRecords({
        employeeId: empId,
        date: today,
        limit: 1
      })

      if (response.success && response.data && response.data.records.length > 0) {
        const record = response.data.records[0]
        setCurrentAttendanceStatus({
          hasCheckedIn: !!record.clockIn,
          hasCheckedOut: !!record.clockOut,
          clockIn: record.clockIn,
          clockOut: record.clockOut,
          hasAdminRecord: record.source === 'ADMIN'
        })
      } else {
        setCurrentAttendanceStatus({
          hasCheckedIn: false,
          hasCheckedOut: false
        })
      }
    } catch (error) {
      console.error('Error checking attendance status:', error)
      setCurrentAttendanceStatus({
        hasCheckedIn: false,
        hasCheckedOut: false
      })
    }
  }, [])

  // Check attempts and tasks when employee ID changes
  useEffect(() => {
    if (employeeId.trim()) {
      checkAttempts(employeeId.trim())
      checkCurrentTasks(employeeId.trim())
      getEmployeeRole(employeeId.trim())
    } else {
      setRemainingAttempts(3)
      setIsLocked(false)
      setCurrentTasks([])
      setCurrentAttendanceStatus(null)
      setEmployeeRole(null)
    }
  }, [employeeId])

  // Check attendance status when tasks change
  useEffect(() => {
    if (employeeId.trim()) {
      checkCurrentAttendanceStatus(employeeId.trim())
    }
  }, [currentTasks, employeeId, checkCurrentAttendanceStatus])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      setCameraLoading(true)
      setCameraActive(false)

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(true)
          }
        })
      }

      setCameraActive(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      setCameraActive(false)

      let errorMessage = 'Failed to access camera. '
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera permissions and try again.'
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.'
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Camera is not supported in this browser.'
        } else {
          errorMessage += error.message
        }
      }

      showToast.error(errorMessage)
    } finally {
      setCameraLoading(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const markAttendance = async (type: 'check-in' | 'check-out') => {
    if (!employeeId.trim()) {
      showToast.error('Please enter your Employee ID')
      return
    }

    if (!cameraActive) {
      showToast.error('Please start the camera first')
      return
    }

    if (isLocked) {
      showToast.error('Your attendance is locked. Contact your administrator.')
      return
    }

    if (type === 'check-out' && !currentAttendanceStatus?.hasCheckedIn) {
      showToast.warning('You need to check in first before checking out.')
      return
    }

    if (type === 'check-out' && currentAttendanceStatus?.hasCheckedOut) {
      showToast.warning('You have already checked out today.')
      return
    }

    if (type === 'check-in' && currentAttendanceStatus?.hasCheckedIn) {
      showToast.warning('You have already checked in today.')
      return
    }

    setIsLoading(true)

    try {
      let photoData: string | undefined
      if (videoRef.current) {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (context) {
          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          context.drawImage(videoRef.current, 0, 0)
          photoData = canvas.toDataURL('image/jpeg', 0.8)
        }
      }

      const response = await createAttendance({
        employeeId: employeeId.trim(),
        photo: photoData,
        status: type === 'check-in' ? 'PRESENT' : 'PRESENT',
        location: `${employeeRole === 'IN_OFFICE' ? 'Office' : 'Field'} Location`,
        action: type
      })

      if (response.success) {
        const attendanceData: AttendanceData = {
          employeeId: employeeId.trim(),
          timestamp: response.data?.timestamp || currentTime.toISOString(),
          location: response.data?.location || `${employeeRole === 'IN_OFFICE' ? 'Office' : 'Field'} Location`,
          ipAddress: response.data?.ipAddress || ipAddress,
          deviceInfo: deviceInfo || undefined,
          status: type
        }

        showToast.success(`${type === 'check-in' ? 'Check-in' : 'Check-out'} successful!`, 'Attendance Marked')
        onAttendanceMarked?.(attendanceData)
        setAttendanceMarked(true)
        stopCamera()

        if (type === 'check-in') {
          if (!currentAttendanceStatus?.hasCheckedIn) {
            setCurrentAttendanceStatus({
              hasCheckedIn: true,
              hasCheckedOut: false,
              clockIn: new Date().toISOString()
            })
          }
        } else if (type === 'check-out') {
          setCurrentAttendanceStatus(prev => ({
            ...prev!,
            hasCheckedOut: true,
            clockOut: new Date().toISOString()
          }))
          if (employeeId.trim()) {
            setTimeout(() => {
              checkCurrentTasks(employeeId.trim())
            }, 1000)
          }
        }

        setTimeout(() => {
          setAttendanceMarked(false)
        }, 5000)
      } else {
        throw new Error(response.error || 'Failed to mark attendance')
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showToast.error(`Failed to mark attendance: ${errorMessage}`)

      if (employeeId.trim()) {
        checkAttempts(employeeId.trim())
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const canMarkAttendance = () => {
    return (
      cameraActive &&
      employeeId.trim() &&
      !isLoading &&
      !isLocked &&
      remainingAttempts > 0
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-gray-900">Employee Attendance</h1>
          <p className="text-xl text-gray-600">Mark your attendance with photo verification</p>
          {session?.user && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge variant="outline" className="text-sm px-3 py-1">
                Welcome, {session.user.name}
              </Badge>
              {(session.user as CustomUser).employeeId && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  ID: {(session.user as CustomUser).employeeId}
                </Badge>
              )}
            </div>
          )}
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <div className="text-5xl font-black text-gray-900">{formatTime(currentTime)}</div>
              <div className="text-lg text-gray-600">{formatDate(currentTime)}</div>
            </div>
          </CardContent>
        </Card>

        {employeeId.trim() && currentAttendanceStatus && (
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Today&apos;s Attendance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Check-in Status:</span>
                    <Badge variant={currentAttendanceStatus.hasCheckedIn ? "default" : "secondary"}>
                      {currentAttendanceStatus.hasCheckedIn ? "Checked In" : "Not Checked In"}
                    </Badge>
                  </div>
                  {currentAttendanceStatus.clockIn && (
                    <p className="text-xs text-gray-600">
                      Time: {new Date(currentAttendanceStatus.clockIn).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Check-out Status:</span>
                    <Badge variant={currentAttendanceStatus.hasCheckedOut ? "default" : "secondary"}>
                      {currentAttendanceStatus.hasCheckedOut ? "Checked Out" : "Not Checked Out"}
                    </Badge>
                  </div>
                  {currentAttendanceStatus.clockOut && (
                    <p className="text-xs text-gray-600">
                      Time: {new Date(currentAttendanceStatus.clockOut).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              Camera
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-80 h-60 bg-gray-100 rounded-lg border-2 ${
                    cameraActive ? 'border-green-500' : 'border-gray-300'
                  }`}
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <Camera className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <Button
                onClick={startCamera}
                disabled={cameraActive || cameraLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {cameraLoading ? 'Starting...' : 'Start Camera'}
              </Button>
              <Button
                onClick={stopCamera}
                disabled={!cameraActive}
                variant="outline"
              >
                Stop Camera
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLocked && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Your attendance is locked. Please contact your administrator.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={() => markAttendance('check-in')}
                disabled={!canMarkAttendance() || currentAttendanceStatus?.hasCheckedIn}
                className="h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-6 w-6 mr-2" />
                Check In
              </Button>
              <Button
                onClick={() => markAttendance('check-out')}
                disabled={!canMarkAttendance() || !currentAttendanceStatus?.hasCheckedIn || currentAttendanceStatus?.hasCheckedOut}
                className="h-16 text-lg bg-red-600 hover:bg-red-700 text-white"
              >
                <XCircle className="h-6 w-6 mr-2" />
                Check Out
              </Button>
            </div>

            {!canMarkAttendance() && (
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800 font-medium">
                  {!cameraActive ? "📷 Please start the camera first" :
                   !employeeId.trim() ? "👤 Please enter your Employee ID" :
                   isLocked ? "🔒 Attendance is locked" :
                   remainingAttempts <= 0 ? "❌ No attempts remaining" :
                   "⚠️ Complete all requirements above"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {attendanceMarked && (
          <Card className="bg-green-50 border-green-200 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">Attendance Marked Successfully!</h3>
                <p className="text-green-700">Your attendance has been recorded.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}