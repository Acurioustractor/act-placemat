/**
 * Enhanced Metrics Collection Service
 * Comprehensive Prometheus metrics for all 11 ACT Platform integrations
 * Task: 16.4 - Establish Monitoring and Observability for Data Flows
 */

import { createRequire } from 'module';
import monitoringConfig from '../config/monitoringConfig.js';
import { logger } from '../../utils/logger.js';

const require = createRequire(import.meta.url);

class EnhancedMetricsService {
  constructor() {
    this.client = null;
    this.metrics = new Map();
    this.integrationHealth = new Map();
    this.businessMetrics = new Map();
    this.isInitialized = false;

    // Registry for all metrics
    this.registry = null;

    // Default labels for all metrics
    this.defaultLabels = {
      service: 'act-placemat-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      region: 'australia',
    };
  }

  /**
   * Initialize enhanced metrics collection
   */
  async initialize() {
    try {
      logger.info('📊 Initializing Enhanced Metrics Collection Service...');

      // Try to load Prometheus client
      try {
        this.client = require('prom-client');
        this.registry = new this.client.Registry();

        // Set default labels
        this.registry.setDefaultLabels(this.defaultLabels);

        // Collect default Node.js metrics
        this.client.collectDefaultMetrics({
          register: this.registry,
          prefix: 'act_nodejs_',
          gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        });
      } catch (error) {
        logger.warn('⚠️ Prometheus client not available, using mock implementation');
        this.initializeMockMetrics();
        return true;
      }

      // Initialize integration-specific metrics
      this.initializeIntegrationMetrics();

      // Initialize data flow pattern metrics
      this.initializeDataFlowMetrics();

      // Initialize business metrics
      this.initializeBusinessMetrics();

      // Initialize system health metrics
      this.initializeSystemHealthMetrics();

      // Start metrics collection loops
      this.startMetricsCollection();

      this.isInitialized = true;
      logger.info(
        `✅ Enhanced Metrics Collection initialized with ${this.metrics.size} metric types for ${Object.keys(monitoringConfig.integrations).length} integrations`
      );

      return true;
    } catch (error) {
      logger.error(
        '❌ Failed to initialize Enhanced Metrics Collection:',
        error.message
      );
      this.initializeMockMetrics();
      return false;
    }
  }

