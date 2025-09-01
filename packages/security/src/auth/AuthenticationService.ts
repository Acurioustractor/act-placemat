/**
 * Authentication Service for ACT Placemat
 * 
 * Complete user authentication flow with RBAC integration, MFA support,
 * and Australian compliance features
 */

import { JWTService, LoginCredentials, AuthenticationResult, AUTH_ERROR_CODES, AuthenticationError } from './JWTService';
import { UserRole, Permission, PermissionScope, SovereigntyLevel } from '../rbac/roles';
import { ROLE_PERMISSIONS, ROLE_DEFAULT_SCOPES, ROLE_SOVEREIGNTY_LEVELS, FINANCIAL_APPROVAL_THRESHOLDS } from '../rbac/permissions-matrix';
import { z } from 'zod';
import crypto from 'crypto';

// === USER DATA INTERFACES ===

/**
 * User database record structure
 */
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  
  // Australian context
  citizenship_status?: 'citizen' | 'permanent_resident' | 'temporary_visa' | 'other';
  indigenous_status?: 'aboriginal' | 'torres_strait_islander' | 'both' | 'neither';
  
  // Community affiliations
  primary_community_id?: string;
  traditional_country?: string;
  cultural_protocols_acknowledged: boolean;
  
  // Account status
  is_active: boolean;
  is_verified: boolean;
  email_verified_at?: Date;
  last_login_at?: Date;
  
  // Security
  mfa_enabled: boolean;
  mfa_secret?: string;
  security_clearance_level?: string;
  failed_login_attempts: number;
  locked_until?: Date;
  
  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * User role assignment record
 */
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role: UserRole;
  scope: PermissionScope;
  scope_id?: string;
  assigned_at: Date;
  expires_at?: Date;
  
  // Indigenous sovereignty context
  traditional_ownership_recognised: boolean;
  cultural_protocols_required: string[];
  community_consent_given: boolean;
  community_representative_id?: string;
  
  is_active: boolean;
}

/**
 * MFA verification result
 */
export interface MFAVerificationResult {
  verified: boolean;
  backupCodeUsed?: boolean;
  errors?: string[];
}

// === DATABASE INTERFACE ===

/**
 * Database interface for authentication operations
 */
export interface AuthDatabase {
  // User operations
  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserById(id: string): Promise<UserRecord | null>;
  updateUserLoginInfo(userId: string, ipAddress: string, userAgent: string): Promise<void>;
  incrementFailedLoginAttempts(userId: string): Promise<number>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  lockUserAccount(userId: string, lockDuration: number): Promise<void>;
  
  // Role assignments
  getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]>;
  
  // MFA operations
  storeMFASecret(userId: string, secret: string): Promise<void>;
  getMFASecret(userId: string): Promise<string | null>;
  storeBackupCodes(userId: string, codes: string[]): Promise<void>;
  useBackupCode(userId: string, code: string): Promise<boolean>;
  
  // Audit logging
  logAuthenticationAttempt(
    userId: string | null,
    email: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    failureReason?: string
  ): Promise<void>;
}

// === MFA SERVICE INTERFACE ===

/**
 * Multi-Factor Authentication service interface
 */
export interface MFAService {
  generateSecret(): string;
  generateQRCode(secret: string, email: string): Promise<string>;
  verifyToken(secret: string, token: string): boolean;
  generateBackupCodes(): string[];
}

// === AUTHENTICATION SERVICE ===

export class AuthenticationService {
  private jwtService: JWTService;
  private database: AuthDatabase;
  private mfaService?: MFAService;
  
  // Security configuration
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly ACCOUNT_LOCK_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly ADMIN_ROLES = ['super_admin', 'system_admin', 'security_admin'];

  constructor(
    jwtService: JWTService,
    database: AuthDatabase,
    mfaService?: MFAService
  ) {
    this.jwtService = jwtService;
    this.database = database;
    this.mfaService = mfaService;
  }

