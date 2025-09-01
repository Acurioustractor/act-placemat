/**
 * Permissions Matrix for ACT Placemat RBAC System
 * 
 * Defines default permission assignments for each role with Indigenous sovereignty
 * and Australian compliance considerations
 */

import { UserRole, Permission, PermissionScope, SovereigntyLevel } from './roles';

/**
 * Default permission matrix mapping roles to permissions
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // === SYSTEM ADMINISTRATION ===
  [UserRole.SUPER_ADMIN]: [
    // System administration (full access)
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_CONFIG,
    Permission.SYSTEM_MONITOR,
    Permission.SYSTEM_BACKUP,
    
    // User management (full access)
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_IMPERSONATE,
    
    // Role and permission management
    Permission.ROLE_ASSIGN,
    Permission.ROLE_REVOKE,
    Permission.PERMISSION_GRANT,
    Permission.PERMISSION_AUDIT,
    
    // All financial operations
    Permission.FINANCE_READ,
    Permission.FINANCE_BUDGET_CREATE,
    Permission.FINANCE_BUDGET_APPROVE,
    Permission.FINANCE_TRANSACTION_CREATE,
    Permission.FINANCE_TRANSACTION_APPROVE,
    Permission.FINANCE_FORECAST,
    Permission.FINANCE_AUDIT,
    
    // All project operations
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_ASSIGN,
    Permission.PROJECT_APPROVE,
    
    // All story operations
    Permission.STORY_CREATE,
    Permission.STORY_READ,
    Permission.STORY_UPDATE,
    Permission.STORY_DELETE,
    Permission.STORY_PUBLISH,
    Permission.STORY_MODERATE,
    
    // All opportunity operations
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_READ,
    Permission.OPPORTUNITY_UPDATE,
    Permission.OPPORTUNITY_DELETE,
    Permission.OPPORTUNITY_APPLY,
    
    // All member operations
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_DELETE,
    Permission.MEMBER_CONTACT,
    
    // Sovereignty operations (with cultural protocols)
    Permission.SOVEREIGNTY_DATA_ACCESS,
    Permission.SOVEREIGNTY_PROTOCOL_MANAGE,
    Permission.SOVEREIGNTY_CONSENT_MANAGE,
    Permission.SOVEREIGNTY_AUDIT,
    
    // Agent management
    Permission.AGENT_CREATE,
    Permission.AGENT_CONFIGURE,
    Permission.AGENT_MONITOR,
    Permission.AGENT_CONTROL,
    Permission.AGENT_AUDIT,
    
    // Data governance
    Permission.DATA_EXPORT,
    Permission.DATA_IMPORT,
    Permission.DATA_BACKUP,
    Permission.DATA_RESTORE,
    Permission.DATA_AUDIT,
    
    // Security and audit
    Permission.SECURITY_AUDIT,
    Permission.SECURITY_CONFIG,
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,
    
    // API and integration
    Permission.API_ACCESS,
    Permission.API_ADMIN,
    Permission.INTEGRATION_MANAGE,
    
    // Reporting
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS,
    Permission.ANALYTICS_ADMIN
  ],

  [UserRole.SYSTEM_ADMIN]: [
    Permission.SYSTEM_CONFIG,
    Permission.SYSTEM_MONITOR,
    Permission.SYSTEM_BACKUP,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.SECURITY_AUDIT,
    Permission.SECURITY_CONFIG,
    Permission.AGENT_CONFIGURE,
    Permission.AGENT_MONITOR,
    Permission.DATA_BACKUP,
    Permission.DATA_RESTORE,
    Permission.API_ADMIN,
    Permission.INTEGRATION_MANAGE,
    Permission.AUDIT_READ,
    Permission.ANALYTICS_ADMIN
  ],

  [UserRole.SECURITY_ADMIN]: [
    Permission.SECURITY_AUDIT,
    Permission.SECURITY_CONFIG,
    Permission.PERMISSION_AUDIT,
    Permission.USER_READ,
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,
    Permission.DATA_AUDIT,
    Permission.AGENT_AUDIT,
    Permission.FINANCE_AUDIT,
    Permission.SOVEREIGNTY_AUDIT
  ],

  // === GOVERNANCE ROLES ===
  [UserRole.BOARD_MEMBER]: [
    Permission.FINANCE_READ,
    Permission.FINANCE_BUDGET_APPROVE,
    Permission.FINANCE_TRANSACTION_APPROVE,
    Permission.FINANCE_AUDIT,
    Permission.PROJECT_READ,
    Permission.PROJECT_APPROVE,
    Permission.MEMBER_READ,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS,
    Permission.AUDIT_READ,
    Permission.STORY_READ,
    Permission.OPPORTUNITY_READ
  ],

  [UserRole.EXECUTIVE_DIRECTOR]: [
    Permission.FINANCE_READ,
    Permission.FINANCE_BUDGET_CREATE,
    Permission.FINANCE_BUDGET_APPROVE,
    Permission.FINANCE_TRANSACTION_APPROVE,
    Permission.FINANCE_FORECAST,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_ASSIGN,
    Permission.PROJECT_APPROVE,
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_CONTACT,
    Permission.STORY_READ,
    Permission.STORY_MODERATE,
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_READ,
    Permission.OPPORTUNITY_UPDATE,
    Permission.ROLE_ASSIGN,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS,
    Permission.AGENT_MONITOR
  ],

  [UserRole.PROGRAM_DIRECTOR]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_ASSIGN,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_CONTACT,
    Permission.STORY_READ,
    Permission.STORY_CREATE,
    Permission.STORY_UPDATE,
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_READ,
    Permission.OPPORTUNITY_UPDATE,
    Permission.OPPORTUNITY_APPLY,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS
  ],

  [UserRole.FINANCE_MANAGER]: [
    Permission.FINANCE_READ,
    Permission.FINANCE_BUDGET_CREATE,
    Permission.FINANCE_TRANSACTION_CREATE,
    Permission.FINANCE_TRANSACTION_APPROVE,
    Permission.FINANCE_FORECAST,
    Permission.FINANCE_AUDIT,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS,
    Permission.DATA_EXPORT
  ],

  // === COMMUNITY GOVERNANCE ROLES ===
  [UserRole.COMMUNITY_ELDER]: [
    // Community governance with sovereignty recognition
    Permission.SOVEREIGNTY_DATA_ACCESS,
    Permission.SOVEREIGNTY_PROTOCOL_MANAGE,
    Permission.SOVEREIGNTY_CONSENT_MANAGE,
    Permission.SOVEREIGNTY_AUDIT,
    
    // Community data access
    Permission.STORY_READ,
    Permission.STORY_CREATE,
    Permission.STORY_UPDATE,
    Permission.STORY_MODERATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_CONTACT,
    Permission.PROJECT_READ,
    Permission.PROJECT_APPROVE,
    Permission.OPPORTUNITY_READ,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS,
    
    // Cultural oversight
    Permission.ROLE_ASSIGN, // For community roles only
    Permission.AUDIT_READ
  ],

  [UserRole.TRADITIONAL_OWNER]: [
    // Sovereignty and cultural authority
    Permission.SOVEREIGNTY_DATA_ACCESS,
    Permission.SOVEREIGNTY_PROTOCOL_MANAGE,
    Permission.SOVEREIGNTY_CONSENT_MANAGE,
    Permission.SOVEREIGNTY_AUDIT,
    
    // Cultural data governance
    Permission.STORY_READ,
    Permission.STORY_CREATE,
    Permission.STORY_UPDATE,
    Permission.STORY_MODERATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_APPROVE,
    Permission.MEMBER_READ,
    Permission.OPPORTUNITY_READ,
    Permission.REPORT_READ,
    Permission.DATA_AUDIT
  ],

  [UserRole.SOVEREIGNTY_GUARDIAN]: [
    Permission.SOVEREIGNTY_DATA_ACCESS,
    Permission.SOVEREIGNTY_PROTOCOL_MANAGE,
    Permission.SOVEREIGNTY_CONSENT_MANAGE,
    Permission.SOVEREIGNTY_AUDIT,
    Permission.STORY_READ,
    Permission.STORY_MODERATE,
    Permission.MEMBER_READ,
    Permission.PROJECT_READ,
    Permission.DATA_AUDIT,
    Permission.AUDIT_READ
  ],

  [UserRole.COMMUNITY_REPRESENTATIVE]: [
    Permission.STORY_READ,
    Permission.STORY_CREATE,
    Permission.STORY_UPDATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_CONTACT,
    Permission.PROJECT_READ,
    Permission.OPPORTUNITY_READ,
    Permission.OPPORTUNITY_APPLY,
    Permission.REPORT_READ,
    Permission.SOVEREIGNTY_DATA_ACCESS
  ],

  // === OPERATIONAL ROLES ===
  [UserRole.PROJECT_MANAGER]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_ASSIGN,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_CONTACT,
    Permission.STORY_CREATE,
    Permission.STORY_READ,
    Permission.STORY_UPDATE,
    Permission.OPPORTUNITY_READ,
    Permission.OPPORTUNITY_APPLY,
    Permission.FINANCE_READ,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ
  ],

  [UserRole.CASE_WORKER]: [
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_CONTACT,
    Permission.STORY_CREATE,
    Permission.STORY_READ,
    Permission.STORY_UPDATE,
    Permission.PROJECT_READ,
    Permission.OPPORTUNITY_READ,
    Permission.OPPORTUNITY_APPLY,
    Permission.REPORT_READ
  ],

  [UserRole.VOLUNTEER_COORDINATOR]: [
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_CONTACT,
    Permission.PROJECT_READ,
    Permission.PROJECT_ASSIGN,
    Permission.STORY_READ,
    Permission.OPPORTUNITY_READ,
    Permission.REPORT_READ
  ],

  [UserRole.PARTNERSHIP_LIAISON]: [
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_READ,
    Permission.OPPORTUNITY_UPDATE,
    Permission.PROJECT_READ,
    Permission.MEMBER_READ,
    Permission.MEMBER_CONTACT,
    Permission.STORY_READ,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS
  ],

  // === COMMUNITY MEMBERS ===
  [UserRole.COMMUNITY_MEMBER]: [
    Permission.STORY_CREATE,
    Permission.STORY_READ,
    Permission.PROJECT_READ,
    Permission.OPPORTUNITY_READ,
    Permission.OPPORTUNITY_APPLY,
    Permission.MEMBER_READ,
    Permission.API_ACCESS
  ],

  [UserRole.VOLUNTEER]: [
    Permission.STORY_READ,
    Permission.PROJECT_READ,
    Permission.OPPORTUNITY_READ,
    Permission.MEMBER_READ,
    Permission.API_ACCESS
  ],

  [UserRole.BENEFICIARY]: [
    Permission.STORY_READ,
    Permission.PROJECT_READ,
    Permission.OPPORTUNITY_READ,
    Permission.API_ACCESS
  ],

  // === EXTERNAL STAKEHOLDERS ===
  [UserRole.FUNDING_PARTNER]: [
    Permission.PROJECT_READ,
    Permission.FINANCE_READ,
    Permission.STORY_READ,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS,
    Permission.OPPORTUNITY_CREATE,
    Permission.OPPORTUNITY_READ
  ],

  [UserRole.GOVERNMENT_LIAISON]: [
    Permission.PROJECT_READ,
    Permission.STORY_READ,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS,
    Permission.OPPORTUNITY_READ,
    Permission.AUDIT_READ
  ],

  [UserRole.RESEARCHER]: [
    Permission.STORY_READ,
    Permission.PROJECT_READ,
    Permission.ANALYTICS_ACCESS,
    Permission.REPORT_READ,
    Permission.DATA_EXPORT
  ],

  // === TECHNICAL ROLES ===
  [UserRole.AGENT_OPERATOR]: [
    Permission.AGENT_CREATE,
    Permission.AGENT_CONFIGURE,
    Permission.AGENT_MONITOR,
    Permission.AGENT_CONTROL,
    Permission.SYSTEM_MONITOR,
    Permission.API_ACCESS,
    Permission.INTEGRATION_MANAGE
  ],

  [UserRole.DATA_STEWARD]: [
    Permission.DATA_EXPORT,
    Permission.DATA_IMPORT,
    Permission.DATA_AUDIT,
    Permission.MEMBER_READ,
    Permission.PROJECT_READ,
    Permission.STORY_READ,
    Permission.OPPORTUNITY_READ,
    Permission.ANALYTICS_ACCESS,
    Permission.REPORT_CREATE
  ],

  [UserRole.COMPLIANCE_OFFICER]: [
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,
    Permission.COMPLIANCE_AUDIT: Permission.SECURITY_AUDIT,
    Permission.DATA_AUDIT,
    Permission.FINANCE_AUDIT,
    Permission.SOVEREIGNTY_AUDIT,
    Permission.REPORT_CREATE,
    Permission.REPORT_READ,
    Permission.ANALYTICS_ACCESS
  ],

  // === SERVICE ACCOUNTS ===
  [UserRole.SYSTEM_AGENT]: [
    Permission.API_ACCESS,
    Permission.SYSTEM_MONITOR,
    Permission.DATA_BACKUP,
    Permission.AGENT_MONITOR
  ],

  [UserRole.EXTERNAL_SERVICE]: [
    Permission.API_ACCESS
  ],

  [UserRole.API_CLIENT]: [
    Permission.API_ACCESS
  ]
};

/**
 * Default permission scopes for roles
 */
