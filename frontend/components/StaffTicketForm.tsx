import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Ticket, 
  AlertTriangle,
  Clock,
  Save,
  X,
  CheckCircle,
  User,
  Phone,
  Search,
  Upload,
  FileText,
  Trash2
} from "lucide-react"
import { showToast } from "@/lib/toast-utils"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"

interface Customer {
  id: string
  customerId: string
  name: string
  phone: string
  email?: string
  address?: string
}

interface StaffTicketFormProps {
  employeeId: string
  onSuccess?: () => void
}

export function StaffTicketForm({ employeeId, onSuccess }: StaffTicketFormProps) {
  const { authenticatedFetch, isAuthenticated } = useAuthenticatedFetch()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showSuccess, setShowSuccess] = React.useState(false)
  const [createdTicketId, setCreatedTicketId] = React.useState("")
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = React.useState(false)
  const [customerSearch, setCustomerSearch] = React.useState("")
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = React.useState(false)
  const getDefaultDueDate = React.useCallback(() => {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }, [])
  
  const [formData, setFormData] = React.useState({
    description: "",
    category: "",
    priority: "",
    department: "",
    dueDate: getDefaultDueDate(),
    estimatedHours: "",
    customerId: "none"
  })

  const fetchCustomers = React.useCallback(async () => {
    try {
      setLoadingCustomers(true)
      
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/customers?limit=100`)

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Authentication required to fetch customers. User may not be logged in.')
          showToast.error('Please log in to access customer information')
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.customers) {
        setCustomers(result.customers)
        console.log(`Loaded ${result.customers.length} customers`)
      } else {
        console.error('Unexpected response format:', result)
        showToast.error('Failed to load customers')
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      if (error instanceof Error && error.message.includes('No valid session token')) {
        showToast.error('Please log in to access customer information')
      } else {
        showToast.error('Failed to load customers')
      }
    } finally {
      setLoadingCustomers(false)
    }
  }, [authenticatedFetch])

  // Fetch customers on component mount
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers()
    }
  }, [isAuthenticated, fetchCustomers])

  // Fetch customers on component mount
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers()
    }
  }, [isAuthenticated, fetchCustomers])

  // Filter customers based on search
  const filteredCustomers = React.useMemo(() => {
    if (!customerSearch) return customers
    
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.customerId.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.phone.includes(customerSearch)
    )
  }, [customers, customerSearch])

  const selectedCustomer = customers.find(c => c.id === formData.customerId && formData.customerId !== "none")

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files)
      // Validate file size (10MB limit)
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          showToast.error(`File ${file.name} is too large. Maximum size is 10MB.`)
          return false
        }
        return true
      })
      setUploadedFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return []
    
    setUploadingFiles(true)
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ticket-uploads/upload`, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
        
        const result = await response.json()
        return result.data?.url || result.data?.path || null
      })
      
      const uploadedUrls = await Promise.all(uploadPromises)
      return uploadedUrls.filter(url => url !== null)
    } catch (error) {
      console.error('Error uploading files:', error)
      showToast.error('Failed to upload some files')
      return []
    } finally {
      setUploadingFiles(false)
    }
  }

  const resetForm = () => {
    setFormData({
      description: "",
      category: "",
      priority: "",
      department: "",
      dueDate: getDefaultDueDate(),
      estimatedHours: "",
      customerId: "none"
    })
    setCustomerSearch("")
    setUploadedFiles([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.description.trim()) {
      showToast.error('Please enter a description')
      return
    }
    
    if (!formData.category) {
      showToast.error('Please select a category')
      return
    }
    
    if (!formData.priority) {
      showToast.error('Please select a priority')
      return
    }
    
    setIsSubmitting(true)

    try {
      // Upload files first if any
      const attachmentUrls = await uploadFiles(uploadedFiles)
      
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/tickets`, {
        method: 'POST',
        body: JSON.stringify({
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          department: formData.department || undefined,
          dueDate: formData.dueDate || undefined,
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
          reporterId: employeeId, // Send employee ID as reporterId
          // Add uploaded files information with URLs
          attachments: uploadedFiles.map((file, index) => ({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            filePath: attachmentUrls[index] || null
          })),
          // Add customer information if selected
          ...(selectedCustomer && {
            customerName: selectedCustomer.name,
            customerId: selectedCustomer.customerId,
            customerPhone: selectedCustomer.phone,
          })
        })
      })

      const result = await response.json()

      if (result.success) {
        setCreatedTicketId(result.data.ticketId)
        setShowSuccess(true)
        showToast.success('Ticket created successfully!', `Ticket ID: ${result.data.ticketId}`)
        resetForm()
        if (onSuccess) {
          onSuccess()
        }
      } else {
        showToast.error(result.message || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      showToast.error('Failed to create ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.description && formData.category && formData.priority

  if (showSuccess) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-green-900 mb-2">Ticket Created Successfully!</h3>
          <p className="text-green-700 mb-3">Your support ticket has been created and assigned ID:</p>
          <Badge className="bg-green-100 text-green-800 border-green-300 font-mono text-lg px-4 py-2">
            {createdTicketId}
          </Badge>
          <p className="text-sm text-green-600 mt-4">
            You will receive updates about your ticket via email.
          </p>
          <Button 
            onClick={() => setShowSuccess(false)}
            className="mt-6 bg-green-600 hover:bg-green-700"
          >
            Create Another Ticket
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card className="bg-card shadow-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-blue-600" />
            Ticket Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Selection */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium text-blue-900">
                Customer (Optional)
              </Label>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name, ID, or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select 
                value={formData.customerId} 
                onValueChange={(value) => handleInputChange("customerId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    loadingCustomers 
                      ? "Loading customers..." 
                      : customers.length === 0 
                        ? "No customers available (login required)" 
                        : "Select a customer (optional)"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No customer selected</SelectItem>
                  {customers.length === 0 && !loadingCustomers && (
                    <SelectItem value="no-access" disabled>
                      No customers available - please ensure you are logged in
                    </SelectItem>
                  )}
                  {filteredCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2 py-1">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.customerId} • {customer.phone}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {filteredCustomers.length === 0 && customerSearch && customers.length > 0 && (
                    <SelectItem value="no-results" disabled>
                      No customers found matching &ldquo;{customerSearch}&rdquo;
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {customers.length === 0 && !loadingCustomers && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-800">No customers loaded</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchCustomers}
                      className="text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      Retry
                    </Button>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    Make sure you are logged in to access customer information.
                  </p>
                </div>
              )}
              
              {selectedCustomer && (
                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedCustomer.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{selectedCustomer.customerId}</span>
                        <span>•</span>
                        <Phone className="h-3 w-3" />
                        <span>{selectedCustomer.phone}</span>
                      </p>
                      {selectedCustomer.email && (
                        <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="category" className="text-sm font-medium text-foreground">
                Category *
              </Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  <SelectItem value="HARDWARE">Hardware</SelectItem>
                  <SelectItem value="SOFTWARE">Software</SelectItem>
                  <SelectItem value="NETWORK">Network</SelectItem>
                  <SelectItem value="SECURITY">Security</SelectItem>
                  <SelectItem value="DATABASE">Database</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="SETUP">Setup</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority" className="text-sm font-medium text-foreground">
                Priority *
              </Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Critical Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      High Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      Medium Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="LOW">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-600" />
                      Low Priority
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about the issue, including steps to reproduce, expected behavior, and any error messages..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="mt-1 min-h-[120px]"
              required
            />
          </div>

          {/* File Upload Section */}
          <div className="space-y-3">
            <Label htmlFor="file-upload" className="text-sm font-medium text-foreground">
              Attach Files (Optional)
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-muted/30">
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-foreground font-medium">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, XLS, TXT, Images up to 10MB each
                </span>
              </label>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Attached Files ({uploadedFiles.length})</p>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="department" className="text-sm font-medium text-foreground">
                Department (Optional)
              </Label>
              <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
                <SelectTrigger className="mt-1">
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

            <div>
              <Label htmlFor="dueDate" className="text-sm font-medium text-foreground">
                Expected Resolution Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange("dueDate", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="estimatedHours" className="text-sm font-medium text-foreground">
                Estimated Hours (Optional)
              </Label>
              <Input
                id="estimatedHours"
                type="number"
                placeholder="e.g., 4"
                value={formData.estimatedHours}
                onChange={(e) => handleInputChange("estimatedHours", e.target.value)}
                className="mt-1"
                min="0"
                step="0.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <Card className="bg-card shadow-sm border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              * Required fields must be filled out
            </div>
            <div className="flex items-center gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={resetForm}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Form
              </Button>
              <Button 
                type="submit"
                disabled={!isFormValid || isSubmitting || uploadingFiles}
                className="shadow-sm min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting || uploadingFiles ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    {uploadingFiles ? 'Uploading...' : 'Creating...'}
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Ticket
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
