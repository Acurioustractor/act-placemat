/**
 * Policy Store Service
 * 
 * Manages business rules, thresholds, and policies for agent behavior.
 * Loads configuration from YAML files and provides runtime access.
 */

import { readFile, writeFile } from 'fs/promises';
import { parse, stringify } from 'js-yaml';
import { z } from 'zod';
import { Logger } from '../../utils/logger.js';
import { createSupabaseClient } from '../../config/supabase.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Policy schema for validation
const PolicySchema = z.object({
  version: z.number(),
  entities: z.array(z.object({
    code: z.string(),
    xero_tenant_id: z.string(),
    bank_accounts: z.array(z.object({
      name: z.string()
    })),
    tracking: z.record(z.array(z.string())).optional()
  })),
  thresholds: z.object({
    auto_post_bill_confidence: z.number().min(0).max(1),
    auto_match_bank_confidence: z.number().min(0).max(1),
    variance_alert_pct: z.number().min(0).max(1),
    payment_duedays_warning: z.number().positive()
  }),
  approvals: z.object({
    auto: z.array(z.object({
      rule: z.string()
    })).optional(),
    propose_only: z.array(z.object({
      rule: z.string()
    })).optional(),
    human_signoff: z.array(z.string()).optional()
  }),
  vendor_rules: z.array(z.object({
    vendor: z.string(),
    account: z.string(),
    tax_code: z.string(),
    tracking: z.record(z.string()).optional()
  })).optional(),
  privacy: z.object({
    data_minimisation: z.boolean(),
    retention_months: z.number().positive(),
    pii_access_roles: z.array(z.string())
  }),
  bas: z.object({
    lodgement_path: z.string(),
    frequency: z.enum(['monthly', 'quarterly'])
  }),
  rdti: z.object({
    year_end: z.string(),
    registration_deadline: z.string(),
    advisor_required: z.boolean()
  }),
  notifications: z.object({
    slack_channel: z.string().optional(),
    digest_times: z.array(z.string()).optional()
  }),
  allocations: z.object({
    gst_pct: z.number().min(0).max(100),
    tax_pct: z.number().min(0).max(100),
    profit_pct: z.number().min(0).max(100),
    opex_pct: z.number().min(0).max(100)
  }).optional(),
  payroll: z.object({
    directors: z.array(z.object({
      name: z.string(),
      annual_gross: z.number().positive()
    }))
  }).optional()
});

export class PolicyStore {
  constructor() {
    this.logger = new Logger('PolicyStore');
    this.supabase = createSupabaseClient();
    this.policy = null;
    this.policyPath = path.join(__dirname, '../../config/policy.yaml');
    this.lastLoaded = null;
    
    // Cache for parsed rules
    this.ruleCache = new Map();
    
    this.logger.info('📋 Policy Store initialized');
  }
  
  /**
   * Load policy from YAML file
   */
  async load() {
    try {
      // Try to load from file
      const yamlContent = await this.loadFromFile();
      if (yamlContent) {
        this.policy = parse(yamlContent);
        this.validatePolicy();
        this.lastLoaded = new Date();
        this.logger.info('Policy loaded from file');
        return;
      }
      
      // If no file, load from database
      const dbPolicy = await this.loadFromDatabase();
      if (dbPolicy) {
        this.policy = dbPolicy;
        this.validatePolicy();
        this.lastLoaded = new Date();
        this.logger.info('Policy loaded from database');
        return;
      }
      
      // If no policy found, use default
      this.policy = this.getDefaultPolicy();
      await this.save();
      this.logger.info('Default policy created');
      
    } catch (error) {
      this.logger.error('Failed to load policy:', error);
      throw error;
    }
  }
  
