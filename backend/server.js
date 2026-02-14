require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db'); // Connects to your real database

// ✅ Import the Real Controller directly
const dashboardController = require('./controllers/dashboardController');

// Import other routes
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');

const app = express();

// ✅ 1. Allow Frontend on Port 5001
app.use(cors({
  origin: true, // Allow any origin (Simple & Safe for local dev)
  credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));

// ✅ 2. REAL DASHBOARD ROUTE
// This connects the URL to your actual database function
app.get('/api/dashboard/stats', dashboardController.getStats);

// 3. Other Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);

// Health Check
app.get('/', (req, res) => res.send('OmniPos Backend Running on Port 5001 🚀'));

// ✅ KEEP PORT 5001 (It is working!)
const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server Restored on Port ${PORT}`);
});