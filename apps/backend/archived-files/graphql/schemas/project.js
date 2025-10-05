/**
 * Project GraphQL Schema
 * Handles project management, collaboration, and impact tracking
 */

import { gql } from 'graphql-tag';

export const projectSchema = gql`
  extend type Query {
    # Project queries
    project(id: ID!): Project
    projects(
      limit: Int
      offset: Int
      status: ProjectStatus
      theme: String
      location: String
      organizationId: ID
      culturalSafety: Float
    ): ProjectConnection!

    projectsByUser(userId: ID!, limit: Int): [Project!]!
    projectsByOrganization(organizationId: ID!, limit: Int): [Project!]!
    featuredProjects(limit: Int): [Project!]!

    # Project components
    projectMilestones(projectId: ID!): [ProjectMilestone!]!
    projectTasks(projectId: ID!, status: TaskStatus): [ProjectTask!]!
    projectBudget(projectId: ID!): ProjectBudget
    projectImpact(projectId: ID!): ProjectImpactMetrics
    projectTimeline(projectId: ID!): ProjectTimeline!

    # Collaboration
    projectCollaborators(projectId: ID!): [ProjectCollaborator!]!
    projectDiscussions(projectId: ID!, limit: Int): [ProjectDiscussion!]!
    projectUpdates(projectId: ID!, limit: Int): [ProjectUpdate!]!
  }

  extend type Mutation {
    # Project management
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    archiveProject(id: ID!): Project!
    deleteProject(id: ID!): Boolean!
    duplicateProject(id: ID!, input: DuplicateProjectInput!): Project!

    # Project status
    updateProjectStatus(id: ID!, status: ProjectStatus!): Project!
    publishProject(id: ID!): Project!

    # Collaboration
    addCollaborator(projectId: ID!, input: AddCollaboratorInput!): ProjectCollaborator!
    updateCollaborator(
      projectId: ID!
      userId: ID!
      role: CollaboratorRole!
    ): ProjectCollaborator!
    removeCollaborator(projectId: ID!, userId: ID!): Boolean!

    # Project components
    createMilestone(input: CreateMilestoneInput!): ProjectMilestone!
    updateMilestone(id: ID!, input: UpdateMilestoneInput!): ProjectMilestone!
    completeMilestone(id: ID!): ProjectMilestone!

    createProjectTask(input: CreateProjectTaskInput!): ProjectTask!
    updateProjectTask(id: ID!, input: UpdateProjectTaskInput!): ProjectTask!
    completeProjectTask(id: ID!): ProjectTask!

    # Budget management
    updateProjectBudget(projectId: ID!, input: ProjectBudgetInput!): ProjectBudget!

    # Updates and discussions
    createProjectUpdate(input: CreateProjectUpdateInput!): ProjectUpdate!
    createProjectDiscussion(input: CreateProjectDiscussionInput!): ProjectDiscussion!

    # Impact tracking
    recordProjectImpact(
      projectId: ID!
      input: ProjectImpactInput!
    ): ProjectImpactMetrics!
  }

  extend type Subscription {
    projectUpdated(projectId: ID): Project!
    projectStatusChanged(projectId: ID): ProjectStatusUpdate!
    projectCollaboratorAdded(projectId: ID): ProjectCollaborator!
    projectMilestoneCompleted(projectId: ID): ProjectMilestone!
    projectDiscussionMessage(projectId: ID): ProjectDiscussion!
  }

  # Core Project Types
  type Project {
    id: ID!
    title: String!
    description: String!
    summary: String
    status: ProjectStatus!
    theme: ProjectTheme
    category: ProjectCategory!

    # Location and cultural context
    location: String
    region: String
    culturalContext: CulturalContext
    culturalSafetyScore: Float!

    # Relationships
    organization: Organization!
    owner: User!
    collaborators: [ProjectCollaborator!]!
    stories: [Story!]!

    # Project components
    milestones: [ProjectMilestone!]!
    tasks: [ProjectTask!]!
    budget: ProjectBudget
    timeline: ProjectTimeline!

    # Impact and outcomes
    impactMetrics: ProjectImpactMetrics
    outcomes: [ProjectOutcome!]!
    beneficiaries: ProjectBeneficiaries

    # Media and documentation
    images: [String!]!
    documents: [ProjectDocument!]!
    videos: [String!]!

    # Engagement
    updates: [ProjectUpdate!]!
    discussions: [ProjectDiscussion!]!
    tags: [String!]!

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
    startDate: DateTime
    endDate: DateTime
    publishedAt: DateTime

    # Visibility and permissions
    visibility: ProjectVisibility!
    isPublic: Boolean!
    isFeatured: Boolean!

    # Analytics
    viewCount: Int!
    shareCount: Int!
    collaboratorCount: Int!
  }

  type ProjectConnection {
    edges: [ProjectEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type ProjectEdge {
    cursor: String!
    node: Project!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type CulturalContext {
    indigenousLands: [String!]!
    culturalProtocols: [String!]!
    communityConsultation: Boolean!
    culturalSensitivity: CulturalSensitivityLevel!
    approvalRequired: Boolean!
    communityRepresentatives: [String!]!
  }

  type ProjectCollaborator {
    id: ID!
    project: Project!
    user: User!
    role: CollaboratorRole!
    permissions: [Permission!]!
    joinedAt: DateTime!
    contributionLevel: ContributionLevel!
    isActive: Boolean!
  }

  type ProjectMilestone {
    id: ID!
    project: Project!
    title: String!
    description: String!
    dueDate: DateTime
    completedAt: DateTime
    status: MilestoneStatus!
    progress: Float!
    assignee: User
    dependencies: [ProjectMilestone!]!

    # Cultural considerations
    culturalRequirements: [String!]!
    communityApproval: Boolean!

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProjectTask {
    id: ID!
    project: Project!
    milestone: ProjectMilestone
    title: String!
    description: String!
    status: TaskStatus!
    priority: TaskPriority!

    assignee: User
    dueDate: DateTime
    completedAt: DateTime
    estimatedHours: Float
    actualHours: Float

    dependencies: [ProjectTask!]!
    tags: [String!]!

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProjectBudget {
    id: ID!
    project: Project!
    totalBudget: Float!
    currency: String!

    # Budget breakdown
    categories: [BudgetCategory!]!
    allocations: [BudgetAllocation!]!
    expenses: [BudgetExpense!]!

    # Status
    spent: Float!
    remaining: Float!
    utilizationRate: Float!

    # Funding
    fundingSources: [FundingSource!]!
    grantApplications: [GrantApplication!]!

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type BudgetCategory {
    id: ID!
    name: String!
    allocatedAmount: Float!
    spentAmount: Float!
    description: String
  }

  type BudgetAllocation {
    id: ID!
    category: BudgetCategory!
    amount: Float!
    description: String!
    approvedBy: User
    approvedAt: DateTime
  }

  type BudgetExpense {
    id: ID!
    category: BudgetCategory!
    amount: Float!
    description: String!
    receipt: String
    approvedBy: User
    recordedAt: DateTime!
  }

  type FundingSource {
    id: ID!
    name: String!
    type: FundingType!
    amount: Float!
    status: FundingStatus!
    receivedAt: DateTime
    conditions: [String!]!
  }

  type GrantApplication {
    id: ID!
    grantName: String!
    organization: String!
    amount: Float!
    status: GrantStatus!
    appliedAt: DateTime!
    decisionDate: DateTime
    notes: String
  }

  type ProjectTimeline {
    id: ID!
    project: Project!
    phases: [TimelinePhase!]!
    totalDuration: Int! # in days
    startDate: DateTime!
    endDate: DateTime!
    currentPhase: TimelinePhase
  }

  type TimelinePhase {
    id: ID!
    name: String!
    description: String!
    startDate: DateTime!
    endDate: DateTime!
    status: PhaseStatus!
    milestones: [ProjectMilestone!]!
    dependencies: [TimelinePhase!]!
  }

  type ProjectImpactMetrics {
    id: ID!
    project: Project!

    # Quantitative metrics
    participantsReached: Int!
    communitiesEngaged: Int!
    resourcesGenerated: Int!

    # Qualitative metrics
    socialImpactScore: Float!
    environmentalImpactScore: Float!
    culturalImpactScore: Float!
    economicImpactScore: Float!

    # Long-term tracking
    sustainabilityScore: Float!
    replicabilityScore: Float!
    innovationScore: Float!

    # Community feedback
    communityFeedbackScore: Float!
    testimonials: [Testimonial!]!

    # Beautiful Obsolescence metrics
    systemsObsoleted: [String!]!
    alternativesCreated: [String!]!
    capacityBuilt: [String!]!

    measuredAt: DateTime!
    updatedAt: DateTime!
  }

  type ProjectOutcome {
    id: ID!
    project: Project!
    title: String!
    description: String!
    type: OutcomeType!
    measuredValue: Float
    targetValue: Float
    unit: String
    achievedAt: DateTime
    verified: Boolean!
    verifiedBy: User
    evidence: [String!]!
  }

  type ProjectBeneficiaries {
    id: ID!
    project: Project!
    directBeneficiaries: Int!
    indirectBeneficiaries: Int!
    demographics: Demographics!
    communityGroups: [CommunityGroup!]!
    feedbackCollected: Boolean!
    consentObtained: Boolean!
  }

  type Demographics {
    ageGroups: [AgeGroup!]!
    genderBreakdown: [GenderBreakdown!]!
    culturalGroups: [String!]!
    locationBreakdown: [LocationBreakdown!]!
  }

  type AgeGroup {
    range: String!
    count: Int!
    percentage: Float!
  }

  type GenderBreakdown {
    category: String!
    count: Int!
    percentage: Float!
  }

  type LocationBreakdown {
    location: String!
    count: Int!
    percentage: Float!
  }

  type CommunityGroup {
    name: String!
    description: String!
    memberCount: Int!
    engagementLevel: EngagementLevel!
    culturalSignificance: Float!
  }

  type ProjectDocument {
    id: ID!
    project: Project!
    title: String!
    filename: String!
    url: String!
    type: DocumentType!
    size: Int!
    uploadedBy: User!
    uploadedAt: DateTime!
    isPublic: Boolean!
  }

  type ProjectUpdate {
    id: ID!
    project: Project!
    author: User!
    title: String!
    content: String!
    type: UpdateType!
    visibility: UpdateVisibility!

    attachments: [String!]!
    tags: [String!]!

    # Engagement
    likes: Int!
    comments: [UpdateComment!]!

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type UpdateComment {
    id: ID!
    author: User!
    content: String!
    createdAt: DateTime!
  }

  type ProjectDiscussion {
    id: ID!
    project: Project!
    author: User!
    title: String!
    content: String!
    category: DiscussionCategory!

    replies: [DiscussionReply!]!
    participants: [User!]!

    isPinned: Boolean!
    isLocked: Boolean!

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DiscussionReply {
    id: ID!
    author: User!
    content: String!
    parentReply: DiscussionReply
    createdAt: DateTime!
  }

  type Testimonial {
    id: ID!
    author: String!
    role: String
    content: String!
    rating: Float
    culturallyAppropriate: Boolean!
    consentGiven: Boolean!
    createdAt: DateTime!
  }

  type ProjectStatusUpdate {
    projectId: ID!
    status: ProjectStatus!
    previousStatus: ProjectStatus!
    updatedBy: User!
    updatedAt: DateTime!
  }

  # Input Types
  input CreateProjectInput {
    title: String!
    description: String!
    summary: String
    theme: ProjectTheme
    category: ProjectCategory!
    organizationId: ID!

    location: String
    region: String
    culturalContext: CulturalContextInput

    startDate: DateTime
    endDate: DateTime
    visibility: ProjectVisibility!

    tags: [String!]
    collaborators: [AddCollaboratorInput!]
  }

  input UpdateProjectInput {
    title: String
    description: String
    summary: String
    theme: ProjectTheme
    category: ProjectCategory

    location: String
    region: String
    culturalContext: CulturalContextInput

    startDate: DateTime
    endDate: DateTime
    visibility: ProjectVisibility

    tags: [String!]
  }

  input CulturalContextInput {
    indigenousLands: [String!]
    culturalProtocols: [String!]
    communityConsultation: Boolean
    culturalSensitivity: CulturalSensitivityLevel
    communityRepresentatives: [String!]
  }

  input DuplicateProjectInput {
    title: String!
    organizationId: ID!
    includeCollaborators: Boolean
    includeTasks: Boolean
    includeBudget: Boolean
  }

  input AddCollaboratorInput {
    userId: ID!
    role: CollaboratorRole!
    permissions: [Permission!]
  }

  input CreateMilestoneInput {
    projectId: ID!
    title: String!
    description: String!
    dueDate: DateTime
    assigneeId: ID
    culturalRequirements: [String!]
  }

  input UpdateMilestoneInput {
    title: String
    description: String
    dueDate: DateTime
    assigneeId: ID
    culturalRequirements: [String!]
  }

  input CreateProjectTaskInput {
    projectId: ID!
    milestoneId: ID
    title: String!
    description: String!
    priority: TaskPriority!
    assigneeId: ID
    dueDate: DateTime
    estimatedHours: Float
    tags: [String!]
  }

  input UpdateProjectTaskInput {
    title: String
    description: String
    priority: TaskPriority
    assigneeId: ID
    dueDate: DateTime
    estimatedHours: Float
    actualHours: Float
    tags: [String!]
  }

  input ProjectBudgetInput {
    totalBudget: Float!
    currency: String!
    categories: [BudgetCategoryInput!]!
    fundingSources: [FundingSourceInput!]
  }

  input BudgetCategoryInput {
    name: String!
    allocatedAmount: Float!
    description: String
  }

  input FundingSourceInput {
    name: String!
    type: FundingType!
    amount: Float!
    conditions: [String!]
  }

  input CreateProjectUpdateInput {
    projectId: ID!
    title: String!
    content: String!
    type: UpdateType!
    visibility: UpdateVisibility!
    attachments: [String!]
    tags: [String!]
  }

  input CreateProjectDiscussionInput {
    projectId: ID!
    title: String!
    content: String!
    category: DiscussionCategory!
  }

  input ProjectImpactInput {
    participantsReached: Int
    communitiesEngaged: Int
    resourcesGenerated: Int
    socialImpactScore: Float
    environmentalImpactScore: Float
    culturalImpactScore: Float
    economicImpactScore: Float
    communityFeedbackScore: Float
    systemsObsoleted: [String!]
    alternativesCreated: [String!]
    capacityBuilt: [String!]
  }

  # Enums
  enum ProjectStatus {
    DRAFT
    PLANNING
    ACTIVE
    ON_HOLD
    COMPLETED
    CANCELLED
    ARCHIVED
  }

  enum ProjectTheme {
    EMPATHY_LEDGER
    COMMUNITY_CONNECTION
    CULTURAL_PRESERVATION
    ENVIRONMENTAL_ACTION
    EDUCATION_ACCESS
    ECONOMIC_EMPOWERMENT
    HEALTH_WELLBEING
    TECHNOLOGY_ACCESS
    ARTS_CULTURE
    GOVERNANCE_ADVOCACY
  }

  enum ProjectCategory {
    RESEARCH
    IMPLEMENTATION
    ADVOCACY
    CAPACITY_BUILDING
    INNOVATION
    COLLABORATION
    DEMONSTRATION
  }

  enum ProjectVisibility {
    PUBLIC
    COMMUNITY
    ORGANIZATION
    COLLABORATORS
    PRIVATE
  }

  enum CollaboratorRole {
    OWNER
    ADMIN
    MANAGER
    CONTRIBUTOR
    REVIEWER
    OBSERVER
  }

  enum Permission {
    READ
    WRITE
    DELETE
    MANAGE_COLLABORATORS
    MANAGE_BUDGET
    PUBLISH
    ARCHIVE
  }

  enum ContributionLevel {
    HIGH
    MEDIUM
    LOW
    INACTIVE
  }

  enum MilestoneStatus {
    NOT_STARTED
    IN_PROGRESS
    REVIEW
    COMPLETED
    OVERDUE
    CANCELLED
  }

  enum TaskStatus {
    TODO
    IN_PROGRESS
    REVIEW
    COMPLETED
    CANCELLED
  }

  enum TaskPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  enum FundingType {
    GRANT
    DONATION
    SPONSORSHIP
    INVESTMENT
    INTERNAL
    CROWDFUNDING
  }

  enum FundingStatus {
    APPLIED
    APPROVED
    RECEIVED
    REJECTED
    PENDING
  }

  enum GrantStatus {
    DRAFT
    SUBMITTED
    UNDER_REVIEW
    APPROVED
    REJECTED
    FUNDED
  }

  enum PhaseStatus {
    UPCOMING
    ACTIVE
    COMPLETED
    DELAYED
    CANCELLED
  }

  enum OutcomeType {
    QUANTITATIVE
    QUALITATIVE
    BEHAVIORAL
    SYSTEMIC
    CULTURAL
  }

  enum CulturalSensitivityLevel {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum EngagementLevel {
    HIGH
    MEDIUM
    LOW
    MINIMAL
  }

  enum DocumentType {
    PROPOSAL
    REPORT
    PRESENTATION
    IMAGE
    VIDEO
    AUDIO
    SPREADSHEET
    OTHER
  }

  enum UpdateType {
    GENERAL
    MILESTONE
    ACHIEVEMENT
    CHALLENGE
    FUNDING
    TEAM_CHANGE
    DEADLINE_CHANGE
  }

  enum UpdateVisibility {
    PUBLIC
    COLLABORATORS
    ORGANIZATION
    PRIVATE
  }

  enum DiscussionCategory {
    GENERAL
    PLANNING
    IMPLEMENTATION
    FEEDBACK
    ISSUES
    IDEAS
    ANNOUNCEMENTS
  }
`;

export default projectSchema;
