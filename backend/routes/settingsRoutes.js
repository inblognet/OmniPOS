const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ✅ 1. Check that the user is logged in (Cashier OR Admin)
router.use(protect);

// ✅ 2. Open up GET so the POS can load Store Name, Currency, Tax Rates, etc.
router.get('/', settingsController.getSettings);

// 🔒 3. DANGER ZONE: Lock everything else down to Admins ONLY!
router.use(authorizeRoles('admin'));

router.put('/', settingsController.updateSettings);
router.get('/export', settingsController.exportData);
router.post('/restore', settingsController.restoreData);
router.post('/clear-sales', settingsController.clearSalesData);
router.post('/clear-inventory', settingsController.clearInventoryData);
router.post('/factory-reset', settingsController.executeFactoryReset);

module.exports = router;