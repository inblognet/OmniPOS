const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Store sessions
const sessions = new Map();

// ==========================================
// AUTHENTICATION
// ==========================================

// Unified login endpoint
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('📱 Login attempt:', email);
    
    try {
        // Check staff first
        const staffResult = await pool.query(
            'SELECT id, name, email, role, password FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (staffResult.rows.length > 0) {
            const user = staffResult.rows[0];
            const isValid = await bcrypt.compare(password, user.password);
            
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
            }
        }
        
        // Check customer
        const customerResult = await pool.query(
            'SELECT id, name, email, COALESCE(points, 0) as points, password_hash as password FROM customers WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (customerResult.rows.length > 0) {
            const user = customerResult.rows[0];
            
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
            }
        }
        
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
        
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==========================================
// STAFF DASHBOARD ENDPOINTS
// ==========================================

// Staff dashboard stats
router.get('/staff/dashboard', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const client = await pool.connect();
    try {
        const todayStats = await client.query(`
            SELECT 
                COUNT(*) as today_orders,
                COALESCE(SUM(total_amount), 0) as today_revenue
            FROM orders 
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        const pendingStats = await client.query(`
            SELECT 
                COUNT(CASE WHEN order_status = 'PENDING' OR order_status IS NULL THEN 1 END) as pending_orders
        `);
        
        const refundsStats = await client.query(`
            SELECT COUNT(*) as pending_refunds FROM refund_requests WHERE status = 'PENDING'
        `);
        
        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM customers) as total_customers,
                (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products
        `);
        
        res.json({
            success: true,
            stats: {
                today_orders: parseInt(todayStats.rows[0].today_orders) || 0,
                today_revenue: parseFloat(todayStats.rows[0].today_revenue) || 0,
                pending_orders: parseInt(pendingStats.rows[0].pending_orders) || 0,
                pending_refunds: parseInt(refundsStats.rows[0].pending_refunds) || 0,
                total_customers: parseInt(counts.rows[0].total_customers) || 0,
                total_products: parseInt(counts.rows[0].total_products) || 0
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// Recent orders for dashboard
router.get('/staff/recent-orders', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                o.id, o.total_amount, COALESCE(o.order_status, 'PENDING') as order_status,
                c.name as customer_name, o.created_at
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC LIMIT 10
        `);
        
        res.json({
            success: true,
            orders: result.rows.map(row => ({
                ...row,
                total_amount: parseFloat(row.total_amount)
            }))
        });
    } catch (error) {
        console.error('Recent orders error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// Get all orders
router.get('/staff/orders', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                o.id, c.name as customer_name, o.total_amount,
                o.payment_method, o.payment_status,
                COALESCE(o.order_status, 'PENDING') as order_status,
                o.created_at, o.delivery_address, o.delivery_phone
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC LIMIT 100
        `);
        
        res.json({
            success: true,
            orders: result.rows.map(row => ({
                ...row,
                total_amount: parseFloat(row.total_amount)
            }))
        });
    } catch (error) {
        console.error('Orders error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// Update order status
router.put('/staff/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('UPDATE orders SET order_status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
        res.json({ success: true, message: 'Order status updated' });
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// Get customers
router.get('/staff/customers', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                c.id, c.name, c.email, c.phone, c.address, c.city,
                COALESCE(c.points, 0) as points,
                COALESCE(c.total_spend, 0) as total_spend,
                COUNT(DISTINCT o.id) as total_orders,
                c.created_at
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);
        
        res.json({
            success: true,
            customers: result.rows.map(row => ({
                ...row,
                points: parseFloat(row.points) || 0,
                total_spend: parseFloat(row.total_spend) || 0,
                total_orders: parseInt(row.total_orders) || 0
            }))
        });
    } catch (error) {
        console.error('Customers error:', error);
        res.status(500).json({ success: false, message: error.message });
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
        await client.query('UPDATE customers SET points = $1, updated_at = NOW() WHERE id = $2', [points, id]);
        res.json({ success: true, message: 'Points updated' });
    } catch (error) {
        console.error('Update points error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// Get refunds
router.get('/staff/refunds', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT r.*, c.name as customer_name
            FROM refund_requests r
            JOIN customers c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        `);
        
        res.json({
            success: true,
            refunds: result.rows.map(row => ({
                ...row,
                refund_amount: parseFloat(row.refund_amount)
            }))
        });
    } catch (error) {
        console.error('Refunds error:', error);
        res.status(500).json({ success: false, message: error.message });
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
        await client.query('UPDATE refund_requests SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
        res.json({ success: true, message: 'Refund status updated' });
    } catch (error) {
        console.error('Update refund error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Mobile API is working!' });
});

module.exports = router;
