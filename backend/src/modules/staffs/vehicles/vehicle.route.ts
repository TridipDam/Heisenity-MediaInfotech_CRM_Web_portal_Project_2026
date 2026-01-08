import { Router } from 'express'
import { VehicleController } from './vehicle.controller'

const router = Router()
const vehicleController = new VehicleController()

// Vehicle routes
router.get('/vehicles', vehicleController.getAllVehicles)
router.get('/vehicles/:id', vehicleController.getVehicleById)
router.post('/vehicles', vehicleController.createVehicle)
router.post('/vehicles/:id/assign', vehicleController.assignVehicle)
router.post('/vehicles/:id/unassign', vehicleController.unassignVehicle)
router.get('/vehicles/employee/:employeeId', vehicleController.getEmployeeVehicle)

// Petrol bill routes
router.get('/petrol-bills', vehicleController.getAllPetrolBills)
router.post('/petrol-bills', vehicleController.createPetrolBill)
router.post('/petrol-bills/:id/approve', vehicleController.approvePetrolBill)

export default router