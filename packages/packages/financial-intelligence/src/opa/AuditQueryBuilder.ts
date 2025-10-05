/**
 * Audit Query Builder
 * 
 * Fluent interface for building complex audit queries with
 * Australian compliance filtering and reporting capabilities
 */

import { 
  AuditQuery, 
  FinancialOperation, 
  AuditQueryResult 
} from './types';

/**
 * Fluent query builder for audit log queries
 */
export class AuditQueryBuilder {
  private query: Partial<AuditQuery> = {};

  /**
   * Set time range for the query
   */
  timeRange(start: Date, end: Date): AuditQueryBuilder {
    this.query.timeRange = { start, end };
    return this;
  }

  /**
   * Filter by user ID
   */
  forUser(userId: string): AuditQueryBuilder {
    this.query.filters = this.query.filters || {};
    this.query.filters.userId = userId;
    return this;
  }

  /**
   * Filter by financial operation
   */
  forOperation(operation: FinancialOperation): AuditQueryBuilder {
    this.query.filters = this.query.filters || {};
    this.query.filters.operation = operation;
    return this;
  }

  /**
   * Filter by decision outcome
   */
  withDecision(decision: 'allow' | 'deny' | 'conditional'): AuditQueryBuilder {
    this.query.filters = this.query.filters || {};
    this.query.filters.decision = decision;
    return this;
  }

  /**
   * Filter by policies evaluated
   */
  withPolicies(policies: string[]): AuditQueryBuilder {
    this.query.filters = this.query.filters || {};
    this.query.filters.policies = policies;
    return this;
  }

  /**
   * Filter by compliance flags
   */
  withComplianceFlags(flags: string[]): AuditQueryBuilder {
    this.query.filters = this.query.filters || {};
    this.query.filters.complianceFlags = flags;
    return this;
  }

  /**
   * Filter by data classification
   */
  withDataClassification(classifications: string[]): AuditQueryBuilder {
    this.query.filters = this.query.filters || {};
    this.query.filters.dataClassification = classifications;
    return this;
  }

  /**
   * Set pagination
   */
  paginate(offset: number, limit: number): AuditQueryBuilder {
    this.query.pagination = { offset, limit };
    return this;
  }

  /**
   * Set sorting
   */
  sortBy(field: string, direction: 'asc' | 'desc' = 'desc'): AuditQueryBuilder {
    this.query.sort = { field, direction };
    return this;
  }

  /**
   * Convenience method for recent activity
   */
  recentActivity(hours: number = 24): AuditQueryBuilder {
    const end = new Date();
    const start = new Date(end.getTime() - (hours * 60 * 60 * 1000));
    return this.timeRange(start, end);
  }

  /**
   * Convenience method for Privacy Act compliance queries
   */
  privacyActDecisions(): AuditQueryBuilder {
    return this.withComplianceFlags(['privacy_act']);
  }

  /**
   * Convenience method for Indigenous data queries
   */
  indigenousDataDecisions(): AuditQueryBuilder {
    return this.withComplianceFlags(['indigenous_data']);
  }

  /**
   * Convenience method for AUSTRAC reporting queries
   */
  austracReportingDecisions(): AuditQueryBuilder {
    return this.withComplianceFlags(['austrac_threshold']);
  }

  /**
   * Convenience method for cross-border data queries
   */
  crossBorderDecisions(): AuditQueryBuilder {
    return this.withComplianceFlags(['cross_border']);
  }

  /**
   * Convenience method for denied decisions only
   */
  deniedDecisions(): AuditQueryBuilder {
    return this.withDecision('deny');
  }

  /**
   * Convenience method for high-sensitivity data
   */
  highSensitivityData(): AuditQueryBuilder {
    return this.withDataClassification(['restricted', 'secret']);
  }

  /**
   * Convenience method for financial operations
   */
  financialOperations(): AuditQueryBuilder {
    return this.withPolicies(['financial.spending_limits', 'financial.budget_allocation', 'financial.austrac_reporting']);
  }

