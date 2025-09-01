/**
 * Attestation Management Interface
 * 
 * Interface for creating, viewing, and managing digital attestations
 * with cultural protocols and digital signing support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AttestationRecord,
  AttestationType,
  AdminUser,
  DigitalSignature,
  AttestationData,
  ConsentRecord,
  AdminPermission,
  CulturalAuthorization,
  FormValidationError
} from '../types';
import { AttestationService } from '../services/AttestationService';
import { DigitalSigningService } from '../services/DigitalSigningService';
import { CulturalProtocolService } from '../services/CulturalProtocolService';
import { AuditService } from '../services/AuditService';

interface AttestationManagerProps {
  consentId?: string;
  adminUser: AdminUser;
  onAttestationCreated?: (attestation: AttestationRecord) => void;
  culturalContext?: {
    traditionalTerritory?: string;
    requiresElderApproval?: boolean;
    culturalProtocols?: string[];
  };
}

/**
 * Main attestation management component
 */
export const AttestationManager: React.FC<AttestationManagerProps> = ({
  consentId,
  adminUser,
  onAttestationCreated,
  culturalContext
}) => {
  // State management
  const [attestations, setAttestations] = useState<AttestationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAttestation, setSelectedAttestation] = useState<AttestationRecord | null>(null);

  // Services
  const attestationService = useMemo(() => new AttestationService(), []);
  const signingService = useMemo(() => new DigitalSigningService(), []);
  const culturalService = useMemo(() => new CulturalProtocolService(), []);
  const auditService = useMemo(() => new AuditService(), []);

  // Permission checks
  const canViewAttestations = adminUser.permissions.includes(AdminPermission.VIEW_ATTESTATIONS);
  const canCreateAttestations = adminUser.permissions.includes(AdminPermission.CREATE_ATTESTATIONS);
  const canDigitalSign = adminUser.permissions.includes(AdminPermission.DIGITAL_SIGNING);
  const isElderOrCulturalKeeper = adminUser.clearanceLevel === 'elder' || 
                                 adminUser.clearanceLevel === 'cultural_keeper';

  // Load attestations
  const loadAttestations = useCallback(async () => {
    if (!canViewAttestations) {
      setError('Insufficient permissions to view attestations');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await attestationService.getAttestations({
        consentId,
        adminUserId: adminUser.id,
        includeCultural: isElderOrCulturalKeeper
      });

      setAttestations(response);

      // Log access
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: 'attestations_viewed',
        resource: 'attestations',
        resourceId: consentId || 'all',
        culturalSensitive: !!culturalContext?.traditionalTerritory
      });

    } catch (err) {
      console.error('Failed to load attestations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attestations');
    } finally {
      setLoading(false);
    }
  }, [consentId, adminUser, canViewAttestations, isElderOrCulturalKeeper, culturalContext]);

  // Load data on mount
  useEffect(() => {
    loadAttestations();
  }, [loadAttestations]);

  // Handle attestation creation
  const handleAttestationCreated = useCallback(async (attestation: AttestationRecord) => {
    await loadAttestations();
    onAttestationCreated?.(attestation);
    setShowCreateForm(false);
  }, [loadAttestations, onAttestationCreated]);

  // Render loading state
  if (loading) {
    return (
      <div className="attestation-manager loading">
        <div className="loading-spinner" />
        <p>Loading attestations...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="attestation-manager error">
        <div className="error-message">
          <h3>Error Loading Attestations</h3>
          <p>{error}</p>
          <button onClick={loadAttestations} className="btn-retry">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render permission denied
  if (!canViewAttestations) {
    return (
      <div className="attestation-manager permission-denied">
        <div className="permission-message">
          <h3>Access Denied</h3>
          <p>You do not have permission to view attestations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attestation-manager">
      {/* Header */}
      <div className="attestation-header">
        <h2>Digital Attestations</h2>
        {canCreateAttestations && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-create-attestation"
          >
            Create Attestation
          </button>
        )}
      </div>

      {/* Cultural Context Warning */}
      {culturalContext?.requiresElderApproval && !isElderOrCulturalKeeper && (
        <div className="cultural-warning">
          <h4>🪃 Cultural Protocol Notice</h4>
          <p>
            These attestations involve Indigenous cultural data or protocols.
            Some actions may require Elder approval or Cultural Keeper authorization.
          </p>
          {culturalContext.traditionalTerritory && (
            <p>Traditional Territory: {culturalContext.traditionalTerritory}</p>
          )}
        </div>
      )}

      {/* Attestations List */}
      <div className="attestations-list">
        {attestations.length === 0 ? (
          <div className="empty-state">
            <p>No attestations found.</p>
            {canCreateAttestations && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-create-first"
              >
                Create First Attestation
              </button>
            )}
          </div>
        ) : (
          attestations.map((attestation) => (
            <AttestationCard
              key={attestation.id}
              attestation={attestation}
              adminUser={adminUser}
              onSelect={() => setSelectedAttestation(attestation)}
              canSign={canDigitalSign}
              showCulturalDetails={isElderOrCulturalKeeper}
            />
          ))
        )}
      </div>

      {/* Create Attestation Form */}
      {showCreateForm && (
        <CreateAttestationForm
          consentId={consentId}
          adminUser={adminUser}
          culturalContext={culturalContext}
          onCancel={() => setShowCreateForm(false)}
          onCreated={handleAttestationCreated}
        />
      )}

      {/* Attestation Detail View */}
      {selectedAttestation && (
        <AttestationDetailView
          attestation={selectedAttestation}
          adminUser={adminUser}
          onClose={() => setSelectedAttestation(null)}
          canSign={canDigitalSign}
          showCulturalDetails={isElderOrCulturalKeeper}
        />
      )}
    </div>
  );
};

