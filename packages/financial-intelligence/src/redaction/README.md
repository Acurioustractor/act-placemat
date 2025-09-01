# Redaction and Transformation Library

A comprehensive library for redacting and transforming sensitive financial data with support for reversible operations, Australian compliance frameworks, and Indigenous data sovereignty.

## Features

### Core Capabilities

- 🔒 **Reversible Redaction**: Encrypt and transform data with secure reversal mechanisms
- 🪃 **Indigenous Data Sovereignty**: CARE Principles compliance with Traditional Owner consent
- 🇦🇺 **Australian Compliance**: Privacy Act 1988, AUSTRAC, ACNC, and Corporations Act support
- 📊 **Data Classification**: Automatic classification of financial and cultural data types
- 🔐 **Cryptographic Security**: Strong encryption with tamper-evident audit trails
- ⚡ **Batch Processing**: Efficient parallel processing for large datasets
- 📋 **Comprehensive Auditing**: Immutable audit logs with 50-year retention for cultural data

### Supported Data Types

- **Financial**: Credit cards, bank accounts, ABN, TFN, transaction amounts
- **Personal**: Names, addresses, phone numbers, email addresses
- **Cultural**: Indigenous place names, ceremonies, Traditional Owner data
- **Organizational**: Company names, ACN, financial reports

### Redaction Types

- **MASK**: Partial masking with configurable show/hide patterns
- **HASH**: One-way cryptographic hashing with salt
- **ENCRYPT**: Reversible encryption with strong algorithms
- **REMOVE**: Complete removal with replacement text
- **TOKENIZE**: Token-based replacement with lookup tables
- **CULTURAL_PROTECT**: Special protection for Indigenous data

### Transformation Types

- **REVERSIBLE_ENCRYPT**: Fully reversible encryption operations
- **FORMAT_PRESERVE_ENCRYPT**: Encryption while maintaining data format
- **DETERMINISTIC_HASH**: Consistent hashing for analytics
- **ANONYMIZE**: Remove identifying information
- **PSEUDONYMIZE**: Replace with consistent pseudonyms
- **AGGREGATE**: Bucket numerical data for privacy
- **STATISTICAL_NOISE**: Add controlled noise to numerical data
- **CULTURAL_ABSTRACTION**: Abstract cultural data with Elder approval

## Quick Start

### Basic Setup

```typescript
import { createRedactionSystem } from '@act-placemat/financial-intelligence/redaction';

// Initialize the redaction system
const system = createRedactionSystem({
  encryptionKey: '64-character-hex-key-for-encryption-operations-here',
  integrityKey: '64-character-hex-key-for-audit-integrity-validation'
});

const { redactionEngine, classifier, culturalHandler } = system;
```

### Simple Redaction

```typescript
import { RedactionType, DataSensitivityLevel } from '@act-placemat/financial-intelligence/redaction';

// Create a redaction rule
const rule = {
  id: 'credit-card-redaction',
  name: 'Credit Card Masking',
  description: 'Mask credit card numbers',
  fieldPattern: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  dataType: ['credit_card'],
  sensitivityLevels: [DataSensitivityLevel.RESTRICTED],
  redactionType: RedactionType.MASK,
  parameters: {
    maskChar: '*',
    showFirst: 4,
    showLast: 4
  },
  reversible: false,
  culturalSensitive: false,
  complianceFrameworks: ['privacy_act_1988'],
  retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  auditRequired: true,
  createdAt: new Date(),
  lastModified: new Date(),
  version: '1.0'
};

// Redact sensitive data
const context = {
  userId: 'user-123',
  sessionId: 'session-456',
  requestId: 'req-789',
  purpose: ['financial_processing'],
  consentLevel: 'explicit',
  sovereigntyLevel: 'individual',
  complianceContext: {
    frameworks: ['privacy_act_1988'],
    auditRequired: true,
    retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000
  },
  timestamp: new Date()
};

const result = await redactionEngine.redact(
  '4532 1234 5678 9012',
  [rule],
  context
);

console.log(result.redactedValue); // "4532 **** **** 9012"
```

