"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Eye, 
  ShieldCheck, 
  Headphones, 
  ArrowLeft,
  Mail,
  Lock,
  Building2,
  CheckCircle2
} from "lucide-react"

interface LoginPageProps {
  onBack: () => void
  onLogin: () => void
  initialTab?: string
}

export default function LoginPage({ onBack, onLogin, initialTab = "user" }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    companyId: "",
    accessCode: ""
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically handle authentication
    onLogin()
  }

  const loginTypes = {
    user: {
      title: "User Login",
      subtitle: "Access your surveillance dashboard",
      icon: Eye,
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      darkBgGradient: "from-blue-900/20 to-blue-800/20",
      features: [
        "View live camera feeds",
        "Basic system monitoring", 
        "Personal dashboard",
        "Mobile app access"
      ]
    },
    admin: {
      title: "Admin Portal",
      subtitle: "Full system control and management",
      icon: ShieldCheck,
      color: "orange",
      gradient: "from-orange-500 to-red-600",
      bgGradient: "from-orange-50 to-red-50",
      darkBgGradient: "from-orange-900/20 to-red-900/20",
      features: [
        "Complete system administration",
        "User management & permissions",
        "Advanced analytics & reports",
        "Enterprise configuration"
      ]
    },
    staff: {
      title: "Staff Portal",
      subtitle: "Technical support and operations",
      icon: Headphones,
      color: "green",
      gradient: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100",
      darkBgGradient: "from-green-900/20 to-green-800/20",
      features: [
        "Technical support tools",
        "Maintenance scheduling",
        "Operational monitoring",
        "Issue tracking system"
      ]
    }
  }

  const currentType = loginTypes[activeTab as keyof typeof loginTypes]

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="absolute top-6 left-6 text-slate-600 hover:text-orange-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-linear-to-br bg-blue-500 rounded-lg flex items-center justify-center">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">Mediacomputer</span>
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 mb-2">
            Secure Access Portal
          </h1>
          <p className="text-slate-600">
            Choose your access level and login to your personalized dashboard
          </p>
        </div>

        {/* Login Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-white p-2 rounded-2xl shadow-lg">
            <TabsTrigger value="user" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl">
              <Eye className="h-4 w-4 mr-2" />
              User
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-linear-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-xl">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-xl">
              <Headphones className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
          </TabsList>

          {/* Login Content */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Login Form */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
              <div className="text-center mb-8">
                <div className={`w-16 h-16 bg-linear-to-br ${currentType.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <currentType.icon className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  {currentType.title}
                </h2>
                <p className="text-slate-600">
                  {currentType.subtitle}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pl-10 h-12 rounded-xl border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pl-10 h-12 rounded-xl border-slate-200"
                      required
                    />
                  </div>
                </div>

                {(activeTab === "admin" || activeTab === "staff") && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {activeTab === "admin" ? "Company ID" : "Department Code"}
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder={activeTab === "admin" ? "Enter company ID" : "Enter department code"}
                        value={formData.companyId}
                        onChange={(e) => handleInputChange("companyId", e.target.value)}
                        className="pl-10 h-12 rounded-xl border-slate-200"
                        required
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className={`w-full h-12 rounded-xl text-white font-semibold bg-linear-to-r ${currentType.gradient} hover:opacity-90 transition-opacity`}
                >
                  Login to {currentType.title}
                </Button>

                <div className="text-center">
                  <a href="#" className="text-sm text-slate-500 hover:text-orange-600 transition-colors">
                    Forgot your password?
                  </a>
                </div>
              </form>
            </div>

            {/* Features Panel */}
            <div className={`bg-linear-to-br ${currentType.bgGradient} rounded-3xl p-8 border border-slate-200`}>
              <div className="h-full flex flex-col justify-between">
                <div>
                  <Badge variant="outline" className={`mb-6 text-${currentType.color}-600 border-${currentType.color}-200`}>
                    {currentType.title} Features
                  </Badge>
                  
                  <h3 className="text-2xl font-bold text-slate-900 mb-6">
                    What you&apos;ll get access to:
                  </h3>
                  
                  <div className="space-y-4">
                    {currentType.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle2 className={`h-5 w-5 text-${currentType.color}-600 shrink-0`} />
                        <span className="text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 p-6 bg-white/50 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-8 h-8 bg-linear-to-br ${currentType.gradient} rounded-lg flex items-center justify-center`}>
                      <ShieldCheck className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-slate-900">Enterprise Security</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Multi-factor authentication, encrypted connections, and enterprise-grade security protocols protect your data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Need help? Contact our support team at support@visionlink.pro</p>
          <p className="mt-1">&copy; 2026 Mediacomputer. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}