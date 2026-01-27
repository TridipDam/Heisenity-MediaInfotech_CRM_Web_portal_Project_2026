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
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { Calendar, Users, Video, FileText, XCircle, Edit } from "lucide-react";

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

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  meetingType: string;
  status: string;
  priority: string;
  meetingLink?: string;
  agenda?: string;
  notes?: string;
  organizerAdmin?: {
    id: string;
    name: string;
    adminId: string;
    email: string;
  };
  organizerEmployee?: {
    id: string;
    name: string;
    employeeId: string;
    email: string;
  };
  customer?: {
    id: string;
    customerId: string;
    name: string;
    email?: string;
    phone: string;
  };
  attendees: Array<{
    id: string;
    status: string;
    response?: string;
    employee: {
      id: string;
      name: string;
      employeeId: string;
      email: string;
    };
  }>;
}

interface EditMeetingDialogProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeetingUpdated: () => void;
}

export default function EditMeetingDialog({
  meeting,
  open,
  onOpenChange,
  onMeetingUpdated
}: EditMeetingDialogProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const { authenticatedFetch, isAuthenticated } = useAuthenticatedFetch();
  
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    meetingType: "INTERNAL",
    priority: "MEDIUM",
    customerId: "",
    meetingLink: "",
    agenda: ""
  });

  // Initialize form data when meeting changes
  useEffect(() => {
    if (meeting && open) {
      const startTime = new Date(meeting.startTime);
      const formattedStartTime = new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        title: meeting.title || "",
        description: meeting.description || "",
        startTime: formattedStartTime,
        meetingType: meeting.meetingType || "INTERNAL",
        priority: meeting.priority || "MEDIUM",
        customerId: meeting.customer?.id || "",
        meetingLink: meeting.meetingLink || "",
        agenda: meeting.agenda || ""
      });

      // Set selected attendees
      const attendeeIds = meeting.attendees.map(attendee => attendee.employee.id);
      setSelectedAttendees(attendeeIds);
    }
  }, [meeting, open]);

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
      
      if (result.success && result.data && Array.isArray(result.data.employees)) {
        setEmployees(result.data.employees);
      } else {
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

      const customersArray = Array.isArray(result.customers)
        ? result.customers
        : result?.data?.customers || [];

      if (Array.isArray(customersArray) && customersArray.length > 0) {
        setCustomers(customersArray);
      } else {
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
    
    if (!session?.user || !meeting) {
      toast({
        title: "Error",
        description: "You must be logged in to edit a meeting",
        variant: "destructive"
      });
      return;
    }

    // Validation
    if (!formData.title || !formData.startTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const startTime = new Date(formData.startTime);

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
      // Update meeting basic details
      const meetingData = {
        ...formData,
        customerId: formData.customerId || undefined,
        startTime: startTime.toISOString()
      };

      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings/${meeting.id}`, {
        method: 'PUT',
        body: JSON.stringify(meetingData)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update meeting');
      }

      // Handle attendee updates if they changed
      const currentAttendeeIds = meeting.attendees.map(a => a.employee.id);
      const newAttendeeIds = selectedAttendees;
      
      // Find attendees to add and remove
      const attendeesToAdd = newAttendeeIds.filter(id => !currentAttendeeIds.includes(id));
      const attendeesToRemove = currentAttendeeIds.filter(id => !newAttendeeIds.includes(id));

      // Add new attendees
      if (attendeesToAdd.length > 0) {
        const addResponse = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings/${meeting.id}/attendees`, {
          method: 'POST',
          body: JSON.stringify({ employeeIds: attendeesToAdd })
        });
        
        const addResult = await addResponse.json();
        if (!addResult.success) {
          console.warn('Failed to add some attendees:', addResult.error);
        }
      }

      // Remove attendees
      for (const employeeId of attendeesToRemove) {
        try {
          const removeResponse = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings/${meeting.id}/attendees/${employeeId}`, {
            method: 'DELETE'
          });
          
          const removeResult = await removeResponse.json();
          if (!removeResult.success) {
            console.warn(`Failed to remove attendee ${employeeId}:`, removeResult.error);
          }
        } catch (error) {
          console.warn(`Error removing attendee ${employeeId}:`, error);
        }
      }

      toast({
        title: "Success",
        description: "Meeting updated successfully"
      });
      
      onMeetingUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update meeting",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!meeting) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            Edit Meeting
          </DialogTitle>
          <DialogDescription>
            Update meeting details and attendees
          </DialogDescription>
        </DialogHeader>

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
              {loading ? "Updating..." : "Update Meeting"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}