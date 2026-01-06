"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Monitor, Tablet, LogOut } from 'lucide-react'

interface Session {
  id: string
  sessionToken: string
  deviceInfo?: string
  ipAddress?: string
  lastActivity: string
  createdAt: string
  isActive: boolean
}

export default function ActiveSessions() {
  const { data: session } = useSession()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetchSessions()
    }
  }, [session])

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/sessions/${session?.user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const logoutSession = async (sessionToken: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken })
      })

      if (response.ok) {
        fetchSessions() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to logout session:', error)
    }
  }

  const logoutAllSessions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/logout-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: session?.user?.id })
      })

      if (response.ok) {
        fetchSessions() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to logout all sessions:', error)
    }
  }

  const getDeviceIcon = (deviceInfo?: string) => {
    if (!deviceInfo) return <Monitor className="h-4 w-4" />
    
    const info = deviceInfo.toLowerCase()
    if (info.includes('mobile') || info.includes('android') || info.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />
    }
    if (info.includes('tablet') || info.includes('ipad')) {
      return <Tablet className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  const getCurrentSessionToken = () => {
    return (session as any)?.sessionToken
  }

  if (loading) {
    return <div>Loading sessions...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>
          Manage your active login sessions across different devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground">No active sessions found</p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logoutAllSessions}
                className="text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout All
              </Button>
            </div>
            
            {sessions.map((sessionItem) => (
              <div key={sessionItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getDeviceIcon(sessionItem.deviceInfo)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {sessionItem.deviceInfo?.split(' ')[0] || 'Unknown Device'}
                      </span>
                      {sessionItem.sessionToken === getCurrentSessionToken() && (
                        <Badge variant="secondary">Current</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      IP: {sessionItem.ipAddress || 'Unknown'} • 
                      Last active: {new Date(sessionItem.lastActivity).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {sessionItem.sessionToken !== getCurrentSessionToken() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logoutSession(sessionItem.sessionToken)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}