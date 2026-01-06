import { EmployeeIdGeneratorService } from '../services/employeeIdGenerator.service';
export class EmployeeIdController {
    /**
     * Generate next available employee ID
     */
    static async generateNextId(req, res) {
        try {
            const nextId = await EmployeeIdGeneratorService.generateNextEmployeeId();
            res.status(200).json({
                success: true,
                data: {
                    employeeId: nextId
                },
                message: 'Employee ID generated successfully'
            });
        }
        catch (error) {
            console.error('Error generating employee ID:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to generate employee ID'
            });
        }
    }
    /**
     * Check if employee ID is available
     */
    static async checkAvailability(req, res) {
        try {
            const { employeeId } = req.params;
            if (!employeeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID is required'
                });
            }
            // Validate format
            if (!EmployeeIdGeneratorService.validateEmployeeIdFormat(employeeId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid employee ID format. Use format: EMP001, EMP002, etc.'
                });
            }
            const isAvailable = await EmployeeIdGeneratorService.isEmployeeIdAvailable(employeeId);
            res.status(200).json({
                success: true,
                data: {
                    employeeId,
                    available: isAvailable
                },
                message: isAvailable ? 'Employee ID is available' : 'Employee ID is already taken'
            });
        }
        catch (error) {
            console.error('Error checking employee ID availability:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to check employee ID availability'
            });
        }
    }
    /**
     * Get next available employee IDs for preview
     */
    static async getNextAvailableIds(req, res) {
        try {
            const count = parseInt(req.query.count) || 5;
            if (count < 1 || count > 20) {
                return res.status(400).json({
                    success: false,
                    message: 'Count must be between 1 and 20'
                });
            }
            const nextIds = await EmployeeIdGeneratorService.getNextAvailableIds(count);
            res.status(200).json({
                success: true,
                data: {
                    nextAvailableIds: nextIds
                },
                message: 'Next available employee IDs retrieved successfully'
            });
        }
        catch (error) {
            console.error('Error getting next available IDs:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get next available IDs'
            });
        }
    }
    /**
     * Validate employee ID format
     */
    static async validateFormat(req, res) {
        try {
            const { employeeId } = req.body;
            if (!employeeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID is required'
                });
            }
            const isValid = EmployeeIdGeneratorService.validateEmployeeIdFormat(employeeId);
            res.status(200).json({
                success: true,
                data: {
                    employeeId,
                    valid: isValid
                },
                message: isValid ? 'Employee ID format is valid' : 'Invalid employee ID format'
            });
        }
        catch (error) {
            console.error('Error validating employee ID format:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to validate employee ID format'
            });
        }
    }
}
