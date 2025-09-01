/**
 * Enhanced OpenTelemetry Tracing Service
 * Comprehensive distributed tracing for all 11 ACT Platform integrations
 * Task: 16.4 - Establish Monitoring and Observability for Data Flows
 */

import { createRequire } from 'module';
import monitoringConfig from '../config/monitoringConfig.js';
import { logger } from '../../utils/logger.js';

const require = createRequire(import.meta.url);

class EnhancedTracingService {
  constructor() {
    this.isInitialized = false;
    this.tracer = null;
    this.spans = new Map();
    this.integrationMetrics = new Map();

    // Enhanced configuration with integration-specific settings
    this.config = {
      serviceName: 'act-placemat-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      jaegerEndpoint:
        process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      otlpEndpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      enableConsoleExporter: process.env.OTEL_CONSOLE_EXPORTER === 'true',
      sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
      enableMetrics: process.env.OTEL_ENABLE_METRICS === 'true',

      // Integration-specific sampling rates from config
      integrationSampling: this.extractSamplingRates(),
    };
  }

  /**
   * Extract sampling rates from monitoring configuration
   */
  extractSamplingRates() {
    const rates = {};
    for (const [key, config] of Object.entries(monitoringConfig.integrations)) {
      rates[key] = config.traces?.samplingRate || 0.1;
    }
    return rates;
  }

  /**
   * Initialize Enhanced OpenTelemetry tracing with integration-specific instrumentation
   */
  async initialize() {
    try {
      logger.info('🔍 Initializing Enhanced OpenTelemetry tracing service...');

      // Try to load OpenTelemetry packages
      let otelApi, NodeSDK, getNodeAutoInstrumentations;
      let Resource, SemanticResourceAttributes;
      let JaegerExporter, OTLPTraceExporter, ConsoleSpanExporter;
      let BatchSpanProcessor, SimpleSpanProcessor;

      try {
        otelApi = await import('@opentelemetry/api');
        const sdkNode = await import('@opentelemetry/sdk-node');
        const autoInstrumentations = await import(
          '@opentelemetry/auto-instrumentations-node'
        );
        const resources = await import('@opentelemetry/resources');
        const semanticConventions = await import('@opentelemetry/semantic-conventions');
        const sdkTraceBase = await import('@opentelemetry/sdk-trace-base');

        NodeSDK = sdkNode.NodeSDK;
        getNodeAutoInstrumentations = autoInstrumentations.getNodeAutoInstrumentations;
        Resource = resources.Resource;
        SemanticResourceAttributes = semanticConventions.SemanticResourceAttributes;
        BatchSpanProcessor = sdkTraceBase.BatchSpanProcessor;
        SimpleSpanProcessor = sdkTraceBase.SimpleSpanProcessor;

        // Load exporters
        try {
          const jaegerExporter = await import('@opentelemetry/exporter-jaeger');
          JaegerExporter = jaegerExporter.JaegerExporter;
        } catch (e) {
          logger.warn('⚠️ Jaeger exporter not available:', e.message);
        }

        try {
          const otlpExporter = await import('@opentelemetry/exporter-trace-otlp-http');
          OTLPTraceExporter = otlpExporter.OTLPTraceExporter;
        } catch (e) {
          logger.warn('⚠️ OTLP exporter not available:', e.message);
        }

        try {
          const sdkTraceNode = await import('@opentelemetry/sdk-trace-node');
          ConsoleSpanExporter = sdkTraceNode.ConsoleSpanExporter;
        } catch (e) {
          logger.warn('⚠️ Console exporter not available:', e.message);
        }
      } catch (error) {
        logger.warn(
          '⚠️ OpenTelemetry packages not available, using mock implementation'
        );
        this.initializeMockTracing();
        return true;
      }

      // Enhanced resource information with integration context
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.version,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        'act.platform': 'placemat',
        'act.region': 'australia',
        'act.integrations.count': Object.keys(monitoringConfig.integrations).length,
        'act.data_flows.count': Object.keys(monitoringConfig.dataFlowPatterns).length,
      });

      // Configure exporters with enhanced settings
      const exporters = [];

      if (JaegerExporter) {
        exporters.push(
          new JaegerExporter({
            endpoint: this.config.jaegerEndpoint,
            tags: {
              'act.component': 'backend',
              'act.deployment': this.config.environment,
            },
          })
        );
      }

