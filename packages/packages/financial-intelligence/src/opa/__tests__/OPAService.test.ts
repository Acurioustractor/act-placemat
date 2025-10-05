/**
 * OPA Service Test Suite
 * 
 * Comprehensive tests for OPA integration including policy evaluation,
 * decision logging, and Australian compliance features
 */

import { OPAService } from '../OPAService';
import { 
  FinancialIntent, 
  FinancialOperation, 
  OPAServiceConfig,
  PolicyDecision 
} from '../types';
import { AuditQueryBuilder } from '../AuditQueryBuilder';

// Mock dependencies
jest.mock('axios');
jest.mock('../PostgreSQLDecisionLogger');

describe('OPAService', () => {
  let opaService: OPAService;
  let mockConfig: OPAServiceConfig;

  beforeEach(() => {
    mockConfig = {
      server: {
        url: 'http://localhost:8181',
        timeout: 5000,
        retries: 3,
        retryDelay: 1000
      },
      logging: {
        enabled: true,
        destination: 'postgresql',
        config: {},
        retention: {
          defaultYears: 7,
          complianceYears: 10,
          indigenousDataYears: 50
        }
      },
      cache: {
        enabled: true,
        type: 'memory',
        config: {},
        defaultTTL: 300,
        maxSize: 1000
      },
      monitoring: {
        enabled: false,
        metricsProvider: 'custom',
        alertThresholds: {
          latencyMs: 1000,
          errorRate: 0.05,
          cacheHitRate: 0.8
        }
      },
      security: {
        enableInputValidation: true,
        sanitizeInputs: true,
        enableAuditLogging: true,
        encryptSensitiveData: false
      },
      compliance: {
        enforceDataResidency: true,
        enablePrivacyActCompliance: true,
        enableIndigenousProtocols: true,
        austracReportingEnabled: true,
        auditRetentionYears: 7
      }
    };

    opaService = new OPAService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      // Mock successful OPA server health check
      const mockHealthCheck = jest.spyOn(opaService, 'healthCheck').mockResolvedValue({
        status: 'healthy',
        components: {
          opaServer: 'healthy',
          database: 'healthy',
          cache: 'healthy',
          policies: 'healthy'
        },
        timestamp: new Date(),
        details: {}
      });

      await expect(opaService.initialize()).resolves.not.toThrow();
      expect(mockHealthCheck).toHaveBeenCalled();
    });

    it('should fail initialization on unhealthy OPA server', async () => {
      jest.spyOn(opaService, 'healthCheck').mockRejectedValue(new Error('OPA server unreachable'));

      await expect(opaService.initialize()).rejects.toThrow('Failed to initialize OPA service');
    });
  });

  describe('intent evaluation', () => {
    const mockIntent: FinancialIntent = {
      id: 'test-intent-123',
      operation: FinancialOperation.CREATE_PAYMENT,
      user: {
        id: 'user-456',
        roles: ['financial_manager'],
        consentLevels: ['enhanced_operations'],
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
          ipAddress: '10.0.1.100'
        }
      },
      financial: {
        amount: 500000,
        currency: 'AUD',
        categories: ['community_development'],
        sensitivity: 'confidential',
        containsPersonalData: false
      },
      request: {
        timestamp: new Date(),
        requestId: 'req-789',
        sessionId: 'session-101',
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

    it('should evaluate intent and return allow decision', async () => {
      // Mock OPA response for allow decision
      const mockOPAResponse = {
        data: {
          result: true,
          query: 'data.financial.spending_limits.allow'
        }
      };

      const mockHttpClient = {
        post: jest.fn().mockResolvedValue(mockOPAResponse)
      };

      (opaService as any).httpClient = mockHttpClient;

      const decision = await opaService.evaluateIntent(mockIntent, ['financial.spending_limits']);

      expect(decision.decision).toBe('allow');
      expect(decision.reason).toBe('Access granted by policy');
      expect(decision.evaluatedPolicies).toEqual(['financial.spending_limits']);
      expect(decision.performance.evaluationTime).toBeGreaterThan(0);
    });

    it('should evaluate intent and return deny decision', async () => {
      const mockOPAResponse = {
        data: {
          result: false,
          query: 'data.financial.spending_limits.allow'
        }
      };

      const mockHttpClient = {
        post: jest.fn().mockResolvedValue(mockOPAResponse)
      };

      (opaService as any).httpClient = mockHttpClient;

      const decision = await opaService.evaluateIntent(mockIntent, ['financial.spending_limits']);

      expect(decision.decision).toBe('deny');
      expect(decision.reason).toBe('Access denied by policy');
    });

    it('should enforce data residency requirements', async () => {
      const overseasIntent = {
        ...mockIntent,
        user: {
          ...mockIntent.user,
          location: {
            country: 'United States',
            region: 'California',
            verified: true
          }
        }
      };

      await expect(opaService.evaluateIntent(overseasIntent)).rejects.toThrow(
        'Data residency violation: user must be in Australia'
      );
    });

    it('should validate user authentication', async () => {
      const unauthenticatedIntent = {
        ...mockIntent,
        user: {
          ...mockIntent.user,
          authentication: {
            verified: false,
            mfaCompleted: false,
            sessionAge: 0,
            lastPasswordChange: 0
          }
        }
      };

      await expect(opaService.evaluateIntent(unauthenticatedIntent)).rejects.toThrow(
        'User authentication required'
      );
    });

    it('should handle Indigenous data sovereignty requirements', async () => {
      const indigenousIntent: FinancialIntent = {
        ...mockIntent,
        financial: {
          ...mockIntent.financial,
          indigenousData: {
            traditionalOwners: ['Wiradjuri'],
            careCompliance: {
              collectiveBenefit: true,
              authorityToControl: true,
              responsibility: true,
              ethics: true
            },
            culturalProtocols: {
              consultationCompleted: true,
              elderApproval: true,
              culturalImpactAssessed: true
            },
            containsSacredKnowledge: false
          }
        },
        compliance: {
          ...mockIntent.compliance,
          indigenousProtocols: {
            required: true,
            protocolsFollowed: true,
            traditionalOwnerConsent: true
          }
        }
      };

      const mockOPAResponse = {
        data: {
          result: true,
          query: 'data.community.cultural_protocols.allow'
        }
      };

      const mockHttpClient = {
        post: jest.fn().mockResolvedValue(mockOPAResponse)
      };

      (opaService as any).httpClient = mockHttpClient;

      const decision = await opaService.evaluateIntent(indigenousIntent, ['community.cultural_protocols']);
      expect(decision.decision).toBe('allow');
    });

    it('should deny access for Indigenous data without proper protocols', async () => {
      const invalidIndigenousIntent: FinancialIntent = {
        ...mockIntent,
        financial: {
          ...mockIntent.financial,
          indigenousData: {
            traditionalOwners: ['Wiradjuri'],
            careCompliance: {
              collectiveBenefit: false, // Violation
              authorityToControl: false, // Violation
              responsibility: true,
              ethics: true
            },
            culturalProtocols: {
              consultationCompleted: false, // Violation
              elderApproval: false, // Violation
              culturalImpactAssessed: false
            },
            containsSacredKnowledge: true
          }
        }
      };

      const mockOPAResponse = {
        data: {
          result: true
        }
      };

      const mockHttpClient = {
        post: jest.fn().mockResolvedValue(mockOPAResponse)
      };

      (opaService as any).httpClient = mockHttpClient;

      const decision = await opaService.evaluateIntent(invalidIndigenousIntent);
      expect(decision.decision).toBe('deny');
      expect(decision.reason).toBe('Access denied: Indigenous data sovereignty requirements not met');
    });

    it('should use cache for repeated evaluations', async () => {
      const mockOPAResponse = {
        data: {
          result: true,
          query: 'data.financial.spending_limits.allow'
        }
      };

      const mockHttpClient = {
        post: jest.fn().mockResolvedValue(mockOPAResponse)
      };

      (opaService as any).httpClient = mockHttpClient;

      // First evaluation
      const decision1 = await opaService.evaluateIntent(mockIntent, ['financial.spending_limits']);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);

      // Second evaluation should use cache
      const decision2 = await opaService.evaluateIntent(mockIntent, ['financial.spending_limits'], { useCache: true });
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1); // Should not make another call
      expect(decision2.performance.cacheHit).toBe(true);
    });

    it('should handle conditional decisions', async () => {
      const mockOPAResponse = {
        data: {
          result: {
            conditional: true,
            conditions: [
              {
                type: 'approval_required',
                description: 'Manager approval required for this transaction',
                requirements: { approverRole: 'senior_manager' }
              }
            ]
          }
        }
      };

      const mockHttpClient = {
        post: jest.fn().mockResolvedValue(mockOPAResponse)
      };

      (opaService as any).httpClient = mockHttpClient;

      const decision = await opaService.evaluateIntent(mockIntent, ['financial.spending_limits']);

      expect(decision.decision).toBe('conditional');
      expect(decision.conditions).toHaveLength(1);
      expect(decision.conditions![0].type).toBe('approval_required');
    });

    it('should handle evaluation errors gracefully', async () => {
      const mockHttpClient = {
        post: jest.fn().mockRejectedValue(new Error('OPA server error'))
      };

      (opaService as any).httpClient = mockHttpClient;

      const decision = await opaService.evaluateIntent(mockIntent, ['financial.spending_limits']);

      expect(decision.decision).toBe('deny');
      expect(decision.reason).toContain('Policy evaluation failed');
    });
  });

  describe('policy management', () => {
    const mockPolicy = {
      id: 'test-policy',
      name: 'Test Policy',
      rego: 'package test\nallow = true'
    };

    it('should load policy successfully', async () => {
      const mockHttpClient = {
        put: jest.fn().mockResolvedValue({ status: 200 })
      };

      (opaService as any).httpClient = mockHttpClient;

      await expect(opaService.loadPolicy(mockPolicy as any)).resolves.not.toThrow();
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        `/v1/policies/${mockPolicy.id}`,
        mockPolicy.rego,
        { headers: { 'Content-Type': 'text/plain' } }
      );
    });

    it('should handle policy loading errors', async () => {
      const mockHttpClient = {
        put: jest.fn().mockRejectedValue(new Error('Policy syntax error'))
      };

      (opaService as any).httpClient = mockHttpClient;

      await expect(opaService.loadPolicy(mockPolicy as any)).rejects.toThrow(
        'Failed to load policy test-policy'
      );
    });

    it('should remove policy successfully', async () => {
      const mockHttpClient = {
        delete: jest.fn().mockResolvedValue({ status: 200 })
      };

      (opaService as any).httpClient = mockHttpClient;

      await expect(opaService.removePolicy('test-policy')).resolves.not.toThrow();
      expect(mockHttpClient.delete).toHaveBeenCalledWith('/v1/policies/test-policy');
    });
  });

  describe('audit logging', () => {
    it('should log decisions when logging is enabled', async () => {
      const mockDecisionLogger = {
        log: jest.fn().mockResolvedValue(undefined)
      };

      (opaService as any).decisionLogger = mockDecisionLogger;

      const mockIntent = {
        id: 'test-intent',
        operation: FinancialOperation.VIEW_BALANCE,
        user: { id: 'user-123', roles: ['viewer'], location: { country: 'Australia' } },
        financial: { amount: 100, currency: 'AUD', categories: [], sensitivity: 'public', containsPersonalData: false },
        request: { timestamp: new Date(), requestId: 'req-123', sessionId: 'session-123', endpoint: '/test', method: 'GET' },
        compliance: {
          privacyAct: { personalDataInvolved: false, consentObtained: true, purposeLimitation: [], crossBorderTransfer: false },
          dataResidency: { country: 'Australia', region: 'sydney', governmentApproved: true }
        }
      } as FinancialIntent;

      const mockOPAResponse = {
        data: { result: true }
      };

      const mockHttpClient = {
        post: jest.fn().mockResolvedValue(mockOPAResponse)
      };

      (opaService as any).httpClient = mockHttpClient;

      await opaService.evaluateIntent(mockIntent);

      expect(mockDecisionLogger.log).toHaveBeenCalled();
      const logCall = mockDecisionLogger.log.mock.calls[0][0];
      expect(logCall.intent.id).toBe('test-intent');
      expect(logCall.decision.decision).toBe('allow');
    });

    it('should calculate appropriate retention periods', async () => {
      const mockDecisionLogger = {
        log: jest.fn().mockResolvedValue(undefined)
      };

      (opaService as any).decisionLogger = mockDecisionLogger;

      // Test Indigenous data retention
      const indigenousIntent = {
        id: 'indigenous-intent',
        operation: FinancialOperation.VIEW_BALANCE,
        user: { id: 'user-123', roles: ['viewer'], location: { country: 'Australia' } },
        financial: { 
          amount: 100, 
          currency: 'AUD', 
          categories: [], 
          sensitivity: 'public', 
          containsPersonalData: false,
          indigenousData: {
            traditionalOwners: ['TestGroup'],
            careCompliance: { collectiveBenefit: true, authorityToControl: true, responsibility: true, ethics: true },
            culturalProtocols: { consultationCompleted: true, elderApproval: true, culturalImpactAssessed: true },
            containsSacredKnowledge: false
          }
        },
        request: { timestamp: new Date(), requestId: 'req-123', sessionId: 'session-123', endpoint: '/test', method: 'GET' },
        compliance: {
          privacyAct: { personalDataInvolved: false, consentObtained: true, purposeLimitation: [], crossBorderTransfer: false },
          dataResidency: { country: 'Australia', region: 'sydney', governmentApproved: true }
        }
      } as FinancialIntent;

      const mockOPAResponse = {
        data: { result: true }
      };

      const mockHttpClient = {
        post: jest.fn().mockResolvedValue(mockOPAResponse)
      };

      (opaService as any).httpClient = mockHttpClient;

      await opaService.evaluateIntent(indigenousIntent);

      expect(mockDecisionLogger.log).toHaveBeenCalled();
      const logCall = mockDecisionLogger.log.mock.calls[0][0];
      expect(logCall.audit.retentionYears).toBe(50); // Indigenous data retention
    });
  });

  describe('health checks', () => {
    it('should return healthy status when all components are healthy', async () => {
      const mockHttpClient = {
        get: jest.fn().mockResolvedValue({ status: 200 })
      };

      const mockDecisionLogger = {
        healthCheck: jest.fn().mockResolvedValue(undefined)
      };

      (opaService as any).httpClient = mockHttpClient;
      (opaService as any).decisionLogger = mockDecisionLogger;

      const health = await opaService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.components.opaServer).toBe('healthy');
      expect(health.components.database).toBe('healthy');
    });

    it('should return unhealthy status when OPA server is down', async () => {
      const mockHttpClient = {
        get: jest.fn().mockRejectedValue(new Error('Connection refused'))
      };

      const mockDecisionLogger = {
        healthCheck: jest.fn().mockResolvedValue(undefined)
      };

      (opaService as any).httpClient = mockHttpClient;
      (opaService as any).decisionLogger = mockDecisionLogger;

      const health = await opaService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.components.opaServer).toBe('unhealthy');
      expect(health.details.opaError).toBe('Connection refused');
    });
  });

  describe('statistics', () => {
    it('should track and return service statistics', async () => {
      const mockHttpClient = {
        post: jest.fn().mockResolvedValue({ data: { result: true } })
      };

      (opaService as any).httpClient = mockHttpClient;

      const mockIntent = {
        id: 'test-intent',
        operation: FinancialOperation.VIEW_BALANCE,
        user: { 
          id: 'user-123', 
          roles: ['viewer'], 
          consentLevels: [], 
          authentication: { verified: true, mfaCompleted: true, sessionAge: 1, lastPasswordChange: 30 },
          location: { country: 'Australia', verified: true },
          network: { type: 'corporate', securityVerified: true, ipAddress: '127.0.0.1' }
        },
        financial: { 
          amount: 100, 
          currency: 'AUD', 
          categories: [], 
          sensitivity: 'public', 
          containsPersonalData: false 
        },
        request: { 
          timestamp: new Date(), 
          requestId: 'req-123', 
          sessionId: 'session-123', 
          endpoint: '/test', 
          method: 'GET' 
        },
        compliance: {
          privacyAct: { 
            personalDataInvolved: false, 
            consentObtained: true, 
            purposeLimitation: [], 
            crossBorderTransfer: false 
          },
          dataResidency: { 
            country: 'Australia', 
            region: 'sydney', 
            governmentApproved: true 
          }
        }
      } as FinancialIntent;

      // Simulate multiple evaluations
      await opaService.evaluateIntent(mockIntent);
      await opaService.evaluateIntent(mockIntent);

      const stats = opaService.getStatistics();

      expect(stats.requests.total).toBe(2);
      expect(stats.requests.successful).toBe(2);
      expect(stats.decisions.allowed).toBe(2);
    });
  });

  describe('cache management', () => {
    it('should clear cache when requested', () => {
      expect(() => opaService.clearCache()).not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      const mockDecisionLogger = {
        shutdown: jest.fn().mockResolvedValue(undefined)
      };

      (opaService as any).decisionLogger = mockDecisionLogger;

      await expect(opaService.shutdown()).resolves.not.toThrow();
      expect(mockDecisionLogger.shutdown).toHaveBeenCalled();
    });
  });

  describe('batch evaluation', () => {
    it('should evaluate multiple intents efficiently', async () => {
      const mockHttpClient = {
        post: jest.fn().mockResolvedValue({ data: { result: true } })
      };

      (opaService as any).httpClient = mockHttpClient;

      const mockIntent1 = {
        id: 'intent-1',
        operation: FinancialOperation.VIEW_BALANCE
        // ... other required fields with proper structure
      } as FinancialIntent;

      const mockIntent2 = {
        id: 'intent-2',
        operation: FinancialOperation.CREATE_PAYMENT
        // ... other required fields with proper structure
      } as FinancialIntent;

      const requests = [
        { intent: mockIntent1, policies: ['financial.spending_limits'] },
        { intent: mockIntent2, policies: ['financial.spending_limits'] }
      ];

      const decisions = await opaService.evaluateIntents(requests);

      expect(decisions).toHaveLength(2);
      expect(decisions[0].decision).toBe('allow');
      expect(decisions[1].decision).toBe('allow');
    });
  });
});

