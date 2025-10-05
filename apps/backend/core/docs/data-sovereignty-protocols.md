# ACT Platform - Data Sovereignty and Privacy Protocols

## Overview

The ACT Platform implements comprehensive data sovereignty controls to protect user privacy and comply with international privacy regulations including GDPR, CCPA, and Australian Privacy Principles. This document outlines our data handling protocols, encryption implementation, and compliance procedures.

## Data Sovereignty Framework

### Core Principles

1. **Data Minimisation** - Collect only necessary data for platform functionality
2. **Purpose Limitation** - Use data only for stated purposes with user consent
3. **Transparent Processing** - Clear communication about data collection and use
4. **User Control** - Comprehensive export and deletion capabilities
5. **Security by Design** - End-to-end encryption and secure transmission
6. **Cultural Sensitivity** - Special protections for Indigenous data and cultural content

### Regulatory Compliance

- **GDPR (General Data Protection Regulation)** - European Union privacy regulation
- **CCPA (California Consumer Privacy Act)** - California state privacy law
- **Australian Privacy Principles** - Federal privacy legislation
- **Indigenous Data Sovereignty** - Cultural protocols for Indigenous community data

## Encryption Implementation

### Field-Level Encryption (AES-256-GCM)

**Implementation:** `/src/services/encryption/encryptionService.js`

```javascript
// Sensitive fields automatically encrypted before database storage
const sensitiveFields = {
  users: ['email', 'phone', 'address', 'password_hash', 'api_keys'],
  user_profiles: ['bio', 'contact_info', 'personal_details'],
  stories: ['content', 'contact_details', 'location_details'],
  projects: ['internal_notes', 'financial_data', 'contact_details'],
  organisations: ['contact_details', 'financial_data', 'internal_notes']
};
```

**Key Features:**
- AES-256-GCM encryption with authenticated encryption
- Unique encryption keys per data category
- Automatic encryption on write, decryption on read
- Key rotation support for enhanced security
- Environment-based encryption (disabled in test environments)

**Key Management:**
- Keys stored in secure environment variables
- Separate keys for different data types
- Regular key rotation schedule (quarterly recommended)
- Backup key storage in encrypted key management system

### Transmission Security (HTTPS/TLS)

**Implementation:** `/src/middleware/httpsEnforcement.js`

**TLS Configuration:**
- Minimum TLS version: 1.2
- Maximum TLS version: 1.3
- Strong cipher suites only (ECDHE-RSA-AES256-GCM-SHA384, etc.)
- HTTP Strict Transport Security (HSTS) enabled
- Certificate transparency monitoring

**Security Headers:**
```javascript
// Security headers automatically applied
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
'X-Frame-Options': 'DENY'
'X-Content-Type-Options': 'nosniff'
'X-XSS-Protection': '1; mode=block'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
```

## Data Export and Deletion Procedures

### User Data Export

**Endpoint:** `GET /api/data-sovereignty/export`

**Supported Formats:**
- **JSON** - Complete structured data export
- **CSV** - Tabular data for spreadsheet analysis
- **ZIP** - Compressed archive with multiple file formats

**Export Categories:**
- Personal profile information
- User-generated content (stories, projects)
- Social connections and interactions
- System preferences and settings
- Audit logs and activity history

**Implementation Example:**
```javascript
// Export user's complete data profile
const userData = await getUserData(userId, {
  includeDeleted: true,     // Include soft-deleted records
  decryptData: true,        // Decrypt encrypted fields
  format: 'json',           // Output format
  categories: ['profile', 'content', 'social', 'preferences']
});
```

### Data Deletion (Right to be Forgotten)

**Endpoint:** `POST /api/data-sovereignty/delete-request`

**Deletion Scope:**
- **Complete Account Deletion** - All user data across all systems
- **Selective Deletion** - Specific data categories or time periods
- **Anonymisation** - Convert personal data to anonymous statistical data

**Multi-Database Cleanup:**
```javascript
// Comprehensive deletion across all data sources
await Promise.all([
  postgresDataSource.deleteUserData(userId, categories),
  redisDataSource.clearUserSessions(userId),
  neo4jDataSource.removeUserConnections(userId)
]);
```

**Legal Basis for Data Retention:**
- Financial records: 7 years (Australian tax law)
- Audit logs: 5 years (compliance requirements)
- Anonymous analytics: Indefinite (no personal data)

## Privacy Compliance Procedures

### Data Processing Lawful Basis

1. **Consent** - Explicit user consent for marketing and optional features
2. **Contract** - Processing necessary for platform service delivery
3. **Legal Obligation** - Compliance with Australian and international law
4. **Vital Interests** - Emergency situations requiring data processing
5. **Public Interest** - Community benefit projects and social impact initiatives
6. **Legitimate Interest** - Platform security and fraud prevention

### Consent Management

**Implementation:**
- Granular consent options for different data processing activities
- Clear opt-in/opt-out mechanisms
- Consent withdrawal capabilities
- Age verification for users under 18
- Parental consent for users under 16

**Consent Categories:**
- Essential platform functionality (required)
- Email communications and newsletters (optional)
- Data analysis for service improvement (optional)
- Third-party integrations and sharing (optional)
- Marketing and promotional content (optional)

### Data Retention Schedule

| Data Category | Retention Period | Legal Basis |
|---------------|------------------|-------------|
| Account profiles | Active account + 2 years | Contract/Consent |
| User-generated content | Active account + 5 years | Contract/Consent |
| Financial transactions | 7 years | Legal obligation |
| Audit and security logs | 5 years | Legal obligation |
| Marketing communications | Until consent withdrawn | Consent |
| Analytics (anonymised) | Indefinite | Legitimate interest |

## Cultural Safety and Indigenous Data

### Indigenous Data Sovereignty Principles

