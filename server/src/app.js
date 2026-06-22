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
const stocksRoutes = require('./modules/stocks/stocks.routes');
const formsRoutes = require('./modules/forms/forms.routes');

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
app.use('/api/stocks', stocksRoutes);
app.use('/api/forms', formsRoutes);

// ── Quick Messages Endpoint (for stock alerts) ──
const fs = require('fs');
const messagesPath = path.resolve(__dirname, '../data/messages.json');
app.post('/api/messages', (req, res) => {
  try {
    const msg = {
      id: require('crypto').randomUUID(),
      ...req.body,
      createdAt: new Date().toISOString(),
      read: false,
    };
    let messages = [];
    try { messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8')); } catch {}
    messages.push(msg);
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
    res.json({ success: true, data: msg, message: 'Alert sent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save message' });
  }
});

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

// trigger restart

// trigger restart 2

// trigger restart 3

// trigger restart 4

// trigger restart 5

// trigger restart 6

// trigger restart 7
