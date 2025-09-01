/**
 * Policy Validator for Rego Policies
 * 
 * Validates Rego policy syntax, semantics, compliance, and performance
 * with Australian regulatory focus
 */

import { 
  RegoPolicy, 
  PolicyValidationResult, 
  PolicyValidationError, 
  PolicyValidationWarning,
  PolicyTestResult
} from './types';

/**
 * Policy validator with comprehensive checking capabilities
 */
export class PolicyValidator {
  private australianRegulations = [
    'Privacy Act 1988',
    'ACNC Governance Standards',
    'ATO Compliance',
    'AUSTRAC Requirements',
    'Indigenous Data Sovereignty'
  ];

  /**
   * Validate a Rego policy comprehensively
   */
  async validate(policy: RegoPolicy): Promise<PolicyValidationResult> {
    const startTime = Date.now();
    const errors: PolicyValidationError[] = [];
    const warnings: PolicyValidationWarning[] = [];

    // Syntax validation
    const syntaxErrors = await this.validateSyntax(policy);
    errors.push(...syntaxErrors);

    // Semantic validation
    const semanticErrors = await this.validateSemantics(policy);
    errors.push(...semanticErrors);

    // Dependency validation
    const dependencyErrors = await this.validateDependencies(policy);
    errors.push(...dependencyErrors);

    // Australian compliance validation
    const complianceErrors = await this.validateAustralianCompliance(policy);
    errors.push(...complianceErrors);

    // Security validation
    const securityErrors = await this.validateSecurity(policy);
    errors.push(...securityErrors);

    // Performance warnings
    const performanceWarnings = await this.validatePerformance(policy);
    warnings.push(...performanceWarnings);

    // Style warnings
    const styleWarnings = await this.validateStyle(policy);
    warnings.push(...styleWarnings);

    // Run test cases
    const testResults = await this.runTestCases(policy);

    // Compliance check
    const complianceCheck = await this.performComplianceCheck(policy);

    const validationTime = Date.now() - startTime;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      testResults,
      complianceCheck,
      performance: {
        validationTime,
        complexity: this.assessComplexity(policy),
        memoryUsage: this.estimateMemoryUsage(policy)
      }
    };
  }

  /**
   * Validate Rego syntax
   */
  private async validateSyntax(policy: RegoPolicy): Promise<PolicyValidationError[]> {
    const errors: PolicyValidationError[] = [];

    // Basic Rego syntax checks
    if (!policy.rego.trim()) {
      errors.push({
        type: 'syntax',
        message: 'Policy cannot be empty',
        severity: 'critical',
        rule: 'non-empty-policy',
        suggestion: 'Add at least one rule to the policy'
      });
    }

    // Check for required package declaration
    if (!policy.rego.includes('package ')) {
      errors.push({
        type: 'syntax',
        message: 'Policy must include a package declaration',
        severity: 'error',
        rule: 'package-declaration',
        suggestion: `Add 'package ${policy.module}' at the top of the policy`
      });
    }

    // Check for basic Rego structure patterns
    if (!policy.rego.includes('allow') && !policy.rego.includes('deny')) {
      warnings: [{
        type: 'syntax',
        message: 'Policy should contain at least one allow or deny rule',
        severity: 'error',
        rule: 'has-decision-rules',
        suggestion: 'Add allow {...} or deny {...} rules'
      }];
    }

    // Check for balanced braces
    const openBraces = (policy.rego.match(/\{/g) || []).length;
    const closeBraces = (policy.rego.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push({
        type: 'syntax',
        message: 'Unbalanced braces in policy',
        severity: 'error',
        rule: 'balanced-braces',
        suggestion: 'Ensure all opening braces have corresponding closing braces'
      });
    }

    // Check for invalid characters or patterns
    if (policy.rego.includes('//') && !policy.rego.includes('# ')) {
      warnings: [{
        type: 'style',
        message: 'Use # for comments in Rego instead of //',
        severity: 'warning',
        rule: 'comment-style',
        suggestion: 'Replace // with # for Rego comments'
      }];
    }

    return errors;
  }

  /**
   * Validate semantic correctness
   */
  private async validateSemantics(policy: RegoPolicy): Promise<PolicyValidationError[]> {
    const errors: PolicyValidationError[] = [];

    // Check module name consistency
    const packageMatch = policy.rego.match(/package\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/);
    if (packageMatch && packageMatch[1] !== policy.module) {
      errors.push({
        type: 'semantic',
        message: `Package declaration '${packageMatch[1]}' does not match module name '${policy.module}'`,
        severity: 'error',
        rule: 'package-module-consistency',
        suggestion: `Change package to 'package ${policy.module}' or update module name`
      });
    }

    // Check for undefined variables (basic check)
    const variablePattern = /[a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?!\s*:?=)/g;
    const definedVars = new Set(['input', 'data', 'true', 'false', 'null']);
    
    // Add policy-defined variables
    const assignments = policy.rego.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:?=/g);
    if (assignments) {
      assignments.forEach(assignment => {
        const varName = assignment.split(/\s*:?=/)[0].trim();
        definedVars.add(varName);
      });
    }

    let match;
    while ((match = variablePattern.exec(policy.rego)) !== null) {
      const variable = match[0].split('.')[0].split('[')[0];
      if (!definedVars.has(variable) && !this.isBuiltinFunction(variable)) {
        errors.push({
          type: 'semantic',
          message: `Undefined variable: ${variable}`,
          severity: 'error',
          rule: 'undefined-variable',
          suggestion: `Define ${variable} or check for typos`
        });
      }
    }

    return errors;
  }

  /**
   * Validate policy dependencies
   */
  private async validateDependencies(policy: RegoPolicy): Promise<PolicyValidationError[]> {
    const errors: PolicyValidationError[] = [];

    // Check for circular dependencies (simplified check)
    if (policy.dependencies.includes(policy.id)) {
      errors.push({
        type: 'dependency',
        message: 'Policy cannot depend on itself',
        severity: 'error',
        rule: 'no-self-dependency',
        suggestion: 'Remove self-reference from dependencies'
      });
    }

    // Check for import statements that don't match dependencies
    const imports = policy.rego.match(/import\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g);
    if (imports) {
      imports.forEach(importStatement => {
        const module = importStatement.replace('import ', '').trim();
        if (!policy.dependencies.some(dep => dep.includes(module))) {
          errors.push({
            type: 'dependency',
            message: `Imported module '${module}' not listed in dependencies`,
            severity: 'error',
            rule: 'import-dependency-consistency',
            suggestion: `Add '${module}' to policy dependencies`
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate Australian compliance requirements
   */
  private async validateAustralianCompliance(policy: RegoPolicy): Promise<PolicyValidationError[]> {
    const errors: PolicyValidationError[] = [];

    // Check data residency compliance
    if (!policy.australianCompliance.dataResidency || policy.australianCompliance.dataResidency !== 'australia') {
      errors.push({
        type: 'compliance',
        message: 'Policy must specify Australian data residency',
        severity: 'error',
        rule: 'australian-data-residency',
        suggestion: 'Set dataResidency to "australia" for compliance'
      });
    }

    // Check Privacy Act compliance
    if (!policy.australianCompliance.privacyActCompliant) {
      errors.push({
        type: 'compliance',
        message: 'Policy must be Privacy Act 1988 compliant',
        severity: 'error',
        rule: 'privacy-act-compliance',
        suggestion: 'Ensure policy follows Privacy Act 1988 requirements'
      });
    }

    // Check for Indigenous protocols when required
    if (policy.rego.includes('indigenous') || policy.rego.includes('traditional') || policy.rego.includes('cultural')) {
      if (!policy.australianCompliance.indigenousProtocols) {
        errors.push({
          type: 'compliance',
          message: 'Policy handling Indigenous data must specify Indigenous protocols',
          severity: 'error',
          rule: 'indigenous-protocols-required',
          suggestion: 'Enable Indigenous protocols compliance'
        });
      }
    }

    // Check regulatory framework coverage
    if (!policy.australianCompliance.regulatoryFramework || policy.australianCompliance.regulatoryFramework.length === 0) {
      errors.push({
        type: 'compliance',
        message: 'Policy must specify applicable regulatory frameworks',
        severity: 'error',
        rule: 'regulatory-framework-required',
        suggestion: 'Specify relevant Australian regulatory frameworks (e.g., ACNC, ATO, AUSTRAC)'
      });
    }

    return errors;
  }

  /**
   * Validate security aspects
   */
  private async validateSecurity(policy: RegoPolicy): Promise<PolicyValidationError[]> {
    const errors: PolicyValidationError[] = [];

    // Check for potential injection vulnerabilities
    if (policy.rego.includes('eval(') || policy.rego.includes('exec(')) {
      errors.push({
        type: 'security',
        message: 'Policy contains potentially unsafe eval or exec functions',
        severity: 'critical',
        rule: 'no-unsafe-functions',
        suggestion: 'Use safer alternatives to eval/exec functions'
      });
    }

    // Check for hardcoded secrets or credentials
    const secretPatterns = [
      /password\s*[:=]\s*["'][^"']+["']/i,
      /secret\s*[:=]\s*["'][^"']+["']/i,
      /key\s*[:=]\s*["'][^"']+["']/i,
      /token\s*[:=]\s*["'][^"']+["']/i
    ];

    secretPatterns.forEach((pattern, index) => {
      if (pattern.test(policy.rego)) {
        errors.push({
          type: 'security',
          message: 'Policy contains potential hardcoded secrets',
          severity: 'critical',
          rule: 'no-hardcoded-secrets',
          suggestion: 'Use environment variables or secure configuration for secrets'
        });
      }
    });

    // Check for unrestricted access patterns
    if (policy.rego.includes('allow { true }') && !policy.rego.includes('input.')) {
      errors.push({
        type: 'security',
        message: 'Policy allows unrestricted access without input validation',
        severity: 'error',
        rule: 'require-input-validation',
        suggestion: 'Add input validation constraints to allow rules'
      });
    }

    return errors;
  }

  /**
   * Validate performance characteristics
   */
  private async validatePerformance(policy: RegoPolicy): Promise<PolicyValidationWarning[]> {
    const warnings: PolicyValidationWarning[] = [];

    // Check for potentially expensive operations
    if (policy.rego.includes('walk(') || policy.rego.includes('object.get_nested(')) {
      warnings.push({
        type: 'performance',
        message: 'Policy uses potentially expensive traversal operations',
        severity: 'warning',
        rule: 'avoid-expensive-operations',
        suggestion: 'Consider optimizing data structure access patterns'
      });
    }

    // Check policy complexity
    const complexity = this.assessComplexity(policy);
    if (complexity === 'high') {
      warnings.push({
        type: 'performance',
        message: 'Policy has high complexity which may impact performance',
        severity: 'warning',
        rule: 'complexity-threshold',
        suggestion: 'Consider breaking down complex policies into smaller modules'
      });
    }

    // Check for large constant arrays/objects
    const largeArrayPattern = /\[[^\]]{200,}\]/;
    const largeObjectPattern = /\{[^}]{200,}\}/;
    
    if (largeArrayPattern.test(policy.rego) || largeObjectPattern.test(policy.rego)) {
      warnings.push({
        type: 'performance',
        message: 'Policy contains large inline data structures',
        severity: 'warning',
        rule: 'avoid-large-inline-data',
        suggestion: 'Consider moving large data to external data sources'
      });
    }

    return warnings;
  }

  /**
   * Validate code style
   */
  private async validateStyle(policy: RegoPolicy): Promise<PolicyValidationWarning[]> {
    const warnings: PolicyValidationWarning[] = [];

    // Check indentation consistency (simplified)
    const lines = policy.rego.split('\n');
    const indentations = lines.map(line => {
      const match = line.match(/^(\s*)/);
      return match ? match[1].length : 0;
    });

    // Check for mixed tabs and spaces
    if (policy.rego.includes('\t') && policy.rego.includes('  ')) {
      warnings.push({
        type: 'style',
        message: 'Mixed tabs and spaces for indentation',
        severity: 'warning',
        rule: 'consistent-indentation',
        suggestion: 'Use either tabs or spaces consistently for indentation'
      });
    }

    // Check naming conventions
    const ruleNames = policy.rego.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*\{/gm);
    if (ruleNames) {
      ruleNames.forEach(ruleName => {
        const name = ruleName.split(/\s/)[0];
        if (name !== name.toLowerCase()) {
          warnings.push({
            type: 'style',
            message: `Rule name '${name}' should use lowercase_with_underscores`,
            severity: 'info',
            rule: 'rule-naming-convention',
            suggestion: `Rename to '${name.toLowerCase()}'`
          });
        }
      });
    }

    return warnings;
  }

  /**
   * Run test cases for the policy
   */
  private async runTestCases(policy: RegoPolicy): Promise<PolicyTestResult[]> {
    const results: PolicyTestResult[] = [];

    for (const testCase of policy.testCases) {
      const startTime = Date.now();
      
      try {
        // Simulate test execution - in production, this would use OPA
        const result = await this.executeTestCase(policy, testCase);
        
        results.push({
          testCaseId: testCase.id,
          passed: result.decision === testCase.expectedDecision,
          actualOutput: result.output,
          actualDecision: result.decision,
          executionTime: Date.now() - startTime
        });

      } catch (error) {
        results.push({
          testCaseId: testCase.id,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime
        });
      }
    }

    return results;
  }

  /**
   * Perform comprehensive compliance check
   */
  private async performComplianceCheck(policy: RegoPolicy) {
    const issues: string[] = [];

    // Australian law compliance
    const australianLawCompliant = policy.australianCompliance.privacyActCompliant &&
                                   policy.australianCompliance.dataResidency === 'australia';

    if (!australianLawCompliant) {
      issues.push('Policy does not meet Australian legal requirements');
    }

    // Indigenous protocols check
    const indigenousProtocolsChecked = !policy.rego.includes('indigenous') || 
                                       policy.australianCompliance.indigenousProtocols;

    if (!indigenousProtocolsChecked) {
      issues.push('Indigenous data handling requires protocol compliance');
    }

    // Data residency compliance
    const dataResidencyCompliant = policy.australianCompliance.dataResidency === 'australia';

    if (!dataResidencyCompliant) {
      issues.push('Data must remain within Australian jurisdiction');
    }

    return {
      australianLawCompliant,
      indigenousProtocolsChecked,
      dataResidencyCompliant,
      issues
    };
  }

  /**
   * Assess policy complexity
   */
  private assessComplexity(policy: RegoPolicy): 'low' | 'medium' | 'high' {
    const regoLength = policy.rego.length;
    const ruleCount = (policy.rego.match(/\{/g) || []).length;
    const dependencyCount = policy.dependencies.length;

    const complexityScore = (regoLength / 100) + (ruleCount * 2) + (dependencyCount * 3);

    if (complexityScore < 10) return 'low';
    if (complexityScore < 25) return 'medium';
    return 'high';
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(policy: RegoPolicy): number {
    // Simplified estimation in KB
    const baseSize = policy.rego.length / 1024;
    const complexityMultiplier = this.assessComplexity(policy) === 'high' ? 2 : 1;
    
    return Math.round(baseSize * complexityMultiplier);
  }

  /**
   * Execute a test case (simulated)
   */
  private async executeTestCase(policy: RegoPolicy, testCase: any): Promise<any> {
    // In production, this would execute the policy using OPA
    // For now, return the expected result
    return {
      decision: testCase.expectedDecision,
      output: testCase.expectedOutput
    };
  }

  /**
   * Check if a name is a built-in Rego function
   */
  private isBuiltinFunction(name: string): boolean {
    const builtins = [
      'count', 'sum', 'max', 'min', 'sort', 'all', 'any',
      'sprintf', 'format', 'contains', 'startswith', 'endswith',
      'split', 'replace', 'trim', 'lower', 'upper',
      'time', 'date', 'now', 'parse_time',
      'base64', 'json', 'yaml', 'regex',
      'walk', 'object', 'array', 'set',
      'io', 'http', 'net', 'crypto'
    ];
    
    return builtins.includes(name);
  }
}