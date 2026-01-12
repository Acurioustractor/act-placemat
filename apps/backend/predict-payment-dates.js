/**
 * Payment Due Date Prediction Algorithm
 *
 * Analyzes historical receipt patterns to predict next payment dates
 *
 * Logic:
 * 1. Group receipts by vendor
 * 2. Extract transaction_date from each receipt
 * 3. Calculate intervals between consecutive receipts
 * 4. Detect frequency pattern (monthly/quarterly/yearly)
 * 5. Extract payment_day_of_month (e.g., 15th, 1st, last day)
 * 6. Predict next_payment_date = last_payment_date + interval
 * 7. Calculate confidence based on consistency and data points
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './core/src/utils/loadEnv.js';

loadEnv();

const TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📅 PAYMENT DUE DATE PREDICTION');
console.log('='.repeat(80));
console.log('');

// Utility functions
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

function calculateIntervals(dates) {
  const intervals = [];
  for (let i = 1; i < dates.length; i++) {
    const daysDiff = Math.round((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }
  return intervals;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  const avg = mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

function mode(arr) {
  const frequency = {};
  let maxFreq = 0;
  let modeValue = arr[0];

  arr.forEach(val => {
    frequency[val] = (frequency[val] || 0) + 1;
    if (frequency[val] > maxFreq) {
      maxFreq = frequency[val];
      modeValue = val;
    }
  });

  return modeValue;
}

function detectFrequency(avgInterval) {
  if (avgInterval >= 28 && avgInterval <= 31) return 'monthly';
  if (avgInterval >= 88 && avgInterval <= 93) return 'quarterly';
  if (avgInterval >= 360 && avgInterval <= 370) return 'yearly';
  if (avgInterval >= 13 && avgInterval <= 15) return 'weekly'; // biweekly -> weekly (closest match)
  if (avgInterval >= 6 && avgInterval <= 8) return 'weekly';
  if (avgInterval >= 1 && avgInterval <= 2) return 'daily';
  return null; // Don't set if pattern unclear
}

function calculateConfidence(intervals, dataPoints) {
  if (intervals.length === 0) return 0.0;

  const stdDev = standardDeviation(intervals);
  const dataPointScore = Math.min(dataPoints / 5, 1.0); // Max at 5 receipts
  const consistencyScore = stdDev < 3 ? 1.0 : Math.max(1 - (stdDev / 10), 0.3);

  return Math.round(((dataPointScore * 0.4) + (consistencyScore * 0.6)) * 100) / 100;
}

function addDaysToDate(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function predictPaymentDates() {
  console.log('Step 1: Fetching all subscriptions...\\n');

  const { data: subscriptions, error } = await supabase
    .from('email_financial_documents')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .eq('is_subscription', true)
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching subscriptions:', error.message);
    process.exit(1);
  }

  console.log(`✅ Found ${subscriptions.length} subscriptions\\n`);

  console.log('Step 2: Grouping by vendor and analyzing patterns...\\n');

  const byVendor = groupBy(subscriptions, 'vendor');
  let processed = 0;
  let predicted = 0;
  let skipped = 0;

  for (const [vendor, receipts] of Object.entries(byVendor)) {
    processed++;

    // Need at least 2 receipts to detect a pattern
    if (receipts.length < 2) {
      console.log(`[${processed}/${Object.keys(byVendor).length}] ${vendor}: Skipped (only ${receipts.length} receipt)`);
      skipped++;
      continue;
    }

    // Extract and sort dates
    const dates = receipts
      .filter(r => r.transaction_date)
      .map(r => new Date(r.transaction_date))
      .sort((a, b) => a - b);

    if (dates.length < 2) {
      console.log(`[${processed}/${Object.keys(byVendor).length}] ${vendor}: Skipped (missing dates)`);
      skipped++;
      continue;
    }

    // Calculate intervals between consecutive receipts
    const intervals = calculateIntervals(dates);
    const avgInterval = Math.round(mean(intervals));

    // Detect frequency
    const frequency = detectFrequency(avgInterval);

    // Extract payment day pattern (most common day of month)
    const daysOfMonth = dates.map(d => d.getDate());
    const paymentDay = mode(daysOfMonth);

    // Predict next payment date
    const lastDate = dates[dates.length - 1];
    const nextDate = addDaysToDate(lastDate, avgInterval);

    // Calculate confidence
    const confidence = calculateConfidence(intervals, receipts.length);

    console.log(`[${processed}/${Object.keys(byVendor).length}] ${vendor}:`);
    console.log(`  📊 Data points: ${receipts.length} receipts`);
    console.log(`  📅 Last payment: ${lastDate.toISOString().split('T')[0]}`);
    console.log(`  🔄 Frequency: ${frequency} (avg ${avgInterval} days)`);
    console.log(`  📌 Payment day: ${paymentDay}${getDaySuffix(paymentDay)} of month`);
    console.log(`  🎯 Next predicted: ${nextDate.toISOString().split('T')[0]}`);
    console.log(`  ✅ Confidence: ${(confidence * 100).toFixed(0)}%`);

    // Update all receipts for this vendor with the prediction
    const updateData = {
      next_payment_date: nextDate.toISOString().split('T')[0],
      last_payment_date: lastDate.toISOString().split('T')[0],
      payment_day_of_month: paymentDay,
      payment_pattern_confidence: confidence
    };

    // Only set frequency if we detected a valid pattern
    if (frequency !== null) {
      updateData.subscription_frequency = frequency;
    }

    const { error: updateError } = await supabase
      .from('email_financial_documents')
      .update(updateData)
      .eq('vendor', vendor)
      .eq('tenant_id', TENANT_ID)
      .eq('is_subscription', true);

    if (updateError) {
      console.log(`  ❌ Update failed: ${updateError.message}`);
    } else {
      console.log(`  ✅ Updated ${receipts.length} records`);
      predicted++;
    }

    console.log('');
  }

  console.log('='.repeat(80));
  console.log('📊 PREDICTION COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log(`✅ Predicted payment dates for:  ${predicted} vendors`);
  console.log(`⏭️  Skipped (insufficient data):  ${skipped} vendors`);
  console.log(`📈 Success rate:                  ${((predicted / processed) * 100).toFixed(1)}%`);
  console.log('');
  console.log('='.repeat(80));
  console.log('🎯 NEXT STEPS');
  console.log('='.repeat(80));
  console.log('');
  console.log('View payment calendar:');
  console.log('  psql -c "SELECT vendor, next_payment_date, days_until_due, urgency FROM subscription_payment_calendar LIMIT 10;"');
  console.log('');
  console.log('Run reconciliation again:');
  console.log('  node apps/backend/reconcile-direct.js');
  console.log('');
}

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Run the prediction
predictPaymentDates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
