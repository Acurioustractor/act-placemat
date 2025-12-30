/**
 * Fuzzy Matching Engine for Gmail-to-Xero Reconciliation
 *
 * R&D Component: Multi-Dimensional Fuzzy Matching Algorithm
 * Hypothesis: Multi-dimensional fuzzy matching (vendor + amount + date + reference)
 *             achieves 90%+ precision vs 60% from exact matching alone
 * Methodology: Levenshtein distance for vendor names, tolerance windows for amounts/dates,
 *              weighted confidence scoring with formula:
 *              vendor(0.4) + amount(0.3) + date(0.2) + reference(0.1)
 * Success Metric: Precision >= 90%, Recall >= 85% on manual validation of 100 receipt-transaction pairs
 * Findings: TBD after testing
 */

export class FuzzyMatcher {
  constructor(options = {}) {
    // Configurable thresholds
    this.vendorThreshold = options.vendorThreshold || 0.7;      // 70% similarity
    this.amountTolerance = options.amountTolerance || 0.05;     // 5% variance
    this.dateDaysWindow = options.dateDaysWindow || 14;         // ±14 days
    this.minConfidence = options.minConfidence || 0.6;          // 60% minimum

    console.log('[Fuzzy Matcher] Initialized with thresholds:', {
      vendorThreshold: this.vendorThreshold,
      amountTolerance: this.amountTolerance,
      dateDaysWindow: this.dateDaysWindow,
      minConfidence: this.minConfidence
    });
  }

  /**
   * R&D Method: Find best matching transaction for a receipt
   * Hypothesis: Weighted multi-dimensional matching > single-field exact match
   * Returns: { transaction, confidence, matched }
   */
  matchReceiptToTransaction(receipt, transactions) {
    if (!receipt || !transactions || transactions.length === 0) {
      return { transaction: null, confidence: 0, matched: false };
    }

    let bestMatch = null;
    let bestScore = 0;
    let bestScoreBreakdown = null;

    for (const txn of transactions) {
      const { score, breakdown } = this.calculateMatchScore(receipt, txn);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = txn;
        bestScoreBreakdown = breakdown;
      }
    }

    const matched = bestScore >= this.minConfidence;

    if (matched) {
      console.log('[Fuzzy Matcher] Match found:', {
        receiptVendor: receipt.vendor,
        transactionVendor: bestMatch.contact_name,
        confidence: bestScore.toFixed(3),
        breakdown: bestScoreBreakdown
      });
    }

