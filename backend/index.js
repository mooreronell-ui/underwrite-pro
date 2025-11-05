// ============================================================
// UNDERWRITE PRO - BACKEND API (Layer 3)
// Node.js + Express + PostgreSQL
// ============================================================

// Load dotenv only in non-production (Render injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// ============================================================
// MONITORING - SENTRY (OPTIONAL)
// ============================================================

// Initialize Sentry if DSN is configured (not placeholder)
if (process.env.SENTRY_DSN_BACKEND && !process.env.SENTRY_DSN_BACKEND.startsWith('TBD')) {
  try {
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN_BACKEND,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.2, // 20% of transactions
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers?.authorization;
        }
        return event;
      }
    });
    console.log('[SENTRY] Initialized for error tracking');
  } catch (err) {
    console.warn('[SENTRY] Failed to initialize:', err.message);
  }
} else {
  console.log('[SENTRY] Skipped (DSN not configured or is placeholder)');
}

// Middleware imports
const { authMiddleware } = require('./middleware/auth');
const { orgContextMiddleware } = require('./middleware/orgContext');
const { auditLogMiddleware } = require('./middleware/auditLog');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const dealsRoutes = require('./routes/deals');
const underwritingRoutes = require('./routes/underwriting');
const termSheetsRoutes = require('./routes/termSheets');
const orgsRoutes = require('./routes/orgs');
const webhooksRoutes = require('./routes/webhooks');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Helmet for security headers
app.use(helmet());

// CORS configuration with dynamic origin validation
const productionOrigin = process.env.FRONTEND_URL;
const allowedOrigins = [productionOrigin];
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:3001');
}

console.log(`[CORS] Allowed origins: ${allowedOrigins.filter(Boolean).join(', ')}`);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`), false);
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting (60 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ============================================================
// GENERAL MIDDLEWARE
// ============================================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan('combined'));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'underwrite-pro-api',
    version: 'v1.0.0-prod-lock',
    environment: process.env.NODE_ENV || 'production'
  });
});

// ============================================================
// PUBLIC API ROUTES (NO AUTH)
// ============================================================

// Public deals endpoint for testing (must be before auth middleware)
const publicDealsController = require('./controllers/publicDealsController');
app.get('/api/deals/public', publicDealsController.listPublicDeals);

// ============================================================
// API ROUTES (with authentication & org context)
// ============================================================

// Org routes (includes auth middleware internally)
app.use('/api/orgs', orgsRoutes);

// Protected routes (apply auth + org context)
const supabaseAuth = require('./middleware/supabaseAuth');
const orgContext = require('./middleware/orgContext');
app.use(supabaseAuth);
app.use(orgContext);

// Mount route handlers
app.use('/api/deals', dealsRoutes);
app.use('/api/underwriting', underwritingRoutes);
app.use('/api/term-sheets', termSheetsRoutes);

// Webhooks (no auth required, signature validation inside handlers)
app.use('/webhooks', webhooksRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         UNDERWRITE PRO API - Layer 3                      ║
║         Node.js + Express + PostgreSQL                    ║
║                                                           ║
║         Status: Running                                   ║
║         Port: ${PORT}                                        ║
║         Environment: ${process.env.NODE_ENV || 'development'}                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  console.log(`[INFO] API Server listening on port ${PORT}`);
  console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
  console.log(`[INFO] Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[INFO] HTTP server closed');
  });
});

module.exports = app;
