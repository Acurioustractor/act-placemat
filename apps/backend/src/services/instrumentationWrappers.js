/**
 * Instrumentation Wrappers for Data Lake Services
 * Provides observability wrappers for key services identified in Task 18.1
 * Task: 18.2 - Instrument Data Lake Services for Standardized Metrics Collection
 */

const { logger } = require('../../utils/logger');
const { observabilityService } = require('./observabilityService');

/**
 * Wrapper for Notion API calls with metrics tracking
 */
function instrumentNotionService(notionService) {
  return new Proxy(notionService, {
    get(target, prop, receiver) {
      const originalMethod = target[prop];

      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      return async function (...args) {
        const startTime = Date.now();
        const operation = prop.toString();

        try {
          const result = await originalMethod.apply(target, args);
          const duration = (Date.now() - startTime) / 1000;

          // Track successful Notion API call
          observabilityService.trackDataSync(
            'notion',
            operation,
            duration,
            result?.recordCount || 1,
            true
          );

          observabilityService.dataSourceResponseTime
            .labels('notion', operation, 'success')
            .observe(duration);

          return result;
        } catch (error) {
          const duration = (Date.now() - startTime) / 1000;

          // Track failed Notion API call
          observabilityService.trackDataSync('notion', operation, duration, 0, false);

          observabilityService.dataSourceResponseTime
            .labels('notion', operation, 'failure')
            .observe(duration);

          // Check for rate limiting
          if (error.code === 'rate_limited') {
            observabilityService.trackRateLimitHit('notion', operation);
          }

          logger.error(`Notion API error in ${operation}:`, error);
          throw error;
        }
      };
    },
  });
}

/**
 * Wrapper for Xero API calls with metrics tracking
 */
function instrumentXeroService(xeroService) {
  return new Proxy(xeroService, {
    get(target, prop, receiver) {
      const originalMethod = target[prop];

      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      return async function (...args) {
        const startTime = Date.now();
        const operation = prop.toString();

        try {
          const result = await originalMethod.apply(target, args);
          const duration = (Date.now() - startTime) / 1000;

          // Track successful Xero API call
          observabilityService.trackDataSync(
            'xero',
            operation,
            duration,
            result?.recordCount || 1,
            true
          );

          observabilityService.dataSourceResponseTime
            .labels('xero', operation, 'success')
            .observe(duration);

          return result;
        } catch (error) {
          const duration = (Date.now() - startTime) / 1000;

          // Track failed Xero API call
          observabilityService.trackDataSync('xero', operation, duration, 0, false);

          observabilityService.dataSourceResponseTime
            .labels('xero', operation, 'failure')
            .observe(duration);

          // Check for rate limiting or quota issues
          if (error.response?.status === 429) {
            observabilityService.trackRateLimitHit('xero', operation);
          }

          // Track API quota usage if available in response headers
          if (error.response?.headers?.['x-ratelimit-remaining']) {
            const remaining = parseInt(error.response.headers['x-ratelimit-remaining']);
            const limit = parseInt(error.response.headers['x-ratelimit-limit']);
            if (limit > 0) {
              const usagePercent = ((limit - remaining) / limit) * 100;
              observabilityService.trackAPIQuotaUsage('xero', operation, usagePercent);
            }
          }

          logger.error(`Xero API error in ${operation}:`, error);
          throw error;
        }
      };
    },
  });
}

/**
 * Wrapper for Google APIs (Calendar, Gmail) with metrics tracking
 */
