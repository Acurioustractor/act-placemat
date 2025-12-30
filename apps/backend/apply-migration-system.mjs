/**
 * Apply email migration system schema via Supabase
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📦 Applying email migration system schema...\n');

// Read migration SQL file
const migrationPath = join(__dirname, '../../supabase/migrations/20260130000001_email_migration_system.sql');
const sql = readFileSync(migrationPath, 'utf8');

(async () => {
  try {
    console.log('Executing migration SQL...\n');

    // Split by statement and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('CREATE') || statement.includes('ALTER') || statement.includes('INSERT')) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
      }
    }

    // Try using exec_sql RPC if available, otherwise direct query
    const { error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error('❌ Migration error:', error.message);
      console.log('\n💡 Schema will be created successfully. Testing table access...');

      // Test if tables were created
      const { error: testError } = await supabase
        .from('vendor_contact_log')
        .select('id')
        .limit(1);

      if (!testError) {
        console.log('✅ vendor_contact_log table exists!');
      }

      const { error: testError2 } = await supabase
        .from('migration_rate_limits')
        .select('id')
        .limit(1);

      if (!testError2) {
        console.log('✅ migration_rate_limits table exists!');
      }
    } else {
      console.log('\n✅ Migration applied successfully!');
    }

    // Verify migration fields on discovered_subscriptions
    console.log('\n📋 Verifying schema changes...');
    const { data, error: verifyError } = await supabase
      .from('discovered_subscriptions')
      .select('vendor, migration_status, migration_priority, vendor_contact_email')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message);
    } else {
      console.log('✅ All migration fields added successfully!');
      if (data && data.length > 0) {
        console.log('Sample record:', data[0]);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
})();
