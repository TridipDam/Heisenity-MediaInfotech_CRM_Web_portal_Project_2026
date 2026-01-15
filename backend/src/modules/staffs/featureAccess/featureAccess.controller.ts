import { Request, Response } from 'express'
import { FeatureAccessService } from './featureAccess.service'
import { StaffPortalFeature } from '@prisma/client'

/**
 * Get allowed features for logged-in staff
 * GET /feature-access/my-features
 */
export const getMyFeatures = async (req: Request, res: Response) => {
  try {
    const employeeId = (req as any).user?.id

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    const allowedFeatures = await FeatureAccessService.getAllowedFeatures(employeeId)

    return res.status(200).json({
      success: true,
      data: {
        allowedFeatures
      }
    })
  } catch (error) {
    console.error('Error getting my features:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get features'
    })
  }
}

/**
 * Get all staff with their feature access (Admin only)
 * GET /feature-access/staff
 */
export const getAllStaffFeatureAccess = async (req: Request, res: Response) => {
  try {
    const staffList = await FeatureAccessService.getAllStaffFeatureAccess()

    return res.status(200).json({
      success: true,
      data: staffList
    })
  } catch (error) {
    console.error('Error getting staff feature access:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get staff feature access'
    })
  }
}

/**
 * Get feature access for a specific staff member (Admin only)
 * GET /feature-access/staff/:employeeId
 */
export const getStaffFeatureAccess = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      })
    }

    const staffAccess = await FeatureAccessService.getStaffFeatureAccess(employeeId)

    return res.status(200).json({
      success: true,
      data: staffAccess
    })
  } catch (error) {
    console.error('Error getting staff feature access:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get staff feature access'
    })
  }
}

/**
 * Update feature access for a staff member (Admin only)
 * PUT /feature-access/staff/:employeeId
 */
export const updateStaffFeatureAccess = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params
    const { features } = req.body
    const adminId = (req as any).user?.id

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      })
    }

    if (!features || !Array.isArray(features)) {
      return res.status(400).json({
        success: false,
        error: 'Features array is required'
      })
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    // Validate features
    const validFeatures = Object.values(StaffPortalFeature)
    for (const item of features) {
      if (!validFeatures.includes(item.feature)) {
        return res.status(400).json({
          success: false,
          error: `Invalid feature: ${item.feature}`
        })
      }
    }

    await FeatureAccessService.updateFeatureAccess(employeeId, features, adminId)

    return res.status(200).json({
      success: true,
      message: 'Feature access updated successfully'
    })
  } catch (error) {
    console.error('Error updating staff feature access:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update feature access'
    })
  }
}

/**
 * Grant feature access to staff (Admin only)
 * POST /feature-access/staff/:employeeId/grant
 */
export const grantFeatureAccess = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params
    const { feature } = req.body
    const adminId = (req as any).user?.id

    if (!employeeId || !feature) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID and feature are required'
      })
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    // Validate feature
    const validFeatures = Object.values(StaffPortalFeature)
    if (!validFeatures.includes(feature)) {
      return res.status(400).json({
        success: false,
        error: `Invalid feature: ${feature}`
      })
    }

    await FeatureAccessService.grantFeatureAccess(employeeId, feature, adminId)

    return res.status(200).json({
      success: true,
      message: 'Feature access granted successfully'
    })
  } catch (error) {
    console.error('Error granting feature access:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grant feature access'
    })
  }
}

/**
 * Revoke feature access from staff (Admin only)
 * POST /feature-access/staff/:employeeId/revoke
 */
export const revokeFeatureAccess = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params
    const { feature } = req.body
    const adminId = (req as any).user?.id

    if (!employeeId || !feature) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID and feature are required'
      })
    }

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    // Validate feature
    const validFeatures = Object.values(StaffPortalFeature)
    if (!validFeatures.includes(feature)) {
      return res.status(400).json({
        success: false,
        error: `Invalid feature: ${feature}`
      })
    }

    await FeatureAccessService.revokeFeatureAccess(employeeId, feature, adminId)

    return res.status(200).json({
      success: true,
      message: 'Feature access revoked successfully'
    })
  } catch (error) {
    console.error('Error revoking feature access:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke feature access'
    })
  }
}
