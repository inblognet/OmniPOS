const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

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