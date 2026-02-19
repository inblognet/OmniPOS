const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

/**
 * Route: GET /api/customers
 * Action: Fetches all customer records and loyalty stats.
 */
router.get('/', customerController.getCustomers);

/**
 * Route: POST /api/customers
 * Action: Registers a new customer into the cloud database.
 */
router.post('/', customerController.addCustomer);

/**
 * Route: PUT /api/customers/:id
 * Action: Updates customer info or manually adjusts loyalty points.
 */
router.put('/:id', customerController.updateCustomer);

/**
 * Route: DELETE /api/customers/:id
 * Action: Removes a customer profile from the system.
 */
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;