### Cultural Data Protection

```typescript
// Classify data for cultural sensitivity
const classification = classifier.classify('Uluru ceremony traditional knowledge');

if (classification.culturalSensitive) {
  // Check if Elder approval is required
  const requiresApproval = culturalHandler.requiresElderApproval(
    'Uluru ceremony traditional knowledge',
    'Wurundjeri Country'
  );

  if (requiresApproval) {
    // Cultural redaction rule
    const culturalRule = {
      id: 'cultural-protection',
      name: 'Indigenous Cultural Data Protection',
      description: 'Protect Indigenous cultural knowledge',
      fieldPattern: '*',
      dataType: ['cultural_identifier'],
      sensitivityLevels: [DataSensitivityLevel.SACRED],
      redactionType: RedactionType.CULTURAL_PROTECT,
      parameters: {
        territory: 'Wurundjeri Country'
      },
      reversible: true,
      culturalSensitive: true,
      complianceFrameworks: ['care_principles', 'privacy_act_1988'],
      retentionPeriod: 50 * 365 * 24 * 60 * 60 * 1000, // 50 years
      auditRequired: true,
      createdAt: new Date(),
      lastModified: new Date(),
      version: '1.0'
    };

    const culturalContext = {
      ...context,
      culturalContext: {
        traditionalTerritory: 'Wurundjeri Country',
        elderApproval: true
      }
    };

    const result = await redactionEngine.redact(
      'Uluru ceremony traditional knowledge',
      [culturalRule],
      culturalContext
    );
  }
}
```

### Batch Processing

```typescript
import { BatchRedactionProcessor } from '@act-placemat/financial-intelligence/redaction';

const batchRequest = {
  items: [
    {
      id: 'item-1',
      value: '4532 1234 5678 9012',
      fieldPath: 'payment.creditCard',
      dataType: 'credit_card'
    },
    {
      id: 'item-2', 
      value: 'john.doe@example.com',
      fieldPath: 'user.email',
      dataType: 'email'
    },
    {
      id: 'item-3',
      value: 'Sacred ceremony knowledge',
      fieldPath: 'cultural.knowledge',
      dataType: 'cultural_identifier'
    }
  ],
  context: {
    userId: 'batch-user',
    sessionId: 'batch-session',
    requestId: 'batch-request',
    purpose: ['data_protection', 'compliance'],
    consentLevel: 'explicit',
    sovereigntyLevel: 'traditional_owner',
    culturalContext: {
      traditionalTerritory: 'Wurundjeri Country',
      elderApproval: true
    },
    complianceContext: {
      frameworks: ['privacy_act_1988', 'care_principles'],
      auditRequired: true,
      retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000
    },
    timestamp: new Date()
  },
  options: {
    parallel: true,
    batchSize: 100,
    failFast: false
  }
};

const batchResult = await system.batchProcessor.processBatch(batchRequest);

console.log(`Processed ${batchResult.summary.total} items`);
console.log(`Success rate: ${batchResult.summary.successful / batchResult.summary.total * 100}%`);
console.log(`Cultural data processed: ${batchResult.summary.culturalDataProcessed}`);
```

### Reversible Operations

```typescript
import { TransformationType } from '@act-placemat/financial-intelligence/redaction';

// Transform data with reversible encryption
const transformRule = {
  id: 'reversible-financial-data',
  name: 'Reversible Financial Data Transform',
  description: 'Encrypt financial data with reversal capability',
  fieldPattern: '*',
  dataType: ['dollar_amount'],
  transformationType: TransformationType.REVERSIBLE_ENCRYPT,
  parameters: {},
  reversible: true,
  culturalProtections: [],
  complianceValidation: [{
    framework: 'privacy_act_1988',
    requirements: ['explicit_consent'],
    validationRules: ['audit_trail_required'],
    auditFrequency: 90
  }],
  performanceHint: {
    cacheableDuration: 3600,
    computeIntensity: 'medium',
    memoryRequirement: 1024,
    batchingRecommended: true,
    parallelizable: true
  },
  createdAt: new Date(),
  lastModified: new Date(),
  version: '1.0'
};

// Transform the data
const transformResult = await redactionEngine.transform(
  '$150,000.00',
  [transformRule],
  context
);

console.log('Transformed:', transformResult.transformedValue);
console.log('Transformation ID:', transformResult.transformationId);

// Later, reverse the transformation
const reversalRequest = {
  transformationId: transformResult.transformationId,
  userId: 'admin-user',
  justification: 'Audit investigation requires original data',
  auditContext: {
    requestId: 'reversal-req-123',
    sessionId: 'reversal-session-456',
    ipAddress: '192.168.1.1',
    userAgent: 'Admin Dashboard v1.0'
  }
};

const reversalResult = await redactionEngine.reverse(
  transformResult.transformationId,
  reversalRequest
);

console.log('Original value:', reversalResult.originalValue); // "$150,000.00"
```

