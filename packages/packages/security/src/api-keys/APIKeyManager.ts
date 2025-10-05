/**
 * API Key Management System for ACT Placemat
 * 
 * Comprehensive API key lifecycle management including creation, rotation,
 * revocation, and monitoring with Australian compliance
 */

import { APIKeyService, APIKey, CreateAPIKeyRequest } from './APIKeyService';
import { RBACService } from '../auth/RBACService';
import { UserRole, Permission, PermissionScope } from '../rbac/roles';
import { z } from 'zod';
import crypto from 'crypto';

// === MANAGEMENT INTERFACES ===

/**
 * API key rotation policy
 */
export interface RotationPolicy {
  id: string;
  name: string;
  description: string;
  
  // Rotation triggers
  maxAge: number; // Days after creation
  maxUsage: number; // Number of requests
  maxInactivity: number; // Days without usage
  
  // Security triggers
  rotateOnCompromise: boolean;
  rotateOnSuspiciousActivity: boolean;
  rotateOnOwnerChange: boolean;
  
  // Notification settings
  notifyBeforeDays: number;
  notifyOwner: boolean;
  notifyAdmins: boolean;
  
  // Scope
  appliesTo: {
    ownerTypes: string[];
    permissionLevels: string[];
    scopes: PermissionScope[];
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API key audit event
 */
export interface APIKeyAuditEvent {
  id: string;
  keyId: string;
  eventType: 'created' | 'used' | 'rotated' | 'revoked' | 'compromised' | 'expired' | 'policy_applied';
  description: string;
  
  // Context
  userId?: string; // Who performed the action
  ipAddress?: string;
  userAgent?: string;
  
  // Metadata
  metadata: Record<string, any>;
  
  // Compliance
  australianComplianceLevel: 'low' | 'medium' | 'high';
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionDays: number;
  
  timestamp: Date;
}

/**
 * Security monitoring alert
 */
export interface SecurityAlert {
  id: string;
  alertType: 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'key_compromise' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Target
  keyId?: string;
  ownerId?: string;
  
  // Alert details
  title: string;
  description: string;
  recommendations: string[];
  
  // Status
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  
  // Metadata
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Management statistics
 */
export interface ManagementStats {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  compromisedKeys: number;
  
  // Usage statistics
  requestsToday: number;
  requestsThisMonth: number;
  averageRequestsPerKey: number;
  
  // Security statistics
  securityAlertsOpen: number;
  keysRotatedThisMonth: number;
  suspiciousActivityCount: number;
  
  // Compliance statistics
  australianCompliantKeys: number;
  indigenousDataAccessKeys: number;
  dataResidencyCompliantKeys: number;
  
  // Performance
  averageValidationTime: number;
  cacheHitRate: number;
}

// === DATABASE INTERFACES ===

export interface APIKeyManagementDatabase {
  // Rotation policies
  createRotationPolicy(policy: Omit<RotationPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<RotationPolicy>;
  getRotationPolicies(): Promise<RotationPolicy[]>;
  getRotationPolicy(id: string): Promise<RotationPolicy | null>;
  updateRotationPolicy(id: string, updates: Partial<RotationPolicy>): Promise<RotationPolicy>;
  deleteRotationPolicy(id: string): Promise<void>;
  
  // Audit events
  recordAuditEvent(event: Omit<APIKeyAuditEvent, 'id' | 'timestamp'>): Promise<APIKeyAuditEvent>;
  getAuditEvents(keyId: string, fromDate?: Date, toDate?: Date): Promise<APIKeyAuditEvent[]>;
  getAuditEventsByType(eventType: string, fromDate?: Date, toDate?: Date): Promise<APIKeyAuditEvent[]>;
  
  // Security alerts
  createSecurityAlert(alert: Omit<SecurityAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityAlert>;
  getSecurityAlerts(status?: string): Promise<SecurityAlert[]>;
  updateSecurityAlert(id: string, updates: Partial<SecurityAlert>): Promise<SecurityAlert>;
  
  // Statistics
  getManagementStats(): Promise<ManagementStats>;
  getKeyUsageTrends(days: number): Promise<Array<{ date: Date; requests: number; uniqueKeys: number }>>;
}

// === API KEY MANAGER ===

export class APIKeyManager {
  private apiKeyService: APIKeyService;
  private rbacService: RBACService;
  private database: APIKeyManagementDatabase;
  
  // Scheduled task tracking
  private rotationCheckInterval?: NodeJS.Timeout;
  private maintenanceInterval?: NodeJS.Timeout;
  
  constructor(
    apiKeyService: APIKeyService,
    rbacService: RBACService,
    database: APIKeyManagementDatabase
  ) {
    this.apiKeyService = apiKeyService;
    this.rbacService = rbacService;
    this.database = database;
  }

  // === LIFECYCLE MANAGEMENT ===

  /**
   * Create API key with enhanced validation and audit logging
   */
  async createAPIKey(
    request: CreateAPIKeyRequest,
    createdBy: string,
    context: {
      ipAddress: string;
      userAgent?: string;
      justification?: string;
    }
  ): Promise<{ key: APIKey; plainTextKey: string }> {
    // Validate permissions against RBAC
    const permissionValidation = await this.validatePermissionsRequest(
      request.ownerId,
      request.permissions,
      request.scope,
      request.scopeId
    );

    if (!permissionValidation.valid) {
      throw new Error(`Permission validation failed: ${permissionValidation.errors.join(', ')}`);
    }

    // Create the API key
    const result = await this.apiKeyService.createAPIKey(request);

    // Record audit event
    await this.database.recordAuditEvent({
      keyId: result.key.keyId,
      eventType: 'created',
      description: `API key created: ${request.name}`,
      userId: createdBy,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        keyName: request.name,
        permissions: request.permissions,
        scope: request.scope,
        scopeId: request.scopeId,
        justification: context.justification
      },
      australianComplianceLevel: this.determineComplianceLevel(request.permissions),
      dataClassification: this.determineDataClassification(request.permissions),
      retentionDays: 2555 // 7 years for Australian compliance
    });

    // Apply rotation policies
    await this.applyRotationPolicies(result.key);

    return result;
  }

  /**
   * Rotate API key with full audit trail
   */
  async rotateAPIKey(
    keyId: string,
    rotatedBy: string,
    reason: string,
    context: {
      ipAddress: string;
      userAgent?: string;
      automated?: boolean;
    }
  ): Promise<{ key: APIKey; plainTextKey: string }> {
    // Get existing key
    const existingKey = await this.apiKeyService.getAPIKey(keyId);
    if (!existingKey) {
      throw new Error('API key not found');
    }

    // Perform rotation
    const result = await this.apiKeyService.rotateAPIKey(keyId);

    // Record audit event
    await this.database.recordAuditEvent({
      keyId: result.key.keyId,
      eventType: 'rotated',
      description: `API key rotated: ${reason}`,
      userId: rotatedBy,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        oldKeyId: keyId,
        newKeyId: result.key.keyId,
        reason,
        automated: context.automated || false,
        keyName: existingKey.name
      },
      australianComplianceLevel: this.determineComplianceLevel(existingKey.permissions),
      dataClassification: this.determineDataClassification(existingKey.permissions),
      retentionDays: 2555
    });

    // Notify stakeholders if required
    await this.notifyKeyRotation(existingKey, result.key, reason);

    return result;
  }

  /**
   * Revoke API key with audit trail
   */
  async revokeAPIKey(
    keyId: string,
    revokedBy: string,
    reason: string,
    context: {
      ipAddress: string;
      userAgent?: string;
      immediate?: boolean;
    }
  ): Promise<void> {
    // Get existing key for audit
    const existingKey = await this.apiKeyService.getAPIKey(keyId);
    if (!existingKey) {
      throw new Error('API key not found');
    }

    // Revoke the key
    await this.apiKeyService.revokeAPIKey(keyId, reason);

    // Record audit event
    await this.database.recordAuditEvent({
      keyId,
      eventType: 'revoked',
      description: `API key revoked: ${reason}`,
      userId: revokedBy,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        reason,
        immediate: context.immediate || false,
        keyName: existingKey.name,
        usageCount: existingKey.usageCount,
        lastUsed: existingKey.lastUsedAt
      },
      australianComplianceLevel: this.determineComplianceLevel(existingKey.permissions),
      dataClassification: this.determineDataClassification(existingKey.permissions),
      retentionDays: 2555
    });

    // Create security alert if revocation was due to compromise
    if (reason.toLowerCase().includes('compromise') || reason.toLowerCase().includes('breach')) {
      await this.database.createSecurityAlert({
        alertType: 'key_compromise',
        severity: 'high',
        keyId,
        ownerId: existingKey.ownerId,
        title: 'API Key Compromised',
        description: `API key ${keyId} has been revoked due to suspected compromise: ${reason}`,
        recommendations: [
          'Review recent usage patterns for suspicious activity',
          'Check for any unauthorized data access',
          'Consider rotating other keys for the same owner',
          'Implement additional monitoring for the affected owner'
        ],
        status: 'open',
        metadata: {
          revokedBy,
          reason,
          keyName: existingKey.name
        }
      });
    }
  }

  // === ROTATION POLICY MANAGEMENT ===

  /**
   * Create rotation policy
   */
  async createRotationPolicy(
    policy: Omit<RotationPolicy, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<RotationPolicy> {
    const created = await this.database.createRotationPolicy(policy);

    // Record audit event
    await this.database.recordAuditEvent({
      keyId: 'system',
      eventType: 'policy_applied',
      description: `Rotation policy created: ${policy.name}`,
      userId: createdBy,
      metadata: {
        policyId: created.id,
        policyName: policy.name,
        maxAge: policy.maxAge,
        appliesTo: policy.appliesTo
      },
      australianComplianceLevel: 'medium',
      dataClassification: 'internal',
      retentionDays: 2555
    });

    return created;
  }

  /**
   * Apply rotation policies to existing keys
   */
  async applyRotationPolicies(key: APIKey): Promise<void> {
    const policies = await this.database.getRotationPolicies();
    const applicablePolicies = policies.filter(policy => 
      policy.isActive && this.isPolicyApplicable(policy, key)
    );

    for (const policy of applicablePolicies) {
      // Check if key needs rotation based on policy
      const needsRotation = await this.checkRotationRequired(key, policy);
      
      if (needsRotation.required) {
        // Schedule or trigger rotation
        await this.scheduleKeyRotation(key, policy, needsRotation.reason);
      }
    }
  }

  /**
   * Check if rotation is required for a key based on policy
   */
  private async checkRotationRequired(key: APIKey, policy: RotationPolicy): Promise<{
    required: boolean;
    reason: string;
  }> {
    const now = new Date();
    const keyAge = (now.getTime() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Check age-based rotation
    if (keyAge > policy.maxAge) {
      return { required: true, reason: `Key age (${Math.floor(keyAge)} days) exceeds policy limit (${policy.maxAge} days)` };
    }

    // Check usage-based rotation
    if (key.usageCount > policy.maxUsage) {
      return { required: true, reason: `Usage count (${key.usageCount}) exceeds policy limit (${policy.maxUsage})` };
    }

    // Check inactivity-based rotation
    if (key.lastUsedAt) {
      const daysSinceLastUse = (now.getTime() - key.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastUse > policy.maxInactivity) {
        return { required: true, reason: `Inactivity (${Math.floor(daysSinceLastUse)} days) exceeds policy limit (${policy.maxInactivity} days)` };
      }
    }

    return { required: false, reason: '' };
  }

  /**
   * Schedule key rotation
   */
  private async scheduleKeyRotation(key: APIKey, policy: RotationPolicy, reason: string): Promise<void> {
    // In a real implementation, this would integrate with a job queue
    console.log(`Scheduling rotation for key ${key.keyId}: ${reason}`);

    // Create security alert for manual review if not automated
    await this.database.createSecurityAlert({
      alertType: 'policy_violation',
      severity: 'medium',
      keyId: key.keyId,
      ownerId: key.ownerId,
      title: 'API Key Rotation Required',
      description: `API key ${key.keyId} requires rotation: ${reason}`,
      recommendations: [
        'Review key usage patterns before rotation',
        'Notify key owner of upcoming rotation',
        'Update dependent systems with new key',
        'Monitor for any integration failures after rotation'
      ],
      status: 'open',
      metadata: {
        policyId: policy.id,
        policyName: policy.name,
        reason,
        keyName: key.name
      }
    });
  }

  // === MONITORING AND MAINTENANCE ===

  /**
   * Start automated monitoring and maintenance
   */
  startAutomatedMaintenance(intervalMinutes: number = 60): void {
    // Stop existing intervals
    this.stopAutomatedMaintenance();

    // Check for rotation requirements
    this.rotationCheckInterval = setInterval(async () => {
      try {
        await this.performRotationCheck();
      } catch (error) {
        console.error('Rotation check error:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // General maintenance
    this.maintenanceInterval = setInterval(async () => {
      try {
        await this.performMaintenance();
      } catch (error) {
        console.error('Maintenance error:', error);
      }
    }, intervalMinutes * 60 * 1000 * 4); // Every 4 hours
  }

  /**
   * Stop automated maintenance
   */
  stopAutomatedMaintenance(): void {
    if (this.rotationCheckInterval) {
      clearInterval(this.rotationCheckInterval);
      this.rotationCheckInterval = undefined;
    }

    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = undefined;
    }
  }

  /**
   * Perform rotation check for all active keys
   */
  async performRotationCheck(): Promise<void> {
    const activeKeys = await this.apiKeyService['database'].getActiveAPIKeys();
    const policies = await this.database.getRotationPolicies();

    for (const key of activeKeys) {
      const applicablePolicies = policies.filter(policy => 
        policy.isActive && this.isPolicyApplicable(policy, key)
      );

      for (const policy of applicablePolicies) {
        const rotationCheck = await this.checkRotationRequired(key, policy);
        if (rotationCheck.required) {
          await this.scheduleKeyRotation(key, policy, rotationCheck.reason);
        }
      }
    }
  }

  /**
   * Perform general maintenance
   */
  async performMaintenance(): Promise<{
    expiredKeysProcessed: number;
    alertsCreated: number;
    auditEventsArchived: number;
  }> {
    let expiredKeysProcessed = 0;
    let alertsCreated = 0;
    let auditEventsArchived = 0;

    // Clean up expired keys
    const expiredKeys = await this.apiKeyService['database'].getExpiredAPIKeys();
    for (const key of expiredKeys) {
      if (key.isActive) {
        await this.apiKeyService.revokeAPIKey(key.keyId, 'automatic_expiry');
        expiredKeysProcessed++;

        await this.database.recordAuditEvent({
          keyId: key.keyId,
          eventType: 'expired',
          description: 'API key automatically expired',
          metadata: {
            keyName: key.name,
            ownerId: key.ownerId,
            automated: true
          },
          australianComplianceLevel: this.determineComplianceLevel(key.permissions),
          dataClassification: this.determineDataClassification(key.permissions),
          retentionDays: 2555
        });
      }
    }

    // Check for suspicious activity patterns
    const stats = await this.database.getManagementStats();
    if (stats.suspiciousActivityCount > stats.activeKeys * 0.1) {
      await this.database.createSecurityAlert({
        alertType: 'suspicious_activity',
        severity: 'high',
        title: 'High Suspicious Activity Rate',
        description: `Suspicious activity detected across ${stats.suspiciousActivityCount} keys out of ${stats.activeKeys} active keys`,
        recommendations: [
          'Review recent security incidents',
          'Consider implementing stricter rate limits',
          'Audit high-risk API keys',
          'Enhance monitoring for unusual patterns'
        ],
        status: 'open',
        metadata: {
          suspiciousCount: stats.suspiciousActivityCount,
          totalActive: stats.activeKeys,
          rate: stats.suspiciousActivityCount / stats.activeKeys
        }
      });
      alertsCreated++;
    }

    return {
      expiredKeysProcessed,
      alertsCreated,
      auditEventsArchived
    };
  }

  // === HELPER METHODS ===

  /**
   * Validate that requested permissions are allowed for the owner
   */
  private async validatePermissionsRequest(
    ownerId: string,
    requestedPermissions: Permission[],
    scope: PermissionScope,
    scopeId?: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Get owner's actual permissions from RBAC
    const ownerPermissions = await this.rbacService.getUserPermissions(ownerId);

    // Check if owner has all requested permissions
    for (const permission of requestedPermissions) {
      if (!ownerPermissions.includes(permission)) {
        errors.push(`Owner does not have permission: ${permission}`);
      }
    }

    // Additional sovereignty checks for Indigenous data permissions
    const sovereigntyPermissions = requestedPermissions.filter(p => 
      p.startsWith('sovereignty:') || p.includes('indigenous')
    );

    if (sovereigntyPermissions.length > 0) {
      const hasIndigenousRole = await this.rbacService.userHasAnyRole(ownerId, [
        UserRole.COMMUNITY_ELDER,
        UserRole.TRADITIONAL_OWNER,
        UserRole.SOVEREIGNTY_GUARDIAN,
        UserRole.COMMUNITY_REPRESENTATIVE
      ]);

      if (!hasIndigenousRole) {
        errors.push('Indigenous sovereignty permissions require appropriate cultural role');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Determine compliance level based on permissions
   */
  private determineComplianceLevel(permissions: Permission[]): 'low' | 'medium' | 'high' {
    const highRiskPermissions = [
      Permission.SOVEREIGNTY_DATA_ACCESS,
      Permission.FINANCE_BUDGET_APPROVE,
      Permission.SYSTEM_ADMIN,
      Permission.DATA_EXPORT
    ];

    const mediumRiskPermissions = [
      Permission.MEMBER_READ,
      Permission.STORY_READ,
      Permission.PROJECT_READ
    ];

    if (permissions.some(p => highRiskPermissions.includes(p))) return 'high';
    if (permissions.some(p => mediumRiskPermissions.includes(p))) return 'medium';
    return 'low';
  }

  /**
   * Determine data classification based on permissions
   */
  private determineDataClassification(permissions: Permission[]): 'public' | 'internal' | 'confidential' | 'restricted' {
    if (permissions.some(p => p.startsWith('sovereignty:'))) return 'restricted';
    if (permissions.some(p => p.startsWith('finance:'))) return 'confidential';
    if (permissions.some(p => p.includes('admin') || p.includes('delete'))) return 'confidential';
    if (permissions.some(p => p.includes('read'))) return 'internal';
    return 'public';
  }

  /**
   * Check if rotation policy applies to key
   */
  private isPolicyApplicable(policy: RotationPolicy, key: APIKey): boolean {
    // Check owner type
    if (!policy.appliesTo.ownerTypes.includes(key.ownerType)) return false;

    // Check scope
    if (!policy.appliesTo.scopes.includes(key.scope)) return false;

    // Check permission level (simplified check)
    const complianceLevel = this.determineComplianceLevel(key.permissions);
    if (!policy.appliesTo.permissionLevels.includes(complianceLevel)) return false;

    return true;
  }

  /**
   * Notify stakeholders of key rotation
   */
  private async notifyKeyRotation(oldKey: APIKey, newKey: APIKey, reason: string): Promise<void> {
    // This would integrate with notification system
    console.log(`Key rotation notification: ${oldKey.keyId} -> ${newKey.keyId}, reason: ${reason}`);
  }

  // === PUBLIC API ===

  /**
   * Get management statistics
   */
  async getStats(): Promise<ManagementStats> {
    return this.database.getManagementStats();
  }

  /**
   * Get security alerts
   */
  async getSecurityAlerts(status?: string): Promise<SecurityAlert[]> {
    return this.database.getSecurityAlerts(status);
  }

  /**
   * Get audit events for key
   */
  async getAuditEvents(keyId: string, fromDate?: Date, toDate?: Date): Promise<APIKeyAuditEvent[]> {
    return this.database.getAuditEvents(keyId, fromDate, toDate);
  }

  /**
   * Get rotation policies
   */
  async getRotationPolicies(): Promise<RotationPolicy[]> {
    return this.database.getRotationPolicies();
  }

  /**
   * Get usage trends
   */
  async getUsageTrends(days: number = 30): Promise<Array<{ date: Date; requests: number; uniqueKeys: number }>> {
    return this.database.getKeyUsageTrends(days);
  }
}