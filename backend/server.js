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
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// --- MIDDLEWARE ---

// 1. Request Logger (First Priority)
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// 2. Universal CORS for Web & Desktop Apps
app.use(cors({
  origin: '*', // ✅ Allows requests from BOTH web browsers and Electron 'file://' paths
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
  // ❌ Removed 'credentials: true' to prevent CORS conflicts
}));

// Pre-flight fix for Node v25
app.options(/(.*)/, cors());

// 3. Body Parsers & Logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// --- ROUTES ---
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health Check
app.get('/', (req, res) => res.status(200).send('✅ OmniPOS Backend is Online!'));

// Handle 404 - Unknown Routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// --- SERVER STARTUP ---

const PORT = process.env.PORT || 5500;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 SERVER RESTARTED SUCCESSFULLY`);
  console.log(`   - Port: ${PORT}`);
  console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - Node Version: ${process.version}`);
  console.log(`   - Status: Waiting for Frontend...\n`);
});