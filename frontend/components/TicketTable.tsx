"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategorySelector } from "@/components/CategorySelector"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Ticket, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Clock,
  MessageSquare,
  Calendar,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  ArrowUpDown,
  Phone,
  Paperclip,
  FileText,
  Image,
  Save,
  X,
  ChevronDown
} from "lucide-react"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { showToast } from "@/lib/toast-utils"
import { exportTicketsToExcel, getFilterLabel, type ExportFilters } from "@/lib/export-utils"

interface Ticket {
  id: string
  ticketId: string
  description: string
  categoryId: string
  priority: string
  status: string
  department?: string
  assigneeId?: string
  reporterId?: string
  dueDate?: string
  estimatedHours?: number
  createdAt: string
  updatedAt: string
  customerName?: string
  customerId?: string
  customerPhone?: string
  category?: {
    id: string
    name: string
    description?: string
  }
  assignee?: {
    id: string
    name: string
    employeeId: string
    email: string
  }
  reporter?: {
    id: string
    name: string
    employeeId: string
    email: string
  }
  attachments?: Array<{
    id: string
    fileName: string
    filePath: string
    fileSize: number
    mimeType: string
    uploadedAt: string
  }>
  _count?: {
    comments: number
    attachments: number
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "OPEN":
    case "open":
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    case "RESOLVED":
    case "resolved":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "CLOSED":
    case "closed":
      return <XCircle className="h-4 w-4 text-gray-600" />
    default:
      return <Ticket className="h-4 w-4 text-gray-400" />
  }
}

const getStatusBadge = (status: string) => {
  const statusUpper = status.toUpperCase()
  const variants: Record<string, string> = {
    OPEN: "bg-red-50 text-red-700 border-red-200",
    RESOLVED: "bg-green-50 text-green-700 border-green-200",
    CLOSED: "bg-muted text-muted-foreground border-border"
  }
  
  const labels: Record<string, string> = {
    OPEN: "Open",
    RESOLVED: "Resolved",
    CLOSED: "Closed"
  }
  
  return (
    <Badge className={`${variants[statusUpper] || variants.OPEN} font-medium capitalize`}>
      {labels[statusUpper] || status}
    </Badge>
  )
}

const getPriorityBadge = (priority: string) => {
  const priorityUpper = priority.toUpperCase()
  const variants: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-800 border-red-300",
    HIGH: "bg-orange-50 text-orange-700 border-orange-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-green-50 text-green-700 border-green-200"
  }
  
  return (
    <Badge className={`${variants[priorityUpper] || variants.MEDIUM} font-medium capitalize`}>
      {priority}
    </Badge>
  )
}

// Ticket Details Modal Component
interface TicketDetailsModalProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
}

