const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// ✅ RESTORED: POST /api/orders (Create Order)
router.post('/', orderController.createOrder);

// GET /api/orders (History)
router.get('/', orderController.getOrders);

// GET /api/orders/:id/items (Details)
router.get('/:id/items', orderController.getOrderItems);

module.exports = router;