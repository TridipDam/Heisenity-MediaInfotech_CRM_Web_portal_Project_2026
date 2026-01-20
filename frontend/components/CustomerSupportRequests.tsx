"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bell, CheckCircle, User, Phone, Mail, FileText, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

interface SupportRequest {
  id: string;
  message: string;
  documents: string | null;
  status: string;
  createdAt: string;
  customer: {
    customerId: string;
    name: string;
    phone: string;
    email?: string;
  };
}

export default function CustomerSupportRequests() {
  const { data: session } = useSession();
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<SupportRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [ticketForm, setTicketForm] = useState({
    category: "OTHER",
    priority: "MEDIUM",
    department: "Customer Support",
    dueDate: "",
    estimatedHours: ""
  });

  useEffect(() => {
    fetchRequests();
    // Poll for new requests every 30 seconds
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const [pendingRes, acceptedRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/customer-support/pending`, {
          headers: {
            Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
          },
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/customer-support/my-accepted`, {
          headers: {
            Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
          },
        })
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingRequests(data.data || []);
      }

      if (acceptedRes.ok) {
        const data = await acceptedRes.json();
        setAcceptedRequests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/customer-support/${requestId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept request");
      }

      toast.success("Support request accepted!");
      fetchRequests();
    } catch (error: any) {
      console.error("Error accepting request:", error);
      toast.error(error.message || "Failed to accept request");
    }
  };

  const openCreateTicketDialog = (request: SupportRequest) => {
    setSelectedRequest(request);
    setTicketForm({
      category: "OTHER",
      priority: "MEDIUM",
      department: "Customer Support",
      dueDate: "",
      estimatedHours: ""
    });
    setIsCreateTicketDialogOpen(true);
  };

  const handleCreateTicket = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/customer-support/${selectedRequest.id}/create-ticket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
          },
          body: JSON.stringify(ticketForm),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create ticket");
      }

      const data = await response.json();
      toast.success(`Ticket ${data.data.ticketId} created successfully!`);
      setIsCreateTicketDialogOpen(false);
      fetchRequests();
      router.push("/tickets");
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create ticket");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading support requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Support Requests</h1>
          <p className="text-gray-600 mt-1">Manage incoming customer support requests</p>
        </div>
        <Button onClick={fetchRequests} variant="outline">
          <Bell className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Pending Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>New support requests waiting to be accepted</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{request.customer.name}</h3>
                            <p className="text-sm text-gray-600">{request.customer.customerId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {request.customer.phone}
                          </div>
                          {request.customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {request.customer.email}
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
                          <p className="text-gray-800">{request.message}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          Submitted: {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="ml-4"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accepted Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            My Accepted Requests
          </CardTitle>
          <CardDescription>Requests you've accepted - create tickets for these</CardDescription>
        </CardHeader>
        <CardContent>
          {acceptedRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No accepted requests</p>
          ) : (
            <div className="space-y-4">
              {acceptedRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{request.customer.name}</h3>
                            <p className="text-sm text-gray-600">{request.customer.customerId}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Accepted</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {request.customer.phone}
                          </div>
                          {request.customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {request.customer.email}
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
                          <p className="text-gray-800">{request.message}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => openCreateTicketDialog(request)}
                        className="ml-4 bg-green-600 hover:bg-green-700"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Create Ticket
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateTicketDialogOpen} onOpenChange={setIsCreateTicketDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Create a ticket for {selectedRequest?.customer.name}'s support request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium text-blue-900">Customer Information:</p>
              <p className="text-sm text-blue-800">
                <strong>Name:</strong> {selectedRequest?.customer.name}
              </p>
              <p className="text-sm text-blue-800">
                <strong>ID:</strong> {selectedRequest?.customer.customerId}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Message:</strong> {selectedRequest?.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={ticketForm.category}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={ticketForm.department}
                onChange={(e) => setTicketForm({ ...ticketForm, department: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={ticketForm.dueDate}
                  onChange={(e) => setTicketForm({ ...ticketForm, dueDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  value={ticketForm.estimatedHours}
                  onChange={(e) => setTicketForm({ ...ticketForm, estimatedHours: e.target.value })}
                  placeholder="e.g., 4"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTicketDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
