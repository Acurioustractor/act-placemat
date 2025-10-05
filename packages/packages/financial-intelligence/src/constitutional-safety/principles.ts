/**
 * Constitutional Principles Configuration
 * 
 * Core constitutional principles for Australian financial systems
 * with specific focus on AI agent compliance
 */

import {
  ConstitutionalPrinciple,
  ConstitutionalCategory,
  ConstitutionalSource,
  EnforcementLevel,
  Jurisdiction
} from './types';

export const AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES: ConstitutionalPrinciple[] = [
  // Democracy and Representative Government
  {
    id: 'CP001',
    name: 'Democratic Accountability',
    description: 'AI financial decisions must be subject to democratic oversight and accountability mechanisms',
    category: ConstitutionalCategory.DEMOCRACY,
    source: ConstitutionalSource.AUSTRALIAN_CONSTITUTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP002', 'CP005']
  },
  {
    id: 'CP002', 
    name: 'Transparent Decision Making',
    description: 'Financial AI systems must provide transparent, auditable decision-making processes',
    category: ConstitutionalCategory.DEMOCRACY,
    source: ConstitutionalSource.FEDERAL_LEGISLATION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP001', 'CP015']
  },

  // Rule of Law
  {
    id: 'CP003',
    name: 'Legal Consistency',
    description: 'AI decisions must be consistent with existing legal frameworks and precedents',
    category: ConstitutionalCategory.RULE_OF_LAW,
    source: ConstitutionalSource.COMMON_LAW,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL, Jurisdiction.NSW, Jurisdiction.VIC, Jurisdiction.QLD, Jurisdiction.WA, Jurisdiction.SA, Jurisdiction.TAS, Jurisdiction.NT, Jurisdiction.ACT],
    relatedPrinciples: ['CP004', 'CP006']
  },
  {
    id: 'CP004',
    name: 'Procedural Fairness',
    description: 'All financial decisions must follow fair and established procedures',
    category: ConstitutionalCategory.RULE_OF_LAW,
    source: ConstitutionalSource.HIGH_COURT_PRECEDENT,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP003', 'CP007']
  },

  // Separation of Powers
  {
    id: 'CP005',
    name: 'Executive Authority Limits',
    description: 'AI systems cannot exercise powers beyond those granted by proper legislative authority',
    category: ConstitutionalCategory.SEPARATION_OF_POWERS,
    source: ConstitutionalSource.AUSTRALIAN_CONSTITUTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP001', 'CP006']
  },
  {
    id: 'CP006',
    name: 'Legislative Override',
    description: 'AI decisions must be subject to legislative oversight and potential override',
    category: ConstitutionalCategory.SEPARATION_OF_POWERS,
    source: ConstitutionalSource.AUSTRALIAN_CONSTITUTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP003', 'CP005']
  },

  // Judicial Independence
  {
    id: 'CP007',
    name: 'Judicial Review Access',
    description: 'AI financial decisions must be subject to judicial review mechanisms',
    category: ConstitutionalCategory.JUDICIAL_INDEPENDENCE,
    source: ConstitutionalSource.HIGH_COURT_PRECEDENT,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP004', 'CP008']
  },
  {
    id: 'CP008',
    name: 'Due Process Rights',
    description: 'Individuals must have access to appeal and review processes for AI decisions',
    category: ConstitutionalCategory.JUDICIAL_INDEPENDENCE,
    source: ConstitutionalSource.COMMON_LAW,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP007', 'CP011']
  },

  // Responsible Government
  {
    id: 'CP009',
    name: 'Ministerial Responsibility',
    description: 'AI systems in government must operate under clear ministerial responsibility',
    category: ConstitutionalCategory.RESPONSIBLE_GOVERNMENT,
    source: ConstitutionalSource.CONSTITUTIONAL_CONVENTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP001', 'CP010']
  },
  {
    id: 'CP010',
    name: 'Parliamentary Oversight',
    description: 'AI financial systems must be subject to parliamentary inquiry and oversight',
    category: ConstitutionalCategory.RESPONSIBLE_GOVERNMENT,
    source: ConstitutionalSource.CONSTITUTIONAL_CONVENTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP009', 'CP002']
  },

  // Federalism
  {
    id: 'CP011',
    name: 'Federal-State Balance',
    description: 'AI systems must respect the division of powers between federal and state governments',
    category: ConstitutionalCategory.FEDERALISM,
    source: ConstitutionalSource.AUSTRALIAN_CONSTITUTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP012', 'CP008']
  },
  {
    id: 'CP012',
    name: 'State Jurisdiction Respect',
    description: 'AI financial decisions must not override legitimate state jurisdiction',
    category: ConstitutionalCategory.FEDERALISM,
    source: ConstitutionalSource.AUSTRALIAN_CONSTITUTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP011', 'CP013']
  },

  // Human Rights (Implied Constitutional Rights)
  {
    id: 'CP013',
    name: 'Freedom of Political Communication',
    description: 'AI systems must not impede legitimate political communication and discourse',
    category: ConstitutionalCategory.HUMAN_RIGHTS,
    source: ConstitutionalSource.HIGH_COURT_PRECEDENT,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP012', 'CP014']
  },
  {
    id: 'CP014',
    name: 'Equal Treatment',
    description: 'AI financial systems must not discriminate unfairly between individuals or groups',
    category: ConstitutionalCategory.HUMAN_RIGHTS,
    source: ConstitutionalSource.FEDERAL_LEGISLATION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP013', 'CP015']
  },

  // Indigenous Rights
  {
    id: 'CP015',
    name: 'Indigenous Data Sovereignty',
    description: 'AI systems must respect Indigenous data sovereignty and the CARE principles',
    category: ConstitutionalCategory.INDIGENOUS_RIGHTS,
    source: ConstitutionalSource.INTERNATIONAL_TREATY,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL, Jurisdiction.INDIGENOUS_NATION],
    relatedPrinciples: ['CP002', 'CP016']
  },
  {
    id: 'CP016',
    name: 'Traditional Owner Consultation',
    description: 'AI decisions affecting Indigenous communities must involve proper consultation',
    category: ConstitutionalCategory.INDIGENOUS_RIGHTS,
    source: ConstitutionalSource.FEDERAL_LEGISLATION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL, Jurisdiction.INDIGENOUS_NATION],
    relatedPrinciples: ['CP015', 'CP017']
  },
  {
    id: 'CP017',
    name: 'Cultural Protocol Compliance',
    description: 'AI systems must comply with relevant Indigenous cultural protocols',
    category: ConstitutionalCategory.INDIGENOUS_RIGHTS,
    source: ConstitutionalSource.INTERNATIONAL_TREATY,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL, Jurisdiction.INDIGENOUS_NATION],
    relatedPrinciples: ['CP016', 'CP014']
  },

  // Constitutional Supremacy
  {
    id: 'CP018',
    name: 'Constitutional Compliance',
    description: 'All AI operations must comply with constitutional requirements',
    category: ConstitutionalCategory.CONSTITUTIONAL_SUPREMACY,
    source: ConstitutionalSource.AUSTRALIAN_CONSTITUTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP019', 'CP001']
  },
  {
    id: 'CP019',
    name: 'Constitutional Amendment Process',
    description: 'Changes to AI constitutional compliance must follow proper amendment processes',
    category: ConstitutionalCategory.CONSTITUTIONAL_SUPREMACY,
    source: ConstitutionalSource.AUSTRALIAN_CONSTITUTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP018', 'CP006']
  },

  // Financial System Specific Principles
  {
    id: 'CP020',
    name: 'Financial Privacy Protection',
    description: 'AI systems must protect individual financial privacy as constitutionally implied',
    category: ConstitutionalCategory.HUMAN_RIGHTS,
    source: ConstitutionalSource.HIGH_COURT_PRECEDENT,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP014', 'CP021']
  },
  {
    id: 'CP021',
    name: 'Economic Freedom',
    description: 'AI financial decisions must not unduly restrict legitimate economic activity',
    category: ConstitutionalCategory.HUMAN_RIGHTS,
    source: ConstitutionalSource.HIGH_COURT_PRECEDENT,
    enforcementLevel: EnforcementLevel.ADVISORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP020', 'CP022']
  },
  {
    id: 'CP022',
    name: 'Financial System Stability',
    description: 'AI decisions must consider broader financial system stability',
    category: ConstitutionalCategory.RESPONSIBLE_GOVERNMENT,
    source: ConstitutionalSource.FEDERAL_LEGISLATION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP021', 'CP023']
  },
  {
    id: 'CP023',
    name: 'Proportionate Response',
    description: 'AI financial interventions must be proportionate to the risks being addressed',
    category: ConstitutionalCategory.RULE_OF_LAW,
    source: ConstitutionalSource.COMMON_LAW,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP022', 'CP004']
  },

  // Emergency Powers Limitations
  {
    id: 'CP024',
    name: 'Emergency Powers Limits',
    description: 'AI emergency powers must be time-limited and subject to review',
    category: ConstitutionalCategory.SEPARATION_OF_POWERS,
    source: ConstitutionalSource.AUSTRALIAN_CONSTITUTION,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP005', 'CP025']
  },
  {
    id: 'CP025',
    name: 'Emergency Justification',
    description: 'AI emergency actions must be clearly justified and documented',
    category: ConstitutionalCategory.RULE_OF_LAW,
    source: ConstitutionalSource.COMMON_LAW,
    enforcementLevel: EnforcementLevel.MANDATORY,
    applicableJurisdictions: [Jurisdiction.FEDERAL],
    relatedPrinciples: ['CP024', 'CP002']
  }
];

