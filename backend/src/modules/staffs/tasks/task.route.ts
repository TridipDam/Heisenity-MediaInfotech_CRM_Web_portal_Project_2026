import { Router, Request, Response } from 'express';
import { assignTask, getTasksForEmployee, updateTask, getTasks, updateEmployeeAttendanceStatus, resetEmployeeAttendanceAttempts, fixLocationTimes } from './task.controller';

const router = Router();

// Assign a new task
router.post('/assign', (req: Request, res: Response) => {
  return assignTask(req, res);
});

// Get all tasks with pagination
router.get('/', (req: Request, res: Response) => {
  return getTasks(req, res);
});

// Get tasks for a specific employee
router.get('/employee/:employeeId', (req: Request, res: Response) => {
  return getTasksForEmployee(req, res);
});

// Update task status
router.put('/:taskId', (req: Request, res: Response) => {
  return updateTask(req, res);
});

// Update attendance status for an employee
router.put('/attendance/:employeeId', (req: Request, res: Response) => {
  return updateEmployeeAttendanceStatus(req, res);
});

// Reset attendance attempts for an employee
router.post('/reset-attempts/:employeeId', (req: Request, res: Response) => {
  return resetEmployeeAttendanceAttempts(req, res);
});

// Fix daily location time issues
router.post('/fix-location-times', (req: Request, res: Response) => {
  return fixLocationTimes(req, res);
});

export default router;