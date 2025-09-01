/**
 * User GraphQL Schema
 * Handles user authentication, profiles, and user management
 */

import { gql } from 'graphql-tag';

export const userSchema = gql`
  extend type Query {
    # User queries
    user(id: ID!): User
    users(limit: Int, role: UserRole): [User!]!
    currentUser: User
    userProfile(id: ID!): UserProfile
    userActivity(userId: ID!, limit: Int): [UserActivity!]!
  }

  extend type Mutation {
    # User authentication
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    logout: Boolean!
    refreshToken: AuthPayload!

    # Profile management
    updateProfile(input: UpdateProfileInput!): UserProfile!
    updateUserSettings(input: UserSettingsInput!): UserSettings!

    # User management (admin)
    createUser(input: CreateUserInput!): User!
    updateUserRole(userId: ID!, role: UserRole!): User!
    deactivateUser(userId: ID!): User!
  }

  extend type Subscription {
    userStatusChanged(userId: ID): UserStatusUpdate!
    userActivity(userId: ID): UserActivity!
  }

  # Core User Types
  type User {
    id: ID!
    email: String!
    username: String
    firstName: String
    lastName: String
    fullName: String
    role: UserRole!
    status: UserStatus!
    profile: UserProfile
    settings: UserSettings

    # Relationships
    projects: [Project!]!
    stories: [Story!]!
    organizations: [Organization!]!

    # Metadata
    createdAt: DateTime!
    updatedAt: DateTime!
    lastLoginAt: DateTime
    isActive: Boolean!
  }

  type UserProfile {
    id: ID!
    userId: ID!
    bio: String
    location: String
    timezone: String
    avatar: String
    website: String
    socialMedia: SocialMediaLinks
    preferences: UserPreferences
    culturalBackground: String
    languages: [String!]!
    skills: [String!]!
    interests: [String!]!

    # Cultural Safety
    culturalConsiderations: [String!]!
    consentPreferences: ConsentPreferences!
    privacySettings: PrivacySettings!

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type UserSettings {
    id: ID!
    userId: ID!
    notifications: NotificationSettings!
    accessibility: AccessibilitySettings!
    privacy: PrivacySettings!
    language: String!
    timezone: String!

    updatedAt: DateTime!
  }

  type SocialMediaLinks {
    linkedin: String
    twitter: String
    facebook: String
    instagram: String
    github: String
  }

  type UserPreferences {
    theme: String!
    emailFrequency: EmailFrequency!
    contentLanguage: String!
    culturalSafetyLevel: CulturalSafetyLevel!
  }

  type ConsentPreferences {
    dataProcessing: Boolean!
    marketing: Boolean!
    research: Boolean!
    storySharing: Boolean!
    culturalDataSharing: Boolean!
    profileVisibility: ProfileVisibility!

    lastUpdated: DateTime!
  }

  type PrivacySettings {
    profileVisibility: ProfileVisibility!
    emailVisibility: EmailVisibility!
    activityVisibility: ActivityVisibility!
    storyVisibility: StoryVisibility!

    dataRetention: DataRetentionPreference!
    analyticsTracking: Boolean!

    lastUpdated: DateTime!
  }

  type NotificationSettings {
    email: Boolean!
    inApp: Boolean!
    push: Boolean!
    sms: Boolean!

    # Notification types
    projectUpdates: Boolean!
    storyMentions: Boolean!
    opportunityAlerts: Boolean!
    systemMessages: Boolean!
    culturalSafetyAlerts: Boolean!

    frequency: NotificationFrequency!
    quietHours: QuietHours
  }

  type AccessibilitySettings {
    screenReader: Boolean!
    highContrast: Boolean!
    largeText: Boolean!
    reducedMotion: Boolean!
    audioDescriptions: Boolean!
    keyboardNavigation: Boolean!
  }

  type QuietHours {
    enabled: Boolean!
    startTime: String!
    endTime: String!
    timezone: String!
  }

  # Authentication Types
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
    expiresAt: DateTime!
  }

  # Activity Tracking
  type UserActivity {
    id: ID!
    userId: ID!
    type: ActivityType!
    action: String!
    resource: String
    resourceId: ID
    metadata: JSON
    ipAddress: String
    userAgent: String
    location: String

    timestamp: DateTime!
  }

  type UserStatusUpdate {
    userId: ID!
    status: UserStatus!
    lastSeen: DateTime!
    isOnline: Boolean!
  }

  # Input Types
  input LoginInput {
    email: String!
    password: String!
    rememberMe: Boolean
  }

  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    username: String
    organizationId: ID
    inviteCode: String
  }

  input UpdateProfileInput {
    firstName: String
    lastName: String
    bio: String
    location: String
    timezone: String
    website: String
    socialMedia: SocialMediaLinksInput
    culturalBackground: String
    languages: [String!]
    skills: [String!]
    interests: [String!]
    culturalConsiderations: [String!]
  }

  input SocialMediaLinksInput {
    linkedin: String
    twitter: String
    facebook: String
    instagram: String
    github: String
  }

  input UserSettingsInput {
    notifications: NotificationSettingsInput
    accessibility: AccessibilitySettingsInput
    privacy: PrivacySettingsInput
    language: String
    timezone: String
  }

  input NotificationSettingsInput {
    email: Boolean
    inApp: Boolean
    push: Boolean
    sms: Boolean
    projectUpdates: Boolean
    storyMentions: Boolean
    opportunityAlerts: Boolean
    systemMessages: Boolean
    culturalSafetyAlerts: Boolean
    frequency: NotificationFrequency
    quietHours: QuietHoursInput
  }

  input AccessibilitySettingsInput {
    screenReader: Boolean
    highContrast: Boolean
    largeText: Boolean
    reducedMotion: Boolean
    audioDescriptions: Boolean
    keyboardNavigation: Boolean
  }

  input PrivacySettingsInput {
    profileVisibility: ProfileVisibility
    emailVisibility: EmailVisibility
    activityVisibility: ActivityVisibility
    storyVisibility: StoryVisibility
    dataRetention: DataRetentionPreference
    analyticsTracking: Boolean
  }

  input QuietHoursInput {
    enabled: Boolean!
    startTime: String!
    endTime: String!
    timezone: String!
  }

  input CreateUserInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    username: String
    role: UserRole!
    organizationId: ID
  }

  # Enums
  enum UserRole {
    ADMIN
    MANAGER
    COORDINATOR
    MEMBER
    STORYTELLER
    VIEWER
    GUEST
  }

  enum UserStatus {
    ACTIVE
    INACTIVE
    PENDING
    SUSPENDED
    ARCHIVED
  }

  enum ActivityType {
    LOGIN
    LOGOUT
    PROFILE_UPDATE
    PROJECT_CREATE
    PROJECT_UPDATE
    STORY_CREATE
    STORY_UPDATE
    COMMENT_CREATE
    OPPORTUNITY_VIEW
    SYSTEM_ACTION
  }

  enum EmailFrequency {
    IMMEDIATE
    DAILY
    WEEKLY
    MONTHLY
    NEVER
  }

  enum CulturalSafetyLevel {
    STRICT
    STANDARD
    RELAXED
  }

  enum ProfileVisibility {
    PUBLIC
    COMMUNITY
    ORGANIZATION
    PRIVATE
  }

  enum EmailVisibility {
    PUBLIC
    MEMBERS
    HIDDEN
  }

  enum ActivityVisibility {
    PUBLIC
    COMMUNITY
    ORGANIZATION
    PRIVATE
  }

  enum StoryVisibility {
    PUBLIC
    COMMUNITY
    ORGANIZATION
    PRIVATE
  }

  enum DataRetentionPreference {
    MINIMAL
    STANDARD
    EXTENDED
    INDEFINITE
  }

  enum NotificationFrequency {
    IMMEDIATE
    HOURLY
    DAILY
    WEEKLY
    MONTHLY
  }
`;

export default userSchema;
