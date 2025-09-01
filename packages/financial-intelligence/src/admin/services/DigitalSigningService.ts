/**
 * Digital Signing Service
 * 
 * Service for handling digital signatures with cryptographic verification
 * and audit trail integration
 */

import {
  AttestationRecord,
  DigitalSignature,
  AdminUser
} from '../types';

export interface SigningKeyPair {
  publicKey: string;
  privateKey: string; // Never exposed in responses
  algorithm: 'RSA-PKCS1' | 'ECDSA-P256' | 'EdDSA';
  keyId: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface SigningRequest {
  data: any;
  algorithm?: 'RSA-PKCS1' | 'ECDSA-P256' | 'EdDSA';
  includeTimestamp?: boolean;
  includeCertificateChain?: boolean;
}

export interface VerificationResult {
  valid: boolean;
  algorithm: string;
  signedAt: Date;
  signatoryId: string;
  certificateValid: boolean;
  trustChainValid: boolean;
  errors?: string[];
}

export class DigitalSigningService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/admin/digital-signing') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate signing key pair for admin user
   */
  async generateKeyPair(
    adminUser: AdminUser,
    options?: {
      algorithm?: 'RSA-PKCS1' | 'ECDSA-P256' | 'EdDSA';
      keySize?: number;
      validityPeriod?: number; // days
    }
  ): Promise<{
    keyId: string;
    publicKey: string;
    algorithm: string;
    expiresAt?: Date;
  }> {
    const response = await fetch(`${this.baseUrl}/keys/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUser.id
      },
      body: JSON.stringify({
        algorithm: options?.algorithm || 'ECDSA-P256',
        keySize: options?.keySize || 256,
        validityPeriod: options?.validityPeriod || 365
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate key pair: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
    };
  }

  /**
   * Get admin user's public keys
   */
  async getPublicKeys(adminUserId: string): Promise<Array<{
    keyId: string;
    publicKey: string;
    algorithm: string;
    createdAt: Date;
    expiresAt?: Date;
    status: 'active' | 'expired' | 'revoked';
  }>> {
    const response = await fetch(`${this.baseUrl}/keys/public/${adminUserId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get public keys: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((key: any) => ({
      ...key,
      createdAt: new Date(key.createdAt),
      expiresAt: key.expiresAt ? new Date(key.expiresAt) : undefined
    }));
  }

  /**
   * Sign attestation
   */
  async signAttestation(
    attestation: AttestationRecord,
    adminUser: AdminUser,
    options?: {
      algorithm?: 'RSA-PKCS1' | 'ECDSA-P256' | 'EdDSA';
      keyId?: string;
      includeTimestamp?: boolean;
    }
  ): Promise<DigitalSignature> {
    // Prepare data to be signed
    const signingData = {
      attestationId: attestation.id,
      type: attestation.type,
      subjectId: attestation.subjectId,
      subjectType: attestation.subjectType,
      attestedBy: attestation.attestedBy,
      attestedAt: attestation.attestedAt.toISOString(),
      attestationData: attestation.attestationData,
      complianceFrameworks: attestation.complianceFrameworks
    };

    const response = await fetch(`${this.baseUrl}/sign/attestation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUser.id
      },
      body: JSON.stringify({
        attestationId: attestation.id,
        signingData,
        algorithm: options?.algorithm || 'ECDSA-P256',
        keyId: options?.keyId,
        includeTimestamp: options?.includeTimestamp !== false
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to sign attestation: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      timestamp: new Date(data.timestamp)
    };
  }

  /**
   * Sign arbitrary data
   */
  async signData(
    data: any,
    adminUser: AdminUser,
    options?: SigningRequest
  ): Promise<DigitalSignature> {
    const response = await fetch(`${this.baseUrl}/sign/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUser.id
      },
      body: JSON.stringify({
        data,
        algorithm: options?.algorithm || 'ECDSA-P256',
        includeTimestamp: options?.includeTimestamp !== false,
        includeCertificateChain: options?.includeCertificateChain || false
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to sign data: ${response.statusText}`);
    }

    const responseData = await response.json();
    return {
      ...responseData,
      timestamp: new Date(responseData.timestamp)
    };
  }

  /**
   * Verify digital signature
   */
  async verifySignature(
    attestationOrData: AttestationRecord | any,
    signature?: DigitalSignature
  ): Promise<boolean> {
    // If it's an attestation with embedded signature
    if ('digitalSignature' in attestationOrData && attestationOrData.digitalSignature) {
      return this.verifyAttestationSignature(attestationOrData);
    }

    // If it's arbitrary data with separate signature
    if (signature) {
      return this.verifyDataSignature(attestationOrData, signature);
    }

    throw new Error('Invalid signature verification request');
  }

  /**
   * Verify attestation signature
   */
  private async verifyAttestationSignature(
    attestation: AttestationRecord
  ): Promise<boolean> {
    if (!attestation.digitalSignature) {
      throw new Error('Attestation has no digital signature');
    }

    const response = await fetch(`${this.baseUrl}/verify/attestation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attestationId: attestation.id,
        signature: attestation.digitalSignature
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to verify attestation signature: ${response.statusText}`);
    }

    const result = await response.json();
    return result.valid;
  }

  /**
   * Verify data signature
   */
  private async verifyDataSignature(
    data: any,
    signature: DigitalSignature
  ): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/verify/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data,
        signature
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to verify data signature: ${response.statusText}`);
    }

    const result = await response.json();
    return result.valid;
  }

  /**
   * Get detailed verification result
   */
  async getVerificationResult(
    attestationOrData: AttestationRecord | any,
    signature?: DigitalSignature
  ): Promise<VerificationResult> {
    let endpoint: string;
    let body: any;

    if ('digitalSignature' in attestationOrData && attestationOrData.digitalSignature) {
      // Attestation verification
      endpoint = `${this.baseUrl}/verify/attestation/detailed`;
      body = {
        attestationId: attestationOrData.id,
        signature: attestationOrData.digitalSignature
      };
    } else if (signature) {
      // Data verification
      endpoint = `${this.baseUrl}/verify/data/detailed`;
      body = {
        data: attestationOrData,
        signature
      };
    } else {
      throw new Error('Invalid verification request');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Failed to get verification result: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      signedAt: new Date(data.signedAt)
    };
  }

  /**
   * Revoke signing key
   */
  async revokeKey(
    keyId: string,
    reason: string,
    adminUserId: string
  ): Promise<{
    revoked: boolean;
    revokedAt: Date;
    reason: string;
  }> {
    const response = await fetch(`${this.baseUrl}/keys/${keyId}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error(`Failed to revoke key: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      revokedAt: new Date(data.revokedAt)
    };
  }

  /**
   * Get signing certificate
   */
  async getSigningCertificate(
    keyId: string,
    adminUserId: string
  ): Promise<{
    certificate: string;
    certificateChain: string[];
    issuer: string;
    subject: string;
    validFrom: Date;
    validTo: Date;
    serialNumber: string;
  }> {
    const response = await fetch(`${this.baseUrl}/keys/${keyId}/certificate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get signing certificate: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      validFrom: new Date(data.validFrom),
      validTo: new Date(data.validTo)
    };
  }

  /**
   * Validate signature compatibility
   */
  async validateSignatureCompatibility(
    algorithm: string,
    keySize: number,
    complianceFrameworks: string[]
  ): Promise<{
    compatible: boolean;
    recommendations: string[];
    securityLevel: 'low' | 'medium' | 'high' | 'very_high';
    culturalCompliance: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/validate-compatibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        algorithm,
        keySize,
        complianceFrameworks
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to validate signature compatibility: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get signing activity report
   */
  async getSigningActivity(
    adminUserId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalSignatures: number;
    attestationSignatures: number;
    dataSignatures: number;
    failedAttempts: number;
    keyRotations: number;
    recentActivity: Array<{
      action: string;
      timestamp: Date;
      success: boolean;
      details?: string;
    }>;
  }> {
    const params = new URLSearchParams();
    if (timeRange) {
      params.append('startDate', timeRange.start.toISOString());
      params.append('endDate', timeRange.end.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/activity/${adminUserId}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get signing activity: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      recentActivity: data.recentActivity.map((activity: any) => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }))
    };
  }

  /**
   * Generate cultural attestation signature with special protocols
   */
  async signCulturalAttestation(
    attestation: AttestationRecord,
    adminUser: AdminUser,
    culturalContext: {
      territory?: string;
      elderApproval?: boolean;
      ceremonialAuthority?: boolean;
      witnessedBy?: string[];
    }
  ): Promise<DigitalSignature> {
    const response = await fetch(`${this.baseUrl}/sign/cultural-attestation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUser.id
      },
      body: JSON.stringify({
        attestationId: attestation.id,
        culturalContext,
        includeElderSeal: culturalContext.elderApproval,
        includeCeremonialSeal: culturalContext.ceremonialAuthority
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to sign cultural attestation: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      timestamp: new Date(data.timestamp)
    };
  }
}