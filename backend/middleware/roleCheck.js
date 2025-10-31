// ============================================================
// ROLE-BASED AUTHORIZATION MIDDLEWARE - LAYER 6
// Enforces role-based access control (RBAC)
// ============================================================

/**
 * Middleware to check if user has required role(s)
 * @param {Array<string>} allowedRoles - Array of allowed roles
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
}

/**
 * Middleware to check if user is admin
 */
function requireAdmin(req, res, next) {
  return requireRole(['admin'])(req, res, next);
}

/**
 * Middleware to check if user is admin or underwriter
 */
function requireUnderwriter(req, res, next) {
  return requireRole(['admin', 'underwriter'])(req, res, next);
}

/**
 * Middleware to check if user is admin or auditor
 */
function requireAuditor(req, res, next) {
  return requireRole(['admin', 'auditor'])(req, res, next);
}

module.exports = {
  requireRole,
  requireAdmin,
  requireUnderwriter,
  requireAuditor
};
