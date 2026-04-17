const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { upload } = require('../config/cloudinary');

// 1. GET CAROUSEL BANNERS
router.get('/carousel', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM carousel_banners WHERE is_active = TRUE ORDER BY id DESC');
        res.json({ success: true, banners: result.rows });
    } catch (error) {
        console.error("Carousel Fetch Error:", error);
        res.status(500).json({ success: false, message: "Failed to load banners" });
    } finally {
        client.release();
    }
});

// 2. GET CATEGORIES
router.get('/categories', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT DISTINCT p.category AS id, p.category AS name, ci.image_url
            FROM products p
            LEFT JOIN category_images ci ON p.category = ci.category
            WHERE p.category IS NOT NULL
            ORDER BY p.category ASC
        `);
        res.json({ success: true, categories: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. GET PRODUCTS (Now pulls description too!)
router.get('/products', async (req, res) => {
    const { search, category } = req.query;
    const client = await pool.connect();

    try {
        let query = `
            SELECT
                p.id, p.name, p.sku, p.price, p.web_allocated_stock, p.category, p.description,
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
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
        }
        if (category) {
            params.push(category);
            query += ` AND p.category = $${params.length}`;
        }

        query += ` GROUP BY p.id ORDER BY p.id DESC`;

        const { rows } = await client.query(query, params);
        res.json({ success: true, products: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
});

// 4. POST CHECKOUT
router.post('/checkout', async (req, res) => {
    const { items, totalAmount, paymentMethod, customerId } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const orderResult = await client.query(
            `INSERT INTO orders (total_amount, payment_method, payment_status, order_status, customer_id)
             VALUES ($1, $2, 'PENDING', 'PENDING', $3) RETURNING id`,
            [totalAmount, paymentMethod || 'COD', customerId || null]
        );
        const orderId = orderResult.rows[0].id;

        for (let item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)`,
                [orderId, item.id, item.quantity, item.price]
            );
            await client.query(
                `UPDATE products SET web_allocated_stock = web_allocated_stock - $1 WHERE id = $2 AND web_allocated_stock >= $1`,
                [item.quantity, item.id]
            );
        }

        let pointsEarned = 0;
        if (customerId) {
            pointsEarned = Math.floor(totalAmount / 10);
            if (pointsEarned > 0) {
                await client.query(`UPDATE customers SET points = COALESCE(points, 0) + $1 WHERE id = $2`, [pointsEarned, customerId]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, orderId: orderId, pointsEarned: pointsEarned, message: "Order placed successfully!" });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: "Checkout failed" });
    } finally {
        client.release();
    }
});

// ==========================================
// ADMIN ROUTES (Store Owner Features)
// ==========================================

// 5. GET ALL ORDERS (Now includes Statuses, Slips, and Notes!)
router.get('/admin/orders', async (req, res) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT
                o.id, o.total_amount, o.payment_method, o.payment_status, o.order_status,
                o.payment_slip_url, o.admin_note, o.created_at,
                c.name as customer_name, c.email as customer_email,
                json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price)) as items
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
        res.status(500).json({ success: false, message: "Failed to load orders" });
    } finally {
        client.release();
    }
});

// 6. UPDATE ORDER STATUS (Legacy simple update)
router.put('/admin/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const client = await pool.connect();
    try {
        await client.query('UPDATE orders SET payment_status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true, message: `Order #${id} marked as ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update status" });
    } finally {
        client.release();
    }
});

// 7-10. BANNER ROUTES
router.get('/admin/banners', async (req, res) => {
    const client = await pool.connect();
    try { res.json({ success: true, banners: (await client.query('SELECT * FROM carousel_banners ORDER BY id DESC')).rows }); }
    catch (e) { res.status(500).json({ success: false }); } finally { client.release(); }
});
router.post('/admin/banners', async (req, res) => {
    const { image_url, title, subtitle, link_url } = req.body;
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`INSERT INTO carousel_banners (image_url, title, subtitle, link_url, is_active) VALUES ($1, $2, $3, $4, TRUE) RETURNING *`, [image_url, title, subtitle, link_url || null]);
        res.json({ success: true, banner: rows[0] });
    } catch (e) { res.status(500).json({ success: false }); } finally { client.release(); }
});
router.put('/admin/banners/:id/toggle', async (req, res) => {
    const client = await pool.connect();
    try { await client.query('UPDATE carousel_banners SET is_active = NOT is_active WHERE id = $1', [req.params.id]); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); } finally { client.release(); }
});
router.delete('/admin/banners/:id', async (req, res) => {
    const client = await pool.connect();
    try { await client.query('DELETE FROM carousel_banners WHERE id = $1', [req.params.id]); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// ==========================================
// ADMIN INVENTORY ROUTES
// ==========================================

// 11. GET ALL PRODUCTS
router.get('/admin/products', async (req, res) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT
                p.id, p.name, p.sku, p.price, p.web_allocated_stock, p.category, p.description,
                COALESCE(json_agg(json_build_object('url', pi.image_url, 'is_primary', pi.is_primary)) FILTER (WHERE pi.id IS NOT NULL), '[]') as images
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id
            GROUP BY p.id ORDER BY p.id DESC;
        `;
        const { rows } = await client.query(query);
        res.json({ success: true, products: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to load inventory" });
    } finally {
        client.release();
    }
});

// 12. ADD NEW PRODUCT
router.post('/admin/products', upload.single('image'), async (req, res) => {
    const { name, sku, price, web_allocated_stock, category } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const productResult = await client.query(
            `INSERT INTO products (name, sku, price, web_allocated_stock, category) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [name, sku, price, web_allocated_stock, category]
        );
        if (req.file && req.file.path) {
            await client.query(`INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, TRUE)`, [productResult.rows[0].id, req.file.path]);
        }
        await client.query('COMMIT');
        res.json({ success: true, message: "Product added successfully!" });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: "Failed to add product" });
    } finally { client.release(); }
});

