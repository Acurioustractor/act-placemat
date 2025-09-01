/**
 * Attestation Storage and Digital Signing Types
 * 
 * Core types for secure attestation storage with cryptographic signatures
 * and immutable audit trails
 */

import { AttestationType, AttestationData, DigitalSignature } from '../admin/types';

/**
 * Stored attestation record with cryptographic security
 */
export interface StoredAttestation {
  id: string;
  version: number;
  type: AttestationType;
  subjectId: string;
  subjectType: 'user' | 'organisation' | 'system' | 'community' | 'elder';
  attestedBy: string;
  attestedAt: Date;
  validFrom: Date;
  validUntil?: Date;
  status: AttestationStatus;
  digitalSignature: SignatureMetadata;
  attestationData: AttestationData;
  complianceFrameworks: string[];
  culturalProtocols?: CulturalProtocol[];
  metadata: AttestationMetadata;
  immutabilityProof: ImmutabilityProof;
  revocationInfo?: RevocationInfo;
  createdAt: Date;
  lastVerified?: Date;
}

/**
 * Attestation status
 */
export enum AttestationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended',
  CULTURALLY_RESTRICTED = 'culturally_restricted'
}

/**
 * Enhanced signature metadata with verification details
 */
export interface SignatureMetadata {
  algorithm: SignatureAlgorithm;
  signature: string;
  publicKey: string;
  certificate?: string;
  certificateChain?: string[];
  timestamp: Date;
  timestampAuthority?: string;
  nonce: string;
  hashAlgorithm: string;
  verified: boolean;
  verificationAttempts: VerificationAttempt[];
  keyId: string;
  keyVersion: number;
}

/**
 * Supported signature algorithms
 */
export enum SignatureAlgorithm {
  RSA_PKCS1 = 'RSA-PKCS1-SHA256',
  RSA_PSS = 'RSA-PSS-SHA256',
  ECDSA_P256 = 'ECDSA-P256-SHA256',
  ECDSA_P384 = 'ECDSA-P384-SHA384',
  ECDSA_P521 = 'ECDSA-P521-SHA512',
  EdDSA = 'EdDSA-Ed25519'
}

/**
 * Verification attempt record
 */
export interface VerificationAttempt {
  timestamp: Date;
  success: boolean;
  verifiedBy: string;
  algorithm: SignatureAlgorithm;
  errorMessage?: string;
  trustChainValid: boolean;
  certificateStatus?: 'valid' | 'expired' | 'revoked' | 'unknown';
}

/**
 * Cultural protocol for Indigenous data
 */
export interface CulturalProtocol {
  protocolId: string;
  traditionalTerritory: string;
  elderId?: string;
  elderName?: string;
  communityId: string;
  protocolType: 'consent' | 'approval' | 'notification' | 'ceremony';
  requirements: string[];
  restrictions: string[];
  seasonalLimitations?: SeasonalLimitation[];
  witnessRequirements?: WitnessRequirement[];
  culturalAuthority: string;
  applicationDate: Date;
  ceremonialContext?: string;
}

/**
 * Seasonal limitations for cultural protocols
 */
export interface SeasonalLimitation {
  name: string;
  startDate: string; // MM-DD format
  endDate: string; // MM-DD format
  description: string;
  severity: 'advisory' | 'restricted' | 'prohibited';
  affectedOperations: string[];
}

/**
 * Witness requirements for cultural protocols
 */
export interface WitnessRequirement {
  role: 'elder' | 'community_member' | 'cultural_keeper' | 'traditional_owner';
  minimum: number;
  witnessIds: string[];
  attestedAt: Date;
  culturalContext: string;
}

/**
 * Attestation metadata
 */
export interface AttestationMetadata {
  jurisdiction: string;
  dataResidency: string[];
  crossBorderTransfer: boolean;
  retentionPeriod: number; // milliseconds
  encryptionRequired: boolean;
  accessControlList: AccessControlEntry[];
  auditLevel: 'basic' | 'enhanced' | 'maximum';
  culturalSensitive: boolean;
  emergencyOverride: boolean;
  delegationChain?: string[];
  parentAttestationId?: string;
  linkedAttestations: string[];
  tags: string[];
}

/**
 * Access control entry
 */
