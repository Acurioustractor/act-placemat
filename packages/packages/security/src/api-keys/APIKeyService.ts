/**
 * API Key Management Service for ACT Placemat
 * 
 * Comprehensive API key generation, validation, rotation, and management
 * with Australian compliance and Indigenous sovereignty considerations
 */

import crypto from 'crypto';
import { z } from 'zod';
import { UserRole, Permission, PermissionScope } from '../rbac/roles';

// === API KEY SCHEMAS ===

/**
 * API key structure and metadata
 */
export const APIKeySchema = z.object({
  id: z.string().uuid(),
  keyId: z.string(), // Public identifier (first 8 chars of key)
  hashedKey: z.string(), // SHA-256 hash of the full key
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  
  // Owner information
  ownerId: z.string().uuid(), // User or service that owns this key
  ownerType: z.enum(['user', 'service', 'system']),
  
  // Permissions and scope
  permissions: z.array(z.nativeEnum(Permission)),
  scope: z.nativeEnum(PermissionScope),
  scopeId: z.string().optional(),
  
  // Australian compliance
  australianCompliant: z.boolean().default(true),
  dataResidencyRequired: z.boolean().default(true),
  
  // Indigenous sovereignty context
  sovereigntyLevel: z.enum(['none', 'general_respect', 'cultural_protocol', 'community_delegate', 'cultural_authority', 'traditional_owner']).optional(),
  culturalProtocols: z.array(z.string()).default([]),
  communityId: z.string().uuid().optional(),
  
  // Security constraints
  allowedIpRanges: z.array(z.string()).default([]), // CIDR notation
  allowedDomains: z.array(z.string()).default([]),
  requiresHttps: z.boolean().default(true),
  
  // Rate limiting
  rateLimit: z.object({
    requestsPerMinute: z.number().min(1).max(10000).default(100),
    requestsPerHour: z.number().min(1).max(100000).default(1000),
    requestsPerDay: z.number().min(1).max(1000000).default(10000)
  }),
  
  // Lifecycle management
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  lastUsedAt: z.date().optional(),
  expiresAt: z.date().optional(),
  rotateAfterDays: z.number().min(1).max(365).optional(),
  
  // Usage tracking
  usageCount: z.number().default(0),
  lastAccessIp: z.string().optional(),
  lastAccessUserAgent: z.string().optional(),
  
  // Security flags
  securityFlags: z.array(z.string()).default([]),
  compromised: z.boolean().default(false),
  compromisedAt: z.date().optional(),
  compromiseReason: z.string().optional()
});

export type APIKey = z.infer<typeof APIKeySchema>;

/**
 * API key creation request
 */
export const CreateAPIKeyRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  ownerId: z.string().uuid(),
  ownerType: z.enum(['user', 'service', 'system']),
  
  // Permissions
  permissions: z.array(z.nativeEnum(Permission)),
  scope: z.nativeEnum(PermissionScope).default(PermissionScope.DELEGATED),
  scopeId: z.string().optional(),
  
  // Security settings
  allowedIpRanges: z.array(z.string()).default([]),
  allowedDomains: z.array(z.string()).default([]),
  requiresHttps: z.boolean().default(true),
  
  // Rate limiting
  rateLimit: z.object({
    requestsPerMinute: z.number().min(1).max(1000).default(100),
    requestsPerHour: z.number().min(1).max(10000).default(1000),
    requestsPerDay: z.number().min(1).max(100000).default(10000)
  }).optional(),
  
  // Lifecycle
  expiresInDays: z.number().min(1).max(365).optional(),
  rotateAfterDays: z.number().min(1).max(365).optional(),
  
  // Indigenous sovereignty (if applicable)
  sovereigntyContext: z.object({
    level: z.enum(['general_respect', 'cultural_protocol', 'community_delegate', 'cultural_authority', 'traditional_owner']).optional(),
    culturalProtocols: z.array(z.string()).default([]),
    communityId: z.string().uuid().optional()
  }).optional()
});

export type CreateAPIKeyRequest = z.infer<typeof CreateAPIKeyRequestSchema>;

/**
 * API key validation result
 */
export interface APIKeyValidationResult {
  valid: boolean;
  key?: APIKey;
  permissions?: Permission[];
  scope?: PermissionScope;
  scopeId?: string;
  errors?: string[];
  securityWarnings?: string[];
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
    rateLimited: boolean;
  };
}

/**
 * API key usage record
 */
