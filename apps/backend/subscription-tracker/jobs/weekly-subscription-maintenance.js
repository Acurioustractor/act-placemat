#!/usr/bin/env node
/**
 * Weekly Subscription Maintenance Job
 *
 * Runs a complete maintenance cycle for the subscription intelligence system:
 * 1. Sync new subscriptions from Xero
 * 2. Categorize any uncategorized subscriptions
 * 3. Predict payment dates for all subscriptions
 * 4. Generate weekly summary report
 *
 * Usage:
 *   node apps/backend/subscription-tracker/jobs/weekly-subscription-maintenance.js
 *
 * Recommended Schedule:
 *   Every Monday at 9:00 AM
 *   Cron: 0 9 * * 1 node /path/to/weekly-subscription-maintenance.js
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

async function runJob(jobPath, jobName) {
  console.log(`\n🔄 Running: ${jobName}`);
  console.log('═'.repeat(70));

  try {
    const output = execSync(`node ${jobPath}`, {
      cwd: '/Users/benknight/Code/ACT Placemat',
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    console.log(output);
    return { success: true, jobName };
  } catch (error) {
    console.error(`❌ Failed: ${jobName}`);
    console.error(error.message);
    return { success: false, jobName, error: error.message };
  }
}

async function generateWeeklySummary(supabase) {
  console.log('\n📊 WEEKLY SUMMARY REPORT');
  console.log('═'.repeat(70));
  console.log(`Generated: ${new Date().toISOString()}\n`);

  // Total subscriptions
  const { data: total } = await supabase
    .from('email_financial_documents')
    .select('id', { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .eq('is_subscription', true);

  console.log(`📈 Total Subscriptions: ${total?.length || 0}`);

  // Breakdown by source
  const { data: bySource } = await supabase
    .from('email_financial_documents')
    .select('from_email')
    .eq('tenant_id', TENANT_ID)
    .eq('is_subscription', true);

  const xeroCount = bySource?.filter(s => s.from_email === 'xero-sync@act.place').length || 0;
  const emailCount = (bySource?.length || 0) - xeroCount;

  console.log(`   • Email-based: ${emailCount} (${((emailCount / (bySource?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`   • Xero-sourced: ${xeroCount} (${((xeroCount / (bySource?.length || 1)) * 100).toFixed(1)}%)\n`);

  // Cost breakdown
  const { data: costs } = await supabase
    .from('email_financial_documents')
    .select('category, amount, subscription_frequency')
    .eq('tenant_id', TENANT_ID)
    .eq('is_subscription', true);

  const totalMonthly = costs?.reduce((sum, sub) => {
    if (!sub.amount) return sum;
    if (sub.subscription_frequency === 'monthly') return sum + sub.amount;
    if (sub.subscription_frequency === 'yearly') return sum + (sub.amount / 12);
    if (sub.subscription_frequency === 'quarterly') return sum + (sub.amount / 3);
    return sum;
  }, 0) || 0;

  console.log(`💰 Estimated Monthly Cost: $${totalMonthly.toFixed(2)}`);
  console.log(`💰 Estimated Annual Cost: $${(totalMonthly * 12).toFixed(2)}\n`);

  // Category breakdown
  const byCategory = costs?.reduce((acc, sub) => {
    const cat = sub.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = { count: 0, cost: 0 };
    acc[cat].count++;
    if (sub.amount && sub.subscription_frequency === 'monthly') {
      acc[cat].cost += sub.amount;
    }
    return acc;
  }, {});

  console.log('📦 By Category:');
  Object.entries(byCategory || {})
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .forEach(([cat, data]) => {
      console.log(`   • ${cat}: ${data.count} subscriptions ($${data.cost.toFixed(2)}/mo)`);
    });

  // Upcoming payments (next 30 days)
  const { data: upcoming } = await supabase
    .from('email_financial_documents')
    .select('vendor, next_payment_date, amount')
    .eq('tenant_id', TENANT_ID)
    .eq('is_subscription', true)
    .not('next_payment_date', 'is', null)
    .gte('next_payment_date', new Date().toISOString().split('T')[0])
    .lte('next_payment_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('next_payment_date', { ascending: true });

  console.log(`\n📅 Upcoming Payments (Next 30 Days): ${upcoming?.length || 0}`);
  if (upcoming && upcoming.length > 0) {
    upcoming.slice(0, 10).forEach(payment => {
      console.log(`   • ${payment.next_payment_date}: ${payment.vendor} - $${payment.amount || '??'}`);
    });
    if (upcoming.length > 10) {
      console.log(`   ... and ${upcoming.length - 10} more`);
    }
  }

  // Missing amounts
  const { data: missing } = await supabase
    .from('email_financial_documents')
    .select('vendor', { count: 'exact' })
    .eq('tenant_id', TENANT_ID)
    .eq('is_subscription', true)
    .or('amount.is.null,amount.eq.0');

  console.log(`\n⚠️  Missing Amounts: ${missing?.length || 0} subscriptions`);

  // Data quality
  const { data: quality } = await supabase
    .from('email_financial_documents')
    .select('data_quality_score')
    .eq('tenant_id', TENANT_ID)
    .eq('is_subscription', true);

  const avgQuality = quality?.reduce((sum, q) => sum + (q.data_quality_score || 0), 0) / (quality?.length || 1);
  const highQuality = quality?.filter(q => q.data_quality_score >= 7).length || 0;

  console.log(`\n📊 Data Quality:`);
  console.log(`   • Average Score: ${avgQuality.toFixed(1)}/10`);
  console.log(`   • High Quality (≥7): ${highQuality}/${quality?.length || 0} (${((highQuality / (quality?.length || 1)) * 100).toFixed(1)}%)`);

  console.log('\n' + '═'.repeat(70));
  console.log('✨ Weekly maintenance complete!\n');
}

async function main() {
  console.log('🔧 WEEKLY SUBSCRIPTION MAINTENANCE');
  console.log('═'.repeat(70));
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results = [];

  // Step 1: Sync Xero subscriptions
  const xeroSync = await runJob(
    'apps/backend/subscription-tracker/jobs/sync-xero-subscriptions.js',
    'Xero Subscription Sync'
  );
  results.push(xeroSync);

  // Step 2: Auto-categorize
  const categorize = await runJob(
    'apps/backend/subscription-tracker/jobs/auto-categorize.js',
    'Auto-Categorization'
  );
  results.push(categorize);

  // Step 3: Predict payments
  const predict = await runJob(
    'apps/backend/subscription-tracker/jobs/predict-payments.js',
    'Payment Prediction'
  );
  results.push(predict);

  // Step 4: Generate summary
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  await generateWeeklySummary(supabase);

  // Final results
  console.log('\n📋 JOB RESULTS');
  console.log('═'.repeat(70));
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.jobName}`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const allSuccess = results.every(r => r.success);
  console.log('\n' + '═'.repeat(70));
  console.log(allSuccess ? '✅ All jobs completed successfully!' : '⚠️  Some jobs failed - check logs');

  process.exit(allSuccess ? 0 : 1);
}

// Run maintenance
main();
