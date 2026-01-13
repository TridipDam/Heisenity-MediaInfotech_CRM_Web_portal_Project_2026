"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Dashboard } from "@/components/Dashboard"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (!session?.user) {
      router.push('/landing')
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
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session?.user || (session.user as any)?.userType !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return <Dashboard />
}