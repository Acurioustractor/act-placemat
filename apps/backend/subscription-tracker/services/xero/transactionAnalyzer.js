/**
 * Xero Transaction Analyzer
 *
 * R&D Component: Temporal Pattern Analysis for Recurring Subscription Detection
 * Hypothesis: Analyzing transaction frequency + amount consistency over 90-day window
 *             identifies 85%+ of recurring subscriptions in bank feeds
 *             (vs 60% accuracy from amount matching alone)
 * Methodology: Calculate transaction intervals, detect monthly/yearly patterns,
 *              score confidence based on frequency stability and amount consistency
 * Success Metric: Precision >= 85%, Recall >= 75% vs manual audit
 * Findings: TBD after testing
 */

import config from '../../config/settings.js';

export class TransactionAnalyzer {
  constructor(supabase) {
    this.supabase = supabase;
    this.minOccurrences = config.xero.minOccurrences;
    this.maxDayVariance = config.xero.maxDayVariance;
    this.amountTolerance = config.xero.amountTolerance;
    this.lookbackDays = config.xero.lookbackDays;
  }

  /**
   * R&D Method: Temporal pattern analysis for recurring transactions
   * Hypothesis: Monthly/yearly patterns with consistent amounts indicate subscriptions
   * Target: 85% precision (few false positives), 75% recall (find most subscriptions)
   */
  async findRecurringTransactions(tenantId, lookbackDays = this.lookbackDays) {
    const dateThreshold = this.getDateDaysAgo(lookbackDays);

    // DEBUG: Log query parameters
    console.log('[Xero Analyzer DEBUG] Query parameters:', {
      tenantId,
      lookbackDays,
      dateThreshold,
      table: 'xero_bank_transactions',
      filters: {
        type: 'SPEND',
        bank_account_name: 'NAB Visa ACT #8815'
      }
    });

    // Fetch recent SPEND transactions from NAB Visa ACT #8815 only
    const { data: transactions, error, count } = await this.supabase
      .from('xero_bank_transactions')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('type', 'SPEND')
      .eq('bank_account_name', 'NAB Visa ACT #8815')  // Only pull from this credit card
      .gte('date', dateThreshold)
      .order('date', { ascending: true });

    console.log('[Xero Analyzer DEBUG] Query result:', {
      rowCount: count,
      transactionCount: transactions?.length || 0,
      hasError: !!error
    });

    if (error) {
      console.error('[Xero Analyzer] Error fetching transactions:', error);
      throw error;
    }

    if (!transactions || transactions.length === 0) {
      console.log('[Xero Analyzer] No transactions found');

      // DEBUG: Let's check what's actually in the table
      const { data: sampleData } = await this.supabase
        .from('xero_bank_transactions')
        .select('tenant_id, type, bank_account_name, date')
        .eq('tenant_id', tenantId)
        .limit(5);

      console.log('[Xero Analyzer DEBUG] Sample data from table:', sampleData);

      return [];
    }

    // Group transactions by vendor (contact_name)
    const byVendor = this.groupByVendor(transactions);

    // Analyze each vendor's transaction pattern
    const recurring = [];
    for (const [vendor, txns] of Object.entries(byVendor)) {
      if (txns.length < this.minOccurrences) continue;  // Skip if too few occurrences

      const pattern = this.detectPattern(txns);
      if (pattern.isRecurring) {
        recurring.push({
          vendor,
          pattern,
          transactions: txns,
          confidence: pattern.confidence,
          // Add metadata for each transaction
          transactionDates: txns.map(t => t.date).sort(),
          transactionAmounts: txns.map(t => ({ date: t.date, amount: parseFloat(t.total || 0) })),
          latestStatus: txns[txns.length - 1].status,
          isReconciled: txns.every(t => t.status === 'AUTHORISED'),
          xeroContactId: txns[0].contact_id,
          xeroContactName: txns[0].contact_name
        });
      }
    }

    // R&D Metric: Log discovery rate
    console.log(`[R&D] Xero Analyzer: Found ${recurring.length} recurring patterns from ${Object.keys(byVendor).length} unique vendors`);
    console.log(`[R&D] Discovery rate: ${((recurring.length / Object.keys(byVendor).length) * 100).toFixed(1)}%`);

    return recurring;
  }

