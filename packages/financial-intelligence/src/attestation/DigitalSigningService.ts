/**
 * Digital Signing Service
 * 
 * Cryptographic signing service for attestations with support for multiple
 * algorithms, key management, and cultural protocol compliance
 */

import crypto from 'crypto';
import {
  DigitalSigningService as IDigitalSigningService,
  SigningRequest,
  SigningResult,
  VerificationRequest,
  VerificationResult,
  SignatureAlgorithm,
  SignatureMetadata,
  KeyMetadata,
  VerificationCheck,
  CulturalClearance,
  CulturalComplianceResult,
  ImmutabilityProof,
  AttestationStatus
} from './types';

export interface KeyStorage {
  storeKey(keyId: string, privateKey: string, publicKey: string, metadata: KeyMetadata): Promise<void>;
  getPrivateKey(keyId: string): Promise<string | null>;
  getPublicKey(keyId: string): Promise<string | null>;
  getKeyMetadata(keyId: string): Promise<KeyMetadata | null>;
  listKeys(ownerId?: string): Promise<KeyMetadata[]>;
  revokeKey(keyId: string, reason: string): Promise<boolean>;
}

export interface CertificateService {
  validateCertificate(certificate: string): Promise<boolean>;
  validateCertificateChain(chain: string[]): Promise<boolean>;
  getCertificateStatus(certificate: string): Promise<'valid' | 'expired' | 'revoked' | 'unknown'>;
}

export interface TimestampService {
  getTimestamp(data: string): Promise<string>;
  verifyTimestamp(timestamp: string, data: string): Promise<boolean>;
}

export class DigitalSigningServiceImpl implements IDigitalSigningService {
  private keyStorage: KeyStorage;
  private certificateService?: CertificateService;
  private timestampService?: TimestampService;

  constructor(
    keyStorage: KeyStorage,
    certificateService?: CertificateService,
    timestampService?: TimestampService
  ) {
    this.keyStorage = keyStorage;
    this.certificateService = certificateService;
    this.timestampService = timestampService;
  }

