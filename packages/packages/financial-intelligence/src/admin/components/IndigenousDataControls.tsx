/**
 * Indigenous Data Sovereignty Controls
 * 
 * Specialized interface for managing Indigenous data with cultural protocols,
 * CARE Principles compliance, and Traditional Owner consent workflows
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ConsentRecord,
  AdminUser,
  CulturalAuthorization,
  AttestationRecord,
  AdminPermission,
  SovereigntyLevel,
  ConsentLevel,
  ConsentAction,
  AttestationType
} from '../types';
import { ConsentService } from '../services/ConsentService';
import { CulturalProtocolService } from '../services/CulturalProtocolService';
import { AttestationService } from '../services/AttestationService';
import { AuditService } from '../services/AuditService';

interface IndigenousDataControlsProps {
  adminUser: AdminUser;
  traditionalTerritory?: string;
  onProtocolViolation?: (violation: ProtocolViolation) => void;
}

interface ProtocolViolation {
  id: string;
  type: 'unauthorized_access' | 'consent_violation' | 'cultural_protocol_breach' | 'sovereignty_override';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  involvedData: string[];
  recommendedAction: string;
  requiresElderReview: boolean;
  timestamp: Date;
}

interface CulturalProtocol {
  id: string;
  name: string;
  territory: string;
  description: string;
  requirements: string[];
  seasonalRestrictions: string[];
  approvalRequired: boolean;
  contactPerson: string;
  emergencyContact: string;
}

interface TraditionalOwnerConsent {
  id: string;
  ownerGroup: string;
  territory: string;
  consentLevel: ConsentLevel;
  dataCategories: string[];
  restrictions: string[];
  grantedBy: string;
  grantedAt: Date;
  validUntil?: Date;
  conditions: string[];
  ceremonies: string[];
  witnessedBy: string[];
}

interface CommunityNotification {
  id: string;
  type: 'data_access' | 'consent_change' | 'cultural_review' | 'protocol_update';
  territory: string;
  community: string;
  message: string;
  sentAt: Date;
  method: 'email' | 'postal' | 'community_meeting' | 'elder_council';
  acknowledgmentRequired: boolean;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Main Indigenous data sovereignty controls component
 */
