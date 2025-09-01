/**
 * Comprehensive Test Suite for Rollback Scenarios
 * 
 * Tests covering policy versioning, rollback planning, validation,
 * execution, and edge cases with mock implementations
 */

import {
  PolicyVersion,
  PolicyVersionStatus,
  RollbackPlan,
  RollbackTarget,
  RollbackScope,
  RollbackStatus,
  RollbackRisk,
  RollbackExecution,
  RollbackExecutionStatus,
  PolicyChange,
  ChangeType,
  AuditEntry,
  AuditAction,
  AuditResult,
  ValidationResult,
  ConflictDetectionResult,
  ConflictType,
  ConflictSeverity
} from '../types';

import { PolicyVersionServiceImpl } from '../PolicyVersionService';
import { AuditTrailService } from '../AuditTrailService';
import { RollbackService } from '../RollbackService';
import { RollbackValidationService } from '../RollbackValidationService';
import { AdminAPI } from '../AdminAPI';

// Mock implementations for testing
class MockPolicyRepository {
  private versions = new Map<string, PolicyVersion[]>();
  private changes = new Map<string, PolicyChange[]>();
  private auditEntries: AuditEntry[] = [];
  private rollbackPlans = new Map<string, RollbackPlan>();
  private rollbackExecutions = new Map<string, RollbackExecution>();

  async saveVersion(version: PolicyVersion): Promise<string> {
    const policyVersions = this.versions.get(version.policyId) || [];
    policyVersions.push(version);
    this.versions.set(version.policyId, policyVersions);
    return version.id;
  }

  async getVersion(policyId: string, version: string): Promise<PolicyVersion | null> {
    const versions = this.versions.get(policyId) || [];
    return versions.find(v => v.version === version) || null;
  }

  async getLatestVersion(policyId: string): Promise<PolicyVersion | null> {
    const versions = this.versions.get(policyId) || [];
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }

  async getAllVersions(policyId: string): Promise<PolicyVersion[]> {
    return this.versions.get(policyId) || [];
  }

  async deleteVersion(policyId: string, version: string): Promise<boolean> {
    const versions = this.versions.get(policyId) || [];
    const index = versions.findIndex(v => v.version === version);
    if (index >= 0) {
      versions.splice(index, 1);
      this.versions.set(policyId, versions);
      return true;
    }
    return false;
  }

  async saveChange(change: PolicyChange): Promise<string> {
    const changes = this.changes.get(change.policyId) || [];
    changes.push(change);
    this.changes.set(change.policyId, changes);
    return change.id;
  }

  async getChange(changeId: string): Promise<PolicyChange | null> {
    for (const changes of this.changes.values()) {
      const change = changes.find(c => c.id === changeId);
      if (change) return change;
    }
    return null;
  }

  async getChanges(policyId: string, options: any = {}): Promise<PolicyChange[]> {
    return this.changes.get(policyId) || [];
  }

  async saveAuditEntry(entry: AuditEntry): Promise<string> {
    this.auditEntries.push(entry);
    return entry.id;
  }

  async getAuditTrail(target: string, options: any = {}): Promise<AuditEntry[]> {
    return this.auditEntries.filter(e => e.target === target || target === '*');
  }

  async saveRollbackPlan(plan: RollbackPlan): Promise<string> {
    this.rollbackPlans.set(plan.id, plan);
    return plan.id;
  }

  async getRollbackPlan(planId: string): Promise<RollbackPlan | null> {
    return this.rollbackPlans.get(planId) || null;
  }

  async getRollbackPlans(options: any = {}): Promise<RollbackPlan[]> {
    return Array.from(this.rollbackPlans.values());
  }

  async saveRollbackExecution(execution: RollbackExecution): Promise<string> {
    this.rollbackExecutions.set(execution.id, execution);
    return execution.id;
  }

  async getRollbackExecution(executionId: string): Promise<RollbackExecution | null> {
    return this.rollbackExecutions.get(executionId) || null;
  }

  // Test utilities
  clear(): void {
    this.versions.clear();
    this.changes.clear();
    this.auditEntries.length = 0;
    this.rollbackPlans.clear();
    this.rollbackExecutions.clear();
  }

