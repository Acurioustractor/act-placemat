/**
 * Expense Processing Module
 * Handles expense categorization, duplicate detection, and unusual expense detection
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { NOTIFICATION_TIMING, EXPENSE_THRESHOLDS, CATEGORY_PATTERNS } from '../shared/constants.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key'
});

/**
 * Check for transactions missing receipts
 * @param {number} daysThreshold - Days to look back
 * @returns {Object[]} Array of missing receipt notifications
 */
export async function checkMissingReceipts(daysThreshold = NOTIFICATION_TIMING.receiptMissingDays) {
  const notifications = [];

  const { data: transactions, error } = await supabase
    .from('bookkeeping_transactions')
    .select('*')
    .eq('direction', 'spent')
    .is('receipt_url', null)
    .gte('txn_date', new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000).toISOString())
    .order('amount', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return notifications;
  }

  return (transactions || []).map(tx => ({
    type: 'missing_receipt',
    priority: tx.amount > EXPENSE_THRESHOLDS.largeExpenseThreshold ? 'high' : 'medium',
    transaction: tx,
    message: `Missing receipt for ${tx.description || 'transaction'} - $${tx.amount}`,
    action: 'Please upload or forward the receipt to receipts@acurioustractor.org'
  }));
}

/**
 * Check for uncategorized expenses and auto-categorize if confident
 * @param {number} daysThreshold - Days to look back
 * @returns {Object[]} Array of categorization notifications
 */
export async function checkUncategorizedExpenses(daysThreshold = NOTIFICATION_TIMING.expenseUncategorizedDays) {
  const notifications = [];

  const { data: expenses, error } = await supabase
    .from('bookkeeping_transactions')
    .select('*')
    .or('category.is.null,category.eq.uncategorized')
    .gte('txn_date', new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error('Error fetching uncategorized:', error);
    return notifications;
  }

  for (const expense of expenses || []) {
    const suggestedCategory = await aiCategorizeExpense(expense);

    if (suggestedCategory.confidence > 0.85) {
      await supabase
        .from('bookkeeping_transactions')
        .update({
          category: suggestedCategory.category,
          category_confidence: suggestedCategory.confidence,
          category_auto_applied: true
        })
        .eq('id', expense.id);

      notifications.push({
        type: 'auto_categorized',
        priority: 'low',
        transaction: expense,
        message: `Auto-categorized: ${expense.description} as ${suggestedCategory.category}`,
        confidence: suggestedCategory.confidence
      });
    } else {
      notifications.push({
        type: 'needs_categorization',
        priority: 'medium',
        transaction: expense,
        message: `Please categorize: ${expense.description} - $${expense.amount}`,
        suggestion: suggestedCategory,
        action: 'Click to review and categorize'
      });
    }
  }

  return notifications;
}

/**
 * Check for potential duplicate expenses
 * @param {number} windowDays - Days to check for duplicates
 * @returns {Object[]} Array of duplicate notifications
 */
export async function checkDuplicateExpenses(windowDays = NOTIFICATION_TIMING.duplicateCheckWindowDays) {
  const notifications = [];

  const { data: recent, error } = await supabase
    .from('bookkeeping_transactions')
    .select('*')
    .gte('txn_date', new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString())
    .order('txn_date', { ascending: false });

  if (error || !recent) return notifications;

  const checked = new Set();

  for (let i = 0; i < recent.length; i++) {
    if (checked.has(recent[i].id)) continue;

    for (let j = i + 1; j < recent.length; j++) {
      const tx1 = recent[i];
      const tx2 = recent[j];

      const sameAmount = Math.abs(tx1.amount - tx2.amount) < 0.01;
      const sameVendor = tx1.contact_name === tx2.contact_name;
      const closeDate = Math.abs(new Date(tx1.txn_date) - new Date(tx2.txn_date)) < 7 * 24 * 60 * 60 * 1000;

      if (sameAmount && sameVendor && closeDate) {
        notifications.push({
          type: 'potential_duplicate',
          priority: 'high',
          transactions: [tx1, tx2],
          message: `Potential duplicate payment: $${tx1.amount} to ${tx1.contact_name}`,
          action: 'Review and cancel if duplicate'
        });

        checked.add(tx1.id);
        checked.add(tx2.id);
      }
    }
  }

  return notifications;
}

