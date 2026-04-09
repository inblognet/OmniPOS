const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); // Correctly pulling the pool object

// 1. GET CAROUSEL BANNERS
// Fetches active banners for the homepage hero section
router.get('/carousel', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT * FROM carousel_banners WHERE is_active = TRUE ORDER BY id DESC'
        );
        res.json({ success: true, banners: result.rows });
    } catch (error) {
        console.error("Carousel Fetch Error:", error);
        res.status(500).json({ success: false, message: "Failed to load banners" });
    } finally {
        client.release();
    }
});

// 2. GET CATEGORIES (New route for the filter bar)
router.get('/categories', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
        res.json({ success: true, categories: rows });
    } catch (error) {
        console.error("Categories Fetch Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. GET PRODUCTS (Now with Search & Category Filtering)
router.get('/products', async (req, res) => {
    const { search, category } = req.query; // Get search/category from the URL parameters
    const client = await pool.connect();

    try {
        let query = `
            SELECT
                p.id, p.name, p.sku, p.price, p.web_allocated_stock, p.category_id,
                COALESCE(
                    json_agg(
                        json_build_object('url', pi.image_url, 'is_primary', pi.is_primary)
                    ) FILTER (WHERE pi.id IS NOT NULL), '[]'
                ) as images
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE p.web_allocated_stock > 0
        `;

        const params = [];

        // Add search filter if provided
        if (search) {
            params.push(`%${search}%`);
            // ILIKE makes the search case-insensitive
            query += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
        }

        // Add category filter if provided
        if (category) {
            params.push(category);
            query += ` AND p.category_id = $${params.length}`;
        }

        query += ` GROUP BY p.id ORDER BY p.id DESC`;

        const { rows } = await client.query(query, params);
        res.json({ success: true, products: rows });
    } catch (error) {
        console.error("Fetch Products Error:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// 4. POST CHECKOUT (Now with Loyalty Points!)
router.post('/checkout', async (req, res) => {
    const { items, totalAmount, paymentMethod, customerId } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Create the order
        const orderResult = await client.query(
            `INSERT INTO orders (total_amount, payment_method, payment_status, customer_id)
             VALUES ($1, $2, 'PENDING', $3) RETURNING id`,
            [totalAmount, paymentMethod || 'COD', customerId || null]
        );
        const orderId = orderResult.rows[0].id;

        // 2. Insert items and deduct stock
        for (let item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, item.id, item.quantity, item.price]
            );

            await client.query(
                `UPDATE products SET web_allocated_stock = web_allocated_stock - $1
                 WHERE id = $2 AND web_allocated_stock >= $1`,
                [item.quantity, item.id]
            );
        }

        // 3. NEW: Award Loyalty Points (1 point per $10 spent)
        let pointsEarned = 0;
        if (customerId) {
            pointsEarned = Math.floor(totalAmount / 10);
            if (pointsEarned > 0) {
                // COALESCE ensures that if points is NULL, it treats it as 0 before adding
                await client.query(
                    `UPDATE customers SET points = COALESCE(points, 0) + $1 WHERE id = $2`,
                    [pointsEarned, customerId]
                );
            }
        }

        await client.query('COMMIT');
        res.json({
            success: true,
            orderId: orderId,
            pointsEarned: pointsEarned, // Send back how many points they earned
            message: "Order placed successfully!"
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Checkout Error:", error);
        res.status(500).json({ success: false, message: "Checkout failed" });
    } finally {
        client.release();
    }
});

// ==========================================
// ADMIN ROUTES (Store Owner Features)
// ==========================================

// 5. GET ALL ORDERS (For the Admin Dashboard)
router.get('/admin/orders', async (req, res) => {
    const client = await pool.connect();
    try {
        // We join 4 tables here to get the full picture: Orders, Customers, Order Items, and Products!
        const query = `
            SELECT
                o.id, o.total_amount, o.payment_method, o.payment_status, o.created_at,
                c.name as customer_name, c.email as customer_email,
                json_agg(
                    json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price)
                ) as items
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id, c.name, c.email
            ORDER BY o.created_at DESC;
        `;

        const { rows } = await client.query(query);
        res.json({ success: true, orders: rows });
    } catch (error) {
        console.error("Fetch Admin Orders Error:", error);
        res.status(500).json({ success: false, message: "Failed to load orders" });
    } finally {
        client.release();
    }
});

// 6. UPDATE ORDER STATUS (Admin marking as Shipped/Completed)
router.put('/admin/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const client = await pool.connect();

    try {
        await client.query(
            'UPDATE orders SET payment_status = $1 WHERE id = $2',
            [status, id]
        );
        res.json({ success: true, message: `Order #${id} marked as ${status}` });
    } catch (error) {
        console.error("Update Order Status Error:", error);
        res.status(500).json({ success: false, message: "Failed to update status" });
    } finally {
        client.release();
    }
});

module.exports = router;