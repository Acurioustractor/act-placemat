/**
 * System Integration Tests
 * 
 * Comprehensive integration test suite verifying that all components
 * of the financial intelligence system work together seamlessly,
 * including policy enforcement, data transformation, audit logging,
 * consent management, and compliance reporting.
 */

import request from 'supertest';
import express from 'express';
import { createServer, Server } from 'http';
import { OPAService } from '../OPAService';
import { TransformationEngine, createDefaultTransformationConfig } from '../transformation/TransformationEngine';
import { AuditTrailService } from '../AuditTrailService';
import { PolicyVersionServiceImpl } from '../PolicyVersionService';
import { RollbackService } from '../RollbackService';
import { AtomicPolicySetService } from '../AtomicPolicySetService';
import { MiddlewareFactory } from '../middleware/MiddlewareFactory';
import {
  FinancialIntent,
  FinancialOperation,
  ConsentLevel,
  SovereigntyLevel,
  OPAServiceConfig,
  TransformationContext,
  PolicyVersion,
  PolicyVersionStatus,
  AuditAction,
  AuditResult,
  ChangeType
} from '../types';

// Comprehensive mock repository for full system integration
class IntegratedMockRepository {
  private policies = new Map<string, PolicyVersion>();
  private auditEntries: any[] = [];
  private consents = new Map<string, any>();
  private transformationCache = new Map<string, any>();
  private systemMetrics = {
    policyEvaluations: 0,
    transformations: 0,
    auditEntries: 0,
    cacheHits: 0,
    errors: 0
  };

  // Policy management
  async saveVersion(version: PolicyVersion): Promise<string> {
    this.policies.set(version.id, version);
    return version.id;
  }

  async getVersion(policyId: string, version: string): Promise<PolicyVersion | null> {
    for (const policy of this.policies.values()) {
      if (policy.policyId === policyId && policy.version === version) {
        return policy;
      }
    }
    return null;
  }

