/**
 * Attestation Service
 * 
 * Service for managing digital attestations with cultural protocols
 * and digital signing support
 */

import {
  AttestationRecord,
  AttestationType,
  DigitalSignature,
  AttestationData,
  AdminUser,
  CulturalAuthorization
} from '../types';

export interface CreateAttestationRequest {
  type: AttestationType;
  subjectId: string;
  subjectType: 'user' | 'organisation' | 'system';
  attestedBy: string;
  validUntil?: Date;
  attestationData: AttestationData;
  complianceFrameworks: string[];
  culturalProtocols?: string[];
}

export interface AttestationFilters {
  types?: AttestationType[];
  status?: string[];
  subjectId?: string;
  attestedBy?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  culturalOnly?: boolean;
  complianceFrameworks?: string[];
}

export class AttestationService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/admin/attestations') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get attestations with filtering
   */
  async getAttestations(options: {
    consentId?: string;
    adminUserId: string;
    filters?: AttestationFilters;
    includeCultural?: boolean;
  }): Promise<AttestationRecord[]> {
    const params = new URLSearchParams();
    
    if (options.consentId) {
      params.append('consentId', options.consentId);
    }

    if (options.filters) {
      if (options.filters.types) {
        params.append('types', options.filters.types.join(','));
      }
      if (options.filters.status) {
        params.append('status', options.filters.status.join(','));
      }
      if (options.filters.subjectId) {
        params.append('subjectId', options.filters.subjectId);
      }
      if (options.filters.attestedBy) {
        params.append('attestedBy', options.filters.attestedBy);
      }
      if (options.filters.culturalOnly) {
        params.append('culturalOnly', 'true');
      }
      if (options.filters.complianceFrameworks) {
        params.append('complianceFrameworks', options.filters.complianceFrameworks.join(','));
      }
      if (options.filters.timeRange) {
        params.append('startDate', options.filters.timeRange.start.toISOString());
        params.append('endDate', options.filters.timeRange.end.toISOString());
      }
    }

    if (options.includeCultural) {
      params.append('includeCultural', 'true');
    }

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': options.adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get attestations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get single attestation
   */
  async getAttestation(
    attestationId: string,
    adminUserId: string
  ): Promise<AttestationRecord> {
    const response = await fetch(`${this.baseUrl}/${attestationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get attestation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create new attestation
   */
  async createAttestation(
    request: CreateAttestationRequest
  ): Promise<AttestationRecord> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': request.attestedBy
      },
      body: JSON.stringify({
        type: request.type,
        subjectId: request.subjectId,
        subjectType: request.subjectType,
        validUntil: request.validUntil?.toISOString(),
        attestationData: request.attestationData,
        complianceFrameworks: request.complianceFrameworks,
        culturalProtocols: request.culturalProtocols
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create attestation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Add digital signature to attestation
   */
  async addDigitalSignature(
    attestationId: string,
    signature: DigitalSignature
  ): Promise<AttestationRecord> {
    const response = await fetch(`${this.baseUrl}/${attestationId}/signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': signature.signatoryId
      },
      body: JSON.stringify(signature)
    });

    if (!response.ok) {
      throw new Error(`Failed to add digital signature: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update attestation status
   */
  async updateAttestationStatus(
    attestationId: string,
    status: 'active' | 'expired' | 'revoked',
    reason?: string,
    adminUserId: string
  ): Promise<AttestationRecord> {
    const response = await fetch(`${this.baseUrl}/${attestationId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      },
      body: JSON.stringify({ status, reason })
    });

    if (!response.ok) {
      throw new Error(`Failed to update attestation status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get attestation history
   */
  async getAttestationHistory(
    attestationId: string,
    adminUserId: string
  ): Promise<Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details?: any;
  }>> {
    const response = await fetch(`${this.baseUrl}/${attestationId}/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get attestation history: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((entry: any) => ({
      ...entry,
      timestamp: new Date(entry.timestamp)
    }));
  }

  /**
   * Get cultural attestations requiring review
   */
  async getCulturalAttestationsForReview(
    adminUserId: string,
    territory?: string
  ): Promise<AttestationRecord[]> {
    const params = new URLSearchParams({
      needsReview: 'true',
      cultural: 'true'
    });

    if (territory) {
      params.append('territory', territory);
    }

    const response = await fetch(`${this.baseUrl}/cultural/review?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get cultural attestations for review: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Approve cultural attestation (Elder/Cultural Keeper only)
   */
  async approveCulturalAttestation(
    attestationId: string,
    approval: {
      adminUserId: string;
      culturalContext?: string;
      eldershipRecognition?: boolean;
      ceremonialAuthority?: boolean;
    }
  ): Promise<AttestationRecord> {
    const response = await fetch(`${this.baseUrl}/${attestationId}/cultural-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': approval.adminUserId
      },
      body: JSON.stringify(approval)
    });

    if (!response.ok) {
      throw new Error(`Failed to approve cultural attestation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Export attestations
   */
  async exportAttestations(
    options: {
      format: 'csv' | 'json' | 'pdf';
      filters?: AttestationFilters;
      includeCultural?: boolean;
      includeSignatures?: boolean;
    },
    adminUserId: string
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error(`Failed to export attestations: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Validate attestation compliance
   */
  async validateCompliance(
    attestationId: string,
    frameworks: string[],
    adminUserId: string
  ): Promise<{
    valid: boolean;
    violations: Array<{
      framework: string;
      rule: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
    }>;
    culturalCompliance?: {
      protocolsFollowed: boolean;
      elderApprovalRequired: boolean;
      territoryConsultationNeeded: boolean;
    };
  }> {
    const response = await fetch(`${this.baseUrl}/${attestationId}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      },
      body: JSON.stringify({ frameworks })
    });

    if (!response.ok) {
      throw new Error(`Failed to validate attestation compliance: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get attestation statistics
   */
  async getAttestationStatistics(
    adminUserId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalAttestations: number;
    byType: Record<AttestationType, number>;
    byStatus: Record<string, number>;
    culturalAttestations: number;
    digitallySignedAttestations: number;
    recentActivity: Array<{
      date: string;
      count: number;
      culturalCount: number;
    }>;
  }> {
    const params = new URLSearchParams();
    if (timeRange) {
      params.append('startDate', timeRange.start.toISOString());
      params.append('endDate', timeRange.end.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/statistics?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get attestation statistics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search attestations
   */
  async searchAttestations(
    query: string,
    options: {
      includeCultural?: boolean;
      fuzzyMatch?: boolean;
      limit?: number;
    },
    adminUserId: string
  ): Promise<AttestationRecord[]> {
    const params = new URLSearchParams({
      q: query,
      ...Object.fromEntries(
        Object.entries(options).map(([key, value]) => [key, value.toString()])
      )
    });

    const response = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to search attestations: ${response.statusText}`);
    }

    return response.json();
  }
}