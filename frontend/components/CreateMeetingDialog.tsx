"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { Calendar, Clock, Users, Video, FileText, ExternalLink, XCircle } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  role?: string;
}

interface Customer {
  id: string;
  customerId: string;
  name: string;
  email?: string;
  phone: string;
}

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeetingCreated: () => void;
}

export default function CreateMeetingDialog({
  open,
  onOpenChange,
  onMeetingCreated
}: CreateMeetingDialogProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const { authenticatedFetch, isAuthenticated } = useAuthenticatedFetch();
  
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCalendlyLoaded, setIsCalendlyLoaded] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    meetingType: "INTERNAL",
    priority: "MEDIUM",
    customerId: "",
    meetingLink: "",
    agenda: ""
  });

  // Load Calendly widget script
  useEffect(() => {
    if (open) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      script.onload = () => setIsCalendlyLoaded(true);
      document.head.appendChild(script);

      return () => {
        const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
        if (existingScript) {
          document.head.removeChild(existingScript);
        }
      };
    }
  }, [open]);

  // Fetch employees and customers
  useEffect(() => {
    if (open && isAuthenticated) {
      fetchEmployees();
      fetchCustomers();
    }
  }, [open, isAuthenticated]);

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees`);
      const result = await response.json();
      
      console.log('Employees API response:', result);
      
      if (result.success && result.data && Array.isArray(result.data.employees)) {
        console.log('Setting employees:', result.data.employees);
        setEmployees(result.data.employees);
      } else {
        console.warn('Invalid employees data received:', result);
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      });
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchCustomers = async () => {
  try {
    setCustomersLoading(true);
    const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/customers`);
    const result = await response.json();

    console.log('Customers API response:', result);

    const customersArray = Array.isArray(result.customers)
      ? result.customers
      : result?.data?.customers || [];

    if (Array.isArray(customersArray) && customersArray.length > 0) {
      setCustomers(customersArray);
    } else {
      console.warn('No customers received or invalid shape', result);
      setCustomers([]);
    }
  } catch (error) {
    console.error('Error fetching customers:', error);
    setCustomers([]);
    toast({
      title: "Error",
      description: "Failed to fetch customers",
      variant: "destructive"
    });
  } finally {
    setCustomersLoading(false);
  }
};

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // If customer is selected, find the customer object
    if (field === 'customerId' && value) {
      const customer = customers.find(c => c.id === value);
      setSelectedCustomer(customer || null);
    }
  };

  const openCalendlyInNewWindow = () => {
    let calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/your-calendly-username';
    
    // Add customer details if available
    if (selectedCustomer) {
      const params = new URLSearchParams({
        name: selectedCustomer.name,
        email: selectedCustomer.email || '',
        a1: selectedCustomer.customerId,
        a2: selectedCustomer.phone
      });
      calendlyUrl += `?${params.toString()}`;
    }
    
    window.open(calendlyUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
  };

  const openCalendlyForTeamMeeting = () => {
    let calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/your-calendly-username';
    
    // Add meeting details
    const params = new URLSearchParams({
      name: `Team Meeting: ${formData.title || 'Internal Meeting'}`,
      a1: 'Internal Team Meeting',
      a2: `Attendees: ${selectedAttendees.length} selected`
    });
    calendlyUrl += `?${params.toString()}`;
    
    window.open(calendlyUrl, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
  };

  const handleAttendeeToggle = (employeeId: string) => {
    setSelectedAttendees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(employeeSearchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a meeting",
        variant: "destructive"
      });
      return;
    }

    // Validation
    if (!formData.title || !formData.startTime || !formData.endTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);
    
    if (startTime >= endTime) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        variant: "destructive"
      });
      return;
    }

    if (startTime < new Date()) {
      toast({
        title: "Error",
        description: "Meeting cannot be scheduled in the past",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const meetingData = {
        ...formData,
        organizerId: (session.user as any).id,
        userType: (session.user as any).userType, // Add userType to determine admin vs employee
        customerId: formData.customerId || undefined,
        attendeeIds: selectedAttendees.length > 0 ? selectedAttendees : undefined
      };

      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings`, {
        method: 'POST',
        body: JSON.stringify(meetingData)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Meeting created successfully"
        });
        
        // Reset form
        setFormData({
          title: "",
          description: "",
          startTime: "",
          endTime: "",
          location: "",
          meetingType: "INTERNAL",
          priority: "MEDIUM",
          customerId: "",
          meetingLink: "",
          agenda: ""
        });
        setSelectedAttendees([]);
        setSelectedCustomer(null);
        setEmployeeSearchTerm("");
        
        onMeetingCreated();
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to create meeting');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create meeting",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Schedule New Meeting
          </DialogTitle>
          <DialogDescription>
            Create a new meeting manually or use Calendly for scheduling
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Creation</TabsTrigger>
            <TabsTrigger value="calendly">Calendly Integration</TabsTrigger>
          </TabsList>

          {/* Manual Creation Tab */}
          <TabsContent value="manual" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter meeting title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Meeting description (optional)"
                rows={3}
              />
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Meeting Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="meetingType">Meeting Type</Label>
              <Select value={formData.meetingType} onValueChange={(value) => handleInputChange('meetingType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="VENDOR">Vendor</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting Link */}
          <div>
            <Label htmlFor="meetingLink">Meeting Link</Label>
            <div className="relative">
              <Video className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="meetingLink"
                value={formData.meetingLink}
                onChange={(e) => handleInputChange('meetingLink', e.target.value)}
                placeholder="Video call link (optional)"
                className="pl-10"
              />
            </div>
          </div>

              {/* Customer Selection */}
          {formData.meetingType === 'CLIENT' && (
            <div>
              <Label htmlFor="customerId">Customer</Label>
              {customersLoading ? (
                <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-xs text-gray-500">Loading customers...</span>
                </div>
              ) : !isAuthenticated ? (
                <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm text-muted-foreground">
                  Please log in to view customers
                </div>
              ) : Array.isArray(customers) && customers.length > 0 ? (
                <Select value={formData.customerId} onValueChange={(value) => handleInputChange('customerId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.customerId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm text-muted-foreground">
                  No customers available
                </div>
              )}
            </div>
          )}

          {/* Agenda */}
          <div>
            <Label htmlFor="agenda">Agenda</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="agenda"
                value={formData.agenda}
                onChange={(e) => handleInputChange('agenda', e.target.value)}
                placeholder="Meeting agenda (optional)"
                rows={3}
                className="pl-10"
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4" />
              Attendees
              {employeesLoading && <span className="text-xs text-gray-500">(Loading...)</span>}
            </Label>
            
            {employeesLoading ? (
              <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading employees...</span>
              </div>
            ) : Array.isArray(employees) && employees.length > 0 ? (
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={
                    selectedAttendees.length === 0 
                      ? "Select attendees" 
                      : `${selectedAttendees.length} attendee${selectedAttendees.length !== 1 ? 's' : ''} selected`
                  } />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    {/* Search Input */}
                    <div className="mb-2">
                      <Input
                        placeholder="Search employees..."
                        value={employeeSearchTerm}
                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    
                    {/* Select All */}
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedAttendees.length === filteredEmployees.length && filteredEmployees.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newSelected = [...new Set([...selectedAttendees, ...filteredEmployees.map(emp => emp.id)])];
                            setSelectedAttendees(newSelected);
                          } else {
                            const filteredIds = filteredEmployees.map(emp => emp.id);
                            setSelectedAttendees(prev => prev.filter(id => !filteredIds.includes(id)));
                          }
                        }}
                      />
                      <Label htmlFor="select-all" className="text-sm font-medium">
                        Select All {employeeSearchTerm ? 'Filtered' : ''} ({filteredEmployees.length})
                      </Label>
                    </div>
                    
                    {/* Employee List */}
                    <div className="border-t pt-2 max-h-60 overflow-y-auto">
                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map((employee) => (
                          <div key={employee.id} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-2">
                            <Checkbox
                              id={`attendee-${employee.id}`}
                              checked={selectedAttendees.includes(employee.id)}
                              onCheckedChange={() => handleAttendeeToggle(employee.id)}
                            />
                            <Label htmlFor={`attendee-${employee.id}`} className="text-sm cursor-pointer flex-1">
                              <div className="flex items-center justify-between">
                                <span>{employee.name}</span>
                                <span className="text-xs text-gray-500">({employee.employeeId})</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>{employee.email}</span>
                                <span className="capitalize">{employee.role?.replace('_', ' ').toLowerCase()}</span>
                              </div>
                            </Label>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-sm text-gray-500">
                          {employeeSearchTerm ? 'No employees found matching your search' : 'No employees available'}
                        </div>
                      )}
                    </div>
                  </div>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm text-muted-foreground">
                No employees available
              </div>
            )}
            
            {/* Selected Attendees Summary */}
            {selectedAttendees.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-700 font-medium mb-1">
                  Selected Attendees ({selectedAttendees.length}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedAttendees.slice(0, 5).map(attendeeId => {
                    const employee = employees.find(emp => emp.id === attendeeId);
                    return employee ? (
                      <span key={attendeeId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {employee.name}
                        <button
                          type="button"
                          onClick={() => handleAttendeeToggle(attendeeId)}
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                  {selectedAttendees.length > 5 && (
                    <span className="text-xs text-blue-600">
                      +{selectedAttendees.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Creating..." : "Create Meeting"}
            </Button>
          </div>
        </form>
      </TabsContent>

      {/* Calendly Integration Tab */}
      <TabsContent value="calendly" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Meeting with Calendly */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Client Meeting
              </CardTitle>
              <CardDescription>
                Schedule a meeting with a customer using Calendly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Selection */}
              <div>
                <Label htmlFor="calendly-customer">Select Customer</Label>
                {customersLoading ? (
                  <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-xs text-gray-500">Loading customers...</span>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm text-muted-foreground">
                    Please log in to view customers
                  </div>
                ) : Array.isArray(customers) && customers.length > 0 ? (
                  <Select 
                    value={formData.customerId} 
                    onValueChange={(value) => handleInputChange('customerId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.customerId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm text-muted-foreground">
                    No customers available
                  </div>
                )}
              </div>

              {/* Customer Details Preview */}
              {selectedCustomer && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-600">ID: {selectedCustomer.customerId}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedCustomer.phone}</p>
                  {selectedCustomer.email && (
                    <p className="text-sm text-gray-600">Email: {selectedCustomer.email}</p>
                  )}
                </div>
              )}

              <Button
                onClick={openCalendlyInNewWindow}
                className="w-full"
                disabled={!selectedCustomer}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Calendly for Customer
              </Button>

              <p className="text-xs text-gray-500">
                Customer details will be pre-filled in Calendly
              </p>
            </CardContent>
          </Card>

          {/* Team Meeting with Calendly */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Team Meeting
              </CardTitle>
              <CardDescription>
                Schedule an internal team meeting using Calendly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Meeting Title */}
              <div>
                <Label htmlFor="calendly-title">Meeting Title</Label>
                <Input
                  id="calendly-title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter meeting title"
                />
              </div>

              {/* Quick Attendee Selection */}
              <div>
                <Label>Quick Attendee Selection</Label>
                {employeesLoading ? (
                  <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-xs text-gray-500">Loading...</span>
                  </div>
                ) : Array.isArray(employees) && employees.length > 0 ? (
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        selectedAttendees.length === 0 
                          ? "Select team members" 
                          : `${selectedAttendees.length} member${selectedAttendees.length !== 1 ? 's' : ''} selected`
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id="calendly-select-all"
                            checked={selectedAttendees.length === filteredEmployees.length && filteredEmployees.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const newSelected = [...new Set([...selectedAttendees, ...filteredEmployees.map(emp => emp.id)])];
                                setSelectedAttendees(newSelected);
                              } else {
                                const filteredIds = filteredEmployees.map(emp => emp.id);
                                setSelectedAttendees(prev => prev.filter(id => !filteredIds.includes(id)));
                              }
                            }}
                          />
                          <Label htmlFor="calendly-select-all" className="text-sm font-medium">
                            Select All Team ({filteredEmployees.length})
                          </Label>
                        </div>
                        <div className="border-t pt-2 max-h-48 overflow-y-auto">
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((employee) => (
                              <div key={employee.id} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-2">
                                <Checkbox
                                  id={`calendly-${employee.id}`}
                                  checked={selectedAttendees.includes(employee.id)}
                                  onCheckedChange={() => handleAttendeeToggle(employee.id)}
                                />
                                <Label htmlFor={`calendly-${employee.id}`} className="text-sm cursor-pointer flex-1">
                                  <div className="flex items-center justify-between">
                                    <span>{employee.name}</span>
                                    <span className="text-xs text-gray-500">({employee.employeeId})</span>
                                  </div>
                                  <div className="text-xs text-gray-400 capitalize">
                                    {employee.role?.replace('_', ' ').toLowerCase()}
                                  </div>
                                </Label>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-sm text-gray-500">
                              No team members available
                            </div>
                          )}
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center justify-center h-10 px-3 py-2 border border-input bg-background rounded-md text-sm text-muted-foreground">
                    No employees available
                  </div>
                )}
                
                {/* Selected Members Tags */}
                {selectedAttendees.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedAttendees.slice(0, 3).map(attendeeId => {
                      const employee = employees.find(emp => emp.id === attendeeId);
                      return employee ? (
                        <span key={attendeeId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          {employee.name}
                          <button
                            type="button"
                            onClick={() => handleAttendeeToggle(attendeeId)}
                            className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                    {selectedAttendees.length > 3 && (
                      <span className="text-xs text-green-600 px-2 py-1">
                        +{selectedAttendees.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={openCalendlyForTeamMeeting}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Calendly for Team Meeting
              </Button>

              <p className="text-xs text-gray-500">
                Meeting details will be pre-filled in Calendly
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Calendly Features */}
        <Card>
          <CardContent>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Select meeting type and attendees</li>
                <li>2. Click to open Calendly with pre-filled details</li>
                <li>3. Choose available time slots</li>
                <li>4. Calendly sends invitations automatically</li>
                <li>5. Meeting details sync back to your calendar</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Actions for Calendly Tab */}
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </TabsContent>
    </Tabs>
      </DialogContent>
    </Dialog>
  );
}