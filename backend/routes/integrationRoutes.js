const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');

router.get('/', integrationController.getIntegrations);
router.put('/', integrationController.updateIntegrations);

module.exports = router;