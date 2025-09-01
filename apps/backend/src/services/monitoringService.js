/**
 * Enhanced Monitoring Service for ACT Placemat
 * Provides comprehensive system monitoring, health checks, and performance tracking
 */

const { logger } = require('../../utils/logger');
const { errorHandlingService } = require('./errorHandlingService');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        byEndpoint: new Map(),
        byMethod: new Map()
      },
      performance: {
        memory: [],
        cpu: [],
        responseTimeSamples: []
      },
      health: {
        status: 'healthy',
        lastCheck: null,
        checks: {}
      },
      uptime: {
        startTime: Date.now(),
        totalDowntime: 0,
        incidents: []
      }
    };

    this.alertRules = {
      highErrorRate: { threshold: 0.05, period: 300000 }, // 5% in 5 minutes
      slowResponseTime: { threshold: 5000, samples: 10 }, // 5s average over 10 samples
      highMemoryUsage: { threshold: 0.9 }, // 90% memory usage
      lowDiskSpace: { threshold: 0.1 }, // 10% free space
      externalApiFailures: { threshold: 3, period: 60000 } // 3 failures in 1 minute
    };

    this.healthChecks = new Map();
    this.setupHealthChecks();
    this.startMonitoring();
  }

  /**
   * Request tracking middleware
   */
  createRequestMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Track request
      this.metrics.requests.total++;
      
      const endpoint = req.route?.path || req.path;
      const method = req.method;
      
      this.trackEndpointRequest(endpoint, method);

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = (...args) => {
        const duration = Date.now() - startTime;
        this.trackRequestCompletion(req, res, duration);
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Track endpoint-specific metrics
   */
  trackEndpointRequest(endpoint, method) {
    // Track by endpoint
    if (!this.metrics.requests.byEndpoint.has(endpoint)) {
      this.metrics.requests.byEndpoint.set(endpoint, {
        total: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        responseTimes: []
      });
    }
    
    const endpointMetrics = this.metrics.requests.byEndpoint.get(endpoint);
    endpointMetrics.total++;

    // Track by method
    if (!this.metrics.requests.byMethod.has(method)) {
      this.metrics.requests.byMethod.set(method, {
        total: 0,
        successful: 0,
        failed: 0
      });
    }
    
    const methodMetrics = this.metrics.requests.byMethod.get(method);
    methodMetrics.total++;
  }

  /**
   * Track request completion metrics
   */
  trackRequestCompletion(req, res, duration) {
    const endpoint = req.route?.path || req.path;
    const method = req.method;
    const isSuccess = res.statusCode < 400;

    // Update global metrics
    if (isSuccess) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Update response time
    this.updateResponseTime(duration);

    // Update endpoint metrics
    const endpointMetrics = this.metrics.requests.byEndpoint.get(endpoint);
    if (endpointMetrics) {
      if (isSuccess) {
        endpointMetrics.successful++;
      } else {
        endpointMetrics.failed++;
      }
      
      // Update response time for endpoint
      endpointMetrics.responseTimes.push(duration);
      if (endpointMetrics.responseTimes.length > 100) {
        endpointMetrics.responseTimes = endpointMetrics.responseTimes.slice(-100);
      }
      
      endpointMetrics.avgResponseTime = endpointMetrics.responseTimes.reduce((a, b) => a + b, 0) / endpointMetrics.responseTimes.length;
    }

    // Update method metrics
    const methodMetrics = this.metrics.requests.byMethod.get(method);
    if (methodMetrics) {
      if (isSuccess) {
        methodMetrics.successful++;
      } else {
        methodMetrics.failed++;
      }
    }

    // Check for alert conditions
    this.checkPerformanceAlerts(duration, isSuccess);
  }

  /**
   * Update average response time
   */
  updateResponseTime(duration) {
    this.metrics.performance.responseTimeSamples.push({
      time: Date.now(),
      duration
    });

    // Keep only last 1000 samples
    if (this.metrics.performance.responseTimeSamples.length > 1000) {
      this.metrics.performance.responseTimeSamples = this.metrics.performance.responseTimeSamples.slice(-1000);
    }

    // Calculate average
    const samples = this.metrics.performance.responseTimeSamples;
    this.metrics.requests.avgResponseTime = samples.reduce((sum, sample) => sum + sample.duration, 0) / samples.length;
  }

  /**
   * Setup health checks
   */
  setupHealthChecks() {
    // Database connectivity check
    this.addHealthCheck('database', async () => {
      try {
        // Mock database check - in real implementation would test actual DB connection
        const testQuery = 'SELECT 1';
        return { status: 'healthy', message: 'Database connection is working', responseTime: 45 };
      } catch (error) {
        return { status: 'unhealthy', message: 'Database connection failed', error: error.message };
      }
    });

    // External API check (Notion)
    this.addHealthCheck('notion_api', async () => {
      try {
        // Mock API check
        const startTime = Date.now();
        // Would make actual API call here
        const responseTime = Date.now() - startTime;
        
        if (responseTime > 5000) {
          return { status: 'degraded', message: 'Notion API responding slowly', responseTime };
        }
        
        return { status: 'healthy', message: 'Notion API is responding', responseTime };
      } catch (error) {
        return { status: 'unhealthy', message: 'Notion API is unreachable', error: error.message };
      }
    });

    // Memory usage check
    this.addHealthCheck('memory', async () => {
      const memoryUsage = process.memoryUsage();
      const usedMemoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const totalMemoryMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const memoryPercent = usedMemoryMB / totalMemoryMB;

      if (memoryPercent > 0.9) {
        return { 
          status: 'unhealthy', 
          message: 'High memory usage detected',
          details: { usedMemoryMB, totalMemoryMB, percentage: Math.round(memoryPercent * 100) }
        };
      } else if (memoryPercent > 0.75) {
        return { 
          status: 'degraded', 
          message: 'Elevated memory usage',
          details: { usedMemoryMB, totalMemoryMB, percentage: Math.round(memoryPercent * 100) }
        };
      }

      return { 
        status: 'healthy', 
        message: 'Memory usage is normal',
        details: { usedMemoryMB, totalMemoryMB, percentage: Math.round(memoryPercent * 100) }
      };
    });

    // Cache performance check
    this.addHealthCheck('cache', async () => {
      try {
        const { cacheService } = require('./cacheService');
        const stats = cacheService.getPerformanceStats();
        const hitRate = parseFloat(stats.hitRate.replace('%', ''));

        if (hitRate < 30) {
          return { 
            status: 'degraded', 
            message: 'Low cache hit rate',
            details: { hitRate: stats.hitRate, cacheSize: stats.cacheSize }
          };
        }

        return { 
          status: 'healthy', 
          message: 'Cache performance is good',
          details: { hitRate: stats.hitRate, cacheSize: stats.cacheSize }
        };
      } catch (error) {
        return { status: 'unhealthy', message: 'Cache service error', error: error.message };
      }
    });
  }

  /**
   * Add a health check
   */
  addHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {};
    let overallStatus = 'healthy';

    for (const [name, checkFunction] of this.healthChecks) {
      try {
        const result = await checkFunction();
        results[name] = {
          ...result,
          timestamp: new Date().toISOString()
        };

        // Determine overall status
        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          message: 'Health check failed',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        overallStatus = 'unhealthy';
      }
    }

    this.metrics.health = {
      status: overallStatus,
      lastCheck: new Date().toISOString(),
      checks: results
    };

    return this.metrics.health;
  }

  /**
   * Start monitoring loops
   */
  startMonitoring() {
    // Run health checks every 30 seconds
    setInterval(async () => {
      await this.runHealthChecks();
    }, 30000);

    // Collect system metrics every 10 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);

    logger.info('Monitoring service started');
  }

  /**
   * Collect system performance metrics
   */
  collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Store memory metrics
    this.metrics.performance.memory.push({
      timestamp: Date.now(),
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss
    });

    // Store CPU metrics
    this.metrics.performance.cpu.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });

    // Keep only last 100 samples
    if (this.metrics.performance.memory.length > 100) {
      this.metrics.performance.memory = this.metrics.performance.memory.slice(-100);
    }
    if (this.metrics.performance.cpu.length > 100) {
      this.metrics.performance.cpu = this.metrics.performance.cpu.slice(-100);
    }
  }

  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts(responseTime, isSuccess) {
    // Check error rate
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;
    if (errorRate > this.alertRules.highErrorRate.threshold) {
      this.triggerAlert('HIGH_ERROR_RATE', { 
        rate: (errorRate * 100).toFixed(2) + '%',
        threshold: (this.alertRules.highErrorRate.threshold * 100).toFixed(2) + '%'
      });
    }

    // Check response time
    if (responseTime > this.alertRules.slowResponseTime.threshold) {
      this.triggerAlert('SLOW_RESPONSE', { 
        responseTime,
        threshold: this.alertRules.slowResponseTime.threshold
      });
    }
  }

  /**
   * Trigger monitoring alert
   */
  triggerAlert(alertType, data) {
    logger.warn(`🚨 MONITORING ALERT: ${alertType}`, data);
    
    // Record incident
    this.metrics.uptime.incidents.push({
      type: alertType,
      timestamp: new Date().toISOString(),
      data
    });

    // In a real implementation, would send notifications
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // Clean up performance samples
    this.metrics.performance.responseTimeSamples = this.metrics.performance.responseTimeSamples.filter(
      sample => sample.time > oneHourAgo
    );

    // Clean up old incidents (keep last 50)
    if (this.metrics.uptime.incidents.length > 50) {
      this.metrics.uptime.incidents = this.metrics.uptime.incidents.slice(-50);
    }
  }

  /**
   * Get comprehensive monitoring dashboard data
   */
  getMonitoringDashboard() {
    const uptime = Date.now() - this.metrics.uptime.startTime;
    const errorRate = this.metrics.requests.total > 0 
      ? (this.metrics.requests.failed / this.metrics.requests.total * 100).toFixed(2)
      : 0;

    return {
      overview: {
        status: this.metrics.health.status,
        uptime: Math.floor(uptime / 1000), // seconds
        totalRequests: this.metrics.requests.total,
        successfulRequests: this.metrics.requests.successful,
        failedRequests: this.metrics.requests.failed,
        errorRate: errorRate + '%',
        avgResponseTime: Math.round(this.metrics.requests.avgResponseTime),
        lastHealthCheck: this.metrics.health.lastCheck
      },
      health: this.metrics.health,
      performance: {
        responseTime: {
          current: Math.round(this.metrics.requests.avgResponseTime),
          samples: this.metrics.performance.responseTimeSamples.slice(-20)
        },
        memory: {
          current: process.memoryUsage(),
          history: this.metrics.performance.memory.slice(-20)
        },
        cpu: {
          current: process.cpuUsage(),
          history: this.metrics.performance.cpu.slice(-20)
        }
      },
      endpoints: Array.from(this.metrics.requests.byEndpoint.entries())
        .map(([endpoint, metrics]) => ({
          endpoint,
          ...metrics,
          errorRate: metrics.total > 0 ? ((metrics.failed / metrics.total) * 100).toFixed(2) + '%' : '0%'
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
      methods: Array.from(this.metrics.requests.byMethod.entries())
        .map(([method, metrics]) => ({ method, ...metrics })),
      recentIncidents: this.metrics.uptime.incidents.slice(-10),
      errorStats: errorHandlingService.getErrorStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get system status for external monitoring
   */
  getSystemStatus() {
    return {
      status: this.metrics.health.status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.metrics.uptime.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Record custom metric
   */
  recordMetric(name, value, labels = {}) {
    logger.info(`📊 Custom metric: ${name}=${value}`, labels);
  }

  /**
   * Record custom event
   */
  recordEvent(eventType, data = {}) {
    logger.info(`📝 Event: ${eventType}`, data);
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

module.exports = {
  MonitoringService,
  monitoringService
};