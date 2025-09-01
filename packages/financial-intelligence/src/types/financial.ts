/**
 * Financial Intelligence Agent - Core Financial Types
 * 
 * Data models for financial operations, cash flow, budgeting, and forecasting
 * Integrated with governance and consent frameworks
 */

import { z } from 'zod';
import { 
  ConsentLevel, 
  ConsentScope, 
  TransactionClass,
  type ConsentMetadata,
  type SovereigntyMetadata,
  type PolicyDecision 
} from './governance';

// === CORE FINANCIAL ENTITIES ===

/**
 * Australian financial account types
 */
export enum AccountType {
  CHECKING = 'checking',           // Transaction accounts
  SAVINGS = 'savings',             // Savings accounts  
  BUSINESS = 'business',           // Business operating accounts
  TRUST = 'trust',                 // Trust accounts
  GRANT = 'grant',                 // Grant-specific accounts
  COMMUNITY = 'community',         // Community-managed accounts
  PARTNERSHIP = 'partnership',     // Partnership accounts
  INVESTMENT = 'investment',       // Investment accounts
  ESCROW = 'escrow'               // Escrow and holding accounts
}

/**
 * Cash flow categories aligned with Australian community organisations
 */
export enum CashFlowCategory {
  // Income categories
  DONATIONS = 'donations',
  GRANTS_GOVERNMENT = 'grants_government',
  GRANTS_FOUNDATION = 'grants_foundation',
  EARNED_REVENUE = 'earned_revenue',
  INVESTMENT_INCOME = 'investment_income',
  MEMBERSHIP_FEES = 'membership_fees',
  PARTNERSHIP_INCOME = 'partnership_income',
  
  // Expense categories
  PROGRAMS = 'programs',
  ADMINISTRATION = 'administration',
  FUNDRAISING = 'fundraising',
  STAFF_COSTS = 'staff_costs',
  INFRASTRUCTURE = 'infrastructure',
  COMMUNITY_BENEFITS = 'community_benefits',
  CAPACITY_BUILDING = 'capacity_building',
  COMPLIANCE_COSTS = 'compliance_costs'
}

/**
 * Budget variance alert thresholds
 */
export enum VarianceLevel {
  GREEN = 'green',        // Within 5% of budget
  AMBER = 'amber',        // 5-15% variance
  RED = 'red',           // 15-25% variance  
  CRITICAL = 'critical'   // >25% variance
}

// === FINANCIAL ACCOUNT SCHEMA ===

export const FinancialAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(AccountType),
  
  // Account details
  accountNumber: z.string().optional(),
  bsb: z.string().length(6).optional(), // Australian BSB format
  institutionName: z.string(),
  
  // Balance information
  currentBalance: z.number(),
  availableBalance: z.number(),
  currency: z.string().default('AUD'),
  
  // Governance
  consentRequired: z.nativeEnum(ConsentLevel).default(ConsentLevel.BASIC_OPERATIONS),
  allowedScopes: z.array(z.nativeEnum(ConsentScope)).default([ConsentScope.CASH_FLOW]),
  
  // Australian compliance
  australianAccount: z.boolean().default(true),
  regulatedInstitution: z.boolean().default(true),
  
  // Metadata
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  lastSyncedAt: z.date().optional()
});

export type FinancialAccount = z.infer<typeof FinancialAccountSchema>;

