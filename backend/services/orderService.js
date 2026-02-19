const db = require('../config/db');

/**
 * ✅ CREATE ORDER: Robust transaction-based logic
 * Handles stock reduction and customer loyalty updates in one atomic step.
 */
const createOrder = async (orderData) => {
  const { customerId, total, totalAmount, paymentMethod, items, pointsRedeemed, pointsEarned } = orderData;

  // 1. Calculate/Validate Total
  let finalTotal = total || totalAmount;
  if (!finalTotal && items && items.length > 0) {
    finalTotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  }
  finalTotal = finalTotal || 0.00;

  if (!db.pool) throw new Error("Database pool not found. Check db.js config.");
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN'); // Start Transaction

    // 2. Insert Main Order Record
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

    // 3. Update Inventory & Insert Line Items
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)`,
          [savedOrder.id, item.productId, item.quantity, item.price]
        );

        // Deduct stock from products table
        await client.query(
          `UPDATE products SET stock = stock - $1 WHERE id = $2`,
          [item.quantity, item.productId]
        );
      }
    }

    // 4. Update Customer Loyalty & Spending Stats
    if (customerId) {
        const redeemed = pointsRedeemed || 0;
        const earned = pointsEarned || 0;

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

    await client.query('COMMIT'); // Finalize changes
    return savedOrder;

  } catch (e) {
    await client.query('ROLLBACK'); // Undo everything on failure
    console.error("❌ SQL Transaction Failed:", e);
    throw e;
  } finally {
    client.release();
  }
};

/**
 * ✅ FETCH ALL: Re-synced to include the JSON 'items' column
 */
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

/**
 * ✅ PROCESS REFUND: Handles full and partial refunds, returning items to stock.
 */
const processRefund = async (orderId, refundData) => {
    const { type, items } = refundData;

    if (type === 'full') {
        // 1. Get all items in the order
        const result = await db.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [orderId]);
        const orderItems = result.rows;

        // 2. Restore stock for every item
        for (let item of orderItems) {
            await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
        }

        // 3. Mark the order as completely refunded
        await db.query("UPDATE orders SET status = 'refunded' WHERE id = $1", [orderId]);

    } else if (type === 'partial') {
        let refundTotal = 0;

        for (let item of items) {
            // Handle naming differences (productId vs product_id)
            const pId = item.productId || item.product_id;

            // 1. Restore stock for just these specific items
            await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, pId]);

            // Calculate how much money to deduct
            refundTotal += (Number(item.price) * Number(item.quantity));

            // 2. Remove the refunded item from the order receipt
            await db.query('DELETE FROM order_items WHERE order_id = $1 AND product_id = $2', [orderId, pId]);
        }

        // 3. Deduct the refund amount from the total order amount
        await db.query('UPDATE orders SET total_amount = total_amount - $1 WHERE id = $2', [refundTotal, orderId]);

        // 4. Safety Check: If they refunded all items one-by-one, mark the whole order as refunded
        const check = await db.query('SELECT COUNT(*) FROM order_items WHERE order_id = $1', [orderId]);
        if (parseInt(check.rows[0].count) === 0) {
            await db.query("UPDATE orders SET status = 'refunded' WHERE id = $1", [orderId]);
        }
    }

    return { success: true, message: "Refund processed successfully" };
};

module.exports = {
    createOrder,
    getAllOrders,
    getOrderItems,
    processRefund // ✅ Ensure the new function is exported
};