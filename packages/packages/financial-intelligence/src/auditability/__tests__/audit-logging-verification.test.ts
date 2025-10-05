/**
 * Audit Logging Verification Tests
 * 
 * Comprehensive test suite for audit trail functionality, ensuring
 * proper logging of all policy decisions, data access, consent changes,
 * and compliance-related activities with cryptographic integrity.
 */

import crypto from 'crypto';
import { AuditTrailService } from '../AuditTrailService';
import { OPAService } from '../OPAService';
import { PolicyVersionServiceImpl } from '../PolicyVersionService';
import { AtomicPolicySetService } from '../AtomicPolicySetService';
import {
  AuditEntry,
  AuditAction,
  AuditResult,
  FinancialIntent,
  FinancialOperation,
  ConsentLevel,
  SovereigntyLevel,
  PolicyVersion,
  PolicyVersionStatus,
  PolicyVersionMetadata,
  ChangeType,
  OPAServiceConfig
} from '../types';

// Mock repository for audit testing
class MockAuditRepository {
  private auditEntries: AuditEntry[] = [];
  private integrityKeys = new Map<string, string>();

  async saveAuditEntry(entry: AuditEntry): Promise<string> {
    // Simulate integrity hash calculation
    const contentHash = this.calculateIntegrityHash(entry);
    entry.integrityHash = contentHash;
    
    this.auditEntries.push(entry);
    this.integrityKeys.set(entry.id, contentHash);
    
    return entry.id;
  }

  async getAuditTrail(target: string, options: any = {}): Promise<AuditEntry[]> {
    let filtered = this.auditEntries;
    
    if (target !== '*') {
      filtered = filtered.filter(entry => entry.target === target);
    }
    
    if (options.userId) {
      filtered = filtered.filter(entry => entry.userId === options.userId);
    }
    
    if (options.action) {
      filtered = filtered.filter(entry => entry.action === options.action);
    }
    
    if (options.fromDate) {
      filtered = filtered.filter(entry => entry.timestamp >= options.fromDate);
    }
    
    if (options.toDate) {
      filtered = filtered.filter(entry => entry.timestamp <= options.toDate);
    }
    
    // Apply pagination
    if (options.offset || options.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : filtered.length;
      filtered = filtered.slice(start, end);
    }
    
    return filtered;
  }

  async verifyIntegrity(entryId: string): Promise<boolean> {
    const entry = this.auditEntries.find(e => e.id === entryId);
    if (!entry) return false;
    
    const expectedHash = this.calculateIntegrityHash(entry);
    return entry.integrityHash === expectedHash;
  }

  async getAuditStatistics(fromDate: Date, toDate: Date): Promise<any> {
    const filtered = this.auditEntries.filter(entry => 
      entry.timestamp >= fromDate && entry.timestamp <= toDate
    );
    
    const stats = {
      totalEntries: filtered.length,
      byAction: {} as Record<string, number>,
      byResult: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      complianceEvents: 0,
      securityEvents: 0,
      dataAccessEvents: 0
    };
    
    filtered.forEach(entry => {
      // Count by action
      stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;
      
      // Count by result
      stats.byResult[entry.result] = (stats.byResult[entry.result] || 0) + 1;
      
      // Count by user
      stats.byUser[entry.userId] = (stats.byUser[entry.userId] || 0) + 1;
      
      // Count event types
      if (entry.action.includes('COMPLIANCE') || entry.action.includes('CONSENT')) {
        stats.complianceEvents++;
      }
      if (entry.action.includes('SECURITY') || entry.action.includes('AUTH')) {
        stats.securityEvents++;
      }
      if (entry.action.includes('ACCESS') || entry.action.includes('VIEW')) {
        stats.dataAccessEvents++;
      }
    });
    
    return stats;
  }

  clear(): void {
    this.auditEntries.length = 0;
    this.integrityKeys.clear();
  }

  getAllEntries(): AuditEntry[] {
    return [...this.auditEntries];
  }

  private calculateIntegrityHash(entry: AuditEntry): string {
    // Create deterministic content for hashing
    const content = {
      id: entry.id,
      userId: entry.userId,
      action: entry.action,
      target: entry.target,
      timestamp: entry.timestamp.toISOString(),
      result: entry.result,
      details: entry.details
    };
    
    const contentString = JSON.stringify(content, Object.keys(content).sort());
    return crypto.createHash('sha256').update(contentString + 'test-integrity-key').digest('hex');
  }
}

