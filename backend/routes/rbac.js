// /backend/routes/rbac.js
// ============================================================
// RBAC MANAGEMENT API ROUTES
// ============================================================
// Endpoints for managing roles, permissions, and user assignments
// ============================================================

const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseClient');
const supabaseAuth = require('../middleware/supabaseAuth');
const orgContext = require('../middleware/orgContext');
const { requirePermission, requireRole } = require('../middleware/rbac');

// Apply authentication and org context to all routes
router.use(supabaseAuth);
router.use(orgContext);

// ============================================================
// ROLE MANAGEMENT
// ============================================================

/**
 * GET /api/rbac/roles
 * Get all available roles
 */
router.get('/roles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('level', { ascending: false });

    if (error) throw error;

    res.json({ ok: true, roles: data });
  } catch (error) {
    console.error('[RBAC] Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * GET /api/rbac/roles/:roleId/permissions
 * Get all permissions for a specific role
 */
router.get('/roles/:roleId/permissions', async (req, res) => {
  try {
    const { roleId } = req.params;

    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        permissions:permission_id (
          id,
          name,
          resource,
          action,
          description
        )
      `)
      .eq('role_id', roleId);

    if (error) throw error;

    const permissions = data.map(rp => rp.permissions);
    res.json({ ok: true, permissions });
  } catch (error) {
    console.error('[RBAC] Get role permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// ============================================================
// USER ROLE MANAGEMENT
// ============================================================

/**
 * GET /api/rbac/users
 * Get all users in current organization with their roles
 */
router.get('/users', requirePermission('org:manage_users'), async (req, res) => {
  try {
    const orgId = req.orgId;

    const { data, error } = await supabase
      .from('user_org_memberships')
      .select(`
        auth_user_id,
        role_id,
        created_at,
        roles:role_id (
          id,
          name,
          display_name,
          level
        )
      `)
      .eq('org_id', orgId);

    if (error) throw error;

    // Fetch user details from auth.users (requires service role)
    // For now, return membership data
    res.json({ ok: true, users: data });
  } catch (error) {
    console.error('[RBAC] Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/rbac/users/:userId
 * Get specific user's role and permissions in current org
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orgId = req.orgId;
    const requestingUserId = req.userId;

    // Users can view their own info, or need org:manage_users permission
    if (userId !== requestingUserId) {
      const { data: hasPermission } = await supabase
        .rpc('user_has_permission', {
          p_user_id: requestingUserId,
          p_org_id: orgId,
          p_permission_name: 'org:manage_users'
        });

      if (!hasPermission) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Permission denied'
        });
      }
    }

    // Get user's role
    const { data: membership, error: memError } = await supabase
      .from('user_org_memberships')
      .select(`
        role_id,
        created_at,
        roles:role_id (
          id,
          name,
          display_name,
          description,
          level
        )
      `)
      .eq('auth_user_id', userId)
      .eq('org_id', orgId)
      .single();

    if (memError) throw memError;

    // Get user's permissions
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_permissions', {
        p_user_id: userId,
        p_org_id: orgId
      });

    if (permError) throw permError;

    res.json({
      ok: true,
      user: {
        id: userId,
        role: membership.roles,
        permissions: permissions || [],
        joined_at: membership.created_at
      }
    });
  } catch (error) {
    console.error('[RBAC] Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

/**
 * PUT /api/rbac/users/:userId/role
 * Assign role to user in current organization
 */
router.put('/users/:userId/role', requirePermission('org:manage_roles'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId, reason } = req.body;
    const orgId = req.orgId;
    const changedBy = req.userId;

    if (!roleId) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Role ID is required'
      });
    }

    // Get current role for audit
    const { data: currentMembership } = await supabase
      .from('user_org_memberships')
      .select('role_id')
      .eq('auth_user_id', userId)
      .eq('org_id', orgId)
      .single();

    // Update role
    const { error: updateError } = await supabase
      .from('user_org_memberships')
      .update({ role_id: roleId })
      .eq('auth_user_id', userId)
      .eq('org_id', orgId);

    if (updateError) throw updateError;

    // Create audit log
    await supabase
      .from('role_change_audit')
      .insert({
        org_id: orgId,
        user_id: userId,
        changed_by: changedBy,
        old_role_id: currentMembership?.role_id,
        new_role_id: roleId,
        reason: reason || 'Role assignment'
      });

    res.json({
      ok: true,
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('[RBAC] Update role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * DELETE /api/rbac/users/:userId
 * Remove user from organization
 */
router.delete('/users/:userId', requirePermission('org:manage_users'), async (req, res) => {
  try {
    const { userId } = req.params;
    const orgId = req.orgId;
    const requestingUserId = req.userId;

    // Cannot remove yourself
    if (userId === requestingUserId) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Cannot remove yourself from organization'
      });
    }

    // Check if user is the last owner
    const { data: owners } = await supabase
      .from('user_org_memberships')
      .select('auth_user_id, roles:role_id(name)')
      .eq('org_id', orgId);

    const ownerCount = owners?.filter(m => m.roles?.name === 'owner').length || 0;
    const isTargetOwner = owners?.find(m => 
      m.auth_user_id === userId && m.roles?.name === 'owner'
    );

    if (isTargetOwner && ownerCount <= 1) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Cannot remove the last owner from organization'
      });
    }

    // Remove user
    const { error } = await supabase
      .from('user_org_memberships')
      .delete()
      .eq('auth_user_id', userId)
      .eq('org_id', orgId);

    if (error) throw error;

    res.json({
      ok: true,
      message: 'User removed from organization'
    });
  } catch (error) {
    console.error('[RBAC] Remove user error:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

// ============================================================
// PERMISSION QUERIES
// ============================================================

/**
 * GET /api/rbac/permissions
 * Get all available permissions
 */
router.get('/permissions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true });

    if (error) throw error;

    // Group by resource
    const grouped = data.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {});

    res.json({
      ok: true,
      permissions: data,
      grouped
    });
  } catch (error) {
    console.error('[RBAC] Get permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * GET /api/rbac/my-permissions
 * Get current user's permissions in current org
 */
router.get('/my-permissions', async (req, res) => {
  try {
    const userId = req.userId;
    const orgId = req.orgId;

    const { data, error } = await supabase
      .rpc('get_user_permissions', {
        p_user_id: userId,
        p_org_id: orgId
      });

    if (error) throw error;

    res.json({
      ok: true,
      permissions: data || []
    });
  } catch (error) {
    console.error('[RBAC] Get my permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * POST /api/rbac/check-permission
 * Check if current user has specific permission
 */
router.post('/check-permission', async (req, res) => {
  try {
    const { permission } = req.body;
    const userId = req.userId;
    const orgId = req.orgId;

    if (!permission) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Permission name is required'
      });
    }

    const { data, error } = await supabase
      .rpc('user_has_permission', {
        p_user_id: userId,
        p_org_id: orgId,
        p_permission_name: permission
      });

    if (error) throw error;

    res.json({
      ok: true,
      has_permission: data || false
    });
  } catch (error) {
    console.error('[RBAC] Check permission error:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

// ============================================================
// AUDIT LOG
// ============================================================

/**
 * GET /api/rbac/audit
 * Get role change audit log for current organization
 */
router.get('/audit', requirePermission('org:manage_roles'), async (req, res) => {
  try {
    const orgId = req.orgId;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('role_change_audit')
      .select(`
        *,
        old_role:old_role_id(name, display_name),
        new_role:new_role_id(name, display_name)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      ok: true,
      audit_log: data,
      limit,
      offset
    });
  } catch (error) {
    console.error('[RBAC] Get audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

module.exports = router;