// === TRANSACTION SCHEMA ===

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  
  // Basic transaction data
  amount: z.number(),
  currency: z.string().default('AUD'),
  description: z.string(),
  reference: z.string().optional(),
  
  // Classification
  category: z.nativeEnum(CashFlowCategory),
  classification: z.nativeEnum(TransactionClass),
  
  // Account information
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  externalParty: z.string().optional(),
  
  // Timing
  transactionDate: z.date(),
  processedDate: z.date().optional(),
  
  // Status
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  
  // Governance metadata (references to full objects)
  consentId: z.string().uuid(),
  sovereigntyId: z.string().uuid(),
  appliedPolicyIds: z.array(z.string()),
  
  // Australian tax implications
  gstApplicable: z.boolean().default(false),
  gstAmount: z.number().optional(),
  taxDeductible: z.boolean().default(false),
  
  // Audit and approval
  approvedBy: z.string().optional(),
  automatedDecision: z.boolean().default(false),
  agentId: z.string().optional(),
  
  // Metadata
  createdAt: z.date(),
  lastModifiedAt: z.date()
});

export type Transaction = z.infer<typeof TransactionSchema>;

// === BUDGETING SCHEMAS ===

export const BudgetLineItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.nativeEnum(CashFlowCategory),
  
  // Budget amounts
  plannedAmount: z.number(),
  actualAmount: z.number().default(0),
  variance: z.number().default(0),
  variancePercentage: z.number().default(0),
  
  // Classification
  varianceLevel: z.nativeEnum(VarianceLevel),
  
  // Temporal scope
  period: z.enum(['monthly', 'quarterly', 'annually']),
  startDate: z.date(),
  endDate: z.date(),
  
  // Governance
  requiresApproval: z.boolean().default(false),
  approvalThreshold: z.number().optional(),
  
  // Metadata
  notes: z.string().optional(),
  lastUpdatedAt: z.date()
});

export type BudgetLineItem = z.infer<typeof BudgetLineItemSchema>;

export const BudgetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  
  // Budget period
  period: z.enum(['monthly', 'quarterly', 'annually']),
  startDate: z.date(),
  endDate: z.date(),
  
  // Budget structure
  lineItems: z.array(BudgetLineItemSchema),
  
  // Summary calculations
  totalPlannedIncome: z.number(),
  totalPlannedExpenses: z.number(),
  plannedSurplus: z.number(),
  actualIncome: z.number().default(0),
  actualExpenses: z.number().default(0),
  actualSurplus: z.number().default(0),
  
  // Status
  status: z.enum(['draft', 'approved', 'active', 'completed', 'archived']),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  
  // Governance
  consentRequired: z.nativeEnum(ConsentLevel).default(ConsentLevel.ADVANCED_OPERATIONS),
  
  // Metadata
  createdBy: z.string(),
  createdAt: z.date(),
  lastModifiedAt: z.date()
});

export type Budget = z.infer<typeof BudgetSchema>;

// === FORECASTING SCHEMAS ===

export enum ForecastMethod {
  LINEAR_TREND = 'linear_trend',
  SEASONAL_ADJUSTMENT = 'seasonal_adjustment',
  MOVING_AVERAGE = 'moving_average',
  HISTORICAL_PATTERN = 'historical_pattern',
  SCENARIO_BASED = 'scenario_based',
  MONTE_CARLO = 'monte_carlo'
}

export const ForecastScenarioSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  
  // Scenario parameters
  probability: z.number().min(0).max(1),
  timeHorizon: z.number().positive(), // months
  
  // Financial projections
  projectedIncome: z.array(z.object({
    month: z.number(),
    amount: z.number(),
    category: z.nativeEnum(CashFlowCategory)
  })),
  
  projectedExpenses: z.array(z.object({
    month: z.number(),
    amount: z.number(),
    category: z.nativeEnum(CashFlowCategory)
  })),
  
  // Key assumptions
  assumptions: z.array(z.string()),
  riskFactors: z.array(z.string()),
  
  // Methodology
  method: z.nativeEnum(ForecastMethod),
  confidence: z.number().min(0).max(1),
  
  // Metadata
  createdAt: z.date(),
  lastUpdatedAt: z.date()
});

export type ForecastScenario = z.infer<typeof ForecastScenarioSchema>;

