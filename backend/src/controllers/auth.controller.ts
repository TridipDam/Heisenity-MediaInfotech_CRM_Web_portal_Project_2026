import { Request, Response } from 'express'
import { authService } from '../services/auth.service'
import { sessionService } from '../services/session.service'

class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password, employeeId, adminId, userType } = req.body

      console.log('Login attempt:', { email, employeeId, adminId, userType })

      if (!email || !password || !userType) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      if (userType?.toLowerCase() === 'employee' && !employeeId) {
        return res.status(400).json({ error: 'Employee ID is required for employee login' })
      }

      if (userType?.toLowerCase() === 'admin' && !adminId) {
        return res.status(400).json({ error: 'Admin ID is required for admin login' })
      }

      // Get device info and IP
      const deviceInfo = req.headers['user-agent']
      const ipAddress = req.ip || req.connection.remoteAddress

      const user = await authService.authenticate(email, password, employeeId, adminId, userType, deviceInfo, ipAddress)

      if (!user) {
        console.log('Authentication failed for:', { email, employeeId, adminId, userType })
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      console.log('Authentication successful for:', { email, userType, userId: user.id })
      res.json(user)
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const { sessionToken } = req.body

      if (!sessionToken) {
        return res.status(400).json({ error: 'Session token is required' })
      }

      await sessionService.invalidateSession(sessionToken)
      res.json({ message: 'Logged out successfully' })
    } catch (error) {
      console.error('Logout error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  async logoutAll(req: Request, res: Response) {
    try {
      const { userId, userType } = req.body

      if (!userId || !userType) {
        return res.status(400).json({ error: 'User ID and user type are required' })
      }

      await sessionService.invalidateAllUserSessions(userId, userType.toUpperCase())
      res.json({ message: 'Logged out from all devices successfully' })
    } catch (error) {
      console.error('Logout all error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  async getSessions(req: Request, res: Response) {
    try {
      const { userId } = req.params
      const { userType } = req.query

      if (!userId || !userType) {
        return res.status(400).json({ error: 'User ID and user type are required' })
      }

      const sessions = await sessionService.getActiveSessions(userId, userType.toString().toUpperCase() as 'ADMIN' | 'EMPLOYEE')
      res.json(sessions)
    } catch (error) {
      console.error('Get sessions error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  async registerAdmin(req: Request, res: Response) {
    try {
      const { name, adminId, email, password, phone } = req.body

      if (!name || !adminId || !email || !password) {
        return res.status(400).json({ error: 'Name, admin ID, email, and password are required' })
      }

      const user = await authService.registerAdmin(name, adminId, email, password, phone)
      res.status(201).json(user)
    } catch (error: any) {
      console.error('Admin registration error:', error)
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message })
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  // Employee registration disabled for public access
  // This method is kept for potential admin-only employee creation in the future
  /*
  async registerEmployee(req: Request, res: Response) {
    try {
      const { name, employeeId, email, password, phone, teamId } = req.body

      if (!name || !employeeId || !email || !password) {
        return res.status(400).json({ error: 'Name, employee ID, email, and password are required' })
      }

      const user = await authService.registerEmployee(name, employeeId, email, password, phone, teamId)
      res.status(201).json(user)
    } catch (error: any) {
      console.error('Employee registration error:', error)
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message })
      }
      res.status(500).json({ error: 'Internal server error' })
    }
  }
  */
}

export const authController = new AuthController()