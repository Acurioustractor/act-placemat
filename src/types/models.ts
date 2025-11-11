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
  partnerOrganizations: string[];
  artifacts: string[];
  websiteLinks: string;
  lastModified: Date;

  // ============================================
  // WORLD-CLASS SHOWCASE FIELDS (2025)
  // ============================================

  // Hero Media
  heroVideoUrl?: string;           // YouTube/Vimeo embed URL
  heroImageUrl?: string;            // Main project hero image
  heroCaption?: string;             // Caption for hero media

  // Photo Gallery
  galleryImages?: string[];         // Array of image URLs
  galleryVideos?: string[];         // Array of video URLs

  // Storytelling Structure
  challengeDescription?: string;    // The problem we're solving
  solutionDescription?: string;     // How we're solving it
  processDescription?: string;      // Our approach and methodology

  // Impact Metrics (for big number displays)
  impactStats?: ProjectImpactStats; // Structured impact data
  impactSummary?: string;           // Rich text impact summary

  // Testimonials
  testimonials?: ProjectTestimonial[]; // Array of testimonials

  // Call-to-Action
  ctaLink?: string;                 // Primary CTA link (donate, partner, etc.)
  ctaText?: string;                 // CTA button text
  ctaType?: 'donate' | 'partner' | 'volunteer' | 'learn' | 'contact';

  // SEO & Sharing
  slug?: string;                    // URL-friendly slug for individual pages
  metaDescription?: string;         // SEO meta description
  socialImageUrl?: string;          // Open Graph image for social sharing

  // Geographic Data (for interactive map)
  coordinates?: {                   // Lat/long for map pins
    latitude: number;
    longitude: number;
  };

  // Media Attribution
  photographyCredit?: string;       // Photo credit
  videographyCredit?: string;       // Video credit

  // Visibility Controls
  featuredOnHomepage?: boolean;     // Show in featured carousel
  publiclyVisible?: boolean;        // Show on public showcase
  displayOrder?: number;            // Manual ordering
}

// New interface for structured impact stats
export interface ProjectImpactStats {
  peopleServed?: number;
  locationsReached?: number;
  partnersInvolved?: number;
  successRate?: number;             // Percentage (0-100)
  fundingRaised?: number;
  hoursDelivered?: number;
  customMetrics?: {                 // Flexible custom metrics
    label: string;
    value: number | string;
    unit?: string;
  }[];
}

// New interface for testimonials
export interface ProjectTestimonial {
  quote: string;
  authorName: string;
  authorRole?: string;
  authorPhotoUrl?: string;
  authorOrganization?: string;
  featured?: boolean;               // Highlight this testimonial
}

export interface Opportunity {
  id: string;
  name: string;
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
  artifacts: string[];
  requirements: string;
  competition: string;
  budgetBreakdown: string;
  successCriteria: string;
  riskAssessment: string;
  notes: string;
  lastModified: Date;
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
}