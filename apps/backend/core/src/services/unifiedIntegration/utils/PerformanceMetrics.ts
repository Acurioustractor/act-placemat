/**
 * Performance Metrics Collection for UnifiedIntegrationService
 * Provides comprehensive performance monitoring and analytics
 */

import { IntegrationLogger } from './Logger.js';

export interface PerformanceMetric {
  timestamp: number;
  operation: string;
  service: string;
  duration: number;
  success: boolean;
  cacheHit?: boolean;
  dataSize?: number;
  errorType?: string;
  metadata?: Record<string, any>;
}

export interface AggregatedMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  operationsPerSecond: number;
  errorRate: number;
  serviceBreakdown: Record<string, ServiceMetrics>;
  operationBreakdown: Record<string, OperationMetrics>;
}

export interface ServiceMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  lastCallTime: number;
  errorRate: number;
}

export interface OperationMetrics {
  totalCalls: number;
  successfulCalls: number;
  averageResponseTime: number;
  cacheHitRate: number;
  p95ResponseTime: number;
}

export interface PerformanceAlert {
  type: 'high_error_rate' | 'slow_response' | 'cache_miss_spike' | 'service_degradation';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  metrics: Record<string, any>;
}

export interface MetricsConfig {
  maxMetricsRetention: number; // Number of metrics to keep in memory
  aggregationWindow: number; // Time window for aggregation in ms
  alertThresholds: {
    errorRateThreshold: number; // 0-1
    responseTimeThreshold: number; // milliseconds
    cacheMissThreshold: number; // 0-1
  };
}

export class PerformanceMetrics {
  private readonly logger: IntegrationLogger;
  private readonly metrics: PerformanceMetric[] = [];
  private readonly alerts: PerformanceAlert[] = [];
  private metricsTimer?: NodeJS.Timeout;

  private readonly defaultConfig: MetricsConfig = {
    maxMetricsRetention: 10000,
    aggregationWindow: 300000, // 5 minutes
    alertThresholds: {
      errorRateThreshold: 0.1, // 10%
      responseTimeThreshold: 5000, // 5 seconds
      cacheMissThreshold: 0.8 // 80%
    }
  };

  constructor(
    private readonly config: Partial<MetricsConfig> = {}
  ) {
    this.logger = IntegrationLogger.getInstance();
    this.config = { ...this.defaultConfig, ...config };

    this.logger.info('Performance metrics initialized', {
      config: this.config
    });

    // Start periodic metrics processing
    this.startMetricsProcessing();
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Maintain retention limit
    if (this.metrics.length > this.config.maxMetricsRetention!) {
      this.metrics.splice(0, this.metrics.length - this.config.maxMetricsRetention!);
    }

    this.logger.debug('Performance metric recorded', {
      operation: metric.operation,
      service: metric.service,
      duration: metric.duration,
      success: metric.success,
      cacheHit: metric.cacheHit
    });

    // Check for immediate alerts
    this.checkForAlerts(fullMetric);
  }

  /**
   * Record operation start time
   */
  startOperation(operation: string, service: string, metadata?: Record<string, any>): () => void {
    const startTime = Date.now();

    return (success: boolean = true, errorType?: string, cacheHit?: boolean, dataSize?: number) => {
      const duration = Date.now() - startTime;

      this.recordMetric({
        operation,
        service,
        duration,
        success,
        cacheHit,
        dataSize,
        errorType,
        metadata
      });
    };
  }

  /**
   * Get aggregated metrics for a time window
   */
  getAggregatedMetrics(windowMs?: number): AggregatedMetrics {
    const window = windowMs || this.config.aggregationWindow!;
    const cutoff = Date.now() - window;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
      return this.getEmptyMetrics();
    }

    const durations = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successfulOps = recentMetrics.filter(m => m.success);
    const cacheHits = recentMetrics.filter(m => m.cacheHit === true);
    const totalOps = recentMetrics.length;

