const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Store sessions
const sessions = new Map();

// ==========================================
// MOBILE LOGIN - DIRECT IMPLEMENTATION
// ==========================================

// Unified login endpoint
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('📱 Mobile login attempt:', email);
    
    try {
        // FIRST: Check if it's a staff user (from users table with bcrypt)
        const staffResult = await pool.query(
            'SELECT id, name, email, role, password FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (staffResult.rows.length > 0) {
            const user = staffResult.rows[0];
            console.log('✅ Found staff user:', user.email, 'Role:', user.role);
            
            // Verify password with bcrypt
            const isValid = await bcrypt.compare(password, user.password);
            console.log('Password valid:', isValid);
            
            if (isValid) {
                const token = crypto.randomBytes(32).toString('hex');
                
                sessions.set(token, {
                    userId: user.id,
                    userType: 'staff',
                    email: user.email,
                    role: user.role,
                    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
                });
                
                return res.json({
                    success: true,
                    token: token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        user_type: 'staff',
                        role: user.role
                    }
                });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
        }
        
        // SECOND: Check if it's a customer user
        const customerResult = await pool.query(
            'SELECT id, name, email, COALESCE(points, 0) as points, password_hash as password FROM customers WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (customerResult.rows.length > 0) {
            const user = customerResult.rows[0];
            console.log('✅ Found customer user:', user.email);
            
            // Customers use plain text password
            if (user.password === password) {
                const token = crypto.randomBytes(32).toString('hex');
                
                sessions.set(token, {
                    userId: user.id,
                    userType: 'customer',
                    email: user.email,
                    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
                });
                
                return res.json({
                    success: true,
                    token: token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        user_type: 'customer',
                        points: parseInt(user.points) || 0
                    }
                });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }
        }
        
        console.log('❌ User not found:', email);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Customer dashboard endpoint
router.get('/customer/dashboard', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
        return res.status(401).json({ success: false, message: 'Session expired' });
    }
    
    const client = await pool.connect();
    
    try {
        const result = await client.query(
            `SELECT 
                COALESCE(SUM(o.total_amount), 0) as total_spent,
                COUNT(DISTINCT o.id) as total_orders,
                COALESCE(c.points, 0) as loyalty_points
             FROM customers c
             LEFT JOIN orders o ON c.id = o.customer_id
             WHERE c.id = $1
             GROUP BY c.points`,
            [session.userId]
        );
        
        const orders = await client.query(
            `SELECT id, total_amount, order_status as status, created_at
             FROM orders
             WHERE customer_id = $1
             ORDER BY created_at DESC
             LIMIT 5`,
            [session.userId]
        );
        
        const stats = result.rows[0] || { total_spent: 0, total_orders: 0, loyalty_points: 0 };
        
        res.json({
            success: true,
            stats: {
                total_spent: parseFloat(stats.total_spent),
                total_orders: parseInt(stats.total_orders),
                loyalty_points: parseInt(stats.loyalty_points),
                loyalty_joined: parseInt(stats.loyalty_points) > 0
            },
            recent_orders: orders.rows.map(o => ({
                id: o.id,
                total_amount: parseFloat(o.total_amount),
                status: o.status || 'PENDING',
                created_at: o.created_at
            }))
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
    } finally {
        client.release();
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Mobile API is working!' });
});


// ==========================================
// ADDITIONAL STAFF ENDPOINTS
// ==========================================

// Get all customers for staff
router.get('/staff/customers', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT 
                c.id,
                c.name,
                c.email,
                c.phone,
                c.address,
                c.city,
                COALESCE(c.points, 0) as points,
                COALESCE(c.total_spend, 0) as total_spend,
                COUNT(DISTINCT o.id) as total_orders,
                c.created_at
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);
        
        res.json({ success: true, customers: result.rows });
    } catch (error) {
        console.error('Staff customers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch customers' });
    } finally {
        client.release();
    }
});

// Update customer points
router.put('/staff/customers/:id/points', async (req, res) => {
    const { id } = req.params;
    const { points } = req.body;
    
    const client = await pool.connect();
    
    try {
        await client.query(
            'UPDATE customers SET points = $1, updated_at = NOW() WHERE id = $2',
            [points, id]
        );
        
        res.json({ success: true, message: 'Points updated' });
    } catch (error) {
        console.error('Update points error:', error);
        res.status(500).json({ success: false, message: 'Failed to update points' });
    } finally {
        client.release();
    }
});

// Get all refund requests for staff
router.get('/staff/refunds', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT 
                r.*,
                c.name as customer_name
            FROM refund_requests r
            JOIN customers c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        `);
        
        res.json({ success: true, refunds: result.rows });
    } catch (error) {
        console.error('Staff refunds error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch refunds' });
    } finally {
        client.release();
    }
});

// Update refund status
router.put('/staff/refunds/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const client = await pool.connect();
    
    try {
        await client.query(
            'UPDATE refund_requests SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, id]
        );
        
        res.json({ success: true, message: 'Refund status updated' });
    } catch (error) {
        console.error('Update refund error:', error);
        res.status(500).json({ success: false, message: 'Failed to update refund status' });
    } finally {
        client.release();
    }
});

module.exports = router;

