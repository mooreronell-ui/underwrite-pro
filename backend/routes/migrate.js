const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

/**
 * POST /migrate/run
 * Execute the organization tables migration using direct PostgreSQL connection
 * This endpoint is NOT protected by auth middleware (mounted before auth in index.js)
 */
router.post('/run', async (req, res) => {
  console.log('[MIGRATION] Starting organization tables migration...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    return res.status(500).json({
      success: false,
      message: 'DATABASE_URL not configured'
    });
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    console.log('[MIGRATION] Connected to database');
    
    // Execute the full migration SQL
    const migrationSQL = `
      -- Create extension
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      
      -- Create organizations table
      CREATE TABLE IF NOT EXISTS public.organizations(
        id uuid primary key default gen_random_uuid(),
        name text not null unique,
        created_at timestamptz not null default now()
      );
      
      -- Create user_org_memberships table
      CREATE TABLE IF NOT EXISTS public.user_org_memberships(
        id uuid primary key default gen_random_uuid(),
        org_id uuid not null references public.organizations(id) on delete cascade,
        auth_user_id uuid not null,
        role text not null default 'owner' check(role in('owner','admin','member')),
        created_at timestamptz not null default now(),
        unique(org_id,auth_user_id)
      );
      
      -- Create user_active_org table
      CREATE TABLE IF NOT EXISTS public.user_active_org(
        auth_user_id uuid primary key,
        org_id uuid not null references public.organizations(id) on delete cascade,
        updated_at timestamptz not null default now()
      );
      
      -- Enable RLS
      ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_org_memberships ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_active_org ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies
      DROP POLICY IF EXISTS orgs_select_is_member ON public.organizations;
      DROP POLICY IF EXISTS uom_select_self ON public.user_org_memberships;
      DROP POLICY IF EXISTS uao_select_self ON public.user_active_org;
      
      -- Create RLS policies
      CREATE POLICY orgs_select_is_member
      ON public.organizations
      FOR SELECT TO authenticated
      USING (EXISTS(
        SELECT 1 FROM public.user_org_memberships u
        WHERE u.org_id=organizations.id AND u.auth_user_id=auth.uid()
      ));
      
      CREATE POLICY uom_select_self
      ON public.user_org_memberships
      FOR SELECT TO authenticated
      USING (auth_user_id=auth.uid());
      
      CREATE POLICY uao_select_self
      ON public.user_active_org
      FOR SELECT TO authenticated
      USING (auth_user_id=auth.uid());
      
      -- Seed Demo Org
      WITH u AS (
        SELECT id AS auth_user_id 
        FROM auth.users 
        WHERE email='admin@underwritepro.local' 
        LIMIT 1
      ),
      o AS (
        INSERT INTO public.organizations(name) 
        VALUES('Demo Org')
        ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name 
        RETURNING id AS org_id
      ),
      m AS (
        INSERT INTO public.user_org_memberships(org_id,auth_user_id,role)
        SELECT o.org_id,u.auth_user_id,'owner' FROM o,u
        ON CONFLICT(org_id,auth_user_id) DO UPDATE SET role='owner'
        RETURNING org_id,auth_user_id
      )
      INSERT INTO public.user_active_org(auth_user_id,org_id,updated_at)
      SELECT m.auth_user_id,m.org_id,NOW() FROM m
      ON CONFLICT(auth_user_id) DO UPDATE SET org_id=EXCLUDED.org_id,updated_at=NOW();
    `;
    
    console.log('[MIGRATION] Executing SQL...');
    await client.query(migrationSQL);
    console.log('[MIGRATION] SQL executed successfully');
    
    // Verify
    const orgCount = await client.query('SELECT COUNT(*) FROM public.organizations');
    const memberCount = await client.query('SELECT COUNT(*) FROM public.user_org_memberships');
    
    console.log(`[MIGRATION] Organizations: ${orgCount.rows[0].count}`);
    console.log(`[MIGRATION] Memberships: ${memberCount.rows[0].count}`);
    
    client.release();
    await pool.end();
    
    res.json({
      success: true,
      message: 'Migration completed successfully',
      stats: {
        organizations: parseInt(orgCount.rows[0].count),
        memberships: parseInt(memberCount.rows[0].count)
      }
    });
    
  } catch (error) {
    console.error('[MIGRATION] Error:', error);
    await pool.end();
    
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message,
      detail: error.detail || error.hint || ''
    });
  }
});

module.exports = router;
