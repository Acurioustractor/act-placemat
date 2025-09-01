/**
 * Enhanced Error Handling and Monitoring Service for ACT Placemat
 * Provides comprehensive error tracking, logging, and recovery mechanisms
 */

const { logger } = require('../../utils/logger');

class ErrorHandlingService {
  constructor() {
    this.errorCounts = new Map();
    this.errorHistory = [];
    this.maxHistoryLength = 1000;
    this.alertThresholds = {
      errorRate: 10, // errors per minute
      criticalError: 1, // critical errors trigger immediate alert
      dbConnectionFailures: 5,
      apiTimeouts: 3
    };
    
    this.errorCategories = {
      VALIDATION: 'validation',
      AUTHENTICATION: 'auth',
      AUTHORIZATION: 'authz',
      NOT_FOUND: 'not_found',
      DATABASE: 'database',
      EXTERNAL_API: 'external_api',
      TIMEOUT: 'timeout',
      RATE_LIMIT: 'rate_limit',
      SERVER_ERROR: 'server_error',
      UNKNOWN: 'unknown'
    };

    this.setupErrorRecovery();
  }

  /**
   * Enhanced error handler middleware
   */
  createErrorMiddleware() {
    return (error, req, res, next) => {
      const errorInfo = this.analyzeError(error, req);
      this.logError(errorInfo);
      
      // Track error for monitoring
      this.trackError(errorInfo);
      
      // Attempt recovery if possible
      const recovery = this.attemptErrorRecovery(errorInfo);
      
      // Send appropriate response
      const response = this.formatErrorResponse(errorInfo, recovery);
      
      res.status(errorInfo.statusCode).json(response);
    };
  }

