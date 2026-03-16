const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ✅ 1. Check that the user is actually logged in (Cashier OR Admin)
router.use(protect);

// ✅ 2. Open up GET to all logged-in users so the POS can send receipts!
router.get('/', integrationController.getIntegrations);

// 🔒 3. Keep PUT strictly locked down so ONLY Admins can change the API keys!
router.put('/', authorizeRoles('admin'), integrationController.updateIntegrations);

module.exports = router;