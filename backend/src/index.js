import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './routes';
import swagger from './swagger/swagger';
// Load environment variables
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
// Middleware 
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Enable default query string parsing
app.set('query parser', 'extended');
// Root endpoint
app.get('/', (_req, res) => {
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
    });
});
// Routes
app.use('/api/v1', apiRoutes);
app.use('/api/v1/api-docs', swagger);
// Error handling middleware
app.use((err, _req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});
// 404 handler (must be last)
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        hint: 'Visit / or /api/v1 for available endpoints'
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
});
export default app;
