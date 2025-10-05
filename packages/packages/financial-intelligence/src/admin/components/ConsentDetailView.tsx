/**
 * Consent Detail View
 * 
 * Detailed view and editing interface for individual consent records
 * with Australian compliance and Indigenous data sovereignty support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ConsentRecord,
  ConsentDetailResponse,
  AdminUser,
  ConsentAction,
  AdminPermission,
  AttestationRecord,
  ConsentHistoryEntry,
  CulturalContext,
  ComplianceStatus,
  ConsentLevel,
  SovereigntyLevel,
  FormValidationError
} from '../types';
import { ConsentService } from '../services/ConsentService';
import { AttestationService } from '../services/AttestationService';
import { CulturalProtocolService } from '../services/CulturalProtocolService';
import { AuditService } from '../services/AuditService';

interface ConsentDetailViewProps {
  consentId: string;
  adminUser: AdminUser;
  onClose: () => void;
  onUpdated: (consent: ConsentRecord) => void;
  readOnly?: boolean;
}

/**
 * Detailed consent view and editing component
 */
export const ConsentDetailView: React.FC<ConsentDetailViewProps> = ({
  consentId,
  adminUser,
  onClose,
  onUpdated,
  readOnly = false
}) => {
  // State management
  const [data, setData] = useState<ConsentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<FormValidationError[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<Partial<ConsentRecord>>({});
  const [culturalReviewRequired, setCulturalReviewRequired] = useState(false);
  const [showCulturalWarning, setShowCulturalWarning] = useState(false);

  // Services
  const consentService = useMemo(() => new ConsentService(), []);
  const attestationService = useMemo(() => new AttestationService(), []);
  const culturalService = useMemo(() => new CulturalProtocolService(), []);
  const auditService = useMemo(() => new AuditService(), []);

  // Permission checks
  const canModifyConsents = adminUser.permissions.includes(AdminPermission.MODIFY_CONSENTS);
  const canRevokeConsents = adminUser.permissions.includes(AdminPermission.REVOKE_CONSENTS);
  const canAccessCulturalData = adminUser.permissions.includes(AdminPermission.CULTURAL_DATA_ACCESS);
  const canCreateAttestations = adminUser.permissions.includes(AdminPermission.CREATE_ATTESTATIONS);
  const isElderOrCulturalKeeper = adminUser.clearanceLevel === 'elder' || 
                                 adminUser.clearanceLevel === 'cultural_keeper';

  // Load consent details
  const loadConsentDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await consentService.getConsentDetails(consentId, adminUser.id);
      setData(response);
      setFormData(response.consent);

      // Check if cultural review is required
      if (response.culturalContext.sacredDataInvolved || 
          response.culturalContext.elderApprovalRequired) {
        setCulturalReviewRequired(true);
        if (!isElderOrCulturalKeeper) {
          setShowCulturalWarning(true);
        }
      }

      // Log access
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: 'consent_viewed',
        resource: 'consent',
        resourceId: consentId,
        culturalSensitive: response.culturalContext.sacredDataInvolved
      });

    } catch (err) {
      console.error('Failed to load consent details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load consent details');
    } finally {
      setLoading(false);
    }
  }, [consentId, adminUser, isElderOrCulturalKeeper]);

  // Load data on mount
  useEffect(() => {
    loadConsentDetails();
  }, [loadConsentDetails]);

  // Validate form data
  const validateForm = useCallback((data: Partial<ConsentRecord>): FormValidationError[] => {
    const errors: FormValidationError[] = [];

    // Check consent level escalation
    if (data.consentLevel && data.consentLevel > (formData.consentLevel || ConsentLevel.NO_CONSENT)) {
      if (data.consentLevel === ConsentLevel.FULL_AUTOMATION && !canAccessCulturalData) {
        errors.push({
          field: 'consentLevel',
          message: 'Full automation consent requires cultural data access clearance',
          code: 'INSUFFICIENT_CLEARANCE'
        });
      }
    }

    // Check sovereignty level requirements
    if (data.sovereigntyLevel === SovereigntyLevel.TRADITIONAL_OWNER && !isElderOrCulturalKeeper) {
      errors.push({
        field: 'sovereigntyLevel',
        message: 'Traditional Owner sovereignty requires Elder or Cultural Keeper authorization',
        code: 'CULTURAL_AUTHORIZATION_REQUIRED',
        culturalContext: 'This change affects Traditional Owner data sovereignty'
      });
    }

    // Check expiry date
    if (data.expiresAt && data.expiresAt <= new Date()) {
      errors.push({
        field: 'expiresAt',
        message: 'Expiry date must be in the future',
        code: 'INVALID_EXPIRY_DATE'
      });
    }

    return errors;
  }, [formData, canAccessCulturalData, isElderOrCulturalKeeper]);

  // Handle form changes
  const handleFormChange = useCallback((field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Validate changes
    const errors = validateForm(newFormData);
    setValidationErrors(errors);
  }, [formData, validateForm]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!data) return;

    const errors = validateForm(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Check for cultural protocols
    if (culturalReviewRequired && !isElderOrCulturalKeeper) {
      setError('This consent requires cultural review by an Elder or Cultural Keeper');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Determine the action type
      const action = determineConsentAction(data.consent, formData);

      // Save the consent
      const updatedConsent = await consentService.updateConsent(consentId, {
        ...formData,
        lastModified: new Date(),
        modifiedBy: adminUser.id
      }, {
        action,
        adminUserId: adminUser.id,
        culturalReview: culturalReviewRequired
      });

      // Create attestation for the change
      if (canCreateAttestations) {
        await attestationService.createAttestation({
          type: getAttestationTypeForAction(action),
          subjectId: updatedConsent.userId,
          subjectType: 'user',
          attestedBy: adminUser.id,
          attestationData: {
            consentId: updatedConsent.id,
            purposes: updatedConsent.purposes.map(p => p.id),
            dataCategories: updatedConsent.dataCategories.map(dc => dc.id),
            conditions: [],
            restrictions: []
          },
          complianceFrameworks: updatedConsent.complianceFrameworks
        });
      }

      // Log the update
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: `consent_${action}`,
        resource: 'consent',
        resourceId: consentId,
        previousState: data.consent,
        newState: updatedConsent,
        culturalSensitive: data.culturalContext.sacredDataInvolved
      });

      setEditing(false);
      onUpdated(updatedConsent);
      await loadConsentDetails(); // Reload to get fresh data

    } catch (err) {
      console.error('Failed to save consent:', err);
      setError(err instanceof Error ? err.message : 'Failed to save consent');
    } finally {
      setSaving(false);
    }
  }, [data, formData, validateForm, culturalReviewRequired, isElderOrCulturalKeeper, adminUser, consentId, onUpdated, loadConsentDetails]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    if (data) {
      setFormData(data.consent);
      setValidationErrors([]);
      setEditing(false);
    }
  }, [data]);

  // Handle revoke consent
  const handleRevoke = useCallback(async (reason: string) => {
    if (!data || !canRevokeConsents) return;

    try {
      setSaving(true);
      setError(null);

      await consentService.revokeConsent(consentId, {
        revokedBy: adminUser.id,
        reason,
        culturalReview: culturalReviewRequired
      });

      // Log revocation
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: 'consent_revoked',
        resource: 'consent',
        resourceId: consentId,
        culturalSensitive: data.culturalContext.sacredDataInvolved
      });

      await loadConsentDetails();

    } catch (err) {
      console.error('Failed to revoke consent:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke consent');
    } finally {
      setSaving(false);
    }
  }, [data, canRevokeConsents, consentId, adminUser, culturalReviewRequired, loadConsentDetails]);

  // Render loading state
  if (loading) {
    return (
      <div className="consent-detail-view loading">
        <div className="loading-spinner" />
        <p>Loading consent details...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="consent-detail-view error">
        <div className="error-message">
          <h3>Error Loading Consent</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={loadConsentDetails} className="btn-retry">
              Try Again
            </button>
            <button onClick={onClose} className="btn-close">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { consent, culturalContext, complianceStatus, availableActions } = data;

  return (
    <div className="consent-detail-view">
      {/* Header */}
      <div className="detail-header">
        <div className="header-title">
          <h2>Consent Details</h2>
          <span className="consent-id">ID: {consent.id}</span>
        </div>
        <div className="header-actions">
          {!editing && canModifyConsents && !readOnly && (
            <button 
              onClick={() => setEditing(true)}
              className="btn-edit"
              disabled={saving}
            >
              Edit Consent
            </button>
          )}
          {editing && (
            <>
              <button 
                onClick={handleSave}
                className="btn-save"
                disabled={saving || validationErrors.length > 0}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                onClick={handleCancelEdit}
                className="btn-cancel"
                disabled={saving}
              >
                Cancel
              </button>
            </>
          )}
          <button onClick={onClose} className="btn-close">
            Close
          </button>
        </div>
      </div>

      {/* Cultural Warning */}
      {showCulturalWarning && (
        <div className="cultural-warning">
          <h4>⚠️ Cultural Data Protection Notice</h4>
          <p>
            This consent involves Indigenous cultural data that requires special handling.
            Changes may require approval from an Elder or Cultural Keeper.
          </p>
          {culturalContext.traditionalTerritory && (
            <p>Traditional Territory: {culturalContext.traditionalTerritory}</p>
          )}
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <h4>Validation Errors</h4>
          {validationErrors.map((error, index) => (
            <div key={index} className="validation-error">
              <strong>{error.field}:</strong> {error.message}
              {error.culturalContext && (
                <div className="cultural-context">{error.culturalContext}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="detail-content">
        {/* Data Subject Information */}
        <section className="detail-section">
          <h3>Data Subject</h3>
          <div className="data-subject-info">
            <div className="info-row">
              <label>Name:</label>
              <span>{consent.dataSubject.name}</span>
            </div>
            <div className="info-row">
              <label>Email:</label>
              <span>{consent.dataSubject.email}</span>
            </div>
            {consent.dataSubject.phone && (
              <div className="info-row">
                <label>Phone:</label>
                <span>{consent.dataSubject.phone}</span>
              </div>
            )}
            {consent.dataSubject.organisation && (
              <div className="info-row">
                <label>Organisation:</label>
                <span>{consent.dataSubject.organisation}</span>
              </div>
            )}
            {consent.dataSubject.indigenousStatus && canAccessCulturalData && (
              <>
                <div className="info-row cultural">
                  <label>Indigenous Status:</label>
                  <span>✓ Indigenous Australian</span>
                </div>
                {consent.dataSubject.traditionalOwner && (
                  <div className="info-row cultural">
                    <label>Traditional Owner:</label>
                    <span>{consent.dataSubject.traditionalOwner}</span>
                  </div>
                )}
                {consent.dataSubject.communityAffiliation && (
                  <div className="info-row cultural">
                    <label>Community:</label>
                    <span>{consent.dataSubject.communityAffiliation}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Consent Details */}
        <section className="detail-section">
          <h3>Consent Information</h3>
          <div className="consent-form">
            <div className="form-row">
              <label>Consent Level:</label>
              {editing ? (
                <select
                  value={formData.consentLevel || ''}
                  onChange={(e) => handleFormChange('consentLevel', e.target.value as ConsentLevel)}
                  className={validationErrors.some(e => e.field === 'consentLevel') ? 'error' : ''}
                >
                  <option value={ConsentLevel.NO_CONSENT}>No Consent</option>
                  <option value={ConsentLevel.MANUAL_ONLY}>Manual Only</option>
                  <option value={ConsentLevel.PARTIAL_AUTOMATION}>Partial Automation</option>
                  <option value={ConsentLevel.FULL_AUTOMATION}>Full Automation</option>
                  {isElderOrCulturalKeeper && (
                    <option value={ConsentLevel.EMERGENCY_OVERRIDE}>Emergency Override</option>
                  )}
                </select>
              ) : (
                <span className={`consent-level ${consent.consentLevel}`}>
                  {getConsentLevelDisplay(consent.consentLevel)}
                </span>
              )}
            </div>

            <div className="form-row">
              <label>Sovereignty Level:</label>
              {editing ? (
                <select
                  value={formData.sovereigntyLevel || ''}
                  onChange={(e) => handleFormChange('sovereigntyLevel', e.target.value as SovereigntyLevel)}
                  className={validationErrors.some(e => e.field === 'sovereigntyLevel') ? 'error' : ''}
                >
                  <option value={SovereigntyLevel.INDIVIDUAL}>Individual</option>
                  <option value={SovereigntyLevel.COMMUNITY}>Community</option>
                  {(isElderOrCulturalKeeper || consent.sovereigntyLevel === SovereigntyLevel.TRADITIONAL_OWNER) && (
                    <option value={SovereigntyLevel.TRADITIONAL_OWNER}>Traditional Owner</option>
                  )}
                  <option value={SovereigntyLevel.ORGANISATION}>Organisation</option>
                  <option value={SovereigntyLevel.GOVERNMENT}>Government</option>
                  <option value={SovereigntyLevel.INTERNATIONAL}>International</option>
                </select>
              ) : (
                <span className={`sovereignty-level ${consent.sovereigntyLevel}`}>
                  {getSovereigntyLevelDisplay(consent.sovereigntyLevel)}
                </span>
              )}
            </div>

            <div className="form-row">
              <label>Granted:</label>
              <span>{consent.grantedAt.toLocaleDateString()}</span>
            </div>

            <div className="form-row">
              <label>Expires:</label>
              {editing ? (
                <input
                  type="date"
                  value={formData.expiresAt ? formData.expiresAt.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFormChange('expiresAt', e.target.value ? new Date(e.target.value) : undefined)}
                  className={validationErrors.some(e => e.field === 'expiresAt') ? 'error' : ''}
                />
              ) : (
                <span>
                  {consent.expiresAt ? consent.expiresAt.toLocaleDateString() : 'No expiry'}
                </span>
              )}
            </div>

            <div className="form-row">
              <label>Status:</label>
              <span className={`status ${getConsentStatus(consent)}`}>
                {getConsentStatusDisplay(consent)}
              </span>
            </div>

            <div className="form-row">
              <label>Last Modified:</label>
              <span>
                {consent.lastModified.toLocaleDateString()} by {consent.modifiedBy}
              </span>
            </div>
          </div>
        </section>

        {/* Purposes */}
        <section className="detail-section">
          <h3>Purposes</h3>
          <div className="purposes-list">
            {consent.purposes.map((purpose) => (
              <div key={purpose.id} className="purpose-item">
                <h4>{purpose.name}</h4>
                <p>{purpose.description}</p>
                <div className="purpose-details">
                  <span className="category">{purpose.category}</span>
                  <span className="required-level">
                    Required: {getConsentLevelDisplay(purpose.requiredLevel)}
                  </span>
                  {purpose.culturallySensitive && (
                    <span className="cultural-sensitive">Culturally Sensitive</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Categories */}
        <section className="detail-section">
          <h3>Data Categories</h3>
          <div className="data-categories-list">
            {consent.dataCategories.map((category) => (
              <div key={category.id} className="category-item">
                <h4>{category.name}</h4>
                <p>{category.description}</p>
                <div className="category-details">
                  <span className={`sensitivity ${category.sensitivity}`}>
                    {category.sensitivity}
                  </span>
                  {category.personalData && <span className="flag">Personal Data</span>}
                  {category.indigenousData && canAccessCulturalData && (
                    <span className="flag cultural">Indigenous Data</span>
                  )}
                  {category.financialData && <span className="flag">Financial Data</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compliance Status */}
        <section className="detail-section">
          <h3>Compliance Status</h3>
          <ComplianceStatusDisplay complianceStatus={complianceStatus} />
        </section>

        {/* Cultural Context */}
        {canAccessCulturalData && culturalContext && (
          <section className="detail-section cultural">
            <h3>Cultural Context</h3>
            <CulturalContextDisplay culturalContext={culturalContext} />
          </section>
        )}

        {/* Attestations */}
        <section className="detail-section">
          <h3>Attestations</h3>
          <AttestationsList
            attestations={consent.attestations}
            adminUser={adminUser}
            onCreateAttestation={canCreateAttestations ? () => {
              // Handle create attestation
            } : undefined}
          />
        </section>

        {/* History */}
        <section className="detail-section">
          <h3>Change History</h3>
          <ConsentHistoryList
            history={consent.history}
            adminUser={adminUser}
            showCulturalActions={canAccessCulturalData}
          />
        </section>
      </div>

      {/* Actions */}
      {!editing && (
        <div className="detail-actions">
          {canRevokeConsents && !consent.revokedAt && (
            <RevokeConsentButton
              onRevoke={handleRevoke}
              culturalReviewRequired={culturalReviewRequired}
              disabled={saving}
            />
          )}
          
          {availableActions.map((action) => (
            <button
              key={action.id}
              className={`btn-action ${action.type} ${action.destructive ? 'destructive' : ''}`}
              disabled={
                saving ||
                !adminUser.permissions.some(p => action.permissions.includes(p)) ||
                (action.culturalClearanceRequired && !isElderOrCulturalKeeper)
              }
              onClick={() => {
                // Handle action
              }}
            >
              {action.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper functions
function determineConsentAction(
  originalConsent: ConsentRecord,
  updatedConsent: Partial<ConsentRecord>
): ConsentAction {
  if (updatedConsent.revokedAt && !originalConsent.revokedAt) {
    return ConsentAction.REVOKED;
  }
  if (updatedConsent.consentLevel !== originalConsent.consentLevel ||
      updatedConsent.sovereigntyLevel !== originalConsent.sovereigntyLevel) {
    return ConsentAction.MODIFIED;
  }
  if (updatedConsent.expiresAt !== originalConsent.expiresAt) {
    return ConsentAction.RENEWED;
  }
  return ConsentAction.MODIFIED;
}

function getAttestationTypeForAction(action: ConsentAction) {
  switch (action) {
    case ConsentAction.GRANTED: return 'consent_granted';
    case ConsentAction.MODIFIED: return 'consent_modified';
    case ConsentAction.REVOKED: return 'consent_revoked';
    default: return 'consent_modified';
  }
}

function getConsentLevelDisplay(level: ConsentLevel): string {
  switch (level) {
    case ConsentLevel.NO_CONSENT: return 'No Consent';
    case ConsentLevel.MANUAL_ONLY: return 'Manual Only';
    case ConsentLevel.PARTIAL_AUTOMATION: return 'Partial Automation';
    case ConsentLevel.FULL_AUTOMATION: return 'Full Automation';
    case ConsentLevel.EMERGENCY_OVERRIDE: return 'Emergency Override';
    default: return level;
  }
}

function getSovereigntyLevelDisplay(level: SovereigntyLevel): string {
  switch (level) {
    case SovereigntyLevel.INDIVIDUAL: return 'Individual';
    case SovereigntyLevel.COMMUNITY: return 'Community';
    case SovereigntyLevel.TRADITIONAL_OWNER: return 'Traditional Owner';
    case SovereigntyLevel.ORGANISATION: return 'Organisation';
    case SovereigntyLevel.GOVERNMENT: return 'Government';
    case SovereigntyLevel.INTERNATIONAL: return 'International';
    default: return level;
  }
}

function getConsentStatus(consent: ConsentRecord): string {
  if (consent.revokedAt) return 'revoked';
  if (consent.expiresAt && consent.expiresAt < new Date()) return 'expired';
  return 'active';
}

function getConsentStatusDisplay(consent: ConsentRecord): string {
  const status = getConsentStatus(consent);
  switch (status) {
    case 'revoked': return 'Revoked';
    case 'expired': return 'Expired';
    case 'active': return 'Active';
    default: return status;
  }
}

// Sub-components would be implemented here (ComplianceStatusDisplay, CulturalContextDisplay, etc.)
// These are simplified for brevity

const ComplianceStatusDisplay: React.FC<{ complianceStatus: ComplianceStatus }> = ({ complianceStatus }) => (
  <div className={`compliance-status ${complianceStatus.overall}`}>
    <div className="overall-status">
      Status: <span className={complianceStatus.overall}>{complianceStatus.overall}</span>
    </div>
    {/* Framework details would be rendered here */}
  </div>
);

const CulturalContextDisplay: React.FC<{ culturalContext: CulturalContext }> = ({ culturalContext }) => (
  <div className="cultural-context">
    {culturalContext.traditionalTerritory && (
      <p>Traditional Territory: {culturalContext.traditionalTerritory}</p>
    )}
    {/* Additional cultural context would be rendered here */}
  </div>
);

const AttestationsList: React.FC<{
  attestations: AttestationRecord[];
  adminUser: AdminUser;
  onCreateAttestation?: () => void;
}> = ({ attestations, adminUser, onCreateAttestation }) => (
  <div className="attestations-list">
    {/* Attestations would be rendered here */}
    {onCreateAttestation && (
      <button onClick={onCreateAttestation} className="btn-create-attestation">
        Create Attestation
      </button>
    )}
  </div>
);

const ConsentHistoryList: React.FC<{
  history: ConsentHistoryEntry[];
  adminUser: AdminUser;
  showCulturalActions: boolean;
}> = ({ history, adminUser, showCulturalActions }) => (
  <div className="history-list">
    {history.map((entry) => (
      <div key={entry.id} className={`history-entry ${entry.action}`}>
        <div className="entry-header">
          <span className="action">{entry.action}</span>
          <span className="timestamp">{entry.timestamp.toLocaleDateString()}</span>
          <span className="performer">{entry.performedBy}</span>
        </div>
        <div className="entry-reason">{entry.reason}</div>
        {entry.culturalContext && showCulturalActions && (
          <div className="cultural-context">{entry.culturalContext}</div>
        )}
      </div>
    ))}
  </div>
);

const RevokeConsentButton: React.FC<{
  onRevoke: (reason: string) => Promise<void>;
  culturalReviewRequired: boolean;
  disabled: boolean;
}> = ({ onRevoke, culturalReviewRequired, disabled }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');

  const handleRevoke = async () => {
    if (!reason.trim()) return;
    await onRevoke(reason);
    setShowDialog(false);
    setReason('');
  };

  if (!showDialog) {
    return (
      <button
        onClick={() => setShowDialog(true)}
        className="btn-revoke destructive"
        disabled={disabled}
      >
        Revoke Consent
      </button>
    );
  }

  return (
    <div className="revoke-dialog">
      <h4>Revoke Consent</h4>
      {culturalReviewRequired && (
        <div className="cultural-warning">
          This action involves Indigenous data and requires cultural consideration.
        </div>
      )}
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Please provide a reason for revoking this consent..."
        rows={3}
        required
      />
      <div className="dialog-actions">
        <button
          onClick={handleRevoke}
          className="btn-confirm destructive"
          disabled={!reason.trim()}
        >
          Confirm Revocation
        </button>
        <button
          onClick={() => setShowDialog(false)}
          className="btn-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};