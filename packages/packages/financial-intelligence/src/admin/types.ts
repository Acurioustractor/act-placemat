/**
 * Admin UI Types
 * 
 * Type definitions for the consent management and attestation admin interface
 * with Australian compliance and Indigenous data sovereignty support
 */

import { ConsentLevel, SovereigntyLevel } from '../types/governance';

/**
 * Consent record with full audit trail
 */
export interface ConsentRecord {
  id: string;
  userId: string;
  organisationId?: string;
  dataSubject: DataSubject;
  consentLevel: ConsentLevel;
  sovereigntyLevel: SovereigntyLevel;
  purposes: ConsentPurpose[];
  dataCategories: DataCategory[];
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  lastModified: Date;
  modifiedBy: string;
  legalBasis: string[];
  complianceFrameworks: string[];
  attestations: AttestationRecord[];
  history: ConsentHistoryEntry[];
  metadata: ConsentMetadata;
}

/**
 * Data subject information
 */
export interface DataSubject {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organisation?: string;
  indigenousStatus?: boolean;
  traditionalOwner?: string;
  communityAffiliation?: string;
  preferredLanguage: string;
  communicationPreferences: CommunicationPreferences;
}

/**
 * Communication preferences
 */
export interface CommunicationPreferences {
  email: boolean;
  sms: boolean;
  post: boolean;
  inPerson: boolean;
  culturalProtocols?: string[];
  interpreterRequired?: boolean;
  accessibleFormats?: string[];
}

/**
 * Consent purpose definition
 */
export interface ConsentPurpose {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'administrative' | 'reporting' | 'research' | 'cultural' | 'other';
  requiredLevel: ConsentLevel;
  retentionPeriod: number; // milliseconds
  dataMinimization: boolean;
  thirdPartySharing: boolean;
  culturallySensitive: boolean;
}

/**
 * Data category classification
 */
export interface DataCategory {
  id: string;
  name: string;
  description: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted' | 'sacred';
  personalData: boolean;
  indigenousData: boolean;
  financialData: boolean;
  protectionRequirements: string[];
  retentionPeriod: number;
}

/**
 * Attestation record
 */
export interface AttestationRecord {
  id: string;
  type: AttestationType;
  subjectId: string;
  subjectType: 'user' | 'organisation' | 'system';
  attestedBy: string;
  attestedAt: Date;
  validUntil?: Date;
  status: 'active' | 'expired' | 'revoked';
  digitalSignature?: DigitalSignature;
  attestationData: AttestationData;
  complianceFrameworks: string[];
  culturalProtocols?: string[];
}

/**
 * Types of attestations
 */
export enum AttestationType {
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_MODIFIED = 'consent_modified',
  CONSENT_REVOKED = 'consent_revoked',
  DATA_ACCESS = 'data_access',
  DATA_SHARING = 'data_sharing',
  POLICY_COMPLIANCE = 'policy_compliance',
  CULTURAL_CLEARANCE = 'cultural_clearance',
  ELDER_APPROVAL = 'elder_approval',
  COMMUNITY_CONSENT = 'community_consent',
  TRADITIONAL_OWNER_CONSENT = 'traditional_owner_consent'
}

/**
 * Digital signature information
 */
export interface DigitalSignature {
  algorithm: string;
  signature: string;
  certificate: string;
  timestamp: Date;
  trustChain: string[];
  verified: boolean;
  verificationDate?: Date;
}

/**
 * Attestation data payload
 */
export interface AttestationData {
  consentId?: string;
  purposes: string[];
  dataCategories: string[];
  conditions: string[];
  restrictions: string[];
  culturalConsiderations?: string[];
  emergencyContacts?: string[];
  delegatedAuthority?: string[];
}

/**
 * Consent history entry
 */
export interface ConsentHistoryEntry {
  id: string;
  timestamp: Date;
  action: ConsentAction;
  performedBy: string;
  previousState?: Partial<ConsentRecord>;
  newState: Partial<ConsentRecord>;
  reason: string;
  culturalContext?: string;
  approvals?: string[];
  ipAddress: string;
  userAgent: string;
}

/**
 * Consent actions
 */
