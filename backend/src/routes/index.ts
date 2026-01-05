import { Router, Request, Response } from 'express';
import attendanceRoutes from '@/modules/staffs/attendance/attendance.route';
import employeeRoutes from '@/modules/staffs/employee/employee.route';
import { authRouter } from './auth.route';
import employeeIdRoutes from './employeeId.route';
import fieldEngineerRoutes from './fieldEngineer.route';

const router = Router();

// Mount auth routes
router.use('/auth', authRouter);

// Mount attendance routes
router.use('/attendance', attendanceRoutes);

// Mount employee routes
router.use('/employees', employeeRoutes);

// Mount employee ID generator routes
router.use('/employee-id', employeeIdRoutes);

// Mount field engineer routes
router.use('/field-engineers', fieldEngineerRoutes);

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'CRM Backend API'
  });
});

// Test endpoint
router.get('/test', (_req: Request, res: Response) => {
  res.json({ 
    message: 'CRM Backend API is running!',
    version: '1.0.0'
  });
});

export default router;