/**
 * Financial Intelligence Agent - Governance Types
 * 
 * Data models for consent, policy metadata, and sovereignty tracking
 * Designed for Australian financial compliance and community ownership
 */

import { z } from 'zod';

// === CONSENT MANAGEMENT ===

/**
 * Granular consent levels for financial operations
 */
export enum ConsentLevel {
  NONE = 'none',                    // No consent given
  READ_ONLY = 'read_only',          // View financial data only
  BASIC_OPERATIONS = 'basic_ops',   // Basic transactions (under thresholds)
  ADVANCED_OPERATIONS = 'advanced_ops', // Complex financial operations
  FULL_AUTOMATION = 'full_auto',    // Complete agent autonomy
  EMERGENCY_OVERRIDE = 'emergency'   // Emergency financial actions
}

/**
 * Consent scope defines what financial areas consent applies to
 */
export enum ConsentScope {
  CASH_FLOW = 'cash_flow',          // Cash flow monitoring and basic payments
  BUDGETING = 'budgeting',          // Budget creation and variance analysis
  FORECASTING = 'forecasting',     // Financial forecasting and planning
  REPORTING = 'reporting',          // Financial reporting and analytics
  INVESTMENTS = 'investments',      // Investment decisions and management
  PROCUREMENT = 'procurement',      // Purchasing and supplier management
  PAYROLL = 'payroll',             // Staff payments and HR financial operations
  COMPLIANCE = 'compliance',        // Regulatory compliance and auditing
  PARTNERSHIPS = 'partnerships',    // Partnership financial arrangements
  GRANTS = 'grants'                // Grant applications and management
}

/**
 * Consent metadata with Australian privacy compliance
 */
export const ConsentMetadataSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string(), // User, organisation, or system identifier
  entityType: z.enum(['individual', 'organisation', 'community', 'system']),
  
  // Consent details
  level: z.nativeEnum(ConsentLevel),
  scopes: z.array(z.nativeEnum(ConsentScope)),
  
  // Australian compliance
  privacyActCompliant: z.boolean().default(true),
  dataResidency: z.enum(['australia', 'international']).default('australia'),
  
  // Temporal constraints
  grantedAt: z.date(),
  expiresAt: z.date().optional(),
  lastVerifiedAt: z.date().optional(),
  
  // Operational constraints
  maxTransactionAmount: z.number().positive().optional(),
  maxDailyAmount: z.number().positive().optional(),
  restrictedCategories: z.array(z.string()).default([]),
  
  // Metadata
  purpose: z.string(),
  attestation: z.object({
    method: z.enum(['digital_signature', 'biometric', 'manual', 'delegated']),
    attestorId: z.string(),
    timestamp: z.date(),
    signature: z.string().optional()
  }),
  
  // Audit trail
  createdBy: z.string(),
  lastModifiedBy: z.string(),
  version: z.number().int().positive().default(1)
});

export type ConsentMetadata = z.infer<typeof ConsentMetadataSchema>;

// === POLICY FRAMEWORK ===

/**
 * Policy types for financial operations
 */
export enum PolicyType {
  OPERATIONAL = 'operational',     // Day-to-day financial operations
  COMPLIANCE = 'compliance',       // Regulatory and legal compliance
  GOVERNANCE = 'governance',       // Board and management governance
  SECURITY = 'security',           // Financial security and fraud prevention
  COMMUNITY = 'community',         // Community benefit and equity
  ENVIRONMENTAL = 'environmental', // Environmental impact considerations
  CULTURAL = 'cultural'           // Cultural protocols and sovereignty
}

/**
 * Policy enforcement levels
 */
export enum PolicyEnforcement {
  ADVISORY = 'advisory',           // Warning only, allow action
  BLOCKING = 'blocking',           // Block action, require override
  MANDATORY = 'mandatory',         // Enforce without override option
  AUDIT_ONLY = 'audit_only'       // Log action but don't interfere
}

/**
 * Policy metadata for Rego-based rules
 */
export const PolicyMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  
  // Policy classification
  type: z.nativeEnum(PolicyType),
  enforcement: z.nativeEnum(PolicyEnforcement),
  priority: z.number().int().min(1).max(10).default(5),
  
  // Scope and applicability
  scopes: z.array(z.nativeEnum(ConsentScope)),
  applicableEntities: z.array(z.string()).default([]), // Empty = all entities
  
  // Rule definition
  regoModule: z.string(), // Path to Rego module
  ruleExpression: z.string(), // Main rule expression
  dependencies: z.array(z.string()).default([]), // Other policy IDs
  
  // Temporal constraints
  effectiveFrom: z.date(),
  effectiveUntil: z.date().optional(),
  
  // Australian context
  australianCompliance: z.object({
    regulatoryFramework: z.array(z.string()).default([]), // ASIC, ATO, etc.
    indigenousProtocols: z.boolean().default(false),
    communityBenefitRequired: z.boolean().default(false)
  }),
  
  // Metadata
  version: z.string(),
  createdBy: z.string(),
  lastModifiedBy: z.string(),
  createdAt: z.date(),
  lastModifiedAt: z.date()
});

export type PolicyMetadata = z.infer<typeof PolicyMetadataSchema>;

