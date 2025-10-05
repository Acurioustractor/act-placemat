# ACT Placemat RBAC System Documentation

## Overview

The ACT Placemat Role-Based Access Control (RBAC) system is designed for Australian community organisations with specific support for Indigenous sovereignty recognition and multi-stakeholder governance models.

## Key Features

- **24 User Roles** covering system admin, governance, community, operational, stakeholder, technical, and service categories
- **60+ Granular Permissions** across all platform functions
- **Indigenous Sovereignty Recognition** with cultural protocol requirements
- **Australian Compliance** including Privacy Act 1988, ACNC standards, and AUSTRAC requirements
- **Multi-level Permission Scopes** from global to personal access
- **Comprehensive Audit Trail** for all permission checks and role assignments

## Architecture

### Core Components

1. **roles.ts** - Core role and permission definitions with TypeScript enums and schemas
2. **permissions-matrix.ts** - Complete mapping of roles to permissions with sovereignty levels
3. **rbac-schema.ts** - Database schema and PostgreSQL DDL for implementation
4. **README.md** - This documentation file

### Role Categories

#### System Administration (3 roles)
- **Super Admin** - Platform-wide administration with unrestricted access
- **System Admin** - Technical system management and configuration
- **Security Admin** - Security configuration and audit management

#### Governance (4 roles)
- **Board Member** - Board governance and strategic oversight
- **Executive Director** - Strategic leadership and high-level approvals
- **Program Director** - Program management and coordination
- **Finance Manager** - Financial oversight and budget management

#### Community Governance (4 roles)
- **Community Elder** - Indigenous community leadership with cultural authority
- **Traditional Owner** - Traditional land/cultural ownership recognition
- **Sovereignty Guardian** - Indigenous data sovereignty management
- **Community Representative** - Community advocacy and representation

#### Operational (4 roles)
- **Project Manager** - Project coordination and team management
- **Case Worker** - Direct service delivery to community members
- **Volunteer Coordinator** - Volunteer management and coordination
- **Partnership Liaison** - External partnerships and stakeholder relations

#### Community Members (3 roles)
- **Community Member** - General community participation and contribution
- **Volunteer** - Volunteer contributor with limited operational access
- **Beneficiary** - Service recipient with read-only access

#### External Stakeholders (3 roles)
- **Funding Partner** - Grant providers and funding organisations
- **Government Liaison** - Government representatives and officials
- **Researcher** - Academic and policy researchers

#### Technical (3 roles)
- **Agent Operator** - AI agent management and configuration
- **Data Steward** - Data governance, quality, and management
- **Compliance Officer** - Regulatory compliance and audit coordination

### Permission System

#### Permission Categories

1. **System Administration** - Platform configuration and management
2. **User Management** - User creation, modification, and administration
3. **Financial Operations** - Budget, transaction, and financial management
4. **Project Management** - Project creation, coordination, and oversight
5. **Community Data** - Stories, member data, and community content
6. **Opportunities** - Grant and opportunity management
7. **Indigenous Sovereignty** - Cultural protocols and data sovereignty
8. **Agent Management** - AI agent configuration and control
9. **Data Governance** - Data export, import, backup, and audit
10. **Security & Audit** - Security configuration and audit trails
11. **API & Integration** - API access and external integrations
12. **Reporting & Analytics** - Report generation and analytics access

#### Permission Scopes

- **Global** - Platform-wide access across all organisations and communities
- **Organisation** - Access within specific organisational boundaries
- **Community** - Access within specific community boundaries
- **Project** - Access limited to specific projects
- **Personal** - Access to personal data only
- **Delegated** - Access delegated from another user

### Indigenous Sovereignty Framework

#### Sovereignty Levels

1. **Traditional Owner** - Recognised traditional land/cultural ownership
2. **Cultural Authority** - Cultural knowledge and protocol authority
3. **Community Delegate** - Community-appointed representative
4. **Cultural Protocol** - Required to follow cultural protocols
5. **General Respect** - General cultural respect requirements

#### Cultural Protocol Requirements

