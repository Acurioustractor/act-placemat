/**
 * Policy Middleware
 * 
 * Main middleware implementation for intent-policy evaluation
 * supporting Express, NestJS, and other Node.js frameworks
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { 
  PolicyEvaluatedRequest,
  MiddlewareConfig,
  PolicyEvaluation,
  MiddlewareError,
  MiddlewareErrorType,
  MiddlewareResponse,
  ExpressMiddleware,
  PolicyCacheEntry,
  MiddlewareMetrics,
  DataTransformation
} from './types';
import { IntentExtractor } from './IntentExtractor';
import { OPAService } from '../opa/OPAService';
import { FinancialIntent, PolicyDecision } from '../types/financial';
import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Policy evaluation middleware
 */
export class PolicyMiddleware extends EventEmitter {
  private config: MiddlewareConfig;
  private intentExtractor: IntentExtractor;
  private opaService: OPAService;
  private cache: Map<string, PolicyCacheEntry>;
  private metrics: MiddlewareMetrics;
  private performanceHistory: number[];

  constructor(config: MiddlewareConfig) {
    super();
    this.config = config;
    this.intentExtractor = new IntentExtractor(config.intentExtraction);
    this.opaService = new OPAService({
      url: config.opa.url,
      timeout: config.opa.timeout,
      retries: config.opa.retries
    });
    
    this.cache = new Map();
    this.metrics = this.initializeMetrics();
    this.performanceHistory = [];
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the middleware
   */
  async initialize(): Promise<void> {
    try {
      await this.opaService.initialize();
      this.emit('middleware:initialized');
    } catch (error) {
      this.emit('middleware:error', error);
      throw error;
    }
  }

  /**
   * Create Express middleware function
   */
  createExpressMiddleware(): ExpressMiddleware {
    return async (req: PolicyEvaluatedRequest, res: Response, next: NextFunction) => {
      const requestId = uuidv4();
      req.auditTrailId = requestId;
      
      try {
        const startTime = Date.now();
        this.emit('request:received', {
          requestId,
          method: req.method,
          path: req.path,
          userId: req.get('X-User-ID')
        });

        // Skip evaluation in development mode if configured
        if (this.config.development.skipEvaluation) {
          return next();
        }

        // Extract intent from request
        const intent = await this.intentExtractor.extractIntent(req);
        req.userIntent = intent;

        // Evaluate intent against policies
        const evaluation = await this.evaluateIntent(intent, requestId);
        req.policyEvaluation = evaluation;

        // Handle evaluation result
        const response = await this.handleEvaluationResult(evaluation, req, res);
        
        if (response.allowed) {
          // Apply any required transformations
          if (evaluation.transformations && evaluation.transformations.length > 0) {
            await this.applyTransformations(req, evaluation.transformations);
          }
          
          // Update metrics and continue
          this.updateMetrics(startTime, true, evaluation.fromCache);
          next();
        } else {
          // Request denied - send error response
          this.updateMetrics(startTime, false, evaluation.fromCache);
          this.sendDenialResponse(res, response);
        }

      } catch (error) {
        this.updateMetrics(Date.now(), false, false);
        this.handleMiddlewareError(error, req, res, next);
      }
    };
  }

  /**
   * Evaluate intent against policies
   */
  private async evaluateIntent(intent: FinancialIntent, requestId: string): Promise<PolicyEvaluation> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.config.caching.enabled) {
        const cached = await this.getCachedDecision(intent);
        if (cached) {
          const evaluationTime = Date.now() - startTime;
          this.emit('policy:evaluated', {
            requestId,
            decision: cached.decision,
            evaluationTime,
            fromCache: true
          });
          
          return {
            allowed: cached.decision.allow,
            decision: cached.decision,
            transformations: this.extractTransformations(cached.decision),
            consentRequired: this.extractConsentRequirements(cached.decision),
            auditRequirements: this.extractAuditRequirements(cached.decision),
            evaluationTime,
            fromCache: true
          };
        }
      }

