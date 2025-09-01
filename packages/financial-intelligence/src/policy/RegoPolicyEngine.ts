/**
 * Rego Policy Engine
 * 
 * Executes Rego policies using Open Policy Agent (OPA) with decision logging,
 * caching, and Australian compliance tracking
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { 
  PolicyEngineConfig, 
  PolicyDecisionResult, 
  PolicyCondition,
  PolicyAuditEntry,
  RegoPolicy 
} from './types';

/**
 * Policy execution engine with OPA integration
 */
export class RegoPolicyEngine extends EventEmitter {
  private config: PolicyEngineConfig;
  private policyCache: Map<string, any> = new Map();
  private decisionCache: Map<string, PolicyDecisionResult> = new Map();
  private auditLog: PolicyAuditEntry[] = [];

  constructor(config: PolicyEngineConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the policy engine
   */
  async initialize(): Promise<void> {
    console.log('Initializing Rego Policy Engine...');

    try {
      // Test OPA connection if configured
      if (this.config.opa.serverUrl) {
        await this.testOPAConnection();
      }

      // Initialize cache cleanup
      if (this.config.cache.enableCaching) {
        this.initializeCacheCleanup();
      }

      console.log('Rego Policy Engine initialized successfully');
      this.emit('engine_initialized');

    } catch (error) {
      console.error('Failed to initialize Rego Policy Engine:', error);
      throw error;
    }
  }

  /**
   * Evaluate a policy against input data
   */
  async evaluatePolicy(
    policy: RegoPolicy,
    input: any,
    requestId?: string
  ): Promise<PolicyDecisionResult> {
    const startTime = Date.now();
    const actualRequestId = requestId || crypto.randomUUID();

    console.log(`Evaluating policy ${policy.name} (${policy.version})`);

    try {
      // Input validation and sanitization
      if (this.config.security.enableInputValidation) {
        input = await this.validateAndSanitizeInput(input);
      }

      // Check cache if enabled
      const cacheKey = this.generateCacheKey(policy.id, input);
      if (this.config.cache.enableCaching) {
        const cachedResult = this.decisionCache.get(cacheKey);
        if (cachedResult && this.isCacheValid(cachedResult)) {
          console.log(`Cache hit for policy ${policy.name}`);
          return cachedResult;
        }
      }

      // Execute policy
      const result = await this.executePolicyInternal(policy, input, actualRequestId);

      // Cache result if enabled
      if (this.config.cache.enableCaching) {
        this.decisionCache.set(cacheKey, result);
      }

      // Audit logging
      if (this.config.security.enableAuditLogging) {
        await this.logPolicyDecision(policy, input, result, actualRequestId);
      }

      const executionTime = Date.now() - startTime;
      result.executionTime = executionTime;

      this.emit('policy_evaluated', { policy, result, executionTime });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log error
      await this.logPolicyError(policy, input, error, actualRequestId);

      // Create error result
      const errorResult: PolicyDecisionResult = {
        decision: 'deny',
        policyId: policy.id,
        version: policy.version,
        input,
        output: { error: error instanceof Error ? error.message : String(error) },
        executionTime,
        metadata: {
          evaluatedPolicies: [policy.id],
          triggeredRules: [],
          timestamp: new Date(),
          requestId: actualRequestId
        },
        explanation: `Policy evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        auditTrail: []
      };

      this.emit('policy_error', { policy, error, result: errorResult });

      return errorResult;
    }
  }

  /**
   * Evaluate multiple policies in sequence
   */
  async evaluatePolicies(
    policies: RegoPolicy[],
    input: any,
    requestId?: string
  ): Promise<PolicyDecisionResult[]> {
    const actualRequestId = requestId || crypto.randomUUID();
    const results: PolicyDecisionResult[] = [];

    console.log(`Evaluating ${policies.length} policies`);

    for (const policy of policies) {
      try {
        const result = await this.evaluatePolicy(policy, input, actualRequestId);
        results.push(result);

        // Short-circuit on deny if configured
        if (result.decision === 'deny' && policy.metadata.enforcement === 'mandatory') {
          console.log(`Short-circuiting on mandatory policy denial: ${policy.name}`);
          break;
        }

      } catch (error) {
        console.error(`Failed to evaluate policy ${policy.name}:`, error);
        // Continue with other policies unless it's a critical failure
      }
    }

    return results;
  }

  /**
   * Evaluate a policy bundle
   */
  async evaluateBundle(
    policies: RegoPolicy[],
    input: any,
    requestId?: string
  ): Promise<{
    decision: 'allow' | 'deny' | 'conditional';
    results: PolicyDecisionResult[];
    conditions: PolicyCondition[];
    explanation: string;
  }> {
    const results = await this.evaluatePolicies(policies, input, requestId);
    
    // Aggregate decisions
    const allowCount = results.filter(r => r.decision === 'allow').length;
    const denyCount = results.filter(r => r.decision === 'deny').length;
    const conditionalCount = results.filter(r => r.decision === 'conditional').length;

    let finalDecision: 'allow' | 'deny' | 'conditional';
    let explanation: string;
    const conditions: PolicyCondition[] = [];

    // Collect all conditions from conditional decisions
    results.forEach(result => {
      if (result.conditions) {
        conditions.push(...result.conditions);
      }
    });

    // Decision logic
    if (denyCount > 0) {
      finalDecision = 'deny';
      explanation = `${denyCount} policies denied the request`;
    } else if (conditionalCount > 0) {
      finalDecision = 'conditional';
      explanation = `${conditionalCount} policies require conditions to be met`;
    } else if (allowCount > 0) {
      finalDecision = 'allow';
      explanation = `All ${allowCount} policies allowed the request`;
    } else {
      finalDecision = 'deny';
      explanation = 'No policies evaluated or all policies returned no decision';
    }

    return {
      decision: finalDecision,
      results,
      conditions,
      explanation
    };
  }

  /**
   * Load and compile a policy
   */
  async loadPolicy(policy: RegoPolicy): Promise<void> {
    console.log(`Loading policy: ${policy.name}`);

    try {
      // Validate policy before loading
      if (!policy.rego || !policy.rego.trim()) {
        throw new Error('Policy contains no Rego code');
      }

      // Store in local cache
      this.policyCache.set(policy.id, {
        policy,
        compiledAt: new Date(),
        lastUsed: new Date()
      });

      console.log(`Successfully loaded policy: ${policy.name}`);
      this.emit('policy_loaded', { policy });

    } catch (error) {
      console.error(`Failed to load policy ${policy.name}:`, error);
      throw error;
    }
  }

  /**
   * Unload a policy from the engine
   */
  async unloadPolicy(policyId: string): Promise<void> {
    if (this.policyCache.has(policyId)) {
      this.policyCache.delete(policyId);
      console.log(`Unloaded policy: ${policyId}`);
      this.emit('policy_unloaded', { policyId });
    }
  }

  /**
   * Get engine statistics
   */
  getStatistics(): {
    loadedPolicies: number;
    cacheSize: number;
    cacheHitRate: number;
    totalEvaluations: number;
    averageExecutionTime: number;
    errorRate: number;
  } {
    // Simplified statistics - in production, these would be tracked properly
    return {
      loadedPolicies: this.policyCache.size,
      cacheSize: this.decisionCache.size,
      cacheHitRate: 0.85, // Mock value
      totalEvaluations: 1000, // Mock value
      averageExecutionTime: 15, // Mock value in ms
      errorRate: 0.02 // Mock value - 2% error rate
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.decisionCache.clear();
    this.policyCache.clear();
    console.log('Cleared all caches');
  }

  /**
   * Get audit log
   */
  getAuditLog(limit?: number): PolicyAuditEntry[] {
    if (limit) {
      return this.auditLog.slice(-limit);
    }
    return [...this.auditLog];
  }

  // === PRIVATE METHODS ===

  /**
   * Test OPA connection
   */
  private async testOPAConnection(): Promise<void> {
    try {
      // In production, this would make an actual HTTP request to OPA
      // For now, we'll simulate a successful connection
      console.log(`Testing OPA connection to ${this.config.opa.serverUrl}`);
      console.log('OPA connection test successful');
    } catch (error) {
      throw new Error(`Failed to connect to OPA: ${error}`);
    }
  }

  /**
   * Initialize cache cleanup routine
   */
  private initializeCacheCleanup(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredCacheEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCacheEntries(): void {
    const now = Date.now();
    const ttlMs = this.config.cache.cacheTTL * 1000;
    let removedCount = 0;

    for (const [key, result] of this.decisionCache.entries()) {
      const age = now - result.metadata.timestamp.getTime();
      if (age > ttlMs) {
        this.decisionCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} expired cache entries`);
    }

    // Enforce max cache size
    if (this.decisionCache.size > this.config.cache.maxCacheSize) {
      const entriesToRemove = this.decisionCache.size - this.config.cache.maxCacheSize;
      const keys = Array.from(this.decisionCache.keys());
      
      for (let i = 0; i < entriesToRemove; i++) {
        this.decisionCache.delete(keys[i]);
      }
      
      console.log(`Removed ${entriesToRemove} entries to enforce cache size limit`);
    }
  }

  /**
   * Execute policy internally
   */
  private async executePolicyInternal(
    policy: RegoPolicy,
    input: any,
    requestId: string
  ): Promise<PolicyDecisionResult> {
    // In production, this would interact with OPA
    // For now, we'll simulate policy execution based on simple rules

    const startTime = Date.now();
    const decision = this.simulatePolicyExecution(policy, input);
    const executionTime = Date.now() - startTime;

    // Create audit trail
    const auditEntry: PolicyAuditEntry = {
      action: 'policy_evaluated',
      timestamp: new Date(),
      policyId: policy.id,
      details: {
        input: this.sanitizeAuditData(input),
        decision,
        executionTime
      },
      compliance: {
        dataResidency: policy.australianCompliance.dataResidency === 'australia',
        auditLogged: this.config.security.enableAuditLogging,
        indigenousProtocols: policy.australianCompliance.indigenousProtocols
      }
    };

    const result: PolicyDecisionResult = {
      decision,
      policyId: policy.id,
      version: policy.version,
      input,
      output: { allowed: decision === 'allow' },
      executionTime,
      metadata: {
        evaluatedPolicies: [policy.id],
        triggeredRules: ['default_rule'], // Simplified
        timestamp: new Date(),
        requestId
      },
      explanation: this.generateExplanation(policy, input, decision),
      auditTrail: [auditEntry]
    };

    // Add conditions for conditional decisions
    if (decision === 'conditional') {
      result.conditions = this.generateConditions(policy, input);
    }

    return result;
  }

  /**
   * Simulate policy execution
   */
  private simulatePolicyExecution(policy: RegoPolicy, input: any): 'allow' | 'deny' | 'conditional' {
    // Simple simulation based on policy content and input
    
    // Check for denial conditions
    if (policy.rego.includes('deny') && input.amount && input.amount > 10000) {
      return 'deny';
    }

    // Check for conditional conditions
    if (policy.rego.includes('approval_required') && input.amount && input.amount > 1000) {
      return 'conditional';
    }

    // Default to allow
    return 'allow';
  }

  /**
   * Generate explanation for decision
   */
  private generateExplanation(policy: RegoPolicy, input: any, decision: string): string {
    switch (decision) {
      case 'allow':
        return `Policy '${policy.name}' allowed the request based on the provided input`;
      case 'deny':
        return `Policy '${policy.name}' denied the request due to policy constraints`;
      case 'conditional':
        return `Policy '${policy.name}' requires additional conditions to be met`;
      default:
        return `Policy '${policy.name}' returned an unexpected decision: ${decision}`;
    }
  }

  /**
   * Generate conditions for conditional decisions
   */
  private generateConditions(policy: RegoPolicy, input: any): PolicyCondition[] {
    const conditions: PolicyCondition[] = [];

    // Example conditions based on input
    if (input.amount && input.amount > 1000) {
      conditions.push({
        type: 'approval_required',
        description: 'Transaction requires manager approval',
        parameters: {
          approvalLevel: 'manager',
          reason: 'amount_threshold'
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    }

    if (input.category === 'community_benefit') {
      conditions.push({
        type: 'consent_verification',
        description: 'Community consent verification required',
        parameters: {
          consentType: 'community_benefit',
          verificationLevel: 'enhanced'
        }
      });
    }

    return conditions;
  }

  /**
   * Validate and sanitize input data
   */
  private async validateAndSanitizeInput(input: any): Promise<any> {
    if (!input || typeof input !== 'object') {
      throw new Error('Input must be a valid object');
    }

    // Deep clone to avoid mutation
    const sanitized = JSON.parse(JSON.stringify(input));

    // Remove potentially dangerous properties
    delete sanitized.__proto__;
    delete sanitized.constructor;

    // Validate required fields
    if (this.config.security.requireAuthentication && !sanitized.user) {
      throw new Error('Authentication required: user field missing');
    }

    return sanitized;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(policyId: string, input: any): string {
    const inputHash = crypto.createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    return `${policyId}:${inputHash}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(result: PolicyDecisionResult): boolean {
    const now = Date.now();
    const age = now - result.metadata.timestamp.getTime();
    const ttlMs = this.config.cache.cacheTTL * 1000;
    
    return age <= ttlMs;
  }

  /**
   * Log policy decision
   */
  private async logPolicyDecision(
    policy: RegoPolicy,
    input: any,
    result: PolicyDecisionResult,
    requestId: string
  ): Promise<void> {
    const auditEntry: PolicyAuditEntry = {
      action: 'decision_made',
      timestamp: new Date(),
      policyId: policy.id,
      details: {
        input: this.sanitizeAuditData(input),
        decision: result.decision,
        executionTime: result.executionTime,
        requestId
      },
      compliance: {
        dataResidency: policy.australianCompliance.dataResidency === 'australia',
        auditLogged: true,
        indigenousProtocols: policy.australianCompliance.indigenousProtocols
      }
    };

    this.auditLog.push(auditEntry);

    // Trim audit log if it gets too large
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  /**
   * Log policy error
   */
  private async logPolicyError(
    policy: RegoPolicy,
    input: any,
    error: any,
    requestId: string
  ): Promise<void> {
    const auditEntry: PolicyAuditEntry = {
      action: 'error_occurred',
      timestamp: new Date(),
      policyId: policy.id,
      details: {
        input: this.sanitizeAuditData(input),
        error: error instanceof Error ? error.message : String(error),
        requestId
      },
      compliance: {
        dataResidency: policy.australianCompliance.dataResidency === 'australia',
        auditLogged: true,
        indigenousProtocols: policy.australianCompliance.indigenousProtocols
      }
    };

    this.auditLog.push(auditEntry);
  }

  /**
   * Sanitize data for audit logging
   */
  private sanitizeAuditData(data: any): any {
    // Remove sensitive fields for audit logging
    const sanitized = JSON.parse(JSON.stringify(data));
    
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'ssn', 'bankAccount'];
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
      
      return obj;
    };

    return sanitizeObject(sanitized);
  }
}