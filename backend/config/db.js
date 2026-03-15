const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

// ✅ 1. Catch Neon background idle disconnects
pool.on('error', (err, client) => {
  console.error('⚠️ Unexpected error on idle client (safely ignored):', err.message);
});

// ✅ 2. Test connection AND RELEASE the client!
pool.connect((err, client, release) => {
  if (err) {
    console.error('🔥 Failed to connect to Neon DB:', err.message);
  } else {
    console.log('✅ Connected to Neon PostgreSQL Database!');
    release(); // <-- THIS IS THE MISSING PIECE! Puts it safely back in the pool.
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};