/**
 * Security Policy Modules
 * 
 * Rego policies for security controls, access management,
 * and threat prevention
 */

import { PolicyDefinition } from '../types';
import { PolicyType, PolicyEnforcement, ConsentScope } from '../../types/governance';

/**
 * Pre-defined security policies
 */
export const SecurityPolicies = {

  /**
   * Access control policy
   */
  accessControl: {
    name: 'Access Control Policy',
    description: 'Role-based access control with Australian security standards',
    module: 'security.access_control',
    type: PolicyType.SECURITY,
    enforcement: PolicyEnforcement.MANDATORY,
    scopes: [ConsentScope.DATA_ACCESS, ConsentScope.SYSTEM_ACCESS],
    rego: `
package security.access_control

import rego.v1

# Role hierarchy and permissions
role_permissions := {
    "system_admin": [
        "read", "write", "delete", "admin", "audit", "security_config"
    ],
    "financial_manager": [
        "read", "write", "financial_approve", "budget_manage", "audit"
    ],
    "community_coordinator": [
        "read", "write", "community_manage", "benefit_distribute"
    ],
    "data_analyst": [
        "read", "analyse", "report_generate"
    ],
    "viewer": [
        "read"
    ]
}

# Resource sensitivity levels
sensitivity_levels := {
    "public": 0,
    "internal": 1,
    "confidential": 2,
    "restricted": 3,
    "secret": 4
}

# Required clearance levels for roles
role_clearance := {
    "system_admin": 4,
    "financial_manager": 3,
    "community_coordinator": 2,
    "data_analyst": 2,
    "viewer": 1
}

# Allow access if permissions and clearance sufficient
allow if {
    user_authenticated
    permission_granted
    clearance_sufficient
    time_restrictions_met
    location_authorized
}

# User authentication requirements
user_authenticated if {
    input.user.identity_verified == true
    input.user.mfa_completed == true
    not account_locked
    not credentials_expired
}

account_locked if {
    input.user.failed_attempts >= 3
    input.user.lockout_expires > time.now_ns()
}

credentials_expired if {
    input.user.password_age_days > 90
}

credentials_expired if {
    input.user.session_age_hours > 8
}

# Permission check
permission_granted if {
    input.action in role_permissions[input.user.role]
}

# Clearance level check
clearance_sufficient if {
    input.user.clearance_level >= sensitivity_levels[input.resource.sensitivity]
    role_clearance[input.user.role] >= sensitivity_levels[input.resource.sensitivity]
}

# Time-based access restrictions
time_restrictions_met if {
    not time_restricted_role
}

time_restrictions_met if {
    time_restricted_role
    within_business_hours
}

time_restricted_role if {
    input.user.role in ["data_analyst", "viewer"]
    input.resource.sensitivity in ["confidential", "restricted", "secret"]
}

within_business_hours if {
    hour := time.clock([time.now_ns(), "Australia/Sydney"])[0]
    hour >= 9
    hour <= 17
    weekday := time.weekday(time.now_ns())
    weekday >= 1  # Monday
    weekday <= 5  # Friday
}

# Location-based access controls
location_authorized if {
    not location_sensitive_resource
}

location_authorized if {
    location_sensitive_resource
    australian_location
    trusted_network
}

location_sensitive_resource if {
    input.resource.sensitivity in ["restricted", "secret"]
}

australian_location if {
    input.user.location.country == "Australia"
}

trusted_network if {
    input.user.network.type in ["corporate", "vpn", "government"]
    input.user.network.security_verified == true
}

# Special approvals for high-sensitivity operations
high_sensitivity_operation if {
    input.resource.sensitivity == "secret"
    input.action in ["write", "delete", "admin"]
}

approval_required if {
    high_sensitivity_operation
    not emergency_access
}

emergency_access if {
    input.emergency.declared == true
    input.emergency.type in ["security_incident", "system_failure", "data_breach"]
    input.emergency.approver_notified == true
}

# Audit logging requirements
audit_required if {
    input.resource.sensitivity in ["confidential", "restricted", "secret"]
}

audit_required if {
    input.action in ["write", "delete", "admin"]
}

# Conditional access for step-up authentication
conditional if {
    basic_requirements_met
    step_up_required
}

basic_requirements_met if {
    input.user.identity_verified == true
    permission_granted
}

step_up_required if {
    input.resource.sensitivity in ["restricted", "secret"]
    not input.user.enhanced_auth_completed
}

step_up_required if {
    input.action in ["delete", "admin"]
    not input.user.privileged_session_established
}

# Deny conditions
deny if {
    input.user.suspended == true
}

deny if {
    input.user.clearance_expired == true
}

deny if {
    input.resource.sensitivity == "secret"
    input.user.location.country != "Australia"
}

# Break-glass emergency access
break_glass_allowed if {
    input.emergency.break_glass_activated == true
    input.emergency.justification_provided == true
    input.emergency.incident_number_valid == true
    input.emergency.post_review_scheduled == true
}

# Data Loss Prevention (DLP)
dlp_check_required if {
    input.action in ["export", "download", "copy"]
    input.resource.contains_personal_data == true
}

dlp_approved if {
    not dlp_check_required
}

dlp_approved if {
    dlp_check_required
    input.dlp.scan_completed == true
    input.dlp.violations_count == 0
    input.dlp.business_justification_approved == true
}
`,
    documentation: `
# Access Control Policy

Implements role-based access control with Australian government security standards.

## Role Hierarchy
- **system_admin**: Full system access (clearance level 4)
- **financial_manager**: Financial operations (clearance level 3)
- **community_coordinator**: Community management (clearance level 2)
- **data_analyst**: Read and analysis (clearance level 2)
- **viewer**: Read-only access (clearance level 1)

## Sensitivity Levels
- **public**: No restrictions
- **internal**: Internal use only
- **confidential**: Restricted distribution
- **restricted**: High security required
- **secret**: Maximum security, Australian locations only

## Security Controls
- Multi-factor authentication required
- Time-based restrictions for sensitive data
- Location controls for restricted/secret data
- Audit logging for all sensitive operations
- Break-glass emergency access with justification

## Additional Controls
- Session timeouts (8 hours maximum)
- Password expiry (90 days)
- Account lockout after 3 failed attempts
- Data Loss Prevention for personal data
- Privileged session establishment for admin actions
`,
    testCases: [
      {
        id: 'access-test-1',
        name: 'Valid financial manager access',
        description: 'Financial manager accessing confidential budget data',
        input: {
          user: {
            role: 'financial_manager',
            identity_verified: true,
            mfa_completed: true,
            clearance_level: 3,
            failed_attempts: 0,
            password_age_days: 30,
            session_age_hours: 2,
            location: { country: 'Australia' },
            network: { type: 'corporate', security_verified: true }
          },
          action: 'read',
          resource: {
            sensitivity: 'confidential',
            contains_personal_data: false
          }
        },
        expectedOutput: { allowed: true },
        expectedDecision: 'allow'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['ISM', 'Privacy Act 1988'],
      indigenousProtocols: false,
      dataResidency: 'australia'
    }
  } as PolicyDefinition,

  /**
   * Data protection policy
   */
  dataProtection: {
    name: 'Data Protection Policy',
    description: 'Ensures data encryption, privacy, and secure handling',
    module: 'security.data_protection',
    type: PolicyType.SECURITY,
    enforcement: PolicyEnforcement.MANDATORY,
    scopes: [ConsentScope.DATA_ACCESS, ConsentScope.DATA_STORAGE, ConsentScope.PERSONAL_DATA],
    rego: `
package security.data_protection

import rego.v1

# Encryption requirements by data classification
encryption_requirements := {
    "public": {"at_rest": false, "in_transit": true},
    "internal": {"at_rest": true, "in_transit": true},
    "confidential": {"at_rest": true, "in_transit": true, "key_management": "hsm"},
    "restricted": {"at_rest": true, "in_transit": true, "key_management": "hsm", "field_level": true},
    "secret": {"at_rest": true, "in_transit": true, "key_management": "government_hsm", "field_level": true}
}

# Allow data operation if protection requirements met
allow if {
    encryption_adequate
    privacy_requirements_met
    retention_policy_followed
    access_logging_enabled
}

# Encryption adequacy check
encryption_adequate if {
    requirements := encryption_requirements[input.data.classification]
    encryption_at_rest_adequate(requirements)
    encryption_in_transit_adequate(requirements)
    key_management_adequate(requirements)
}

encryption_at_rest_adequate(requirements) if {
    not requirements.at_rest
}

encryption_at_rest_adequate(requirements) if {
    requirements.at_rest == true
    input.security.at_rest_encryption == true
    input.security.encryption_algorithm in ["AES-256", "ChaCha20-Poly1305"]
}

encryption_in_transit_adequate(requirements) if {
    requirements.in_transit == true
    input.security.in_transit_encryption == true
    input.security.tls_version >= 1.3
}

key_management_adequate(requirements) if {
    not requirements.key_management
}

key_management_adequate(requirements) if {
    requirements.key_management == "hsm"
    input.security.key_storage == "hardware_security_module"
}

key_management_adequate(requirements) if {
    requirements.key_management == "government_hsm"
    input.security.key_storage == "government_approved_hsm"
    input.security.key_escrow == true
}

# Privacy requirements
privacy_requirements_met if {
    not personal_data_involved
}

privacy_requirements_met if {
    personal_data_involved
    consent_obtained
    purpose_limitation_observed
    data_minimisation_applied
}

personal_data_involved if {
    input.data.contains_personal_information == true
}

consent_obtained if {
    input.privacy.consent_provided == true
    input.privacy.consent_specific == true
    input.privacy.consent_current == true
}

purpose_limitation_observed if {
    input.data.use_purpose in input.privacy.consented_purposes
}

data_minimisation_applied if {
    input.data.fields_requested <= input.privacy.authorised_fields_count
}

# Data retention policy
retention_policy_followed if {
    input.retention.policy_defined == true
    input.retention.retention_period_specified == true
    input.retention.disposal_method_secure == true
}

# Access logging requirements
access_logging_enabled if {
    input.audit.logging_enabled == true
    input.audit.log_retention_years >= 7
    input.audit.log_integrity_protected == true
}

# Personal data special handling
personal_data_pseudonymised if {
    not input.data.contains_personal_information
}

personal_data_pseudonymised if {
    input.data.contains_personal_information == true
    input.privacy.pseudonymisation_applied == true
    input.privacy.re_identification_keys_separated == true
}

# Cross-border data transfer restrictions
cross_border_transfer_allowed if {
    input.data.destination_country == "Australia"
}

cross_border_transfer_allowed if {
    input.data.destination_country in ["New Zealand"]
    privacy_requirements_met
}

cross_border_transfer_allowed if {
    input.data.destination_country not in ["Australia", "New Zealand"]
    input.privacy.adequacy_decision_exists == true
    input.privacy.additional_safeguards_implemented == true
}

# Conditional for data protection improvements
conditional if {
    basic_protection_present
    enhanced_protection_needed
    improvement_timeline_reasonable
}

basic_protection_present if {
    input.security.at_rest_encryption == true
    input.security.in_transit_encryption == true
}

enhanced_protection_needed if {
    input.data.classification in ["restricted", "secret"]
    not input.security.field_level_encryption
}

improvement_timeline_reasonable if {
    input.improvement.timeline_days <= 30
    input.improvement.plan_approved == true
}

# Deny conditions
deny if {
    input.data.classification == "secret"
    input.data.destination_country != "Australia"
}

deny if {
    input.data.contains_personal_information == true
    input.privacy.consent_provided == false
    not emergency_processing
}

emergency_processing if {
    input.emergency.declared == true
    input.emergency.type in ["life_threatening", "national_security"]
    input.emergency.legal_basis_documented == true
}

# Data breach response
breach_response_adequate if {
    not data_breach_occurred
}

breach_response_adequate if {
    data_breach_occurred
    input.breach.detected_within_hours <= 24
    input.breach.containment_measures_implemented == true
    input.breach.notification_authorities_completed == true
    input.breach.affected_individuals_notified == true
}

data_breach_occurred if {
    input.incident.type == "data_breach"
    input.incident.personal_data_affected == true
}

# Secure disposal requirements
secure_disposal_required if {
    input.operation.type == "data_disposal"
    input.data.classification in ["confidential", "restricted", "secret"]
}

secure_disposal_adequate if {
    not secure_disposal_required
}

secure_disposal_adequate if {
    secure_disposal_required
    input.disposal.method in ["cryptographic_erasure", "physical_destruction", "degaussing"]
    input.disposal.certificate_provided == true
    input.disposal.witness_verification == true
}
`,
    documentation: `
# Data Protection Policy

Comprehensive data protection covering encryption, privacy, and secure handling.

## Encryption Requirements by Classification
- **Public**: In-transit encryption only
- **Internal**: At-rest and in-transit encryption
- **Confidential**: HSM key management required
- **Restricted**: Field-level encryption required
- **Secret**: Government-approved HSM, key escrow

## Privacy Controls
- Consent required for personal data processing
- Purpose limitation enforcement
- Data minimisation principles
- Pseudonymisation for personal data analytics

## Cross-border Transfer Rules
- Australia: Always allowed
- New Zealand: With privacy requirements
- Other countries: Adequacy decision + safeguards required
- Secret data: Australia only

## Retention and Disposal
- Secure disposal methods for classified data
- 7-year audit log retention minimum
- Cryptographic erasure or physical destruction
- Witnessed disposal with certificates

## Breach Response
- 24-hour detection requirement
- Immediate containment measures
- Authority and individual notification
- Legal basis documentation for emergency processing
`,
    testCases: [
      {
        id: 'protection-test-1',
        name: 'Valid confidential data operation',
        description: 'Proper handling of confidential data with HSM',
        input: {
          data: {
            classification: 'confidential',
            contains_personal_information: false,
            destination_country: 'Australia'
          },
          security: {
            at_rest_encryption: true,
            in_transit_encryption: true,
            encryption_algorithm: 'AES-256',
            tls_version: 1.3,
            key_storage: 'hardware_security_module'
          },
          retention: {
            policy_defined: true,
            retention_period_specified: true,
            disposal_method_secure: true
          },
          audit: {
            logging_enabled: true,
            log_retention_years: 7,
            log_integrity_protected: true
          }
        },
        expectedOutput: { allowed: true },
        expectedDecision: 'allow'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['Privacy Act 1988', 'ISM', 'OAIC'],
      indigenousProtocols: false,
      dataResidency: 'australia'
    }
  } as PolicyDefinition

};