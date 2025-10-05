/**
 * Performance Caching System
 * 
 * High-performance caching solution for policy decisions and related data
 * with support for Redis, in-memory caching, and comprehensive monitoring
 */

// Core types
export * from './types';

// Cache key building utilities
export { CacheKeyBuilder, KeyTemplate } from './CacheKeyBuilder';

// Cache providers
export { RedisCacheProvider } from './RedisCacheProvider';
export type { RedisClient, RedisMulti, RedisPipeline } from './RedisCacheProvider';
export { InMemoryCacheProvider } from './InMemoryCacheProvider';

// Policy decision cache
export { PolicyDecisionCache } from './PolicyDecisionCache';

// Monitoring and health checking
export { CacheMonitor } from './CacheMonitor';

// Factory functions for easy setup
export const createRedisCacheProvider = async (config: {
  redisClient: any;
  encryptionKey?: string;
  configuration?: Partial<import('./types').CacheConfiguration>;
}) => {
  const { RedisCacheProvider } = await import('./RedisCacheProvider');
  const defaultConfig: import('./types').CacheConfiguration = {
    enabled: true,
    defaultTtl: 300000, // 5 minutes
    maxEntries: 100000,
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    compressionEnabled: true,
    compressionThreshold: 1024, // 1KB
    encryptionEnabled: !!config.encryptionKey,
    evictionPolicy: 'lru' as const,
    persistenceEnabled: true,
    replicationEnabled: false,
    namespaces: []
  };

  const finalConfig = { ...defaultConfig, ...config.configuration };
  return new RedisCacheProvider(config.redisClient, finalConfig, config.encryptionKey);
};

