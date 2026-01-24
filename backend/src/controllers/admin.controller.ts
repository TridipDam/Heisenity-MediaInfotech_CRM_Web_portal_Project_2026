import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../utils/hash'

// Get all admins
export const getAllAdmins = async (req: Request, res: Response) => {
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
        { adminId: { contains: search as string } },
        { email: { contains: search as string } }
      ]
    }

    if (status) {
      whereClause.status = status
    }

    const admins = await prisma.admin.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum,
      select: {
        id: true,
        name: true,
        adminId: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Get total count for pagination
    const totalCount = await prisma.admin.count({
      where: whereClause
    })

    return res.status(200).json({
      success: true,
      data: admins,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    })
  } catch (error) {
    console.error('Error getting admins:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get admins'
    })
  }
}

// Get admin by ID
export const getAdminById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID is required'
      })
    }

    const admin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        adminId: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: admin
    })
  } catch (error) {
    console.error('Error getting admin:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get admin'
    })
  }
}

// Update admin
export const updateAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, email, phone, status } = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID is required'
      })
    }

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id }
    })

    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      })
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingAdmin.email) {
      const emailExists = await prisma.admin.findUnique({
        where: { email }
      })

      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Admin with this email already exists'
        })
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (status) updateData.status = status

    // Update admin
    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        adminId: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: updatedAdmin
    })
  } catch (error) {
    console.error('Error updating admin:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update admin'
    })
  }
}

// Reset admin credentials (ID, Email, Password)
export const resetAdminCredentials = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { newAdminId, newEmail, newPassword, confirmPassword } = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID is required'
      })
    }

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        adminId: true,
        email: true
      }
    })

    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      })
    }

    // Validate inputs
    const updateData: any = {}
    let hasChanges = false

    // Validate and update Admin ID
    if (newAdminId && newAdminId !== existingAdmin.adminId) {
      if (newAdminId.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Admin ID must be at least 3 characters long'
        })
      }

      // Check if new admin ID already exists
      const adminIdExists = await prisma.admin.findUnique({
        where: { adminId: newAdminId }
      })

      if (adminIdExists) {
        return res.status(400).json({
          success: false,
          error: 'Admin ID already exists'
        })
      }

      updateData.adminId = newAdminId
      hasChanges = true
    }

    // Validate and update Email
    if (newEmail && newEmail !== existingAdmin.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        })
      }

      // Check if new email already exists
      const emailExists = await prisma.admin.findUnique({
        where: { email: newEmail }
      })

      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        })
      }

      updateData.email = newEmail
      hasChanges = true
    }

    // Validate and update Password
    if (newPassword) {
      if (!confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Password confirmation is required'
        })
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Passwords do not match'
        })
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        })
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword)
      updateData.password = hashedPassword
      hasChanges = true
    }

    if (!hasChanges) {
      return res.status(400).json({
        success: false,
        error: 'No changes provided'
      })
    }

    // Update admin credentials
    updateData.updatedAt = new Date()
    
    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        adminId: true,
        email: true,
        updatedAt: true
      }
    })

    // Build response message
    const changes = []
    if (updateData.adminId) changes.push('Admin ID')
    if (updateData.email) changes.push('Email')
    if (updateData.password) changes.push('Password')

    return res.status(200).json({
      success: true,
      message: `${changes.join(', ')} updated successfully for ${existingAdmin.name}`,
      data: {
        adminId: updatedAdmin.adminId,
        adminName: updatedAdmin.name,
        email: updatedAdmin.email,
        updatedAt: updatedAdmin.updatedAt,
        changedFields: changes
      }
    })
  } catch (error) {
    console.error('Error resetting admin credentials:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset credentials'
    })
  }
}