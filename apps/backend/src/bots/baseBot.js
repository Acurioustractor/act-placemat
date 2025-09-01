/**
 * Base Bot Class - Foundation for all ACT Universal Bot Platform bots
 * Provides common functionality, interfaces, and integration points
 */

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';

export class BaseBot extends EventEmitter {
  constructor(config) {
    super();
    
    // Bot configuration
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.capabilities = config.capabilities || [];
    this.requiredPermissions = config.requiredPermissions || [];
    this.version = config.version || '1.0.0';
    
    // Bot state
    this.status = 'initializing';
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0
    };
    
    // Learning state
    this.learningEnabled = config.learningEnabled !== false;
    this.learningData = new Map();
    
    // Initialize connections
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.initialize();
  }

  /**
   * Initialize the bot
   */
  async initialize() {
    try {
      console.log(`🤖 Initializing ${this.name}...`);
      
      // Load bot-specific configuration
      await this.loadConfiguration();
      
      // Load learning data if enabled
      if (this.learningEnabled) {
        await this.loadLearningData();
      }
      
      // Set up event handlers
      this.setupEventHandlers();
      
      this.status = 'ready';
      console.log(`✅ ${this.name} initialized successfully`);
      
      this.emit('initialized', { bot: this.id, status: 'ready' });
      
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.name}:`, error);
      this.status = 'error';
      this.emit('error', { bot: this.id, error: error.message });
    }
  }

  /**
   * Main execution method - must be implemented by subclasses
   */
  async execute(action, params, context) {
    throw new Error('Execute method must be implemented by subclass');
  }

  /**
   * Validate input parameters
   */
  async validate(params) {
    // Default validation - can be overridden
    return {
      valid: true,
      errors: []
    };
  }

  /**
   * Audit bot actions for compliance and tracking
   */
  async audit(action, data, context) {
    try {
      const auditEntry = {
        bot_id: this.id,
        action,
        data,
        context: {
          user_id: context.userId,
          tenant_id: context.tenantId,
          workflow_id: context.workflowId,
          request_id: context.requestId
        },
        timestamp: new Date(),
        version: this.version
      };
      
      // Store in database
      const { error } = await this.supabase
        .from('bot_audit_log')
        .insert(auditEntry);
      
      if (error) {
        console.error('Failed to create audit log:', error);
      }
      
      // Emit audit event
      this.emit('audit', auditEntry);
      
      return auditEntry;
      
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Learn from execution results
   */
  async learn(execution, result, feedback) {
    if (!this.learningEnabled) return;
    
    try {
      const learningEntry = {
        execution,
        result,
        feedback,
        timestamp: new Date()
      };
      
      // Store learning data
      const key = `${execution.action}-${execution.params}`;
      const existingData = this.learningData.get(key) || [];
      existingData.push(learningEntry);
      this.learningData.set(key, existingData);
      
      // Persist to database
      await this.persistLearningData(learningEntry);
      
      // Apply learning to improve future executions
      await this.applyLearning(learningEntry);
      
      this.emit('learned', { bot: this.id, learning: learningEntry });
      
    } catch (error) {
      console.error('Learning process failed:', error);
    }
  }

  /**
   * Export bot configuration and state for community ownership
   */
  async export() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      capabilities: this.capabilities,
      requiredPermissions: this.requiredPermissions,
      configuration: await this.getConfiguration(),
      learningData: this.learningEnabled ? Array.from(this.learningData.entries()) : null,
      metrics: this.metrics,
      exportedAt: new Date()
    };
  }

  /**
   * Import bot configuration and state
   */
  async import(data) {
    try {
      // Validate import data
      if (!data.id || data.id !== this.id) {
        throw new Error('Invalid import data: Bot ID mismatch');
      }
      
      // Import configuration
      if (data.configuration) {
        await this.setConfiguration(data.configuration);
      }
      
      // Import learning data
      if (data.learningData && this.learningEnabled) {
        this.learningData = new Map(data.learningData);
      }
      
      // Import metrics
      if (data.metrics) {
        this.metrics = { ...this.metrics, ...data.metrics };
      }
      
      console.log(`✅ Successfully imported data for ${this.name}`);
      return true;
      
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  /**
   * Get bot health status
   */
  getHealth() {
    return {
      bot: this.id,
      status: this.status,
      metrics: this.metrics,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      lastExecution: this.lastExecution || null
    };
  }

  /**
   * Check if bot has required permissions
   */
  hasPermission(permission) {
    return this.requiredPermissions.includes(permission);
  }

  /**
   * Check if bot has a specific capability
   */
  hasCapability(capability) {
    return this.capabilities.includes(capability);
  }

  /**
   * Update bot metrics
   */
  updateMetrics(execution) {
    this.metrics.totalExecutions++;
    
    if (execution.success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }
    
    // Update average execution time
    const totalTime = this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) + execution.duration;
    this.metrics.averageExecutionTime = totalTime / this.metrics.totalExecutions;
    
    this.lastExecution = {
      timestamp: new Date(),
      action: execution.action,
      success: execution.success,
      duration: execution.duration
    };
  }

  /**
   * Protected methods for subclasses
   */
  
  async loadConfiguration() {
    // Load bot-specific configuration from database
    const { data } = await this.supabase
      .from('bot_configurations')
      .select('*')
      .eq('bot_id', this.id)
      .single();
    
    if (data) {
      this.configuration = data.configuration;
    }
  }

  async getConfiguration() {
    return this.configuration || {};
  }

  async setConfiguration(config) {
    this.configuration = config;
    
    // Persist to database
    await this.supabase
      .from('bot_configurations')
      .upsert({
        bot_id: this.id,
        configuration: config,
        updated_at: new Date()
      });
  }

  async loadLearningData() {
    // Load historical learning data
    const { data } = await this.supabase
      .from('bot_learning_data')
      .select('*')
      .eq('bot_id', this.id)
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (data) {
      // Group by action-params key
      for (const entry of data) {
        const key = `${entry.action}-${JSON.stringify(entry.params)}`;
        const existing = this.learningData.get(key) || [];
        existing.push(entry);
        this.learningData.set(key, existing);
      }
    }
  }

  async persistLearningData(entry) {
    await this.supabase
      .from('bot_learning_data')
      .insert({
        bot_id: this.id,
        ...entry
      });
  }

  async applyLearning(learningEntry) {
    // Default learning application - can be overridden by subclasses
    // This could adjust confidence thresholds, improve categorization, etc.
  }

  setupEventHandlers() {
    // Default event handlers
    this.on('error', (error) => {
      console.error(`Bot ${this.id} error:`, error);
    });
    
    this.on('warning', (warning) => {
      console.warn(`Bot ${this.id} warning:`, warning);
    });
  }

  /**
   * Utility methods
   */
  
  generateId() {
    return `${this.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatCurrency(amount, currency = 'AUD') {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatDate(date) {
    return new Intl.DateTimeFormat('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }

  /**
   * Integration helpers
   */
  
  async callExternalAPI(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('External API call failed:', error);
      throw error;
    }
  }

  async notifySlack(message, channel = null) {
    if (!process.env.SLACK_WEBHOOK_URL) return;
    
    try {
      await this.callExternalAPI(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify({
          text: message,
          channel: channel,
          username: this.name,
          icon_emoji: ':robot_face:'
        })
      });
    } catch (error) {
      console.error('Slack notification failed:', error);
    }
  }

  async sendEmail(to, subject, body) {
    // Email sending implementation
    // This would integrate with SendGrid, AWS SES, or similar
    console.log(`📧 Email queued: ${to} - ${subject}`);
  }
}

/**
 * Bot execution context interface
 */
export class BotContext {
  constructor(data = {}) {
    this.userId = data.userId;
    this.tenantId = data.tenantId;
    this.workflowId = data.workflowId;
    this.requestId = data.requestId;
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata || {};
  }

  addMetadata(key, value) {
    this.metadata[key] = value;
  }

  getMetadata(key) {
    return this.metadata[key];
  }
}

/**
 * Bot task interface
 */
export class BotTask {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.action = data.action;
    this.params = data.params || {};
    this.priority = data.priority || 'normal';
    this.timeout = data.timeout || 30000;
    this.retries = data.retries || 3;
    this.createdAt = data.createdAt || new Date();
  }

  generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Bot result interface
 */
export class BotResult {
  constructor(data = {}) {
    this.success = data.success !== false;
    this.data = data.data;
    this.error = data.error;
    this.metadata = data.metadata || {};
    this.duration = data.duration;
    this.timestamp = data.timestamp || new Date();
  }

  static success(data, metadata = {}) {
    return new BotResult({
      success: true,
      data,
      metadata
    });
  }

  static failure(error, metadata = {}) {
    return new BotResult({
      success: false,
      error: error.message || error,
      metadata
    });
  }
}