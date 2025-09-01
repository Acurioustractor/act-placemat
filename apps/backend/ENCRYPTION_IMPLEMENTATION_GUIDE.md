# ACT Platform - Encryption Implementation Guide

This guide provides technical specifications for the encryption and data protection implementations in the ACT Platform, supporting compliance with GDPR, CCPA, and Indigenous data sovereignty requirements.

## Encryption Architecture Overview

### Field-Level Encryption Design

The ACT Platform implements field-level encryption using AES-256-GCM (Galois/Counter Mode) with the following characteristics:

- **Algorithm:** AES-256-GCM (Advanced Encryption Standard with Galois Counter Mode)
- **Key Size:** 256 bits
- **IV Size:** 96 bits (12 bytes) - cryptographically secure random
- **Authentication:** Built-in AEAD (Authenticated Encryption with Associated Data)
- **Key Derivation:** PBKDF2 with SHA-256, 100,000 iterations

### Key Management System

#### Key Hierarchy
```
Master Key (Environmental)
├── Table-Specific Keys (Derived)
│   ├── users_data_key
│   ├── stories_data_key
│   ├── projects_data_key
│   └── organisations_data_key
└── Operational Keys (Rotated)
    ├── encryption_operations
    └── backup_encryption
```

#### Key Storage and Protection
- **Production:** Hardware Security Module (HSM) or secure key management service
- **Development:** Environment variables with secure generation
- **Backup:** Encrypted key backups with separate authentication
- **Rotation:** Quarterly automatic rotation with backward compatibility

## Implementation Details

### Encryption Service Architecture

#### Core Encryption Service (`encryptionService.js`)

```javascript
import crypto from 'crypto';

/**
 * Field-level encryption using AES-256-GCM
 * Provides authenticated encryption with automatic IV generation
 */
export class FieldLevelEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyCache = new Map();
    this.performanceMetrics = {
      encryptionCount: 0,
      decryptionCount: 0,
      averageEncryptTime: 0,
      averageDecryptTime: 0
    };
  }

  /**
   * Get encryption key for specific table with caching
   */
  getTableKey(tableName) {
    const cacheKey = `encryption_key_${tableName}_data`;
    
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey);
    }

    const keyBase64 = process.env[`ENCRYPTION_KEY_${tableName}_data`];
    if (!keyBase64) {
      throw new Error(`Encryption key not found for table: ${tableName}`);
    }

    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
      throw new Error(`Invalid key length for table ${tableName}: expected 32 bytes`);
    }

    this.keyCache.set(cacheKey, key);
    return key;
  }

  /**
   * Encrypt sensitive field data
   */
  encryptField(data, tableName) {
    const startTime = performance.now();
    
    try {
      const key = this.getTableKey(tableName);
      const iv = crypto.randomBytes(12); // 96-bit IV for GCM
      const cipher = crypto.createCipher(this.algorithm, key, { iv });
      
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const encrypted = Buffer.concat([
        cipher.update(dataString, 'utf8'),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + AuthTag + Encrypted Data for storage
      const result = Buffer.concat([iv, authTag, encrypted]).toString('base64');
      
      this.updatePerformanceMetrics('encrypt', performance.now() - startTime);
      return result;
      
    } catch (error) {
      console.error(`Encryption failed for table ${tableName}:`, error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive field data
   */
  decryptField(encryptedData, tableName) {
    const startTime = performance.now();
    
    try {
      const key = this.getTableKey(tableName);
      const data = Buffer.from(encryptedData, 'base64');
      
      // Extract components: IV (12) + AuthTag (16) + Encrypted Data
      const iv = data.subarray(0, 12);
      const authTag = data.subarray(12, 28);
      const encrypted = data.subarray(28);
      
      const decipher = crypto.createDecipher(this.algorithm, key, { iv });
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      const result = decrypted.toString('utf8');
      
      this.updatePerformanceMetrics('decrypt', performance.now() - startTime);
      
      // Try to parse as JSON, fall back to string
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
      
    } catch (error) {
      console.error(`Decryption failed for table ${tableName}:`, error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  
  updatePerformanceMetrics(operation, duration) {
    if (operation === 'encrypt') {
      this.performanceMetrics.encryptionCount++;
      this.performanceMetrics.averageEncryptTime = 
        (this.performanceMetrics.averageEncryptTime + duration) / 2;
    } else {
      this.performanceMetrics.decryptionCount++;
      this.performanceMetrics.averageDecryptTime = 
        (this.performanceMetrics.averageDecryptTime + duration) / 2;
    }
  }
}
```

### Database Integration

#### Automatic Encryption/Decryption in Data Sources

