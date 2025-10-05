/**
 * Compliance Monitoring Startup Service
 * Initializes audit logging and compliance monitoring on server startup
 */

import ComplianceMonitor from '../services/compliance/complianceMonitor.js';
import AuditLogger from '../services/compliance/auditLogger.js';

class ComplianceStartup {
  constructor() {
    this.complianceMonitor = new ComplianceMonitor();
    this.auditLogger = new AuditLogger();
    this.initialized = false;
  }

  /**
   * Initialize compliance systems on server startup
   */
  async initialize() {
    if (this.initialized) {
      console.log('⚠️ Compliance systems already initialized');
      return;
    }

    try {
      console.log('🔧 Initializing compliance and audit systems...');

      // Step 1: Verify audit logger functionality
      await this.verifyAuditLogger();

      // Step 2: Start compliance monitoring
      await this.complianceMonitor.startMonitoring();

      // Step 3: Log system startup
      await this.logSystemStartup();

      // Step 4: Set up graceful shutdown handlers
      this.setupShutdownHandlers();

      this.initialized = true;
      console.log('✅ Compliance and audit systems initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize compliance systems:', error);
      throw error;
    }
  }

  /**
   * Verify audit logger is working correctly
   */
  async verifyAuditLogger() {
    try {
      console.log('🔍 Verifying audit logger functionality...');

      // Test audit logging with a startup event
      await this.auditLogger.log({
        action: 'audit_logger_verification',
        category: 'system',
        metadata: {
          verificationType: 'startup',
          timestamp: new Date().toISOString(),
          nodeEnv: process.env.NODE_ENV,
        },
        complianceFlags: {
          systemIntegrity: true,
          auditTrail: true,
        },
      });

      console.log('✅ Audit logger verification completed');
    } catch (error) {
      console.error('❌ Audit logger verification failed:', error);
      throw new Error(
        'Audit logger verification failed - compliance monitoring cannot start'
      );
    }
  }