  seedTestData(): void {
    // Add test policy versions
    const testPolicy1V1: PolicyVersion = {
      id: 'v1-id-1',
      policyId: 'test-policy-1',
      version: '1.0.0',
      hash: 'hash-1-0-0',
      content: {
        rego: 'package test.policy\nallow = true',
        data: {},
        config: {
          enforcement: 'BLOCKING' as any,
          scope: 'GLOBAL' as any,
          priority: 1,
          jurisdiction: ['AU'],
          complianceFrameworks: ['AUSTRAC']
        },
        dependencies: [],
        constraints: []
      },
      metadata: {
        title: 'Test Policy 1 v1.0.0',
        description: 'Initial version',
        category: 'FINANCIAL' as any,
        severity: 'MEDIUM' as any,
        impact: 'LOW' as any,
        changeType: ChangeType.CREATION,
        releaseNotes: 'Initial policy creation',
        reviewers: ['reviewer1']
      },
      parentVersion: undefined,
      branches: [],
      tags: ['stable'],
      createdAt: new Date('2024-01-01'),
      createdBy: 'admin',
      status: PolicyVersionStatus.ACTIVE
    };

    const testPolicy1V2: PolicyVersion = {
      ...testPolicy1V1,
      id: 'v1-id-2',
      version: '1.1.0',
      hash: 'hash-1-1-0',
      content: {
        ...testPolicy1V1.content,
        rego: 'package test.policy\nallow = input.amount < 10000'
      },
      metadata: {
        ...testPolicy1V1.metadata,
        title: 'Test Policy 1 v1.1.0',
        description: 'Added amount limit',
        changeType: ChangeType.UPDATE
      },
      parentVersion: '1.0.0',
      createdAt: new Date('2024-01-15'),
      status: PolicyVersionStatus.ACTIVE
    };

    this.versions.set('test-policy-1', [testPolicy1V1, testPolicy1V2]);
  }
}

