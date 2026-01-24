"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AdminLeaveManagement } from "@/components/AdminLeaveManagement"
import { AdminDocumentUpload } from "@/components/AdminDocumentUpload"
import { AdminCredentialReset } from "@/components/AdminCredentialReset"
import { Loader2 } from "lucide-react"
import { ReEnableClockInDialog } from "@/components/ReEnableClockInDialog"


export default function LeaveManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/")
      return
    }

    const userType = (session.user as any)?.userType
    if (userType !== 'ADMIN') {
      router.push('/landing')
      return
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading leave management...</p>
        </div>
      </div>
    )
  }

  if (!session?.user || (session.user as any)?.userType !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  const adminId = (session.user as any).adminId || session.user.id
  const adminName = session.user.name || 'Admin'

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">HR Center</h1>
              <p className="text-gray-600">Manage employee leave applications, documents, and payslips</p>
            </div>
            <div className="flex gap-3">
              <ReEnableClockInDialog adminId={adminId} />

              <button
                onClick={() => window.location.href = '/leave-management'}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Leave Management
              </button>
              <button
                onClick={() => window.location.href = '/payslip'}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Payslip Management
              </button>
            </div>
          </div>
        </div>

        {/* Leave Management Component */}
        <AdminLeaveManagement adminId={adminId} adminName={adminName} />

        {/* Document Upload System */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-1 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
            <p className="text-gray-600">Upload and manage documents for employees</p>
          </div>
          <AdminDocumentUpload adminId={adminId} adminName={adminName} />
        </div>

        {/* Admin Credential Reset */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <AdminCredentialReset adminId={adminId} adminName={adminName} />
        </div>
      </div>
    </div>
  )
}