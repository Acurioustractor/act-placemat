/**
 * RBAC Database Schema for ACT Placemat
 * 
 * Complete database schema implementation with Australian compliance,
 * Indigenous sovereignty recognition, and multi-stakeholder governance
 */

import { z } from 'zod';
import { 
  UserRole, 
  Permission, 
  PermissionScope, 
  SovereigntyLevel,
  RoleCategory,
  UserRoleAssignmentSchema,
  PermissionCheckSchema,
  PermissionCheckResult
} from './roles';

// === DATABASE TABLE SCHEMAS ===

/**
 * Users table schema with Australian context
 */
export const UsersTableSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password_hash: z.string(),
  
  // Personal information
  first_name: z.string(),
  last_name: z.string(),
  preferred_name: z.string().optional(),
  
  // Australian context
  citizenship_status: z.enum(['citizen', 'permanent_resident', 'temporary_visa', 'other']).optional(),
  indigenous_status: z.enum(['aboriginal', 'torres_strait_islander', 'both', 'neither']).optional(),
  
  // Community affiliations
  primary_community_id: z.string().uuid().optional(),
  traditional_country: z.string().optional(),
  cultural_protocols_acknowledged: z.boolean().default(false),
  
  // Account status
  is_active: z.boolean().default(true),
  is_verified: z.boolean().default(false),
  email_verified_at: z.date().optional(),
  last_login_at: z.date().optional(),
  
  // Security
  mfa_enabled: z.boolean().default(false),
  security_clearance_level: z.string().optional(),
  failed_login_attempts: z.number().default(0),
  locked_until: z.date().optional(),
  
  // Audit
  created_at: z.date(),
  updated_at: z.date(),
  created_by: z.string().optional(),
  updated_by: z.string().optional()
});

/**
 * Roles table schema
 */
export const RolesTableSchema = z.object({
  role: z.nativeEnum(UserRole),
  category: z.nativeEnum(RoleCategory),
  display_name: z.string(),
  description: z.string(),
  
  // Hierarchical data
  hierarchy_level: z.number(),
  inherits_from: z.array(z.nativeEnum(UserRole)).default([]),
  can_delegate_to: z.array(z.nativeEnum(UserRole)).default([]),
  
  // Australian compliance
  requires_citizenship: z.boolean().default(false),
  requires_security_clearance: z.boolean().default(false),
  indigenous_cultural_role: z.boolean().default(false),
  
  // Indigenous sovereignty
  sovereignty_level: z.nativeEnum(SovereigntyLevel).optional(),
  cultural_protocols: z.array(z.string()).default([]),
  
  // Operational constraints
  max_concurrent_sessions: z.number().default(3),
  session_timeout_minutes: z.number().default(60),
  requires_mfa: z.boolean().default(false),
  
  // Financial constraints
  financial_approval_limit_aud: z.number().default(0),
  
  // Status
  is_active: z.boolean().default(true),
  is_system_role: z.boolean().default(false),
  created_at: z.date(),
  updated_at: z.date()
});

/**
 * User role assignments table schema
 */
export const UserRoleAssignmentsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.nativeEnum(UserRole),
  
  // Assignment scope and context
  scope: z.nativeEnum(PermissionScope),
  scope_id: z.string().optional(), // Organisation, project, community ID
  
  // Temporal aspects
  assigned_at: z.date(),
  expires_at: z.date().optional(),
  last_accessed_at: z.date().optional(),
  
  // Assignment metadata
  assigned_by: z.string().uuid(),
  assignment_reason: z.string(),
  auto_assigned: z.boolean().default(false),
  
  // Indigenous sovereignty context
  traditional_ownership_recognised: z.boolean().default(false),
  cultural_protocols_required: z.array(z.string()).default([]),
  community_consent_given: z.boolean().default(false),
  community_representative_id: z.string().uuid().optional(),
  
  // Approval workflow
  requires_approval: z.boolean().default(false),
  approval_status: z.enum(['pending', 'approved', 'rejected', 'expired']).default('approved'),
  approved_by: z.string().uuid().optional(),
  approved_at: z.date().optional(),
  
  // Status
  is_active: z.boolean().default(true),
  suspended_at: z.date().optional(),
  suspension_reason: z.string().optional(),
  
  // Audit trail
  created_at: z.date(),
  updated_at: z.date()
});