export const ROLE_DEFAULT_SCOPES: Record<UserRole, PermissionScope> = {
  // System roles get global scope
  [UserRole.SUPER_ADMIN]: PermissionScope.GLOBAL,
  [UserRole.SYSTEM_ADMIN]: PermissionScope.GLOBAL,
  [UserRole.SECURITY_ADMIN]: PermissionScope.GLOBAL,
  
  // Governance roles get organisation scope
  [UserRole.BOARD_MEMBER]: PermissionScope.ORGANISATION,
  [UserRole.EXECUTIVE_DIRECTOR]: PermissionScope.ORGANISATION,
  [UserRole.PROGRAM_DIRECTOR]: PermissionScope.ORGANISATION,
  [UserRole.FINANCE_MANAGER]: PermissionScope.ORGANISATION,
  
  // Community governance gets community scope
  [UserRole.COMMUNITY_ELDER]: PermissionScope.COMMUNITY,
  [UserRole.TRADITIONAL_OWNER]: PermissionScope.COMMUNITY,
  [UserRole.SOVEREIGNTY_GUARDIAN]: PermissionScope.COMMUNITY,
  [UserRole.COMMUNITY_REPRESENTATIVE]: PermissionScope.COMMUNITY,
  
  // Operational roles get organisation scope
  [UserRole.PROJECT_MANAGER]: PermissionScope.PROJECT,
  [UserRole.CASE_WORKER]: PermissionScope.ORGANISATION,
  [UserRole.VOLUNTEER_COORDINATOR]: PermissionScope.ORGANISATION,
  [UserRole.PARTNERSHIP_LIAISON]: PermissionScope.ORGANISATION,
  
  // Community members get personal/community scope
  [UserRole.COMMUNITY_MEMBER]: PermissionScope.COMMUNITY,
  [UserRole.VOLUNTEER]: PermissionScope.COMMUNITY,
  [UserRole.BENEFICIARY]: PermissionScope.PERSONAL,
  
  // External stakeholders get limited scope
  [UserRole.FUNDING_PARTNER]: PermissionScope.PROJECT,
  [UserRole.GOVERNMENT_LIAISON]: PermissionScope.ORGANISATION,
  [UserRole.RESEARCHER]: PermissionScope.ORGANISATION,
  
  // Technical roles
  [UserRole.AGENT_OPERATOR]: PermissionScope.GLOBAL,
  [UserRole.DATA_STEWARD]: PermissionScope.ORGANISATION,
  [UserRole.COMPLIANCE_OFFICER]: PermissionScope.ORGANISATION,
  
  // Service accounts
  [UserRole.SYSTEM_AGENT]: PermissionScope.GLOBAL,
  [UserRole.EXTERNAL_SERVICE]: PermissionScope.DELEGATED,
  [UserRole.API_CLIENT]: PermissionScope.DELEGATED
};

