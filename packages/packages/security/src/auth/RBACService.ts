/**
 * RBAC Service for ACT Placemat
 * 
 * Complete Role-Based Access Control service that integrates with JWT authentication
 * and provides comprehensive permission checking with Australian compliance
 */

import { 
  UserRole, 
  Permission, 
  PermissionScope, 
  SovereigntyLevel,
  PermissionCheck,
  PermissionCheckResult,
  UserRoleAssignment,
  RoleDefinition
} from '../rbac/roles';

import { 
  ROLE_PERMISSIONS, 
  ROLE_DEFAULT_SCOPES, 
  ROLE_SOVEREIGNTY_LEVELS,
  FINANCIAL_APPROVAL_THRESHOLDS,
  CULTURAL_PROTOCOL_ROLES,
  SOVEREIGNTY_DELEGATION_ROLES
} from '../rbac/permissions-matrix';

import { AccessTokenPayload } from './JWTService';
import { z } from 'zod';
import crypto from 'crypto';

// === RBAC SERVICE CONFIGURATION ===

export interface RBACServiceConfig {
  // Database interface
  database?: RBACDatabase;
  
  // Australian compliance settings
  enforceDataResidency: boolean;
  requireIndigenousProtocols: boolean;
  auditAllPermissionChecks: boolean;
  
  // Cache settings
  enablePermissionCaching: boolean;
  cacheTimeoutMinutes: number;
  
  // Security settings
  enableContextualPermissions: boolean;
  requireExplicitDenial: boolean;
  logSecurityViolations: boolean;
}

// === DATABASE INTERFACE ===

export interface RBACDatabase {
  // Role assignments
  getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]>;
  createRoleAssignment(assignment: Omit<UserRoleAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRoleAssignment>;
  updateRoleAssignment(id: string, updates: Partial<UserRoleAssignment>): Promise<UserRoleAssignment>;
  removeRoleAssignment(id: string): Promise<void>;
  
  // Permission checks audit
  logPermissionCheck(check: PermissionCheck, result: PermissionCheckResult): Promise<void>;
  
  // Community sovereignty
  getCommunityInfo(communityId: string): Promise<CommunityInfo | null>;
  getTraditionalOwners(territory: string): Promise<string[]>;
  
  // Compliance tracking
  recordComplianceViolation(violation: ComplianceViolation): Promise<void>;
}

// === SUPPORTING INTERFACES ===

export interface CommunityInfo {
  id: string;
  name: string;
  traditionalCountry: string;
  governanceModel: 'traditional' | 'contemporary' | 'hybrid';
  culturalProtocols: string[];
  authorizedRepresentatives: string[];
  traditionalOwnershipRecognised: boolean;
}

export interface ComplianceViolation {
  userId: string;
  violationType: 'privacy_act' | 'sovereignty' | 'financial' | 'cultural_protocol';
  description: string;
  context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface PermissionContext {
  resourceId?: string;
  resourceType?: string;
  action: string;
  metadata?: Record<string, any>;
  
  // Financial context
  amount?: number;
  currency?: string;
  
  // Geographic context
  location?: string;
  traditionalCountry?: string;
  
  // Temporal context
  effectiveDate?: Date;
  expiryDate?: Date;
  
  // Cultural context
  involvesIndigenousData?: boolean;
  culturalSensitivity?: 'low' | 'medium' | 'high';
  requiresCommunityConsent?: boolean;
}

// === PERMISSION CACHE ===

interface CachedPermission {
  result: boolean;
  timestamp: Date;
  context: string; // Hashed context for invalidation
}

// === RBAC SERVICE IMPLEMENTATION ===

export class RBACService {
  private config: RBACServiceConfig;
  private database?: RBACDatabase;
  private permissionCache: Map<string, CachedPermission> = new Map();

  constructor(config: RBACServiceConfig) {
    this.config = config;
    this.database = config.database;
  }

  // === CORE PERMISSION CHECKING ===

