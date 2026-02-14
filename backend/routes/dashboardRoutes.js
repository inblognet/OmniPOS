const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Route: GET /api/dashboard/stats
router.get('/stats', dashboardController.getStats);

module.exports = router;