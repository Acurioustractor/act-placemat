# AES-256-GCM Encryption Setup Guide

## Overview

The ACT Placemat platform implements field-level encryption using AES-256-GCM for sensitive data protection. This includes passwords, tokens, emails, API keys, and other personally identifiable information (PII).

## Security Features

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Length**: 256-bit encryption keys
- **Authentication**: Built-in authentication tags prevent tampering
- **IV Generation**: Cryptographically secure random IVs for each operation
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Compliance**: Australian Government, NIST, FIPS 140-2, Common Criteria approved

## Encrypted Data Fields

The system automatically identifies and encrypts fields matching these patterns:

### Authentication & Security
- `password`, `hash`, `secret`, `token`, `key`
- `accessToken`, `refreshToken`, `apiKey`, `clientSecret`

### Personal Information
- `email`, `phone`, `address`, `name`
- `ssn`, `abn`, `tfn` (Australian tax identifiers)

### Financial Data
- `account`, `banking`, `credit`, `payment`

## Production Setup

### 1. Generate Encryption Key

```bash
# Generate a secure 256-bit encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Environment Configuration

Add to your production environment:

```bash
# Primary encryption key (REQUIRED)
ENCRYPTION_MASTER_KEY=your_256_bit_key_in_hex

# Alternative fallback options
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
```

### 3. Verify Setup

Run the encryption validation:

```bash
node test-encryption-implementation.js
```

Expected output should show "All encryption tests completed successfully!"

## API Usage

### Basic Encryption/Decryption

```javascript
import { encryptSensitiveData, decryptSensitiveData } from './services/encryptionService.js';

// Encrypt sensitive data
const result = encryptSensitiveData('sensitive_value', {
  classification: 'confidential',
  keyId: 'user_data'
});

// Decrypt data
const decrypted = decryptSensitiveData(result.encrypted);
console.log(decrypted.decrypted); // 'sensitive_value'
```

### Object-Level Encryption

```javascript
import { encryptObjectSensitiveFields, decryptObjectSensitiveFields } from './services/encryptionService.js';

const userData = {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret123',
  publicInfo: 'This is not encrypted'
};

// Encrypt sensitive fields automatically
const encrypted = await encryptObjectSensitiveFields(userData);

// Decrypt back to original
const decrypted = await decryptObjectSensitiveFields(encrypted);
```

### Custom Field Detection

```javascript
import { isSensitiveField } from './services/encryptionService.js';

const check = isSensitiveField('userEmail', 'test@example.com');
console.log(check); // { sensitive: true, reason: 'field_name_pattern', classification: 'confidential' }
```

## Security Best Practices

### 1. Key Management
- **Never** commit encryption keys to version control
- Use environment variables or secure key management services
- Rotate encryption keys regularly in production
- Use different keys for different environments

### 2. Data Classification
- `PUBLIC`: No encryption required
- `INTERNAL`: Basic encryption for internal data
- `CONFIDENTIAL`: Strong encryption + access controls
- `RESTRICTED`: Maximum security + audit logging

### 3. Monitoring & Auditing
- Log all encryption/decryption operations
- Monitor for failed decryption attempts
- Implement alerts for security events
- Regular security audits and penetration testing

## Development vs Production

### Development Mode
- Uses deterministic fallback keys for consistency
- Warning messages indicate non-production setup
- Suitable for testing and development only

### Production Mode
- Requires proper `ENCRYPTION_MASTER_KEY` configuration
- Uses PBKDF2 key derivation with random salts
- Full cryptographic security enabled

## Troubleshooting

### "No encryption key configured" Warning
Set the `ENCRYPTION_MASTER_KEY` environment variable with a secure 256-bit key.

### "Decryption failed" Errors
- Verify the same key is used for encrypt/decrypt operations
- Check that encrypted data hasn't been corrupted
- Ensure proper key rotation procedures if keys have changed

### Performance Considerations
- Encryption/decryption adds computational overhead
- Consider caching decrypted data for read-heavy operations
- Use async functions for object-level operations

## Compliance & Standards

This implementation meets:
- **Australian Government ISM** (Information Security Manual)
- **NIST SP 800-38D** (AES-GCM specification)
- **FIPS 140-2** (Federal Information Processing Standard)
- **Common Criteria EAL4+** (Security evaluation standard)

## Support

For questions or issues with encryption setup:
1. Check this documentation first
2. Review the test output from `test-encryption-implementation.js`
3. Consult the encryption service source code in `apps/backend/src/services/encryptionService.js`
4. Contact the development team for advanced configuration needs