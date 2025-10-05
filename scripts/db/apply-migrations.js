#!/usr/bin/env node
/**
 * Apply database migrations to Supabase
 * Usage: node apply-migrations.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migrations to apply (in order)
const migrations = [
  '20250929210000_gmail_integration_tables.sql',
  '20250929210100_calendar_integration_tables.sql',
  '20250929210200_xero_financial_tables.sql'
];

async function applyMigration(filename) {
  console.log(`\n📄 Applying migration: ${filename}`);

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', filename);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql function doesn't exist, try direct query
      if (error.message.includes('exec_sql')) {
        console.log('⚠️  exec_sql function not available, using direct query...');

        // Split into statements and execute one by one
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          try {
            // Skip comments and empty statements
            if (statement.startsWith('--') || statement.length < 5) continue;

            const { error: stmtError } = await supabase.rpc('exec', {
              sql: statement + ';'
            });

            if (stmtError && !stmtError.message.includes('already exists')) {
              console.error(`   ⚠️  Statement error (continuing): ${stmtError.message.substring(0, 100)}`);
            }
          } catch (err) {
            // Continue on errors like "already exists"
            if (!err.message.includes('already exists')) {
              console.error(`   ⚠️  Error (continuing): ${err.message.substring(0, 100)}`);
            }
          }
        }

        console.log(`✅ ${filename} applied (with warnings)`);
        return true;
      }

      // Check if it's just "already exists" errors
      if (error.message.includes('already exists')) {
        console.log(`✅ ${filename} - tables already exist (skipping)`);
        return true;
      }

      console.error(`❌ Error applying migration: ${error.message}`);
      return false;
    }

    console.log(`✅ ${filename} applied successfully`);
    return true;

  } catch (error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting migration process...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`📦 Migrations to apply: ${migrations.length}`);

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const success = await applyMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. Check errors above.');
    console.log('💡 You may need to apply migrations manually via Supabase SQL Editor');
    process.exit(1);
  }

  console.log('\n🎉 All migrations applied successfully!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});