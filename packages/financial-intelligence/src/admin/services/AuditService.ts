/**
 * Audit Service
 * 
 * Service for managing comprehensive audit trails with cultural sensitivity
 * and compliance framework integration
 */

import {
  AdminAuditLogEntry
} from '../types';

export interface AuditFilters {
  actions?: string[];
  resources?: string[];
  adminUsers?: string[];
  culturalSensitive?: boolean;
  complianceFrameworks?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
  showCulturalData?: boolean;
}

export interface AuditStats {
  totalEntries: number;
  culturalActions: number;
  complianceViolations: number;
  uniqueAdmins: number;
  actionsByType: Record<string, number>;
  entriesByDay: Array<{
    date: string;
    count: number;
    culturalActions: number;
  }>;
}

export interface LogAdminActionRequest {
  adminUserId: string;
  action: string;
  resource: string;
  resourceId: string;
  previousState?: any;
  newState?: any;
  culturalSensitive?: boolean;
  complianceFrameworks?: string[];
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/admin/audit') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get audit entries with filtering and pagination
   */
  async getAuditEntries(options: {
    consentId?: string;
    userId?: string;
    filters?: AuditFilters;
    pagination?: {
      page: number;
      pageSize: number;
    };
    adminUserId: string;
  }): Promise<{
    entries: AdminAuditLogEntry[];
    totalCount: number;
    stats: AuditStats;
  }> {
    const params = new URLSearchParams();

    if (options.consentId) {
      params.append('consentId', options.consentId);
    }
    if (options.userId) {
      params.append('userId', options.userId);
    }

    if (options.filters) {
      if (options.filters.actions) {
        params.append('actions', options.filters.actions.join(','));
      }
      if (options.filters.resources) {
        params.append('resources', options.filters.resources.join(','));
      }
      if (options.filters.adminUsers) {
        params.append('adminUsers', options.filters.adminUsers.join(','));
      }
      if (options.filters.culturalSensitive !== undefined) {
        params.append('culturalSensitive', options.filters.culturalSensitive.toString());
      }
      if (options.filters.complianceFrameworks) {
        params.append('complianceFrameworks', options.filters.complianceFrameworks.join(','));
      }
      if (options.filters.timeRange) {
        params.append('startDate', options.filters.timeRange.start.toISOString());
        params.append('endDate', options.filters.timeRange.end.toISOString());
      }
      if (options.filters.searchTerm) {
        params.append('search', options.filters.searchTerm);
      }
      if (options.filters.showCulturalData) {
        params.append('showCulturalData', 'true');
      }
    }

    if (options.pagination) {
      params.append('page', options.pagination.page.toString());
      params.append('pageSize', options.pagination.pageSize.toString());
    }

    const response = await fetch(`${this.baseUrl}/entries?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': options.adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get audit entries: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      entries: data.entries.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      })),
      totalCount: data.totalCount,
      stats: {
        ...data.stats,
        entriesByDay: data.stats.entriesByDay.map((day: any) => ({
          ...day,
          date: day.date // Keep as string for chart display
        }))
      }
    };
  }

  /**
   * Log an admin action
   */
  async logAdminAction(request: LogAdminActionRequest): Promise<AdminAuditLogEntry> {
    // Auto-detect cultural sensitivity if not specified
    const culturalKeywords = [
      'indigenous', 'cultural', 'traditional', 'elder', 'community',
      'sacred', 'ceremonial', 'sovereignty', 'territory'
    ];
    
    const autoDetectedCultural = request.culturalSensitive !== undefined 
      ? request.culturalSensitive
      : culturalKeywords.some(keyword => 
          request.action.toLowerCase().includes(keyword) ||
          request.resource.toLowerCase().includes(keyword)
        );

    // Determine retention period based on cultural sensitivity
    const retentionPeriod = autoDetectedCultural 
      ? 50 * 365 * 24 * 60 * 60 * 1000 // 50 years for Indigenous data
      : 7 * 365 * 24 * 60 * 60 * 1000;  // 7 years for general data

    // Auto-detect compliance frameworks
    const frameworks = request.complianceFrameworks || ['privacy_act_1988'];
    if (autoDetectedCultural) {
      frameworks.push('care_principles', 'indigenous_sovereignty');
    }

    const auditEntry = {
      adminUserId: request.adminUserId,
      action: request.action,
      resource: request.resource,
      resourceId: request.resourceId,
      previousState: request.previousState,
      newState: request.newState,
      culturalSensitive: autoDetectedCultural,
      complianceFrameworks: frameworks,
      retentionPeriod,
      sessionId: request.sessionId || this.generateSessionId(),
      ipAddress: request.ipAddress || 'unknown',
      userAgent: request.userAgent || 'unknown'
    };

    const response = await fetch(`${this.baseUrl}/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': request.adminUserId
      },
      body: JSON.stringify(auditEntry)
    });

    if (!response.ok) {
      throw new Error(`Failed to log admin action: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      timestamp: new Date(data.timestamp)
    };
  }

  /**
   * Get audit entry by ID
   */
  async getAuditEntry(
    entryId: string,
    adminUserId: string
  ): Promise<AdminAuditLogEntry> {
    const response = await fetch(`${this.baseUrl}/entries/${entryId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get audit entry: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      timestamp: new Date(data.timestamp)
    };
  }

  /**
   * Export audit data
   */
  async exportAuditData(options: {
    filters?: AuditFilters;
    format: 'csv' | 'json' | 'pdf';
    includeCulturalData?: boolean;
    adminUserId: string;
  }): Promise<string> {
    const response = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': options.adminUserId
      },
      body: JSON.stringify({
        filters: options.filters,
        format: options.format,
        includeCulturalData: options.includeCulturalData
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to export audit data: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    adminUserId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<AuditStats> {
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
      throw new Error(`Failed to get audit statistics: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      entriesByDay: data.entriesByDay.map((day: any) => ({
        ...day,
        date: day.date // Keep as string for chart display
      }))
    };
  }

  /**
   * Search audit entries
   */
  async searchAuditEntries(
    query: string,
    options: {
      includeCulturalData?: boolean;
      fuzzyMatch?: boolean;
      limit?: number;
      timeRange?: { start: Date; end: Date };
    },
    adminUserId: string
  ): Promise<AdminAuditLogEntry[]> {
    const params = new URLSearchParams({
      q: query,
      ...Object.fromEntries(
        Object.entries(options)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [
            key, 
            value instanceof Date ? value.toISOString() : value.toString()
          ])
      )
    });

    if (options.timeRange) {
      params.set('startDate', options.timeRange.start.toISOString());
      params.set('endDate', options.timeRange.end.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to search audit entries: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((entry: any) => ({
      ...entry,
      timestamp: new Date(entry.timestamp)
    }));
  }

  /**
   * Get cultural audit summary
   */
  async getCulturalAuditSummary(
    territory: string,
    timeRange: { start: Date; end: Date },
    adminUserId: string
  ): Promise<{
    totalCulturalActions: number;
    elderApprovals: number;
    protocolViolations: number;
    communityNotifications: number;
    dataAccessEvents: number;
    complianceStatus: 'compliant' | 'issues_detected' | 'review_required';
    recentActions: AdminAuditLogEntry[];
    careComplianceScore: number;
  }> {
    const params = new URLSearchParams({
      territory,
      startDate: timeRange.start.toISOString(),
      endDate: timeRange.end.toISOString()
    });

    const response = await fetch(`${this.baseUrl}/cultural-summary?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get cultural audit summary: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      recentActions: data.recentActions.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }))
    };
  }

  /**
   * Validate audit integrity
   */
  async validateAuditIntegrity(
    adminUserId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    valid: boolean;
    tamperedEntries: string[];
    missingEntries: string[];
    integrityScore: number;
    lastValidation: Date;
    recommendations: string[];
  }> {
    const params = new URLSearchParams();
    if (timeRange) {
      params.append('startDate', timeRange.start.toISOString());
      params.append('endDate', timeRange.end.toISOString());
    }

    const response = await fetch(`${this.baseUrl}/validate-integrity?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to validate audit integrity: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      lastValidation: new Date(data.lastValidation)
    };
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(
    framework: string,
    timeRange: { start: Date; end: Date },
    adminUserId: string
  ): Promise<{
    framework: string;
    compliance: 'compliant' | 'non_compliant' | 'partial';
    score: number;
    violations: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      entryId: string;
      timestamp: Date;
    }>;
    recommendations: string[];
    culturalConsiderations?: string[];
  }> {
    const params = new URLSearchParams({
      framework,
      startDate: timeRange.start.toISOString(),
      endDate: timeRange.end.toISOString()
    });

    const response = await fetch(`${this.baseUrl}/compliance-report?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get compliance report: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      ...data,
      violations: data.violations.map((violation: any) => ({
        ...violation,
        timestamp: new Date(violation.timestamp)
      }))
    };
  }

  /**
   * Archive old audit entries
   */
  async archiveAuditEntries(
    beforeDate: Date,
    adminUserId: string
  ): Promise<{
    archivedCount: number;
    archiveLocation: string;
    culturalEntriesRetained: number;
  }> {
    const response = await fetch(`${this.baseUrl}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-User-Id': adminUserId
      },
      body: JSON.stringify({
        beforeDate: beforeDate.toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to archive audit entries: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate session ID for audit tracking
   */
  private generateSessionId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}