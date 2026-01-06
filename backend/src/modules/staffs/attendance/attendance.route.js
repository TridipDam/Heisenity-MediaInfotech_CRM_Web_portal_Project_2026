// modules/staffs/attendance/attendance.route.ts
import { Router } from 'express';
import { detectDevice, getLocationData, createAttendance, checkRemainingAttempts, getAssignedLocation, getAttendanceRecords } from '@/modules/staffs/attendance/attendance.controller';
const router = Router();
// Get attendance records - GET (this will be mounted at /attendance, so this becomes /attendance/)
router.get('/', (req, res) => {
    return getAttendanceRecords(req, res);
});
// Attendance endpoint - POST (this will be mounted at /attendance, so this becomes /attendance/)
router.post('/', (req, res) => {
    return createAttendance(req, res);
});
// Check remaining attempts for location validation
router.get('/attempts/:employeeId', (req, res) => {
    return checkRemainingAttempts(req, res);
});
// Get assigned location for today
router.get('/assigned-location/:employeeId', (req, res) => {
    return getAssignedLocation(req, res);
});
// Device detection endpoint
router.get('/device', (req, res) => {
    return detectDevice(req, res);
});
// Location data endpoint - GET with query parameters
router.get('/location', (req, res) => {
    return getLocationData(req, res);
});
// Location data endpoint - POST
router.post('/location', (req, res) => {
    return getLocationData(req, res);
});
// Location data endpoint - URL params
router.get('/location/:latitude/:longitude', (req, res) => {
    return getLocationData(req, res);
});
export default router;
