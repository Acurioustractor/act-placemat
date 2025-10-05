/**
 * System GraphQL Schema
 * Handles system-level queries, health checks, configuration, and platform management
 */

import { gql } from 'graphql-tag';

export const systemSchema = gql`
  extend type Query {
    # System health and status
    health: SystemHealth!
    systemStatus: SystemStatus!
    systemInfo: SystemInfo!

    # Configuration
    systemConfig: SystemConfiguration!
    featureFlags: [FeatureFlag!]!
    maintenanceMode: MaintenanceStatus!

    # Platform statistics
    platformStats: PlatformStatistics!
    systemMetrics: SystemMetrics!
    performanceMetrics: SystemPerformanceMetrics!

    # Content and data management
    globalTags: [Tag!]!
    categories: [Category!]!
    skills: [Skill!]!
    sectors: [Sector!]!
    focusAreas: [FocusArea!]!

    # Location and geography
    countries: [Country!]!
    states(countryCode: String!): [State!]!
    regions(countryCode: String): [Region!]!

    # Cultural and indigenous data
    traditionalLands: [TraditionalLand!]!
    culturalProtocols: [CulturalProtocol!]!
    languages: [Language!]!

    # API and integration
    apiKeys(organisationId: ID!): [APIKey!]!
    integrations: [SystemIntegration!]!
    webhooks(organisationId: ID!): [Webhook!]!

    # Audit and logging
    auditLogs(
      limit: Int
      offset: Int
      filters: AuditLogFiltersInput
    ): AuditLogConnection!
    systemLogs(level: LogLevel, limit: Int, startDate: DateTime): [SystemLog!]!

    # Notifications and alerts
    systemAlerts(severity: AlertSeverity): [SystemAlert!]!
    notifications(userId: ID!): [SystemNotification!]!

    # Data migrations and backups
    migrationStatus: [MigrationStatus!]!
    backupStatus: BackupStatus!

    # Cultural safety and compliance
    culturalSafetyConfig: CulturalSafetyConfiguration!
    complianceStatus: ComplianceStatus!
  }

  extend type Mutation {
    # System administration
    toggleMaintenanceMode(enabled: Boolean!, message: String): MaintenanceStatus!
    updateSystemConfig(input: SystemConfigurationInput!): SystemConfiguration!
    updateFeatureFlag(id: ID!, enabled: Boolean!): FeatureFlag!

    # API and integration management
    createAPIKey(input: CreateAPIKeyInput!): APIKey!
    revokeAPIKey(id: ID!): Boolean!
    updateWebhook(id: ID!, input: UpdateWebhookInput!): Webhook!
    testWebhook(id: ID!): WebhookTestResult!

    # Content management
    createTag(input: CreateTagInput!): Tag!
    updateTag(id: ID!, input: UpdateTagInput!): Tag!
    mergeCategories(fromId: ID!, toId: ID!): Category!

    # Data management
    runMigration(migrationId: String!): MigrationResult!
    createBackup(input: CreateBackupInput!): BackupResult!
    restoreBackup(backupId: ID!): RestoreResult!

    # Notifications
    sendSystemNotification(input: SystemNotificationInput!): SystemNotification!
    markNotificationRead(id: ID!): SystemNotification!
    clearAllNotifications(userId: ID!): Boolean!

    # Cultural safety
    updateCulturalSafetyConfig(
      input: CulturalSafetyConfigurationInput!
    ): CulturalSafetyConfiguration!
    reportCulturalSafetyIncident(
      input: CulturalSafetyIncidentInput!
    ): CulturalSafetyIncident!

    # Cache and performance
    clearCache(cacheKey: String): Boolean!
    invalidateCache(pattern: String!): Boolean!
    optimizeDatabase: DatabaseOptimizationResult!

    # Emergency procedures
    emergencyShutdown(reason: String!): Boolean!
    emergencyAlert(input: EmergencyAlertInput!): EmergencyAlert!
  }

  extend type Subscription {
    systemHealthChanged: SystemHealth!
    systemAlert: SystemAlert!
    maintenanceStatusChanged: MaintenanceStatus!
    emergencyAlert: EmergencyAlert!
  }

  # Core System Types
  type SystemHealth {
    status: SystemHealthStatus!
    timestamp: DateTime!

    # Service health
    services: [ServiceHealth!]!

    # Database health
    database: DatabaseHealth!

    # External dependencies
    externalServices: [ExternalServiceHealth!]!

    # Performance indicators
    responseTime: Float!
    uptime: Float!

    # Resource usage
    resources: SystemResources!

    # Issues and warnings
    issues: [SystemIssue!]!
    warnings: [SystemWarning!]!
  }

  type SystemStatus {
    environment: Environment!
    version: String!
    buildNumber: String!
    deploymentTime: DateTime!

    # Operational status
    operationalStatus: OperationalStatus!
    maintenanceMode: Boolean!

    # Capacity and limits
    capacity: SystemCapacity!

    # Features and capabilities
    features: [SystemFeature!]!

    # Security status
    security: SecurityStatus!

    lastUpdated: DateTime!
  }

  type SystemConfiguration {
    # Platform settings
    platformName: String!
    platformUrl: String!
    supportEmail: String!

    # Authentication
    authentication: AuthenticationConfig!

    # Cultural safety
    culturalSafety: CulturalSafetyConfig!

    # Data retention
    dataRetention: DataRetentionConfig!

    # Notifications
    notifications: NotificationConfig!

    # API settings
    api: APIConfig!

    # Feature toggles
    features: SystemFeatureConfig!

    # Limits and quotas
    limits: SystemLimits!

    updatedAt: DateTime!
    updatedBy: User!
  }

  type PlatformStatistics {
    # User statistics
    totalUsers: Int!
    activeUsers: UserStatistics!
    newUsers: UserGrowthStatistics!

    # Organisation statistics
    totalOrganisations: Int!
    activeOrganisations: Int!
    organisationTypes: [OrganisationTypeStatistic!]!

    # Content statistics
    totalProjects: Int!
    totalStories: Int!
    totalOpportunities: Int!

    # Engagement statistics
    engagement: EngagementStatistics!

    # Geographic distribution
    geographic: GeographicStatistics!

    # Cultural statistics
    cultural: CulturalStatistics!

    # Financial statistics
    financial: FinancialStatistics!

    # Performance statistics
    performance: PerformanceStatistics!

    calculatedAt: DateTime!
  }

  type SystemMetrics {
    # Performance metrics
    responseTime: PerformanceMetric!
    throughput: PerformanceMetric!
    errorRate: PerformanceMetric!

    # Resource utilization
    cpu: ResourceMetric!
    memory: ResourceMetric!
    disk: ResourceMetric!
    network: ResourceMetric!

    # Database metrics
    database: DatabaseMetrics!

    # Cache metrics
    cache: CacheMetrics!

    # Queue metrics
    queues: [QueueMetric!]!

    # Security metrics
    security: SecurityMetrics!

    collectedAt: DateTime!
  }

  type FeatureFlag {
    id: ID!
    name: String!
    description: String!
    enabled: Boolean!

    # Targeting
    userPercentage: Float!
    targetUsers: [ID!]!
    targetOrganisations: [ID!]!

    # Configuration
    configuration: JSON

    # Metadata
    category: String!
    environment: [Environment!]!

    # Lifecycle
    createdBy: User!
    createdAt: DateTime!
    lastModified: DateTime!
    deprecatedAt: DateTime
  }

  type APIKey {
    id: ID!
    name: String!
    key: String! # This would be masked in real implementation
    # Permissions
    permissions: [APIPermission!]!
    rateLimit: RateLimit!

    # Usage
    usage: APIKeyUsage!

    # Restrictions
    allowedIPs: [String!]!
    allowedDomains: [String!]!

    # Lifecycle
    organisationId: ID!
    createdBy: User!
    createdAt: DateTime!
    lastUsed: DateTime
    expiresAt: DateTime
    isActive: Boolean!
  }

  type SystemIntegration {
    id: ID!
    name: String!
    type: IntegrationType!
    status: IntegrationStatus!

    # Configuration
    endpoint: String!
    version: String!

    # Health
    lastHealthCheck: DateTime!
    responseTime: Float!
    errorCount: Int!

    # Capabilities
    capabilities: [IntegrationCapability!]!

    # Usage statistics
    usage: IntegrationUsage!
  }

  type AuditLog {
    id: ID!
    action: String!
    resource: String!
    resourceId: ID

    # Actor information
    userId: ID
    organisationId: ID
    userAgent: String
    ipAddress: String

    # Changes
    changes: JSON
    previousValues: JSON
    newValues: JSON

    # Context
    context: JSON

    # Cultural safety
    culturalSafetyScore: Float
    culturalFlags: [String!]!

    # Metadata
    timestamp: DateTime!
    severity: AuditSeverity!
    category: AuditCategory!
  }

  type SystemLog {
    id: ID!
    level: LogLevel!
    message: String!

    # Source information
    service: String!
    component: String

    # Context
    context: JSON
    stackTrace: String

    # Request information
    requestId: String
    userId: ID

    # Performance
    duration: Float

    timestamp: DateTime!
  }

  type SystemAlert {
    id: ID!
    type: AlertType!
    severity: AlertSeverity!
    title: String!
    message: String!

    # Source
    source: String!
    component: String

    # Context
    context: JSON

    # Resolution
    resolved: Boolean!
    resolvedBy: User
    resolvedAt: DateTime
    resolution: String

    # Acknowledgment
    acknowledged: Boolean!
    acknowledgedBy: User
    acknowledgedAt: DateTime

    createdAt: DateTime!
  }

  type CulturalSafetyConfiguration {
    # Scoring and assessment
    scoringEnabled: Boolean!
    minimumScore: Float!

    # Review requirements
    reviewRequired: Boolean!
    reviewThreshold: Float!

    # Cultural protocols
    protocolsEnabled: Boolean!
    requiredProtocols: [String!]!

    # Community involvement
    communityReviewRequired: Boolean!
    elderApprovalRequired: Boolean!

    # Data sovereignty
    indigenousDataSovereignty: Boolean!
    dataRetentionRules: [DataRetentionRule!]!

    # Incident reporting
    incidentReportingEnabled: Boolean!
    anonymousReporting: Boolean!

    updatedAt: DateTime!
    updatedBy: User!
  }

  # Supporting Types
  type ServiceHealth {
    name: String!
    status: ServiceStatus!
    responseTime: Float!
    uptime: Float!
    lastCheck: DateTime!
    issues: [String!]!
  }

  type DatabaseHealth {
    connectionStatus: DatabaseConnectionStatus!
    responseTime: Float!
    activeConnections: Int!
    slowQueries: Int!
    locksWaiting: Int!
  }

  type SystemResources {
    cpu: ResourceUsage!
    memory: ResourceUsage!
    disk: ResourceUsage!
    network: NetworkUsage!
  }

  type ResourceUsage {
    current: Float!
    average: Float!
    peak: Float!
    threshold: Float!
    status: ResourceStatus!
  }

  type Tag {
    id: ID!
    name: String!
    slug: String!
    description: String
    colour: String
    category: String
    usageCount: Int!
    trending: Boolean!
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String!
    icon: String
    colour: String
    parentCategory: Category
    subcategories: [Category!]!
    itemCount: Int!
  }

  type TraditionalLand {
    id: ID!
    name: String!
    alternateNames: [String!]!
    description: String

    # Geographic information
    coordinates: GeoJSON!
    boundary: GeoJSON

    # Cultural information
    traditionalOwners: [String!]!
    languages: [Language!]!
    culturalSignificance: String

    # Acknowledgment
    acknowledgmentText: String!
    protocol: String

    # Data sovereignty
    dataPermissions: DataPermissions!
    contactRequired: Boolean!

    verified: Boolean!
    lastUpdated: DateTime!
  }

  type MigrationStatus {
    id: String!
    name: String!
    status: MigrationStatusType!
    startTime: DateTime
    endTime: DateTime
    progress: Float!
    errors: [String!]!
    warnings: [String!]!
  }

  type BackupStatus {
    lastBackup: DateTime!
    nextScheduledBackup: DateTime!
    backupCount: Int!
    totalSize: String!
    status: BackupStatusType!
    recentBackups: [BackupInfo!]!
  }

  # Connection Types
  type AuditLogConnection {
    edges: [AuditLogEdge!]!
    nodes: [AuditLog!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type AuditLogEdge {
    node: AuditLog!
    cursor: String!
  }

  # Input Types
  input SystemConfigurationInput {
    platformName: String
    platformUrl: String
    supportEmail: String
    culturalSafety: CulturalSafetyConfigInput
    dataRetention: DataRetentionConfigInput
    notifications: NotificationConfigInput
  }

  input CreateAPIKeyInput {
    name: String!
    organisationId: ID!
    permissions: [APIPermission!]!
    expiresAt: DateTime
    allowedIPs: [String!]
    allowedDomains: [String!]
  }

  input CreateTagInput {
    name: String!
    description: String
    colour: String
    category: String
  }

  input SystemNotificationInput {
    title: String!
    message: String!
    type: NotificationType!
    priority: NotificationPriority!
    targetUsers: [ID!]
    targetOrganisations: [ID!]
    actionUrl: String
  }

  input CulturalSafetyIncidentInput {
    title: String!
    description: String!
    severity: IncidentSeverity!
    category: IncidentCategory!
    resourceId: ID
    resourceType: String
    anonymous: Boolean
  }

  input AuditLogFiltersInput {
    userId: ID
    organisationId: ID
    action: String
    resource: String
    startDate: DateTime
    endDate: DateTime
    severity: AuditSeverity
    category: AuditCategory
  }

  input EmergencyAlertInput {
    title: String!
    message: String!
    severity: EmergencyAlertSeverity!
    affectedServices: [String!]
    estimatedResolution: DateTime
    actionRequired: String
  }

  # Enums
  enum SystemHealthStatus {
    HEALTHY
    DEGRADED
    UNHEALTHY
    CRITICAL
  }

  enum ServiceStatus {
    OPERATIONAL
    DEGRADED
    PARTIAL_OUTAGE
    MAJOR_OUTAGE
  }

  enum Environment {
    DEVELOPMENT
    TESTING
    STAGING
    PRODUCTION
  }

  enum OperationalStatus {
    OPERATIONAL
    DEGRADED_PERFORMANCE
    PARTIAL_OUTAGE
    MAJOR_OUTAGE
    MAINTENANCE
  }

  enum IntegrationType {
    REST_API
    WEBHOOK
    GRAPHQL
    DATABASE
    MESSAGE_QUEUE
    FILE_SYSTEM
    EXTERNAL_SERVICE
  }

  enum IntegrationStatus {
    ACTIVE
    INACTIVE
    ERROR
    MAINTENANCE
  }

  enum LogLevel {
    TRACE
    DEBUG
    INFO
    WARN
    ERROR
    FATAL
  }

  enum AlertType {
    SYSTEM
    SECURITY
    PERFORMANCE
    CULTURAL_SAFETY
    DATA_INTEGRITY
    USER_ACTIVITY
  }

  enum AlertSeverity {
    INFO
    LOW
    MEDIUM
    HIGH
    CRITICAL
    EMERGENCY
  }

  enum AuditSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum AuditCategory {
    USER_ACTION
    SYSTEM_ACTION
    SECURITY_EVENT
    DATA_CHANGE
    CONFIGURATION_CHANGE
    CULTURAL_SAFETY
    COMPLIANCE
  }

  enum MigrationStatusType {
    PENDING
    RUNNING
    COMPLETED
    FAILED
    ROLLED_BACK
  }

  enum BackupStatusType {
    HEALTHY
    WARNING
    ERROR
    IN_PROGRESS
  }

  enum APIPermission {
    READ
    WRITE
    DELETE
    ADMIN
    CULTURAL_DATA
  }

  enum NotificationType {
    INFO
    WARNING
    ERROR
    SUCCESS
    CULTURAL_ALERT
  }

  enum DatabaseConnectionStatus {
    CONNECTED
    DISCONNECTED
    SLOW
    ERROR
  }

  enum ResourceStatus {
    NORMAL
    WARNING
    CRITICAL
    OVER_LIMIT
  }

  enum EmergencyAlertSeverity {
    MAJOR_INCIDENT
    CRITICAL_OUTAGE
    SECURITY_BREACH
    DATA_LOSS
    CULTURAL_VIOLATION
  }
`;

export default systemSchema;
