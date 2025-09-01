/**
 * Knowledge Graph API
 * RESTful endpoints for Neo4j knowledge graph operations
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { apiKeyOrAuth, requireAdmin } from '../middleware/auth.js';
import knowledgeGraphService from '../services/knowledgeGraphService.js';

const router = express.Router();

/**
 * GET /api/knowledge-graph/health
 * Check knowledge graph service health and connection status
 */
router.get('/health', asyncHandler(async (req, res) => {
  console.log('🔍 Checking knowledge graph health...');
  
  const health = await knowledgeGraphService.checkHealth();
  
  res.json({
    success: health.healthy,
    service_name: 'Neo4j Knowledge Graph',
    ...health,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/knowledge-graph/status
 * Check knowledge graph service status (alias for health)
 */
router.get('/status', asyncHandler(async (req, res) => {
  console.log('🔍 Checking knowledge graph status...');
  
  const health = await knowledgeGraphService.checkHealth();
  
  res.json({
    success: health.healthy,
    service_name: 'Neo4j Knowledge Graph',
    ...health,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/knowledge-graph/statistics
 * Get knowledge graph statistics and metrics
 */
router.get('/statistics', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📊 Getting knowledge graph statistics...');
  
  const stats = await knowledgeGraphService.getStatistics();
  
  res.json({
    success: stats.success,
    statistics: stats.statistics || {},
    error: stats.error || null,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/knowledge-graph/initialize
 * Initialize knowledge graph connection and schema
 */
router.post('/initialize', requireAdmin, asyncHandler(async (req, res) => {
  console.log('🚀 Initializing knowledge graph...');
  
  try {
    const initialized = await knowledgeGraphService.initialize();
    
    if (initialized) {
      const stats = await knowledgeGraphService.getStatistics();
      
      res.json({
        success: true,
        message: 'Knowledge graph initialized successfully',
        statistics: stats.statistics || {},
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to initialize knowledge graph',
        error: 'Connection or schema initialization failed'
      });
    }
  } catch (error) {
    console.error('❌ Knowledge graph initialization failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Knowledge graph initialization error',
      error: error.message
    });
  }
}));

/**
 * POST /api/knowledge-graph/sync/user
 * Sync user data from PostgreSQL to Neo4j
 */
router.post('/sync/user', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const userData = req.body;
  
  if (!userData.user_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: user_id'
    });
  }

  console.log(`👤 Syncing user ${userData.user_id} to knowledge graph...`);
  
  const result = await knowledgeGraphService.syncUser(userData);
  
  if (result.success) {
    res.json({
      success: true,
      message: `User ${userData.user_id} synced successfully`,
      synced_at: new Date().toISOString()
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to sync user to knowledge graph',
      details: result.error
    });
  }
}));

/**
 * GET /api/knowledge-graph/users/:userId/collaborators
 * Find potential collaborators for a user
 */
router.get('/users/:userId/collaborators', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 10;

  console.log(`🤝 Finding collaborators for user ${userId}...`);
  
  const result = await knowledgeGraphService.findCollaborators(userId, limit);
  
  if (result.success) {
    res.json({
      success: true,
      user_id: userId,
      collaborators: result.records || [],
      count: result.records?.length || 0,
      limit,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to find collaborators',
      details: result.error
    });
  }
}));

/**
 * GET /api/knowledge-graph/users/:userId/project-recommendations
 * Get project recommendations for a user based on interests and skills
 */
router.get('/users/:userId/project-recommendations', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  console.log(`🎯 Getting project recommendations for user ${userId}...`);
  
  const result = await knowledgeGraphService.getProjectRecommendations(userId, limit);
  
  if (result.success) {
    res.json({
      success: true,
      user_id: userId,
      recommendations: result.records || [],
      count: result.records?.length || 0,
      limit,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Failed to get project recommendations',
      details: result.error
    });
  }
}));

/**
 * POST /api/knowledge-graph/query
 * Execute custom Cypher query (admin only)
 */
router.post('/query', requireAdmin, asyncHandler(async (req, res) => {
  const { query, parameters = {}, mode = 'READ' } = req.body;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: query'
    });
  }

  console.log('🔍 Executing custom knowledge graph query...');
  
  try {
    const executeMethod = mode.toUpperCase() === 'WRITE' ? 
      knowledgeGraphService.executeWrite : 
      knowledgeGraphService.executeRead;
    
    const result = await executeMethod.call(knowledgeGraphService, query, parameters);
    
    res.json({
      success: result.success,
      records: result.records || [],
      count: result.records?.length || 0,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Custom query failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Query execution failed',
      details: error.message
    });
  }
}));

/**
 * GET /api/knowledge-graph/schema/nodes
 * Get information about node types in the knowledge graph
 */
router.get('/schema/nodes', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📋 Getting knowledge graph node schema...');
  
  const query = `
    CALL db.labels() YIELD label
    CALL apoc.cypher.run("MATCH (n:" + label + ") RETURN count(n) as count", {}) YIELD value
    RETURN label as node_type, value.count as count
    ORDER BY value.count DESC
  `;
  
  const result = await knowledgeGraphService.executeRead(query);
  
  if (result.success) {
    res.json({
      success: true,
      node_types: result.records,
      total_types: result.records.length,
      timestamp: new Date().toISOString()
    });
  } else {
    // Fallback query if APOC is not available
    const fallbackQuery = 'CALL db.labels() YIELD label RETURN label as node_type, 0 as count';
    const fallbackResult = await knowledgeGraphService.executeRead(fallbackQuery);
    
    res.json({
      success: true,
      node_types: fallbackResult.records || [],
      total_types: fallbackResult.records?.length || 0,
      note: 'APOC procedures not available, showing labels only',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /api/knowledge-graph/schema/relationships
 * Get information about relationship types in the knowledge graph
 */
router.get('/schema/relationships', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('🔗 Getting knowledge graph relationship schema...');
  
  const query = `
    CALL db.relationshipTypes() YIELD relationshipType
    CALL apoc.cypher.run("MATCH ()-[r:" + relationshipType + "]->() RETURN count(r) as count", {}) YIELD value
    RETURN relationshipType as relationship_type, value.count as count
    ORDER BY value.count DESC
  `;
  
  const result = await knowledgeGraphService.executeRead(query);
  
  if (result.success) {
    res.json({
      success: true,
      relationship_types: result.records,
      total_types: result.records.length,
      timestamp: new Date().toISOString()
    });
  } else {
    // Fallback query if APOC is not available
    const fallbackQuery = 'CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType as relationship_type, 0 as count';
    const fallbackResult = await knowledgeGraphService.executeRead(fallbackQuery);
    
    res.json({
      success: true,
      relationship_types: fallbackResult.records || [],
      total_types: fallbackResult.records?.length || 0,
      note: 'APOC procedures not available, showing types only',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * DELETE /api/knowledge-graph/reset
 * Reset the knowledge graph (delete all nodes and relationships) - admin only
 */
router.delete('/reset', requireAdmin, asyncHandler(async (req, res) => {
  const { confirm } = req.body;
  
  if (confirm !== 'DELETE_ALL_KNOWLEDGE_GRAPH_DATA') {
    return res.status(400).json({
      success: false,
      error: 'Missing confirmation. Set confirm: "DELETE_ALL_KNOWLEDGE_GRAPH_DATA" to proceed.'
    });
  }

  console.log('🗑️ Resetting knowledge graph (deleting all data)...');
  
  try {
    const queries = [
      { query: 'MATCH (n) DETACH DELETE n', parameters: {} }
    ];
    
    const result = await knowledgeGraphService.executeTransaction(queries);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Knowledge graph reset successfully',
        warning: 'All nodes and relationships have been deleted',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to reset knowledge graph',
        details: result.error
      });
    }
  } catch (error) {
    console.error('❌ Knowledge graph reset failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Reset operation failed',
      details: error.message
    });
  }
}));

export default router;