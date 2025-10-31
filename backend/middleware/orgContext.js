// ============================================================
// ORGANIZATION CONTEXT MIDDLEWARE
// Sets PostgreSQL session variables for RLS enforcement
// ============================================================

const { pool } = require('../config/database');

/**
 * Middleware to set org_id and role in PostgreSQL session
 * This enables Row-Level Security (RLS) policies to work correctly
 */
const orgContextMiddleware = async (req, res, next) => {
  try {
    // Ensure user context exists (set by authMiddleware)
    if (!req.user || !req.user.org_id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User context missing',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Get a client from the pool
    const client = await pool.connect();

    try {
      // Set session variables for RLS
      // These are used by auth.user_org_id() and auth.user_role() functions in RLS policies
      await client.query(`
        SET LOCAL request.jwt.claims = '${JSON.stringify({
          org_id: req.user.org_id,
          role: req.user.role,
          user_id: req.user.id
        })}';
      `);

      // Attach the client to the request for use in route handlers
      req.dbClient = client;

      // Override res.send to ensure client is released after response
      const originalSend = res.send;
      res.send = function (data) {
        client.release();
        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('[ORG_CONTEXT] Error setting org context:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to set organization context',
      code: 'ORG_CONTEXT_ERROR'
    });
  }
};

module.exports = {
  orgContextMiddleware
};
