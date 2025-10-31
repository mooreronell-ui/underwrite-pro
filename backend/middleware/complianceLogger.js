// ============================================================
// COMPLIANCE LOGGER MIDDLEWARE - LAYER 6
// Logs all API requests for compliance and audit purposes
// ============================================================

const { query } = require('../config/database');

/**
 * Middleware to log all API requests to audit_logs table
 * Captures: user_id, org_id, route, method, ip_address
 */
async function logRequest(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const orgId = req.orgId || req.user?.org_id || null;
    const route = req.path;
    const method = req.method;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Only log API routes (skip health checks, static files, etc.)
    if (route.startsWith('/api/')) {
      await query(`
        INSERT INTO audit_logs (user_id, org_id, action, resource_type, resource_id, metadata, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        orgId,
        'api_request',
        'http',
        null,
        JSON.stringify({
          method,
          route,
          query: req.query,
          user_agent: req.headers['user-agent']
        }),
        ipAddress
      ]);
    }

    next();
  } catch (error) {
    console.error('[COMPLIANCE] Error logging request:', error);
    // Don't fail the request if logging fails
    next();
  }
}

module.exports = { logRequest };