/**
 * Role permissions table schema
 */
export const RolePermissionsTableSchema = z.object({
  id: z.string().uuid(),
  role: z.nativeEnum(UserRole),
  permission: z.nativeEnum(Permission),
  
  // Permission scope
  default_scope: z.nativeEnum(PermissionScope),
  scope_restrictions: z.array(z.string()).default([]),
  
  // Conditions and constraints
  conditions: z.record(z.any()).default({}),
  resource_filters: z.record(z.any()).default({}),
  
  // Indigenous sovereignty constraints
  requires_cultural_protocol: z.boolean().default(false),
  requires_community_consent: z.boolean().default(false),
  sovereignty_level_required: z.nativeEnum(SovereigntyLevel).optional(),
  
  // Financial constraints
  max_amount_aud: z.number().optional(),
  approval_required_above_aud: z.number().optional(),
  
  // Temporal constraints
  allowed_hours: z.array(z.number()).optional(), // 0-23
  allowed_days: z.array(z.number()).optional(),  // 0-6 (Sunday-Saturday)
  timezone: z.string().default('Australia/Sydney'),
  
  // Status
  is_active: z.boolean().default(true),
  effective_from: z.date(),
  effective_until: z.date().optional(),
  
  // Audit
  created_at: z.date(),
  updated_at: z.date(),
  created_by: z.string().uuid()
});

/**
 * Permission checks audit log schema
 */
export const PermissionChecksAuditSchema = z.object({
  id: z.string().uuid(),
  check_id: z.string(),
  
  // Request details
  user_id: z.string().uuid(),
  permission: z.nativeEnum(Permission),
  scope: z.nativeEnum(PermissionScope),
  scope_id: z.string().optional(),
  
  // Resource context
  resource_id: z.string().optional(),
  resource_type: z.string().optional(),
  action: z.string(),
  
  // Result
  result: z.enum(['allow', 'deny']),
  roles_checked: z.array(z.nativeEnum(UserRole)),
  matching_permissions: z.array(z.nativeEnum(Permission)),
  denial_reasons: z.array(z.string()).default([]),
  
  // Indigenous sovereignty context
  sovereignty_requirements: z.array(z.string()).default([]),
  cultural_protocols_followed: z.boolean().default(true),
  community_consent_verified: z.boolean().default(true),
  
  // Session context
  session_id: z.string(),
  ip_address: z.string(),
  user_agent: z.string(),
  
  // Performance metrics
  check_duration_ms: z.number(),
  cache_hit: z.boolean().default(false),
  
  // Audit metadata
  timestamp: z.date(),
  created_at: z.date()
});

/**
 * Communities table schema for Indigenous sovereignty
 */
export const CommunitiesTableSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  display_name: z.string(),
  
  // Geographic context
  traditional_country: z.string(),
  state_territory: z.string(),
  regions: z.array(z.string()).default([]),
  
  // Sovereignty recognition
  traditional_ownership_recognised: z.boolean().default(false),
  native_title_status: z.enum(['determined', 'pending', 'none']).optional(),
  cultural_protocols: z.array(z.string()).default([]),
  
  // Governance
  governance_model: z.enum(['traditional', 'contemporary', 'hybrid']),
  decision_making_process: z.string(),
  consent_requirements: z.record(z.any()).default({}),
  
  // Contact and representation
  primary_contact_id: z.string().uuid().optional(),
  authorized_representatives: z.array(z.string().uuid()).default([]),
  
  // Status
  is_active: z.boolean().default(true),
  verified_at: z.date().optional(),
  verified_by: z.string().uuid().optional(),
  
  // Audit
  created_at: z.date(),
  updated_at: z.date(),
  created_by: z.string().uuid()
});

