const db = require('../config/db');

// ✅ ADVANCED ANALYTICS CONTROLLER
// Fetches Top 10 lists, Traffic Trends, and Inventory Health in parallel.
const getStats = async (req, res) => {
  try {
    console.log("📡 Fetching Advanced Dashboard Analytics...");

    // 1. HEADLINE METRICS (Revenue, Orders, Customers, Stock)
    const statsQuery = `
      SELECT
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders) as total_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at::date = CURRENT_DATE) as today_revenue,
        (SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE) as orders_today,
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM products WHERE stock <= 5) as low_stock,
        (SELECT COUNT(*) FROM products WHERE stock = 0) as out_of_stock,
        (SELECT name FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.name ORDER BY SUM(oi.quantity) DESC LIMIT 1) as most_sold_item
    `;

    // 2. REVENUE TRENDS (Last 30 Days)
    // Frontend can toggle between 7-day and 30-day views
    const trendQuery = `
      SELECT TO_CHAR(series_date, 'Mon DD') as date, COALESCE(SUM(o.total_amount), 0) as value
      FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') as series_date
      LEFT JOIN orders o ON date_trunc('day', o.created_at) = series_date AND o.status != 'cancelled'
      GROUP BY series_date ORDER BY series_date ASC
    `;

    // 3. TOP 10 BEST-SELLING PRODUCTS (By Quantity Sold)
    const topProductsQuery = `
      SELECT p.name, SUM(oi.quantity) as value
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.name
      ORDER BY value DESC
      LIMIT 10
    `;

    // 4. TOP 10 LOYAL CUSTOMERS (By Total Spend)
    const topCustomersQuery = `
      SELECT c.name, SUM(o.total_amount) as value
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status != 'cancelled'
      GROUP BY c.name
      ORDER BY value DESC
      LIMIT 10
    `;

    // 5. PEAK TRAFFIC HOURS (Heatmap Data)
    const peakTrafficQuery = `
      SELECT TO_CHAR(created_at, 'HH12 AM') as name, COUNT(*) as value
      FROM orders
      GROUP BY TO_CHAR(created_at, 'HH12 AM'), EXTRACT(HOUR FROM created_at)
      ORDER BY EXTRACT(HOUR FROM created_at) ASC
    `;

    // 6. SALES BY CATEGORY (Pie Chart)
    const categoryQuery = `
      SELECT p.category as name, COUNT(oi.id) as value
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.category
    `;

    // 7. DEAD STOCK (Items that have NEVER sold)
    const deadStockQuery = `
      SELECT name, stock as value
      FROM products
      WHERE id NOT IN (SELECT DISTINCT product_id FROM order_items)
      LIMIT 5
    `;

    // ⚡ Execute all queries in parallel for speed
    const [stats, trend, topProd, topCust, traffic, cats, dead] = await Promise.all([
      db.query(statsQuery),
      db.query(trendQuery),
      db.query(topProductsQuery),
      db.query(topCustomersQuery),
      db.query(peakTrafficQuery),
      db.query(categoryQuery),
      db.query(deadStockQuery)
    ]);

    const s = stats.rows[0];

    // ✅ STRUCTURED RESPONSE
    // Maps exactly to the 'DashboardScreen.tsx' interfaces
    res.json({
      stats: {
        totalRevenue: Number(s.total_revenue),
        todayRevenue: Number(s.today_revenue),
        ordersToday: Number(s.orders_today),
        totalCustomers: Number(s.total_customers),
        lowStock: Number(s.low_stock),
        outOfStock: Number(s.out_of_stock),
        mostSoldItem: s.most_sold_item || 'N/A'
      },
      trends: trend.rows.map(r => ({ date: r.date, value: Number(r.value) })),
      topProducts: topProd.rows.map(r => ({ name: r.name, value: Number(r.value) })),
      topCustomers: topCust.rows.map(r => ({ name: r.name, value: Number(r.value) })),
      peakTraffic: traffic.rows.map(r => ({ name: r.name, value: Number(r.value) })),
      salesByCategory: cats.rows.map(r => ({ name: r.name, value: Number(r.value) })),
      deadStock: dead.rows.map(r => ({ name: r.name, value: Number(r.value) }))
    });

  } catch (error) {
    console.error('🔥 Analytics Error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
};

module.exports = { getStats };