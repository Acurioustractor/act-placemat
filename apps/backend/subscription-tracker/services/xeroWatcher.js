/**
 * Xero Recurring Charge Detector
 *
 * Analyzes Xero bank transactions to:
 * 1. Detect recurring payment patterns (monthly, quarterly, yearly)
 * 2. Find "missing subscriptions" - charges in Xero without email receipts
 * 3. Alert on new recurring charges
 *
 * Algorithm:
 * - Group transactions by vendor (contact_name)
 * - Calculate intervals between consecutive transactions
 * - Detect frequency patterns (28-31 days = monthly, etc.)
 * - Cross-reference with email_financial_documents
 * - Report missing subscriptions
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export class XeroWatcher {
  constructor(supabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Find recurring payment patterns in Xero bank transactions
   *
   * @param {string} tenantId - Tenant ID to analyze
   * @param {number} lookbackMonths - How many months to analyze (default: 12)
   * @returns {Promise<Object[]>} Recurring charges found
   */
  async findRecurringCharges(tenantId, lookbackMonths = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - lookbackMonths);

    console.log(`🔍 Analyzing Xero transactions since ${startDate.toISOString().split('T')[0]}...`);

    // Fetch all SPEND transactions from past N months
    const { data: transactions, error } = await this.supabase
      .from('xero_bank_transactions')
      .select('*')
      .eq('type', 'SPEND')
      .gte('date', startDate.toISOString())
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch Xero transactions: ${error.message}`);
    }

    console.log(`   Found ${transactions.length} SPEND transactions`);

    // Group by vendor (contact_name)
    const byVendor = this.groupBy(transactions, 'contact_name');

    const recurring = [];

    for (const [vendor, txns] of Object.entries(byVendor)) {
      if (txns.length < 2) continue; // Need at least 2 transactions to detect pattern

      const pattern = this.analyzePattern(txns);

      if (pattern.isRecurring) {
        // Check if we have email subscription for this vendor
        const hasEmailSubscription = await this.checkEmailSubscription(
          tenantId,
          vendor,
          pattern.averageAmount
        );

        recurring.push({
          vendor,
          transactionCount: txns.length,
          averageAmount: pattern.averageAmount,
          frequency: pattern.frequency,
          intervalDays: pattern.averageInterval,
          intervalStdDev: pattern.stdDev,
          lastTransaction: txns[0].date,
          hasEmailSubscription,
          source: hasEmailSubscription ? 'both' : 'xero_only',
          confidence: pattern.confidence,
          transactions: txns.slice(0, 5).map(t => ({ // Last 5 transactions
            date: t.date,
            amount: t.amount,
          })),
        });
      }
    }

    return recurring.sort((a, b) => b.averageAmount - a.averageAmount);
  }

  /**
   * Analyze transaction pattern for a vendor
   *
   * @param {Object[]} transactions - Transactions for one vendor
   * @returns {Object} Pattern analysis
   */
  analyzePattern(transactions) {
    // Sort by date ascending
    const sorted = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate intervals between consecutive transactions
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      const days = this.daysBetween(sorted[i - 1].date, sorted[i].date);
      intervals.push(days);
    }

    const avgInterval = this.mean(intervals);
    const stdDev = this.standardDeviation(intervals);

    // Detect frequency based on average interval
    let frequency = 'unknown';
    let isRecurring = false;

    if (avgInterval >= 28 && avgInterval <= 31) {
      frequency = 'monthly';
      isRecurring = stdDev < 5; // Monthly should be very consistent
    } else if (avgInterval >= 88 && avgInterval <= 93) {
      frequency = 'quarterly';
      isRecurring = stdDev < 7;
    } else if (avgInterval >= 360 && avgInterval <= 370) {
      frequency = 'yearly';
      isRecurring = stdDev < 10;
    }

    // Calculate average amount
    const amounts = transactions.map(t => Math.abs(t.amount));
    const avgAmount = this.mean(amounts);
    const amountStdDev = this.standardDeviation(amounts);

    // Confidence score (0-1)
    const confidence = this.calculateConfidence(
      intervals.length,
      stdDev,
      amountStdDev / avgAmount
    );

    return {
      isRecurring,
      frequency,
      averageInterval: Math.round(avgInterval),
      averageAmount: Math.round(avgAmount * 100) / 100,
      stdDev: Math.round(stdDev * 10) / 10,
      confidence,
    };
  }

  /**
   * Check if vendor has email subscription
   *
   * @param {string} tenantId - Tenant ID
   * @param {string} vendor - Vendor name
   * @param {number} amount - Expected amount
   * @returns {Promise<boolean>} True if email subscription exists
   */
  async checkEmailSubscription(tenantId, vendor, amount) {
    const { data } = await this.supabase
      .from('email_financial_documents')
      .select('id, vendor, amount')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .ilike('vendor', `%${vendor}%`)
      .limit(1);

    if (!data || data.length === 0) {
      return false;
    }

    // If amounts match within 10%, consider it a match
    if (data[0].amount) {
      const diff = Math.abs(data[0].amount - amount);
      const percentDiff = (diff / amount) * 100;
      return percentDiff < 10;
    }

    return true; // Vendor matches, even if amount is missing
  }

  /**
   * Run daily check for new recurring charges
   *
   * Returns missing subscriptions that should be alerted
   *
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object[]>} Missing subscriptions
   */
  async runDailyCheck(tenantId) {
    console.log('\n📊 XERO RECURRING CHARGE ANALYSIS');
    console.log('═══════════════════════════════════════\n');

    const recurring = await this.findRecurringCharges(tenantId);

    // Filter for high-confidence missing subscriptions
    const missing = recurring.filter(r =>
      !r.hasEmailSubscription && r.confidence > 0.7
    );

    console.log(`Found ${recurring.length} total recurring charges`);
    console.log(`Missing ${missing.length} email subscriptions\n`);

    if (missing.length > 0) {
      console.log('🔍 Missing Subscriptions (in Xero but not in email):');
      console.log('─'.repeat(70));

      for (const sub of missing) {
        console.log(`\n  📦 ${sub.vendor}`);
        console.log(`     Amount: $${sub.averageAmount} (${sub.frequency})`);
        console.log(`     Interval: ${sub.intervalDays} days (±${sub.intervalStdDev})`);
        console.log(`     Confidence: ${(sub.confidence * 100).toFixed(0)}%`);
        console.log(`     Last charge: ${sub.lastTransaction}`);
        console.log(`     Transactions: ${sub.transactionCount}`);
      }

      console.log('\n');
    }

    // Also show subscriptions that ARE tracked
    const tracked = recurring.filter(r => r.hasEmailSubscription);

    if (tracked.length > 0) {
      console.log(`✅ Tracked Subscriptions (${tracked.length}):`);
      console.log('─'.repeat(70));

      for (const sub of tracked.slice(0, 10)) {
        console.log(`   • ${sub.vendor} - $${sub.averageAmount}/${sub.frequency}`);
      }

      if (tracked.length > 10) {
        console.log(`   ... and ${tracked.length - 10} more`);
      }

      console.log('\n');
    }

    return { missing, tracked, total: recurring };
  }

  /**
   * Calculate confidence score for recurring pattern
   *
   * @param {number} dataPoints - Number of intervals
   * @param {number} intervalStdDev - Standard deviation of intervals
   * @param {number} amountVariation - Amount variation (stdDev / mean)
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(dataPoints, intervalStdDev, amountVariation) {
    // More data points = higher confidence (max at 6 transactions)
    const dataScore = Math.min(dataPoints / 6, 1.0);

    // Lower std dev = higher confidence (3 days = perfect, 10 days = bad)
    const consistencyScore = Math.max(1 - (intervalStdDev / 10), 0.3);

    // Lower amount variation = higher confidence
    const amountScore = Math.max(1 - amountVariation, 0.5);

    // Weighted average
    return (dataScore * 0.3) + (consistencyScore * 0.5) + (amountScore * 0.2);
  }

  // Utility functions

  groupBy(array, key) {
    return array.reduce((acc, obj) => {
      const groupKey = obj[key];
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(obj);
      return acc;
    }, {});
  }

  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffMs = d2 - d1;
    return diffMs / (1000 * 60 * 60 * 24);
  }

  mean(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  standardDeviation(numbers) {
    if (numbers.length === 0) return 0;
    const avg = this.mean(numbers);
    const squaredDiffs = numbers.map(n => Math.pow(n - avg, 2));
    const variance = this.mean(squaredDiffs);
    return Math.sqrt(variance);
  }
}

export default XeroWatcher;
