/**
 * Performance Optimization Middleware
 * Combines caching, rate limiting, response compression, and query optimization
 */

import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { cacheService } from '../services/cacheService.js';
import { mlCacheService } from '../services/mlCacheService.js';

/**
 * Intelligent Rate Limiting with different tiers
 */
export const createSmartRateLimit = (config = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    standardLimit = 100,
    authLimit = 1000,
    apiKeyLimit = 5000,
    skipSuccessfulRequests = false
  } = config;

  return rateLimit({
    windowMs,
    limit: (req) => {
      // API key users get higher limits
      if (req.headers['x-api-key']) {
        return apiKeyLimit;
      }
      
      // Authenticated users get higher limits
      if (req.user || req.headers.authorization) {
        return authLimit;
      }
      
      // Standard rate limit for public endpoints
      return standardLimit;
    },
    message: {
      error: 'Too many requests',
      retry_after: Math.ceil(windowMs / 1000),
      upgrade_info: 'Use API key for higher rate limits'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
};

/**
 * Response caching middleware
 */
export const responseCache = (options = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    skipCache = () => false
  } = options;

  return async (req, res, next) => {
    if (skipCache(req) || req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      const cached = await cacheService.getCachedQueryEnhanced('api-response', { key: cacheKey }, []);
      
      if (cached.fromCache) {
        res.set('X-Cache-Status', `HIT-${cached.source?.toUpperCase()}`);
        res.set('X-Cache-Key', cacheKey);
        return res.json(cached.data);
      }
      
      // Capture response for caching
      const originalJson = res.json;
      res.json = function(data) {
        res.set('X-Cache-Status', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        
        // Cache successful responses
        if (res.statusCode === 200) {
          cacheService.setCachedQueryEnhanced('api-response', { key: cacheKey }, [], data)
            .catch(err => console.warn('⚠️ Response caching failed:', err.message));
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.warn('⚠️ Response cache middleware error:', error.message);
      next();
    }
  };
};

/**
 * Database query optimization middleware
 */
export const queryOptimization = () => {
  return (req, res, next) => {
    // Add optimized query helper to request
    req.optimizedQuery = async (query, params = []) => {
      try {
        return await cacheService.executeOptimizedQuery(query, params);
      } catch (error) {
        console.error('🚨 Optimized query failed:', error.message);
        throw error;
      }
    };
    
    // Add ML cache helpers to request
    req.mlCache = {
      getEmbedding: (text, modelId) => mlCacheService.getCachedEmbedding(text, modelId),
      setEmbedding: (text, modelId, embedding) => mlCacheService.cacheEmbedding(text, modelId, embedding),
      getInference: (prompt, modelId) => mlCacheService.getCachedInference(prompt, modelId),
      setInference: (prompt, modelId, response, metadata) => mlCacheService.cacheInference(prompt, modelId, response, metadata),
      getAnalysis: (input, type) => mlCacheService.getCachedAnalysis(input, type),
      setAnalysis: (input, type, result) => mlCacheService.cacheAnalysis(input, type, result)
    };
    
    next();
  };
};

/**
 * Smart compression middleware
 */
export const smartCompression = () => {
  return compression({
    // Only compress responses that are above 1kb
    threshold: 1024,
    // Compress JSON, text, and HTML
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      
      const contentType = res.getHeader('Content-Type');
      if (!contentType) return false;
      
      return /json|text|html|javascript|css/.test(contentType);
    },
    // Use higher compression for API responses
    level: 6,
    // Set Vary header
    chunkSize: 1024
  });
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitoring = () => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Track memory usage at request start
    const memoryBefore = process.memoryUsage();
    
    // Override end method to capture performance metrics
    const originalEnd = res.end;
    res.end = function(...args) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const memoryAfter = process.memoryUsage();
      
      // Log performance metrics for slow requests
      if (responseTime > 1000) {
        console.warn(`🐌 Slow request: ${req.method} ${req.originalUrl} took ${responseTime}ms`);
      }
      
      // Add performance headers
      res.set('X-Response-Time', `${responseTime}ms`);
      res.set('X-Memory-Delta', `${(memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024}MB`);
      
      // Track in cache service
      cacheService.performanceStats.totalRequests++;
      cacheService.updateAverageResponseTime(responseTime);
      
      return originalEnd.apply(this, args);
    };
    
    next();
  };
};

/**
 * CDN optimization headers
 */
export const cdnOptimization = () => {
  return (req, res, next) => {
    // Set appropriate cache headers for different content types
    if (req.path.includes('/api/')) {
      // API responses - short cache
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    } else if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
      // Static assets - long cache
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
      res.set('Expires', new Date(Date.now() + 31536000000).toUTCString());
    } else {
      // HTML and other content - medium cache
      res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    }
    
    // Enable GZIP compression hint
    res.set('Vary', 'Accept-Encoding');
    
    next();
  };
};

