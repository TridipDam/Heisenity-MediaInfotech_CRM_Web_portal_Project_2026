"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"
import Image from "next/image"

interface AdminLoginPageProps {
  onGetStarted: () => void
  isLoggedIn?: boolean
  userProfile?: {
    name: string
    email: string
    role: string
    avatar?: string
    employeeId?: string
  }
}

// Admin Login Card Component
function AdminLoginCard() {
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
    const adminId = formData.get("adminId") as string

    try {
      // Handle admin login
      const result = await signIn("credentials", {
        email,
        password,
        adminId,
        userType: "ADMIN",
        redirect: false
      })

      if (result?.error) {
        setError("Invalid credentials")
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 shadow-xl">
      <CardHeader className="text-center pb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold text-gray-900">Admin Portal</CardTitle>
        <CardDescription className="text-gray-600 text-base">
          System administrator access
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Admin credentials are provided by the development team.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="admin-id" className="text-sm font-medium">Admin ID</Label>
            <Input
              id="admin-id"
              name="adminId"
              type="text"
              required
              placeholder="Enter admin ID"
              className="w-full h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="text-sm font-medium">Email</Label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              required
              placeholder="Enter your email"
              className="w-full h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                className="w-full h-12 pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </Button>
            </div>
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-4 text-lg font-semibold shadow-lg transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Admin Access"}
          </Button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-blue-200">
          <Link 
            href="/"
            className="flex items-center justify-center text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Main Login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminLoginPage({ onGetStarted, isLoggedIn = false, userProfile }: AdminLoginPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      {/* Header Navigation */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
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
            </Link>
            
            <Link 
              href="/"
              className="flex items-center text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Main
            </Link>
          </div>
        </nav>
      </header>

      {/* Admin Login Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-blue-600 border-blue-200 bg-blue-50/80">
                Administrator Access
              </Badge>
              <h1 className="text-5xl font-black text-gray-900 mb-4">
                {isLoggedIn ? "Welcome Back, Admin!" : "Admin Login"}
              </h1>
              <p className="text-xl text-gray-600">
                {isLoggedIn ? "You are successfully logged in" : "Secure access to system administration"}
              </p>
            </div>
            
            {!isLoggedIn && <AdminLoginCard />}

            {isLoggedIn && userProfile && (
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-2xl border-2 border-green-200 p-8 text-center shadow-xl">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Granted</h3>
                  <p className="text-gray-600 mb-4">Welcome back, {userProfile.name}!</p>
                  <div className="flex justify-center gap-2 mb-6">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">Administrator</Badge>
                    {userProfile.employeeId && (
                      <Badge variant="outline">ID: {userProfile.employeeId}</Badge>
                    )}
                  </div>
                  <Button 
                    onClick={onGetStarted}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-4 text-lg font-semibold"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Admin Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">System Management</h3>
                <p className="text-gray-600 text-sm">Full control over system settings and configurations</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
                <p className="text-gray-600 text-sm">Manage staff accounts, permissions, and access levels</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Reports</h3>
                <p className="text-gray-600 text-sm">Access comprehensive reports and system analytics</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container mx-auto px-6">       
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
              <p className="text-blue-400 font-semibold">123 Business Ave</p>
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}