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

console.log('🚜 Applying Email Financial Intelligence Migration\n');
console.log('Using Supabase URL:', process.env.SUPABASE_URL);
console.log('');

// Read migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20260130000002_email_financial_intelligence.sql');
const sql = readFileSync(migrationPath, 'utf8');

console.log('✅ Loaded migration (' + (sql.length / 1024).toFixed(1) + ' KB)');
console.log('');

// Execute via direct SQL
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
    await verifyTables();
  } else {
    const error = await response.text();
    console.log('⚠️  API response:', response.status, error);
    console.log('\nTrying to verify tables directly...\n');
    await verifyTables();
  }
} catch (err) {
  console.log('⚠️  Error:', err.message);
  console.log('\nVerifying tables directly...\n');
  await verifyTables();
}

async function verifyTables() {
  console.log('\nChecking if email_financial_documents table exists...\n');

  const { data, error } = await supabase
    .from('email_financial_documents')
    .select('count')
    .limit(0);

  if (error) {
    if (error.code === '42P01') {
      console.log('❌ email_financial_documents - does not exist\n');
      console.log('='.repeat(60));
      console.log('Manual Step Required:');
      console.log('='.repeat(60));
      console.log('\n1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new');
      console.log('\n2. Paste this SQL:\n');
      console.log(sql);
      console.log('\n3. Click "Run"');
      console.log('');
    } else {
      console.log(`⚠️  Error: ${error.message}`);
    }
  } else {
    console.log(`✅ email_financial_documents - exists and ready!`);
    console.log('');
    console.log('='.repeat(60));
    console.log('Next: Extract all subscriptions');
    console.log('='.repeat(60));
    console.log('');
    console.log('Run: cd apps/backend && node extract-all-subscriptions.js');
    console.log('');
  }
}
