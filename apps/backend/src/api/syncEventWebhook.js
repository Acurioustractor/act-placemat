/**
 * Sync Event Webhook API
 * RESTful endpoints for managing real-time sync event processing
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { apiKeyOrAuth, requireAdmin } from '../middleware/auth.js';
import syncEventWebhookService from '../services/syncEventWebhookService.js';

const router = express.Router();

/**
 * GET /api/sync-webhook/status
 * Get webhook service status and statistics
 */
router.get('/status', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📊 Getting sync webhook service status...');
  
  const status = syncEventWebhookService.getStatus();
  const dbStats = await syncEventWebhookService.getSyncEventStatistics();
  
  res.json({
    success: true,
    service_name: 'Sync Event Webhook Service',
    status,
    database_statistics: dbStats.success ? dbStats.statistics : null,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/sync-webhook/initialize
 * Initialize the webhook service
 */
router.post('/initialize', requireAdmin, asyncHandler(async (req, res) => {
  console.log('🚀 Initializing sync webhook service...');
  
  const { webhookUrl, config } = req.body;
  
  try {
    const initialized = await syncEventWebhookService.initialize({ 
      webhookUrl, 
      config 
    });
    
    if (initialized) {
      const status = syncEventWebhookService.getStatus();
      
      res.json({
        success: true,
        message: 'Sync webhook service initialized successfully',
        status,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to initialize sync webhook service',
        error: 'Service initialization failed'
      });
    }
  } catch (error) {
    console.error('❌ Sync webhook initialization failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Sync webhook initialization error',
      error: error.message
    });
  }
}));

/**
 * POST /api/sync-webhook/start
 * Start webhook event processing
 */
router.post('/start', requireAdmin, asyncHandler(async (req, res) => {
  console.log('▶️ Starting sync webhook processing...');
  
  try {
    await syncEventWebhookService.startProcessing();
    const status = syncEventWebhookService.getStatus();
    
    res.json({
      success: true,
      message: 'Webhook processing started successfully',
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to start webhook processing:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to start webhook processing',
      error: error.message
    });
  }
}));

/**
 * POST /api/sync-webhook/stop
 * Stop webhook event processing
 */
router.post('/stop', requireAdmin, asyncHandler(async (req, res) => {
  console.log('⏹️ Stopping sync webhook processing...');
  
  try {
    syncEventWebhookService.stopProcessing();
    const status = syncEventWebhookService.getStatus();
    
    res.json({
      success: true,
      message: 'Webhook processing stopped successfully',
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to stop webhook processing:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to stop webhook processing',
      error: error.message
    });
  }
}));

/**
 * POST /api/sync-webhook/process-batch
 * Manually trigger processing of next batch
 */
router.post('/process-batch', requireAdmin, asyncHandler(async (req, res) => {
  console.log('🔄 Manually processing next batch of sync events...');
  
  try {
    const result = await syncEventWebhookService.processNextBatch();
    
    res.json({
      success: result.success,
      message: result.success ? 'Batch processed successfully' : 'Batch processing failed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Manual batch processing failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Batch processing failed',
      error: error.message
    });
  }
}));

/**
 * POST /api/sync-webhook/process-table
 * Process events for a specific table
 */
router.post('/process-table', requireAdmin, asyncHandler(async (req, res) => {
  const { tableName, limit = 50 } = req.body;
  
  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: 'tableName is required'
    });
  }
  
  console.log(`🔄 Processing events for table ${tableName} (limit: ${limit})...`);
  
  try {
    const result = await syncEventWebhookService.processEventsForTable(tableName, limit);
    
    res.json({
      success: result.success,
      message: result.success ? `Events processed for ${tableName}` : 'Processing failed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Table processing failed for ${tableName}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Table processing failed',
      error: error.message
    });
  }
}));

/**
 * GET /api/sync-webhook/statistics
 * Get detailed sync event statistics from database
 */
router.get('/statistics', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📊 Getting sync event statistics...');
  
  try {
    const result = await syncEventWebhookService.getSyncEventStatistics();
    
    res.json({
      success: result.success,
      message: result.success ? 'Statistics retrieved successfully' : 'Failed to get statistics',
      statistics: result.statistics || null,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get statistics:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
}));

/**
 * POST /api/sync-webhook/reset-failed
 * Reset failed events for retry
 */
router.post('/reset-failed', requireAdmin, asyncHandler(async (req, res) => {
  const { tableFilter = null, maxAgeHours = 24 } = req.body;
  
  console.log(`🔄 Resetting failed events (table: ${tableFilter || 'all'}, age: ${maxAgeHours}h)...`);
  
  try {
    const result = await syncEventWebhookService.resetFailedEvents(tableFilter, maxAgeHours);
    
    res.json({
      success: result.success,
      message: result.success ? `Reset ${result.reset_count} failed events` : 'Reset failed',
      reset_count: result.reset_count || 0,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to reset failed events:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reset failed events',
      error: error.message
    });
  }
}));

/**
 * POST /api/sync-webhook/cleanup
 * Clean up old sync events
 */
router.post('/cleanup', requireAdmin, asyncHandler(async (req, res) => {
  const { retentionDays = 30 } = req.body;
  
  console.log(`🧹 Cleaning up sync events older than ${retentionDays} days...`);
  
  try {
    const result = await syncEventWebhookService.cleanupOldEvents(retentionDays);
    
    res.json({
      success: result.success,
      message: result.success ? `Cleaned up ${result.deleted_count} old events` : 'Cleanup failed',
      deleted_count: result.deleted_count || 0,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to cleanup old events:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old events',
      error: error.message
    });
  }
}));

/**
 * POST /api/sync-webhook/webhook
 * Receive webhook notifications (for testing or external integrations)
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  const webhookData = req.body;
  const webhookHeaders = req.headers;
  
  console.log('📨 Received sync webhook notification:', {
    event_id: webhookData.event_id,
    event_type: webhookData.event_type,
    table_name: webhookData.table_name,
    headers: {
      'x-sync-event-webhook': webhookHeaders['x-sync-event-webhook'],
      'content-type': webhookHeaders['content-type']
    }
  });
  
  // Here you could implement custom webhook processing logic
  // For now, just acknowledge receipt
  
  res.json({
    success: true,
    message: 'Webhook received successfully',
    event_id: webhookData.event_id,
    received_at: new Date().toISOString()
  });
}));

/**
 * GET /api/sync-webhook/health
 * Comprehensive health check for webhook service and dependencies
 */
router.get('/health', asyncHandler(async (req, res) => {
  console.log('🔍 Checking sync webhook service health...');
  
  try {
    const status = syncEventWebhookService.getStatus();
    
    // Test database connection
    let databaseHealth = { healthy: false, error: null };
    try {
      const dbStats = await syncEventWebhookService.getSyncEventStatistics();
      databaseHealth.healthy = dbStats.success;
      databaseHealth.error = dbStats.error || null;
    } catch (error) {
      databaseHealth.error = error.message;
    }
    
    // Check knowledge graph sync service health
    const kgSyncStatus = syncEventWebhookService.isInitialized ? 
      await import('./knowledgeGraphSync.js').then(m => m.default) : null;
    
    const overallHealth = status.initialized && databaseHealth.healthy;
    
    res.json({
      success: true,
      healthy: overallHealth,
      components: {
        webhook_service: {
          healthy: status.initialized,
          processing: status.processing,
          status
        },
        database: databaseHealth,
        knowledge_graph_sync: {
          healthy: kgSyncStatus !== null,
          status: 'Available'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Webhook service health check failed:', error.message);
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;