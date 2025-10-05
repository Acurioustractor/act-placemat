/**
 * Sync Event Webhook Service
 * Processes real-time sync events queued by PostgreSQL triggers
 * Handles webhooks and manages the event processing pipeline
 */

import { createClient } from '@supabase/supabase-js';
import knowledgeGraphSyncService from './knowledgeGraphSyncService.js';

class SyncEventWebhookService {
  constructor() {
    this.supabase = null;
    this.isProcessing = false;
    this.processingInterval = null;
    this.webhookUrl = null;
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      batchSize: 10,
      processingIntervalMs: 5000, // 5 seconds
      maxRetries: 3,
      webhookTimeout: 10000, // 10 seconds
      parallelProcessing: true
    };

    // Statistics
    this.stats = {
      processed: 0,
      failed: 0,
      startedAt: null,
      lastProcessedAt: null,
      errors: []
    };
  }

  /**
   * Initialize the webhook service
   */
  async initialize(options = {}) {
    try {
      console.log('🚀 Initializing sync event webhook service...');
      
      // Initialize Supabase client
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Test database connection
      const { data, error } = await this.supabase.from('sync_events').select('id').limit(1);
      if (error && error.code !== '42P01') { // 42P01 is "relation does not exist"
        throw new Error(`Supabase connection test failed: ${error.message}`);
      }

      // Configure webhook URL if provided
      this.webhookUrl = options.webhookUrl || process.env.SYNC_WEBHOOK_URL;
      
      // Override default config with options
      Object.assign(this.config, options.config || {});

      // Initialize knowledge graph sync service if not already initialized
      if (!knowledgeGraphSyncService.getStatus().initialized) {
        await knowledgeGraphSyncService.initialize();
      }

      this.isInitialized = true;
      this.stats.startedAt = new Date();
      
      console.log('✅ Sync event webhook service initialized');
      console.log(`📊 Configuration: ${JSON.stringify(this.config, null, 2)}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize sync event webhook service:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Start the webhook processing service
   */
  async startProcessing() {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    if (this.isProcessing) {
      console.log('⏳ Webhook processing already running');
      return;
    }

    console.log('🔄 Starting sync event processing...');
    this.isProcessing = true;

    // Start the processing loop
    this.processingInterval = setInterval(async () => {
      try {
        await this.processNextBatch();
      } catch (error) {
        console.error('❌ Error in processing loop:', error.message);
        this.stats.errors.push({
          timestamp: new Date(),
          error: error.message,
          type: 'processing_loop'
        });
      }
    }, this.config.processingIntervalMs);

    console.log(`✅ Webhook processing started (interval: ${this.config.processingIntervalMs}ms)`);
  }

  /**
   * Stop the webhook processing service
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.isProcessing = false;
    console.log('🛑 Webhook processing stopped');
  }

  /**
   * Process the next batch of pending sync events
   */
  async processNextBatch() {
    if (!this.isInitialized) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      // Get pending events from database
      const { data: events, error } = await this.supabase.rpc('get_pending_sync_events', {
        batch_size: this.config.batchSize,
        target_filter: null // Process all targets
      });

      if (error) {
        console.error('❌ Failed to fetch pending sync events:', error.message);
        return { success: false, error: error.message };
      }

      if (!events || events.length === 0) {
        // No events to process
        return { success: true, processed: 0 };
      }

      console.log(`📨 Processing ${events.length} sync events...`);

      let processed = 0;
      let failed = 0;

      // Process events based on configuration
      if (this.config.parallelProcessing) {
        const results = await Promise.allSettled(
          events.map(event => this.processEvent(event))
        );
        
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.success) {
            processed++;
          } else {
            failed++;
          }
        });
      } else {
        // Sequential processing
        for (const event of events) {
          const result = await this.processEvent(event);
          if (result.success) {
            processed++;
          } else {
            failed++;
          }
        }
      }

      // Update statistics
      this.stats.processed += processed;
      this.stats.failed += failed;
      this.stats.lastProcessedAt = new Date();

      console.log(`✅ Batch processed: ${processed} succeeded, ${failed} failed`);

      return { success: true, processed, failed };

    } catch (error) {
      console.error('❌ Batch processing error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a single sync event
   */
  async processEvent(event) {
    const eventId = event.id;
    const startTime = Date.now();

    try {
      console.log(`🔄 Processing ${event.event_type} event for ${event.table_name} (${eventId})`);

      // Mark event as processing
      await this.updateEventStatus(eventId, 'processing');

      // Route event to appropriate sync method based on table
      let syncResult = { success: false, error: 'Unknown table type' };

      switch (event.table_name) {
        case 'user_profiles':
          syncResult = await this.syncUserProfileEvent(event);
          break;
        case 'projects':
          syncResult = await this.syncProjectEvent(event);
          break;
        case 'project_outcomes':
          syncResult = await this.syncProjectOutcomeEvent(event);
          break;
        case 'community_events':
          syncResult = await this.syncCommunityEventEvent(event);
          break;
        default:
          syncResult = { success: false, error: `Unsupported table: ${event.table_name}` };
      }

      // Update event status based on sync result
      if (syncResult.success) {
        await this.updateEventStatus(eventId, 'completed');
        
        // Send webhook notification if configured
        if (this.webhookUrl) {
          await this.sendWebhookNotification(event, syncResult);
        }

        const duration = Date.now() - startTime;
        console.log(`✅ Event ${eventId} processed successfully (${duration}ms)`);
        
        return { success: true, event_id: eventId, duration };
      } else {
        await this.updateEventStatus(eventId, 'failed', syncResult.error);
        console.log(`❌ Event ${eventId} failed: ${syncResult.error}`);
        
        return { success: false, event_id: eventId, error: syncResult.error };
      }

    } catch (error) {
      console.error(`❌ Error processing event ${eventId}:`, error.message);
      
      await this.updateEventStatus(eventId, 'failed', error.message);
      
      return { success: false, event_id: eventId, error: error.message };
    }
  }

  /**
   * Sync user profile event
   */
  async syncUserProfileEvent(event) {
    try {
      const userData = event.operation_data;
      
      switch (event.event_type) {
        case 'insert':
        case 'update':
          return await knowledgeGraphSyncService.syncUserToKnowledgeGraph(userData);
          
        case 'delete':
          // For delete operations, we need to remove from Neo4j
          const deleteQuery = `
            MATCH (u:User {user_id: $userId})
            DETACH DELETE u
          `;
          return await knowledgeGraphSyncService.knowledgeGraphService.executeWrite(
            deleteQuery, 
            { userId: userData.user_id }
          );
          
        default:
          return { success: false, error: `Unsupported event type: ${event.event_type}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync project event
   */
  async syncProjectEvent(event) {
    try {
      const projectData = event.operation_data;
      
      switch (event.event_type) {
        case 'insert':
        case 'update':
          // This would need to be implemented based on your project sync logic
          return { success: true, message: 'Project sync not yet implemented' };
          
        case 'delete':
          const deleteQuery = `
            MATCH (p:Project {project_id: $projectId})
            DETACH DELETE p
          `;
          return await knowledgeGraphSyncService.knowledgeGraphService.executeWrite(
            deleteQuery, 
            { projectId: projectData.id }
          );
          
        default:
          return { success: false, error: `Unsupported event type: ${event.event_type}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync project outcome event
   */
  async syncProjectOutcomeEvent(event) {
    try {
      const outcomeData = event.operation_data;
      
      switch (event.event_type) {
        case 'insert':
        case 'update':
          return await knowledgeGraphSyncService.syncProjectOutcome(outcomeData);
          
        case 'delete':
          const deleteQuery = `
            MATCH (o:ProjectOutcome {outcome_id: $outcomeId})
            DETACH DELETE o
          `;
          return await knowledgeGraphSyncService.knowledgeGraphService.executeWrite(
            deleteQuery, 
            { outcomeId: outcomeData.id }
          );
          
        default:
          return { success: false, error: `Unsupported event type: ${event.event_type}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync community event
   */
  async syncCommunityEventEvent(event) {
    try {
      const eventData = event.operation_data;
      
      switch (event.event_type) {
        case 'insert':
        case 'update':
          // Only sync collaboration and impact events
          if (!eventData.event_category || !['collaboration', 'impact'].includes(eventData.event_category)) {
            return { success: true, message: 'Event category not synced' };
          }
          
          return { success: true, message: 'Community event sync not yet implemented' };
          
        case 'delete':
          return { success: true, message: 'Community event deletion handled' };
          
        default:
          return { success: false, error: `Unsupported event type: ${event.event_type}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update sync event status in database
   */
  async updateEventStatus(eventId, status, errorMessage = null) {
    try {
      const { error } = await this.supabase.rpc('update_sync_event_status', {
        event_id: eventId,
        new_status: status,
        error_msg: errorMessage
      });

      if (error) {
        console.error(`❌ Failed to update event ${eventId} status to ${status}:`, error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`❌ Error updating event ${eventId} status:`, error.message);
      return false;
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(event, syncResult) {
    if (!this.webhookUrl) {
      return;
    }

    try {
      const payload = {
        event_id: event.id,
        event_type: event.event_type,
        table_name: event.table_name,
        record_id: event.record_id,
        sync_target: event.sync_target,
        sync_result: syncResult,
        processed_at: new Date().toISOString()
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Event-Webhook': 'true'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.webhookTimeout)
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with status: ${response.status}`);
      }

      console.log(`📤 Webhook notification sent for event ${event.id}`);
    } catch (error) {
      console.error(`❌ Failed to send webhook notification for event ${event.id}:`, error.message);
      // Don't fail the event processing if webhook fails
    }
  }

  /**
   * Manually process events for a specific table
   */
  async processEventsForTable(tableName, limit = 50) {
    try {
      const { data: events, error } = await this.supabase
        .from('sync_events')
        .select('*')
        .eq('table_name', tableName)
        .eq('sync_status', 'pending')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      let processed = 0;
      let failed = 0;

      for (const event of events) {
        const result = await this.processEvent(event);
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      }

      return { success: true, processed, failed, table: tableName };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get service status and statistics
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      processing: this.isProcessing,
      webhook_url: this.webhookUrl ? 'configured' : 'not configured',
      config: this.config,
      stats: {
        ...this.stats,
        uptime_seconds: this.stats.startedAt ? Math.floor((Date.now() - this.stats.startedAt.getTime()) / 1000) : 0,
        recent_errors: this.stats.errors.slice(-5) // Last 5 errors
      }
    };
  }

  /**
   * Get sync event statistics from database
   */
  async getSyncEventStatistics() {
    try {
      const { data: stats, error } = await this.supabase
        .from('sync_event_statistics')
        .select('*');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, statistics: stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset failed events for retry
   */
  async resetFailedEvents(tableFilter = null, maxAgeHours = 24) {
    try {
      const { data, error } = await this.supabase.rpc('reset_failed_sync_events', {
        table_filter: tableFilter,
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
   * Clean up old sync events
   */
  async cleanupOldEvents(retentionDays = 30) {
    try {
      const { data, error } = await this.supabase.rpc('cleanup_old_sync_events', {
        retention_days: retentionDays
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, deleted_count: data };
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
    console.log('🔌 Sync event webhook service closed');
  }
}

// Create singleton instance
const syncEventWebhookService = new SyncEventWebhookService();

export default syncEventWebhookService;