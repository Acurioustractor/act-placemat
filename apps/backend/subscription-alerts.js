/**
 * Subscription Alert System
 *
 * Runs daily to check for:
 * 1. Payment due reminders (7 days, 1 day, overdue)
 * 2. Unused subscriptions (no Xero activity in 90 days)
 * 3. Cost anomalies (charge >20% higher than usual)
 * 4. Missing subscriptions (Xero transactions without email receipts)
 *
 * Usage:
 *   node apps/backend/subscription-alerts.js
 *   node apps/backend/subscription-alerts.js --tenant-id=xxx
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

let notificationBus = null;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZG5sdXdmbGZoeHl1Y2d3aWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDYyMjksImV4cCI6MjA2NzkyMjIyOX0.PG0iGZQR2d8yo4y3q1e2tEIMa3J0AdFkI1Q6P7IDgrg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Default tenant ID (ACT Placemat)
const DEFAULT_TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';

// Alert thresholds
const UNUSED_SUBSCRIPTION_DAYS = 90;
const COST_ANOMALY_THRESHOLD = 0.20; // 20% increase

// ============================================================================
// Alert Type 1: Payment Due Reminders
// ============================================================================

async function checkPaymentDueReminders(tenantId) {
  console.log('[Payment Reminders] Checking for due payments...');

  const { data, error } = await supabase
    .from('subscription_payment_calendar')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('urgency', ['overdue', 'due_today', 'due_soon']);

  if (error) {
    console.error('[Payment Reminders] Error:', error);
    return [];
  }

  const alerts = [];

  for (const payment of data || []) {
    let alertTitle, alertMessage, alertPriority;

    if (payment.urgency === 'overdue') {
      alertTitle = `🚨 OVERDUE Payment: ${payment.vendor}`;
      alertMessage = `Payment of $${payment.amount?.toFixed(2)} to ${payment.vendor} is OVERDUE by ${Math.abs(payment.days_until_due)} days!\n\n` +
        `Account: ${payment.account_email}\n` +
        `Due date: ${new Date(payment.next_payment_date).toLocaleDateString()}\n` +
        `Frequency: ${payment.subscription_frequency || 'unknown'}`;
      alertPriority = 'critical';
    } else if (payment.urgency === 'due_today') {
      alertTitle = `⚠️ Payment Due TODAY: ${payment.vendor}`;
      alertMessage = `Payment of $${payment.amount?.toFixed(2)} to ${payment.vendor} is due TODAY!\n\n` +
        `Account: ${payment.account_email}\n` +
        `Frequency: ${payment.subscription_frequency || 'unknown'}`;
      alertPriority = 'high';
    } else if (payment.urgency === 'due_soon') {
      alertTitle = `📅 Payment Due Soon: ${payment.vendor}`;
      alertMessage = `Payment of $${payment.amount?.toFixed(2)} to ${payment.vendor} is due in ${payment.days_until_due} days.\n\n` +
        `Account: ${payment.account_email}\n` +
        `Due date: ${new Date(payment.next_payment_date).toLocaleDateString()}\n` +
        `Confidence: ${(payment.payment_pattern_confidence * 100).toFixed(0)}%`;
      alertPriority = 'medium';
    }

    alerts.push({
      type: 'payment_reminder',
      priority: alertPriority,
      title: alertTitle,
      message: alertMessage,
      metadata: {
        subscriptionId: payment.id,
        vendor: payment.vendor,
        amount: payment.amount,
        dueDate: payment.next_payment_date,
        urgency: payment.urgency,
      },
    });
  }

  console.log(`[Payment Reminders] Found ${alerts.length} alerts (${data?.length || 0} payments checked)`);
  return alerts;
}

// ============================================================================
// Alert Type 2: Unused Subscriptions
// ============================================================================

async function checkUnusedSubscriptions(tenantId) {
  console.log('[Unused Subscriptions] Checking for inactive subscriptions...');

  // Find subscriptions with last_payment_date older than 90 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - UNUSED_SUBSCRIPTION_DAYS);

  const { data, error } = await supabase
    .from('email_financial_documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_subscription', true)
    .lt('last_payment_date', cutoffDate.toISOString().split('T')[0]);

  if (error) {
    console.error('[Unused Subscriptions] Error:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('[Unused Subscriptions] No unused subscriptions found');
    return [];
  }

  // Calculate total potential savings
  const totalMonthlyCost = data.reduce((sum, sub) => {
    const monthly = sub.subscription_frequency === 'monthly'
      ? sub.amount || 0
      : sub.subscription_frequency === 'quarterly'
      ? (sub.amount || 0) / 3
      : sub.subscription_frequency === 'yearly'
      ? (sub.amount || 0) / 12
      : 0;
    return sum + monthly;
  }, 0);

  const vendorList = data
    .map(sub => `• ${sub.vendor} ($${(sub.amount || 0).toFixed(2)}/${sub.subscription_frequency || 'unknown'}) - Last payment: ${new Date(sub.last_payment_date).toLocaleDateString()}`)
    .join('\n');

  const alert = {
    type: 'unused_subscriptions',
    priority: 'medium',
    title: `🔕 ${data.length} Potentially Unused Subscriptions Detected`,
    message: `Found ${data.length} subscriptions with no activity in the past ${UNUSED_SUBSCRIPTION_DAYS} days:\n\n` +
      vendorList +
      `\n\n💰 Potential monthly savings: $${totalMonthlyCost.toFixed(2)}\n` +
      `💰 Potential annual savings: $${(totalMonthlyCost * 12).toFixed(2)}`,
    metadata: {
      subscriptionCount: data.length,
      totalMonthlySavings: totalMonthlyCost,
      totalAnnualSavings: totalMonthlyCost * 12,
      vendors: data.map(s => s.vendor),
    },
  };

  console.log(`[Unused Subscriptions] Found ${data.length} unused subscriptions (potential savings: $${totalMonthlyCost.toFixed(2)}/mo)`);
  return [alert];
}

// ============================================================================
// Alert Type 3: Cost Anomalies
// ============================================================================

async function checkCostAnomalies(tenantId) {
  console.log('[Cost Anomalies] Checking for unusual charges...');

  const { data, error } = await supabase
    .from('email_financial_documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_subscription', true)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('[Cost Anomalies] Error:', error);
    return [];
  }

  // Group by vendor and analyze amounts
  const byVendor = {};
  for (const sub of data || []) {
    if (!byVendor[sub.vendor]) {
      byVendor[sub.vendor] = [];
    }
    byVendor[sub.vendor].push({
      amount: sub.amount || 0,
      date: sub.transaction_date,
      id: sub.id,
    });
  }

  const alerts = [];

  for (const [vendor, transactions] of Object.entries(byVendor)) {
    if (transactions.length < 3) continue; // Need at least 3 data points

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const latest = transactions[0];
    const historical = transactions.slice(1, 6); // Last 5 historical transactions

    // Calculate average of historical amounts
    const avgHistorical = historical.reduce((sum, t) => sum + t.amount, 0) / historical.length;

    // Check if latest is significantly higher
    if (avgHistorical > 0) {
      const percentIncrease = ((latest.amount - avgHistorical) / avgHistorical) * 100;

      if (percentIncrease > (COST_ANOMALY_THRESHOLD * 100)) {
        alerts.push({
          type: 'cost_anomaly',
          priority: 'high',
          title: `⚠️ Cost Anomaly Detected: ${vendor}`,
          message: `${vendor} charged $${latest.amount.toFixed(2)}, which is ${percentIncrease.toFixed(1)}% higher than the usual $${avgHistorical.toFixed(2)}.\n\n` +
            `Latest charge: $${latest.amount.toFixed(2)} (${new Date(latest.date).toLocaleDateString()})\n` +
            `Historical average: $${avgHistorical.toFixed(2)}\n` +
            `Increase: +$${(latest.amount - avgHistorical).toFixed(2)} (+${percentIncrease.toFixed(1)}%)\n\n` +
            `This may indicate a plan change, price increase, or billing error.`,
          metadata: {
            subscriptionId: latest.id,
            vendor,
            latestAmount: latest.amount,
            historicalAverage: avgHistorical,
            percentIncrease: percentIncrease,
            difference: latest.amount - avgHistorical,
          },
        });
      }
    }
  }

  console.log(`[Cost Anomalies] Found ${alerts.length} anomalies (${Object.keys(byVendor).length} vendors checked)`);
  return alerts;
}

// ============================================================================
// Alert Type 4: Missing Subscriptions
// ============================================================================

async function checkMissingSubscriptions(tenantId) {
  console.log('[Missing Subscriptions] Checking for Xero transactions without email receipts...');

  // Query Xero transactions
  const { data: xeroTransactions, error: xeroError } = await supabase
    .from('xero_bank_transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('type', 'SPEND')
    .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 90 days
    .order('date', { ascending: false });

  if (xeroError) {
    console.error('[Missing Subscriptions] Xero query error:', xeroError);
    return [];
  }

  if (!xeroTransactions || xeroTransactions.length === 0) {
    console.log('[Missing Subscriptions] No Xero transactions found');
    return [];
  }

  // Query email subscriptions
  const { data: emailSubs, error: emailError } = await supabase
    .from('email_financial_documents')
    .select('vendor, amount')
    .eq('tenant_id', tenantId)
    .eq('is_subscription', true);

  if (emailError) {
    console.error('[Missing Subscriptions] Email query error:', emailError);
    return [];
  }

  // Find Xero transactions without matching email receipts
  const missing = [];

  for (const txn of xeroTransactions) {
    // Check if there's a matching email subscription
    const hasMatch = emailSubs?.some(sub => {
      const vendorMatch = sub.vendor.toLowerCase().includes(txn.contact_name.toLowerCase()) ||
                         txn.contact_name.toLowerCase().includes(sub.vendor.toLowerCase());
      const amountMatch = Math.abs((sub.amount || 0) - Math.abs(txn.amount)) < (Math.abs(txn.amount) * 0.10); // 10% tolerance
      return vendorMatch && amountMatch;
    });

    if (!hasMatch && Math.abs(txn.amount) > 10) { // Only flag transactions > $10
      missing.push({
        vendor: txn.contact_name,
        amount: Math.abs(txn.amount),
        date: txn.date,
        reference: txn.reference,
        bankAccount: txn.bank_account_name,
      });
    }
  }

  if (missing.length === 0) {
    console.log('[Missing Subscriptions] No missing subscriptions found');
    return [];
  }

  // Group by vendor and take unique ones
  const uniqueVendors = [...new Map(missing.map(item => [item.vendor, item])).values()];

  const vendorList = uniqueVendors.slice(0, 10) // Top 10
    .map(m => `• ${m.vendor}: $${m.amount.toFixed(2)} (${new Date(m.date).toLocaleDateString()})`)
    .join('\n');

  const alert = {
    type: 'missing_subscriptions',
    priority: 'medium',
    title: `🔍 ${uniqueVendors.length} Missing Subscriptions Found`,
    message: `Found ${uniqueVendors.length} Xero transactions without corresponding email receipts:\n\n` +
      vendorList +
      (uniqueVendors.length > 10 ? `\n...and ${uniqueVendors.length - 10} more` : '') +
      `\n\nThese may be subscriptions billed directly to your bank account without email receipts, or the vendor name may differ between Xero and email.`,
    metadata: {
      missingCount: uniqueVendors.length,
      vendors: uniqueVendors.map(v => v.vendor),
    },
  };

  console.log(`[Missing Subscriptions] Found ${uniqueVendors.length} transactions without email receipts`);
  return [alert];
}

// ============================================================================
// Main Alert Runner
// ============================================================================

async function runSubscriptionAlerts(tenantId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔔 SUBSCRIPTION ALERT SYSTEM - ${new Date().toLocaleString()}`);
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Run all alert checks in parallel
    const [
      paymentAlerts,
      unusedAlerts,
      anomalyAlerts,
      missingAlerts,
    ] = await Promise.all([
      checkPaymentDueReminders(tenantId),
      checkUnusedSubscriptions(tenantId),
      checkCostAnomalies(tenantId),
      checkMissingSubscriptions(tenantId),
    ]);

    // Combine all alerts
    const allAlerts = [
      ...paymentAlerts,
      ...unusedAlerts,
      ...anomalyAlerts,
      ...missingAlerts,
    ];

    // Send alerts via notification bus
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ALERT SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Payment Reminders: ${paymentAlerts.length}`);
    console.log(`Unused Subscriptions: ${unusedAlerts.length}`);
    console.log(`Cost Anomalies: ${anomalyAlerts.length}`);
    console.log(`Missing Subscriptions: ${missingAlerts.length}`);
    console.log(`TOTAL ALERTS: ${allAlerts.length}`);
    console.log(`${'='.repeat(60)}\n`);

    if (allAlerts.length === 0) {
      console.log('✅ No alerts to send - all subscriptions are in good standing!\n');
      return { success: true, alertCount: 0 };
    }

    // Send daily digest
    await sendDailyDigest(allAlerts, tenantId);

    // Send individual critical alerts
    const criticalAlerts = allAlerts.filter(a => a.priority === 'critical');
    for (const alert of criticalAlerts) {
      await sendAlert(alert);
    }

    console.log(`✅ Alert system completed successfully\n`);
    return { success: true, alertCount: allAlerts.length };

  } catch (error) {
    console.error('\n❌ Alert system error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Notification Sending
// ============================================================================

async function sendDailyDigest(alerts, tenantId) {
  console.log('[Notifications] Sending daily digest...');

  // Group alerts by priority
  const byPriority = {
    critical: alerts.filter(a => a.priority === 'critical'),
    high: alerts.filter(a => a.priority === 'high'),
    medium: alerts.filter(a => a.priority === 'medium'),
  };

  const digestMessage = `📊 **Subscription Management Daily Digest**\n\n` +
    `**Summary:**\n` +
    `🚨 Critical: ${byPriority.critical.length}\n` +
    `⚠️ High: ${byPriority.high.length}\n` +
    `ℹ️ Medium: ${byPriority.medium.length}\n\n` +
    `**Alerts:**\n\n` +
    alerts.map(a => `${a.priority === 'critical' ? '🚨' : a.priority === 'high' ? '⚠️' : 'ℹ️'} ${a.title}`).join('\n');

  if (notificationBus) {
    try {
      await notificationBus.sendNotification({
        channel: 'slack',
        type: 'daily_digest',
        title: '📊 Subscription Management Daily Digest',
        message: digestMessage,
        actions: [
          { text: 'View Dashboard', url: '/dashboard?tab=subscriptions' }
        ]
      });
      console.log('[Notifications] Daily digest sent successfully');
    } catch (error) {
      console.error('[Notifications] Failed to send daily digest:', error.message);
    }
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DAILY DIGEST (Console Output)');
    console.log('='.repeat(60));
    console.log(digestMessage);
    console.log('='.repeat(60) + '\n');
  }
}

async function sendAlert(alert) {
  console.log(`[Notifications] Sending individual alert: ${alert.title}`);

  if (notificationBus) {
    try {
      await notificationBus.sendNotification({
        channel: 'slack',
        type: alert.type,
        title: alert.title,
        message: alert.message,
        metadata: alert.metadata
      });
      console.log(`[Notifications] Alert sent: ${alert.title}`);
    } catch (error) {
      console.error(`[Notifications] Failed to send alert: ${error.message}`);
    }
  } else {
    console.log('\n' + '-'.repeat(60));
    console.log(`🚨 ${alert.title}`);
    console.log('-'.repeat(60));
    console.log(alert.message);
    console.log('-'.repeat(60) + '\n');
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  // Try to load notification bus
  try {
    const { getNotificationBus } = await import('./core/src/services/notificationBus.js');
    notificationBus = getNotificationBus();
    console.log('[Notification Bus] Loaded successfully');
  } catch (error) {
    console.log('[Notification Bus] Not available, will log alerts to console only');
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const tenantIdArg = args.find(arg => arg.startsWith('--tenant-id='));
  const tenantId = tenantIdArg ? tenantIdArg.split('=')[1] : DEFAULT_TENANT_ID;

  await runSubscriptionAlerts(tenantId);
  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for use in other modules
export { runSubscriptionAlerts };
