-- ============================================================
-- UNDERWRITE PRO — ORGANIZATION MANAGEMENT TABLES
-- Version: v1.0.0
-- Date: November 5, 2025
-- ============================================================
--
-- PURPOSE:
-- Create the core tables for multi-tenant organization management:
-- - organizations: Store organization/company data
-- - user_org_memberships: Link users to organizations with roles
-- - user_active_org: Track each user's currently active organization
--
-- IMPORTANT:
-- - Run this script BEFORE enabling RLS (rls_enable.sql)
-- - This creates tables WITHOUT RLS enabled initially
-- - Use service role key when running this script
-- - After creating tables, run rls_enable.sql to secure them
--
-- ============================================================

-- ============================================================
-- 1. ORGANIZATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by slug
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. USER_ORG_MEMBERSHIPS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auth_user_id, org_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user ON user_org_memberships(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON user_org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON user_org_memberships(role);

-- Trigger to update updated_at timestamp
CREATE TRIGGER memberships_updated_at
  BEFORE UPDATE ON user_org_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. USER_ACTIVE_ORG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_active_org (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_active_org_org ON user_active_org(org_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER active_org_updated_at
  BEFORE UPDATE ON user_active_org
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. ADD ORG_ID TO DEALS TABLE (if not exists)
-- ============================================================

-- Check if org_id column exists in deals table, add if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE deals ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX idx_deals_org ON deals(org_id);
  END IF;
END $$;

-- ============================================================
-- 5. CREATE DEMO ORGANIZATION
-- ============================================================

-- Insert Demo Org if it doesn't exist
INSERT INTO organizations (id, name, slug, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Organization',
  'demo-org',
  'Default organization for new users'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 6. CREATE FUNCTION TO AUTO-ADD NEW USERS TO DEMO ORG
-- ============================================================

CREATE OR REPLACE FUNCTION auto_add_user_to_demo_org()
RETURNS TRIGGER AS $$
BEGIN
  -- Add new user to Demo Org as a member
  INSERT INTO user_org_memberships (auth_user_id, org_id, role)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001',
    'member'
  )
  ON CONFLICT (auth_user_id, org_id) DO NOTHING;
  
  -- Set Demo Org as their active org
  INSERT INTO user_active_org (auth_user_id, org_id)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_user_to_demo_org();

-- ============================================================
-- 7. MIGRATION COMPLETE
-- ============================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Organization tables created successfully!';
  RAISE NOTICE 'Next step: Run rls_enable.sql to secure these tables with RLS policies.';
END $$;
