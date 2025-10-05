/**
 * Community Policy Modules
 * 
 * Rego policies for community governance, benefit distribution,
 * and Indigenous cultural protocols
 */

import { PolicyDefinition } from '../types';
import { PolicyType, PolicyEnforcement, ConsentScope } from '../../types/governance';

/**
 * Pre-defined community policies
 */
export const CommunityPolicies = {

  /**
   * Community benefit distribution policy
   */
  benefitDistribution: {
    name: 'Community Benefit Distribution',
    description: 'Ensures equitable distribution of financial benefits to community stakeholders',
    module: 'community.benefit_distribution',
    type: PolicyType.COMMUNITY,
    enforcement: PolicyEnforcement.MANDATORY,
    scopes: [ConsentScope.BENEFIT_SHARING, ConsentScope.COMMUNITY_GOVERNANCE],
    rego: `
package community.benefit_distribution

import rego.v1

# Minimum benefit allocation percentages
min_allocations := {
    "community_development": 40,
    "capacity_building": 20,
    "cultural_programs": 15,
    "infrastructure": 15,
    "administration": 10
}

# Allow distribution if minimum allocations met
allow if {
    all_minimums_met
    total_allocation_valid
    stakeholder_consent_obtained
}

# Check all minimum allocations are met
all_minimums_met if {
    every category, min_percent in min_allocations {
        category_allocation := sum([item.amount | 
            item := input.allocations[_]
            item.category == category
        ])
        total_amount := sum([item.amount | item := input.allocations[_]])
        percentage := (category_allocation / total_amount) * 100
        percentage >= min_percent
    }
}

# Total allocation must equal 100%
total_allocation_valid if {
    total_percentage := sum([item.percentage | item := input.allocations[_]])
    total_percentage == 100
}

# Stakeholder consent requirements
stakeholder_consent_obtained if {
    input.consent.community_meeting_held == true
    input.consent.quorum_achieved == true
    input.consent.approval_percentage >= 75
}

# Indigenous community specific requirements
indigenous_protocols_followed if {
    not input.community.indigenous_involved
}

indigenous_protocols_followed if {
    input.community.indigenous_involved == true
    input.protocols.traditional_owners_consulted == true
    input.protocols.cultural_impact_assessed == true
    input.protocols.free_prior_informed_consent == true
}

# Conditional approval for near-compliance
conditional if {
    near_compliance
    improvement_commitment_exists
}

near_compliance if {
    total_percentage := sum([item.percentage | item := input.allocations[_]])
    total_percentage >= 95
    total_percentage < 100
}

near_compliance if {
    community_dev_allocation := sum([item.percentage | 
        item := input.allocations[_]
        item.category == "community_development"
    ])
    community_dev_allocation >= 35  # Slightly below 40% minimum
    community_dev_allocation < 40
}

improvement_commitment_exists if {
    input.commitment.reallocation_planned == true
    input.commitment.timeline_days <= 30
}

# Deny if critical minimums not met
deny if {
    community_dev_allocation := sum([item.percentage | 
        item := input.allocations[_]
        item.category == "community_development"
    ])
    community_dev_allocation < 30  # Well below minimum
}

deny if {
    input.consent.approval_percentage < 60  # Insufficient community support
}

# Special provisions for emergency situations
emergency_allocation_allowed if {
    input.emergency.declared == true
    input.emergency.type in ["natural_disaster", "health_crisis", "economic_hardship"]
    input.emergency.temporary_reallocation == true
    input.emergency.duration_months <= 6
}

# Transparency requirements
transparency_requirements_met if {
    input.transparency.public_reporting == true
    input.transparency.financial_statements_available == true
    input.transparency.allocation_rationale_documented == true
}

# Regular review requirements
review_requirements_met if {
    input.review.annual_review_scheduled == true
    input.review.stakeholder_feedback_mechanism == true
    input.review.independent_assessment == true
}
`,
    documentation: `
# Community Benefit Distribution Policy

Ensures equitable distribution of financial benefits with community oversight and Indigenous protocols.

## Minimum Allocation Requirements
- **Community Development**: 40% minimum
- **Capacity Building**: 20% minimum  
- **Cultural Programs**: 15% minimum
- **Infrastructure**: 15% minimum
- **Administration**: 10% maximum

## Governance Requirements
- Community meeting with quorum
- 75% approval threshold for benefit distribution
- Annual reviews with stakeholder feedback
- Public reporting and financial transparency

## Indigenous Protocols
- Traditional owners consultation required
- Cultural impact assessment
- Free, Prior, and Informed Consent (FPIC)
- CARE principles compliance

## Emergency Provisions
- Temporary reallocation allowed for disasters, health crises
- Maximum 6-month duration
- Requires formal emergency declaration
`,
    testCases: [
      {
        id: 'benefit-test-1',
        name: 'Valid community distribution',
        description: 'Proper allocation meeting all requirements',
        input: {
          allocations: [
            { category: 'community_development', amount: 40000, percentage: 40 },
            { category: 'capacity_building', amount: 20000, percentage: 20 },
            { category: 'cultural_programs', amount: 15000, percentage: 15 },
            { category: 'infrastructure', amount: 15000, percentage: 15 },
            { category: 'administration', amount: 10000, percentage: 10 }
          ],
          consent: {
            community_meeting_held: true,
            quorum_achieved: true,
            approval_percentage: 85
          },
          community: {
            indigenous_involved: false
          },
          transparency: {
            public_reporting: true,
            financial_statements_available: true,
            allocation_rationale_documented: true
          }
        },
        expectedOutput: { allowed: true },
        expectedDecision: 'allow'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['ACNC', 'NIAA'],
      indigenousProtocols: true,
      dataResidency: 'australia'
    }
  } as PolicyDefinition,

  /**
   * Indigenous cultural protocols policy
   */
  culturalProtocols: {
    name: 'Indigenous Cultural Protocols',
    description: 'Ensures respect for Indigenous cultural protocols and data sovereignty',
    module: 'community.cultural_protocols',
    type: PolicyType.CULTURAL,
    enforcement: PolicyEnforcement.MANDATORY,
    scopes: [ConsentScope.CULTURAL_PROTOCOLS, ConsentScope.INDIGENOUS_DATA],
    rego: `
package community.cultural_protocols

import rego.v1

# CARE Principles for Indigenous Data Governance
care_principles := {
    "collective_benefit": "Data ecosystems shall be designed and function to benefit Indigenous communities",
    "authority_to_control": "Indigenous peoples' rights to data about them, including the creation, interpretation, and use",
    "responsibility": "Those working with Indigenous data have responsibility to share how the data will be used",
    "ethics": "Indigenous peoples' rights and wellbeing should be the primary concern"
}

# Allow cultural activities with proper protocols
allow if {
    care_principles_satisfied
    traditional_owner_consent
    cultural_impact_assessed
    benefit_sharing_agreed
}

# CARE Principles compliance
care_principles_satisfied if {
    collective_benefit_ensured
    authority_respected
    responsibility_acknowledged
    ethics_prioritised
}

collective_benefit_ensured if {
    input.benefits.community_benefit_percentage >= 60
    input.benefits.capacity_building_included == true
    input.benefits.cultural_preservation_supported == true
}

authority_respected if {
    input.governance.traditional_owners_control == true
    input.governance.data_sovereignty_recognised == true
    input.governance.intellectual_property_protected == true
}

responsibility_acknowledged if {
    input.responsibility.use_purpose_disclosed == true
    input.responsibility.sharing_commitments_documented == true
    input.responsibility.accountability_mechanisms_established == true
}

ethics_prioritised if {
    input.ethics.wellbeing_primary_concern == true
    input.ethics.harm_minimisation_protocols == true
    input.ethics.cultural_sensitivity_training_completed == true
}

# Traditional owner consent
traditional_owner_consent if {
    input.consent.traditional_owners_identified == true
    input.consent.consultation_completed == true
    input.consent.free_prior_informed_consent == true
    input.consent.written_agreement == true
}

# Cultural impact assessment
cultural_impact_assessed if {
    input.impact_assessment.completed == true
    input.impact_assessment.cultural_expert_involved == true
    input.impact_assessment.mitigation_measures_identified == true
    input.impact_assessment.monitoring_plan_established == true
}

# Benefit sharing agreement
benefit_sharing_agreed if {
    input.benefit_sharing.agreement_signed == true
    input.benefit_sharing.percentage_specified == true
    input.benefit_sharing.payment_schedule_agreed == true
    input.benefit_sharing.capacity_building_included == true
}

# Sacred/sensitive knowledge protection
sacred_knowledge_protected if {
    not input.data.contains_sacred_knowledge
}

sacred_knowledge_protected if {
    input.data.contains_sacred_knowledge == true
    input.protection.restricted_access == true
    input.protection.elder_approval == true
    input.protection.cultural_protocols_followed == true
}

# Conditional approval for protocol development
conditional if {
    protocols_under_development
    interim_protections_in_place
}

protocols_under_development if {
    input.development.protocol_development_initiated == true
    input.development.timeline_agreed == true
    input.development.traditional_owners_leading == true
}

interim_protections_in_place if {
    input.interim.access_restricted == true
    input.interim.elder_oversight == true
    input.interim.harm_prevention_measures == true
}

# Deny if fundamental principles violated
deny if {
    input.consent.traditional_owners_identified == false
}

deny if {
    input.data.contains_sacred_knowledge == true
    input.protection.elder_approval == false
}

deny if {
    input.benefits.community_benefit_percentage < 30
}

# Country-specific protocols
country_protocols_respected if {
    input.country.identified == true
    input.country.appropriate_protocols_followed == true
    input.country.ranger_groups_consulted == true
}

# Language preservation requirements
language_preservation_supported if {
    not input.activity.involves_language
}

language_preservation_supported if {
    input.activity.involves_language == true
    input.language.speakers_consulted == true
    input.language.preservation_supported == true
    input.language.attribution_provided == true
}

# Seasonal and ceremonial considerations
ceremonial_considerations_respected if {
    not input.timing.ceremonial_season
}

ceremonial_considerations_respected if {
    input.timing.ceremonial_season == true
    input.timing.ceremony_protocols_observed == true
    input.timing.alternative_timing_considered == true
}
`,
    documentation: `
# Indigenous Cultural Protocols Policy

Implements CARE Principles for Indigenous data governance and cultural respect.

## CARE Principles
- **Collective Benefit**: Data ecosystems benefit Indigenous communities
- **Authority to Control**: Indigenous peoples' rights to control their data
- **Responsibility**: Shared responsibility for data use and benefits
- **Ethics**: Indigenous rights and wellbeing are primary concern

## Key Requirements
- Traditional owner identification and consultation
- Free, Prior, and Informed Consent (FPIC)
- Cultural impact assessment by qualified experts
- Minimum 60% community benefit allocation
- Sacred knowledge protection protocols

## Special Considerations
- Country-specific protocols and ranger group consultation
- Language preservation and attribution
- Seasonal and ceremonial timing respect
- Intellectual property protection
- Capacity building inclusion

## Governance Structure
- Traditional owners maintain control over their data
- Elder approval required for sacred/sensitive knowledge
- Written agreements for all cultural activities
- Ongoing monitoring and accountability mechanisms
`,
    testCases: [
      {
        id: 'cultural-test-1',
        name: 'Valid cultural protocol compliance',
        description: 'Activity meeting all CARE principles and protocols',
        input: {
          benefits: {
            community_benefit_percentage: 70,
            capacity_building_included: true,
            cultural_preservation_supported: true
          },
          governance: {
            traditional_owners_control: true,
            data_sovereignty_recognised: true,
            intellectual_property_protected: true
          },
          consent: {
            traditional_owners_identified: true,
            consultation_completed: true,
            free_prior_informed_consent: true,
            written_agreement: true
          },
          impact_assessment: {
            completed: true,
            cultural_expert_involved: true,
            mitigation_measures_identified: true,
            monitoring_plan_established: true
          },
          data: {
            contains_sacred_knowledge: false
          },
          ethics: {
            wellbeing_primary_concern: true,
            harm_minimisation_protocols: true,
            cultural_sensitivity_training_completed: true
          }
        },
        expectedOutput: { allowed: true },
        expectedDecision: 'allow'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['NIAA', 'AIATSIS', 'Native Title Act'],
      indigenousProtocols: true,
      dataResidency: 'australia'
    }
  } as PolicyDefinition

};