## Data Classification

The library automatically classifies data types and sensitivity levels:

```typescript
import { DataTypeClassifier } from '@act-placemat/financial-intelligence/redaction';

const classifier = new DataTypeClassifier();

// Classify various data types
const examples = [
  '4532 1234 5678 9012',  // Credit card
  '12 345 678 901',       // ABN
  '123 456 789',          // TFN  
  'Sacred ceremony site', // Cultural data
  'john.doe@example.com', // Email
  '$50,000.00'            // Currency amount
];

examples.forEach(value => {
  const classification = classifier.classify(value);
  console.log(`"${value}" -> ${classification.dataType} (${classification.sensitivityLevel})`);
  console.log(`Cultural sensitive: ${classification.culturalSensitive}`);
  console.log(`Confidence: ${classification.confidence}`);
  console.log('---');
});
```

## Australian Compliance

### Privacy Act 1988

```typescript
import { ComplianceValidator } from '@act-placemat/financial-intelligence/redaction';

const validator = new ComplianceValidator();

// Validate Privacy Act compliance
const validation = validator.validatePrivacyAct(
  'data_collection',
  'sensitive personal information',
  {
    ...context,
    consentLevel: 'explicit',
    purpose: ['service_provision', 'legal_compliance']
  }
);

if (!validation.valid) {
  console.log('Privacy Act violations:', validation.errors);
}
```

### AUSTRAC Compliance

```typescript
// Validate AUSTRAC requirements for financial data
const austracValidation = validator.validateAUSTRAC(
  'transaction_monitoring',
  '$15,000 international transfer',
  {
    ...context,
    purpose: ['aml_compliance', 'threshold_transaction_monitoring']
  }
);

if (!austracValidation.valid) {
  console.log('AUSTRAC violations:', austracValidation.errors);
}
```

### CARE Principles

```typescript
// Apply CARE Principles for Indigenous data
const careCompliance = await culturalHandler.applyCAREPrinciples(
  'cultural_research',
  'Traditional ceremony knowledge',
  {
    ...context,
    culturalContext: {
      traditionalTerritory: 'Wurundjeri Country',
      elderApproval: true
    },
    purpose: ['community_benefit', 'cultural_preservation']
  }
);

console.log('CARE Principles compliant:', careCompliance);
```

## Audit Trail

### Querying Audit Logs

```typescript
import { AuditCriteria } from '@act-placemat/financial-intelligence/redaction';

const auditCriteria = {
  culturalSensitive: true,
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  },
  complianceFramework: 'care_principles',
  limit: 100
};

const auditEntries = await system.auditLogger.queryAuditTrail(auditCriteria);

console.log(`Found ${auditEntries.length} cultural data operations`);
```

### Exporting Audit Data

```typescript
const exportRequest = {
  format: 'pdf' as const,
  filters: {
    culturalSensitive: true,
    timeRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-12-31')
    }
  },
  includeCulturalData: true,
  includePersonalData: false,
  adminUserId: 'admin-123',
  encryptionRequired: true
};

const exportResult = await system.auditLogger.exportAuditData(exportRequest);

if (exportResult.success) {
  console.log(`Export created: ${exportResult.exportId}`);
  console.log(`Total entries: ${exportResult.metadata.totalEntries}`);
  console.log(`Cultural entries: ${exportResult.metadata.culturalEntries}`);
}
```

