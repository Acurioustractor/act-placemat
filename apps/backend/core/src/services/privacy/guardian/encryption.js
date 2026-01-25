/**
 * Privacy Guardian - Encryption Module
 *
 * Encryption handling for data at rest, in transit, and in use.
 * Part of the Privacy Guardian modular architecture.
 */

import crypto from 'crypto';

/**
 * Creates the encryption module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Encryption methods
 */
export function createEncryptionModule(dependencies = {}) {
  const { logger = console, encryptionKey = process.env.ENCRYPTION_KEY } = dependencies;

  const ALGORITHM = 'aes-256-gcm';
  const IV_LENGTH = 16;
  const TAG_LENGTH = 16;

  /**
   * Applies encryption to data based on requirements
   * @param {Object} data - Data to encrypt
   * @param {Object} context - Processing context
   * @returns {Object} Encryption result with encrypted data
   */
  async function applyEncryption(data, context) {
    const encryption = {
      method: ALGORITHM,
      key_type: 'community_controlled',
      encrypted_fields: [],
      plaintext_fields: [],
      encryption_time: Date.now()
    };

    try {
      const encryptionRequirements = determineEncryptionRequirements(data, context);
      const encryptedData = {};

      for (const [field, value] of Object.entries(data)) {
        if (encryptionRequirements.encrypted_fields.includes(field)) {
          const encryptedValue = await encryptField(value, field, context);
          encryptedData[field] = encryptedValue;
          encryption.encrypted_fields.push(field);
        } else {
          encryptedData[field] = value;
          encryption.plaintext_fields.push(field);
        }
      }

      encryption.success = true;
      encryption.encrypted_data = encryptedData;

    } catch (error) {
      logger.error('Encryption application error:', error);
      encryption.success = false;
      encryption.error = error.message;
    }

    return encryption;
  }

  /**
   * Determines which fields need encryption
   * @param {Object} data - Data being processed
   * @param {Object} context - Processing context
   * @returns {Object} Encryption requirements
   */
  function determineEncryptionRequirements(data, context) {
    const sensitiveFields = [
      'password', 'ssn', 'credit_card', 'medical', 'health',
      'address', 'phone', 'email', 'bank', 'financial',
      'diagnosis', 'medication', 'history', 'record'
    ];

    const encrypted_fields = Object.keys(data).filter(key =>
      sensitiveFields.some(field => key.toLowerCase().includes(field))
    );

    return {
      encrypted_fields: encrypted_fields.length > 0 ? encrypted_fields : ['default'],
      encryption_level: encrypted_fields.length > 0 ? 'high' : 'standard'
    };
  }

  /**
   * Encrypts a single field value
   * @param {*} value - Value to encrypt
   * @param {string} fieldName - Field name
   * @param {Object} context - Processing context
   * @returns {string} Encrypted value as hex string
   */
  async function encryptField(value, fieldName, context) {
    const key = deriveKey(encryptionKey || 'default-key');
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(typeof value === 'string' ? value : JSON.stringify(value), 'utf8'),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts a single field value
   * @param {string} encryptedValue - Encrypted value
   * @param {string} fieldName - Field name
   * @param {Object} context - Processing context
   * @returns {*} Decrypted value
   */
  async function decryptField(encryptedValue, fieldName, context) {
    try {
      const [ivHex, tagHex, encryptedHex] = encryptedValue.split(':');
      const key = deriveKey(encryptionKey || 'default-key');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      const decrypted = decipher.update(encrypted) + decipher.final('utf8');

      // Try to parse as JSON, otherwise return string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }

    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error(`Failed to decrypt field ${fieldName}`);
    }
  }

  /**
   * Derives an encryption key from a password
   * @param {string} password - Password or seed
   * @returns {Buffer} Derived key
   */
  function deriveKey(password) {
    return crypto.scryptSync(password, 'privacy-guardian-salt', 32);
  }

  /**
   * Generates a cryptographically secure random key
   * @param {number} length - Key length in bytes (default 32)
   * @returns {Buffer} Random key
   */
  function generateKey(length = 32) {
    return crypto.randomBytes(length);
  }

  /**
   * Hashes a value using SHA-256
   * @param {*} value - Value to hash
   * @returns {string} Hex-encoded hash
   */
  function hashValue(value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return crypto.createHash('sha256').update(stringValue).digest('hex');
  }

  /**
   * Generates a secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Hex-encoded token
   */
  function generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hashes a password with bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async function hashPassword(password) {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 12);
  }

  /**
   * Verifies a password against a bcrypt hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} Whether password matches
   */
  async function verifyPassword(password, hash) {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Encrypts data using a one-time pad (for small data)
   * @param {Buffer} data - Data to encrypt
   * @param {Buffer} pad - One-time pad (must be same length as data)
   * @returns {Buffer} Encrypted data
   */
  function oneTimePadEncrypt(data, pad) {
    if (data.length !== pad.length) {
      throw new Error('Pad must be same length as data');
    }
    return Buffer.xor(data, pad);
  }

  /**
   * Decrypts data encrypted with one-time pad
   * @param {Buffer} encrypted - Encrypted data
   * @param {Buffer} pad - One-time pad used for encryption
   * @returns {Buffer} Decrypted data
   */
  function oneTimePadDecrypt(encrypted, pad) {
    return Buffer.xor(encrypted, pad);
  }

  /**
   * Creates a message authentication code for data integrity
   * @param {*} data - Data to MAC
   * @param {string} key - Secret key
   * @returns {string} Hex-encoded MAC
   */
  function createMAC(data, key) {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(stringData);
    return hmac.digest('hex');
  }

  /**
   * Verifies a message authentication code
   * @param {*} data - Original data
   * @param {string} mac - MAC to verify
   * @param {string} key - Secret key
   * @returns {boolean} Whether MAC is valid
   */
  function verifyMAC(data, mac, key) {
    const computedMAC = createMAC(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(mac, 'hex'),
      Buffer.from(computedMAC, 'hex')
    );
  }

  return {
    applyEncryption,
    determineEncryptionRequirements,
    encryptField,
    decryptField,
    deriveKey,
    generateKey,
    hashValue,
    generateToken,
    hashPassword,
    verifyPassword,
    oneTimePadEncrypt,
    oneTimePadDecrypt,
    createMAC,
    verifyMAC,
    ALGORITHM,
    IV_LENGTH,
    TAG_LENGTH
  };
}

export default {
  createEncryptionModule
};
