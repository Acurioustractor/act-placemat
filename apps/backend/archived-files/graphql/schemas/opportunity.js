/**
 * Opportunity GraphQL Schema
 * Handles opportunities, grants, funding, jobs, and collaborative opportunities
 */

import { gql } from 'graphql-tag';

export const opportunitySchema = gql`
  extend type Query {
    # Opportunity queries
    opportunity(id: ID!): Opportunity
    opportunities(
      limit: Int
      offset: Int
      filters: OpportunityFiltersInput
    ): OpportunityConnection!

    # Discovery and search
    discoverOpportunities(
      input: OpportunityDiscoveryInput!
    ): OpportunityDiscoveryResult!
    searchOpportunities(query: String!, limit: Int): [Opportunity!]!

    # Recommendations
    recommendedOpportunities(
      userId: ID
      organisationId: ID
      limit: Int
    ): [Opportunity!]!

    # Category queries
    opportunityCategories: [OpportunityCategory!]!
    fundingOpportunities(
      amount: MoneyRangeInput
      type: FundingType
      eligibility: [String!]
    ): [FundingOpportunity!]!

    # Application tracking
    myApplications(status: ApplicationStatus): [OpportunityApplication!]!
    applicationsByOpportunity(opportunityId: ID!): [OpportunityApplication!]!

    # Analytics
    opportunityTrends: OpportunityTrendAnalysis!
    opportunityMetrics(organisationId: ID): OpportunityMetrics!
  }

  extend type Mutation {
    # Opportunity management
    createOpportunity(input: CreateOpportunityInput!): Opportunity!
    updateOpportunity(id: ID!, input: UpdateOpportunityInput!): Opportunity!
    publishOpportunity(id: ID!): Opportunity!
    closeOpportunity(id: ID!, reason: String): Opportunity!

    # Application management
    applyForOpportunity(
      opportunityId: ID!
      input: OpportunityApplicationInput!
    ): OpportunityApplication!
    updateApplication(id: ID!, input: UpdateApplicationInput!): OpportunityApplication!
    withdrawApplication(id: ID!, reason: String): OpportunityApplication!

    # Review and evaluation
    reviewApplication(id: ID!, input: ApplicationReviewInput!): OpportunityApplication!
    bulkReviewApplications(
      opportunityId: ID!
      input: BulkReviewInput!
    ): [OpportunityApplication!]!

    # Watchlist and notifications
    watchOpportunity(opportunityId: ID!): OpportunityWatch!
    unwatchOpportunity(opportunityId: ID!): Boolean!
    createOpportunityAlert(input: OpportunityAlertInput!): OpportunityAlert!

    # Collaboration
    proposeCollaboration(
      opportunityId: ID!
      input: CollaborationProposalInput!
    ): CollaborationProposal!
    respondToCollaboration(
      id: ID!
      response: CollaborationResponse!
    ): CollaborationProposal!
  }

  extend type Subscription {
    opportunityPublished(categories: [String!]): Opportunity!
    applicationStatusChanged(userId: ID): OpportunityApplication!
    opportunityDeadlineApproaching(userId: ID): Opportunity!
    newCollaborationProposal(userId: ID): CollaborationProposal!
  }

  # Core Opportunity Types
  type Opportunity {
    id: ID!
    title: String!
    description: String!
    type: OpportunityType!
    status: OpportunityStatus!

    # Publisher information
    publisher: Organisation!
    contactPerson: User!

    # Categorisation
    category: OpportunityCategory!
    subcategories: [String!]!
    tags: [String!]!
    sectors: [Sector!]!
    focusAreas: [FocusArea!]!

    # Timing and deadlines
    publishedDate: DateTime!
    applicationDeadline: DateTime
    startDate: DateTime
    endDate: DateTime
    duration: String

    # Eligibility and requirements
    eligibility: OpportunityEligibility!
    requirements: [Requirement!]!
    skills: [Skill!]!
    experience: ExperienceLevel!

    # Location and delivery
    location: OpportunityLocation!
    remote: Boolean!
    travel: Boolean!
    travelRequirements: String

    # Financial details
    funding: OpportunityFunding
    compensation: OpportunityCompensation
    budget: OpportunityBudget

    # Cultural considerations
    culturalRequirements: [String!]!
    culturalContext: OpportunityCulturalContext
    culturalSafetyScore: Float!
    indigenousFocused: Boolean!
    culturalProtocols: [CulturalProtocol!]!

    # Application process
    applicationProcess: ApplicationProcess!
    selectionCriteria: [SelectionCriterion!]!
    evaluationProcess: EvaluationProcess!

    # Capacity and limits
    maxApplicants: Int
    currentApplications: Int!
    spotsAvailable: Int
    teamSize: TeamSizeRange

    # Collaboration
    collaborationWelcome: Boolean!
    partnershipOpportunities: [String!]!

    # Resources and support
    resources: [OpportunityResource!]!
    mentorship: Boolean!
    training: Boolean!
    support: [SupportType!]!

    # Impact and outcomes
    expectedOutcomes: [String!]!
    impactAreas: [ImpactArea!]!
    successMetrics: [SuccessMetric!]!

    # Applications and selection
    applications: [OpportunityApplication!]!
    selectedApplicants: [User!]!
    waitlist: [User!]!

    # Engagement
    views: Int!
    watchers: [User!]!
    watchCount: Int!

    # Related opportunities
    relatedOpportunities: [Opportunity!]!

    # Metadata
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type OpportunityCategory {
    id: ID!
    name: String!
    description: String!
    icon: String
    colour: String

    # Hierarchy
    parentCategory: OpportunityCategory
    subcategories: [OpportunityCategory!]!

    # Metadata
    opportunityCount: Int!
    trending: Boolean!
  }

  type FundingOpportunity {
    id: ID!
    opportunity: Opportunity!

    # Funding specifics
    fundingAmount: Money!
    fundingType: FundingType!
    fundingBody: FundingBody!
    grantProgram: String

    # Application specifics
    applicationFee: Money
    multiStageProcess: Boolean!
    stages: [FundingStage!]!

    # Eligibility
    eligibleEntities: [EligibleEntityType!]!
    geographicRestrictions: [String!]!
    sectorRestrictions: [String!]!

    # Requirements
    matchingFunds: Boolean!
    matchingPercentage: Float
    reportingRequirements: [ReportingRequirement!]!

    # Success rates
    competitiveness: CompetitivenessLevel!
    successRate: Float
    averageAwardAmount: Money

    # Previous awards
    previousRecipients: [FundingRecipient!]!
    successStories: [SuccessStory!]!
  }

  type OpportunityApplication {
    id: ID!
    opportunity: Opportunity!
    applicant: ApplicationApplicant!
    status: ApplicationStatus!

    # Application content
    responses: [ApplicationResponse!]!
    documents: [ApplicationDocument!]!
    references: [ApplicationReference!]!

    # Team and collaboration
    team: [TeamMember!]!
    collaborators: [Organisation!]!

    # Proposal details
    proposal: ApplicationProposal
    budget: ApplicationBudget
    timeline: ApplicationTimeline!

    # Cultural considerations
    culturalApproach: String
    culturalSafety: ApplicationCulturalSafety!
    communityEngagement: CommunityEngagementPlan

    # Review and evaluation
    reviews: [ApplicationReview!]!
    scores: [ApplicationScore!]!
    overallScore: Float
    ranking: Int

    # Communication
    messages: [ApplicationMessage!]!
    interviews: [Interview!]!

    # Status tracking
    submittedAt: DateTime!
    reviewedAt: DateTime
    decisionDate: DateTime
    feedback: String

    # Metadata
    createdBy: User!
    updatedAt: DateTime!
  }

  type OpportunityDiscoveryResult {
    opportunities: [Opportunity!]!
    totalCount: Int!

    # Categorised results
    funding: [FundingOpportunity!]!
    jobs: [JobOpportunity!]!
    partnerships: [PartnershipOpportunity!]!
    events: [Event!]!

    # Filtering and facets
    categories: [CategoryFacet!]!
    locations: [LocationFacet!]!
    fundingRanges: [FundingRangeFacet!]!
    deadlines: [DeadlineFacet!]!

    # Recommendations
    recommended: [Opportunity!]!
    trending: [Opportunity!]!
    closing: [Opportunity!]!

    # Search metadata
    searchTime: Int!
    filters: OpportunityFilters!
  }

  type CollaborationProposal {
    id: ID!
    opportunity: Opportunity!
    proposer: Organisation!
    target: Organisation!

    # Proposal details
    title: String!
    description: String!
    type: CollaborationType!

    # Collaboration terms
    roles: [CollaborationRole!]!
    contributions: [Contribution!]!
    resourceSharing: [ResourceShare!]!

    # Management
    status: CollaborationStatus!
    response: String

    # Timeline
    proposedAt: DateTime!
    respondedAt: DateTime

    createdBy: User!
  }

  # Supporting Types
  type OpportunityEligibility {
    organisationTypes: [OrganisationType!]!
    geographicRestrictions: [String!]!
    sectorRequirements: [String!]!
    minimumExperience: Int
    maximumTeamSize: Int
    culturalRequirements: [String!]!
    otherCriteria: [String!]!
  }

  type OpportunityLocation {
    type: LocationType!
    specific: String
    regions: [String!]!
    states: [String!]!
    countries: [String!]!
    remote: Boolean!
    hybrid: Boolean!
    travelRequired: Boolean!
  }

  type OpportunityFunding {
    amount: Money!
    type: FundingType!
    paymentSchedule: PaymentSchedule!
    conditions: [String!]!
    matchingRequired: Boolean!
    matchingPercentage: Float
  }

  type OpportunityCompensation {
    type: CompensationType!
    amount: Money
    range: MoneyRange
    currency: String!
    benefits: [Benefit!]!
    equity: Boolean!
    equityPercentage: Float
  }

  type ApplicationProcess {
    stages: [ApplicationStage!]!
    timeline: ProcessTimeline!
    requirements: [ProcessRequirement!]!
    selectionProcess: SelectionProcess!
    notificationProcess: NotificationProcess!
  }

  type ApplicationStage {
    id: ID!
    name: String!
    description: String!
    order: Int!
    deadline: DateTime
    requirements: [StageRequirement!]!
    optional: Boolean!
  }

  type OpportunityWatch {
    id: ID!
    user: User!
    opportunity: Opportunity!
    notifications: NotificationPreferences!
    createdAt: DateTime!
  }

  type OpportunityAlert {
    id: ID!
    user: User!
    name: String!
    criteria: AlertCriteria!
    notifications: NotificationPreferences!
    active: Boolean!
    lastTriggered: DateTime
    createdAt: DateTime!
  }

  type OpportunityTrendAnalysis {
    totalOpportunities: Int!
    newThisMonth: Int!
    trending: [TrendingOpportunity!]!
    popularCategories: [CategoryTrend!]!
    fundingTrends: [FundingTrend!]!
    locationTrends: [LocationTrend!]!
    insights: [TrendInsight!]!
    generatedAt: DateTime!
  }

  type OpportunityMetrics {
    organisationId: ID

    # Publication metrics
    opportunitiesPublished: Int!
    applicationsReceived: Int!
    successfulMatches: Int!

    # Application metrics
    applicationsSubmitted: Int!
    successfulApplications: Int!
    successRate: Float!

    # Engagement metrics
    opportunitiesWatched: Int!
    collaborationsProposed: Int!
    partnershipsFormed: Int!

    # Financial metrics
    totalFundingReceived: Money!
    averageFundingAmount: Money!

    period: ReportPeriod!
    calculatedAt: DateTime!
  }

  # Connection Types
  type OpportunityConnection {
    edges: [OpportunityEdge!]!
    nodes: [Opportunity!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type OpportunityEdge {
    node: Opportunity!
    cursor: String!
  }

  # Input Types
  input CreateOpportunityInput {
    title: String!
    description: String!
    type: OpportunityType!
    categoryId: ID!
    subcategories: [String!]
    tags: [String!]

    # Timing
    applicationDeadline: DateTime
    startDate: DateTime
    endDate: DateTime

    # Eligibility
    eligibility: OpportunityEligibilityInput!
    requirements: [RequirementInput!]!

    # Location
    location: OpportunityLocationInput!

    # Financial
    funding: OpportunityFundingInput
    compensation: OpportunityCompensationInput

    # Cultural
    culturalRequirements: [String!]
    indigenousFocused: Boolean

    # Process
    applicationProcess: ApplicationProcessInput!
    maxApplicants: Int

    # Support
    mentorship: Boolean
    training: Boolean
    support: [SupportType!]
  }

  input UpdateOpportunityInput {
    title: String
    description: String
    applicationDeadline: DateTime
    status: OpportunityStatus
    maxApplicants: Int
  }

  input OpportunityFiltersInput {
    type: OpportunityType
    status: OpportunityStatus
    category: ID
    location: String
    fundingRange: MoneyRangeInput
    deadline: DateRangeInput
    remote: Boolean
    indigenousFocused: Boolean
    tags: [String!]
  }

  input OpportunityDiscoveryInput {
    query: String
    filters: OpportunityFiltersInput
    location: String
    interests: [String!]
    skills: [String!]
    experience: ExperienceLevel
    availableFrom: DateTime
    duration: String
    remote: Boolean
    limit: Int
  }

  input OpportunityApplicationInput {
    responses: [ApplicationResponseInput!]!
    documents: [ApplicationDocumentInput!]!
    team: [TeamMemberInput!]
    proposal: ApplicationProposalInput
    budget: ApplicationBudgetInput
    culturalApproach: String
  }

  input ApplicationReviewInput {
    score: Float!
    feedback: String!
    recommendation: ReviewRecommendation!
    culturalSafetyAssessment: String
  }

  input OpportunityAlertInput {
    name: String!
    criteria: AlertCriteriaInput!
    notifications: NotificationPreferencesInput!
  }

  input CollaborationProposalInput {
    title: String!
    description: String!
    type: CollaborationType!
    targetOrganisationId: ID!
    roles: [CollaborationRoleInput!]!
  }

  # Enums
  enum OpportunityType {
    FUNDING
    GRANT
    JOB
    VOLUNTEER
    PARTNERSHIP
    COLLABORATION
    MENTORSHIP
    TRAINING
    CONSULTATION
    PROJECT
    EVENT
    AWARD
    SCHOLARSHIP
    RESIDENCY
    COMMISSIONING
  }

  enum OpportunityStatus {
    DRAFT
    PUBLISHED
    APPLICATIONS_OPEN
    APPLICATIONS_CLOSED
    UNDER_REVIEW
    SELECTIONS_MADE
    COMPLETED
    CANCELLED
    EXPIRED
  }

  enum ApplicationStatus {
    DRAFT
    SUBMITTED
    UNDER_REVIEW
    SHORTLISTED
    INTERVIEWED
    SELECTED
    WAITLISTED
    REJECTED
    WITHDRAWN
  }

  enum FundingType {
    GRANT
    LOAN
    INVESTMENT
    SPONSORSHIP
    PRIZE
    SCHOLARSHIP
    COMMISSION
  }

  enum CompensationType {
    SALARY
    HOURLY
    PROJECT_FEE
    COMMISSION
    EQUITY
    VOLUNTEER
    STIPEND
  }

  enum CompetitivenessLevel {
    LOW
    MEDIUM
    HIGH
    EXTREMELY_HIGH
  }

  enum CollaborationType {
    JOINT_PROJECT
    RESOURCE_SHARING
    KNOWLEDGE_EXCHANGE
    MENTORSHIP
    STRATEGIC_PARTNERSHIP
    FUNDING_COLLABORATION
  }

  enum CollaborationStatus {
    PROPOSED
    UNDER_CONSIDERATION
    ACCEPTED
    REJECTED
    COUNTER_PROPOSED
  }

  enum CollaborationResponse {
    ACCEPT
    REJECT
    COUNTER_PROPOSE
    REQUEST_MEETING
  }

  enum ReviewRecommendation {
    STRONGLY_RECOMMEND
    RECOMMEND
    NEUTRAL
    NOT_RECOMMEND
    STRONGLY_REJECT
  }

  enum ExperienceLevel {
    ENTRY_LEVEL
    JUNIOR
    INTERMEDIATE
    SENIOR
    EXPERT
    ANY
  }

  enum EligibleEntityType {
    INDIVIDUAL
    ORGANISATION
    PARTNERSHIP
    COMMUNITY_GROUP
    INDIGENOUS_ORGANISATION
    GOVERNMENT
    ACADEMIC_INSTITUTION
  }

  enum SupportType {
    MENTORSHIP
    TRAINING
    RESOURCES
    NETWORKING
    TECHNICAL_SUPPORT
    FINANCIAL_PLANNING
    CULTURAL_SUPPORT
  }
`;

export default opportunitySchema;
