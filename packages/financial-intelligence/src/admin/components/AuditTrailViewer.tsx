/**
 * Audit Trail Viewer
 * 
 * Comprehensive audit trail interface for viewing and analyzing
 * admin actions with cultural sensitivity and compliance support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AdminAuditLogEntry,
  AdminUser,
  AdminPermission,
  ConsentAction,
  AttestationType
} from '../types';
import { AuditService } from '../services/AuditService';
import { CulturalProtocolService } from '../services/CulturalProtocolService';

interface AuditTrailViewerProps {
  adminUser: AdminUser;
  consentId?: string;
  userId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  culturalContext?: {
    traditionalTerritory?: string;
    showCulturalActions?: boolean;
  };
}

interface AuditFilters {
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
}

interface AuditStats {
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

/**
 * Main audit trail viewer component
 */
export const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({
  adminUser,
  consentId,
  userId,
  timeRange,
  culturalContext
}) => {
  // State management
  const [auditEntries, setAuditEntries] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({
    timeRange: timeRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    }
  });
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AdminAuditLogEntry | null>(null);
  const [showStats, setShowStats] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Services
  const auditService = useMemo(() => new AuditService(), []);
  const culturalService = useMemo(() => new CulturalProtocolService(), []);

  // Permission checks
  const canViewAudits = adminUser.permissions.includes(AdminPermission.AUDIT_LOGS);
  const canViewCulturalData = adminUser.permissions.includes(AdminPermission.CULTURAL_DATA_ACCESS);
  const isElderOrCulturalKeeper = adminUser.clearanceLevel === 'elder' || 
                                 adminUser.clearanceLevel === 'cultural_keeper';

  // Load audit entries
  const loadAuditEntries = useCallback(async () => {
    if (!canViewAudits) {
      setError('Insufficient permissions to view audit logs');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await auditService.getAuditEntries({
        consentId,
        userId,
        filters: {
          ...filters,
          showCulturalData: canViewCulturalData
        },
        pagination: {
          page: currentPage,
          pageSize
        },
        adminUserId: adminUser.id
      });

      setAuditEntries(response.entries);
      setTotalCount(response.totalCount);
      setStats(response.stats);

      // Log audit access
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: 'audit_log_accessed',
        resource: 'audit_logs',
        resourceId: consentId || userId || 'all',
        culturalSensitive: !!culturalContext?.showCulturalActions
      });

    } catch (err) {
      console.error('Failed to load audit entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit entries');
    } finally {
      setLoading(false);
    }
  }, [
    filters, currentPage, pageSize, consentId, userId, adminUser, 
    canViewAudits, canViewCulturalData, culturalContext
  ]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadAuditEntries();
  }, [loadAuditEntries]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<AuditFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page
  }, []);

  // Export audit data
  const handleExport = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const exportData = await auditService.exportAuditData({
        filters,
        format,
        includeCulturalData: canViewCulturalData,
        adminUserId: adminUser.id
      });

      // Create download link
      const blob = new Blob([exportData], { 
        type: format === 'json' ? 'application/json' : 
              format === 'csv' ? 'text/csv' : 'application/pdf' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log export action
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: 'audit_log_exported',
        resource: 'audit_logs',
        resourceId: `export_${format}`,
        culturalSensitive: canViewCulturalData && filters.culturalSensitive
      });

    } catch (err) {
      console.error('Failed to export audit data:', err);
      setError('Failed to export audit data');
    }
  }, [filters, canViewCulturalData, adminUser]);

  // Render loading state
  if (loading) {
    return (
      <div className="audit-trail-viewer loading">
        <div className="loading-spinner" />
        <p>Loading audit trail...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="audit-trail-viewer error">
        <div className="error-message">
          <h3>Error Loading Audit Trail</h3>
          <p>{error}</p>
          <button onClick={loadAuditEntries} className="btn-retry">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render permission denied
  if (!canViewAudits) {
    return (
      <div className="audit-trail-viewer permission-denied">
        <div className="permission-message">
          <h3>Access Denied</h3>
          <p>You do not have permission to view audit logs.</p>
          <p>Required permissions: {AdminPermission.AUDIT_LOGS}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-trail-viewer">
      {/* Header */}
      <div className="audit-header">
        <div className="header-title">
          <h2>Audit Trail</h2>
          {culturalContext?.traditionalTerritory && (
            <span className="territory-context">
              {culturalContext.traditionalTerritory} Territory
            </span>
          )}
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowStats(!showStats)}
            className="btn-toggle-stats"
          >
            {showStats ? 'Hide' : 'Show'} Statistics
          </button>
          <div className="export-actions">
            <button onClick={() => handleExport('csv')} className="btn-export">
              Export CSV
            </button>
            <button onClick={() => handleExport('json')} className="btn-export">
              Export JSON
            </button>
            <button onClick={() => handleExport('pdf')} className="btn-export">
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Cultural Territory Acknowledgment */}
      {culturalContext?.traditionalTerritory && canViewCulturalData && (
        <div className="cultural-acknowledgment">
          <h4>🪃 Traditional Territory Acknowledgment</h4>
          <p>
            This audit trail includes actions affecting data on the traditional lands of {culturalContext.traditionalTerritory}.
            Cultural protocols and sovereignty frameworks are applied to all data handling.
          </p>
        </div>
      )}

      {/* Statistics */}
      {showStats && stats && (
        <div className="audit-statistics">
          <h3>Audit Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Entries</h4>
              <span className="stat-number">{stats.totalEntries.toLocaleString()}</span>
            </div>
            {canViewCulturalData && (
              <div className="stat-card cultural">
                <h4>Cultural Actions</h4>
                <span className="stat-number">{stats.culturalActions.toLocaleString()}</span>
              </div>
            )}
            <div className="stat-card violations">
              <h4>Compliance Issues</h4>
              <span className="stat-number">{stats.complianceViolations.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <h4>Unique Admins</h4>
              <span className="stat-number">{stats.uniqueAdmins.toLocaleString()}</span>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="activity-chart">
            <h4>Activity Over Time</h4>
            <AuditActivityChart 
              data={stats.entriesByDay} 
              showCulturalData={canViewCulturalData}
            />
          </div>

          {/* Actions Breakdown */}
          <div className="actions-breakdown">
            <h4>Actions by Type</h4>
            <div className="actions-grid">
              {Object.entries(stats.actionsByType).map(([action, count]) => (
                <div key={action} className="action-stat">
                  <span className="action-name">{action.replace(/_/g, ' ')}</span>
                  <span className="action-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="audit-filters">
        <AuditFilters
          filters={filters}
          onChange={handleFilterChange}
          adminUser={adminUser}
          showCulturalFilters={canViewCulturalData}
        />
      </div>

      {/* Audit Entries */}
      <div className="audit-entries">
        {auditEntries.length === 0 ? (
          <div className="empty-state">
            <p>No audit entries found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="entries-header">
              <div className="entries-info">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} 
                of {totalCount.toLocaleString()} entries
              </div>
            </div>

            <div className="entries-list">
              {auditEntries.map((entry) => (
                <AuditEntryCard
                  key={entry.id}
                  entry={entry}
                  adminUser={adminUser}
                  onSelect={() => setSelectedEntry(entry)}
                  showCulturalDetails={canViewCulturalData && entry.culturalSensitive}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="audit-pagination">
              <AuditPagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <AuditEntryDetailModal
          entry={selectedEntry}
          adminUser={adminUser}
          onClose={() => setSelectedEntry(null)}
          showCulturalDetails={canViewCulturalData}
        />
      )}
    </div>
  );
};

/**
 * Audit filters component
 */
interface AuditFiltersProps {
  filters: AuditFilters;
  onChange: (filters: Partial<AuditFilters>) => void;
  adminUser: AdminUser;
  showCulturalFilters: boolean;
}

const AuditFilters: React.FC<AuditFiltersProps> = ({
  filters,
  onChange,
  adminUser,
  showCulturalFilters
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const commonActions = [
    'consent_viewed', 'consent_modified', 'consent_revoked',
    'attestation_created', 'attestation_signed',
    'dashboard_accessed', 'audit_log_accessed'
  ];

  const culturalActions = [
    'cultural_review_requested', 'elder_approval_granted',
    'traditional_owner_consent', 'community_notification'
  ];

  const availableActions = showCulturalFilters 
    ? [...commonActions, ...culturalActions]
    : commonActions;

  return (
    <div className="audit-filters">
      {/* Basic Filters */}
      <div className="filter-row">
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search actions, resources, or IDs..."
            value={filters.searchTerm || ''}
            onChange={(e) => onChange({ searchTerm: e.target.value || undefined })}
          />
        </div>

        <div className="filter-group">
          <label>Time Range</label>
          <div className="date-range">
            <input
              type="date"
              value={filters.timeRange?.start.toISOString().split('T')[0] || ''}
              onChange={(e) => onChange({
                timeRange: {
                  start: new Date(e.target.value),
                  end: filters.timeRange?.end || new Date()
                }
              })}
            />
            <span>to</span>
            <input
              type="date"
              value={filters.timeRange?.end.toISOString().split('T')[0] || ''}
              onChange={(e) => onChange({
                timeRange: {
                  start: filters.timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  end: new Date(e.target.value)
                }
              })}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Actions</label>
          <select
            value={filters.actions?.[0] || ''}
            onChange={(e) => onChange({
              actions: e.target.value ? [e.target.value] : undefined
            })}
          >
            <option value="">All Actions</option>
            {availableActions.map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn-toggle-advanced"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="advanced-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Resources</label>
              <select
                value={filters.resources?.[0] || ''}
                onChange={(e) => onChange({
                  resources: e.target.value ? [e.target.value] : undefined
                })}
              >
                <option value="">All Resources</option>
                <option value="consent">Consents</option>
                <option value="attestation">Attestations</option>
                <option value="dashboard">Dashboard</option>
                <option value="audit_logs">Audit Logs</option>
                {showCulturalFilters && (
                  <option value="cultural_data">Cultural Data</option>
                )}
              </select>
            </div>

            <div className="filter-group">
              <label>Compliance Frameworks</label>
              <select
                value={filters.complianceFrameworks?.[0] || ''}
                onChange={(e) => onChange({
                  complianceFrameworks: e.target.value ? [e.target.value] : undefined
                })}
              >
                <option value="">All Frameworks</option>
                <option value="privacy_act_1988">Privacy Act 1988</option>
                <option value="austrac">AUSTRAC</option>
                <option value="acnc_compliance">ACNC Compliance</option>
                {showCulturalFilters && (
                  <>
                    <option value="care_principles">CARE Principles</option>
                    <option value="indigenous_sovereignty">Indigenous Sovereignty</option>
                  </>
                )}
              </select>
            </div>

            {showCulturalFilters && (
              <div className="filter-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.culturalSensitive || false}
                    onChange={(e) => onChange({ 
                      culturalSensitive: e.target.checked || undefined 
                    })}
                  />
                  Cultural Actions Only
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      <div className="filter-actions">
        <button
          onClick={() => onChange({})}
          className="btn-clear-filters"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
};

/**
 * Individual audit entry card
 */
interface AuditEntryCardProps {
  entry: AdminAuditLogEntry;
  adminUser: AdminUser;
  onSelect: () => void;
  showCulturalDetails: boolean;
}

const AuditEntryCard: React.FC<AuditEntryCardProps> = ({
  entry,
  adminUser,
  onSelect,
  showCulturalDetails
}) => {
  const getActionIcon = (action: string): string => {
    if (action.includes('consent')) return '📋';
    if (action.includes('attestation')) return '🔐';
    if (action.includes('cultural') || action.includes('elder') || action.includes('traditional')) return '🪃';
    if (action.includes('dashboard') || action.includes('viewed')) return '👁️';
    if (action.includes('audit')) return '📊';
    if (action.includes('export')) return '📤';
    return '📝';
  };

  const getResultClass = (result: string): string => {
    switch (result) {
      case 'success': return 'success';
      case 'failure': return 'failure';
      case 'partial': return 'partial';
      default: return 'unknown';
    }
  };

  const formatDuration = (retentionPeriod: number): string => {
    const years = Math.floor(retentionPeriod / (365 * 24 * 60 * 60 * 1000));
    if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
    
    const days = Math.floor(retentionPeriod / (24 * 60 * 60 * 1000));
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <div 
      className={`audit-entry-card ${getResultClass(entry.result)} ${entry.culturalSensitive ? 'cultural' : ''}`}
      onClick={onSelect}
    >
      <div className="entry-header">
        <div className="action-info">
          <span className="action-icon">{getActionIcon(entry.action)}</span>
          <div className="action-details">
            <span className="action-name">{entry.action.replace(/_/g, ' ')}</span>
            <span className="resource-info">
              {entry.resource}: {entry.resourceId}
            </span>
          </div>
        </div>
        <div className="entry-meta">
          <span className="timestamp">{entry.timestamp.toLocaleString()}</span>
          <span className={`result ${getResultClass(entry.result)}`}>
            {entry.result}
          </span>
        </div>
      </div>

      <div className="entry-content">
        <div className="admin-info">
          <label>Admin:</label>
          <span>{entry.adminUserId}</span>
        </div>

        {entry.culturalSensitive && showCulturalDetails && (
          <div className="cultural-indicator">
            <span className="cultural-icon">🪃</span>
            <span>Cultural Data Involved</span>
          </div>
        )}

        {entry.complianceFrameworks.length > 0 && (
          <div className="compliance-frameworks">
            <label>Compliance:</label>
            <div className="frameworks-list">
              {entry.complianceFrameworks.map((framework, index) => (
                <span key={index} className="framework-tag">
                  {framework.replace(/_/g, ' ').toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="technical-info">
          <span className="ip-address">IP: {entry.ipAddress}</span>
          <span className="session-id">Session: {entry.sessionId.slice(-8)}</span>
          <span className="retention">
            Retention: {formatDuration(entry.retentionPeriod)}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Activity chart component
 */
interface AuditActivityChartProps {
  data: Array<{
    date: string;
    count: number;
    culturalActions: number;
  }>;
  showCulturalData: boolean;
}

const AuditActivityChart: React.FC<AuditActivityChartProps> = ({
  data,
  showCulturalData
}) => {
  if (data.length === 0) {
    return <div className="no-chart-data">No activity data available</div>;
  }

  const maxCount = Math.max(...data.map(d => d.count));
  const maxCultural = Math.max(...data.map(d => d.culturalActions));

  return (
    <div className="activity-chart">
      <div className="chart-container">
        {data.map((day, index) => (
          <div key={day.date} className="chart-bar">
            <div 
              className="bar total"
              style={{ height: `${(day.count / maxCount) * 100}%` }}
              title={`${day.date}: ${day.count} total actions`}
            />
            {showCulturalData && day.culturalActions > 0 && (
              <div 
                className="bar cultural"
                style={{ height: `${(day.culturalActions / maxCultural) * 100}%` }}
                title={`${day.date}: ${day.culturalActions} cultural actions`}
              />
            )}
            <div className="bar-label">
              {new Date(day.date).toLocaleDateString('en-AU', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color total"></span>
          <span>Total Actions</span>
        </div>
        {showCulturalData && (
          <div className="legend-item">
            <span className="legend-color cultural"></span>
            <span>Cultural Actions</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Pagination component
 */
interface AuditPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

const AuditPagination: React.FC<AuditPaginationProps> = ({
  currentPage,
  pageSize,
  totalCount,
  onPageChange
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const showEllipsis = totalPages > 7;
    
    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="audit-pagination">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="btn-page"
      >
        Previous
      </button>
      
      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          disabled={page === '...' || page === currentPage}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          className={`btn-page ${page === currentPage ? 'active' : ''}`}
        >
          {page}
        </button>
      ))}
      
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="btn-page"
      >
        Next
      </button>
    </div>
  );
};

/**
 * Audit entry detail modal
 */
interface AuditEntryDetailModalProps {
  entry: AdminAuditLogEntry;
  adminUser: AdminUser;
  onClose: () => void;
  showCulturalDetails: boolean;
}

const AuditEntryDetailModal: React.FC<AuditEntryDetailModalProps> = ({
  entry,
  adminUser,
  onClose,
  showCulturalDetails
}) => {
  return (
    <div className="audit-entry-detail-modal overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Audit Entry Details</h3>
          <button onClick={onClose} className="btn-close">×</button>
        </div>
        
        <div className="modal-content">
          {/* Basic Information */}
          <section className="detail-section">
            <h4>Basic Information</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>ID:</label>
                <span>{entry.id}</span>
              </div>
              <div className="info-item">
                <label>Timestamp:</label>
                <span>{entry.timestamp.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <label>Action:</label>
                <span>{entry.action.replace(/_/g, ' ')}</span>
              </div>
              <div className="info-item">
                <label>Resource:</label>
                <span>{entry.resource}</span>
              </div>
              <div className="info-item">
                <label>Resource ID:</label>
                <span>{entry.resourceId}</span>
              </div>
              <div className="info-item">
                <label>Result:</label>
                <span className={`result ${entry.result}`}>{entry.result}</span>
              </div>
            </div>
          </section>

          {/* Admin Information */}
          <section className="detail-section">
            <h4>Admin Information</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>Admin User ID:</label>
                <span>{entry.adminUserId}</span>
              </div>
              <div className="info-item">
                <label>IP Address:</label>
                <span>{entry.ipAddress}</span>
              </div>
              <div className="info-item">
                <label>User Agent:</label>
                <span className="user-agent">{entry.userAgent}</span>
              </div>
              <div className="info-item">
                <label>Session ID:</label>
                <span>{entry.sessionId}</span>
              </div>
            </div>
          </section>

          {/* State Changes */}
          {(entry.previousState || entry.newState) && (
            <section className="detail-section">
              <h4>State Changes</h4>
              <div className="state-changes">
                {entry.previousState && (
                  <div className="state-item">
                    <label>Previous State:</label>
                    <pre className="state-data">
                      {JSON.stringify(entry.previousState, null, 2)}
                    </pre>
                  </div>
                )}
                {entry.newState && (
                  <div className="state-item">
                    <label>New State:</label>
                    <pre className="state-data">
                      {JSON.stringify(entry.newState, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Cultural Information */}
          {entry.culturalSensitive && showCulturalDetails && (
            <section className="detail-section cultural">
              <h4>🪃 Cultural Information</h4>
              <div className="cultural-info">
                <p>This action involved Indigenous cultural data or protocols.</p>
                <p>Special retention and handling requirements apply.</p>
              </div>
            </section>
          )}

          {/* Compliance Information */}
          <section className="detail-section">
            <h4>Compliance Information</h4>
            <div className="compliance-info">
              <div className="info-item">
                <label>Frameworks:</label>
                <div className="frameworks-list">
                  {entry.complianceFrameworks.map((framework, index) => (
                    <span key={index} className="framework-tag">
                      {framework.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
              <div className="info-item">
                <label>Retention Period:</label>
                <span>
                  {Math.floor(entry.retentionPeriod / (365 * 24 * 60 * 60 * 1000))} years
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};