  // === AUTHENTICATION FLOW ===

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(credentials: LoginCredentials): Promise<AuthenticationResult> {
    try {
      // Log authentication attempt
      await this.database.logAuthenticationAttempt(
        null,
        credentials.email,
        false,
        credentials.ipAddress,
        credentials.userAgent,
        'attempt_started'
      );

      // Retrieve user by email
      const user = await this.database.getUserByEmail(credentials.email);
      if (!user) {
        await this.database.logAuthenticationAttempt(
          null,
          credentials.email,
          false,
          credentials.ipAddress,
          credentials.userAgent,
          'user_not_found'
        );
        
        return {
          success: false,
          errors: ['Invalid credentials']
        };
      }

      // Check if account is active
      if (!user.is_active) {
        await this.database.logAuthenticationAttempt(
          user.id,
          credentials.email,
          false,
          credentials.ipAddress,
          credentials.userAgent,
          'account_disabled'
        );
        
        throw new AuthenticationError(
          'Account is disabled',
          AUTH_ERROR_CODES.ACCOUNT_DISABLED
        );
      }

      // Check if account is locked
      if (user.locked_until && user.locked_until > new Date()) {
        await this.database.logAuthenticationAttempt(
          user.id,
          credentials.email,
          false,
          credentials.ipAddress,
          credentials.userAgent,
          'account_locked'
        );
        
        throw new AuthenticationError(
          'Account is temporarily locked due to failed login attempts',
          AUTH_ERROR_CODES.ACCOUNT_LOCKED
        );
      }

      // Verify password
      const passwordValid = await this.jwtService.verifyPassword(
        credentials.password,
        user.password_hash
      );

      if (!passwordValid) {
        // Increment failed attempts
        const failedAttempts = await this.database.incrementFailedLoginAttempts(user.id);
        
        // Lock account if max attempts reached
        if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          await this.database.lockUserAccount(user.id, this.ACCOUNT_LOCK_DURATION);
        }

        await this.database.logAuthenticationAttempt(
          user.id,
          credentials.email,
          false,
          credentials.ipAddress,
          credentials.userAgent,
          'invalid_password'
        );

        return {
          success: false,
          errors: ['Invalid credentials']
        };
      }

      // Check MFA requirements
      const userRoles = await this.database.getUserRoleAssignments(user.id);
      const hasAdminRole = userRoles.some(assignment => 
        this.ADMIN_ROLES.includes(assignment.role) && assignment.is_active
      );

      if (user.mfa_enabled || hasAdminRole) {
        if (!credentials.mfaToken) {
          return {
            success: false,
            requiresMFA: true,
            errors: ['Multi-factor authentication required']
          };
        }

        const mfaResult = await this.verifyMFA(user.id, credentials.mfaToken);
        if (!mfaResult.verified) {
          await this.database.logAuthenticationAttempt(
            user.id,
            credentials.email,
            false,
            credentials.ipAddress,
            credentials.userAgent,
            'mfa_failed'
          );

          return {
            success: false,
            errors: mfaResult.errors || ['Invalid MFA token']
          };
        }
      }

      // Reset failed login attempts on successful authentication
      await this.database.resetFailedLoginAttempts(user.id);

      // Create session
      const session = await this.jwtService.createSession(
        user.id,
        credentials.ipAddress,
        credentials.userAgent,
        !!(credentials.mfaToken || user.mfa_enabled)
      );

      // Get user permissions and roles
      const { permissions, roleAssignments } = await this.getUserPermissions(user.id);
      
      // Get sovereignty information
      const sovereigntyInfo = this.getSovereigntyInfo(user, userRoles);

      // Generate tokens
      const accessToken = await this.jwtService.generateAccessToken(
        user.id,
        roleAssignments,
        permissions,
        {
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          preferredName: user.preferred_name,
          citizenship: user.citizenship_status,
          indigenousStatus: user.indigenous_status,
          primaryCommunityId: user.primary_community_id,
          traditionalCountry: user.traditional_country,
          sovereigntyLevel: sovereigntyInfo.level,
          culturalProtocols: sovereigntyInfo.protocols,
          financialApprovalLimit: this.getFinancialApprovalLimit(userRoles),
          securityClearance: user.security_clearance_level
        },
        {
          sessionId: session.sessionId,
          ipAddress: credentials.ipAddress,
          mfaVerified: !!(credentials.mfaToken || user.mfa_enabled)
        }
      );

      const refreshToken = await this.jwtService.generateRefreshToken(
        user.id,
        session.sessionId
      );

      // Update user login information
      await this.database.updateUserLoginInfo(
        user.id,
        credentials.ipAddress,
        credentials.userAgent
      );

      // Log successful authentication
      await this.database.logAuthenticationAttempt(
        user.id,
        credentials.email,
        true,
        credentials.ipAddress,
        credentials.userAgent
      );

      return {
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          roles: userRoles.filter(r => r.is_active).map(r => r.role)
        },
        expiresAt: session.expiresAt
      };

    } catch (error) {
      if (error instanceof AuthenticationError) {
        return {
          success: false,
          errors: [error.message]
        };
      }

      // Log unexpected errors
      console.error('Authentication error:', error);
      
      return {
        success: false,
        errors: ['Authentication failed due to an internal error']
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthenticationResult> {
    try {
      // Validate refresh token
      const validation = await this.jwtService.validateRefreshToken(refreshToken);
      if (!validation.valid || !validation.payload) {
        return {
          success: false,
          errors: validation.errors || ['Invalid refresh token']
        };
      }

      const { sub: userId, sessionId } = validation.payload;

      // Get current user data
      const user = await this.database.getUserById(userId);
      if (!user || !user.is_active) {
        return {
          success: false,
          errors: ['User account not found or inactive']
        };
      }

      // Get user permissions and roles
      const { permissions, roleAssignments } = await this.getUserPermissions(userId);
      const userRoles = await this.database.getUserRoleAssignments(userId);
      const sovereigntyInfo = this.getSovereigntyInfo(user, userRoles);

      // Generate new access token
      const accessToken = await this.jwtService.generateAccessToken(
        userId,
        roleAssignments,
        permissions,
        {
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          preferredName: user.preferred_name,
          citizenship: user.citizenship_status,
          indigenousStatus: user.indigenous_status,
          primaryCommunityId: user.primary_community_id,
          traditionalCountry: user.traditional_country,
          sovereigntyLevel: sovereigntyInfo.level,
          culturalProtocols: sovereigntyInfo.protocols,
          financialApprovalLimit: this.getFinancialApprovalLimit(userRoles),
          securityClearance: user.security_clearance_level
        },
        {
          sessionId,
          ipAddress: '', // Would be extracted from request context
          mfaVerified: user.mfa_enabled
        }
      );

      return {
        success: true,
        accessToken,
        refreshToken, // Return same refresh token
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          roles: userRoles.filter(r => r.is_active).map(r => r.role)
        }
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        errors: ['Token refresh failed']
      };
    }
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(accessToken: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const validation = await this.jwtService.validateAccessToken(accessToken);
      if (!validation.valid || !validation.payload) {
        return {
          success: false,
          errors: ['Invalid access token']
        };
      }

      // Revoke the token
      await this.jwtService.revokeToken(validation.payload.jti);

      return { success: true };

    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        errors: ['Logout failed']
      };
    }
  }

  // === MFA OPERATIONS ===

  /**
   * Verify MFA token
   */
  private async verifyMFA(userId: string, token: string): Promise<MFAVerificationResult> {
    if (!this.mfaService) {
      return {
        verified: false,
        errors: ['MFA service not configured']
      };
    }

    try {
      // Get stored MFA secret
      const secret = await this.database.getMFASecret(userId);
      if (!secret) {
        return {
          verified: false,
          errors: ['MFA not set up for this account']
        };
      }

      // Verify TOTP token
      const verified = this.mfaService.verifyToken(secret, token);
      if (verified) {
        return { verified: true };
      }

      // Try backup codes if TOTP failed
      const backupCodeUsed = await this.database.useBackupCode(userId, token);
      if (backupCodeUsed) {
        return { verified: true, backupCodeUsed: true };
      }

      return {
        verified: false,
        errors: ['Invalid MFA token']
      };

    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        verified: false,
        errors: ['MFA verification failed']
      };
    }
  }

  // === PERMISSION RESOLUTION ===

  /**
   * Get all permissions for a user based on their active roles
   */
  private async getUserPermissions(userId: string): Promise<{
    permissions: Permission[];
    roleAssignments: Array<{
      role: UserRole;
      scope: PermissionScope;
      scopeId?: string;
      assignedAt: Date;
      expiresAt?: Date;
    }>;
  }> {
    const roleAssignments = await this.database.getUserRoleAssignments(userId);
    const activeRoles = roleAssignments.filter(assignment => 
      assignment.is_active && 
      (!assignment.expires_at || assignment.expires_at > new Date())
    );

    // Collect all permissions from active roles
    const allPermissions = new Set<Permission>();
    
    for (const assignment of activeRoles) {
      const rolePermissions = ROLE_PERMISSIONS[assignment.role] || [];
      rolePermissions.forEach(permission => allPermissions.add(permission));
    }

    return {
      permissions: Array.from(allPermissions),
      roleAssignments: activeRoles.map(assignment => ({
        role: assignment.role,
        scope: assignment.scope,
        scopeId: assignment.scope_id,
        assignedAt: assignment.assigned_at,
        expiresAt: assignment.expires_at
      }))
    };
  }

  /**
   * Get sovereignty information for user
   */
  private getSovereigntyInfo(user: UserRecord, roleAssignments: UserRoleAssignment[]): {
    level?: SovereigntyLevel;
    protocols: string[];
  } {
    // Check for Indigenous sovereignty roles
    for (const assignment of roleAssignments) {
      if (assignment.is_active) {
        const sovereigntyLevel = ROLE_SOVEREIGNTY_LEVELS[assignment.role];
        if (sovereigntyLevel) {
          return {
            level: sovereigntyLevel,
            protocols: assignment.cultural_protocols_required
          };
        }
      }
    }

    // Default based on Indigenous status
    if (user.indigenous_status && user.indigenous_status !== 'neither') {
      return {
        level: SovereigntyLevel.GENERAL_RESPECT,
        protocols: ['CARE_principles']
      };
    }

    return { protocols: [] };
  }

  /**
   * Get financial approval limit for user
   */
  private getFinancialApprovalLimit(roleAssignments: UserRoleAssignment[]): number {
    let maxLimit = 0;

    for (const assignment of roleAssignments) {
      if (assignment.is_active) {
        const limit = FINANCIAL_APPROVAL_THRESHOLDS[assignment.role] || 0;
        maxLimit = Math.max(maxLimit, limit);
      }
    }

    return maxLimit;
  }

  // === SECURITY UTILITIES ===

  /**
   * Generate secure password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.database.getUserByEmail(email);
    if (!user || !user.is_active) {
      return null; // Don't reveal if user exists
    }

    // Generate secure token (would be stored with expiry in production)
    return this.jwtService.generateSecureToken(32);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (/(.)\1{3,}/.test(password)) {
      errors.push('Password cannot contain repeated characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if user has specific role
   */
  async userHasRole(userId: string, role: UserRole, scope?: PermissionScope, scopeId?: string): Promise<boolean> {
    const roleAssignments = await this.database.getUserRoleAssignments(userId);
    
    return roleAssignments.some(assignment => 
      assignment.is_active &&
      assignment.role === role &&
      (!scope || assignment.scope === scope) &&
      (!scopeId || assignment.scope_id === scopeId) &&
      (!assignment.expires_at || assignment.expires_at > new Date())
    );
  }

  /**
   * Get security metrics for monitoring
   */
  getSecurityMetrics() {
    return {
      ...this.jwtService.getSecurityMetrics(),
      maxFailedAttempts: this.MAX_FAILED_ATTEMPTS,
      accountLockDuration: this.ACCOUNT_LOCK_DURATION,
      adminRoles: this.ADMIN_ROLES
    };
  }
}