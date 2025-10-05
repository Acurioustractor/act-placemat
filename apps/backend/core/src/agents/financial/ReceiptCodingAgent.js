/**
 * Receipt & Coding Agent
 * 
 * Automatically codes bills and receipts from Dext/eInvoice with high accuracy.
 * Uses vendor rules, machine learning, and policy thresholds to determine
 * whether to auto-post or route for approval.
 */

import { BaseAgent } from '../base/BaseAgent.js';
import { getXeroAgentIntegration } from '../../services/xeroAgentIntegration.js';
import { z } from 'zod';

// Bill event schema
const BillEventSchema = z.object({
  billId: z.string(),
  supplier: z.string(),
  amount: z.number(),
  taxAmount: z.number().optional(),
  date: z.string(),
  dueDate: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().optional(),
    unitAmount: z.number(),
    taxAmount: z.number().optional(),
    accountCode: z.string().optional()
  })).optional(),
  attachments: z.array(z.object({
    attachmentId: z.string(),
    fileName: z.string(),
    mimeType: z.string()
  })).optional(),
  source: z.enum(['dext', 'eInvoice', 'manual']).optional()
});

export class ReceiptCodingAgent extends BaseAgent {
  constructor() {
    super({
      name: 'ReceiptCodingAgent',
      description: 'Automatically codes bills and receipts with intelligent account mapping',
      version: '1.0.0',
      enabled: true
    });
    
    // Xero integration
    this.xeroIntegration = getXeroAgentIntegration();
    
    // Learning cache for vendor patterns
    this.vendorPatterns = new Map();
    
    // Register event handlers
    this.on('bill_created', this.handleBillCreated.bind(this));
    this.on('bill_updated', this.handleBillUpdated.bind(this));
    
    this.logger.info('📄 Receipt & Coding Agent initialized');
  }
  
  /**
   * Handle bill created event
   */
  async handleBillCreated(event) {
    try {
      // Validate bill data
      const billData = BillEventSchema.parse(event.data);
      
      this.logger.info(`Processing new bill from ${billData.supplier}`, {
        billId: billData.billId,
        amount: billData.amount,
        source: billData.source
      });
      
      // Step 1: Apply deterministic vendor rules
      const vendorRule = await this.findVendorRule(billData.supplier);
      
      let codingResult;
      if (vendorRule) {
        codingResult = await this.applyVendorRule(billData, vendorRule);
      } else {
        // Step 2: Use AI/ML for intelligent coding
        codingResult = await this.intelligentCoding(billData);
      }
      
      // Step 3: Calculate confidence score
      const confidence = await this.calculateConfidence(codingResult, billData);
      
      // Step 4: Get policy thresholds
      const thresholds = await this.policy.getThresholds();
      const autoPostThreshold = billData.source === 'eInvoice' 
        ? thresholds.auto_post_bill_confidence + 0.05 // Higher confidence for eInvoices
        : thresholds.auto_post_bill_confidence;
      
      // Step 5: Determine action based on confidence
      if (confidence >= autoPostThreshold) {
        await this.autoPostBill(billData, codingResult);
      } else {
        await this.routeForApproval(billData, codingResult, confidence);
      }
      
      // Step 6: Learn from this coding
      await this.updateLearningModel(billData, codingResult);
      
      // Record metrics
      this.recordMetric('bills_processed', 1);
      this.recordMetric('auto_coding_confidence', confidence);
      
      return {
        billId: billData.billId,
        action: confidence >= autoPostThreshold ? 'auto_posted' : 'approval_required',
        confidence,
        coding: codingResult
      };
      
    } catch (error) {
      this.logger.error(`Failed to process bill:`, error);
      throw error;
    }
  }
  
  /**
   * Handle bill updated event
   */
  async handleBillUpdated(event) {
    // Similar to created, but check what changed
    const billData = BillEventSchema.parse(event.data);
    
    this.logger.info(`Bill updated: ${billData.billId}`);
    
    // Re-evaluate coding if significant changes
    if (event.changes?.includes('amount') || event.changes?.includes('supplier')) {
      return this.handleBillCreated(event);
    }
  }
  
