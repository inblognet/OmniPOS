require('dotenv').config();
const db = require('./config/db');

const fixDatabase = async () => {
  try {
    console.log("🔧 Fixing Database Tables...");

    // 1. Create order_items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        returned_quantity INTEGER DEFAULT 0
      );
    `);
    console.log("✅ Table 'order_items' created successfully!");

    // 2. Ensure orders table has the 'items' column (for the JSON backup)
    await db.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS items JSONB;
    `);
    console.log("✅ Column 'items' ensured on 'orders' table!");

    process.exit();
  } catch (err) {
    console.error("❌ Error fixing database:", err);
    process.exit(1);
  }
};

fixDatabase();