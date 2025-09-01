/**
 * Financial Policy Modules
 * 
 * Rego policies for financial operations including spending limits,
 * approval workflows, and Australian tax compliance
 */

import { PolicyDefinition } from '../types';
import { PolicyType, PolicyEnforcement, ConsentScope } from '../../types/governance';

/**
 * Pre-defined financial policies
 */
export const FinancialPolicies = {
  
  /**
   * Spending limits policy with Australian GST consideration
   */
  spendingLimits: {
    name: 'Spending Limits Policy',
    description: 'Enforces spending limits based on consent level and GST thresholds',
    module: 'financial.spending_limits',
    type: PolicyType.OPERATIONAL,
    enforcement: PolicyEnforcement.MANDATORY,
    scopes: [ConsentScope.CASH_FLOW, ConsentScope.BUDGET_PLANNING],
    rego: `
package financial.spending_limits

import rego.v1

# Australian GST threshold
gst_threshold := 75000

# Daily spending limits by consent level
daily_limits := {
    "basic_operations": 500,
    "enhanced_operations": 2000,
    "full_automation": 10000,
    "emergency_operations": 50000
}

# Allow transaction if within limits
allow if {
    input.amount <= daily_limits[input.consent_level]
    input.amount > 0
}

# Conditional approval for large amounts
conditional if {
    input.amount > daily_limits[input.consent_level]
    input.amount <= (daily_limits[input.consent_level] * 2)
    approval_required
}

# Deny if amount exceeds reasonable limits
deny if {
    input.amount > (daily_limits[input.consent_level] * 2)
}

# GST registration trigger
gst_registration_required if {
    input.annual_turnover >= gst_threshold
}

# Approval requirements
approval_required if {
    input.amount > 1000
}

approval_required if {
    input.category == "community_benefit"
    input.amount > 500
}

# Community benefit validation
community_benefit_valid if {
    input.category == "community_benefit"
    input.beneficiary_count > 0
    input.community_consent == true
}
`,
    documentation: `
# Spending Limits Policy

This policy enforces spending limits based on the user's consent level and includes Australian-specific considerations:

## Consent Levels and Limits
- **basic_operations**: $500/day
- **enhanced_operations**: $2,000/day  
- **full_automation**: $10,000/day
- **emergency_operations**: $50,000/day

## Australian Compliance
- GST registration required for annual turnover ≥ $75,000
- Community benefit transactions require additional validation

## Decision Logic
- **Allow**: Amount within daily limit
- **Conditional**: Amount up to 2x daily limit (requires approval)
- **Deny**: Amount exceeds 2x daily limit
`,
    testCases: [
      {
        id: 'test-1',
        name: 'Allow small transaction',
        description: 'Small transaction within basic operations limit',
        input: {
          amount: 100,
          consent_level: 'basic_operations',
          category: 'operational'
        },
        expectedOutput: { allowed: true },
        expectedDecision: 'allow'
      },
      {
        id: 'test-2', 
        name: 'Conditional large transaction',
        description: 'Transaction requiring approval',
        input: {
          amount: 1500,
          consent_level: 'basic_operations',
          category: 'operational'
        },
        expectedOutput: { conditional: true },
        expectedDecision: 'conditional'
      },
      {
        id: 'test-3',
        name: 'Deny excessive transaction',
        description: 'Transaction exceeding reasonable limits',
        input: {
          amount: 5000,
          consent_level: 'basic_operations', 
          category: 'operational'
        },
        expectedOutput: { denied: true },
        expectedDecision: 'deny'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['ATO', 'ACNC'],
      indigenousProtocols: false,
      dataResidency: 'australia'
    }
  } as PolicyDefinition,

  /**
   * Budget allocation policy
   */
  budgetAllocation: {
    name: 'Budget Allocation Policy',
    description: 'Manages budget allocation with community benefit priorities',
    module: 'financial.budget_allocation',
    type: PolicyType.OPERATIONAL,
    enforcement: PolicyEnforcement.ADVISORY,
    scopes: [ConsentScope.BUDGET_PLANNING],
    rego: `
package financial.budget_allocation

import rego.v1

# Minimum community benefit allocation (percentage)
min_community_allocation := 30

# Budget categories with priorities
budget_priorities := {
    "community_benefit": 1,
    "operational": 2,
    "capacity_building": 3,
    "infrastructure": 4,
    "administration": 5
}

# Allow allocation if community benefit threshold met
allow if {
    community_allocation_percentage >= min_community_allocation
    valid_category_distribution
}

# Calculate community benefit percentage
community_allocation_percentage := percentage if {
    total_budget := sum([item.amount | item := input.budget_items[_]])
    community_total := sum([item.amount | 
        item := input.budget_items[_]
        item.category == "community_benefit"
    ])
    percentage := (community_total / total_budget) * 100
}

# Validate category distribution
valid_category_distribution if {
    every category in object.keys(budget_priorities) {
        category_total := sum([item.amount | 
            item := input.budget_items[_]
            item.category == category
        ])
        category_total >= 0
    }
}

# Conditional approval for low community allocation
conditional if {
    community_allocation_percentage < min_community_allocation
    community_allocation_percentage >= 20
}

# Deny if community allocation too low
deny if {
    community_allocation_percentage < 20
}
`,
    documentation: `
# Budget Allocation Policy

Ensures appropriate allocation of funds with community benefit priorities.

## Requirements
- Minimum 30% allocation to community benefit activities
- Conditional approval for 20-30% community allocation
- Denial if community allocation below 20%

## Budget Categories (Priority Order)
1. Community Benefit
2. Operational
3. Capacity Building
4. Infrastructure  
5. Administration
`,
    testCases: [
      {
        id: 'budget-test-1',
        name: 'Valid community allocation',
        description: 'Budget with sufficient community benefit allocation',
        input: {
          budget_items: [
            { category: 'community_benefit', amount: 30000 },
            { category: 'operational', amount: 50000 },
            { category: 'administration', amount: 20000 }
          ]
        },
        expectedOutput: { allowed: true },
        expectedDecision: 'allow'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['ACNC'],
      indigenousProtocols: false,
      dataResidency: 'australia'
    }
  } as PolicyDefinition,

  /**
   * AUSTRAC reporting policy
   */
  austracReporting: {
    name: 'AUSTRAC Reporting Policy',
    description: 'Automatic reporting for large transactions as required by AUSTRAC',
    module: 'financial.austrac_reporting', 
    type: PolicyType.COMPLIANCE,
    enforcement: PolicyEnforcement.MANDATORY,
    scopes: [ConsentScope.REPORTING],
    rego: `
package financial.austrac_reporting

import rego.v1

# AUSTRAC thresholds (AUD)
austrac_threshold := 10000
suspicious_transaction_threshold := 5000

# Allow transaction with AUSTRAC reporting
allow if {
    input.amount >= austrac_threshold
    austrac_report_required
}

# Allow normal transactions below threshold
allow if {
    input.amount < austrac_threshold
    not suspicious_pattern
}

# Conditional for suspicious patterns
conditional if {
    suspicious_pattern
    input.amount < austrac_threshold
}

# AUSTRAC reporting required
austrac_report_required if {
    input.amount >= austrac_threshold
}

# Detect suspicious patterns
suspicious_pattern if {
    input.amount >= suspicious_transaction_threshold
    input.frequency_24h > 3
}

suspicious_pattern if {
    input.structured_transactions == true
}

suspicious_pattern if {
    input.cash_transaction == true
    input.amount >= 5000
}

# Deny if refusing to provide identification
deny if {
    input.amount >= 1000
    input.identification_provided == false
}
`,
    documentation: `
# AUSTRAC Reporting Policy

Implements Australian Transaction Reports and Analysis Centre (AUSTRAC) compliance requirements.

## Thresholds
- **$10,000+**: Mandatory AUSTRAC reporting
- **$5,000+**: Suspicious transaction monitoring
- **$1,000+**: Customer identification required

## Reporting Triggers
- Large cash transactions
- Structured transactions (attempting to avoid thresholds)
- Frequent transactions within 24 hours
- Transactions without proper identification

## Compliance Notes
- All AUD amounts
- Immediate reporting required for qualifying transactions
- Enhanced due diligence for suspicious patterns
`,
    testCases: [
      {
        id: 'austrac-test-1',
        name: 'Large transaction reporting',
        description: 'Transaction requiring AUSTRAC reporting',
        input: {
          amount: 15000,
          cash_transaction: false,
          identification_provided: true,
          frequency_24h: 1
        },
        expectedOutput: { austrac_report_required: true },
        expectedDecision: 'allow'
      }
    ],
    australianCompliance: {
      regulatoryFramework: ['AUSTRAC'],
      indigenousProtocols: false,
      dataResidency: 'australia'
    }
  } as PolicyDefinition

};