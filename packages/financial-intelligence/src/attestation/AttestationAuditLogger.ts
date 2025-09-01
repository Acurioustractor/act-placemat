/**
 * Attestation Audit Logger
 * 
 * Comprehensive audit logging for all attestation and signing operations
 * with tamper-evident records and cultural sensitivity tracking
 */

import crypto from 'crypto';
import {
  AttestationEventPayload,
  AttestationEvent,
  StoredAttestation,
  SigningResult,
  VerificationResult,
  RevocationInfo,
  EventHandler
} from './types';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  eventType: AttestationEvent;
  attestationId: string;
  userId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  operation: string;
  operationDetails: OperationDetails;
  result: 'success' | 'failure' | 'warning';
  errorMessage?: string;
  culturalSensitive: boolean;
  complianceFrameworks: string[];
  integrityHash: string;
  previousEntryHash?: string;
  retentionPeriod: number;
  metadata: Record<string, any>;
}

export interface OperationDetails {
  operationType: 'create' | 'sign' | 'verify' | 'revoke' | 'export' | 'query' | 'bulk';
  resourceType: 'attestation' | 'signature' | 'key' | 'certificate';
  resourceId: string;
  beforeState?: any;
  afterState?: any;
  changesSummary?: string[];
  performanceMetrics?: {
    executionTime: number;
    memoryUsage?: number;
    cryptoOperations?: number;
  };
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AttestationEvent[];
  attestationIds?: string[];
  userIds?: string[];
  culturalSensitive?: boolean;
  complianceFrameworks?: string[];
  operationTypes?: string[];
  result?: 'success' | 'failure' | 'warning';
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'eventType' | 'userId';
  orderDirection?: 'asc' | 'desc';
}

export interface AuditReport {
  reportId: string;
  generatedAt: Date;
  generatedBy: string;
  period: { start: Date; end: Date };
  summary: {
    totalEvents: number;
    successfulOperations: number;
    failedOperations: number;
    culturalDataOperations: number;
    uniqueUsers: number;
    uniqueAttestations: number;
  };
  eventDistribution: Array<{
    eventType: AttestationEvent;
    count: number;
    percentage: number;
  }>;
  complianceMetrics: Array<{
    framework: string;
    operationsCount: number;
    complianceScore: number;
    violations: number;
  }>;
  culturalMetrics: {
    totalCulturalOperations: number;
    elderApprovals: number;
    communityConsents: number;
    protocolViolations: number;
    territoryDistribution: Array<{
      territory: string;
      operationsCount: number;
    }>;
  };
  securityMetrics: {
    integrityViolations: number;
    unauthorizedAccess: number;
    cryptographicFailures: number;
    suspiciousActivities: string[];
  };
  recommendations: string[];
}

export interface AttestationAuditLogger {
  logEvent(event: AttestationEventPayload, context: AuditContext): Promise<void>;
  logSigningOperation(attestation: StoredAttestation, result: SigningResult, context: AuditContext): Promise<void>;
  logVerificationOperation(attestationId: string, result: VerificationResult, context: AuditContext): Promise<void>;
  logRevocationOperation(attestationId: string, revocation: RevocationInfo, context: AuditContext): Promise<void>;
  queryAuditTrail(query: AuditQuery): Promise<AuditEntry[]>;
  generateReport(period: { start: Date; end: Date }, generatedBy: string): Promise<AuditReport>;
  validateIntegrity(entries?: AuditEntry[]): Promise<IntegrityValidationResult>;
  exportAuditData(query: AuditQuery, format: 'json' | 'csv' | 'xml'): Promise<string>;
}

export interface AuditContext {
  userId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  culturalContext?: {
    traditionalTerritory?: string;
    elderApproval?: boolean;
    communityConsent?: boolean;
  };
  performanceMetrics?: {
    startTime: number;
    memoryUsage?: number;
  };
}

export interface IntegrityValidationResult {
  valid: boolean;
  totalEntries: number;
  validEntries: number;
  corruptedEntries: string[];
  missingEntries: string[];
  chainBreaks: Array<{
    entryId: string;
    expectedPreviousHash: string;
    actualPreviousHash: string;
  }>;
}

