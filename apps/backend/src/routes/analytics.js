/**
 * Analytics and Error Tracking API Routes
 * Handles performance metrics, error reports, and user analytics
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many analytics requests, please try again later'
});

const errorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 error reports per windowMs
  message: 'Too many error reports, please try again later'
});

// In-memory storage for demo purposes
// In production, use a proper database like MongoDB or PostgreSQL
const performanceMetrics = new Map();
const errorReports = new Map();
const analyticsEvents = new Map();
const dashboardMetrics = new Map();

// Validation middleware
const validatePerformanceMetrics = [
  body('sessionId').isString().notEmpty(),
  body('metrics').isArray(),
  body('metrics.*.name').isString().notEmpty(),
  body('metrics.*.value').isNumeric(),
  body('metrics.*.timestamp').isNumeric()
];

const validateErrorReport = [
  body('sessionId').isString().notEmpty(),
  body('errors').isArray(),
  body('errors.*.message').isString().notEmpty(),
  body('errors.*.stack').optional().isString(),
  body('errors.*.timestamp').isNumeric()
];

const validateAnalyticsEvents = [
  body('sessionId').isString().notEmpty(),
  body('events').isArray(),
  body('events.*.name').isString().notEmpty(),
  body('events.*.timestamp').isNumeric()
];

// Helper function to store data with TTL (24 hours)
function storeWithTTL(map, key, data) {
  const ttl = 24 * 60 * 60 * 1000; // 24 hours
  const expiresAt = Date.now() + ttl;
  
  map.set(key, {
    data,
    expiresAt
  });
  
  // Clean up expired entries
  for (const [k, v] of map.entries()) {
    if (v.expiresAt < Date.now()) {
      map.delete(k);
    }
  }
}

// Helper function to get non-expired data
function getValidData(map, key) {
  const entry = map.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    map.delete(key);
    return null;
  }
  return entry.data;
}

// Performance metrics endpoint
router.post('/performance', analyticsLimiter, validatePerformanceMetrics, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { sessionId, metrics, timestamp } = req.body;
    const metricId = uuidv4();
    
    const performanceData = {
      id: metricId,
      sessionId,
      metrics,
      timestamp: timestamp || Date.now(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      createdAt: new Date().toISOString()
    };

    // Store performance metrics
    storeWithTTL(performanceMetrics, metricId, performanceData);
    
    // Update session-level metrics
    const sessionKey = `session_${sessionId}`;
    let sessionMetrics = getValidData(dashboardMetrics, sessionKey) || {
      sessionId,
      metrics: [],
      startTime: Date.now(),
      lastUpdate: Date.now()
    };
    
    sessionMetrics.metrics.push(...metrics);
    sessionMetrics.lastUpdate = Date.now();
    storeWithTTL(dashboardMetrics, sessionKey, sessionMetrics);

    // Log performance warnings
    metrics.forEach(metric => {
      if (metric.name === 'widget-load-time' && metric.value > 2000) {
        console.warn(`Slow widget load detected: ${metric.value}ms for session ${sessionId}`);
      }
      if (metric.name === 'memory-usage' && metric.value > 100 * 1024 * 1024) {
        console.warn(`High memory usage detected: ${Math.round(metric.value / 1024 / 1024)}MB for session ${sessionId}`);
      }
    });

    res.json({
      success: true,
      metricId,
      message: 'Performance metrics recorded successfully'
    });

  } catch (error) {
    console.error('Error recording performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record performance metrics'
    });
  }
});

// Error tracking endpoint
router.post('/errors', errorLimiter, validateErrorReport, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { sessionId, userId, errors: errorList } = req.body;
    const reportId = uuidv4();
    
    const errorReport = {
      id: reportId,
      sessionId,
      userId,
      errors: errorList,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      createdAt: new Date().toISOString()
    };

    // Store error report
    storeWithTTL(errorReports, reportId, errorReport);
    
    // Update session-level error tracking
    const sessionKey = `session_${sessionId}`;
    let sessionData = getValidData(dashboardMetrics, sessionKey) || {
      sessionId,
      metrics: [],
      errors: [],
      startTime: Date.now(),
      lastUpdate: Date.now()
    };
    
    sessionData.errors = sessionData.errors || [];
    sessionData.errors.push(...errorList);
    sessionData.lastUpdate = Date.now();
    storeWithTTL(dashboardMetrics, sessionKey, sessionData);

    // Log critical errors
    errorList.forEach(error => {
      if (error.name?.includes('ChunkLoadError') || error.message?.includes('Loading chunk')) {
        console.error(`Critical chunk load error for session ${sessionId}:`, error.message);
      }
      if (error.message?.includes('Network Error')) {
        console.error(`Network error for session ${sessionId}:`, error.message);
      }
    });

    res.json({
      success: true,
      reportId,
      message: 'Error report recorded successfully'
    });

  } catch (error) {
    console.error('Error recording error report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record error report'
    });
  }
});

// Analytics events endpoint
router.post('/events', analyticsLimiter, validateAnalyticsEvents, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { sessionId, userId, events } = req.body;
    const eventId = uuidv4();
    
    const analyticsData = {
      id: eventId,
      sessionId,
      userId,
      events,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      createdAt: new Date().toISOString()
    };

    // Store analytics events
    storeWithTTL(analyticsEvents, eventId, analyticsData);
    
    // Update session-level analytics
    const sessionKey = `session_${sessionId}`;
    let sessionData = getValidData(dashboardMetrics, sessionKey) || {
      sessionId,
      metrics: [],
      events: [],
      startTime: Date.now(),
      lastUpdate: Date.now()
    };
    
    sessionData.events = sessionData.events || [];
    sessionData.events.push(...events);
    sessionData.lastUpdate = Date.now();
    storeWithTTL(dashboardMetrics, sessionKey, sessionData);

    res.json({
      success: true,
      eventId,
      message: 'Analytics events recorded successfully'
    });

  } catch (error) {
    console.error('Error recording analytics events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record analytics events'
    });
  }
});

// Get dashboard metrics summary
router.get('/dashboard/summary', async (req, res) => {
  try {
    const { sessionId, timeRange = '1h' } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const sessionKey = `session_${sessionId}`;
    const sessionData = getValidData(dashboardMetrics, sessionKey);
    
    if (!sessionData) {
      return res.json({
        success: true,
        summary: {
          sessionId,
          found: false,
          message: 'No data found for session'
        }
      });
    }

    // Calculate time range filter
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    const timeFilter = now - (timeRanges[timeRange] || timeRanges['1h']);

    // Filter recent metrics and events
    const recentMetrics = (sessionData.metrics || []).filter(m => m.timestamp > timeFilter);
    const recentEvents = (sessionData.events || []).filter(e => e.timestamp > timeFilter);
    const recentErrors = (sessionData.errors || []).filter(e => e.timestamp > timeFilter);

    // Calculate performance summary
    const widgetLoadTimes = recentMetrics
      .filter(m => m.name === 'widget-load-time')
      .map(m => m.value);
    
    const interactionTimes = recentMetrics
      .filter(m => m.name === 'interaction-response-time')
      .map(m => m.value);
    
    const memoryUsages = recentMetrics
      .filter(m => m.name === 'memory-usage')
      .map(m => m.value);

    // Calculate analytics summary
    const widgetInteractions = {};
    const featureUsage = {};
    
    recentEvents.forEach(event => {
      if (event.name === 'widget_interaction') {
        const widgetId = event.properties?.widgetId;
        if (widgetId) {
          widgetInteractions[widgetId] = (widgetInteractions[widgetId] || 0) + 1;
        }
      }
      if (event.name === 'feature_usage') {
        const feature = event.properties?.feature;
        if (feature) {
          featureUsage[feature] = (featureUsage[feature] || 0) + 1;
        }
      }
    });

    // Group errors by type
    const errorsByType = {};
    recentErrors.forEach(error => {
      const errorType = error.name || 'Unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    const summary = {
      sessionId,
      timeRange,
      found: true,
      sessionDuration: now - sessionData.startTime,
      performance: {
        avgWidgetLoadTime: widgetLoadTimes.length > 0 
          ? widgetLoadTimes.reduce((sum, time) => sum + time, 0) / widgetLoadTimes.length 
          : 0,
        avgInteractionTime: interactionTimes.length > 0
          ? interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length
          : 0,
        currentMemoryUsage: memoryUsages.length > 0 ? memoryUsages[memoryUsages.length - 1] : 0,
        metricsCount: recentMetrics.length
      },
      analytics: {
        totalEvents: recentEvents.length,
        widgetInteractions,
        featureUsage,
        uniqueWidgets: Object.keys(widgetInteractions).length,
        uniqueFeatures: Object.keys(featureUsage).length
      },
      errors: {
        totalErrors: recentErrors.length,
        errorsByType,
        uniqueErrorTypes: Object.keys(errorsByType).length
      },
      health: {
        status: recentErrors.length === 0 ? 'healthy' : recentErrors.length < 5 ? 'warning' : 'critical',
        performanceScore: calculatePerformanceScore(widgetLoadTimes, interactionTimes),
        recommendations: generateRecommendations(recentMetrics, recentErrors)
      }
    };

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard summary'
    });
  }
});

// Get performance analytics
router.get('/performance/analysis', async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    // Get all performance metrics within time range
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    const timeFilter = now - (timeRanges[timeRange] || timeRanges['1h']);

    const allMetrics = [];
    for (const [key, value] of performanceMetrics.entries()) {
      if (value.expiresAt > now && value.data.timestamp > timeFilter) {
        allMetrics.push(...value.data.metrics);
      }
    }

    // Analyze performance patterns
    const analysis = {
      timeRange,
      totalMetrics: allMetrics.length,
      breakdown: {
        widgetLoadTimes: analyzeMetricType(allMetrics, 'widget-load-time'),
        interactionTimes: analyzeMetricType(allMetrics, 'interaction-response-time'),
        memoryUsage: analyzeMetricType(allMetrics, 'memory-usage'),
        apiCalls: analyzeMetricType(allMetrics, 'api-call-duration'),
        renderTimes: analyzeMetricType(allMetrics, 'component-render-time')
      },
      trends: calculateTrends(allMetrics),
      outliers: detectOutliers(allMetrics),
      recommendations: generatePerformanceRecommendations(allMetrics)
    };

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze performance'
    });
  }
});

// Get error analytics
router.get('/errors/analysis', async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    // Get all error reports within time range
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    const timeFilter = now - (timeRanges[timeRange] || timeRanges['1h']);

    const allErrors = [];
    for (const [key, value] of errorReports.entries()) {
      if (value.expiresAt > now && value.data.createdAt && new Date(value.data.createdAt).getTime() > timeFilter) {
        allErrors.push(...value.data.errors);
      }
    }

    const analysis = {
      timeRange,
      totalErrors: allErrors.length,
      errorsByType: groupErrorsByType(allErrors),
      errorsByMessage: groupErrorsByMessage(allErrors),
      criticalErrors: allErrors.filter(isCriticalError),
      errorTrends: calculateErrorTrends(allErrors),
      topErrorSources: getTopErrorSources(allErrors),
      recommendations: generateErrorRecommendations(allErrors)
    };

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing errors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze errors'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    storage: {
      performanceMetrics: performanceMetrics.size,
      errorReports: errorReports.size,
      analyticsEvents: analyticsEvents.size,
      dashboardMetrics: dashboardMetrics.size
    }
  };

  res.json({
    success: true,
    health
  });
});

// Helper functions
function calculatePerformanceScore(widgetLoadTimes, interactionTimes) {
  let score = 100;
  
  if (widgetLoadTimes.length > 0) {
    const avgLoadTime = widgetLoadTimes.reduce((sum, time) => sum + time, 0) / widgetLoadTimes.length;
    if (avgLoadTime > 2000) score -= 20;
    else if (avgLoadTime > 1000) score -= 10;
  }
  
  if (interactionTimes.length > 0) {
    const avgInteractionTime = interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
    if (avgInteractionTime > 300) score -= 15;
    else if (avgInteractionTime > 100) score -= 5;
  }
  
  return Math.max(score, 0);
}

function generateRecommendations(metrics, errors) {
  const recommendations = [];
  
  const widgetLoadTimes = metrics.filter(m => m.name === 'widget-load-time');
  const avgLoadTime = widgetLoadTimes.length > 0 
    ? widgetLoadTimes.reduce((sum, m) => sum + m.value, 0) / widgetLoadTimes.length 
    : 0;
  
  if (avgLoadTime > 2000) {
    recommendations.push('Widget load times are high. Consider optimizing widget rendering or implementing lazy loading.');
  }
  
  if (errors.length > 5) {
    recommendations.push('High error count detected. Check for common error patterns and implement fixes.');
  }
  
  const memoryMetrics = metrics.filter(m => m.name === 'memory-usage');
  if (memoryMetrics.length > 0) {
    const latestMemory = memoryMetrics[memoryMetrics.length - 1].value;
    if (latestMemory > 100 * 1024 * 1024) {
      recommendations.push('High memory usage detected. Consider cleaning up unused components or implementing memory optimization.');
    }
  }
  
  return recommendations;
}

function analyzeMetricType(metrics, type) {
  const typeMetrics = metrics.filter(m => m.name === type);
  if (typeMetrics.length === 0) return null;
  
  const values = typeMetrics.map(m => m.value);
  values.sort((a, b) => a - b);
  
  return {
    count: typeMetrics.length,
    min: values[0],
    max: values[values.length - 1],
    avg: values.reduce((sum, val) => sum + val, 0) / values.length,
    median: values[Math.floor(values.length / 2)],
    p95: values[Math.floor(values.length * 0.95)],
    p99: values[Math.floor(values.length * 0.99)]
  };
}

function calculateTrends(metrics) {
  // Simple trend calculation - in production, use more sophisticated analysis
  const now = Date.now();
  const recent = metrics.filter(m => m.timestamp > now - 30 * 60 * 1000); // Last 30 minutes
  const older = metrics.filter(m => m.timestamp <= now - 30 * 60 * 1000);
  
  return {
    recentCount: recent.length,
    olderCount: older.length,
    trend: recent.length > older.length ? 'increasing' : recent.length < older.length ? 'decreasing' : 'stable'
  };
}

function detectOutliers(metrics) {
  const outliers = [];
  const metricTypes = [...new Set(metrics.map(m => m.name))];
  
  metricTypes.forEach(type => {
    const typeMetrics = metrics.filter(m => m.name === type);
    const values = typeMetrics.map(m => m.value);
    
    if (values.length < 3) return;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    typeMetrics.forEach(metric => {
      if (Math.abs(metric.value - mean) > 2 * stdDev) {
        outliers.push({
          type,
          value: metric.value,
          timestamp: metric.timestamp,
          deviation: Math.abs(metric.value - mean) / stdDev
        });
      }
    });
  });
  
  return outliers;
}

function generatePerformanceRecommendations(metrics) {
  const recommendations = [];
  
  const analysis = {
    widgetLoadTimes: analyzeMetricType(metrics, 'widget-load-time'),
    interactionTimes: analyzeMetricType(metrics, 'interaction-response-time'),
    memoryUsage: analyzeMetricType(metrics, 'memory-usage')
  };
  
  if (analysis.widgetLoadTimes && analysis.widgetLoadTimes.avg > 1000) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: 'Widget load times are above recommended thresholds',
      suggestion: 'Implement lazy loading and optimize widget rendering'
    });
  }
  
  if (analysis.interactionTimes && analysis.interactionTimes.avg > 200) {
    recommendations.push({
      type: 'interaction',
      priority: 'medium',
      message: 'Interaction response times could be improved',
      suggestion: 'Consider debouncing and optimizing event handlers'
    });
  }
  
  return recommendations;
}

function groupErrorsByType(errors) {
  const grouped = {};
  errors.forEach(error => {
    const type = error.name || 'Unknown';
    grouped[type] = (grouped[type] || 0) + 1;
  });
  return grouped;
}

function groupErrorsByMessage(errors) {
  const grouped = {};
  errors.forEach(error => {
    const message = error.message || 'Unknown';
    grouped[message] = (grouped[message] || 0) + 1;
  });
  return grouped;
}

function isCriticalError(error) {
  const criticalPatterns = [
    'ChunkLoadError',
    'Network Error',
    'Failed to fetch',
    'Script error',
    'SecurityError'
  ];
  
  return criticalPatterns.some(pattern => 
    error.message?.includes(pattern) || error.name?.includes(pattern)
  );
}

function calculateErrorTrends(errors) {
  const now = Date.now();
  const recent = errors.filter(e => e.timestamp > now - 30 * 60 * 1000);
  const older = errors.filter(e => e.timestamp <= now - 30 * 60 * 1000);
  
  return {
    recentCount: recent.length,
    olderCount: older.length,
    trend: recent.length > older.length ? 'increasing' : recent.length < older.length ? 'decreasing' : 'stable'
  };
}

function getTopErrorSources(errors) {
  const sources = {};
  errors.forEach(error => {
    const context = error.context;
    if (context?.url) {
      sources[context.url] = (sources[context.url] || 0) + 1;
    }
  });
  
  return Object.entries(sources)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([url, count]) => ({ url, count }));
}

function generateErrorRecommendations(errors) {
  const recommendations = [];
  
  const criticalErrors = errors.filter(isCriticalError);
  if (criticalErrors.length > 0) {
    recommendations.push({
      type: 'critical',
      priority: 'high',
      message: `${criticalErrors.length} critical errors detected`,
      suggestion: 'Address critical errors immediately to prevent user experience issues'
    });
  }
  
  const errorsByType = groupErrorsByType(errors);
  const topErrorType = Object.entries(errorsByType)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (topErrorType && topErrorType[1] > 5) {
    recommendations.push({
      type: 'pattern',
      priority: 'medium',
      message: `High frequency of ${topErrorType[0]} errors`,
      suggestion: `Investigate and fix the root cause of ${topErrorType[0]} errors`
    });
  }
  
  return recommendations;
}

export default router;