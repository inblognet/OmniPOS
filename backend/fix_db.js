const db = require('./config/db'); // Adjust path if your db config is located elsewhere

const updateDatabase = async () => {
  try {
    console.log("Checking customers table...");

    // Add the email column to the customers table
    await db.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);

    console.log("✅ 'email' column successfully verified/added to the customers table!");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating Database:", err);
    process.exit(1);
  }
};

updateDatabase();