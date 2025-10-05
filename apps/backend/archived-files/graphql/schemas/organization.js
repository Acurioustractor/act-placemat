/**
 * Organisation GraphQL Schema
 * Handles organisations, teams, partnerships, and organisational structure
 */

import { gql } from 'graphql-tag';

export const organizationSchema = gql`
  extend type Query {
    # Organisation queries
    organisation(id: ID!): Organisation
    organisations(
      limit: Int
      offset: Int
      filters: OrganisationFiltersInput
    ): OrganisationConnection!
    myOrganisations: [Organisation!]!

    # Team queries
    team(id: ID!): Team
    teams(organisationId: ID, limit: Int): [Team!]!

    # Partnership queries
    partnership(id: ID!): Partnership
    partnerships(organisationId: ID, status: PartnershipStatus): [Partnership!]!

    # Network queries
    organisationNetwork(organisationId: ID!): OrganisationNetwork!
    collaborativeProjects(organisationId: ID!): [Project!]!

    # Directory and discovery
    organisationDirectory(
      type: OrganisationType
      location: String
      focusArea: String
      limit: Int
    ): [Organisation!]!
  }

  extend type Mutation {
    # Organisation management
    createOrganisation(input: CreateOrganisationInput!): Organisation!
    updateOrganisation(id: ID!, input: UpdateOrganisationInput!): Organisation!
    verifyOrganisation(id: ID!, input: VerificationInput!): Organisation!

    # Team management
    createTeam(input: CreateTeamInput!): Team!
    updateTeam(id: ID!, input: UpdateTeamInput!): Team!
    addTeamMember(teamId: ID!, userId: ID!, role: TeamRole!): TeamMembership!
    updateTeamMember(membershipId: ID!, role: TeamRole!): TeamMembership!
    removeTeamMember(membershipId: ID!): Boolean!

    # Partnership management
    proposePartnership(input: ProposePartnershipInput!): Partnership!
    respondToPartnership(id: ID!, response: PartnershipResponse!): Partnership!
    updatePartnership(id: ID!, input: UpdatePartnershipInput!): Partnership!
    terminatePartnership(id: ID!, reason: String): Partnership!

    # Membership management
    inviteOrganisationMember(
      organisationId: ID!
      input: InviteOrganisationMemberInput!
    ): OrganisationInvitation!
    acceptOrganisationInvitation(invitationId: ID!): OrganisationMembership!
    updateOrganisationMembership(
      membershipId: ID!
      input: UpdateOrganisationMembershipInput!
    ): OrganisationMembership!
    removeOrganisationMember(membershipId: ID!): Boolean!
  }

  extend type Subscription {
    organisationUpdated(organisationId: ID): Organisation!
    partnershipProposed(organisationId: ID): Partnership!
    teamMemberAdded(teamId: ID): TeamMembership!
    organisationInvitationReceived(userId: ID): OrganisationInvitation!
  }

  # Core Organisation Types
  type Organisation {
    id: ID!
    name: String!
    displayName: String!
    description: String!
    type: OrganisationType!
    status: OrganisationStatus!

    # Legal and business details
    abn: String
    acn: String
    registrationNumber: String
    legalName: String
    businessStructure: BusinessStructure!

    # Contact and location
    contactInfo: ContactInfo!
    addresses: [OrganisationAddress!]!
    website: String
    socialMedia: SocialMediaLinks

    # Organisational identity
    logo: String
    mission: String
    vision: String
    values: [String!]!

    # Focus and specialisation
    focusAreas: [FocusArea!]!
    sectors: [Sector!]!
    services: [OrganisationService!]!
    expertise: [String!]!

    # Cultural considerations
    culturalContext: OrganisationCulturalContext
    culturalProtocols: [CulturalProtocol!]!
    traditionalOwners: [TraditionalOwner!]!
    languagesSupported: [Language!]!

    # Verification and trust
    verification: OrganisationVerification!
    accreditations: [Accreditation!]!
    certifications: [Certification!]!

    # Membership and teams
    members: [OrganisationMembership!]!
    teams: [Team!]!
    memberCount: Int!

    # Relationships
    partnerships: [Partnership!]!
    collaborations: [Collaboration!]!
    parentOrganisation: Organisation
    subsidiaries: [Organisation!]!

    # Projects and initiatives
    projects: [Project!]!
    activeProjects: [Project!]!
    completedProjects: [Project!]!

    # Capacity and resources
    capacity: OrganisationCapacity!
    resources: [OrganisationResource!]!
    facilities: [Facility!]!

    # Financial and operational
    budget: OrganisationBudget
    funding: [Funding!]!
    impactMetrics: OrganisationImpactMetrics!

    # Settings and preferences
    settings: OrganisationSettings!
    preferences: OrganisationPreferences!

    # Privacy and visibility
    visibility: OrganisationVisibility!
    publicProfile: Boolean!

    # Metadata
    establishedDate: DateTime
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type OrganisationAddress {
    id: ID!
    type: AddressType!
    name: String
    street: String!
    suburb: String!
    state: String!
    postcode: String!
    country: String!

    # Geographic and cultural data
    coordinates: Coordinates
    traditionalLandName: String
    acknowledgementRequired: Boolean!

    # Contact details
    phone: String
    email: String

    # Metadata
    isPrimary: Boolean!
    isPublic: Boolean!
  }

  type OrganisationCulturalContext {
    id: ID!

    # Cultural identity
    culturalBackground: [String!]!
    indigenousLed: Boolean!
    indigenousGoverned: Boolean!
    communityControlled: Boolean!

    # Cultural protocols
    welcomeToCountry: Boolean!
    acknowledgementOfCountry: String!
    culturalAdvisors: [CulturalAdvisor!]!
    eldersCouncil: EldersCouncil

    # Cultural practices
    ceremonies: [CeremonyType!]!
    traditions: [Tradition!]!
    languages: [Language!]!
    culturalKnowledge: [CulturalKnowledge!]!

    # Cultural safety
    culturalSafetyPolicy: String!
    culturalSafetyTraining: Boolean!
    culturalSafetyOfficer: User

    updatedAt: DateTime!
  }

  type OrganisationVerification {
    verified: Boolean!
    verificationLevel: VerificationLevel!
    verifiedAt: DateTime
    verifiedBy: User

    # Verification details
    documentsVerified: [VerificationDocument!]!
    legalStatusVerified: Boolean!
    contactDetailsVerified: Boolean!
    leadershipVerified: Boolean!

    # Trust indicators
    trustScore: Float!
    backgroundChecks: [BackgroundCheck!]!
    references: [OrganisationReference!]!

    # Ongoing verification
    nextReviewDate: DateTime
    verificationHistory: [VerificationEvent!]!
  }

  type Team {
    id: ID!
    name: String!
    description: String
    type: TeamType!
    status: TeamStatus!

    # Organisation
    organisation: Organisation!
    parentTeam: Team
    subteams: [Team!]!

    # Membership
    members: [TeamMembership!]!
    memberCount: Int!
    lead: User

    # Capacity and skills
    skills: [Skill!]!
    capacity: TeamCapacity!
    availability: TeamAvailability!

    # Work and projects
    projects: [Project!]!
    responsibilities: [String!]!
    goals: [TeamGoal!]!

    # Performance
    performance: TeamPerformance
    metrics: [TeamMetric!]!

    # Cultural considerations
    culturalContext: TeamCulturalContext

    # Settings
    settings: TeamSettings!

    # Metadata
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TeamMembership {
    id: ID!
    team: Team!
    user: User!
    role: TeamRole!
    status: MembershipStatus!

    # Assignment details
    startDate: DateTime!
    endDate: DateTime
    allocation: Float! # percentage
    # Skills and contributions
    skills: [Skill!]!
    contributions: [Contribution!]!
    responsibilities: [String!]!

    # Performance
    performance: MemberPerformance
    feedback: [TeamFeedback!]!

    # Cultural considerations
    culturalRole: CulturalRole

    # Metadata
    invitedBy: User!
    joinedAt: DateTime!
    updatedAt: DateTime!
  }

  type Partnership {
    id: ID!
    name: String!
    description: String!
    type: PartnershipType!
    status: PartnershipStatus!

    # Partners
    initiator: Organisation!
    partner: Organisation!

    # Partnership details
    purpose: [String!]!
    objectives: [String!]!
    expectedOutcomes: [String!]!

    # Terms and conditions
    startDate: DateTime!
    endDate: DateTime
    terms: [PartnershipTerm!]!
    responsibilities: [PartnershipResponsibility!]!

    # Resources and contributions
    resourceSharing: [ResourceShare!]!
    financialArrangements: [FinancialArrangement!]!

    # Projects and activities
    projects: [Project!]!
    activities: [PartnershipActivity!]!

    # Governance
    governance: PartnershipGovernance!
    decisionMaking: DecisionMakingProcess!
    disputeResolution: DisputeResolutionProcess!

    # Cultural considerations
    culturalProtocols: [CulturalProtocol!]!
    culturalAlignment: Float!

    # Performance and evaluation
    milestones: [PartnershipMilestone!]!
    evaluation: PartnershipEvaluation
    successMetrics: [SuccessMetric!]!

    # Communication
    communication: PartnershipCommunication!
    meetings: [PartnershipMeeting!]!

    # Legal and compliance
    legalFramework: String
    complianceRequirements: [String!]!

    # Metadata
    proposedAt: DateTime!
    agreedAt: DateTime
    createdBy: User!
    updatedAt: DateTime!
  }

  type OrganisationMembership {
    id: ID!
    organisation: Organisation!
    user: User!
    role: OrganisationRole!
    status: MembershipStatus!

    # Membership details
    title: String
    department: String
    startDate: DateTime!
    endDate: DateTime

    # Permissions and access
    permissions: [Permission!]!
    accessLevel: AccessLevel!

    # Skills and expertise
    skills: [Skill!]!
    expertise: [String!]!

    # Cultural role
    culturalRole: CulturalRole
    culturalResponsibilities: [String!]!

    # Performance and contribution
    contributions: [Contribution!]!
    performance: MemberPerformance

    # Metadata
    invitedBy: User
    joinedAt: DateTime!
    updatedAt: DateTime!
  }

  type OrganisationNetwork {
    organisation: Organisation!

    # Direct connections
    directPartners: [Organisation!]!
    subsidiaries: [Organisation!]!
    parentOrganisation: Organisation

    # Collaborative networks
    collaborators: [Organisation!]!
    projectPartners: [Organisation!]!
    fundingPartners: [Organisation!]!

    # Extended network
    networkReach: Int!
    connectionStrength: [NetworkConnection!]!

    # Network metrics
    networkSize: Int!
    networkDensity: Float!
    clusteringCoefficient: Float!

    # Influence and reach
    influenceScore: Float!
    reachMetrics: NetworkReachMetrics!

    calculatedAt: DateTime!
  }

  # Supporting types
  type OrganisationService {
    id: ID!
    name: String!
    description: String!
    type: ServiceType!
    category: String!
    availability: ServiceAvailability!
    culturalSafety: Float!
  }

  type OrganisationCapacity {
    currentCapacity: Int!
    maxCapacity: Int!
    utilizationRate: Float!
    availableCapacity: Int!
    skillsGaps: [SkillGap!]!
    growthPotential: GrowthPotential!
  }

  type OrganisationImpactMetrics {
    socialImpact: SocialImpactScore!
    environmentalImpact: EnvironmentalImpactScore!
    culturalImpact: CulturalImpactScore!
    economicImpact: EconomicImpactScore!

    # Beneficiaries
    directBeneficiaries: Int!
    indirectBeneficiaries: Int!
    communityReach: Int!

    # Outcomes
    measuredOutcomes: [OutcomeMetric!]!
    impactStories: [ImpactStory!]!

    lastUpdated: DateTime!
  }

  type Facility {
    id: ID!
    name: String!
    type: FacilityType!
    description: String

    # Location
    address: OrganisationAddress!
    accessibility: AccessibilityFeatures!

    # Capacity and resources
    capacity: Int!
    equipment: [Equipment!]!
    amenities: [String!]!

    # Cultural considerations
    culturalSignificance: String
    culturalProtocols: [CulturalProtocol!]!

    # Availability
    operatingHours: OperatingHours!
    bookingAvailable: Boolean!

    # Safety and compliance
    safetyFeatures: [SafetyFeature!]!
    certifications: [FacilityCertification!]!
  }

  # Connection types
  type OrganisationConnection {
    edges: [OrganisationEdge!]!
    nodes: [Organisation!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type OrganisationEdge {
    node: Organisation!
    cursor: String!
  }

  # Input Types
  input CreateOrganisationInput {
    name: String!
    displayName: String
    description: String!
    type: OrganisationType!

    # Legal details
    abn: String
    acn: String
    legalName: String
    businessStructure: BusinessStructure!

    # Contact information
    contactInfo: ContactInfoInput!
    addresses: [OrganisationAddressInput!]!
    website: String

    # Identity
    mission: String
    vision: String
    values: [String!]

    # Focus areas
    focusAreas: [ID!]!
    sectors: [ID!]!

    # Cultural context
    culturalContext: OrganisationCulturalContextInput

    # Settings
    visibility: OrganisationVisibility!
    publicProfile: Boolean!
  }

  input UpdateOrganisationInput {
    name: String
    displayName: String
    description: String
    website: String
    mission: String
    vision: String
    values: [String!]
    focusAreas: [ID!]
    visibility: OrganisationVisibility
  }

  input OrganisationAddressInput {
    type: AddressType!
    name: String
    street: String!
    suburb: String!
    state: String!
    postcode: String!
    country: String!
    traditionalLandName: String
    isPrimary: Boolean!
    isPublic: Boolean!
  }

  input OrganisationCulturalContextInput {
    culturalBackground: [String!]!
    indigenousLed: Boolean!
    indigenousGoverned: Boolean!
    communityControlled: Boolean!
    acknowledgementOfCountry: String!
    culturalSafetyPolicy: String!
  }

  input CreateTeamInput {
    name: String!
    description: String
    type: TeamType!
    organisationId: ID!
    parentTeamId: ID
  }

  input UpdateTeamInput {
    name: String
    description: String
    status: TeamStatus
  }

  input ProposePartnershipInput {
    partnerOrganisationId: ID!
    name: String!
    description: String!
    type: PartnershipType!
    purpose: [String!]!
    objectives: [String!]!
    startDate: DateTime!
    endDate: DateTime
    terms: [PartnershipTermInput!]!
  }

  input PartnershipTermInput {
    title: String!
    description: String!
    mandatory: Boolean!
  }

  input OrganisationFiltersInput {
    type: OrganisationType
    status: OrganisationStatus
    location: String
    focusArea: String
    verified: Boolean
    culturalBackground: String
  }

  input InviteOrganisationMemberInput {
    email: String!
    role: OrganisationRole!
    title: String
    department: String
    permissions: [String!]
  }

  input UpdateOrganisationMembershipInput {
    role: OrganisationRole
    title: String
    department: String
    permissions: [String!]
  }

  # Enums
  enum OrganisationType {
    CHARITY
    NOT_FOR_PROFIT
    COMMUNITY_GROUP
    GOVERNMENT
    CORPORATE
    SOCIAL_ENTERPRISE
    COOPERATIVE
    INDIGENOUS_ORGANISATION
    RELIGIOUS_ORGANISATION
    EDUCATIONAL_INSTITUTION
    RESEARCH_INSTITUTE
    THINK_TANK
    ADVOCACY_GROUP
    UNION
  }

  enum OrganisationStatus {
    ACTIVE
    INACTIVE
    PENDING_VERIFICATION
    SUSPENDED
    DISSOLVED
  }

  enum BusinessStructure {
    SOLE_TRADER
    PARTNERSHIP
    COMPANY
    TRUST
    INCORPORATED_ASSOCIATION
    COOPERATIVE
    INDIGENOUS_CORPORATION
  }

  enum OrganisationRole {
    FOUNDER
    DIRECTOR
    MANAGER
    COORDINATOR
    MEMBER
    VOLUNTEER
    ADVISOR
    ELDER
    CULTURAL_ADVISOR
  }

  enum TeamType {
    EXECUTIVE
    OPERATIONAL
    PROJECT
    CULTURAL
    ADVISORY
    WORKING_GROUP
    COMMITTEE
  }

  enum TeamStatus {
    ACTIVE
    INACTIVE
    FORMING
    DISBANDED
  }

  enum TeamRole {
    LEAD
    CO_LEAD
    MEMBER
    SPECIALIST
    ADVISOR
    OBSERVER
  }

  enum PartnershipType {
    STRATEGIC
    OPERATIONAL
    PROJECT_BASED
    FUNDING
    RESOURCE_SHARING
    ADVOCACY
    CULTURAL_EXCHANGE
    MENTORSHIP
  }

  enum PartnershipStatus {
    PROPOSED
    UNDER_NEGOTIATION
    ACTIVE
    SUSPENDED
    TERMINATED
    COMPLETED
  }

  enum PartnershipResponse {
    ACCEPT
    REJECT
    COUNTER_PROPOSE
    REQUEST_MEETING
  }

  enum MembershipStatus {
    ACTIVE
    INACTIVE
    PENDING
    SUSPENDED
    TERMINATED
  }

  enum VerificationLevel {
    UNVERIFIED
    BASIC
    STANDARD
    PREMIUM
    GOVERNMENT_VERIFIED
  }

  enum AddressType {
    HEAD_OFFICE
    BRANCH
    REGISTERED
    POSTAL
    SERVICE_DELIVERY
  }

  enum ServiceType {
    CONSULTATION
    TRAINING
    SUPPORT
    ADVOCACY
    RESEARCH
    CULTURAL_PRACTICE
    CEREMONY
  }

  enum FacilityType {
    OFFICE
    COMMUNITY_CENTRE
    MEETING_ROOM
    WORKSHOP_SPACE
    CULTURAL_CENTRE
    CEREMONY_GROUND
    STORAGE
    ACCOMMODATION
  }

  enum OrganisationVisibility {
    PUBLIC
    COMMUNITY
    MEMBERS_ONLY
    PRIVATE
  }

  enum AccessLevel {
    BASIC
    STANDARD
    ADVANCED
    ADMINISTRATOR
    OWNER
  }
`;

export default organizationSchema;
