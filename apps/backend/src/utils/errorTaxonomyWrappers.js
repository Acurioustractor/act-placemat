/**
 * Error Taxonomy Wrapper Functions
 * Provides wrapped versions of existing service calls with automatic retry logic and error handling
 */

import errorTaxonomyService from '../services/errorTaxonomyService.js';
import { traceExternalCall } from '../services/tracingService.js';

/**
 * Wrap a database operation with error taxonomy retry logic
 */
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

/**
 * Wrap a Notion API call with error taxonomy retry logic
 */
export function wrapNotionOperation(operation, operationType, options = {}) {
  return errorTaxonomyService.executeWithRetry(
    operation,
    {
      service: 'notion',
      policyName: 'api',
      context: { 
        operation: operationType,
        ...options.context 
      },
      onRetry: (classification, attempt, delay) => {
        console.log(`🔄 Notion retry ${attempt}: ${classification.category} error on ${operationType}, waiting ${delay}ms`);
      },
      onFailure: (classification, attempts) => {
        console.error(`❌ Notion operation failed after ${attempts} attempts on ${operationType}: ${classification.category}`);
      }
    }
  );
}

/**
 * Wrap an external API call with error taxonomy retry logic
 */
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

/**
 * Wrap Gmail API operations
 */
export function wrapGmailOperation(operation, operationType, options = {}) {
  return wrapExternalApiCall(operation, 'gmail', operationType, {
    policyName: 'api',
    ...options
  });
}

/**
 * Wrap Xero API operations
 */
export function wrapXeroOperation(operation, operationType, options = {}) {
  return wrapExternalApiCall(operation, 'xero', operationType, {
    policyName: 'api',
    ...options
  });
}

/**
 * Wrap OpenAI API operations
 */
export function wrapOpenAIOperation(operation, operationType, options = {}) {
  return wrapExternalApiCall(operation, 'openai', operationType, {
    policyName: 'api',
    ...options
  });
}

/**
 * Wrap Anthropic API operations
 */
export function wrapAnthropicOperation(operation, operationType, options = {}) {
  return wrapExternalApiCall(operation, 'anthropic', operationType, {
    policyName: 'api',
    ...options
  });
}

/**
 * Wrap Perplexity API operations
 */
export function wrapPerplexityOperation(operation, operationType, options = {}) {
  return wrapExternalApiCall(operation, 'perplexity', operationType, {
    policyName: 'api',
    ...options
  });
}

/**
 * Wrap Neo4j database operations
 */
export function wrapNeo4jOperation(operation, operationType, options = {}) {
  return errorTaxonomyService.executeWithRetry(
    operation,
    {
      service: 'neo4j',
      policyName: 'database',
      context: { 
        operation: operationType,
        cypher: options.cypher,
        ...options.context 
      },
      onRetry: (classification, attempt, delay) => {
        console.log(`🔄 Neo4j retry ${attempt}: ${classification.category} error on ${operationType}, waiting ${delay}ms`);
      },
      onFailure: (classification, attempts) => {
        console.error(`❌ Neo4j operation failed after ${attempts} attempts on ${operationType}: ${classification.category}`);
      }
    }
  );
}

/**
 * Wrap Kafka operations
 */
export function wrapKafkaOperation(operation, operationType, options = {}) {
  return errorTaxonomyService.executeWithRetry(
    operation,
    {
      service: 'kafka',
      policyName: 'network',
      context: { 
        operation: operationType,
        topic: options.topic,
        ...options.context 
      },
      onRetry: (classification, attempt, delay) => {
        console.log(`🔄 Kafka retry ${attempt}: ${classification.category} error on ${operationType}, waiting ${delay}ms`);
      },
      onFailure: (classification, attempts) => {
        console.error(`❌ Kafka operation failed after ${attempts} attempts on ${operationType}: ${classification.category}`);
      }
    }
  );
}

/**
 * Generic wrapper for any async operation with custom retry policy
 */
