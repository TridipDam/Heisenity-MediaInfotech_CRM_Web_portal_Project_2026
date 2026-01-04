"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Camera, 
  MapPin, 
  CheckCircle, 
  XCircle,
  Wifi,
  Monitor,
  User,
  Building,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { DeviceInfo, LocationInfo } from "@/lib/server-api"

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
  const [isLoading, setIsLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [employeeId, setEmployeeId] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [ipAddress, setIpAddress] = useState<string>("")
  const [userLocationInfo, setUserLocationInfo] = useState<LocationInfo | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Get user's current location
  const getUserLocation = async () => {
    setLocationLoading(true)
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
      const response = await fetch(`/api/location?latitude=${latitude}&longitude=${longitude}`)
      if (response.ok) {
        const locationData = await response.json()
        setUserLocationInfo(locationData)
      }
    } catch (error) {
      console.error('Error getting location:', error)
    } finally {
      setLocationLoading(false)
    }
  }

  // Debug logging
  console.log('EmployeeSelfAttendance props:', { deviceInfo, locationInfo })

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch IP address and get user location
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

    setIsLoading(true)
    
    try {
      // Here you would typically send the attendance data to your backend
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const attendanceData: AttendanceData = {
        employeeId: employeeId.trim(),
        timestamp: currentTime.toISOString(),
        location: locationInfo?.humanReadableLocation || 'Location unavailable',
        locationInfo: locationInfo || undefined,
        ipAddress: ipAddress,
        deviceInfo: deviceInfo || undefined,
        status: type
      }

      onAttendanceMarked?.(attendanceData)
      setAttendanceMarked(true)
      setIsLoading(false)
      stopCamera()

      // Reset after 5 seconds
      setTimeout(() => {
        setAttendanceMarked(false)
        setEmployeeId("")
      }, 5000)
    } catch (error) {
      console.error('Error marking attendance:', error)
      setIsLoading(false)
      alert('Failed to mark attendance. Please try again.')
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

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-gray-900">Employee Attendance</h1>
          <p className="text-xl text-gray-600">Mark your attendance with photo verification</p>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Employee ID</label>
                    <Input
                      placeholder="Enter your Employee ID"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="text-lg"
                    />
                  </div>

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
                          Location:
                        </span>
                        <div className="text-right max-w-xs">
                          {/* User's current location only */}
                          {userLocationInfo ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Current Location</Badge>
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
                            <Button 
                              onClick={getUserLocation} 
                              disabled={locationLoading}
                              size="sm" 
                              variant="outline" 
                              className="text-xs"
                            >
                              {locationLoading ? 'Getting location...' : 'Get My Location'}
                            </Button>
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
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => markAttendance('check-in')}
                      disabled={!cameraActive || !employeeId.trim() || isLoading}
                      className="bg-green-600 hover:bg-green-700 text-white"
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
                      disabled={!cameraActive || !employeeId.trim() || isLoading}
                      className="bg-red-600 hover:bg-red-700 text-white"
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
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900">1. Enter ID</h4>
                <p className="text-sm text-gray-600">Enter your employee ID to identify yourself</p>
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