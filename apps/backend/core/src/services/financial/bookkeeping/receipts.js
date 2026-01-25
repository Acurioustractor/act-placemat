/**
 * Receipt Processing Module
 * Handles receipt scanning, matching, and attachment to transactions
 */

import { createClient } from '@supabase/supabase-js';
import { MATCHING_TOLERANCE } from '../shared/constants.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Attach a receipt to a transaction
 * @param {Object} receipt - Receipt data
 * @param {Object} transaction - Transaction to attach to
 */
export async function attachReceiptToTransaction(receipt, transaction) {
  await supabase
    .from('bookkeeping_transactions')
    .update({
      receipt_message_id: receipt.messageId || `dext_${receipt.id}`,
      receipt_url: receipt.gmailLink || receipt.imageUrl,
      receipt_amount: receipt.amount || receipt.total,
      receipt_confidence: 0.9,
      receipt_attached_at: new Date().toISOString(),
      dext_receipt_id: receipt.id,
      receipt_source: receipt.source || 'email'
    })
    .eq('id', transaction.id);
}

/**
 * Find matching transaction for a receipt
 * @param {Object} receipt - Receipt to match
 * @returns {Object|null} Matched transaction with confidence
 */
export async function findMatchingTransaction(receipt) {
  if (!receipt.total || !receipt.date) return null;

  try {
    const tolerance = Math.max(
      MATCHING_TOLERANCE.amountAbsolute,
      receipt.total * MATCHING_TOLERANCE.amountPercentage
    );
    const dateTolerance = MATCHING_TOLERANCE.dateDays;

    const receiptDate = new Date(receipt.date);
    const startDate = new Date(receiptDate.getTime() - dateTolerance * 24 * 60 * 60 * 1000);
    const endDate = new Date(receiptDate.getTime() + dateTolerance * 24 * 60 * 60 * 1000);

    const { data: transactions, error } = await supabase
      .from('bookkeeping_transactions')
      .select('*')
      .eq('direction', 'spent')
      .gte('txn_date', startDate.toISOString())
      .lte('txn_date', endDate.toISOString())
      .gte('amount', receipt.total - tolerance)
      .lte('amount', receipt.total + tolerance)
      .is('receipt_url', null)
      .order('txn_date', { ascending: false });

    if (error || !transactions?.length) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const tx of transactions) {
      let score = 0;

      // Amount similarity
      const amountDiff = Math.abs(tx.amount - receipt.total);
      score += Math.max(0, 1 - (amountDiff / tolerance)) * 0.4;

      // Date similarity
      const dateDiff = Math.abs(new Date(tx.txn_date) - receiptDate) / (24 * 60 * 60 * 1000);
      score += Math.max(0, 1 - (dateDiff / dateTolerance)) * 0.3;

      // Supplier name similarity
      if (tx.contact_name && receipt.supplier) {
        const txName = tx.contact_name.toLowerCase();
        const receiptName = receipt.supplier.toLowerCase();

        if (txName.includes(receiptName) || receiptName.includes(txName)) {
          score += 0.3;
        } else if (calculateNameSimilarity(txName, receiptName) > 0.7) {
          score += 0.2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { ...tx, confidence: score };
      }
    }

    return bestScore > 0.7 ? bestMatch : null;

  } catch (error) {
    console.error('Transaction matching error:', error);
    return null;
  }
}

/**
 * Calculate name similarity using simple string matching
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {number} Similarity score 0-1
 */
export function calculateNameSimilarity(name1, name2) {
  const words1 = name1.split(/\s+/);
  const words2 = name2.split(/\s+/);

  let commonWords = 0;
  for (const word1 of words1) {
    if (word1.length > 2 && words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      commonWords++;
    }
  }

  const maxWords = Math.max(words1.length, words2.length);
  return maxWords > 0 ? commonWords / maxWords : 0;
}

/**
 * Calculate match score between receipt and transaction
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
 * Get suggested transaction matches for a receipt
 * @param {Object} receipt - Receipt to match
 * @param {number} limit - Maximum suggestions to return
 * @returns {Object[]} Array of match suggestions
 */
export async function getSuggestedMatches(receipt, limit = 5) {
  try {
    const { data: transactions, error } = await supabase
      .from('bookkeeping_transactions')
      .select('*')
      .eq('direction', 'spent')
      .gte('txn_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .is('receipt_url', null)
      .order('txn_date', { ascending: false })
      .limit(20);

    if (error || !transactions?.length) return [];

    return transactions
      .map(tx => ({
        transaction: tx,
        score: calculateMatchScore(receipt, tx),
        reasons: getMatchReasons(receipt, tx)
      }))
      .filter(match => match.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (error) {
    console.error('Suggested matches error:', error);
    return [];
  }
}

/**
 * Process new email receipts
 * @param {Object} options - Processing options
 * @returns {Object[]} Array of notifications
 */
export async function processEmailReceipts(options = {}) {
  const { days = 7, max = 50 } = options;
  const notifications = [];

  try {
    const response = await fetch('http://localhost:4000/api/finance/receipts/sweep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days, max })
    });

    const data = await response.json();

    if (data.receipts) {
      for (const receipt of data.receipts) {
        if (receipt.matchedTransaction) {
          await attachReceiptToTransaction(receipt, receipt.matchedTransaction);

          notifications.push({
            type: 'receipt_auto_matched',
            priority: 'low',
            message: `Receipt auto-matched: ${receipt.subject}`,
            receipt,
            transaction: receipt.matchedTransaction,
            confidence: 0.9
          });
        } else if (receipt.amount) {
          notifications.push({
            type: 'receipt_needs_matching',
            priority: 'medium',
            message: `New receipt needs matching: ${receipt.subject} - $${receipt.amount}`,
            receipt,
            action: 'Click to match with transaction'
          });
        }
      }
    }
  } catch (error) {
    console.error('Email receipt processing error:', error);
  }

  return notifications;
}

export default {
  attachReceiptToTransaction,
  findMatchingTransaction,
  calculateNameSimilarity,
  calculateMatchScore,
  getMatchReasons,
  getSuggestedMatches,
  processEmailReceipts
};
