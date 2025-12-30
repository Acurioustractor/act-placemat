#!/usr/bin/env node

/**
 * Apply Subscription Tracker Migration
 * Executes the subscription tracker SQL migration using Supabase service role
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function executeSqlDirect(sql) {
  // Try using the PostgREST query endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await response.text();
  console.log('Response:', text);
  return text;
}

async function main() {
  console.log('Applying Subscription Tracker Migration...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'apps', 'backend', 'subscription-tracker', 'migrations', '20260101000000_subscription_tracker.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found at:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`Loaded migration file (${sql.length} bytes)\n`);

  // Since Supabase doesn't expose a direct SQL execution endpoint via REST,
  // we need to use the Supabase CLI or psql
  console.log('This migration requires direct database access.');
  console.log('Please run one of the following commands:\n');

  console.log('Option 1: Using psql directly');
  console.log('-'.repeat(80));
  console.log(`PGPASSWORD=<your-db-password> psql -h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.tednluwflfhxyucgwigh -d postgres -f ${migrationPath}`);
  console.log('');

  console.log('Option 2: Using Supabase Dashboard');
  console.log('-'.repeat(80));
  console.log('1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new');
  console.log('2. Copy and paste the migration SQL');
  console.log('3. Run the query');
  console.log('');

  console.log('Option 3: Copy migration to supabase/migrations and push');
  console.log('-'.repeat(80));
  console.log('cp apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql supabase/migrations/');
  console.log('npx supabase db push --linked');
  console.log('');

  // Try to provide the SQL content for easy copy-paste
  console.log('\n=== MIGRATION SQL (for copy-paste) ===\n');
  console.log(sql);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
