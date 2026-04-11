const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); // Correctly pulling the pool object
const upload = require('../middleware/upload'); // 🔥 Added your Cloudinary upload middleware!

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

// 2. GET CATEGORIES (Now joining with category_images!)
router.get('/categories', async (req, res) => {
    try {
        // This grabs unique categories from products AND their matching image from category_images
        const { rows } = await pool.query(`
            SELECT DISTINCT
                p.category AS id,
                p.category AS name,
                ci.image_url
            FROM products p
            LEFT JOIN category_images ci ON p.category = ci.category
            WHERE p.category IS NOT NULL
            ORDER BY p.category ASC
        `);
        res.json({ success: true, categories: rows });
    } catch (error) {
        console.error("Categories Fetch Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. GET PRODUCTS
router.get('/products', async (req, res) => {
    const { search, category } = req.query; // Get search/category from the URL parameters
    const client = await pool.connect();

    try {
        let query = `
            SELECT
                p.id, p.name, p.sku, p.price, p.web_allocated_stock, p.category,
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
            query += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
        }

        // Add category filter if provided
        if (category) {
            params.push(category);
            query += ` AND p.category = $${params.length}`;
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

// 4. POST CHECKOUT
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

        // 3. Award Loyalty Points
        let pointsEarned = 0;
        if (customerId) {
            pointsEarned = Math.floor(totalAmount / 10);
            if (pointsEarned > 0) {
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
            pointsEarned: pointsEarned,
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

// 5. GET ALL ORDERS
router.get('/admin/orders', async (req, res) => {
    const client = await pool.connect();
    try {
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

// 6. UPDATE ORDER STATUS
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

// 7. GET ALL BANNERS
router.get('/admin/banners', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query('SELECT * FROM carousel_banners ORDER BY id DESC');
        res.json({ success: true, banners: rows });
    } catch (error) {
        console.error("Admin Banners Fetch Error:", error);
        res.status(500).json({ success: false, message: "Failed to load banners" });
    } finally {
        client.release();
    }
});

// 8. ADD NEW BANNER
router.post('/admin/banners', async (req, res) => {
    const { image_url, title, subtitle, link_url } = req.body;
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            `INSERT INTO carousel_banners (image_url, title, subtitle, link_url, is_active)
             VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
            [image_url, title, subtitle, link_url || null]
        );
        res.json({ success: true, banner: rows[0], message: "Banner added successfully" });
    } catch (error) {
        console.error("Add Banner Error:", error);
        res.status(500).json({ success: false, message: "Failed to add banner" });
    } finally {
        client.release();
    }
});

// 9. TOGGLE BANNER VISIBILITY
router.put('/admin/banners/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query(
            'UPDATE carousel_banners SET is_active = NOT is_active WHERE id = $1',
            [id]
        );
        res.json({ success: true, message: "Banner visibility updated" });
    } catch (error) {
        console.error("Toggle Banner Error:", error);
        res.status(500).json({ success: false, message: "Failed to update banner" });
    } finally {
        client.release();
    }
});

// 10. DELETE BANNER
router.delete('/admin/banners/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM carousel_banners WHERE id = $1', [id]);
        res.json({ success: true, message: "Banner deleted" });
    } catch (error) {
        console.error("Delete Banner Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete banner" });
    } finally {
        client.release();
    }
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
                p.id, p.name, p.sku, p.price, p.web_allocated_stock, p.category,
                COALESCE(
                    json_agg(
                        json_build_object('url', pi.image_url, 'is_primary', pi.is_primary)
                    ) FILTER (WHERE pi.id IS NOT NULL), '[]'
                ) as images
            FROM products p
            LEFT JOIN product_images pi ON p.id = pi.product_id
            GROUP BY p.id ORDER BY p.id DESC;
        `;
        const { rows } = await client.query(query);
        res.json({ success: true, products: rows });
    } catch (error) {
        console.error("Admin Fetch Products Error:", error);
        res.status(500).json({ success: false, message: "Failed to load inventory" });
    } finally {
        client.release();
    }
});

// 12. ADD NEW PRODUCT (Restored Cloudinary Upload!)
router.post('/admin/products', upload.single('image'), async (req, res) => {
    // Because we are using FormData, we grab text fields from req.body
    const { name, sku, price, web_allocated_stock, category } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Insert the main product
        const productResult = await client.query(
            `INSERT INTO products (name, sku, price, web_allocated_stock, category)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [name, sku, price, web_allocated_stock, category]
        );
        const newProductId = productResult.rows[0].id;

        // Insert the primary image if Cloudinary successfully processed the file
        if (req.file && req.file.path) {
            await client.query(
                `INSERT INTO product_images (product_id, image_url, is_primary)
                 VALUES ($1, $2, TRUE)`,
                [newProductId, req.file.path] // req.file.path holds the secure Cloudinary URL
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: "Product added successfully!" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Add Product Error:", error);
        res.status(500).json({ success: false, message: "Failed to add product" });
    } finally {
        client.release();
    }
});

// 13. UPDATE PRODUCT (Now handles Name and Cloudinary Images!)
router.put('/admin/products/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;

    // Because we use FormData, we extract these from req.body
    const { name, web_allocated_stock, price } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update the text-based fields (Name, Stock, Price)
        await client.query(
            'UPDATE products SET name = $1, web_allocated_stock = $2, price = $3 WHERE id = $4',
            [name, web_allocated_stock, price, id]
        );

        // 2. If the user uploaded a NEW image, replace the old one
        if (req.file && req.file.path) {
            // Delete existing images for this product to prevent duplicates
            await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);

            // Insert the shiny new Cloudinary URL
            await client.query(
                'INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, TRUE)',
                [id, req.file.path]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: "Product updated successfully" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Update Product Error:", error);
        res.status(500).json({ success: false, message: "Failed to update product" });
    } finally {
        client.release();
    }
});

// 14. DELETE PRODUCT
router.delete('/admin/products/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM product_images WHERE product_id = $1', [id]);
        await client.query('DELETE FROM products WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ success: true, message: "Product deleted" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Delete Product Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete product. Ensure it has no active orders." });
    } finally {
        client.release();
    }
});

// 15. UPLOAD CATEGORY IMAGE TO CLOUDINARY
// 🔥 Uses your existing 'upload' middleware to securely handle the file!
router.post('/admin/categories/upload', upload.single('image'), async (req, res) => {
    const { category } = req.body;
    const client = await pool.connect();

    try {
        // Cloudinary automatically attaches the secure URL to req.file.path
        if (!req.file || !req.file.path) {
            return res.status(400).json({ success: false, message: "No image uploaded to Cloudinary." });
        }

        const image_url = req.file.path;

        await client.query('BEGIN');

        // Delete any old image link for this category to avoid clutter
        await client.query('DELETE FROM category_images WHERE category = $1', [category]);

        // Insert the shiny new Cloudinary URL
        await client.query(
            'INSERT INTO category_images (category, image_url) VALUES ($1, $2)',
            [category, image_url]
        );

        await client.query('COMMIT');
        res.json({ success: true, image_url: image_url, message: "Category image uploaded successfully!" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Category Upload Error:", error);
        res.status(500).json({ success: false, message: "Failed to upload category image" });
    } finally {
        client.release();
    }
});

module.exports = router;