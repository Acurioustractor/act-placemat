// Mock data for development and testing

import {
  Project,
  Opportunity,
  Organization,
  Person,
  Artifact,
  ProjectArea,
  ProjectStatus,
  ProjectPlace,
  OpportunityStage,
  OpportunityType,
  OrganizationType,
  OrganizationSize,
  RelationshipStatus,
  FundingCapacity,
  DecisionTimeline,
  AlignmentLevel,
  PriorityLevel,
  RelationshipType,
  InfluenceLevel,
  CommunicationPreference,
  ContactFrequency,
  RelationshipStrength,
  ArtifactType,
  ArtifactFormat,
  ArtifactStatus,
  ArtifactPurpose,
  AccessLevel
} from '../types';

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Community Storytelling Platform',
    area: ProjectArea.STORY_SOVEREIGNTY,
    status: ProjectStatus.ACTIVE,
    description: 'A digital platform for communities to share and control their own stories',
    aiSummary: 'Platform enabling community-controlled narrative sharing with privacy controls',
    lead: 'Sarah Johnson',
    teamMembers: ['Sarah Johnson', 'Mike Chen', 'Ana Rodriguez'],
    coreValues: 'Community ownership, cultural respect, data sovereignty',
    themes: ['Digital storytelling', 'Community empowerment', 'Cultural preservation'],
    tags: ['platform', 'storytelling', 'community'],
    place: ProjectPlace.REGIONAL,
    location: 'Pacific Northwest',
    state: 'Washington',
    revenueActual: 45000,
    revenuePotential: 120000,
    actualIncoming: 25000,
    potentialIncoming: 80000,
    nextMilestone: new Date('2025-03-15'),
    startDate: new Date('2024-06-01'),
    relatedOpportunities: ['opp-1', 'opp-2'],
    partnerOrganizations: ['org-1', 'org-3'],
    artifacts: ['art-1', 'art-2'],
    websiteLinks: 'https://storytelling.act.community',
    lastModified: new Date('2025-01-20')
  },
  {
    id: '2',
    name: 'Cooperative Business Network',
    area: ProjectArea.ECONOMIC_FREEDOM,
    status: ProjectStatus.IDEATION,
    description: 'Network connecting cooperative businesses for resource sharing and mutual support',
    lead: 'David Kim',
    teamMembers: ['David Kim', 'Lisa Park', 'James Wilson'],
    coreValues: 'Cooperative economics, mutual aid, community wealth building',
    themes: ['Cooperative development', 'Economic justice', 'Network building'],
    tags: ['cooperative', 'business', 'network'],
    place: ProjectPlace.NATIONAL,
    location: 'Multiple states',
    state: 'Various',
    revenueActual: 32000,
    revenuePotential: 200000,
    actualIncoming: 15000,
    potentialIncoming: 150000,
    nextMilestone: new Date('2025-04-01'),
    startDate: new Date('2024-09-01'),
    relatedOpportunities: ['opp-3'],
    partnerOrganizations: ['org-2', 'org-4'],
    artifacts: ['art-3'],
    websiteLinks: 'https://coops.act.community',
    lastModified: new Date('2025-01-18')
  },
  {
    id: '3',
    name: 'Community Resilience Hub',
    area: ProjectArea.COMMUNITY_ENGAGEMENT,
    status: ProjectStatus.ACTIVE,
    description: 'Physical and digital hub for community organizing and mutual aid coordination',
    lead: 'Maria Gonzalez',
    teamMembers: ['Maria Gonzalez', 'Tom Anderson', 'Priya Patel'],
    coreValues: 'Community resilience, mutual aid, participatory democracy',
    themes: ['Community organizing', 'Disaster preparedness', 'Mutual aid'],
    tags: ['hub', 'resilience', 'organizing'],
    place: ProjectPlace.COMMUNITY,
    location: 'Oakland',
    state: 'California',
    revenueActual: 28000,
    revenuePotential: 85000,
    actualIncoming: 12000,
    potentialIncoming: 45000,
    nextMilestone: new Date('2025-02-28'),
    startDate: new Date('2024-04-15'),
    relatedOpportunities: ['opp-4'],
    partnerOrganizations: ['org-1', 'org-5'],
    artifacts: ['art-4', 'art-5'],
    websiteLinks: 'https://resilience.act.community',
    lastModified: new Date('2025-01-22')
  }
];

