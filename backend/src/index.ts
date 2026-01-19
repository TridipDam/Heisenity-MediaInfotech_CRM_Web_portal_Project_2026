import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import apiRoutes from './routes'
import swagger from './swagger/swagger'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware 
app.use(helmet())

// Handle preflight requests
app.options('*', cors())

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'https://heisenity-mediainfotech-crm-web-portal-zr9h.onrender.com',
  'https://heisenity-mediainfotech-crm-web-portal-azxu.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean) // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } 
    // Allow any subdomain of the main domain for production
    else if (origin.includes('heisenity-mediainfotech-crm-web-portal') && origin.includes('onrender.com')) {
      callback(null, true)
    } 
    else {
      console.log('CORS blocked origin:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Accept',
    'Accept-Version',
    'Authorization',
    'Content-Length',
    'Content-MD5',
    'Content-Type',
    'Date',
    'X-Api-Version',
    'X-CSRF-Token',
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
    'If-Match',
    'If-Modified-Since',
    'If-None-Match',
    'If-Unmodified-Since'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'))

// Enable default query string parsing
app.set('query parser', 'extended')

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    message: 'CRM Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      test: '/api/v1/test',
      staff_attendance: '/api/v1/attendance',
      staff_location: '/api/v1/attendance/location',
      staff_deviceInfo: '/api/v1/attendance/device',
      apiDocs: '/api/v1/api-docs'
    }
  })
})

// Routes
app.use('/api/v1', apiRoutes)
app.use('/api/v1/api-docs', swagger)

// Error handling middleware
app.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  })
})

// 404 handler (must be last)
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    hint: 'Visit / or /api/v1 for available endpoints'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`)
})

export default app