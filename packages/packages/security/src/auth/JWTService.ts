/**
 * JWT Authentication Service for ACT Placemat
 * 
 * Secure JWT token generation, validation, and management with RBAC integration
 * Designed for Australian compliance and Indigenous sovereignty recognition
 */

import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { UserRole, Permission, PermissionScope, SovereigntyLevel } from '../rbac/roles';

// === JWT CONFIGURATION ===

/**
 * JWT configuration schema
 */
export const JWTConfigSchema = z.object({
  // Signing configuration
  accessTokenSecret: z.string().min(32),
  refreshTokenSecret: z.string().min(32),
  
  // Token lifetimes
  accessTokenExpiresIn: z.string().default('15m'),
  refreshTokenExpiresIn: z.string().default('7d'),
  
  // Security settings
  algorithm: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).default('HS512'),
  issuer: z.string().default('act-placemat'),
  audience: z.string().default('act-placemat-users'),
  
  // Australian compliance
  enforceDataResidency: z.boolean().default(true),
  requireMFAForAdminRoles: z.boolean().default(true),
  maxSessionsPerUser: z.number().default(3),
  
  // Security constraints
  allowedIpRanges: z.array(z.string()).default([]),
  sessionTimeoutMinutes: z.number().default(60),
  requireSecureConnections: z.boolean().default(true)
});

export type JWTConfig = z.infer<typeof JWTConfigSchema>;

// === TOKEN PAYLOAD SCHEMAS ===

/**
 * Access token payload with RBAC claims
 */
export const AccessTokenPayloadSchema = z.object({
  // Standard JWT claims
  sub: z.string().uuid(), // User ID
  iss: z.string(),
  aud: z.string(),
  exp: z.number(),
  iat: z.number(),
  jti: z.string(), // JWT ID for revocation
  
  // User information
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  preferredName: z.string().optional(),
  
  // RBAC claims
  roles: z.array(z.object({
    role: z.nativeEnum(UserRole),
    scope: z.nativeEnum(PermissionScope),
    scopeId: z.string().optional(),
    assignedAt: z.string(), // ISO date
    expiresAt: z.string().optional() // ISO date
  })),
  
  permissions: z.array(z.nativeEnum(Permission)),
  
  // Australian context
  citizenship: z.enum(['citizen', 'permanent_resident', 'temporary_visa', 'other']).optional(),
  indigenousStatus: z.enum(['aboriginal', 'torres_strait_islander', 'both', 'neither']).optional(),
  
  // Community affiliations
  primaryCommunityId: z.string().uuid().optional(),
  traditionalCountry: z.string().optional(),
  
  // Indigenous sovereignty
  sovereigntyLevel: z.nativeEnum(SovereigntyLevel).optional(),
  culturalProtocols: z.array(z.string()).default([]),
  
  // Security context
  sessionId: z.string(),
  ipAddress: z.string(),
  mfaVerified: z.boolean().default(false),
  securityClearance: z.string().optional(),
  
  // Financial constraints
  financialApprovalLimit: z.number().default(0),
  
  // Australian compliance
  dataResidencyCompliant: z.boolean().default(true),
  privacyActConsent: z.boolean().default(false)
});

export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;

/**
 * Refresh token payload (minimal for security)
 */
export const RefreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  iss: z.string(),
  aud: z.string(),
  exp: z.number(),
  iat: z.number(),
  jti: z.string(),
  sessionId: z.string(),
  tokenFamily: z.string() // For rotation detection
});

export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;

// === AUTHENTICATION INTERFACES ===

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  mfaToken?: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
}

/**
 * Authentication result
 */
export interface AuthenticationResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: UserRole[];
  };
  expiresAt?: Date;
  requiresMFA?: boolean;
  errors?: string[];
  securityWarnings?: string[];
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: AccessTokenPayload;
  expired?: boolean;
  revoked?: boolean;
  errors?: string[];
  securityFlags?: string[];
}

/**
 * Session information
 */
export interface SessionInfo {
  sessionId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  mfaVerified: boolean;
  riskScore: number;
}

// === JWT SERVICE IMPLEMENTATION ===

export class JWTService {
  private config: JWTConfig;
  private revokedTokens: Set<string> = new Set(); // In production, use Redis or database
  private activeSessions: Map<string, SessionInfo> = new Map(); // In production, use Redis
  
  constructor(config: JWTConfig) {
    this.config = JWTConfigSchema.parse(config);
  }

  // === TOKEN GENERATION ===

