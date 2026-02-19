const db = require('../config/db');

// ✅ MAPPER: Matches DB snake_case to Frontend camelCase
const mapCustomer = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email, // ✅ Email is mapped
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
    INSERT INTO customers (name, phone, email, type, loyalty_joined, loyalty_points, total_spend, total_purchases, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *;
  `;
  const values = [
    data.name,
    data.phone || null,
    data.email || null, // ✅ Safely insert email
    data.type || 'Walk-in',
    data.loyaltyJoined !== undefined ? Boolean(data.loyaltyJoined) : false,
    data.loyaltyPoints || 0,
    data.totalSpend || 0,
    data.totalPurchases || 0 // ✅ Explicitly tracking total purchases on creation
  ];

  const result = await db.query(query, values);
  return mapCustomer(result.rows[0]);
};

/**
 * ✅ UPDATE CUSTOMER: Uses COALESCE to keep existing data if new values aren't provided
 */
const updateCustomer = async (id, data) => {
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
    if (val === undefined || val === null) return null;
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

  const result = await db.query(query, values);
  return result.rows.length ? mapCustomer(result.rows[0]) : null;
};

const deleteCustomer = async (id) => {
  const query = 'DELETE FROM customers WHERE id = $1 RETURNING id';
  const result = await db.query(query, [parseInt(id)]);
  return result.rows.length > 0;
};

module.exports = { getAllCustomers, createCustomer, updateCustomer, deleteCustomer };