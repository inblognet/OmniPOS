require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');

// Import Routes
const webAdminRoutes = require('./routes/webAdminRoutes');
const webRoutes = require('./routes/webRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const webAuthRoutes = require('./routes/webAuthRoutes');


const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const supplierRoutes = require('./routes/supplierRoutes');

const app = express();

// --- MIDDLEWARE ---

// 1. Request Logger (Fixed to Sri Lanka Local Time for Render)
app.use((req, res, next) => {
  const localTime = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo' });
  console.log(`📡 [${localTime}] ${req.method} ${req.url}`);
  next();
});

// 2. Universal CORS for Web & Desktop Apps
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Pre-flight fix for Node v25
app.options(/(.*)/, cors());

// 3. Body Parsers & Logging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));


// --- 🚨 DIAGNOSTIC TEST ROUTE 🚨 ---
// This strictly tests if Express is allowing PUT requests at all.
app.put('/api/test-put', (req, res) => {
    res.json({
        success: true,
        message: "✅ PUT requests are successfully reaching your server.js file!"
    });
});
// -----------------------------------


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
app.use('/api/suppliers', supplierRoutes);
app.use('/api/web', webRoutes);
app.use('/api/web-admin', webAdminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/web/auth', webAuthRoutes);

// Health Check
app.get('/', (req, res) => res.status(200).send('✅ OmniPOS Backend is Online!'));

// Handle 404 - Unknown Routes
app.use((req, res, next) => {
  // If Thunder Client reaches this file but the route is wrong, it will print this JSON!
  res.status(404).json({ error: 'Route not found inside OmniPOS server.js', path: req.url });
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

// Uses the environment variable, but strictly defaults to 5005 if missing.
const PORT = process.env.PORT || 5005;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 SERVER RESTARTED SUCCESSFULLY`);
  console.log(`   - Port: ${PORT}`);
  console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - Node Version: ${process.version}`);
  console.log(`   - Status: Waiting for Frontend...\n`);
});