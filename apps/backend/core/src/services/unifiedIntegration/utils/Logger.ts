/**
 * Enhanced logging utility for UnifiedIntegrationService
 * Provides structured logging with correlation IDs for request tracing
 */

import { randomUUID } from 'crypto';

export interface LogContext {
  correlationId: string;
  service?: string;
  operation?: string;
  userId?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export class IntegrationLogger {
  private static instance: IntegrationLogger;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as any) || 'info';
  }

  static getInstance(): IntegrationLogger {
    if (!IntegrationLogger.instance) {
      IntegrationLogger.instance = new IntegrationLogger();
    }
    return IntegrationLogger.instance;
  }

  generateCorrelationId(): string {
    return randomUUID();
  }

  private shouldLog(level: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level as keyof typeof levels] >= levels[this.logLevel];
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const formattedContext = context ? JSON.stringify(context, null, 2) : '';

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${
      formattedContext ? `\nContext: ${formattedContext}` : ''
    }`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
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
    service: string,
    operation: string,
    correlationId: string,
    startTime: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const duration = Date.now() - startTime;
    const level = success ? 'info' : 'error';
    const status = success ? 'SUCCESS' : 'FAILURE';

    const context: LogContext = {
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
    correlationId: string,
    sources: string[],
    originalCount: number,
    deduplicatedCount: number,
    duration: number
  ): void {
    const context: LogContext = {
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
    correlationId: string,
    operation: 'hit' | 'miss' | 'set' | 'invalidate',
    key: string,
    duration?: number
  ): void {
    const context: LogContext = {
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
    correlationId: string,
    operation: string,
    metrics: {
      totalDuration: number;
      apiCallsCount: number;
      cacheHits: number;
      cacheMisses: number;
      dataSourcesUsed: string[];
      recordsProcessed: number;
    }
  ): void {
    const context: LogContext = {
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

  createTimedLogger(correlationId: string, service: string, operation: string) {
    const startTime = Date.now();

    return {
      debug: (message: string, metadata?: Record<string, any>) => {
        this.debug(message, { correlationId, service, operation, metadata });
      },
      info: (message: string, metadata?: Record<string, any>) => {
        this.info(message, { correlationId, service, operation, metadata });
      },
      warn: (message: string, metadata?: Record<string, any>) => {
        this.warn(message, { correlationId, service, operation, metadata });
      },
      error: (message: string, error?: Error, metadata?: Record<string, any>) => {
        this.error(message, error, { correlationId, service, operation, metadata });
      },
      finish: (success: boolean, metadata?: Record<string, any>) => {
        this.logServiceCall(service, operation, correlationId, startTime, success, metadata);
      }
    };
  }
}