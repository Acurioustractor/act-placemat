/**
 * Base Agent Class
 * 
 * Foundation for all AI agents in the ACT financial intelligence system.
 * Provides common functionality for event handling, state management,
 * error handling, and audit logging.
 */

import { createSupabaseClient } from '../../config/supabase.js';
import { MultiProviderAI } from '../../services/multiProviderAI.js';
import { Logger } from '../../utils/logger.js';

export class BaseAgent {
  constructor(config = {}) {
    this.name = config.name || 'UnnamedAgent';
    this.description = config.description || '';
    this.version = config.version || '1.0.0';
    this.enabled = config.enabled !== false;
    
    // Initialize services
    this.supabase = createSupabaseClient();
    this.ai = new MultiProviderAI();
    this.logger = new Logger(this.name);
    
    // Agent state
    this.state = {
      lastRun: null,
      runCount: 0,
      errors: [],
      metrics: {}
    };
    
    // Policy configuration
    this.policy = config.policy || {};
    
    // Event handlers
    this.eventHandlers = new Map();
    
    this.logger.info(`🤖 ${this.name} agent initialized`, {
      version: this.version,
      enabled: this.enabled
    });
  }
  
  /**
   * Register an event handler
   */
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }
  
  /**
   * Process an incoming event
   */
  async processEvent(event) {
    if (!this.enabled) {
      this.logger.warn(`Agent ${this.name} is disabled, skipping event`);
      return null;
    }
    
    const startTime = Date.now();
    const eventId = event.id || this.generateEventId();
    
    try {
      this.logger.info(`Processing event ${eventId}`, {
        type: event.type,
        entity: event.entity
      });
      
      // Log to audit trail
      await this.logAuditEvent('event_received', event);
      
      // Get handlers for this event type
      const handlers = this.eventHandlers.get(event.type) || [];
      const results = [];
      
      for (const handler of handlers) {
        const result = await this.executeHandler(handler, event);
        results.push(result);
      }
      
      // Update state
      this.state.lastRun = new Date().toISOString();
      this.state.runCount++;
      
      // Record metrics
      const duration = Date.now() - startTime;
      this.recordMetric('event_processing_time', duration);
      
      // Log completion
      await this.logAuditEvent('event_completed', {
        eventId,
        duration,
        results: results.length
      });
      
      return {
        eventId,
        agent: this.name,
        results,
        duration
      };
      
    } catch (error) {
      this.logger.error(`Error processing event ${eventId}:`, error);
      
      // Record error
      this.state.errors.push({
        eventId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Log to audit trail
      await this.logAuditEvent('event_error', {
        eventId,
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Execute a handler with error handling
   */
  async executeHandler(handler, event) {
    try {
      return await handler.call(this, event);
    } catch (error) {
      this.logger.error(`Handler error:`, error);
      throw error;
    }
  }
  
  /**
   * Apply policy rules to determine action
   */
  async applyPolicy(context, action) {
    // Check if action meets policy thresholds
    const rules = this.policy.rules || {};
    const thresholds = this.policy.thresholds || {};
    
    // Default: propose action for approval
    let decision = 'propose';
    
    // Check auto-approval rules
    if (rules.auto) {
      for (const rule of rules.auto) {
        if (await this.evaluateRule(rule, context)) {
          decision = 'auto';
          break;
        }
      }
    }
    
    // Check manual approval rules
    if (rules.manual) {
      for (const rule of rules.manual) {
        if (await this.evaluateRule(rule, context)) {
          decision = 'manual';
          break;
        }
      }
    }
    
    return {
      decision,
      action,
      context,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Evaluate a policy rule
   */
  async evaluateRule(rule, context) {
    // Simple rule evaluation - can be extended
    if (typeof rule === 'function') {
      return await rule(context);
    }
    
    // String-based rules (simplified)
    if (typeof rule === 'string') {
      // Example: "amount < 250"
      // This is a simplified implementation
      return false;
    }
    
    return false;
  }
  
  /**
   * Use AI for intelligent processing
   */
  async queryAI(prompt, context = {}) {
    try {
      const systemPrompt = `You are ${this.name}, an AI agent in the ACT financial intelligence system.
${this.description}
Always provide accurate, helpful responses focused on Australian business compliance and efficiency.`;
      
      const result = await this.ai.generate({
        systemPrompt,
        prompt,
        context,
        temperature: 0.7,
        maxTokens: 1000
      });
      
      return result;
    } catch (error) {
      this.logger.error('AI query failed:', error);
      throw error;
    }
  }
  
  /**
   * Log event to audit trail
   */
  async logAuditEvent(action, data) {
    try {
      await this.supabase.from('audit_logs').insert({
        agent: this.name,
        action,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Audit log failed:', error);
      // Don't throw - audit failures shouldn't break processing
    }
  }
  
  /**
   * Record a metric
   */
  recordMetric(name, value) {
    if (!this.state.metrics[name]) {
      this.state.metrics[name] = [];
    }
    
    this.state.metrics[name].push({
      value,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 values
    if (this.state.metrics[name].length > 100) {
      this.state.metrics[name].shift();
    }
  }
  
  /**
   * Get agent health status
   */
  getHealth() {
    const recentErrors = this.state.errors.filter(e => {
      const errorTime = new Date(e.timestamp);
      const hourAgo = new Date(Date.now() - 3600000);
      return errorTime > hourAgo;
    });
    
    return {
      name: this.name,
      version: this.version,
      enabled: this.enabled,
      lastRun: this.state.lastRun,
      runCount: this.state.runCount,
      recentErrors: recentErrors.length,
      status: recentErrors.length > 5 ? 'unhealthy' : 'healthy'
    };
  }
  
  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Validate agent configuration
   */
  validate() {
    const errors = [];
    
    if (!this.name) {
      errors.push('Agent name is required');
    }
    
    if (!this.version) {
      errors.push('Agent version is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default BaseAgent;