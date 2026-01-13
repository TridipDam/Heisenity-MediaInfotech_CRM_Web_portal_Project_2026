"use client"

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import TenderDocumentUpload from './TenderDocumentUpload'
import TenderEMDManagement from './TenderEMDManagement'
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  Upload, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  Calendar,
  Building,
  Gavel
} from 'lucide-react'

interface Tender {
  id: string
  tenderNumber: string
  name: string
  description?: string
  department: string
  projectMapping?: string
  tenderType: string
  submissionDate: string
  deadline: string
  status: string
  totalValue?: number
  requiredDocuments?: string
  totalEMDInvested?: number
  totalEMDRefunded?: number
  totalEMDForfeited?: number
  createdAt: string
  updatedAt: string
  internalRemarks?: string
  documents: TenderDocument[]
  emdRecords: EMDRecord[]
  _count: {
    documents: number
    emdRecords: number
  }
}

interface TenderDocument {
  id: string
  fileName: string
  originalName: string
  documentType: string
  isRequired: boolean
  status: string
  uploadedAt: string
  verifiedAt?: string
  remarks?: string
}

interface EMDRecord {
  id: string
  amount: number
  status: string
  investedAt: string
  refundedAt?: string
  forfeitedAt?: string
  remarks?: string
}

interface EMDSummary {
  totalInvested: number
  totalRefunded: number
  totalForfeited: number
  countInvested: number
  countRefunded: number
  countForfeited: number
}

const TENDER_TYPES = [
  { value: 'OPEN', label: 'Open Tender' },
  { value: 'LIMITED', label: 'Limited Tender' },
  { value: 'SINGLE_SOURCE', label: 'Single Source' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'FRAMEWORK', label: 'Framework' },
  { value: 'OTHER', label: 'Other' }
]

const TENDER_STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'SUBMITTED', label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  { value: 'APPROVED', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'AWARDED', label: 'Awarded', color: 'bg-purple-100 text-purple-800' },
  { value: 'NOT_AWARDED', label: 'Not Awarded', color: 'bg-orange-100 text-orange-800' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-100 text-gray-800' }
]

const DOCUMENT_TYPES = [
  { value: 'TECHNICAL_SPECIFICATION', label: 'Technical Specification' },
  { value: 'FINANCIAL_PROPOSAL', label: 'Financial Proposal' },
  { value: 'COMPANY_PROFILE', label: 'Company Profile' },
  { value: 'COMPLIANCE_CERTIFICATE', label: 'Compliance Certificate' },
  { value: 'EMD_PROOF', label: 'EMD Proof' },
  { value: 'TENDER_FORM', label: 'Tender Form' },
  { value: 'OTHER', label: 'Other' }
]

const EMD_STATUSES = [
  { value: 'INVESTED', label: 'Invested', color: 'bg-blue-100 text-blue-800' },
  { value: 'REFUNDED', label: 'Refunded', color: 'bg-green-100 text-green-800' },
  { value: 'FORFEITED', label: 'Forfeited', color: 'bg-red-100 text-red-800' }
]

