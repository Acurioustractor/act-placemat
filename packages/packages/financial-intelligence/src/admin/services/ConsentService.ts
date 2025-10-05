/**
 * Consent Service
 * 
 * Service for managing consent records with Australian compliance
 * and Indigenous data sovereignty support
 */

import {
  ConsentRecord,
  ConsentListResponse,
  ConsentDetailResponse,
  ConsentDashboardStats,
  ConsentFilters,
  ConsentSortOptions,
  PaginationOptions,
  ConsentBulkOperation,
  ConsentAction,
  ConsentHistoryEntry,
  ComplianceStatus,
  CulturalContext,
  AdminAction,
  SovereigntyLevel,
  ConsentLevel
} from '../types';

export class ConsentService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/admin/consents') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(adminUserId: string): Promise<ConsentDashboardStats> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get dashboard stats: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get consent list with filtering and pagination
   */
  async getConsents(options: {
    filters?: ConsentFilters;
    sorting?: ConsentSortOptions;
    pagination?: PaginationOptions;
    userId: string;
    culturalContext?: {
      traditionalTerritory?: string;
      showCulturalActions?: boolean;
    };
  }): Promise<ConsentListResponse> {
    const params = new URLSearchParams();
    
    // Add filters
    if (options.filters) {
      if (options.filters.consentLevels) {
        params.append('consentLevels', options.filters.consentLevels.join(','));
      }
      if (options.filters.sovereigntyLevels) {
        params.append('sovereigntyLevels', options.filters.sovereigntyLevels.join(','));
      }
      if (options.filters.status) {
        params.append('status', options.filters.status.join(','));
      }
      if (options.filters.searchTerm) {
        params.append('search', options.filters.searchTerm);
      }
      if (options.filters.indigenousData !== undefined) {
        params.append('indigenousData', options.filters.indigenousData.toString());
      }
      if (options.filters.culturallySensitive !== undefined) {
        params.append('culturallySensitive', options.filters.culturallySensitive.toString());
      }
      if (options.filters.dateRange) {
        params.append('startDate', options.filters.dateRange.start.toISOString());
        params.append('endDate', options.filters.dateRange.end.toISOString());
      }
    }

    // Add sorting
    if (options.sorting) {
      params.append('sortField', options.sorting.field);
      params.append('sortDirection', options.sorting.direction);
    }

    // Add pagination
    if (options.pagination) {
      params.append('page', options.pagination.page.toString());
      params.append('pageSize', options.pagination.pageSize.toString());
    }

    // Add cultural context
    if (options.culturalContext?.traditionalTerritory) {
      params.append('traditionalTerritory', options.culturalContext.traditionalTerritory);
    }

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': options.userId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get consents: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get detailed consent information
   */
  async getConsentDetails(consentId: string, adminUserId: string): Promise<ConsentDetailResponse> {
    const response = await fetch(`${this.baseUrl}/${consentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get consent details: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update consent record
   */
  async updateConsent(
    consentId: string,
    updates: Partial<ConsentRecord>,
    context: {
      action: ConsentAction;
      adminUserId: string;
      culturalReview?: boolean;
    }
  ): Promise<ConsentRecord> {
    const response = await fetch(`${this.baseUrl}/${consentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': context.adminUserId
      },
      body: JSON.stringify({
        updates,
        context: {
          action: context.action,
          culturalReview: context.culturalReview
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update consent: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Revoke consent
   */
  async revokeConsent(
    consentId: string,
    revocation: {
      revokedBy: string;
      reason: string;
      culturalReview?: boolean;
    }
  ): Promise<ConsentRecord> {
    const response = await fetch(`${this.baseUrl}/${consentId}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': revocation.revokedBy
      },
      body: JSON.stringify(revocation)
    });

    if (!response.ok) {
      throw new Error(`Failed to revoke consent: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Perform bulk operations on consents
   */
  async performBulkOperation(operation: ConsentBulkOperation): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const response = await fetch(`${this.baseUrl}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': operation.performedBy
      },
      body: JSON.stringify(operation)
    });

    if (!response.ok) {
      throw new Error(`Failed to perform bulk operation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create new consent record
   */
  async createConsent(
    consentData: Omit<ConsentRecord, 'id' | 'grantedAt' | 'lastModified' | 'history' | 'attestations'>,
    adminUserId: string
  ): Promise<ConsentRecord> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      },
      body: JSON.stringify(consentData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create consent: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get consent history
   */
  async getConsentHistory(
    consentId: string,
    adminUserId: string,
    options?: {
      includeCulturalActions?: boolean;
      limit?: number;
    }
  ): Promise<ConsentHistoryEntry[]> {
    const params = new URLSearchParams();
    if (options?.includeCulturalActions) {
      params.append('includeCultural', 'true');
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }

    const response = await fetch(`${this.baseUrl}/${consentId}/history?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get consent history: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check compliance status for consent
   */
  async checkComplianceStatus(
    consentId: string,
    adminUserId: string
  ): Promise<ComplianceStatus> {
    const response = await fetch(`${this.baseUrl}/${consentId}/compliance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check compliance status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get cultural context for consent
   */
  async getCulturalContext(
    consentId: string,
    adminUserId: string
  ): Promise<CulturalContext> {
    const response = await fetch(`${this.baseUrl}/${consentId}/cultural-context`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get cultural context: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get available actions for consent
   */
  async getAvailableActions(
    consentId: string,
    adminUserId: string
  ): Promise<AdminAction[]> {
    const response = await fetch(`${this.baseUrl}/${consentId}/actions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get available actions: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Export consent data
   */
  async exportConsents(
    options: {
      format: 'csv' | 'json' | 'pdf';
      filters?: ConsentFilters;
      includeHistory?: boolean;
      includeCulturalData?: boolean;
      redactionLevel?: 'none' | 'partial' | 'full';
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
      throw new Error(`Failed to export consents: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Validate consent against compliance frameworks
   */
  async validateCompliance(
    consentId: string,
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
  }> {
    const response = await fetch(`${this.baseUrl}/${consentId}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      },
      body: JSON.stringify({ frameworks })
    });

    if (!response.ok) {
      throw new Error(`Failed to validate compliance: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search consents with advanced filters
   */
  async searchConsents(
    query: string,
    options: {
      includeHistory?: boolean;
      includeCulturalData?: boolean;
      fuzzyMatch?: boolean;
      limit?: number;
    },
    adminUserId: string
  ): Promise<ConsentRecord[]> {
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
      throw new Error(`Failed to search consents: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get consent renewal recommendations
   */
  async getRenewalRecommendations(
    adminUserId: string,
    options?: {
      daysUntilExpiry?: number;
      includeIndigenousData?: boolean;
    }
  ): Promise<Array<{
    consentId: string;
    dataSubject: string;
    currentLevel: ConsentLevel;
    recommendedLevel: ConsentLevel;
    reason: string;
    urgency: 'low' | 'medium' | 'high';
    culturalConsiderations?: string[];
  }>> {
    const params = new URLSearchParams();
    if (options?.daysUntilExpiry) {
      params.append('daysUntilExpiry', options.daysUntilExpiry.toString());
    }
    if (options?.includeIndigenousData) {
      params.append('includeIndigenousData', 'true');
    }

    const response = await fetch(`${this.baseUrl}/renewal-recommendations?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get renewal recommendations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate consent report
   */
  async generateReport(
    reportType: 'compliance' | 'cultural_sovereignty' | 'data_usage' | 'audit_trail',
    options: {
      dateRange?: { start: Date; end: Date };
      includeIndigenousData?: boolean;
      format?: 'pdf' | 'html' | 'json';
    },
    adminUserId: string
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/reports/${reportType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error(`Failed to generate report: ${response.statusText}`);
    }

    return response.blob();
  }
}