/**
 * Error Taxonomy API Endpoints
 * Provides REST API for managing error classification, retry policies, and circuit breaker states
 */

import express from 'express';
import errorTaxonomyService from '../services/errorTaxonomyService.js';
import tracingService from '../services/tracingService.js';

const router = express.Router();

/**
 * Get error taxonomy service status and configuration
 */
router.get('/status', async (req, res) => {
  try {
    const status = errorTaxonomyService.getStatus();
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting error taxonomy status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get error taxonomy status'
    });
  }
});

/**
 * Get error statistics for analysis
 */
router.get('/statistics', async (req, res) => {
  try {
    const { service, timeWindow } = req.query;
    const timeWindowMs = timeWindow ? parseInt(timeWindow) : 3600000; // Default 1 hour
    
    const statistics = errorTaxonomyService.getErrorStatistics(service, timeWindowMs);
    
    res.json({
      success: true,
      statistics,
      filters: { service, timeWindow: timeWindowMs },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting error statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get error statistics'
    });
  }
});

/**
 * Get circuit breaker states for all services
 */
router.get('/circuit-breakers', async (req, res) => {
  try {
    const status = errorTaxonomyService.getStatus();
    
    res.json({
      success: true,
      circuitBreakers: status.circuitBreakers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting circuit breaker states:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker states'
    });
  }
});

/**
 * Reset circuit breaker for a specific service
 */
