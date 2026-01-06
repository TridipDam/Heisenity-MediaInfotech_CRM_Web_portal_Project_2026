import { z } from 'zod';
/**
 * Reusable common fields
 */
export const employeeIdSchema = z.string().min(1, 'Employee ID is required');
/**
 * Staff common validations
 */
export const staffSchemas = {
    employeeId: employeeIdSchema
};