  async getLatestVersion(policyId: string): Promise<PolicyVersion | null> {
    const versions = Array.from(this.policies.values())
      .filter(p => p.policyId === policyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return versions.length > 0 ? versions[0] : null;
  }

  async getAllVersions(policyId: string): Promise<PolicyVersion[]> {
    return Array.from(this.policies.values()).filter(p => p.policyId === policyId);
  }

  async deleteVersion(policyId: string, version: string): Promise<boolean> {
    for (const [id, policy] of this.policies.entries()) {
      if (policy.policyId === policyId && policy.version === version) {
        this.policies.delete(id);
        return true;
      }
    }
    return false;
  }

  // Audit management
  async saveAuditEntry(entry: any): Promise<string> {
    this.auditEntries.push(entry);
    this.systemMetrics.auditEntries++;
    return entry.id;
  }

  async getAuditTrail(target: string, options: any = {}): Promise<any[]> {
    let filtered = this.auditEntries;
    
    if (target !== '*') {
      filtered = filtered.filter(entry => entry.target === target);
    }
    
    if (options.userId) {
      filtered = filtered.filter(entry => entry.userId === options.userId);
    }
    
    if (options.fromDate) {
      filtered = filtered.filter(entry => entry.timestamp >= options.fromDate);
    }
    
    if (options.toDate) {
      filtered = filtered.filter(entry => entry.timestamp <= options.toDate);
    }
    
    return filtered;
  }

  // Consent management
  async saveConsent(consent: any): Promise<string> {
    const key = `${consent.userId}:${consent.purpose}`;
    this.consents.set(key, consent);
    return consent.id;
  }

  async getConsent(userId: string, purpose: string): Promise<any> {
    const key = `${userId}:${purpose}`;
    return this.consents.get(key) || null;
  }

  // Cache management
  setCacheEntry(key: string, value: any): void {
    this.transformationCache.set(key, value);
  }

  getCacheEntry(key: string): any {
    const hit = this.transformationCache.has(key);
    if (hit) {
      this.systemMetrics.cacheHits++;
      return this.transformationCache.get(key);
    }
    return null;
  }

  // Metrics
  incrementPolicyEvaluations(): void {
    this.systemMetrics.policyEvaluations++;
  }

  incrementTransformations(): void {
    this.systemMetrics.transformations++;
  }

  incrementErrors(): void {
    this.systemMetrics.errors++;
  }

  getMetrics(): any {
    return { ...this.systemMetrics };
  }

  clear(): void {
    this.policies.clear();
    this.auditEntries.length = 0;
    this.consents.clear();
    this.transformationCache.clear();
    this.systemMetrics = {
      policyEvaluations: 0,
      transformations: 0,
      auditEntries: 0,
      cacheHits: 0,
      errors: 0
    };
  }

  // Test data seeding
  seedIntegrationTestData(): void {
    // Seed basic policies
    this.saveVersion({
      id: 'policy-financial-limits',
      policyId: 'financial.spending_limits',
      version: '1.0.0',
      hash: 'hash-financial-limits',
      content: {
        rego: 'package financial.spending_limits\nallow = input.amount < 10000',
        data: {},
        config: {
          enforcement: 'BLOCKING',
          scope: 'GLOBAL',
          priority: 100,
          jurisdiction: ['AU'],
          complianceFrameworks: ['AUSTRAC']
        },
        dependencies: [],
        constraints: []
      },
      metadata: {
        title: 'Financial Spending Limits',
        description: 'Enforces spending limits for financial transactions',
        category: 'FINANCIAL',
        severity: 'MEDIUM',
        impact: 'HIGH',
        changeType: ChangeType.CREATION,
        releaseNotes: 'Initial policy creation',
        reviewers: ['policy-admin']
      },
      parentVersion: undefined,
      branches: [],
      tags: ['production'],
      createdAt: new Date(),
      createdBy: 'system',
      status: PolicyVersionStatus.ACTIVE
    } as PolicyVersion);

    // Seed consent records
    this.saveConsent({
      id: 'consent-full-user',
      userId: 'integrated-test-user',
      purpose: 'financial_operations',
      level: ConsentLevel.FULL_AUTOMATION,
      scope: ['personal_data', 'financial_data'],
      grantedAt: new Date(),
      status: 'active',
      metadata: {
        ipAddress: '127.0.0.1',
        userAgent: 'integration-test',
        sessionId: 'integration-session',
        consentMethod: 'explicit',
        lawfulBasis: ['consent']
      }
    });

    this.saveConsent({
      id: 'consent-traditional-owner',
      userId: 'traditional-owner-user',
      purpose: 'cultural_data_access',
      level: ConsentLevel.FULL_AUTOMATION,
      scope: ['cultural_data', 'traditional_knowledge'],
      grantedAt: new Date(),
      status: 'active',
      metadata: {
        ipAddress: '127.0.0.1',
        userAgent: 'integration-test',
        sessionId: 'cultural-session',
        consentMethod: 'traditional_owner_authority',
        lawfulBasis: ['traditional_owner_consent']
      }
    });
  }
}

describe('System Integration Tests', () => {
  let app: express.Application;
  let server: Server;
  let integratedRepo: IntegratedMockRepository;
  let opaService: OPAService;
  let transformationEngine: TransformationEngine;
  let auditService: AuditTrailService;
  let policyService: PolicyVersionServiceImpl;
  let atomicService: AtomicPolicySetService;

  beforeEach(async () => {
    // Initialize integrated repository
    integratedRepo = new IntegratedMockRepository();
    integratedRepo.seedIntegrationTestData();

    // Initialize OPA service
    const opaConfig: OPAServiceConfig = {
      server: { url: 'http://localhost:8181', timeout: 5000, retries: 2, retryDelay: 100 },
      logging: { enabled: true, destination: 'postgresql', config: {}, retention: { defaultYears: 7, complianceYears: 10, indigenousDataYears: 50 } },
      cache: { enabled: true, type: 'memory', config: {}, defaultTTL: 300, maxSize: 1000 },
      monitoring: { enabled: true, metricsProvider: 'custom', alertThresholds: { latencyMs: 1000, errorRate: 0.05, cacheHitRate: 0.8 } },
      security: { enableInputValidation: true, sanitizeInputs: true, enableAuditLogging: true, encryptSensitiveData: true },
      compliance: { enforceDataResidency: true, enablePrivacyActCompliance: true, enableIndigenousProtocols: true, austracReportingEnabled: true, auditRetentionYears: 7 }
    };

    opaService = new OPAService(opaConfig);
    
    // Mock OPA HTTP client with intelligent responses
    (opaService as any).httpClient = {
      post: jest.fn().mockImplementation(async (url, data) => {
        integratedRepo.incrementPolicyEvaluations();
        
        // Simulate policy-specific responses
        if (data?.input?.amount > 10000) {
          return { data: { result: false } }; // Deny high amounts
        }
        if (data?.input?.operation === 'DELETE_POLICY') {
          return { data: { result: false } }; // Deny policy deletions
        }
        if (data?.input?.user?.roles?.includes('unauthorized')) {
          return { data: { result: false } }; // Deny unauthorized users
        }
        
        return { data: { result: true } }; // Allow by default
      }),
      get: jest.fn().mockResolvedValue({ status: 200 }),
      put: jest.fn().mockResolvedValue({ status: 200 }),
      delete: jest.fn().mockResolvedValue({ status: 200 })
    };

    // Mock decision logger
    (opaService as any).decisionLogger = {
      log: jest.fn().mockImplementation(async (entry) => {
        await integratedRepo.saveAuditEntry({
          id: `audit-${Date.now()}-${Math.random()}`,
          userId: entry.intent.user.id,
          action: 'EVALUATE_POLICY',
          target: entry.intent.id,
          timestamp: new Date(),
          result: entry.decision.decision === 'allow' ? AuditResult.SUCCESS : AuditResult.FAILURE,
          details: {
            decision: entry.decision.decision,
            policies: entry.policies,
            evaluationTime: entry.decision.performance?.evaluationTime
          },
          metadata: {
            sessionId: entry.intent.request.sessionId,
            requestId: entry.intent.request.requestId,
            ipAddress: entry.intent.user.network.ipAddress
          }
        });
      }),
      healthCheck: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined)
    };

    // Initialize transformation engine
    const transformConfig = createDefaultTransformationConfig();
    transformationEngine = new TransformationEngine(transformConfig);
    await transformationEngine.initialize();

    // Override transformation engine cache
    (transformationEngine as any).cache = {
      get: (key: string) => integratedRepo.getCacheEntry(key),
      set: (key: string, value: any) => integratedRepo.setCacheEntry(key, value),
      clear: () => integratedRepo.clear()
    };

    // Initialize audit service
    auditService = new AuditTrailService(integratedRepo as any, 'integration-test-key');

    // Initialize policy services
    const rollbackService = new RollbackService(integratedRepo as any, auditService);
    const validationService = { validateRollbackPlan: jest.fn() } as any;
    
    policyService = new PolicyVersionServiceImpl(
      integratedRepo as any,
      auditService,
      rollbackService,
      validationService
    );

    // Initialize atomic service
    const mockDb = {
      transaction: jest.fn().mockImplementation(async (callback) => callback(mockDb)),
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };

    atomicService = new AtomicPolicySetService(
      integratedRepo as any,
      auditService,
      mockDb as any
    );

    // Set up Express application with full middleware stack
    app = express();
    app.use(express.json());

    // Add comprehensive middleware stack
    app.use('/api', async (req, res, next) => {
      try {
        await this.integratedPolicyMiddleware(req, res, next);
      } catch (error) {
        integratedRepo.incrementErrors();
        res.status(500).json({
          error: 'System integration error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Set up comprehensive test endpoints
    this.setupIntegrationEndpoints(app);

    server = createServer(app);
  });

  afterEach(async () => {
    if (server) {
      server.close();
    }
    integratedRepo.clear();
  });

  describe('Complete Financial Transaction Workflow', () => {
    test('should handle end-to-end financial transaction with all components', async () => {
      const response = await request(app)
        .post('/api/financial/complete-transaction')
        .set('user-id', 'integrated-test-user')
        .set('user-roles', 'financial_manager,authorized_approver')
        .set('session-id', 'integration-session-123')
        .set('request-id', 'integration-req-123')
        .set('consent-purpose', 'financial_operations')
        .set('amount', '5000')
        .set('recipient', 'Community Project')
        .set('justification', 'Quarterly community funding')
        .send({
          transaction: {
            amount: 5000,
            currency: 'AUD',
            recipient: 'Community Garden Initiative',
            category: 'community_development'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.policyEvaluation).toBeDefined();
      expect(response.body.policyEvaluation.decision).toBe('allow');
      expect(response.body.dataTransformation).toBeDefined();
      expect(response.body.auditTrail).toBeDefined();
      expect(response.body.complianceChecks).toBeDefined();

      // Verify audit trail was created
      const auditEntries = await integratedRepo.getAuditTrail('*');
      const transactionAudits = auditEntries.filter(e => 
        e.target.includes('integration-req-123') || e.userId === 'integrated-test-user'
      );
      expect(transactionAudits.length).toBeGreaterThan(0);

      // Verify metrics were updated
      const metrics = integratedRepo.getMetrics();
      expect(metrics.policyEvaluations).toBeGreaterThan(0);
      expect(metrics.transformations).toBeGreaterThan(0);
      expect(metrics.auditEntries).toBeGreaterThan(0);
    });

    test('should deny transaction that violates spending limits', async () => {
      const response = await request(app)
        .post('/api/financial/complete-transaction')
        .set('user-id', 'integrated-test-user')
        .set('user-roles', 'financial_clerk')
        .set('session-id', 'integration-session-456')
        .set('request-id', 'integration-req-456')
        .set('consent-purpose', 'financial_operations')
        .set('amount', '15000') // Exceeds limit
        .send({
          transaction: {
            amount: 15000,
            currency: 'AUD',
            recipient: 'Large Project',
            category: 'infrastructure'
          }
        })
        .expect(403);

      expect(response.body.error).toBe('Access denied by policy');
      expect(response.body.policyViolation).toBeDefined();
      expect(response.body.auditLogged).toBe(true);

      // Verify denial was audited
      const auditEntries = await integratedRepo.getAuditTrail('*');
      const denialAudits = auditEntries.filter(e => 
        e.result === AuditResult.FAILURE && e.userId === 'integrated-test-user'
      );
      expect(denialAudits.length).toBeGreaterThan(0);
    });

    test('should handle transaction with conditional approval', async () => {
      // Mock conditional response
      (opaService as any).httpClient.post.mockImplementation(async (url, data) => {
        integratedRepo.incrementPolicyEvaluations();
        
        if (data?.input?.amount > 7500) {
          return {
            data: {
              result: {
                conditional: true,
                conditions: [{
                  type: 'approval_required',
                  description: 'Senior manager approval required',
                  requirements: { approverRole: 'senior_manager' }
                }]
              }
            }
          };
        }
        
        return { data: { result: true } };
      });

      const response = await request(app)
        .post('/api/financial/complete-transaction')
        .set('user-id', 'integrated-test-user')
        .set('user-roles', 'financial_manager')
        .set('session-id', 'conditional-session')
        .set('request-id', 'conditional-req-123')
        .set('consent-purpose', 'financial_operations')
        .set('amount', '8000')
        .set('approval-token', 'senior-manager-approval-xyz')
        .send({
          transaction: {
            amount: 8000,
            currency: 'AUD',
            recipient: 'Conditional Project',
            category: 'infrastructure'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.conditionalApproval).toBeDefined();
      expect(response.body.conditionsMet).toBe(true);
      expect(response.body.auditTrail).toBeDefined();
    });
  });

  describe('Indigenous Data Access Integration', () => {
    test('should handle Traditional Owner cultural data access with full integration', async () => {
      const response = await request(app)
        .get('/api/indigenous/cultural-access/traditional-knowledge')
        .set('user-id', 'traditional-owner-user')
        .set('user-roles', 'traditional_owner,elder,cultural_keeper')
        .set('session-id', 'cultural-session-123')
        .set('request-id', 'cultural-req-123')
        .set('consent-purpose', 'cultural_data_access')
        .set('sovereignty-level', 'traditional_owner')
        .set('traditional-group', 'Wurundjeri')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.culturalData).toBeDefined();
      expect(response.body.sovereignty).toBe('traditional_owner');
      expect(response.body.careCompliance).toBeDefined();
      expect(response.body.dataProtection).toBe('none'); // No redaction for Traditional Owners
      expect(response.body.auditRetention).toBe(50); // Enhanced retention for Indigenous data

      // Verify enhanced audit retention
      const auditEntries = await integratedRepo.getAuditTrail('*');
      const culturalAudits = auditEntries.filter(e => 
        e.target.includes('cultural-req-123')
      );
      expect(culturalAudits.length).toBeGreaterThan(0);
      culturalAudits.forEach(audit => {
        expect(audit.retentionYears).toBe(50);
      });
    });

    test('should deny non-Traditional Owner access to sacred cultural data', async () => {
      const response = await request(app)
        .get('/api/indigenous/cultural-access/sacred-sites')
        .set('user-id', 'external-researcher')
        .set('user-roles', 'researcher,academic')
        .set('session-id', 'research-session-456')
        .set('request-id', 'research-req-456')
        .set('consent-purpose', 'academic_research')
        .set('sovereignty-level', 'individual')
        .expect(403);

      expect(response.body.error).toBe('Access denied by policy');
      expect(response.body.culturalProtocols).toBeDefined();
      expect(response.body.sovereigntyViolation).toBe(true);
    });
  });

  describe('Policy Lifecycle Integration', () => {
    test('should handle complete policy lifecycle with audit trail', async () => {
      // 1. Create new policy
      const createResponse = await request(app)
        .post('/api/admin/policies')
        .set('user-id', 'policy-admin')
        .set('user-roles', 'policy_administrator,compliance_officer')
        .set('session-id', 'policy-session-123')
        .send({
          policyId: 'integration.test.policy',
          content: {
            rego: 'package integration.test\nallow = input.test == true',
            config: {
              enforcement: 'BLOCKING',
              scope: 'GLOBAL',
              priority: 100,
              jurisdiction: ['AU'],
              complianceFrameworks: ['test_framework']
            }
          },
          metadata: {
            title: 'Integration Test Policy',
            description: 'Policy for integration testing',
            category: 'TESTING',
            severity: 'LOW',
            impact: 'LOW',
            changeType: 'CREATION',
            releaseNotes: 'Created for integration testing'
          }
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.policyId).toBe('integration.test.policy');
      expect(createResponse.body.version).toBe('1.0.0');

      // 2. Approve policy
      const approveResponse = await request(app)
        .patch('/api/admin/policies/integration.test.policy/versions/1.0.0/approve')
        .set('user-id', 'policy-approver')
        .set('user-roles', 'policy_approver,senior_manager')
        .set('session-id', 'approval-session-123')
        .expect(200);

      expect(approveResponse.body.success).toBe(true);
      expect(approveResponse.body.status).toBe('approved');

      // 3. Deploy policy
      const deployResponse = await request(app)
        .patch('/api/admin/policies/integration.test.policy/versions/1.0.0/deploy')
        .set('user-id', 'policy-deployer')
        .set('user-roles', 'policy_deployer,system_admin')
        .set('session-id', 'deploy-session-123')
        .expect(200);

      expect(deployResponse.body.success).toBe(true);
      expect(deployResponse.body.status).toBe('active');

      // 4. Test policy enforcement
      const testResponse = await request(app)
        .post('/api/test/policy-enforcement')
        .set('user-id', 'test-user')
        .set('user-roles', 'tester')
        .send({ test: true })
        .expect(200);

      expect(testResponse.body.policyEvaluated).toBe(true);
      expect(testResponse.body.decision).toBe('allow');

      // 5. Verify complete audit trail
      const auditEntries = await integratedRepo.getAuditTrail('*');
      const policyAudits = auditEntries.filter(e => 
        e.target.includes('integration.test.policy')
      );

      const creationAudit = policyAudits.find(e => e.action === 'CREATE_POLICY');
      const approvalAudit = policyAudits.find(e => e.action === 'APPROVE_POLICY');
      const deploymentAudit = policyAudits.find(e => e.action === 'DEPLOY_POLICY');

      expect(creationAudit).toBeDefined();
      expect(approvalAudit).toBeDefined();
      expect(deploymentAudit).toBeDefined();
    });

    test('should handle atomic policy set operations with rollback', async () => {
      const atomicRequest = {
        operations: [
          {
            id: 'op-1',
            policyId: 'atomic.test.policy.1',
            operation: 'create',
            content: {
              rego: 'package atomic.test1\nallow = true',
              config: {
                enforcement: 'BLOCKING',
                scope: 'GLOBAL',
                priority: 100,
                jurisdiction: ['AU'],
                complianceFrameworks: []
              }
            },
            metadata: {
              title: 'Atomic Test Policy 1',
              description: 'First policy in atomic set',
              category: 'TESTING',
              severity: 'LOW',
              impact: 'LOW',
              changeType: 'CREATION',
              releaseNotes: 'Atomic creation test'
            }
          },
          {
            id: 'op-2',
            policyId: 'atomic.test.policy.2',
            operation: 'create',
            content: {
              rego: 'package atomic.test2\nallow = false', // Will cause failure in some tests
              config: {
                enforcement: 'BLOCKING',
                scope: 'GLOBAL',
                priority: 100,
                jurisdiction: ['AU'],
                complianceFrameworks: []
              }
            },
            metadata: {
              title: 'Atomic Test Policy 2',
              description: 'Second policy in atomic set',
              category: 'TESTING',
              severity: 'LOW',
              impact: 'LOW',
              changeType: 'CREATION',
              releaseNotes: 'Atomic creation test'
            }
          }
        ],
        metadata: {
          description: 'Atomic policy set integration test',
          businessJustification: 'Testing atomic operations',
          requiredApprovals: []
        }
      };

      const response = await request(app)
        .post('/api/admin/policies/atomic')
        .set('user-id', 'atomic-admin')
        .set('user-roles', 'policy_administrator,system_admin')
        .set('session-id', 'atomic-session-123')
        .send(atomicRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.operationsCompleted).toBe(2);
      expect(response.body.auditTrail).toBeDefined();

      // Verify both policies were created
      const policy1 = await integratedRepo.getLatestVersion('atomic.test.policy.1');
      const policy2 = await integratedRepo.getLatestVersion('atomic.test.policy.2');
      
      expect(policy1).toBeDefined();
      expect(policy2).toBeDefined();
    });
  });

  describe('Compliance Reporting Integration', () => {
    test('should generate comprehensive compliance report across all components', async () => {
      // Generate test data across components
      await this.generateComplianceTestData();

      const response = await request(app)
        .get('/api/compliance/comprehensive-report')
        .set('user-id', 'compliance-officer')
        .set('user-roles', 'compliance_officer,auditor,report_generator')
        .set('session-id', 'compliance-session-123')
        .query({
          fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          toDate: new Date().toISOString(),
          frameworks: 'AUSTRAC,Privacy Act 1988,CARE Principles'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.period).toBeDefined();
      expect(response.body.report.frameworks).toContain('AUSTRAC');
      expect(response.body.report.statistics).toBeDefined();
      expect(response.body.report.auditSummary).toBeDefined();
      expect(response.body.report.policyCompliance).toBeDefined();
      expect(response.body.report.dataProtection).toBeDefined();
      expect(response.body.report.indigenousDataSovereignty).toBeDefined();

      // Verify report contains real data
      expect(response.body.report.statistics.totalTransactions).toBeGreaterThan(0);
      expect(response.body.report.statistics.policyEvaluations).toBeGreaterThan(0);
      expect(response.body.report.statistics.auditEntries).toBeGreaterThan(0);
    });

    test('should handle AUSTRAC-specific reporting requirements', async () => {
      const response = await request(app)
        .get('/api/compliance/austrac-report')
        .set('user-id', 'austrac-officer')
        .set('user-roles', 'austrac_officer,government_official')
        .set('session-id', 'austrac-session-123')
        .query({
          period: 'quarterly',
          year: '2024',
          quarter: 'Q1'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.austracReport).toBeDefined();
      expect(response.body.austracReport.complianceFramework).toBe('AUSTRAC');
      expect(response.body.austracReport.transactionAnalysis).toBeDefined();
      expect(response.body.austracReport.riskAssessment).toBeDefined();
      expect(response.body.austracReport.auditTrail).toBeDefined();
    });
  });

  describe('System Performance Under Integration Load', () => {
    test('should maintain performance with all components active', async () => {
      const concurrentRequests = 20;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app)
          .post('/api/financial/complete-transaction')
          .set('user-id', `load-user-${i}`)
          .set('user-roles', 'financial_manager')
          .set('session-id', `load-session-${i}`)
          .set('request-id', `load-req-${i}`)
          .set('consent-purpose', 'financial_operations')
          .set('amount', '3000')
          .send({
            transaction: {
              amount: 3000,
              currency: 'AUD',
              recipient: `Load Test Recipient ${i}`,
              category: 'testing'
            }
          });
        
        promises.push(promise);
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Performance should be acceptable
      const averageTime = totalTime / concurrentRequests;
      expect(averageTime).toBeLessThan(500); // Average under 500ms per request
      expect(totalTime).toBeLessThan(10000); // Total under 10 seconds

      console.log(`Integration load test: ${concurrentRequests} requests in ${totalTime}ms`);
      console.log(`Average per request: ${averageTime.toFixed(2)}ms`);

      // Verify metrics
      const metrics = integratedRepo.getMetrics();
      expect(metrics.policyEvaluations).toBe(concurrentRequests);
      expect(metrics.transformations).toBe(concurrentRequests);
      expect(metrics.auditEntries).toBeGreaterThan(concurrentRequests);
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    test('should handle cascading failures gracefully', async () => {
      // Mock OPA service failure
      (opaService as any).httpClient.post.mockRejectedValue(new Error('OPA service down'));

      const response = await request(app)
        .post('/api/financial/complete-transaction')
        .set('user-id', 'failure-test-user')
        .set('user-roles', 'financial_manager')
        .set('session-id', 'failure-session-123')
        .set('amount', '5000')
        .send({
          transaction: {
            amount: 5000,
            currency: 'AUD',
            recipient: 'Failure Test',
            category: 'testing'
          }
        })
        .expect(500);

      expect(response.body.error).toBe('System integration error');
      expect(response.body.message).toContain('OPA service down');

      // Verify error was audited
      const auditEntries = await integratedRepo.getAuditTrail('*');
      const errorAudits = auditEntries.filter(e => 
        e.result === AuditResult.FAILURE && e.userId === 'failure-test-user'
      );
      expect(errorAudits.length).toBeGreaterThan(0);

      // Verify error metrics
      const metrics = integratedRepo.getMetrics();
      expect(metrics.errors).toBeGreaterThan(0);
    });

    test('should recover from transient failures with retry logic', async () => {
      let attemptCount = 0;
      
      // Mock initial failure then success
      (opaService as any).httpClient.post.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Transient failure');
        }
        return { data: { result: true } };
      });

      const response = await request(app)
        .post('/api/financial/complete-transaction')
        .set('user-id', 'retry-test-user')
        .set('user-roles', 'financial_manager')
        .set('session-id', 'retry-session-123')
        .set('consent-purpose', 'financial_operations')
        .set('amount', '4000')
        .send({
          transaction: {
            amount: 4000,
            currency: 'AUD',
            recipient: 'Retry Test',
            category: 'testing'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(attemptCount).toBe(2); // Should have retried once
    });
  });

  // Helper methods
  private async integratedPolicyMiddleware(req: any, res: any, next: any): Promise<void> {
    // 1. Extract user context
    const userContext = this.extractUserContext(req);
    
    // 2. Validate consent
    const consentValid = await this.validateUserConsent(userContext);
    if (!consentValid.valid) {
      return res.status(403).json({
        error: 'Insufficient consent',
        reason: consentValid.reason,
        consentRequired: true
      });
    }

    // 3. Create financial intent
    const intent = this.createFinancialIntent(req, userContext);
    
    // 4. Evaluate policies
    const policyDecision = await opaService.evaluateIntent(intent, this.determinePolicies(req.path));
    
    // 5. Store results in request
    req.userContext = userContext;
    req.policyDecision = policyDecision;
    req.financialIntent = intent;

    // 6. Enforce decision
    if (policyDecision.decision === 'deny') {
      return res.status(403).json({
        error: 'Access denied by policy',
        reason: policyDecision.reason,
        policyViolation: true,
        auditLogged: true
      });
    }

    next();
  }

  private extractUserContext(req: any): any {
    return {
      userId: req.headers['user-id'] || 'anonymous',
      roles: (req.headers['user-roles'] || '').split(',').filter(Boolean),
      sessionId: req.headers['session-id'] || 'unknown',
      requestId: req.headers['request-id'] || `req-${Date.now()}`,
      consentPurpose: req.headers['consent-purpose'] || 'general',
      sovereigntyLevel: req.headers['sovereignty-level'] || 'individual'
    };
  }

  private async validateUserConsent(userContext: any): Promise<{ valid: boolean; reason: string }> {
    const consent = await integratedRepo.getConsent(userContext.userId, userContext.consentPurpose);
    
    if (!consent) {
      return { valid: false, reason: 'No consent found' };
    }
    
    if (consent.status !== 'active') {
      return { valid: false, reason: `Consent is ${consent.status}` };
    }
    
    return { valid: true, reason: 'Valid consent' };
  }

  private createFinancialIntent(req: any, userContext: any): FinancialIntent {
    return {
      id: userContext.requestId,
      operation: this.mapPathToOperation(req.path),
      user: {
        id: userContext.userId,
        roles: userContext.roles,
        consentLevels: [ConsentLevel.FULL_AUTOMATION],
        authentication: { verified: true, mfaCompleted: true, sessionAge: 1, lastPasswordChange: 30 },
        location: { country: 'Australia', region: 'NSW', verified: true },
        network: { type: 'corporate', securityVerified: true, ipAddress: req.ip || '127.0.0.1' }
      },
      financial: {
        amount: parseFloat(req.headers['amount'] || '0'),
        currency: 'AUD',
        categories: [req.body?.transaction?.category || 'general'],
        sensitivity: 'confidential',
        containsPersonalData: false
      },
      request: {
        timestamp: new Date(),
        requestId: userContext.requestId,
        sessionId: userContext.sessionId,
        endpoint: req.path,
        method: req.method,
        justification: req.headers['justification']
      },
      compliance: {
        privacyAct: {
          personalDataInvolved: false,
          consentObtained: true,
          purposeLimitation: [userContext.consentPurpose],
          crossBorderTransfer: false
        },
        dataResidency: {
          country: 'Australia',
          region: 'ap-southeast-2',
          governmentApproved: true
        }
      }
    };
  }

  private mapPathToOperation(path: string): FinancialOperation {
    if (path.includes('/transaction')) return FinancialOperation.CREATE_PAYMENT;
    if (path.includes('/balance')) return FinancialOperation.VIEW_BALANCE;
    if (path.includes('/report')) return FinancialOperation.GENERATE_REPORT;
    return FinancialOperation.VIEW_BALANCE;
  }

  private determinePolicies(path: string): string[] {
    if (path.includes('/financial/')) return ['financial.spending_limits', 'financial.authorization'];
    if (path.includes('/indigenous/')) return ['community.cultural_protocols', 'indigenous.sovereignty'];
    if (path.includes('/admin/')) return ['admin.policy_management', 'admin.authorization'];
    return ['general.access_control'];
  }

  private setupIntegrationEndpoints(app: express.Application): void {
    // Complete financial transaction endpoint
    app.post('/api/financial/complete-transaction', async (req, res) => {
      try {
        const decision = req.policyDecision;
        const userContext = req.userContext;
        
        // Transform sensitive data
        integratedRepo.incrementTransformations();
        const transformationContext: TransformationContext = {
          userId: userContext.userId,
          roles: userContext.roles,
          consentLevel: ConsentLevel.FULL_AUTOMATION,
          sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
          purpose: 'financial_transaction',
          complianceFrameworks: ['austrac', 'privacy_act_1988'],
          location: { country: 'Australia', region: 'NSW' }
        };

        const transformedData = await transformationEngine.transform(req.body, transformationContext);

        // Create comprehensive response
        res.json({
          success: true,
          transactionId: `txn-${Date.now()}`,
          policyEvaluation: {
            decision: decision.decision,
            policies: decision.evaluatedPolicies,
            evaluationTime: decision.performance?.evaluationTime
          },
          dataTransformation: {
            applied: transformedData.summary.fieldsTransformed > 0,
            fieldsTransformed: transformedData.summary.fieldsTransformed
          },
          auditTrail: {
            entries: 1,
            retentionYears: 7
          },
          complianceChecks: {
            austrac: true,
            privacyAct: true,
            dataResidency: true
          },
          conditionalApproval: decision.decision === 'conditional',
          conditionsMet: !!req.headers['approval-token'],
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Transaction processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Indigenous cultural data access endpoint
    app.get('/api/indigenous/cultural-access/:dataType', async (req, res) => {
      const userContext = req.userContext;
      const decision = req.policyDecision;

      res.json({
        success: true,
        culturalData: {
          traditionalKnowledge: 'Traditional land management practices',
          ceremonies: 'Seasonal ceremonies and protocols',
          sites: 'Sacred site locations and protocols'
        },
        sovereignty: userContext.sovereigntyLevel,
        careCompliance: {
          collectiveBenefit: true,
          authorityToControl: true,
          responsibility: true,
          ethics: true
        },
        dataProtection: userContext.roles.includes('traditional_owner') ? 'none' : 'full',
        auditRetention: 50,
        policyDecision: decision.decision,
        timestamp: new Date().toISOString()
      });
    });

    // Policy management endpoints
    app.post('/api/admin/policies', async (req, res) => {
      const { policyId, content, metadata } = req.body;
      const userContext = req.userContext;

      try {
        const version = await policyService.createVersion(
          policyId,
          content,
          metadata,
          userContext.userId
        );

        res.status(201).json({
          success: true,
          policyId,
          version: version.version,
          status: version.status,
          auditLogged: true
        });
      } catch (error) {
        res.status(500).json({
          error: 'Policy creation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.patch('/api/admin/policies/:policyId/versions/:version/approve', async (req, res) => {
      const { policyId, version } = req.params;
      const userContext = req.userContext;

      try {
        await policyService.approveVersion(policyId, version, userContext.userId);

        res.json({
          success: true,
          policyId,
          version,
          status: 'approved',
          approvedBy: userContext.userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Policy approval failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.patch('/api/admin/policies/:policyId/versions/:version/deploy', async (req, res) => {
      const { policyId, version } = req.params;
      const userContext = req.userContext;

      try {
        await policyService.deployVersion(policyId, version, userContext.userId);

        res.json({
          success: true,
          policyId,
          version,
          status: 'active',
          deployedBy: userContext.userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Policy deployment failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Atomic policy operations endpoint
    app.post('/api/admin/policies/atomic', async (req, res) => {
      const userContext = req.userContext;
      const atomicRequest = {
        ...req.body,
        userId: userContext.userId,
        sessionId: userContext.sessionId,
        requestId: userContext.requestId
      };

      try {
        const result = await atomicService.executeAtomicPolicySet(atomicRequest);

        res.json({
          success: result.success,
          transactionId: result.transactionId,
          operationsCompleted: result.completedOperations.length,
          executionTime: result.metrics.executionTime,
          auditTrail: result.auditTrail,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Atomic operation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Compliance reporting endpoints
    app.get('/api/compliance/comprehensive-report', async (req, res) => {
      const { fromDate, toDate, frameworks } = req.query;
      const userContext = req.userContext;

      try {
        const auditEntries = await integratedRepo.getAuditTrail('*', {
          fromDate: new Date(fromDate as string),
          toDate: new Date(toDate as string)
        });

        const metrics = integratedRepo.getMetrics();

        res.json({
          success: true,
          report: {
            period: { from: fromDate, to: toDate },
            frameworks: (frameworks as string).split(','),
            statistics: {
              totalTransactions: metrics.policyEvaluations,
              policyEvaluations: metrics.policyEvaluations,
              auditEntries: auditEntries.length,
              transformations: metrics.transformations,
              errors: metrics.errors
            },
            auditSummary: {
              totalEntries: auditEntries.length,
              successfulOperations: auditEntries.filter(e => e.result === AuditResult.SUCCESS).length,
              failedOperations: auditEntries.filter(e => e.result === AuditResult.FAILURE).length
            },
            policyCompliance: {
              activePolicies: Array.from(integratedRepo.policies.values()).length,
              complianceFrameworks: ['AUSTRAC', 'Privacy Act 1988', 'CARE Principles']
            },
            dataProtection: {
              encryptionApplied: true,
              accessControlsActive: true,
              auditTrailComplete: true
            },
            indigenousDataSovereignty: {
              protocolsEnforced: true,
              traditionalOwnerConsent: true,
              enhancedRetention: true
            }
          },
          generatedBy: userContext.userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          error: 'Report generation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/api/compliance/austrac-report', async (req, res) => {
      const { period, year, quarter } = req.query;
      const userContext = req.userContext;

      res.json({
        success: true,
        austracReport: {
          complianceFramework: 'AUSTRAC',
          period: `${year}-${quarter}`,
          transactionAnalysis: {
            totalTransactions: integratedRepo.getMetrics().policyEvaluations,
            highValueTransactions: 0,
            suspiciousActivities: 0
          },
          riskAssessment: {
            overallRisk: 'low',
            mitigationMeasures: ['Policy enforcement', 'Audit logging', 'Real-time monitoring']
          },
          auditTrail: {
            complete: true,
            retentionCompliant: true,
            integrityVerified: true
          }
        },
        generatedBy: userContext.userId,
        timestamp: new Date().toISOString()
      });
    });

    // Test policy enforcement endpoint
    app.post('/api/test/policy-enforcement', async (req, res) => {
      const decision = req.policyDecision;

      res.json({
        policyEvaluated: true,
        decision: decision.decision,
        evaluatedPolicies: decision.evaluatedPolicies,
        testPassed: decision.decision === 'allow',
        timestamp: new Date().toISOString()
      });
    });
  }

  private async generateComplianceTestData(): Promise<void> {
    // Generate various audit entries for compliance testing
    const testEntries = [
      {
        userId: 'test-user-1',
        action: AuditAction.ACCESS_DATA,
        target: 'financial-data-123',
        result: AuditResult.SUCCESS,
        details: { dataType: 'financial', amount: 5000 }
      },
      {
        userId: 'test-user-2',
        action: AuditAction.EVALUATE_POLICY,
        target: 'policy-evaluation-456',
        result: AuditResult.SUCCESS,
        details: { decision: 'allow', policies: ['financial.spending_limits'] }
      },
      {
        userId: 'test-user-3',
        action: AuditAction.CREATE_PAYMENT,
        target: 'transaction-789',
        result: AuditResult.FAILURE,
        details: { amount: 15000, reason: 'Exceeded spending limit' }
      }
    ];

    for (const entry of testEntries) {
      await integratedRepo.saveAuditEntry({
        id: `test-audit-${Date.now()}-${Math.random()}`,
        userId: entry.userId,
        action: entry.action,
        target: entry.target,
        timestamp: new Date(),
        result: entry.result,
        details: entry.details,
        metadata: {
          sessionId: 'compliance-test-session',
          requestId: 'compliance-test-req',
          ipAddress: '127.0.0.1'
        }
      });
    }

    // Update metrics
    integratedRepo.systemMetrics.policyEvaluations += testEntries.length;
    integratedRepo.systemMetrics.auditEntries += testEntries.length;
  }
});