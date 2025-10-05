/**
 * Request Batching Service for UnifiedIntegrationService
 * Provides intelligent request batching to optimize performance and reduce API calls
 */

import { IntegrationLogger } from './Logger.js';

export interface BatchRequest<T = any> {
  id: string;
  type: 'contacts' | 'projects' | 'finance';
  filters: any;
  resolve: (result: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  priorityThreshold: number; // milliseconds
  enableIntelligentBatching: boolean;
}

export interface BatchExecutor<T = any> {
  (requests: BatchRequest<T>[]): Promise<{ [requestId: string]: T }>;
}

export class RequestBatcher {
  private readonly logger: IntegrationLogger;
  private readonly pendingRequests: Map<string, BatchRequest[]> = new Map();
  private readonly batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly executors: Map<string, BatchExecutor> = new Map();

  private readonly defaultConfig: BatchConfig = {
    maxBatchSize: 10,
    maxWaitTime: 100, // 100ms
    priorityThreshold: 50, // 50ms for high priority
    enableIntelligentBatching: true
  };

  constructor(
    private readonly config: Partial<BatchConfig> = {}
  ) {
    this.logger = IntegrationLogger.getInstance();
    this.config = { ...this.defaultConfig, ...config };

    this.logger.info('RequestBatcher initialized', {
      config: this.config
    });
  }

  /**
   * Register a batch executor for a specific request type
   */
  registerExecutor<T>(type: string, executor: BatchExecutor<T>): void {
    this.executors.set(type, executor);
    this.logger.debug('Batch executor registered', { type });
  }

  /**
   * Add a request to the batch queue
   */
  async batchRequest<T>(request: Omit<BatchRequest<T>, 'id' | 'timestamp'>): Promise<T> {
    const correlationId = this.logger.generateCorrelationId();
    const requestId = `${request.type}_${correlationId}_${Date.now()}`;

    const batchRequest: BatchRequest<T> = {
      ...request,
      id: requestId,
      timestamp: Date.now()
    };

    return new Promise<T>((resolve, reject) => {
      batchRequest.resolve = resolve;
      batchRequest.reject = reject;

      this.addToBatch(batchRequest);
    });
  }

  /**
   * Add request to appropriate batch queue
   */
  private addToBatch<T>(request: BatchRequest<T>): void {
    const batchKey = this.getBatchKey(request);

    if (!this.pendingRequests.has(batchKey)) {
      this.pendingRequests.set(batchKey, []);
    }

    const batch = this.pendingRequests.get(batchKey)!;
    batch.push(request);

    this.logger.debug('Request added to batch', {
      batchKey,
      requestId: request.id,
      batchSize: batch.length,
      priority: request.priority
    });

    // Check if we should execute the batch immediately
    if (this.shouldExecuteBatch(batch)) {
      this.executeBatch(batchKey);
    } else if (!this.batchTimers.has(batchKey)) {
      // Set timer for batch execution
      const waitTime = this.calculateWaitTime(batch);
      const timer = setTimeout(() => {
        this.executeBatch(batchKey);
      }, waitTime);

      this.batchTimers.set(batchKey, timer);
    }
  }

  /**
   * Generate a batch key for grouping similar requests
   */
  private getBatchKey(request: BatchRequest): string {
    if (!this.config.enableIntelligentBatching) {
      return request.type;
    }

    // Intelligent batching: group by type and similar filters
    const filterKey = this.generateFilterKey(request.filters);
    return `${request.type}_${filterKey}`;
  }

  /**
   * Generate a consistent key for similar filter sets
   */
  private generateFilterKey(filters: any): string {
    if (!filters) return 'default';

    // Extract key filter properties for batching
    const batchableProps = {
      sources: filters.sources,
      dataSource: filters.dataSource,
      company: filters.company,
      status: filters.status,
      category: filters.category
    };

    // Remove undefined properties
    Object.keys(batchableProps).forEach(key => {
      if (batchableProps[key] === undefined) {
        delete batchableProps[key];
      }
    });

    return Buffer.from(JSON.stringify(batchableProps)).toString('base64').substring(0, 16);
  }

  /**
   * Determine if a batch should be executed immediately
   */
  private shouldExecuteBatch(batch: BatchRequest[]): boolean {
    // Execute if batch is full
    if (batch.length >= this.config.maxBatchSize!) {
      return true;
    }

    // Execute if there are high priority requests that have waited too long
    const now = Date.now();
    const hasUrgentRequest = batch.some(req =>
      req.priority === 'high' &&
      (now - req.timestamp) >= this.config.priorityThreshold!
    );

    return hasUrgentRequest;
  }

