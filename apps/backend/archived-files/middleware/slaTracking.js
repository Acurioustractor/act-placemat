/**
 * SLA Tracking Middleware
 * Automatically tracks API performance metrics for SLA monitoring
 */

import SLAMonitoringService from '../services/slaMonitoringService.js';

// Global SLA service instance for middleware
let slaService = null;

/**
 * Initialize SLA tracking middleware
 */
export function initializeSLATracking() {
  if (!slaService) {
    slaService = new SLAMonitoringService();
    console.log('🔧 SLA tracking middleware initialized');
  }
  return slaService;
}

/**
 * Get the SLA service instance
 */
export function getSLAService() {
  if (!slaService) {
    slaService = initializeSLATracking();
  }
  return slaService;
}

/**
 * Middleware to track API performance metrics
 */
export function slaTrackingMiddleware(req, res, next) {
  // Skip tracking for certain endpoints
  const skipPaths = [
    '/health',
    '/api/sla-monitoring', // Avoid recursive tracking
    '/favicon.ico'
  ];
  
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Record start time
  req.slaStartTime = Date.now();
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - req.slaStartTime;
    const success = res.statusCode < 400;
    const errorType = success ? null : `${res.statusCode}_error`;
    
    // Get endpoint identifier
    const endpoint = getEndpointIdentifier(req);
    
    // Record metrics asynchronously to avoid blocking response
    setImmediate(() => {
      try {
        if (slaService) {
          slaService.recordAPICall(endpoint, responseTime, success, errorType);
        }
      } catch (error) {
        console.error('SLA tracking error:', error);
      }
    });
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

/**
 * Get a standardized endpoint identifier for tracking
 */
function getEndpointIdentifier(req) {
  const method = req.method;
  let path = req.route?.path || req.path;
  
  // Normalize dynamic route parameters
  if (req.route?.path) {
    path = req.route.path;
  } else {
    // Normalize common dynamic patterns
    path = path
      .replace(/\/[a-f0-9-]{36}/g, '/:id') // UUIDs
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[^\/]+@[^\/]+/g, '/:email') // Email addresses
      .replace(/\?.*$/, ''); // Remove query parameters
  }
  
  return `${method} ${path}`;
}

/**
 * Middleware to track processing times for data operations
 */
export function trackProcessingTime(operation) {
  return (req, res, next) => {
    req.processingStartTime = Date.now();
    req.processingOperation = operation;
    
    // Override res.json to capture completion
    const originalJson = res.json;
    
    res.json = function(data) {
      const processingTime = Date.now() - req.processingStartTime;
      const success = res.statusCode < 400;
      
      // Determine record count from response data
      let recordCount = 1;
      if (data?.results?.length) {
        recordCount = data.results.length;
      } else if (data?.cleaned_data?.length) {
        recordCount = data.cleaned_data.length;
      } else if (data?.transformation?.outputCount) {
        recordCount = data.transformation.outputCount;
      }
      
      // Record processing metrics asynchronously
      setImmediate(() => {
        try {
          if (slaService) {
            slaService.recordProcessingTime(operation, processingTime, recordCount, success);
          }
        } catch (error) {
          console.error('Processing time tracking error:', error);
        }
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Middleware to track data quality operations
 */
export function trackDataQuality(operation = 'data_quality_check') {
  return (req, res, next) => {
    const startTime = Date.now();
    
    const originalJson = res.json;
    res.json = function(data) {
      const processingTime = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Extract quality metrics if available
      let qualityScore = null;
      if (data?.quality_analysis?.overall_score) {
        qualityScore = data.quality_analysis.overall_score;
      } else if (data?.validation_summary?.avg_quality_score) {
        qualityScore = data.validation_summary.avg_quality_score;
      }
      
      // Record the operation
      setImmediate(() => {
        try {
          if (slaService) {
            slaService.recordProcessingTime(operation, processingTime, 1, success);
            
            // Store quality score if available
            if (qualityScore !== null) {
              const key = `${operation}_${new Date().toISOString().split('T')[0]}`;
              if (!slaService.metrics.quality_scores.has(key)) {
                slaService.metrics.quality_scores.set(key, []);
              }
              slaService.metrics.quality_scores.get(key).push(qualityScore);
            }
          }
        } catch (error) {
          console.error('Data quality tracking error:', error);
        }
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Health check for SLA tracking middleware
 */
export function getSLATrackingHealth() {
  return {
    service: slaService ? 'operational' : 'not_initialized',
    tracking_active: !!slaService,
    metrics_available: slaService ? {
      api_calls: slaService.metrics.api_calls.total,
      data_freshness_checks: slaService.metrics.data_freshness.size,
      processing_operations: slaService.metrics.processing_times.size,
      active_alerts: slaService.metrics.alerts.filter(a => !a.acknowledged).length
    } : null,
    last_health_check: new Date()
  };
}

/**
 * Get SLA metrics summary for dashboard use
 */
export function getSLAMetricsSummary() {
  if (!slaService) {
    return { error: 'SLA service not initialized' };
  }
  
  return {
    api_performance: {
      total_calls: slaService.metrics.api_calls.total,
      success_rate: slaService.metrics.api_calls.total > 0 
        ? (slaService.metrics.api_calls.successful / slaService.metrics.api_calls.total) * 100 
        : 100,
      avg_response_time: slaService.metrics.api_calls.response_times.length > 0
        ? slaService.metrics.api_calls.response_times.reduce((sum, call) => sum + call.responseTime, 0) / slaService.metrics.api_calls.response_times.length
        : 0
    },
    data_freshness: Object.fromEntries(
      Array.from(slaService.metrics.data_freshness.entries()).map(([table, metrics]) => [
        table, 
        {
          staleness_hours: Math.round(metrics.staleness_ms / (1000 * 60 * 60)),
          compliant: metrics.compliance
        }
      ])
    ),
    alerts: {
      total: slaService.metrics.alerts.length,
      unacknowledged: slaService.metrics.alerts.filter(a => !a.acknowledged).length,
      critical: slaService.metrics.alerts.filter(a => a.severity === 'critical').length
    }
  };
}

/**
 * Force a comprehensive SLA check
 */
export async function forceSLACheck() {
  if (!slaService) {
    throw new Error('SLA service not initialized');
  }
  
  console.log('🔍 Forcing comprehensive SLA check...');
  
  // Run all monitoring checks
  await slaService.checkDataFreshness();
  const compliance = await slaService.calculateSLACompliance();
  await slaService.generateAlerts();
  
  return {
    compliance,
    data_freshness: Object.fromEntries(slaService.metrics.data_freshness),
    alerts: slaService.metrics.alerts.filter(a => !a.acknowledged)
  };
}