/**
 * ACT Placemat Logger Utility
 * 
 * This module provides consistent logging and error handling utilities
 * for the application.
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Current log level (can be set via environment variable)
const currentLogLevel = (() => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return LOG_LEVELS[envLevel];
  }
  return process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
})();

/**
 * Format a log message with timestamp and optional metadata
 * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
 * @param {string} message - Log message
 * @param {Object} [metadata] - Additional data to include in the log
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, metadata) {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] ${level}: ${message}`;
  
  if (metadata) {
    try {
      // Format metadata as JSON or string representation
      const metadataStr = typeof metadata === 'string' 
        ? metadata 
        : JSON.stringify(metadata, null, 2);
      formattedMessage += `\n${metadataStr}`;
    } catch (err) {
      formattedMessage += '\n[Error formatting metadata]';
    }
  }
  
  return formattedMessage;
}

/**
 * Logger object with methods for different log levels
 */
const logger = {
  error: (message, metadata) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(formatLogMessage('ERROR', message, metadata));
    }
  },
  
  warn: (message, metadata) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(formatLogMessage('WARN', message, metadata));
    }
  },
  
  info: (message, metadata) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(formatLogMessage('INFO', message, metadata));
    }
  },
  
  debug: (message, metadata) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.log(formatLogMessage('DEBUG', message, metadata));
    }
  },
  
  /**
   * Log API request details at debug level
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   */
  apiRequest: (endpoint, params) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      logger.debug(`API Request: ${endpoint}`, {
        params: params ? { ...params } : undefined,
      });
    }
  },
  
  /**
   * Log API response details at debug level
   * @param {string} endpoint - API endpoint
   * @param {Object} response - Response data (will be sanitized)
   */
  apiResponse: (endpoint, response) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      // Sanitize response to avoid logging sensitive data
      const sanitized = response ? sanitizeResponse(response) : undefined;
      logger.debug(`API Response: ${endpoint}`, sanitized);
    }
  },
};

/**
 * Sanitize a response object to remove sensitive data before logging
 * @param {Object} response - Response object to sanitize
 * @returns {Object} Sanitized response
 */
function sanitizeResponse(response) {
  if (!response || typeof response !== 'object') {
    return response;
  }
  
  // Create a shallow copy to avoid modifying the original
  const sanitized = Array.isArray(response) ? [...response] : { ...response };
  
  // Remove sensitive fields
  const sensitiveFields = ['token', 'password', 'secret', 'key', 'auth'];
  
  if (!Array.isArray(sanitized)) {
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
  }
  
  // For large responses, just return a summary
  if (JSON.stringify(sanitized).length > 1000) {
    if (Array.isArray(sanitized)) {
      return `Array with ${sanitized.length} items`;
    } else {
      return `Object with keys: ${Object.keys(sanitized).join(', ')}`;
    }
  }
  
  return sanitized;
}

/**
 * Error handling utilities
 */
const errorHandler = {
  /**
   * Create a standardized error object
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} [details] - Additional error details
   * @param {Error} [originalError] - Original error object
   * @returns {Object} Standardized error object
   */
  createError: (message, code, details, originalError) => {
    const error = {
      message,
      code: code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
    };
    
    if (details) {
      error.details = details;
    }
    
    if (originalError) {
      error.originalError = {
        message: originalError.message,
        stack: process.env.NODE_ENV !== 'production' ? originalError.stack : undefined,
      };
      
      // Log the full error in development
      if (process.env.NODE_ENV !== 'production') {
        logger.error(`Error: ${message}`, originalError);
      } else {
        logger.error(`Error: ${message}`, { code, details });
      }
    }
    
    return error;
  },
  
  /**
   * Handle API errors consistently
   * @param {Error} error - Original error
   * @param {string} operation - Operation being performed
   * @returns {Object} Standardized error object
   */
  handleApiError: (error, operation) => {
    let code = 'API_ERROR';
    let message = `Error during ${operation}`;
    
    // Extract more specific information if available
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      code = `API_${error.response.status}_ERROR`;
      message = error.response.data?.message || message;
      
      logger.error(`API Error: ${operation}`, {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // The request was made but no response was received
      code = 'API_NO_RESPONSE';
      message = 'No response received from API';
      
      logger.error(`API No Response: ${operation}`, {
        request: error.request,
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error(`API Request Error: ${operation}`, error);
    }
    
    return errorHandler.createError(message, code, { operation }, error);
  },
  
  /**
   * Handle Notion API specific errors
   * @param {Error} error - Original error
   * @param {string} operation - Operation being performed
   * @returns {Object} Standardized error object
   */
  handleNotionError: (error, operation) => {
    let code = 'NOTION_API_ERROR';
    let message = `Notion API error during ${operation}`;
    let details = { operation };
    
    // Parse Notion API specific error information
    if (error.response?.data) {
      const notionError = error.response.data;
      code = `NOTION_${notionError.code || error.response.status}`;
      message = notionError.message || message;
      
      // Add helpful troubleshooting information
      if (error.response.status === 401) {
        details.help = 'Check your Notion API token in .env file';
      } else if (error.response.status === 404) {
        details.help = 'Verify your database ID and ensure your integration has access to it';
      } else if (error.response.status === 429) {
        details.help = 'You have exceeded Notion API rate limits. Implement backoff strategy.';
      }
    }
    
    return errorHandler.createError(message, code, details, error);
  },
};

module.exports = {
  logger,
  errorHandler,
  LOG_LEVELS,
};