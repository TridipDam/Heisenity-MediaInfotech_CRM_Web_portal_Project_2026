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
  Car,
  Upload,
  QrCode
} from "lucide-react"
import { EmployeeSelfAttendance } from "./EmployeeSelfAttendance"
import { LeaveApplicationForm } from "./LeaveApplicationForm"
import { LeaveApplicationsList } from "./LeaveApplicationsList"
import { EmployeeDocuments } from "./EmployeeDocuments"
import { StaffTicketForm } from "./StaffTicketForm"
import { StaffTicketList } from "./StaffTicketList"
import { TaskCheckInOut } from "@/components/TaskCheckInOut"
import BarcodeScanner from "@/components/barcodeScanner/BarcodeScanner"
import { getMyFeatures, type StaffPortalFeature } from "@/lib/server-api"
import { dayClockOut } from "@/lib/server-api"
import { showToast, showConfirm } from "@/lib/toast-utils"
import { playNotificationSound } from "@/lib/notification-sound"


interface EmployeeProfile {
  id: string
  name: string
  employeeId: string
  email: string
  phone?: string
  teamId?: string
  team?: {
    id: string
    name: string
  }
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

export function StaffPortal() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null)
  const [assignedVehicle, setAssignedVehicle] = useState<AssignedVehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'documents' | 'vehicle' | 'tasks' | 'dashboard' | 'project' | 'task_management' | 'tickets' | 'customers' | 'employees' | 'teams' | 'tenders' | 'stock' | 'leave_management' | 'field_engineer_attendance' | 'inoffice_attendance' | 'customer_support_requests' | 'staff_feature_access'>('attendance')
  const [leaveRefreshTrigger, setLeaveRefreshTrigger] = useState(0)
  const [ticketRefreshTrigger, setTicketRefreshTrigger] = useState(0)
  const [dayClockOutLoading, setDayClockOutLoading] = useState(false)
  const [pendingSupportRequests, setPendingSupportRequests] = useState(0)
  const [allowedFeatures, setAllowedFeatures] = useState<StaffPortalFeature[]>([])
  const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null)

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
      // Fetch support requests if IN_OFFICE employee
      if (employeeProfile.role === 'IN_OFFICE') {
        fetchPendingSupportRequests()
        // Poll every 30 seconds for new support requests
        const interval = setInterval(fetchPendingSupportRequests, 30000)
        return () => clearInterval(interval)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeProfile])

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
    // Field engineers have no access to staff features by default
    if (employeeProfile?.role === 'FIELD_ENGINEER') {
      const fieldEngineerBuiltInFeatures = ['VEHICLE']
      return fieldEngineerBuiltInFeatures.includes(feature)
    }
    // IN_OFFICE employees need explicit feature access
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
            team: result.data.team, // Include team object with name
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
        } else {
          // ✅ IMPORTANT: clear stale state
          setAssignedVehicle(null)
        }
      } else {
        // ✅ vehicle endpoint returns 404 when unassigned
        setAssignedVehicle(null)
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

  const fetchPendingSupportRequests = async () => {
    if (!employeeProfile || employeeProfile.role !== 'IN_OFFICE') return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/customer-support/pending`,
        {
          headers: {
            Authorization: `Bearer ${(session?.user as { sessionToken?: string })?.sessionToken}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setPendingSupportRequests(data.data?.length || 0)
      }
    } catch (error) {
      console.error("Error fetching support requests:", error)
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
            // Play notification sound for successful clock-out
            playNotificationSound()
            await fetchEmployeeProfile()
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

  const handleProductScan = (productId: string) => {
    setLastScannedProduct(productId)
    // Auto-hide notification after 5 seconds
    setTimeout(() => setLastScannedProduct(null), 5000)
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
      {/* Scan notification */}
      {lastScannedProduct && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2">
          <QrCode className="h-4 w-4" />
          <span className="text-sm font-medium">Product {lastScannedProduct} scanned!</span>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Staff Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Barcode Scanner - Only for Field Engineers */}
              {employeeProfile?.role === 'FIELD_ENGINEER' && (
                <div className="flex items-center justify-center">
                  <BarcodeScanner 
                    onScan={handleProductScan}
                  />
                </div>
              )}
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
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'attendance'
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
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'dashboard'
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
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'project'
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
                  onClick={() => setActiveTab('task_management')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'task_management'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Task Management
                </button>
              )}
              {employeeProfile?.role === 'FIELD_ENGINEER' && (
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tasks'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Task Management
                </button>
              )}
              {employeeProfile?.role === 'IN_OFFICE' && (
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tickets'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Tickets
                </button>
              )}
              <button
                onClick={() => setActiveTab('leave')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'leave'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Leave
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Documents
              </button>
              {employeeProfile?.role === 'FIELD_ENGINEER' && (
                <button
                  onClick={() => setActiveTab('vehicle')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'vehicle'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Car className="h-4 w-4 inline mr-2" />
                  Vehicle
                </button>
              )}

              {/* Admin Features */}
              {hasFeatureAccess('CUSTOMERS') && (
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'customers'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <User className="h-4 w-4 inline mr-2" />
                  Customers
                </button>
              )}
              {hasFeatureAccess('TEAMS') && (
                <button
                  onClick={() => setActiveTab('teams')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'teams'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <User className="h-4 w-4 inline mr-2" />
                  Teams
                </button>
              )}
              {employeeProfile?.role === 'IN_OFFICE' && (
                <button
                  onClick={() => setActiveTab('tenders')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tenders'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Tenders
                </button>
              )}
              {hasFeatureAccess('STOCK') && (
                <button
                  onClick={() => setActiveTab('stock')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'stock'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Stock
                </button>
              )}
              {hasFeatureAccess('LEAVE_MANAGEMENT') && (
                <button
                  onClick={() => setActiveTab('leave_management')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'leave_management'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Leave Mgmt
                </button>
              )}
              {hasFeatureAccess('FIELD_ENGINEER_ATTENDANCE') && (
                <button
                  onClick={() => setActiveTab('field_engineer_attendance')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'field_engineer_attendance'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Clock className="h-4 w-4 inline mr-2" />
                  Field Attendance
                </button>
              )}
              {hasFeatureAccess('INOFFICE_ATTENDANCE') && (
                <button
                  onClick={() => setActiveTab('inoffice_attendance')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inoffice_attendance'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Clock className="h-4 w-4 inline mr-2" />
                  Office Attendance
                </button>
              )}
              {hasFeatureAccess('CUSTOMER_SUPPORT_REQUESTS') && (
                <button
                  onClick={() => setActiveTab('customer_support_requests')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'customer_support_requests'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Support
                </button>
              )}
              {hasFeatureAccess('STAFF_FEATURE_ACCESS') && (
                <button
                  onClick={() => setActiveTab('staff_feature_access')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'staff_feature_access'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <User className="h-4 w-4 inline mr-2" />
                  Staff Access
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
                ℹ️ Additional admin features can be enabled by your administrator. Attendance, Leave, Documents, Tickets, and Tender Management are always available.
              </p>
            </div>
          )}
        </div>

        {/* Customer Support Notification Banner for IN_OFFICE employees */}
        {employeeProfile.role === 'IN_OFFICE' && pendingSupportRequests > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-900">
                    {pendingSupportRequests} New Customer Support {pendingSupportRequests === 1 ? 'Request' : 'Requests'}
                  </p>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Customer support requests are waiting for your attention
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => router.push('/customer-support-requests')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                View Requests ({pendingSupportRequests})
              </Button>
            </div>
          </div>
        )}

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
                {employeeProfile.team && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">Team: {employeeProfile.team.name}</span>
                  </div>
                )}
                {employeeProfile.isTeamLeader && (
                  <Badge variant="secondary">Team Leader</Badge>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'attendance' && (
              <>
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
                    <EmployeeSelfAttendance />
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'tickets' && employeeProfile?.role === 'IN_OFFICE' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span>Create Support Ticket</span>
                    </CardTitle>
                    <p className="text-gray-600">
                      Submit a support request or report an issue
                    </p>
                  </CardHeader>
                  <CardContent>
                    <StaffTicketForm
                      employeeId={employeeProfile.employeeId}
                      onSuccess={() => setTicketRefreshTrigger(prev => prev + 1)}
                    />
                  </CardContent>
                </Card>
                <StaffTicketList
                  employeeId={employeeProfile.employeeId}
                  refreshTrigger={ticketRefreshTrigger}
                />
              </div>
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

            {activeTab === 'task_management' && hasFeatureAccess('TASK_MANAGEMENT') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span>Task Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Manage and assign tasks to field engineers
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Administrative Task Management</h3>
                    <p className="text-gray-600 mb-6">
                      Access the full task management system to assign and monitor field engineer tasks
                    </p>
                    <Button
                      onClick={() => router.push('/task-management')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Task Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'tasks' && employeeProfile?.role === 'FIELD_ENGINEER' && (
              <TaskCheckInOut
                employeeId={employeeProfile.employeeId}
                onTaskStatusChange={() => { }}
              />
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

            {/* Admin Feature Tabs */}
            {activeTab === 'customers' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-500" />
                    <span>Customer Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Manage customer database and relationships
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Management</h3>
                    <p className="text-gray-600 mb-6">
                      Access the customer management system
                    </p>
                    <Button
                      onClick={() => router.push('/customers')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Open Customer Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'employees' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-500" />
                    <span>Employee Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Manage employee records and profiles
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Employee Management</h3>
                    <p className="text-gray-600 mb-6">
                      Access the employee management system
                    </p>
                    <Button
                      onClick={() => router.push('/employees')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Open Employee Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'teams' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-500" />
                    <span>Team Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Manage teams and their members
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Team Management</h3>
                    <p className="text-gray-600 mb-6">
                      Access the team management system
                    </p>
                    <Button
                      onClick={() => router.push('/teams')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Open Team Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'tenders' && employeeProfile?.role === 'IN_OFFICE' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span>Tender Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Manage tenders and EMD tracking
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Tender Management</h3>
                    <p className="text-gray-600 mb-6">
                      Access the tender management system
                    </p>
                    <Button
                      onClick={() => router.push('/tenders')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Tender Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'stock' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span>Stock Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Monitor and manage inventory levels
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Stock Management</h3>
                    <p className="text-gray-600 mb-6">
                      Access the stock management system
                    </p>
                    <Button
                      onClick={() => router.push('/stock')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Stock Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'leave_management' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span>Leave Management</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Approve and manage leave applications
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Leave Management</h3>
                    <p className="text-gray-600 mb-6">
                      Access the leave management system
                    </p>
                    <Button
                      onClick={() => router.push('/leave-management')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Leave Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'field_engineer_attendance' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span>Field Engineer Attendance</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Monitor field engineer attendance records
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Field Engineer Attendance</h3>
                    <p className="text-gray-600 mb-6">
                      Access the field engineer attendance system
                    </p>
                    <Button
                      onClick={() => router.push('/field-engineer-attendance')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Open Field Engineer Attendance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'inoffice_attendance' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span>In-Office Attendance</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Monitor in-office staff attendance records
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">In-Office Attendance</h3>
                    <p className="text-gray-600 mb-6">
                      Access the in-office attendance system
                    </p>
                    <Button
                      onClick={() => router.push('/inoffice-attendance')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Open In-Office Attendance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'customer_support_requests' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span>Customer Support</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Handle customer support requests
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Support</h3>
                    <p className="text-gray-600 mb-6">
                      Access the customer support system
                    </p>
                    <Button
                      onClick={() => router.push('/customer-support-requests')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Customer Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'staff_feature_access' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-blue-500" />
                    <span>Staff Feature Access</span>
                  </CardTitle>
                  <p className="text-gray-600">
                    Control staff permissions and feature access
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Staff Feature Access</h3>
                    <p className="text-gray-600 mb-6">
                      Access the staff feature access control system
                    </p>
                    <Button
                      onClick={() => router.push('/staff-feature-access')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Open Staff Access Control
                    </Button>
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