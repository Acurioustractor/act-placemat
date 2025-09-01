/**
 * Token Management Service for ACT Placemat
 * 
 * Advanced token lifecycle management including refresh, revocation,
 * rotation, and security monitoring
 */

import { JWTService, RefreshTokenPayload, AccessTokenPayload } from './JWTService';
import { UserRole, Permission, PermissionScope } from '../rbac/roles';
import { z } from 'zod';
import crypto from 'crypto';

// === TOKEN MANAGEMENT INTERFACES ===

/**
 * Token pair structure
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  refreshToken: string;
  rotateRefreshToken?: boolean;
  clientId?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Token revocation request
 */
export interface TokenRevocationRequest {
  token: string;
  tokenTypeHint?: 'access_token' | 'refresh_token';
  revokeAllSessions?: boolean;
}

/**
 * Active token information
 */
export interface ActiveTokenInfo {
  jti: string;
  userId: string;
  sessionId: string;
  tokenType: 'access' | 'refresh';
  issuedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  lastUsed?: Date;
  clientInfo: {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
  };
  securityFlags: string[];
}

/**
 * Token usage statistics
 */
export interface TokenUsageStats {
  totalActiveTokens: number;
  totalActiveSessions: number;
  tokensIssuedToday: number;
  tokensRevokedToday: number;
  suspiciousActivityCount: number;
  averageSessionDuration: number;
}

// === TOKEN STORAGE INTERFACE ===

export interface TokenStorage {
  // Token tracking
  storeTokenInfo(info: ActiveTokenInfo): Promise<void>;
  getTokenInfo(jti: string): Promise<ActiveTokenInfo | null>;
  updateTokenLastUsed(jti: string): Promise<void>;
  revokeToken(jti: string, reason: string): Promise<void>;
  
  // Session management
  getUserActiveSessions(userId: string): Promise<ActiveTokenInfo[]>;
  revokeAllUserTokens(userId: string, reason: string): Promise<void>;
  revokeTokenFamily(familyId: string, reason: string): Promise<void>;
  
  // Cleanup and monitoring
  cleanupExpiredTokens(): Promise<number>;
  getTokenUsageStats(): Promise<TokenUsageStats>;
  
  // Security monitoring
  recordSuspiciousActivity(activity: SuspiciousActivity): Promise<void>;
  getRecentSuspiciousActivity(hours: number): Promise<SuspiciousActivity[]>;
}

/**
 * Suspicious activity record
 */
export interface SuspiciousActivity {
  id: string;
  userId?: string;
  sessionId?: string;
  activityType: 'token_reuse' | 'rapid_refresh' | 'unusual_location' | 'concurrent_sessions' | 'token_leakage';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

// === TOKEN MANAGER IMPLEMENTATION ===

export class TokenManager {
  private jwtService: JWTService;
  private storage: TokenStorage;
  private config: {
    maxSessionsPerUser: number;
    maxRefreshesPerHour: number;
    enableTokenRotation: boolean;
    suspiciousActivityThreshold: number;
    automaticRevocationEnabled: boolean;
    tokenFamilyTrackingEnabled: boolean;
  };

  // In-memory tracking for rate limiting
  private refreshAttempts: Map<string, { count: number; resetTime: number }> = new Map();
  private tokenFamilies: Map<string, string[]> = new Map(); // familyId -> [jti, jti, ...]

  constructor(
    jwtService: JWTService,
    storage: TokenStorage,
    config?: Partial<typeof TokenManager.prototype.config>
  ) {
    this.jwtService = jwtService;
    this.storage = storage;
    this.config = {
      maxSessionsPerUser: 5,
      maxRefreshesPerHour: 20,
      enableTokenRotation: true,
      suspiciousActivityThreshold: 3,
      automaticRevocationEnabled: true,
      tokenFamilyTrackingEnabled: true,
      ...config
    };
  }

  // === TOKEN LIFECYCLE MANAGEMENT ===

