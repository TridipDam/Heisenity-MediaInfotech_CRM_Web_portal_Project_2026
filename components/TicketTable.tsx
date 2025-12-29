"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Ticket, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Clock,
  User,
  MessageSquare,
  Calendar,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  ArrowUpDown
} from "lucide-react"

// Mock data for tickets with comprehensive information
const ticketData = [
  {
    id: "TKT-001",
    title: "Login Authentication Issues",
    description: "Users unable to login with correct credentials",
    category: "Authentication",
    priority: "high",
    status: "open",
    assignee: "Sarah Johnson",
    reporter: "Michael Chen",
    createdDate: "2024-12-28",
    updatedDate: "2024-12-28",
    dueDate: "2024-12-30",
    tags: ["urgent", "security"],
    comments: 5,
    estimatedHours: 8,
    department: "IT Support"
  },
  {
    id: "TKT-002",
    title: "Printer Not Working in Office 3A",
    description: "HP LaserJet printer showing offline status",
    category: "Hardware",
    priority: "medium",
    status: "in_progress",
    assignee: "David Wilson",
    reporter: "Emily Rodriguez",
    createdDate: "2024-12-27",
    updatedDate: "2024-12-28",
    dueDate: "2024-12-29",
    tags: ["hardware", "office"],
    comments: 3,
    estimatedHours: 4,
    department: "Facilities"
  },
  {
    id: "TKT-003",
    title: "Software License Renewal Request",
    description: "Adobe Creative Suite licenses expiring next month",
    category: "Software",
    priority: "low",
    status: "pending",
    assignee: "Lisa Wang",
    reporter: "James Thompson",
    createdDate: "2024-12-26",
    updatedDate: "2024-12-27",
    dueDate: "2025-01-15",
    tags: ["license", "software"],
    comments: 2,
    estimatedHours: 2,
    department: "Procurement"
  },
  {
    id: "TKT-004",
    title: "Network Connectivity Issues",
    description: "Intermittent internet connection in Building B",
    category: "Network",
    priority: "high",
    status: "open",
    assignee: "Robert Martinez",
    reporter: "Anna Kowalski",
    createdDate: "2024-12-28",
    updatedDate: "2024-12-28",
    dueDate: "2024-12-29",
    tags: ["network", "urgent"],
    comments: 7,
    estimatedHours: 12,
    department: "IT Infrastructure"
  },
  {
    id: "TKT-005",
    title: "Email Server Maintenance",
    description: "Scheduled maintenance for email server upgrade",
    category: "Maintenance",
    priority: "medium",
    status: "scheduled",
    assignee: "Sarah Johnson",
    reporter: "System Admin",
    createdDate: "2024-12-25",
    updatedDate: "2024-12-27",
    dueDate: "2024-12-31",
    tags: ["maintenance", "email"],
    comments: 1,
    estimatedHours: 6,
    department: "IT Support"
  },
  {
    id: "TKT-006",
    title: "New Employee Laptop Setup",
    description: "Configure laptop and software for new hire",
    category: "Setup",
    priority: "medium",
    status: "in_progress",
    assignee: "David Wilson",
    reporter: "HR Department",
    createdDate: "2024-12-27",
    updatedDate: "2024-12-28",
    dueDate: "2024-12-30",
    tags: ["setup", "onboarding"],
    comments: 4,
    estimatedHours: 3,
    department: "IT Support"
  },
  {
    id: "TKT-007",
    title: "Database Performance Optimization",
    description: "Slow query performance affecting application",
    category: "Database",
    priority: "high",
    status: "resolved",
    assignee: "Robert Martinez",
    reporter: "Development Team",
    createdDate: "2024-12-20",
    updatedDate: "2024-12-26",
    dueDate: "2024-12-25",
    tags: ["database", "performance"],
    comments: 12,
    estimatedHours: 16,
    department: "IT Infrastructure"
  },
  {
    id: "TKT-008",
    title: "Security Camera Malfunction",
    description: "Camera 15 in parking lot not recording",
    category: "Security",
    priority: "medium",
    status: "closed",
    assignee: "Lisa Wang",
    reporter: "Security Team",
    createdDate: "2024-12-22",
    updatedDate: "2024-12-24",
    dueDate: "2024-12-26",
    tags: ["security", "hardware"],
    comments: 6,
    estimatedHours: 5,
    department: "Security"
  }
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "open":
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    case "in_progress":
      return <Clock className="h-4 w-4 text-blue-600" />
    case "pending":
      return <Clock className="h-4 w-4 text-amber-600" />
    case "scheduled":
      return <Calendar className="h-4 w-4 text-purple-600" />
    case "resolved":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "closed":
      return <XCircle className="h-4 w-4 text-gray-600" />
    default:
      return <Ticket className="h-4 w-4 text-gray-400" />
  }
}

const getStatusBadge = (status: string) => {
  const variants = {
    open: "bg-red-50 text-red-700 border-red-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    scheduled: "bg-purple-50 text-purple-700 border-purple-200",
    resolved: "bg-green-50 text-green-700 border-green-200",
    closed: "bg-gray-50 text-gray-700 border-gray-200"
  }
  
  const labels = {
    open: "Open",
    in_progress: "In Progress",
    pending: "Pending",
    scheduled: "Scheduled",
    resolved: "Resolved",
    closed: "Closed"
  }
  
  return (
    <Badge className={`${variants[status as keyof typeof variants]} font-medium capitalize`}>
      {labels[status as keyof typeof labels]}
    </Badge>
  )
}