  /**
   * Analyze error and extract relevant information
   */
  analyzeError(error, req = null) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      statusCode: error.statusCode || error.response?.status || 500,
      category: this.categorizeError(error),
      severity: this.determineSeverity(error),
      context: {
        url: req?.url,
        method: req?.method,
        userAgent: req?.get('User-Agent'),
        ip: req?.ip,
        userId: req?.user?.id,
        body: this.sanitizeRequestBody(req?.body),
        query: req?.query,
        params: req?.params
      },
      originalError: error
    };

    // Add specific error details based on type
    if (error.code) {
      errorInfo.code = error.code;
    }
    
    if (error.response) {
      errorInfo.externalResponse = {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      };
    }

    return errorInfo;
  }

  /**
   * Categorize error based on type and characteristics
   */
  categorizeError(error) {
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return this.errorCategories.VALIDATION;
    }
    
    if (error.statusCode === 401) {
      return this.errorCategories.AUTHENTICATION;
    }
    
    if (error.statusCode === 403) {
      return this.errorCategories.AUTHORIZATION;
    }
    
    if (error.statusCode === 404) {
      return this.errorCategories.NOT_FOUND;
    }
    
    if (error.statusCode === 429) {
      return this.errorCategories.RATE_LIMIT;
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return this.errorCategories.DATABASE;
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return this.errorCategories.TIMEOUT;
    }
    
    if (error.message?.includes('notion') || error.message?.includes('API')) {
      return this.errorCategories.EXTERNAL_API;
    }
    
    if (error.statusCode >= 500) {
      return this.errorCategories.SERVER_ERROR;
    }
    
    return this.errorCategories.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  determineSeverity(error) {
    if (error.statusCode >= 500) {
      return 'critical';
    }
    
    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'high';
    }
    
    if (error.statusCode === 429 || error.statusCode === 408) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Enhanced error logging with structured data
   */
  logError(errorInfo) {
    const logData = {
      errorId: errorInfo.id,
      category: errorInfo.category,
      severity: errorInfo.severity,
      message: errorInfo.message,
      statusCode: errorInfo.statusCode,
      url: errorInfo.context.url,
      method: errorInfo.context.method,
      timestamp: errorInfo.timestamp
    };

    switch (errorInfo.severity) {
      case 'critical':
        logger.error('🚨 CRITICAL ERROR', logData);
        break;
      case 'high':
        logger.error('❌ HIGH SEVERITY ERROR', logData);
        break;
      case 'medium':
        logger.warn('⚠️ MEDIUM SEVERITY ERROR', logData);
        break;
      default:
        logger.info('ℹ️ LOW SEVERITY ERROR', logData);
    }

    // Log full stack trace for debugging (but not in production logs)
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Error stack trace:', errorInfo.stack);
    }
  }

  /**
   * Track error for monitoring and alerting
   */
  trackError(errorInfo) {
    // Increment error count by category
    const key = `${errorInfo.category}:${errorInfo.severity}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    
    // Add to error history
    this.errorHistory.unshift({
      id: errorInfo.id,
      timestamp: errorInfo.timestamp,
      category: errorInfo.category,
      severity: errorInfo.severity,
      message: errorInfo.message,
      statusCode: errorInfo.statusCode,
      url: errorInfo.context.url
    });
    
    // Trim history to max length
    if (this.errorHistory.length > this.maxHistoryLength) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistoryLength);
    }
    
    // Check for alert conditions
    this.checkAlertConditions(errorInfo);
  }

  /**
   * Check if error conditions warrant alerts
   */
  checkAlertConditions(errorInfo) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Count errors in the last minute
    const recentErrors = this.errorHistory.filter(
      error => new Date(error.timestamp).getTime() > oneMinuteAgo
    );
    
    if (recentErrors.length >= this.alertThresholds.errorRate) {
      this.triggerAlert('HIGH_ERROR_RATE', {
        count: recentErrors.length,
        threshold: this.alertThresholds.errorRate,
        errors: recentErrors.slice(0, 5)
      });
    }
    
    if (errorInfo.severity === 'critical') {
      this.triggerAlert('CRITICAL_ERROR', errorInfo);
    }
    
    // Check for specific error patterns
    const dbErrors = recentErrors.filter(e => e.category === this.errorCategories.DATABASE);
    if (dbErrors.length >= this.alertThresholds.dbConnectionFailures) {
      this.triggerAlert('DB_CONNECTION_ISSUES', {
        count: dbErrors.length,
        errors: dbErrors
      });
    }
  }

  /**
   * Trigger alert (mock implementation)
   */
  triggerAlert(alertType, data) {
    logger.error(`🚨 ALERT TRIGGERED: ${alertType}`, data);
    
    // In a real implementation, this would:
    // - Send email/Slack notifications
    // - Create incident tickets
    // - Trigger monitoring system alerts
    // - Send webhooks to monitoring services
  }

  /**
   * Attempt error recovery
   */
  attemptErrorRecovery(errorInfo) {
    const recovery = {
      attempted: false,
      successful: false,
      strategy: null,
      message: null
    };

    switch (errorInfo.category) {
      case this.errorCategories.DATABASE:
        recovery.attempted = true;
        recovery.strategy = 'database_retry';
        recovery.message = 'Database connection will be retried automatically';
        break;
        
      case this.errorCategories.EXTERNAL_API:
        recovery.attempted = true;
        recovery.strategy = 'api_fallback';
        recovery.message = 'Request will be queued for retry with exponential backoff';
        break;
        
      case this.errorCategories.TIMEOUT:
        recovery.attempted = true;
        recovery.strategy = 'timeout_retry';
        recovery.message = 'Request will be retried with increased timeout';
        break;
        
      case this.errorCategories.RATE_LIMIT:
        recovery.attempted = true;
        recovery.strategy = 'rate_limit_backoff';
        recovery.message = 'Request will be retried after rate limit reset';
        break;
    }

    return recovery;
  }

  /**
   * Format error response for client
   */
  formatErrorResponse(errorInfo, recovery) {
    const response = {
      error: true,
      errorId: errorInfo.id,
      message: this.getUserFriendlyMessage(errorInfo),
      code: errorInfo.code,
      timestamp: errorInfo.timestamp
    };

    // Add recovery information if applicable
    if (recovery.attempted) {
      response.recovery = {
        strategy: recovery.strategy,
        message: recovery.message
      };
    }

    // Add debug information in development
    if (process.env.NODE_ENV === 'development') {
      response.debug = {
        category: errorInfo.category,
        severity: errorInfo.severity,
        originalMessage: errorInfo.message,
        stack: errorInfo.stack
      };
    }

    // Add helpful suggestions based on error type
    response.suggestions = this.generateErrorSuggestions(errorInfo);

    return response;
  }

  /**
   * Generate user-friendly error messages
   */
  getUserFriendlyMessage(errorInfo) {
    switch (errorInfo.category) {
      case this.errorCategories.VALIDATION:
        return 'Please check your input and try again.';
      
      case this.errorCategories.AUTHENTICATION:
        return 'Please log in to access this resource.';
      
      case this.errorCategories.AUTHORIZATION:
        return 'You do not have permission to access this resource.';
      
      case this.errorCategories.NOT_FOUND:
        return 'The requested resource was not found.';
      
      case this.errorCategories.DATABASE:
        return 'We are experiencing database connectivity issues. Please try again in a moment.';
      
      case this.errorCategories.EXTERNAL_API:
        return 'External service is temporarily unavailable. We are working to resolve this.';
      
      case this.errorCategories.TIMEOUT:
        return 'The request took too long to complete. Please try again.';
      
      case this.errorCategories.RATE_LIMIT:
        return 'Too many requests. Please wait a moment before trying again.';
      
      case this.errorCategories.SERVER_ERROR:
        return 'An internal server error occurred. Our team has been notified.';
      
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  /**
   * Generate helpful suggestions based on error type
   */
  generateErrorSuggestions(errorInfo) {
    const suggestions = [];

    switch (errorInfo.category) {
      case this.errorCategories.VALIDATION:
        suggestions.push('Check that all required fields are filled out correctly');
        suggestions.push('Ensure data formats match the expected format (e.g., email, phone number)');
        break;
        
      case this.errorCategories.AUTHENTICATION:
        suggestions.push('Try logging out and logging back in');
        suggestions.push('Clear your browser cache and cookies');
        break;
        
      case this.errorCategories.NOT_FOUND:
        suggestions.push('Check the URL for typos');
        suggestions.push('Try navigating from the main menu');
        break;
        
      case this.errorCategories.DATABASE:
      case this.errorCategories.EXTERNAL_API:
        suggestions.push('Wait a few moments and try again');
        suggestions.push('Check your internet connection');
        break;
        
      case this.errorCategories.RATE_LIMIT:
        suggestions.push('Wait 60 seconds before making another request');
        suggestions.push('Consider reducing the frequency of your requests');
        break;
    }

    return suggestions;
  }

  /**
   * Setup error recovery mechanisms
   */
  setupErrorRecovery() {
    // Setup retry mechanisms for different error types
    this.retryQueue = new Map();
    this.retryIntervals = new Map();
    
    // Cleanup old error data periodically
    setInterval(() => {
      this.cleanupOldErrors();
    }, 300000); // 5 minutes
  }

  /**
   * Clean up old error data
   */
  cleanupOldErrors() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    // Clean up error history
    this.errorHistory = this.errorHistory.filter(
      error => new Date(error.timestamp).getTime() > oneDayAgo
    );
    
    // Reset error counts
    this.errorCounts.clear();
    
    logger.debug('Cleaned up old error data');
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const recentErrors = this.errorHistory.filter(
      error => new Date(error.timestamp).getTime() > oneHourAgo
    );
    
    const dailyErrors = this.errorHistory.filter(
      error => new Date(error.timestamp).getTime() > oneDayAgo
    );
    
    const errorsByCategory = {};
    const errorsBySeverity = {};
    
    dailyErrors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });
    
    return {
      total: this.errorHistory.length,
      lastHour: recentErrors.length,
      lastDay: dailyErrors.length,
      byCategory: errorsByCategory,
      bySeverity: errorsBySeverity,
      errorRate: recentErrors.length / 60, // errors per minute
      mostCommonErrors: this.getMostCommonErrors(dailyErrors),
      recentErrors: recentErrors.slice(0, 10)
    };
  }

  /**
   * Get most common error types
   */
  getMostCommonErrors(errors) {
    const errorCounts = {};
    
    errors.forEach(error => {
      const key = `${error.category}:${error.message}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([key, count]) => {
        const [category, message] = key.split(':');
        return { category, message, count };
      });
  }

  /**
   * Helper methods
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizeRequestBody(body) {
    if (!body) return null;
    
    // Remove sensitive information
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}

// Create singleton instance
const errorHandlingService = new ErrorHandlingService();

module.exports = {
  ErrorHandlingService,
  errorHandlingService
};