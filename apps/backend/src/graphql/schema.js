/**
 * ACT Farmhand AI - GraphQL Schema
 * Flexible querying interface for the complete ACT ecosystem
 */

import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # Core Types
  type Query {
    # Farm Workflow System
    farmStatus: FarmStatus!
    skillPods: [SkillPod!]!
    skillPod(id: ID!): SkillPod
    workflowTasks(status: TaskStatus, type: TaskType, limit: Int): [WorkflowTask!]!
    workflowTask(id: ID!): WorkflowTask

    # System Integration
    systemIntegration: SystemIntegrationStatus!
    dataPipelines: [DataPipeline!]!
    integrationMetrics: IntegrationMetrics!

    # Empathy Ledger Integration
    stories(limit: Int, themes: [String], culturalSafety: Float): [Story!]!
    story(id: ID!): Story
    organizations: [Organization!]!
    projects: [Project!]!

    # Opportunity Ecosystem
    opportunities(type: OpportunityType, minAmount: Float): [Opportunity!]!
    opportunity(id: ID!): Opportunity
    partners: [Partner!]!

    # Analytics & Insights
    impactAnalytics(timeframe: String): ImpactAnalytics!
    culturalSafetyMetrics: CulturalSafetyMetrics!
    systemPerformanceMetrics: SystemPerformanceMetrics!

    # Search & Intelligence
    intelligentSearch(query: String!, context: JSON): IntelligentSearchResult!
    generateInsights(topic: String!, includeVisualization: Boolean): InsightResponse!
  }

  type Mutation {
    # Farm Workflow Operations
    processQuery(query: String!, context: JSON): QueryProcessingResult!
    createWorkflowTask(input: CreateWorkflowTaskInput!): WorkflowTask!
    updateWorkflowTask(id: ID!, input: UpdateWorkflowTaskInput!): WorkflowTask!
    updateTaskStatus(id: ID!, status: TaskStatus!): WorkflowTask!

    # System Integration Operations
    runDataPipeline(pipelineName: String!): PipelineExecutionResult!
    syncSystems(systems: [String!], priority: SyncPriority): SystemSyncResult!

    # Content Creation
    createStory(input: CreateStoryInput!): Story!
    updateStory(id: ID!, input: UpdateStoryInput!): Story!

    # Impact Measurement
    calculateImpact(
      projectId: ID!
      includeVisualization: Boolean
    ): ImpactCalculationResult!
    generateImpactReport(timeframe: String!, format: ReportFormat): ImpactReport!
  }

  type Subscription {
    # Real-time Farm Activity
    farmActivity: FarmActivityUpdate!
    taskProgressUpdated(taskId: ID): TaskProgressUpdate!
    skillPodActivity: SkillPodActivityUpdate!

    # System Integration Events
    systemIntegrationEvents: SystemIntegrationEvent!
    pipelineExecution: PipelineExecutionUpdate!

    # Cultural Safety Alerts
    culturalSafetyAlert: CulturalSafetyAlert!
  }

  # Farm Workflow Types
  type FarmStatus {
    status: String!
    culturalSafetyScore: Float!
    systemPerformanceScore: Float!
    totalInsights: Int!
    activeTasks: Int!
    skillPodsActive: Int!
    continuousProcessing: Boolean!
    lastUpdate: DateTime!
  }

  type SkillPod {
    id: ID!
    name: String!
    farmElement: String!
    status: SkillPodStatus!
    progress: Float!
    insights: Int!
    lastActivity: String!
    performance: SkillPodPerformance!
    capabilities: [String!]!
    culturalSafetyScore: Float!
  }

  type SkillPodPerformance {
    avgResponseTime: Float!
    totalQueries: Int!
    successRate: Float!
    utilizationRate: Float!
  }

  type WorkflowTask {
    id: ID!
    title: String!
    description: String!
    type: TaskType!
    priority: TaskPriority!
    status: TaskStatus!
    farmStage: FarmStage!
    progress: Float!
    culturalSafety: Float!
    skillPodsAssigned: [String!]!
    insights: [TaskInsight!]!
    blockers: [TaskBlocker!]!
    farmMetaphor: String!
    estimatedYield: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TaskInsight {
    id: ID!
    type: String!
    content: String!
    confidence: Float!
    source: String!
    culturalSafety: Float!
    timestamp: DateTime!
  }

  type TaskBlocker {
    id: ID!
    type: String!
    description: String!
    severity: BlockerSeverity!
    timestamp: DateTime!
  }

  # System Integration Types
  type SystemIntegrationStatus {
    hubStatus: String!
    farmWorkflowConnected: Boolean!
    servicesRegistered: Int!
    activePipelines: Int!
    connectedSystems: Int!
    systemConnections: [SystemConnection!]!
    lastHealthCheck: DateTime!
  }

  type SystemConnection {
    name: String!
    status: ConnectionStatus!
    capabilities: [String!]!
    healthScore: Float!
    lastSync: DateTime
    syncEnabled: Boolean!
  }

  type DataPipeline {
    name: String!
    description: String!
    schedule: String!
    processors: [String!]!
    active: Boolean!
    lastExecution: DateTime
    successRate: Float!
    capabilities: [String!]!
    estimatedRuntime: String!
  }

  type IntegrationMetrics {
    integrationHub: IntegrationHubMetrics!
    farmWorkflow: FarmWorkflowMetrics!
    systemConnections: [SystemConnectionMetric!]!
    performanceSummary: PerformanceSummary!
  }

  type IntegrationHubMetrics {
    uptime: Float!
    memoryUsageMB: Float!
    activePipelines: Int!
    connectedSystems: Int!
    eventsProcessed: Int!
    lastHealthCheck: DateTime!
  }

  type FarmWorkflowMetrics {
    culturalSafety: Float!
    systemPerformance: Float!
    totalInsights: Int!
    activeTasks: Int!
    completedTasks: Int!
    communityEngagement: Float!
  }

  type SystemConnectionMetric {
    name: String!
    status: String!
    capabilities: Int!
    syncEnabled: Boolean!
    lastSync: DateTime
    endpoints: Int!
    healthScore: Float!
  }

  type PerformanceSummary {
    integrationHubUptime: Float!
    memoryUsageMB: Float!
    activePipelines: Int!
    connectedSystems: Int!
    overallHealthScore: Float!
  }

  # Content Types
  type Story {
    id: ID!
    title: String!
    content: String!
    summary: String
    themes: [String!]!
    culturalSafety: Float!
    impactMetrics: StoryImpactMetrics
    storyteller: Storyteller
    organization: Organization
    location: String
    createdAt: DateTime!
    updatedAt: DateTime!
    consent: ConsentStatus!
    visibility: StoryVisibility!
  }

  type Storyteller {
    id: ID!
    name: String
    organization: String
    location: String
    consentStatus: ConsentStatus!
  }

  type StoryImpactMetrics {
    participantsReached: Int
    communityBenefit: Float
    culturalSignificance: Float
    outcomesMeasured: [String!]
  }

  type ConsentStatus {
    hasConsent: Boolean!
    consentType: String!
    consentDate: DateTime
    withdrawalAvailable: Boolean!
    communityConsent: Boolean!
  }

  type Organization {
    id: ID!
    name: String!
    type: OrganizationType!
    location: String
    description: String
    culturalAlignment: Float
    projects: [Project!]!
    partnerships: [Partnership!]!
  }

  type Project {
    id: ID!
    name: String!
    description: String!
    status: ProjectStatus!
    themes: [String!]!
    location: String
    budget: Float
    culturalSafety: Float!
    impactMetrics: ProjectImpactMetrics
    stories: [Story!]!
    organization: Organization!
    startDate: DateTime
    endDate: DateTime
  }

  type ProjectImpactMetrics {
    participantCount: Int
    communityReach: Int
    outcomesAchieved: [String!]!
    socialReturnOnInvestment: Float
    culturalImpactScore: Float!
  }

  type Partnership {
    id: ID!
    name: String!
    type: PartnershipType!
    description: String!
    status: PartnershipStatus!
    organizations: [Organization!]!
    culturalAlignment: Float!
    startDate: DateTime
    endDate: DateTime
  }

  # Opportunity Types
  type Opportunity {
    id: ID!
    name: String!
    type: OpportunityType!
    description: String!
    amount: Float
    probability: Float!
    culturalAlignment: Float!
    deadline: DateTime
    requirements: [String!]!
    eligibilityCriteria: [String!]!
    matchScore: Float!
    source: String!
    discoveredAt: DateTime!
    analysis: OpportunityAnalysis
  }

  type OpportunityAnalysis {
    strengths: [String!]!
    challenges: [String!]!
    recommendations: [String!]!
    culturalConsiderations: [String!]!
    complianceRequirements: [String!]!
    estimatedEffort: String!
  }

  type Partner {
    id: ID!
    name: String!
    type: PartnerType!
    description: String!
    location: String
    capabilities: [String!]!
    culturalAlignment: Float!
    relationshipStrength: Float!
    collaborations: [Collaboration!]!
  }

  type Collaboration {
    id: ID!
    name: String!
    type: String!
    status: String!
    impact: String!
    startDate: DateTime
    endDate: DateTime
  }

  # Analytics Types
  type ImpactAnalytics {
    timeframe: String!
    totalProjects: Int!
    totalStories: Int!
    totalParticipants: Int!
    averageCulturalSafety: Float!
    socialReturnOnInvestment: Float!
    communityEngagementScore: Float!
    outcomeDistribution: [OutcomeMetric!]!
    geographicImpact: [GeographicImpactMetric!]!
    thematicAnalysis: [ThemeAnalysis!]!
  }

  type OutcomeMetric {
    outcome: String!
    count: Int!
    impactLevel: ImpactLevel!
    culturalSignificance: Float!
  }

  type GeographicImpactMetric {
    location: String!
    projects: Int!
    participants: Int!
    stories: Int!
    impactScore: Float!
  }

  type ThemeAnalysis {
    theme: String!
    frequency: Int!
    impactScore: Float!
    culturalRelevance: Float!
    trendDirection: TrendDirection!
  }

  type CulturalSafetyMetrics {
    overallScore: Float!
    protocolValidations: Int!
    communityConsentChecks: Int!
    sacredKnowledgeProtections: Int!
    indigenousDataSovereignty: DataSovereigntyStatus!
    violationsDetected: Int!
    mitigationActions: Int!
    communityFeedbackScore: Float!
  }

  type SystemPerformanceMetrics {
    uptime: Float!
    averageResponseTime: Float!
    errorRate: Float!
    throughput: Float!
    memoryEfficiency: Float!
    pipelineReliability: Float!
    skillPodPerformance: Float!
    culturalProtocolCompliance: Float!
  }

  # Search & Intelligence Types
  type IntelligentSearchResult {
    query: String!
    results: [SearchResult!]!
    insights: [SearchInsight!]!
    culturalSafety: Float!
    processingTime: Float!
    suggestedActions: [SuggestedAction!]!
  }

  type SearchResult {
    id: ID!
    type: SearchResultType!
    title: String!
    description: String!
    relevanceScore: Float!
    culturalAlignment: Float!
    source: String!
    url: String
    metadata: JSON
  }

  type SearchInsight {
    type: String!
    content: String!
    confidence: Float!
    culturalSafety: Float!
    actionable: Boolean!
  }

  type SuggestedAction {
    title: String!
    description: String!
    priority: ActionPriority!
    estimatedImpact: String!
    culturalConsiderations: [String!]!
  }

  type InsightResponse {
    topic: String!
    insights: [GeneratedInsight!]!
    visualizationData: JSON
    culturalSafety: Float!
    confidence: Float!
    recommendations: [String!]!
    sources: [String!]!
  }

  type GeneratedInsight {
    type: InsightType!
    title: String!
    content: String!
    evidence: [String!]!
    confidence: Float!
    culturalSafety: Float!
    actionable: Boolean!
    priority: InsightPriority!
  }

  # Mutation Result Types
  type QueryProcessingResult {
    success: Boolean!
    response: QueryResponse!
    workflowTasks: [WorkflowTask!]!
    processingTime: Float!
    culturalSafety: Float!
    skillPodsInvolved: [String!]!
  }

  type QueryResponse {
    insight: String!
    confidence: Float!
    farmMetaphor: String!
    actionableInsights: [String!]!
    recommendations: [String!]!
  }

  type PipelineExecutionResult {
    success: Boolean!
    pipeline: String!
    executionTime: Float!
    result: JSON!
    message: String!
  }

  type SystemSyncResult {
    success: Boolean!
    systemsSynced: [String!]!
    pipelineResults: [PipelineResult!]!
    totalPipelinesRun: Int!
    syncTimestamp: DateTime!
  }

  type PipelineResult {
    pipeline: String!
    success: Boolean!
    result: JSON!
  }

  type ImpactCalculationResult {
    success: Boolean!
    projectId: ID!
    impactMetrics: ProjectImpactMetrics!
    socialReturnOnInvestment: Float!
    culturalImpactScore: Float!
    visualizationData: JSON
    recommendations: [String!]!
  }

  type ImpactReport {
    id: ID!
    timeframe: String!
    format: ReportFormat!
    url: String!
    generatedAt: DateTime!
    summary: String!
    keyFindings: [String!]!
    culturalSafetyScore: Float!
  }

  # Subscription Types
  type FarmActivityUpdate {
    type: String!
    message: String!
    farmStage: FarmStage
    skillPod: String
    timestamp: DateTime!
  }

  type TaskProgressUpdate {
    taskId: ID!
    progress: Float!
    farmStage: FarmStage!
    insights: [TaskInsight!]!
    blockers: [TaskBlocker!]!
    timestamp: DateTime!
  }

  type SkillPodActivityUpdate {
    podId: String!
    name: String!
    status: SkillPodStatus!
    activity: String!
    insights: Int!
    performance: SkillPodPerformance!
    timestamp: DateTime!
  }

  type SystemIntegrationEvent {
    type: String!
    system: String
    message: String!
    data: JSON
    severity: EventSeverity!
    timestamp: DateTime!
  }

  type PipelineExecutionUpdate {
    pipeline: String!
    status: ExecutionStatus!
    progress: Float!
    message: String!
    timestamp: DateTime!
  }

  type CulturalSafetyAlert {
    level: AlertLevel!
    type: String!
    message: String!
    affectedSystems: [String!]!
    recommendedActions: [String!]!
    timestamp: DateTime!
  }

  # Input Types
  input CreateWorkflowTaskInput {
    title: String!
    description: String!
    type: TaskType!
    priority: TaskPriority!
    skillPodsRequired: [String!]!
    culturalConsiderations: [String!]
    expectedOutcomes: [String!]
  }

  input UpdateWorkflowTaskInput {
    title: String
    description: String
    priority: TaskPriority
    progress: Float
    insights: [TaskInsightInput!]
    blockers: [TaskBlockerInput!]
  }

  input TaskInsightInput {
    type: String!
    content: String!
    confidence: Float!
    source: String!
  }

  input TaskBlockerInput {
    type: String!
    description: String!
    severity: BlockerSeverity!
  }

  input CreateStoryInput {
    title: String!
    content: String!
    summary: String
    themes: [String!]!
    storytellerId: ID
    organizationId: ID
    location: String
    consent: ConsentStatusInput!
    visibility: StoryVisibility!
  }

  input UpdateStoryInput {
    title: String
    content: String
    summary: String
    themes: [String!]
    location: String
    consent: ConsentStatusInput
    visibility: StoryVisibility
  }

  input ConsentStatusInput {
    hasConsent: Boolean!
    consentType: String!
    withdrawalAvailable: Boolean!
    communityConsent: Boolean!
  }

  # Enums
  enum SkillPodStatus {
    IDLE
    PROCESSING
    COMPLETE
    ERROR
  }

  enum TaskType {
    STORY_COLLECTION
    FUNDING_OPPORTUNITY
    IMPACT_ANALYSIS
    SYSTEM_IMPROVEMENT
    GENERAL_INTELLIGENCE
    COMPLIANCE_CHECK
  }

  enum TaskPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  enum TaskStatus {
    PENDING
    IN_PROGRESS
    REVIEW
    COMPLETED
    DEFERRED
    CANCELLED
  }

  enum FarmStage {
    SEEDED
    GROWING
    BLOOMING
    HARVESTED
  }

  enum BlockerSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum ConnectionStatus {
    CONNECTED
    DISCONNECTED
    CONNECTING
    ERROR
  }

  enum SyncPriority {
    LOW
    NORMAL
    HIGH
    URGENT
  }

  enum OpportunityType {
    GRANT
    CONTRACT
    PARTNERSHIP
    FUNDING
    COLLABORATION
  }

  enum OrganizationType {
    COMMUNITY
    GOVERNMENT
    NGO
    CORPORATE
    ACADEMIC
    INDIGENOUS
  }

  enum ProjectStatus {
    PLANNING
    ACTIVE
    COMPLETED
    SUSPENDED
    CANCELLED
  }

  enum PartnershipType {
    FUNDING
    IMPLEMENTATION
    KNOWLEDGE_SHARING
    ADVOCACY
    CAPACITY_BUILDING
  }

  enum PartnershipStatus {
    ACTIVE
    PENDING
    COMPLETED
    INACTIVE
  }

  enum PartnerType {
    COMMUNITY
    GOVERNMENT
    CORPORATE
    ACADEMIC
    NGO
  }

  enum StoryVisibility {
    PUBLIC
    COMMUNITY
    ORGANIZATION
    PRIVATE
  }

  enum ReportFormat {
    PDF
    HTML
    JSON
    CSV
  }

  enum ImpactLevel {
    LOW
    MEDIUM
    HIGH
    TRANSFORMATIONAL
  }

  enum TrendDirection {
    UP
    DOWN
    STABLE
    EMERGING
  }

  enum DataSovereigntyStatus {
    FULLY_COMPLIANT
    PARTIALLY_COMPLIANT
    NON_COMPLIANT
    UNDER_REVIEW
  }

  enum SearchResultType {
    STORY
    PROJECT
    OPPORTUNITY
    ORGANIZATION
    INSIGHT
    RECOMMENDATION
  }

  enum ActionPriority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum InsightType {
    TREND_ANALYSIS
    OPPORTUNITY
    RISK
    RECOMMENDATION
    CULTURAL_INSIGHT
    PERFORMANCE
  }

  enum InsightPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  enum EventSeverity {
    INFO
    WARNING
    ERROR
    CRITICAL
  }

  enum ExecutionStatus {
    QUEUED
    RUNNING
    COMPLETED
    FAILED
    CANCELLED
  }

  enum AlertLevel {
    INFO
    WARNING
    CRITICAL
    EMERGENCY
  }
`;

export default typeDefs;
