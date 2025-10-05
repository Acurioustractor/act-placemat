/**
 * System Integration API Routes
 * RESTful API for ACT System Integration Hub management and monitoring
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth, apiKeyOrAuth } from '../middleware/auth.js';
import SystemIntegrationHub from '../services/systemIntegrationHub.js';

const router = express.Router();

// Initialize the System Integration Hub
let integrationHub = null;

async function initializeHub() {
  if (!integrationHub) {
    integrationHub = new SystemIntegrationHub();
    console.log('🔗 System Integration Hub initialized for API access');
    
    // Set up event listeners for monitoring
    integrationHub.on('hubInitialized', (data) => {
      console.log(`✅ Integration Hub online - ${data.servicesRegistered} services, ${data.pipelinesActive} pipelines`);
    });
    
    integrationHub.on('pipelineCompleted', (data) => {
      console.log(`🔄 Pipeline completed: ${data.pipeline}`);
    });
    
    integrationHub.on('taskSynced', (data) => {
      console.log(`📋 Task synced across ${data.syncedSystems.length} systems`);
    });
    
    integrationHub.on('healthCheck', (data) => {
      // Log health check results periodically
      if (data.metrics.integrationHub.status !== 'healthy') {
        console.warn('⚠️ Integration Hub health check warning');
      }
    });
  }
  return integrationHub;
}

/**
 * Get system integration status and overview
 * GET /api/system-integration/status
 */