export enum ConsentAction {
  GRANTED = 'granted',
  MODIFIED = 'modified',
  REVOKED = 'revoked',
  RENEWED = 'renewed',
  TRANSFERRED = 'transferred',
  DELEGATED = 'delegated',
  ESCALATED = 'escalated',
  CULTURAL_REVIEW = 'cultural_review',
  ELDER_OVERRIDE = 'elder_override'
}

/**
 * Consent metadata
 */
export interface ConsentMetadata {
  version: string;
  source: 'web' | 'mobile' | 'paper' | 'verbal' | 'cultural_ceremony';
  jurisdiction: string;
  dataResidency: string[];
  crossBorderTransfer: boolean;
  culturalProtocols: string[];
  witnessList?: string[];
  ceremonialContext?: string;
  traditionalAuthority?: string;
  communityNotification: boolean;
}

/**
 * Consent dashboard statistics
 */
export interface ConsentDashboardStats {
  totalConsents: number;
  activeConsents: number;
  expiredConsents: number;
  revokedConsents: number;
  pendingRenewals: number;
  culturalReviews: number;
  complianceAlerts: number;
  consentsByLevel: Record<ConsentLevel, number>;
  consentsBySovereignty: Record<SovereigntyLevel, number>;
  recentActivity: ConsentActivitySummary[];
}

/**
 * Consent activity summary
 */
export interface ConsentActivitySummary {
  date: Date;
  action: ConsentAction;
  count: number;
  category: string;
  culturallySensitive: boolean;
}

/**
 * Admin user profile
 */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: AdminRole[];
  permissions: AdminPermission[];
  organisation?: string;
  clearanceLevel: 'basic' | 'standard' | 'elevated' | 'cultural_keeper' | 'elder';
  culturalAuthorization?: CulturalAuthorization;
  lastLogin: Date;
  sessionTimeout: number;
  mfaEnabled: boolean;
}

/**
 * Admin roles
 */
export enum AdminRole {
  CONSENT_ADMINISTRATOR = 'consent_administrator',
  COMPLIANCE_OFFICER = 'compliance_officer',
  DATA_PROTECTION_OFFICER = 'data_protection_officer',
  CULTURAL_LIAISON = 'cultural_liaison',
  ELDER = 'elder',
  TRADITIONAL_OWNER = 'traditional_owner',
  COMMUNITY_REPRESENTATIVE = 'community_representative',
  SYSTEM_ADMINISTRATOR = 'system_administrator'
}

/**
 * Admin permissions
 */
export enum AdminPermission {
  VIEW_CONSENTS = 'view_consents',
  MODIFY_CONSENTS = 'modify_consents',
  REVOKE_CONSENTS = 'revoke_consents',
  VIEW_ATTESTATIONS = 'view_attestations',
  CREATE_ATTESTATIONS = 'create_attestations',
  DIGITAL_SIGNING = 'digital_signing',
  CULTURAL_DATA_ACCESS = 'cultural_data_access',
  ELDER_OVERRIDE = 'elder_override',
  COMPLIANCE_REPORTING = 'compliance_reporting',
  AUDIT_LOGS = 'audit_logs',
  SYSTEM_CONFIGURATION = 'system_configuration'
}

/**
 * Cultural authorization
 */
export interface CulturalAuthorization {
  traditionalTerritory: string[];
  culturalGroups: string[];
  eldershipRecognition: boolean;
  ceremonialAuthority: boolean;
  culturalProtocolTraining: Date;
  communityEndorsement: string[];
  restrictedDataAccess: string[];
}

/**
 * UI filter options
 */
export interface ConsentFilters {
  consentLevels?: ConsentLevel[];
  sovereigntyLevels?: SovereigntyLevel[];
  status?: ('active' | 'expired' | 'revoked')[];
  purposes?: string[];
  dataCategories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  culturallySensitive?: boolean;
  indigenousData?: boolean;
  searchTerm?: string;
  organisationIds?: string[];
}

/**
 * UI sort options
 */
export interface ConsentSortOptions {
  field: 'grantedAt' | 'lastModified' | 'expiresAt' | 'name' | 'consentLevel';
  direction: 'asc' | 'desc';
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  totalCount?: number;
}

/**
 * Consent bulk operations
 */
