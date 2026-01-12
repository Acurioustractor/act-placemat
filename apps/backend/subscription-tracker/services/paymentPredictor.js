/**
 * Payment Predictor - Predict Next Payment Dates
 *
 * Analyzes historical receipt patterns to predict when subscriptions will renew.
 * Uses statistical analysis of transaction intervals to detect:
 * - Monthly patterns (28-31 days)
 * - Quarterly patterns (88-93 days)
 * - Yearly patterns (360-370 days)
 * - Payment day of month (e.g., always on the 15th)
 *
 * Confidence scoring based on:
 * - Data consistency (low standard deviation = high confidence)
 * - Number of data points (more receipts = higher confidence)
 * - Pattern regularity (consistent day of month = higher confidence)
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export class PaymentPredictor {
  constructor(supabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Calculate mean of an array
   */
  mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Calculate standard deviation
   */
  standardDeviation(arr) {
    const avg = this.mean(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  /**
   * Calculate mode (most common value)
   */
  mode(arr) {
    const counts = arr.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});

    let maxCount = 0;
    let modeValue = arr[0];

    for (const [val, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        modeValue = parseInt(val);
      }
    }

    return modeValue;
  }

  /**
   * Calculate days between two dates
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Detect frequency pattern from intervals
   */
  detectFrequency(avgInterval) {
    if (avgInterval >= 28 && avgInterval <= 31) return 'monthly';
    if (avgInterval >= 85 && avgInterval <= 95) return 'quarterly';
    if (avgInterval >= 360 && avgInterval <= 370) return 'yearly';
    if (avgInterval >= 13 && avgInterval <= 15) return 'biweekly';
    if (avgInterval >= 6 && avgInterval <= 8) return 'weekly';
    return 'unknown';
  }

  /**
   * Calculate confidence score (0-1)
   *
   * Factors:
   * - Data points: More receipts = higher confidence (max at 5+)
   * - Consistency: Low std dev = higher confidence (< 3 days = perfect)
   * - Pattern strength: Detected frequency = higher confidence
   */
  calculateConfidence(intervals, dataPoints, hasFrequency) {
    if (intervals.length === 0) return 0;

    // Data point score (0-1)
    const dataPointScore = Math.min(dataPoints / 5, 1.0);

    // Consistency score (0-1)
    const stdDev = this.standardDeviation(intervals);
    const consistencyScore = stdDev < 3 ? 1.0 : Math.max(1 - (stdDev / 10), 0.3);

    // Pattern score (0-1)
    const patternScore = hasFrequency ? 1.0 : 0.5;

    // Weighted average
    return (dataPointScore * 0.3) + (consistencyScore * 0.5) + (patternScore * 0.2);
  }

  /**
   * Predict next payment date based on pattern
   */
  predictNextPayment(dates, frequency) {
    const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a - b);
    const lastDate = sortedDates[sortedDates.length - 1];

    // Calculate average interval
    const intervals = [];
    for (let i = 1; i < sortedDates.length; i++) {
      intervals.push(this.daysBetween(sortedDates[i - 1], sortedDates[i]));
    }
    const avgInterval = this.mean(intervals);

    // Predict next date
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

    return nextDate;
  }

  /**
   * Analyze payment pattern for a single vendor
   *
   * @param {Object[]} receipts - Array of receipts for this vendor
   * @returns {Object} Pattern analysis
   */
  analyzeVendorPattern(receipts) {
    if (receipts.length < 2) {
      return {
        canPredict: false,
        reason: 'Insufficient data (need at least 2 receipts)',
      };
    }

    // Extract and sort transaction dates
    const dates = receipts
      .map(r => r.transaction_date)
      .filter(d => d != null)
      .sort();

    if (dates.length < 2) {
      return {
        canPredict: false,
        reason: 'Missing transaction dates',
      };
    }

    // Calculate intervals between consecutive receipts
    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push(this.daysBetween(dates[i - 1], dates[i]));
    }

    const avgInterval = this.mean(intervals);
    const stdDev = this.standardDeviation(intervals);

    // Detect frequency pattern
    const frequency = this.detectFrequency(avgInterval);

    // Extract payment day pattern
    const daysOfMonth = dates.map(d => new Date(d).getDate());
    const paymentDay = this.mode(daysOfMonth);

    // Predict next payment date
    const lastDate = new Date(dates[dates.length - 1]);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

    // Calculate confidence
    const confidence = this.calculateConfidence(intervals, dates.length, frequency !== 'unknown');

    return {
      canPredict: true,
      lastPaymentDate: dates[dates.length - 1],
      nextPaymentDate: nextDate.toISOString().split('T')[0],
      paymentDayOfMonth: paymentDay,
      frequency,
      confidence: parseFloat(confidence.toFixed(2)),
      stats: {
        receiptCount: receipts.length,
        avgInterval: Math.round(avgInterval),
        stdDev: parseFloat(stdDev.toFixed(1)),
        intervals,
      },
    };
  }

  /**
   * Predict payment dates for all subscriptions
   *
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Results summary
   */
  async predictAllPayments(tenantId) {
    console.log('🔮 Predicting payment dates...\n');

    // Fetch all subscriptions grouped by vendor
    const { data: subscriptions, error } = await this.supabase
      .from('email_financial_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .order('transaction_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }

    console.log(`Found ${subscriptions.length} total subscriptions\n`);

    // Group by vendor
    const byVendor = subscriptions.reduce((acc, sub) => {
      const vendor = sub.vendor || 'Unknown';
      if (!acc[vendor]) acc[vendor] = [];
      acc[vendor].push(sub);
      return acc;
    }, {});

    const results = {
      total: Object.keys(byVendor).length,
      predicted: 0,
      skipped: 0,
      updated: 0,
      byVendor: {},
    };

    // Analyze each vendor
    for (const [vendor, receipts] of Object.entries(byVendor)) {
      const pattern = this.analyzeVendorPattern(receipts);

      if (!pattern.canPredict) {
        results.skipped++;
        continue;
      }

      results.predicted++;
      results.byVendor[vendor] = pattern;

      // Update database for all receipts from this vendor
      const { error: updateError } = await this.supabase
        .from('email_financial_documents')
        .update({
          next_payment_date: pattern.nextPaymentDate,
          last_payment_date: pattern.lastPaymentDate,
          payment_day_of_month: pattern.paymentDayOfMonth,
          payment_pattern_confidence: pattern.confidence,
          subscription_frequency: pattern.frequency,
        })
        .eq('tenant_id', tenantId)
        .eq('vendor', vendor)
        .eq('is_subscription', true);

      if (updateError) {
        console.error(`Failed to update ${vendor}: ${updateError.message}`);
        continue;
      }

      results.updated++;
    }

    return results;
  }

  /**
   * Get summary of predictions
   *
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object[]>} Prediction summary
   */
  async getPredictionSummary(tenantId) {
    const { data } = await this.supabase
      .from('email_financial_documents')
      .select('vendor, next_payment_date, payment_pattern_confidence, subscription_frequency')
      .eq('tenant_id', tenantId)
      .eq('is_subscription', true)
      .not('next_payment_date', 'is', null)
      .order('next_payment_date');

    return data;
  }
}

export default PaymentPredictor;
