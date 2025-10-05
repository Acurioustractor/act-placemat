/**
 * Story GraphQL Schema
 * Handles community stories, storytellers, and narrative content with cultural safety
 */

import { gql } from 'graphql-tag';

export const storySchema = gql`
  extend type Query {
    # Story queries
    story(id: ID!): Story
    stories(
      limit: Int
      offset: Int
      themes: [String!]
      culturalSafety: Float
      visibility: StoryVisibility
      organizationId: ID
      storytellerId: ID
      featured: Boolean
    ): StoryConnection!

    storyBySlug(slug: String!): Story
    featuredStories(limit: Int): [Story!]!
    recentStories(limit: Int): [Story!]!

    # Story components
    storyThemes: [StoryTheme!]!
    storyCategories: [StoryCategory!]!

    # Storytellers
    storyteller(id: ID!): Storyteller
    storytellers(limit: Int, active: Boolean, organizationId: ID): [Storyteller!]!

    # Story interactions
    storyComments(storyId: ID!, limit: Int): [StoryComment!]!
    storyAnalytics(storyId: ID!): StoryAnalytics
  }

  extend type Mutation {
    # Story management
    createStory(input: CreateStoryInput!): Story!
    updateStory(id: ID!, input: UpdateStoryInput!): Story!
    publishStory(id: ID!): Story!
    archiveStory(id: ID!): Story!
    deleteStory(id: ID!): Boolean!

    # Story status and visibility
    updateStoryVisibility(id: ID!, visibility: StoryVisibility!): Story!
    featureStory(id: ID!, featured: Boolean!): Story!

    # Cultural safety and consent
    updateConsentStatus(storyId: ID!, consent: ConsentStatusInput!): Story!
    flagCulturalSafetyConcern(storyId: ID!, concern: String!): Boolean!

    # Storyteller management
    createStoryteller(input: CreateStorytellerInput!): Storyteller!
    updateStoryteller(id: ID!, input: UpdateStorytellerInput!): Storyteller!
    updateStorytellerConsent(id: ID!, consent: ConsentStatusInput!): Storyteller!

    # Story interactions
    addStoryComment(input: CreateStoryCommentInput!): StoryComment!
    updateStoryComment(id: ID!, content: String!): StoryComment!
    deleteStoryComment(id: ID!): Boolean!

    likeStory(storyId: ID!): StoryLike!
    unlikeStory(storyId: ID!): Boolean!

    # Story sharing and collaboration
    shareStory(storyId: ID!, input: ShareStoryInput!): StoryShare!
    collaborateOnStory(
      storyId: ID!
      userId: ID!
      role: CollaboratorRole!
    ): StoryCollaborator!
  }

  extend type Subscription {
    storyPublished(theme: String): Story!
    storyUpdated(storyId: ID): Story!
    storyCommentAdded(storyId: ID): StoryComment!
    culturalSafetyAlert(severity: AlertSeverity): CulturalSafetyAlert!
  }

  # Core Story Types
  type Story {
    id: ID!
    slug: String!
    title: String!
    content: String!
    summary: String
    excerpt: String

    # Storytelling metadata
    storyteller: Storyteller!
    organization: Organization
    project: Project

    # Categorization
    themes: [StoryTheme!]!
    categories: [StoryCategory!]!
    tags: [String!]!

    # Cultural safety and consent
    culturalSafetyScore: Float!
    culturalContext: StoryCulturalContext!
    consent: ConsentStatus!
    culturalReview: CulturalReview

    # Content structure
    sections: [StorySection!]!
    media: [StoryMedia!]!

    # Engagement and impact
    impactMetrics: StoryImpactMetrics
    engagement: StoryEngagement!

    # Visibility and access
    visibility: StoryVisibility!
    isPublic: Boolean!
    isFeatured: Boolean!
    isArchived: Boolean!

    # Relationships
    relatedStories: [Story!]!
    linkedProjects: [Project!]!
    collaborators: [StoryCollaborator!]!

    # Community interaction
    comments: [StoryComment!]!
    likes: [StoryLike!]!
    shares: [StoryShare!]!

    # Publishing
    status: StoryStatus!
    publishedAt: DateTime
    scheduledFor: DateTime

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
    lastReviewedAt: DateTime

    # Analytics
    viewCount: Int!
    readTime: Int # estimated minutes
    completionRate: Float
  }

  type StoryConnection {
    edges: [StoryEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
    aggregations: StoryAggregations
  }

  type StoryEdge {
    cursor: String!
    node: Story!
  }

  type StoryAggregations {
    byTheme: [ThemeAggregation!]!
    byCulturalSafety: [CulturalSafetyAggregation!]!
    byOrganization: [OrganizationAggregation!]!
    byTimeframe: [TimeframeAggregation!]!
  }

  type ThemeAggregation {
    theme: String!
    count: Int!
    avgCulturalSafety: Float!
  }

  type CulturalSafetyAggregation {
    range: String!
    count: Int!
    percentage: Float!
  }

  type OrganizationAggregation {
    organization: Organization!
    count: Int!
    avgCulturalSafety: Float!
  }

  type TimeframeAggregation {
    period: String!
    count: Int!
    avgEngagement: Float!
  }

  type Storyteller {
    id: ID!

    # Identity (with consent awareness)
    fullName: String
    preferredName: String
    displayName: String # What is shown publicly
    # Contact (with privacy controls)
    email: String
    phone: String

    # Profile
    bio: String
    location: String
    culturalBackground: String
    languages: [String!]!

    # Community connections
    organization: Organization
    communityRoles: [CommunityRole!]!

    # Storytelling
    stories: [Story!]!
    collaborations: [StoryCollaborator!]!
    specializations: [String!]!
    storytellingStyle: [StorytellingStyle!]!

    # Consent and cultural safety
    consentStatus: ConsentStatus!
    culturalSafetyPreferences: CulturalSafetyPreferences!

    # Privacy and visibility
    profileVisibility: ProfileVisibility!
    contactVisibility: ContactVisibility!

    # Recognition and impact
    recognitionLevel: RecognitionLevel!
    impactScore: Float!
    communityEndorsements: [CommunityEndorsement!]!

    # Activity tracking
    totalStories: Int!
    totalViews: Int!
    averageEngagement: Float!

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
    lastActiveAt: DateTime
    isActive: Boolean!
    isVerified: Boolean!
  }

  type StoryCulturalContext {
    id: ID!
    story: Story!

    # Geographic and cultural context
    indigenousLands: [String!]!
    culturalGroups: [String!]!
    languages: [String!]!

    # Cultural protocols
    sacredContent: Boolean!
    restrictedSharing: Boolean!
    communityApprovalRequired: Boolean!
    culturalAdvisorsInvolved: [String!]!

    # Sensitivity markers
    sensitivityLevel: CulturalSensitivityLevel!
    triggerWarnings: [String!]!
    culturalConsiderations: [String!]!

    # Approval workflow
    approvalStatus: ApprovalStatus!
    approvedBy: [CulturalApprover!]!
    approvedAt: DateTime
    reviewNotes: String

    updatedAt: DateTime!
  }

  type CulturalApprover {
    id: ID!
    name: String!
    role: String!
    organization: String
    culturalAuthority: [String!]!
    approvedAt: DateTime!
  }

  type ConsentStatus {
    hasConsent: Boolean!
    consentType: ConsentType!
    consentDate: DateTime
    consentVersion: String!

    # Specific consents
    storySharing: Boolean!
    mediaSharing: Boolean!
    dataProcessing: Boolean!
    commercialUse: Boolean!
    culturalSharing: Boolean!

    # Withdrawal and management
    withdrawalAvailable: Boolean!
    withdrawnAt: DateTime
    renewalRequired: Boolean!
    renewalDate: DateTime

    # Community and organizational consent
    communityConsent: Boolean!
    organizationConsent: Boolean!

    # Verification
    verifiedBy: User
    verifiedAt: DateTime

    updatedAt: DateTime!
  }

  type CulturalReview {
    id: ID!
    story: Story!
    reviewer: CulturalAdvisor

    # Review details
    culturalSafetyScore: Float!
    recommendedActions: [String!]!
    concerns: [String!]!
    strengths: [String!]!

    # Status
    status: ReviewStatus!
    approved: Boolean!
    conditionalApproval: Boolean!
    conditions: [String!]!

    # Community involvement
    communityFeedback: [CommunityFeedback!]!
    stakeholderApprovals: [StakeholderApproval!]!

    reviewedAt: DateTime!
    updatedAt: DateTime!
  }

  type CommunityFeedback {
    id: ID!
    provider: String!
    role: String!
    feedback: String!
    rating: Float
    culturallyAppropriate: Boolean!
    providedAt: DateTime!
  }

  type StakeholderApproval {
    id: ID!
    stakeholder: String!
    role: String!
    approved: Boolean!
    conditions: [String!]!
    notes: String
    approvedAt: DateTime!
  }

  type StoryTheme {
    id: ID!
    name: String!
    description: String!
    color: String
    icon: String

    # Cultural context
    culturalSignificance: String
    culturalSensitivity: CulturalSensitivityLevel!

    # Usage
    storyCount: Int!
    popularityScore: Float!

    # Relationships
    parentTheme: StoryTheme
    subThemes: [StoryTheme!]!
    relatedThemes: [StoryTheme!]!

    isActive: Boolean!
    createdAt: DateTime!
  }

  type StoryCategory {
    id: ID!
    name: String!
    description: String!
    color: String

    # Categorization
    type: CategoryType!
    level: CategoryLevel!

    # Usage and relationships
    storyCount: Int!
    parentCategory: StoryCategory
    subCategories: [StoryCategory!]!

    isActive: Boolean!
    createdAt: DateTime!
  }

  type StorySection {
    id: ID!
    story: Story!
    title: String!
    content: String!
    type: SectionType!
    order: Int!

    # Media and attachments
    media: [StoryMedia!]!

    # Cultural considerations for this section
    culturalNotes: String
    sensitivityLevel: CulturalSensitivityLevel

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type StoryMedia {
    id: ID!
    story: Story!
    section: StorySection

    # Media details
    type: MediaType!
    url: String!
    filename: String!
    alt: String
    caption: String

    # Technical details
    mimeType: String!
    size: Int!
    duration: Int # for audio/video
    dimensions: MediaDimensions

    # Cultural and consent considerations
    culturalSensitive: Boolean!
    consentRequired: Boolean!
    consentObtained: Boolean!
    usage: MediaUsageRights!

    # Attribution
    attribution: String
    photographer: String
    source: String
    license: String

    # Organization
    order: Int
    isMain: Boolean!

    uploadedBy: User!
    uploadedAt: DateTime!
  }

  type MediaDimensions {
    width: Int!
    height: Int!
    aspectRatio: String!
  }

  type MediaUsageRights {
    canShare: Boolean!
    canModify: Boolean!
    commercialUse: Boolean!
    attributionRequired: Boolean!
    restrictions: [String!]!
  }

  type StoryImpactMetrics {
    id: ID!
    story: Story!

    # Reach and engagement
    totalViews: Int!
    uniqueViews: Int!
    averageReadTime: Float!
    completionRate: Float!

    # Community response
    likes: Int!
    comments: Int!
    shares: Int!
    bookmarks: Int!

    # Cultural impact
    culturalResonance: Float!
    communityFeedback: Float!
    educationalValue: Float!
    inspirationalValue: Float!

    # Long-term tracking
    citationCount: Int!
    adaptationCount: Int!
    translationCount: Int!

    # Geographic reach
    locationsReached: [String!]!
    communitiesImpacted: [String!]!

    measuredAt: DateTime!
    updatedAt: DateTime!
  }

  type StoryEngagement {
    id: ID!
    story: Story!

    # Current engagement
    currentLikes: Int!
    currentComments: Int!
    currentShares: Int!

    # Trend analysis
    engagementTrend: EngagementTrend!
    weeklyGrowth: Float!
    monthlyGrowth: Float!

    # Audience insights
    audienceDemographics: AudienceDemographics!
    topLocations: [LocationEngagement!]!
    peakEngagementTimes: [EngagementPeak!]!

    # Content performance
    mostEngagingSections: [SectionEngagement!]!
    dropOffPoints: [ContentDropOff!]!

    lastUpdated: DateTime!
  }

  type AudienceDemographics {
    ageGroups: [AgeGroup!]!
    locations: [LocationBreakdown!]!
    interests: [InterestBreakdown!]!
    culturalBackgrounds: [CulturalBreakdown!]!
  }

  type LocationEngagement {
    location: String!
    engagementScore: Float!
    viewCount: Int!
    shareCount: Int!
  }

  type EngagementPeak {
    time: String!
    dayOfWeek: String!
    engagementScore: Float!
  }

  type SectionEngagement {
    section: StorySection!
    avgTimeSpent: Float!
    completionRate: Float!
    engagementScore: Float!
  }

  type ContentDropOff {
    position: Float! # percentage through content
    dropOffRate: Float!
    commonReasons: [String!]!
  }

  type InterestBreakdown {
    interest: String!
    count: Int!
    percentage: Float!
  }

  type CulturalBreakdown {
    culturalGroup: String!
    count: Int!
    engagementScore: Float!
  }

  type StoryComment {
    id: ID!
    story: Story!
    author: User!
    content: String!

    # Threading
    parentComment: StoryComment
    replies: [StoryComment!]!

    # Moderation
    isModerated: Boolean!
    moderatedBy: User
    moderatedAt: DateTime
    moderationReason: String

    # Cultural safety
    culturallyAppropriate: Boolean!
    flaggedConcerns: [String!]!

    # Engagement
    likes: Int!

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type StoryLike {
    id: ID!
    story: Story!
    user: User!
    createdAt: DateTime!
  }

  type StoryShare {
    id: ID!
    story: Story!
    sharedBy: User!
    platform: SharingPlatform!
    context: String

    # Analytics
    clickCount: Int!

    sharedAt: DateTime!
  }

  type StoryCollaborator {
    id: ID!
    story: Story!
    collaborator: User!
    role: StoryCollaboratorRole!
    contribution: String!

    # Recognition
    shouldCredit: Boolean!
    creditAs: String

    # Permissions
    canEdit: Boolean!
    canComment: Boolean!
    canShare: Boolean!

    joinedAt: DateTime!
  }

  type CommunityRole {
    id: ID!
    title: String!
    organization: Organization
    community: String!
    description: String

    culturalAuthority: [String!]!
    responsibilities: [String!]!

    isActive: Boolean!
    startedAt: DateTime!
    endedAt: DateTime
  }

  type CommunityEndorsement {
    id: ID!
    storyteller: Storyteller!
    endorser: String!
    endorserRole: String!
    content: String!

    # Cultural weight
    culturalSignificance: Float!
    communitySupport: Boolean!

    endorsedAt: DateTime!
  }

  type CulturalSafetyPreferences {
    id: ID!
    storyteller: Storyteller!

    # Review preferences
    requiresCulturalReview: Boolean!
    preferredReviewers: [String!]!

    # Sharing preferences
    allowPublicSharing: Boolean!
    allowCommercialUse: Boolean!
    allowModifications: Boolean!
    requiresAttribution: Boolean!

    # Community involvement
    prefersCommunityConsent: Boolean!
    communityRepresentatives: [String!]!

    # Content guidelines
    avoidanceTopics: [String!]!
    sensitiveContent: [String!]!

    updatedAt: DateTime!
  }

  # Input Types
  input CreateStoryInput {
    title: String!
    content: String!
    summary: String
    storytellerId: ID!
    organizationId: ID
    projectId: ID

    themes: [ID!]!
    categories: [ID!]!
    tags: [String!]

    culturalContext: StoryCulturalContextInput!
    consent: ConsentStatusInput!

    sections: [CreateStorySectionInput!]
    media: [CreateStoryMediaInput!]

    visibility: StoryVisibility!
    scheduledFor: DateTime
  }

  input UpdateStoryInput {
    title: String
    content: String
    summary: String

    themes: [ID!]
    categories: [ID!]
    tags: [String!]

    culturalContext: StoryCulturalContextInput
    consent: ConsentStatusInput

    visibility: StoryVisibility
    scheduledFor: DateTime
  }

  input StoryCulturalContextInput {
    indigenousLands: [String!]
    culturalGroups: [String!]
    languages: [String!]
    sacredContent: Boolean
    restrictedSharing: Boolean
    communityApprovalRequired: Boolean
    culturalAdvisorsInvolved: [String!]
    sensitivityLevel: CulturalSensitivityLevel
    triggerWarnings: [String!]
    culturalConsiderations: [String!]
  }

  input ConsentStatusInput {
    hasConsent: Boolean!
    consentType: ConsentType!
    storySharing: Boolean!
    mediaSharing: Boolean!
    dataProcessing: Boolean!
    commercialUse: Boolean!
    culturalSharing: Boolean!
    communityConsent: Boolean!
    organizationConsent: Boolean!
  }

  input CreateStorySectionInput {
    title: String!
    content: String!
    type: SectionType!
    order: Int!
    culturalNotes: String
    sensitivityLevel: CulturalSensitivityLevel
  }

  input CreateStoryMediaInput {
    type: MediaType!
    url: String!
    filename: String!
    alt: String
    caption: String
    culturalSensitive: Boolean!
    consentRequired: Boolean!
    consentObtained: Boolean!
    attribution: String
    photographer: String
    source: String
    license: String
    order: Int
    isMain: Boolean!
  }

  input CreateStorytellerInput {
    fullName: String!
    preferredName: String
    email: String!
    phone: String
    bio: String
    location: String
    culturalBackground: String
    languages: [String!]!
    organizationId: ID
    communityRoles: [CreateCommunityRoleInput!]
    specializations: [String!]
    storytellingStyle: [StorytellingStyle!]
    consentStatus: ConsentStatusInput!
    culturalSafetyPreferences: CulturalSafetyPreferencesInput!
    profileVisibility: ProfileVisibility!
    contactVisibility: ContactVisibility!
  }

  input UpdateStorytellerInput {
    fullName: String
    preferredName: String
    email: String
    phone: String
    bio: String
    location: String
    culturalBackground: String
    languages: [String!]
    specializations: [String!]
    storytellingStyle: [StorytellingStyle!]
    profileVisibility: ProfileVisibility
    contactVisibility: ContactVisibility
  }

  input CreateCommunityRoleInput {
    title: String!
    organizationId: ID
    community: String!
    description: String
    culturalAuthority: [String!]!
    responsibilities: [String!]!
  }

  input CulturalSafetyPreferencesInput {
    requiresCulturalReview: Boolean!
    preferredReviewers: [String!]
    allowPublicSharing: Boolean!
    allowCommercialUse: Boolean!
    allowModifications: Boolean!
    requiresAttribution: Boolean!
    prefersCommunityConsent: Boolean!
    communityRepresentatives: [String!]
    avoidanceTopics: [String!]
    sensitiveContent: [String!]
  }

  input CreateStoryCommentInput {
    storyId: ID!
    content: String!
    parentCommentId: ID
  }

  input ShareStoryInput {
    platform: SharingPlatform!
    context: String
  }

  # Enums
  enum StoryStatus {
    DRAFT
    REVIEW
    PUBLISHED
    SCHEDULED
    ARCHIVED
    PRIVATE
  }

  enum StoryVisibility {
    PUBLIC
    COMMUNITY
    ORGANIZATION
    COLLABORATORS
    PRIVATE
  }

  enum ConsentType {
    FULL
    LIMITED
    CONDITIONAL
    WITHDRAWN
    PENDING
  }

  enum CulturalSensitivityLevel {
    PUBLIC
    COMMUNITY_SENSITIVE
    CULTURALLY_RESTRICTED
    SACRED_PROTECTED
  }

  enum ApprovalStatus {
    PENDING
    APPROVED
    CONDITIONAL
    REJECTED
    NEEDS_REVISION
  }

  enum ReviewStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    APPROVED
    REJECTED
  }

  enum CategoryType {
    CONTENT_TYPE
    AUDIENCE
    PURPOSE
    FORMAT
    THEME
  }

  enum CategoryLevel {
    PRIMARY
    SECONDARY
    TERTIARY
  }

  enum SectionType {
    INTRODUCTION
    BODY
    CONCLUSION
    SIDEBAR
    QUOTE
    IMAGE_CAPTION
    VIDEO_DESCRIPTION
  }

  enum MediaType {
    IMAGE
    VIDEO
    AUDIO
    DOCUMENT
    LINK
  }

  enum EngagementTrend {
    INCREASING
    DECREASING
    STABLE
    VIRAL
    DECLINING
  }

  enum SharingPlatform {
    EMAIL
    FACEBOOK
    TWITTER
    LINKEDIN
    WHATSAPP
    DIRECT_LINK
    EMBED
    PRINT
  }

  enum StoryCollaboratorRole {
    CO_AUTHOR
    EDITOR
    REVIEWER
    CONTRIBUTOR
    ADVISOR
    CULTURAL_CONSULTANT
  }

  enum StorytellingStyle {
    TRADITIONAL_ORAL
    WRITTEN_NARRATIVE
    VISUAL_STORYTELLING
    MULTIMEDIA
    INTERACTIVE
    DOCUMENTARY
    PERSONAL_TESTIMONY
    COMMUNITY_VOICE
  }

  enum RecognitionLevel {
    EMERGING
    ESTABLISHED
    RECOGNIZED
    DISTINGUISHED
    ELDER
  }

  enum ContactVisibility {
    PUBLIC
    COMMUNITY
    ORGANIZATION
    COLLABORATORS
    PRIVATE
  }

  enum AlertSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }
`;

export default storySchema;