/**
 * Security sessions table schema
 */
export const SecuritySessionsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_token: z.string(),
  
  // Session details
  ip_address: z.string(),
  user_agent: z.string(),
  location: z.string().optional(),
  device_fingerprint: z.string().optional(),
  
  // Security context
  mfa_verified: z.boolean().default(false),
  risk_score: z.number().default(0),
  security_flags: z.array(z.string()).default([]),
  
  // Timing
  created_at: z.date(),
  last_activity_at: z.date(),
  expires_at: z.date(),
  
  // Status
  is_active: z.boolean().default(true),
  terminated_at: z.date().optional(),
  termination_reason: z.string().optional()
});

// === TYPE DEFINITIONS ===

export type UsersTable = z.infer<typeof UsersTableSchema>;
export type RolesTable = z.infer<typeof RolesTableSchema>;
export type UserRoleAssignmentsTable = z.infer<typeof UserRoleAssignmentsTableSchema>;
export type RolePermissionsTable = z.infer<typeof RolePermissionsTableSchema>;
export type PermissionChecksAudit = z.infer<typeof PermissionChecksAuditSchema>;
export type CommunitiesTable = z.infer<typeof CommunitiesTableSchema>;
export type SecuritySessionsTable = z.infer<typeof SecuritySessionsTableSchema>;

// === DATABASE CONSTRAINTS ===

/**
 * Database constraints for Australian compliance
 */
export const DATABASE_CONSTRAINTS = {
  // Data residency
  DATA_RESIDENCY_REQUIRED: true,
  ENCRYPTION_AT_REST_REQUIRED: true,
  ENCRYPTION_IN_TRANSIT_REQUIRED: true,
  
  // Audit requirements
  AUDIT_LOG_RETENTION_DAYS: 2555, // 7 years for Australian compliance
  BACKUP_RETENTION_DAYS: 365,
  
  // Session security
  MAX_SESSION_DURATION_HOURS: 24,
  MFA_REQUIRED_FOR_ADMIN_ROLES: true,
  
  // Indigenous data sovereignty
  INDIGENOUS_DATA_PROTOCOLS_REQUIRED: true,
  COMMUNITY_CONSENT_TRACKING_REQUIRED: true,
  
  // Financial approval thresholds
  FINANCIAL_APPROVAL_AUDIT_THRESHOLD_AUD: 1000,
  LARGE_TRANSACTION_REPORTING_THRESHOLD_AUD: 10000
} as const;

// === SQL DDL STATEMENTS ===

/**
 * PostgreSQL DDL for creating RBAC tables
 */
