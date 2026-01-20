import { Router } from 'express';
import { ticketController } from './ticket.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { exportTicketsToExcel } from './ticket.export';

const router = Router();

// Export tickets to Excel (requires auth)
router.get('/export/excel', authenticateToken, exportTicketsToExcel);

// Get ticket count (public endpoint for sidebar)
router.get('/count', ticketController.getTicketCount.bind(ticketController));

// Get my tickets (tickets created by logged-in user) (requires auth)
router.get('/my-tickets', authenticateToken, ticketController.getMyTickets.bind(ticketController));

// Apply authentication middleware to remaining routes
router.use(authenticateToken);

// Create a new ticket
router.post('/', ticketController.createTicket.bind(ticketController));

// Get all tickets (with optional filters)
router.get('/', ticketController.getTickets.bind(ticketController));

// Get ticket by ID
router.get('/:id', ticketController.getTicketById.bind(ticketController));

// Update ticket
router.put('/:id', ticketController.updateTicket.bind(ticketController));

// Delete ticket
router.delete('/:id', ticketController.deleteTicket.bind(ticketController));

// Add comment to ticket
router.post('/:id/comments', ticketController.addComment.bind(ticketController));

// Download ticket attachment
router.get('/attachments/:attachmentId/download', ticketController.downloadAttachment.bind(ticketController));

export default router;
