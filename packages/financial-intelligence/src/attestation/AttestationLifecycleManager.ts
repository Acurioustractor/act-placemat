/**
 * Attestation Lifecycle Manager
 * 
 * Manages the complete lifecycle of attestations including creation,
 * verification, revocation, and cultural protocol compliance
 */

import {
  StoredAttestation,
  AttestationStorage,
  DigitalSigningService,
  SigningRequest,
  VerificationRequest,
  AttestationType,
  AttestationStatus,
  RevocationInfo,
  RevocationReason,
  CulturalProtocol,
  AttestationMetadata,
  AttestationEventPayload,
  AttestationEvent,
  BulkAttestationRequest
} from './types';
import { AttestationData } from '../admin/types';
import crypto from 'crypto';

export interface AttestationRequest {
  type: AttestationType;
  subjectId: string;
  subjectType: 'user' | 'organisation' | 'system' | 'community' | 'elder';
  attestedBy: string;
  validFrom?: Date;
  validUntil?: Date;
  attestationData: AttestationData;
  complianceFrameworks: string[];
  culturalProtocols?: CulturalProtocol[];
  metadata?: Partial<AttestationMetadata>;
  signerKeyId: string;
  emergencyOverride?: boolean;
}

export interface AttestationResponse {
  success: boolean;
  attestationId?: string;
  status?: AttestationStatus;
  errors?: string[];
  warnings?: string[];
  culturalClearanceRequired?: boolean;
  nextSteps?: string[];
}

export interface RevocationRequest {
  attestationId: string;
  reason: RevocationReason;
  description: string;
  revokedBy: string;
  culturalReason?: string;
  elderApproval?: boolean;
  cascadeRevocation?: boolean;
  effectiveDate?: Date;
  replacementAttestationId?: string;
}

export interface EventHandler {
  handleEvent(event: AttestationEventPayload): Promise<void>;
}

export class AttestationLifecycleManager {
  private storage: AttestationStorage;
  private signingService: DigitalSigningService;
  private eventHandlers: Map<AttestationEvent, EventHandler[]> = new Map();
  private culturalValidationEnabled: boolean;

  constructor(
    storage: AttestationStorage,
    signingService: DigitalSigningService,
    culturalValidationEnabled = true
  ) {
    this.storage = storage;
    this.signingService = signingService;
    this.culturalValidationEnabled = culturalValidationEnabled;
  }

