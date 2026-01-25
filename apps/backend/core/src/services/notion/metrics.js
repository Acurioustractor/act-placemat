/**
 * Notion Metrics Module
 * Handles performance metrics and health checks for Notion service
 */

/**
 * Create performance metrics tracker
 * @returns {Object} Performance metrics
 */
export function createPerformanceMetrics() {
  return {
    averageQueryTime: 0,
    queryCount: 0,
    slowQueries: [],
    errorCount: 0,
  };
}

/**
 * Get performance metrics
 * @param {Object} performanceMetrics - Performance metrics
 * @returns {Object} Formatted metrics
 */
export function getPerformanceMetrics(performanceMetrics) {
  return {
    ...performanceMetrics,
    slowQueriesCount: performanceMetrics.slowQueries.length,
    errorRate:
      performanceMetrics.queryCount > 0
        ? performanceMetrics.errorCount / performanceMetrics.queryCount
        : 0,
  };
}

/**
 * Reset performance metrics
 * @param {Object} performanceMetrics - Performance metrics to reset
 * @returns {Object} Reset metrics
 */
export function resetPerformanceMetrics(performanceMetrics) {
  performanceMetrics.averageQueryTime = 0;
  performanceMetrics.queryCount = 0;
  performanceMetrics.slowQueries = [];
  performanceMetrics.errorCount = 0;

  return performanceMetrics;
}

/**
 * Track a query execution
 * @param {Object} options - Query tracking options
 */
export function trackQuery(options = {}) {
  const { performanceMetrics, duration, context = '' } = options;

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

/**
 * Track an error
 * @param {Object} performanceMetrics - Performance metrics
 */
export function trackError(performanceMetrics) {
  performanceMetrics.errorCount++;
}

/**
 * Perform health check
 * @param {Object} options - Health check options
 * @returns {Promise<Object>} Health status
 */
export async function healthCheck(options = {}) {
  const {
    notion,
    isOAuthAuthenticated,
    databaseConfigs,
    performanceMetrics,
    cacheStats,
    getCacheMetrics,
    queryNotion,
  } = options;

  const health = {
    overall: 'healthy',
    version: '2025.1',
    authentication: {
      type: isOAuthAuthenticated ? 'oauth' : 'token',
      status: notion ? 'connected' : 'disconnected',
    },
    databases: {},
    configured: 0,
    accessible: 0,
    performance: getPerformanceMetrics(performanceMetrics),
    cache: getCacheMetrics ? getCacheMetrics() : {},
  };

  for (const [name, dbConfig] of Object.entries(databaseConfigs)) {
    if (dbConfig.id) {
      health.configured++;
      try {
        const result = await queryNotion({
          notion,
          databaseId: dbConfig.id,
          filter: {},
          sorts: [],
          pageSize: 1,
          getAllPages: false,
        });
        health.databases[name] = {
          status: 'healthy',
          configured: true,
          accessible: true,
          records: result.length,
          version: dbConfig.version,
          lastUpdated: dbConfig.lastUpdated,
          databaseId: dbConfig.id,
          apiVersion: '2022-06-28',
          schema: dbConfig.schema
            ? Object.keys(dbConfig.schema.properties).length
            : 0,
        };
        health.accessible++;
      } catch (error) {
        health.databases[name] = {
          status: 'error',
          configured: true,
          accessible: false,
          error: error.message,
          version: dbConfig.version,
          databaseId: dbConfig.id,
          apiVersion: '2022-06-28',
        };
        health.overall = 'degraded';
      }
    } else {
      health.databases[name] = {
        status: 'not_configured',
        configured: false,
        accessible: false,
      };
    }
  }

  if (health.accessible === 0) {
    health.overall = 'unhealthy';
  }

  return health;
}

/**
 * Get cache memory estimate
 * @param {Object} cache - Cache instance
 * @returns {Object} Memory estimate
 */
export function getCacheMemoryEstimate(cache) {
  let estimatedBytes = 0;

  for (const [key, value] of cache.entries()) {
    // Rough estimate: key + data JSON size
    estimatedBytes += key.length * 2; // Unicode characters
    estimatedBytes += JSON.stringify(value.data).length * 2;
  }

  return {
    bytes: estimatedBytes,
    kilobytes: Math.round(estimatedBytes / 1024),
    megabytes: Math.round((estimatedBytes / (1024 * 1024)) * 100) / 100,
  };
}

/**
 * Get formatted cache metrics
 * @param {Object} cacheStats - Cache statistics
 * @param {Object} cache - Cache instance
 * @returns {Object} Formatted metrics
 */
export function getCacheMetrics(cacheStats, cache) {
  const hitRate =
    cacheStats.totalQueries > 0
      ? cacheStats.hits / cacheStats.totalQueries
      : 0;

  return {
    ...cacheStats,
    hitRate,
    cacheSize: cache.size,
    memoryUsage: getCacheMemoryEstimate(cache),
  };
}

/**
 * Create metrics reporter
 * @param {Object} options - Reporter options
 * @returns {Object} Metrics reporter
 */
export function createMetricsReporter(options = {}) {
  const { performanceMetrics, cacheStats, cache, logger = console } = options;

  return {
    getPerformanceMetrics: () => getPerformanceMetrics(performanceMetrics),
    getCacheMetrics: () => getCacheMetrics(cacheStats, cache),
    resetMetrics: () => {
      resetPerformanceMetrics(performanceMetrics);
      Object.assign(cacheStats, {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalQueries: 0,
      });
      logger.log('📊 Notion service performance metrics reset');
    },
    trackQuery: (duration, context) => trackQuery({ performanceMetrics, duration, context }),
    trackError: () => trackError(performanceMetrics),
    getHealth: () => healthCheck(options),
  };
}

export default {
  createPerformanceMetrics,
  getPerformanceMetrics,
  resetPerformanceMetrics,
  trackQuery,
  trackError,
  healthCheck,
  getCacheMemoryEstimate,
  getCacheMetrics,
  createMetricsReporter,
};
