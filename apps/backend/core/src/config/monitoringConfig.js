/**
 * Enhanced Monitoring Configuration for ACT Platform Data Flows
 * Comprehensive coverage of all 11 integrations identified in Task 16.3
 * Task: 16.4 - Establish Monitoring and Observability for Data Flows
 */

export const INTEGRATION_MONITORING_CONFIG = {
  // Core Data Sources (3)
  postgres: {
    name: 'PostgreSQL (Supabase)',
    type: 'database',
    classification: 'restricted',
    healthCheckInterval: 30000,
    metrics: {
      connectionPool: true,
      queryPerformance: true,
      replicationLag: true,
      encryptionStatus: true,
    },
    alerts: {
      connectionFailure: { threshold: 3, window: '5m' },
      highLatency: { threshold: 1000, window: '1m' },
      encryptionError: { threshold: 1, window: '1m' },
    },
    traces: {
      operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      samplingRate: 0.1,
    },
  },

  redis: {
    name: 'Redis Cache',
    type: 'cache',
    classification: 'internal',
    healthCheckInterval: 15000,
    metrics: {
      hitRate: true,
      memoryUsage: true,
      connectionCount: true,
      keyspaceStats: true,
    },
    alerts: {
      lowHitRate: { threshold: 0.7, window: '5m' },
      highMemoryUsage: { threshold: 0.9, window: '2m' },
      connectionFailure: { threshold: 1, window: '1m' },
    },
    traces: {
      operations: ['GET', 'SET', 'DEL', 'EXPIRE'],
      samplingRate: 0.05,
    },
  },

  neo4j: {
    name: 'Neo4j Graph Database',
    type: 'graph_database',
    classification: 'confidential',
    healthCheckInterval: 45000,
    metrics: {
      nodeCount: true,
      relationshipCount: true,
      queryPerformance: true,
      memoryUsage: true,
    },
    alerts: {
      connectionFailure: { threshold: 2, window: '3m' },
      slowQueries: { threshold: 5000, window: '5m' },
      highMemoryUsage: { threshold: 0.85, window: '3m' },
    },
    traces: {
      operations: ['MATCH', 'CREATE', 'MERGE', 'DELETE'],
      samplingRate: 0.2,
    },
  },

  // External API Integrations (4)
  gmail: {
    name: 'Gmail API',
    type: 'external_api',
    classification: 'confidential',
    healthCheckInterval: 60000,
    rateLimit: { requests: 5, window: '1s' },
    metrics: {
      requestRate: true,
      responseTime: true,
      errorRate: true,
      quotaUsage: true,
    },
    alerts: {
      rateLimitExceeded: { threshold: 1, window: '1m' },
      highErrorRate: { threshold: 0.05, window: '5m' },
      quotaExhausted: { threshold: 0.9, window: '1h' },
    },
    traces: {
      operations: ['list_messages', 'get_message', 'send_message'],
      samplingRate: 0.3,
    },
  },

  linkedin: {
    name: 'LinkedIn API',
    type: 'external_api',
    classification: 'confidential',
    healthCheckInterval: 90000,
    rateLimit: { requests: 2, window: '1s' },
    metrics: {
      requestRate: true,
      responseTime: true,
      errorRate: true,
      profileAnalysisTime: true,
    },
    alerts: {
      rateLimitExceeded: { threshold: 1, window: '1m' },
      authFailure: { threshold: 1, window: '5m' },
      analysisTimeout: { threshold: 3000, window: '1m' },
    },
    traces: {
      operations: ['get_profile', 'analyze_connections', 'relationship_mapping'],
      samplingRate: 0.5,
    },
  },

  notion: {
    name: 'Notion API',
    type: 'external_api',
    classification: 'internal',
    healthCheckInterval: 45000,
    rateLimit: { requests: 3, window: '1s' },
    metrics: {
      requestRate: true,
      responseTime: true,
      syncLatency: true,
      contentChanges: true,
    },
    alerts: {
      syncFailure: { threshold: 2, window: '10m' },
      highLatency: { threshold: 2000, window: '5m' },
      contentCorruption: { threshold: 1, window: '1m' },
    },
    traces: {
      operations: ['query_database', 'update_page', 'create_page', 'sync_content'],
      samplingRate: 0.3,
    },
  },

  xero: {
    name: 'Xero API',
    type: 'external_api',
    classification: 'restricted',
    healthCheckInterval: 120000,
    rateLimit: { requests: 1, window: '1s' },
    metrics: {
      requestRate: true,
      responseTime: true,
      transactionVolume: true,
      reconciliationAccuracy: true,
    },
    alerts: {
      authTokenExpiry: { threshold: 1, window: '1h' },
      financialDataInconsistency: { threshold: 1, window: '5m' },
      reconciliationError: { threshold: 1, window: '1m' },
    },
    traces: {
      operations: [
        'get_transactions',
        'get_invoices',
        'get_contacts',
        'financial_sync',
      ],
      samplingRate: 0.8,
    },
  },

  // Internal Services (4)
  mlPipeline: {
    name: 'ML Pipeline Service',
    type: 'internal_service',
    classification: 'confidential',
    healthCheckInterval: 30000,
    metrics: {
      modelAccuracy: true,
      predictionLatency: true,
      featureExtractionTime: true,
      batchProcessingRate: true,
    },
    alerts: {
      modelDrift: { threshold: 0.05, window: '1h' },
      predictionTimeout: { threshold: 10000, window: '5m' },
      batchProcessingFailure: { threshold: 2, window: '10m' },
    },
    traces: {
      operations: ['train_model', 'predict', 'feature_extraction', 'batch_process'],
      samplingRate: 0.2,
    },
  },

  compliance: {
    name: 'Compliance Service',
    type: 'internal_service',
    classification: 'restricted',
    healthCheckInterval: 60000,
    metrics: {
      auditTrailCompleteness: true,
      encryptionCompliance: true,
      accessControlViolations: true,
      dataRetentionCompliance: true,
    },
    alerts: {
      complianceViolation: { threshold: 1, window: '1m' },
      auditLogGap: { threshold: 1, window: '5m' },
      encryptionFailure: { threshold: 1, window: '1m' },
    },
    traces: {
      operations: [
        'audit_log',
        'compliance_check',
        'data_classification',
        'retention_policy',
      ],
      samplingRate: 1.0, // Full tracing for compliance
    },
  },

  observability: {
    name: 'Observability Service',
    type: 'internal_service',
    classification: 'internal',
    healthCheckInterval: 15000,
    metrics: {
      metricsCollectionRate: true,
      alertProcessingTime: true,
      dashboardLoadTime: true,
      traceIngestionRate: true,
    },
    alerts: {
      metricsCollectionFailure: { threshold: 1, window: '2m' },
      alertProcessingDelay: { threshold: 5000, window: '1m' },
      traceIngestionBacklog: { threshold: 1000, window: '5m' },
    },
    traces: {
      operations: [
        'collect_metrics',
        'process_alerts',
        'generate_dashboard',
        'ingest_traces',
      ],
      samplingRate: 0.1,
    },
  },

  encryption: {
    name: 'Encryption Service',
    type: 'internal_service',
    classification: 'restricted',
    healthCheckInterval: 30000,
    metrics: {
      encryptionOperationsPerSecond: true,
      decryptionOperationsPerSecond: true,
      keyRotationStatus: true,
      encryptionLatency: true,
    },
    alerts: {
      encryptionFailure: { threshold: 1, window: '1m' },
      keyRotationOverdue: { threshold: 1, window: '1d' },
      highEncryptionLatency: { threshold: 500, window: '5m' },
    },
    traces: {
      operations: [
        'encrypt_data',
        'decrypt_data',
        'rotate_keys',
        'validate_encryption',
      ],
      samplingRate: 0.1, // Low sampling due to high volume
    },
  },
};

