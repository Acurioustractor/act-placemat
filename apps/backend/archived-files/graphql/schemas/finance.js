/**
 * Finance GraphQL Schema
 * Handles financial tracking, budgets, transactions, and funding management
 */

import { gql } from 'graphql-tag';

export const financeSchema = gql`
  extend type Query {
    # Financial overview
    financialSummary(organisationId: ID, projectId: ID): FinancialSummary!
    budget(id: ID!): Budget
    budgets(
      limit: Int
      offset: Int
      filters: BudgetFiltersInput
      organisationId: ID
    ): BudgetConnection!

    # Transactions
    transaction(id: ID!): Transaction
    transactions(
      limit: Int
      offset: Int
      filters: TransactionFiltersInput
    ): TransactionConnection!

    # Funding and grants
    funding(id: ID!): Funding
    fundings(
      limit: Int
      offset: Int
      status: FundingStatus
      type: FundingType
    ): FundingConnection!
    fundingOpportunities(limit: Int): [FundingOpportunity!]!

    # Reports and analytics
    financialReport(input: FinancialReportInput!): FinancialReport!
    cashflowProjection(organisationId: ID!, months: Int): CashflowProjection!

    # Impact and ROI
    impactFinancials(projectId: ID!): ImpactFinancials!
    socialReturn(projectId: ID!): SocialReturnOnInvestment!
  }

  extend type Mutation {
    # Budget management
    createBudget(input: CreateBudgetInput!): Budget!
    updateBudget(id: ID!, input: UpdateBudgetInput!): Budget!
    approveBudget(id: ID!, input: BudgetApprovalInput!): Budget!

    # Transaction management
    createTransaction(input: CreateTransactionInput!): Transaction!
    updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
    reconcileTransaction(id: ID!, input: ReconciliationInput!): Transaction!

    # Funding management
    createFunding(input: CreateFundingInput!): Funding!
    updateFundingStatus(id: ID!, status: FundingStatus!, notes: String): Funding!
    submitFundingReport(id: ID!, input: FundingReportInput!): FundingReport!

    # Financial planning
    createFinancialPlan(input: CreateFinancialPlanInput!): FinancialPlan!
    updateCashflowProjection(
      organisationId: ID!
      input: CashflowProjectionInput!
    ): CashflowProjection!
  }

  extend type Subscription {
    budgetUpdated(budgetId: ID): Budget!
    transactionCreated(organisationId: ID): Transaction!
    fundingStatusChanged(fundingId: ID): Funding!
    financialAlert(organisationId: ID): FinancialAlert!
  }

  # Core Financial Types
  type FinancialSummary {
    organisationId: ID
    projectId: ID

    # Current financial position
    totalRevenue: Money!
    totalExpenses: Money!
    netIncome: Money!
    cashOnHand: Money!
    accountsReceivable: Money!
    accountsPayable: Money!

    # Budget performance
    budgetUtilization: Float!
    budgetVariance: Money!
    forecastAccuracy: Float!

    # Funding status
    totalFunding: Money!
    utilisedFunding: Money!
    remainingFunding: Money!
    pendingFunding: Money!

    # Key metrics
    burnRate: Money!
    runway: Int! # months
    growthRate: Float!
    profitMargin: Float!

    # Period comparison
    periodStart: DateTime!
    periodEnd: DateTime!
    previousPeriodComparison: PeriodComparison!

    # Alerts and indicators
    alerts: [FinancialAlert!]!
    healthScore: Float!

    generatedAt: DateTime!
  }

  type Budget {
    id: ID!
    name: String!
    description: String
    type: BudgetType!
    status: BudgetStatus!

    # Scope
    organisation: Organisation!
    project: Project
    department: String

    # Budget period
    startDate: DateTime!
    endDate: DateTime!
    fiscalYear: String!

    # Budget lines
    budgetLines: [BudgetLine!]!
    totalBudget: Money!
    totalAllocated: Money!
    totalSpent: Money!
    remaining: Money!

    # Categories
    categories: [BudgetCategory!]!

    # Approval and management
    approvals: [BudgetApproval!]!
    isApproved: Boolean!
    approvedBy: User
    approvedAt: DateTime

    # Tracking and reporting
    variance: Money!
    utilizationRate: Float!
    forecastAccuracy: Float!

    # Cultural and social considerations
    culturalAllocations: [CulturalAllocation!]!
    socialImpactBudget: Money!

    # Metadata
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type BudgetLine {
    id: ID!
    name: String!
    description: String
    category: BudgetCategory!

    # Financial amounts
    budgetedAmount: Money!
    allocatedAmount: Money!
    spentAmount: Money!
    remainingAmount: Money!

    # Tracking
    variance: Money!
    variancePercentage: Float!

    # Approval
    requiresApproval: Boolean!
    approved: Boolean!

    # Dependencies
    dependencies: [BudgetLine!]!

    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type BudgetCategory {
    id: ID!
    name: String!
    code: String!
    description: String
    type: CategoryType!
    parentCategory: BudgetCategory
    subcategories: [BudgetCategory!]!

    # Financial tracking
    totalBudgeted: Money!
    totalSpent: Money!
    utilization: Float!

    # Cultural considerations
    culturalSensitivity: CulturalSensitivity!
    culturalApprovalRequired: Boolean!
  }

  type Transaction {
    id: ID!
    reference: String!
    description: String!
    type: TransactionType!
    status: TransactionStatus!

    # Financial details
    amount: Money!
    gstAmount: Money
    netAmount: Money!

    # Parties
    from: TransactionParty!
    to: TransactionParty!

    # Categorisation
    category: BudgetCategory!
    project: Project
    budget: Budget

    # Timing
    transactionDate: DateTime!
    processedDate: DateTime
    settledDate: DateTime

    # Documentation
    receipt: String
    invoice: String
    approvals: [TransactionApproval!]!

    # Reconciliation
    reconciled: Boolean!
    reconciledBy: User
    reconciledAt: DateTime
    bankReference: String

    # Cultural considerations
    culturalApproval: CulturalApproval
    culturalImpact: String

    # Metadata
    tags: [String!]!
    notes: String
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TransactionParty {
    type: PartyType!
    organisation: Organisation
    user: User
    externalEntity: ExternalEntity
    bankAccount: BankAccount
  }

  type ExternalEntity {
    id: ID!
    name: String!
    type: ExternalEntityType!
    abn: String
    contactInfo: ContactInfo
    paymentDetails: PaymentDetails
  }

  type BankAccount {
    id: ID!
    name: String!
    accountNumber: String!
    bsb: String
    bank: String!
    currency: String!
    balance: Money
    lastUpdated: DateTime!
  }

  type Funding {
    id: ID!
    title: String!
    description: String!
    type: FundingType!
    status: FundingStatus!

    # Funding details
    amount: Money!
    currency: String!
    fundingBody: FundingBody!
    grantNumber: String

    # Application process
    applicationDate: DateTime!
    decisionDate: DateTime
    startDate: DateTime
    endDate: DateTime

    # Project/organisation
    organisation: Organisation!
    project: Project

    # Requirements and conditions
    conditions: [String!]!
    reportingRequirements: [ReportingRequirement!]!
    milestones: [FundingMilestone!]!

    # Financial tracking
    receivedAmount: Money!
    utilisedAmount: Money!
    remainingAmount: Money!

    # Reporting
    reports: [FundingReport!]!
    nextReportDue: DateTime

    # Cultural considerations
    culturalRequirements: [String!]!
    culturalOversight: CulturalOversight

    # Metadata
    appliedBy: User!
    managedBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type FundingBody {
    id: ID!
    name: String!
    type: FundingBodyType!
    website: String
    contactInfo: ContactInfo!
    requirements: [String!]!
    focusAreas: [String!]!
  }

  type FundingMilestone {
    id: ID!
    title: String!
    description: String!
    dueDate: DateTime!
    status: MilestoneStatus!
    amount: Money!
    completedDate: DateTime
    evidence: [String!]!
  }

  type FundingReport {
    id: ID!
    funding: Funding!
    type: ReportType!
    period: ReportPeriod!

    # Financial reporting
    expenditures: [Expenditure!]!
    totalSpent: Money!
    budgetVariance: Money!

    # Progress reporting
    achievements: [String!]!
    challenges: [String!]!
    outcomes: [String!]!

    # Cultural reporting
    culturalEngagement: CulturalEngagement!
    communityBenefit: [CommunityBenefit!]!

    # Compliance
    complianceChecklist: [ComplianceItem!]!

    # Submission
    submittedBy: User!
    submittedAt: DateTime!
    status: ReportStatus!
    feedback: [String!]!
  }

  type FinancialReport {
    id: ID!
    title: String!
    type: FinancialReportType!
    period: ReportPeriod!

    # Financial data
    revenue: [RevenueItem!]!
    expenses: [ExpenseItem!]!
    profitLoss: ProfitLoss!
    balanceSheet: BalanceSheet!
    cashflow: Cashflow!

    # Analysis
    keyMetrics: [FinancialMetric!]!
    trends: [FinancialTrend!]!
    insights: [String!]!
    recommendations: [String!]!

    # Cultural and social impact
    socialImpactMetrics: SocialImpactMetrics!
    culturalInvestment: CulturalInvestment!

    generatedAt: DateTime!
    generatedBy: User!
  }

  type CashflowProjection {
    organisationId: ID!
    projectionPeriod: Int! # months
    # Current position
    startingBalance: Money!

    # Projected inflows
    projectedIncome: [CashflowItem!]!
    totalProjectedIncome: Money!

    # Projected outflows
    projectedExpenses: [CashflowItem!]!
    totalProjectedExpenses: Money!

    # Monthly projections
    monthlyProjections: [MonthlyCashflow!]!

    # Analysis
    endingBalance: Money!
    lowestBalance: Money!
    cashShortfalls: [CashShortfall!]!
    breakEvenMonth: Int

    # Assumptions
    assumptions: [String!]!
    confidenceLevel: Float!

    generatedAt: DateTime!
  }

  type ImpactFinancials {
    projectId: ID!

    # Investment
    totalInvestment: Money!
    publicFunding: Money!
    privateFunding: Money!
    inkindContributions: Money!

    # Returns
    directBenefits: Money!
    indirectBenefits: Money!
    socialValue: Money!
    culturalValue: Money!
    environmentalValue: Money!

    # Ratios
    socialReturnRatio: Float!
    culturalReturnRatio: Float!
    benefitCostRatio: Float!

    # Beneficiaries
    directBeneficiaries: Int!
    indirectBeneficiaries: Int!
    communityReach: Int!

    calculatedAt: DateTime!
  }

  type SocialReturnOnInvestment {
    projectId: ID!

    # SROI calculation
    totalSocialValue: Money!
    totalInvestment: Money!
    sroiRatio: Float!

    # Value breakdown
    outcomes: [SROIOutcome!]!
    stakeholderGroups: [SROIStakeholder!]!

    # Methodology
    methodology: String!
    assumptions: [String!]!
    validationMethod: String!

    # Cultural considerations
    culturalValueRecognition: Boolean!
    indigenousDataSovereignty: Boolean!

    calculatedAt: DateTime!
    validatedBy: User
  }

  # Supporting types
  type Money {
    amount: Float!
    currency: String!
    formattedAmount: String!
  }

  type PeriodComparison {
    revenueChange: Float!
    expenseChange: Float!
    netIncomeChange: Float!
    growthRate: Float!
    changeDescription: String!
  }

  type FinancialAlert {
    id: ID!
    type: AlertType!
    severity: AlertSeverity!
    message: String!
    description: String
    actionRequired: String
    dueDate: DateTime
    acknowledged: Boolean!
    acknowledgedBy: User
    acknowledgedAt: DateTime
    createdAt: DateTime!
  }

  type CulturalAllocation {
    purpose: String!
    amount: Money!
    community: String
    elder: String
    culturalAdvisor: CulturalAdvisor
    approved: Boolean!
  }

  type BudgetApproval {
    id: ID!
    approver: User!
    level: ApprovalLevel!
    status: ApprovalStatus!
    comments: String
    approvedAmount: Money
    createdAt: DateTime!
  }

  type TransactionApproval {
    id: ID!
    approver: User!
    status: ApprovalStatus!
    comments: String
    approvedAt: DateTime
  }

  type CulturalApproval {
    required: Boolean!
    status: ApprovalStatus
    approver: CulturalAdvisor
    conditions: [String!]!
    approvedAt: DateTime
  }

  # Connection types
  type BudgetConnection {
    edges: [BudgetEdge!]!
    nodes: [Budget!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type BudgetEdge {
    node: Budget!
    cursor: String!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    nodes: [Transaction!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type TransactionEdge {
    node: Transaction!
    cursor: String!
  }

  type FundingConnection {
    edges: [FundingEdge!]!
    nodes: [Funding!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type FundingEdge {
    node: Funding!
    cursor: String!
  }

  # Input Types
  input CreateBudgetInput {
    name: String!
    description: String
    type: BudgetType!
    organisationId: ID!
    projectId: ID
    startDate: DateTime!
    endDate: DateTime!
    budgetLines: [BudgetLineInput!]!
  }

  input BudgetLineInput {
    name: String!
    categoryId: ID!
    budgetedAmount: MoneyInput!
    description: String
  }

  input UpdateBudgetInput {
    name: String
    description: String
    budgetLines: [BudgetLineInput!]
  }

  input MoneyInput {
    amount: Float!
    currency: String!
  }

  input CreateTransactionInput {
    description: String!
    type: TransactionType!
    amount: MoneyInput!
    from: TransactionPartyInput!
    to: TransactionPartyInput!
    categoryId: ID!
    projectId: ID
    transactionDate: DateTime!
    receipt: String
    invoice: String
  }

  input TransactionPartyInput {
    type: PartyType!
    organisationId: ID
    userId: ID
    externalEntityId: ID
    bankAccountId: ID
  }

  input CreateFundingInput {
    title: String!
    description: String!
    type: FundingType!
    amount: MoneyInput!
    fundingBodyId: ID!
    organisationId: ID!
    projectId: ID
    applicationDate: DateTime!
    startDate: DateTime
    endDate: DateTime
    conditions: [String!]
  }

  input BudgetFiltersInput {
    status: BudgetStatus
    type: BudgetType
    organisationId: ID
    projectId: ID
    startDate: DateTime
    endDate: DateTime
  }

  input TransactionFiltersInput {
    type: TransactionType
    status: TransactionStatus
    categoryId: ID
    projectId: ID
    dateRange: DateRangeInput
    amountRange: MoneyRangeInput
  }

  input MoneyRangeInput {
    min: Float
    max: Float
    currency: String!
  }

  input FinancialReportInput {
    type: FinancialReportType!
    organisationId: ID!
    projectId: ID
    period: ReportPeriodInput!
  }

  input ReportPeriodInput {
    startDate: DateTime!
    endDate: DateTime!
  }

  # Enums
  enum BudgetType {
    OPERATIONAL
    PROJECT
    CAPITAL
    GRANT
    PROGRAM
  }

  enum BudgetStatus {
    DRAFT
    SUBMITTED
    APPROVED
    ACTIVE
    COMPLETED
    CANCELLED
  }

  enum TransactionType {
    INCOME
    EXPENSE
    TRANSFER
    ADJUSTMENT
    REFUND
  }

  enum TransactionStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    CANCELLED
    REVERSED
  }

  enum FundingType {
    GOVERNMENT_GRANT
    PRIVATE_FOUNDATION
    CORPORATE_SPONSORSHIP
    CROWDFUNDING
    IMPACT_INVESTMENT
    LOAN
    DONATION
  }

  enum FundingStatus {
    PLANNING
    APPLIED
    UNDER_REVIEW
    APPROVED
    ACTIVE
    COMPLETED
    REJECTED
    CANCELLED
  }

  enum CategoryType {
    REVENUE
    EXPENSE
    ASSET
    LIABILITY
    EQUITY
  }

  enum PartyType {
    ORGANISATION
    USER
    EXTERNAL_ENTITY
    BANK_ACCOUNT
  }

  enum ExternalEntityType {
    VENDOR
    CONTRACTOR
    GOVERNMENT
    BANK
    FUNDING_BODY
    COMMUNITY_GROUP
  }

  enum FundingBodyType {
    GOVERNMENT
    FOUNDATION
    CORPORATE
    NGO
    INTERNATIONAL
    COMMUNITY
  }

  enum MilestoneStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    OVERDUE
    CANCELLED
  }

  enum ReportType {
    FINANCIAL
    PROGRESS
    FINAL
    INTERIM
    COMPLIANCE
  }

  enum ReportStatus {
    DRAFT
    SUBMITTED
    UNDER_REVIEW
    APPROVED
    REJECTED
    REVISION_REQUIRED
  }

  enum FinancialReportType {
    PROFIT_LOSS
    BALANCE_SHEET
    CASH_FLOW
    BUDGET_VARIANCE
    COMPREHENSIVE
  }

  enum ApprovalLevel {
    SUPERVISOR
    MANAGER
    DIRECTOR
    BOARD
    EXTERNAL
  }

  enum ApprovalStatus {
    PENDING
    APPROVED
    REJECTED
    CONDITIONAL
    WITHDRAWN
  }

  enum AlertType {
    BUDGET_VARIANCE
    CASH_SHORTAGE
    OVERDUE_PAYMENT
    COMPLIANCE_ISSUE
    FUNDING_DEADLINE
    APPROVAL_REQUIRED
  }

  enum AlertSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }
`;

export default financeSchema;
