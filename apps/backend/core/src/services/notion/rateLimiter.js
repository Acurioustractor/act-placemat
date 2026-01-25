/**
 * Notion Rate Limiter Module
 * Handles rate limiting and retry logic for API requests
 */

/**
 * Create a rate limiter instance
 * @param {Object} config - Rate limiter configuration
 * @returns {Object} Rate limiter state
 */
export function createRateLimiter(config = {}) {
  return {
    requests: [],
    maxRequestsPerSecond: config.maxRequestsPerSecond || 3,
    maxRequestsPerMinute: config.maxRequestsPerMinute || 100,
  };
}

/**
 * Check and enforce rate limits
 * @param {Object} rateLimiter - Rate limiter state
 * @returns {Promise<number>} Wait time in milliseconds before next request
 */
export async function checkRateLimit(rateLimiter) {
  const now = Date.now();

  // Clean old requests
  rateLimiter.requests = rateLimiter.requests.filter(
    timestamp => now - timestamp < 60000 // Keep requests from last minute
  );

  // Check per-second limit
  const recentRequests = rateLimiter.requests.filter(
    timestamp => now - timestamp < 1000
  );

  let waitTime = 0;

  if (recentRequests.length >= rateLimiter.maxRequestsPerSecond) {
    waitTime = 1000 - (now - recentRequests[0]);
  }

  // Check per-minute limit
  if (rateLimiter.requests.length >= rateLimiter.maxRequestsPerMinute) {
    const minuteWait = 60000 - (now - rateLimiter.requests[0]);
    waitTime = Math.max(waitTime, minuteWait);
  }

  if (waitTime > 0) {
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  rateLimiter.requests.push(now);
  return waitTime;
}

/**
 * Create retry configuration
 * @param {Object} config - Retry configuration
 * @returns {Object} Retry configuration
 */
export function createRetryConfig(config = {}) {
  return {
    maxRetries: config.maxRetries || 3,
    baseDelay: config.baseDelay || 1000,
    maxDelay: config.maxDelay || 10000,
    exponentialBase: config.exponentialBase || 2,
  };
}

/**
 * Execute operation with retry logic
 * @param {Function} operation - Async operation to execute
 * @param {Object} options - Retry options
 * @returns {Promise<any>} Operation result
 */
export async function withRetry(operation, options = {}) {
  const {
    retryConfig = createRetryConfig(),
    rateLimiter = createRateLimiter(),
    performanceMetrics = null,
    context = '',
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      await checkRateLimit(rateLimiter);
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;

      // Track performance metrics
      if (performanceMetrics) {
        performanceMetrics.queryCount++;
        performanceMetrics.averageQueryTime =
          (performanceMetrics.averageQueryTime *
            (performanceMetrics.queryCount - 1) +
            duration) /
          performanceMetrics.queryCount;

        if (duration > 5000) {
          // Track slow queries (>5s)
          performanceMetrics.slowQueries.push({
            context,
            duration,
            timestamp: new Date().toISOString(),
          });

          // Keep only last 10 slow queries
          if (performanceMetrics.slowQueries.length > 10) {
            performanceMetrics.slowQueries = performanceMetrics.slowQueries.slice(-10);
          }
        }
      }

      return result;
    } catch (error) {
      lastError = error;

      // Track error metrics
      if (performanceMetrics) {
        performanceMetrics.errorCount++;
      }

      // Don't retry on authentication errors
      if (error.code === 'unauthorized' || error.status === 401) {
        throw error;
      }

      if (attempt < retryConfig.maxRetries) {
        const delay = Math.min(
          retryConfig.baseDelay *
            Math.pow(retryConfig.exponentialBase, attempt),
          retryConfig.maxDelay
        );

        console.warn(
          `⚠️ Notion API attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          error.message
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(
    `❌ Notion API operation failed after ${retryConfig.maxRetries + 1} attempts:`,
    lastError.message
  );
  throw lastError;
}

export default {
  createRateLimiter,
  checkRateLimit,
  createRetryConfig,
  withRetry,
};
