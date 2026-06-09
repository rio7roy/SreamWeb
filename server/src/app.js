const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { env } = require('./config/env');
const { errorHandler } = require('./middleware/error.middleware');

// Import route modules
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const uploadsRoutes = require('./modules/uploads/uploads.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const eventsRoutes = require('./modules/events/events.routes');
const brcsRoutes = require('./modules/brcs/brcs.routes');

const app = express();

// ── Security ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──
app.use(cors({
  origin: true, // Reflects the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Logging ──
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static Files (uploads) ──
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'STREAM Ecosystem API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/brcs', brcsRoutes);

// ── 404 Handler ──
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// ── Global Error Handler ──
app.use(errorHandler);

module.exports = app;
