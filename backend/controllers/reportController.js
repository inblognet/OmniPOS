const reportService = require('../services/reportService');

/**
 * Action: Fetches itemized sales data between two dates.
 * Path: GET /api/reports/sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // ✅ Validation: Ensures the SQL query has the required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and End date are required' });
    }

    const salesData = await reportService.getSalesData(startDate, endDate);
    res.json(salesData);

  } catch (error) {
    // ✅ FIX: Passed to the global Express error handler for consistency
    next(error);
  }
};

/**
 * Action: Fetches current stock levels, categories, and valuation.
 * Path: GET /api/reports/inventory
 */
const getInventoryReport = async (req, res, next) => {
  try {
    const inventoryData = await reportService.getInventoryData();
    res.json(inventoryData);

  } catch (error) {
    // ✅ FIX: Passed to the global Express error handler
    next(error);
  }
};

module.exports = {
  getSalesReport,
  getInventoryReport
};