  /**
   * Initialize metrics for all 11 integrations
   */
  initializeIntegrationMetrics() {
    for (const [integrationKey, config] of Object.entries(
      monitoringConfig.integrations
    )) {
      const integrationMetrics = {};

      // Request metrics
      integrationMetrics.requestTotal = new this.client.Counter({
        name: `act_integration_requests_total`,
        help: `Total number of requests for ${config.name}`,
        labelNames: [
          'integration',
          'integration_type',
          'classification',
          'operation',
          'status',
        ],
        registers: [this.registry],
      });

      integrationMetrics.requestDuration = new this.client.Histogram({
        name: `act_integration_request_duration_seconds`,
        help: `Request duration for ${config.name}`,
        labelNames: ['integration', 'integration_type', 'classification', 'operation'],
        buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
        registers: [this.registry],
      });

      // Health check metrics
      integrationMetrics.healthStatus = new this.client.Gauge({
        name: `act_integration_health_status`,
        help: `Health status for ${config.name} (1=healthy, 0=unhealthy)`,
        labelNames: ['integration', 'integration_type', 'classification'],
        registers: [this.registry],
      });

      integrationMetrics.lastHealthCheck = new this.client.Gauge({
        name: `act_integration_last_health_check_timestamp`,
        help: `Timestamp of last health check for ${config.name}`,
        labelNames: ['integration', 'integration_type', 'classification'],
        registers: [this.registry],
      });

      // Connection metrics
      integrationMetrics.connectionStatus = new this.client.Gauge({
        name: `act_integration_connection_status`,
        help: `Connection status for ${config.name} (1=connected, 0=disconnected)`,
        labelNames: ['integration', 'integration_type', 'classification'],
        registers: [this.registry],
      });

      // Error metrics
      integrationMetrics.errorRate = new this.client.Gauge({
        name: `act_integration_error_rate`,
        help: `Error rate for ${config.name}`,
        labelNames: ['integration', 'integration_type', 'classification'],
        registers: [this.registry],
      });

      // Integration-specific metrics based on type
      if (config.type === 'external_api') {
        integrationMetrics.rateLimitUsage = new this.client.Gauge({
          name: `act_external_api_rate_limit_usage`,
          help: `Rate limit usage percentage for ${config.name}`,
          labelNames: ['integration', 'api_provider'],
          registers: [this.registry],
        });

        integrationMetrics.quotaUsage = new this.client.Gauge({
          name: `act_external_api_quota_usage`,
          help: `API quota usage for ${config.name}`,
          labelNames: ['integration', 'api_provider'],
          registers: [this.registry],
        });
      }

      if (config.type === 'database' || config.type === 'cache') {
        integrationMetrics.connectionPoolSize = new this.client.Gauge({
          name: `act_database_connection_pool_size`,
          help: `Connection pool size for ${config.name}`,
          labelNames: ['integration', 'database_type'],
          registers: [this.registry],
        });

        integrationMetrics.activeConnections = new this.client.Gauge({
          name: `act_database_active_connections`,
          help: `Active connections for ${config.name}`,
          labelNames: ['integration', 'database_type'],
          registers: [this.registry],
        });
      }

      if (config.type === 'cache') {
        integrationMetrics.cacheHitRate = new this.client.Gauge({
          name: `act_cache_hit_rate`,
          help: `Cache hit rate for ${config.name}`,
          labelNames: ['integration', 'cache_type'],
          registers: [this.registry],
        });

        integrationMetrics.cacheSize = new this.client.Gauge({
          name: `act_cache_size_bytes`,
          help: `Cache size in bytes for ${config.name}`,
          labelNames: ['integration', 'cache_type'],
          registers: [this.registry],
        });
      }

      // Store metrics for this integration
      this.metrics.set(integrationKey, integrationMetrics);

      // Initialize health tracking
      this.integrationHealth.set(integrationKey, {
        isHealthy: true,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
        lastError: null,
        responseTime: 0,
      });
    }
  }

