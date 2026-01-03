"use client"

import LandingPage from "@/components/LandingPage"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function Landing() {
  const router = useRouter()
  
  // Demo state - in real app this would come from auth context
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userProfile] = useState({
    name: "John Doe",
    email: "john.doe@company.com",
    role: "Administrator",
    avatar: "/api/placeholder/40/40"
  })

  const handleGetStarted = (type?: string) => {
    if (isLoggedIn) {
      // If logged in, go to dashboard
      router.push("/")
    } else {
      // If not logged in, go to login
      router.push(`/login?type=${type || 'user'}`)
    }
  }

  // Demo toggle for testing - remove in production
  const toggleLogin = () => {
    setIsLoggedIn(!isLoggedIn)
  }

  return (
    <div>
      {/* Demo toggle button - remove in production */}
      <div className="fixed top-4 left-4 z-50">
        <button 
          onClick={toggleLogin}
          className="bg-gray-800 text-white px-3 py-1 rounded text-sm"
        >
          Toggle Login ({isLoggedIn ? 'Logged In' : 'Logged Out'})
        </button>
      </div>
      
      <LandingPage 
        onGetStarted={handleGetStarted}
        isLoggedIn={isLoggedIn}
        userProfile={isLoggedIn ? userProfile : undefined}
      />
    </div>
  )
}