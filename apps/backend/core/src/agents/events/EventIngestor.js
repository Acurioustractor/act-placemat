/**
 * Event Ingestor Service
 * 
 * Central hub for receiving and routing events from various sources
 * (Xero webhooks, scheduled jobs, document uploads, etc.) to appropriate agents.
 */

import { EventEmitter } from 'events';
import { createSupabaseClient } from '../../config/supabase.js';
import { Logger } from '../../utils/logger.js';
import { z } from 'zod';

// Event schemas for validation
const BaseEventSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  source: z.string(),
  entity: z.string(),
  timestamp: z.string().datetime().optional(),
  data: z.any()
});

const XeroEventSchema = BaseEventSchema.extend({
  source: z.literal('xero'),
  type: z.enum([
    'bank_transaction_created',
    'bank_transaction_updated',
    'bill_created',
    'bill_updated',
    'invoice_created',
    'invoice_updated',
    'payment_created',
    'contact_created',
    'contact_updated'
  ]),
  data: z.object({
    resourceId: z.string(),
    resourceUrl: z.string().optional(),
    tenantId: z.string(),
    tenantType: z.string().optional(),
    eventDateUtc: z.string().datetime()
  })
});

const ScheduledEventSchema = BaseEventSchema.extend({
  source: z.literal('scheduler'),
  type: z.enum(['daily', 'weekly', 'monthly', 'month_end', 'quarter_end', 'year_end']),
  data: z.object({
    schedule: z.string(),
    lastRun: z.string().datetime().optional()
  })
});

const DocumentEventSchema = BaseEventSchema.extend({
  source: z.literal('documents'),
  type: z.enum(['rd_evidence_added', 'receipt_uploaded', 'document_updated']),
  data: z.object({
    documentId: z.string(),
    documentType: z.string(),
    path: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })
});

export class EventIngestor extends EventEmitter {
  constructor() {
    super();
    this.supabase = createSupabaseClient();
    this.logger = new Logger('EventIngestor');
    
    // Event queue for reliability
    this.eventQueue = [];
    this.processing = false;
    
    // Event statistics
    this.stats = {
      received: 0,
      processed: 0,
      failed: 0,
      byType: {},
      bySource: {}
    };
    
    // Start queue processor
    this.startQueueProcessor();
    
    this.logger.info('📥 Event Ingestor initialized');
  }
  
  /**
   * Ingest an event from any source
   */
  async ingest(rawEvent) {
    try {
      // Generate event ID if not provided
      const eventId = rawEvent.id || this.generateEventId();
      const event = {
        ...rawEvent,
        id: eventId,
        timestamp: rawEvent.timestamp || new Date().toISOString()
      };
      
      // Validate event structure
      const validatedEvent = await this.validateEvent(event);
      
      // Update statistics
      this.stats.received++;
      this.stats.bySource[validatedEvent.source] = (this.stats.bySource[validatedEvent.source] || 0) + 1;
      this.stats.byType[validatedEvent.type] = (this.stats.byType[validatedEvent.type] || 0) + 1;
      
      // Store event for audit trail
      await this.storeEvent(validatedEvent);
      
      // Add to processing queue
      this.eventQueue.push(validatedEvent);
      
      // Process queue if not already processing
      if (!this.processing) {
        this.processQueue();
      }
      
      this.logger.info(`Event ${eventId} ingested`, {
        type: validatedEvent.type,
        source: validatedEvent.source,
        entity: validatedEvent.entity
      });
      
      return {
        eventId,
        status: 'queued',
        position: this.eventQueue.length
      };
      
    } catch (error) {
      this.logger.error('Event ingestion failed:', error);
      this.stats.failed++;
      throw error;
    }
  }
  
  /**
   * Validate event based on source and type
   */
  async validateEvent(event) {
    let schema;
    
    switch (event.source) {
      case 'xero':
        schema = XeroEventSchema;
        break;
      case 'scheduler':
        schema = ScheduledEventSchema;
        break;
      case 'documents':
        schema = DocumentEventSchema;
        break;
      default:
        schema = BaseEventSchema;
    }
    
    try {
      return schema.parse(event);
    } catch (error) {
      throw new Error(`Event validation failed: ${error.message}`);
    }
  }
  
  /**
   * Store event in database for audit trail
   */
  async storeEvent(event) {
    try {
      const { error } = await this.supabase
        .from('event_logs')
        .insert({
          event_id: event.id,
          type: event.type,
          source: event.source,
          entity: event.entity,
          data: event.data,
          timestamp: event.timestamp,
          status: 'received'
        });
      
      if (error) throw error;
      
    } catch (error) {
      this.logger.error('Failed to store event:', error);
      // Don't throw - storage failure shouldn't break processing
    }
  }
  
