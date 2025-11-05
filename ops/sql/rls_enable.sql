-- ============================================================
-- UNDERWRITE PRO — ROW LEVEL SECURITY (RLS) ENABLEMENT
-- Version: v1.0.0-prod-lock
-- Date: November 5, 2025
-- ============================================================
--
-- PURPOSE:
-- Enable Row Level Security on all tables to ensure users can only
-- access data within their organization(s).
--
-- IMPORTANT:
-- - This script will ENABLE RLS on all tables
-- - Service role connections will BYPASS RLS automatically
-- - Regular user connections will be restricted by policies
-- - Run this in Supabase SQL Editor with service role
--
-- ROLLBACK:
-- If you get locked out, run:
--   ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- for each table, or use the service role key to bypass RLS.
--
-- ============================================================

-- ============================================================
-- 1. ORGANIZATIONS TABLE
-- ============================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS organizations_select_member ON organizations;
DROP POLICY IF EXISTS organizations_insert_creator ON organizations;
DROP POLICY IF EXISTS organizations_update_member ON organizations;
DROP POLICY IF EXISTS organizations_delete_owner ON organizations;

-- SELECT: Users can see orgs they're members of
CREATE POLICY organizations_select_member ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = organizations.id
    )
  );

-- INSERT: Any authenticated user can create an org
-- (They'll be added as owner via trigger or application logic)
CREATE POLICY organizations_insert_creator ON organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only members can update their org
CREATE POLICY organizations_update_member ON organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = organizations.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = organizations.id
    )
  );

-- DELETE: Only org owners can delete
-- (Assuming role='owner' in user_org_memberships)
CREATE POLICY organizations_delete_owner ON organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = organizations.id
        AND m.role = 'owner'
    )
  );

-- ============================================================
-- 2. USER_ORG_MEMBERSHIPS TABLE
-- ============================================================

-- Enable RLS
ALTER TABLE user_org_memberships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS memberships_select_member ON user_org_memberships;
DROP POLICY IF EXISTS memberships_insert_owner ON user_org_memberships;
DROP POLICY IF EXISTS memberships_update_owner ON user_org_memberships;
DROP POLICY IF EXISTS memberships_delete_owner ON user_org_memberships;

-- SELECT: Users can see memberships in their orgs
CREATE POLICY memberships_select_member ON user_org_memberships
  FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = user_org_memberships.org_id
    )
  );

-- INSERT: Only org owners can add members
CREATE POLICY memberships_insert_owner ON user_org_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = user_org_memberships.org_id
        AND m.role = 'owner'
    )
  );

-- UPDATE: Only org owners can update memberships
CREATE POLICY memberships_update_owner ON user_org_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = user_org_memberships.org_id
        AND m.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = user_org_memberships.org_id
        AND m.role = 'owner'
    )
  );

-- DELETE: Only org owners can remove members
CREATE POLICY memberships_delete_owner ON user_org_memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = user_org_memberships.org_id
        AND m.role = 'owner'
    )
  );

-- ============================================================
-- 3. USER_ACTIVE_ORG TABLE
-- ============================================================

-- Enable RLS
ALTER TABLE user_active_org ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS active_org_select_own ON user_active_org;
DROP POLICY IF EXISTS active_org_insert_own ON user_active_org;
DROP POLICY IF EXISTS active_org_update_own ON user_active_org;
DROP POLICY IF EXISTS active_org_delete_own ON user_active_org;

-- SELECT: Users can only see their own active org
CREATE POLICY active_org_select_own ON user_active_org
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- INSERT: Users can only set their own active org
CREATE POLICY active_org_insert_own ON user_active_org
  FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- UPDATE: Users can only update their own active org
CREATE POLICY active_org_update_own ON user_active_org
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- DELETE: Users can only delete their own active org
CREATE POLICY active_org_delete_own ON user_active_org
  FOR DELETE
  USING (auth_user_id = auth.uid());

-- ============================================================
-- 4. DEALS TABLE
-- ============================================================

-- Enable RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS deals_select_member ON deals;
DROP POLICY IF EXISTS deals_insert_member ON deals;
DROP POLICY IF EXISTS deals_update_member ON deals;
DROP POLICY IF EXISTS deals_delete_member ON deals;

-- SELECT: Users can see deals in their org
CREATE POLICY deals_select_member ON deals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = deals.org_id
    )
  );

-- INSERT: Users can create deals in their org
CREATE POLICY deals_insert_member ON deals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = deals.org_id
    )
  );

