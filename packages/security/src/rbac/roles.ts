/**
 * Role-Based Access Control (RBAC) System for ACT Placemat
 * 
 * Designed for Australian community organisations with Indigenous sovereignty recognition
 * and multi-stakeholder governance models
 */

import { z } from 'zod';

// === CORE ROLE DEFINITIONS ===

/**
 * Primary user roles in the ACT Placemat ecosystem
 */
export enum UserRole {
  // System administration
  SUPER_ADMIN = 'super_admin',                    // Platform-wide administration
  SYSTEM_ADMIN = 'system_admin',                  // Technical system management
  SECURITY_ADMIN = 'security_admin',              // Security and audit management
  
  // Organisational leadership
  BOARD_MEMBER = 'board_member',                  // Board governance and oversight
  EXECUTIVE_DIRECTOR = 'executive_director',      // Strategic leadership
  PROGRAM_DIRECTOR = 'program_director',          // Program management
  FINANCE_MANAGER = 'finance_manager',            // Financial oversight
  
  // Community governance
  COMMUNITY_ELDER = 'community_elder',            // Indigenous community leadership
  TRADITIONAL_OWNER = 'traditional_owner',        // Traditional land/cultural ownership
  COMMUNITY_REPRESENTATIVE = 'community_rep',     // Community advocacy and representation
  SOVEREIGNTY_GUARDIAN = 'sovereignty_guardian',  // Indigenous data sovereignty
  
  // Operational roles
  PROJECT_MANAGER = 'project_manager',            // Project coordination
  CASE_WORKER = 'case_worker',                    // Direct service delivery
  VOLUNTEER_COORDINATOR = 'volunteer_coord',      // Volunteer management
  PARTNERSHIP_LIAISON = 'partnership_liaison',   // External partnerships
  
  // Community members
  COMMUNITY_MEMBER = 'community_member',          // General community participation
  VOLUNTEER = 'volunteer',                        // Volunteer contributor
  BENEFICIARY = 'beneficiary',                    // Service recipient
  
  // External stakeholders
  FUNDING_PARTNER = 'funding_partner',            // Grant providers and funders
  GOVERNMENT_LIAISON = 'government_liaison',      // Government representatives
  RESEARCHER = 'researcher',                      // Academic and policy researchers
  
  // Technical roles
  AGENT_OPERATOR = 'agent_operator',              // AI agent management
  DATA_STEWARD = 'data_steward',                  // Data governance and quality
  COMPLIANCE_OFFICER = 'compliance_officer',      // Regulatory compliance
  
  // Service accounts
  SYSTEM_AGENT = 'system_agent',                  // Automated system processes
  EXTERNAL_SERVICE = 'external_service',          // Third-party integrations
  API_CLIENT = 'api_client'                       // API consumers
}

/**
 * Role categories for hierarchical organization
 */
export enum RoleCategory {
  SYSTEM = 'system',                              // System and technical administration
  GOVERNANCE = 'governance',                      // Leadership and board governance
  COMMUNITY = 'community',                        // Community and cultural leadership
  OPERATIONAL = 'operational',                    // Day-to-day operations
  STAKEHOLDER = 'stakeholder',                    // External partners and members
  TECHNICAL = 'technical',                        // Technical and data roles
  SERVICE = 'service'                            // Automated services and integrations
}

/**
 * Indigenous sovereignty levels for cultural protocol recognition
 */
export enum SovereigntyLevel {
  TRADITIONAL_OWNER = 'traditional_owner',        // Traditional ownership recognition
  CULTURAL_AUTHORITY = 'cultural_authority',      // Cultural knowledge authority
  COMMUNITY_DELEGATE = 'community_delegate',      // Community-appointed delegate
  CULTURAL_PROTOCOL = 'cultural_protocol',        // Cultural protocol compliance
  GENERAL_RESPECT = 'general_respect'            // General cultural respect
}

// === PERMISSION SYSTEM ===

/**
 * Core permissions across the ACT Placemat platform
 */
export enum Permission {
  // System administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_MONITOR = 'system:monitor',
  SYSTEM_BACKUP = 'system:backup',
  
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_IMPERSONATE = 'user:impersonate',
  
  // Role and permission management
  ROLE_ASSIGN = 'role:assign',
  ROLE_REVOKE = 'role:revoke',
  PERMISSION_GRANT = 'permission:grant',
  PERMISSION_AUDIT = 'permission:audit',
  
  // Financial operations
  FINANCE_READ = 'finance:read',
  FINANCE_BUDGET_CREATE = 'finance:budget:create',
  FINANCE_BUDGET_APPROVE = 'finance:budget:approve',
  FINANCE_TRANSACTION_CREATE = 'finance:transaction:create',
  FINANCE_TRANSACTION_APPROVE = 'finance:transaction:approve',
  FINANCE_FORECAST = 'finance:forecast',
  FINANCE_AUDIT = 'finance:audit',
  
  // Project management
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  PROJECT_ASSIGN = 'project:assign',
  PROJECT_APPROVE = 'project:approve',
  
