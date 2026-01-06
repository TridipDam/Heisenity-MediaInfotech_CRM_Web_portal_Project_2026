import { Router } from 'express';
import { EmployeeIdController } from '../controllers/employeeId.controller';
const router = Router();
// Generate next available employee ID
router.get('/generate', EmployeeIdController.generateNextId);
// Check if employee ID is available
router.get('/check/:employeeId', EmployeeIdController.checkAvailability);
// Get next available employee IDs for preview
router.get('/preview', EmployeeIdController.getNextAvailableIds);
// Validate employee ID format
router.post('/validate', EmployeeIdController.validateFormat);
export default router;
