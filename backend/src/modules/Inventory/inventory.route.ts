import { Router } from 'express';
import {
  createInventoryTransaction,
  getInventoryTransactions,
  getAvailableUnits,
  getLowStockAlerts,
  checkProductLowStock,
  getAllocations,
  getInventoryAudit,
  getEmployeeCheckouts
} from './inventory.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Inventory transaction routes
router.post('/transactions', createInventoryTransaction);
router.get('/transactions', getInventoryTransactions);

// Available units route
router.get('/available/:productId', getAvailableUnits);

// Low stock alert routes
router.get('/low-stock-alerts', getLowStockAlerts);
router.post('/check-low-stock/:productId', checkProductLowStock);

// Allocation routes
router.get('/allocations', getAllocations);

// Audit routes
router.get('/audit', getInventoryAudit);

// Employee checkout routes
router.get('/employee-checkouts/:employeeId', getEmployeeCheckouts);

export default router;