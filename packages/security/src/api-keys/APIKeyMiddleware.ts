/**
 * API Key Authentication Middleware for ACT Placemat
 * 
 * Express.js middleware for API key validation, permission checking,
 * and usage tracking with Australian compliance features
 */

import { Request, Response, NextFunction } from 'express';
import { APIKeyService, APIKeyValidationResult, APIKey } from './APIKeyService';
import { RBACService, PermissionContext } from '../auth/RBACService';
import { Permission, PermissionScope } from '../rbac/roles';

// === EXTENDED REQUEST INTERFACE ===

/**
 * Extended request interface with API key context
 */
export interface APIKeyRequest extends Request {
  apiKey?: {
    key: APIKey;
    keyId: string;
    ownerId: string;
    ownerType: string;
    permissions: Permission[];
    scope: PermissionScope;
    scopeId?: string;
    
    // Sovereignty context
    sovereigntyLevel?: string;
    culturalProtocols: string[];
    communityId?: string;
    
    // Rate limiting info
    rateLimitRemaining: number;
    rateLimitReset: Date;
    
    // Security context
    securityWarnings: string[];
    validated: boolean;
  };
  
  // Usage tracking
  requestStartTime?: number;
  requestId?: string;
}

// === MIDDLEWARE CONFIGURATION ===

export interface APIKeyMiddlewareConfig {
  apiKeyService: APIKeyService;
  rbacService?: RBACService;
  
  // Header configuration
  apiKeyHeader: string; // Default: 'X-API-Key'
  alternativeHeaders: string[]; // Alternative header names
  
  // Security settings
  requireHttps: boolean;
  logAllRequests: boolean;
  blockSuspiciousActivity: boolean;
  
  // Rate limiting
  enableRateLimiting: boolean;
  rateLimitHeaders: boolean; // Include rate limit info in response headers
  
  // Australian compliance
  enforceDataResidency: boolean;
  auditAPIAccess: boolean;
  requireSovereigntyCompliance: boolean;
  
  // Error handling
  includeErrorDetails: boolean; // Include detailed error info (dev only)
  customErrorHandler?: (error: Error, req: APIKeyRequest, res: Response) => void;
}

// === PERMISSION REQUIREMENT FOR API KEYS ===

export interface APIKeyPermissionRequirement {
  permission: Permission;
  scope?: PermissionScope;
  scopeId?: string;
  
  // Contextual requirements
  requireSovereigntyLevel?: string;
  requireCulturalProtocols?: string[];
  allowIndigenousDataAccess?: boolean;
  requireDataResidency?: boolean;
  
  // Custom validation
  customValidator?: (apiKey: APIKey, req: APIKeyRequest) => Promise<boolean>;
}

// === MIDDLEWARE IMPLEMENTATION ===

export class APIKeyMiddleware {
  private config: APIKeyMiddlewareConfig;
  private apiKeyService: APIKeyService;
  private rbacService?: RBACService;

  constructor(config: APIKeyMiddlewareConfig) {
    this.config = config;
    this.apiKeyService = config.apiKeyService;
    this.rbacService = config.rbacService;
  }

  // === MAIN AUTHENTICATION MIDDLEWARE ===

  /**
   * Main API key authentication middleware
   */
  authenticate() {
    return async (req: APIKeyRequest, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      req.requestStartTime = startTime;
      req.requestId = this.generateRequestId();

      try {
        // Check HTTPS requirement
        if (this.config.requireHttps && !this.isSecureConnection(req)) {
          return this.sendError(res, 400, 'HTTPS_REQUIRED', 'HTTPS connection required');
        }

        // Extract API key from headers
        const apiKeyString = this.extractAPIKey(req);
        if (!apiKeyString) {
          return this.sendError(res, 401, 'API_KEY_MISSING', 'API key required');
        }

        // Validate API key
        const validation = await this.validateAPIKey(apiKeyString, req);
        if (!validation.valid) {
          return this.handleValidationFailure(res, validation, req);
        }

        // Set request context
        this.setAPIKeyContext(req, validation);

        // Add rate limit headers
        if (this.config.rateLimitHeaders && validation.rateLimitInfo) {
          this.setRateLimitHeaders(res, validation.rateLimitInfo);
        }

        // Log request if configured
        if (this.config.logAllRequests) {
          this.logAPIRequest(req, 'authenticated');
        }

        // Record usage (async, don't block request)
        this.recordUsageAsync(req, res);

        next();

      } catch (error) {
        console.error('API key authentication error:', error);
        
        if (this.config.customErrorHandler) {
          this.config.customErrorHandler(error as Error, req, res);
        } else {
          this.sendError(res, 500, 'AUTHENTICATION_ERROR', 'Authentication service error');
        }
      }
    };
  }

