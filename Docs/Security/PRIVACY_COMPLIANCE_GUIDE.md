# Privacy Compliance Guide

## Overview

The ACT Platform implements comprehensive privacy-by-design protocols to ensure compliance with Australian Privacy Act 1988, GDPR, and other international privacy regulations. This document outlines our privacy measures, data handling practices, and security implementations.

## Privacy-by-Design Principles

### 1. Data Minimisation
- **Automatic Classification**: All data fields are automatically classified based on privacy levels
- **Purpose-Based Processing**: Data is only processed for specific, declared purposes
- **Role-Based Access**: Data access is restricted based on user roles and consent levels
- **Response Filtering**: API responses are automatically filtered to exclude unnecessary data

### 2. Purpose Limitation
Data processing is limited to these defined purposes:
- `authentication` - User login and identity verification
- `service_provision` - Core platform functionality
- `analytics` - Usage statistics (anonymised)
- `communication` - User notifications and messages
- `legal_compliance` - Regulatory requirements
- `marketing` - With explicit consent only
- `security` - Platform security and fraud prevention

### 3. Storage Limitation
- **Automated Retention**: Data retention policies are automatically applied
- **Lifecycle Management**: Data is automatically deleted after retention period expires
- **Access-Based Retention**: Retention periods reset based on last access date

### 4. Consent Management
- **Granular Consent**: Users can grant consent for specific processing purposes
- **Consent Levels**:
  - `minimal`: Basic authentication and service provision only
  - `basic`: Includes security and legal compliance
  - `full`: All processing purposes allowed
- **Consent Withdrawal**: Users can withdraw consent at any time

## Data Classification System

### Privacy Levels

#### PUBLIC
- Publicly available information
- No encryption required
- Minimal audit logging
- Long retention periods (3+ years)

#### INTERNAL
- Internal use only
- Standard security measures
- Basic audit logging
- Standard retention (3 years)

#### PERSONAL
- Personally identifiable information (PII)
- Enhanced audit logging
- Standard retention (3 years)
- Examples: names, email addresses, phone numbers

#### SENSITIVE
- Sensitive personal information
- **Mandatory encryption** (AES-256-GCM)
- **Full audit logging**
- **Shorter retention** (1 year)
- Examples: financial data, medical information, government IDs

#### RESTRICTED
- Highly restricted access
- **Mandatory encryption** (AES-256-GCM)
- **Complete audit trail**
- **Minimal retention** (30 days)
- Examples: passwords, authentication tokens, biometric data

### Automatic Classification

The system automatically classifies data based on:
- **Field Name Patterns**: Regex patterns matching sensitive field names
- **Value Patterns**: Content analysis (email formats, phone numbers, etc.)
- **Context Analysis**: Processing purpose and user role context

```javascript
// Example automatic classification
const classification = classifyDataPrivacy('creditCardNumber', '4111-1111-1111-1111');
// Returns: { level: 'SENSITIVE', requiresEncryption: true, retentionDays: 90 }
```

## Encryption Implementation

### AES-256-GCM Encryption
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Length**: 256 bits
- **Authentication**: Built-in authenticated encryption
- **Implementation**: Node.js native crypto module

### Key Management
- **Development**: Deterministic keys derived from JWT secret
- **Production**: Hardware Security Module (HSM) or secure key vault
- **Rotation**: Automatic key rotation with backward compatibility
- **Isolation**: Separate keys for different data classifications

### Encryption Process
1. **Automatic Detection**: Sensitive fields automatically identified
2. **Key Derivation**: Classification-specific encryption keys generated
3. **Encryption**: AES-256-GCM encryption with random IV
4. **Storage**: Encrypted data stored with metadata flags
5. **Decryption**: Automatic decryption for authorised access

## Certificate Pinning (Mobile Security)

### Implementation
- **Library**: react-native-ssl-pinning
- **Method**: SHA-256 certificate/public key pinning
- **Environments**: Production and staging (development bypassed)
- **Fallback**: Graceful degradation with security warnings

### Security Benefits
- **Man-in-the-Middle Protection**: Prevents certificate substitution attacks
- **Enhanced Trust**: Validates specific certificates/keys, not just CA trust
- **Network Security**: Protects API communication from interception

### Configuration
```typescript
const API_CONFIGS = {
  production: {
    baseUrl: 'https://api.act.place',
    certificateHash: 'sha256/[ACTUAL_CERTIFICATE_HASH]',
    publicKeyHash: 'sha256/[ACTUAL_PUBLIC_KEY_HASH]',
  }
};
```

## API Security Middleware

### Input Validation
- **Automatic Sanitisation**: All inputs sanitised for XSS and injection attacks
- **Schema Validation**: Request data validated against expected schemas
- **Size Limits**: Request size limits to prevent DoS attacks
- **Rate Limiting**: Per-user and per-IP request rate limiting

### Security Headers
- **Content Security Policy (CSP)**: Prevents code injection
- **X-Frame-Options**: Prevents clickjacking
- **Strict-Transport-Security**: Enforces HTTPS
- **X-Content-Type-Options**: Prevents MIME sniffing

### Database Security
- **Query Validation**: All database queries validated for injection attacks
- **Parameter Sanitisation**: Query parameters automatically sanitised
- **Access Control**: Role-based database access controls

