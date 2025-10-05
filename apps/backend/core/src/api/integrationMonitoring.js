/**
 * Integration Monitoring API Routes
 *
 * Provides real-time health status for all data source integrations
 * Enables manual sync triggering and statistics retrieval
 */

import IntegrationHealthMonitor from '../services/integrationHealthMonitor.js';

// Initialize monitor (singleton pattern)
let monitor = null;

const getMonitor = () => {
  if (!monitor) {
    monitor = new IntegrationHealthMonitor();
    monitor.startMonitoring();
  }
  return monitor;
};

export const integrationMonitoringRoutes = (app) => {

  // GET /api/v2/monitoring/integrations - Get health status for all integrations
  app.get('/api/v2/monitoring/integrations', async (req, res) => {
    try {
      const monitor = getMonitor();
      const health = monitor.getAllHealth();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        integrations: health
      });

    } catch (error) {
      console.error('Integration monitoring API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve integration health',
        message: error.message
      });
    }
  });

  // GET /api/v2/monitoring/integrations/:source - Get health for specific integration
  app.get('/api/v2/monitoring/integrations/:source', async (req, res) => {
    try {
      const { source } = req.params;
      const monitor = getMonitor();
      const health = monitor.getHealth(source);

      if (!health) {
        return res.status(404).json({
          success: false,
          error: 'Integration not found',
          message: `No integration found with source: ${source}`
        });
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        integration: health
      });

    } catch (error) {
      console.error(`Integration health API error for ${req.params.source}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve integration health',
        message: error.message
      });
    }
  });

  // POST /api/v2/monitoring/integrations/:source/sync - Trigger manual sync
  app.post('/api/v2/monitoring/integrations/:source/sync', async (req, res) => {
    try {
      const { source } = req.params;
      const monitor = getMonitor();

      console.log(`🔄 Manual sync triggered for ${source}`);

      const result = await monitor.triggerSync(source);

      if (result.success) {
        res.json({
          success: true,
          message: `Sync initiated for ${source}`,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Sync failed',
          message: result.error,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error(`Sync trigger error for ${req.params.source}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger sync',
        message: error.message
      });
    }
  });

  // GET /api/v2/monitoring/statistics - Get monitoring statistics
  app.get('/api/v2/monitoring/statistics', async (req, res) => {
    try {
      const monitor = getMonitor();
      const stats = monitor.getStatistics();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        statistics: stats
      });

    } catch (error) {
      console.error('Monitoring statistics API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics',
        message: error.message
      });
    }
  });

  // GET /api/v2/monitoring/health - Overall system health
  app.get('/api/v2/monitoring/health', async (req, res) => {
    try {
      const monitor = getMonitor();
      const stats = monitor.getStatistics();
      const allHealth = monitor.getAllHealth();

      // Determine overall status
      let status = 'healthy';
      if (stats.errors > 0) status = 'degraded';
      if (stats.errors >= stats.total / 2) status = 'unhealthy';

      res.json({
        success: true,
        status,
        timestamp: new Date().toISOString(),
        summary: {
          total_integrations: stats.total,
          connected: stats.connected,
          errors: stats.errors,
          warnings: stats.warnings,
          overall_health_score: stats.overallHealth,
          average_latency_ms: stats.averageLatency,
          average_freshness_seconds: stats.averageFreshness
        },
        integrations: Object.entries(allHealth).map(([source, health]) => ({
          source,
          status: health.status,
          health_score: health.healthScore,
          record_count: health.recordCount,
          last_sync: health.lastSync,
          latency_ms: health.latency,
          freshness_seconds: health.freshness
        }))
      });

    } catch (error) {
      console.error('System health API error:', error);
      res.status(500).json({
        success: false,
        status: 'unknown',
        error: 'Failed to retrieve system health',
        message: error.message
      });
    }
  });

  // SSE endpoint for real-time health updates
  app.get('/api/v2/monitoring/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const monitor = getMonitor();

    // Send initial state
    res.write(`data: ${JSON.stringify({
      type: 'initial',
      health: monitor.getAllHealth()
    })}\n\n`);

    // Subscribe to health updates
    const healthUpdateHandler = ({ source, health }) => {
      res.write(`data: ${JSON.stringify({
        type: 'health-update',
        source,
        health
      })}\n\n`);
    };

    const alertHandler = (alert) => {
      res.write(`data: ${JSON.stringify({
        type: 'alert',
        ...alert
      })}\n\n`);
    };

    monitor.on('health-update', healthUpdateHandler);
    monitor.on('alert', alertHandler);

    // Cleanup on disconnect
    req.on('close', () => {
      monitor.removeListener('health-update', healthUpdateHandler);
      monitor.removeListener('alert', alertHandler);
    });
  });

  console.log('✅ Integration monitoring API routes registered');
};

export default integrationMonitoringRoutes;