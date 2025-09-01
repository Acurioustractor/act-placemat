# Attestation Storage and Digital Signing System

A comprehensive system for secure attestation storage with cryptographic signatures, immutable audit trails, and Indigenous data sovereignty compliance.

## Features

### Core Capabilities

- 🔐 **Cryptographic Signing**: Support for RSA, ECDSA, and EdDSA algorithms
- 🗄️ **Immutable Storage**: PostgreSQL-based storage with tamper-evident records
- 🪃 **Indigenous Data Sovereignty**: CARE Principles compliance with Traditional Owner consent
- 📋 **Lifecycle Management**: Complete attestation lifecycle from creation to revocation
- 🔍 **Comprehensive Auditing**: Tamper-evident audit logs with integrity validation
- ⚡ **Bulk Operations**: Efficient processing of multiple attestations
- 📊 **Compliance Reporting**: Automated compliance reports for Australian frameworks

### Supported Algorithms

- **RSA-PKCS1-SHA256**: Traditional RSA with PKCS#1 v1.5 padding
- **RSA-PSS-SHA256**: RSA with PSS padding (recommended)
- **ECDSA-P256-SHA256**: Elliptic Curve Digital Signature with P-256 curve
- **ECDSA-P384-SHA384**: Elliptic Curve Digital Signature with P-384 curve
- **ECDSA-P521-SHA512**: Elliptic Curve Digital Signature with P-521 curve
- **EdDSA-Ed25519**: Edwards Curve Digital Signature (modern, efficient)

### Cultural Protocols

- **Elder Approval**: Required for sacred and ceremonial data
- **Community Consent**: Traditional Owner community authorization
- **Seasonal Restrictions**: Respect for ceremonial seasons and cultural protocols
- **Witness Requirements**: Multi-party verification for important cultural decisions
- **Territory Recognition**: Support for Traditional Territory boundaries and protocols

## Quick Start

### Basic Setup

```typescript
import { createAttestationSystem } from '@act-placemat/financial-intelligence/attestation';

// Initialize the system
const system = await createAttestationSystem({
  database: databaseConnection, // Your PostgreSQL connection
  encryptionKey: '64-character-hex-encryption-key-here',
  integrityKey: '64-character-hex-integrity-key-here',
  enableCulturalValidation: true
});

const { lifecycleManager, signingService, auditLogger } = system;
```

### Creating an Attestation

```typescript
import { AttestationType, SignatureAlgorithm } from '@act-placemat/financial-intelligence/attestation';

// Generate a signing key
const keyMetadata = await signingService.generateKeyPair(
  SignatureAlgorithm.ECDSA_P256,
  {
    ownerId: 'admin-user-123',
    purpose: 'signing',
    permissions: ['sign', 'verify']
  }
);

// Create an attestation
const attestationRequest = {
  type: AttestationType.CONSENT_GRANTED,
  subjectId: 'user-123',
  subjectType: 'user' as const,
  attestedBy: 'admin-user-123',
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  attestationData: {
    purposes: ['financial_analysis', 'reporting'],
    dataCategories: ['financial_transactions', 'account_balances'],
    conditions: ['data_minimisation', 'purpose_limitation'],
    restrictions: ['no_third_party_sharing']
  },
  complianceFrameworks: ['privacy_act_1988', 'austrac'],
  signerKeyId: keyMetadata.keyId
};

const result = await lifecycleManager.createAttestation(attestationRequest);

if (result.success) {
  console.log(`Attestation created: ${result.attestationId}`);
} else {
  console.error('Failed to create attestation:', result.errors);
}
```

### Cultural Data Attestation