/**
 * Indigenous sovereignty role mapping
 */
export const ROLE_SOVEREIGNTY_LEVELS: Record<UserRole, SovereigntyLevel | undefined> = {
  [UserRole.COMMUNITY_ELDER]: SovereigntyLevel.CULTURAL_AUTHORITY,
  [UserRole.TRADITIONAL_OWNER]: SovereigntyLevel.TRADITIONAL_OWNER,
  [UserRole.SOVEREIGNTY_GUARDIAN]: SovereigntyLevel.CULTURAL_AUTHORITY,
  [UserRole.COMMUNITY_REPRESENTATIVE]: SovereigntyLevel.COMMUNITY_DELEGATE,
  
  // All other roles get general respect
  [UserRole.COMMUNITY_MEMBER]: SovereigntyLevel.GENERAL_RESPECT,
  [UserRole.VOLUNTEER]: SovereigntyLevel.GENERAL_RESPECT,
  [UserRole.BENEFICIARY]: SovereigntyLevel.GENERAL_RESPECT,
  [UserRole.PROJECT_MANAGER]: SovereigntyLevel.CULTURAL_PROTOCOL,
  [UserRole.CASE_WORKER]: SovereigntyLevel.CULTURAL_PROTOCOL,
  [UserRole.EXECUTIVE_DIRECTOR]: SovereigntyLevel.CULTURAL_PROTOCOL,
  [UserRole.PROGRAM_DIRECTOR]: SovereigntyLevel.CULTURAL_PROTOCOL,
  
  // System and external roles
  [UserRole.SUPER_ADMIN]: undefined,
  [UserRole.SYSTEM_ADMIN]: undefined,
  [UserRole.SECURITY_ADMIN]: undefined,
  [UserRole.BOARD_MEMBER]: undefined,
  [UserRole.FINANCE_MANAGER]: undefined,
  [UserRole.VOLUNTEER_COORDINATOR]: undefined,
  [UserRole.PARTNERSHIP_LIAISON]: undefined,
  [UserRole.FUNDING_PARTNER]: undefined,
  [UserRole.GOVERNMENT_LIAISON]: undefined,
  [UserRole.RESEARCHER]: undefined,
  [UserRole.AGENT_OPERATOR]: undefined,
  [UserRole.DATA_STEWARD]: undefined,
  [UserRole.COMPLIANCE_OFFICER]: undefined,
  [UserRole.SYSTEM_AGENT]: undefined,
  [UserRole.EXTERNAL_SERVICE]: undefined,
  [UserRole.API_CLIENT]: undefined
};

