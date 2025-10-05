/**
 * ACT Farmhand AI - Continuous Farm Workflow Processing Engine
 * Real-time intelligence processing with farm metaphor workflow management
 */

import ACTFarmhandAgent from './actFarmhandAgent.js';
import { EventEmitter } from 'events';

class FarmWorkflowProcessor extends EventEmitter {
  constructor() {
    super();
    this.farmhandAgent = new ACTFarmhandAgent();
    this.activeTasks = new Map();
    this.processingQueue = [];
    this.skillPodStates = new Map();
    this.isProcessing = false;
    this.continuousProcessing = false;
    
    this.initializeSkillPodStates();
    this.startContinuousProcessing();
  }

  initializeSkillPodStates() {
    const skillPods = [
      'dna-guardian', 'knowledge-librarian', 'compliance-sentry', 'finance-copilot',
      'opportunity-scout', 'story-weaver', 'systems-seeder', 'impact-analyst'
    ];

    skillPods.forEach(podId => {
      this.skillPodStates.set(podId, {
        status: 'idle',
        progress: 0,
        lastActivity: 'Initializing...',
        insights: 0,
        activeQueries: [],
        performance: {
          avgResponseTime: 0,
          totalQueries: 0,
          successRate: 1.0
        }
      });
    });
  }

  async startContinuousProcessing() {
    this.continuousProcessing = true;
    
    // Background intelligence gathering every 30 seconds
    setInterval(() => {
      if (!this.isProcessing) {
        this.runBackgroundIntelligence();
      }
    }, 30000);

    // Process pending tasks every 5 seconds
    setInterval(() => {
      this.processTaskQueue();
    }, 5000);

    // Update skill pod activities every 10 seconds
    setInterval(() => {
      this.updateSkillPodActivities();
    }, 10000);

    console.log('🌾 Farm Workflow Processor started - continuous intelligence active');
  }

  async processNaturalLanguageQuery(query, context = {}) {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`🌱 Processing farm query: "${query}"`);
      this.emit('queryStarted', { queryId, query });

      // Route query through ACT Farmhand Agent
      const startTime = Date.now();
      const response = await this.farmhandAgent.processQuery(query, context);
      const processingTime = Date.now() - startTime;

      // Analyze query intent and create workflow tasks if needed
      const workflowTasks = await this.generateWorkflowTasks(query, response, context);
      
      // Update skill pod states based on processing
      this.updateSkillPodStatesFromResponse(response, processingTime);

      const result = {
        queryId,
        query,
        response,
        processingTime,
        workflowTasks,
        skillPodsInvolved: response.skill_pods_consulted || [],
        farmMetaphor: this.generateFarmMetaphor(query, response),
        culturalSafety: response.cultural_safety_score || 95,
        actionableInsights: response.insights || [],
        recommendedActions: response.actions || []
      };

      this.emit('queryCompleted', result);
      console.log(`🌾 Query processed in ${processingTime}ms - ${workflowTasks.length} tasks generated`);
      