// Data Flow Patterns Monitoring Configuration
export const DATA_FLOW_PATTERNS = {
  directDatabaseAccess: {
    name: 'Direct Database Access',
    endpoints: ['privacy.js', 'security.js'],
    metrics: {
      queryExecutionTime: true,
      connectionPoolUsage: true,
      transactionRollbacks: true,
    },
    traces: {
      spanName: 'db.direct_access',
      attributes: ['db.operation', 'db.table', 'db.rows_affected'],
    },
  },

  externalApiWithCaching: {
    name: 'External API + Caching',
    endpoints: ['gmailIntelligence.js', 'linkedinIntelligence.js'],
    metrics: {
      cacheHitRate: true,
      apiResponseTime: true,
      cacheMissLatency: true,
    },
    traces: {
      spanName: 'api.cached_request',
      attributes: ['api.endpoint', 'cache.hit', 'cache.key', 'api.response_size'],
    },
  },

  multiSourceAggregation: {
    name: 'Multi-Source Aggregation',
    endpoints: ['ecosystem.js', 'universalIntelligence.js'],
    metrics: {
      aggregationLatency: true,
      sourceContributions: true,
      dataQualityScore: true,
    },
    traces: {
      spanName: 'data.aggregation',
      attributes: ['sources.count', 'aggregation.method', 'data.quality_score'],
    },
  },

  eventDrivenProcessing: {
    name: 'Event-Driven Processing',
    endpoints: ['syncEventWebhook.js', 'knowledgeGraphSync.js'],
    metrics: {
      eventProcessingRate: true,
      eventQueueDepth: true,
      processingLatency: true,
    },
    traces: {
      spanName: 'event.processing',
      attributes: ['event.type', 'event.source', 'processing.duration', 'queue.depth'],
    },
  },
};

