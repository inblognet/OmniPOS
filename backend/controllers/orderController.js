const orderService = require('../services/orderService');

// ✅ RESTORED: Create Order Controller
const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

const getOrderItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const items = await orderService.getOrderItems(id);
    res.json(items);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder, // ✅ Export this!
  getOrders,
  getOrderItems
};