  /**
   * Pattern detection algorithm
   *
   * R&D Hypothesis: Day-of-month consistency + amount stability = subscription
   * Formula: confidence = (frequencyScore * 0.5) + (amountScore * 0.3) + (intervalScore * 0.2)
   *
   * Confidence Breakdown:
   * - Frequency Score (50%): How consistent are the intervals between transactions?
   * - Amount Score (30%): How consistent are the transaction amounts?
   * - Interval Score (20%): Does it match monthly/yearly patterns?
   */
  detectPattern(transactions) {
    if (transactions.length < this.minOccurrences) {
      return { isRecurring: false, confidence: 0 };
    }

    // Calculate intervals between transactions (in days)
    const intervals = [];
    for (let i = 1; i < transactions.length; i++) {
      const days = this.daysBetween(
        transactions[i-1].date,
        transactions[i].date
      );
      intervals.push(days);
    }

    // Detect monthly (28-31 days) or yearly (360-370 days) patterns
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = this.calculateVariance(intervals);

    const isMonthly = avgInterval >= config.patterns.monthly.minDays &&
                      avgInterval <= config.patterns.monthly.maxDays;
    const isYearly = avgInterval >= config.patterns.yearly.minDays &&
                     avgInterval <= config.patterns.yearly.maxDays;
    const isQuarterly = avgInterval >= config.patterns.quarterly.minDays &&
                        avgInterval <= config.patterns.quarterly.maxDays;
    const lowVariance = intervalVariance <= this.maxDayVariance;

    // Amount consistency check
    const amounts = transactions.map(t => parseFloat(t.total || 0));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const amountVariance = this.calculateVariance(amounts);
    const consistentAmount = (amountVariance / avgAmount) <= this.amountTolerance;

    // Confidence scoring (weighted components)
    const frequencyScore = lowVariance ? 1.0 : 0.5;
    const amountScore = consistentAmount ? 1.0 : 0.3;
    const intervalScore = (isMonthly || isYearly || isQuarterly) ? 1.0 : 0.0;

    const confidence = (
      (frequencyScore * 0.5) +
      (amountScore * 0.3) +
      (intervalScore * 0.2)
    );

    // Determine frequency label
    let frequency = 'irregular';
    if (isMonthly) frequency = 'monthly';
    else if (isQuarterly) frequency = 'quarterly';
    else if (isYearly) frequency = 'yearly';

    return {
      isRecurring: confidence >= 0.6,  // 60% minimum threshold
      confidence,
      frequency,
      avgInterval,
      avgAmount,
      intervalVariance,
      amountVariance: amountVariance / avgAmount,  // Normalized
      occurrences: transactions.length,
      lastSeen: transactions[transactions.length - 1].date,
      firstSeen: transactions[0].date
    };
  }

  /**
   * Group transactions by vendor name
   * Uses contact_name from Xero data
   */
  groupByVendor(transactions) {
    return transactions.reduce((acc, txn) => {
      const vendor = txn.contact_name || 'Unknown Vendor';
      if (!acc[vendor]) acc[vendor] = [];
      acc[vendor].push(txn);
      return acc;
    }, {});
  }

  /**
   * Calculate standard deviation of a numeric array
   * Used for measuring consistency in intervals and amounts
   */
  calculateVariance(numbers) {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;

    return Math.sqrt(variance);  // Standard deviation
  }

  /**
   * Calculate days between two dates
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get date string N days ago in YYYY-MM-DD format
   */
  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}

/**
 * R&D Documentation Export
 * For AusIndustry R&D tax claim compliance
 */
export const RD_METADATA = {
  component: 'Xero Transaction Analyzer',
  hypothesis: 'Temporal pattern analysis (frequency + amount consistency) identifies 85%+ of recurring subscriptions vs 60% from amount matching alone',
  methodology: 'Calculate transaction intervals, detect monthly/yearly/quarterly patterns, score confidence with weighted formula: frequency (50%) + amount (30%) + interval type (20%)',
  successMetric: 'Precision >= 85%, Recall >= 75% on manual audit of 100+ vendor patterns',
  findings: 'TBD after testing',
  category: 'Data Analysis',
  technicalUncertainty: 'Optimal variance thresholds and weighting factors for distinguishing recurring subscriptions from irregular vendor payments',
  estimatedHours: 4.0
};

export default TransactionAnalyzer;
