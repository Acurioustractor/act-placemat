/**
 * Apply Email Financial Intelligence Migration
 * Creates email_financial_documents table and related views
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n📊 EMAIL FINANCIAL INTELLIGENCE MIGRATION\n');
console.log('='.repeat(80));

async function applyMigration() {
  try {
    // Check if table already exists
    console.log('\n1. Checking if email_financial_documents table exists...\n');

    const { data: existingTable, error: checkError } = await supabase
      .from('email_financial_documents')
      .select('id')
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      console.log(`   ✅ Table already exists with ${existingTable?.length || 0} rows\n`);
      console.log('   Skipping table creation...\n');
      return;
    }

    console.log('   ℹ️  Table does not exist, creating...\n');

    // Since we can't execute raw DDL via Supabase client, provide instructions
    console.log('='.repeat(80));
    console.log('⚠️  MANUAL MIGRATION REQUIRED\n');
    console.log('The Supabase JavaScript client cannot execute DDL statements.');
    console.log('Please apply the migration using ONE of these methods:\n');

    console.log('METHOD 1: Supabase Studio SQL Editor (RECOMMENDED)');
    console.log('--------------------------------------------------');
    console.log('1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new');
    console.log('2. Copy the contents of:');
    console.log('   supabase/migrations/20260130000002_email_financial_intelligence.sql');
    console.log('3. Paste into SQL Editor');
    console.log('4. Click "Run"\n');

    console.log('METHOD 2: psql Command Line');
    console.log('---------------------------');
    console.log('PGPASSWORD="Drillsquare99" psql \\');
    console.log('  -h db.tednluwflfhxyucgwigh.supabase.co \\');
    console.log('  -p 5432 \\');
    console.log('  -U postgres \\');
    console.log('  -d postgres \\');
    console.log('  -f supabase/migrations/20260130000002_email_financial_intelligence.sql\n');

    console.log('METHOD 3: Supabase CLI');
    console.log('---------------------');
    console.log('npx supabase db push\n');

    console.log('='.repeat(80));
    console.log('\nAfter migration, run this script again to verify.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

applyMigration()
  .then(() => {
    console.log('Migration check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration check failed:', error);
    process.exit(1);
  });
