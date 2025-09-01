/**
 * In-Memory Cache Provider
 * 
 * Simple in-memory cache implementation for development and testing.
 * Should not be used in production environments.
 */

import {
  CacheProvider,
  CacheEntry,
  CacheMetadata,
  CacheQuery,
  CacheBatch,
  BatchResult,
  OperationResult,
  CacheStats,
  CacheEvent,
  CacheEventType,
  CacheConfiguration,
  EvictionPolicy,
  BatchFailurePolicy
} from './types';

interface InMemoryEntry<T = any> extends CacheEntry<T> {
  expiresAt: number;
}

export class InMemoryCacheProvider implements CacheProvider {
  private cache = new Map<string, InMemoryEntry>();
  private config: CacheConfiguration;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalResponseTime: 0,
    operationsCount: 0
  };
  private eventCallbacks: Array<(event: CacheEvent) => void> = [];
  private evictionTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfiguration> = {}) {
    this.config = {
      enabled: true,
      defaultTtl: 300000, // 5 minutes
      maxEntries: 10000,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      compressionEnabled: false,
      compressionThreshold: 1024,
      encryptionEnabled: false,
      evictionPolicy: EvictionPolicy.LRU,
      persistenceEnabled: false,
      replicationEnabled: false,
      namespaces: [],
      ...config
    };

    this.startEvictionTimer();
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key) as InMemoryEntry<T> | undefined;
      this.updateStats('get', Date.now() - startTime);

      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.stats.misses++;
        this.emitEvent({
          type: CacheEventType.ENTRY_EXPIRED,
          timestamp: new Date(),
          key
        });
        return null;
      }

      this.stats.hits++;
      
      // Update access tracking
      entry.lastAccessed = new Date();
      entry.hitCount++;

      // Return without the internal expiresAt field
      const { expiresAt, ...publicEntry } = entry;
      return publicEntry as CacheEntry<T>;

    } catch (error) {
      this.updateStats('get', Date.now() - startTime);
      throw new Error(`Cache get failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async set<T>(key: string, value: T, metadata: CacheMetadata, ttl?: number): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const effectiveTtl = ttl || this.config.defaultTtl;
      const now = new Date();
      
      const entry: InMemoryEntry<T> = {
        key,
        value,
        metadata,
        ttl: effectiveTtl,
        createdAt: now,
        lastAccessed: now,
        hitCount: 0,
        version: metadata.checksum || this.generateChecksum(value),
        expiresAt: Date.now() + effectiveTtl
      };

      // Check if we need to evict entries
      await this.evictIfNeeded();

      this.cache.set(key, entry);
      this.stats.sets++;
      this.updateStats('set', Date.now() - startTime);

      this.emitEvent({
        type: CacheEventType.ENTRY_ADDED,
        timestamp: now,
        key,
        metadata: {
          size: this.estimateSize(value),
          ttl: effectiveTtl,
          namespace: this.extractNamespace(key)
        }
      });

      return true;

    } catch (error) {
      this.updateStats('set', Date.now() - startTime);
      throw new Error(`Cache set failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const deleted = this.cache.delete(key);
      this.stats.deletes++;
      this.updateStats('delete', Date.now() - startTime);

      if (deleted) {
        this.emitEvent({
          type: CacheEventType.ENTRY_DELETED,
          timestamp: new Date(),
          key,
          metadata: { reason: 'manual_delete' }
        });
      }

      return deleted;

    } catch (error) {
      this.updateStats('delete', Date.now() - startTime);
      throw new Error(`Cache delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async invalidate(pattern: string, reason: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      const regex = this.patternToRegex(pattern);
      const keysToDelete: string[] = [];

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
      }

      this.updateStats('invalidate', Date.now() - startTime);

      if (keysToDelete.length > 0) {
        this.emitEvent({
          type: CacheEventType.INVALIDATION_TRIGGERED,
          timestamp: new Date(),
          metadata: {
            pattern,
            reason,
            deletedCount: keysToDelete.length,
            executionTime: Date.now() - startTime
          }
        });
      }

      return keysToDelete.length;

    } catch (error) {
      throw new Error(`Cache invalidation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async clear(namespace?: string): Promise<boolean> {
    try {
      if (namespace) {
        return (await this.invalidate(`*${namespace}:*`, 'namespace_clear')) > 0;
      } else {
        this.cache.clear();
        this.emitEvent({
          type: CacheEventType.CACHE_CLEARED,
          timestamp: new Date(),
          metadata: { scope: 'all' }
        });
        return true;
      }
    } catch (error) {
      throw new Error(`Cache clear failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      if (!entry) return false;

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      throw new Error(`Cache exists check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async touch(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      if (!entry) return false;

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return false;
      }

      entry.lastAccessed = new Date();
      entry.hitCount++;
      return true;
    } catch (error) {
      throw new Error(`Cache touch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async batch(operations: CacheBatch): Promise<BatchResult> {
    const startTime = Date.now();
    const results: OperationResult[] = [];
    let successfulOperations = 0;

    try {
      for (const operation of operations.operations) {
        const opStartTime = Date.now();
        
        try {
          let result: any;
          
          switch (operation.type) {
            case 'get':
              result = await this.get(operation.key);
              break;
            case 'set':
              if (operation.value && operation.metadata) {
                result = await this.set(operation.key, operation.value, operation.metadata, operation.ttl);
              }
              break;
            case 'delete':
              result = await this.delete(operation.key);
              break;
          }
          
          results.push({
            operation,
            success: true,
            result,
            executionTime: Date.now() - opStartTime
          });
          
          successfulOperations++;
          
        } catch (error) {
          results.push({
            operation,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now() - opStartTime
          });
          
          if (operations.failurePolicy === BatchFailurePolicy.FAIL_FAST) {
            break;
          }
        }
      }

      return {
        success: successfulOperations === operations.operations.length,
        results,
        totalOperations: operations.operations.length,
        successfulOperations,
        failedOperations: operations.operations.length - successfulOperations,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      throw new Error(`Batch operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async query(criteria: CacheQuery): Promise<CacheEntry[]> {
    try {
      const results: CacheEntry[] = [];
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        // Skip expired entries
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          continue;
        }

        // Apply filters
        if (criteria.namespace && !key.includes(criteria.namespace)) {
          continue;
        }

        if (criteria.pattern && !this.patternToRegex(criteria.pattern).test(key)) {
          continue;
        }

        if (criteria.tags && criteria.tags.length > 0) {
          const hasAllTags = criteria.tags.every(tag => 
            entry.metadata.tags.includes(tag)
          );
          if (!hasAllTags) continue;
        }

        if (criteria.source && entry.metadata.source !== criteria.source) {
          continue;
        }

        if (criteria.minAge && entry.createdAt > criteria.minAge) {
          continue;
        }

        if (criteria.maxAge && entry.createdAt < criteria.maxAge) {
          continue;
        }

        // Remove internal fields
        const { expiresAt, ...publicEntry } = entry;
        results.push(publicEntry);
      }

      // Apply pagination
      const offset = criteria.offset || 0;
      const limit = criteria.limit || results.length;
      
      return results.slice(offset, offset + limit);

    } catch (error) {
      throw new Error(`Cache query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const totalEntries = this.cache.size;
      const hitRate = this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0;

      const averageResponseTime = this.stats.operationsCount > 0
        ? this.stats.totalResponseTime / this.stats.operationsCount
        : 0;

      // Calculate memory usage estimate
      let memoryUsage = 0;
      for (const [key, entry] of this.cache.entries()) {
        memoryUsage += key.length * 2; // String characters
        memoryUsage += this.estimateSize(entry.value);
        memoryUsage += this.estimateSize(entry.metadata);
      }

      return {
        totalEntries,
        totalHits: this.stats.hits,
        totalMisses: this.stats.misses,
        hitRate,
        memoryUsage,
        compressionRatio: 1.0, // No compression in memory cache
        averageResponseTime,
        evictionsCount: this.stats.evictions,
        invalidationsCount: 0,
        namespaceStats: await this.getNamespaceStats(),
        performanceMetrics: {
          averageGetTime: averageResponseTime,
          averageSetTime: averageResponseTime,
          averageDeleteTime: averageResponseTime,
          peakMemoryUsage: memoryUsage,
          gcCollections: 0,
          compressionSavings: 0,
          networkRequestsSaved: this.stats.hits
        }
      };

    } catch (error) {
      throw new Error(`Failed to get cache stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  monitor(callback: (event: CacheEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  // Cleanup method for testing
  destroy(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
    }
    this.cache.clear();
    this.eventCallbacks = [];
  }

  // Private helper methods

  private generateChecksum(value: any): string {
    const data = JSON.stringify(value);
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private extractNamespace(key: string): string {
    const parts = key.split(':');
    return parts.length > 1 ? parts[1] : 'default';
  }

  private estimateSize(value: any): number {
    return JSON.stringify(value).length * 2; // Rough estimate
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  private updateStats(operation: string, responseTime: number): void {
    this.stats.operationsCount++;
    this.stats.totalResponseTime += responseTime;
  }

  private emitEvent(event: CacheEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.warn('Cache event callback failed:', error);
      }
    }
  }

  private async evictIfNeeded(): Promise<void> {
    if (this.cache.size >= this.config.maxEntries) {
      await this.evictEntries(Math.floor(this.config.maxEntries * 0.1)); // Evict 10%
    }
  }

  private async evictEntries(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by eviction policy
    switch (this.config.evictionPolicy) {
      case EvictionPolicy.LRU:
        entries.sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
        break;
      case EvictionPolicy.LFU:
        entries.sort(([, a], [, b]) => a.hitCount - b.hitCount);
        break;
      case EvictionPolicy.FIFO:
        entries.sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case EvictionPolicy.TTL:
        entries.sort(([, a], [, b]) => a.expiresAt - b.expiresAt);
        break;
    }

    // Evict oldest entries
    for (let i = 0; i < count && i < entries.length; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.stats.evictions++;
      
      this.emitEvent({
        type: CacheEventType.ENTRY_EVICTED,
        timestamp: new Date(),
        key,
        metadata: { reason: 'capacity_limit' }
      });
    }
  }

  private startEvictionTimer(): void {
    this.evictionTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Check every minute
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.emitEvent({
        type: CacheEventType.ENTRY_EXPIRED,
        timestamp: new Date(),
        key
      });
    }
  }

  private async getNamespaceStats(): Promise<any[]> {
    const namespaceStats: Record<string, any> = {};

    for (const [key, entry] of this.cache.entries()) {
      const namespace = this.extractNamespace(key);
      
      if (!namespaceStats[namespace]) {
        namespaceStats[namespace] = {
          namespace,
          entries: 0,
          hits: 0,
          misses: 0,
          memoryUsage: 0,
          oldestEntry: entry.createdAt,
          newestEntry: entry.createdAt
        };
      }

      const stats = namespaceStats[namespace];
      stats.entries++;
      stats.hits += entry.hitCount;
      stats.memoryUsage += this.estimateSize(entry.value);

      if (entry.createdAt < stats.oldestEntry) {
        stats.oldestEntry = entry.createdAt;
      }
      if (entry.createdAt > stats.newestEntry) {
        stats.newestEntry = entry.createdAt;
      }
    }

    // Calculate hit rates
    for (const stats of Object.values(namespaceStats)) {
      stats.hitRate = stats.hits + stats.misses > 0 ? stats.hits / (stats.hits + stats.misses) : 0;
      stats.averageResponseTime = 0; // Not tracked per namespace in memory cache
    }

    return Object.values(namespaceStats);
  }
}