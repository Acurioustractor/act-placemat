/**
 * Audit Trail Service
 * 
 * Comprehensive service for tracking all policy modifications, changes,
 * and operations with cryptographic integrity and compliance features
 */

import crypto from 'crypto';
import {
  AuditEntry,
  AuditAction,
  AuditResult,
  PolicyChange,
  ChangeType,
  PolicyDiff,
  DiffEntry,
  DiffOperation,
  ChangeComplexity,
  PolicyVersionRepository,
  AuditQueryOptions,
  ChangeQueryOptions,
  PolicyVersion,
  PolicyContent,
  Changeset,
  ChangeMetadata,
  ComplianceReport,
  ComplianceReportSummary
} from './types';

export class AuditTrailService {
  private repository: PolicyVersionRepository;
  private integrityKey: Buffer;
  private complianceRetentionYears: number;

  constructor(
    repository: PolicyVersionRepository,
    integrityKey: string,
    options: {
      complianceRetentionYears?: number;
    } = {}
  ) {
    this.repository = repository;
    this.integrityKey = Buffer.from(integrityKey, 'hex');
    this.complianceRetentionYears = options.complianceRetentionYears || 7; // Default 7 years
  }

  // Audit Entry Management

  async recordAuditEntry(
    userId: string,
    action: AuditAction,
    target: string,
    details: Record<string, any>,
    result: AuditResult,
    context: {
      sessionId: string;
      requestId: string;
      ipAddress: string;
      userAgent?: string;
    }
  ): Promise<string> {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      action,
      target,
      details: this.sanitizeDetails(details),
      result,
      sessionId: context.sessionId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      integrityHash: '' // Will be calculated below
    };

    // Calculate integrity hash
    entry.integrityHash = this.calculateIntegrityHash(entry);

    const entryId = await this.repository.saveAuditEntry(entry);
    
    // Emit audit event for real-time monitoring
    this.emitAuditEvent(entry);
    
