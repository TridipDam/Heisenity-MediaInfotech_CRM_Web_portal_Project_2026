import { Request, Response } from 'express';
import { ticketService } from './ticket.service';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export class TicketController {
  async createTicket(req: Request, res: Response) {
    try {
      const {
        title,
        description,
        category,
        priority,
        department,
        assigneeId,
        reporterId,
        dueDate,
        estimatedHours,
        tags,
        customerName,
        customerId,
        customerPhone,
        attachments
      } = req.body;

      // Use authenticated user as reporter if not provided
      const authenticatedUser = (req as any).user;
      let finalReporterId = reporterId;
      
      if (!finalReporterId && authenticatedUser) {
        // For admin users, we need to look up their adminId from the database
        if (authenticatedUser.userType === 'ADMIN') {
          const admin = await ticketService.prisma.admin.findUnique({
            where: { id: authenticatedUser.id },
            select: { adminId: true }
          });
          finalReporterId = admin?.adminId;
        } else if (authenticatedUser.userType === 'EMPLOYEE') {
          const employee = await ticketService.prisma.employee.findUnique({
            where: { id: authenticatedUser.id },
            select: { employeeId: true }
          });
          finalReporterId = employee?.employeeId;
        } else {
          // Fallback to the internal ID
          finalReporterId = authenticatedUser.id;
        }
      }

      console.log('Controller - finalReporterId:', finalReporterId);
      console.log('Controller - authenticatedUser:', authenticatedUser);

      // Validate required fields
      if (!title || !description || !category || !priority || !finalReporterId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, description, category, priority, reporterId'
        });
      }

      const ticket = await ticketService.createTicket({
        title,
        description,
        category: category as TicketCategory,
        priority: priority as TicketPriority,
        department,
        assigneeId,
        reporterId: finalReporterId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        tags: tags || [],
        customerName,
        customerId,
        customerPhone,
        attachments: attachments || []
      }, finalReporterId); // Use the same finalReporterId for changedBy

      return res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create ticket',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getTickets(req: Request, res: Response) {
    try {
      const { status, priority, category, reporterId, assigneeId, search } = req.query;

      const tickets = await ticketService.getTickets({
        status: status as TicketStatus,
        priority: priority as TicketPriority,
        category: category as TicketCategory,
        reporterId: reporterId as string,
        assigneeId: assigneeId as string,
        search: search as string,
      });

      return res.status(200).json({
        success: true,
        data: tickets
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getMyTickets(req: Request, res: Response) {
    try {
      const { employeeId } = req.query;
      const authenticatedUserId = (req as any).user?.id;

      // Use employeeId from query or fall back to authenticated user
      let targetEmployeeId = employeeId as string;
      
      if (!targetEmployeeId && authenticatedUserId) {
        // If no employeeId provided, try to find the employee by internal ID
        const employee = await ticketService.prisma.employee.findUnique({
          where: { id: authenticatedUserId },
          select: { employeeId: true }
        });
        targetEmployeeId = employee?.employeeId || '';
      }

      if (!targetEmployeeId) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      // Find employee by employeeId to get the internal ID
      const employee = await ticketService.prisma.employee.findUnique({
        where: { employeeId: targetEmployeeId },
        select: { id: true }
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      const tickets = await ticketService.getTickets({
        reporterId: employee.id
      });

      return res.status(200).json({
        success: true,
        data: tickets
      });
    } catch (error) {
      console.error('Error fetching my tickets:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getTicketById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const ticket = await ticketService.getTicketById(id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        category,
        priority,
        status,
        department,
        assigneeId,
        dueDate,
        estimatedHours,
        tags,
        changedBy
      } = req.body;

      if (!changedBy) {
        return res.status(400).json({
          success: false,
          message: 'changedBy (employee ID) is required'
        });
      }

      const ticket = await ticketService.updateTicket(id, {
        title,
        description,
        category: category as TicketCategory,
        priority: priority as TicketPriority,
        status: status as TicketStatus,
        department,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        tags: tags || []
      }, changedBy);

      return res.status(200).json({
        success: true,
        message: 'Ticket updated successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update ticket',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await ticketService.deleteTicket(id);

      return res.status(200).json({
        success: true,
        message: 'Ticket deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete ticket',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async addComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content, isInternal, authorId } = req.body;

      if (!authorId) {
        return res.status(400).json({
          success: false,
          message: 'authorId (employee ID) is required'
        });
      }

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Comment content is required'
        });
      }

      const comment = await ticketService.addComment(id, authorId, content, isInternal || false);

      return res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add comment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async downloadAttachment(req: Request, res: Response) {
    try {
      const { attachmentId } = req.params;

      // Get attachment details from database
      const attachment = await ticketService.prisma.ticketAttachment.findUnique({
        where: { id: attachmentId },
        include: {
          ticket: {
            select: { id: true, ticketId: true }
          }
        }
      });

      if (!attachment) {
        return res.status(404).json({
          success: false,
          message: 'Attachment not found'
        });
      }

      // Check if file exists
      const fs = require('fs');
      const path = require('path');
      
      // Handle both customer support files and regular ticket files
      let filePath: string;
      if (attachment.filePath.startsWith('/uploads/customer-support/')) {
        filePath = path.join(__dirname, '../../../uploads/customer-support', path.basename(attachment.filePath));
      } else if (attachment.filePath.startsWith('/uploads/tickets/')) {
        filePath = path.join(__dirname, '../../../uploads/tickets', path.basename(attachment.filePath));
      } else {
        // Fallback - try to construct path from filePath
        filePath = path.join(__dirname, '../../..', attachment.filePath);
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found on disk'
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      res.setHeader('Content-Type', attachment.mimeType);
      
      return res.sendFile(filePath);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to download attachment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getTicketCount(req: Request, res: Response) {
    try {
      const { status, priority, category } = req.query;

      const count = await ticketService.getTicketCount({
        status: status as TicketStatus,
        priority: priority as TicketPriority,
        category: category as TicketCategory,
      });

      return res.status(200).json({
        success: true,
        data: {
          total: count
        }
      });
    } catch (error) {
      console.error('Error fetching ticket count:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket count',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async fixAdminTickets(req: Request, res: Response) {
    try {
      const result = await ticketService.fixExistingAdminTickets();

      return res.status(200).json({
        success: true,
        message: 'Admin tickets fix completed',
        data: result
      });
    } catch (error) {
      console.error('Error fixing admin tickets:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fix admin tickets',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const ticketController = new TicketController();
