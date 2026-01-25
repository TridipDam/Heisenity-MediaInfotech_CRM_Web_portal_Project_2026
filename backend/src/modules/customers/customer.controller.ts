import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { CustomerIdGeneratorService } from '@/services/customerIdGenerator.service';
import crypto from 'crypto';

export class CustomerController {
  // Admin: Create a new customer
  static async createCustomer(req: Request, res: Response) {
    try {
      const { name, phone, email, address, customPrefix } = req.body;
      const adminId = (req as any).user?.id;

      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
      }

      // Check if phone already exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { phone }
      });

      if (existingCustomer) {
        return res.status(400).json({ error: 'Customer with this phone number already exists' });
      }

      // Generate customer ID with custom prefix if provided
      const customerId = await CustomerIdGeneratorService.generateCustomerId(customPrefix);

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          customerId,
          name,
          phone,
          email,
          address,
          createdBy: adminId
        }
      });

      res.status(201).json({
        message: 'Customer created successfully',
        customer: {
          id: customer.id,
          customerId: customer.customerId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          status: customer.status,
          createdAt: customer.createdAt
        }
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }

  // Admin: Get all customers
  static async getAllCustomers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      
      if (search) {
        where.OR = [
          { customerId: { contains: search as string, mode: 'insensitive' } },
          { name: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (status) {
        where.status = status;
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            customerId: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            projects: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
                priority: true
              }
            }
          }
        }),
        prisma.customer.count({ where })
      ]);

      res.json({
        customers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  }

  // Admin: Get single customer
  static async getCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { id },
        select: {
          id: true,
          customerId: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true,
              priority: true,
              description: true
            }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json({ customer });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ error: 'Failed to fetch customer' });
    }
  }

  // Admin: Update customer
  static async updateCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, email, address, status } = req.body;

      const customer = await prisma.customer.findUnique({
        where: { id }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Check if phone is being changed and if it's already taken
      if (phone && phone !== customer.phone) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { phone }
        });

        if (existingCustomer) {
          return res.status(400).json({ error: 'Phone number already in use' });
        }
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(phone && { phone }),
          ...(email !== undefined && { email }),
          ...(address !== undefined && { address }),
          ...(status && { status })
        }
      });

      res.json({
        message: 'Customer updated successfully',
        customer: updatedCustomer
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  // Admin: Delete customer
  static async deleteCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { id }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      await prisma.customer.delete({
        where: { id }
      });

      res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  }

  // Customer: Login with customerId and phone
  static async customerLogin(req: Request, res: Response) {
    try {
      const { customerId, phone } = req.body;

      if (!customerId || !phone) {
        return res.status(400).json({ error: 'Customer ID and phone number are required' });
      }

      // Find customer
      const customer = await prisma.customer.findFirst({
        where: {
          customerId,
          phone,
          status: 'ACTIVE'
        }
      });

      if (!customer) {
        return res.status(401).json({ error: 'Invalid credentials or inactive account' });
      }

      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create session
      const session = await prisma.customerSession.create({
        data: {
          sessionToken,
          customerId: customer.id,
          deviceInfo: req.headers['user-agent'],
          ipAddress: req.ip,
          expiresAt
        }
      });

      res.json({
        message: 'Login successful',
        sessionToken: session.sessionToken,
        customer: {
          id: customer.id,
          customerId: customer.customerId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email
        }
      });
    } catch (error) {
      console.error('Error during customer login:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // Customer: Logout
  static async customerLogout(req: Request, res: Response) {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');

      if (!sessionToken) {
        return res.status(400).json({ error: 'No session token provided' });
      }

      await prisma.customerSession.updateMany({
        where: { sessionToken },
        data: { isActive: false }
      });

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Error during customer logout:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  // Customer: Get profile
  static async getCustomerProfile(req: Request, res: Response) {
    try {
      const customerId = (req as any).customer?.id;

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          customerId: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          status: true,
          createdAt: true
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json({ customer });
    } catch (error) {
      console.error('Error fetching customer profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  // Admin: Get available customer ID prefixes
  static async getCustomerIdPrefixes(req: Request, res: Response) {
    try {
      const prefixes = await CustomerIdGeneratorService.getAvailablePrefixes();
      res.json({ prefixes });
    } catch (error) {
      console.error('Error fetching prefixes:', error);
      res.status(500).json({ error: 'Failed to fetch prefixes' });
    }
  }

  // Admin: Add new customer ID prefix
  static async addCustomerIdPrefix(req: Request, res: Response) {
    try {
      const { prefix } = req.body;

      if (!prefix) {
        return res.status(400).json({ error: 'Prefix is required' });
      }

      await CustomerIdGeneratorService.addCustomPrefix(prefix.toUpperCase());
      res.json({ message: 'Prefix added successfully' });
    } catch (error: any) {
      console.error('Error adding prefix:', error);
      res.status(400).json({ error: error.message || 'Failed to add prefix' });
    }
  }
}
