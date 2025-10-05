/**
 * Authentication Module Export Index
 * 
 * Complete authentication system for ACT Placemat with JWT, RBAC,
 * and Australian compliance features
 */

// === CORE SERVICES ===
export { JWTService } from './JWTService';
export { AuthenticationService } from './AuthenticationService';
export { RBACService } from './RBACService';
export { TokenManager } from './TokenManager';

// === MIDDLEWARE ===
export { AuthMiddleware } from './AuthMiddleware';

// === TYPES AND INTERFACES ===

// JWT Service Types
export type {
  JWTConfig,
  AccessTokenPayload,
  RefreshTokenPayload,
  LoginCredentials,
  AuthenticationResult,
  TokenValidationResult,
  SessionInfo
} from './JWTService';

// Authentication Service Types
export type {
  UserRecord,
  UserRoleAssignment,
  MFAVerificationResult,
  AuthDatabase,
  MFAService
} from './AuthenticationService';

// Middleware Types
export type {
  AuthenticatedRequest,
  AuthMiddlewareConfig,
  PermissionRequirement
} from './AuthMiddleware';

// RBAC Service Types
export type {
  RBACServiceConfig,
  RBACDatabase,
  CommunityInfo,
  ComplianceViolation,
  PermissionContext
} from './RBACService';

// Token Manager Types
export type {
  TokenPair,
  TokenRefreshRequest,
  TokenRevocationRequest,
  ActiveTokenInfo,
  TokenUsageStats,
  TokenStorage,
  SuspiciousActivity
} from './TokenManager';

// === ERROR CLASSES ===
export { 
  AuthenticationError, 
  AuthorizationError, 
  AUTH_ERROR_CODES 
} from './JWTService';

// === RBAC SYSTEM ===
export * from '../rbac/roles';
export * from '../rbac/permissions-matrix';

// === FACTORY FUNCTIONS ===

/**
 * Create a complete authentication system with all components
 */
export function createAuthenticationSystem(config: {
  jwtConfig: import('./JWTService').JWTConfig;
  rbacConfig: import('./RBACService').RBACServiceConfig;
  database: import('./AuthenticationService').AuthDatabase & import('./RBACService').RBACDatabase;
  tokenStorage: import('./TokenManager').TokenStorage;
  mfaService?: import('./AuthenticationService').MFAService;
}) {
  // Create core services
  const jwtService = new JWTService(config.jwtConfig);
  const rbacService = new RBACService({ ...config.rbacConfig, database: config.database });
  const authService = new AuthenticationService(jwtService, config.database, config.mfaService);
  const tokenManager = new TokenManager(jwtService, config.tokenStorage);

  // Create middleware
  const authMiddleware = new AuthMiddleware({
    jwtService,
    skipAuthForPaths: ['/health', '/auth/login', '/auth/register'],
    requireHttps: true,
    enableAuditLogging: true,
    maxRequestsPerMinute: 100
  });

  return {
    jwtService,
    rbacService,
    authService,
    tokenManager,
    authMiddleware,
    
    // Convenience methods
    authenticate: authMiddleware.authenticate(),
    requirePermission: (permission: import('../rbac/roles').Permission, options?: Partial<PermissionRequirement>) => 
      authMiddleware.requirePermission({ permission, ...options }),
    requireRole: (role: import('../rbac/roles').UserRole, scope?: import('../rbac/roles').PermissionScope, scopeId?: string) =>
      authMiddleware.requireRole(role, scope, scopeId),
    requireAnyRole: (roles: import('../rbac/roles').UserRole[]) =>
      authMiddleware.requireAnyRole(roles),
    requireMFA: () => AuthMiddleware.requireMFA(),
    requireFinancialApproval: (amount: number) => AuthMiddleware.requireFinancialApproval(amount),
    requireCulturalProtocols: (protocols: string[]) => AuthMiddleware.requireCulturalProtocols(protocols)
  };
}

/**
 * Create authentication middleware with common settings
 */
export function createAuthMiddleware(jwtService: JWTService, options?: Partial<AuthMiddlewareConfig>) {
  return new AuthMiddleware({
    jwtService,
    skipAuthForPaths: ['/health', '/auth/login', '/auth/register'],
    requireHttps: true,
    enableAuditLogging: true,
    maxRequestsPerMinute: 100,
    ...options
  });
}

/**
 * Create RBAC service with Australian compliance defaults
 */
export function createRBACService(database: RBACDatabase, options?: Partial<RBACServiceConfig>) {
  return new RBACService({
    database,
    enforceDataResidency: true,
    requireIndigenousProtocols: true,
    auditAllPermissionChecks: true,
    enablePermissionCaching: true,
    cacheTimeoutMinutes: 15,
    enableContextualPermissions: true,
    requireExplicitDenial: false,
    logSecurityViolations: true,
    ...options
  });
}

// === PERMISSION CHECKING HELPERS ===

/**
 * Create permission requirements for common scenarios
 */
