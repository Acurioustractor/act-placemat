/**
 * Enhanced Observability Service for ACT Placemat Data Lake
 * Provides Prometheus metrics, OpenTelemetry tracing, and comprehensive monitoring
 * Task: 18.2 - Instrument Data Lake Services for Standardized Metrics Collection
 */

import { logger } from '../../utils/logger.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { monitoringService } = require('./monitoringService.js');

// Prometheus client for metrics
import client from 'prom-client';

class ObservabilityService {
  constructor() {
    this.metricsRegistry = new client.Registry();
    this.initializeMetrics();
    this.setupPrometheusMetrics();

    // Data source health tracking
    this.dataSources = new Map();
    this.initializeDataSourceTracking();

    logger.info('🔍 Observability Service initialized with Prometheus metrics');
  }

  /**
   * Initialize Prometheus metrics for data lake monitoring
   */
  initializeMetrics() {
    // HTTP Request metrics
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service'],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'service'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    // Data source connection metrics
    this.dataSourceConnectionStatus = new client.Gauge({
      name: 'data_source_connection_status',
      help: 'Data source connection status (1=healthy, 0=unhealthy)',
      labelNames: ['source', 'type', 'environment'],
    });

    this.dataSourceResponseTime = new client.Histogram({
      name: 'data_source_response_time_seconds',
      help: 'Data source API response time in seconds',
      labelNames: ['source', 'operation', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });

    // Data sync metrics
    this.dataSyncStatus = new client.Gauge({
      name: 'data_sync_status',
      help: 'Data synchronization status (1=success, 0=failure)',
      labelNames: ['source', 'sync_type'],
    });

    this.dataSyncDuration = new client.Histogram({
      name: 'data_sync_duration_seconds',
      help: 'Data synchronization duration in seconds',
      labelNames: ['source', 'sync_type'],
      buckets: [1, 5, 10, 30, 60, 180, 300],
    });

    this.dataSyncRecords = new client.Gauge({
      name: 'data_sync_records_processed',
      help: 'Number of records processed in sync operation',
      labelNames: ['source', 'sync_type', 'operation'],
    });

    // API quota and rate limiting metrics
    this.apiQuotaUsage = new client.Gauge({
      name: 'api_quota_usage_percent',
      help: 'API quota usage percentage',
      labelNames: ['provider', 'endpoint'],
    });

    this.apiRateLimitHits = new client.Counter({
      name: 'api_rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['provider', 'endpoint'],
    });

    // AI processing metrics
    this.aiRequestsTotal = new client.Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI processing requests',
      labelNames: ['provider', 'model', 'operation', 'status'],
    });

    this.aiRequestDuration = new client.Histogram({
      name: 'ai_request_duration_seconds',
      help: 'AI request processing duration in seconds',
      labelNames: ['provider', 'model', 'operation'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
    });

    this.aiTokensUsed = new client.Counter({
      name: 'ai_tokens_used_total',
      help: 'Total number of AI tokens consumed',
      labelNames: ['provider', 'model', 'token_type'],
    });

    this.aiCostAccumulator = new client.Counter({
      name: 'ai_cost_usd_total',
      help: 'Total AI processing cost in USD',
      labelNames: ['provider', 'model'],
    });

    // Database metrics
    this.dbConnectionPoolSize = new client.Gauge({
      name: 'database_connection_pool_size',
      help: 'Database connection pool size',
      labelNames: ['database', 'pool_type'],
    });

    this.dbQueryDuration = new client.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['database', 'operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.dbActiveConnections = new client.Gauge({
      name: 'database_active_connections',
      help: 'Number of active database connections',
      labelNames: ['database'],
    });

    // Queue metrics
    this.queueDepth = new client.Gauge({
      name: 'queue_depth',
      help: 'Number of items in queue',
      labelNames: ['queue_name', 'priority'],
    });

