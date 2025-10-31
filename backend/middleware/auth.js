// ============================================================
// AUTHENTICATION MIDDLEWARE
// JWT token validation with Supabase (optional)
// ============================================================

const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

/**
 * Lazy-load Supabase client
 * Returns null if Supabase is not configured
 */
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    // Supabase not configured - return null
    console.warn('[AUTH] Supabase not configured. Auth middleware will allow all requests.');
    return null;
  }
  
  return createClient(url, key);
}

/**
 * Middleware to validate JWT token and extract user context
 * Expects Authorization header: Bearer <token>
 */
const authMiddleware = async (req, res, next) => {
  try {
    const supabase = getSupabase();
    
    // If Supabase is not configured, allow request through
    if (!supabase) {
      // Set a default user context for development/testing
      req.user = {
        id: 'dev-user',
        org_id: 'dev-org',
        email: 'dev@example.com',
        first_name: 'Dev',
        last_name: 'User',
        role: 'admin'
      };
      req.jwtClaims = {
        sub: 'dev-user',
        org_id: 'dev-org',
        role: 'admin'
      };
      return next();
    }
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
        code: 'AUTH_MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded;
    try {
      // Use Supabase JWT secret or fallback to custom JWT_SECRET
      const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        code: 'AUTH_INVALID_TOKEN'
      });
    }

    // Extract user information from token
    const userId = decoded.sub || decoded.user_id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token missing user identifier',
        code: 'AUTH_INVALID_TOKEN_PAYLOAD'
      });
    }

    // Fetch user details from database (including org_id and role)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, org_id, email, first_name, last_name, role, status')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found or inactive',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account is not active',
        code: 'AUTH_USER_INACTIVE'
      });
    }

    // Attach user context to request object
    req.user = {
      id: user.id,
      org_id: user.org_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    };

    // Set JWT claims for RLS (used by database policies)
    req.jwtClaims = {
      sub: user.id,
      org_id: user.org_id,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to check if user has required role
 * Usage: requireRole(['admin', 'underwriter'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        code: 'AUTH_INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole
};
