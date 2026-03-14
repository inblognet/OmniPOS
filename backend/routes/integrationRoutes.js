const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // ✅ Import the bouncer

// ✅ Lock down all integration routes to Admin only
router.use(protect, authorizeRoles('admin'));

router.get('/', integrationController.getIntegrations);
router.put('/', integrationController.updateIntegrations);

module.exports = router;