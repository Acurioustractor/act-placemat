# ACT Platform - Encryption & Compliance Testing and Deployment Guide

This comprehensive guide covers testing, deployment, and ongoing maintenance of the ACT Platform's encryption and compliance systems.

## Quick Start Testing

### 1. Initial Setup
```bash
# Navigate to backend directory
cd apps/backend

# Run the development setup script
./scripts/setup-compliance-dev.sh

# Configure your environment
cp .env.development .env
# Edit .env with your actual Supabase credentials
```

### 2. Interactive Testing
```bash
# Start the interactive test runner
npm run compliance:test-runner

# Or run directly
node scripts/test-compliance-system.js
```

### 3. Automated Tests
```bash
# Run the complete test suite
npm run test:compliance

# Run tests in watch mode during development
npm run test:compliance:watch
```

## Testing Capabilities

### 🔐 Encryption Testing
- **Field-level encryption/decryption** - Tests AES-256-GCM encryption of sensitive data
- **Complex data structures** - Validates encryption of nested objects and arrays
- **Performance testing** - Measures encryption operation timing
- **Error handling** - Tests graceful failure modes

### 📊 Compliance Monitoring
- **Audit logging** - Verifies comprehensive event logging
- **Privacy requests** - Tests GDPR/CCPA data export and deletion
- **Compliance reporting** - Automated report generation and analysis
- **Real-time alerts** - Tests violation detection and alerting

### 🌏 Cultural Safety
- **Indigenous data sovereignty** - Tests cultural safety protocols
- **Community consent** - Validates consent tracking and management
- **Elder review processes** - Tests cultural approval workflows

### 📈 Admin Dashboard
Access the compliance dashboard at: `http://localhost:4000/api/compliance-dashboard/dashboard?admin_key=your-admin-key`

## Testing Workflows

### Development Testing
```bash
# 1. Setup development environment
./scripts/setup-compliance-dev.sh

# 2. Start the secure development server
npm run dev:secure

# 3. In another terminal, run tests
npm run compliance:test-runner

# 4. Select test options:
#    1. Test field-level encryption
#    2. Test audit logging
#    3. Test compliance monitoring
#    9. Run full integration test
```

### CI/CD Testing
```yaml
# .github/workflows/compliance-test.yml
name: Compliance Tests
on: [push, pull_request]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd apps/backend
          npm ci
      
      - name: Run compliance tests
        run: |
          cd apps/backend
          npm run test:compliance
        env:
          NODE_ENV: test
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ENCRYPTION_KEY_users_data: ${{ secrets.ENCRYPTION_KEY_users_data }}
```

### Production Testing
```bash
# Pre-deployment validation
npm run compliance:health-check

# Test with production-like configuration
NODE_ENV=production npm run test:compliance

# Validate HTTPS/TLS configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

## Deployment Checklist

### Pre-Deployment Security Requirements

#### ✅ Encryption Configuration
- [ ] Generate strong encryption keys (32-byte random keys)
- [ ] Store keys securely (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Configure key rotation schedule (quarterly recommended)
- [ ] Test encryption/decryption in staging environment
- [ ] Verify sensitive field coverage in all tables

#### ✅ HTTPS/TLS Configuration  
- [ ] Obtain valid SSL/TLS certificates (Let's Encrypt or commercial CA)
- [ ] Configure TLS 1.2+ minimum version
- [ ] Test cipher strength (A+ rating on SSL Labs)
- [ ] Configure HSTS headers with preload
- [ ] Set up certificate monitoring and renewal

#### ✅ Database Security
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Configure audit log tables and indexes
- [ ] Set up database backups with encryption at rest
- [ ] Test database connectivity and permissions
- [ ] Configure connection pooling and rate limiting

#### ✅ Compliance Monitoring
- [ ] Configure audit logger with proper database access
- [ ] Set up scheduled compliance monitoring tasks
- [ ] Configure alert destinations (email, Slack, PagerDuty)
- [ ] Test compliance report generation
- [ ] Set up log rotation and cleanup policies

#### ✅ Environment Configuration
```bash
# Production environment variables checklist
NODE_ENV=production

# Database (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secure-service-key

# Encryption keys (Required - Generate with openssl rand -base64 32)
ENCRYPTION_KEY_users_data=your-base64-encoded-key
ENCRYPTION_KEY_stories_data=your-base64-encoded-key  
ENCRYPTION_KEY_projects_data=your-base64-encoded-key
ENCRYPTION_KEY_organisations_data=your-base64-encoded-key

