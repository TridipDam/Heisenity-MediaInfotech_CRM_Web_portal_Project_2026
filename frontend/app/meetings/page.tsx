"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Users,  
  Plus, 
  Video,
  AlertCircle,
  User,
  RefreshCw,
  Edit,
  Trash2
} from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import CreateMeetingDialog from "@/components/CreateMeetingDialog";
import MeetingDetailsDialog from "@/components/MeetingDetailsDialog";
import EditMeetingDialog from "@/components/EditMeetingDialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function MeetingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [todaysMeetings, setTodaysMeetings] = useState<Meeting[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Helper function to get organizer information
  const getOrganizer = (meeting: Meeting) => {
    return meeting.organizerAdmin || meeting.organizerEmployee;
  };

  // Filter meetings based on search and filters
  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = searchTerm === "" || 
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOrganizer(meeting)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || meeting.status === statusFilter;
    const matchesType = typeFilter === "ALL" || meeting.meetingType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings`);
      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data.meetings)) {
        const allMeetings = result.data.meetings;
        setMeetings(allMeetings);
        
        // Filter today's meetings from all meetings
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        const todaysFiltered = allMeetings.filter((meeting: Meeting) => {
          const meetingDate = new Date(meeting.startTime);
          return meetingDate >= startOfDay && meetingDate < endOfDay;
        });
        
        setTodaysMeetings(todaysFiltered);
        
        // Filter upcoming meetings (future meetings, not including today)
        const upcomingFiltered = allMeetings.filter((meeting: Meeting) => {
          const meetingDate = new Date(meeting.startTime);
          return meetingDate > endOfDay && ['SCHEDULED'].includes(meeting.status);
        });
        
        setUpcomingMeetings(upcomingFiltered);
      } else {
        console.warn("Invalid meetings data received:", result);
        setMeetings([]);
        setTodaysMeetings([]);
        setUpcomingMeetings([]);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
      setTodaysMeetings([]);
      setUpcomingMeetings([]);
      toast({
        title: "Error",
        description: "Failed to fetch meetings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session?.user) {
      fetchMeetings();
    }
  }, [session, fetchMeetings]);

  // Auto-refresh meetings every 5 minutes
  useEffect(() => {
    if (!session?.user) return;
    
    const interval = setInterval(() => {
      fetchMeetings();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [session, fetchMeetings]);

  const handleMeetingCreated = () => {
    fetchMeetings();
  };

  const handleRefresh = () => {
    fetchMeetings();
    toast({
      title: "Refreshed",
      description: "Meeting data has been updated"
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SCHEDULED: { color: "bg-blue-100 text-blue-800", label: "Scheduled" },
      IN_PROGRESS: { color: "bg-green-100 text-green-800", label: "In Progress" },
      COMPLETED: { color: "bg-gray-100 text-gray-800", label: "Completed" },
      CANCELLED: { color: "bg-red-100 text-red-800", label: "Cancelled" },
      POSTPONED: { color: "bg-yellow-100 text-yellow-800", label: "Postponed" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.SCHEDULED;
    return <Badge className={config.color}>{config.label}</Badge>;
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CLIENT': return <User className="h-4 w-4" />;
      case 'VENDOR': return <Users className="h-4 w-4" />;
      case 'TRAINING': return <AlertCircle className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const formatMeetingTime = (startTime: string) => {
    const start = new Date(startTime);
    
    if (isToday(start)) {
      return `Today, ${format(start, 'h:mm a')}`;
    } else if (isTomorrow(start)) {
      return `Tomorrow, ${format(start, 'h:mm a')}`;
    } else if (isThisWeek(start)) {
      return `${format(start, 'EEEE, h:mm a')}`;
    } else {
      return `${format(start, 'MMM d, h:mm a')}`;
    }
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setDetailsDialogOpen(true);
  };

  const handleEditMeeting = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMeeting(meeting);
    setEditDialogOpen(true);
  };

  const handleDeleteMeeting = async (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete the meeting "${meeting.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/meetings/${meeting.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Meeting deleted successfully"
        });
        fetchMeetings();
      } else {
        throw new Error(result.error || 'Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete meeting",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading meetings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview & All Meetings</TabsTrigger>
          <TabsTrigger value="today">Today&apos;s Schedule</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">Detailed View</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions Bar */}
          <Card className="bg-linear-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Meeting
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Meetings Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    All Meetings Overview
                  </CardTitle>
                  <CardDescription>
                    Complete list of all meetings ({filteredMeetings.length} of {meetings.length} shown)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search meetings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="VENDOR">Vendor</SelectItem>
                      <SelectItem value="TRAINING">Training</SelectItem>
                      <SelectItem value="REVIEW">Review</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMeetings.length === 0 ? (
                <div className="text-center py-8">
                  {meetings.length === 0 ? (
                    <>
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No meetings found</p>
                      <Button 
                        onClick={() => setCreateDialogOpen(true)} 
                        className="mt-4"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Your First Meeting
                      </Button>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No meetings match your filters</p>
                      <Button 
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("ALL");
                          setTypeFilter("ALL");
                        }} 
                        variant="outline"
                        className="mt-4"
                        size="sm"
                      >
                        Clear Filters
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(meeting.meetingType)}
                            <h3 className="font-semibold text-sm">{meeting.title}</h3>
                            {getStatusBadge(meeting.status)}
                            {getPriorityBadge(meeting.priority)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatMeetingTime(meeting.startTime)}
                            </div>
                            {meeting.meetingLink && (
                              <div className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                Virtual
                              </div>
                            )}
                          </div>
                          
                          {meeting.description && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{meeting.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Organizer: {getOrganizer(meeting)?.name}</span>
                            {meeting.customer && (
                              <span>Customer: {meeting.customer.name}</span>
                            )}
                            {meeting.attendees.length > 0 && (
                              <span>Attendees: {meeting.attendees.length}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                            onClick={(e) => handleEditMeeting(meeting, e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                            onClick={(e) => handleDeleteMeeting(meeting, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>


        </TabsContent>

        {/* Today&apos;s Schedule Tab */}
        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Schedule</CardTitle>
              <CardDescription>
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todaysMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No meetings scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(todaysMeetings) && todaysMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(meeting.meetingType)}
                            <h3 className="font-semibold">{meeting.title}</h3>
                            {getStatusBadge(meeting.status)}
                            {getPriorityBadge(meeting.priority)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(new Date(meeting.startTime), 'h:mm a')}
                            </div>
                            {meeting.meetingLink && (
                              <div className="flex items-center gap-1">
                                <Video className="h-4 w-4" />
                                Virtual
                              </div>
                            )}
                          </div>
                          
                          {meeting.description && (
                            <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Organizer:</span>
                            <span>{getOrganizer(meeting)?.name}</span>
                            {meeting.attendees.length > 0 && (
                              <>
                                <span className="text-gray-500">• Attendees:</span>
                                <span>{meeting.attendees.length}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                            onClick={(e) => handleEditMeeting(meeting, e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                            onClick={(e) => handleDeleteMeeting(meeting, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>
                Your scheduled meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No upcoming meetings</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(upcomingMeetings) && upcomingMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(meeting.meetingType)}
                            <h3 className="font-semibold">{meeting.title}</h3>
                            {getStatusBadge(meeting.status)}
                            {getPriorityBadge(meeting.priority)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatMeetingTime(meeting.startTime)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Organizer:</span>
                            <span>{getOrganizer(meeting)?.name}</span>
                            {meeting.attendees.length > 0 && (
                              <>
                                <span className="text-gray-500">• Attendees:</span>
                                <span>{meeting.attendees.length}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                            onClick={(e) => handleEditMeeting(meeting, e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                            onClick={(e) => handleDeleteMeeting(meeting, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Meetings Tab - Detailed View */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Meetings - Detailed View</CardTitle>
                  <CardDescription>
                    Complete list with full details ({filteredMeetings.length} of {meetings.length} shown)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search meetings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="VENDOR">Vendor</SelectItem>
                      <SelectItem value="TRAINING">Training</SelectItem>
                      <SelectItem value="REVIEW">Review</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMeetings.length === 0 ? (
                <div className="text-center py-8">
                  {meetings.length === 0 ? (
                    <>
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No meetings found</p>
                      <Button 
                        onClick={() => setCreateDialogOpen(true)} 
                        className="mt-4"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Schedule Your First Meeting
                      </Button>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No meetings match your filters</p>
                      <Button 
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("ALL");
                          setTypeFilter("ALL");
                        }} 
                        variant="outline"
                        className="mt-4"
                        size="sm"
                      >
                        Clear Filters
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="p-6 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleMeetingClick(meeting)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            {getTypeIcon(meeting.meetingType)}
                            <h3 className="font-semibold text-lg">{meeting.title}</h3>
                            {getStatusBadge(meeting.status)}
                            {getPriorityBadge(meeting.priority)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="h-4 w-4" />
                                {formatMeetingTime(meeting.startTime)}
                              </div>
                              {meeting.meetingLink && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Video className="h-4 w-4" />
                                  <a 
                                    href={meeting.meetingLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Join Meeting
                                  </a>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="h-4 w-4" />
                                Organizer: {getOrganizer(meeting)?.name}
                              </div>
                              {meeting.customer && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Users className="h-4 w-4" />
                                  Customer: {meeting.customer.name} ({meeting.customer.customerId})
                                </div>
                              )}
                              {meeting.attendees.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Users className="h-4 w-4" />
                                  {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {meeting.description && (
                            <div className="mb-3">
                              <p className="text-sm text-gray-700 line-clamp-2">{meeting.description}</p>
                            </div>
                          )}
                          
                          {meeting.agenda && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 font-medium mb-1">Agenda:</p>
                              <p className="text-sm text-gray-600 line-clamp-2">{meeting.agenda}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                            onClick={(e) => handleEditMeeting(meeting, e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                            onClick={(e) => handleDeleteMeeting(meeting, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateMeetingDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onMeetingCreated={handleMeetingCreated}
      />
      
      <MeetingDetailsDialog
        meeting={selectedMeeting}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onMeetingUpdated={handleMeetingCreated}
      />

      <EditMeetingDialog
        meeting={editingMeeting}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onMeetingUpdated={handleMeetingCreated}
      />
    </div>
  );
}