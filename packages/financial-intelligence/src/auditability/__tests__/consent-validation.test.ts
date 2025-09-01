/**
 * Consent Validation Test Scenarios
 * 
 * Comprehensive test suite for consent-based access control, ensuring
 * proper validation of user consent levels, consent withdrawal, and
 * Privacy Act 1988 compliance requirements.
 */

import request from 'supertest';
import express from 'express';
import { OPAService } from '../OPAService';
import { AuditTrailService } from '../AuditTrailService';
import {
  FinancialIntent,
  FinancialOperation,
  ConsentLevel,
  SovereigntyLevel,
  OPAServiceConfig,
  AuditAction,
  AuditResult
} from '../types';

// Mock repository for consent management
class MockConsentRepository {
  private consents = new Map<string, ConsentRecord>();
  private consentHistory = new Map<string, ConsentHistoryEntry[]>();

  async getConsent(userId: string, purpose: string): Promise<ConsentRecord | null> {
    const key = `${userId}:${purpose}`;
    return this.consents.get(key) || null;
  }

  async saveConsent(consent: ConsentRecord): Promise<string> {
    const key = `${consent.userId}:${consent.purpose}`;
    this.consents.set(key, consent);
    
    // Add to history
    const history = this.consentHistory.get(consent.userId) || [];
    history.push({
      id: consent.id,
      action: 'granted',
      timestamp: consent.grantedAt,
      purpose: consent.purpose,
      level: consent.level
    });
    this.consentHistory.set(consent.userId, history);
    
    return consent.id;
  }

  async withdrawConsent(userId: string, purpose: string): Promise<boolean> {
    const key = `${userId}:${purpose}`;
    const consent = this.consents.get(key);
    
    if (consent) {
      consent.status = 'withdrawn';
      consent.withdrawnAt = new Date();
      
      // Add to history
      const history = this.consentHistory.get(userId) || [];
      history.push({
        id: consent.id,
        action: 'withdrawn',
        timestamp: new Date(),
        purpose,
        level: consent.level
      });
      this.consentHistory.set(userId, history);
      
      return true;
    }
    return false;
  }

  async getConsentHistory(userId: string): Promise<ConsentHistoryEntry[]> {
    return this.consentHistory.get(userId) || [];
  }

  clear(): void {
    this.consents.clear();
    this.consentHistory.clear();
  }
}

interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  level: ConsentLevel;
  scope: string[];
  grantedAt: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;
  status: 'active' | 'withdrawn' | 'expired';
  metadata: {
    ipAddress: string;
    userAgent: string;
    sessionId: string;
    consentMethod: 'explicit' | 'implied' | 'opt_in' | 'opt_out';
    lawfulBasis: string[];
  };
}

interface ConsentHistoryEntry {
  id: string;
  action: 'granted' | 'withdrawn' | 'expired';
  timestamp: Date;
  purpose: string;
  level: ConsentLevel;
}

