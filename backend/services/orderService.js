const db = require('../config/db');

// ✅ UPDATED: Create Order (Handles Points & Returns Full Receipt Data)
const createOrder = async (orderData) => {
  // Destructure loyalty fields from the request
  const { customerId, total, totalAmount, paymentMethod, items, pointsRedeemed, pointsEarned } = orderData;

  // 1. Calculate Total if missing
  let finalTotal = total || totalAmount;

  if (!finalTotal && items && items.length > 0) {
    finalTotal = items.reduce((sum, item) => {
      return sum + (Number(item.price) * Number(item.quantity));
    }, 0);
  }

  finalTotal = finalTotal || 0.00;

  if (!db.pool) {
    throw new Error("Database pool not found. Check db.js config.");
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Insert Order
    const orderQuery = `
      INSERT INTO orders (customer_id, total_amount, payment_method, status, items)
      VALUES ($1, $2, $3, 'completed', $4)
      RETURNING *
    `;

    const orderRes = await client.query(orderQuery, [
        customerId || null,
        finalTotal,
        paymentMethod || 'Cash',
        JSON.stringify(items)
    ]);
    const savedOrder = orderRes.rows[0];

    // 3. Insert Order Items & Update Stock
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)`,
          [savedOrder.id, item.productId, item.quantity, item.price]
        );

        await client.query(
          `UPDATE products SET stock = stock - $1 WHERE id = $2`,
          [item.quantity, item.productId]
        );
      }
    }

    // ✅ 4. Update Customer Loyalty (Points & Stats)
    if (customerId) {
        const redeemed = pointsRedeemed || 0;
        const earned = pointsEarned || 0;

        // This query updates points, spend, and visit count in one go
        await client.query(
            `UPDATE customers
             SET loyalty_points = GREATEST(0, loyalty_points - $1 + $2),
                 total_spend = total_spend + $3,
                 total_purchases = total_purchases + 1,
                 last_visit = NOW()
             WHERE id = $4`,
            [redeemed, earned, finalTotal, customerId]
        );
    }

    await client.query('COMMIT');
    return savedOrder;

  } catch (e) {
    await client.query('ROLLBACK');
    console.error("❌ Transaction Failed:", e);
    throw e;
  } finally {
    client.release();
  }
};

// ✅ FIX: Updated to fetch 'items' column
const getAllOrders = async () => {
  const query = `
    SELECT o.id, o.total_amount, o.status, o.payment_method, o.created_at, o.items, c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
  `;
  const { rows } = await db.query(query);
  return rows;
};

const getOrderItems = async (orderId) => {
  const query = `
    SELECT oi.product_id as "productId", p.name, oi.quantity, oi.price, oi.returned_quantity as "returnedQuantity"
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
  `;
  const { rows } = await db.query(query, [orderId]);
  return rows;
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderItems
};