  /**
   * Find vendor rule from policy
   */
  async findVendorRule(supplierName) {
    const policy = await this.policy.getPolicy();
    const vendorRules = policy.vendor_rules || [];
    
    // Exact match first
    let rule = vendorRules.find(r => 
      r.vendor.toLowerCase() === supplierName.toLowerCase()
    );
    
    // Partial match if no exact match
    if (!rule) {
      rule = vendorRules.find(r => 
        supplierName.toLowerCase().includes(r.vendor.toLowerCase())
      );
    }
    
    return rule;
  }
  
  /**
   * Apply vendor rule to bill
   */
  async applyVendorRule(billData, rule) {
    return {
      accountCode: rule.account,
      taxCode: rule.tax_code,
      tracking: rule.tracking || {},
      confidence: 0.95, // High confidence for rule-based coding
      method: 'vendor_rule'
    };
  }
  
  /**
   * Intelligent coding using AI/ML
   */
  async intelligentCoding(billData) {
    // Check learning cache first
    const cachedPattern = this.vendorPatterns.get(billData.supplier);
    if (cachedPattern && cachedPattern.count > 5) {
      return {
        ...cachedPattern.coding,
        confidence: Math.min(0.85, 0.7 + (cachedPattern.count * 0.01)),
        method: 'learned_pattern'
      };
    }
    
    // Use AI for coding suggestions
    const prompt = `Analyze this bill and suggest appropriate accounting codes for Australian business:
Supplier: ${billData.supplier}
Amount: $${billData.amount} (including GST)
Line Items: ${JSON.stringify(billData.lineItems || [])}

Based on the supplier name and items, suggest:
1. Account code (e.g., "Office Supplies", "Telephone & Internet", "Professional Fees")
2. GST tax code (usually "GST on Expenses" for most purchases)
3. Any relevant tracking categories

Respond in JSON format.`;
    
    try {
      const aiResponse = await this.queryAI(prompt);
      const suggestion = JSON.parse(aiResponse);
      
      return {
        accountCode: suggestion.accountCode || 'General Expenses',
        taxCode: suggestion.taxCode || 'GST on Expenses',
        tracking: suggestion.tracking || {},
        confidence: 0.75,
        method: 'ai_suggestion'
      };
      
    } catch (error) {
      this.logger.error('AI coding failed:', error);
      
      // Fallback to basic rules
      return this.basicCoding(billData);
    }
  }
  
  /**
   * Basic coding fallback
   */
  basicCoding(billData) {
    // Simple keyword-based coding
    const description = `${billData.supplier} ${JSON.stringify(billData.lineItems)}`.toLowerCase();
    
    const mappings = {
      'telstra|optus|vodafone|phone|mobile': 'Telephone & Internet',
      'office|supplies|stationery': 'Office Supplies',
      'uber|taxi|transport': 'Travel - Local',
      'hotel|accommodation': 'Travel - Accommodation',
      'restaurant|cafe|lunch|dinner': 'Entertainment',
      'software|subscription|saas': 'Software & Subscriptions',
      'insurance': 'Insurance',
      'rent': 'Rent',
      'electricity|power|energy': 'Utilities',
      'legal|lawyer|solicitor': 'Professional Fees - Legal',
      'account|bookkeep|tax': 'Professional Fees - Accounting'
    };
    
    for (const [keywords, account] of Object.entries(mappings)) {
      if (new RegExp(keywords).test(description)) {
        return {
          accountCode: account,
          taxCode: 'GST on Expenses',
          tracking: {},
          confidence: 0.6,
          method: 'keyword_match'
        };
      }
    }
    
    // Default
    return {
      accountCode: 'General Expenses',
      taxCode: 'GST on Expenses',
      tracking: {},
      confidence: 0.4,
      method: 'default'
    };
  }
  
  /**
   * Calculate confidence score
   */
  async calculateConfidence(codingResult, billData) {
    let confidence = codingResult.confidence || 0.5;
    
    // Boost confidence for certain factors
    if (billData.source === 'eInvoice') {
      confidence += 0.1; // eInvoices have better data quality
    }
    
    if (billData.attachments?.length > 0) {
      confidence += 0.05; // Has supporting documents
    }
    
    if (this.vendorPatterns.has(billData.supplier)) {
      confidence += 0.05; // Known vendor
    }
    
    // Cap at 0.99
    return Math.min(confidence, 0.99);
  }
  
