const customerService = require('../services/customerService');

const getCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getAllCustomers();
    res.json(customers);
  } catch (error) { next(error); }
};

const addCustomer = async (req, res, next) => {
  try {
    if (!req.body.name) return res.status(400).json({ message: 'Name is required' });
    const newCustomer = await customerService.createCustomer(req.body);
    res.status(201).json(newCustomer);
  } catch (error) { next(error); }
};

const updateCustomer = async (req, res, next) => {
  try {
    const updated = await customerService.updateCustomer(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Customer not found' });
    res.json(updated);
  } catch (error) { next(error); }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const success = await customerService.deleteCustomer(req.params.id);
    if (!success) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (error) { next(error); }
};

module.exports = { getCustomers, addCustomer, updateCustomer, deleteCustomer };