const db = require('../config/db');

// ✅ DATA SANITIZATION HELPERS
const safeFloat = (val) => (val === '' || val === null || val === undefined || isNaN(val)) ? 0 : parseFloat(val);
const safeDate = (val) => (val === '' || val === null || val === undefined) ? null : val;
const safeBool = (val) => (val === true || val === 'true');

// ✅ MAPPER: Added discount, supplierId, and supplierNote
const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  barcode: row.barcode,
  category: row.category,
  brand: row.brand,
  type: row.type,
  variantGroup: row.variant_group,
  price: parseFloat(row.price),
  costPrice: parseFloat(row.cost_price),
  wholesalePrice: parseFloat(row.wholesale_price),
  minSellingPrice: parseFloat(row.min_selling_price),
  stock: parseFloat(row.stock),
  stockExpiryDate: row.stock_expiry_date,
  reorderLevel: parseFloat(row.reorder_level),
  maxStockLevel: parseFloat(row.max_stock_level),
  isTaxIncluded: row.is_tax_included,
  allowDiscount: row.allow_discount,
  discount: parseFloat(row.discount || 0),
  batches: row.batches || [],
  isActive: row.is_active,
  createdAt: row.created_at,
  damagedQty: parseFloat(row.damaged_qty || 0),
  // ✅ NEW: Supplier Mapping
  supplierId: row.supplier_id || null,
  supplierNote: row.supplier_note || null
});

// ✅ GET ALL
const getAllProducts = async () => {
  const result = await db.query('SELECT * FROM products WHERE is_active = true ORDER BY id DESC');
  return result.rows.map(mapProduct);
};

// ✅ CREATE PRODUCT
const createProduct = async (data) => {
  // ✅ NEW: Added supplier_id ($21) and supplier_note ($22)
  const query = `
    INSERT INTO products (
      name, sku, barcode, category, brand, type,
      price, cost_price, wholesale_price, min_selling_price,
      stock, stock_expiry_date, reorder_level, max_stock_level,
      batches, variant_group, is_active,
      is_tax_included, allow_discount, discount,
      supplier_id, supplier_note, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
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
    JSON.stringify(data.batches || []),
    data.variantGroup || null,
    safeBool(data.isActive),
    safeBool(data.isTaxIncluded),
    safeBool(data.allowDiscount),
    safeFloat(data.discount),      // $20
    data.supplierId || null,       // ✅ $21
    data.supplierNote || null      // ✅ $22
  ];

  const result = await db.query(query, values);
  return mapProduct(result.rows[0]);
};

// ✅ UPDATE PRODUCT
const updateProduct = async (id, data) => {
  // ✅ NEW: Added supplier_id ($21) and supplier_note ($22), bumping id to $23
  const query = `
    UPDATE products SET
      name = $1, sku = $2, barcode = $3, category = $4, brand = $5, type = $6,
      price = $7, cost_price = $8, wholesale_price = $9, min_selling_price = $10,
      stock = $11, stock_expiry_date = $12, reorder_level = $13, max_stock_level = $14,
      is_tax_included = $15, allow_discount = $16,
      batches = $17, variant_group = $18, is_active = $19, discount = $20,
      supplier_id = $21, supplier_note = $22,
      updated_at = NOW()
    WHERE id = $23
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
    safeFloat(data.discount),      // $20
    data.supplierId || null,       // ✅ $21
    data.supplierNote || null,     // ✅ $22
    id                             // $23
  ];

  const result = await db.query(query, values);
  return result.rows.length ? mapProduct(result.rows[0]) : null;
};

// ✅ SMART DELETE
const deleteProduct = async (id) => {
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return { success: false, message: "Product not found" };
    return { success: true, message: "Product deleted permanently" };
  } catch (error) {
    if (error.code === '23503') {
      console.log(`⚠️ Product ${id} has sales history. Archiving instead.`);
      await db.query('UPDATE products SET is_active = false WHERE id = $1', [id]);
      return { success: true, message: "Product archived (Sales history preserved)" };
    }
    throw error;
  }
};

// ✅ REPORT DAMAGE
const reportDamage = async (id, qty, reason) => {
  if (!db.pool) throw new Error("Database pool not found.");
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(`
      UPDATE products
      SET stock = stock - $1, damaged_qty = COALESCE(damaged_qty, 0) + $1
      WHERE id = $2
      RETURNING *
    `, [qty, id]);

    if (result.rows.length > 0) {
      await client.query(
        'INSERT INTO damage_logs (product_id, qty, reason) VALUES ($1, $2, $3)',
        [id, qty, reason]
      );
    }
    await client.query('COMMIT');
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Report Damage Transaction Failed:", error);
    throw error;
  } finally {
    client.release();
  }
};

// ✅ GET DAMAGE LOGS
const getDamageLogs = async () => {
  try {
    const result = await db.query(`
      SELECT d.id, p.name, d.qty, d.reason, d.created_at
      FROM damage_logs d
      JOIN products p ON d.product_id = p.id
      ORDER BY d.created_at DESC
    `);
    return result.rows;
  } catch (error) {
    console.error("Get Damage Logs Error:", error);
    throw error;
  }
};

// --- CATEGORY MANAGEMENT ---
const getCategories = async () => {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name ASC');
    return rows;
};

const addCategory = async (name) => {
    const { rows } = await db.query(`
        INSERT INTO categories (name) VALUES ($1)
        ON CONFLICT (name) DO NOTHING
        RETURNING *
    `, [name]);

    if (rows.length === 0) throw new Error("Category already exists");
    return rows[0];
};

const deleteCategory = async (id) => {
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    return { success: true, message: "Category deleted" };
};

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  reportDamage,
  getDamageLogs,
  getCCategories: getCategories, // Keeping your export syntax
  addCategory,
  deleteCategory
};