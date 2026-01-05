"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSession } from "next-auth/react"
import { 
  Camera, 
  MapPin, 
  CheckCircle, 
  XCircle,
  Wifi,
  Monitor,
  User,
  Building,
  AlertTriangle,
  Clock,
  MapPinIcon
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { 
  DeviceInfo, 
  LocationInfo, 
  createAttendance, 
  getRemainingAttempts, 
  getAssignedLocation,
  getLocationInfo,
  AssignedLocationResponse 
} from "@/lib/server-api"

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
  locationInfo?: LocationInfo | null
}

interface AttendanceData {
  employeeId: string
  timestamp: string
  location?: string
  locationInfo?: LocationInfo
  ipAddress?: string
  deviceInfo?: DeviceInfo
  photo?: string
  status: 'check-in' | 'check-out'
}

export function EmployeeSelfAttendance({ onAttendanceMarked, deviceInfo, locationInfo }: EmployeeSelfAttendanceProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [employeeId, setEmployeeId] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [ipAddress, setIpAddress] = useState<string>("")
  const [userLocationInfo, setUserLocationInfo] = useState<LocationInfo | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3)
  const [isLocked, setIsLocked] = useState(false)
  const [assignedLocation, setAssignedLocation] = useState<AssignedLocationResponse['data'] | null>(null)
  const [locationError, setLocationError] = useState<string>("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Auto-fill employee ID from session
  useEffect(() => {
    if (session?.user) {
      const user = session.user as CustomUser
      if (user.userType === 'employee' && user.employeeId) {
        setEmployeeId(user.employeeId)
      }
    }
  }, [session])

  // Get user's current location
  const getUserLocation = async () => {
    setLocationLoading(true)
    setLocationError("")
    try {
      // Get user's GPS coordinates
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'))
          return
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        })
      })

      const { latitude, longitude } = position.coords
      
      // Call backend API to get location info
      const locationData = await getLocationInfo(latitude, longitude)
      setUserLocationInfo(locationData)
    } catch (error) {
      console.error('Error getting location:', error)
      setLocationError('Failed to get your current location. Please enable location services.')
    } finally {
      setLocationLoading(false)
    }
  }

  // Check remaining attempts when employee ID changes
  const checkAttempts = async (empId: string) => {
    if (!empId.trim()) return
    
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

  // Get assigned location when employee ID changes
  const checkAssignedLocation = async (empId: string) => {
    if (!empId.trim()) return
    
    try {
      const response = await getAssignedLocation(empId)
      if (response.success && response.data) {
        setAssignedLocation(response.data)
      } else {
        setAssignedLocation(null)
      }
    } catch (error) {
      console.error('Error getting assigned location:', error)
      setAssignedLocation(null)
    }
  }

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch IP address
  useEffect(() => {
    const fetchIpAddress = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json')
        if (response.ok) {
          const data = await response.json()
          setIpAddress(data.ip)
        }
      } catch (error) {
        console.error('Error fetching IP address:', error)
        setIpAddress('Unknown')
      }
    }

    fetchIpAddress()
  }, [])

  // Check attempts and assigned location when employee ID changes
  useEffect(() => {
    if (employeeId.trim()) {
      checkAttempts(employeeId.trim())
      checkAssignedLocation(employeeId.trim())
    } else {
      setRemainingAttempts(3)
      setIsLocked(false)
      setAssignedLocation(null)
    }
  }, [employeeId])

  const startCamera = async () => {
    try {
      setCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const markAttendance = async (type: 'check-in' | 'check-out') => {
    if (!employeeId.trim()) {
      alert('Please enter your Employee ID')
      return
    }

    if (!cameraActive) {
      alert('Please start the camera first')
      return
    }

    if (isLocked) {
      alert('Your attendance is locked due to multiple failed location attempts. Contact your administrator.')
      return
    }

    if (!userLocationInfo && !locationInfo) {
      alert('Please get your current location first')
      return
    }

    setIsLoading(true)
    
    try {
      // Capture photo from video stream
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

      // Use current location info if available
      const locationData = userLocationInfo || locationInfo
      
      // Call the backend API
      const response = await createAttendance({
        employeeId: employeeId.trim(),
        latitude: locationData?.coordinates.latitude,
        longitude: locationData?.coordinates.longitude,
        photo: photoData,
        status: type === 'check-in' ? 'PRESENT' : 'PRESENT' 
      })

      if (response.success) {
        const attendanceData: AttendanceData = {
          employeeId: employeeId.trim(),
          timestamp: response.data?.timestamp || currentTime.toISOString(),
          location: response.data?.location || locationData?.humanReadableLocation || 'Location unavailable',
          locationInfo: locationData || undefined,
          ipAddress: response.data?.ipAddress || ipAddress,
          deviceInfo: deviceInfo || undefined,
          status: type
        }

        onAttendanceMarked?.(attendanceData)
        setAttendanceMarked(true)
        stopCamera()

        // Reset after 5 seconds
        setTimeout(() => {
          setAttendanceMarked(false)
          setEmployeeId("")
          setRemainingAttempts(3)
          setIsLocked(false)
          setAssignedLocation(null)
        }, 5000)
      } else {
        throw new Error(response.error || 'Failed to mark attendance')
      }
    } catch (error) {
      console.error('Error marking attendance:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to mark attendance: ${errorMessage}`)
      
      // Refresh attempts after error
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
      remainingAttempts > 0 &&
      (userLocationInfo || locationInfo)
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-gray-900">Employee Attendance</h1>
          <p className="text-xl text-gray-600">Mark your attendance with photo and location verification</p>
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

        {/* Time Display */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <div className="text-5xl font-black text-gray-900">{formatTime(currentTime)}</div>
              <div className="text-lg text-gray-600">{formatDate(currentTime)}</div>
            </div>
          </CardContent>
        </Card>

        {/* Location Validation Status */}
        {employeeId.trim() && (
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-blue-600" />
                Location Validation Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLocked ? (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Your attendance is locked due to multiple failed location attempts. Please contact your administrator.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Remaining Attempts:</span>
                      <Badge variant={remainingAttempts <= 1 ? "destructive" : remainingAttempts <= 2 ? "secondary" : "default"}>
                        {remainingAttempts}/3
                      </Badge>
                    </div>
                    {remainingAttempts <= 2 && (
                      <p className="text-xs text-orange-600">
                        Warning: {remainingAttempts === 0 ? "No attempts remaining" : `Only ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} left`}
                      </p>
                    )}
                  </div>
                  
                  {assignedLocation && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Assigned Location:</span>
                        <Badge variant="outline" className="text-xs">
                          Within 50m required
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>{assignedLocation.address || `${assignedLocation.city}, ${assignedLocation.state}`}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(assignedLocation.startTime).toLocaleTimeString()} - {new Date(assignedLocation.endTime).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Camera Section */}
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                Photo Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white space-y-3">
                      <Camera className="h-16 w-16 mx-auto opacity-50" />
                      <p className="text-sm opacity-75">Camera not active</p>
                    </div>
                  </div>
                )}
                
                {/* Camera overlay */}
                {cameraActive && (
                  <div className="absolute inset-4">
                    <div className="relative w-full h-full border-2 border-blue-400 rounded-lg">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {!cameraActive ? (
                  <Button 
                    onClick={startCamera}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button 
                    onClick={stopCamera}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Stop Camera
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Form */}
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Attendance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!attendanceMarked ? (
                <>
                  {/* Location Info */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location & Device Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Wifi className="h-4 w-4" />
                          IP Address:
                        </span>
                        <Badge variant="secondary">{ipAddress || 'Loading...'}</Badge>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Current Location:
                        </span>
                        <div className="text-right max-w-xs">
                          {userLocationInfo ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Located</Badge>
                              <div className="font-medium text-xs">
                                {userLocationInfo.location.city}, {userLocationInfo.location.state}
                              </div>
                              <div className="text-xs text-gray-500 wrap-break-word">
                                {userLocationInfo.location.address}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {userLocationInfo.coordinates.latitude.toFixed(4)}, {userLocationInfo.coordinates.longitude.toFixed(4)}
                              </Badge>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Button 
                                onClick={getUserLocation} 
                                disabled={locationLoading}
                                size="sm" 
                                variant="outline" 
                                className="text-xs"
                              >
                                {locationLoading ? 'Getting location...' : 'Get My Location'}
                              </Button>
                              {locationError && (
                                <p className="text-xs text-red-600">{locationError}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Device:
                        </span>
                        <span className="font-medium text-xs">
                          {deviceInfo ? `${deviceInfo.device} - ${deviceInfo.browser} on ${deviceInfo.os}` : 'Loading...'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Buttons */}
                  <div className="space-y-3">
                    {!canMarkAttendance() && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          {isLocked ? "🔒 Attendance locked due to failed location attempts" :
                           remainingAttempts === 0 ? "❌ No attempts remaining" :
                           !employeeId.trim() ? "👤 Please enter your Employee ID" :
                           !cameraActive ? "📷 Please start the camera" :
                           !userLocationInfo && !locationInfo ? "📍 Please get your current location" :
                           "⚠️ Complete all requirements above"}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => markAttendance('check-in')}
                        disabled={!canMarkAttendance()}
                        className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        size="lg"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Processing...
                          </div>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Check In
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => markAttendance('check-out')}
                        disabled={!canMarkAttendance()}
                        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                        size="lg"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Processing...
                          </div>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Check Out
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4 py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-green-900">Attendance Marked!</h3>
                    <p className="text-gray-600">Your attendance has been successfully recorded.</p>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Employee ID: {employeeId}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900">1. Get Location</h4>
                <p className="text-sm text-gray-600">Allow location access and verify you&apos;re at the assigned location</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900">2. Start Camera</h4>
                <p className="text-sm text-gray-600">Allow camera access for photo verification</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900">3. Mark Attendance</h4>
                <p className="text-sm text-gray-600">Click Check In or Check Out to record attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}