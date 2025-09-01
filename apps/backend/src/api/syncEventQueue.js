/**
 * Sync Event Queue API Endpoints
 * RESTful API for managing the sync event queue service
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import syncEventQueueService from '../services/syncEventQueueService.js';
import { apiKeyOrAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get queue service status and statistics
 */
router.get('/status', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📊 Getting sync event queue status...');
  
  const status = syncEventQueueService.getStatus();
  const queueStats = await syncEventQueueService.getQueueStatistics();
  
  res.json({
    success: true,
    service_name: 'Sync Event Queue Service',
    status,
    queue_statistics: queueStats.success ? queueStats.statistics : null,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Start queue processing
 */
router.post('/start', requireAdmin, asyncHandler(async (req, res) => {
  console.log('🚀 Starting sync event queue processing...');
  
  try {
    if (!syncEventQueueService.isInitialized) {
      const initialized = await syncEventQueueService.initialize();
      if (!initialized) {
        return res.status(500).json({
          success: false,
          message: 'Failed to initialize queue service'
        });
      }
    }

    await syncEventQueueService.startProcessing();
    
    res.json({
      success: true,
      message: 'Sync event queue processing started',
      status: syncEventQueueService.getStatus()
    });
  } catch (error) {
    console.error('❌ Failed to start queue processing:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to start queue processing',
      error: error.message
    });
  }
}));

/**
 * Stop queue processing
 */
router.post('/stop', requireAdmin, asyncHandler(async (req, res) => {
  console.log('🛑 Stopping sync event queue processing...');
  
  syncEventQueueService.stopProcessing();
  
  res.json({
    success: true,
    message: 'Sync event queue processing stopped',
    status: syncEventQueueService.getStatus()
  });
}));

/**
 * Manually process events by priority
 */
router.post('/process/:priority', requireAdmin, asyncHandler(async (req, res) => {
  const { priority } = req.params;
  const { limit = 50 } = req.body;
  
  if (!['critical', 'high', 'normal', 'low'].includes(priority)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid priority level. Must be: critical, high, normal, low'
    });
  }

  console.log(`🔧 Manual processing of ${priority} priority events...`);
  
  const result = await syncEventQueueService.processPriorityEventsManually(priority, limit);
  
  if (result.success) {
    res.json({
      success: true,
      message: `Processed ${result.processed}/${result.total} ${priority} priority events`,
      result
    });
  } else {
    res.status(500).json({
      success: false,
      message: `Failed to process ${priority} priority events`,
      error: result.error
    });
  }
}));

/**
 * Get queue statistics
 */
router.get('/statistics', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📈 Getting detailed queue statistics...');
  
  const queueStats = await syncEventQueueService.getQueueStatistics();
  const serviceStatus = syncEventQueueService.getStatus();
  
  res.json({
    success: true,
    service_statistics: serviceStatus.stats,
    database_statistics: queueStats.success ? queueStats.statistics : null,
    performance_metrics: serviceStatus.stats.performance,
    configuration: serviceStatus.config,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Reset failed events for retry
 */
router.post('/reset-failed', requireAdmin, asyncHandler(async (req, res) => {
  const { priority = null, maxAgeHours = 1 } = req.body;
  
  console.log(`🔄 Resetting failed events (priority: ${priority || 'all'}, maxAge: ${maxAgeHours}h)...`);
  
  const result = await syncEventQueueService.resetFailedEvents(priority, maxAgeHours);
  
  if (result.success) {
    res.json({
      success: true,
      message: `Reset ${result.reset_count} failed events for retry`,
      result
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to reset failed events',
      error: result.error
    });
  }
}));

/**
 * Update queue configuration
 */
router.post('/config', requireAdmin, asyncHandler(async (req, res) => {
  const { config } = req.body;
  
  if (!config) {
    return res.status(400).json({
      success: false,
      message: 'Configuration object is required'
    });
  }

  console.log('⚙️ Updating queue service configuration...');
  
  try {
    // Validate configuration
    const validPriorities = ['critical', 'high', 'normal', 'low'];
    if (config.priorities) {
      for (const priority of Object.keys(config.priorities)) {
        if (!validPriorities.includes(priority)) {
          return res.status(400).json({
            success: false,
            message: `Invalid priority level: ${priority}`
          });
        }
      }
    }

    // Update configuration
    Object.assign(syncEventQueueService.config, config);
    
    res.json({
      success: true,
      message: 'Queue configuration updated successfully',
      updated_config: syncEventQueueService.config
    });
  } catch (error) {
    console.error('❌ Failed to update configuration:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: error.message
    });
  }
}));

/**
 * Get current configuration
 */
router.get('/config', apiKeyOrAuth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    configuration: syncEventQueueService.config,
    priorities: Object.keys(syncEventQueueService.config.priorities),
    timestamp: new Date().toISOString()
  });
}));

/**
 * Health check endpoint
 */
router.get('/health', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const status = syncEventQueueService.getStatus();
  
  const health = {
    healthy: status.initialized && !status.stats.errors.length > 10,
    initialized: status.initialized,
    processing: status.processing,
    active_workers: status.active_workers,
    recent_errors: status.stats.recent_errors.length,
    uptime_seconds: status.stats.uptime_seconds,
    events_processed: status.stats.processed,
    events_failed: status.stats.failed
  };

  const httpStatus = health.healthy ? 200 : 503;
  
  res.status(httpStatus).json({
    success: health.healthy,
    health,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get performance metrics
 */
router.get('/metrics', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const status = syncEventQueueService.getStatus();
  const queueStats = await syncEventQueueService.getQueueStatistics();
  
  const metrics = {
    performance: status.stats.performance,
    processing: {
      events_processed: status.stats.processed,
      events_failed: status.stats.failed,
      events_retried: status.stats.retried,
      events_dead_lettered: status.stats.deadLettered,
      batches_processed: status.stats.batchesProcessed,
      average_processing_time_ms: status.stats.averageProcessingTime
    },
    queue: {
      active_workers: status.active_workers,
      max_workers: status.max_workers,
      processing: status.processing,
      uptime_seconds: status.stats.uptime_seconds
    },
    database: queueStats.success ? queueStats.statistics : null,
    rate_limiting: status.rate_limiter
  };

  res.json({
    success: true,
    metrics,
    timestamp: new Date().toISOString()
  });
}));

export default router;