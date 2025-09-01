/**
 * Knowledge Graph Sync API
 * RESTful endpoints for managing bidirectional sync between Supabase and Neo4j
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { apiKeyOrAuth, requireAdmin } from '../middleware/auth.js';
import knowledgeGraphSyncService from '../services/knowledgeGraphSyncService.js';

const router = express.Router();

/**
 * GET /api/knowledge-graph-sync/status
 * Get sync service status and health information
 */
router.get('/status', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📊 Getting knowledge graph sync status...');
  
  const status = knowledgeGraphSyncService.getStatus();
  
  res.json({
    success: true,
    service_name: 'Knowledge Graph Sync Service',
    status,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/knowledge-graph-sync/initialize
 * Initialize the sync service
 */
router.post('/initialize', requireAdmin, asyncHandler(async (req, res) => {
  console.log('🚀 Initializing knowledge graph sync service...');
  
  try {
    const initialized = await knowledgeGraphSyncService.initialize();
    
    if (initialized) {
      const status = knowledgeGraphSyncService.getStatus();
      
      res.json({
        success: true,
        message: 'Knowledge graph sync service initialized successfully',
        status,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to initialize knowledge graph sync service',
        error: 'Service initialization failed'
      });
    }
  } catch (error) {
    console.error('❌ Knowledge graph sync initialization failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Knowledge graph sync initialization error',
      error: error.message
    });
  }
}));

/**
 * POST /api/knowledge-graph-sync/users
 * Sync users from Supabase to Neo4j
 */
router.post('/users', requireAdmin, asyncHandler(async (req, res) => {
  const { limit = 100, incremental = false } = req.body;
  
  console.log(`👤 Syncing users to knowledge graph (limit: ${limit}, incremental: ${incremental})...`);
  
  try {
    const options = { limit };
    
    if (incremental) {
      options.since = knowledgeGraphSyncService.lastSyncTimestamps.users;
    }
    
    const result = await knowledgeGraphSyncService.syncUsersToKnowledgeGraph(options);
    
    res.json({
      success: result.success,
      message: result.success ? 'Users synced successfully' : 'User sync failed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ User sync API error:', error.message);
    res.status(500).json({
      success: false,
      message: 'User sync failed',
      error: error.message
    });
  }
}));

/**
 * POST /api/knowledge-graph-sync/projects
 * Sync projects from Supabase to Neo4j
 */
router.post('/projects', requireAdmin, asyncHandler(async (req, res) => {
  const { limit = 50, incremental = false } = req.body;
  
  console.log(`🎯 Syncing projects to knowledge graph (limit: ${limit}, incremental: ${incremental})...`);
  
  try {
    const options = { limit };
    
    if (incremental) {
      options.since = knowledgeGraphSyncService.lastSyncTimestamps.projects;
    }
    
    const result = await knowledgeGraphSyncService.syncProjectsToKnowledgeGraph(options);
    
    res.json({
      success: result.success,
      message: result.success ? 'Projects synced successfully' : 'Project sync failed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Project sync API error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Project sync failed',
      error: error.message
    });
  }
}));

/**
 * POST /api/knowledge-graph-sync/outcomes
 * Sync project outcomes from Supabase to Neo4j
 */
router.post('/outcomes', requireAdmin, asyncHandler(async (req, res) => {
  const { limit = 50, incremental = false } = req.body;
  
  console.log(`📊 Syncing outcomes to knowledge graph (limit: ${limit}, incremental: ${incremental})...`);
  
  try {
    const options = { limit };
    
    if (incremental) {
      options.since = knowledgeGraphSyncService.lastSyncTimestamps.outcomes;
    }
    
    const result = await knowledgeGraphSyncService.syncProjectOutcomes(options);
    
    res.json({
      success: result.success,
      message: result.success ? 'Outcomes synced successfully' : 'Outcome sync failed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Outcome sync API error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Outcome sync failed',
      error: error.message
    });
  }
}));

/**
 * POST /api/knowledge-graph-sync/full
 * Perform complete bidirectional sync
 */
router.post('/full', requireAdmin, asyncHandler(async (req, res) => {
  const { incremental = false } = req.body;
  
  console.log(`🔄 Starting full bidirectional sync (incremental: ${incremental})...`);
  
  try {
    const result = await knowledgeGraphSyncService.performFullSync({ incremental });
    
    res.json({
      success: result.success,
      message: result.success ? 'Full sync completed successfully' : 'Full sync failed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Full sync API error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Full sync failed',
      error: error.message
    });
  }
}));

/**
 * POST /api/knowledge-graph-sync/insights
 * Sync knowledge graph insights back to Supabase
 */
router.post('/insights', requireAdmin, asyncHandler(async (req, res) => {
  console.log('💡 Syncing knowledge graph insights to Supabase...');
  
  try {
    const result = await knowledgeGraphSyncService.syncKnowledgeGraphInsightsToSupabase();
    
    res.json({
      success: result.success,
      message: result.success ? 'Insights synced successfully' : 'Insight sync failed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Insight sync API error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Insight sync failed',
      error: error.message
    });
  }
}));

/**
 * POST /api/knowledge-graph-sync/user/:userId
 * Sync specific user to knowledge graph
 */
router.post('/user/:userId', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  console.log(`👤 Syncing user ${userId} to knowledge graph...`);
  
  try {
    // Get user profile from Supabase
    const { data: userProfile, error } = await knowledgeGraphSyncService.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: error.message
      });
    }
    
    const result = await knowledgeGraphSyncService.syncUserToKnowledgeGraph(userProfile);
    
    res.json({
      success: result.success,
      message: result.success ? 'User synced successfully' : 'User sync failed',
      user_id: userId,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ User ${userId} sync API error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'User sync failed',
      error: error.message
    });
  }
}));