export const PermissionRequirements = {
  // Financial operations
  createBudget: (amount?: number): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.FINANCE_BUDGET_CREATE,
    scope: import('../rbac/roles').PermissionScope.ORGANISATION,
    requireMFA: true,
    financialAmountCheck: amount
  }),

  approveBudget: (amount?: number): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.FINANCE_BUDGET_APPROVE,
    scope: import('../rbac/roles').PermissionScope.ORGANISATION,
    requireMFA: true,
    financialAmountCheck: amount
  }),

  // Indigenous data operations
  accessIndigenousData: (): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.SOVEREIGNTY_DATA_ACCESS,
    requireSovereigntyLevel: 'cultural_protocol',
    requireCulturalProtocols: ['CARE_principles']
  }),

  manageIndigenousConsent: (): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.SOVEREIGNTY_CONSENT_MANAGE,
    requireSovereigntyLevel: 'cultural_authority',
    requireCulturalProtocols: ['CARE_principles', 'FAIR_principles']
  }),

  // Community operations
  moderateStories: (): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.STORY_MODERATE,
    scope: import('../rbac/roles').PermissionScope.COMMUNITY,
    requireCulturalProtocols: ['cultural_sensitivity']
  }),

  publishStories: (): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.STORY_PUBLISH,
    scope: import('../rbac/roles').PermissionScope.COMMUNITY
  }),

  // System administration
  systemConfig: (): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.SYSTEM_CONFIG,
    scope: import('../rbac/roles').PermissionScope.GLOBAL,
    requireMFA: true
  }),

  userManagement: (): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.USER_CREATE,
    scope: import('../rbac/roles').PermissionScope.ORGANISATION,
    requireMFA: true
  }),

  // Project management
  createProject: (): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.PROJECT_CREATE,
    scope: import('../rbac/roles').PermissionScope.ORGANISATION
  }),

  assignProject: (): PermissionRequirement => ({
    permission: import('../rbac/roles').Permission.PROJECT_ASSIGN,
    scope: import('../rbac/roles').PermissionScope.PROJECT
  })
};

// === ROLE CHECKING HELPERS ===

/**
 * Create role requirements for common scenarios
 */
export const RoleRequirements = {
  // System roles
  systemAdmin: () => [import('../rbac/roles').UserRole.SUPER_ADMIN, import('../rbac/roles').UserRole.SYSTEM_ADMIN],
  securityAdmin: () => [import('../rbac/roles').UserRole.SUPER_ADMIN, import('../rbac/roles').UserRole.SECURITY_ADMIN],

  // Governance roles
  boardMember: () => [import('../rbac/roles').UserRole.BOARD_MEMBER],
  executiveLeadership: () => [import('../rbac/roles').UserRole.EXECUTIVE_DIRECTOR, import('../rbac/roles').UserRole.BOARD_MEMBER],
  financialOversight: () => [import('../rbac/roles').UserRole.FINANCE_MANAGER, import('../rbac/roles').UserRole.EXECUTIVE_DIRECTOR, import('../rbac/roles').UserRole.BOARD_MEMBER],

  // Indigenous sovereignty roles
  indigenousLeadership: () => [import('../rbac/roles').UserRole.COMMUNITY_ELDER, import('../rbac/roles').UserRole.TRADITIONAL_OWNER],
  sovereigntyGuardian: () => [import('../rbac/roles').UserRole.SOVEREIGNTY_GUARDIAN, import('../rbac/roles').UserRole.COMMUNITY_ELDER, import('../rbac/roles').UserRole.TRADITIONAL_OWNER],
  communityRepresentative: () => [import('../rbac/roles').UserRole.COMMUNITY_REPRESENTATIVE, import('../rbac/roles').UserRole.COMMUNITY_ELDER],

  // Operational roles
  projectLeadership: () => [import('../rbac/roles').UserRole.PROJECT_MANAGER, import('../rbac/roles').UserRole.PROGRAM_DIRECTOR],
  caseworker: () => [import('../rbac/roles').UserRole.CASE_WORKER],
  volunteerCoordination: () => [import('../rbac/roles').UserRole.VOLUNTEER_COORDINATOR],

  // Technical roles
  agentOperator: () => [import('../rbac/roles').UserRole.AGENT_OPERATOR],
  dataGovernance: () => [import('../rbac/roles').UserRole.DATA_STEWARD, import('../rbac/roles').UserRole.COMPLIANCE_OFFICER],

  // Community access
  communityMember: () => [import('../rbac/roles').UserRole.COMMUNITY_MEMBER, import('../rbac/roles').UserRole.VOLUNTEER],
  beneficiary: () => [import('../rbac/roles').UserRole.BENEFICIARY]
};

// === UTILITY FUNCTIONS ===

/**
 * Check if role has Indigenous sovereignty recognition
 */
export function isIndigenousSovereigntyRole(role: import('../rbac/roles').UserRole): boolean {
  const sovereigntyRoles = [
    import('../rbac/roles').UserRole.COMMUNITY_ELDER,
    import('../rbac/roles').UserRole.TRADITIONAL_OWNER,
    import('../rbac/roles').UserRole.SOVEREIGNTY_GUARDIAN,
    import('../rbac/roles').UserRole.COMMUNITY_REPRESENTATIVE
  ];
  return sovereigntyRoles.includes(role);
}

/**
 * Check if permission involves financial operations
 */
export function isFinancialPermission(permission: import('../rbac/roles').Permission): boolean {
  return permission.startsWith('finance:');
}

/**
 * Check if permission involves Indigenous data sovereignty
 */
export function isSovereigntyPermission(permission: import('../rbac/roles').Permission): boolean {
  return permission.startsWith('sovereignty:');
}

/**
 * Get financial approval limit for role
 */
export function getFinancialApprovalLimit(role: import('../rbac/roles').UserRole): number {
  return FINANCIAL_APPROVAL_THRESHOLDS[role] || 0;
}

/**
 * Get default permission scope for role
 */
export function getDefaultScope(role: import('../rbac/roles').UserRole): import('../rbac/roles').PermissionScope {
  return ROLE_DEFAULT_SCOPES[role] || import('../rbac/roles').PermissionScope.PERSONAL;
}

/**
 * Get sovereignty level for role
 */
export function getSovereigntyLevel(role: import('../rbac/roles').UserRole): import('../rbac/roles').SovereigntyLevel | undefined {
  return ROLE_SOVEREIGNTY_LEVELS[role];
}