  /**
   * Auto-post bill to Xero
   */
  async autoPostBill(billData, codingResult) {
    try {
      // Prepare Xero bill update
      const xeroUpdate = {
        AccountCode: codingResult.accountCode,
        TaxType: codingResult.taxCode,
        Status: 'AUTHORISED',
        TrackingCategories: this.formatTracking(codingResult.tracking)
      };
      
      // Log the action
      await this.logAuditEvent('bill_auto_posted', {
        billId: billData.billId,
        supplier: billData.supplier,
        amount: billData.amount,
        coding: codingResult
      });
      
      this.logger.info(`Bill auto-posted: ${billData.billId}`, {
        supplier: billData.supplier,
        account: codingResult.accountCode
      });
      
      // Update bill directly in Xero
      await this.xeroIntegration.updateBill(billData.billId, xeroUpdate);
      
    } catch (error) {
      this.logger.error('Failed to auto-post bill:', error);
      throw error;
    }
  }
  
  /**
   * Route bill for approval
   */
  async routeForApproval(billData, codingResult, confidence) {
    try {
      // Create approval request
      const approvalRequest = {
        type: 'bill_coding',
        billId: billData.billId,
        supplier: billData.supplier,
        amount: billData.amount,
        suggestedCoding: codingResult,
        confidence,
        reasons: this.getApprovalReasons(confidence, billData)
      };
      
      // Log the action
      await this.logAuditEvent('bill_approval_required', approvalRequest);
      
      this.logger.info(`Bill requires approval: ${billData.billId}`, {
        supplier: billData.supplier,
        confidence,
        method: codingResult.method
      });
      
      // Emit event for notification system
      this.emit('approval_required', approvalRequest);
      
    } catch (error) {
      this.logger.error('Failed to route for approval:', error);
      throw error;
    }
  }
  
  /**
   * Get reasons for requiring approval
   */
  getApprovalReasons(confidence, billData) {
    const reasons = [];
    
    if (confidence < 0.6) {
      reasons.push('Low confidence in coding suggestion');
    }
    
    if (!this.vendorPatterns.has(billData.supplier)) {
      reasons.push('New vendor');
    }
    
    if (billData.amount > 1000) {
      reasons.push('High value transaction');
    }
    
    return reasons;
  }
  
  /**
   * Update learning model with successful coding
   */
  async updateLearningModel(billData, codingResult) {
    const pattern = this.vendorPatterns.get(billData.supplier) || {
      coding: codingResult,
      count: 0,
      lastSeen: new Date()
    };
    
    pattern.count++;
    pattern.lastSeen = new Date();
    
    // Update coding if this was manually approved
    if (codingResult.method === 'manual_approval') {
      pattern.coding = codingResult;
    }
    
    this.vendorPatterns.set(billData.supplier, pattern);
    
    // Persist to database periodically
    if (pattern.count % 10 === 0) {
      await this.persistLearningData();
    }
  }
  
  /**
   * Persist learning data to database
   */
  async persistLearningData() {
    try {
      const learningData = Array.from(this.vendorPatterns.entries()).map(([vendor, pattern]) => ({
        vendor,
        pattern,
        agent: this.name
      }));
      
      await this.supabase
        .from('agent_learning_data')
        .upsert(learningData, { onConflict: 'vendor,agent' });
        
    } catch (error) {
      this.logger.error('Failed to persist learning data:', error);
    }
  }
  
  /**
   * Format tracking categories for Xero
   */
  formatTracking(tracking) {
    if (!tracking || Object.keys(tracking).length === 0) {
      return [];
    }
    
    return Object.entries(tracking).map(([name, option]) => ({
      Name: name,
      Option: option
    }));
  }
  
  /**
   * Get agent statistics
   */
  getStatistics() {
    const stats = {
      totalProcessed: this.state.metrics.bills_processed?.length || 0,
      averageConfidence: this.calculateAverageMetric('auto_coding_confidence'),
      vendorPatternsLearned: this.vendorPatterns.size,
      lastProcessed: this.state.lastRun
    };
    
    return stats;
  }
  
  /**
   * Calculate average metric value
   */
  calculateAverageMetric(metricName) {
    const values = this.state.metrics[metricName] || [];
    if (values.length === 0) return 0;
    
    const sum = values.reduce((acc, item) => acc + item.value, 0);
    return sum / values.length;
  }
}

export default ReceiptCodingAgent;