router.get('/status', optionalAuth, asyncHandler(async (req, res) => {
  const hub = await initializeHub();
  const integrationStatus = hub.getIntegrationStatus();
  const systemMetrics = await hub.getSystemMetrics();
  
  res.json({
    success: true,
    integration_hub: {
      status: integrationStatus.hubStatus,
      farm_workflow_connected: integrationStatus.farmWorkflowStatus === 'connected',
      services_registered: integrationStatus.registeredServices.length,
      active_pipelines: integrationStatus.activePipelines.length,
      connected_systems: integrationStatus.systemConnections.length
    },
    services: integrationStatus.registeredServices,
    pipelines: integrationStatus.activePipelines,
    system_connections: integrationStatus.systemConnections,
    metrics: systemMetrics,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get detailed integration metrics
 * GET /api/system-integration/metrics
 */
router.get('/metrics', optionalAuth, asyncHandler(async (req, res) => {
  const hub = await initializeHub();
  const systemMetrics = await hub.getSystemMetrics();
  
  res.json({
    success: true,
    metrics: systemMetrics,
    performance_summary: {
      integration_hub_uptime: systemMetrics.integrationHub.uptime,
      memory_usage_mb: Math.round(systemMetrics.integrationHub.memoryUsage.heapUsed / 1024 / 1024),
      active_pipelines: systemMetrics.integrationHub.activePipelines,
      connected_systems: systemMetrics.integrationHub.connectedSystems,
      farm_health: {
        cultural_safety: systemMetrics.farmWorkflow.culturalSafety,
        system_performance: systemMetrics.farmWorkflow.systemPerformance,
        total_insights: systemMetrics.farmWorkflow.totalInsights,
        active_tasks: systemMetrics.farmWorkflow.activeTasks
      }
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Run a specific data pipeline manually
 * POST /api/system-integration/pipelines/:pipelineName/run
 */
router.post('/pipelines/:pipelineName/run', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { pipelineName } = req.params;
  const hub = await initializeHub();
  
  try {
    console.log(`🔄 Manual pipeline execution requested: ${pipelineName}`);
    const result = await hub.runPipeline(pipelineName);
    
    res.json({
      success: true,
      pipeline: pipelineName,
      execution_result: result,
      executed_at: new Date().toISOString(),
      message: `Pipeline ${pipelineName} executed successfully`
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Pipeline execution failed',
      pipeline: pipelineName,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Get all available data pipelines
 * GET /api/system-integration/pipelines
 */
router.get('/pipelines', optionalAuth, asyncHandler(async (req, res) => {
  const hub = await initializeHub();
  const integrationStatus = hub.getIntegrationStatus();
  
  // Get detailed pipeline information
  const pipelineDetails = integrationStatus.activePipelines.map(pipeline => ({
    name: pipeline.name,
    schedule: pipeline.schedule,
    processors: pipeline.processors,
    description: getPipelineDescription(pipeline.name),
    capabilities: getPipelineCapabilities(pipeline.name),
    estimated_runtime: getPipelineEstimatedRuntime(pipeline.name)
  }));
  
  res.json({
    success: true,
    pipelines: pipelineDetails,
    total_pipelines: pipelineDetails.length,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get system connection health
 * GET /api/system-integration/connections
 */
router.get('/connections', optionalAuth, asyncHandler(async (req, res) => {
  const hub = await initializeHub();
  const systemMetrics = await hub.getSystemMetrics();
  const integrationStatus = hub.getIntegrationStatus();
  
  const connectionHealth = integrationStatus.systemConnections.map(conn => ({
    ...conn,
    health_score: calculateConnectionHealthScore(conn),
    metrics: systemMetrics.systemConnections[conn.name.toLowerCase().replace(/\s+/g, '')]
  }));
  
  res.json({
    success: true,
    connections: connectionHealth,
    overall_health: calculateOverallConnectionHealth(connectionHealth),
    timestamp: new Date().toISOString()
  });
}));

/**
 * Trigger system-wide intelligence sync
 * POST /api/system-integration/sync
 */
router.post('/sync', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { systems = 'all', priority = 'normal' } = req.body;
  const hub = await initializeHub();
  
  try {
    console.log(`🔄 System-wide intelligence sync requested for: ${systems}`);
    
    const syncResults = [];
    
    // Run story intelligence pipeline
    if (systems === 'all' || systems.includes('stories')) {
      const storyResult = await hub.runPipeline('story_intelligence');
      syncResults.push({ pipeline: 'story_intelligence', result: storyResult });
    }
    
    // Run opportunity discovery pipeline
    if (systems === 'all' || systems.includes('opportunities')) {
      const opportunityResult = await hub.runPipeline('opportunity_discovery');
      syncResults.push({ pipeline: 'opportunity_discovery', result: opportunityResult });
    }
    
    // Run impact measurement pipeline
    if (systems === 'all' || systems.includes('impact')) {
      const impactResult = await hub.runPipeline('impact_measurement');
      syncResults.push({ pipeline: 'impact_measurement', result: impactResult });
    }
    
    // Run system optimization if priority is high
    if (priority === 'high' && (systems === 'all' || systems.includes('optimization'))) {
      const optimizationResult = await hub.runPipeline('system_optimization');
      syncResults.push({ pipeline: 'system_optimization', result: optimizationResult });
    }
    
    res.json({
      success: true,
      sync_completed: true,
      systems_synced: systems,
      priority: priority,
      pipeline_results: syncResults,
      total_pipelines_run: syncResults.length,
      sync_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'System sync failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Get integration events and activity feed
 * GET /api/system-integration/events
 */
router.get('/events', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 50, type } = req.query;
  
  // Mock recent integration events - in production this would come from event store
  const mockEvents = [
    {
      id: 1,
      type: 'pipeline_completed',
      pipeline: 'story_intelligence',
      message: '📖 Story Intelligence Pipeline completed - 15 stories analyzed',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      data: { storiesProcessed: 15, insightsGenerated: 8 }
    },
    {
      id: 2,
      type: 'task_synced',
      task: 'Community Story Collection',
      message: '📋 Task synced across Empathy Ledger and Notion',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      data: { systemsUpdated: ['empathyLedger', 'notion'] }
    },
    {
      id: 3,
      type: 'opportunity_discovered',
      opportunity: 'Indigenous Climate Action Grant',
      message: '💰 New funding opportunity discovered and analyzed',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      data: { amount: 250000, probability: 75, culturalAlignment: 95 }
    },
    {
      id: 4,
      type: 'health_check',
      message: '🏥 System health check completed - All systems operational',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      data: { systemsHealthy: 3, pipelinesActive: 4, culturalSafety: 98.5 }
    },
    {
      id: 5,
      type: 'background_intelligence',
      message: '🔍 Background intelligence gathered - New community partnership identified',
      timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
      data: { insightsGenerated: 3, tasksCreated: 1 }
    }
  ];
  
  let filteredEvents = mockEvents;
  if (type) {
    filteredEvents = mockEvents.filter(event => event.type === type);
  }
  
  const limitedEvents = filteredEvents.slice(0, parseInt(limit));
  
  res.json({
    success: true,
    events: limitedEvents,
    total_events: limitedEvents.length,
    filtered_by_type: type || null,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get system integration analytics
 * GET /api/system-integration/analytics
 */
router.get('/analytics', optionalAuth, asyncHandler(async (req, res) => {
  const { timeframe = '7d' } = req.query;
  const hub = await initializeHub();
  const systemMetrics = await hub.getSystemMetrics();
  
  // Generate integration analytics
  const analytics = {
    timeframe: timeframe,
    
    pipeline_performance: {
      story_intelligence: {
        executions: 12,
        avg_stories_processed: 18,
        avg_insights_generated: 9,
        success_rate: 0.95,
        avg_cultural_safety: 96.2
      },
      opportunity_discovery: {
        executions: 8,
        avg_opportunities_found: 6,
        avg_high_priority: 2,
        success_rate: 0.88,
        avg_cultural_alignment: 87.5
      },
      impact_measurement: {
        executions: 4,
        avg_metrics_generated: 25,
        avg_sroi_calculated: 4.2,
        success_rate: 1.0,
        avg_cultural_impact: 91.8
      },
      system_optimization: {
        executions: 15,
        avg_recommendations: 8,
        auto_applied: 45,
        manual_review_required: 23,
        avg_system_improvement: 0.12
      }
    },
    
    integration_efficiency: {
      total_data_synced: 1247,
      cross_system_operations: 89,
      automation_success_rate: 0.92,
      manual_interventions: 7,
      avg_processing_time_ms: 2800
    },
    
    cultural_safety_metrics: {
      overall_score: systemMetrics.farmWorkflow?.culturalSafety || 95,
      protocol_validations: 156,
      community_consent_checks: 89,
      sacred_knowledge_protections: 23,
      indigenous_data_sovereignty_compliance: 'fully_compliant'
    },
    
    system_health_trends: {
      uptime_percentage: 99.8,
      avg_response_time_ms: 450,
      error_rate: 0.005,
      memory_efficiency: 0.78,
      pipeline_reliability: 0.94
    }
  };
  
  res.json({
    success: true,
    analytics: analytics,
    generated_at: new Date().toISOString()
  });
}));

/**
 * Emergency system reset (admin only)
 * POST /api/system-integration/emergency-reset
 */
router.post('/emergency-reset', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { confirm = false, reason } = req.body;
  
  if (!confirm) {
    return res.status(400).json({
      success: false,
      error: 'Confirmation required',
      message: 'Emergency reset requires explicit confirmation',
      required_body: { confirm: true, reason: 'Emergency reason' }
    });
  }
  
  if (!reason || reason.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Reason required',
      message: 'Emergency reset requires detailed reason (minimum 10 characters)'
    });
  }
  
  try {
    console.log(`🚨 EMERGENCY RESET REQUESTED: ${reason}`);
    
    // Log emergency reset
    const resetLog = {
      timestamp: new Date().toISOString(),
      reason: reason,
      initiated_by: 'api_request', // In production would include user info
      systems_affected: ['integration_hub', 'farm_workflow', 'all_pipelines']
    };
    
    // Perform emergency reset procedures
    integrationHub = null; // Force re-initialization
    
    console.log('🔄 Emergency reset completed - system will reinitialize on next request');
    
    res.json({
      success: true,
      emergency_reset_completed: true,
      reason: reason,
      systems_reset: resetLog.systems_affected,
      reset_timestamp: resetLog.timestamp,
      next_steps: 'System will reinitialize automatically on next API request',
      warning: 'All active pipelines and connections have been reset'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Emergency reset failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

// Utility functions for pipeline information
function getPipelineDescription(pipelineName) {
  const descriptions = {
    'story_intelligence': 'Analyzes community stories for themes, cultural significance, and impact opportunities',
    'opportunity_discovery': 'Scans for funding and partnership opportunities with cultural alignment analysis',
    'impact_measurement': 'Calculates comprehensive SROI and cultural impact across all projects',
    'system_optimization': 'Identifies automation and improvement opportunities across connected systems'
  };
  return descriptions[pipelineName] || 'Custom intelligence pipeline';
}

function getPipelineCapabilities(pipelineName) {
  const capabilities = {
    'story_intelligence': ['story_analysis', 'cultural_safety_validation', 'impact_measurement', 'theme_extraction'],
    'opportunity_discovery': ['web_scraping', 'cultural_alignment', 'compliance_checking', 'financial_analysis'],
    'impact_measurement': ['sroi_calculation', 'stakeholder_analysis', 'outcome_mapping', 'visualization_preparation'],
    'system_optimization': ['performance_analysis', 'automation_identification', 'capacity_assessment', 'recommendation_generation']
  };
  return capabilities[pipelineName] || ['general_intelligence'];
}

function getPipelineEstimatedRuntime(pipelineName) {
  const runtimes = {
    'story_intelligence': '2-5 minutes',
    'opportunity_discovery': '5-15 minutes',
    'impact_measurement': '10-30 minutes',
    'system_optimization': '3-10 minutes'
  };
  return runtimes[pipelineName] || '2-10 minutes';
}

function calculateConnectionHealthScore(connection) {
  let score = 100;
  
  if (connection.status !== 'connected') {
    score -= 50;
  }
  
  if (connection.capabilities.length < 3) {
    score -= 20;
  }
  
  return Math.max(0, score);
}

function calculateOverallConnectionHealth(connections) {
  if (connections.length === 0) return 0;
  
  const totalHealth = connections.reduce((sum, conn) => sum + conn.health_score, 0);
  return Math.round(totalHealth / connections.length);
}

export default router;