export const FinancialForecastSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  
  // Forecast scope
  organisationId: z.string(),
  timeHorizon: z.number().positive(), // months
  baseDate: z.date(),
  
  // Scenarios
  scenarios: z.array(ForecastScenarioSchema),
  baselineScenario: z.string().uuid(), // ID of primary scenario
  
  // Summary metrics
  projectedCashFlow: z.array(z.object({
    month: z.number(),
    openingBalance: z.number(),
    income: z.number(),
    expenses: z.number(),
    closingBalance: z.number(),
    variance: z.number().optional()
  })),
  
  // Risk assessment
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  keyRisks: z.array(z.string()),
  mitigationStrategies: z.array(z.string()),
  
  // Governance
  consentRequired: z.nativeEnum(ConsentLevel).default(ConsentLevel.ADVANCED_OPERATIONS),
  reviewRequired: z.boolean().default(true),
  
  // Metadata
  createdBy: z.string(),
  createdAt: z.date(),
  lastReviewedAt: z.date().optional(),
  status: z.enum(['draft', 'under_review', 'approved', 'active', 'archived'])
});

export type FinancialForecast = z.infer<typeof FinancialForecastSchema>;

// === ALERT AND NOTIFICATION SCHEMAS ===

export enum AlertType {
  BUDGET_VARIANCE = 'budget_variance',
  CASH_FLOW_WARNING = 'cash_flow_warning',
  UNUSUAL_TRANSACTION = 'unusual_transaction',
  COMPLIANCE_ISSUE = 'compliance_issue',
  APPROVAL_REQUIRED = 'approval_required',
  FORECAST_UPDATE = 'forecast_update',
  GOVERNANCE_VIOLATION = 'governance_violation'
}

export const FinancialAlertSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(AlertType),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  
  // Alert content
  title: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  
  // Context
  entityId: z.string(), // Account, budget, transaction, etc.
  entityType: z.string(),
  
  // Action required
  actionRequired: z.boolean().default(false),
  suggestedActions: z.array(z.string()).default([]),
  
  // Governance implications
  consentImpact: z.boolean().default(false),
  policyViolation: z.boolean().default(false),
  
  // Status
  status: z.enum(['new', 'acknowledged', 'in_progress', 'resolved', 'dismissed']),
  acknowledgedBy: z.string().optional(),
  acknowledgedAt: z.date().optional(),
  
  // Metadata
  createdAt: z.date(),
  expiresAt: z.date().optional()
});

export type FinancialAlert = z.infer<typeof FinancialAlertSchema>;

// === UTILITY INTERFACES ===

/**
 * Financial operation request with governance context
 */
export interface FinancialOperationRequest {
  operation: string;
  parameters: Record<string, any>;
  requestedBy: string;
  requestedAt: Date;
  
  // Governance context
  consentContext: ConsentMetadata;
  sovereigntyContext: SovereigntyMetadata;
  requiredApprovals: string[];
  
  // Business context
  businessJustification: string;
  expectedOutcome: string;
  riskAssessment: string;
}

/**
 * Financial operation result with audit trail
 */
export interface FinancialOperationResult {
  operationId: string;
  success: boolean;
  result?: any;
  error?: string;
  
  // Governance outcomes
  policyDecisions: PolicyDecision[];
  consentValidated: boolean;
  approvalsObtained: string[];
  
  // Audit information
  executedAt: Date;
  executedBy: string;
  auditTrail: string[];
  
  // Follow-up actions
  followUpRequired: boolean;
  scheduledReviews: Date[];
}

/**
 * Cash flow summary for dashboard display
 */
export interface CashFlowSummary {
  period: string;
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  closingBalance: number;
  
  // Category breakdowns
  incomeByCategory: Record<CashFlowCategory, number>;
  expensesByCategory: Record<CashFlowCategory, number>;
  
  // Trends
  monthOnMonthChange: number;
  yearOnYearChange: number;
  
  // Governance summary
  governanceAlertsCount: number;
  consentExpiringCount: number;
}