/**
 * Roles that require Indigenous cultural protocols
 */
export const CULTURAL_PROTOCOL_ROLES = [
  UserRole.COMMUNITY_ELDER,
  UserRole.TRADITIONAL_OWNER,
  UserRole.SOVEREIGNTY_GUARDIAN,
  UserRole.COMMUNITY_REPRESENTATIVE
];

/**
 * Roles that can delegate sovereignty permissions
 */
export const SOVEREIGNTY_DELEGATION_ROLES = [
  UserRole.COMMUNITY_ELDER,
  UserRole.TRADITIONAL_OWNER,
  UserRole.SOVEREIGNTY_GUARDIAN
];

/**
 * Financial approval thresholds by role (in AUD)
 */
export const FINANCIAL_APPROVAL_THRESHOLDS: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: Infinity,
  [UserRole.BOARD_MEMBER]: 100000,
  [UserRole.EXECUTIVE_DIRECTOR]: 50000,
  [UserRole.FINANCE_MANAGER]: 25000,
  [UserRole.PROGRAM_DIRECTOR]: 10000,
  [UserRole.PROJECT_MANAGER]: 5000,
  [UserRole.CASE_WORKER]: 1000,
  [UserRole.COMMUNITY_ELDER]: 10000, // Community sovereignty recognition
  [UserRole.TRADITIONAL_OWNER]: 10000, // Cultural authority recognition
  
  // Default for other roles
  [UserRole.VOLUNTEER_COORDINATOR]: 500,
  [UserRole.PARTNERSHIP_LIAISON]: 2000,
  [UserRole.DATA_STEWARD]: 0, // No financial approval authority
  [UserRole.COMPLIANCE_OFFICER]: 0,
  [UserRole.AGENT_OPERATOR]: 0,
  [UserRole.COMMUNITY_MEMBER]: 0,
  [UserRole.VOLUNTEER]: 0,
  [UserRole.BENEFICIARY]: 0,
  [UserRole.FUNDING_PARTNER]: 0,
  [UserRole.GOVERNMENT_LIAISON]: 0,
  [UserRole.RESEARCHER]: 0,
  [UserRole.SYSTEM_ADMIN]: 0,
  [UserRole.SECURITY_ADMIN]: 0,
  [UserRole.SOVEREIGNTY_GUARDIAN]: 0,
  [UserRole.COMMUNITY_REPRESENTATIVE]: 0,
  [UserRole.SYSTEM_AGENT]: 0,
  [UserRole.EXTERNAL_SERVICE]: 0,
  [UserRole.API_CLIENT]: 0
};