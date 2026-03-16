const db = require('../config/db');

// --- SETTINGS CONFIGURATION ---
const getSettings = async () => {
  let result = await db.query('SELECT config FROM store_settings WHERE id = 1');
  if (result.rows.length === 0) {
    result = await db.query("INSERT INTO store_settings (id, config) VALUES (1, '{}') RETURNING config");
  }
  return result.rows[0].config;
};

const updateSettings = async (data) => {
  const result = await db.query(`
    INSERT INTO store_settings (id, config, updated_at)
    VALUES (1, $1, NOW())
    ON CONFLICT (id) DO UPDATE
    SET config = EXCLUDED.config, updated_at = NOW()
    RETURNING config;
  `, [JSON.stringify(data)]);
  return result.rows[0].config;
};

// --- DANGER ZONE / SYSTEM ADMIN ---
const exportDatabase = async () => {
    const products = await db.query('SELECT * FROM products');
    const orders = await db.query('SELECT * FROM orders');
    const orderItems = await db.query('SELECT * FROM order_items');
    const customers = await db.query('SELECT * FROM customers');
    const settings = await db.query('SELECT * FROM store_settings WHERE id = 1');
    const integrations = await db.query('SELECT * FROM store_integrations WHERE id = 1');

    return {
        timestamp: new Date().toISOString(),
        products: products.rows,
        orders: orders.rows,
        orderItems: orderItems.rows,
        customers: customers.rows,
        settings: settings.rows[0]?.config || {},
        integrations: integrations.rows[0]?.config || {}
    };
};

// ✅ FIX: Full System Restore armored with a SQL Transaction!
const restoreDatabase = async (backupData) => {
    if (!db.pool) throw new Error("Database pool not found.");
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN'); // 🛡️ START TRANSACTION

        console.log("Starting System Restore. Wiping current data...");
        await client.query('TRUNCATE TABLE order_items, orders, products, customers, damage_logs RESTART IDENTITY CASCADE');

        const insertData = async (tableName, items) => {
            if (!items || items.length === 0) return;
            for (const item of items) {
                const keys = Object.keys(item);
                const values = Object.values(item).map(val => {
                    if (val !== null && typeof val === 'object') {
                        return JSON.stringify(val);
                    }
                    return val;
                });

                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

                await client.query(
                    `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`,
                    values
                );
            }
            if (items[0] && items[0].id) {
                await client.query(`SELECT setval('${tableName}_id_seq', (SELECT MAX(id) FROM ${tableName}))`);
            }
        };

        console.log("Restoring Customers...");
        await insertData('customers', backupData.customers);

        console.log("Restoring Products...");
        await insertData('products', backupData.products);

        console.log("Restoring Orders...");
        await insertData('orders', backupData.orders);

        console.log("Restoring Order Items...");
        await insertData('order_items', backupData.orderItems);

        console.log("Restoring Settings & Integrations...");
        if (backupData.settings) {
            await client.query(`UPDATE store_settings SET config = $1 WHERE id = 1`, [JSON.stringify(backupData.settings)]);
        }
        if (backupData.integrations) {
            await client.query(`UPDATE store_integrations SET config = $1 WHERE id = 1`, [JSON.stringify(backupData.integrations)]);
        }

        await client.query('COMMIT'); // 🟢 SAVE CHANGES
        console.log("✅ System Restore Complete!");
        return { success: true, message: "Database restored successfully." };

    } catch (error) {
        await client.query('ROLLBACK'); // 🔴 PANIC BUTTON: UNDO EVERYTHING!
        console.error("❌ Restore failed, database rolled back to safety:", error);
        throw new Error("Failed to restore database. Ensure the backup file is valid.");
    } finally {
        client.release();
    }
};

const clearSales = async () => {
    await db.query('TRUNCATE TABLE order_items, orders RESTART IDENTITY CASCADE');
    return { success: true, message: "Sales Cleared" };
};

const clearInventory = async () => {
    await db.query('UPDATE products SET is_active = false');
    return { success: true, message: "Inventory Archived" };
};

const factoryReset = async () => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE TABLE order_items, orders, products, customers, damage_logs RESTART IDENTITY CASCADE');
        await client.query("UPDATE store_settings SET config = '{}' WHERE id = 1");
        await client.query("UPDATE store_integrations SET config = '{}' WHERE id = 1");
        await client.query('COMMIT');
        return { success: true, message: "Factory Reset Complete" };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getSettings, updateSettings,
    exportDatabase, restoreDatabase, clearSales, clearInventory, factoryReset
};