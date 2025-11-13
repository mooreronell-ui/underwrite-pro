// /backend/middleware/rbac.js
// ============================================================
// RBAC (Role-Based Access Control) Middleware
// ============================================================
// Provides authorization checks for protected routes
// Requires: supabaseAuth and orgContext middleware to run first
// ============================================================

const { supabase } = require('../lib/supabaseClient');

/**
 * Check if user has specific permission in current org
 * Usage: app.get('/api/deals', requirePermission('deals:read'), ...)
 */
function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const orgId = req.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication and organization context required'
        });
      }

      // Check permission using database function
      const { data, error } = await supabase
        .rpc('user_has_permission', {
          p_user_id: userId,
          p_org_id: orgId,
          p_permission_name: permissionName
        });

      if (error) {
        console.error('[RBAC] Permission check error:', error);
        return res.status(500).json({
          error: 'PERMISSION_CHECK_FAILED',
          message: 'Failed to verify permissions'
        });
      }

      if (!data) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `Permission denied: ${permissionName}`,
          required_permission: permissionName
        });
      }

      // Permission granted, continue
      next();
    } catch (error) {
      console.error('[RBAC] Middleware error:', error);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Authorization check failed'
      });
    }
  };
}

/**
 * Check if user has ANY of the specified permissions
 * Usage: app.get('/api/deals', requireAnyPermission(['deals:read', 'deals:update']), ...)
 */
function requireAnyPermission(permissionNames) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const orgId = req.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication and organization context required'
        });
      }

      // Check each permission
      for (const permissionName of permissionNames) {
        const { data, error } = await supabase
          .rpc('user_has_permission', {
            p_user_id: userId,
            p_org_id: orgId,
            p_permission_name: permissionName
          });

        if (!error && data) {
          // User has at least one permission, allow access
          req.grantedPermission = permissionName;
          return next();
        }
      }

      // No permissions matched
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Permission denied',
        required_permissions: permissionNames
      });
    } catch (error) {
      console.error('[RBAC] Middleware error:', error);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Authorization check failed'
      });
    }
  };
}

/**
 * Check if user has ALL of the specified permissions
 * Usage: app.post('/api/deals', requireAllPermissions(['deals:create', 'underwriting:create']), ...)
 */
function requireAllPermissions(permissionNames) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const orgId = req.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication and organization context required'
        });
      }

      // Check all permissions
      const missingPermissions = [];
      
      for (const permissionName of permissionNames) {
        const { data, error } = await supabase
          .rpc('user_has_permission', {
            p_user_id: userId,
            p_org_id: orgId,
            p_permission_name: permissionName
          });

        if (error || !data) {
          missingPermissions.push(permissionName);
        }
      }

      if (missingPermissions.length > 0) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          missing_permissions: missingPermissions
        });
      }

      // All permissions granted
      next();
    } catch (error) {
      console.error('[RBAC] Middleware error:', error);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Authorization check failed'
      });
    }
  };
}

/**
 * Check if user has minimum role level
 * Usage: app.delete('/api/org', requireRole('owner'), ...)
 */
function requireRole(roleName) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const orgId = req.orgId;

      if (!userId || !orgId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication and organization context required'
        });
      }

      // Get user's role in this org
      const { data: membership, error: memError } = await supabase
        .from('user_org_memberships')
        .select(`
          role_id,
          roles:role_id (
            name,
            level
          )
        `)
        .eq('auth_user_id', userId)
        .eq('org_id', orgId)
        .single();

      if (memError || !membership) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'User not found in organization'
        });
      }

      // Get required role level
      const { data: requiredRole, error: roleError } = await supabase
        .from('roles')
        .select('level')
        .eq('name', roleName)
        .single();

      if (roleError || !requiredRole) {
        return res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: 'Invalid role specified'
        });
      }

      // Check if user's role level meets requirement
      const userLevel = membership.roles?.level || 0;
      const requiredLevel = requiredRole.level;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `Role '${roleName}' or higher required`,
          user_role: membership.roles?.name,
          required_role: roleName
        });
      }

      // Role requirement met
      req.userRole = membership.roles?.name;
      req.userRoleLevel = userLevel;
      next();
    } catch (error) {
      console.error('[RBAC] Role check error:', error);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Role verification failed'
      });
    }
  };
}

/**
 * Get user's permissions (attach to request object)
 * Usage: app.use(attachPermissions); then access via req.permissions
 */
async function attachPermissions(req, res, next) {
  try {
    const userId = req.userId;
    const orgId = req.orgId;

    if (!userId || !orgId) {
      req.permissions = [];
      return next();
    }

    // Get all user permissions
    const { data, error } = await supabase
      .rpc('get_user_permissions', {
        p_user_id: userId,
        p_org_id: orgId
      });

    if (error) {
      console.error('[RBAC] Failed to fetch permissions:', error);
      req.permissions = [];
    } else {
      req.permissions = data || [];
    }

    next();
  } catch (error) {
    console.error('[RBAC] Attach permissions error:', error);
    req.permissions = [];
    next();
  }
}

/**
 * Check if user owns the resource (e.g., created the deal)
 * Usage: app.put('/api/deals/:id', requireOwnership('deals'), ...)
 */
function requireOwnership(resourceType) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const resourceId = req.params.id || req.params.dealId;

      if (!userId || !resourceId) {
        return res.status(400).json({
          error: 'BAD_REQUEST',
          message: 'User ID and resource ID required'
        });
      }

      // Check ownership based on resource type
      let tableName;
      let ownerColumn;

      switch (resourceType) {
        case 'deals':
          tableName = 'deals';
          ownerColumn = 'created_by';
          break;
        case 'underwriting':
          tableName = 'underwriting_analyses';
          ownerColumn = 'created_by';
          break;
        case 'term_sheets':
          tableName = 'term_sheets';
          ownerColumn = 'created_by';
          break;
        default:
          return res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Invalid resource type'
          });
      }

      // Check if user owns the resource
      const { data, error } = await supabase
        .from(tableName)
        .select(ownerColumn)
        .eq('id', resourceId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Resource not found'
        });
      }

      if (data[ownerColumn] !== userId) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You do not own this resource'
        });
      }

      // User owns the resource
      next();
    } catch (error) {
      console.error('[RBAC] Ownership check error:', error);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Ownership verification failed'
      });
    }
  };
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  attachPermissions,
  requireOwnership
};
