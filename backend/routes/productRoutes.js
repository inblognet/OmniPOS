const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // ✅ 1. Bring the bouncer back!

// ✅ 2. Global Check: You MUST be logged in to do anything in this file
router.use(protect);

// --- CATEGORY ROUTES ---
// Cashiers need to see categories for the POS screen
router.get('/categories', productController.getCategories);

// 🔒 Only Admin/Manager can create or delete categories
router.post('/categories', authorizeRoles('admin', 'manager'), productController.addCategory);
router.delete('/categories/:id', authorizeRoles('admin', 'manager'), productController.deleteCategory);

// --- PRODUCT ROUTES ---
// Cashiers need to fetch products to sell them
router.get('/', productController.getProducts);

// Cashiers can report a damaged item at the register
router.post('/:id/damage', productController.reportDamage);

// 🔒 Only Admin/Manager can view the master list of all damaged items
router.get('/damage/logs', authorizeRoles('admin', 'manager'), productController.getDamageLogs);

// 🔒 DANGER ZONE: Only Admin/Manager can add, edit, or delete inventory
router.post('/', authorizeRoles('admin', 'manager'), productController.addProduct);
router.put('/:id', authorizeRoles('admin', 'manager'), productController.updateProduct);
router.delete('/:id', authorizeRoles('admin', 'manager'), productController.deleteProduct);

module.exports = router;