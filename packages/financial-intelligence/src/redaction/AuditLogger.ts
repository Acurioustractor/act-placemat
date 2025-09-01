/**
 * Audit Logger
 * 
 * Comprehensive audit logging for redaction and transformation operations
 * with tamper-evident storage and cultural sensitivity tracking
 */

import crypto from 'crypto';
import {
  AuditEntry,
  RedactionResult,
  TransformationResult,
  ReversalResult,
  RedactionContext,
  ReversalRequest,
  AuditCriteria
} from './types';

export interface AuditLogger {
  logRedaction(result: RedactionResult, context: RedactionContext, dataIdentifier: string): Promise<AuditEntry>;
  logTransformation(result: TransformationResult, context: RedactionContext, dataIdentifier: string): Promise<AuditEntry>;
  logReversal(result: ReversalResult, request: ReversalRequest): Promise<AuditEntry>;
  logAdminAction(action: AdminAction): Promise<AuditEntry>;
  queryAuditTrail(criteria: AuditCriteria): Promise<AuditEntry[]>;
  exportAuditData(request: AuditExportRequest): Promise<AuditExportResult>;
  validateIntegrity(entries: AuditEntry[]): Promise<IntegrityValidationResult>;
}

export interface AdminAction {
  adminUserId: string;
  action: string;
  resource: string;
  resourceId: string;
  previousState?: any;
  newState?: any;
  culturalSensitive: boolean;
  ipAddress?: string;
  userAgent?: string;
  justification?: string;
}

export interface AuditExportRequest {
  format: 'json' | 'csv' | 'pdf' | 'xml';
  filters: AuditCriteria;
  includeCulturalData: boolean;
  includePersonalData: boolean;
  adminUserId: string;
  encryptionRequired?: boolean;
}

export interface AuditExportResult {
  success: boolean;
  exportId: string;
  format: string;
  data?: string | Buffer;
  downloadUrl?: string;
  metadata: {
    totalEntries: number;
    culturalEntries: number;
    dateRange: { start: Date; end: Date };
    exportedBy: string;
    exportedAt: Date;
    checksums: {
      sha256: string;
      integrity: string;
    };
  };
  errors?: string[];
}

export interface IntegrityValidationResult {
  valid: boolean;
  totalEntries: number;
  validEntries: number;
  tamperedEntries: string[];
  missingEntries: string[];
  issues: Array<{
    entryId: string;
    type: 'tampered' | 'missing' | 'corrupted';
    description: string;
  }>;
}

export class AuditLoggerImpl implements AuditLogger {
  private storage: AuditStorage;
  private integrityKey: Buffer;
  private encryptionKey: Buffer;

  constructor(
    storage: AuditStorage,
    integrityKey: string,
    encryptionKey: string
  ) {
    this.storage = storage;
    this.integrityKey = Buffer.from(integrityKey, 'hex');
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');

    if (this.integrityKey.length !== 32) {
      throw new Error('Integrity key must be 32 bytes (64 hex characters)');
    }
    if (this.encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }
  }

  async logRedaction(
    result: RedactionResult,
    context: RedactionContext,
    dataIdentifier: string
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      operation: 'redaction',
      ruleId: result.ruleId,
      dataIdentifier,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      timestamp: new Date(),
      success: result.success,
      culturalSensitive: result.metadata.culturalSensitive,
      complianceFrameworks: result.metadata.complianceFrameworks,
      retentionPeriod: this.calculateRetentionPeriod(result.metadata.culturalSensitive, context),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      errorDetails: result.errors?.join('; '),
      reversalPossible: result.reversible
    };

