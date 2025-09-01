/**
 * ACT Ecosystem Orchestrator
 * Bridges the Farmhand Intelligence Layer with the Universal Bot Platform
 * Creates seamless integration between strategic intelligence and operational execution
 */

import EventEmitter from 'events';
import ACTFarmhandAgent from './actFarmhandAgent.js';
import botOrchestrator from './botOrchestrator.js';
import botLearningSystem from './botLearningSystem.js';
import FarmhandWorker from '../workers/farmhandWorker.js';

class EcosystemOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    // Core system components
    this.farmhand = new ACTFarmhandAgent();
    this.botPlatform = botOrchestrator;
    this.learningSystem = botLearningSystem;
    this.farmhandWorker = new FarmhandWorker();
    
    // Integration state
    this.state = {
      active: false,
      lastSync: null,
      metrics: {
        farmhandAlerts: 0,
        botActionsTriggered: 0,
        learningsShared: 0,
        successfulIntegrations: 0
      },
      workflows: new Map(),
      alertThreshold: 0.7 // Confidence threshold for acting on alerts
    };
    
    // Workflow definitions
    this.workflows = this.initializeWorkflows();
    
    // Event routing
    this.setupEventRouting();
    
    console.log('🌾🤖 ACT Ecosystem Orchestrator initialized');
  }

  /**
   * Initialize predefined workflows that connect Farmhand insights to Bot actions
   */
  initializeWorkflows() {
    return {
      'grant-opportunity-pipeline': {
        name: 'Grant Opportunity Pipeline',
        trigger: 'opportunity-identified',
        description: 'End-to-end grant application workflow',
        steps: [
          { agent: 'farmhand', pod: 'opportunityScout', action: 'analyzeOpportunity' },
          { agent: 'farmhand', pod: 'dnaGuardian', action: 'checkAlignment' },
          { agent: 'bot', bot: 'strategic-intelligence-bot', action: 'scoreOpportunity' },
          { agent: 'bot', bot: 'compliance-bot', action: 'checkEligibility' },
          { agent: 'bot', bot: 'code-documentation-bot', action: 'generateApplication' }
        ],
        metrics: { successRate: 0, avgDuration: 0, totalRuns: 0 }
      },

      'monthly-compliance-automation': {
        name: 'Monthly Compliance Automation',
        trigger: 'compliance-deadline-approaching',
        description: 'Automated BAS preparation and submission',
        steps: [
          { agent: 'farmhand', pod: 'complianceSentry', action: 'gatherRequirements' },
          { agent: 'bot', bot: 'bookkeeping-bot', action: 'reconcileAccounts' },
          { agent: 'bot', bot: 'compliance-bot', action: 'calculateGST' },
          { agent: 'bot', bot: 'compliance-bot', action: 'prepareBAS' },
          { agent: 'farmhand', pod: 'dnaGuardian', action: 'reviewCompliance' }
        ],
        metrics: { successRate: 0, avgDuration: 0, totalRuns: 0 }
      },

      'partnership-onboarding': {
        name: 'Partnership Onboarding',
        trigger: 'new-partnership-identified',
        description: 'Automate partner setup and integration',
        steps: [
          { agent: 'farmhand', pod: 'knowledgeLibrarian', action: 'profilePartner' },
          { agent: 'bot', bot: 'partnership-bot', action: 'createPartnerRecord' },
          { agent: 'bot', bot: 'community-impact-bot', action: 'identifyStoryOpportunities' },
          { agent: 'farmhand', pod: 'systemsSeeder', action: 'suggestWorkflows' }
        ],
        metrics: { successRate: 0, avgDuration: 0, totalRuns: 0 }
      },

      'story-collection-consent': {
        name: 'Story Collection with Consent',
        trigger: 'story-opportunity-identified',
        description: 'Ethical story collection with full consent',
        steps: [
          { agent: 'farmhand', pod: 'storyWeaver', action: 'identifyThemes' },
          { agent: 'bot', bot: 'community-impact-bot', action: 'requestConsent' },
          { agent: 'farmhand', pod: 'dnaGuardian', action: 'checkEthicalCompliance' },
          { agent: 'bot', bot: 'community-impact-bot', action: 'publishStory' }
        ],
        metrics: { successRate: 0, avgDuration: 0, totalRuns: 0 }
      },

      'financial-intelligence': {
        name: 'Financial Intelligence & Optimization',
        trigger: 'financial-data-updated',
        description: 'Continuous financial monitoring and optimization',
        steps: [
          { agent: 'farmhand', pod: 'financeCopilot', action: 'analyzeCashFlow' },
          { agent: 'bot', bot: 'bookkeeping-bot', action: 'categorizeTransactions' },
          { agent: 'farmhand', pod: 'opportunityScout', action: 'identifyTaxOptimizations' },
          { agent: 'bot', bot: 'strategic-intelligence-bot', action: 'modelGrowthScenarios' }
        ],
        metrics: { successRate: 0, avgDuration: 0, totalRuns: 0 }
      }
    };
  }

  /**
   * Set up event routing between Farmhand and Bot systems
   */
  setupEventRouting() {
    // Listen to Farmhand Worker alerts
    this.farmhandWorker.on('alert', (alert) => {
      this.handleFarmhandAlert(alert);
    });

    // Listen to Bot Orchestrator events  
    this.botPlatform.on('actionComplete', (result) => {
      this.handleBotActionComplete(result);
    });

    // Listen to Learning System events
    this.learningSystem.on('learningCycleComplete', (learning) => {
      this.handleLearningComplete(learning);
    });

    // Listen to workflow completion
    this.on('workflowComplete', (workflow) => {
      this.updateWorkflowMetrics(workflow);
    });
  }

  /**
   * Start the ecosystem orchestrator
   */
  async start() {
    console.log('🚀 Starting ACT Ecosystem Orchestrator...');
    
    try {
      // Start core systems
      await this.farmhandWorker.start();
      await this.learningSystem.initialize();
      
      // Begin orchestration
      this.state.active = true;
      this.state.lastSync = new Date();
      
      // Start monitoring loops
      this.startMonitoringLoop();
      this.startSyncLoop();
      
      console.log('✅ ACT Ecosystem Orchestrator started successfully');
      
      // Emit ready event
      this.emit('ready', {
        farmhandActive: true,
        botsActive: this.botPlatform.getActiveBotsCount() > 0,
        learningActive: this.learningSystem.getLearningStatus().enabled,
        workflows: Object.keys(this.workflows).length
      });
      
    } catch (error) {
      console.error('Failed to start Ecosystem Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Handle alerts from Farmhand system
   */
  async handleFarmhandAlert(alert) {
    console.log(`🌾→🤖 Processing Farmhand alert: ${alert.type}`);
    
    try {
      // Check if alert confidence meets threshold
      if (alert.confidence && alert.confidence < this.state.alertThreshold) {
        console.log(`⚠️ Alert confidence ${alert.confidence} below threshold ${this.state.alertThreshold}`);
        return;
      }

      // Route alert to appropriate workflow
      const workflow = this.routeAlertToWorkflow(alert);
      
      if (workflow) {
        const result = await this.executeWorkflow(workflow.id, {
          trigger: alert,
          context: { source: 'farmhand-alert' }
        });
        
        this.state.metrics.botActionsTriggered++;
        
        if (result.success) {
          this.state.metrics.successfulIntegrations++;
          console.log(`✅ Successfully executed workflow: ${workflow.name}`);
        }
      } else {
        // No workflow found - log for learning
        console.log(`📝 No workflow found for alert type: ${alert.type}`);
        this.logUnhandledAlert(alert);
      }
      
      this.state.metrics.farmhandAlerts++;
      
    } catch (error) {
      console.error('Error handling Farmhand alert:', error);
    }
  }

  /**
   * Route alert to appropriate workflow based on alert type and content
   */
  routeAlertToWorkflow(alert) {
    const routingMap = {
      'opportunity_alert': 'grant-opportunity-pipeline',
      'compliance_alert': 'monthly-compliance-automation',
      'partnership_opportunity': 'partnership-onboarding',
      'story_opportunity': 'story-collection-consent',
      'budget_warning': 'financial-intelligence'
    };
    
    const workflowId = routingMap[alert.type];
    
    if (workflowId && this.workflows[workflowId]) {
      return {
        id: workflowId,
        ...this.workflows[workflowId]
      };
    }
    
    return null;
  }

  /**
   * Execute a workflow by orchestrating between Farmhand and Bot systems
   */
  async executeWorkflow(workflowId, context = {}) {
    const workflow = this.workflows[workflowId];
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    console.log(`🔄 Executing workflow: ${workflow.name}`);
    const startTime = Date.now();
    
    const execution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      startTime: new Date(),
      steps: [],
      context,
      status: 'running'
    };

    try {
      // Execute each step in sequence
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`  Step ${i + 1}/${workflow.steps.length}: ${step.action} via ${step.agent}`);
        
        const stepResult = await this.executeWorkflowStep(step, execution);
        execution.steps.push(stepResult);
        
        // Check if step failed and should halt workflow
        if (!stepResult.success && step.critical !== false) {
          execution.status = 'failed';
          break;
        }
      }
      
      // Determine final status
      if (execution.status === 'running') {
        execution.status = execution.steps.every(s => s.success) ? 'completed' : 'partial';
      }
      
      execution.endTime = new Date();
      execution.duration = Date.now() - startTime;
      
      // Update workflow metrics
      workflow.metrics.totalRuns++;
      if (execution.status === 'completed') {
        workflow.metrics.successRate = 
          (workflow.metrics.successRate * (workflow.metrics.totalRuns - 1) + 1) / workflow.metrics.totalRuns;
      }
      workflow.metrics.avgDuration = 
        (workflow.metrics.avgDuration * (workflow.metrics.totalRuns - 1) + execution.duration) / workflow.metrics.totalRuns;
      
      // Store execution results
      await this.storeWorkflowExecution(execution);
      
      // Emit completion event
      this.emit('workflowComplete', {
        workflowId,
        execution,
        success: execution.status === 'completed'
      });
      
      console.log(`${execution.status === 'completed' ? '✅' : '⚠️'} Workflow ${workflow.name} ${execution.status} in ${execution.duration}ms`);
      
      return {
        success: execution.status === 'completed',
        execution,
        duration: execution.duration,
        stepsCompleted: execution.steps.filter(s => s.success).length,
        stepsTotal: workflow.steps.length
      };
      
    } catch (error) {
      execution.status = 'error';
      execution.error = error.message;
      execution.endTime = new Date();
      execution.duration = Date.now() - startTime;
      
      console.error(`❌ Workflow ${workflow.name} failed:`, error);
      
      return {
        success: false,
        execution,
        error: error.message
      };
    }
  }

  /**
   * Execute a single workflow step
   */
  async executeWorkflowStep(step, execution) {
    const stepStart = Date.now();
    
    try {
      let result;
      
      if (step.agent === 'farmhand') {
        // Execute via Farmhand skill pod
        const pod = this.farmhand.skillPods[step.pod];
        if (!pod) {
          throw new Error(`Skill pod not found: ${step.pod}`);
        }
        
        result = await pod.process(step.action, {
          context: execution.context,
          previousSteps: execution.steps
        });
        
      } else if (step.agent === 'bot') {
        // Execute via Bot Platform
        const bot = this.botPlatform.getBot(step.bot);
        if (!bot) {
          throw new Error(`Bot not found: ${step.bot}`);
        }
        
        result = await bot.execute(step.action, {
          context: execution.context,
          previousSteps: execution.steps
        });
        
      } else {
        throw new Error(`Unknown agent type: ${step.agent}`);
      }
      
      return {
        step: step.action,
        agent: step.agent,
        target: step.pod || step.bot,
        success: true,
        result,
        duration: Date.now() - stepStart
      };
      
    } catch (error) {
      return {
        step: step.action,
        agent: step.agent,
        target: step.pod || step.bot,
        success: false,
        error: error.message,
        duration: Date.now() - stepStart
      };
    }
  }

  /**
   * Handle bot action completion
   */
  async handleBotActionComplete(result) {
    console.log(`🤖→🌾 Bot action completed: ${result.action}`);
    
    // Send results back to Farmhand for learning
    try {
      const insights = await this.farmhand.skillPods.impactAnalyst.process(
        'analyzeActionOutcome',
        { actionResult: result }
      );
      
      // Share insights with learning system
      if (insights.learnings) {
        await this.learningSystem.importCommunityLearnings({
          version: '1.0.0',
          learnings: [insights.learnings],
          patterns: insights.patterns || [],
          improvements: insights.improvements || []
        });
        
        this.state.metrics.learningsShared++;
      }
      
    } catch (error) {
      console.warn('Failed to process bot action insights:', error.message);
    }
  }

  /**
   * Handle learning cycle completion
   */
  async handleLearningComplete(learning) {
    console.log(`🧠 Learning cycle complete: ${learning.improvements} improvements`);
    
    // Share learnings with Farmhand system
    try {
      await this.farmhand.processQuery(
        `Incorporate these learnings into skill pods: ${JSON.stringify(learning)}`,
        { source: 'learning-system' }
      );
      
    } catch (error) {
      console.warn('Failed to share learnings with Farmhand:', error.message);
    }
  }

  /**
   * Start monitoring loop for system health and opportunities
   */
  startMonitoringLoop() {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Check system health
        const health = await this.getSystemHealth();
        
        // Look for optimization opportunities
        const optimizations = await this.identifyOptimizations();
        
        // Auto-execute low-risk optimizations
        for (const opt of optimizations.filter(o => o.risk === 'low')) {
          await this.executeOptimization(opt);
        }
        
        // Alert for high-risk optimizations
        if (optimizations.some(o => o.risk === 'high')) {
          this.emit('optimizationOpportunity', {
            count: optimizations.filter(o => o.risk === 'high').length,
            optimizations: optimizations.filter(o => o.risk === 'high')
          });
        }
        
      } catch (error) {
        console.error('Monitoring loop error:', error);
      }
    }, 60000); // Every minute
  }

  /**
   * Start synchronization loop between systems
   */
  startSyncLoop() {
    this.syncInterval = setInterval(async () => {
      try {
        // Sync learning between systems
        await this.syncLearnings();
        
        // Update workflow priorities based on performance
        await this.updateWorkflowPriorities();
        
        // Clean up completed executions
        await this.cleanupOldExecutions();
        
        this.state.lastSync = new Date();
        
      } catch (error) {
        console.error('Sync loop error:', error);
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus() {
    const farmhandStatus = this.farmhand ? 'active' : 'inactive';
    const botStatus = this.botPlatform ? await this.botPlatform.getSystemStatus() : 'inactive';
    const learningStatus = this.learningSystem ? this.learningSystem.getLearningStatus() : 'inactive';
    
    return {
      orchestrator: {
        active: this.state.active,
        lastSync: this.state.lastSync,
        metrics: this.state.metrics
      },
      farmhand: {
        status: farmhandStatus,
        skillPods: farmhandStatus === 'active' ? Object.keys(this.farmhand.skillPods).length : 0
      },
      bots: botStatus,
      learning: learningStatus,
      workflows: {
        total: Object.keys(this.workflows).length,
        metrics: Object.fromEntries(
          Object.entries(this.workflows).map(([id, w]) => [id, w.metrics])
        )
      }
    };
  }

  /**
   * Execute a natural language query across the entire ecosystem
   */
  async processEcosystemQuery(query, context = {}) {
    console.log(`🌾🤖 Processing ecosystem query: "${query}"`);
    
    try {
      // First, get Farmhand's strategic analysis
      const farmhandResponse = await this.farmhand.processQuery(query, {
        ...context,
        requestEcosystemCoordination: true
      });
      
      // Extract actionable items from Farmhand response
      const actions = this.extractActionsFromResponse(farmhandResponse);
      
      // Execute actions via appropriate bots
      const botResults = [];
      for (const action of actions) {
        if (action.botId) {
          try {
            const result = await this.botPlatform.executeBot(
              action.botId,
              action.action,
              action.params,
              context
            );
            botResults.push({ action, result, success: true });
          } catch (error) {
            botResults.push({ action, error: error.message, success: false });
          }
        }
      }
      
      // Combine results and generate summary
      const summary = await this.generateEcosystemSummary(
        query,
        farmhandResponse,
        botResults
      );
      
      return {
        query,
        farmhandInsights: farmhandResponse,
        botActions: botResults,
        summary,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Ecosystem query failed:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  
  extractActionsFromResponse(response) {
    // Extract actionable items from Farmhand response
    const actions = [];
    
    if (response.suggested_actions) {
      for (const suggestion of response.suggested_actions) {
        if (suggestion.bot_action) {
          actions.push({
            botId: suggestion.bot_id,
            action: suggestion.action,
            params: suggestion.params || {}
          });
        }
      }
    }
    
    return actions;
  }

  async generateEcosystemSummary(query, farmhandResponse, botResults) {
    const successful = botResults.filter(r => r.success).length;
    const total = botResults.length;
    
    return {
      query,
      analysis: farmhandResponse.summary || 'Analysis completed',
      actionsExecuted: total,
      actionsSuccessful: successful,
      successRate: total > 0 ? successful / total : 1,
      keyInsights: farmhandResponse.key_insights || [],
      nextSteps: farmhandResponse.next_steps || []
    };
  }

  // Additional helper methods...
  
  async storeWorkflowExecution(execution) {
    // Store in database or file system
    console.log(`💾 Storing workflow execution: ${execution.id}`);
  }
  
  async getSystemHealth() {
    return {
      overall: 'healthy',
      farmhand: 'active',
      bots: 'active',
      learning: 'active'
    };
  }
  
  async identifyOptimizations() {
    return []; // Placeholder for optimization logic
  }
  
  async executeOptimization(optimization) {
    console.log(`🎯 Executing optimization: ${optimization.name}`);
  }
  
  async syncLearnings() {
    console.log('🔄 Syncing learnings between systems');
  }
  
  async updateWorkflowPriorities() {
    console.log('📊 Updating workflow priorities');
  }
  
  async cleanupOldExecutions() {
    console.log('🧹 Cleaning up old executions');
  }
  
  logUnhandledAlert(alert) {
    console.log(`📝 Logging unhandled alert for learning: ${alert.type}`);
  }
  
  updateWorkflowMetrics(workflow) {
    console.log(`📈 Updated metrics for workflow: ${workflow.workflowId}`);
  }
}

// Export singleton instance
export default new EcosystemOrchestrator();