export interface APIKeyUsage {
  id: string;
  keyId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
  endpoint: string;
  method: string;
  responseStatus: number;
  responseTime: number;
  bytesTransferred: number;
  
  // Request context
  requestId: string;
  sessionId?: string;
  
  // Security context
  securityFlags: string[];
  suspiciousActivity: boolean;
  
  // Australian compliance
  dataAccessed: boolean;
  indigenousDataAccessed: boolean;
  dataResidencyCompliant: boolean;
}

// === DATABASE INTERFACE ===

export interface APIKeyDatabase {
  // Key management
  createAPIKey(key: Omit<APIKey, 'id' | 'createdAt' | 'usageCount'>): Promise<APIKey>;
  getAPIKeyById(id: string): Promise<APIKey | null>;
  getAPIKeyByKeyId(keyId: string): Promise<APIKey | null>;
  updateAPIKey(id: string, updates: Partial<APIKey>): Promise<APIKey>;
  deleteAPIKey(id: string): Promise<void>;
  
  // Owner queries
  getAPIKeysByOwner(ownerId: string, ownerType: string): Promise<APIKey[]>;
  getActiveAPIKeys(): Promise<APIKey[]>;
  getExpiredAPIKeys(): Promise<APIKey[]>;
  
  // Usage tracking
  recordAPIKeyUsage(usage: APIKeyUsage): Promise<void>;
  getAPIKeyUsage(keyId: string, fromDate: Date, toDate: Date): Promise<APIKeyUsage[]>;
  getAPIKeyUsageStats(keyId: string): Promise<{
    totalRequests: number;
    requestsToday: number;
    requestsThisHour: number;
    requestsThisMinute: number;
    lastUsed: Date | null;
    averageResponseTime: number;
  }>;
  
  // Security
  markAPIKeyCompromised(id: string, reason: string): Promise<void>;
  getCompromisedAPIKeys(): Promise<APIKey[]>;
  logSecurityIncident(incident: {
    keyId: string;
    incidentType: string;
    description: string;
    ipAddress: string;
    timestamp: Date;
    metadata: Record<string, any>;
  }): Promise<void>;
}

// === API KEY SERVICE ===

export class APIKeyService {
  private database: APIKeyDatabase;
  private encryptionKey: Buffer;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(database: APIKeyDatabase, encryptionKey: string) {
    this.database = database;
    this.encryptionKey = Buffer.from(encryptionKey, 'hex');
    
    if (this.encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (256 bits)');
    }
  }

  // === KEY GENERATION ===

