/**
 * Compliance Policy Modules
 * 
 * Rego policies for Australian regulatory compliance including
 * Privacy Act 1988, ACNC requirements, and data sovereignty
 */

import { PolicyDefinition } from '../types';
import { PolicyType, PolicyEnforcement, ConsentScope } from '../../types/governance';

/**
 * Pre-defined compliance policies
 */
export const CompliancePolicies = {

  /**
   * Privacy Act 1988 compliance policy
   */
  privacyAct: {
    name: 'Privacy Act 1988 Compliance',
    description: 'Ensures compliance with Australian Privacy Principles (APPs)',
    module: 'compliance.privacy_act',
    type: PolicyType.COMPLIANCE,
    enforcement: PolicyEnforcement.MANDATORY,
    scopes: [ConsentScope.DATA_ACCESS, ConsentScope.PERSONAL_DATA],
    rego: `
package compliance.privacy_act

import rego.v1

# Australian Privacy Principles (APPs)
privacy_principles := {
    "APP1": "Open and transparent management of personal information",
    "APP2": "Anonymity and pseudonymity",
    "APP3": "Collection of solicited personal information",
    "APP4": "Dealing with unsolicited personal information",
    "APP5": "Notification of the collection of personal information",
    "APP6": "Use or disclosure of personal information",
    "APP7": "Direct marketing",
    "APP8": "Cross-border disclosure of personal information",
    "APP9": "Adoption, use or disclosure of government related identifiers",
    "APP10": "Quality of personal information",
    "APP11": "Security of personal information",
    "APP12": "Access to personal information",
    "APP13": "Correction of personal information"
}

# Allow data access with proper consent
allow if {
    valid_consent
    purpose_limitation_satisfied
    data_minimisation_satisfied
    security_measures_adequate
}

# Valid consent requirements (APP 3, 6)
valid_consent if {
    input.consent.provided == true
    input.consent.specific == true
    input.consent.informed == true
    input.consent.current == true
}

# Purpose limitation (APP 6)
purpose_limitation_satisfied if {
    input.purpose in input.consent.purposes
    not secondary_use_without_consent
}

# Data minimisation (APP 3)
data_minimisation_satisfied if {
    every field in input.requested_fields {
        field in input.consent.authorized_fields
    }
}

# Security measures (APP 11)
security_measures_adequate if {
    input.security.encryption == true
    input.security.access_controls == true
    input.security.audit_logging == true
}

# Cross-border disclosure restrictions (APP 8)
deny if {
    input.destination.country != "Australia"
    not adequate_protection_country
    not individual_consent_for_transfer
}

adequate_protection_country if {
    input.destination.country in ["New Zealand", "European Union"]
}

individual_consent_for_transfer if {
    input.consent.cross_border_transfer == true
    input.destination.country in input.consent.approved_countries
}

# Secondary use without consent (APP 6)
secondary_use_without_consent if {
    input.purpose != input.original_purpose
    not input.consent.purposes[_] == input.purpose
    not permitted_secondary_use
}

permitted_secondary_use if {
    input.purpose == "law_enforcement"
    input.authority == "federal_police"
}

permitted_secondary_use if {
    input.purpose == "health_emergency"
    input.authority == "health_department"
}

# Data breach notification requirements
breach_notification_required if {
    input.incident.type == "data_breach"
    input.incident.severity in ["high", "critical"]
    input.incident.personal_data_involved == true
}

# Access rights (APP 12)
access_request_valid if {
    input.request.type == "access"
    input.request.individual_verified == true
    not access_exemption_applies
}

access_exemption_applies if {
    input.request.law_enforcement_exemption == true
}

access_exemption_applies if {
    input.request.legal_privilege_exemption == true
}
`,
    documentation: `
# Privacy Act 1988 Compliance Policy

Implements the 13 Australian Privacy Principles (APPs) for personal information handling.

## Key Requirements
- **Consent**: Must be specific, informed, and current
- **Purpose Limitation**: Data used only for consented purposes  
- **Data Minimisation**: Only collect necessary information
- **Security**: Encryption, access controls, and audit logging required
- **Cross-border**: Restrictions on overseas data transfers

## Special Cases
- Law enforcement exemptions available
- Health emergency provisions
- Individual access rights (APP 12)
- Data breach notification for high/critical incidents

## Cross-border Transfers
- Automatically allowed: New Zealand, European Union
- Other countries: Require explicit consent
- Data must remain in approved jurisdictions
`,
    testCases: [
      {
        id: 'privacy-test-1',
        name: 'Valid data access',
        description: 'Proper consent and security measures',
        input: {
          consent: {
            provided: true,
            specific: true,
            informed: true,
            current: true,
            purposes: ['financial_analysis'],
            authorized_fields: ['name', 'amount', 'date']
          },
          purpose: 'financial_analysis',
          requested_fields: ['name', 'amount'],
          security: {
            encryption: true,
            access_controls: true,
            audit_logging: true
          },
          destination: { country: 'Australia' }
        },
        expectedOutput: { allowed: true },
        expectedDecision: 'allow'
      },
      {
        id: 'privacy-test-2',
        name: 'Deny cross-border without consent',
        description: 'Attempt to transfer data overseas without consent',
        input: {
          consent: {
            provided: true,
            specific: true,
            informed: true,
            current: true,
            cross_border_transfer: false
          },
          destination: { country: 'United States' }
        },
        expectedOutput: { denied: true },
        expectedDecision: 'deny'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['Privacy Act 1988', 'OAIC'],
      indigenousProtocols: false,
      dataResidency: 'australia'
    }
  } as PolicyDefinition,

  /**
   * ACNC governance standards
   */
  acncGovernance: {
    name: 'ACNC Governance Standards',
    description: 'Australian Charities and Not-for-profits Commission governance requirements',
    module: 'compliance.acnc_governance',
    type: PolicyType.COMPLIANCE,
    enforcement: PolicyEnforcement.MANDATORY,
    scopes: [ConsentScope.GOVERNANCE, ConsentScope.REPORTING],
    rego: `
package compliance.acnc_governance

import rego.v1

# ACNC Governance Standards
governance_standards := {
    1: "Purposes and not-for-profit nature",
    2: "Accountability to members",
    3: "Compliance with Australian laws",
    4: "Suitability of responsible persons",
    5: "Duties of responsible persons"
}

# Allow governance decision if standards met
allow if {
    purposes_compliant
    accountability_maintained
    legal_compliance_verified
    responsible_persons_suitable
    duties_fulfilled
}

# Standard 1: Purposes and not-for-profit nature
purposes_compliant if {
    input.organisation.purposes[_] in charitable_purposes
    input.organisation.profit_distribution == false
    input.organisation.purposes_pursued == true
}

charitable_purposes := [
    "advancing_health",
    "advancing_education", 
    "advancing_social_community_welfare",
    "advancing_religion",
    "advancing_culture",
    "advancing_natural_environment",
    "advancing_human_rights",
    "advancing_security_safety",
    "preventing_relieving_suffering",
    "advancing_reconciliation",
    "promoting_equality"
]

# Standard 2: Accountability to members
accountability_maintained if {
    input.governance.member_meetings_held == true
    input.governance.financial_reports_provided == true
    input.governance.decision_processes_transparent == true
}

# Standard 3: Compliance with Australian laws
legal_compliance_verified if {
    input.compliance.tax_obligations_met == true
    input.compliance.workplace_laws_followed == true
    input.compliance.consumer_laws_followed == true
    input.compliance.privacy_laws_followed == true
}

# Standard 4: Suitability of responsible persons
responsible_persons_suitable if {
    every person in input.responsible_persons {
        not disqualified_person(person)
        person.fit_and_proper == true
    }
}

disqualified_person(person) if {
    person.bankruptcy_status == "undischarged_bankrupt"
}

disqualified_person(person) if {
    person.criminal_convictions == true
    person.conviction_type in ["fraud", "dishonesty", "charity_related"]
}

# Standard 5: Duties of responsible persons
duties_fulfilled if {
    input.governance.duty_of_care == true
    input.governance.duty_of_loyalty == true
    input.governance.duty_of_obedience == true
    conflicts_of_interest_managed
}

conflicts_of_interest_managed if {
    input.governance.conflict_policy_exists == true
    input.governance.conflicts_disclosed == true
    input.governance.conflicts_appropriately_managed == true
}

# Financial reporting thresholds
large_charity if {
    input.organisation.annual_revenue >= 1000000
}

medium_charity if {
    input.organisation.annual_revenue >= 250000
    input.organisation.annual_revenue < 1000000
}

# Reporting requirements based on size
annual_information_statement_required if {
    input.organisation.annual_revenue >= 1000
}

audited_financial_statements_required if {
    large_charity
}

reviewed_financial_statements_required if {
    medium_charity
}

# Indigenous cultural protocols
indigenous_protocols_required if {
    input.activities.indigenous_communities == true
}

indigenous_protocols_compliant if {
    input.indigenous.consultation_completed == true
    input.indigenous.protocols_established == true
    input.indigenous.community_consent == true
}

# Conditional approval for governance improvements
conditional if {
    not purposes_compliant
    improvement_plan_exists
}

conditional if {
    not responsible_persons_suitable
    person_replacement_planned
}

improvement_plan_exists if {
    input.governance.improvement_plan.exists == true
    input.governance.improvement_plan.timeline <= 90
}

person_replacement_planned if {
    input.governance.person_replacement.planned == true
    input.governance.person_replacement.timeline <= 30
}
`,
    documentation: `
# ACNC Governance Standards Policy

Implements the five ACNC Governance Standards for registered charities.

## The Five Standards
1. **Purposes and not-for-profit nature**: Must pursue charitable purposes
2. **Accountability to members**: Transparent decision-making and reporting
3. **Compliance with Australian laws**: Meet all legal obligations
4. **Suitability of responsible persons**: Fit and proper test
5. **Duties of responsible persons**: Care, loyalty, and obedience

## Financial Reporting Thresholds
- **Large charity** (≥$1M): Audited financial statements required
- **Medium charity** ($250K-$1M): Reviewed financial statements required  
- **Small charity** (≥$1K): Annual Information Statement required

## Special Considerations
- Indigenous community activities require specific protocols
- Conflict of interest management mandatory
- Responsible person disqualifications enforced
`,
    testCases: [
      {
        id: 'acnc-test-1',
        name: 'Compliant large charity',
        description: 'Large charity meeting all governance standards',
        input: {
          organisation: {
            purposes: ['advancing_education', 'advancing_social_community_welfare'],
            profit_distribution: false,
            purposes_pursued: true,
            annual_revenue: 2000000
          },
          governance: {
            member_meetings_held: true,
            financial_reports_provided: true,
            decision_processes_transparent: true,
            duty_of_care: true,
            duty_of_loyalty: true,
            duty_of_obedience: true,
            conflict_policy_exists: true,
            conflicts_disclosed: true,
            conflicts_appropriately_managed: true
          },
          compliance: {
            tax_obligations_met: true,
            workplace_laws_followed: true,
            consumer_laws_followed: true,
            privacy_laws_followed: true
          },
          responsible_persons: [
            {
              fit_and_proper: true,
              bankruptcy_status: 'not_bankrupt',
              criminal_convictions: false
            }
          ]
        },
        expectedOutput: { allowed: true },
        expectedDecision: 'allow'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['ACNC', 'ATO'],
      indigenousProtocols: true,
      dataResidency: 'australia'
    }
  } as PolicyDefinition,

  /**
   * Data residency and sovereignty policy
   */
  dataSovereignty: {
    name: 'Data Residency and Sovereignty',
    description: 'Ensures data remains within Australian jurisdiction and respects Indigenous data sovereignty',
    module: 'compliance.data_sovereignty',
    type: PolicyType.COMPLIANCE,
    enforcement: PolicyEnforcement.MANDATORY,
    scopes: [ConsentScope.DATA_ACCESS, ConsentScope.DATA_STORAGE],
    rego: `
package compliance.data_sovereignty

import rego.v1

# Australian data centres and cloud regions
australian_regions := [
    "ap-southeast-2",  # Sydney
    "ap-southeast-4",  # Melbourne
    "australia-southeast1",  # Google Sydney
    "australia-east",  # Azure Sydney
    "australia-central"  # Azure Canberra
]

# Allow data operations within Australian jurisdiction
allow if {
    data_in_australia
    sovereignty_respected
    security_requirements_met
}

# Data must remain in Australia
data_in_australia if {
    input.data_location.country == "Australia"
    input.data_location.region in australian_regions
}

data_in_australia if {
    input.data_location.provider == "australian_government"
}

# Sovereignty requirements
sovereignty_respected if {
    not indigenous_data_without_protocols
    community_consent_obtained
    data_ownership_recognised
}

# Indigenous data sovereignty (CARE Principles)
indigenous_data_without_protocols if {
    input.data.indigenous_related == true
    not input.protocols.care_principles_followed
}

care_principles_followed if {
    input.protocols.collective_benefit == true
    input.protocols.authority_to_control == true
    input.protocols.responsibility == true
    input.protocols.ethics == true
}

# Community consent
community_consent_obtained if {
    not input.data.affects_community
}

community_consent_obtained if {
    input.data.affects_community == true
    input.consent.community_representatives_consulted == true
    input.consent.community_approval == true
}

# Data ownership recognition
data_ownership_recognised if {
    input.data.ownership_acknowledged == true
    input.data.attribution_provided == true
}

# Security requirements for sensitive data
security_requirements_met if {
    input.security.encryption_at_rest == true
    input.security.encryption_in_transit == true
    input.security.access_controls == true
    audit_requirements_met
}

audit_requirements_met if {
    input.audit.logging_enabled == true
    input.audit.retention_period >= 7  # years
    input.audit.australian_standards_compliance == true
}

# Government data classification
government_data_protected if {
    input.data.classification in ["PROTECTED", "SECRET", "TOP-SECRET"]
    input.security.government_approved_facility == true
}

# Deny operations violating sovereignty
deny if {
    input.data_location.country != "Australia"
    not emergency_exemption
}

deny if {
    input.data.indigenous_related == true
    not input.protocols.traditional_owner_consent == true
}

# Emergency exemptions (limited scope)
emergency_exemption if {
    input.emergency.declared == true
    input.emergency.type in ["natural_disaster", "health_emergency", "national_security"]
    input.emergency.temporary == true
    input.emergency.duration_days <= 30
}

# Conditional for data repatriation
conditional if {
    input.data_location.country != "Australia"
    repatriation_plan_exists
}

repatriation_plan_exists if {
    input.repatriation.plan_exists == true
    input.repatriation.timeline_days <= 90
    input.repatriation.australian_destination_confirmed == true
}
`,
    documentation: `
# Data Residency and Sovereignty Policy

Ensures data remains within Australian jurisdiction and respects Indigenous data sovereignty principles.

## Key Requirements
- **Data Location**: Must be in Australian regions/data centres
- **Indigenous Data**: CARE principles (Collective benefit, Authority to control, Responsibility, Ethics)
- **Community Data**: Requires community consultation and approval
- **Government Data**: PROTECTED classification requires approved facilities

## Australian Cloud Regions
- AWS: ap-southeast-2 (Sydney), ap-southeast-4 (Melbourne)
- Google: australia-southeast1 (Sydney)
- Azure: australia-east (Sydney), australia-central (Canberra)

## CARE Principles for Indigenous Data
- **Collective Benefit**: Data ecosystems shall be designed for collective benefit
- **Authority to Control**: Indigenous peoples' rights to control data about them
- **Responsibility**: Those working with Indigenous data have responsibility to share benefits
- **Ethics**: Indigenous peoples' rights and wellbeing should be primary concern

## Emergency Exemptions
- Limited to 30 days
- Natural disasters, health emergencies, national security
- Requires repatriation plan within 90 days
`,
    testCases: [
      {
        id: 'sovereignty-test-1',
        name: 'Valid Australian data operation',
        description: 'Data operation within Australian jurisdiction',
        input: {
          data_location: {
            country: 'Australia',
            region: 'ap-southeast-2',
            provider: 'aws'
          },
          data: {
            indigenous_related: false,
            affects_community: false,
            ownership_acknowledged: true,
            attribution_provided: true
          },
          security: {
            encryption_at_rest: true,
            encryption_in_transit: true,
            access_controls: true
          },
          audit: {
            logging_enabled: true,
            retention_period: 7,
            australian_standards_compliance: true
          }
        },
        expectedOutput: { allowed: true },
        expectedDecision: 'allow'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['Privacy Act 1988', 'ISM', 'OAIC'],
      indigenousProtocols: true,
      dataResidency: 'australia'
    }
  } as PolicyDefinition

};