  /**
   * Build the final query
   */
  build(): AuditQuery {
    if (!this.query.timeRange) {
      throw new Error('Time range is required for audit queries');
    }

    return {
      timeRange: this.query.timeRange,
      filters: this.query.filters,
      pagination: this.query.pagination || { offset: 0, limit: 50 },
      sort: this.query.sort || { field: 'timestamp', direction: 'desc' }
    };
  }
}

/**
 * Pre-built audit query templates for common use cases
 */
export class AuditQueryTemplates {
  
  /**
   * Daily compliance report query
   */
  static dailyComplianceReport(date: Date): AuditQuery {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return new AuditQueryBuilder()
      .timeRange(start, end)
      .withComplianceFlags(['privacy_act', 'indigenous_data', 'austrac_threshold'])
      .sortBy('timestamp', 'asc')
      .paginate(0, 1000)
      .build();
  }

  /**
   * User activity summary query
   */
  static userActivitySummary(userId: string, days: number = 30): AuditQuery {
    const end = new Date();
    const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));

    return new AuditQueryBuilder()
      .timeRange(start, end)
      .forUser(userId)
      .sortBy('timestamp', 'desc')
      .paginate(0, 500)
      .build();
  }

  /**
   * Security incident investigation query
   */
  static securityIncidentInvestigation(startDate: Date, endDate: Date): AuditQuery {
    return new AuditQueryBuilder()
      .timeRange(startDate, endDate)
      .deniedDecisions()
      .highSensitivityData()
      .withComplianceFlags(['cross_border', 'sovereignty_violation'])
      .sortBy('timestamp', 'desc')
      .paginate(0, 200)
      .build();
  }

  /**
   * Financial audit trail query
   */
  static financialAuditTrail(amount: number, days: number = 7): AuditQuery {
    const end = new Date();
    const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));

    return new AuditQueryBuilder()
      .timeRange(start, end)
      .financialOperations()
      .withComplianceFlags(['austrac_threshold'])
      .sortBy('timestamp', 'desc')
      .paginate(0, 100)
      .build();
  }

  /**
   * Indigenous data access review query
   */
  static indigenousDataAccessReview(traditionalOwner?: string): AuditQuery {
    const end = new Date();
    const start = new Date(end.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days

    const builder = new AuditQueryBuilder()
      .timeRange(start, end)
      .indigenousDataDecisions()
      .sortBy('timestamp', 'desc')
      .paginate(0, 300);

    return builder.build();
  }

  /**
   * Privacy Act compliance audit query
   */
  static privacyActComplianceAudit(month: Date): AuditQuery {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    return new AuditQueryBuilder()
      .timeRange(start, end)
      .privacyActDecisions()
      .withDataClassification(['confidential', 'restricted', 'secret'])
      .sortBy('timestamp', 'asc')
      .paginate(0, 2000)
      .build();
  }

  /**
   * Cross-border data transfer audit
   */
  static crossBorderTransferAudit(days: number = 30): AuditQuery {
    const end = new Date();
    const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));

    return new AuditQueryBuilder()
      .timeRange(start, end)
      .crossBorderDecisions()
      .sortBy('timestamp', 'desc')
      .paginate(0, 500)
      .build();
  }

  /**
   * Policy effectiveness analysis query
   */
  static policyEffectivenessAnalysis(policyIds: string[], days: number = 30): AuditQuery {
    const end = new Date();
    const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));

    return new AuditQueryBuilder()
      .timeRange(start, end)
      .withPolicies(policyIds)
      .sortBy('timestamp', 'desc')
      .paginate(0, 1000)
      .build();
  }
}

/**
 * Audit report generator with Australian compliance focus
 */
export class AuditReportGenerator {
  