  // === PERMISSION-BASED MIDDLEWARE ===

  /**
   * Create middleware for specific API key permission requirements
   */
  requireAPIKeyPermission(requirement: APIKeyPermissionRequirement) {
    return async (req: APIKeyRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.apiKey) {
          return this.sendError(res, 401, 'NOT_AUTHENTICATED', 'API key authentication required');
        }

        // Check if API key has the required permission
        if (!req.apiKey.permissions.includes(requirement.permission)) {
          await this.logSecurityViolation(req, 'permission_denied', `Missing permission: ${requirement.permission}`);
          return this.sendError(res, 403, 'INSUFFICIENT_PERMISSIONS', `Permission ${requirement.permission} required`);
        }

        // Check scope requirements
        if (requirement.scope && requirement.scopeId) {
          if (req.apiKey.scope !== requirement.scope || 
              (req.apiKey.scopeId && req.apiKey.scopeId !== requirement.scopeId)) {
            await this.logSecurityViolation(req, 'scope_violation', `Scope mismatch: required ${requirement.scope}:${requirement.scopeId}`);
            return this.sendError(res, 403, 'INSUFFICIENT_SCOPE', 'Insufficient access scope');
          }
        }

        // Check sovereignty requirements
        if (requirement.requireSovereigntyLevel) {
          if (!req.apiKey.sovereigntyLevel || 
              !this.checkSovereigntyLevel(req.apiKey.sovereigntyLevel, requirement.requireSovereigntyLevel)) {
            await this.logSecurityViolation(req, 'sovereignty_violation', 'Insufficient sovereignty level');
            return this.sendError(res, 403, 'SOVEREIGNTY_VIOLATION', 'Insufficient sovereignty level');
          }
        }

        // Check cultural protocol requirements
        if (requirement.requireCulturalProtocols && requirement.requireCulturalProtocols.length > 0) {
          const hasRequiredProtocols = requirement.requireCulturalProtocols.every(protocol =>
            req.apiKey!.culturalProtocols.includes(protocol)
          );

          if (!hasRequiredProtocols) {
            await this.logSecurityViolation(req, 'cultural_protocol_violation', 'Missing required cultural protocols');
            return this.sendError(res, 403, 'CULTURAL_PROTOCOL_VIOLATION', 'Required cultural protocols not acknowledged');
          }
        }

        // Check data residency for Indigenous data
        if (requirement.allowIndigenousDataAccess && this.config.enforceDataResidency) {
          if (!req.apiKey.key.dataResidencyRequired) {
            await this.logSecurityViolation(req, 'data_residency_violation', 'Indigenous data access without residency compliance');
            return this.sendError(res, 403, 'DATA_RESIDENCY_VIOLATION', 'Data residency compliance required for Indigenous data');
          }
        }

        // Custom validation
        if (requirement.customValidator) {
          const customValid = await requirement.customValidator(req.apiKey.key, req);
          if (!customValid) {
            await this.logSecurityViolation(req, 'custom_validation_failure', 'Custom API key validation failed');
            return this.sendError(res, 403, 'CUSTOM_VALIDATION_FAILED', 'Custom authorization check failed');
          }
        }

        // Enhanced RBAC check if service available
        if (this.rbacService) {
          const context: PermissionContext = {
            action: req.method.toLowerCase(),
            metadata: {
              apiKeyId: req.apiKey.keyId,
              ownerId: req.apiKey.ownerId,
              ownerType: req.apiKey.ownerType,
              endpoint: req.path
            },
            involvesIndigenousData: requirement.allowIndigenousDataAccess
          };

          const rbacResult = await this.rbacService.checkPermission(
            req.apiKey.ownerId,
            requirement.permission,
            requirement.scope || req.apiKey.scope,
            requirement.scopeId || req.apiKey.scopeId,
            context
          );

          if (!rbacResult.allowed) {
            await this.logSecurityViolation(req, 'rbac_permission_denied', `RBAC check failed: ${rbacResult.denialReasons.join(', ')}`);
            return this.sendError(res, 403, 'RBAC_PERMISSION_DENIED', 'RBAC authorization failed');
          }
        }

        next();

      } catch (error) {
        console.error('API key permission check error:', error);
        this.sendError(res, 500, 'AUTHORIZATION_ERROR', 'Authorization service error');
      }
    };
  }

  /**
   * Middleware to check API key ownership/scope for user-specific operations
   */
  requireAPIKeyOwnership(ownerIdPath: string = 'params.userId') {
    return (req: APIKeyRequest, res: Response, next: NextFunction) => {
      if (!req.apiKey) {
        return this.sendError(res, 401, 'NOT_AUTHENTICATED', 'API key authentication required');
      }

      // Extract owner ID from request (e.g., req.params.userId)
      const requestedOwnerId = this.getNestedProperty(req, ownerIdPath);
      
      if (!requestedOwnerId) {
        return this.sendError(res, 400, 'OWNER_ID_MISSING', 'Owner ID not provided in request');
      }

      // Check if API key owner matches requested resource owner
      if (req.apiKey.ownerId !== requestedOwnerId && req.apiKey.scope !== PermissionScope.GLOBAL) {
        this.logSecurityViolation(req, 'ownership_violation', `API key owner ${req.apiKey.ownerId} accessing resource for ${requestedOwnerId}`);
        return this.sendError(res, 403, 'OWNERSHIP_VIOLATION', 'API key cannot access resources for different owner');
      }

      next();
    };
  }

  // === RATE LIMITING MIDDLEWARE ===

  /**
   * API key specific rate limiting middleware
   */
  rateLimitByAPIKey() {
    return async (req: APIKeyRequest, res: Response, next: NextFunction) => {
      if (!this.config.enableRateLimiting || !req.apiKey) {
        return next();
      }

      // Rate limiting is handled in the validation phase
      // This middleware just enforces additional checks if needed
      
      if (req.apiKey.rateLimitRemaining <= 0) {
        this.setRateLimitHeaders(res, {
          remaining: 0,
          resetTime: req.apiKey.rateLimitReset,
          rateLimited: true
        });

        return this.sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded for API key');
      }

      next();
    };
  }

  // === UTILITY METHODS ===

  /**
   * Extract API key from request headers
   */
  private extractAPIKey(req: Request): string | null {
    // Check primary header
    let apiKey = req.headers[this.config.apiKeyHeader.toLowerCase()] as string;
    
    if (!apiKey) {
      // Check alternative headers
      for (const header of this.config.alternativeHeaders) {
        apiKey = req.headers[header.toLowerCase()] as string;
        if (apiKey) break;
      }
    }

    // Handle Bearer token format
    if (apiKey && apiKey.startsWith('Bearer ')) {
      apiKey = apiKey.substring(7);
    }

    return apiKey || null;
  }

  /**
   * Validate API key using the service
   */
  private async validateAPIKey(apiKeyString: string, req: APIKeyRequest): Promise<APIKeyValidationResult> {
    const context = {
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      endpoint: req.path,
      method: req.method,
      httpsUsed: this.isSecureConnection(req)
    };

    return this.apiKeyService.validateAPIKey(apiKeyString, context);
  }

  /**
   * Set API key context on request
   */
  private setAPIKeyContext(req: APIKeyRequest, validation: APIKeyValidationResult): void {
    if (!validation.key) return;

    req.apiKey = {
      key: validation.key,
      keyId: validation.key.keyId,
      ownerId: validation.key.ownerId,
      ownerType: validation.key.ownerType,
      permissions: validation.permissions || [],
      scope: validation.scope || PermissionScope.DELEGATED,
      scopeId: validation.scopeId,
      sovereigntyLevel: validation.key.sovereigntyLevel,
      culturalProtocols: validation.key.culturalProtocols,
      communityId: validation.key.communityId,
      rateLimitRemaining: validation.rateLimitInfo?.remaining || 0,
      rateLimitReset: validation.rateLimitInfo?.resetTime || new Date(),
      securityWarnings: validation.securityWarnings || [],
      validated: true
    };
  }

  /**
   * Handle validation failure
   */
  private handleValidationFailure(res: Response, validation: APIKeyValidationResult, req: APIKeyRequest): void {
    const primaryError = validation.errors?.[0] || 'Invalid API key';
    
    if (primaryError.includes('Rate limit')) {
      this.setRateLimitHeaders(res, validation.rateLimitInfo!);
      this.sendError(res, 429, 'RATE_LIMIT_EXCEEDED', primaryError);
    } else if (primaryError.includes('expired')) {
      this.sendError(res, 401, 'API_KEY_EXPIRED', primaryError);
    } else if (primaryError.includes('compromised')) {
      this.sendError(res, 401, 'API_KEY_COMPROMISED', primaryError);
    } else if (primaryError.includes('IP')) {
      this.logSecurityViolation(req, 'ip_restriction_violation', primaryError);
      this.sendError(res, 403, 'IP_NOT_ALLOWED', primaryError);
    } else {
      this.sendError(res, 401, 'INVALID_API_KEY', primaryError);
    }
  }

  /**
   * Set rate limit headers
   */
  private setRateLimitHeaders(res: Response, rateLimitInfo: { remaining: number; resetTime: Date; rateLimited: boolean }): void {
    res.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    res.set('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString());
    
    if (rateLimitInfo.rateLimited) {
      res.set('Retry-After', Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000).toString());
    }
  }

  /**
   * Record API usage asynchronously
   */
  private recordUsageAsync(req: APIKeyRequest, res: Response): void {
    // Capture response data when response finishes
    res.on('finish', async () => {
      if (!req.apiKey || !req.requestStartTime) return;

      try {
        const responseTime = Date.now() - req.requestStartTime;
        const contentLength = parseInt(res.get('content-length') || '0', 10);

        await this.apiKeyService.recordUsage(req.apiKey.keyId, {
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          endpoint: req.path,
          method: req.method,
          responseStatus: res.statusCode,
          responseTime,
          bytesTransferred: contentLength,
          requestId: req.requestId || 'unknown',
          securityFlags: req.apiKey.securityWarnings,
          suspiciousActivity: req.apiKey.securityWarnings.length > 0,
          dataAccessed: this.isDataAccessEndpoint(req.path),
          indigenousDataAccessed: this.isIndigenousDataEndpoint(req.path),
          dataResidencyCompliant: req.apiKey.key.dataResidencyRequired
        });
      } catch (error) {
        console.error('Failed to record API key usage:', error);
      }
    });
  }

  /**
   * Check sovereignty level hierarchy
   */
  private checkSovereigntyLevel(userLevel: string, requiredLevel: string): boolean {
    const levels = {
      'general_respect': 1,
      'cultural_protocol': 2,
      'community_delegate': 3,
      'cultural_authority': 4,
      'traditional_owner': 5
    };

    const userLevelValue = levels[userLevel as keyof typeof levels] || 0;
    const requiredLevelValue = levels[requiredLevel as keyof typeof levels] || 0;

    return userLevelValue >= requiredLevelValue;
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
           req.headers['x-real-ip'] as string || 
           req.connection.remoteAddress || 
           req.ip || 
           'unknown';
  }

  /**
   * Check if connection is secure
   */
  private isSecureConnection(req: Request): boolean {
    return req.secure || req.headers['x-forwarded-proto'] === 'https';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get nested property from object
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if endpoint accesses data
   */
  private isDataAccessEndpoint(path: string): boolean {
    const dataEndpoints = ['/api/stories', '/api/projects', '/api/opportunities', '/api/members'];
    return dataEndpoints.some(endpoint => path.startsWith(endpoint));
  }

  /**
   * Check if endpoint accesses Indigenous data
   */
  private isIndigenousDataEndpoint(path: string): boolean {
    const indigenousEndpoints = ['/api/sovereignty', '/api/communities', '/api/traditional-owners'];
    return indigenousEndpoints.some(endpoint => path.startsWith(endpoint)) ||
           path.includes('indigenous') || path.includes('sovereignty');
  }

  /**
   * Send standardized error response
   */
  private sendError(res: Response, statusCode: number, code: string, message: string): void {
    const error: any = {
      error: {
        code,
        message
      }
    };

    if (this.config.includeErrorDetails) {
      error.error.timestamp = new Date().toISOString();
      error.error.statusCode = statusCode;
    }

    res.status(statusCode).json(error);
  }

  /**
   * Log API request
   */
  private logAPIRequest(req: APIKeyRequest, event: string): void {
    console.log('API Key Request:', {
      event,
      requestId: req.requestId,
      keyId: req.apiKey?.keyId,
      ownerId: req.apiKey?.ownerId,
      method: req.method,
      path: req.path,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log security violation
   */
  private async logSecurityViolation(req: APIKeyRequest, violationType: string, description: string): Promise<void> {
    console.warn('API Key Security Violation:', {
      violationType,
      description,
      requestId: req.requestId,
      keyId: req.apiKey?.keyId,
      ownerId: req.apiKey?.ownerId,
      method: req.method,
      path: req.path,
      ip: this.getClientIP(req),
      timestamp: new Date().toISOString()
    });

    // Also log to audit system if configured
    if (this.config.auditAPIAccess && req.apiKey) {
      // Would integrate with audit logging system
    }
  }

  // === FACTORY METHODS ===

  /**
   * Create API key middleware for Indigenous data endpoints
   */
  static forIndigenousData(apiKeyService: APIKeyService, rbacService?: RBACService) {
    return new APIKeyMiddleware({
      apiKeyService,
      rbacService,
      apiKeyHeader: 'X-API-Key',
      alternativeHeaders: ['Authorization'],
      requireHttps: true,
      logAllRequests: true,
      blockSuspiciousActivity: true,
      enableRateLimiting: true,
      rateLimitHeaders: true,
      enforceDataResidency: true,
      auditAPIAccess: true,
      requireSovereigntyCompliance: true,
      includeErrorDetails: false
    });
  }

  /**
   * Create API key middleware for financial endpoints
   */
  static forFinancialData(apiKeyService: APIKeyService, rbacService?: RBACService) {
    return new APIKeyMiddleware({
      apiKeyService,
      rbacService,
      apiKeyHeader: 'X-API-Key',
      alternativeHeaders: ['Authorization'],
      requireHttps: true,
      logAllRequests: true,
      blockSuspiciousActivity: true,
      enableRateLimiting: true,
      rateLimitHeaders: true,
      enforceDataResidency: true,
      auditAPIAccess: true,
      requireSovereigntyCompliance: false,
      includeErrorDetails: false
    });
  }

  /**
   * Create API key middleware for public endpoints
   */
  static forPublicData(apiKeyService: APIKeyService) {
    return new APIKeyMiddleware({
      apiKeyService,
      apiKeyHeader: 'X-API-Key',
      alternativeHeaders: ['Authorization'],
      requireHttps: false,
      logAllRequests: false,
      blockSuspiciousActivity: true,
      enableRateLimiting: true,
      rateLimitHeaders: true,
      enforceDataResidency: false,
      auditAPIAccess: false,
      requireSovereigntyCompliance: false,
      includeErrorDetails: false
    });
  }
}