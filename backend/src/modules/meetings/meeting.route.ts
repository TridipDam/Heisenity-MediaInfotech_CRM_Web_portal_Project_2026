import { Router } from 'express';
import {
  createMeetingController,
  getMeetingController,
  getMeetingsController,
  updateMeetingController,
  deleteMeetingController,
  addAttendeesController,
  removeAttendeeController,
  updateAttendeeResponseController,
  getUpcomingMeetingsController,
  getTodaysMeetingsController,
} from './meeting.controller';

const router = Router();

// Meeting CRUD operations
router.post('/', createMeetingController);
router.get('/', getMeetingsController);
router.get('/:id', getMeetingController);
router.put('/:id', updateMeetingController);
router.delete('/:id', deleteMeetingController);

// Attendee management
router.post('/:id/attendees', addAttendeesController);
router.delete('/:id/attendees/:employeeId', removeAttendeeController);
router.put('/:id/attendees/:employeeId/response', updateAttendeeResponseController);

// Employee-specific meeting queries
router.get('/employee/:employeeId/upcoming', getUpcomingMeetingsController);
router.get('/employee/:employeeId/today', getTodaysMeetingsController);

export default router;