require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');

// Import Routes
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const app = express();

// ✅ 1. REQUEST LOGGER (First Priority)
// If this logs, the connection is successful.
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ✅ 2. UNIVERSAL CORS (The "Open Door")
app.use(cors({
  origin: true, // Automatically allows any origin (localhost:3000, 127.0.0.1, etc.)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ 3. PRE-FLIGHT FIX FOR NODE v25
// ❌ OLD: app.options('*', cors());  <-- THIS CAUSED THE CRASH
// ✅ NEW: Uses Regex /(.*)/ to safely match all routes
app.options(/(.*)/, cors());

app.use(express.json());
app.use(morgan('dev'));

// --- ROUTES ---
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/settings', settingsRoutes);

// Health Check
app.get('/', (req, res) => res.send('✅ OmniPOS Backend is Online on Port 5500!'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// ✅ 4. HARDCODED PORT 5500
// We use 5500 to avoid the "Port 5000" conflict on Windows
const PORT = 5500;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 SERVER RESTARTED SUCCESSFULLY`);
  console.log(`   - Port: ${PORT}`);
  console.log(`   - Node Version: ${process.version}`);
  console.log(`   - Status: Waiting for Frontend...\n`);
});