// Helper functions for principle management
export function getPrincipleById(id: string): ConstitutionalPrinciple | undefined {
  return AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES.find(p => p.id === id);
}

export function getPrinciplesByCategory(category: ConstitutionalCategory): ConstitutionalPrinciple[] {
  return AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES.filter(p => p.category === category);
}

export function getPrinciplesByJurisdiction(jurisdiction: Jurisdiction): ConstitutionalPrinciple[] {
  return AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES.filter(p => 
    p.applicableJurisdictions.includes(jurisdiction)
  );
}

export function getMandatoryPrinciples(): ConstitutionalPrinciple[] {
  return AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES.filter(p => 
    p.enforcementLevel === EnforcementLevel.MANDATORY
  );
}

export function getRelatedPrinciples(principleId: string): ConstitutionalPrinciple[] {
  const principle = getPrincipleById(principleId);
  if (!principle) return [];
  
  return principle.relatedPrinciples
    .map(id => getPrincipleById(id))
    .filter(p => p !== undefined) as ConstitutionalPrinciple[];
}

export function validatePrincipleSet(principleIds: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const foundPrinciples = new Set<string>();

  for (const id of principleIds) {
    const principle = getPrincipleById(id);
    if (!principle) {
      errors.push(`Unknown principle ID: ${id}`);
    } else {
      foundPrinciples.add(id);
    }
  }

  // Check for mandatory principles that might be missing
  const mandatoryPrinciples = getMandatoryPrinciples();
  const mandatoryIds = mandatoryPrinciples.map(p => p.id);
  
  for (const mandatoryId of mandatoryIds) {
    if (!foundPrinciples.has(mandatoryId)) {
      errors.push(`Missing mandatory principle: ${mandatoryId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Constitutional principle groupings for different AI agent types
export const AGENT_PRINCIPLE_PROFILES = {
  FINANCIAL_AGENT: [
    'CP001', 'CP002', 'CP003', 'CP004', 'CP007', 'CP008', 
    'CP014', 'CP015', 'CP016', 'CP018', 'CP020', 'CP021', 
    'CP022', 'CP023'
  ],
  GOVERNMENT_AGENT: [
    'CP001', 'CP002', 'CP003', 'CP004', 'CP005', 'CP006',
    'CP007', 'CP008', 'CP009', 'CP010', 'CP011', 'CP012',
    'CP018', 'CP019', 'CP024', 'CP025'
  ],
  CULTURAL_AGENT: [
    'CP001', 'CP002', 'CP003', 'CP004', 'CP014', 'CP015',
    'CP016', 'CP017', 'CP018'
  ],
  EMERGENCY_AGENT: [
    'CP001', 'CP002', 'CP003', 'CP004', 'CP018', 'CP024', 'CP025'
  ]
};