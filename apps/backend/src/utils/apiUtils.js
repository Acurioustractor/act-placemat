/**
 * ACT Placemat API Utilities
 * 
 * This module provides utilities for making API requests with
 * retry logic, error handling, and logging.
 */

const { config } = require('../src/server/config');
const { logger, errorHandler } = require('./logger');

/**
 * Make an API request with retry logic
 * @param {Function} requestFn - Function that returns a promise for the API request
 * @param {Object} options - Options for the request
 * @param {string} options.operation - Name of the operation for logging
 * @param {number} [options.maxRetries] - Maximum number of retry attempts
 * @param {number} [options.retryDelay] - Base delay between retries in ms
 * @param {Function} [options.shouldRetry] - Function to determine if a request should be retried
 * @returns {Promise<any>} - Promise resolving to the API response
 */
async function makeRequestWithRetry(requestFn, options) {
  const {
    operation,
    maxRetries = config.app.maxRetries,
    retryDelay = config.app.retryDelay,
    shouldRetry = defaultShouldRetry,
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Log the attempt if it's a retry
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt}/${maxRetries} for ${operation}`);
      }
      
      // Make the request
      const response = await requestFn();
      
      // Log success after retries if applicable
      if (attempt > 0) {
        logger.info(`Succeeded after ${attempt} retries for ${operation}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(error)) {
        // Calculate exponential backoff delay
        const delay = retryDelay * Math.pow(2, attempt);
        
        logger.warn(`Request failed for ${operation}, retrying in ${delay}ms`, {
          attempt,
          error: error.message,
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // We've exhausted retries or shouldn't retry
        break;
      }
    }
  }
  
  // If we get here, all retry attempts failed
  throw errorHandler.handleApiError(lastError, operation);
}

/**
 * Default function to determine if a request should be retried
 * @param {Error} error - The error that occurred
 * @returns {boolean} - True if the request should be retried
 */
function defaultShouldRetry(error) {
  // Retry on network errors
  if (!error.response) {
    return true;
  }
  
  // Retry on rate limiting (429) or server errors (5xx)
  const status = error.response.status;
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * Make a Notion API request with retry logic and specific error handling
 * @param {Function} requestFn - Function that returns a promise for the Notion API request
 * @param {Object} options - Options for the request
 * @returns {Promise<any>} - Promise resolving to the Notion API response
 */
async function makeNotionRequest(requestFn, options) {
  try {
    return await makeRequestWithRetry(requestFn, {
      ...options,
      shouldRetry: (error) => {
        // Notion-specific retry logic
        if (!error.response) {
          return true; // Retry network errors
        }
        
        const status = error.response.status;
        
        // Don't retry authentication or permission errors
        if (status === 401 || status === 403) {
          return false;
        }
        
        // Don't retry invalid input errors
        if (status === 400) {
          return false;
        }
        
        // Retry rate limiting or server errors
        return status === 429 || (status >= 500 && status < 600);
      },
    });
  } catch (error) {
    throw errorHandler.handleNotionError(error, options.operation);
  }
}

module.exports = {
  makeRequestWithRetry,
  makeNotionRequest,
};