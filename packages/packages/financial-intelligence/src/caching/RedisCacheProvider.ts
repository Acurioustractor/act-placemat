/**
 * Redis Cache Provider
 * 
 * High-performance Redis-based cache implementation with support for
 * compression, encryption, and complex invalidation patterns
 */

import crypto from 'crypto';
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
  InvalidationType,
  BatchFailurePolicy
} from './types';

// Redis client interface (compatible with ioredis or node-redis)
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<string>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  expire(key: string, ttl: number): Promise<number>;
  ttl(key: string): Promise<number>;
  scan(cursor: number, pattern?: string, count?: number): Promise<[string, string[]]>;
  keys(pattern: string): Promise<string[]>;
  memory(subcommand: string, ...args: any[]): Promise<any>;
  info(section?: string): Promise<string>;
  flushdb(): Promise<string>;
  multi(): RedisMulti;
  pipeline(): RedisPipeline;
  eval(script: string, numKeys: number, ...args: any[]): Promise<any>;
}

export interface RedisMulti {
  get(key: string): RedisMulti;
  set(key: string, value: string, ttl?: number): RedisMulti;
  del(...keys: string[]): RedisMulti;
  exec(): Promise<Array<[Error | null, any]>>;
}

export interface RedisPipeline {
  get(key: string): RedisPipeline;
  set(key: string, value: string, ttl?: number): RedisPipeline;
  del(...keys: string[]): RedisPipeline;
  exec(): Promise<Array<[Error | null, any]>>;
}

