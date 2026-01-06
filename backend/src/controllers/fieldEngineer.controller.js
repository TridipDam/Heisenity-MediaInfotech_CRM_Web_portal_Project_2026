import { prisma } from '../lib/prisma';
export class FieldEngineerController {
    /**
     * Get all field engineers
     */
    static async getAllFieldEngineers(req, res) {
        try {
            const { status = 'ACTIVE', search } = req.query;
            const whereClause = {};
            if (status && status !== 'ALL') {
                whereClause.status = status;
            }
            if (search) {
                whereClause.OR = [
                    { name: { contains: search } },
                    { employeeId: { contains: search } },
                    { email: { contains: search } }
                ];
            }
            const fieldEngineers = await prisma.fieldEngineer.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    employeeId: true,
                    email: true,
                    phone: true,
                    teamId: true,
                    isTeamLeader: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: [
                    { employeeId: 'asc' }
                ]
            });
            res.status(200).json({
                success: true,
                data: {
                    fieldEngineers,
                    total: fieldEngineers.length
                },
                message: 'Field engineers retrieved successfully'
            });
        }
        catch (error) {
            console.error('Error getting field engineers:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get field engineers'
            });
        }
    }
    /**
     * Get field engineer by employee ID
     */
    static async getFieldEngineerByEmployeeId(req, res) {
        try {
            const { employeeId } = req.params;
            if (!employeeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID is required'
                });
            }
            const fieldEngineer = await prisma.fieldEngineer.findUnique({
                where: {
                    employeeId: employeeId
                },
                select: {
                    id: true,
                    name: true,
                    employeeId: true,
                    email: true,
                    phone: true,
                    teamId: true,
                    isTeamLeader: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            if (!fieldEngineer) {
                return res.status(404).json({
                    success: false,
                    message: 'Field engineer not found'
                });
            }
            res.status(200).json({
                success: true,
                data: fieldEngineer,
                message: 'Field engineer retrieved successfully'
            });
        }
        catch (error) {
            console.error('Error getting field engineer:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get field engineer'
            });
        }
    }
    /**
     * Create new field engineer
     */
    static async createFieldEngineer(req, res) {
        try {
            const { name, employeeId, email, password, phone, teamId, isTeamLeader, assignedBy } = req.body;
            // Validate required fields
            if (!name || !employeeId || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, employee ID, email, and password are required'
                });
            }
            // Check if employee ID or email already exists
            const existingEmployee = await prisma.fieldEngineer.findFirst({
                where: {
                    OR: [
                        { employeeId: employeeId },
                        { email: email }
                    ]
                }
            });
            if (existingEmployee) {
                return res.status(400).json({
                    success: false,
                    message: existingEmployee.employeeId === employeeId
                        ? 'Employee ID already exists'
                        : 'Email already exists'
                });
            }
            // If assignedBy is provided, verify the admin exists
            if (assignedBy) {
                const adminExists = await prisma.admin.findUnique({
                    where: { id: assignedBy }
                });
                if (!adminExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid admin ID provided'
                    });
                }
            }
            const newFieldEngineer = await prisma.fieldEngineer.create({
                data: {
                    name,
                    employeeId,
                    email,
                    password, // Note: In production, this should be hashed
                    phone: phone || null,
                    teamId: teamId || null,
                    isTeamLeader: isTeamLeader || false,
                    assignedBy: assignedBy || null
                },
                select: {
                    id: true,
                    name: true,
                    employeeId: true,
                    email: true,
                    phone: true,
                    teamId: true,
                    isTeamLeader: true,
                    assignedBy: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            res.status(201).json({
                success: true,
                data: newFieldEngineer,
                message: 'Field engineer created successfully'
            });
        }
        catch (error) {
            console.error('Error creating field engineer:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create field engineer',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            });
        }
    }
}
