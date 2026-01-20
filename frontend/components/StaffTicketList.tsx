"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Ticket, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  MessageSquare,
  Loader2,
  User
} from "lucide-react"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"

interface TicketData {
  id: string
  ticketId: string
  description: string
  categoryId: string
  priority: string
  status: string
  department?: string
  category?: {
    id: string
    name: string
    description?: string
  }
  assignee?: {
    name: string
    employeeId: string
  }
  reporter?: {
    name: string
    employeeId: string
  }
  customerName?: string
  customerId?: string
  customerPhone?: string
  createdAt: string
  updatedAt: string
  dueDate?: string
  _count?: {
    comments: number
    attachments: number
  }
}

interface StaffTicketListProps {
  employeeId: string
  refreshTrigger?: number
}

export function StaffTicketList({ employeeId, refreshTrigger }: StaffTicketListProps) {
  const { authenticatedFetch, isAuthenticated } = useAuthenticatedFetch()
  const [tickets, setTickets] = React.useState<TicketData[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchMyTickets = React.useCallback(async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tickets/my-tickets?employeeId=${employeeId}`)

      const result = await response.json()

      if (result.success) {
        setTickets(result.data)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch, employeeId])

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchMyTickets()
    }
  }, [refreshTrigger, isAuthenticated, fetchMyTickets])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "PENDING":
        return <Clock className="h-4 w-4 text-amber-600" />
      case "SCHEDULED":
        return <Calendar className="h-4 w-4 text-purple-600" />
      case "RESOLVED":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "CLOSED":
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return <Ticket className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      OPEN: "bg-red-50 text-red-700 border-red-200",
      IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      SCHEDULED: "bg-purple-50 text-purple-700 border-purple-200",
      RESOLVED: "bg-green-50 text-green-700 border-green-200",
      CLOSED: "bg-muted text-muted-foreground border-border",
      CANCELLED: "bg-gray-50 text-gray-700 border-gray-200"
    }
    
    const labels: Record<string, string> = {
      OPEN: "Open",
      IN_PROGRESS: "In Progress",
      PENDING: "Pending",
      SCHEDULED: "Scheduled",
      RESOLVED: "Resolved",
      CLOSED: "Closed",
      CANCELLED: "Cancelled"
    }
    
    return (
      <Badge className={`${variants[status] || variants.OPEN} font-medium capitalize`}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      CRITICAL: "bg-red-100 text-red-800 border-red-300",
      HIGH: "bg-orange-50 text-orange-700 border-orange-200",
      MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
      LOW: "bg-green-50 text-green-700 border-green-200"
    }
    
    return (
      <Badge className={`${variants[priority] || variants.MEDIUM} font-medium capitalize`}>
        {priority}
    </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-muted-foreground">Loading your tickets...</p>
        </CardContent>
      </Card>
    )
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tickets Yet</h3>
          <p className="text-gray-600">
            You haven&apos;t created any support tickets yet. Create one above to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card shadow-sm border-border overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-blue-600" />
          My Tickets ({tickets.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b border-border">
              <TableHead className="w-[280px] py-4 px-6 font-semibold text-foreground">Ticket Details</TableHead>
              <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Status</TableHead>
              <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Priority</TableHead>
              <TableHead className="w-[150px] py-4 px-6 font-semibold text-foreground">Customer</TableHead>
              <TableHead className="w-[150px] py-4 px-6 font-semibold text-foreground">Created By</TableHead>
              <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket, index) => (
              <TableRow 
                key={ticket.id} 
                className={`hover:bg-accent/50 border-b border-border ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                }`}
              >
                <TableCell className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        <Ticket className="h-6 w-6" />
                      </div>
                      {getStatusIcon(ticket.status) && (
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                          {getStatusIcon(ticket.status)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{ticket.ticketId}</p>
                      <p className="text-sm text-muted-foreground">{ticket.category?.name || 'Unknown Category'}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
                      {ticket._count && ticket._count.comments > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <MessageSquare className="h-3 w-3 text-blue-600" />
                          <span className="text-xs text-blue-600">{ticket._count.comments} comments</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6">
                  {getStatusBadge(ticket.status)}
                </TableCell>
                <TableCell className="py-4 px-6">
                  {getPriorityBadge(ticket.priority)}
                </TableCell>
                <TableCell className="py-4 px-6">
                  {ticket.customerName ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {ticket.customerName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{ticket.customerName}</p>
                        <p className="text-xs text-muted-foreground">{ticket.customerId}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Internal</span>
                  )}
                </TableCell>
                <TableCell className="py-4 px-6">
                  {ticket.reporter ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {ticket.reporter.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{ticket.reporter.name}</p>
                        <p className="text-xs text-muted-foreground">{ticket.reporter.employeeId}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown</span>
                  )}
                </TableCell>
                <TableCell className="py-4 px-6">
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
