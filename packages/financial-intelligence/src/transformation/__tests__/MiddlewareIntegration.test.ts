/**
 * Middleware Integration Tests
 * 
 * Tests for integrating transformation engine with policy middleware
 * for end-to-end Australian compliance workflows
 */

import request from 'supertest';
import express from 'express';
import { TransformationEngine, createDefaultTransformationConfig } from '../TransformationEngine';
import { MiddlewareFactory } from '../../middleware/MiddlewareFactory';
import {
  TransformationType,
  TransformationRule,
  TransformationContext
} from '../types';
import { ConsentLevel, SovereigntyLevel } from '../../types/governance';

describe('Transformation Engine + Middleware Integration', () => {
  let app: express.Application;
  let transformationEngine: TransformationEngine;

  beforeEach(async () => {
    // Set up transformation engine
    const config = createDefaultTransformationConfig();
    transformationEngine = new TransformationEngine(config);
    await transformationEngine.initialize();

    // Set up Express app with middleware
    app = express();
    app.use(express.json());

    // Set up policy middleware
    const { middleware } = await MiddlewareFactory.createDevelopment();
    app.use('/api', middleware);

    // Add transformation endpoint
    app.post('/api/data/transform', async (req, res) => {
      try {
        const { data, context } = req.body;
        const result = await transformationEngine.transform(data, context);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Add protected financial endpoint with automatic transformation
    app.get('/api/financial/user/:userId', async (req, res) => {
      // Mock financial data
      const financialData = {
        user: {
          id: req.params.userId,
          name: 'John Doe',
          tfn: '123 456 789',
          salary: 75000,
          email: 'john@example.com',
          phone: '+61412345678'
        },
        accounts: [
          {
            bsb: '123-456',
            accountNumber: '1234567890',
            balance: 25000
          }
        ]
      };

      // Extract user context from middleware
      const userContext: TransformationContext = {
        userId: req.params.userId,
        roles: (req as any).userRoles || ['user'],
        consentLevel: (req as any).consentLevel || ConsentLevel.PARTIAL_AUTOMATION,
        sovereigntyLevel: (req as any).sovereigntyLevel || SovereigntyLevel.INDIVIDUAL,
        purpose: 'Financial data access',
        complianceFrameworks: ['privacy_act_1988', 'austrac'],
        location: {
          country: 'Australia',
          region: 'NSW'
        },
        temporal: {
          accessTime: new Date(),
          businessHours: true
        }
      };

      try {
        const result = await transformationEngine.transform(financialData, userContext);
        res.json(result.transformedData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Add Indigenous data endpoint with special protection
    app.get('/api/indigenous/community/:communityId', async (req, res) => {
      const indigenousData = {
        community: {
          id: req.params.communityId,
          name: 'Wurundjeri Community',
          traditionalOwners: ['Elder Smith', 'Elder Jones'],
          culturalSites: [
            {
              name: 'Sacred Grove',
              significance: 'Ceremony site',
              accessRestrictions: 'Traditional owners only'
            }
          ],
          culturalPractices: ['Smoking ceremony', 'Dreamtime stories'],
          contactEmail: 'contact@wurundjeri.org.au'
        },
        members: [
          {
            name: 'Mary Wilson',
            indigenousStatus: true,
            traditionalOwner: true,
            roles: ['Elder', 'Cultural keeper']
          }
        ]
      };

      const context: TransformationContext = {
        userId: req.headers['user-id'] as string || 'anonymous',
        roles: (req.headers['user-roles'] as string || '').split(','),
        consentLevel: ConsentLevel.MANUAL_ONLY,
        sovereigntyLevel: SovereigntyLevel.TRADITIONAL_OWNER,
        purpose: 'Community data access',
        complianceFrameworks: ['care_principles', 'indigenous_sovereignty'],
        location: {
          country: 'Australia',
          region: 'VIC'
        }
      };

      try {
        const result = await transformationEngine.transform(indigenousData, context);
        res.json(result.transformedData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Add batch transformation endpoint
    app.post('/api/data/batch-transform', async (req, res) => {
      try {
        const batchRequest = req.body;
        const result = await transformationEngine.batchTransform(batchRequest);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  describe('Direct Transformation API', () => {
    it('should transform data through API endpoint', async () => {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        tfn: '123 456 789'
      };

      const context: TransformationContext = {
        userId: 'test-user',
        roles: ['user'],
        consentLevel: ConsentLevel.PARTIAL_AUTOMATION,
        sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
        purpose: 'API testing',
        complianceFrameworks: ['privacy_act_1988', 'austrac'],
        location: {
          country: 'Australia',
          region: 'NSW'
        }
      };

      const response = await request(app)
        .post('/api/data/transform')
        .send({ data: testData, context })
        .expect(200);

      expect(response.body.operationId).toBeDefined();
      expect(response.body.transformedData.name).toBe('Test User');
      expect(response.body.transformedData.tfn).not.toBe('123 456 789'); // Should be encrypted
      expect(response.body.summary.fieldsTransformed).toBeGreaterThan(0);
    });

    it('should handle API transformation errors gracefully', async () => {
      const invalidData = undefined;
      const context = {
        userId: 'test-user',
        purpose: 'Error testing'
      };

      const response = await request(app)
        .post('/api/data/transform')
        .send({ data: invalidData, context })
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Financial Data Protection', () => {
    it('should protect financial data for regular users', async () => {
      const response = await request(app)
        .get('/api/financial/user/12345')
        .expect(200);

      const data = response.body;
      
      // TFN should be encrypted
      expect(data.user.tfn).not.toBe('123 456 789');
      
      // Phone should be encrypted
      expect(data.user.phone).not.toBe('+61412345678');
      
      // Name should be visible
      expect(data.user.name).toBe('John Doe');
      
      // Account details should be present but potentially transformed
      expect(data.accounts).toBeDefined();
      expect(data.accounts[0].accountNumber).toBeDefined();
    });

    it('should apply different protection for admin users', async () => {
      // Add admin access rule
      transformationEngine.addRule({
        id: 'admin-tfn-access',
        name: 'Admin TFN Access',
        description: 'Admins can see TFN in masked format',
        priority: 250,
        enabled: true,
        fieldPatterns: [
          { path: '*.tfn', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'user_role' as any,
            field: 'roles',
            operator: 'contains' as any,
            value: 'admin'
          }
        ],
        transformation: {
          type: TransformationType.MASK,
          parameters: {
            maskChar: '*',
            visibleChars: 3
          },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['austrac'],
          reason: 'Admin access with masking'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['admin', 'tfn']
        }
      });

      // Mock admin context in middleware
      app.use('/api/financial', (req, res, next) => {
        (req as any).userRoles = ['admin', 'financial_analyst'];
        next();
      });

      const response = await request(app)
        .get('/api/financial/user/admin-123')
        .expect(200);

      const data = response.body;
      
      // TFN should be masked for admin (not fully encrypted)
      expect(data.user.tfn).toMatch(/^123\*+/);
    });

    it('should handle financial compliance scenarios', async () => {
      // Add AUSTRAC reporting transformation
      transformationEngine.addRule({
        id: 'austrac-reporting',
        name: 'AUSTRAC Reporting Data',
        description: 'Transform data for AUSTRAC reporting',
        priority: 200,
        enabled: true,
        fieldPatterns: [
          { path: '*.salary', caseSensitive: false },
          { path: '*.balance', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'compliance_framework' as any,
            field: 'complianceFrameworks',
            operator: 'contains' as any,
            value: 'austrac'
          }
        ],
        transformation: {
          type: TransformationType.GENERALIZE,
          parameters: {
            generalizationLevel: 2 // Round to nearest $100
          },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['austrac'],
          reason: 'Financial reporting generalization'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['austrac', 'reporting']
        }
      });

      const response = await request(app)
        .get('/api/financial/user/reporting-test')
        .expect(200);

      const data = response.body;
      
      // Salary should be generalized (rounded)
      expect(data.user.salary).not.toBe(75000);
      expect(data.user.salary % 100).toBe(0); // Should be rounded to nearest $100
    });
  });

  describe('Indigenous Data Sovereignty', () => {
    it('should strictly protect Indigenous cultural data', async () => {
      const response = await request(app)
        .get('/api/indigenous/community/wurundjeri-123')
        .set('user-id', 'external-researcher')
        .set('user-roles', 'researcher')
        .expect(200);

      const data = response.body;
      
      // Cultural information should be redacted
      expect(data.community.traditionalOwners).toBe('[INDIGENOUS_DATA_PROTECTED]');
      expect(data.community.culturalPractices).toBe('[INDIGENOUS_DATA_PROTECTED]');
      expect(data.members[0].indigenousStatus).toBe('[INDIGENOUS_DATA_PROTECTED]');
      
      // Basic contact info should remain
      expect(data.community.name).toBe('Wurundjeri Community');
    });

    it('should allow Traditional Owner access to cultural data', async () => {
      // Override sovereignty context for Traditional Owner
      app.use('/api/indigenous/special', (req, res, next) => {
        (req as any).sovereigntyLevel = SovereigntyLevel.TRADITIONAL_OWNER;
        (req as any).consentLevel = ConsentLevel.FULL_AUTOMATION;
        next();
      });

      app.get('/api/indigenous/special/community/:communityId', async (req, res) => {
        const data = {
          culturalKnowledge: 'Sacred ceremony details',
          elderWisdom: 'Traditional healing practices'
        };

        const context: TransformationContext = {
          userId: req.headers['user-id'] as string || 'elder',
          roles: ['traditional_owner', 'elder'],
          consentLevel: ConsentLevel.FULL_AUTOMATION,
          sovereigntyLevel: SovereigntyLevel.TRADITIONAL_OWNER,
          purpose: 'Cultural preservation',
          complianceFrameworks: ['care_principles'],
          location: { country: 'Australia', region: 'VIC' }
        };

        try {
          const result = await transformationEngine.transform(data, context);
          res.json(result.transformedData);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      const response = await request(app)
        .get('/api/indigenous/special/community/test')
        .set('user-id', 'elder-smith')
        .set('user-roles', 'traditional_owner,elder')
        .expect(200);

      const data = response.body;
      
      // Traditional owners should see cultural data
      expect(data.culturalKnowledge).toBe('Sacred ceremony details');
      expect(data.elderWisdom).toBe('Traditional healing practices');
    });
  });

  describe('Batch Processing Integration', () => {
    it('should handle batch transformations through API', async () => {
      const batchRequest = {
        requestId: 'batch-integration-test',
        items: [
          {
            id: 'user1',
            data: { name: 'Alice', tfn: '111 222 333' }
          },
          {
            id: 'user2',
            data: { name: 'Bob', tfn: '444 555 666' }
          }
        ],
        context: {
          userId: 'batch-processor',
          roles: ['data_processor'],
          consentLevel: ConsentLevel.PARTIAL_AUTOMATION,
          sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
          purpose: 'Batch data processing',
          complianceFrameworks: ['privacy_act_1988', 'austrac']
        },
        options: {
          parallel: true,
          maxConcurrency: 2,
          continueOnError: true,
          timeout: 30000
        }
      };

      const response = await request(app)
        .post('/api/data/batch-transform')
        .send(batchRequest)
        .expect(200);

      expect(response.body.requestId).toBe('batch-integration-test');
      expect(response.body.status).toBe('success');
      expect(response.body.results).toHaveLength(2);
      expect(response.body.summary.successful).toBe(2);
      
      // Check that TFNs were transformed
      const results = response.body.results;
      expect(results[0].result.transformedData.tfn).not.toBe('111 222 333');
      expect(results[1].result.transformedData.tfn).not.toBe('444 555 666');
    });

    it('should handle partial batch failures', async () => {
      // Add a rule that will cause some items to fail
      transformationEngine.addRule({
        id: 'conditional-failure',
        name: 'Conditional Failure Rule',
        description: 'Fails for specific names',
        priority: 300,
        enabled: true,
        fieldPatterns: [
          { path: '*.name', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'field_value' as any,
            field: 'name',
            operator: 'equals' as any,
            value: 'FailName'
          }
        ],
        transformation: {
          type: TransformationType.ENCRYPT,
          parameters: {
            keyId: 'non-existent-key' // Will cause failure
          },
          reversible: true,
          deterministic: false,
          preserveFormat: false
        },
        compliance: {
          frameworks: [],
          reason: 'Test failure'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['test']
        }
      });

      const batchRequest = {
        requestId: 'batch-partial-failure',
        items: [
          {
            id: 'success-item',
            data: { name: 'GoodName' }
          },
          {
            id: 'failure-item',
            data: { name: 'FailName' }
          }
        ],
        context: {
          userId: 'test-user',
          roles: ['user'],
          consentLevel: ConsentLevel.NO_CONSENT,
          sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
          purpose: 'Testing partial failure',
          complianceFrameworks: []
        },
        options: {
          parallel: false,
          maxConcurrency: 1,
          continueOnError: true,
          timeout: 30000
        }
      };

      const response = await request(app)
        .post('/api/data/batch-transform')
        .send(batchRequest)
        .expect(200);

      expect(response.body.status).toBe('partial');
      expect(response.body.summary.successful).toBe(1);
      expect(response.body.summary.failed).toBe(1);
      
      const successItem = response.body.results.find((r: any) => r.id === 'success-item');
      const failureItem = response.body.results.find((r: any) => r.id === 'failure-item');
      
      expect(successItem.status).toBe('success');
      expect(failureItem.status).toBe('error');
      expect(failureItem.error).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent transformation requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .get(`/api/financial/user/concurrent-${i}`)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.user.id).toBe(`concurrent-${index}`);
        expect(response.body.user.tfn).not.toBe('123 456 789'); // Should be transformed
      });
    });

    it('should maintain acceptable response times', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/financial/user/performance-test')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle transformation engine failures gracefully', async () => {
      // Temporarily break the engine
      const originalTransform = transformationEngine.transform;
      transformationEngine.transform = jest.fn().mockRejectedValue(new Error('Engine failure'));

      const response = await request(app)
        .get('/api/financial/user/error-test')
        .expect(500);

      expect(response.body.error).toBe('Engine failure');

      // Restore the engine
      transformationEngine.transform = originalTransform;
    });

    it('should validate transformation context in API', async () => {
      const invalidRequest = {
        data: { name: 'Test' },
        context: null // Invalid context
      };

      const response = await request(app)
        .post('/api/data/transform')
        .send(invalidRequest)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Compliance Audit Integration', () => {
    it('should log transformation operations for audit', async () => {
      const auditEvents: any[] = [];
      
      // Listen for transformation events
      transformationEngine.on('transformation:completed', (event) => {
        auditEvents.push({
          type: 'transformation:completed',
          timestamp: new Date(),
          operationId: event.operationId,
          fieldsTransformed: event.result.summary.fieldsTransformed
        });
      });

      await request(app)
        .get('/api/financial/user/audit-test')
        .expect(200);

      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].type).toBe('transformation:completed');
      expect(auditEvents[0].operationId).toBeDefined();
    });

    it('should maintain transformation statistics', async () => {
      // Perform several transformations
      await Promise.all([
        request(app).get('/api/financial/user/stats-1'),
        request(app).get('/api/financial/user/stats-2'),
        request(app).get('/api/financial/user/stats-3')
      ]);

      const stats = transformationEngine.getStats();
      expect(stats.totalTransformations).toBeGreaterThan(0);
      expect(stats.averageTime).toBeGreaterThan(0);
    });
  });
});

describe('Real-world Integration Scenarios', () => {
  let app: express.Application;
  let transformationEngine: TransformationEngine;

  beforeEach(async () => {
    const config = createDefaultTransformationConfig();
    transformationEngine = new TransformationEngine(config);
    await transformationEngine.initialize();

    app = express();
    app.use(express.json());

    const { middleware } = await MiddlewareFactory.createProduction({
      development: {
        verboseLogging: false,
        debugHeaders: false,
        skipEvaluation: true // Skip OPA for testing
      }
    });
    app.use('/api', middleware);
  });

  it('should handle ACT community platform scenario', async () => {
    // Mock ACT community platform data
    const platformData = {
      user: {
        name: 'Community Leader',
        email: 'leader@community.org.au',
        phone: '+61412345678',
        indigenousStatus: true,
        traditionalOwner: 'Ngunnawal'
      },
      project: {
        title: 'Community Garden Initiative',
        funding: {
          requested: 50000,
          approved: 35000,
          abn: '12 345 678 901'
        },
        participants: [
          {
            name: 'Elder Mary',
            role: 'Cultural advisor',
            culturalKnowledge: 'Traditional plant use'
          }
        ]
      }
    };

    app.get('/api/community/project/:projectId', async (req, res) => {
      const context: TransformationContext = {
        userId: req.headers['user-id'] as string || 'anonymous',
        roles: (req.headers['user-roles'] as string || '').split(','),
        consentLevel: ConsentLevel.PARTIAL_AUTOMATION,
        sovereigntyLevel: SovereigntyLevel.COMMUNITY,
        purpose: 'Community platform access',
        complianceFrameworks: [
          'privacy_act_1988',
          'care_principles',
          'acnc_compliance',
          'indigenous_sovereignty'
        ],
        location: {
          country: 'Australia',
          region: 'ACT'
        }
      };

      try {
        const result = await transformationEngine.transform(platformData, context);
        res.json(result.transformedData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    const response = await request(app)
      .get('/api/community/project/garden-init')
      .set('user-id', 'community-member')
      .set('user-roles', 'member,volunteer')
      .expect(200);

    const data = response.body;

    // Indigenous data should be protected
    expect(data.user.indigenousStatus).toBe('[INDIGENOUS_DATA_PROTECTED]');
    expect(data.user.traditionalOwner).toBe('[INDIGENOUS_DATA_PROTECTED]');
    expect(data.project.participants[0].culturalKnowledge).toBe('[INDIGENOUS_DATA_PROTECTED]');

    // Contact info should be protected
    expect(data.user.phone).not.toBe('+61412345678');

    // Non-sensitive project data should be visible
    expect(data.project.title).toBe('Community Garden Initiative');
    expect(data.project.participants[0].name).toBe('Elder Mary');
  });

  it('should handle government reporting scenario', async () => {
    const reportingData = {
      organisation: {
        name: 'ACT Community Services',
        abn: '12 345 678 901',
        address: {
          street: '123 Government Street',
          postcode: '2600',
          state: 'ACT'
        }
      },
      financials: {
        revenue: 1250000,
        expenses: 980000,
        surplus: 270000,
        bankAccounts: [
          {
            bsb: '123-456',
            accountNumber: '1234567890',
            balance: 450000
          }
        ]
      },
      beneficiaries: [
        {
          name: 'Service User 1',
          demographics: {
            indigenousStatus: true,
            age: 35,
            postcode: '2617'
          },
          servicesReceived: ['housing', 'employment']
        }
      ]
    };

    app.get('/api/reporting/acnc/:orgId', async (req, res) => {
      const context: TransformationContext = {
        userId: 'government-reporter',
        roles: ['acnc_officer', 'government'],
        consentLevel: ConsentLevel.FULL_AUTOMATION,
        sovereigntyLevel: SovereigntyLevel.GOVERNMENT,
        purpose: 'ACNC regulatory reporting',
        complianceFrameworks: [
          'acnc_compliance',
          'austrac',
          'privacy_act_1988',
          'care_principles'
        ],
        location: {
          country: 'Australia',
          region: 'ACT'
        }
      };

      try {
        const result = await transformationEngine.transform(reportingData, context);
        res.json(result.transformedData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    const response = await request(app)
      .get('/api/reporting/acnc/act-community-services')
      .expect(200);

    const data = response.body;

    // Organisation details should be visible for reporting
    expect(data.organisation.name).toBe('ACT Community Services');
    expect(data.organisation.abn).toBeDefined(); // May be transformed but present

    // Financial data should be generalized for reporting
    expect(data.financials.revenue).toBeCloseTo(1250000, -3); // Rounded to thousands

    // Individual beneficiary data should be protected
    expect(data.beneficiaries[0].demographics.indigenousStatus).toBe('[INDIGENOUS_DATA_PROTECTED]');
    expect(data.beneficiaries[0].name).not.toBe('Service User 1'); // Should be anonymized
  });
});