```typescript
import { CulturalProtocol } from '@act-placemat/financial-intelligence/attestation';

// Cultural protocol for Indigenous data
const culturalProtocol: CulturalProtocol = {
  protocolId: 'wurundjeri-cultural-001',
  traditionalTerritory: 'Wurundjeri Country',
  elderId: 'elder-wurundjeri-001',
  elderName: 'Uncle William Barton',
  communityId: 'wurundjeri-community',
  protocolType: 'consent',
  requirements: ['elder_approval', 'community_consent'],
  restrictions: ['no_external_sharing', 'ceremonial_respect'],
  culturalAuthority: 'Wurundjeri Woi Wurrung Cultural Heritage Aboriginal Corporation',
  applicationDate: new Date(),
  ceremonialContext: 'Traditional knowledge sharing for community benefit'
};

const culturalAttestationRequest = {
  type: AttestationType.TRADITIONAL_OWNER_CONSENT,
  subjectId: 'cultural-data-123',
  subjectType: 'community' as const,
  attestedBy: 'elder-wurundjeri-001',
  attestationData: {
    purposes: ['cultural_preservation', 'community_benefit'],
    dataCategories: ['traditional_knowledge', 'cultural_heritage'],
    conditions: ['care_principles_compliance', 'elder_oversight'],
    restrictions: ['sacred_data_protection', 'community_access_only'],
    culturalConsiderations: ['dreamtime_stories', 'ceremonial_knowledge']
  },
  complianceFrameworks: ['care_principles', 'native_title_act', 'privacy_act_1988'],
  culturalProtocols: [culturalProtocol],
  signerKeyId: keyMetadata.keyId
};

const culturalResult = await lifecycleManager.createAttestation(culturalAttestationRequest);
```

### Verification

```typescript
// Verify an attestation
const verificationResult = await lifecycleManager.verifyAttestation(
  result.attestationId!,
  'admin-user-123',
  {
    verifyIntegrity: true,
    verifyCertificateChain: true,
    verifyTimestamp: true,
    verifyCulturalProtocols: true
  }
);

if (verificationResult.success) {
  console.log('Attestation is valid');
} else {
  console.log('Verification failed:', verificationResult.errors);
}
```

### Revocation

```typescript
import { RevocationReason } from '@act-placemat/financial-intelligence/attestation';

// Revoke an attestation
const revocationResult = await lifecycleManager.revokeAttestation({
  attestationId: result.attestationId!,
  reason: RevocationReason.CONSENT_WITHDRAWN,
  description: 'User withdrew consent for data processing',
  revokedBy: 'admin-user-123',
  cascadeRevocation: true
});
```

## Advanced Features

### Bulk Operations

```typescript
import { BulkAttestationRequest } from '@act-placemat/financial-intelligence/attestation';

const bulkRequest: BulkAttestationRequest = {
  operations: [
    {
      type: 'create',
      data: attestationRequest1
    },
    {
      type: 'create', 
      data: attestationRequest2
    },
    {
      type: 'revoke',
      attestationId: 'existing-attestation-id',
      data: revocationInfo
    }
  ],
  executedBy: 'admin-user-123',
  reason: 'Bulk consent processing',
  atomicExecution: true
};

const bulkResult = await lifecycleManager.processBulkOperations(bulkRequest);
```

### Audit Reporting

```typescript
// Generate compliance report
const report = await auditLogger.generateReport(
  {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  },
  'compliance-officer-123'
);

console.log(`Total events: ${report.summary.totalEvents}`);
console.log(`Cultural operations: ${report.culturalMetrics.totalCulturalOperations}`);
console.log(`Compliance score: ${report.complianceMetrics.map(m => m.complianceScore).join(', ')}`);

// Export audit data
const auditData = await auditLogger.exportAuditData(
  {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    culturalSensitive: true
  },
  'json'
);
```

### Query Attestations

```typescript
// Query attestations
const attestations = await system.attestationStorage.query({
  subjectType: 'user',
  status: 'active',
  culturalTerritory: 'Wurundjeri Country',
  complianceFramework: 'care_principles',
  limit: 100
});

console.log(`Found ${attestations.length} matching attestations`);
```

## Database Schema

The system requires these PostgreSQL tables:

### Attestations Table

