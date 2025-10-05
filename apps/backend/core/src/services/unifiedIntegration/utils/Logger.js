/**
 * Enhanced logging utility for UnifiedIntegrationService
 * Provides structured logging with correlation IDs for request tracing
 */

import { randomUUID } from 'crypto';

export class IntegrationLogger {
  static instance;
  logLevel;

  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  static getInstance() {
    if (!IntegrationLogger.instance) {
      IntegrationLogger.instance = new IntegrationLogger();
    }
    return IntegrationLogger.instance;
  }

  generateCorrelationId() {
    return randomUUID();
  }

  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  formatMessage(level, message, context) {
    const timestamp = new Date().toISOString();
    const formattedContext = context ? JSON.stringify(context, null, 2) : '';

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${
      formattedContext ? `\nContext: ${formattedContext}` : ''
    }`;
  }

  debug(message, context) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message, context) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message, context) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message, error, context) {
    if (this.shouldLog('error')) {
      const errorContext = error ? {
        ...context,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      } : context;

      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  logServiceCall(
    service,
    operation,
    correlationId,
    startTime,
    success,
    metadata
  ) {
    const duration = Date.now() - startTime;
    const level = success ? 'info' : 'error';
    const status = success ? 'SUCCESS' : 'FAILURE';

    const context = {
      correlationId,
      service,
      operation,
      duration,
      metadata: {
        status,
        ...metadata
      }
    };

    this[level](`Service call completed: ${service}.${operation}`, context);
  }

  logDataMerge(
    correlationId,
    sources,
    originalCount,
    deduplicatedCount,
    duration
  ) {
    const context = {
      correlationId,
      service: 'UnifiedIntegrationService',
      operation: 'dataMerge',
      duration,
      metadata: {
        sources,
        originalCount,
        deduplicatedCount,
        duplicatesRemoved: originalCount - deduplicatedCount,
        deduplicationRate: ((originalCount - deduplicatedCount) / originalCount * 100).toFixed(2) + '%'
      }
    };

    this.info('Data merge and deduplication completed', context);
  }

  logCacheOperation(
    correlationId,
    operation,
    key,
    duration
  ) {
    const context = {
      correlationId,
      service: 'CacheService',
      operation: `cache_${operation}`,
      duration,
      metadata: {
        cacheKey: key
      }
    };

    this.debug(`Cache ${operation}: ${key}`, context);
  }

  logPerformanceMetrics(
    correlationId,
    operation,
    metrics
  ) {
    const context = {
      correlationId,
      service: 'UnifiedIntegrationService',
      operation: 'performanceMetrics',
      duration: metrics.totalDuration,
      metadata: {
        ...metrics,
        cacheHitRate: (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(2) + '%'
      }
    };

    this.info(`Performance metrics for ${operation}`, context);
  }

  createTimedLogger(correlationId, service, operation) {
    const startTime = Date.now();

    return {
      debug: (message, metadata) => {
        this.debug(message, { correlationId, service, operation, metadata });
      },
      info: (message, metadata) => {
        this.info(message, { correlationId, service, operation, metadata });
      },
      warn: (message, metadata) => {
        this.warn(message, { correlationId, service, operation, metadata });
      },
      error: (message, error, metadata) => {
        this.error(message, error, { correlationId, service, operation, metadata });
      },
      finish: (success, metadata) => {
        this.logServiceCall(service, operation, correlationId, startTime, success, metadata);
      }
    };
  }
}