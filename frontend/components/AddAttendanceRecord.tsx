"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Loader2, CheckCircle, AlertCircle, User, MapPin, Camera, Calendar, Info, ArrowLeft, Save, Plus } from "lucide-react"
import { createAttendance, CreateAttendanceRequest, AttendanceRecord, createFieldEngineer } from "@/lib/server-api"
import { EmployeeIdGenerator } from "@/components/EmployeeIdGenerator"

interface AddAttendanceRecordProps {
  onRecordAdded?: (record: AttendanceRecord) => void
  onBack?: () => void
}

export function AddAttendanceRecord({ onRecordAdded, onBack }: AddAttendanceRecordProps) {
  const [loading, setLoading] = React.useState(false)
  const [showSuccess, setShowSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const [formData, setFormData] = React.useState({
    employeeId: '',
    employeeName: '',
    email: '',
    password: '',
    phone: '',
    isTeamLeader: false,
    status: 'PRESENT' as 'PRESENT' | 'LATE',
    location: '',
    photo: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.employeeId.trim()) {
      setError('Employee ID is required')
      return
    }

    if (!formData.employeeName.trim()) {
      setError('Employee name is required')
      return
    }

    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }

    if (!formData.password.trim()) {
      setError('Password is required')
      return
    }

    if (!formData.location.trim()) {
      setError('Location is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First, create the field engineer
      const fieldEngineerData = {
        name: formData.employeeName.trim(),
        employeeId: formData.employeeId.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        phone: formData.phone.trim() || undefined,
        isTeamLeader: formData.isTeamLeader
      }

      const fieldEngineerResponse = await createFieldEngineer(fieldEngineerData)
      
      if (!fieldEngineerResponse.success) {
        setError(fieldEngineerResponse.message || 'Failed to create field engineer')
        return
      }

      // Then, create the attendance record
      const attendanceData: CreateAttendanceRequest = {
        employeeId: formData.employeeId.trim(),
        latitude: 0, // Default coordinates for admin entries
        longitude: 0,
        status: formData.status,
        location: formData.location.trim(),
        photo: formData.photo || undefined
      }

      const response = await createAttendance(attendanceData)
      
      if (response.success && response.data) {
        // Convert the response to AttendanceRecord format
        const newRecord: AttendanceRecord = {
          id: `temp-${Date.now()}`, // Temporary ID
          employeeId: response.data.employeeId,
          employeeName: formData.employeeName,
          email: formData.email,
          phone: formData.phone,
          teamId: '',
          isTeamLeader: formData.isTeamLeader,
          date: new Date().toISOString().split('T')[0],
          clockIn: response.data.timestamp,
          status: response.data.status,
          location: formData.location,
          latitude: 0,
          longitude: 0,
          ipAddress: response.data.ipAddress,
          deviceInfo: response.data.deviceInfo,
          photo: response.data.photo,
          locked: false,
          lockedReason: '',
          attemptCount: 'ZERO',
          createdAt: response.data.timestamp,
          updatedAt: response.data.timestamp
        }

        onRecordAdded?.(newRecord)
        setShowSuccess(true)
        
        // Reset form after success
        setTimeout(() => {
          setFormData({
            employeeId: '',
            employeeName: '',
            email: '',
            password: '',
            phone: '',
            isTeamLeader: false,
            status: 'PRESENT',
            location: '',
            photo: ''
          })
          setShowSuccess(false)
          onBack?.()
        }, 2000)
      }
    } catch (error) {
      console.error('Error creating field engineer and attendance:', error)
      setError(error instanceof Error ? error.message : 'Failed to create field engineer and attendance record')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={onBack}
              className="h-10 w-10 p-0 border-gray-300 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add Attendance Record</h1>
              <p className="text-gray-600 mt-1">Create a new attendance record for an employee</p>
            </div>
          </div>
        </div>

        {showSuccess ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="border-green-200 bg-green-50 w-full max-w-md">
              <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-2xl font-semibold text-green-900">Success!</h3>
                  <p className="text-green-700 text-lg">Attendance record has been created successfully.</p>
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-sm px-4 py-2">
                    Record Added
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form - Left Side */}
            <div className="lg:col-span-2 space-y-8">
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900 text-lg">Error</h4>
                        <p className="text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Add New Field Engineer */}
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-green-900">
                      <Plus className="h-5 w-5" />
                      Add New Field Engineer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-800">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={formData.employeeName}
                          onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                          placeholder="Enter full name"
                          className="border-green-300 focus:border-green-500 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-800">
                          Employee ID <span className="text-red-500">*</span>
                        </Label>
                        <EmployeeIdGenerator
                          value={formData.employeeId}
                          onChange={(value) => setFormData(prev => ({ ...prev, employeeId: value }))}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-800">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="employee@company.com"
                          className="border-green-300 focus:border-green-500 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-800">
                          Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter password"
                          className="border-green-300 focus:border-green-500 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-800">
                          Phone (Optional)
                        </Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Phone number"
                          className="border-green-300 focus:border-green-500 focus:ring-green-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-green-800">
                          Role
                        </Label>
                        <Select 
                          value={formData.isTeamLeader ? 'leader' : 'engineer'} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, isTeamLeader: value === 'leader' }))}
                        >
                          <SelectTrigger className="border-green-300 focus:border-green-500 focus:ring-green-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="engineer">Field Engineer</SelectItem>
                            <SelectItem value="leader">Team Leader</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Details */}
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Clock className="h-5 w-5 text-green-600" />
                      </div>
                      Attendance Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="status" className="text-base font-medium text-gray-700">
                          Status
                        </Label>
                        <Select value={formData.status} onValueChange={(value: 'PRESENT' | 'LATE') => 
                          setFormData(prev => ({ ...prev, status: value }))
                        }>
                          <SelectTrigger className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRESENT">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Present
                              </div>
                            </SelectItem>
                            <SelectItem value="LATE">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                Late
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-medium text-gray-700">
                          Date & Time
                        </Label>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 h-12">
                          <Calendar className="h-5 w-5 text-gray-500" />
                          <span className="text-base text-gray-700 font-medium">
                            {new Date().toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location Information */}
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <MapPin className="h-5 w-5 text-orange-600" />
                      </div>
                      Location Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="location" className="text-base font-medium text-gray-700">
                        Work Location <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="location"
                        placeholder="Enter work location (e.g., Office - Floor 3, Remote, Client Site)"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Info className="h-4 w-4" />
                        <span>Specify where the employee is working today</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Photo Section */}
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Camera className="h-5 w-5 text-purple-600" />
                      </div>
                      Photo (Optional)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="photo" className="text-base font-medium text-gray-700">
                        Attendance Photo
                      </Label>
                      <Textarea
                        id="photo"
                        placeholder="Base64 encoded photo data (optional)"
                        value={formData.photo}
                        onChange={(e) => setFormData(prev => ({ ...prev, photo: e.target.value }))}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[120px] resize-none text-base"
                      />
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Info className="h-4 w-4" />
                        <span>You can paste base64 encoded image data here</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    className="flex-1 h-14 text-base border-gray-300 hover:bg-gray-50 font-medium"
                    disabled={loading}
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !formData.employeeId.trim() || !formData.employeeName.trim() || !formData.email.trim() || !formData.password.trim() || !formData.location.trim()}
                    className="flex-1 h-14 text-base bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-medium shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Creating Record...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        Create Record
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Sidebar - Right Side */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {/* Preview Card */}
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Record Preview</CardTitle>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Employee ID:</span>
                      <span className="font-medium text-gray-900">
                        {formData.employeeId || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Employee Name:</span>
                      <span className="font-medium text-gray-900">
                        {formData.employeeName || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium text-gray-900 text-xs">
                        {formData.email || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Role:</span>
                      <Badge className="bg-purple-100 text-purple-800">
                        {formData.isTeamLeader ? 'Team Leader' : 'Field Engineer'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <Badge className={formData.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                        {formData.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span className="font-medium text-gray-900">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time:</span>
                      <span className="font-medium text-gray-900">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-500 block mb-1">Location:</span>
                      <span className="font-medium text-gray-900 text-xs">
                        {formData.location || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Help Card */}
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Info className="h-4 w-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg text-blue-900 font-semibold">Quick Tips</CardTitle>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">Guidelines to help you fill out the form correctly</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-blue-200/50">
                      <div className="p-1 bg-blue-100 rounded-md shrink-0 mt-0.5">
                        <User className="h-3 w-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">New Field Engineer</p>
                        <p className="text-xs text-blue-700 mt-1">Creates both employee and attendance record</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-blue-200/50">
                      <div className="p-1 bg-green-100 rounded-md shrink-0 mt-0.5">
                        <Clock className="h-3 w-3 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Automatic Timestamp</p>
                        <p className="text-xs text-blue-700 mt-1">Time will be recorded automatically when you save</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-blue-200/50">
                      <div className="p-1 bg-orange-100 rounded-md shrink-0 mt-0.5">
                        <MapPin className="h-3 w-3 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Location Tracking</p>
                        <p className="text-xs text-blue-700 mt-1">Specify where the employee is working today</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-blue-200/50">
                      <div className="p-1 bg-purple-100 rounded-md shrink-0 mt-0.5">
                        <Camera className="h-3 w-3 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Photo Verification</p>
                        <p className="text-xs text-blue-700 mt-1">Optional but helps verify attendance</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-blue-200/50">
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <CheckCircle className="h-3 w-3" />
                      <span className="font-medium">All required fields must be completed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