export const CREATE_RBAC_TABLES_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Personal information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    preferred_name VARCHAR(100),
    
    -- Australian context
    citizenship_status VARCHAR(50) CHECK (citizenship_status IN ('citizen', 'permanent_resident', 'temporary_visa', 'other')),
    indigenous_status VARCHAR(50) CHECK (indigenous_status IN ('aboriginal', 'torres_strait_islander', 'both', 'neither')),
    
    -- Community affiliations
    primary_community_id UUID REFERENCES communities(id),
    traditional_country VARCHAR(200),
    cultural_protocols_acknowledged BOOLEAN DEFAULT FALSE,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Security
    mfa_enabled BOOLEAN DEFAULT FALSE,
    security_clearance_level VARCHAR(50),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Communities table (must be created before users due to foreign key)
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    
    -- Geographic context
    traditional_country VARCHAR(200) NOT NULL,
    state_territory VARCHAR(50) NOT NULL,
    regions TEXT[], -- Array of region names
    
    -- Sovereignty recognition
    traditional_ownership_recognised BOOLEAN DEFAULT FALSE,
    native_title_status VARCHAR(50) CHECK (native_title_status IN ('determined', 'pending', 'none')),
    cultural_protocols TEXT[], -- Array of protocol descriptions
    
    -- Governance
    governance_model VARCHAR(50) NOT NULL CHECK (governance_model IN ('traditional', 'contemporary', 'hybrid')),
    decision_making_process TEXT NOT NULL,
    consent_requirements JSONB DEFAULT '{}',
    
    -- Contact and representation
    primary_contact_id UUID,
    authorized_representatives UUID[], -- Array of user IDs
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    role VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- Hierarchical data
    hierarchy_level INTEGER NOT NULL,
    inherits_from TEXT[], -- Array of role names
    can_delegate_to TEXT[], -- Array of role names
    
    -- Australian compliance
    requires_citizenship BOOLEAN DEFAULT FALSE,
    requires_security_clearance BOOLEAN DEFAULT FALSE,
    indigenous_cultural_role BOOLEAN DEFAULT FALSE,
    
    -- Indigenous sovereignty
    sovereignty_level VARCHAR(50),
    cultural_protocols TEXT[], -- Array of required protocols
    
    -- Operational constraints
    max_concurrent_sessions INTEGER DEFAULT 3,
    session_timeout_minutes INTEGER DEFAULT 60,
    requires_mfa BOOLEAN DEFAULT FALSE,
    
    -- Financial constraints
    financial_approval_limit_aud DECIMAL(15,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User role assignments table
CREATE TABLE IF NOT EXISTS user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL REFERENCES roles(role),
    
    -- Assignment scope and context
    scope VARCHAR(50) NOT NULL,
    scope_id VARCHAR(255), -- Can reference different types of entities
    
    -- Temporal aspects
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Assignment metadata
    assigned_by UUID NOT NULL REFERENCES users(id),
    assignment_reason TEXT NOT NULL,
    auto_assigned BOOLEAN DEFAULT FALSE,
    
    -- Indigenous sovereignty context
    traditional_ownership_recognised BOOLEAN DEFAULT FALSE,
    cultural_protocols_required TEXT[],
    community_consent_given BOOLEAN DEFAULT FALSE,
    community_representative_id UUID REFERENCES users(id),
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, role, scope, scope_id)
);

-- Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(100) NOT NULL REFERENCES roles(role),
    permission VARCHAR(100) NOT NULL,
    
    -- Permission scope
    default_scope VARCHAR(50) NOT NULL,
    scope_restrictions TEXT[],
    
    -- Conditions and constraints
    conditions JSONB DEFAULT '{}',
    resource_filters JSONB DEFAULT '{}',
    
    -- Indigenous sovereignty constraints
    requires_cultural_protocol BOOLEAN DEFAULT FALSE,
    requires_community_consent BOOLEAN DEFAULT FALSE,
    sovereignty_level_required VARCHAR(50),
    
    -- Financial constraints
    max_amount_aud DECIMAL(15,2),
    approval_required_above_aud DECIMAL(15,2),
    
    -- Temporal constraints
    allowed_hours INTEGER[],
    allowed_days INTEGER[],
    timezone VARCHAR(50) DEFAULT 'Australia/Sydney',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Constraints
    UNIQUE(role, permission)
);

