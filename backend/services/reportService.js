const db = require('../config/db');

/**
 * ✅ FETCH SALES DATA (Safe Version)
 * We removed 'refunded_amount' from the direct selection to prevent 500 Errors
 * if the column doesn't exist in your database yet.
 */
const getSalesData = async (startDate, endDate) => {
  // Ensure the end date covers the entire last day
  const start = new Date(startDate).toISOString();
  const end = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();

  // ⚠️ CRITICAL FIX: We use '0 as "refundedAmount"' to prevent crashes
  // if your database schema hasn't been migrated to include refunds yet.
  const query = `
    SELECT
      id,
      created_at as timestamp,
      total_amount as total,
      status,
      payment_method as "paymentMethod",
      0 as "refundedAmount"
    FROM orders
    WHERE created_at BETWEEN $1 AND $2
    AND status != 'cancelled'
    ORDER BY created_at DESC
  `;

  try {
    const { rows } = await db.query(query, [start, end]);
    return rows;
  } catch (err) {
    console.error("❌ SQL Error in getSalesData:", err.message);
    throw err; // This will show up in your terminal logs now
  }
};

/**
 * ✅ FETCH INVENTORY DATA
 */
const getInventoryData = async () => {
  const query = `
    SELECT
      id,
      name,
      category,
      price,
      stock,
      is_active as "isActive"
    FROM products
    ORDER BY name ASC
  `;

  const { rows } = await db.query(query);
  return rows;
};

module.exports = {
  getSalesData,
  getInventoryData
};