    return entryId;
  }

  async getAuditTrail(
    target: string,
    options: AuditQueryOptions = {}
  ): Promise<AuditEntry[]> {
    const entries = await this.repository.getAuditTrail(target, options);
    
    // Verify integrity of audit entries
    for (const entry of entries) {
      if (!this.verifyIntegrity(entry)) {
        console.warn(`Integrity violation detected for audit entry: ${entry.id}`);
        // In production, this should trigger security alerts
      }
    }
    
    return entries;
  }

  async getAuditSummary(
    fromDate: Date,
    toDate: Date,
    options: {
      groupBy?: 'user' | 'action' | 'target' | 'day';
      includeDetails?: boolean;
    } = {}
  ): Promise<{
    totalEntries: number;
    successfulActions: number;
    failedActions: number;
    topUsers: Array<{ userId: string; count: number }>;
    topActions: Array<{ action: AuditAction; count: number }>;
    timeline: Array<{ date: string; count: number }>;
    details?: AuditEntry[];
  }> {
    const entries = await this.repository.getAuditTrail('*', {
      fromDate,
      toDate,
      limit: options.includeDetails ? 10000 : 1000000 // High limit for summary
    });

    const summary = {
      totalEntries: entries.length,
      successfulActions: entries.filter(e => e.result === AuditResult.SUCCESS).length,
      failedActions: entries.filter(e => e.result === AuditResult.FAILURE).length,
      topUsers: this.getTopEntities(entries, 'userId'),
      topActions: this.getTopEntities(entries, 'action'),
      timeline: this.buildTimeline(entries, fromDate, toDate),
      details: options.includeDetails ? entries : undefined
    };

    return summary;
  }

  // Policy Change Tracking

  async recordPolicyChange(
    policyId: string,
    fromVersion: PolicyVersion | null,
    toVersion: PolicyVersion,
    changeset: Changeset,
    metadata: ChangeMetadata,
    userId: string,
    context: {
      sessionId: string;
      requestId: string;
    }
  ): Promise<string> {
    // Calculate comprehensive diff
    const diff = this.calculatePolicyDiff(fromVersion, toVersion);
    
    const change: PolicyChange = {
      id: this.generateId(),
      changeType: this.determineChangeType(fromVersion, toVersion),
      policyId,
      fromVersion: fromVersion?.version,
      toVersion: toVersion.version,
      diff,
      changeset,
      metadata,
      auditTrail: [],
      timestamp: new Date(),
      userId,
      sessionId: context.sessionId,
      requestId: context.requestId
    };

    // Record audit entries for the change
    const auditEntries = await this.createChangeAuditEntries(change, userId, context);
    change.auditTrail = auditEntries;

    const changeId = await this.repository.saveChange(change);

    // Record master audit entry
    await this.recordAuditEntry(
      userId,
      this.mapChangeTypeToAuditAction(change.changeType),
      policyId,
      {
        changeId,
        fromVersion: fromVersion?.version,
        toVersion: toVersion.version,
        complexity: diff.summary.complexity,
        filesChanged: diff.summary.filesChanged,
        linesChanged: diff.summary.linesAdded + diff.summary.linesRemoved + diff.summary.linesModified
      },
      AuditResult.SUCCESS,
      context
    );

    return changeId;
  }

  async getChangeHistory(
    policyId: string,
    options: ChangeQueryOptions = {}
  ): Promise<PolicyChange[]> {
    return await this.repository.getChanges(policyId, options);
  }

  async getChangeImpactAnalysis(changeId: string): Promise<{
    directImpacts: string[];
    dependencyImpacts: string[];
    riskAssessment: {
      level: 'low' | 'medium' | 'high' | 'critical';
      factors: string[];
      mitigations: string[];
    };
    rollbackComplexity: {
      level: 'simple' | 'moderate' | 'complex' | 'dangerous';
      factors: string[];
      estimatedTime: number; // Minutes
    };
  }> {
    const change = await this.repository.getChange(changeId);
    if (!change) {
      throw new Error(`Change not found: ${changeId}`);
    }

    // Analyze change impact
    const directImpacts = this.analyzeDirectImpacts(change);
    const dependencyImpacts = await this.analyzeDependencyImpacts(change);
    const riskAssessment = this.assessChangeRisk(change);
    const rollbackComplexity = this.assessRollbackComplexity(change);

    return {
      directImpacts,
      dependencyImpacts,
      riskAssessment,
      rollbackComplexity
    };
  }

  // Policy Diff Calculation

  private calculatePolicyDiff(
    fromVersion: PolicyVersion | null,
    toVersion: PolicyVersion
  ): PolicyDiff {
    const added: DiffEntry[] = [];
    const modified: DiffEntry[] = [];
    const removed: DiffEntry[] = [];

    if (!fromVersion) {
      // New policy creation
      added.push({
        path: 'content',
        newValue: toVersion.content,
        operation: DiffOperation.ADD
      });
    } else {
      // Compare versions
      const contentDiff = this.deepDiff(fromVersion.content, toVersion.content, 'content');
      const metadataDiff = this.deepDiff(fromVersion.metadata, toVersion.metadata, 'metadata');
      
      added.push(...contentDiff.added, ...metadataDiff.added);
      modified.push(...contentDiff.modified, ...metadataDiff.modified);
      removed.push(...contentDiff.removed, ...metadataDiff.removed);
    }

    const summary = this.calculateDiffSummary(added, modified, removed);

    return {
      added,
      modified,
      removed,
      summary
    };
  }

  private deepDiff(
    oldValue: any,
    newValue: any,
    basePath: string
  ): { added: DiffEntry[]; modified: DiffEntry[]; removed: DiffEntry[] } {
    const added: DiffEntry[] = [];
    const modified: DiffEntry[] = [];
    const removed: DiffEntry[] = [];

    if (typeof oldValue !== typeof newValue) {
      modified.push({
        path: basePath,
        oldValue,
        newValue,
        operation: DiffOperation.MODIFY
      });
      return { added, modified, removed };
    }

    if (oldValue === null || newValue === null || typeof oldValue !== 'object') {
      if (oldValue !== newValue) {
        modified.push({
          path: basePath,
          oldValue,
          newValue,
          operation: DiffOperation.MODIFY
        });
      }
      return { added, modified, removed };
    }

    // Handle arrays
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      const maxLength = Math.max(oldValue.length, newValue.length);
      for (let i = 0; i < maxLength; i++) {
        const path = `${basePath}[${i}]`;
        if (i >= oldValue.length) {
          added.push({
            path,
            newValue: newValue[i],
            operation: DiffOperation.ADD
          });
        } else if (i >= newValue.length) {
          removed.push({
            path,
            oldValue: oldValue[i],
            operation: DiffOperation.DELETE
          });
        } else {
          const subDiff = this.deepDiff(oldValue[i], newValue[i], path);
          added.push(...subDiff.added);
          modified.push(...subDiff.modified);
          removed.push(...subDiff.removed);
        }
      }
      return { added, modified, removed };
    }

    // Handle objects
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    for (const key of allKeys) {
      const path = `${basePath}.${key}`;
      if (!(key in oldValue)) {
        added.push({
          path,
          newValue: newValue[key],
          operation: DiffOperation.ADD
        });
      } else if (!(key in newValue)) {
        removed.push({
          path,
          oldValue: oldValue[key],
          operation: DiffOperation.DELETE
        });
      } else {
        const subDiff = this.deepDiff(oldValue[key], newValue[key], path);
        added.push(...subDiff.added);
        modified.push(...subDiff.modified);
        removed.push(...subDiff.removed);
      }
    }

    return { added, modified, removed };
  }

  private calculateDiffSummary(
    added: DiffEntry[],
    modified: DiffEntry[],
    removed: DiffEntry[]
  ) {
    // Estimate lines changed (rough approximation)
    const linesAdded = added.reduce((sum, entry) => {
      return sum + this.estimateLines(entry.newValue);
    }, 0);

    const linesRemoved = removed.reduce((sum, entry) => {
      return sum + this.estimateLines(entry.oldValue);
    }, 0);

    const linesModified = modified.length; // Simplified

    // Determine complexity
    const totalChanges = added.length + modified.length + removed.length;
    let complexity: ChangeComplexity;
    
    if (totalChanges === 0) {
      complexity = ChangeComplexity.TRIVIAL;
    } else if (totalChanges <= 5) {
      complexity = ChangeComplexity.SIMPLE;
    } else if (totalChanges <= 15) {
      complexity = ChangeComplexity.MODERATE;
    } else if (totalChanges <= 50) {
      complexity = ChangeComplexity.COMPLEX;
    } else {
      complexity = ChangeComplexity.MAJOR;
    }

    // Count affected files/sections
    const filesChanged = new Set([
      ...added.map(e => e.path.split('.')[0]),
      ...modified.map(e => e.path.split('.')[0]),
      ...removed.map(e => e.path.split('.')[0])
    ]).size;

    return {
      linesAdded,
      linesRemoved,
      linesModified,
      filesChanged,
      complexity
    };
  }

  private estimateLines(value: any): number {
    if (typeof value === 'string') {
      return value.split('\n').length;
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2).split('\n').length;
    }
    return 1;
  }

  // Compliance and Reporting

  async generateComplianceReport(
    fromDate: Date,
    toDate: Date,
    options: {
      includeDetails?: boolean;
      frameworks?: string[];
    } = {}
  ): Promise<ComplianceReport> {
    const changes = await this.repository.getChanges('*', { fromDate, toDate });
    const auditEntries = await this.repository.getAuditTrail('*', { fromDate, toDate });

    const summary: ComplianceReportSummary = {
      totalPolicies: new Set(changes.map(c => c.policyId)).size,
      changesApproved: changes.filter(c => c.metadata.approvalRequired).length,
      changesRejected: auditEntries.filter(e => e.result === AuditResult.FAILURE).length,
      rollbacksExecuted: auditEntries.filter(e => e.action === AuditAction.ROLLBACK_POLICY).length,
      complianceViolations: 0, // Would be calculated based on compliance checks
      auditTrailCompleteness: this.calculateAuditCompleteness(auditEntries)
    };

    return {
      period: { from: fromDate, to: toDate },
      summary,
      policyChanges: changes.map(c => ({
        policyId: c.policyId,
        changes: 1,
        risk: c.metadata.impact,
        complianceStatus: 'compliant' // Would be determined by compliance validation
      })),
      auditFindings: [], // Would be populated by compliance analysis
      rollbackOperations: [], // Would be populated from rollback executions
      recommendations: [], // Would be generated based on analysis
      attachments: []
    };
  }

  // Integrity and Security

  private calculateIntegrityHash(entry: Omit<AuditEntry, 'integrityHash'>): string {
    const data = {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      userId: entry.userId,
      action: entry.action,
      target: entry.target,
      details: entry.details,
      result: entry.result,
      sessionId: entry.sessionId,
      requestId: entry.requestId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent
    };

    const hmac = crypto.createHmac('sha256', this.integrityKey);
    hmac.update(JSON.stringify(data, Object.keys(data).sort()));
    return hmac.digest('hex');
  }

  private verifyIntegrity(entry: AuditEntry): boolean {
    const { integrityHash, ...entryWithoutHash } = entry;
    const calculatedHash = this.calculateIntegrityHash(entryWithoutHash);
    return calculatedHash === integrityHash;
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Truncate large objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 10000) {
        sanitized[key] = value.substring(0, 10000) + '... [TRUNCATED]';
      }
    }

    return sanitized;
  }

  // Helper Methods

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private determineChangeType(
    fromVersion: PolicyVersion | null,
    toVersion: PolicyVersion
  ): ChangeType {
    if (!fromVersion) {
      return ChangeType.CREATION;
    }
    
    // For now, all changes are updates
    // More sophisticated logic could detect merges, branches, etc.
    return ChangeType.UPDATE;
  }

  private mapChangeTypeToAuditAction(changeType: ChangeType): AuditAction {
    switch (changeType) {
      case ChangeType.CREATION:
        return AuditAction.CREATE_POLICY;
      case ChangeType.UPDATE:
        return AuditAction.UPDATE_POLICY;
      case ChangeType.DELETION:
        return AuditAction.DELETE_POLICY;
      case ChangeType.ROLLBACK:
        return AuditAction.ROLLBACK_POLICY;
      case ChangeType.MERGE:
        return AuditAction.MERGE_POLICIES;
      case ChangeType.BRANCH:
        return AuditAction.BRANCH_POLICY;
      case ChangeType.TAG:
        return AuditAction.TAG_POLICY;
      default:
        return AuditAction.UPDATE_POLICY;
    }
  }

  private async createChangeAuditEntries(
    change: PolicyChange,
    userId: string,
    context: { sessionId: string; requestId: string }
  ): Promise<AuditEntry[]> {
    const entries: AuditEntry[] = [];

    // Create audit entry for each significant operation in the changeset
    for (const operation of change.changeset.operations) {
      const entry: AuditEntry = {
        id: this.generateId(),
        timestamp: new Date(),
        userId,
        action: this.mapOperationToAuditAction(operation.type),
        target: operation.target,
        details: {
          changeId: change.id,
          operationType: operation.type,
          parameters: operation.parameters
        },
        result: AuditResult.SUCCESS,
        sessionId: context.sessionId,
        requestId: context.requestId,
        ipAddress: '', // Would be provided by caller
        integrityHash: ''
      };

      entry.integrityHash = this.calculateIntegrityHash(entry);
      entries.push(entry);
    }

    return entries;
  }

  private mapOperationToAuditAction(operationType: string): AuditAction {
    switch (operationType) {
      case 'create':
        return AuditAction.CREATE_POLICY;
      case 'update':
        return AuditAction.UPDATE_POLICY;
      case 'delete':
        return AuditAction.DELETE_POLICY;
      case 'validate':
        return AuditAction.VALIDATE_POLICY;
      default:
        return AuditAction.UPDATE_POLICY;
    }
  }

  private analyzeDirectImpacts(change: PolicyChange): string[] {
    const impacts: string[] = [];
    
    // Analyze based on change complexity and type
    if (change.diff.summary.complexity === ChangeComplexity.MAJOR) {
      impacts.push('Major architectural changes may affect system stability');
    }
    
    if (change.diff.summary.filesChanged > 5) {
      impacts.push('Multiple components affected, testing required');
    }

    // Analyze specific changes
    for (const entry of change.diff.modified) {
      if (entry.path.includes('enforcement')) {
        impacts.push('Policy enforcement behavior modified');
      }
      if (entry.path.includes('scope')) {
        impacts.push('Policy scope changed, may affect user permissions');
      }
    }

    return impacts;
  }

  private async analyzeDependencyImpacts(change: PolicyChange): Promise<string[]> {
    const impacts: string[] = [];
    
    // This would analyze policy dependencies
    // For now, return placeholder impacts
    if (change.metadata.affectedSystems.length > 0) {
      impacts.push(`${change.metadata.affectedSystems.length} systems require updates`);
    }

    return impacts;
  }

  private assessChangeRisk(change: PolicyChange): {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigations: string[];
  } {
    const factors: string[] = [];
    const mitigations: string[] = [];
    let riskScore = 0;

    // Assess risk factors
    if (change.diff.summary.complexity === ChangeComplexity.MAJOR) {
      riskScore += 3;
      factors.push('Major complexity changes');
      mitigations.push('Comprehensive testing required');
    }

    if (change.metadata.impact === 'major') {
      riskScore += 3;
      factors.push('High business impact');
      mitigations.push('Staged rollout recommended');
    }

    if (change.metadata.urgency === 'emergency') {
      riskScore += 2;
      factors.push('Emergency deployment');
      mitigations.push('Enhanced monitoring required');
    }

    // Determine level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore <= 2) level = 'low';
    else if (riskScore <= 4) level = 'medium';
    else if (riskScore <= 6) level = 'high';
    else level = 'critical';

    return { level, factors, mitigations };
  }

  private assessRollbackComplexity(change: PolicyChange): {
    level: 'simple' | 'moderate' | 'complex' | 'dangerous';
    factors: string[];
    estimatedTime: number;
  } {
    const factors: string[] = [];
    let complexityScore = 0;

    // Assess rollback complexity factors
    if (change.changeset.operations.length > 10) {
      complexityScore += 2;
      factors.push('Many operations to reverse');
    }

    if (change.metadata.affectedSystems.length > 3) {
      complexityScore += 2;
      factors.push('Multiple systems affected');
    }

    if (change.diff.summary.complexity === ChangeComplexity.MAJOR) {
      complexityScore += 3;
      factors.push('Major architectural changes');
    }

    // Determine level and estimate time
    let level: 'simple' | 'moderate' | 'complex' | 'dangerous';
    let estimatedTime: number;

    if (complexityScore <= 2) {
      level = 'simple';
      estimatedTime = 15; // 15 minutes
    } else if (complexityScore <= 4) {
      level = 'moderate';
      estimatedTime = 60; // 1 hour
    } else if (complexityScore <= 6) {
      level = 'complex';
      estimatedTime = 240; // 4 hours
    } else {
      level = 'dangerous';
      estimatedTime = 480; // 8 hours
    }

    return { level, factors, estimatedTime };
  }

  private getTopEntities(entries: AuditEntry[], field: keyof AuditEntry): Array<{ [key: string]: any; count: number }> {
    const counts = new Map<string, number>();
    
    for (const entry of entries) {
      const value = String(entry[field]);
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({ [field]: value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private buildTimeline(entries: AuditEntry[], fromDate: Date, toDate: Date): Array<{ date: string; count: number }> {
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
    const timeline: Array<{ date: string; count: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(fromDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = entries.filter(e => e.timestamp.toISOString().split('T')[0] === dateStr).length;
      timeline.push({ date: dateStr, count });
    }

    return timeline;
  }

  private calculateAuditCompleteness(entries: AuditEntry[]): number {
    // Calculate what percentage of entries have complete audit information
    let completeEntries = 0;
    
    for (const entry of entries) {
      if (entry.userId && entry.sessionId && entry.requestId && this.verifyIntegrity(entry)) {
        completeEntries++;
      }
    }

    return entries.length > 0 ? (completeEntries / entries.length) * 100 : 100;
  }

  private emitAuditEvent(entry: AuditEntry): void {
    // This would emit events to monitoring systems
    // For now, just log significant events
    if (entry.result === AuditResult.FAILURE || entry.action === AuditAction.ROLLBACK_POLICY) {
      console.warn('Significant audit event:', {
        action: entry.action,
        result: entry.result,
        target: entry.target,
        userId: entry.userId,
        timestamp: entry.timestamp
      });
    }
  }
}