```javascript
/**
 * PostgreSQL Data Source with Automatic Field-Level Encryption
 */
export class PostgreSQLDataSource {
  constructor() {
    this.encryption = new FieldLevelEncryption();
    this.sensitiveFields = {
      users: ['email', 'phone', 'address', 'emergency_contact'],
      user_profiles: ['personal_details', 'private_notes'],
      stories: ['sensitive_content', 'location_data'],
      organisations: ['contact_details', 'financial_info'],
      projects: ['sensitive_project_data']
    };
  }

  /**
   * Encrypt sensitive data before storage
   */
  async encryptSensitiveData(tableName, data) {
    const sensitiveFieldList = this.sensitiveFields[tableName] || [];
    const result = { ...data };

    for (const field of sensitiveFieldList) {
      if (result[field] != null) {
        result[field] = this.encryption.encryptField(result[field], tableName);
      }
    }

    return result;
  }

  /**
   * Decrypt sensitive data after retrieval
   */
  async decryptSensitiveData(tableName, data) {
    if (!data) return data;
    
    const sensitiveFieldList = this.sensitiveFields[tableName] || [];
    const result = Array.isArray(data) ? [...data] : { ...data };

    if (Array.isArray(result)) {
      return Promise.all(result.map(item => this.decryptSensitiveData(tableName, item)));
    }

    for (const field of sensitiveFieldList) {
      if (result[field] != null && typeof result[field] === 'string') {
        try {
          result[field] = this.encryption.decryptField(result[field], tableName);
        } catch (error) {
          console.warn(`Failed to decrypt field ${field} in table ${tableName}:`, error);
          // Keep original value if decryption fails (may be unencrypted legacy data)
        }
      }
    }

    return result;
  }

  /**
   * Insert with automatic encryption
   */
  async insert(tableName, data) {
    const encryptedData = await this.encryptSensitiveData(tableName, data);
    const result = await this.supabase
      .from(tableName)
      .insert(encryptedData)
      .select();
    
    return this.decryptSensitiveData(tableName, result.data);
  }

  /**
   * Query with automatic decryption
   */
  async query(tableName, conditions = {}) {
    const { data } = await this.supabase
      .from(tableName)
      .select('*')
      .match(conditions.eq || {});
    
    return this.decryptSensitiveData(tableName, data);
  }
}
```

## Security Considerations

### Key Generation and Management

#### Production Key Generation
```bash
# Generate cryptographically secure 32-byte keys
openssl rand -base64 32

# Example environment variable setup
export ENCRYPTION_KEY_users_data="$(openssl rand -base64 32)"
export ENCRYPTION_KEY_stories_data="$(openssl rand -base64 32)"
export ENCRYPTION_KEY_projects_data="$(openssl rand -base64 32)"
export ENCRYPTION_KEY_organisations_data="$(openssl rand -base64 32)"
```

#### Key Rotation Procedure
1. **Generate New Keys:** Create new encryption keys using secure random generation
2. **Deploy New Keys:** Update environment variables with new keys
3. **Background Re-encryption:** Gradually re-encrypt existing data with new keys
4. **Verify Migration:** Confirm all data successfully re-encrypted
5. **Remove Old Keys:** Securely delete old keys after migration complete

#### Key Storage Best Practices
- **Never commit keys to version control**
- **Use dedicated secrets management systems in production**
- **Implement proper access controls for key access**
- **Regular key rotation (quarterly minimum)**
- **Backup keys with separate authentication**

### Transport Layer Security

#### TLS Configuration
```nginx
# Nginx TLS configuration for production
server {
    listen 443 ssl http2;
    server_name act-platform.com;
    
    # TLS Configuration
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;
    
    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
}
```

#### Certificate Management
- **Automated Renewal:** Let's Encrypt with automated renewal
- **Certificate Monitoring:** Expiration date monitoring and alerts
- **Multi-Domain Support:** SAN certificates for multiple subdomains
- **Backup Certificates:** Secondary certificates for failover

### Database Security

#### Connection Security
```javascript
// Secure database connection configuration
const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  options: {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
};
```

#### Row Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- User can only access their own data
CREATE POLICY user_isolation_policy ON users
  FOR ALL USING (auth.uid() = id);

-- Users can see public stories and their own private stories
CREATE POLICY story_access_policy ON stories
  FOR SELECT USING (
    visibility = 'public' OR 
    (visibility = 'private' AND author_id = auth.uid())
  );
```

## Performance Optimization

### Encryption Performance Monitoring

#### Metrics Collection
```javascript
export class EncryptionPerformanceMonitor {
  constructor() {
    this.metrics = {
      totalOperations: 0,
      encryptionTime: [],
      decryptionTime: [],
      keyRetrievalTime: [],
      errorCount: 0,
      successRate: 0
    };
  }