## Audit and Compliance

### Privacy Audit Logging
Every data access is logged with:
- **Timestamp**: When the access occurred
- **User ID**: Who accessed the data
- **Data Type**: What type of data was accessed
- **Purpose**: Why the data was accessed
- **Legal Basis**: Legal justification for processing
- **Consent ID**: Reference to user consent record

### Compliance Monitoring
- **Automated Compliance Checks**: Regular scans for compliance violations
- **Data Breach Detection**: Automatic detection of unusual access patterns
- **Retention Compliance**: Automated deletion of expired data
- **Consent Compliance**: Monitoring of consent withdrawal and data deletion

## User Rights Implementation

### Right to Access (Data Portability)
```bash
GET /api/privacy/my-data
# Returns complete user data in portable format
```

### Right to Rectification
```bash
PUT /api/privacy/update-data
# Allows users to correct their personal data
```

### Right to Erasure (Right to be Forgotten)
```bash
DELETE /api/privacy/delete-account
# Permanently removes all user data across all systems
```

### Right to Data Portability
```bash
GET /api/privacy/export-data?format=json
# Exports user data in machine-readable format
```

### Right to Restrict Processing
```bash
POST /api/privacy/restrict-processing
# Limits data processing to storage only
```

### Right to Object
```bash
POST /api/privacy/withdraw-consent
# Withdraws consent for specific processing purposes
```

## Implementation Architecture

### Middleware Stack
1. **Security Headers**: Basic security headers applied
2. **Rate Limiting**: Request rate limiting per user/IP
3. **Input Validation**: Request validation and sanitisation
4. **Privacy Compliance**: Privacy-by-design data handling
5. **Database Security**: Query validation and sanitisation

### Service Integration
- **Privacy Service**: Core privacy-by-design implementation
- **Encryption Service**: AES-256-GCM encryption/decryption
- **Security Guardrails**: Comprehensive input/query validation
- **Audit Service**: Privacy and security event logging

### Database Design
- **Privacy Metadata**: Each table includes privacy classification columns
- **Consent Records**: Detailed consent tracking for each user
- **Audit Tables**: Comprehensive audit trails for all data access
- **Retention Policies**: Automatic data lifecycle management

## Mobile App Privacy

### Data Collection Transparency
- **Privacy Policy**: Clear explanation of data collection practices
- **Consent Flows**: Granular consent collection during app usage
- **Data Usage Indicators**: Real-time indicators when sensitive data is accessed

### Local Data Protection
- **Encrypted Storage**: Local data encrypted using device keychain
- **Session Management**: Secure token storage and automatic expiry
- **Biometric Authentication**: Optional biometric app unlock

## Compliance Certifications

### Current Compliance
- ✅ **Australian Privacy Act 1988**: Full compliance implemented
- ✅ **GDPR (European Union)**: All requirements satisfied
- ✅ **CCPA (California)**: Consumer rights implemented
- ✅ **Data Minimisation**: Automated implementation
- ✅ **Consent Management**: Granular consent system
- ✅ **Retention Policies**: Automated lifecycle management

### Security Standards
- ✅ **AES-256-GCM Encryption**: Industry-standard encryption
- ✅ **Certificate Pinning**: Mobile app security enhancement
- ✅ **Input Validation**: Comprehensive sanitisation
- ✅ **Audit Logging**: Complete access trail
- ✅ **Role-Based Access**: Principle of least privilege

## Developer Guidelines

### Adding New Data Fields
1. **Review Classification**: Consider privacy level of new data
2. **Update Patterns**: Add field patterns to classification system if needed
3. **Test Privacy**: Verify automatic classification works correctly
4. **Document Purpose**: Clearly document processing purpose

### API Development
1. **Use Privacy Middleware**: Apply privacy compliance middleware to all routes
2. **Validate Consent**: Check user consent for data processing purpose
3. **Minimize Response**: Only return data necessary for the request
4. **Log Access**: Ensure data access is logged for audit

### Database Changes
1. **Privacy Impact Assessment**: Evaluate privacy impact of schema changes
2. **Retention Policies**: Define appropriate retention periods
3. **Migration Planning**: Plan privacy-compliant data migrations
4. **Testing**: Test privacy controls with new schema

## Emergency Procedures

### Data Breach Response
1. **Immediate Containment**: Isolate affected systems
2. **Impact Assessment**: Determine scope of data exposure
3. **Notification**: Notify authorities and affected users within 72 hours
4. **Remediation**: Implement fixes and enhance security measures

### Privacy Violation Response
1. **Investigation**: Determine cause and scope of violation
2. **Corrective Action**: Implement immediate corrective measures
3. **Process Improvement**: Update procedures to prevent recurrence
4. **Documentation**: Record incident and response measures

## Contact Information

### Privacy Officer
- **Email**: privacy@act.place
- **Role**: Data Protection and Privacy Compliance

### Security Team
- **Email**: security@act.place
- **Role**: Security incidents and vulnerability reports

### Legal Team
- **Email**: legal@act.place
- **Role**: Privacy rights requests and legal compliance

---

*This document is updated regularly to reflect current privacy practices and regulatory requirements. Last updated: [Current Date]*