  /**
   * Generate compliance summary report
   */
  static generateComplianceSummary(results: AuditQueryResult): ComplianceSummaryReport {
    const summary: ComplianceSummaryReport = {
      reportType: 'compliance_summary',
      generatedAt: new Date(),
      totalDecisions: results.totalCount,
      timeRange: {
        start: results.logs[0]?.timestamp || new Date(),
        end: results.logs[results.logs.length - 1]?.timestamp || new Date()
      },
      privacyAct: {
        totalDecisions: 0,
        deniedDecisions: 0,
        crossBorderAttempts: 0,
        personalDataAccess: 0
      },
      indigenousData: {
        totalDecisions: 0,
        traditionalOwnersInvolved: new Set(),
        sacredKnowledgeAccess: 0,
        careComplianceViolations: 0
      },
      austrac: {
        totalDecisions: 0,
        largeTransactions: 0,
        totalAmount: 0,
        suspiciousActivity: 0
      },
      dataResidency: {
        australianDataAccess: 0,
        overseasDataAccess: 0,
        residencyViolations: 0
      },
      security: {
        deniedAccess: 0,
        highSensitivityAccess: 0,
        unauthorizedAttempts: 0
      }
    };

    // Process each log entry
    for (const log of results.logs) {
      // Privacy Act metrics
      if (log.compliance.privacyActApplicable) {
        summary.privacyAct.totalDecisions++;
        if (log.decision.decision === 'deny') {
          summary.privacyAct.deniedDecisions++;
        }
        if (log.intent.compliance.privacyAct.crossBorderTransfer) {
          summary.privacyAct.crossBorderAttempts++;
        }
        if (log.intent.financial.containsPersonalData) {
          summary.privacyAct.personalDataAccess++;
        }
      }

      // Indigenous data metrics
      if (log.compliance.indigenousDataInvolved) {
        summary.indigenousData.totalDecisions++;
        if (log.intent.financial.indigenousData?.traditionalOwners) {
          log.intent.financial.indigenousData.traditionalOwners.forEach(owner => 
            summary.indigenousData.traditionalOwnersInvolved.add(owner)
          );
        }
        if (log.intent.financial.indigenousData?.containsSacredKnowledge) {
          summary.indigenousData.sacredKnowledgeAccess++;
        }
      }

      // AUSTRAC metrics
      if (log.compliance.austracReporting) {
        summary.austrac.totalDecisions++;
        if (log.intent.financial.amount && log.intent.financial.amount >= 1000000) {
          summary.austrac.largeTransactions++;
          summary.austrac.totalAmount += log.intent.financial.amount;
        }
      }

      // Data residency metrics
      if (log.intent.user.location.country === 'Australia') {
        summary.dataResidency.australianDataAccess++;
      } else {
        summary.dataResidency.overseasDataAccess++;
        if (log.decision.decision === 'deny') {
          summary.dataResidency.residencyViolations++;
        }
      }

      // Security metrics
      if (log.decision.decision === 'deny') {
        summary.security.deniedAccess++;
      }
      if (log.intent.financial.sensitivity === 'restricted' || log.intent.financial.sensitivity === 'secret') {
        summary.security.highSensitivityAccess++;
      }
    }

    // Convert Set to count
    summary.indigenousData.traditionalOwnersCount = summary.indigenousData.traditionalOwnersInvolved.size;

    return summary;
  }