/**
 * Individual attestation card component
 */
interface AttestationCardProps {
  attestation: AttestationRecord;
  adminUser: AdminUser;
  onSelect: () => void;
  canSign: boolean;
  showCulturalDetails: boolean;
}

const AttestationCard: React.FC<AttestationCardProps> = ({
  attestation,
  adminUser,
  onSelect,
  canSign,
  showCulturalDetails
}) => {
  const isCultural = attestation.type.includes('cultural') || 
                    attestation.type.includes('traditional') ||
                    attestation.type.includes('elder') ||
                    attestation.type.includes('community');

  const getAttestationTypeDisplay = (type: AttestationType): string => {
    switch (type) {
      case AttestationType.CONSENT_GRANTED: return 'Consent Granted';
      case AttestationType.CONSENT_MODIFIED: return 'Consent Modified';
      case AttestationType.CONSENT_REVOKED: return 'Consent Revoked';
      case AttestationType.DATA_ACCESS: return 'Data Access';
      case AttestationType.DATA_SHARING: return 'Data Sharing';
      case AttestationType.POLICY_COMPLIANCE: return 'Policy Compliance';
      case AttestationType.CULTURAL_CLEARANCE: return 'Cultural Clearance';
      case AttestationType.ELDER_APPROVAL: return 'Elder Approval';
      case AttestationType.COMMUNITY_CONSENT: return 'Community Consent';
      case AttestationType.TRADITIONAL_OWNER_CONSENT: return 'Traditional Owner Consent';
      default: return type;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'active': return '✅';
      case 'expired': return '⏰';
      case 'revoked': return '❌';
      default: return '❓';
    }
  };

  return (
    <div 
      className={`attestation-card ${attestation.status} ${isCultural ? 'cultural' : ''}`}
      onClick={onSelect}
    >
      <div className="card-header">
        <div className="attestation-type">
          {isCultural && showCulturalDetails && <span className="cultural-icon">🪃</span>}
          {getAttestationTypeDisplay(attestation.type)}
        </div>
        <div className="attestation-status">
          {getStatusIcon(attestation.status)} {attestation.status}
        </div>
      </div>

      <div className="card-content">
        <div className="attestation-meta">
          <div className="meta-item">
            <label>Attested by:</label>
            <span>{attestation.attestedBy}</span>
          </div>
          <div className="meta-item">
            <label>Date:</label>
            <span>{attestation.attestedAt.toLocaleDateString()}</span>
          </div>
          {attestation.validUntil && (
            <div className="meta-item">
              <label>Valid until:</label>
              <span>{attestation.validUntil.toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {attestation.digitalSignature && (
          <div className="digital-signature">
            <span className="signature-icon">🔐</span>
            <span>Digitally Signed</span>
            {attestation.digitalSignature.verified && (
              <span className="verified">✓ Verified</span>
            )}
          </div>
        )}

        {isCultural && showCulturalDetails && attestation.culturalProtocols && (
          <div className="cultural-protocols">
            <label>Cultural Protocols:</label>
            <div className="protocols-list">
              {attestation.culturalProtocols.map((protocol, index) => (
                <span key={index} className="protocol-tag">
                  {protocol}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="attestation-summary">
          <label>Purposes:</label>
          <span>{attestation.attestationData.purposes.join(', ')}</span>
        </div>

        <div className="compliance-frameworks">
          {attestation.complianceFrameworks.map((framework, index) => (
            <span key={index} className="framework-tag">
              {framework}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Create attestation form component
 */
interface CreateAttestationFormProps {
  consentId?: string;
  adminUser: AdminUser;
  culturalContext?: {
    traditionalTerritory?: string;
    requiresElderApproval?: boolean;
    culturalProtocols?: string[];
  };
  onCancel: () => void;
  onCreated: (attestation: AttestationRecord) => void;
}

const CreateAttestationForm: React.FC<CreateAttestationFormProps> = ({
  consentId,
  adminUser,
  culturalContext,
  onCancel,
  onCreated
}) => {
  // Form state
  const [formData, setFormData] = useState({
    type: AttestationType.CONSENT_GRANTED,
    subjectId: '',
    subjectType: 'user' as 'user' | 'organisation' | 'system',
    validUntil: '',
    purposes: [] as string[],
    dataCategories: [] as string[],
    conditions: [] as string[],
    restrictions: [] as string[],
    culturalConsiderations: [] as string[],
    complianceFrameworks: ['privacy_act_1988'] as string[]
  });

  const [validationErrors, setValidationErrors] = useState<FormValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [requireDigitalSignature, setRequireDigitalSignature] = useState(false);

  const attestationService = useMemo(() => new AttestationService(), []);
  const signingService = useMemo(() => new DigitalSigningService(), []);
  const auditService = useMemo(() => new AuditService(), []);

  const isElderOrCulturalKeeper = adminUser.clearanceLevel === 'elder' || 
                                 adminUser.clearanceLevel === 'cultural_keeper';

  // Available attestation types based on user permissions
  const availableTypes = useMemo(() => {
    const baseTypes = [
      AttestationType.CONSENT_GRANTED,
      AttestationType.CONSENT_MODIFIED,
      AttestationType.DATA_ACCESS,
      AttestationType.POLICY_COMPLIANCE
    ];

    if (isElderOrCulturalKeeper) {
      baseTypes.push(
        AttestationType.CULTURAL_CLEARANCE,
        AttestationType.ELDER_APPROVAL,
        AttestationType.COMMUNITY_CONSENT,
        AttestationType.TRADITIONAL_OWNER_CONSENT
      );
    }

    return baseTypes;
  }, [isElderOrCulturalKeeper]);

  // Validate form
  const validateForm = useCallback((): FormValidationError[] => {
    const errors: FormValidationError[] = [];

    if (!formData.subjectId.trim()) {
      errors.push({
        field: 'subjectId',
        message: 'Subject ID is required',
        code: 'REQUIRED'
      });
    }

    if (formData.purposes.length === 0) {
      errors.push({
        field: 'purposes',
        message: 'At least one purpose must be specified',
        code: 'REQUIRED'
      });
    }

    // Cultural attestation validation
    const isCulturalType = [
      AttestationType.CULTURAL_CLEARANCE,
      AttestationType.ELDER_APPROVAL,
      AttestationType.COMMUNITY_CONSENT,
      AttestationType.TRADITIONAL_OWNER_CONSENT
    ].includes(formData.type);

    if (isCulturalType && !isElderOrCulturalKeeper) {
      errors.push({
        field: 'type',
        message: 'Cultural attestations require Elder or Cultural Keeper authorization',
        code: 'INSUFFICIENT_AUTHORITY',
        culturalContext: 'This attestation type requires cultural authority'
      });
    }

    if (isCulturalType && formData.culturalConsiderations.length === 0) {
      errors.push({
        field: 'culturalConsiderations',
        message: 'Cultural considerations must be documented for cultural attestations',
        code: 'CULTURAL_DOCUMENTATION_REQUIRED'
      });
    }

    // Digital signature validation
    if (requireDigitalSignature && !adminUser.permissions.includes(AdminPermission.DIGITAL_SIGNING)) {
      errors.push({
        field: 'digitalSignature',
        message: 'Digital signing permission required',
        code: 'PERMISSION_REQUIRED'
      });
    }

    return errors;
  }, [formData, isElderOrCulturalKeeper, requireDigitalSignature, adminUser]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSaving(true);
      setValidationErrors([]);

      // Create attestation data
      const attestationData: AttestationData = {
        consentId,
        purposes: formData.purposes,
        dataCategories: formData.dataCategories,
        conditions: formData.conditions,
        restrictions: formData.restrictions,
        culturalConsiderations: formData.culturalConsiderations.length > 0 ? formData.culturalConsiderations : undefined
      };

      // Create the attestation
      let attestation = await attestationService.createAttestation({
        type: formData.type,
        subjectId: formData.subjectId,
        subjectType: formData.subjectType,
        attestedBy: adminUser.id,
        validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
        attestationData,
        complianceFrameworks: formData.complianceFrameworks,
        culturalProtocols: culturalContext?.culturalProtocols
      });

      // Add digital signature if required
      if (requireDigitalSignature) {
        const signature = await signingService.signAttestation(attestation, adminUser);
        attestation = await attestationService.addDigitalSignature(attestation.id, signature);
      }

      // Log creation
      await auditService.logAdminAction({
        adminUserId: adminUser.id,
        action: 'attestation_created',
        resource: 'attestation',
        resourceId: attestation.id,
        culturalSensitive: [
          AttestationType.CULTURAL_CLEARANCE,
          AttestationType.ELDER_APPROVAL,
          AttestationType.COMMUNITY_CONSENT,
          AttestationType.TRADITIONAL_OWNER_CONSENT
        ].includes(formData.type)
      });

      onCreated(attestation);

    } catch (err) {
      console.error('Failed to create attestation:', err);
      setValidationErrors([{
        field: 'general',
        message: err instanceof Error ? err.message : 'Failed to create attestation',
        code: 'CREATION_FAILED'
      }]);
    } finally {
      setSaving(false);
    }
  }, [formData, validateForm, consentId, adminUser, culturalContext, requireDigitalSignature, onCreated]);

  return (
    <div className="create-attestation-form overlay">
      <div className="form-container">
        <div className="form-header">
          <h3>Create Digital Attestation</h3>
          <button onClick={onCancel} className="btn-close">×</button>
        </div>

        {/* Cultural Context Warning */}
        {culturalContext?.requiresElderApproval && (
          <div className="cultural-notice">
            <h4>🪃 Cultural Protocol Notice</h4>
            <p>
              This attestation may involve Indigenous cultural data or protocols.
              Please ensure all cultural considerations are properly documented.
            </p>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="validation-errors">
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

        <form onSubmit={handleSubmit} className="attestation-form">
          {/* Attestation Type */}
          <div className="form-group">
            <label>Attestation Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AttestationType }))}
              required
            >
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Information */}
          <div className="form-row">
            <div className="form-group">
              <label>Subject ID *</label>
              <input
                type="text"
                value={formData.subjectId}
                onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                placeholder="User/Organisation/System ID"
                required
              />
            </div>
            <div className="form-group">
              <label>Subject Type</label>
              <select
                value={formData.subjectType}
                onChange={(e) => setFormData(prev => ({ ...prev, subjectType: e.target.value as any }))}
              >
                <option value="user">User</option>
                <option value="organisation">Organisation</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>

          {/* Validity Period */}
          <div className="form-group">
            <label>Valid Until</label>
            <input
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Purposes */}
          <div className="form-group">
            <label>Purposes *</label>
            <textarea
              value={formData.purposes.join('\n')}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                purposes: e.target.value.split('\n').filter(p => p.trim()) 
              }))}
              placeholder="Enter purposes (one per line)"
              rows={3}
              required
            />
          </div>

          {/* Data Categories */}
          <div className="form-group">
            <label>Data Categories</label>
            <textarea
              value={formData.dataCategories.join('\n')}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                dataCategories: e.target.value.split('\n').filter(dc => dc.trim()) 
              }))}
              placeholder="Enter data categories (one per line)"
              rows={2}
            />
          </div>

          {/* Cultural Considerations */}
          {([AttestationType.CULTURAL_CLEARANCE, AttestationType.ELDER_APPROVAL, AttestationType.COMMUNITY_CONSENT, AttestationType.TRADITIONAL_OWNER_CONSENT].includes(formData.type) || isElderOrCulturalKeeper) && (
            <div className="form-group cultural">
              <label>Cultural Considerations {[AttestationType.CULTURAL_CLEARANCE, AttestationType.ELDER_APPROVAL, AttestationType.COMMUNITY_CONSENT, AttestationType.TRADITIONAL_OWNER_CONSENT].includes(formData.type) ? '*' : ''}</label>
              <textarea
                value={formData.culturalConsiderations.join('\n')}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  culturalConsiderations: e.target.value.split('\n').filter(cc => cc.trim()) 
                }))}
                placeholder="Enter cultural considerations and protocols (one per line)"
                rows={3}
                required={[AttestationType.CULTURAL_CLEARANCE, AttestationType.ELDER_APPROVAL, AttestationType.COMMUNITY_CONSENT, AttestationType.TRADITIONAL_OWNER_CONSENT].includes(formData.type)}
              />
            </div>
          )}

          {/* Compliance Frameworks */}
          <div className="form-group">
            <label>Compliance Frameworks</label>
            <div className="checkbox-group">
              {['privacy_act_1988', 'care_principles', 'austrac', 'acnc_compliance'].map((framework) => (
                <label key={framework} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.complianceFrameworks.includes(framework)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ 
                          ...prev, 
                          complianceFrameworks: [...prev.complianceFrameworks, framework] 
                        }));
                      } else {
                        setFormData(prev => ({ 
                          ...prev, 
                          complianceFrameworks: prev.complianceFrameworks.filter(f => f !== framework) 
                        }));
                      }
                    }}
                  />
                  {framework.replace(/_/g, ' ').toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          {/* Digital Signature Option */}
          {adminUser.permissions.includes(AdminPermission.DIGITAL_SIGNING) && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={requireDigitalSignature}
                  onChange={(e) => setRequireDigitalSignature(e.target.checked)}
                />
                Add Digital Signature
              </label>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-create"
              disabled={saving || validationErrors.length > 0}
            >
              {saving ? 'Creating...' : 'Create Attestation'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn-cancel"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Attestation detail view component
 */
interface AttestationDetailViewProps {
  attestation: AttestationRecord;
  adminUser: AdminUser;
  onClose: () => void;
  canSign: boolean;
  showCulturalDetails: boolean;
}

const AttestationDetailView: React.FC<AttestationDetailViewProps> = ({
  attestation,
  adminUser,
  onClose,
  canSign,
  showCulturalDetails
}) => {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  const signingService = useMemo(() => new DigitalSigningService(), []);

  // Verify digital signature
  const handleVerifySignature = useCallback(async () => {
    if (!attestation.digitalSignature) return;

    try {
      setVerifying(true);
      const result = await signingService.verifySignature(attestation);
      setVerificationResult(result);
    } catch (err) {
      console.error('Signature verification failed:', err);
      setVerificationResult(false);
    } finally {
      setVerifying(false);
    }
  }, [attestation, signingService]);

  return (
    <div className="attestation-detail-view overlay">
      <div className="detail-container">
        <div className="detail-header">
          <h3>Attestation Details</h3>
          <button onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="detail-content">
          {/* Basic Information */}
          <section className="detail-section">
            <h4>Basic Information</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>Type:</label>
                <span>{attestation.type.replace(/_/g, ' ')}</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className={`status ${attestation.status}`}>{attestation.status}</span>
              </div>
              <div className="info-item">
                <label>Attested by:</label>
                <span>{attestation.attestedBy}</span>
              </div>
              <div className="info-item">
                <label>Date:</label>
                <span>{attestation.attestedAt.toLocaleString()}</span>
              </div>
              {attestation.validUntil && (
                <div className="info-item">
                  <label>Valid until:</label>
                  <span>{attestation.validUntil.toLocaleString()}</span>
                </div>
              )}
            </div>
          </section>

          {/* Digital Signature */}
          {attestation.digitalSignature && (
            <section className="detail-section">
              <h4>Digital Signature</h4>
              <div className="signature-details">
                <div className="signature-status">
                  <span className={`status ${attestation.digitalSignature.verified ? 'verified' : 'unverified'}`}>
                    {attestation.digitalSignature.verified ? '✓ Verified' : '⚠ Unverified'}
                  </span>
                  <button
                    onClick={handleVerifySignature}
                    className="btn-verify"
                    disabled={verifying}
                  >
                    {verifying ? 'Verifying...' : 'Verify Now'}
                  </button>
                </div>
                {verificationResult !== null && (
                  <div className={`verification-result ${verificationResult ? 'success' : 'failure'}`}>
                    {verificationResult ? 'Signature is valid' : 'Signature verification failed'}
                  </div>
                )}
                <div className="signature-info">
                  <div className="info-item">
                    <label>Algorithm:</label>
                    <span>{attestation.digitalSignature.algorithm}</span>
                  </div>
                  <div className="info-item">
                    <label>Timestamp:</label>
                    <span>{attestation.digitalSignature.timestamp.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Attestation Data */}
          <section className="detail-section">
            <h4>Attestation Data</h4>
            <div className="attestation-data">
              {attestation.attestationData.purposes.length > 0 && (
                <div className="data-item">
                  <label>Purposes:</label>
                  <ul>
                    {attestation.attestationData.purposes.map((purpose, index) => (
                      <li key={index}>{purpose}</li>
                    ))}
                  </ul>
                </div>
              )}
              {attestation.attestationData.dataCategories.length > 0 && (
                <div className="data-item">
                  <label>Data Categories:</label>
                  <ul>
                    {attestation.attestationData.dataCategories.map((category, index) => (
                      <li key={index}>{category}</li>
                    ))}
                  </ul>
                </div>
              )}
              {attestation.attestationData.conditions.length > 0 && (
                <div className="data-item">
                  <label>Conditions:</label>
                  <ul>
                    {attestation.attestationData.conditions.map((condition, index) => (
                      <li key={index}>{condition}</li>
                    ))}
                  </ul>
                </div>
              )}
              {attestation.attestationData.restrictions.length > 0 && (
                <div className="data-item">
                  <label>Restrictions:</label>
                  <ul>
                    {attestation.attestationData.restrictions.map((restriction, index) => (
                      <li key={index}>{restriction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Cultural Information */}
          {showCulturalDetails && (attestation.culturalProtocols || attestation.attestationData.culturalConsiderations) && (
            <section className="detail-section cultural">
              <h4>🪃 Cultural Information</h4>
              {attestation.culturalProtocols && (
                <div className="cultural-item">
                  <label>Cultural Protocols:</label>
                  <div className="protocols-list">
                    {attestation.culturalProtocols.map((protocol, index) => (
                      <span key={index} className="protocol-tag">
                        {protocol}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {attestation.attestationData.culturalConsiderations && (
                <div className="cultural-item">
                  <label>Cultural Considerations:</label>
                  <ul>
                    {attestation.attestationData.culturalConsiderations.map((consideration, index) => (
                      <li key={index}>{consideration}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Compliance Frameworks */}
          <section className="detail-section">
            <h4>Compliance Frameworks</h4>
            <div className="frameworks-list">
              {attestation.complianceFrameworks.map((framework, index) => (
                <span key={index} className="framework-tag">
                  {framework.replace(/_/g, ' ').toUpperCase()}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};