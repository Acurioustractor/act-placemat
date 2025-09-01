/**
 * Performance Metrics Dashboard API
 * Provides endpoints for real-time performance monitoring and SLA compliance visualization
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import { getSLAService, forceSLACheck } from '../middleware/slaTracking.js';

const router = express.Router();

/**
 * GET /api/performance-dashboard/overview
 * Get comprehensive performance overview for dashboard
 */
router.get('/overview', optionalAuth, asyncHandler(async (req, res) => {
  console.log('📊 Generating performance dashboard overview...');
  
  const slaService = getSLAService();
  const [status, compliance] = await Promise.all([
    slaService.getSLAStatus(),
    slaService.calculateSLACompliance()
  ]);
  
  // Calculate uptime based on API calls
  const uptimeStats = calculateUptimeStats(slaService.metrics.api_calls);
  
  // Get performance trends
  const performanceTrends = calculatePerformanceTrends(slaService.metrics);
  
  // Get alert statistics
  const alertStats = calculateAlertStatistics(slaService.metrics.alerts);
  
  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(compliance, alertStats, uptimeStats);
  
  const overview = {
    // High-level KPIs
    kpis: {
      overall_sla_score: Math.round(compliance.overall_score * 10) / 10,
      system_availability: uptimeStats.availability,
      avg_response_time: uptimeStats.avgResponseTime,
      error_rate: uptimeStats.errorRate,
      data_freshness_compliance: Math.round(compliance.data_freshness.score * 10) / 10,
      active_alerts: alertStats.unacknowledged
    },
    
    // Compliance breakdown
    compliance_breakdown: {
      data_freshness: {
        score: compliance.data_freshness.score,
        status: getStatusFromScore(compliance.data_freshness.score),
        details: compliance.data_freshness.details || {},
        issues: compliance.data_freshness.issues || []
      },
      api_performance: {
        score: compliance.api_performance.score,
        status: getStatusFromScore(compliance.api_performance.score),
        details: compliance.api_performance.details || {},
        issues: compliance.api_performance.issues || []
      },
      data_quality: {
        score: compliance.data_quality.score,
        status: getStatusFromScore(compliance.data_quality.score),
        details: compliance.data_quality.details || {},
        issues: compliance.data_quality.issues || []
      },
      processing_performance: {
        score: compliance.processing_performance.score,
        status: getStatusFromScore(compliance.processing_performance.score),
        details: compliance.processing_performance.details || {},
        issues: compliance.processing_performance.issues || []
      }
    },
    
    // Performance trends
    trends: performanceTrends,
    
    // Alert summary
    alerts: alertStats,
    
    // Executive summary
    executive_summary: executiveSummary,
    
    // System health indicators
    health_indicators: {
      database_connectivity: 'healthy',
      api_services: compliance.api_performance.score > 80 ? 'healthy' : 'degraded',
      data_pipeline: compliance.data_quality.score > 70 ? 'healthy' : 'degraded',
      monitoring_system: 'operational'
    },
    
    // Last updated
    last_updated: new Date(),
    refresh_interval: '5 minutes'
  };
  
  res.json({
    success: true,
    dashboard_overview: overview,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/performance-dashboard/real-time
 * Get real-time performance metrics
 */
router.get('/real-time', optionalAuth, asyncHandler(async (req, res) => {
  const slaService = getSLAService();
  
  // Get recent API calls (last 100)
  const recentCalls = slaService.metrics.api_calls.response_times
    .slice(-100)
    .map(call => ({
      timestamp: call.timestamp,
      endpoint: call.endpoint,
      response_time: call.responseTime,
      success: call.success,
      error_type: call.errorType
    }));
  
  // Calculate real-time metrics
  const realTimeMetrics = {
    current_requests_per_minute: calculateRequestsPerMinute(recentCalls),
    avg_response_time_last_minute: calculateAvgResponseTime(recentCalls, 1),
    avg_response_time_last_5_minutes: calculateAvgResponseTime(recentCalls, 5),
    success_rate_last_minute: calculateSuccessRate(recentCalls, 1),
    active_endpoints: getActiveEndpoints(recentCalls),
    system_load: {
      api_calls_total: slaService.metrics.api_calls.total,
      processing_operations: slaService.metrics.processing_times.size,
      data_freshness_checks: slaService.metrics.data_freshness.size
    }
  };
  
  res.json({
    success: true,
    real_time_metrics: realTimeMetrics,
    recent_activity: recentCalls.slice(-10), // Last 10 calls
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/performance-dashboard/historical
 * Get historical performance data
 */
router.get('/historical', optionalAuth, asyncHandler(async (req, res) => {
  const { timeframe = '24h' } = req.query;
  const slaService = getSLAService();
  
  // Get historical data based on timeframe
  const historicalData = getHistoricalData(slaService.metrics, timeframe);
  
  res.json({
    success: true,
    historical_data: historicalData,
    timeframe,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/performance-dashboard/alerts
 * Get alert dashboard data
 */
router.get('/alerts', optionalAuth, asyncHandler(async (req, res) => {
  const { severity, limit = 50 } = req.query;
  const slaService = getSLAService();
  
  let alerts = [...slaService.metrics.alerts];
  
  if (severity) {
    alerts = alerts.filter(alert => alert.severity === severity);
  }
  
  // Sort by timestamp (newest first)
  alerts = alerts
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit));
  
  const alertDashboard = {
    alerts: alerts.map(alert => ({
      ...alert,
      age_minutes: Math.round((new Date() - new Date(alert.timestamp)) / (1000 * 60)),
      category_icon: getCategoryIcon(alert.category),
      severity_color: getSeverityColor(alert.severity)
    })),
    
    summary: {
      total: slaService.metrics.alerts.length,
      unacknowledged: slaService.metrics.alerts.filter(a => !a.acknowledged).length,
      by_severity: {
        critical: slaService.metrics.alerts.filter(a => a.severity === 'critical').length,
        warning: slaService.metrics.alerts.filter(a => a.severity === 'warning').length,
        info: slaService.metrics.alerts.filter(a => a.severity === 'info').length
      },
      by_category: getAlertsByCategory(slaService.metrics.alerts)
    },
    
    recommended_actions: generateAlertRecommendations(alerts)
  };
  
  res.json({
    success: true,
    alert_dashboard: alertDashboard,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/performance-dashboard/force-refresh
 * Force a complete dashboard refresh
 */
router.post('/force-refresh', optionalAuth, asyncHandler(async (req, res) => {
  console.log('🔄 Forcing dashboard refresh...');
  
  const refreshResults = await forceSLACheck();
  
  res.json({
    success: true,
    message: 'Dashboard refreshed successfully',
    refresh_results: refreshResults,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/performance-dashboard/export
 * Export performance data for reporting
 */
router.get('/export', optionalAuth, asyncHandler(async (req, res) => {
  const { format = 'json', timeframe = '24h' } = req.query;
  const slaService = getSLAService();
  
  const exportData = {
    export_info: {
      generated_at: new Date().toISOString(),
      timeframe,
      format,
      total_api_calls: slaService.metrics.api_calls.total,
      data_points: slaService.metrics.api_calls.response_times.length
    },
    
    sla_compliance: await slaService.calculateSLACompliance(),
    
    performance_metrics: {
      api_calls: slaService.metrics.api_calls.response_times.map(call => ({
        timestamp: call.timestamp,
        endpoint: call.endpoint,
        response_time: call.responseTime,
        success: call.success
      })),
      data_freshness: Object.fromEntries(slaService.metrics.data_freshness),
      processing_times: Object.fromEntries(slaService.metrics.processing_times),
      alerts: slaService.metrics.alerts
    }
  };
  
  if (format === 'csv') {
    // Convert to CSV format
    const csv = convertToCSV(exportData.performance_metrics.api_calls);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="performance-data-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } else {
    res.json({
      success: true,
      export_data: exportData,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Helper functions
 */

function calculateUptimeStats(apiMetrics) {
  const total = apiMetrics.total;
  const successful = apiMetrics.successful;
  const failed = apiMetrics.failed;
  
  if (total === 0) {
    return {
      availability: 100,
      avgResponseTime: 0,
      errorRate: 0
    };
  }
  
  const avgResponseTime = apiMetrics.response_times.length > 0
    ? apiMetrics.response_times.reduce((sum, call) => sum + call.responseTime, 0) / apiMetrics.response_times.length
    : 0;
  
  return {
    availability: Math.round((successful / total) * 100 * 10) / 10,
    avgResponseTime: Math.round(avgResponseTime),
    errorRate: Math.round((failed / total) * 100 * 10) / 10
  };
}

function calculatePerformanceTrends(metrics) {
  const responseTimes = metrics.api_calls.response_times.slice(-50); // Last 50 calls
  
  if (responseTimes.length < 10) {
    return { trend: 'insufficient_data' };
  }
  
  const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
  const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
  
  const avgFirst = firstHalf.reduce((sum, call) => sum + call.responseTime, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, call) => sum + call.responseTime, 0) / secondHalf.length;
  
  const percentChange = ((avgSecond - avgFirst) / avgFirst) * 100;
  
  let trend = 'stable';
  if (percentChange > 10) trend = 'degrading';
  else if (percentChange < -10) trend = 'improving';
  
  return {
    trend,
    percent_change: Math.round(percentChange * 10) / 10,
    avg_response_time_trend: avgSecond - avgFirst
  };
}

function calculateAlertStatistics(alerts) {
  const now = new Date();
  const last24h = alerts.filter(alert => 
    now - new Date(alert.timestamp) < 24 * 60 * 60 * 1000
  );
  
  return {
    total: alerts.length,
    last_24h: last24h.length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
    avg_resolution_time: calculateAvgResolutionTime(alerts)
  };
}

function generateExecutiveSummary(compliance, alertStats, uptimeStats) {
  const summary = [];
  
  if (compliance.overall_score >= 95) {
    summary.push('✅ System performing excellently - all SLAs being met');
  } else if (compliance.overall_score >= 85) {
    summary.push('✅ System performing well with minor issues');
  } else if (compliance.overall_score >= 70) {
    summary.push('⚠️ System performance needs attention');
  } else {
    summary.push('🚨 Critical performance issues require immediate attention');
  }
  
  if (uptimeStats.availability >= 99.5) {
    summary.push('✅ Excellent system availability');
  } else if (uptimeStats.availability >= 95) {
    summary.push('⚠️ System availability below target');
  } else {
    summary.push('🚨 Poor system availability');
  }
  
  if (alertStats.critical > 0) {
    summary.push(`🚨 ${alertStats.critical} critical alert(s) require immediate attention`);
  }
  
  if (alertStats.unacknowledged > 5) {
    summary.push(`⚠️ ${alertStats.unacknowledged} unacknowledged alerts need review`);
  }
  
  return summary;
}

function getStatusFromScore(score) {
  if (score >= 95) return 'excellent';
  if (score >= 85) return 'good';
  if (score >= 70) return 'acceptable';
  if (score >= 50) return 'poor';
  return 'critical';
}

function calculateRequestsPerMinute(recentCalls) {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const callsLastMinute = recentCalls.filter(call => 
    new Date(call.timestamp) > oneMinuteAgo
  );
  return callsLastMinute.length;
}

function calculateAvgResponseTime(calls, minutes) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const recentCalls = calls.filter(call => new Date(call.timestamp) > cutoff);
  
  if (recentCalls.length === 0) return 0;
  
  return Math.round(
    recentCalls.reduce((sum, call) => sum + call.response_time, 0) / recentCalls.length
  );
}

function calculateSuccessRate(calls, minutes) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const recentCalls = calls.filter(call => new Date(call.timestamp) > cutoff);
  
  if (recentCalls.length === 0) return 100;
  
  const successful = recentCalls.filter(call => call.success).length;
  return Math.round((successful / recentCalls.length) * 100 * 10) / 10;
}

function getActiveEndpoints(calls) {
  const endpoints = new Map();
  calls.forEach(call => {
    if (endpoints.has(call.endpoint)) {
      endpoints.set(call.endpoint, endpoints.get(call.endpoint) + 1);
    } else {
      endpoints.set(call.endpoint, 1);
    }
  });
  
  return Array.from(endpoints.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, requests: count }));
}

function getHistoricalData(metrics, timeframe) {
  // This is a simplified version - in production you'd query historical data from database
  const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 1;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const historicalCalls = metrics.api_calls.response_times.filter(call => 
    new Date(call.timestamp) > cutoff
  );
  
  return {
    api_performance: historicalCalls,
    data_freshness: Object.fromEntries(metrics.data_freshness),
    processing_operations: Object.fromEntries(metrics.processing_times),
    timeframe_hours: hours
  };
}

function getCategoryIcon(category) {
  const icons = {
    'data_freshness': '📊',
    'api_performance': '🚀',
    'data_quality': '✅',
    'processing_performance': '⚡',
    'system_health': '🏥'
  };
  return icons[category] || '⚠️';
}

function getSeverityColor(severity) {
  const colors = {
    'critical': '#dc3545',
    'warning': '#ffc107',
    'info': '#17a2b8'
  };
  return colors[severity] || '#6c757d';
}

function getAlertsByCategory(alerts) {
  const categories = {};
  alerts.forEach(alert => {
    categories[alert.category] = (categories[alert.category] || 0) + 1;
  });
  return categories;
}

function generateAlertRecommendations(alerts) {
  const recommendations = [];
  
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Address critical alerts immediately',
      count: criticalAlerts.length
    });
  }
  
  const unacknowledged = alerts.filter(a => !a.acknowledged);
  if (unacknowledged.length > 5) {
    recommendations.push({
      priority: 'medium',
      action: 'Review and acknowledge pending alerts',
      count: unacknowledged.length
    });
  }
  
  return recommendations;
}

function calculateAvgResolutionTime(alerts) {
  const resolvedAlerts = alerts.filter(a => a.acknowledged);
  if (resolvedAlerts.length === 0) return null;
  
  const totalTime = resolvedAlerts.reduce((sum, alert) => {
    if (alert.acknowledged_at) {
      return sum + (new Date(alert.acknowledged_at) - new Date(alert.timestamp));
    }
    return sum;
  }, 0);
  
  return Math.round(totalTime / resolvedAlerts.length / (1000 * 60)); // minutes
}

function convertToCSV(data) {
  if (!data.length) return 'No data available';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  
  return [headers, ...rows].join('\n');
}

export default router;