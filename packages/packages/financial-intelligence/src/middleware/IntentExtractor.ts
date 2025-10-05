/**
 * Intent Extractor
 * 
 * Service for extracting financial intent from HTTP requests
 * supporting various extraction strategies and Australian compliance context
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { 
  PolicyEvaluatedRequest,
  IntentExtractionConfig,
  IntentExtractionRule,
  MiddlewareError,
  MiddlewareErrorType,
  AustralianComplianceContext
} from './types';
import { 
  FinancialIntent, 
  FinancialOperation, 
  UserContext, 
  FinancialContext, 
  RequestContext,
  TemporalContext,
  ComplianceContext
} from '../types/financial';
import { v4 as uuidv4 } from 'uuid';

/**
 * Intent extraction service
 */
export class IntentExtractor extends EventEmitter {
  private config: IntentExtractionConfig;
  private extractionRules: Map<string, IntentExtractionRule>;

  constructor(config: IntentExtractionConfig) {
    super();
    this.config = config;
    this.extractionRules = new Map();
    
    // Initialize extraction rules
    this.initializeExtractionRules();
  }

  /**
   * Extract financial intent from HTTP request
   */
  async extractIntent(req: PolicyEvaluatedRequest): Promise<FinancialIntent> {
    const startTime = Date.now();
    const requestId = req.auditTrailId || uuidv4();

    try {
      this.emit('extraction:started', { requestId, method: req.method, path: req.path });

      // Extract base intent components
      const operation = await this.extractOperation(req);
      const userContext = await this.extractUserContext(req);
      const financialContext = await this.extractFinancialContext(req);
      const requestContext = await this.extractRequestContext(req);
      const temporalContext = await this.extractTemporalContext(req);
      const complianceContext = await this.extractComplianceContext(req);

      // Build financial intent
      const intent: FinancialIntent = {
        id: uuidv4(),
        operation,
        user: userContext,
        financial: financialContext,
        request: requestContext,
        temporal: temporalContext,
        compliance: complianceContext
      };

      // Apply custom extraction rules
      await this.applyCustomRules(intent, req);

      // Validate extracted intent
      await this.validateIntent(intent);

      const extractionTime = Date.now() - startTime;
      this.emit('extraction:completed', { requestId, intent, extractionTime });

      return intent;

    } catch (error) {
      const extractionTime = Date.now() - startTime;
      this.emit('extraction:failed', { requestId, error, extractionTime });
      
      throw new MiddlewareError(
        MiddlewareErrorType.INTENT_EXTRACTION_FAILED,
        `Failed to extract intent: ${error.message}`,
        { originalError: error },
        false
      );
    }
  }

  /**
   * Extract financial operation from request
   */
  private async extractOperation(req: PolicyEvaluatedRequest): Promise<FinancialOperation> {
    const method = req.method.toUpperCase();
    const path = req.path.toLowerCase();
    const body = req.body || {};

    // Determine operation type based on HTTP method and path
    let type: string = 'unknown';
    let subtype: string | undefined;
    let category: string = 'operational';

    // Standard REST API patterns
    if (method === 'GET' && path.includes('/transactions')) {
      type = 'read';
      subtype = 'transaction_query';
      category = 'reporting';
    } else if (method === 'POST' && path.includes('/transactions')) {
      type = 'create';
      subtype = 'transaction_create';
      category = 'operational';
    } else if (method === 'PUT' && path.includes('/transactions')) {
      type = 'update';
      subtype = 'transaction_update';
      category = 'operational';
    } else if (method === 'DELETE' && path.includes('/transactions')) {
      type = 'delete';
      subtype = 'transaction_delete';
      category = 'operational';
    } else if (path.includes('/budget')) {
      type = method === 'GET' ? 'read' : 'update';
      subtype = 'budget_management';
      category = 'planning';
    } else if (path.includes('/forecast')) {
      type = 'read';
      subtype = 'financial_forecast';
      category = 'analytics';
    } else if (path.includes('/report')) {
      type = 'generate';
      subtype = 'financial_report';
      category = 'reporting';
    } else if (path.includes('/allocation')) {
      type = method === 'GET' ? 'read' : 'update';
      subtype = 'benefit_allocation';
      category = 'distribution';
    } else if (path.includes('/consent')) {
      type = method === 'GET' ? 'read' : 'update';
      subtype = 'consent_management';
      category = 'governance';
    }

    // Extract operation details from request body
    const amount = this.extractAmount(body);
    const currency = body.currency || 'AUD';
    const description = body.description || `${type} operation`;

    return {
      type,
      subtype,
      category,
      amount,
      currency,
      description,
      metadata: {
        httpMethod: method,
        endpoint: path,
        timestamp: new Date(),
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type')
      }
    };
  }