  /**
   * Issue new token pair with comprehensive tracking
   */
  async issueTokenPair(
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
      sovereigntyLevel?: any;
      culturalProtocols?: string[];
      financialApprovalLimit?: number;
      securityClearance?: string;
    },
    sessionContext: {
      ipAddress: string;
      userAgent: string;
      deviceFingerprint?: string;
      mfaVerified: boolean;
    }
  ): Promise<TokenPair> {
    // Create session
    const session = await this.jwtService.createSession(
      userId,
      sessionContext.ipAddress,
      sessionContext.userAgent,
      sessionContext.mfaVerified
    );

    // Generate token family ID for rotation tracking
    const tokenFamily = crypto.randomUUID();

    // Generate tokens
    const accessToken = await this.jwtService.generateAccessToken(
      userId,
      userRoles,
      userPermissions,
      userInfo,
      {
        sessionId: session.sessionId,
        ipAddress: sessionContext.ipAddress,
        mfaVerified: sessionContext.mfaVerified
      }
    );

    const refreshToken = await this.jwtService.generateRefreshToken(
      userId,
      session.sessionId,
      tokenFamily
    );

    // Decode tokens to get JTIs
    const accessPayload = this.jwtService['jwt'].decode(accessToken) as any;
    const refreshPayload = this.jwtService['jwt'].decode(refreshToken) as any;

    // Store token information
    await this.storage.storeTokenInfo({
      jti: accessPayload.jti,
      userId,
      sessionId: session.sessionId,
      tokenType: 'access',
      issuedAt: new Date(accessPayload.iat * 1000),
      expiresAt: new Date(accessPayload.exp * 1000),
      isActive: true,
      clientInfo: {
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        deviceFingerprint: sessionContext.deviceFingerprint
      },
      securityFlags: []
    });

    await this.storage.storeTokenInfo({
      jti: refreshPayload.jti,
      userId,
      sessionId: session.sessionId,
      tokenType: 'refresh',
      issuedAt: new Date(refreshPayload.iat * 1000),
      expiresAt: new Date(refreshPayload.exp * 1000),
      isActive: true,
      clientInfo: {
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        deviceFingerprint: sessionContext.deviceFingerprint
      },
      securityFlags: []
    });

    // Track token family
    if (this.config.tokenFamilyTrackingEnabled) {
      this.tokenFamilies.set(tokenFamily, [accessPayload.jti, refreshPayload.jti]);
    }

    // Check for excessive sessions
    await this.enforceSessionLimits(userId);

    return {
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
      tokenType: 'Bearer'
    };
  }