export const IndigenousDataControls: React.FC<IndigenousDataControlsProps> = ({
  adminUser,
  traditionalTerritory,
  onProtocolViolation
}) => {
  // State management
  const [indigenousConsents, setIndigenousConsents] = useState<ConsentRecord[]>([]);
  const [protocols, setProtocols] = useState<CulturalProtocol[]>([]);
  const [violations, setViolations] = useState<ProtocolViolation[]>([]);
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'consents' | 'protocols' | 'violations' | 'notifications'>('consents');

  // Modal states
  const [showProtocolForm, setShowProtocolForm] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);

  // Services
  const consentService = useMemo(() => new ConsentService(), []);
  const culturalService = useMemo(() => new CulturalProtocolService(), []);
  const attestationService = useMemo(() => new AttestationService(), []);
  const auditService = useMemo(() => new AuditService(), []);

  // Permission checks
  const canAccessCulturalData = adminUser.permissions.includes(AdminPermission.CULTURAL_DATA_ACCESS);
  const canElderOverride = adminUser.permissions.includes(AdminPermission.ELDER_OVERRIDE);
  const isElderOrCulturalKeeper = adminUser.clearanceLevel === 'elder' || 
                                 adminUser.clearanceLevel === 'cultural_keeper';
  const hasCulturalAuthorization = !!adminUser.culturalAuthorization;

  // Check if user has authority for specific territory
  const hasAuthorityForTerritory = useCallback((territory: string): boolean => {
    if (!adminUser.culturalAuthorization) return false;
    return adminUser.culturalAuthorization.traditionalTerritory.includes(territory);
  }, [adminUser.culturalAuthorization]);

  // Load Indigenous data
  const loadIndigenousData = useCallback(async () => {
    if (!canAccessCulturalData) {
      setError('Insufficient permissions to access Indigenous data controls');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load Indigenous consents
      const consentsResponse = await consentService.getConsents({
        filters: {
          indigenousData: true,
          sovereigntyLevels: [SovereigntyLevel.TRADITIONAL_OWNER, SovereigntyLevel.COMMUNITY]
        },
        userId: adminUser.id,
        culturalContext: { traditionalTerritory }
      });
      setIndigenousConsents(consentsResponse.consents);

      // Load cultural protocols
      const protocolsResponse = await culturalService.getProtocols({
        territory: traditionalTerritory,
        adminUserId: adminUser.id
      });
      setProtocols(protocolsResponse);

      // Load protocol violations
      const violationsResponse = await culturalService.getViolations({
        territory: traditionalTerritory,
        adminUserId: adminUser.id,
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      });
      setViolations(violationsResponse);

      // Load community notifications
      const notificationsResponse = await culturalService.getNotifications({
        territory: traditionalTerritory,
        adminUserId: adminUser.id
      });
      setNotifications(notificationsResponse);

      // Log access
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: 'indigenous_data_controls_accessed',
        resource: 'indigenous_data',
        resourceId: traditionalTerritory || 'all',
        culturalSensitive: true
      });

    } catch (err) {
      console.error('Failed to load Indigenous data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Indigenous data');
    } finally {
      setLoading(false);
    }
  }, [traditionalTerritory, adminUser, canAccessCulturalData]);

  // Load data on mount
  useEffect(() => {
    loadIndigenousData();
  }, [loadIndigenousData]);

  // Handle protocol violation
  const handleProtocolViolation = useCallback(async (violation: ProtocolViolation) => {
    onProtocolViolation?.(violation);
    
    // Log violation
    await auditService.logAdminAction({
      adminUserId: adminUser.id,
      action: 'cultural_protocol_violation',
      resource: 'cultural_protocol',
      resourceId: violation.id,
      culturalSensitive: true
    });
  }, [onProtocolViolation, adminUser]);

  // Create Traditional Owner attestation
  const handleCreateTraditionalOwnerAttestation = useCallback(async (
    consentId: string,
    attestationData: {
      purposes: string[];
      culturalConsiderations: string[];
      restrictions: string[];
    }
  ) => {
    try {
      const attestation = await attestationService.createAttestation({
        type: AttestationType.TRADITIONAL_OWNER_CONSENT,
        subjectId: consentId,
        subjectType: 'user',
        attestedBy: adminUser.id,
        attestationData: {
          consentId,
          purposes: attestationData.purposes,
          dataCategories: [],
          conditions: attestationData.culturalConsiderations,
          restrictions: attestationData.restrictions,
          culturalConsiderations: attestationData.culturalConsiderations
        },
        complianceFrameworks: ['care_principles', 'indigenous_sovereignty'],
        culturalProtocols: protocols.map(p => p.name)
      });

      await loadIndigenousData();
      return attestation;

    } catch (err) {
      console.error('Failed to create Traditional Owner attestation:', err);
      throw err;
    }
  }, [adminUser, protocols, loadIndigenousData]);

  // Render loading state
  if (loading) {
    return (
      <div className="indigenous-data-controls loading">
        <div className="loading-spinner" />
        <p>Loading Indigenous data sovereignty controls...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="indigenous-data-controls error">
        <div className="error-message">
          <h3>Error Loading Indigenous Data Controls</h3>
          <p>{error}</p>
          <button onClick={loadIndigenousData} className="btn-retry">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render permission denied
  if (!canAccessCulturalData) {
    return (
      <div className="indigenous-data-controls permission-denied">
        <div className="permission-message">
          <h3>Access Denied</h3>
          <p>You do not have permission to access Indigenous data sovereignty controls.</p>
          <p>Required permissions: {AdminPermission.CULTURAL_DATA_ACCESS}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="indigenous-data-controls">
      {/* Cultural Authority Header */}
      <div className="cultural-header">
        <div className="acknowledgment">
          <h2>🪃 Indigenous Data Sovereignty Controls</h2>
          {traditionalTerritory && (
            <p className="territory-acknowledgment">
              We acknowledge that this system operates on the traditional lands of {traditionalTerritory}.
              All data governance follows CARE Principles and traditional protocols.
            </p>
          )}
        </div>
        
        <div className="admin-authority">
          <div className="authority-info">
            <h4>Cultural Authorization</h4>
            {hasCulturalAuthorization ? (
              <div className="authorized">
                <p>✓ Culturally Authorized</p>
                <p>Clearance: {adminUser.clearanceLevel}</p>
                <p>Territory: {adminUser.culturalAuthorization!.traditionalTerritory.join(', ')}</p>
                {adminUser.culturalAuthorization!.eldershipRecognition && (
                  <p>🌟 Elder Recognition</p>
                )}
                {adminUser.culturalAuthorization!.ceremonialAuthority && (
                  <p>🔥 Ceremonial Authority</p>
                )}
              </div>
            ) : (
              <div className="not-authorized">
                <p>⚠️ Limited Cultural Access</p>
                <p>Some features may be restricted</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="controls-navigation">
        <button
          className={`nav-tab ${activeTab === 'consents' ? 'active' : ''}`}
          onClick={() => setActiveTab('consents')}
        >
          Indigenous Consents ({indigenousConsents.length})
        </button>
        <button
          className={`nav-tab ${activeTab === 'protocols' ? 'active' : ''}`}
          onClick={() => setActiveTab('protocols')}
        >
          Cultural Protocols ({protocols.length})
        </button>
        <button
          className={`nav-tab ${activeTab === 'violations' ? 'active' : ''}`}
          onClick={() => setActiveTab('violations')}
        >
          Protocol Violations ({violations.length})
        </button>
        <button
          className={`nav-tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Community Notifications ({notifications.filter(n => !n.acknowledged).length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'consents' && (
          <IndigenousConsentsTab
            consents={indigenousConsents}
            adminUser={adminUser}
            onConsentSelect={setSelectedConsent}
            onCreateAttestation={handleCreateTraditionalOwnerAttestation}
          />
        )}

        {activeTab === 'protocols' && (
          <CulturalProtocolsTab
            protocols={protocols}
            adminUser={adminUser}
            onCreateProtocol={() => setShowProtocolForm(true)}
            canModify={isElderOrCulturalKeeper}
          />
        )}

        {activeTab === 'violations' && (
          <ProtocolViolationsTab
            violations={violations}
            adminUser={adminUser}
            onViolationAction={handleProtocolViolation}
            canResolve={isElderOrCulturalKeeper}
          />
        )}

        {activeTab === 'notifications' && (
          <CommunityNotificationsTab
            notifications={notifications}
            adminUser={adminUser}
            onCreateNotification={() => setShowNotificationForm(true)}
            canManage={isElderOrCulturalKeeper}
          />
        )}
      </div>

      {/* Modals */}
      {showProtocolForm && (
        <CulturalProtocolForm
          adminUser={adminUser}
          territoryContext={traditionalTerritory}
          onCancel={() => setShowProtocolForm(false)}
          onCreated={async () => {
            setShowProtocolForm(false);
            await loadIndigenousData();
          }}
        />
      )}

      {showNotificationForm && (
        <CommunityNotificationForm
          adminUser={adminUser}
          territoryContext={traditionalTerritory}
          onCancel={() => setShowNotificationForm(false)}
          onSent={async () => {
            setShowNotificationForm(false);
            await loadIndigenousData();
          }}
        />
      )}

      {selectedConsent && (
        <IndigenousConsentDetailModal
          consent={selectedConsent}
          adminUser={adminUser}
          onClose={() => setSelectedConsent(null)}
          onCreateAttestation={handleCreateTraditionalOwnerAttestation}
        />
      )}
    </div>
  );
};

/**
 * Indigenous consents tab component
 */
interface IndigenousConsentsTabProps {
  consents: ConsentRecord[];
  adminUser: AdminUser;
  onConsentSelect: (consent: ConsentRecord) => void;
  onCreateAttestation: (consentId: string, data: any) => Promise<AttestationRecord>;
}

const IndigenousConsentsTab: React.FC<IndigenousConsentsTabProps> = ({
  consents,
  adminUser,
  onConsentSelect,
  onCreateAttestation
}) => {
  const getConsentRiskLevel = (consent: ConsentRecord): 'low' | 'medium' | 'high' => {
    if (consent.sovereigntyLevel === SovereigntyLevel.TRADITIONAL_OWNER) return 'high';
    if (consent.dataSubject.indigenousStatus) return 'medium';
    return 'low';
  };

  const getCulturalIndicators = (consent: ConsentRecord): string[] => {
    const indicators = [];
    
    if (consent.dataSubject.traditionalOwner) {
      indicators.push(`Traditional Owner: ${consent.dataSubject.traditionalOwner}`);
    }
    
    if (consent.dataSubject.communityAffiliation) {
      indicators.push(`Community: ${consent.dataSubject.communityAffiliation}`);
    }
    
    if (consent.dataCategories.some(dc => dc.indigenousData)) {
      indicators.push('Contains Indigenous cultural data');
    }
    
    if (consent.metadata.ceremonialContext) {
      indicators.push(`Ceremonial context: ${consent.metadata.ceremonialContext}`);
    }
    
    return indicators;
  };

  return (
    <div className="indigenous-consents-tab">
      <div className="tab-header">
        <h3>Indigenous Data Consents</h3>
        <p>
          Managing consent for Indigenous cultural data requires adherence to CARE Principles
          and traditional governance protocols.
        </p>
      </div>

      {consents.length === 0 ? (
        <div className="empty-state">
          <p>No Indigenous data consents found.</p>
        </div>
      ) : (
        <div className="consents-grid">
          {consents.map((consent) => (
            <div
              key={consent.id}
              className={`consent-card indigenous ${getConsentRiskLevel(consent)}-risk`}
              onClick={() => onConsentSelect(consent)}
            >
              <div className="card-header">
                <div className="consent-subject">
                  <h4>{consent.dataSubject.name}</h4>
                  <span className="sovereignty-level">
                    {consent.sovereigntyLevel.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="risk-indicator">
                  <span className={`risk-badge ${getConsentRiskLevel(consent)}`}>
                    {getConsentRiskLevel(consent).toUpperCase()} RISK
                  </span>
                </div>
              </div>

              <div className="card-content">
                <div className="cultural-indicators">
                  {getCulturalIndicators(consent).map((indicator, index) => (
                    <div key={index} className="cultural-indicator">
                      🪃 {indicator}
                    </div>
                  ))}
                </div>

                <div className="consent-details">
                  <div className="detail-item">
                    <label>Consent Level:</label>
                    <span className={`consent-level ${consent.consentLevel}`}>
                      {consent.consentLevel.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="detail-item">
                    <label>Last Modified:</label>
                    <span>{consent.lastModified.toLocaleDateString()}</span>
                  </div>

                  {consent.expiresAt && (
                    <div className="detail-item">
                      <label>Expires:</label>
                      <span className={consent.expiresAt < new Date() ? 'expired' : ''}>
                        {consent.expiresAt.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="attestations-summary">
                  <label>Attestations:</label>
                  <span>
                    {consent.attestations.filter(a => 
                      [AttestationType.TRADITIONAL_OWNER_CONSENT, AttestationType.ELDER_APPROVAL, AttestationType.COMMUNITY_CONSENT]
                      .includes(a.type as AttestationType)
                    ).length} cultural attestations
                  </span>
                </div>
              </div>

              <div className="card-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Quick attestation action
                  }}
                  className="btn-attest"
                  disabled={!adminUser.permissions.includes(AdminPermission.CREATE_ATTESTATIONS)}
                >
                  Create Attestation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Cultural protocols tab component
 */
interface CulturalProtocolsTabProps {
  protocols: CulturalProtocol[];
  adminUser: AdminUser;
  onCreateProtocol: () => void;
  canModify: boolean;
}

const CulturalProtocolsTab: React.FC<CulturalProtocolsTabProps> = ({
  protocols,
  adminUser,
  onCreateProtocol,
  canModify
}) => {
  return (
    <div className="cultural-protocols-tab">
      <div className="tab-header">
        <h3>Cultural Protocols</h3>
        <div className="header-actions">
          {canModify && (
            <button onClick={onCreateProtocol} className="btn-create-protocol">
              Create Protocol
            </button>
          )}
        </div>
      </div>

      {protocols.length === 0 ? (
        <div className="empty-state">
          <p>No cultural protocols defined.</p>
          {canModify && (
            <button onClick={onCreateProtocol} className="btn-create-first">
              Create First Protocol
            </button>
          )}
        </div>
      ) : (
        <div className="protocols-list">
          {protocols.map((protocol) => (
            <div key={protocol.id} className="protocol-card">
              <div className="protocol-header">
                <h4>{protocol.name}</h4>
                <span className="territory">{protocol.territory}</span>
              </div>
              
              <div className="protocol-content">
                <p>{protocol.description}</p>
                
                <div className="protocol-details">
                  <div className="detail-section">
                    <label>Requirements:</label>
                    <ul>
                      {protocol.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>

                  {protocol.seasonalRestrictions.length > 0 && (
                    <div className="detail-section">
                      <label>Seasonal Restrictions:</label>
                      <ul>
                        {protocol.seasonalRestrictions.map((restriction, index) => (
                          <li key={index}>{restriction}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="protocol-contacts">
                    <div className="contact-item">
                      <label>Contact:</label>
                      <span>{protocol.contactPerson}</span>
                    </div>
                    <div className="contact-item">
                      <label>Emergency:</label>
                      <span>{protocol.emergencyContact}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Protocol violations tab component
 */
interface ProtocolViolationsTabProps {
  violations: ProtocolViolation[];
  adminUser: AdminUser;
  onViolationAction: (violation: ProtocolViolation) => void;
  canResolve: boolean;
}

const ProtocolViolationsTab: React.FC<ProtocolViolationsTabProps> = ({
  violations,
  adminUser,
  onViolationAction,
  canResolve
}) => {
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className="protocol-violations-tab">
      <div className="tab-header">
        <h3>Protocol Violations</h3>
        <p>Cultural protocol violations require immediate attention and Elder review.</p>
      </div>

      {violations.length === 0 ? (
        <div className="empty-state good">
          <p>✅ No protocol violations detected.</p>
          <p>All Indigenous data interactions are following cultural protocols.</p>
        </div>
      ) : (
        <div className="violations-list">
          {violations.map((violation) => (
            <div
              key={violation.id}
              className={`violation-card ${violation.severity}`}
            >
              <div className="violation-header">
                <div className="violation-info">
                  <h4>{violation.type.replace(/_/g, ' ')}</h4>
                  <span 
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(violation.severity) }}
                  >
                    {violation.severity.toUpperCase()}
                  </span>
                </div>
                <div className="violation-time">
                  {violation.timestamp.toLocaleString()}
                </div>
              </div>

              <div className="violation-content">
                <p className="violation-description">{violation.description}</p>

                <div className="involved-data">
                  <label>Involved Data:</label>
                  <ul>
                    {violation.involvedData.map((data, index) => (
                      <li key={index}>{data}</li>
                    ))}
                  </ul>
                </div>

                <div className="recommended-action">
                  <label>Recommended Action:</label>
                  <p>{violation.recommendedAction}</p>
                </div>

                {violation.requiresElderReview && (
                  <div className="elder-review-required">
                    🌟 Requires Elder Review
                  </div>
                )}
              </div>

              <div className="violation-actions">
                {canResolve && (
                  <button
                    onClick={() => onViolationAction(violation)}
                    className="btn-resolve"
                  >
                    Take Action
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Community notifications tab component
 */
interface CommunityNotificationsTabProps {
  notifications: CommunityNotification[];
  adminUser: AdminUser;
  onCreateNotification: () => void;
  canManage: boolean;
}

const CommunityNotificationsTab: React.FC<CommunityNotificationsTabProps> = ({
  notifications,
  adminUser,
  onCreateNotification,
  canManage
}) => {
  const pendingNotifications = notifications.filter(n => !n.acknowledged);
  const acknowledgedNotifications = notifications.filter(n => n.acknowledged);

  return (
    <div className="community-notifications-tab">
      <div className="tab-header">
        <h3>Community Notifications</h3>
        <div className="header-actions">
          {canManage && (
            <button onClick={onCreateNotification} className="btn-create-notification">
              Send Notification
            </button>
          )}
        </div>
      </div>

      <div className="notifications-sections">
        {/* Pending Notifications */}
        <section className="notification-section">
          <h4>Pending Acknowledgment ({pendingNotifications.length})</h4>
          {pendingNotifications.length === 0 ? (
            <p>No pending notifications.</p>
          ) : (
            <div className="notifications-list">
              {pendingNotifications.map((notification) => (
                <div key={notification.id} className="notification-card pending">
                  <div className="notification-header">
                    <span className="notification-type">
                      {notification.type.replace(/_/g, ' ')}
                    </span>
                    <span className="notification-method">
                      via {notification.method.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-meta">
                      <span className="territory">{notification.territory}</span>
                      <span className="community">{notification.community}</span>
                      <span className="sent-date">{notification.sentAt.toLocaleDateString()}</span>
                    </div>
                    <p className="notification-message">{notification.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Acknowledged Notifications */}
        <section className="notification-section">
          <h4>Acknowledged ({acknowledgedNotifications.length})</h4>
          {acknowledgedNotifications.length === 0 ? (
            <p>No acknowledged notifications.</p>
          ) : (
            <div className="notifications-list">
              {acknowledgedNotifications.map((notification) => (
                <div key={notification.id} className="notification-card acknowledged">
                  <div className="notification-header">
                    <span className="notification-type">
                      {notification.type.replace(/_/g, ' ')}
                    </span>
                    <span className="acknowledgment">
                      ✓ by {notification.acknowledgedBy} on {notification.acknowledgedAt?.toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-meta">
                      <span className="territory">{notification.territory}</span>
                      <span className="community">{notification.community}</span>
                    </div>
                    <p className="notification-message">{notification.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// Additional modal components would be implemented here
// (CulturalProtocolForm, CommunityNotificationForm, IndigenousConsentDetailModal)
// These are simplified for brevity but would include full form implementations

const CulturalProtocolForm: React.FC<any> = ({ onCancel, onCreated }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Create Cultural Protocol</h3>
      {/* Form implementation would go here */}
      <div className="modal-actions">
        <button onClick={onCreated}>Create</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
);

const CommunityNotificationForm: React.FC<any> = ({ onCancel, onSent }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Send Community Notification</h3>
      {/* Form implementation would go here */}
      <div className="modal-actions">
        <button onClick={onSent}>Send</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
);

const IndigenousConsentDetailModal: React.FC<any> = ({ consent, onClose, onCreateAttestation }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Indigenous Consent Details</h3>
      {/* Detail view implementation would go here */}
      <div className="modal-actions">
        <button onClick={() => onCreateAttestation(consent.id, {})}>Create Attestation</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  </div>
);