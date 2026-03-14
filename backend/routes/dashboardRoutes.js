const express = require('express');
const router = express.Router();

// ✅ Ensure this path correctly points to your controller folder
const dashboardController = require('../controllers/dashboardController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // ✅ Import the bouncer

// ✅ Lock down all dashboard routes to Admin and Manager only
router.use(protect, authorizeRoles('admin', 'manager'));

/**
 * Route: GET /api/dashboard/stats
 * Note: This file is mounted at '/api/dashboard' in server.js.
 * Adding '/stats' here creates the full endpoint the frontend is calling.
 */
router.get('/stats', dashboardController.getStats);

module.exports = router;