  /**
   * Refresh token with rotation and security checks
   */
  async refreshTokenPair(request: TokenRefreshRequest): Promise<TokenPair> {
    // Validate refresh token
    const validation = await this.jwtService.validateRefreshToken(request.refreshToken);
    if (!validation.valid || !validation.payload) {
      throw new Error('Invalid refresh token');
    }

    const { sub: userId, sessionId, jti, tokenFamily } = validation.payload;

    // Check rate limiting
    if (!this.checkRefreshRateLimit(userId)) {
      await this.recordSuspiciousActivity({
        userId,
        sessionId,
        activityType: 'rapid_refresh',
        description: 'Excessive token refresh attempts',
        severity: 'medium',
        metadata: { 
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          attempts: this.getRefreshAttemptCount(userId)
        }
      });
      throw new Error('Refresh rate limit exceeded');
    }

    // Check if token is still active in storage
    const tokenInfo = await this.storage.getTokenInfo(jti);
    if (!tokenInfo || !tokenInfo.isActive) {
      throw new Error('Refresh token has been revoked');
    }

    // Detect token reuse (potential security breach)
    if (tokenInfo.lastUsed) {
      await this.handlePotentialTokenReuse(tokenInfo, request);
    }

    // Update token usage
    await this.storage.updateTokenLastUsed(jti);

    // Get current user data (would integrate with user service)
    const userRoles: any[] = []; // Would fetch from database
    const userPermissions: any[] = []; // Would fetch from RBAC service
    const userInfo: any = {}; // Would fetch from user service

    // Create new session context
    const sessionContext = {
      ipAddress: request.ipAddress || tokenInfo.clientInfo.ipAddress,
      userAgent: request.userAgent || tokenInfo.clientInfo.userAgent,
      deviceFingerprint: tokenInfo.clientInfo.deviceFingerprint,
      mfaVerified: true // Would be carried over from original authentication
    };

    // Generate new access token
    const newAccessToken = await this.jwtService.generateAccessToken(
      userId,
      userRoles,
      userPermissions,
      userInfo,
      {
        sessionId,
        ipAddress: sessionContext.ipAddress,
        mfaVerified: sessionContext.mfaVerified
      }
    );

    let newRefreshToken = request.refreshToken;
    let newRefreshJti = jti;

    // Rotate refresh token if enabled
    if (this.config.enableTokenRotation || request.rotateRefreshToken) {
      // Revoke old refresh token
      await this.storage.revokeToken(jti, 'token_rotation');

      // Generate new refresh token
      newRefreshToken = await this.jwtService.generateRefreshToken(
        userId,
        sessionId,
        tokenFamily
      );

      const newRefreshPayload = this.jwtService['jwt'].decode(newRefreshToken) as RefreshTokenPayload;
      newRefreshJti = newRefreshPayload.jti;

      // Store new refresh token info
      await this.storage.storeTokenInfo({
        jti: newRefreshJti,
        userId,
        sessionId,
        tokenType: 'refresh',
        issuedAt: new Date(newRefreshPayload.iat * 1000),
        expiresAt: new Date(newRefreshPayload.exp * 1000),
        isActive: true,
        clientInfo: sessionContext,
        securityFlags: []
      });

      // Update token family tracking
      if (this.config.tokenFamilyTrackingEnabled && tokenFamily) {
        const familyTokens = this.tokenFamilies.get(tokenFamily) || [];
        familyTokens.push(newRefreshJti);
        this.tokenFamilies.set(tokenFamily, familyTokens);
      }
    }

    // Store new access token info
    const newAccessPayload = this.jwtService['jwt'].decode(newAccessToken) as AccessTokenPayload;
    await this.storage.storeTokenInfo({
      jti: newAccessPayload.jti,
      userId,
      sessionId,
      tokenType: 'access',
      issuedAt: new Date(newAccessPayload.iat * 1000),
      expiresAt: new Date(newAccessPayload.exp * 1000),
      isActive: true,
      clientInfo: sessionContext,
      securityFlags: []
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: new Date(newAccessPayload.exp * 1000),
      tokenType: 'Bearer'
    };
  }

  /**
   * Revoke token(s) with comprehensive cleanup
   */
  async revokeToken(request: TokenRevocationRequest): Promise<void> {
    const token = request.token;
    
    try {
      // Determine token type
      let tokenInfo: any;
      
      if (request.tokenTypeHint === 'refresh_token') {
        const validation = await this.jwtService.validateRefreshToken(token);
        tokenInfo = validation.payload;
      } else {
        const validation = await this.jwtService.validateAccessToken(token);
        tokenInfo = validation.payload;
      }

      if (!tokenInfo) {
        return; // Token already invalid, consider it revoked
      }

      // Revoke the specific token
      await this.storage.revokeToken(tokenInfo.jti, 'user_requested');

      // If revoking all sessions
      if (request.revokeAllSessions) {
        await this.storage.revokeAllUserTokens(tokenInfo.sub, 'revoke_all_sessions');
      }

      // If token has a family (refresh token rotation), revoke the family
      if (this.config.tokenFamilyTrackingEnabled && tokenInfo.tokenFamily) {
        await this.storage.revokeTokenFamily(tokenInfo.tokenFamily, 'token_family_revocation');
      }

    } catch (error) {
      // Token might be malformed, but still attempt to revoke by JTI if possible
      const decoded = this.jwtService['jwt'].decode(token) as any;
      if (decoded?.jti) {
        await this.storage.revokeToken(decoded.jti, 'malformed_token_revocation');
      }
    }
  }

  // === SECURITY MONITORING ===

  /**
   * Handle potential token reuse (security incident)
   */
  private async handlePotentialTokenReuse(
    tokenInfo: ActiveTokenInfo,
    request: TokenRefreshRequest
  ): Promise<void> {
    await this.recordSuspiciousActivity({
      userId: tokenInfo.userId,
      sessionId: tokenInfo.sessionId,
      activityType: 'token_reuse',
      description: 'Potential refresh token reuse detected',
      severity: 'high',
      metadata: {
        originalIp: tokenInfo.clientInfo.ipAddress,
        currentIp: request.ipAddress,
        originalUserAgent: tokenInfo.clientInfo.userAgent,
        currentUserAgent: request.userAgent,
        lastUsed: tokenInfo.lastUsed,
        timeSinceLastUse: Date.now() - (tokenInfo.lastUsed?.getTime() || 0)
      }
    });

    // If automatic revocation is enabled, revoke all tokens for this user
    if (this.config.automaticRevocationEnabled) {
      await this.storage.revokeAllUserTokens(
        tokenInfo.userId,
        'suspected_token_compromise'
      );
      
      throw new Error('Token compromise detected. All sessions have been revoked for security.');
    }
  }

  /**
   * Record suspicious activity
   */
  private async recordSuspiciousActivity(activity: Omit<SuspiciousActivity, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const fullActivity: SuspiciousActivity = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      resolved: false,
      ...activity
    };

    await this.storage.recordSuspiciousActivity(fullActivity);

    // Check if we've reached the threshold for this user
    if (activity.userId) {
      const recentActivity = await this.storage.getRecentSuspiciousActivity(24);
      const userActivity = recentActivity.filter(a => a.userId === activity.userId);

      if (userActivity.length >= this.config.suspiciousActivityThreshold) {
        // Automatically revoke all user tokens
        await this.storage.revokeAllUserTokens(
          activity.userId,
          'suspicious_activity_threshold_exceeded'
        );

        console.warn(`Automatic token revocation for user ${activity.userId} due to suspicious activity`);
      }
    }
  }