  /**
   * Check if user has specific permission with full context validation
   */
  async checkPermission(
    userId: string,
    permission: Permission,
    scope: PermissionScope = PermissionScope.PERSONAL,
    scopeId?: string,
    context?: PermissionContext
  ): Promise<PermissionCheckResult> {
    const checkId = crypto.randomUUID();
    const timestamp = new Date();

    try {
      // Create permission check record
      const permissionCheck: PermissionCheck = {
        userId,
        permission,
        scope,
        scopeId,
        context: {
          resourceId: context?.resourceId,
          resourceType: context?.resourceType,
          action: context?.action || 'access',
          metadata: context?.metadata || {}
        },
        sovereigntyCheck: {
          requiresCulturalProtocol: this.requiresCulturalProtocol(permission, context),
          traditionalOwnershipInvolved: this.involvesTraditionalOwnership(context),
          communityConsentRequired: this.requiresCommunityConsent(permission, context)
        },
        auditContext: {
          sessionId: 'system', // Would come from session context
          ipAddress: '127.0.0.1', // Would come from request context
          userAgent: 'rbac-service',
          timestamp
        }
      };

      // Check cache first (if enabled)
      if (this.config.enablePermissionCaching) {
        const cacheKey = this.generateCacheKey(userId, permission, scope, scopeId, context);
        const cached = this.permissionCache.get(cacheKey);
        
        if (cached && this.isCacheValid(cached)) {
          const result: PermissionCheckResult = {
            allowed: cached.result,
            roles: [], // Would need to be cached too
            matchingPermissions: cached.result ? [permission] : [],
            denialReasons: cached.result ? [] : ['Permission denied (cached)'],
            sovereigntyRequirements: [],
            auditTrail: {
              checkId,
              timestamp,
              result: cached.result ? 'allow' : 'deny',
              reasons: ['Cache hit']
            }
          };

          // Still log for audit if required
          if (this.config.auditAllPermissionChecks && this.database) {
            await this.database.logPermissionCheck(permissionCheck, result);
          }

          return result;
        }
      }

      // Get user's active role assignments
      const roleAssignments = this.database 
        ? await this.database.getUserRoleAssignments(userId)
        : [];

      const activeRoles = roleAssignments.filter(assignment => 
        assignment.isActive && 
        (!assignment.expiresAt || assignment.expiresAt > timestamp)
      );

      // Check if any role grants the permission
      const { hasPermission, matchingRoles, denialReasons } = this.evaluateRolePermissions(
        activeRoles,
        permission,
        scope,
        scopeId
      );

      let allowed = hasPermission;
      const sovereigntyRequirements: string[] = [];

      // Perform sovereignty checks if required
      if (hasPermission && permissionCheck.sovereigntyCheck) {
        const sovereigntyResult = await this.performSovereigntyChecks(
          userId,
          activeRoles,
          permissionCheck.sovereigntyCheck,
          context
        );

        if (!sovereigntyResult.allowed) {
          allowed = false;
          denialReasons.push(...sovereigntyResult.reasons);
          sovereigntyRequirements.push(...sovereigntyResult.requirements);
        }
      }

      // Perform financial checks
      if (allowed && context?.amount) {
        const financialResult = this.checkFinancialLimits(activeRoles, context.amount);
        if (!financialResult.allowed) {
          allowed = false;
          denialReasons.push(...financialResult.reasons);
        }
      }

      // Perform contextual permission checks
      if (allowed && this.config.enableContextualPermissions && context) {
        const contextualResult = await this.performContextualChecks(
          userId,
          permission,
          context,
          activeRoles
        );

        if (!contextualResult.allowed) {
          allowed = false;
          denialReasons.push(...contextualResult.reasons);
        }
      }

      // Create result
      const result: PermissionCheckResult = {
        allowed,
        roles: matchingRoles,
        matchingPermissions: allowed ? [permission] : [],
        denialReasons,
        sovereigntyRequirements,
        auditTrail: {
          checkId,
          timestamp,
          result: allowed ? 'allow' : 'deny',
          reasons: allowed ? ['Permission granted'] : denialReasons
        }
      };

      // Cache result if enabled
      if (this.config.enablePermissionCaching) {
        const cacheKey = this.generateCacheKey(userId, permission, scope, scopeId, context);
        this.permissionCache.set(cacheKey, {
          result: allowed,
          timestamp,
          context: this.hashContext(context)
        });
      }

      // Log permission check
      if (this.config.auditAllPermissionChecks && this.database) {
        await this.database.logPermissionCheck(permissionCheck, result);
      }

      // Log security violations
      if (!allowed && this.config.logSecurityViolations) {
        this.logSecurityViolation(userId, permission, denialReasons, context);
      }

      return result;

    } catch (error) {
      console.error('Permission check error:', error);
      
      const result: PermissionCheckResult = {
        allowed: false,
        roles: [],
        matchingPermissions: [],
        denialReasons: ['Permission check failed due to system error'],
        sovereigntyRequirements: [],
        auditTrail: {
          checkId,
          timestamp,
          result: 'deny',
          reasons: ['System error']
        }
      };

      return result;
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(
    userId: string,
    permissions: Permission[],
    scope: PermissionScope = PermissionScope.PERSONAL,
    scopeId?: string,
    context?: PermissionContext
  ): Promise<Record<Permission, PermissionCheckResult>> {
    const results: Record<Permission, PermissionCheckResult> = {} as any;

    // Check permissions in parallel
    const checks = permissions.map(async permission => {
      const result = await this.checkPermission(userId, permission, scope, scopeId, context);
      return { permission, result };
    });

    const resolvedChecks = await Promise.all(checks);
    
    for (const { permission, result } of resolvedChecks) {
      results[permission] = result;
    }

    return results;
  }

  /**
   * Check permission from JWT payload (convenience method)
   */
  async checkPermissionFromToken(
    payload: AccessTokenPayload,
    permission: Permission,
    scope?: PermissionScope,
    scopeId?: string,
    context?: PermissionContext
  ): Promise<PermissionCheckResult> {
    // Extract context from JWT payload
    const effectiveScope = scope || PermissionScope.PERSONAL;
    const enhancedContext: PermissionContext = {
      ...context,
      action: context?.action || 'access',
      metadata: {
        ...context?.metadata,
        sessionId: payload.sessionId,
        mfaVerified: payload.mfaVerified,
        sovereigntyLevel: payload.sovereigntyLevel,
        culturalProtocols: payload.culturalProtocols
      }
    };

    return this.checkPermission(payload.sub, permission, effectiveScope, scopeId, enhancedContext);
  }

  // === ROLE MANAGEMENT ===

  /**
   * Assign role to user with sovereignty validation
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
  ): Promise<UserRoleAssignment> {
    if (!this.database) {
      throw new Error('Database not configured for role management');
    }

    // Validate sovereignty requirements for Indigenous roles
    if (CULTURAL_PROTOCOL_ROLES.includes(role)) {
      if (!sovereigntyContext?.communityConsentGiven) {
        throw new Error('Community consent required for Indigenous sovereignty roles');
      }

      if (!sovereigntyContext.culturalProtocolsRequired?.length) {
        throw new Error('Cultural protocols must be specified for Indigenous sovereignty roles');
      }
    }

    // Create role assignment
    const assignment = await this.database.createRoleAssignment({
      userId,
      role,
      scope,
      scopeId,
      assignedAt: new Date(),
      assignedBy,
      assignmentReason,
      autoAssigned: false,
      traditionalOwnershipRecognised: sovereigntyContext?.traditionalOwnershipRecognised || false,
      culturalProtocolsRequired: sovereigntyContext?.culturalProtocolsRequired || [],
      communityConsentGiven: sovereigntyContext?.communityConsentGiven || false,
      communityRepresentativeId: sovereigntyContext?.communityRepresentativeId,
      isActive: true
    });

    // Clear permission cache for user
    this.clearUserPermissionCache(userId);

    return assignment;
  }

  /**
   * Remove role assignment
   */
  async removeRole(assignmentId: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not configured for role management');
    }

    await this.database.removeRoleAssignment(assignmentId);
    
    // Clear all permission caches (we don't know which user was affected)
    this.clearAllPermissionCaches();
  }

  // === HELPER METHODS ===

  /**
   * Evaluate if user's roles grant a specific permission
   */
  private evaluateRolePermissions(
    roleAssignments: UserRoleAssignment[],
    permission: Permission,
    scope: PermissionScope,
    scopeId?: string
  ): {
    hasPermission: boolean;
    matchingRoles: UserRole[];
    denialReasons: string[];
  } {
    const matchingRoles: UserRole[] = [];
    const denialReasons: string[] = [];

    // Check each active role
    for (const assignment of roleAssignments) {
      const rolePermissions = ROLE_PERMISSIONS[assignment.role] || [];
      
      // Check if role has the permission
      if (rolePermissions.includes(permission)) {
        // Check scope compatibility
        const defaultScope = ROLE_DEFAULT_SCOPES[assignment.role];
        
        if (this.isScopeCompatible(assignment.scope, scope, defaultScope)) {
          // Check scope ID if specified
          if (!scopeId || assignment.scopeId === scopeId || assignment.scope === PermissionScope.GLOBAL) {
            matchingRoles.push(assignment.role);
          } else {
            denialReasons.push(`Role ${assignment.role} not authorized for scope ${scope}:${scopeId}`);
          }
        } else {
          denialReasons.push(`Role ${assignment.role} scope ${assignment.scope} incompatible with required scope ${scope}`);
        }
      }
    }

    return {
      hasPermission: matchingRoles.length > 0,
      matchingRoles,
      denialReasons: matchingRoles.length > 0 ? [] : denialReasons
    };
  }

  /**
   * Check if role scope is compatible with required scope
   */
  private isScopeCompatible(
    roleScope: PermissionScope,
    requiredScope: PermissionScope,
    defaultScope: PermissionScope
  ): boolean {
    // Global scope can access everything
    if (roleScope === PermissionScope.GLOBAL) return true;
    
    // Exact match
    if (roleScope === requiredScope) return true;
    
    // Organisation scope can access community and project
    if (roleScope === PermissionScope.ORGANISATION && 
        (requiredScope === PermissionScope.COMMUNITY || requiredScope === PermissionScope.PROJECT)) {
      return true;
    }
    
    // Use default scope as fallback
    return defaultScope === requiredScope;
  }

  /**
   * Perform Indigenous sovereignty checks
   */
  private async performSovereigntyChecks(
    userId: string,
    roleAssignments: UserRoleAssignment[],
    sovereigntyCheck: NonNullable<PermissionCheck['sovereigntyCheck']>,
    context?: PermissionContext
  ): Promise<{
    allowed: boolean;
    reasons: string[];
    requirements: string[];
  }> {
    const reasons: string[] = [];
    const requirements: string[] = [];

    // Check cultural protocol requirements
    if (sovereigntyCheck.requiresCulturalProtocol) {
      const hasCulturalRole = roleAssignments.some(assignment => 
        CULTURAL_PROTOCOL_ROLES.includes(assignment.role) && 
        assignment.culturalProtocolsRequired.length > 0
      );

      if (!hasCulturalRole) {
        reasons.push('Cultural protocol compliance required');
        requirements.push('Acknowledgment of Indigenous cultural protocols');
      }
    }

    // Check traditional ownership involvement
    if (sovereigntyCheck.traditionalOwnershipInvolved && context?.traditionalCountry) {
      const hasTraditionalOwnerRole = roleAssignments.some(assignment =>
        assignment.role === UserRole.TRADITIONAL_OWNER &&
        assignment.traditionalOwnershipRecognised
      );

      if (!hasTraditionalOwnerRole && this.database) {
        // Check if user is recognized traditional owner for this country
        const traditionalOwners = await this.database.getTraditionalOwners(context.traditionalCountry);
        if (!traditionalOwners.includes(userId)) {
          reasons.push('Traditional ownership recognition required');
          requirements.push(`Traditional ownership of ${context.traditionalCountry}`);
        }
      }
    }

    // Check community consent requirements
    if (sovereigntyCheck.communityConsentRequired) {
      const hasConsentedRole = roleAssignments.some(assignment =>
        assignment.communityConsentGiven &&
        SOVEREIGNTY_DELEGATION_ROLES.includes(assignment.role)
      );

      if (!hasConsentedRole) {
        reasons.push('Community consent required for this operation');
        requirements.push('Explicit community consent for data operation');
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      requirements
    };
  }

  /**
   * Check financial approval limits
   */
  private checkFinancialLimits(
    roleAssignments: UserRoleAssignment[],
    amount: number
  ): {
    allowed: boolean;
    reasons: string[];
  } {
    let maxApprovalLimit = 0;

    // Find highest approval limit from all roles
    for (const assignment of roleAssignments) {
      const limit = FINANCIAL_APPROVAL_THRESHOLDS[assignment.role] || 0;
      maxApprovalLimit = Math.max(maxApprovalLimit, limit);
    }

    if (amount > maxApprovalLimit) {
      return {
        allowed: false,
        reasons: [`Amount $${amount} exceeds approval limit of $${maxApprovalLimit}`]
      };
    }

    return { allowed: true, reasons: [] };
  }

  /**
   * Perform contextual permission checks
   */
  private async performContextualChecks(
    userId: string,
    permission: Permission,
    context: PermissionContext,
    roleAssignments: UserRoleAssignment[]
  ): Promise<{
    allowed: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    // Check temporal constraints
    if (context.effectiveDate && context.effectiveDate > new Date()) {
      reasons.push('Permission not yet effective');
    }

    if (context.expiryDate && context.expiryDate < new Date()) {
      reasons.push('Permission has expired');
    }

    // Check cultural sensitivity requirements
    if (context.culturalSensitivity === 'high' && context.involvesIndigenousData) {
      const hasCulturalAuthority = roleAssignments.some(assignment =>
        CULTURAL_PROTOCOL_ROLES.includes(assignment.role) &&
        assignment.culturalProtocolsRequired.includes('CARE_principles')
      );

      if (!hasCulturalAuthority) {
        reasons.push('Cultural authority required for high-sensitivity Indigenous data');
      }
    }

    // Check data residency requirements
    if (this.config.enforceDataResidency && context.location && !context.location.includes('Australia')) {
      reasons.push('Data must remain within Australian jurisdiction');
    }

    return {
      allowed: reasons.length === 0,
      reasons
    };
  }

  /**
   * Helper methods for sovereignty checks
   */
  private requiresCulturalProtocol(permission: Permission, context?: PermissionContext): boolean {
    const culturalPermissions = [
      Permission.SOVEREIGNTY_DATA_ACCESS,
      Permission.SOVEREIGNTY_PROTOCOL_MANAGE,
      Permission.SOVEREIGNTY_CONSENT_MANAGE,
      Permission.STORY_MODERATE
    ];

    return culturalPermissions.includes(permission) || 
           (context?.involvesIndigenousData && context?.culturalSensitivity !== 'low');
  }

  private involvesTraditionalOwnership(context?: PermissionContext): boolean {
    return !!(context?.traditionalCountry || 
             (context?.involvesIndigenousData && context?.culturalSensitivity === 'high'));
  }

  private requiresCommunityConsent(permission: Permission, context?: PermissionContext): boolean {
    const consentRequiredPermissions = [
      Permission.SOVEREIGNTY_CONSENT_MANAGE,
      Permission.DATA_EXPORT,
      Permission.STORY_PUBLISH
    ];

    return consentRequiredPermissions.includes(permission) ||
           (context?.requiresCommunityConsent === true);
  }

  /**
   * Cache management methods
   */
  private generateCacheKey(
    userId: string,
    permission: Permission,
    scope: PermissionScope,
    scopeId?: string,
    context?: PermissionContext
  ): string {
    const contextHash = this.hashContext(context);
    return `${userId}:${permission}:${scope}:${scopeId || 'null'}:${contextHash}`;
  }

  private hashContext(context?: PermissionContext): string {
    if (!context) return 'no-context';
    
    const relevant = {
      action: context.action,
      amount: context.amount,
      culturalSensitivity: context.culturalSensitivity,
      involvesIndigenousData: context.involvesIndigenousData
    };
    
    return Buffer.from(JSON.stringify(relevant)).toString('base64');
  }

  private isCacheValid(cached: CachedPermission): boolean {
    const age = Date.now() - cached.timestamp.getTime();
    const maxAge = this.config.cacheTimeoutMinutes * 60 * 1000;
    return age < maxAge;
  }

  private clearUserPermissionCache(userId: string): void {
    for (const [key] of this.permissionCache) {
      if (key.startsWith(`${userId}:`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  private clearAllPermissionCaches(): void {
    this.permissionCache.clear();
  }

  private logSecurityViolation(
    userId: string,
    permission: Permission,
    reasons: string[],
    context?: PermissionContext
  ): void {
    console.warn('Security Violation:', {
      userId,
      permission,
      reasons,
      context,
      timestamp: new Date().toISOString()
    });
  }

  // === PUBLIC UTILITY METHODS ===

  /**
   * Get all permissions for a user (computed from roles)
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    if (!this.database) return [];

    const roleAssignments = await this.database.getUserRoleAssignments(userId);
    const activeRoles = roleAssignments.filter(assignment => 
      assignment.isActive && 
      (!assignment.expiresAt || assignment.expiresAt > new Date())
    );

    const permissions = new Set<Permission>();
    
    for (const assignment of activeRoles) {
      const rolePermissions = ROLE_PERMISSIONS[assignment.role] || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    }

    return Array.from(permissions);
  }

  /**
   * Check if user has any of the specified roles
   */
  async userHasAnyRole(userId: string, roles: UserRole[]): Promise<boolean> {
    if (!this.database) return false;

    const roleAssignments = await this.database.getUserRoleAssignments(userId);
    const activeRoles = roleAssignments.filter(assignment => 
      assignment.isActive && 
      (!assignment.expiresAt || assignment.expiresAt > new Date())
    );

    return activeRoles.some(assignment => roles.includes(assignment.role));
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return {
      size: this.permissionCache.size,
      enabled: this.config.enablePermissionCaching,
      timeoutMinutes: this.config.cacheTimeoutMinutes
    };
  }
}