```sql
CREATE TABLE attestations (
  id UUID PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  type VARCHAR(100) NOT NULL,
  subject_id VARCHAR(255) NOT NULL,
  subject_type VARCHAR(50) NOT NULL,
  attested_by VARCHAR(255) NOT NULL,
  attested_at TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL,
  digital_signature JSONB NOT NULL,
  attestation_data JSONB NOT NULL,
  compliance_frameworks JSONB NOT NULL,
  cultural_protocols JSONB,
  metadata JSONB NOT NULL,
  immutability_proof JSONB NOT NULL,
  revocation_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_verified TIMESTAMP WITH TIME ZONE,
  integrity_hash VARCHAR(64) NOT NULL,
  content_hash VARCHAR(64) NOT NULL
);

CREATE INDEX idx_attestations_subject ON attestations(subject_id, subject_type);
CREATE INDEX idx_attestations_status ON attestations(status);
CREATE INDEX idx_attestations_cultural ON attestations USING GIN(cultural_protocols);
CREATE INDEX idx_attestations_compliance ON attestations USING GIN(compliance_frameworks);
CREATE INDEX idx_attestations_valid_period ON attestations(valid_from, valid_until);
```

### Audit Log Table

```sql
CREATE TABLE attestation_audit_log (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  event_type VARCHAR(100) NOT NULL,
  attestation_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  operation VARCHAR(100) NOT NULL,
  operation_details JSONB NOT NULL,
  result VARCHAR(20) NOT NULL,
  error_message TEXT,
  cultural_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  compliance_frameworks JSONB NOT NULL,
  integrity_hash VARCHAR(64) NOT NULL,
  previous_entry_hash VARCHAR(64),
  retention_period BIGINT NOT NULL,
  metadata JSONB NOT NULL
);

CREATE INDEX idx_audit_timestamp ON attestation_audit_log(timestamp);
CREATE INDEX idx_audit_attestation ON attestation_audit_log(attestation_id);
CREATE INDEX idx_audit_user ON attestation_audit_log(user_id);
CREATE INDEX idx_audit_cultural ON attestation_audit_log(cultural_sensitive);
CREATE INDEX idx_audit_event_type ON attestation_audit_log(event_type);
```

## Security Features

### Cryptographic Security

- **Multiple Algorithm Support**: Choose from RSA, ECDSA, or EdDSA based on security requirements
- **Key Rotation**: Automatic key rotation with version tracking
- **Certificate Validation**: Full X.509 certificate chain validation
- **Timestamping**: RFC 3161 compliant timestamp services

### Integrity Protection

- **Hash Chains**: Immutable audit trail with cryptographic hash chains
- **Tamper Detection**: Immediate detection of any data modification
- **Merkle Proofs**: Efficient integrity verification for large datasets
- **Blockchain Anchoring**: Optional blockchain anchoring for ultimate immutability

### Access Control

```typescript
// Role-based access control
const accessControl = {
  principal: 'admin-user-123',
  principalType: 'user',
  permissions: ['read', 'verify', 'revoke'],
  conditions: [
    {
      type: 'time',
      operator: 'after',
      value: '09:00',
      description: 'Only during business hours'
    },
    {
      type: 'cultural',
      operator: 'equals',
      value: 'elder_approved',
      description: 'Requires Elder approval for cultural data'
    }
  ],
  grantedBy: 'system',
  grantedAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
};
```

## Cultural Compliance

### CARE Principles Implementation

The system implements the CARE Principles for Indigenous Data Governance:

- **Collective Benefit**: Data should benefit Indigenous communities
- **Authority to Control**: Indigenous peoples have authority over their data  
- **Responsibility**: Data use respects Indigenous rights and wellbeing
- **Ethics**: Data use aligns with Indigenous ethical frameworks

### Traditional Territory Support

```typescript
// Territory-specific protocols
const territories = [
  'Wurundjeri Country',
  'Bundjalung Country', 
  'Yolŋu Country',
  'Arrernte Country',
  'Noongar Country'
];

// Seasonal restrictions
const seasonalRestrictions = {
  'ceremony_season': {
    startDate: '09-01', // September 1
    endDate: '11-30',   // November 30
    severity: 'restricted',
    affectedOperations: ['cultural_data_access', 'traditional_knowledge_sharing']
  }
};
```

