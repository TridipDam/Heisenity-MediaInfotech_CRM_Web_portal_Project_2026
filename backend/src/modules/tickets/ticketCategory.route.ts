import { Router } from 'express';
import { ticketCategoryController } from './ticketCategory.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all categories
router.get('/', ticketCategoryController.getCategories.bind(ticketCategoryController));

// Create a new category
router.post('/', ticketCategoryController.createCategory.bind(ticketCategoryController));

// Get category by ID
router.get('/:id', ticketCategoryController.getCategoryById.bind(ticketCategoryController));

// Update category
router.put('/:id', ticketCategoryController.updateCategory.bind(ticketCategoryController));

// Delete category
router.delete('/:id', ticketCategoryController.deleteCategory.bind(ticketCategoryController));

// Deactivate category
router.patch('/:id/deactivate', ticketCategoryController.deactivateCategory.bind(ticketCategoryController));

// Activate category
router.patch('/:id/activate', ticketCategoryController.activateCategory.bind(ticketCategoryController));

export default router;