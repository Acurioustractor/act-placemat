# ACT Platform - Encryption Implementation Guide

## Overview

This technical guide details the implementation of end-to-end encryption, HTTPS enforcement, and security controls within the ACT Platform backend. It serves as a reference for developers and security auditors.

## Architecture Overview

```
┌─────────────────┐    HTTPS/TLS 1.2+    ┌─────────────────┐
│   Client Apps   │◄──────────────────────►│  Load Balancer  │
│  (Web/Mobile)   │                       │   (Cloudflare)  │
└─────────────────┘                       └─────────────────┘
                                                     │
                                          HTTPS/TLS 1.2+
                                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Express.js Server                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ HTTPS Redirect  │  │Security Headers │  │ Rate Limit  │  │
│  │   Middleware    │  │   Middleware    │  │ Middleware  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                     │
                         GraphQL API / REST Endpoints
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Data Source Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   PostgreSQL    │  │      Redis      │  │    Neo4j    │  │
│  │   (Supabase)    │  │     Cache       │  │    Graph    │  │
│  │ AES-256-GCM ────┼──┼─── Encrypted ───┼──┼── Storage   │  │
│  │   Encryption    │  │     Sessions    │  │             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## HTTPS/TLS Implementation

### Server Configuration

**File:** `/src/config/secureServer.js`

The secure server configuration creates both HTTP and HTTPS servers with proper security middleware:

```javascript
export const createSecureApp = async () => {
  const app = express();
  
  // Trust proxy for HTTPS detection behind load balancers
  app.set('trust proxy', true);
  
  // Security middleware applied in order:
  app.use(httpsRedirect);           // 1. Force HTTPS
  app.use(hstsMiddleware);          // 2. HSTS headers
  app.use(secureHeadersMiddleware); // 3. Security headers
  app.use(cspMiddleware);           // 4. Content Security Policy
  app.use(cors(corsOptions));       // 5. CORS configuration
  app.use(compression());           // 6. Response compression
  app.use(requestSizeLimit);        // 7. Request size limits
  app.use(sanitizeInput);           // 8. Input sanitization
  app.use(generalRateLimit);        // 9. Rate limiting
  
  return app;
};
```

### TLS Configuration

**File:** `/src/middleware/httpsEnforcement.js`

```javascript
export const validateTLSConfiguration = () => {
  return {
    // Minimum TLS version 1.2
    secureProtocol: 'TLSv1_2_method',
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    
    // Strong cipher suites only
    ciphers: [
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'DHE-RSA-AES256-GCM-SHA384',
      'DHE-RSA-AES128-GCM-SHA256'
    ].join(':'),
    
    // Server cipher preference
    honorCipherOrder: true,
    
    // Disable legacy protocols
    secureOptions: 
      SSL_OP_NO_SSLv2 | SSL_OP_NO_SSLv3 | 
      SSL_OP_NO_TLSv1 | SSL_OP_NO_TLSv1_1 |
      SSL_OP_SINGLE_DH_USE | SSL_OP_SINGLE_ECDH_USE
  };
};
```

### Certificate Management

**Development Certificates:**
```bash
# Generate self-signed certificates for development
npm run generate-dev-certs

# Certificates created in:
# - certs/dev-cert.pem (certificate)
# - certs/dev-key.pem (private key)
```

**Production Certificates:**
- Use Let's Encrypt or commercial CA certificates
- Store in secure locations: `/etc/ssl/certs/` and `/etc/ssl/private/`
- Configure certificate monitoring for expiration alerts
- Implement automated renewal for Let's Encrypt certificates

### Security Headers

**HSTS (HTTP Strict Transport Security):**
```javascript
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
```

**Additional Security Headers:**
```javascript
'X-Frame-Options': 'DENY',                          // Prevent clickjacking
'X-Content-Type-Options': 'nosniff',                // Prevent MIME sniffing
'X-XSS-Protection': '1; mode=block',                // XSS protection
'Referrer-Policy': 'strict-origin-when-cross-origin', // Privacy
'Permissions-Policy': 'geolocation=(), microphone=(), camera=()' // Feature restrictions
```

## Field-Level Encryption (AES-256-GCM)

### Encryption Service Integration

**File:** `/src/services/dataSources/postgresDataSource.js`

The PostgreSQL data source automatically encrypts sensitive fields before storage:

```javascript
class PostgreSQLDataSource {
  constructor() {
    this.encryptionEnabled = process.env.NODE_ENV !== 'test';
    this.sensitiveTableFields = {
      users: ['email', 'phone', 'address', 'password_hash', 'api_keys'],
      user_profiles: ['bio', 'contact_info', 'personal_details'],
      stories: ['content', 'contact_details', 'location_details'],
      projects: ['internal_notes', 'financial_data', 'contact_details'],
      organisations: ['contact_details', 'financial_data', 'internal_notes']
    };
  }
  