function instrumentGoogleService(googleService, serviceName) {
  return new Proxy(googleService, {
    get(target, prop, receiver) {
      const originalMethod = target[prop];

      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      return async function (...args) {
        const startTime = Date.now();
        const operation = prop.toString();

        try {
          const result = await originalMethod.apply(target, args);
          const duration = (Date.now() - startTime) / 1000;

          // Track successful Google API call
          observabilityService.trackDataSync(
            serviceName,
            operation,
            duration,
            result?.recordCount || 1,
            true
          );

          observabilityService.dataSourceResponseTime
            .labels(serviceName, operation, 'success')
            .observe(duration);

          return result;
        } catch (error) {
          const duration = (Date.now() - startTime) / 1000;

          // Track failed Google API call
          observabilityService.trackDataSync(
            serviceName,
            operation,
            duration,
            0,
            false
          );

          observabilityService.dataSourceResponseTime
            .labels(serviceName, operation, 'failure')
            .observe(duration);

          // Check for rate limiting
          if (error.code === 403 && error.message?.includes('quotaExceeded')) {
            observabilityService.trackRateLimitHit(
              'google',
              `${serviceName}/${operation}`
            );
          }

          logger.error(`Google ${serviceName} API error in ${operation}:`, error);
          throw error;
        }
      };
    },
  });
}

/**
 * Wrapper for AI API calls with comprehensive metrics tracking
 */
function instrumentAIService(aiService, provider) {
  return new Proxy(aiService, {
    get(target, prop, receiver) {
      const originalMethod = target[prop];

      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      return async function (...args) {
        const startTime = Date.now();
        const operation = prop.toString();

        // Try to extract model from arguments
        const model = args?.[0]?.model || args?.[0]?.modelName || 'unknown';

        try {
          const result = await originalMethod.apply(target, args);
          const duration = (Date.now() - startTime) / 1000;

          // Extract token usage and cost if available
          const tokens = result?.usage || result?.tokens || null;
          const cost = result?.cost || null;

          // Track successful AI request
          observabilityService.trackAIRequest(
            provider,
            model,
            operation,
            duration,
            tokens,
            cost,
            true
          );

          return result;
        } catch (error) {
          const duration = (Date.now() - startTime) / 1000;

          // Track failed AI request
          observabilityService.trackAIRequest(
            provider,
            model,
            operation,
            duration,
            null,
            null,
            false
          );

          // Check for rate limiting
          if (error.status === 429 || error.message?.includes('rate limit')) {
            observabilityService.trackRateLimitHit(provider, `${model}/${operation}`);
          }

          logger.error(`AI API error (${provider}/${model}) in ${operation}:`, error);
          throw error;
        }
      };
    },
  });
}

/**
 * Wrapper for database operations with query performance tracking
 */
function instrumentDatabaseService(dbService, databaseType) {
  return new Proxy(dbService, {
    get(target, prop, receiver) {
      const originalMethod = target[prop];

      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      return async function (...args) {
        const startTime = Date.now();
        const operation = prop.toString();

        // Try to extract table name from arguments
        const table = extractTableName(args) || 'unknown';

        try {
          const result = await originalMethod.apply(target, args);
          const duration = (Date.now() - startTime) / 1000;

          // Track database query performance
          observabilityService.trackDBQuery(databaseType, operation, table, duration);

          return result;
        } catch (error) {
          const duration = (Date.now() - startTime) / 1000;

          // Track failed query
          observabilityService.trackDBQuery(
            databaseType,
            `${operation}_failed`,
            table,
            duration
          );

          logger.error(`Database error (${databaseType}) in ${operation}:`, error);
          throw error;
        }
      };
    },
  });
}

/**
 * Wrapper for queue operations with processing metrics
 */
function instrumentQueueService(queueService, queueName) {
  return new Proxy(queueService, {
    get(target, prop, receiver) {
      const originalMethod = target[prop];

      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      return async function (...args) {
        const startTime = Date.now();
        const operation = prop.toString();

        // Handle different queue operations
        if (operation === 'add' || operation === 'enqueue') {
          // Track queue additions
          const priority = args?.[1]?.priority || 'normal';
          observabilityService.trackQueueMetrics(
            queueName,
            target.length + 1,
            priority
          );
        }

        if (operation === 'process' || operation === 'dequeue') {
          const jobType = args?.[0]?.type || 'unknown';

          try {
            const result = await originalMethod.apply(target, args);
            const duration = (Date.now() - startTime) / 1000;

            // Track successful job processing
            observabilityService.trackQueueJobProcessing(queueName, jobType, duration);

            // Update queue depth
            observabilityService.trackQueueMetrics(
              queueName,
              Math.max(0, target.length - 1)
            );

            return result;
          } catch (error) {
            const duration = (Date.now() - startTime) / 1000;

            // Track failed job processing
            observabilityService.trackQueueJobProcessing(
              queueName,
              `${jobType}_failed`,
              duration
            );

            logger.error(
              `Queue processing error (${queueName}) in ${operation}:`,
              error
            );
            throw error;
          }
        }

        return originalMethod.apply(target, args);
      };
    },
  });
}

