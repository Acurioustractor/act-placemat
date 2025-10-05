/**
 * Sync Event Queue Service
 * Advanced queue management for sync operations with priority handling,
 * batch processing, retry mechanisms, and dead letter handling
 */

import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

class SyncEventQueueService extends EventEmitter {
  constructor() {
    super();
    this.supabase = null;
    this.isInitialized = false;
    this.isProcessing = false;
    this.processingInterval = null;
    this.workerPools = new Map(); // Multiple worker pools for different priorities
    
    // Configuration
    this.config = {
      // Queue processing
      batchSize: 20,
      processingIntervalMs: 2000, // 2 seconds
      maxConcurrentWorkers: 5,
      
      // Priority levels and their configurations (integer-based)
      priorities: {
        critical: { level: 10, maxRetries: 5, retryDelay: 1000, timeoutMs: 30000 },
        high: { level: 7, maxRetries: 4, retryDelay: 2000, timeoutMs: 20000 },
        normal: { level: 5, maxRetries: 3, retryDelay: 5000, timeoutMs: 15000 },
        low: { level: 2, maxRetries: 2, retryDelay: 10000, timeoutMs: 10000 }
      },
      
      // Dead letter queue
      deadLetterQueue: {
        enabled: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        retentionDays: 7
      },
      
      // Batch processing
      batchProcessing: {
        enabled: true,
        maxBatchSize: 50,
        batchTimeoutMs: 5000
      },
      
      // Rate limiting
      rateLimiting: {
        enabled: true,
        maxEventsPerSecond: 100,
        burstCapacity: 200
      }
    };

    // Statistics and monitoring
    this.stats = {
      processed: 0,
      failed: 0,
      retried: 0,
      deadLettered: 0,
      batchesProcessed: 0,
      averageProcessingTime: 0,
      startedAt: null,
      lastProcessedAt: null,
      errors: [],
      performance: {
        eventsPerSecond: 0,
        averageBatchSize: 0,
        processingTimes: []
      }
    };

    // Rate limiting state
    this.rateLimiter = {
      tokens: this.config.rateLimiting.burstCapacity,
      lastRefill: Date.now(),
      tokensPerMs: this.config.rateLimiting.maxEventsPerSecond / 1000
    };

    // Worker management
    this.workers = [];
    this.activeWorkers = 0;
  }

