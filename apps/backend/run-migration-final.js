/**
 * Run Exa Enrichment Migration - FINAL VERSION
 *
 * Uses postgres-migrations library to run SQL file properly
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📦 Running Exa enrichment migration...\n');

async function runMigration() {
  let sql;

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../../supabase/migrations/20251224_exa_enrichment_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(1)} KB\n`);

    // Connect using postgres.js (better than pg)
    console.log('🔌 Connecting to Supabase...\n');

    // Use transaction pooler
    sql = postgres({
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      username: 'postgres.tednluwflfhxyucgwigh',
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: 'require',
      max: 1
    });

    console.log('🔧 Executing migration...\n');

    // Execute the migration SQL
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify tables
    console.log('🔍 Verifying tables created...\n');

    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'exa_%'
      ORDER BY tablename
    `;

    tables.forEach(t => console.log(`  ✅ ${t.tablename}`));

    // Verify views
    console.log('\n🔍 Verifying views created...\n');

    const views = await sql`
      SELECT viewname
      FROM pg_views
      WHERE schemaname = 'public'
        AND viewname LIKE 'vw_%exa%'
      ORDER BY viewname
    `;

    views.forEach(v => console.log(`  ✅ ${v.viewname}`));

    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. ✅ Database schema created');
    console.log('2. Test: node test-exa.js');
    console.log('3. Queue contacts: See EXA_QUICK_START.md\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    if (sql) await sql.end();
  }
}

runMigration();