  /**
   * Extract user context from request
   */
  private async extractUserContext(req: PolicyEvaluatedRequest): Promise<UserContext> {
    // Extract from JWT token, session, or headers
    const userId = this.extractUserId(req);
    const orgId = this.extractOrgId(req);
    const roles = this.extractRoles(req);
    const permissions = this.extractPermissions(req);

    return {
      id: userId || 'anonymous',
      organisationId: orgId,
      roles: roles || ['user'],
      permissions: permissions || [],
      session: {
        id: req.sessionID || uuidv4(),
        startTime: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      },
      authentication: {
        method: this.extractAuthMethod(req),
        verified: !!userId,
        mfaEnabled: this.extractMFAStatus(req),
        lastLogin: this.extractLastLogin(req)
      },
      preferences: {
        language: req.get('Accept-Language')?.split(',')[0] || 'en-AU',
        timezone: req.get('X-Timezone') || 'Australia/Sydney',
        currency: 'AUD'
      }
    };
  }

  /**
   * Extract financial context from request
   */
  private async extractFinancialContext(req: PolicyEvaluatedRequest): Promise<FinancialContext> {
    const body = req.body || {};
    const query = req.query || {};

    return {
      accountId: body.accountId || query.accountId || 'default',
      organisationId: body.organisationId || query.organisationId,
      amount: this.extractAmount(body) || this.extractAmount(query),
      currency: body.currency || query.currency || 'AUD',
      purpose: body.purpose || query.purpose || 'operational',
      category: body.category || query.category || 'general',
      beneficiaries: this.extractBeneficiaries(body, query),
      riskLevel: this.assessRiskLevel(body, query),
      complianceFlags: this.extractComplianceFlags(body, query)
    };
  }

  /**
   * Extract request context
   */
  private async extractRequestContext(req: PolicyEvaluatedRequest): Promise<RequestContext> {
    return {
      id: req.auditTrailId || uuidv4(),
      method: req.method,
      path: req.path,
      headers: this.sanitizeHeaders(req.headers),
      query: req.query || {},
      body: this.sanitizeBody(req.body),
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      referrer: req.get('Referer'),
      sessionId: req.sessionID,
      correlationId: req.get('X-Correlation-ID') || uuidv4()
    };
  }

  /**
   * Extract temporal context
   */
  private async extractTemporalContext(req: PolicyEvaluatedRequest): Promise<TemporalContext> {
    const now = new Date();
    const timezone = req.get('X-Timezone') || 'Australia/Sydney';
    
    return {
      requestTime: now,
      timezone,
      businessHours: this.isBusinessHours(now, timezone),
      workingDay: this.isWorkingDay(now, timezone),
      financialQuarter: this.getFinancialQuarter(now),
      reportingPeriod: this.getReportingPeriod(now)
    };
  }

  /**
   * Extract compliance context with Australian focus
   */
  private async extractComplianceContext(req: PolicyEvaluatedRequest): Promise<ComplianceContext> {
    const body = req.body || {};
    const headers = req.headers || {};

    // Determine applicable Australian compliance frameworks
    const australian = this.extractAustralianCompliance(req);

    return {
      frameworks: this.getApplicableFrameworks(body, australian),
      dataClassification: this.extractDataClassification(body),
      consentLevel: this.extractConsentLevel(headers, body),
      sovereigntyLevel: this.extractSovereigntyLevel(body, australian),
      retentionRequirements: this.getRetentionRequirements(body),
      auditRequirements: this.getAuditRequirements(body, australian),
      australian
    };
  }

