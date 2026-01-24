import { Router } from 'express'
import { getAllAdmins, getAdminById, updateAdmin, resetAdminCredentials } from '../controllers/admin.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { adminOnly } from '../middleware/adminOnly.middleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Apply admin-only middleware to all routes
router.use(adminOnly)

// Get all admins
router.get('/', getAllAdmins)

// Get admin by ID
router.get('/:id', getAdminById)

// Update admin
router.put('/:id', updateAdmin)

// Reset admin credentials (ID, Email, Password)
router.put('/:id/reset-credentials', resetAdminCredentials)

export default router