# Security (Required)
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
VALID_API_KEYS=your-secure-api-keys
ADMIN_API_KEY=your-admin-dashboard-key

# TLS/HTTPS (Required for production)
TLS_KEY_PATH=/etc/ssl/private/your-domain.key
TLS_CERT_PATH=/etc/ssl/certs/your-domain.crt
PORT=80
HTTPS_PORT=443

# Optional services
REDIS_URL=redis://your-redis-instance:6379
NEO4J_URI=bolt://your-neo4j-instance:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password
```

### Deployment Steps

#### 1. Infrastructure Setup
```bash
# Example Docker deployment
# Build the application
docker build -t act-platform-backend .

# Run with proper environment variables
docker run -d \
  --name act-backend \
  --env-file .env.production \
  -p 80:80 -p 443:443 \
  -v /etc/ssl:/etc/ssl:ro \
  act-platform-backend
```

#### 2. Database Migration
```sql
-- Run in production database
-- 1. Create audit and compliance tables
\i database/migrations/audit-compliance-schema.sql

-- 2. Verify table creation
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%audit%';

-- 3. Test audit logging
INSERT INTO audit_logs (event_type, category, details) 
VALUES ('deployment_test', 'system', '{"test": true}');
```

#### 3. Application Deployment
```bash
# Start the application with compliance monitoring
NODE_ENV=production npm start

# Verify startup
curl -k https://your-domain.com/health/detailed

# Test compliance dashboard (replace with your admin key)
curl -H "X-Admin-Key: your-admin-key" \
  https://your-domain.com/api/compliance-dashboard/status
```

#### 4. Post-Deployment Validation
```bash
# Run health checks
npm run compliance:health-check

# Test encryption functionality
curl -X POST -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{"testData": {"email": "test@example.com"}}' \
  https://your-domain.com/api/compliance-dashboard/test-encryption

# Generate initial compliance report
curl -X POST -H "Content-Type: application/json" \
  -H "X-Admin-Key: your-admin-key" \
  -d '{"reportType": "daily"}' \
  https://your-domain.com/api/compliance-dashboard/generate-report
```

## Ongoing Maintenance

### Daily Operations
- **Monitor compliance dashboard** - Check system health and compliance scores
- **Review audit logs** - Look for unusual activity or security incidents  
- **Check privacy requests** - Ensure timely processing of user data requests
- **Validate encryption operations** - Monitor encryption success rates

### Weekly Tasks
- **Review compliance reports** - Analyze weekly compliance metrics
- **Update security configurations** - Apply security patches and updates
- **Test backup and recovery** - Verify data backup integrity
- **Monitor certificate expiry** - Check SSL certificate expiration dates

### Monthly Tasks
- **Generate monthly compliance reports** - Complete regulatory compliance reporting
- **Review and update documentation** - Keep security procedures current
- **Conduct security assessments** - Review access controls and permissions
- **Test disaster recovery** - Validate backup restoration procedures

### Quarterly Tasks
- **Rotate encryption keys** - Generate new encryption keys and re-encrypt data
- **Conduct security audits** - Comprehensive security review
- **Update compliance policies** - Review and update privacy policies
- **Train staff on security procedures** - Ensure team knowledge is current

## Monitoring and Alerting

### Key Metrics to Monitor
```javascript
// Example monitoring configuration
const monitoringMetrics = {
  // System health
  systemUptime: '> 99.9%',
  responseTime: '< 200ms average',
  errorRate: '< 0.1%',
  
  // Security metrics  
  encryptionSuccessRate: '> 99.5%',
  httpsTrafficPercentage: '100%',
  failedLoginAttempts: '< 10 per hour',
  
  // Compliance metrics
  privacyRequestProcessingTime: '< 30 days average',
  auditLogCompleteness: '100%',
  complianceScore: '> 90%',
  
  // Cultural safety
  culturalSafetyScore: '> 90%',
  communityConsentRate: '> 95%',
  elderReviewCompliance: '100%'
};
```

### Alert Configuration
```yaml
# Example alerting rules
alerts:
  - name: "High Risk Security Event"
    condition: "high_risk_events > 5 in 1h"
    severity: "critical"
    channels: ["security-team", "pager-duty"]
  
  - name: "Compliance Violation"  
    condition: "compliance_score < 90"
    severity: "high"
    channels: ["compliance-team", "email"]
  
  - name: "Privacy Request Overdue"
    condition: "privacy_request_age > 25 days"
    severity: "high" 
    channels: ["legal-team", "compliance-officer"]
  
  - name: "Encryption Failure Rate High"
    condition: "encryption_failure_rate > 1% in 1h"
    severity: "medium"
    channels: ["engineering-team"]
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 🔐 Encryption Issues
**Problem:** Encryption keys not found or invalid
```bash
# Check environment variables
echo $ENCRYPTION_KEY_users_data | base64 -d | wc -c  # Should output 32

# Regenerate keys if needed
openssl rand -base64 32
```

