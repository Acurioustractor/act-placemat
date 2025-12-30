/**
 * Gmail-to-Xero Reconciliation Engine
 *
 * R&D Component: Intelligent Receipt-Transaction Reconciliation System
 * Hypothesis: Automated fuzzy matching reduces manual reconciliation time by 80%
 *             while maintaining 90%+ accuracy
 * Methodology: Fetch unmatched receipts and Xero transactions, apply fuzzy matching,
 *              update database with reconciliation results, track confidence scores
 * Success Metric: >= 80% receipts auto-matched, >= 90% precision on matches,
 *                 manual reconciliation time reduced from 2hrs to <30min per month
 * Findings: TBD after production use
 */

import { FuzzyMatcher } from './fuzzyMatcher.js';
import config from '../../config/settings.js';

export class ReconciliationEngine {
  constructor(supabase) {
    this.supabase = supabase;
    this.fuzzyMatcher = new FuzzyMatcher({
      vendorThreshold: parseFloat(process.env.RECONCILIATION_VENDOR_THRESHOLD || '0.7'),
      amountTolerance: parseFloat(process.env.RECONCILIATION_AMOUNT_TOLERANCE || '0.05'),
      dateDaysWindow: parseInt(process.env.RECONCILIATION_DATE_WINDOW_DAYS || '14'),
      minConfidence: parseFloat(process.env.RECONCILIATION_MIN_CONFIDENCE || '0.6')
    });
  }

