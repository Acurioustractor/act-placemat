/**
 * Comprehensive Error Handling Middleware
 * Centralized error handling for Life Orchestrator API
 * 
 * Features:
 * - Structured error responses
 * - Error logging with context
 * - Rate limiting for repeated errors
 * - Service availability monitoring
 * - Development vs production error details
 * 
 * Usage: app.use(errorHandler)
 */

import { logger } from '../utils/logger.js';

// Error classifications
export const ErrorTypes = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  EXTERNAL_SERVICE: 'external_service',
  DATABASE: 'database',
  INTERNAL: 'internal'
};

// Error codes mapping
export const ErrorCodes = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ENDPOINT_NOT_FOUND: 'ENDPOINT_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GOOGLE_API_ERROR: 'GOOGLE_API_ERROR',
  SLACK_API_ERROR: 'SLACK_API_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// Custom error classes
export class AppError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL, code = ErrorCodes.INTERNAL_SERVER_ERROR, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, ErrorTypes.VALIDATION, ErrorCodes.VALIDATION_FAILED, 400, {
      field,
      value
    });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message, service = null) {
    super(message, ErrorTypes.AUTHENTICATION, ErrorCodes.AUTHENTICATION_REQUIRED, 401, {
      service
    });
    this.name = 'AuthenticationError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, message, originalError = null) {
    const code = service === 'google' ? ErrorCodes.GOOGLE_API_ERROR :
                 service === 'slack' ? ErrorCodes.SLACK_API_ERROR :
                 service === 'ai' ? ErrorCodes.AI_SERVICE_ERROR :
                 ErrorCodes.SERVICE_UNAVAILABLE;
    
    super(`${service} service error: ${message}`, ErrorTypes.EXTERNAL_SERVICE, code, 503, {
      service,
      originalError: originalError ? originalError.message : null
    });
    this.name = 'ExternalServiceError';
  }
}

// Error frequency tracking for rate limiting
const errorFrequency = new Map();

/**
 * Main error handler middleware
 */
export function errorHandler(error, req, res, next) {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Track error frequency
  trackErrorFrequency(error, req);

  // Log error with context
  logErrorWithContext(error, req);

  // Handle specific error types
  const errorResponse = buildErrorResponse(error, req);

  // Send error response
  res.status(errorResponse.statusCode).json(errorResponse);
}

/**
 * Global error handler (alias for errorHandler)
 */
export const globalErrorHandler = errorHandler;

/**
 * Health check error handler
 */
export function healthCheckError(error, req, res, next) {
  logger.error('Health check failed:', error);
  
  res.status(503).json({
    status: 'error',
    message: 'Health check failed',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable',
    timestamp: new Date().toISOString()
  });
}

/**
 * Build structured error response
 */
function buildErrorResponse(error, req) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Base response structure
  const response = {
    success: false,
    error: error.code || ErrorCodes.INTERNAL_SERVER_ERROR,
    message: error.message || 'An error occurred',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add status code
  response.statusCode = getStatusCode(error);

  // Add error type for debugging
  if (error.type) {
    response.type = error.type;
  }

  // Add details if available
  if (error.details && !isProduction) {
    response.details = error.details;
  }

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.stack = error.stack.split('\n');
  }

  // Add request ID for tracking
  if (req.id) {
    response.requestId = req.id;
  }

  // Add user context (if available)
  if (req.user && !isProduction) {
    response.userContext = {
      id: req.user.id,
      email: req.user.email
    };
  }

  // Add suggestions for common errors
  response.suggestion = getErrorSuggestion(error);

  // Add retry information
  if (shouldRetry(error)) {
    response.retry = {
      recommended: true,
      after: getRetryAfter(error),
      maxAttempts: 3
    };
  }

  return response;
}

/**
 * Get appropriate HTTP status code
 */
function getStatusCode(error) {
  if (error.statusCode) {
    return error.statusCode;
  }

  // Map common error types to status codes
  const statusCodeMap = {
    [ErrorTypes.VALIDATION]: 400,
    [ErrorTypes.AUTHENTICATION]: 401,
    [ErrorTypes.AUTHORIZATION]: 403,
    [ErrorTypes.NOT_FOUND]: 404,
    [ErrorTypes.RATE_LIMIT]: 429,
    [ErrorTypes.EXTERNAL_SERVICE]: 503,
    [ErrorTypes.DATABASE]: 503,
    [ErrorTypes.INTERNAL]: 500
  };

  return statusCodeMap[error.type] || 500;
}

/**
 * Log error with context
 */
function logErrorWithContext(error, req) {
  const errorContext = {
    error: {
      name: error.name,
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      user: req.user ? { id: req.user.id, email: req.user.email } : null
    },
    timestamp: new Date().toISOString()
  };

  // Log based on error severity
  if (error.statusCode >= 500 || error.type === ErrorTypes.INTERNAL) {
    logger.error('Internal server error:', errorContext);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error:', errorContext);
  } else {
    logger.info('Error handled:', errorContext);
  }
}

/**
 * Track error frequency for rate limiting
 */