- **CARE Principles** - Collective Benefit, Authority to Control, Responsibility, Ethics
- **FAIR Principles** - Findable, Accessible, Interoperable, Reusable
- **Community Consent** - Explicit community consent for data operations
- **Traditional Knowledge Protection** - Safeguarding of traditional knowledge
- **Benefit Sharing** - Ensuring community benefits from data use

### Australian Compliance Features

#### Privacy Act 1988 Compliance
- Data residency requirements
- Consent management and tracking
- Individual access rights
- Data breach notification protocols

#### ACNC Governance Standards
- Financial oversight and reporting
- Conflict of interest management
- Responsible governance practices
- Stakeholder engagement requirements

#### AUSTRAC Compliance
- Large transaction reporting (≥$10,000 AUD)
- Suspicious transaction monitoring
- Customer due diligence
- Record keeping requirements

## Implementation Guide

### Database Setup

1. **Create Database Schema**
   ```sql
   -- Run the DDL from rbac-schema.ts
   psql -d your_database -f create_rbac_tables.sql
   ```

2. **Populate Initial Roles**
   ```sql
   INSERT INTO roles (role, category, display_name, description, hierarchy_level, ...)
   -- Insert all 24 roles with their configurations
   ```

3. **Set Up Role Permissions**
   ```sql
   INSERT INTO role_permissions (role, permission, default_scope, ...)
   -- Insert permission mappings from permissions-matrix.ts
   ```

### Application Integration

1. **Install Package**
   ```bash
   npm install @act-placemat/security
   ```

2. **Initialize RBAC Service**
   ```typescript
   import { RBACService } from '@act-placemat/security';
   
   const rbacService = new RBACService({
     database: databaseConfig,
     compliance: {
       enforceDataResidency: true,
       requireIndigenousProtocols: true,
       auditAllTransactions: true,
       consentExpiryWarningDays: 30
     }
   });
   ```

3. **Check Permissions**
   ```typescript
   const hasPermission = await rbacService.checkPermission({
     userId: 'user-uuid',
     permission: Permission.FINANCE_BUDGET_CREATE,
     scope: PermissionScope.ORGANISATION,
     scopeId: 'org-uuid',
     context: {
       resourceType: 'budget',
       action: 'create',
       metadata: { amount: 25000 }
     }
   });
   ```

### Role Assignment

1. **Assign Role to User**
   ```typescript
   await rbacService.assignRole({
     userId: 'user-uuid',
     role: UserRole.PROJECT_MANAGER,
     scope: PermissionScope.PROJECT,
     scopeId: 'project-uuid',
     assignedBy: 'admin-uuid',
     assignmentReason: 'Project leadership appointment'
   });
   ```

2. **Handle Indigenous Sovereignty Context**
   ```typescript
   await rbacService.assignRole({
     userId: 'user-uuid',
     role: UserRole.COMMUNITY_ELDER,
     scope: PermissionScope.COMMUNITY,
     scopeId: 'community-uuid',
     sovereigntyContext: {
       traditionalOwnershipRecognised: true,
       culturalProtocolsRequired: ['CARE_principles'],
       communityConsentGiven: true,
       communityRepresentativeId: 'rep-uuid'
     }
   });
   ```

### Financial Approval Workflows

The system includes built-in financial approval thresholds:

| Role | Approval Limit (AUD) |
|------|---------------------|
| Super Admin | Unlimited |
| Board Member | $100,000 |
| Executive Director | $50,000 |
| Finance Manager | $25,000 |
| Community Elder | $10,000 |
| Traditional Owner | $10,000 |
| Program Director | $10,000 |
| Project Manager | $5,000 |
| Case Worker | $1,000 |

### Security Features

#### Session Management
- Maximum 3 concurrent sessions per user by default
- 60-minute session timeout for most roles
- MFA requirements for administrative roles
- IP and time-based access restrictions

#### Audit Logging
- All permission checks logged with full context
- Indigenous sovereignty requirements tracked
- Performance metrics and cache hit rates
- 7-year audit log retention for Australian compliance

#### Data Protection
- Encryption at rest and in transit required
- Row-level security policies for sensitive data
- Data residency enforcement for Australian compliance
- Automatic consent expiry warnings

