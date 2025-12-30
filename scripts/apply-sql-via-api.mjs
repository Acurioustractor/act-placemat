#!/usr/bin/env node

/**
 * Apply SQL Migration via Supabase SQL API
 * Uses the postgres-meta API to execute raw SQL
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
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function executeSQLStatements(statements) {
  const errors = [];
  const successes = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement || statement.startsWith('--')) continue;

    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    try {
      // Use the PostgREST query API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        const error = await response.text();
        errors.push({ statement: statement.substring(0, 100), error });
        console.log(`  ❌ Failed: ${error}`);
      } else {
        successes.push(statement.substring(0, 50));
        console.log(`  ✅ Success`);
      }
    } catch (err) {
      errors.push({ statement: statement.substring(0, 100), error: err.message });
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  return { successes, errors };
}

async function main() {
  console.log('='.repeat(80));
  console.log('Applying Subscription Tracker Migration');
  console.log('='.repeat(80));
  console.log('');

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'apps', 'backend', 'subscription-tracker', 'migrations', '20260101000000_subscription_tracker.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found');
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`✅ Loaded migration (${(sql.length / 1024).toFixed(1)} KB)\n`);

  // Split into statements (simple split by semicolon - may need refinement)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^--/));

  console.log(`Found ${statements.length} SQL statements\n`);

  const result = await executeSQLStatements(statements);

  console.log('');
  console.log('='.repeat(80));
  console.log(`✅ Successes: ${result.successes.length}`);
  console.log(`❌ Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors encountered:');
    result.errors.forEach((err, i) => {
      console.log(`\n${i + 1}. ${err.statement}...`);
      console.log(`   ${err.error}`);
    });

    console.log('\n⚠️  Supabase PostgREST API does not support direct SQL execution.');
    console.log('Use one of these alternatives instead:\n');
    console.log('1. Supabase Dashboard SQL Editor (recommended):');
    console.log('   https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new\n');
    console.log('2. Direct psql connection (requires database password)\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
