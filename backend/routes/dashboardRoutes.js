const express = require('express');
const router = express.Router();
// ✅ Ensure this path correctly points to your controller folder
const dashboardController = require('../controllers/dashboardController');

/**
 * Route: GET /api/dashboard/stats
 * Note: This file is mounted at '/api/dashboard' in server.js.
 * Adding '/stats' here creates the full endpoint the frontend is calling.
 */
router.get('/stats', dashboardController.getStats);

module.exports = router;