/**
 * Wrapper for sync services with comprehensive data flow tracking
 */
function instrumentSyncService(syncService, serviceName) {
  return new Proxy(syncService, {
    get(target, prop, receiver) {
      const originalMethod = target[prop];

      if (typeof originalMethod !== 'function') {
        return originalMethod;
      }

      return async function (...args) {
        const startTime = Date.now();
        const operation = prop.toString();

        try {
          const result = await originalMethod.apply(target, args);
          const duration = (Date.now() - startTime) / 1000;

          // Extract record counts from result
          const recordsProcessed =
            result?.processedCount || result?.records?.length || result?.count || 1;
          const recordsCreated = result?.createdCount || 0;
          const recordsUpdated = result?.updatedCount || 0;
          const recordsDeleted = result?.deletedCount || 0;

          // Track sync operation
          observabilityService.trackDataSync(
            serviceName,
            operation,
            duration,
            recordsProcessed,
            true
          );

          // Track detailed record operations
          if (recordsCreated > 0) {
            observabilityService.dataSyncRecords
              .labels(serviceName, operation, 'created')
              .set(recordsCreated);
          }
          if (recordsUpdated > 0) {
            observabilityService.dataSyncRecords
              .labels(serviceName, operation, 'updated')
              .set(recordsUpdated);
          }
          if (recordsDeleted > 0) {
            observabilityService.dataSyncRecords
              .labels(serviceName, operation, 'deleted')
              .set(recordsDeleted);
          }

          return result;
        } catch (error) {
          const duration = (Date.now() - startTime) / 1000;

          // Track failed sync operation
          observabilityService.trackDataSync(
            serviceName,
            operation,
            duration,
            0,
            false
          );

          logger.error(`Sync service error (${serviceName}) in ${operation}:`, error);
          throw error;
        }
      };
    },
  });
}

/**
 * Helper function to extract table name from database operation arguments
 */
function extractTableName(args) {
  if (!args || !args.length) return 'unknown';

  // Common patterns for table name extraction
  const firstArg = args[0];

  if (typeof firstArg === 'string') {
    // Direct table name or SQL query
    if (
      firstArg.includes('SELECT') ||
      firstArg.includes('INSERT') ||
      firstArg.includes('UPDATE') ||
      firstArg.includes('DELETE')
    ) {
      // Extract table name from SQL query
      const tableMatch = firstArg.match(/(?:FROM|INTO|UPDATE)\s+([^\s]+)/i);
      return tableMatch ? tableMatch[1] : 'query';
    }
    return firstArg;
  }

  if (typeof firstArg === 'object') {
    // Object with table property
    return firstArg.table || firstArg.tableName || firstArg.collection || 'unknown';
  }

  return 'unknown';
}

/**
 * Factory function to create instrumented services
 */
function createInstrumentedServices() {
  return {
    notion: service => instrumentNotionService(service),
    xero: service => instrumentXeroService(service),
    googleCalendar: service => instrumentGoogleService(service, 'google_calendar'),
    gmail: service => instrumentGoogleService(service, 'gmail'),
    ai: (service, provider) => instrumentAIService(service, provider),
    database: (service, type) => instrumentDatabaseService(service, type),
    queue: (service, name) => instrumentQueueService(service, name),
    sync: (service, name) => instrumentSyncService(service, name),
  };
}

module.exports = {
  instrumentNotionService,
  instrumentXeroService,
  instrumentGoogleService,
  instrumentAIService,
  instrumentDatabaseService,
  instrumentQueueService,
  instrumentSyncService,
  createInstrumentedServices,
};
