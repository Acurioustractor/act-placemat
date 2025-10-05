/**
 * Financial Data Redaction Pathways Tests
 * 
 * Comprehensive test suite for data transformation and redaction scenarios
 * ensuring sensitive financial information is properly protected based on
 * user roles, consent levels, and compliance requirements.
 */

import request from 'supertest';
import express from 'express';
import { TransformationEngine, createDefaultTransformationConfig } from '../transformation/TransformationEngine';
import { OPAService } from '../OPAService';
import {
  TransformationType,
  TransformationRule,
  TransformationContext,
  ConsentLevel,
  SovereigntyLevel,
  FinancialIntent,
  FinancialOperation,
  OPAServiceConfig
} from '../types';

describe('Financial Data Redaction Pathways', () => {
  let app: express.Application;
  let transformationEngine: TransformationEngine;
  let opaService: OPAService;

  beforeEach(async () => {
    // Initialize transformation engine
    const config = createDefaultTransformationConfig();
    transformationEngine = new TransformationEngine(config);
    await transformationEngine.initialize();

    // Initialize OPA service
    const opaConfig: OPAServiceConfig = {
      server: {
        url: 'http://localhost:8181',
        timeout: 5000,
        retries: 1,
        retryDelay: 100
      },
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

    // Set up Express application with transformation middleware
    app = express();
    app.use(express.json());

    // Add transformation middleware
    app.use('/api', async (req, res, next) => {
      try {
        // Extract transformation context from headers
        const context: TransformationContext = {
          userId: req.headers['user-id'] as string || 'anonymous',
          roles: (req.headers['user-roles'] as string || '').split(',').filter(Boolean),
          consentLevel: this.parseConsentLevel(req.headers['consent-level'] as string),
          sovereigntyLevel: this.parseSovereigntyLevel(req.headers['sovereignty-level'] as string),
          purpose: req.headers['data-purpose'] as string || 'general_access',
          complianceFrameworks: (req.headers['compliance-frameworks'] as string || '').split(',').filter(Boolean),
          location: {
            country: req.headers['user-country'] as string || 'Australia',
            region: req.headers['user-region'] as string || 'NSW'
          },
          temporal: {
            accessTime: new Date(),
            businessHours: (req.headers['business-hours'] as string) !== 'false'
          }
        };

        // Store context for endpoint use
        (req as any).transformationContext = context;
        next();
      } catch (error) {
        res.status(500).json({ error: 'Transformation context error', message: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Set up test endpoints
    this.setupRedactionTestEndpoints(app);
  });

  describe('TFN (Tax File Number) Redaction', () => {
    test('should fully encrypt TFN for regular users', async () => {
      const response = await request(app)
        .get('/api/financial/user-profile/12345')
        .set('user-id', 'regular-user')
        .set('user-roles', 'customer')
        .set('consent-level', 'partial_automation')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'profile_access')
        .expect(200);

      const data = response.body.data;
      
      // TFN should be encrypted (not visible as original)
      expect(data.taxFileNumber).not.toBe('123 456 789');
      expect(data.taxFileNumber).toMatch(/^[A-Fa-f0-9]+$/); // Encrypted hex string
      expect(data.transformationApplied).toBe(true);
      expect(data.redactionLevel).toBe('encrypted');
    });

    test('should mask TFN for financial analysts', async () => {
      // Add specific rule for financial analyst TFN masking
      transformationEngine.addRule({
        id: 'analyst-tfn-mask',
        name: 'Analyst TFN Masking',
        description: 'Mask TFN for financial analysts',
        priority: 200,
        enabled: true,
        fieldPatterns: [
          { path: '*.taxFileNumber', caseSensitive: false },
          { path: '*.tfn', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'user_role' as any,
            field: 'roles',
            operator: 'contains' as any,
            value: 'financial_analyst'
          }
        ],
        transformation: {
          type: TransformationType.MASK,
          parameters: {
            maskChar: '*',
            visibleChars: 3,
            preserveFormat: true
          },
          reversible: false,
          deterministic: true,
          preserveFormat: true
        },
        compliance: {
          frameworks: ['austrac', 'privacy_act_1988'],
          reason: 'Financial analyst access with masking'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['tfn', 'financial', 'masking']
        }
      });

      const response = await request(app)
        .get('/api/financial/user-profile/67890')
        .set('user-id', 'analyst-user')
        .set('user-roles', 'financial_analyst,auditor')
        .set('consent-level', 'partial_automation')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'financial_analysis')
        .expect(200);

      const data = response.body.data;
      
      // TFN should be masked showing only first 3 characters
      expect(data.taxFileNumber).toMatch(/^123\*+/);
      expect(data.transformationApplied).toBe(true);
      expect(data.redactionLevel).toBe('masked');
    });

    test('should allow full TFN access for authorized compliance officers', async () => {
      // Add rule for compliance officer full access
      transformationEngine.addRule({
        id: 'compliance-tfn-access',
        name: 'Compliance Officer TFN Access',
        description: 'Full TFN access for compliance officers',
        priority: 300,
        enabled: true,
        fieldPatterns: [
          { path: '*.taxFileNumber', caseSensitive: false },
          { path: '*.tfn', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'user_role' as any,
            field: 'roles',
            operator: 'contains' as any,
            value: 'compliance_officer'
          },
          {
            type: 'compliance_framework' as any,
            field: 'complianceFrameworks',
            operator: 'contains' as any,
            value: 'austrac'
          }
        ],
        transformation: {
          type: TransformationType.NONE, // No transformation
          parameters: {},
          reversible: false,
          deterministic: true,
          preserveFormat: true
        },
        compliance: {
          frameworks: ['austrac'],
          reason: 'Compliance officer authorized access'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['tfn', 'compliance', 'full_access']
        }
      });

      const response = await request(app)
        .get('/api/financial/user-profile/compliance-check')
        .set('user-id', 'compliance-officer')
        .set('user-roles', 'compliance_officer,austrac_analyst')
        .set('consent-level', 'full_automation')
        .set('sovereignty-level', 'government')
        .set('data-purpose', 'compliance_audit')
        .set('compliance-frameworks', 'austrac,privacy_act_1988')
        .expect(200);

      const data = response.body.data;
      
      // TFN should be visible in full
      expect(data.taxFileNumber).toBe('123 456 789');
      expect(data.transformationApplied).toBe(false);
      expect(data.redactionLevel).toBe('none');
    });
  });

  describe('Bank Account Number Redaction', () => {
    test('should redact account numbers for low-privilege users', async () => {
      const response = await request(app)
        .get('/api/financial/account-details/98765')
        .set('user-id', 'low-privilege-user')
        .set('user-roles', 'viewer')
        .set('consent-level', 'no_consent')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'general_inquiry')
        .expect(200);

      const data = response.body.data;
      
      // Account number should be redacted
      expect(data.accountNumber).toBe('[REDACTED]');
      expect(data.bsb).toBe('[REDACTED]');
      expect(data.transformationApplied).toBe(true);
      expect(data.redactionLevel).toBe('redacted');
    });

    test('should partially mask account numbers for account holders', async () => {
      transformationEngine.addRule({
        id: 'account-holder-partial-mask',
        name: 'Account Holder Partial Masking',
        description: 'Show partial account details to account holders',
        priority: 150,
        enabled: true,
        fieldPatterns: [
          { path: '*.accountNumber', caseSensitive: false },
          { path: '*.account', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'user_role' as any,
            field: 'roles',
            operator: 'contains' as any,
            value: 'account_holder'
          }
        ],
        transformation: {
          type: TransformationType.MASK,
          parameters: {
            maskChar: '*',
            visibleChars: 4,
            visibleEnd: true
          },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['privacy_act_1988'],
          reason: 'Account holder limited access'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['account', 'masking', 'holder']
        }
      });

      const response = await request(app)
        .get('/api/financial/account-details/own-account')
        .set('user-id', 'account-holder-user')
        .set('user-roles', 'account_holder,customer')
        .set('consent-level', 'partial_automation')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'account_management')
        .expect(200);

      const data = response.body.data;
      
      // Account number should show last 4 digits
      expect(data.accountNumber).toMatch(/\*+\d{4}$/);
      expect(data.transformationApplied).toBe(true);
      expect(data.redactionLevel).toBe('masked');
    });

    test('should generalize account balances for reporting', async () => {
      transformationEngine.addRule({
        id: 'balance-generalization',
        name: 'Balance Generalization for Reporting',
        description: 'Generalize balances for statistical reporting',
        priority: 100,
        enabled: true,
        fieldPatterns: [
          { path: '*.balance', caseSensitive: false },
          { path: '*.amount', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'data_purpose' as any,
            field: 'purpose',
            operator: 'equals' as any,
            value: 'statistical_reporting'
          }
        ],
        transformation: {
          type: TransformationType.GENERALIZE,
          parameters: {
            generalizationLevel: 3, // Round to nearest $1000
            precision: 1000
          },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['privacy_act_1988', 'austrac'],
          reason: 'Statistical anonymization'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['balance', 'generalization', 'reporting']
        }
      });

      const response = await request(app)
        .get('/api/financial/balance-data/statistics')
        .set('user-id', 'statistician')
        .set('user-roles', 'data_analyst,statistician')
        .set('consent-level', 'partial_automation')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'statistical_reporting')
        .set('compliance-frameworks', 'privacy_act_1988')
        .expect(200);

      const data = response.body.data;
      
      // Balance should be generalized to nearest $1000
      expect(data.balance % 1000).toBe(0);
      expect(data.transformationApplied).toBe(true);
      expect(data.redactionLevel).toBe('generalized');
    });
  });

  describe('Contact Information Redaction', () => {
    test('should encrypt email addresses for external users', async () => {
      const response = await request(app)
        .get('/api/financial/contact-info/external-access')
        .set('user-id', 'external-user')
        .set('user-roles', 'external_analyst')
        .set('consent-level', 'no_consent')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'research')
        .expect(200);

      const data = response.body.data;
      
      // Email should be encrypted
      expect(data.email).not.toBe('user@example.com');
      expect(data.email).toMatch(/^[A-Fa-f0-9]+$/);
      expect(data.transformationApplied).toBe(true);
    });

    test('should pseudonymize phone numbers for analytics', async () => {
      transformationEngine.addRule({
        id: 'phone-pseudonymization',
        name: 'Phone Number Pseudonymization',
        description: 'Pseudonymize phone numbers for analytics',
        priority: 120,
        enabled: true,
        fieldPatterns: [
          { path: '*.phoneNumber', caseSensitive: false },
          { path: '*.phone', caseSensitive: false },
          { path: '*.mobile', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'data_purpose' as any,
            field: 'purpose',
            operator: 'equals' as any,
            value: 'analytics'
          }
        ],
        transformation: {
          type: TransformationType.PSEUDONYMIZE,
          parameters: {
            algorithm: 'deterministic_hash',
            preserveFormat: false
          },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['privacy_act_1988'],
          reason: 'Analytics pseudonymization'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['phone', 'pseudonymization', 'analytics']
        }
      });

      const response = await request(app)
        .get('/api/financial/contact-info/analytics')
        .set('user-id', 'analytics-user')
        .set('user-roles', 'data_analyst')
        .set('consent-level', 'partial_automation')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'analytics')
        .expect(200);

      const data = response.body.data;
      
      // Phone should be pseudonymized (deterministic hash)
      expect(data.phoneNumber).not.toBe('+61412345678');
      expect(data.phoneNumber).toMatch(/^[A-Fa-f0-9]+$/);
      expect(data.transformationApplied).toBe(true);
      expect(data.redactionLevel).toBe('pseudonymized');
    });
  });

  describe('Indigenous Data Protection', () => {
    test('should fully protect Indigenous cultural data from non-traditional owners', async () => {
      const response = await request(app)
        .get('/api/financial/indigenous-data/cultural-information')
        .set('user-id', 'external-researcher')
        .set('user-roles', 'researcher')
        .set('consent-level', 'partial_automation')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'research')
        .expect(200);

      const data = response.body.data;
      
      // Indigenous data should be fully protected
      expect(data.traditionalOwners).toBe('[INDIGENOUS_DATA_PROTECTED]');
      expect(data.culturalKnowledge).toBe('[INDIGENOUS_DATA_PROTECTED]');
      expect(data.sacredSites).toBe('[INDIGENOUS_DATA_PROTECTED]');
      expect(data.transformationApplied).toBe(true);
      expect(data.protectionLevel).toBe('indigenous_protected');
    });

    test('should allow Traditional Owner access to cultural data', async () => {
      transformationEngine.addRule({
        id: 'traditional-owner-access',
        name: 'Traditional Owner Cultural Data Access',
        description: 'Allow Traditional Owners full access to cultural data',
        priority: 400,
        enabled: true,
        fieldPatterns: [
          { path: '*.traditionalOwners', caseSensitive: false },
          { path: '*.culturalKnowledge', caseSensitive: false },
          { path: '*.sacredSites', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'sovereignty_level' as any,
            field: 'sovereigntyLevel',
            operator: 'equals' as any,
            value: 'traditional_owner'
          }
        ],
        transformation: {
          type: TransformationType.NONE,
          parameters: {},
          reversible: false,
          deterministic: true,
          preserveFormat: true
        },
        compliance: {
          frameworks: ['care_principles', 'indigenous_sovereignty'],
          reason: 'Traditional Owner sovereignty rights'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['indigenous', 'traditional_owner', 'cultural']
        }
      });

      const response = await request(app)
        .get('/api/financial/indigenous-data/cultural-information')
        .set('user-id', 'traditional-owner')
        .set('user-roles', 'traditional_owner,elder')
        .set('consent-level', 'full_automation')
        .set('sovereignty-level', 'traditional_owner')
        .set('data-purpose', 'cultural_preservation')
        .expect(200);

      const data = response.body.data;
      
      // Traditional Owner should see all cultural data
      expect(data.traditionalOwners).toBe('Wurundjeri Elders Council');
      expect(data.culturalKnowledge).toBe('Traditional land management practices');
      expect(data.sacredSites).toBe('Birrarung ceremonial grounds');
      expect(data.transformationApplied).toBe(false);
      expect(data.protectionLevel).toBe('none');
    });
  });

  describe('Consent-Based Data Access', () => {
    test('should limit data access without explicit consent', async () => {
      const response = await request(app)
        .get('/api/financial/personal-data/no-consent')
        .set('user-id', 'no-consent-user')
        .set('user-roles', 'customer')
        .set('consent-level', 'no_consent')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'profile_access')
        .expect(200);

      const data = response.body.data;
      
      // Most fields should be redacted without consent
      expect(data.personalDetails).toBe('[CONSENT_REQUIRED]');
      expect(data.financialHistory).toBe('[CONSENT_REQUIRED]');
      expect(data.transformationApplied).toBe(true);
      expect(data.consentRequired).toBe(true);
    });

    test('should provide full access with explicit consent', async () => {
      transformationEngine.addRule({
        id: 'full-consent-access',
        name: 'Full Consent Data Access',
        description: 'Provide full access with explicit consent',
        priority: 350,
        enabled: true,
        fieldPatterns: [
          { path: '*.personalDetails', caseSensitive: false },
          { path: '*.financialHistory', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'consent_level' as any,
            field: 'consentLevel',
            operator: 'equals' as any,
            value: 'full_automation'
          }
        ],
        transformation: {
          type: TransformationType.NONE,
          parameters: {},
          reversible: false,
          deterministic: true,
          preserveFormat: true
        },
        compliance: {
          frameworks: ['privacy_act_1988'],
          reason: 'Explicit user consent provided'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['consent', 'full_access', 'privacy']
        }
      });

      const response = await request(app)
        .get('/api/financial/personal-data/full-consent')
        .set('user-id', 'consenting-user')
        .set('user-roles', 'customer')
        .set('consent-level', 'full_automation')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'profile_management')
        .expect(200);

      const data = response.body.data;
      
      // With consent, data should be accessible
      expect(data.personalDetails).toBe('Full personal information');
      expect(data.financialHistory).toBe('Complete financial history');
      expect(data.transformationApplied).toBe(false);
      expect(data.consentRequired).toBe(false);
    });
  });

  describe('Time-Based Access Controls', () => {
    test('should apply enhanced redaction outside business hours', async () => {
      transformationEngine.addRule({
        id: 'after-hours-enhanced-redaction',
        name: 'After Hours Enhanced Redaction',
        description: 'Enhanced redaction outside business hours',
        priority: 180,
        enabled: true,
        fieldPatterns: [
          { path: '*.sensitiveData', caseSensitive: false },
          { path: '*.highRiskInformation', caseSensitive: false }
        ],
        conditions: [
          {
            type: 'business_hours' as any,
            field: 'temporal.businessHours',
            operator: 'equals' as any,
            value: false
          }
        ],
        transformation: {
          type: TransformationType.REDACT,
          parameters: {
            replacement: '[AFTER_HOURS_RESTRICTED]'
          },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['security_policy'],
          reason: 'After hours access restriction'
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['time_based', 'security', 'redaction']
        }
      });

      const response = await request(app)
        .get('/api/financial/time-sensitive-data/after-hours')
        .set('user-id', 'after-hours-user')
        .set('user-roles', 'financial_analyst')
        .set('consent-level', 'partial_automation')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'analysis')
        .set('business-hours', 'false')
        .expect(200);

      const data = response.body.data;
      
      // After hours access should be restricted
      expect(data.sensitiveData).toBe('[AFTER_HOURS_RESTRICTED]');
      expect(data.highRiskInformation).toBe('[AFTER_HOURS_RESTRICTED]');
      expect(data.transformationApplied).toBe(true);
      expect(data.businessHoursRestriction).toBe(true);
    });
  });

  describe('Multi-Level Data Classification', () => {
    test('should apply different redaction levels based on data classification', async () => {
      const response = await request(app)
        .get('/api/financial/classified-data/mixed-sensitivity')
        .set('user-id', 'classified-user')
        .set('user-roles', 'data_analyst')
        .set('consent-level', 'partial_automation')
        .set('sovereignty-level', 'individual')
        .set('data-purpose', 'analysis')
        .expect(200);

      const data = response.body.data;
      
      // Different classification levels should have different redaction
      expect(data.publicData).toBe('Public information available'); // No redaction
      expect(data.internalData).toMatch(/\*+/); // Masked
      expect(data.confidentialData).toBe('[ENCRYPTED]'); // Encrypted
      expect(data.restrictedData).toBe('[REDACTED]'); // Fully redacted
      expect(data.transformationApplied).toBe(true);
    });
  });

  // Helper methods
  private setupRedactionTestEndpoints(app: express.Application): void {
    // User profile endpoint
    app.get('/api/financial/user-profile/:userId', async (req, res) => {
      const context = (req as any).transformationContext;
      
      const originalData = {
        userId: req.params.userId,
        name: 'John Citizen',
        taxFileNumber: '123 456 789',
        email: 'user@example.com',
        phoneNumber: '+61412345678',
        address: '123 Main Street, Sydney NSW 2000'
      };

      const result = await transformationEngine.transform(originalData, context);
      
      res.json({
        success: true,
        data: result.transformedData,
        transformationApplied: result.summary.fieldsTransformed > 0,
        redactionLevel: this.determineRedactionLevel(result.transformedData),
        fieldsTransformed: result.summary.fieldsTransformed,
        timestamp: new Date().toISOString()
      });
    });

    // Account details endpoint
    app.get('/api/financial/account-details/:accountId', async (req, res) => {
      const context = (req as any).transformationContext;
      
      const originalData = {
        accountId: req.params.accountId,
        accountNumber: '1234567890',
        bsb: '123-456',
        accountName: 'Primary Savings',
        balance: 15750.50
      };

      const result = await transformationEngine.transform(originalData, context);
      
      res.json({
        success: true,
        data: result.transformedData,
        transformationApplied: result.summary.fieldsTransformed > 0,
        redactionLevel: this.determineRedactionLevel(result.transformedData),
        timestamp: new Date().toISOString()
      });
    });

    // Balance data endpoint for statistics
    app.get('/api/financial/balance-data/:purpose', async (req, res) => {
      const context = (req as any).transformationContext;
      
      const originalData = {
        userId: 'stat-user-123',
        balance: 23456.78,
        accountType: 'savings',
        lastTransaction: '2024-01-15'
      };

      const result = await transformationEngine.transform(originalData, context);
      
      res.json({
        success: true,
        data: result.transformedData,
        transformationApplied: result.summary.fieldsTransformed > 0,
        redactionLevel: this.determineRedactionLevel(result.transformedData),
        timestamp: new Date().toISOString()
      });
    });

    // Contact information endpoint
    app.get('/api/financial/contact-info/:accessType', async (req, res) => {
      const context = (req as any).transformationContext;
      
      const originalData = {
        email: 'user@example.com',
        phoneNumber: '+61412345678',
        alternatePhone: '+61487654321',
        preferredContact: 'email'
      };

      const result = await transformationEngine.transform(originalData, context);
      
      res.json({
        success: true,
        data: result.transformedData,
        transformationApplied: result.summary.fieldsTransformed > 0,
        redactionLevel: this.determineRedactionLevel(result.transformedData),
        timestamp: new Date().toISOString()
      });
    });

    // Indigenous data endpoint
    app.get('/api/financial/indigenous-data/:dataType', async (req, res) => {
      const context = (req as any).transformationContext;
      
      const originalData = {
        traditionalOwners: 'Wurundjeri Elders Council',
        culturalKnowledge: 'Traditional land management practices',
        sacredSites: 'Birrarung ceremonial grounds',
        communityContact: 'elder@wurundjeri.org.au'
      };

      const result = await transformationEngine.transform(originalData, context);
      
      res.json({
        success: true,
        data: result.transformedData,
        transformationApplied: result.summary.fieldsTransformed > 0,
        protectionLevel: this.determineProtectionLevel(result.transformedData),
        timestamp: new Date().toISOString()
      });
    });

    // Personal data with consent requirements
    app.get('/api/financial/personal-data/:consentType', async (req, res) => {
      const context = (req as any).transformationContext;
      
      const originalData = {
        personalDetails: 'Full personal information',
        financialHistory: 'Complete financial history',
        preferences: 'User preferences and settings'
      };

      const result = await transformationEngine.transform(originalData, context);
      
      res.json({
        success: true,
        data: result.transformedData,
        transformationApplied: result.summary.fieldsTransformed > 0,
        consentRequired: context.consentLevel === ConsentLevel.NO_CONSENT,
        timestamp: new Date().toISOString()
      });
    });

    // Time-sensitive data endpoint
    app.get('/api/financial/time-sensitive-data/:timeContext', async (req, res) => {
      const context = (req as any).transformationContext;
      
      const originalData = {
        sensitiveData: 'Highly sensitive financial information',
        highRiskInformation: 'High-risk operational data',
        systemConfiguration: 'Internal system settings'
      };

      const result = await transformationEngine.transform(originalData, context);
      
      res.json({
        success: true,
        data: result.transformedData,
        transformationApplied: result.summary.fieldsTransformed > 0,
        businessHoursRestriction: !context.temporal?.businessHours,
        timestamp: new Date().toISOString()
      });
    });

    // Multi-classification data endpoint
    app.get('/api/financial/classified-data/:classification', async (req, res) => {
      const context = (req as any).transformationContext;
      
      const originalData = {
        publicData: 'Public information available',
        internalData: 'Internal use information',
        confidentialData: 'Confidential business data',
        restrictedData: 'Highly restricted information'
      };

      const result = await transformationEngine.transform(originalData, context);
      
      res.json({
        success: true,
        data: result.transformedData,
        transformationApplied: result.summary.fieldsTransformed > 0,
        classificationLevels: ['public', 'internal', 'confidential', 'restricted'],
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

  private parseSovereigntyLevel(level: string | undefined): SovereigntyLevel {
    switch (level) {
      case 'individual': return SovereigntyLevel.INDIVIDUAL;
      case 'community': return SovereigntyLevel.COMMUNITY;
      case 'traditional_owner': return SovereigntyLevel.TRADITIONAL_OWNER;
      case 'government': return SovereigntyLevel.GOVERNMENT;
      default: return SovereigntyLevel.INDIVIDUAL;
    }
  }

  private determineRedactionLevel(data: any): string {
    const values = Object.values(data).join(' ');
    
    if (values.includes('[REDACTED]')) return 'redacted';
    if (values.includes('[ENCRYPTED]')) return 'encrypted';
    if (values.includes('***') || values.includes('*')) return 'masked';
    if (values.includes('[CONSENT_REQUIRED]')) return 'consent_required';
    if (typeof data.balance === 'number' && data.balance % 1000 === 0) return 'generalized';
    if (/^[A-Fa-f0-9]+$/.test(values.split(' ')[0])) return 'pseudonymized';
    
    return 'none';
  }

  private determineProtectionLevel(data: any): string {
    const values = Object.values(data).join(' ');
    
    if (values.includes('[INDIGENOUS_DATA_PROTECTED]')) return 'indigenous_protected';
    if (values.includes('[AFTER_HOURS_RESTRICTED]')) return 'time_restricted';
    
    return 'none';
  }
});