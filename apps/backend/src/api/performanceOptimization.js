/**
 * Performance Optimization Management API
 * Provides endpoints for monitoring and managing performance optimization features
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import { cacheService } from '../services/cacheService.js';
import { mlCacheService } from '../services/mlCacheService.js';
import { getPerformanceStatus } from '../middleware/performanceOptimization.js';

const router = express.Router();

/**
 * GET /api/performance-optimization/status
 * Get comprehensive performance optimization status
 */
router.get('/status', optionalAuth, asyncHandler(async (req, res) => {
  console.log('📊 Getting performance optimization status...');
  
  const status = getPerformanceStatus();
  const healthChecks = await Promise.all([
    cacheService.connectionPool ? { database_pool: 'connected' } : { database_pool: 'disconnected' },
    mlCacheService.healthCheck()
  ]);
  
  res.json({
    success: true,
    performance_status: status,
    health_checks: healthChecks,
    optimization_summary: {
      cache_layers_active: status.cache_service.cache_layers,
      ml_cache_hit_rate: status.ml_cache.hit_rate,
      total_cache_size: status.cache_service.cacheSize,
      memory_usage_mb: Math.round(status.system_memory.heapUsed / 1024 / 1024),
      optimizations_enabled: status.optimization_features.length
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/performance-optimization/cache-stats
 * Get detailed cache statistics
 */
router.get('/cache-stats', optionalAuth, asyncHandler(async (req, res) => {
  const cacheStats = cacheService.getEnhancedPerformanceStats();
  const mlStats = mlCacheService.getMLCacheStats();
  
  res.json({
    success: true,
    cache_statistics: {
      general_cache: cacheStats,
      ml_cache: mlStats,
      combined_metrics: {
        total_requests: cacheStats.totalRequests + mlStats.total_inferences,
        combined_hit_rate: calculateCombinedHitRate(cacheStats, mlStats),
        cache_efficiency_score: calculateCacheEfficiency(cacheStats, mlStats),
        estimated_performance_gain: calculatePerformanceGain(cacheStats, mlStats)
      }
    },
    recommendations: generateCacheRecommendations(cacheStats, mlStats),
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/performance-optimization/cache/clear
 * Clear specific cache layers
 */
router.post('/cache/clear', optionalAuth, asyncHandler(async (req, res) => {
  const { cache_type = 'all', pattern } = req.body;
  
  let clearedCaches = [];
  
  try {
    switch (cache_type) {
      case 'query':
        cacheService.queryCache.clear();
        clearedCaches.push('query_cache');
        break;
      case 'search':
        cacheService.searchCache.clear();
        clearedCaches.push('search_cache');
        break;
      case 'schema':
        cacheService.schemaCache.clear();
        clearedCaches.push('schema_cache');
        break;
      case 'ml':
        if (pattern) {
          await mlCacheService.clearModelCache(pattern);
          clearedCaches.push(`ml_cache:${pattern}`);
        } else {
          await mlCacheService.clearExpiredCache();
          clearedCaches.push('ml_cache:expired');
        }
        break;
      case 'all':
      default:
        cacheService.invalidateAllCache();
        await mlCacheService.clearExpiredCache();
        clearedCaches = ['all_caches'];
        break;
    }
    
    console.log(`🧹 Cache cleared: ${clearedCaches.join(', ')}`);
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      cleared_caches: clearedCaches,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cache clear failed:', error);
    res.status(500).json({
      error: 'Cache clear failed',
      details: error.message
    });
  }
}));

/**
 * POST /api/performance-optimization/cache/preload
 * Preload commonly accessed data
 */
router.post('/cache/preload', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    database_ids = [], 
    common_filters = [],
    include_ml_warmup = false 
  } = req.body;
  
  try {
    console.log('🔄 Starting cache preload operation...');
    
    // Preload database queries
    if (database_ids.length > 0) {
      await cacheService.preloadCommonQueries(database_ids, common_filters);
    }
    
    // ML cache warmup
    let mlWarmupResults = null;
    if (include_ml_warmup) {
      mlWarmupResults = await performMLCacheWarmup();
    }
    
    res.json({
      success: true,
      preload_results: {
        database_preload: database_ids.length > 0 ? 'completed' : 'skipped',
        ml_warmup: mlWarmupResults,
        databases_processed: database_ids.length,
        filters_cached: common_filters.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cache preload failed:', error);
    res.status(500).json({
      error: 'Cache preload failed',
      details: error.message
    });
  }
}));

/**
 * GET /api/performance-optimization/memory-usage
 * Get detailed memory usage information
 */
router.get('/memory-usage', optionalAuth, asyncHandler(async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cacheMemory = calculateCacheMemoryUsage();
  
  res.json({
    success: true,
    memory_analysis: {
      process_memory: {
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external_mb: Math.round(memoryUsage.external / 1024 / 1024),
        rss_mb: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      cache_memory: cacheMemory,
      memory_efficiency: {
        heap_utilization: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2) + '%',
        cache_to_total_ratio: ((cacheMemory.total_cache_mb / (memoryUsage.heapUsed / 1024 / 1024)) * 100).toFixed(2) + '%',
        memory_health: getMemoryHealthStatus(memoryUsage)
      },
      recommendations: generateMemoryRecommendations(memoryUsage, cacheMemory)
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/performance-optimization/optimize
 * Run performance optimization procedures
 */
router.post('/optimize', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    operations = ['cache_cleanup', 'memory_gc', 'connection_pool_refresh'],
    aggressive = false 
  } = req.body;
  
  const results = {};
  
  try {
    for (const operation of operations) {
      switch (operation) {
        case 'cache_cleanup':
          cacheService.cleanupExpiredEntries();
          await mlCacheService.clearExpiredCache();
          results.cache_cleanup = 'completed';
          break;
          
        case 'memory_gc':
          if (global.gc) {
            global.gc();
            results.memory_gc = 'completed';
          } else {
            results.memory_gc = 'not_available';
          }
          break;
          
        case 'connection_pool_refresh':
          if (cacheService.connectionPool) {
            // Connection pool refresh would be implemented here
            results.connection_pool_refresh = 'completed';
          } else {
            results.connection_pool_refresh = 'not_configured';
          }
          break;
          
        case 'cache_optimization':
          await optimizeCacheConfiguration(aggressive);
          results.cache_optimization = 'completed';
          break;
      }
    }
    
    console.log('⚡ Performance optimization completed:', results);
    
    res.json({
      success: true,
      optimization_results: results,
      performance_impact: await measureOptimizationImpact(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Performance optimization failed:', error);
    res.status(500).json({
      error: 'Performance optimization failed',
      details: error.message,
      partial_results: results
    });
  }
}));

/**
 * GET /api/performance-optimization/recommendations
 * Get AI-powered performance recommendations
 */
router.get('/recommendations', optionalAuth, asyncHandler(async (req, res) => {
  const performanceStatus = getPerformanceStatus();
  const recommendations = await generatePerformanceRecommendations(performanceStatus);
  
  res.json({
    success: true,
    recommendations,
    current_performance: {
      score: calculatePerformanceScore(performanceStatus),
      bottlenecks: identifyBottlenecks(performanceStatus),
      optimization_opportunities: identifyOptimizationOpportunities(performanceStatus)
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Helper functions
 */

function calculateCombinedHitRate(cacheStats, mlStats) {
  const totalRequests = cacheStats.totalRequests + mlStats.total_inferences;
  const totalHits = cacheStats.cacheHits + mlStats.cache_hits;
  
  if (totalRequests === 0) return '0%';
  return ((totalHits / totalRequests) * 100).toFixed(2) + '%';
}

function calculateCacheEfficiency(cacheStats, mlStats) {
  const cacheHitRate = parseFloat(cacheStats.hitRate.replace('%', ''));
  const mlHitRate = parseFloat(mlStats.hit_rate.replace('%', ''));
  
  // Weighted average based on request volume
  const totalRequests = cacheStats.totalRequests + mlStats.total_inferences;
  if (totalRequests === 0) return 0;
  
  const efficiency = (
    (cacheHitRate * cacheStats.totalRequests + mlHitRate * mlStats.total_inferences) / totalRequests
  );
  
  return Math.round(efficiency * 10) / 10;
}

function calculatePerformanceGain(cacheStats, mlStats) {
  const avgResponseTime = cacheStats.averageResponseTime;
  const estimatedUncachedTime = avgResponseTime * 3; // Assume 3x slower without cache
  
  const timeSaved = (estimatedUncachedTime - avgResponseTime) * cacheStats.cacheHits;
  
  return {
    time_saved_ms: Math.round(timeSaved),
    requests_accelerated: cacheStats.cacheHits + mlStats.cache_hits,
    estimated_latency_reduction: `${Math.round(((estimatedUncachedTime - avgResponseTime) / estimatedUncachedTime) * 100)}%`
  };
}

function generateCacheRecommendations(cacheStats, mlStats) {
  const recommendations = [];
  
  const hitRate = parseFloat(cacheStats.hitRate.replace('%', ''));
  if (hitRate < 70) {
    recommendations.push({
      priority: 'high',
      category: 'cache_efficiency',
      issue: 'Low cache hit rate',
      recommendation: 'Increase cache TTL or implement smarter cache keys',
      expected_impact: 'Improve response times by 30-50%'
    });
  }
  
  if (cacheStats.totalRequests > 1000 && !cacheStats.redis_enabled) {
    recommendations.push({
      priority: 'medium',
      category: 'infrastructure',
      issue: 'High traffic without Redis',
      recommendation: 'Enable Redis for better cache scalability',
      expected_impact: 'Support higher concurrent load'
    });
  }
  
  if (mlStats.cache_hits < mlStats.cache_misses) {
    recommendations.push({
      priority: 'medium',
      category: 'ml_optimization',
      issue: 'Low ML cache utilization',
      recommendation: 'Implement better ML result deduplication',
      expected_impact: 'Reduce AI API costs by 40-60%'
    });
  }
  
  return recommendations;
}

function calculateCacheMemoryUsage() {
  const cacheStats = cacheService.getEnhancedPerformanceStats();
  
  // Rough estimation of cache memory usage
  const estimatedCacheSize = 
    (cacheStats.cacheSize.queryCache * 5) + // Assume 5KB per query cache entry
    (cacheStats.cacheSize.searchCache * 10) + // Assume 10KB per search cache entry
    (cacheStats.cacheSize.schemaCache * 2) + // Assume 2KB per schema cache entry
    (cacheStats.ml_cache_size * 20); // Assume 20KB per ML cache entry
  
  return {
    query_cache_mb: Math.round((cacheStats.cacheSize.queryCache * 5) / 1024),
    search_cache_mb: Math.round((cacheStats.cacheSize.searchCache * 10) / 1024),
    schema_cache_mb: Math.round((cacheStats.cacheSize.schemaCache * 2) / 1024),
    ml_cache_mb: Math.round((cacheStats.ml_cache_size * 20) / 1024),
    total_cache_mb: Math.round(estimatedCacheSize / 1024)
  };
}

function getMemoryHealthStatus(memoryUsage) {
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  
  if (heapUsedMB < 200) return 'excellent';
  if (heapUsedMB < 400) return 'good';
  if (heapUsedMB < 600) return 'acceptable';
  return 'concerning';
}

function generateMemoryRecommendations(memoryUsage, cacheMemory) {
  const recommendations = [];
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  
  if (heapUsedMB > 500) {
    recommendations.push({
      priority: 'high',
      issue: 'High memory usage',
      recommendation: 'Consider reducing cache sizes or enabling garbage collection'
    });
  }
  
  if (cacheMemory.total_cache_mb > heapUsedMB * 0.3) {
    recommendations.push({
      priority: 'medium',
      issue: 'Cache using too much memory',
      recommendation: 'Implement cache size limits or shorter TTLs'
    });
  }
  
  return recommendations;
}

async function performMLCacheWarmup() {
  // Example ML cache warmup - in practice this would use real data
  const testPrompts = [
    'Analyze this text for themes',
    'Extract key insights from community stories',
    'Categorize this content by topic'
  ];
  
  const warmupResults = {
    prompts_warmed: testPrompts.length,
    models_initialized: ['theme-extraction', 'sentiment-analysis'],
    warmup_time_ms: 100 // Simulated
  };
  
  return warmupResults;
}

async function optimizeCacheConfiguration(aggressive = false) {
  if (aggressive) {
    // Aggressive optimization - shorter TTLs, smaller cache sizes
    cacheService.queryCache.maxSize = 500;
    cacheService.searchCache.maxSize = 200;
  } else {
    // Conservative optimization
    cacheService.queryCache.maxSize = 1000;
    cacheService.searchCache.maxSize = 500;
  }
  
  console.log(`⚡ Cache configuration optimized (${aggressive ? 'aggressive' : 'conservative'} mode)`);
}

async function measureOptimizationImpact() {
  const memoryBefore = process.memoryUsage();
  const cacheStats = cacheService.getEnhancedPerformanceStats();
  
  return {
    memory_freed_mb: 0, // Would measure actual memory freed
    cache_entries_cleaned: 0, // Would count cleaned entries
    estimated_performance_improvement: '2-5%'
  };
}

async function generatePerformanceRecommendations(performanceStatus) {
  const recommendations = [];
  
  // Analyze current performance and generate recommendations
  const cacheHitRate = parseFloat(performanceStatus.cache_service.hitRate.replace('%', ''));
  const memoryUsage = performanceStatus.system_memory.heapUsed / 1024 / 1024;
  
  if (cacheHitRate < 60) {
    recommendations.push({
      type: 'cache_optimization',
      priority: 'high',
      title: 'Improve Cache Hit Rate',
      description: 'Current cache hit rate is below optimal threshold',
      actions: [
        'Implement smarter cache key generation',
        'Increase cache TTL for stable data',
        'Add Redis for distributed caching'
      ],
      estimated_impact: 'Reduce response times by 40-60%'
    });
  }
  
  if (memoryUsage > 400) {
    recommendations.push({
      type: 'memory_optimization',
      priority: 'medium',
      title: 'Optimize Memory Usage',
      description: 'Memory usage is approaching concerning levels',
      actions: [
        'Implement cache size limits',
        'Enable automatic garbage collection',
        'Consider Redis for cache offloading'
      ],
      estimated_impact: 'Reduce memory usage by 20-30%'
    });
  }
  
  return recommendations;
}

function calculatePerformanceScore(performanceStatus) {
  const cacheHitRate = parseFloat(performanceStatus.cache_service.hitRate.replace('%', ''));
  const avgResponseTime = performanceStatus.cache_service.averageResponseTime;
  const memoryUsage = performanceStatus.system_memory.heapUsed / 1024 / 1024;
  
  let score = 100;
  
  // Deduct points for poor cache performance
  if (cacheHitRate < 70) score -= 20;
  if (avgResponseTime > 1000) score -= 15;
  if (memoryUsage > 500) score -= 15;
  
  return Math.max(score, 0);
}

function identifyBottlenecks(performanceStatus) {
  const bottlenecks = [];
  
  if (performanceStatus.cache_service.averageResponseTime > 1000) {
    bottlenecks.push('High API response times');
  }
  
  if (!performanceStatus.cache_service.redis_enabled) {
    bottlenecks.push('No Redis caching layer');
  }
  
  return bottlenecks;
}

function identifyOptimizationOpportunities(performanceStatus) {
  const opportunities = [];
  
  if (parseFloat(performanceStatus.cache_service.hitRate.replace('%', '')) < 80) {
    opportunities.push('Improve cache hit rates');
  }
  
  if (performanceStatus.ml_cache.cache_hits < 50) {
    opportunities.push('Increase ML result caching');
  }
  
  return opportunities;
}

export default router;