export const createInMemoryCacheProvider = (config?: Partial<import('./types').CacheConfiguration>) => {
  const { InMemoryCacheProvider } = require('./InMemoryCacheProvider');
  const defaultConfig: import('./types').CacheConfiguration = {
    enabled: true,
    defaultTtl: 300000, // 5 minutes
    maxEntries: 10000,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    compressionEnabled: false,
    compressionThreshold: 1024,
    encryptionEnabled: false,
    evictionPolicy: 'lru' as const,
    persistenceEnabled: false,
    replicationEnabled: false,
    namespaces: []
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new InMemoryCacheProvider(finalConfig);
};

export const createPolicyDecisionCache = (config: {
  provider: import('./types').CacheProvider;
  keyBuilder?: import('./types').CacheKeyBuilder;
  defaultTtl?: number;
  autoInvalidationEnabled?: boolean;
}) => {
  const { PolicyDecisionCache } = require('./PolicyDecisionCache');
  const { CacheKeyBuilder } = require('./CacheKeyBuilder');
  
  const keyBuilder = config.keyBuilder || new CacheKeyBuilder();
  
  return new PolicyDecisionCache(config.provider, keyBuilder, {
    defaultTtl: config.defaultTtl,
    autoInvalidationEnabled: config.autoInvalidationEnabled
  });
};

export const createCacheMonitor = (config: {
  provider: import('./types').CacheProvider;
  monitoringIntervalMs?: number;
  historyRetentionCount?: number;
  alertThresholds?: {
    hitRateThreshold?: number;
    responseTimeThreshold?: number;
    memoryUsageThreshold?: number;
    errorRateThreshold?: number;
  };
}) => {
  const { CacheMonitor } = require('./CacheMonitor');
  return new CacheMonitor(config.provider, config);
};

// Complete cache system factory
export const createCacheSystem = async (config: {
  type: 'redis' | 'memory';
  redis?: {
    client: any;
    encryptionKey?: string;
  };
  configuration?: Partial<import('./types').CacheConfiguration>;
  monitoring?: {
    enabled?: boolean;
    alertThresholds?: {
      hitRateThreshold?: number;
      responseTimeThreshold?: number;
      memoryUsageThreshold?: number;
      errorRateThreshold?: number;
    };
  };
}) => {
  // Create cache provider
  let provider: import('./types').CacheProvider;
  
  if (config.type === 'redis') {
    if (!config.redis?.client) {
      throw new Error('Redis client is required for redis cache type');
    }
    provider = await createRedisCacheProvider({
      redisClient: config.redis.client,
      encryptionKey: config.redis.encryptionKey,
      configuration: config.configuration
    });
  } else {
    provider = createInMemoryCacheProvider(config.configuration);
  }

  // Create key builder
  const keyBuilder = new (await import('./CacheKeyBuilder')).CacheKeyBuilder();

  // Create policy decision cache
  const policyCache = createPolicyDecisionCache({
    provider,
    keyBuilder,
    autoInvalidationEnabled: true
  });

  // Create monitor if enabled
  let monitor: import('./types').CacheMonitor | undefined;
  if (config.monitoring?.enabled !== false) {
    monitor = createCacheMonitor({
      provider,
      alertThresholds: config.monitoring?.alertThresholds
    });
    monitor.startMonitoring();
  }

  return {
    provider,
    keyBuilder,
    policyCache,
    monitor,
    async destroy() {
      if (monitor) {
        monitor.stopMonitoring();
      }
      if (provider && 'destroy' in provider) {
        (provider as any).destroy();
      }
    }
  };
};

// Utility functions
export const generateCacheKey = (namespace: string, type: string, parts: string[]): string => {
  const { CacheKeyBuilder } = require('./CacheKeyBuilder');
  const builder = new CacheKeyBuilder();
  return (builder as any).buildKey(namespace, type, parts);
};

export const validateCacheConfiguration = (config: Partial<import('./types').CacheConfiguration>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.defaultTtl !== undefined && config.defaultTtl <= 0) {
    errors.push('defaultTtl must be greater than 0');
  }

  if (config.maxEntries !== undefined && config.maxEntries <= 0) {
    errors.push('maxEntries must be greater than 0');
  }

  if (config.maxMemoryUsage !== undefined && config.maxMemoryUsage <= 0) {
    errors.push('maxMemoryUsage must be greater than 0');
  }

  if (config.compressionThreshold !== undefined && config.compressionThreshold < 0) {
    errors.push('compressionThreshold must be non-negative');
  }

  if (config.encryptionEnabled && !config.compressionEnabled) {
    warnings.push('Encryption without compression may impact performance');
  }

  if (config.maxEntries !== undefined && config.maxEntries > 1000000) {
    warnings.push('Large maxEntries value may impact performance');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

export const getCacheStats = async (provider: import('./types').CacheProvider): Promise<{
  summary: string;
  performance: 'excellent' | 'good' | 'fair' | 'poor';
  keyMetrics: Record<string, any>;
}> => {
  const stats = await provider.getStats();
  
  let performance: 'excellent' | 'good' | 'fair' | 'poor';
  if (stats.hitRate > 0.9) performance = 'excellent';
  else if (stats.hitRate > 0.7) performance = 'good';
  else if (stats.hitRate > 0.5) performance = 'fair';
  else performance = 'poor';

  const summary = `Cache contains ${stats.totalEntries} entries with ${(stats.hitRate * 100).toFixed(1)}% hit rate`;

  const keyMetrics = {
    entries: stats.totalEntries,
    hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
    memoryUsage: `${(stats.memoryUsage / (1024 * 1024)).toFixed(1)} MB`,
    averageResponseTime: `${stats.averageResponseTime.toFixed(1)} ms`,
    evictions: stats.evictionsCount
  };

  return { summary, performance, keyMetrics };
};

// Constants for common cache configurations
export const CACHE_CONFIGURATIONS = {
  DEVELOPMENT: {
    enabled: true,
    defaultTtl: 60000, // 1 minute
    maxEntries: 1000,
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    compressionEnabled: false,
    encryptionEnabled: false,
    evictionPolicy: 'lru' as const
  },
  PRODUCTION: {
    enabled: true,
    defaultTtl: 300000, // 5 minutes
    maxEntries: 100000,
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    compressionEnabled: true,
    compressionThreshold: 1024,
    encryptionEnabled: true,
    evictionPolicy: 'lru' as const
  },
  HIGH_PERFORMANCE: {
    enabled: true,
    defaultTtl: 600000, // 10 minutes
    maxEntries: 500000,
    maxMemoryUsage: 2 * 1024 * 1024 * 1024, // 2GB
    compressionEnabled: true,
    compressionThreshold: 512,
    encryptionEnabled: false, // Disabled for performance
    evictionPolicy: 'lru' as const
  }
} as const;

// Re-export key types for convenience
export type {
  CacheProvider,
  PolicyDecisionCache,
  CacheKeyBuilder,
  CacheMonitor,
  CacheConfiguration,
  PolicyDecisionCacheEntry,
  PolicyDecisionInput,
  PolicyDecisionStats,
  CacheStats,
  CacheHealthStatus
} from './types';