    return {
      totalOperations: totalOps,
      successfulOperations: successfulOps.length,
      failedOperations: totalOps - successfulOps.length,
      averageResponseTime: this.calculateAverage(durations),
      p95ResponseTime: this.calculatePercentile(durations, 0.95),
      p99ResponseTime: this.calculatePercentile(durations, 0.99),
      cacheHitRate: cacheHits.length / Math.max(1, recentMetrics.filter(m => m.cacheHit !== undefined).length),
      operationsPerSecond: totalOps / (window / 1000),
      errorRate: (totalOps - successfulOps.length) / totalOps,
      serviceBreakdown: this.calculateServiceBreakdown(recentMetrics),
      operationBreakdown: this.calculateOperationBreakdown(recentMetrics)
    };
  }

  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(serviceName: string, windowMs?: number): ServiceMetrics {
    const window = windowMs || this.config.aggregationWindow!;
    const cutoff = Date.now() - window;
    const serviceMetrics = this.metrics.filter(
      m => m.service === serviceName && m.timestamp >= cutoff
    );

    if (serviceMetrics.length === 0) {
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        lastCallTime: 0,
        errorRate: 0
      };
    }

    const successfulCalls = serviceMetrics.filter(m => m.success).length;
    const durations = serviceMetrics.map(m => m.duration);

    return {
      totalCalls: serviceMetrics.length,
      successfulCalls,
      failedCalls: serviceMetrics.length - successfulCalls,
      averageResponseTime: this.calculateAverage(durations),
      lastCallTime: Math.max(...serviceMetrics.map(m => m.timestamp)),
      errorRate: (serviceMetrics.length - successfulCalls) / serviceMetrics.length
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(bucketSizeMs: number = 60000): Array<{
    timestamp: number;
    averageResponseTime: number;
    operationCount: number;
    errorRate: number;
    cacheHitRate: number;
  }> {
    const buckets = new Map<number, PerformanceMetric[]>();

    // Group metrics into time buckets
    this.metrics.forEach(metric => {
      const bucketStart = Math.floor(metric.timestamp / bucketSizeMs) * bucketSizeMs;
      if (!buckets.has(bucketStart)) {
        buckets.set(bucketStart, []);
      }
      buckets.get(bucketStart)!.push(metric);
    });

    // Calculate trends for each bucket
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, metrics]) => {
        const durations = metrics.map(m => m.duration);
        const successful = metrics.filter(m => m.success).length;
        const cacheHits = metrics.filter(m => m.cacheHit === true).length;
        const cacheableOps = metrics.filter(m => m.cacheHit !== undefined).length;

        return {
          timestamp,
          averageResponseTime: this.calculateAverage(durations),
          operationCount: metrics.length,
          errorRate: (metrics.length - successful) / metrics.length,
          cacheHitRate: cacheableOps > 0 ? cacheHits / cacheableOps : 0
        };
      });
  }

  /**
   * Check for performance alerts
   */
  private checkForAlerts(metric: PerformanceMetric): void {
    const thresholds = this.config.alertThresholds!;

    // High response time alert
    if (metric.duration > thresholds.responseTimeThreshold) {
      this.createAlert('slow_response', 'warning',
        `Slow response detected: ${metric.duration}ms for ${metric.operation} on ${metric.service}`,
        { duration: metric.duration, operation: metric.operation, service: metric.service }
      );
    }

    // Check aggregate error rate
    const recentMetrics = this.metrics.filter(
      m => m.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    if (recentMetrics.length >= 10) {
      const errorRate = recentMetrics.filter(m => !m.success).length / recentMetrics.length;

      if (errorRate > thresholds.errorRateThreshold) {
        this.createAlert('high_error_rate', 'critical',
          `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
          { errorRate, windowSize: recentMetrics.length }
        );
      }
    }

    // Check cache miss rate
    const cacheableOps = recentMetrics.filter(m => m.cacheHit !== undefined);
    if (cacheableOps.length >= 10) {
      const cacheHitRate = cacheableOps.filter(m => m.cacheHit).length / cacheableOps.length;

      if (cacheHitRate < (1 - thresholds.cacheMissThreshold)) {
        this.createAlert('cache_miss_spike', 'warning',
          `Low cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`,
          { cacheHitRate, windowSize: cacheableOps.length }
        );
      }
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    metrics: Record<string, any>
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      timestamp: Date.now(),
      metrics
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }

    this.logger[severity === 'critical' ? 'error' : 'warn']('Performance alert', {
      type,
      severity,
      message,
      metrics
    });
  }

  /**
   * Calculate service breakdown
   */
  private calculateServiceBreakdown(metrics: PerformanceMetric[]): Record<string, ServiceMetrics> {
    const services = new Map<string, PerformanceMetric[]>();

    metrics.forEach(metric => {
      if (!services.has(metric.service)) {
        services.set(metric.service, []);
      }
      services.get(metric.service)!.push(metric);
    });

    const breakdown: Record<string, ServiceMetrics> = {};

    services.forEach((serviceMetrics, serviceName) => {
      const successful = serviceMetrics.filter(m => m.success).length;
      const durations = serviceMetrics.map(m => m.duration);

      breakdown[serviceName] = {
        totalCalls: serviceMetrics.length,
        successfulCalls: successful,
        failedCalls: serviceMetrics.length - successful,
        averageResponseTime: this.calculateAverage(durations),
        lastCallTime: Math.max(...serviceMetrics.map(m => m.timestamp)),
        errorRate: (serviceMetrics.length - successful) / serviceMetrics.length
      };
    });

    return breakdown;
  }

  /**
   * Calculate operation breakdown
   */
  private calculateOperationBreakdown(metrics: PerformanceMetric[]): Record<string, OperationMetrics> {
    const operations = new Map<string, PerformanceMetric[]>();

    metrics.forEach(metric => {
      if (!operations.has(metric.operation)) {
        operations.set(metric.operation, []);
      }
      operations.get(metric.operation)!.push(metric);
    });

    const breakdown: Record<string, OperationMetrics> = {};

    operations.forEach((operationMetrics, operationName) => {
      const successful = operationMetrics.filter(m => m.success).length;
      const durations = operationMetrics.map(m => m.duration).sort((a, b) => a - b);
      const cacheableOps = operationMetrics.filter(m => m.cacheHit !== undefined);
      const cacheHits = operationMetrics.filter(m => m.cacheHit === true);

      breakdown[operationName] = {
        totalCalls: operationMetrics.length,
        successfulCalls: successful,
        averageResponseTime: this.calculateAverage(durations),
        cacheHitRate: cacheableOps.length > 0 ? cacheHits.length / cacheableOps.length : 0,
        p95ResponseTime: this.calculatePercentile(durations, 0.95)
      };
    });

    return breakdown;
  }

  /**
   * Calculate average of an array of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Calculate percentile of a sorted array
   */
  private calculatePercentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0;

    const index = Math.ceil(sortedNumbers.length * percentile) - 1;
    return sortedNumbers[Math.max(0, Math.min(index, sortedNumbers.length - 1))];
  }

  /**
   * Get empty metrics structure
   */
  private getEmptyMetrics(): AggregatedMetrics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      operationsPerSecond: 0,
      errorRate: 0,
      serviceBreakdown: {},
      operationBreakdown: {}
    };
  }

  /**
   * Start periodic metrics processing
   */
  private startMetricsProcessing(): void {
    this.metricsTimer = setInterval(() => {
      this.cleanupOldMetrics();
      this.logPerformanceSummary();
    }, 60000); // Every minute
  }

  /**
   * Clean up old metrics beyond retention period
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (this.config.aggregationWindow! * 2); // Keep 2x aggregation window
    const initialCount = this.metrics.length;

    // Remove old metrics
    const newMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    this.metrics.splice(0, this.metrics.length, ...newMetrics);

    if (initialCount !== this.metrics.length) {
      this.logger.debug('Old metrics cleaned up', {
        removed: initialCount - this.metrics.length,
        remaining: this.metrics.length
      });
    }
  }

  /**
   * Log periodic performance summary
   */
  private logPerformanceSummary(): void {
    const metrics = this.getAggregatedMetrics();

    if (metrics.totalOperations > 0) {
      this.logger.info('Performance summary', {
        totalOperations: metrics.totalOperations,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        errorRate: (metrics.errorRate * 100).toFixed(1) + '%',
        cacheHitRate: (metrics.cacheHitRate * 100).toFixed(1) + '%',
        operationsPerSecond: metrics.operationsPerSecond.toFixed(1)
      });
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    metrics: PerformanceMetric[];
    aggregated: AggregatedMetrics;
    alerts: PerformanceAlert[];
    trends: ReturnType<PerformanceMetrics['getPerformanceTrends']>;
  } {
    return {
      metrics: [...this.metrics],
      aggregated: this.getAggregatedMetrics(),
      alerts: this.getRecentAlerts(50),
      trends: this.getPerformanceTrends()
    };
  }

  /**
   * Clear all metrics and alerts
   */
  clear(): void {
    this.metrics.splice(0);
    this.alerts.splice(0);
    this.logger.info('Performance metrics cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MetricsConfig>): void {
    Object.assign(this.config, newConfig);
    this.logger.info('Performance metrics configuration updated', {
      config: this.config
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }

    this.logger.info('Performance metrics destroyed');
  }
}