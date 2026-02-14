const db = require('../config/db');

// ✅ HELPER FUNCTIONS: Sanitize data before sending to SQL
// Converts "" or null to 0 for numbers
const safeFloat = (val) => (val === '' || val === null || val === undefined || isNaN(val)) ? 0 : parseFloat(val);
// Converts "" to null for dates
const safeDate = (val) => (val === '' || val === null || val === undefined) ? null : val;
// Converts strings/nulls to booleans
const safeBool = (val) => (val === true || val === 'true');

// Helper to map DB rows back to Frontend Object Shape
const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  barcode: row.barcode,
  category: row.category,
  brand: row.brand,
  type: row.type,
  variantGroup: row.variant_group,
  variantName: row.variant_name,
  price: parseFloat(row.price),
  costPrice: parseFloat(row.cost_price),
  wholesalePrice: parseFloat(row.wholesale_price),
  minSellingPrice: parseFloat(row.min_selling_price),
  stock: parseFloat(row.stock),
  stockExpiryDate: row.stock_expiry_date, // Mapped correctly
  reorderLevel: parseFloat(row.reorder_level),
  maxStockLevel: parseFloat(row.max_stock_level),
  isTaxIncluded: row.is_tax_included,
  allowDiscount: row.allow_discount,
  batches: row.batches || [],
  isActive: row.is_active,
  createdAt: row.created_at
});

const getAllProducts = async () => {
  const result = await db.query('SELECT * FROM products ORDER BY id DESC');
  return result.rows.map(mapProduct);
};

// ✅ ROBUST CREATE FUNCTION
const createProduct = async (data) => {
  const query = `
    INSERT INTO products (
      name, sku, barcode, category, brand, type,
      price, cost_price, wholesale_price, min_selling_price,
      stock, stock_expiry_date, reorder_level, max_stock_level,
      batches, variant_group, is_active,
      is_tax_included, allow_discount,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
    RETURNING *;
  `;

  const values = [
    data.name,
    data.sku || null,
    data.barcode || null,
    data.category || null,
    data.brand || null,
    data.type || 'Stock',
    safeFloat(data.price),
    safeFloat(data.costPrice),
    safeFloat(data.wholesalePrice),
    safeFloat(data.minSellingPrice),
    safeFloat(data.stock),
    safeDate(data.stockExpiryDate), // ✅ Prevents "invalid input syntax for type timestamp"
    safeFloat(data.reorderLevel),
    safeFloat(data.maxStockLevel),
    JSON.stringify(data.batches || []),
    data.variantGroup || null,
    safeBool(data.isActive),
    safeBool(data.isTaxIncluded),
    safeBool(data.allowDiscount)
  ];

  try {
    const result = await db.query(query, values);
    return mapProduct(result.rows[0]);
  } catch (err) {
    console.error("❌ SQL Error in createProduct:", err); // Logs specific error to terminal
    throw err;
  }
};

// ✅ ROBUST UPDATE FUNCTION
const updateProduct = async (id, data) => {
  const query = `
    UPDATE products SET
      name = $1, sku = $2, barcode = $3, category = $4, brand = $5, type = $6,
      price = $7, cost_price = $8, wholesale_price = $9, min_selling_price = $10,
      stock = $11, stock_expiry_date = $12, reorder_level = $13, max_stock_level = $14,
      is_tax_included = $15, allow_discount = $16,
      batches = $17, variant_group = $18, is_active = $19,
      updated_at = NOW()
    WHERE id = $20
    RETURNING *;
  `;

  const values = [
    data.name,
    data.sku || null,
    data.barcode || null,
    data.category || null,
    data.brand || null,
    data.type || 'Stock',
    safeFloat(data.price),
    safeFloat(data.costPrice),
    safeFloat(data.wholesalePrice),
    safeFloat(data.minSellingPrice),
    safeFloat(data.stock),
    safeDate(data.stockExpiryDate),
    safeFloat(data.reorderLevel),
    safeFloat(data.maxStockLevel),
    safeBool(data.isTaxIncluded),
    safeBool(data.allowDiscount),
    JSON.stringify(data.batches || []),
    data.variantGroup || null,
    safeBool(data.isActive),
    id
  ];

  const result = await db.query(query, values);
  if (result.rows.length === 0) return null;
  return mapProduct(result.rows[0]);
};

const deleteProduct = async (id) => {
  const query = 'DELETE FROM products WHERE id = $1 RETURNING id';
  const result = await db.query(query, [id]);
  return result.rows.length > 0;
};

module.exports = { getAllProducts, createProduct, updateProduct, deleteProduct };