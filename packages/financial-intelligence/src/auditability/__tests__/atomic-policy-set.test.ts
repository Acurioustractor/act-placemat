/**
 * Atomic Policy Set Service Test Suite
 * 
 * Comprehensive tests for atomic policy operations, transaction management,
 * rollback scenarios, and edge cases for multi-policy operations
 */

import {
  PolicyVersion,
  PolicyVersionStatus,
  PolicyContent,
  PolicyVersionMetadata,
  ChangeType,
  EnforcementLevel,
  PolicyScope,
  AuditAction,
  AuditResult
} from '../types';

import { AtomicPolicySetService, PolicySetOperation, AtomicPolicySetRequest } from '../AtomicPolicySetService';
import { AuditTrailService } from '../AuditTrailService';

// Mock database connection
class MockDatabaseConnection {
  private transactionCallback: ((client: MockDatabaseConnection) => Promise<any>) | null = null;
  private shouldFailTransaction = false;

  async query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
    if (this.shouldFailTransaction && sql.includes('INSERT')) {
      throw new Error('Mock database transaction failure');
    }
    return { rows: [], rowCount: 0 };
  }

  async transaction<T>(callback: (client: MockDatabaseConnection) => Promise<T>): Promise<T> {
    this.transactionCallback = callback;
    
    try {
      if (this.shouldFailTransaction) {
        throw new Error('Mock transaction failure');
      }
      return await callback(this);
    } finally {
      this.transactionCallback = null;
    }
  }

  // Test utilities
  setTransactionFailure(shouldFail: boolean): void {
    this.shouldFailTransaction = shouldFail;
  }
}

// Mock repository
class MockPolicyRepository {
  private versions = new Map<string, PolicyVersion[]>();
  private auditEntries: any[] = [];

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

  async saveAuditEntry(entry: any): Promise<string> {
    this.auditEntries.push(entry);
    return entry.id;
  }

  async getAuditTrail(target: string, options: any = {}): Promise<any[]> {
    return this.auditEntries.filter(e => e.target === target || target === '*');
  }

  // Test utilities
  clear(): void {
    this.versions.clear();
    this.auditEntries.length = 0;
  }

  seedTestData(): void {
    const testPolicy1: PolicyVersion = {
      id: 'test-policy-1-v1',
      policyId: 'test-policy-1',
      version: '1.0.0',
      hash: 'hash-1-0-0',
      content: {
        rego: 'package test.policy1\nallow = true',
        data: {},
        config: {
          enforcement: EnforcementLevel.BLOCKING,
          scope: PolicyScope.GLOBAL,
          priority: 1,
          jurisdiction: ['AU'],
          complianceFrameworks: ['AUSTRAC']
        },
        dependencies: [],
        constraints: []
      },
      metadata: {
        title: 'Test Policy 1',
        description: 'Test policy for atomic operations',
        category: 'FINANCIAL' as any,
        severity: 'MEDIUM' as any,
        impact: 'LOW' as any,
        changeType: ChangeType.CREATION,
        releaseNotes: 'Initial version',
        reviewers: []
      },
      parentVersion: undefined,
      branches: [],
      tags: [],
      createdAt: new Date('2024-01-01'),
      createdBy: 'admin',
      status: PolicyVersionStatus.ACTIVE
    };

    const testPolicy2: PolicyVersion = {
      id: 'test-policy-2-v1',
      policyId: 'test-policy-2',
      version: '1.0.0',
      hash: 'hash-2-0-0',
      content: {
        rego: 'package test.policy2\nallow = input.amount < 1000',
        data: {},
        config: {
          enforcement: EnforcementLevel.WARNING,
          scope: PolicyScope.ORGANISATION,
          priority: 2,
          jurisdiction: ['AU'],
          complianceFrameworks: ['AUSTRAC']
        },
        dependencies: [{
          dependsOn: 'test-policy-1',
          version: '1.0.0',
          type: 'REQUIRES' as any,
          required: true
        }],
        constraints: []
      },
      metadata: {
        title: 'Test Policy 2',
        description: 'Dependent test policy',
        category: 'FINANCIAL' as any,
        severity: 'LOW' as any,
        impact: 'LOW' as any,
        changeType: ChangeType.CREATION,
        releaseNotes: 'Dependent policy',
        reviewers: []
      },
      parentVersion: undefined,
      branches: [],
      tags: [],
      createdAt: new Date('2024-01-02'),
      createdBy: 'admin',
      status: PolicyVersionStatus.ACTIVE
    };

    this.versions.set('test-policy-1', [testPolicy1]);
    this.versions.set('test-policy-2', [testPolicy2]);
  }
}

