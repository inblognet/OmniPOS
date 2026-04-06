const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); // Correctly pulling the pool object

// 1. GET PRODUCTS (For the website catalog)
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

// 2. POST CHECKOUT (The critical one!)
// POST /api/web/checkout
router.post('/checkout', async (req, res) => {
    // We added paymentMethod here to catch it from the frontend
    const { items, totalAmount, paymentMethod } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Create the order, now including payment method and status!
        const orderResult = await client.query(
            `INSERT INTO orders (total_amount, payment_method, payment_status)
             VALUES ($1, $2, 'PENDING') RETURNING id`,
            [totalAmount, paymentMethod || 'COD']
        );
        const orderId = orderResult.rows[0].id;

        // 2. Insert items and deduct stock
        for (let item of items) {
            // Insert into order_items
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, item.productId, item.quantity, item.price]
            );

            // Deduct from web_allocated_stock
            await client.query(
                `UPDATE products SET web_allocated_stock = web_allocated_stock - $1
                 WHERE id = $2 AND web_allocated_stock >= $1`,
                [item.quantity, item.productId]
            );
        }

        await client.query('COMMIT'); // Lock it in
        res.json({ success: true, orderId: orderId, message: "Order placed successfully!" });
    } catch (error) {
        await client.query('ROLLBACK'); // Cancel if anything fails
        console.error("Checkout Error:", error);
        res.status(500).json({ success: false, message: "Checkout failed" });
    } finally {
        client.release();
    }
});

module.exports = router;