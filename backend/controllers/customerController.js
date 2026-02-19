const customerService = require('../services/customerService');

/**
 * Action: Fetch all customers for POS selection or Management screen.
 * Path: GET /api/customers
 */
const getCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getAllCustomers();
    res.json(customers);
  } catch (error) {
    next(error);
  }
};

/**
 * Action: Create a new customer profile.
 * Path: POST /api/customers
 */
const addCustomer = async (req, res, next) => {
  try {
    // ✅ Explicitly extract fields (including email) for security
    const { name, phone, email, type, loyaltyJoined } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const newCustomer = await customerService.createCustomer({
      name,
      phone,
      email, // ✅ New email field explicitly passed to service
      type,
      loyaltyJoined
    });

    res.status(201).json(newCustomer);
  } catch (error) {
    next(error);
  }
};

/**
 * Action: Update loyalty points, contact info, or stats.
 * Path: PUT /api/customers/:id
 */
const updateCustomer = async (req, res, next) => {
  try {
    const updated = await customerService.updateCustomer(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Action: Remove a customer profile.
 * Path: DELETE /api/customers/:id
 */
const deleteCustomer = async (req, res, next) => {
  try {
    const success = await customerService.deleteCustomer(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer
};