describe('Consent Validation Test Scenarios', () => {
  let app: express.Application;
  let opaService: OPAService;
  let auditService: AuditTrailService;
  let consentRepo: MockConsentRepository;
  let mockRepo: any;

  beforeEach(async () => {
    // Initialize mock repositories
    consentRepo = new MockConsentRepository();
    mockRepo = {
      saveAuditEntry: jest.fn(),
      getAuditTrail: jest.fn().mockResolvedValue([])
    };

    // Initialize audit service
    auditService = new AuditTrailService(mockRepo, 'test-integrity-key');

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
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    };

    // Set up Express application
    app = express();
    app.use(express.json());

    // Consent validation middleware
    app.use('/api', async (req, res, next) => {
      try {
        const userId = req.headers['user-id'] as string;
        const purpose = req.headers['data-purpose'] as string || 'general';
        const requiredLevel = this.parseConsentLevel(req.headers['required-consent-level'] as string);

        // Get user's consent for this purpose
        const consent = await consentRepo.getConsent(userId, purpose);
        
        // Validate consent
        const consentValidation = await this.validateConsent(consent, requiredLevel, purpose);
        
        (req as any).consentValidation = consentValidation;
        (req as any).userConsent = consent;

        // If consent is required but not provided or insufficient
        if (!consentValidation.valid) {
          return res.status(403).json({
            error: 'Insufficient consent',
            reason: consentValidation.reason,
            requiredLevel: requiredLevel,
            currentLevel: consent?.level || 'none',
            consentUrl: '/api/consent/grant',
            timestamp: new Date().toISOString()
          });
        }

        // Evaluate policy with consent context
        const intent: FinancialIntent = this.createIntentFromRequest(req);
        const decision = await this.evaluatePolicyWithConsent(intent, consentValidation);
        
        (req as any).policyDecision = decision;

        if (decision.decision === 'deny') {
          return res.status(403).json({
            error: 'Access denied by policy',
            reason: decision.reason,
            consentIssue: decision.metadata?.consentIssue,
            timestamp: new Date().toISOString()
          });
        }

        next();
      } catch (error) {
        console.error('Consent validation error:', error);
        res.status(500).json({
          error: 'Consent validation failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Set up test endpoints
    this.setupConsentTestEndpoints(app);
  });

  afterEach(() => {
    consentRepo.clear();
  });

  describe('Basic Consent Validation', () => {
    test('should allow access with valid explicit consent', async () => {
      // Grant explicit consent
      await consentRepo.saveConsent({
        id: 'consent-1',
        userId: 'consenting-user',
        purpose: 'financial_analysis',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['personal_data', 'financial_data', 'transaction_history'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-123',
          consentMethod: 'explicit',
          lawfulBasis: ['consent', 'legitimate_interest']
        }
      });

      const response = await request(app)
        .get('/api/financial/personal-data')
        .set('user-id', 'consenting-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'financial_analysis')
        .set('required-consent-level', 'full_automation')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.consentValidated).toBe(true);
      expect(response.body.consentLevel).toBe('full_automation');
    });

    test('should deny access without consent', async () => {
      const response = await request(app)
        .get('/api/financial/personal-data')
        .set('user-id', 'non-consenting-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'financial_analysis')
        .set('required-consent-level', 'full_automation')
        .expect(403);

      expect(response.body.error).toBe('Insufficient consent');
      expect(response.body.requiredLevel).toBe('full_automation');
      expect(response.body.currentLevel).toBe('none');
      expect(response.body.consentUrl).toBeDefined();
    });

    test('should deny access with insufficient consent level', async () => {
      // Grant partial consent but require full
      await consentRepo.saveConsent({
        id: 'consent-2',
        userId: 'partial-consent-user',
        purpose: 'profile_access',
        level: ConsentLevel.PARTIAL_AUTOMATION,
        scope: ['basic_profile'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-456',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      const response = await request(app)
        .get('/api/financial/sensitive-data')
        .set('user-id', 'partial-consent-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'profile_access')
        .set('required-consent-level', 'full_automation')
        .expect(403);

      expect(response.body.error).toBe('Insufficient consent');
      expect(response.body.requiredLevel).toBe('full_automation');
      expect(response.body.currentLevel).toBe('partial_automation');
    });
  });

  describe('Consent Withdrawal Scenarios', () => {
    test('should deny access after consent withdrawal', async () => {
      // Grant consent initially
      await consentRepo.saveConsent({
        id: 'consent-3',
        userId: 'withdrawal-user',
        purpose: 'marketing',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['personal_data', 'preferences'],
        grantedAt: new Date(Date.now() - 86400000), // 1 day ago
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-789',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      // First request should succeed
      await request(app)
        .get('/api/marketing/personalized-offers')
        .set('user-id', 'withdrawal-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'marketing')
        .set('required-consent-level', 'full_automation')
        .expect(200);

      // Withdraw consent
      await consentRepo.withdrawConsent('withdrawal-user', 'marketing');

      // Second request should fail
      const response = await request(app)
        .get('/api/marketing/personalized-offers')
        .set('user-id', 'withdrawal-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'marketing')
        .set('required-consent-level', 'full_automation')
        .expect(403);

      expect(response.body.error).toBe('Insufficient consent');
      expect(response.body.reason).toContain('withdrawn');
    });

    test('should handle partial consent withdrawal', async () => {
      // Grant comprehensive consent
      await consentRepo.saveConsent({
        id: 'consent-4',
        userId: 'partial-withdrawal-user',
        purpose: 'comprehensive_service',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['personal_data', 'financial_data', 'marketing', 'analytics'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-101',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      // Withdraw consent for marketing but keep others
      await consentRepo.saveConsent({
        id: 'consent-4-updated',
        userId: 'partial-withdrawal-user',
        purpose: 'comprehensive_service',
        level: ConsentLevel.PARTIAL_AUTOMATION,
        scope: ['personal_data', 'financial_data'], // Removed marketing and analytics
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-101',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      // Financial data access should still work
      await request(app)
        .get('/api/financial/account-summary')
        .set('user-id', 'partial-withdrawal-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'comprehensive_service')
        .set('required-consent-level', 'partial_automation')
        .expect(200);

      // Marketing access should be denied
      const response = await request(app)
        .get('/api/marketing/targeted-ads')
        .set('user-id', 'partial-withdrawal-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'comprehensive_service')
        .set('required-consent-level', 'full_automation')
        .expect(403);

      expect(response.body.error).toBe('Insufficient consent');
    });
  });

  describe('Consent Expiration Handling', () => {
    test('should deny access with expired consent', async () => {
      // Grant consent that expired yesterday
      await consentRepo.saveConsent({
        id: 'consent-5',
        userId: 'expired-consent-user',
        purpose: 'temporary_access',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['personal_data'],
        grantedAt: new Date(Date.now() - 172800000), // 2 days ago
        expiresAt: new Date(Date.now() - 86400000), // Expired 1 day ago
        status: 'expired',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-102',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      const response = await request(app)
        .get('/api/financial/temporary-data')
        .set('user-id', 'expired-consent-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'temporary_access')
        .set('required-consent-level', 'full_automation')
        .expect(403);

      expect(response.body.error).toBe('Insufficient consent');
      expect(response.body.reason).toContain('expired');
    });

    test('should handle consent renewal', async () => {
      // Grant new consent after expiration
      await consentRepo.saveConsent({
        id: 'consent-6',
        userId: 'renewal-user',
        purpose: 'ongoing_service',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['personal_data', 'financial_data'],
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // Expires in 1 day
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-103',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      const response = await request(app)
        .get('/api/financial/renewed-access')
        .set('user-id', 'renewal-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'ongoing_service')
        .set('required-consent-level', 'full_automation')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.consentValidated).toBe(true);
    });
  });

  describe('Purpose-Specific Consent', () => {
    test('should enforce purpose limitation', async () => {
      // Grant consent for specific purpose
      await consentRepo.saveConsent({
        id: 'consent-7',
        userId: 'purpose-user',
        purpose: 'account_management',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['account_data'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-104',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      // Access for granted purpose should work
      await request(app)
        .get('/api/financial/account-management')
        .set('user-id', 'purpose-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'account_management')
        .set('required-consent-level', 'full_automation')
        .expect(200);

      // Access for different purpose should be denied
      const response = await request(app)
        .get('/api/financial/marketing-analysis')
        .set('user-id', 'purpose-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'marketing_analysis')
        .set('required-consent-level', 'full_automation')
        .expect(403);

      expect(response.body.error).toBe('Insufficient consent');
      expect(response.body.reason).toContain('purpose');
    });

    test('should handle multiple purpose consents', async () => {
      // Grant consent for multiple purposes
      await consentRepo.saveConsent({
        id: 'consent-8a',
        userId: 'multi-purpose-user',
        purpose: 'account_management',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['account_data'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-105',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      await consentRepo.saveConsent({
        id: 'consent-8b',
        userId: 'multi-purpose-user',
        purpose: 'fraud_detection',
        level: ConsentLevel.PARTIAL_AUTOMATION,
        scope: ['transaction_patterns'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-105',
          consentMethod: 'explicit',
          lawfulBasis: ['legitimate_interest']
        }
      });

      // Both purposes should be accessible with appropriate consent levels
      await request(app)
        .get('/api/financial/account-settings')
        .set('user-id', 'multi-purpose-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'account_management')
        .set('required-consent-level', 'full_automation')
        .expect(200);

      await request(app)
        .get('/api/security/fraud-monitoring')
        .set('user-id', 'multi-purpose-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'fraud_detection')
        .set('required-consent-level', 'partial_automation')
        .expect(200);
    });
  });

  describe('Indigenous Data Consent', () => {
    test('should require community consent for Indigenous data', async () => {
      // Individual consent is not sufficient for Indigenous cultural data
      await consentRepo.saveConsent({
        id: 'consent-9',
        userId: 'indigenous-individual',
        purpose: 'cultural_research',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['personal_data'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-106',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      const response = await request(app)
        .get('/api/indigenous/cultural-data')
        .set('user-id', 'indigenous-individual')
        .set('user-roles', 'community_member')
        .set('data-purpose', 'cultural_research')
        .set('required-consent-level', 'full_automation')
        .set('sovereignty-level', 'individual')
        .expect(403);

      expect(response.body.error).toBe('Access denied by policy');
      expect(response.body.consentIssue).toContain('community_consent_required');
    });

    test('should allow access with Traditional Owner community consent', async () => {
      // Mock OPA to allow access with proper community consent
      (opaService as any).httpClient.post.mockResolvedValue({
        data: { result: true }
      });

      await consentRepo.saveConsent({
        id: 'consent-10',
        userId: 'traditional-owner',
        purpose: 'cultural_preservation',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['cultural_data', 'traditional_knowledge'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-107',
          consentMethod: 'explicit',
          lawfulBasis: ['traditional_owner_authority']
        }
      });

      const response = await request(app)
        .get('/api/indigenous/traditional-knowledge')
        .set('user-id', 'traditional-owner')
        .set('user-roles', 'traditional_owner,elder')
        .set('data-purpose', 'cultural_preservation')
        .set('required-consent-level', 'full_automation')
        .set('sovereignty-level', 'traditional_owner')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sovereignty).toBe('traditional_owner');
    });
  });

  describe('Consent Audit Trail', () => {
    test('should log consent validation attempts', async () => {
      await consentRepo.saveConsent({
        id: 'consent-11',
        userId: 'audit-user',
        purpose: 'audit_test',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['test_data'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-108',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      // Mock audit service to capture calls
      const auditSpy = jest.spyOn(auditService, 'recordAuditEntry');

      await request(app)
        .get('/api/financial/audit-test')
        .set('user-id', 'audit-user')
        .set('user-roles', 'customer')
        .set('data-purpose', 'audit_test')
        .set('required-consent-level', 'full_automation')
        .expect(200);

      // Verify audit entry was created
      expect(auditSpy).toHaveBeenCalledWith(
        'audit-user',
        expect.any(String), // Action
        expect.any(String), // Target
        expect.objectContaining({
          purpose: 'audit_test',
          consentLevel: 'full_automation'
        }),
        AuditResult.SUCCESS,
        expect.any(Object)
      );
    });

    test('should track consent history', async () => {
      const userId = 'history-user';
      
      // Grant initial consent
      await consentRepo.saveConsent({
        id: 'consent-12a',
        userId,
        purpose: 'service_provision',
        level: ConsentLevel.PARTIAL_AUTOMATION,
        scope: ['basic_data'],
        grantedAt: new Date(Date.now() - 172800000), // 2 days ago
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-109a',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      // Upgrade consent
      await consentRepo.saveConsent({
        id: 'consent-12b',
        userId,
        purpose: 'service_provision',
        level: ConsentLevel.FULL_AUTOMATION,
        scope: ['basic_data', 'enhanced_features'],
        grantedAt: new Date(Date.now() - 86400000), // 1 day ago
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-109b',
          consentMethod: 'explicit',
          lawfulBasis: ['consent']
        }
      });

      // Withdraw consent
      await consentRepo.withdrawConsent(userId, 'service_provision');

      const history = await consentRepo.getConsentHistory(userId);
      
      expect(history).toHaveLength(3);
      expect(history[0].action).toBe('granted');
      expect(history[0].level).toBe(ConsentLevel.PARTIAL_AUTOMATION);
      expect(history[1].action).toBe('granted');
      expect(history[1].level).toBe(ConsentLevel.FULL_AUTOMATION);
      expect(history[2].action).toBe('withdrawn');
    });
  });

  describe('Minor Consent Scenarios', () => {
    test('should require parental consent for minors', async () => {
      // Minor user without parental consent
      const response = await request(app)
        .get('/api/financial/minor-account')
        .set('user-id', 'minor-user')
        .set('user-roles', 'minor')
        .set('user-age', '16')
        .set('data-purpose', 'account_access')
        .set('required-consent-level', 'full_automation')
        .expect(403);

      expect(response.body.error).toBe('Insufficient consent');
      expect(response.body.reason).toContain('parental_consent_required');
    });

    test('should allow access with valid parental consent', async () => {
      // Mock OPA to check parental consent requirements
      (opaService as any).httpClient.post.mockResolvedValue({
        data: { result: true }
      });

      await consentRepo.saveConsent({
        id: 'consent-13',
        userId: 'minor-with-consent',
        purpose: 'educational_account',
        level: ConsentLevel.PARTIAL_AUTOMATION,
        scope: ['educational_data'],
        grantedAt: new Date(),
        status: 'active',
        metadata: {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          sessionId: 'session-110',
          consentMethod: 'parental_explicit',
          lawfulBasis: ['parental_consent']
        }
      });

      const response = await request(app)
        .get('/api/financial/educational-account')
        .set('user-id', 'minor-with-consent')
        .set('user-roles', 'minor')
        .set('user-age', '16')
        .set('parental-consent', 'parent-consent-xyz')
        .set('data-purpose', 'educational_account')
        .set('required-consent-level', 'partial_automation')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.parentalConsent).toBe(true);
    });
  });

  // Helper methods
  private setupConsentTestEndpoints(app: express.Application): void {
    // Personal data endpoint
    app.get('/api/financial/personal-data', (req, res) => {
      const validation = (req as any).consentValidation;
      const consent = (req as any).userConsent;
      
      res.json({
        success: true,
        data: { personalInfo: 'Sensitive personal information' },
        consentValidated: validation.valid,
        consentLevel: consent?.level || 'none',
        scope: consent?.scope || [],
        timestamp: new Date().toISOString()
      });
    });

    // Sensitive data endpoint
    app.get('/api/financial/sensitive-data', (req, res) => {
      res.json({
        success: true,
        data: { sensitiveInfo: 'Highly sensitive financial data' },
        timestamp: new Date().toISOString()
      });
    });

    // Marketing endpoints
    app.get('/api/marketing/personalized-offers', (req, res) => {
      res.json({
        success: true,
        offers: ['Personalized investment options', 'Targeted savings accounts'],
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/marketing/targeted-ads', (req, res) => {
      res.json({
        success: true,
        ads: ['Relevant financial products'],
        timestamp: new Date().toISOString()
      });
    });

    // Financial service endpoints
    app.get('/api/financial/account-summary', (req, res) => {
      res.json({
        success: true,
        summary: { balance: 15000, transactions: 45 },
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/financial/account-management', (req, res) => {
      res.json({
        success: true,
        management: { settings: 'account preferences' },
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/financial/marketing-analysis', (req, res) => {
      res.json({
        success: true,
        analysis: { patterns: 'spending analysis' },
        timestamp: new Date().toISOString()
      });
    });

    // Security endpoints
    app.get('/api/security/fraud-monitoring', (req, res) => {
      res.json({
        success: true,
        monitoring: { status: 'active', riskLevel: 'low' },
        timestamp: new Date().toISOString()
      });
    });

    // Indigenous data endpoints
    app.get('/api/indigenous/cultural-data', (req, res) => {
      const decision = (req as any).policyDecision;
      res.json({
        success: true,
        data: { culturalInfo: 'Cultural knowledge' },
        sovereignty: req.headers['sovereignty-level'],
        decision: decision?.decision,
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/indigenous/traditional-knowledge', (req, res) => {
      res.json({
        success: true,
        knowledge: { traditional: 'Traditional practices' },
        sovereignty: req.headers['sovereignty-level'],
        timestamp: new Date().toISOString()
      });
    });

    // Audit test endpoint
    app.get('/api/financial/audit-test', (req, res) => {
      res.json({
        success: true,
        auditLogged: true,
        timestamp: new Date().toISOString()
      });
    });

    // Minor account endpoints
    app.get('/api/financial/minor-account', (req, res) => {
      res.json({
        success: true,
        account: { type: 'minor', restrictions: 'parental_oversight' },
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/financial/educational-account', (req, res) => {
      res.json({
        success: true,
        account: { type: 'educational', features: 'learning_tools' },
        parentalConsent: !!req.headers['parental-consent'],
        timestamp: new Date().toISOString()
      });
    });

    // Additional test endpoints
    app.get('/api/financial/temporary-data', (req, res) => {
      res.json({
        success: true,
        data: { temporary: 'time-limited access data' },
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/financial/renewed-access', (req, res) => {
      res.json({
        success: true,
        data: { renewed: 'refreshed consent data' },
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/financial/account-settings', (req, res) => {
      res.json({
        success: true,
        settings: { preferences: 'user account settings' },
        timestamp: new Date().toISOString()
      });
    });
  }

  private parseConsentLevel(level: string | undefined): ConsentLevel {
    switch (level) {
      case 'no_consent': return ConsentLevel.NO_CONSENT;
      case 'partial_automation': return ConsentLevel.PARTIAL_AUTOMATION;
      case 'full_automation': return ConsentLevel.FULL_AUTOMATION;
      case 'manual_only': return ConsentLevel.MANUAL_ONLY;
      default: return ConsentLevel.NO_CONSENT;
    }
  }

  private async validateConsent(
    consent: ConsentRecord | null,
    requiredLevel: ConsentLevel,
    purpose: string
  ): Promise<{ valid: boolean; reason: string; level?: ConsentLevel }> {
    if (!consent) {
      return { valid: false, reason: 'No consent found for purpose' };
    }

    if (consent.status === 'withdrawn') {
      return { valid: false, reason: 'Consent has been withdrawn' };
    }

    if (consent.status === 'expired' || (consent.expiresAt && consent.expiresAt < new Date())) {
      return { valid: false, reason: 'Consent has expired' };
    }

    if (consent.purpose !== purpose) {
      return { valid: false, reason: 'Consent purpose does not match request purpose' };
    }

    // Check consent level hierarchy
    const levelHierarchy = [
      ConsentLevel.NO_CONSENT,
      ConsentLevel.MANUAL_ONLY,
      ConsentLevel.PARTIAL_AUTOMATION,
      ConsentLevel.FULL_AUTOMATION
    ];

    const consentLevelIndex = levelHierarchy.indexOf(consent.level);
    const requiredLevelIndex = levelHierarchy.indexOf(requiredLevel);

    if (consentLevelIndex < requiredLevelIndex) {
      return { 
        valid: false, 
        reason: `Insufficient consent level. Required: ${requiredLevel}, provided: ${consent.level}`,
        level: consent.level
      };
    }

    return { valid: true, reason: 'Valid consent', level: consent.level };
  }

  private createIntentFromRequest(req: any): FinancialIntent {
    return {
      id: req.headers['request-id'] || `intent-${Date.now()}`,
      operation: FinancialOperation.VIEW_BALANCE, // Default operation
      user: {
        id: req.headers['user-id'] || 'anonymous',
        roles: (req.headers['user-roles'] as string || '').split(',').filter(Boolean),
        consentLevels: [req.userConsent?.level || ConsentLevel.NO_CONSENT],
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
        amount: 0,
        currency: 'AUD',
        categories: [],
        sensitivity: 'confidential',
        containsPersonalData: true
      },
      request: {
        timestamp: new Date(),
        requestId: req.headers['request-id'] || `req-${Date.now()}`,
        sessionId: req.headers['session-id'] || 'test-session',
        endpoint: req.path,
        method: req.method
      },
      compliance: {
        privacyAct: {
          personalDataInvolved: true,
          consentObtained: req.consentValidation?.valid || false,
          purposeLimitation: [req.headers['data-purpose'] || 'general'],
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

  private async evaluatePolicyWithConsent(intent: FinancialIntent, consentValidation: any): Promise<any> {
    // Check for special consent requirements
    if (intent.user.roles.includes('minor') && !intent.request.requestId?.includes('parental-consent')) {
      return {
        decision: 'deny',
        reason: 'Parental consent required for minor users',
        metadata: { consentIssue: 'parental_consent_required' }
      };
    }

    if (intent.request.endpoint?.includes('indigenous') && 
        intent.user.location?.region !== 'traditional_owner' &&
        !intent.user.roles.includes('traditional_owner')) {
      return {
        decision: 'deny',
        reason: 'Community consent required for Indigenous data',
        metadata: { consentIssue: 'community_consent_required' }
      };
    }

    // Use OPA service for policy evaluation
    const mockDecision = await (opaService as any).httpClient.post();
    
    return {
      decision: mockDecision.data.result ? 'allow' : 'deny',
      reason: mockDecision.data.result ? 'Access granted by policy' : 'Access denied by policy',
      evaluatedPolicies: ['consent.validation', 'data.access'],
      performance: { evaluationTime: 10 }
    };
  }
});