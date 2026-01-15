"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  MapPin, 
  User, 
  Calendar, 
  AlertCircle,
  LogOut,
  FileText,
  DollarSign,
  Car,
  Upload
} from "lucide-react"
import { EmployeeSelfAttendance } from "./EmployeeSelfAttendance"
import { LeaveApplicationForm } from "./LeaveApplicationForm"
import { LeaveApplicationsList } from "./LeaveApplicationsList"
import { EmployeeDocuments } from "./EmployeeDocuments"
import { type DeviceInfo, getMyFeatures, type StaffPortalFeature } from "@/lib/server-api"
import { dayClockOut } from "@/lib/server-api"
import { showToast, showConfirm } from "@/lib/toast-utils"

interface StaffPortalProps {
  deviceInfo: DeviceInfo | undefined
}

interface EmployeeProfile {
  id: string
  name: string
  employeeId: string
  email: string
  phone?: string
  teamId?: string
  isTeamLeader: boolean
  status: string
  role?: string
}

interface AssignedVehicle {
  id: string
  vehicleNumber: string
  make: string
  model: string
  type: string
  assignedAt: string
}

export function StaffPortal({ deviceInfo }: StaffPortalProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null)
  const [assignedVehicle, setAssignedVehicle] = useState<AssignedVehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'documents' | 'payroll' | 'vehicle' | 'tasks' | 'dashboard' | 'project'>('attendance')
  const [leaveRefreshTrigger, setLeaveRefreshTrigger] = useState(0)
  const [dayClockOutLoading, setDayClockOutLoading] = useState(false)
  const [todayAttendance, setTodayAttendance] = useState<{
    hasCheckedIn: boolean
    hasClockedOut: boolean
    clockIn?: string
    clockOut?: string
  } | null>(null)
  const [allowedFeatures, setAllowedFeatures] = useState<StaffPortalFeature[]>([])

  useEffect(() => {
    if (status === "loading") return

    if (!session || (session.user as { userType?: string })?.userType !== "EMPLOYEE") {
      router.push("/")
      return
    }

    fetchEmployeeProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router])

  // Fetch features after profile is loaded
  useEffect(() => {
    if (employeeProfile) {
      fetchAllowedFeatures()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeProfile])

  // Check today's attendance when profile loads or attendance tab is active
  useEffect(() => {
    if (employeeProfile?.role === 'FIELD_ENGINEER' && activeTab === 'attendance') {
      checkTodayAttendance()
      // Poll every 5 seconds to keep attendance status updated
      const interval = setInterval(checkTodayAttendance, 5000)
      return () => clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeProfile, activeTab])

  const fetchAllowedFeatures = async () => {
    try {
      // Only fetch features for IN_OFFICE employees
      if (employeeProfile?.role !== 'IN_OFFICE') {
        setAllowedFeatures([])
        return
      }

      const response = await getMyFeatures()

      if (response.success && response.data) {
        setAllowedFeatures(response.data.allowedFeatures)
      } else {
        // If no features are set, default to empty array
        setAllowedFeatures([])
      }
    } catch (error) {
      console.error('Error fetching allowed features:', error)
      setAllowedFeatures([])
    }
  }

  const hasFeatureAccess = (feature: StaffPortalFeature): boolean => {
    // Field engineers don't use feature access system
    if (employeeProfile?.role === 'FIELD_ENGINEER') {
      return false
    }
    return allowedFeatures.includes(feature)
  }

  const fetchEmployeeProfile = async () => {
    try {
      if (!session?.user) return

      const employeeId = (session.user as { employeeId?: string })?.employeeId
      if (!employeeId) return

      // Try to fetch from employees endpoint first (works for both field engineers and in-office)
      let profileResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees/by-employee-id/${employeeId}`)
      
      // If that fails, try field-engineers endpoint (for backward compatibility)
      if (!profileResponse.ok) {
        profileResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/field-engineers/${employeeId}`)
      }

      // Fetch assigned vehicle (only for field engineers)
      if (profileResponse.ok) {
        const result = await profileResponse.json()
        if (result.success && result.data) {
          setEmployeeProfile({
            id: result.data.id,
            name: result.data.name,
            employeeId: result.data.employeeId,
            email: result.data.email,
            phone: result.data.phone,
            teamId: result.data.teamId,
            isTeamLeader: result.data.isTeamLeader,
            status: result.data.status,
            role: result.data.role // Include role information
          })
        } else {
          // Fallback to session data
          setEmployeeProfile({
            id: session.user.id,
            name: session.user.name || "Employee",
            employeeId: employeeId,
            email: session.user.email || "",
            phone: undefined,
            teamId: undefined,
            isTeamLeader: false,
            status: "ACTIVE",
            role: undefined
          })
        }
      } else {
        // Fallback to session data
        setEmployeeProfile({
          id: session.user.id,
          name: session.user.name || "Employee",
          employeeId: employeeId,
          email: session.user.email || "",
          phone: undefined,
          teamId: undefined,
          isTeamLeader: false,
          status: "ACTIVE",
          role: undefined
        })
      }

      // Fetch assigned vehicle (only relevant for field engineers)
      const vehicleResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vehicles/employee/${employeeId}`)
      if (vehicleResponse.ok) {
        const vehicleResult = await vehicleResponse.json()
        if (vehicleResult.success && vehicleResult.data) {
          setAssignedVehicle({
            id: vehicleResult.data.id,
            vehicleNumber: vehicleResult.data.vehicleNumber,
            make: vehicleResult.data.make,
            model: vehicleResult.data.model,
            type: vehicleResult.data.type,
            assignedAt: vehicleResult.data.assignedAt
          })
        }
      }
    } catch (error) {
      console.error("Error fetching employee profile:", error)
      // Fallback to session data
      if (session?.user) {
        const employeeId = (session.user as { employeeId?: string })?.employeeId || ""
        setEmployeeProfile({
          id: session.user.id,
          name: session.user.name || "Employee",
          employeeId: employeeId,
          email: session.user.email || "",
          phone: undefined,
          teamId: undefined,
          isTeamLeader: false,
          status: "ACTIVE",
          role: undefined
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const checkTodayAttendance = async () => {
    if (!employeeProfile?.employeeId) return

    try {
      const { getAttendanceRecords } = await import("@/lib/server-api")
      const today = new Date().toISOString().split('T')[0]
      const response = await getAttendanceRecords({
        employeeId: employeeProfile.employeeId,
        date: today,
        limit: 1
      })

      if (response.success && response.data && response.data.records.length > 0) {
        const record = response.data.records[0]
        setTodayAttendance({
          hasCheckedIn: !!record.clockIn,
          hasClockedOut: !!record.clockOut,
          clockIn: record.clockIn,
          clockOut: record.clockOut
        })
      } else {
        setTodayAttendance({
          hasCheckedIn: false,
          hasClockedOut: false
        })
      }
    } catch (error) {
      console.error('Error checking today attendance:', error)
    }
  }

  const handleDayClockOut = async () => {
    if (!employeeProfile?.employeeId) return

    showConfirm(
      'Are you sure you want to clock out for the day? This will end your work day and unassign your vehicle.',
      async () => {
        try {
          setDayClockOutLoading(true)
          const response = await dayClockOut(employeeProfile.employeeId)

          if (response.success) {
            showToast.success('Day clock-out successful!', 'You have clocked out for the day')
            // Refresh attendance status
            checkTodayAttendance()
          } else {
            showToast.error(response.message || 'Failed to clock out')
          }
        } catch (error) {
          console.error('Error clocking out:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to clock out'
          showToast.error(errorMessage)
        } finally {
          setDayClockOutLoading(false)
        }
      },
      'Day Clock-Out'
    )
  }

  const handleLogout = () => {
    signOut({ 
      callbackUrl: '/',
      redirect: true 
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800"
      case "INACTIVE":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!employeeProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">Unable to load your employee profile.</p>
            <Button onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Staff Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/employee-attendance")}
                className="text-gray-600 hover:text-gray-900"
              >
                <FileText className="h-4 w-4 mr-2" />
                Full Attendance
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
        
        {/* Topbar Navigation */}
        <div className="border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'attendance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MapPin className="h-4 w-4 inline mr-2" />
                Attendance
              </button>
              {hasFeatureAccess('DASHBOARD') && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'dashboard'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Dashboard
                </button>
              )}
              {hasFeatureAccess('PROJECT') && (
                <button
                  onClick={() => setActiveTab('project')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'project'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Project
                </button>
              )}
              {hasFeatureAccess('TASK_MANAGEMENT') && (
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'tasks'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Task Management
                </button>
              )}
              <button
                onClick={() => setActiveTab('leave')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'leave'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Leave
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Documents
              </button>
              <button
                onClick={() => setActiveTab('payroll')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'payroll'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-4 w-4 inline mr-2" />
                Payroll
              </button>
              {employeeProfile?.role === 'FIELD_ENGINEER' && (
                <button
                  onClick={() => setActiveTab('vehicle')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'vehicle'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Car className="h-4 w-4 inline mr-2" />
                  Vehicle
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {employeeProfile.name}! 👋
          </h2>
          <p className="text-gray-600 mt-1">
            Here&apos;s your staff portal dashboard. Manage your attendance and view your profile.
          </p>
          {employeeProfile.role === 'IN_OFFICE' && allowedFeatures.length === 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ Additional features (Dashboard, Project, Task Management) can be enabled by your administrator.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${employeeProfile.name}`} 
                      alt={employeeProfile.name} 
                    />
                    <AvatarFallback className="text-lg">
                      {getInitials(employeeProfile.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl">{employeeProfile.name}</CardTitle>
                <p className="text-gray-600">{employeeProfile.employeeId}</p>
                <Badge className={getStatusColor(employeeProfile.status)}>
                  {employeeProfile.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{employeeProfile.email}</span>
                </div>
                {employeeProfile.phone && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{employeeProfile.phone}</span>
                  </div>
                )}
                {employeeProfile.teamId && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">Team: {employeeProfile.teamId}</span>
                  </div>
                )}
                {employeeProfile.isTeamLeader && (
                  <Badge variant="secondary">Team Leader</Badge>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Today&apos;s Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Status</span>
                  </div>
                  <Badge variant="outline">Not Checked In</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Date</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'attendance' && (
              <>
                {/* Day Clock-Out Button for Field Engineers */}
                {employeeProfile?.role === 'FIELD_ENGINEER' && todayAttendance && (
                  <Card className="mb-6 bg-linear-to-r from-orange-50 to-red-50 border-orange-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-600" />
                            Day Clock-Out
                          </h3>
                          <p className="text-sm text-gray-600">
                            End your work day and clock out. This is separate from task check-in/check-out.
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Check-in:</span>
                              <Badge variant={todayAttendance.hasCheckedIn ? "default" : "secondary"}>
                                {todayAttendance.hasCheckedIn 
                                  ? new Date(todayAttendance.clockIn!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                  : 'Not checked in'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Clock-out:</span>
                              <Badge variant={todayAttendance.hasClockedOut ? "default" : "secondary"}>
                                {todayAttendance.hasClockedOut 
                                  ? new Date(todayAttendance.clockOut!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                  : 'Not clocked out'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={handleDayClockOut}
                          disabled={!todayAttendance.hasCheckedIn || todayAttendance.hasClockedOut || dayClockOutLoading}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-6 text-lg"
                          size="lg"
                        >
                          {dayClockOutLoading ? (
                            <>
                              <Clock className="h-5 w-5 mr-2 animate-spin" />
                              Clocking Out...
                            </>
                          ) : (
                            <>
                              <Clock className="h-5 w-5 mr-2" />
                              Clock Out for Day
                            </>
                          )}
                        </Button>
                      </div>
                      {!todayAttendance.hasCheckedIn && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⚠️ You need to check in first before you can clock out for the day.
                          </p>
                        </div>
                      )}
                      {todayAttendance.hasClockedOut && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            ✓ You have already clocked out for the day.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      <span>Attendance Management</span>
                    </CardTitle>
                    <p className="text-gray-600">
                      Mark your attendance with photo verification
                    </p>
                  </CardHeader>
                  <CardContent>
                    <EmployeeSelfAttendance deviceInfo={deviceInfo} />
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'leave' && (
              <div className="space-y-6">
                <LeaveApplicationForm 
                  employeeId={employeeProfile.employeeId}
                  employeeName={employeeProfile.name}
                  onSuccess={() => setLeaveRefreshTrigger(prev => prev + 1)}
                />
                <LeaveApplicationsList 
                  employeeId={employeeProfile.employeeId}
                  refreshTrigger={leaveRefreshTrigger}
                />
              </div>
            )}

            {activeTab === 'documents' && (
              <EmployeeDocuments employeeId={employeeProfile.employeeId} />
            )}

            {activeTab === 'payroll' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span>Payroll Information</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    View your salary details and payment history
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Payroll Information</h3>
                    <p className="text-gray-600 mb-4">
                      Your payroll details will be available here once processed by admin.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 text-left">
                      <h4 className="font-medium text-gray-900 mb-2">Current Month Status</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <Badge variant="outline">Pending</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Month:</span>
                          <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'dashboard' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span>Dashboard</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Access the main dashboard
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Main Dashboard</h3>
                    <p className="text-gray-600 mb-6">
                      Click below to access the main dashboard
                    </p>
                    <Button
                      onClick={() => router.push('/dashboard')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'project' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span>Project Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Access the project management system
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Project Management System</h3>
                    <p className="text-gray-600 mb-6">
                      Click below to access the full project management system
                    </p>
                    <Button
                      onClick={() => router.push('/projects')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Project Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'tasks' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span>Task Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Access the task management system
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Task Management System</h3>
                    <p className="text-gray-600 mb-6">
                      Click below to access the full task management system
                    </p>
                    <Button
                      onClick={() => router.push('/attendance')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Task Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'vehicle' && employeeProfile?.role === 'FIELD_ENGINEER' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Car className="h-5 w-5 text-blue-500" />
                    <span>Vehicle Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    View your assigned vehicle and upload petrol bills
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Assigned Vehicle Info */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Assigned Vehicle</h4>
                      {assignedVehicle ? (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center space-x-3">
                            <Car className="h-8 w-8 text-blue-600" />
                            <div>
                              <h5 className="font-medium text-blue-900">{assignedVehicle.vehicleNumber}</h5>
                              <p className="text-blue-700 text-sm">
                                {assignedVehicle.make} {assignedVehicle.model} ({assignedVehicle.type})
                              </p>
                              <p className="text-blue-600 text-xs">
                                Assigned on: {new Date(assignedVehicle.assignedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <Car className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">No vehicle assigned</p>
                        </div>
                      )}
                    </div>

                    {/* Petrol Bill Upload */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Upload Petrol Bill</h4>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 mb-2">Upload your petrol bill receipt</p>
                        <p className="text-xs text-gray-500 mb-4">
                          Supported formats: JPG, PNG, PDF (Max 5MB)
                        </p>
                        <Button variant="outline" disabled>
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          Image upload functionality will be integrated with third-party service
                        </p>
                      </div>
                    </div>

                    {/* Recent Bills */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Recent Bills</h4>
                      <div className="space-y-2">
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No bills uploaded yet</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}