-- UPDATE: Users can update deals in their org
CREATE POLICY deals_update_member ON deals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = deals.org_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = deals.org_id
    )
  );

-- DELETE: Users can delete deals in their org
CREATE POLICY deals_delete_member ON deals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = deals.org_id
    )
  );

-- ============================================================
-- 5. PROPERTY_FINANCIALS TABLE
-- ============================================================

-- Enable RLS
ALTER TABLE property_financials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS financials_select_member ON property_financials;
DROP POLICY IF EXISTS financials_insert_member ON property_financials;
DROP POLICY IF EXISTS financials_update_member ON property_financials;
DROP POLICY IF EXISTS financials_delete_member ON property_financials;

-- SELECT: Users can see financials for deals in their org
CREATE POLICY financials_select_member ON property_financials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      INNER JOIN user_org_memberships m ON m.org_id = d.org_id
      WHERE d.id = property_financials.deal_id
        AND m.auth_user_id = auth.uid()
    )
  );

-- INSERT: Users can create financials for deals in their org
CREATE POLICY financials_insert_member ON property_financials
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals d
      INNER JOIN user_org_memberships m ON m.org_id = d.org_id
      WHERE d.id = property_financials.deal_id
        AND m.auth_user_id = auth.uid()
    )
  );

-- UPDATE: Users can update financials for deals in their org
CREATE POLICY financials_update_member ON property_financials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      INNER JOIN user_org_memberships m ON m.org_id = d.org_id
      WHERE d.id = property_financials.deal_id
        AND m.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals d
      INNER JOIN user_org_memberships m ON m.org_id = d.org_id
      WHERE d.id = property_financials.deal_id
        AND m.auth_user_id = auth.uid()
    )
  );

-- DELETE: Users can delete financials for deals in their org
CREATE POLICY financials_delete_member ON property_financials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM deals d
      INNER JOIN user_org_memberships m ON m.org_id = d.org_id
      WHERE d.id = property_financials.deal_id
        AND m.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. AUDIT_LOGS TABLE
-- ============================================================

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS audit_select_member ON audit_logs;
DROP POLICY IF EXISTS audit_insert_service ON audit_logs;

-- SELECT: Users can see audit logs for their org
CREATE POLICY audit_select_member ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_org_memberships m
      WHERE m.auth_user_id = auth.uid()
        AND m.org_id = audit_logs.org_id
    )
  );

-- INSERT: Only service role can insert audit logs
-- (Regular users should not be able to create audit logs directly)
-- This policy effectively blocks user inserts, only service role bypasses
CREATE POLICY audit_insert_service ON audit_logs
  FOR INSERT
  WITH CHECK (false);

-- NOTE: Service role will bypass this policy and can insert normally

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these queries to verify RLS is enabled:

-- Check RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations',
    'user_org_memberships',
    'user_active_org',
    'deals',
    'property_financials',
    'audit_logs'
  )
ORDER BY tablename;

-- Check policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================

-- If you need to disable RLS (e.g., locked out):
--
-- ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_org_memberships DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_active_org DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE property_financials DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
--
-- To drop all policies:
--
-- DROP POLICY IF EXISTS organizations_select_member ON organizations;
-- DROP POLICY IF EXISTS organizations_insert_creator ON organizations;
-- DROP POLICY IF EXISTS organizations_update_member ON organizations;
-- DROP POLICY IF EXISTS organizations_delete_owner ON organizations;
-- ... (repeat for all policies)

-- ============================================================
-- NOTES
-- ============================================================

-- 1. Service role connections bypass RLS automatically
--    - Backend using SUPABASE_SERVICE_ROLE_KEY will work normally
--    - No changes needed to backend code
--
-- 2. User connections (anon key) will be restricted
--    - Frontend using NEXT_PUBLIC_SUPABASE_ANON_KEY will be restricted
--    - Users can only see data in their org(s)
--
-- 3. Testing RLS
--    - Use Supabase SQL Editor with "Run as user" feature
--    - Or create test users and verify they can't see other orgs' data
--
-- 4. Performance
--    - RLS policies use indexes on org_id and auth_user_id
--    - Ensure these columns are indexed for performance
--
-- 5. Debugging
--    - If queries return no data, check user_org_memberships
--    - Verify auth.uid() returns the correct user ID
--    - Check that org_id matches between tables

-- ============================================================
-- END OF SCRIPT
-- ============================================================
