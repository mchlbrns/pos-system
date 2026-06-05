const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initializeDatabase } = require('./database/init');
const logger = require('./utils/logger');
const printerQueue = require('./utils/printerQueue');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const transactionRoutes = require('./routes/transactions');
const customerRoutes = require('./routes/customers');
const pluginRoutes = require('./routes/plugins');
const settingsRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');
const printerRoutes = require('./routes/printer');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
initializeDatabase();

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows easy integration and scripts in local network
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API versioning prefix: /api/v1/
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/plugins', pluginRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/printer', printerRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ success: true, data: { name: 'Universal POS API', version: '2.0.0' } });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler (logs to backend/logs/error.log instead of console spam)
app.use((err, req, res, next) => {
  logger.error(`Unhandled error on ${req.method} ${req.url}`, err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error. Please contact support or check error logs.'
  });
});

// Start printing queue worker
printerQueue.start();

app.listen(PORT, () => {
  logger.info(`Server started successfully on http://localhost:${PORT}`);
});
