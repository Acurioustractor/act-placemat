/**
 * ACT Universal Bot Platform - Orchestration Layer
 * The central intelligence system that coordinates all bots and skill pods
 * Implements deterministic routing, policy enforcement, and HITL workflows
 */

import { EventEmitter } from 'events';
import notionService from './notionService.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Main Orchestrator for the Universal Bot Platform
 */
export class BotOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    // Core components
    this.router = new DeterministicRouter();
    this.policyEngine = new PolicyEngine();
    this.contextStore = new ContextStore();
    this.hitlManager = new HITLManager();
    this.auditLogger = new AuditLogger();
    this.botRegistry = new BotRegistry();
    
    // Initialize Supabase for persistence
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Workflow execution state
    this.activeWorkflows = new Map();
    this.workflowTemplates = new Map();
    
    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0
    };
    
    this.initialize();
  }

  async initialize() {
    console.log('🚀 Initializing ACT Universal Bot Platform Orchestrator...');
    
    // Load workflow templates
    await this.loadWorkflowTemplates();
    
    // Register core bots
    await this.registerCoreBots();
    
    // Initialize policy engine with ACT values
    await this.policyEngine.loadPolicies();
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('✅ Bot Orchestrator initialized successfully');
  }

  /**
   * Main entry point for bot requests
   */
  async processRequest(request, context = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      console.log(`📥 Processing request ${requestId}:`, request.intent);
      
      // Track metrics
      this.metrics.totalRequests++;
      
      // Step 1: Validate request against policies
      const policyCheck = await this.policyEngine.validateRequest(request, context);
      if (!policyCheck.approved) {
        throw new PolicyViolationError(policyCheck.reason);
      }
      
      // Step 2: Enrich context with tenant data
      const enrichedContext = await this.contextStore.enrichContext(context);
      
      // Step 3: Route to appropriate workflow or bots
      const executionPlan = await this.router.createExecutionPlan(request, enrichedContext);
      
      // Step 4: Execute the plan with safety checks
      const result = await this.executeWorkflow(executionPlan, enrichedContext, requestId);
      
      // Step 5: Apply post-processing policies
      const processedResult = await this.policyEngine.applyOutputPolicies(result, context);
      
      // Step 6: Audit the entire operation
      await this.auditLogger.logOperation({
        requestId,
        request,
        context: enrichedContext,
        executionPlan,
        result: processedResult,
        duration: Date.now() - startTime
      });
      
      // Update metrics
      this.metrics.successfulRequests++;
      this.updateAverageLatency(Date.now() - startTime);
      
      // Emit success event
      this.emit('request:success', { requestId, result: processedResult });
      
      return {
        success: true,
        requestId,
        result: processedResult,
        metadata: {
          duration: Date.now() - startTime,
          stepsExecuted: executionPlan.steps.length
        }
      };
      
    } catch (error) {
      console.error(`❌ Request ${requestId} failed:`, error);
      
      // Track failure
      this.metrics.failedRequests++;
      
      // Log error
      await this.auditLogger.logError({
        requestId,
        request,
        error: error.message,
        stack: error.stack
      });
      
      // Emit failure event
      this.emit('request:failure', { requestId, error });
      
      // Apply error recovery if possible
      const recovery = await this.attemptErrorRecovery(error, request, context);
      
      return {
        success: false,
        requestId,
        error: error.message,
        recovery
      };
    }
  }

  /**
   * Execute a workflow with all safety checks
   */
  async executeWorkflow(plan, context, requestId) {
    const workflowId = this.generateWorkflowId();
    const workflow = {
      id: workflowId,
      requestId,
      plan,
      context,
      state: 'running',
      currentStep: 0,
      results: [],
      startTime: Date.now()
    };
    
    // Store active workflow
    this.activeWorkflows.set(workflowId, workflow);
    
    try {
      // Execute each step in the plan
      for (const [index, step] of plan.steps.entries()) {
        workflow.currentStep = index;
        
        console.log(`🔄 Executing step ${index + 1}/${plan.steps.length}: ${step.name}`);
        
        // Check if step requires human approval
        if (step.requiresApproval) {
          const approval = await this.hitlManager.requestApproval({
            workflowId,
            step,
            context,
            timeout: step.approvalTimeout || 3600000 // 1 hour default
          });
          
          if (!approval.approved) {
            throw new ApprovalDeniedError(`Step ${step.name} was not approved`);
          }
          
          // Log approval
          await this.auditLogger.logApproval({
            workflowId,
            step: step.name,
            approver: approval.approver,
            decision: approval.decision,
            timestamp: approval.timestamp
          });
        }
        
        // Execute the step
        const stepResult = await this.executeStep(step, context, workflow);
        
        // Store result
        workflow.results.push({
          step: step.name,
          result: stepResult,
          timestamp: Date.now()
        });
        
        // Check if we should continue based on step result
        if (step.conditional && !this.evaluateCondition(step.conditional, stepResult)) {
          console.log(`⏭️ Skipping remaining steps due to condition in ${step.name}`);
          break;
        }
        
        // Update context with step results for next steps
        context[step.name] = stepResult;
      }
      
      // Mark workflow as complete
      workflow.state = 'completed';
      workflow.endTime = Date.now();
      
      // Store workflow history
      await this.persistWorkflowHistory(workflow);
      
      return workflow.results;
      
    } catch (error) {
      workflow.state = 'failed';
      workflow.error = error.message;
      workflow.endTime = Date.now();
      
      // Store failed workflow
      await this.persistWorkflowHistory(workflow);
      
      // Attempt compensation if defined
      if (plan.compensation) {
        await this.executeCompensation(plan.compensation, workflow);
      }
      
      throw error;
      
    } finally {
      // Clean up active workflow
      this.activeWorkflows.delete(workflowId);
    }
  }

  /**
   * Execute a single workflow step
   */
  async executeStep(step, context, workflow) {
    const { botId, action, params } = step;
    
    // Get the bot from registry
    const bot = this.botRegistry.getBot(botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found in registry`);
    }
    
    // Validate bot permissions
    const hasPermission = await this.policyEngine.checkBotPermissions(bot, action, context);
    if (!hasPermission) {
      throw new PermissionDeniedError(`Bot ${botId} lacks permission for ${action}`);
    }
    
    // Prepare execution context
    const executionContext = {
      ...context,
      workflowId: workflow.id,
      requestId: workflow.requestId,
      stepIndex: workflow.currentStep
    };
    
    // Execute with timeout
    const timeout = step.timeout || 30000; // 30 seconds default
    const result = await this.executeWithTimeout(
      bot.execute(action, params, executionContext),
      timeout
    );
    
    // Validate result against schema if defined
    if (step.outputSchema) {
      this.validateSchema(result, step.outputSchema);
    }
    
    return result;
  }

  /**
   * Load workflow templates from storage
   */
  async loadWorkflowTemplates() {
    // Load built-in templates
    const templates = [
      {
        id: 'entity-setup',
        name: 'Entity Setup Workflow',
        description: 'Complete ACT Pty Ltd registration process',
        steps: [
          {
            name: 'validate-directors',
            botId: 'entity-setup-bot',
            action: 'validateDirectors',
            params: {}
          },
          {
            name: 'check-name',
            botId: 'entity-setup-bot',
            action: 'checkNameAvailability',
            params: {}
          },
          {
            name: 'generate-constitution',
            botId: 'entity-setup-bot',
            action: 'generateConstitution',
            params: {},
            requiresApproval: true
          },
          {
            name: 'submit-asic',
            botId: 'entity-setup-bot',
            action: 'submitASICApplication',
            params: {},
            requiresApproval: true
          }
        ]
      },
      {
        id: 'r-and-d-claim',
        name: 'R&D Tax Credit Claim',
        description: 'Quarterly R&D tax credit claim process',
        steps: [
          {
            name: 'collect-expenses',
            botId: 'bookkeeping-bot',
            action: 'getQuarterlyExpenses',
            params: { category: 'development' }
          },
          {
            name: 'classify-r-and-d',
            botId: 'r-and-d-bot',
            action: 'classifyExpenses',
            params: {}
          },
          {
            name: 'review-classification',
            botId: 'hitl',
            action: 'requestReview',
            params: { reviewers: ['finance-team'] },
            requiresApproval: true,
            conditional: 'confidence < 0.95'
          },
          {
            name: 'collect-evidence',
            botId: 'impact-bot',
            action: 'gatherEvidence',
            params: {}
          },
          {
            name: 'generate-claim',
            botId: 'r-and-d-bot',
            action: 'prepareClaim',
            params: {}
          },
          {
            name: 'final-approval',
            botId: 'hitl',
            action: 'requestApproval',
            params: { approvers: ['cfo', 'tax-advisor'] },
            requiresApproval: true
          },
          {
            name: 'submit-claim',
            botId: 'compliance-bot',
            action: 'submitATOClaim',
            params: {}
          }
        ],
        compensation: [
          {
            name: 'rollback-claim',
            botId: 'r-and-d-bot',
            action: 'rollbackClaim',
            params: {}
          }
        ]
      }
    ];
    
    // Store templates
    for (const template of templates) {
      this.workflowTemplates.set(template.id, template);
    }
    
    console.log(`📋 Loaded ${templates.length} workflow templates`);
  }

  /**
   * Register core bots in the registry
   */
  async registerCoreBots() {
    // This will be populated as we build individual bots
    console.log('🤖 Registering core bots...');
    
    // Register placeholder bots for now
    const coreBots = [
      'entity-setup-bot',
      'bookkeeping-bot',
      'r-and-d-bot',
      'compliance-bot',
      'partnership-bot',
      'story-collection-bot',
      'impact-bot',
      'code-gen-bot'
    ];
    
    for (const botId of coreBots) {
      this.botRegistry.register({
        id: botId,
        name: botId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        status: 'pending-implementation'
      });
    }
  }

  /**
   * Helper methods
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateWorkflowId() {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  updateAverageLatency(latency) {
    const totalLatency = this.metrics.averageLatency * (this.metrics.successfulRequests - 1) + latency;
    this.metrics.averageLatency = totalLatency / this.metrics.successfulRequests;
  }

  async executeWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }

  evaluateCondition(condition, data) {
    // Simple condition evaluator - can be enhanced
    try {
      return new Function('data', `return ${condition}`)(data);
    } catch (error) {
      console.error('Failed to evaluate condition:', error);
      return false;
    }
  }

  validateSchema(data, schema) {
    // Schema validation logic
    // This would use a library like Joi or Ajv in production
    return true;
  }

  async persistWorkflowHistory(workflow) {
    try {
      const { error } = await this.supabase
        .from('workflow_history')
        .insert({
          workflow_id: workflow.id,
          request_id: workflow.requestId,
          plan: workflow.plan,
          context: workflow.context,
          state: workflow.state,
          results: workflow.results,
          error: workflow.error,
          start_time: new Date(workflow.startTime),
          end_time: workflow.endTime ? new Date(workflow.endTime) : null,
          duration_ms: workflow.endTime ? workflow.endTime - workflow.startTime : null
        });
        
      if (error) {
        console.error('Failed to persist workflow history:', error);
      }
    } catch (error) {
      console.error('Error persisting workflow:', error);
    }
  }

  async attemptErrorRecovery(error, request, context) {
    // Implement error recovery strategies
    return null;
  }

  async executeCompensation(compensationSteps, workflow) {
    console.log('🔄 Executing compensation for failed workflow');
    // Execute compensation steps in reverse order
    for (const step of compensationSteps) {
      try {
        await this.executeStep(step, workflow.context, workflow);
      } catch (error) {
        console.error('Compensation step failed:', error);
      }
    }
  }

  setupEventListeners() {
    // Set up internal event handling
    this.on('bot:registered', (bot) => {
      console.log(`✅ Bot registered: ${bot.name}`);
    });
    
    this.on('workflow:started', (workflow) => {
      console.log(`🚀 Workflow started: ${workflow.id}`);
    });
    
    this.on('workflow:completed', (workflow) => {
      console.log(`✅ Workflow completed: ${workflow.id}`);
    });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeWorkflows: this.activeWorkflows.size,
      registeredBots: this.botRegistry.getBotCount(),
      uptime: process.uptime()
    };
  }
}

/**
 * Deterministic Router for workflow planning
 */
class DeterministicRouter {
  async createExecutionPlan(request, context) {
    // Analyze request intent
    const intent = this.analyzeIntent(request);
    
    // Map intent to workflow template or create dynamic plan
    const plan = await this.mapIntentToPlan(intent, context);
    
    // Optimize execution order
    const optimizedPlan = this.optimizePlan(plan);
    
    return optimizedPlan;
  }

  analyzeIntent(request) {
    // Intent analysis logic
    return {
      primary: request.intent || 'unknown',
      entities: request.entities || [],
      confidence: 0.95
    };
  }

  async mapIntentToPlan(intent, context) {
    // Map intent to execution steps
    return {
      steps: [],
      compensation: []
    };
  }

  optimizePlan(plan) {
    // Optimize step execution order
    return plan;
  }
}

/**
 * Policy Engine for enforcing ACT values and compliance
 */
class PolicyEngine {
  constructor() {
    this.policies = new Map();
  }

  async loadPolicies() {
    // Load ACT-specific policies
    const policies = [
      {
        id: 'consent-required',
        condition: (request, context) => {
          return ['personal', 'story', 'community'].includes(request.dataType);
        },
        action: 'require-explicit-consent'
      },
      {
        id: 'benefit-sharing',
        condition: (request, context) => {
          return request.generatesRevenue === true;
        },
        action: 'calculate-community-share'
      },
      {
        id: 'cultural-protocol',
        condition: (request, context) => {
          return context.culturalSignificance === 'high';
        },
        action: 'apply-cultural-protocols'
      },
      {
        id: 'financial-risk',
        condition: (request, context) => {
          return request.financialImpact > 10000;
        },
        action: 'require-human-approval'
      }
    ];
    
    for (const policy of policies) {
      this.policies.set(policy.id, policy);
    }
  }

  async validateRequest(request, context) {
    const violations = [];
    
    for (const [id, policy] of this.policies) {
      if (policy.condition(request, context)) {
        // Check if policy requirement is met
        const met = await this.checkPolicyRequirement(policy.action, request, context);
        if (!met) {
          violations.push({
            policyId: id,
            action: policy.action
          });
        }
      }
    }
    
    return {
      approved: violations.length === 0,
      violations,
      reason: violations.length > 0 ? `Policy violations: ${violations.map(v => v.policyId).join(', ')}` : null
    };
  }

  async checkPolicyRequirement(action, request, context) {
    // Check if policy requirement is satisfied
    switch (action) {
      case 'require-explicit-consent':
        return context.hasConsent === true;
      case 'calculate-community-share':
        return request.communityShareDefined === true;
      case 'apply-cultural-protocols':
        return context.culturalProtocolsApplied === true;
      case 'require-human-approval':
        return request.hasApproval === true;
      default:
        return true;
    }
  }

  async checkBotPermissions(bot, action, context) {
    // Check if bot has required permissions
    return true; // Placeholder
  }

  async applyOutputPolicies(result, context) {
    // Apply output filtering and transformation
    return result;
  }
}

/**
 * Context Store for managing workflow context
 */
class ContextStore {
  constructor() {
    this.cache = new Map();
  }

  async enrichContext(context) {
    // Enrich context with additional data
    const enriched = { ...context };
    
    // Add tenant information
    if (context.tenantId) {
      enriched.tenant = await this.getTenantInfo(context.tenantId);
    }
    
    // Add user information
    if (context.userId) {
      enriched.user = await this.getUserInfo(context.userId);
    }
    
    // Add timestamp
    enriched.timestamp = new Date().toISOString();
    
    return enriched;
  }

  async getTenantInfo(tenantId) {
    // Fetch tenant information
    return { id: tenantId, name: 'ACT' };
  }

  async getUserInfo(userId) {
    // Fetch user information
    return { id: userId };
  }
}

/**
 * Human-in-the-Loop Manager
 */
class HITLManager {
  constructor() {
    this.pendingApprovals = new Map();
  }

  async requestApproval(request) {
    const approvalId = this.generateApprovalId();
    
    // Store pending approval
    this.pendingApprovals.set(approvalId, {
      ...request,
      status: 'pending',
      createdAt: Date.now()
    });
    
    // Send notification to approvers
    await this.notifyApprovers(request);
    
    // Wait for approval with timeout
    return await this.waitForApproval(approvalId, request.timeout);
  }

  async notifyApprovers(request) {
    // Send notifications via Slack, email, etc.
    console.log(`📨 Approval requested for ${request.step.name}`);
  }

  async waitForApproval(approvalId, timeout) {
    // In production, this would wait for actual approval
    // For now, auto-approve after a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          approved: true,
          approver: 'system',
          decision: 'auto-approved',
          timestamp: Date.now()
        });
      }, 1000);
    });
  }

  generateApprovalId() {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Audit Logger for compliance and tracking
 */
class AuditLogger {
  async logOperation(operation) {
    // Log to persistent storage
    console.log(`📝 Audit log: ${operation.requestId}`);
  }

  async logError(error) {
    console.error(`❌ Error log:`, error);
  }

  async logApproval(approval) {
    console.log(`✅ Approval log:`, approval);
  }
}

/**
 * Bot Registry for managing available bots
 */
class BotRegistry {
  constructor() {
    this.bots = new Map();
  }

  register(bot) {
    this.bots.set(bot.id, bot);
  }

  getBot(botId) {
    return this.bots.get(botId);
  }

  getBotCount() {
    return this.bots.size;
  }
}

/**
 * Custom Error Classes
 */
class PolicyViolationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

class ApprovalDeniedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApprovalDeniedError';
  }
}

class PermissionDeniedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

// Export the orchestrator
export default new BotOrchestrator();