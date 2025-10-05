/**
 * Error Taxonomy and Classification Service
 * Provides comprehensive error categorization, retry logic, and resilience patterns
 * for all integrations and data operations
 */

import tracingService, { traceExternalCall } from './tracingService.js';

// Error classification constants
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  RATE_LIMIT: 'rate_limit',
  DATA_VALIDATION: 'data_validation',
  BUSINESS_LOGIC: 'business_logic',
  SYSTEM: 'system',
  CONFIGURATION: 'configuration',
  TIMEOUT: 'timeout',
  DEPENDENCY: 'dependency',
  RESOURCE_EXHAUSTION: 'resource_exhaustion',
  CONCURRENT_MODIFICATION: 'concurrent_modification'
};

export const ERROR_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

export const RETRY_STRATEGY = {
  IMMEDIATE: 'immediate',
  LINEAR_BACKOFF: 'linear_backoff',
  EXPONENTIAL_BACKOFF: 'exponential_backoff',
  FIBONACCI_BACKOFF: 'fibonacci_backoff',
  FIXED_INTERVAL: 'fixed_interval',
  NO_RETRY: 'no_retry'
};

export const CIRCUIT_BREAKER_STATE = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open'
};

class ErrorTaxonomyService {
  constructor() {
    this.isInitialized = false;
    this.errorClassifiers = new Map();
    this.retryPolicies = new Map();
    this.circuitBreakers = new Map();
    this.errorMetrics = new Map();
    this.alertThresholds = new Map();
    this.config = {
      defaultMaxRetries: 3,
      defaultBaseDelay: 1000,
      defaultMaxDelay: 30000,
      circuitBreakerThreshold: 5,
      circuitBreakerWindow: 60000,
      circuitBreakerRecoveryTime: 30000,
      metricRetentionPeriod: 86400000 // 24 hours
    };
  }

  /**
   * Initialize the error taxonomy service
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Error Taxonomy Service...');
      
      // Set up error classifiers
      this.setupErrorClassifiers();
      
      // Configure retry policies
      this.setupRetryPolicies();
      
      // Initialize circuit breakers
      this.setupCircuitBreakers();
      
      // Configure alert thresholds
      this.setupAlertThresholds();
      
      // Start metric cleanup task
      this.startMetricCleanup();
      
      this.isInitialized = true;
      console.log('✅ Error Taxonomy Service initialized');
      console.log(`   - Error classifiers: ${this.errorClassifiers.size}`);
      console.log(`   - Retry policies: ${this.retryPolicies.size}`);
      console.log(`   - Circuit breakers: ${this.circuitBreakers.size}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Error Taxonomy Service:', error.message);
      return false;
    }
  }

  /**
   * Set up error classification rules
   */
  setupErrorClassifiers() {
    // Network errors
    this.errorClassifiers.set('network', {
      patterns: [
        /ECONNREFUSED/i,
        /ENOTFOUND/i,
        /ETIMEDOUT/i,
        /ECONNRESET/i,
        /EHOSTUNREACH/i,
        /ENETUNREACH/i,
        /socket.*timeout/i,
        /network.*error/i,
        /connection.*failed/i
      ],
      category: ERROR_CATEGORIES.NETWORK,
      severity: ERROR_SEVERITY.HIGH,
      retryable: true,
      strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF
    });

    // Authentication errors
    this.errorClassifiers.set('authentication', {
      patterns: [
        /unauthorized/i,
        /authentication.*failed/i,
        /invalid.*credentials/i,
        /token.*expired/i,
        /invalid.*token/i,
        /authentication.*required/i
      ],
      httpCodes: [401],
      category: ERROR_CATEGORIES.AUTHENTICATION,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: false,
      strategy: RETRY_STRATEGY.NO_RETRY
    });

    // Authorization errors
    this.errorClassifiers.set('authorization', {
      patterns: [
        /forbidden/i,
        /access.*denied/i,
        /insufficient.*permissions/i,
        /authorization.*failed/i
      ],
      httpCodes: [403],
      category: ERROR_CATEGORIES.AUTHORIZATION,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: false,
      strategy: RETRY_STRATEGY.NO_RETRY
    });

    // Rate limiting errors
    this.errorClassifiers.set('rate_limit', {
      patterns: [
        /rate.*limit.*exceeded/i,
        /too.*many.*requests/i,
        /quota.*exceeded/i,
        /throttled/i
      ],
      httpCodes: [429],
      category: ERROR_CATEGORIES.RATE_LIMIT,
      severity: ERROR_SEVERITY.MEDIUM,
      retryable: true,
      strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF
    });

    // Data validation errors
    this.errorClassifiers.set('data_validation', {
      patterns: [
        /validation.*failed/i,
        /invalid.*data/i,
        /bad.*request/i,
        /malformed/i,
        /schema.*error/i
      ],
      httpCodes: [400],
      category: ERROR_CATEGORIES.DATA_VALIDATION,
      severity: ERROR_SEVERITY.LOW,
      retryable: false,
      strategy: RETRY_STRATEGY.NO_RETRY
    });

    // Timeout errors
    this.errorClassifiers.set('timeout', {
      patterns: [
        /timeout/i,
        /timed.*out/i,
        /request.*timeout/i,
        /gateway.*timeout/i
      ],
      httpCodes: [408, 504],
      category: ERROR_CATEGORIES.TIMEOUT,
      severity: ERROR_SEVERITY.HIGH,
      retryable: true,
      strategy: RETRY_STRATEGY.LINEAR_BACKOFF
    });

    // System errors
    this.errorClassifiers.set('system', {
      patterns: [
        /internal.*server.*error/i,
        /service.*unavailable/i,
        /server.*error/i,
        /system.*error/i
      ],
      httpCodes: [500, 502, 503],
      category: ERROR_CATEGORIES.SYSTEM,
      severity: ERROR_SEVERITY.CRITICAL,
      retryable: true,
      strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF
    });

    // Database errors
    this.errorClassifiers.set('database', {
      patterns: [
        /database.*error/i,
        /connection.*pool/i,
        /deadlock/i,
        /constraint.*violation/i,
        /query.*timeout/i
      ],
      category: ERROR_CATEGORIES.DEPENDENCY,
      severity: ERROR_SEVERITY.HIGH,
      retryable: true,
      strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF
    });

    // Resource exhaustion
    this.errorClassifiers.set('resource_exhaustion', {
      patterns: [
        /out.*of.*memory/i,
        /resource.*exhausted/i,
        /too.*many.*connections/i,
        /disk.*full/i,
        /memory.*limit/i
      ],
      category: ERROR_CATEGORIES.RESOURCE_EXHAUSTION,
      severity: ERROR_SEVERITY.CRITICAL,
      retryable: true,
      strategy: RETRY_STRATEGY.LINEAR_BACKOFF
    });
  }

