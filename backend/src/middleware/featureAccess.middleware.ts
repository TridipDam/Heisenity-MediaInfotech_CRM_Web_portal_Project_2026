import { Request, Response, NextFunction } from 'express'
import { FeatureAccessService } from '../modules/staffs/featureAccess/featureAccess.service'
import { StaffPortalFeature } from '@prisma/client'

/**
 * Middleware to check if staff has access to a specific feature
 */
export const requireFeatureAccess = (feature: StaffPortalFeature) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const employeeId = (req as any).user?.id
      const userType = (req as any).user?.userType

      // Allow admins to bypass feature checks
      if (userType === 'ADMIN') {
        return next()
      }

      if (!employeeId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        })
      }

      const hasAccess = await FeatureAccessService.hasFeatureAccess(employeeId, feature)

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: `Access denied. You don't have permission to access ${feature} feature.`
        })
      }

      next()
    } catch (error) {
      console.error('Error checking feature access:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to verify feature access'
      })
    }
  }
}