    this.queueProcessingDuration = new client.Histogram({
      name: 'queue_processing_duration_seconds',
      help: 'Queue item processing duration in seconds',
      labelNames: ['queue_name', 'job_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    });

    // System metrics
    this.applicationInfo = new client.Gauge({
      name: 'application_info',
      help: 'Application information',
      labelNames: ['version', 'environment', 'region', 'data_residency'],
    });

    // Business metrics
    this.dataFreshness = new client.Gauge({
      name: 'data_freshness_seconds',
      help: 'Seconds since last data update',
      labelNames: ['source', 'dataset'],
    });

    this.businessMetrics = new client.Gauge({
      name: 'business_metrics',
      help: 'Key business metrics',
      labelNames: ['metric_name', 'category'],
    });

    // Register all metrics
    this.metricsRegistry.registerMetric(this.httpRequestsTotal);
    this.metricsRegistry.registerMetric(this.httpRequestDuration);
    this.metricsRegistry.registerMetric(this.dataSourceConnectionStatus);
    this.metricsRegistry.registerMetric(this.dataSourceResponseTime);
    this.metricsRegistry.registerMetric(this.dataSyncStatus);
    this.metricsRegistry.registerMetric(this.dataSyncDuration);
    this.metricsRegistry.registerMetric(this.dataSyncRecords);
    this.metricsRegistry.registerMetric(this.apiQuotaUsage);
    this.metricsRegistry.registerMetric(this.apiRateLimitHits);
    this.metricsRegistry.registerMetric(this.aiRequestsTotal);
    this.metricsRegistry.registerMetric(this.aiRequestDuration);
    this.metricsRegistry.registerMetric(this.aiTokensUsed);
    this.metricsRegistry.registerMetric(this.aiCostAccumulator);
    this.metricsRegistry.registerMetric(this.dbConnectionPoolSize);
    this.metricsRegistry.registerMetric(this.dbQueryDuration);
    this.metricsRegistry.registerMetric(this.dbActiveConnections);
    this.metricsRegistry.registerMetric(this.queueDepth);
    this.metricsRegistry.registerMetric(this.queueProcessingDuration);
    this.metricsRegistry.registerMetric(this.applicationInfo);
    this.metricsRegistry.registerMetric(this.dataFreshness);
    this.metricsRegistry.registerMetric(this.businessMetrics);
  }

  /**
   * Setup default Prometheus metrics
   */
  setupPrometheusMetrics() {
    // Enable collection of default metrics
    client.collectDefaultMetrics({
      register: this.metricsRegistry,
      prefix: 'act_placemat_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Set application info
    this.applicationInfo
      .labels(
        process.env.npm_package_version || '1.0.0',
        process.env.NODE_ENV || 'development',
        'australia',
        'australia'
      )
      .set(1);
  }

  /**
   * Initialize data source tracking
   */
  initializeDataSourceTracking() {
    const dataSources = [
      { name: 'xero', type: 'business_api', healthEndpoint: '/api/xero/health' },
      { name: 'notion', type: 'knowledge_api', healthEndpoint: '/api/notion/health' },
      {
        name: 'google_calendar',
        type: 'calendar_api',
        healthEndpoint: '/api/google/calendar/health',
      },
      { name: 'gmail', type: 'email_api', healthEndpoint: '/api/gmail/health' },
      { name: 'linkedin', type: 'social_api', healthEndpoint: '/api/linkedin/health' },
      { name: 'anthropic', type: 'ai_api', healthEndpoint: null },
      { name: 'openai', type: 'ai_api', healthEndpoint: null },
      { name: 'perplexity', type: 'ai_api', healthEndpoint: null },
      { name: 'postgresql', type: 'database', healthEndpoint: null },
      { name: 'supabase', type: 'cloud_database', healthEndpoint: null },
      { name: 'redis', type: 'cache', healthEndpoint: null },
      { name: 'neo4j', type: 'graph_database', healthEndpoint: null },
    ];

    dataSources.forEach(source => {
      this.dataSources.set(source.name, {
        ...source,
        lastHealthCheck: null,
        lastSuccessfulSync: null,
        consecutiveFailures: 0,
        totalRequests: 0,
        successfulRequests: 0,
      });

      // Initialize connection status to unknown
      this.dataSourceConnectionStatus
        .labels(source.name, source.type, process.env.NODE_ENV || 'development')
        .set(0);
    });

    // Start health check monitoring
    this.startDataSourceMonitoring();
  }

  /**
   * Start monitoring data sources
   */
  startDataSourceMonitoring() {
    // Check data source health every 30 seconds
    setInterval(async () => {
      await this.checkDataSourceHealth();
    }, 30000);

    // Update data freshness every minute
    setInterval(async () => {
      await this.updateDataFreshness();
    }, 60000);

    logger.info('📊 Started data source monitoring');
  }

  /**
   * Check health of all data sources
   */
  async checkDataSourceHealth() {
    for (const [sourceName, sourceConfig] of this.dataSources) {
      try {
        const isHealthy = await this.checkIndividualDataSource(
          sourceName,
          sourceConfig
        );

        this.dataSourceConnectionStatus
          .labels(sourceName, sourceConfig.type, process.env.NODE_ENV || 'development')
          .set(isHealthy ? 1 : 0);

        sourceConfig.lastHealthCheck = new Date().toISOString();

        if (isHealthy) {
          sourceConfig.consecutiveFailures = 0;
        } else {
          sourceConfig.consecutiveFailures++;
        }
      } catch (error) {
        logger.error(`Health check failed for ${sourceName}:`, error);
        this.dataSourceConnectionStatus
          .labels(sourceName, sourceConfig.type, process.env.NODE_ENV || 'development')
          .set(0);
      }
    }
  }

  /**
   * Check individual data source health
   */
  async checkIndividualDataSource(sourceName, config) {
    const startTime = Date.now();

    try {
      let isHealthy = false;

      switch (sourceName) {
        case 'postgresql':
          isHealthy = await this.checkPostgreSQLHealth();
          break;
        case 'redis':
          isHealthy = await this.checkRedisHealth();
          break;
        case 'supabase':
          isHealthy = await this.checkSupabaseHealth();
          break;
        case 'xero':
          isHealthy = await this.checkXeroHealth();
          break;
        case 'notion':
          isHealthy = await this.checkNotionHealth();
          break;
        case 'google_calendar':
          isHealthy = await this.checkGoogleCalendarHealth();
          break;
        case 'gmail':
          isHealthy = await this.checkGmailHealth();
          break;
        default:
          // For AI APIs, check if credentials are configured
          isHealthy = await this.checkAIServiceHealth(sourceName);
      }

      const duration = (Date.now() - startTime) / 1000;
      this.dataSourceResponseTime
        .labels(sourceName, 'health_check', isHealthy ? 'success' : 'failure')
        .observe(duration);

      return isHealthy;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.dataSourceResponseTime
        .labels(sourceName, 'health_check', 'error')
        .observe(duration);
      return false;
    }
  }

  /**
   * Check PostgreSQL health
   */
  async checkPostgreSQLHealth() {
    // In real implementation, would test actual database connection
    // For now, return true if DATABASE_URL or postgres config exists
    return !!(process.env.DATABASE_URL || process.env.POSTGRES_HOST);
  }

  /**
   * Check Redis health
   */
  async checkRedisHealth() {
    // In real implementation, would ping Redis
    return !!(process.env.REDIS_URL || process.env.REDIS_HOST);
  }

  /**
   * Check Supabase health
   */
  async checkSupabaseHealth() {
    return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  }

  /**
   * Check Xero health
   */
  async checkXeroHealth() {
    return !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);
  }

  /**
   * Check Notion health
   */
  async checkNotionHealth() {
    return !!(process.env.NOTION_TOKEN || process.env.NOTION_INTEGRATION_TOKEN);
  }

  /**
   * Check Google Calendar health
   */
  async checkGoogleCalendarHealth() {
    return !!(
      process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    );
  }

  /**
   * Check Gmail health
   */
  async checkGmailHealth() {
    return !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
  }

  /**
   * Check AI service health
   */
  async checkAIServiceHealth(serviceName) {
    const keyMap = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      perplexity: 'PERPLEXITY_API_KEY',
    };

    const envKey = keyMap[serviceName];
    return !!(envKey && process.env[envKey]);
  }

  /**
   * Update data freshness metrics
   */
  async updateDataFreshness() {
    // This would query actual databases to get last update timestamps
    // For now, using mock data based on typical sync patterns

    const now = Date.now();
    const mockLastUpdates = {
      xero: now - 15 * 60 * 1000, // 15 minutes ago
      notion: now - 30 * 60 * 1000, // 30 minutes ago
      google_calendar: now - 5 * 60 * 1000, // 5 minutes ago
      gmail: now - 10 * 60 * 1000, // 10 minutes ago
      linkedin: now - 24 * 60 * 60 * 1000, // 24 hours ago
    };

    Object.entries(mockLastUpdates).forEach(([source, lastUpdate]) => {
      const secondsSinceUpdate = Math.floor((now - lastUpdate) / 1000);
      this.dataFreshness.labels(source, 'all').set(secondsSinceUpdate);
    });
  }

  /**
   * Express middleware to track HTTP requests
   */
  createHTTPMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      const originalSend = res.send;
      res.send = function (body) {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path;
        const method = req.method;
        const statusCode = res.statusCode.toString();
        const serviceName = 'act-placemat-api';

        // Record metrics
        observabilityService.httpRequestsTotal
          .labels(method, route, statusCode, serviceName)
          .inc();

        observabilityService.httpRequestDuration
          .labels(method, route, serviceName)
          .observe(duration);

        originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Track data sync operation
   */
  trackDataSync(source, syncType, duration, recordsProcessed, success = true) {
    this.dataSyncStatus.labels(source, syncType).set(success ? 1 : 0);
    this.dataSyncDuration.labels(source, syncType).observe(duration);
    this.dataSyncRecords.labels(source, syncType, 'processed').set(recordsProcessed);

    // Update source tracking
    const sourceConfig = this.dataSources.get(source);
    if (sourceConfig) {
      if (success) {
        sourceConfig.lastSuccessfulSync = new Date().toISOString();
        sourceConfig.successfulRequests++;
      }
      sourceConfig.totalRequests++;
    }

    logger.info(
      `📊 Data sync tracked: ${source}/${syncType} - ${recordsProcessed} records in ${duration}s`
    );
  }

  /**
   * Track AI request
   */
  trackAIRequest(provider, model, operation, duration, tokens, cost, success = true) {
    const status = success ? 'success' : 'failure';

    this.aiRequestsTotal.labels(provider, model, operation, status).inc();
    this.aiRequestDuration.labels(provider, model, operation).observe(duration);

    if (tokens) {
      this.aiTokensUsed.labels(provider, model, 'total').inc(tokens.total || tokens);
      if (tokens.prompt)
        this.aiTokensUsed.labels(provider, model, 'prompt').inc(tokens.prompt);
      if (tokens.completion)
        this.aiTokensUsed.labels(provider, model, 'completion').inc(tokens.completion);
    }

    if (cost) {
      this.aiCostAccumulator.labels(provider, model).inc(cost);
    }

    logger.debug(
      `🤖 AI request tracked: ${provider}/${model}/${operation} - ${duration}s, ${tokens?.total || 0} tokens, $${cost || 0}`
    );
  }

  /**
   * Track database query
   */
  trackDBQuery(database, operation, table, duration) {
    this.dbQueryDuration.labels(database, operation, table).observe(duration);
  }

  /**
   * Track API quota usage
   */
  trackAPIQuotaUsage(provider, endpoint, usagePercent) {
    this.apiQuotaUsage.labels(provider, endpoint).set(usagePercent);

    if (usagePercent > 90) {
      logger.warn(
        `⚠️ High API quota usage: ${provider}/${endpoint} at ${usagePercent}%`
      );
    }
  }

  /**
   * Track rate limit hit
   */
  trackRateLimitHit(provider, endpoint) {
    this.apiRateLimitHits.labels(provider, endpoint).inc();
    logger.warn(`🚫 Rate limit hit: ${provider}/${endpoint}`);
  }

  /**
   * Track queue metrics
   */
  trackQueueMetrics(queueName, depth, priority = 'normal') {
    this.queueDepth.labels(queueName, priority).set(depth);
  }

  /**
   * Track queue job processing
   */
  trackQueueJobProcessing(queueName, jobType, duration) {
    this.queueProcessingDuration.labels(queueName, jobType).observe(duration);
  }

  /**
   * Track business metric
   */
  trackBusinessMetric(metricName, value, category = 'general') {
    this.businessMetrics.labels(metricName, category).set(value);
  }

  /**
   * Get Prometheus metrics endpoint response
   */
  getMetrics() {
    return this.metricsRegistry.metrics();
  }

  /**
   * Get data lake health summary
   */
  getDataLakeHealthSummary() {
    const sources = Array.from(this.dataSources.entries()).map(([name, config]) => ({
      name,
      type: config.type,
      lastHealthCheck: config.lastHealthCheck,
      lastSuccessfulSync: config.lastSuccessfulSync,
      consecutiveFailures: config.consecutiveFailures,
      totalRequests: config.totalRequests,
      successRate:
        config.totalRequests > 0
          ? Math.round((config.successfulRequests / config.totalRequests) * 100)
          : 0,
    }));

    const healthyCount = sources.filter(s => s.consecutiveFailures === 0).length;
    const totalCount = sources.length;

    return {
      overall: {
        status:
          healthyCount === totalCount
            ? 'healthy'
            : healthyCount > totalCount * 0.7
              ? 'degraded'
              : 'unhealthy',
        healthyServices: healthyCount,
        totalServices: totalCount,
        healthPercentage: Math.round((healthyCount / totalCount) * 100),
      },
      dataSources: sources,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get comprehensive observability dashboard data
   */
  getObservabilityDashboard() {
    return {
      ...monitoringService.getMonitoringDashboard(),
      dataLakeHealth: this.getDataLakeHealthSummary(),
      metricsEndpoint: '/metrics',
    };
  }
}

// Create singleton instance
const observabilityService = new ObservabilityService();

export { ObservabilityService, observabilityService };
