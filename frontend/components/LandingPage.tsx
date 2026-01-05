"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signOut, signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Package, 
  Headphones, 
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  User,
  Settings,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react"

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

// User Login Card Component
function UserLoginCard() {
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
        userType: "employee",
        redirect: false
      })

      if (result?.error) {
        setError("Invalid credentials")
      } else {
        router.push("/landing")
      }
    } catch (error) {
      setError("An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="group p-6 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-blue-200 transition-all duration-300 hover:shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <User className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">User Login</CardTitle>
        <CardDescription className="text-gray-600 text-sm">
          Access your dashboard and basic features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-employee-id" className="text-sm font-medium">Employee ID</Label>
            <Input
              id="user-employee-id"
              name="employeeId"
              type="text"
              required
              placeholder="Enter employee ID"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email" className="text-sm font-medium">Email</Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              required
              placeholder="Enter your email"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Input
                id="user-password"
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Login as User"}
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
        userType: "employee",
        redirect: false
      })

      if (result?.error) {
        setError("Invalid credentials")
      } else {
        router.push("/landing")
      }
    } catch (error) {
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
          Technical support and operational monitoring
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

// Admin Login Card Component
function AdminLoginCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const adminId = formData.get("adminId") as string
    const name = formData.get("name") as string
    const phone = formData.get("phone") as string

    try {
      if (isSignup) {
        // Handle admin registration
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/register/admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            adminId,
            email,
            password,
            phone
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          let errorMessage = errorData.error || "Registration failed"
          
          // Make error messages more user-friendly
          if (errorMessage.includes("email already exists")) {
            errorMessage = "An admin account with this email already exists."
            // Auto-switch to login mode after showing error
            setTimeout(() => {
              setIsSignup(false)
              setError("Please use the login form below with your existing credentials.")
            }, 2000)
          } else if (errorMessage.includes("adminId already exists")) {
            errorMessage = "This Admin ID is already taken. Please choose a different Admin ID."
          }
          
          setError(errorMessage)
          return
        }

        // After successful registration, automatically sign in
        setError("") // Clear any previous errors
        const result = await signIn("credentials", {
          email,
          password,
          adminId,
          userType: "admin",
          redirect: false
        })

        if (result?.error) {
          setError("Registration successful but login failed. Please try logging in manually.")
        } else {
          // Show success message briefly before redirect
          setError("")
          router.push("/dashboard")
        }
      } else {
        // Handle admin login
        const result = await signIn("credentials", {
          email,
          password,
          adminId,
          userType: "admin",
          redirect: false
        })

        if (result?.error) {
          setError("Invalid credentials")
        } else {
          router.push("/dashboard")
        }
      }
    } catch (error) {
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="group p-6 bg-linear-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 transition-all duration-300 hover:shadow-xl hover:from-blue-100 hover:to-blue-150">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 bg-linear-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">Admin Portal</CardTitle>
        <CardDescription className="text-gray-600 text-sm">
          Full system control and user management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center mb-4">
          <div className="flex bg-gray-200 rounded-lg p-1">
            <Button
              type="button"
              variant={!isSignup ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsSignup(false)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                !isSignup 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Login
            </Button>
            <Button
              type="button"
              variant={isSignup ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsSignup(true)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                isSignup 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Create Admin
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="admin-name" className="text-sm font-medium">Full Name</Label>
              <Input
                id="admin-name"
                name="name"
                type="text"
                required
                placeholder="Enter full name"
                className="w-full"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="admin-id" className="text-sm font-medium">Admin ID</Label>
            <Input
              id="admin-id"
              name="adminId"
              type="text"
              required
              placeholder="Enter admin ID"
              className="w-full"
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
              className="w-full"
            />
          </div>
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="admin-phone" className="text-sm font-medium">Phone (Optional)</Label>
              <Input
                id="admin-phone"
                name="phone"
                type="tel"
                placeholder="Enter phone number"
                className="w-full"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Input
                id="admin-password"
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
            className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-3 shadow-lg"
            disabled={isLoading}
          >
            {isLoading 
              ? (isSignup ? "Creating..." : "Signing in...") 
              : (isSignup ? "Create Admin" : "Admin Access")
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function LandingPage({ onGetStarted, isLoggedIn = false, userProfile }: LandingPageProps) {
  const handleLogout = () => {
    console.log('Landing page logout clicked')
    signOut({ 
      callbackUrl: '/login',
      redirect: true 
    }).then(() => {
      console.log('Landing page logout successful')
    }).catch((error) => {
      console.error('Landing page logout error:', error)
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Navigation */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-card/90 backdrop-blur-md rounded-full px-8 py-3 shadow-lg border border-border">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Mediacomputer</span>
          </div>
          <div className="hidden md:flex space-x-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-blue-600 transition-colors">Features</a>
            <a href="#login" className="text-muted-foreground hover:text-blue-600 transition-colors">Login</a>
            <a href="#contact" className="text-muted-foreground hover:text-blue-600 transition-colors">Contact</a>
            <a href="/employee-attendance" className="text-muted-foreground hover:text-blue-600 transition-colors">Attendance</a>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn && userProfile ? (
              <div className="flex items-center gap-3">
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userProfile.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="w-fit text-xs">
                            {userProfile.role}
                          </Badge>
                          {userProfile.employeeId && (
                            <Badge variant="outline" className="w-fit text-xs">
                              ID: {userProfile.employeeId}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button onClick={() => onGetStarted()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                Access Portal
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Login feature */}
      <section id="login" className="pt-36 py-20 bg-card border-t border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 text-blue-600 border-blue-200">
                Access Portal
              </Badge>
              <h2 className="text-4xl font-black text-gray-900 mb-4">
                {isLoggedIn ? "Welcome Back!" : "Choose Your Access Level"}
              </h2>
              <p className="text-xl text-gray-600">
                {isLoggedIn 
                  ? "You are successfully logged in. Use the navigation above to access your dashboard."
                  : "Secure login for different user roles with tailored dashboards and permissions"
                }
              </p>
            </div>
            
            {!isLoggedIn && (
              <div className="grid lg:grid-cols-3 gap-6">
                {/* User Login */}
                <UserLoginCard />

                {/* Admin Login */}
                <AdminLoginCard />

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
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-blue-900/20 via-transparent to-blue-900/20"></div>
        <div className="container mx-auto px-6 relative z-10">       
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700">
              <Phone className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Phone Support</h3>
              <p className="text-gray-300 mb-4">Speak with our support team</p>
              <p className="text-blue-400 font-semibold">+1 (555) 123-4567</p>
            </div>
            
            <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700">
              <Mail className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Email Us</h3>
              <p className="text-gray-300 mb-4">Send us your questions</p>
              <p className="text-blue-400 font-semibold">support@businesshub.com</p>
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
              <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">Mediacomputer</span>
            </div>
            <div className="text-center md:text-right">
              <p>&copy; 2026 Mediacomputer. Internal Management System.</p>
              <p className="text-sm mt-1">For authorized personnel only. Secure access required.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}