// ============================================================
// UNDERWRITE PRO - BACKEND API (Layer 3)
// Node.js + Express + PostgreSQL
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

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

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

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
    version: '1.0.0'
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

// Apply authentication middleware to all /api routes
app.use('/api', authMiddleware);
app.use('/api', orgContextMiddleware);
app.use('/api', auditLogMiddleware);

// Mount route handlers
app.use('/api/deals', dealsRoutes);
app.use('/api/underwriting', underwritingRoutes);
app.use('/api/term-sheets', termSheetsRoutes);
app.use('/api/orgs', orgsRoutes);

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