/**
 * GET /api/knowledge-graph-sync/recommendations/:userId
 * Get knowledge graph recommendations for a user
 */
router.get('/recommendations/:userId', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { type = 'all' } = req.query;
  
  console.log(`💡 Getting recommendations for user ${userId} (type: ${type})...`);
  
  try {
    const recommendations = {};
    
    if (type === 'all' || type === 'collaborators') {
      const collaborators = await knowledgeGraphSyncService.knowledgeGraphService.findCollaborators(userId, 10);
      recommendations.collaborators = collaborators.success ? collaborators.records : [];
    }
    
    if (type === 'all' || type === 'projects') {
      const projects = await knowledgeGraphSyncService.knowledgeGraphService.getProjectRecommendations(userId, 5);
      recommendations.projects = projects.success ? projects.records : [];
    }
    
    res.json({
      success: true,
      user_id: userId,
      recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Recommendations for user ${userId} failed:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
}));

/**
 * GET /api/knowledge-graph-sync/health
 * Comprehensive health check for sync service and dependencies
 */
router.get('/health', asyncHandler(async (req, res) => {
  console.log('🔍 Checking knowledge graph sync service health...');
  
  try {
    const status = knowledgeGraphSyncService.getStatus();
    
    // Test Supabase connection
    let supabaseHealth = { healthy: false, error: null };
    try {
      const { data, error } = await knowledgeGraphSyncService.supabase.from('user_profiles').select('id').limit(1);
      supabaseHealth.healthy = !error || error.code === '42P01'; // Table not exist is OK
      supabaseHealth.error = error?.message || null;
    } catch (error) {
      supabaseHealth.error = error.message;
    }
    
    // Get knowledge graph health
    const knowledgeGraphHealth = await knowledgeGraphSyncService.knowledgeGraphService?.checkHealth() || 
      { healthy: false, error: 'Service not initialized' };
    
    const overallHealth = status.initialized && supabaseHealth.healthy && knowledgeGraphHealth.healthy;
    
    res.json({
      success: true,
      healthy: overallHealth,
      components: {
        sync_service: {
          healthy: status.initialized,
          status
        },
        supabase: supabaseHealth,
        knowledge_graph: knowledgeGraphHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Sync service health check failed:', error.message);
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;