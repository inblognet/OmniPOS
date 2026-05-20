const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const crypto = require('crypto');

// Simple mobile login endpoint
router.post('/auth/login', async (req, res) => {
    // Set CORS headers for this route
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Type, X-Device-Id');
    
    const { email, password } = req.body;
    console.log('?? Login attempt:', email, 'Password:', password);
    
    try {
        // Try customer login
        const customerResult = await pool.query(
            'SELECT id, name, email, COALESCE(points, 0) as points, \'customer\' as user_type, password_hash as password FROM customers WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (customerResult.rows.length > 0) {
            const user = customerResult.rows[0];
            
            if (user.password === password) {
                // Generate simple token
                const token = crypto.randomBytes(32).toString('hex');
                
                return res.json({
                    success: true,
                    token: token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        user_type: 'customer',
                        points: user.points || 0
                    }
                });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            }
        }
        
        // Try staff login
        const staffResult = await pool.query(
            'SELECT id, name, email, role as user_type, \'staff_password\' as password FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (staffResult.rows.length > 0) {
            // For staff, you'd need bcrypt comparison
            return res.status(401).json({ success: false, message: 'Staff login not implemented yet' });
        }
        
        return res.status(401).json({ success: false, message: 'User not found' });
        
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Mobile API is working!' });
});

module.exports = router;