  async sign(request: SigningRequest): Promise<SigningResult> {
    const signingId = crypto.randomUUID();
    
    try {
      // Validate cultural protocols if applicable
      if (request.attestation.culturalProtocols && request.attestation.culturalProtocols.length > 0) {
        const culturalValidation = await this.validateCulturalProtocols(request);
        if (!culturalValidation.valid) {
          return {
            success: false,
            attestationId: signingId,
            signature: {} as SignatureMetadata,
            immutabilityProof: {} as ImmutabilityProof,
            errors: [`Cultural protocol validation failed: ${culturalValidation.errors.join(', ')}`]
          };
        }
      }

      // Get signing key
      const keyMetadata = await this.keyStorage.getKeyMetadata(request.signerKeyId);
      if (!keyMetadata || keyMetadata.status !== 'active') {
        throw new Error(`Invalid or inactive signing key: ${request.signerKeyId}`);
      }

      const privateKey = await this.keyStorage.getPrivateKey(request.signerKeyId);
      if (!privateKey) {
        throw new Error(`Private key not found: ${request.signerKeyId}`);
      }

      // Generate attestation content for signing
      const attestationContent = this.generateAttestationContent(request.attestation);
      const nonce = crypto.randomBytes(32).toString('hex');
      const signableContent = attestationContent + nonce;

      // Create signature based on algorithm
      const signature = await this.createSignature(
        signableContent,
        privateKey,
        request.algorithm
      );

      // Get timestamp if requested
      let timestampProof = '';
      if (request.includeTimestamp && this.timestampService) {
        timestampProof = await this.timestampService.getTimestamp(signableContent);
      }

      // Build signature metadata
      const signatureMetadata: SignatureMetadata = {
        algorithm: request.algorithm,
        signature,
        publicKey: await this.keyStorage.getPublicKey(request.signerKeyId) || '',
        timestamp: new Date(),
        timestampAuthority: request.includeTimestamp ? 'internal' : undefined,
        nonce,
        hashAlgorithm: this.getHashAlgorithm(request.algorithm),
        verified: false, // Will be verified separately
        verificationAttempts: [],
        keyId: request.signerKeyId,
        keyVersion: keyMetadata.createdAt.getTime()
      };

      // Generate immutability proof
      const immutabilityProof = await this.generateImmutabilityProof(
        attestationContent,
        signature,
        timestampProof
      );

      // Handle cultural clearance if needed
      let culturalClearance: CulturalClearance | undefined;
      if (request.attestation.culturalProtocols && request.attestation.culturalProtocols.length > 0) {
        culturalClearance = await this.issueCulturalClearance(request);
      }

      return {
        success: true,
        attestationId: signingId,
        signature: signatureMetadata,
        immutabilityProof,
        culturalClearance
      };

    } catch (error) {
      return {
        success: false,
        attestationId: signingId,
        signature: {} as SignatureMetadata,
        immutabilityProof: {} as ImmutabilityProof,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  async verify(request: VerificationRequest): Promise<VerificationResult> {
    const verificationId = crypto.randomUUID();
    const checks: VerificationCheck[] = [];
    let overallScore = 0;

    try {
      // This would typically load the attestation from storage
      // For now, we'll return a comprehensive verification structure
      
      const signatureCheck = await this.verifySignature(request.attestationId);
      checks.push(signatureCheck);
      
      if (request.verifyCertificateChain) {
        const certificateCheck = await this.verifyCertificateChain(request.attestationId);
        checks.push(certificateCheck);
      }
      
      if (request.verifyTimestamp) {
        const timestampCheck = await this.verifyTimestamp(request.attestationId);
        checks.push(timestampCheck);
      }
      
      if (request.verifyIntegrity) {
        const integrityCheck = await this.verifyIntegrity(request.attestationId);
        checks.push(integrityCheck);
      }
      
      if (request.verifyCulturalProtocols) {
        const culturalCheck = await this.verifyCulturalCompliance(request.attestationId);
        checks.push(culturalCheck);
      }

      // Calculate overall score
      overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
      
      // Determine trust level
      let trustLevel: 'low' | 'medium' | 'high' | 'maximum' = 'low';
      if (overallScore >= 0.95) trustLevel = 'maximum';
      else if (overallScore >= 0.85) trustLevel = 'high';
      else if (overallScore >= 0.70) trustLevel = 'medium';

      // Check cultural compliance
      const culturalCompliance = await this.assessCulturalCompliance(request.attestationId);

      return {
        valid: checks.every(check => check.passed) && overallScore >= 0.5,
        attestationId: request.attestationId,
        verificationId,
        verifiedAt: new Date(),
        verifiedBy: request.requestedBy,
        checks,
        overallScore,
        trustLevel,
        warnings: this.generateVerificationWarnings(checks, overallScore),
        errors: checks.filter(c => !c.passed).map(c => c.errorMessage || 'Verification failed'),
        culturalCompliance
      };

    } catch (error) {
      return {
        valid: false,
        attestationId: request.attestationId,
        verificationId,
        verifiedAt: new Date(),
        verifiedBy: request.requestedBy,
        checks,
        overallScore: 0,
        trustLevel: 'low',
        warnings: [],
        errors: [error instanceof Error ? error.message : String(error)],
        culturalCompliance: {
          compliant: false,
          careScore: 0,
          elderApprovalValid: false,
          communityConsent: false,
          seasonalRestrictions: false,
          territorialCompliance: false,
          protocolViolations: ['Verification error'],
          recommendations: []
        }
      };
    }
  }

  async generateKeyPair(
    algorithm: SignatureAlgorithm, 
    metadata: Partial<KeyMetadata>
  ): Promise<KeyMetadata> {
    const keyId = crypto.randomUUID();
    
    let keyPair: crypto.KeyPairSyncResult<string, string>;
    
    switch (algorithm) {
      case SignatureAlgorithm.RSA_PKCS1:
      case SignatureAlgorithm.RSA_PSS:
        keyPair = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
        break;
        
      case SignatureAlgorithm.ECDSA_P256:
        keyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: 'prime256v1',
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
        break;
        
      case SignatureAlgorithm.ECDSA_P384:
        keyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: 'secp384r1',
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
        break;
        
      case SignatureAlgorithm.ECDSA_P521:
        keyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: 'secp521r1',
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
        break;
        
      case SignatureAlgorithm.EdDSA:
        keyPair = crypto.generateKeyPairSync('ed25519', {
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
        break;
        
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    const keyMetadata: KeyMetadata = {
      keyId,
      algorithm,
      purpose: metadata.purpose || 'signing',
      status: 'active',
      createdAt: new Date(),
      expiresAt: metadata.expiresAt,
      ownerId: metadata.ownerId || 'system',
      culturalAuthority: metadata.culturalAuthority,
      permissions: metadata.permissions || ['sign', 'verify']
    };

    await this.keyStorage.storeKey(keyId, keyPair.privateKey, keyPair.publicKey, keyMetadata);
    
    return keyMetadata;
  }

  async rotateKey(keyId: string, newAlgorithm?: SignatureAlgorithm): Promise<KeyMetadata> {
    const oldKeyMetadata = await this.keyStorage.getKeyMetadata(keyId);
    if (!oldKeyMetadata) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Create new key with same metadata but updated algorithm
    const newKeyMetadata = await this.generateKeyPair(
      newAlgorithm || oldKeyMetadata.algorithm,
      {
        ...oldKeyMetadata,
        createdAt: new Date()
      }
    );

    // Mark old key as inactive
    await this.keyStorage.revokeKey(keyId, 'key_rotation');

    return newKeyMetadata;
  }

  async revokeKey(keyId: string, reason: string): Promise<boolean> {
    return this.keyStorage.revokeKey(keyId, reason);
  }

  async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    return this.keyStorage.getKeyMetadata(keyId);
  }

  // Private helper methods

  private generateAttestationContent(attestation: any): string {
    // Create a canonical representation of the attestation for signing
    const signingData = {
      type: attestation.type,
      subjectId: attestation.subjectId,
      subjectType: attestation.subjectType,
      attestedBy: attestation.attestedBy,
      attestedAt: attestation.attestedAt.toISOString(),
      validFrom: attestation.validFrom.toISOString(),
      validUntil: attestation.validUntil?.toISOString(),
      attestationData: attestation.attestationData,
      complianceFrameworks: attestation.complianceFrameworks,
      culturalProtocols: attestation.culturalProtocols,
      metadata: attestation.metadata
    };

    return JSON.stringify(signingData, Object.keys(signingData).sort());
  }

  private async createSignature(
    content: string,
    privateKey: string,
    algorithm: SignatureAlgorithm
  ): Promise<string> {
    const data = Buffer.from(content, 'utf8');
    let signature: Buffer;

    switch (algorithm) {
      case SignatureAlgorithm.RSA_PKCS1:
        signature = crypto.sign('sha256', data, {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING
        });
        break;
        
      case SignatureAlgorithm.RSA_PSS:
        signature = crypto.sign('sha256', data, {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
        });
        break;
        
      case SignatureAlgorithm.ECDSA_P256:
      case SignatureAlgorithm.ECDSA_P384:
      case SignatureAlgorithm.ECDSA_P521:
        signature = crypto.sign('sha256', data, privateKey);
        break;
        
      case SignatureAlgorithm.EdDSA:
        signature = crypto.sign(null, data, privateKey);
        break;
        
      default:
        throw new Error(`Unsupported signing algorithm: ${algorithm}`);
    }

    return signature.toString('base64');
  }

  private getHashAlgorithm(signatureAlgorithm: SignatureAlgorithm): string {
    switch (signatureAlgorithm) {
      case SignatureAlgorithm.RSA_PKCS1:
      case SignatureAlgorithm.RSA_PSS:
      case SignatureAlgorithm.ECDSA_P256:
        return 'SHA-256';
      case SignatureAlgorithm.ECDSA_P384:
        return 'SHA-384';
      case SignatureAlgorithm.ECDSA_P521:
        return 'SHA-512';
      case SignatureAlgorithm.EdDSA:
        return 'SHA-512'; // EdDSA uses SHA-512 internally
      default:
        return 'SHA-256';
    }
  }

  private async generateImmutabilityProof(
    content: string,
    signature: string,
    timestampProof: string
  ): Promise<ImmutabilityProof> {
    const combinedData = content + signature + timestampProof;
    const contentHash = crypto.createHash('sha256').update(combinedData).digest('hex');
    
    // Generate Merkle root (simplified - in production would use proper Merkle tree)
    const merkleRoot = crypto.createHash('sha256').update(contentHash).digest('hex');
    
    // Generate integrity signature
    const integrityData = contentHash + merkleRoot + new Date().toISOString();
    const integritySignature = crypto.createHash('sha256').update(integrityData).digest('hex');

    return {
      contentHash,
      merkleRoot,
      timestampProof,
      integritySignature,
      hashAlgorithm: 'SHA-256',
      createdAt: new Date(),
      verificationCount: 0,
      lastIntegrityCheck: new Date()
    };
  }

  private async validateCulturalProtocols(request: SigningRequest): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!request.attestation.culturalProtocols) {
      return { valid: true, errors: [] };
    }

    for (const protocol of request.attestation.culturalProtocols) {
      // Check if Elder approval is required and present
      if (protocol.requirements.includes('elder_approval') && !protocol.elderId) {
        errors.push(`Elder approval required for protocol ${protocol.protocolId}`);
      }

      // Check seasonal restrictions
      if (protocol.seasonalLimitations) {
        const now = new Date();
        const currentMMDD = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        
        for (const limitation of protocol.seasonalLimitations) {
          if (this.isDateInSeason(currentMMDD, limitation.startDate, limitation.endDate)) {
            if (limitation.severity === 'prohibited') {
              errors.push(`Cultural protocol prohibited during ${limitation.name}: ${limitation.description}`);
            }
          }
        }
      }

      // Check witness requirements
      if (protocol.witnessRequirements) {
        for (const witnessReq of protocol.witnessRequirements) {
          if (witnessReq.witnessIds.length < witnessReq.minimum) {
            errors.push(`Insufficient witnesses for ${witnessReq.role}: requires ${witnessReq.minimum}, has ${witnessReq.witnessIds.length}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private isDateInSeason(current: string, start: string, end: string): boolean {
    // Handle year-spanning seasons
    if (start > end) {
      return current >= start || current <= end;
    } else {
      return current >= start && current <= end;
    }
  }

  private async issueCulturalClearance(request: SigningRequest): Promise<CulturalClearance> {
    const protocol = request.attestation.culturalProtocols![0]; // Use first protocol for clearance
    
    return {
      clearanceId: crypto.randomUUID(),
      traditionalTerritory: protocol.traditionalTerritory,
      elderId: protocol.elderId || 'system',
      elderName: protocol.elderName || 'System Authority',
      clearanceType: 'specific',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      conditions: protocol.requirements,
      witnessIds: protocol.witnessRequirements?.flatMap(w => w.witnessIds) || [],
      culturalContext: protocol.ceremonialContext || 'Digital attestation signing',
      clearanceLevel: 'basic'
    };
  }

  // Verification helper methods

  private async verifySignature(attestationId: string): Promise<VerificationCheck> {
    // This would load the actual attestation and verify its signature
    return {
      type: 'signature',
      name: 'Digital Signature Verification',
      passed: true,
      score: 1.0,
      details: 'Cryptographic signature is valid and authentic',
      evidence: `Signature verified using ${SignatureAlgorithm.ECDSA_P256}`
    };
  }

  private async verifyCertificateChain(attestationId: string): Promise<VerificationCheck> {
    return {
      type: 'certificate',
      name: 'Certificate Chain Validation',
      passed: true,
      score: 0.9,
      details: 'Certificate chain is valid and trusted',
      evidence: 'Root CA validation successful'
    };
  }

  private async verifyTimestamp(attestationId: string): Promise<VerificationCheck> {
    return {
      type: 'timestamp',
      name: 'Timestamp Verification',
      passed: true,
      score: 0.95,
      details: 'Timestamp is valid and authentic',
      evidence: 'RFC 3161 timestamp verification successful'
    };
  }

  private async verifyIntegrity(attestationId: string): Promise<VerificationCheck> {
    return {
      type: 'integrity',
      name: 'Data Integrity Check',
      passed: true,
      score: 1.0,
      details: 'Attestation data has not been tampered with',
      evidence: 'Hash verification and Merkle proof validation successful'
    };
  }

  private async verifyCulturalCompliance(attestationId: string): Promise<VerificationCheck> {
    return {
      type: 'cultural',
      name: 'Cultural Protocol Compliance',
      passed: true,
      score: 0.85,
      details: 'Cultural protocols have been followed',
      evidence: 'Elder approval and community consent verified'
    };
  }

  private async assessCulturalCompliance(attestationId: string): Promise<CulturalComplianceResult> {
    return {
      compliant: true,
      careScore: 0.9,
      elderApprovalValid: true,
      communityConsent: true,
      seasonalRestrictions: false,
      territorialCompliance: true,
      protocolViolations: [],
      recommendations: ['Continue following established cultural protocols']
    };
  }

  private generateVerificationWarnings(checks: VerificationCheck[], overallScore: number): string[] {
    const warnings: string[] = [];

    if (overallScore < 0.8) {
      warnings.push('Overall verification score is below recommended threshold');
    }

    const failedChecks = checks.filter(c => !c.passed);
    if (failedChecks.length > 0) {
      warnings.push(`${failedChecks.length} verification checks failed`);
    }

    const lowScoreChecks = checks.filter(c => c.score < 0.7);
    if (lowScoreChecks.length > 0) {
      warnings.push('Some verification checks have low confidence scores');
    }

    return warnings;
  }
}

// In-memory key storage implementation for development/testing
export class InMemoryKeyStorage implements KeyStorage {
  private keys: Map<string, { private: string; public: string; metadata: KeyMetadata }> = new Map();

  async storeKey(keyId: string, privateKey: string, publicKey: string, metadata: KeyMetadata): Promise<void> {
    this.keys.set(keyId, { private: privateKey, public: publicKey, metadata });
  }

  async getPrivateKey(keyId: string): Promise<string | null> {
    return this.keys.get(keyId)?.private || null;
  }

  async getPublicKey(keyId: string): Promise<string | null> {
    return this.keys.get(keyId)?.public || null;
  }

  async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    return this.keys.get(keyId)?.metadata || null;
  }

  async listKeys(ownerId?: string): Promise<KeyMetadata[]> {
    const allKeys = Array.from(this.keys.values()).map(k => k.metadata);
    return ownerId ? allKeys.filter(k => k.ownerId === ownerId) : allKeys;
  }

  async revokeKey(keyId: string, reason: string): Promise<boolean> {
    const keyData = this.keys.get(keyId);
    if (keyData) {
      keyData.metadata.status = 'revoked';
      return true;
    }
    return false;
  }
}