/**
 * Dext Integration Module
 * Handles automated receipt processing from Dext
 */

// Placeholder for Dext connector - in production would import from intelligence module
// import { DextConnector } from '../../../intelligence/src/connectors/DextConnector.js';

/**
 * Dext Integration Service
 * Processes receipts from Dext (automated receipt scanning)
 */
export class DextService {
  constructor() {
    this.configured = false;
    // this.dext = new DextConnector();
    this.initialize();
  }

  /**
   * Initialize Dext connection
   */
  async initialize() {
    // In production, would initialize actual Dext connector
    // if (this.dext && process.env.DEXT_API_KEY) {
    //   await this.dext.connect(process.env.DEXT_API_KEY);
    //   this.configured = true;
    // }
    console.log('Dext service initialized (placeholder)');
  }

  /**
   * Get recent processed receipts from Dext
   * @param {Object} options - Query options
   * @returns {Object} Receipts and error
   */
  async getReceipts(options = {}) {
    const { status = 'processed', fromDate, limit = 50 } = options;

    // Placeholder - would call actual Dext API
    // const { receipts, error } = await this.dext.getReceipts({ status, fromDate, limit });

    return { receipts: [], error: null };
  }

  /**
   * Get insights from Dext
   * @returns {Object} Tax and processing insights
   */
  async getInsights() {
    // Placeholder - would call actual Dext API
    return { taxSummary: { deductible: [] } };
  }

  /**
   * Process Dext receipts
   * @param {Function} findMatchingTransaction - Function to find matching transaction
   * @param {Function} attachReceipt - Function to attach receipt to transaction
   * @param {Function} aiCategorize - Function to categorize expense with AI
   * @returns {Object[]} Array of notifications
   */
  async processReceipts(findMatchingTransaction, attachReceipt, aiCategorize) {
    const notifications = [];

    if (!this.configured) {
      console.log('Dext not configured - skipping automated receipt processing');
      return notifications;
    }

    try {
      console.log('Processing Dext receipts...');

      const { receipts, error } = await this.getReceipts({
        status: 'processed',
        fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        limit: 50
      });

      if (error) {
        console.error('Dext fetch error:', error);
        return notifications;
      }

      for (const receipt of receipts) {
        try {
          const matchedTx = await findMatchingTransaction(receipt);

          if (matchedTx) {
            await attachReceipt(receipt, matchedTx);

            notifications.push({
              type: 'dext_receipt_auto_matched',
              priority: 'low',
              message: `Dext receipt auto-matched: ${receipt.supplier} - $${receipt.total}`,
              receipt,
              transaction: matchedTx,
              confidence: matchedTx.confidence || 0.85
            });
          } else if (receipt.total > 50) {
            notifications.push({
              type: 'dext_receipt_needs_matching',
              priority: 'medium',
              message: `Dext receipt needs matching: ${receipt.supplier} - $${receipt.total}`,
              receipt,
              action: 'Review and match with transaction'
            });
          }

          // Check for expense categorization
          if (!receipt.category || receipt.category === 'Uncategorized') {
            const suggestedCategory = await aiCategorize({
              amount: receipt.total,
              contact_name: receipt.supplier,
              description: receipt.description || receipt.lineItems?.map(i => i.description).join(', '),
              txn_date: receipt.date
            });

            if (suggestedCategory.confidence > 0.8) {
              notifications.push({
                type: 'dext_receipt_categorized',
                priority: 'low',
                message: `Dext receipt categorized: ${receipt.supplier} as ${suggestedCategory.category}`,
                receipt,
                category: suggestedCategory
              });
            }
          }

        } catch (error) {
          console.error('Error processing Dext receipt:', receipt.id, error);
        }
      }

      // Check Dext processing status
      const insights = await this.getInsights();
      if (insights.taxSummary?.deductible?.length > 0) {
        notifications.push({
          type: 'dext_tax_deductible_summary',
          priority: 'low',
          message: `${insights.taxSummary.deductible.length} tax-deductible receipts processed by Dext`,
          insights
        });
      }

    } catch (error) {
      console.error('Dext processing error:', error);
      notifications.push({
        type: 'dext_processing_error',
        priority: 'medium',
        message: 'Dext receipt processing encountered errors',
        error: error.message,
        action: 'Check Dext connection and API status'
      });
    }

    return notifications;
  }
}

// Singleton instance
let dextServiceInstance = null;

export function getDextService() {
  if (!dextServiceInstance) {
    dextServiceInstance = new DextService();
  }
  return dextServiceInstance;
}

export default DextService;
