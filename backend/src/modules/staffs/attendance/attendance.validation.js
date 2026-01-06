import { z } from 'zod';
import { ATTENDANCE_STATUS } from './attendance.constants';
export const checkInSchema = z.object({
    employeeId: z.string().min(1),
    location: z.string().optional(),
    ipAddress: z.string().optional(),
    deviceInfo: z.string().optional(),
    photo: z.url().optional()
});
export const checkOutSchema = z.object({
    employeeId: z.string().min(1)
});
export const attendanceRecordSchema = z.object({
    employeeId: z.string(),
    timestamp: z.string(),
    status: z.enum(Object.values(ATTENDANCE_STATUS))
});
