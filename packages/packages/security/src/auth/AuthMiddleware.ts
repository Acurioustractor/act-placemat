/**
 * Authentication and Authorization Middleware for ACT Placemat
 * 
 * Express.js middleware for JWT validation, RBAC enforcement,
 * and Australian compliance checking
 */

import { Request, Response, NextFunction } from 'express';
import { JWTService, TokenValidationResult, AccessTokenPayload } from './JWTService';
import { UserRole, Permission, PermissionScope } from '../rbac/roles';
import { z } from 'zod';

// === REQUEST CONTEXT EXTENSION ===

/**
 * Extended request interface with authentication context
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: Array<{
      role: UserRole;
      scope: PermissionScope;
      scopeId?: string;
    }>;
    permissions: Permission[];
    sovereigntyLevel?: string;
    culturalProtocols: string[];
    financialApprovalLimit: number;
    sessionId: string;
    mfaVerified: boolean;
  };
  authToken?: string;
  sessionInfo?: {
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    riskScore?: number;
  };
}

// === MIDDLEWARE CONFIGURATION ===

/**
 * Authentication middleware configuration
 */
export interface AuthMiddlewareConfig {
  jwtService: JWTService;
  skipAuthForPaths?: string[];
  requireHttps?: boolean;
  trustProxy?: boolean;
  enableAuditLogging?: boolean;
  maxRequestsPerMinute?: number;
}

/**
 * Permission requirement specification
 */
export interface PermissionRequirement {
  permission: Permission;
  scope?: PermissionScope;
  scopeId?: string;
  requireMFA?: boolean;
  requireSovereigntyLevel?: string;
  requireCulturalProtocols?: string[];
  financialAmountCheck?: number;
  customValidator?: (payload: AccessTokenPayload, req: AuthenticatedRequest) => Promise<boolean>;
}

// === MIDDLEWARE IMPLEMENTATION ===

export class AuthMiddleware {
  private jwtService: JWTService;
  private config: AuthMiddlewareConfig;
  private rateLimitStore: Map<string, { requests: number; resetTime: number }> = new Map();

  constructor(config: AuthMiddlewareConfig) {
    this.jwtService = config.jwtService;
    this.config = config;
  }

  // === AUTHENTICATION MIDDLEWARE ===

  /**
   * Main authentication middleware
   */
  authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Skip authentication for specific paths
        if (this.shouldSkipAuth(req.path)) {
          return next();
        }

        // Check HTTPS requirement
        if (this.config.requireHttps && !this.isSecureConnection(req)) {
          return res.status(400).json({
            error: 'HTTPS required',
            code: 'INSECURE_CONNECTION'
          });
        }

        // Rate limiting
        if (this.config.maxRequestsPerMinute) {
          const rateLimitResult = this.checkRateLimit(req);
          if (!rateLimitResult.allowed) {
            return res.status(429).json({
              error: 'Too many requests',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: rateLimitResult.retryAfter
            });
          }
        }

