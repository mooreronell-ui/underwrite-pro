const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://hhyqydjbfbxcqazkwpvx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoeXF5ZGpiZmJ4Y3FhemN3cHZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDgxNTc0NywiZXhwIjoyMDQ2MzkxNzQ3fQ.JlJwbdQHJSyxlmxwKIRN8AwUCfQFxRxEwMRVrXCUFdQ';

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('📝 Reading SQL migration file...');
    const sqlPath = path.join(__dirname, '../ops/sql/create_org_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔌 Connecting to Supabase...');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement using Supabase RPC
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['organizations', 'user_org_memberships', 'user_active_org']);
    
    if (tablesError) {
      console.error('❌ Error verifying tables:', tablesError.message);
    } else {
      console.log('✅ Tables verified:', tables);
    }
    
    console.log('\n✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
