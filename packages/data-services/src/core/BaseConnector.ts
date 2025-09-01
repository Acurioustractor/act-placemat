/**
 * Base Connector for ACT Placemat Data Services
 * Mobile-optimized foundation for all API connectors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';
import { compress, decompress } from 'lz-string';
import type { z } from 'zod';

import type {
  ApiResponse,
  NetworkStatus,
  ConnectorConfig,
  UsageMetrics,
  SyncStatus,
  OfflineAction
} from '../types';
import {
  CacheConfig,
  ConnectorError,
  ComplianceMetadata
} from '../types';

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected cache: Map<string, { data: unknown; timestamp: number; ttl: number }>;
  protected offlineQueue: OfflineAction[];
  protected networkStatus: NetworkStatus;
  protected syncStatus: SyncStatus;

  constructor(config: Partial<ConnectorConfig> = {}) {
    this.config = {
      timeout: 30000, // 30 seconds - mobile friendly
      retryAttempts: 3,
      cache: {
        ttl: 5 * 60 * 1000, // 5 minutes default
        maxSize: 1000,
        compressionEnabled: true,
        offlineMode: true
      },
      compliance: {
        dataResidency: 'australia',
        encryptionRequired: true,
        auditEnabled: true
      },
      mobile: {
        backgroundSync: true,
        wifiOnlySync: false,
        compressionEnabled: true,
        batteryOptimization: true
      },
      ...config
    };

    this.cache = new Map();
    this.offlineQueue = [];
    this.networkStatus = {
      isConnected: false,
      isInternetReachable: false,
      type: 'unknown'
    };
    this.syncStatus = {
      lastSync: new Date().toISOString(),
      pendingUploads: 0,
      pendingDownloads: 0,
      conflictCount: 0,
      syncInProgress: false
    };

    this.initializeConnector();
  }

  /**
   * Initialize connector with network monitoring and cache loading
   */
  private async initializeConnector(): Promise<void> {
    try {
      // Load network status
      await this.updateNetworkStatus();
      
      // Load offline queue from storage
      await this.loadOfflineQueue();
      
      // Load cache from storage
      await this.loadCache();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      console.log(`🔌 ${this.constructor.name} initialized - Network: ${this.networkStatus.type}`);
    } catch (error) {
      console.error(`❌ ${this.constructor.name} initialization failed:`, error);
    }
  }

  /**
   * Update network status for mobile connectivity awareness
   */
  protected async updateNetworkStatus(): Promise<void> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      this.networkStatus = {
        isConnected: networkState.isConnected ?? false,
        isInternetReachable: networkState.isInternetReachable ?? false,
        type: networkState.type as any || 'unknown',
        isMetered: networkState.type === Network.NetworkStateType.CELLULAR
      };
    } catch (error) {
      console.warn('Network status check failed:', error);
    }
  }

  /**
   * Set up network state monitoring for Australian mobile conditions
   */
  private setupNetworkMonitoring(): void {
    // Check network status every 30 seconds
    setInterval(() => {
      this.updateNetworkStatus();
    }, 30000);
  }

  /**
   * Secure API key storage for Australian compliance
   */
  protected async storeApiKey(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainService: 'act-placemat-keys',
        requireAuthentication: this.config.compliance.encryptionRequired
      });
    } catch (error) {
      throw new ConnectorError({
        code: 'SECURE_STORAGE_ERROR',
        message: 'Failed to store API key securely',
        details: error,
        retryable: false,
        timestamp: new Date().toISOString(),
        context: {
          connector: this.constructor.name,
          operation: 'storeApiKey'
        }
      });
    }
  }

  /**
   * Retrieve securely stored API key
   */
  protected async getApiKey(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key, {
        keychainService: 'act-placemat-keys',
        requireAuthentication: this.config.compliance.encryptionRequired
      });
    } catch (error) {
      console.warn(`Failed to retrieve API key ${key}:`, error);
      return null;
    }
  }

  /**
   * Mobile-optimized caching with compression
   */
  protected async cacheData(key: string, data: unknown, customTtl?: number): Promise<void> {
    const ttl = customTtl || this.config.cache.ttl;
    const timestamp = Date.now();
    
    // Store in memory cache
    this.cache.set(key, { data, timestamp, ttl });
    
    // Persist to AsyncStorage with compression if enabled
    try {
      const cacheEntry = {
        data: this.config.cache.compressionEnabled ? compress(JSON.stringify(data)) : data,
        timestamp,
        ttl,
        compressed: this.config.cache.compressionEnabled
      };
      
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
      
      // Enforce cache size limits for mobile memory management
      if (this.cache.size > this.config.cache.maxSize) {
        await this.evictOldestCacheEntries();
      }
    } catch (error) {
      console.warn('Failed to persist cache entry:', error);
    }
  }

  /**
   * Retrieve cached data with Australian compliance metadata
   */
  protected async getCachedData<T>(key: string): Promise<T | null> {
    const now = Date.now();
    
    // Check memory cache first
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && (now - memoryEntry.timestamp) < memoryEntry.ttl) {
      return memoryEntry.data as T;
    }
    
    // Check persistent cache
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (!stored) return null;
      
      const cacheEntry = JSON.parse(stored);
      if ((now - cacheEntry.timestamp) >= cacheEntry.ttl) {
        // Expired - remove from storage
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      // Decompress if needed
      const data = cacheEntry.compressed 
        ? JSON.parse(decompress(cacheEntry.data))
        : cacheEntry.data;
      
      // Update memory cache
      this.cache.set(key, {
        data,
        timestamp: cacheEntry.timestamp,
        ttl: cacheEntry.ttl
      });
      
      return data as T;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      return null;
    }
  }

  /**
   * Make HTTP request with Australian mobile optimizations
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    schema?: z.ZodSchema<T>
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    
    try {
      // Check network connectivity for Australian mobile conditions
      if (!this.networkStatus.isConnected) {
        return this.handleOfflineRequest<T>(url, options);
      }
      
      // Add Australian compliance headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'ACT-Placemat-Mobile/1.0',
        'X-Data-Residency': this.config.compliance.dataResidency,
        'X-Request-ID': this.generateRequestId(),
        ...options.headers
      };
      
      // Add API key if available
      const apiKey = await this.getApiKey('primary');
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      
      // Validate with schema if provided
      const data = schema ? schema.parse(rawData) : rawData;
      
      // Log usage metrics for Australian compliance
      await this.logUsageMetrics('api_request', {
        url,
        method: options.method || 'GET',
        duration: Date.now() - startTime,
        dataSize: JSON.stringify(data).length
      });
      
      return {
        data,
        source: 'network',
        timestamp: new Date().toISOString(),
        cached: false
      };
      
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      
      // Try to return cached data as fallback
      const cacheKey = this.generateCacheKey(url, options);
      const cachedData = await this.getCachedData<T>(cacheKey);
      
      if (cachedData) {
        return {
          data: cachedData,
          source: 'cache',
          timestamp: new Date().toISOString(),
          cached: true,
          error: 'Network request failed, serving cached data'
        };
      }
      
      throw new ConnectorError({
        code: 'NETWORK_REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Unknown network error',
        details: error,
        retryable: true,
        timestamp: new Date().toISOString(),
        context: {
          connector: this.constructor.name,
          operation: 'makeRequest',
          networkStatus: this.networkStatus
        }
      });
    }
  }

  /**
   * Handle offline requests for Australian remote connectivity
   */
  private async handleOfflineRequest<T>(url: string, options: RequestInit): Promise<ApiResponse<T>> {
    const cacheKey = this.generateCacheKey(url, options);
    const cachedData = await this.getCachedData<T>(cacheKey);
    
    if (cachedData) {
      return {
        data: cachedData,
        source: 'offline',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }
    
    // Queue for later sync if it's a write operation
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
      await this.queueOfflineAction({
        id: this.generateRequestId(),
        type: options.method === 'DELETE' ? 'delete' : 
              options.method === 'POST' ? 'create' : 'update',
        entity: this.extractEntityFromUrl(url),
        data: options.body ? JSON.parse(options.body as string) : null,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
    }
    
    throw new ConnectorError({
      code: 'OFFLINE_NO_CACHE',
      message: 'No network connection and no cached data available',
      retryable: true,
      timestamp: new Date().toISOString(),
      context: {
        connector: this.constructor.name,
        operation: 'handleOfflineRequest',
        offline: true
      }
    });
  }

  /**
   * Queue offline actions for later sync
   */
  private async queueOfflineAction(action: OfflineAction): Promise<void> {
    this.offlineQueue.push(action);
    this.syncStatus.pendingUploads++;
    
    // Persist to storage
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
  }

  /**
   * Load offline queue from storage
   */
  private async loadOfflineQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('offline_queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
        this.syncStatus.pendingUploads = this.offlineQueue.length;
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }

  /**
   * Load cache from persistent storage
   */
  private async loadCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length === 0) return;
      
      const cacheData = await AsyncStorage.multiGet(cacheKeys);
      const now = Date.now();
      
      for (const [key, value] of cacheData) {
        if (!value) continue;
        
        try {
          const cacheEntry = JSON.parse(value);
          if ((now - cacheEntry.timestamp) < cacheEntry.ttl) {
            const data = cacheEntry.compressed 
              ? JSON.parse(decompress(cacheEntry.data))
              : cacheEntry.data;
            
            this.cache.set(key.replace('cache_', ''), {
              data,
              timestamp: cacheEntry.timestamp,
              ttl: cacheEntry.ttl
            });
          } else {
            // Remove expired cache entry
            await AsyncStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`Failed to load cache entry ${key}:`, error);
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  /**
   * Evict oldest cache entries to manage mobile memory
   */
  private async evictOldestCacheEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, Math.floor(this.config.cache.maxSize * 0.2)); // Remove 20%
    
    for (const [key] of toRemove) {
      this.cache.delete(key);
      await AsyncStorage.removeItem(`cache_${key}`);
    }
  }

  /**
   * Generate cache key for consistent caching
   */
  protected generateCacheKey(url: string, options: RequestInit = {}): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}_${url}_${body}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Generate unique request ID for Australian compliance auditing
   */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract entity type from URL for offline queue
   */
  protected extractEntityFromUrl(url: string): 'story' | 'project' | 'opportunity' | 'person' {
    if (url.includes('story') || url.includes('stories')) return 'story';
    if (url.includes('project')) return 'project';
    if (url.includes('opportunity') || url.includes('opportunities')) return 'opportunity';
    return 'person';
  }

  /**
   * Log usage metrics for Australian privacy compliance
   */
  protected async logUsageMetrics(action: string, metadata: Record<string, unknown>): Promise<void> {
    if (!this.config.compliance.auditEnabled) return;
    
    try {
      const metrics: Partial<UsageMetrics> = {
        sessionId: await this.getSessionId(),
        actions: [{
          type: action,
          timestamp: new Date().toISOString(),
          metadata
        }],
        location: {
          state: 'Unknown', // Could be detected via geolocation with consent
          country: 'AU'
        },
        compliance: {
          consentGiven: true, // Should be checked from user preferences
          analyticsOptIn: true, // Should be checked from user preferences
          dataProcessingBasis: 'legitimate_interest'
        }
      };
      
      // Store metrics for later upload
      const stored = await AsyncStorage.getItem('usage_metrics') || '[]';
      const allMetrics = JSON.parse(stored);
      allMetrics.push(metrics);
      
      // Keep only last 100 entries for mobile storage efficiency
      if (allMetrics.length > 100) {
        allMetrics.splice(0, allMetrics.length - 100);
      }
      
      await AsyncStorage.setItem('usage_metrics', JSON.stringify(allMetrics));
    } catch (error) {
      console.warn('Failed to log usage metrics:', error);
    }
  }

  /**
   * Get or generate session ID
   */
  private async getSessionId(): Promise<string> {
    let sessionId = await AsyncStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Process offline queue when network is available
   */
  public async processOfflineQueue(): Promise<void> {
    if (!this.networkStatus.isConnected || this.offlineQueue.length === 0) {
      return;
    }
    
    this.syncStatus.syncInProgress = true;
    console.log(`🔄 Processing ${this.offlineQueue.length} offline actions...`);
    
    const processedActions: string[] = [];
    
    for (const action of this.offlineQueue) {
      try {
        await this.processOfflineAction(action);
        processedActions.push(action.id);
      } catch (error) {
        console.warn(`Failed to process offline action ${action.id}:`, error);
        action.retryCount++;
        
        // Remove after 5 failed attempts
        if (action.retryCount >= 5) {
          processedActions.push(action.id);
        }
      }
    }
    
    // Remove processed actions
    this.offlineQueue = this.offlineQueue.filter(action => !processedActions.includes(action.id));
    this.syncStatus.pendingUploads = this.offlineQueue.length;
    this.syncStatus.lastSync = new Date().toISOString();
    this.syncStatus.syncInProgress = false;
    
    // Update storage
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
    
    console.log(`✅ Processed ${processedActions.length} offline actions`);
  }

  /**
   * Abstract method to process individual offline actions
   */
  protected abstract processOfflineAction(action: OfflineAction): Promise<void>;

  /**
   * Get current sync status
   */
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Get network status
   */
  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<void> {
    this.cache.clear();
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  /**
   * Get cache statistics for mobile memory monitoring
   */
  public getCacheStats(): { size: number; entries: number; memoryUsage: string } {
    const entries = this.cache.size;
    const memoryUsage = `${Math.round(JSON.stringify(Array.from(this.cache.values())).length / 1024)} KB`;
    
    return {
      size: this.config.cache.maxSize,
      entries,
      memoryUsage
    };
  }
}