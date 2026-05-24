const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Store sessions
const sessions = new Map();

// ==========================================
// LOGIN
// ==========================================
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('📱 Login:', email);
    
    try {
        // Check staff
        const staff = await pool.query('SELECT id, name, email, role, password FROM users WHERE email = $1', [email.toLowerCase()]);
        if (staff.rows.length > 0) {
            const user = staff.rows[0];
            const valid = await bcrypt.compare(password, user.password);
            if (valid) {
                const token = crypto.randomBytes(32).toString('hex');
                sessions.set(token, { userId: user.id, userType: 'staff', role: user.role });
                return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, user_type: 'staff', role: user.role } });
            }
        }
        
        // Check customer
        const customer = await pool.query('SELECT id, name, email, points, password_hash as password FROM customers WHERE email = $1', [email.toLowerCase()]);
        if (customer.rows.length > 0) {
            const user = customer.rows[0];
            if (user.password === password) {
                const token = crypto.randomBytes(32).toString('hex');
                sessions.set(token, { userId: user.id, userType: 'customer' });
                return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, user_type: 'customer', points: user.points || 0 } });
            }
        }
        
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// STAFF DASHBOARD - WORKING VERSION
// ==========================================
router.get('/staff/dashboard', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    
    const session = sessions.get(token);
    if (!session) return res.status(401).json({ success: false, message: 'Invalid session' });
    
    const client = await pool.connect();
    try {
        // Today's orders
        const todayResult = await client.query(`
            SELECT 
                COUNT(*) as order_count,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM orders 
            WHERE DATE(created_at) = CURRENT_DATE
        `);
        
        // Pending orders
        const pendingResult = await client.query(`
            SELECT COUNT(*) as count FROM orders 
            WHERE order_status = 'PENDING' OR order_status IS NULL
        `);
        
        // Total customers
        const customersResult = await client.query('SELECT COUNT(*) as count FROM customers');
        
        // Total products
        const productsResult = await client.query('SELECT COUNT(*) as count FROM products WHERE is_active = true');
        
        // Pending refunds (if table exists)
        let pendingRefunds = 0;
        try {
            const refundsResult = await client.query('SELECT COUNT(*) as count FROM refund_requests WHERE status = $1', ['PENDING']);
            pendingRefunds = parseInt(refundsResult.rows[0].count);
        } catch (e) {
            console.log('Refunds table may not exist yet');
        }
        
        res.json({
            success: true,
            stats: {
                today_orders: parseInt(todayResult.rows[0].order_count) || 0,
                today_revenue: parseFloat(todayResult.rows[0].revenue) || 0,
                pending_orders: parseInt(pendingResult.rows[0].count) || 0,
                pending_refunds: pendingRefunds,
                total_customers: parseInt(customersResult.rows[0].count) || 0,
                total_products: parseInt(productsResult.rows[0].count) || 0
            }
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// RECENT ORDERS - WORKING VERSION
// ==========================================
router.get('/staff/recent-orders', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                o.id, 
                o.total_amount, 
                COALESCE(o.order_status, 'PENDING') as order_status,
                COALESCE(c.name, 'Guest') as customer_name,
                o.created_at
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            orders: result.rows.map(r => ({
                id: r.id,
                total_amount: parseFloat(r.total_amount),
                order_status: r.order_status,
                customer_name: r.customer_name,
                created_at: r.created_at
            }))
        });
    } catch (err) {
        console.error('Recent orders error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// ALL ORDERS
// ==========================================
router.get('/staff/orders', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                o.id, 
                COALESCE(c.name, 'Guest') as customer_name,
                o.total_amount,
                o.payment_method,
                o.payment_status,
                COALESCE(o.order_status, 'PENDING') as order_status,
                o.created_at,
                o.delivery_address
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC
            LIMIT 50
        `);
        
        res.json({
            success: true,
            orders: result.rows.map(r => ({
                ...r,
                total_amount: parseFloat(r.total_amount)
            }))
        });
    } catch (err) {
        console.error('Orders error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// UPDATE ORDER STATUS
// ==========================================
router.put('/staff/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('UPDATE orders SET order_status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// CUSTOMERS
// ==========================================
router.get('/staff/customers', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                id, name, email, phone, address, city,
                COALESCE(points, 0) as points,
                COALESCE(total_spend, 0) as total_spend,
                (SELECT COUNT(*) FROM orders WHERE customer_id = customers.id) as total_orders,
                created_at
            FROM customers
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            customers: result.rows.map(r => ({
                ...r,
                points: parseFloat(r.points) || 0,
                total_spend: parseFloat(r.total_spend) || 0,
                total_orders: parseInt(r.total_orders) || 0
            }))
        });
    } catch (err) {
        console.error('Customers error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// UPDATE CUSTOMER POINTS
// ==========================================
router.put('/staff/customers/:id/points', async (req, res) => {
    const { id } = req.params;
    const { points } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('UPDATE customers SET points = $1 WHERE id = $2', [points, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Update points error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// TEST
// ==========================================
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Mobile API is working!' });
});

module.exports = router;