  /**
   * Generate access token with full RBAC claims
   */
  async generateAccessToken(
    userId: string,
    userRoles: Array<{
      role: UserRole;
      scope: PermissionScope;
      scopeId?: string;
      assignedAt: Date;
      expiresAt?: Date;
    }>,
    userPermissions: Permission[],
    userInfo: {
      email: string;
      firstName: string;
      lastName: string;
      preferredName?: string;
      citizenship?: string;
      indigenousStatus?: string;
      primaryCommunityId?: string;
      traditionalCountry?: string;
      sovereigntyLevel?: SovereigntyLevel;
      culturalProtocols?: string[];
      financialApprovalLimit?: number;
      securityClearance?: string;
    },
    sessionContext: {
      sessionId: string;
      ipAddress: string;
      mfaVerified: boolean;
    }
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();
    
    const payload: AccessTokenPayload = {
      sub: userId,
      iss: this.config.issuer,
      aud: this.config.audience,
      exp: now + this.parseTimeToSeconds(this.config.accessTokenExpiresIn),
      iat: now,
      jti,
      
      email: userInfo.email,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      preferredName: userInfo.preferredName,
      
      roles: userRoles.map(role => ({
        role: role.role,
        scope: role.scope,
        scopeId: role.scopeId,
        assignedAt: role.assignedAt.toISOString(),
        expiresAt: role.expiresAt?.toISOString()
      })),
      
      permissions: userPermissions,
      
      citizenship: userInfo.citizenship as any,
      indigenousStatus: userInfo.indigenousStatus as any,
      primaryCommunityId: userInfo.primaryCommunityId,
      traditionalCountry: userInfo.traditionalCountry,
      sovereigntyLevel: userInfo.sovereigntyLevel,
      culturalProtocols: userInfo.culturalProtocols || [],
      
      sessionId: sessionContext.sessionId,
      ipAddress: sessionContext.ipAddress,
      mfaVerified: sessionContext.mfaVerified,
      securityClearance: userInfo.securityClearance,
      
      financialApprovalLimit: userInfo.financialApprovalLimit || 0,
      
      dataResidencyCompliant: this.config.enforceDataResidency,
      privacyActConsent: true // Would be determined from user consent records
    };

    return jwt.sign(payload, this.config.accessTokenSecret, {
      algorithm: this.config.algorithm as jwt.Algorithm
    });
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(
    userId: string,
    sessionId: string,
    tokenFamily?: string
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();
    
    const payload: RefreshTokenPayload = {
      sub: userId,
      iss: this.config.issuer,
      aud: this.config.audience,
      exp: now + this.parseTimeToSeconds(this.config.refreshTokenExpiresIn),
      iat: now,
      jti,
      sessionId,
      tokenFamily: tokenFamily || crypto.randomUUID()
    };

    return jwt.sign(payload, this.config.refreshTokenSecret, {
      algorithm: this.config.algorithm as jwt.Algorithm
    });
  }

  // === TOKEN VALIDATION ===

  /**
   * Validate and decode access token
   */
  async validateAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      // Check if token is revoked
      const decoded = jwt.decode(token) as any;
      if (decoded?.jti && this.revokedTokens.has(decoded.jti)) {
        return {
          valid: false,
          revoked: true,
          errors: ['Token has been revoked']
        };
      }

      // Verify token signature and expiration
      const payload = jwt.verify(token, this.config.accessTokenSecret, {
        algorithms: [this.config.algorithm as jwt.Algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as AccessTokenPayload;

      // Validate payload structure
      const validationResult = AccessTokenPayloadSchema.safeParse(payload);
      if (!validationResult.success) {
        return {
          valid: false,
          errors: ['Invalid token payload structure']
        };
      }

      // Check session validity
      const sessionInfo = this.activeSessions.get(payload.sessionId);
      if (!sessionInfo || !sessionInfo.isActive) {
        return {
          valid: false,
          errors: ['Session is no longer active']
        };
      }

      // Update last activity
      sessionInfo.lastActivity = new Date();

      // Check for security flags
      const securityFlags = await this.checkSecurityFlags(payload);

      return {
        valid: true,
        payload: validationResult.data,
        securityFlags
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          expired: true,
          errors: ['Token has expired']
        };
      }

      return {
        valid: false,
        errors: [`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<{ valid: boolean; payload?: RefreshTokenPayload; errors?: string[] }> {
    try {
      const payload = jwt.verify(token, this.config.refreshTokenSecret, {
        algorithms: [this.config.algorithm as jwt.Algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as RefreshTokenPayload;

      // Check if token is revoked
      if (this.revokedTokens.has(payload.jti)) {
        return {
          valid: false,
          errors: ['Refresh token has been revoked']
        };
      }

      return { valid: true, payload };

    } catch (error) {
      return {
        valid: false,
        errors: [`Refresh token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // === TOKEN MANAGEMENT ===

  /**
   * Revoke token by JTI
   */
  async revokeToken(jti: string): Promise<void> {
    this.revokedTokens.add(jti);
    // In production, store in Redis or database with TTL
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // In production, query database for all user tokens and revoke them
    for (const [sessionId, session] of this.activeSessions) {
      if (session.userId === userId) {
        session.isActive = false;
      }
    }
  }

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    mfaVerified: boolean = false
  ): Promise<SessionInfo> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.config.sessionTimeoutMinutes * 60 * 1000));

    const session: SessionInfo = {
      sessionId,
      userId,
      ipAddress,
      userAgent,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      isActive: true,
      mfaVerified,
      riskScore: await this.calculateRiskScore(userId, ipAddress, userAgent)
    };

    this.activeSessions.set(sessionId, session);
    
    // Enforce max sessions per user
    await this.enforceSessionLimits(userId);

    return session;
  }

  /**
   * Calculate risk score for session
   */
  private async calculateRiskScore(userId: string, ipAddress: string, userAgent: string): Promise<number> {
    let riskScore = 0;

    // Check if IP is in allowed ranges
    if (this.config.allowedIpRanges.length > 0) {
      const ipAllowed = this.config.allowedIpRanges.some(range => {
        // Simplified IP range check - use proper CIDR library in production
        return ipAddress.startsWith(range.split('/')[0]);
      });
      if (!ipAllowed) riskScore += 0.3;
    }

    // Check for unusual user agent patterns
    if (!userAgent || userAgent.length < 20) {
      riskScore += 0.2;
    }

    // Check for multiple concurrent sessions
    const userSessions = Array.from(this.activeSessions.values())
      .filter(s => s.userId === userId && s.isActive);
    if (userSessions.length > 2) {
      riskScore += 0.1 * (userSessions.length - 2);
    }

    return Math.min(riskScore, 1.0);
  }

  /**
   * Enforce session limits per user
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    const userSessions = Array.from(this.activeSessions.entries())
      .filter(([_, session]) => session.userId === userId && session.isActive)
      .sort((a, b) => b[1].lastActivity.getTime() - a[1].lastActivity.getTime());

    // Keep only the most recent sessions up to the limit
    if (userSessions.length > this.config.maxSessionsPerUser) {
      const sessionsToRevoke = userSessions.slice(this.config.maxSessionsPerUser);
      for (const [sessionId, session] of sessionsToRevoke) {
        session.isActive = false;
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Check for security flags
   */
  private async checkSecurityFlags(payload: AccessTokenPayload): Promise<string[]> {
    const flags: string[] = [];

    // Check if admin role without MFA
    const hasAdminRole = payload.roles.some(r => 
      ['super_admin', 'system_admin', 'security_admin'].includes(r.role)
    );
    
    if (hasAdminRole && !payload.mfaVerified && this.config.requireMFAForAdminRoles) {
      flags.push('admin_role_without_mfa');
    }

    // Check session age
    const sessionAge = Date.now() / 1000 - payload.iat;
    if (sessionAge > this.config.sessionTimeoutMinutes * 60) {
      flags.push('session_expired');
    }

    // Check for unusual IP patterns
    const session = this.activeSessions.get(payload.sessionId);
    if (session && session.riskScore > 0.5) {
      flags.push('high_risk_session');
    }

    return flags;
  }

  // === UTILITY METHODS ===

  /**
   * Parse time string to seconds
   */
  private parseTimeToSeconds(timeString: string): number {
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid time format: ${timeString}`);

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Strong salt for Australian compliance
    return bcryptjs.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Get active sessions for user
   */
  getUserSessions(userId: string): SessionInfo[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.isActive);
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [sessionId, session] of this.activeSessions) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics() {
    const totalSessions = this.activeSessions.size;
    const activeSessions = Array.from(this.activeSessions.values())
      .filter(s => s.isActive).length;
    const highRiskSessions = Array.from(this.activeSessions.values())
      .filter(s => s.riskScore > 0.5).length;
    const mfaVerifiedSessions = Array.from(this.activeSessions.values())
      .filter(s => s.mfaVerified).length;

    return {
      totalSessions,
      activeSessions,
      highRiskSessions,
      mfaVerifiedSessions,
      revokedTokensCount: this.revokedTokens.size,
      lastCleanup: new Date().toISOString()
    };
  }
}

// === AUTHENTICATION ERRORS ===

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// === CONSTANTS ===

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'MFA_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_LIMIT_EXCEEDED: 'SESSION_LIMIT_EXCEEDED',
  IP_NOT_ALLOWED: 'IP_NOT_ALLOWED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  SOVEREIGNTY_VIOLATION: 'SOVEREIGNTY_VIOLATION',
  COMPLIANCE_VIOLATION: 'COMPLIANCE_VIOLATION'
} as const;