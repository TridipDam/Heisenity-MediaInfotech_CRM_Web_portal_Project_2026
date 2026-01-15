import { prisma } from '../../../lib/prisma'
import { StaffPortalFeature } from '@prisma/client'

export class FeatureAccessService {
  /**
   * Get allowed features for a staff member (IN_OFFICE only)
   */
  static async getAllowedFeatures(employeeId: string): Promise<StaffPortalFeature[]> {
    try {
      // Check if employee is IN_OFFICE
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true }
      })

      // Feature access only applies to IN_OFFICE employees
      if (employee?.role !== 'IN_OFFICE') {
        return []
      }

      const accessRecords = await prisma.staffFeatureAccess.findMany({
        where: {
          employeeId,
          isAllowed: true
        },
        select: {
          feature: true
        }
      })

      return accessRecords.map(record => record.feature)
    } catch (error) {
      console.error('Error getting allowed features:', error)
      return []
    }
  }

  /**
   * Check if staff has access to a specific feature (IN_OFFICE only)
   */
  static async hasFeatureAccess(employeeId: string, feature: StaffPortalFeature): Promise<boolean> {
    try {
      // Check if employee is IN_OFFICE
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true }
      })

      // Feature access only applies to IN_OFFICE employees
      if (employee?.role !== 'IN_OFFICE') {
        return false
      }

      const access = await prisma.staffFeatureAccess.findUnique({
        where: {
          employeeId_feature: {
            employeeId,
            feature
          }
        }
      })

      return access?.isAllowed ?? false
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  /**
   * Grant feature access to staff
   */
  static async grantFeatureAccess(
    employeeId: string,
    feature: StaffPortalFeature,
    grantedBy: string
  ): Promise<void> {
    await prisma.staffFeatureAccess.upsert({
      where: {
        employeeId_feature: {
          employeeId,
          feature
        }
      },
      update: {
        isAllowed: true,
        updatedBy: grantedBy,
        updatedAt: new Date()
      },
      create: {
        employeeId,
        feature,
        isAllowed: true,
        grantedBy,
        grantedAt: new Date()
      }
    })
  }

  /**
   * Revoke feature access from staff
   */
  static async revokeFeatureAccess(
    employeeId: string,
    feature: StaffPortalFeature,
    revokedBy: string
  ): Promise<void> {
    await prisma.staffFeatureAccess.upsert({
      where: {
        employeeId_feature: {
          employeeId,
          feature
        }
      },
      update: {
        isAllowed: false,
        updatedBy: revokedBy,
        updatedAt: new Date()
      },
      create: {
        employeeId,
        feature,
        isAllowed: false,
        grantedBy: revokedBy,
        grantedAt: new Date()
      }
    })
  }

  /**
   * Update multiple features at once
   */
  static async updateFeatureAccess(
    employeeId: string,
    features: { feature: StaffPortalFeature; isAllowed: boolean }[],
    updatedBy: string
  ): Promise<void> {
    const operations = features.map(({ feature, isAllowed }) =>
      prisma.staffFeatureAccess.upsert({
        where: {
          employeeId_feature: {
            employeeId,
            feature
          }
        },
        update: {
          isAllowed,
          updatedBy,
          updatedAt: new Date()
        },
        create: {
          employeeId,
          feature,
          isAllowed,
          grantedBy: updatedBy,
          grantedAt: new Date()
        }
      })
    )

    await prisma.$transaction(operations)
  }

  /**
   * Get all staff with their feature access (IN_OFFICE only)
   */
  static async getAllStaffFeatureAccess() {
    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        role: 'IN_OFFICE' // Only IN_OFFICE employees
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        featureAccess: {
          select: {
            feature: true,
            isAllowed: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return employees.map(employee => ({
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      features: employee.featureAccess.reduce((acc, access) => {
        acc[access.feature] = access.isAllowed
        return acc
      }, {} as Record<StaffPortalFeature, boolean>)
    }))
  }

  /**
   * Get feature access for a specific staff member
   */
  static async getStaffFeatureAccess(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        featureAccess: {
          select: {
            feature: true,
            isAllowed: true,
            grantedBy: true,
            grantedAt: true,
            updatedBy: true,
            updatedAt: true
          }
        }
      }
    })

    if (!employee) {
      throw new Error('Employee not found')
    }

    return {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      features: employee.featureAccess.reduce((acc, access) => {
        acc[access.feature] = {
          isAllowed: access.isAllowed,
          grantedBy: access.grantedBy,
          grantedAt: access.grantedAt,
          updatedBy: access.updatedBy,
          updatedAt: access.updatedAt
        }
        return acc
      }, {} as Record<StaffPortalFeature, any>)
    }
  }
}