  // Community data and stories
  STORY_CREATE = 'story:create',
  STORY_READ = 'story:read',
  STORY_UPDATE = 'story:update',
  STORY_DELETE = 'story:delete',
  STORY_PUBLISH = 'story:publish',
  STORY_MODERATE = 'story:moderate',
  
  // Opportunities and grants
  OPPORTUNITY_CREATE = 'opportunity:create',
  OPPORTUNITY_READ = 'opportunity:read',
  OPPORTUNITY_UPDATE = 'opportunity:update',
  OPPORTUNITY_DELETE = 'opportunity:delete',
  OPPORTUNITY_APPLY = 'opportunity:apply',
  
  // People and member management
  MEMBER_CREATE = 'member:create',
  MEMBER_READ = 'member:read',
  MEMBER_UPDATE = 'member:update',
  MEMBER_DELETE = 'member:delete',
  MEMBER_CONTACT = 'member:contact',
  
  // Indigenous data sovereignty
  SOVEREIGNTY_DATA_ACCESS = 'sovereignty:data:access',
  SOVEREIGNTY_PROTOCOL_MANAGE = 'sovereignty:protocol:manage',
  SOVEREIGNTY_CONSENT_MANAGE = 'sovereignty:consent:manage',
  SOVEREIGNTY_AUDIT = 'sovereignty:audit',
  
  // Agent management
  AGENT_CREATE = 'agent:create',
  AGENT_CONFIGURE = 'agent:configure',
  AGENT_MONITOR = 'agent:monitor',
  AGENT_CONTROL = 'agent:control',
  AGENT_AUDIT = 'agent:audit',
  
  // Data governance
  DATA_EXPORT = 'data:export',
  DATA_IMPORT = 'data:import',
  DATA_BACKUP = 'data:backup',
  DATA_RESTORE = 'data:restore',
  DATA_AUDIT = 'data:audit',
  
  // Security and audit
  SECURITY_AUDIT = 'security:audit',
  SECURITY_CONFIG = 'security:config',
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',
  
  // API and integration
  API_ACCESS = 'api:access',
  API_ADMIN = 'api:admin',
  INTEGRATION_MANAGE = 'integration:manage',
  
  // Reporting and analytics
  REPORT_CREATE = 'report:create',
  REPORT_READ = 'report:read',
  ANALYTICS_ACCESS = 'analytics:access',
  ANALYTICS_ADMIN = 'analytics:admin'
}

/**
 * Permission scopes for fine-grained access control
 */
export enum PermissionScope {
  GLOBAL = 'global',                              // Platform-wide access
  ORGANISATION = 'organisation',                  // Organisation-level access
  COMMUNITY = 'community',                        // Community-level access
  PROJECT = 'project',                           // Project-specific access
  PERSONAL = 'personal',                         // Personal data access
  DELEGATED = 'delegated'                        // Delegated access from another user
}

// === ROLE DEFINITION SCHEMA ===

export const RoleDefinitionSchema = z.object({
  role: z.nativeEnum(UserRole),
  category: z.nativeEnum(RoleCategory),
  displayName: z.string(),
  description: z.string(),
  
  // Permission assignments
  permissions: z.array(z.nativeEnum(Permission)),
  permissionScopes: z.record(z.nativeEnum(PermissionScope)).default({}),
  
  // Hierarchical relationships
  inheritsFrom: z.array(z.nativeEnum(UserRole)).default([]),
  canDelegate: z.array(z.nativeEnum(UserRole)).default([]),
  
  // Australian context
  australianCompliance: z.object({
    requiresCitizenship: z.boolean().default(false),
    requiresSecurityClearance: z.boolean().default(false),
    indigenousCulturalRole: z.boolean().default(false)
  }),
  
  // Indigenous sovereignty considerations
  sovereigntyLevel: z.nativeEnum(SovereigntyLevel).optional(),
  culturalProtocols: z.array(z.string()).default([]),
  
  // Operational constraints
  constraints: z.object({
    maxConcurrentSessions: z.number().default(3),
    sessionTimeoutMinutes: z.number().default(60),
    requiresMFA: z.boolean().default(false),
    ipRestrictions: z.array(z.string()).default([]),
    timeRestrictions: z.object({
      allowedHours: z.array(z.number()).optional(),
      allowedDays: z.array(z.number()).optional(),
      timezone: z.string().default('Australia/Sydney')
    }).optional()
  }),
  
  // Approval workflows
  requiresApproval: z.object({
    assignment: z.boolean().default(false),
    approvers: z.array(z.nativeEnum(UserRole)).default([]),
    autoExpiry: z.boolean().default(false),
    expiryDays: z.number().optional()
  }),
  
  // Metadata
  isActive: z.boolean().default(true),
  isSystemRole: z.boolean().default(false),
  createdAt: z.date(),
  lastModifiedAt: z.date()
});

export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>;

// === USER ROLE ASSIGNMENT SCHEMA ===

