/**
 * Penetration Testing Automation Runner for ACT Placemat
 * 
 * Orchestrates automated penetration testing scenarios with realistic attack simulations
 * and comprehensive security assessment for Australian compliance requirements
 */

import { z } from 'zod';
import { EventEmitter } from 'events';
import { SecurityTester, PenetrationTestResult } from './SecurityTester';

// === PENETRATION TEST SCENARIOS ===

export interface PenTestScenario {
  id: string;
  name: string;
  description: string;
  objectives: string[];
  prerequisites: string[];
  steps: PenTestStep[];
  expectedOutcomes: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  complianceRelevance: string[];
}

export interface PenTestStep {
  id: string;
  name: string;
  description: string;
  technique: string;
  tools: string[];
  targets: string[];
  successCriteria: string[];
  failureCriteria: string[];
  evidenceCollection: string[];
  maxDuration: number; // minutes
}

// === PENETRATION TEST SCENARIOS LIBRARY ===

export class PenetrationTestScenarios {
  
  static getWebApplicationScenarios(): PenTestScenario[] {
    return [
      {
        id: 'web-app-owasp-top10',
        name: 'OWASP Top 10 Web Application Assessment',
        description: 'Comprehensive assessment targeting OWASP Top 10 vulnerabilities',
        objectives: [
          'Identify injection vulnerabilities',
          'Test authentication and session management',
          'Assess security misconfigurations',
          'Evaluate access controls'
        ],
        prerequisites: [
          'Web application accessible',
          'Test credentials available',
          'Network connectivity confirmed'
        ],
        steps: [
          {
            id: 'step-1',
            name: 'Information Gathering',
            description: 'Collect information about the target application',
            technique: 'Reconnaissance',
            tools: ['nmap', 'dirb', 'nikto'],
            targets: ['web-application'],
            successCriteria: [
              'Technology stack identified',
              'Directory structure mapped',
              'Entry points discovered'
            ],
            failureCriteria: [
              'No response from target',
              'Access blocked by WAF'
            ],
            evidenceCollection: [
              'Port scan results',
              'Directory enumeration',
              'Technology fingerprints'
            ],
            maxDuration: 30
          },
          {
            id: 'step-2',
            name: 'Authentication Testing',
            description: 'Test authentication mechanisms and session management',
            technique: 'Authentication bypass',
            tools: ['burp-suite', 'hydra', 'custom-scripts'],
            targets: ['login-forms', 'api-authentication'],
            successCriteria: [
              'Weak credentials identified',
              'Session management flaws found',
              'Authentication bypass achieved'
            ],
            failureCriteria: [
              'Strong authentication controls',
              'Account lockout mechanisms active'
            ],
            evidenceCollection: [
              'Login attempt logs',
              'Session token analysis',
              'Authentication bypass proof'
            ],
            maxDuration: 45
          },
          {
            id: 'step-3',
            name: 'Injection Testing',
            description: 'Test for SQL injection and other injection vulnerabilities',
            technique: 'Injection attacks',
            tools: ['sqlmap', 'burp-suite', 'custom-payloads'],
            targets: ['input-forms', 'api-endpoints', 'search-functions'],
            successCriteria: [
              'SQL injection confirmed',
              'Database access achieved',
              'Data extraction successful'
            ],
            failureCriteria: [
              'Input validation blocks attacks',
              'WAF blocks injection attempts'
            ],
            evidenceCollection: [
              'Injection payload responses',
              'Database error messages',
              'Extracted data samples'
            ],
            maxDuration: 60
          }
        ],
        expectedOutcomes: [
          'Vulnerability assessment report',
          'Risk rating and prioritization',
          'Remediation recommendations',
          'Compliance gap analysis'
        ],
        riskLevel: 'high',
        estimatedDuration: 180,
        complianceRelevance: ['ISM', 'OWASP', 'Privacy-Act']
      },
      
      {
        id: 'api-security-assessment',
        name: 'API Security Assessment',
        description: 'Focused testing of REST API endpoints and GraphQL interfaces',
        objectives: [
          'Test API authentication and authorization',
          'Identify business logic flaws',
          'Assess rate limiting and DoS protection',
          'Validate data exposure controls'
        ],
        prerequisites: [
          'API documentation available',
          'Valid API keys or tokens',
          'Endpoint inventory complete'
        ],
        steps: [
          {
            id: 'api-step-1',
            name: 'API Discovery and Enumeration',
            description: 'Discover and catalog all API endpoints',
            technique: 'API reconnaissance',
            tools: ['postman', 'burp-suite', 'ffuf'],
            targets: ['api-endpoints', 'swagger-docs'],
            successCriteria: [
              'Complete endpoint inventory',
              'Parameter discovery',
              'Authentication methods identified'
            ],
            failureCriteria: [
              'API documentation unavailable',
              'Endpoints return 404'
            ],
            evidenceCollection: [
              'Endpoint catalog',
              'API documentation',
              'Response samples'
            ],
            maxDuration: 30
          },
          {
            id: 'api-step-2',
            name: 'Authorization Testing',
            description: 'Test API authorization controls and privilege escalation',
            technique: 'Authorization bypass',
            tools: ['burp-suite', 'custom-scripts'],
            targets: ['protected-endpoints', 'admin-functions'],
            successCriteria: [
              'Privilege escalation successful',
              'Access control bypass',
              'Unauthorized data access'
            ],
            failureCriteria: [
              'Strong authorization controls',
              'Proper privilege separation'
            ],
            evidenceCollection: [
              'Authorization bypass proof',
              'Escalated privilege evidence',
              'Unauthorized data access logs'
            ],
            maxDuration: 45
          }
        ],
        expectedOutcomes: [
          'API security assessment report',
          'Authorization matrix analysis',
          'Business logic vulnerability assessment'
        ],
        riskLevel: 'medium',
        estimatedDuration: 120,
        complianceRelevance: ['ISM', 'Privacy-Act']
      }
    ];
  }
  
