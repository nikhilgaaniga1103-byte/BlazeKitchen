/* =============================================
   BLAZE KITCHEN — server.js (Entry Point)
   ============================================= */

// ── Crash Guards (prevent silent process death) ──
process.on('uncaughtException', err => {
  if (err && err.code === 'EADDRINUSE') {
    if (isDev) {
      console.log('ℹ️  Backend already running on this port. Close duplicate terminal or use the existing instance.');
      process.exit(0);
    }
    console.error('❌ Port is already in use. Stop the existing server on this port and restart.');
    process.exit(1);
  }
  console.error('💥 Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Promise Rejection:', reason);
  process.exit(1);
});

const express  = require('express');
const net      = require('net');
const mongoose = require('mongoose');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

// ── Route Imports ──
const authRoutes         = require('./seed/routes/auth.routes');
const menuRoutes         = require('./seed/routes/menu.routes');
const userRoutes         = require('./seed/routes/user.routes');
const categoryMenuRoutes = require('./seed/routes/categoryMenu.routes');
const orderRoutes        = require('./seed/routes/order.routes');
const adminRoutes        = require('./seed/routes/admin.routes');
const feedbackRoutes     = require('./seed/routes/feedback.routes');
const settingsRoutes     = require('./seed/routes/settings.routes');
const chatRoutes         = require('./seed/routes/chat.routes');
const moodRoutes         = require('./seed/routes/mood.routes');
const sse                = require('./sse');

// ── Error Handler ──
const errorHandler = require('./middleware/error.middleware');

const app = express();

// ── Security Middleware ──
app.use(helmet());                    // Secure HTTP headers
app.use(mongoSanitize());             // Prevent NoSQL injection

// ── Rate Limiting ──
// Higher limit in dev to avoid false 429s from admin polling + API calls
const isDev = (process.env.NODE_ENV || 'development') === 'development';
const limiter = rateLimit({
  windowMs : parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max      : parseInt(process.env.RATE_LIMIT_MAX) || (isDev ? 1000 : 100),
  message  : { success: false, message: 'Too many requests. Please try again later.' },
  skip     : (req) => req.path === '/admin/events' || req.path === '/events/public' || req.path === '/health'  // SSE + health never rate-limited
});
app.use('/api', limiter);

// ── CORS ──
app.use(cors({
  origin     : process.env.CLIENT_URL || '*',
  methods    : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── Body Parsers ──
// Allow moderate payloads for review images pasted as data URLs.
app.use(express.json({ limit: process.env.BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || '2mb' }));

// ── Logger (dev only) ──
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🔥 Blaze Kitchen API is running',
    env    : process.env.NODE_ENV,
    time   : new Date().toISOString()
  });
});

// ── API Routes ──
app.use('/api/auth',  authRoutes);
app.use('/api/menu',  menuRoutes);
app.use('/api/menus', categoryMenuRoutes);   // structured 8-category menu
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mood', moodRoutes);

// ── Public SSE — no auth, for frontend real-time updates ──
app.get('/api/events/public', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  sse.addPublicClient(res);
  res.write('event: connected\ndata: {"status":"ok"}\n\n');

  // Send retry directive — tells browser to reconnect after 3s (not the default ~3s anyway)
  res.write('retry: 3000\n\n');

  const hb = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(hb); }
  }, 25000);

  req.on('close', () => {
    clearInterval(hb);
    sse.removePublicClient(res);
  });
});

// ── Admin SSE — MUST come before adminRoutes (which enforces header-only auth) ──
app.get('/api/admin/events', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();
  try {
    const jwt  = require('jsonwebtoken');
    const User = require('./models/User.model');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') return res.status(403).end();
  } catch { return res.status(401).end(); }

  // SSE headers
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  sse.addClient(res);
  res.write('event: connected\ndata: {"status":"ok"}\n\n');

  // Heartbeat every 25s to keep connection alive through proxies
  const hb = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch { clearInterval(hb); } }, 25000);
  req.on('close', () => { clearInterval(hb); sse.removeClient(res); });
});

app.use('/api/admin', adminRoutes);

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──
app.use(errorHandler);

// ── MongoDB + Server Start ──
const PORT = process.env.PORT || 5000;
const AUTO_RESTART_ON_DB_DISCONNECT =
  (process.env.AUTO_RESTART_ON_DB_DISCONNECT || 'true') === 'true';
const DB_DISCONNECT_RESTART_DELAY_MS = Number(process.env.DB_DISCONNECT_RESTART_DELAY_MS) || 15000;
let dbDisconnectRestartTimer = null;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err && err.code === 'EADDRINUSE') return resolve(false);
        return resolve(false);
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      });

    tester.listen(port);
  });
}

// Connection event logging — see exactly when/why Mongo drops
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected — retrying…');

  if (!AUTO_RESTART_ON_DB_DISCONNECT || dbDisconnectRestartTimer) return;

  dbDisconnectRestartTimer = setTimeout(() => {
    dbDisconnectRestartTimer = null;
    if (mongoose.connection.readyState !== 1) {
      console.error(`❌ MongoDB still disconnected after ${DB_DISCONNECT_RESTART_DELAY_MS}ms. Restarting backend...`);
      process.exit(1);
    }
  }, DB_DISCONNECT_RESTART_DELAY_MS);
});
mongoose.connection.on('reconnected',  () => {
  if (dbDisconnectRestartTimer) {
    clearTimeout(dbDisconnectRestartTimer);
    dbDisconnectRestartTimer = null;
  }
  console.log('✅  MongoDB reconnected');
});
mongoose.connection.on('error',        (e) => console.error('❌  MongoDB error:', e.message));

async function ensureAdminAccount() {
  try {
    const User = require('./models/User.model');
    let admin = await User.findOne({ email: 'admin@blazekitchen.com' });
    if (!admin) {
      await User.create({
        name    : 'Blaze Admin',
        email   : 'admin@blazekitchen.com',
        password: 'Admin@123',
        role    : 'admin'
      });
      console.log('👤 Admin account auto-created: admin@blazekitchen.com');
    } else if (admin.role !== 'admin') {
      admin.role = 'admin';
      await admin.save();
      console.log('🔧 Promoted existing user to admin: admin@blazekitchen.com');
    }
  } catch (e) {
    console.warn('⚠️  Could not auto-ensure admin:', e.message);
  }
}

async function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Blaze Kitchen API running on http://localhost:${PORT}`);
    console.log(`📖 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📡 Tip: use 'npm run dev' (nodemon) for auto-restart on file changes`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      if (isDev) {
        console.log(`ℹ️  Port ${PORT} already has a backend instance. Backend is already running.`);
        process.exit(0);
      }
      console.error(`❌ Port ${PORT} is already in use. Run only one backend instance.`);
      process.exit(1);
    }
    throw err;
  });

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
      heartbeatFrequencyMS:     10000,
    });
    console.log('✅ MongoDB connected');
    await ensureAdminAccount();
  } catch (err) {
    console.error('⚠️  MongoDB connection failed:', err.message);
    console.warn('🚧 Starting server without MongoDB; DB-backed endpoints will be unavailable until MongoDB is reachable.');
  }
}

startServer();

module.exports = app;