    return this.storeAuditEntry(entry);
  }

  async logTransformation(
    result: TransformationResult,
    context: RedactionContext,
    dataIdentifier: string
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      operation: 'transformation',
      ruleId: result.ruleId,
      dataIdentifier,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      timestamp: new Date(),
      success: result.success,
      culturalSensitive: result.metadata.culturalProtections.length > 0,
      complianceFrameworks: this.extractComplianceFrameworks(result.metadata.culturalProtections),
      retentionPeriod: this.calculateRetentionPeriod(
        result.metadata.culturalProtections.length > 0,
        context
      ),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      errorDetails: result.errors?.join('; '),
      reversalPossible: result.reversible
    };

    return this.storeAuditEntry(entry);
  }

  async logReversal(
    result: ReversalResult,
    request: ReversalRequest
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      operation: 'reversal',
      ruleId: result.transformationId,
      dataIdentifier: result.transformationId, // Use transformation ID as identifier
      userId: request.userId,
      sessionId: request.auditContext.sessionId,
      requestId: request.auditContext.requestId,
      timestamp: new Date(),
      success: result.success,
      culturalSensitive: !!request.culturalApproval,
      complianceFrameworks: request.complianceApproval 
        ? [request.complianceApproval.framework]
        : ['data_reversal'],
      retentionPeriod: 50 * 365 * 24 * 60 * 60 * 1000, // 50 years for reversals
      ipAddress: request.auditContext.ipAddress,
      userAgent: request.auditContext.userAgent,
      errorDetails: result.errors?.join('; '),
      reversalPossible: false,
      reversalRequested: new Date(),
      reversalBy: request.userId
    };

    return this.storeAuditEntry(entry);
  }

  async logAdminAction(action: AdminAction): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      operation: 'redaction', // Admin actions logged as redaction type
      ruleId: `admin-${action.action}`,
      dataIdentifier: this.generateDataIdentifier(action.resourceId),
      userId: action.adminUserId,
      sessionId: crypto.randomUUID(), // Generate session ID for admin action
      requestId: crypto.randomUUID(), // Generate request ID for admin action
      timestamp: new Date(),
      success: true,
      culturalSensitive: action.culturalSensitive,
      complianceFrameworks: ['admin_governance'],
      retentionPeriod: action.culturalSensitive 
        ? 50 * 365 * 24 * 60 * 60 * 1000 // 50 years for cultural data
        : 7 * 365 * 24 * 60 * 60 * 1000,  // 7 years for admin actions
      ipAddress: action.ipAddress,
      userAgent: action.userAgent,
      reversalPossible: false
    };

    // Add admin-specific metadata
    const adminMetadata = {
      action: action.action,
      resource: action.resource,
      resourceId: action.resourceId,
      previousState: action.previousState ? this.hashSensitiveData(action.previousState) : undefined,
      newState: action.newState ? this.hashSensitiveData(action.newState) : undefined,
      justification: action.justification
    };

    return this.storeAuditEntry(entry, adminMetadata);
  }

  async queryAuditTrail(criteria: AuditCriteria): Promise<AuditEntry[]> {
    try {
      const entries = await this.storage.query(criteria);
      
      // Validate integrity of returned entries
      const integrityResult = await this.validateIntegrity(entries);
      if (!integrityResult.valid) {
        throw new Error(`Audit trail integrity violation: ${integrityResult.issues.length} issues found`);
      }

      return entries;
    } catch (error) {
      console.error('Audit trail query failed:', error);
      throw new Error('Failed to query audit trail');
    }
  }

  async exportAuditData(request: AuditExportRequest): Promise<AuditExportResult> {
    try {
      const entries = await this.queryAuditTrail(request.filters);
      
      // Filter based on data sensitivity requirements
      const filteredEntries = this.filterEntriesForExport(entries, request);
      
      const exportId = crypto.randomUUID();
      const exportedAt = new Date();
      
      let data: string | Buffer;
      
      switch (request.format) {
        case 'json':
          data = this.exportAsJSON(filteredEntries);
          break;
        case 'csv':
          data = this.exportAsCSV(filteredEntries);
          break;
        case 'pdf':
          data = await this.exportAsPDF(filteredEntries, request);
          break;
        case 'xml':
          data = this.exportAsXML(filteredEntries);
          break;
        default:
          throw new Error(`Unsupported export format: ${request.format}`);
      }

      // Encrypt if required
      if (request.encryptionRequired) {
        data = this.encryptExportData(data);
      }

      // Calculate checksums
      const checksums = this.calculateChecksums(data);
      
      const dateRange = this.calculateDateRange(filteredEntries);

      const result: AuditExportResult = {
        success: true,
        exportId,
        format: request.format,
        data,
        metadata: {
          totalEntries: filteredEntries.length,
          culturalEntries: filteredEntries.filter(e => e.culturalSensitive).length,
          dateRange,
          exportedBy: request.adminUserId,
          exportedAt,
          checksums
        }
      };

      // Log the export action
      await this.logAdminAction({
        adminUserId: request.adminUserId,
        action: 'audit_export',
        resource: 'audit_entries',
        resourceId: exportId,
        culturalSensitive: request.includeCulturalData,
        justification: `Audit data export in ${request.format} format`
      });

      return result;

    } catch (error) {
      return {
        success: false,
        exportId: crypto.randomUUID(),
        format: request.format,
        metadata: {
          totalEntries: 0,
          culturalEntries: 0,
          dateRange: { start: new Date(), end: new Date() },
          exportedBy: request.adminUserId,
          exportedAt: new Date(),
          checksums: { sha256: '', integrity: '' }
        },
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  async validateIntegrity(entries: AuditEntry[]): Promise<IntegrityValidationResult> {
    const issues: Array<{
      entryId: string;
      type: 'tampered' | 'missing' | 'corrupted';
      description: string;
    }> = [];

    let validEntries = 0;
    const tamperedEntries: string[] = [];

    for (const entry of entries) {
      try {
        const isValid = await this.verifyEntryIntegrity(entry);
        if (isValid) {
          validEntries++;
        } else {
          tamperedEntries.push(entry.id);
          issues.push({
            entryId: entry.id,
            type: 'tampered',
            description: 'Entry integrity hash verification failed'
          });
        }
      } catch (error) {
        issues.push({
          entryId: entry.id,
          type: 'corrupted',
          description: error instanceof Error ? error.message : 'Entry is corrupted'
        });
      }
    }

    // Check for sequence gaps (missing entries)
    const missingEntries = await this.detectMissingEntries(entries);
    for (const missingId of missingEntries) {
      issues.push({
        entryId: missingId,
        type: 'missing',
        description: 'Entry missing from audit trail sequence'
      });
    }

    return {
      valid: issues.length === 0,
      totalEntries: entries.length,
      validEntries,
      tamperedEntries,
      missingEntries,
      issues
    };
  }

  // Private helper methods

  private async storeAuditEntry(entry: AuditEntry, metadata?: any): Promise<AuditEntry> {
    // Generate integrity hash
    const integrityHash = this.generateIntegrityHash(entry);
    
    // Add integrity metadata
    const enhancedEntry = {
      ...entry,
      _integrity: {
        hash: integrityHash,
        algorithm: 'HMAC-SHA256',
        timestamp: entry.timestamp
      },
      _metadata: metadata
    };

    // Store in audit storage
    await this.storage.store(enhancedEntry);
    
    return entry;
  }

  private generateIntegrityHash(entry: AuditEntry): string {
    const entryString = JSON.stringify({
      id: entry.id,
      operation: entry.operation,
      ruleId: entry.ruleId,
      dataIdentifier: entry.dataIdentifier,
      userId: entry.userId,
      timestamp: entry.timestamp.toISOString(),
      success: entry.success
    });

    return crypto
      .createHmac('sha256', this.integrityKey)
      .update(entryString)
      .digest('hex');
  }

  private async verifyEntryIntegrity(entry: any): Promise<boolean> {
    if (!entry._integrity) {
      return false; // No integrity metadata
    }

    const expectedHash = this.generateIntegrityHash(entry);
    return expectedHash === entry._integrity.hash;
  }

  private async detectMissingEntries(entries: AuditEntry[]): Promise<string[]> {
    // This would implement sequence detection logic
    // For now, return empty array
    return [];
  }

  private calculateRetentionPeriod(culturalSensitive: boolean, context: RedactionContext): number {
    if (culturalSensitive) {
      return 50 * 365 * 24 * 60 * 60 * 1000; // 50 years for Indigenous data
    }
    
    return context.complianceContext.retentionPeriod;
  }

  private extractComplianceFrameworks(culturalProtections: any[]): string[] {
    if (culturalProtections.length > 0) {
      return ['care_principles', 'privacy_act_1988'];
    }
    return ['privacy_act_1988'];
  }

  private generateDataIdentifier(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private hashSensitiveData(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private filterEntriesForExport(entries: AuditEntry[], request: AuditExportRequest): AuditEntry[] {
    return entries.filter(entry => {
      if (!request.includeCulturalData && entry.culturalSensitive) {
        return false;
      }
      return true;
    });
  }

  private exportAsJSON(entries: AuditEntry[]): string {
    return JSON.stringify({
      exportMetadata: {
        generatedAt: new Date().toISOString(),
        totalEntries: entries.length
      },
      entries
    }, null, 2);
  }

  private exportAsCSV(entries: AuditEntry[]): string {
    const headers = [
      'id', 'operation', 'ruleId', 'dataIdentifier', 'userId', 
      'timestamp', 'success', 'culturalSensitive', 'complianceFrameworks'
    ];

    const csvRows = [headers.join(',')];
    
    for (const entry of entries) {
      const row = [
        entry.id,
        entry.operation,
        entry.ruleId,
        entry.dataIdentifier,
        entry.userId,
        entry.timestamp.toISOString(),
        entry.success.toString(),
        entry.culturalSensitive.toString(),
        entry.complianceFrameworks.join(';')
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    }

    return csvRows.join('\n');
  }

  private async exportAsPDF(entries: AuditEntry[], request: AuditExportRequest): Promise<Buffer> {
    // This would use a PDF library like jsPDF or PDFKit
    // For now, return a simple buffer with JSON data
    const jsonData = this.exportAsJSON(entries);
    return Buffer.from(jsonData, 'utf8');
  }

  private exportAsXML(entries: AuditEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<auditTrail>\n';
    xml += `  <metadata>\n`;
    xml += `    <generatedAt>${new Date().toISOString()}</generatedAt>\n`;
    xml += `    <totalEntries>${entries.length}</totalEntries>\n`;
    xml += `  </metadata>\n`;
    xml += '  <entries>\n';

    for (const entry of entries) {
      xml += '    <entry>\n';
      xml += `      <id>${entry.id}</id>\n`;
      xml += `      <operation>${entry.operation}</operation>\n`;
      xml += `      <ruleId>${entry.ruleId}</ruleId>\n`;
      xml += `      <userId>${entry.userId}</userId>\n`;
      xml += `      <timestamp>${entry.timestamp.toISOString()}</timestamp>\n`;
      xml += `      <success>${entry.success}</success>\n`;
      xml += `      <culturalSensitive>${entry.culturalSensitive}</culturalSensitive>\n`;
      xml += '    </entry>\n';
    }

    xml += '  </entries>\n';
    xml += '</auditTrail>';

    return xml;
  }

  private encryptExportData(data: string | Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey, iv);
    
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    let encrypted = cipher.update(dataBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private calculateChecksums(data: string | Buffer): { sha256: string; integrity: string } {
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    const sha256 = crypto
      .createHash('sha256')
      .update(dataBuffer)
      .digest('hex');

    const integrity = crypto
      .createHmac('sha256', this.integrityKey)
      .update(dataBuffer)
      .digest('hex');

    return { sha256, integrity };
  }

  private calculateDateRange(entries: AuditEntry[]): { start: Date; end: Date } {
    if (entries.length === 0) {
      const now = new Date();
      return { start: now, end: now };
    }

    const timestamps = entries.map(entry => entry.timestamp);
    return {
      start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
      end: new Date(Math.max(...timestamps.map(t => t.getTime())))
    };
  }
}

// Storage interface for audit entries
export interface AuditStorage {
  store(entry: AuditEntry & { _integrity?: any; _metadata?: any }): Promise<void>;
  query(criteria: AuditCriteria): Promise<AuditEntry[]>;
  getById(id: string): Promise<AuditEntry | null>;
  delete(id: string): Promise<boolean>;
}

// In-memory implementation for development/testing
export class InMemoryAuditStorage implements AuditStorage {
  private entries: Map<string, AuditEntry & { _integrity?: any; _metadata?: any }> = new Map();

  async store(entry: AuditEntry & { _integrity?: any; _metadata?: any }): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async query(criteria: AuditCriteria): Promise<AuditEntry[]> {
    const results: AuditEntry[] = [];

    for (const entry of this.entries.values()) {
      if (this.matchesCriteria(entry, criteria)) {
        results.push(entry);
      }
    }

    // Apply sorting
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = criteria.offset || 0;
    const limit = criteria.limit || 100;
    
    return results.slice(offset, offset + limit);
  }

  async getById(id: string): Promise<AuditEntry | null> {
    return this.entries.get(id) || null;
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  private matchesCriteria(entry: AuditEntry, criteria: AuditCriteria): boolean {
    if (criteria.userId && entry.userId !== criteria.userId) return false;
    if (criteria.sessionId && entry.sessionId !== criteria.sessionId) return false;
    if (criteria.requestId && entry.requestId !== criteria.requestId) return false;
    if (criteria.ruleId && entry.ruleId !== criteria.ruleId) return false;
    if (criteria.operation && entry.operation !== criteria.operation) return false;
    if (criteria.culturalSensitive !== undefined && entry.culturalSensitive !== criteria.culturalSensitive) return false;
    
    if (criteria.complianceFramework && !entry.complianceFrameworks.includes(criteria.complianceFramework)) {
      return false;
    }

    if (criteria.timeRange) {
      const entryTime = entry.timestamp.getTime();
      const startTime = criteria.timeRange.start.getTime();
      const endTime = criteria.timeRange.end.getTime();
      if (entryTime < startTime || entryTime > endTime) return false;
    }

    return true;
  }
}