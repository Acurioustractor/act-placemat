/**
 * Apply Migration Directly via Supabase Client
 * Executes the email_financial_intelligence migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 APPLYING EMAIL FINANCIAL INTELLIGENCE MIGRATION');
console.log('='.repeat(80));
console.log('');

// Read the migration SQL
const migrationSQL = readFileSync('/Users/benknight/Code/ACT Placemat/supabase/migrations/20260130000002_email_financial_intelligence.sql', 'utf8');

console.log('✅ Migration SQL loaded');
console.log('');
console.log('Executing via pg client...');
console.log('');

// Use node-postgres to execute raw SQL
import pkg from 'pg';
const { Client } = pkg;

// Using the exact connection string from .mcp.json postgres MCP server
const client = new Client({
  connectionString: 'postgresql://postgres.tednluwflfhxyucgwigh:Drillsquare99@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres'
});

try {
  await client.connect();
  console.log('✅ Connected to database');
  console.log('');

  // Execute the entire migration
  await client.query(migrationSQL);

  console.log('✅ Migration executed successfully!');
  console.log('');

  // Verify table was created
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'email_financial_documents'
  `);

  if (result.rows.length > 0) {
    console.log('✅ Table email_financial_documents created');
    console.log('');
    console.log('='.repeat(80));
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('='.repeat(80));
    console.log('');
    console.log('Ready to run:');
    console.log('  node extract-all-subscriptions.js');
    console.log('');
  } else {
    console.log('⚠️  Table not found after migration');
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error('');
  console.error('Full error:', error);
} finally {
  await client.end();
}
