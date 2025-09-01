/**
 * ACT Farmhand AI - Farm Workflow API Routes
 * RESTful API for farm metaphor workflow system with real-time processing
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import FarmWorkflowProcessor from '../services/farmWorkflowProcessor.js';

const router = express.Router();

// Initialize the Farm Workflow Processor
let farmProcessor = null;

async function initializeProcessor() {
  if (!farmProcessor) {
    farmProcessor = new FarmWorkflowProcessor();
    console.log('🌾 Farm Workflow Processor initialized');
    
    // Set up event listeners for real-time updates
    farmProcessor.on('queryStarted', (data) => {
      console.log(`🌱 Query started: ${data.query}`);
    });
    
    farmProcessor.on('queryCompleted', (data) => {
      console.log(`🌾 Query completed: ${data.processingTime}ms`);
    });
    
    farmProcessor.on('taskCreated', (task) => {
      console.log(`🌱 New task seeded: ${task.title}`);
    });
    
    farmProcessor.on('taskProcessingCompleted', (data) => {
      console.log(`🌾 Task harvested: ${data.task.title}`);
    });
  }
  return farmProcessor;
}

/**
 * Process natural language query through farm workflow
 * POST /api/farm-workflow/query
 */
router.post('/query', optionalAuth, asyncHandler(async (req, res) => {
  const { query, context = {} } = req.body;
  
  if (!query || query.trim().length === 0) {
    return res.status(400).json({
      error: 'Query required',
      message: 'Please provide a natural language query for the farm workflow'
    });
  }
  
  const processor = await initializeProcessor();
  const result = await processor.processNaturalLanguageQuery(query, context);
  
  res.json({
    success: true,
    farm_query: query,
    ...result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get current farm status including skill pods and active tasks
 * GET /api/farm-workflow/status
 */
router.get('/status', optionalAuth, asyncHandler(async (req, res) => {
  const processor = await initializeProcessor();
  
  const skillPodStates = processor.getSkillPodStates();
  const activeTasks = processor.getActiveTasks();
  const healthMetrics = processor.getFarmHealthMetrics();
  
  res.json({
    success: true,
    farm_status: {
      skill_pods: skillPodStates,
      active_tasks: activeTasks,
      health_metrics: healthMetrics,
      processing_queue_length: processor.processingQueue?.length || 0,
      continuous_processing_active: processor.continuousProcessing
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get all active workflow tasks
 * GET /api/farm-workflow/tasks
 */
router.get('/tasks', optionalAuth, asyncHandler(async (req, res) => {
  const { status, type, priority } = req.query;
  const processor = await initializeProcessor();
  
  let tasks = processor.getActiveTasks();
  
  // Apply filters
  if (status) {
    tasks = tasks.filter(task => task.farmStage === status);
  }
  if (type) {
    tasks = tasks.filter(task => task.type === type);
  }
  if (priority) {
    tasks = tasks.filter(task => task.priority === priority);
  }
  
  res.json({
    success: true,
    tasks: tasks,
    total_count: tasks.length,
    filters_applied: { status, type, priority },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get specific task details
 * GET /api/farm-workflow/tasks/:taskId
 */
router.get('/tasks/:taskId', optionalAuth, asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const processor = await initializeProcessor();
  
  const task = processor.getTaskById(taskId);
  
  if (!task) {
    return res.status(404).json({
      error: 'Task not found',
      message: `No task found with ID: ${taskId}`
    });
  }
  
  res.json({
    success: true,
    task: task,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Create a new workflow task manually
 * POST /api/farm-workflow/tasks
 */
router.post('/tasks', optionalAuth, asyncHandler(async (req, res) => {
  const {
    title,
    description,
    type = 'general_intelligence',
    priority = 'medium',
    skillPodsRequired = ['knowledge-librarian'],
    culturalConsiderations = [],
    expectedOutcomes = []
  } = req.body;
  
  if (!title || !description) {
    return res.status(400).json({
      error: 'Title and description required',
      message: 'Please provide both title and description for the workflow task'
    });
  }
  
  const processor = await initializeProcessor();
  
  const task = await processor.createWorkflowTask({
    title,
    description,
    type,
    priority,
    skillPodsRequired,
    culturalConsiderations,
    expectedOutcomes
  });
  
  res.status(201).json({
    success: true,
    message: 'Task seeded successfully',
    task: task,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Update task progress or add insights
 * PATCH /api/farm-workflow/tasks/:taskId
 */
router.patch('/tasks/:taskId', optionalAuth, asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { progress, insights, blockers, status } = req.body;
  
  const processor = await initializeProcessor();
  const task = processor.getTaskById(taskId);
  
  if (!task) {
    return res.status(404).json({
      error: 'Task not found',
      message: `No task found with ID: ${taskId}`
    });
  }
  
  // Update task properties
  if (progress !== undefined) {
    task.progress = Math.min(100, Math.max(0, progress));
    
    // Update farm stage based on progress
    if (task.progress >= 95) {
      task.farmStage = 'harvested';
      task.status = 'completed';
    } else if (task.progress >= 75) {
      task.farmStage = 'blooming';
    } else if (task.progress >= 25) {
      task.farmStage = 'growing';
    }
  }
  
  if (insights && Array.isArray(insights)) {
    insights.forEach(insight => {
      task.insights.push({
        ...insight,
        timestamp: new Date().toISOString(),
        source: 'manual_update'
      });
    });
  }
  
  if (blockers && Array.isArray(blockers)) {
    blockers.forEach(blocker => {
      task.blockers.push({
        ...blocker,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  if (status) {
    task.status = status;
  }
  
  task.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Task updated successfully',
    task: task,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get skill pod performance and activity data
 * GET /api/farm-workflow/skill-pods
 */
router.get('/skill-pods', optionalAuth, asyncHandler(async (req, res) => {
  const processor = await initializeProcessor();
  const skillPodStates = processor.getSkillPodStates();
  
  res.json({
    success: true,
    skill_pods: skillPodStates,
    farm_elements: {
      'dna-guardian': 'Sacred Grove',
      'knowledge-librarian': 'Seed Library', 
      'compliance-sentry': 'Boundary Fence',
      'finance-copilot': 'Resource Silo',
      'opportunity-scout': 'Watchtower',
      'story-weaver': 'Storytelling Circle',
      'systems-seeder': 'Innovation Plot',
      'impact-analyst': 'Harvest Scale'
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get specific skill pod details and performance
 * GET /api/farm-workflow/skill-pods/:podId
 */
router.get('/skill-pods/:podId', optionalAuth, asyncHandler(async (req, res) => {
  const { podId } = req.params;
  const processor = await initializeProcessor();
  const skillPodStates = processor.getSkillPodStates();
  
  const podState = skillPodStates[podId];
  if (!podState) {
    return res.status(404).json({
      error: 'Skill pod not found',
      message: `No skill pod found with ID: ${podId}`,
      available_pods: Object.keys(skillPodStates)
    });
  }
  
  res.json({
    success: true,
    skill_pod: {
      id: podId,
      ...podState
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get farm health metrics and dashboard data
 * GET /api/farm-workflow/health
 */
router.get('/health', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const processor = await initializeProcessor();
    const healthMetrics = processor.getFarmHealthMetrics();
    const skillPodStates = processor.getSkillPodStates();
    const activeTasks = processor.getActiveTasks();
    
    // Calculate additional farm metrics
    const farmMetrics = {
      ...healthMetrics,
      
      // Task distribution by stage
      task_distribution: {
        seeded: activeTasks.filter(t => t.farmStage === 'seeded').length,
        growing: activeTasks.filter(t => t.farmStage === 'growing').length,
        blooming: activeTasks.filter(t => t.farmStage === 'blooming').length,
        harvested: activeTasks.filter(t => t.farmStage === 'harvested').length
      },
      
      // Priority distribution
      priority_distribution: {
        urgent: activeTasks.filter(t => t.priority === 'urgent').length,
        high: activeTasks.filter(t => t.priority === 'high').length,
        medium: activeTasks.filter(t => t.priority === 'medium').length,
        low: activeTasks.filter(t => t.priority === 'low').length
      },
      
      // Skill pod efficiency
      pod_efficiency: Object.values(skillPodStates).reduce((sum, pod) => sum + pod.performance.successRate, 0) / Object.keys(skillPodStates).length,
      
      // Average task progress
      average_task_progress: activeTasks.length > 0 
        ? activeTasks.reduce((sum, task) => sum + task.progress, 0) / activeTasks.length 
        : 0
    };
    
    res.json({
      success: true,
      status: 'healthy',
      farm_name: 'ACT Farmhand AI Intelligence Farm',
      version: '1.0.0',
      metrics: farmMetrics,
      continuous_processing: processor.continuousProcessing,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Get recent farm activity feed
 * GET /api/farm-workflow/activity
 */
router.get('/activity', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  const processor = await initializeProcessor();
  
  // In a real implementation, this would come from a persistent activity log
  const recentActivity = [
    {
      id: 1,
      type: 'task_created',
      message: '🌱 New community story harvest task seeded',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      farm_stage: 'seeded'
    },
    {
      id: 2,
      type: 'pod_activity',
      message: '🔍 Opportunity Scout found 3 new funding matches',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      pod_id: 'opportunity-scout'
    },
    {
      id: 3,
      type: 'task_progress',
      message: '🌿 Funding opportunity scan moved to blooming stage',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      farm_stage: 'blooming'
    },
    {
      id: 4,
      type: 'insight_generated',
      message: '📊 Impact Analyst calculated SROI for Justice Hub project',
      timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
      pod_id: 'impact-analyst'
    },
    {
      id: 5,
      type: 'cultural_validation',
      message: '🛡️ DNA Guardian validated cultural protocols for story collection',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      pod_id: 'dna-guardian'
    }
  ];
  
  res.json({
    success: true,
    activity: recentActivity.slice(0, parseInt(limit)),
    total_activities: recentActivity.length,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Trigger background intelligence gathering
 * POST /api/farm-workflow/intelligence/trigger
 */
router.post('/intelligence/trigger', optionalAuth, asyncHandler(async (req, res) => {
  const processor = await initializeProcessor();
  
  try {
    await processor.runBackgroundIntelligence();
    
    res.json({
      success: true,
      message: 'Background intelligence gathering triggered',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger background intelligence',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Get workflow analytics and insights
 * GET /api/farm-workflow/analytics
 */
router.get('/analytics', optionalAuth, asyncHandler(async (req, res) => {
  const { timeframe = '7d' } = req.query;
  const processor = await initializeProcessor();
  
  const skillPodStates = processor.getSkillPodStates();
  const activeTasks = processor.getActiveTasks();
  
  // Generate analytics based on current state
  const analytics = {
    productivity_metrics: {
      tasks_per_day: activeTasks.length / 7, // Simulated
      avg_completion_time: '3.2 days', // Simulated
      success_rate: 0.94,
      cultural_safety_avg: activeTasks.reduce((sum, t) => sum + t.culturalSafety, 0) / activeTasks.length || 95
    },
    
    skill_pod_performance: Object.entries(skillPodStates).map(([podId, state]) => ({
      pod_id: podId,
      insights_generated: state.insights,
      avg_response_time: state.performance.avgResponseTime,
      success_rate: state.performance.successRate,
      utilization: state.performance.totalQueries / 100 // Normalized utilization
    })),
    
    task_trends: {
      by_type: activeTasks.reduce((acc, task) => {
        acc[task.type] = (acc[task.type] || 0) + 1;
        return acc;
      }, {}),
      
      by_priority: activeTasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {}),
      
      completion_trend: [85, 92, 88, 94, 91, 96, 93] // Simulated weekly completion rates
    },
    
    cultural_impact: {
      stories_collected: 127, // Simulated
      cultural_protocols_validated: 245, // Simulated
      community_benefit_score: 0.89,
      indigenous_data_sovereignty: 'fully_compliant'
    }
  };
  
  res.json({
    success: true,
    analytics: analytics,
    timeframe: timeframe,
    generated_at: new Date().toISOString()
  });
}));

export default router;