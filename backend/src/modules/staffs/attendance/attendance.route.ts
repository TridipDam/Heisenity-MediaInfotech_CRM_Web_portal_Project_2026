// modules/staffs/attendance/attendance.route.ts
import { Router, Request, Response } from 'express'
import { detectDevice, getLocationData } from '@/modules/staffs/attendance/attendance.controller'

const router = Router()

// Device detection endpoint
router.get('/device', (req: Request, res: Response) => {
  console.log('Device endpoint hit')
  return detectDevice(req, res)
})

// Location data endpoint - GET with query parameters
router.get('/location', (req: Request, res: Response) => {
  console.log('\n=== LOCATION GET REQUEST ===')
  console.log('URL:', req.originalUrl)
  console.log('Query string:', req.url.split('?')[1] || 'NO QUERY STRING')
  console.log('req.query object:', req.query)
  console.log('============================\n')
  
  return getLocationData(req, res)
})

// Location data endpoint - POST
router.post('/location', (req: Request, res: Response) => {
  console.log('Location POST request')
  return getLocationData(req, res)
})

// Location data endpoint - URL params
router.get('/location/:latitude/:longitude', (req: Request, res: Response) => {
  console.log('Location params request:', req.params)
  return getLocationData(req, res)
})

export default router