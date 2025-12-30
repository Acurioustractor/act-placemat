/**
 * Run Exa Enrichment Migration
 *
 * Executes the migration by reading the SQL file and running each statement
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

console.log('📦 Running Exa enrichment migration...\n');

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = join(__dirname, '../../supabase/migrations/20251224_exa_enrichment_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(1)} KB\n`);

    console.log('🔧 Executing migration via REST API...\n');

    // Use Supabase REST API to execute SQL
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      // If exec_sql doesn't work, try pg_exec
      console.log('⚠️  Trying alternative method...\n');

      const altResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/pg_exec`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: migrationSQL })
      });

      if (!altResponse.ok) {
        // Last resort: use psql directly
        console.log('⚠️  REST API methods unavailable. Using psql...\n');

        const { execSync } = await import('child_process');

        // Get database URL from Supabase dashboard settings
        const dbUrl = `postgresql://postgres:[YOUR-DB-PASSWORD]@db.tednluwflfhxyucgwigh.supabase.co:5432/postgres`;

        console.log('To run migration manually with psql:');
        console.log('\npsql "YOUR-DATABASE-URL" < supabase/migrations/20251224_exa_enrichment_system.sql\n');
        console.log('Or get the direct database URL from:');
        console.log('https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database\n');

        process.exit(1);
      }
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify tables created
    console.log('🔍 Verifying tables created...\n');

    const tables = [
      'exa_linkedin_profiles',
      'exa_company_intelligence',
      'exa_media_mentions',
      'exa_enrichment_queue',
      'exa_api_usage',
    ];

    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('*').limit(0);

      if (tableError) {
        console.log(`❌ Table ${table} - NOT FOUND`);
      } else {
        console.log(`✅ Table ${table} - Created`);
      }
    }

    console.log('\n🔍 Verifying views created...\n');

    const views = [
      'vw_goods_enrichment_candidates',
      'vw_justice_enrichment_candidates',
      'vw_exa_usage_summary',
      'vw_exa_queue_summary',
    ];

    for (const view of views) {
      const { error: viewError } = await supabase.from(view).select('*').limit(0);

      if (viewError) {
        console.log(`❌ View ${view} - NOT FOUND`);
      } else {
        console.log(`✅ View ${view} - Created`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. ✅ Database schema created');
    console.log('2. Queue contacts: See EXA_QUICK_START.md');
    console.log('3. Process batch: node process-batch.js\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);

    // Fallback: use psql
    console.log('\n📋 Running migration with psql...\n');

    const { execSync } = await import('child_process');
    const migrationPath = join(__dirname, '../../supabase/migrations/20251224_exa_enrichment_system.sql');

    try {
      // Try to get DB password from environment or use connection string
      const result = execSync(
        `PGPASSWORD="${process.env.SUPABASE_DB_PASSWORD || ''}" psql -h db.tednluwflfhxyucgwigh.supabase.co -U postgres -d postgres -f "${migrationPath}"`,
        { encoding: 'utf8' }
      );
      console.log(result);
      console.log('\n✅ Migration completed via psql!\n');
    } catch (psqlError) {
      console.error('❌ psql execution failed:', psqlError.message);
      console.log('\n📋 Manual migration required:');
      console.log('1. Get your database password from:');
      console.log('   https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/settings/database');
      console.log('2. Run this command:');
      console.log(`   psql "postgresql://postgres:[PASSWORD]@db.tednluwflfhxyucgwigh.supabase.co:5432/postgres" < "${migrationPath}"\n`);
      process.exit(1);
    }
  }
}

runMigration();