// Mock Opportunities
export const mockOpportunities: Opportunity[] = [
  {
    id: 'opp-1',
    name: 'Knight Foundation Media Innovation Grant',
    organization: 'Knight Foundation',
    stage: OpportunityStage.PROPOSAL,
    amount: 150000,
    probability: 70,
    weightedValue: 105000,
    type: OpportunityType.GRANT,
    description: 'Grant for innovative media and storytelling platforms',
    relatedProjects: ['1'],
    primaryContact: 'Jennifer Smith',
    decisionMakers: ['Jennifer Smith', 'Robert Johnson'],
    nextAction: 'Submit final proposal',
    nextActionDate: new Date('2025-02-15'),
    deadline: new Date('2025-03-01'),
    applicationDate: new Date('2024-12-15'),
    expectedDecisionDate: new Date('2025-04-15'),
    artifacts: ['art-1'],
    requirements: 'Detailed technical specifications, community impact metrics',
    competition: 'Medium - 3-4 similar projects applying',
    budgetBreakdown: 'Development: $100K, Community engagement: $30K, Operations: $20K',
    successCriteria: 'Platform launch with 5+ communities, 1000+ stories shared',
    riskAssessment: 'Low technical risk, medium adoption risk',
    notes: 'Strong relationship with program officer',
    lastModified: new Date('2025-01-20')
  },
  {
    id: 'opp-2',
    name: 'Mozilla Foundation Open Source Support',
    organization: 'Mozilla Foundation',
    stage: OpportunityStage.DISCOVERY,
    amount: 75000,
    probability: 40,
    weightedValue: 30000,
    type: OpportunityType.GRANT,
    description: 'Support for open source community tools',
    relatedProjects: ['1'],
    primaryContact: 'Alex Chen',
    decisionMakers: ['Alex Chen'],
    nextAction: 'Schedule discovery call',
    nextActionDate: new Date('2025-02-05'),
    artifacts: [],
    requirements: 'Open source commitment, community governance model',
    competition: 'High - many open source projects',
    budgetBreakdown: 'TBD',
    successCriteria: 'TBD',
    riskAssessment: 'Medium - competitive process',
    notes: 'Initial interest expressed',
    lastModified: new Date('2025-01-18')
  },
  {
    id: 'opp-3',
    name: 'USDA Rural Cooperative Development Grant',
    organization: 'USDA Rural Development',
    stage: OpportunityStage.QUALIFICATION,
    amount: 250000,
    probability: 60,
    weightedValue: 150000,
    type: OpportunityType.GRANT,
    description: 'Federal grant for rural cooperative business development',
    relatedProjects: ['2'],
    primaryContact: 'Susan Williams',
    decisionMakers: ['Susan Williams', 'Mark Davis'],
    nextAction: 'Submit eligibility documentation',
    nextActionDate: new Date('2025-02-10'),
    deadline: new Date('2025-04-30'),
    artifacts: ['art-3'],
    requirements: 'Rural focus, cooperative structure, job creation metrics',
    competition: 'Medium - regional competition',
    budgetBreakdown: 'Program development: $150K, Technical assistance: $75K, Admin: $25K',
    successCriteria: '10 new cooperatives formed, 50 jobs created',
    riskAssessment: 'Low - good fit for program',
    notes: 'Pre-application feedback was positive',
    lastModified: new Date('2025-01-19')
  }
];

