const orderService = require('../services/orderService');

// ✅ Handles POST requests to save new transactions
const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

// ✅ Handles GET requests for Sales History and Dashboard
const getOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// ✅ Fetches specific items within a single order
const getOrderItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const items = await orderService.getOrderItems(id);
    res.json(items);
  } catch (error) {
    next(error);
  }
};

// ✅ PROCESS REFUND: Handles full and partial refunds
const refundOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const refundData = req.body;
    const result = await orderService.processRefund(orderId, refundData);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderItems,
  refundOrder // ✅ Ensure the new controller is exported
};