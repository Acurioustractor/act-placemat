/**
 * Notion Caching Module
 * Handles caching logic for Notion data
 */

/**
 * Create a cache instance
 * @param {Object} options - Cache configuration
 * @returns {Object} Cache instance
 */
export function createCache(options = {}) {
  return {
    store: new Map(),
    timeout: options.timeout || 5 * 60 * 1000, // 5 minutes default
    stats: {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalQueries: 0,
    },
  };
}

/**
 * Generate cache key
 * @param {string} type - Cache type
 * @param {Object} filter - Filter object
 * @param {Array} sorts - Sort options
 * @returns {string} Cache key
 */
export function getCacheKey(type, filter = {}, sorts = []) {
  // Sort filter keys for consistent caching
  const sortedFilter = Object.keys(filter)
    .sort()
    .reduce((acc, key) => {
      acc[key] = filter[key];
      return acc;
    }, {});

  const filterString = JSON.stringify(sortedFilter);
  const sortsString = JSON.stringify(sorts);

  return `notion_${type}_${Buffer.from(filterString + sortsString).toString('base64')}`;
}

/**
 * Check if cache is valid
 * @param {Object} cache - Cache instance
 * @param {string} cacheKey - Cache key to check
 * @returns {boolean} Whether cache is valid
 */
export function isCacheValid(cache, cacheKey) {
  if (!cache.store.has(cacheKey)) {
    return false;
  }

  const entry = cache.store.get(cacheKey);
  const now = Date.now();

  if (now - entry.timestamp > cache.timeout) {
    // Cache expired
    cache.store.delete(cacheKey);
    cache.stats.evictions++;
    return false;
  }

  return true;
}

/**
 * Set cache value
 * @param {Object} cache - Cache instance
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export function setCache(cache, key, data) {
  cache.store.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Get cache value
 * @param {Object} cache - Cache instance
 * @param {string} key - Cache key
 * @returns {any} Cached data or undefined
 */
export function getCache(cache, key) {
  const entry = cache.store.get(key);
  return entry ? entry.data : undefined;
}

/**
 * Clear cache entries
 * @param {Object} cache - Cache instance
 * @param {string} pattern - Pattern to match (optional)
 * @returns {number} Number of entries cleared
 */
export function clearCache(cache, pattern = null) {
  if (!pattern) {
    const count = cache.store.size;
    cache.store.clear();
    cache.stats.evictions += count;
    return count;
  }

  let count = 0;
  for (const key of cache.store.keys()) {
    if (key.includes(pattern)) {
      cache.store.delete(key);
      count++;
    }
  }
  cache.stats.evictions += count;
  return count;
}

/**
 * Get cache metrics
 * @param {Object} cache - Cache instance
 * @returns {Object} Cache metrics
 */
export function getCacheMetrics(cache) {
  const hitRate =
    cache.stats.totalQueries > 0
      ? cache.stats.hits / cache.stats.totalQueries
      : 0;

  return {
    ...cache.stats,
    hitRate,
    cacheSize: cache.store.size,
    memoryUsage: getCacheMemoryEstimate(cache),
  };
}

/**
 * Estimate cache memory usage
 * @param {Object} cache - Cache instance
 * @returns {Object} Memory usage estimate
 */
export function getCacheMemoryEstimate(cache) {
  let estimatedBytes = 0;

  for (const [key, value] of cache.store.entries()) {
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
 * Create cache middleware for data fetchers
 * @param {Object} options - Middleware options
 * @returns {Function} Cache middleware function
 */
export function createCacheMiddleware(options = {}) {
  const {
    cache,
    keyPrefix = 'notion',
    ttl = 5 * 60 * 1000,
  } = options;

  return async function cacheMiddleware(key, fetcher, { useCache = true } = {}) {
    const cacheKey = getCacheKey(keyPrefix + '_' + key);

    if (useCache && isCacheValid(cache, cacheKey)) {
      cache.stats.hits++;
      return getCache(cache, cacheKey);
    }

    cache.stats.misses++;
    const result = await fetcher();

    setCache(cache, cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl,
    });

    return result;
  };
}

export default {
  createCache,
  getCacheKey,
  isCacheValid,
  setCache,
  getCache,
  clearCache,
  getCacheMetrics,
  getCacheMemoryEstimate,
  createCacheMiddleware,
};