  /**
   * Set up retry policies for different services
   */
  setupRetryPolicies() {
    // Default policy
    this.retryPolicies.set('default', {
      maxRetries: 3,
      strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF,
      baseDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true
    });

    // Network operations
    this.retryPolicies.set('network', {
      maxRetries: 5,
      strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF,
      baseDelay: 500,
      maxDelay: 10000,
      multiplier: 2,
      jitter: true
    });

    // Database operations
    this.retryPolicies.set('database', {
      maxRetries: 3,
      strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF,
      baseDelay: 100,
      maxDelay: 5000,
      multiplier: 1.5,
      jitter: true
    });

    // API calls
    this.retryPolicies.set('api', {
      maxRetries: 4,
      strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF,
      baseDelay: 1000,
      maxDelay: 20000,
      multiplier: 2,
      jitter: true
    });

    // Rate limited operations
    this.retryPolicies.set('rate_limited', {
      maxRetries: 10,
      strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF,
      baseDelay: 2000,
      maxDelay: 60000,
      multiplier: 1.5,
      jitter: true
    });

    // Critical operations (no retry)
    this.retryPolicies.set('critical', {
      maxRetries: 0,
      strategy: RETRY_STRATEGY.NO_RETRY,
      baseDelay: 0,
      maxDelay: 0,
      multiplier: 1,
      jitter: false
    });
  }

  /**
   * Set up circuit breakers for different services
   */
  setupCircuitBreakers() {
    const services = [
      'notion', 'supabase', 'neo4j', 'xero', 'gmail', 
      'openai', 'anthropic', 'perplexity', 'kafka'
    ];

    services.forEach(service => {
      this.circuitBreakers.set(service, {
        state: CIRCUIT_BREAKER_STATE.CLOSED,
        failureCount: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
        threshold: this.config.circuitBreakerThreshold,
        window: this.config.circuitBreakerWindow,
        recoveryTime: this.config.circuitBreakerRecoveryTime
      });
    });
  }

  /**
   * Set up alert thresholds
   */
  setupAlertThresholds() {
    this.alertThresholds.set('error_rate', {
      threshold: 0.1, // 10% error rate
      window: 300000, // 5 minutes
      severity: ERROR_SEVERITY.HIGH
    });

    this.alertThresholds.set('circuit_breaker_open', {
      threshold: 1, // Any circuit breaker open
      window: 0, // Immediate
      severity: ERROR_SEVERITY.CRITICAL
    });

    this.alertThresholds.set('consecutive_failures', {
      threshold: 5, // 5 consecutive failures
      window: 0, // Immediate
      severity: ERROR_SEVERITY.HIGH
    });
  }

