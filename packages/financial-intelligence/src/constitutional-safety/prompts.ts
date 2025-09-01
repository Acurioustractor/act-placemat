/**
 * Constitutional Safety Prompts
 * 
 * Predefined safety prompts for constitutional compliance in financial AI systems
 */

import {
  SafetyPrompt,
  SafetyTrigger,
  PromptType,
  SafetySeverity,
  AgentEventType,
  TriggerCondition,
  DataMetric,
  FinancialMetric,
  TemporalType,
  ContextType,
  BlockingCondition,
  ResolutionType,
  EnforcementLevel
} from './types';

export const CONSTITUTIONAL_SAFETY_PROMPTS: SafetyPrompt[] = [
  // Democratic Accountability Prompts
  {
    id: 'SP001',
    principleId: 'CP001',
    trigger: {
      eventType: AgentEventType.FINANCIAL_TRANSACTION,
      conditions: [
        {
          field: 'amount',
          operator: 'greater_than',
          value: 100000,
          description: 'Large financial transaction requiring democratic oversight'
        }
      ],
      financialThresholds: [
        {
          metric: FinancialMetric.TRANSACTION_AMOUNT,
          amount: 100000,
          currency: 'AUD'
        }
      ]
    },
    promptType: PromptType.WARNING,
    severity: SafetySeverity.HIGH,
    title: 'Large Transaction Democratic Oversight',
    message: 'This large financial transaction may require democratic oversight and accountability mechanisms.',
    reasoning: 'Under constitutional principles of democratic accountability, significant financial decisions should be subject to appropriate oversight.',
    suggestedActions: [
      'Review transaction against democratic oversight requirements',
      'Ensure proper approval processes are followed',
      'Document justification for transaction',
      'Consider if ministerial or parliamentary notification is required'
    ],
    escalationRequired: true,
    humanReviewRequired: true,
    blockingConditions: [
      {
        id: 'BC001',
        description: 'Requires democratic oversight approval for transactions over $100,000',
        condition: {
          field: 'democratic_oversight_approval',
          operator: 'equals',
          value: false,
          description: 'Democratic oversight approval not obtained'
        },
        resolution: {
          type: ResolutionType.MANUAL_APPROVAL,
          requiredRole: 'democratic_oversight_officer',
          requiredApprovals: 1
        }
      }
    ]
  },

  // Transparent Decision Making
  {
    id: 'SP002',
    principleId: 'CP002',
    trigger: {
      eventType: AgentEventType.POLICY_DECISION,
      conditions: [
        {
          field: 'decision_type',
          operator: 'in',
          value: ['policy_change', 'rule_modification', 'compliance_override'],
          description: 'Policy decision that affects transparency requirements'
        }
      ]
    },
    promptType: PromptType.BLOCKING,
    severity: SafetySeverity.CRITICAL,
    title: 'Decision Transparency Requirements',
    message: 'This policy decision must include full transparency documentation and audit trail.',
    reasoning: 'Constitutional requirement for transparent decision-making processes in AI financial systems.',
    suggestedActions: [
      'Document decision logic and reasoning',
      'Ensure audit trail is complete',
      'Provide public explanation where appropriate',
      'Record all factors considered in decision'
    ],
    escalationRequired: true,
    humanReviewRequired: true,
    blockingConditions: [
      {
        id: 'BC002',
        description: 'Requires complete transparency documentation',
        condition: {
          field: 'transparency_documentation',
          operator: 'equals',
          value: 'incomplete',
          description: 'Transparency documentation is incomplete'
        },
        resolution: {
          type: ResolutionType.MANUAL_APPROVAL,
          requiredRole: 'transparency_officer'
        }
      }
    ]
  },

  // Legal Consistency
  {
    id: 'SP003',
    principleId: 'CP003',
    trigger: {
      eventType: AgentEventType.FINANCIAL_TRANSACTION,
      conditions: [
        {
          field: 'legal_framework_conflict',
          operator: 'equals',
          value: true,
          description: 'Transaction conflicts with existing legal framework'
        }
      ]
    },
    promptType: PromptType.BLOCKING,
    severity: SafetySeverity.CRITICAL,
    title: 'Legal Framework Conflict',
    message: 'This transaction conflicts with existing legal frameworks and cannot proceed without legal review.',
    reasoning: 'Constitutional principle requires AI decisions to be consistent with existing legal frameworks.',
    suggestedActions: [
      'Conduct legal review of transaction',
      'Identify specific legal conflicts',
      'Seek legal opinion on resolution',
      'Consider alternative approaches'
    ],
    escalationRequired: true,
    humanReviewRequired: true,
    blockingConditions: [
      {
        id: 'BC003',
        description: 'Requires legal review and clearance',
        condition: {
          field: 'legal_clearance',
          operator: 'equals',
          value: false,
          description: 'Legal clearance not obtained'
        },
        resolution: {
          type: ResolutionType.LEGAL_REVIEW,
          requiredRole: 'legal_officer'
        }
      }
    ]
  },

  // Procedural Fairness
  {
    id: 'SP004',
    principleId: 'CP004',
    trigger: {
      eventType: AgentEventType.USER_CONSENT,
      conditions: [
        {
          field: 'affected_party_notification',
          operator: 'equals',
          value: false,
          description: 'Affected parties have not been properly notified'
        }
      ]
    },
    promptType: PromptType.WARNING,
    severity: SafetySeverity.HIGH,
    title: 'Procedural Fairness Requirements',
    message: 'Procedural fairness requires that all affected parties be properly notified and given opportunity to respond.',
    reasoning: 'Constitutional requirement for procedural fairness in all financial decisions.',
    suggestedActions: [
      'Notify all affected parties',
      'Provide opportunity for response',
      'Document notification process',
      'Allow reasonable time for response'
    ],
    escalationRequired: false,
    humanReviewRequired: true,
    blockingConditions: []
  },

  // Indigenous Data Sovereignty
  {
    id: 'SP005',
    principleId: 'CP015',
    trigger: {
      eventType: AgentEventType.INDIGENOUS_DATA_ACCESS,
      conditions: [
        {
          field: 'data_type',
          operator: 'in',
          value: ['cultural', 'traditional_knowledge', 'community_data'],
          description: 'Access to Indigenous cultural or community data'
        }
      ]
    },
    promptType: PromptType.BLOCKING,
    severity: SafetySeverity.CRITICAL,
    title: 'Indigenous Data Sovereignty',
    message: 'Access to Indigenous data requires compliance with CARE principles and Traditional Owner consent.',
    reasoning: 'Constitutional and international law requirements for Indigenous data sovereignty.',
    suggestedActions: [
      'Verify Traditional Owner consent',
      'Ensure CARE principles compliance',
      'Document cultural protocols followed',
      'Confirm Elder approval where required'
    ],
    escalationRequired: true,
    humanReviewRequired: true,
    blockingConditions: [
      {
        id: 'BC005',
        description: 'Requires Traditional Owner consent and CARE principles compliance',
        condition: {
          field: 'traditional_owner_consent',
          operator: 'equals',
          value: false,
          description: 'Traditional Owner consent not obtained'
        },
        resolution: {
          type: ResolutionType.MANUAL_APPROVAL,
          requiredRole: 'indigenous_liaison_officer'
        }
      }
    ]
  },

  // Financial Privacy Protection
  {
    id: 'SP006',
    principleId: 'CP020',
    trigger: {
      eventType: AgentEventType.DATA_ACCESS,
      conditions: [
        {
          field: 'data_classification',
          operator: 'in',
          value: ['personal_financial', 'sensitive_financial'],
          description: 'Access to personal financial data'
        }
      ],
      dataThresholds: [
        {
          metric: DataMetric.PERSONAL_RECORDS,
          threshold: 100,
          unit: 'records'
        }
      ]
    },
    promptType: PromptType.WARNING,
    severity: SafetySeverity.MEDIUM,
    title: 'Financial Privacy Protection',
    message: 'Access to personal financial data must comply with privacy protection requirements.',
    reasoning: 'Constitutional implied right to financial privacy requires protection of personal financial information.',
    suggestedActions: [
      'Verify consent for data access',
      'Ensure minimum necessary principle',
      'Document purpose of access',
      'Apply appropriate data protection measures'
    ],
    escalationRequired: false,
    humanReviewRequired: true,
    blockingConditions: []
  },

  // Emergency Powers Limitations
  {
    id: 'SP007',
    principleId: 'CP024',
    trigger: {
      eventType: AgentEventType.EMERGENCY_ACTION,
      conditions: [
        {
          field: 'action_type',
          operator: 'equals',
          value: 'emergency_override',
          description: 'Emergency override action being attempted'
        }
      ]
    },
    promptType: PromptType.BLOCKING,
    severity: SafetySeverity.CRITICAL,
    title: 'Emergency Powers Limitation',
    message: 'Emergency powers must be time-limited, justified, and subject to immediate review.',
    reasoning: 'Constitutional limits on emergency powers require strict controls and oversight.',
    suggestedActions: [
      'Document emergency justification',
      'Set time limits on emergency powers',
      'Notify oversight authorities',
      'Schedule immediate review'
    ],
    escalationRequired: true,
    humanReviewRequired: true,
    blockingConditions: [
      {
        id: 'BC007',
        description: 'Requires emergency justification and time limits',
        condition: {
          field: 'emergency_justification',
          operator: 'equals',
          value: '',
          description: 'Emergency justification not provided'
        },
        resolution: {
          type: ResolutionType.EMERGENCY_OVERRIDE,
          requiredRole: 'emergency_powers_officer'
        },
        timeoutMinutes: 30
      }
    ]
  },

  // Cross-Border Transfer
  {
    id: 'SP008',
    principleId: 'CP011',
    trigger: {
      eventType: AgentEventType.CROSS_BORDER_TRANSFER,
      conditions: [
        {
          field: 'destination_country',
          operator: 'not_in',
          value: ['AU'],
          description: 'Data or funds transfer outside Australia'
        }
      ]
    },
    promptType: PromptType.WARNING,
    severity: SafetySeverity.HIGH,
    title: 'Cross-Border Transfer Compliance',
    message: 'Cross-border transfers must comply with federal and state jurisdiction requirements.',
    reasoning: 'Federal-state balance requires proper jurisdiction compliance for cross-border activities.',
    suggestedActions: [
      'Verify jurisdiction compliance',
      'Check international agreement requirements',
      'Ensure proper approvals obtained',
      'Document transfer justification'
    ],
    escalationRequired: true,
    humanReviewRequired: true,
    blockingConditions: []
  },

  // Proportionate Response
  {
    id: 'SP009',
    principleId: 'CP023',
    trigger: {
      eventType: AgentEventType.FINANCIAL_TRANSACTION,
      conditions: [
        {
          field: 'intervention_level',
          operator: 'in',
          value: ['high', 'severe'],
          description: 'High-level intervention proposed'
        }
      ]
    },
    promptType: PromptType.WARNING,
    severity: SafetySeverity.MEDIUM,
    title: 'Proportionate Response Required',
    message: 'The proposed intervention must be proportionate to the risks being addressed.',
    reasoning: 'Constitutional rule of law requires proportionate responses to identified risks.',
    suggestedActions: [
      'Assess risk level and proportionality',
      'Consider less intrusive alternatives',
      'Document proportionality analysis',
      'Justify intervention level'
    ],
    escalationRequired: false,
    humanReviewRequired: true,
    blockingConditions: []
  },

  // After Hours Operations
  {
    id: 'SP010',
    principleId: 'CP002',
    trigger: {
      eventType: AgentEventType.FINANCIAL_TRANSACTION,
      conditions: [
        {
          field: 'amount',
          operator: 'greater_than',
          value: 50000,
          description: 'Large transaction during after hours'
        }
      ],
      temporalConstraints: [
        {
          type: TemporalType.AFTER_HOURS,
          timeZone: 'Australia/Sydney',
          description: 'Outside normal business hours'
        }
      ]
    },
    promptType: PromptType.CONFIRMATION,
    severity: SafetySeverity.MEDIUM,
    title: 'After Hours Large Transaction',
    message: 'Large financial transactions during after hours require additional verification.',
    reasoning: 'Transparency requirements include enhanced scrutiny for unusual timing of transactions.',
    suggestedActions: [
      'Verify transaction urgency',
      'Document after-hours justification',
      'Confirm authorisation levels',
      'Schedule follow-up review'
    ],
    escalationRequired: false,
    humanReviewRequired: true,
    blockingConditions: []
  },

  // Constitutional Amendment Process
  {
    id: 'SP011',
    principleId: 'CP019',
    trigger: {
      eventType: AgentEventType.SYSTEM_INTEGRATION,
      conditions: [
        {
          field: 'modification_type',
          operator: 'in',
          value: ['constitutional_framework', 'core_principles'],
          description: 'Modification to constitutional framework'
        }
      ]
    },
    promptType: PromptType.BLOCKING,
    severity: SafetySeverity.CRITICAL,
    title: 'Constitutional Framework Modification',
    message: 'Changes to constitutional compliance framework must follow proper amendment processes.',
    reasoning: 'Constitutional supremacy requires proper processes for any framework modifications.',
    suggestedActions: [
      'Follow constitutional amendment process',
      'Obtain required approvals',
      'Document change justification',
      'Ensure democratic oversight'
    ],
    escalationRequired: true,
    humanReviewRequired: true,
    blockingConditions: [
      {
        id: 'BC011',
        description: 'Requires constitutional review and approval',
        condition: {
          field: 'constitutional_approval',
          operator: 'equals',
          value: false,
          description: 'Constitutional approval not obtained'
        },
        resolution: {
          type: ResolutionType.CONSTITUTIONAL_REVIEW,
          requiredRole: 'constitutional_officer'
        }
      }
    ]
  },

  // Economic Freedom
  {
    id: 'SP012',
    principleId: 'CP021',
    trigger: {
      eventType: AgentEventType.POLICY_DECISION,
      conditions: [
        {
          field: 'economic_impact',
          operator: 'in',
          value: ['high_restriction', 'market_limitation'],
          description: 'Policy with significant economic freedom implications'
        }
      ]
    },
    promptType: PromptType.ADVISORY,
    severity: SafetySeverity.MEDIUM,
    title: 'Economic Freedom Consideration',
    message: 'This policy may restrict economic freedom and should be carefully considered.',
    reasoning: 'Constitutional implied rights include consideration of economic freedom in policy decisions.',
    suggestedActions: [
      'Assess economic freedom impact',
      'Consider market effects',
      'Evaluate necessity of restrictions',
      'Document economic analysis'
    ],
    escalationRequired: false,
    humanReviewRequired: false,
    blockingConditions: []
  }
];

