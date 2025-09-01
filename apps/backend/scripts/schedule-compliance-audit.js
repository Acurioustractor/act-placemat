#!/usr/bin/env node

/**
 * ACT Platform - Scheduled Compliance Audit Runner
 * Orchestrates regular privacy and compliance auditing
 */

import { PrivacyComplianceAuditor } from './privacy-compliance-audit.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ComplianceScheduler {
  constructor() {
    this.auditor = new PrivacyComplianceAuditor();
    this.auditHistoryPath = path.join(__dirname, '../data/audit-history');
    this.alertThreshold = {
      critical: 70, // Below 70% = critical alert
      warning: 85, // Below 85% = warning alert
    };
  }

  async initialize() {
    // Ensure audit history directory exists
    try {
      await fs.mkdir(this.auditHistoryPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create audit history directory:', error);
    }
  }

  async runScheduledAudit(auditType = 'full') {
    const timestamp = new Date().toISOString();
    const auditId = `audit-${Date.now()}`;

    console.log(`\n🔍 Starting ${auditType} compliance audit - ${timestamp}`);
    console.log(`Audit ID: ${auditId}\n`);

    let auditResult;

    try {
      switch (auditType) {
        case 'daily':
          auditResult = await this.runDailyAudit();
          break;
        case 'weekly':
          auditResult = await this.runWeeklyAudit();
          break;
        case 'monthly':
          auditResult = await this.runMonthlyAudit();
          break;
        case 'full':
        default:
          auditResult = await this.auditor.runFullAudit();
          break;
      }

      // Store audit result
      await this.storeAuditResult(auditId, auditResult, auditType);

      // Check for alerts
      await this.checkAndSendAlerts(auditResult, auditType);

      // Generate summary
      this.printAuditSummary(auditResult, auditType);

      return auditResult;
    } catch (error) {
      console.error('❌ Audit failed:', error);
      await this.handleAuditFailure(auditId, error, auditType);
      throw error;
    }
  }

  async runDailyAudit() {
    console.log('📅 Running daily compliance checks...');

    const criticalChecks = [
      'auditEncryptionCompliance',
      'auditAccessControls',
      'auditSecurityIncidents',
    ];

    const results = {};
    for (const check of criticalChecks) {
      try {
        results[check] = await this.auditor[check]();
      } catch (error) {
        results[check] = {
          score: 0,
          status: 'FAILED',
          error: error.message,
          criticalIssues: [`Audit check ${check} failed: ${error.message}`],
        };
      }
    }

    return this.calculateOverallResult(results, 'daily');
  }

  async runWeeklyAudit() {
    console.log('📅 Running weekly compliance assessment...');

    const weeklyChecks = [
      'auditEncryptionCompliance',
      'auditDataProtection',
      'auditUserRights',
      'auditAccessControls',
      'auditDataRetention',
    ];

    const results = {};
    for (const check of weeklyChecks) {
      try {
        results[check] = await this.auditor[check]();
      } catch (error) {
        results[check] = {
          score: 0,
          status: 'FAILED',
          error: error.message,
          criticalIssues: [`Audit check ${check} failed: ${error.message}`],
        };
      }
    }

    return this.calculateOverallResult(results, 'weekly');
  }

  async runMonthlyAudit() {
    console.log('📅 Running comprehensive monthly audit...');
    return await this.auditor.runFullAudit();
  }

  calculateOverallResult(results, auditType) {
    const scores = Object.values(results).map(r => r.score || 0);
    const overallScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;

    const allCriticalIssues = Object.values(results).flatMap(
      r => r.criticalIssues || []
    );

    const allRecommendations = Object.values(results).flatMap(
      r => r.recommendations || []
    );

    return {
      auditType,
      timestamp: new Date().toISOString(),
      overallScore: Math.round(overallScore * 100) / 100,
      status:
        overallScore >= 0.85
          ? 'COMPLIANT'
          : overallScore >= 0.7
            ? 'WARNING'
            : 'CRITICAL',
      categories: results,
      criticalIssues: allCriticalIssues,
      recommendations: allRecommendations,
      summary: {
        totalChecks: Object.keys(results).length,
        passedChecks: Object.values(results).filter(r => (r.score || 0) >= 0.85).length,
        criticalIssueCount: allCriticalIssues.length,
      },
    };
  }

  async storeAuditResult(auditId, result, auditType) {
    const fileName = `${auditId}-${auditType}.json`;
    const filePath = path.join(this.auditHistoryPath, fileName);

    try {
      const auditRecord = {
        id: auditId,
        type: auditType,
        timestamp: new Date().toISOString(),
        result,
      };

      await fs.writeFile(filePath, JSON.stringify(auditRecord, null, 2));
      console.log(`💾 Audit result stored: ${fileName}`);

      // Also update latest results
      await this.updateLatestResults(auditType, auditRecord);
    } catch (error) {
      console.error('Failed to store audit result:', error);
    }
  }

  async updateLatestResults(auditType, auditRecord) {
    const latestPath = path.join(this.auditHistoryPath, `latest-${auditType}.json`);

    try {
      await fs.writeFile(latestPath, JSON.stringify(auditRecord, null, 2));
    } catch (error) {
      console.error('Failed to update latest results:', error);
    }
  }

  async checkAndSendAlerts(auditResult, auditType) {
    const score = auditResult.overallScore;
    const criticalIssues = auditResult.criticalIssues || [];

    if (score < this.alertThreshold.critical || criticalIssues.length > 0) {
      await this.sendCriticalAlert(auditResult, auditType);
    } else if (score < this.alertThreshold.warning) {
      await this.sendWarningAlert(auditResult, auditType);
    }
  }

  async sendCriticalAlert(auditResult, auditType) {
    const alert = {
      level: 'CRITICAL',
      type: 'COMPLIANCE_AUDIT',
      timestamp: new Date().toISOString(),
      auditType,
      score: auditResult.overallScore,
      criticalIssues: auditResult.criticalIssues,
      message: `Critical compliance issues detected in ${auditType} audit`,
    };

    console.log('\n🚨 CRITICAL COMPLIANCE ALERT 🚨');
    console.log(`Score: ${auditResult.overallScore}%`);
    console.log(`Critical Issues: ${auditResult.criticalIssues.length}`);

    // Store alert
    await this.storeAlert(alert);

    // In production, would send to monitoring system, email, Slack, etc.
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alert);
    }
  }

  async sendWarningAlert(auditResult, auditType) {
    const alert = {
      level: 'WARNING',
      type: 'COMPLIANCE_AUDIT',
      timestamp: new Date().toISOString(),
      auditType,
      score: auditResult.overallScore,
      message: `Compliance score below warning threshold in ${auditType} audit`,
    };

    console.log('\n⚠️  COMPLIANCE WARNING');
    console.log(`Score: ${auditResult.overallScore}%`);

    await this.storeAlert(alert);
  }

  async storeAlert(alert) {
    const alertsPath = path.join(this.auditHistoryPath, 'alerts');
    await fs.mkdir(alertsPath, { recursive: true });

    const fileName = `alert-${Date.now()}.json`;
    const filePath = path.join(alertsPath, fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(alert, null, 2));
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
  }

  async sendSlackAlert(alert) {
    try {
      const webhook = process.env.SLACK_WEBHOOK_URL;
      if (!webhook) return;

      const message = {
        text: `🚨 ACT Platform Compliance Alert`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${alert.level} Compliance Alert`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Audit Type:* ${alert.auditType}`,
              },
              {
                type: 'mrkdwn',
                text: `*Score:* ${alert.score}%`,
              },
              {
                type: 'mrkdwn',
                text: `*Issues:* ${alert.criticalIssues?.length || 0}`,
              },
              {
                type: 'mrkdwn',
                text: `*Time:* ${new Date(alert.timestamp).toLocaleString()}`,
              },
            ],
          },
        ],
      };

      // In production, would use actual HTTP client
      console.log('📱 Would send Slack alert:', JSON.stringify(message, null, 2));
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  async handleAuditFailure(auditId, error, auditType) {
    const failureRecord = {
      id: auditId,
      type: auditType,
      timestamp: new Date().toISOString(),
      status: 'FAILED',
      error: error.message,
      stack: error.stack,
    };

    const failurePath = path.join(this.auditHistoryPath, `failure-${auditId}.json`);

    try {
      await fs.writeFile(failurePath, JSON.stringify(failureRecord, null, 2));

      // Send critical alert for audit system failure
      await this.sendCriticalAlert(
        {
          overallScore: 0,
          criticalIssues: [`Audit system failure: ${error.message}`],
        },
        auditType
      );
    } catch (storeError) {
      console.error('Failed to store audit failure record:', storeError);
    }
  }

  printAuditSummary(result, auditType) {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 ${auditType.toUpperCase()} COMPLIANCE AUDIT SUMMARY`);
    console.log('='.repeat(80));
    console.log(`Overall Score: ${result.overallScore}% (${result.status})`);
    console.log(`Total Checks: ${result.summary?.totalChecks || 0}`);
    console.log(`Passed Checks: ${result.summary?.passedChecks || 0}`);
    console.log(`Critical Issues: ${result.criticalIssues?.length || 0}`);

    if (result.criticalIssues?.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      result.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    if (result.recommendations?.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      result.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('='.repeat(80) + '\n');
  }

  async getAuditHistory(auditType = null, days = 30) {
    try {
      const files = await fs.readdir(this.auditHistoryPath);
      const auditFiles = files.filter(f => {
        return (
          f.startsWith('audit-') &&
          f.endsWith('.json') &&
          (!auditType || f.includes(`-${auditType}.json`))
        );
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const history = [];
      for (const file of auditFiles) {
        try {
          const filePath = path.join(this.auditHistoryPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const audit = JSON.parse(content);

          if (new Date(audit.timestamp) >= cutoffDate) {
            history.push(audit);
          }
        } catch (error) {
          console.warn(`Failed to read audit file ${file}:`, error.message);
        }
      }

      return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Failed to get audit history:', error);
      return [];
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const auditType = args[0] || 'full';
  const validTypes = ['daily', 'weekly', 'monthly', 'full'];

  if (!validTypes.includes(auditType)) {
    console.error(`Invalid audit type. Must be one of: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  const scheduler = new ComplianceScheduler();

  try {
    await scheduler.initialize();
    const result = await scheduler.runScheduledAudit(auditType);

    // Exit with appropriate code
    if (result.status === 'CRITICAL') {
      process.exit(2);
    } else if (result.status === 'WARNING') {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Audit runner failed:', error);
    process.exit(3);
  }
}

// Export for programmatic use
export { ComplianceScheduler };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
