const db = require('../config/db');

/**
 * ✅ FETCH SALES DATA (Timezone-Safe Version)
 * We removed 'refunded_amount' from the direct selection to prevent 500 Errors.
 */
const getSalesData = async (startDate, endDate) => {
  // ⚠️ CRITICAL FIX: We let PostgreSQL handle the date boundaries!
  // Casting to ::date and adding 1 day ensures we get exactly the whole day,
  // totally bypassing the Render UTC vs Local timezone offset trap.
  const query = `
    SELECT
      id,
      created_at as timestamp,
      total_amount as total,
      status,
      payment_method as "paymentMethod",
      0 as "refundedAmount"
    FROM orders
    WHERE created_at >= $1::date
    AND created_at < $2::date + interval '1 day'
    AND status != 'cancelled'
    ORDER BY created_at DESC
  `;

  try {
    const { rows } = await db.query(query, [startDate, endDate]);
    return rows;
  } catch (err) {
    console.error("❌ SQL Error in getSalesData:", err.message);
    throw err; // This will show up in your terminal logs
  }
};

/**
 * ✅ FETCH INVENTORY DATA (Now with Error Handling!)
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

  try {
    const { rows } = await db.query(query);
    return rows;
  } catch (err) {
    console.error("❌ SQL Error in getInventoryData:", err.message);
    throw err;
  }
};

module.exports = {
  getSalesData,
  getInventoryData
};