      return result;

    } catch (error) {
      console.error('❌ Farm query processing error:', error);
      this.emit('queryError', { queryId, query, error: error.message });
      throw error;
    }
  }

  async generateWorkflowTasks(query, response, context) {
    const tasks = [];

    // Analyze response to identify actionable tasks
    if (response.actions && response.actions.length > 0) {
      for (const action of response.actions) {
        const task = await this.createWorkflowTask({
          title: action.title || action.description,
          description: action.details || action.description,
          type: this.determineTaskType(action, query),
          priority: this.calculateTaskPriority(action, response),
          estimatedEffort: action.estimated_effort || 'medium',
          skillPodsRequired: this.identifyRequiredSkillPods(action, query),
          culturalConsiderations: action.cultural_considerations || [],
          expectedOutcomes: action.expected_outcomes || []
        });
        tasks.push(task);
      }
    }

    // Generate proactive tasks based on query analysis
    const proactiveTasks = await this.generateProactiveTasks(query, response, context);
    tasks.push(...proactiveTasks);

    return tasks;
  }

  async createWorkflowTask(taskData) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task = {
      id: taskId,
      title: taskData.title,
      description: taskData.description,
      type: taskData.type,
      priority: taskData.priority,
      status: 'seeded',
      progress: 0,
      createdAt: new Date().toISOString(),
      skillPodsAssigned: taskData.skillPodsRequired,
      estimatedEffort: taskData.estimatedEffort,
      culturalSafety: 90, // Base score, updated as task progresses
      
      // Farm metaphor elements
      farmMetaphor: this.generateTaskFarmMetaphor(taskData.type, taskData.priority),
      farmStage: 'seeded', // seeded -> growing -> blooming -> harvested
      estimatedYield: this.calculateEstimatedYield(taskData),
      
      // Progress tracking
      milestones: this.generateTaskMilestones(taskData),
      insights: [],
      blockers: [],
      
      // Cultural and ethical tracking
      culturalConsiderations: taskData.culturalConsiderations,
      communityBenefit: this.assessCommunityBenefit(taskData),
      stakeholderImpact: taskData.expectedOutcomes
    };

    this.activeTasks.set(taskId, task);
    this.emit('taskCreated', task);
    
    // Add to processing queue
    this.processingQueue.push({
      type: 'process_task',
      taskId: taskId,
      priority: task.priority
    });

    console.log(`🌱 New workflow task seeded: ${task.title}`);
    return task;
  }

  async processTaskQueue() {
    if (this.processingQueue.length === 0 || this.isProcessing) return;

    // Sort queue by priority
    this.processingQueue.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const queueItem = this.processingQueue.shift();
    
    if (queueItem.type === 'process_task') {
      await this.processWorkflowTask(queueItem.taskId);
    } else if (queueItem.type === 'background_intelligence') {
      await this.runBackgroundIntelligence();
    }
  }

  async processWorkflowTask(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    this.isProcessing = true;
    console.log(`🌿 Processing workflow task: ${task.title}`);
    this.emit('taskProcessingStarted', { taskId, task });

    try {
      // Update task to growing stage
      if (task.farmStage === 'seeded') {
        task.farmStage = 'growing';
        task.progress = 25;
      }

      // Process task through relevant skill pods
      const processingResults = [];
      
      for (const podId of task.skillPodsAssigned) {
        const podResult = await this.processTaskThroughSkillPod(task, podId);
        processingResults.push(podResult);
        
        // Update progress incrementally
        task.progress = Math.min(90, task.progress + (60 / task.skillPodsAssigned.length));
        this.emit('taskProgressUpdated', { taskId, progress: task.progress });
      }

      // Synthesize results from all skill pods
      const synthesizedInsights = await this.synthesizeTaskResults(task, processingResults);
      task.insights.push(...synthesizedInsights);

      // Update task stage based on progress
      if (task.progress >= 80) {
        task.farmStage = 'blooming';
      }
      if (task.progress >= 95) {
        task.farmStage = 'harvested';
        task.status = 'completed';
      }

      // Update cultural safety score based on processing
      task.culturalSafety = this.calculateTaskCulturalSafety(task, processingResults);

      this.emit('taskProcessingCompleted', { taskId, task, insights: synthesizedInsights });
      console.log(`🌾 Task processing completed: ${task.title} (${task.progress}% complete)`);

    } catch (error) {
      console.error(`❌ Task processing error for ${task.title}:`, error);
      task.blockers.push({
        type: 'processing_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      this.emit('taskError', { taskId, error: error.message });
    } finally {
      this.isProcessing = false;
    }
  }

  async processTaskThroughSkillPod(task, podId) {
    const podState = this.skillPodStates.get(podId);
    if (!podState) throw new Error(`Unknown skill pod: ${podId}`);

    console.log(`🔄 Processing task through ${podId}`);
    podState.status = 'processing';
    podState.activeQueries.push(task.id);

    const startTime = Date.now();
    
    try {
      // Get the appropriate skill pod from the farmhand agent
      const skillPod = this.farmhandAgent.skillPods[this.mapPodIdToAgentPod(podId)];
      
      if (!skillPod) {
        throw new Error(`Skill pod not found in agent: ${podId}`);
      }

      // Create task-specific context
      const taskContext = {
        task_id: task.id,
        task_type: task.type,
        task_description: task.description,
        cultural_considerations: task.culturalConsiderations,
        priority: task.priority
      };

      // Process task through skill pod
      const podResult = await skillPod.process(task.description, taskContext);
      
      const processingTime = Date.now() - startTime;

      // Update pod performance metrics
      podState.performance.totalQueries++;
      podState.performance.avgResponseTime = 
        (podState.performance.avgResponseTime + processingTime) / 2;
      podState.insights++;
      podState.lastActivity = `Processed: ${task.title.substring(0, 30)}...`;
      podState.progress = Math.min(100, podState.progress + 10);

      podState.status = 'idle';
      podState.activeQueries = podState.activeQueries.filter(id => id !== task.id);

      return {
        podId,
        result: podResult,
        processingTime,
        success: true
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Update pod error metrics
      podState.performance.successRate = 
        (podState.performance.successRate * podState.performance.totalQueries) / 
        (podState.performance.totalQueries + 1);
      podState.status = 'error';
      podState.lastActivity = `Error: ${error.message.substring(0, 50)}...`;
      
      console.error(`❌ Skill pod ${podId} processing error:`, error);
      
      return {
        podId,
        error: error.message,
        processingTime,
        success: false
      };
    }
  }

  mapPodIdToAgentPod(podId) {
    const mapping = {
      'dna-guardian': 'DNA Guardian',
      'knowledge-librarian': 'Knowledge Librarian',
      'compliance-sentry': 'Compliance Sentry',
      'finance-copilot': 'Finance Copilot',
      'opportunity-scout': 'Opportunity Scout',
      'story-weaver': 'Story Weaver',
      'systems-seeder': 'Systems Seeder',
      'impact-analyst': 'Impact Analyst'
    };
    return mapping[podId];
  }

  async synthesizeTaskResults(task, processingResults) {
    const successfulResults = processingResults.filter(r => r.success);
    const insights = [];

    // Combine insights from all successful pod results
    successfulResults.forEach(result => {
      if (result.result.insight) {
        insights.push({
          source: result.podId,
          insight: result.result.insight,
          confidence: result.result.confidence || 0.8,
          culturalSafety: result.result.cultural_safety_score || 90,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Generate synthesized recommendations
    if (insights.length > 1) {
      const synthesized = {
        type: 'synthesized_insight',
        content: `Insights from ${successfulResults.length} skill pods converge on actionable recommendations for ${task.title}`,
        recommendations: this.generateSynthesizedRecommendations(insights),
        confidence: insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length,
        timestamp: new Date().toISOString()
      };
      insights.push(synthesized);
    }

    return insights;
  }

  generateSynthesizedRecommendations(insights) {
    // Simple synthesis logic - in a real system this would be more sophisticated
    const recommendations = [];
    
    // Look for common themes across insights
    const themes = {};
    insights.forEach(insight => {
      // Extract key terms (simplified approach)
      const words = insight.insight.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 4) { // Filter short words
          themes[word] = (themes[word] || 0) + 1;
        }
      });
    });

    // Generate recommendations based on most common themes
    const topThemes = Object.entries(themes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    topThemes.forEach(([theme, frequency]) => {
      recommendations.push({
        action: `Focus on ${theme}-related activities`,
        priority: frequency > 2 ? 'high' : 'medium',
        rationale: `This theme appeared in ${frequency} skill pod insights`
      });
    });

    return recommendations;
  }

  async runBackgroundIntelligence() {
    console.log('🔍 Running background intelligence gathering...');
    
    const backgroundTasks = [
      'Check for new funding opportunities',
      'Scan community stories for emerging themes',
      'Monitor compliance landscape changes',
      'Analyze relationship network evolution',
      'Assess system performance metrics'
    ];

    const randomTask = backgroundTasks[Math.floor(Math.random() * backgroundTasks.length)];
    
    try {
      const result = await this.farmhandAgent.processQuery(
        randomTask,
        { background: true, automated: true }
      );

      this.emit('backgroundIntelligence', {
        task: randomTask,
        insights: result.insights || [],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Background intelligence error:', error);
    }
  }

  updateSkillPodActivities() {
    const activities = [
      'Validating cultural protocols...',
      'Indexing community knowledge...',
      'Monitoring compliance status...',
      'Analyzing financial patterns...',
      'Scanning for opportunities...',
      'Processing story narratives...',
      'Identifying system improvements...',
      'Measuring impact outcomes...'
    ];

    this.skillPodStates.forEach((state, podId) => {
      if (state.status === 'idle' && Math.random() > 0.7) {
        state.lastActivity = activities[Math.floor(Math.random() * activities.length)];
        state.progress = Math.min(100, state.progress + Math.random() * 5);
      }
    });

    this.emit('skillPodStatesUpdated', Object.fromEntries(this.skillPodStates));
  }

  // Utility methods for task generation and management
  determineTaskType(action, query) {
    if (query.toLowerCase().includes('story') || query.toLowerCase().includes('narrative')) {
      return 'story_collection';
    } else if (query.toLowerCase().includes('fund') || query.toLowerCase().includes('grant')) {
      return 'funding_opportunity';
    } else if (query.toLowerCase().includes('impact') || query.toLowerCase().includes('measure')) {
      return 'impact_analysis';
    } else if (query.toLowerCase().includes('system') || query.toLowerCase().includes('process')) {
      return 'system_improvement';
    }
    return 'general_intelligence';
  }

  calculateTaskPriority(action, response) {
    // Simple priority calculation based on response characteristics
    const urgencyKeywords = ['urgent', 'immediate', 'crisis', 'deadline'];
    const highKeywords = ['important', 'significant', 'critical', 'priority'];
    
    const actionText = (action.description || action.title || '').toLowerCase();
    
    if (urgencyKeywords.some(keyword => actionText.includes(keyword))) {
      return 'urgent';
    } else if (highKeywords.some(keyword => actionText.includes(keyword))) {
      return 'high';
    } else if (response.confidence > 0.8) {
      return 'medium';
    }
    return 'low';
  }

  identifyRequiredSkillPods(action, query) {
    const podMapping = {
      'story': ['story-weaver', 'dna-guardian', 'impact-analyst'],
      'fund': ['opportunity-scout', 'finance-copilot', 'compliance-sentry'],
      'compliance': ['compliance-sentry', 'dna-guardian'],
      'impact': ['impact-analyst', 'story-weaver', 'systems-seeder'],
      'system': ['systems-seeder', 'knowledge-librarian', 'impact-analyst'],
      'cultural': ['dna-guardian', 'story-weaver'],
      'financial': ['finance-copilot', 'opportunity-scout'],
      'knowledge': ['knowledge-librarian', 'systems-seeder']
    };

    const text = `${action.description || ''} ${query}`.toLowerCase();
    const requiredPods = new Set();

    Object.entries(podMapping).forEach(([keyword, pods]) => {
      if (text.includes(keyword)) {
        pods.forEach(pod => requiredPods.add(pod));
      }
    });

    // Ensure at least one pod is assigned
    if (requiredPods.size === 0) {
      requiredPods.add('knowledge-librarian');
    }

    return Array.from(requiredPods);
  }

  generateTaskFarmMetaphor(type, priority) {
    const metaphors = {
      story_collection: {
        urgent: 'Rich narrative harvest ready for immediate collection',
        high: 'Mature stories ready for careful gathering',
        medium: 'Growing story crop developing nicely',
        low: 'Story seeds planted for future harvest'
      },
      funding_opportunity: {
        urgent: 'Ripe funding opportunities must be picked now',
        high: 'Prime partnership soil ready for cultivation',
        medium: 'Promising funding leads taking root',
        low: 'Early-stage opportunity seeds planted'
      },
      impact_analysis: {
        urgent: 'Critical impact assessment needed immediately',
        high: 'Impact measurement ready for detailed analysis',
        medium: 'Community outcomes growing and developing',
        low: 'Impact tracking seeds planted for monitoring'
      },
      system_improvement: {
        urgent: 'System optimization requires immediate attention',
        high: 'Mature improvement opportunities ready to harvest',
        medium: 'System enhancement ideas taking root',
        low: 'Innovation seeds planted in fertile system soil'
      },
      general_intelligence: {
        urgent: 'Urgent intelligence gathering required',
        high: 'High-priority intelligence ready for collection',
        medium: 'Growing intelligence insights developing',
        low: 'Intelligence seeds planted for future insights'
      }
    };

    return metaphors[type]?.[priority] || 'New intelligence opportunity planted in the farm';
  }

  calculateEstimatedYield(taskData) {
    const yieldEstimates = {
      story_collection: '8-12 culturally-safe community stories with impact data',
      funding_opportunity: '5-8 high-match funding opportunities with application strategies',
      impact_analysis: 'Comprehensive impact report with SROI calculations and cultural indicators',
      system_improvement: 'Detailed improvement roadmap with regenerative design recommendations',
      general_intelligence: 'Strategic insights and actionable recommendations'
    };

    return yieldEstimates[taskData.type] || 'Valuable insights and actionable intelligence';
  }

  generateTaskMilestones(taskData) {
    const baseMilestones = [
      { name: 'Seeded', description: 'Task created and assigned to skill pods', progress: 0 },
      { name: 'Growing', description: 'Initial processing and data gathering', progress: 25 },
      { name: 'Blooming', description: 'Analysis and insight generation', progress: 75 },
      { name: 'Harvested', description: 'Completed with actionable outcomes', progress: 100 }
    ];

    return baseMilestones;
  }

  assessCommunityBenefit(taskData) {
    // Simple benefit assessment - in real system would be more sophisticated
    const benefitIndicators = {
      story_collection: 'Amplifies community voices and preserves cultural narratives',
      funding_opportunity: 'Increases access to resources for community development',
      impact_analysis: 'Demonstrates value and improves program effectiveness',
      system_improvement: 'Enhances organizational capacity and sustainability',
      general_intelligence: 'Provides strategic insights for community benefit'
    };

    return benefitIndicators[taskData.type] || 'Supports community goals and objectives';
  }

  calculateTaskCulturalSafety(task, processingResults) {
    let totalSafety = 0;
    let count = 0;

    processingResults.forEach(result => {
      if (result.success && result.result.cultural_safety_score) {
        totalSafety += result.result.cultural_safety_score;
        count++;
      }
    });

    if (count === 0) return 85; // Default safe score

    const averageSafety = totalSafety / count;
    
    // Apply penalties for cultural considerations
    let adjustedSafety = averageSafety;
    if (task.culturalConsiderations.length > 0) {
      // Bonus for having cultural considerations documented
      adjustedSafety += 5;
    }

    return Math.min(100, Math.max(0, adjustedSafety));
  }

  generateFarmMetaphor(query, response) {
    const metaphors = [
      'Seeds of wisdom planted in fertile community soil',
      'Intelligence harvest ripening in the cultural garden',
      'Knowledge crop growing strong with careful tending',
      'Insights blooming in the regenerative intelligence farm',
      'Wisdom yield ready for community harvest'
    ];

    return metaphors[Math.floor(Math.random() * metaphors.length)];
  }

  updateSkillPodStatesFromResponse(response, processingTime) {
    if (response.skill_pods_consulted) {
      response.skill_pods_consulted.forEach(podName => {
        const podId = Object.entries(this.mapPodIdToAgentPod()).find(([,name]) => name === podName)?.[0];
        if (podId) {
          const state = this.skillPodStates.get(podId);
          if (state) {
            state.performance.totalQueries++;
            state.performance.avgResponseTime = 
              (state.performance.avgResponseTime + processingTime) / 2;
            state.insights++;
            state.progress = Math.min(100, state.progress + 5);
          }
        }
      });
    }
  }

  async generateProactiveTasks(query, response, context) {
    // Generate proactive tasks based on query patterns and response analysis
    const proactiveTasks = [];

    // If query is about stories, suggest impact analysis
    if (query.toLowerCase().includes('story') || query.toLowerCase().includes('narrative')) {
      proactiveTasks.push(await this.createWorkflowTask({
        title: 'Story Impact Analysis',
        description: 'Analyze collected stories for impact measurement and funding applications',
        type: 'impact_analysis',
        priority: 'medium',
        skillPodsRequired: ['impact-analyst', 'story-weaver'],
        culturalConsiderations: ['Ensure story consent for analysis use'],
        expectedOutcomes: ['Impact metrics for stories', 'Funding application content']
      }));
    }

    // If query mentions funding, suggest compliance check
    if (query.toLowerCase().includes('fund') || query.toLowerCase().includes('grant')) {
      proactiveTasks.push(await this.createWorkflowTask({
        title: 'Funding Compliance Verification',
        description: 'Verify organizational compliance for identified funding opportunities',
        type: 'compliance_check',
        priority: 'high',
        skillPodsRequired: ['compliance-sentry', 'finance-copilot'],
        culturalConsiderations: ['Ensure cultural alignment with funder values'],
        expectedOutcomes: ['Compliance status report', 'Application readiness assessment']
      }));
    }

    return proactiveTasks;
  }

  // Public API methods for external integration
  getSkillPodStates() {
    return Object.fromEntries(this.skillPodStates);
  }

  getActiveTasks() {
    return Array.from(this.activeTasks.values());
  }

  getTaskById(taskId) {
    return this.activeTasks.get(taskId);
  }

  getFarmHealthMetrics() {
    const skillPods = Array.from(this.skillPodStates.values());
    const tasks = Array.from(this.activeTasks.values());

    return {
      culturalSafety: tasks.length > 0 
        ? tasks.reduce((sum, task) => sum + task.culturalSafety, 0) / tasks.length 
        : 95,
      systemPerformance: skillPods.reduce((sum, pod) => sum + pod.performance.successRate, 0) / skillPods.length * 100,
      communityEngagement: Math.random() * 20 + 80, // Simulated for now
      totalInsights: skillPods.reduce((sum, pod) => sum + pod.insights, 0),
      activeTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length
    };
  }
}

export default FarmWorkflowProcessor;