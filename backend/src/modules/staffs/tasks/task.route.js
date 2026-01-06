import { Router } from 'express';
import { assignTask, getTasksForEmployee, updateTask, getTasks, updateEmployeeAttendanceStatus, resetEmployeeAttendanceAttempts } from './task.controller';
const router = Router();
// Assign a new task
router.post('/assign', (req, res) => {
    return assignTask(req, res);
});
// Get all tasks with pagination
router.get('/', (req, res) => {
    return getTasks(req, res);
});
// Get tasks for a specific employee
router.get('/employee/:employeeId', (req, res) => {
    return getTasksForEmployee(req, res);
});
// Update task status
router.put('/:taskId', (req, res) => {
    return updateTask(req, res);
});
// Update attendance status for an employee
router.put('/attendance/:employeeId', (req, res) => {
    return updateEmployeeAttendanceStatus(req, res);
});
// Reset attendance attempts for an employee
router.post('/reset-attempts/:employeeId', (req, res) => {
    return resetEmployeeAttendanceAttempts(req, res);
});
export default router;