router.post('/circuit-breakers/:service/reset', async (req, res) => {
  try {
    const { service } = req.params;
    
    const result = await errorTaxonomyService.resetCircuitBreaker(service);
    
    if (result) {
      res.json({
        success: true,
        message: `Circuit breaker reset for service: ${service}`,
        service,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Circuit breaker not found for service: ${service}`
      });
    }
  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker'
    });
  }
});

/**
 * Classify an error manually for testing
 */
router.post('/classify', async (req, res) => {
  try {
    const { error, context = {} } = req.body;
    
    if (!error || !error.message) {
      return res.status(400).json({
        success: false,
        error: 'Error object with message is required'
      });
    }
    
    // Create Error object from request data
    const errorObj = new Error(error.message);
    if (error.code) errorObj.code = error.code;
    if (error.status) errorObj.status = error.status;
    if (error.statusCode) errorObj.statusCode = error.statusCode;
    if (error.stack) errorObj.stack = error.stack;
    
    const classification = await errorTaxonomyService.classifyError(errorObj, context);
    
    res.json({
      success: true,
      classification,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error classifying error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to classify error'
    });
  }
});

/**
 * Test retry mechanism with a mock operation
 */
router.post('/test/retry', async (req, res) => {
  try {
    const {
      service = 'test',
      policyName = 'default',
      shouldFail = false,
      failCount = 2,
      errorType = 'network'
    } = req.body;
    
    let attemptCount = 0;
    
    const mockOperation = async () => {
      attemptCount++;
      console.log(`🧪 Mock operation attempt ${attemptCount}`);
      
      if (shouldFail && attemptCount <= failCount) {
        const error = new Error(`Mock ${errorType} error (attempt ${attemptCount})`);
        
        // Add error properties based on error type
        switch (errorType) {
          case 'network':
            error.code = 'ECONNREFUSED';
            break;
          case 'timeout':
            error.code = 'ETIMEDOUT';
            break;
          case 'rate_limit':
            error.status = 429;
            error.message = 'Rate limit exceeded';
            break;
          case 'auth':
            error.status = 401;
            error.message = 'Authentication failed';
            break;
          default:
            error.status = 500;
        }
        
        throw error;
      }
      
      return { 
        success: true, 
        message: `Operation succeeded on attempt ${attemptCount}`,
        attemptCount 
      };
    };
    
    const startTime = Date.now();
    
    const result = await errorTaxonomyService.executeWithRetry(mockOperation, {
      service,
      policyName,
      context: { test: true, errorType },
      onRetry: (classification, attempt, delay) => {
        console.log(`🔄 Retry ${attempt}: ${classification.category} error, waiting ${delay}ms`);
      },
      onFailure: (classification, attempts) => {
        console.log(`❌ Operation failed after ${attempts} attempts: ${classification.category}`);
      }
    });
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      test: {
        result,
        duration,
        totalAttempts: attemptCount,
        service,
        policyName,
        parameters: { shouldFail, failCount, errorType }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const duration = Date.now() - (res.locals.startTime || Date.now());
    
    console.error('Retry test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      test: {
        duration,
        totalAttempts: attemptCount,
        failed: true
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test circuit breaker functionality
 */
router.post('/test/circuit-breaker', async (req, res) => {
  try {
    const { service = 'test-service', errorCount = 6 } = req.body;
    
    console.log(`🧪 Testing circuit breaker for ${service} with ${errorCount} errors`);
    
    const results = [];
    
    // Simulate multiple failures to trigger circuit breaker
    for (let i = 1; i <= errorCount; i++) {
      try {
        await errorTaxonomyService.executeWithRetry(
          async () => {
            throw new Error(`Test system error ${i}`);
          },
          { 
            service,
            policyName: 'critical', // No retries
            context: { test: true, iteration: i }
          }
        );
      } catch (error) {
        const classification = await errorTaxonomyService.classifyError(error, { service });
        results.push({
          iteration: i,
          error: error.message,
          classification: classification.category,
          circuitBreakerState: (await errorTaxonomyService.checkCircuitBreaker(service)).state
        });
      }
    }
    
    // Check final circuit breaker state
    const finalState = await errorTaxonomyService.checkCircuitBreaker(service);
    
    res.json({
      success: true,
      test: {
        service,
        errorCount,
        results,
        finalCircuitBreakerState: finalState,
        circuitBreakerTriggered: finalState.state === 'open'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Circuit breaker test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Run comprehensive error handling tests
 */
router.post('/test/comprehensive', async (req, res) => {
  try {
    const testResults = await tracingService.startActiveSpan('api.error_taxonomy_comprehensive_test', {
      attributes: {
        'test.type': 'comprehensive',
        'test.component': 'error_taxonomy_service'
      }
    }, async (span) => {
      
      const results = {
        classification: null,
        retry: null,
        circuitBreaker: null,
        errors: []
      };
      
      try {
        console.log('🧪 Running comprehensive error taxonomy tests...');
        
        // Test 1: Error Classification
        console.log('🔍 Testing error classification...');
        const testError = new Error('Test network connection refused');
        testError.code = 'ECONNREFUSED';
        
        const classification = await errorTaxonomyService.classifyError(testError, {
          service: 'test-classification'
        });
        
        results.classification = {
          success: true,
          category: classification.category,
          severity: classification.severity,
          retryable: classification.retryable,
          strategy: classification.strategy
        };
        
        // Test 2: Retry Logic
        console.log('🔄 Testing retry logic...');
        let retryAttempts = 0;
        
        const retryResult = await errorTaxonomyService.executeWithRetry(
          async () => {
            retryAttempts++;
            if (retryAttempts < 3) {
              const err = new Error('Test timeout error');
              err.code = 'ETIMEDOUT';
              throw err;
            }
            return { success: true, attempts: retryAttempts };
          },
          {
            service: 'test-retry',
            policyName: 'network',
            context: { test: true }
          }
        );
        
        results.retry = {
          success: true,
          totalAttempts: retryAttempts,
          result: retryResult
        };
        
        // Test 3: Circuit Breaker
        console.log('🚨 Testing circuit breaker...');
        const circuitBreakerService = 'test-circuit-breaker';
        
        // Trigger circuit breaker with multiple failures
        for (let i = 1; i <= 6; i++) {
          try {
            await errorTaxonomyService.executeWithRetry(
              async () => {
                const err = new Error('Internal server error');
                err.status = 500;
                throw err;
              },
              { 
                service: circuitBreakerService,
                policyName: 'critical'
              }
            );
          } catch (error) {
            // Expected to fail
          }
        }
        
        const circuitState = await errorTaxonomyService.checkCircuitBreaker(circuitBreakerService);
        
        results.circuitBreaker = {
          success: true,
          finalState: circuitState.state,
          opened: circuitState.state === 'open'
        };
        
        // Reset for cleanup
        await errorTaxonomyService.resetCircuitBreaker(circuitBreakerService);
        
      } catch (error) {
        results.errors.push(error.message);
        span.recordException(error);
      }
      
      span.setAttributes({
        'test.classification_success': !!results.classification?.success,
        'test.retry_success': !!results.retry?.success,
        'test.circuit_breaker_success': !!results.circuitBreaker?.success,
        'test.error_count': results.errors.length
      });
      
      return results;
    });
    
    const allTestsPassed = testResults.classification?.success && 
                          testResults.retry?.success && 
                          testResults.circuitBreaker?.success && 
                          testResults.errors.length === 0;
    
    res.json({
      success: allTestsPassed,
      tests: testResults,
      message: allTestsPassed ? 'All error taxonomy tests passed' : 'Some tests failed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error running comprehensive tests:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run comprehensive tests'
    });
  }
});

/**
 * Get available error classifiers and retry policies
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    configuration: {
      features: {
        error_classification: 'Automatic error categorization using patterns and HTTP codes',
        retry_logic: 'Configurable retry strategies with exponential backoff',
        circuit_breaker: 'Service resilience with circuit breaker patterns',
        error_monitoring: 'Real-time error metrics and statistics',
        integration_policies: 'Service-specific retry and failure handling'
      },
      error_categories: [
        'network', 'authentication', 'authorization', 'rate_limit',
        'data_validation', 'business_logic', 'system', 'configuration',
        'timeout', 'dependency', 'resource_exhaustion', 'concurrent_modification'
      ],
      retry_strategies: [
        'immediate', 'linear_backoff', 'exponential_backoff', 
        'fibonacci_backoff', 'fixed_interval', 'no_retry'
      ],
      severity_levels: ['critical', 'high', 'medium', 'low', 'info'],
      circuit_breaker_states: ['closed', 'open', 'half_open'],
      endpoints: {
        status: 'GET /api/error-taxonomy/status - Service status and configuration',
        statistics: 'GET /api/error-taxonomy/statistics - Error statistics and metrics',
        circuit_breakers: 'GET /api/error-taxonomy/circuit-breakers - Circuit breaker states',
        reset_circuit_breaker: 'POST /api/error-taxonomy/circuit-breakers/:service/reset',
        classify_error: 'POST /api/error-taxonomy/classify - Manually classify an error',
        test_retry: 'POST /api/error-taxonomy/test/retry - Test retry mechanisms',
        test_circuit_breaker: 'POST /api/error-taxonomy/test/circuit-breaker - Test circuit breaker',
        comprehensive_test: 'POST /api/error-taxonomy/test/comprehensive - Run all tests'
      },
      supported_services: [
        'notion', 'supabase', 'neo4j', 'xero', 'gmail', 
        'openai', 'anthropic', 'perplexity', 'kafka'
      ]
    }
  });
});

export default router;