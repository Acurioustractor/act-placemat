/**
 * Security Testing Module Index
 * 
 * Comprehensive security testing framework with automated vulnerability scanning,
 * penetration testing, and scheduling capabilities for ACT Placemat
 */

// === MAIN TESTING COMPONENTS ===
export { SecurityTester } from './SecurityTester';
export { PenetrationTestRunner, PenetrationTestScenarios } from './PenetrationTestRunner';
export { VulnerabilityScheduler } from './VulnerabilityScheduler';

// === TESTING INTERFACES ===
export type {
  SecurityTestingConfig,
  VulnerabilityReport,
  SecurityScanResult,
  PenetrationTestResult
} from './SecurityTester';

export type {
  PenTestScenario,
  PenTestStep
} from './PenetrationTestRunner';

export type {
  SchedulerConfig,
  ScheduledScanExecution,
  ScanSchedule
} from './VulnerabilityScheduler';

// === TESTING FACTORY ===

import { SecurityTester, SecurityTestingConfig } from './SecurityTester';
import { PenetrationTestRunner } from './PenetrationTestRunner';
import { VulnerabilityScheduler, SchedulerConfig } from './VulnerabilityScheduler';
import { AuditLogger } from '../audit/AuditLogger';

/**
 * Security Testing Factory
 * Creates and configures the complete security testing infrastructure
 */
export class SecurityTestingFactory {
  
  /**
   * Create a complete security testing suite
   */
  static createSecurityTestingSuite(config: {
    testingConfig: SecurityTestingConfig;
    schedulerConfig: SchedulerConfig;
    auditLogger: AuditLogger;
  }): {
    securityTester: SecurityTester;
    penetrationTestRunner: PenetrationTestRunner;
    vulnerabilityScheduler: VulnerabilityScheduler;
  } {
    // Create security tester
    const securityTester = new SecurityTester(config.testingConfig, config.auditLogger);
    
    // Create penetration test runner
    const penetrationTestRunner = new PenetrationTestRunner(securityTester);
    
    // Create vulnerability scheduler
    const vulnerabilityScheduler = new VulnerabilityScheduler(
      config.schedulerConfig,
      securityTester,
      penetrationTestRunner
    );
    
    return {
      securityTester,
      penetrationTestRunner,
      vulnerabilityScheduler
    };
  }
  
  /**
   * Create default testing configuration for Australian compliance
   */
  static createDefaultAustralianConfig(): {
    testingConfig: SecurityTestingConfig;
    schedulerConfig: SchedulerConfig;
  } {
    const testingConfig: SecurityTestingConfig = {
      enableAutomatedScanning: true,
      scanInterval: 24 * 60 * 60 * 1000, // Daily
      maxConcurrentScans: 2,
      scanTimeout: 30 * 60 * 1000, // 30 minutes
      
      targets: {
        webApplications: ['http://localhost:3000', 'http://localhost:4000'],
        apiEndpoints: ['http://localhost:3000/api', 'http://localhost:4000/api'],
        databases: ['postgresql://localhost:5432'],
        fileSystem: ['/var/www', '/opt/app'],
        networkServices: ['localhost:22', 'localhost:80', 'localhost:443']
      },
      
      enabledTests: {
        sqlInjection: true,
        xssVulnerabilities: true,
        authenticationFlaws: true,
        authorizationBypass: true,
        dataExposure: true,
        cryptographicFlaws: true,
        networkVulnerabilities: true,
        configurationErrors: true,
        dependencyVulnerabilities: true,
        complianceChecks: true
      },
      
      complianceFrameworks: ['ISM', 'Privacy-Act', 'ACSC-Essential-8'],
      indigenousDataSovereigntyChecks: true,
      australianDataResidencyValidation: true,
      
      generateDetailedReports: true,
      reportFormats: ['json', 'html'],
      includeRemediationGuidance: true,
      prioritizeByRisk: true,
      
      enableRealTimeAlerts: true,
      alertThresholds: {
        critical: 1,
        high: 3,
        medium: 10
      },
      
      enableParallelScanning: true,
      rateLimit: 100,
      respectRobotsTxt: true,
      userAgent: 'ACT-Security-Scanner/1.0'
    };
    
    const schedulerConfig: SchedulerConfig = {
      schedules: [
        {
          id: 'daily-vulnerability-scan',
          name: 'Daily Vulnerability Scan',
          description: 'Comprehensive daily vulnerability assessment',
          enabled: true,
          cronExpression: '0 2 * * *', // 2 AM daily
          scanType: 'vulnerability',
          targets: ['http://localhost:3000', 'http://localhost:4000'],
          priority: 'high',
          maxDuration: 60 * 60 * 1000, // 1 hour
          retryAttempts: 2,
          notifyOnCompletion: true,
          notifyOnFailure: true
        },
        {
          id: 'weekly-penetration-test',
          name: 'Weekly Penetration Test',
          description: 'Weekly automated penetration testing',
          enabled: true,
          cronExpression: '0 3 * * 0', // 3 AM on Sundays
          scanType: 'penetration',
          targets: ['http://localhost:3000'],
          priority: 'medium',
          maxDuration: 2 * 60 * 60 * 1000, // 2 hours
          retryAttempts: 1,
          notifyOnCompletion: true,
          notifyOnFailure: true
        },
        {
          id: 'monthly-compliance-check',
          name: 'Monthly Compliance Assessment',
          description: 'Monthly ISM and Privacy Act compliance validation',
          enabled: true,
          cronExpression: '0 4 1 * *', // 4 AM on first day of month
          scanType: 'compliance',
          targets: ['all'],
          priority: 'high',
          maxDuration: 90 * 60 * 1000, // 90 minutes
          retryAttempts: 2,
          notifyOnCompletion: true,
          notifyOnFailure: true
        }
      ],
      
      maxConcurrentScans: 2,
      scanQueueSize: 10,
      resourceThresholds: {
        maxCpuUsage: 80,
        maxMemoryUsage: 80,
        maxDiskUsage: 90
      },
      
      externalScanners: {
        nessus: {
          enabled: false,
          scanTemplates: []
        },
        openvas: {
          enabled: false,
          scanConfigs: []
        },
        burpSuite: {
          enabled: false,
          scanConfigurations: []
        },
        nuclei: {
          enabled: true,
          templatesPath: './nuclei-templates',
          customTemplates: [],
          severity: ['medium', 'high', 'critical']
        }
      },
      
      complianceScanning: {
        enableISMChecks: true,
        enablePrivacyActChecks: true,
        enableEssential8Checks: true,
        enableIndigenousDataSovereigntyChecks: true,
        customComplianceChecks: []
      },
      
      reporting: {
        generateDetailedReports: true,
        reportFormats: ['json', 'html'],
        reportRetentionDays: 90,
        enableTrendAnalysis: true,
        enableRiskScoring: true
      },
      
      alerting: {
        enableRealTimeAlerts: true,
        alertChannels: ['email'],
        severityThresholds: {
          critical: 1,
          high: 3,
          medium: 10
        },
        escalationRules: []
      }
    };
    
    return {
      testingConfig,
      schedulerConfig
    };
  }
}