describe('AuditQueryBuilder', () => {
  it('should build time range query correctly', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-02');

    const query = new AuditQueryBuilder()
      .timeRange(start, end)
      .build();

    expect(query.timeRange.start).toEqual(start);
    expect(query.timeRange.end).toEqual(end);
  });

  it('should build user filter query correctly', () => {
    const query = new AuditQueryBuilder()
      .timeRange(new Date('2024-01-01'), new Date('2024-01-02'))
      .forUser('user-123')
      .build();

    expect(query.filters?.userId).toBe('user-123');
  });

  it('should build compliance query correctly', () => {
    const query = new AuditQueryBuilder()
      .timeRange(new Date('2024-01-01'), new Date('2024-01-02'))
      .privacyActDecisions()
      .build();

    expect(query.filters?.complianceFlags).toContain('privacy_act');
  });

  it('should build recent activity query correctly', () => {
    const query = new AuditQueryBuilder()
      .recentActivity(24)
      .build();

    const expectedStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(query.timeRange.start.getTime()).toBeCloseTo(expectedStart.getTime(), -4); // Within 10 seconds
  });

  it('should require time range', () => {
    expect(() => {
      new AuditQueryBuilder()
        .forUser('user-123')
        .build();
    }).toThrow('Time range is required for audit queries');
  });

  it('should set default pagination and sorting', () => {
    const query = new AuditQueryBuilder()
      .timeRange(new Date('2024-01-01'), new Date('2024-01-02'))
      .build();

    expect(query.pagination).toEqual({ offset: 0, limit: 50 });
    expect(query.sort).toEqual({ field: 'timestamp', direction: 'desc' });
  });

  it('should handle custom pagination and sorting', () => {
    const query = new AuditQueryBuilder()
      .timeRange(new Date('2024-01-01'), new Date('2024-01-02'))
      .paginate(100, 25)
      .sortBy('userId', 'asc')
      .build();

    expect(query.pagination).toEqual({ offset: 100, limit: 25 });
    expect(query.sort).toEqual({ field: 'userId', direction: 'asc' });
  });

  it('should chain multiple filters correctly', () => {
    const query = new AuditQueryBuilder()
      .timeRange(new Date('2024-01-01'), new Date('2024-01-02'))
      .forUser('user-123')
      .withDecision('deny')
      .privacyActDecisions()
      .highSensitivityData()
      .build();

    expect(query.filters?.userId).toBe('user-123');
    expect(query.filters?.decision).toBe('deny');
    expect(query.filters?.complianceFlags).toContain('privacy_act');
    expect(query.filters?.dataClassification).toEqual(['restricted', 'secret']);
  });
});