const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

pool.connect((err) => {
  if (err) {
    console.error('🔥 Failed to connect to Neon DB:', err.message);
  } else {
    console.log('✅ Connected to Neon PostgreSQL Database!');
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};