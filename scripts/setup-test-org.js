#!/usr/bin/env node

/**
 * Setup Test Organization Script
 * 
 * This script creates an organization for the test user and sets it as active.
 * 
 * Usage:
 *   node scripts/setup-test-org.js <SUPABASE_SERVICE_ROLE_KEY>
 * 
 * Example:
 *   node scripts/setup-test-org.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://engzooyyfnucsbzptfck.supabase.co';
const TEST_USER_ID = '4ab4fdd4-a16e-434f-8b7d-40a34788df1e';
const ORG_NAME = 'Test Complete Organization';

// Get service role key from command line argument
const serviceRoleKey = process.argv[2];

if (!serviceRoleKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is required');
  console.error('');
  console.error('Usage:');
  console.error('  node scripts/setup-test-org.js <SUPABASE_SERVICE_ROLE_KEY>');
  console.error('');
  console.error('Get your service role key from:');
  console.error('  Supabase Dashboard → Project Settings → API → service_role key');
  console.error('');
  process.exit(1);
}

console.log('🚀 Starting organization setup...');
console.log('');
console.log('Configuration:');
console.log(`  Supabase URL: ${SUPABASE_URL}`);
console.log(`  Test User ID: ${TEST_USER_ID}`);
console.log(`  Organization Name: ${ORG_NAME}`);
console.log('');

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, serviceRoleKey);

(async () => {
  try {
    // Step 1: Check if organization already exists
    console.log('📋 Step 1: Checking for existing organization...');
    const { data: existingOrg, error: checkError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', ORG_NAME)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Failed to check existing org: ${checkError.message}`);
    }

    let orgId;

    if (existingOrg) {
      console.log(`✅ Organization already exists: ${existingOrg.id}`);
      orgId = existingOrg.id;
    } else {
      // Step 2: Create organization
      console.log('📝 Step 2: Creating organization...');
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: ORG_NAME })
        .select('id')
        .single();

      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }

      orgId = newOrg.id;
      console.log(`✅ Organization created: ${orgId}`);
    }

    // Step 3: Check if membership exists
    console.log('📋 Step 3: Checking for existing membership...');
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('user_org_memberships')
      .select('id')
      .eq('auth_user_id', TEST_USER_ID)
      .eq('org_id', orgId)
      .maybeSingle();

    if (membershipCheckError) {
      throw new Error(`Failed to check membership: ${membershipCheckError.message}`);
    }

    if (existingMembership) {
      console.log(`✅ Membership already exists`);
    } else {
      // Step 4: Create membership
      console.log('📝 Step 4: Creating membership...');
      const { error: membershipError } = await supabase
        .from('user_org_memberships')
        .insert({
          org_id: orgId,
          auth_user_id: TEST_USER_ID,
          role: 'owner'
        });

      if (membershipError) {
        throw new Error(`Failed to create membership: ${membershipError.message}`);
      }

      console.log(`✅ Membership created`);
    }

    // Step 5: Set active org
    console.log('📝 Step 5: Setting active organization...');
    const { error: activeOrgError } = await supabase
      .from('user_active_org')
      .upsert({
        auth_user_id: TEST_USER_ID,
        org_id: orgId
      }, { onConflict: 'auth_user_id' });

    if (activeOrgError) {
      throw new Error(`Failed to set active org: ${activeOrgError.message}`);
    }

    console.log(`✅ Active organization set`);
    console.log('');
    console.log('🎉 SUCCESS! Organization setup complete!');
    console.log('');
    console.log('Summary:');
    console.log(`  Organization ID: ${orgId}`);
    console.log(`  Organization Name: ${ORG_NAME}`);
    console.log(`  User ID: ${TEST_USER_ID}`);
    console.log(`  Role: owner`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Add SUPABASE_SERVICE_ROLE_KEY to Render environment');
    console.log('  2. Redeploy the backend service');
    console.log('  3. Test deal creation in the application');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  - Verify the service role key is correct');
    console.error('  - Check Supabase project is accessible');
    console.error('  - Ensure database tables exist');
    console.error('');
    process.exit(1);
  }
})();