// Mock Organizations
export const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Knight Foundation',
    type: OrganizationType.FOUNDATION,
    sector: ['Media', 'Technology', 'Community'],
    size: OrganizationSize.LARGE,
    location: 'Miami, FL',
    website: 'https://knightfoundation.org',
    description: 'Foundation supporting journalism, media innovation, and community engagement',
    relationshipStatus: RelationshipStatus.ACTIVE,
    partnershipType: ['Funder', 'Strategic Partner'],
    keyContacts: ['person-1'],
    activeOpportunities: ['opp-1'],
    relatedProjects: ['1'],
    sharedArtifacts: ['art-1'],
    annualBudget: 100000000,
    fundingCapacity: FundingCapacity.VERY_HIGH,
    decisionTimeline: DecisionTimeline.MEDIUM,
    valuesAlignment: AlignmentLevel.HIGH,
    strategicPriority: PriorityLevel.HIGH,
    lastContactDate: new Date('2025-01-15'),
    nextContactDate: new Date('2025-02-15'),
    notes: 'Strong relationship, multiple successful grants',
    lastModified: new Date('2025-01-20')
  },
  {
    id: 'org-2',
    name: 'National Cooperative Business Association',
    type: OrganizationType.NONPROFIT,
    sector: ['Cooperative Development', 'Business'],
    size: OrganizationSize.MEDIUM,
    location: 'Washington, DC',
    website: 'https://ncba.coop',
    description: 'Trade association for cooperative businesses',
    relationshipStatus: RelationshipStatus.PARTNER,
    partnershipType: ['Strategic Partner', 'Network Member'],
    keyContacts: ['person-2'],
    activeOpportunities: [],
    relatedProjects: ['2'],
    sharedArtifacts: ['art-3'],
    fundingCapacity: FundingCapacity.MEDIUM,
    decisionTimeline: DecisionTimeline.FAST,
    valuesAlignment: AlignmentLevel.VERY_HIGH,
    strategicPriority: PriorityLevel.HIGH,
    lastContactDate: new Date('2025-01-10'),
    nextContactDate: new Date('2025-03-01'),
    notes: 'Long-term strategic partner',
    lastModified: new Date('2025-01-18')
  }
];

// Mock People
export const mockPeople: Person[] = [
  {
    id: 'person-1',
    fullName: 'Jennifer Smith',
    roleTitle: 'Program Officer',
    organization: 'Knight Foundation',
    email: 'j.smith@knightfoundation.org',
    phone: '+1-305-555-0123',
    linkedin: 'https://linkedin.com/in/jennifersmith',
    location: 'Miami, FL',
    relationshipType: RelationshipType.FUNDER,
    influenceLevel: InfluenceLevel.DECISION_MAKER,
    communicationPreference: CommunicationPreference.EMAIL,
    relatedOpportunities: ['opp-1'],
    relatedProjects: ['1'],
    sharedArtifacts: ['art-1'],
    interests: ['Media innovation', 'Community storytelling'],
    expertise: ['Grant making', 'Media technology', 'Community engagement'],
    lastContactDate: new Date('2025-01-15'),
    nextContactDate: new Date('2025-02-15'),
    contactFrequency: ContactFrequency.MONTHLY,
    relationshipStrength: RelationshipStrength.STRONG,
    notes: 'Very supportive of our storytelling work',
    personalInterests: 'Photography, hiking',
    lastModified: new Date('2025-01-20')
  },
  {
    id: 'person-2',
    fullName: 'David Kim',
    roleTitle: 'Director of Cooperative Development',
    organization: 'National Cooperative Business Association',
    email: 'd.kim@ncba.coop',
    phone: '+1-202-555-0456',
    linkedin: 'https://linkedin.com/in/davidkim-coop',
    location: 'Washington, DC',
    relationshipType: RelationshipType.PARTNER,
    influenceLevel: InfluenceLevel.HIGH,
    communicationPreference: CommunicationPreference.PHONE,
    relatedOpportunities: ['opp-3'],
    relatedProjects: ['2'],
    sharedArtifacts: ['art-3'],
    interests: ['Cooperative economics', 'Rural development'],
    expertise: ['Cooperative development', 'Business planning', 'Rural economics'],
    lastContactDate: new Date('2025-01-10'),
    nextContactDate: new Date('2025-03-01'),
    contactFrequency: ContactFrequency.QUARTERLY,
    relationshipStrength: RelationshipStrength.VERY_STRONG,
    notes: 'Key strategic partner for cooperative work',
    personalInterests: 'Sustainable agriculture, cycling',
    lastModified: new Date('2025-01-18')
  }
];

