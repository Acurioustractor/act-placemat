/**
 * Compliance Dashboard API
 * Provides admin endpoints for monitoring compliance and encryption status
 */

import express from 'express';
import AuditLogger from '../services/compliance/auditLogger.js';
import ComplianceMonitor from '../services/compliance/complianceMonitor.js';
import complianceStartup from '../startup/complianceStartup.js';
import { encryptionHealthCheck } from '../services/encryption/encryptionService.js';
import PostgreSQLDataSource from '../services/dataSources/postgresDataSource.js';

const router = express.Router();

// Initialize services
const auditLogger = new AuditLogger();
const complianceMonitor = new ComplianceMonitor();
const postgresDataSource = new PostgreSQLDataSource();

// Middleware for admin authentication (simplified for demo)
const requireAdmin = (req, res, next) => {
  // In production, implement proper admin authentication
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  const validAdminKey =
    process.env.ADMIN_API_KEY || 'demo-admin-key-change-in-production';

  if (!adminKey || adminKey !== validAdminKey) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'Please provide a valid admin API key',
    });
  }

  next();
};

/**
 * GET /api/compliance-dashboard/status
 * Overall system status and health check
 */
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      systemHealth: 'checking...',
      components: {},
      compliance: {},
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };

    // Get compliance startup status
    const startupStatus = complianceStartup.getStatus();
    status.components.complianceStartup = startupStatus;

    // Get health check
    try {
      const health = await complianceStartup.healthCheck();
      status.systemHealth = health.status;
      status.components = { ...status.components, ...health.components };
      status.compliance = health.compliance;
    } catch (error) {
      status.systemHealth = 'error';
      status.error = error.message;
    }

    // Get encryption health
    try {
      const encryptionHealth = await encryptionHealthCheck();
      status.components.encryption = {
        healthy: encryptionHealth.healthy,
        algorithm: encryptionHealth.algorithm,
        issues: encryptionHealth.issues || [],
      };
    } catch (error) {
      status.components.encryption = {
        healthy: false,
        error: error.message,
      };
    }

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Status check failed:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance-dashboard/audit-summary
 * Summary of recent audit events
 */
