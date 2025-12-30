#!/usr/bin/env node

/**
 * Execute Subscription Tracker Migration via Supabase Management API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('='.repeat(80));
  console.log('Applying Subscription Tracker Migration to Supabase');
  console.log('='.repeat(80));
  console.log('');

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'apps', 'backend', 'subscription-tracker', 'migrations', '20260101000000_subscription_tracker.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found at:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`✅ Loaded migration file (${(sql.length / 1024).toFixed(1)} KB)\n`);

  // The migration has already been copied to supabase/migrations
  const supabaseMigrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260101000000_subscription_tracker.sql');

  if (!fs.existsSync(supabaseMigrationPath)) {
    console.log('📋 Copying migration to supabase/migrations...');
    fs.copyFileSync(migrationPath, supabaseMigrationPath);
    console.log('✅ Migration copied\n');
  } else {
    console.log('✅ Migration already exists in supabase/migrations\n');
  }

  console.log('Now applying migration using Supabase CLI...\n');
  console.log('-'.repeat(80));

  try {
    // Use Supabase CLI to push migrations
    // We need to answer 'Y' to the prompt automatically
    const result = execSync(
      'echo "Y" | npx supabase db push --linked',
      {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        stdio: 'pipe'
      }
    );

    console.log(result);
    console.log('\n✅ Migration applied successfully!\n');

    // Verify the tables were created
    console.log('Verifying tables were created...\n');
    const verifyScript = path.join(__dirname, 'verify-subscription-tables.mjs');

    if (fs.existsSync(verifyScript)) {
      const verifyResult = execSync(`node ${verifyScript}`, {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
      });
      console.log(verifyResult);
    }

  } catch (error) {
    console.error('\n❌ Error applying migration:');
    console.error(error.stdout || error.message);
    console.error('');
    console.log('Alternative: Apply manually via Supabase Dashboard');
    console.log('-'.repeat(80));
    console.log('1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new');
    console.log('2. Copy the SQL from:', migrationPath);
    console.log('3. Execute in the SQL Editor');
    process.exit(1);
  }
}

main();