  /**
   * Process events from the queue
   */
  async processQueue() {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      
      try {
        // Emit event for agents to handle
        this.emit('event', event);
        this.emit(event.type, event);
        
        // Update event status
        await this.updateEventStatus(event.id, 'processed');
        
        this.stats.processed++;
        
      } catch (error) {
        this.logger.error(`Failed to process event ${event.id}:`, error);
        
        // Update event status
        await this.updateEventStatus(event.id, 'failed', error.message);
        
        // Emit error event
        this.emit('error', { event, error });
        
        this.stats.failed++;
      }
      
      // Small delay between events to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processing = false;
  }
  
  /**
   * Update event status in database
   */
  async updateEventStatus(eventId, status, error = null) {
    try {
      const update = {
        status,
        processed_at: new Date().toISOString()
      };
      
      if (error) {
        update.error = error;
      }
      
      await this.supabase
        .from('event_logs')
        .update(update)
        .eq('event_id', eventId);
        
    } catch (err) {
      this.logger.error('Failed to update event status:', err);
    }
  }
  
  /**
   * Start the queue processor
   */
  startQueueProcessor() {
    // Process queue every 5 seconds
    setInterval(() => {
      if (!this.processing && this.eventQueue.length > 0) {
        this.processQueue();
      }
    }, 5000);
  }
  
  /**
   * Handle Xero webhook
   */
  async handleXeroWebhook(payload) {
    // Xero sends events in batches
    const events = Array.isArray(payload.events) ? payload.events : [payload];
    
    for (const xeroEvent of events) {
      await this.ingest({
        type: this.mapXeroEventType(xeroEvent.eventType),
        source: 'xero',
        entity: xeroEvent.tenantId,
        data: xeroEvent
      });
    }
  }
  
  /**
   * Map Xero event types to our internal types
   */
  mapXeroEventType(xeroType) {
    const mapping = {
      'CREATE_BANKTRANSACTION': 'bank_transaction_created',
      'UPDATE_BANKTRANSACTION': 'bank_transaction_updated',
      'CREATE_INVOICE': 'invoice_created',
      'UPDATE_INVOICE': 'invoice_updated',
      'CREATE_BILL': 'bill_created',
      'UPDATE_BILL': 'bill_updated',
      'CREATE_PAYMENT': 'payment_created',
      'CREATE_CONTACT': 'contact_created',
      'UPDATE_CONTACT': 'contact_updated'
    };
    
    return mapping[xeroType] || xeroType.toLowerCase();
  }
  
  /**
   * Handle scheduled job trigger
   */
  async handleScheduledJob(jobType) {
    await this.ingest({
      type: jobType,
      source: 'scheduler',
      entity: 'system',
      data: {
        schedule: jobType,
        lastRun: this.stats.lastScheduledRun?.[jobType]
      }
    });
    
    // Update last run time
    if (!this.stats.lastScheduledRun) {
      this.stats.lastScheduledRun = {};
    }
    this.stats.lastScheduledRun[jobType] = new Date().toISOString();
  }
  
  /**
   * Handle document upload event
   */
  async handleDocumentUpload(document) {
    await this.ingest({
      type: this.mapDocumentType(document.type),
      source: 'documents',
      entity: document.entity || 'default',
      data: {
        documentId: document.id,
        documentType: document.type,
        path: document.path,
        metadata: document.metadata
      }
    });
  }
  
  /**
   * Map document types to event types
   */
  mapDocumentType(docType) {
    const mapping = {
      'receipt': 'receipt_uploaded',
      'invoice': 'receipt_uploaded',
      'rd_evidence': 'rd_evidence_added',
      'contract': 'document_updated',
      'report': 'document_updated'
    };
    
    return mapping[docType] || 'document_updated';
  }
  
  /**
   * Get ingestion statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.eventQueue.length,
      processing: this.processing,
      uptime: process.uptime()
    };
  }
  
  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Health check
   */
  getHealth() {
    const queueBacklog = this.eventQueue.length > 100;
    const highFailureRate = this.stats.failed / (this.stats.processed || 1) > 0.1;
    
    return {
      status: queueBacklog || highFailureRate ? 'unhealthy' : 'healthy',
      queue: {
        length: this.eventQueue.length,
        processing: this.processing
      },
      stats: this.stats
    };
  }
}

// Singleton instance
let eventIngestor = null;

export function getEventIngestor() {
  if (!eventIngestor) {
    eventIngestor = new EventIngestor();
  }
  return eventIngestor;
}

export default EventIngestor;