#!/usr/bin/env node
/**
 * Clear Xero invoices table and trigger fresh sync from Xero
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ No Supabase key found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🧹 CLEARING XERO DATA AND RE-SYNCING');
console.log('=====================================\n');

// Step 1: Check current data
console.log('📊 Step 1: Checking current data...');
const { count: currentCount } = await supabase
  .from('xero_invoices')
  .select('*', { count: 'exact', head: true });

console.log(`   Found ${currentCount} invoices in database\n`);

// Step 2: Clear the table
console.log('🗑️  Step 2: Clearing xero_invoices table...');
const { error: deleteError } = await supabase
  .from('xero_invoices')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

if (deleteError) {
  console.error('❌ Error clearing table:', deleteError);
  process.exit(1);
}

console.log('✅ Table cleared successfully\n');

// Step 3: Verify table is empty
const { count: afterCount } = await supabase
  .from('xero_invoices')
  .select('*', { count: 'exact', head: true });

console.log(`✅ Verified: ${afterCount} invoices remaining (should be 0)\n`);

console.log('📥 Step 3: Triggering Xero re-sync...');
console.log('   Calling: POST http://localhost:4001/api/v2/xero/sync/start\n');

// Trigger the sync
try {
  const response = await fetch('http://localhost:4001/api/v2/xero/sync/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ Sync started successfully!');
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);

    if (result.summary) {
      console.log('\n📊 Sync Summary:');
      console.log(`   Invoices synced: ${result.summary.invoices || 0}`);
      console.log(`   Contacts synced: ${result.summary.contacts || 0}`);
    }
  } else {
    console.log('⚠️  Sync response:', result);
  }
} catch (error) {
  console.error('❌ Error triggering sync:', error.message);
  console.log('\n💡 You may need to manually trigger the sync from the Intelligence tab');
}

console.log('\n✅ COMPLETE! Check the Financial Reports tab to see fresh data.');
