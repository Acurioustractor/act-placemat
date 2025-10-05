/**
 * Main Security Service for ACT Placemat
 * 
 * Orchestrates all security components including authentication, authorization,
 * RBAC, token management, and Australian compliance
 */

import { 
  JWTService, 
  AuthenticationService, 
  RBACService, 
  TokenManager,
  AuthMiddleware,
  createAuthenticationSystem
} from './auth';

import type {
  JWTConfig,
  AuthDatabase,
  RBACDatabase,
  TokenStorage,
  MFAService,
  PermissionContext
} from './auth';

import { UserRole, Permission, PermissionScope } from './rbac/roles';
import { z } from 'zod';

// === SECURITY SERVICE CONFIGURATION ===

export const SecurityConfigSchema = z.object({
  // JWT Configuration
  jwt: z.object({
    accessTokenSecret: z.string().min(32),
    refreshTokenSecret: z.string().min(32),
    accessTokenExpiresIn: z.string().default('15m'),
    refreshTokenExpiresIn: z.string().default('7d'),
    algorithm: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).default('HS512'),
    issuer: z.string().default('act-placemat'),
    audience: z.string().default('act-placemat-users')
  }),

  // Australian Compliance
  compliance: z.object({
    enforceDataResidency: z.boolean().default(true),
    requireIndigenousProtocols: z.boolean().default(true),
    auditAllTransactions: z.boolean().default(true),
    privacyActCompliant: z.boolean().default(true),
    acncCompliant: z.boolean().default(true),
    austracCompliant: z.boolean().default(true)
  }),

  // Security Settings
  security: z.object({
    requireHttps: z.boolean().default(true),
    enableMFA: z.boolean().default(true),
    maxSessionsPerUser: z.number().default(3),
    sessionTimeoutMinutes: z.number().default(60),
    enableTokenRotation: z.boolean().default(true),
    rateLimitingEnabled: z.boolean().default(true),
    maxRequestsPerMinute: z.number().default(100)
  }),

  // RBAC Settings
  rbac: z.object({
    enablePermissionCaching: z.boolean().default(true),
    cacheTimeoutMinutes: z.number().default(15),
    enableContextualPermissions: z.boolean().default(true),
    auditAllPermissionChecks: z.boolean().default(true),
    logSecurityViolations: z.boolean().default(true)
  }),

  // Paths to skip authentication
  publicPaths: z.array(z.string()).default([
    '/health',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/public/*'
  ])
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

// === SECURITY SERVICE IMPLEMENTATION ===

export class SecurityService {
  private config: SecurityConfig;
  private authSystem: ReturnType<typeof createAuthenticationSystem>;

  constructor(
    config: SecurityConfig,
    database: AuthDatabase & RBACDatabase,
    tokenStorage: TokenStorage,
    mfaService?: MFAService
  ) {
    this.config = SecurityConfigSchema.parse(config);

    // Create the complete authentication system
    this.authSystem = createAuthenticationSystem({
      jwtConfig: {
        ...this.config.jwt,
        enforceDataResidency: this.config.compliance.enforceDataResidency,
        requireMFAForAdminRoles: this.config.security.enableMFA,
        maxSessionsPerUser: this.config.security.maxSessionsPerUser,
        sessionTimeoutMinutes: this.config.security.sessionTimeoutMinutes,
        requireSecureConnections: this.config.security.requireHttps,
        allowedIpRanges: [] // Would be configured based on deployment
      },
      rbacConfig: {
        database,
        enforceDataResidency: this.config.compliance.enforceDataResidency,
        requireIndigenousProtocols: this.config.compliance.requireIndigenousProtocols,
        auditAllPermissionChecks: this.config.rbac.auditAllPermissionChecks,
        enablePermissionCaching: this.config.rbac.enablePermissionCaching,
        cacheTimeoutMinutes: this.config.rbac.cacheTimeoutMinutes,
        enableContextualPermissions: this.config.rbac.enableContextualPermissions,
        requireExplicitDenial: false,
        logSecurityViolations: this.config.rbac.logSecurityViolations
      },
      database,
      tokenStorage,
      mfaService
    });
  }

  // === PUBLIC API ===

  /**
   * Get authentication middleware for Express.js
   */
  getAuthMiddleware() {
    return this.authSystem.authenticate;
  }

  /**
   * Get permission-based middleware
   */
  requirePermission(permission: Permission, options?: {
    scope?: PermissionScope;
    scopeId?: string;
    requireMFA?: boolean;
    requireSovereigntyLevel?: string;
    requireCulturalProtocols?: string[];
    financialAmountCheck?: number;
  }) {
    return this.authSystem.requirePermission(permission, options);
  }

  /**
   * Get role-based middleware
   */
  requireRole(role: UserRole, scope?: PermissionScope, scopeId?: string) {
    return this.authSystem.requireRole(role, scope, scopeId);
  }

  /**
   * Get middleware requiring any of the specified roles
   */
  requireAnyRole(roles: UserRole[]) {
    return this.authSystem.requireAnyRole(roles);
  }

  /**
   * Get MFA requirement middleware
   */
  requireMFA() {
    return this.authSystem.requireMFA();
  }

  /**
   * Get financial approval middleware
   */
  requireFinancialApproval(amount: number) {
    return this.authSystem.requireFinancialApproval(amount);
  }

  /**
   * Get cultural protocols middleware
   */
  requireCulturalProtocols(protocols: string[]) {
    return this.authSystem.requireCulturalProtocols(protocols);
  }

  // === AUTHENTICATION OPERATIONS ===

  /**
   * Authenticate user with credentials
   */
  async authenticateUser(credentials: {
    email: string;
    password: string;
    mfaToken?: string;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
  }) {
    return this.authSystem.authService.authenticateUser(credentials);
  }

  /**
   * Refresh token pair
   */
  async refreshToken(refreshToken: string, options?: {
    rotateRefreshToken?: boolean;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.authSystem.tokenManager.refreshTokenPair({
      refreshToken,
      ...options
    });
  }

  /**
   * Revoke token(s)
   */
  async revokeToken(token: string, options?: {
    tokenTypeHint?: 'access_token' | 'refresh_token';
    revokeAllSessions?: boolean;
  }) {
    return this.authSystem.tokenManager.revokeToken({
      token,
      ...options
    });
  }

  /**
   * Logout user
   */
  async logout(accessToken: string) {
    return this.authSystem.authService.logout(accessToken);
  }

  // === PERMISSION CHECKING ===

  /**
   * Check if user has specific permission
   */
  async checkPermission(
    userId: string,
    permission: Permission,
    scope?: PermissionScope,
    scopeId?: string,
    context?: PermissionContext
  ) {
    return this.authSystem.rbacService.checkPermission(userId, permission, scope, scopeId, context);
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(
    userId: string,
    permissions: Permission[],
    scope?: PermissionScope,
    scopeId?: string,
    context?: PermissionContext
  ) {
    return this.authSystem.rbacService.checkMultiplePermissions(userId, permissions, scope, scopeId, context);
  }

  /**
   * Check permission from JWT token payload
   */
  async checkPermissionFromToken(
    token: string,
    permission: Permission,
    scope?: PermissionScope,
    scopeId?: string,
    context?: PermissionContext
  ) {
    const validation = await this.authSystem.jwtService.validateAccessToken(token);
    if (!validation.valid || !validation.payload) {
      throw new Error('Invalid token');
    }

    return this.authSystem.rbacService.checkPermissionFromToken(
      validation.payload,
      permission,
      scope,
      scopeId,
      context
    );
  }

  // === ROLE MANAGEMENT ===

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    role: UserRole,
    scope: PermissionScope,
    scopeId: string | undefined,
    assignedBy: string,
    assignmentReason: string,
    sovereigntyContext?: {
      traditionalOwnershipRecognised?: boolean;
      culturalProtocolsRequired?: string[];
      communityConsentGiven?: boolean;
      communityRepresentativeId?: string;
    }
  ) {
    return this.authSystem.rbacService.assignRole(
      userId,
      role,
      scope,
      scopeId,
      assignedBy,
      assignmentReason,
      sovereigntyContext
    );
  }

  /**
   * Remove role assignment
   */
  async removeRole(assignmentId: string) {
    return this.authSystem.rbacService.removeRole(assignmentId);
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string) {
    return this.authSystem.rbacService.getUserPermissions(userId);
  }

  /**
   * Check if user has any of specified roles
   */
  async userHasAnyRole(userId: string, roles: UserRole[]) {
    return this.authSystem.rbacService.userHasAnyRole(userId, roles);
  }

  // === SECURITY MONITORING ===

  /**
   * Perform security maintenance
   */
  async performMaintenance() {
    return this.authSystem.tokenManager.performMaintenance();
  }

  /**
   * Get security report
   */
  async getSecurityReport() {
    return this.authSystem.tokenManager.getSecurityReport();
  }

  /**
   * Get token information
   */
  async getTokenInfo(token: string) {
    return this.authSystem.tokenManager.getTokenInfo(token);
  }

  /**
   * Get RBAC cache statistics
   */
  getRBACCacheStats() {
    return this.authSystem.rbacService.getCacheStatistics();
  }

  /**
   * Get JWT service metrics
   */
  getJWTMetrics() {
    return this.authSystem.jwtService.getSecurityMetrics();
  }

  // === COMPLIANCE REPORTING ===

  /**
   * Get Australian compliance status
   */
  getComplianceStatus() {
    return {
      dataResidencyEnforced: this.config.compliance.enforceDataResidency,
      indigenousProtocolsRequired: this.config.compliance.requireIndigenousProtocols,
      auditingEnabled: this.config.compliance.auditAllTransactions,
      privacyActCompliant: this.config.compliance.privacyActCompliant,
      acncCompliant: this.config.compliance.acncCompliant,
      austracCompliant: this.config.compliance.austracCompliant,
      httpsRequired: this.config.security.requireHttps,
      mfaEnabled: this.config.security.enableMFA,
      tokenRotationEnabled: this.config.security.enableTokenRotation,
      permissionCachingEnabled: this.config.rbac.enablePermissionCaching,
      securityViolationLogging: this.config.rbac.logSecurityViolations
    };
  }

  /**
   * Get Indigenous sovereignty compliance status
   */
  getIndigenousSovereigntyStatus() {
    return {
      careCompliant: this.config.compliance.requireIndigenousProtocols,
      culturalProtocolsRequired: this.config.compliance.requireIndigenousProtocols,
      communityConsentTracking: this.config.compliance.auditAllTransactions,
      traditionalOwnershipRecognition: true, // Built into RBAC system
      dataGovernanceFramework: 'CARE_and_FAIR_principles',
      sovereigntyRolesImplemented: [
        'community_elder',
        'traditional_owner',
        'sovereignty_guardian',
        'community_representative'
      ]
    };
  }

  // === UTILITY METHODS ===

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string) {
    return this.authSystem.authService.validatePasswordStrength(password);
  }

  /**
   * Hash password
   */
  async hashPassword(password: string) {
    return this.authSystem.jwtService.hashPassword(password);
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string) {
    return this.authSystem.jwtService.verifyPassword(password, hash);
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length?: number) {
    return this.authSystem.jwtService.generateSecureToken(length);
  }

  /**
   * Get configuration
   */
  getConfig() {
    return this.config;
  }

  // === FACTORY METHOD ===

  /**
   * Create SecurityService with default Australian compliance settings
   */
  static createWithAustralianCompliance(
    secrets: {
      accessTokenSecret: string;
      refreshTokenSecret: string;
    },
    database: AuthDatabase & RBACDatabase,
    tokenStorage: TokenStorage,
    mfaService?: MFAService,
    overrides?: Partial<SecurityConfig>
  ) {
    const defaultConfig: SecurityConfig = {
      jwt: {
        accessTokenSecret: secrets.accessTokenSecret,
        refreshTokenSecret: secrets.refreshTokenSecret,
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '7d',
        algorithm: 'HS512',
        issuer: 'act-placemat',
        audience: 'act-placemat-users'
      },
      compliance: {
        enforceDataResidency: true,
        requireIndigenousProtocols: true,
        auditAllTransactions: true,
        privacyActCompliant: true,
        acncCompliant: true,
        austracCompliant: true
      },
      security: {
        requireHttps: true,
        enableMFA: true,
        maxSessionsPerUser: 3,
        sessionTimeoutMinutes: 60,
        enableTokenRotation: true,
        rateLimitingEnabled: true,
        maxRequestsPerMinute: 100
      },
      rbac: {
        enablePermissionCaching: true,
        cacheTimeoutMinutes: 15,
        enableContextualPermissions: true,
        auditAllPermissionChecks: true,
        logSecurityViolations: true
      },
      publicPaths: [
        '/health',
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/public/*'
      ]
    };

    const finalConfig = {
      ...defaultConfig,
      ...overrides,
      jwt: { ...defaultConfig.jwt, ...overrides?.jwt },
      compliance: { ...defaultConfig.compliance, ...overrides?.compliance },
      security: { ...defaultConfig.security, ...overrides?.security },
      rbac: { ...defaultConfig.rbac, ...overrides?.rbac },
      publicPaths: overrides?.publicPaths || defaultConfig.publicPaths
    };

    return new SecurityService(finalConfig, database, tokenStorage, mfaService);
  }
}