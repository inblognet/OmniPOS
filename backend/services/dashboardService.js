const db = require('../config/db');

const getDashboardStats = async () => {
  // 1. Total Stats
  const basicStats = await db.query(`
    SELECT
      SUM(total_amount) as total_revenue,
      COUNT(id) as total_orders,
      COUNT(DISTINCT customer_id) as unique_customers
    FROM orders
    WHERE status = 'completed'
  `);

  // 2. Categories
  const categoryStats = await db.query(`
    SELECT
      item->>'category' as name,
      SUM((item->>'quantity')::int) as value
    FROM orders, jsonb_array_elements(items) as item
    GROUP BY item->>'category'
  `);

  // 3. Hourly (Today)
  const hourlyStats = await db.query(`
    SELECT
      TO_CHAR(created_at, 'HH24:00') as hour,
      SUM(total_amount) as amount
    FROM orders
    WHERE created_at >= CURRENT_DATE
    GROUP BY hour
    ORDER BY hour ASC
  `);

  // ✅ 4. 7-Day Daily Trend (New Query)
  const dailyStats = await db.query(`
    SELECT
      to_char(date_series, 'Dy') as date,
      COALESCE(SUM(o.total_amount), 0) as amount
    FROM
      generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        '1 day'::interval
      ) date_series
    LEFT JOIN orders o ON DATE(o.created_at) = DATE(date_series) AND o.status = 'completed'
    GROUP BY date_series
    ORDER BY date_series ASC;
  `);

  return {
    revenue: parseFloat(basicStats.rows[0].total_revenue || 0),
    orders: parseInt(basicStats.rows[0].total_orders || 0),
    customers: parseInt(basicStats.rows[0].unique_customers || 0),
    categories: categoryStats.rows,
    hourly: hourlyStats.rows,
    daily: dailyStats.rows // ✅ Sending 7-day data
  };
};

module.exports = { getDashboardStats };