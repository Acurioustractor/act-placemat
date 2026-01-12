/**
 * Xero Reconciliation for Email Financial Documents
 *
 * Matches all 192 extracted subscriptions with Xero bank transactions
 * Uses fuzzy matching engine for intelligent reconciliation
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';
import xeroTokenManager from './core/src/services/xeroTokenManager.js';
import { FuzzyMatcher } from './subscription-tracker/services/reconciliation/fuzzyMatcher.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('💰 XERO RECONCILIATION - EMAIL FINANCIAL DOCUMENTS');
console.log('='.repeat(80));
console.log('');

// Initialize fuzzy matcher with proven thresholds
const fuzzyMatcher = new FuzzyMatcher({
  vendorThreshold: 0.7,    // 70% vendor name similarity
  amountTolerance: 0.05,   // 5% amount variance
  dateDaysWindow: 14,      // ±14 days
  minConfidence: 0.6       // 60% minimum confidence
});

// Step 1: Fetch unmatched email financial documents
console.log('Step 1: Fetching unmatched email subscriptions...\n');

const { data: unmatchedDocs, error: docsError } = await supabase
  .from('email_financial_documents')
  .select('*')
  .eq('tenant_id', TENANT_ID)
  .is('xero_transaction_id', null)
  .order('transaction_date', { ascending: false });

if (docsError) {
  console.error('❌ Error fetching documents:', docsError);
  process.exit(1);
}

console.log(`✅ Found ${unmatchedDocs.length} unmatched documents\n`);

if (unmatchedDocs.length === 0) {
  console.log('🎉 All documents already reconciled!');
  process.exit(0);
}

// Step 2: Fetch Xero bank transactions
console.log('Step 2: Fetching Xero bank transactions...\n');

try {
  const xero = await xeroTokenManager.getAuthenticatedClient();

  // Get 18 months of transactions
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - 18);

  const response = await xeroTokenManager.makeApiCall(async (client) => {
    return await client.accountingApi.getBankTransactions(
      process.env.XERO_TENANT_ID,
      undefined, // If-Modified-Since
      {
        fromDate: dateFrom.toISOString().split('T')[0],
        where: 'Type=="SPEND" AND Status=="AUTHORISED"'
      }
    );
  });

  const xeroTransactions = response.body.bankTransactions || [];

  console.log(`✅ Found ${xeroTransactions.length} Xero SPEND transactions\n`);

  if (xeroTransactions.length === 0) {
    console.log('⚠️  No Xero transactions available for matching');
    process.exit(0);
  }

  // Step 3: Transform Xero transactions to match our format
  const transactions = xeroTransactions.map(txn => ({
    transaction_id: txn.bankTransactionID,
    contact_name: txn.contact?.name || 'Unknown',
    amount: parseFloat(txn.total) || 0,
    date: txn.date,
    reference: txn.reference || '',
    description: txn.reference || txn.contact?.name || '',
    bank_account: txn.bankAccount?.name || 'Unknown'
  }));

  console.log('='.repeat(80));
  console.log('Step 3: Running fuzzy matching...\n');
  console.log(`Matching ${unmatchedDocs.length} documents to ${transactions.length} transactions\n`);

  // Step 4: Run fuzzy matching
  const matchResults = fuzzyMatcher.batchMatch(
    unmatchedDocs.map(doc => ({
      ...doc,
      vendor: doc.vendor,
      amount: doc.amount,
      receipt_date: doc.transaction_date,
      date: doc.transaction_date
    })),
    transactions
  );

  // Step 5: Update database with matches
  console.log('\n='.repeat(80));
  console.log('Step 4: Updating database with matches...\n');

  let autoMatched = 0;
  let manualReview = 0;
  let unmatched = 0;
  let errors = 0;

  for (const result of matchResults) {
    const { receipt, match } = result;

    if (match.matched && match.transaction) {
      const status = match.confidence >= 0.8 ? 'auto_matched' : 'manual_review';

      try {
        const { error } = await supabase
          .from('email_financial_documents')
          .update({
            xero_transaction_id: match.transaction.transaction_id,
            reconciliation_confidence: match.confidence,
            reconciliation_date: new Date().toISOString(),
            reconciliation_status: status,
            reconciliation_notes: JSON.stringify({
              breakdown: match.breakdown,
              xero_contact: match.transaction.contact_name,
              xero_amount: match.transaction.amount,
              xero_date: match.transaction.date
            })
          })
          .eq('id', receipt.id);

        if (error) {
          console.error(`  ❌ Error updating ${receipt.vendor}:`, error.message.substring(0, 60));
          errors++;
        } else {
          if (status === 'auto_matched') {
            console.log(`  ✅ Auto-matched: ${receipt.vendor} ($${receipt.amount}) → ${match.transaction.contact_name} (${(match.confidence * 100).toFixed(1)}%)`);
            autoMatched++;
          } else {
            console.log(`  ⚠️  Manual review: ${receipt.vendor} ($${receipt.amount}) → ${match.transaction.contact_name} (${(match.confidence * 100).toFixed(1)}%)`);
            manualReview++;
          }
        }
      } catch (error) {
        console.error(`  ❌ Exception updating ${receipt.vendor}:`, error.message);
        errors++;
      }
    } else {
      unmatched++;
    }
  }

  // Step 6: Summary
  console.log('');
  console.log('='.repeat(80));
  console.log('📊 RECONCILIATION COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log(`✅ Auto-matched (≥80% confidence):  ${autoMatched}`);
  console.log(`⚠️  Manual review (60-79%):         ${manualReview}`);
  console.log(`❌ Unmatched (<60%):                ${unmatched}`);
  console.log(`🔥 Errors:                          ${errors}`);
  console.log('');
  console.log(`Total processed: ${matchResults.length}`);
  console.log(`Match rate: ${(((autoMatched + manualReview) / matchResults.length) * 100).toFixed(1)}%`);
  console.log('');

  // Step 7: Show unmatched for review
  if (unmatched > 0) {
    console.log('='.repeat(80));
    console.log('❌ UNMATCHED DOCUMENTS (Need Manual Review)');
    console.log('='.repeat(80));
    console.log('');

    const unmatchedResults = matchResults
      .filter(r => !r.match.matched)
      .slice(0, 20);  // Show first 20

    unmatchedResults.forEach((r, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${r.receipt.vendor.padEnd(40)} | $${r.receipt.amount || 'N/A'} | ${r.receipt.transaction_date || 'No date'}`);
    });

    if (unmatched > 20) {
      console.log(`\n... and ${unmatched - 20} more`);
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('🎯 NEXT STEPS');
  console.log('='.repeat(80));
  console.log('');
  console.log('1. Review manual_review items in database');
  console.log('2. Investigate unmatched documents');
  console.log('3. Build consolidation plan for vendor migration');
  console.log('');

} catch (error) {
  console.error('❌ Xero API Error:', error.message);

  if (error.message.includes('authentication required')) {
    console.log('');
    console.log('⚠️  Xero authentication required');
    console.log('');
    console.log('Run one of these commands to authenticate:');
    console.log('  node apps/backend/xero-connect-simple.js');
    console.log('');
  }

  process.exit(1);
}
