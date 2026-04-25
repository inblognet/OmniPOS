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

// 4. POST CHECKOUT (🔥 UPDATED to generate notifications AND mark vouchers as used!)
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

                // 🔥 NOTIFICATION: POINTS EARNED
                await client.query(`
                    INSERT INTO notifications (customer_id, category, type, title, message, action_url)
                    VALUES ($1, 'PERSONAL', 'POINTS', 'Points Earned!', 'You earned ' || $2 || ' points from your recent purchase.', '/profile')
                `, [customerId, pointsEarned]);
            }

            // Wipe the cloud cart clean since they bought the items!
            await client.query(`DELETE FROM cart_items WHERE customer_id = $1`, [customerId]);

            // 🔥 NEW: Mark the voucher as USED if one was applied
            if (discount_code) {
                // Find the voucher ID from the code
                const vRes = await client.query('SELECT id FROM vouchers WHERE code = $1', [discount_code]);
                if (vRes.rows.length > 0) {
                    await client.query(
                        'UPDATE customer_vouchers SET status = $1, used_at = NOW() WHERE customer_id = $2 AND voucher_id = $3',
                        ['USED', customerId, vRes.rows[0].id]
                    );
                }
            }

            // 🔥 NOTIFICATION: ORDER PLACED
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

// ==========================================
// VOUCHER SYSTEM ROUTES
// ==========================================

