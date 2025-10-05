/**
 * Policy Version Service
 * 
 * High-level service implementing the complete policy versioning workflow
 * including creation, validation, rollback planning, and execution
 */

import {
  PolicyVersionService as IPolicyVersionService,
  PolicyVersion,
  PolicyContent,
  PolicyVersionMetadata,
  PolicyDiff,
  RollbackPlan,
  RollbackTarget,
  RollbackScope,
  RollbackMetadata,
  RollbackExecution,
  ValidationResult,
  ComplianceReport,
  PolicyChange,
  ChangeQueryOptions,
  AuditQueryOptions,
  AuditEntry,
  PolicyVersionRepository,
  ChangeType,
  PolicyVersionStatus
} from './types';

import { AuditTrailService } from './AuditTrailService';
import { RollbackService } from './RollbackService';
import { RollbackValidationService } from './RollbackValidationService';

export class PolicyVersionServiceImpl implements IPolicyVersionService {
  private repository: PolicyVersionRepository;
  private auditService: AuditTrailService;
  private rollbackService: RollbackService;
  private validationService: RollbackValidationService;

  constructor(
    repository: PolicyVersionRepository,
    auditService: AuditTrailService,
    rollbackService: RollbackService,
    validationService: RollbackValidationService
  ) {
    this.repository = repository;
    this.auditService = auditService;
    this.rollbackService = rollbackService;
    this.validationService = validationService;
  }

  // Version Operations

  async createVersion(
    policyId: string,
    content: PolicyContent,
    metadata: PolicyVersionMetadata,
    userId: string
  ): Promise<PolicyVersion> {
    // Get parent version
    const parentVersion = await this.repository.getLatestVersion(policyId);
    
    // Generate version number
    const versionNumber = this.generateVersionNumber(parentVersion);
    
    // Calculate content hash
    const contentHash = this.calculateContentHash(content);
    
    // Create version object
    const version: PolicyVersion = {
      id: this.generateId(),
      policyId,
      version: versionNumber,
      hash: contentHash,
      content,
      metadata,
      parentVersion: parentVersion?.version,
      branches: [],
      tags: [],
      createdAt: new Date(),
      createdBy: userId,
      status: PolicyVersionStatus.DRAFT
    };

    // Save version
    const versionId = await this.repository.saveVersion(version);
    version.id = versionId;

    // Record audit entry
    await this.auditService.recordAuditEntry(
      userId,
      'CREATE_POLICY' as any,
      policyId,
      {
        version: versionNumber,
        contentSize: JSON.stringify(content).length,
        category: metadata.category,
        impact: metadata.impact
      },
      'SUCCESS' as any,
      {
        sessionId: this.generateSessionId(),
        requestId: this.generateRequestId(),
        ipAddress: 'system'
      }
    );

    return version;
  }

  async updateVersion(
    policyId: string,
    version: string,
    changes: Partial<PolicyContent>,
    userId: string
  ): Promise<PolicyVersion> {
    // Get existing version
    const existingVersion = await this.repository.getVersion(policyId, version);
    if (!existingVersion) {
      throw new Error(`Version not found: ${policyId}@${version}`);
    }

    if (existingVersion.status !== PolicyVersionStatus.DRAFT) {
      throw new Error(`Cannot update non-draft version: ${existingVersion.status}`);
    }

    // Merge changes
    const updatedContent: PolicyContent = {
      ...existingVersion.content,
      ...changes
    };

    // Update metadata
    const updatedMetadata = {
      ...existingVersion.metadata,
      changeType: ChangeType.UPDATE
    };

    // Update version
    const updatedVersion: PolicyVersion = {
      ...existingVersion,
      content: updatedContent,
      metadata: updatedMetadata,
      hash: this.calculateContentHash(updatedContent)
    };

    await this.repository.saveVersion(updatedVersion);

    // Record change
    await this.recordPolicyChange(existingVersion, updatedVersion, userId);

    return updatedVersion;
  }