1. **Control** - Indigenous communities control data about them
2. **Access** - Indigenous communities have access to their data
3. **Responsibility** - Data stewardship responsibilities to communities
4. **Ethics** - Ethical data use respecting cultural protocols

### Cultural Safety Protocols

**Implementation:**
- Cultural safety scoring for all content (0-100 scale)
- Community consent validation for sensitive cultural content
- Sacred knowledge protection with restricted access
- Elders' committee review for culturally significant data

**Automated Protections:**
```javascript
// Cultural safety validation in data processing
const culturalSafetyCheck = await validateCulturalSafety(content, {
  communityConsent: true,
  elderReview: false,
  sacredKnowledge: false,
  culturalProtocols: ['NSW', 'Traditional Owner']
});
```

## Audit and Compliance Monitoring

### Audit Trail Requirements

**All data operations logged:**
- User data access and modifications
- Export and deletion requests
- Privacy setting changes
- Data sharing and third-party access
- Security events and breaches

**Audit Log Structure:**
```javascript
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userId": "user_123",
  "action": "data_export",
  "category": "privacy_request",
  "details": {
    "format": "json",
    "categories": ["profile", "content"],
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "legalBasis": "consent"
  },
  "complianceFlags": {
    "gdpr": true,
    "ccpa": true,
    "australianPrivacy": true
  }
}
```

### Compliance Reporting

**Monthly Reports:**
- Data breach incidents and response
- Privacy request processing times
- Consent management statistics
- Cultural safety review outcomes
- Third-party data sharing summary

**Annual Reports:**
- Privacy impact assessments
- Data retention policy compliance
- Security audit outcomes
- Cultural consultation results
- Regulatory compliance status

## Security Incident Response

### Data Breach Response Plan

1. **Detection and Assessment** (0-1 hours)
   - Identify scope and severity of breach
   - Contain the incident to prevent further exposure
   - Document all actions taken

2. **Notification Requirements** (1-72 hours)
   - Notify relevant supervisory authorities (OAIC, ICO, etc.)
   - Inform affected users if high risk to rights and freedoms
   - Report to executive leadership and board

3. **Remediation** (Ongoing)
   - Fix security vulnerabilities
   - Strengthen affected systems
   - Provide support to affected users
   - Monitor for ongoing threats

### Emergency Data Protection

**Automatic Protections:**
- Immediate system isolation for suspected breaches
- Emergency encryption key rotation
- Automated user notification systems
- Real-time security monitoring and alerts

## Third-Party Data Sharing

### Data Sharing Principles

1. **Necessity** - Sharing only when required for service delivery
2. **Minimisation** - Share minimum data necessary for purpose
3. **Consent** - User consent for all non-essential sharing
4. **Security** - Equivalent security standards required of partners
5. **Contracts** - Formal data processing agreements

### Approved Data Sharing Partners

| Partner | Data Shared | Purpose | Legal Basis | Security Standard |
|---------|-------------|---------|-------------|-------------------|
| Supabase | Encrypted user data | Database hosting | Contract | ISO 27001 |
| OpenAI | Anonymous content | AI processing | Legitimate interest | SOC 2 Type II |
| Cloudflare | Traffic data | CDN and security | Contract | ISO 27001 |
| Stripe | Payment data | Payment processing | Contract | PCI DSS Level 1 |

## Privacy by Design Implementation

### Technical Safeguards

1. **Data Minimisation** - Collect only necessary data fields
2. **Purpose Limitation** - Use data only for stated purposes
3. **Storage Limitation** - Automatic data deletion after retention period
4. **Accuracy** - User controls to update and correct data
5. **Security** - End-to-end encryption and secure transmission
6. **Accountability** - Comprehensive audit trails and monitoring

### Organisational Safeguards

1. **Privacy Impact Assessments** - Required for new features
2. **Staff Training** - Regular privacy and security training
3. **Access Controls** - Role-based data access limitations
4. **Regular Audits** - Internal and external privacy audits
5. **Incident Response** - Documented breach response procedures
6. **Vendor Management** - Privacy requirements for all suppliers

## User Rights and Controls

### Individual Rights Under GDPR/CCPA

1. **Right to Information** - Clear privacy notices and data use
2. **Right of Access** - View all personal data held
3. **Right to Rectification** - Correct inaccurate data
4. **Right to Erasure** - Delete personal data ("right to be forgotten")
5. **Right to Restrict Processing** - Limit how data is used
6. **Right to Data Portability** - Export data in machine-readable format
7. **Right to Object** - Opt out of certain data processing
8. **Right to Automated Decision-Making** - Human review of AI decisions

### User Privacy Dashboard

**Implementation:** User-facing privacy controls allowing:
- View all collected personal data
- Download complete data archive
- Delete account and all associated data
- Manage consent preferences for different processing activities
- View data sharing and third-party access history
- Request human review of automated decisions

## Contact and Governance

### Privacy Officer Contact

**Data Protection Officer:** privacy@act.place
**Phone:** +61 2 XXXX XXXX
**Address:** ACT Platform Privacy Office, Sydney NSW Australia

### Supervisory Authorities

- **Australia:** Office of the Australian Information Commissioner (OAIC)
- **European Union:** Local Data Protection Authority
- **California:** California Attorney General's Office

### Policy Updates

This document is reviewed quarterly and updated as needed to reflect:
- Changes in privacy legislation
- New platform features and data processing
- Security improvements and technical updates
- User feedback and privacy concerns
- Cultural consultation outcomes

**Last Updated:** January 2024
**Next Review:** April 2024
**Version:** 1.0

---

*This document serves as the comprehensive guide for data sovereignty and privacy compliance within the ACT Platform. All staff, contractors, and partners must familiarise themselves with these protocols and ensure compliance in their respective roles.*