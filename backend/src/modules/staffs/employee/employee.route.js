import { Router } from 'express';
import { getAllEmployees, createEmployee, updateEmployee, deleteEmployee, getEmployeeById, getNextEmployeeId } from './employee.controller';
const router = Router();
// Get all employees - GET /employees
router.get('/', (req, res) => {
    return getAllEmployees(req, res);
});
// Get next employee ID - GET /employees/next-id
router.get('/next-id', (req, res) => {
    return getNextEmployeeId(req, res);
});
// Get employee by ID - GET /employees/:id
router.get('/:id', (req, res) => {
    return getEmployeeById(req, res);
});
// Create new employee - POST /employees
router.post('/', (req, res) => {
    return createEmployee(req, res);
});
// Update employee - PUT /employees/:id
router.put('/:id', (req, res) => {
    return updateEmployee(req, res);
});
// Delete employee - DELETE /employees/:id
router.delete('/:id', (req, res) => {
    return deleteEmployee(req, res);
});
export default router;
