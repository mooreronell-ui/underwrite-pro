-- Migration: 003_rbac_system.sql
-- Purpose: Implement Role-Based Access Control (RBAC) for enterprise governance
-- Date: 2025-11-13
-- Required for: F500 institutional clients

-- ============================================================
-- 1. ROLES TABLE
-- ============================================================
-- Define available roles in the system

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL, -- Hierarchy level (higher = more permissions)
  is_system_role BOOLEAN DEFAULT true, -- Cannot be deleted if true
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system roles
INSERT INTO roles (name, display_name, description, level, is_system_role) VALUES
  ('owner', 'Owner', 'Full access to all features and settings. Can manage billing and delete organization.', 100, true),
  ('admin', 'Administrator', 'Full access to all features except billing and organization deletion.', 90, true),
  ('underwriter', 'Underwriter', 'Can create, edit, and approve deals. Can run underwriting analysis.', 70, true),
  ('analyst', 'Financial Analyst', 'Can view and edit deal financials. Can run analysis but cannot approve.', 50, true),
  ('broker', 'Broker', 'Can create and edit own deals. View-only access to other deals.', 40, true),
  ('viewer', 'View-Only', 'Read-only access to deals and reports. Cannot make changes.', 10, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. PERMISSIONS TABLE
-- ============================================================
-- Define granular permissions for resources and actions

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'deals:create', 'underwriting:approve'
  resource TEXT NOT NULL, -- e.g., 'deals', 'underwriting', 'term_sheets'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'approve'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  -- Deal permissions
  ('deals:create', 'deals', 'create', 'Create new deals'),
  ('deals:read', 'deals', 'read', 'View deals'),
  ('deals:update', 'deals', 'update', 'Edit deal information'),
  ('deals:delete', 'deals', 'delete', 'Delete deals'),
  ('deals:approve', 'deals', 'approve', 'Approve or reject deals'),
  
  -- Underwriting permissions
  ('underwriting:create', 'underwriting', 'create', 'Create underwriting analysis'),
  ('underwriting:read', 'underwriting', 'read', 'View underwriting analysis'),
  ('underwriting:update', 'underwriting', 'update', 'Edit underwriting analysis'),
  ('underwriting:approve', 'underwriting', 'approve', 'Approve underwriting recommendations'),
  
  -- Term sheet permissions
  ('term_sheets:create', 'term_sheets', 'create', 'Generate term sheets'),
  ('term_sheets:read', 'term_sheets', 'read', 'View term sheets'),
  ('term_sheets:update', 'term_sheets', 'update', 'Edit term sheets'),
  ('term_sheets:send', 'term_sheets', 'send', 'Send term sheets to clients'),
  
  -- Organization permissions
  ('org:manage_users', 'organization', 'manage_users', 'Invite and remove users'),
  ('org:manage_roles', 'organization', 'manage_roles', 'Assign roles to users'),
  ('org:manage_settings', 'organization', 'manage_settings', 'Change organization settings'),
  ('org:manage_billing', 'organization', 'manage_billing', 'Manage billing and subscriptions'),
  ('org:delete', 'organization', 'delete', 'Delete organization'),
  
  -- AI/Analytics permissions
  ('ai:risk_assessment', 'ai', 'risk_assessment', 'Run AI risk assessment'),
  ('ai:stress_test', 'ai', 'stress_test', 'Run stress testing simulations'),
  ('ai:summarization', 'ai', 'summarization', 'Generate AI summaries'),
  
  -- Compliance permissions
  ('compliance:read', 'compliance', 'read', 'View compliance reports'),
  ('compliance:manage', 'compliance', 'manage', 'Manage compliance settings')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. ROLE_PERMISSIONS TABLE (Many-to-Many)
-- ============================================================
-- Maps which permissions each role has

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- Assign permissions to roles
-- Owner: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner'
ON CONFLICT DO NOTHING;

-- Admin: All except org:delete and org:manage_billing
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.name NOT IN ('org:delete', 'org:manage_billing')
ON CONFLICT DO NOTHING;

-- Underwriter: Deal and underwriting management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'underwriter'
  AND p.name IN (
    'deals:create', 'deals:read', 'deals:update', 'deals:approve',
    'underwriting:create', 'underwriting:read', 'underwriting:update', 'underwriting:approve',
    'term_sheets:create', 'term_sheets:read', 'term_sheets:update', 'term_sheets:send',
    'ai:risk_assessment', 'ai:stress_test', 'ai:summarization',
    'compliance:read'
  )
ON CONFLICT DO NOTHING;

-- Analyst: View and edit, no approval
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'analyst'
  AND p.name IN (
    'deals:read', 'deals:update',
    'underwriting:create', 'underwriting:read', 'underwriting:update',
    'term_sheets:read',
    'ai:risk_assessment', 'ai:stress_test', 'ai:summarization',
    'compliance:read'
  )
ON CONFLICT DO NOTHING;

-- Broker: Own deals only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'broker'
  AND p.name IN (
    'deals:create', 'deals:read', 'deals:update',
    'underwriting:read',
    'term_sheets:read',
    'ai:risk_assessment'
  )
ON CONFLICT DO NOTHING;

-- Viewer: Read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND p.name IN (
    'deals:read',
    'underwriting:read',
    'term_sheets:read'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. UPDATE USER_ORG_MEMBERSHIPS TABLE
-- ============================================================
-- Add role_id foreign key to existing memberships table

ALTER TABLE user_org_memberships
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_org_memberships_role_id 
  ON user_org_memberships(role_id);

-- Migrate existing roles to new system
-- Map old 'owner' role to new owner role
UPDATE user_org_memberships m
SET role_id = (SELECT id FROM roles WHERE name = 'owner')
WHERE m.role = 'owner' AND m.role_id IS NULL;

-- Map old 'admin' role to new admin role
UPDATE user_org_memberships m
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE m.role = 'admin' AND m.role_id IS NULL;

-- Map old 'member' role to analyst role (default)
UPDATE user_org_memberships m
SET role_id = (SELECT id FROM roles WHERE name = 'analyst')
WHERE m.role = 'member' AND m.role_id IS NULL;

-- ============================================================
-- 5. AUDIT LOG FOR ROLE CHANGES
-- ============================================================

CREATE TABLE IF NOT EXISTS role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- User whose role was changed
  changed_by UUID NOT NULL, -- User who made the change
  old_role_id UUID REFERENCES roles(id),
  new_role_id UUID REFERENCES roles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_change_audit_org_id 
  ON role_change_audit(org_id);
CREATE INDEX IF NOT EXISTS idx_role_change_audit_user_id 
  ON role_change_audit(user_id);

-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_org_id UUID,
  p_permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_org_memberships m
    JOIN role_permissions rp ON rp.role_id = m.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE m.auth_user_id = p_user_id
      AND m.org_id = p_org_id
      AND p.name = p_permission_name
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user in an org
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_org_id UUID
) RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name, p.resource, p.action
  FROM user_org_memberships m
  JOIN role_permissions rp ON rp.role_id = m.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE m.auth_user_id = p_user_id
    AND m.org_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_audit ENABLE ROW LEVEL SECURITY;

-- Roles: Everyone can read system roles
CREATE POLICY "Anyone can read roles"
  ON roles FOR SELECT
  USING (true);

-- Permissions: Everyone can read permissions
CREATE POLICY "Anyone can read permissions"
  ON permissions FOR SELECT
  USING (true);

-- Role Permissions: Everyone can read role-permission mappings
CREATE POLICY "Anyone can read role permissions"
  ON role_permissions FOR SELECT
  USING (true);

-- Audit Log: Users can only see audit logs for their org
CREATE POLICY "Users can view org audit logs"
  ON role_change_audit FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_org_memberships
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. COMMENTS
-- ============================================================

COMMENT ON TABLE roles IS 'System and custom roles for RBAC';
COMMENT ON TABLE permissions IS 'Granular permissions for resources and actions';
COMMENT ON TABLE role_permissions IS 'Maps permissions to roles (many-to-many)';
COMMENT ON TABLE role_change_audit IS 'Audit trail for role changes';
COMMENT ON FUNCTION user_has_permission IS 'Check if user has specific permission in org';
COMMENT ON FUNCTION get_user_permissions IS 'Get all permissions for user in org';