export interface AuditStorage {
  store(entry: AuditEntry): Promise<void>;
  query(criteria: AuditQuery): Promise<AuditEntry[]>;
  getLatestEntry(): Promise<AuditEntry | null>;
  validateChain(entries: AuditEntry[]): Promise<boolean>;
  purgeExpiredEntries(cutoffDate: Date): Promise<number>;
}

export class AttestationAuditLoggerImpl implements AttestationAuditLogger, EventHandler {
  private storage: AuditStorage;
  private integrityKey: Buffer;
  private lastEntryHash?: string;

  constructor(storage: AuditStorage, integrityKey: string) {
    this.storage = storage;
    this.integrityKey = Buffer.from(integrityKey, 'hex');
    
    if (this.integrityKey.length !== 32) {
      throw new Error('Integrity key must be 32 bytes (64 hex characters)');
    }

    this.initializeChain();
  }

  async handleEvent(event: AttestationEventPayload): Promise<void> {
    const context: AuditContext = {
      userId: event.triggeredBy,
      culturalContext: event.culturalContext ? {
        traditionalTerritory: event.culturalContext.traditionalTerritory,
        elderApproval: !!event.culturalContext.elderId,
        communityConsent: !!event.culturalContext.communityId
      } : undefined
    };

    await this.logEvent(event, context);
  }

  async logEvent(event: AttestationEventPayload, context: AuditContext): Promise<void> {
    const entryId = crypto.randomUUID();
    const timestamp = new Date();

    const operationDetails: OperationDetails = {
      operationType: this.mapEventToOperationType(event.eventType),
      resourceType: 'attestation',
      resourceId: event.attestationId,
      changesSummary: this.extractChangesSummary(event),
      performanceMetrics: context.performanceMetrics ? {
        executionTime: Date.now() - context.performanceMetrics.startTime,
        memoryUsage: context.performanceMetrics.memoryUsage
      } : undefined
    };

    const auditEntry: AuditEntry = {
      id: entryId,
      timestamp,
      eventType: event.eventType,
      attestationId: event.attestationId,
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      operation: event.eventType,
      operationDetails,
      result: this.determineResult(event),
      culturalSensitive: !!event.culturalContext,
      complianceFrameworks: this.extractComplianceFrameworks(event),
      integrityHash: '', // Will be calculated
      previousEntryHash: this.lastEntryHash,
      retentionPeriod: this.calculateRetentionPeriod(event),
      metadata: {
        ...event.metadata,
        culturalTerritory: event.culturalContext?.traditionalTerritory,
        elderApproval: event.culturalContext?.elderId,
        communityId: event.culturalContext?.communityId
      }
    };

    // Calculate integrity hash
    auditEntry.integrityHash = this.calculateIntegrityHash(auditEntry);
    this.lastEntryHash = auditEntry.integrityHash;

    await this.storage.store(auditEntry);
  }

  async logSigningOperation(
    attestation: StoredAttestation,
    result: SigningResult,
    context: AuditContext
  ): Promise<void> {
    const event: AttestationEventPayload = {
      eventType: AttestationEvent.SIGNED,
      attestationId: result.attestationId,
      timestamp: new Date(),
      triggeredBy: context.userId,
      metadata: {
        algorithm: result.signature.algorithm,
        keyId: result.signature.keyId,
        success: result.success,
        culturalClearance: !!result.culturalClearance,
        errors: result.errors,
        warnings: result.warnings
      },
      culturalContext: attestation.culturalProtocols?.[0]
    };

    await this.logEvent(event, context);
  }

  async logVerificationOperation(
    attestationId: string,
    result: VerificationResult,
    context: AuditContext
  ): Promise<void> {
    const event: AttestationEventPayload = {
      eventType: AttestationEvent.VERIFIED,
      attestationId,
      timestamp: new Date(),
      triggeredBy: context.userId,
      metadata: {
        valid: result.valid,
        verificationId: result.verificationId,
        trustLevel: result.trustLevel,
        overallScore: result.overallScore,
        checksPerformed: result.checks.length,
        checksPass: result.checks.filter(c => c.passed).length,
        culturalCompliance: result.culturalCompliance.compliant,
        careScore: result.culturalCompliance.careScore
      }
    };

    await this.logEvent(event, context);
  }