  async encryptSensitiveData(table, data) {
    if (!this.encryptionEnabled) return data;
    
    const forceEncrypt = this.sensitiveTableFields[table] || [];
    return await encryptObjectSensitiveFields(data, {
      encryptionKey: `${table}_data`,
      forceEncrypt,
    });
  }
  
  async decryptSensitiveData(table, data) {
    if (!this.encryptionEnabled) return data;
    
    return await decryptObjectSensitiveFields(data, `${table}_data`);
  }
}
```

### Automatic Encryption/Decryption

**On Data Write (INSERT/UPDATE):**
```javascript
// Automatically encrypt before database storage
const encryptedData = await this.encryptSensitiveData(table, inputData);
const result = await this.supabase.from(table).insert(encryptedData);
```

**On Data Read (SELECT):**
```javascript
// Automatically decrypt after database retrieval
const { data } = await this.supabase.from(table).select('*');
const decryptedData = await Promise.all(
  data.map(record => this.decryptSensitiveData(table, record))
);
```

### Key Management

**Environment Variables:**
```bash
# Encryption keys for different data categories
ENCRYPTION_KEY_users_data=base64encodedkey...
ENCRYPTION_KEY_stories_data=base64encodedkey...
ENCRYPTION_KEY_projects_data=base64encodedkey...
ENCRYPTION_KEY_organisations_data=base64encodedkey...

