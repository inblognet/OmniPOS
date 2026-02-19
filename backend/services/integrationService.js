const db = require('../config/db');

const getSettings = async () => {
  let result = await db.query('SELECT config FROM store_integrations WHERE id = 1');

  // If no settings exist yet, create a default blank row
  if (result.rows.length === 0) {
    result = await db.query("INSERT INTO store_integrations (id, config) VALUES (1, '{}') RETURNING config");
  }
  return result.rows[0].config;
};

const updateSettings = async (data) => {
  const result = await db.query(`
    INSERT INTO store_integrations (id, config, updated_at)
    VALUES (1, $1, NOW())
    ON CONFLICT (id) DO UPDATE
    SET config = EXCLUDED.config, updated_at = NOW()
    RETURNING config;
  `, [JSON.stringify(data)]);

  return result.rows[0].config;
};

module.exports = { getSettings, updateSettings };