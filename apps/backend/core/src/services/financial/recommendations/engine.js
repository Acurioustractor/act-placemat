/**
 * Financial Recommendation Engine
 * Generates and manages financial recommendations based on metrics
 */

import { createSupabaseClient } from '../../config/supabase.js';
import MultiProviderAI from '../multiProviderAI.js';
import { TRANSACTION_TYPES } from '../shared/constants.js';

const supabase = createSupabaseClient();

/**
 * Map priority level to string
 * @param {string} priority - Priority value
 * @returns {string} Mapped priority
 */
export function mapPriorityLevel(priority) {
  switch (priority) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'medium': return 'medium';
    default: return 'low';
  }
}

/**
 * Map implementation complexity based on effort
 * @param {number} effort - Effort value
 * @returns {string} Complexity level
 */
export function mapImplementationComplexity(effort) {
  if (effort >= 7) return 'high';
  if (effort >= 4) return 'medium';
  return 'low';
}

/**
 * Normalize recommendation row for API response
 * @param {Object} item - Database item
 * @returns {Object} Normalized item
 */
export function normalizeRecommendationRow(item) {
  const feedback = item.detailed_analysis?.feedback || {};
  const modifier = mapFeedbackScore(feedback);
  const baseImpact = item.expected_impact?.financial ? Number(item.expected_impact.financial) : 8;
  const adjustedImpact = Math.max(1, Math.min(10, baseImpact * modifier));

  const priorityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
  const basePriority = priorityWeights[item.priority_level] || 1;
  const adjustedPriority = basePriority * modifier;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.insight_category,
    priority: item.priority_level,
    adjustedPriority,
    impact: baseImpact,
    adjustedImpact,
    confidence: item.confidence_score,
    status: item.status,
    recommendedActions: item.recommended_actions || [],
    implementationComplexity: item.implementation_complexity,
    feedback,
    lastUpdated: item.updated_at,
    reason: item.detailed_analysis?.reason
  };
}

/**
 * Calculate feedback score modifier
 * @param {Object} feedback - Feedback data
 * @returns {number} Score modifier
 */
function mapFeedbackScore(feedback = {}) {
  const implemented = feedback.implementedCount || 0;
  const dismissed = feedback.dismissedCount || 0;
  return 1 + implemented * 0.1 - dismissed * 0.05;
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(amount || 0));
}

/**
 * Fetch recent transactions
 * @param {number} days - Days to look back
 * @returns {Object[]} Transactions
 */
export async function fetchRecentTransactions(days = 60) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('xero_transactions')
    .select('amount,type,date,suggested_category,contact,status')
    .gte('date', start);

  if (error) throw error;
  return data || [];
}

/**
 * Compute financial metrics from transactions
 * @param {Object[]} transactions - Transactions to analyze
 * @param {number} windowDays - Analysis window
 * @returns {Object} Financial metrics
 */
export function computeFinancialMetrics(transactions, windowDays = 30) {
  const now = new Date();
  const windowStart = new Date();
  windowStart.setDate(now.getDate() - windowDays);

  let income = 0;
  let expenses = 0;
  let priorIncome = 0;
  let priorExpenses = 0;
  let receivablesTotal = 0;
  let payablesTotal = 0;
  let uncategorisedCount = 0;
  const vendorTotals = new Map();

  transactions.forEach(tx => {
    const amount = Math.abs(Number(tx.amount || 0));
    const type = String(tx.type || '').toLowerCase();
    const txDate = tx.date ? new Date(tx.date) : null;
    const inWindow = txDate ? txDate >= windowStart : true;

    if (type === TRANSACTION_TYPES.INCOME || type === TRANSACTION_TYPES.RECEIVE) {
      if (inWindow) income += amount; else priorIncome += amount;
      receivablesTotal += tx.status?.toLowerCase() === 'paid' ? 0 : amount;
    } else if (type === TRANSACTION_TYPES.EXPENSE || type === TRANSACTION_TYPES.SPEND) {
      if (inWindow) expenses += amount; else priorExpenses += amount;
      payablesTotal += amount;
    }

    if (!tx.suggested_category) {
      uncategorisedCount += 1;
    }

    if (tx.contact) {
      vendorTotals.set(tx.contact, (vendorTotals.get(tx.contact) || 0) + amount);
    }
  });

  const burnRate = expenses / windowDays * 30;
  const cashBalance = income - expenses;
  const runwayMonths = burnRate > 0 ? Math.max(0, +(cashBalance / burnRate).toFixed(1)) : null;
  const topVendor = Array.from(vendorTotals.entries()).sort((a, b) => b[1] - a[1])[0] || null;

  const revenueGrowth = priorIncome > 0 ? (income - priorIncome) / priorIncome : income > 0 ? 1 : 0;
  const expenseGrowth = priorExpenses > 0 ? (expenses - priorExpenses) / priorExpenses : expenses > 0 ? 1 : 0;

  return {
    income,
    expenses,
    net: income - expenses,
    burnRate,
    cashBalance,
    runwayDays: runwayMonths !== null ? Math.round(runwayMonths * 30) : null,
    runwayMonths,
    receivablesTotal,
    payablesTotal,
    uncategorisedCount,
    topVendor,
    revenueGrowth,
    expenseGrowth,
    windowDays
  };
}

export default {
  mapPriorityLevel,
  mapImplementationComplexity,
  normalizeRecommendationRow,
  formatCurrency,
  fetchRecentTransactions,
  computeFinancialMetrics
};
