/**
 * SLA Monitoring API
 * Provides endpoints for monitoring data freshness, API performance, and SLA compliance
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import SLAMonitoringService from '../services/slaMonitoringService.js';

const router = express.Router();
const slaService = new SLAMonitoringService();

// Start timing for API performance monitoring
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// End timing and record metrics
router.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - req.startTime;
    const success = res.statusCode < 400;
    const errorType = success ? null : `${res.statusCode}_error`;
    
    slaService.recordAPICall(
      `${req.method} ${req.route?.path || req.path}`,
      responseTime,
      success,
      errorType
    );
    
    return originalSend.call(this, data);
  };
  next();
});

/**
 * GET /api/sla-monitoring/status
 * Get current SLA compliance status and metrics
 */
router.get('/status', optionalAuth, asyncHandler(async (req, res) => {
  console.log('📊 Getting SLA status...');
  
  const status = await slaService.getSLAStatus();
  
  res.json({
    success: true,
    sla_status: status,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/sla-monitoring/compliance
 * Get detailed SLA compliance report
 */
router.get('/compliance', optionalAuth, asyncHandler(async (req, res) => {
  console.log('📈 Calculating SLA compliance...');
  
  const compliance = await slaService.calculateSLACompliance();
  
  res.json({
    success: true,
    compliance_report: compliance,
    summary: {
      overall_grade: getComplianceGrade(compliance.overall_score),
      compliant: compliance.overall_score >= 95,
      needs_attention: compliance.overall_score < 80,
      critical_issues: Object.values(compliance)
        .filter(section => typeof section === 'object' && section.score < 70)
        .length
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/sla-monitoring/data-freshness
 * Get data freshness metrics for all monitored tables
 */
router.get('/data-freshness', optionalAuth, asyncHandler(async (req, res) => {
  console.log('🔍 Checking data freshness...');
  
  await slaService.checkDataFreshness();
  const freshnessData = Object.fromEntries(slaService.metrics.data_freshness);
  
  const summary = {
    total_tables: Object.keys(freshnessData).length,
    fresh_tables: Object.values(freshnessData).filter(table => table.compliance).length,
    stale_tables: Object.values(freshnessData).filter(table => !table.compliance).length,
    oldest_data: Math.max(...Object.values(freshnessData).map(table => table.staleness_ms)) / (1000 * 60 * 60), // hours
    newest_data: Math.min(...Object.values(freshnessData).map(table => table.staleness_ms)) / (1000 * 60 * 60) // hours
  };
  
  res.json({
    success: true,
    data_freshness: freshnessData,
    summary,
    sla_targets: slaService.slaTargets.data_freshness,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/sla-monitoring/api-performance
 * Get API performance metrics and compliance
 */
router.get('/api-performance', optionalAuth, asyncHandler(async (req, res) => {
  const performance = slaService.calculateAPIPerformanceCompliance();
  const recentCalls = slaService.metrics.api_calls.response_times
    .slice(-100) // Last 100 calls
    .map(call => ({
      endpoint: call.endpoint,
      response_time: call.responseTime,
      success: call.success,
      timestamp: call.timestamp
    }));
  
  res.json({
    success: true,
    api_performance: {
      compliance: performance,
      recent_calls: recentCalls,
      metrics_period: {
        start: slaService.metrics.api_calls.last_reset,
        end: new Date(),
        total_calls: slaService.metrics.api_calls.total
      }
    },
    sla_targets: slaService.slaTargets.api_performance,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/sla-monitoring/alerts
 * Get current alerts and their status
 */
router.get('/alerts', optionalAuth, asyncHandler(async (req, res) => {
  const { severity, acknowledged } = req.query;
  
  let alerts = [...slaService.metrics.alerts];
  
  if (severity) {
    alerts = alerts.filter(alert => alert.severity === severity);
  }
  
  if (acknowledged !== undefined) {
    const isAcknowledged = acknowledged === 'true';
    alerts = alerts.filter(alert => alert.acknowledged === isAcknowledged);
  }
  
  const alertSummary = {
    total: slaService.metrics.alerts.length,
    by_severity: {
      critical: slaService.metrics.alerts.filter(a => a.severity === 'critical').length,
      warning: slaService.metrics.alerts.filter(a => a.severity === 'warning').length,
      info: slaService.metrics.alerts.filter(a => a.severity === 'info').length
    },
    unacknowledged: slaService.metrics.alerts.filter(a => !a.acknowledged).length
  };
  
  res.json({
    success: true,
    alerts: alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    summary: alertSummary,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/sla-monitoring/alerts/:alertId/acknowledge
 * Acknowledge a specific alert
 */
router.post('/alerts/:alertId/acknowledge', optionalAuth, asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  
  const acknowledged = slaService.acknowledgeAlert(alertId);
  
  if (acknowledged) {
    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alert_id: alertId,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      error: 'Alert not found',
      alert_id: alertId
    });
  }
}));

/**
 * POST /api/sla-monitoring/processing-time
 * Record processing time metrics (for internal service use)
 */
router.post('/processing-time', optionalAuth, asyncHandler(async (req, res) => {
  const { operation, duration, recordCount = 1, success = true } = req.body;
  
  if (!operation || !duration) {
    return res.status(400).json({
      error: 'Operation and duration are required',
      expected_format: {
        operation: 'normalization_time | embedding_generation | quality_check_time',
        duration: 'Duration in milliseconds',
        recordCount: 'Number of records processed (optional)',
        success: 'Boolean indicating success (optional)'
      }
    });
  }
  
  slaService.recordProcessingTime(operation, duration, recordCount, success);
  
  res.json({
    success: true,
    message: 'Processing time recorded',
    metrics: {
      operation,
      duration,
      recordCount,
      success
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/sla-monitoring/health
 * Get health status of the monitoring service
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = slaService.getHealthStatus();
  
  res.json({
    success: true,
    health_status: health,
    monitoring_endpoints: {
      status: '/api/sla-monitoring/status',
      compliance: '/api/sla-monitoring/compliance',
      data_freshness: '/api/sla-monitoring/data-freshness',
      api_performance: '/api/sla-monitoring/api-performance',
      alerts: '/api/sla-monitoring/alerts'
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/sla-monitoring/dashboard
 * Get comprehensive dashboard data
 */
router.get('/dashboard', optionalAuth, asyncHandler(async (req, res) => {
  console.log('📊 Generating SLA monitoring dashboard...');
  
  const [status, compliance] = await Promise.all([
    slaService.getSLAStatus(),
    slaService.calculateSLACompliance()
  ]);
  
  // Get recent trends (simplified)
  const recentAlerts = slaService.metrics.alerts
    .filter(alert => new Date() - new Date(alert.timestamp) < 24 * 60 * 60 * 1000) // Last 24 hours
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const dashboard = {
    overview: {
      overall_sla_score: compliance.overall_score,
      compliance_grade: getComplianceGrade(compliance.overall_score),
      system_health: 'operational',
      active_alerts: slaService.metrics.alerts.filter(a => !a.acknowledged).length,
      monitoring_since: slaService.metrics.api_calls.last_reset
    },
    
    metrics_summary: {
      data_freshness: {
        score: compliance.data_freshness.score,
        compliant_tables: compliance.data_freshness.compliant_tables,
        total_tables: compliance.data_freshness.total_tables
      },
      api_performance: {
        score: compliance.api_performance.score,
        total_calls: compliance.api_performance.details.total_calls,
        availability: compliance.api_performance.details.availability,
        avg_response_time: compliance.api_performance.details.response_time_p95
      },
      data_quality: {
        score: compliance.data_quality.score,
        records_analyzed: compliance.data_quality.records_analyzed || 0
      },
      processing_performance: {
        score: compliance.processing_performance.score
      }
    },
    
    recent_alerts: recentAlerts.slice(0, 10),
    
    quick_actions: [
      {
        label: 'Acknowledge All Alerts',
        endpoint: 'POST /api/sla-monitoring/alerts/acknowledge-all',
        condition: slaService.metrics.alerts.filter(a => !a.acknowledged).length > 0
      },
      {
        label: 'Force Data Freshness Check',
        endpoint: 'POST /api/sla-monitoring/data-freshness/check',
        condition: true
      },
      {
        label: 'Reset Metrics',
        endpoint: 'POST /api/sla-monitoring/metrics/reset',
        condition: true
      }
    ]
  };
  
  res.json({
    success: true,
    dashboard,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/sla-monitoring/data-freshness/check
 * Force a data freshness check
 */
router.post('/data-freshness/check', optionalAuth, asyncHandler(async (req, res) => {
  console.log('🔄 Forcing data freshness check...');
  
  await slaService.checkDataFreshness();
  
  res.json({
    success: true,
    message: 'Data freshness check completed',
    results: Object.fromEntries(slaService.metrics.data_freshness),
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/sla-monitoring/metrics/reset
 * Reset monitoring metrics (for testing/maintenance)
 */
router.post('/metrics/reset', optionalAuth, asyncHandler(async (req, res) => {
  console.log('🔄 Resetting SLA monitoring metrics...');
  
  // Reset API metrics
  slaService.metrics.api_calls = {
    total: 0,
    successful: 0,
    failed: 0,
    response_times: [],
    last_reset: new Date()
  };
  
  // Clear other metrics
  slaService.metrics.data_freshness.clear();
  slaService.metrics.processing_times.clear();
  slaService.metrics.alerts = [];
  
  res.json({
    success: true,
    message: 'SLA monitoring metrics reset successfully',
    reset_at: new Date().toISOString()
  });
}));

/**
 * Helper functions
 */

function getComplianceGrade(score) {
  if (score >= 95) return 'A';
  if (score >= 90) return 'B';
  if (score >= 80) return 'C';
  if (score >= 70) return 'D';
  return 'F';
}

export default router;