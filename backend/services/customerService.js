const db = require('../config/db');

// Map DB snake_case to Frontend camelCase
const mapCustomer = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  type: row.type || 'Walk-in',
  loyaltyJoined: !!row.loyalty_joined,
  loyaltyPoints: parseFloat(row.loyalty_points || 0),
  totalSpend: parseFloat(row.total_spend || 0),
  totalPurchases: parseInt(row.total_purchases || 0),
  lastPurchaseDate: row.last_purchase_date,
  createdAt: row.created_at
});

const getAllCustomers = async () => {
  const result = await db.query('SELECT * FROM customers ORDER BY name ASC');
  return result.rows.map(mapCustomer);
};

const createCustomer = async (data) => {
  const query = `
    INSERT INTO customers (name, phone, email, type, loyalty_joined, loyalty_points, total_spend, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *;
  `;
  const values = [
    data.name,
    data.phone,
    data.email,
    data.type || 'Walk-in',
    data.loyaltyJoined !== undefined ? Boolean(data.loyaltyJoined) : false,
    data.loyaltyPoints || 0,
    data.totalSpend || 0
  ];

  const result = await db.query(query, values);
  return mapCustomer(result.rows[0]);
};

// ✅ FINAL ROBUST UPDATE FUNCTION
const updateCustomer = async (id, data) => {
  console.log("DEBUG: Updating Customer ID:", id, "With Payload:", data);

  const query = `
    UPDATE customers SET
      name = COALESCE($1, name),
      phone = COALESCE($2, phone),
      email = COALESCE($3, email),
      type = COALESCE($4, type),
      loyalty_joined = COALESCE($5, loyalty_joined),
      loyalty_points = COALESCE($6, loyalty_points),
      total_spend = COALESCE($7, total_spend),
      total_purchases = COALESCE($8, total_purchases),
      last_purchase_date = COALESCE($9, last_purchase_date),
      updated_at = NOW()
    WHERE id = $10
    RETURNING *;
  `;

  const safeNum = (val, isInt = false) => {
    const parsed = isInt ? parseInt(val) : parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  };

  const values = [
    data.name || null,
    data.phone || null,
    data.email || null,
    data.type || null,
    data.loyaltyJoined !== undefined ? Boolean(data.loyaltyJoined) : null,
    safeNum(data.loyaltyPoints),
    safeNum(data.totalSpend),
    safeNum(data.totalPurchases, true),
    data.lastPurchaseDate || null,
    parseInt(id)
  ];

  try {
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      console.warn("⚠️ No customer found with ID:", id);
      return null;
    }
    return mapCustomer(result.rows[0]);
  } catch (error) {
    console.error("❌ SQL CRASH DETAILS (Update):", error.message);
    throw error;
  }
};

// ✅ FINAL ROBUST DELETE FUNCTION
const deleteCustomer = async (id) => {
  try {
    const customerId = parseInt(id);
    console.log("DEBUG: Attempting to delete Customer ID:", customerId);

    const query = 'DELETE FROM customers WHERE id = $1 RETURNING id';
    const result = await db.query(query, [customerId]);

    if (result.rows.length === 0) {
      console.warn("⚠️ No customer found in database with ID:", customerId);
      return false;
    }

    console.log("✅ Customer deleted successfully from Cloud:", customerId);
    return true;
  } catch (error) {
    // This logs the exact SQL constraint preventing deletion in your terminal
    console.error("❌ SQL DELETE ERROR:", error.message);
    throw error;
  }
};

module.exports = { getAllCustomers, createCustomer, updateCustomer, deleteCustomer };