  static getInfrastructureScenarios(): PenTestScenario[] {
    return [
      {
        id: 'network-penetration-test',
        name: 'Network Infrastructure Penetration Test',
        description: 'Assessment of network security controls and segmentation',
        objectives: [
          'Test network segmentation',
          'Identify exposed services',
          'Assess firewall configurations',
          'Test intrusion detection systems'
        ],
        prerequisites: [
          'Network access granted',
          'IP ranges defined',
          'Testing window scheduled'
        ],
        steps: [
          {
            id: 'net-step-1',
            name: 'Network Discovery',
            description: 'Discover live hosts and services',
            technique: 'Network reconnaissance',
            tools: ['nmap', 'masscan', 'zmap'],
            targets: ['network-ranges', 'public-ips'],
            successCriteria: [
              'Live hosts identified',
              'Service enumeration complete',
              'OS fingerprinting successful'
            ],
            failureCriteria: [
              'Network unreachable',
              'All ports filtered'
            ],
            evidenceCollection: [
              'Network scan results',
              'Service banners',
              'OS identification'
            ],
            maxDuration: 60
          }
        ],
        expectedOutcomes: [
          'Network security assessment',
          'Service exposure analysis',
          'Network segmentation review'
        ],
        riskLevel: 'medium',
        estimatedDuration: 240,
        complianceRelevance: ['ISM', 'Essential-8']
      }
    ];
  }
  
  static getComplianceScenarios(): PenTestScenario[] {
    return [
      {
        id: 'ism-compliance-assessment',
        name: 'ISM Compliance Security Assessment',
        description: 'Security testing aligned with Australian Government ISM controls',
        objectives: [
          'Validate ISM control implementation',
          'Test essential security measures',
          'Assess data protection controls',
          'Verify access management'
        ],
        prerequisites: [
          'ISM control inventory available',
          'Security policy documentation',
          'Administrative access for testing'
        ],
        steps: [
          {
            id: 'ism-step-1',
            name: 'Access Control Testing',
            description: 'Test ISM access control requirements',
            technique: 'Access control validation',
            tools: ['custom-scripts', 'powershell', 'bash'],
            targets: ['user-accounts', 'privileged-accounts', 'service-accounts'],
            successCriteria: [
              'Least privilege validated',
              'Role separation confirmed',
              'Account management controls tested'
            ],
            failureCriteria: [
              'Excessive privileges found',
              'Weak password policies',
              'Missing access reviews'
            ],
            evidenceCollection: [
              'Access control matrix',
              'Privilege analysis',
              'Account audit results'
            ],
            maxDuration: 90
          }
        ],
        expectedOutcomes: [
          'ISM compliance assessment report',
          'Control effectiveness analysis',
          'Gap remediation plan'
        ],
        riskLevel: 'high',
        estimatedDuration: 300,
        complianceRelevance: ['ISM', 'Essential-8', 'Privacy-Act']
      }
    ];
  }
  
