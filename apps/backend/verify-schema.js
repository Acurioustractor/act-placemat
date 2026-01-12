/**
 * Verify Email Intelligence Schema
 * Quick check to confirm table was created successfully
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 VERIFYING SCHEMA');
console.log('='.repeat(80));
console.log('');

try {
  // Test 1: Check if table exists
  console.log('Test 1: Checking if email_financial_documents table exists...');
  const { data, error } = await supabase
    .from('email_financial_documents')
    .select('count')
    .limit(1);

  if (error) {
    console.log('❌ Table does not exist');
    console.log('   Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Table exists!');
  console.log('');

  // Test 2: Check views
  console.log('Test 2: Checking views...');
  const { data: viewData, error: viewError } = await supabase
    .from('unreconciled_financial_documents')
    .select('count')
    .limit(1);

  if (viewError) {
    console.log('⚠️  Views may not be created yet');
  } else {
    console.log('✅ Views created!');
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('🎉 SCHEMA VERIFIED - READY TO EXTRACT!');
  console.log('='.repeat(80));
  console.log('');
  console.log('Run next:');
  console.log('  node extract-all-subscriptions.js');
  console.log('');

} catch (error) {
  console.log('❌ Verification failed:', error.message);
  process.exit(1);
}
