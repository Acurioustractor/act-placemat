#!/usr/bin/env node
/**
 * Predict Payment Dates - Analyze Historical Patterns
 *
 * Analyzes historical receipt patterns to predict when subscriptions will renew.
 * Updates next_payment_date for all subscriptions with sufficient data.
 *
 * Usage:
 *   node apps/backend/subscription-tracker/jobs/predict-payments.js
 *
 * Can be run:
 * - Manually when needed
 * - Weekly via cron to update predictions as new data arrives
 * - After enrichment jobs complete
 */

import { PaymentPredictor } from '../services/paymentPredictor.js';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

async function main() {
  console.log('🔮 Starting Payment Prediction...\n');
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const predictor = new PaymentPredictor(supabase);

  try {
    // Run prediction
    console.log('📊 ANALYZING PAYMENT PATTERNS');
    console.log('═══════════════════════════════════════\n');

    const results = await predictor.predictAllPayments(TENANT_ID);

    // Print results
    console.log('\n\n📊 PREDICTION RESULTS');
    console.log('═══════════════════════════════════════');
    console.log(`Total vendors analyzed: ${results.total}`);
    console.log(`✅ Predictions made: ${results.predicted}`);
    console.log(`⏭️  Skipped (insufficient data): ${results.skipped}`);
    console.log(`💾 Database updated: ${results.updated}`);

    // Show top predictions by confidence
    console.log('\n\n🎯 TOP PREDICTIONS (High Confidence)');
    console.log('═══════════════════════════════════════\n');

    const highConfidence = Object.entries(results.byVendor)
      .filter(([_, pattern]) => pattern.confidence >= 0.7)
      .sort((a, b) => b[1].confidence - a[1].confidence)
      .slice(0, 15);

    if (highConfidence.length > 0) {
      for (const [vendor, pattern] of highConfidence) {
        console.log(`${vendor}`);
        console.log('─'.repeat(70));
        console.log(`  Next payment: ${pattern.nextPaymentDate}`);
        console.log(`  Frequency: ${pattern.frequency} (every ~${pattern.stats.avgInterval} days)`);
        console.log(`  Payment day: ${pattern.paymentDayOfMonth}th of month`);
        console.log(`  Confidence: ${(pattern.confidence * 100).toFixed(0)}%`);
        console.log(`  Data: ${pattern.stats.receiptCount} receipts (std dev: ${pattern.stats.stdDev} days)`);
        console.log('');
      }
    } else {
      console.log('  No high-confidence predictions found.');
      console.log('  (Need more receipts to establish patterns)\n');
    }

    // Show frequency breakdown
    console.log('\n📈 FREQUENCY BREAKDOWN');
    console.log('═══════════════════════════════════════\n');

    const byFrequency = Object.values(results.byVendor).reduce((acc, pattern) => {
      const freq = pattern.frequency || 'unknown';
      if (!acc[freq]) acc[freq] = { count: 0, avgConfidence: [] };
      acc[freq].count++;
      acc[freq].avgConfidence.push(pattern.confidence);
      return acc;
    }, {});

    for (const [freq, stats] of Object.entries(byFrequency)) {
      const avgConf = stats.avgConfidence.reduce((a, b) => a + b, 0) / stats.avgConfidence.length;
      console.log(`  ${freq.padEnd(15)} ${stats.count} subscriptions (avg confidence: ${(avgConf * 100).toFixed(0)}%)`);
    }

    // Get payment calendar summary
    console.log('\n\n📅 UPCOMING PAYMENTS (Next 30 Days)');
    console.log('═══════════════════════════════════════\n');

    const summary = await predictor.getPredictionSummary(TENANT_ID);

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcoming = summary.filter(s => {
      const paymentDate = new Date(s.next_payment_date);
      return paymentDate >= today && paymentDate <= thirtyDaysFromNow;
    });

    if (upcoming.length > 0) {
      for (const payment of upcoming.slice(0, 10)) {
        const paymentDate = new Date(payment.next_payment_date);
        const daysUntil = Math.ceil((paymentDate - today) / (1000 * 60 * 60 * 24));

        console.log(`  ${payment.vendor.padEnd(30)} ${payment.next_payment_date} (${daysUntil} days)`);
      }

      if (upcoming.length > 10) {
        console.log(`  ... and ${upcoming.length - 10} more\n`);
      }
    } else {
      console.log('  No payments predicted in the next 30 days.\n');
    }

    // Coverage metrics
    console.log('\n💡 COVERAGE METRICS');
    console.log('═══════════════════════════════════════');

    const totalSubs = results.total;
    const withPredictions = results.predicted;
    const coverage = (withPredictions / totalSubs) * 100;

    console.log(`\nPrediction coverage: ${withPredictions}/${totalSubs} vendors (${coverage.toFixed(1)}%)`);
    console.log(`\nTo improve coverage:`);
    console.log(`  • Run enrichment jobs to add more receipts`);
    console.log(`  • Wait for more billing cycles (need 2+ receipts per vendor)`);
    console.log(`  • Use Xero data to backfill missing dates\n`);

    console.log('\n✨ Prediction complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the job
main();
