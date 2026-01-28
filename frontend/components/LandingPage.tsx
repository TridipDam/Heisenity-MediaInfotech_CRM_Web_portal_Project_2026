"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Headphones, 
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  User,
  Eye,
  EyeOff,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface LandingPageProps {
  onGetStarted: (type?: string) => void
  isLoggedIn?: boolean
  userProfile?: {
    name: string
    email: string
    role: string
    avatar?: string
    employeeId?: string
  }
}

// Customer Login Card Component
function CustomerLoginCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const customerId = formData.get("customerId") as string
    const phone = formData.get("phone") as string

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/customers/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, phone })
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || "Invalid credentials")
        return
      }

      const data = await response.json()
      
      // Store customer session
      localStorage.setItem("customerToken", data.sessionToken)
      localStorage.setItem("customerData", JSON.stringify(data.customer))
      
      // Redirect to customer portal
      router.push("/customer-portal")
    } catch {
      setError("An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="group p-6 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <User className="h-8 w-8 text-purple-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">Customer Login</CardTitle>
        <CardDescription className="text-gray-600 text-sm">
          Access your customer portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-id" className="text-sm font-medium">Customer ID</Label>
            <Input
              id="customer-id"
              name="customerId"
              type="text"
              required
              placeholder="Enter your Customer ID (e.g., CUS-001)"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone" className="text-sm font-medium">Phone Number</Label>
            <Input
              id="customer-phone"
              name="phone"
              type="tel"
              required
              placeholder="Enter your phone number"
              className="w-full"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Login as Customer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Staff Login Card Component
function StaffLoginCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const employeeId = formData.get("employeeId") as string

    try {
      const result = await signIn("credentials", {
        email,
        password,
        employeeId,
        userType: "EMPLOYEE",
        redirect: false
      })

      if (result?.error) {
        setError("Invalid credentials")
      } else {
        router.push("/landing")
      }
    } catch {
      setError("An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="group p-6 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-green-200 transition-all duration-300 hover:shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <Headphones className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">Staff Login</CardTitle>
        <CardDescription className="text-gray-600 text-sm">
          Field engineers and technical staff access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-employee-id" className="text-sm font-medium">Employee ID</Label>
            <Input
              id="staff-employee-id"
              name="employeeId"
              type="text"
              required
              placeholder="Enter employee ID"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email" className="text-sm font-medium">Email</Label>
            <Input
              id="staff-email"
              name="email"
              type="email"
              required
              placeholder="Enter your email"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Input
                id="staff-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                className="w-full pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Login as Staff"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}



export default function LandingPage({ onGetStarted, isLoggedIn = false, userProfile }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="bg-white border-b border-gray-200">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-linear-to-br from-blue-50 to-blue-100">
                <Image 
                  src="/Media_Infotech.webp" 
                  alt="MediaInfoTech Logo" 
                  width={40} 
                  height={40}
                  className="rounded-lg object-contain"
                  priority
                />
              </div>
              <span className="font-bold text-gray-900 text-xl">MediaInfoTech</span>
            </div>
          </div>
        </nav>
      </header>

      {/* Login feature */}
      <section id="login" className="py-20 bg-gray-50/50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-blue-600 border-blue-200 bg-blue-50">
                Access Portal
              </Badge>
              <h2 className="text-4xl font-black text-gray-900 mb-4">
                {isLoggedIn ? "Welcome Back!" : "Choose Your Access Level"}
              </h2>
            </div>
            
            {!isLoggedIn && (
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Customer Login */}
                <CustomerLoginCard />

                {/* Staff Login */}
                <StaffLoginCard />
              </div>
            )}

            {isLoggedIn && userProfile && (
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-2xl border-2 border-blue-200 p-8 text-center shadow-lg">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Logged In Successfully</h3>
                  <p className="text-gray-600 mb-4">Welcome back, {userProfile.name}!</p>
                  <div className="flex justify-center gap-2 mb-6">
                    <Badge variant="secondary">{userProfile.role}</Badge>
                    {userProfile.employeeId && (
                      <Badge variant="outline">ID: {userProfile.employeeId}</Badge>
                    )}
                  </div>
                  <Button 
                    onClick={() => onGetStarted()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
                  >
                    {userProfile.role === 'Administrator' ? 'Go to Dashboard' : 'Access Features'}
                  </Button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-blue-900/20"></div>
        <div className="container mx-auto px-6 relative z-10">       
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700">
              <Phone className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Phone Support</h3>
              <p className="text-gray-300 mb-4">Speak with our support team</p>
              <p className="text-blue-400 font-semibold">0000000000</p>
            </div>
            
            <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700">
              <Mail className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Email Us</h3>
              <p className="text-gray-300 mb-4">Send us your questions</p>
              <p className="text-blue-400 font-semibold">admin@mediainfotech@org</p>
            </div>
            
            <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700">
              <MapPin className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Visit Us</h3>
              <p className="text-gray-300 mb-4">Our business office</p>
              <p className="text-blue-400 font-semibold">1/2, SATISH CHAKRABORTY LANE, Bally, Howrah, West
Bengal, 711201</p>
            </div>
          </div>
          
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <Image 
                  src="/Media_Infotech.webp" 
                  alt="MediaInfoTech Logo" 
                  width={40} 
                  height={40}
                  className="rounded-lg object-contain"
                  priority
                />
              </div>
              <span className="font-bold text-white">MediaInfoTech</span>
            </div>
            <div className="text-center md:text-right">
              <p>&copy; 2026 MediaInfoTech.</p>
              <p className="text-sm mt-1">powered by insightsnode</p>
              <Link 
                href="/admin-login" 
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-2 inline-block"
              >
                Admin Access
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
