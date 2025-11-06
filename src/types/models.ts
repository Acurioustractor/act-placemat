// Core data models for the ACT Placemat application

import {
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
} from './enums';

export interface Project {
  id: string;
  name: string;
  area: ProjectArea;
  status: ProjectStatus;
  description: string;
  aiSummary?: string;
  lead: string;
  teamMembers: string[];
  people?: string[];
  coreValues: string;
  themes: string[];
  tags: string[];
  place: ProjectPlace;
  location: string;
  state: string;
  revenueActual: number;
  revenuePotential: number;
  actualIncoming: number;
  potentialIncoming: number;
  nextMilestone?: Date;
  startDate?: Date;
  endDate?: Date;
  relatedOpportunities: string[];
  relatedProjects?: string[];
  partnerOrganizations: string[];
  artifacts: string[];
  websiteLinks: string;
  lastModified: Date;
  [key: string]: unknown;
}

export interface Opportunity {
  id: string;
  name: string;
  title?: string;
  organization: string;
  stage: OpportunityStage;
  amount: number;
  probability: number;
  weightedValue: number;
  type: OpportunityType;
  description: string;
  relatedProjects: string[];
  primaryContact: string;
  decisionMakers: string[];
  nextAction: string;
  nextActionDate?: Date;
  deadline?: Date;
  applicationDate?: Date;
  expectedDecisionDate?: Date;
  createdDate?: Date;
  artifacts: string[];
  requirements: string;
  competition: string;
  budgetBreakdown: string;
  successCriteria: string;
  riskAssessment: string;
  notes: string;
  lastModified: Date;
  [key: string]: unknown;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  sector: string[];
  size: OrganizationSize;
  location: string;
  website: string;
  description: string;
  relationshipStatus: RelationshipStatus;
  partnershipType: string[];
  keyContacts: string[];
  people?: string[];
  activeOpportunities: string[];
  relatedProjects: string[];
  sharedArtifacts: string[];
  annualBudget?: number;
  fundingCapacity: FundingCapacity;
  decisionTimeline: DecisionTimeline;
  valuesAlignment: AlignmentLevel;
  strategicPriority: PriorityLevel;
  lastContactDate?: Date;
  nextContactDate?: Date;
  notes: string;
  lastModified: Date;
  [key: string]: unknown;
}

export interface Person {
  id: string;
  fullName: string;
  roleTitle: string;
  organization: string;
  email: string;
  phone: string;
  linkedin: string;
  location: string;
  relationshipType: RelationshipType;
  influenceLevel: InfluenceLevel;
  communicationPreference: CommunicationPreference;
  relatedOpportunities: string[];
  relatedProjects: string[];
  sharedArtifacts: string[];
  interests: string[];
  expertise: string[];
  lastContactDate?: Date;
  nextContactDate?: Date;
  contactFrequency: ContactFrequency;
  relationshipStrength: RelationshipStrength;
  notes: string;
  birthday?: Date;
  personalInterests: string;
  lastModified: Date;
  [key: string]: unknown;
}

export interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  format: ArtifactFormat;
  status: ArtifactStatus;
  relatedOpportunities: string[];
  relatedProjects: string[];
  relatedOrganizations: string[];
  relatedPeople: string[];
  fileUrl?: string;
  thumbnailUrl?: string;
  description: string;
  audience: string[];
  purpose: ArtifactPurpose;
  version: number;
  createdBy: string;
  approvedBy?: string;
  reviewDate?: Date;
  accessLevel: AccessLevel;
  tags: string[];
  usageNotes: string;
  lastModified: Date;
  [key: string]: unknown;
}