  static getAllScenarios(): PenTestScenario[] {
    return [
      ...this.getWebApplicationScenarios(),
      ...this.getInfrastructureScenarios(),
      ...this.getComplianceScenarios()
    ];
  }
}

// === PENETRATION TEST EXECUTION ENGINE ===

export class PenetrationTestRunner extends EventEmitter {
  private securityTester: SecurityTester;
  private activeTests: Map<string, PenetrationTestExecution> = new Map();
  private testHistory: PenetrationTestExecution[] = [];
  
  constructor(securityTester: SecurityTester) {
    super();
    this.securityTester = securityTester;
  }
  
  /**
   * Execute a penetration test scenario
   */
  async executeScenario(scenarioId: string, targets: string[] = []): Promise<PenetrationTestExecution> {
    const scenario = this.getScenario(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }
    
    const executionId = crypto.randomUUID();
    const execution = new PenetrationTestExecution(
      executionId,
      scenario,
      targets,
      this.securityTester
    );
    
    this.activeTests.set(executionId, execution);
    
    // Set up event forwarding
    execution.on('step_completed', (step) => {
      this.emit('step_completed', { executionId, step });
    });
    
    execution.on('step_failed', (step, error) => {
      this.emit('step_failed', { executionId, step, error });
    });
    
    execution.on('completed', (result) => {
      this.activeTests.delete(executionId);
      this.testHistory.push(execution);
      this.emit('test_completed', { executionId, result });
    });
    
    execution.on('failed', (error) => {
      this.activeTests.delete(executionId);
      this.testHistory.push(execution);
      this.emit('test_failed', { executionId, error });
    });
    
    // Start execution
    await execution.start();
    
    return execution;
  }
  
  /**
   * Execute multiple scenarios in sequence
   */
  async executeScenarios(scenarioIds: string[], targets: string[] = []): Promise<PenetrationTestExecution[]> {
    const executions: PenetrationTestExecution[] = [];
    
    for (const scenarioId of scenarioIds) {
      try {
        const execution = await this.executeScenario(scenarioId, targets);
        executions.push(execution);
        
        // Wait for completion before starting next scenario
        await new Promise((resolve, reject) => {
          execution.on('completed', resolve);
          execution.on('failed', reject);
        });
        
      } catch (error) {
        console.error(`Failed to execute scenario ${scenarioId}:`, error);
        // Continue with next scenario
      }
    }
    
    return executions;
  }
  
  /**
   * Get available scenarios
   */
  getAvailableScenarios(): PenTestScenario[] {
    return PenetrationTestScenarios.getAllScenarios();
  }
  
  /**
   * Get scenario by ID
   */
  private getScenario(scenarioId: string): PenTestScenario | null {
    return PenetrationTestScenarios.getAllScenarios().find(s => s.id === scenarioId) || null;
  }
  
  /**
   * Get active test executions
   */
  getActiveTests(): PenetrationTestExecution[] {
    return Array.from(this.activeTests.values());
  }
  
  /**
   * Get test execution history
   */
  getTestHistory(limit: number = 10): PenetrationTestExecution[] {
    return this.testHistory.slice(-limit);
  }
  
  /**
   * Cancel active test execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.activeTests.get(executionId);
    if (execution) {
      await execution.cancel();
      this.activeTests.delete(executionId);
    }
  }
}

// === PENETRATION TEST EXECUTION ===

interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  evidence: string[];
  findings: string[];
  errors: string[];
  successCriteriaMatch: number; // 0-1 percentage
}

export class PenetrationTestExecution extends EventEmitter {
  public readonly id: string;
  public readonly scenario: PenTestScenario;
  public readonly targets: string[];
  
  private securityTester: SecurityTester;
  private status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' = 'pending';
  private startTime?: Date;
  private endTime?: Date;
  private currentStepIndex = 0;
  private stepResults: StepResult[] = [];
  private overallResult?: PenetrationTestResult;
  private cancelled = false;
  
  constructor(
    id: string, 
    scenario: PenTestScenario, 
    targets: string[], 
    securityTester: SecurityTester
  ) {
    super();
    this.id = id;
    this.scenario = scenario;
    this.targets = targets;
    this.securityTester = securityTester;
    
    // Initialize step results
    this.stepResults = scenario.steps.map(step => ({
      stepId: step.id,
      status: 'pending',
      evidence: [],
      findings: [],
      errors: [],
      successCriteriaMatch: 0
    }));
  }
  
  /**
   * Start test execution
   */
  async start(): Promise<void> {
    if (this.status !== 'pending') {
      throw new Error('Test execution already started');
    }
    
    this.status = 'running';
    this.startTime = new Date();
    
    console.log(`Starting penetration test: ${this.scenario.name}`);
    
    try {
      // Execute each step in sequence
      for (let i = 0; i < this.scenario.steps.length; i++) {
        if (this.cancelled) {
          this.status = 'cancelled';
          return;
        }
        
        this.currentStepIndex = i;
        const step = this.scenario.steps[i];
        
        console.log(`Executing step ${i + 1}/${this.scenario.steps.length}: ${step.name}`);
        
        await this.executeStep(step, i);
        
        // Check if step failed and should halt execution
        const stepResult = this.stepResults[i];
        if (stepResult.status === 'failed' && this.isStepCritical(step)) {
          console.log(`Critical step failed, halting execution: ${step.name}`);
          break;
        }
      }
      
      // Generate overall result
      await this.generateOverallResult();
      
      this.status = 'completed';
      this.endTime = new Date();
      
      this.emit('completed', this.overallResult);
      
    } catch (error) {
      this.status = 'failed';
      this.endTime = new Date();
      console.error('Penetration test execution failed:', error);
      this.emit('failed', error);
    }
  }
  