  /**
   * Classify an error and return categorization information
   */
  async classifyError(error, context = {}) {
    return await traceExternalCall('error_taxonomy', 'classify_error', async (span) => {
      try {
        const errorMessage = error.message || error.toString();
        const httpCode = error.status || error.statusCode || context.httpCode;
        const service = context.service || 'unknown';

        span.setAttributes({
          'error.message': errorMessage.substring(0, 200),
          'error.http_code': httpCode || 0,
          'error.service': service
        });

        // Try to match against classifiers
        for (const [name, classifier] of this.errorClassifiers.entries()) {
          let matched = false;

          // Check HTTP codes
          if (classifier.httpCodes && httpCode && classifier.httpCodes.includes(httpCode)) {
            matched = true;
          }

          // Check patterns
          if (!matched && classifier.patterns) {
            matched = classifier.patterns.some(pattern => pattern.test(errorMessage));
          }

          if (matched) {
            const classification = {
              id: this.generateErrorId(),
              category: classifier.category,
              severity: classifier.severity,
              retryable: classifier.retryable,
              strategy: classifier.strategy,
              classifier: name,
              error: {
                message: errorMessage,
                stack: error.stack,
                code: error.code,
                httpCode
              },
              context: {
                service,
                timestamp: new Date().toISOString(),
                ...context
              },
              metadata: {
                classifiedAt: Date.now(),
                classifierVersion: '1.0.0'
              }
            };

            // Record metrics
            this.recordErrorMetric(classification);

            // Check circuit breaker
            await this.updateCircuitBreaker(service, classification);

            span.setAttributes({
              'error.category': classification.category,
              'error.severity': classification.severity,
              'error.retryable': classification.retryable,
              'error.strategy': classification.strategy
            });

            return classification;
          }
        }

        // Default classification for unmatched errors
        const defaultClassification = {
          id: this.generateErrorId(),
          category: ERROR_CATEGORIES.SYSTEM,
          severity: ERROR_SEVERITY.MEDIUM,
          retryable: true,
          strategy: RETRY_STRATEGY.EXPONENTIAL_BACKOFF,
          classifier: 'default',
          error: {
            message: errorMessage,
            stack: error.stack,
            code: error.code,
            httpCode
          },
          context: {
            service,
            timestamp: new Date().toISOString(),
            ...context
          },
          metadata: {
            classifiedAt: Date.now(),
            classifierVersion: '1.0.0'
          }
        };

        this.recordErrorMetric(defaultClassification);
        await this.updateCircuitBreaker(service, defaultClassification);

        return defaultClassification;

      } catch (classificationError) {
        span.recordException(classificationError);
        throw classificationError;
      }
    });
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry(operation, options = {}) {
    return await traceExternalCall('error_taxonomy', 'execute_with_retry', async (span) => {
      const {
        service = 'unknown',
        policyName = 'default',
        context = {},
        onRetry = null,
        onFailure = null
      } = options;

      const policy = this.retryPolicies.get(policyName) || this.retryPolicies.get('default');
      
      span.setAttributes({
        'retry.service': service,
        'retry.policy': policyName,
        'retry.max_retries': policy.maxRetries,
        'retry.strategy': policy.strategy
      });

      // Check circuit breaker
      const circuitBreakerCheck = await this.checkCircuitBreaker(service);
      if (!circuitBreakerCheck.allowed) {
        const error = new Error(`Circuit breaker is ${circuitBreakerCheck.state} for service: ${service}`);
        error.circuitBreakerState = circuitBreakerCheck.state;
        throw error;
      }

      let lastError = null;
      let attempt = 0;

      while (attempt <= policy.maxRetries) {
        try {
          span.setAttributes({
            'retry.attempt': attempt,
            'retry.is_retry': attempt > 0
          });

          const result = await operation();
          
          // Success - reset circuit breaker failure count
          await this.recordSuccess(service);
          
          span.setAttributes({
            'retry.succeeded': true,
            'retry.total_attempts': attempt + 1
          });

          return result;

        } catch (error) {
          lastError = error;
          attempt++;

          // Classify the error
          const classification = await this.classifyError(error, { service, ...context });
          
          span.setAttributes({
            'retry.error_category': classification.category,
            'retry.error_retryable': classification.retryable
          });

          // If error is not retryable or we've exceeded max retries
          if (!classification.retryable || attempt > policy.maxRetries) {
            if (onFailure) {
              await onFailure(classification, attempt);
            }
            
            span.setAttributes({
              'retry.failed': true,
              'retry.total_attempts': attempt,
              'retry.final_error_category': classification.category
            });

            throw error;
          }

          // Calculate delay for next retry
          const delay = this.calculateRetryDelay(attempt, policy, classification);
          
          if (onRetry) {
            await onRetry(classification, attempt, delay);
          }

          console.warn(`🔄 Retrying operation (attempt ${attempt}/${policy.maxRetries}) after ${delay}ms:`, {
            service,
            error: error.message.substring(0, 100),
            category: classification.category
          });

          // Wait before retry
          await this.sleep(delay);
        }
      }

      // Should not reach here, but just in case
      throw lastError;
    });
  }

  /**
   * Check circuit breaker state
   */
  async checkCircuitBreaker(service) {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) {
      return { allowed: true, state: CIRCUIT_BREAKER_STATE.CLOSED };
    }

    const now = Date.now();

    switch (breaker.state) {
      case CIRCUIT_BREAKER_STATE.CLOSED:
        return { allowed: true, state: breaker.state };

      case CIRCUIT_BREAKER_STATE.OPEN:
        if (now >= breaker.nextAttemptTime) {
          // Transition to half-open
          breaker.state = CIRCUIT_BREAKER_STATE.HALF_OPEN;
          console.log(`🔄 Circuit breaker transitioning to HALF_OPEN for service: ${service}`);
          return { allowed: true, state: breaker.state };
        }
        return { allowed: false, state: breaker.state };

      case CIRCUIT_BREAKER_STATE.HALF_OPEN:
        return { allowed: true, state: breaker.state };

      default:
        return { allowed: true, state: CIRCUIT_BREAKER_STATE.CLOSED };
    }
  }

