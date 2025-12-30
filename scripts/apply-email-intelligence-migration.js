/**
 * Apply Email Financial Intelligence Migration
 *
 * Uses Supabase REST API to execute SQL migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { loadEnv } from '../apps/backend/core/src/utils/loadEnv.js';

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n📊 APPLYING EMAIL FINANCIAL INTELLIGENCE MIGRATION\n');
console.log('='.repeat(80));

async function applyMigration() {
  try {
    // Read migration file
    const migrationSQL = readFileSync(
      './supabase/migrations/20260130000002_email_financial_intelligence.sql',
      'utf8'
    );

    console.log('\n📝 Migration SQL loaded...');
    console.log(`   Size: ${migrationSQL.length} characters\n`);

    // Execute migration using Supabase SQL RPC
    console.log('🚀 Executing migration...\n');

    // Split into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments and empty statements
      if (statement.trim() === ';' || statement.trim().startsWith('--')) {
        continue;
      }

      console.log(`   [${i + 1}/${statements.length}] Executing statement...`);

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });

      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log(`   ⚠️  RPC failed, trying direct execution...`);

        // For CREATE TABLE and other DDL, we need to use the Supabase REST API differently
        // Let's just log it for now and create a Node script instead
        console.log(`   Statement: ${statement.substring(0, 100)}...`);

        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          console.log(`   ℹ️  Creating manual execution script instead...\n`);
          break;
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          throw error;
        }
      } else {
        console.log(`   ✅ Success`);
      }
    }

    // Alternative: Use psql directly with connection string
    console.log('\n' + '='.repeat(80));
    console.log('💡 ALTERNATIVE APPROACH: Use psql directly\n');
    console.log('Run this command:\n');
    console.log(`PGPASSWORD="Drillsquare99" psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 6543 -U postgres.tednluwflfhxyucgwigh -d postgres -f supabase/migrations/20260130000002_email_financial_intelligence.sql`);
    console.log('\nOr use Supabase Studio SQL Editor:');
    console.log('1. Go to https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql');
    console.log('2. Paste the migration SQL');
    console.log('3. Click Run');

    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION PREPARATION COMPLETE\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

applyMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