## Security Features

### Tamper-Evident Logging

All audit entries include cryptographic integrity hashes:

```typescript
// Validate audit trail integrity
const integrityResult = await system.auditLogger.validateIntegrity(auditEntries);

if (!integrityResult.valid) {
  console.log(`Integrity violations found:`);
  console.log(`Tampered entries: ${integrityResult.tamperedEntries.length}`);
  console.log(`Missing entries: ${integrityResult.missingEntries.length}`);
  
  integrityResult.issues.forEach(issue => {
    console.log(`${issue.type}: ${issue.description}`);
  });
}
```

### Cultural Data Notifications

```typescript
// Notify Traditional Owner community of data operations
await culturalHandler.notifyCommunity(
  'cultural_transform',
  'ceremonial_knowledge',
  'Wurundjeri Country'
);
```

## Configuration

### Environment Variables

```bash
# Required encryption keys (64 hex characters each)
REDACTION_ENCRYPTION_KEY=64-char-hex-key-for-data-encryption-operations
REDACTION_INTEGRITY_KEY=64-char-hex-key-for-audit-trail-integrity

# Optional: External audit storage
AUDIT_STORAGE_URL=postgresql://user:pass@localhost/audit_db
AUDIT_RETENTION_YEARS=50

# Cultural data settings
CULTURAL_NOTIFICATION_ENABLED=true
ELDER_APPROVAL_TIMEOUT_DAYS=30
```

### Custom Storage

```typescript
import { AuditStorage } from '@act-placemat/financial-intelligence/redaction';

class PostgreSQLAuditStorage implements AuditStorage {
  async store(entry) {
    // Implement PostgreSQL storage
  }
  
  async query(criteria) {
    // Implement PostgreSQL queries
  }
  
  // ... other methods
}

const system = createRedactionSystem({
  encryptionKey: process.env.REDACTION_ENCRYPTION_KEY!,
  integrityKey: process.env.REDACTION_INTEGRITY_KEY!,
  auditStorage: new PostgreSQLAuditStorage()
});
```

## Testing

The library includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="RedactionEngine"
npm test -- --testNamePattern="CulturalDataHandler"
npm test -- --testNamePattern="ComplianceValidator"

# Test cultural protocol compliance
npm run test:cultural

# Test Australian compliance frameworks
npm run test:compliance

# Performance benchmarks
npm run test:performance
```

## Cultural Sensitivity Guidelines

When working with Indigenous data:

1. **Always Check Territory**: Identify the Traditional Territory for any cultural data
2. **Verify Elder Approval**: Ensure Elder or Cultural Keeper approval for sacred data
3. **Apply CARE Principles**: Validate Collective benefit, Authority, Responsibility, Ethics
4. **Use Extended Retention**: 50-year retention period for cultural data
5. **Community Notifications**: Notify Traditional Owner communities of data operations
6. **Respect Seasonal Restrictions**: Check for ceremonial seasons and restrictions

## Performance Considerations

- **Batch Processing**: Use `BatchRedactionProcessor` for large datasets
- **Parallel Operations**: Enable parallel processing for improved throughput
- **Memory Management**: Monitor memory usage with large cultural datasets
- **Caching**: Leverage performance hints for rule caching
- **Storage Optimization**: Consider external audit storage for high-volume operations

## Legal Compliance

This library helps achieve compliance with:

- **Privacy Act 1988 (Cth)**: Personal information protection and consent management
- **AUSTRAC AML/CTF**: Anti-money laundering and counter-terrorism financing
- **ACNC**: Australian Charities and Not-for-profits Commission requirements
- **Corporations Act 2001**: Corporate data governance and reporting
- **CARE Principles**: Indigenous Data Governance framework

## Support

For technical support, see the main project documentation.

For questions about Indigenous data governance or cultural protocols, please consult with recognized Elders or Cultural Keepers in your community.

## License

This library is part of the ACT Placemat project and follows the same licensing terms.