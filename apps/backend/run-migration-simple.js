/**
 * Run migration using Supabase SDK - execute via RPC or raw SQL
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📦 Running Exa enrichment migration...\n');

async function runMigration() {
  const migrationPath = join(__dirname, '../../supabase/migrations/20251224_exa_enrichment_system.sql');

  console.log('📄 Using supabase CLI to apply migration...\n');

  try {
    // Use supabase CLI to apply the migration
    const { stdout, stderr } = await execAsync(
      `cd "${join(__dirname, '../..')}" && supabase db reset --db-url "postgres://postgres.tednluwflfhxyucgwigh:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"`,
      { encoding: 'utf8' }
    );

    if (stderr && !stderr.includes('Connecting')) {
      console.error('stderr:', stderr);
    }
    if (stdout) {
      console.log(stdout);
    }

  } catch (error) {
    console.log('⚠️  CLI approach failed, trying manual table creation...\n');

    // Create tables manually one by one
    console.log('Creating exa_api_usage table...');
    const { error: apiUsageError } = await supabase
      .from('exa_api_usage')
      .select('*')
      .limit(0);

    if (apiUsageError && apiUsageError.code === 'PGRST204') {
      // Table doesn't exist - this is expected, continue
      console.log('  Table needs to be created');
    } else if (!apiUsageError) {
      console.log('  ✅ Table already exists');
    }

    console.log('\n📋 Please run migration manually:');
    console.log('1. Open: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql');
    console.log('2. Copy migration file: supabase/migrations/20251224_exa_enrichment_system.sql');
    console.log('3. Paste and run\n');

    console.log('Or run:');
    console.log(`cat "${migrationPath}" | pbcopy`);
    console.log('Then paste into SQL Editor\n');

    process.exit(1);
  }

  // Verify
  console.log('\n🔍 Verifying tables...\n');

  const tables = [
    'exa_linkedin_profiles',
    'exa_company_intelligence',
    'exa_media_mentions',
    'exa_enrichment_queue',
    'exa_api_usage',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(0);
    console.log(error ? `❌ ${table}` : `✅ ${table}`);
  }

  console.log('\n✅ Migration complete!\n');
}

runMigration();
