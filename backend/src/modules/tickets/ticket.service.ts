import { PrismaClient, TicketCategory, TicketPriority, TicketStatus, TicketHistoryAction } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '../notifications/notification.service';

interface CreateTicketInput {
  title: string;
  description: string;
  category: TicketCategory;
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
  title?: string;
  description?: string;
  category?: TicketCategory;
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
        select: { id: true, name: true, email: true }
      });

      if (admin) {
        console.log('Found admin reporter:', admin.id);
        // For admin reporters, we'll set reporterId to null and store admin info in custom fields
        // This avoids the foreign key constraint issue
        reporterId = null;
      } else {
        console.log('Neither employee nor admin found. Available admins:');
        const allAdmins = await this.prisma.admin.findMany({
          select: { adminId: true, name: true }
        });
        console.log('Admins:', allAdmins);
        
        console.log('Available employees:');
        const allEmployees = await this.prisma.employee.findMany({
          select: { employeeId: true, name: true }
        });
        console.log('Employees:', allEmployees);
        
        // Instead of throwing an error, let's create the ticket without a reporter
        // This allows the system to work even if there's a mismatch
        console.log('Creating ticket without reporter (system ticket)');
        reporterId = null;
      }
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketId,
        title: data.title,
        description: data.description,
        category: data.category,
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
      // For admin reporters, we need to find an admin ID to use as uploader
      let uploaderId = reporterId;
      
      if (!uploaderId) {
        // This is an admin reporter, find the admin ID
        const admin = await this.prisma.admin.findUnique({
          where: { adminId: data.reporterId },
          select: { id: true }
        });
        
        if (admin) {
          // Create a system employee record for admin uploads if it doesn't exist
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
          
          uploaderId = systemEmployee.id;
        }
      }

      if (uploaderId) {
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
        message: `New ${data.priority.toLowerCase()} priority ticket "${data.title}" has been created by ${ticket.reporter?.name || 'Unknown User'}.`,
        data: {
          ticketId: ticket.ticketId,
          title: data.title,
          priority: data.priority,
          category: data.category,
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
    category?: TicketCategory;
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

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.reporterId) {
      where.reporterId = filters.reporterId;
    }

    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { ticketId: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const tickets = await this.prisma.supportTicket.findMany({
      where,
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
        select: { id: true }
      });
      
      if (admin) {
        // For admin users, we need to create or find a system employee record
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
        
        internalUserId = systemEmployee.id;
      }
    }

    if (!internalUserId) {
      throw new Error(`User not found: ${changedBy}`);
    }

    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
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

  async getTicketCount(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
  }): Promise<number> {
    try {
      const whereClause: any = {};

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.priority) {
        whereClause.priority = filters.priority;
      }

      if (filters?.category) {
        whereClause.category = filters.category;
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