// Business Metrics Configuration
export const BUSINESS_METRICS = {
  dataFreshness: {
    name: 'Data Freshness Score',
    calculation: 'weighted_average',
    sources: ['postgres', 'redis', 'neo4j', 'gmail', 'linkedin', 'notion', 'xero'],
    thresholds: {
      fresh: 300, // 5 minutes
      stale: 1800, // 30 minutes
      critical: 3600, // 1 hour
    },
  },

  systemReliability: {
    name: 'System Reliability Score',
    calculation: 'uptime_percentage',
    components: Object.keys(INTEGRATION_MONITORING_CONFIG),
    target: 0.999, // 99.9% uptime
  },

  dataIntegrity: {
    name: 'Data Integrity Score',
    calculation: 'validation_pass_rate',
    validations: ['encryption_check', 'schema_validation', 'relationship_consistency'],
    target: 0.9999, // 99.99% integrity
  },

  performanceIndex: {
    name: 'Performance Index',
    calculation: 'percentile_95',
    metrics: ['response_time', 'throughput', 'resource_utilization'],
    target: 2000, // 2 second P95 response time
  },
};

// Alerting Rules Configuration
export const ALERTING_RULES = {
  critical: {
    severity: 'critical',
    conditions: [
      'any_integration.connection_failure',
      'compliance.violation',
      'encryption.failure',
      'postgres.encryption_error',
    ],
    notifications: ['pagerduty', 'slack_critical', 'email_oncall'],
  },

  warning: {
    severity: 'warning',
    conditions: [
      'any_integration.high_latency',
      'redis.low_hit_rate',
      'external_api.rate_limit_approached',
      'ml_pipeline.model_drift',
    ],
    notifications: ['slack_alerts', 'email_team'],
  },

  info: {
    severity: 'info',
    conditions: [
      'data_freshness.stale',
      'system.maintenance_window',
      'integration.health_check_passed',
    ],
    notifications: ['slack_info'],
  },
};

// Dashboard Configuration
export const DASHBOARD_CONFIG = {
  overview: {
    title: 'ACT Platform - Data Flow Overview',
    panels: [
      { type: 'single_stat', metric: 'system_reliability_score', span: 3 },
      { type: 'single_stat', metric: 'data_freshness_score', span: 3 },
      { type: 'single_stat', metric: 'data_integrity_score', span: 3 },
      { type: 'single_stat', metric: 'performance_index', span: 3 },
      { type: 'graph', metric: 'request_rate', span: 6 },
      { type: 'graph', metric: 'error_rate', span: 6 },
      { type: 'heatmap', metric: 'integration_health', span: 12 },
    ],
  },

  integrations: {
    title: 'Integration Health & Performance',
    panels: [
      { type: 'table', metric: 'integration_status', span: 12 },
      { type: 'graph', metric: 'api_response_times', span: 6 },
      { type: 'graph', metric: 'cache_hit_rates', span: 6 },
      { type: 'graph', metric: 'database_performance', span: 12 },
    ],
  },

  dataFlows: {
    title: 'Data Flow Patterns Analysis',
    panels: [
      { type: 'sankey', metric: 'data_flow_volumes', span: 12 },
      { type: 'graph', metric: 'aggregation_latency', span: 6 },
      { type: 'graph', metric: 'event_processing_rate', span: 6 },
      { type: 'table', metric: 'flow_pattern_performance', span: 12 },
    ],
  },

  security: {
    title: 'Security & Compliance Monitoring',
    panels: [
      { type: 'single_stat', metric: 'encryption_coverage', span: 3 },
      { type: 'single_stat', metric: 'compliance_score', span: 3 },
      { type: 'single_stat', metric: 'access_violations', span: 3 },
      { type: 'single_stat', metric: 'audit_completeness', span: 3 },
      { type: 'graph', metric: 'security_events', span: 12 },
    ],
  },
};

export default {
  integrations: INTEGRATION_MONITORING_CONFIG,
  dataFlowPatterns: DATA_FLOW_PATTERNS,
  businessMetrics: BUSINESS_METRICS,
  alertingRules: ALERTING_RULES,
  dashboards: DASHBOARD_CONFIG,
};