  /**
   * Check refresh rate limiting
   */
  private checkRefreshRateLimit(userId: string): boolean {
    const now = Date.now();
    const hourStart = now - (60 * 60 * 1000);

    const attempts = this.refreshAttempts.get(userId);
    
    if (!attempts || attempts.resetTime < hourStart) {
      this.refreshAttempts.set(userId, { count: 1, resetTime: now });
      return true;
    }

    if (attempts.count >= this.config.maxRefreshesPerHour) {
      return false;
    }

    attempts.count++;
    return true;
  }

  /**
   * Get refresh attempt count for user
   */
  private getRefreshAttemptCount(userId: string): number {
    return this.refreshAttempts.get(userId)?.count || 0;
  }

  /**
   * Enforce session limits per user
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    const activeSessions = await this.storage.getUserActiveSessions(userId);
    
    if (activeSessions.length > this.config.maxSessionsPerUser) {
      // Sort by last used (oldest first) and revoke excess sessions
      const sortedSessions = activeSessions.sort((a, b) => 
        (a.lastUsed?.getTime() || 0) - (b.lastUsed?.getTime() || 0)
      );

      const sessionsToRevoke = sortedSessions.slice(0, sortedSessions.length - this.config.maxSessionsPerUser);
      
      for (const session of sessionsToRevoke) {
        await this.storage.revokeToken(session.jti, 'session_limit_exceeded');
      }
    }
  }

  // === MAINTENANCE AND MONITORING ===

  /**
   * Cleanup expired tokens and perform maintenance
   */
  async performMaintenance(): Promise<{
    tokensCleanedUp: number;
    suspiciousActivitiesFound: number;
    performanceMetrics: TokenUsageStats;
  }> {
    // Cleanup expired tokens
    const tokensCleanedUp = await this.storage.cleanupExpiredTokens();

    // Check for suspicious activities
    const recentActivity = await this.storage.getRecentSuspiciousActivity(24);
    const unresolved = recentActivity.filter(a => !a.resolved);

    // Get performance metrics
    const performanceMetrics = await this.storage.getTokenUsageStats();

    // Clean up in-memory rate limiting data
    this.cleanupRateLimitData();

    return {
      tokensCleanedUp,
      suspiciousActivitiesFound: unresolved.length,
      performanceMetrics
    };
  }

  /**
   * Clean up expired rate limit data
   */
  private cleanupRateLimitData(): void {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);

    for (const [userId, attempts] of this.refreshAttempts) {
      if (attempts.resetTime < hourAgo) {
        this.refreshAttempts.delete(userId);
      }
    }
  }

  /**
   * Get comprehensive security report
   */
  async getSecurityReport(): Promise<{
    tokenStats: TokenUsageStats;
    suspiciousActivities: SuspiciousActivity[];
    rateLimitStats: {
      activeRateLimits: number;
      totalRefreshAttempts: number;
    };
    recommendations: string[];
  }> {
    const tokenStats = await this.storage.getTokenUsageStats();
    const suspiciousActivities = await this.storage.getRecentSuspiciousActivity(168); // 7 days

    const recommendations: string[] = [];

    // Generate security recommendations
    if (suspiciousActivities.filter(a => !a.resolved).length > 10) {
      recommendations.push('High number of unresolved suspicious activities detected');
    }

    if (tokenStats.averageSessionDuration > 24 * 60 * 60 * 1000) { // 24 hours
      recommendations.push('Consider reducing session timeout for better security');
    }

    if (tokenStats.suspiciousActivityCount > tokenStats.totalActiveSessions * 0.1) {
      recommendations.push('Suspicious activity rate is high - review authentication policies');
    }

    return {
      tokenStats,
      suspiciousActivities,
      rateLimitStats: {
        activeRateLimits: this.refreshAttempts.size,
        totalRefreshAttempts: Array.from(this.refreshAttempts.values())
          .reduce((sum, attempts) => sum + attempts.count, 0)
      },
      recommendations
    };
  }

  /**
   * Get token information for debugging
   */
  async getTokenInfo(token: string): Promise<ActiveTokenInfo | null> {
    try {
      const decoded = this.jwtService['jwt'].decode(token) as any;
      if (!decoded?.jti) return null;

      return await this.storage.getTokenInfo(decoded.jti);
    } catch (error) {
      return null;
    }
  }
}