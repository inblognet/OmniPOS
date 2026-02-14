require('dotenv').config();
const db = require('./config/db');

const fixLoyaltyColumns = async () => {
  try {
    console.log("🔧 Upgrading Customers Table for Loyalty...");

    // Add all missing loyalty columns at once
    await db.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_spend DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_visit TIMESTAMP DEFAULT NOW();
    `);

    console.log("✅ Success! Loyalty columns added to 'customers' table.");
    process.exit();
  } catch (err) {
    console.error("❌ Error updating database:", err);
    process.exit(1);
  }
};

fixLoyaltyColumns();