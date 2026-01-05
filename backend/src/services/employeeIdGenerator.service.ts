import { prisma } from '../lib/prisma'

export class EmployeeIdGeneratorService {
  /**
   * Generate the next available employee ID in format EMP001, EMP002, etc.
   */
  static async generateNextEmployeeId(): Promise<string> {
    try {
      // Get all existing employee IDs that match the EMP pattern
      const existingEmployees = await prisma.fieldEngineer.findMany({
        select: {
          employeeId: true
        },
        where: {
          employeeId: {
            startsWith: 'EMP'
          }
        },
        orderBy: {
          employeeId: 'desc'
        }
      })

      // Extract numeric parts and find the highest number
      let highestNumber = 0
      
      for (const employee of existingEmployees) {
        const match = employee.employeeId.match(/^EMP(\d+)$/)
        if (match) {
          const number = parseInt(match[1], 10)
          if (number > highestNumber) {
            highestNumber = number
          }
        }
      }

      // Generate next ID
      const nextNumber = highestNumber + 1
      const nextId = `EMP${nextNumber.toString().padStart(3, '0')}`

      return nextId
    } catch (error) {
      console.error('Error generating employee ID:', error)
      throw new Error('Failed to generate employee ID')
    }
  }

  /**
   * Check if an employee ID is available
   */
  static async isEmployeeIdAvailable(employeeId: string): Promise<boolean> {
    try {
      const existingEmployee = await prisma.fieldEngineer.findUnique({
        where: {
          employeeId: employeeId
        }
      })

      return !existingEmployee
    } catch (error) {
      console.error('Error checking employee ID availability:', error)
      throw new Error('Failed to check employee ID availability')
    }
  }

  /**
   * Validate employee ID format
   */
  static validateEmployeeIdFormat(employeeId: string): boolean {
    const pattern = /^EMP\d{3}$/
    return pattern.test(employeeId)
  }

  /**
   * Get the next few available employee IDs (for preview)
   */
  static async getNextAvailableIds(count: number = 5): Promise<string[]> {
    try {
      const nextId = await this.generateNextEmployeeId()
      const baseNumber = parseInt(nextId.substring(3), 10)
      
      const ids: string[] = []
      for (let i = 0; i < count; i++) {
        const number = baseNumber + i
        ids.push(`EMP${number.toString().padStart(3, '0')}`)
      }

      return ids
    } catch (error) {
      console.error('Error getting next available IDs:', error)
      throw new Error('Failed to get next available IDs')
    }
  }
}