  /**
   * Load policy from file
   */
  async loadFromFile() {
    try {
      return await readFile(this.policyPath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return null;
    }
  }
  
  /**
   * Load policy from database
   */
  async loadFromDatabase() {
    try {
      const { data, error } = await this.supabase
        .from('system_policies')
        .select('policy_data')
        .eq('policy_type', 'agent_policy')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      return data?.policy_data;
    } catch (error) {
      this.logger.warn('Failed to load policy from database:', error);
      return null;
    }
  }
  
  /**
   * Save policy to file and database
   */
  async save() {
    try {
      // Validate before saving
      this.validatePolicy();
      
      // Save to file
      const yamlContent = stringify(this.policy, { indent: 2 });
      await writeFile(this.policyPath, yamlContent, 'utf8');
      
      // Save to database
      await this.supabase
        .from('system_policies')
        .insert({
          policy_type: 'agent_policy',
          policy_data: this.policy,
          version: this.policy.version,
          created_at: new Date().toISOString()
        });
      
      this.logger.info('Policy saved successfully');
    } catch (error) {
      this.logger.error('Failed to save policy:', error);
      throw error;
    }
  }
  
  /**
   * Validate policy against schema
   */
  validatePolicy() {
    try {
      PolicySchema.parse(this.policy);
    } catch (error) {
      throw new Error(`Invalid policy configuration: ${error.message}`);
    }
  }
  
  /**
   * Get default policy
   */
  getDefaultPolicy() {
    return {
      version: 1,
      entities: [
        {
          code: 'ACT_PTY_LTD',
          xero_tenant_id: process.env.XERO_TENANT_ID || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          bank_accounts: [
            { name: 'Thriday Main' },
            { name: 'Thriday GST' },
            { name: 'Thriday Tax' },
            { name: 'Thriday Profit' },
            { name: 'Thriday Opex' }
          ],
          tracking: {
            project_property: ['Seed House Witta', 'JusticeHub', 'ACT Core', 'Property SPV 1'],
            line_of_business: ['Consulting', 'Grants_Programs', 'Property_Ops', 'Digital_Products']
          }
        }
      ],
      thresholds: {
        auto_post_bill_confidence: 0.85,
        auto_match_bank_confidence: 0.90,
        variance_alert_pct: 0.20,
        payment_duedays_warning: 5
      },
      approvals: {
        auto: [
          { rule: 'bill.amount < 250 and vendor in known' },
          { rule: 'bank.transfer and description contains "Allocation"' }
        ],
        propose_only: [
          { rule: 'bill.amount >= 250' },
          { rule: 'new_bank_rule' },
          { rule: 'payment.amount >= 2000' }
        ],
        human_signoff: [
          'BAS_lodgement',
          'RDTI_registration',
          'payroll_finalisation'
        ]
      },
      vendor_rules: [
        {
          vendor: 'Telstra',
          account: 'Telephone & Internet',
          tax_code: 'GST on Expenses',
          tracking: {
            line_of_business: 'ACT Core'
          }
        }
      ],
      privacy: {
        data_minimisation: true,
        retention_months: 84,
        pii_access_roles: ['FinanceAdmin', 'Director']
      },
      bas: {
        lodgement_path: 'via_registered_agent',
        frequency: 'quarterly'
      },
      rdti: {
        year_end: '2025-06-30',
        registration_deadline: '2026-04-30',
        advisor_required: true
      },
      notifications: {
        slack_channel: '#finance',
        digest_times: ['09:00']
      },
      allocations: {
        gst_pct: 10,
        tax_pct: 25,
        profit_pct: 5,
        opex_pct: 60
      },
      payroll: {
        directors: [
          {
            name: 'Director A',
            annual_gross: 50000
          },
          {
            name: 'Director B',
            annual_gross: 50000
          }
        ]
      }
    };
  }
  
  /**
   * Get the current policy
   */
  async getPolicy() {
    if (!this.policy) {
      await this.load();
    }
    return this.policy;
  }
  
  /**
   * Get entity configuration
   */
  async getEntity(entityCode) {
    const policy = await this.getPolicy();
    return policy.entities.find(e => e.code === entityCode);
  }
  
  /**
   * Get thresholds
   */
  async getThresholds() {
    const policy = await this.getPolicy();
    return policy.thresholds;
  }
  
  /**
   * Get vendor rules
   */
  async getVendorRule(vendorName) {
    const policy = await this.getPolicy();
    return (policy.vendor_rules || []).find(rule => 
      rule.vendor.toLowerCase() === vendorName.toLowerCase()
    );
  }
  
  /**
   * Evaluate approval rules
   */
  async evaluateApprovalRules(context) {
    const policy = await this.getPolicy();
    
    // Check auto-approval rules
    if (policy.approvals.auto) {
      for (const rule of policy.approvals.auto) {
        if (await this.evaluateRule(rule.rule, context)) {
          return { decision: 'auto', rule: rule.rule };
        }
      }
    }
    
    // Check manual approval rules
    if (policy.approvals.propose_only) {
      for (const rule of policy.approvals.propose_only) {
        if (await this.evaluateRule(rule.rule, context)) {
          return { decision: 'propose', rule: rule.rule };
        }
      }
    }
    
    // Default to propose
    return { decision: 'propose', rule: 'default' };
  }
  
  /**
   * Evaluate a single rule
   */
  async evaluateRule(ruleString, context) {
    // Check cache
    const cacheKey = `${ruleString}-${JSON.stringify(context)}`;
    if (this.ruleCache.has(cacheKey)) {
      return this.ruleCache.get(cacheKey);
    }
    
    try {
      // Simple rule parser - this is a basic implementation
      // In production, use a proper rule engine
      const result = this.parseAndEvaluateRule(ruleString, context);
      
      // Cache result
      this.ruleCache.set(cacheKey, result);
      
      // Clear old cache entries if too many
      if (this.ruleCache.size > 1000) {
        const firstKey = this.ruleCache.keys().next().value;
        this.ruleCache.delete(firstKey);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Rule evaluation failed for "${ruleString}":`, error);
      return false;
    }
  }
  
  /**
   * Parse and evaluate a rule string
   */
  parseAndEvaluateRule(ruleString, context) {
    // Handle simple comparison rules
    // Examples:
    // - "bill.amount < 250"
    // - "vendor in known"
    // - "description contains 'Allocation'"
    
    // Extract field, operator, and value
    const patterns = [
      /(\w+(?:\.\w+)*)\s*(<|>|<=|>=|==|!=)\s*(\d+)/,
      /(\w+(?:\.\w+)*)\s+in\s+(\w+)/,
      /(\w+(?:\.\w+)*)\s+contains\s+"([^"]+)"/,
      /(\w+(?:\.\w+)*)\s+contains\s+'([^']+)'/
    ];
    
    for (const pattern of patterns) {
      const match = ruleString.match(pattern);
      if (match) {
        const field = match[1];
        const operator = match[2];
        const value = match[3] || match[2];
        
        const fieldValue = this.getFieldValue(context, field);
        
        switch (operator) {
          case '<':
            return fieldValue < parseFloat(value);
          case '>':
            return fieldValue > parseFloat(value);
          case '<=':
            return fieldValue <= parseFloat(value);
          case '>=':
            return fieldValue >= parseFloat(value);
          case '==':
            return fieldValue == value;
          case '!=':
            return fieldValue != value;
          case 'in':
            return this.checkInList(fieldValue, value, context);
          case 'contains':
            return fieldValue && fieldValue.toString().toLowerCase().includes(value.toLowerCase());
          default:
            return false;
        }
      }
    }
    
    // Handle compound rules
    if (ruleString.includes(' and ')) {
      const parts = ruleString.split(' and ');
      return parts.every(part => this.parseAndEvaluateRule(part.trim(), context));
    }
    
    if (ruleString.includes(' or ')) {
      const parts = ruleString.split(' or ');
      return parts.some(part => this.parseAndEvaluateRule(part.trim(), context));
    }
    
    return false;
  }
  
  /**
   * Get field value from context
   */
  getFieldValue(context, fieldPath) {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], context);
  }
  
  /**
   * Check if value is in a named list
   */
  checkInList(value, listName, context) {
    switch (listName) {
      case 'known':
        // Check if vendor is in known vendors
        return context.knownVendors?.includes(value);
      default:
        return false;
    }
  }
  
  /**
   * Get agent-specific policy
   */
  async getAgentPolicy(agentName) {
    const policy = await this.getPolicy();
    
    // Return relevant policy sections for the agent
    return {
      thresholds: policy.thresholds,
      approvals: policy.approvals,
      vendorRules: policy.vendor_rules,
      entities: policy.entities,
      notifications: policy.notifications
    };
  }
  
  /**
   * Update policy
   */
  async updatePolicy(updates) {
    const policy = await this.getPolicy();
    
    // Merge updates
    this.policy = {
      ...policy,
      ...updates,
      version: policy.version + 1
    };
    
    await this.save();
  }
  
  /**
   * Reload policy from source
   */
  async reload() {
    this.policy = null;
    this.ruleCache.clear();
    await this.load();
  }
  
  /**
   * Get health status
   */
  getHealth() {
    return {
      status: this.policy ? 'healthy' : 'unhealthy',
      lastLoaded: this.lastLoaded,
      version: this.policy?.version,
      ruleCacheSize: this.ruleCache.size
    };
  }
}

export default PolicyStore;