  /**
   * Execute individual test step
   */
  private async executeStep(step: PenTestStep, stepIndex: number): Promise<void> {
    const stepResult = this.stepResults[stepIndex];
    stepResult.status = 'running';
    stepResult.startTime = new Date();
    
    this.emit('step_started', { step, stepIndex });
    
    try {
      // Simulate step execution based on technique
      const result = await this.simulateStepExecution(step);
      
      stepResult.evidence = result.evidence;
      stepResult.findings = result.findings;
      stepResult.successCriteriaMatch = result.successRate;
      stepResult.status = result.success ? 'completed' : 'failed';
      
      this.emit('step_completed', { step, stepIndex, result: stepResult });
      
    } catch (error) {
      stepResult.status = 'failed';
      stepResult.errors.push(error instanceof Error ? error.message : String(error));
      
      this.emit('step_failed', { step, stepIndex, error });
    } finally {
      stepResult.endTime = new Date();
      stepResult.duration = stepResult.endTime.getTime() - (stepResult.startTime?.getTime() || 0);
    }
  }
  
  /**
   * Simulate step execution (in production, this would execute real tools)
   */
  private async simulateStepExecution(step: PenTestStep): Promise<{
    success: boolean;
    evidence: string[];
    findings: string[];
    successRate: number;
  }> {
    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5000));
    
    const evidence: string[] = [];
    const findings: string[] = [];
    let successRate = 0;
    
    switch (step.technique) {
      case 'Reconnaissance':
        evidence.push('Port scan completed: 80/tcp open, 443/tcp open');
        evidence.push('Technology detected: Apache/2.4.41, PHP/7.4');
        findings.push('Web server version disclosed');
        findings.push('Directory listing enabled on /backup/');
        successRate = 0.8;
        break;
        
      case 'Authentication bypass':
        evidence.push('Login attempt with admin:admin - SUCCESS');
        evidence.push('Session token: predictable format detected');
        findings.push('Default credentials accepted');
        findings.push('Weak session management');
        successRate = 0.9;
        break;
        
      case 'Injection attacks':
        if (Math.random() > 0.7) {
          evidence.push('SQL injection confirmed: UNION attack successful');
          evidence.push('Database schema extracted: users table found');
          findings.push('SQL injection vulnerability in login form');
          findings.push('Database credentials exposed');
          successRate = 0.95;
        } else {
          evidence.push('SQL injection attempts blocked by WAF');
          findings.push('Input validation appears effective');
          successRate = 0.1;
        }
        break;
        
      case 'Authorization bypass':
        evidence.push('API endpoint accessed without proper authorization');
        evidence.push('Admin functions accessible to regular user');
        findings.push('Privilege escalation vulnerability');
        successRate = 0.7;
        break;
        
      case 'Network reconnaissance':
        evidence.push('Network scan completed: 254 hosts discovered');
        evidence.push('Open ports found: SSH, RDP, SMB');
        findings.push('Internal network mapping successful');
        findings.push('Legacy systems detected');
        successRate = 0.85;
        break;
        
      default:
        evidence.push('Generic test execution completed');
        findings.push('Standard security assessment performed');
        successRate = 0.5;
    }
    
    return {
      success: successRate > 0.5,
      evidence,
      findings,
      successRate
    };
  }
  
  /**
   * Check if step failure should halt execution
   */
  private isStepCritical(step: PenTestStep): boolean {
    // First step (reconnaissance) is usually critical
    return step.id.includes('step-1') || step.name.toLowerCase().includes('prerequisite');
  }
  
  /**
   * Generate overall penetration test result
   */
  private async generateOverallResult(): Promise<void> {
    const completedSteps = this.stepResults.filter(r => r.status === 'completed');
    const failedSteps = this.stepResults.filter(r => r.status === 'failed');
    
    // Calculate overall success rate
    const overallSuccessRate = this.stepResults.reduce((sum, result) => 
      sum + result.successCriteriaMatch, 0) / this.stepResults.length;
    
    // Determine compromise level
    const highSuccessSteps = completedSteps.filter(r => r.successCriteriaMatch > 0.8);
    const systemsCompromised = this.determineCompromisedSystems(highSuccessSteps);
    
    // Build attack chain
    const attackChain = this.stepResults.map((result, index) => ({
      step: index + 1,
      action: this.scenario.steps[index].name,
      technique: this.scenario.steps[index].technique,
      target: this.scenario.steps[index].targets.join(', '),
      result: result.status === 'completed' ? 'success' as const : 
              result.status === 'failed' ? 'failure' as const : 'partial' as const,
      evidence: result.evidence,
      impact: result.findings.join('; ')
    }));
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();
    
    this.overallResult = {
      id: this.id,
      timestamp: this.startTime!,
      duration: this.endTime ? this.endTime.getTime() - this.startTime!.getTime() : 0,
      scenario: {
        name: this.scenario.name,
        description: this.scenario.description,
        objectives: this.scenario.objectives,
        scope: this.targets,
        methodology: 'Automated penetration testing framework'
      },
      attackChain,
      compromise: {
        systemsCompromised,
        dataAccessed: this.extractDataAccessed(),
        privilegesObtained: this.extractPrivilegesObtained(),
        persistenceAchieved: overallSuccessRate > 0.7,
        lateralMovement: systemsCompromised.length > 1,
        exfiltrationPossible: this.stepResults.some(r => 
          r.findings.some(f => f.toLowerCase().includes('data'))
        )
      },
      risk: {
        likelihood: overallSuccessRate > 0.8 ? 'high' : 
                   overallSuccessRate > 0.5 ? 'medium' : 'low',
        impact: systemsCompromised.length > 0 ? 'high' : 'medium',
        riskRating: overallSuccessRate > 0.7 ? 'high' : 'medium',
        businessRisk: this.assessBusinessRisk(overallSuccessRate, systemsCompromised)
      },
      recommendations,
      status: 'completed'
    };
  }
  
  /**
   * Determine compromised systems based on successful steps
   */
  private determineCompromisedSystems(successfulSteps: StepResult[]): string[] {
    const systems: Set<string> = new Set();
    
    successfulSteps.forEach(step => {
      step.findings.forEach(finding => {
        if (finding.toLowerCase().includes('database')) {
          systems.add('Database Server');
        }
        if (finding.toLowerCase().includes('web') || finding.toLowerCase().includes('application')) {
          systems.add('Web Application');
        }
        if (finding.toLowerCase().includes('network') || finding.toLowerCase().includes('internal')) {
          systems.add('Internal Network');
        }
        if (finding.toLowerCase().includes('admin') || finding.toLowerCase().includes('privilege')) {
          systems.add('Administrative Systems');
        }
      });
    });
    
    return Array.from(systems);
  }
  
  /**
   * Extract data accessed from findings
   */
  private extractDataAccessed(): string[] {
    const dataTypes: Set<string> = new Set();
    
    this.stepResults.forEach(result => {
      result.findings.forEach(finding => {
        const lower = finding.toLowerCase();
        if (lower.includes('user') || lower.includes('credential')) {
          dataTypes.add('User credentials');
        }
        if (lower.includes('personal') || lower.includes('profile')) {
          dataTypes.add('Personal data');
        }
        if (lower.includes('database') || lower.includes('schema')) {
          dataTypes.add('Database contents');
        }
        if (lower.includes('file') || lower.includes('document')) {
          dataTypes.add('File system data');
        }
      });
    });
    
    return Array.from(dataTypes);
  }
  
  /**
   * Extract privileges obtained from findings
   */
  private extractPrivilegesObtained(): string[] {
    const privileges: Set<string> = new Set();
    
    this.stepResults.forEach(result => {
      result.findings.forEach(finding => {
        const lower = finding.toLowerCase();
        if (lower.includes('admin')) {
          privileges.add('Administrative access');
        }
        if (lower.includes('database')) {
          privileges.add('Database access');
        }
        if (lower.includes('system') || lower.includes('root')) {
          privileges.add('System-level access');
        }
        if (lower.includes('user')) {
          privileges.add('User-level access');
        }
      });
    });
    
    return Array.from(privileges);
  }
  
  /**
   * Assess business risk based on test results
   */
  private assessBusinessRisk(successRate: number, compromisedSystems: string[]): string {
    if (successRate > 0.8 && compromisedSystems.length > 2) {
      return 'Critical: Multiple systems compromised, high risk of data breach and business disruption';
    } else if (successRate > 0.6 && compromisedSystems.length > 0) {
      return 'High: System compromise possible, risk of data exposure and regulatory violations';
    } else if (successRate > 0.4) {
      return 'Medium: Security weaknesses identified, moderate risk of exploitation';
    } else {
      return 'Low: Limited security issues found, low risk of successful attacks';
    }
  }
  
  /**
   * Generate remediation recommendations
   */
  private generateRecommendations(): Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    implementation: string[];
    cost: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
  }> {
    const recommendations: any[] = [];
    
    // Analyze findings to generate targeted recommendations
    const allFindings = this.stepResults.flatMap(r => r.findings);
    
    if (allFindings.some(f => f.toLowerCase().includes('default') || f.toLowerCase().includes('weak'))) {
      recommendations.push({
        priority: 'critical' as const,
        category: 'Authentication',
        description: 'Strengthen authentication controls and eliminate default credentials',
        implementation: [
          'Change all default passwords immediately',
          'Implement strong password policy',
          'Enable multi-factor authentication',
          'Regular password audits'
        ],
        cost: 'low' as const,
        effort: 'low' as const
      });
    }
    
    if (allFindings.some(f => f.toLowerCase().includes('injection') || f.toLowerCase().includes('sql'))) {
      recommendations.push({
        priority: 'critical' as const,
        category: 'Input Validation',
        description: 'Implement comprehensive input validation and use parameterized queries',
        implementation: [
          'Replace dynamic SQL with parameterized queries',
          'Implement input validation framework',
          'Deploy Web Application Firewall',
          'Regular code security reviews'
        ],
        cost: 'medium' as const,
        effort: 'medium' as const
      });
    }
    
    if (allFindings.some(f => f.toLowerCase().includes('privilege') || f.toLowerCase().includes('authorization'))) {
      recommendations.push({
        priority: 'high' as const,
        category: 'Access Control',
        description: 'Implement proper authorization controls and privilege separation',
        implementation: [
          'Implement role-based access control',
          'Regular access reviews',
          'Principle of least privilege',
          'Segregation of duties'
        ],
        cost: 'medium' as const,
        effort: 'high' as const
      });
    }
    
    // Add general recommendations
    recommendations.push({
      priority: 'medium' as const,
      category: 'Monitoring',
      description: 'Implement comprehensive security monitoring and incident response',
      implementation: [
        'Deploy SIEM solution',
        'Configure security alerting',
        'Develop incident response procedures',
        'Regular security assessments'
      ],
      cost: 'high' as const,
      effort: 'high' as const
    });
    
    return recommendations;
  }
  
  /**
   * Cancel test execution
   */
  async cancel(): Promise<void> {
    this.cancelled = true;
    this.status = 'cancelled';
    this.endTime = new Date();
    
    console.log(`Penetration test cancelled: ${this.scenario.name}`);
    this.emit('cancelled');
  }
  
  // === PUBLIC API ===
  
  getStatus(): string {
    return this.status;
  }
  
  getProgress(): {
    currentStep: number;
    totalSteps: number;
    percentage: number;
    currentStepName?: string;
  } {
    return {
      currentStep: this.currentStepIndex + 1,
      totalSteps: this.scenario.steps.length,
      percentage: ((this.currentStepIndex + 1) / this.scenario.steps.length) * 100,
      currentStepName: this.scenario.steps[this.currentStepIndex]?.name
    };
  }
  
  getStepResults(): StepResult[] {
    return [...this.stepResults];
  }
  
  getResult(): PenetrationTestResult | null {
    return this.overallResult || null;
  }
  
  getDuration(): number {
    if (!this.startTime) return 0;
    const endTime = this.endTime || new Date();
    return endTime.getTime() - this.startTime.getTime();
  }
}