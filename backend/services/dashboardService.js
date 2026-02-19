const db = require('../config/db');

/**
 * ✅ DASHBOARD SERVICE (Final Robust Version)
 * Feature: Logs RAW database output to terminal for debugging.
 * Feature: Maps multiple column naming conventions to ensure data isn't lost.
 */

const getDashboardStats = async () => {
  try {
    console.log("🔄 Fetching Dashboard Data...");

    // 1. HEADLINE STATS
    // We explicitly name columns 'revenue', 'orders', etc. to avoid confusion.
    const statsQuery = `
      SELECT
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders) as revenue,
        (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE) as orders_today,
        (SELECT COUNT(*) FROM customers) as customers_count,
        (SELECT COUNT(*) FROM products WHERE stock <= 10) as low_stock
    `;

    // 2. REVENUE TREND
    const revenueQuery = `
      SELECT
        to_char(series_date, 'Mon DD') as date,
        COALESCE(SUM(o.total_amount), 0) as value
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') as series_date
      LEFT JOIN orders o ON date_trunc('day', o.created_at) = series_date AND o.status != 'cancelled'
      GROUP BY series_date
      ORDER BY series_date ASC
    `;

    // 3. HOURLY TRAFFIC
    const hourlyQuery = `
      SELECT
        to_char(created_at, 'HH12 AM') as name,
        COUNT(*) as value
      FROM orders
      WHERE created_at >= CURRENT_DATE
      GROUP BY to_char(created_at, 'HH12 AM'), EXTRACT(HOUR FROM created_at)
      ORDER BY EXTRACT(HOUR FROM created_at) ASC
    `;

    // 4. SALES BY CATEGORY
    const categoryQuery = `
      SELECT
        COALESCE(p.category, 'Uncategorized') as name,
        COUNT(oi.id) as value
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.category
    `;

    // 5. RECENT TRANSACTIONS
    const recentQuery = `
      SELECT
        o.id,
        c.name as customer,
        o.total_amount as amount,
        o.status,
        to_char(o.created_at, 'HH12:MI AM') as time
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `;

    const [statsRes, revenueRes, hourlyRes, categoryRes, recentRes] = await Promise.all([
      db.query(statsQuery),
      db.query(revenueQuery),
      db.query(hourlyQuery),
      db.query(categoryQuery),
      db.query(recentQuery)
    ]);

    // 🔍 DEBUG LOG: This will show in your terminal. Check if values are 0 here!
    const rawStats = statsRes.rows[0] || {};
    console.log("📊 Raw Database Stats:", rawStats);

    // ✅ ROBUST MAPPING
    // We map the specific SQL aliases we defined above.
    const mappedData = {
      stats: {
        totalRevenue: Number(rawStats.revenue || rawStats.total_revenue || 0),
        ordersToday: Number(rawStats.orders_today || rawStats.count || 0),
        totalCustomers: Number(rawStats.customers_count || 0),
        lowStockAlerts: Number(rawStats.low_stock || 0)
      },
      revenueChart: revenueRes.rows.map(row => ({
        date: row.date,
        value: Number(row.value)
      })),
      hourlyChart: hourlyRes.rows.map(row => ({
        name: row.name,
        value: Number(row.value)
      })),
      categoryChart: categoryRes.rows.map(row => ({
        name: row.name,
        value: Number(row.value)
      })),
      recentTransactions: recentRes.rows.map(row => ({
        id: row.id,
        customer: row.customer || 'Guest',
        amount: Number(row.amount),
        status: row.status,
        time: row.time
      }))
    };

    return mappedData;

  } catch (err) {
    console.error("❌ Dashboard SQL Error:", err);
    throw err;
  }
};

module.exports = { getDashboardStats };