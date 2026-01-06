import { authService } from '../services/auth.service';
class AuthController {
    async login(req, res) {
        try {
            const { email, password, employeeId, adminId, userType } = req.body;
            if (!email || !password || !userType) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            if (userType === 'employee' && !employeeId) {
                return res.status(400).json({ error: 'Employee ID is required for employee login' });
            }
            if (userType === 'admin' && !adminId) {
                return res.status(400).json({ error: 'Admin ID is required for admin login' });
            }
            const user = await authService.authenticate(email, password, employeeId, adminId, userType);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            res.json(user);
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    async registerAdmin(req, res) {
        try {
            const { name, adminId, email, password, phone } = req.body;
            if (!name || !adminId || !email || !password) {
                return res.status(400).json({ error: 'Name, admin ID, email, and password are required' });
            }
            const user = await authService.registerAdmin(name, adminId, email, password, phone);
            res.status(201).json(user);
        }
        catch (error) {
            console.error('Admin registration error:', error);
            if (error.message.includes('already exists')) {
                return res.status(409).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
export const authController = new AuthController();
