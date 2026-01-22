import { Router } from 'express'
import { authController } from '../controllers/auth.controller'

const router = Router()

router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.post('/logout-all', authController.logoutAll)
router.get('/sessions/:userId', authController.getSessions)
// Admin registration removed - admin credentials are now hardcoded

export { router as authRouter }