      // Evaluate with OPA
      const decision = await this.opaService.evaluateIntent(
        intent,
        this.config.opa.defaultPolicies,
        {
          timeout: this.config.opa.timeout,
          includeInput: true,
          includeResult: true
        }
      );

      // Cache the decision
      if (this.config.caching.enabled && decision.allow) {
        await this.cacheDecision(intent, decision);
      }

      const evaluationTime = Date.now() - startTime;
      this.emit('policy:evaluated', {
        requestId,
        decision,
        evaluationTime,
        fromCache: false
      });

      return {
        allowed: decision.allow,
        decision,
        transformations: this.extractTransformations(decision),
        consentRequired: this.extractConsentRequirements(decision),
        auditRequirements: this.extractAuditRequirements(decision),
        evaluationTime,
        fromCache: false
      };

    } catch (error) {
      const evaluationTime = Date.now() - startTime;
      
      this.emit('policy:evaluation_failed', {
        requestId,
        error,
        evaluationTime
      });

      throw new MiddlewareError(
        MiddlewareErrorType.POLICY_EVALUATION_FAILED,
        `Policy evaluation failed: ${error.message}`,
        { originalError: error, intent },
        true
      );
    }
  }

  /**
   * Handle evaluation result
   */
  private async handleEvaluationResult(
    evaluation: PolicyEvaluation,
    req: PolicyEvaluatedRequest,
    res: Response
  ): Promise<MiddlewareResponse> {
    if (evaluation.allowed) {
      // Request is allowed
      this.emit('request:allowed', {
        requestId: req.auditTrailId!,
        transformations: evaluation.transformations || []
      });

      return {
        allowed: true,
        statusCode: 200
      };
    } else {
      // Request is denied
      const reason = this.extractDenialReason(evaluation.decision);
      const suggestions = this.extractSuggestions(evaluation.decision);
      const requiredActions = this.extractRequiredActions(evaluation);

      this.emit('request:denied', {
        requestId: req.auditTrailId!,
        reason,
        suggestions
      });

      return {
        allowed: false,
        statusCode: evaluation.consentRequired && evaluation.consentRequired.length > 0 ? 403 : 401,
        reason,
        suggestions,
        requiredActions,
        body: {
          error: 'Policy Evaluation Failed',
          message: reason,
          suggestions,
          requiredActions,
          requestId: req.auditTrailId
        }
      };
    }
  }

  /**
   * Apply data transformations to request
   */
  private async applyTransformations(
    req: PolicyEvaluatedRequest,
    transformations: DataTransformation[]
  ): Promise<void> {
    req.originalBody = { ...req.body };
    req.transformedData = { ...req.body };

    for (const transformation of transformations) {
      try {
        await this.applyTransformation(req.transformedData, transformation);
      } catch (error) {
        throw new MiddlewareError(
          MiddlewareErrorType.TRANSFORMATION_FAILED,
          `Failed to apply transformation: ${transformation.type} on field ${transformation.field}`,
          { transformation, error },
          false
        );
      }
    }

    // Replace request body with transformed data
    req.body = req.transformedData;
  }

  /**
   * Apply single transformation
   */
  private async applyTransformation(data: any, transformation: DataTransformation): Promise<void> {
    const fieldPath = transformation.field.split('.');
    const fieldValue = this.getNestedValue(data, fieldPath);

    if (fieldValue === undefined) return;

    let transformedValue: any;

    switch (transformation.type) {
      case 'redact':
        transformedValue = '[REDACTED]';
        break;
      
      case 'mask':
        if (typeof fieldValue === 'string') {
          const visibleChars = Math.min(3, Math.floor(fieldValue.length * 0.2));
          transformedValue = fieldValue.substring(0, visibleChars) + 
                          '*'.repeat(fieldValue.length - visibleChars);
        } else {
          transformedValue = '[MASKED]';
        }
        break;
      
      case 'hash':
        transformedValue = crypto.createHash('sha256')
          .update(String(fieldValue))
          .digest('hex');
        break;
      
      case 'encrypt':
        // Simplified encryption - would use proper encryption in production
        transformedValue = Buffer.from(String(fieldValue)).toString('base64');
        break;
      
      case 'remove':
        this.deleteNestedValue(data, fieldPath);
        return;
      
      case 'replace':
        transformedValue = transformation.parameters?.replaceWith || '[REPLACED]';
        break;
      
      default:
        throw new Error(`Unknown transformation type: ${transformation.type}`);
    }

    this.setNestedValue(data, fieldPath, transformedValue);
  }

  /**
   * Send denial response
   */
  private sendDenialResponse(res: Response, response: MiddlewareResponse): void {
    // Set any additional headers
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
    }

    // Add debug headers in development
    if (this.config.development.debugHeaders) {
      res.set('X-Policy-Evaluation', 'denied');
      res.set('X-Policy-Reason', response.reason || 'unknown');
    }

    res.status(response.statusCode || 403).json(response.body);
  }

  /**
   * Handle middleware errors
   */
  private handleMiddlewareError(
    error: any,
    req: PolicyEvaluatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    const middlewareError = error instanceof MiddlewareError ? error : 
      new MiddlewareError(
        MiddlewareErrorType.CONFIGURATION_ERROR,
        error.message,
        { originalError: error },
        false
      );

    this.emit('error:occurred', {
      requestId: req.auditTrailId!,
      error: middlewareError,
      recoverable: middlewareError.retryable
    });

    // Handle based on configuration
    const shouldAllow = this.shouldAllowOnError(middlewareError);
    
    if (shouldAllow) {
      if (this.config.development.verboseLogging) {
        console.warn(`Policy middleware error (allowing): ${middlewareError.message}`);
      }
      next();
    } else {
      if (this.config.errorHandling.customErrorHandler) {
        const result = this.config.errorHandling.customErrorHandler(middlewareError, req);
        res.status(500).json(result);
      } else {
        res.status(500).json({
          error: 'Policy Evaluation Error',
          message: this.config.errorHandling.exposeDetails ? 
            middlewareError.message : 'Internal server error',
          requestId: req.auditTrailId
        });
      }
    }
  }

  /**
   * Determine if request should be allowed on error
   */
  private shouldAllowOnError(error: MiddlewareError): boolean {
    switch (error.type) {
      case MiddlewareErrorType.SERVICE_UNAVAILABLE:
        return this.config.errorHandling.onServiceUnavailable === 'allow';
      
      case MiddlewareErrorType.POLICY_EVALUATION_FAILED:
        return this.config.errorHandling.onEvaluationFailure === 'allow';
      
      case MiddlewareErrorType.TIMEOUT:
        return this.config.errorHandling.onEvaluationFailure === 'allow';
      
      default:
        return false;
    }
  }

  // Cache management methods

  private async getCachedDecision(intent: FinancialIntent): Promise<PolicyCacheEntry | null> {
    const key = this.generateCacheKey(intent);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache entry is expired
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // Update hit count
    cached.hitCount++;
    
    return cached;
  }

  private async cacheDecision(intent: FinancialIntent, decision: PolicyDecision): Promise<void> {
    if (this.cache.size >= this.config.caching.maxEntries) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = Math.floor(this.cache.size * 0.1); // Remove 10%
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    const key = this.generateCacheKey(intent);
    const now = Date.now();
    
    this.cache.set(key, {
      decision,
      timestamp: now,
      expiry: now + (this.config.caching.ttl * 1000),
      intentHash: this.hashIntent(intent),
      policyVersion: decision.metadata?.policyVersion || '1.0',
      hitCount: 0
    });
  }

  private generateCacheKey(intent: FinancialIntent): string {
    if (this.config.caching.keyStrategy === 'custom' && this.config.caching.customKeyGenerator) {
      return this.config.caching.customKeyGenerator(intent);
    }
    
    if (this.config.caching.keyStrategy === 'content_hash') {
      return this.hashIntent(intent);
    }
    
    // Simple key strategy
    return `${intent.user.id}:${intent.operation.type}:${intent.operation.category}`;
  }

  private hashIntent(intent: FinancialIntent): string {
    const normalized = {
      userId: intent.user.id,
      orgId: intent.user.organisationId,
      operation: intent.operation.type,
      category: intent.operation.category,
      amount: intent.financial?.amount,
      currency: intent.financial?.currency
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
  }

  // Data extraction helpers

  private extractTransformations(decision: PolicyDecision): DataTransformation[] {
    const transformations: DataTransformation[] = [];
    
    if (decision.transformations) {
      for (const [field, type] of Object.entries(decision.transformations)) {
        transformations.push({
          field,
          type: type as any,
          parameters: {},
          reason: 'Policy requirement'
        });
      }
    }
    
    return transformations;
  }

  private extractConsentRequirements(decision: PolicyDecision): any[] {
    return decision.consentRequired || [];
  }

  private extractAuditRequirements(decision: PolicyDecision): any[] {
    return decision.auditRequirements || [];
  }

  private extractDenialReason(decision: PolicyDecision): string {
    return decision.reason || 'Request denied by policy';
  }

  private extractSuggestions(decision: PolicyDecision): string[] {
    return decision.suggestions || ['Contact system administrator for assistance'];
  }

  private extractRequiredActions(evaluation: PolicyEvaluation): any[] {
    const actions: any[] = [];
    
    if (evaluation.consentRequired) {
      for (const consent of evaluation.consentRequired) {
        actions.push({
          type: 'consent',
          description: `${consent.type} consent required for ${consent.purpose}`,
          parameters: consent
        });
      }
    }
    
    return actions;
  }

  // Utility methods

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string[], value: any): void {
    const lastKey = path.pop()!;
    const target = path.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private deleteNestedValue(obj: any, path: string[]): void {
    const lastKey = path.pop()!;
    const target = path.reduce((current, key) => current?.[key], obj);
    if (target) delete target[lastKey];
  }

  // Metrics and monitoring

  private initializeMetrics(): MiddlewareMetrics {
    return {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      averageEvaluationTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      outcomeDistribution: {},
      performancePercentiles: {
        p50: 0,
        p95: 0,
        p99: 0
      }
    };
  }

  private updateMetrics(startTime: number, allowed: boolean, fromCache: boolean): void {
    const evaluationTime = Date.now() - startTime;
    
    this.metrics.totalRequests++;
    if (allowed) {
      this.metrics.allowedRequests++;
    } else {
      this.metrics.deniedRequests++;
    }
    
    // Update performance history
    this.performanceHistory.push(evaluationTime);
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }
    
    // Recalculate averages and percentiles
    this.recalculateMetrics();
    
    this.emit('metrics:updated', { metrics: this.metrics });
  }

  private recalculateMetrics(): void {
    if (this.performanceHistory.length === 0) return;
    
    // Calculate average
    const sum = this.performanceHistory.reduce((a, b) => a + b, 0);
    this.metrics.averageEvaluationTime = sum / this.performanceHistory.length;
    
    // Calculate percentiles
    const sorted = [...this.performanceHistory].sort((a, b) => a - b);
    const len = sorted.length;
    
    this.metrics.performancePercentiles = {
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
    
    // Calculate rates
    this.metrics.errorRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.totalRequests - this.metrics.allowedRequests - this.metrics.deniedRequests) / this.metrics.totalRequests : 0;
  }

  private setupEventHandlers(): void {
    this.intentExtractor.on('extraction:failed', (data) => {
      this.emit('extraction:failed', data);
    });
    
    this.opaService.on('evaluation:failed', (data) => {
      this.emit('evaluation:failed', data);
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): MiddlewareMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Shutdown middleware
   */
  async shutdown(): Promise<void> {
    this.clearCache();
    await this.opaService.shutdown();
    this.emit('middleware:shutdown');
  }
}