  /**
   * Apply custom extraction rules
   */
  private async applyCustomRules(intent: FinancialIntent, req: PolicyEvaluatedRequest): Promise<void> {
    const sortedRules = Array.from(this.extractionRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRuleCondition(rule.condition, req)) {
        // Apply rule transformations to intent
        Object.assign(intent, rule.intent);
        
        this.emit('rule:applied', {
          ruleName: rule.name,
          intentId: intent.id,
          modifications: rule.intent
        });
      }
    }
  }

  /**
   * Validate extracted intent
   */
  private async validateIntent(intent: FinancialIntent): Promise<void> {
    const errors: string[] = [];

    // Validate required fields
    if (!intent.id) errors.push('Intent ID is required');
    if (!intent.operation?.type) errors.push('Operation type is required');
    if (!intent.user?.id) errors.push('User ID is required');
    if (!intent.request?.id) errors.push('Request ID is required');

    // Validate financial context for financial operations
    if (intent.operation.category === 'operational' && intent.operation.amount === undefined) {
      errors.push('Amount is required for operational financial operations');
    }

    // Validate Australian compliance context
    if (intent.compliance?.australian) {
      const aus = intent.compliance.australian;
      if (aus.indigenous?.careApplicable && !aus.indigenous.traditionalOwnerConsent) {
        errors.push('Traditional owner consent required for Indigenous data operations');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Intent validation failed: ${errors.join(', ')}`);
    }
  }

  // Private helper methods

  private initializeExtractionRules(): void {
    // Add default extraction rules
    const defaultRules: IntentExtractionRule[] = [
      {
        name: 'high_value_transaction',
        condition: {
          field: 'body.amount',
          operator: 'exists',
        },
        intent: {
          financial: {
            riskLevel: 'high'
          } as any
        },
        priority: 100,
        enabled: true
      },
      {
        name: 'indigenous_data_operation',
        condition: {
          field: 'body.indigenousData',
          operator: 'equals',
          value: true
        },
        intent: {
          compliance: {
            sovereigntyLevel: 'indigenous',
            australian: {
              indigenous: {
                careApplicable: true,
                traditionalOwnerConsent: true
              }
            }
          } as any
        },
        priority: 150,
        enabled: true
      },
      {
        name: 'cross_border_transaction',
        condition: {
          field: 'body.crossBorder',
          operator: 'equals',
          value: true
        },
        intent: {
          compliance: {
            australian: {
              privacyAct: {
                crossBorderRestrictions: true
              }
            }
          } as any
        },
        priority: 120,
        enabled: true
      }
    ];

    // Add custom rules from config
    const allRules = [...defaultRules, ...this.config.customRules];
    
    for (const rule of allRules) {
      this.extractionRules.set(rule.name, rule);
    }
  }

  private extractAmount(data: any): number | undefined {
    if (typeof data.amount === 'number') return data.amount;
    if (typeof data.value === 'number') return data.value;
    if (typeof data.total === 'number') return data.total;
    
    // Try to parse string amounts
    const amountStr = data.amount || data.value || data.total;
    if (typeof amountStr === 'string') {
      const parsed = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? undefined : parsed;
    }
    
    return undefined;
  }

  private extractUserId(req: PolicyEvaluatedRequest): string | undefined {
    // Check JWT token
    const authHeader = req.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.sub || payload.userId || payload.user_id;
      } catch {
        // Invalid JWT, continue with other methods
      }
    }

    // Check session
    if (req.session?.userId) return req.session.userId;
    
    // Check custom headers
    return req.get('X-User-ID');
  }

  private extractOrgId(req: PolicyEvaluatedRequest): string | undefined {
    return req.get('X-Organisation-ID') || req.body?.organisationId || req.query?.organisationId;
  }

  private extractRoles(req: PolicyEvaluatedRequest): string[] | undefined {
    const rolesHeader = req.get('X-User-Roles');
    if (rolesHeader) return rolesHeader.split(',').map(r => r.trim());
    
    return req.session?.roles || req.body?.roles;
  }

  private extractPermissions(req: PolicyEvaluatedRequest): string[] | undefined {
    const permsHeader = req.get('X-User-Permissions');
    if (permsHeader) return permsHeader.split(',').map(p => p.trim());
    
    return req.session?.permissions || req.body?.permissions;
  }

  private extractAuthMethod(req: PolicyEvaluatedRequest): string {
    if (req.get('Authorization')?.startsWith('Bearer ')) return 'jwt';
    if (req.sessionID) return 'session';
    if (req.get('X-API-Key')) return 'api_key';
    return 'none';
  }

  private extractMFAStatus(req: PolicyEvaluatedRequest): boolean {
    return req.get('X-MFA-Verified') === 'true' || req.session?.mfaVerified === true;
  }

  private extractLastLogin(req: PolicyEvaluatedRequest): Date | undefined {
    const lastLogin = req.get('X-Last-Login') || req.session?.lastLogin;
    return lastLogin ? new Date(lastLogin) : undefined;
  }

  private extractBeneficiaries(body: any, query: any): string[] {
    const beneficiaries = body.beneficiaries || query.beneficiaries;
    if (Array.isArray(beneficiaries)) return beneficiaries;
    if (typeof beneficiaries === 'string') return beneficiaries.split(',').map(b => b.trim());
    return [];
  }

  private assessRiskLevel(body: any, query: any): 'low' | 'medium' | 'high' | 'critical' {
    const amount = this.extractAmount(body) || this.extractAmount(query);
    
    if (amount === undefined) return 'low';
    if (amount > 100000) return 'critical';
    if (amount > 50000) return 'high';
    if (amount > 10000) return 'medium';
    return 'low';
  }

  private extractComplianceFlags(body: any, query: any): string[] {
    const flags: string[] = [];
    
    if (body.sensitiveData || query.sensitiveData) flags.push('sensitive_data');
    if (body.indigenousData || query.indigenousData) flags.push('indigenous_data');
    if (body.crossBorder || query.crossBorder) flags.push('cross_border');
    if (body.highRisk || query.highRisk) flags.push('high_risk');
    
    return flags;
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const [key, value] of Object.entries(headers)) {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'secret', 'token', 'key'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private isBusinessHours(date: Date, timezone: string): boolean {
    // Simple implementation - would use proper timezone library in production
    const hour = date.getHours();
    return hour >= 9 && hour < 17;
  }

  private isWorkingDay(date: Date, timezone: string): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  }

  private getFinancialQuarter(date: Date): string {
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    if (month <= 3) return 'Q3'; // Jan-Mar is Q3 in Australian financial year
    if (month <= 6) return 'Q4'; // Apr-Jun is Q4
    if (month <= 9) return 'Q1'; // Jul-Sep is Q1
    return 'Q2'; // Oct-Dec is Q2
  }

  private getReportingPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    // Australian financial year runs July to June
    if (month >= 7) {
      return `FY${year}-${year + 1}`;
    } else {
      return `FY${year - 1}-${year}`;
    }
  }

  private extractAustralianCompliance(req: PolicyEvaluatedRequest): AustralianComplianceContext {
    const body = req.body || {};
    
    return {
      privacyAct: {
        applicableAPPs: this.determineApplicableAPPs(body),
        crossBorderRestrictions: body.crossBorder === true,
        notifiableDataBreach: this.assessDataBreachRisk(body)
      },
      indigenous: {
        careApplicable: body.indigenousData === true,
        traditionalOwnerConsent: body.traditionalOwnerConsent === true,
        culturalProtocols: body.culturalProtocols || []
      },
      financial: {
        austracReporting: this.requiresAUSTRACReporting(body),
        asicCompliance: body.asicReporting === true,
        atoReporting: body.atoReporting === true
      },
      dataResidency: {
        australiaOnly: body.dataResidencyRequired !== false,
        allowedRegions: body.allowedRegions || ['ap-southeast-2'],
        exceptions: body.residencyExceptions || []
      }
    };
  }

  private getApplicableFrameworks(body: any, australian: AustralianComplianceContext): string[] {
    const frameworks: string[] = [];
    
    if (australian.privacyAct.applicableAPPs.length > 0) frameworks.push('privacy_act_1988');
    if (australian.indigenous.careApplicable) frameworks.push('care_principles');
    if (australian.financial.austracReporting) frameworks.push('austrac');
    if (australian.financial.asicCompliance) frameworks.push('asic');
    if (australian.financial.atoReporting) frameworks.push('ato');
    
    return frameworks;
  }

  private extractDataClassification(body: any): string {
    if (body.classification) return body.classification;
    if (body.sensitiveData) return 'confidential';
    if (body.indigenousData) return 'restricted';
    return 'internal';
  }

  private extractConsentLevel(headers: any, body: any): string {
    if (headers['x-consent-level']) return headers['x-consent-level'];
    if (body.consentLevel) return body.consentLevel;
    if (body.indigenousData) return 'full_automation';
    if (body.sensitiveData) return 'explicit_consent';
    return 'basic_consent';
  }

  private extractSovereigntyLevel(body: any, australian: AustralianComplianceContext): string {
    if (australian.indigenous.careApplicable) return 'indigenous';
    if (body.communityBenefit) return 'community';
    return 'organizational';
  }

  private getRetentionRequirements(body: any): { years: number; reason: string } {
    if (body.indigenousData) return { years: 50, reason: 'Indigenous data protection' };
    if (body.financialData) return { years: 7, reason: 'Financial compliance' };
    return { years: 3, reason: 'Operational requirements' };
  }

  private getAuditRequirements(body: any, australian: AustralianComplianceContext): string[] {
    const requirements: string[] = [];
    
    if (australian.financial.austracReporting) requirements.push('austrac_audit');
    if (australian.privacyAct.applicableAPPs.length > 0) requirements.push('privacy_audit');
    if (australian.indigenous.careApplicable) requirements.push('indigenous_audit');
    
    return requirements;
  }

  private determineApplicableAPPs(body: any): number[] {
    const apps: number[] = [];
    
    if (body.personalData) {
      apps.push(1, 3, 5, 6, 11, 12, 13); // Core APPs for personal data
    }
    
    if (body.directMarketing) {
      apps.push(7); // APP 7 for direct marketing
    }
    
    if (body.crossBorder) {
      apps.push(8); // APP 8 for cross-border disclosure
    }
    
    return [...new Set(apps)]; // Remove duplicates
  }

  private assessDataBreachRisk(body: any): boolean {
    return body.sensitiveData === true || body.personalData === true || body.indigenousData === true;
  }

  private requiresAUSTRACReporting(body: any): boolean {
    const amount = this.extractAmount(body);
    return amount !== undefined && amount >= 10000; // AUD $10,000 threshold
  }

  private evaluateRuleCondition(condition: any, req: PolicyEvaluatedRequest): boolean {
    const value = this.getNestedValue(req, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);
      case 'matches':
        return typeof value === 'string' && new RegExp(condition.value).test(value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Default intent extraction configuration
 */
export const createDefaultIntentExtractionConfig = (): IntentExtractionConfig => ({
  extractors: {
    httpMethod: true,
    headers: true,
    body: true,
    query: true,
    params: true,
    userAgent: true
  },
  customRules: [],
  fieldMappings: {
    'body.amount': 'financial.amount',
    'body.currency': 'financial.currency',
    'body.purpose': 'financial.purpose',
    'headers.x-user-id': 'user.id',
    'headers.x-organisation-id': 'user.organisationId'
  }
});