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

// 4. POST CHECKOUT (🔥 UPDATED to generate notifications!)
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

router.post('/vouchers/validate', async (req, res) => {
    const { code } = req.body;
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT * FROM vouchers WHERE code = $1 AND is_active = TRUE', [code.toUpperCase()]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Invalid or expired voucher code." });
        res.json({ success: true, discount_percentage: rows[0].discount_percentage, description: rows[0].description });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.get('/vouchers/active', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT code, discount_percentage, description FROM vouchers WHERE is_active = TRUE ORDER BY created_at DESC');
        res.json({ success: true, vouchers: rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.get('/admin/vouchers', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT * FROM vouchers ORDER BY created_at DESC');
        res.json({ success: true, vouchers: rows });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

router.post('/admin/vouchers', async (req, res) => {
    const { code, discount_percentage, description } = req.body;
    const client = await pool.connect();
    try {
        await client.query(
            'INSERT INTO vouchers (code, discount_percentage, description) VALUES ($1, $2, $3)',
            [code.toUpperCase(), discount_percentage, description]
        );
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: "Code might already exist." }); } finally { client.release(); }
});

router.put('/admin/vouchers/:id/toggle', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('UPDATE vouchers SET is_active = NOT is_active WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); } finally { client.release(); }
});

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

// 🔥 UPDATED to create a notification when admin sends a chat!
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

        // 🔥 NOTIFICATION: NEW CHAT FROM ADMIN
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

        // 1. Save the actual review
        await client.query(
            'INSERT INTO product_reviews (product_id, customer_id, order_id, rating, comment) VALUES ($1, $2, $3, $4, $5)',
            [req.params.id, customerId, orderId, rating, comment]
        );

        // 2. Grab the product name and customer name so the notification looks nice
        const infoRes = await client.query(`
            SELECT p.name as product_name, c.name as customer_name
            FROM products p, customers c
            WHERE p.id = $1 AND c.id = $2
        `, [req.params.id, customerId]);

        const productName = infoRes.rows[0]?.product_name || 'a product';
        const customerName = infoRes.rows[0]?.customer_name || 'A customer';
        const firstName = customerName.split(' ')[0];

        // 🔥 3. CREATE NOTIFICATION: PUBLIC BROADCAST
        // Notice we pass NULL for the customer_id so it shows up in EVERYONE'S "PUBLIC" tab!
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

// 🔥 UPDATED to create a notification when admin changes order status!
router.put('/admin/orders/:id/advanced', async (req, res) => {
    const { order_status, payment_status, admin_note } = req.body;
    const client = await pool.connect();
    try {
        await client.query('UPDATE orders SET order_status = $1, payment_status = $2, admin_note = $3 WHERE id = $4', [order_status, payment_status, admin_note, req.params.id]);

        // 🔥 NOTIFICATION: STATUS UPDATE
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
// 🔥 NEW: NOTIFICATION SYSTEM ROUTES
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

module.exports = router;