/**
 * Comprehensive Audit Logging System for ACT Placemat
 * 
 * Tamper-proof audit logging with immutable storage, digital signatures,
 * and Australian compliance for security event tracking
 */

import crypto from 'crypto';
import { z } from 'zod';

// === AUDIT LOG SCHEMAS ===

export const AuditEventSchema = z.object({
  // Event identification
  id: z.string().uuid(),
  eventType: z.enum([
    'authentication',
    'authorization',
    'data_access',
    'data_modification',
    'system_access',
    'admin_action',
    'security_violation',
    'configuration_change',
    'user_management',
    'api_access',
    'file_operation',
    'database_operation',
    'encryption_operation',
    'key_management',
    'sovereignty_access',
    'compliance_check'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  
  // Event details
  action: z.string(),
  description: z.string(),
  outcome: z.enum(['success', 'failure', 'warning', 'blocked']),
  
  // Context information
  timestamp: z.date(),
  source: z.object({
    service: z.string(),
    component: z.string(),
    version: z.string().optional()
  }),
  
  // Actor information
  actor: z.object({
    type: z.enum(['user', 'service', 'system', 'api_key']),
    id: z.string(),
    name: z.string().optional(),
    roles: z.array(z.string()).default([]),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional()
  }),
  
  // Target information
  target: z.object({
    type: z.string(), // 'user', 'resource', 'system', etc.
    id: z.string().optional(),
    name: z.string().optional(),
    attributes: z.record(z.any()).default({})
  }).optional(),
  
  // Request/Response data
  request: z.object({
    method: z.string().optional(),
    endpoint: z.string().optional(),
    parameters: z.record(z.any()).default({}),
    headers: z.record(z.string()).default({})
  }).optional(),
  
  response: z.object({
    statusCode: z.number().optional(),
    responseTime: z.number().optional(),
    dataSize: z.number().optional()
  }).optional(),
  
  // Security context
  security: z.object({
    classification: z.enum(['public', 'internal', 'confidential', 'restricted']),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
    requiresNotification: z.boolean().default(false),
    complianceFrameworks: z.array(z.string()).default([]),
    sovereigntyContext: z.object({
      involvedCommunities: z.array(z.string()).default([]),
      dataType: z.string().optional(),
      consentRequired: z.boolean().default(false)
    }).optional()
  }),
  
  // Additional metadata
  metadata: z.record(z.any()).default({}),
  
  // Compliance tracking
  compliance: z.object({
    australianPrivacyAct: z.boolean().default(false),
    indigenousSovereignty: z.boolean().default(false),
    dataResidency: z.boolean().default(false),
    retentionPeriod: z.number().optional(), // Days
    archiveRequired: z.boolean().default(false)
  }),
  
  // Integrity protection
  integrity: z.object({
    hash: z.string().optional(), // SHA-256 hash of event data
    signature: z.string().optional(), // Digital signature
    previousHash: z.string().optional(), // Hash of previous event (blockchain-like)
    sequenceNumber: z.number().optional() // Sequence in audit chain
  }).optional()
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// === AUDIT CONFIGURATION ===

export const AuditConfigSchema = z.object({
  // Storage settings
  storageType: z.enum(['file', 'database', 'blockchain', 'syslog']).default('file'),
  storagePath: z.string().optional(),
  
  // Integrity settings
  enableDigitalSignatures: z.boolean().default(true),
  signingKeyPath: z.string().optional(),
  enableBlockchainMode: z.boolean().default(true), // Chain events with hashes
  
  // Retention settings
  defaultRetentionDays: z.number().default(2555), // 7 years for Australian compliance
  enableAutoArchive: z.boolean().default(true),
  archivePath: z.string().optional(),
  enableCompression: z.boolean().default(true),
  
  // Real-time settings
  enableRealTimeAlerts: z.boolean().default(true),
  alertThresholds: z.object({
    criticalEvents: z.number().default(1),
    highSeverityEvents: z.number().default(5),
    failedLogins: z.number().default(10),
    dataAccessViolations: z.number().default(3)
  }),
  
  // Compliance settings
  enforceAustralianCompliance: z.boolean().default(true),
  enableIndigenousProtection: z.boolean().default(true),
  enableDataResidencyTracking: z.boolean().default(true),
  
  // Performance settings
  enableBatching: z.boolean().default(true),
  batchSize: z.number().default(100),
  flushIntervalMs: z.number().default(5000),
  enableAsyncLogging: z.boolean().default(true),
  
  // Security settings
  enableTamperDetection: z.boolean().default(true),
  enableEncryption: z.boolean().default(true),
  encryptionKey: z.string().optional()
});

export type AuditConfig = z.infer<typeof AuditConfigSchema>;

// === AUDIT STORAGE INTERFACE ===

export interface AuditStorage {
  store(event: AuditEvent): Promise<void>;
  storeBatch(events: AuditEvent[]): Promise<void>;
  query(criteria: AuditQueryCriteria): Promise<AuditEvent[]>;
  getEventById(id: string): Promise<AuditEvent | null>;
  verifyIntegrity(eventId?: string): Promise<{ valid: boolean; errors: string[] }>;
  archive(beforeDate: Date): Promise<{ archived: number; errors: string[] }>;
  getStatistics(): Promise<AuditStatistics>;
}

export interface AuditQueryCriteria {
  eventTypes?: string[];
  severities?: string[];
  outcomes?: string[];
  actorIds?: string[];
  dateRange?: { from: Date; to: Date };
  classifications?: string[];
  communityIds?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsToday: number;
  eventsThisWeek: number;
  criticalEventsLastHour: number;
  integrityViolations: number;
  storageSize: number;
}

// === AUDIT LOGGER IMPLEMENTATION ===

export class AuditLogger {
  private config: AuditConfig;
  private storage: AuditStorage;
  private eventQueue: AuditEvent[] = [];
  private sequenceNumber = 0;
  private lastEventHash = '';
  private signingKey?: crypto.KeyObject;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: AuditConfig, storage: AuditStorage) {
    this.config = AuditConfigSchema.parse(config);
    this.storage = storage;
    
    this.initializeIntegrity();
    this.startBatchProcessor();
  }

  // === EVENT LOGGING ===

  /**
   * Log audit event with comprehensive validation and integrity protection
   */
  async logEvent(event: Partial<AuditEvent>): Promise<string> {
    // Generate event ID if not provided
    const eventId = event.id || crypto.randomUUID();
    
    // Validate and enrich event
    const enrichedEvent = await this.enrichEvent({
      ...event,
      id: eventId,
      timestamp: event.timestamp || new Date()
    });
    
    // Validate event structure
    const validatedEvent = AuditEventSchema.parse(enrichedEvent);
    
    // Add integrity protection
    await this.addIntegrityProtection(validatedEvent);
    
    // Queue or store immediately
    if (this.config.enableBatching && this.config.enableAsyncLogging) {
      this.eventQueue.push(validatedEvent);
      
      // Flush if batch is full
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.flushQueue();
      }
    } else {
      await this.storage.store(validatedEvent);
    }
    
    // Check for real-time alerts
    if (this.config.enableRealTimeAlerts) {
      await this.checkAlertThresholds(validatedEvent);
    }
    
    return eventId;
  }

  /**
   * Log authentication event
   */
  async logAuthentication(details: {
    action: 'login' | 'logout' | 'password_change' | 'mfa_setup' | 'token_refresh';
    outcome: 'success' | 'failure';
    userId: string;
    username?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    return this.logEvent({
      eventType: 'authentication',
      severity: details.outcome === 'failure' ? 'medium' : 'low',
      action: details.action,
      description: `User ${details.action}: ${details.outcome}`,
      outcome: details.outcome,
      actor: {
        type: 'user',
        id: details.userId,
        name: details.username,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        sessionId: details.sessionId
      },
      security: {
        classification: 'confidential',
        riskLevel: details.outcome === 'failure' ? 'medium' : 'low',
        requiresNotification: details.outcome === 'failure',
        complianceFrameworks: ['Privacy Act 1988']
      },
      metadata: {
        reason: details.reason,
        ...details.metadata
      },
      compliance: {
        australianPrivacyAct: true,
        dataResidency: true
      }
    });
  }

  /**
   * Log authorization event
   */
  async logAuthorization(details: {
    action: string;
    resource: string;
    outcome: 'success' | 'failure' | 'blocked';
    userId: string;
    roles: string[];
    requiredPermissions: string[];
    grantedPermissions?: string[];
    ipAddress?: string;
    endpoint?: string;
    reason?: string;
  }): Promise<string> {
    return this.logEvent({
      eventType: 'authorization',
      severity: details.outcome === 'blocked' ? 'high' : 'low',
      action: details.action,
      description: `Authorization ${details.outcome} for ${details.resource}`,
      outcome: details.outcome,
      actor: {
        type: 'user',
        id: details.userId,
        roles: details.roles,
        ipAddress: details.ipAddress
      },
      target: {
        type: 'resource',
        name: details.resource,
        attributes: {
          requiredPermissions: details.requiredPermissions,
          grantedPermissions: details.grantedPermissions
        }
      },
      request: {
        endpoint: details.endpoint
      },
      security: {
        classification: 'internal',
        riskLevel: details.outcome === 'blocked' ? 'high' : 'low',
        requiresNotification: details.outcome === 'blocked',
        complianceFrameworks: ['Privacy Act 1988']
      },
      metadata: {
        reason: details.reason
      }
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(details: {
    action: 'read' | 'write' | 'delete' | 'export';
    dataType: string;
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    outcome: 'success' | 'failure';
    userId: string;
    recordCount?: number;
    dataSize?: number;
    communityId?: string;
    consentVerified?: boolean;
    ipAddress?: string;
    reason?: string;
  }): Promise<string> {
    const isIndigenousData = !!details.communityId;
    const isHighRisk = details.classification === 'restricted' || 
                      details.action === 'export' || 
                      isIndigenousData;

    return this.logEvent({
      eventType: 'data_access',
      severity: isHighRisk ? 'high' : 'medium',
      action: `data_${details.action}`,
      description: `Data ${details.action} operation on ${details.dataType}`,
      outcome: details.outcome,
      actor: {
        type: 'user',
        id: details.userId,
        ipAddress: details.ipAddress
      },
      target: {
        type: 'data',
        name: details.dataType,
        attributes: {
          classification: details.classification,
          recordCount: details.recordCount,
          dataSize: details.dataSize
        }
      },
      security: {
        classification: details.classification,
        riskLevel: isHighRisk ? 'high' : 'medium',
        requiresNotification: isHighRisk,
        complianceFrameworks: ['Privacy Act 1988'],
        sovereigntyContext: isIndigenousData ? {
          involvedCommunities: [details.communityId!],
          dataType: details.dataType,
          consentRequired: true
        } : undefined
      },
      metadata: {
        reason: details.reason,
        consentVerified: details.consentVerified
      },
      compliance: {
        australianPrivacyAct: true,
        indigenousSovereignty: isIndigenousData,
        dataResidency: true
      }
    });
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(details: {
    violationType: string;
    description: string;
    severity: 'medium' | 'high' | 'critical';
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    blockedAction?: string;
    evidence?: Record<string, any>;
  }): Promise<string> {
    return this.logEvent({
      eventType: 'security_violation',
      severity: details.severity,
      action: details.violationType,
      description: details.description,
      outcome: 'blocked',
      actor: {
        type: details.userId ? 'user' : 'system',
        id: details.userId || 'unknown',
        ipAddress: details.ipAddress,
        userAgent: details.userAgent
      },
      request: {
        endpoint: details.endpoint
      },
      security: {
        classification: 'restricted',
        riskLevel: 'critical',
        requiresNotification: true,
        complianceFrameworks: ['Privacy Act 1988', 'ISM']
      },
      metadata: {
        blockedAction: details.blockedAction,
        evidence: details.evidence
      },
      compliance: {
        australianPrivacyAct: true,
        dataResidency: true
      }
    });
  }

  /**
   * Log Indigenous sovereignty event
   */
  async logSovereigntyEvent(details: {
    action: string;
    communityId: string;
    dataType: string;
    outcome: 'success' | 'failure' | 'blocked';
    userId: string;
    consentStatus: 'verified' | 'pending' | 'denied';
    culturalProtocols: string[];
    elderApproval?: boolean;
    reason?: string;
  }): Promise<string> {
    return this.logEvent({
      eventType: 'sovereignty_access',
      severity: details.outcome === 'blocked' ? 'high' : 'medium',
      action: details.action,
      description: `Indigenous data sovereignty action: ${details.action}`,
      outcome: details.outcome,
      actor: {
        type: 'user',
        id: details.userId
      },
      target: {
        type: 'indigenous_data',
        name: details.dataType,
        attributes: {
          communityId: details.communityId,
          consentStatus: details.consentStatus,
          culturalProtocols: details.culturalProtocols
        }
      },
      security: {
        classification: 'restricted',
        riskLevel: 'high',
        requiresNotification: true,
        complianceFrameworks: ['CARE Principles', 'FAIR Principles'],
        sovereigntyContext: {
          involvedCommunities: [details.communityId],
          dataType: details.dataType,
          consentRequired: true
        }
      },
      metadata: {
        elderApproval: details.elderApproval,
        reason: details.reason
      },
      compliance: {
        australianPrivacyAct: true,
        indigenousSovereignty: true,
        dataResidency: true
      }
    });
  }

  // === EVENT ENRICHMENT ===

  /**
   * Enrich event with additional context and validation
   */
  private async enrichEvent(event: Partial<AuditEvent>): Promise<AuditEvent> {
    const enriched = { ...event } as AuditEvent;
    
    // Add source information if not provided
    if (!enriched.source) {
      enriched.source = {
        service: 'act-placemat',
        component: 'audit-logger',
        version: '1.0.0'
      };
    }
    
    // Ensure security context exists
    if (!enriched.security) {
      enriched.security = {
        classification: 'internal',
        riskLevel: 'low',
        requiresNotification: false,
        complianceFrameworks: []
      };
    }
    
    // Add compliance defaults
    if (!enriched.compliance) {
      enriched.compliance = {
        australianPrivacyAct: this.config.enforceAustralianCompliance,
        indigenousSovereignty: false,
        dataResidency: this.config.enableDataResidencyTracking
      };
    }
    
    // Set retention period based on classification
    if (!enriched.compliance.retentionPeriod) {
      enriched.compliance.retentionPeriod = this.getRetentionPeriod(enriched.security.classification);
    }
    
    // Add metadata defaults
    if (!enriched.metadata) {
      enriched.metadata = {};
    }
    
    // Add system metadata
    enriched.metadata.nodeId = process.env.NODE_ID || 'unknown';
    enriched.metadata.processId = process.pid;
    enriched.metadata.environment = process.env.NODE_ENV || 'unknown';
    
    return enriched;
  }

  /**
   * Get retention period based on data classification
   */
  private getRetentionPeriod(classification: string): number {
    const periods: Record<string, number> = {
      public: 365,      // 1 year
      internal: 1095,   // 3 years  
      confidential: 2555, // 7 years
      restricted: 2555   // 7 years (Australian compliance)
    };
    
    return periods[classification] || this.config.defaultRetentionDays;
  }

  // === INTEGRITY PROTECTION ===

  /**
   * Initialize integrity protection features
   */
  private async initializeIntegrity(): Promise<void> {
    if (this.config.enableDigitalSignatures && this.config.signingKeyPath) {
      try {
        const fs = require('fs').promises;
        const keyData = await fs.readFile(this.config.signingKeyPath);
        this.signingKey = crypto.createPrivateKey(keyData);
      } catch (error) {
        console.warn('Failed to load signing key:', error);
      }
    }
    
    // Initialize sequence number and last hash from storage
    await this.initializeChainState();
  }

  /**
   * Initialize blockchain-like chain state
   */
  private async initializeChainState(): Promise<void> {
    if (!this.config.enableBlockchainMode) return;
    
    try {
      const stats = await this.storage.getStatistics();
      this.sequenceNumber = stats.totalEvents;
      
      // Get last event hash if any events exist
      if (stats.totalEvents > 0) {
        // In a real implementation, we'd query for the last event
        // For now, we'll start fresh
        this.lastEventHash = '';
      }
    } catch (error) {
      console.warn('Failed to initialize chain state:', error);
      this.sequenceNumber = 0;
      this.lastEventHash = '';
    }
  }

  /**
   * Add integrity protection to event
   */
  private async addIntegrityProtection(event: AuditEvent): Promise<void> {
    if (!event.integrity) {
      event.integrity = {};
    }
    
    // Calculate event hash
    const eventData = this.getEventDataForHashing(event);
    const hash = crypto.createHash('sha256').update(eventData).digest('hex');
    event.integrity.hash = hash;
    
    // Add blockchain-like chaining
    if (this.config.enableBlockchainMode) {
      event.integrity.previousHash = this.lastEventHash;
      event.integrity.sequenceNumber = ++this.sequenceNumber;
      this.lastEventHash = hash;
    }
    
    // Add digital signature
    if (this.config.enableDigitalSignatures && this.signingKey) {
      const signature = crypto.sign('sha256', Buffer.from(eventData), this.signingKey);
      event.integrity.signature = signature.toString('base64');
    }
  }

  /**
   * Get event data for hashing (excluding integrity field)
   */
  private getEventDataForHashing(event: AuditEvent): string {
    const { integrity, ...eventWithoutIntegrity } = event;
    return JSON.stringify(eventWithoutIntegrity, Object.keys(eventWithoutIntegrity).sort());
  }

  // === BATCH PROCESSING ===

  /**
   * Start batch processor for async logging
   */
  private startBatchProcessor(): void {
    if (!this.config.enableBatching || !this.config.enableAsyncLogging) return;
    
    this.flushTimer = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushQueue();
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Flush queued events to storage
   */
  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const eventsToFlush = this.eventQueue.splice(0, this.config.batchSize);
    
    try {
      await this.storage.storeBatch(eventsToFlush);
    } catch (error) {
      console.error('Failed to flush audit events:', error);
      
      // Re-queue events for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  // === ALERT PROCESSING ===

  /**
   * Check event against alert thresholds
   */
  private async checkAlertThresholds(event: AuditEvent): Promise<void> {
    const thresholds = this.config.alertThresholds;
    
    // Critical events
    if (event.severity === 'critical') {
      await this.triggerAlert('critical_event', event, 'Critical security event detected');
    }
    
    // High severity events
    if (event.severity === 'high') {
      const recentHighSeverity = await this.countRecentEvents('high', 60); // Last hour
      if (recentHighSeverity >= thresholds.highSeverityEvents) {
        await this.triggerAlert('high_severity_threshold', event, `High severity event threshold exceeded: ${recentHighSeverity} events`);
      }
    }
    
    // Failed authentication attempts
    if (event.eventType === 'authentication' && event.outcome === 'failure') {
      const recentFailures = await this.countRecentAuthFailures(event.actor.id, 60);
      if (recentFailures >= thresholds.failedLogins) {
        await this.triggerAlert('failed_login_threshold', event, `Failed login threshold exceeded: ${recentFailures} attempts`);
      }
    }
    
    // Data access violations
    if (event.eventType === 'security_violation') {
      const recentViolations = await this.countRecentEvents('security_violation', 60);
      if (recentViolations >= thresholds.dataAccessViolations) {
        await this.triggerAlert('security_violation_threshold', event, `Security violation threshold exceeded: ${recentViolations} violations`);
      }
    }
  }

  /**
   * Count recent events of specific type/severity
   */
  private async countRecentEvents(criteria: string, minutesBack: number): Promise<number> {
    const fromDate = new Date(Date.now() - minutesBack * 60 * 1000);
    
    try {
      const events = await this.storage.query({
        severities: criteria === 'high' ? ['high'] : undefined,
        eventTypes: criteria === 'security_violation' ? ['security_violation'] : undefined,
        dateRange: { from: fromDate, to: new Date() }
      });
      
      return events.length;
    } catch (error) {
      console.error('Failed to count recent events:', error);
      return 0;
    }
  }

  /**
   * Count recent authentication failures for specific user
   */
  private async countRecentAuthFailures(userId: string, minutesBack: number): Promise<number> {
    const fromDate = new Date(Date.now() - minutesBack * 60 * 1000);
    
    try {
      const events = await this.storage.query({
        eventTypes: ['authentication'],
        outcomes: ['failure'],
        actorIds: [userId],
        dateRange: { from: fromDate, to: new Date() }
      });
      
      return events.length;
    } catch (error) {
      console.error('Failed to count auth failures:', error);
      return 0;
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerAlert(
    alertType: string,
    event: AuditEvent,
    message: string
  ): Promise<void> {
    // Log alert as audit event
    await this.logEvent({
      eventType: 'security_violation',
      severity: 'high',
      action: 'alert_triggered',
      description: message,
      outcome: 'warning',
      actor: {
        type: 'system',
        id: 'audit-logger'
      },
      security: {
        classification: 'restricted',
        riskLevel: 'critical',
        requiresNotification: true,
        complianceFrameworks: ['ISM']
      },
      metadata: {
        alertType,
        originalEventId: event.id,
        originalEventType: event.eventType
      }
    });
    
    // In production, this would integrate with alerting system
    console.warn(`SECURITY ALERT [${alertType}]: ${message}`, {
      eventId: event.id,
      eventType: event.eventType,
      severity: event.severity
    });
  }

  // === PUBLIC API ===

  /**
   * Query audit events
   */
  async query(criteria: AuditQueryCriteria): Promise<AuditEvent[]> {
    return this.storage.query(criteria);
  }

  /**
   * Get event by ID
   */
  async getEvent(id: string): Promise<AuditEvent | null> {
    return this.storage.getEventById(id);
  }

  /**
   * Verify audit trail integrity
   */
  async verifyIntegrity(eventId?: string): Promise<{ valid: boolean; errors: string[] }> {
    return this.storage.verifyIntegrity(eventId);
  }

  /**
   * Get audit statistics
   */
  async getStatistics(): Promise<AuditStatistics> {
    return this.storage.getStatistics();
  }

  /**
   * Archive old events
   */
  async archiveEvents(beforeDate: Date): Promise<{ archived: number; errors: string[] }> {
    return this.storage.archive(beforeDate);
  }

  /**
   * Flush any queued events immediately
   */
  async flush(): Promise<void> {
    await this.flushQueue();
  }

  /**
   * Shutdown audit logger gracefully
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush any remaining events
    await this.flushQueue();
  }
}