## Role Hierarchy

The system implements a hierarchical role structure where higher-level roles can delegate certain permissions to lower-level roles:

```
Super Admin (100)
├── System Admin (90)
├── Security Admin (85)
├── Board Member (80)
├── Executive Director (75)
├── Community Elder (75) *
├── Traditional Owner (75) *
├── Finance Manager (70)
├── Sovereignty Guardian (70) *
├── Program Director (65)
├── Community Representative (65) *
├── Compliance Officer (65)
├── Project Manager (60)
├── Agent Operator (60)
├── Case Worker (55)
├── Data Steward (55)
├── Volunteer Coordinator (50)
├── Partnership Liaison (50)
├── Funding Partner (40)
├── Government Liaison (35)
├── Community Member (30)
├── Researcher (30)
├── Volunteer (25)
├── Beneficiary (20)
├── System Agent (15)
├── External Service (10)
└── API Client (5)
```

*Indigenous sovereignty roles with cultural authority that operates parallel to organisational hierarchy*

## Best Practices

### Role Assignment
1. **Principle of Least Privilege** - Assign the minimum role required for job function
2. **Regular Review** - Review role assignments quarterly
3. **Temporal Constraints** - Use expiry dates for temporary assignments
4. **Cultural Sensitivity** - Ensure Indigenous sovereignty roles respect cultural protocols

### Permission Management
1. **Context-Aware Checks** - Always include resource context in permission checks
2. **Audit Everything** - Log all permission checks for compliance
3. **Cache Wisely** - Cache permission results but invalidate on role changes
4. **Fail Secure** - Default to deny when permission unclear

### Compliance Considerations
1. **Data Residency** - Ensure all data remains within Australian jurisdiction
2. **Consent Management** - Track and respect consent for all data operations
3. **Financial Reporting** - Automatically report large transactions per AUSTRAC requirements
4. **Indigenous Protocols** - Always follow CARE principles for Indigenous data

## Troubleshooting

### Common Issues

#### Permission Denied Errors
1. Check user's active role assignments
2. Verify permission is assigned to user's roles
3. Confirm scope and context match requirements
4. Check temporal constraints (time, date restrictions)

#### Role Assignment Failures
1. Verify assigner has appropriate delegation permissions
2. Check for conflicting role constraints
3. Ensure Indigenous sovereignty requirements met
4. Verify Australian compliance requirements satisfied

#### Performance Issues
1. Monitor permission check audit logs for slow queries
2. Optimize database indexes for role and permission lookups
3. Implement appropriate caching strategies
4. Consider permission result caching for frequently checked permissions

### Monitoring and Alerts

Set up monitoring for:
- Failed permission checks exceeding threshold
- Unauthorized elevation attempts
- Indigenous data access without proper protocols
- Financial transactions exceeding approval limits
- Audit log retention approaching limits

## Future Enhancements

### Planned Features
1. **Dynamic Role Creation** - Allow organisations to create custom roles
2. **Advanced Delegation** - More granular delegation workflows
3. **Risk-Based Authentication** - Adaptive security based on risk scoring
4. **Integration Connectors** - Pre-built connectors for common Australian systems
5. **Mobile SDKs** - Native mobile support for role and permission checking

### Compliance Roadmap
1. **ISO 27001 Certification** - Align with international security standards
2. **SOC 2 Type II** - Service organisation control certification
3. **IRAP Assessment** - Information Security Registered Assessors Program
4. **Additional Regulatory Frameworks** - Support for state-specific requirements

## Support and Contributing

For technical support, implementation guidance, or to contribute to the RBAC system:

- **Documentation**: [ACT Placemat Docs](https://docs.act-placemat.org)
- **Issues**: [GitHub Issues](https://github.com/act-placemat/security/issues)
- **Community**: [Community Forums](https://community.act-placemat.org)
- **Security**: security@act-placemat.org

---

*This RBAC system is designed with deep respect for Indigenous sovereignty and Australian cultural contexts. All implementations should be undertaken with appropriate cultural consultation and community engagement.*