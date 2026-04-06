const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- 🧪 INTERNAL ROUTER TEST 🧪 ---
// If this works, we know the file is connected!
router.get('/hello', (req, res) => {
    res.json({ message: "Hello from inside webAdminRoutes.js!" });
});

// --- 📦 ALLOCATION ROUTE 📦 ---
router.put('/products/:id/allocation', async (req, res) => {
    const { id } = req.params;
    const { qtyToTransfer } = req.body;

    // Log the request to the terminal so we can see it hit
    console.log(`Inventory Transfer Request: Product ID ${id}, Qty ${qtyToTransfer}`);

    if (!qtyToTransfer || qtyToTransfer <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid transfer quantity' });
    }

    try {
        const updateQuery = `
            UPDATE products
            SET stock = stock - $1,
                web_allocated_stock = web_allocated_stock + $1
            WHERE id = $2 AND stock >= $1
            RETURNING stock, web_allocated_stock;
        `;

        const result = await pool.query(updateQuery, [qtyToTransfer, id]);

        if (result.rows && result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Transfer failed: Product not found OR insufficient stock.'
            });
        }

        res.json({
            success: true,
            message: `Successfully allocated ${qtyToTransfer} units.`,
            newPosStock: result.rows[0].stock,
            newWebStock: result.rows[0].web_allocated_stock
        });

    } catch (error) {
        console.error('Allocation Error:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;