export class RedisCacheProvider implements CacheProvider {
  private redis: RedisClient;
  private config: CacheConfiguration;
  private encryptionKey?: Buffer;
  private stats: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
    totalResponseTime: number;
    operationsCount: number;
  };
  private eventCallbacks: Array<(event: CacheEvent) => void> = [];

  constructor(redis: RedisClient, config: CacheConfiguration, encryptionKey?: string) {
    this.redis = redis;
    this.config = config;
    this.encryptionKey = encryptionKey ? Buffer.from(encryptionKey, 'hex') : undefined;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalResponseTime: 0,
      operationsCount: 0
    };

    this.validateConfiguration();
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const startTime = Date.now();
    
    try {
      const rawValue = await this.redis.get(this.prefixKey(key));
      const responseTime = Date.now() - startTime;
      this.updateStats('get', responseTime);

      if (!rawValue) {
        this.stats.misses++;
        this.emitEvent({
          type: CacheEventType.ENTRY_DELETED,
          timestamp: new Date(),
          key,
          metadata: { reason: 'not_found' }
        });
        return null;
      }

      this.stats.hits++;
      const entry = await this.deserializeEntry<T>(rawValue);
      
      // Update last accessed time
      entry.lastAccessed = new Date();
      entry.hitCount++;
      
      // Update in cache asynchronously
      this.touchEntry(key, entry).catch(err => 
        console.warn('Failed to update entry access time:', err)
      );

      return entry;

    } catch (error) {
      this.stats.errors++;
      this.updateStats('get', Date.now() - startTime);
      throw new Error(`Cache get failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async set<T>(key: string, value: T, metadata: CacheMetadata, ttl?: number): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const entry: CacheEntry<T> = {
        key,
        value,
        metadata,
        ttl: ttl || this.config.defaultTtl,
        createdAt: new Date(),
        lastAccessed: new Date(),
        hitCount: 0,
        version: metadata.checksum || this.generateChecksum(value)
      };

      const serializedEntry = await this.serializeEntry(entry);
      const effectiveTtl = Math.floor((ttl || this.config.defaultTtl) / 1000); // Redis expects seconds
      
      const result = await this.redis.setex(this.prefixKey(key), effectiveTtl, serializedEntry);
      const responseTime = Date.now() - startTime;
      
      this.stats.sets++;
      this.updateStats('set', responseTime);

      if (result === 'OK') {
        this.emitEvent({
          type: CacheEventType.ENTRY_ADDED,
          timestamp: new Date(),
          key,
          metadata: { 
            size: serializedEntry.length,
            ttl: effectiveTtl,
            namespace: this.extractNamespace(key)
          }
        });
        return true;
      }

      return false;

    } catch (error) {
      this.stats.errors++;
      this.updateStats('set', Date.now() - startTime);
      throw new Error(`Cache set failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const result = await this.redis.del(this.prefixKey(key));
      const responseTime = Date.now() - startTime;
      
      this.stats.deletes++;
      this.updateStats('delete', responseTime);

      if (result > 0) {
        this.emitEvent({
          type: CacheEventType.ENTRY_DELETED,
          timestamp: new Date(),
          key,
          metadata: { reason: 'manual_delete' }
        });
        return true;
      }

      return false;

    } catch (error) {
      this.stats.errors++;
      this.updateStats('delete', Date.now() - startTime);
      throw new Error(`Cache delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async invalidate(pattern: string, reason: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Use SCAN for safer pattern matching in production
      const keys = await this.scanKeys(this.prefixKey(pattern));
      
      if (keys.length === 0) {
        return 0;
      }

      // Delete in batches to avoid blocking Redis
      const batchSize = 100;
      let deletedCount = 0;
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const deleted = await this.redis.del(...batch);
        deletedCount += deleted;
      }

      const responseTime = Date.now() - startTime;
      this.updateStats('invalidate', responseTime);

      this.emitEvent({
        type: CacheEventType.INVALIDATION_TRIGGERED,
        timestamp: new Date(),
        metadata: {
          pattern,
          reason,
          deletedCount,
          executionTime: responseTime
        }
      });

      return deletedCount;

    } catch (error) {
      this.stats.errors++;
      throw new Error(`Cache invalidation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async clear(namespace?: string): Promise<boolean> {
    try {
      if (namespace) {
        const pattern = this.prefixKey(`${namespace}:*`);
        const deleted = await this.invalidate(pattern, 'namespace_clear');
        return deleted > 0;
      } else {
        const result = await this.redis.flushdb();
        
        this.emitEvent({
          type: CacheEventType.CACHE_CLEARED,
          timestamp: new Date(),
          metadata: { scope: 'all' }
        });
        
        return result === 'OK';
      }
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Cache clear failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.prefixKey(key));
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Cache exists check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async touch(key: string): Promise<boolean> {
    try {
      const entry = await this.get(key);
      if (!entry) {
        return false;
      }

      entry.lastAccessed = new Date();
      entry.hitCount++;

      return await this.touchEntry(key, entry);
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Cache touch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async batch(operations: CacheBatch): Promise<BatchResult> {
    const startTime = Date.now();
    const results: OperationResult[] = [];
    
    try {
      if (operations.atomicExecution) {
        return await this.executeAtomicBatch(operations, startTime);
      } else {
        return await this.executeBestEffortBatch(operations, startTime);
      }
    } catch (error) {
      this.stats.errors++;
      throw new Error(`Batch operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async query(criteria: CacheQuery): Promise<CacheEntry[]> {
    try {
      const pattern = this.buildQueryPattern(criteria);
      const keys = await this.scanKeys(pattern);
      
      // Fetch entries in batches
      const entries: CacheEntry[] = [];
      const batchSize = 50;
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const pipeline = this.redis.pipeline();
        
        batch.forEach(key => pipeline.get(key));
        const results = await pipeline.exec();
        
        if (results) {
          for (let j = 0; j < results.length; j++) {
            const [error, value] = results[j];
            if (!error && value) {
              try {
                const entry = await this.deserializeEntry(value as string);
                if (this.matchesCriteria(entry, criteria)) {
                  entries.push(entry);
                }
              } catch (deserError) {
                console.warn('Failed to deserialize cache entry:', deserError);
              }
            }
          }
        }
      }

      // Apply limit and offset
      const offset = criteria.offset || 0;
      const limit = criteria.limit || entries.length;
      
      return entries.slice(offset, offset + limit);

    } catch (error) {
      this.stats.errors++;
      throw new Error(`Cache query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const memoryUsage = this.parseMemoryInfo(info);
      
      const hitRate = this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0;

      const averageResponseTime = this.stats.operationsCount > 0
        ? this.stats.totalResponseTime / this.stats.operationsCount
        : 0;

      return {
        totalEntries: await this.getApproximateKeyCount(),
        totalHits: this.stats.hits,
        totalMisses: this.stats.misses,
        hitRate,
        memoryUsage,
        compressionRatio: this.calculateCompressionRatio(),
        averageResponseTime,
        evictionsCount: 0, // Would need Redis eviction stats
        invalidationsCount: 0, // Track separately
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
      this.stats.errors++;
      throw new Error(`Failed to get cache stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  monitor(callback: (event: CacheEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  // Private helper methods

  private validateConfiguration(): void {
    if (this.config.maxMemoryUsage <= 0) {
      throw new Error('Invalid max memory usage configuration');
    }
    
    if (this.config.defaultTtl <= 0) {
      throw new Error('Invalid default TTL configuration');
    }
    
    if (this.config.encryptionEnabled && !this.encryptionKey) {
      throw new Error('Encryption enabled but no encryption key provided');
    }
  }

  private prefixKey(key: string): string {
    return `cache:${key}`;
  }

  private extractNamespace(key: string): string {
    const parts = key.split(':');
    return parts.length > 1 ? parts[1] : 'default';
  }

  private async serializeEntry<T>(entry: CacheEntry<T>): Promise<string> {
    let serialized = JSON.stringify(entry);
    
    // Compress if enabled and above threshold
    if (this.config.compressionEnabled && 
        serialized.length > this.config.compressionThreshold) {
      serialized = await this.compressData(serialized);
      entry.metadata.compressed = true;
    }
    
    // Encrypt if enabled
    if (this.config.encryptionEnabled && this.encryptionKey) {
      serialized = await this.encryptData(serialized);
    }
    
    return serialized;
  }

  private async deserializeEntry<T>(data: string): Promise<CacheEntry<T>> {
    let serialized = data;
    
    // Decrypt if enabled
    if (this.config.encryptionEnabled && this.encryptionKey) {
      serialized = await this.decryptData(serialized);
    }
    
    const entry: CacheEntry<T> = JSON.parse(serialized);
    
    // Decompress if needed
    if (entry.metadata.compressed) {
      const decompressed = await this.decompressData(JSON.stringify(entry.value));
      entry.value = JSON.parse(decompressed);
      entry.metadata.compressed = false;
    }
    
    return entry;
  }

  private async compressData(data: string): Promise<string> {
    // Simple base64 encoding as placeholder for real compression
    // In production, use zlib or similar
    return Buffer.from(data).toString('base64');
  }

  private async decompressData(data: string): Promise<string> {
    // Simple base64 decoding as placeholder for real decompression
    return Buffer.from(data, 'base64').toString('utf8');
  }

  private async encryptData(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private async decryptData(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    const [ivHex, encryptedHex] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private generateChecksum(value: any): string {
    const data = JSON.stringify(value);
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private async touchEntry<T>(key: string, entry: CacheEntry<T>): Promise<boolean> {
    try {
      const serialized = await this.serializeEntry(entry);
      const ttl = Math.floor(entry.ttl / 1000);
      const result = await this.redis.setex(this.prefixKey(key), ttl, serialized);
      return result === 'OK';
    } catch (error) {
      console.warn('Failed to touch entry:', error);
      return false;
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;
    
    do {
      const [nextCursor, batch] = await this.redis.scan(cursor, pattern, 100);
      keys.push(...batch);
      cursor = parseInt(nextCursor);
    } while (cursor !== 0);
    
    return keys;
  }

  private buildQueryPattern(criteria: CacheQuery): string {
    let pattern = 'cache:';
    
    if (criteria.namespace) {
      pattern += `${criteria.namespace}:`;
    } else {
      pattern += '*:';
    }
    
    if (criteria.pattern) {
      pattern += criteria.pattern;
    } else {
      pattern += '*';
    }
    
    return pattern;
  }

  private matchesCriteria(entry: CacheEntry, criteria: CacheQuery): boolean {
    if (criteria.tags && criteria.tags.length > 0) {
      const hasAllTags = criteria.tags.every(tag => 
        entry.metadata.tags.includes(tag)
      );
      if (!hasAllTags) return false;
    }
    
    if (criteria.source && entry.metadata.source !== criteria.source) {
      return false;
    }
    
    if (criteria.minAge && entry.createdAt > criteria.minAge) {
      return false;
    }
    
    if (criteria.maxAge && entry.createdAt < criteria.maxAge) {
      return false;
    }
    
    return true;
  }

  private async executeAtomicBatch(operations: CacheBatch, startTime: number): Promise<BatchResult> {
    const multi = this.redis.multi();
    const results: OperationResult[] = [];
    
    for (const operation of operations.operations) {
      switch (operation.type) {
        case 'get':
          multi.get(this.prefixKey(operation.key));
          break;
        case 'set':
          if (operation.value && operation.metadata) {
            const entry: CacheEntry = {
              key: operation.key,
              value: operation.value,
              metadata: operation.metadata,
              ttl: operation.ttl || this.config.defaultTtl,
              createdAt: new Date(),
              lastAccessed: new Date(),
              hitCount: 0,
              version: this.generateChecksum(operation.value)
            };
            const serialized = await this.serializeEntry(entry);
            const ttl = Math.floor((operation.ttl || this.config.defaultTtl) / 1000);
            multi.set(this.prefixKey(operation.key), serialized, ttl);
          }
          break;
        case 'delete':
          multi.del(this.prefixKey(operation.key));
          break;
      }
    }
    
    const redisResults = await multi.exec();
    
    if (!redisResults) {
      throw new Error('Redis transaction failed');
    }
    
    let successfulOperations = 0;
    
    for (let i = 0; i < operations.operations.length; i++) {
      const operation = operations.operations[i];
      const [error, result] = redisResults[i];
      
      const operationResult: OperationResult = {
        operation,
        success: !error,
        result: error ? undefined : result,
        error: error?.message,
        executionTime: 0 // Would need individual timing
      };
      
      results.push(operationResult);
      
      if (!error) {
        successfulOperations++;
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
  }

  private async executeBestEffortBatch(operations: CacheBatch, startTime: number): Promise<BatchResult> {
    const results: OperationResult[] = [];
    let successfulOperations = 0;
    
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

  private parseMemoryInfo(info: string): number {
    const lines = info.split('\n');
    const memoryLine = lines.find(line => line.startsWith('used_memory:'));
    return memoryLine ? parseInt(memoryLine.split(':')[1]) : 0;
  }

  private calculateCompressionRatio(): number {
    // Placeholder - would track actual compression ratios
    return this.config.compressionEnabled ? 0.7 : 1.0;
  }

  private async getApproximateKeyCount(): Promise<number> {
    try {
      const info = await this.redis.info('keyspace');
      const lines = info.split('\n');
      const dbLine = lines.find(line => line.startsWith('db0:'));
      
      if (dbLine) {
        const match = dbLine.match(/keys=(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private async getNamespaceStats(): Promise<any[]> {
    // Placeholder for namespace statistics
    return [];
  }
}