        // Extract token from header
        const token = this.extractToken(req);
        if (!token) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'NO_TOKEN'
          });
        }

        // Validate token
        const validation = await this.jwtService.validateAccessToken(token);
        if (!validation.valid || !validation.payload) {
          return this.handleInvalidToken(res, validation);
        }

        // Set request context
        this.setRequestContext(req, validation.payload, token);

        // Security flag checks
        if (validation.securityFlags && validation.securityFlags.length > 0) {
          this.handleSecurityFlags(validation.securityFlags, req, res);
        }

        // Audit logging
        if (this.config.enableAuditLogging) {
          this.logAuthenticationEvent(req, 'authenticated');
        }

        next();

      } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({
          error: 'Authentication service error',
          code: 'AUTH_SERVICE_ERROR'
        });
      }
    };
  }

  // === AUTHORIZATION MIDDLEWARE ===

  /**
   * Create authorization middleware for specific permissions
   */
  requirePermission(requirement: PermissionRequirement) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          });
        }

        // Check if user has the required permission
        if (!req.user.permissions.includes(requirement.permission)) {
          return res.status(403).json({
            error: `Permission ${requirement.permission} required`,
            code: 'INSUFFICIENT_PERMISSIONS'
          });
        }

        // Check scope requirements
        if (requirement.scope && requirement.scopeId) {
          const hasScope = req.user.roles.some(role => 
            role.scope === requirement.scope && 
            (!requirement.scopeId || role.scopeId === requirement.scopeId)
          );

          if (!hasScope) {
            return res.status(403).json({
              error: `Access to ${requirement.scope}:${requirement.scopeId} required`,
              code: 'INSUFFICIENT_SCOPE'
            });
          }
        }

        // Check MFA requirement
        if (requirement.requireMFA && !req.user.mfaVerified) {
          return res.status(403).json({
            error: 'Multi-factor authentication required for this operation',
            code: 'MFA_REQUIRED'
          });
        }

        // Check sovereignty requirements
        if (requirement.requireSovereigntyLevel) {
          if (!req.user.sovereigntyLevel || 
              !this.checkSovereigntyLevel(req.user.sovereigntyLevel, requirement.requireSovereigntyLevel)) {
            return res.status(403).json({
              error: 'Insufficient sovereignty level for this operation',
              code: 'SOVEREIGNTY_VIOLATION'
            });
          }
        }

        // Check cultural protocol requirements
        if (requirement.requireCulturalProtocols && requirement.requireCulturalProtocols.length > 0) {
          const hasRequiredProtocols = requirement.requireCulturalProtocols.every(protocol =>
            req.user!.culturalProtocols.includes(protocol)
          );

          if (!hasRequiredProtocols) {
            return res.status(403).json({
              error: 'Required cultural protocols not acknowledged',
              code: 'CULTURAL_PROTOCOL_VIOLATION'
            });
          }
        }

        // Check financial amount limits
        if (requirement.financialAmountCheck !== undefined) {
          if (req.user.financialApprovalLimit < requirement.financialAmountCheck) {
            return res.status(403).json({
              error: `Financial approval limit exceeded. Required: $${requirement.financialAmountCheck}, Available: $${req.user.financialApprovalLimit}`,
              code: 'FINANCIAL_LIMIT_EXCEEDED'
            });
          }
        }

        // Custom validation
        if (requirement.customValidator) {
          const customValid = await requirement.customValidator(
            req.user as any, // Cast to payload type
            req
          );

          if (!customValid) {
            return res.status(403).json({
              error: 'Custom authorization check failed',
              code: 'CUSTOM_AUTHORIZATION_FAILED'
            });
          }
        }

        // Audit successful authorization
        if (this.config.enableAuditLogging) {
          this.logAuthorizationEvent(req, requirement.permission, 'authorized');
        }

        next();

      } catch (error) {
        console.error('Authorization middleware error:', error);
        res.status(500).json({
          error: 'Authorization service error',
          code: 'AUTH_SERVICE_ERROR'
        });
      }
    };
  }

  /**
   * Create role-based authorization middleware
   */
  requireRole(role: UserRole, scope?: PermissionScope, scopeId?: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      const hasRole = req.user.roles.some(userRole => 
        userRole.role === role &&
        (!scope || userRole.scope === scope) &&
        (!scopeId || userRole.scopeId === scopeId)
      );

      if (!hasRole) {
        return res.status(403).json({
          error: `Role ${role} required`,
          code: 'INSUFFICIENT_ROLE'
        });
      }

      next();
    };
  }

  /**
   * Require any of the specified roles
   */
  requireAnyRole(roles: UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      const hasAnyRole = req.user.roles.some(userRole => 
        roles.includes(userRole.role)
      );

      if (!hasAnyRole) {
        return res.status(403).json({
          error: `One of roles ${roles.join(', ')} required`,
          code: 'INSUFFICIENT_ROLE'
        });
      }

      next();
    };
  }

  // === UTILITY METHODS ===

  /**
   * Extract JWT token from request headers
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Check if authentication should be skipped for this path
   */
  private shouldSkipAuth(path: string): boolean {
    if (!this.config.skipAuthForPaths) return false;
    
    return this.config.skipAuthForPaths.some(skipPath => {
      if (skipPath.endsWith('*')) {
        return path.startsWith(skipPath.slice(0, -1));
      }
      return path === skipPath;
    });
  }

  /**
   * Check if connection is secure (HTTPS)
   */
  private isSecureConnection(req: Request): boolean {
    if (this.config.trustProxy) {
      return req.get('X-Forwarded-Proto') === 'https' || req.secure;
    }
    return req.secure;
  }

  /**
   * Handle invalid token scenarios
   */
  private handleInvalidToken(res: Response, validation: TokenValidationResult) {
    if (validation.expired) {
      return res.status(401).json({
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (validation.revoked) {
      return res.status(401).json({
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
      details: validation.errors
    });
  }

  /**
   * Set authentication context on request
   */
  private setRequestContext(req: AuthenticatedRequest, payload: AccessTokenPayload, token: string) {
    req.user = {
      id: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      roles: payload.roles.map(role => ({
        role: role.role,
        scope: role.scope,
        scopeId: role.scopeId
      })),
      permissions: payload.permissions,
      sovereigntyLevel: payload.sovereigntyLevel,
      culturalProtocols: payload.culturalProtocols,
      financialApprovalLimit: payload.financialApprovalLimit,
      sessionId: payload.sessionId,
      mfaVerified: payload.mfaVerified
    };

    req.authToken = token;
    
    req.sessionInfo = {
      sessionId: payload.sessionId,
      ipAddress: payload.ipAddress,
      userAgent: req.get('User-Agent') || ''
    };
  }

  /**
   * Handle security flags from token validation
   */
  private handleSecurityFlags(flags: string[], req: AuthenticatedRequest, res: Response) {
    // Add security headers
    res.set('X-Security-Flags', flags.join(','));

    // Log security concerns
    if (this.config.enableAuditLogging) {
      console.warn('Security flags detected:', {
        userId: req.user?.id,
        sessionId: req.sessionInfo?.sessionId,
        flags,
        path: req.path,
        method: req.method
      });
    }

    // Handle specific flags
    if (flags.includes('admin_role_without_mfa')) {
      res.set('X-Require-MFA', 'true');
    }

    if (flags.includes('high_risk_session')) {
      res.set('X-High-Risk-Session', 'true');
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(req: Request): { allowed: boolean; retryAfter?: number } {
    if (!this.config.maxRequestsPerMinute) {
      return { allowed: true };
    }

    const clientId = this.getClientIdentifier(req);
    const now = Date.now();
    const windowStart = now - (60 * 1000); // 1 minute window

    const clientData = this.rateLimitStore.get(clientId);
    
    if (!clientData || clientData.resetTime < windowStart) {
      // Reset window
      this.rateLimitStore.set(clientId, {
        requests: 1,
        resetTime: now
      });
      return { allowed: true };
    }

    if (clientData.requests >= this.config.maxRequestsPerMinute) {
      const retryAfter = Math.ceil((clientData.resetTime + 60000 - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Increment counter
    clientData.requests++;
    return { allowed: true };
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(req: Request): string {
    // Use user ID if authenticated, otherwise IP address
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.substring(7);
        const decoded = this.jwtService['jwt'].decode(token) as any;
        if (decoded?.sub) {
          return `user:${decoded.sub}`;
        }
      } catch (error) {
        // Fall through to IP-based identification
      }
    }

    const ip = this.config.trustProxy 
      ? req.get('X-Forwarded-For')?.split(',')[0] || req.ip 
      : req.ip;
    
    return `ip:${ip}`;
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
   * Log authentication events
   */
  private logAuthenticationEvent(req: AuthenticatedRequest, event: string) {
    console.log('Auth Event:', {
      event,
      userId: req.user?.id,
      sessionId: req.sessionInfo?.sessionId,
      path: req.path,
      method: req.method,
      ipAddress: req.sessionInfo?.ipAddress,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log authorization events
   */
  private logAuthorizationEvent(req: AuthenticatedRequest, permission: Permission, result: string) {
    console.log('Authorization Event:', {
      result,
      permission,
      userId: req.user?.id,
      sessionId: req.sessionInfo?.sessionId,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // === UTILITY MIDDLEWARE FACTORIES ===

  /**
   * Create middleware to check financial approval limits
   */
  static requireFinancialApproval(amount: number) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (req.user.financialApprovalLimit < amount) {
        return res.status(403).json({
          error: `Financial approval required for amount $${amount}. Your limit: $${req.user.financialApprovalLimit}`,
          code: 'FINANCIAL_APPROVAL_REQUIRED'
        });
      }

      next();
    };
  }

  /**
   * Create middleware to require MFA verification
   */
  static requireMFA() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (!req.user.mfaVerified) {
        return res.status(403).json({
          error: 'Multi-factor authentication required',
          code: 'MFA_REQUIRED'
        });
      }

      next();
    };
  }

  /**
   * Create middleware to require Indigenous cultural protocols
   */
  static requireCulturalProtocols(protocols: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      const hasAllProtocols = protocols.every(protocol =>
        req.user!.culturalProtocols.includes(protocol)
      );

      if (!hasAllProtocols) {
        return res.status(403).json({
          error: `Cultural protocols required: ${protocols.join(', ')}`,
          code: 'CULTURAL_PROTOCOLS_REQUIRED'
        });
      }

      next();
    };
  }
}