// === TESTING UTILITIES ===

/**
 * Security testing utilities
 */
export class SecurityTestingUtils {
  
  /**
   * Validate CVSS score
   */
  static validateCVSSScore(score: number): boolean {
    return score >= 0.0 && score <= 10.0;
  }
  
  /**
   * Convert CVSS score to severity
   */
  static cvssToSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }
  
  /**
   * Calculate risk score from vulnerabilities
   */
  static calculateRiskScore(vulnerabilities: VulnerabilityReport[]): number {
    const weights = { critical: 10, high: 7, medium: 4, low: 1 };
    
    const riskPoints = vulnerabilities.reduce((total, vuln) => {
      return total + (weights[vuln.severity] || 1);
    }, 0);
    
    return Math.min(100, riskPoints);
  }
  
  /**
   * Filter vulnerabilities by compliance framework
   */
  static filterByComplianceFramework(
    vulnerabilities: VulnerabilityReport[], 
    framework: string
  ): VulnerabilityReport[] {
    return vulnerabilities.filter(vuln => 
      vuln.compliance.frameworks.includes(framework)
    );
  }
  
  /**
   * Generate executive summary
   */
  static generateExecutiveSummary(scanResult: SecurityScanResult): string {
    const summary = scanResult.summary;
    const critical = summary.vulnerabilitiesBySeverity.critical || 0;
    const high = summary.vulnerabilitiesBySeverity.high || 0;
    const medium = summary.vulnerabilitiesBySeverity.medium || 0;
    
    let riskLevel = 'Low';
    if (critical > 0) riskLevel = 'Critical';
    else if (high > 2) riskLevel = 'High';
    else if (high > 0 || medium > 5) riskLevel = 'Medium';
    
    return `Security Assessment Summary:
    
Risk Level: ${riskLevel}
Total Vulnerabilities: ${summary.totalVulnerabilities}
- Critical: ${critical}
- High: ${high}
- Medium: ${medium}

Risk Score: ${summary.riskScore}/100

Key Recommendations:
${critical > 0 ? '- Immediately address critical vulnerabilities' : ''}
${high > 0 ? '- Prioritize high severity issues' : ''}
- Implement comprehensive security monitoring
- Regular security assessments recommended`;
  }
  
  /**
   * Validate Australian data residency compliance
   */
  static validateAustralianDataResidency(scanResult: SecurityScanResult): {
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];
    
    // Check for data exposure vulnerabilities
    const dataExposureVulns = scanResult.vulnerabilities.filter(v => 
      v.impact.dataAtRisk.length > 0 && 
      ['high', 'critical'].includes(v.severity)
    );
    
    if (dataExposureVulns.length > 0) {
      violations.push(`${dataExposureVulns.length} vulnerabilities could lead to data leaving Australia`);
      recommendations.push('Implement data loss prevention controls');
      recommendations.push('Review and strengthen access controls');
    }
    
    // Check compliance framework coverage
    const ismCompliantVulns = scanResult.vulnerabilities.filter(v => 
      v.compliance.frameworks.includes('ISM')
    );
    
    if (ismCompliantVulns.length > 0) {
      recommendations.push('Ensure ISM control implementation');
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }
}