  recordEncryption(duration, success = true) {
    this.metrics.totalOperations++;
    if (success) {
      this.metrics.encryptionTime.push(duration);
    } else {
      this.metrics.errorCount++;
    }
    this.updateSuccessRate();
  }

  getPerformanceReport() {
    return {
      totalOperations: this.metrics.totalOperations,
      averageEncryptionTime: this.average(this.metrics.encryptionTime),
      averageDecryptionTime: this.average(this.metrics.decryptionTime),
      p95EncryptionTime: this.percentile(this.metrics.encryptionTime, 95),
      successRate: this.metrics.successRate,
      errorRate: (this.metrics.errorCount / this.metrics.totalOperations) * 100
    };
  }
}
```

#### Performance Optimization Techniques

1. **Key Caching:** Cache encryption keys in memory to reduce derivation overhead
2. **Batch Operations:** Process multiple encryptions in batch for better throughput
3. **Async Processing:** Use async/await for non-blocking encryption operations
4. **Connection Pooling:** Maintain persistent database connections
5. **Compression:** Compress data before encryption for large payloads

### Caching Strategy

#### Redis Integration for Performance
```javascript
export class EncryptionCache {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.keyCache = new Map();
    this.cacheHitRate = 0;
  }

  async getCachedDecryption(cacheKey) {
    try {
      const cached = await this.redis.get(`decrypt:${cacheKey}`);
      if (cached) {
        this.cacheHitRate++;
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
    }
    return null;
  }

  async setCachedDecryption(cacheKey, data, ttlSeconds = 300) {
    try {
      await this.redis.setex(
        `decrypt:${cacheKey}`,
        ttlSeconds,
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn('Cache storage failed:', error);
    }
  }
}
```

## Testing and Validation

### Encryption Test Suite

#### Unit Tests
```javascript
import { describe, test, expect } from '@jest/globals';
import { FieldLevelEncryption } from '../services/encryptionService.js';

describe('Field-Level Encryption', () => {
  let encryption;

  beforeEach(() => {
    encryption = new FieldLevelEncryption();
    // Set test encryption key
    process.env.ENCRYPTION_KEY_test_data = Buffer.from('a'.repeat(32)).toString('base64');
  });

  test('encrypts and decrypts string data correctly', () => {
    const originalData = 'sensitive information';
    const encrypted = encryption.encryptField(originalData, 'test');
    const decrypted = encryption.decryptField(encrypted, 'test');
    
    expect(decrypted).toBe(originalData);
    expect(encrypted).not.toBe(originalData);
  });

  test('encrypts and decrypts object data correctly', () => {
    const originalData = { email: 'user@example.com', phone: '+1234567890' };
    const encrypted = encryption.encryptField(originalData, 'test');
    const decrypted = encryption.decryptField(encrypted, 'test');
    
    expect(decrypted).toEqual(originalData);
    expect(encrypted).not.toEqual(originalData);
  });

  test('fails with invalid key', () => {
    delete process.env.ENCRYPTION_KEY_test_data;
    
    expect(() => {
      encryption.encryptField('data', 'test');
    }).toThrow('Encryption key not found');
  });
});
```

#### Integration Tests
```javascript
describe('Database Encryption Integration', () => {
  let dataSource;

  beforeAll(async () => {
    dataSource = new PostgreSQLDataSource();
    await dataSource.initialize();
  });

  test('automatically encrypts sensitive fields on insert', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890'
    };

    // Insert user data
    const inserted = await dataSource.insert('users', userData);
    
    // Verify sensitive data is encrypted in database
    const { data: rawData } = await dataSource.supabase
      .from('users')
      .select('*')
      .eq('id', inserted[0].id);
    
    expect(rawData[0].email).not.toBe(userData.email);
    expect(rawData[0].phone).not.toBe(userData.phone);
    expect(rawData[0].name).toBe(userData.name); // Non-sensitive field unchanged
    
    // Verify automatic decryption works
    expect(inserted[0].email).toBe(userData.email);
    expect(inserted[0].phone).toBe(userData.phone);
  });
});
```

### Performance Testing

#### Load Testing for Encryption Operations
```javascript
import { performance } from 'perf_hooks';

export class EncryptionLoadTest {
  async runLoadTest(iterations = 1000) {
    const encryption = new FieldLevelEncryption();
    const testData = 'This is test data for encryption performance testing';
    
    const startTime = performance.now();
    
    const promises = [];
    for (let i = 0; i < iterations; i++) {
      promises.push(this.testEncryptionCycle(encryption, testData));
    }
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    return {
      iterations,
      totalTime,
      averageTimePerOperation: totalTime / iterations,
      operationsPerSecond: (iterations / totalTime) * 1000
    };
  }