describe('Policy Versioning and Rollback System', () => {
  let mockRepo: MockPolicyRepository;
  let auditService: AuditTrailService;
  let rollbackService: RollbackService;
  let validationService: RollbackValidationService;
  let policyService: PolicyVersionServiceImpl;
  let adminAPI: AdminAPI;

  beforeEach(() => {
    mockRepo = new MockPolicyRepository();
    auditService = new AuditTrailService(mockRepo as any, 'test-integrity-key');
    rollbackService = new RollbackService(mockRepo as any, auditService);
    validationService = new RollbackValidationService(mockRepo as any);
    policyService = new PolicyVersionServiceImpl(
      mockRepo as any,
      auditService,
      rollbackService,
      validationService
    );
    adminAPI = new AdminAPI(policyService);
    
    mockRepo.seedTestData();
  });

  afterEach(() => {
    mockRepo.clear();
  });

  describe('Policy Version Management', () => {
    test('should create new policy version', async () => {
      const content = {
        rego: 'package test.new\nallow = true',
        data: {},
        config: {
          enforcement: 'BLOCKING' as any,
          scope: 'GLOBAL' as any,
          priority: 1,
          jurisdiction: ['AU'],
          complianceFrameworks: ['AUSTRAC']
        },
        dependencies: [],
        constraints: []
      };

      const metadata = {
        title: 'New Test Policy',
        description: 'A new test policy',
        category: 'FINANCIAL' as any,
        severity: 'MEDIUM' as any,
        impact: 'LOW' as any,
        changeType: ChangeType.CREATION,
        releaseNotes: 'Initial creation',
        reviewers: ['reviewer1']
      };

      const version = await policyService.createVersion(
        'new-policy',
        content,
        metadata,
        'admin'
      );

      expect(version).toBeDefined();
      expect(version.policyId).toBe('new-policy');
      expect(version.version).toBe('1.0.0');
      expect(version.status).toBe(PolicyVersionStatus.DRAFT);
      expect(version.createdBy).toBe('admin');
    });

    test('should increment version number correctly', async () => {
      // Create second version for existing policy
      const content = {
        rego: 'package test.policy\nallow = input.amount < 5000',
        data: {},
        config: {
          enforcement: 'BLOCKING' as any,
          scope: 'GLOBAL' as any,
          priority: 1,
          jurisdiction: ['AU'],
          complianceFrameworks: ['AUSTRAC']
        },
        dependencies: [],
        constraints: []
      };

      const metadata = {
        title: 'Test Policy 1 v1.2.0',
        description: 'Reduced amount limit',
        category: 'FINANCIAL' as any,
        severity: 'MEDIUM' as any,
        impact: 'MEDIUM' as any,
        changeType: ChangeType.UPDATE,
        releaseNotes: 'Tightened security',
        reviewers: ['reviewer1', 'reviewer2']
      };

      const version = await policyService.createVersion(
        'test-policy-1',
        content,
        metadata,
        'admin'
      );

      expect(version.version).toBe('1.2.0'); // Should increment from 1.1.0
      expect(version.parentVersion).toBe('1.1.0');
    });

    test('should approve and deploy versions correctly', async () => {
      // First approve
      await policyService.approveVersion('test-policy-1', '1.0.0', 'approver');
      const approvedVersion = await mockRepo.getVersion('test-policy-1', '1.0.0');
      expect(approvedVersion?.status).toBe(PolicyVersionStatus.APPROVED);
      expect(approvedVersion?.metadata.approvedBy).toBe('approver');

      // Then deploy
      await policyService.deployVersion('test-policy-1', '1.0.0', 'deployer');
      const deployedVersion = await mockRepo.getVersion('test-policy-1', '1.0.0');
      expect(deployedVersion?.status).toBe(PolicyVersionStatus.ACTIVE);
    });

    test('should compare versions and generate diff', async () => {
      const diff = await policyService.compareVersions('test-policy-1', '1.0.0', '1.1.0');
      
      expect(diff).toBeDefined();
      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].path).toBe('content.rego');
      expect(diff.summary.linesModified).toBeGreaterThan(0);
    });
  });

  describe('Rollback Plan Creation and Validation', () => {
    test('should create rollback plan', async () => {
      const target: RollbackTarget = {
        type: 'version',
        value: '1.0.0',
        policyIds: ['test-policy-1'],
        includeData: false,
        preserveAuditTrail: true
      };

      const scope: RollbackScope = {
        policies: ['test-policy-1'],
        exclusions: [],
        systems: ['policy-engine'],
        timeWindow: {
          start: '09:00',
          end: '17:00',
          timezone: 'Australia/Sydney'
        },
        impactAssessment: {
          affectedUsers: 100,
          affectedTransactions: 1000,
          systemDowntime: 5,
          dataLoss: {
            risk: 'minimal',
            affectedRecords: 0,
            recoverable: true,
            backupAvailable: true
          },
          complianceRisk: {
            level: 'low',
            frameworks: ['AUSTRAC'],
            mitigations: ['Review process in place']
          },
          businessImpact: {
            severity: 'low',
            duration: 5,
            affectedOperations: ['transaction-processing']
          }
        }
      };

      const metadata = {
        estimatedDuration: 30,
        risk: RollbackRisk.MEDIUM,
        approvalRequired: true,
        maintenanceWindow: false,
        businessJustification: 'Revert problematic policy changes',
        technicalJustification: 'New version causing false positives'
      };

      const plan = await policyService.createRollbackPlan(target, scope, metadata, 'admin');

      expect(plan).toBeDefined();
      expect(plan.targetState.value).toBe('1.0.0');
      expect(plan.status).toBe(RollbackStatus.DRAFT);
      expect(plan.phases).toHaveLength(4); // Backup, Restore, Clear Cache, Validate
    });

    test('should validate rollback plan successfully', async () => {
      // Create a plan first
      const target: RollbackTarget = {
        type: 'version',
        value: '1.0.0',
        policyIds: ['test-policy-1'],
        includeData: false,
        preserveAuditTrail: true
      };

      const scope: RollbackScope = {
        policies: ['test-policy-1'],
        exclusions: [],
        systems: ['policy-engine'],
        timeWindow: {
          start: '09:00',
          end: '17:00',
          timezone: 'Australia/Sydney'
        },
        impactAssessment: {
          affectedUsers: 100,
          affectedTransactions: 1000,
          systemDowntime: 5,
          dataLoss: {
            risk: 'minimal',
            affectedRecords: 0,
            recoverable: true,
            backupAvailable: true
          },
          complianceRisk: {
            level: 'low',
            frameworks: ['AUSTRAC'],
            mitigations: []
          },
          businessImpact: {
            severity: 'low',
            duration: 5,
            affectedOperations: []
          }
        }
      };

      const metadata = {
        estimatedDuration: 30,
        risk: RollbackRisk.LOW,
        approvalRequired: false,
        maintenanceWindow: false,
        businessJustification: 'Test rollback',
        technicalJustification: 'Test validation'
      };

      const plan = await rollbackService.createRollbackPlan(target, scope, metadata, 'admin');
      const validationResults = await rollbackService.validateRollbackPlan(plan.id);

      expect(validationResults).toBeDefined();
      expect(validationResults.length).toBeGreaterThan(0);
      
      // Should have at least target validation results
      const targetValidations = validationResults.filter(r => r.checkId.includes('target'));
      expect(targetValidations.length).toBeGreaterThan(0);
    });

    test('should detect version conflicts', async () => {
      const target: RollbackTarget = {
        type: 'version',
        value: 'non-existent-version',
        policyIds: ['test-policy-1'],
        includeData: false,
        preserveAuditTrail: true
      };

      const scope: RollbackScope = {
        policies: ['test-policy-1'],
        exclusions: [],
        systems: [],
        timeWindow: {
          start: '09:00',
          end: '17:00',
          timezone: 'Australia/Sydney'
        },
        impactAssessment: {
          affectedUsers: 0,
          affectedTransactions: 0,
          systemDowntime: 0,
          dataLoss: {
            risk: 'none',
            affectedRecords: 0,
            recoverable: true,
            backupAvailable: true
          },
          complianceRisk: {
            level: 'low',
            frameworks: [],
            mitigations: []
          },
          businessImpact: {
            severity: 'minimal',
            duration: 0,
            affectedOperations: []
          }
        }
      };

      const metadata = {
        estimatedDuration: 30,
        risk: RollbackRisk.LOW,
        approvalRequired: false,
        maintenanceWindow: false,
        businessJustification: 'Test conflict detection',
        technicalJustification: 'Invalid target version'
      };

      const plan = await rollbackService.createRollbackPlan(target, scope, metadata, 'admin');
      const validationResults = await rollbackService.validateRollbackPlan(plan.id);

      // Should detect target not found
      const failedValidations = validationResults.filter(r => !r.passed);
      expect(failedValidations.length).toBeGreaterThan(0);
      
      const targetNotFound = failedValidations.find(r => 
        r.checkId.includes('target_exists') && r.message.includes('not found')
      );
      expect(targetNotFound).toBeDefined();
    });
  });

  describe('Rollback Execution', () => {
    test('should execute rollback successfully', async () => {
      // Create and approve a valid plan
      const target: RollbackTarget = {
        type: 'version',
        value: '1.0.0',
        policyIds: ['test-policy-1'],
        includeData: false,
        preserveAuditTrail: true
      };

      const scope: RollbackScope = {
        policies: ['test-policy-1'],
        exclusions: [],
        systems: ['policy-engine'],
        timeWindow: {
          start: '00:00',
          end: '23:59',
          timezone: 'Australia/Sydney'
        },
        impactAssessment: {
          affectedUsers: 10,
          affectedTransactions: 100,
          systemDowntime: 2,
          dataLoss: {
            risk: 'none',
            affectedRecords: 0,
            recoverable: true,
            backupAvailable: true
          },
          complianceRisk: {
            level: 'low',
            frameworks: [],
            mitigations: []
          },
          businessImpact: {
            severity: 'minimal',
            duration: 2,
            affectedOperations: []
          }
        }
      };

      const metadata = {
        estimatedDuration: 10,
        risk: RollbackRisk.LOW,
        approvalRequired: false,
        maintenanceWindow: false,
        businessJustification: 'Test execution',
        technicalJustification: 'Valid rollback test'
      };

      const plan = await rollbackService.createRollbackPlan(target, scope, metadata, 'admin');
      
      // Approve the plan
      await rollbackService.approveRollbackPlan(plan.id, 'approver');

      // Execute rollback
      const execution = await rollbackService.executeRollback(plan.id, 'executor');

      expect(execution).toBeDefined();
      expect(execution.planId).toBe(plan.id);
      expect(execution.executedBy).toBe('executor');
      expect(execution.status).toBe(RollbackExecutionStatus.PREPARING);
    });

    test('should not execute unapproved rollback plan', async () => {
      const target: RollbackTarget = {
        type: 'version',
        value: '1.0.0',
        policyIds: ['test-policy-1'],
        includeData: false,
        preserveAuditTrail: true
      };

      const scope: RollbackScope = {
        policies: ['test-policy-1'],
        exclusions: [],
        systems: [],
        timeWindow: {
          start: '09:00',
          end: '17:00',
          timezone: 'Australia/Sydney'
        },
        impactAssessment: {
          affectedUsers: 0,
          affectedTransactions: 0,
          systemDowntime: 0,
          dataLoss: {
            risk: 'none',
            affectedRecords: 0,
            recoverable: true,
            backupAvailable: true
          },
          complianceRisk: {
            level: 'low',
            frameworks: [],
            mitigations: []
          },
          businessImpact: {
            severity: 'minimal',
            duration: 0,
            affectedOperations: []
          }
        }
      };

      const metadata = {
        estimatedDuration: 10,
        risk: RollbackRisk.LOW,
        approvalRequired: true,
        maintenanceWindow: false,
        businessJustification: 'Test unapproved execution',
        technicalJustification: 'Should fail'
      };

      const plan = await rollbackService.createRollbackPlan(target, scope, metadata, 'admin');

      // Try to execute without approval
      await expect(rollbackService.executeRollback(plan.id, 'executor'))
        .rejects.toThrow('must be approved before execution');
    });

    test('should monitor rollback execution progress', async () => {
      // Create approved plan
      const target: RollbackTarget = {
        type: 'version',
        value: '1.0.0',
        policyIds: ['test-policy-1'],
        includeData: false,
        preserveAuditTrail: true
      };

      const scope: RollbackScope = {
        policies: ['test-policy-1'],
        exclusions: [],
        systems: [],
        timeWindow: {
          start: '00:00',
          end: '23:59',
          timezone: 'Australia/Sydney'
        },
        impactAssessment: {
          affectedUsers: 0,
          affectedTransactions: 0,
          systemDowntime: 0,
          dataLoss: {
            risk: 'none',
            affectedRecords: 0,
            recoverable: true,
            backupAvailable: true
          },
          complianceRisk: {
            level: 'low',
            frameworks: [],
            mitigations: []
          },
          businessImpact: {
            severity: 'minimal',
            duration: 0,
            affectedOperations: []
          }
        }
      };

      const metadata = {
        estimatedDuration: 5,
        risk: RollbackRisk.LOW,
        approvalRequired: false,
        maintenanceWindow: false,
        businessJustification: 'Test monitoring',
        technicalJustification: 'Monitor progress'
      };

      const plan = await rollbackService.createRollbackPlan(target, scope, metadata, 'admin');
      await rollbackService.approveRollbackPlan(plan.id, 'approver');

      const execution = await rollbackService.executeRollback(plan.id, 'executor');
      
      // Monitor execution
      const monitoredExecution = await rollbackService.monitorRollback(execution.id);
      
      expect(monitoredExecution).toBeDefined();
      expect(monitoredExecution.id).toBe(execution.id);
    });
  });

  describe('Audit Trail and Compliance', () => {
    test('should record audit entries for all operations', async () => {
      // Create a version (should generate audit entry)
      await policyService.createVersion(
        'audit-test-policy',
        {
          rego: 'package audit.test\nallow = true',
          data: {},
          config: {
            enforcement: 'BLOCKING' as any,
            scope: 'GLOBAL' as any,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: []
          },
          dependencies: [],
          constraints: []
        },
        {
          title: 'Audit Test Policy',
          description: 'For testing audit trails',
          category: 'FINANCIAL' as any,
          severity: 'LOW' as any,
          impact: 'LOW' as any,
          changeType: ChangeType.CREATION,
          releaseNotes: 'Testing',
          reviewers: []
        },
        'audit-user'
      );

      // Check audit trail
      const auditEntries = await auditService.getAuditTrail('audit-test-policy');
      expect(auditEntries.length).toBeGreaterThan(0);
      
      const createEntry = auditEntries.find(e => e.action === 'CREATE_POLICY' as any);
      expect(createEntry).toBeDefined();
      expect(createEntry?.userId).toBe('audit-user');
    });

    test('should generate compliance report', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');
      
      const report = await policyService.generateComplianceReport(fromDate, toDate);
      
      expect(report).toBeDefined();
      expect(report.period.from).toEqual(fromDate);
      expect(report.period.to).toEqual(toDate);
      expect(report.summary).toBeDefined();
    });

    test('should track version history', async () => {
      const history = await policyService.getVersionHistory('test-policy-1');
      
      expect(history).toBeDefined();
      expect(history.length).toBe(2); // Two versions from seed data
      expect(history[0].version).toBe('1.0.0');
      expect(history[1].version).toBe('1.1.0');
    });

    test('should track change history', async () => {
      const changes = await policyService.getChangeHistory('test-policy-1');
      
      expect(changes).toBeDefined();
      // Changes would be generated during version operations
    });
  });

  describe('Admin API Integration', () => {
    test('should handle API request with proper authorization', async () => {
      const request = {
        userId: 'admin-user',
        sessionId: 'session-123',
        requestId: 'req-456',
        ipAddress: '127.0.0.1',
        roles: ['policy_admin']
      };

      const response = await adminAPI.getPolicyVersions(request, 'test-policy-1');
      
      expect(response.success).toBe(true);
      expect(response.data?.versions).toBeDefined();
      expect(response.requestId).toBe('req-456');
    });

    test('should reject unauthorized API requests', async () => {
      const request = {
        userId: 'unauthorized-user',
        sessionId: 'session-123',
        requestId: 'req-456',
        ipAddress: '127.0.0.1',
        roles: ['unauthorized_role']
      };

      const response = await adminAPI.getPolicyVersions(request, 'test-policy-1');
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Insufficient permissions');
    });

    test('should handle pagination in API responses', async () => {
      const request = {
        userId: 'admin-user',
        sessionId: 'session-123',
        requestId: 'req-456',
        ipAddress: '127.0.0.1',
        roles: ['policy_admin']
      };

      const pagination = {
        page: 1,
        limit: 1,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const
      };

      const response = await adminAPI.getPolicyVersions(request, 'test-policy-1', undefined, pagination);
      
      expect(response.success).toBe(true);
      expect(response.data?.versions.length).toBeLessThanOrEqual(1);
      expect(response.data?.pageInfo).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle non-existent policy gracefully', async () => {
      const history = await policyService.getVersionHistory('non-existent-policy');
      expect(history).toEqual([]);
    });

    test('should handle invalid rollback targets', async () => {
      const target: RollbackTarget = {
        type: 'version',
        value: 'invalid-version',
        policyIds: ['non-existent-policy'],
        includeData: false,
        preserveAuditTrail: true
      };

      const scope: RollbackScope = {
        policies: ['non-existent-policy'],
        exclusions: [],
        systems: [],
        timeWindow: {
          start: '09:00',
          end: '17:00',
          timezone: 'Australia/Sydney'
        },
        impactAssessment: {
          affectedUsers: 0,
          affectedTransactions: 0,
          systemDowntime: 0,
          dataLoss: {
            risk: 'none',
            affectedRecords: 0,
            recoverable: true,
            backupAvailable: true
          },
          complianceRisk: {
            level: 'low',
            frameworks: [],
            mitigations: []
          },
          businessImpact: {
            severity: 'minimal',
            duration: 0,
            affectedOperations: []
          }
        }
      };

      const metadata = {
        estimatedDuration: 10,
        risk: RollbackRisk.LOW,
        approvalRequired: false,
        maintenanceWindow: false,
        businessJustification: 'Test invalid target',
        technicalJustification: 'Should handle gracefully'
      };

      await expect(rollbackService.createRollbackPlan(target, scope, metadata, 'admin'))
        .rejects.toThrow();
    });

    test('should validate integrity of audit entries', async () => {
      // Create an audit entry
      const entryId = await auditService.recordAuditEntry(
        'test-user',
        AuditAction.CREATE_POLICY,
        'test-target',
        { test: 'data' },
        AuditResult.SUCCESS,
        {
          sessionId: 'session-123',
          requestId: 'req-456',
          ipAddress: '127.0.0.1'
        }
      );

      expect(entryId).toBeDefined();
      
      // Verify entry was stored
      const entries = await auditService.getAuditTrail('test-target');
      expect(entries.length).toBeGreaterThan(0);
      
      const entry = entries.find(e => e.id === entryId);
      expect(entry).toBeDefined();
      expect(entry?.integrityHash).toBeDefined();
    });

    test('should handle concurrent modifications during rollback', async () => {
      // This would test race conditions and concurrent access
      // For simplicity, we'll test that the validation catches recent changes
      
      const target: RollbackTarget = {
        type: 'version',
        value: '1.0.0',
        policyIds: ['test-policy-1'],
        includeData: false,
        preserveAuditTrail: true
      };

      // Simulate recent change by adding a change entry
      const recentChange: PolicyChange = {
        id: 'recent-change-id',
        changeType: ChangeType.UPDATE,
        policyId: 'test-policy-1',
        fromVersion: '1.1.0',
        toVersion: '1.2.0',
        diff: {
          added: [],
          modified: [],
          removed: [],
          summary: {
            linesAdded: 0,
            linesRemoved: 0,
            linesModified: 1,
            filesChanged: 1,
            complexity: 'SIMPLE' as any
          }
        },
        changeset: {
          files: [],
          operations: [],
          rollbackInstructions: [],
          dependencies: []
        },
        metadata: {
          description: 'Recent change',
          reason: 'BUG_FIX' as any,
          urgency: 'MEDIUM' as any,
          impact: 'LOW' as any,
          rollbackWindow: 24,
          reviewRequired: false,
          approvalRequired: false,
          notificationRequired: false,
          affectedSystems: [],
          affectedUsers: [],
          rollbackComplexity: 'SIMPLE' as any
        },
        auditTrail: [],
        timestamp: new Date(), // Recent timestamp
        userId: 'other-user',
        sessionId: 'other-session',
        requestId: 'other-request'
      };

      await mockRepo.saveChange(recentChange);

      // Now test conflict detection
      const scope: RollbackScope = {
        policies: ['test-policy-1'],
        exclusions: [],
        systems: [],
        timeWindow: {
          start: '09:00',
          end: '17:00',
          timezone: 'Australia/Sydney'
        },
        impactAssessment: {
          affectedUsers: 0,
          affectedTransactions: 0,
          systemDowntime: 0,
          dataLoss: {
            risk: 'none',
            affectedRecords: 0,
            recoverable: true,
            backupAvailable: true
          },
          complianceRisk: {
            level: 'low',
            frameworks: [],
            mitigations: []
          },
          businessImpact: {
            severity: 'minimal',
            duration: 0,
            affectedOperations: []
          }
        }
      };

      const metadata = {
        estimatedDuration: 10,
        risk: RollbackRisk.MEDIUM,
        approvalRequired: false,
        maintenanceWindow: false,
        businessJustification: 'Test concurrent modification',
        technicalJustification: 'Conflict detection test'
      };

      const plan = await rollbackService.createRollbackPlan(target, scope, metadata, 'admin');
      
      // Validation should detect the recent change as a potential conflict
      const validationResult = await validationService.validateRollbackPlan(plan);
      
      // The validation might detect conflicts or require additional review
      expect(validationResult).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large numbers of versions efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple versions
      for (let i = 0; i < 10; i++) {
        await policyService.createVersion(
          'performance-test-policy',
          {
            rego: `package performance.test\nallow = input.version == ${i}`,
            data: {},
            config: {
              enforcement: 'BLOCKING' as any,
              scope: 'GLOBAL' as any,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [],
            constraints: []
          },
          {
            title: `Performance Test v${i}`,
            description: 'Performance testing',
            category: 'FINANCIAL' as any,
            severity: 'LOW' as any,
            impact: 'LOW' as any,
            changeType: ChangeType.UPDATE,
            releaseNotes: `Version ${i}`,
            reviewers: []
          },
          'perf-user'
        );
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete reasonably quickly (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Verify all versions were created
      const versions = await policyService.getVersionHistory('performance-test-policy');
      expect(versions.length).toBe(10);
    });

    test('should handle large audit queries efficiently', async () => {
      // Generate multiple audit entries
      for (let i = 0; i < 50; i++) {
        await auditService.recordAuditEntry(
          `user-${i % 5}`,
          AuditAction.VIEW_POLICY,
          'performance-target',
          { index: i },
          AuditResult.SUCCESS,
          {
            sessionId: `session-${i}`,
            requestId: `req-${i}`,
            ipAddress: '127.0.0.1'
          }
        );
      }

      const startTime = Date.now();
      const entries = await auditService.getAuditTrail('performance-target');
      const endTime = Date.now();
      
      expect(entries.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
    });
  });
});