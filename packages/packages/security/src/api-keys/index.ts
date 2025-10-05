/**
 * API Key Management Module Export Index
 * 
 * Complete API key management system for ACT Placemat with secure generation,
 * validation, rotation, and Australian compliance features
 */

// === CORE SERVICES ===
export { APIKeyService } from './APIKeyService';
export { APIKeyManager } from './APIKeyManager';

// === MIDDLEWARE ===
export { APIKeyMiddleware } from './APIKeyMiddleware';

// === TYPES AND INTERFACES ===

// Service Types
export type {
  APIKey,
  CreateAPIKeyRequest,
  APIKeyValidationResult,
  APIKeyUsage,
  APIKeyDatabase
} from './APIKeyService';

// Middleware Types
export type {
  APIKeyRequest,
  APIKeyMiddlewareConfig,
  APIKeyPermissionRequirement
} from './APIKeyMiddleware';

// Management Types
export type {
  RotationPolicy,
  APIKeyAuditEvent,
  SecurityAlert,
  ManagementStats,
  APIKeyManagementDatabase
} from './APIKeyManager';

// === FACTORY FUNCTIONS ===

/**
 * Create complete API key management system
 */
export function createAPIKeySystem(config: {
  database: import('./APIKeyService').APIKeyDatabase;
  managementDatabase: import('./APIKeyManager').APIKeyManagementDatabase;
  rbacService: import('../auth/RBACService').RBACService;
  encryptionKey: string; // 32-byte hex string
}) {
  // Create core service
  const apiKeyService = new APIKeyService(config.database, config.encryptionKey);
  
  // Create management layer
  const apiKeyManager = new APIKeyManager(
    apiKeyService,
    config.rbacService,
    config.managementDatabase
  );

  // Create middleware instances
  const middleware = {
    // Standard middleware
    standard: new APIKeyMiddleware({
      apiKeyService,
      rbacService: config.rbacService,
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
    }),

    // Indigenous data middleware
    indigenousData: APIKeyMiddleware.forIndigenousData(apiKeyService, config.rbacService),
    
    // Financial data middleware
    financialData: APIKeyMiddleware.forFinancialData(apiKeyService, config.rbacService),
    
    // Public data middleware
    publicData: APIKeyMiddleware.forPublicData(apiKeyService)
  };

  return {
    apiKeyService,
    apiKeyManager,
    middleware,
    
    // Convenience methods
    authenticate: middleware.standard.authenticate(),
    requirePermission: (permission: import('../rbac/roles').Permission, options?: Partial<APIKeyPermissionRequirement>) =>
      middleware.standard.requireAPIKeyPermission({ permission, ...options }),
    requireOwnership: (ownerIdPath?: string) =>
      middleware.standard.requireAPIKeyOwnership(ownerIdPath),
    rateLimitByKey: () => middleware.standard.rateLimitByAPIKey()
  };
}

/**
 * Create API key middleware with Australian compliance defaults
 */
export function createAPIKeyMiddleware(
  apiKeyService: APIKeyService,
  rbacService?: import('../auth/RBACService').RBACService,
  options?: Partial<APIKeyMiddlewareConfig>
) {
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
    includeErrorDetails: false,
    ...options
  });
}

/**
 * Create API key service with security defaults
 */
export function createAPIKeyService(
  database: APIKeyDatabase,
  encryptionKey: string
) {
  return new APIKeyService(database, encryptionKey);
}

// === PERMISSION HELPERS ===

/**
 * Common API key permission requirements for different scenarios
 */
export const APIKeyPermissionRequirements = {
  // Data access permissions
  readStories: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.STORY_READ,
    scope: import('../rbac/roles').PermissionScope.COMMUNITY
  }),

  writeStories: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.STORY_CREATE,
    scope: import('../rbac/roles').PermissionScope.COMMUNITY
  }),

  moderateStories: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.STORY_MODERATE,
    scope: import('../rbac/roles').PermissionScope.COMMUNITY,
    requireCulturalProtocols: ['cultural_sensitivity']
  }),

  // Financial permissions
  readFinancialData: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.FINANCE_READ,
    scope: import('../rbac/roles').PermissionScope.ORGANISATION,
    requireDataResidency: true
  }),

  createBudget: (amount?: number): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.FINANCE_BUDGET_CREATE,
    scope: import('../rbac/roles').PermissionScope.ORGANISATION,
    requireDataResidency: true,
    customValidator: async (key) => {
      if (amount && key.ownerId) {
        // Would check financial approval limits
        return true;
      }
      return true;
    }
  }),

  // Indigenous data permissions
  accessIndigenousData: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.SOVEREIGNTY_DATA_ACCESS,
    requireSovereigntyLevel: 'cultural_protocol',
    requireCulturalProtocols: ['CARE_principles'],
    allowIndigenousDataAccess: true,
    requireDataResidency: true
  }),

  manageIndigenousConsent: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.SOVEREIGNTY_CONSENT_MANAGE,
    requireSovereigntyLevel: 'cultural_authority',
    requireCulturalProtocols: ['CARE_principles', 'FAIR_principles'],
    allowIndigenousDataAccess: true,
    requireDataResidency: true
  }),

  // Project permissions
  readProjects: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.PROJECT_READ,
    scope: import('../rbac/roles').PermissionScope.ORGANISATION
  }),

  createProject: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.PROJECT_CREATE,
    scope: import('../rbac/roles').PermissionScope.ORGANISATION
  }),

  assignProject: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.PROJECT_ASSIGN,
    scope: import('../rbac/roles').PermissionScope.PROJECT
  }),

  // Member permissions
  readMembers: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.MEMBER_READ,
    scope: import('../rbac/roles').PermissionScope.COMMUNITY
  }),

  contactMembers: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.MEMBER_CONTACT,
    scope: import('../rbac/roles').PermissionScope.COMMUNITY
  }),

  // System permissions
  systemMonitoring: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.SYSTEM_MONITOR,
    scope: import('../rbac/roles').PermissionScope.GLOBAL
  }),

  apiAdmin: (): APIKeyPermissionRequirement => ({
    permission: import('../rbac/roles').Permission.API_ADMIN,
    scope: import('../rbac/roles').PermissionScope.GLOBAL
  })
};