  /**
   * Generate a new API key with secure random generation
   */
  async createAPIKey(request: CreateAPIKeyRequest): Promise<{ key: APIKey; plainTextKey: string }> {
    // Validate request
    const validatedRequest = CreateAPIKeyRequestSchema.parse(request);

    // Generate secure random key
    const keyBytes = crypto.randomBytes(32); // 256 bits
    const plainTextKey = `actp_${keyBytes.toString('base64url')}`;
    
    // Create key ID (first 8 characters for public identification)
    const keyId = plainTextKey.substring(5, 13); // Skip 'actp_' prefix
    
    // Hash the key for storage
    const hashedKey = crypto.createHash('sha256').update(plainTextKey).digest('hex');

    // Determine expiry date
    const expiresAt = validatedRequest.expiresInDays 
      ? new Date(Date.now() + (validatedRequest.expiresInDays * 24 * 60 * 60 * 1000))
      : undefined;

    // Create API key record
    const apiKey: Omit<APIKey, 'id' | 'createdAt' | 'usageCount'> = {
      keyId,
      hashedKey,
      name: validatedRequest.name,
      description: validatedRequest.description,
      ownerId: validatedRequest.ownerId,
      ownerType: validatedRequest.ownerType,
      permissions: validatedRequest.permissions,
      scope: validatedRequest.scope,
      scopeId: validatedRequest.scopeId,
      australianCompliant: true,
      dataResidencyRequired: true,
      sovereigntyLevel: validatedRequest.sovereigntyContext?.level,
      culturalProtocols: validatedRequest.sovereigntyContext?.culturalProtocols || [],
      communityId: validatedRequest.sovereigntyContext?.communityId,
      allowedIpRanges: validatedRequest.allowedIpRanges,
      allowedDomains: validatedRequest.allowedDomains,
      requiresHttps: validatedRequest.requiresHttps,
      rateLimit: validatedRequest.rateLimit || {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      isActive: true,
      expiresAt,
      rotateAfterDays: validatedRequest.rotateAfterDays,
      securityFlags: [],
      compromised: false
    };

    // Store in database
    const createdKey = await this.database.createAPIKey(apiKey);

    return {
      key: createdKey,
      plainTextKey
    };
  }

  // === KEY VALIDATION ===

  /**
   * Validate API key and return permissions
   */
  async validateAPIKey(
    keyString: string,
    context: {
      ipAddress: string;
      userAgent?: string;
      endpoint: string;
      method: string;
      httpsUsed: boolean;
    }
  ): Promise<APIKeyValidationResult> {
    try {
      // Basic format validation
      if (!keyString.startsWith('actp_') || keyString.length < 20) {
        return {
          valid: false,
          errors: ['Invalid API key format']
        };
      }

      // Extract key ID
      const keyId = keyString.substring(5, 13);
      
      // Hash the provided key
      const hashedProvidedKey = crypto.createHash('sha256').update(keyString).digest('hex');

      // Retrieve key from database
      const storedKey = await this.database.getAPIKeyByKeyId(keyId);
      if (!storedKey) {
        return {
          valid: false,
          errors: ['API key not found']
        };
      }

      // Verify key hash
      if (storedKey.hashedKey !== hashedProvidedKey) {
        await this.logSecurityIncident(keyId, 'invalid_key_attempt', 'Invalid key hash provided', context);
        return {
          valid: false,
          errors: ['Invalid API key']
        };
      }

      // Check if key is active
      if (!storedKey.isActive) {
        return {
          valid: false,
          errors: ['API key is inactive']
        };
      }

      // Check if key is compromised
      if (storedKey.compromised) {
        await this.logSecurityIncident(keyId, 'compromised_key_use', 'Attempt to use compromised key', context);
        return {
          valid: false,
          errors: ['API key has been compromised']
        };
      }

      // Check expiry
      if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
        return {
          valid: false,
          errors: ['API key has expired']
        };
      }

      // Security validations
      const securityWarnings: string[] = [];

      // Check HTTPS requirement
      if (storedKey.requiresHttps && !context.httpsUsed) {
        return {
          valid: false,
          errors: ['HTTPS required for this API key']
        };
      }

      // Check IP restrictions
      if (storedKey.allowedIpRanges.length > 0) {
        const ipAllowed = this.checkIPAllowed(context.ipAddress, storedKey.allowedIpRanges);
        if (!ipAllowed) {
          await this.logSecurityIncident(keyId, 'ip_restriction_violation', `Access from unauthorized IP: ${context.ipAddress}`, context);
          return {
            valid: false,
            errors: ['IP address not allowed']
          };
        }
      }

      // Check rate limits
      const rateLimitResult = await this.checkRateLimit(keyId, storedKey.rateLimit);
      if (rateLimitResult.rateLimited) {
        return {
          valid: false,
          errors: ['Rate limit exceeded'],
          rateLimitInfo: rateLimitResult
        };
      }

      // Check rotation requirement
      if (storedKey.rotateAfterDays && storedKey.createdAt) {
        const daysSinceCreation = (Date.now() - storedKey.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation > storedKey.rotateAfterDays) {
          securityWarnings.push('API key requires rotation');
        }
      }

      // Update last used information
      await this.database.updateAPIKey(storedKey.id, {
        lastUsedAt: new Date(),
        lastAccessIp: context.ipAddress,
        lastAccessUserAgent: context.userAgent,
        usageCount: storedKey.usageCount + 1
      });

      return {
        valid: true,
        key: storedKey,
        permissions: storedKey.permissions,
        scope: storedKey.scope,
        scopeId: storedKey.scopeId,
        securityWarnings,
        rateLimitInfo: rateLimitResult
      };

    } catch (error) {
      console.error('API key validation error:', error);
      return {
        valid: false,
        errors: ['API key validation failed']
      };
    }
  }

  // === KEY MANAGEMENT ===

