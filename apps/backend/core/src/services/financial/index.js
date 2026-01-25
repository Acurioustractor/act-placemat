/**
 * Financial Services Module
 * Aggregates all financial services into a unified module structure
 *
 * Directory Structure:
 * financial/
 * ├── bookkeeping/      # Notification, receipt, expense, Dext, matching, tax services
 * ├── dashboard/        # Dashboard configuration, generators, metrics, monitoring
 * ├── recommendations/  # Recommendation engine and rules
 * ├── categorizer/      # Expense categorization
 * ├── xero/            # Xero sync services
 * ├── shared/          # Shared constants and utilities
 * └── index.js         # Main export aggregator
 */

// Bookkeeping Module
export * from './bookkeeping/index.js';
export { default as BookkeepingNotificationService } from './bookkeeping/notifications.js';

// Dashboard Module
export * from './dashboard/index.js';
export { default as BusinessDashboard } from './dashboard/service.js';

// Recommendations Module
export * from './recommendations/index.js';
export {
  refreshFinancialRecommendations,
  listFinancialRecommendations,
  updateFinancialRecommendation
} from './recommendations/service.js';

// Categorizer Module
export * from './categorizer/index.js';
export {
  suggestCategoryForTransaction,
  getActiveCategorisationRules,
  invalidateCategorisationRuleCache
} from './categorizer/categorizer.js';

// Xero Module
export * from './xero/index.js';
export { default as XeroIntelligenceSync, getXeroSyncService } from './xero/sync.js';

// Shared utilities
export * from './shared/constants.js';
export * from './shared/utils.js';

// Re-export for convenience
export { mapPriorityLevel, mapImplementationComplexity, normalizeRecommendationRow } from './recommendations/engine.js';
export { buildBaseRecommendations, calculatePriorityScore } from './recommendations/rules.js';
export { applyHeuristics, getDefaultHeuristics, getAvailableCategories } from './categorizer/categorizer.js';
export { evaluateAlertCondition, checkAlerts, sortAlertsByPriority } from './dashboard/alerts.js';
export { initializeDashboardConfig, getDashboardConfigByType, DASHBOARD_TYPES } from './dashboard/config.js';
export { generateDashboard, generateExecutiveDashboard, generateFinancialDashboard } from './dashboard/generators.js';
export { getRevenueOverview, getCashFlowStatus, getBusinessHealthScore } from './dashboard/metrics.js';
export { startAutomatedMonitoring, getMonitoringStatus } from './dashboard/monitoring.js';
export { attachReceiptToTransaction, findMatchingTransaction, calculateNameSimilarity } from './bookkeeping/receipts.js';
export { checkMissingReceipts, checkUncategorizedExpenses, checkDuplicateExpenses } from './bookkeeping/expenses.js';
export { getNextBASDeadline, getQuarterStart, calculateGSTSummary } from './bookkeeping/tax.js';

/**
 * Create a configured instance of all financial services
 * @param {Object} options - Configuration options
 * @returns {Object} Configured service instances
 */
export function createFinancialServices(options = {}) {
  return {
    bookkeeping: {},
    dashboard: {},
    recommendations: {},
    categorizer: {},
    xero: {}
  };
}

export default {
  // Re-export all modules
  ...require('./bookkeeping/index.js'),
  ...require('./dashboard/index.js'),
  ...require('./recommendations/index.js'),
  ...require('./categorizer/index.js'),
  ...require('./xero/index.js'),

  // Main exports
  BookkeepingNotificationService,
  BusinessDashboard,
  XeroIntelligenceSync,
  getXeroSyncService,

  // Utility functions
  createFinancialServices
};
