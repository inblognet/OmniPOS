const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { pool } = require('../config/db'); // Added to talk to the DB

// 1. Upload to Cloudinary
router.post('/', upload.single('image'), (req, res) => {
    try {
        const imageUrl = req.file.path;
        res.json({ success: true, imageUrl: imageUrl });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: "Image upload failed" });
    }
});

// 2. Link URL to a Product in the Database
router.post('/link', async (req, res) => {
    const { productId, imageUrl } = req.body;

    try {
        // First, mark any existing images for this product as NOT primary
        await pool.query(
            'UPDATE product_images SET is_primary = false WHERE product_id = $1',
            [productId]
        );

        // Then, insert the new image and make it primary
        await pool.query(
            'INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, imageUrl]
        );

        res.json({ success: true, message: "Image linked to product successfully!" });
    } catch (error) {
        console.error("DB Link Error:", error);
        res.status(500).json({ success: false, message: "Failed to link image to database" });
    }
});

module.exports = router;