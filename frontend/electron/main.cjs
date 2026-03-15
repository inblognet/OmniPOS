const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const dbPath = path.join(app.getPath('userData'), 'omnipos_local.db');
const db = new Database(dbPath);

console.log('📂 Local SQLite database ready at:', dbPath);

// 1. We added a new `local_cache` table for Products and Customers!
db.exec(`
  CREATE TABLE IF NOT EXISTS offline_orders (
    id TEXT PRIMARY KEY,
    order_data TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS local_cache (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "OmniPOS",
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
  });

// ✅ THE NEW PRODUCTION/DEV ROUTER
  if (app.isPackaged) {
    // If running as a compiled .exe, load the actual built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // If running in development, use localhost and open the DevTools
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {

  // --- OFFLINE ORDERS (Existing) ---
  ipcMain.handle('save-offline-order', (event, orderData) => {
    try {
      const stmt = db.prepare('INSERT INTO offline_orders (id, order_data) VALUES (?, ?)');
      const orderId = crypto.randomUUID();
      stmt.run(orderId, JSON.stringify(orderData));
      console.log('✅ Offline order securely saved to SQLite! ID:', orderId);
      return { success: true, id: orderId };
    } catch (error) {
      console.error('❌ Failed to save offline order:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-offline-orders', () => {
    try {
      const stmt = db.prepare("SELECT * FROM offline_orders WHERE status = 'pending'");
      return { success: true, orders: stmt.all() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-offline-order', (event, id) => {
    try {
      db.prepare("DELETE FROM offline_orders WHERE id = ?").run(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // --- 🆕 LOCAL DATA CACHE (New!) ---
  // Saves an entire array (like all products) to the hard drive
  ipcMain.handle('save-cache', (event, key, data) => {
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO local_cache (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
      stmt.run(key, JSON.stringify(data));
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to save cache for ${key}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Retrieves the array when the app goes offline
  ipcMain.handle('get-cache', (event, key) => {
    try {
      const row = db.prepare('SELECT value FROM local_cache WHERE key = ?').get(key);
      return { success: true, data: row ? JSON.parse(row.value) : null };
    } catch (error) {
      console.error(`❌ Failed to get cache for ${key}:`, error);
      return { success: false, error: error.message, data: null };
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});