  async logRevocationOperation(
    attestationId: string,
    revocation: RevocationInfo,
    context: AuditContext
  ): Promise<void> {
    const event: AttestationEventPayload = {
      eventType: AttestationEvent.REVOKED,
      attestationId,
      timestamp: new Date(),
      triggeredBy: context.userId,
      metadata: {
        reason: revocation.reason,
        description: revocation.description,
        culturalReason: revocation.culturalReason,
        elderApproval: revocation.elderApproval,
        cascadeRevocation: revocation.cascadeRevocation,
        effectiveDate: revocation.effectiveDate,
        replacementId: revocation.replacementAttestationId
      }
    };

    await this.logEvent(event, context);
  }

  async queryAuditTrail(query: AuditQuery): Promise<AuditEntry[]> {
    return this.storage.query(query);
  }

  async generateReport(period: { start: Date; end: Date }, generatedBy: string): Promise<AuditReport> {
    const reportId = crypto.randomUUID();
    const generatedAt = new Date();

    // Query all events in the period
    const events = await this.queryAuditTrail({
      startDate: period.start,
      endDate: period.end,
      limit: 10000 // Large limit for comprehensive reporting
    });

    // Calculate summary metrics
    const summary = {
      totalEvents: events.length,
      successfulOperations: events.filter(e => e.result === 'success').length,
      failedOperations: events.filter(e => e.result === 'failure').length,
      culturalDataOperations: events.filter(e => e.culturalSensitive).length,
      uniqueUsers: new Set(events.map(e => e.userId)).size,
      uniqueAttestations: new Set(events.map(e => e.attestationId)).size
    };

    // Event distribution
    const eventCounts = new Map<AttestationEvent, number>();
    events.forEach(e => {
      eventCounts.set(e.eventType, (eventCounts.get(e.eventType) || 0) + 1);
    });

    const eventDistribution = Array.from(eventCounts.entries()).map(([eventType, count]) => ({
      eventType,
      count,
      percentage: (count / events.length) * 100
    }));

    // Compliance metrics
    const complianceFrameworks = new Map<string, { operations: number; violations: number }>();
    events.forEach(e => {
      e.complianceFrameworks.forEach(framework => {
        if (!complianceFrameworks.has(framework)) {
          complianceFrameworks.set(framework, { operations: 0, violations: 0 });
        }
        const metrics = complianceFrameworks.get(framework)!;
        metrics.operations++;
        if (e.result === 'failure') {
          metrics.violations++;
        }
      });
    });

    const complianceMetrics = Array.from(complianceFrameworks.entries()).map(([framework, metrics]) => ({
      framework,
      operationsCount: metrics.operations,
      complianceScore: 1 - (metrics.violations / metrics.operations),
      violations: metrics.violations
    }));

    // Cultural metrics
    const culturalEvents = events.filter(e => e.culturalSensitive);
    const elderApprovals = culturalEvents.filter(e => e.metadata.elderApproval).length;
    const communityConsents = culturalEvents.filter(e => e.metadata.communityId).length;
    const protocolViolations = culturalEvents.filter(e => e.result === 'failure').length;

    const territoryDistribution = new Map<string, number>();
    culturalEvents.forEach(e => {
      const territory = e.metadata.culturalTerritory;
      if (territory) {
        territoryDistribution.set(territory, (territoryDistribution.get(territory) || 0) + 1);
      }
    });

    const culturalMetrics = {
      totalCulturalOperations: culturalEvents.length,
      elderApprovals,
      communityConsents,
      protocolViolations,
      territoryDistribution: Array.from(territoryDistribution.entries()).map(([territory, count]) => ({
        territory,
        operationsCount: count
      }))
    };

    // Security metrics
    const integrityResult = await this.validateIntegrity(events);
    const securityMetrics = {
      integrityViolations: integrityResult.corruptedEntries.length,
      unauthorizedAccess: events.filter(e => 
        e.result === 'failure' && e.errorMessage?.includes('unauthorized')
      ).length,
      cryptographicFailures: events.filter(e => 
        e.result === 'failure' && e.errorMessage?.includes('cryptographic')
      ).length,
      suspiciousActivities: this.detectSuspiciousActivities(events)
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, complianceMetrics, culturalMetrics, securityMetrics);

    return {
      reportId,
      generatedAt,
      generatedBy,
      period,
      summary,
      eventDistribution,
      complianceMetrics,
      culturalMetrics,
      securityMetrics,
      recommendations
    };
  }