/**
 * Request preprocessing for common optimizations
 */
export const requestPreprocessing = () => {
  return (req, res, next) => {
    // Parse and optimize query parameters
    if (req.query) {
      // Normalize limit parameters
      if (req.query.limit) {
        req.query.limit = Math.min(parseInt(req.query.limit) || 10, 100);
      }
      
      // Normalize offset parameters
      if (req.query.offset) {
        req.query.offset = Math.max(parseInt(req.query.offset) || 0, 0);
      }
      
      // Convert string booleans
      Object.keys(req.query).forEach(key => {
        if (req.query[key] === 'true') req.query[key] = true;
        if (req.query[key] === 'false') req.query[key] = false;
      });
    }
    
    // Add request ID for tracking
    req.requestId = generateRequestId();
    res.set('X-Request-ID', req.requestId);
    
    next();
  };
};

/**
 * Memory usage optimization
 */
export const memoryOptimization = () => {
  let lastGC = Date.now();
  
  return (req, res, next) => {
    // Force garbage collection every 5 minutes if available
    if (global.gc && Date.now() - lastGC > 300000) {
      try {
        global.gc();
        lastGC = Date.now();
        console.log('🗑️ Forced garbage collection');
      } catch (error) {
        // Ignore GC errors
      }
    }
    
    // Monitor memory usage
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
      console.warn(`⚠️ High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    }
    
    next();
  };
};

/**
 * Combine all performance optimizations
 */
export const performanceOptimizationBundle = (options = {}) => {
  const {
    enableRateLimit = true,
    enableCaching = true,
    enableCompression = true,
    enableMonitoring = true,
    enableCDN = true,
    rateLimitConfig = {}
  } = options;

  const middlewares = [];
  
  if (enableRateLimit) {
    middlewares.push(createSmartRateLimit(rateLimitConfig));
  }
  
  if (enableCompression) {
    middlewares.push(smartCompression());
  }
  
  if (enableCDN) {
    middlewares.push(cdnOptimization());
  }
  
  middlewares.push(requestPreprocessing());
  middlewares.push(queryOptimization());
  
  if (enableCaching) {
    middlewares.push(responseCache());
  }
  
  if (enableMonitoring) {
    middlewares.push(performanceMonitoring());
  }
  
  middlewares.push(memoryOptimization());
  
  return middlewares;
};

/**
 * Helper functions
 */
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get performance optimization status
 */
export const getPerformanceStatus = () => {
  return {
    cache_service: cacheService.getEnhancedPerformanceStats(),
    ml_cache: mlCacheService.getMLCacheStats(),
    system_memory: process.memoryUsage(),
    optimization_features: [
      'Smart rate limiting',
      'Multi-layer caching',
      'Response compression',
      'Database connection pooling',
      'ML model result caching',
      'CDN optimization headers',
      'Memory usage monitoring',
      'Request preprocessing'
    ],
    performance_targets: {
      api_response_time: '< 2000ms',
      cache_hit_rate: '> 70%',
      memory_usage: '< 500MB',
      rate_limit_compliance: '> 95%'
    }
  };
};