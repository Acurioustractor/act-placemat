/**
 * Bookkeeping Module
 * Consolidates all bookkeeping services: notifications, receipts, expenses, Dext, matching, tax
 */

export { default as BookkeepingNotificationService } from './notifications.js';
export { default as ReceiptService } from './receipts.js';
export { default as ExpenseService } from './expenses.js';
export { default as DextService, getDextService } from './dext.js';
export { default as MatchingService } from './matching.js';
export { default as TaxService } from './tax.js';

// Re-export individual functions for convenience
export * from './receipts.js';
export * from './expenses.js';
export * from './notifications.js';
export * from './matching.js';
export * from './tax.js';
