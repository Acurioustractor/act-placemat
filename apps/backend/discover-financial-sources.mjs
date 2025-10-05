#!/usr/bin/env node
/**
 * Discover all financial data sources in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../ACT Placemat/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 DISCOVERING FINANCIAL DATA SOURCES\n');
console.log('=====================================\n');

// Check for all financial-related tables
const tablesToCheck = [
  // Xero tables
  'xero_invoices',
  'xero_transactions',
  'xero_contacts',
  'xero_bank_accounts',
  'xero_bank_transactions',
  'xero_payments',

  // Dext tables
  'dext_receipts',
  'dext_expenses',
  'dext_documents',

  // Bank tables
  'bank_accounts',
  'bank_transactions',
  'bank_transfers',

  // BAS/Tax tables
  'bas_reports',
  'tax_obligations'
];

console.log('Checking for tables...\n');

for (const table of tablesToCheck) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      const status = count > 0 ? `✅ ${count} records` : '⚪ Empty';
      console.log(`${status.padEnd(20)} ${table}`);
    }
  } catch (e) {
    // Table doesn't exist
  }
}

console.log('\n\n📊 DETAILED INSPECTION\n');
console.log('=====================\n');

// Get sample data from xero_invoices
console.log('📄 XERO INVOICES (Sample):');
const { data: invoices } = await supabase
  .from('xero_invoices')
  .select('*')
  .limit(3);

if (invoices && invoices.length > 0) {
  console.log(`   Found ${invoices.length} sample invoices`);
  console.log('   Columns:', Object.keys(invoices[0]).join(', '));
} else {
  console.log('   ❌ No invoices found');
}

// Get sample from xero_bank_transactions
console.log('\n💰 XERO BANK TRANSACTIONS (Sample):');
const { data: bankTxns } = await supabase
  .from('xero_bank_transactions')
  .select('*')
  .limit(3);

if (bankTxns && bankTxns.length > 0) {
  console.log(`   Found ${bankTxns.length} sample bank transactions`);
  console.log('   Columns:', Object.keys(bankTxns[0]).join(', '));
  bankTxns.forEach(txn => {
    console.log(`   - ${txn.date}: $${txn.total} - ${txn.description || 'No desc'}`);
  });
} else {
  console.log('   ❌ No bank transactions found');
}

// Check xero_bank_accounts
console.log('\n🏦 XERO BANK ACCOUNTS:');
const { data: bankAccounts } = await supabase
  .from('xero_bank_accounts')
  .select('*');

if (bankAccounts && bankAccounts.length > 0) {
  console.log(`   Found ${bankAccounts.length} bank accounts:`);
  bankAccounts.forEach(acc => {
    console.log(`   - ${acc.name}: ${acc.account_type} (Balance: $${acc.current_balance || 0})`);
  });
} else {
  console.log('   ❌ No bank accounts found');
}

console.log('\n\n💡 RECOMMENDATIONS\n');
console.log('==================\n');
console.log('Based on the data found, your financial system should show:\n');
console.log('1. BANK ACCOUNTS - All connected bank accounts with current balances');
console.log('2. BANK TRANSACTIONS - Real money movements (deposits, withdrawals, transfers)');
console.log('3. INVOICES - Sales invoices (money you expect to receive)');
console.log('4. BILLS - Purchase invoices (money you need to pay)');
console.log('5. RECEIPTS (from Dext) - Expense receipts uploaded to Dext\n');
