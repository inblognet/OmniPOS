const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { upload } = require('../config/cloudinary');
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


// ==========================================
// REFUNDS ENDPOINTS
// ==========================================

// Get all refund requests
router.get('/staff/refunds', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const client = await pool.connect();
    try {
        // Check if refund_requests table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'refund_requests'
            )
        `);
        
        if (!tableCheck.rows[0].exists) {
            return res.json({ success: true, refunds: [], message: 'No refunds table yet' });
        }
        
        const result = await client.query(`
            SELECT 
                r.*,
                c.name as customer_name,
                c.email as customer_email
            FROM refund_requests r
            LEFT JOIN customers c ON r.customer_id = c.id
            ORDER BY r.created_at DESC
        `);
        
        res.json({
            success: true,
            refunds: result.rows.map(r => ({
                ...r,
                refund_amount: parseFloat(r.refund_amount)
            }))
        });
    } catch (err) {
        console.error('Refunds error:', err);
        res.status(500).json({ success: false, message: err.message });
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
    } catch (err) {
        console.error('Update refund error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});


// ==========================================
// INVOICE ENDPOINTS
// ==========================================

// Get all invoices
router.get('/staff/invoices', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT i.*, o.customer_id, c.name as customer_name
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY i.created_at DESC
        `);
        
        res.json({ success: true, invoices: result.rows });
    } catch (err) {
        console.error('Invoices error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Generate invoice
router.post('/staff/invoices/generate', async (req, res) => {
    const { order_id } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false });
    
    const client = await pool.connect();
    try {
        // Get order details
        const order = await client.query(`
            SELECT o.*, c.name as customer_name, c.email as customer_email
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = $1
        `, [order_id]);
        
        if (order.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${order_id}`;
        
        // Create invoice record
        const result = await client.query(`
            INSERT INTO invoices (invoice_number, order_id, total_amount, status)
            VALUES ($1, $2, $3, 'PENDING')
            RETURNING *
        `, [invoiceNumber, order_id, order.rows[0].total_amount]);
        
        res.json({ success: true, invoice: result.rows[0] });
    } catch (err) {
        console.error('Generate invoice error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// ANALYTICS ENDPOINTS
// ==========================================

router.get('/staff/analytics', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false });
    
    const { days = 30 } = req.query;
    const client = await pool.connect();
    
    try {
        // Daily sales for the period
        const dailySales = await client.query(`
            SELECT 
                DATE(created_at) as date,
                COALESCE(SUM(total_amount), 0) as amount,
                COUNT(*) as orders
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);
        
        // Top products
        const topProducts = await client.query(`
            SELECT 
                p.name,
                SUM(oi.quantity) as quantity
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY p.name
            ORDER BY quantity DESC
            LIMIT 10
        `);
        
        // Category sales
        const categorySales = await client.query(`
            SELECT 
                p.category as name,
                COUNT(*) as value
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY p.category
        `);
        
        // Stats
        const stats = await client.query(`
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as total_orders,
                COALESCE(AVG(total_amount), 0) as avg_order_value,
                (SELECT COUNT(*) FROM customers) as total_customers
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${days} days'
        `);
        
        res.json({
            success: true,
            daily_sales: dailySales.rows,
            top_products: topProducts.rows,
            category_sales: categorySales.rows,
            stats: stats.rows[0]
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// PRODUCT MANAGEMENT ENDPOINTS
// ==========================================

// Get all products for staff
router.get('/staff/products', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                p.*,
                COALESCE(
                    (SELECT json_agg(json_build_object('url', pi.image_url))
                     FROM product_images pi 
                     WHERE pi.product_id = p.id),
                    '[]'::json
                ) as images
            FROM products p
            ORDER BY p.id DESC
        `);
        
        res.json({
            success: true,
            products: result.rows.map(p => ({
                ...p,
                price: parseFloat(p.price),
                stock: parseInt(p.stock),
                web_allocated_stock: parseInt(p.web_allocated_stock)
            }))
        });
    } catch (err) {
        console.error('Products error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Create product
router.post('/staff/products', upload.single('image'), async (req, res) => {
    const { name, sku, price, stock, category, description } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false });
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            INSERT INTO products (name, sku, price, stock, category, description, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING id
        `, [name, sku, parseFloat(price), parseInt(stock), category, description]);
        
        const productId = result.rows[0].id;
        
        if (req.file && req.file.path) {
            await client.query(`
                INSERT INTO product_images (product_id, image_url, is_primary)
                VALUES ($1, $2, true)
            `, [productId, req.file.path]);
        }
        
        res.json({ success: true, productId });
    } catch (err) {
        console.error('Create product error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Update product
router.put('/staff/products/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, price, stock, category, description, is_active } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE products 
            SET name = $1, price = $2, stock = $3, category = $4, description = $5, is_active = $6,
                updated_at = NOW()
            WHERE id = $7
        `, [name, parseFloat(price), parseInt(stock), category, description, is_active === 'true', id]);
        
        if (req.file && req.file.path) {
            await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
            await client.query(`
                INSERT INTO product_images (product_id, image_url, is_primary)
                VALUES ($1, $2, true)
            `, [id, req.file.path]);
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Toggle product status
router.put('/staff/products/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('UPDATE products SET is_active = $1 WHERE id = $2', [is_active, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Toggle product error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// Delete product
router.delete('/staff/products/:id', async (req, res) => {
    const { id } = req.params;
    
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
        await client.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;




// ==========================================
// CUSTOMER DASHBOARD
// ==========================================
router.get('/customer/dashboard', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const client = await pool.connect();
    try {
        const session = sessions.get(token);
        if (!session) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }
        
        const userId = session.userId;
        
        const statsResult = await client.query(`
            SELECT 
                COALESCE(SUM(o.total_amount), 0) as total_spent,
                COUNT(DISTINCT o.id) as total_orders,
                COALESCE(c.loyalty_points, c.points, 0) as loyalty_points
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id AND o.order_status != 'CANCELLED'
            WHERE c.id = $1
            GROUP BY c.loyalty_points, c.points
        `, [userId]);
        
        const ordersResult = await client.query(`
            SELECT 
                o.id, 
                o.total_amount, 
                COALESCE(o.order_status, 'PENDING') as status, 
                o.created_at
            FROM orders o
            WHERE o.customer_id = $1
            ORDER BY o.created_at DESC
            LIMIT 5
        `, [userId]);
        
        const stats = statsResult.rows[0] || { total_spent: 0, total_orders: 0, loyalty_points: 0 };
        
        res.json({
            success: true,
            stats: {
                total_spent: parseFloat(stats.total_spent),
                total_orders: parseInt(stats.total_orders),
                loyalty_points: parseInt(stats.loyalty_points),
                loyalty_joined: parseInt(stats.loyalty_points) > 0
            },
            recent_orders: ordersResult.rows.map(order => ({
                id: order.id,
                total_amount: parseFloat(order.total_amount),
                status: order.status,
                created_at: order.created_at
            }))
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// CUSTOMER ORDERS
// ==========================================
router.get('/customer/orders', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const session = sessions.get(token);
    if (!session) {
        return res.status(401).json({ success: false, message: 'Invalid session' });
    }
    
    const userId = session.userId;
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT 
                o.id, 
                o.total_amount, 
                COALESCE(o.order_status, 'PENDING') as status, 
                o.created_at
            FROM orders o
            WHERE o.customer_id = $1
            ORDER BY o.created_at DESC
        `, [userId]);
        
        res.json({
            success: true,
            orders: result.rows.map(order => ({
                id: order.id,
                total_amount: parseFloat(order.total_amount),
                status: order.status,
                created_at: order.created_at
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
// CUSTOMER PRODUCTS
// ==========================================
router.get('/products', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT 
                p.id, 
                p.name, 
                p.price, 
                p.web_allocated_stock,
                p.category,
                COALESCE(p.description, '') as description,
                COALESCE(
                    (SELECT json_agg(json_build_object('url', pi.image_url, 'is_primary', pi.is_primary))
                     FROM product_images pi 
                     WHERE pi.product_id = p.id),
                    '[]'::json
                ) as images
            FROM products p
            WHERE p.is_active = true AND p.web_allocated_stock > 0
            ORDER BY p.id DESC
            LIMIT 50
        `);
        
        res.json({ 
            success: true, 
            products: result.rows.map(p => ({
                ...p,
                price: parseFloat(p.price),
                web_allocated_stock: parseInt(p.web_allocated_stock)
            }))
        });
    } catch (err) {
        console.error('Products error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// SINGLE PRODUCT
// ==========================================
router.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        const result = await client.query(`
            SELECT 
                p.id, 
                p.name, 
                p.price, 
                p.web_allocated_stock,
                p.category,
                COALESCE(p.description, '') as description,
                COALESCE(
                    (SELECT json_agg(json_build_object('url', pi.image_url, 'is_primary', pi.is_primary))
                     FROM product_images pi 
                     WHERE pi.product_id = p.id),
                    '[]'::json
                ) as images
            FROM products p
            WHERE p.id = $1 AND p.is_active = true
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        res.json({ 
            success: true, 
            product: {
                ...result.rows[0],
                price: parseFloat(result.rows[0].price),
                web_allocated_stock: parseInt(result.rows[0].web_allocated_stock)
            }
        });
    } catch (err) {
        console.error('Product error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// ==========================================
// ORDER DETAILS
// ==========================================
router.get('/orders/:id', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        const orderResult = await client.query(`
            SELECT 
                o.id, 
                o.total_amount, 
                o.payment_method,
                o.payment_status,
                COALESCE(o.order_status, 'PENDING') as order_status,
                o.created_at,
                o.delivery_address,
                o.delivery_city,
                o.delivery_phone,
                o.discount_code,
                o.discount_amount
            FROM orders o
            WHERE o.id = $1
        `, [id]);
        
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        const itemsResult = await client.query(`
            SELECT 
                oi.id,
                oi.product_id,
                p.name,
                oi.quantity,
                oi.price
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
        `, [id]);
        
        res.json({
            success: true,
            order: orderResult.rows[0],
            items: itemsResult.rows.map(item => ({
                ...item,
                price: parseFloat(item.price)
            }))
        });
    } catch (err) {
        console.error('Order details error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});
