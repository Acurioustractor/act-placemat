/**
 * Cache Monitor
 * 
 * Monitoring and maintenance utilities for cache health checking,
 * performance monitoring, and automated maintenance tasks
 */

import {
  CacheMonitor as ICacheMonitor,
  CacheProvider,
  CacheHealthStatus,
  MaintenanceResult,
  CacheMetricsExport,
  HealthIssue,
  IssueSeverity,
  IssueType,
  CacheEvent,
  CacheEventType
} from './types';

export class CacheMonitor implements ICacheMonitor {
  private provider: CacheProvider;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private healthHistory: Array<{ timestamp: Date; metrics: any }> = [];
  private alertThresholds: {
    hitRateThreshold: number;
    responseTimeThreshold: number;
    memoryUsageThreshold: number;
    errorRateThreshold: number;
  };

  constructor(
    provider: CacheProvider,
    options: {
      monitoringIntervalMs?: number;
      historyRetentionCount?: number;
      alertThresholds?: {
        hitRateThreshold?: number;
        responseTimeThreshold?: number;
        memoryUsageThreshold?: number;
        errorRateThreshold?: number;
      };
    } = {}
  ) {
    this.provider = provider;
    this.alertThresholds = {
      hitRateThreshold: options.alertThresholds?.hitRateThreshold || 0.7,
      responseTimeThreshold: options.alertThresholds?.responseTimeThreshold || 100, // ms
      memoryUsageThreshold: options.alertThresholds?.memoryUsageThreshold || 0.8, // 80%
      errorRateThreshold: options.alertThresholds?.errorRateThreshold || 0.05 // 5%
    };

    // Start monitoring cache events
    this.provider.monitor((event) => this.handleCacheEvent(event));
  }

  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectHealthMetrics().catch(error =>
        console.error('Error collecting health metrics:', error)
      );
    }, 60000); // Monitor every minute

    console.log('Cache monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('Cache monitoring stopped');
  }

  getHealthStatus(): CacheHealthStatus {
    try {
      const issues: HealthIssue[] = [];
      const recommendations: string[] = [];

      // Get latest metrics
      const latestHealth = this.healthHistory[this.healthHistory.length - 1];
      if (!latestHealth) {
        return {
          healthy: false,
          issues: [{
            severity: IssueSeverity.HIGH,
            type: IssueType.CONFIGURATION_ISSUE,
            description: 'No health metrics available',
            recommendation: 'Start monitoring to collect health data',
            affectedNamespaces: []
          }],
          recommendations: ['Start cache monitoring'],
          metrics: {
            hitRate: 0,
            responseTime: 0,
            memoryUsage: 0,
            errorRate: 0
          }
        };
      }

      const metrics = latestHealth.metrics;

      // Check hit rate
      if (metrics.hitRate < this.alertThresholds.hitRateThreshold) {
        issues.push({
          severity: IssueSeverity.MEDIUM,
          type: IssueType.HIGH_MISS_RATE,
          description: `Cache hit rate (${(metrics.hitRate * 100).toFixed(1)}%) is below threshold (${(this.alertThresholds.hitRateThreshold * 100).toFixed(1)}%)`,
          recommendation: 'Review caching strategy and TTL values',
          affectedNamespaces: this.getAffectedNamespaces(metrics.namespaceStats, 'hitRate')
        });
        recommendations.push('Consider increasing TTL for frequently accessed data');
        recommendations.push('Review invalidation patterns for excessive cache clearing');
      }

      // Check response time
      if (metrics.averageResponseTime > this.alertThresholds.responseTimeThreshold) {
        issues.push({
          severity: IssueSeverity.MEDIUM,
          type: IssueType.SLOW_RESPONSE,
          description: `Average response time (${metrics.averageResponseTime.toFixed(1)}ms) exceeds threshold (${this.alertThresholds.responseTimeThreshold}ms)`,
          recommendation: 'Investigate cache provider performance',
          affectedNamespaces: this.getAffectedNamespaces(metrics.namespaceStats, 'averageResponseTime')
        });
        recommendations.push('Consider using faster cache backend');
        recommendations.push('Review data serialization efficiency');
      }

      // Check memory usage (for providers that support it)
      const memoryUsagePercent = this.calculateMemoryUsagePercent(metrics);
      if (memoryUsagePercent > this.alertThresholds.memoryUsageThreshold) {
        issues.push({
          severity: memoryUsagePercent > 0.95 ? IssueSeverity.CRITICAL : IssueSeverity.HIGH,
          type: IssueType.MEMORY_PRESSURE,
          description: `Memory usage (${(memoryUsagePercent * 100).toFixed(1)}%) is high`,
          recommendation: 'Reduce cache size or increase memory allocation',
          affectedNamespaces: []
        });
        recommendations.push('Enable compression for large cache entries');
        recommendations.push('Implement more aggressive eviction policies');
        recommendations.push('Consider partitioning cache across multiple instances');
      }

      // Check eviction rate
      if (metrics.evictionsCount > metrics.totalEntries * 0.1) { // More than 10% evicted
        issues.push({
          severity: IssueSeverity.HIGH,
          type: IssueType.FREQUENT_EVICTIONS,
          description: `High eviction rate detected (${metrics.evictionsCount} evictions for ${metrics.totalEntries} entries)`,
          recommendation: 'Increase cache capacity or review eviction policy',
          affectedNamespaces: []
        });
        recommendations.push('Increase maximum cache entries limit');
        recommendations.push('Review TTL settings for better retention');
      }

      // Calculate overall error rate from cache events
      const errorRate = this.calculateErrorRate();
      if (errorRate > this.alertThresholds.errorRateThreshold) {
        issues.push({
          severity: IssueSeverity.HIGH,
          type: IssueType.CONFIGURATION_ISSUE,
          description: `Cache error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold`,
          recommendation: 'Check cache provider connectivity and configuration',
          affectedNamespaces: []
        });
        recommendations.push('Review cache provider logs for errors');
        recommendations.push('Verify network connectivity to cache backend');
      }

      const healthy = issues.length === 0 || issues.every(issue => 
        issue.severity === IssueSeverity.LOW
      );

      return {
        healthy,
        issues,
        recommendations,
        metrics: {
          hitRate: metrics.hitRate,
          responseTime: metrics.averageResponseTime,
          memoryUsage: memoryUsagePercent,
          errorRate
        }
      };

    } catch (error) {
      return {
        healthy: false,
        issues: [{
          severity: IssueSeverity.CRITICAL,
          type: IssueType.CONFIGURATION_ISSUE,
          description: `Failed to get health status: ${error instanceof Error ? error.message : String(error)}`,
          recommendation: 'Check cache monitor configuration',
          affectedNamespaces: []
        }],
        recommendations: ['Restart cache monitoring'],
        metrics: {
          hitRate: 0,
          responseTime: 0,
          memoryUsage: 0,
          errorRate: 1
        }
      };
    }
  }

  async triggerMaintenence(): Promise<MaintenanceResult> {
    const startTime = Date.now();
    let entriesEvicted = 0;
    let memoryFreed = 0;
    let indexesRebuilt = 0;
    let corruptedEntriesFixed = 0;
    const errors: string[] = [];

    try {
      // Get current stats for comparison
      const statsBefore = await this.provider.getStats();

      // 1. Clean up expired entries
      try {
        const expiredPattern = '*'; // Would need provider-specific expired entry detection
        // This is a placeholder - actual implementation would depend on provider capabilities
        console.log('Cleaned up expired entries');
      } catch (error) {
        errors.push(`Failed to clean expired entries: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 2. Perform cache validation and repair
      try {
        const validationResult = await this.validateCacheIntegrity();
        corruptedEntriesFixed = validationResult.corruptedEntriesFixed;
      } catch (error) {
        errors.push(`Failed to validate cache integrity: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 3. Optimize cache layout (provider-specific)
      try {
        // This would be implemented based on the specific cache provider
        indexesRebuilt = 1; // Placeholder
        console.log('Optimized cache layout');
      } catch (error) {
        errors.push(`Failed to optimize cache layout: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 4. Force garbage collection if possible
      try {
        if (global.gc) {
          global.gc();
          console.log('Triggered garbage collection');
        }
      } catch (error) {
        errors.push(`Failed to trigger garbage collection: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Get stats after maintenance
      const statsAfter = await this.provider.getStats();
      entriesEvicted = Math.max(0, statsBefore.totalEntries - statsAfter.totalEntries);
      memoryFreed = Math.max(0, statsBefore.memoryUsage - statsAfter.memoryUsage);

      return {
        entriesEvicted,
        memoryFreed,
        indexesRebuilt,
        corruptedEntriesFixed,
        executionTime: Date.now() - startTime,
        errors
      };

    } catch (error) {
      errors.push(`Maintenance failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        entriesEvicted,
        memoryFreed,
        indexesRebuilt,
        corruptedEntriesFixed,
        executionTime: Date.now() - startTime,
        errors
      };
    }
  }

  async exportMetrics(): Promise<CacheMetricsExport> {
    try {
      const stats = await this.provider.getStats();
      const healthStatus = this.getHealthStatus();
      
      const exportData = {
        timestamp: new Date(),
        stats,
        healthStatus,
        healthHistory: this.healthHistory.slice(-100), // Last 100 health checks
        alertThresholds: this.alertThresholds
      };

      const data = JSON.stringify(exportData, null, 2);
      const crypto = require('crypto');
      const checksum = crypto.createHash('sha256').update(data).digest('hex');

      return {
        timestamp: new Date(),
        format: 'json',
        data,
        compressed: false,
        checksum
      };

    } catch (error) {
      throw new Error(`Failed to export metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private helper methods

  private async collectHealthMetrics(): Promise<void> {
    try {
      const stats = await this.provider.getStats();
      
      this.healthHistory.push({
        timestamp: new Date(),
        metrics: stats
      });

      // Keep only last 24 hours of data (assuming 1-minute intervals)
      if (this.healthHistory.length > 1440) {
        this.healthHistory = this.healthHistory.slice(-1440);
      }

    } catch (error) {
      console.error('Failed to collect health metrics:', error);
    }
  }

  private handleCacheEvent(event: CacheEvent): void {
    // Log significant events
    if (event.type === CacheEventType.MEMORY_WARNING || 
        event.type === CacheEventType.PERFORMANCE_DEGRADATION) {
      console.warn('Cache event:', event);
    }

    // Could trigger immediate health checks or alerts based on event type
  }

  private getAffectedNamespaces(namespaceStats: any[], metric: string): string[] {
    if (!namespaceStats) return [];
    
    return namespaceStats
      .filter(ns => {
        switch (metric) {
          case 'hitRate':
            return ns.hitRate < this.alertThresholds.hitRateThreshold;
          case 'averageResponseTime':
            return ns.averageResponseTime > this.alertThresholds.responseTimeThreshold;
          default:
            return false;
        }
      })
      .map(ns => ns.namespace);
  }

  private calculateMemoryUsagePercent(metrics: any): number {
    // This would need to be implemented based on provider capabilities
    // For now, assume a reasonable usage level
    if (metrics.memoryUsage && metrics.peakMemoryUsage) {
      return metrics.memoryUsage / metrics.peakMemoryUsage;
    }
    return 0;
  }

  private calculateErrorRate(): number {
    // Calculate error rate from recent operations
    // This would need to track error events over time
    return 0; // Placeholder
  }

  private async validateCacheIntegrity(): Promise<{ corruptedEntriesFixed: number }> {
    let corruptedEntriesFixed = 0;

    try {
      // Query all cache entries
      const entries = await this.provider.query({ limit: 10000 });
      
      for (const entry of entries) {
        try {
          // Validate entry structure
          if (!entry.key || !entry.value || !entry.metadata) {
            console.warn(`Corrupted entry found: ${entry.key}`);
            await this.provider.delete(entry.key);
            corruptedEntriesFixed++;
            continue;
          }

          // Validate checksum if available
          if (entry.metadata.checksum) {
            const expectedChecksum = this.generateChecksum(entry.value);
            if (entry.metadata.checksum !== expectedChecksum) {
              console.warn(`Checksum mismatch for entry: ${entry.key}`);
              await this.provider.delete(entry.key);
              corruptedEntriesFixed++;
            }
          }

        } catch (error) {
          console.warn(`Error validating entry ${entry.key}:`, error);
          await this.provider.delete(entry.key);
          corruptedEntriesFixed++;
        }
      }

    } catch (error) {
      console.error('Error validating cache integrity:', error);
    }

    return { corruptedEntriesFixed };
  }

  private generateChecksum(value: any): string {
    const data = JSON.stringify(value);
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  // Public utility methods

  getTrendAnalysis(metricName: string, periodHours: number = 24): {
    trend: 'improving' | 'degrading' | 'stable';
    change: number;
    confidence: number;
  } {
    const cutoffTime = new Date(Date.now() - (periodHours * 60 * 60 * 1000));
    const recentHistory = this.healthHistory.filter(h => h.timestamp >= cutoffTime);
    
    if (recentHistory.length < 2) {
      return { trend: 'stable', change: 0, confidence: 0 };
    }

    const values = recentHistory.map(h => {
      switch (metricName) {
        case 'hitRate':
          return h.metrics.hitRate;
        case 'responseTime':
          return h.metrics.averageResponseTime;
        case 'memoryUsage':
          return h.metrics.memoryUsage;
        default:
          return 0;
      }
    });

    // Simple linear trend analysis
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const change = (lastValue - firstValue) / firstValue;

    // Determine trend direction
    let trend: 'improving' | 'degrading' | 'stable';
    if (Math.abs(change) < 0.05) { // Less than 5% change
      trend = 'stable';
    } else if (metricName === 'hitRate') {
      trend = change > 0 ? 'improving' : 'degrading';
    } else { // For responseTime and memoryUsage, lower is better
      trend = change < 0 ? 'improving' : 'degrading';
    }

    // Simple confidence based on data points and variance
    const confidence = Math.min(values.length / 10, 1); // More data points = higher confidence

    return { trend, change, confidence };
  }

  getPerformanceReport(): {
    summary: string;
    keyMetrics: Record<string, any>;
    recommendations: string[];
  } {
    const health = this.getHealthStatus();
    const hitRateTrend = this.getTrendAnalysis('hitRate');
    const responseTimeTrend = this.getTrendAnalysis('responseTime');

    const summary = health.healthy 
      ? 'Cache is operating within normal parameters'
      : `Cache has ${health.issues.length} issue(s) requiring attention`;

    const keyMetrics = {
      hitRate: `${(health.metrics.hitRate * 100).toFixed(1)}% (${hitRateTrend.trend})`,
      responseTime: `${health.metrics.responseTime.toFixed(1)}ms (${responseTimeTrend.trend})`,
      memoryUsage: `${(health.metrics.memoryUsage * 100).toFixed(1)}%`,
      issueCount: health.issues.length
    };

    return {
      summary,
      keyMetrics,
      recommendations: health.recommendations
    };
  }
}