router.get('/audit-summary', requireAdmin, async (req, res) => {
  try {
    const { hours = 24, limit = 100 } = req.query;

    const hoursAgo = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);

    // Generate a summary report for the specified time period
    const report = await auditLogger.generateComplianceReport(
      hoursAgo.toISOString(),
      new Date().toISOString(),
      'custom'
    );

    const summary = {
      period: {
        hours: parseInt(hours),
        from: hoursAgo.toISOString(),
        to: new Date().toISOString(),
      },
      metrics: {
        totalEvents: report.summary?.totalEvents || 0,
        uniqueUsers: report.summary?.uniqueUsers || 0,
        highRiskEvents: report.securityEvents?.highRiskEvents || 0,
        privacyRequests: report.privacyRequests?.totalRequests || 0,
        encryptionEvents: report.complianceMetrics?.encryptionCoverage?.events || 0,
      },
      eventBreakdown: report.summary?.eventBreakdown || {},
      riskDistribution: report.summary?.riskDistribution || {},
      recommendations: report.recommendations || [],
    };

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Audit summary failed:', error);
    res.status(500).json({
      error: 'Failed to generate audit summary',
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance-dashboard/privacy-requests
 * Current privacy requests status
 */
router.get('/privacy-requests', requireAdmin, async (req, res) => {
  try {
    const { status: requestStatus, limit = 50 } = req.query;

    // Mock privacy requests data (in production, query from database)
    const mockRequests = [
      {
        id: 'pr_001',
        type: 'export',
        userId: 'user_123',
        status: 'completed',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        legalBasis: 'gdpr_article_15',
      },
      {
        id: 'pr_002',
        type: 'deletion',
        userId: 'user_456',
        status: 'processing',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        legalBasis: 'gdpr_article_17',
      },
      {
        id: 'pr_003',
        type: 'rectification',
        userId: 'user_789',
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        legalBasis: 'gdpr_article_16',
      },
    ];

    const filteredRequests = requestStatus
      ? mockRequests.filter(req => req.status === requestStatus)
      : mockRequests;

    const statusCounts = mockRequests.reduce((counts, req) => {
      counts[req.status] = (counts[req.status] || 0) + 1;
      return counts;
    }, {});

    res.json({
      success: true,
      requests: filteredRequests.slice(0, parseInt(limit)),
      summary: {
        total: mockRequests.length,
        statusBreakdown: statusCounts,
        averageProcessingTime: '2.5 days', // Mock calculation
      },
    });
  } catch (error) {
    console.error('Privacy requests query failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve privacy requests',
      message: error.message,
    });
  }
});

/**
 * POST /api/compliance-dashboard/generate-report
 * Generate compliance report on demand
 */
router.post('/generate-report', requireAdmin, async (req, res) => {
  try {
    const {
      reportType = 'daily',
      startDate = null,
      endDate = null,
      includeRecommendations = true,
    } = req.body;

    console.log(`Generating ${reportType} compliance report...`);

    const report = await complianceStartup.generateImmediateReport(
      reportType,
      startDate,
      endDate
    );

    // Create summary for the response
    const reportSummary = {
      id: report.id || `report_${Date.now()}`,
      type: report.reportType || reportType,
      period: report.period,
      generatedAt: report.generatedAt || new Date().toISOString(),
      summary: {
        totalEvents: report.summary?.totalEvents || 0,
        privacyRequests: report.privacyRequests?.totalRequests || 0,
        securityEvents: report.securityEvents?.totalSecurityEvents || 0,
        complianceScore: complianceMonitor.calculateComplianceScore(report),
      },
      metrics: report.complianceMetrics,
      recommendations: includeRecommendations ? report.recommendations : [],
    };

    res.json({
      success: true,
      message: `${reportType} compliance report generated successfully`,
      report: reportSummary,
    });
  } catch (error) {
    console.error('Report generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate compliance report',
      message: error.message,
    });
  }
});

/**
 * POST /api/compliance-dashboard/force-compliance-check
 * Force immediate compliance check
 */
router.post('/force-compliance-check', requireAdmin, async (req, res) => {
  try {
    console.log('Performing manual compliance check...');

    const report = await complianceStartup.forceComplianceCheck();

    const violations = complianceMonitor.checkComplianceViolations(report);
    const complianceScore = complianceMonitor.calculateComplianceScore(report);

    res.json({
      success: true,
      message: 'Manual compliance check completed',
      results: {
        complianceScore,
        violations: violations.length,
        violationDetails: violations,
        totalEvents: report.summary?.totalEvents || 0,
        recommendations: report.recommendations || [],
      },
    });
  } catch (error) {
    console.error('Manual compliance check failed:', error);
    res.status(500).json({
      error: 'Manual compliance check failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance-dashboard/encryption-stats
 * Encryption usage statistics
 */
router.get('/encryption-stats', requireAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Mock encryption statistics (in production, query from encryption_events table)
    const stats = {
      period: `${days} days`,
      totalOperations: 1247,
      encryptionOperations: 623,
      decryptionOperations: 624,
      successRate: 99.8,
      averageOperationTime: 25, // milliseconds
      keyRotations: 0,
      algorithmsUsed: {
        'aes-256-gcm': 1247,
      },
      tableBreakdown: {
        users: 412,
        stories: 298,
        projects: 187,
        organisations: 156,
        user_profiles: 194,
      },
      performanceMetrics: {
        fastestOperation: 12, // ms
        slowestOperation: 89, // ms
        averageDataSize: 2048, // bytes
      },
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Encryption stats query failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve encryption statistics',
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance-dashboard/cultural-safety
 * Cultural safety compliance metrics
 */
router.get('/cultural-safety', requireAdmin, async (req, res) => {
  try {
    // Mock cultural safety metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      overallScore: 94.2,
      metrics: {
        communityConsentRate: 96.8,
        elderReviewsCompleted: 23,
        culturalProtocolValidations: 187,
        indigenousDataSovereigntyCompliance: 98.1,
        sacredKnowledgeProtections: 100.0,
      },
      recentActivity: [
        {
          type: 'community_consent',
          contentId: 'story_456',
          safetyScore: 92,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          type: 'elder_review',
          contentId: 'story_789',
          approved: true,
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
      ],
      protocols: {
        active: [
          'NSW Traditional Owner',
          'Community Consultation',
          'Sacred Knowledge Protection',
        ],
        compliance: {
          'NSW Traditional Owner': 97.2,
          'Community Consultation': 94.8,
          'Sacred Knowledge Protection': 100.0,
        },
      },
    };

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Cultural safety metrics query failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve cultural safety metrics',
      message: error.message,
    });
  }
});

/**
 * POST /api/compliance-dashboard/test-encryption
 * Test encryption/decryption functionality
 */
router.post('/test-encryption', requireAdmin, async (req, res) => {
  try {
    const { testData = { email: 'test@example.com', phone: '+61 400 123 456' } } =
      req.body;

    console.log('Testing encryption functionality...');

    // Test encryption
    const encrypted = await postgresDataSource.encryptSensitiveData('users', testData);
    console.log('✅ Encryption successful');

    // Test decryption
    const decrypted = await postgresDataSource.decryptSensitiveData('users', encrypted);
    console.log('✅ Decryption successful');

    // Verify data integrity
    const dataIntact = JSON.stringify(testData) === JSON.stringify(decrypted);

    const testResults = {
      success: dataIntact,
      testData,
      encrypted: {
        fieldsEncrypted: Object.keys(testData).filter(
          key => encrypted[key] !== testData[key]
        ),
        fieldsUnchanged: Object.keys(testData).filter(
          key => encrypted[key] === testData[key]
        ),
      },
      decrypted,
      dataIntegrity: dataIntact,
      timestamp: new Date().toISOString(),
    };

    // Log the test
    await auditLogger.log({
      action: 'encryption_functionality_test',
      category: 'admin_testing',
      metadata: {
        testResults: testResults.success,
        adminInitiated: true,
      },
    });

    res.json({
      success: true,
      message: 'Encryption test completed',
      results: testResults,
    });
  } catch (error) {
    console.error('Encryption test failed:', error);
    res.status(500).json({
      error: 'Encryption test failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/compliance-dashboard/dashboard
 * Complete dashboard data in one request
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    console.log('Loading compliance dashboard data...');

    // Collect all dashboard data
    const [
      systemStatus,
      auditSummary,
      privacyRequests,
      encryptionStats,
      culturalSafety,
    ] = await Promise.allSettled([
      complianceStartup.healthCheck(),
      auditLogger.generateComplianceReport(
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString(),
        'dashboard'
      ),
      // Mock privacy requests data
      Promise.resolve({
        total: 12,
        pending: 3,
        processing: 2,
        completed: 7,
      }),
      // Mock encryption stats
      Promise.resolve({
        totalOperations: 1247,
        successRate: 99.8,
        averageTime: 25,
      }),
      // Mock cultural safety metrics
      Promise.resolve({
        overallScore: 94.2,
        communityConsentRate: 96.8,
        protocolCompliance: 97.5,
      }),
    ]);

    const dashboard = {
      timestamp: new Date().toISOString(),
      systemStatus:
        systemStatus.status === 'fulfilled' ? systemStatus.value : { status: 'error' },
      auditSummary:
        auditSummary.status === 'fulfilled'
          ? {
              totalEvents: auditSummary.value.summary?.totalEvents || 0,
              highRiskEvents: auditSummary.value.securityEvents?.highRiskEvents || 0,
              privacyRequests: auditSummary.value.privacyRequests?.totalRequests || 0,
              complianceScore: complianceMonitor.calculateComplianceScore(
                auditSummary.value
              ),
            }
          : { error: auditSummary.reason?.message },
      privacyRequests:
        privacyRequests.status === 'fulfilled'
          ? privacyRequests.value
          : { error: privacyRequests.reason?.message },
      encryptionStats:
        encryptionStats.status === 'fulfilled'
          ? encryptionStats.value
          : { error: encryptionStats.reason?.message },
      culturalSafety:
        culturalSafety.status === 'fulfilled'
          ? culturalSafety.value
          : { error: culturalSafety.reason?.message },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };

    res.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error('Dashboard data loading failed:', error);
    res.status(500).json({
      error: 'Failed to load dashboard data',
      message: error.message,
    });
  }
});

export default router;
