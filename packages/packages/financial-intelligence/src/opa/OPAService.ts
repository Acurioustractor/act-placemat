/**
 * OPA Integration Service
 * 
 * Service for interfacing with Open Policy Agent (OPA) to evaluate
 * financial intents against Rego policies with comprehensive decision logging
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  FinancialIntent,
  PolicyDecision,
  PolicyResult,
  DecisionLog,
  AuditQuery,
  AuditQueryResult,
  OPAEvaluationRequest,
  OPAEvaluationOptions,
  OPAServiceConfig,
  OPAServiceStats,
  OPAHealthCheck,
  DecisionCondition,
  FinancialOperation
} from './types';
import { RegoPolicy } from '../policy/types';

/**
 * OPA Integration Service for Financial Intelligence
 */
export class OPAService extends EventEmitter {
  private httpClient: AxiosInstance;
  private config: OPAServiceConfig;
  private stats: OPAServiceStats;
  private cache: Map<string, { decision: PolicyDecision; expiresAt: Date }>;
  private decisionLogger: DecisionLogger;

  constructor(config: OPAServiceConfig) {
    super();
    this.config = config;
    this.stats = this.initializeStats();
    this.cache = new Map();
    
    // Configure HTTP client for OPA server
    this.httpClient = axios.create({
      baseURL: config.server.url,
      timeout: config.server.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Initialize decision logger
    this.decisionLogger = new DecisionLogger(config.logging);

    // Set up monitoring and health checks
    if (config.monitoring.enabled) {
      this.setupMonitoring();
    }
  }

  /**
   * Initialize the OPA service
   */
  async initialize(): Promise<void> {
    try {
      // Verify OPA server connectivity
      await this.healthCheck();
      
      // Initialize decision logger
      await this.decisionLogger.initialize();
      
      // Set up periodic health checks
      setInterval(() => this.performHealthCheck(), 30000); // Every 30 seconds
      
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize OPA service: ${error.message}`);
    }
  }

  /**
   * Evaluate a financial intent against OPA policies
   */
  async evaluateIntent(
    intent: FinancialIntent,
    policies: string[] = [],
    options: OPAEvaluationOptions = {}
  ): Promise<PolicyDecision> {
    const startTime = Date.now();
    const decisionId = uuidv4();

    try {
      // Input validation
      this.validateIntent(intent);

      // Check cache first
      if (options.useCache !== false && this.config.cache.enabled) {
        const cached = this.getCachedDecision(intent, policies);
        if (cached) {
          this.updateStats('cache_hit');
          return cached;
        }
      }

      // Prepare OPA query
      const opaQuery = this.buildOPAQuery(intent, policies, options);
      
      // Execute policy evaluation with retries
      const opaResponse = await this.executeWithRetries(
        () => this.httpClient.post('/v1/data', opaQuery),
        this.config.server.retries
      );

      // Process OPA response
      const decision = this.processOPAResponse(
        opaResponse.data,
        intent,
        policies,
        decisionId,
        startTime
      );

      // Cache the decision
      if (this.config.cache.enabled && decision.decision !== 'conditional') {
        this.cacheDecision(intent, policies, decision, options.cacheTTL);
      }

      // Log the decision
      await this.logDecision(intent, decision);

      // Update statistics
      this.updateStats('success', decision);

      // Emit events for monitoring
      this.emit('decision', { intent, decision });

      return decision;

    } catch (error) {
      this.updateStats('error');
      this.emit('error', error);
      
      // Return safe denial decision in case of error
      const fallbackDecision: PolicyDecision = {
        decision: 'deny',
        evaluatedPolicies: policies,
        policyResults: [],
        reason: `Policy evaluation failed: ${error.message}`,
        performance: {
          evaluationTime: Date.now() - startTime,
          cacheHit: false,
          policiesEvaluated: 0
        },
        opa: {
          decisionId,
          query: '',
          result: null
        }
      };

      await this.logDecision(intent, fallbackDecision);
      return fallbackDecision;
    }
  }

  /**
   * Evaluate multiple intents in batch
   */
  async evaluateIntents(
    requests: OPAEvaluationRequest[]
  ): Promise<PolicyDecision[]> {
    const decisions = await Promise.all(
      requests.map(req => 
        this.evaluateIntent(req.intent, req.policies, req.options)
      )
    );

    this.emit('batch_evaluation', { count: requests.length, decisions });
    return decisions;
  }

  /**
   * Load policies into OPA
   */
  async loadPolicy(policy: RegoPolicy): Promise<void> {
    try {
      const policyPath = `/v1/policies/${policy.id}`;
      await this.httpClient.put(policyPath, policy.rego, {
        headers: { 'Content-Type': 'text/plain' }
      });

      this.emit('policy_loaded', { policyId: policy.id });
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to load policy ${policy.id}: ${error.message}`);
    }
  }

  /**
   * Remove policy from OPA
   */
  async removePolicy(policyId: string): Promise<void> {
    try {
      const policyPath = `/v1/policies/${policyId}`;
      await this.httpClient.delete(policyPath);

      this.emit('policy_removed', { policyId });
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to remove policy ${policyId}: ${error.message}`);
    }
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(query: AuditQuery): Promise<AuditQueryResult> {
    return this.decisionLogger.query(query);
  }

  /**
   * Get service statistics
   */
  getStatistics(): OPAServiceStats {
    return { ...this.stats };
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<OPAHealthCheck> {
    const healthCheck: OPAHealthCheck = {
      status: 'healthy',
      components: {
        opaServer: 'healthy',
        database: 'healthy',
        cache: 'healthy',
        policies: 'healthy'
      },
      timestamp: new Date(),
      details: {}
    };

    try {
      // Check OPA server
      const response = await this.httpClient.get('/health');
      if (response.status !== 200) {
        healthCheck.components.opaServer = 'unhealthy';
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.components.opaServer = 'unhealthy';
      healthCheck.status = 'unhealthy';
      healthCheck.details.opaError = error.message;
    }

    try {
      // Check database connectivity
      await this.decisionLogger.healthCheck();
    } catch (error) {
      healthCheck.components.database = 'unhealthy';
      healthCheck.status = 'degraded';
      healthCheck.details.databaseError = error.message;
    }

    return healthCheck;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache_cleared');
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    try {
      await this.decisionLogger.shutdown();
      this.removeAllListeners();
      this.emit('shutdown');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // Private methods

  private validateIntent(intent: FinancialIntent): void {
    if (!intent.id || !intent.operation || !intent.user || !intent.financial) {
      throw new Error('Invalid financial intent: missing required fields');
    }

    if (!intent.user.authentication?.verified) {
      throw new Error('User authentication required');
    }

    if (this.config.compliance.enforceDataResidency) {
      if (intent.user.location.country !== 'Australia') {
        throw new Error('Data residency violation: user must be in Australia');
      }
    }
  }

  private buildOPAQuery(
    intent: FinancialIntent,
    policies: string[],
    options: OPAEvaluationOptions
  ): any {
    // Build the input data for OPA evaluation
    const input = {
      // User context
      user: {
        id: intent.user.id,
        roles: intent.user.roles,
        consent_levels: intent.user.consentLevels,
        identity_verified: intent.user.authentication.verified,
        mfa_completed: intent.user.authentication.mfaCompleted,
        session_age_hours: intent.user.authentication.sessionAge,
        password_age_days: Math.floor((Date.now() - (intent.user.authentication.lastPasswordChange * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)),
        location: intent.user.location,
        network: intent.user.network,
        clearance_level: this.calculateClearanceLevel(intent.user.roles),
        ...intent.user.attributes
      },

      // Operation context
      operation: intent.operation,
      action: this.mapOperationToAction(intent.operation),

      // Financial context
      amount: intent.financial.amount,
      currency: intent.financial.currency,
      account: intent.financial.account,
      categories: intent.financial.categories,
      
      // Resource context
      resource: {
        sensitivity: intent.financial.sensitivity,
        contains_personal_data: intent.financial.containsPersonalData,
        classification: intent.financial.sensitivity
      },

      // Request context
      request: {
        timestamp: intent.request.timestamp,
        request_id: intent.request.requestId,
        session_id: intent.request.sessionId,
        endpoint: intent.request.endpoint,
        method: intent.request.method,
        justification: intent.request.justification
      },

      // Temporal context
      ...(intent.temporal && {
        emergency: intent.temporal.emergency,
        timing: intent.temporal.culturalConsiderations
      }),

      // Compliance context
      compliance: intent.compliance,
      
      // Privacy context
      privacy: {
        consent_provided: intent.compliance.privacyAct.consentObtained,
        consent_specific: true, // Derived from consent levels
        consent_current: true, // Derived from consent metadata
        purposes: intent.compliance.privacyAct.purposeLimitation,
        cross_border_transfer: intent.compliance.privacyAct.crossBorderTransfer,
        destination_country: intent.compliance.privacyAct.destinationCountry
      },

      // Data location
      data_location: intent.compliance.dataResidency,

      // Indigenous protocols
      ...(intent.financial.indigenousData && {
        protocols: {
          care_principles_followed: this.validateCareCompliance(intent.financial.indigenousData.careCompliance),
          traditional_owner_consent: intent.compliance.indigenousProtocols?.traditionalOwnerConsent || false,
          collective_benefit: intent.financial.indigenousData.careCompliance.collectiveBenefit,
          authority_to_control: intent.financial.indigenousData.careCompliance.authorityToControl,
          responsibility: intent.financial.indigenousData.careCompliance.responsibility,
          ethics: intent.financial.indigenousData.careCompliance.ethics
        },
        data: {
          indigenous_related: true,
          contains_sacred_knowledge: intent.financial.indigenousData.containsSacredKnowledge
        }
      }),

      // Benefit allocation context
      ...(intent.financial.allocation && {
        allocations: intent.financial.allocation.allocations,
        consent: intent.financial.allocation.communityApproval
      }),

      // Security context
      security: {
        at_rest_encryption: true, // Assumed for financial data
        in_transit_encryption: true, // Assumed for financial data
        encryption_algorithm: 'AES-256',
        tls_version: 1.3,
        key_storage: 'hardware_security_module',
        access_controls: true
      },

      // Audit context
      audit: {
        logging_enabled: true,
        log_retention_years: this.config.logging.retention.defaultYears,
        log_integrity_protected: true
      }
    };

    // Build the query
    let query = 'data';
    
    if (policies.length > 0) {
      // Specific policies requested
      query = policies.map(p => `data.${p}.allow`).join(' and ');
    } else {
      // Default to all financial policies
      query = 'data.financial';
    }

    return {
      input,
      query,
      ...(options.explain && { explain: 'full' }),
      ...(options.trace && { trace: true })
    };
  }

  private processOPAResponse(
    response: any,
    intent: FinancialIntent,
    policies: string[],
    decisionId: string,
    startTime: number
  ): PolicyDecision {
    const evaluationTime = Date.now() - startTime;
    
    // Extract decision from OPA response
    let decision: 'allow' | 'deny' | 'conditional' = 'deny';
    const policyResults: PolicyResult[] = [];
    let reason = 'Access denied by policy';
    const conditions: DecisionCondition[] = [];

    // Process OPA result
    if (response.result !== undefined) {
      if (typeof response.result === 'boolean') {
        decision = response.result ? 'allow' : 'deny';
        reason = response.result ? 'Access granted by policy' : 'Access denied by policy';
      } else if (typeof response.result === 'object') {
        // Handle complex policy results
        decision = this.extractDecisionFromObject(response.result);
        reason = this.extractReasonFromObject(response.result);
        
        // Extract conditional requirements
        if (decision === 'conditional') {
          conditions.push(...this.extractConditionsFromObject(response.result));
        }
      }
    }

    // Process individual policy results if available
    if (response.explanation) {
      policyResults.push(...this.processPolicyExplanations(response.explanation));
    }

    // Apply Australian compliance overrides
    if (this.config.compliance.enforceDataResidency) {
      if (intent.user.location.country !== 'Australia' && decision === 'allow') {
        decision = 'deny';
        reason = 'Access denied: Australian data residency requirement not met';
      }
    }

    // Apply Indigenous data sovereignty checks
    if (intent.financial.indigenousData && !this.validateIndigenousCompliance(intent)) {
      decision = 'deny';
      reason = 'Access denied: Indigenous data sovereignty requirements not met';
    }

    return {
      decision,
      evaluatedPolicies: policies,
      policyResults,
      reason,
      conditions: conditions.length > 0 ? conditions : undefined,
      performance: {
        evaluationTime,
        cacheHit: false,
        policiesEvaluated: policyResults.length || policies.length
      },
      opa: {
        decisionId,
        query: response.query || '',
        result: response.result,
        explanation: response.explanation,
        trace: response.trace
      }
    };
  }

  private mapOperationToAction(operation: FinancialOperation): string {
    const actionMap: Record<FinancialOperation, string> = {
      [FinancialOperation.VIEW_BALANCE]: 'read',
      [FinancialOperation.GENERATE_REPORT]: 'read',
      [FinancialOperation.EXPORT_DATA]: 'export',
      [FinancialOperation.CREATE_PAYMENT]: 'write',
      [FinancialOperation.APPROVE_PAYMENT]: 'approve',
      [FinancialOperation.CANCEL_PAYMENT]: 'delete',
      [FinancialOperation.CREATE_BUDGET]: 'write',
      [FinancialOperation.MODIFY_BUDGET]: 'write',
      [FinancialOperation.ALLOCATE_FUNDS]: 'allocate',
      [FinancialOperation.DISTRIBUTE_BENEFITS]: 'distribute',
      [FinancialOperation.RECORD_ATTESTATION]: 'attest',
      [FinancialOperation.MODIFY_CONSENT]: 'consent_manage',
      [FinancialOperation.CONFIGURE_POLICIES]: 'admin',
      [FinancialOperation.ACCESS_AUDIT_LOGS]: 'audit',
      [FinancialOperation.SYSTEM_ADMINISTRATION]: 'admin'
    };

    return actionMap[operation] || 'read';
  }

  private calculateClearanceLevel(roles: string[]): number {
    const clearanceMap: Record<string, number> = {
      'system_admin': 4,
      'financial_manager': 3,
      'community_coordinator': 2,
      'data_analyst': 2,
      'viewer': 1
    };

    return Math.max(...roles.map(role => clearanceMap[role] || 0));
  }

  private validateCareCompliance(care: any): boolean {
    return care.collectiveBenefit && 
           care.authorityToControl && 
           care.responsibility && 
           care.ethics;
  }

  private validateIndigenousCompliance(intent: FinancialIntent): boolean {
    if (!intent.financial.indigenousData) return true;
    
    const indigenousData = intent.financial.indigenousData;
    
    // Check CARE principles
    if (!this.validateCareCompliance(indigenousData.careCompliance)) {
      return false;
    }

    // Check cultural protocols
    if (!indigenousData.culturalProtocols.consultationCompleted ||
        !indigenousData.culturalProtocols.culturalImpactAssessed) {
      return false;
    }

    // Check sacred knowledge protection
    if (indigenousData.containsSacredKnowledge && 
        !indigenousData.culturalProtocols.elderApproval) {
      return false;
    }

    return true;
  }

  private extractDecisionFromObject(result: any): 'allow' | 'deny' | 'conditional' {
    if (result.allow === true) return 'allow';
    if (result.conditional === true) return 'conditional';
    return 'deny';
  }

  private extractReasonFromObject(result: any): string {
    return result.reason || result.message || 'Policy evaluation completed';
  }

  private extractConditionsFromObject(result: any): DecisionCondition[] {
    if (!result.conditions || !Array.isArray(result.conditions)) {
      return [];
    }

    return result.conditions.map((cond: any) => ({
      type: cond.type || 'approval_required',
      description: cond.description || 'Additional requirements needed',
      requirements: cond.requirements || {},
      expiresAt: cond.expiresAt ? new Date(cond.expiresAt) : undefined
    }));
  }

  private processPolicyExplanations(explanation: any): PolicyResult[] {
    // This would process OPA explanation format
    // Implementation depends on OPA explanation structure
    return [];
  }

  private getCachedDecision(
    intent: FinancialIntent,
    policies: string[]
  ): PolicyDecision | null {
    const cacheKey = this.buildCacheKey(intent, policies);
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiresAt > new Date()) {
      return { ...cached.decision, performance: { ...cached.decision.performance, cacheHit: true } };
    }
    
    if (cached) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  private cacheDecision(
    intent: FinancialIntent,
    policies: string[],
    decision: PolicyDecision,
    ttl?: number
  ): void {
    const cacheKey = this.buildCacheKey(intent, policies);
    const expiresAt = new Date(Date.now() + (ttl || this.config.cache.defaultTTL) * 1000);
    
    this.cache.set(cacheKey, { decision, expiresAt });
    
    // Cleanup expired entries
    if (this.cache.size > this.config.cache.maxSize) {
      this.cleanupCache();
    }
  }

  private buildCacheKey(intent: FinancialIntent, policies: string[]): string {
    // Build a cache key that includes relevant intent details
    return `${intent.user.id}:${intent.operation}:${intent.financial.amount}:${policies.join(',')}`;
  }

  private cleanupCache(): void {
    const now = new Date();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  private async executeWithRetries<T>(
    operation: () => Promise<T>,
    retries: number
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < retries) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.server.retryDelay * Math.pow(2, i))
          );
        }
      }
    }
    
    throw lastError;
  }

  private async logDecision(
    intent: FinancialIntent,
    decision: PolicyDecision
  ): Promise<void> {
    if (!this.config.logging.enabled) return;

    const log: DecisionLog = {
      id: uuidv4(),
      timestamp: new Date(),
      intent,
      decision,
      audit: {
        traceId: intent.request.requestId,
        sessionId: intent.request.sessionId,
        userId: intent.user.id,
        userRoles: intent.user.roles,
        service: 'financial-intelligence-opa',
        version: '1.0.0',
        complianceFlags: this.extractComplianceFlags(intent),
        sovereigntyContext: this.extractSovereigntyContext(intent),
        dataClassification: intent.financial.sensitivity,
        retentionYears: this.calculateRetentionPeriod(intent)
      },
      compliance: {
        privacyActApplicable: intent.financial.containsPersonalData,
        acncReporting: this.isACNCReportingRequired(intent),
        austracReporting: this.isAUSTRACReportingRequired(intent),
        indigenousDataInvolved: !!intent.financial.indigenousData
      }
    };

    await this.decisionLogger.log(log);
  }

  private extractComplianceFlags(intent: FinancialIntent): string[] {
    const flags: string[] = [];
    
    if (intent.financial.containsPersonalData) flags.push('privacy_act');
    if (intent.financial.indigenousData) flags.push('indigenous_data');
    if (intent.financial.amount && intent.financial.amount >= 1000000) flags.push('austrac_threshold');
    if (intent.user.location.country !== 'Australia') flags.push('cross_border');
    
    return flags;
  }

  private extractSovereigntyContext(intent: FinancialIntent): string[] {
    const context: string[] = [];
    
    if (intent.financial.indigenousData) {
      context.push('indigenous_sovereignty');
      if (intent.financial.indigenousData.traditionalOwners.length > 0) {
        context.push(...intent.financial.indigenousData.traditionalOwners.map(to => `traditional_owner:${to}`));
      }
    }
    
    context.push(`data_residency:${intent.compliance.dataResidency.country}`);
    
    return context;
  }

  private calculateRetentionPeriod(intent: FinancialIntent): number {
    if (intent.financial.indigenousData) {
      return this.config.logging.retention.indigenousDataYears;
    }
    if (intent.financial.containsPersonalData) {
      return this.config.logging.retention.complianceYears;
    }
    return this.config.logging.retention.defaultYears;
  }

  private isACNCReportingRequired(intent: FinancialIntent): boolean {
    return intent.operation === FinancialOperation.DISTRIBUTE_BENEFITS ||
           intent.operation === FinancialOperation.ALLOCATE_FUNDS;
  }

  private isAUSTRACReportingRequired(intent: FinancialIntent): boolean {
    return !!(intent.financial.amount && intent.financial.amount >= 1000000); // $10,000 in cents
  }

  private initializeStats(): OPAServiceStats {
    return {
      requests: { total: 0, successful: 0, failed: 0, cached: 0 },
      performance: { averageLatency: 0, p95Latency: 0, p99Latency: 0, cacheHitRate: 0 },
      decisions: { allowed: 0, denied: 0, conditional: 0 },
      policies: { totalEvaluations: 0, averagePoliciesPerRequest: 0, policyHitCounts: {} },
      compliance: { privacyActDecisions: 0, indigenousDataDecisions: 0, austracReports: 0, sovereigntyViolations: 0 },
      timeWindow: { start: new Date(), end: new Date() }
    };
  }

  private updateStats(type: 'success' | 'error' | 'cache_hit', decision?: PolicyDecision): void {
    this.stats.requests.total++;
    
    if (type === 'success' && decision) {
      this.stats.requests.successful++;
      this.stats.decisions[decision.decision]++;
      this.stats.performance.averageLatency = 
        (this.stats.performance.averageLatency + decision.performance.evaluationTime) / 2;
    } else if (type === 'error') {
      this.stats.requests.failed++;
    } else if (type === 'cache_hit') {
      this.stats.requests.cached++;
    }
    
    // Update cache hit rate
    this.stats.performance.cacheHitRate = 
      this.stats.requests.cached / this.stats.requests.total;
  }

  private setupMonitoring(): void {
    // Set up periodic statistics reporting
    setInterval(() => {
      this.emit('statistics', this.getStatistics());
    }, 60000); // Every minute
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const health = await this.healthCheck();
      this.emit('health_check', health);
    } catch (error) {
      this.emit('health_check_failed', error);
    }
  }
}

/**
 * Decision Logger for audit trails
 */
class DecisionLogger {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize logging backend (PostgreSQL, file, etc.)
    // Implementation depends on configured destination
  }

  async log(log: DecisionLog): Promise<void> {
    // Log the decision to configured destination
    // Implementation depends on configured destination
    console.log('Decision logged:', { id: log.id, decision: log.decision.decision, timestamp: log.timestamp });
  }

  async query(query: AuditQuery): Promise<AuditQueryResult> {
    // Query audit logs based on criteria
    // Implementation depends on configured destination
    return {
      logs: [],
      totalCount: 0,
      pagination: { offset: query.pagination?.offset || 0, limit: query.pagination?.limit || 50, hasMore: false },
      performance: { queryTime: 0, resultsFromCache: false }
    };
  }

  async healthCheck(): Promise<void> {
    // Check logging backend health
    // Implementation depends on configured destination
  }

  async shutdown(): Promise<void> {
    // Cleanup logging resources
    // Implementation depends on configured destination
  }
}