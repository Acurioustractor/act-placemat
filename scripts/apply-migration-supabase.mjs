#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚜 Applying Subscription Tracker Migration\n');
console.log('Using Supabase URL:', process.env.SUPABASE_URL);
console.log('');

// Read migration file
const migrationPath = path.join(__dirname, '../apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql');
const sql = readFileSync(migrationPath, 'utf8');

console.log('✅ Loaded migration (13.1 KB)');
console.log('');

// Execute via direct SQL (single statement)
console.log('Executing migration...\n');

try {
  // Try using the SQL editor endpoint
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (response.ok) {
    console.log('✅ Migration applied successfully!');
  } else {
    const error = await response.text();
    console.log('⚠️  API response:', response.status, error);
    console.log('\nTrying alternative method...\n');

    // Alternative: Execute statements one by one
    await executeStatementsDirectly(sql);
  }
} catch (err) {
  console.log('⚠️  Error:', err.message);
  console.log('\nTrying to execute statements directly...\n');
  await executeStatementsDirectly(sql);
}

async function executeStatementsDirectly(sql) {
  // For tables, we can check if they exist
  const tables = ['discovered_subscriptions', 'subscription_receipts', 'rd_activity_log', 'subscription_analytics'];

  console.log('Checking if tables already exist...\n');

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('count')
      .limit(0);

    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ ${table} - does not exist (needs creation)`);
      } else {
        console.log(`⚠️  ${table} - error: ${error.message}`);
      }
    } else {
      console.log(`✅ ${table} - already exists`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Manual Step Required:');
  console.log('='.repeat(60));
  console.log('\nThe migration needs to be applied via Supabase SQL Editor.');
  console.log('\n1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new');
  console.log('\n2. Copy and paste the contents of:');
  console.log('   apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql');
  console.log('\n3. Click "Run" to execute the migration');
  console.log('\n4. Then run: node scripts/verify-subscription-tables.mjs');
  console.log('');
}
