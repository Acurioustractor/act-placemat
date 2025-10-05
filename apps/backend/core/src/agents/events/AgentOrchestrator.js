/**
 * Agent Orchestrator Service
 * 
 * Routes events to appropriate agents based on rules and policies.
 * Manages agent lifecycle, coordination, and ensures proper execution order.
 */

import { getEventIngestor } from './EventIngestor.js';
import { PolicyStore } from '../base/PolicyStore.js';
import { Logger } from '../../utils/logger.js';
import { createSupabaseClient } from '../../config/supabase.js';

export class AgentOrchestrator {
  constructor() {
    this.agents = new Map();
    this.eventIngestor = getEventIngestor();
    this.policyStore = new PolicyStore();
    this.logger = new Logger('AgentOrchestrator');
    this.supabase = createSupabaseClient();
    
    // Routing rules
    this.routingRules = new Map();
    
    // Agent execution metrics
    this.metrics = {
      totalEvents: 0,
      routedEvents: 0,
      failedRouting: 0,
      agentExecutions: {},
      averageExecutionTime: {}
    };
    
    // Initialize event listeners
    this.setupEventListeners();
    
    this.logger.info('🎭 Agent Orchestrator initialized');
  }
  
  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent) {
    if (!agent.name) {
      throw new Error('Agent must have a name');
    }
    
    // Validate agent
    const validation = agent.validate();
    if (!validation.valid) {
      throw new Error(`Invalid agent configuration: ${validation.errors.join(', ')}`);
    }
    
    this.agents.set(agent.name, agent);
    
    // Initialize metrics for this agent
    this.metrics.agentExecutions[agent.name] = 0;
    this.metrics.averageExecutionTime[agent.name] = 0;
    
    this.logger.info(`Agent registered: ${agent.name}`, {
      version: agent.version,
      enabled: agent.enabled
    });
  }
  
  /**
   * Define routing rules for event types to agents
   */
  defineRoutingRule(eventType, agentNames, options = {}) {
    const rule = {
      agents: Array.isArray(agentNames) ? agentNames : [agentNames],
      priority: options.priority || 'normal',
      condition: options.condition || null,
      parallel: options.parallel !== false,
      timeout: options.timeout || 30000
    };
    
    this.routingRules.set(eventType, rule);
    
    this.logger.info(`Routing rule defined: ${eventType} → ${rule.agents.join(', ')}`);
  }
  
  /**
   * Setup event listeners from the Event Ingestor
   */
  setupEventListeners() {
    // Listen for all events
    this.eventIngestor.on('event', async (event) => {
      try {
        await this.routeEvent(event);
      } catch (error) {
        this.logger.error(`Failed to route event ${event.id}:`, error);
      }
    });
    
    // Listen for specific event types if needed
    this.setupSpecificEventListeners();
  }
  
  /**
   * Setup specific event type listeners
   */
  setupSpecificEventListeners() {
    // Financial events
    const financialEvents = [
      'bank_transaction_created',
      'bill_created',
      'invoice_created',
      'payment_created'
    ];
    
    financialEvents.forEach(eventType => {
      this.eventIngestor.on(eventType, async (event) => {
        // Special handling for financial events if needed
        this.logger.info(`Financial event received: ${eventType}`);
      });
    });
  }
  
  /**
   * Route an event to appropriate agents
   */
  async routeEvent(event) {
    this.metrics.totalEvents++;
    
    try {
      // Get routing rule for this event type
      const rule = this.routingRules.get(event.type);
      
      if (!rule) {
        this.logger.warn(`No routing rule for event type: ${event.type}`);
        this.metrics.failedRouting++;
        return;
      }
      
      // Check if condition is met (if any)
      if (rule.condition && !await this.evaluateCondition(rule.condition, event)) {
        this.logger.info(`Routing condition not met for event ${event.id}`);
        return;
      }
      
      // Get agents to execute
      const agentsToExecute = rule.agents
        .map(name => this.agents.get(name))
        .filter(agent => agent && agent.enabled);
      
      if (agentsToExecute.length === 0) {
        this.logger.warn(`No enabled agents found for event type: ${event.type}`);
        return;
      }
      
      this.metrics.routedEvents++;
      
      // Execute agents
      if (rule.parallel) {
        await this.executeAgentsInParallel(agentsToExecute, event, rule.timeout);
      } else {
        await this.executeAgentsSequentially(agentsToExecute, event, rule.timeout);
      }
      
    } catch (error) {
      this.logger.error(`Event routing failed:`, error);
      throw error;
    }
  }
  
  /**
   * Execute agents in parallel
   */
  async executeAgentsInParallel(agents, event, timeout) {
    const promises = agents.map(agent => 
      this.executeAgent(agent, event, timeout)
    );
    
    const results = await Promise.allSettled(promises);
    
    // Log results
    results.forEach((result, index) => {
      const agent = agents[index];
      if (result.status === 'rejected') {
        this.logger.error(`Agent ${agent.name} failed:`, result.reason);
      }
    });
    
    return results;
  }
  
  /**
   * Execute agents sequentially
   */
  async executeAgentsSequentially(agents, event, timeout) {
    const results = [];
    
    for (const agent of agents) {
      try {
        const result = await this.executeAgent(agent, event, timeout);
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        this.logger.error(`Agent ${agent.name} failed:`, error);
        results.push({ status: 'rejected', reason: error });
        
        // Decide whether to continue or stop on error
        if (error.critical) {
          break;
        }
      }
    }
    
    return results;
  }
  
  /**
   * Execute a single agent with timeout
   */
  async executeAgent(agent, event, timeout) {
    const startTime = Date.now();
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Agent execution timeout: ${timeout}ms`)), timeout);
      });
      
      // Execute agent with timeout
      const result = await Promise.race([
        agent.processEvent(event),
        timeoutPromise
      ]);
      
      // Record metrics
      const executionTime = Date.now() - startTime;
      this.updateAgentMetrics(agent.name, executionTime);
      
      // Log execution
      await this.logAgentExecution(agent.name, event.id, 'success', executionTime);
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log failure
      await this.logAgentExecution(agent.name, event.id, 'failed', executionTime, error.message);
      
      throw error;
    }
  }
  
  /**
   * Evaluate a routing condition
   */
  async evaluateCondition(condition, event) {
    if (typeof condition === 'function') {
      return await condition(event);
    }
    
    // Simple condition evaluation
    // Example: { field: 'data.amount', operator: '>', value: 1000 }
    if (typeof condition === 'object') {
      const fieldValue = this.getNestedValue(event, condition.field);
      
      switch (condition.operator) {
        case '>':
          return fieldValue > condition.value;
        case '<':
          return fieldValue < condition.value;
        case '>=':
          return fieldValue >= condition.value;
        case '<=':
          return fieldValue <= condition.value;
        case '==':
          return fieldValue == condition.value;
        case '!=':
          return fieldValue != condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        default:
          return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }
  
  /**
   * Update agent execution metrics
   */
  updateAgentMetrics(agentName, executionTime) {
    this.metrics.agentExecutions[agentName]++;
    
    // Calculate rolling average
    const currentAvg = this.metrics.averageExecutionTime[agentName] || 0;
    const execCount = this.metrics.agentExecutions[agentName];
    
    this.metrics.averageExecutionTime[agentName] = 
      (currentAvg * (execCount - 1) + executionTime) / execCount;
  }
  
  /**
   * Log agent execution to database
   */
  async logAgentExecution(agentName, eventId, status, executionTime, error = null) {
    try {
      await this.supabase
        .from('agent_executions')
        .insert({
          agent_name: agentName,
          event_id: eventId,
          status,
          execution_time: executionTime,
          error,
          timestamp: new Date().toISOString()
        });
    } catch (err) {
      this.logger.error('Failed to log agent execution:', err);
    }
  }
  
  /**
   * Get orchestrator health status
   */
  getHealth() {
    const agentHealth = {};
    
    for (const [name, agent] of this.agents) {
      agentHealth[name] = agent.getHealth();
    }
    
    return {
      status: 'healthy',
      agents: agentHealth,
      metrics: this.metrics,
      routingRules: Array.from(this.routingRules.keys())
    };
  }
  
  /**
   * Get agent by name
   */
  getAgent(name) {
    return this.agents.get(name);
  }
  
  /**
   * List all registered agents
   */
  listAgents() {
    return Array.from(this.agents.values()).map(agent => ({
      name: agent.name,
      version: agent.version,
      enabled: agent.enabled,
      description: agent.description
    }));
  }
  
  /**
   * Enable/disable an agent
   */
  setAgentEnabled(agentName, enabled) {
    const agent = this.agents.get(agentName);
    if (agent) {
      agent.enabled = enabled;
      this.logger.info(`Agent ${agentName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Reload policies from store
   */
  async reloadPolicies() {
    await this.policyStore.reload();
    
    // Update agents with new policies
    for (const [name, agent] of this.agents) {
      const policy = await this.policyStore.getAgentPolicy(name);
      if (policy) {
        agent.policy = policy;
      }
    }
    
    this.logger.info('Policies reloaded');
  }
}

// Singleton instance
let orchestrator = null;

export function getAgentOrchestrator() {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator();
  }
  return orchestrator;
}

export default AgentOrchestrator;