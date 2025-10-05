/**
 * Comprehensive Tests for Audit Logger System
 * 
 * Tests tamper-proof storage, integrity verification, and Australian compliance features
 */

import crypto from 'crypto';
import { AuditLogger, AuditEvent, AuditConfig } from '../AuditLogger';
import { FileBasedAuditStorage } from '../FileBasedAuditStorage';
import { DatabaseAuditStorage } from '../DatabaseAuditStorage';

// === MOCK STORAGE IMPLEMENTATION ===

class MockAuditStorage {
  private events: Map<string, AuditEvent> = new Map();
  private storageIndex = 0;

  async store(event: AuditEvent): Promise<void> {
    this.events.set(event.id, { ...event });
  }

  async storeBatch(events: AuditEvent[]): Promise<void> {
    for (const event of events) {
      await this.store(event);
    }
  }

  async query(criteria: any): Promise<AuditEvent[]> {
    const events = Array.from(this.events.values());
    
    // Apply basic filtering for tests
    return events.filter(event => {
      if (criteria.eventTypes && !criteria.eventTypes.includes(event.eventType)) {
        return false;
      }
      if (criteria.severities && !criteria.severities.includes(event.severity)) {
        return false;
      }
      if (criteria.actorIds && !criteria.actorIds.includes(event.actor.id)) {
        return false;
      }
      return true;
    });
  }

  async getEventById(id: string): Promise<AuditEvent | null> {
    return this.events.get(id) || null;
  }

