/**
 * Receipt & Coding Agent
 * Processes bills from Dext/e-Invoice and applies coding rules
 */

import BaseFinancialAgent from './BaseFinancialAgent.js';

class ReceiptCodingAgent extends BaseFinancialAgent {
  constructor(orchestrator) {
    super('ReceiptCodingAgent', orchestrator);
  }

  async processBill(payload) {
    const { billId, amount, supplier, source, description } = payload;

    try {
      // Apply vendor rules from policy
      const codingResult = this.applyCodingRules(supplier, description, amount);

      if (codingResult.confidence >= this.policy.thresholds.auto_post_bill_confidence) {
        // Auto-post bill to Xero
        await this.autoPostBill(billId, codingResult);

        await this.logAgentAction({
          action: 'auto_coded_bill',
          transaction_id: billId,
          supplier,
          amount,
          account: codingResult.account,
          confidence: codingResult.confidence
        });

        return {
          status: 'auto_posted',
          coding: codingResult,
          confidence: codingResult.confidence
        };
      } else {
        // Create approval request
        const approval = await this.requestApproval('post_bill', {
          billId,
          supplier,
          amount,
          suggestedCoding: codingResult
        });

        return {
          status: 'pending_approval',
          approvalId: approval.id,
          suggestedCoding: codingResult
        };
      }

    } catch (error) {
      console.error('Receipt coding processing error:', error);
      await this.handleProcessingError(billId, error);
      throw error;
    }
  }

  async processEInvoice(payload) {
    // e-Invoices have higher confidence threshold due to better data quality
    const { billId, amount, supplier, description } = payload;

    try {
      const codingResult = this.applyCodingRules(supplier, description, amount);

      // Higher confidence threshold for e-invoices
      const eInvoiceThreshold = this.policy.thresholds.auto_post_bill_confidence + 0.05;

      if (codingResult.confidence >= eInvoiceThreshold) {
        await this.autoPostBill(billId, codingResult);

        await this.logAgentAction({
          action: 'auto_coded_einvoice',
          transaction_id: billId,
          supplier,
          amount,
          source: 'eInvoice',
          confidence: codingResult.confidence
        });

        return {
          status: 'auto_posted',
          source: 'eInvoice',
          coding: codingResult
        };
      } else {
        // Even e-invoices may need approval for new suppliers
        const approval = await this.requestApproval('post_einvoice', {
          billId,
          supplier,
          amount,
          source: 'eInvoice',
          suggestedCoding: codingResult
        });

        return {
          status: 'pending_approval',
          source: 'eInvoice',
          approvalId: approval.id
        };
      }

    } catch (error) {
      console.error('E-invoice processing error:', error);
      await this.handleProcessingError(billId, error);
      throw error;
    }
  }

  applyCodingRules(supplier, description, amount) {
    const result = {
      account: null,
      taxCode: 'GST on Expenses',
      tracking: {},
      confidence: 0.0,
      reason: null
    };

    // Check vendor rules from policy
    const vendorRules = this.policy.vendor_rules || [];
    const matchingRule = vendorRules.find(rule =>
      supplier.toLowerCase().includes(rule.vendor.toLowerCase()) ||
      rule.vendor.toLowerCase().includes(supplier.toLowerCase())
    );

    if (matchingRule) {
      result.account = matchingRule.account;
      result.taxCode = matchingRule.tax_code;
      result.tracking = matchingRule.tracking || {};
      result.confidence = 0.95; // High confidence for known vendors
      result.reason = `Matched vendor rule: ${matchingRule.vendor}`;
      return result;
    }

    // Apply pattern-based rules
    const patterns = [
      {
        keywords: ['telstra', 'phone', 'mobile', 'telecommunications'],
        account: 'Telephone & Internet',
        confidence: 0.85
      },
      {
        keywords: ['aws', 'amazon web services', 'hosting', 'cloud'],
        account: 'Computer Expenses',
        confidence: 0.85
      },
      {
        keywords: ['google', 'gmail', 'workspace'],
        account: 'Computer Expenses',
        confidence: 0.85
      },
      {
        keywords: ['uber', 'taxi', 'transport', 'rideshare'],
        account: 'Motor Vehicle Expenses',
        confidence: 0.80
      },
      {
        keywords: ['coffee', 'cafe', 'restaurant', 'meal'],
        account: 'Meals & Entertainment',
        confidence: 0.75
      },
      {
        keywords: ['office', 'supplies', 'stationery'],
        account: 'Office Expenses',
        confidence: 0.80
      },
      {
        keywords: ['bunnings', 'hardware', 'tools', 'maintenance'],
        account: 'Repairs and Maintenance',
        confidence: 0.80
      }
    ];

    const searchText = `${supplier} ${description}`.toLowerCase();

    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => searchText.includes(keyword))) {
        result.account = pattern.account;
        result.confidence = pattern.confidence;
        result.reason = `Pattern match: ${pattern.keywords.join(', ')}`;
        break;
      }
    }

    // Default account for uncategorized
    if (!result.account) {
      result.account = 'General Expenses';
      result.confidence = 0.30;
      result.reason = 'Default categorization - requires manual review';
    }

    // Adjust confidence based on amount
    if (amount > 1000) {
      result.confidence -= 0.10; // Lower confidence for large amounts
    }

    return result;
  }

  async autoPostBill(billId, codingResult) {
    // In a real implementation, this would:
    // 1. Update the Xero bill with the coding
    // 2. Apply tracking categories
    // 3. Set the correct tax code

    // Store the coding decision
    const { error } = await this.supabase
      .from('xero_bills')
      .update({
        account_code: codingResult.account,
        tax_code: codingResult.taxCode,
        tracking_categories: codingResult.tracking,
        coding_confidence: codingResult.confidence,
        coded_by_agent: true,
        status: 'posted',
        updated_at: new Date().toISOString()
      })
      .eq('bill_id', billId);

    if (error) {
      throw new Error(`Failed to update bill coding: ${error.message}`);
    }

    console.log(`✅ Bill ${billId} auto-coded: ${codingResult.account} (${codingResult.confidence})`);
  }

  async getMetrics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get bills processed in last 30 days
    const { data: bills } = await this.supabase
      .from('xero_bills')
      .select('coding_confidence, coded_by_agent, amount')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const total = bills?.length || 0;
    const autoCoded = bills?.filter(bill =>
      bill.coded_by_agent &&
      bill.coding_confidence >= this.policy.thresholds.auto_post_bill_confidence
    ).length || 0;

    const totalValue = bills?.reduce((sum, bill) => sum + Math.abs(bill.amount), 0) || 0;

    return {
      total_processed: total,
      auto_coded_count: autoCoded,
      auto_coded_rate: total > 0 ? ((autoCoded / total) * 100).toFixed(2) : 0,
      total_value_processed: totalValue,
      avg_confidence: this.calculateAverageConfidence(bills),
      exceptions_created: await this.getExceptionCount('coding_required')
    };
  }

  calculateAverageConfidence(bills) {
    if (!bills || bills.length === 0) return 0;

    const confidenceSum = bills
      .filter(bill => bill.coding_confidence !== null)
      .reduce((sum, bill) => sum + bill.coding_confidence, 0);

    const confidenceBills = bills.filter(bill => bill.coding_confidence !== null);

    return confidenceBills.length > 0 ?
      (confidenceSum / confidenceBills.length).toFixed(2) : 0;
  }
}

export default ReceiptCodingAgent;