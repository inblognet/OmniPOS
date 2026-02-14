const dashboardService = require('../services/dashboardService');

const getStats = async (req, res, next) => {
  try {
    console.log("📊 Controller: Fetching dashboard stats..."); // Debug log
    const stats = await dashboardService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error("❌ Controller Error:", error);
    next(error);
  }
};

// ✅ IMPORTANT: Export as an object
module.exports = { getStats };