function TicketDetailsModal({ ticket, isOpen, onClose }: TicketDetailsModalProps) {
  if (!ticket) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-blue-600" />
            {ticket.ticketId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Ticket ID</Label>
              <p className="font-mono text-sm">{ticket.ticketId}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <div className="mt-1">{getStatusBadge(ticket.status)}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
              <div className="mt-1">{getPriorityBadge(ticket.priority)}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Category</Label>
              <p className="text-sm">{ticket.category?.name || 'Unknown Category'}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Description</Label>
            <p className="text-sm mt-1 p-3 bg-muted rounded-md">{ticket.description}</p>
          </div>

          {/* Customer Info */}
          {ticket.customerName && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Customer Information</Label>
              <div className="mt-1 p-3 bg-muted rounded-md">
                <p className="font-medium">{ticket.customerName}</p>
                <p className="text-sm text-muted-foreground">{ticket.customerId}</p>
                <p className="text-sm text-muted-foreground">{ticket.customerPhone}</p>
              </div>
            </div>
          )}

          {/* Assignment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Reporter</Label>
              <p className="text-sm">{ticket.reporter?.name || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Assignee</Label>
              <p className="text-sm">{ticket.assignee?.name || 'Unassigned'}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <p className="text-sm">{new Date(ticket.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
              <p className="text-sm">{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'No due date'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Estimated Hours</Label>
              <p className="text-sm">{ticket.estimatedHours || 'Not specified'}</p>
            </div>
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Attachments ({ticket.attachments.length})</Label>
              <div className="mt-2 space-y-2">
                {ticket.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-muted rounded-md">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{attachment.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Edit Ticket Modal Component
interface EditTicketModalProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
  onSave: (ticketId: string, updates: Partial<Ticket>) => Promise<void>
}

function EditTicketModal({ ticket, isOpen, onClose, onSave }: EditTicketModalProps) {
  const [formData, setFormData] = React.useState({
    description: '',
    categoryId: '',
    priority: '',
    status: '',
    department: '',
    dueDate: '',
    estimatedHours: ''
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (ticket) {
      setFormData({
        description: ticket.description || '',
        categoryId: ticket.categoryId || '',
        priority: ticket.priority || '',
        status: ticket.status || '',
        department: ticket.department || '',
        dueDate: ticket.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: ticket.estimatedHours?.toString() || ''
      })
    }
  }, [ticket])

  const handleSave = async () => {
    if (!ticket) return
    
    setSaving(true)
    try {
      await onSave(ticket.id, {
        ...formData,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined
      })
      onClose()
      showToast.success('Ticket updated successfully')
    } catch (error) {
      showToast.error('Failed to update ticket')
    } finally {
      setSaving(false)
    }
  }

  if (!ticket) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            Edit Ticket - {ticket.ticketId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <CategorySelector
                value={formData.categoryId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                placeholder="Select category"
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT Support">IT Support</SelectItem>
                  <SelectItem value="IT Infrastructure">IT Infrastructure</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                  <SelectItem value="Facilities">Facilities</SelectItem>
                  <SelectItem value="Procurement">Procurement</SelectItem>
                  <SelectItem value="HR Department">HR Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                min="0"
                step="0.5"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TicketTable() {
  const router = useRouter()
  const { data: session } = useSession()
  const { authenticatedFetch, isAuthenticated } = useAuthenticatedFetch()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [selectedStatus, setSelectedStatus] = React.useState("all")
  const [selectedPriority, setSelectedPriority] = React.useState("all")
  const [activeTab, setActiveTab] = React.useState("all")
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [loading, setLoading] = React.useState(true)
  
  // Modal states
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null)
  const [showDetailsModal, setShowDetailsModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [deletingTicket, setDeletingTicket] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      // Static files are served from root, not /api/v1
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api/v1', '') || 'http://localhost:3001'
      const staticUrl = `${baseUrl}${filePath}`
      console.log('Direct download URL:', staticUrl)
      
      // Create a temporary link to download the file with the correct name
      const response = await fetch(staticUrl)
      if (!response.ok) {
        throw new Error('File not found')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading file:', error)
      // Final fallback - just open the file in a new tab
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api/v1', '') || 'http://localhost:3001'
      const staticUrl = `${baseUrl}${filePath}`
      window.open(staticUrl, '_blank')
    }
  }

  const fetchTickets = React.useCallback(async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tickets`)

      const result = await response.json()

      if (result.success) {
        setTickets(result.data)
      } else {
        console.error('Failed to fetch tickets:', result)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch])

  // Handler functions for ticket actions
  const handleViewDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowDetailsModal(true)
  }

  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowEditModal(true)
  }

  const handleAssignAgent = (ticket: Ticket) => {
    // Navigate to task management page which includes assign task functionality
    router.push(`/task-management?ticketId=${ticket.id}&action=assign`)
  }

  const handleDeleteTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setShowDeleteDialog(true)
  }

  const handleUpdateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      // Get current user's employee ID from session
      let changedBy = 'system' // fallback
      
      if (session?.user) {
        const userType = (session.user as any).userType
        if (userType === 'ADMIN') {
          changedBy = (session.user as any).adminId || 'admin'
        } else if (userType === 'EMPLOYEE') {
          changedBy = (session.user as any).employeeId || 'employee'
        }
      }

      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...updates,
          changedBy
        })
      })

      const result = await response.json()

      if (result.success) {
        // Refresh tickets list
        await fetchTickets()
        return result.data
      } else {
        throw new Error(result.message || 'Failed to update ticket')
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
      throw error
    }
  }

  const confirmDeleteTicket = async () => {
    if (!selectedTicket) return

    setDeletingTicket(true)
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tickets/${selectedTicket.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        showToast.success('Ticket deleted successfully')
        await fetchTickets()
        setShowDeleteDialog(false)
        setSelectedTicket(null)
      } else {
        throw new Error(result.message || 'Failed to delete ticket')
      }
    } catch (error) {
      console.error('Error deleting ticket:', error)
      showToast.error('Failed to delete ticket')
    } finally {
      setDeletingTicket(false)
    }
  }

  const handleExportToExcel = async (quickRange?: 'yesterday' | '15days' | '30days') => {
    setExporting(true)
    try {
      const filters: ExportFilters = {
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        quickRange
      }

      // Apply current tab filter
      if (activeTab !== 'all') {
        if (activeTab === 'open') {
          // Don't set status filter for open tab as it includes multiple statuses
        } else if (activeTab === 'resolved') {
          filters.status = 'RESOLVED'
        } else if (activeTab === 'closed') {
          filters.status = 'CLOSED'
        }
      }

      const result = await exportTicketsToExcel(authenticatedFetch, filters)
      const filterLabel = getFilterLabel(filters)
      showToast.success(`Excel export completed: ${result.filename}`)
    } catch (error) {
      console.error('Export failed:', error)
      showToast.error('Failed to export tickets to Excel')
    } finally {
      setExporting(false)
    }
  }

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchTickets()
    }
    
    // Removed auto-refresh to prevent page reloading
    // Users can manually refresh using the Refresh button
  }, [isAuthenticated, fetchTickets])

  // Calculate summary statistics
  const totalTickets = tickets.length
  const openTickets = tickets.filter(ticket => ticket.status === "OPEN").length
  const resolvedTickets = tickets.filter(ticket => ticket.status === "RESOLVED").length
  const closedTickets = tickets.filter(ticket => ticket.status === "CLOSED").length
  const highPriorityTickets = tickets.filter(ticket => ticket.priority === "HIGH" || ticket.priority === "CRITICAL").length
  
  // Calculate resolved today tickets
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1) // Start of tomorrow
  
  const resolvedTodayTickets = tickets.filter(ticket => {
    if (ticket.status !== "RESOLVED") return false
    const updatedDate = new Date(ticket.updatedAt)
    return updatedDate >= today && updatedDate < tomorrow
  }).length

  // Filter data based on search and filters
  const filteredData = tickets.filter(ticket => {
    const matchesSearch = ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (ticket.assignee?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (ticket.reporter?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || ticket.category?.name === selectedCategory
    const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus
    const matchesPriority = selectedPriority === "all" || ticket.priority === selectedPriority
    const matchesTab = activeTab === "all" || 
                      (activeTab === "open" && ticket.status === "OPEN") ||
                      (activeTab === "resolved" && ticket.status === "RESOLVED") ||
                      (activeTab === "closed" && ticket.status === "CLOSED")
    
    return matchesSearch && matchesCategory && matchesStatus && matchesPriority && matchesTab
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8 space-y-8">
        {/* Header Section */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground">Support Tickets</h1>
              <p className="text-muted-foreground">Manage and track customer support requests and issues</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={fetchTickets}
                disabled={loading}
                className="border-border hover:bg-accent"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-border hover:bg-accent"
                    disabled={exporting}
                  >
                    {exporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export to Excel
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleExportToExcel()}>
                    <Filter className="h-4 w-4 mr-2" />
                    Current Filter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportToExcel('yesterday')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Yesterday
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportToExcel('15days')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Last 15 Days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportToExcel('30days')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Last 30 Days
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                onClick={() => router.push('/tickets/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted">
              <TabsTrigger value="all" className="data-[state=active]:bg-background">
                All Tickets ({totalTickets})
              </TabsTrigger>
              <TabsTrigger value="open" className="data-[state=active]:bg-background">
                Open ({openTickets})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="data-[state=active]:bg-background">
                Resolved ({resolvedTickets})
              </TabsTrigger>
              <TabsTrigger value="closed" className="data-[state=active]:bg-background">
                Closed ({closedTickets})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Open Tickets</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{openTickets}</span>
                </div>
                <p className="text-sm text-muted-foreground">need attention</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resolved</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{resolvedTickets}</span>
                </div>
                <p className="text-sm text-muted-foreground">completed tickets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">High Priority</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <ArrowUpDown className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{highPriorityTickets}</span>
                </div>
                <p className="text-sm text-muted-foreground">urgent tickets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resolved Today</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{resolvedTodayTickets}</span>
                </div>
                <p className="text-sm text-muted-foreground">tickets completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets, assignees, or reporters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-border focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-border hover:bg-accent">
                      <Filter className="h-4 w-4 mr-2" />
                      Category
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedCategory("all")}>All Categories</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("AUTHENTICATION")}>Authentication</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("HARDWARE")}>Hardware</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("SOFTWARE")}>Software</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("NETWORK")}>Network</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("SECURITY")}>Security</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("DATABASE")}>Database</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("MAINTENANCE")}>Maintenance</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("SETUP")}>Setup</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-border hover:bg-accent">
                      <Filter className="h-4 w-4 mr-2" />
                      Priority
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedPriority("all")}>All Priorities</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("CRITICAL")}>Critical Priority</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("HIGH")}>High Priority</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("MEDIUM")}>Medium Priority</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("LOW")}>Low Priority</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card className="bg-card shadow-sm border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-border">
                <TableHead className="w-[280px] py-4 px-6 font-semibold text-foreground">Ticket Details</TableHead>
                <TableHead className="w-[180px] py-4 px-6 font-semibold text-foreground">Customer Info</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Status</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Priority</TableHead>
                <TableHead className="w-[150px] py-4 px-6 font-semibold text-foreground">Created By</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Attachments</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-foreground">Expected Date</TableHead>
                <TableHead className="py-4 px-6 font-semibold text-foreground">Department</TableHead>
                <TableHead className="w-[60px] py-4 px-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                      Loading tickets...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <Ticket className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Tickets Found</h3>
                      <p className="text-gray-600 mb-4">
                        {tickets.length === 0 
                          ? "No tickets have been created yet." 
                          : "No tickets match your current filters."
                        }
                      </p>
                      {tickets.length === 0 && (
                        <Button 
                          onClick={() => router.push('/tickets/new')}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Ticket
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((ticket, index) => (
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
                      {ticket.customerName ? (
                        <div className="space-y-1">
                          <p className="font-medium text-foreground text-sm">{ticket.customerName}</p>
                          <p className="text-xs text-muted-foreground">{ticket.customerId}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {ticket.customerPhone}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getStatusBadge(ticket.status)}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {getPriorityBadge(ticket.priority)}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {ticket.reporter ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {ticket.reporter.name.split(' ').map((n: string) => n[0]).join('')}
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
                      {ticket.attachments && ticket.attachments.length > 0 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-blue-50">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-600">{ticket.attachments.length}</span>
                                <div className="flex items-center gap-1">
                                  {ticket.attachments.slice(0, 2).map((attachment, index) => {
                                    const isImage = attachment.mimeType?.startsWith('image/') || 
                                                  attachment.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                                    return (
                                      <div
                                        key={index}
                                        className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center"
                                      >
                                        {isImage ? (
                                          <Image className="h-2.5 w-2.5 text-blue-600" />
                                        ) : (
                                          <FileText className="h-2.5 w-2.5 text-blue-600" />
                                        )}
                                      </div>
                                    )
                                  })}
                                  {ticket.attachments.length > 2 && (
                                    <span className="text-xs text-blue-600">+{ticket.attachments.length - 2}</span>
                                  )}
                                </div>
                              </div>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-64">
                            <div className="px-2 py-1.5 text-sm font-semibold text-foreground border-b">
                              Attachments ({ticket.attachments.length})
                            </div>
                            {ticket.attachments.map((attachment, index) => {
                              const isImage = attachment.mimeType?.startsWith('image/') || 
                                            attachment.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                              const fileSize = attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'
                              
                              return (
                                <DropdownMenuItem key={index} className="flex items-center gap-3 py-2">
                                  <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                                    {isImage ? (
                                      <Image className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <FileText className="h-4 w-4 text-blue-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate" title={attachment.fileName}>
                                      {attachment.fileName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {fileSize} • {attachment.mimeType || 'Unknown type'}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      downloadFile(attachment.filePath, attachment.fileName)
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="text-sm">
                        <p className="font-medium text-foreground">
                          {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'No due date'}
                        </p>
                        {ticket.estimatedHours && (
                          <p className="text-xs text-muted-foreground">{ticket.estimatedHours}h estimated</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <span className="text-sm text-muted-foreground">{ticket.department}</span>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(ticket)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditTicket(ticket)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Ticket
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssignAgent(ticket)}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Assign Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteTicket(ticket)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-card rounded-lg p-4 border border-border">
          <div>
            Showing {filteredData.length} of {totalTickets} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                3
              </Button>
            </div>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TicketDetailsModal 
        ticket={selectedTicket}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedTicket(null)
        }}
      />

      <EditTicketModal 
        ticket={selectedTicket}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedTicket(null)
        }}
        onSave={handleUpdateTicket}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ticket &ldquo;{selectedTicket?.ticketId}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false)
              setSelectedTicket(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTicket}
              disabled={deletingTicket}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingTicket ? (
                <>
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Ticket'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}