const getPriorityBadge = (priority: string) => {
  const variants = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-green-50 text-green-700 border-green-200"
  }
  
  return (
    <Badge className={`${variants[priority as keyof typeof variants]} font-medium capitalize`}>
      {priority} Priority
    </Badge>
  )
}

export function TicketTable() {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [selectedStatus, setSelectedStatus] = React.useState("all")
  const [selectedPriority, setSelectedPriority] = React.useState("all")
  const [activeTab, setActiveTab] = React.useState("all")

  // Calculate summary statistics
  const totalTickets = ticketData.length
  const openTickets = ticketData.filter(ticket => ticket.status === "open").length
  const inProgressTickets = ticketData.filter(ticket => ticket.status === "in_progress").length
  const resolvedTickets = ticketData.filter(ticket => ticket.status === "resolved").length
  const closedTickets = ticketData.filter(ticket => ticket.status === "closed").length
  const highPriorityTickets = ticketData.filter(ticket => ticket.priority === "high").length

  // Filter data based on search and filters
  const filteredData = ticketData.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.assignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.reporter.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || ticket.category === selectedCategory
    const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus
    const matchesPriority = selectedPriority === "all" || ticket.priority === selectedPriority
    const matchesTab = activeTab === "all" || 
                      (activeTab === "open" && ["open", "in_progress", "pending", "scheduled"].includes(ticket.status)) ||
                      (activeTab === "resolved" && ticket.status === "resolved") ||
                      (activeTab === "closed" && ticket.status === "closed")
    
    return matchesSearch && matchesCategory && matchesStatus && matchesPriority && matchesTab
  })

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="p-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
              <p className="text-gray-600">Manage and track customer support requests and issues</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100">
              <TabsTrigger value="all" className="data-[state=active]:bg-white">
                All Tickets ({totalTickets})
              </TabsTrigger>
              <TabsTrigger value="open" className="data-[state=active]:bg-white">
                Active ({openTickets + inProgressTickets})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="data-[state=active]:bg-white">
                Resolved ({resolvedTickets})
              </TabsTrigger>
              <TabsTrigger value="closed" className="data-[state=active]:bg-white">
                Closed ({closedTickets})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Open Tickets</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{openTickets}</span>
                  <div className="flex items-center gap-1 text-red-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+2</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">need attention</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">In Progress</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{inProgressTickets}</span>
                  <div className="flex items-center gap-1 text-blue-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+1</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">being worked on</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">High Priority</CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <ArrowUpDown className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{highPriorityTickets}</span>
                  <div className="flex items-center gap-1 text-amber-600">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-sm font-medium">-1</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">urgent tickets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Resolved Today</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">5</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-sm font-medium">+3</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">tickets completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="bg-white shadow-sm border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tickets, assignees, or reporters..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                      <Filter className="h-4 w-4 mr-2" />
                      Category
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedCategory("all")}>All Categories</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Authentication")}>Authentication</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Hardware")}>Hardware</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Software")}>Software</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Network")}>Network</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategory("Security")}>Security</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                      <Filter className="h-4 w-4 mr-2" />
                      Priority
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSelectedPriority("all")}>All Priorities</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("high")}>High Priority</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("medium")}>Medium Priority</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedPriority("low")}>Low Priority</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card className="bg-white shadow-sm border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 border-b border-gray-200">
                <TableHead className="w-[280px] py-4 px-6 font-semibold text-gray-700">Ticket Details</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Status</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Priority</TableHead>
                <TableHead className="w-[150px] py-4 px-6 font-semibold text-gray-700">Assignee</TableHead>
                <TableHead className="w-[120px] py-4 px-6 font-semibold text-gray-700">Due Date</TableHead>
                <TableHead className="w-[100px] py-4 px-6 font-semibold text-gray-700">Comments</TableHead>
                <TableHead className="py-4 px-6 font-semibold text-gray-700">Department</TableHead>
                <TableHead className="w-[60px] py-4 px-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((ticket, index) => (
                <TableRow 
                  key={ticket.id} 
                  className={`hover:bg-gray-50/50 border-b border-gray-100 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                          <Ticket className="h-6 w-6" />
                        </div>
                        {getStatusIcon(ticket.status) && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                            {getStatusIcon(ticket.status)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{ticket.title}</p>
                        <p className="text-sm text-gray-500">{ticket.id} • {ticket.category}</p>
                        <p className="text-xs text-gray-400 line-clamp-1">{ticket.description}</p>
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
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {ticket.assignee.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{ticket.assignee}</p>
                        <p className="text-xs text-gray-500">Assignee</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{ticket.dueDate}</p>
                      <p className="text-xs text-gray-500">{ticket.estimatedHours}h estimated</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{ticket.comments}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <span className="text-sm text-gray-600">{ticket.department}</span>
                  </TableCell>
                  <TableCell className="py-4 px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Ticket
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Assign Agent
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 bg-white rounded-lg p-4 border border-gray-200">
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
    </div>
  )
}