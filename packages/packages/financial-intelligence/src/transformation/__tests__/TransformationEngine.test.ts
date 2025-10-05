/**
 * Transformation Engine Tests
 * 
 * Comprehensive test suite for data transformation and redaction
 * with Australian compliance scenarios
 */

import { TransformationEngine, createDefaultTransformationConfig } from '../TransformationEngine';
import {
  TransformationType,
  TransformationRule,
  TransformationContext,
  AustralianPatterns,
  ConditionType,
  ConditionOperator
} from '../types';
import { ConsentLevel, SovereigntyLevel } from '../../types/governance';

describe('TransformationEngine', () => {
  let engine: TransformationEngine;
  let defaultContext: TransformationContext;

  beforeEach(async () => {
    const config = createDefaultTransformationConfig();
    engine = new TransformationEngine(config);
    await engine.initialize();

    defaultContext = {
      userId: 'test-user-123',
      organisationId: 'test-org-456',
      roles: ['data_analyst'],
      consentLevel: ConsentLevel.PARTIAL_AUTOMATION,
      sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
      purpose: 'Testing data transformation',
      complianceFrameworks: ['privacy_act_1988'],
      location: {
        country: 'Australia',
        region: 'NSW'
      },
      temporal: {
        accessTime: new Date(),
        businessHours: true
      }
    };
  });

  describe('Initialization', () => {
    it('should initialize with default Australian compliance rules', async () => {
      const freshEngine = new TransformationEngine(createDefaultTransformationConfig());
      await freshEngine.initialize();
      
      const stats = freshEngine.getStats();
      expect(stats.totalTransformations).toBe(0);
    });

    it('should load Australian-specific transformation patterns', () => {
      expect(AustralianPatterns.TFN.test('123 456 789')).toBe(true);
      expect(AustralianPatterns.ABN.test('12 345 678 901')).toBe(true);
      expect(AustralianPatterns.MEDICARE.test('1234 56789 1')).toBe(true);
      expect(AustralianPatterns.PHONE.test('+61412345678')).toBe(true);
      expect(AustralianPatterns.POSTCODE.test('2000')).toBe(true);
    });
  });

  describe('Rule Management', () => {
    it('should add custom transformation rules', () => {
      const testRule: TransformationRule = {
        id: 'test-email-mask',
        name: 'Email Masking Test',
        description: 'Mask email addresses for testing',
        priority: 50,
        enabled: true,
        fieldPatterns: [
          {
            path: '*.email',
            type: ['string'],
            caseSensitive: false
          }
        ],
        conditions: [],
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
          frameworks: ['privacy_act_1988'],
          reason: 'Email protection for testing'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['test', 'email']
        }
      };

      expect(() => engine.addRule(testRule)).not.toThrow();
    });

    it('should validate rule structure', () => {
      const invalidRule = {
        id: '',
        name: 'Invalid Rule'
      } as TransformationRule;

      expect(() => engine.addRule(invalidRule)).toThrow('Rule must have id and name');
    });

    it('should remove rules', () => {
      const testRule: TransformationRule = {
        id: 'removable-rule',
        name: 'Removable Rule',
        description: 'Rule to be removed',
        priority: 10,
        enabled: true,
        fieldPatterns: [{ path: '*.test', caseSensitive: false }],
        conditions: [],
        transformation: {
          type: TransformationType.REDACT,
          parameters: {},
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: [],
          reason: 'Test rule'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: []
        }
      };

      engine.addRule(testRule);
      expect(() => engine.removeRule('removable-rule')).not.toThrow();
    });
  });

  describe('Basic Transformations', () => {
    it('should redact sensitive fields', async () => {
      const testData = {
        name: 'John Doe',
        email: 'john@example.com',
        secret: 'top-secret-data'
      };

      // Add redaction rule for secrets
      engine.addRule({
        id: 'secret-redact',
        name: 'Secret Redaction',
        description: 'Redact secret fields',
        priority: 100,
        enabled: true,
        fieldPatterns: [{ path: '*.secret', caseSensitive: false }],
        conditions: [],
        transformation: {
          type: TransformationType.REDACT,
          parameters: { replaceWith: '[CLASSIFIED]' },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['privacy_act_1988'],
          reason: 'Protect classified information'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['security']
        }
      });

      const result = await engine.transform(testData, defaultContext);

      expect(result.transformedData.name).toBe('John Doe');
      expect(result.transformedData.email).toBe('john@example.com');
      expect(result.transformedData.secret).toBe('[CLASSIFIED]');
      expect(result.summary.fieldsTransformed).toBe(1);
    });

    it('should mask personal identifiers', async () => {
      const testData = {
        phone: '+61412345678',
        account: '1234567890'
      };

      // Add masking rule
      engine.addRule({
        id: 'phone-mask',
        name: 'Phone Number Masking',
        description: 'Mask phone numbers',
        priority: 100,
        enabled: true,
        fieldPatterns: [{ path: '*.phone', caseSensitive: false }],
        conditions: [],
        transformation: {
          type: TransformationType.MASK,
          parameters: {
            maskChar: '*',
            visibleChars: 4
          },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['privacy_act_1988'],
          reason: 'Protect phone numbers'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['phone', 'masking']
        }
      });

      const result = await engine.transform(testData, defaultContext);

      expect(result.transformedData.phone).toBe('+614**********');
      expect(result.transformedData.account).toBe('1234567890'); // Not transformed
    });

    it('should hash sensitive data', async () => {
      const testData = {
        password: 'secret123',
        username: 'johndoe'
      };

      engine.addRule({
        id: 'password-hash',
        name: 'Password Hashing',
        description: 'Hash passwords for security',
        priority: 200,
        enabled: true,
        fieldPatterns: [{ path: '*.password', caseSensitive: false }],
        conditions: [],
        transformation: {
          type: TransformationType.HASH,
          parameters: {
            hashAlgorithm: 'sha256',
            salt: 'test-salt'
          },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['security'],
          reason: 'Protect user passwords'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['password', 'security']
        }
      });

      const result = await engine.transform(testData, defaultContext);

      expect(result.transformedData.password).not.toBe('secret123');
      expect(result.transformedData.password).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash
      expect(result.transformedData.username).toBe('johndoe'); // Not transformed
    });

    it('should encrypt reversible data', async () => {
      const testData = {
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111'
      };

      engine.addRule({
        id: 'pii-encrypt',
        name: 'PII Encryption',
        description: 'Encrypt personal identifiers',
        priority: 150,
        enabled: true,
        fieldPatterns: [
          { path: '*.ssn', caseSensitive: false },
          { path: '*.creditCard', caseSensitive: false }
        ],
        conditions: [],
        transformation: {
          type: TransformationType.ENCRYPT,
          parameters: {
            algorithm: 'aes-256-gcm',
            keyId: 'pii-key'
          },
          reversible: true,
          deterministic: false,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['privacy_act_1988'],
          reason: 'Protect personal identifiers'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['pii', 'encryption']
        }
      });

      const result = await engine.transform(testData, defaultContext);

      expect(result.transformedData.ssn).not.toBe('123-45-6789');
      expect(result.transformedData.creditCard).not.toBe('4111-1111-1111-1111');
      expect(result.summary.reversibleTransformations).toBe(2);
    });

    it('should tokenize sensitive fields', async () => {
      const testData = {
        accountNumber: '1234567890',
        routingNumber: '123456789'
      };

      engine.addRule({
        id: 'account-tokenize',
        name: 'Account Tokenization',
        description: 'Tokenize account numbers',
        priority: 100,
        enabled: true,
        fieldPatterns: [
          { path: '*.accountNumber', caseSensitive: false }
        ],
        conditions: [],
        transformation: {
          type: TransformationType.TOKENIZE,
          parameters: {
            tokenStrategy: 'random'
          },
          reversible: true,
          deterministic: false,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['pci_dss'],
          reason: 'Tokenize financial account numbers'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['tokenization', 'financial']
        }
      });

      const result = await engine.transform(testData, defaultContext);

      expect(result.transformedData.accountNumber).toMatch(/^TOKEN_[a-f0-9]{32}$/);
      expect(result.transformedData.routingNumber).toBe('123456789'); // Not transformed
    });
  });

  describe('Australian Compliance Rules', () => {
    it('should handle Tax File Numbers according to Australian law', async () => {
      const testData = {
        tfn: '123 456 789',
        name: 'John Doe'
      };

      const context: TransformationContext = {
        ...defaultContext,
        complianceFrameworks: ['austrac', 'privacy_act_1988']
      };

      const result = await engine.transform(testData, context);

      // TFN should be encrypted by default Australian rule
      expect(result.transformedData.tfn).not.toBe('123 456 789');
      expect(result.transformedData.name).toBe('John Doe');
    });

    it('should protect Indigenous data with sovereignty controls', async () => {
      const testData = {
        name: 'Mary Smith',
        indigenous_status: true,
        traditional_owner: 'Wurundjeri',
        cultural_practices: ['ceremony', 'dreamtime stories']
      };

      const context: TransformationContext = {
        ...defaultContext,
        sovereigntyLevel: SovereigntyLevel.TRADITIONAL_OWNER,
        complianceFrameworks: ['care_principles', 'indigenous_sovereignty']
      };

      const result = await engine.transform(testData, context);

      // Indigenous data should be redacted
      expect(result.transformedData.indigenous_status).toBe('[INDIGENOUS_DATA_PROTECTED]');
      expect(result.transformedData.traditional_owner).toBe('[INDIGENOUS_DATA_PROTECTED]');
      expect(result.transformedData.cultural_practices).toBe('[INDIGENOUS_DATA_PROTECTED]');
      expect(result.transformedData.name).toBe('Mary Smith'); // Name not affected
    });

    it('should handle Australian phone numbers and postcodes', async () => {
      const testData = {
        phone: '0412345678',
        postcode: '2000',
        address: '123 George Street'
      };

      engine.addRule({
        id: 'aus-location-generalize',
        name: 'Australian Location Generalization',
        description: 'Generalize Australian location data',
        priority: 100,
        enabled: true,
        fieldPatterns: [
          { path: '*.postcode', valuePattern: AustralianPatterns.POSTCODE.source, caseSensitive: false }
        ],
        conditions: [],
        transformation: {
          type: TransformationType.GENERALIZE,
          parameters: {
            generalizationLevel: 1
          },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['privacy_act_1988'],
          reason: 'Protect location privacy'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['location', 'australia']
        }
      });

      const result = await engine.transform(testData, defaultContext);

      expect(result.transformedData.postcode).toBe('NSW'); // Generalized to state
      expect(result.transformedData.phone).not.toBe('0412345678'); // Encrypted by default rule
    });
  });

  describe('Conditional Transformations', () => {
    it('should apply rules based on user roles', async () => {
      const testData = {
        salary: 75000,
        bonus: 5000
      };

      engine.addRule({
        id: 'admin-financial-access',
        name: 'Admin Financial Access',
        description: 'Admins can see full financial data',
        priority: 200,
        enabled: true,
        fieldPatterns: [
          { path: '*.salary', caseSensitive: false },
          { path: '*.bonus', caseSensitive: false }
        ],
        conditions: [
          {
            type: ConditionType.USER_ROLE,
            field: 'roles',
            operator: ConditionOperator.CONTAINS,
            value: 'admin'
          }
        ],
        transformation: {
          type: TransformationType.REMOVE,
          parameters: {},
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['privacy_act_1988'],
          reason: 'Remove financial data for non-admins'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['role-based']
        }
      };

      // Test with non-admin user
      const result1 = await engine.transform(testData, defaultContext);
      expect(result1.transformedData.salary).toBeUndefined();
      expect(result1.transformedData.bonus).toBeUndefined();

      // Test with admin user
      const adminContext = {
        ...defaultContext,
        roles: ['admin', 'financial_analyst']
      };
      const result2 = await engine.transform(testData, adminContext);
      expect(result2.transformedData.salary).toBe(75000);
      expect(result2.transformedData.bonus).toBe(5000);
    });

    it('should apply rules based on consent level', async () => {
      const testData = {
        email: 'user@example.com',
        preferences: { newsletter: true }
      };

      engine.addRule({
        id: 'consent-based-email',
        name: 'Consent-Based Email Processing',
        description: 'Redact email if no automation consent',
        priority: 100,
        enabled: true,
        fieldPatterns: [{ path: '*.email', caseSensitive: false }],
        conditions: [
          {
            type: ConditionType.CONSENT_LEVEL,
            field: 'consentLevel',
            operator: ConditionOperator.IN,
            value: [ConsentLevel.NO_CONSENT, ConsentLevel.MANUAL_ONLY]
          }
        ],
        transformation: {
          type: TransformationType.REDACT,
          parameters: { replaceWith: '[EMAIL_REDACTED]' },
          reversible: false,
          deterministic: true,
          preserveFormat: false
        },
        compliance: {
          frameworks: ['privacy_act_1988'],
          reason: 'Respect user consent preferences'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['consent']
        }
      };

      // Test with no consent
      const noConsentContext = {
        ...defaultContext,
        consentLevel: ConsentLevel.NO_CONSENT
      };
      const result1 = await engine.transform(testData, noConsentContext);
      expect(result1.transformedData.email).toBe('[EMAIL_REDACTED]');

      // Test with full automation consent
      const fullConsentContext = {
        ...defaultContext,
        consentLevel: ConsentLevel.FULL_AUTOMATION
      };
      const result2 = await engine.transform(testData, fullConsentContext);
      expect(result2.transformedData.email).toBe('user@example.com');
    });
  });

  describe('Batch Transformations', () => {
    it('should process multiple items in batch', async () => {
      const batchRequest = {
        requestId: 'batch-test-123',
        items: [
          {
            id: 'item1',
            data: { name: 'John', email: 'john@example.com' }
          },
          {
            id: 'item2',
            data: { name: 'Jane', email: 'jane@example.com' }
          }
        ],
        context: defaultContext,
        options: {
          parallel: true,
          maxConcurrency: 2,
          continueOnError: true,
          timeout: 30000
        }
      };

      const result = await engine.batchTransform(batchRequest);

      expect(result.requestId).toBe('batch-test-123');
      expect(result.status).toBe('success');
      expect(result.results.length).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it('should handle batch errors gracefully', async () => {
      // Add a rule that will fail
      engine.addRule({
        id: 'failing-rule',
        name: 'Failing Rule',
        description: 'Rule designed to fail',
        priority: 100,
        enabled: true,
        fieldPatterns: [{ path: '*.failField', caseSensitive: false }],
        conditions: [],
        transformation: {
          type: TransformationType.ENCRYPT,
          parameters: {
            keyId: 'non-existent-key' // This will cause failure
          },
          reversible: true,
          deterministic: false,
          preserveFormat: false
        },
        compliance: {
          frameworks: [],
          reason: 'Test failure handling'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['test']
        }
      });

      const batchRequest = {
        requestId: 'batch-error-test',
        items: [
          {
            id: 'good-item',
            data: { name: 'John' }
          },
          {
            id: 'bad-item',
            data: { failField: 'will-fail' }
          }
        ],
        context: defaultContext,
        options: {
          parallel: false,
          maxConcurrency: 1,
          continueOnError: true,
          timeout: 30000
        }
      };

      const result = await engine.batchTransform(batchRequest);

      expect(result.status).toBe('partial');
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
    });
  });

  describe('Performance and Statistics', () => {
    it('should track transformation statistics', async () => {
      const testData = { name: 'Test User' };
      
      // Perform several transformations
      for (let i = 0; i < 5; i++) {
        await engine.transform(testData, defaultContext);
      }

      const stats = engine.getStats();
      expect(stats.totalTransformations).toBe(5);
      expect(stats.successRate).toBeGreaterThan(0);
    });

    it('should emit events during transformation', async () => {
      const events: string[] = [];
      
      engine.on('transformation:started', () => events.push('started'));
      engine.on('transformation:completed', () => events.push('completed'));
      engine.on('rule:applied', () => events.push('rule_applied'));

      const testData = { name: 'Event Test' };
      await engine.transform(testData, defaultContext);

      expect(events).toContain('started');
      expect(events).toContain('completed');
    });
  });

  describe('Field Pattern Matching', () => {
    it('should match wildcard patterns', async () => {
      const testData = {
        user: {
          profile: {
            email: 'test@example.com',
            phone: '0412345678'
          },
          settings: {
            email: 'settings@example.com'
          }
        }
      };

      engine.addRule({
        id: 'wildcard-email',
        name: 'Wildcard Email Matching',
        description: 'Match emails at any level',
        priority: 100,
        enabled: true,
        fieldPatterns: [
          { path: '**.email', caseSensitive: false }
        ],
        conditions: [],
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
          frameworks: ['privacy_act_1988'],
          reason: 'Mask all email addresses'
        },
        metadata: {
          createdBy: 'test',
          createdAt: new Date(),
          version: '1.0.0',
          tags: ['wildcard']
        }
      });

      const result = await engine.transform(testData, defaultContext);

      expect(result.transformedData.user.profile.email).toBe('tes***************');
      expect(result.transformedData.user.settings.email).toBe('set******************');
      expect(result.transformedData.user.profile.phone).not.toBe('041*********'); // Different rule
    });
  });

  describe('Error Handling', () => {
    it('should handle transformation failures gracefully', async () => {
      const testData = { name: 'Error Test' };

      // Override transformation method to simulate error
      const originalMethod = (engine as any).applyTransformation;
      (engine as any).applyTransformation = jest.fn().mockRejectedValue(new Error('Simulated error'));

      await expect(engine.transform(testData, defaultContext)).rejects.toThrow('Simulated error');

      // Restore original method
      (engine as any).applyTransformation = originalMethod;
    });

    it('should validate transformation context', async () => {
      const testData = { name: 'Context Test' };
      const invalidContext = {
        userId: '', // Invalid empty userId
        roles: [],
        consentLevel: ConsentLevel.NO_CONSENT,
        sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
        purpose: '',
        complianceFrameworks: []
      } as TransformationContext;

      // Should still work but may affect rule evaluation
      await expect(engine.transform(testData, invalidContext)).resolves.toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex Australian compliance scenario', async () => {
      const complexData = {
        user: {
          name: 'Sarah Wilson',
          tfn: '123 456 789',
          abn: '12 345 678 901',
          medicare: '1234 56789 1',
          phone: '+61412345678',
          email: 'sarah@example.com',
          address: {
            street: '123 Collins Street',
            postcode: '3000',
            state: 'VIC'
          }
        },
        financial: {
          salary: 85000,
          bankAccount: {
            bsb: '123-456',
            accountNumber: '1234567890'
          }
        },
        indigenous: {
          status: true,
          traditionalOwner: 'Wurundjeri',
          culturalPractices: ['ceremony']
        }
      };

      const complianceContext: TransformationContext = {
        ...defaultContext,
        sovereigntyLevel: SovereigntyLevel.TRADITIONAL_OWNER,
        complianceFrameworks: [
          'privacy_act_1988',
          'austrac',
          'care_principles',
          'indigenous_sovereignty'
        ]
      };

      const result = await engine.transform(complexData, complianceContext);

      // TFN should be encrypted
      expect(result.transformedData.user.tfn).not.toBe('123 456 789');
      
      // Indigenous data should be protected
      expect(result.transformedData.indigenous.status).toBe('[INDIGENOUS_DATA_PROTECTED]');
      
      // Phone should be encrypted (default rule)
      expect(result.transformedData.user.phone).not.toBe('+61412345678');
      
      // Name should remain unchanged
      expect(result.transformedData.user.name).toBe('Sarah Wilson');

      expect(result.summary.fieldsTransformed).toBeGreaterThan(0);
      expect(result.audit.complianceFrameworks).toEqual([
        'privacy_act_1988',
        'austrac',
        'care_principles',
        'indigenous_sovereignty'
      ]);
    });
  });
});

describe('TransformationEngine Edge Cases', () => {
  let engine: TransformationEngine;

  beforeEach(async () => {
    engine = new TransformationEngine(createDefaultTransformationConfig());
    await engine.initialize();
  });

  it('should handle null and undefined values', async () => {
    const testData = {
      nullField: null,
      undefinedField: undefined,
      emptyString: '',
      zeroNumber: 0,
      falseBoolean: false
    };

    const context: TransformationContext = {
      userId: 'test',
      roles: [],
      consentLevel: ConsentLevel.NO_CONSENT,
      sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
      purpose: 'testing',
      complianceFrameworks: []
    };

    const result = await engine.transform(testData, context);
    
    // Should handle edge cases gracefully
    expect(result.transformedData.nullField).toBe(null);
    expect(result.transformedData.undefinedField).toBe(undefined);
    expect(result.transformedData.emptyString).toBe('');
    expect(result.transformedData.zeroNumber).toBe(0);
    expect(result.transformedData.falseBoolean).toBe(false);
  });

  it('should handle circular references in data', async () => {
    const testData: any = {
      name: 'Circular Test'
    };
    testData.self = testData; // Create circular reference

    const context: TransformationContext = {
      userId: 'test',
      roles: [],
      consentLevel: ConsentLevel.NO_CONSENT,
      sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
      purpose: 'testing',
      complianceFrameworks: []
    };

    // Should handle circular references (JSON.stringify handles them)
    await expect(engine.transform(testData, context)).resolves.toBeDefined();
  });

  it('should handle very large datasets efficiently', async () => {
    const largeData = {
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 1000
      }))
    };

    const context: TransformationContext = {
      userId: 'test',
      roles: [],
      consentLevel: ConsentLevel.NO_CONSENT,
      sovereigntyLevel: SovereigntyLevel.INDIVIDUAL,
      purpose: 'testing',
      complianceFrameworks: []
    };

    const startTime = Date.now();
    const result = await engine.transform(largeData, context);
    const endTime = Date.now();

    expect(result.transformedData.items).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });
});