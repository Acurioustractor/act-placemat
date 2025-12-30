/**
 * Sync Xero Bank Transactions to Database
 * Pulls transactions from Xero API and stores in xero_bank_transactions table
 */

import { loadEnv } from './core/src/utils/loadEnv.js';
import { createClient } from '@supabase/supabase-js';

loadEnv();

const accessToken = process.env.XERO_ACCESS_TOKEN;
const tenantId = process.env.XERO_TENANT_ID;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('💰 Syncing Xero Bank Transactions to Database...\n');

async function syncXeroTransactions() {
  try {
    // Fetch bank transactions from Xero
    console.log('1️⃣  Fetching bank transactions from Xero API...');

    const response = await fetch(
      'https://api.xero.com/api.xro/2.0/BankTransactions',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'xero-tenant-id': tenantId,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Xero API error: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    const transactions = data.BankTransactions || [];

    console.log(`   ✅ Fetched ${transactions.length} transactions from Xero\n`);

    if (transactions.length === 0) {
      console.log('⚠️  No transactions found in Xero');
      return;
    }

    // Transform transactions for database
    console.log('2️⃣  Transforming transactions for database...');

    // Helper to parse Xero date format /Date(timestamp)/
    const parseXeroDate = (xeroDate) => {
      if (!xeroDate) return null;
      const match = xeroDate.match(/\/Date\((\d+)([+-]\d+)?\)\//);
      if (match) {
        const timestamp = parseInt(match[1]);
        return new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
      }
      return xeroDate;
    };

    const records = transactions
      .filter(tx => ['SPEND', 'RECEIVE'].includes(tx.Type)) // Only valid types
      .map(tx => ({
        xero_id: tx.BankTransactionID,
        tenant_id: tenantId,
        type: tx.Type, // SPEND or RECEIVE
        status: tx.Status,
        date: parseXeroDate(tx.Date),
        reference: tx.Reference || null,
        contact_id: tx.Contact?.ContactID || null,
        contact_name: tx.Contact?.Name || null,
        bank_account_id: tx.BankAccount?.AccountID || null,
        bank_account_name: tx.BankAccount?.Name || null,
        subtotal: parseFloat(tx.SubTotal || 0),
        total_tax: parseFloat(tx.TotalTax || 0),
        total: parseFloat(tx.Total || 0),
        line_items: tx.LineItems || [],
        updated_at: new Date().toISOString()
      }));

    console.log(`   ✅ Transformed ${records.length} records\n`);

    // Insert/update in database
    console.log('3️⃣  Upserting to database...');

    const { data: inserted, error } = await supabase
      .from('xero_bank_transactions')
      .upsert(records, {
        onConflict: 'xero_id',
        ignoreDuplicates: false
      })
      .select('xero_id');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`   ✅ Upserted ${inserted?.length || records.length} transactions\n`);

    // Summary stats
    const spendTransactions = records.filter(r => r.type === 'SPEND');
    const totalSpend = spendTransactions.reduce((sum, r) => sum + r.total, 0);
    const avgSpend = totalSpend / spendTransactions.length;

    console.log('━'.repeat(60));
    console.log('✅ SYNC COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   Total transactions: ${records.length}`);
    console.log(`   Spend transactions: ${spendTransactions.length}`);
    console.log(`   Total spend: $${totalSpend.toFixed(2)}`);
    console.log(`   Average spend: $${avgSpend.toFixed(2)}`);
    console.log(`   Date range: ${records[0]?.date} to ${records[records.length - 1]?.date}`);
    console.log('\n🎯 Next Steps:');
    console.log('   1. Subscription discovery will now include Xero data');
    console.log('   2. Run: curl -X POST "http://localhost:4000/api/v1/subscriptions/discover?tenantId=act-main&force=true"');
    console.log('   3. Check dashboard for populated amounts');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  }
}

syncXeroTransactions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
