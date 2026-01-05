import { Request, Response } from 'express'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Generate next employee ID
export const generateEmployeeId = async (): Promise<string> => {
  try {
    // Get the latest employee by employeeId
    const latestEmployee = await prisma.fieldEngineer.findFirst({
      orderBy: {
        employeeId: 'desc'
      }
    })

    if (!latestEmployee) {
      return 'EMP001'
    }

    // Extract number from employeeId (e.g., EMP001 -> 001)
    const currentNumber = parseInt(latestEmployee.employeeId.replace('EMP', ''))
    const nextNumber = currentNumber + 1
    
    // Format with leading zeros (e.g., 2 -> 002)
    return `EMP${nextNumber.toString().padStart(3, '0')}`
  } catch (error) {
    console.error('Error generating employee ID:', error)
    throw new Error('Failed to generate employee ID')
  }
}

// Get all employees
export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', search, status } = req.query

    const pageNum = parseInt(page as string) || 1
    const limitNum = parseInt(limit as string) || 50
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string } },
        { employeeId: { contains: search as string } },
        { email: { contains: search as string } }
      ]
    }

    if (status) {
      whereClause.status = status
    }

    const employees = await prisma.fieldEngineer.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum,
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
        updatedAt: true,
        assignedBy: true
      }
    })

    // Get total count for pagination
    const totalCount = await prisma.fieldEngineer.count({
      where: whereClause
    })

    return res.status(200).json({
      success: true,
      data: {
        employees,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      }
    })
  } catch (error) {
    console.error('Error getting employees:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get employees'
    })
  }
}

// Create new employee
export const createEmployee = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, teamId, isTeamLeader = false, assignedBy, password } = req.body

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      })
    }

    // Check if email already exists
    const existingEmployee = await prisma.fieldEngineer.findUnique({
      where: { email }
    })

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        error: 'Employee with this email already exists'
      })
    }

    // Generate employee ID
    const employeeId = await generateEmployeeId()

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create employee
    const employee = await prisma.fieldEngineer.create({
      data: {
        name,
        employeeId,
        email,
        password: hashedPassword,
        phone: phone || null,
        teamId: teamId || null,
        isTeamLeader: Boolean(isTeamLeader),
        assignedBy: assignedBy || null,
        status: 'ACTIVE'
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
    })

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    })
  } catch (error) {
    console.error('Error creating employee:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create employee'
    })
  }
}

// Update employee
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, email, phone, teamId, isTeamLeader, status, password } = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      })
    }

    // Check if employee exists
    const existingEmployee = await prisma.fieldEngineer.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      })
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingEmployee.email) {
      const emailExists = await prisma.fieldEngineer.findUnique({
        where: { email }
      })

      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Employee with this email already exists'
        })
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (teamId !== undefined) updateData.teamId = teamId
    if (isTeamLeader !== undefined) updateData.isTeamLeader = Boolean(isTeamLeader)
    if (status) updateData.status = status
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Update employee
    const updatedEmployee = await prisma.fieldEngineer.update({
      where: { id },
      data: updateData,
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
    })

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee
    })
  } catch (error) {
    console.error('Error updating employee:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update employee'
    })
  }
}

// Delete employee
export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      })
    }

    // Check if employee exists
    const existingEmployee = await prisma.fieldEngineer.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      })
    }

    // Delete employee (this will cascade delete related records)
    await prisma.fieldEngineer.delete({
      where: { id }
    })

    return res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete employee'
    })
  }
}

// Get employee by ID
export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      })
    }

    const employee = await prisma.fieldEngineer.findUnique({
      where: { id },
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
        updatedAt: true,
        assignedBy: true
      }
    })

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: employee
    })
  } catch (error) {
    console.error('Error getting employee:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get employee'
    })
  }
}

// Get next employee ID (for preview)
export const getNextEmployeeId = async (req: Request, res: Response) => {
  try {
    const nextId = await generateEmployeeId()
    
    return res.status(200).json({
      success: true,
      data: { nextEmployeeId: nextId }
    })
  } catch (error) {
    console.error('Error getting next employee ID:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get next employee ID'
    })
  }
}