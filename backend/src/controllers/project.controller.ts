import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class ProjectController {
  // Get all projects
  static async getAllProjects(req: Request, res: Response) {
    try {
      const projects = await prisma.project.findMany({
        include: {
          updates: {
            orderBy: { createdAt: 'desc' }
          },
          payments: {
            orderBy: { createdAt: 'desc' }
          },
          products: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch projects'
      });
    }
  }

  // Get project by ID
  static async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          updates: {
            orderBy: { createdAt: 'desc' }
          },
          payments: {
            orderBy: { createdAt: 'desc' }
          },
          products: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project'
      });
    }
  }

  // Create new project
  static async createProject(req: Request, res: Response) {
    try {
      const { 
        name, 
        startDate, 
        status,
        description,
        endDate,
        priority,
        budget,
        progress
      } = req.body;

      if (!name || !startDate) {
        return res.status(400).json({
          success: false,
          message: 'Name and start date are required'
        });
      }

      const project = await prisma.project.create({
        data: {
          name,
          startDate: new Date(startDate),
          status: status || 'ONGOING',
          description: description || null,
          endDate: endDate ? new Date(endDate) : null,
          priority: priority || 'MEDIUM',
          budget: budget ? parseFloat(budget) : null,
          progress: progress ? parseInt(progress) : 0
        },
        include: {
          updates: true,
          payments: true,
          products: true
        }
      });

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create project'
      });
    }
  }

  // Update project
  static async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        name, 
        startDate, 
        status,
        description,
        endDate,
        priority,
        budget,
        progress
      } = req.body;

      const updateData: any = {};
      
      if (name) updateData.name = name;
      if (startDate) updateData.startDate = new Date(startDate);
      if (status) updateData.status = status;
      if (description !== undefined) updateData.description = description;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (priority) updateData.priority = priority;
      if (budget !== undefined) updateData.budget = budget ? parseFloat(budget) : null;
      if (progress !== undefined) updateData.progress = progress ? parseInt(progress) : null;

      const project = await prisma.project.update({
        where: { id },
        data: updateData,
        include: {
          updates: {
            orderBy: { createdAt: 'desc' }
          },
          payments: {
            orderBy: { createdAt: 'desc' }
          },
          products: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      res.json({
        success: true,
        data: project,
        message: 'Project updated successfully'
      });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project'
      });
    }
  }

  // Delete project
  static async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.project.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project'
      });
    }
  }

  // Add project update
  static async addProjectUpdate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { update, issues, pendingTasks, workProgress, updatedBy, attachments } = req.body;

      if (!update) {
        return res.status(400).json({
          success: false,
          message: 'Update content is required'
        });
      }

      const projectUpdate = await prisma.projectUpdate.create({
        data: {
          projectId: id,
          update,
          issues: issues || null,
          pendingTasks: pendingTasks || null,
          workProgress: workProgress || null,
          updatedBy: updatedBy || null,
          attachments: attachments ? JSON.stringify(attachments) : null
        }
      });

      res.status(201).json({
        success: true,
        data: projectUpdate,
        message: 'Project update added successfully'
      });
    } catch (error) {
      console.error('Error adding project update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add project update'
      });
    }
  }

  // Add project payment
  static async addProjectPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, amountPaid, amountDue, remarks, dueDate, invoiceNumber } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Payment status is required'
        });
      }

      const projectPayment = await prisma.projectPayment.create({
        data: {
          projectId: id,
          status,
          amountPaid: amountPaid || null,
          amountDue: amountDue || null,
          remarks: remarks || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          invoiceNumber: invoiceNumber || null
        }
      });

      res.status(201).json({
        success: true,
        data: projectPayment,
        message: 'Project payment information added successfully'
      });
    } catch (error) {
      console.error('Error adding project payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add project payment information'
      });
    }
  }

  // Get project updates
  static async getProjectUpdates(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const updates = await prisma.projectUpdate.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: updates
      });
    } catch (error) {
      console.error('Error fetching project updates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project updates'
      });
    }
  }

  // Get project payments
  static async getProjectPayments(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const payments = await prisma.projectPayment.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      console.error('Error fetching project payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project payments'
      });
    }
  }

  // Add project product
  static async addProjectProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, category, vendor, notes } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Product name is required'
        });
      }

      const projectProduct = await prisma.projectProduct.create({
        data: {
          projectId: id,
          name,
          category: category || null,
          vendor: vendor || null,
          notes: notes || null
        }
      });

      res.status(201).json({
        success: true,
        data: projectProduct,
        message: 'Project product added successfully'
      });
    } catch (error) {
      console.error('Error adding project product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add project product'
      });
    }
  }

  // Get project products
  static async getProjectProducts(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const products = await prisma.projectProduct.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error fetching project products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project products'
      });
    }
  }

  // Delete project product
  static async deleteProjectProduct(req: Request, res: Response) {
    try {
      const { id, productId } = req.params;

      await prisma.projectProduct.delete({
        where: { 
          id: productId,
          projectId: id
        }
      });

      res.json({
        success: true,
        message: 'Project product deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting project product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project product'
      });
    }
  }
}