  /**
   * Create and sign a new attestation
   */
  async createAttestation(request: AttestationRequest): Promise<AttestationResponse> {
    try {
      // Validate request
      const validation = await this.validateAttestationRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Check for cultural protocol requirements
      if (this.culturalValidationEnabled && request.culturalProtocols?.length) {
        const culturalValidation = await this.validateCulturalRequirements(request);
        if (!culturalValidation.valid) {
          return {
            success: false,
            errors: culturalValidation.errors,
            culturalClearanceRequired: true,
            nextSteps: culturalValidation.nextSteps
          };
        }
      }

      // Create the attestation record
      const attestationId = crypto.randomUUID();
      const now = new Date();
      
      const attestation: StoredAttestation = {
        id: attestationId,
        version: 1,
        type: request.type,
        subjectId: request.subjectId,
        subjectType: request.subjectType,
        attestedBy: request.attestedBy,
        attestedAt: now,
        validFrom: request.validFrom || now,
        validUntil: request.validUntil,
        status: AttestationStatus.PENDING,
        digitalSignature: {} as any, // Will be filled by signing service
        attestationData: request.attestationData,
        complianceFrameworks: request.complianceFrameworks,
        culturalProtocols: request.culturalProtocols,
        metadata: this.buildMetadata(request),
        immutabilityProof: {} as any, // Will be filled by signing service
        createdAt: now
      };

      // Sign the attestation
      const signingRequest: SigningRequest = {
        attestation,
        signerKeyId: request.signerKeyId,
        algorithm: 'ECDSA-P256-SHA256', // Default algorithm
        includeTimestamp: true,
        culturalWitnesses: request.culturalProtocols?.flatMap(p => 
          p.witnessRequirements?.flatMap(w => w.witnessIds) || []
        ),
        emergencyOverride: request.emergencyOverride
      };

      const signingResult = await this.signingService.sign(signingRequest);
      
      if (!signingResult.success) {
        return {
          success: false,
          errors: signingResult.errors,
          warnings: signingResult.warnings
        };
      }

      // Update attestation with signature data
      attestation.digitalSignature = signingResult.signature;
      attestation.immutabilityProof = signingResult.immutabilityProof;
      attestation.status = AttestationStatus.ACTIVE;

      // Store the attestation
      const storedId = await this.storage.store(attestation);

      // Emit creation event
      await this.emitEvent({
        eventType: AttestationEvent.CREATED,
        attestationId: storedId,
        timestamp: now,
        triggeredBy: request.attestedBy,
        metadata: {
          type: request.type,
          subjectType: request.subjectType,
          culturalProtocols: request.culturalProtocols?.length || 0
        },
        culturalContext: request.culturalProtocols?.[0]
      });

      // Handle cultural clearance if issued
      if (signingResult.culturalClearance) {
        await this.emitEvent({
          eventType: AttestationEvent.CULTURAL_CLEARANCE_GRANTED,
          attestationId: storedId,
          timestamp: now,
          triggeredBy: request.attestedBy,
          metadata: {
            clearanceId: signingResult.culturalClearance.clearanceId,
            territory: signingResult.culturalClearance.traditionalTerritory,
            clearanceLevel: signingResult.culturalClearance.clearanceLevel
          }
        });
      }

      return {
        success: true,
        attestationId: storedId,
        status: AttestationStatus.ACTIVE,
        warnings: signingResult.warnings
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Verify an existing attestation
   */
  async verifyAttestation(
    attestationId: string,
    requestedBy: string,
    options: {
      verifyIntegrity?: boolean;
      verifyCertificateChain?: boolean;
      verifyTimestamp?: boolean;
      verifyCulturalProtocols?: boolean;
    } = {}
  ): Promise<AttestationResponse> {
    try {
      // Load the attestation
      const attestation = await this.storage.retrieve(attestationId);
      if (!attestation) {
        return {
          success: false,
          errors: [`Attestation not found: ${attestationId}`]
        };
      }

      // Check if attestation is in verifiable state
      if (attestation.status === AttestationStatus.REVOKED) {
        return {
          success: false,
          errors: ['Cannot verify revoked attestation'],
          status: AttestationStatus.REVOKED
        };
      }

      // Check expiration
      if (attestation.validUntil && attestation.validUntil < new Date()) {
        // Update status to expired
        await this.expireAttestation(attestationId);
        return {
          success: false,
          errors: ['Attestation has expired'],
          status: AttestationStatus.EXPIRED
        };
      }

      // Perform verification
      const verificationRequest: VerificationRequest = {
        attestationId,
        verifyIntegrity: options.verifyIntegrity ?? true,
        verifyCertificateChain: options.verifyCertificateChain ?? true,
        verifyTimestamp: options.verifyTimestamp ?? true,
        verifyCulturalProtocols: options.verifyCulturalProtocols ?? this.culturalValidationEnabled,
        requestedBy,
        purpose: 'attestation_verification'
      };

      const verificationResult = await this.signingService.verify(verificationRequest);

      // Update verification metadata
      const updatedMetadata: Partial<AttestationMetadata> = {
        ...attestation.metadata,
        lastVerificationAttempt: {
          timestamp: new Date(),
          requestedBy,
          result: verificationResult.valid,
          trustLevel: verificationResult.trustLevel,
          overallScore: verificationResult.overallScore
        }
      };

      await this.storage.updateMetadata(attestationId, updatedMetadata);

      // Emit verification event
      await this.emitEvent({
        eventType: AttestationEvent.VERIFIED,
        attestationId,
        timestamp: new Date(),
        triggeredBy: requestedBy,
        metadata: {
          verificationResult: verificationResult.valid,
          trustLevel: verificationResult.trustLevel,
          overallScore: verificationResult.overallScore,
          checks: verificationResult.checks.length
        }
      });

      return {
        success: verificationResult.valid,
        attestationId,
        status: attestation.status,
        errors: verificationResult.errors,
        warnings: verificationResult.warnings
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Revoke an attestation
   */
  async revokeAttestation(request: RevocationRequest): Promise<AttestationResponse> {
    try {
      // Load the attestation
      const attestation = await this.storage.retrieve(request.attestationId);
      if (!attestation) {
        return {
          success: false,
          errors: [`Attestation not found: ${request.attestationId}`]
        };
      }

      // Check if already revoked
      if (attestation.status === AttestationStatus.REVOKED) {
        return {
          success: false,
          errors: ['Attestation is already revoked'],
          status: AttestationStatus.REVOKED
        };
      }

      // Validate cultural revocation requirements
      if (attestation.culturalProtocols?.length && this.culturalValidationEnabled) {
        const culturalValidation = await this.validateCulturalRevocation(request, attestation);
        if (!culturalValidation.valid) {
          return {
            success: false,
            errors: culturalValidation.errors,
            culturalClearanceRequired: true
          };
        }
      }

      // Create revocation info
      const revocationInfo: RevocationInfo = {
        revokedAt: new Date(),
        revokedBy: request.revokedBy,
        reason: request.reason,
        description: request.description,
        culturalReason: request.culturalReason,
        elderApproval: request.elderApproval,
        communityNotification: attestation.culturalProtocols?.length ? true : false,
        effectiveDate: request.effectiveDate || new Date(),
        cascadeRevocation: request.cascadeRevocation || false,
        replacementAttestationId: request.replacementAttestationId
      };

      // Perform revocation
      const revoked = await this.storage.revoke(request.attestationId, revocationInfo);
      
      if (!revoked) {
        return {
          success: false,
          errors: ['Failed to revoke attestation']
        };
      }

      // Emit revocation event
      await this.emitEvent({
        eventType: AttestationEvent.REVOKED,
        attestationId: request.attestationId,
        timestamp: new Date(),
        triggeredBy: request.revokedBy,
        metadata: {
          reason: request.reason,
          cascadeRevocation: request.cascadeRevocation,
          culturalReason: request.culturalReason,
          elderApproval: request.elderApproval
        },
        culturalContext: attestation.culturalProtocols?.[0]
      });

      return {
        success: true,
        attestationId: request.attestationId,
        status: AttestationStatus.REVOKED
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Bulk operation processing
   */
  async processBulkOperations(request: BulkAttestationRequest): Promise<AttestationResponse> {
    try {
      const result = await this.storage.bulkOperation(request);
      
      // Emit bulk operation event
      await this.emitEvent({
        eventType: AttestationEvent.BULK_OPERATION_COMPLETED,
        attestationId: 'bulk_operation',
        timestamp: new Date(),
        triggeredBy: request.executedBy,
        metadata: {
          totalOperations: result.totalOperations,
          successfulOperations: result.successfulOperations,
          failedOperations: result.failedOperations,
          executionTime: result.executionTime,
          atomicExecution: request.atomicExecution
        }
      });

      return {
        success: result.success,
        attestationId: 'bulk_operation',
        errors: result.results
          .filter(r => !r.success)
          .map(r => r.error || 'Unknown error'),
        warnings: result.failedOperations > 0 ? 
          [`${result.failedOperations} operations failed`] : undefined
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Check and expire attestations
   */
  async expireExpiredAttestations(): Promise<void> {
    const now = new Date();
    
    // Query for attestations that have expired
    const expiredAttestations = await this.storage.query({
      status: AttestationStatus.ACTIVE,
      validUntil: now,
      limit: 1000
    });

    for (const attestation of expiredAttestations) {
      await this.expireAttestation(attestation.id);
    }
  }

  /**
   * Register event handler
   */
  registerEventHandler(event: AttestationEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  unregisterEventHandler(event: AttestationEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Private helper methods

  private async validateAttestationRequest(request: AttestationRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!request.subjectId) {
      errors.push('Subject ID is required');
    }

    if (!request.attestedBy) {
      errors.push('Attested by is required');
    }

    if (!request.signerKeyId) {
      errors.push('Signer key ID is required');
    }

    // Check key existence
    const keyMetadata = await this.signingService.getKeyMetadata(request.signerKeyId);
    if (!keyMetadata || keyMetadata.status !== 'active') {
      errors.push(`Invalid or inactive signing key: ${request.signerKeyId}`);
    }

    // Validate validity period
    if (request.validFrom && request.validUntil && request.validFrom >= request.validUntil) {
      errors.push('Valid from date must be before valid until date');
    }

    // Check compliance frameworks
    if (!request.complianceFrameworks || request.complianceFrameworks.length === 0) {
      warnings.push('No compliance frameworks specified');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private async validateCulturalRequirements(request: AttestationRequest): Promise<{
    valid: boolean;
    errors: string[];
    nextSteps: string[];
  }> {
    const errors: string[] = [];
    const nextSteps: string[] = [];

    if (!request.culturalProtocols?.length) {
      return { valid: true, errors: [], nextSteps: [] };
    }

    for (const protocol of request.culturalProtocols) {
      // Check Elder approval requirement
      if (protocol.requirements.includes('elder_approval') && !protocol.elderId) {
        errors.push(`Elder approval required for protocol ${protocol.protocolId}`);
        nextSteps.push(`Obtain Elder approval for Traditional Territory: ${protocol.traditionalTerritory}`);
      }

      // Check community consent
      if (protocol.requirements.includes('community_consent') && !protocol.communityId) {
        errors.push(`Community consent required for protocol ${protocol.protocolId}`);
        nextSteps.push(`Obtain community consent from ${protocol.traditionalTerritory}`);
      }

      // Check witness requirements
      if (protocol.witnessRequirements) {
        for (const witnessReq of protocol.witnessRequirements) {
          if (witnessReq.witnessIds.length < witnessReq.minimum) {
            errors.push(`Insufficient ${witnessReq.role} witnesses: requires ${witnessReq.minimum}, has ${witnessReq.witnessIds.length}`);
            nextSteps.push(`Arrange for ${witnessReq.minimum - witnessReq.witnessIds.length} additional ${witnessReq.role} witnesses`);
          }
        }
      }

      // Check seasonal restrictions
      if (protocol.seasonalLimitations) {
        const now = new Date();
        const currentMMDD = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        
        for (const limitation of protocol.seasonalLimitations) {
          if (this.isDateInSeason(currentMMDD, limitation.startDate, limitation.endDate)) {
            if (limitation.severity === 'prohibited') {
              errors.push(`Cultural protocol prohibited during ${limitation.name}: ${limitation.description}`);
              nextSteps.push(`Wait until ${limitation.endDate} or seek emergency cultural clearance`);
            }
          }
        }
      }
    }

    return { valid: errors.length === 0, errors, nextSteps };
  }

  private async validateCulturalRevocation(
    request: RevocationRequest,
    attestation: StoredAttestation
  ): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check if cultural revocation requires Elder approval
    const requiresElderApproval = attestation.culturalProtocols?.some(p => 
      p.requirements.includes('elder_approval_for_revocation')
    );

    if (requiresElderApproval && !request.elderApproval) {
      errors.push('Elder approval required for revocation of cultural attestation');
    }

    // Check if cultural reason is provided for cultural attestations
    if (attestation.culturalProtocols?.length && !request.culturalReason) {
      errors.push('Cultural reason required for revocation of cultural attestation');
    }

    return { valid: errors.length === 0, errors };
  }

  private buildMetadata(request: AttestationRequest): AttestationMetadata {
    const baseMetadata: AttestationMetadata = {
      jurisdiction: 'Australia',
      dataResidency: ['AU'],
      crossBorderTransfer: false,
      retentionPeriod: request.culturalProtocols?.length ? 
        50 * 365 * 24 * 60 * 60 * 1000 : // 50 years for cultural data
        7 * 365 * 24 * 60 * 60 * 1000,   // 7 years for other data
      encryptionRequired: request.culturalProtocols?.length ? true : false,
      accessControlList: [{
        principal: request.attestedBy,
        principalType: 'user',
        permissions: ['read', 'verify'],
        grantedBy: 'system',
        grantedAt: new Date()
      }],
      auditLevel: request.culturalProtocols?.length ? 'maximum' : 'enhanced',
      culturalSensitive: (request.culturalProtocols?.length || 0) > 0,
      emergencyOverride: request.emergencyOverride || false,
      linkedAttestations: [],
      tags: []
    };

    return { ...baseMetadata, ...request.metadata };
  }

  private async expireAttestation(attestationId: string): Promise<void> {
    const revocationInfo: RevocationInfo = {
      revokedAt: new Date(),
      revokedBy: 'system',
      reason: RevocationReason.EXPIRED,
      description: 'Attestation expired automatically',
      communityNotification: false,
      effectiveDate: new Date(),
      cascadeRevocation: false
    };

    await this.storage.revoke(attestationId, revocationInfo);

    await this.emitEvent({
      eventType: AttestationEvent.EXPIRED,
      attestationId,
      timestamp: new Date(),
      triggeredBy: 'system',
      metadata: {
        reason: 'automatic_expiration'
      }
    });
  }

  private isDateInSeason(current: string, start: string, end: string): boolean {
    // Handle year-spanning seasons
    if (start > end) {
      return current >= start || current <= end;
    } else {
      return current >= start && current <= end;
    }
  }

  private async emitEvent(event: AttestationEventPayload): Promise<void> {
    const handlers = this.eventHandlers.get(event.eventType);
    if (handlers) {
      await Promise.all(handlers.map(handler => handler.handleEvent(event)));
    }
  }
}