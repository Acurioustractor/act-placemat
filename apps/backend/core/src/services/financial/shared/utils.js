/**
 * Shared Type Definitions for Financial Module
 * TypeScript-style type definitions for financial services
 */

/**
 * @typedef {Object} NotificationConfig
 * @property {number} receiptMissing - Days before notifying about missing receipt
 * @property {number} expenseUncategorized - Days before notifying about uncategorized expense
 * @property {number} largeExpenseThreshold - Amount requiring immediate notification
 * @property {number} duplicateCheckWindow - Days to check for duplicates
 * @property {number} taxDeadlineWarning - Days before tax deadline to notify
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id - Transaction ID
 * @property {string} amount - Transaction amount
 * @property {string} contact_name - Vendor or customer name
 * @property {string} description - Transaction description
 * @property {string} txn_date - Transaction date
 * @property {string} category - Transaction category
 * @property {string} direction - 'spent' or 'received'
 * @property {string} receipt_url - URL to receipt attachment
 */

/**
 * @typedef {Object} Receipt
 * @property {string} id - Receipt ID
 * @property {string} supplier - Vendor name
 * @property {string} total - Receipt total
 * @property {string} date - Receipt date
 * @property {string} description - Receipt description
 * @property {string} imageUrl - URL to receipt image
 * @property {string} category - Receipt category
 */

/**
 * @typedef {Object} Notification
 * @property {string} type - Notification type
 * @property {string} priority - 'high', 'medium', or 'low'
 * @property {string} message - Notification message
 * @property {Object} transaction - Related transaction (if applicable)
 * @property {Object} receipt - Related receipt (if applicable)
 * @property {string} action - Suggested action
 */

/**
 * @typedef {Object} FinancialMetrics
 * @property {number} income - Total income
 * @property {number} expenses - Total expenses
 * @property {number} net - Net income
 * @property {number} burnRate - Monthly burn rate
 * @property {number} cashBalance - Current cash balance
 * @property {number} runwayMonths - Months of runway
 * @property {number} receivablesTotal - Outstanding receivables
 * @property {number} payablesTotal - Outstanding payables
 */

/**
 * @typedef {Object} Recommendation
 * @property {string} key - Recommendation key
 * @property {string} title - Recommendation title
 * @property {string} description - Recommendation description
 * @property {string} category - Category
 * @property {string} priority - Priority level
 * @property {number} impact - Impact score
 * @property {number} effort - Implementation effort
 * @property {string[]} actionableSteps - Steps to take
 */

/**
 * @typedef {Object} AlertRule
 * @property {string} name - Rule name
 * @property {string} condition - Condition to trigger alert
 * @property {string} severity - Alert severity
 * @property {string} action - Action to take
 */

/**
 * @typedef {Object} DashboardWidget
 * @property {string} id - Widget ID
 * @property {string} title - Widget title
 * @property {string} type - Widget type
 * @property {Object} data - Widget data
 * @property {Object} position - Widget position
 * @property {number} refresh_interval - Refresh interval in ms
 */

/**
 * @typedef {Object} DashboardConfig
 * @property {Object} refresh_intervals - Refresh intervals by metric type
 * @property {Object} widget_layout - Widget layout configuration
 */

/**
 * @typedef {Object} XeroSyncResult
 * @property {boolean} success - Whether sync was successful
 * @property {number} contacts - Number of contacts synced
 * @property {number} invoices - Number of invoices synced
 * @property {number} transactions - Number of transactions synced
 * @property {number} duration - Sync duration in ms
 */

/**
 * @typedef {Object} CategorySuggestion
 * @property {string} category - Suggested category
 * @property {number} confidence - Confidence score
 * @property {string} reason - Reason for suggestion
 * @property {string} source - 'rule', 'heuristic', or 'ai'
 */

/**
 * @typedef {Object} MatchResult
 * @property {Object} transaction - Matched transaction
 * @property {number} score - Match score
 * @property {string[]} reasons - Reasons for match
 */

/**
 * @typedef {Object} BASData
 * @property {number} gstOnSales - GST collected
 * @property {number} gstOnPurchases - GST paid
 * @property {number} netGST - Net GST payable
 * @property {string} status - BAS status
 */