// Mock Artifacts
export const mockArtifacts: Artifact[] = [
  {
    id: 'art-1',
    name: 'Storytelling Platform Proposal',
    type: ArtifactType.PROPOSAL,
    format: ArtifactFormat.PDF,
    status: ArtifactStatus.APPROVED,
    relatedOpportunities: ['opp-1'],
    relatedProjects: ['1'],
    relatedOrganizations: ['org-1'],
    relatedPeople: ['person-1'],
    fileUrl: 'https://docs.act.community/storytelling-proposal.pdf',
    description: 'Comprehensive proposal for community storytelling platform',
    audience: ['Funders', 'Partners'],
    purpose: ArtifactPurpose.FUNDER,
    version: 2,
    createdBy: 'Sarah Johnson',
    approvedBy: 'Maria Gonzalez',
    reviewDate: new Date('2025-01-10'),
    accessLevel: AccessLevel.RESTRICTED,
    tags: ['proposal', 'storytelling', 'knight'],
    usageNotes: 'Use for Knight Foundation and similar media-focused funders',
    lastModified: new Date('2025-01-15')
  },
  {
    id: 'art-2',
    name: 'Community Impact Report 2024',
    type: ArtifactType.REPORT,
    format: ArtifactFormat.PDF,
    status: ArtifactStatus.PUBLISHED,
    relatedOpportunities: [],
    relatedProjects: ['1', '2', '3'],
    relatedOrganizations: ['org-1', 'org-2'],
    relatedPeople: [],
    fileUrl: 'https://docs.act.community/impact-report-2024.pdf',
    description: 'Annual report showcasing community impact across all projects',
    audience: ['Public', 'Funders', 'Partners'],
    purpose: ArtifactPurpose.PUBLIC,
    version: 1,
    createdBy: 'Ana Rodriguez',
    approvedBy: 'Sarah Johnson',
    reviewDate: new Date('2024-12-15'),
    accessLevel: AccessLevel.PUBLIC,
    tags: ['report', 'impact', 'annual'],
    usageNotes: 'Share widely for transparency and accountability',
    lastModified: new Date('2024-12-20')
  }
];

// Utility functions to get mock data
export function getMockProjects(): Project[] {
  return [...mockProjects];
}

export function getMockOpportunities(): Opportunity[] {
  return [...mockOpportunities];
}

export function getMockOrganizations(): Organization[] {
  return [...mockOrganizations];
}

export function getMockPeople(): Person[] {
  return [...mockPeople];
}

export function getMockArtifacts(): Artifact[] {
  return [...mockArtifacts];
}

// Get mock data by ID
export function getMockProjectById(id: string): Project | undefined {
  return mockProjects.find(p => p.id === id);
}

export function getMockOpportunityById(id: string): Opportunity | undefined {
  return mockOpportunities.find(o => o.id === id);
}

export function getMockOrganizationById(id: string): Organization | undefined {
  return mockOrganizations.find(o => o.id === id);
}

export function getMockPersonById(id: string): Person | undefined {
  return mockPeople.find(p => p.id === id);
}

export function getMockArtifactById(id: string): Artifact | undefined {
  return mockArtifacts.find(a => a.id === id);
}

// Generate additional mock data for testing
export function generateMockProjects(count: number): Project[] {
  const areas = Object.values(ProjectArea);
  const statuses = Object.values(ProjectStatus);
  const places = Object.values(ProjectPlace);
  
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-project-${i + 1}`,
    name: `Mock Project ${i + 1}`,
    area: areas[i % areas.length],
    status: statuses[i % statuses.length],
    description: `Description for mock project ${i + 1}`,
    lead: `Lead ${i + 1}`,
    teamMembers: [`Lead ${i + 1}`, `Member ${i + 1}A`, `Member ${i + 1}B`],
    coreValues: 'Mock values',
    themes: [`Theme ${i + 1}A`, `Theme ${i + 1}B`],
    tags: [`tag${i + 1}`, 'mock'],
    place: places[i % places.length],
    location: `Location ${i + 1}`,
    state: 'Mock State',
    revenueActual: Math.floor(Math.random() * 100000),
    revenuePotential: Math.floor(Math.random() * 200000) + 100000,
    actualIncoming: Math.floor(Math.random() * 50000),
    potentialIncoming: Math.floor(Math.random() * 100000),
    nextMilestone: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
    startDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    relatedOpportunities: [],
    partnerOrganizations: [],
    artifacts: [],
    websiteLinks: `https://mock-project-${i + 1}.example.com`,
    lastModified: new Date()
  }));
}