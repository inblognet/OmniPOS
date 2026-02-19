const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

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