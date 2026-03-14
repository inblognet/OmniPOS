const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // ✅ 1. Import the bouncer

// ✅ 2. The Global Bouncer for this file
// By putting this here, EVERY route below it is instantly locked down.
// You MUST be logged in (protect) AND have the 'admin' role to pass.
router.use(protect, authorizeRoles('admin'));

// Standard Settings
router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

// ✅ System Admin / Danger Zone
router.get('/export', settingsController.exportData);

// ✅ NEW: Full System Restore Route
router.post('/restore', settingsController.restoreData);

router.post('/clear-sales', settingsController.clearSalesData);
router.post('/clear-inventory', settingsController.clearInventoryData);
router.post('/factory-reset', settingsController.executeFactoryReset);

module.exports = router;