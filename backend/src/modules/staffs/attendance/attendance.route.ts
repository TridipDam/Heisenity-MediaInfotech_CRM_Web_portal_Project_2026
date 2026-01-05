// modules/staffs/attendance/attendance.route.ts
import { Router, Request, Response } from 'express'
import { detectDevice, getLocationData, createAttendance } from '@/modules/staffs/attendance/attendance.controller'

const router = Router()

// Attendance endpoint - POST (this will be mounted at /attendance, so this becomes /attendance/)
router.post('/', (req: Request, res: Response) => {
  return createAttendance(req, res)
})

// Device detection endpoint
router.get('/device', (req: Request, res: Response) => {
  return detectDevice(req, res)
})

// Location data endpoint - GET with query parameters
router.get('/location', (req: Request, res: Response) => {
  return getLocationData(req, res)
})

// Location data endpoint - POST
router.post('/location', (req: Request, res: Response) => {
  return getLocationData(req, res)
})

// Location data endpoint - URL params
router.get('/location/:latitude/:longitude', (req: Request, res: Response) => {
  return getLocationData(req, res)
})

export default router