// Helper functions for prompt management
export function getPromptById(id: string): SafetyPrompt | undefined {
  return CONSTITUTIONAL_SAFETY_PROMPTS.find(p => p.id === id);
}

export function getPromptsByPrinciple(principleId: string): SafetyPrompt[] {
  return CONSTITUTIONAL_SAFETY_PROMPTS.filter(p => p.principleId === principleId);
}

export function getPromptsByEventType(eventType: AgentEventType): SafetyPrompt[] {
  return CONSTITUTIONAL_SAFETY_PROMPTS.filter(p => p.trigger.eventType === eventType);
}

export function getPromptsBySeverity(severity: SafetySeverity): SafetyPrompt[] {
  return CONSTITUTIONAL_SAFETY_PROMPTS.filter(p => p.severity === severity);
}

export function getBlockingPrompts(): SafetyPrompt[] {
  return CONSTITUTIONAL_SAFETY_PROMPTS.filter(p => 
    p.promptType === PromptType.BLOCKING || p.blockingConditions.length > 0
  );
}

export function getCriticalPrompts(): SafetyPrompt[] {
  return CONSTITUTIONAL_SAFETY_PROMPTS.filter(p => 
    p.severity === SafetySeverity.CRITICAL
  );
}

// Prompt evaluation helpers
export function evaluatePromptTrigger(
  prompt: SafetyPrompt, 
  context: any, 
  eventType: AgentEventType
): boolean {
  // Check if event type matches
  if (prompt.trigger.eventType !== eventType) {
    return false;
  }

  // Check all trigger conditions
  for (const condition of prompt.trigger.conditions) {
    if (!evaluateCondition(condition, context)) {
      return false;
    }
  }

  // Check financial thresholds if present
  if (prompt.trigger.financialThresholds) {
    for (const threshold of prompt.trigger.financialThresholds) {
      if (!evaluateFinancialThreshold(threshold, context)) {
        return false;
      }
    }
  }

  // Check data thresholds if present
  if (prompt.trigger.dataThresholds) {
    for (const threshold of prompt.trigger.dataThresholds) {
      if (!evaluateDataThreshold(threshold, context)) {
        return false;
      }
    }
  }

  return true;
}

function evaluateCondition(condition: TriggerCondition, context: any): boolean {
  const fieldValue = getNestedValue(context, condition.field);
  
  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'not_equals':
      return fieldValue !== condition.value;
    case 'greater_than':
      return Number(fieldValue) > Number(condition.value);
    case 'less_than':
      return Number(fieldValue) < Number(condition.value);
    case 'contains':
      return String(fieldValue).includes(String(condition.value));
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
    case 'regex':
      return new RegExp(condition.value).test(String(fieldValue));
    default:
      return false;
  }
}

function evaluateFinancialThreshold(threshold: any, context: any): boolean {
  const amount = getNestedValue(context, 'amount') || 0;
  return Number(amount) >= threshold.amount;
}

function evaluateDataThreshold(threshold: any, context: any): boolean {
  const count = getNestedValue(context, 'record_count') || 0;
  return Number(count) >= threshold.threshold;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}