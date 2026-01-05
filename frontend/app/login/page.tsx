"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, userType: "admin" | "employee") => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const employeeId = formData.get("employeeId") as string
    const adminId = formData.get("adminId") as string

    try {
      const result = await signIn("credentials", {
        email,
        password,
        employeeId: userType === "employee" ? employeeId : "",
        adminId: userType === "admin" ? adminId : "",
        userType,
        redirect: false
      })

      if (result?.error) {
        setError("Invalid credentials")
      } else {
        // Redirect based on user type
        if (userType === "employee") {
          router.push("/landing")
        } else {
          router.push("/dashboard")
        }
      }
    } catch (error) {
      setError("An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Choose your login type</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="employee" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employee">Employee</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="employee">
              <form onSubmit={(e) => handleSubmit(e, "employee")} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-id">Employee ID</Label>
                  <Input
                    id="employee-id"
                    name="employeeId"
                    type="text"
                    required
                    placeholder="Enter your employee ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-email">Email</Label>
                  <Input
                    id="employee-email"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-password">Password</Label>
                  <Input
                    id="employee-password"
                    name="password"
                    type="password"
                    required
                    placeholder="Enter your password"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in as Employee"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="admin">
              <form onSubmit={(e) => handleSubmit(e, "admin")} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-id">Admin ID</Label>
                  <Input
                    id="admin-id"
                    name="adminId"
                    type="text"
                    required
                    placeholder="Enter your admin ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    name="password"
                    type="password"
                    required
                    placeholder="Enter your password"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in as Admin"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Need admin access?{" "}
              <Link href="/landing" className="text-blue-600 hover:underline">
                Go to landing page
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}