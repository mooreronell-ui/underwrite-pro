const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * POST /api/migrate/create-org-tables
 * One-time endpoint to create organization management tables
 * This should be called once after deployment
 */
router.post('/create-org-tables', async (req, res) => {
  try {
    console.log('[MIGRATION] Starting organization tables creation...');

    // Execute SQL statements one by one using Supabase admin client
    const statements = [
      // 1. Create organizations table
      `
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      `,
      
      // 2. Create index on slug
      `CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);`,
      
      // 3. Create update_updated_at function
      `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      `,
      
      // 4. Create trigger for organizations
      `
      DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
      CREATE TRIGGER organizations_updated_at
        BEFORE UPDATE ON organizations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `,
      
      // 5. Create user_org_memberships table
      `
      CREATE TABLE IF NOT EXISTS user_org_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(auth_user_id, org_id)
      );
      `,
      
      // 6. Create indexes for memberships
      `CREATE INDEX IF NOT EXISTS idx_memberships_user ON user_org_memberships(auth_user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_memberships_org ON user_org_memberships(org_id);`,
      `CREATE INDEX IF NOT EXISTS idx_memberships_role ON user_org_memberships(role);`,
      
      // 7. Create trigger for memberships
      `
      DROP TRIGGER IF EXISTS memberships_updated_at ON user_org_memberships;
      CREATE TRIGGER memberships_updated_at
        BEFORE UPDATE ON user_org_memberships
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `,
      
      // 8. Create user_active_org table
      `
      CREATE TABLE IF NOT EXISTS user_active_org (
        auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      `,
      
      // 9. Create index for active_org
      `CREATE INDEX IF NOT EXISTS idx_active_org_org ON user_active_org(org_id);`,
      
      // 10. Create trigger for active_org
      `
      DROP TRIGGER IF EXISTS active_org_updated_at ON user_active_org;
      CREATE TRIGGER active_org_updated_at
        BEFORE UPDATE ON user_active_org
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `,
      
      // 11. Insert Demo Organization
      `
      INSERT INTO organizations (id, name, slug, description)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Demo Organization',
        'demo-org',
        'Default organization for new users'
      )
      ON CONFLICT (slug) DO NOTHING;
      `,
      
      // 12. Create auto-add function
      `
      CREATE OR REPLACE FUNCTION auto_add_user_to_demo_org()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO user_org_memberships (auth_user_id, org_id, role)
        VALUES (
          NEW.id,
          '00000000-0000-0000-0000-000000000001',
          'member'
        )
        ON CONFLICT (auth_user_id, org_id) DO NOTHING;
        
        INSERT INTO user_active_org (auth_user_id, org_id)
        VALUES (
          NEW.id,
          '00000000-0000-0000-0000-000000000001'
        )
        ON CONFLICT (auth_user_id) DO NOTHING;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
      
      // 13. Create trigger for new users
      `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION auto_add_user_to_demo_org();
      `
    ];

    console.log(`[MIGRATION] Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        console.log(`[MIGRATION] Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec', { sql: stmt });
        
        if (error) {
          console.error(`[MIGRATION] Error in statement ${i + 1}:`, error);
          // Continue with other statements
        } else {
          console.log(`[MIGRATION] ✓ Statement ${i + 1} executed`);
        }
      }
    }

    // Verify tables were created
    console.log('[MIGRATION] Verifying tables...');
    
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    const { data: memberships, error: membershipsError } = await supabase
      .from('user_org_memberships')
      .select('*')
      .limit(1);
    
    const { data: activeOrg, error: activeOrgError } = await supabase
      .from('user_active_org')
      .select('*')
      .limit(1);

    if (orgsError || membershipsError || activeOrgError) {
      console.error('[MIGRATION] Verification errors:', {
        orgsError,
        membershipsError,
        activeOrgError
      });
      
      return res.status(500).json({
        success: false,
        message: 'Migration completed but verification failed',
        errors: {
          organizations: orgsError?.message,
          memberships: membershipsError?.message,
          activeOrg: activeOrgError?.message
        }
      });
    }

    console.log('[MIGRATION] ✓ All tables verified successfully!');

    res.json({
      success: true,
      message: 'Organization tables created successfully',
      tables: {
        organizations: 'created',
        user_org_memberships: 'created',
        user_active_org: 'created'
      }
    });

  } catch (error) {
    console.error('[MIGRATION] Fatal error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

/**
 * POST /api/migrate/add-existing-users-to-demo
 * Add all existing users to Demo Organization
 */
router.post('/add-existing-users-to-demo', async (req, res) => {
  try {
    console.log('[MIGRATION] Adding existing users to Demo Org...');

    // Get all users from auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw new Error(`Failed to list users: ${usersError.message}`);
    }

    console.log(`[MIGRATION] Found ${users.length} users`);

    const demoOrgId = '00000000-0000-0000-0000-000000000001';
    let added = 0;

    for (const user of users) {
      // Add to memberships
      const { error: memberError } = await supabase
        .from('user_org_memberships')
        .insert({
          auth_user_id: user.id,
          org_id: demoOrgId,
          role: 'member'
        });

      if (memberError && !memberError.message.includes('duplicate')) {
        console.error(`[MIGRATION] Error adding user ${user.email}:`, memberError);
        continue;
      }

      // Set active org
      const { error: activeError } = await supabase
        .from('user_active_org')
        .insert({
          auth_user_id: user.id,
          org_id: demoOrgId
        });

      if (activeError && !activeError.message.includes('duplicate')) {
        console.error(`[MIGRATION] Error setting active org for ${user.email}:`, activeError);
        continue;
      }

      added++;
      console.log(`[MIGRATION] ✓ Added user ${user.email} to Demo Org`);
    }

    res.json({
      success: true,
      message: `Added ${added} users to Demo Organization`,
      totalUsers: users.length,
      addedUsers: added
    });

  } catch (error) {
    console.error('[MIGRATION] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add users to Demo Org',
      error: error.message
    });
  }
});

module.exports = router;
