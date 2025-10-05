/**
 * OpenTelemetry Tracing Service
 * Provides distributed tracing for ACT Placemat backend operations
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

class TracingService {
  constructor() {
    this.isInitialized = false
    this.tracer = null
    this.spans = new Map() // Track active spans
    this.config = {
      serviceName: 'act-placemat-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      otlpEndpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      enableConsoleExporter: process.env.OTEL_CONSOLE_EXPORTER === 'true',
      sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
      enableMetrics: process.env.OTEL_ENABLE_METRICS === 'true'
    }
  }

  /**
   * Initialize OpenTelemetry tracing
   * Uses dynamic imports to handle optional dependencies gracefully
   */
  async initialize() {
    try {
      console.log('🔍 Initializing OpenTelemetry tracing service...')
      
      // Try to load OpenTelemetry packages
      let otelApi, NodeSDK, getNodeAutoInstrumentations
      let Resource, SemanticResourceAttributes
      let JaegerExporter, OTLPTraceExporter, ConsoleSpanExporter
      
      try {
        otelApi = await import('@opentelemetry/api')
        const sdkNode = await import('@opentelemetry/sdk-node')
        const autoInstrumentations = await import('@opentelemetry/auto-instrumentations-node')
        const resources = await import('@opentelemetry/resources')
        const semanticConventions = await import('@opentelemetry/semantic-conventions')
        
        NodeSDK = sdkNode.NodeSDK
        getNodeAutoInstrumentations = autoInstrumentations.getNodeAutoInstrumentations
        Resource = resources.Resource
        SemanticResourceAttributes = semanticConventions.SemanticResourceAttributes
        
        // Try to load exporters (these might not be available)
        try {
          const jaegerExporter = await import('@opentelemetry/exporter-jaeger')
          JaegerExporter = jaegerExporter.JaegerExporter
        } catch (e) {
          console.warn('⚠️ Jaeger exporter not available:', e.message)
        }
        
        try {
          const otlpExporter = await import('@opentelemetry/exporter-trace-otlp-http')
          OTLPTraceExporter = otlpExporter.OTLPTraceExporter
        } catch (e) {
          console.warn('⚠️ OTLP exporter not available:', e.message)
        }
        
        try {
          const consoleExporter = await import('@opentelemetry/sdk-node')
          ConsoleSpanExporter = consoleExporter.ConsoleSpanExporter
        } catch (e) {
          // Console exporter might be in a different package
        }
        
      } catch (error) {
        console.warn('⚠️ OpenTelemetry packages not available, using mock implementation')
        this.initializeMockTracing()
        return true
      }

      // Configure resource information
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.version,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      })

      // Configure exporters
      const exporters = []
      
      if (JaegerExporter) {
        exporters.push(new JaegerExporter({
          endpoint: this.config.jaegerEndpoint,
        }))
      }
      
      if (OTLPTraceExporter) {
        exporters.push(new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
        }))
      }
      
      if (this.config.enableConsoleExporter && ConsoleSpanExporter) {
        exporters.push(new ConsoleSpanExporter())
      }
      
      // If no exporters are available, fall back to console logging
      if (exporters.length === 0) {
        console.warn('⚠️ No trace exporters available, using console logging')
        this.initializeMockTracing()
        return true
      }

      // Initialize the SDK
      const sdk = new NodeSDK({
        resource,
        traceExporter: exporters.length === 1 ? exporters[0] : undefined,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false }, // Too verbose
            '@opentelemetry/instrumentation-http': { 
              enabled: true,
              requestHook: (span, request) => {
                span.setAttributes({
                  'http.user_agent': request.headers['user-agent'],
                  'act.request_id': request.headers['x-request-id']
                })
              }
            },
            '@opentelemetry/instrumentation-express': { enabled: true },
            '@opentelemetry/instrumentation-pg': { enabled: true }
          })
        ],
        spanProcessor: exporters.length > 1 ? this.createMultiExporterProcessor(exporters) : undefined,
        sampler: this.createSampler()
      })

      // Start the SDK
      await sdk.start()
      
      // Get tracer instance
      this.tracer = otelApi.trace.getTracer(this.config.serviceName, this.config.version)
      
      this.isInitialized = true
      console.log(`✅ OpenTelemetry initialized with ${exporters.length} exporter(s)`)
      
      return true
    } catch (error) {
      console.error('❌ Failed to initialize OpenTelemetry:', error.message)
      this.initializeMockTracing()
      return false
    }
  }

  /**
   * Create a sampler based on configuration
   */
  createSampler() {
    try {
      const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-node')
      return new TraceIdRatioBasedSampler(this.config.sampleRate)
    } catch (error) {
      return null // Use default sampler
    }
  }

  /**
   * Create multi-exporter processor for multiple trace destinations
   */
  createMultiExporterProcessor(exporters) {
    try {
      const { BatchSpanProcessor, SimpleSpanProcessor } = require('@opentelemetry/sdk-node')
      const { MultiSpanProcessor } = require('@opentelemetry/sdk-node')
      
      const processors = exporters.map(exporter => 
        new BatchSpanProcessor(exporter, {
          maxExportBatchSize: 100,
          scheduledDelayMillis: 1000,
          exportTimeoutMillis: 30000,
          maxQueueSize: 2048,
        })
      )
      
      return new MultiSpanProcessor(processors)
    } catch (error) {
      console.warn('⚠️ Multi-exporter processor not available, using single processor')
      return null
    }
  }

  /**
   * Initialize mock tracing when OpenTelemetry is not available
   */
  initializeMockTracing() {
    console.log('🔧 Initializing mock tracing service...')
    
    this.tracer = {
      startSpan: (name, options = {}) => {
        const spanId = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const span = {
          spanId,
          name,
          startTime: Date.now(),
          attributes: {},
          status: 'OK',
          events: [],
          
          setAttributes: (attributes) => {
            Object.assign(span.attributes, attributes)
            return span
          },
          
          setAttribute: (key, value) => {
            span.attributes[key] = value
            return span
          },
          
          setStatus: (status) => {
            span.status = status
            return span
          },
          
          addEvent: (name, attributes = {}) => {
            span.events.push({
              name,
              attributes,
              timestamp: Date.now()
            })
            return span
          },
          
          recordException: (exception) => {
            span.addEvent('exception', {
              'exception.type': exception.name,
              'exception.message': exception.message,
              'exception.stacktrace': exception.stack
            })
            span.setStatus('ERROR')
            return span
          },
          
          spanContext: () => ({
            traceId: spanId,
            spanId: spanId
          }),
          
          end: () => {
            const duration = Date.now() - span.startTime
            console.log(`🔍 TRACE [${span.name}] ${duration}ms`, {
              spanId: span.spanId,
              attributes: span.attributes,
              status: span.status,
              events: span.events.length
            })
            this.spans.delete(spanId)
          }
        }
        
        this.spans.set(spanId, span)
        return span
      },
      
      startActiveSpan: (name, options, fn) => {
        const span = this.tracer.startSpan(name, options)
        try {
          if (typeof fn === 'function') {
            return fn(span)
          }
          return span
        } catch (error) {
          span.recordException(error)
          span.setStatus('ERROR')
          throw error
        } finally {
          span.end()
        }
      }
    }
    
    this.isInitialized = true
    console.log('✅ Mock tracing service initialized')
  }

  /**
   * Start a new span
   */
  startSpan(name, options = {}) {
    if (!this.isInitialized || !this.tracer) {
      return this.createNoOpSpan(name)
    }
    
    return this.tracer.startSpan(name, {
      attributes: {
        'act.component': 'backend',
        'act.version': this.config.version,
        ...options.attributes
      },
      ...options
    })
  }

  /**
   * Start an active span and execute a function within its context
   */
  startActiveSpan(name, options, fn) {
    if (!this.isInitialized || !this.tracer) {
      return fn(this.createNoOpSpan(name))
    }
    
    return this.tracer.startActiveSpan(name, {
      attributes: {
        'act.component': 'backend',
        'act.version': this.config.version,
        ...options?.attributes
      },
      ...options
    }, fn)
  }

  /**
   * Create a no-op span when tracing is disabled
   */
  createNoOpSpan(name) {
    return {
      setAttributes: () => this,
      setAttribute: () => this,
      setStatus: () => this,
      addEvent: () => this,
      recordException: () => this,
      end: () => {}
    }
  }

  /**
   * Trace a database operation
   */
  traceDatabase(operation, tableName, fn) {
    return this.startActiveSpan(`db.${operation}`, {
      attributes: {
        'db.system': 'postgresql',
        'db.operation': operation,
        'db.name': tableName,
        'act.layer': 'database'
      }
    }, async (span) => {
      try {
        const result = await fn(span)
        span.setAttributes({
          'db.rows_affected': Array.isArray(result) ? result.length : 1
        })
        return result
      } catch (error) {
        span.recordException(error)
        span.setStatus('ERROR')
        throw error
      }
    })
  }

  /**
   * Trace an external API call
   */
  traceExternalCall(service, operation, fn) {
    return this.startActiveSpan(`external.${service}.${operation}`, {
      attributes: {
        'rpc.system': service,
        'rpc.method': operation,
        'act.layer': 'external'
      }
    }, async (span) => {
      try {
        const result = await fn(span)
        span.setAttributes({
          'rpc.response_size': JSON.stringify(result).length
        })
        return result
      } catch (error) {
        span.recordException(error)
        span.setStatus('ERROR')
        throw error
      }
    })
  }

  /**
   * Trace a synchronization operation
   */
  traceSync(syncType, source, target, fn) {
    return this.startActiveSpan(`sync.${syncType}`, {
      attributes: {
        'sync.source': source,
        'sync.target': target,
        'sync.type': syncType,
        'act.layer': 'sync'
      }
    }, async (span) => {
      try {
        const result = await fn(span)
        span.setAttributes({
          'sync.records_processed': result?.processed || 0,
          'sync.records_synced': result?.synced || 0,
          'sync.errors': result?.errors || 0
        })
        return result
      } catch (error) {
        span.recordException(error)
        span.setStatus('ERROR')
        throw error
      }
    })
  }

  /**
   * Trace an analytics operation
   */
  traceAnalytics(operation, dataSource, fn) {
    return this.startActiveSpan(`analytics.${operation}`, {
      attributes: {
        'analytics.operation': operation,
        'analytics.data_source': dataSource,
        'act.layer': 'analytics'
      }
    }, async (span) => {
      try {
        const result = await fn(span)
        span.setAttributes({
          'analytics.result_count': Array.isArray(result?.data) ? result.data.length : 0
        })
        return result
      } catch (error) {
        span.recordException(error)
        span.setStatus('ERROR')
        throw error
      }
    })
  }

  /**
   * Get tracing status and configuration
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      active_spans: this.spans.size,
      config: this.config,
      tracer_available: !!this.tracer,
      exporters: this.getExporterStatus()
    }
  }

  /**
   * Get exporter status information
   */
  getExporterStatus() {
    const status = {
      jaeger: false,
      otlp: false,
      console: false
    }
    
    // This would be populated during initialization
    // For now, return basic status
    return status
  }

  /**
   * Close tracing service
   */
  async close() {
    console.log('🔄 Closing tracing service...')
    
    // End any remaining spans
    for (const span of this.spans.values()) {
      span.end()
    }
    this.spans.clear()
    
    this.isInitialized = false
    this.tracer = null
    
    console.log('✅ Tracing service closed')
  }
}

// Create singleton instance
const tracingService = new TracingService()

export default tracingService

// Export utility functions for convenience
export const startSpan = (name, options) => tracingService.startSpan(name, options)
export const startActiveSpan = (name, options, fn) => tracingService.startActiveSpan(name, options, fn)
export const traceDatabase = (operation, table, fn) => tracingService.traceDatabase(operation, table, fn)
export const traceExternalCall = (service, operation, fn) => tracingService.traceExternalCall(service, operation, fn)
export const traceSync = (type, source, target, fn) => tracingService.traceSync(type, source, target, fn)
export const traceAnalytics = (operation, source, fn) => tracingService.traceAnalytics(operation, source, fn)