  /**
   * Generate user activity report
   */
  static generateUserActivityReport(results: AuditQueryResult): UserActivityReport {
    const report: UserActivityReport = {
      reportType: 'user_activity',
      generatedAt: new Date(),
      userId: results.logs[0]?.intent.user.id || 'unknown',
      totalActivities: results.totalCount,
      timeRange: {
        start: results.logs[0]?.timestamp || new Date(),
        end: results.logs[results.logs.length - 1]?.timestamp || new Date()
      },
      operationBreakdown: {},
      decisionBreakdown: { allow: 0, deny: 0, conditional: 0 },
      complianceActivities: {
        privacyActDecisions: 0,
        indigenousDataAccess: 0,
        austracReporting: 0,
        crossBorderAttempts: 0
      },
      riskIndicators: {
        deniedAccess: 0,
        highSensitivityAccess: 0,
        afterHoursActivity: 0,
        suspiciousPatterns: []
      }
    };

    // Process each log entry
    for (const log of results.logs) {
      // Operation breakdown
      const operation = log.intent.operation;
      report.operationBreakdown[operation] = (report.operationBreakdown[operation] || 0) + 1;

      // Decision breakdown
      report.decisionBreakdown[log.decision.decision]++;

      // Compliance activities
      if (log.compliance.privacyActApplicable) {
        report.complianceActivities.privacyActDecisions++;
      }
      if (log.compliance.indigenousDataInvolved) {
        report.complianceActivities.indigenousDataAccess++;
      }
      if (log.compliance.austracReporting) {
        report.complianceActivities.austracReporting++;
      }
      if (log.intent.compliance.privacyAct.crossBorderTransfer) {
        report.complianceActivities.crossBorderAttempts++;
      }

      // Risk indicators
      if (log.decision.decision === 'deny') {
        report.riskIndicators.deniedAccess++;
      }
      if (log.intent.financial.sensitivity === 'restricted' || log.intent.financial.sensitivity === 'secret') {
        report.riskIndicators.highSensitivityAccess++;
      }

      // Check for after-hours activity (outside 9 AM - 5 PM AEST)
      const hour = log.timestamp.getHours();
      if (hour < 9 || hour > 17) {
        report.riskIndicators.afterHoursActivity++;
      }
    }

    // Analyze for suspicious patterns
    if (report.riskIndicators.deniedAccess > report.totalActivities * 0.2) {
      report.riskIndicators.suspiciousPatterns.push('High denial rate (>20%)');
    }
    if (report.riskIndicators.afterHoursActivity > report.totalActivities * 0.3) {
      report.riskIndicators.suspiciousPatterns.push('Excessive after-hours activity (>30%)');
    }
    if (report.riskIndicators.highSensitivityAccess > 10) {
      report.riskIndicators.suspiciousPatterns.push('Frequent high-sensitivity data access');
    }

    return report;
  }

  /**
   * Generate policy effectiveness report
   */
  static generatePolicyEffectivenessReport(results: AuditQueryResult, policyIds: string[]): PolicyEffectivenessReport {
    const report: PolicyEffectivenessReport = {
      reportType: 'policy_effectiveness',
      generatedAt: new Date(),
      evaluatedPolicies: policyIds,
      totalEvaluations: results.totalCount,
      timeRange: {
        start: results.logs[0]?.timestamp || new Date(),
        end: results.logs[results.logs.length - 1]?.timestamp || new Date()
      },
      policyMetrics: {},
      overallEffectiveness: {
        allowRate: 0,
        denyRate: 0,
        conditionalRate: 0,
        averageEvaluationTime: 0
      },
      complianceEffectiveness: {
        privacyActCompliance: 0,
        indigenousProtocolCompliance: 0,
        dataResidencyCompliance: 0
      }
    };

    let totalEvaluationTime = 0;
    let complianceViolations = 0;

    // Initialize policy metrics
    for (const policyId of policyIds) {
      report.policyMetrics[policyId] = {
        evaluations: 0,
        allows: 0,
        denies: 0,
        conditionals: 0,
        averageExecutionTime: 0,
        complianceViolations: 0
      };
    }

    // Process each log entry
    for (const log of results.logs) {
      totalEvaluationTime += log.decision.performance.evaluationTime;

      // Update overall metrics
      report.overallEffectiveness[log.decision.decision === 'allow' ? 'allowRate' : 
                                   log.decision.decision === 'deny' ? 'denyRate' : 'conditionalRate']++;

      // Update policy-specific metrics
      for (const policyId of log.decision.evaluatedPolicies) {
        if (policyIds.includes(policyId) && report.policyMetrics[policyId]) {
          const metrics = report.policyMetrics[policyId];
          metrics.evaluations++;
          metrics[log.decision.decision === 'allow' ? 'allows' : 
                  log.decision.decision === 'deny' ? 'denies' : 'conditionals']++;
          metrics.averageExecutionTime = 
            (metrics.averageExecutionTime + log.decision.performance.evaluationTime) / metrics.evaluations;
        }
      }

      // Check for compliance violations
      if (log.decision.decision === 'deny' && 
          (log.compliance.privacyActApplicable || log.compliance.indigenousDataInvolved)) {
        complianceViolations++;
      }
    }

    // Calculate rates
    if (results.totalCount > 0) {
      report.overallEffectiveness.allowRate /= results.totalCount;
      report.overallEffectiveness.denyRate /= results.totalCount;
      report.overallEffectiveness.conditionalRate /= results.totalCount;
      report.overallEffectiveness.averageEvaluationTime = totalEvaluationTime / results.totalCount;
    }

    // Calculate compliance effectiveness
    const privacyActDecisions = results.logs.filter(log => log.compliance.privacyActApplicable).length;
    const privacyActViolations = results.logs.filter(log => 
      log.compliance.privacyActApplicable && log.decision.decision === 'deny'
    ).length;
    
    report.complianceEffectiveness.privacyActCompliance = 
      privacyActDecisions > 0 ? 1 - (privacyActViolations / privacyActDecisions) : 1;

    const indigenousDecisions = results.logs.filter(log => log.compliance.indigenousDataInvolved).length;
    const indigenousViolations = results.logs.filter(log => 
      log.compliance.indigenousDataInvolved && log.decision.decision === 'deny'
    ).length;
    
    report.complianceEffectiveness.indigenousProtocolCompliance = 
      indigenousDecisions > 0 ? 1 - (indigenousViolations / indigenousDecisions) : 1;

    return report;
  }
}

