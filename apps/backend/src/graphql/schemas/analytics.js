/**
 * Analytics GraphQL Schema
 * Handles analytics, metrics, reporting, and data insights
 */

import { gql } from 'graphql-tag';

export const analyticsSchema = gql`
  extend type Query {
    # Dashboard analytics
    dashboardMetrics(organisationId: ID, timeframe: TimeframeInput): DashboardMetrics!

    # Entity analytics
    userAnalytics(userId: ID!, timeframe: TimeframeInput): UserAnalytics!
    organisationAnalytics(
      organisationId: ID!
      timeframe: TimeframeInput
    ): OrganisationAnalytics!
    projectAnalytics(projectId: ID!, timeframe: TimeframeInput): ProjectAnalytics!

    # Platform analytics
    platformMetrics(timeframe: TimeframeInput): PlatformMetrics!
    engagementAnalytics(timeframe: TimeframeInput): EngagementAnalytics!
    growthMetrics(timeframe: TimeframeInput): GrowthMetrics!

    # Impact analytics
    impactMetrics(
      organisationId: ID
      projectId: ID
      timeframe: TimeframeInput
    ): ImpactMetrics!
    socialImpactAnalysis(
      projects: [ID!]
      timeframe: TimeframeInput
    ): SocialImpactAnalysis!

    # Cultural analytics
    culturalSafetyMetrics(
      organisationId: ID
      timeframe: TimeframeInput
    ): CulturalSafetyMetrics!
    culturalEngagementAnalytics(
      organisationId: ID
      timeframe: TimeframeInput
    ): CulturalEngagementAnalytics!

    # Financial analytics
    financialAnalytics(
      organisationId: ID
      timeframe: TimeframeInput
    ): FinancialAnalytics!
    fundingAnalytics(organisationId: ID, timeframe: TimeframeInput): FundingAnalytics!

    # Operational analytics
    analyticsPerformanceMetrics(
      organisationId: ID
      timeframe: TimeframeInput
    ): PerformanceMetrics!
    efficiencyMetrics(organisationId: ID, timeframe: TimeframeInput): EfficiencyMetrics!

    # Reporting
    generateReport(input: ReportGenerationInput!): AnalyticsReport!
    reportHistory(organisationId: ID, limit: Int): [AnalyticsReport!]!

    # Data insights
    insights(organisationId: ID, category: InsightCategory, limit: Int): [DataInsight!]!
    predictions(
      organisationId: ID
      type: PredictionType
      timeframe: TimeframeInput
    ): [Prediction!]!

    # Benchmarking
    benchmarkData(organisationId: ID!, metrics: [BenchmarkMetric!]!): BenchmarkAnalysis!
    industryComparisons(organisationId: ID!, sector: String!): IndustryComparison!
  }

  extend type Mutation {
    # Analytics configuration
    updateAnalyticsSettings(
      organisationId: ID!
      settings: AnalyticsSettingsInput!
    ): AnalyticsSettings!

    # Custom metrics
    createCustomMetric(input: CreateCustomMetricInput!): CustomMetric!
    updateCustomMetric(id: ID!, input: UpdateCustomMetricInput!): CustomMetric!
    deleteCustomMetric(id: ID!): Boolean!

    # Report management
    scheduleReport(input: ScheduleReportInput!): ScheduledReport!
    updateScheduledReport(id: ID!, input: UpdateScheduledReportInput!): ScheduledReport!
    cancelScheduledReport(id: ID!): Boolean!

    # Data tracking
    trackEvent(input: EventTrackingInput!): Boolean!
    trackMetric(input: MetricTrackingInput!): Boolean!

    # Goals and targets
    setTarget(input: SetTargetInput!): Target!
    updateTarget(id: ID!, input: UpdateTargetInput!): Target!
    deleteTarget(id: ID!): Boolean!
  }

  extend type Subscription {
    metricsUpdated(organisationId: ID): DashboardMetrics!
    targetProgress(targetId: ID): TargetProgress!
    reportGenerated(organisationId: ID): AnalyticsReport!
    alertTriggered(organisationId: ID): AnalyticsAlert!
  }

  # Core Analytics Types
  type DashboardMetrics {
    organisationId: ID
    timeframe: Timeframe!

    # Key performance indicators
    kpis: [KPI!]!

    # Entity metrics
    users: UserMetricsSummary!
    projects: ProjectMetricsSummary!
    stories: StoryMetricsSummary!
    opportunities: OpportunityMetricsSummary!
    partnerships: PartnershipMetricsSummary!

    # Financial overview
    financial: FinancialMetricsSummary!

    # Impact overview
    impact: ImpactMetricsSummary!

    # Cultural safety overview
    culturalSafety: CulturalSafetyMetricsSummary!

    # Engagement overview
    engagement: EngagementMetricsSummary!

    # Growth metrics
    growth: GrowthMetricsSummary!

    # Alerts and notifications
    alerts: [AnalyticsAlert!]!

    # Trends
    trends: [MetricTrend!]!

    # Comparisons
    periodComparison: PeriodComparison!

    generatedAt: DateTime!
    nextUpdate: DateTime!
  }

  type UserAnalytics {
    userId: ID!
    timeframe: Timeframe!

    # Activity metrics
    loginFrequency: Int!
    sessionDuration: Float! # average minutes
    lastActive: DateTime!

    # Engagement metrics
    storiesCreated: Int!
    projectsJoined: Int!
    commentsPosted: Int!
    collaborations: Int!

    # Cultural engagement
    culturalActivities: Int!
    culturalSafetyScore: Float!

    # Network metrics
    connections: Int!
    networkGrowth: Float!

    # Performance indicators
    completionRate: Float!
    responseTime: Float!
    qualityScore: Float!

    # Goals and achievements
    goals: [UserGoal!]!
    achievements: [Achievement!]!

    generatedAt: DateTime!
  }

  type OrganisationAnalytics {
    organisationId: ID!
    timeframe: Timeframe!

    # Growth metrics
    memberGrowth: GrowthMetric!
    projectGrowth: GrowthMetric!
    partnershipGrowth: GrowthMetric!

    # Engagement metrics
    memberEngagement: EngagementMetric!
    projectParticipation: ParticipationMetric!
    collaborationLevel: CollaborationMetric!

    # Performance metrics
    projectSuccessRate: Float!
    memberSatisfaction: Float!
    culturalSafetyScore: Float!

    # Financial performance
    budgetUtilisation: Float!
    fundingEfficiency: Float!
    costPerProject: Money!

    # Impact measurement
    socialImpactScore: Float!
    beneficiariesReached: Int!
    outcomesAchieved: Int!

    # Cultural metrics
    culturalEngagement: CulturalEngagementMetric!
    indigenousParticipation: Float!
    culturalSafetyIncidents: Int!

    # Operational efficiency
    projectDeliveryTime: Float! # days
    resourceUtilisation: Float!
    teamEfficiency: Float!

    generatedAt: DateTime!
  }

  type ProjectAnalytics {
    projectId: ID!
    timeframe: Timeframe!

    # Progress metrics
    completionPercentage: Float!
    milestonesCompleted: Int!
    tasksCompleted: Int!

    # Timeline performance
    onTimeDelivery: Boolean!
    timelineVariance: Int! # days
    estimatedCompletion: DateTime

    # Budget performance
    budgetUtilisation: Float!
    costVariance: Money!
    burnRate: Money! # per day
    # Team performance
    teamSize: Int!
    teamStability: Float!
    teamProductivity: Float!

    # Collaboration metrics
    partnerOrganisations: Int!
    externalStakeholders: Int!
    communityEngagement: Float!

    # Quality metrics
    deliverableQuality: Float!
    stakeholderSatisfaction: Float!
    reworkRate: Float!

    # Impact metrics
    beneficiariesReached: Int!
    outcomesDelivered: [OutcomeMetric!]!
    socialImpactScore: Float!

    # Cultural metrics
    culturalSafetyScore: Float!
    culturalEngagementLevel: Float!

    generatedAt: DateTime!
  }

  type ImpactMetrics {
    timeframe: Timeframe!
    scope: ImpactScope!

    # Social impact
    socialImpact: SocialImpactMetrics!

    # Environmental impact
    environmentalImpact: EnvironmentalImpactMetrics!

    # Cultural impact
    culturalImpact: CulturalImpactMetrics!

    # Economic impact
    economicImpact: EconomicImpactMetrics!

    # Beneficiary metrics
    directBeneficiaries: BeneficiaryMetrics!
    indirectBeneficiaries: BeneficiaryMetrics!

    # Outcome measurement
    outcomes: [OutcomeMetric!]!
    impactStories: [ImpactStory!]!

    # Return on investment
    socialReturn: SocialReturnMetrics!

    # Sustainability metrics
    sustainabilityScore: Float!
    longTermImpact: LongTermImpactMetrics!

    generatedAt: DateTime!
  }

  type CulturalSafetyMetrics {
    organisationId: ID
    timeframe: Timeframe!

    # Overall safety score
    overallScore: Float!
    scoreHistory: [ScoreDataPoint!]!

    # Protocol compliance
    protocolCompliance: Float!
    protocolViolations: Int!

    # Training and awareness
    trainingCompletion: Float!
    awarenessLevel: Float!

    # Community feedback
    communityFeedback: CommunityFeedbackMetrics!
    culturalAdvisorSatisfaction: Float!

    # Incident tracking
    incidents: [CulturalSafetyIncident!]!
    incidentTrends: [IncidentTrend!]!

    # Improvement metrics
    improvements: [SafetyImprovement!]!
    recommendedActions: [String!]!

    # Verification metrics
    auditScore: Float!
    certificationStatus: CertificationStatus!

    generatedAt: DateTime!
  }

  type FinancialAnalytics {
    organisationId: ID
    timeframe: Timeframe!

    # Revenue metrics
    totalRevenue: Money!
    revenueGrowth: GrowthMetric!
    revenueBySource: [RevenueSource!]!

    # Expenditure metrics
    totalExpenditure: Money!
    expenditureByCategory: [ExpenditureCategory!]!
    costTrends: [CostTrend!]!

    # Profitability
    netIncome: Money!
    profitMargin: Float!
    profitability: ProfitabilityMetric!

    # Cash flow
    cashFlow: CashFlowMetric!
    cashPosition: Money!
    burnRate: Money!

    # Budget performance
    budgetVariance: Money!
    budgetAccuracy: Float!
    forecasting: ForecastingMetric!

    # Investment metrics
    roi: Float!
    investmentEfficiency: Float!

    # Funding metrics
    fundingReceived: Money!
    fundingUtilisation: Float!
    fundingDiversity: FundingDiversityMetric!

    generatedAt: DateTime!
  }

  type AnalyticsReport {
    id: ID!
    title: String!
    type: ReportType!
    format: ReportFormat!

    # Scope
    organisationId: ID
    projectIds: [ID!]!
    timeframe: Timeframe!

    # Content
    sections: [ReportSection!]!
    summary: ReportSummary!
    insights: [ReportInsight!]!
    recommendations: [Recommendation!]!

    # Cultural considerations
    culturalContext: ReportCulturalContext
    culturalSafety: Float!

    # Metadata
    generatedBy: User!
    generatedAt: DateTime!
    status: ReportStatus!

    # Distribution
    recipients: [ReportRecipient!]!
    accessLevel: AccessLevel!

    # Files and exports
    files: [ReportFile!]!
    downloadUrl: String

    # Version control
    version: String!
    previousVersion: AnalyticsReport
  }

  type DataInsight {
    id: ID!
    title: String!
    description: String!
    category: InsightCategory!
    importance: InsightImportance!

    # Data
    metric: String!
    value: Float!
    comparison: InsightComparison

    # Trend information
    trend: TrendDirection!
    trendStrength: Float!

    # Context
    timeframe: Timeframe!
    affectedAreas: [String!]!

    # Actions
    recommendedActions: [RecommendedAction!]!

    # Confidence
    confidenceLevel: Float!
    dataQuality: DataQuality!

    generatedAt: DateTime!
  }

  type BenchmarkAnalysis {
    organisationId: ID!

    # Benchmark categories
    performance: PerformanceBenchmark!
    financial: FinancialBenchmark!
    impact: ImpactBenchmark!
    cultural: CulturalBenchmark!

    # Peer comparison
    peerGroup: [Organisation!]!
    peerRanking: Int!
    peerPercentile: Float!

    # Industry comparison
    industryAverage: IndustryMetrics!
    industryRanking: Int!

    # Areas for improvement
    strengths: [BenchmarkStrength!]!
    improvements: [BenchmarkImprovement!]!

    # Recommendations
    recommendations: [BenchmarkRecommendation!]!

    calculatedAt: DateTime!
  }

  # Supporting Types
  type KPI {
    id: ID!
    name: String!
    description: String!
    value: Float!
    target: Float
    unit: String!
    status: KPIStatus!
    trend: TrendDirection!
    importance: KPIImportance!
    category: KPICategory!
  }

  type MetricTrend {
    metric: String!
    data: [DataPoint!]!
    trend: TrendDirection!
    changePercentage: Float!
    significance: TrendSignificance!
  }

  type GrowthMetric {
    current: Float!
    previous: Float!
    growth: Float!
    growthRate: Float!
    projection: Float
  }

  type Timeframe {
    start: DateTime!
    end: DateTime!
    period: TimePeriod!
    comparison: Timeframe
  }

  type Target {
    id: ID!
    name: String!
    description: String!
    metric: String!
    targetValue: Float!
    currentValue: Float!
    progress: Float!
    status: TargetStatus!
    deadline: DateTime!
    organisationId: ID!
    createdBy: User!
  }

  type CustomMetric {
    id: ID!
    name: String!
    description: String!
    formula: String!
    unit: String!
    category: String!
    organisationId: ID!
    isActive: Boolean!
    createdBy: User!
    createdAt: DateTime!
  }

  # Input Types
  input TimeframeInput {
    start: DateTime!
    end: DateTime!
    period: TimePeriod!
    comparison: TimeframeInput
  }

  input ReportGenerationInput {
    title: String!
    type: ReportType!
    format: ReportFormat!
    organisationId: ID
    projectIds: [ID!]
    timeframe: TimeframeInput!
    sections: [ReportSectionInput!]!
    includeInsights: Boolean
    includeRecommendations: Boolean
    culturalContext: Boolean
  }

  input CreateCustomMetricInput {
    name: String!
    description: String!
    formula: String!
    unit: String!
    category: String!
    organisationId: ID!
  }

  input SetTargetInput {
    name: String!
    description: String!
    metric: String!
    targetValue: Float!
    deadline: DateTime!
    organisationId: ID!
  }

  input EventTrackingInput {
    event: String!
    properties: JSON
    userId: ID
    organisationId: ID
    timestamp: DateTime
  }

  input AnalyticsSettingsInput {
    trackingEnabled: Boolean!
    anonymisation: Boolean!
    retentionPeriod: Int!
    culturalDataProtection: Boolean!
    shareWithPartners: Boolean!
    reportingFrequency: ReportingFrequency!
  }

  # Enums
  enum TimePeriod {
    HOUR
    DAY
    WEEK
    MONTH
    QUARTER
    YEAR
    ALL_TIME
  }

  enum ReportType {
    DASHBOARD
    PERFORMANCE
    IMPACT
    FINANCIAL
    CULTURAL_SAFETY
    COMPLIANCE
    CUSTOM
  }

  enum ReportFormat {
    PDF
    HTML
    CSV
    JSON
    EXCEL
  }

  enum InsightCategory {
    PERFORMANCE
    ENGAGEMENT
    GROWTH
    FINANCIAL
    CULTURAL
    OPERATIONAL
    STRATEGIC
  }

  enum InsightImportance {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum TrendDirection {
    INCREASING
    DECREASING
    STABLE
    VOLATILE
  }

  enum KPIStatus {
    ON_TRACK
    AT_RISK
    OFF_TRACK
    EXCEEDED
  }

  enum TargetStatus {
    NOT_STARTED
    IN_PROGRESS
    ON_TRACK
    AT_RISK
    ACHIEVED
    MISSED
  }

  enum DataQuality {
    POOR
    FAIR
    GOOD
    EXCELLENT
  }

  enum ReportingFrequency {
    DAILY
    WEEKLY
    MONTHLY
    QUARTERLY
    ANNUALLY
  }

  enum PredictionType {
    GROWTH
    PERFORMANCE
    FINANCIAL
    ENGAGEMENT
    IMPACT
  }

  enum BenchmarkMetric {
    PERFORMANCE
    FINANCIAL
    IMPACT
    CULTURAL_SAFETY
    ENGAGEMENT
    GROWTH
  }
`;

export default analyticsSchema;
