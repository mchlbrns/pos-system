const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initializeDatabase } = require('./database/init');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const licenseMiddleware = require('./middleware/license');
const printQueueWorker = require('./services/PrintQueueWorker');
const pluginLoader = require('./services/PluginLoader');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const transactionRoutes = require('./routes/transactions');
const printerRoutes = require('./routes/printer');
const reportRoutes = require('./routes/reports');
const customerRoutes = require('./routes/customers');
const pluginRoutes = require('./routes/plugins');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
initializeDatabase();

// Load plugins
pluginLoader.initialize();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// License Check Middleware
app.use(licenseMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/printer', printerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/plugins', pluginRoutes);
app.use('/api/settings', settingsRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Universal POS API is running', version: '1.0.0' });
});

// 404 Route Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

// Start Print Queue Worker
printQueueWorker.start();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
