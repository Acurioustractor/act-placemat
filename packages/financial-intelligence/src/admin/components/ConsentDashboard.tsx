/**
 * Consent Management Dashboard
 * 
 * Main dashboard for consent management with Australian compliance
 * and Indigenous data sovereignty support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ConsentRecord,
  ConsentDashboardStats,
  ConsentFilters,
  ConsentSortOptions,
  PaginationOptions,
  AdminUser,
  ConsentListResponse,
  AdminPermission,
  SovereigntyLevel,
  ConsentLevel
} from '../types';
import { ConsentService } from '../services/ConsentService';
import { CulturalProtocolService } from '../services/CulturalProtocolService';
import { AuditService } from '../services/AuditService';

interface ConsentDashboardProps {
  adminUser: AdminUser;
  onConsentSelect?: (consent: ConsentRecord) => void;
  onBulkAction?: (action: string, consentIds: string[]) => void;
  culturalContext?: {
    traditionalTerritory?: string;
    showCulturalWarnings?: boolean;
  };
}

/**
 * Main consent management dashboard component
 */
export const ConsentDashboard: React.FC<ConsentDashboardProps> = ({
  adminUser,
  onConsentSelect,
  onBulkAction,
  culturalContext
}) => {
  // State management
  const [stats, setStats] = useState<ConsentDashboardStats | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConsents, setSelectedConsents] = useState<Set<string>>(new Set());
  
  // Filters and sorting
  const [filters, setFilters] = useState<ConsentFilters>({});
  const [sorting, setSorting] = useState<ConsentSortOptions>({
    field: 'lastModified',
    direction: 'desc'
  });
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    pageSize: 20
  });

  // Services
  const consentService = useMemo(() => new ConsentService(), []);
  const culturalService = useMemo(() => new CulturalProtocolService(), []);
  const auditService = useMemo(() => new AuditService(), []);

  // Permission checks
  const canViewConsents = adminUser.permissions.includes(AdminPermission.VIEW_CONSENTS);
  const canModifyConsents = adminUser.permissions.includes(AdminPermission.MODIFY_CONSENTS);
  const canAccessCulturalData = adminUser.permissions.includes(AdminPermission.CULTURAL_DATA_ACCESS);
  const isElderOrCulturalKeeper = adminUser.clearanceLevel === 'elder' || 
                                 adminUser.clearanceLevel === 'cultural_keeper';

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!canViewConsents) {
      setError('Insufficient permissions to view consent data');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load statistics
      const statsResponse = await consentService.getDashboardStats(adminUser.id);
      setStats(statsResponse);

      // Load consent list
      const consentsResponse = await consentService.getConsents({
        filters,
        sorting,
        pagination,
        userId: adminUser.id,
        culturalContext: canAccessCulturalData ? culturalContext : undefined
      });

      setConsents(consentsResponse.consents);
      setPagination(prev => ({
        ...prev,
        totalCount: consentsResponse.pagination.totalCount
      }));

      // Log dashboard access
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: 'dashboard_accessed',
        resource: 'consent_dashboard',
        resourceId: 'main',
        culturalSensitive: !!culturalContext?.traditionalTerritory
      });

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filters, sorting, pagination, adminUser, canViewConsents, canAccessCulturalData, culturalContext]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Cultural protocol check
  useEffect(() => {
    if (culturalContext?.traditionalTerritory && isElderOrCulturalKeeper) {
      culturalService.checkProtocolCompliance({
        userId: adminUser.id,
        action: 'consent_dashboard_access',
        traditionalTerritory: culturalContext.traditionalTerritory
      });
    }
  }, [culturalContext, adminUser, isElderOrCulturalKeeper]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ConsentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Handle sorting changes
  const handleSortChange = useCallback((field: ConsentSortOptions['field']) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  // Handle consent selection
  const handleConsentSelection = useCallback((consentId: string, selected: boolean) => {
    setSelectedConsents(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(consentId);
      } else {
        newSet.delete(consentId);
      }
      return newSet;
    });
  }, []);

  // Handle bulk selection
  const handleBulkSelection = useCallback((selectAll: boolean) => {
    if (selectAll) {
      setSelectedConsents(new Set(consents.map(c => c.id)));
    } else {
      setSelectedConsents(new Set());
    }
  }, [consents]);

  // Handle bulk actions
  const handleBulkActionClick = useCallback(async (action: string) => {
    if (selectedConsents.size === 0) return;

    const consentIds = Array.from(selectedConsents);
    
    // Cultural clearance check for sensitive actions
    if (action === 'cultural_review' && !isElderOrCulturalKeeper) {
      setError('Cultural review actions require Elder or Cultural Keeper clearance');
      return;
    }

    try {
      await onBulkAction?.(action, consentIds);
      
      // Log bulk action
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: `bulk_${action}`,
        resource: 'consents',
        resourceId: consentIds.join(','),
        culturalSensitive: action.includes('cultural')
      });

      // Reload data
      await loadDashboardData();
      setSelectedConsents(new Set());
      
    } catch (err) {
      console.error('Bulk action failed:', err);
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  }, [selectedConsents, onBulkAction, adminUser, isElderOrCulturalKeeper, loadDashboardData]);

  // Render loading state
  if (loading) {
    return (
      <div className="consent-dashboard loading">
        <div className="loading-spinner" />
        <p>Loading consent management dashboard...</p>
        {culturalContext?.traditionalTerritory && (
          <p className="cultural-notice">
            Checking cultural protocols for {culturalContext.traditionalTerritory}
          </p>
        )}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="consent-dashboard error">
        <div className="error-message">
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={loadDashboardData} className="btn-retry">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render permission denied
  if (!canViewConsents) {
    return (
      <div className="consent-dashboard permission-denied">
        <div className="permission-message">
          <h3>Access Denied</h3>
          <p>You do not have permission to view consent management data.</p>
          <p>Required permissions: {AdminPermission.VIEW_CONSENTS}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="consent-dashboard">
      {/* Cultural Territory Acknowledgment */}
      {culturalContext?.traditionalTerritory && (
        <div className="cultural-acknowledgment">
          <h4>Traditional Territory Acknowledgment</h4>
          <p>
            This consent management system operates on the traditional lands of {culturalContext.traditionalTerritory}.
            All data handling follows CARE Principles and traditional governance protocols.
          </p>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1>Consent Management Dashboard</h1>
        <div className="admin-info">
          <span>Welcome, {adminUser.name}</span>
          <span className="clearance-level">Clearance: {adminUser.clearanceLevel}</span>
          {adminUser.culturalAuthorization && (
            <span className="cultural-auth">
              Cultural Authority: {adminUser.culturalAuthorization.traditionalTerritory.join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Consents</h3>
            <span className="stat-number">{stats.totalConsents.toLocaleString()}</span>
          </div>
          <div className="stat-card active">
            <h3>Active Consents</h3>
            <span className="stat-number">{stats.activeConsents.toLocaleString()}</span>
          </div>
          <div className="stat-card expired">
            <h3>Expired</h3>
            <span className="stat-number">{stats.expiredConsents.toLocaleString()}</span>
          </div>
          <div className="stat-card revoked">
            <h3>Revoked</h3>
            <span className="stat-number">{stats.revokedConsents.toLocaleString()}</span>
          </div>
          <div className="stat-card pending">
            <h3>Pending Renewals</h3>
            <span className="stat-number">{stats.pendingRenewals.toLocaleString()}</span>
          </div>
          {canAccessCulturalData && (
            <div className="stat-card cultural">
              <h3>Cultural Reviews</h3>
              <span className="stat-number">{stats.culturalReviews.toLocaleString()}</span>
            </div>
          )}
          <div className="stat-card alerts">
            <h3>Compliance Alerts</h3>
            <span className="stat-number">{stats.complianceAlerts.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="dashboard-controls">
        <ConsentFilters
          filters={filters}
          onChange={handleFilterChange}
          adminUser={adminUser}
          showCulturalFilters={canAccessCulturalData}
        />
        
        {selectedConsents.size > 0 && canModifyConsents && (
          <div className="bulk-actions">
            <span>{selectedConsents.size} selected</span>
            <button 
              onClick={() => handleBulkActionClick('renew')}
              className="btn-bulk btn-renew"
            >
              Renew Selected
            </button>
            <button 
              onClick={() => handleBulkActionClick('notify')}
              className="btn-bulk btn-notify"
            >
              Send Notifications
            </button>
            {isElderOrCulturalKeeper && (
              <button 
                onClick={() => handleBulkActionClick('cultural_review')}
                className="btn-bulk btn-cultural"
              >
                Cultural Review
              </button>
            )}
            <button 
              onClick={() => handleBulkActionClick('export')}
              className="btn-bulk btn-export"
            >
              Export Selected
            </button>
          </div>
        )}
      </div>

      {/* Consent List */}
      <div className="consent-list">
        <div className="list-header">
          <div className="bulk-select">
            <input
              type="checkbox"
              checked={selectedConsents.size === consents.length && consents.length > 0}
              onChange={(e) => handleBulkSelection(e.target.checked)}
            />
          </div>
          <div className="sortable-header" onClick={() => handleSortChange('name')}>
            Data Subject
            {sorting.field === 'name' && (
              <span className="sort-indicator">
                {sorting.direction === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div className="sortable-header" onClick={() => handleSortChange('consentLevel')}>
            Consent Level
            {sorting.field === 'consentLevel' && (
              <span className="sort-indicator">
                {sorting.direction === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div className="header">Sovereignty</div>
          <div className="header">Status</div>
          <div className="sortable-header" onClick={() => handleSortChange('lastModified')}>
            Last Modified
            {sorting.field === 'lastModified' && (
              <span className="sort-indicator">
                {sorting.direction === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div className="header">Actions</div>
        </div>

        {consents.map((consent) => (
          <ConsentListItem
            key={consent.id}
            consent={consent}
            selected={selectedConsents.has(consent.id)}
            onSelect={(selected) => handleConsentSelection(consent.id, selected)}
            onClick={() => onConsentSelect?.(consent)}
            adminUser={adminUser}
            showCulturalIndicators={canAccessCulturalData}
          />
        ))}

        {consents.length === 0 && (
          <div className="empty-state">
            <p>No consents found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalCount && pagination.totalCount > pagination.pageSize && (
        <Pagination
          current={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.totalCount}
          onChange={handlePageChange}
        />
      )}
    </div>
  );
};

/**
 * Consent filters component
 */
interface ConsentFiltersProps {
  filters: ConsentFilters;
  onChange: (filters: Partial<ConsentFilters>) => void;
  adminUser: AdminUser;
  showCulturalFilters: boolean;
}

const ConsentFilters: React.FC<ConsentFiltersProps> = ({
  filters,
  onChange,
  adminUser,
  showCulturalFilters
}) => {
  return (
    <div className="consent-filters">
      <div className="filter-group">
        <label>Consent Level</label>
        <select
          value={filters.consentLevels?.[0] || ''}
          onChange={(e) => onChange({
            consentLevels: e.target.value ? [e.target.value as ConsentLevel] : undefined
          })}
        >
          <option value="">All Levels</option>
          <option value={ConsentLevel.NO_CONSENT}>No Consent</option>
          <option value={ConsentLevel.MANUAL_ONLY}>Manual Only</option>
          <option value={ConsentLevel.PARTIAL_AUTOMATION}>Partial Automation</option>
          <option value={ConsentLevel.FULL_AUTOMATION}>Full Automation</option>
          <option value={ConsentLevel.EMERGENCY_OVERRIDE}>Emergency Override</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Sovereignty Level</label>
        <select
          value={filters.sovereigntyLevels?.[0] || ''}
          onChange={(e) => onChange({
            sovereigntyLevels: e.target.value ? [e.target.value as SovereigntyLevel] : undefined
          })}
        >
          <option value="">All Levels</option>
          <option value={SovereigntyLevel.INDIVIDUAL}>Individual</option>
          <option value={SovereigntyLevel.COMMUNITY}>Community</option>
          <option value={SovereigntyLevel.TRADITIONAL_OWNER}>Traditional Owner</option>
          <option value={SovereigntyLevel.ORGANISATION}>Organisation</option>
          <option value={SovereigntyLevel.GOVERNMENT}>Government</option>
          <option value={SovereigntyLevel.INTERNATIONAL}>International</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Status</label>
        <select
          value={filters.status?.[0] || ''}
          onChange={(e) => onChange({
            status: e.target.value ? [e.target.value as any] : undefined
          })}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Search</label>
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={filters.searchTerm || ''}
          onChange={(e) => onChange({ searchTerm: e.target.value || undefined })}
        />
      </div>

      {showCulturalFilters && (
        <>
          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={filters.indigenousData || false}
                onChange={(e) => onChange({ indigenousData: e.target.checked || undefined })}
              />
              Indigenous Data Only
            </label>
          </div>
          
          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={filters.culturallySensitive || false}
                onChange={(e) => onChange({ culturallySensitive: e.target.checked || undefined })}
              />
              Culturally Sensitive
            </label>
          </div>
        </>
      )}

      <div className="filter-actions">
        <button
          onClick={() => onChange({})}
          className="btn-clear-filters"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

/**
 * Individual consent list item
 */
interface ConsentListItemProps {
  consent: ConsentRecord;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  adminUser: AdminUser;
  showCulturalIndicators: boolean;
}

const ConsentListItem: React.FC<ConsentListItemProps> = ({
  consent,
  selected,
  onSelect,
  onClick,
  adminUser,
  showCulturalIndicators
}) => {
  const isExpired = consent.expiresAt && consent.expiresAt < new Date();
  const isRevoked = !!consent.revokedAt;
  const isCulturallySensitive = consent.dataSubject.indigenousStatus || 
                               consent.dataCategories.some(dc => dc.indigenousData);

  const getStatusClass = () => {
    if (isRevoked) return 'revoked';
    if (isExpired) return 'expired';
    return 'active';
  };

  const getConsentLevelDisplay = (level: ConsentLevel) => {
    switch (level) {
      case ConsentLevel.NO_CONSENT: return 'None';
      case ConsentLevel.MANUAL_ONLY: return 'Manual';
      case ConsentLevel.PARTIAL_AUTOMATION: return 'Partial';
      case ConsentLevel.FULL_AUTOMATION: return 'Full';
      case ConsentLevel.EMERGENCY_OVERRIDE: return 'Emergency';
      default: return level;
    }
  };

  const getSovereigntyDisplay = (level: SovereigntyLevel) => {
    switch (level) {
      case SovereigntyLevel.INDIVIDUAL: return 'Individual';
      case SovereigntyLevel.COMMUNITY: return 'Community';
      case SovereigntyLevel.TRADITIONAL_OWNER: return 'Traditional Owner';
      case SovereigntyLevel.ORGANISATION: return 'Organisation';
      case SovereigntyLevel.GOVERNMENT: return 'Government';
      case SovereigntyLevel.INTERNATIONAL: return 'International';
      default: return level;
    }
  };

  return (
    <div className={`consent-list-item ${getStatusClass()}`}>
      <div className="item-select">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </div>
      
      <div className="item-subject" onClick={onClick}>
        <div className="subject-name">
          {consent.dataSubject.name}
          {isCulturallySensitive && showCulturalIndicators && (
            <span className="cultural-indicator" title="Indigenous data - cultural protocols apply">
              🪃
            </span>
          )}
        </div>
        <div className="subject-email">{consent.dataSubject.email}</div>
        {consent.dataSubject.traditionalOwner && showCulturalIndicators && (
          <div className="traditional-owner">
            Traditional Owner: {consent.dataSubject.traditionalOwner}
          </div>
        )}
      </div>

      <div className="item-consent-level">
        <span className={`consent-level ${consent.consentLevel}`}>
          {getConsentLevelDisplay(consent.consentLevel)}
        </span>
      </div>

      <div className="item-sovereignty">
        <span className={`sovereignty-level ${consent.sovereigntyLevel}`}>
          {getSovereigntyDisplay(consent.sovereigntyLevel)}
        </span>
      </div>

      <div className="item-status">
        <span className={`status ${getStatusClass()}`}>
          {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
        </span>
        {consent.expiresAt && !isRevoked && (
          <div className="expiry-date">
            Expires: {consent.expiresAt.toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="item-modified">
        {consent.lastModified.toLocaleDateString()}
        <div className="modified-by">by {consent.modifiedBy}</div>
      </div>

      <div className="item-actions">
        <button 
          onClick={onClick}
          className="btn-view"
          title="View details"
        >
          View
        </button>
        {adminUser.permissions.includes(AdminPermission.MODIFY_CONSENTS) && !isRevoked && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // Handle edit action
            }}
            className="btn-edit"
            title="Edit consent"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Pagination component
 */
interface PaginationProps {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  current,
  pageSize,
  total,
  onChange
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const pages = [];

  // Generate page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= current - 2 && i <= current + 2)
    ) {
      pages.push(i);
    } else if (
      (i === current - 3 && current > 4) ||
      (i === current + 3 && current < totalPages - 3)
    ) {
      pages.push('...');
    }
  }

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {((current - 1) * pageSize) + 1} to {Math.min(current * pageSize, total)} of {total} entries
      </div>
      
      <div className="pagination-controls">
        <button
          disabled={current === 1}
          onClick={() => onChange(current - 1)}
          className="btn-page"
        >
          Previous
        </button>
        
        {pages.map((page, index) => (
          <button
            key={index}
            disabled={page === '...' || page === current}
            onClick={() => typeof page === 'number' && onChange(page)}
            className={`btn-page ${page === current ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button
          disabled={current === totalPages}
          onClick={() => onChange(current + 1)}
          className="btn-page"
        >
          Next
        </button>
      </div>
    </div>
  );
};