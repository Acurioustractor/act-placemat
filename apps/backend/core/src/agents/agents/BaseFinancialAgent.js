/**
 * Base Financial Agent - Common functionality for all financial agents
 */

import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

class BaseFinancialAgent {
  constructor(name, orchestrator) {
    this.name = name;
    this.orchestrator = orchestrator;
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.policy = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.policy = this.orchestrator.policy;
      this.initialized = true;
      await this.setupAgentSpecificConfig();
      return true;
    } catch (error) {
      console.error(`Failed to initialize ${this.name}:`, error);
      throw error;
    }
  }

  async setupAgentSpecificConfig() {
    // Override in subclasses for specific setup
  }

  async logAgentAction(actionData) {
    const logEntry = {
      agent_name: this.name,
      timestamp: new Date().toISOString(),
      ...actionData
    };

    // Store in Redis for immediate access
    await this.redis.lpush(`agent:${this.name}:actions`, JSON.stringify(logEntry));
    await this.redis.ltrim(`agent:${this.name}:actions`, 0, 999); // Keep last 1000 actions

    // Store in Supabase for permanent audit trail
    const { error } = await this.supabase
      .from('agent_actions')
      .insert(logEntry);

    if (error) {
      console.error(`Failed to log action for ${this.name}:`, error);
    }

    return logEntry;
  }

  async handleProcessingError(itemId, error) {
    const errorLog = {
      agent_name: this.name,
      item_id: itemId,
      error_message: error.message,
      error_stack: error.stack,
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('agent:errors', JSON.stringify(errorLog));

    // Create exception for manual review
    await this.supabase
      .from('financial_exceptions')
      .insert({
        item_id: itemId,
        exception_type: 'processing_error',
        agent_name: this.name,
        error_details: JSON.stringify(errorLog),
        status: 'pending',
        created_at: new Date().toISOString()
      });

    // Send alert notification
    await this.orchestrator.sendNotification(
      null,
      `⚠️ ${this.name} processing error: ${itemId} - ${error.message}`,
      [{ text: 'Review Error', url: `/finance/exceptions/${itemId}` }]
    );
  }

  async createManualReviewTask(itemId, payload) {
    const task = {
      item_id: itemId,
      agent_name: this.name,
      task_type: 'manual_review',
      payload: JSON.stringify(payload),
      status: 'pending',
      priority: 'medium',
      created_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('manual_review_tasks')
      .insert(task);

    if (error) {
      console.error(`Failed to create manual review task for ${this.name}:`, error);
    }

    return task;
  }

  async checkApprovalRequired(action, metadata) {
    const { approvals } = this.policy;

    // Check auto-approval rules
    for (const rule of approvals.auto || []) {
      if (this.evaluateRule(rule.rule, action, metadata)) {
        return { required: false, reason: 'auto_approved', rule: rule.rule };
      }
    }

    // Check propose-only rules
    for (const rule of approvals.propose_only || []) {
      if (this.evaluateRule(rule.rule, action, metadata)) {
        return { required: true, type: 'propose', reason: 'requires_proposal', rule: rule.rule };
      }
    }

    // Check human sign-off rules
    for (const requirement of approvals.human_signoff || []) {
      if (action.includes(requirement) || metadata.type === requirement) {
        return { required: true, type: 'human_signoff', reason: 'statutory_requirement', rule: requirement };
      }
    }

    // Default to requiring approval for safety
    return { required: true, type: 'default', reason: 'no_matching_rule' };
  }

  evaluateRule(ruleString, action, metadata) {
    try {
      // Simple rule evaluation - could be enhanced with a proper rules engine
      const rule = ruleString.toLowerCase();

      // Handle amount comparisons
      if (rule.includes('amount') && metadata.amount !== undefined) {
        const amountMatch = rule.match(/amount\s*([<>=]+)\s*(\d+)/);
        if (amountMatch) {
          const operator = amountMatch[1];
          const threshold = parseFloat(amountMatch[2]);
          const amount = Math.abs(metadata.amount);

          switch (operator) {
            case '<':
              return amount < threshold;
            case '<=':
              return amount <= threshold;
            case '>':
              return amount > threshold;
            case '>=':
              return amount >= threshold;
            case '==':
            case '=':
              return amount === threshold;
            default:
              return false;
          }
        }
      }

      // Handle description/vendor matching
      if (rule.includes('vendor') && metadata.vendor) {
        const vendorMatch = rule.match(/vendor\s+in\s+(\w+)/);
        if (vendorMatch) {
          const vendorType = vendorMatch[1];
          return this.isKnownVendor(metadata.vendor, vendorType);
        }
      }

      // Handle description pattern matching
      if (rule.includes('description contains') && metadata.description) {
        const pattern = rule.match(/description contains\s+"([^"]+)"/);
        if (pattern) {
          return metadata.description.toLowerCase().includes(pattern[1].toLowerCase());
        }
      }

      return false;
    } catch (error) {
      console.warn(`Rule evaluation error for "${ruleString}":`, error);
      return false;
    }
  }

  isKnownVendor(vendor, vendorType) {
    // Check against vendor rules in policy
    const vendorRules = this.policy.vendor_rules || [];
    const knownVendors = vendorRules.map(rule => rule.vendor.toLowerCase());
    return knownVendors.includes(vendor.toLowerCase());
  }

  async getExceptionCount(type) {
    const { data } = await this.supabase
      .from('financial_exceptions')
      .select('id')
      .eq('agent_name', this.name)
      .eq('exception_type', type)
      .eq('status', 'pending');

    return data?.length || 0;
  }

  async requestApproval(action, metadata, approvalType = 'propose') {
    const approval = {
      agent_name: this.name,
      action,
      metadata: JSON.stringify(metadata),
      approval_type: approvalType,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('approval_requests')
      .insert(approval)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create approval request: ${error.message}`);
    }

    // Send notification with approval buttons
    const actionButtons = [
      {
        text: 'Approve',
        action: 'approve',
        style: 'primary',
        approvalId: data.id
      },
      {
        text: 'Reject',
        action: 'reject',
        style: 'danger',
        approvalId: data.id
      },
      {
        text: 'Explain',
        action: 'explain',
        approvalId: data.id
      }
    ];

    await this.orchestrator.sendNotification(
      null,
      `🔐 ${this.name} requires approval: ${action}`,
      actionButtons
    );

    return data;
  }

  async waitForApproval(approvalId, timeoutMs = 24 * 60 * 60 * 1000) {
    // Wait for approval with timeout (default 24 hours)
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const { data } = await this.supabase
        .from('approval_requests')
        .select('status, approved_by, approved_at, rejection_reason')
        .eq('id', approvalId)
        .single();

      if (data && data.status === 'approved') {
        return { approved: true, approvedBy: data.approved_by, approvedAt: data.approved_at };
      }

      if (data && data.status === 'rejected') {
        return { approved: false, rejectionReason: data.rejection_reason };
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Timeout reached
    return { approved: false, rejectionReason: 'approval_timeout' };
  }

  async shutdown() {
    if (this.redis) {
      await this.redis.quit();
    }
    console.log(`${this.name} shutdown complete`);
  }

  // Utility methods for common operations
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString('en-AU');
  }

  calculateGST(amount, inclusive = true) {
    if (inclusive) {
      return amount / 11; // 10% GST inclusive
    } else {
      return amount * 0.1; // 10% GST exclusive
    }
  }
}

export default BaseFinancialAgent;