// === UTILITY FUNCTIONS ===

/**
 * Check if permission involves Indigenous data sovereignty
 */
export function isIndigenousDataPermission(permission: import('../rbac/roles').Permission): boolean {
  return permission.startsWith('sovereignty:') || 
         permission.includes('indigenous') ||
         permission === import('../rbac/roles').Permission.STORY_MODERATE;
}

/**
 * Check if permission involves financial data
 */
export function isFinancialPermission(permission: import('../rbac/roles').Permission): boolean {
  return permission.startsWith('finance:');
}

/**
 * Check if permission requires high security
 */
export function isHighSecurityPermission(permission: import('../rbac/roles').Permission): boolean {
  const highSecurityPermissions = [
    import('../rbac/roles').Permission.SYSTEM_ADMIN,
    import('../rbac/roles').Permission.FINANCE_BUDGET_APPROVE,
    import('../rbac/roles').Permission.SOVEREIGNTY_DATA_ACCESS,
    import('../rbac/roles').Permission.DATA_EXPORT,
    import('../rbac/roles').Permission.USER_DELETE
  ];
  
  return highSecurityPermissions.includes(permission);
}

/**
 * Generate secure encryption key for API key service
 */
export function generateEncryptionKey(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate API key format
 */
export function validateAPIKeyFormat(key: string): boolean {
  return key.startsWith('actp_') && key.length >= 20;
}

/**
 * Extract key ID from API key
 */
export function extractKeyId(key: string): string | null {
  if (!validateAPIKeyFormat(key)) return null;
  return key.substring(5, 13);
}

// === DEFAULT ROTATION POLICIES ===

/**
 * Default rotation policies for different security levels
 */
export const DefaultRotationPolicies = {
  highSecurity: {
    name: 'High Security Policy',
    description: 'For keys with access to sensitive data (Indigenous, financial)',
    maxAge: 90, // 3 months
    maxUsage: 100000,
    maxInactivity: 30,
    rotateOnCompromise: true,
    rotateOnSuspiciousActivity: true,
    rotateOnOwnerChange: true,
    notifyBeforeDays: 7,
    notifyOwner: true,
    notifyAdmins: true,
    appliesTo: {
      ownerTypes: ['user', 'service'],
      permissionLevels: ['high'],
      scopes: [import('../rbac/roles').PermissionScope.GLOBAL, import('../rbac/roles').PermissionScope.ORGANISATION]
    }
  },

  standardSecurity: {
    name: 'Standard Security Policy',
    description: 'For general API access with moderate permissions',
    maxAge: 180, // 6 months
    maxUsage: 500000,
    maxInactivity: 60,
    rotateOnCompromise: true,
    rotateOnSuspiciousActivity: false,
    rotateOnOwnerChange: true,
    notifyBeforeDays: 14,
    notifyOwner: true,
    notifyAdmins: false,
    appliesTo: {
      ownerTypes: ['user', 'service'],
      permissionLevels: ['medium'],
      scopes: [import('../rbac/roles').PermissionScope.ORGANISATION, import('../rbac/roles').PermissionScope.COMMUNITY]
    }
  },

  lowSecurity: {
    name: 'Low Security Policy',
    description: 'For public or read-only access',
    maxAge: 365, // 1 year
    maxUsage: 1000000,
    maxInactivity: 180,
    rotateOnCompromise: true,
    rotateOnSuspiciousActivity: false,
    rotateOnOwnerChange: false,
    notifyBeforeDays: 30,
    notifyOwner: true,
    notifyAdmins: false,
    appliesTo: {
      ownerTypes: ['user', 'service', 'system'],
      permissionLevels: ['low'],
      scopes: [import('../rbac/roles').PermissionScope.COMMUNITY, import('../rbac/roles').PermissionScope.PERSONAL, import('../rbac/roles').PermissionScope.DELEGATED]
    }
  }
};