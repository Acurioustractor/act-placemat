/**
 * Custom error classes for UnifiedIntegrationService
 * Provides structured error handling with detailed context
 */

export class IntegrationError extends Error {
  public readonly code: string;
  public readonly service?: string;
  public readonly correlationId?: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string = 'INTEGRATION_ERROR',
    service?: string,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.service = service;
    this.correlationId = correlationId;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IntegrationError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      service: this.service,
      correlationId: this.correlationId,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export class ContactIntegrationError extends IntegrationError {
  constructor(
    message: string,
    service?: string,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'CONTACT_INTEGRATION_ERROR', service, correlationId, context);
    this.name = 'ContactIntegrationError';
  }
}

export class ProjectIntegrationError extends IntegrationError {
  constructor(
    message: string,
    service?: string,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'PROJECT_INTEGRATION_ERROR', service, correlationId, context);
    this.name = 'ProjectIntegrationError';
  }
}

export class FinanceIntegrationError extends IntegrationError {
  constructor(
    message: string,
    service?: string,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'FINANCE_INTEGRATION_ERROR', service, correlationId, context);
    this.name = 'FinanceIntegrationError';
  }
}

export class AuthenticationError extends IntegrationError {
  constructor(
    message: string,
    service?: string,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'AUTHENTICATION_ERROR', service, correlationId, context);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends IntegrationError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    service?: string,
    retryAfter?: number,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'RATE_LIMIT_ERROR', service, correlationId, context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    };
  }
}

export class DataValidationError extends IntegrationError {
  public readonly validationErrors: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    validationErrors: Array<{ field: string; message: string }>,
    service?: string,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'DATA_VALIDATION_ERROR', service, correlationId, context);
    this.name = 'DataValidationError';
    this.validationErrors = validationErrors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    };
  }
}

export class ServiceUnavailableError extends IntegrationError {
  constructor(
    message: string,
    service?: string,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'SERVICE_UNAVAILABLE_ERROR', service, correlationId, context);
    this.name = 'ServiceUnavailableError';
  }
}

export class DeduplicationError extends IntegrationError {
  constructor(
    message: string,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'DEDUPLICATION_ERROR', 'UnifiedIntegrationService', correlationId, context);
    this.name = 'DeduplicationError';
  }
}

export class CacheError extends IntegrationError {
  constructor(
    message: string,
    correlationId?: string,
    context?: Record<string, any>
  ) {
    super(message, 'CACHE_ERROR', 'CacheService', correlationId, context);
    this.name = 'CacheError';
  }
}