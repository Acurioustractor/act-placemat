/**
 * Receipt-Transaction Matching Module
 * Provides algorithms for matching receipts to transactions
 */

import { MATCHING_TOLERANCE, EXPENSE_THRESHOLDS } from '../shared/constants.js';

/**
 * Match result with score and reasons
 * @typedef {Object} MatchResult
 * @property {Object} transaction - Matched transaction
 * @property {number} score - Match confidence score (0-1)
 * @property {string[]} reasons - List of match reasons
 */

/**
 * Match a receipt to a transaction based on multiple criteria
 * @param {Object} receipt - Receipt to match
 * @param {Object} transaction - Transaction to compare
 * @returns {MatchResult} Match result with score
 */
export function matchReceiptToTransaction(receipt, transaction) {
  const reasons = [];
  let score = 0;

  // Amount matching (40% weight)
  if (receipt.total && transaction.amount) {
    const tolerance = Math.max(
      MATCHING_TOLERANCE.amountAbsolute,
      receipt.total * MATCHING_TOLERANCE.amountPercentage
    );
    const amountDiff = Math.abs(transaction.amount - receipt.total);
    const amountScore = Math.max(0, 1 - (amountDiff / tolerance));
    score += amountScore * 0.4;

    if (amountScore > 0.9) reasons.push('Exact amount match');
    else if (amountScore > 0.7) reasons.push('Very close amount');
  }

  // Date matching (30% weight)
  if (receipt.date && transaction.txn_date) {
    const receiptDate = new Date(receipt.date);
    const txDate = new Date(transaction.txn_date);
    const dateDiff = Math.abs(receiptDate - txDate) / (24 * 60 * 60 * 1000);
    const dateScore = Math.max(0, 1 - (dateDiff / MATCHING_TOLERANCE.dateDays));
    score += dateScore * 0.3;

    if (dateDiff < 1) reasons.push('Same day');
    else if (dateDiff < 2) reasons.push('Next day');
    else if (dateDiff <= 3) reasons.push('Within 3 days');
  }

  // Supplier name matching (30% weight)
  if (transaction.contact_name && receipt.supplier) {
    const nameScore = calculateNameSimilarity(
      transaction.contact_name.toLowerCase(),
      receipt.supplier.toLowerCase()
    );
    score += nameScore * 0.3;

    if (nameScore > 0.7) {
      reasons.push('Supplier name match');
    }
  }

  return {
    transaction,
    score: Math.min(1, score),
    reasons
  };
}

/**
 * Calculate name similarity using word overlap
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {number} Similarity score 0-1
 */
export function calculateNameSimilarity(name1, name2) {
  const words1 = name1.split(/\s+/);
  const words2 = name2.split(/\s+/);

  let commonWords = 0;
  for (const word1 of words1) {
    if (word1.length > 2 && words2.some(word2 =>
      word2.includes(word1) || word1.includes(word2)
    )) {
      commonWords++;
    }
  }

  const maxWords = Math.max(words1.length, words2.length);
  return maxWords > 0 ? commonWords / maxWords : 0;
}

/**
 * Calculate match score (legacy function for compatibility)
 * @param {Object} receipt - Receipt data
 * @param {Object} transaction - Transaction data
 * @returns {number} Match score 0-1
 */
export function calculateMatchScore(receipt, transaction) {
  let score = 0;

  // Amount similarity
  if (receipt.total && transaction.amount) {
    const amountDiff = Math.abs(transaction.amount - receipt.total);
    const tolerance = Math.max(2, receipt.total * 0.1);
    score += Math.max(0, 1 - (amountDiff / tolerance)) * 0.5;
  }

  // Date proximity
  if (receipt.date && transaction.txn_date) {
    const dateDiff = Math.abs(new Date(transaction.txn_date) - new Date(receipt.date)) / (24 * 60 * 60 * 1000);
    score += Math.max(0, 1 - (dateDiff / 7)) * 0.3;
  }

  // Supplier name similarity
  if (transaction.contact_name && receipt.supplier) {
    const similarity = calculateNameSimilarity(
      transaction.contact_name.toLowerCase(),
      receipt.supplier.toLowerCase()
    );
    score += similarity * 0.2;
  }

  return Math.min(1, score);
}

/**
 * Get match reasons for display
 * @param {Object} receipt - Receipt data
 * @param {Object} transaction - Transaction data
 * @returns {string[]} Array of match reasons
 */
export function getMatchReasons(receipt, transaction) {
  const reasons = [];

  if (receipt.total && transaction.amount) {
    const amountDiff = Math.abs(transaction.amount - receipt.total);
    if (amountDiff < 2) reasons.push('Exact amount match');
    else if (amountDiff < receipt.total * 0.05) reasons.push('Very close amount');
  }

  if (receipt.date && transaction.txn_date) {
    const dateDiff = Math.abs(new Date(transaction.txn_date) - new Date(receipt.date)) / (24 * 60 * 60 * 1000);
    if (dateDiff < 1) reasons.push('Same day');
    else if (dateDiff < 3) reasons.push('Similar date');
  }

  if (transaction.contact_name && receipt.supplier) {
    const txName = transaction.contact_name.toLowerCase();
    const receiptName = receipt.supplier.toLowerCase();
    if (txName.includes(receiptName) || receiptName.includes(txName)) {
      reasons.push('Supplier name match');
    }
  }

  return reasons;
}

/**
 * Find best match from array of transactions
 * @param {Object} receipt - Receipt to match
 * @param {Object[]} transactions - Array of transactions
 * @returns {MatchResult|null} Best match or null
 */
export function findBestMatch(receipt, transactions) {
  if (!transactions || transactions.length === 0) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const transaction of transactions) {
    const result = matchReceiptToTransaction(receipt, transaction);
    if (result.score > bestScore) {
      bestScore = result.score;
      bestMatch = result;
    }
  }

  // Only return if confidence is above threshold
  return bestScore > EXPENSE_THRESHOLDS.receiptAutoMatchThreshold ? bestMatch : null;
}

/**
 * Batch match receipts to transactions
 * @param {Object[]} receipts - Array of receipts
 * @param {Object[]} transactions - Array of transactions
 * @returns {Object[]} Array of match results
 */
export function batchMatch(receipts, transactions) {
  const results = [];

  for (const receipt of receipts) {
    const match = findBestMatch(receipt, transactions);
    results.push({
      receipt,
      match,
      autoMatched: match !== null && match.score > EXPENSE_THRESHOLDS.receiptAutoMatchThreshold
    });
  }

  return results;
}

export default {
  matchReceiptToTransaction,
  calculateNameSimilarity,
  calculateMatchScore,
  getMatchReasons,
  findBestMatch,
  batchMatch
};