  async approveVersion(policyId: string, version: string, userId: string): Promise<void> {
    const policyVersion = await this.repository.getVersion(policyId, version);
    if (!policyVersion) {
      throw new Error(`Version not found: ${policyId}@${version}`);
    }

    if (policyVersion.status !== PolicyVersionStatus.DRAFT && 
        policyVersion.status !== PolicyVersionStatus.REVIEW) {
      throw new Error(`Cannot approve version with status: ${policyVersion.status}`);
    }

    // Update status
    policyVersion.status = PolicyVersionStatus.APPROVED;
    policyVersion.metadata.approvedBy = userId;
    policyVersion.metadata.approvedAt = new Date();

    await this.repository.saveVersion(policyVersion);

    // Record audit entry
    await this.auditService.recordAuditEntry(
      userId,
      'APPROVE_POLICY' as any,
      `${policyId}@${version}`,
      {
        previousStatus: PolicyVersionStatus.DRAFT,
        newStatus: PolicyVersionStatus.APPROVED
      },
      'SUCCESS' as any,
      {
        sessionId: this.generateSessionId(),
        requestId: this.generateRequestId(),
        ipAddress: 'system'
      }
    );
  }

  async deployVersion(policyId: string, version: string, userId: string): Promise<void> {
    const policyVersion = await this.repository.getVersion(policyId, version);
    if (!policyVersion) {
      throw new Error(`Version not found: ${policyId}@${version}`);
    }

    if (policyVersion.status !== PolicyVersionStatus.APPROVED) {
      throw new Error(`Cannot deploy unapproved version: ${policyVersion.status}`);
    }

    // Deactivate current active version
    const versions = await this.repository.getAllVersions(policyId);
    for (const v of versions) {
      if (v.status === PolicyVersionStatus.ACTIVE) {
        v.status = PolicyVersionStatus.DEPRECATED;
        await this.repository.saveVersion(v);
      }
    }

    // Activate new version
    policyVersion.status = PolicyVersionStatus.ACTIVE;
    await this.repository.saveVersion(policyVersion);

    // Record audit entry
    await this.auditService.recordAuditEntry(
      userId,
      'DEPLOY_POLICY' as any,
      `${policyId}@${version}`,
      {
        previousStatus: PolicyVersionStatus.APPROVED,
        newStatus: PolicyVersionStatus.ACTIVE
      },
      'SUCCESS' as any,
      {
        sessionId: this.generateSessionId(),
        requestId: this.generateRequestId(),
        ipAddress: 'system'
      }
    );
  }

  // Change Management