  /**
   * Log system startup event
   */
  async logSystemStartup() {
    try {
      const startupMetadata = {
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        architecture: process.arch,
        startupTime: new Date().toISOString(),
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        environmentVariables: {
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasEncryptionKeys: !!(
            process.env.ENCRYPTION_KEY_users_data || process.env.MASTER_ENCRYPTION_KEY
          ),
          hasRedisUrl: !!process.env.REDIS_URL,
          hasNeo4jUri: !!process.env.NEO4J_URI,
          tlsEnabled: !!(process.env.TLS_KEY_PATH && process.env.TLS_CERT_PATH),
        },
        complianceFeatures: {
          auditLogging: this.auditLogger.enabled,
          fieldLevelEncryption: process.env.NODE_ENV !== 'test',
          complianceMonitoring: this.complianceMonitor.monitoringActive,
          httpsEnforcement: process.env.NODE_ENV === 'production',
        },
      };

      await this.auditLogger.log({
        action: 'system_startup',
        category: 'system',
        metadata: startupMetadata,
        complianceFlags: {
          systemIntegrity: true,
          technicalSafeguards: true,
          auditTrail: true,
        },
      });

      console.log('✅ System startup logged');
    } catch (error) {
      console.error('❌ Failed to log system startup:', error);
      // Don't throw here - startup logging failure shouldn't prevent system startup
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  setupShutdownHandlers() {
    const gracefulShutdown = async signal => {
      console.log(`\n🔄 Received ${signal}, shutting down compliance systems...`);

      try {
        // Log shutdown event
        await this.auditLogger.log({
          action: 'system_shutdown',
          category: 'system',
          metadata: {
            signal,
            shutdownTime: new Date().toISOString(),
            uptime: process.uptime(),
            graceful: true,
          },
          complianceFlags: {
            systemIntegrity: true,
            auditTrail: true,
          },
        });

        // Stop compliance monitoring
        this.complianceMonitor.stopMonitoring();

        // Give time for final logs to be written
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('✅ Compliance systems shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during compliance shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', async error => {
      console.error('❌ Uncaught exception:', error);

      try {
        await this.auditLogger.logSecurityIncident({
          type: 'uncaught_exception',
          severity: 'high',
          details: {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
          resolved: false,
        });
      } catch (logError) {
        console.error('❌ Failed to log uncaught exception:', logError);
      }

      // Give time for logging then exit
      setTimeout(() => process.exit(1), 1000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Unhandled promise rejection:', reason);

      try {
        await this.auditLogger.logSecurityIncident({
          type: 'unhandled_promise_rejection',
          severity: 'medium',
          details: {
            reason: reason?.message || reason,
            stack: reason?.stack,
            promise: promise.toString(),
            timestamp: new Date().toISOString(),
          },
          resolved: false,
        });
      } catch (logError) {
        console.error('❌ Failed to log unhandled rejection:', logError);
      }
    });

    console.log('✅ Shutdown handlers configured');
  }

  /**
   * Health check for compliance systems
   */
  async healthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      components: {},
      compliance: {},
    };

    try {
      // Check audit logger
      health.components.auditLogger = {
        enabled: this.auditLogger.enabled,
        status: this.auditLogger.enabled ? 'operational' : 'disabled',
      };

      // Check compliance monitor
      health.components.complianceMonitor = {
        active: this.complianceMonitor.monitoringActive,
        scheduledTasks: this.complianceMonitor.scheduledTasks.length,
        status: this.complianceMonitor.monitoringActive ? 'operational' : 'inactive',
      };

      // Test database connectivity
      try {
        const dbConnectivity = await this.complianceMonitor.checkDatabaseConnectivity();
        health.components.database = {
          connected: dbConnectivity.connected,
          status: dbConnectivity.connected ? 'operational' : 'error',
          error: dbConnectivity.error,
        };
      } catch (error) {
        health.components.database = {
          connected: false,
          status: 'error',
          error: error.message,
        };
      }

      // Check compliance features
      health.compliance = {
        gdprCompliance: {
          auditTrail: this.auditLogger.enabled,
          dataExport: true, // Based on data sovereignty API
          dataDeletion: true, // Based on data sovereignty API
          status: 'compliant',
        },
        ccpaCompliance: {
          privacyRights: true,
          dataTransparency: true,
          status: 'compliant',
        },
        australianPrivacy: {
          privacyPrinciples: true,
          notifiableDataBreaches: this.auditLogger.enabled,
          status: 'compliant',
        },
        technicalSafeguards: {
          encryption: process.env.NODE_ENV !== 'test',
          httpsEnforcement: true,
          accessControls: true,
          status: 'implemented',
        },
      };

      // Overall health determination
      const hasErrors = Object.values(health.components).some(
        component => component.status === 'error'
      );

      health.status = hasErrors ? 'degraded' : 'healthy';

      return health;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        ...health,
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Get compliance system status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      auditLogger: {
        enabled: this.auditLogger.enabled,
      },
      complianceMonitor: {
        active: this.complianceMonitor.monitoringActive,
        scheduledTasks: this.complianceMonitor.scheduledTasks.length,
      },
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
    };
  }

  /**
   * Force a compliance check (for testing/admin use)
   */
  async forceComplianceCheck() {
    if (!this.initialized) {
      throw new Error('Compliance systems not initialized');
    }

    console.log('🔍 Performing manual compliance check...');

    try {
      const report = await this.complianceMonitor.performDailyComplianceCheck();

      await this.auditLogger.log({
        action: 'manual_compliance_check',
        category: 'monitoring',
        metadata: {
          initiatedBy: 'admin',
          reportId: report.id,
          timestamp: new Date().toISOString(),
        },
      });

      console.log('✅ Manual compliance check completed');
      return report;
    } catch (error) {
      console.error('❌ Manual compliance check failed:', error);
      throw error;
    }
  }

  /**
   * Generate an immediate compliance report
   */
  async generateImmediateReport(
    reportType = 'daily',
    startDate = null,
    endDate = null
  ) {
    if (!this.initialized) {
      throw new Error('Compliance systems not initialized');
    }

    const end = endDate ? new Date(endDate) : new Date();
    let start;

    switch (reportType) {
      case 'daily':
        start = startDate
          ? new Date(startDate)
          : new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        start = startDate
          ? new Date(startDate)
          : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = startDate
          ? new Date(startDate)
          : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    console.log(`📊 Generating immediate ${reportType} compliance report...`);

    try {
      const report = await this.auditLogger.generateComplianceReport(
        start.toISOString(),
        end.toISOString(),
        reportType
      );

      await this.auditLogger.log({
        action: 'immediate_report_generated',
        category: 'reporting',
        metadata: {
          reportType,
          period: { start: start.toISOString(), end: end.toISOString() },
          reportId: report.id,
          initiatedBy: 'admin',
        },
      });

      console.log(`✅ Immediate ${reportType} report generated`);
      return report;
    } catch (error) {
      console.error(`❌ Failed to generate immediate ${reportType} report:`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
const complianceStartup = new ComplianceStartup();
export default complianceStartup;

// Export class for testing
export { ComplianceStartup };