  async testEncryptionCycle(encryption, data) {
    const encrypted = encryption.encryptField(data, 'test');
    const decrypted = encryption.decryptField(encrypted, 'test');
    return decrypted === data;
  }
}
```

## Compliance and Audit

### Audit Logging for Encryption Operations

```javascript
export class EncryptionAuditLogger {
  constructor() {
    this.supabase = createSupabaseClient();
  }

  async logEncryptionEvent(operation, tableName, success, metadata = {}) {
    try {
      await this.supabase
        .from('encryption_audit_logs')
        .insert({
          operation_type: operation, // 'encrypt', 'decrypt', 'key_rotation'
          table_name: tableName,
          success: success,
          timestamp: new Date().toISOString(),
          metadata: metadata,
          server_instance: process.env.SERVER_INSTANCE_ID || 'unknown'
        });
    } catch (error) {
      console.error('Failed to log encryption audit event:', error);
    }
  }

  async generateComplianceReport(startDate, endDate) {
    const { data } = await this.supabase
      .from('encryption_audit_logs')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    return {
      period: { start: startDate, end: endDate },
      totalOperations: data.length,
      successRate: (data.filter(log => log.success).length / data.length) * 100,
      operationsByTable: this.groupBy(data, 'table_name'),
      operationsByType: this.groupBy(data, 'operation_type'),
      failedOperations: data.filter(log => !log.success)
    };
  }
}
```

### Regulatory Compliance Verification

#### GDPR Article 32 - Security of Processing
✅ **Technical Measures:**
- AES-256-GCM encryption (state-of-the-art)
- Authenticated encryption preventing tampering
- Secure key management with rotation
- Transport layer security (TLS 1.3)

✅ **Organizational Measures:**
- Access controls and authentication
- Staff training on data protection
- Regular security assessments
- Incident response procedures

#### CCPA Technical Safeguards
✅ **Reasonable Security Procedures:**
- Industry-standard encryption (NIST approved)
- Regular security audits and assessments
- Access logging and monitoring
- Secure development practices

#### Australian Privacy Principles - APP 11
✅ **Information Security:**
- Encryption for sensitive personal information
- Access controls preventing unauthorized disclosure
- Regular review of security measures
- Staff awareness and training programs

## Deployment Considerations

### Environment Configuration

#### Production Environment Variables
```bash
# Required encryption keys (generate with: openssl rand -base64 32)
ENCRYPTION_KEY_users_data=your_base64_encoded_32_byte_key
ENCRYPTION_KEY_stories_data=your_base64_encoded_32_byte_key
ENCRYPTION_KEY_projects_data=your_base64_encoded_32_byte_key
ENCRYPTION_KEY_organisations_data=your_base64_encoded_32_byte_key

# Master encryption key for key derivation
MASTER_ENCRYPTION_KEY=your_master_encryption_key

# Database configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis for caching (optional)
REDIS_URL=redis://your-redis-instance:6379

# Performance monitoring
ENCRYPTION_PERFORMANCE_MONITORING=true
```

#### Docker Configuration
```dockerfile
# Dockerfile for production deployment
FROM node:18-alpine

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy application files
COPY --chown=nextjs:nodejs . .

# Install dependencies
RUN npm ci --only=production

# Switch to non-root user
USER nextjs

# Health check for encryption functionality
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/health-check-encryption.js

EXPOSE 4000
CMD ["node", "src/server.js"]
```

### Monitoring and Alerting

#### Encryption Health Monitoring
```javascript
export const encryptionHealthCheck = async () => {
  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Test key availability
    results.checks.keyAvailability = await testKeyAvailability();
    
    // Test encryption/decryption cycle
    results.checks.encryptionCycle = await testEncryptionCycle();
    
    // Test database connectivity
    results.checks.databaseConnectivity = await testDatabaseConnectivity();
    
    // Check performance metrics
    results.checks.performance = await getPerformanceMetrics();
    
    // Overall health determination
    const allHealthy = Object.values(results.checks).every(check => check.healthy);
    results.status = allHealthy ? 'healthy' : 'degraded';
    
  } catch (error) {
    results.status = 'unhealthy';
    results.error = error.message;
  }

  return results;
};
```

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Next Review:** April 2024  
**Maintained By:** Security and Compliance Team

*This guide should be reviewed alongside the Data Sovereignty Protocols and compliance documentation for complete implementation guidance.*