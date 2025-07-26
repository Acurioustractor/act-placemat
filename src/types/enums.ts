// Core enums for the ACT Placemat application

export enum ProjectArea {
  STORY_SOVEREIGNTY = 'Story & Sovereignty',
  ECONOMIC_FREEDOM = 'Economic Freedom',
  COMMUNITY_ENGAGEMENT = 'Community Engagement',
  OPERATIONS_INFRASTRUCTURE = 'Operations & Infrastructure',
  RESEARCH_DEVELOPMENT = 'Research & Development'
}

export enum ProjectStatus {
  ACTIVE = 'Active 🔥',
  IDEATION = 'Ideation 🌀',
  SUNSETTING = 'Sunsetting 🌅',
  TRANSFERRED = 'Transferred ✅'
}

export enum ProjectPlace {
  COMMUNITY = 'Community',
  REGIONAL = 'Regional',
  NATIONAL = 'National',
  INTERNATIONAL = 'International'
}

export enum OpportunityStage {
  DISCOVERY = 'Discovery 🔍',
  QUALIFICATION = 'Qualification 📋',
  PROPOSAL = 'Proposal 📄',
  NEGOTIATION = 'Negotiation 🤝',
  CLOSED_WON = 'Closed Won ✅',
  CLOSED_LOST = 'Closed Lost ❌'
}

export enum OpportunityType {
  GRANT = 'Grant',
  CONTRACT = 'Contract',
  PARTNERSHIP = 'Partnership',
  INVESTMENT = 'Investment',
  DONATION = 'Donation',
  REVENUE_SHARE = 'Revenue Share'
}

export enum OrganizationType {
  NONPROFIT = 'Nonprofit',
  GOVERNMENT = 'Government',
  FOUNDATION = 'Foundation',
  CORPORATION = 'Corporation',
  COOPERATIVE = 'Cooperative',
  COMMUNITY_GROUP = 'Community Group',
  ACADEMIC = 'Academic',
  TRIBAL = 'Tribal'
}

export enum OrganizationSize {
  SMALL = 'Small (1-50)',
  MEDIUM = 'Medium (51-200)',
  LARGE = 'Large (201-1000)',
  ENTERPRISE = 'Enterprise (1000+)'
}

export enum RelationshipStatus {
  PROSPECT = 'Prospect',
  ACTIVE = 'Active',
  PARTNER = 'Partner',
  INACTIVE = 'Inactive',
  CLOSED = 'Closed'
}

export enum FundingCapacity {
  LOW = 'Low (<$10K)',
  MEDIUM = 'Medium ($10K-$100K)',
  HIGH = 'High ($100K-$1M)',
  VERY_HIGH = 'Very High ($1M+)'
}

export enum DecisionTimeline {
  FAST = 'Fast (1-3 months)',
  MEDIUM = 'Medium (3-6 months)',
  SLOW = 'Slow (6-12 months)',
  VERY_SLOW = 'Very Slow (12+ months)'
}

export enum AlignmentLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  VERY_HIGH = 'Very High'
}

export enum PriorityLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum RelationshipType {
  COLLEAGUE = 'Colleague',
  PARTNER = 'Partner',
  CLIENT = 'Client',
  FUNDER = 'Funder',
  MENTOR = 'Mentor',
  COMMUNITY_MEMBER = 'Community Member'
}

export enum InfluenceLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  DECISION_MAKER = 'Decision Maker'
}

export enum CommunicationPreference {
  EMAIL = 'Email',
  PHONE = 'Phone',
  TEXT = 'Text',
  SLACK = 'Slack',
  IN_PERSON = 'In Person',
  VIDEO_CALL = 'Video Call'
}

export enum ContactFrequency {
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly',
  ANNUALLY = 'Annually',
  AS_NEEDED = 'As Needed'
}

export enum RelationshipStrength {
  WEAK = 'Weak',
  MODERATE = 'Moderate',
  STRONG = 'Strong',
  VERY_STRONG = 'Very Strong'
}

export enum ArtifactType {
  PROPOSAL = 'Proposal',
  REPORT = 'Report',
  PRESENTATION = 'Presentation',
  CONTRACT = 'Contract',
  MARKETING = 'Marketing Material',
  RESEARCH = 'Research',
  TEMPLATE = 'Template',
  MEDIA = 'Media'
}

export enum ArtifactFormat {
  PDF = 'PDF',
  DOC = 'Document',
  SLIDE = 'Slides',
  SPREADSHEET = 'Spreadsheet',
  IMAGE = 'Image',
  VIDEO = 'Video',
  AUDIO = 'Audio',
  WEB = 'Web Link'
}

export enum ArtifactStatus {
  DRAFT = 'Draft',
  REVIEW = 'In Review',
  APPROVED = 'Approved',
  PUBLISHED = 'Published',
  ARCHIVED = 'Archived'
}

export enum ArtifactPurpose {
  INTERNAL = 'Internal Use',
  CLIENT = 'Client Facing',
  PUBLIC = 'Public',
  FUNDER = 'Funder Specific',
  MARKETING = 'Marketing',
  LEGAL = 'Legal'
}

export enum AccessLevel {
  PUBLIC = 'Public',
  INTERNAL = 'Internal',
  RESTRICTED = 'Restricted',
  CONFIDENTIAL = 'Confidential'
}