/**
 * Check for unusual expenses
 * @param {number} threshold - Amount threshold for large expenses
 * @returns {Object[]} Array of unusual expense notifications
 */
export async function checkUnusualExpenses(threshold = EXPENSE_THRESHOLDS.largeExpenseThreshold) {
  const notifications = [];

  const { data: stats } = await supabase.rpc('get_expense_statistics');

  const { data: largeExpenses, error } = await supabase
    .from('bookkeeping_transactions')
    .select('*')
    .eq('direction', 'spent')
    .gt('amount', threshold)
    .gte('txn_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) return notifications;

  for (const expense of largeExpenses || []) {
    const isUnusual = await isUnusualExpense(expense, stats);

    notifications.push({
      type: isUnusual ? 'unusual_expense' : 'large_expense',
      priority: 'high',
      transaction: expense,
      message: `${isUnusual ? 'Unusual' : 'Large'} expense: $${expense.amount} to ${expense.contact_name}`,
      action: 'Please review and confirm this expense',
      analysis: isUnusual ? 'This amount is significantly higher than usual for this vendor' : null
    });
  }

  return notifications;
}

/**
 * Check if an expense is unusual for the vendor
 * @param {Object} expense - Expense to check
 * @param {Object} stats - Statistics from database
 * @returns {boolean} Whether the expense is unusual
 */
export async function isUnusualExpense(expense, stats) {
  const { data: history } = await supabase
    .from('bookkeeping_transactions')
    .select('amount')
    .eq('contact_name', expense.contact_name)
    .neq('id', expense.id);

  if (!history || history.length < EXPENSE_THRESHOLDS.minimumTransactionsForAnalysis) return false;

  const avg = history.reduce((sum, h) => sum + h.amount, 0) / history.length;
  return expense.amount > avg * EXPENSE_THRESHOLDS.unusualExpenseMultiplier;
}

/**
 * AI categorize an expense
 * @param {Object} expense - Expense to categorize
 * @returns {Object} Category suggestion with confidence
 */
export async function aiCategorizeExpense(expense) {
  try {
    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Categorize this business expense:

Amount: $${expense.amount}
Vendor: ${expense.contact_name}
Description: ${expense.description}
Date: ${expense.txn_date}

Categories: Travel, Meals, Office Supplies, Software, Marketing, Professional Services, Utilities, Rent, Other

Return JSON: { "category": "...", "confidence": 0.0-1.0, "reasoning": "..." }`
      }]
    });

    const text = response.content[0].text;
    const json = JSON.parse(text.match(/\{.*\}/s)?.[0] || '{}');

    return {
      category: json.category || 'Other',
      confidence: json.confidence || 0.3,
      reasoning: json.reasoning
    };
  } catch (error) {
    console.error('AI categorization error:', error);
    return { category: 'Other', confidence: 0.3 };
  }
}

/**
 * Apply heuristics to categorize a transaction
 * @param {Object} transaction - Transaction to categorize
 * @returns {Object|null} Category suggestion or null
 */
export function applyHeuristics(transaction) {
  const text = [transaction.description, transaction.contact, transaction.bankAccount]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const match = CATEGORY_PATTERNS.find(rule => rule.pattern.test(text));

  if (!match) return null;

  return {
    category: match.category,
    confidence: 0.6,
    reason: 'Matched fallback heuristic pattern',
    source: 'heuristic'
  };
}

export default {
  checkMissingReceipts,
  checkUncategorizedExpenses,
  checkDuplicateExpenses,
  checkUnusualExpenses,
  isUnusualExpense,
  aiCategorizeExpense,
  applyHeuristics
};