export interface ConsentBulkOperation {
  operation: 'renew' | 'revoke' | 'notify' | 'export' | 'cultural_review';
  consentIds: string[];
  parameters?: Record<string, any>;
  performedBy: string;
  reason: string;
  culturalConsiderations?: string;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  enabled: boolean;
  channels: ('email' | 'sms' | 'webhook' | 'cultural_protocol')[];
  timing: {
    beforeExpiry: number; // days
    afterModification: number; // hours
    culturalEvents: boolean;
  };
  templates: NotificationTemplate[];
  culturalProtocols: CulturalNotificationProtocol[];
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'consent_expiry' | 'consent_modified' | 'cultural_review' | 'compliance_alert';
  subject: string;
  body: string;
  language: string;
  culturallySensitive: boolean;
  requiresElderReview: boolean;
}

/**
 * Cultural notification protocol
 */
export interface CulturalNotificationProtocol {
  id: string;
  name: string;
  traditionalTerritory: string;
  notificationMethod: 'community_meeting' | 'elder_council' | 'ceremonial' | 'written';
  requiredApprovals: string[];
  timeframe: number; // days
  seasonalConsiderations: string[];
}

/**
 * Consent export options
 */
export interface ConsentExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'xml';
  includeHistory: boolean;
  includeAttestations: boolean;
  includeCulturalData: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: ConsentFilters;
  redactionLevel: 'none' | 'partial' | 'full';
  destinationType: 'download' | 'email' | 'secure_portal';
}

/**
 * Audit log entry for admin actions
 */
export interface AdminAuditLogEntry {
  id: string;
  timestamp: Date;
  adminUserId: string;
  action: string;
  resource: string;
  resourceId: string;
  previousState?: any;
  newState?: any;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  result: 'success' | 'failure' | 'partial';
  culturalSensitive: boolean;
  complianceFrameworks: string[];
  retentionPeriod: number;
}

/**
 * API response types
 */
export interface ConsentListResponse {
  consents: ConsentRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  filters: ConsentFilters;
  sorting: ConsentSortOptions;
}

export interface ConsentDetailResponse {
  consent: ConsentRecord;
  relatedConsents: ConsentRecord[];
  complianceStatus: ComplianceStatus;
  culturalContext: CulturalContext;
  availableActions: AdminAction[];
}

/**
 * Compliance status
 */
export interface ComplianceStatus {
  overall: 'compliant' | 'warning' | 'non_compliant';
  frameworks: Array<{
    name: string;
    status: 'compliant' | 'warning' | 'non_compliant';
    issues: string[];
    recommendations: string[];
  }>;
  dataRetention: {
    status: 'within_limits' | 'approaching_limit' | 'exceeded';
    daysRemaining?: number;
    recommendedAction?: string;
  };
}

/**
 * Cultural context
 */
export interface CulturalContext {
  traditionalTerritory?: string;
  culturalGroups: string[];
  sacredDataInvolved: boolean;
  elderApprovalRequired: boolean;
  communityNotificationRequired: boolean;
  seasonalRestrictions: string[];
  ceremonialConsiderations: string[];
  culturalProtocolsApplied: string[];
}

/**
 * Admin actions
 */
export interface AdminAction {
  id: string;
  name: string;
  description: string;
  type: 'consent_modification' | 'attestation' | 'cultural_review' | 'compliance';
  permissions: AdminPermission[];
  culturalClearanceRequired: boolean;
  destructive: boolean;
  confirmationRequired: boolean;
}

/**
 * Form validation
 */
export interface FormValidationError {
  field: string;
  message: string;
  code: string;
  culturalContext?: string;
}

/**
 * UI theme configuration
 */
export interface UIThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  culturalColors: Record<string, string>;
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
  culturalCustomization: {
    showTerritoryAcknowledgment: boolean;
    traditionalLanguageLabels: boolean;
    culturalSymbols: boolean;
  };
}

/**
 * Real-time updates
 */
export interface RealTimeUpdate {
  type: 'consent_created' | 'consent_modified' | 'consent_revoked' | 'attestation_created' | 'cultural_review_requested';
  timestamp: Date;
  data: any;
  culturallySensitive: boolean;
  affectedUsers: string[];
}