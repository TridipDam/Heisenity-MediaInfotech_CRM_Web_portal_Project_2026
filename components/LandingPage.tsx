"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  Building2, 
  Headphones, 
  Gauge,
  Phone,
  Mail,
  MapPin,
  Server,
  Network,
  Wifi,
  ShieldCheck
} from "lucide-react"

interface LandingPageProps {
  onGetStarted: (type?: string) => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Floating Navigation */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md rounded-full px-8 py-3 shadow-lg border border-gray-200">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">BusinessHub</span>
          </div>
          <div className="hidden md:flex space-x-6 text-sm">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
            <a href="#login" className="text-gray-600 hover:text-blue-600 transition-colors">Login</a>
            <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
          </div>
          <Button onClick={() => onGetStarted()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
            Access Portal
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-blue-50 via-white to-blue-100"></div>
        
        <div className="container mx-auto px-6 relative z-10 pt-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                <Package className="h-4 w-4" />
                <span>Business Management System</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-tight">
                Manage Your
                <span className="block text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-blue-600">
                  Business
                </span>
                <span className="block text-3xl lg:text-4xl font-bold text-gray-700">
                  Efficiently
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                Streamline your operations with our comprehensive business management platform. Handle inventory, attendance, payroll, and support tickets all in one place.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => onGetStarted()}
                  size="lg" 
                  className="bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-gray-300 px-8 py-4 text-lg rounded-xl hover:bg-gray-50"
                >
                  Learn More
                </Button>
              </div>
            </div>
            
            {/* Business Image */}
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                <Image 
                  src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1926&q=80"
                  alt="Modern business office with people working"
                  width={1926}
                  height={400}
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">Real-time Dashboard</h3>
                    <p className="text-sm text-gray-600">Monitor all your business operations from one central location</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-6">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful tools to manage your business operations effectively
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
              <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Inventory</h3>
              <p className="text-gray-600">Track stock levels and manage products</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
              <Building2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Attendance</h3>
              <p className="text-gray-600">Monitor employee attendance and schedules</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
              <Gauge className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payroll</h3>
              <p className="text-gray-600">Manage employee payments and benefits</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
              <Headphones className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Support</h3>
              <p className="text-gray-600">Handle tickets and customer support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section id="login" className="py-20 bg-white border-t border-gray-200">
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
            
            <div className="grid lg:grid-cols-4 gap-6">
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
              <div className="group p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 transition-all duration-300 hover:shadow-xl hover:from-blue-100 hover:to-blue-150">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <ShieldCheck className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Admin Portal</h3>
                  <p className="text-gray-600 mb-6 text-sm">
                    Full system control, user management, analytics, and enterprise configuration
                  </p>
                  <Button 
                    onClick={() => onGetStarted("admin")}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-3 shadow-lg"
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

              {/* Work Smartly Button */}
              <div className="group p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-2 border-gray-700 transition-all duration-300 hover:shadow-xl">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <Gauge className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Work Smartly</h3>
                  <p className="text-gray-300 mb-6 text-sm">
                    AI-powered workflow optimization and intelligent automation tools
                  </p>
                  <Button 
                    onClick={() => onGetStarted("smart")}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl py-3 shadow-lg"
                  >
                    Start Smart Work
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Access Features */}
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 rounded-xl">
                <Server className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <h4 className="font-bold text-gray-900 mb-2">Single Sign-On</h4>
                <p className="text-sm text-gray-600">Seamless access across all enterprise systems</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-xl">
                <Network className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <h4 className="font-bold text-gray-900 mb-2">Multi-Factor Auth</h4>
                <p className="text-sm text-gray-600">Enterprise-grade security protocols</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-xl">
                <Wifi className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <h4 className="font-bold text-gray-900 mb-2">Cloud Sync</h4>
                <p className="text-sm text-gray-600">Real-time data synchronization</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-blue-900/20"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-5xl font-black mb-6">
              Ready to Get
              <span className="block text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-blue-500">
                Started?
              </span>
            </h2>
            <p className="text-xl text-gray-300">
              Contact our team to learn more about our business management solutions.
            </p>
          </div>
          
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
          
          <div className="text-center">
            <Button 
              onClick={() => onGetStarted()}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-12 py-4 text-xl rounded-2xl shadow-2xl hover:shadow-blue-500/25 transition-all"
            >
              Access Business Portal
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white">BusinessHub</span>
            </div>
            <div className="text-center md:text-right">
              <p>&copy; 2024 BusinessHub. Comprehensive business management solutions.</p>
              <p className="text-sm mt-1">Streamline your operations with our integrated platform.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}