  /**
   * Rotate API key (generate new key, invalidate old)
   */
  async rotateAPIKey(keyId: string): Promise<{ key: APIKey; plainTextKey: string }> {
    const existingKey = await this.database.getAPIKeyByKeyId(keyId);
    if (!existingKey) {
      throw new Error('API key not found');
    }

    // Generate new key
    const keyBytes = crypto.randomBytes(32);
    const plainTextKey = `actp_${keyBytes.toString('base64url')}`;
    const newKeyId = plainTextKey.substring(5, 13);
    const hashedKey = crypto.createHash('sha256').update(plainTextKey).digest('hex');

    // Update existing key
    const rotatedKey = await this.database.updateAPIKey(existingKey.id, {
      keyId: newKeyId,
      hashedKey,
      createdAt: new Date(),
      lastUsedAt: undefined,
      usageCount: 0,
      securityFlags: [...existingKey.securityFlags, 'rotated']
    });

    return {
      key: rotatedKey,
      plainTextKey
    };
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(keyId: string, reason: string): Promise<void> {
    const key = await this.database.getAPIKeyByKeyId(keyId);
    if (!key) {
      throw new Error('API key not found');
    }

    await this.database.updateAPIKey(key.id, {
      isActive: false,
      securityFlags: [...key.securityFlags, 'revoked', `reason:${reason}`]
    });
  }

  /**
   * Mark API key as compromised
   */
  async markCompromised(keyId: string, reason: string): Promise<void> {
    const key = await this.database.getAPIKeyByKeyId(keyId);
    if (!key) {
      throw new Error('API key not found');
    }

    await this.database.updateAPIKey(key.id, {
      compromised: true,
      compromisedAt: new Date(),
      compromiseReason: reason,
      isActive: false
    });

    // Log security incident
    await this.database.logSecurityIncident({
      keyId,
      incidentType: 'key_compromise',
      description: `API key marked as compromised: ${reason}`,
      ipAddress: 'system',
      timestamp: new Date(),
      metadata: { reason }
    });
  }

  // === USAGE TRACKING ===

  /**
   * Record API key usage
   */
  async recordUsage(
    keyId: string,
    usage: Omit<APIKeyUsage, 'id' | 'keyId' | 'timestamp'>
  ): Promise<void> {
    const fullUsage: APIKeyUsage = {
      id: crypto.randomUUID(),
      keyId,
      timestamp: new Date(),
      ...usage
    };

    await this.database.recordAPIKeyUsage(fullUsage);

    // Check for suspicious activity patterns
    await this.detectSuspiciousActivity(keyId, fullUsage);
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(keyId: string): Promise<{
    totalRequests: number;
    requestsToday: number;
    requestsThisHour: number;
    requestsThisMinute: number;
    lastUsed: Date | null;
    averageResponseTime: number;
  }> {
    return this.database.getAPIKeyUsageStats(keyId);
  }

  // === MAINTENANCE ===

  /**
   * Clean up expired keys and perform maintenance
   */
  async performMaintenance(): Promise<{
    expiredKeysDeactivated: number;
    keysRequiringRotation: number;
    suspiciousActivityDetected: number;
  }> {
    // Get expired keys
    const expiredKeys = await this.database.getExpiredAPIKeys();
    
    // Deactivate expired keys
    for (const key of expiredKeys) {
      if (key.isActive) {
        await this.database.updateAPIKey(key.id, {
          isActive: false,
          securityFlags: [...key.securityFlags, 'expired']
        });
      }
    }

    // Find keys requiring rotation
    const activeKeys = await this.database.getActiveAPIKeys();
    const keysRequiringRotation = activeKeys.filter(key => {
      if (!key.rotateAfterDays || !key.createdAt) return false;
      const daysSinceCreation = (Date.now() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation > key.rotateAfterDays;
    });

    // Add rotation warning flags
    for (const key of keysRequiringRotation) {
      if (!key.securityFlags.includes('rotation_required')) {
        await this.database.updateAPIKey(key.id, {
          securityFlags: [...key.securityFlags, 'rotation_required']
        });
      }
    }

    // Clean up rate limit store
    this.cleanupRateLimitStore();

    return {
      expiredKeysDeactivated: expiredKeys.filter(k => k.isActive).length,
      keysRequiringRotation: keysRequiringRotation.length,
      suspiciousActivityDetected: 0 // Would be calculated from recent security incidents
    };
  }

  // === HELPER METHODS ===

  /**
   * Check if IP address is in allowed ranges
   */
  private checkIPAllowed(ipAddress: string, allowedRanges: string[]): boolean {
    if (allowedRanges.length === 0) return true;
    
    // Simplified IP range checking - use proper CIDR library in production
    for (const range of allowedRanges) {
      if (range.includes('/')) {
        // CIDR notation
        const [network, prefixLength] = range.split('/');
        // Simplified check - would use proper CIDR calculation
        if (ipAddress.startsWith(network.split('.').slice(0, 2).join('.'))) {
          return true;
        }
      } else {
        // Single IP
        if (ipAddress === range) return true;
      }
    }
    
    return false;
  }

  /**
   * Check rate limits for API key
   */
  private async checkRateLimit(keyId: string, limits: APIKey['rateLimit']): Promise<{
    remaining: number;
    resetTime: Date;
    rateLimited: boolean;
  }> {
    const now = Date.now();
    const minuteStart = now - (now % (60 * 1000));
    
    const key = `${keyId}:${minuteStart}`;
    const current = this.rateLimitStore.get(key);
    
    if (!current) {
      this.rateLimitStore.set(key, { count: 1, resetTime: minuteStart + 60000 });
      return {
        remaining: limits.requestsPerMinute - 1,
        resetTime: new Date(minuteStart + 60000),
        rateLimited: false
      };
    }

    current.count++;
    
    if (current.count > limits.requestsPerMinute) {
      return {
        remaining: 0,
        resetTime: new Date(current.resetTime),
        rateLimited: true
      };
    }

    return {
      remaining: limits.requestsPerMinute - current.count,
      resetTime: new Date(current.resetTime),
      rateLimited: false
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (value.resetTime < now) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  private async detectSuspiciousActivity(keyId: string, usage: APIKeyUsage): Promise<void> {
    // Get recent usage for this key
    const recentUsage = await this.database.getAPIKeyUsage(
      keyId,
      new Date(Date.now() - 60 * 60 * 1000), // Last hour
      new Date()
    );

    const suspiciousFlags: string[] = [];

    // Check for rapid requests from different IPs
    const uniqueIPs = new Set(recentUsage.map(u => u.ipAddress));
    if (uniqueIPs.size > 10) {
      suspiciousFlags.push('multiple_ips');
    }

    // Check for unusual response patterns
    const errorRate = recentUsage.filter(u => u.responseStatus >= 400).length / recentUsage.length;
    if (errorRate > 0.5 && recentUsage.length > 10) {
      suspiciousFlags.push('high_error_rate');
    }

    // Check for data access patterns
    const dataAccessRate = recentUsage.filter(u => u.dataAccessed).length / recentUsage.length;
    if (dataAccessRate > 0.9 && recentUsage.length > 50) {
      suspiciousFlags.push('excessive_data_access');
    }

    // Log suspicious activity if detected
    if (suspiciousFlags.length > 0) {
      await this.database.logSecurityIncident({
        keyId,
        incidentType: 'suspicious_activity',
        description: `Suspicious activity detected: ${suspiciousFlags.join(', ')}`,
        ipAddress: usage.ipAddress,
        timestamp: new Date(),
        metadata: {
          flags: suspiciousFlags,
          recentRequestCount: recentUsage.length,
          uniqueIPCount: uniqueIPs.size,
          errorRate
        }
      });
    }
  }

  /**
   * Log security incident
   */
  private async logSecurityIncident(
    keyId: string,
    incidentType: string,
    description: string,
    context: { ipAddress: string; userAgent?: string; endpoint?: string; method?: string }
  ): Promise<void> {
    await this.database.logSecurityIncident({
      keyId,
      incidentType,
      description,
      ipAddress: context.ipAddress,
      timestamp: new Date(),
      metadata: {
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        method: context.method
      }
    });
  }

  // === PUBLIC UTILITY METHODS ===

  /**
   * Get API keys for owner
   */
  async getAPIKeysByOwner(ownerId: string, ownerType: string): Promise<APIKey[]> {
    return this.database.getAPIKeysByOwner(ownerId, ownerType);
  }

  /**
   * Get API key by ID
   */
  async getAPIKey(keyId: string): Promise<APIKey | null> {
    return this.database.getAPIKeyByKeyId(keyId);
  }

  /**
   * Update API key
   */
  async updateAPIKey(keyId: string, updates: Partial<APIKey>): Promise<APIKey> {
    const key = await this.database.getAPIKeyByKeyId(keyId);
    if (!key) {
      throw new Error('API key not found');
    }
    
    return this.database.updateAPIKey(key.id, updates);
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      rateLimitStoreSize: this.rateLimitStore.size,
      encryptionEnabled: true,
      maintenanceRequired: false // Would be calculated based on pending tasks
    };
  }
}