      if (OTLPTraceExporter) {
        exporters.push(
          new OTLPTraceExporter({
            url: this.config.otlpEndpoint,
            headers: {
              'act-service': this.config.serviceName,
              'act-version': this.config.version,
            },
          })
        );
      }

      if (this.config.enableConsoleExporter && ConsoleSpanExporter) {
        exporters.push(new ConsoleSpanExporter());
      }

      if (exporters.length === 0) {
        logger.warn('⚠️ No trace exporters available, using mock implementation');
        this.initializeMockTracing();
        return true;
      }

      // Create enhanced span processors
      const spanProcessors = exporters.map(exporter => {
        return new BatchSpanProcessor(exporter, {
          maxExportBatchSize: 100,
          scheduledDelayMillis: 1000,
          exportTimeoutMillis: 30000,
          maxQueueSize: 2048,
        });
      });

      // Initialize the SDK with enhanced instrumentation
      const sdk = new NodeSDK({
        resource,
        spanProcessors,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
            '@opentelemetry/instrumentation-http': {
              enabled: true,
              requestHook: (span, request) => {
                span.setAttributes({
                  'http.user_agent': request.headers['user-agent'],
                  'act.request_id': request.headers['x-request-id'],
                  'act.integration': this.identifyIntegrationFromUrl(request.url),
                  'act.data_flow_pattern': this.identifyDataFlowPattern(request.url),
                });
              },
              responseHook: (span, response) => {
                span.setAttributes({
                  'act.response_size': response.headers['content-length'] || 0,
                  'act.cache_status': response.headers['x-cache-status'] || 'unknown',
                });
              },
            },
            '@opentelemetry/instrumentation-express': {
              enabled: true,
              requestHook: (span, info) => {
                span.setAttributes({
                  'act.route': info.route?.path || 'unknown',
                  'act.endpoint_classification': this.classifyEndpoint(
                    info.route?.path
                  ),
                });
              },
            },
            '@opentelemetry/instrumentation-pg': {
              enabled: true,
              requestHook: (span, queryConfig) => {
                span.setAttributes({
                  'act.database': 'postgres',
                  'act.query_type': this.identifyQueryType(queryConfig.text),
                  'act.encryption_required': this.requiresEncryption(queryConfig.text),
                });
              },
            },
            '@opentelemetry/instrumentation-redis': {
              enabled: true,
              requestHook: (span, command) => {
                span.setAttributes({
                  'act.cache_operation': command.command,
                  'act.cache_key_pattern': this.identifyKeyPattern(command.args?.[0]),
                });
              },
            },
          }),
        ],
        sampler: this.createEnhancedSampler(),
      });

      // Start the SDK
      await sdk.start();

      // Get tracer instance
      this.tracer = otelApi.trace.getTracer(
        this.config.serviceName,
        this.config.version
      );

      // Initialize integration-specific metrics
      this.initializeIntegrationMetrics();

      this.isInitialized = true;
      logger.info(
        `✅ Enhanced OpenTelemetry initialized with ${exporters.length} exporter(s) and ${Object.keys(monitoringConfig.integrations).length} integration configurations`
      );

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize Enhanced OpenTelemetry:', error.message);
      this.initializeMockTracing();
      return false;
    }
  }

  /**
   * Create enhanced sampler with integration-specific rates
   */
  createEnhancedSampler() {
    try {
      const {
        ParentBasedSampler,
        TraceIdRatioBasedSampler,
        CompositeSampler,
      } = require('@opentelemetry/sdk-trace-base');

      // Create a custom sampler that respects integration-specific rates
      return {
        shouldSample: (context, traceId, spanName, spanKind, attributes, links) => {
          // Determine integration from span attributes
          const integration = attributes?.['act.integration'];
          const samplingRate = integration
            ? this.config.integrationSampling[integration]
            : this.config.sampleRate;

          // Use TraceIdRatioBasedSampler for the determined rate
          const sampler = new TraceIdRatioBasedSampler(samplingRate);
          return sampler.shouldSample(
            context,
            traceId,
            spanName,
            spanKind,
            attributes,
            links
          );
        },
        toString: () => 'EnhancedIntegrationAwareSampler',
      };
    } catch (error) {
      logger.warn('⚠️ Enhanced sampler not available, using default');
      return null;
    }
  }

  /**
   * Initialize integration-specific metrics tracking
   */
  initializeIntegrationMetrics() {
    for (const [key, config] of Object.entries(monitoringConfig.integrations)) {
      this.integrationMetrics.set(key, {
        name: config.name,
        type: config.type,
        classification: config.classification,
        spanCount: 0,
        errorCount: 0,
        totalDuration: 0,
        lastActivity: null,
      });
    }
  }

  /**
   * Identify integration from URL pattern
   */
  identifyIntegrationFromUrl(url) {
    if (!url) return 'unknown';

    if (url.includes('/gmail') || url.includes('gmail')) return 'gmail';
    if (url.includes('/linkedin') || url.includes('linkedin')) return 'linkedin';
    if (url.includes('/notion') || url.includes('notion')) return 'notion';
    if (url.includes('/xero') || url.includes('xero')) return 'xero';
    if (url.includes('/bookkeeping') || url.includes('financial')) return 'xero';
    if (url.includes('/neo4j') || url.includes('graph')) return 'neo4j';
    if (url.includes('/ml') || url.includes('intelligence')) return 'mlPipeline';
    if (url.includes('/compliance') || url.includes('audit')) return 'compliance';
    if (url.includes('/observability') || url.includes('metrics'))
      return 'observability';
    if (url.includes('/encrypt') || url.includes('decrypt')) return 'encryption';

    return 'unknown';
  }

  /**
   * Identify data flow pattern from URL
   */
  identifyDataFlowPattern(url) {
    if (!url) return 'unknown';

    if (url.includes('/privacy') || url.includes('/security'))
      return 'directDatabaseAccess';
    if (url.includes('/gmail') || url.includes('/linkedin'))
      return 'externalApiWithCaching';
    if (url.includes('/ecosystem') || url.includes('/universal'))
      return 'multiSourceAggregation';
    if (url.includes('/sync') || url.includes('/webhook'))
      return 'eventDrivenProcessing';

    return 'unknown';
  }

  /**
   * Classify endpoint by security level
   */
  classifyEndpoint(route) {
    if (!route) return 'unknown';

    if (route.includes('/financial') || route.includes('/bookkeeping'))
      return 'restricted';
    if (route.includes('/intelligence') || route.includes('/ml')) return 'confidential';
    if (route.includes('/dashboard') || route.includes('/content')) return 'internal';
    if (route.includes('/health') || route.includes('/status')) return 'public';

    return 'internal';
  }

  /**
   * Identify SQL query type
   */
  identifyQueryType(query) {
    if (!query) return 'unknown';

    const upperQuery = query.toUpperCase().trim();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    if (upperQuery.startsWith('CREATE')) return 'CREATE';
    if (upperQuery.startsWith('ALTER')) return 'ALTER';

    return 'unknown';
  }

  /**
   * Check if query requires encryption
   */
  requiresEncryption(query) {
    if (!query) return false;

    const sensitivePatterns = [
      'email',
      'password',
      'token',
      'key',
      'secret',
      'financial',
      'transaction',
      'payment',
      'invoice',
      'personal_info',
      'contact_details',
    ];

    return sensitivePatterns.some(pattern => query.toLowerCase().includes(pattern));
  }

  /**
   * Identify Redis key pattern
   */
  identifyKeyPattern(key) {
    if (!key) return 'unknown';

    if (key.startsWith('session:')) return 'session';
    if (key.startsWith('cache:')) return 'cache';
    if (key.startsWith('gmail:')) return 'gmail_cache';
    if (key.startsWith('linkedin:')) return 'linkedin_cache';
    if (key.startsWith('notion:')) return 'notion_cache';
    if (key.includes(':intelligence')) return 'intelligence_cache';

    return 'general';
  }

  /**
   * Enhanced tracing for specific integrations
   */
  traceIntegration(integrationKey, operation, fn) {
    const config = monitoringConfig.integrations[integrationKey];
    if (!config) {
      logger.warn(`Unknown integration: ${integrationKey}`);
      return fn();
    }

    return this.startActiveSpan(
      `${integrationKey}.${operation}`,
      {
        attributes: {
          'act.integration': integrationKey,
          'act.integration.type': config.type,
          'act.integration.classification': config.classification,
          'act.operation': operation,
          'act.layer': 'integration',
        },
      },
      async span => {
        const startTime = Date.now();

        try {
          // Update integration metrics
          const metrics = this.integrationMetrics.get(integrationKey);
          if (metrics) {
            metrics.spanCount++;
            metrics.lastActivity = new Date().toISOString();
          }

          const result = await fn(span);

          // Add result attributes
          span.setAttributes({
            'act.result.success': true,
            'act.result.size':
              typeof result === 'object' ? JSON.stringify(result).length : 0,
          });

          // Update metrics
          if (metrics) {
            const duration = Date.now() - startTime;
            metrics.totalDuration += duration;
          }

          return result;
        } catch (error) {
          // Update error metrics
          const metrics = this.integrationMetrics.get(integrationKey);
          if (metrics) {
            metrics.errorCount++;
          }

          span.recordException(error);
          span.setAttributes({
            'act.result.success': false,
            'act.error.type': error.name,
            'act.error.message': error.message,
          });
          span.setStatus({ code: 2, message: error.message }); // ERROR
          throw error;
        }
      }
    );
  }

  /**
   * Trace data flow patterns
   */
  traceDataFlowPattern(patternKey, operation, fn) {
    const pattern = monitoringConfig.dataFlowPatterns[patternKey];
    if (!pattern) {
      logger.warn(`Unknown data flow pattern: ${patternKey}`);
      return fn();
    }

    return this.startActiveSpan(
      pattern.traces.spanName || `flow.${patternKey}`,
      {
        attributes: {
          'act.data_flow.pattern': patternKey,
          'act.data_flow.name': pattern.name,
          'act.operation': operation,
          'act.layer': 'data_flow',
          ...pattern.traces.attributes?.reduce((acc, attr) => {
            acc[attr] = 'placeholder'; // Will be set by the operation
            return acc;
          }, {}),
        },
      },
      async span => {
        try {
          const result = await fn(span);

          // Add pattern-specific attributes based on result
          if (patternKey === 'multiSourceAggregation' && result?.sources) {
            span.setAttributes({
              'sources.count': result.sources.length,
              'aggregation.method': result.method || 'unknown',
              'data.quality_score': result.qualityScore || 0,
            });
          }

          if (patternKey === 'externalApiWithCaching' && result?.cached !== undefined) {
            span.setAttributes({
              'cache.hit': result.cached,
              'cache.key': result.cacheKey || 'unknown',
              'api.response_size': result.size || 0,
            });
          }

          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: 2, message: error.message });
          throw error;
        }
      }
    );
  }

  /**
   * Get enhanced tracing status with integration metrics
   */
  getEnhancedStatus() {
    const integrationStats = {};
    for (const [key, metrics] of this.integrationMetrics.entries()) {
      integrationStats[key] = {
        ...metrics,
        averageDuration:
          metrics.spanCount > 0 ? metrics.totalDuration / metrics.spanCount : 0,
        errorRate: metrics.spanCount > 0 ? metrics.errorCount / metrics.spanCount : 0,
      };
    }

    return {
      initialized: this.isInitialized,
      active_spans: this.spans.size,
      config: this.config,
      tracer_available: !!this.tracer,
      integrations: integrationStats,
      data_flow_patterns: Object.keys(monitoringConfig.dataFlowPatterns),
      business_metrics: Object.keys(monitoringConfig.businessMetrics),
    };
  }

  /**
   * Initialize mock tracing when OpenTelemetry is not available
   * Enhanced with integration awareness
   */
  initializeMockTracing() {
    logger.info('🔧 Initializing enhanced mock tracing service...');

    this.tracer = {
      startSpan: (name, options = {}) => {
        const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const span = {
          spanId,
          name,
          startTime: Date.now(),
          attributes: options.attributes || {},
          status: { code: 1 }, // OK
          events: [],

          setAttributes: attributes => {
            Object.assign(span.attributes, attributes);

            // Track integration metrics in mock mode
            const integration = attributes['act.integration'];
            if (integration && this.integrationMetrics.has(integration)) {
              const metrics = this.integrationMetrics.get(integration);
              metrics.spanCount++;
              metrics.lastActivity = new Date().toISOString();
            }

            return span;
          },

          setAttribute: (key, value) => {
            span.attributes[key] = value;
            return span;
          },

          setStatus: status => {
            span.status = status;
            return span;
          },

          addEvent: (name, attributes = {}) => {
            span.events.push({
              name,
              attributes,
              timestamp: Date.now(),
            });
            return span;
          },

          recordException: exception => {
            span.addEvent('exception', {
              'exception.type': exception.name,
              'exception.message': exception.message,
              'exception.stacktrace': exception.stack,
            });
            span.setStatus({ code: 2, message: exception.message }); // ERROR

            // Track errors in integration metrics
            const integration = span.attributes['act.integration'];
            if (integration && this.integrationMetrics.has(integration)) {
              const metrics = this.integrationMetrics.get(integration);
              metrics.errorCount++;
            }

            return span;
          },

          spanContext: () => ({
            traceId: spanId,
            spanId: spanId,
          }),

          end: () => {
            const duration = Date.now() - span.startTime;

            // Update integration duration metrics
            const integration = span.attributes['act.integration'];
            if (integration && this.integrationMetrics.has(integration)) {
              const metrics = this.integrationMetrics.get(integration);
              metrics.totalDuration += duration;
            }

            logger.debug(`🔍 ENHANCED TRACE [${span.name}] ${duration}ms`, {
              spanId: span.spanId,
              integration: span.attributes['act.integration'],
              dataFlowPattern: span.attributes['act.data_flow.pattern'],
              classification: span.attributes['act.integration.classification'],
              attributes: span.attributes,
              status: span.status,
              events: span.events.length,
            });

            this.spans.delete(spanId);
          },
        };

        this.spans.set(spanId, span);
        return span;
      },

      startActiveSpan: (name, options, fn) => {
        const span = this.tracer.startSpan(name, options);
        try {
          if (typeof fn === 'function') {
            return fn(span);
          }
          return span;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: 2, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      },
    };

    // Initialize integration metrics for mock mode
    this.initializeIntegrationMetrics();

    this.isInitialized = true;
    logger.info('✅ Enhanced mock tracing service initialized');
  }

  // Extend base methods with enhanced functionality
  startSpan(name, options = {}) {
    if (!this.isInitialized || !this.tracer) {
      return this.createNoOpSpan(name);
    }

    return this.tracer.startSpan(name, {
      attributes: {
        'act.component': 'backend',
        'act.version': this.config.version,
        'act.environment': this.config.environment,
        ...options.attributes,
      },
      ...options,
    });
  }

  startActiveSpan(name, options, fn) {
    if (!this.isInitialized || !this.tracer) {
      return fn(this.createNoOpSpan(name));
    }

    return this.tracer.startActiveSpan(
      name,
      {
        attributes: {
          'act.component': 'backend',
          'act.version': this.config.version,
          'act.environment': this.config.environment,
          ...options?.attributes,
        },
        ...options,
      },
      fn
    );
  }

  createNoOpSpan(name) {
    return {
      setAttributes: () => this,
      setAttribute: () => this,
      setStatus: () => this,
      addEvent: () => this,
      recordException: () => this,
      end: () => {},
    };
  }

  async close() {
    logger.info('🔄 Closing enhanced tracing service...');

    // End any remaining spans
    for (const span of this.spans.values()) {
      span.end();
    }
    this.spans.clear();

    // Clear integration metrics
    this.integrationMetrics.clear();

    this.isInitialized = false;
    this.tracer = null;

    logger.info('✅ Enhanced tracing service closed');
  }
}

// Create singleton instance
const enhancedTracingService = new EnhancedTracingService();

export default enhancedTracingService;

// Export enhanced utility functions
export const traceIntegration = (integration, operation, fn) =>
  enhancedTracingService.traceIntegration(integration, operation, fn);

export const traceDataFlowPattern = (pattern, operation, fn) =>
  enhancedTracingService.traceDataFlowPattern(pattern, operation, fn);

export const startSpan = (name, options) =>
  enhancedTracingService.startSpan(name, options);

export const startActiveSpan = (name, options, fn) =>
  enhancedTracingService.startActiveSpan(name, options, fn);

export const getEnhancedStatus = () => enhancedTracingService.getEnhancedStatus();
