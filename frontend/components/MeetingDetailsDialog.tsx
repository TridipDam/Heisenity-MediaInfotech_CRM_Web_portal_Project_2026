"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Clock, 
  Video,
  FileText,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

interface MeetingDetailsDialogProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMeetingUpdated: () => void;
}

export default function MeetingDetailsDialog({
  meeting,
  open,
  onOpenChange,
  onMeetingUpdated
}: MeetingDetailsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!meeting) return null;

  // Helper function to get organizer information
  const getOrganizer = (meeting: Meeting) => {
    return meeting.organizerAdmin || meeting.organizerEmployee;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SCHEDULED: { color: "bg-blue-100 text-blue-800", label: "Scheduled", icon: Clock },
      COMPLETED: { color: "bg-gray-100 text-gray-800", label: "Completed", icon: CheckCircle },
      CANCELLED: { color: "bg-red-100 text-red-800", label: "Cancelled", icon: XCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.SCHEDULED;
    const IconComponent = config.icon;
    
    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      LOW: { color: "bg-gray-100 text-gray-800", label: "Low" },
      MEDIUM: { color: "bg-blue-100 text-blue-800", label: "Medium" },
      HIGH: { color: "bg-orange-100 text-orange-800", label: "High" },
      URGENT: { color: "bg-red-100 text-red-800", label: "Urgent" }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.MEDIUM;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getAttendeeStatusBadge = (status: string, response?: string) => {
    if (response) {
      const responseConfig = {
        ACCEPTED: { color: "bg-green-100 text-green-800", label: "Accepted" },
        DECLINED: { color: "bg-red-100 text-red-800", label: "Declined" },
        TENTATIVE: { color: "bg-yellow-100 text-yellow-800", label: "Tentative" }
      };
      
      const config = responseConfig[response as keyof typeof responseConfig];
      if (config) {
        return <Badge className={config.color}>{config.label}</Badge>;
      }
    }

    const statusConfig = {
      INVITED: { color: "bg-blue-100 text-blue-800", label: "Invited" },
      CONFIRMED: { color: "bg-green-100 text-green-800", label: "Confirmed" },
      DECLINED: { color: "bg-red-100 text-red-800", label: "Declined" },
      TENTATIVE: { color: "bg-yellow-100 text-yellow-800", label: "Tentative" },
      NO_RESPONSE: { color: "bg-gray-100 text-gray-800", label: "No Response" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INVITED;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleUpdateMeetingStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings/${meeting.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Meeting status updated successfully"
        });
        onMeetingUpdated();
      } else {
        throw new Error(result.error || 'Failed to update meeting status');
      }
    } catch (error) {
      console.error('Error updating meeting status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update meeting status",
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
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
                {meeting.title}
              </DialogTitle>
              <DialogDescription className="mt-2">
                {meeting.description || "No description provided"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(meeting.status)}
              {getPriorityBadge(meeting.priority)}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="attendees">Attendees ({meeting.attendees.length})</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Meeting Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Meeting Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(meeting.startTime), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(meeting.startTime), 'h:mm a')}
                      </p>
                    </div>
                  </div>

                  {meeting.meetingLink && (
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-gray-500" />
                      <a 
                        href={meeting.meetingLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Join Meeting
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Type: {meeting.meetingType.replace('_', ' ')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organizer & Customer */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Participants</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-medium text-sm text-gray-500 mb-2">Organizer</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{getOrganizer(meeting)?.name}</p>
                        <p className="text-sm text-gray-600">
                          {'adminId' in getOrganizer(meeting)! 
                            ? (getOrganizer(meeting) as { adminId: string }).adminId 
                            : (getOrganizer(meeting) as { employeeId: string }).employeeId}
                        </p>
                        <p className="text-sm text-gray-600">{getOrganizer(meeting)?.email}</p>
                      </div>
                    </div>
                  </div>

                  {meeting.customer && (
                    <div>
                      <p className="font-medium text-sm text-gray-500 mb-2">Customer</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{meeting.customer.name}</p>
                            <p className="text-sm text-gray-600">{meeting.customer.customerId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{meeting.customer.phone}</span>
                        </div>
                        {meeting.customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{meeting.customer.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Agenda */}
            {meeting.agenda && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Agenda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm">{meeting.agenda}</div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {meeting.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm">{meeting.notes}</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Attendees Tab */}
          <TabsContent value="attendees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meeting Attendees</CardTitle>
                <CardDescription>
                  {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''} invited
                </CardDescription>
              </CardHeader>
              <CardContent>
                {meeting.attendees.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No attendees invited</p>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(meeting.attendees) && meeting.attendees.map((attendee) => (
                      <div key={attendee.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <User className="h-8 w-8 p-2 bg-gray-100 rounded-full" />
                          <div>
                            <p className="font-medium">{attendee.employee.name}</p>
                            <p className="text-sm text-gray-600">{attendee.employee.employeeId}</p>
                            <p className="text-sm text-gray-600">{attendee.employee.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getAttendeeStatusBadge(attendee.status, attendee.response)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meeting Actions</CardTitle>
                <CardDescription>
                  Manage this meeting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Updates */}
                <div>
                  <p className="font-medium mb-3">Update Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {['SCHEDULED', 'COMPLETED', 'CANCELLED'].map((status) => (
                      <Button
                        key={status}
                        variant={meeting.status === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUpdateMeetingStatus(status)}
                        disabled={loading || meeting.status === status}
                      >
                        {status.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <p className="font-medium mb-3">Quick Actions</p>
                  <div className="flex gap-2 flex-wrap">
                    {meeting.meetingLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(meeting.meetingLink, '_blank')}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Join Meeting
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const startTime = new Date(meeting.startTime);
                        const event = {
                          title: meeting.title,
                          start: startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
                          description: meeting.description || ''
                        };
                        
                        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.start}&details=${encodeURIComponent(event.description)}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Add to Calendar
                    </Button>
                  </div>
                </div>


              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}