function trackErrorFrequency(error, req) {
  const key = `${req.ip}-${error.code || error.name}`;
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes

  if (!errorFrequency.has(key)) {
    errorFrequency.set(key, []);
  }

  const timestamps = errorFrequency.get(key);
  
  // Remove old entries
  const recentErrors = timestamps.filter(timestamp => now - timestamp < windowMs);
  recentErrors.push(now);
  
  errorFrequency.set(key, recentErrors);

  // Log if error frequency is high
  if (recentErrors.length > 5) {
    logger.warn(`High error frequency detected: ${key} - ${recentErrors.length} errors in 5 minutes`);
  }
}

/**
 * Get error-specific suggestions
 */
function getErrorSuggestion(error) {
  const suggestions = {
    [ErrorCodes.AUTHENTICATION_REQUIRED]: 'Please authenticate with Google or Slack to access this feature',
    [ErrorCodes.TOKEN_EXPIRED]: 'Please re-authenticate to refresh your access token',
    [ErrorCodes.GOOGLE_API_ERROR]: 'Check your Google API credentials and quota limits',
    [ErrorCodes.SLACK_API_ERROR]: 'Verify your Slack app permissions and token validity',
    [ErrorCodes.AI_SERVICE_ERROR]: 'AI service may be temporarily unavailable. Please try again',
    [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Please wait before making additional requests',
    [ErrorCodes.VALIDATION_FAILED]: 'Please check your request data and try again',
    [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later'
  };

  return suggestions[error.code] || 'Please try again or contact support if the problem persists';
}

/**
 * Determine if error should suggest retry
 */
function shouldRetry(error) {
  const retryableTypes = [
    ErrorTypes.EXTERNAL_SERVICE,
    ErrorTypes.DATABASE
  ];

  const retryableCodes = [
    ErrorCodes.SERVICE_UNAVAILABLE,
    ErrorCodes.GOOGLE_API_ERROR,
    ErrorCodes.SLACK_API_ERROR,
    ErrorCodes.AI_SERVICE_ERROR,
    ErrorCodes.DATABASE_CONNECTION_ERROR
  ];

  return retryableTypes.includes(error.type) || 
         retryableCodes.includes(error.code) ||
         (error.statusCode >= 500 && error.statusCode < 600);
}

/**
 * Get recommended retry delay
 */
function getRetryAfter(error) {
  if (error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
    return 60; // 1 minute for rate limits
  }
  
  if (error.type === ErrorTypes.EXTERNAL_SERVICE) {
    return 30; // 30 seconds for external services
  }
  
  return 15; // Default 15 seconds
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejection() {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason.message || reason,
      stack: reason.stack,
      promise
    });
    // In development, keep the server alive to avoid breaking the DX.
    // In production, also avoid hard exit here; let the process manager handle restarts.
    // We log and continue so transient integration failures (e.g., Xero 401) don't crash the server.
  });
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtException() {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    // Avoid hard exit in dev; prefer observability and manual restart if needed.
    if (process.env.NODE_ENV === 'production') {
      // Let the container/PM2/systemd handle restarts; don't force exit here either.
      return;
    }
  });
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    ErrorTypes.NOT_FOUND,
    ErrorCodes.ENDPOINT_NOT_FOUND,
    404,
    {
      availableRoutes: getAvailableRoutes(req.app)
    }
  );
  
  next(error);
}

/**
 * Validation error helper
 */
export function validateRequired(data, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      missing,
      data
    );
  }
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Service health monitoring
 */
const serviceHealth = new Map();

export function updateServiceHealth(serviceName, isHealthy, details = null) {
  serviceHealth.set(serviceName, {
    healthy: isHealthy,
    lastCheck: new Date().toISOString(),
    details
  });

  if (!isHealthy) {
    logger.warn(`Service ${serviceName} is unhealthy:`, details);
  }
}

export function getServiceHealth() {
  return Object.fromEntries(serviceHealth);
}

/**
 * Error monitoring and alerting
 */
let errorStats = {
  totalErrors: 0,
  errorsByType: {},
  errorsByHour: {},
  lastReset: Date.now()
};

export function getErrorStats() {
  const now = Date.now();
  const hoursSinceReset = (now - errorStats.lastReset) / (1000 * 60 * 60);
  
  return {
    ...errorStats,
    hoursSinceReset: Math.round(hoursSinceReset),
    errorRate: Math.round(errorStats.totalErrors / Math.max(hoursSinceReset, 1))
  };
}

export function resetErrorStats() {
  errorStats = {
    totalErrors: 0,
    errorsByType: {},
    errorsByHour: {},
    lastReset: Date.now()
  };
}

// Helper function to get available routes (for 404 suggestions)
function getAvailableRoutes(app) {
  const routes = [];
  
  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        routes.push(`${methods.join(', ').toUpperCase()} ${layer.route.path}`);
      }
    });
  }
  
  return routes.slice(0, 5); // Return first 5 routes as suggestions
}

// Export error handling utilities
export default {
  errorHandler,
  globalErrorHandler,
  healthCheckError,
  notFoundHandler,
  asyncHandler,
  validateRequired,
  handleUnhandledRejection,
  handleUncaughtException,
  updateServiceHealth,
  getServiceHealth,
  getErrorStats,
  resetErrorStats,
  ErrorTypes,
  ErrorCodes,
  AppError,
  ValidationError,
  AuthenticationError,
  ExternalServiceError
};
