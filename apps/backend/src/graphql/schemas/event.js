/**
 * Event GraphQL Schema
 * Handles events, workshops, ceremonies, and cultural gatherings
 */

import { gql } from 'graphql-tag';

export const eventSchema = gql`
  extend type Query {
    # Event queries
    event(id: ID!): Event
    events(
      limit: Int
      offset: Int
      filters: EventFiltersInput
      culturalSafety: Float
    ): EventConnection!
    upcomingEvents(limit: Int): [Event!]!
    eventsByOrganisation(organisationId: ID!, limit: Int): [Event!]!
    culturalEvents(culturalContext: String, limit: Int): [CulturalEvent!]!
    eventTypes: [EventType!]!
  }

  extend type Mutation {
    # Event management
    createEvent(input: CreateEventInput!): Event!
    updateEvent(id: ID!, input: UpdateEventInput!): Event!
    cancelEvent(id: ID!, reason: String): Event!

    # Event registration
    registerForEvent(eventId: ID!, input: EventRegistrationInput): EventRegistration!
    updateRegistration(id: ID!, input: UpdateEventRegistrationInput): EventRegistration!
    cancelRegistration(id: ID!): Boolean!

    # Cultural event specific
    createCulturalEvent(input: CreateCulturalEventInput!): CulturalEvent!
    requestCulturalReview(eventId: ID!): CulturalEvent!
    approveCulturalEvent(eventId: ID!, input: CulturalApprovalInput!): CulturalEvent!
  }

  extend type Subscription {
    eventUpdated(eventId: ID): Event!
    eventRegistrationUpdated(eventId: ID): EventRegistration!
    culturalEventReviewRequested: CulturalEvent!
  }

  # Core Event Types
  type Event {
    id: ID!
    title: String!
    description: String!
    type: EventType!
    status: EventStatus!

    # Location and timing
    location: EventLocation!
    startDate: DateTime!
    endDate: DateTime!
    timezone: String!
    duration: String

    # Organisation and hosting
    organiser: Organisation!
    hosts: [User!]!
    facilitators: [User!]!

    # Capacity and registration
    capacity: Int
    registrationRequired: Boolean!
    registrationDeadline: DateTime
    waitlistEnabled: Boolean!

    # Content and resources
    agenda: [AgendaItem!]!
    resources: [EventResource!]!
    prerequisites: [String!]!

    # Cultural considerations
    culturalContext: EventCulturalContext
    culturalSafetyScore: Float!
    culturalRequirements: [String!]!
    acknowledgements: [String!]!

    # Registration and attendance
    registrations: [EventRegistration!]!
    attendees: [User!]!
    registrationCount: Int!
    attendanceCount: Int!
    waitlistCount: Int!

    # Privacy and visibility
    visibility: EventVisibility!
    isPublic: Boolean!
    inviteOnly: Boolean!

    # Content and media
    featuredImage: String
    gallery: [Media!]!
    recordings: [EventRecording!]!

    # Financial
    cost: EventCost
    funding: [EventFunding!]!

    # Feedback and evaluation
    feedback: [EventFeedback!]!
    evaluation: EventEvaluation

    # Metadata
    tags: [String!]!
    categories: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: User!
  }

  type CulturalEvent {
    id: ID!
    event: Event!

    # Cultural specifics
    culturalProtocols: [CulturalProtocol!]!
    elderInvolvement: ElderInvolvement
    ceremonyType: CeremonyType
    sacredElements: [SacredElement!]!

    # Cultural review and approval
    culturalReview: CulturalReview!
    communityConsent: CommunityConsent!
    culturalAdvisors: [CulturalAdvisor!]!

    # Cultural safety
    culturalSafetyPlan: String!
    culturalRisks: [CulturalRisk!]!
    mitigationStrategies: [String!]!

    # Community involvement
    communityPartners: [CommunityPartner!]!
    stakeholderConsultation: StakeholderConsultation

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type EventLocation {
    type: LocationType!
    venue: String
    address: String
    city: String
    state: String
    postcode: String
    country: String!

    # Geographic data
    coordinates: Coordinates
    traditionalLandName: String
    acknowledgementOfCountry: String!

    # Virtual event data
    platform: String
    accessLink: String
    accessInstructions: String

    # Accessibility
    wheelchairAccessible: Boolean!
    publicTransportAccess: Boolean!
    parkingAvailable: Boolean!
    accessibilityFeatures: [AccessibilityFeature!]!
  }

  type AgendaItem {
    id: ID!
    title: String!
    description: String
    startTime: DateTime!
    endTime: DateTime!
    facilitator: User
    type: AgendaItemType!
    resources: [EventResource!]!
    culturalConsiderations: [String!]!
  }

  type EventResource {
    id: ID!
    title: String!
    type: ResourceType!
    url: String
    file: String
    description: String
    accessLevel: AccessLevel!
    culturalSensitivity: CulturalSensitivity!
  }

  type EventRegistration {
    id: ID!
    event: Event!
    user: User!
    status: RegistrationStatus!

    # Registration details
    registeredAt: DateTime!
    attendanceStatus: AttendanceStatus
    waitlistPosition: Int

    # Cultural considerations
    culturalRequirements: [String!]!
    dietaryRequirements: [String!]!
    accessibilityNeeds: [String!]!

    # Communication preferences
    contactPreferences: ContactPreferences!
    emergencyContact: EmergencyContact

    # Feedback
    feedback: EventFeedback
    evaluation: ParticipantEvaluation

    updatedAt: DateTime!
  }

  type EventCost {
    amount: Float!
    currency: String!
    type: CostType!
    earlyBirdAmount: Float
    earlyBirdDeadline: DateTime
    scholarshipsAvailable: Boolean!
    paymentMethods: [PaymentMethod!]!
  }

  type EventFunding {
    id: ID!
    source: FundingSource!
    amount: Float!
    currency: String!
    purpose: String!
    conditions: [String!]!
  }

  type EventRecording {
    id: ID!
    title: String!
    url: String!
    duration: String
    availability: RecordingAvailability!
    culturalApproval: Boolean!
    transcript: String
    captions: Boolean!
  }

  type EventFeedback {
    id: ID!
    user: User!
    rating: Int!
    comment: String
    aspects: FeedbackAspects!
    wouldRecommend: Boolean!
    culturalSafety: CulturalSafetyFeedback!
    submittedAt: DateTime!
  }

  type FeedbackAspects {
    content: Int!
    facilitation: Int!
    venue: Int!
    organisation: Int!
    culturalSafety: Int!
    accessibility: Int!
  }

  type CulturalSafetyFeedback {
    feltSafe: Boolean!
    protocolsRespected: Boolean!
    appropriateContent: Boolean!
    inclusiveEnvironment: Boolean!
    suggestions: [String!]!
  }

  type EventEvaluation {
    overallRating: Float!
    attendanceRate: Float!
    completionRate: Float!
    satisfactionScore: Float!
    culturalSafetyScore: Float!
    learningOutcomes: [LearningOutcome!]!
    improvements: [String!]!
    successMetrics: JSON!
  }

  # Cultural types
  type CulturalProtocol {
    id: ID!
    name: String!
    description: String!
    importance: ProtocolImportance!
    instructions: [String!]!
  }

  type ElderInvolvement {
    required: Boolean!
    elders: [Elder!]!
    role: ElderRole!
    consultation: Boolean!
    approval: Boolean!
  }

  type Elder {
    id: ID!
    name: String!
    community: String!
    role: String!
    contactApproved: Boolean!
  }

  type SacredElement {
    id: ID!
    type: SacredElementType!
    description: String!
    restrictions: [String!]!
    protections: [String!]!
  }

  type CulturalReview {
    status: ReviewStatus!
    reviewer: CulturalAdvisor
    reviewDate: DateTime
    feedback: [String!]!
    recommendations: [String!]!
    approved: Boolean!
    conditions: [String!]!
  }

  type CommunityConsent {
    obtained: Boolean!
    consentType: ConsentType!
    consentDate: DateTime
    community: String!
    representative: CommunityRepresentative!
    documentation: String
  }

  type CulturalAdvisor {
    id: ID!
    name: String!
    community: String!
    expertise: [String!]!
    credentials: String
    contactInfo: String
  }

  type CulturalRisk {
    id: ID!
    risk: String!
    severity: RiskSeverity!
    likelihood: RiskLikelihood!
    mitigation: [String!]!
  }

  type CommunityPartner {
    id: ID!
    organisation: Organisation!
    role: PartnerRole!
    contribution: [String!]!
    agreement: String
  }

  type StakeholderConsultation {
    completed: Boolean!
    stakeholders: [Stakeholder!]!
    consultationDate: DateTime
    feedback: [String!]!
    agreements: [String!]!
  }

  type Stakeholder {
    id: ID!
    name: String!
    organisation: String
    role: StakeholderRole!
    contactInfo: String
  }

  # Connection types
  type EventConnection {
    edges: [EventEdge!]!
    nodes: [Event!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type EventEdge {
    node: Event!
    cursor: String!
  }

  # Input Types
  input CreateEventInput {
    title: String!
    description: String!
    type: EventType!

    # Location and timing
    location: EventLocationInput!
    startDate: DateTime!
    endDate: DateTime!
    timezone: String!

    # Organisation
    organiserId: ID!
    hostIds: [ID!]
    facilitatorIds: [ID!]

    # Registration
    capacity: Int
    registrationRequired: Boolean!
    registrationDeadline: DateTime
    waitlistEnabled: Boolean

    # Cultural
    culturalContext: EventCulturalContextInput
    culturalRequirements: [String!]
    acknowledgements: [String!]

    # Content
    agenda: [AgendaItemInput!]
    resources: [EventResourceInput!]
    prerequisites: [String!]

    # Visibility
    visibility: EventVisibility!
    inviteOnly: Boolean

    # Cost
    cost: EventCostInput

    # Metadata
    tags: [String!]
    categories: [String!]
  }

  input UpdateEventInput {
    title: String
    description: String
    startDate: DateTime
    endDate: DateTime
    capacity: Int
    visibility: EventVisibility
    status: EventStatus
  }

  input EventLocationInput {
    type: LocationType!
    venue: String
    address: String
    city: String
    state: String
    postcode: String
    platform: String
    accessLink: String
    traditionalLandName: String
    acknowledgementOfCountry: String!
    wheelchairAccessible: Boolean!
    publicTransportAccess: Boolean!
    parkingAvailable: Boolean!
  }

  input AgendaItemInput {
    title: String!
    description: String
    startTime: DateTime!
    endTime: DateTime!
    facilitatorId: ID
    type: AgendaItemType!
  }

  input EventResourceInput {
    title: String!
    type: ResourceType!
    url: String
    description: String
    accessLevel: AccessLevel!
  }

  input EventCostInput {
    amount: Float!
    currency: String!
    type: CostType!
    earlyBirdAmount: Float
    earlyBirdDeadline: DateTime
    scholarshipsAvailable: Boolean!
  }

  input EventRegistrationInput {
    culturalRequirements: [String!]
    dietaryRequirements: [String!]
    accessibilityNeeds: [String!]
    contactPreferences: ContactPreferencesInput!
    emergencyContact: EmergencyContactInput
  }

  input UpdateEventRegistrationInput {
    attendanceStatus: AttendanceStatus
    culturalRequirements: [String!]
    dietaryRequirements: [String!]
    accessibilityNeeds: [String!]
  }

  input EventFiltersInput {
    type: EventType
    status: EventStatus
    location: String
    dateRange: DateRangeInput
    organiser: ID
    culturalContext: String
    tags: [String!]
    categories: [String!]
  }

  input CreateCulturalEventInput {
    eventInput: CreateEventInput!
    culturalProtocols: [ID!]!
    elderInvolvement: ElderInvolvementInput
    ceremonyType: CeremonyType
    culturalSafetyPlan: String!
    communityPartners: [ID!]
  }

  input CulturalApprovalInput {
    approved: Boolean!
    feedback: [String!]
    recommendations: [String!]
    conditions: [String!]
  }

  # Enums
  enum EventType {
    WORKSHOP
    CONFERENCE
    CEREMONY
    MEETING
    TRAINING
    CELEBRATION
    CONSULTATION
    NETWORKING
    CULTURAL_GATHERING
    COMMUNITY_EVENT
    WEBINAR
    PANEL_DISCUSSION
    STORYTELLING
  }

  enum EventStatus {
    DRAFT
    PUBLISHED
    REGISTRATION_OPEN
    REGISTRATION_CLOSED
    SOLD_OUT
    CANCELLED
    POSTPONED
    IN_PROGRESS
    COMPLETED
  }

  enum LocationType {
    PHYSICAL
    VIRTUAL
    HYBRID
  }

  enum EventVisibility {
    PUBLIC
    COMMUNITY
    ORGANISATION
    PRIVATE
    INVITE_ONLY
  }

  enum RegistrationStatus {
    REGISTERED
    WAITLISTED
    CONFIRMED
    CHECKED_IN
    CANCELLED
    NO_SHOW
  }

  enum AttendanceStatus {
    REGISTERED
    CONFIRMED
    CHECKED_IN
    ATTENDED
    NO_SHOW
    CANCELLED
  }

  enum AgendaItemType {
    SESSION
    BREAK
    MEAL
    CEREMONY
    NETWORKING
    PRESENTATION
    DISCUSSION
    ACTIVITY
  }

  enum ResourceType {
    DOCUMENT
    VIDEO
    AUDIO
    LINK
    IMAGE
    PRESENTATION
    HANDOUT
  }

  enum AccessLevel {
    PUBLIC
    REGISTERED
    ATTENDEES
    FACILITATORS
    ORGANISERS
  }

  enum CostType {
    FREE
    PAID
    DONATION
    SLIDING_SCALE
    SPONSOR_COVERED
  }

  enum PaymentMethod {
    CARD
    BANK_TRANSFER
    PAYPAL
    CASH
    INVOICE
  }

  enum CeremonyType {
    WELCOME
    CLOSING
    HEALING
    CELEBRATION
    SEASONAL
    CULTURAL_PROTOCOL
    REMEMBRANCE
  }

  enum ProtocolImportance {
    ESSENTIAL
    IMPORTANT
    RECOMMENDED
    OPTIONAL
  }

  enum ElderRole {
    ADVISOR
    FACILITATOR
    OBSERVER
    BLESSING
    PROTOCOL_KEEPER
  }

  enum SacredElementType {
    OBJECT
    SONG
    STORY
    PLACE
    PRACTICE
    KNOWLEDGE
  }

  enum ReviewStatus {
    PENDING
    IN_REVIEW
    APPROVED
    REJECTED
    NEEDS_REVISION
  }

  enum ConsentType {
    GENERAL
    SPECIFIC
    CONDITIONAL
    ONGOING
  }

  enum RiskSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum RiskLikelihood {
    UNLIKELY
    POSSIBLE
    LIKELY
    CERTAIN
  }

  enum PartnerRole {
    CO_HOST
    SPONSOR
    SUPPORTER
    ADVISOR
    RESOURCE_PROVIDER
  }

  enum StakeholderRole {
    COMMUNITY_LEADER
    ELDER
    ORGANISATION_REP
    GOVERNMENT
    FUNDING_BODY
    CULTURAL_ADVISOR
  }

  enum RecordingAvailability {
    PUBLIC
    REGISTERED
    ATTENDEES
    RESTRICTED
    NONE
  }

  enum CulturalSensitivity {
    OPEN
    COMMUNITY_ONLY
    RESTRICTED
    SACRED
  }

  enum FundingSource {
    GOVERNMENT_GRANT
    PRIVATE_FOUNDATION
    CORPORATE_SPONSOR
    COMMUNITY_FUNDRAISING
    REGISTRATION_FEES
    INTERNAL_BUDGET
  }
`;

export default eventSchema;
