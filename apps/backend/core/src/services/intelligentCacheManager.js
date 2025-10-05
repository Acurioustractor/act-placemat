/**
 * Intelligent Cache Manager
 * Advanced caching system for financial insights and recommendations
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

class IntelligentCacheManager {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.localCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
    };
    
    // Cache configuration
    this.config = {
      insights: { ttl: 300, prefix: 'insights:' }, // 5 minutes
      recommendations: { ttl: 600, prefix: 'recommendations:' }, // 10 minutes
      patterns: { ttl: 1800, prefix: 'patterns:' }, // 30 minutes
      predictions: { ttl: 3600, prefix: 'predictions:' }, // 1 hour
      financial_summary: { ttl: 900, prefix: 'financial:' }, // 15 minutes
      xero_data: { ttl: 1200, prefix: 'xero:' }, // 20 minutes
    };
    
    // Initialize cleanup intervals
    this.startCleanupInterval();
    
    console.log('🗄️ Intelligent Cache Manager initialized');
  }

  /**
   * Generate cache key with context
   */
  generateKey(type, identifier, context = {}) {
    const config = this.config[type] || this.config.insights;
    const contextStr = Object.keys(context).length > 0 
      ? ':' + Object.entries(context)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
      : '';
    
    return `${config.prefix}${identifier}${contextStr}`;
  }

  /**
   * Smart cache get with multi-level fallback
   */
  async get(type, identifier, context = {}) {
    const key = this.generateKey(type, identifier, context);
    
    try {
      // L1: Local memory cache (fastest)
      if (this.localCache.has(key)) {
        const cached = this.localCache.get(key);
        if (cached.expires > Date.now()) {
          this.cacheStats.hits++;
          console.log(`🎯 Cache HIT (L1): ${key}`);
          return cached.data;
        } else {
          this.localCache.delete(key);
        }
      }
      
      // L2: Redis cache
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        const parsed = JSON.parse(redisValue);
        
        // Promote to L1 cache for frequently accessed items
        if (parsed.accessCount && parsed.accessCount > 2) {
          const config = this.config[type] || this.config.insights;
          this.localCache.set(key, {
            data: parsed.data,
            expires: Date.now() + (config.ttl * 1000 * 0.8) // 80% of Redis TTL
          });
        }
        
        // Increment access count
        parsed.accessCount = (parsed.accessCount || 0) + 1;
        await this.redis.setex(key, (this.config[type] || this.config.insights).ttl, JSON.stringify(parsed));
        
        this.cacheStats.hits++;
        console.log(`🎯 Cache HIT (L2): ${key}`);
        return parsed.data;
      }
      
      this.cacheStats.misses++;
      console.log(`❌ Cache MISS: ${key}`);
      return null;
      
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error.message);
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Smart cache set with automatic invalidation
   */
  async set(type, identifier, data, context = {}, customTTL = null) {
    const key = this.generateKey(type, identifier, context);
    const config = this.config[type] || this.config.insights;
    const ttl = customTTL || config.ttl;
    
    try {
      const cacheEntry = {
        data,
        cachedAt: new Date().toISOString(),
        accessCount: 0,
        context,
        type
      };
      
      // Set in Redis with TTL
      await this.redis.setex(key, ttl, JSON.stringify(cacheEntry));
      
      // Set in local cache for frequently accessed items
      if (type === 'insights' || type === 'recommendations') {
        this.localCache.set(key, {
          data,
          expires: Date.now() + (ttl * 1000 * 0.5) // 50% of Redis TTL
        });
      }
      
      this.cacheStats.sets++;
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
      
      // Schedule invalidation callbacks if needed
      this.scheduleInvalidation(type, identifier, context, ttl);
      
      return true;
      
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Invalidate related cache entries
   */
  async invalidate(patterns) {
    if (!Array.isArray(patterns)) {
      patterns = [patterns];
    }
    
    let invalidated = 0;
    
    for (const pattern of patterns) {
      try {
        // Redis pattern matching
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          invalidated += keys.length;
        }
        
        // Local cache pattern matching
        for (const [key] of this.localCache.entries()) {
          if (this.matchPattern(key, pattern)) {
            this.localCache.delete(key);
            invalidated++;
          }
        }
        
      } catch (error) {
        console.error(`Cache invalidation error for pattern ${pattern}:`, error.message);
      }
    }
    
    if (invalidated > 0) {
      console.log(`🗑️ Invalidated ${invalidated} cache entries`);
    }
    
    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      ...this.cacheStats,
      hitRate: total > 0 ? ((this.cacheStats.hits / total) * 100).toFixed(2) : '0.00',
      localCacheSize: this.localCache.size,
      totalRequests: total
    };
  }

  /**
   * Warm cache with predictive loading
   */
  async warmCache(type, identifier, dataLoader, context = {}) {
    const existing = await this.get(type, identifier, context);
    
    if (!existing) {
      console.log(`🔥 Warming cache for ${type}:${identifier}`);
      try {
        const data = await dataLoader();
        if (data) {
          await this.set(type, identifier, data, context);
          return data;
        }
      } catch (error) {
        console.error(`Cache warming failed for ${type}:${identifier}:`, error.message);
      }
    }
    
    return existing;
  }

  /**
   * Batch cache operations
   */
  async batchSet(entries) {
    const pipeline = this.redis.pipeline();
    const results = [];
    
    for (const { type, identifier, data, context = {}, customTTL } of entries) {
      const key = this.generateKey(type, identifier, context);
      const config = this.config[type] || this.config.insights;
      const ttl = customTTL || config.ttl;
      
      const cacheEntry = {
        data,
        cachedAt: new Date().toISOString(),
        accessCount: 0,
        context,
        type
      };
      
      pipeline.setex(key, ttl, JSON.stringify(cacheEntry));
      results.push({ key, ttl });
    }
    
    try {
      await pipeline.exec();
      this.cacheStats.sets += entries.length;
      console.log(`💾 Batch cached ${entries.length} entries`);
      return results;
    } catch (error) {
      console.error('Batch cache error:', error.message);
      return [];
    }
  }

  /**
   * Cache-aside pattern helper
   */
  async getOrSet(type, identifier, dataLoader, context = {}, customTTL = null) {
    // Try to get from cache first
    let data = await this.get(type, identifier, context);
    
    if (!data) {
      // Cache miss - load data
      try {
        console.log(`🔄 Loading data for ${type}:${identifier}`);
        data = await dataLoader();
        
        if (data !== null && data !== undefined) {
          await this.set(type, identifier, data, context, customTTL);
        }
      } catch (error) {
        console.error(`Data loading failed for ${type}:${identifier}:`, error.message);
        throw error;
      }
    }
    
    return data;
  }

  /**
   * Schedule cache invalidation based on data dependencies
   */
  scheduleInvalidation(type, identifier, context, ttl) {
    // Invalidate related caches when financial data changes
    if (type === 'xero_data' || type === 'financial_summary') {
      setTimeout(async () => {
        await this.invalidate([
          'insights:*',
          'recommendations:*',
          'patterns:*'
        ]);
      }, ttl * 1000);
    }
  }

  /**
   * Pattern matching helper
   */
  matchPattern(str, pattern) {
    // Convert Redis-style pattern to RegExp
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regexPattern}$`).test(str);
  }

  /**
   * Start cleanup intervals
   */
  startCleanupInterval() {
    // Clean local cache every 5 minutes
    setInterval(() => {
      const now = Date.now();
      let evicted = 0;
      
      for (const [key, value] of this.localCache.entries()) {
        if (value.expires <= now) {
          this.localCache.delete(key);
          evicted++;
        }
      }
      
      if (evicted > 0) {
        this.cacheStats.evictions += evicted;
        console.log(`🧹 Evicted ${evicted} expired entries from local cache`);
      }
    }, 300000); // 5 minutes

    // Log cache stats every hour
    setInterval(() => {
      const stats = this.getStats();
      console.log(`📊 Cache Stats: ${stats.hitRate}% hit rate, ${stats.localCacheSize} local entries, ${stats.totalRequests} total requests`);
    }, 3600000); // 1 hour
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.redis.ping();
      const stats = this.getStats();
      
      return {
        status: 'healthy',
        redis: 'connected',
        stats,
        localCacheSize: this.localCache.size
      };
    } catch (error) {
      return {
        status: 'degraded',
        redis: 'disconnected',
        error: error.message,
        localCacheSize: this.localCache.size
      };
    }
  }
}

// Export singleton instance
export default new IntelligentCacheManager();