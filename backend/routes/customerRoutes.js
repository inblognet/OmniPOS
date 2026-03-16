const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // ✅ 1. Bring the bouncer back!

// ✅ 2. Global Check: You MUST be logged in to touch customer data
router.use(protect);

// --- CASHIER ROUTES ---
// Cashiers need to search, add, and update customers during checkout
router.get('/', customerController.getCustomers);
router.post('/', customerController.addCustomer);
router.put('/:id', customerController.updateCustomer);

// --- MANAGER/ADMIN ROUTES ---
// 🔒 DANGER ZONE: Only Admin/Manager can permanently delete customer records
router.delete('/:id', authorizeRoles('admin', 'manager'), customerController.deleteCustomer);

module.exports = router;