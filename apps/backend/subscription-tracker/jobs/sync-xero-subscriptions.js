#!/usr/bin/env node
/**
 * Sync Xero Subscriptions - Create Email Records from Bank Transactions
 *
 * This script finds recurring subscriptions in Xero that don't have email receipts
 * and creates placeholder records for them. This ensures complete visibility of
 * all paid subscriptions, even without email receipts (like Mighty Networks).
 *
 * Flow:
 * 1. Query missing_subscriptions view (Xero without emails)
 * 2. For each missing subscription:
 *    - Create email_financial_documents record
 *    - Mark as from Xero (not email)
 *    - Use Xero data for amount, frequency, vendor
 * 3. Run payment prediction to get next renewal date
 * 4. Now these subscriptions appear in all reports/views
 *
 * Usage:
 *   node apps/backend/subscription-tracker/jobs/sync-xero-subscriptions.js
 *
 * Can be run:
 * - Manually when needed
 * - Weekly via cron to catch new Xero subscriptions
 * - After Xero sync completes
 */

import { createClient } from '@supabase/supabase-js';
import { PaymentPredictor } from '../services/paymentPredictor.js';
import 'dotenv/config';

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

/**
 * Detect subscription frequency from Xero transaction intervals
 */
function detectFrequency(transactions) {
  if (transactions.length < 2) return 'unknown';

  const dates = transactions.map(t => new Date(t.transaction_date)).sort((a, b) => a - b);
  const intervals = [];

  for (let i = 1; i < dates.length; i++) {
    const days = Math.round((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    intervals.push(days);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  if (avgInterval >= 28 && avgInterval <= 31) return 'monthly';
  if (avgInterval >= 85 && avgInterval <= 95) return 'quarterly';
  if (avgInterval >= 360 && avgInterval <= 370) return 'yearly';
  if (avgInterval >= 13 && avgInterval <= 15) return 'biweekly';
  if (avgInterval >= 6 && avgInterval <= 8) return 'weekly';

  return 'unknown';
}

/**
 * Calculate data quality score based on Xero data completeness
 */
function calculateQualityScore(vendor, amount, transactionCount) {
  let score = 0;

  // Has vendor name
  if (vendor && vendor !== 'Unknown') score += 3;

  // Has amount
  if (amount && amount > 0) score += 3;

  // Multiple transactions (establishes pattern)
  if (transactionCount >= 3) score += 2;
  else if (transactionCount >= 2) score += 1;

  // Bonus for well-known vendors
  const knownVendors = ['mighty networks', 'stripe', 'xero', 'google', 'amazon', 'microsoft'];
  if (knownVendors.some(v => vendor.toLowerCase().includes(v))) score += 2;

  return Math.min(score, 10);
}

async function main() {
  console.log('🔄 Starting Xero Subscription Sync...\n');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Step 1: Find missing subscriptions (Xero without emails)
    console.log('📊 FINDING MISSING SUBSCRIPTIONS');
    console.log('═══════════════════════════════════════\n');

    const { data: missing, error: missingError } = await supabase
      .from('missing_subscriptions')
      .select('*')
      .eq('tenant_id', TENANT_ID);

    if (missingError) {
      throw new Error(`Failed to query missing subscriptions: ${missingError.message}`);
    }

    console.log(`Found ${missing.length} Xero subscriptions without email receipts\n`);

    if (missing.length === 0) {
      console.log('✅ All Xero subscriptions already have email records!');
      console.log('Nothing to sync.\n');
      process.exit(0);
    }

    // Group by vendor (multiple transactions per vendor)
    const byVendor = missing.reduce((acc, txn) => {
      if (!acc[txn.vendor]) acc[txn.vendor] = [];
      acc[txn.vendor].push(txn);
      return acc;
    }, {});

    console.log(`Unique vendors: ${Object.keys(byVendor).length}\n`);

    // Step 2: Create email_financial_documents records for each vendor
    console.log('💾 CREATING SUBSCRIPTION RECORDS');
    console.log('═══════════════════════════════════════\n');

    const results = {
      created: 0,
      skipped: 0,
      failed: 0,
      vendors: [],
    };

    for (const [vendor, transactions] of Object.entries(byVendor)) {
      console.log(`Processing: ${vendor} (${transactions.length} Xero transactions)`);

      // Check if we already created a record for this vendor
      const { data: existing } = await supabase
        .from('email_financial_documents')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .eq('vendor', vendor)
        .eq('is_subscription', true)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`  ⏭️  Skipped - already exists in database\n`);
        results.skipped++;
        continue;
      }

      // Sort by date to get latest transaction
      const sorted = transactions.sort((a, b) =>
        new Date(b.transaction_date) - new Date(a.transaction_date)
      );
      const latest = sorted[0];

      // Detect frequency from transaction pattern
      const frequency = detectFrequency(transactions);

      // Calculate quality score
      const qualityScore = calculateQualityScore(
        vendor,
        latest.avg_amount,
        latest.transaction_count
      );

      // Create subscription record
      const record = {
        tenant_id: TENANT_ID,
        vendor: vendor,
        amount: latest.avg_amount,
        currency: 'AUD', // Default to AUD for ACT
        transaction_date: latest.transaction_date,
        subscription_frequency: frequency,
        is_subscription: true,
        account_email: 'unknown@act.place', // Placeholder
        subject: `Xero Subscription: ${vendor}`,
        from_email: 'xero-sync@act.place',
        gmail_message_id: `xero-${vendor.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`, // Placeholder for Xero-sourced
        document_type: 'payment_confirmation', // Xero bank transaction = confirmed payment
        data_quality_score: qualityScore,
        raw_extraction: {
          source: 'xero_bank_transactions',
          transaction_count: latest.transaction_count,
          avg_amount: latest.avg_amount,
          first_transaction: transactions[transactions.length - 1].transaction_date,
          last_transaction: latest.transaction_date,
          bank_account: latest.bank_account_name,
          sync_date: new Date().toISOString(),
        },
      };

      const { data, error } = await supabase
        .from('email_financial_documents')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.log(`  ❌ Failed: ${error.message}\n`);
        results.failed++;
        continue;
      }

      console.log(`  ✅ Created subscription record`);
      console.log(`     Amount: $${latest.avg_amount.toFixed(2)}`);
      console.log(`     Frequency: ${frequency}`);
      console.log(`     Quality Score: ${qualityScore}/10`);
      console.log(`     Transactions: ${latest.transaction_count}\n`);

      results.created++;
      results.vendors.push({
        vendor,
        amount: latest.avg_amount,
        frequency,
        transactions: latest.transaction_count,
      });
    }

    // Step 3: Run payment prediction for newly created subscriptions
    if (results.created > 0) {
      console.log('\n🔮 PREDICTING PAYMENT DATES');
      console.log('═══════════════════════════════════════\n');

      const predictor = new PaymentPredictor(supabase);

      // Note: Payment prediction uses email receipts, not Xero transactions
      // So for Xero-only subscriptions, we need to use Xero data directly
      for (const vendorInfo of results.vendors) {
        // Get all Xero transactions for this vendor
        const { data: xeroTxns } = await supabase
          .from('xero_bank_transactions')
          .select('date, total')
          .eq('tenant_id', TENANT_ID)
          .eq('contact_name', vendorInfo.vendor)
          .eq('type', 'SPEND')
          .order('date', { ascending: true });

        if (!xeroTxns || xeroTxns.length < 2) continue;

        // Calculate next payment date from Xero pattern
        const dates = xeroTxns.map(t => new Date(t.date)).sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < dates.length; i++) {
          const days = Math.round((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
          intervals.push(days);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const lastDate = dates[dates.length - 1];
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

        // Calculate confidence (lower because based on Xero, not emails)
        const stdDev = Math.sqrt(
          intervals.reduce((sum, x) => sum + Math.pow(x - avgInterval, 2), 0) / intervals.length
        );
        const consistency = stdDev < 3 ? 0.8 : Math.max(0.5 - (stdDev / 20), 0.3);
        const confidence = Math.min(consistency * 0.8, 0.7); // Max 70% for Xero-only

        // Update subscription with prediction
        await supabase
          .from('email_financial_documents')
          .update({
            next_payment_date: nextDate.toISOString().split('T')[0],
            last_payment_date: lastDate.toISOString().split('T')[0],
            payment_day_of_month: lastDate.getDate(),
            payment_pattern_confidence: confidence,
          })
          .eq('tenant_id', TENANT_ID)
          .eq('vendor', vendorInfo.vendor)
          .eq('is_subscription', true);

        console.log(`  ${vendorInfo.vendor}:`);
        console.log(`    Next payment: ${nextDate.toISOString().split('T')[0]}`);
        console.log(`    Confidence: ${(confidence * 100).toFixed(0)}%`);
        console.log(`    Pattern: Every ${Math.round(avgInterval)} days\n`);
      }
    }

    // Summary
    console.log('\n\n📊 SYNC SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total Xero subscriptions found: ${missing.length}`);
    console.log(`Unique vendors: ${Object.keys(byVendor).length}`);
    console.log(`✅ Created: ${results.created}`);
    console.log(`⏭️  Skipped: ${results.skipped} (already exist)`);
    console.log(`❌ Failed: ${results.failed}\n`);

    if (results.created > 0) {
      console.log('📋 NEW SUBSCRIPTIONS ADDED:');
      console.log('─'.repeat(70));
      for (const v of results.vendors) {
        console.log(`  • ${v.vendor}: $${v.amount.toFixed(2)}/${v.frequency} (${v.transactions} Xero txns)`);
      }
      console.log('');
    }

    console.log('\n💡 NEXT STEPS');
    console.log('═══════════════════════════════════════');
    console.log('1. Review new subscriptions in dashboard');
    console.log('2. Look for email receipts in other accounts');
    console.log('3. Update account_email when receipts found');
    console.log('4. Run auto-categorization to assign categories');
    console.log('5. Contact vendors to update billing email to accounts@act.place\n');

    console.log('✨ Sync complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the sync
main();