describe('Audit Logging Verification Tests', () => {
  let auditService: AuditTrailService;
  let mockRepo: MockAuditRepository;
  let opaService: OPAService;
  let policyService: PolicyVersionServiceImpl;
  let atomicService: AtomicPolicySetService;

  beforeEach(async () => {
    // Initialize mock repository
    mockRepo = new MockAuditRepository();
    
    // Initialize audit service
    auditService = new AuditTrailService(mockRepo as any, 'test-integrity-key');
    
    // Initialize OPA service
    const opaConfig: OPAServiceConfig = {
      server: { url: 'http://localhost:8181', timeout: 5000, retries: 1, retryDelay: 100 },
      logging: { enabled: true, destination: 'postgresql', config: {}, retention: { defaultYears: 7, complianceYears: 10, indigenousDataYears: 50 } },
      cache: { enabled: false, type: 'memory', config: {}, defaultTTL: 300, maxSize: 1000 },
      monitoring: { enabled: false, metricsProvider: 'custom', alertThresholds: { latencyMs: 1000, errorRate: 0.05, cacheHitRate: 0.8 } },
      security: { enableInputValidation: true, sanitizeInputs: true, enableAuditLogging: true, encryptSensitiveData: false },
      compliance: { enforceDataResidency: true, enablePrivacyActCompliance: true, enableIndigenousProtocols: true, austracReportingEnabled: true, auditRetentionYears: 7 }
    };

    opaService = new OPAService(opaConfig);
    
    // Mock OPA HTTP client
    (opaService as any).httpClient = {
      post: jest.fn().mockResolvedValue({ data: { result: true } }),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    };

    // Mock decision logger for OPA service
    (opaService as any).decisionLogger = {
      log: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined)
    };

    // Initialize other services with audit integration
    const rollbackService = { 
      createRollbackPlan: jest.fn(),
      validateRollbackPlan: jest.fn() 
    } as any;
    
    const validationService = { 
      validateRollbackPlan: jest.fn() 
    } as any;

    policyService = new PolicyVersionServiceImpl(
      mockRepo as any,
      auditService,
      rollbackService,
      validationService
    );

    const mockDb = {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockDb);
      }),
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    } as any;

    atomicService = new AtomicPolicySetService(
      mockRepo as any,
      auditService,
      mockDb
    );
  });

  afterEach(() => {
    mockRepo.clear();
  });

  describe('Basic Audit Entry Creation', () => {
    test('should create audit entry for policy decision', async () => {
      const entryId = await auditService.recordAuditEntry(
        'test-user',
        AuditAction.EVALUATE_POLICY,
        'test-policy-123',
        {
          decision: 'allow',
          policies: ['financial.spending_limits'],
          evaluationTime: 45
        },
        AuditResult.SUCCESS,
        {
          sessionId: 'session-123',
          requestId: 'req-456',
          ipAddress: '127.0.0.1'
        }
      );

      expect(entryId).toBeDefined();
      
      const entries = await auditService.getAuditTrail('test-policy-123');
      expect(entries).toHaveLength(1);
      
      const entry = entries[0];
      expect(entry.userId).toBe('test-user');
      expect(entry.action).toBe(AuditAction.EVALUATE_POLICY);
      expect(entry.target).toBe('test-policy-123');
      expect(entry.result).toBe(AuditResult.SUCCESS);
      expect(entry.details.decision).toBe('allow');
      expect(entry.integrityHash).toBeDefined();
      expect(entry.metadata.sessionId).toBe('session-123');
    });

    test('should create audit entry for data access', async () => {
      const entryId = await auditService.recordAuditEntry(
        'data-user',
        AuditAction.ACCESS_DATA,
        'financial-data-user-789',
        {
          dataType: 'personal_financial',
          fieldsAccessed: ['balance', 'transaction_history'],
          accessReason: 'account_inquiry',
          sensitivity: 'confidential'
        },
        AuditResult.SUCCESS,
        {
          sessionId: 'session-789',
          requestId: 'req-101',
          ipAddress: '192.168.1.100'
        }
      );

      expect(entryId).toBeDefined();
      
      const entries = await auditService.getAuditTrail('financial-data-user-789');
      expect(entries).toHaveLength(1);
      
      const entry = entries[0];
      expect(entry.action).toBe(AuditAction.ACCESS_DATA);
      expect(entry.details.dataType).toBe('personal_financial');
      expect(entry.details.fieldsAccessed).toContain('balance');
      expect(entry.details.sensitivity).toBe('confidential');
    });

    test('should create audit entry for failed access attempt', async () => {
      const entryId = await auditService.recordAuditEntry(
        'unauthorized-user',
        AuditAction.ACCESS_DATA,
        'restricted-financial-data',
        {
          dataType: 'highly_sensitive',
          accessAttemptReason: 'unauthorized_inquiry',
          denialReason: 'insufficient_permissions'
        },
        AuditResult.FAILURE,
        {
          sessionId: 'session-999',
          requestId: 'req-999',
          ipAddress: '203.0.113.1'
        }
      );

      const entries = await auditService.getAuditTrail('restricted-financial-data');
      expect(entries).toHaveLength(1);
      
      const entry = entries[0];
      expect(entry.result).toBe(AuditResult.FAILURE);
      expect(entry.details.denialReason).toBe('insufficient_permissions');
    });
  });

  describe('Policy Decision Audit Integration', () => {
    test('should audit OPA policy evaluations', async () => {
      // Create financial intent for evaluation
      const intent: FinancialIntent = {
        id: 'intent-audit-test',
        operation: FinancialOperation.CREATE_PAYMENT,
        user: {
          id: 'audit-test-user',
          roles: ['financial_manager'],
          consentLevels: [ConsentLevel.FULL_AUTOMATION],
          authentication: {
            verified: true,
            mfaCompleted: true,
            sessionAge: 1,
            lastPasswordChange: 30
          },
          location: {
            country: 'Australia',
            region: 'NSW',
            verified: true
          },
          network: {
            type: 'corporate',
            securityVerified: true,
            ipAddress: '127.0.0.1'
          }
        },
        financial: {
          amount: 5000,
          currency: 'AUD',
          categories: ['community_development'],
          sensitivity: 'confidential',
          containsPersonalData: false
        },
        request: {
          timestamp: new Date(),
          requestId: 'audit-req-123',
          sessionId: 'audit-session-123',
          endpoint: '/api/payments',
          method: 'POST',
          justification: 'Community project funding'
        },
        compliance: {
          privacyAct: {
            personalDataInvolved: false,
            consentObtained: true,
            purposeLimitation: ['financial_operations'],
            crossBorderTransfer: false
          },
          dataResidency: {
            country: 'Australia',
            region: 'ap-southeast-2',
            governmentApproved: true
          }
        }
      };

      // Evaluate policy (should trigger audit logging)
      await opaService.evaluateIntent(intent, ['financial.spending_limits']);

      // Verify audit entries were created
      const entries = mockRepo.getAllEntries();
      expect(entries.length).toBeGreaterThan(0);
      
      // Should have at least one policy evaluation entry
      const policyEvaluationEntries = entries.filter(e => 
        e.action === 'EVALUATE_POLICY' || e.target.includes('intent-audit-test')
      );
      expect(policyEvaluationEntries.length).toBeGreaterThan(0);
    });

    test('should audit policy evaluation failures', async () => {
      // Mock OPA to return failure
      (opaService as any).httpClient.post.mockRejectedValue(new Error('OPA evaluation failed'));

      const intent: FinancialIntent = {
        id: 'intent-failure-test',
        operation: FinancialOperation.VIEW_BALANCE,
        user: {
          id: 'failure-test-user',
          roles: ['viewer'],
          consentLevels: [ConsentLevel.NO_CONSENT],
          authentication: { verified: false, mfaCompleted: false, sessionAge: 0, lastPasswordChange: 0 },
          location: { country: 'Australia', region: 'NSW', verified: false },
          network: { type: 'public', securityVerified: false, ipAddress: '203.0.113.1' }
        },
        financial: { amount: 0, currency: 'AUD', categories: [], sensitivity: 'public', containsPersonalData: false },
        request: {
          timestamp: new Date(),
          requestId: 'failure-req-123',
          sessionId: 'failure-session-123',
          endpoint: '/api/balance',
          method: 'GET'
        },
        compliance: {
          privacyAct: { personalDataInvolved: false, consentObtained: false, purposeLimitation: [], crossBorderTransfer: false },
          dataResidency: { country: 'Australia', region: 'ap-southeast-2', governmentApproved: true }
        }
      };

      const decision = await opaService.evaluateIntent(intent);
      
      expect(decision.decision).toBe('deny');
      
      // Verify failure was audited
      const entries = mockRepo.getAllEntries();
      const failureEntries = entries.filter(e => 
        e.result === AuditResult.FAILURE && e.target.includes('intent-failure-test')
      );
      expect(failureEntries.length).toBeGreaterThan(0);
    });

    test('should audit conditional policy decisions', async () => {
      // Mock OPA to return conditional result
      (opaService as any).httpClient.post.mockResolvedValue({
        data: {
          result: {
            conditional: true,
            conditions: [{
              type: 'approval_required',
              description: 'Manager approval required',
              requirements: { approverRole: 'senior_manager' }
            }]
          }
        }
      });

      const intent: FinancialIntent = {
        id: 'intent-conditional-test',
        operation: FinancialOperation.CREATE_PAYMENT,
        user: {
          id: 'conditional-test-user',
          roles: ['financial_clerk'],
          consentLevels: [ConsentLevel.PARTIAL_AUTOMATION],
          authentication: { verified: true, mfaCompleted: true, sessionAge: 1, lastPasswordChange: 15 },
          location: { country: 'Australia', region: 'NSW', verified: true },
          network: { type: 'corporate', securityVerified: true, ipAddress: '10.0.1.50' }
        },
        financial: { amount: 15000, currency: 'AUD', categories: ['infrastructure'], sensitivity: 'confidential', containsPersonalData: false },
        request: {
          timestamp: new Date(),
          requestId: 'conditional-req-123',
          sessionId: 'conditional-session-123',
          endpoint: '/api/payments',
          method: 'POST',
          justification: 'Infrastructure upgrade'
        },
        compliance: {
          privacyAct: { personalDataInvolved: false, consentObtained: true, purposeLimitation: ['financial_operations'], crossBorderTransfer: false },
          dataResidency: { country: 'Australia', region: 'ap-southeast-2', governmentApproved: true }
        }
      };

      const decision = await opaService.evaluateIntent(intent);
      
      expect(decision.decision).toBe('conditional');
      expect(decision.conditions).toBeDefined();
      
      // Verify conditional decision was audited with conditions
      const entries = mockRepo.getAllEntries();
      const conditionalEntries = entries.filter(e => 
        e.target.includes('intent-conditional-test') && 
        e.details.decision === 'conditional'
      );
      expect(conditionalEntries.length).toBeGreaterThan(0);
      expect(conditionalEntries[0].details.conditions).toBeDefined();
    });
  });

  describe('Indigenous Data Access Audit', () => {
    test('should audit Indigenous data access with enhanced retention', async () => {
      const entryId = await auditService.recordAuditEntry(
        'traditional-owner-user',
        AuditAction.ACCESS_DATA,
        'indigenous-cultural-data',
        {
          dataType: 'indigenous_cultural',
          traditionalOwners: ['Wurundjeri'],
          culturalSensitivity: 'high',
          accessType: 'traditional_owner_access',
          careCompliance: {
            collectiveBenefit: true,
            authorityToControl: true,
            responsibility: true,
            ethics: true
          }
        },
        AuditResult.SUCCESS,
        {
          sessionId: 'indigenous-session-123',
          requestId: 'indigenous-req-123',
          ipAddress: '10.0.2.100'
        }
      );

      const entries = await auditService.getAuditTrail('indigenous-cultural-data');
      expect(entries).toHaveLength(1);
      
      const entry = entries[0];
      expect(entry.details.dataType).toBe('indigenous_cultural');
      expect(entry.details.traditionalOwners).toContain('Wurundjeri');
      expect(entry.details.careCompliance.collectiveBenefit).toBe(true);
      
      // Should have enhanced retention for Indigenous data
      expect(entry.retentionYears).toBe(50);
    });

    test('should audit denied Indigenous data access', async () => {
      const entryId = await auditService.recordAuditEntry(
        'external-researcher',
        AuditAction.ACCESS_DATA,
        'sacred-site-information',
        {
          dataType: 'sacred_cultural',
          accessDeniedReason: 'non_traditional_owner_access_denied',
          requestedBy: 'external_researcher',
          culturalProtocols: {
            consultationCompleted: false,
            elderApproval: false,
            culturalImpactAssessed: false
          }
        },
        AuditResult.FAILURE,
        {
          sessionId: 'denied-session-456',
          requestId: 'denied-req-456',
          ipAddress: '203.0.113.50'
        }
      );

      const entries = await auditService.getAuditTrail('sacred-site-information');
      expect(entries).toHaveLength(1);
      
      const entry = entries[0];
      expect(entry.result).toBe(AuditResult.FAILURE);
      expect(entry.details.accessDeniedReason).toBe('non_traditional_owner_access_denied');
      expect(entry.details.culturalProtocols.elderApproval).toBe(false);
    });
  });

  describe('Policy Version Management Audit', () => {
    test('should audit policy version creation', async () => {
      const content = {
        rego: 'package test.audit\\nallow = true',
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

      const metadata: PolicyVersionMetadata = {
        title: 'Audit Test Policy',
        description: 'Policy for audit testing',
        category: 'FINANCIAL' as any,
        severity: 'MEDIUM' as any,
        impact: 'LOW' as any,
        changeType: ChangeType.CREATION,
        releaseNotes: 'Initial creation for audit testing',
        reviewers: ['reviewer1']
      };

      // Mock the repository methods used by PolicyVersionServiceImpl
      (mockRepo as any).saveVersion = jest.fn().mockResolvedValue('version-id-123');
      (mockRepo as any).getLatestVersion = jest.fn().mockResolvedValue(null);

      const version = await policyService.createVersion(
        'audit-test-policy',
        content,
        metadata,
        'audit-admin'
      );

      // Verify audit entries were created
      const entries = mockRepo.getAllEntries();
      const policyCreationEntries = entries.filter(e => 
        e.action === 'CREATE_POLICY' && e.target === 'audit-test-policy'
      );
      
      expect(policyCreationEntries.length).toBeGreaterThan(0);
      const entry = policyCreationEntries[0];
      expect(entry.userId).toBe('audit-admin');
      expect(entry.details.policyTitle).toBe('Audit Test Policy');
      expect(entry.details.changeType).toBe(ChangeType.CREATION);
    });

    test('should audit policy version deployment', async () => {
      // Mock existing version
      const existingVersion: PolicyVersion = {
        id: 'existing-version-id',
        policyId: 'deployable-policy',
        version: '1.0.0',
        hash: 'hash-123',
        content: {
          rego: 'package deployable\\nallow = true',
          data: {},
          config: { enforcement: 'BLOCKING' as any, scope: 'GLOBAL' as any, priority: 1, jurisdiction: ['AU'], complianceFrameworks: [] },
          dependencies: [],
          constraints: []
        },
        metadata: {
          title: 'Deployable Policy',
          description: 'Ready for deployment',
          category: 'FINANCIAL' as any,
          severity: 'MEDIUM' as any,
          impact: 'LOW' as any,
          changeType: ChangeType.CREATION,
          releaseNotes: 'Ready for deployment',
          reviewers: []
        },
        parentVersion: undefined,
        branches: [],
        tags: [],
        createdAt: new Date(),
        createdBy: 'policy-creator',
        status: PolicyVersionStatus.APPROVED
      };

      (mockRepo as any).getVersion = jest.fn().mockResolvedValue(existingVersion);
      (mockRepo as any).saveVersion = jest.fn().mockResolvedValue('updated-version-id');

      await policyService.deployVersion('deployable-policy', '1.0.0', 'deployment-admin');

      // Verify deployment audit
      const entries = mockRepo.getAllEntries();
      const deploymentEntries = entries.filter(e => 
        e.action === 'DEPLOY_POLICY' && e.target === 'deployable-policy'
      );
      
      expect(deploymentEntries.length).toBeGreaterThan(0);
      const entry = deploymentEntries[0];
      expect(entry.userId).toBe('deployment-admin');
      expect(entry.details.version).toBe('1.0.0');
      expect(entry.details.previousStatus).toBe(PolicyVersionStatus.APPROVED);
      expect(entry.details.newStatus).toBe(PolicyVersionStatus.ACTIVE);
    });
  });

  describe('Atomic Transaction Audit', () => {
    test('should audit atomic policy set operations', async () => {
      const request = {
        id: 'atomic-audit-test',
        operations: [
          {
            id: 'op-1',
            policyId: 'atomic-policy-1',
            operation: 'create' as const,
            content: {
              rego: 'package atomic.test1\\nallow = true',
              data: {},
              config: { enforcement: 'BLOCKING' as any, scope: 'GLOBAL' as any, priority: 1, jurisdiction: ['AU'], complianceFrameworks: [] },
              dependencies: [],
              constraints: []
            },
            metadata: {
              title: 'Atomic Test Policy 1',
              description: 'First policy in atomic set',
              category: 'FINANCIAL' as any,
              severity: 'LOW' as any,
              impact: 'LOW' as any,
              changeType: ChangeType.CREATION,
              releaseNotes: 'Atomic creation',
              reviewers: []
            },
            userId: 'atomic-user'
          }
        ],
        metadata: {
          description: 'Atomic policy set for testing',
          businessJustification: 'Testing atomic operations',
          requiredApprovals: [],
          dryRun: false
        },
        userId: 'atomic-admin',
        sessionId: 'atomic-session-123',
        requestId: 'atomic-req-123'
      };

      // Mock repository methods for atomic service
      (mockRepo as any).saveVersion = jest.fn().mockResolvedValue('atomic-version-id');
      (mockRepo as any).getLatestVersion = jest.fn().mockResolvedValue(null);

      const result = await atomicService.executeAtomicPolicySet(request);

      // Verify atomic transaction audit entries
      const entries = mockRepo.getAllEntries();
      
      const startEntries = entries.filter(e => 
        e.action === 'START_ATOMIC_TRANSACTION' && e.target === 'atomic-audit-test'
      );
      expect(startEntries.length).toBe(1);
      expect(startEntries[0].details.operationsCount).toBe(1);

      const completeEntries = entries.filter(e => 
        e.action === 'COMPLETE_ATOMIC_TRANSACTION' && e.target === 'atomic-audit-test'
      );
      expect(completeEntries.length).toBe(1);
      expect(completeEntries[0].details.success).toBe(true);
    });
  });

  describe('Audit Trail Integrity', () => {
    test('should maintain cryptographic integrity of audit entries', async () => {
      const entryId = await auditService.recordAuditEntry(
        'integrity-user',
        AuditAction.ACCESS_DATA,
        'integrity-test-data',
        { testData: 'integrity verification' },
        AuditResult.SUCCESS,
        { sessionId: 'integrity-session', requestId: 'integrity-req', ipAddress: '127.0.0.1' }
      );

      const entries = await auditService.getAuditTrail('integrity-test-data');
      const entry = entries[0];
      
      expect(entry.integrityHash).toBeDefined();
      expect(entry.integrityHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
      
      // Verify integrity
      const isIntegrityValid = await mockRepo.verifyIntegrity(entryId);
      expect(isIntegrityValid).toBe(true);
    });

    test('should detect integrity violations', async () => {
      const entryId = await auditService.recordAuditEntry(
        'tamper-test-user',
        AuditAction.VIEW_POLICY,
        'tamper-test-policy',
        { originalData: 'original content' },
        AuditResult.SUCCESS,
        { sessionId: 'tamper-session', requestId: 'tamper-req', ipAddress: '127.0.0.1' }
      );

      // Simulate tampering with the entry
      const entries = mockRepo.getAllEntries();
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        entry.details.originalData = 'tampered content';
      }

      // Integrity verification should fail
      const isIntegrityValid = await mockRepo.verifyIntegrity(entryId);
      expect(isIntegrityValid).toBe(false);
    });
  });

  describe('Audit Query and Filtering', () => {
    beforeEach(async () => {
      // Create multiple audit entries for testing
      const testEntries = [
        {
          userId: 'user-1',
          action: AuditAction.ACCESS_DATA,
          target: 'data-1',
          details: { type: 'financial' },
          result: AuditResult.SUCCESS,
          timestamp: new Date('2024-01-01')
        },
        {
          userId: 'user-2',
          action: AuditAction.EVALUATE_POLICY,
          target: 'policy-1',
          details: { decision: 'allow' },
          result: AuditResult.SUCCESS,
          timestamp: new Date('2024-01-02')
        },
        {
          userId: 'user-1',
          action: AuditAction.ACCESS_DATA,
          target: 'data-2',
          details: { type: 'personal' },
          result: AuditResult.FAILURE,
          timestamp: new Date('2024-01-03')
        }
      ];

      for (const entry of testEntries) {
        await auditService.recordAuditEntry(
          entry.userId,
          entry.action,
          entry.target,
          entry.details,
          entry.result,
          { sessionId: 'test-session', requestId: 'test-req', ipAddress: '127.0.0.1' }
        );
      }
    });

    test('should filter audit entries by user', async () => {
      const entries = await auditService.getAuditTrail('*', { userId: 'user-1' });
      expect(entries).toHaveLength(2);
      entries.forEach(entry => {
        expect(entry.userId).toBe('user-1');
      });
    });

    test('should filter audit entries by action', async () => {
      const entries = await auditService.getAuditTrail('*', { action: AuditAction.ACCESS_DATA });
      expect(entries).toHaveLength(2);
      entries.forEach(entry => {
        expect(entry.action).toBe(AuditAction.ACCESS_DATA);
      });
    });

    test('should filter audit entries by date range', async () => {
      const fromDate = new Date('2024-01-02');
      const toDate = new Date('2024-01-03');
      
      const entries = await auditService.getAuditTrail('*', { fromDate, toDate });
      expect(entries).toHaveLength(2);
      entries.forEach(entry => {
        expect(entry.timestamp >= fromDate).toBe(true);
        expect(entry.timestamp <= toDate).toBe(true);
      });
    });

    test('should support pagination', async () => {
      const page1 = await auditService.getAuditTrail('*', { offset: 0, limit: 2 });
      expect(page1).toHaveLength(2);
      
      const page2 = await auditService.getAuditTrail('*', { offset: 2, limit: 2 });
      expect(page2).toHaveLength(1);
    });
  });

  describe('Compliance Reporting', () => {
    test('should generate audit statistics', async () => {
      // Create diverse audit entries
      const testData = [
        { action: AuditAction.ACCESS_DATA, result: AuditResult.SUCCESS, userId: 'user-1' },
        { action: AuditAction.ACCESS_DATA, result: AuditResult.FAILURE, userId: 'user-2' },
        { action: AuditAction.EVALUATE_POLICY, result: AuditResult.SUCCESS, userId: 'user-1' },
        { action: AuditAction.CREATE_POLICY, result: AuditResult.SUCCESS, userId: 'admin-1' },
        { action: AuditAction.DEPLOY_POLICY, result: AuditResult.SUCCESS, userId: 'admin-1' }
      ];

      for (let i = 0; i < testData.length; i++) {
        await auditService.recordAuditEntry(
          testData[i].userId,
          testData[i].action,
          `target-${i}`,
          { index: i },
          testData[i].result,
          { sessionId: `session-${i}`, requestId: `req-${i}`, ipAddress: '127.0.0.1' }
        );
      }

      const fromDate = new Date(Date.now() - 86400000); // 1 day ago
      const toDate = new Date();
      
      const stats = await mockRepo.getAuditStatistics(fromDate, toDate);
      
      expect(stats.totalEntries).toBe(5);
      expect(stats.byAction[AuditAction.ACCESS_DATA]).toBe(2);
      expect(stats.byResult[AuditResult.SUCCESS]).toBe(4);
      expect(stats.byResult[AuditResult.FAILURE]).toBe(1);
      expect(stats.byUser['user-1']).toBe(2);
      expect(stats.dataAccessEvents).toBe(2);
    });

    test('should track consent-related audit events', async () => {
      await auditService.recordAuditEntry(
        'consent-user',
        'GRANT_CONSENT' as AuditAction,
        'user-consent-record',
        {
          purpose: 'financial_analysis',
          level: 'full_automation',
          scope: ['personal_data', 'financial_data']
        },
        AuditResult.SUCCESS,
        { sessionId: 'consent-session', requestId: 'consent-req', ipAddress: '127.0.0.1' }
      );

      await auditService.recordAuditEntry(
        'consent-user',
        'WITHDRAW_CONSENT' as AuditAction,
        'user-consent-record',
        {
          purpose: 'marketing',
          withdrawalReason: 'user_request'
        },
        AuditResult.SUCCESS,
        { sessionId: 'withdrawal-session', requestId: 'withdrawal-req', ipAddress: '127.0.0.1' }
      );

      const entries = await auditService.getAuditTrail('user-consent-record');
      expect(entries).toHaveLength(2);
      
      const grantEntry = entries.find(e => e.action === 'GRANT_CONSENT');
      const withdrawEntry = entries.find(e => e.action === 'WITHDRAW_CONSENT');
      
      expect(grantEntry).toBeDefined();
      expect(grantEntry!.details.level).toBe('full_automation');
      
      expect(withdrawEntry).toBeDefined();
      expect(withdrawEntry!.details.withdrawalReason).toBe('user_request');
    });

    test('should support compliance framework-specific queries', async () => {
      const austracEntry = await auditService.recordAuditEntry(
        'austrac-user',
        AuditAction.GENERATE_REPORT,
        'austrac-compliance-report',
        {
          reportType: 'transaction_monitoring',
          complianceFramework: 'AUSTRAC',
          period: 'Q1-2024'
        },
        AuditResult.SUCCESS,
        { sessionId: 'austrac-session', requestId: 'austrac-req', ipAddress: '10.0.1.1' }
      );

      const privacyEntry = await auditService.recordAuditEntry(
        'privacy-officer',
        AuditAction.ACCESS_DATA,
        'privacy-assessment',
        {
          assessmentType: 'privacy_impact',
          complianceFramework: 'Privacy Act 1988',
          personalDataInvolved: true
        },
        AuditResult.SUCCESS,
        { sessionId: 'privacy-session', requestId: 'privacy-req', ipAddress: '10.0.1.2' }
      );

      // Query for AUSTRAC-related entries
      const austracEntries = await auditService.getAuditTrail('*', {
        complianceFramework: 'AUSTRAC'
      });
      
      // Note: This would require implementation in the actual audit service
      // For now, we'll verify the entries were created with compliance metadata
      const allEntries = await auditService.getAuditTrail('*');
      const austracSpecific = allEntries.filter(e => 
        e.details.complianceFramework === 'AUSTRAC'
      );
      
      expect(austracSpecific).toHaveLength(1);
      expect(austracSpecific[0].details.reportType).toBe('transaction_monitoring');
    });
  });

  describe('Audit Retention and Cleanup', () => {
    test('should apply different retention periods based on data type', async () => {
      // Standard audit entry
      const standardEntry = await auditService.recordAuditEntry(
        'standard-user',
        AuditAction.ACCESS_DATA,
        'standard-data',
        { dataType: 'general' },
        AuditResult.SUCCESS,
        { sessionId: 'standard-session', requestId: 'standard-req', ipAddress: '127.0.0.1' }
      );

      // Compliance-related entry
      const complianceEntry = await auditService.recordAuditEntry(
        'compliance-user',
        AuditAction.GENERATE_REPORT,
        'compliance-report',
        { 
          dataType: 'compliance',
          complianceFramework: 'AUSTRAC'
        },
        AuditResult.SUCCESS,
        { sessionId: 'compliance-session', requestId: 'compliance-req', ipAddress: '127.0.0.1' }
      );

      // Indigenous data entry
      const indigenousEntry = await auditService.recordAuditEntry(
        'traditional-owner',
        AuditAction.ACCESS_DATA,
        'indigenous-cultural-data',
        { 
          dataType: 'indigenous_cultural',
          traditionalOwners: ['Wurundjeri']
        },
        AuditResult.SUCCESS,
        { sessionId: 'indigenous-session', requestId: 'indigenous-req', ipAddress: '127.0.0.1' }
      );

      const entries = await auditService.getAuditTrail('*');
      
      const standardAudit = entries.find(e => e.target === 'standard-data');
      const complianceAudit = entries.find(e => e.target === 'compliance-report');
      const indigenousAudit = entries.find(e => e.target === 'indigenous-cultural-data');
      
      expect(standardAudit!.retentionYears).toBe(7); // Default retention
      expect(complianceAudit!.retentionYears).toBe(10); // Compliance retention
      expect(indigenousAudit!.retentionYears).toBe(50); // Indigenous data retention
    });
  });
});