  async validateIntegrity(entries?: AuditEntry[]): Promise<IntegrityValidationResult> {
    const entriesToValidate = entries || await this.queryAuditTrail({ limit: 10000 });
    
    // Sort by timestamp to check chain integrity
    entriesToValidate.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const corruptedEntries: string[] = [];
    const chainBreaks: IntegrityValidationResult['chainBreaks'] = [];
    let validEntries = 0;

    for (let i = 0; i < entriesToValidate.length; i++) {
      const entry = entriesToValidate[i];
      
      // Validate individual entry integrity
      const expectedHash = this.calculateIntegrityHash({
        ...entry,
        integrityHash: '' // Exclude hash from calculation
      });

      if (entry.integrityHash !== expectedHash) {
        corruptedEntries.push(entry.id);
      } else {
        validEntries++;
      }

      // Validate chain integrity
      if (i > 0) {
        const previousEntry = entriesToValidate[i - 1];
        if (entry.previousEntryHash !== previousEntry.integrityHash) {
          chainBreaks.push({
            entryId: entry.id,
            expectedPreviousHash: previousEntry.integrityHash,
            actualPreviousHash: entry.previousEntryHash || 'null'
          });
        }
      }
    }

    return {
      valid: corruptedEntries.length === 0 && chainBreaks.length === 0,
      totalEntries: entriesToValidate.length,
      validEntries,
      corruptedEntries,
      missingEntries: [], // Would implement sequence detection
      chainBreaks
    };
  }