**Problem:** Decryption failures
```bash  
# Test encryption service directly
node -e "
import { encryptData, decryptData } from './src/services/encryption/encryptionService.js';
const test = async () => {
  const data = 'test data';
  const encrypted = await encryptData(data, 'test_key');
  const decrypted = await decryptData(encrypted, 'test_key');
  console.log('Success:', data === decrypted);
};
test();
"
```

#### 📊 Database Connection Issues
**Problem:** Cannot connect to Supabase
```bash
# Test connection
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/"

# Check network connectivity
ping your-project.supabase.co
```

**Problem:** Audit logs not being created
```sql
-- Check table permissions
SELECT * FROM information_schema.table_privileges 
WHERE table_name = 'audit_logs';

-- Test manual insert
INSERT INTO audit_logs (event_type, category, details)
VALUES ('test', 'manual', '{}');
```

#### 🔒 TLS/HTTPS Issues
**Problem:** Certificate validation failures
```bash
# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Test TLS configuration
openssl s_client -connect localhost:443 -verify_return_error
```

**Problem:** Mixed content warnings
- Ensure all API calls use HTTPS
- Check that redirect middleware is working
- Validate CSP headers allow HTTPS resources only

#### 📈 Performance Issues  
**Problem:** Slow encryption operations
```javascript
// Enable performance monitoring in encryption service
process.env.ENCRYPTION_PERFORMANCE_MONITORING = 'true';

// Check for large payloads
console.log('Data size:', JSON.stringify(data).length);
```

**Problem:** High memory usage
```bash
# Monitor Node.js memory usage
node --max-old-space-size=4096 src/server.js

# Use heap dumps for analysis
node --inspect src/server.js
```

### Emergency Procedures

#### Security Incident Response
1. **Immediate containment** - Isolate affected systems
2. **Assessment** - Determine scope and impact
3. **Communication** - Notify relevant stakeholders
4. **Recovery** - Restore normal operations
5. **Post-incident review** - Document lessons learned

#### Data Breach Response
1. **Stop the breach** - Secure the vulnerability
2. **Assess impact** - Determine affected data and users
3. **Legal notification** - Comply with breach notification laws
4. **User notification** - Inform affected users if required
5. **Remediation** - Strengthen security controls

## Compliance Standards

### Supported Regulations
- **GDPR** - General Data Protection Regulation (EU)
- **CCPA** - California Consumer Privacy Act (US)  
- **Privacy Act 1988** - Australian Privacy Principles
- **Indigenous Data Sovereignty** - Cultural safety protocols

### Audit Requirements
- **Comprehensive logging** - All data operations tracked
- **Tamper-evident logs** - Cryptographic integrity protection
- **Long-term retention** - 5-7 year retention as required
- **Regular reporting** - Automated compliance reporting

## Support and Resources

### Documentation
- `docs/data-sovereignty-protocols.md` - Privacy policies and procedures
- `docs/encryption-implementation-guide.md` - Technical implementation details
- `docs/privacy-policy-template.md` - Legal compliance template

### Testing Resources
- `tests/compliance/encryption.test.js` - Automated test suite
- `scripts/test-compliance-system.js` - Interactive test runner
- `scripts/setup-compliance-dev.sh` - Development environment setup

### API Endpoints
- `/api/data-sovereignty/*` - Privacy request APIs
- `/api/compliance-dashboard/*` - Admin monitoring APIs  
- `/health/detailed` - System health check
- `/health/security` - Security status check

### Getting Help
- Review console logs for detailed error messages
- Check the compliance dashboard for system status
- Use health check endpoints to diagnose issues
- Consult audit logs for security event details

---

**Last Updated:** January 2024  
**Version:** 1.0  
**Compliance Coverage:** GDPR, CCPA, Australian Privacy Act, Indigenous Data Sovereignty

*This guide provides comprehensive instructions for testing and deploying the ACT Platform's encryption and compliance systems. Regular updates ensure continued compliance with evolving privacy regulations.*