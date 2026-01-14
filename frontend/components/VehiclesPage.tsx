"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getAllVehicles, getAllPetrolBills, createVehicle, deleteVehicle, unassignVehicle, Vehicle, PetrolBill } from "@/lib/server-api"
import { showToast, showConfirm } from "@/lib/toast-utils"
import {
  Car,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  User,
  Calendar,
  Settings,
  FileText,
  Upload,
  Eye,
  UserX
} from "lucide-react"

const getStatusBadge = (status: string) => {
  const variants = {
    AVAILABLE: "bg-green-50 text-green-700 border-green-200",
    ASSIGNED: "bg-blue-50 text-blue-700 border-blue-200",
    MAINTENANCE: "bg-yellow-50 text-yellow-700 border-yellow-200",
    OUT_OF_SERVICE: "bg-red-50 text-red-700 border-red-200"
  }

  return (
    <Badge className={`${variants[status as keyof typeof variants]} capitalize font-medium`}>
      {status.toLowerCase().replace('_', ' ')}
    </Badge>
  )
}

const getBillStatusBadge = (status: string) => {
  const variants = {
    PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
    APPROVED: "bg-green-50 text-green-700 border-green-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200"
  }

  return (
    <Badge className={`${variants[status as keyof typeof variants]} capitalize font-medium`}>
      {status.toLowerCase()}
    </Badge>
  )
}

