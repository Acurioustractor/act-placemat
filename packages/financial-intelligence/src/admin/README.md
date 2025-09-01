# Financial Intelligence Admin UI

A comprehensive admin interface for managing consent, attestations, cultural protocols, and audit trails with Australian compliance and Indigenous data sovereignty support.

## Features

### Core Components

- **ConsentDashboard**: Overview of all consent records with filtering and bulk operations
- **ConsentDetailView**: Detailed consent viewing and editing with validation
- **AttestationManager**: Digital attestation creation and management
- **AuditTrailViewer**: Comprehensive audit trail viewing with export capabilities
- **IndigenousDataControls**: Specialized controls for Indigenous data sovereignty

### Key Capabilities

- ✅ Australian compliance frameworks (Privacy Act 1988, AUSTRAC, ACNC)
- 🪃 Indigenous data sovereignty with CARE Principles
- 🔐 Digital signing and cryptographic attestations
- 📊 Comprehensive audit trails with tamper-evident logging
- 🏛️ Elder and Cultural Keeper authorization workflows
- 📋 Multi-level consent management (No Consent → Emergency Override)
- 🌏 Traditional Territory acknowledgments and protocols

## Usage

### Basic Setup

```tsx
import { 
  ConsentDashboard, 
  AttestationManager,
  AuditTrailViewer,
  IndigenousDataControls 
} from '@act-placemat/financial-intelligence/admin';
import '@act-placemat/financial-intelligence/admin/styles/admin.css';

function AdminPanel({ adminUser }: { adminUser: AdminUser }) {
  return (
    <div className="admin-container">
      <ConsentDashboard
        adminUser={adminUser}
        onConsentSelect={(consent) => console.log('Selected:', consent)}
        onBulkAction={(operation) => console.log('Bulk:', operation)}
        culturalContext={{
          traditionalTerritory: 'Wurundjeri Country'
        }}
      />
    </div>
  );
}
```

### Service Integration

```tsx
import { 
  ConsentService, 
  AttestationService, 
  CulturalProtocolService,
  AuditService
} from '@act-placemat/financial-intelligence/admin';

// Initialize services
const consentService = new ConsentService('/api/admin/consents');
const attestationService = new AttestationService('/api/admin/attestations');
const culturalService = new CulturalProtocolService('/api/admin/cultural-protocols');
const auditService = new AuditService('/api/admin/audit');

// Use services in components
async function loadConsents(adminUserId: string) {
  const response = await consentService.getConsents({
    filters: {
      indigenousData: true,
      sovereigntyLevels: [SovereigntyLevel.TRADITIONAL_OWNER]
    },
    userId: adminUserId,
    culturalContext: { traditionalTerritory: 'Wurundjeri Country' }
  });
  
  return response.consents;
}
```

## Permission System

The admin interface uses a comprehensive permission system:

```typescript
enum AdminPermission {
  VIEW_CONSENTS = 'view_consents',
  MODIFY_CONSENTS = 'modify_consents',
  REVOKE_CONSENTS = 'revoke_consents',
  VIEW_ATTESTATIONS = 'view_attestations',
  CREATE_ATTESTATIONS = 'create_attestations',
  DIGITAL_SIGNING = 'digital_signing',
  AUDIT_LOGS = 'audit_logs',
  CULTURAL_DATA_ACCESS = 'cultural_data_access',
  ELDER_OVERRIDE = 'elder_override'
}
```

### Cultural Authorization Levels

- **Standard Admin**: Basic consent and attestation management
- **Cultural Keeper**: Access to Indigenous data controls and protocols
- **Elder**: Full cultural authority including Traditional Owner consent

## Cultural Sensitivity Features

### CARE Principles Compliance

The system implements the CARE Principles for Indigenous Data Governance:

- **Collective Benefit**: Data should benefit Indigenous communities
- **Authority to Control**: Indigenous peoples have authority over their data
- **Responsibility**: Data use respects Indigenous rights and wellbeing  
- **Ethics**: Data use aligns with Indigenous ethical frameworks

### Traditional Territory Integration

```tsx
<IndigenousDataControls
  adminUser={adminUser}
  traditionalTerritory="Wurundjeri Country"
  onProtocolViolation={(violation) => {
    // Handle cultural protocol violations
    console.log('Protocol violation:', violation);
  }}
/>
```

