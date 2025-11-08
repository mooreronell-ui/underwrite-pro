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
  // Add timeout to prevent hanging
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    console.error('[AUTH] Request timeout after 5 seconds');
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication timeout',
        code: 'AUTH_TIMEOUT'
      });
    }
  }, 5000);

  try {
    if (timedOut) return;
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
    if (timedOut) return;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
        code: 'AUTH_MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token with Supabase
    console.log('[AUTH] Verifying token for user...');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      console.error('[AUTH] Token verification failed:', authError?.message || 'No user found');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        code: 'AUTH_INVALID_TOKEN'
      });
    }

    const userId = authUser.id;
    console.log('[AUTH] Token verified for user:', userId);

    // Fetch user's active organization and role
    const { data: activeOrg, error: activeOrgError } = await supabase
      .from('user_active_org')
      .select('org_id')
      .eq('auth_user_id', userId)
      .single();

    if (activeOrgError || !activeOrg) {
      // User has no active organization - allow but with null org_id
      console.warn(`[AUTH] User ${userId} has no active organization`, activeOrgError?.message);
      req.user = {
        id: userId,
        org_id: null,
        email: authUser.email,
        first_name: authUser.user_metadata?.first_name || '',
        last_name: authUser.user_metadata?.last_name || '',
        role: 'member'
      };
      req.jwtClaims = {
        sub: userId,
        org_id: null,
        role: 'member'
      };
      return next();
    }

    // Fetch user's role in the active organization
    const { data: membership, error: membershipError } = await supabase
      .from('user_org_memberships')
      .select('role')
      .eq('auth_user_id', userId)
      .eq('org_id', activeOrg.org_id)
      .single();

    if (membershipError || !membership) {
      console.error('[AUTH] Membership query failed:', membershipError?.message || 'No membership found', { userId, orgId: activeOrg.org_id });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User membership not found',
        code: 'AUTH_USER_NOT_FOUND'
      });
    }

    // Attach user context to request object
    console.log('[AUTH] Authentication successful:', { userId, orgId: activeOrg.org_id, role: membership.role });
    req.user = {
      id: userId,
      org_id: activeOrg.org_id,
      email: authUser.email,
      first_name: authUser.user_metadata?.first_name || '',
      last_name: authUser.user_metadata?.last_name || '',
      role: membership.role
    };

    // Set JWT claims for RLS (used by database policies)
    req.jwtClaims = {
      sub: userId,
      org_id: activeOrg.org_id,
      role: membership.role
    };

    clearTimeout(timeoutId);
    next();
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[AUTH] Authentication error:', error);
    if (res.headersSent) return;
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
