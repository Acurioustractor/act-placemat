/**
 * Observability API Endpoints for Data Lake Monitoring
 * Provides Prometheus metrics, health checks, and dashboard data
 * Task: 18.2 - Instrument Data Lake Services for Standardized Metrics Collection
 * Task: 18.5 - Implement Secure Access Controls and Operational Documentation
 */

import express from 'express';
import { logger } from '../../utils/logger.js';
import { observabilityService } from '../services/observabilityService.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { monitoringService } = require('../services/monitoringService.js');

const router = express.Router();

// Middleware for authentication and role-based access control
const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const validApiKeys = (process.env.VALID_API_KEYS || 'demo-api-key').split(',');

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required for observability endpoints',
    });
  }

  next();
};

// Admin-level access for write operations and sensitive data
const requireAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  const validAdminKey =
    process.env.ADMIN_API_KEY || 'demo-admin-key-change-in-production';

  if (!adminKey || adminKey !== validAdminKey) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'Valid admin API key required for this operation',
    });
  }

  next();
};

// Read-only access for monitoring tools (Prometheus, Grafana, etc.)
const requireMonitoring = (req, res, next) => {
  const monitoringKey = req.headers['x-monitoring-key'] || req.query.monitoring_key;
  const validMonitoringKeys = (
    process.env.MONITORING_API_KEYS || 'prometheus-key,grafana-key'
  ).split(',');

  if (!monitoringKey || !validMonitoringKeys.includes(monitoringKey)) {
    // Fall back to general auth for monitoring endpoints
    return requireAuth(req, res, next);
  }

  next();
};

/**
 * Prometheus metrics endpoint (monitoring tools access)
 * GET /api/observability/metrics
 */
