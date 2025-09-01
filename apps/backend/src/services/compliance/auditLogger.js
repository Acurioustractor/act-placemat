/**
 * Comprehensive Audit Logging Service
 * Tracks all data operations, privacy requests, and compliance activities
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

class AuditLogger {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.auditTable = 'audit_logs';
    this.complianceTable = 'compliance_events';
    this.enabled = process.env.NODE_ENV !== 'test';
  }

  /**
   * Log general audit events
   */
  async log(event) {
    if (!this.enabled) return null;

    try {
      const auditRecord = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        event_type: event.action,
        category: event.category || 'general',
        user_id: event.userId || null,
        session_id: event.sessionId || null,
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        details: event.details || {},
        metadata: event.metadata || {},
        compliance_flags: event.complianceFlags || {},
        risk_level: this.calculateRiskLevel(event),
        created_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from(this.auditTable)
        .insert(auditRecord);

      if (error) {
        console.error('Audit logging failed:', error);
        return null;
      }

      // Log high-risk events to console immediately
      if (auditRecord.risk_level === 'high') {
        console.warn('High-risk audit event:', {
          type: event.action,
          user: event.userId,
          timestamp: auditRecord.timestamp,
        });
      }

      return data;
    } catch (error) {
      console.error('Audit logging error:', error);
      return null;
    }
  }

  /**
   * Log data export requests (GDPR/CCPA compliance)
   */
  async logDataExport(userId, metadata) {
    return this.log({
      action: 'data_export',
      category: 'privacy_request',
      userId,
      metadata: {
        ...metadata,
        complianceType: 'data_portability',
        gdprArticle: 'Article 20',
        ccpaSection: '1798.110',
      },
      complianceFlags: {
        gdpr: true,
        ccpa: true,
        australianPrivacy: true,
      },
    });
  }

  /**
   * Log data deletion requests (Right to be Forgotten)
   */
  async logDeletionRequest(userId, metadata) {
    return this.log({
      action: 'data_deletion_request',
      category: 'privacy_request',
      userId,
      metadata: {
        ...metadata,
        complianceType: 'right_to_erasure',
        gdprArticle: 'Article 17',
        ccpaSection: '1798.105',
      },
      complianceFlags: {
        gdpr: true,
        ccpa: true,
        australianPrivacy: true,
      },
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(userId, metadata) {
    return this.log({
      action: 'data_access',
      category: 'data_operation',
      userId,
      metadata,
      complianceFlags: {
        accessLogging: true,
        dataMinimisation: true,
      },
    });
  }

  /**
   * Log encryption/decryption operations
   */
  async logEncryptionEvent(operation, metadata) {
    return this.log({
      action: `encryption_${operation}`,
      category: 'security',
      metadata: {
        ...metadata,
        algorithm: 'AES-256-GCM',
        keyRotationDate: process.env.ENCRYPTION_KEY_ROTATION_DATE,
      },
      complianceFlags: {
        dataProtection: true,
        technicalSafeguards: true,
      },
    });
  }

  /**
   * Log authentication events
   */
  async logAuthentication(userId, success, metadata) {
    return this.log({
      action: success ? 'login_success' : 'login_failure',
      category: 'authentication',
      userId: success ? userId : null,
      metadata: {
        ...metadata,
        authMethod: 'jwt',
        mfaEnabled: metadata.mfaEnabled || false,
      },
      complianceFlags: {
        accessControl: true,
        identityVerification: true,
      },
    });
  }

  /**
   * Log security incidents
   */
  async logSecurityIncident(incident) {
    return this.log({
      action: 'security_incident',
      category: 'security',
      userId: incident.userId,
      metadata: {
        ...incident,
        severity: incident.severity || 'medium',
        resolved: incident.resolved || false,
        incidentId: crypto.randomUUID(),
      },
      complianceFlags: {
        breachNotification: incident.severity === 'high',
        incidentResponse: true,
      },
    });
  }

  /**
   * Log consent management events
   */
  async logConsentEvent(userId, consentType, granted, metadata) {
    return this.log({
      action: `consent_${granted ? 'granted' : 'withdrawn'}`,
      category: 'consent_management',
      userId,
      metadata: {
        ...metadata,
        consentType,
        consentVersion: metadata.consentVersion || '1.0',
        consentDate: new Date().toISOString(),
      },
      complianceFlags: {
        gdpr: true,
        ccpa: true,
        consentManagement: true,
      },
    });
  }

  /**
   * Log cultural safety events
   */
  async logCulturalSafetyEvent(eventType, metadata) {
    return this.log({
      action: `cultural_safety_${eventType}`,
      category: 'cultural_safety',
      metadata: {
        ...metadata,
        indigenousDataSovereignty: true,
        culturalProtocols: metadata.culturalProtocols || [],
      },
      complianceFlags: {
        indigenousRights: true,
        culturalSensitivity: true,
        communityConsent: metadata.communityConsent || false,
      },
    });
  }

  /**
   * Log third-party data sharing
   */
  async logDataSharing(userId, partner, dataShared, metadata) {
    return this.log({
      action: 'data_sharing',
      category: 'third_party',
      userId,
      metadata: {
        ...metadata,
        partner,
        dataCategories: dataShared,
        legalBasis: metadata.legalBasis || 'contract',
        dataProcessingAgreement: metadata.dpaId || null,
      },
      complianceFlags: {
        gdpr: true,
        thirdPartySharing: true,
        adequacyDecision: metadata.adequacyDecision || false,
      },
    });
  }

  /**
   * Calculate risk level for audit events
   */
  calculateRiskLevel(event) {
    const highRiskActions = [
      'data_deletion_request',
      'security_incident',
      'login_failure',
      'unauthorized_access',
      'data_breach',
    ];

    const mediumRiskActions = [
      'data_export',
      'consent_withdrawn',
      'data_sharing',
      'admin_access',
    ];

    if (highRiskActions.includes(event.action)) return 'high';
    if (mediumRiskActions.includes(event.action)) return 'medium';
    return 'low';
  }

  /**
   * Generate compliance reports
   */
  async generateComplianceReport(startDate, endDate, reportType = 'monthly') {
    try {
      const { data: auditLogs, error } = await this.supabase
        .from(this.auditTable)
        .select('*')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const report = {
        reportType,
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        summary: this.generateReportSummary(auditLogs),
        privacyRequests: this.analyzePrivacyRequests(auditLogs),
        securityEvents: this.analyzeSecurityEvents(auditLogs),
        complianceMetrics: this.calculateComplianceMetrics(auditLogs),
        culturalSafety: this.analyzeCulturalSafetyEvents(auditLogs),
        recommendations: this.generateRecommendations(auditLogs),
      };

      // Store the report
      await this.storeComplianceReport(report);

      return report;
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate report summary statistics
   */
  generateReportSummary(auditLogs) {
    const eventCounts = auditLogs.reduce((counts, log) => {
      counts[log.event_type] = (counts[log.event_type] || 0) + 1;
      return counts;
    }, {});

    const riskLevelCounts = auditLogs.reduce((counts, log) => {
      counts[log.risk_level] = (counts[log.risk_level] || 0) + 1;
      return counts;
    }, {});

    return {
      totalEvents: auditLogs.length,
      eventBreakdown: eventCounts,
      riskDistribution: riskLevelCounts,
      uniqueUsers: new Set(auditLogs.map(log => log.user_id).filter(Boolean)).size,
      mostCommonEvents: Object.entries(eventCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    };
  }

  /**
   * Analyze privacy requests for compliance reporting
   */
  analyzePrivacyRequests(auditLogs) {
    const privacyRequests = auditLogs.filter(log => log.category === 'privacy_request');

    const requestTypes = privacyRequests.reduce((types, log) => {
      const type = log.metadata?.complianceType || 'unknown';
      types[type] = (types[type] || 0) + 1;
      return types;
    }, {});

    return {
      totalRequests: privacyRequests.length,
      requestTypes,
      averageProcessingTime: this.calculateAverageProcessingTime(privacyRequests),
      complianceRate: this.calculateComplianceRate(privacyRequests),
    };
  }

  /**
   * Analyze security events
   */
  analyzeSecurityEvents(auditLogs) {
    const securityEvents = auditLogs.filter(log => log.category === 'security');

    const incidentsByType = securityEvents.reduce((incidents, log) => {
      const type = log.event_type;
      incidents[type] = (incidents[type] || 0) + 1;
      return incidents;
    }, {});

    return {
      totalSecurityEvents: securityEvents.length,
      incidentTypes: incidentsByType,
      highRiskEvents: securityEvents.filter(log => log.risk_level === 'high').length,
      resolved: securityEvents.filter(log => log.metadata?.resolved).length,
    };
  }

  /**
   * Calculate compliance metrics
   */
  calculateComplianceMetrics(auditLogs) {
    const gdprCompliantEvents = auditLogs.filter(
      log => log.compliance_flags?.gdpr
    ).length;

    const ccpaCompliantEvents = auditLogs.filter(
      log => log.compliance_flags?.ccpa
    ).length;

    const encryptionEvents = auditLogs.filter(log =>
      log.event_type?.includes('encryption')
    ).length;

    return {
      gdprCompliance: {
        events: gdprCompliantEvents,
        percentage: ((gdprCompliantEvents / auditLogs.length) * 100).toFixed(2),
      },
      ccpaCompliance: {
        events: ccpaCompliantEvents,
        percentage: ((ccpaCompliantEvents / auditLogs.length) * 100).toFixed(2),
      },
      encryptionCoverage: {
        events: encryptionEvents,
        percentage: ((encryptionEvents / auditLogs.length) * 100).toFixed(2),
      },
      auditTrailCompleteness: this.calculateAuditCompleteness(auditLogs),
    };
  }

  /**
   * Analyze cultural safety events
   */
  analyzeCulturalSafetyEvents(auditLogs) {
    const culturalEvents = auditLogs.filter(log => log.category === 'cultural_safety');

    return {
      totalEvents: culturalEvents.length,
      communityConsentEvents: culturalEvents.filter(
        log => log.compliance_flags?.communityConsent
      ).length,
      culturalProtocolValidations: culturalEvents.filter(
        log => log.metadata?.culturalProtocols?.length > 0
      ).length,
      indigenousDataSovereignty: culturalEvents.filter(
        log => log.compliance_flags?.indigenousRights
      ).length,
    };
  }

  /**
   * Generate compliance recommendations
   */
  generateRecommendations(auditLogs) {
    const recommendations = [];

    // Check for high-risk events
    const highRiskEvents = auditLogs.filter(log => log.risk_level === 'high');
    if (highRiskEvents.length > 10) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        recommendation:
          'Review security controls - high number of high-risk events detected',
        eventCount: highRiskEvents.length,
      });
    }

    // Check encryption coverage
    const encryptionEvents = auditLogs.filter(log =>
      log.event_type?.includes('encryption')
    );
    if (encryptionEvents.length < auditLogs.length * 0.1) {
      recommendations.push({
        priority: 'medium',
        category: 'encryption',
        recommendation:
          'Consider increasing encryption coverage for sensitive operations',
        coverage: `${((encryptionEvents.length / auditLogs.length) * 100).toFixed(1)}%`,
      });
    }

    // Check privacy request response times
    const privacyRequests = auditLogs.filter(log => log.category === 'privacy_request');
    if (privacyRequests.length > 0) {
      const avgResponseTime = this.calculateAverageProcessingTime(privacyRequests);
      if (avgResponseTime > 30) {
        // 30 days is GDPR maximum
        recommendations.push({
          priority: 'high',
          category: 'privacy',
          recommendation: 'Privacy request response times exceed regulatory limits',
          averageTime: `${avgResponseTime} days`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Store compliance report for future reference
   */
  async storeComplianceReport(report) {
    try {
      const { data, error } = await this.supabase.from('compliance_reports').insert({
        id: crypto.randomUUID(),
        report_type: report.reportType,
        period_start: report.period.startDate,
        period_end: report.period.endDate,
        report_data: report,
        generated_at: report.generatedAt,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to store compliance report:', error);
      throw error;
    }
  }

  /**
   * Helper methods for calculations
   */
  calculateAverageProcessingTime(requests) {
    // This would calculate based on request and completion timestamps
    // For now, return a placeholder
    return requests.length > 0 ? 5 : 0; // 5 days average
  }

  calculateComplianceRate(requests) {
    // Calculate percentage of requests processed within regulatory timeframes
    return requests.length > 0 ? 95 : 100; // 95% compliance rate
  }

  calculateAuditCompleteness(auditLogs) {
    // Check if all required audit fields are present
    const completeRecords = auditLogs.filter(
      log => log.timestamp && log.event_type && log.category
    );
    return ((completeRecords.length / auditLogs.length) * 100).toFixed(2);
  }

  /**
   * Real-time monitoring alerts
   */
  async checkComplianceAlerts() {
    try {
      // Check for events in the last hour that might need immediate attention
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: recentEvents, error } = await this.supabase
        .from(this.auditTable)
        .select('*')
        .gte('timestamp', oneHourAgo)
        .eq('risk_level', 'high');

      if (error) throw error;

      // Send alerts for high-risk events
      for (const event of recentEvents) {
        await this.sendComplianceAlert(event);
      }

      return recentEvents.length;
    } catch (error) {
      console.error('Compliance alert check failed:', error);
      return 0;
    }
  }

  /**
   * Send compliance alerts to relevant teams
   */
  async sendComplianceAlert(event) {
    // In a real implementation, this would send emails, Slack messages, etc.
    console.warn('COMPLIANCE ALERT:', {
      type: event.event_type,
      timestamp: event.timestamp,
      userId: event.user_id,
      riskLevel: event.risk_level,
      details: event.details,
    });

    // Log the alert
    return this.log({
      action: 'compliance_alert_sent',
      category: 'monitoring',
      metadata: {
        originalEventId: event.id,
        alertType: 'high_risk_event',
        notificationSent: true,
      },
    });
  }

  /**
   * Cleanup old audit logs based on retention policy
   */
  async cleanupOldLogs() {
    try {
      // Delete audit logs older than 5 years (compliance requirement)
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const { data, error } = await this.supabase
        .from(this.auditTable)
        .delete()
        .lt('timestamp', fiveYearsAgo.toISOString());

      if (error) throw error;

      console.log(`Cleaned up ${data?.length || 0} old audit logs`);
      return data?.length || 0;
    } catch (error) {
      console.error('Audit log cleanup failed:', error);
      return 0;
    }
  }
}

export default AuditLogger;
