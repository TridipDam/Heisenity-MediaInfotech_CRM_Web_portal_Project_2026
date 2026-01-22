import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { sessionService } from './session.service'

class AuthService {
  async authenticate(email: string, password: string, employeeId?: string, adminId?: string, userType?: string, deviceInfo?: string, ipAddress?: string) {
    try {
      if (userType?.toLowerCase() === 'admin') {
        // Look for admin in database
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
          userType: 'ADMIN',
          sessionToken: session.sessionToken
        }
      } else if (userType?.toLowerCase() === 'employee') {
        console.log('Employee authentication attempt:', { email, employeeId, userType })
        
        if (!employeeId) {
          console.log('Employee authentication failed: No employeeId provided')
          return null
        }

        const employee = await prisma.employee.findFirst({
          where: { 
            AND: [
              { email },
              { employeeId }
            ]
          }
        })

        console.log('Employee found:', employee ? { id: employee.id, email: employee.email, employeeId: employee.employeeId } : 'No employee found')

        if (!employee) {
          console.log('Employee authentication failed: Employee not found')
          return null
        }

        const passwordMatch = await bcrypt.compare(password, employee.password)
        console.log('Password match:', passwordMatch)

        if (!passwordMatch) {
          console.log('Employee authentication failed: Password mismatch')
          return null
        }

        // Create session for employee
        const session = await sessionService.createSession(employee.id, 'EMPLOYEE', deviceInfo, ipAddress)

        console.log('Employee authentication successful:', { id: employee.id, employeeId: employee.employeeId })

        return {
          id: employee.id,
          email: employee.email,
          name: employee.name,
          employeeId: employee.employeeId,
          userType: 'EMPLOYEE',
          sessionToken: session.sessionToken
        }
      }

      return null
    } catch (error) {
      console.error('Authentication error:', error)
      return null
    }
  }

  async registerEmployee(name: string, employeeId: string, email: string, password: string, phone?: string, teamId?: string) {
    try {
      // Check if employee already exists
      const existingEmployee = await prisma.employee.findFirst({
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

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create employee
      const employee = await prisma.employee.create({
        data: {
          name,
          employeeId,
          email,
          password: hashedPassword, // Store hashed password
          phone,
          teamId
        }
      })

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        userType: 'EMPLOYEE'
      }
    } catch (error) {
      console.error('Employee registration error:', error)
      throw error
    }
  }
}

export const authService = new AuthService()