// 13. UPDATE PRODUCT
router.put('/admin/products/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, web_allocated_stock, price } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE products SET name = $1, web_allocated_stock = $2, price = $3 WHERE id = $4', [name, web_allocated_stock, price, id]);
        if (req.file && req.file.path) {
            await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
            await client.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, TRUE)', [id, req.file.path]);
        }
        await client.query('COMMIT');
        res.json({ success: true, message: "Product updated successfully" });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: "Failed to update product" });
    } finally { client.release(); }
});

// 14. DELETE PRODUCT
router.delete('/admin/products/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM product_images WHERE product_id = $1', [req.params.id]);
        await client.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        await client.query('COMMIT');
        res.json({ success: true, message: "Product deleted" });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false });
    } finally { client.release(); }
});

// 15. UPLOAD CATEGORY IMAGE
router.post('/admin/categories/upload', upload.single('image'), async (req, res) => {
    const { category } = req.body;
    const client = await pool.connect();
    try {
        if (!req.file || !req.file.path) return res.status(400).json({ success: false });
        await client.query('BEGIN');
        await client.query('DELETE FROM category_images WHERE category = $1', [category]);
        await client.query('INSERT INTO category_images (category, image_url) VALUES ($1, $2)', [category, req.file.path]);
        await client.query('COMMIT');
        res.json({ success: true, image_url: req.file.path });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false });
    } finally { client.release(); }
});

// ==========================================
// NEW PHASE 2 ROUTES (Slips, Chats, Reviews, Slugs)
// ==========================================

// 16. GET SINGLE PRODUCT (For the Slug Page)
router.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        // Fetch Product
        const productRes = await client.query(`
            SELECT p.*, COALESCE(json_agg(json_build_object('url', pi.image_url, 'is_primary', pi.is_primary)) FILTER (WHERE pi.id IS NOT NULL), '[]') as images
            FROM products p LEFT JOIN product_images pi ON p.id = pi.product_id WHERE p.id = $1 GROUP BY p.id
        `, [id]);
        if (productRes.rows.length === 0) return res.status(404).json({ success: false, message: "Not found" });

        // Fetch Reviews
        const reviewRes = await client.query(`
            SELECT pr.*, c.name as customer_name FROM product_reviews pr
            JOIN customers c ON pr.customer_id = c.id WHERE pr.product_id = $1 ORDER BY pr.created_at DESC
        `, [id]);

        res.json({ success: true, product: productRes.rows[0], reviews: reviewRes.rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 17. GET CUSTOMER SPECIFIC ORDERS (For Customer /orders page)
router.get('/customer/:customerId/orders', async (req, res) => {
    const { customerId } = req.params;
    const client = await pool.connect();
    try {
        const query = `
            SELECT o.*, json_agg(json_build_object('product_id', p.id, 'name', p.name, 'quantity', oi.quantity, 'price', oi.price)) as items
            FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.customer_id = $1 GROUP BY o.id ORDER BY o.created_at DESC;
        `;
        res.json({ success: true, orders: (await client.query(query, [customerId])).rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 18. UPLOAD PAYMENT SLIP
router.post('/orders/:id/slip', upload.single('slip'), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        if (!req.file || !req.file.path) return res.status(400).json({ success: false, message: "No slip uploaded." });
        await client.query('UPDATE orders SET payment_slip_url = $1 WHERE id = $2', [req.file.path, id]);
        res.json({ success: true, slip_url: req.file.path, message: "Slip uploaded!" });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 19. GET ORDER CHATS
router.get('/orders/:id/chat', async (req, res) => {
    const client = await pool.connect();
    try { res.json({ success: true, chats: (await client.query('SELECT * FROM order_chats WHERE order_id = $1 ORDER BY created_at ASC', [req.params.id])).rows }); }
    catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 20. SEND CHAT MESSAGE
router.post('/orders/:id/chat', async (req, res) => {
    const { sender_type, message } = req.body;
    const client = await pool.connect();
    try {
        const { rows } = await client.query('INSERT INTO order_chats (order_id, sender_type, message) VALUES ($1, $2, $3) RETURNING *', [req.params.id, sender_type, message]);
        res.json({ success: true, chat: rows[0] });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 21. POST PRODUCT REVIEW
router.post('/products/:id/reviews', async (req, res) => {
    const { customerId, orderId, rating, comment } = req.body;
    const client = await pool.connect();
    try {
        await client.query('INSERT INTO product_reviews (product_id, customer_id, order_id, rating, comment) VALUES ($1, $2, $3, $4, $5)', [req.params.id, customerId, orderId, rating, comment]);
        res.json({ success: true, message: "Review added!" });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 22. ADMIN UPDATE ORDER ADVANCED (Delivery Status, Payment Status, Admin Note)
router.put('/admin/orders/:id/advanced', async (req, res) => {
    const { order_status, payment_status, admin_note } = req.body;
    const client = await pool.connect();
    try {
        await client.query('UPDATE orders SET order_status = $1, payment_status = $2, admin_note = $3 WHERE id = $4', [order_status, payment_status, admin_note, req.params.id]);
        res.json({ success: true, message: "Order updated successfully" });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

module.exports = router;