export interface AccessControlEntry {
  principal: string;
  principalType: 'user' | 'role' | 'group' | 'system';
  permissions: AttestationPermission[];
  conditions?: AccessCondition[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

/**
 * Attestation permissions
 */
export enum AttestationPermission {
  READ = 'read',
  VERIFY = 'verify',
  REVOKE = 'revoke',
  DELEGATE = 'delegate',
  EXPORT = 'export',
  AUDIT = 'audit'
}

/**
 * Access conditions
 */
export interface AccessCondition {
  type: 'time' | 'location' | 'purpose' | 'cultural';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'before' | 'after';
  value: any;
  description: string;
}

/**
 * Immutability proof for tamper detection
 */
export interface ImmutabilityProof {
  contentHash: string;
  merkleRoot: string;
  blockchainAnchor?: string;
  timestampProof: string;
  integritySignature: string;
  previousHash?: string;
  hashAlgorithm: string;
  createdAt: Date;
  verificationCount: number;
  lastIntegrityCheck: Date;
}

/**
 * Revocation information
 */
export interface RevocationInfo {
  revokedAt: Date;
  revokedBy: string;
  reason: RevocationReason;
  description: string;
  culturalReason?: string;
  elderApproval?: boolean;
  communityNotification: boolean;
  effectiveDate: Date;
  cascadeRevocation: boolean;
  replacementAttestationId?: string;
}

/**
 * Revocation reasons
 */
export enum RevocationReason {
  USER_REQUEST = 'user_request',
  CONSENT_WITHDRAWN = 'consent_withdrawn',
  POLICY_VIOLATION = 'policy_violation',
  SECURITY_BREACH = 'security_breach',
  CULTURAL_PROTOCOL = 'cultural_protocol',
  LEGAL_REQUIREMENT = 'legal_requirement',
  SYSTEM_ERROR = 'system_error',
  ELDER_DIRECTIVE = 'elder_directive',
  COMMUNITY_DECISION = 'community_decision',
  EXPIRED = 'expired'
}

/**
 * Signing request
 */
export interface SigningRequest {
  attestation: Omit<StoredAttestation, 'id' | 'digitalSignature' | 'immutabilityProof' | 'createdAt'>;
  signerKeyId: string;
  algorithm: SignatureAlgorithm;
  includeTimestamp: boolean;
  culturalWitnesses?: string[];
  delegatedAuthority?: string;
  emergencyOverride?: boolean;
}

/**
 * Signing result
 */
export interface SigningResult {
  success: boolean;
  attestationId: string;
  signature: SignatureMetadata;
  immutabilityProof: ImmutabilityProof;
  culturalClearance?: CulturalClearance;
  errors?: string[];
  warnings?: string[];
}

/**
 * Cultural clearance for Indigenous data
 */
export interface CulturalClearance {
  clearanceId: string;
  traditionalTerritory: string;
  elderId: string;
  elderName: string;
  clearanceType: 'general' | 'specific' | 'ceremonial' | 'emergency';
  validFrom: Date;
  validUntil: Date;
  conditions: string[];
  witnessIds: string[];
  culturalContext: string;
  clearanceLevel: 'basic' | 'sacred' | 'restricted';
}

/**
 * Verification request
 */
export interface VerificationRequest {
  attestationId: string;
  verifyIntegrity: boolean;
  verifyCertificateChain: boolean;
  verifyTimestamp: boolean;
  verifyCulturalProtocols: boolean;
  requestedBy: string;
  purpose: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean;
  attestationId: string;
  verificationId: string;
  verifiedAt: Date;
  verifiedBy: string;
  checks: VerificationCheck[];
  overallScore: number; // 0-1
  trustLevel: 'low' | 'medium' | 'high' | 'maximum';
  expiresAt?: Date;
  warnings: string[];
  errors: string[];
  culturalCompliance: CulturalComplianceResult;
}

/**
 * Individual verification check
 */
export interface VerificationCheck {
  type: 'signature' | 'certificate' | 'timestamp' | 'integrity' | 'cultural' | 'policy';
  name: string;
  passed: boolean;
  score: number; // 0-1
  details: string;
  evidence?: string;
  errorMessage?: string;
}

/**
 * Cultural compliance verification result
 */
export interface CulturalComplianceResult {
  compliant: boolean;
  careScore: number; // 0-1 (CARE Principles compliance)
  elderApprovalValid: boolean;
  communityConsent: boolean;
  seasonalRestrictions: boolean;
  territorialCompliance: boolean;
  protocolViolations: string[];
  recommendations: string[];
}

/**
 * Storage query criteria
 */
export interface AttestationQuery {
  subjectId?: string;
  subjectType?: string;
  attestationType?: AttestationType;
  status?: AttestationStatus;
  attestedBy?: string;
  validFrom?: Date;
  validUntil?: Date;
  culturalTerritory?: string;
  complianceFramework?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  orderBy?: 'attestedAt' | 'validFrom' | 'validUntil' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Bulk operation request
 */
export interface BulkAttestationRequest {
  operations: BulkOperation[];
  executedBy: string;
  reason: string;
  culturalClearance?: CulturalClearance;
  atomicExecution: boolean;
}

/**
 * Bulk operation
 */
export interface BulkOperation {
  type: 'create' | 'revoke' | 'verify' | 'update_metadata';
  attestationId?: string;
  data?: any;
  conditions?: string[];
}

/**
 * Export request
 */
export interface AttestationExportRequest {
  query: AttestationQuery;
  format: 'json' | 'csv' | 'xml' | 'pdf';
  includeSignatures: boolean;
  includeCulturalData: boolean;
  encryptExport: boolean;
  requestedBy: string;
  purpose: string;
  retentionPeriod?: number;
}

/**
 * Export result
 */
export interface AttestationExportResult {
  success: boolean;
  exportId: string;
  format: string;
  data?: string | Buffer;
  downloadUrl?: string;
  metadata: {
    totalAttestations: number;
    culturalAttestations: number;
    dateRange: { start: Date; end: Date };
    exportedBy: string;
    exportedAt: Date;
    checksums: {
      sha256: string;
      integrity: string;
    };
  };
  errors?: string[];
}

/**
 * Key management interfaces
 */
export interface KeyMetadata {
  keyId: string;
  algorithm: SignatureAlgorithm;
  purpose: 'signing' | 'verification' | 'encryption';
  status: 'active' | 'inactive' | 'revoked' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  ownerId: string;
  culturalAuthority?: string;
  permissions: string[];
}

/**
 * Storage interfaces
 */
export interface AttestationStorage {
  store(attestation: StoredAttestation): Promise<string>;
  retrieve(id: string): Promise<StoredAttestation | null>;
  query(criteria: AttestationQuery): Promise<StoredAttestation[]>;
  revoke(id: string, revocationInfo: RevocationInfo): Promise<boolean>;
  updateMetadata(id: string, metadata: Partial<AttestationMetadata>): Promise<boolean>;
  bulkOperation(request: BulkAttestationRequest): Promise<BulkOperationResult>;
  export(request: AttestationExportRequest): Promise<AttestationExportResult>;
  validateIntegrity(ids?: string[]): Promise<IntegrityValidationResult>;
}

/**
 * Digital signing service interface
 */
export interface DigitalSigningService {
  sign(request: SigningRequest): Promise<SigningResult>;
  verify(request: VerificationRequest): Promise<VerificationResult>;
  generateKeyPair(algorithm: SignatureAlgorithm, metadata: Partial<KeyMetadata>): Promise<KeyMetadata>;
  rotateKey(keyId: string, newAlgorithm?: SignatureAlgorithm): Promise<KeyMetadata>;
  revokeKey(keyId: string, reason: string): Promise<boolean>;
  getKeyMetadata(keyId: string): Promise<KeyMetadata | null>;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  results: Array<{
    operation: BulkOperation;
    success: boolean;
    result?: any;
    error?: string;
  }>;
  executionTime: number;
}

/**
 * Integrity validation result
 */
export interface IntegrityValidationResult {
  valid: boolean;
  totalAttestations: number;
  validAttestations: number;
  tamperedAttestations: string[];
  missingAttestations: string[];
  issues: Array<{
    attestationId: string;
    type: 'tampered' | 'missing' | 'corrupted' | 'expired_signature';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

/**
 * Event types for attestation lifecycle
 */
export enum AttestationEvent {
  CREATED = 'attestation.created',
  SIGNED = 'attestation.signed',
  VERIFIED = 'attestation.verified',
  REVOKED = 'attestation.revoked',
  EXPIRED = 'attestation.expired',
  CULTURAL_CLEARANCE_GRANTED = 'attestation.cultural_clearance_granted',
  CULTURAL_CLEARANCE_REVOKED = 'attestation.cultural_clearance_revoked',
  INTEGRITY_VIOLATION = 'attestation.integrity_violation',
  KEY_ROTATED = 'attestation.key_rotated',
  BULK_OPERATION_COMPLETED = 'attestation.bulk_operation_completed'
}

/**
 * Event payload
 */
export interface AttestationEventPayload {
  eventType: AttestationEvent;
  attestationId: string;
  timestamp: Date;
  triggeredBy: string;
  metadata: Record<string, any>;
  culturalContext?: CulturalProtocol;
}