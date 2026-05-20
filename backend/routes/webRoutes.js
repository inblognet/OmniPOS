const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { upload } = require('../config/cloudinary');
const puppeteer = require('puppeteer');

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

// 3. GET PRODUCTS (Public Storefront)
router.get('/products', async (req, res) => {
    const { search, category } = req.query;
    const client = await pool.connect();

    try {
        let query = `
            SELECT
                p.id, p.name, p.sku, p.price, p.web_allocated_stock, p.category, p.description, p.is_active,
                COALESCE(
                    json_agg(
                        json_build_object('url', pi.image_url, 'is_primary', pi.is_primary)
                    ) FILTER (WHERE pi.id IS NOT NULL), '[]'
                ) as images
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id
            WHERE p.web_allocated_stock > 0 AND p.is_active = TRUE
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
    const { items, totalAmount, paymentMethod, customerId, delivery_phone, delivery_address, delivery_city, delivery_postal_code, discount_code, discount_amount } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const orderResult = await client.query(
            `INSERT INTO orders (total_amount, payment_method, payment_status, order_status, customer_id, delivery_phone, delivery_address, delivery_city, delivery_postal_code, discount_code, discount_amount)
             VALUES ($1, $2, 'PENDING', 'PENDING', $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [totalAmount, paymentMethod || 'COD', customerId || null, delivery_phone, delivery_address, delivery_city, delivery_postal_code, discount_code || null, discount_amount || 0.00]
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
                await client.query(`
                    INSERT INTO notifications (customer_id, category, type, title, message, action_url)
                    VALUES ($1, 'PERSONAL', 'POINTS', 'Points Earned!', 'You earned ' || $2 || ' points from your recent purchase.', '/profile')
                `, [customerId, pointsEarned]);
            }
            await client.query(`DELETE FROM cart_items WHERE customer_id = $1`, [customerId]);
            if (discount_code) {
                const vRes = await client.query('SELECT id FROM vouchers WHERE code = $1', [discount_code]);
                if (vRes.rows.length > 0) {
                    await client.query(
                        'UPDATE customer_vouchers SET status = $1, used_at = NOW() WHERE customer_id = $2 AND voucher_id = $3',
                        ['USED', customerId, vRes.rows[0].id]
                    );
                }
            }
            await client.query(`
                INSERT INTO notifications (customer_id, category, type, title, message, action_url)
                VALUES ($1, 'PERSONAL', 'ORDER', 'Order Placed Successfully!', 'Your order #' || $2 || ' is now pending.', '/orders')
            `, [customerId, orderId]);
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

// VOUCHER SYSTEM ROUTES
router.get('/vouchers/public', async (req, res) => {
    const { customerId } = req.query;
    const client = await pool.connect();
    try {
        let query = `SELECT v.id, v.code, v.discount_percentage, v.description, v.image_url, v.expire_date_time FROM vouchers v WHERE v.is_active = TRUE AND v.is_public = TRUE AND (v.expire_date_time IS NULL OR v.expire_date_time > NOW()) ORDER BY v.created_at DESC`;
        const { rows: vouchers } = await client.query(query);
        if (customerId) {
            const { rows: claims } = await client.query('SELECT voucher_id, status FROM customer_vouchers WHERE customer_id = $1', [customerId]);
            const claimMap = claims.reduce((acc, curr) => { acc[curr.voucher_id] = curr.status; return acc; }, {});
            return res.json({ success: true, vouchers: vouchers.map(v => ({ ...v, claim_status: claimMap[v.id] || null })) });
        }
        res.json({ success: true, vouchers: vouchers.map(v => ({ ...v, claim_status: null })) });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.post('/vouchers/claim', async (req, res) => {
    const { customerId, voucherId } = req.body;
    const client = await pool.connect();
    try {
        await client.query('INSERT INTO customer_vouchers (customer_id, voucher_id, status) VALUES ($1, $2, $3)', [customerId, voucherId, 'CLAIMED']);
        res.json({ success: true, message: "Voucher claimed successfully!" });
    } catch (error) { res.status(500).json({ success: false, message: "You already claimed this voucher." }); } finally { client.release(); }
});

router.post('/vouchers/validate', async (req, res) => {
    const { code, customerId } = req.body;
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`SELECT * FROM vouchers WHERE code = $1 AND is_active = TRUE AND (expire_date_time IS NULL OR expire_date_time > NOW())`, [code.toUpperCase().trim()]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Invalid or expired voucher code." });
        const voucher = rows[0];
        if (customerId) {
            const checkUse = await client.query('SELECT status FROM customer_vouchers WHERE customer_id = $1 AND voucher_id = $2', [customerId, voucher.id]);
            if (checkUse.rows.length > 0 && checkUse.rows[0].status === 'USED') return res.status(400).json({ success: false, message: "Already used." });
        }
        res.json({ success: true, discount_percentage: voucher.discount_percentage, description: voucher.description });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// ADMIN PRODUCT ROUTES
router.get('/admin/products', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
            SELECT p.id, p.name, p.sku, p.price, p.web_allocated_stock, p.category, p.description, p.is_active,
            COALESCE(json_agg(json_build_object('url', pi.image_url, 'is_primary', pi.is_primary)) FILTER (WHERE pi.id IS NOT NULL), '[]') as images
            FROM products p LEFT JOIN product_images pi ON p.id = pi.product_id GROUP BY p.id ORDER BY p.id DESC;
        `);
        res.json({ success: true, products: rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 🔥 FIXED: Handles Cloudinary secure_url properly for image uploads
router.post('/admin/products', upload.single('image'), async (req, res) => {
    const { name, sku, price, web_allocated_stock, category, description } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const productResult = await client.query(
            `INSERT INTO products (name, sku, price, web_allocated_stock, category, description, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
            [name, sku, price, web_allocated_stock, category, description || '']
        );

        if (req.file) {
            const imageUrl = req.file.secure_url || req.file.path || req.file.url;
            if (imageUrl) {
                await client.query(`INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, TRUE)`, [productResult.rows[0].id, imageUrl]);
            }
        }
        await client.query('COMMIT');
        res.json({ success: true, message: "Product added successfully!" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Add Product Error:", error);
        res.status(500).json({ success: false, message: "Failed to add product" });
    } finally { client.release(); }
});

// 🔥 FIXED: Includes sku and category in the update payload and handles secure_url
router.put('/admin/products/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, sku, category, web_allocated_stock, price, description, is_active } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            'UPDATE products SET name=$1, sku=$2, category=$3, web_allocated_stock=$4, price=$5, description=$6, is_active=$7 WHERE id=$8',
            [name, sku, category, web_allocated_stock, price, description || '', is_active === 'true', id]
        );

        if (req.file) {
            const imageUrl = req.file.secure_url || req.file.path || req.file.url;
            if (imageUrl) {
                await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
                await client.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, TRUE)', [id, imageUrl]);
            }
        }
        await client.query('COMMIT');
        res.json({ success: true, message: "Product updated successfully" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Update Product Error:", error);
        res.status(500).json({ success: false, message: "Failed to update product" });
    } finally { client.release(); }
});

router.delete('/admin/products/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM product_images WHERE product_id = $1', [req.params.id]);
        await client.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        await client.query('COMMIT');
        res.json({ success: true, message: "Product deleted" });
    } catch (error) { await client.query('ROLLBACK'); res.status(500).json({ success: false }); } finally { client.release(); }
});

// ... (KEEP ALL YOUR EXISTING BANNER, ORDER, CHAT, CATEGORY, WISHLIST, TEMPLATE, AND SETTING ROUTES HERE)
// I have removed them from this block for brevity to ensure you can copy/paste the critical product routes easily.
// Just ensure you paste this updated product logic into your existing file structure.

module.exports = router;