-- Permission checks audit log
CREATE TABLE IF NOT EXISTS permission_checks_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_id VARCHAR(100) NOT NULL,
    
    -- Request details
    user_id UUID NOT NULL REFERENCES users(id),
    permission VARCHAR(100) NOT NULL,
    scope VARCHAR(50) NOT NULL,
    scope_id VARCHAR(255),
    
    -- Resource context
    resource_id VARCHAR(255),
    resource_type VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    
    -- Result
    result VARCHAR(10) NOT NULL CHECK (result IN ('allow', 'deny')),
    roles_checked TEXT[],
    matching_permissions TEXT[],
    denial_reasons TEXT[],
    
    -- Indigenous sovereignty context
    sovereignty_requirements TEXT[],
    cultural_protocols_followed BOOLEAN DEFAULT TRUE,
    community_consent_verified BOOLEAN DEFAULT TRUE,
    
    -- Session context
    session_id VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    
    -- Performance metrics
    check_duration_ms INTEGER NOT NULL,
    cache_hit BOOLEAN DEFAULT FALSE,
    
    -- Audit metadata
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security sessions table
CREATE TABLE IF NOT EXISTS security_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Session details
    ip_address INET NOT NULL,
    user_agent TEXT,
    location VARCHAR(200),
    device_fingerprint VARCHAR(255),
    
    -- Security context
    mfa_verified BOOLEAN DEFAULT FALSE,
    risk_score DECIMAL(3,2) DEFAULT 0,
    security_flags TEXT[],
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason VARCHAR(200)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_community ON users(primary_community_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role ON user_role_assignments(role);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_active ON user_role_assignments(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_scope ON user_role_assignments(scope, scope_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_role_permissions_active ON role_permissions(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_permission_checks_audit_user ON permission_checks_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_checks_audit_timestamp ON permission_checks_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_permission_checks_audit_result ON permission_checks_audit(result);

CREATE INDEX IF NOT EXISTS idx_security_sessions_user ON security_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_security_sessions_token ON security_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_security_sessions_active ON security_sessions(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_communities_country ON communities(traditional_country);
CREATE INDEX IF NOT EXISTS idx_communities_active ON communities(is_active) WHERE is_active = TRUE;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_role_assignments_updated_at BEFORE UPDATE ON user_role_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

/**
 * Role-based row-level security policies
 */
export const RLS_POLICIES_SQL = `
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_checks_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_sessions ENABLE ROW LEVEL SECURITY;

-- Users can see their own data
CREATE POLICY user_own_data ON users
    FOR ALL TO authenticated_user
    USING (id = current_setting('app.user_id')::UUID);

-- Admins can see all users
CREATE POLICY admin_all_users ON users
    FOR ALL TO authenticated_user
    USING (
        EXISTS (
            SELECT 1 FROM user_role_assignments ura 
            WHERE ura.user_id = current_setting('app.user_id')::UUID 
            AND ura.role IN ('super_admin', 'system_admin')
            AND ura.is_active = TRUE
        )
    );

-- Community representatives can see their community members
CREATE POLICY community_rep_members ON users
    FOR SELECT TO authenticated_user
    USING (
        primary_community_id IN (
            SELECT scope_id::UUID FROM user_role_assignments ura
            WHERE ura.user_id = current_setting('app.user_id')::UUID
            AND ura.role IN ('community_elder', 'traditional_owner', 'community_representative')
            AND ura.scope = 'community'
            AND ura.is_active = TRUE
        )
    );

-- Role assignments visibility
CREATE POLICY role_assignments_visibility ON user_role_assignments
    FOR SELECT TO authenticated_user
    USING (
        user_id = current_setting('app.user_id')::UUID OR
        EXISTS (
            SELECT 1 FROM user_role_assignments ura 
            WHERE ura.user_id = current_setting('app.user_id')::UUID 
            AND ura.role IN ('super_admin', 'system_admin', 'security_admin')
            AND ura.is_active = TRUE
        )
    );

-- Audit log access for compliance officers
CREATE POLICY audit_log_access ON permission_checks_audit
    FOR SELECT TO authenticated_user
    USING (
        user_id = current_setting('app.user_id')::UUID OR
        EXISTS (
            SELECT 1 FROM user_role_assignments ura 
            WHERE ura.user_id = current_setting('app.user_id')::UUID 
            AND ura.role IN ('super_admin', 'security_admin', 'compliance_officer')
            AND ura.is_active = TRUE
        )
    );
`;