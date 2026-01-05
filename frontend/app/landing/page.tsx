"use client"

import LandingPage from "@/components/LandingPage"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function Landing() {
  const router = useRouter()
  const { data: session } = useSession()
  
  const isLoggedIn = !!session?.user
  const userProfile = session?.user ? {
    name: session.user.name || "User",
    email: session.user.email || "",
    role: (session.user as any).userType === 'admin' ? 'Administrator' : 'Employee',
    avatar: "/api/placeholder/40/40",
    employeeId: (session.user as any).employeeId
  } : undefined

  const handleGetStarted = (type?: string) => {
    if (isLoggedIn) {
      // If logged in as employee, stay on landing or go to attendance
      const userType = (session?.user as any)?.userType
      if (userType === 'employee') {
        router.push("/attendance")
      } else {
        // If admin, go to dashboard
        router.push("/dashboard")
      }
    } else {
      // If not logged in, go to login
      router.push(`/login?type=${type || 'user'}`)
    }
  }

  return (
    <div>
      <LandingPage 
        onGetStarted={handleGetStarted}
        isLoggedIn={isLoggedIn}
        userProfile={userProfile}
      />
    </div>
  )
}