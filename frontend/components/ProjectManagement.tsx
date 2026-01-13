"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Edit,
  Trash2,
  FolderOpen,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  TrendingUp,
  Search,
  Filter,
  Download,
  Eye,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  CalendarDays,
  Zap,
  Package
} from "lucide-react"

interface ProjectProduct {
  id: string
  name: string
  category?: string
  vendor?: string
  notes?: string
  createdAt: string
}

interface Project {
  id: string
  name: string
  startDate: string
  status: 'ONGOING' | 'COMPLETED' | 'ON_HOLD'
  createdAt: string
  updates: ProjectUpdate[]
  payments: ProjectPayment[]
  products: ProjectProduct[]
  description?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  budget?: number
  progress?: number
  endDate?: string
}

interface ProjectUpdate {
  id: string
  update: string
  issues?: string
  pendingTasks?: string
  workProgress?: string
  createdAt: string
  updatedBy?: string
}

interface ProjectPayment {
  id: string
  status: 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULL_DUE'
  amountPaid?: number
  amountDue?: number
  remarks?: string
  createdAt: string
  dueDate?: string
  invoiceNumber?: string
}

interface ProjectStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  onHoldProjects: number
  totalRevenue: number
  pendingPayments: number
}

export function ProjectManagement() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [stats, setStats] = React.useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    totalRevenue: 0,
    pendingPayments: 0
  })
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
  const [priorityFilter, setPriorityFilter] = React.useState<string>("ALL")

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false)
  const [isViewAllUpdatesDialogOpen, setIsViewAllUpdatesDialogOpen] = React.useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = React.useState(false)
  const [isProductDialogOpen, setIsProductDialogOpen] = React.useState(false)

  // Form states
  const [projectForm, setProjectForm] = React.useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'ONGOING' as 'ONGOING' | 'COMPLETED' | 'ON_HOLD',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    budget: ''
  })

  const [updateForm, setUpdateForm] = React.useState({
    update: '',
    issues: '',
    pendingTasks: '',
    workProgress: '',
    updatedBy: ''
  })

  const [paymentForm, setPaymentForm] = React.useState({
    status: 'FULL_DUE' as 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULL_DUE',
    amountPaid: '',
    amountDue: '',
    remarks: '',
    dueDate: '',
    invoiceNumber: ''
  })

  const [productForm, setProductForm] = React.useState({
    name: '',
    category: '',
    vendor: '',
    notes: ''
  })

  // Fetch projects and calculate stats
  const fetchProjects = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects`)
      const result = await response.json()

      if (result.success) {
        const projectsData = result.data || []
        setProjects(projectsData)
        calculateStats(projectsData)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (projectsData: Project[]) => {
    const totalProjects = projectsData.length
    const activeProjects = projectsData.filter(p => p.status === 'ONGOING').length
    const completedProjects = projectsData.filter(p => p.status === 'COMPLETED').length
    const onHoldProjects = projectsData.filter(p => p.status === 'ON_HOLD').length

    const totalRevenue = projectsData.reduce((sum, project) => {
      const paidAmount = project.payments.reduce((pSum, payment) => pSum + (payment.amountPaid || 0), 0)
      return sum + paidAmount
    }, 0)

    const pendingPayments = projectsData.reduce((sum, project) => {
      const dueAmount = project.payments.reduce((pSum, payment) => pSum + (payment.amountDue || 0), 0)
      return sum + dueAmount
    }, 0)

    setStats({
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      totalRevenue,
      pendingPayments
    })
  }

  React.useEffect(() => {
    fetchProjects()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter projects based on search and filters
  const filteredProjects = React.useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter
      const matchesPriority = priorityFilter === 'ALL' || project.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [projects, searchTerm, statusFilter, priorityFilter])

  // Add project
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          budget: projectForm.budget ? parseFloat(projectForm.budget) : null
        })
      })

      const result = await response.json()

      if (result.success) {
        await fetchProjects()
        setIsAddDialogOpen(false)
        resetProjectForm()
      }
    } catch (error) {
      console.error('Error adding project:', error)
    }
  }

  const resetProjectForm = () => {
    setProjectForm({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'ONGOING',
      priority: 'MEDIUM',
      budget: ''
    })
  }

  // Update project
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProject) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          budget: projectForm.budget ? parseFloat(projectForm.budget) : null
        })
      })

      const result = await response.json()

      if (result.success) {
        await fetchProjects()
        setIsEditDialogOpen(false)
        setSelectedProject(null)
      }
    } catch (error) {
      console.error('Error updating project:', error)
    }
  }

  // Add project update
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProject) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${selectedProject.id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm)
      })

      const result = await response.json()

      if (result.success) {
        await fetchProjects()
        setIsUpdateDialogOpen(false)
        setUpdateForm({ update: '', issues: '', pendingTasks: '', workProgress: '', updatedBy: '' })
      }
    } catch (error) {
      console.error('Error adding update:', error)
    }
  }

  // Add payment info
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProject) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${selectedProject.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          amountPaid: paymentForm.amountPaid ? parseFloat(paymentForm.amountPaid) : null,
          amountDue: paymentForm.amountDue ? parseFloat(paymentForm.amountDue) : null
        })
      })

      const result = await response.json()

      if (result.success) {
        await fetchProjects()
        setIsPaymentDialogOpen(false)
        setPaymentForm({ status: 'FULL_DUE', amountPaid: '', amountDue: '', remarks: '', dueDate: '', invoiceNumber: '' })
      }
    } catch (error) {
      console.error('Error adding payment:', error)
    }
  }

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${projectId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        await fetchProjects()
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  // Add product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProject) return
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/projects/${selectedProject.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchProjects()
        setIsProductDialogOpen(false)
        setProductForm({ name: '', category: '', vendor: '', notes: '' })
      }
    } catch (error) {
      console.error('Error adding product:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONGOING': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Active</Badge>
      case 'COMPLETED': return <Badge className="bg-slate-100 text-emerald-700 border-emerald-100">Completed</Badge>
      case 'ON_HOLD': return <Badge className="bg-slate-100 text-amber-700 border-amber-100">On Hold</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null

    switch (priority) {
      case 'CRITICAL': return <Badge className="bg-rose-50 text-rose-700 border-rose-100"><Zap className="h-3 w-3 mr-1" />Critical</Badge>
      case 'HIGH': return <Badge className="bg-amber-50 text-amber-700 border-amber-100"><ArrowUpRight className="h-3 w-3 mr-1" />High</Badge>
      case 'MEDIUM': return <Badge className="bg-slate-100 text-slate-700 border-slate-200"><Target className="h-3 w-3 mr-1" />Medium</Badge>
      case 'LOW': return <Badge className="bg-slate-100 text-slate-600 border-slate-200"><ArrowDownRight className="h-3 w-3 mr-1" />Low</Badge>
      default: return null
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'FULLY_PAID': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case 'PARTIALLY_PAID': return <Badge className="bg-amber-50 text-amber-700 border-amber-100"><Clock className="h-3 w-3 mr-1" />Partial</Badge>
      case 'FULL_DUE': return <Badge className="bg-rose-50 text-rose-700 border-rose-100"><AlertCircle className="h-3 w-3 mr-1" />Due</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-3">
              <Building2 className="h-7 w-7 text-slate-700" />
              Project Management
            </h1>
            <p className="text-sm text-slate-600">Comprehensive project oversight and client management</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white h-9 flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 shadow-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-slate-900">
                    <Plus className="h-5 w-5" />
                    Create New Project
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddProject} className="space-y-6 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="name" className="text-xs font-medium text-slate-600">Project Name *</Label>
                      <Input
                        id="name"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        placeholder="Enter project name"
                        required
                        className="h-9 text-sm border-slate-300"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description" className="text-xs font-medium text-slate-600">Project Description</Label>
                      <Textarea
                        id="description"
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        placeholder="Brief description of the project scope and objectives"
                        className="min-h-[80px] text-sm border-slate-300"
                      />
                    </div>

                    <div>
                      <Label htmlFor="startDate" className="text-xs font-medium text-slate-600">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={projectForm.startDate}
                        onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                        required
                        className="h-9 text-sm border-slate-300"
                      />
                    </div>

                    <div>
                      <Label htmlFor="endDate" className="text-xs font-medium text-slate-600">Expected End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={projectForm.endDate}
                        onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                        className="h-9 text-sm border-slate-300"
                      />
                    </div>

                    <div>
                      <Label htmlFor="priority" className="text-xs font-medium text-slate-600">Priority</Label>
                      <Select value={projectForm.priority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => setProjectForm({ ...projectForm, priority: value })}>
                        <SelectTrigger className="h-9 text-sm border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low Priority</SelectItem>
                          <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                          <SelectItem value="HIGH">High Priority</SelectItem>
                          <SelectItem value="CRITICAL">Critical Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status" className="text-xs font-medium text-slate-600">Initial Status</Label>
                      <Select value={projectForm.status} onValueChange={(value: 'ONGOING' | 'COMPLETED' | 'ON_HOLD') => setProjectForm({ ...projectForm, status: value })}>
                        <SelectTrigger className="h-9 text-sm border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ONGOING">Active</SelectItem>
                          <SelectItem value="ON_HOLD">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="budget" className="text-xs font-medium text-slate-600">Project Budget (₹)</Label>
                      <Input
                        id="budget"
                        type="number"
                        step="0.01"
                        value={projectForm.budget}
                        onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                        placeholder="0.00"
                        className="h-9 text-sm border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <Button type="submit" className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-10 border-slate-200 text-slate-700">
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-200 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Projects</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.totalProjects}</p>
              </div>
              <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Projects</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.activeProjects}</p>
              </div>
              <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending Payments</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">₹{stats.pendingPayments.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-white border border-slate-200 rounded-lg">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search projects..."
                  className="pl-9 h-9 text-sm border-slate-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm border-slate-300 w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ONGOING">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 text-sm border-slate-300 w-full sm:w-[180px]">
                  <Target className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priority</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold text-slate-900 truncate">
                      {project.name}
                    </CardTitle>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      <span>{project.startDate ? new Date(project.startDate).toLocaleDateString() : '--'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {getStatusBadge(project.status)}
                    {getPriorityBadge(project.priority)}
                  </div>
                </div>

                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProject(project)
                      setIsViewDialogOpen(true)
                    }}
                  >
                    <Eye className="h-4 w-4 text-slate-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProject(project)
                      setProjectForm({
                        name: project.name,
                        description: project.description || '',
                        startDate: project.startDate ? project.startDate.split('T')[0] : '',
                        endDate: project.endDate ? project.endDate.split('T')[0] : '',
                        status: project.status,
                        priority: project.priority || 'MEDIUM',
                        budget: project.budget?.toString() || ''
                      })
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4 text-slate-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {project.description && (
                <p className="text-sm text-slate-600 line-clamp-2">{project.description}</p>
              )}

              {project.budget && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-slate-600" />
                  <span className="font-medium text-slate-800">₹{project.budget.toLocaleString()}</span>
                </div>
              )}

              <Tabs defaultValue="updates" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="updates" className="text-xs">Updates</TabsTrigger>
                  <TabsTrigger value="payment" className="text-xs">Payment</TabsTrigger>
                  <TabsTrigger value="products" className="text-xs">Products</TabsTrigger>
                </TabsList>

                <TabsContent value="updates" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Recent Updates</span>
                    <div className="flex gap-2">
                      {project.updates.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProject(project)
                            setIsViewAllUpdatesDialogOpen(true)
                          }}
                        >
                          <FolderOpen className="h-3 w-3 mr-1 text-slate-600" />
                          All ({project.updates.length})
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProject(project)
                          setIsUpdateDialogOpen(true)
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {project.updates.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No updates yet</p>
                    ) : (
                      project.updates.slice(0, 2).map((update) => (
                        <div key={update.id} className="p-2 bg-slate-50 rounded text-sm">
                          <p className="text-slate-900 line-clamp-2">{update.update}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(update.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Payment Status</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project)
                        setIsPaymentDialogOpen(true)
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Update
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {project.payments.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No payment info</p>
                    ) : (
                      project.payments.slice(-1).map((payment) => (
                        <div key={payment.id} className="p-2 bg-slate-50 rounded">
                          <div className="flex items-center justify-between mb-2">
                            {getPaymentStatusBadge(payment.status)}
                          </div>
                          {(payment.amountPaid || payment.amountDue) && (
                            <div className="text-sm space-y-1">
                              {payment.amountPaid && (
                                <p className="text-emerald-700">Paid: ₹{payment.amountPaid.toLocaleString()}</p>
                              )}
                              {payment.amountDue && (
                                <p className="text-rose-700">Due: ₹{payment.amountDue.toLocaleString()}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="products" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Products Used</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project)
                        setIsProductDialogOpen(true)
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {project.products?.length === 0 || !project.products ? (
                      <p className="text-sm text-gray-500 text-center py-4">No products added</p>
                    ) : (
                      project.products.map((product) => (
                        <div key={product.id} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{product.name}</span>
                          </div>
                          {(product.category || product.vendor) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {product.category} {product.vendor && `• ${product.vendor}`}
                            </p>
                          )}
                          {product.notes && (
                            <p className="text-xs text-gray-600 mt-1">{product.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
          </h3>
          <p className="text-slate-500 mb-4">
            {projects.length === 0
              ? 'Get started by creating your first project'
              : 'Try adjusting your search or filter criteria'
            }
          </p>
          {projects.length === 0 && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      )}

      {/* Project Details View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Building2 className="h-5 w-5" />
              {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6 p-4">
              {/* Project Overview */}
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Project Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-600">Description</Label>
                      <p className="text-slate-900">{selectedProject.description || 'No description provided'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Status</Label>
                        <div className="mt-1">{getStatusBadge(selectedProject.status)}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Priority</Label>
                        <div className="mt-1">{getPriorityBadge(selectedProject.priority)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Start Date</Label>
                        <p className="text-slate-900">{selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : '--'}</p>
                      </div>
                      {selectedProject.endDate && (
                        <div>
                          <Label className="text-sm font-medium text-slate-600">End Date</Label>
                          <p className="text-slate-900">{new Date(selectedProject.endDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {selectedProject.budget && (
                      <div>
                        <Label className="text-sm font-medium text-slate-600">Budget</Label>
                        <p className="text-slate-900">₹{selectedProject.budget.toLocaleString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Updates and Payments */}
              <Tabs defaultValue="updates" className="w-full">
                <TabsList>
                  <TabsTrigger value="updates">Project Updates</TabsTrigger>
                  <TabsTrigger value="payments">Payment History</TabsTrigger>
                </TabsList>

                <TabsContent value="updates" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Project Updates</h3>
                    <Button
                      onClick={() => {
                        setIsUpdateDialogOpen(true)
                      }}
                      className="h-9"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Update
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {selectedProject.updates.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No updates available</p>
                    ) : (
                      selectedProject.updates.map((update, index) => (
                        <Card key={update.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Update #{selectedProject.updates.length - index}
                                </Badge>
                                {index === 0 && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">
                                    Latest
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm text-slate-500">
                                {new Date(update.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="h-4 w-4 text-slate-600" />
                                  <span className="text-sm font-medium text-slate-700">Progress Update</span>
                                </div>
                                <p className="text-slate-900 leading-relaxed pl-6">{update.update}</p>
                              </div>

                              {update.issues && (
                                <div className="border-t pt-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="h-4 w-4 text-rose-500" />
                                    <span className="text-sm font-medium text-rose-700">Issues Faced</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed pl-6">{update.issues}</p>
                                </div>
                              )}

                              {update.pendingTasks && (
                                <div className="border-t pt-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm font-medium text-amber-700">Pending Tasks</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed pl-6">{update.pendingTasks}</p>
                                </div>
                              )}

                              {update.workProgress && (
                                <div className="border-t pt-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-medium text-emerald-700">Work Progress Notes</span>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed pl-6">{update.workProgress}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Payment History</h3>
                    <Button
                      onClick={() => {
                        setIsPaymentDialogOpen(true)
                      }}
                      className="h-9"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {selectedProject.payments.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No payment records available</p>
                    ) : (
                      selectedProject.payments.map((payment) => (
                        <Card key={payment.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              {getPaymentStatusBadge(payment.status)}
                              <span className="text-sm text-slate-500">
                                {new Date(payment.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {payment.amountPaid && (
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Amount Paid</Label>
                                  <p className="text-emerald-700 font-semibold">₹{payment.amountPaid.toLocaleString()}</p>
                                </div>
                              )}

                              {payment.amountDue && (
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Amount Due</Label>
                                  <p className="text-rose-700 font-semibold">₹{payment.amountDue.toLocaleString()}</p>
                                </div>
                              )}

                              {payment.invoiceNumber && (
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Invoice Number</Label>
                                  <p className="text-slate-900">{payment.invoiceNumber}</p>
                                </div>
                              )}

                              {payment.dueDate && (
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Due Date</Label>
                                  <p className="text-slate-900">{new Date(payment.dueDate).toLocaleDateString()}</p>
                                </div>
                              )}
                            </div>

                            {payment.remarks && (
                              <div className="mt-4">
                                <Label className="text-sm font-medium text-slate-600">Remarks</Label>
                                <p className="text-slate-700">{payment.remarks}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Edit className="h-5 w-5" />
              Edit Project
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className="space-y-6 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="edit-name" className="text-xs font-medium text-slate-600">Project Name *</Label>
                <Input
                  id="edit-name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  required
                  className="h-9 text-sm border-slate-300"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-description" className="text-xs font-medium text-slate-600">Project Description</Label>
                <Textarea
                  id="edit-description"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Brief description of the project scope and objectives"
                  className="min-h-[80px] text-sm border-slate-300"
                />
              </div>

              <div>
                <Label htmlFor="edit-startDate" className="text-xs font-medium text-slate-600">Start Date *</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  required
                  className="h-9 text-sm border-slate-300"
                />
              </div>

              <div>
                <Label htmlFor="edit-endDate" className="text-xs font-medium text-slate-600">Expected End Date</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                  className="h-9 text-sm border-slate-300"
                />
              </div>

              <div>
                <Label htmlFor="edit-priority" className="text-xs font-medium text-slate-600">Priority</Label>
                <Select value={projectForm.priority} onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => setProjectForm({ ...projectForm, priority: value })}>
                  <SelectTrigger className="h-9 text-sm border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low Priority</SelectItem>
                    <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                    <SelectItem value="HIGH">High Priority</SelectItem>
                    <SelectItem value="CRITICAL">Critical Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-status" className="text-xs font-medium text-slate-600">Status</Label>
                <Select value={projectForm.status} onValueChange={(value: 'ONGOING' | 'COMPLETED' | 'ON_HOLD') => setProjectForm({ ...projectForm, status: value })}>
                  <SelectTrigger className="h-9 text-sm border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONGOING">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-budget" className="text-xs font-medium text-slate-600">Project Budget (₹)</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  step="0.01"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                  placeholder="0.00"
                  className="h-9 text-sm border-slate-300"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button type="submit" className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white">
                <Edit className="h-4 w-4 mr-2" />
                Update Project
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="h-10 border-slate-200 text-slate-700">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Add Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <FileText className="h-5 w-5" />
              Add Project Update
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUpdate} className="space-y-4 p-4">
            <div>
              <Label htmlFor="update" className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <CheckCircle className="h-4 w-4 text-slate-600" />
                Progress Update *
              </Label>
              <Textarea
                id="update"
                value={updateForm.update}
                onChange={(e) => setUpdateForm({ ...updateForm, update: e.target.value })}
                placeholder="Describe the latest progress, milestones achieved, or current status..."
                className="mt-1 min-h-[80px] text-sm border-slate-300"
                required
              />
            </div>

            <div>
              <Label htmlFor="issues" className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <AlertCircle className="h-4 w-4 text-rose-500" />
                Issues Faced
              </Label>
              <Textarea
                id="issues"
                value={updateForm.issues}
                onChange={(e) => setUpdateForm({ ...updateForm, issues: e.target.value })}
                placeholder="Any challenges, blockers, or problems encountered..."
                className="mt-1 min-h-[60px] text-sm border-slate-300"
              />
            </div>

            <div>
              <Label htmlFor="pendingTasks" className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Tasks
              </Label>
              <Textarea
                id="pendingTasks"
                value={updateForm.pendingTasks}
                onChange={(e) => setUpdateForm({ ...updateForm, pendingTasks: e.target.value })}
                placeholder="Tasks that need to be completed, upcoming deliverables..."
                className="mt-1 min-h-[60px] text-sm border-slate-300"
              />
            </div>

            <div>
              <Label htmlFor="workProgress" className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Work Progress Notes
              </Label>
              <Textarea
                id="workProgress"
                value={updateForm.workProgress}
                onChange={(e) => setUpdateForm({ ...updateForm, workProgress: e.target.value })}
                placeholder="Additional progress notes, technical details, or observations..."
                className="mt-1 min-h-[60px] text-sm border-slate-300"
              />
            </div>

            <div>
              <Label htmlFor="updatedBy" className="text-sm font-medium text-slate-600">Updated By</Label>
              <Input
                id="updatedBy"
                value={updateForm.updatedBy}
                onChange={(e) => setUpdateForm({ ...updateForm, updatedBy: e.target.value })}
                placeholder="Your name or team member name"
                className="h-9 text-sm border-slate-300"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button type="submit" className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Update
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsUpdateDialogOpen(false)} className="h-10 border-slate-200 text-slate-700">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md rounded-lg border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <DollarSign className="h-5 w-5" />
              Update Payment Information
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4 p-4">
            <div>
              <Label htmlFor="payment-status" className="text-sm font-medium text-slate-600">Payment Status</Label>
              <Select value={paymentForm.status} onValueChange={(value: 'FULLY_PAID' | 'PARTIALLY_PAID' | 'FULL_DUE') => setPaymentForm({ ...paymentForm, status: value })}>
                <SelectTrigger className="h-9 text-sm border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULLY_PAID">Fully Paid</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                  <SelectItem value="FULL_DUE">Full Due</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amountPaid" className="text-sm font-medium text-slate-600">Amount Paid (₹)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                  placeholder="0.00"
                  className="h-9 text-sm border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="amountDue" className="text-sm font-medium text-slate-600">Amount Due (₹)</Label>
                <Input
                  id="amountDue"
                  type="number"
                  step="0.01"
                  value={paymentForm.amountDue}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountDue: e.target.value })}
                  placeholder="0.00"
                  className="h-9 text-sm border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber" className="text-sm font-medium text-slate-600">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={paymentForm.invoiceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                  className="h-9 text-sm border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="dueDate" className="text-sm font-medium text-slate-600">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={paymentForm.dueDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                  className="h-9 text-sm border-slate-300"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="remarks" className="text-sm font-medium text-slate-600">Payment Remarks</Label>
              <Textarea
                id="remarks"
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                placeholder="Additional payment notes..."
                className="text-sm border-slate-300"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white">
                <DollarSign className="h-4 w-4 mr-2" />
                Update Payment
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="h-10 border-slate-200 text-slate-700">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View All Updates Dialog */}
      <Dialog open={isViewAllUpdatesDialogOpen} onOpenChange={setIsViewAllUpdatesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-lg border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <FolderOpen className="h-5 w-5" />
              All Updates - {selectedProject?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            {selectedProject?.updates.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No updates available</p>
            ) : (
              selectedProject?.updates.map((update, index) => (
                <div key={update.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                        Update #{selectedProject.updates.length - index}
                      </span>
                      {index === 0 && (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">
                      {new Date(update.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-700">Progress Update</span>
                      </div>
                      <p className="text-slate-900 leading-relaxed pl-6">{update.update}</p>
                    </div>

                    {update.issues && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-rose-500" />
                          <span className="text-sm font-medium text-rose-700">Issues Faced</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed pl-6">{update.issues}</p>
                      </div>
                    )}

                    {update.pendingTasks && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium text-amber-700">Pending Tasks</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed pl-6">{update.pendingTasks}</p>
                      </div>
                    )}

                    {update.workProgress && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-700">Work Progress Notes</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed pl-6">{update.workProgress}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100 p-4">
            <Button variant="outline" onClick={() => setIsViewAllUpdatesDialogOpen(false)} className="h-9 border-slate-200 text-slate-700">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Add Product
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <Label htmlFor="product-name">Product Name *</Label>
              <Input
                id="product-name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="product-category">Category</Label>
              <Input
                id="product-category"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                placeholder="Product category"
              />
            </div>
            
            <div>
              <Label htmlFor="product-vendor">Vendor</Label>
              <Input
                id="product-vendor"
                value={productForm.vendor}
                onChange={(e) => setProductForm({ ...productForm, vendor: e.target.value })}
                placeholder="Vendor/Supplier name"
              />
            </div>
            
            <div>
              <Label htmlFor="product-notes">Notes</Label>
              <Textarea
                id="product-notes"
                value={productForm.notes}
                onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                placeholder="Additional notes about the product"
                className="min-h-[60px]"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                <Package className="h-4 w-4 mr-2" />
                Add Product
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}