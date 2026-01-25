/**
 * Shared Constants for Financial Module
 * Centralized configuration for notification rules, thresholds, and business rules
 */

/**
 * Notification timing configurations
 */
export const NOTIFICATION_TIMING = {
  receiptMissingDays: 7,
  expenseUncategorizedDays: 3,
  duplicateCheckWindowDays: 7,
  taxDeadlineWarningDays: 14,
  notificationCooldownHours: 24,
  cleanupAfterDays: 7
};

/**
 * Expense thresholds and limits
 */
export const EXPENSE_THRESHOLDS = {
  largeExpenseThreshold: 1000,
  significantVendorPercentage: 0.3,
  unusualExpenseMultiplier: 2,
  minimumTransactionsForAnalysis: 3,
  receiptAutoMatchThreshold: 0.7,
  matchScoreMinimum: 0.3
};

/**
 * Category patterns for expense classification
 */
export const CATEGORY_PATTERNS = [
  { pattern: /ubereats|uber|lyft|taxi|cab/i, category: 'Travel' },
  { pattern: /qantas|airways|airline|flight/i, category: 'Travel' },
  { pattern: /coffee|cafe|espresso|latte/i, category: 'Meals & Entertainment' },
  { pattern: /aws|amazon web services|google cloud|gcp|azure/i, category: 'Cloud Services' },
  { pattern: /atlassian|figma|notion|slack|zoom/i, category: 'Software Subscriptions' },
  { pattern: /insurance|premium|policy/i, category: 'Insurance' },
  { pattern: /officeworks|stationery|printer/i, category: 'Office Expenses' },
  { pattern: /donation|charity|givewell|fundraiser/i, category: 'Donations' }
];

/**
 * BAS (Business Activity Statement) deadlines for Australian tax compliance
 */
export const TAX_DEADLINES = {
  quarters: [
    { index: 0, deadlineMonth: 2, name: 'Q3 (Oct-Dec)' },    // February 28
    { index: 1, deadlineMonth: 5, name: 'Q4 (Jan-Mar)' },    // May 28
    { index: 2, deadlineMonth: 8, name: 'Q1 (Apr-Jun)' },    // August 28
    { index: 3, deadlineMonth: 11, name: 'Q2 (Jul-Sep)' }    // November 28
  ]
};

/**
 * Expense categories for Australian business expenses
 */
export const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals & Entertainment',
  'Cloud Services',
  'Software Subscriptions',
  'Insurance',
  'Office Expenses',
  'Donations',
  'Professional Services',
  'Utilities',
  'Rent',
  'Marketing',
  'Other'
];

/**
 * Dashboard refresh intervals (in milliseconds)
 */
export const DASHBOARD_REFRESH_INTERVALS = {
  financial_metrics: 300000,      // 5 minutes
  operational_metrics: 600000,    // 10 minutes
  opportunity_scanning: 3600000,  // 1 hour
  compliance_monitoring: 86400000 // 24 hours
};

/**
 * Alert severity levels
 */
export const ALERT_SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Cache TTL configurations
 */
export const CACHE_TTL = {
  RULES_MS: 5 * 60 * 1000,        // 5 minutes for categorisation rules
  DASHBOARD_SEC: 300,             // 5 minutes for dashboard cache
  METRICS_MS: 300000              // 5 minutes for metrics
};

/**
 * Default confidence scores for categorization
 */
export const CONFIDENCE_SCORES = {
  RULE_MATCH: 0.85,
  HEURISTIC_MATCH: 0.6,
  AI_FALLBACK: 0.55,
  FALLBACK: 0.3
};

/**
 * Transaction types
 */
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  RECEIVE: 'receive',
  SPEND: 'spend'
};

/**
 * Xero invoice types
 */
export const XERO_INVOICE_TYPES = {
  SALES: 'ACCREC',  // Accounts Receivable
  PURCHASE: 'ACCPAY' // Accounts Payable
};

/**
 * Matching tolerance settings
 */
export const MATCHING_TOLERANCE = {
  amountPercentage: 0.05,
  amountAbsolute: 2,
  dateDays: 3,
  dateWindowDays: 7
};