### Cultural Indicators

Components use visual indicators for cultural sensitivity:

- 🪃 Symbol for Indigenous data
- Cultural warning banners for sensitive operations
- Elder approval requirements for Traditional Owner data
- 50-year retention for Indigenous cultural data

## Audit Trail Features

### Comprehensive Logging

```typescript
await auditService.logAdminAction({
  adminUserId: 'admin-123',
  action: 'consent_modified',
  resource: 'consent',
  resourceId: 'consent-456',
  previousState: oldConsent,
  newState: newConsent,
  culturalSensitive: true
});
```

### Export Capabilities

```tsx
// Export audit data in multiple formats
const exportData = await auditService.exportAuditData({
  format: 'pdf',
  filters: {
    culturalSensitive: true,
    timeRange: { start: startDate, end: endDate }
  },
  includeCulturalData: true,
  adminUserId: adminUser.id
});
```

## Digital Signatures

### Attestation Signing

```typescript
import { DigitalSigningService } from '@act-placemat/financial-intelligence/admin';

const signingService = new DigitalSigningService();

// Sign an attestation
const signature = await signingService.signAttestation(
  attestation,
  adminUser,
  {
    algorithm: 'ECDSA-P256',
    includeTimestamp: true
  }
);

// Verify signature
const isValid = await signingService.verifySignature(attestation);
```

### Cultural Attestations

Special signing protocols for Indigenous data:

```typescript
const signature = await signingService.signCulturalAttestation(
  attestation,
  adminUser,
  {
    territory: 'Wurundjeri Country',
    elderApproval: true,
    ceremonialAuthority: true,
    witnessedBy: ['elder-id-123']
  }
);
```

## API Endpoints

The admin interface expects these API endpoints:

### Consent Management
- `GET /api/admin/consents` - List consents with filtering
- `GET /api/admin/consents/:id` - Get consent details
- `PUT /api/admin/consents/:id` - Update consent
- `POST /api/admin/consents/:id/revoke` - Revoke consent

### Attestations
- `GET /api/admin/attestations` - List attestations
- `POST /api/admin/attestations` - Create attestation
- `POST /api/admin/attestations/:id/signature` - Add digital signature

### Cultural Protocols
- `GET /api/admin/cultural-protocols` - List protocols
- `GET /api/admin/cultural-protocols/violations` - List violations
- `POST /api/admin/cultural-protocols/notifications` - Send notifications

### Audit Trails
- `GET /api/admin/audit/entries` - Get audit entries
- `POST /api/admin/audit/log` - Log admin action
- `POST /api/admin/audit/export` - Export audit data

## Compliance Features

### Australian Legal Frameworks

- **Privacy Act 1988**: Consent management and data handling
- **AUSTRAC**: Financial intelligence and reporting requirements
- **ACNC**: Non-profit compliance and transparency

### Indigenous Data Governance

- **CARE Principles**: Collective benefit, Authority, Responsibility, Ethics
- **Traditional Owner Consent**: Special workflows for Traditional Owners
- **Elder Authorization**: Cultural authority for sensitive operations
- **Community Notifications**: Mandatory notifications for data access

## Development

### Adding New Components

1. Create component in `src/admin/components/`
2. Add types to `src/admin/types.ts`
3. Export from `src/admin/index.ts`
4. Add styles to `src/admin/styles/admin.css`

### Cultural Sensitivity Guidelines

When adding new features:

1. Check for Indigenous data involvement
2. Add appropriate cultural indicators (🪃)
3. Implement Elder/Cultural Keeper authorization if needed
4. Add to audit trails with cultural sensitivity flags
5. Follow CARE Principles for data governance

### Testing

```bash
# Run admin component tests
npm test src/admin/

# Test cultural protocol compliance
npm run test:cultural

# Audit trail integrity tests
npm run test:audit
```

## Security Considerations

- All admin actions are logged with tamper-evident signatures
- Cultural data has extended retention periods (50 years)
- Digital signatures use strong cryptographic algorithms
- Elder/Cultural Keeper authorization for sensitive operations
- IP address and session tracking for all actions

## Support

For questions about Indigenous data governance or cultural protocols, please consult with recognized Elders or Cultural Keepers in your community.

For technical support, see the main project documentation.