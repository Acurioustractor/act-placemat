/**
 * Centralized Logging Service
 * Provides structured logging for the ACT platform
 */

// Simple logger that outputs to console with structured formatting
const logger = {
  info: (message, metadata = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, metadata && Object.keys(metadata).length > 0 ? metadata : '');
  },

  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error ? error.stack || error : '');
  },

  warn: (message, metadata = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, metadata && Object.keys(metadata).length > 0 ? metadata : '');
  },

  debug: (message, metadata = {}) => {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] DEBUG: ${message}`, metadata && Object.keys(metadata).length > 0 ? metadata : '');
    }
  },

  success: (message, metadata = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] SUCCESS: ${message}`, metadata && Object.keys(metadata).length > 0 ? metadata : '');
  }
};

// Error handler for consistent error logging
const errorHandler = (error, context = '') => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR${context ? ` [${context}]` : ''}: ${error.message}`, error.stack);
  return error;
};

// Export for ES6 modules (import { logger })
export { logger, errorHandler };

// Export for CommonJS modules (require)
export default { logger, errorHandler };