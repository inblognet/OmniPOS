const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // ✅ Import the bouncer

// ✅ Lock down all report routes to Admin and Manager only
router.use(protect, authorizeRoles('admin', 'manager'));

/**
 * Route: GET /api/reports/sales
 * Description: Fetches aggregated sales data within a specific date range.
 * Expected Query Params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/sales', reportController.getSalesReport);

/**
 * Route: GET /api/reports/inventory
 * Description: Fetches current stock levels and inventory valuation.
 */
router.get('/inventory', reportController.getInventoryReport);

module.exports = router;