  /**
   * Update circuit breaker based on operation result
   */
  async updateCircuitBreaker(service, classification) {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return;

    const now = Date.now();

    if (classification.category === ERROR_CATEGORIES.SYSTEM || 
        classification.severity === ERROR_SEVERITY.CRITICAL) {
      
      breaker.failureCount++;
      breaker.lastFailureTime = now;

      if (breaker.state === CIRCUIT_BREAKER_STATE.HALF_OPEN) {
        // Failure in half-open state - go back to open
        breaker.state = CIRCUIT_BREAKER_STATE.OPEN;
        breaker.nextAttemptTime = now + breaker.recoveryTime;
        console.warn(`🚨 Circuit breaker OPEN for service: ${service} (failure in half-open)`);
      } else if (breaker.state === CIRCUIT_BREAKER_STATE.CLOSED && 
                 breaker.failureCount >= breaker.threshold) {
        // Too many failures - open the circuit
        breaker.state = CIRCUIT_BREAKER_STATE.OPEN;
        breaker.nextAttemptTime = now + breaker.recoveryTime;
        console.warn(`🚨 Circuit breaker OPEN for service: ${service} (threshold exceeded: ${breaker.failureCount})`);
      }
    }
  }

  /**
   * Record successful operation
   */
  async recordSuccess(service) {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return;

    if (breaker.state === CIRCUIT_BREAKER_STATE.HALF_OPEN) {
      // Success in half-open - close the circuit
      breaker.state = CIRCUIT_BREAKER_STATE.CLOSED;
      breaker.failureCount = 0;
      console.log(`✅ Circuit breaker CLOSED for service: ${service} (recovery successful)`);
    } else if (breaker.state === CIRCUIT_BREAKER_STATE.CLOSED) {
      // Reset failure count on success
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
  }

  /**
   * Calculate retry delay based on strategy
   */
  calculateRetryDelay(attempt, policy, classification) {
    let delay = policy.baseDelay;

    switch (policy.strategy) {
      case RETRY_STRATEGY.IMMEDIATE:
        delay = 0;
        break;

      case RETRY_STRATEGY.FIXED_INTERVAL:
        delay = policy.baseDelay;
        break;

      case RETRY_STRATEGY.LINEAR_BACKOFF:
        delay = policy.baseDelay * attempt;
        break;

      case RETRY_STRATEGY.EXPONENTIAL_BACKOFF:
        delay = policy.baseDelay * Math.pow(policy.multiplier, attempt - 1);
        break;

      case RETRY_STRATEGY.FIBONACCI_BACKOFF:
        delay = policy.baseDelay * this.fibonacci(attempt);
        break;

      default:
        delay = policy.baseDelay * Math.pow(2, attempt - 1);
    }

    // Apply jitter if enabled
    if (policy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    // Respect max delay
    delay = Math.min(delay, policy.maxDelay);

    // Special handling for rate limits
    if (classification.category === ERROR_CATEGORIES.RATE_LIMIT) {
      delay = Math.max(delay, 5000); // Minimum 5 second delay for rate limits
    }

    return Math.round(delay);
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record error metrics
   */
  recordErrorMetric(classification) {
    const key = `${classification.context.service}_${classification.category}`;
    const now = Date.now();

    if (!this.errorMetrics.has(key)) {
      this.errorMetrics.set(key, {
        service: classification.context.service,
        category: classification.category,
        count: 0,
        firstSeen: now,
        lastSeen: now,
        samples: []
      });
    }

    const metric = this.errorMetrics.get(key);
    metric.count++;
    metric.lastSeen = now;
    metric.samples.push({
      timestamp: now,
      severity: classification.severity,
      message: classification.error.message.substring(0, 100)
    });

    // Keep only recent samples
    metric.samples = metric.samples.filter(s => now - s.timestamp < this.config.metricRetentionPeriod);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(service = null, timeWindow = 3600000) {
    const now = Date.now();
    const stats = {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      errorsByService: {},
      circuitBreakerStates: {},
      timeWindow,
      generatedAt: now
    };

    // Collect error metrics
    for (const [key, metric] of this.errorMetrics.entries()) {
      if (service && metric.service !== service) continue;

      const recentSamples = metric.samples.filter(s => now - s.timestamp < timeWindow);
      
      if (recentSamples.length > 0) {
        stats.totalErrors += recentSamples.length;
        
        stats.errorsByCategory[metric.category] = 
          (stats.errorsByCategory[metric.category] || 0) + recentSamples.length;
        
        stats.errorsByService[metric.service] = 
          (stats.errorsByService[metric.service] || 0) + recentSamples.length;

        recentSamples.forEach(sample => {
          stats.errorsBySeverity[sample.severity] = 
            (stats.errorsBySeverity[sample.severity] || 0) + 1;
        });
      }
    }

    // Collect circuit breaker states
    for (const [service, breaker] of this.circuitBreakers.entries()) {
      stats.circuitBreakerStates[service] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailureTime: breaker.lastFailureTime
      };
    }

    return stats;
  }

  /**
   * Reset circuit breaker
   */
  async resetCircuitBreaker(service) {
    const breaker = this.circuitBreakers.get(service);
    if (breaker) {
      breaker.state = CIRCUIT_BREAKER_STATE.CLOSED;
      breaker.failureCount = 0;
      breaker.lastFailureTime = null;
      breaker.nextAttemptTime = null;
      console.log(`🔄 Circuit breaker manually reset for service: ${service}`);
      return true;
    }
    return false;
  }

  /**
   * Fibonacci calculation for backoff
   */
  fibonacci(n) {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start periodic metric cleanup
   */
  startMetricCleanup() {
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000); // Run every hour
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const now = Date.now();
    const cutoff = now - this.config.metricRetentionPeriod;

    for (const [key, metric] of this.errorMetrics.entries()) {
      metric.samples = metric.samples.filter(s => s.timestamp > cutoff);
      
      if (metric.samples.length === 0 && metric.lastSeen < cutoff) {
        this.errorMetrics.delete(key);
      }
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      errorClassifiers: this.errorClassifiers.size,
      retryPolicies: this.retryPolicies.size,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([service, breaker]) => ({
        service,
        state: breaker.state,
        failureCount: breaker.failureCount
      })),
      totalErrorMetrics: this.errorMetrics.size,
      config: this.config
    };
  }

  /**
   * Close service and cleanup
   */
  async close() {
    console.log('🔧 Closing Error Taxonomy Service...');
    
    // Clear all data
    this.errorClassifiers.clear();
    this.retryPolicies.clear();
    this.circuitBreakers.clear();
    this.errorMetrics.clear();
    this.alertThresholds.clear();
    
    this.isInitialized = false;
    console.log('✅ Error Taxonomy Service closed');
  }
}

// Create singleton instance
const errorTaxonomyService = new ErrorTaxonomyService();

export default errorTaxonomyService;

// Export utility functions
export const classifyError = (error, context) => 
  errorTaxonomyService.classifyError(error, context);

export const executeWithRetry = (operation, options) => 
  errorTaxonomyService.executeWithRetry(operation, options);

export const getErrorStatistics = (service, timeWindow) => 
  errorTaxonomyService.getErrorStatistics(service, timeWindow);