  async exportAuditData(query: AuditQuery, format: 'json' | 'csv' | 'xml'): Promise<string> {
    const entries = await this.queryAuditTrail(query);

    switch (format) {
      case 'json':
        return JSON.stringify({
          exportMetadata: {
            generatedAt: new Date().toISOString(),
            totalEntries: entries.length,
            query
          },
          entries
        }, null, 2);

      case 'csv':
        return this.exportAsCSV(entries);

      case 'xml':
        return this.exportAsXML(entries);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Private helper methods

  private async initializeChain(): Promise<void> {
    const lastEntry = await this.storage.getLatestEntry();
    this.lastEntryHash = lastEntry?.integrityHash;
  }

  private calculateIntegrityHash(entry: Omit<AuditEntry, 'integrityHash'>): string {
    const signingData = {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      eventType: entry.eventType,
      attestationId: entry.attestationId,
      userId: entry.userId,
      operation: entry.operation,
      result: entry.result,
      previousEntryHash: entry.previousEntryHash
    };

    const dataString = JSON.stringify(signingData, Object.keys(signingData).sort());
    
    return crypto
      .createHmac('sha256', this.integrityKey)
      .update(dataString)
      .digest('hex');
  }

  private mapEventToOperationType(eventType: AttestationEvent): OperationDetails['operationType'] {
    switch (eventType) {
      case AttestationEvent.CREATED:
        return 'create';
      case AttestationEvent.SIGNED:
        return 'sign';
      case AttestationEvent.VERIFIED:
        return 'verify';
      case AttestationEvent.REVOKED:
      case AttestationEvent.EXPIRED:
        return 'revoke';
      case AttestationEvent.BULK_OPERATION_COMPLETED:
        return 'bulk';
      default:
        return 'query';
    }
  }

  private extractChangesSummary(event: AttestationEventPayload): string[] {
    const changes: string[] = [];
    
    switch (event.eventType) {
      case AttestationEvent.CREATED:
        changes.push('Attestation created');
        break;
      case AttestationEvent.SIGNED:
        changes.push('Digital signature applied');
        if (event.metadata.culturalClearance) {
          changes.push('Cultural clearance granted');
        }
        break;
      case AttestationEvent.VERIFIED:
        changes.push(`Verification completed (${event.metadata.valid ? 'valid' : 'invalid'})`);
        break;
      case AttestationEvent.REVOKED:
        changes.push(`Attestation revoked (${event.metadata.reason})`);
        break;
    }

    return changes;
  }

  private determineResult(event: AttestationEventPayload): 'success' | 'failure' | 'warning' {
    if (event.metadata.errors && event.metadata.errors.length > 0) {
      return 'failure';
    }
    if (event.metadata.warnings && event.metadata.warnings.length > 0) {
      return 'warning';
    }
    return 'success';
  }

  private extractComplianceFrameworks(event: AttestationEventPayload): string[] {
    const frameworks: string[] = [];
    
    if (event.culturalContext) {
      frameworks.push('care_principles');
    }
    
    frameworks.push('privacy_act_1988'); // Default for all attestations
    
    return frameworks;
  }

  private calculateRetentionPeriod(event: AttestationEventPayload): number {
    // 50 years for cultural data, 7 years for other data
    return event.culturalContext ? 
      50 * 365 * 24 * 60 * 60 * 1000 :
      7 * 365 * 24 * 60 * 60 * 1000;
  }

  private detectSuspiciousActivities(events: AuditEntry[]): string[] {
    const suspicious: string[] = [];

    // Detect rapid successive failures from same user
    const userFailures = new Map<string, number>();
    events.filter(e => e.result === 'failure').forEach(e => {
      userFailures.set(e.userId, (userFailures.get(e.userId) || 0) + 1);
    });

    userFailures.forEach((count, userId) => {
      if (count > 10) {
        suspicious.push(`User ${userId} has ${count} failed operations`);
      }
    });

    // Detect unusual access patterns
    const culturalAccess = events.filter(e => e.culturalSensitive && !e.metadata.elderApproval);
    if (culturalAccess.length > 0) {
      suspicious.push(`${culturalAccess.length} cultural data accesses without Elder approval`);
    }

    return suspicious;
  }

  private generateRecommendations(
    summary: AuditReport['summary'],
    complianceMetrics: AuditReport['complianceMetrics'],
    culturalMetrics: AuditReport['culturalMetrics'],
    securityMetrics: AuditReport['securityMetrics']
  ): string[] {
    const recommendations: string[] = [];

    // Failure rate recommendations
    const failureRate = summary.failedOperations / summary.totalEvents;
    if (failureRate > 0.1) {
      recommendations.push('High failure rate detected - review system reliability and user training');
    }

    // Compliance recommendations
    const lowComplianceFrameworks = complianceMetrics.filter(m => m.complianceScore < 0.8);
    if (lowComplianceFrameworks.length > 0) {
      recommendations.push(`Improve compliance for: ${lowComplianceFrameworks.map(f => f.framework).join(', ')}`);
    }

    // Cultural recommendations
    if (culturalMetrics.protocolViolations > 0) {
      recommendations.push('Review cultural protocols and provide additional training on CARE Principles');
    }

    if (culturalMetrics.elderApprovals / culturalMetrics.totalCulturalOperations < 0.5) {
      recommendations.push('Increase Elder engagement in cultural data governance');
    }

    // Security recommendations
    if (securityMetrics.integrityViolations > 0) {
      recommendations.push('CRITICAL: Investigate integrity violations immediately');
    }

    if (securityMetrics.cryptographicFailures > 0) {
      recommendations.push('Review cryptographic key management and signature processes');
    }

    return recommendations;
  }

  private exportAsCSV(entries: AuditEntry[]): string {
    const headers = [
      'id', 'timestamp', 'eventType', 'attestationId', 'userId',
      'operation', 'result', 'culturalSensitive', 'complianceFrameworks'
    ];

    const csvRows = [headers.join(',')];
    
    for (const entry of entries) {
      const row = [
        entry.id,
        entry.timestamp.toISOString(),
        entry.eventType,
        entry.attestationId,
        entry.userId,
        entry.operation,
        entry.result,
        entry.culturalSensitive.toString(),
        entry.complianceFrameworks.join(';')
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    }

    return csvRows.join('\n');
  }

  private exportAsXML(entries: AuditEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<auditTrail>\n';
    xml += '  <metadata>\n';
    xml += `    <generatedAt>${new Date().toISOString()}</generatedAt>\n`;
    xml += `    <totalEntries>${entries.length}</totalEntries>\n`;
    xml += '  </metadata>\n';
    xml += '  <entries>\n';

    for (const entry of entries) {
      xml += '    <entry>\n';
      xml += `      <id>${entry.id}</id>\n`;
      xml += `      <timestamp>${entry.timestamp.toISOString()}</timestamp>\n`;
      xml += `      <eventType>${entry.eventType}</eventType>\n`;
      xml += `      <attestationId>${entry.attestationId}</attestationId>\n`;
      xml += `      <userId>${entry.userId}</userId>\n`;
      xml += `      <result>${entry.result}</result>\n`;
      xml += `      <culturalSensitive>${entry.culturalSensitive}</culturalSensitive>\n`;
      xml += '    </entry>\n';
    }

    xml += '  </entries>\n';
    xml += '</auditTrail>';

    return xml;
  }
}

// In-memory audit storage implementation for development/testing
export class InMemoryAuditStorage implements AuditStorage {
  private entries: AuditEntry[] = [];

  async store(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
    // Keep only the latest 10000 entries to prevent memory overflow
    if (this.entries.length > 10000) {
      this.entries = this.entries.slice(-10000);
    }
  }

  async query(criteria: AuditQuery): Promise<AuditEntry[]> {
    let filtered = [...this.entries];

    if (criteria.startDate) {
      filtered = filtered.filter(e => e.timestamp >= criteria.startDate!);
    }
    if (criteria.endDate) {
      filtered = filtered.filter(e => e.timestamp <= criteria.endDate!);
    }
    if (criteria.eventTypes) {
      filtered = filtered.filter(e => criteria.eventTypes!.includes(e.eventType));
    }
    if (criteria.attestationIds) {
      filtered = filtered.filter(e => criteria.attestationIds!.includes(e.attestationId));
    }
    if (criteria.userIds) {
      filtered = filtered.filter(e => criteria.userIds!.includes(e.userId));
    }
    if (criteria.culturalSensitive !== undefined) {
      filtered = filtered.filter(e => e.culturalSensitive === criteria.culturalSensitive);
    }
    if (criteria.result) {
      filtered = filtered.filter(e => e.result === criteria.result);
    }

    // Sort
    const orderBy = criteria.orderBy || 'timestamp';
    const orderDirection = criteria.orderDirection || 'desc';
    
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (orderBy) {
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'eventType':
          comparison = a.eventType.localeCompare(b.eventType);
          break;
        case 'userId':
          comparison = a.userId.localeCompare(b.userId);
          break;
      }
      return orderDirection === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const offset = criteria.offset || 0;
    const limit = criteria.limit || 100;
    
    return filtered.slice(offset, offset + limit);
  }

  async getLatestEntry(): Promise<AuditEntry | null> {
    if (this.entries.length === 0) {
      return null;
    }
    return this.entries[this.entries.length - 1];
  }

  async validateChain(entries: AuditEntry[]): Promise<boolean> {
    // Simple chain validation
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].previousEntryHash !== entries[i - 1].integrityHash) {
        return false;
      }
    }
    return true;
  }

  async purgeExpiredEntries(cutoffDate: Date): Promise<number> {
    const initialLength = this.entries.length;
    this.entries = this.entries.filter(e => e.timestamp > cutoffDate);
    return initialLength - this.entries.length;
  }
}