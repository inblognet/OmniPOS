const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/admin/orders
// Fetches all orders, newest first
router.get('/orders', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, total_amount, payment_method, payment_status, created_at
            FROM orders
            ORDER BY created_at DESC
        `);

        res.json({ success: true, orders: result.rows });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
});

// PUT /api/admin/orders/:id/status
// Updates the payment status of a specific order
router.put('/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        await pool.query(
            'UPDATE orders SET payment_status = $1 WHERE id = $2',
            [status, id]
        );
        res.json({ success: true, message: "Order updated successfully" });
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ success: false, message: "Failed to update order" });
    }
});
module.exports = router;