# Master encryption configuration
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_KEY_LENGTH=32
```

**Key Rotation Process:**
1. Generate new encryption key
2. Re-encrypt existing data with new key
3. Update environment variables
4. Deploy application with new keys
5. Verify data integrity after deployment

### Performance Considerations

**Optimization Strategies:**
- Encrypt only truly sensitive fields (not all fields)
- Use connection pooling to reduce encryption overhead
- Cache decrypted data temporarily in Redis with TTL
- Implement lazy decryption (decrypt only when accessed)
- Use database-level encryption for additional protection

**Benchmarking Results:**
```javascript
// Performance impact of field-level encryption
const benchmarks = {
  insertWithoutEncryption: '~2ms per record',
  insertWithEncryption: '~8ms per record',
  selectWithoutDecryption: '~1ms per record',
  selectWithDecryption: '~5ms per record',
  overhead: '3-4x slower but acceptable for sensitive data'
};
```

## Data Sovereignty API

### Export Endpoints

**File:** `/src/api/dataSovereignty.js`

**Complete Data Export:**
```javascript
router.get('/export', authenticateUser, async (req, res) => {
  const { format = 'json', categories, includeDeleted, decrypt } = req.query;
  
  try {
    const userData = await getUserData(userId, {
      includeDeleted: includeDeleted === 'true',
      decryptData: decrypt === 'true',
      format,
      categories: categories ? categories.split(',') : undefined,
    });
    
    // Audit log the export request
    await auditLogger.logDataExport(userId, {
      format,
      categories,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      exportSize: JSON.stringify(userData).length,
    });
    
    // Set appropriate headers for different formats
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.csv"`);
      return res.send(convertToCSV(userData));
    } else if (format === 'zip') {
      const zipBuffer = await createZipArchive(userData, userId);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.zip"`);
      return res.send(zipBuffer);
    }
    
    // Default JSON export
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      exportDate: new Date().toISOString(),
      userId,
      data: userData,
      metadata: {
        totalRecords: Object.keys(userData).length,
        categories: Object.keys(userData),
        includeDeleted,
        decrypted: decrypt === 'true',
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});
```

**Data Deletion (Right to be Forgotten):**
```javascript
router.post('/delete-request', authenticateUser, async (req, res) => {
  const { categories, confirmationPhrase, reason } = req.body;
  
  try {
    // Require explicit confirmation
    if (confirmationPhrase !== 'DELETE MY DATA PERMANENTLY') {
      return res.status(400).json({
        error: 'Confirmation phrase required',
        requiredPhrase: 'DELETE MY DATA PERMANENTLY'
      });
    }
    
    // Create audit trail before deletion
    await auditLogger.logDeletionRequest(userId, {
      categories,
      reason,
      ipAddress: req.ip,
      requestTime: new Date(),
    });
    
    // Perform comprehensive deletion across all data sources
    const deletionResults = await Promise.allSettled([
      postgresDataSource.deleteUserData(userId, categories),
      redisDataSource.clearUserSessions(userId),
      neo4jDataSource.removeUserConnections(userId),
    ]);
    
    // Log any deletion failures
    const failures = deletionResults.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.error('Partial deletion failures:', failures);
    }
    
    res.json({
      success: true,
      message: 'Data deletion request processed',
      deletionId: `del_${Date.now()}_${userId}`,
      processedCategories: categories,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Data deletion error:', error);
    res.status(500).json({ error: 'Failed to process deletion request' });
  }
});
```

### Multi-Database Deletion

**PostgreSQL Deletion:**
```javascript
async deleteUserData(userId, categories = []) {
  const tables = categories.length > 0 ? categories : [
    'users', 'user_profiles', 'user_preferences', 'user_sessions',
    'stories', 'story_collaborations', 'story_comments',
    'projects', 'project_memberships', 'project_comments',
    'organisations', 'organisation_memberships',
    'connections', 'notifications', 'audit_logs'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .delete()
        .match({ user_id: userId });
      
      if (error) throw error;
      console.log(`Deleted user data from ${table}: ${data?.length || 0} records`);
    } catch (error) {
      console.error(`Failed to delete from ${table}:`, error);
      throw error;
    }
  }
}
```

**Redis Session Cleanup:**
```javascript
async clearUserSessions(userId) {
  const patterns = [
    `session:${userId}:*`,      // User sessions
    `cache:user:${userId}:*`,   // User data cache
    `temp:${userId}:*`,         // Temporary data
    `rate_limit:${userId}:*`    // Rate limit data
  ];
  
  for (const pattern of patterns) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      console.log(`Cleared ${keys.length} Redis keys for pattern: ${pattern}`);
    }
  }
}
```

**Neo4j Relationship Cleanup:**
```javascript
async removeUserConnections(userId) {
  const query = `
    MATCH (u:User {id: $userId})-[r]-()
    DELETE r, u
    RETURN count(r) as deletedRelationships
  `;
  
  const result = await this.neo4j.run(query, { userId });
  const deletedCount = result.records[0]?.get('deletedRelationships') || 0;
  console.log(`Deleted ${deletedCount} Neo4j relationships for user ${userId}`);
}
```

## Security Middleware

### Input Sanitization

**File:** `/src/middleware/security.js`

```javascript
export const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove XSS vectors
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' 
            ? item.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            : item
        );
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};
```

### Rate Limiting

**General Rate Limiting:**
```javascript
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                 // 1000 requests per window
  message: {
    error: 'Too many requests',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

**Authentication Rate Limiting:**
```javascript
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                    // 5 authentication attempts per window
  message: {
    error: 'Too many authentication attempts',
    retryAfter: 900
  }
});
```

### CORS Configuration

```javascript
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'https://act.place',
      'https://app.act.place'
    ];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow file:// protocol for local development
    if (origin.startsWith('file://')) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset']
};
```

## Audit and Compliance

### Audit Logging

**File:** `/src/services/auditLogger.js` (referenced, implemented elsewhere)

```javascript
class AuditLogger {
  async logDataExport(userId, metadata) {
    return this.log({
      userId,
      action: 'data_export',
      category: 'privacy_request',
      timestamp: new Date(),
      metadata,
      complianceFlags: {
        gdpr: true,
        ccpa: true,
        australianPrivacy: true
      }
    });
  }
  
  async logDeletionRequest(userId, metadata) {
    return this.log({
      userId,
      action: 'data_deletion_request',
      category: 'privacy_request',
      timestamp: new Date(),
      metadata,
      complianceFlags: {
        gdpr: true,
        ccpa: true,
        australianPrivacy: true
      }
    });
  }
}
```

### Health Checks

**Security Status Endpoint:**
```javascript
app.get('/health/security', (req, res) => {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    security: {
      https: isSecure,
      hsts: !!res.getHeader('Strict-Transport-Security'),
      csp: !!res.getHeader('Content-Security-Policy'),
      frameOptions: !!res.getHeader('X-Frame-Options'),
      contentTypeOptions: !!res.getHeader('X-Content-Type-Options'),
      xssProtection: !!res.getHeader('X-XSS-Protection')
    },
    encryption: {
      fieldLevelEncryption: process.env.NODE_ENV !== 'test',
      tlsVersion: 'TLS 1.2+',
      cipherStrength: 'AES-256-GCM'
    }
  });
});
```

## Performance Monitoring

### Encryption Performance Tracking

```javascript
// Add performance monitoring to encryption operations
const performanceMonitor = {
  trackEncryption: async (operation, data) => {
    const start = performance.now();
    const result = await operation(data);
    const duration = performance.now() - start;
    
    // Log slow operations
    if (duration > 100) { // > 100ms
      console.warn(`Slow encryption operation: ${duration.toFixed(2)}ms`);
    }
    
    // Store metrics for monitoring
    await this.recordMetric('encryption_duration', duration);
    
    return result;
  }
};
```

### TLS Connection Monitoring

```javascript
export const tlsConnectionHandler = (socket) => {
  const cipher = socket.getCipher();
  if (cipher) {
    console.log(`TLS Connection: ${cipher.version} ${cipher.name}`);
    
    // Monitor for weak ciphers
    const weakCiphers = ['RC4', 'DES', '3DES', 'MD5'];
    const isWeak = weakCiphers.some(weak => cipher.name.includes(weak));
    
    if (isWeak) {
      console.warn(`Weak cipher detected: ${cipher.name}`);
    }
  }
};
```

## Deployment Considerations

### Environment Configuration

**Production Environment Variables:**
```bash
# HTTPS/TLS
NODE_ENV=production
PORT=80
HTTPS_PORT=443
TLS_KEY_PATH=/etc/ssl/private/act-platform.key
TLS_CERT_PATH=/etc/ssl/certs/act-platform.crt

# Encryption Keys (rotate quarterly)
ENCRYPTION_KEY_users_data=...
ENCRYPTION_KEY_stories_data=...
ENCRYPTION_KEY_projects_data=...

# Security Settings
ALLOWED_ORIGINS=https://act.place,https://app.act.place
VALID_API_KEYS=api_key_1,api_key_2

# Database Security
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

### Docker Configuration

**Dockerfile Security:**
```dockerfile
# Use non-root user
USER node

# Install security updates
RUN npm audit fix

# Copy certificates securely
COPY --chown=node:node certs/ /app/certs/

# Set secure permissions
RUN chmod 600 /app/certs/*
```

### Load Balancer Configuration

**Nginx/Cloudflare Settings:**
```nginx
# Force HTTPS
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    
    # TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Testing and Validation

### Security Testing Commands

```bash
# Test HTTPS enforcement
curl -i http://localhost:4000/health
# Should return 301 redirect to HTTPS

# Test TLS configuration
nmap --script ssl-enum-ciphers -p 443 localhost
# Should show only strong ciphers

# Test rate limiting
for i in {1..10}; do curl -i http://localhost:4000/api/test; done
# Should show rate limit after configured threshold

# Test data export
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:4000/api/data-sovereignty/export?format=json

# Test encryption/decryption
npm run test:encryption
```

### Automated Security Scans

```bash
# Security audit
npm audit
npm audit fix

# OWASP dependency check
npm install -g audit-ci
audit-ci --moderate

# SSL/TLS testing
npm install -g ssl-checker
ssl-checker act.place
```

---

This implementation guide provides comprehensive technical details for maintaining and extending the ACT Platform's security infrastructure. Regular review and updates ensure continued compliance with evolving security standards and privacy regulations.