"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Bell,
} from "lucide-react"

interface LandingPageProps {
  onGetStarted: (type?: string) => void
  isLoggedIn?: boolean
  userProfile?: {
    name: string
    email: string
    role: string
    avatar?: string
  }
}

export default function LandingPage({ onGetStarted, isLoggedIn = false, userProfile }: LandingPageProps) {
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
                        <Badge variant="secondary" className="w-fit text-xs mt-1">
                          {userProfile.role}
                        </Badge>
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
                    <DropdownMenuItem className="text-red-600">
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
                Choose Your Access Level
              </h2>
              <p className="text-xl text-gray-600">
                Secure login for different user roles with tailored dashboards and permissions
              </p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-6">
              {/* User Login */}
              <div className="group p-8 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-blue-200 transition-all duration-300 hover:shadow-lg">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">User Login</h3>
                  <p className="text-gray-600 mb-6 text-sm">
                    Access your surveillance dashboard, view camera feeds, and manage basic settings
                  </p>
                  <Button 
                    onClick={() => onGetStarted("user")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
                  >
                    Login as User
                  </Button>
                </div>
              </div>

              {/* Admin Login */}
              <div className="group p-8 bg-linear-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 transition-all duration-300 hover:shadow-xl hover:from-blue-100 hover:to-blue-150">
                <div className="text-center">
                  <div className="w-16 h-16 bg-linear-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <ShieldCheck className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Admin Portal</h3>
                  <p className="text-gray-600 mb-6 text-sm">
                    Full system control, user management, analytics, and enterprise configuration
                  </p>
                  <Button 
                    onClick={() => onGetStarted("admin")}
                    className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-3 shadow-lg"
                  >
                    Admin Access
                  </Button>
                </div>
              </div>

              {/* Staff Login */}
              <div className="group p-8 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-green-200 transition-all duration-300 hover:shadow-lg">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Headphones className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Staff Portal</h3>
                  <p className="text-gray-600 mb-6 text-sm">
                    Technical support tools, maintenance schedules, and operational monitoring
                  </p>
                  <Button 
                    onClick={() => onGetStarted("staff")}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3"
                  >
                    Staff Login
                  </Button>
                </div>
              </div>
            </div>
            
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