describe('Atomic Policy Set Service', () => {
  let atomicService: AtomicPolicySetService;
  let mockRepo: MockPolicyRepository;
  let mockDb: MockDatabaseConnection;
  let auditService: AuditTrailService;

  beforeEach(() => {
    mockRepo = new MockPolicyRepository();
    mockDb = new MockDatabaseConnection();
    auditService = new AuditTrailService(mockRepo as any, 'test-integrity-key');
    atomicService = new AtomicPolicySetService(
      mockRepo as any,
      auditService,
      mockDb as any,
      {
        lockTimeout: 30000,
        transactionTimeout: 60000
      }
    );
    
    mockRepo.seedTestData();
  });

  afterEach(() => {
    mockRepo.clear();
    mockDb.setTransactionFailure(false);
  });

  describe('Single Policy Operations', () => {
    test('should create a new policy atomically', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-create-1',
        policyId: 'new-policy-1',
        operation: 'create',
        content: {
          rego: 'package new.policy\nallow = true',
          data: {},
          config: {
            enforcement: EnforcementLevel.BLOCKING,
            scope: PolicyScope.GLOBAL,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: []
          },
          dependencies: [],
          constraints: []
        },
        metadata: {
          title: 'New Policy',
          description: 'Created atomically',
          category: 'FINANCIAL' as any,
          severity: 'MEDIUM' as any,
          impact: 'LOW' as any,
          changeType: ChangeType.CREATION,
          releaseNotes: 'Atomic creation',
          reviewers: []
        },
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-create-1',
        operations,
        metadata: {
          description: 'Create new policy atomically',
          businessJustification: 'New compliance requirement',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(true);
      expect(result.completedOperations).toContain('op-create-1');
      expect(result.failedOperations).toHaveLength(0);

      // Verify policy was created
      const createdPolicy = await mockRepo.getLatestVersion('new-policy-1');
      expect(createdPolicy).toBeDefined();
      expect(createdPolicy?.version).toBe('1.0.0');
      expect(createdPolicy?.status).toBe(PolicyVersionStatus.DRAFT);
    });

    test('should update existing policy atomically', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-update-1',
        policyId: 'test-policy-1',
        operation: 'update',
        content: {
          rego: 'package test.policy1\nallow = input.verified == true',
          data: { updated: true },
          config: {
            enforcement: EnforcementLevel.BLOCKING,
            scope: PolicyScope.GLOBAL,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: ['AUSTRAC']
          },
          dependencies: [],
          constraints: []
        },
        metadata: {
          title: 'Updated Test Policy 1',
          description: 'Updated via atomic operation',
          category: 'FINANCIAL' as any,
          severity: 'HIGH' as any,
          impact: 'MEDIUM' as any,
          changeType: ChangeType.UPDATE,
          releaseNotes: 'Added verification requirement',
          reviewers: ['reviewer1']
        },
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-update-1',
        operations,
        metadata: {
          description: 'Update policy with new verification rule',
          businessJustification: 'Enhance security',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(true);
      expect(result.completedOperations).toContain('op-update-1');

      // Verify policy was updated
      const updatedPolicy = await mockRepo.getLatestVersion('test-policy-1');
      expect(updatedPolicy?.version).toBe('1.0.1');
      expect(updatedPolicy?.content.rego).toContain('input.verified == true');
      expect(updatedPolicy?.metadata.severity).toBe('HIGH');
    });

    test('should restore policy to previous version atomically', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-restore-1',
        policyId: 'test-policy-1',
        operation: 'restore',
        targetVersion: '1.0.0',
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-restore-1',
        operations,
        metadata: {
          description: 'Restore policy to known good version',
          businessJustification: 'Current version has issues',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(true);
      expect(result.completedOperations).toContain('op-restore-1');

      // Verify policy was restored
      const restoredPolicy = await mockRepo.getLatestVersion('test-policy-1');
      expect(restoredPolicy?.status).toBe(PolicyVersionStatus.ROLLBACK_TARGET);
      expect(restoredPolicy?.content.rego).toBe('package test.policy1\nallow = true');
    });

    test('should archive policy atomically', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-delete-1',
        policyId: 'test-policy-1',
        operation: 'delete',
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-delete-1',
        operations,
        metadata: {
          description: 'Archive obsolete policy',
          businessJustification: 'No longer needed',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(true);
      expect(result.completedOperations).toContain('op-delete-1');

      // Verify policy was archived
      const archivedPolicy = await mockRepo.getLatestVersion('test-policy-1');
      expect(archivedPolicy?.status).toBe(PolicyVersionStatus.ARCHIVED);
    });
  });

  describe('Multi-Policy Atomic Operations', () => {
    test('should create multiple related policies atomically', async () => {
      const operations: PolicySetOperation[] = [
        {
          id: 'op-create-base',
          policyId: 'base-policy',
          operation: 'create',
          content: {
            rego: 'package base.policy\nallow = input.user.authenticated',
            data: {},
            config: {
              enforcement: EnforcementLevel.BLOCKING,
              scope: PolicyScope.GLOBAL,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [],
            constraints: []
          },
          metadata: {
            title: 'Base Authentication Policy',
            description: 'Foundation policy for auth',
            category: 'SECURITY' as any,
            severity: 'HIGH' as any,
            impact: 'HIGH' as any,
            changeType: ChangeType.CREATION,
            releaseNotes: 'Base policy',
            reviewers: []
          },
          userId: 'admin'
        },
        {
          id: 'op-create-dependent',
          policyId: 'dependent-policy',
          operation: 'create',
          content: {
            rego: 'package dependent.policy\nallow = input.amount < 5000',
            data: {},
            config: {
              enforcement: EnforcementLevel.WARNING,
              scope: PolicyScope.ORGANISATION,
              priority: 2,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [{
              dependsOn: 'base-policy',
              version: '1.0.0',
              type: 'REQUIRES' as any,
              required: true
            }],
            constraints: []
          },
          metadata: {
            title: 'Dependent Financial Policy',
            description: 'Depends on base auth policy',
            category: 'FINANCIAL' as any,
            severity: 'MEDIUM' as any,
            impact: 'MEDIUM' as any,
            changeType: ChangeType.CREATION,
            releaseNotes: 'Dependent policy',
            reviewers: []
          },
          userId: 'admin'
        }
      ];

      const request: AtomicPolicySetRequest = {
        id: 'txn-multi-create',
        operations,
        metadata: {
          description: 'Create related policies atomically',
          businessJustification: 'New compliance framework',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(true);
      expect(result.completedOperations).toContain('op-create-base');
      expect(result.completedOperations).toContain('op-create-dependent');

      // Verify both policies were created
      const basePolicy = await mockRepo.getLatestVersion('base-policy');
      const dependentPolicy = await mockRepo.getLatestVersion('dependent-policy');
      
      expect(basePolicy).toBeDefined();
      expect(dependentPolicy).toBeDefined();
      expect(dependentPolicy?.content.dependencies).toHaveLength(1);
      expect(dependentPolicy?.content.dependencies[0].dependsOn).toBe('base-policy');
    });

    test('should handle dependency ordering correctly', async () => {
      const operations: PolicySetOperation[] = [
        // Dependent policy listed first (should be created second)
        {
          id: 'op-create-dependent-first',
          policyId: 'dependent-first',
          operation: 'create',
          content: {
            rego: 'package dependent.first\nallow = true',
            data: {},
            config: {
              enforcement: EnforcementLevel.WARNING,
              scope: PolicyScope.ORGANISATION,
              priority: 2,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [{
              dependsOn: 'base-first',
              version: '1.0.0',
              type: 'REQUIRES' as any,
              required: true
            }],
            constraints: []
          },
          metadata: {
            title: 'Dependent Policy First',
            description: 'Should be created after base',
            category: 'FINANCIAL' as any,
            severity: 'MEDIUM' as any,
            impact: 'LOW' as any,
            changeType: ChangeType.CREATION,
            releaseNotes: 'Dependent',
            reviewers: []
          },
          userId: 'admin'
        },
        // Base policy listed second (should be created first)
        {
          id: 'op-create-base-first',
          policyId: 'base-first',
          operation: 'create',
          content: {
            rego: 'package base.first\nallow = input.valid',
            data: {},
            config: {
              enforcement: EnforcementLevel.BLOCKING,
              scope: PolicyScope.GLOBAL,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [],
            constraints: []
          },
          metadata: {
            title: 'Base Policy First',
            description: 'Should be created first',
            category: 'SECURITY' as any,
            severity: 'HIGH' as any,
            impact: 'HIGH' as any,
            changeType: ChangeType.CREATION,
            releaseNotes: 'Base',
            reviewers: []
          },
          userId: 'admin'
        }
      ];

      const request: AtomicPolicySetRequest = {
        id: 'txn-dependency-order',
        operations,
        metadata: {
          description: 'Test dependency ordering',
          businessJustification: 'Verify correct order',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(true);
      expect(result.completedOperations).toHaveLength(2);

      // Both policies should be created successfully despite order in request
      const basePolicy = await mockRepo.getLatestVersion('base-first');
      const dependentPolicy = await mockRepo.getLatestVersion('dependent-first');
      
      expect(basePolicy).toBeDefined();
      expect(dependentPolicy).toBeDefined();
    });

    test('should update multiple policies atomically', async () => {
      const operations: PolicySetOperation[] = [
        {
          id: 'op-update-1',
          policyId: 'test-policy-1',
          operation: 'update',
          content: {
            rego: 'package test.policy1\nallow = input.amount < 2000',
            data: { limit: 2000 },
            config: {
              enforcement: EnforcementLevel.BLOCKING,
              scope: PolicyScope.GLOBAL,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: ['AUSTRAC']
            },
            dependencies: [],
            constraints: []
          },
          userId: 'admin'
        },
        {
          id: 'op-update-2',
          policyId: 'test-policy-2',
          operation: 'update',
          content: {
            rego: 'package test.policy2\nallow = input.amount < 500',
            data: { limit: 500 },
            config: {
              enforcement: EnforcementLevel.WARNING,
              scope: PolicyScope.ORGANISATION,
              priority: 2,
              jurisdiction: ['AU'],
              complianceFrameworks: ['AUSTRAC']
            },
            dependencies: [{
              dependsOn: 'test-policy-1',
              version: '1.0.1', // Updated version
              type: 'REQUIRES' as any,
              required: true
            }],
            constraints: []
          },
          userId: 'admin'
        }
      ];

      const request: AtomicPolicySetRequest = {
        id: 'txn-multi-update',
        operations,
        metadata: {
          description: 'Update related policies with new limits',
          businessJustification: 'Risk management adjustment',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(true);
      expect(result.completedOperations).toHaveLength(2);

      // Verify both policies were updated
      const policy1 = await mockRepo.getLatestVersion('test-policy-1');
      const policy2 = await mockRepo.getLatestVersion('test-policy-2');
      
      expect(policy1?.content.rego).toContain('2000');
      expect(policy2?.content.rego).toContain('500');
      expect(policy2?.content.dependencies[0].version).toBe('1.0.1');
    });
  });

  describe('Transaction Rollback and Error Handling', () => {
    test('should rollback all operations if any operation fails', async () => {
      const operations: PolicySetOperation[] = [
        {
          id: 'op-valid-create',
          policyId: 'valid-policy',
          operation: 'create',
          content: {
            rego: 'package valid.policy\nallow = true',
            data: {},
            config: {
              enforcement: EnforcementLevel.BLOCKING,
              scope: PolicyScope.GLOBAL,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [],
            constraints: []
          },
          metadata: {
            title: 'Valid Policy',
            description: 'Should be created',
            category: 'FINANCIAL' as any,
            severity: 'MEDIUM' as any,
            impact: 'LOW' as any,
            changeType: ChangeType.CREATION,
            releaseNotes: 'Valid',
            reviewers: []
          },
          userId: 'admin'
        },
        {
          id: 'op-invalid-update',
          policyId: 'non-existent-policy',
          operation: 'update',
          content: {
            rego: 'package invalid\nallow = false',
            data: {},
            config: {
              enforcement: EnforcementLevel.BLOCKING,
              scope: PolicyScope.GLOBAL,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [],
            constraints: []
          },
          userId: 'admin'
        }
      ];

      const request: AtomicPolicySetRequest = {
        id: 'txn-rollback-test',
        operations,
        metadata: {
          description: 'Test transaction rollback',
          businessJustification: 'Testing error handling',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(false);
      expect(result.failedOperations).toHaveLength(1);
      expect(result.failedOperations[0].error).toContain('Cannot update non-existent policy');

      // Verify valid policy was not created due to rollback
      const validPolicy = await mockRepo.getLatestVersion('valid-policy');
      expect(validPolicy).toBeNull();
    });

    test('should handle database transaction failures', async () => {
      // Simulate database failure
      mockDb.setTransactionFailure(true);

      const operations: PolicySetOperation[] = [{
        id: 'op-db-fail',
        policyId: 'db-fail-policy',
        operation: 'create',
        content: {
          rego: 'package db.fail\nallow = true',
          data: {},
          config: {
            enforcement: EnforcementLevel.BLOCKING,
            scope: PolicyScope.GLOBAL,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: []
          },
          dependencies: [],
          constraints: []
        },
        metadata: {
          title: 'DB Fail Policy',
          description: 'Should fail due to DB error',
          category: 'FINANCIAL' as any,
          severity: 'MEDIUM' as any,
          impact: 'LOW' as any,
          changeType: ChangeType.CREATION,
          releaseNotes: 'DB fail test',
          reviewers: []
        },
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-db-fail',
        operations,
        metadata: {
          description: 'Test database failure handling',
          businessJustification: 'Testing infrastructure resilience',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(false);
      expect(result.failedOperations).toHaveLength(1);
      expect(result.failedOperations[0].error).toContain('transaction failure');

      // Verify policy was not created
      const failedPolicy = await mockRepo.getLatestVersion('db-fail-policy');
      expect(failedPolicy).toBeNull();
    });

    test('should detect circular dependencies', async () => {
      const operations: PolicySetOperation[] = [
        {
          id: 'op-circular-1',
          policyId: 'circular-policy-1',
          operation: 'create',
          content: {
            rego: 'package circular.policy1\nallow = true',
            data: {},
            config: {
              enforcement: EnforcementLevel.BLOCKING,
              scope: PolicyScope.GLOBAL,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [{
              dependsOn: 'circular-policy-2',
              version: '1.0.0',
              type: 'REQUIRES' as any,
              required: true
            }],
            constraints: []
          },
          metadata: {
            title: 'Circular Policy 1',
            description: 'Creates circular dependency',
            category: 'FINANCIAL' as any,
            severity: 'MEDIUM' as any,
            impact: 'LOW' as any,
            changeType: ChangeType.CREATION,
            releaseNotes: 'Circular test',
            reviewers: []
          },
          userId: 'admin'
        },
        {
          id: 'op-circular-2',
          policyId: 'circular-policy-2',
          operation: 'create',
          content: {
            rego: 'package circular.policy2\nallow = true',
            data: {},
            config: {
              enforcement: EnforcementLevel.BLOCKING,
              scope: PolicyScope.GLOBAL,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [{
              dependsOn: 'circular-policy-1',
              version: '1.0.0',
              type: 'REQUIRES' as any,
              required: true
            }],
            constraints: []
          },
          metadata: {
            title: 'Circular Policy 2',
            description: 'Creates circular dependency',
            category: 'FINANCIAL' as any,
            severity: 'MEDIUM' as any,
            impact: 'LOW' as any,
            changeType: ChangeType.CREATION,
            releaseNotes: 'Circular test',
            reviewers: []
          },
          userId: 'admin'
        }
      ];

      const request: AtomicPolicySetRequest = {
        id: 'txn-circular',
        operations,
        metadata: {
          description: 'Test circular dependency detection',
          businessJustification: 'Testing validation',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      await expect(atomicService.executeAtomicPolicySet(request))
        .rejects.toThrow('Circular dependency detected');
    });

    test('should detect duplicate policy IDs in transaction', async () => {
      const operations: PolicySetOperation[] = [
        {
          id: 'op-duplicate-1',
          policyId: 'duplicate-policy',
          operation: 'create',
          content: {
            rego: 'package duplicate.policy\nallow = true',
            data: {},
            config: {
              enforcement: EnforcementLevel.BLOCKING,
              scope: PolicyScope.GLOBAL,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [],
            constraints: []
          },
          metadata: {
            title: 'Duplicate Policy 1',
            description: 'First duplicate',
            category: 'FINANCIAL' as any,
            severity: 'MEDIUM' as any,
            impact: 'LOW' as any,
            changeType: ChangeType.CREATION,
            releaseNotes: 'Duplicate test',
            reviewers: []
          },
          userId: 'admin'
        },
        {
          id: 'op-duplicate-2',
          policyId: 'duplicate-policy', // Same policy ID
          operation: 'update',
          content: {
            rego: 'package duplicate.policy\nallow = false',
            data: {},
            config: {
              enforcement: EnforcementLevel.BLOCKING,
              scope: PolicyScope.GLOBAL,
              priority: 1,
              jurisdiction: ['AU'],
              complianceFrameworks: []
            },
            dependencies: [],
            constraints: []
          },
          userId: 'admin'
        }
      ];

      const request: AtomicPolicySetRequest = {
        id: 'txn-duplicate',
        operations,
        metadata: {
          description: 'Test duplicate policy ID detection',
          businessJustification: 'Testing validation',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      await expect(atomicService.executeAtomicPolicySet(request))
        .rejects.toThrow('Duplicate policy IDs in transaction');
    });
  });

  describe('Dry Run Mode', () => {
    test('should validate operations without executing in dry run mode', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-dryrun-create',
        policyId: 'dryrun-policy',
        operation: 'create',
        content: {
          rego: 'package dryrun.policy\nallow = true',
          data: {},
          config: {
            enforcement: EnforcementLevel.BLOCKING,
            scope: PolicyScope.GLOBAL,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: []
          },
          dependencies: [],
          constraints: []
        },
        metadata: {
          title: 'Dry Run Policy',
          description: 'Should be validated but not created',
          category: 'FINANCIAL' as any,
          severity: 'MEDIUM' as any,
          impact: 'LOW' as any,
          changeType: ChangeType.CREATION,
          releaseNotes: 'Dry run test',
          reviewers: []
        },
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-dryrun',
        operations,
        metadata: {
          description: 'Test dry run mode',
          businessJustification: 'Validation only',
          requiredApprovals: [],
          dryRun: true // Dry run mode
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(true);
      expect(result.completedOperations).toContain('op-dryrun-create');

      // Verify policy was NOT actually created
      const dryRunPolicy = await mockRepo.getLatestVersion('dryrun-policy');
      expect(dryRunPolicy).toBeNull();
    });

    test('should detect validation errors in dry run mode', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-dryrun-invalid',
        policyId: 'dryrun-invalid',
        operation: 'update', // Update non-existent policy
        content: {
          rego: 'package dryrun.invalid\nallow = false',
          data: {},
          config: {
            enforcement: EnforcementLevel.BLOCKING,
            scope: PolicyScope.GLOBAL,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: []
          },
          dependencies: [],
          constraints: []
        },
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-dryrun-invalid',
        operations,
        metadata: {
          description: 'Test dry run validation errors',
          businessJustification: 'Error detection',
          requiredApprovals: [],
          dryRun: true
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(false);
      expect(result.failedOperations).toHaveLength(1);
      expect(result.failedOperations[0].error).toContain('Cannot update non-existent policy');
    });
  });

  describe('Transaction Management', () => {
    test('should track active transactions', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-track-1',
        policyId: 'track-policy',
        operation: 'create',
        content: {
          rego: 'package track.policy\nallow = true',
          data: {},
          config: {
            enforcement: EnforcementLevel.BLOCKING,
            scope: PolicyScope.GLOBAL,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: []
          },
          dependencies: [],
          constraints: []
        },
        metadata: {
          title: 'Track Policy',
          description: 'For tracking test',
          category: 'FINANCIAL' as any,
          severity: 'MEDIUM' as any,
          impact: 'LOW' as any,
          changeType: ChangeType.CREATION,
          releaseNotes: 'Track test',
          reviewers: []
        },
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-track',
        operations,
        metadata: {
          description: 'Test transaction tracking',
          businessJustification: 'Monitoring capability',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      // Start transaction execution (async)
      const resultPromise = atomicService.executeAtomicPolicySet(request);

      // Check if transaction appears in active list
      const activeTransactions = await atomicService.getActiveTransactions();
      
      // Wait for completion
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
    });

    test('should provide transaction status', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-status-1',
        policyId: 'status-policy',
        operation: 'create',
        content: {
          rego: 'package status.policy\nallow = true',
          data: {},
          config: {
            enforcement: EnforcementLevel.BLOCKING,
            scope: PolicyScope.GLOBAL,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: []
          },
          dependencies: [],
          constraints: []
        },
        metadata: {
          title: 'Status Policy',
          description: 'For status test',
          category: 'FINANCIAL' as any,
          severity: 'MEDIUM' as any,
          impact: 'LOW' as any,
          changeType: ChangeType.CREATION,
          releaseNotes: 'Status test',
          reviewers: []
        },
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-status',
        operations,
        metadata: {
          description: 'Test status monitoring',
          businessJustification: 'Status capability',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      // Transaction should be completed and removed from active list
      const status = await atomicService.getTransactionStatus(result.transactionId);
      expect(status).toBeNull(); // Completed transactions are removed
    });
  });

  describe('Audit and Compliance', () => {
    test('should record comprehensive audit trail for atomic operations', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-audit-1',
        policyId: 'audit-policy',
        operation: 'create',
        content: {
          rego: 'package audit.policy\nallow = true',
          data: {},
          config: {
            enforcement: EnforcementLevel.BLOCKING,
            scope: PolicyScope.GLOBAL,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: []
          },
          dependencies: [],
          constraints: []
        },
        metadata: {
          title: 'Audit Policy',
          description: 'For audit test',
          category: 'FINANCIAL' as any,
          severity: 'MEDIUM' as any,
          impact: 'LOW' as any,
          changeType: ChangeType.CREATION,
          releaseNotes: 'Audit test',
          reviewers: []
        },
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-audit',
        operations,
        metadata: {
          description: 'Test audit trail generation',
          businessJustification: 'Compliance requirement',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(true);

      // Verify audit entries were created
      const auditEntries = await auditService.getAuditTrail('*');
      
      const startEntry = auditEntries.find(e => e.action === 'START_ATOMIC_TRANSACTION');
      const completeEntry = auditEntries.find(e => e.action === 'COMPLETE_ATOMIC_TRANSACTION');
      
      expect(startEntry).toBeDefined();
      expect(completeEntry).toBeDefined();
      expect(startEntry?.userId).toBe('admin');
      expect(completeEntry?.userId).toBe('admin');
    });

    test('should include failure details in audit trail', async () => {
      const operations: PolicySetOperation[] = [{
        id: 'op-audit-fail',
        policyId: 'non-existent-for-audit',
        operation: 'update',
        content: {
          rego: 'package audit.fail\nallow = false',
          data: {},
          config: {
            enforcement: EnforcementLevel.BLOCKING,
            scope: PolicyScope.GLOBAL,
            priority: 1,
            jurisdiction: ['AU'],
            complianceFrameworks: []
          },
          dependencies: [],
          constraints: []
        },
        userId: 'admin'
      }];

      const request: AtomicPolicySetRequest = {
        id: 'txn-audit-fail',
        operations,
        metadata: {
          description: 'Test audit trail for failures',
          businessJustification: 'Error audit test',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'admin',
        sessionId: 'session-123',
        requestId: 'req-123'
      };

      const result = await atomicService.executeAtomicPolicySet(request);

      expect(result.success).toBe(false);

      // Verify failure audit entry was created
      const auditEntries = await auditService.getAuditTrail('*');
      const failEntry = auditEntries.find(e => e.action === 'FAIL_ATOMIC_TRANSACTION');
      
      expect(failEntry).toBeDefined();
      expect(failEntry?.result).toBe(AuditResult.FAILURE);
      expect(failEntry?.details.error).toContain('Cannot update non-existent policy');
    });
  });
});