// backend/fix_delete_constraint.js
const db = require('./config/db');

const run = async () => {
  try {
    console.log("⏳ Updating database constraints for deletion...");

    // 1. Find the name of the existing foreign key constraint
    const findConstraint = `
      SELECT constraint_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'orders' AND column_name = 'customer_id';
    `;
    const res = await db.query(findConstraint);
    const constraintName = res.rows[0]?.constraint_name;

    if (constraintName) {
      // 2. Drop the old strict constraint
      await db.query(`ALTER TABLE orders DROP CONSTRAINT ${constraintName};`);

      // 3. Add new flexible constraint (SET NULL keeps the order data for your reports)
      await db.query(`
        ALTER TABLE orders
        ADD CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL;
      `);
      console.log("✅ Constraint updated! You can now delete customers.");
    } else {
      console.log("❌ Could not find constraint. Check if your orders table uses 'customer_id'.");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating constraint:", error.message);
    process.exit(1);
  }
};

run();