  /**
   * Initialize the queue service
   */
  async initialize(options = {}) {
    try {
      console.log('🚀 Initializing sync event queue service...');
      
      // Initialize Supabase client
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Test database connection
      const { data, error } = await this.supabase.from('sync_events').select('id').limit(1);
      if (error && error.code !== '42P01') {
        throw new Error(`Supabase connection test failed: ${error.message}`);
      }

      // Override default config with options
      if (options.config) {
        this.config = { ...this.config, ...options.config };
      }

      // Initialize worker pools for different priorities
      for (const priority of Object.keys(this.config.priorities)) {
        this.workerPools.set(priority, []);
      }

      this.isInitialized = true;
      this.stats.startedAt = new Date();
      
      console.log('✅ Sync event queue service initialized');
      console.log(`📊 Configuration: ${JSON.stringify(this.config, null, 2)}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize sync event queue service:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Start queue processing
   */
  async startProcessing() {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    if (this.isProcessing) {
      console.log('⏳ Queue processing already running');
      return;
    }

    console.log('🔄 Starting sync event queue processing...');
    this.isProcessing = true;

    // Start the main processing loop
    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueues();
      } catch (error) {
        console.error('❌ Error in queue processing loop:', error.message);
        this.recordError('processing_loop', error);
      }
    }, this.config.processingIntervalMs);

    // Start cleanup tasks
    this.startCleanupTasks();

    console.log(`✅ Queue processing started (interval: ${this.config.processingIntervalMs}ms)`);
    this.emit('processing_started');
  }

  /**
   * Stop queue processing
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.isProcessing = false;
    this.activeWorkers = 0;
    
    console.log('🛑 Queue processing stopped');
    this.emit('processing_stopped');
  }

  /**
   * Process all priority queues
   */
  async processQueues() {
    if (!this.isInitialized) {
      return;
    }

    const startTime = Date.now();
    const priorities = ['critical', 'high', 'normal', 'low'];
    let totalProcessed = 0;

    for (const priority of priorities) {
      if (this.activeWorkers >= this.config.maxConcurrentWorkers) {
        break; // Don't exceed max concurrent workers
      }

      const processed = await this.processPriorityQueue(priority);
      totalProcessed += processed;
    }

    // Update performance statistics
    if (totalProcessed > 0) {
      const processingTime = Date.now() - startTime;
      this.updatePerformanceStats(totalProcessed, processingTime);
    }
  }

  /**
   * Process events for a specific priority level
   */
  async processPriorityQueue(priority) {
    try {
      // Check rate limiting
      if (!this.checkRateLimit()) {
        return 0; // Skip processing if rate limited
      }

      // Get pending events for this priority
      const events = await this.getPendingEventsByPriority(priority);
      
      if (!events || events.length === 0) {
        return 0;
      }

      console.log(`📨 Processing ${events.length} ${priority} priority events...`);

      let processed = 0;

      if (this.config.batchProcessing.enabled && events.length > 1) {
        // Batch processing
        processed = await this.processBatch(events, priority);
      } else {
        // Individual processing
        for (const event of events) {
          if (this.activeWorkers >= this.config.maxConcurrentWorkers) {
            break;
          }
          
          const worker = this.createWorker(event, priority);
          processed += await worker;
        }
      }

      return processed;
    } catch (error) {
      console.error(`❌ Error processing ${priority} queue:`, error.message);
      this.recordError(`${priority}_queue`, error);
      return 0;
    }
  }

  /**
   * Get pending events by priority
   */
  async getPendingEventsByPriority(priority) {
    const { data: events, error } = await this.supabase.rpc('get_priority_sync_events', {
      priority_level: priority,
      batch_size: this.config.batchSize,
      max_retry_count: this.config.priorities[priority].maxRetries
    });

    if (error) {
      throw new Error(`Failed to fetch ${priority} priority events: ${error.message}`);
    }

    return events || [];
  }

  /**
   * Process a batch of events
   */
  async processBatch(events, priority) {
    const batchId = `batch_${Date.now()}_${priority}`;
    const startTime = Date.now();
    
    console.log(`📦 Processing batch ${batchId} with ${events.length} events`);

    try {
      // Group events by table for more efficient processing
      const eventsByTable = this.groupEventsByTable(events);
      let totalProcessed = 0;

      for (const [tableName, tableEvents] of Object.entries(eventsByTable)) {
        const tableProcessed = await this.processTableBatch(tableName, tableEvents, priority);
        totalProcessed += tableProcessed;
      }

      const processingTime = Date.now() - startTime;
      this.stats.batchesProcessed++;
      this.stats.performance.averageBatchSize = 
        (this.stats.performance.averageBatchSize * (this.stats.batchesProcessed - 1) + events.length) / this.stats.batchesProcessed;

      console.log(`✅ Batch ${batchId} completed: ${totalProcessed}/${events.length} processed (${processingTime}ms)`);
      
      this.emit('batch_processed', {
        batchId,
        events: events.length,
        processed: totalProcessed,
        priority,
        processingTime
      });

      return totalProcessed;
    } catch (error) {
      console.error(`❌ Batch ${batchId} failed:`, error.message);
      this.recordError('batch_processing', error);
      return 0;
    }
  }

  /**
   * Process events for a specific table in batch
   */
  async processTableBatch(tableName, events, priority) {
    const workers = [];
    let processed = 0;

    // Create workers for each event but limit concurrency
    const batches = this.chunkArray(events, Math.min(this.config.maxConcurrentWorkers, events.length));
    
    for (const batch of batches) {
      const batchWorkers = batch.map(event => this.createWorker(event, priority));
      const results = await Promise.allSettled(batchWorkers);
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          processed++;
        }
      });
    }

    return processed;
  }

  /**
   * Create a worker to process a single event
   */
  async createWorker(event, priority) {
    this.activeWorkers++;
    const workerId = `worker_${Date.now()}_${event.id}`;
    
    try {
      const startTime = Date.now();
      console.log(`👷 Worker ${workerId} processing event ${event.id} (${priority})`);

      // Mark event as processing
      await this.updateEventStatus(event.id, 'processing');

      // Process the event with timeout
      const config = this.config.priorities[priority];
      const result = await this.processEventWithTimeout(event, config.timeoutMs);

      if (result.success) {
        await this.updateEventStatus(event.id, 'completed');
        this.stats.processed++;
        
        const processingTime = Date.now() - startTime;
        this.stats.performance.processingTimes.push(processingTime);
        
        // Keep only last 1000 processing times for averaging
        if (this.stats.performance.processingTimes.length > 1000) {
          this.stats.performance.processingTimes = this.stats.performance.processingTimes.slice(-1000);
        }

        console.log(`✅ Worker ${workerId} completed (${processingTime}ms)`);
        this.emit('event_processed', { event, result, processingTime });
        
        return true;
      } else {
        return await this.handleEventFailure(event, result.error, priority);
      }
    } catch (error) {
      return await this.handleEventFailure(event, error.message, priority);
    } finally {
      this.activeWorkers--;
    }
  }

  /**
   * Process event with timeout
   */
  async processEventWithTimeout(event, timeoutMs) {
    return new Promise(async (resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Processing timeout' });
      }, timeoutMs);

      try {
        // Import the sync service dynamically to avoid circular dependencies
        const { default: syncEventWebhookService } = await import('./syncEventWebhookService.js');
        const result = await syncEventWebhookService.processEvent(event);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Handle event processing failure
   */
  async handleEventFailure(event, errorMessage, priority) {
    const config = this.config.priorities[priority];
    const currentRetries = event.retry_count || 0;

    console.log(`❌ Event ${event.id} failed: ${errorMessage} (retry ${currentRetries}/${config.maxRetries})`);

    if (currentRetries < config.maxRetries) {
      // Schedule for retry
      await this.scheduleRetry(event, errorMessage, priority);
      this.stats.retried++;
      return false;
    } else {
      // Move to dead letter queue
      await this.moveToDeadLetterQueue(event, errorMessage);
      this.stats.deadLettered++;
      return false;
    }
  }

  /**
   * Schedule event for retry
   */
  async scheduleRetry(event, errorMessage, priority) {
    const config = this.config.priorities[priority];
    const retryDelay = config.retryDelay * Math.pow(2, event.retry_count || 0); // Exponential backoff
    const scheduleTime = new Date(Date.now() + retryDelay);

    await this.supabase.rpc('schedule_sync_event_retry', {
      event_id: event.id,
      error_msg: errorMessage,
      scheduled_time: scheduleTime.toISOString()
    });
  }

  /**
   * Move event to dead letter queue
   */
  async moveToDeadLetterQueue(event, errorMessage) {
    if (!this.config.deadLetterQueue.enabled) {
      await this.updateEventStatus(event.id, 'failed', errorMessage);
      return;
    }

    await this.supabase.rpc('move_to_dead_letter_queue', {
      event_id: event.id,
      final_error: errorMessage
    });

    this.emit('event_dead_lettered', { event, error: errorMessage });
  }

  /**
   * Update event status in database
   */
  async updateEventStatus(eventId, status, errorMessage = null) {
    const { error } = await this.supabase.rpc('update_sync_event_status', {
      event_id: eventId,
      new_status: status,
      error_msg: errorMessage
    });

    if (error) {
      console.error(`❌ Failed to update event ${eventId} status:`, error.message);
    }
  }

  /**
   * Check rate limiting
   */
  checkRateLimit() {
    if (!this.config.rateLimiting.enabled) {
      return true;
    }

    const now = Date.now();
    const timePassed = now - this.rateLimiter.lastRefill;
    
    // Refill tokens based on time passed
    this.rateLimiter.tokens = Math.min(
      this.config.rateLimiting.burstCapacity,
      this.rateLimiter.tokens + (timePassed * this.rateLimiter.tokensPerMs)
    );
    this.rateLimiter.lastRefill = now;

    if (this.rateLimiter.tokens >= 1) {
      this.rateLimiter.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Group events by table name
   */
  groupEventsByTable(events) {
    return events.reduce((groups, event) => {
      const table = event.table_name;
      if (!groups[table]) {
        groups[table] = [];
      }
      groups[table].push(event);
      return groups;
    }, {});
  }

  /**
   * Chunk array into smaller arrays
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Update performance statistics
   */
  updatePerformanceStats(eventsProcessed, processingTime) {
    this.stats.lastProcessedAt = new Date();
    
    // Calculate events per second
    const eventsPerSecond = (eventsProcessed / processingTime) * 1000;
    this.stats.performance.eventsPerSecond = 
      (this.stats.performance.eventsPerSecond + eventsPerSecond) / 2;

    // Update average processing time
    if (this.stats.performance.processingTimes.length > 0) {
      const sum = this.stats.performance.processingTimes.reduce((a, b) => a + b, 0);
      this.stats.averageProcessingTime = sum / this.stats.performance.processingTimes.length;
    }
  }

  /**
   * Record error for monitoring
   */
  recordError(type, error) {
    this.stats.errors.push({
      type,
      message: error.message,
      timestamp: new Date(),
      stack: error.stack
    });

    // Keep only last 100 errors
    if (this.stats.errors.length > 100) {
      this.stats.errors = this.stats.errors.slice(-100);
    }

    this.stats.failed++;
    this.emit('error', { type, error });
  }

  /**
   * Start cleanup tasks
   */
  startCleanupTasks() {
    // Clean up old events every hour
    setInterval(async () => {
      try {
        await this.cleanupOldEvents();
        await this.cleanupDeadLetterQueue();
      } catch (error) {
        console.error('❌ Cleanup task failed:', error.message);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Clean up old completed events
   */
  async cleanupOldEvents() {
    const { data, error } = await this.supabase.rpc('cleanup_old_sync_events', {
      retention_days: 7
    });

    if (error) {
      throw error;
    }

    if (data > 0) {
      console.log(`🧹 Cleaned up ${data} old sync events`);
    }
  }

  /**
   * Clean up old dead letter queue entries
   */
  async cleanupDeadLetterQueue() {
    if (!this.config.deadLetterQueue.enabled) {
      return;
    }

    const { data, error } = await this.supabase.rpc('cleanup_dead_letter_queue', {
      retention_days: this.config.deadLetterQueue.retentionDays
    });

    if (error) {
      throw error;
    }

    if (data > 0) {
      console.log(`🧹 Cleaned up ${data} old dead letter queue entries`);
    }
  }

  /**
   * Get comprehensive service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      processing: this.isProcessing,
      active_workers: this.activeWorkers,
      max_workers: this.config.maxConcurrentWorkers,
      config: this.config,
      stats: {
        ...this.stats,
        uptime_seconds: this.stats.startedAt ? Math.floor((Date.now() - this.stats.startedAt.getTime()) / 1000) : 0,
        recent_errors: this.stats.errors.slice(-5),
        performance: this.stats.performance
      },
      rate_limiter: this.rateLimiter,
      worker_pools: Object.fromEntries(
        Array.from(this.workerPools.entries()).map(([priority, workers]) => [
          priority, 
          { count: workers.length, active: workers.filter(w => w.active).length }
        ])
      )
    };
  }

  /**
   * Get queue statistics from database
   */
  async getQueueStatistics() {
    try {
      const { data: stats, error } = await this.supabase.rpc('get_queue_statistics');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, statistics: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Manually trigger priority queue processing
   */
  async processPriorityEventsManually(priority, limit = 50) {
    try {
      console.log(`🔧 Manual processing of ${priority} priority events (limit: ${limit})`);
      
      const events = await this.getPendingEventsByPriority(priority);
      const eventsToProcess = events.slice(0, limit);
      
      let processed = 0;
      for (const event of eventsToProcess) {
        const result = await this.createWorker(event, priority);
        if (result) processed++;
      }

      return { success: true, processed, total: eventsToProcess.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset failed events for retry
   */
  async resetFailedEvents(priority = null, maxAgeHours = 1) {
    try {
      const { data, error } = await this.supabase.rpc('reset_failed_sync_events', {
        priority_filter: priority,
        max_age_hours: maxAgeHours
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, reset_count: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Close the service
   */
  async close() {
    this.stopProcessing();
    this.isInitialized = false;
    console.log('🔌 Sync event queue service closed');
  }
}

// Create singleton instance
const syncEventQueueService = new SyncEventQueueService();

export default syncEventQueueService;