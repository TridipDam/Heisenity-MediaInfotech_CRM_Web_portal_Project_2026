import { Request, Response } from 'express'
import { VehicleService } from './vehicle.service'
import { 
  CreateVehicleRequest, 
  AssignVehicleRequest, 
  CreatePetrolBillRequest,
  ApprovePetrolBillRequest,
  VehicleStatus,
  BillStatus
} from './vehicle.types'

const vehicleService = new VehicleService()

export class VehicleController {
  // GET /vehicles - Get all vehicles
  async getAllVehicles(req: Request, res: Response) {
    try {
      const { status, assignedTo, type } = req.query

      const filters: any = {}
      if (status) filters.status = status as VehicleStatus
      if (assignedTo) filters.assignedTo = assignedTo as string
      if (type) filters.type = type as string

      const result = await vehicleService.getAllVehicles(filters)

      if (result.success) {
        res.json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Error in getAllVehicles:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // GET /vehicles/:id - Get vehicle by ID
  async getVehicleById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const result = await vehicleService.getVehicleById(id)

      if (result.success) {
        res.json(result)
      } else {
        res.status(404).json(result)
      }
    } catch (error) {
      console.error('Error in getVehicleById:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // POST /vehicles - Create new vehicle
  async createVehicle(req: Request, res: Response) {
    try {
      const data: CreateVehicleRequest = req.body
      const result = await vehicleService.createVehicle(data)

      if (result.success) {
        res.status(201).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Error in createVehicle:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // POST /vehicles/:id/assign - Assign vehicle to employee
  async assignVehicle(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { employeeId } = req.body

      const data: AssignVehicleRequest = {
        vehicleId: id,
        employeeId
      }

      const result = await vehicleService.assignVehicle(data)

      if (result.success) {
        res.json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Error in assignVehicle:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // POST /vehicles/:id/unassign - Unassign vehicle
  async unassignVehicle(req: Request, res: Response) {
    try {
      const { id } = req.params
      const result = await vehicleService.unassignVehicle(id)

      if (result.success) {
        res.json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Error in unassignVehicle:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // GET /vehicles/employee/:employeeId - Get employee's assigned vehicle
  async getEmployeeVehicle(req: Request, res: Response) {
    try {
      const { employeeId } = req.params
      const result = await vehicleService.getEmployeeVehicle(employeeId)

      res.json(result)
    } catch (error) {
      console.error('Error in getEmployeeVehicle:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // GET /petrol-bills - Get all petrol bills
  async getAllPetrolBills(req: Request, res: Response) {
    try {
      const { status, employeeId, vehicleId } = req.query

      const filters: any = {}
      if (status) filters.status = status as BillStatus
      if (employeeId) filters.employeeId = employeeId as string
      if (vehicleId) filters.vehicleId = vehicleId as string

      const result = await vehicleService.getAllPetrolBills(filters)

      if (result.success) {
        res.json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Error in getAllPetrolBills:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // POST /petrol-bills - Create petrol bill
  async createPetrolBill(req: Request, res: Response) {
    try {
      // Get employee ID from session/token
      const employeeId = (req as any).user?.employeeId || (req as any).user?.id

      if (!employeeId) {
        return res.status(401).json({
          success: false,
          error: 'Employee ID not found in session'
        })
      }

      const data: CreatePetrolBillRequest = req.body
      const result = await vehicleService.createPetrolBill(employeeId, data)

      if (result.success) {
        res.status(201).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Error in createPetrolBill:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  // POST /petrol-bills/:id/approve - Approve/Reject petrol bill
  async approvePetrolBill(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { status } = req.body

      // Get admin ID from session/token
      const adminId = (req as any).user?.adminId || (req as any).user?.id

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in session'
        })
      }

      const data: ApprovePetrolBillRequest = {
        billId: id,
        status: status as 'APPROVED' | 'REJECTED',
        adminId
      }

      const result = await vehicleService.approvePetrolBill(data)

      if (result.success) {
        res.json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Error in approvePetrolBill:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}