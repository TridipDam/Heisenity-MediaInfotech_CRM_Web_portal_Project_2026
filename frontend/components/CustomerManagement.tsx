"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Eye, Download, Filter, Clock, Timer, Calendar, Loader2, Building2, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportCustomersToExcel } from "@/lib/server-api";
import MeetingScheduler from "./MeetingScheduler";

interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  status: string;
  createdAt: string;
  projects?: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate?: string;
    priority?: string;
  }[];
}

export default function CustomerManagement() {
  const { data: session, status } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [exportLoading, setExportLoading] = useState<'excel' | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    customPrefix: "",
  });

  const [prefixes, setPrefixes] = useState<string[]>([]);
  const [showAddPrefix, setShowAddPrefix] = useState(false);
  const [newPrefix, setNewPrefix] = useState("");

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchCustomers();
      fetchPrefixes();
    }
  }, [pagination.page, searchTerm, session, status]);

  const fetchPrefixes = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/customers/prefixes`,
        {
          headers: {
            Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch prefixes");

      const data = await response.json();
      setPrefixes(data.prefixes);
    } catch (error) {
      console.error("Error fetching prefixes:", error);
    }
  };

  const handleAddPrefix = async () => {
    if (!newPrefix.trim()) {
      toast.error("Please enter a prefix");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/customers/prefixes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
          },
          body: JSON.stringify({ prefix: newPrefix.toUpperCase() }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add prefix");
      }

      toast.success("Prefix added successfully");
      setNewPrefix("");
      setShowAddPrefix(false);
      fetchPrefixes();
    } catch (error: any) {
      console.error("Error adding prefix:", error);
      toast.error(error.message || "Failed to add prefix");
    }
  };

  const fetchCustomers = async () => {
    // Don't fetch if not authenticated
    if (status !== "authenticated" || !session?.user) {
      console.log("Not authenticated, skipping customer fetch")
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/customers?${params}`,
        {
          headers: {
            Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch customers");

      const data = await response.json();
      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create customer");
      }

      const data = await response.json();
      toast.success("Customer created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast.error(error.message || "Failed to create customer");
    }
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/customers/${selectedCustomer.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update customer");
      }

      toast.success("Customer updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      console.error("Error updating customer:", error);
      toast.error(error.message || "Failed to update customer");
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/customers/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${(session?.user as any)?.sessionToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete customer");

      toast.success("Customer deleted successfully");
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    }
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
  };

  const openMeetingScheduler = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsMeetingDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      customPrefix: "",
    });
    setSelectedCustomer(null);
  };

  const handleExport = async (quickRange?: 'yesterday' | '15days' | '30days') => {
    try {
      setExportLoading('excel');

      // Check if we have a valid session
      if (!session?.user) {
        toast.error('Please log in to export data');
        return;
      }

      const sessionToken = (session.user as any)?.sessionToken;
      if (!sessionToken) {
        toast.error('Authentication token not available');
        return;
      }

      // Prepare export parameters based on current filters
      const exportParams: {
        search?: string;
        status?: string;
        quickRange?: 'yesterday' | '15days' | '30days';
      } = {};

      // If no quick range is specified, use current filters
      if (!quickRange) {
        if (searchTerm) {
          exportParams.search = searchTerm;
        }
      } else {
        exportParams.quickRange = quickRange;
      }

      await exportCustomersToExcel(exportParams, sessionToken);
      toast.success('Export successful');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export to Excel');
    } finally {
      setExportLoading(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
          <CardDescription>Manage customer accounts and information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search by Customer ID, name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50"
                    disabled={exportLoading !== null}
                  >
                    {exportLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {exportLoading ? 'Exporting...' : 'Export to Excel'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleExport()}
                    disabled={exportLoading !== null}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Current Filter
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport('yesterday')}
                    disabled={exportLoading !== null}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Yesterday
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport('15days')}
                    disabled={exportLoading !== null}
                  >
                    <Timer className="h-4 w-4 mr-2" />
                    Last 15 Days
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport('30days')}
                    disabled={exportLoading !== null}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Last 30 Days
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.customerId}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {customer.projects && customer.projects.length > 0 ? (
                            customer.projects.slice(0, 2).map((project) => (
                              <Badge
                                key={project.id}
                                variant="outline"
                                className="text-xs"
                              >
                                <Building2 className="w-3 h-3 mr-1" />
                                {project.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No projects</span>
                          )}
                          {customer.projects && customer.projects.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{customer.projects.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            customer.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {customer.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewDialog(customer)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openMeetingScheduler(customer)}
                            title="Schedule Meeting"
                          >
                            <CalendarDays className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Customer Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to the system. Choose a prefix for the customer ID.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customPrefix">Customer ID Prefix</Label>
              <div className="flex gap-2">
                <select
                  id="customPrefix"
                  value={formData.customPrefix}
                  onChange={(e) => setFormData({ ...formData, customPrefix: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select prefix (default: CUS)</option>
                  {prefixes.map((prefix) => (
                    <option key={prefix} value={prefix}>
                      {prefix} (e.g., {prefix}0001)
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddPrefix(true)}
                  title="Add new prefix"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Customer ID will be generated as: {formData.customPrefix || 'CUS'}0001, {formData.customPrefix || 'CUS'}0002, etc.
              </p>
            </div>
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer}>Create Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer}>Update Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Customer ID</Label>
                  <p className="font-medium">{selectedCustomer.customerId}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Name</Label>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Phone</Label>
                  <p className="font-medium">{selectedCustomer.phone}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p className="font-medium">{selectedCustomer.email || "-"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-500">Address</Label>
                  <p className="font-medium">{selectedCustomer.address || "-"}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <p className="font-medium">{selectedCustomer.status}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Created At</Label>
                  <p className="font-medium">
                    {new Date(selectedCustomer.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Projects Section */}
              <div className="border-t pt-4">
                <Label className="text-gray-500 text-lg font-semibold">Associated Projects</Label>
                {selectedCustomer.projects && selectedCustomer.projects.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {selectedCustomer.projects.map((project) => (
                      <div key={project.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-600" />
                              <h4 className="font-medium text-gray-900">{project.name}</h4>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                              {project.endDate && (
                                <span>End: {new Date(project.endDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Badge
                              variant={project.status === 'ONGOING' ? 'default' : 
                                     project.status === 'COMPLETED' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {project.status}
                            </Badge>
                            {project.priority && (
                              <Badge variant="outline" className="text-xs">
                                {project.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-center py-8 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No projects associated with this customer</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Scheduler Dialog */}
      <MeetingScheduler
        customer={selectedCustomer || undefined}
        isOpen={isMeetingDialogOpen}
        onClose={() => {
          setIsMeetingDialogOpen(false);
          setSelectedCustomer(null);
        }}
      />

      {/* Add Prefix Dialog */}
      <Dialog open={showAddPrefix} onOpenChange={setShowAddPrefix}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer ID Prefix</DialogTitle>
            <DialogDescription>
              Create a new prefix for customer IDs. Use 2-5 uppercase letters only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPrefix">Prefix *</Label>
              <Input
                id="newPrefix"
                value={newPrefix}
                onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                placeholder="e.g., CHM, VIP, ENT"
                maxLength={5}
                pattern="[A-Z]{2,5}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: CHM will generate CHM0001, CHM0002, etc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddPrefix(false);
              setNewPrefix("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddPrefix}>Add Prefix</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