  /**
   * R&D Method: Reconcile all unmatched receipts with Xero transactions
   * Returns: { matched, unmatched, lowConfidence, results }
   */
  async reconcileAll(tenantId) {
    console.log('[Reconciliation] Starting reconciliation for tenant:', tenantId);
    const startTime = Date.now();

    try {
      // Step 1: Fetch all unmatched receipts
      const receipts = await this.getUnmatchedReceipts(tenantId);
      console.log(`[Reconciliation] Found ${receipts.length} unmatched receipts`);

      if (receipts.length === 0) {
        return {
          matched: 0,
          unmatched: 0,
          lowConfidence: 0,
          results: [],
          message: 'No unmatched receipts to reconcile'
        };
      }

      // Step 2: Fetch all Xero transactions (SPEND only from NAB Visa ACT #8815)
      const transactions = await this.getXeroTransactions(tenantId);
      console.log(`[Reconciliation] Found ${transactions.length} Xero transactions`);

      if (transactions.length === 0) {
        return {
          matched: 0,
          unmatched: receipts.length,
          lowConfidence: 0,
          results: [],
          message: 'No Xero transactions available for matching'
        };
      }

      // Step 3: Run fuzzy matching
      const matchResults = this.fuzzyMatcher.batchMatch(receipts, transactions);

      // Step 4: Update database with matches
      const updateResults = await this.updateMatches(matchResults);

      // Step 5: Calculate summary statistics
      const summary = this.calculateSummary(updateResults);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Reconciliation] Complete in ${elapsedTime}s:`, summary);

      // R&D Metrics
      console.log('[R&D] Reconciliation Metrics:', {
        totalReceipts: receipts.length,
        totalTransactions: transactions.length,
        matched: summary.matched,
        matchRate: `${((summary.matched / receipts.length) * 100).toFixed(1)}%`,
        avgConfidence: summary.avgConfidence,
        processingTime: `${elapsedTime}s`
      });

      return {
        ...summary,
        results: updateResults,
        processingTime: parseFloat(elapsedTime)
      };
    } catch (error) {
      console.error('[Reconciliation] Error during reconciliation:', error);
      throw error;
    }
  }

  /**
   * Fetch all subscription receipts without Xero transaction ID
   */
  async getUnmatchedReceipts(tenantId) {
    const { data, error } = await this.supabase
      .from('subscription_receipts')
      .select(`
        *,
        discovered_subscriptions!inner(tenant_id, vendor)
      `)
      .is('xero_transaction_id', null)
      .eq('discovered_subscriptions.tenant_id', tenantId);

    if (error) {
      console.error('[Reconciliation] Error fetching unmatched receipts:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Fetch all Xero SPEND transactions from NAB Visa ACT #8815
   * Using 540-day lookback (18 months) to match config
   */
  async getXeroTransactions(tenantId) {
    const dateThreshold = this.getDateDaysAgo(config.xero.lookbackDays);

    const { data, error } = await this.supabase
      .from('xero_bank_transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('type', 'SPEND')
      .eq('bank_account_name', 'NAB Visa ACT #8815')
      .gte('date', dateThreshold)
      .order('date', { ascending: false });

    if (error) {
      console.error('[Reconciliation] Error fetching Xero transactions:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Update database with reconciliation matches
   */
  async updateMatches(matchResults) {
    const updates = [];

    for (const result of matchResults) {
      const { receipt, match } = result;

      if (match.matched && match.transaction) {
        try {
          const { data, error } = await this.supabase
            .from('subscription_receipts')
            .update({
              xero_transaction_id: match.transaction.transaction_id,
              reconciliation_confidence: match.confidence,
              reconciliation_date: new Date().toISOString(),
              reconciliation_status: match.confidence >= 0.8 ? 'auto_matched' : 'manual_review'
            })
            .eq('id', receipt.id)
            .select()
            .single();

          if (error) {
            console.error(`[Reconciliation] Error updating receipt ${receipt.id}:`, error);
            updates.push({
              receipt,
              match,
              updated: false,
              error: error.message
            });
          } else {
            updates.push({
              receipt,
              match,
              updated: true,
              data
            });
          }
        } catch (error) {
          console.error(`[Reconciliation] Exception updating receipt ${receipt.id}:`, error);
          updates.push({
            receipt,
            match,
            updated: false,
            error: error.message
          });
        }
      } else {
        // No match found - mark as unmatched
        updates.push({
          receipt,
          match,
          updated: false,
          reason: 'no_match'
        });
      }
    }

    return updates;
  }

  /**
   * Calculate summary statistics from update results
   */
  calculateSummary(updateResults) {
    const matched = updateResults.filter(r => r.updated && r.match.confidence >= 0.8).length;
    const lowConfidence = updateResults.filter(r => r.updated && r.match.confidence < 0.8).length;
    const unmatched = updateResults.filter(r => !r.updated).length;

    const confidenceScores = updateResults
      .filter(r => r.updated)
      .map(r => r.match.confidence);

    const avgConfidence = confidenceScores.length > 0
      ? (confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length).toFixed(3)
      : '0.000';

    return {
      matched,
      lowConfidence,
      unmatched,
      total: updateResults.length,
      avgConfidence: parseFloat(avgConfidence)
    };
  }

  /**
   * Find outstanding invoices (receipts with no Xero transaction match)
   */
  async findOutstanding(tenantId) {
    console.log('[Reconciliation] Finding outstanding invoices for tenant:', tenantId);

    const { data, error } = await this.supabase
      .from('subscription_receipts')
      .select(`
        *,
        discovered_subscriptions!inner(vendor, tenant_id)
      `)
      .is('xero_transaction_id', null)
      .eq('discovered_subscriptions.tenant_id', tenantId)
      .order('receipt_date', { ascending: false });

    if (error) {
      console.error('[Reconciliation] Error fetching outstanding invoices:', error);
      throw error;
    }

    // Calculate days overdue and priority for each
    const enriched = (data || []).map(receipt => {
      const daysOverdue = this.calculateDaysOverdue(receipt.receipt_date);
      const priority = this.calculatePriority(daysOverdue, receipt.amount);
      const status = this.getPriorityStatus(daysOverdue, receipt.amount);

      return {
        ...receipt,
        daysOverdue,
        priority,
        status
      };
    });

    console.log(`[Reconciliation] Found ${enriched.length} outstanding invoices`);

    return enriched;
  }

  /**
   * Calculate days overdue from receipt date
   */
  calculateDaysOverdue(receiptDate) {
    if (!receiptDate) return 0;

    const receipt = new Date(receiptDate);
    const now = new Date();
    const diffTime = now - receipt;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate priority score (0-100)
   * Based on days overdue and amount
   */
  calculatePriority(daysOverdue, amount) {
    let score = 0;

    // Days overdue component (0-50 points)
    if (daysOverdue > 30) score += 50;
    else if (daysOverdue > 7) score += 30;
    else score += Math.min(daysOverdue, 20);

    // Amount component (0-50 points)
    if (amount > 500) score += 50;
    else if (amount > 100) score += 30;
    else score += Math.min(amount / 2, 20);

    return Math.min(score, 100);
  }

  /**
   * Get priority status label
   */
  getPriorityStatus(daysOverdue, amount) {
    if (daysOverdue > 30 || amount > 500) return 'critical';
    if (daysOverdue > 7 || amount > 100) return 'high';
    return 'normal';
  }

  /**
   * Get date N days ago in YYYY-MM-DD format
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
  component: 'Reconciliation Engine',
  hypothesis: 'Automated fuzzy matching reduces manual reconciliation time by 80% while maintaining 90%+ accuracy',
  methodology: 'Fetch unmatched receipts and Xero transactions, apply multi-dimensional fuzzy matching algorithm, update database with confidence-scored matches',
  successMetric: '>= 80% auto-match rate, >= 90% precision, manual reconciliation time reduced from 2hrs to <30min per month',
  findings: 'TBD after production use and user feedback',
  category: 'Software Development',
  technicalUncertainty: 'Balancing automation vs manual review - determining optimal confidence thresholds for auto-matching without introducing false positives',
  estimatedHours: 4.0
};

export default ReconciliationEngine;
