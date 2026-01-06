import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { sessionService } from './session.service'

class AuthService {
  async authenticate(email: string, password: string, employeeId?: string, adminId?: string, userType?: string, deviceInfo?: string, ipAddress?: string) {
    try {
      if (userType === 'admin') {
        const admin = await prisma.admin.findFirst({
          where: { 
            AND: [
              { email },
              { adminId }
            ]
          }
        })

        if (!admin || !await bcrypt.compare(password, admin.password)) {
          return null
        }

        // Create session for admin
        const session = await sessionService.createSession(admin.id, 'ADMIN', deviceInfo, ipAddress)

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          adminId: admin.adminId,
          userType: 'admin',
          sessionToken: session.sessionToken
        }
      } else if (userType === 'employee') {
        if (!employeeId) {
          return null
        }

        const employee = await prisma.fieldEngineer.findFirst({
          where: { 
            AND: [
              { email },
              { employeeId }
            ]
          }
        })

        if (!employee || password !== employee.password) {
          return null
        }

        // Create session for employee
        const session = await sessionService.createSession(employee.id, 'EMPLOYEE', deviceInfo, ipAddress)

        return {
          id: employee.id,
          email: employee.email,
          name: employee.name,
          employeeId: employee.employeeId,
          userType: 'employee',
          sessionToken: session.sessionToken
        }
      }

      return null
    } catch (error) {
      console.error('Authentication error:', error)
      return null
    }
  }

  async registerAdmin(name: string, adminId: string, email: string, password: string, phone?: string) {
    try {
      // Check if admin already exists
      const existingAdmin = await prisma.admin.findFirst({
        where: {
          OR: [
            { email },
            { adminId }
          ]
        }
      })

      if (existingAdmin) {
        if (existingAdmin.email === email) {
          throw new Error('Admin with this email already exists')
        }
        if (existingAdmin.adminId === adminId) {
          throw new Error('Admin with this ID already exists')
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create admin
      const admin = await prisma.admin.create({
        data: {
          name,
          adminId,
          email,
          password: hashedPassword,
          phone
        }
      })

      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        adminId: admin.adminId,
        userType: 'admin'
      }
    } catch (error) {
      console.error('Admin registration error:', error)
      throw error
    }
  }

  async registerEmployee(name: string, employeeId: string, email: string, password: string, phone?: string, teamId?: string) {
    try {
      // Check if employee already exists
      const existingEmployee = await prisma.fieldEngineer.findFirst({
        where: {
          OR: [
            { email },
            { employeeId }
          ]
        }
      })

      if (existingEmployee) {
        if (existingEmployee.email === email) {
          throw new Error('Employee with this email already exists')
        }
        if (existingEmployee.employeeId === employeeId) {
          throw new Error('Employee with this ID already exists')
        }
      }

      // Create employee (password is stored as plain text for now)
      const employee = await prisma.fieldEngineer.create({
        data: {
          name,
          employeeId,
          email,
          password, // Store as plain text for now
          phone,
          teamId
        }
      })

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        userType: 'employee'
      }
    } catch (error) {
      console.error('Employee registration error:', error)
      throw error
    }
  }
}

export const authService = new AuthService()