// === SOVEREIGNTY AND BENEFIT ALLOCATION ===

/**
 * Sovereignty indicators for Australian context
 */
export enum SovereigntyLevel {
  INDIVIDUAL = 'individual',       // Individual sovereignty over personal data
  COMMUNITY = 'community',         // Community collective sovereignty
  INDIGENOUS = 'indigenous',       // Indigenous data sovereignty (CARE principles)
  ORGANISATIONAL = 'organisational', // Organisational sovereignty
  NATIONAL = 'national',           // Australian national sovereignty
  INTERNATIONAL = 'international'  // International or cross-border
}

/**
 * Benefit allocation tracking
 */
export enum BenefitType {
  FINANCIAL = 'financial',         // Direct financial benefits
  CAPACITY = 'capacity',           // Capacity building and skills
  INFRASTRUCTURE = 'infrastructure', // Infrastructure improvements
  KNOWLEDGE = 'knowledge',         // Knowledge sharing and IP
  CULTURAL = 'cultural',           // Cultural preservation and promotion
  ENVIRONMENTAL = 'environmental', // Environmental benefits
  SOCIAL = 'social'               // Social cohesion and wellbeing
}

/**
 * Sovereignty metadata for data and actions
 */
export const SovereigntyMetadataSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string(),
  
  // Sovereignty classification
  level: z.nativeEnum(SovereigntyLevel),
  traditionalOwnership: z.object({
    recognised: z.boolean().default(false),
    communityId: z.string().optional(),
    protocols: z.array(z.string()).default([])
  }).optional(),
  
  // Governance structure
  governanceModel: z.enum(['individual', 'collective', 'delegated', 'hybrid']),
  decisionMakers: z.array(z.string()),
  
  // Benefit tracking
  benefitAllocation: z.array(z.object({
    type: z.nativeEnum(BenefitType),
    percentage: z.number().min(0).max(100),
    recipient: z.string(),
    conditions: z.array(z.string()).default([])
  })),
  
  // Compliance
  careCompliant: z.boolean().default(false), // Collective Benefit, Authority, Responsibility, Ethics
  fairTradingCompliant: z.boolean().default(true),
  
  // Metadata
  establishedAt: z.date(),
  reviewRequired: z.boolean().default(false),
  lastReviewedAt: z.date().optional()
});

export type SovereigntyMetadata = z.infer<typeof SovereigntyMetadataSchema>;

// === FINANCIAL TRANSACTION METADATA ===

/**
 * Transaction classification for ethical tracking
 */
export enum TransactionClass {
  OPERATIONAL = 'operational',     // Standard operational expenses
  COMMUNITY_BENEFIT = 'community_benefit', // Direct community benefit
  CAPACITY_BUILDING = 'capacity_building', // Skills and capability development
  INFRASTRUCTURE = 'infrastructure', // Infrastructure investment
  EMERGENCY = 'emergency',         // Emergency expenses
  INVESTMENT = 'investment',       // Investment activities
  PARTNERSHIP = 'partnership',     // Partnership-related transactions
  COMPLIANCE = 'compliance'        // Compliance and regulatory costs
}

/**
 * Complete financial transaction metadata
 */
export const FinancialTransactionMetadataSchema = z.object({
  transactionId: z.string().uuid(),
  
  // Core transaction data
  amount: z.number(),
  currency: z.string().default('AUD'),
  category: z.string(),
  classification: z.nativeEnum(TransactionClass),
  
  // Governance metadata
  consent: ConsentMetadataSchema,
  policies: z.array(z.string()), // Policy IDs that apply
  sovereignty: SovereigntyMetadataSchema,
  
  // Decision context
  decisionContext: z.object({
    automated: z.boolean(),
    agentId: z.string().optional(),
    humanApprover: z.string().optional(),
    decisionTimestamp: z.date(),
    rationale: z.string().optional()
  }),
  
  // Compliance tracking
  complianceChecks: z.array(z.object({
    checkType: z.string(),
    passed: z.boolean(),
    details: z.string().optional(),
    timestamp: z.date()
  })),
  
  // Audit trail
  auditTrail: z.array(z.object({
    action: z.string(),
    userId: z.string(),
    timestamp: z.date(),
    details: z.record(z.any()).optional()
  }))
});

export type FinancialTransactionMetadata = z.infer<typeof FinancialTransactionMetadataSchema>;

// === UTILITY TYPES ===

/**
 * Policy decision result
 */
export interface PolicyDecision {
  allowed: boolean;
  policyId: string;
  reason: string;
  enforcement: PolicyEnforcement;
  requiredActions?: string[];
  warnings?: string[];
  timestamp: Date;
  decisionId: string;
}

/**
 * Consent check result
 */
export interface ConsentCheck {
  valid: boolean;
  consentId: string;
  level: ConsentLevel;
  scopes: ConsentScope[];
  limitations?: string[];
  expiresAt?: Date;
  timestamp: Date;
}

/**
 * Sovereignty assessment
 */
export interface SovereigntyAssessment {
  level: SovereigntyLevel;
  protocolsRequired: string[];
  beneficiariesIdentified: boolean;
  careCompliant: boolean;
  recommendations: string[];
  timestamp: Date;
}