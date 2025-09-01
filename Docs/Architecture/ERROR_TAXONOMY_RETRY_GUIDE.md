# Error Taxonomy and Retry Logic Guide

## Table of Contents
1. [Overview](#overview)
2. [Error Classification System](#error-classification-system)
3. [Retry Strategies](#retry-strategies)
4. [Circuit Breaker Pattern](#circuit-breaker-pattern)
5. [Service Integration](#service-integration)
6. [Wrapper Functions](#wrapper-functions)
7. [Monitoring and Metrics](#monitoring-and-metrics)
8. [Configuration](#configuration)
9. [API Reference](#api-reference)
10. [Best Practices](#best-practices)

## Overview

The ACT Placemat platform implements a comprehensive Error Taxonomy and Retry Logic system that automatically classifies errors, applies intelligent retry strategies, and maintains service resilience through circuit breaker patterns. This system ensures robust operation in the face of transient failures and service degradation.

### Key Features
- **Automatic Error Classification**: Pattern-based categorization of 12 error types
- **Intelligent Retry Logic**: 6 different retry strategies with configurable parameters
- **Circuit Breaker Protection**: Per-service circuit breakers preventing cascade failures
- **Comprehensive Monitoring**: Real-time error metrics and alerting
- **Service Integration**: Wrapper functions for seamless integration with existing code

### Error Categories Supported
- **Network**: Connection failures, timeouts, DNS issues
- **Authentication**: Token expiry, invalid credentials, session issues
- **Authorization**: Permission denied, access control violations
- **Rate Limiting**: Quota exceeded, throttling, API limits
- **Data Validation**: Schema errors, malformed input, type mismatches
- **Business Logic**: Application-specific validation failures
- **System**: Internal server errors, dependency failures, crashes
- **Configuration**: Setup errors, missing config, invalid settings
- **Timeout**: Request timeouts, gateway timeouts, processing delays
- **Dependency**: External service failures, database connectivity
- **Resource Exhaustion**: Memory limits, connection pools, disk space
- **Concurrent Modification**: Race conditions, optimistic locking conflicts

## Error Classification System

### Service Architecture
**Location**: `/apps/backend/src/services/errorTaxonomyService.js`

```javascript
class ErrorTaxonomyService {
  constructor() {
    this.errorClassifiers = new Map();
    this.retryPolicies = new Map();
    this.circuitBreakers = new Map();
    this.errorMetrics = new Map();
    this.config = {
      defaultMaxRetries: 3,
      defaultBaseDelay: 1000,
      defaultMaxDelay: 30000,
      circuitBreakerThreshold: 5,
      circuitBreakerWindow: 60000,
      circuitBreakerRecoveryTime: 30000
    };
  }
}
```

### Pattern-Based Classification

```javascript
// Network error classification
const networkErrorClassifier = {
  patterns: [
    /ECONNREFUSED/i,        // Connection refused
    /ENOTFOUND/i,           // DNS lookup failed
    /ETIMEDOUT/i,           // Connection timeout
    /ECONNRESET/i,          // Connection reset
    /EHOSTUNREACH/i,        // Host unreachable
    /ENETUNREACH/i,         // Network unreachable
    /socket.*timeout/i,     // Socket timeout
    /network.*error/i,      // Generic network error
    /connection.*failed/i   // Connection failure
  ],
  category: 'network',
  severity: 'high',
  retryable: true,
  strategy: 'exponential_backoff'
};

// Authentication error classification
const authenticationErrorClassifier = {
  patterns: [
    /unauthorized/i,
    /authentication.*failed/i,
    /invalid.*credentials/i,
    /token.*expired/i,
    /invalid.*token/i,
    /authentication.*required/i
  ],
  httpCodes: [401],
  category: 'authentication',
  severity: 'medium',
  retryable: false,
  strategy: 'no_retry'
};

// Rate limiting error classification
const rateLimitErrorClassifier = {
  patterns: [
    /rate.*limit.*exceeded/i,
    /too.*many.*requests/i,
    /quota.*exceeded/i,
    /throttled/i
  ],
  httpCodes: [429],
  category: 'rate_limit',
  severity: 'medium',
  retryable: true,
  strategy: 'exponential_backoff'
};
```

### Classification Process

```javascript
async function classifyError(error, context = {}) {
  return await traceExternalCall('error_taxonomy', 'classify_error', async (span) => {
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
      
      // Check HTTP codes first (more specific)
      if (classifier.httpCodes && httpCode && classifier.httpCodes.includes(httpCode)) {
        matched = true;
      }
      
      // Check message patterns
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
        
        // Record metrics and update circuit breaker
        this.recordErrorMetric(classification);
        await this.updateCircuitBreaker(service, classification);
        
        span.setAttributes({
          'error.category': classification.category,
          'error.severity': classification.severity,
          'error.retryable': classification.retryable
        });
        
        return classification;
      }
    }
    
    // Default classification for unmatched errors
    return this.createDefaultClassification(error, context);
  });
}
```

### Error Severity Levels

```javascript
const ERROR_SEVERITY = {
  CRITICAL: 'critical',  // System failure, immediate attention required
  HIGH: 'high',         // Service degradation, affects functionality
  MEDIUM: 'medium',     // Recoverable error, may impact performance
  LOW: 'low',          // Minor issue, limited impact
  INFO: 'info'         // Informational, no action required
};

// Severity assignment rules
const severityRules = {
  network: 'high',           // Network issues affect connectivity
  authentication: 'medium',  // Auth issues need user action
  authorization: 'medium',   // Permission issues need resolution
  rate_limit: 'medium',     // Rate limits are expected, manageable
  data_validation: 'low',    // Validation errors are client-side
  business_logic: 'low',     // Business rules, expected behavior
  system: 'critical',       // System errors are serious
  configuration: 'high',    // Config errors affect functionality
  timeout: 'high',          // Timeouts indicate performance issues
  dependency: 'high',       // External dependencies are critical
  resource_exhaustion: 'critical', // Resource issues are serious
  concurrent_modification: 'medium' // Concurrency issues are manageable
};
```

## Retry Strategies

### Available Strategies

```javascript
const RETRY_STRATEGY = {
  IMMEDIATE: 'immediate',              // No delay between retries
  LINEAR_BACKOFF: 'linear_backoff',    // Linear increase in delay
  EXPONENTIAL_BACKOFF: 'exponential_backoff', // Exponential increase
  FIBONACCI_BACKOFF: 'fibonacci_backoff',     // Fibonacci sequence
  FIXED_INTERVAL: 'fixed_interval',    // Fixed delay between retries
  NO_RETRY: 'no_retry'                // No retries attempted
};
```

### Retry Policy Configuration

```javascript
// Default retry policy
const defaultRetryPolicy = {
  maxRetries: 3,
  strategy: 'exponential_backoff',
  baseDelay: 1000,      // 1 second
  maxDelay: 30000,      // 30 seconds
  multiplier: 2,
  jitter: true          // Add randomness to prevent thundering herd
};

// Network-specific policy
const networkRetryPolicy = {
  maxRetries: 5,
  strategy: 'exponential_backoff',
  baseDelay: 500,       // 0.5 seconds
  maxDelay: 10000,      // 10 seconds
  multiplier: 2,
  jitter: true
};

// Database-specific policy
const databaseRetryPolicy = {
  maxRetries: 3,
  strategy: 'exponential_backoff',
  baseDelay: 100,       // 0.1 seconds
  maxDelay: 5000,       // 5 seconds
  multiplier: 1.5,
  jitter: true
};

// API-specific policy
const apiRetryPolicy = {
  maxRetries: 4,
  strategy: 'exponential_backoff',
  baseDelay: 1000,      // 1 second
  maxDelay: 20000,      // 20 seconds
  multiplier: 2,
  jitter: true
};

// Rate-limited operations policy
const rateLimitedRetryPolicy = {
  maxRetries: 10,
  strategy: 'exponential_backoff',
  baseDelay: 2000,      // 2 seconds (respect rate limits)
  maxDelay: 60000,      // 1 minute
  multiplier: 1.5,
  jitter: true
};
```

### Delay Calculation Algorithms

```javascript
// Calculate retry delay based on strategy
function calculateRetryDelay(attempt, policy, classification) {
  let delay = policy.baseDelay;
  
  switch (policy.strategy) {
    case 'immediate':
      delay = 0;
      break;
      
    case 'fixed_interval':
      delay = policy.baseDelay;
      break;
      
    case 'linear_backoff':
      delay = policy.baseDelay * attempt;
      break;
      
    case 'exponential_backoff':
      delay = policy.baseDelay * Math.pow(policy.multiplier, attempt - 1);
      break;
      
    case 'fibonacci_backoff':
      delay = policy.baseDelay * this.fibonacci(attempt);
      break;
      
    default:
      delay = policy.baseDelay * Math.pow(2, attempt - 1);
  }
  
  // Apply jitter if enabled (prevent thundering herd)
  if (policy.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  // Respect maximum delay
  delay = Math.min(delay, policy.maxDelay);
  
  // Special handling for rate limits
  if (classification.category === 'rate_limit') {
    delay = Math.max(delay, 5000); // Minimum 5 seconds for rate limits
  }
  
  return Math.round(delay);
}

// Fibonacci sequence for backoff
function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}
```

### Retry Execution

```javascript
async function executeWithRetry(operation, options = {}) {
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
    
    // Check circuit breaker before attempting
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
        
        // Execute the operation
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
        
        // Check if error is retryable and we haven't exceeded max retries
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
```

## Circuit Breaker Pattern

### Circuit Breaker States

```javascript
const CIRCUIT_BREAKER_STATE = {
  CLOSED: 'closed',      // Normal operation, requests allowed
  OPEN: 'open',          // Blocking requests, service degraded
  HALF_OPEN: 'half_open' // Testing if service has recovered
};
```

### Circuit Breaker Configuration

```javascript
// Per-service circuit breaker setup
const circuitBreakerConfigs = {
  notion: {
    threshold: 5,          // Open after 5 failures
    window: 60000,         // 1 minute failure window
    recoveryTime: 30000    // 30 seconds before half-open
  },
  supabase: {
    threshold: 3,          // Open after 3 failures (database is critical)
    window: 60000,         // 1 minute failure window
    recoveryTime: 15000    // 15 seconds before half-open
  },
  xero: {
    threshold: 10,         // Open after 10 failures (external API)
    window: 60000,         // 1 minute failure window
    recoveryTime: 60000    // 1 minute before half-open
  },
  gmail: {
    threshold: 5,          // Open after 5 failures
    window: 60000,         // 1 minute failure window
    recoveryTime: 45000    // 45 seconds before half-open
  }
};
```

### Circuit Breaker Logic

```javascript
// Check circuit breaker state
async function checkCircuitBreaker(service) {
  const breaker = this.circuitBreakers.get(service);
  if (!breaker) {
    return { allowed: true, state: 'closed' };
  }
  
  const now = Date.now();
  
  switch (breaker.state) {
    case 'closed':
      // Normal operation
      return { allowed: true, state: breaker.state };
      
    case 'open':
      // Check if recovery time has passed
      if (now >= breaker.nextAttemptTime) {
        // Transition to half-open
        breaker.state = 'half_open';
        console.log(`🔄 Circuit breaker transitioning to HALF_OPEN for service: ${service}`);
        return { allowed: true, state: breaker.state };
      }
      return { allowed: false, state: breaker.state };
      
    case 'half_open':
      // Allow limited requests to test recovery
      return { allowed: true, state: breaker.state };
      
    default:
      return { allowed: true, state: 'closed' };
  }
}

// Update circuit breaker based on operation result
async function updateCircuitBreaker(service, classification) {
  const breaker = this.circuitBreakers.get(service);
  if (!breaker) return;
  
  const now = Date.now();
  
  // Check if this error should trigger circuit breaker
  if (classification.category === 'system' || classification.severity === 'critical') {
    breaker.failureCount++;
    breaker.lastFailureTime = now;
    
    if (breaker.state === 'half_open') {
      // Failure in half-open state - go back to open
      breaker.state = 'open';
      breaker.nextAttemptTime = now + breaker.recoveryTime;
      console.warn(`🚨 Circuit breaker OPEN for service: ${service} (failure in half-open)`);
      
    } else if (breaker.state === 'closed' && breaker.failureCount >= breaker.threshold) {
      // Too many failures - open the circuit
      breaker.state = 'open';
      breaker.nextAttemptTime = now + breaker.recoveryTime;
      console.warn(`🚨 Circuit breaker OPEN for service: ${service} (threshold exceeded: ${breaker.failureCount})`);
    }
  }
}

// Record successful operation
async function recordSuccess(service) {
  const breaker = this.circuitBreakers.get(service);
  if (!breaker) return;
  
  if (breaker.state === 'half_open') {
    // Success in half-open - close the circuit
    breaker.state = 'closed';
    breaker.failureCount = 0;
    console.log(`✅ Circuit breaker CLOSED for service: ${service} (recovery successful)`);
    
  } else if (breaker.state === 'closed') {
    // Reset failure count on success (gradual recovery)
    breaker.failureCount = Math.max(0, breaker.failureCount - 1);
  }
}
```

## Service Integration

### Wrapper Functions
**Location**: `/apps/backend/src/utils/errorTaxonomyWrappers.js`

```javascript
// Database operations wrapper
export function wrapDatabaseOperation(operation, tableName, options = {}) {
  return errorTaxonomyService.executeWithRetry(
    operation,
    {
      service: 'supabase',
      policyName: 'database',
      context: { 
        table: tableName,
        operation: options.operation || 'unknown',
        ...options.context 
      },
      onRetry: (classification, attempt, delay) => {
        console.log(`🔄 Database retry ${attempt}: ${classification.category} error on ${tableName}, waiting ${delay}ms`);
      },
      onFailure: (classification, attempts) => {
        console.error(`❌ Database operation failed after ${attempts} attempts on ${tableName}: ${classification.category}`);
      }
    }
  );
}

// Supabase query wrapper with enhanced error handling
export async function wrapSupabaseQuery(supabaseClient, queryBuilder, tableName, operation, options = {}) {
  return await wrapDatabaseOperation(
    async () => {
      const { data, error } = await queryBuilder;
      if (error) {
        // Enhance error with additional context
        const enhancedError = new Error(error.message);
        enhancedError.code = error.code;
        enhancedError.hint = error.hint;
        enhancedError.details = error.details;
        throw enhancedError;
      }
      return data;
    },
    tableName,
    {
      operation,
      ...options
    }
  );
}

// External API wrapper
export function wrapExternalApiCall(operation, serviceName, operationType, options = {}) {
  return errorTaxonomyService.executeWithRetry(
    operation,
    {
      service: serviceName,
      policyName: options.policyName || 'api',
      context: { 
        operation: operationType,
        url: options.url,
        method: options.method,
        ...options.context 
      },
      onRetry: (classification, attempt, delay) => {
        console.log(`🔄 ${serviceName} retry ${attempt}: ${classification.category} error on ${operationType}, waiting ${delay}ms`);
      },
      onFailure: (classification, attempts) => {
        console.error(`❌ ${serviceName} operation failed after ${attempts} attempts on ${operationType}: ${classification.category}`);
      }
    }
  );
}

// Notion API wrapper
export function wrapNotionOperation(operation, operationType, options = {}) {
  return wrapExternalApiCall(operation, 'notion', operationType, {
    policyName: 'api',
    ...options
  });
}
```

### Pre-configured Service Wrappers

```javascript
// Create service-specific wrappers
export const supabaseWrapper = createServiceWrapper('supabase', 'database');
export const notionWrapper = createServiceWrapper('notion', 'api');
export const xeroWrapper = createServiceWrapper('xero', 'api');
export const gmailWrapper = createServiceWrapper('gmail', 'api');

// Usage examples
const projects = await notionWrapper.wrap(
  () => notionClient.databases.query({ database_id: 'projects' }),
  'query_projects'
);

const users = await supabaseWrapper.wrap(
  () => supabaseClient.from('users').select('*'),
  'select_users'
);

const invoices = await xeroWrapper.wrapWithCircuitBreaker(
  () => xeroClient.accounting.getInvoices(),
  'get_invoices'
);
```

## Monitoring and Metrics

### Error Metrics Collection

```javascript
// Real-time error metrics
const errorMetrics = {
  totalErrors: 0,
  errorsByCategory: {
    network: 45,
    authentication: 12,
    rate_limit: 8,
    system: 23,
    timeout: 15,
    dependency: 7
  },
  errorsBySeverity: {
    critical: 5,
    high: 32,
    medium: 41,
    low: 10,
    info: 2
  },
  errorsByService: {
    notion: 18,
    supabase: 5,
    xero: 42,
    gmail: 8
  },
  circuitBreakerStates: {
    notion: 'closed',
    supabase: 'closed',
    xero: 'half_open',
    gmail: 'closed'
  },
  retryStatistics: {
    totalRetries: 156,
    successfulRetries: 142,
    failedRetries: 14,
    averageRetryCount: 2.3
  }
};

// Error rate calculation
function calculateErrorRate(service = null, timeWindow = 3600000) {
  const now = Date.now();
  const stats = this.getErrorStatistics(service, timeWindow);
  
  const totalOperations = stats.totalErrors + stats.successfulOperations;
  const errorRate = totalOperations > 0 ? (stats.totalErrors / totalOperations) * 100 : 0;
  
  return {
    errorRate: errorRate,
    totalErrors: stats.totalErrors,
    totalOperations: totalOperations,
    timeWindow: timeWindow,
    service: service
  };
}
```

### Alerting and Notifications

```javascript
// Alert thresholds configuration
const alertThresholds = {
  error_rate: {
    threshold: 0.1,           // 10% error rate
    window: 300000,           // 5 minutes
    severity: 'high'
  },
  circuit_breaker_open: {
    threshold: 1,             // Any circuit breaker open
    window: 0,                // Immediate
    severity: 'critical'
  },
  consecutive_failures: {
    threshold: 5,             // 5 consecutive failures
    window: 0,                // Immediate
    severity: 'high'
  },
  service_degradation: {
    threshold: 0.05,          // 5% error rate
    window: 600000,           // 10 minutes
    severity: 'medium'
  }
};

// Check alert thresholds
async function checkAlertThresholds(eventType, event) {
  const threshold = this.alertThresholds.get(eventType);
  if (!threshold) return;
  
  const recentEvents = await this.getRecentEvents(eventType, threshold.window);
  
  if (recentEvents.length >= threshold.threshold) {
    await this.triggerAlert({
      type: eventType,
      severity: threshold.severity,
      threshold: threshold.threshold,
      actual: recentEvents.length,
      events: recentEvents.slice(-5), // Last 5 events for context
      timestamp: new Date().toISOString()
    });
  }
}
```

## Configuration

### Environment Variables

```javascript
// Error taxonomy configuration
const errorTaxonomyConfig = {
  // Feature toggles
  ERROR_TAXONOMY_ENABLED: process.env.ERROR_TAXONOMY_ENABLED !== 'false',
  CIRCUIT_BREAKER_ENABLED: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
  RETRY_LOGIC_ENABLED: process.env.RETRY_LOGIC_ENABLED !== 'false',
  
  // Retry configuration
  DEFAULT_MAX_RETRIES: parseInt(process.env.DEFAULT_MAX_RETRIES) || 3,
  DEFAULT_BASE_DELAY: parseInt(process.env.DEFAULT_BASE_DELAY) || 1000,
  DEFAULT_MAX_DELAY: parseInt(process.env.DEFAULT_MAX_DELAY) || 30000,
  
  // Circuit breaker configuration
  CIRCUIT_BREAKER_THRESHOLD: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD) || 5,
  CIRCUIT_BREAKER_WINDOW: parseInt(process.env.CIRCUIT_BREAKER_WINDOW) || 60000,
  CIRCUIT_BREAKER_RECOVERY_TIME: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIME) || 30000,
  
  // Monitoring configuration
  METRIC_RETENTION_PERIOD: parseInt(process.env.METRIC_RETENTION_PERIOD) || 86400000, // 24 hours
  ERROR_ALERTING_ENABLED: process.env.ERROR_ALERTING_ENABLED !== 'false',
  
  // Logging configuration
  ERROR_LOGGING_ENABLED: process.env.ERROR_LOGGING_ENABLED !== 'false',
  ERROR_LOG_LEVEL: process.env.ERROR_LOG_LEVEL || 'warn'
};
```

## API Reference

### Error Taxonomy APIs

```
GET /api/error-taxonomy/status              - Service status and configuration
GET /api/error-taxonomy/statistics          - Error statistics and metrics  
GET /api/error-taxonomy/circuit-breakers    - Circuit breaker states
POST /api/error-taxonomy/circuit-breakers/:service/reset  - Reset circuit breaker
POST /api/error-taxonomy/classify           - Manually classify an error
POST /api/error-taxonomy/test/retry         - Test retry mechanisms
POST /api/error-taxonomy/test/circuit-breaker  - Test circuit breaker functionality
POST /api/error-taxonomy/test/comprehensive - Run comprehensive tests
GET /api/error-taxonomy/config              - Get service configuration
```

### Example API Usage

```javascript
// Get service status
const status = await fetch('/api/error-taxonomy/status');
const statusData = await status.json();
console.log('Error Taxonomy Status:', statusData);

// Get error statistics
const stats = await fetch('/api/error-taxonomy/statistics?service=notion&timeWindow=3600000');
const statsData = await stats.json();
console.log('Notion Error Stats:', statsData);

// Classify an error manually
const classification = await fetch('/api/error-taxonomy/classify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    error: {
      message: 'Connection timeout',
      code: 'ETIMEDOUT'
    },
    context: {
      service: 'notion',
      operation: 'database_query'
    }
  })
});

// Reset circuit breaker
await fetch('/api/error-taxonomy/circuit-breakers/xero/reset', {
  method: 'POST'
});

// Run comprehensive tests
const testResults = await fetch('/api/error-taxonomy/test/comprehensive', {
  method: 'POST'
});
```

## Best Practices

### Error Handling Guidelines

```javascript
// ✅ Good error handling practices

// 1. Use wrapper functions for automatic retry
const users = await wrapSupabaseQuery(
  supabaseClient.from('users').select('*'),
  'users',
  'select'
);

// 2. Provide meaningful context
const result = await errorTaxonomyService.executeWithRetry(
  operation,
  {
    service: 'notion',
    policyName: 'api',
    context: {
      operation: 'create_project',
      user_id: 'user_123',
      project_type: 'community'
    }
  }
);

// 3. Handle circuit breaker states
try {
  const data = await externalApiCall();
} catch (error) {
  if (error.circuitBreakerState === 'open') {
    // Provide alternative or cached data
    return await getCachedData();
  }
  throw error;
}

// 4. Implement graceful degradation
async function getProjectsWithFallback() {
  try {
    return await wrapNotionOperation(
      () => notionClient.databases.query({ database_id: 'projects' }),
      'get_projects'
    );
  } catch (error) {
    if (error.circuitBreakerState === 'open') {
      console.warn('Notion unavailable, using cached projects');
      return await getCachedProjects();
    }
    throw error;
  }
}

// ❌ Avoid these patterns

// Don't ignore errors
try {
  await riskyOperation();
} catch (error) {
  // Silent failure - bad!
}

// Don't retry non-retryable errors
if (error.status === 401) {
  await retryOperation(); // Authentication errors shouldn't be retried
}

// Don't implement custom retry logic
let retries = 0;
while (retries < 3) {
  try {
    await operation();
    break;
  } catch (error) {
    retries++;
    await sleep(1000 * retries);
  }
}
```

### Configuration Best Practices

```javascript
// ✅ Good configuration practices

// 1. Environment-specific settings
const retryConfig = {
  development: {
    maxRetries: 2,
    baseDelay: 500,
    enableLogging: true
  },
  staging: {
    maxRetries: 3,
    baseDelay: 1000,
    enableLogging: true
  },
  production: {
    maxRetries: 5,
    baseDelay: 1000,
    enableLogging: false
  }
};

// 2. Service-specific configurations
const serviceConfigs = {
  notion: {
    circuitBreakerThreshold: 5,
    retryPolicy: 'api',
    maxDelay: 20000
  },
  supabase: {
    circuitBreakerThreshold: 3,
    retryPolicy: 'database',
    maxDelay: 5000
  }
};

// 3. Gradual rollout of new policies
const featureFlags = {
  newRetryStrategy: process.env.NEW_RETRY_STRATEGY === 'true',
  enhancedCircuitBreaker: process.env.ENHANCED_CIRCUIT_BREAKER === 'true'
};
```

This comprehensive Error Taxonomy and Retry Logic system provides robust error handling and service resilience for the ACT Placemat platform, ensuring reliable operation even in the face of external service failures and network issues.