export function wrapWithRetry(operation, serviceName, operationType, options = {}) {
  return errorTaxonomyService.executeWithRetry(
    operation,
    {
      service: serviceName,
      policyName: options.policyName || 'default',
      context: { 
        operation: operationType,
        ...options.context 
      },
      onRetry: options.onRetry || ((classification, attempt, delay) => {
        console.log(`🔄 ${serviceName} retry ${attempt}: ${classification.category} error on ${operationType}, waiting ${delay}ms`);
      }),
      onFailure: options.onFailure || ((classification, attempts) => {
        console.error(`❌ ${serviceName} operation failed after ${attempts} attempts on ${operationType}: ${classification.category}`);
      })
    }
  );
}

/**
 * Enhanced database wrapper with connection pooling awareness
 */
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

/**
 * Enhanced HTTP wrapper with trace integration
 */
export async function wrapHttpRequest(requestFunction, serviceName, url, method = 'GET', options = {}) {
  return await traceExternalCall(serviceName, `${method.toLowerCase()}_request`, async (span) => {
    span.setAttributes({
      'http.method': method,
      'http.url': url,
      'http.service': serviceName
    });

    return await wrapExternalApiCall(
      requestFunction,
      serviceName,
      `${method} ${url}`,
      {
        url,
        method,
        ...options
      }
    );
  });
}

/**
 * Circuit breaker aware wrapper - checks circuit state before attempting operation
 */
export async function wrapWithCircuitBreaker(operation, serviceName, operationType, options = {}) {
  // Check circuit breaker state first
  const circuitState = await errorTaxonomyService.checkCircuitBreaker(serviceName);
  
  if (!circuitState.allowed) {
    const error = new Error(`Circuit breaker is ${circuitState.state} for service: ${serviceName}`);
    error.circuitBreakerState = circuitState.state;
    throw error;
  }

  return await wrapWithRetry(operation, serviceName, operationType, options);
}

/**
 * Batch operation wrapper - applies retry logic to batch operations
 */
export async function wrapBatchOperation(operations, serviceName, batchSize = 10, options = {}) {
  const results = [];
  const errors = [];
  
  // Process operations in batches
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    
    try {
      const batchResults = await wrapWithRetry(
        async () => {
          // Execute all operations in the batch concurrently
          return await Promise.allSettled(
            batch.map((operation, index) => 
              operation().catch(error => ({ error, index: i + index }))
            )
          );
        },
        serviceName,
        `batch_operation_${Math.floor(i / batchSize) + 1}`,
        {
          policyName: options.policyName || 'default',
          context: {
            batchIndex: Math.floor(i / batchSize) + 1,
            batchSize: batch.length,
            totalOperations: operations.length,
            ...options.context
          }
        }
      );
      
      results.push(...batchResults);
      
    } catch (error) {
      errors.push({
        batchIndex: Math.floor(i / batchSize) + 1,
        error: error.message,
        operationsCount: batch.length
      });
    }
  }
  
  return {
    results,
    errors,
    totalOperations: operations.length,
    successfulBatches: results.length / batchSize,
    failedBatches: errors.length
  };
}

/**
 * Utility to create a pre-configured wrapper for a specific service
 */
export function createServiceWrapper(serviceName, defaultPolicy = 'default') {
  return {
    wrap: (operation, operationType, options = {}) => 
      wrapWithRetry(operation, serviceName, operationType, {
        policyName: defaultPolicy,
        ...options
      }),
    
    wrapWithCircuitBreaker: (operation, operationType, options = {}) =>
      wrapWithCircuitBreaker(operation, serviceName, operationType, {
        policyName: defaultPolicy,
        ...options
      }),
    
    wrapBatch: (operations, batchSize, options = {}) =>
      wrapBatchOperation(operations, serviceName, batchSize, {
        policyName: defaultPolicy,
        ...options
      })
  };
}

// Pre-configured service wrappers
export const supabaseWrapper = createServiceWrapper('supabase', 'database');
export const notionWrapper = createServiceWrapper('notion', 'api');
export const gmailWrapper = createServiceWrapper('gmail', 'api');
export const xeroWrapper = createServiceWrapper('xero', 'api');
export const openaiWrapper = createServiceWrapper('openai', 'api');
export const anthropicWrapper = createServiceWrapper('anthropic', 'api');
export const perplexityWrapper = createServiceWrapper('perplexity', 'api');
export const neo4jWrapper = createServiceWrapper('neo4j', 'database');
export const kafkaWrapper = createServiceWrapper('kafka', 'network');