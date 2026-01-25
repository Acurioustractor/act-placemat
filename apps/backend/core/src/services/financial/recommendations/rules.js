/**
 * Financial Recommendation Rules
 * Business rules for generating financial recommendations
 */

import { formatCurrency, computeFinancialMetrics } from './engine.js';

/**
 * Build base recommendations from metrics
 * @param {Object} metrics - Financial metrics
 * @returns {Object[]} Base recommendations
 */
export function buildBaseRecommendations(metrics) {
  const recommendations = [];

  // Cash flow warning
  if (metrics.net < 0) {
    recommendations.push({
      key: 'cash_flow',
      title: 'Stabilise Cash Flow',
      description: `Net cash outflow of ${formatCurrency(Math.abs(metrics.net))} detected this month.`,
      category: 'cash_flow_optimization',
      priority: metrics.runwayMonths !== null && metrics.runwayMonths < 3 ? 'critical' : 'high',
      impact: 9,
      effort: 6,
      actionableSteps: [
        'Accelerate collection on outstanding receivables',
        'Review discretionary spending for immediate reductions',
        'Model 90-day cash flow scenarios with updated expense forecasts'
      ]
    });
  }

  // Uncategorised transactions
  if (metrics.uncategorisedCount > 5) {
    recommendations.push({
      key: 'categorisation',
      title: 'Resolve Uncategorised Transactions',
      description: `${metrics.uncategorisedCount} uncategorised transactions require attention.`,
      category: 'operational_efficiency',
      priority: 'high',
      impact: 7,
      effort: 4,
      actionableSteps: [
        'Review recent uncategorised entries and confirm categories',
        'Extend adaptive categoriser with new vendor rules',
        'Schedule weekly categorisation review in the founders rhythm'
      ]
    });
  }

  // Vendor concentration risk
  if (metrics.topVendor && metrics.topVendor[1] > metrics.expenses * 0.3) {
    recommendations.push({
      key: 'vendor_concentration',
      title: 'Reduce Vendor Concentration Risk',
      description: `${metrics.topVendor[0]} represents ${formatCurrency(metrics.topVendor[1])} of spend this month.`,
      category: 'risk_mitigation',
      priority: 'medium',
      impact: 6,
      effort: 5,
      actionableSteps: [
        'Negotiate revised terms with the top vendor',
        'Identify alternative suppliers to diversify spend',
        'Create monitoring alert for vendor spend thresholds'
      ]
    });
  }

  // Revenue decline
  if (metrics.revenueGrowth < 0) {
    recommendations.push({
      key: 'revenue_growth',
      title: 'Rebuild Revenue Momentum',
      description: `Revenue declined ${(metrics.revenueGrowth * 100).toFixed(1)}% versus the prior period.`,
      category: 'revenue_growth',
      priority: 'medium',
      impact: 8,
      effort: 7,
      actionableSteps: [
        'Activate partnership outreach for dormant opportunities',
        'Bundle high-margin services for existing community partners',
        'Launch 4-week campaign targeting recurring revenue expansion'
      ]
    });
  }

  return recommendations;
}

/**
 * Get recommendation categories
 * @returns {string[]} Category list
 */
export function getRecommendationCategories() {
  return [
    'cash_flow_optimization',
    'operational_efficiency',
    'risk_mitigation',
    'revenue_growth',
    'cost_reduction',
    'compliance',
    'growth_strategy'
  ];
}

/**
 * Get recommendation by key
 * @param {string} key - Recommendation key
 * @returns {Object|null} Recommendation or null
 */
export function getRecommendationByKey(key) {
  const recommendations = buildBaseRecommendations({
    net: -1000,
    uncategorisedCount: 10,
    topVendor: ['Vendor', 5000],
    expenses: 10000,
    revenueGrowth: -0.1
  });

  return recommendations.find(r => r.key === key) || null;
}

/**
 * Calculate recommendation priority score
 * @param {Object} recommendation - Recommendation
 * @param {Object} metrics - Current metrics
 * @returns {number} Priority score
 */
export function calculatePriorityScore(recommendation, metrics) {
  let score = 0;

  // Impact weight
  score += recommendation.impact * 10;

  // Urgency based on runway
  if (metrics.runwayMonths !== null && metrics.runwayMonths < 3) {
    score += 20;
  } else if (metrics.runwayMonths !== null && metrics.runwayMonths < 6) {
    score += 10;
  }

  // Effort inverse weight
  score += (10 - recommendation.effort) * 2;

  return Math.min(100, score);
}

export default {
  buildBaseRecommendations,
  getRecommendationCategories,
  getRecommendationByKey,
  calculatePriorityScore
};