### Elder Approval Workflows

```typescript
// Elder approval process
const elderApproval = {
  elderId: 'elder-wurundjeri-001',
  elderName: 'Uncle William Barton',
  traditionalTerritory: 'Wurundjeri Country',
  approvalDate: new Date(),
  ceremonyRequired: false,
  witnessIds: ['witness-001', 'witness-002'],
  culturalContext: 'Traditional knowledge sharing for community benefit',
  validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
};
```

## Performance Optimization

### Batch Processing

```typescript
// Process multiple attestations efficiently
const batchSize = 100;
const parallelProcessing = true;

const bulkResult = await lifecycleManager.processBulkOperations({
  operations: attestationOperations,
  executedBy: 'system',
  reason: 'Scheduled batch processing',
  atomicExecution: false // Allow partial success
});
```

### Caching Strategy

- **Key Metadata Caching**: Cache frequently used key metadata
- **Compliance Rules Caching**: Cache compliance validation rules
- **Cultural Protocol Caching**: Cache cultural protocols by territory
- **Verification Results Caching**: Cache recent verification results

### Database Optimization

```sql
-- Partitioning for large datasets
CREATE TABLE attestations_2024 PARTITION OF attestations
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Optimized indexes for common queries
CREATE INDEX CONCURRENTLY idx_attestations_active_cultural 
ON attestations(status, (cultural_protocols IS NOT NULL))
WHERE status = 'active';
```

## Monitoring and Alerts

### Key Metrics

- **Attestation Creation Rate**: Monitor for unusual spikes
- **Verification Success Rate**: Track verification failures
- **Cultural Protocol Compliance**: Monitor CARE Principles adherence
- **Integrity Violations**: Alert on any tamper attempts
- **Key Rotation Status**: Track key expiration and rotation

### Alert Conditions

```typescript
const alertConditions = {
  integrityViolation: {
    severity: 'critical',
    action: 'immediate_investigation'
  },
  culturalProtocolViolation: {
    severity: 'high', 
    action: 'elder_notification'
  },
  verificationFailureSpike: {
    threshold: '10_failures_per_hour',
    severity: 'medium',
    action: 'system_review'
  }
};
```

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="DigitalSigningService"
npm test -- --testNamePattern="AttestationStorage"
npm test -- --testNamePattern="CulturalProtocols"

# Run tests with coverage
npm run test:coverage
```

### Integration Tests

```typescript
// Example integration test
describe('Attestation Lifecycle', () => {
  it('should create, verify, and revoke attestation', async () => {
    const system = await createAttestationSystem(testConfig);
    
    // Create attestation
    const createResult = await system.lifecycleManager.createAttestation(testRequest);
    expect(createResult.success).toBe(true);
    
    // Verify attestation
    const verifyResult = await system.lifecycleManager.verifyAttestation(
      createResult.attestationId!,
      'test-user'
    );
    expect(verifyResult.success).toBe(true);
    
    // Revoke attestation
    const revokeResult = await system.lifecycleManager.revokeAttestation({
      attestationId: createResult.attestationId!,
      reason: 'user_request',
      description: 'Test revocation',
      revokedBy: 'test-user'
    });
    expect(revokeResult.success).toBe(true);
  });
});
```

## Legal Compliance

This system helps achieve compliance with:

- **Privacy Act 1988 (Cth)**: Personal information protection and consent management
- **AUSTRAC AML/CTF**: Anti-money laundering transaction monitoring
- **ACNC**: Australian Charities and Not-for-profits Commission requirements
- **Corporations Act 2001**: Corporate governance and audit requirements
- **Native Title Act 1993**: Traditional Owner rights and consultation
- **CARE Principles**: Indigenous Data Governance framework

## Support

For technical support, see the main project documentation.

For questions about Indigenous data governance or cultural protocols, please consult with recognized Elders or Cultural Keepers in your community.

## License

This library is part of the ACT Placemat project and follows the same licensing terms.