router.get('/metrics', requireMonitoring, (req, res) => {
  try {
    const metrics = observabilityService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to generate Prometheus metrics:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

/**
 * Health check endpoint for data sources (authenticated access)
 * GET /api/observability/health
 */
router.get('/health', requireAuth, async (req, res) => {
  try {
    const healthSummary = observabilityService.getDataLakeHealthSummary();
    const systemHealth = monitoringService.getSystemStatus();

    const overallStatus =
      healthSummary.overall.status === 'healthy' && systemHealth.status === 'healthy'
        ? 'healthy'
        : 'unhealthy';

    res.status(overallStatus === 'healthy' ? 200 : 503).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      dataLake: healthSummary,
      system: systemHealth,
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Data source specific health endpoint (authenticated access)
 * GET /api/observability/health/:source
 */
router.get('/health/:source', requireAuth, async (req, res) => {
  try {
    const { source } = req.params;
    const healthSummary = observabilityService.getDataLakeHealthSummary();

    const sourceHealth = healthSummary.dataSources.find(ds => ds.name === source);

    if (!sourceHealth) {
      return res.status(404).json({
        error: `Data source '${source}' not found`,
        availableSources: healthSummary.dataSources.map(ds => ds.name),
      });
    }

    res.json({
      source: sourceHealth.name,
      status: sourceHealth.consecutiveFailures === 0 ? 'healthy' : 'unhealthy',
      details: sourceHealth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Health check failed for source ${req.params.source}:`, error);
    res.status(500).json({
      error: 'Source health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Comprehensive observability dashboard data (authenticated access)
 * GET /api/observability/dashboard
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const dashboardData = observabilityService.getObservabilityDashboard();
    res.json(dashboardData);
  } catch (error) {
    logger.error('Failed to generate dashboard data:', error);
    res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
});

/**
 * Data freshness status
 * GET /api/observability/freshness
 */
router.get('/freshness', requireAuth, async (req, res) => {
  try {
    const healthSummary = observabilityService.getDataLakeHealthSummary();

    const freshnessData = healthSummary.dataSources.map(source => ({
      source: source.name,
      type: source.type,
      lastSync: source.lastSuccessfulSync,
      status: source.consecutiveFailures === 0 ? 'current' : 'stale',
      staleness: source.lastSuccessfulSync
        ? Math.floor((new Date() - new Date(source.lastSuccessfulSync)) / 1000)
        : null,
    }));

    res.json({
      timestamp: new Date().toISOString(),
      dataSources: freshnessData,
    });
  } catch (error) {
    logger.error('Failed to get data freshness:', error);
    res.status(500).json({ error: 'Failed to get data freshness' });
  }
});

/**
 * System performance metrics
 * GET /api/observability/performance
 */
router.get('/performance', requireAuth, (req, res) => {
  try {
    const monitoringData = monitoringService.getMonitoringDashboard();

    res.json({
      timestamp: new Date().toISOString(),
      performance: monitoringData.performance,
      overview: monitoringData.overview,
      endpoints: monitoringData.endpoints,
      methods: monitoringData.methods,
    });
  } catch (error) {
    logger.error('Failed to get performance metrics:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

/**
 * Alert and incident summary
 * GET /api/observability/incidents
 */
router.get('/incidents', requireAuth, (req, res) => {
  try {
    const monitoringData = monitoringService.getMonitoringDashboard();

    res.json({
      timestamp: new Date().toISOString(),
      recentIncidents: monitoringData.recentIncidents,
      errorStats: monitoringData.errorStats,
    });
  } catch (error) {
    logger.error('Failed to get incident data:', error);
    res.status(500).json({ error: 'Failed to get incident data' });
  }
});

/**
 * Data source connection test endpoint
 * POST /api/observability/test/:source
 */
router.post('/test/:source', requireAdmin, async (req, res) => {
  try {
    const { source } = req.params;

    // Force a health check for the specific source
    await observabilityService.checkDataSourceHealth();

    const healthSummary = observabilityService.getDataLakeHealthSummary();
    const sourceHealth = healthSummary.dataSources.find(ds => ds.name === source);

    if (!sourceHealth) {
      return res.status(404).json({
        error: `Data source '${source}' not found`,
      });
    }

    res.json({
      source: sourceHealth.name,
      testResult: sourceHealth.consecutiveFailures === 0 ? 'passed' : 'failed',
      details: sourceHealth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Connection test failed for source ${req.params.source}:`, error);
    res.status(500).json({
      error: 'Connection test failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Business metrics endpoint
 * GET /api/observability/business
 */
router.get('/business', requireAuth, (req, res) => {
  try {
    // This would contain actual business KPIs
    const businessMetrics = {
      timestamp: new Date().toISOString(),
      metrics: [
        {
          name: 'daily_active_users',
          value: 150, // Mock data
          category: 'engagement',
          trend: 'up',
        },
        {
          name: 'data_processing_volume_mb',
          value: 2400,
          category: 'processing',
          trend: 'stable',
        },
        {
          name: 'ai_requests_daily',
          value: 890,
          category: 'ai_usage',
          trend: 'up',
        },
        {
          name: 'sync_success_rate_percent',
          value: 97.5,
          category: 'reliability',
          trend: 'stable',
        },
      ],
    };

    res.json(businessMetrics);
  } catch (error) {
    logger.error('Failed to get business metrics:', error);
    res.status(500).json({ error: 'Failed to get business metrics' });
  }
});

/**
 * Configuration and capability endpoint
 * GET /api/observability/config
 */
router.get('/config', requireAuth, (req, res) => {
  try {
    const config = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      region: 'australia',
      dataResidency: 'australia',
      capabilities: {
        prometheusMetrics: true,
        healthChecks: true,
        dataSourceMonitoring: true,
        performanceTracking: true,
        alerting: true,
        businessMetrics: true,
      },
      endpoints: {
        metrics: '/api/observability/metrics',
        health: '/api/observability/health',
        dashboard: '/api/observability/dashboard',
        freshness: '/api/observability/freshness',
        performance: '/api/observability/performance',
        incidents: '/api/observability/incidents',
        business: '/api/observability/business',
      },
      dataSources: observabilityService
        .getDataLakeHealthSummary()
        .dataSources.map(ds => ({
          name: ds.name,
          type: ds.type,
        })),
    };

    res.json(config);
  } catch (error) {
    logger.error('Failed to get observability config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

/**
 * OpenAPI/Swagger documentation for observability endpoints
 * GET /api/observability/docs
 */
router.get('/docs', (req, res) => {
  const apiDocs = {
    openapi: '3.0.0',
    info: {
      title: 'ACT Placemat Observability API',
      version: '1.0.0',
      description:
        'Monitoring and observability endpoints for the ACT Placemat data lake platform',
    },
    servers: [
      {
        url: `${req.protocol}://${req.get('host')}/api/observability`,
        description: 'Current server',
      },
    ],
    paths: {
      '/metrics': {
        get: {
          summary: 'Prometheus metrics endpoint',
          description:
            'Returns Prometheus-compatible metrics for all monitored services',
          responses: {
            200: { description: 'Prometheus metrics in text format' },
          },
        },
      },
      '/health': {
        get: {
          summary: 'Overall system health',
          description:
            'Returns health status for all data sources and system components',
          responses: {
            200: { description: 'System is healthy' },
            503: { description: 'System has health issues' },
          },
        },
      },
      '/dashboard': {
        get: {
          summary: 'Comprehensive dashboard data',
          description: 'Returns all monitoring data suitable for dashboard display',
          responses: {
            200: { description: 'Dashboard data object' },
          },
        },
      },
      '/freshness': {
        get: {
          summary: 'Data freshness status',
          description:
            'Returns last sync timestamps and staleness indicators for all data sources',
          responses: {
            200: { description: 'Data freshness information' },
          },
        },
      },
    },
  };

  res.json(apiDocs);
});

export default router;
