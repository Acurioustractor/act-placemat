#!/usr/bin/env node

/**
 * Verify Subscription Tracker Tables
 * Checks if the migration was successful by querying table existence
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EXPECTED_TABLES = [
  'discovered_subscriptions',
  'subscription_receipts',
  'rd_activity_log',
  'subscription_analytics'
];

async function checkTable(tableName) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { exists: false, error: error.message };
    }
    return { exists: true, count: count || 0 };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function main() {
  console.log('Verifying Subscription Tracker Tables');
  console.log('='.repeat(80));
  console.log('');

  let allTablesExist = true;

  for (const tableName of EXPECTED_TABLES) {
    const result = await checkTable(tableName);

    if (result.exists) {
      console.log(`✅ ${tableName.padEnd(30)} - EXISTS (${result.count} rows)`);
    } else {
      console.log(`❌ ${tableName.padEnd(30)} - MISSING (${result.error})`);
      allTablesExist = false;
    }
  }

  console.log('');
  console.log('='.repeat(80));

  if (allTablesExist) {
    console.log('✅ All tables created successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start the subscription tracker service');
    console.log('  2. Run the Gmail discovery service');
    console.log('  3. Check the subscription dashboard');
  } else {
    console.log('❌ Some tables are missing. Migration may have failed.');
    console.log('');
    console.log('Try applying the migration manually:');
    console.log('  1. Go to Supabase Dashboard SQL Editor');
    console.log('  2. Run the migration SQL from:');
    console.log('     apps/backend/subscription-tracker/migrations/20260101000000_subscription_tracker.sql');
  }

  console.log('');
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
