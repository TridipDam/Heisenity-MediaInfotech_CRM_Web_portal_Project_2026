import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface CreateCategoryInput {
  name: string;
  description?: string;
  createdBy?: string;
}

interface UpdateCategoryInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export class TicketCategoryService {
  public prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createCategory(data: CreateCategoryInput) {
    // Check if category with same name already exists
    const existingCategory = await this.prisma.ticketCategory.findUnique({
      where: { name: data.name.toUpperCase() }
    });

    if (existingCategory) {
      throw new Error('Category with this name already exists');
    }

    const category = await this.prisma.ticketCategory.create({
      data: {
        name: data.name.toUpperCase(),
        description: data.description,
        createdBy: data.createdBy
      }
    });

    return category;
  }

  async getCategories(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    
    const categories = await this.prisma.ticketCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });

    return categories;
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  async updateCategory(id: string, data: UpdateCategoryInput) {
    // Check if category exists
    const existingCategory = await this.prisma.ticketCategory.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      throw new Error('Category not found');
    }

    // If updating name, check for duplicates
    if (data.name && data.name.toUpperCase() !== existingCategory.name) {
      const duplicateCategory = await this.prisma.ticketCategory.findUnique({
        where: { name: data.name.toUpperCase() }
      });

      if (duplicateCategory) {
        throw new Error('Category with this name already exists');
      }
    }

    const category = await this.prisma.ticketCategory.update({
      where: { id },
      data: {
        name: data.name ? data.name.toUpperCase() : undefined,
        description: data.description,
        isActive: data.isActive
      }
    });

    return category;
  }

  async deleteCategory(id: string) {
    // Check if category exists
    const existingCategory = await this.prisma.ticketCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });

    if (!existingCategory) {
      throw new Error('Category not found');
    }

    // Check if category is being used by any tickets
    if (existingCategory._count.tickets > 0) {
      throw new Error('Cannot delete category that is being used by tickets. Deactivate it instead.');
    }

    await this.prisma.ticketCategory.delete({
      where: { id }
    });

    return { message: 'Category deleted successfully' };
  }

  async deactivateCategory(id: string) {
    return this.updateCategory(id, { isActive: false });
  }

  async activateCategory(id: string) {
    return this.updateCategory(id, { isActive: true });
  }
}

export const ticketCategoryService = new TicketCategoryService();