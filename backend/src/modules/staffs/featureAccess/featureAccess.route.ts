import { Router, Request, Response } from 'express'
import { authenticateToken } from '../../../middleware/auth.middleware'
import {
  getMyFeatures,
  getAllStaffFeatureAccess,
  getStaffFeatureAccess,
  updateStaffFeatureAccess,
  grantFeatureAccess,
  revokeFeatureAccess
} from './featureAccess.controller'

const router = Router()

// Staff routes - Get my allowed features
router.get('/my-features', authenticateToken, (req: Request, res: Response) => {
  return getMyFeatures(req, res)
})

// Admin routes - Manage staff feature access
router.get('/staff', authenticateToken, (req: Request, res: Response) => {
  return getAllStaffFeatureAccess(req, res)
})

router.get('/staff/:employeeId', authenticateToken, (req: Request, res: Response) => {
  return getStaffFeatureAccess(req, res)
})

router.put('/staff/:employeeId', authenticateToken, (req: Request, res: Response) => {
  return updateStaffFeatureAccess(req, res)
})

router.post('/staff/:employeeId/grant', authenticateToken, (req: Request, res: Response) => {
  return grantFeatureAccess(req, res)
})

router.post('/staff/:employeeId/revoke', authenticateToken, (req: Request, res: Response) => {
  return revokeFeatureAccess(req, res)
})

export default router
