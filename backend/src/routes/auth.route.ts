import { Router } from 'express'
import { authController } from '../controllers/auth.controller'

const router = Router()

router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.post('/logout-all', authController.logoutAll)
router.get('/sessions/:userId', authController.getSessions)
router.post('/register/admin', authController.registerAdmin)
// Employee registration removed - employees should be created by admins only

export { router as authRouter }