export function VehiclesPage() {
  const { data: session } = useSession()
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [petrolBills, setPetrolBills] = React.useState<PetrolBill[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [activeTab, setActiveTab] = React.useState<'vehicles' | 'bills'>('vehicles')
  const [showAddVehicle, setShowAddVehicle] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [vehicleForm, setVehicleForm] = React.useState({
    vehicleNumber: "",
    make: "",
    model: "",
    year: "",
    type: "CAR" as const
  })

  const userType = (session?.user as any)?.userType

  // Fetch data from API
  React.useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [vehiclesResponse, billsResponse] = await Promise.all([
        getAllVehicles(),
        getAllPetrolBills()
      ])

      if (vehiclesResponse.success && vehiclesResponse.data) {
        setVehicles(vehiclesResponse.data)
      }

      if (billsResponse.success && billsResponse.data) {
        setPetrolBills(billsResponse.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!vehicleForm.vehicleNumber || !vehicleForm.make || !vehicleForm.model) {
      showToast.error('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      
      const vehicleData = {
        vehicleNumber: vehicleForm.vehicleNumber,
        make: vehicleForm.make,
        model: vehicleForm.model,
        year: vehicleForm.year ? parseInt(vehicleForm.year) : undefined,
        type: vehicleForm.type
      }

      console.log('Submitting vehicle data:', vehicleData)
      const response = await createVehicle(vehicleData)
      console.log('Create vehicle response:', response)
      
      if (response.success) {
        // Reset form
        setVehicleForm({
          vehicleNumber: "",
          make: "",
          model: "",
          year: "",
          type: "CAR"
        })
        
        // Close dialog
        setShowAddVehicle(false)
        
        // Refresh data
        await fetchData()
        
        showToast.success('Vehicle added successfully!')
      } else {
        showToast.error(response.error || 'Failed to add vehicle')
      }
    } catch (error) {
      console.error('Error adding vehicle:', error)
      showToast.error('Failed to add vehicle: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteVehicle = async (vehicleId: string, vehicleNumber: string) => {
    showConfirm(
      `Are you sure you want to delete vehicle ${vehicleNumber}? This action cannot be undone.`,
      async () => {
        try {
          const response = await deleteVehicle(vehicleId)
          
          if (response.success) {
            // Refresh data
            await fetchData()
            showToast.success('Vehicle deleted successfully!')
          } else {
            showToast.error(response.error || 'Failed to delete vehicle')
          }
        } catch (error) {
          console.error('Error deleting vehicle:', error)
          showToast.error('Failed to delete vehicle: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
      },
      'Delete Vehicle'
    )
  }

  const handleUnassignVehicle = async (vehicleId: string, vehicleNumber: string, employeeName: string) => {
    showConfirm(
      `Are you sure you want to unassign vehicle ${vehicleNumber} from ${employeeName}?`,
      async () => {
        try {
          const response = await unassignVehicle(vehicleId)
          
          if (response.success) {
            // Refresh data
            await fetchData()
            showToast.success('Vehicle unassigned successfully!')
          } else {
            showToast.error(response.error || 'Failed to unassign vehicle')
          }
        } catch (error) {
          console.error('Error unassigning vehicle:', error)
          showToast.error('Failed to unassign vehicle: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
      },
      'Unassign Vehicle'
    )
  }

  const filteredVehicles = React.useMemo(() => {
    let filtered = vehicles

    if (searchTerm) {
      filtered = filtered.filter(vehicle =>
        vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(vehicle => vehicle.status === statusFilter)
    }

    return filtered
  }, [vehicles, searchTerm, statusFilter])

  const filteredBills = React.useMemo(() => {
    let filtered = petrolBills

    if (searchTerm) {
      filtered = filtered.filter(bill =>
        bill.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [petrolBills, searchTerm])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Car className="h-6 w-6 text-blue-600" />
              Vehicle Management
            </h1>
            <p className="text-gray-600">
              {userType === 'ADMIN' 
                ? 'Manage vehicles, assignments, and petrol bill approvals'
                : 'View your assigned vehicle and petrol bills'
              }
            </p>
          </div>
          {userType === 'ADMIN' && (
            <div className="flex items-center gap-2">
              <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Vehicle</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddVehicle} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                        <Input 
                          id="vehicleNumber" 
                          placeholder="MH12AB1234" 
                          value={vehicleForm.vehicleNumber}
                          onChange={(e) => setVehicleForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="make">Make *</Label>
                        <Input 
                          id="make" 
                          placeholder="Maruti" 
                          value={vehicleForm.make}
                          onChange={(e) => setVehicleForm(prev => ({ ...prev, make: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="model">Model *</Label>
                        <Input 
                          id="model" 
                          placeholder="Swift" 
                          value={vehicleForm.model}
                          onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="year">Year</Label>
                        <Input 
                          id="year" 
                          type="number" 
                          placeholder="2023" 
                          value={vehicleForm.year}
                          onChange={(e) => setVehicleForm(prev => ({ ...prev, year: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="type">Vehicle Type *</Label>
                      <Select 
                        value={vehicleForm.type} 
                        onValueChange={(value: any) => setVehicleForm(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CAR">Car</SelectItem>
                          <SelectItem value="BIKE">Bike</SelectItem>
                          <SelectItem value="TRUCK">Truck</SelectItem>
                          <SelectItem value="VAN">Van</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => setShowAddVehicle(false)}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Adding...' : 'Add Vehicle'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vehicles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Car className="h-4 w-4 inline mr-2" />
              Vehicles ({vehicles.length})
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bills'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Petrol Bills ({petrolBills.length})
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={activeTab === 'vehicles' ? "Search vehicles..." : "Search bills..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {activeTab === 'vehicles' && (
              <div className="sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'vehicles' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    {userType === 'ADMIN' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{vehicle.vehicleNumber}</div>
                          <div className="text-sm text-gray-500">
                            {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {vehicle.type.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(vehicle.status)}
                      </TableCell>
                      <TableCell>
                        {vehicle.employeeName ? (
                          <div>
                            <div className="font-medium">{vehicle.employeeName}</div>
                            <div className="text-sm text-gray-500">{vehicle.employeeId}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.assignedAt ? (
                          new Date(vehicle.assignedAt).toLocaleDateString()
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      {userType === 'ADMIN' && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {vehicle.status === 'ASSIGNED' && vehicle.employeeName && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUnassignVehicle(vehicle.id, vehicle.vehicleNumber, vehicle.employeeName || 'Unknown')}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                title="Unassign vehicle"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteVehicle(vehicle.id, vehicle.vehicleNumber)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete vehicle"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Assign vehicle">
                              <User className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>
                        <div className="font-medium">{bill.vehicleNumber}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{bill.employeeName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">₹{bill.amount.toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        {new Date(bill.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getBillStatusBadge(bill.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {userType === 'ADMIN' && bill.status === 'PENDING' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-green-600">
                                Approve
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600">
                                Reject
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
          )}
        </div>
      </div>
    </div>
  )
}