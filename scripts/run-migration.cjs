#!/usr/bin/env node
/**
 * Run SQL Migration Against Supabase using Management API
 * 
 * Usage: node scripts/run-migration.cjs <migration-file>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: 'apps/backend/.env' });

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.log('Usage: node scripts/run-migration.cjs <migration-file>');
  console.log('Example: node scripts/run-migration.cjs supabase/migrations/20260118_add_data_quality_fields.sql');
  process.exit(1);
}

// Get access token from Supabase CLI
let accessToken;
try {
  // Read from supabase CLI config
  const configPath = path.join(process.env.HOME, '.supabase', 'access-token');
  if (fs.existsSync(configPath)) {
    accessToken = fs.readFileSync(configPath, 'utf8').trim();
  }
} catch (e) {
  console.log('Getting token from supabase CLI...');
}

const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)/)?.[1];

if (!projectRef) {
  console.error('Cannot extract project ref from SUPABASE_URL');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(migrationFile), 'utf8');

console.log(`Running migration: ${migrationFile}`);
console.log(`Project: ${projectRef}`);
console.log('\nSQL to execute:');
console.log('─'.repeat(50));
console.log(sql.substring(0, 500) + (sql.length > 500 ? '...' : ''));
console.log('─'.repeat(50));

async function runMigration() {
  // Use the Supabase API via the client
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Execute each statement separately
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

  console.log(`\nExecuting ${statements.length} statements...`);

  for (const stmt of statements) {
    if (stmt.toLowerCase().startsWith('alter table')) {
      // For ALTER TABLE, we need to use a workaround - call via RPC or skip
      console.log('⚠️  ALTER TABLE requires direct DB access or dashboard');
      console.log('Statement:', stmt.substring(0, 80) + '...');
    }
  }

  console.log('\n⚠️  Schema changes (ALTER TABLE) cannot be executed via Supabase JS client.');
  console.log('Please run the SQL in Supabase Dashboard → SQL Editor:');
  console.log(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log('\nOr enable direct database connections in your Supabase project settings.');
}

runMigration().catch(console.error);