// 1. PUBLIC: Get all active, public vouchers (and check if the user claimed them)
router.get('/vouchers/public', async (req, res) => {
    const { customerId } = req.query;
    const client = await pool.connect();
    try {
        let query = `
            SELECT v.id, v.code, v.discount_percentage, v.description, v.image_url, v.expire_date_time
            FROM vouchers v
            WHERE v.is_active = TRUE AND v.is_public = TRUE
            AND (v.expire_date_time IS NULL OR v.expire_date_time > NOW())
            ORDER BY v.created_at DESC
        `;
        const { rows: vouchers } = await client.query(query);

        // If user is logged in, attach their claim status
        if (customerId) {
            const { rows: claims } = await client.query('SELECT voucher_id, status FROM customer_vouchers WHERE customer_id = $1', [customerId]);
            const claimMap = claims.reduce((acc, curr) => {
                acc[curr.voucher_id] = curr.status; // 'CLAIMED' or 'USED'
                return acc;
            }, {});

            const mappedVouchers = vouchers.map(v => ({
                ...v,
                claim_status: claimMap[v.id] || null // null means not claimed yet
            }));
            return res.json({ success: true, vouchers: mappedVouchers });
        }

        res.json({ success: true, vouchers: vouchers.map(v => ({ ...v, claim_status: null })) });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 2. CUSTOMER: Claim a voucher
router.post('/vouchers/claim', async (req, res) => {
    const { customerId, voucherId } = req.body;
    const client = await pool.connect();
    try {
        await client.query(
            'INSERT INTO customer_vouchers (customer_id, voucher_id, status) VALUES ($1, $2, $3)',
            [customerId, voucherId, 'CLAIMED']
        );
        res.json({ success: true, message: "Voucher claimed successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "You already claimed this voucher." });
    } finally { client.release(); }
});


// 🔥 NEW: Validate a voucher code during checkout
router.post('/vouchers/validate', async (req, res) => {
    const { code, customerId } = req.body;
    const client = await pool.connect();
    try {
        // 1. Check if it exists, is active, AND hasn't expired yet
        const { rows } = await client.query(`
            SELECT * FROM vouchers
            WHERE code = $1
            AND is_active = TRUE
            AND (expire_date_time IS NULL OR expire_date_time > NOW())
        `, [code.toUpperCase().trim()]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Invalid or expired voucher code." });
        }

        const voucher = rows[0];

        // 2. Check if this specific customer has ALREADY USED it
        if (customerId) {
            const checkUse = await client.query('SELECT status FROM customer_vouchers WHERE customer_id = $1 AND voucher_id = $2', [customerId, voucher.id]);
            if (checkUse.rows.length > 0 && checkUse.rows[0].status === 'USED') {
                return res.status(400).json({ success: false, message: "You have already used this voucher on a previous order." });
            }
        }

        res.json({ success: true, discount_percentage: voucher.discount_percentage, description: voucher.description });
    } catch (error) {
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});


// 3. ADMIN: Get all vouchers
router.get('/admin/vouchers', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT * FROM vouchers ORDER BY created_at DESC');
        res.json({ success: true, vouchers: rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 4. ADMIN: Create a voucher (with image upload)
router.post('/admin/vouchers', upload.single('image'), async (req, res) => {
    const { code, discount_percentage, description, expire_date_time, is_public } = req.body;
    const imageUrl = req.file ? req.file.path : null;
    const client = await pool.connect();
    try {
        await client.query(
            'INSERT INTO vouchers (code, discount_percentage, description, expire_date_time, is_public, image_url) VALUES ($1, $2, $3, $4, $5, $6)',
            [code.toUpperCase(), discount_percentage, description, expire_date_time || null, is_public === 'true', imageUrl]
        );
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: "Code might already exist." }); } finally { client.release(); }
});

// 5. ADMIN: Toggle Active Status
router.put('/admin/vouchers/:id/toggle', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('UPDATE vouchers SET is_active = NOT is_active WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// 6. ADMIN: Delete Voucher
router.delete('/admin/vouchers/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM vouchers WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

router.get('/admin/orders', async (req, res) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT
                o.id, o.total_amount, o.payment_method, o.payment_status, o.order_status,
                o.payment_slip_url, o.admin_note, o.created_at, o.discount_code, o.discount_amount,
                o.delivery_phone, o.delivery_address, o.delivery_city, o.delivery_postal_code,
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

router.get('/admin/products', async (req, res) => {
    const client = await pool.connect();
    try {
        const query = `
            SELECT
                p.id, p.name, p.sku, p.price, p.web_allocated_stock, p.category, p.description, p.is_active,
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

router.post('/admin/products', upload.single('image'), async (req, res) => {
    const { name, sku, price, web_allocated_stock, category, description } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const productResult = await client.query(
            `INSERT INTO products (name, sku, price, web_allocated_stock, category, description, is_active) VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
            [name, sku, price, web_allocated_stock, category, description || '']
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

router.put('/admin/products/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, web_allocated_stock, price, description, is_active } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            'UPDATE products SET name = $1, web_allocated_stock = $2, price = $3, description = $4, is_active = $5 WHERE id = $6',
            [name, web_allocated_stock, price, description || '', is_active === 'true', id]
        );
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
// PUBLIC & CUSTOMER ROUTES
// ==========================================

router.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const productRes = await client.query(`
            SELECT p.*, COALESCE(json_agg(json_build_object('url', pi.image_url, 'is_primary', pi.is_primary)) FILTER (WHERE pi.id IS NOT NULL), '[]') as images
            FROM products p LEFT JOIN product_images pi ON p.id = pi.product_id WHERE p.id = $1 GROUP BY p.id
        `, [id]);
        if (productRes.rows.length === 0) return res.status(404).json({ success: false, message: "Not found" });

        const reviewRes = await client.query(`
            SELECT pr.*, c.name as customer_name FROM product_reviews pr
            JOIN customers c ON pr.customer_id = c.id WHERE pr.product_id = $1 ORDER BY pr.created_at DESC
        `, [id]);

        res.json({ success: true, product: productRes.rows[0], reviews: reviewRes.rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

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

router.post('/orders/:id/slip', upload.single('slip'), async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        if (!req.file || !req.file.path) return res.status(400).json({ success: false, message: "No slip uploaded." });
        await client.query('UPDATE orders SET payment_slip_url = $1 WHERE id = $2', [req.file.path, id]);
        res.json({ success: true, slip_url: req.file.path, message: "Slip uploaded!" });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.get('/orders/:id/chat', async (req, res) => {
    const client = await pool.connect();
    try { res.json({ success: true, chats: (await client.query('SELECT * FROM order_chats WHERE order_id = $1 ORDER BY created_at ASC', [req.params.id])).rows }); }
    catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.post('/orders/:id/chat', async (req, res) => {
    const { sender_type, message } = req.body;
    const client = await pool.connect();
    try {
        const { rows } = await client.query('INSERT INTO order_chats (order_id, sender_type, message) VALUES ($1, $2, $3) RETURNING *', [req.params.id, sender_type, message]);

        if (sender_type === 'ADMIN') {
            const orderRes = await client.query('SELECT customer_id FROM orders WHERE id = $1', [req.params.id]);
            const customerId = orderRes.rows[0]?.customer_id;

            if (customerId) {
                await client.query(`
                    INSERT INTO notifications (customer_id, category, type, title, message, action_url)
                    VALUES ($1, 'PERSONAL', 'SYSTEM', 'New Support Message', 'OmniStore sent a message regarding order #' || $2 || '.', '/orders')
                `, [customerId, req.params.id]);
            }
        }

        res.json({ success: true, chat: rows[0] });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.post('/products/:id/reviews', async (req, res) => {
    const { customerId, orderId, rating, comment } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            'INSERT INTO product_reviews (product_id, customer_id, order_id, rating, comment) VALUES ($1, $2, $3, $4, $5)',
            [req.params.id, customerId, orderId, rating, comment]
        );

        const infoRes = await client.query(`
            SELECT p.name as product_name, c.name as customer_name
            FROM products p, customers c
            WHERE p.id = $1 AND c.id = $2
        `, [req.params.id, customerId]);

        const productName = infoRes.rows[0]?.product_name || 'a product';
        const customerName = infoRes.rows[0]?.customer_name || 'A customer';
        const firstName = customerName.split(' ')[0];

        await client.query(`
            INSERT INTO notifications (customer_id, category, type, title, message, action_url)
            VALUES (NULL, 'PUBLIC', 'REVIEW', 'New Customer Review!', $1, $2)
        `, [`${firstName} left a ${rating}-star review for ${productName}.`, `/product/${req.params.id}`]);

        await client.query('COMMIT');
        res.json({ success: true, message: "Review added!" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Failed to post review:", error);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

router.put('/admin/orders/:id/advanced', async (req, res) => {
    const { order_status, payment_status, admin_note } = req.body;
    const client = await pool.connect();
    try {
        await client.query('UPDATE orders SET order_status = $1, payment_status = $2, admin_note = $3 WHERE id = $4', [order_status, payment_status, admin_note, req.params.id]);

        const orderRes = await client.query('SELECT customer_id FROM orders WHERE id = $1', [req.params.id]);
        const customerId = orderRes.rows[0]?.customer_id;

        if (customerId) {
            await client.query(`
                INSERT INTO notifications (customer_id, category, type, title, message, action_url)
                VALUES ($1, 'PERSONAL', 'ORDER', 'Order Status Updated', 'Your order #' || $2 || ' is now marked as ' || $3 || '.', '/orders')
            `, [customerId, req.params.id, order_status]);
        }

        res.json({ success: true, message: "Order updated successfully" });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.get('/customers/:id/profile', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT id, name, email, phone, address, city, postal_code, points FROM customers WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Customer not found" });
        res.json({ success: true, profile: rows[0] });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.put('/customers/:id/profile', async (req, res) => {
    const { id } = req.params;
    const { phone, address, city, postal_code } = req.body;
    const client = await pool.connect();
    try {
        await client.query(
            'UPDATE customers SET phone = $1, address = $2, city = $3, postal_code = $4 WHERE id = $5',
            [phone, address, city, postal_code, id]
        );
        res.json({ success: true, message: "Profile updated successfully" });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// ==========================================
// CLOUD CART ROUTES
// ==========================================

router.get('/customers/:id/cart', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const query = `
            SELECT c.product_id as id, p.name, p.price, c.quantity,
                   COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1),
                            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1)) as "imageUrl"
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.customer_id = $1
        `;
        const { rows } = await client.query(query, [id]);
        res.json({ success: true, cart: rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.post('/customers/:id/cart', async (req, res) => {
    const { id } = req.params;
    const { product_id, quantity } = req.body;
    const client = await pool.connect();
    try {
        if (quantity <= 0) {
            await client.query('DELETE FROM cart_items WHERE customer_id = $1 AND product_id = $2', [id, product_id]);
        } else {
            await client.query(`
                INSERT INTO cart_items (customer_id, product_id, quantity)
                VALUES ($1, $2, $3)
                ON CONFLICT (customer_id, product_id)
                DO UPDATE SET quantity = EXCLUDED.quantity
            `, [id, product_id, quantity]);
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

// ==========================================
// STORE SETTINGS & THEME ROUTES
// ==========================================

router.get('/settings', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT * FROM web_settings WHERE id = 1');
        res.json({ success: true, settings: rows[0] || {} });
    } catch (error) {
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

router.put('/admin/settings', async (req, res) => {
    const {
        store_name, phone_number, email_address, address, tax_rate, currency_symbol,
        theme_primary, theme_navbar, theme_sidebar, theme_background, theme_card,
        theme_text, theme_sidebar_text, theme_label, theme_sub_text
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE web_settings SET
            store_name = $1, phone_number = $2, email_address = $3, address = $4, tax_rate = $5, currency_symbol = $6,
            theme_primary = $7, theme_navbar = $8, theme_sidebar = $9, theme_background = $10, theme_card = $11,
            theme_text = $12, theme_sidebar_text = $13, theme_label = $14, theme_sub_text = $15
            WHERE id = 1
        `, [
            store_name, phone_number, email_address, address, tax_rate, currency_symbol,
            theme_primary, theme_navbar, theme_sidebar, theme_background, theme_card,
            theme_text, theme_sidebar_text, theme_label, theme_sub_text
        ]);
        res.json({ success: true, message: "Settings saved!" });
    } catch (error) {
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

// ==========================================
// NOTIFICATION SYSTEM ROUTES
// ==========================================

// GET ALL NOTIFICATIONS FOR A CUSTOMER
router.get('/customers/:id/notifications', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        // Fetch personal notifications AND store/public broadcasts (where customer_id IS NULL)
        const query = `
            SELECT * FROM notifications
            WHERE customer_id = $1 OR customer_id IS NULL
            ORDER BY created_at DESC LIMIT 50
        `;
        const { rows } = await client.query(query, [id]);
        res.json({ success: true, notifications: rows });
    } catch (error) {
        console.error("Notification Fetch Error:", error);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

// MARK PERSONAL NOTIFICATIONS AS READ (Clear All)
router.put('/customers/:id/notifications/clear', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('UPDATE notifications SET is_read = TRUE WHERE customer_id = $1', [id]);
        res.json({ success: true, message: "Notifications cleared" });
    } catch (error) {
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

// ==========================================
// WISHLIST ROUTES
// ==========================================

// GET a customer's wishlist
router.get('/customers/:id/wishlist', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
            SELECT p.id, p.name, p.price, p.web_allocated_stock, p.category,
                   COALESCE((SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1),
                            (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1)) as "imageUrl"
            FROM wishlist w
            JOIN products p ON w.product_id = p.id
            WHERE w.customer_id = $1
            ORDER BY w.created_at DESC
        `, [req.params.id]);
        res.json({ success: true, wishlist: rows });
    } catch (error) {
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

// TOGGLE a product in the wishlist (Add if missing, Remove if exists)
router.post('/customers/:id/wishlist', async (req, res) => {
    const { product_id } = req.body;
    const client = await pool.connect();
    try {
        const check = await client.query('SELECT id FROM wishlist WHERE customer_id = $1 AND product_id = $2', [req.params.id, product_id]);
        let isAdded = false;

        if (check.rows.length > 0) {
            // It's already in the wishlist, so remove it
            await client.query('DELETE FROM wishlist WHERE id = $1', [check.rows[0].id]);
        } else {
            // Not in wishlist, so add it
            await client.query('INSERT INTO wishlist (customer_id, product_id) VALUES ($1, $2)', [req.params.id, product_id]);
            isAdded = true;
        }
        res.json({ success: true, isAdded });
    } catch (error) {
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});


// ==========================================
// INVOICE & RECEIPT TEMPLATE BUILDER ROUTES
// ==========================================

// 1. Get all saved templates
router.get('/admin/invoice-templates', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT id, name, type, is_active, updated_at FROM invoice_templates ORDER BY id ASC');
        res.json({ success: true, templates: rows });
    } catch (error) {
        console.error("Failed to fetch templates:", error);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

// 2. Get a specific template's full design data (for the editor)
router.get('/admin/invoice-templates/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT * FROM invoice_templates WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Template not found" });
        res.json({ success: true, template: rows[0] });
    } catch (error) {
        console.error("Failed to fetch template data:", error);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

// 3. Create a new blank template preset
router.post('/admin/invoice-templates', async (req, res) => {
    const { name, type } = req.body;
    const client = await pool.connect();

    // Default dimensions: A4 (794x1123 px) or Thermal (300x800 px)
    const initialData = type === 'RECEIPT'
        ? { width: 300, height: 800, components: [] }
        : { width: 794, height: 1123, components: [] };

    try {
        const { rows } = await client.query(
            'INSERT INTO invoice_templates (name, type, design_data) VALUES ($1, $2, $3) RETURNING id',
            [name, type, initialData]
        );
        res.json({ success: true, templateId: rows[0].id, message: "Template created!" });
    } catch (error) {
        console.error("Failed to create template:", error);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

// 4. Save the drag-and-drop design data from the live editor
router.put('/admin/invoice-templates/:id/design', async (req, res) => {
    const { design_data } = req.body;
    const client = await pool.connect();
    try {
        await client.query(
            'UPDATE invoice_templates SET design_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [design_data, req.params.id]
        );
        res.json({ success: true, message: "Template design saved successfully!" });
    } catch (error) {
        console.error("Failed to save template design:", error);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

// 5. Delete a template
router.delete('/admin/invoice-templates/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM invoice_templates WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error("Failed to delete template:", error);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});
// ==========================================
// 🔥 PDF INVOICE GENERATOR ENGINE
// ==========================================

router.get('/orders/:id/download-pdf', async (req, res) => {
    const { id } = req.params;
    // 🔥 Make sure we grab both templateId AND type from the URL
    const { templateId, type } = req.query;
    const client = await pool.connect();

    try {
        // 1. Fetch the Order Data
        const orderRes = await client.query(`
            SELECT o.*, c.name as customer_name, c.email as customer_email,
                   json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'price', oi.price)) as items
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1
            GROUP BY o.id, c.name, c.email
        `, [id]);

        if (orderRes.rows.length === 0) return res.status(404).send("Order not found");
        const order = orderRes.rows[0];

        // 2. Fetch the Template Data (SMART ROUTING)
        let templateQuery = 'SELECT design_data FROM invoice_templates WHERE is_active = TRUE ORDER BY id DESC LIMIT 1';
        let templateParams = [];

        if (templateId) {
            templateQuery = 'SELECT design_data FROM invoice_templates WHERE id = $1';
            templateParams = [templateId];
        } else if (type) {
            // This fixes the Checkout Page buttons!
            templateQuery = 'SELECT design_data FROM invoice_templates WHERE type = $1 AND is_active = TRUE ORDER BY id DESC LIMIT 1';
            templateParams = [type.toUpperCase().trim()];
        }

        const templateRes = await client.query(templateQuery, templateParams);
        if (templateRes.rows.length === 0) return res.status(404).send("No active invoice templates found. Please create one in the admin panel.");
        const design = templateRes.rows[0].design_data;

        // 3. Variable Mapping Logic
        const mapVariable = (content) => {
            if (!content) return "";
            return content
                .replace('{{order_id}}', order.id)
                .replace('{{customer_name}}', order.customer_name || 'Guest')
                .replace('{{customer_phone}}', order.delivery_phone || 'N/A')
                .replace('{{order_date}}', new Date(order.created_at).toLocaleDateString())
                .replace('{{total_amount}}', parseFloat(order.total_amount).toFixed(2))
                .replace('{{discount_amount}}', parseFloat(order.discount_amount || 0).toFixed(2))
                .replace('{{final_total}}', (parseFloat(order.total_amount) - parseFloat(order.discount_amount || 0)).toFixed(2));
        };

        // 4. Generate the HTML from the JSON layout
        let componentsHtml = design.components.map(comp => {
            const style = `position: absolute; left: ${comp.x}px; top: ${comp.y}px; width: ${comp.width === 'auto' ? 'auto' : comp.width + 'px'}; height: ${comp.height === 'auto' ? 'auto' : comp.height + 'px'}; font-family: ${comp.style.fontFamily}; font-size: ${comp.style.fontSize}px; color: ${comp.style.color}; font-weight: ${comp.style.fontWeight}; font-style: ${comp.style.fontStyle}; text-decoration: ${comp.style.textDecoration}; text-align: ${comp.style.textAlign};`;

            if (comp.type === 'text') {
                return `<div style="${style}">${comp.content}</div>`;
            }
            if (comp.type === 'variable') {
                return `<div style="${style}">${mapVariable(comp.content)}</div>`;
            }
            if (comp.type === 'image') {
                return `<img src="${comp.content}" style="${style}; object-fit: contain;" />`;
            }
            if (comp.type === 'table') {
                // 🔥 UPDATED: Dynamically use the column headers from the JSON template!
                const cols = comp.columns && comp.columns.length > 0 ? comp.columns : ['Item', 'Qty', 'Rate', 'Amount'];

                let tableHeaders = cols.map(col => `<th style="padding: 8px; border-bottom: 2px solid #333; text-align: left;">${col}</th>`).join('');

                let tableRows = order.items.map(item => `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px dashed #ccc;">${item.name}</td>
                        <td style="padding: 8px; border-bottom: 1px dashed #ccc;">${item.quantity}</td>
                        <td style="padding: 8px; border-bottom: 1px dashed #ccc;">${parseFloat(item.price).toFixed(2)}</td>
                        <td style="padding: 8px; border-bottom: 1px dashed #ccc;">${(item.quantity * parseFloat(item.price)).toFixed(2)}</td>
                    </tr>
                `).join('');

                return `
                <div style="${style}">
                    <table style="width: 100%; border-collapse: collapse; font-family: ${comp.style.fontFamily}; font-size: ${comp.style.fontSize}px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                ${tableHeaders}
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>`;
            }
            return '';
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700&family=Abhaya+Libre:wght@400;700&display=swap" rel="stylesheet" />
                <style>
                    body { margin: 0; padding: 0; box-sizing: border-box; }
                    .canvas { position: relative; width: ${design.width}px; height: ${design.height}px; background: white; overflow: hidden; }
                </style>
            </head>
            <body>
                <div class="canvas">
                    ${componentsHtml}
                </div>
            </body>
            </html>
        `;

        // 5. Fire up Puppeteer and Print the PDF!
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            width: `${design.width}px`,
            height: `${design.height}px`,
            printBackground: true,
            pageRanges: '1'
        });

        await browser.close();

        // 6. Send the PDF file directly to the browser
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Invoice_Order_${order.id}.pdf`,
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).send("Failed to generate PDF");
    } finally {
        client.release();
    }
});

// 🔥 NEW: Toggle a template to be the ACTIVE DEFAULT
router.put('/admin/invoice-templates/:id/active', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Find out if it is an INVOICE or RECEIPT
        const { rows } = await client.query('SELECT type FROM invoice_templates WHERE id = $1', [req.params.id]);
        if (rows.length === 0) throw new Error("Template not found");
        const templateType = rows[0].type;

        // 2. Turn off ALL other templates of this exact type
        await client.query('UPDATE invoice_templates SET is_active = FALSE WHERE type = $1', [templateType]);

        // 3. Turn ON the selected template
        await client.query('UPDATE invoice_templates SET is_active = TRUE WHERE id = $1', [req.params.id]);

        await client.query('COMMIT'); // Save transaction
        res.json({ success: true, message: "Default updated" });
    } catch (error) {
        await client.query('ROLLBACK'); // Undo if something broke
        console.error("Failed to set active template:", error);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
});

module.exports = router;