import { PrismaClient, TicketPriority, TicketStatus, TicketHistoryAction } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '../notifications/notification.service';

interface CreateTicketInput {
  description: string;
  categoryId: string;
  priority: TicketPriority;
  department?: string;
  assigneeId?: string;
  reporterId: string;
  dueDate?: Date;
  estimatedHours?: number;
  tags?: string[];
  customerName?: string;
  customerId?: string;
  customerPhone?: string;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    filePath: string;
  }>;
}

interface UpdateTicketInput {
  description?: string;
  categoryId?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  department?: string;
  assigneeId?: string;
  dueDate?: Date;
  estimatedHours?: number;
  tags?: string[];
}

export class TicketService {
  public prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async generateTicketId(): Promise<string> {
    const lastTicket = await this.prisma.supportTicket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { ticketId: true }
    });

    if (!lastTicket) {
      return 'TKT-001';
    }

    const lastNumber = parseInt(lastTicket.ticketId.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `TKT-${String(newNumber).padStart(3, '0')}`;
  }

  async createTicket(data: CreateTicketInput, changedBy: string) {
    const ticketId = await this.generateTicketId();

    console.log('Creating ticket with reporterId:', data.reporterId);
    console.log('ChangedBy:', changedBy);

    let reporterId: string | null = null;

    // Check if reporter is an employee first
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId: data.reporterId },
      select: { id: true }
    });

    if (employee) {
      console.log('Found employee reporter:', employee.id);
      reporterId = employee.id;
    } else {
      console.log('Employee not found, checking admin...');
      // Check if reporter is an admin
      const admin = await this.prisma.admin.findUnique({
        where: { adminId: data.reporterId },
        select: { id: true, name: true, email: true, adminId: true }
      });

      if (admin) {
        console.log('Found admin reporter:', admin.id, admin.name);
        
        // Create or find an employee record for this specific admin
        const adminEmployeeId = `ADMIN_${admin.adminId}`;
        let adminEmployee = await this.prisma.employee.findUnique({
          where: { employeeId: adminEmployeeId },
          select: { id: true, name: true }
        });
        
        if (!adminEmployee) {
          // Create an employee record for this admin with their actual details
          adminEmployee = await this.prisma.employee.create({
            data: {
              name: `${admin.name} (Admin)`, // Add (Admin) suffix to distinguish
              employeeId: adminEmployeeId,
              email: admin.email,
              password: 'N/A', // Admins don't use employee login
              role: 'IN_OFFICE',
              status: 'ACTIVE'
            },
            select: { id: true, name: true }
          });
          console.log('Created admin employee record:', adminEmployee.id, adminEmployee.name);
        } else {
          // Update existing record to ensure it has the correct name
          adminEmployee = await this.prisma.employee.update({
            where: { employeeId: adminEmployeeId },
            data: {
              name: `${admin.name} (Admin)`,
              email: admin.email
            },
            select: { id: true, name: true }
          });
          console.log('Updated admin employee record:', adminEmployee.id, adminEmployee.name);
        }
        
        reporterId = adminEmployee.id;
      } else {
        console.log('Neither employee nor admin found for reporterId:', data.reporterId);
        reporterId = null;
      }
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketId,
        description: data.description,
        categoryId: data.categoryId,
        priority: data.priority,
        department: data.department,
        assigneeId: data.assigneeId,
        reporterId: reporterId, // This will be null for admin reporters or unknown users
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        // Customer information
        customerName: data.customerName,
        customerId: data.customerId,
        customerPhone: data.customerPhone,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        }
      }
    });

    // Create attachments if provided
    if (data.attachments && data.attachments.length > 0) {
      // Use the same reporterId we found above for uploads
      let uploaderId = reporterId;
      
      if (!uploaderId) {
        // If no reporter was found, create a generic system employee
        let systemEmployee = await this.prisma.employee.findUnique({
          where: { employeeId: 'SYSTEM' },
          select: { id: true }
        });
        
        if (!systemEmployee) {
          systemEmployee = await this.prisma.employee.create({
            data: {
              name: 'System',
              employeeId: 'SYSTEM',
              email: 'system@local',
              password: 'N/A',
              role: 'IN_OFFICE',
              status: 'ACTIVE'
            },
            select: { id: true }
          });
        }
        
        uploaderId = systemEmployee.id;
      }

      await this.prisma.ticketAttachment.createMany({
        data: data.attachments.map(attachment => ({
          ticketId: ticket.id,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          uploadedBy: uploaderId,
        }))
      });
    }

    // Create history entry - find changedBy employee or admin
    let changedByEmployeeId: string | null = null;
    
    const changedByEmployee = await this.prisma.employee.findUnique({
      where: { employeeId: changedBy },
      select: { id: true }
    });

    if (changedByEmployee) {
      changedByEmployeeId = changedByEmployee.id;
    } else {
      // Check if changedBy is an admin
      const changedByAdmin = await this.prisma.admin.findUnique({
        where: { adminId: changedBy },
        select: { id: true }
      });

      if (changedByAdmin) {
        // Use the system employee for admin actions
        let systemEmployee = await this.prisma.employee.findUnique({
          where: { employeeId: 'ADMIN_SYSTEM' },
          select: { id: true }
        });
        
        if (!systemEmployee) {
          systemEmployee = await this.prisma.employee.create({
            data: {
              name: 'Admin System',
              employeeId: 'ADMIN_SYSTEM',
              email: 'admin@system.local',
              password: 'N/A',
              role: 'IN_OFFICE',
              status: 'ACTIVE'
            },
            select: { id: true }
          });
        }
        
        changedByEmployeeId = systemEmployee.id;
      }
    }

    if (changedByEmployeeId) {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: TicketHistoryAction.CREATED,
          changedBy: changedByEmployeeId,
        }
      });
    }

    // Create notification for new ticket
    try {
      const notificationService = new NotificationService();
      await notificationService.createAdminNotification({
        type: 'TASK_COMPLETED', // Using existing type, could add TICKET_CREATED if needed
        title: 'New Support Ticket Created',
        message: `New ${data.priority.toLowerCase()} priority ticket "${data.description.substring(0, 50)}..." has been created by ${ticket.reporter?.name || 'Unknown User'}.`,
        data: {
          ticketId: ticket.ticketId,
          description: data.description,
          priority: data.priority,
          categoryId: data.categoryId,
          reporterId: data.reporterId,
          reporterName: ticket.reporter?.name || 'Unknown User',
          assigneeId: data.assigneeId,
          assigneeName: ticket.assignee?.name,
          createdAt: new Date().toISOString()
        }
      });
    } catch (notificationError) {
      console.error('Failed to create ticket notification:', notificationError);
      // Don't fail ticket creation if notification fails
    }

    return ticket;
  }

  async getTickets(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    categoryId?: string;
    reporterId?: string;
    assigneeId?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.reporterId) {
      where.reporterId = filters.reporterId;
    }

    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters?.search) {
      where.OR = [
        { ticketId: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            filePath: true,
            uploadedAt: true,
          }
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // For tickets where reporter is null (admin reporters), fetch admin data separately
    const ticketsWithReporterInfo = await Promise.all(
      tickets.map(async (ticket) => {
        if (!ticket.reporter && !ticket.reporterId) {
          // This is an admin-created ticket, we need to find the admin who created it
          // We'll look in the ticket history for the creation event
          const creationHistory = await this.prisma.ticketHistory.findFirst({
            where: {
              ticketId: ticket.id,
              action: 'CREATED'
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  employeeId: true,
                  email: true,
                }
              }
            }
          });

          if (creationHistory && creationHistory.user) {
            return {
              ...ticket,
              reporter: creationHistory.user
            };
          }

          // Fallback: create a generic admin reporter info
          return {
            ...ticket,
            reporter: {
              id: 'admin-system',
              name: 'Admin User',
              employeeId: 'ADMIN',
              email: 'admin@system.local',
            }
          };
        }
        return ticket;
      })
    );

    return ticketsWithReporterInfo;
  }

  async getTicketById(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                employeeId: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                employeeId: true,
              }
            }
          },
          orderBy: { uploadedAt: 'desc' }
        },
        history: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                employeeId: true,
              }
            }
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!ticket) {
      return null;
    }

    // If reporter is null (admin reporter), try to get admin info from history
    if (!ticket.reporter && !ticket.reporterId) {
      const creationHistory = await this.prisma.ticketHistory.findFirst({
        where: {
          ticketId: ticket.id,
          action: 'CREATED'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              email: true,
            }
          }
        }
      });

      if (creationHistory && creationHistory.user) {
        return {
          ...ticket,
          reporter: creationHistory.user
        };
      }

      // Fallback: create a generic admin reporter info
      return {
        ...ticket,
        reporter: {
          id: 'admin-system',
          name: 'Admin User',
          employeeId: 'ADMIN',
          email: 'admin@system.local',
        }
      };
    }

    return ticket;
  }

  async updateTicket(id: string, data: UpdateTicketInput, changedBy: string) {
    const existingTicket = await this.prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!existingTicket) {
      throw new Error('Ticket not found');
    }

    // Find the internal user ID from the display ID (employeeId or adminId)
    let internalUserId: string | null = null;
    
    // First try to find as employee
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId: changedBy },
      select: { id: true }
    });
    
    if (employee) {
      internalUserId = employee.id;
    } else {
      // If not found as employee, try as admin
      const admin = await this.prisma.admin.findUnique({
        where: { adminId: changedBy },
        select: { id: true, name: true, email: true, adminId: true }
      });
      
      if (admin) {
        // Create or find an employee record for this specific admin
        const adminEmployeeId = `ADMIN_${admin.adminId}`;
        let adminEmployee = await this.prisma.employee.findUnique({
          where: { employeeId: adminEmployeeId },
          select: { id: true }
        });
        
        if (!adminEmployee) {
          // Create an employee record for this admin with their actual details
          adminEmployee = await this.prisma.employee.create({
            data: {
              name: `${admin.name} (Admin)`,
              employeeId: adminEmployeeId,
              email: admin.email,
              password: 'N/A', // Admins don't use employee login
              role: 'IN_OFFICE',
              status: 'ACTIVE'
            },
            select: { id: true }
          });
        } else {
          // Update existing record to ensure it has the correct name
          await this.prisma.employee.update({
            where: { employeeId: adminEmployeeId },
            data: {
              name: `${admin.name} (Admin)`,
              email: admin.email
            }
          });
        }
        
        internalUserId = adminEmployee.id;
      }
    }

    if (!internalUserId) {
      throw new Error(`User not found: ${changedBy}`);
    }

    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        description: data.description,
        categoryId: data.categoryId,
        priority: data.priority,
        status: data.status,
        department: data.department,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
        resolvedAt: data.status === TicketStatus.RESOLVED ? new Date() : undefined,
        closedAt: data.status === TicketStatus.CLOSED ? new Date() : undefined,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        }
      }
    });

    // Create history entries for changes using the internal user ID
    if (data.status && data.status !== existingTicket.status) {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId: id,
          action: TicketHistoryAction.STATUS_CHANGED,
          field: 'status',
          oldValue: existingTicket.status,
          newValue: data.status,
          changedBy: internalUserId,
        }
      });
    }

    if (data.priority && data.priority !== existingTicket.priority) {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId: id,
          action: TicketHistoryAction.PRIORITY_CHANGED,
          field: 'priority',
          oldValue: existingTicket.priority,
          newValue: data.priority,
          changedBy: internalUserId,
        }
      });
    }

    if (data.assigneeId && data.assigneeId !== existingTicket.assigneeId) {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId: id,
          action: TicketHistoryAction.ASSIGNED,
          field: 'assigneeId',
          oldValue: existingTicket.assigneeId || '',
          newValue: data.assigneeId,
          changedBy,
        }
      });
    }

    return ticket;
  }

  async deleteTicket(id: string) {
    await this.prisma.supportTicket.delete({
      where: { id }
    });
  }

  async addComment(ticketId: string, authorId: string, content: string, isInternal: boolean = false) {
    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId,
        authorId,
        content,
        isInternal,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          }
        }
      }
    });

    // Create history entry
    await this.prisma.ticketHistory.create({
      data: {
        ticketId,
        action: TicketHistoryAction.COMMENTED,
        changedBy: authorId,
      }
    });

    return comment;
  }

  // Utility method to fix existing admin tickets that show "Admin System"
  async fixExistingAdminTickets() {
    try {
      console.log('Starting comprehensive ticket reporter fix...');
      
      // Step 1: Find and fix generic "ADMIN_SYSTEM" employee
      const adminSystemEmployee = await this.prisma.employee.findUnique({
        where: { employeeId: 'ADMIN_SYSTEM' },
        select: { id: true }
      });

      let fixedCount = 0;

      if (adminSystemEmployee) {
        // Update the generic admin system to have a better name
        await this.prisma.employee.update({
          where: { employeeId: 'ADMIN_SYSTEM' },
          data: {
            name: 'System Administrator',
          }
        });

        // Count tickets using this generic admin
        const genericAdminTickets = await this.prisma.supportTicket.count({
          where: { reporterId: adminSystemEmployee.id }
        });
        
        fixedCount += genericAdminTickets;
        console.log(`Updated ${genericAdminTickets} tickets using generic ADMIN_SYSTEM`);
      }

      // Step 2: Find all tickets and ensure their reporters have proper names
      const allTickets = await this.prisma.supportTicket.findMany({
        include: {
          reporter: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              email: true
            }
          }
        }
      });

      console.log(`Found ${allTickets.length} total tickets to check`);

      // Step 3: Check for any admin-pattern employee IDs that need updating
      for (const ticket of allTickets) {
        if (ticket.reporter && ticket.reporter.employeeId.startsWith('ADMIN_')) {
          const adminId = ticket.reporter.employeeId.replace('ADMIN_', '');
          
          // Find the corresponding admin
          const admin = await this.prisma.admin.findUnique({
            where: { adminId: adminId },
            select: { name: true, email: true }
          });

          if (admin && ticket.reporter.name !== `${admin.name} (Admin)`) {
            // Update the employee record to have the correct admin name
            await this.prisma.employee.update({
              where: { id: ticket.reporter.id },
              data: {
                name: `${admin.name} (Admin)`,
                email: admin.email
              }
            });
            console.log(`Updated employee record for admin: ${admin.name}`);
          }
        }
      }

      // Step 4: Get summary of current state
      const reporterSummary = await this.prisma.supportTicket.groupBy({
        by: ['reporterId'],
        _count: {
          reporterId: true
        },
        where: {
          reporterId: {
            not: null
          }
        }
      });

      const reporterDetails = await Promise.all(
        reporterSummary.map(async (group) => {
          const employee = await this.prisma.employee.findUnique({
            where: { id: group.reporterId! },
            select: { employeeId: true, name: true }
          });
          return {
            employeeId: employee?.employeeId,
            name: employee?.name,
            ticketCount: group._count.reporterId
          };
        })
      );

      return { 
        fixed: fixedCount,
        totalTickets: allTickets.length,
        reporterSummary: reporterDetails,
        message: `Fixed ${fixedCount} tickets and updated reporter information` 
      };
    } catch (error) {
      console.error('Error fixing admin tickets:', error);
      throw error;
    }
  }

  async getTicketCount(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    categoryId?: string;
  }): Promise<number> {
    try {
      const whereClause: any = {};

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.priority) {
        whereClause.priority = filters.priority;
      }

      if (filters?.categoryId) {
        whereClause.categoryId = filters.categoryId;
      }

      const count = await this.prisma.supportTicket.count({
        where: whereClause
      });

      return count;
    } catch (error) {
      console.error('Error getting ticket count:', error);
      throw error;
    }
  }
}

export const ticketService = new TicketService();
