"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Calendar, Users, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
            <p className="text-gray-600">Monitor and manage employee attendance records</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Present Today</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">234</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+2.1%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">94.7% attendance</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Late Arrivals</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">8</span>
                  <div className="flex items-center gap-1 text-red-600">
                    <span className="text-sm font-medium">-1.2%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">vs yesterday</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Absent</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">5</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <span className="text-sm font-medium">-0.8%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">vs yesterday</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Records</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">247</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+5.2%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">this month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Attendance Management</CardTitle>
            <p className="text-gray-600">Monitor and manage employee attendance records</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Today's Attendance</p>
                  <p className="text-sm text-gray-500">Present employees</p>
                </div>
                <span className="text-2xl font-bold text-green-600">234</span>
              </div>
              <Link href="/attendance">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Clock className="h-4 w-4 mr-2" />
                  Manage Attendance
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
            <p className="text-gray-600">Latest attendance updates</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Attendance recorded</p>
                  <p className="text-sm text-gray-500">Sarah Johnson checked in at 08:45 AM</p>
                </div>
                <span className="text-xs text-gray-400">5 min ago</span>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Late arrival</p>
                  <p className="text-sm text-gray-500">Mike Chen arrived 15 minutes late</p>
                </div>
                <span className="text-xs text-gray-400">12 min ago</span>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Attendance recorded</p>
                  <p className="text-sm text-gray-500">Emily Rodriguez checked in at 08:30 AM</p>
                </div>
                <span className="text-xs text-gray-400">18 min ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}