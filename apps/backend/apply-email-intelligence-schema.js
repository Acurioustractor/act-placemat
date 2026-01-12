/**
 * Apply Email Intelligence Schema
 *
 * Creates email_financial_documents table directly via Supabase SQL execution
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📊 APPLYING EMAIL INTELLIGENCE SCHEMA');
console.log('='.repeat(80));
console.log('');

// Read migration SQL
const migrationSQL = readFileSync('../supabase/migrations/20260130000002_email_financial_intelligence.sql', 'utf8');

console.log('Migration SQL loaded:', migrationSQL.length, 'characters');
console.log('');
console.log('⚠️  NOTE: Supabase client cannot execute raw DDL.');
console.log('Please apply this migration using ONE of these methods:');
console.log('');
console.log('METHOD 1: Supabase Studio SQL Editor (RECOMMENDED)');
console.log('  1. Go to: https://supabase.com/dashboard/project/tednluwflfhxyucgwigh/sql/new');
console.log('  2. Copy contents of: supabase/migrations/20260130000002_email_financial_intelligence.sql');
console.log('  3. Paste and click "Run"');
console.log('');
console.log('METHOD 2: Copy this SQL and paste into Studio:');
console.log('');
console.log(migrationSQL);
console.log('');