    return {
      transaction: matched ? bestMatch : null,
      confidence: bestScore,
      matched,
      breakdown: bestScoreBreakdown
    };
  }

  /**
   * Calculate match score between receipt and transaction
   * Formula: vendor(0.4) + amount(0.3) + date(0.2) + reference(0.1)
   */
  calculateMatchScore(receipt, transaction) {
    const vendorScore = this.vendorSimilarity(
      receipt.vendor,
      transaction.contact_name || transaction.payee
    );

    const amountScore = this.amountSimilarity(
      receipt.amount,
      parseFloat(transaction.total || transaction.amount)
    );

    const dateScore = this.dateSimilarity(
      new Date(receipt.receipt_date || receipt.date),
      new Date(transaction.date || transaction.transaction_date)
    );

    const referenceScore = this.referenceSimilarity(
      receipt.gmail_message_id,
      transaction.reference || transaction.description
    );

    // Weighted average (must sum to 1.0)
    const weights = {
      vendor: 0.4,
      amount: 0.3,
      date: 0.2,
      reference: 0.1
    };

    const totalScore = (
      (vendorScore * weights.vendor) +
      (amountScore * weights.amount) +
      (dateScore * weights.date) +
      (referenceScore * weights.reference)
    );

    return {
      score: totalScore,
      breakdown: {
        vendor: vendorScore.toFixed(3),
        amount: amountScore.toFixed(3),
        date: dateScore.toFixed(3),
        reference: referenceScore.toFixed(3),
        weights
      }
    };
  }

  /**
   * Vendor name similarity using Levenshtein distance
   * Returns: 0.0 to 1.0 (1.0 = perfect match)
   */
  vendorSimilarity(vendor1, vendor2) {
    if (!vendor1 || !vendor2) return 0;

    const normalized1 = this.normalizeVendor(vendor1);
    const normalized2 = this.normalizeVendor(vendor2);

    if (normalized1 === normalized2) return 1.0;

    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLen = Math.max(normalized1.length, normalized2.length);

    if (maxLen === 0) return 0;

    const similarity = 1 - (distance / maxLen);

    // Return 0 if below threshold
    return similarity >= this.vendorThreshold ? similarity : 0;
  }

  /**
   * Amount similarity with tolerance window
   * Returns: 0.0 to 1.0 (1.0 = exact or within tolerance)
   */
  amountSimilarity(amount1, amount2) {
    if (!amount1 || !amount2) return 0;

    const diff = Math.abs(amount1 - amount2);
    const avg = (amount1 + amount2) / 2;

    if (avg === 0) return 0;

    const tolerance = avg * this.amountTolerance;

    if (diff === 0) return 1.0;
    if (diff <= tolerance) return 1.0 - (diff / tolerance) * 0.2;  // 0.8-1.0 range

    // Outside tolerance - use exponential decay
    return Math.max(0, 1 - (diff / avg));
  }

  /**
   * Date similarity with window matching
   * Returns: 0.0 to 1.0 (1.0 = same day, linear decay to 0 at window boundary)
   */
  dateSimilarity(date1, date2) {
    if (!date1 || !date2) return 0;

    const daysDiff = Math.abs(
      Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (daysDiff === 0) return 1.0;
    if (daysDiff <= this.dateDaysWindow) {
      // Linear decay from 1.0 to 0.0 over window
      return 1 - (daysDiff / this.dateDaysWindow);
    }

    return 0;
  }

  /**
   * Reference similarity (partial string matching)
   * Returns: 0.0 to 1.0 (1.0 = reference contains message ID substring)
   */
  referenceSimilarity(messageId, reference) {
    if (!messageId || !reference) return 0;

    // Extract short ID from Gmail message ID (first 10 chars)
    const shortId = messageId.substring(0, 10).toLowerCase();
    const refLower = reference.toLowerCase();

    if (refLower.includes(shortId)) return 1.0;

    // Check for any significant overlap (at least 5 chars)
    for (let i = 0; i <= messageId.length - 5; i++) {
      const substring = messageId.substring(i, i + 5).toLowerCase();
      if (refLower.includes(substring)) return 0.5;
    }

    return 0;
  }

  /**
   * Normalize vendor name for comparison
   * Strategy: Lowercase, remove non-alphanumeric, trim to 30 chars
   */
  normalizeVendor(vendor) {
    if (!vendor) return '';

    return vendor
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')  // Remove all non-alphanumeric
      .substring(0, 30);           // First 30 chars
  }

  /**
   * Levenshtein distance algorithm
   * Calculates minimum number of edits (insertions, deletions, substitutions)
   * needed to transform str1 into str2
   */
  levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create matrix
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    // Fill matrix
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1.charAt(i - 1) === str2.charAt(j - 1) ? 0 : 1;

        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,       // Deletion
          matrix[j][i - 1] + 1,       // Insertion
          matrix[j - 1][i - 1] + cost // Substitution
        );
      }
    }

    return matrix[len2][len1];
  }

  /**
   * Batch match multiple receipts to transactions
   * Returns: Array of { receipt, match } objects
   */
  batchMatch(receipts, transactions) {
    console.log(`[Fuzzy Matcher] Batch matching ${receipts.length} receipts to ${transactions.length} transactions`);

    const results = receipts.map(receipt => {
      const match = this.matchReceiptToTransaction(receipt, transactions);
      return {
        receipt,
        match
      };
    });

    const matchedCount = results.filter(r => r.match.matched).length;
    const matchRate = receipts.length > 0
      ? ((matchedCount / receipts.length) * 100).toFixed(1)
      : 0;

    console.log(`[Fuzzy Matcher] Batch complete: ${matchedCount}/${receipts.length} matched (${matchRate}%)`);

    return results;
  }
}

/**
 * R&D Documentation Export
 * For AusIndustry R&D tax claim compliance
 */
export const RD_METADATA = {
  component: 'Fuzzy Matching Engine',
  hypothesis: 'Multi-dimensional fuzzy matching (vendor + amount + date + ref) achieves 90%+ precision vs 60% from exact matching',
  methodology: 'Levenshtein distance for vendor names, tolerance windows for amounts/dates, weighted scoring formula with vendor(0.4) + amount(0.3) + date(0.2) + reference(0.1)',
  successMetric: 'Precision >= 90%, Recall >= 85% on manual validation set of 100 receipt-transaction pairs',
  findings: 'TBD after testing and validation',
  category: 'Data Analysis',
  technicalUncertainty: 'Optimal weighting factors and similarity thresholds for reconciling financial transactions across heterogeneous data sources (Gmail vs Xero)',
  estimatedHours: 6.0
};

export default FuzzyMatcher;