  async compareVersions(
    policyId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<PolicyDiff> {
    const fromPolicyVersion = await this.repository.getVersion(policyId, fromVersion);
    const toPolicyVersion = await this.repository.getVersion(policyId, toVersion);

    if (!fromPolicyVersion || !toPolicyVersion) {
      throw new Error('One or both versions not found');
    }

    // Use the audit service's diff calculation
    return (this.auditService as any).calculatePolicyDiff(fromPolicyVersion, toPolicyVersion);
  }

  async mergeVersions(
    policyId: string,
    baseVersion: string,
    sourceVersion: string,
    userId: string
  ): Promise<PolicyVersion> {
    const basePolicyVersion = await this.repository.getVersion(policyId, baseVersion);
    const sourcePolicyVersion = await this.repository.getVersion(policyId, sourceVersion);

    if (!basePolicyVersion || !sourcePolicyVersion) {
      throw new Error('One or both versions not found');
    }

    // Simple merge strategy - would be more sophisticated in production
    const mergedContent: PolicyContent = {
      ...basePolicyVersion.content,
      ...sourcePolicyVersion.content
    };

    const mergedMetadata = {
      ...basePolicyVersion.metadata,
      changeType: ChangeType.MERGE,
      description: `Merged ${sourceVersion} into ${baseVersion}`
    };

    const mergedVersion = await this.createVersion(
      policyId,
      mergedContent,
      mergedMetadata,
      userId
    );

    return mergedVersion;
  }

  async branchVersion(
    policyId: string,
    fromVersion: string,
    branchName: string,
    userId: string
  ): Promise<PolicyVersion> {
    const sourceVersion = await this.repository.getVersion(policyId, fromVersion);
    if (!sourceVersion) {
      throw new Error(`Source version not found: ${policyId}@${fromVersion}`);
    }

    const branchedMetadata = {
      ...sourceVersion.metadata,
      changeType: ChangeType.BRANCH,
      description: `Branched from ${fromVersion} as ${branchName}`
    };

    const branchedVersion = await this.createVersion(
      policyId,
      sourceVersion.content,
      branchedMetadata,
      userId
    );

    // Add branch reference to source version
    sourceVersion.branches.push(branchedVersion.version);
    await this.repository.saveVersion(sourceVersion);

    // Add branch tag to new version
    branchedVersion.tags.push(branchName);
    await this.repository.saveVersion(branchedVersion);

    return branchedVersion;
  }

  // Rollback Operations

  async createRollbackPlan(
    target: RollbackTarget,
    scope: RollbackScope,
    metadata: RollbackMetadata,
    userId: string
  ): Promise<RollbackPlan> {
    return await this.rollbackService.createRollbackPlan(
      target,
      scope,
      {
        name: `Rollback to ${target.type}:${target.value}`,
        description: metadata.technicalJustification,
        businessJustification: metadata.businessJustification,
        technicalJustification: metadata.technicalJustification,
        estimatedDuration: metadata.estimatedDuration,
        risk: metadata.risk,
        approvalRequired: metadata.approvalRequired,
        maintenanceWindow: metadata.maintenanceWindow
      },
      userId
    );
  }

  async validateRollbackPlan(planId: string): Promise<ValidationResult[]> {
    const plan = await this.repository.getRollbackPlan(planId);
    if (!plan) {
      throw new Error(`Rollback plan not found: ${planId}`);
    }

    const validation = await this.validationService.validateRollbackPlan(plan);
    return validation.validationResults;
  }

  async executeRollback(planId: string, userId: string): Promise<RollbackExecution> {
    // Validate plan before execution
    const validationResults = await this.validateRollbackPlan(planId);
    const criticalFailures = validationResults.filter(r => 
      !r.passed && r.checkId.includes('critical')
    );

    if (criticalFailures.length > 0) {
      throw new Error(`Cannot execute rollback with critical validation failures: ${criticalFailures.map(f => f.message).join(', ')}`);
    }

    return await this.rollbackService.executeRollback(planId, userId);
  }

  async monitorRollback(executionId: string): Promise<RollbackExecution> {
    return await this.rollbackService.monitorRollback(executionId);
  }

  // Audit and Reporting

  async getVersionHistory(policyId: string): Promise<PolicyVersion[]> {
    return await this.repository.getAllVersions(policyId);
  }

  async getChangeHistory(
    policyId: string,
    options?: ChangeQueryOptions
  ): Promise<PolicyChange[]> {
    return await this.repository.getChanges(policyId, options);
  }

  async getAuditTrail(
    target: string,
    options?: AuditQueryOptions
  ): Promise<AuditEntry[]> {
    return await this.auditService.getAuditTrail(target, options);
  }

  async generateComplianceReport(fromDate: Date, toDate: Date): Promise<ComplianceReport> {
    return await this.auditService.generateComplianceReport(fromDate, toDate);
  }

  // Private Helper Methods

  private async recordPolicyChange(
    fromVersion: PolicyVersion,
    toVersion: PolicyVersion,
    userId: string
  ): Promise<void> {
    await this.auditService.recordPolicyChange(
      toVersion.policyId,
      fromVersion,
      toVersion,
      {
        files: [],
        operations: [],
        rollbackInstructions: [],
        dependencies: []
      },
      {
        description: `Updated policy ${toVersion.policyId} from ${fromVersion.version} to ${toVersion.version}`,
        reason: 'FEATURE_ADDITION' as any,
        urgency: 'MEDIUM' as any,
        impact: toVersion.metadata.impact,
        rollbackWindow: 24,
        reviewRequired: false,
        approvalRequired: false,
        notificationRequired: false,
        affectedSystems: [],
        affectedUsers: [],
        rollbackComplexity: 'SIMPLE' as any
      },
      userId,
      {
        sessionId: this.generateSessionId(),
        requestId: this.generateRequestId()
      }
    );
  }

  private generateVersionNumber(parentVersion: PolicyVersion | null): string {
    if (!parentVersion) {
      return '1.0.0';
    }

    // Simple semantic versioning - increment patch version
    const [major, minor, patch] = parentVersion.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  private calculateContentHash(content: PolicyContent): string {
    const crypto = require('crypto');
    const contentString = JSON.stringify(content, Object.keys(content).sort());
    return crypto.createHash('sha256').update(contentString).digest('hex');
  }

  private generateId(): string {
    return require('crypto').randomBytes(16).toString('hex');
  }

  private generateSessionId(): string {
    return require('crypto').randomBytes(8).toString('hex');
  }

  private generateRequestId(): string {
    return require('crypto').randomBytes(8).toString('hex');
  }
}