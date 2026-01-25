import { Router } from 'express';
import { generateLabels, createProduct, getProducts, getProduct, updateProduct, deleteProduct } from './product.controller';

const router = Router();

// Product CRUD routes
router.post('/', createProduct);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Label generation route
router.post('/:productId/generate-labels', generateLabels);

export default router;