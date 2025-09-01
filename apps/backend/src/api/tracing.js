/**
 * Tracing API Endpoints
 * Provides endpoints for tracing status, configuration, and testing
 */

import express from 'express';
import tracingService from '../services/tracingService.js';

const router = express.Router();

/**
 * Get tracing service status
 */
router.get('/status', async (req, res) => {
  try {
    const status = tracingService.getStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting tracing status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tracing status'
    });
  }
});

/**
 * Test tracing with sample operations
 */
router.post('/test', async (req, res) => {
  try {
    const { operation = 'sample', data = {} } = req.body;
    
    const result = await tracingService.startActiveSpan('api.tracing.test', {
      attributes: {
        'test.operation': operation,
        'test.data_size': JSON.stringify(data).length,
        'test.user_agent': req.headers['user-agent'],
        'test.ip': req.ip
      }
    }, async (span) => {
      // Simulate different types of operations
      switch (operation) {
        case 'database':
          return await tracingService.traceDatabase('select', 'test_table', async (dbSpan) => {
            // Simulate database delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            dbSpan.setAttributes({
              'db.rows_returned': Math.floor(Math.random() * 100)
            });
            return { rows: Math.floor(Math.random() * 100) };
          });
          
        case 'external_api':
          return await tracingService.traceExternalCall('test_api', 'fetch_data', async (apiSpan) => {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
            apiSpan.setAttributes({
              'api.response_size': Math.floor(Math.random() * 1000)
            });
            return { data: 'test response' };
          });
          
        case 'sync':
          return await tracingService.traceSync('test_sync', 'source', 'target', async (syncSpan) => {
            // Simulate sync operation
            await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
            const processed = Math.floor(Math.random() * 50);
            const synced = Math.floor(processed * 0.9);
            const errors = processed - synced;
            
            return { processed, synced, errors };
          });
          
        case 'analytics':
          return await tracingService.traceAnalytics('test_analysis', 'test_source', async (analyticsSpan) => {
            // Simulate analytics operation
            await new Promise(resolve => setTimeout(resolve, Math.random() * 120));
            const data = Array.from({ length: Math.floor(Math.random() * 20) }, (_, i) => ({ id: i }));
            return { data };
          });
          
        case 'error':
          // Test error tracing
          throw new Error('Test error for tracing');
          
        default:
          // Simple span test
          span.addEvent('test_event', {
            'event.type': 'sample',
            'event.data': JSON.stringify(data)
          });
          
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          return {
            operation: 'sample',
            data,
            processed_at: new Date().toISOString()
          };
      }
    });
    
    res.json({
      success: true,
      operation,
      result,
      message: 'Tracing test completed successfully'
    });
  } catch (error) {
    console.error('Tracing test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      operation: req.body.operation || 'unknown'
    });
  }
});

/**
 * Get tracing configuration help
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    configuration: {
      environment_variables: {
        JAEGER_ENDPOINT: {
          description: 'Jaeger trace collector endpoint',
          default: 'http://localhost:14268/api/traces',
          current: process.env.JAEGER_ENDPOINT || 'not set'
        },
        OTLP_ENDPOINT: {
          description: 'OpenTelemetry Protocol (OTLP) endpoint',
          default: 'http://localhost:4318/v1/traces',
          current: process.env.OTLP_ENDPOINT || 'not set'
        },
        OTEL_CONSOLE_EXPORTER: {
          description: 'Enable console trace exporter',
          default: 'false',
          current: process.env.OTEL_CONSOLE_EXPORTER || 'false'
        },
        OTEL_SAMPLE_RATE: {
          description: 'Trace sampling rate (0.0 to 1.0)',
          default: '1.0',
          current: process.env.OTEL_SAMPLE_RATE || '1.0'
        },
        OTEL_ENABLE_METRICS: {
          description: 'Enable metrics collection',
          default: 'false',
          current: process.env.OTEL_ENABLE_METRICS || 'false'
        }
      },
      jaeger_setup: {
        description: 'To run Jaeger locally for trace visualization',
        docker_command: 'docker run -d --name jaeger -e COLLECTOR_OTLP_ENABLED=true -p 16686:16686 -p 14250:14250 -p 14268:14268 -p 4317:4317 -p 4318:4318 jaegertracing/all-in-one:latest',
        web_ui: 'http://localhost:16686',
        trace_endpoint: 'http://localhost:14268/api/traces'
      },
      sample_usage: {
        test_operations: [
          'sample',
          'database', 
          'external_api',
          'sync',
          'analytics',
          'error'
        ],
        endpoints: {
          status: 'GET /api/tracing/status',
          test: 'POST /api/tracing/test',
          config: 'GET /api/tracing/config'
        }
      }
    }
  });
});

/**
 * Health check for tracing service
 */
router.get('/health', (req, res) => {
  const status = tracingService.getStatus();
  
  res.json({
    success: true,
    service: 'tracing',
    initialized: status.initialized,
    tracer_available: status.tracer_available,
    timestamp: new Date().toISOString()
  });
});

export default router;