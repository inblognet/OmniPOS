const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// --- CATEGORY ROUTES --- (Must be above /:id routes)
/**
 * Route: GET /api/products/categories
 * Action: Fetches all product categories.
 */
router.get('/categories', productController.getCategories);

/**
 * Route: POST /api/products/categories
 * Action: Creates a new product category.
 */
router.post('/categories', productController.addCategory);

/**
 * Route: DELETE /api/products/categories/:id
 * Action: Deletes a product category by ID.
 */
router.delete('/categories/:id', productController.deleteCategory);


// --- PRODUCT ROUTES ---

/**
 * Route: GET /api/products
 * Action: Fetches all ACTIVE products for the POS and Inventory screens.
 */
router.get('/', productController.getProducts);

/**
 * ✅ NEW: Get Damage Logs
 * Route: GET /api/products/damage/logs
 * Action: Fetches the history of all reported damaged items with reasons.
 */
router.get('/damage/logs', productController.getDamageLogs);

/**
 * Route: POST /api/products
 * Action: Adds a new product to the database.
 */
router.post('/', productController.addProduct);

/**
 * Route: PUT /api/products/:id
 * Action: Updates an existing product by ID.
 */
router.put('/:id', productController.updateProduct);

/**
 * Route: DELETE /api/products/:id
 * Action: Soft deletes (archives) or permanently deletes a product.
 */
router.delete('/:id', productController.deleteProduct);

/**
 * Route: POST /api/products/:id/damage
 * Action: Decreases stock and increases damaged_qty in the database.
 */
router.post('/:id/damage', productController.reportDamage);

module.exports = router;