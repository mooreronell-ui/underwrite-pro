-- ============================================================
-- FINTECH GUARDRAILS V1 — RLS PATCH
-- Date: November 6, 2025
-- Purpose: Add missing INSERT and UPDATE policies for org auto-attach and active org switching
-- ============================================================
--
-- CONTEXT:
-- This patch adds two critical RLS policies that were missing from the initial deployment:
-- 1. uom_insert_self: Allows users to add themselves to orgs (auto-attach on org creation)
-- 2. uao_update_self: Allows users to update their own active org (org switching)
--
-- SAFETY:
-- - Idempotent: Can be run multiple times safely
-- - No data loss: Only drops and recreates the specific policies being patched
-- - Preserves existing policies: Does not touch other RLS policies
--
-- ROLLBACK:
-- To rollback, revert this commit and re-run the previous RLS SQL file.
--
-- ============================================================

-- Drop existing policies if they exist (idempotent)
DO $$
BEGIN
  -- Drop uom_insert_self if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_org_memberships' 
    AND policyname = 'uom_insert_self'
  ) THEN
    DROP POLICY uom_insert_self ON public.user_org_memberships;
  END IF;

  -- Drop uao_update_self if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_active_org' 
    AND policyname = 'uao_update_self'
  ) THEN
    DROP POLICY uao_update_self ON public.user_active_org;
  END IF;
END $$;

-- ============================================================
-- PATCH 1: user_org_memberships INSERT policy
-- ============================================================
-- Allows authenticated users to insert their own membership records
-- This enables auto-attach when creating a new organization

CREATE POLICY uom_insert_self
ON public.user_org_memberships
FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- ============================================================
-- PATCH 2: user_active_org UPDATE policy
-- ============================================================
-- Allows authenticated users to update their own active org
-- This enables org switching functionality

CREATE POLICY uao_update_self
ON public.user_active_org
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these queries to verify the policies were created successfully:
--
-- 1. Check user_org_memberships policies:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'user_org_memberships'
-- AND policyname = 'uom_insert_self';
--
-- 2. Check user_active_org policies:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'user_active_org'
-- AND policyname = 'uao_update_self';
--
-- Expected result: Both queries should return exactly 1 row each
-- ============================================================
