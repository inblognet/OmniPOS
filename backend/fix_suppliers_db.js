const db = require('./config/db');

const fixSupplierColumns = async () => {
  try {
    console.log("Checking products table...");

    await db.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS supplier_note TEXT;
    `);

    console.log("✅ 'supplier_id' and 'supplier_note' successfully added to the products table!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating Database:", err);
    process.exit(1);
  }
};

fixSupplierColumns();