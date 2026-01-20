import { Request, Response } from 'express';
import { ticketCategoryService } from './ticketCategory.service';

export class TicketCategoryController {
  async createCategory(req: Request, res: Response) {
    try {
      const { name, description } = req.body;
      const authenticatedUser = (req as any).user;

      // Validate required fields
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      const category = await ticketCategoryService.createCategory({
        name: name.trim(),
        description: description?.trim(),
        createdBy: authenticatedUser?.id
      });

      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create category'
      });
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const { includeInactive } = req.query;
      
      const categories = await ticketCategoryService.getCategories(
        includeInactive === 'true'
      );

      return res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  }

  async getCategoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const category = await ticketCategoryService.getCategoryById(id);

      return res.status(200).json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error fetching category:', error);
      return res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Category not found'
      });
    }
  }

  async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      const category = await ticketCategoryService.updateCategory(id, {
        name: name?.trim(),
        description: description?.trim(),
        isActive
      });

      return res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update category'
      });
    }
  }

  async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await ticketCategoryService.deleteCategory(id);

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete category'
      });
    }
  }

  async deactivateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const category = await ticketCategoryService.deactivateCategory(id);

      return res.status(200).json({
        success: true,
        message: 'Category deactivated successfully',
        data: category
      });
    } catch (error) {
      console.error('Error deactivating category:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deactivate category'
      });
    }
  }

  async activateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const category = await ticketCategoryService.activateCategory(id);

      return res.status(200).json({
        success: true,
        message: 'Category activated successfully',
        data: category
      });
    } catch (error) {
      console.error('Error activating category:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to activate category'
      });
    }
  }
}

export const ticketCategoryController = new TicketCategoryController();