/**
 * NotificationHub Backend Server
 * Xử lý tất cả yêu cầu từ frontend
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const notificationRoutes = require('./routes/notifications');
const { pool } = require('./config');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'NotificationHub Backend API',
    version: '1.0.0',
    endpoints: {
      notifications: '/api/notifications',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
});

// Test database connection and start server
async function startServer() {
  try {
    try {
      const connection = await pool.getConnection();
      console.log('✓ Database connected successfully');
      await connection.release();
    } catch (dbError) {
      console.warn('⚠ Database connection failed - running in demo mode');
      console.warn('  Make sure MySQL is running and configured properly');
      console.warn(`  DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
      console.warn(`  DB_USER: ${process.env.DB_USER || 'root'}`);
      console.warn(`  DB_NAME: ${process.env.DB_NAME || 'notifyhub_db'}`);
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 NotificationHub Backend Server is running on port ${PORT}`);
      console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
      console.log(`💓 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`\nEnvironment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  await pool.end();
  process.exit(0);
});

module.exports = app;
