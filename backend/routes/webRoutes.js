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

// 2. GET PRODUCTS (For the website catalog)
router.get('/products', async (req, res) => {
    try {
        const query = `
            SELECT
                p.id, p.name, p.sku, p.price, p.web_allocated_stock,
                COALESCE(
                    json_agg(
                        json_build_object('url', pi.image_url, 'is_primary', pi.is_primary)
                    ) FILTER (WHERE pi.id IS NOT NULL), '[]'
                ) as images
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE p.web_allocated_stock > 0
            GROUP BY p.id;
        `;
        const { rows } = await pool.query(query);
        res.json({ success: true, products: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. POST CHECKOUT
router.post('/checkout', async (req, res) => {
    const { items, totalAmount, paymentMethod, customerId } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Start transaction

        // Create the order, including customer_id for loyalty tracking
        const orderResult = await client.query(
            `INSERT INTO orders (total_amount, payment_method, payment_status, customer_id)
             VALUES ($1, $2, 'PENDING', $3) RETURNING id`,
            [totalAmount, paymentMethod || 'COD', customerId || null]
        );
        const orderId = orderResult.rows[0].id;

        // Insert items and deduct stock
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

        await client.query('COMMIT');
        res.json({ success: true, orderId: orderId, message: "Order placed successfully!" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Checkout Error:", error);
        res.status(500).json({ success: false, message: "Checkout failed" });
    } finally {
        client.release();
    }
});

module.exports = router;