export default function TenderManagement() {
  const { data: session } = useSession()
  const [tenders, setTenders] = useState<Tender[]>([])
  const [emdSummary, setEmdSummary] = useState<EMDSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [showEMDManagement, setShowEMDManagement] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    requiredDocuments: '',
    totalEMDInvested: '',
    totalEMDRefunded: '',
    totalEMDForfeited: ''
  })

  useEffect(() => {
    if (session?.user) {
      const userType = (session.user as any)?.userType
      
      if (userType !== 'ADMIN') {
        toast({
          title: "Access Denied",
          description: "Only admin users can access tender management",
          variant: "destructive"
        })
        return
      }
      
      fetchTenders()
      fetchEMDSummary()
    }
  }, [session])

  const fetchTenders = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tenders`, {
        headers: {
          'Authorization': `Bearer ${(session?.user as any)?.sessionToken}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setTenders(result.data)
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to fetch tenders",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching tenders:', error)
      toast({
        title: "Error",
        description: "Failed to fetch tenders",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchEMDSummary = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tenders/emd/summary`, {
        headers: {
          'Authorization': `Bearer ${(session?.user as any)?.sessionToken}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setEmdSummary(result.data)
      }
    } catch (error) {
      console.error('Error fetching EMD summary:', error)
    }
  }

  const handleCreateTender = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tenders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as any)?.sessionToken}`
        },
        body: JSON.stringify({
          ...formData,
          totalEMDInvested: formData.totalEMDInvested ? parseFloat(formData.totalEMDInvested) : undefined,
          totalEMDRefunded: formData.totalEMDRefunded ? parseFloat(formData.totalEMDRefunded) : undefined,
          totalEMDForfeited: formData.totalEMDForfeited ? parseFloat(formData.totalEMDForfeited) : undefined
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Tender created successfully"
        })
        setShowCreateDialog(false)
        setFormData({
          name: '',
          department: '',
          requiredDocuments: '',
          totalEMDInvested: '',
          totalEMDRefunded: '',
          totalEMDForfeited: ''
        })
        fetchTenders()
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create tender",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error creating tender:', error)
      toast({
        title: "Error",
        description: "Failed to create tender",
        variant: "destructive"
      })
    }
  }

  const handleUpdateStatus = async (tenderId: string, status: string, remarks?: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tenders/${tenderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session?.user as any)?.sessionToken}`
        },
        body: JSON.stringify({ status, remarks })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Tender status updated successfully"
        })
        fetchTenders()
        if (selectedTender?.id === tenderId) {
          setSelectedTender({ ...selectedTender, status })
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update status",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = TENDER_STATUSES.find(s => s.value === status)
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    )
  }

  const getEMDStatusBadge = (status: string) => {
    const statusConfig = EMD_STATUSES.find(s => s.value === status)
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    )
  }

  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = tender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tender.tenderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tender.department.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || statusFilter === 'all' || tender.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Gavel className="h-8 w-8 text-blue-600" />
            Tender Management
          </h1>
          <p className="text-gray-600 mt-2">Manage tenders, documents, and EMD tracking</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              Create Tender
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl">Create New Tender</DialogTitle>
              <DialogDescription>
                Fill in the basic details and EMD information to create a new tender
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Tender Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter tender name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Enter department"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredDocuments">Required Documents</Label>
                <Textarea
                  id="requiredDocuments"
                  value={formData.requiredDocuments}
                  onChange={(e) => setFormData({ ...formData, requiredDocuments: e.target.value })}
                  placeholder="Enter required document names (e.g., Technical Specification, Financial Proposal, Company Profile, etc.)"
                  rows={4}
                />
              </div>
              
              {/* EMD Section */}
              <div className="border-t pt-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">EMD Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalEMDInvested">Total EMD Invested (₹)</Label>
                    <Input
                      id="totalEMDInvested"
                      type="number"
                      value={formData.totalEMDInvested}
                      onChange={(e) => setFormData({ ...formData, totalEMDInvested: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalEMDRefunded">Total EMD Refunded (₹)</Label>
                    <Input
                      id="totalEMDRefunded"
                      type="number"
                      value={formData.totalEMDRefunded}
                      onChange={(e) => setFormData({ ...formData, totalEMDRefunded: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalEMDForfeited">Total EMD Forfeited (₹)</Label>
                    <Input
                      id="totalEMDForfeited"
                      type="number"
                      value={formData.totalEMDForfeited}
                      onChange={(e) => setFormData({ ...formData, totalEMDForfeited: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTender} disabled={!formData.name || !formData.department}>
                Create Tender
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* EMD Summary Cards */}
      {emdSummary && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">EMD Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total EMD Invested</CardTitle>
                <DollarSign className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">₹{emdSummary.totalInvested.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">{emdSummary.countInvested} tenders</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total EMD Refunded</CardTitle>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">₹{emdSummary.totalRefunded.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">{emdSummary.countRefunded} tenders</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total EMD Forfeited</CardTitle>
                <XCircle className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">₹{emdSummary.totalForfeited.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">{emdSummary.countForfeited} tenders</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter</h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search tenders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {TENDER_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenders Table */}
      <div className="mt-8">
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              Tenders ({filteredTenders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="min-w-[120px] font-semibold">Tender Number</TableHead>
                    <TableHead className="min-w-[200px] font-semibold">Name</TableHead>
                    <TableHead className="min-w-[120px] font-semibold">Department</TableHead>
                    <TableHead className="min-w-[100px] font-semibold">Status</TableHead>
                    <TableHead className="min-w-[100px] font-semibold">Documents</TableHead>
                    <TableHead className="min-w-[120px] font-semibold">EMD Invested</TableHead>
                    <TableHead className="min-w-[120px] font-semibold">EMD Refunded</TableHead>
                    <TableHead className="min-w-[120px] font-semibold">EMD Forfeited</TableHead>
                    <TableHead className="min-w-[120px] font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenders.map((tender) => (
                    <TableRow key={tender.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{tender.tenderNumber}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={tender.name}>
                        {tender.name}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate" title={tender.department}>
                        {tender.department}
                      </TableCell>
                      <TableCell>{getStatusBadge(tender.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{tender._count.documents}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            {tender.totalEMDInvested ? `₹${Number(tender.totalEMDInvested).toLocaleString()}` : '₹0'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">
                            {tender.totalEMDRefunded ? `₹${Number(tender.totalEMDRefunded).toLocaleString()}` : '₹0'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-900">
                            {tender.totalEMDForfeited ? `₹${Number(tender.totalEMDForfeited).toLocaleString()}` : '₹0'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTender(tender)
                              setShowDetailsDialog(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {tender.status === 'SUBMITTED' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateStatus(tender.id, 'APPROVED')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateStatus(tender.id, 'REJECTED')}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredTenders.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <Gavel className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No tenders found</p>
                <p className="text-sm">Try adjusting your search criteria or create a new tender</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tender Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl">Tender Details - {selectedTender?.tenderNumber}</DialogTitle>
            <DialogDescription>
              Complete information about the tender
            </DialogDescription>
          </DialogHeader>
          {selectedTender && (
            <div className="space-y-6">
              {/* Basic Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Tender Name</Label>
                    <p className="text-sm font-medium">{selectedTender.name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Department</Label>
                    <p className="text-sm">{selectedTender.department}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedTender.status)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Tender Number</Label>
                    <p className="text-sm font-mono">{selectedTender.tenderNumber}</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Required Documents</Label>
                    <p className="text-sm">{selectedTender.requiredDocuments || 'Not specified'}</p>
                  </div>
                </div>
                
                {/* EMD Summary */}
                {(selectedTender.totalEMDInvested || selectedTender.totalEMDRefunded || selectedTender.totalEMDForfeited) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">EMD Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedTender.totalEMDInvested && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-blue-800">Total EMD Invested</p>
                          <p className="text-lg font-bold text-blue-900">₹{selectedTender.totalEMDInvested.toLocaleString()}</p>
                        </div>
                      )}
                      {selectedTender.totalEMDRefunded && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-green-800">Total EMD Refunded</p>
                          <p className="text-lg font-bold text-green-900">₹{selectedTender.totalEMDRefunded.toLocaleString()}</p>
                        </div>
                      )}
                      {selectedTender.totalEMDForfeited && (
                        <div className="bg-red-50 p-3 rounded-lg">
                          <p className="text-xs font-medium text-red-800">Total EMD Forfeited</p>
                          <p className="text-lg font-bold text-red-900">₹{selectedTender.totalEMDForfeited.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Tabs defaultValue="documents" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="emd">EMD Records</TabsTrigger>
                </TabsList>
                <TabsContent value="documents" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Documents</h3>
                  <Button 
                    size="sm"
                    onClick={() => setShowDocumentUpload(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
                {selectedTender.documents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTender.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{doc.originalName}</p>
                            <p className="text-sm text-gray-500">
                              {DOCUMENT_TYPES.find(t => t.value === doc.documentType)?.label} 
                              {doc.isRequired && <span className="text-red-500 ml-1">*</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={doc.status === 'VERIFIED' ? 'bg-green-100 text-green-800' : 
                                         doc.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                                         'bg-yellow-100 text-yellow-800'}>
                            {doc.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No documents uploaded yet</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="emd" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">EMD Records</h3>
                  <Button 
                    size="sm"
                    onClick={() => setShowEMDManagement(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage EMD
                  </Button>
                </div>
                {selectedTender.emdRecords.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTender.emdRecords.map((emd) => (
                      <div key={emd.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">₹{emd.amount.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">
                              Invested: {new Date(emd.investedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getEMDStatusBadge(emd.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No EMD records yet</p>
                  </div>
                )}
              </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      {selectedTender && (
        <TenderDocumentUpload
          tenderId={selectedTender.id}
          isOpen={showDocumentUpload}
          onClose={() => setShowDocumentUpload(false)}
          onSuccess={() => {
            fetchTenders()
            // Refresh selected tender details
            if (selectedTender) {
              // You might want to fetch updated tender details here
            }
          }}
        />
      )}

      {/* EMD Management Dialog */}
      {selectedTender && (
        <TenderEMDManagement
          tenderId={selectedTender.id}
          emdRecords={selectedTender.emdRecords}
          isOpen={showEMDManagement}
          onClose={() => setShowEMDManagement(false)}
          onSuccess={() => {
            fetchTenders()
            fetchEMDSummary()
            // Refresh selected tender details
            if (selectedTender) {
              // You might want to fetch updated tender details here
            }
          }}
        />
      )}
    </div>
  )
}