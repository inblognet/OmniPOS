const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Mobile login endpoint
router.post('/auth/login', async (req, res) => {
    const { email, password, device_id, device_name, device_model, os_version } = req.body;
    const client = await pool.connect();
    
    try {
        console.log('Mobile login attempt:', email);
        
        // First try customer login
        let user = await client.query(
            'SELECT id, name, email, points, \'customer\' as user_type, password_hash as password FROM customers WHERE email = $1',
            [email]
        );
        
        let userType = 'customer';
        
        // If not found as customer, try staff
        if (user.rows.length === 0) {
            user = await client.query(
                'SELECT id, name, email, role as user_type, password FROM users WHERE email = $1',
                [email]
            );
            userType = 'staff';
        }
        
        if (user.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        const userData = user.rows[0];
        
        // Verify password
        let isValid = false;
        if (userType === 'customer') {
            // Simple password comparison for customers (plain text for now)
            isValid = userData.password === password;
        } else {
            // bcrypt comparison for staff
            isValid = await bcrypt.compare(password, userData.password);
        }
        
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        // Generate mobile session token
        const sessionToken = crypto.randomBytes(64).toString('hex');
        
        // Store mobile session
        await client.query(
            `INSERT INTO mobile_sessions (user_id, user_type, token, device_id, device_name, device_model, os_version, ip_address, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL \'7 days\')`,
            [userData.id, userType, sessionToken, device_id, device_name, device_model, os_version, req.ip]
        );
        
        // Remove password from response
        delete userData.password;
        
        res.json({
            success: true,
            token: sessionToken,
            user: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                user_type: userType,
                points: userData.points || 0,
                role: userData.user_type
            }
        });
        
    } catch (error) {
        console.error('Mobile login error:', error);
        res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    } finally {
        client.release();
    }
});

// Customer dashboard endpoint
router.get('/customer/dashboard', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const client = await pool.connect();
    
    try {
        // Get session and user
        const session = await client.query(
            'SELECT user_id, user_type FROM mobile_sessions WHERE token = $1 AND expires_at > NOW() AND is_active = true',
            [token]
        );
        
        if (session.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Session expired' });
        }
        
        const userId = session.rows[0].user_id;
        const userType = session.rows[0].user_type;
        
        if (userType !== 'customer') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        // Get customer stats
        const customerStats = await client.query(
            `SELECT 
                COALESCE(total_spend, 0) as total_spent,
                COALESCE(total_purchases, 0) as total_orders,
                COALESCE(loyalty_points, 0) as loyalty_points,
                COALESCE(loyalty_joined, false) as loyalty_joined
             FROM customers WHERE id = $1`,
            [userId]
        );
        
        // Get recent orders
        const recentOrders = await client.query(
            `SELECT id, total_amount, status, created_at 
             FROM orders 
             WHERE customer_id = $1 
             ORDER BY created_at DESC 
             LIMIT 5`,
            [userId]
        );
        
        res.json({
            success: true,
            stats: customerStats.rows[0],
            recent_orders: recentOrders.rows
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    } finally {
        client.release();
    }
});

// Products endpoint for mobile
router.get('/products', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const query = `
            SELECT 
                p.id, p.name, p.sku, p.price, p.web_allocated_stock, p.category, p.description,
                COALESCE(
                    json_agg(
                        json_build_object('url', pi.image_url, 'is_primary', pi.is_primary)
                    ) FILTER (WHERE pi.id IS NOT NULL), '[]'
                ) as images
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE p.is_active = TRUE AND p.web_allocated_stock > 0
            GROUP BY p.id 
            ORDER BY p.id DESC
        `;
        const result = await client.query(query);
        res.json({ success: true, products: result.rows });
    } catch (error) {
        console.error('Products error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
    } finally {
        client.release();
    }
});

module.exports = router;