// Report interfaces

export interface ComplianceSummaryReport {
  reportType: 'compliance_summary';
  generatedAt: Date;
  totalDecisions: number;
  timeRange: { start: Date; end: Date };
  privacyAct: {
    totalDecisions: number;
    deniedDecisions: number;
    crossBorderAttempts: number;
    personalDataAccess: number;
  };
  indigenousData: {
    totalDecisions: number;
    traditionalOwnersInvolved: Set<string>;
    traditionalOwnersCount?: number;
    sacredKnowledgeAccess: number;
    careComplianceViolations: number;
  };
  austrac: {
    totalDecisions: number;
    largeTransactions: number;
    totalAmount: number;
    suspiciousActivity: number;
  };
  dataResidency: {
    australianDataAccess: number;
    overseasDataAccess: number;
    residencyViolations: number;
  };
  security: {
    deniedAccess: number;
    highSensitivityAccess: number;
    unauthorizedAttempts: number;
  };
}

export interface UserActivityReport {
  reportType: 'user_activity';
  generatedAt: Date;
  userId: string;
  totalActivities: number;
  timeRange: { start: Date; end: Date };
  operationBreakdown: Record<string, number>;
  decisionBreakdown: { allow: number; deny: number; conditional: number };
  complianceActivities: {
    privacyActDecisions: number;
    indigenousDataAccess: number;
    austracReporting: number;
    crossBorderAttempts: number;
  };
  riskIndicators: {
    deniedAccess: number;
    highSensitivityAccess: number;
    afterHoursActivity: number;
    suspiciousPatterns: string[];
  };
}

export interface PolicyEffectivenessReport {
  reportType: 'policy_effectiveness';
  generatedAt: Date;
  evaluatedPolicies: string[];
  totalEvaluations: number;
  timeRange: { start: Date; end: Date };
  policyMetrics: Record<string, {
    evaluations: number;
    allows: number;
    denies: number;
    conditionals: number;
    averageExecutionTime: number;
    complianceViolations: number;
  }>;
  overallEffectiveness: {
    allowRate: number;
    denyRate: number;
    conditionalRate: number;
    averageEvaluationTime: number;
  };
  complianceEffectiveness: {
    privacyActCompliance: number;
    indigenousProtocolCompliance: number;
    dataResidencyCompliance: number;
  };
}