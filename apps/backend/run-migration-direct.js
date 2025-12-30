/**
 * Run migration by executing SQL statements directly via Supabase client
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📦 Running Exa enrichment migration directly...\n');

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = join(__dirname, '../../supabase/migrations/20251224_exa_enrichment_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(1)} KB\n`);

    // Connect via node-postgres
    const connectionString = `postgresql://postgres.tednluwflfhxyucgwigh:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

    const client = new pg.Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('🔌 Connecting to database...\n');
    await client.connect();

    console.log('🔧 Executing migration SQL...\n');

    // Execute the entire migration
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    await client.end();

    // Verify with Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔍 Verifying tables created...\n');

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

    console.log('\n🔍 Verifying views...\n');

    const views = [
      'vw_goods_enrichment_candidates',
      'vw_justice_enrichment_candidates',
      'vw_exa_usage_summary',
      'vw_exa_queue_summary',
    ];

    for (const view of views) {
      const { error } = await supabase.from(view).select('*').limit(0);
      console.log(error ? `❌ ${view}` : `✅ ${view}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigration();
