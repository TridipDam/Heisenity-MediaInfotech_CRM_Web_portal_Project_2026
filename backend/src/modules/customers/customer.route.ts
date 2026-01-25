import { Router } from 'express';
import { CustomerController } from './customer.controller';
import { authenticateToken } from '@/middleware/auth.middleware';
import { authenticateCustomer } from '@/middleware/customerAuth.middleware';
import { exportCustomersToExcel } from './customer.export';

const router = Router();

// Public routes
router.post('/login', CustomerController.customerLogin);

// Customer protected routes
router.get('/profile', authenticateCustomer, CustomerController.getCustomerProfile);
router.post('/logout', authenticateCustomer, CustomerController.customerLogout);

// Admin protected routes
router.get('/export/excel', authenticateToken, exportCustomersToExcel);
router.get('/prefixes', authenticateToken, CustomerController.getCustomerIdPrefixes);
router.post('/prefixes', authenticateToken, CustomerController.addCustomerIdPrefix);
router.post('/', authenticateToken, CustomerController.createCustomer);
router.get('/', authenticateToken, CustomerController.getAllCustomers);
router.get('/:id', authenticateToken, CustomerController.getCustomer);
router.put('/:id', authenticateToken, CustomerController.updateCustomer);
router.delete('/:id', authenticateToken, CustomerController.deleteCustomer);

export default router;