  /**
   * Initialize metrics for data flow patterns
   */
  initializeDataFlowMetrics() {
    const dataFlowMetrics = {};

    // Pattern execution metrics
    dataFlowMetrics.patternExecutionTotal = new this.client.Counter({
      name: 'act_data_flow_pattern_executions_total',
      help: 'Total number of data flow pattern executions',
      labelNames: ['pattern', 'pattern_type', 'operation', 'status'],
      registers: [this.registry],
    });

    dataFlowMetrics.patternDuration = new this.client.Histogram({
      name: 'act_data_flow_pattern_duration_seconds',
      help: 'Duration of data flow pattern executions',
      labelNames: ['pattern', 'pattern_type', 'operation'],
      buckets: [0.01, 0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    // Data processing metrics
    dataFlowMetrics.dataRecordsProcessed = new this.client.Counter({
      name: 'act_data_records_processed_total',
      help: 'Total number of data records processed',
      labelNames: ['pattern', 'source', 'target', 'status'],
      registers: [this.registry],
    });

    dataFlowMetrics.dataVolumeBytes = new this.client.Counter({
      name: 'act_data_volume_bytes_total',
      help: 'Total volume of data processed in bytes',
      labelNames: ['pattern', 'direction', 'data_type'],
      registers: [this.registry],
    });

    // Aggregation metrics
    dataFlowMetrics.aggregationSources = new this.client.Histogram({
      name: 'act_data_aggregation_sources_count',
      help: 'Number of sources used in data aggregation',
      labelNames: ['pattern', 'aggregation_type'],
      buckets: [1, 2, 3, 4, 5, 7, 10, 15],
      registers: [this.registry],
    });

    dataFlowMetrics.dataQualityScore = new this.client.Histogram({
      name: 'act_data_quality_score',
      help: 'Data quality score for aggregated data',
      labelNames: ['pattern', 'metric_type'],
      buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.metrics.set('dataFlowPatterns', dataFlowMetrics);
  }

  /**
   * Initialize business metrics based on configuration
   */
  initializeBusinessMetrics() {
    const businessMetrics = {};

    for (const [metricKey, config] of Object.entries(
      monitoringConfig.businessMetrics
    )) {
      businessMetrics[metricKey] = new this.client.Gauge({
        name: `act_business_${metricKey.toLowerCase().replace(/([A-Z])/g, '_$1')}`,
        help: config.name,
        labelNames: ['metric_category', 'calculation_method'],
        registers: [this.registry],
      });
    }

    // Additional business KPIs
    businessMetrics.dailyActiveIntegrations = new this.client.Gauge({
      name: 'act_business_daily_active_integrations',
      help: 'Number of active integrations in the last 24 hours',
      labelNames: ['day'],
      registers: [this.registry],
    });

    businessMetrics.syncSuccess = new this.client.Histogram({
      name: 'act_business_sync_success_rate',
      help: 'Data synchronization success rate',
      labelNames: ['time_window'],
      buckets: [0.5, 0.7, 0.8, 0.9, 0.95, 0.98, 0.99, 0.999],
      registers: [this.registry],
    });

    businessMetrics.intelligenceRequestsDaily = new this.client.Counter({
      name: 'act_business_intelligence_requests_daily',
      help: 'Daily intelligence processing requests',
      labelNames: ['intelligence_type', 'source'],
      registers: [this.registry],
    });

    this.businessMetrics.set('primary', businessMetrics);
  }

  /**
   * Initialize system health metrics
   */
  initializeSystemHealthMetrics() {
    const systemMetrics = {};

    // Overall system health
    systemMetrics.systemHealthScore = new this.client.Gauge({
      name: 'act_system_health_score',
      help: 'Overall system health score (0-1)',
      labelNames: ['component'],
      registers: [this.registry],
    });

    // Integration availability
    systemMetrics.integrationAvailability = new this.client.Gauge({
      name: 'act_integration_availability',
      help: 'Integration availability percentage',
      labelNames: ['integration', 'time_window'],
      registers: [this.registry],
    });

    // Alert metrics
    systemMetrics.activeAlerts = new this.client.Gauge({
      name: 'act_active_alerts_count',
      help: 'Number of active alerts',
      labelNames: ['severity', 'component'],
      registers: [this.registry],
    });

    systemMetrics.alertProcessingTime = new this.client.Histogram({
      name: 'act_alert_processing_time_seconds',
      help: 'Time taken to process alerts',
      labelNames: ['alert_type', 'severity'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.metrics.set('system', systemMetrics);
  }

  /**
   * Record metrics for an integration operation
   */
  recordIntegrationMetric(
    integrationKey,
    operation,
    duration,
    success = true,
    additionalLabels = {}
  ) {
    const integrationConfig = monitoringConfig.integrations[integrationKey];
    if (!integrationConfig) {
      logger.warn(`Unknown integration for metrics: ${integrationKey}`);
      return;
    }

    const integrationMetrics = this.metrics.get(integrationKey);
    if (!integrationMetrics) {
      logger.warn(`No metrics initialized for integration: ${integrationKey}`);
      return;
    }

    const labels = {
      integration: integrationKey,
      integration_type: integrationConfig.type,
      classification: integrationConfig.classification,
      operation,
      ...additionalLabels,
    };

    // Record request
    integrationMetrics.requestTotal.inc({
      ...labels,
      status: success ? 'success' : 'error',
    });

    // Record duration
    integrationMetrics.requestDuration.observe(labels, duration / 1000);

    // Update health status
    const health = this.integrationHealth.get(integrationKey);
    if (health) {
      if (success) {
        health.consecutiveFailures = 0;
        health.isHealthy = true;
      } else {
        health.consecutiveFailures++;
        health.isHealthy = health.consecutiveFailures < 3;
      }
      health.lastCheck = Date.now();
      health.responseTime = duration;

      // Update health metrics
      integrationMetrics.healthStatus.set(labels, health.isHealthy ? 1 : 0);
      integrationMetrics.lastHealthCheck.set(labels, health.lastCheck);
    }
  }

  /**
   * Record data flow pattern metrics
   */
  recordDataFlowMetric(
    patternKey,
    operation,
    duration,
    dataSize = 0,
    sourcesCount = 1,
    success = true
  ) {
    const pattern = monitoringConfig.dataFlowPatterns[patternKey];
    if (!pattern) {
      logger.warn(`Unknown data flow pattern for metrics: ${patternKey}`);
      return;
    }

    const dataFlowMetrics = this.metrics.get('dataFlowPatterns');
    if (!dataFlowMetrics) return;

    const labels = {
      pattern: patternKey,
      pattern_type: pattern.name,
      operation,
    };

    // Record execution
    dataFlowMetrics.patternExecutionTotal.inc({
      ...labels,
      status: success ? 'success' : 'error',
    });

    // Record duration
    dataFlowMetrics.patternDuration.observe(labels, duration / 1000);

    // Record data volume
    if (dataSize > 0) {
      dataFlowMetrics.dataVolumeBytes.inc(
        {
          pattern: patternKey,
          direction: 'processed',
          data_type: 'json',
        },
        dataSize
      );
    }

    // Record aggregation sources if applicable
    if (patternKey === 'multiSourceAggregation') {
      dataFlowMetrics.aggregationSources.observe(
        {
          pattern: patternKey,
          aggregation_type: 'real_time',
        },
        sourcesCount
      );
    }
  }

  /**
   * Update business metrics
   */
  updateBusinessMetrics() {
    const businessMetrics = this.businessMetrics.get('primary');
    if (!businessMetrics) return;

    try {
      // Data freshness score calculation
      let freshnessTotalScore = 0;
      let activeIntegrations = 0;

      for (const [integrationKey, health] of this.integrationHealth.entries()) {
        if (health.lastCheck > Date.now() - 300000) {
          // Active in last 5 minutes
          activeIntegrations++;
          const staleness = Date.now() - health.lastCheck;
          const freshnessScore = Math.max(0, 1 - staleness / 3600000); // 1 hour max staleness
          freshnessTotalScore += freshnessScore;
        }
      }

      if (activeIntegrations > 0) {
        businessMetrics.dataFreshness.set(
          {
            metric_category: 'data_quality',
            calculation_method: 'weighted_average',
          },
          freshnessTotalScore / activeIntegrations
        );
      }

      // System reliability score
      const healthyIntegrations = Array.from(this.integrationHealth.values()).filter(
        health => health.isHealthy
      ).length;
      const totalIntegrations = this.integrationHealth.size;

      if (totalIntegrations > 0) {
        businessMetrics.systemReliability.set(
          {
            metric_category: 'system_health',
            calculation_method: 'uptime_percentage',
          },
          healthyIntegrations / totalIntegrations
        );
      }

      // Daily active integrations
      businessMetrics.dailyActiveIntegrations.set(
        {
          day: new Date().toISOString().split('T')[0],
        },
        activeIntegrations
      );
    } catch (error) {
      logger.error('Failed to update business metrics:', error);
    }
  }

  /**
   * Start metrics collection loops
   */
  startMetricsCollection() {
    // Update business metrics every 60 seconds
    setInterval(() => {
      this.updateBusinessMetrics();
    }, 60000);

    // Health check metrics update every 30 seconds
    setInterval(() => {
      this.updateHealthMetrics();
    }, 30000);

    logger.info('📈 Started metrics collection loops');
  }

  /**
   * Update health metrics for all integrations
   */
  updateHealthMetrics() {
    const systemMetrics = this.metrics.get('system');
    if (!systemMetrics) return;

    try {
      // Calculate overall system health score
      let totalHealthScore = 0;
      let integrationCount = 0;

      for (const [integrationKey, health] of this.integrationHealth.entries()) {
        const config = monitoringConfig.integrations[integrationKey];
        if (!config) continue;

        integrationCount++;
        const healthScore = health.isHealthy ? 1 : 0;
        totalHealthScore += healthScore;

        // Update individual integration availability
        systemMetrics.integrationAvailability.set(
          {
            integration: integrationKey,
            time_window: '5m',
          },
          healthScore * 100
        );
      }

      if (integrationCount > 0) {
        systemMetrics.systemHealthScore.set(
          {
            component: 'integrations',
          },
          totalHealthScore / integrationCount
        );
      }
    } catch (error) {
      logger.error('Failed to update health metrics:', error);
    }
  }

  /**
   * Get Prometheus metrics output
   */
  async getMetrics() {
    if (!this.registry) {
      return this.getMockMetrics();
    }

    try {
      return await this.registry.metrics();
    } catch (error) {
      logger.error('Failed to get metrics:', error);
      return '# Error retrieving metrics\n';
    }
  }

  /**
   * Get integration health summary
   */
  getIntegrationHealthSummary() {
    const healthSummary = {
      overall: {
        healthy: 0,
        unhealthy: 0,
        total: this.integrationHealth.size,
        status: 'healthy',
      },
      integrations: [],
    };

    for (const [integrationKey, health] of this.integrationHealth.entries()) {
      const config = monitoringConfig.integrations[integrationKey];
      const integrationHealth = {
        key: integrationKey,
        name: config?.name || integrationKey,
        type: config?.type || 'unknown',
        classification: config?.classification || 'unknown',
        isHealthy: health.isHealthy,
        lastCheck: health.lastCheck,
        consecutiveFailures: health.consecutiveFailures,
        responseTime: health.responseTime,
        lastError: health.lastError,
      };

      healthSummary.integrations.push(integrationHealth);

      if (health.isHealthy) {
        healthSummary.overall.healthy++;
      } else {
        healthSummary.overall.unhealthy++;
      }
    }

    // Determine overall status
    const healthyPercentage =
      healthSummary.overall.healthy / healthSummary.overall.total;
    if (healthyPercentage >= 0.9) {
      healthSummary.overall.status = 'healthy';
    } else if (healthyPercentage >= 0.5) {
      healthSummary.overall.status = 'degraded';
    } else {
      healthSummary.overall.status = 'unhealthy';
    }

    return healthSummary;
  }

  /**
   * Initialize mock metrics when Prometheus is not available
   */
  initializeMockMetrics() {
    logger.info('🔧 Initializing mock metrics service...');

    // Create mock metrics structure
    this.registry = {
      metrics: async () => {
        const timestamp = Date.now();
        const mockMetrics = [];

        // Generate mock metrics for each integration
        for (const [integrationKey, config] of Object.entries(
          monitoringConfig.integrations
        )) {
          mockMetrics.push(
            `# HELP act_integration_requests_total Total requests for ${config.name}`,
            `# TYPE act_integration_requests_total counter`,
            `act_integration_requests_total{integration="${integrationKey}",type="${config.type}",status="success"} ${Math.floor(Math.random() * 1000)}`,
            '',
            `# HELP act_integration_health_status Health status for ${config.name}`,
            `# TYPE act_integration_health_status gauge`,
            `act_integration_health_status{integration="${integrationKey}",type="${config.type}"} ${Math.random() > 0.1 ? 1 : 0}`,
            ''
          );
        }

        mockMetrics.push(
          `# HELP act_system_health_score Overall system health score`,
          `# TYPE act_system_health_score gauge`,
          `act_system_health_score{component="integrations"} ${0.8 + Math.random() * 0.2}`,
          ''
        );

        return mockMetrics.join('\n');
      },
    };

    // Initialize health tracking for mock mode
    for (const integrationKey of Object.keys(monitoringConfig.integrations)) {
      this.integrationHealth.set(integrationKey, {
        isHealthy: Math.random() > 0.1,
        lastCheck: Date.now(),
        consecutiveFailures: Math.floor(Math.random() * 3),
        lastError: null,
        responseTime: Math.floor(Math.random() * 2000),
      });
    }

    this.isInitialized = true;
    logger.info('✅ Mock metrics service initialized');
  }

  /**
   * Get mock metrics output
   */
  getMockMetrics() {
    const timestamp = Date.now();
    let metrics = `# Mock ACT Platform Metrics - Generated at ${new Date(timestamp).toISOString()}\n\n`;

    // System health
    metrics += `# HELP act_system_health_score Overall system health\n`;
    metrics += `# TYPE act_system_health_score gauge\n`;
    metrics += `act_system_health_score{component="integrations"} ${0.85 + Math.random() * 0.1}\n\n`;

    // Integration metrics
    for (const [integrationKey, config] of Object.entries(
      monitoringConfig.integrations
    )) {
      const requestCount = Math.floor(Math.random() * 10000);
      const errorRate = Math.random() * 0.05;
      const responseTime = Math.random() * 2;

      metrics += `act_integration_requests_total{integration="${integrationKey}",type="${config.type}",status="success"} ${Math.floor(requestCount * (1 - errorRate))}\n`;
      metrics += `act_integration_requests_total{integration="${integrationKey}",type="${config.type}",status="error"} ${Math.floor(requestCount * errorRate)}\n`;
      metrics += `act_integration_response_time_seconds{integration="${integrationKey}",type="${config.type}"} ${responseTime.toFixed(3)}\n`;
      metrics += `act_integration_health_status{integration="${integrationKey}",type="${config.type}"} ${Math.random() > 0.1 ? 1 : 0}\n`;
    }

    return metrics;
  }

  /**
   * Get enhanced status including all integration metrics
   */
  getEnhancedStatus() {
    return {
      initialized: this.isInitialized,
      metrics_count: this.metrics.size,
      integrations_monitored: this.integrationHealth.size,
      health_summary: this.getIntegrationHealthSummary(),
      business_metrics: Array.from(this.businessMetrics.keys()),
      prometheus_available: !!this.client,
      default_labels: this.defaultLabels,
    };
  }

  /**
   * Close the metrics service
   */
  async close() {
    logger.info('🔄 Closing enhanced metrics service...');

    this.metrics.clear();
    this.integrationHealth.clear();
    this.businessMetrics.clear();

    if (this.registry && this.client) {
      this.registry.clear();
    }

    this.isInitialized = false;
    logger.info('✅ Enhanced metrics service closed');
  }
}

// Create singleton instance
const enhancedMetricsService = new EnhancedMetricsService();

export default enhancedMetricsService;

// Export utility functions
export const recordIntegrationMetric = (
  integration,
  operation,
  duration,
  success,
  labels
) =>
  enhancedMetricsService.recordIntegrationMetric(
    integration,
    operation,
    duration,
    success,
    labels
  );

export const recordDataFlowMetric = (
  pattern,
  operation,
  duration,
  dataSize,
  sourcesCount,
  success
) =>
  enhancedMetricsService.recordDataFlowMetric(
    pattern,
    operation,
    duration,
    dataSize,
    sourcesCount,
    success
  );

export const getMetrics = () => enhancedMetricsService.getMetrics();

export const getIntegrationHealthSummary = () =>
  enhancedMetricsService.getIntegrationHealthSummary();

export const getEnhancedStatus = () => enhancedMetricsService.getEnhancedStatus();
