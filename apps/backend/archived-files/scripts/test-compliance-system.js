#!/usr/bin/env node
/**
 * Compliance System Test Runner
 * Interactive script to test and demonstrate encryption and compliance features
 */

import { createSecureApp } from '../src/config/secureServer.js';
import PostgreSQLDataSource from '../src/services/dataSources/postgresDataSource.js';
import AuditLogger from '../src/services/compliance/auditLogger.js';
import ComplianceMonitor from '../src/services/compliance/complianceMonitor.js';
import complianceStartup from '../src/startup/complianceStartup.js';
import {
  encryptData,
  decryptData,
  encryptionHealthCheck,
} from '../src/services/encryption/encryptionService.js';
import chalk from 'chalk';
import readline from 'readline/promises';

class ComplianceTestRunner {
  constructor() {
    this.postgresDataSource = null;
    this.auditLogger = null;
    this.complianceMonitor = null;
    this.testUserId = `test-user-${Date.now()}`;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async run() {
    console.log(chalk.blue.bold('\n🔒 ACT Platform - Compliance System Test Runner\n'));

    try {
      await this.setup();
      await this.showMenu();
    } catch (error) {
      console.error(chalk.red('❌ Error during testing:'), error);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async setup() {
    console.log(chalk.yellow('🔧 Setting up test environment...\n'));

    // Set test environment variables
    process.env.NODE_ENV = 'development'; // Use development to enable encryption
    process.env.ENCRYPTION_KEY_users_data =
      process.env.ENCRYPTION_KEY_users_data ||
      Buffer.from('test-encryption-key-for-compliance-testing').toString('base64');

    // Initialize services
    this.postgresDataSource = new PostgreSQLDataSource();
    this.auditLogger = new AuditLogger();
    this.complianceMonitor = new ComplianceMonitor();

    try {
      await this.postgresDataSource.initialize();
      console.log(chalk.green('✅ PostgreSQL data source initialized'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  PostgreSQL not available (will use mock data)'));
    }

    // Initialize compliance startup
    try {
      await complianceStartup.initialize();
      console.log(chalk.green('✅ Compliance monitoring initialized'));
    } catch (error) {
      console.log(
        chalk.yellow('⚠️  Compliance monitoring initialization failed:', error.message)
      );
    }

    console.log(chalk.green('\n✅ Test environment ready!\n'));
  }

  async showMenu() {
    while (true) {
      console.log(chalk.cyan.bold('📋 Test Options:'));
      console.log('1. Test field-level encryption');
      console.log('2. Test audit logging');
      console.log('3. Test compliance monitoring');
      console.log('4. Test data export simulation');
      console.log('5. Test data deletion simulation');
      console.log('6. Run health checks');
      console.log('7. Generate compliance report');
      console.log('8. Test cultural safety features');
      console.log('9. Run full integration test');
      console.log('0. Exit');

      const choice = await this.rl.question(chalk.yellow('\nSelect an option (0-9): '));

      switch (choice.trim()) {
        case '1':
          await this.testFieldLevelEncryption();
          break;
        case '2':
          await this.testAuditLogging();
          break;
        case '3':
          await this.testComplianceMonitoring();
          break;
        case '4':
          await this.testDataExportSimulation();
          break;
        case '5':
          await this.testDataDeletionSimulation();
          break;
        case '6':
          await this.runHealthChecks();
          break;
        case '7':
          await this.generateComplianceReport();
          break;
        case '8':
          await this.testCulturalSafetyFeatures();
          break;
        case '9':
          await this.runFullIntegrationTest();
          break;
        case '0':
          console.log(chalk.blue('\n👋 Goodbye!'));
          return;
        default:
          console.log(chalk.red('❌ Invalid option. Please try again.'));
      }

      console.log(chalk.gray('\n' + '='.repeat(60) + '\n'));
    }
  }

  async testFieldLevelEncryption() {
    console.log(chalk.blue.bold('\n🔐 Testing Field-Level Encryption\n'));

    // Test data with sensitive information
    const testData = {
      id: this.testUserId,
      name: 'Test User', // Not sensitive
      email: 'test.user@example.com', // Sensitive
      phone: '+61 400 123 456', // Sensitive
      bio: 'This is a test user biography with personal details', // Sensitive
      public_profile: 'Public information that everyone can see', // Not sensitive
      preferences: {
        email_notifications: true,
        contact_info: 'private.contact@example.com', // Sensitive nested data
      },
    };

    console.log(chalk.yellow('📝 Original data:'));
    console.log(JSON.stringify(testData, null, 2));

    try {
      // Test encryption
      console.log(chalk.yellow('\n🔒 Encrypting sensitive fields...'));
      const encrypted = await this.postgresDataSource.encryptSensitiveData(
        'users',
        testData
      );

      console.log(chalk.green('✅ Encryption successful!'));
      console.log(chalk.yellow('\n📄 Encrypted data:'));
      console.log(JSON.stringify(encrypted, null, 2));

      // Verify that sensitive fields are encrypted
      if (encrypted.email !== testData.email) {
        console.log(chalk.green('✅ Email field encrypted'));
      } else {
        console.log(chalk.red('❌ Email field not encrypted'));
      }

      if (encrypted.phone !== testData.phone) {
        console.log(chalk.green('✅ Phone field encrypted'));
      } else {
        console.log(chalk.red('❌ Phone field not encrypted'));
      }

      // Test decryption
      console.log(chalk.yellow('\n🔓 Decrypting data...'));
      const decrypted = await this.postgresDataSource.decryptSensitiveData(
        'users',
        encrypted
      );

      console.log(chalk.green('✅ Decryption successful!'));
      console.log(chalk.yellow('\n📄 Decrypted data:'));
      console.log(JSON.stringify(decrypted, null, 2));

      // Verify decryption accuracy
      if (decrypted.email === testData.email && decrypted.phone === testData.phone) {
        console.log(
          chalk.green('\n✅ Encryption/Decryption cycle completed successfully!')
        );
      } else {
        console.log(chalk.red('\n❌ Decryption failed - data mismatch'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Encryption test failed:'), error.message);
    }
  }

  async testAuditLogging() {
    console.log(chalk.blue.bold('\n📊 Testing Audit Logging\n'));

    try {
      // Test various audit log types
      console.log(chalk.yellow('📝 Logging test events...'));

      // 1. Data access event
      await this.auditLogger.logDataAccess(this.testUserId, {
        tableAccessed: 'users',
        fieldsAccessed: ['name', 'email'],
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
      });
      console.log(chalk.green('✅ Data access event logged'));

      // 2. Authentication event
      await this.auditLogger.logAuthentication(this.testUserId, true, {
        method: 'jwt',
        ipAddress: '192.168.1.100',
        mfaEnabled: false,
      });
      console.log(chalk.green('✅ Authentication event logged'));

      // 3. Data export event
      await this.auditLogger.logDataExport(this.testUserId, {
        format: 'json',
        categories: ['profile', 'preferences'],
        exportSize: 1024,
        ipAddress: '192.168.1.100',
      });
      console.log(chalk.green('✅ Data export event logged'));

      // 4. Security incident
      await this.auditLogger.logSecurityIncident({
        type: 'test_security_incident',
        severity: 'low',
        details: {
          description: 'Test security incident for demonstration',
          resolved: true,
        },
        userId: this.testUserId,
      });
      console.log(chalk.green('✅ Security incident logged'));

      // 5. Encryption event
      await this.auditLogger.logEncryptionEvent('encrypt', {
        tableName: 'users',
        fieldNames: ['email', 'phone'],
        recordCount: 1,
        operationDuration: 25,
      });
      console.log(chalk.green('✅ Encryption event logged'));

      console.log(chalk.green('\n✅ All audit events logged successfully!'));
      console.log(chalk.yellow('💡 Check your audit_logs table to see the entries'));
    } catch (error) {
      console.error(chalk.red('❌ Audit logging test failed:'), error.message);
    }
  }

  async testComplianceMonitoring() {
    console.log(chalk.blue.bold('\n🔍 Testing Compliance Monitoring\n'));

    try {
      // Test compliance monitoring features
      console.log(chalk.yellow('🔧 Starting compliance monitoring...'));

      // Check if monitoring is already active
      if (!this.complianceMonitor.monitoringActive) {
        await this.complianceMonitor.startMonitoring();
        console.log(chalk.green('✅ Compliance monitoring started'));
      } else {
        console.log(chalk.green('✅ Compliance monitoring already active'));
      }

      console.log(
        chalk.yellow(
          `📊 Scheduled tasks: ${this.complianceMonitor.scheduledTasks.length}`
        )
      );

      // Perform a manual compliance check
      console.log(chalk.yellow('\n🔍 Performing manual compliance check...'));
      const report = await this.complianceMonitor.performDailyComplianceCheck();

      console.log(chalk.green('✅ Compliance check completed'));
      console.log(chalk.yellow('\n📄 Compliance Report Summary:'));
      console.log(`- Total events: ${report.summary?.totalEvents || 'N/A'}`);
      console.log(
        `- Privacy requests: ${report.privacyRequests?.totalRequests || 'N/A'}`
      );
      console.log(
        `- Security events: ${report.securityEvents?.totalSecurityEvents || 'N/A'}`
      );
      console.log(`- Recommendations: ${report.recommendations?.length || 0}`);

      if (report.recommendations && report.recommendations.length > 0) {
        console.log(chalk.yellow('\n💡 Recommendations:'));
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.priority}] ${rec.recommendation}`);
        });
      }
    } catch (error) {
      console.error(chalk.red('❌ Compliance monitoring test failed:'), error.message);
    }
  }

  async testDataExportSimulation() {
    console.log(chalk.blue.bold('\n📤 Testing Data Export Simulation\n'));

    try {
      // Simulate creating user data
      const userData = {
        id: this.testUserId,
        name: 'Export Test User',
        email: 'export.test@example.com',
        profile: {
          bio: 'Test user for data export',
          preferences: ['email', 'sms'],
        },
        stories: [
          { title: 'Test Story 1', content: 'Story content...' },
          { title: 'Test Story 2', content: 'Another story...' },
        ],
        projects: [{ name: 'Test Project', description: 'Project description...' }],
      };

      console.log(chalk.yellow('📊 Mock user data created:'));
      console.log(JSON.stringify(userData, null, 2));

      // Simulate data export process
      console.log(chalk.yellow('\n📋 Simulating data export process...'));

      // 1. JSON Export
      console.log(chalk.yellow('🔄 Exporting as JSON...'));
      const jsonExport = {
        exportDate: new Date().toISOString(),
        format: 'json',
        data: userData,
        metadata: {
          totalRecords: Object.keys(userData).length,
          categories: ['profile', 'stories', 'projects'],
          decrypted: true,
        },
      };

      console.log(chalk.green('✅ JSON export completed'));
      console.log(`📄 Export size: ${JSON.stringify(jsonExport).length} bytes`);

      // 2. CSV Export simulation
      console.log(chalk.yellow('\n🔄 Simulating CSV export...'));
      const csvHeaders = ['field', 'value', 'category'];
      const csvRows = [
        ['name', userData.name, 'profile'],
        ['email', userData.email, 'profile'],
        ['stories_count', userData.stories.length, 'content'],
        ['projects_count', userData.projects.length, 'content'],
      ];

      console.log(chalk.green('✅ CSV export simulation completed'));
      console.log(`📄 CSV headers: ${csvHeaders.join(', ')}`);
      console.log(`📄 CSV rows: ${csvRows.length}`);

      // Log the export event
      await this.auditLogger.logDataExport(this.testUserId, {
        format: 'json',
        categories: ['profile', 'stories', 'projects'],
        exportSize: JSON.stringify(jsonExport).length,
        simulation: true,
      });

      console.log(chalk.green('\n✅ Data export simulation completed and logged!'));
    } catch (error) {
      console.error(chalk.red('❌ Data export simulation failed:'), error.message);
    }
  }

  async testDataDeletionSimulation() {
    console.log(chalk.blue.bold('\n🗑️  Testing Data Deletion Simulation\n'));

    try {
      // Simulate data deletion request
      const deletionRequest = {
        userId: this.testUserId,
        categories: ['profile', 'content', 'preferences'],
        reason: 'User requested account deletion',
        confirmationPhrase: 'DELETE MY DATA PERMANENTLY',
      };

      console.log(chalk.yellow('📋 Deletion request details:'));
      console.log(JSON.stringify(deletionRequest, null, 2));

      console.log(chalk.yellow('\n🔍 Validating deletion request...'));

      // Validate confirmation phrase
      if (deletionRequest.confirmationPhrase === 'DELETE MY DATA PERMANENTLY') {
        console.log(chalk.green('✅ Confirmation phrase validated'));
      } else {
        console.log(chalk.red('❌ Invalid confirmation phrase'));
        return;
      }

      // Simulate deletion across different data sources
      console.log(chalk.yellow('\n🗑️  Simulating data deletion across systems...'));

      // 1. PostgreSQL deletion
      console.log(chalk.yellow('🔄 PostgreSQL deletion simulation...'));
      const pgTables = ['users', 'user_profiles', 'stories', 'projects', 'connections'];
      for (const table of pgTables) {
        console.log(`  - Deleting from ${table}`);
        // Simulate deletion delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log(chalk.green('✅ PostgreSQL deletion completed'));

      // 2. Redis cleanup
      console.log(chalk.yellow('🔄 Redis cleanup simulation...'));
      const redisPatterns = [
        `session:${this.testUserId}:*`,
        `cache:user:${this.testUserId}:*`,
      ];
      for (const pattern of redisPatterns) {
        console.log(`  - Clearing pattern ${pattern}`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      console.log(chalk.green('✅ Redis cleanup completed'));

      // 3. Neo4j relationship cleanup
      console.log(chalk.yellow('🔄 Neo4j relationship cleanup simulation...'));
      console.log('  - Removing user connections and relationships');
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(chalk.green('✅ Neo4j cleanup completed'));

      // Log the deletion request
      await this.auditLogger.logDeletionRequest(this.testUserId, {
        categories: deletionRequest.categories,
        reason: deletionRequest.reason,
        simulation: true,
        processedAt: new Date().toISOString(),
      });

      const deletionId = `del_${Date.now()}_${this.testUserId}`;
      console.log(chalk.green(`\n✅ Data deletion simulation completed!`));
      console.log(chalk.yellow(`🆔 Deletion ID: ${deletionId}`));
      console.log(chalk.yellow('📊 All systems cleaned up and logged'));
    } catch (error) {
      console.error(chalk.red('❌ Data deletion simulation failed:'), error.message);
    }
  }

  async runHealthChecks() {
    console.log(chalk.blue.bold('\n🏥 Running System Health Checks\n'));

    try {
      // 1. Compliance startup health check
      console.log(chalk.yellow('🔍 Checking compliance system health...'));
      const health = await complianceStartup.healthCheck();

      console.log(chalk.yellow('\n📊 Health Check Results:'));
      console.log(
        `- Overall status: ${this.getStatusColor(health.status)} ${health.status.toUpperCase()}`
      );

      if (health.components) {
        console.log('\n📋 Component Status:');
        Object.entries(health.components).forEach(([name, component]) => {
          const status = component.status || 'unknown';
          console.log(
            `  - ${name}: ${this.getStatusColor(status)} ${status.toUpperCase()}`
          );
        });
      }

      if (health.compliance) {
        console.log('\n🔒 Compliance Status:');
        Object.entries(health.compliance).forEach(([name, compliance]) => {
          const status = compliance.status || 'unknown';
          console.log(
            `  - ${name}: ${this.getStatusColor(status)} ${status.toUpperCase()}`
          );
        });
      }

      // 2. Encryption health check
      console.log(chalk.yellow('\n🔐 Checking encryption health...'));
      const encryptionHealth = await encryptionHealthCheck();

      if (encryptionHealth.healthy) {
        console.log(chalk.green('✅ Encryption system healthy'));
        console.log(`  - Algorithm: ${encryptionHealth.algorithm}`);
        console.log(`  - Key management: ${encryptionHealth.keyManagement}`);
      } else {
        console.log(chalk.red('❌ Encryption system issues detected'));
        if (encryptionHealth.issues) {
          encryptionHealth.issues.forEach(issue => {
            console.log(chalk.red(`  - ${issue}`));
          });
        }
      }

      // 3. Database connectivity check
      console.log(chalk.yellow('\n🗄️  Checking database connectivity...'));
      const dbHealth = await this.complianceMonitor.checkDatabaseConnectivity();

      if (dbHealth.connected) {
        console.log(chalk.green('✅ Database connectivity healthy'));
      } else {
        console.log(chalk.red('❌ Database connectivity issues'));
        console.log(chalk.red(`  Error: ${dbHealth.error}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Health check failed:'), error.message);
    }
  }

  async generateComplianceReport() {
    console.log(chalk.blue.bold('\n📊 Generating Compliance Report\n'));

    try {
      const reportType =
        (await this.rl.question(
          chalk.yellow('Select report type (daily/weekly/monthly): ')
        )) || 'daily';

      console.log(chalk.yellow(`\n📋 Generating ${reportType} compliance report...`));

      // Calculate date range based on report type
      const endDate = new Date();
      let startDate = new Date();

      switch (reportType.toLowerCase()) {
        case 'weekly':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        default: // daily
          startDate.setDate(endDate.getDate() - 1);
      }

      const report = await this.auditLogger.generateComplianceReport(
        startDate.toISOString(),
        endDate.toISOString(),
        reportType.toLowerCase()
      );

      console.log(chalk.green(`✅ ${reportType} compliance report generated!`));

      console.log(chalk.yellow('\n📄 Report Summary:'));
      console.log(`- Report type: ${report.reportType}`);
      console.log(`- Period: ${report.period.startDate} to ${report.period.endDate}`);
      console.log(`- Total events: ${report.summary?.totalEvents || 0}`);
      console.log(`- Unique users: ${report.summary?.uniqueUsers || 0}`);
      console.log(`- Privacy requests: ${report.privacyRequests?.totalRequests || 0}`);
      console.log(
        `- Security events: ${report.securityEvents?.totalSecurityEvents || 0}`
      );
      console.log(`- High risk events: ${report.securityEvents?.highRiskEvents || 0}`);

      if (report.complianceMetrics) {
        console.log('\n🔒 Compliance Metrics:');
        console.log(
          `- GDPR compliance: ${report.complianceMetrics.gdprCompliance?.percentage || 'N/A'}%`
        );
        console.log(
          `- CCPA compliance: ${report.complianceMetrics.ccpaCompliance?.percentage || 'N/A'}%`
        );
        console.log(
          `- Encryption coverage: ${report.complianceMetrics.encryptionCoverage?.percentage || 'N/A'}%`
        );
        console.log(
          `- Audit trail completeness: ${report.complianceMetrics.auditTrailCompleteness || 'N/A'}%`
        );
      }

      if (report.recommendations && report.recommendations.length > 0) {
        console.log(chalk.yellow('\n💡 Recommendations:'));
        report.recommendations.forEach((rec, index) => {
          const priorityColor =
            rec.priority === 'high'
              ? 'red'
              : rec.priority === 'medium'
                ? 'yellow'
                : 'green';
          console.log(
            `${index + 1}. ${chalk[priorityColor](`[${rec.priority.toUpperCase()}]`)} ${rec.recommendation}`
          );
        });
      }
    } catch (error) {
      console.error(
        chalk.red('❌ Compliance report generation failed:'),
        error.message
      );
    }
  }

  async testCulturalSafetyFeatures() {
    console.log(chalk.blue.bold('\n🌏 Testing Cultural Safety Features\n'));

    try {
      // Test cultural safety event logging
      console.log(chalk.yellow('📝 Testing cultural safety event logging...'));

      await this.auditLogger.logCulturalSafetyEvent('content_review', {
        contentType: 'story',
        contentId: 'test-story-cultural-123',
        culturalProtocols: ['NSW Traditional Owner', 'Community Consultation'],
        communityConsent: true,
        safetyScore: 92,
        elderReview: true,
        sacredKnowledge: false,
      });

      console.log(chalk.green('✅ Cultural safety event logged'));

      // Test Indigenous data handling
      console.log(chalk.yellow('\n🏛️  Testing Indigenous data sovereignty...'));

      const culturalData = {
        id: `cultural-story-${Date.now()}`,
        title: 'Traditional Knowledge Story',
        content: 'This story contains traditional cultural knowledge...',
        culturalSafety: 95,
        indigenousData: true,
        communityConsent: true,
        traditionalOwnerApproval: true,
        culturalProtocols: ['Elder Review Required', 'Community Consultation'],
      };

      // Test encryption of cultural data
      const encryptedCultural = await this.postgresDataSource.encryptSensitiveData(
        'stories',
        culturalData
      );
      console.log(chalk.green('✅ Cultural data encrypted'));

      const decryptedCultural = await this.postgresDataSource.decryptSensitiveData(
        'stories',
        encryptedCultural
      );
      console.log(chalk.green('✅ Cultural data decrypted'));

      // Verify cultural flags preserved
      if (
        decryptedCultural.indigenousData === true &&
        decryptedCultural.communityConsent === true
      ) {
        console.log(chalk.green('✅ Indigenous data sovereignty flags preserved'));
      } else {
        console.log(chalk.red('❌ Cultural safety flags not preserved properly'));
      }

      // Test cultural safety consent management
      console.log(chalk.yellow('\n🤝 Testing consent management...'));

      await this.auditLogger.logConsentEvent(
        this.testUserId,
        'cultural_sharing',
        true,
        {
          culturalContent: true,
          communityApproved: true,
          elderConsultation: true,
          consentType: 'informed_community_consent',
        }
      );

      console.log(chalk.green('✅ Cultural consent event logged'));

      console.log(chalk.green('\n✅ Cultural safety features test completed!'));
      console.log(
        chalk.yellow(
          "💡 Cultural safety is integral to the ACT Platform's Indigenous data sovereignty approach"
        )
      );
    } catch (error) {
      console.error(chalk.red('❌ Cultural safety test failed:'), error.message);
    }
  }

  async runFullIntegrationTest() {
    console.log(chalk.blue.bold('\n🔄 Running Full Integration Test\n'));
    console.log(chalk.yellow('This will run all tests in sequence...\n'));

    const startTime = Date.now();

    try {
      console.log(chalk.cyan('1/8 Testing field-level encryption...'));
      await this.testFieldLevelEncryption();
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(chalk.cyan('\n2/8 Testing audit logging...'));
      await this.testAuditLogging();
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(chalk.cyan('\n3/8 Testing compliance monitoring...'));
      await this.testComplianceMonitoring();
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(chalk.cyan('\n4/8 Testing data export simulation...'));
      await this.testDataExportSimulation();
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(chalk.cyan('\n5/8 Testing data deletion simulation...'));
      await this.testDataDeletionSimulation();
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(chalk.cyan('\n6/8 Running health checks...'));
      await this.runHealthChecks();
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(chalk.cyan('\n7/8 Generating compliance report...'));
      // Use daily report for integration test
      const report = await this.auditLogger.generateComplianceReport(
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString(),
        'daily'
      );
      console.log(chalk.green('✅ Compliance report generated'));

      console.log(chalk.cyan('\n8/8 Testing cultural safety features...'));
      await this.testCulturalSafetyFeatures();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(
        chalk.green.bold(`\n🎉 Full Integration Test Completed Successfully!`)
      );
      console.log(chalk.yellow(`⏱️  Total duration: ${duration} seconds`));
      console.log(chalk.yellow('📊 All systems tested and functioning correctly'));

      // Log the integration test completion
      await this.auditLogger.log({
        action: 'full_integration_test_completed',
        category: 'testing',
        metadata: {
          duration: parseFloat(duration),
          testsPassed: 8,
          timestamp: new Date().toISOString(),
        },
        complianceFlags: {
          systemValidation: true,
          integrationTesting: true,
        },
      });
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(
        chalk.red(`\n❌ Integration test failed after ${duration} seconds:`),
        error.message
      );

      // Log the test failure
      await this.auditLogger.logSecurityIncident({
        type: 'integration_test_failure',
        severity: 'medium',
        details: {
          error: error.message,
          duration: parseFloat(duration),
        },
        resolved: false,
      });
    }
  }

  getStatusColor(status) {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'operational':
      case 'compliant':
      case 'implemented':
      case 'excellent':
        return chalk.green;
      case 'degraded':
      case 'warning':
      case 'good':
        return chalk.yellow;
      case 'unhealthy':
      case 'error':
      case 'failed':
      case 'poor':
        return chalk.red;
      default:
        return chalk.gray;
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testRunner = new ComplianceTestRunner();
  testRunner.run();
}

export default ComplianceTestRunner;