export const UserRoleAssignmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  role: z.nativeEnum(UserRole),
  
  // Assignment context
  scope: z.nativeEnum(PermissionScope),
  scopeId: z.string().optional(), // Organisation ID, project ID, etc.
  
  // Temporal constraints
  assignedAt: z.date(),
  expiresAt: z.date().optional(),
  lastAccessedAt: z.date().optional(),
  
  // Assignment metadata
  assignedBy: z.string(),
  assignmentReason: z.string(),
  autoAssigned: z.boolean().default(false),
  
  // Indigenous sovereignty context
  sovereigntyContext: z.object({
    traditionalOwnershipRecognised: z.boolean().default(false),
    culturalProtocolsRequired: z.array(z.string()).default([]),
    communityConsentGiven: z.boolean().default(false),
    communityRepresentativeId: z.string().optional()
  }).optional(),
  
  // Status
  isActive: z.boolean().default(true),
  suspendedAt: z.date().optional(),
  suspensionReason: z.string().optional()
});

export type UserRoleAssignment = z.infer<typeof UserRoleAssignmentSchema>;

// === PERMISSION CHECK SCHEMA ===

export const PermissionCheckSchema = z.object({
  userId: z.string(),
  permission: z.nativeEnum(Permission),
  scope: z.nativeEnum(PermissionScope),
  scopeId: z.string().optional(),
  
  // Context for the permission check
  context: z.object({
    resourceId: z.string().optional(),
    resourceType: z.string().optional(),
    action: z.string(),
    metadata: z.record(z.any()).default({})
  }),
  
  // Indigenous sovereignty considerations
  sovereigntyCheck: z.object({
    requiresCulturalProtocol: z.boolean().default(false),
    traditionalOwnershipInvolved: z.boolean().default(false),
    communityConsentRequired: z.boolean().default(false)
  }).optional(),
  
  // Audit context
  auditContext: z.object({
    sessionId: z.string(),
    ipAddress: z.string(),
    userAgent: z.string(),
    timestamp: z.date()
  })
});

export type PermissionCheck = z.infer<typeof PermissionCheckSchema>;

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  roles: UserRole[];
  matchingPermissions: Permission[];
  denialReasons: string[];
  sovereigntyRequirements: string[];
  auditTrail: {
    checkId: string;
    timestamp: Date;
    result: 'allow' | 'deny';
    reasons: string[];
  };
}

// === RBAC HIERARCHY DEFINITION ===

/**
 * Role hierarchy levels for inheritance and precedence
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  // System roles (highest precedence)
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.SYSTEM_ADMIN]: 90,
  [UserRole.SECURITY_ADMIN]: 85,
  
  // Governance roles
  [UserRole.BOARD_MEMBER]: 80,
  [UserRole.EXECUTIVE_DIRECTOR]: 75,
  [UserRole.FINANCE_MANAGER]: 70,
  [UserRole.PROGRAM_DIRECTOR]: 65,
  
  // Community governance (parallel to organisational governance)
  [UserRole.COMMUNITY_ELDER]: 75,
  [UserRole.TRADITIONAL_OWNER]: 75,
  [UserRole.SOVEREIGNTY_GUARDIAN]: 70,
  [UserRole.COMMUNITY_REPRESENTATIVE]: 65,
  
  // Operational roles
  [UserRole.PROJECT_MANAGER]: 60,
  [UserRole.CASE_WORKER]: 55,
  [UserRole.VOLUNTEER_COORDINATOR]: 50,
  [UserRole.PARTNERSHIP_LIAISON]: 50,
  
  // Technical roles
  [UserRole.AGENT_OPERATOR]: 60,
  [UserRole.DATA_STEWARD]: 55,
  [UserRole.COMPLIANCE_OFFICER]: 65,
  
  // Community members
  [UserRole.COMMUNITY_MEMBER]: 30,
  [UserRole.VOLUNTEER]: 25,
  [UserRole.BENEFICIARY]: 20,
  
  // External stakeholders
  [UserRole.FUNDING_PARTNER]: 40,
  [UserRole.GOVERNMENT_LIAISON]: 35,
  [UserRole.RESEARCHER]: 30,
  
  // Service accounts
  [UserRole.SYSTEM_AGENT]: 15,
  [UserRole.EXTERNAL_SERVICE]: 10,
  [UserRole.API_CLIENT]: 5
};

/**
 * Indigenous sovereignty role recognition
 */
export const SOVEREIGNTY_ROLES = [
  UserRole.COMMUNITY_ELDER,
  UserRole.TRADITIONAL_OWNER,
  UserRole.SOVEREIGNTY_GUARDIAN,
  UserRole.COMMUNITY_REPRESENTATIVE
];

/**
 * Roles that require Australian compliance
 */
export const COMPLIANCE_REQUIRED_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.SYSTEM_ADMIN,
  UserRole.SECURITY_ADMIN,
  UserRole.BOARD_MEMBER,
  UserRole.EXECUTIVE_DIRECTOR,
  UserRole.FINANCE_MANAGER,
  UserRole.COMPLIANCE_OFFICER
];