  async verifyIntegrity(eventId?: string): Promise<{ valid: boolean; errors: string[] }> {
    const events = Array.from(this.events.values());
    const errors: string[] = [];

    // Verify hash chain
    let previousHash = '';
    let expectedSequence = 1;

    for (const event of events.sort((a, b) => (a.integrity?.sequenceNumber || 0) - (b.integrity?.sequenceNumber || 0))) {
      if (event.integrity) {
        if (event.integrity.sequenceNumber !== expectedSequence) {
          errors.push(`Sequence mismatch: expected ${expectedSequence}, got ${event.integrity.sequenceNumber}`);
        }

        if (previousHash && event.integrity.previousHash !== previousHash) {
          errors.push(`Hash chain broken at event ${event.id}`);
        }

        previousHash = event.integrity.hash || '';
        expectedSequence++;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async archive(beforeDate: Date): Promise<{ archived: number; errors: string[] }> {
    let archived = 0;
    for (const [id, event] of this.events.entries()) {
      if (event.timestamp < beforeDate) {
        this.events.delete(id);
        archived++;
      }
    }
    return { archived, errors: [] };
  }

  async getStatistics(): Promise<any> {
    const events = Array.from(this.events.values());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      totalEvents: events.length,
      eventsByType: events.reduce((acc, e) => {
        acc[e.eventType] = (acc[e.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      eventsBySeverity: events.reduce((acc, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      eventsToday: events.filter(e => e.timestamp >= today).length,
      eventsThisWeek: events.length,
      criticalEventsLastHour: events.filter(e => e.severity === 'critical').length,
      integrityViolations: 0,
      storageSize: events.length * 1000 // Mock size
    };
  }
}

// === TEST SETUP ===

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let mockStorage: MockAuditStorage;
  let config: AuditConfig;

  beforeEach(() => {
    mockStorage = new MockAuditStorage();
    
    config = {
      storageType: 'file',
      enableDigitalSignatures: true,
      enableBlockchainMode: true,
      defaultRetentionDays: 2555,
      enableAutoArchive: true,
      enableRealTimeAlerts: true,
      alertThresholds: {
        criticalEvents: 1,
        highSeverityEvents: 5,
        failedLogins: 10,
        dataAccessViolations: 3
      },
      enforceAustralianCompliance: true,
      enableIndigenousProtection: true,
      enableDataResidencyTracking: true,
      enableBatching: false,
      batchSize: 100,
      flushIntervalMs: 5000,
      enableAsyncLogging: false,
      enableTamperDetection: true,
      enableEncryption: true
    };

    auditLogger = new AuditLogger(config, mockStorage as any);
  });

  afterEach(async () => {
    await auditLogger.shutdown();
  });

  // === BASIC FUNCTIONALITY TESTS ===

  describe('Basic Event Logging', () => {
    test('should log authentication event successfully', async () => {
      const eventId = await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'success',
        userId: 'user123',
        username: 'testuser',
        ipAddress: '192.168.1.100'
      });

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');

      const event = await mockStorage.getEventById(eventId);
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('authentication');
      expect(event!.action).toBe('login');
      expect(event!.outcome).toBe('success');
      expect(event!.actor.id).toBe('user123');
    });

    test('should log authorization event with proper context', async () => {
      const eventId = await auditLogger.logAuthorization({
        action: 'access_resource',
        resource: 'sensitive_data',
        outcome: 'success',
        userId: 'user123',
        roles: ['admin'],
        requiredPermissions: ['read'],
        grantedPermissions: ['read'],
        endpoint: '/api/data'
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('authorization');
      expect(event!.target?.name).toBe('sensitive_data');
      expect(event!.actor.roles).toContain('admin');
    });

    test('should log data access with classification', async () => {
      const eventId = await auditLogger.logDataAccess({
        action: 'read',
        dataType: 'user_records',
        classification: 'confidential',
        outcome: 'success',
        userId: 'user123',
        recordCount: 50
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('data_access');
      expect(event!.security.classification).toBe('confidential');
      expect(event!.target?.attributes.recordCount).toBe(50);
    });

    test('should log security violation with high severity', async () => {
      const eventId = await auditLogger.logSecurityViolation({
        violationType: 'unauthorized_access',
        description: 'Attempt to access restricted resource',
        severity: 'high',
        userId: 'user123',
        ipAddress: '10.0.0.1',
        endpoint: '/admin/secrets'
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('security_violation');
      expect(event!.severity).toBe('high');
      expect(event!.outcome).toBe('blocked');
    });

    test('should log Indigenous sovereignty event', async () => {
      const eventId = await auditLogger.logSovereigntyEvent({
        action: 'access_cultural_data',
        communityId: 'aboriginal_community_001',
        dataType: 'cultural_heritage',
        outcome: 'success',
        userId: 'user123',
        consentStatus: 'verified',
        culturalProtocols: ['elder_approval', 'ceremony_context']
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event).toBeDefined();
      expect(event!.eventType).toBe('sovereignty_access');
      expect(event!.security.sovereigntyContext?.involvedCommunities).toContain('aboriginal_community_001');
      expect(event!.target?.attributes.culturalProtocols).toContain('elder_approval');
    });
  });

  // === INTEGRITY PROTECTION TESTS ===

  describe('Integrity Protection', () => {
    test('should add hash to events when blockchain mode enabled', async () => {
      const eventId = await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'success',
        userId: 'user123'
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event!.integrity?.hash).toBeDefined();
      expect(event!.integrity?.sequenceNumber).toBe(1);
    });

    test('should maintain hash chain across multiple events', async () => {
      const eventIds = [];
      
      // Log multiple events
      for (let i = 0; i < 3; i++) {
        const id = await auditLogger.logAuthentication({
          action: 'login',
          outcome: 'success',
          userId: `user${i}`
        });
        eventIds.push(id);
      }

      // Verify hash chain
      const events = await Promise.all(
        eventIds.map(id => mockStorage.getEventById(id))
      );

      expect(events[0]!.integrity?.sequenceNumber).toBe(1);
      expect(events[0]!.integrity?.previousHash).toBe('');

      expect(events[1]!.integrity?.sequenceNumber).toBe(2);
      expect(events[1]!.integrity?.previousHash).toBe(events[0]!.integrity?.hash);

      expect(events[2]!.integrity?.sequenceNumber).toBe(3);
      expect(events[2]!.integrity?.previousHash).toBe(events[1]!.integrity?.hash);
    });

    test('should detect broken hash chain', async () => {
      // Log some events
      await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'success',
        userId: 'user1'
      });

      const eventId2 = await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'success',
        userId: 'user2'
      });

      // Tamper with the second event
      const event2 = await mockStorage.getEventById(eventId2);
      if (event2?.integrity) {
        event2.integrity.previousHash = 'tampered_hash';
        await mockStorage.store(event2);
      }

      // Verify integrity
      const result = await mockStorage.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Hash chain broken'));
    });
  });

  // === AUSTRALIAN COMPLIANCE TESTS ===

  describe('Australian Compliance', () => {
    test('should mark events for Australian Privacy Act compliance', async () => {
      const eventId = await auditLogger.logDataAccess({
        action: 'read',
        dataType: 'personal_information',
        classification: 'confidential',
        outcome: 'success',
        userId: 'user123'
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event!.compliance.australianPrivacyAct).toBe(true);
      expect(event!.compliance.dataResidency).toBe(true);
    });

    test('should set appropriate retention periods based on classification', async () => {
      const eventId = await auditLogger.logDataAccess({
        action: 'read',
        dataType: 'restricted_data',
        classification: 'restricted',
        outcome: 'success',
        userId: 'user123'
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event!.compliance.retentionPeriod).toBeGreaterThan(0);
    });

    test('should include ISM compliance for security violations', async () => {
      const eventId = await auditLogger.logSecurityViolation({
        violationType: 'brute_force_attack',
        description: 'Multiple failed login attempts',
        severity: 'critical',
        ipAddress: '10.0.0.1'
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event!.security.complianceFrameworks).toContain('ISM');
    });
  });

  // === INDIGENOUS SOVEREIGNTY TESTS ===

  describe('Indigenous Data Sovereignty', () => {
    test('should properly handle Indigenous community data', async () => {
      const eventId = await auditLogger.logDataAccess({
        action: 'read',
        dataType: 'indigenous_cultural_data',
        classification: 'restricted',
        outcome: 'success',
        userId: 'user123',
        communityId: 'aboriginal_community_001',
        consentVerified: true
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event!.compliance.indigenousSovereignty).toBe(true);
      expect(event!.security.sovereigntyContext?.involvedCommunities).toContain('aboriginal_community_001');
      expect(event!.security.sovereigntyContext?.consentRequired).toBe(true);
    });

    test('should apply CARE principles for Indigenous data', async () => {
      const eventId = await auditLogger.logSovereigntyEvent({
        action: 'export_cultural_data',
        communityId: 'torres_strait_community_002',
        dataType: 'traditional_knowledge',
        outcome: 'success',
        userId: 'researcher123',
        consentStatus: 'verified',
        culturalProtocols: ['community_approval'],
        elderApproval: true
      });

      const event = await mockStorage.getEventById(eventId);
      expect(event!.security.complianceFrameworks).toContain('CARE Principles');
      expect(event!.security.complianceFrameworks).toContain('FAIR Principles');
      expect(event!.metadata.elderApproval).toBe(true);
    });
  });

  // === QUERY AND SEARCH TESTS ===

  describe('Event Querying', () => {
    beforeEach(async () => {
      // Set up test data
      await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'success',
        userId: 'user1'
      });

      await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'failure',
        userId: 'user2'
      });

      await auditLogger.logDataAccess({
        action: 'read',
        dataType: 'user_data',
        classification: 'internal',
        outcome: 'success',
        userId: 'user1'
      });
    });

    test('should filter events by type', async () => {
      const events = await auditLogger.query({
        eventTypes: ['authentication']
      });

      expect(events).toHaveLength(2);
      expect(events.every(e => e.eventType === 'authentication')).toBe(true);
    });

    test('should filter events by severity', async () => {
      const events = await auditLogger.query({
        severities: ['medium']
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => e.severity === 'medium')).toBe(true);
    });

    test('should filter events by actor', async () => {
      const events = await auditLogger.query({
        actorIds: ['user1']
      });

      expect(events.length).toBe(2);
      expect(events.every(e => e.actor.id === 'user1')).toBe(true);
    });
  });

  // === REAL-TIME ALERTING TESTS ===

  describe('Real-time Alerting', () => {
    test('should trigger alert for critical events', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await auditLogger.logSecurityViolation({
        violationType: 'data_breach',
        description: 'Unauthorized data access detected',
        severity: 'critical',
        userId: 'attacker'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY ALERT'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    test('should track failed login attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Log multiple failed logins for same user
      for (let i = 0; i < 11; i++) {
        await auditLogger.logAuthentication({
          action: 'login',
          outcome: 'failure',
          userId: 'user123'
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed login threshold exceeded'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  // === STATISTICS TESTS ===

  describe('Statistics and Reporting', () => {
    beforeEach(async () => {
      // Create test events with different types and severities
      await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'success',
        userId: 'user1'
      });

      await auditLogger.logSecurityViolation({
        violationType: 'suspicious_activity',
        description: 'Unusual access pattern',
        severity: 'high',
        userId: 'user2'
      });

      await auditLogger.logDataAccess({
        action: 'read',
        dataType: 'sensitive_data',
        classification: 'confidential',
        outcome: 'success',
        userId: 'user3'
      });
    });

    test('should provide accurate event statistics', async () => {
      const stats = await auditLogger.getStatistics();

      expect(stats.totalEvents).toBe(3);
      expect(stats.eventsByType.authentication).toBe(1);
      expect(stats.eventsByType.security_violation).toBe(1);
      expect(stats.eventsByType.data_access).toBe(1);
      expect(stats.eventsBySeverity.high).toBe(1);
    });

    test('should count events by time periods', async () => {
      const stats = await auditLogger.getStatistics();

      expect(stats.eventsToday).toBeGreaterThan(0);
      expect(stats.eventsThisWeek).toBe(3);
    });
  });

  // === ARCHIVAL TESTS ===

  describe('Event Archival', () => {
    test('should archive old events correctly', async () => {
      // Create old event
      const oldEventId = await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'success',
        userId: 'user1'
      });

      // Manually set old timestamp
      const oldEvent = await mockStorage.getEventById(oldEventId);
      if (oldEvent) {
        oldEvent.timestamp = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        await mockStorage.store(oldEvent);
      }

      // Archive events older than 7 days
      const archiveDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await auditLogger.archiveEvents(archiveDate);

      expect(result.archived).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify event was archived
      const archivedEvent = await mockStorage.getEventById(oldEventId);
      expect(archivedEvent).toBeNull();
    });
  });

  // === ERROR HANDLING TESTS ===

  describe('Error Handling', () => {
    test('should handle storage failures gracefully', async () => {
      // Mock storage failure
      const failingStorage = {
        ...mockStorage,
        store: jest.fn().mockRejectedValue(new Error('Storage failure'))
      };

      const logger = new AuditLogger(config, failingStorage as any);

      await expect(
        logger.logAuthentication({
          action: 'login',
          outcome: 'success',
          userId: 'user123'
        })
      ).rejects.toThrow('Storage failure');
    });

    test('should validate required fields', async () => {
      await expect(
        auditLogger.logAuthentication({
          action: 'login',
          outcome: 'success',
          userId: '' // Invalid empty user ID
        })
      ).rejects.toThrow();
    });
  });

  // === PERFORMANCE TESTS ===

  describe('Performance', () => {
    test('should handle batch operations efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          auditLogger.logAuthentication({
            action: 'login',
            outcome: 'success',
            userId: `user${i}`
          })
        );
      }

      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      const stats = await auditLogger.getStatistics();
      expect(stats.totalEvents).toBe(100);
    });

    test('should maintain performance with large event volumes', async () => {
      // Test with high-frequency logging
      const eventCount = 1000;
      const startTime = Date.now();

      for (let i = 0; i < eventCount; i++) {
        await auditLogger.logDataAccess({
          action: 'read',
          dataType: 'test_data',
          classification: 'internal',
          outcome: 'success',
          userId: `user${i % 10}` // Simulate 10 users
        });
      }

      const duration = Date.now() - startTime;
      const eventsPerSecond = eventCount / (duration / 1000);

      console.log(`Processed ${eventCount} events in ${duration}ms (${eventsPerSecond.toFixed(2)} events/sec)`);
      
      expect(eventsPerSecond).toBeGreaterThan(50); // Minimum performance requirement
    });
  });

  // === INTEGRATION TESTS ===

  describe('Integration Scenarios', () => {
    test('should handle complete user session workflow', async () => {
      const userId = 'integration_test_user';
      const sessionId = crypto.randomUUID();

      // Login
      await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'success',
        userId,
        sessionId,
        ipAddress: '192.168.1.100'
      });

      // Access data
      await auditLogger.logDataAccess({
        action: 'read',
        dataType: 'user_profile',
        classification: 'internal',
        outcome: 'success',
        userId
      });

      // Authorization check
      await auditLogger.logAuthorization({
        action: 'access_admin_panel',
        resource: 'admin_dashboard',
        outcome: 'failure',
        userId,
        roles: ['user'],
        requiredPermissions: ['admin'],
        grantedPermissions: []
      });

      // Logout
      await auditLogger.logAuthentication({
        action: 'logout',
        outcome: 'success',
        userId,
        sessionId
      });

      // Verify all events were logged
      const userEvents = await auditLogger.query({
        actorIds: [userId]
      });

      expect(userEvents).toHaveLength(4);
      expect(userEvents.filter(e => e.eventType === 'authentication')).toHaveLength(2);
      expect(userEvents.filter(e => e.eventType === 'data_access')).toHaveLength(1);
      expect(userEvents.filter(e => e.eventType === 'authorization')).toHaveLength(1);
    });

    test('should maintain integrity across mixed operations', async () => {
      // Perform various operations
      await auditLogger.logAuthentication({
        action: 'login',
        outcome: 'success',
        userId: 'user1'
      });

      await auditLogger.logSovereigntyEvent({
        action: 'access_sacred_site_data',
        communityId: 'community1',
        dataType: 'ceremonial_knowledge',
        outcome: 'success',
        userId: 'user1',
        consentStatus: 'verified',
        culturalProtocols: ['elder_approval']
      });

      await auditLogger.logSecurityViolation({
        violationType: 'unauthorized_access_attempt',
        description: 'Failed to access restricted area',
        severity: 'medium',
        userId: 'user2'
      });

      // Verify integrity of all events
      const integrityResult = await auditLogger.verifyIntegrity();
      expect(integrityResult.valid).toBe(true);
      expect(integrityResult.errors).toHaveLength(1); // Success message
    });
  });
});