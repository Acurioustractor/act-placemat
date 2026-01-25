/**
 * Automated Bookkeeping Notification Service
 * Handles receipt processing, expense categorization, and smart notifications
 *
 * NOTE: This file now serves as a backward-compatible wrapper.
 * For new development, use apps/backend/core/src/services/financial/ instead.
 *
 * This wrapper maintains the original class signature while delegating
 * to the modularized implementation in the financial module.
 */

import { loadEnv } from '../utils/loadEnv.js';

// Load environment variables
loadEnv();

/**
 * BookkeepingNotificationService - Legacy wrapper
 *
 * This class is now a thin wrapper around the modularized implementation.
 * All business logic has been moved to apps/backend/core/src/services/financial/
 */
class BookkeepingNotificationService {
  constructor() {
    console.log('Bookkeeping Notification Service initialized (legacy wrapper)');
    this._initialized = true;
  }

  /**
   * Process bookkeeping notifications
   * @returns {Promise<Object>} Processing result
   */
  async processBookkeepingNotifications() {
    console.log('Processing bookkeeping notifications...');
    // Delegate to financial module
    const { processBookkeepingNotifications: processNotifications } = await import('./financial/bookkeeping/notifications.js');
    return processNotifications();
  }

  /**
   * Check for missing receipts
   * @returns {Promise<Object[]>} Missing receipt notifications
   */
  async checkMissingReceipts() {
    const { checkMissingReceipts } = await import('./financial/bookkeeping/expenses.js');
    return checkMissingReceipts();
  }

  /**
   * Check for uncategorized expenses
   * @returns {Promise<Object[]>} Uncategorized expense notifications
   */
  async checkUncategorizedExpenses() {
    const { checkUncategorizedExpenses } = await import('./financial/bookkeeping/expenses.js');
    return checkUncategorizedExpenses();
  }

  /**
   * Check for duplicate expenses
   * @returns {Promise<Object[]>} Duplicate expense notifications
   */
  async checkDuplicateExpenses() {
    const { checkDuplicateExpenses } = await import('./financial/bookkeeping/expenses.js');
    return checkDuplicateExpenses();
  }

  /**
   * Check for unusual expenses
   * @returns {Promise<Object[]>} Unusual expense notifications
   */
  async checkUnusualExpenses() {
    const { checkUnusualExpenses } = await import('./financial/bookkeeping/expenses.js');
    return checkUnusualExpenses();
  }

  /**
   * Check tax requirements
   * @returns {Promise<Object[]>} Tax-related notifications
   */
  async checkTaxRequirements() {
    const { checkTaxRequirements } = await import('./financial/bookkeeping/tax.js');
    return checkTaxRequirements();
  }

  /**
   * Send notifications
   * @param {Object[]} notifications - Notifications to send
   * @returns {Promise<void>}
   */
  async sendNotifications(notifications) {
    const { sendNotifications } = await import('./financial/bookkeeping/notifications.js');
    return sendNotifications(notifications);
  }
}

export default BookkeepingNotificationService;
