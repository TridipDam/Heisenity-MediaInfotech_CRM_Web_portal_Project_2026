import { prisma } from '@/lib/prisma'
import { 
  Vehicle, 
  PetrolBill, 
  CreateVehicleRequest, 
  AssignVehicleRequest, 
  CreatePetrolBillRequest,
  ApprovePetrolBillRequest,
  VehicleStatus,
  BillStatus
} from './vehicle.types'

export class VehicleService {
  // Get all vehicles with optional filters
  async getAllVehicles(filters?: {
    status?: VehicleStatus
    assignedTo?: string
    type?: string
  }) {
    try {
      const where: any = {}
      
      if (filters?.status) {
        where.status = filters.status
      }
      
      if (filters?.assignedTo) {
        where.assignedTo = filters.assignedTo
      }
      
      if (filters?.type) {
        where.type = filters.type
      }

      const vehicles = await prisma.vehicle.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return {
        success: true,
        data: vehicles.map(vehicle => ({
          ...vehicle,
          employeeName: vehicle.employee?.name,
          employeeId: vehicle.employee?.employeeId
        }))
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      return {
        success: false,
        error: 'Failed to fetch vehicles'
      }
    }
  }

  // Get vehicle by ID
  async getVehicleById(vehicleId: string) {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true
            }
          },
          petrolBills: {
            include: {
              employee: {
                select: {
                  name: true,
                  employeeId: true
                }
              }
            },
            orderBy: {
              date: 'desc'
            }
          }
        }
      })

      if (!vehicle) {
        return {
          success: false,
          error: 'Vehicle not found'
        }
      }

      return {
        success: true,
        data: {
          ...vehicle,
          employeeName: vehicle.employee?.name,
          employeeId: vehicle.employee?.employeeId
        }
      }
    } catch (error) {
      console.error('Error fetching vehicle:', error)
      return {
        success: false,
        error: 'Failed to fetch vehicle'
      }
    }
  }

  // Create new vehicle
  async createVehicle(data: CreateVehicleRequest) {
    try {
      console.log('VehicleService.createVehicle called with:', data)
      
      // Check if vehicle number already exists
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { vehicleNumber: data.vehicleNumber }
      })

      if (existingVehicle) {
        console.log('Vehicle number already exists:', data.vehicleNumber)
        return {
          success: false,
          error: 'Vehicle number already exists'
        }
      }

      console.log('Creating vehicle in database...')
      const vehicle = await prisma.vehicle.create({
        data: {
          vehicleNumber: data.vehicleNumber,
          make: data.make,
          model: data.model,
          year: data.year,
          type: data.type,
          status: VehicleStatus.AVAILABLE
        }
      })

      console.log('Vehicle created successfully:', vehicle)
      return {
        success: true,
        data: vehicle
      }
    } catch (error) {
      console.error('Error creating vehicle:', error)
      return {
        success: false,
        error: 'Failed to create vehicle'
      }
    }
  }

  // Assign vehicle to employee
  async assignVehicle(data: AssignVehicleRequest) {
    try {
      // Check if vehicle exists and is available
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId }
      })

      if (!vehicle) {
        return {
          success: false,
          error: 'Vehicle not found'
        }
      }

      if (vehicle.status !== VehicleStatus.AVAILABLE) {
        return {
          success: false,
          error: 'Vehicle is not available for assignment'
        }
      }

      // Check if employee exists - look up by employeeId (display ID)
      const employee = await prisma.employee.findUnique({
        where: { employeeId: data.employeeId }
      })

      if (!employee) {
        return {
          success: false,
          error: 'Employee not found'
        }
      }

      // Check if employee already has a vehicle assigned
      const existingAssignment = await prisma.vehicle.findFirst({
        where: {
          assignedTo: employee.id,
          status: VehicleStatus.ASSIGNED
        }
      })

      if (existingAssignment) {
        return {
          success: false,
          error: 'Employee already has a vehicle assigned'
        }
      }

      // Assign vehicle - use the employee's database ID for assignedTo
      const updatedVehicle = await prisma.vehicle.update({
        where: { id: data.vehicleId },
        data: {
          assignedTo: employee.id,
          assignedAt: new Date(),
          status: VehicleStatus.ASSIGNED
        },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        }
      })

      return {
        success: true,
        data: updatedVehicle
      }
    } catch (error) {
      console.error('Error assigning vehicle:', error)
      return {
        success: false,
        error: 'Failed to assign vehicle'
      }
    }
  }

  // Unassign vehicle
  async unassignVehicle(vehicleId: string) {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId }
      })

      if (!vehicle) {
        return {
          success: false,
          error: 'Vehicle not found'
        }
      }

      const updatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          assignedTo: null,
          assignedAt: null,
          status: VehicleStatus.AVAILABLE
        }
      })

      return {
        success: true,
        data: updatedVehicle
      }
    } catch (error) {
      console.error('Error unassigning vehicle:', error)
      return {
        success: false,
        error: 'Failed to unassign vehicle'
      }
    }
  }

  // Get employee's assigned vehicle
  async getEmployeeVehicle(employeeId: string) {
    try {
      // First, find the employee by their display ID to get the database ID
      const employee = await prisma.employee.findUnique({
        where: { employeeId: employeeId }
      })

      if (!employee) {
        return {
          success: false,
          error: 'Employee not found'
        }
      }

      // Then find the vehicle assigned to this employee using the database ID
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          assignedTo: employee.id,
          status: VehicleStatus.ASSIGNED
        },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        }
      })

      return {
        success: true,
        data: vehicle ? {
          ...vehicle,
          employeeName: vehicle.employee?.name,
          employeeId: vehicle.employee?.employeeId
        } : null
      }
    } catch (error) {
      console.error('Error fetching employee vehicle:', error)
      return {
        success: false,
        error: 'Failed to fetch employee vehicle'
      }
    }
  }

  // Get all petrol bills
  async getAllPetrolBills(filters?: {
    status?: BillStatus
    employeeId?: string
    vehicleId?: string
  }) {
    try {
      const where: any = {}
      
      if (filters?.status) {
        where.status = filters.status
      }
      
      if (filters?.employeeId) {
        where.employeeId = filters.employeeId
      }
      
      if (filters?.vehicleId) {
        where.vehicleId = filters.vehicleId
      }

      const bills = await prisma.petrolBill.findMany({
        where,
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          },
          vehicle: {
            select: {
              vehicleNumber: true,
              make: true,
              model: true
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      })

      return {
        success: true,
        data: bills.map(bill => ({
          ...bill,
          employeeName: bill.employee.name,
          employeeIdNumber: bill.employee.employeeId,
          vehicleNumber: bill.vehicle.vehicleNumber
        }))
      }
    } catch (error) {
      console.error('Error fetching petrol bills:', error)
      return {
        success: false,
        error: 'Failed to fetch petrol bills'
      }
    }
  }

  // Create petrol bill
  async createPetrolBill(employeeId: string, data: CreatePetrolBillRequest) {
    try {
      // First, find the employee by their display ID to get the database ID
      const employee = await prisma.employee.findUnique({
        where: { employeeId: employeeId }
      })

      if (!employee) {
        return {
          success: false,
          error: 'Employee not found'
        }
      }

      // Verify vehicle is assigned to employee using the database ID
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: data.vehicleId,
          assignedTo: employee.id,
          status: VehicleStatus.ASSIGNED
        }
      })

      if (!vehicle) {
        return {
          success: false,
          error: 'Vehicle not found or not assigned to you'
        }
      }

      const bill = await prisma.petrolBill.create({
        data: {
          vehicleId: data.vehicleId,
          employeeId: employee.id, // Use the database ID for the petrol bill
          amount: data.amount,
          date: new Date(data.date),
          imageUrl: data.imageUrl,
          description: data.description,
          status: BillStatus.PENDING
        },
        include: {
          vehicle: {
            select: {
              vehicleNumber: true
            }
          }
        }
      })

      return {
        success: true,
        data: bill
      }
    } catch (error) {
      console.error('Error creating petrol bill:', error)
      return {
        success: false,
        error: 'Failed to create petrol bill'
      }
    }
  }

  // Approve/Reject petrol bill
  async approvePetrolBill(data: ApprovePetrolBillRequest) {
    try {
      const bill = await prisma.petrolBill.findUnique({
        where: { id: data.billId }
      })

      if (!bill) {
        return {
          success: false,
          error: 'Petrol bill not found'
        }
      }

      if (bill.status !== BillStatus.PENDING) {
        return {
          success: false,
          error: 'Bill has already been processed'
        }
      }

      const updatedBill = await prisma.petrolBill.update({
        where: { id: data.billId },
        data: {
          status: data.status === 'APPROVED' ? BillStatus.APPROVED : BillStatus.REJECTED,
          approvedBy: data.adminId,
          approvedAt: new Date()
        },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          },
          vehicle: {
            select: {
              vehicleNumber: true
            }
          }
        }
      })

      return {
        success: true,
        data: updatedBill
      }
    } catch (error) {
      console.error('Error approving petrol bill:', error)
      return {
        success: false,
        error: 'Failed to process petrol bill'
      }
    }
  }

  // Delete vehicle
  async deleteVehicle(vehicleId: string) {
    try {
      // Check if vehicle exists
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId }
      })

      if (!vehicle) {
        return {
          success: false,
          error: 'Vehicle not found'
        }
      }

      // Check if vehicle is assigned
      if (vehicle.status === VehicleStatus.ASSIGNED) {
        return {
          success: false,
          error: 'Cannot delete assigned vehicle. Please unassign first.'
        }
      }

      // Delete the vehicle
      await prisma.vehicle.delete({
        where: { id: vehicleId }
      })

      return {
        success: true,
        message: 'Vehicle deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      return {
        success: false,
        error: 'Failed to delete vehicle'
      }
    }
  }
}