  /**
   * Calculate wait time for batch execution
   */
  private calculateWaitTime(batch: BatchRequest[]): number {
    const hasHighPriority = batch.some(req => req.priority === 'high');
    const hasMediumPriority = batch.some(req => req.priority === 'medium');

    if (hasHighPriority) {
      return Math.min(this.config.priorityThreshold!, this.config.maxWaitTime!);
    } else if (hasMediumPriority) {
      return Math.floor(this.config.maxWaitTime! * 0.7);
    } else {
      return this.config.maxWaitTime!;
    }
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.pendingRequests.get(batchKey);
    if (!batch || batch.length === 0) return;

    // Clear the batch and timer
    this.pendingRequests.delete(batchKey);
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'RequestBatcher', 'executeBatch');

    try {
      timedLogger.info('Executing batch', {
        batchKey,
        batchSize: batch.length,
        requestTypes: [...new Set(batch.map(r => r.type))],
        priorities: [...new Set(batch.map(r => r.priority))]
      });

      // Group requests by type for execution
      const requestsByType = this.groupRequestsByType(batch);

      // Execute each type group
      const executionPromises = Array.from(requestsByType.entries()).map(
        async ([type, requests]) => {
          const executor = this.executors.get(type);
          if (!executor) {
            throw new Error(`No executor registered for type: ${type}`);
          }

          try {
            const results = await executor(requests);

            // Resolve individual requests
            requests.forEach(request => {
              const result = results[request.id];
              if (result !== undefined) {
                request.resolve(result);
              } else {
                request.reject(new Error(`No result for request ${request.id}`));
              }
            });

            timedLogger.debug(`Batch executed for type ${type}`, {
              requestCount: requests.length,
              resultCount: Object.keys(results).length
            });

          } catch (error) {
            timedLogger.error(`Batch execution failed for type ${type}`, error);

            // Reject all requests in this group
            requests.forEach(request => {
              request.reject(error instanceof Error ? error : new Error('Batch execution failed'));
            });
          }
        }
      );

      await Promise.allSettled(executionPromises);

      timedLogger.finish(true, {
        totalRequests: batch.length,
        typeGroups: requestsByType.size
      });

    } catch (error) {
      timedLogger.error('Batch execution failed', error);
      timedLogger.finish(false);

      // Reject all requests
      batch.forEach(request => {
        request.reject(error instanceof Error ? error : new Error('Batch execution failed'));
      });
    }
  }

  /**
   * Group requests by type for execution
   */
  private groupRequestsByType(batch: BatchRequest[]): Map<string, BatchRequest[]> {
    const groups = new Map<string, BatchRequest[]>();

    batch.forEach(request => {
      if (!groups.has(request.type)) {
        groups.set(request.type, []);
      }
      groups.get(request.type)!.push(request);
    });

    return groups;
  }

  /**
   * Get current batch statistics
   */
  getBatchStats() {
    const pendingCounts = new Map<string, number>();

    this.pendingRequests.forEach((requests, key) => {
      pendingCounts.set(key, requests.length);
    });

    return {
      pendingBatches: this.pendingRequests.size,
      activeTimers: this.batchTimers.size,
      pendingCounts: Object.fromEntries(pendingCounts),
      registeredExecutors: Array.from(this.executors.keys()),
      config: this.config
    };
  }

  /**
   * Clear all pending batches (for cleanup)
   */
  clearAll(): void {
    // Clear all timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();

    // Reject all pending requests
    this.pendingRequests.forEach(batch => {
      batch.forEach(request => {
        request.reject(new Error('Batch system shutdown'));
      });
    });
    this.pendingRequests.clear();

    this.logger.info('All batches cleared');
  }

  /**
   * Update batch configuration
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    Object.assign(this.config, newConfig);
    this.logger.info('Batch configuration updated', { config: this.config });
  }

  /**
   * Force execute all pending batches
   */
  async flushAll(): Promise<void> {
    const batchKeys = Array.from(this.pendingRequests.keys());
    const flushPromises = batchKeys.map(key => this.executeBatch(key));

    await Promise.allSettled(flushPromises);
    this.logger.info('All pending batches flushed', { batchCount: batchKeys.length });
  }
}