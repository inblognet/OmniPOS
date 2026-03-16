const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // ✅ 1. Bring the bouncer back!

// ✅ 2. Global Check: You MUST be logged in to access anything here
router.use(protect);

// --- CASHIER ROUTES ---
// Cashiers need to process sales and view past receipts
router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:id/items', orderController.getOrderItems);

// --- MANAGER/ADMIN ROUTES ---
// 🔒 DANGER ZONE: Protect refunds from unauthorized employee use
router.post('/:id/refund', authorizeRoles('admin', 'manager'), orderController.refundOrder);

module.exports = router;