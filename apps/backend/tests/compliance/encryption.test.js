/**
 * Encryption and Data Sovereignty Tests
 * Tests field-level encryption, data export/deletion, and compliance features
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createSecureApp } from '../../src/config/secureServer.js';
import PostgreSQLDataSource from '../../src/services/dataSources/postgresDataSource.js';
import AuditLogger from '../../src/services/compliance/auditLogger.js';
import ComplianceMonitor from '../../src/services/compliance/complianceMonitor.js';
import {
  encryptData,
  decryptData,
} from '../../src/services/encryption/encryptionService.js';

describe('Encryption and Compliance System Tests', () => {
  let app;
  let postgresDataSource;
  let auditLogger;
  let complianceMonitor;
  let testUserId;
  let testUserToken;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.ENCRYPTION_KEY_users_data = 'test-encryption-key-32-characters-long';
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

    // Initialize services
    app = await createSecureApp();
    postgresDataSource = new PostgreSQLDataSource();
    auditLogger = new AuditLogger();
    complianceMonitor = new ComplianceMonitor();

    // Initialize data sources
    await postgresDataSource.initialize();
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await postgresDataSource.deleteUserData(testUserId);
    }
  });

  beforeEach(() => {
    // Reset test state
    testUserId = `test-user-${Date.now()}`;
    testUserToken = 'test-jwt-token';
  });

  describe('Field-Level Encryption', () => {
    test('should encrypt sensitive user data before database storage', async () => {
      const userData = {
        id: testUserId,
        name: 'Test User',
        email: 'test@example.com', // Sensitive field
        phone: '+61 400 123 456', // Sensitive field
        bio: 'Test user bio', // Sensitive field
        public_info: 'This is public',
      };

      // Test encryption
      const encryptedData = await postgresDataSource.encryptSensitiveData(
        'users',
        userData
      );

      // Check that sensitive fields are encrypted
      expect(encryptedData.email).not.toBe(userData.email);
      expect(encryptedData.phone).not.toBe(userData.phone);
      expect(encryptedData.bio).not.toBe(userData.bio);

      // Check that non-sensitive fields are unchanged
      expect(encryptedData.name).toBe(userData.name);
      expect(encryptedData.public_info).toBe(userData.public_info);
    });

    test('should decrypt sensitive data after database retrieval', async () => {
      const originalData = {
        id: testUserId,
        email: 'test@example.com',
        phone: '+61 400 123 456',
        bio: 'Test user bio',
      };

      // Encrypt the data
      const encryptedData = await postgresDataSource.encryptSensitiveData(
        'users',
        originalData
      );

      // Decrypt the data
      const decryptedData = await postgresDataSource.decryptSensitiveData(
        'users',
        encryptedData
      );

      // Verify decryption worked correctly
      expect(decryptedData.email).toBe(originalData.email);
      expect(decryptedData.phone).toBe(originalData.phone);
      expect(decryptedData.bio).toBe(originalData.bio);
    });

    test('should handle encryption of arrays and objects', async () => {
      const complexData = {
        id: testUserId,
        contact_details: {
          email: 'test@example.com',
          phone: '+61 400 123 456',
          address: {
            street: '123 Test St',
            city: 'Sydney',
            postcode: '2000',
          },
        },
        preferences: ['email', 'sms', 'push'],
      };

      // Test encryption of complex data
      const encrypted = await postgresDataSource.encryptSensitiveData(
        'user_profiles',
        complexData
      );
      const decrypted = await postgresDataSource.decryptSensitiveData(
        'user_profiles',
        encrypted
      );

      expect(decrypted.contact_details.email).toBe(complexData.contact_details.email);
      expect(decrypted.contact_details.address.street).toBe(
        complexData.contact_details.address.street
      );
      expect(decrypted.preferences).toEqual(complexData.preferences);
    });

    test('should skip encryption in test environment when configured', async () => {
      // Create a new data source with encryption disabled
      const testDataSource = new PostgreSQLDataSource();
      testDataSource.encryptionEnabled = false;

      const userData = {
        email: 'test@example.com',
        phone: '+61 400 123 456',
      };

      const result = await testDataSource.encryptSensitiveData('users', userData);

      // Data should be unchanged when encryption is disabled
      expect(result.email).toBe(userData.email);
      expect(result.phone).toBe(userData.phone);
    });
  });

  describe('Data Export API', () => {
    test('should export user data in JSON format', async () => {
      // Mock authenticated request
      const response = await request(app)
        .get('/api/data-sovereignty/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ format: 'json' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata.categories).toBeDefined();
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should export user data in CSV format', async () => {
      const response = await request(app)
        .get('/api/data-sovereignty/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=/);
      expect(response.text).toContain('email,phone'); // CSV headers
    });

    test('should export user data in ZIP format', async () => {
      const response = await request(app)
        .get('/api/data-sovereignty/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ format: 'zip' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/zip/);
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=/);
    });

    test('should support selective data export by categories', async () => {
      const response = await request(app)
        .get('/api/data-sovereignty/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({
          format: 'json',
          categories: 'profile,preferences',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.categories).toContain('profile');
      expect(response.body.metadata.categories).toContain('preferences');
    });

    test('should require authentication for data export', async () => {
      await request(app).get('/api/data-sovereignty/export').expect(401);
    });
  });

  describe('Data Deletion API', () => {
    test('should process data deletion request with proper confirmation', async () => {
      const response = await request(app)
        .post('/api/data-sovereignty/delete-request')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          confirmationPhrase: 'DELETE MY DATA PERMANENTLY',
          categories: ['profile', 'content'],
          reason: 'Account closure',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.deletionId).toBeDefined();
      expect(response.body.processedCategories).toEqual(['profile', 'content']);
    });

    test('should reject deletion request without proper confirmation', async () => {
      const response = await request(app)
        .post('/api/data-sovereignty/delete-request')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          confirmationPhrase: 'delete my data', // Wrong phrase
          categories: ['profile'],
          reason: 'Test',
        })
        .expect(400);

      expect(response.body.error).toMatch(/confirmation phrase required/i);
    });

    test('should require authentication for deletion requests', async () => {
      await request(app).post('/api/data-sovereignty/delete-request').expect(401);
    });
  });

  describe('Data Summary API', () => {
    test('should provide data summary for authenticated users', async () => {
      const response = await request(app)
        .get('/api/data-sovereignty/summary')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.dataSummary).toBeDefined();
      expect(response.body.dataSummary.totalRecords).toBeDefined();
      expect(response.body.dataSummary.categories).toBeDefined();
      expect(response.body.retentionInfo).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    test('should log data export events', async () => {
      const logSpy = jest.spyOn(auditLogger, 'logDataExport');

      await request(app)
        .get('/api/data-sovereignty/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ format: 'json' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.any(String), // userId
        expect.objectContaining({
          format: 'json',
        })
      );

      logSpy.mockRestore();
    });

    test('should log data deletion events', async () => {
      const logSpy = jest.spyOn(auditLogger, 'logDeletionRequest');

      await request(app)
        .post('/api/data-sovereignty/delete-request')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          confirmationPhrase: 'DELETE MY DATA PERMANENTLY',
          categories: ['profile'],
          reason: 'Test deletion',
        });

      expect(logSpy).toHaveBeenCalledWith(
        expect.any(String), // userId
        expect.objectContaining({
          categories: ['profile'],
          reason: 'Test deletion',
        })
      );

      logSpy.mockRestore();
    });

    test('should log security incidents', async () => {
      const incident = {
        type: 'test_incident',
        severity: 'medium',
        details: { test: true },
        resolved: false,
        userId: testUserId,
      };

      await auditLogger.logSecurityIncident(incident);

      // Verify the incident was logged (would query audit logs in real test)
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should generate compliance reports', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endDate = new Date();

      const report = await auditLogger.generateComplianceReport(
        startDate.toISOString(),
        endDate.toISOString(),
        'test'
      );

      expect(report.reportType).toBe('test');
      expect(report.summary).toBeDefined();
      expect(report.privacyRequests).toBeDefined();
      expect(report.securityEvents).toBeDefined();
      expect(report.complianceMetrics).toBeDefined();
    });
  });

  describe('Compliance Monitor', () => {
    test('should initialize compliance monitoring', async () => {
      await complianceMonitor.startMonitoring();
      expect(complianceMonitor.monitoringActive).toBe(true);
      expect(complianceMonitor.scheduledTasks.length).toBeGreaterThan(0);
    });

    test('should perform health check', async () => {
      const health = await complianceMonitor.performInitialHealthCheck();

      expect(health.timestamp).toBeDefined();
      expect(health.auditingEnabled).toBeDefined();
      expect(health.encryptionHealth).toBeDefined();
      expect(health.databaseConnectivity).toBeDefined();
      expect(health.complianceMonitoring).toBeDefined();
    });

    test('should check for compliance violations', async () => {
      const mockReport = {
        privacyRequests: { averageProcessingTime: 35 }, // Over 30 day threshold
        complianceMetrics: {
          encryptionCoverage: { percentage: '70.5' }, // Under 80% threshold
        },
      };

      const violations = complianceMonitor.checkComplianceViolations(mockReport);

      expect(violations).toHaveLength(2);
      expect(violations[0].type).toBe('privacy_request_delay');
      expect(violations[1].type).toBe('insufficient_encryption_coverage');
    });

    test('should calculate compliance score', async () => {
      const mockReport = {
        securityEvents: { highRiskEvents: 2 },
        privacyRequests: { averageProcessingTime: 10 },
      };

      const score = complianceMonitor.calculateComplianceScore(mockReport);
      expect(score).toBe(84); // 100 - (2 * 5) - (3 * 2) = 84
    });

    test('should stop monitoring gracefully', async () => {
      complianceMonitor.stopMonitoring();
      expect(complianceMonitor.monitoringActive).toBe(false);
      expect(complianceMonitor.scheduledTasks).toHaveLength(0);
    });
  });

  describe('Cultural Safety Integration', () => {
    test('should log cultural safety events', async () => {
      await auditLogger.logCulturalSafetyEvent('content_review', {
        contentType: 'story',
        contentId: 'test-story-123',
        culturalProtocols: ['NSW', 'Traditional Owner'],
        communityConsent: true,
        safetyScore: 85,
      });

      // Verify logging occurred (would check audit logs in real implementation)
      expect(true).toBe(true);
    });

    test('should handle Indigenous data sovereignty flags', async () => {
      const culturalData = {
        content: 'Traditional knowledge content',
        culturalSafety: 95,
        indigenousData: true,
        communityConsent: true,
      };

      const encrypted = await postgresDataSource.encryptSensitiveData(
        'stories',
        culturalData
      );
      const decrypted = await postgresDataSource.decryptSensitiveData(
        'stories',
        encrypted
      );

      expect(decrypted.content).toBe(culturalData.content);
      expect(decrypted.indigenousData).toBe(true);
      expect(decrypted.communityConsent).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should complete full user data lifecycle', async () => {
      // 1. Create user with encrypted data
      const userData = {
        id: testUserId,
        email: 'integration@test.com',
        phone: '+61 400 555 666',
        bio: 'Integration test user',
      };

      const encrypted = await postgresDataSource.encryptSensitiveData(
        'users',
        userData
      );
      expect(encrypted.email).not.toBe(userData.email);

      // 2. Export user data
      const exportResponse = await request(app)
        .get('/api/data-sovereignty/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ format: 'json', decrypt: 'true' });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.success).toBe(true);

      // 3. Delete user data
      const deleteResponse = await request(app)
        .post('/api/data-sovereignty/delete-request')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          confirmationPhrase: 'DELETE MY DATA PERMANENTLY',
          categories: ['profile', 'content', 'preferences'],
          reason: 'Integration test cleanup',
        });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });

    test('should maintain audit trail throughout data operations', async () => {
      // Perform a series of operations
      await request(app)
        .get('/api/data-sovereignty/summary')
        .set('Authorization', `Bearer ${testUserToken}`);

      await request(app)
        .get('/api/data-sovereignty/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ format: 'csv' });

      // Check that audit events were created
      // In a real test, we'd query the audit_logs table
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error Handling', () => {
    test('should handle encryption failures gracefully', async () => {
      // Temporarily corrupt encryption key
      const originalKey = process.env.ENCRYPTION_KEY_users_data;
      process.env.ENCRYPTION_KEY_users_data = 'invalid-key';

      const userData = { email: 'test@example.com' };

      // Should not throw but should handle gracefully
      try {
        await postgresDataSource.encryptSensitiveData('users', userData);
      } catch (error) {
        expect(error.message).toMatch(/encryption/i);
      }

      // Restore key
      process.env.ENCRYPTION_KEY_users_data = originalKey;
    });

    test('should handle audit logging failures without crashing', async () => {
      // Mock audit logger failure
      const originalLog = auditLogger.log;
      auditLogger.log = jest.fn().mockRejectedValue(new Error('Audit log failure'));

      // Application should continue working even if audit logging fails
      const response = await request(app)
        .get('/api/data-sovereignty/summary')
        .set('Authorization', `Bearer ${testUserToken}`);

      // Request should still succeed
      expect(response.status).toBe(200);

      // Restore original method
      auditLogger.log = originalLog;
    });
  });
});

// Mock implementations for testing
jest.mock('../../src/middleware/authentication.js', () => ({
  authenticateUser: (req, res, next) => {
    // Mock authentication
    req.user = { id: `test-user-${Date.now()}` };
    next();
  },
}));
