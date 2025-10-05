/**
 * Secure Credential Storage Service
 * Manages OAuth tokens and sensitive credentials with encryption at rest
 *
 * Features:
 * - AES-256 encryption for tokens at rest
 * - Key rotation with versioning
 * - Token expiration tracking
 * - Automatic cleanup of expired tokens
 * - Secure token refresh capabilities
 * - Audit logging for all token operations
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { cacheService } from './cacheService.js';
import { logSecurityAudit } from '../middleware/integrationSecurity.js';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Token storage configuration
const TOKEN_CACHE_TTL = 3600; // 1 hour cache
const REFRESH_THRESHOLD = 300; // 5 minutes before expiry
const CLEANUP_INTERVAL = 3600000; // 1 hour cleanup cycle

class SecureCredentialStorage {
  constructor() {
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.tokenStore = new Map(); // In-memory store (use Redis in production)
    this.keyVersion = 1;

    // Start cleanup cycle
    this.startCleanupCycle();

    logger.info('SecureCredentialStorage initialized');
  }

  /**
   * Store OAuth token securely with encryption
   */
  async storeToken(userId, service, tokenData) {
    try {
      const tokenId = this.generateTokenId(userId, service);

      // Validate token data
      this.validateTokenData(tokenData);

      // Encrypt sensitive token data
      const encryptedData = this.encryptTokenData(tokenData);

      // Prepare storage object
      const storageObject = {
        id: tokenId,
        userId,
        service,
        encryptedData,
        keyVersion: this.keyVersion,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: tokenData.expiresAt || this.calculateExpiry(tokenData.expiresIn),
        scopes: tokenData.scopes || [],
        metadata: {
          userAgent: tokenData.userAgent,
          ipAddress: tokenData.ipAddress,
          grantType: tokenData.grantType || 'authorization_code'
        }
      };

      // Store in memory (replace with database in production)
      this.tokenStore.set(tokenId, storageObject);

      // Cache for quick access
      await this.cacheToken(tokenId, storageObject);

      // Log security event
      logSecurityAudit('TOKEN_STORED', {
        userId,
        service,
        tokenId,
        scopes: tokenData.scopes,
        expiresAt: storageObject.expiresAt,
        timestamp: new Date().toISOString()
      });

      logger.info(`Token stored securely for user ${userId}, service ${service}`);

      return {
        tokenId,
        expiresAt: storageObject.expiresAt,
        scopes: storageObject.scopes
      };

    } catch (error) {
      logSecurityAudit('TOKEN_STORAGE_FAILED', {
        userId,
        service,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.error('Failed to store token:', error);
      throw new Error(`Token storage failed: ${error.message}`);
    }
  }

  /**
   * Retrieve and decrypt OAuth token
   */
  async getToken(userId, service) {
    try {
      const tokenId = this.generateTokenId(userId, service);

      // Try cache first
      let storageObject = await this.getCachedToken(tokenId);

      if (!storageObject) {
        // Fetch from persistent store
        storageObject = this.tokenStore.get(tokenId);

        if (!storageObject) {
          logger.debug(`No token found for user ${userId}, service ${service}`);
          return null;
        }

        // Update cache
        await this.cacheToken(tokenId, storageObject);
      }

      // Check if token is expired
      if (this.isTokenExpired(storageObject)) {
        logger.info(`Token expired for user ${userId}, service ${service}`);
        await this.removeToken(userId, service);
        return null;
      }

      // Decrypt token data
      const decryptedData = this.decryptTokenData(storageObject.encryptedData, storageObject.keyVersion);

      // Log access
      logSecurityAudit('TOKEN_ACCESSED', {
        userId,
        service,
        tokenId,
        expiresAt: storageObject.expiresAt,
        timestamp: new Date().toISOString()
      });

      return {
        ...decryptedData,
        expiresAt: storageObject.expiresAt,
        scopes: storageObject.scopes,
        metadata: storageObject.metadata
      };

    } catch (error) {
      logSecurityAudit('TOKEN_RETRIEVAL_FAILED', {
        userId,
        service,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.error('Failed to retrieve token:', error);
      throw new Error(`Token retrieval failed: ${error.message}`);
    }
  }

  /**
   * Update existing token (for refresh scenarios)
   */
  async updateToken(userId, service, newTokenData) {
    try {
      const tokenId = this.generateTokenId(userId, service);
      const existingToken = this.tokenStore.get(tokenId);

      if (!existingToken) {
        throw new Error('Token not found for update');
      }

      // Merge with existing data
      const mergedData = {
        ...this.decryptTokenData(existingToken.encryptedData, existingToken.keyVersion),
        ...newTokenData
      };

      // Re-encrypt with current key
      const encryptedData = this.encryptTokenData(mergedData);

      // Update storage object
      const updatedObject = {
        ...existingToken,
        encryptedData,
        keyVersion: this.keyVersion,
        updatedAt: new Date().toISOString(),
        expiresAt: newTokenData.expiresAt || this.calculateExpiry(newTokenData.expiresIn) || existingToken.expiresAt
      };

      // Update stores
      this.tokenStore.set(tokenId, updatedObject);
      await this.cacheToken(tokenId, updatedObject);

      logSecurityAudit('TOKEN_UPDATED', {
        userId,
        service,
        tokenId,
        expiresAt: updatedObject.expiresAt,
        timestamp: new Date().toISOString()
      });

      logger.info(`Token updated for user ${userId}, service ${service}`);

      return updatedObject.expiresAt;

    } catch (error) {
      logSecurityAudit('TOKEN_UPDATE_FAILED', {
        userId,
        service,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.error('Failed to update token:', error);
      throw new Error(`Token update failed: ${error.message}`);
    }
  }

  /**
   * Remove token from storage
   */
  async removeToken(userId, service) {
    try {
      const tokenId = this.generateTokenId(userId, service);

      // Remove from stores
      this.tokenStore.delete(tokenId);
      await this.removeCachedToken(tokenId);

      logSecurityAudit('TOKEN_REMOVED', {
        userId,
        service,
        tokenId,
        timestamp: new Date().toISOString()
      });

      logger.info(`Token removed for user ${userId}, service ${service}`);
      return true;

    } catch (error) {
      logSecurityAudit('TOKEN_REMOVAL_FAILED', {
        userId,
        service,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.error('Failed to remove token:', error);
      return false;
    }
  }

  /**
   * Get all tokens for a user
   */
  async getUserTokens(userId) {
    try {
      const userTokens = {};

      for (const [tokenId, storageObject] of this.tokenStore.entries()) {
        if (storageObject.userId === userId && !this.isTokenExpired(storageObject)) {
          try {
            const decryptedData = this.decryptTokenData(storageObject.encryptedData, storageObject.keyVersion);
            userTokens[storageObject.service] = {
              ...decryptedData,
              expiresAt: storageObject.expiresAt,
              scopes: storageObject.scopes
            };
          } catch (decryptError) {
            logger.warn(`Failed to decrypt token for service ${storageObject.service}:`, decryptError);
          }
        }
      }

      logSecurityAudit('USER_TOKENS_ACCESSED', {
        userId,
        services: Object.keys(userTokens),
        timestamp: new Date().toISOString()
      });

      return userTokens;

    } catch (error) {
      logger.error('Failed to get user tokens:', error);
      return {};
    }
  }

  /**
   * Check if token needs refresh
   */
  async needsRefresh(userId, service) {
    const token = await this.getToken(userId, service);

    if (!token || !token.expiresAt) {
      return false;
    }

    const expiryTime = new Date(token.expiresAt);
    const now = new Date();
    const timeUntilExpiry = (expiryTime - now) / 1000;

    return timeUntilExpiry < REFRESH_THRESHOLD;
  }

  /**
   * Rotate encryption key (for security maintenance)
   */
  async rotateEncryptionKey() {
    try {
      const oldKeyVersion = this.keyVersion;
      const oldKey = this.encryptionKey;

      // Generate new key
      this.encryptionKey = crypto.randomBytes(KEY_LENGTH);
      this.keyVersion += 1;

      // Re-encrypt all tokens with new key
      const reencryptedCount = await this.reencryptAllTokens(oldKey, oldKeyVersion);

      logSecurityAudit('ENCRYPTION_KEY_ROTATED', {
        oldKeyVersion,
        newKeyVersion: this.keyVersion,
        tokensReencrypted: reencryptedCount,
        timestamp: new Date().toISOString()
      });

      logger.info(`Encryption key rotated. Re-encrypted ${reencryptedCount} tokens.`);

    } catch (error) {
      logger.error('Failed to rotate encryption key:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  getOrCreateEncryptionKey() {
    const keyFromEnv = process.env.TOKEN_ENCRYPTION_KEY;

    if (keyFromEnv) {
      return Buffer.from(keyFromEnv, 'hex');
    }

    // Generate new key (store this securely in production)
    const newKey = crypto.randomBytes(KEY_LENGTH);
    logger.warn('Generated new encryption key. Store TOKEN_ENCRYPTION_KEY in environment variables.');
    logger.debug(`TOKEN_ENCRYPTION_KEY=${newKey.toString('hex')}`);

    return newKey;
  }

  generateTokenId(userId, service) {
    return crypto.createHash('sha256').update(`${userId}:${service}`).digest('hex');
  }

  validateTokenData(tokenData) {
    if (!tokenData.accessToken) {
      throw new Error('Access token is required');
    }

    if (tokenData.accessToken.length < 10) {
      throw new Error('Access token appears to be invalid');
    }
  }

  encryptTokenData(tokenData) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, this.encryptionKey);
    cipher.setAAD(Buffer.from('token-data'));

    const dataString = JSON.stringify(tokenData);
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decryptTokenData(encryptedData, keyVersion) {
    // In production, you'd fetch the appropriate key for the version
    const key = keyVersion === this.keyVersion ? this.encryptionKey : this.encryptionKey;

    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
    decipher.setAAD(Buffer.from('token-data'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  calculateExpiry(expiresIn) {
    if (!expiresIn) return null;

    const now = new Date();
    const expiryDate = new Date(now.getTime() + (expiresIn * 1000));
    return expiryDate.toISOString();
  }

  isTokenExpired(storageObject) {
    if (!storageObject.expiresAt) return false;
    return new Date() > new Date(storageObject.expiresAt);
  }

  async cacheToken(tokenId, storageObject) {
    try {
      const cacheKey = `secure_token:${tokenId}`;
      await cacheService.set(cacheKey, storageObject, TOKEN_CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to cache token:', error.message);
    }
  }

  async getCachedToken(tokenId) {
    try {
      const cacheKey = `secure_token:${tokenId}`;
      return await cacheService.get(cacheKey);
    } catch (error) {
      logger.debug('Cache miss for token:', error.message);
      return null;
    }
  }

  async removeCachedToken(tokenId) {
    try {
      const cacheKey = `secure_token:${tokenId}`;
      await cacheService.delete(cacheKey);
    } catch (error) {
      logger.warn('Failed to remove cached token:', error.message);
    }
  }

  async reencryptAllTokens(oldKey, oldKeyVersion) {
    let count = 0;

    for (const [tokenId, storageObject] of this.tokenStore.entries()) {
      if (storageObject.keyVersion === oldKeyVersion) {
        try {
          // Decrypt with old key
          const tokenData = this.decryptTokenDataWithKey(storageObject.encryptedData, oldKey);

          // Re-encrypt with new key
          const newEncryptedData = this.encryptTokenData(tokenData);

          // Update storage object
          storageObject.encryptedData = newEncryptedData;
          storageObject.keyVersion = this.keyVersion;
          storageObject.updatedAt = new Date().toISOString();

          this.tokenStore.set(tokenId, storageObject);
          count++;

        } catch (error) {
          logger.error(`Failed to re-encrypt token ${tokenId}:`, error);
        }
      }
    }

    return count;
  }

  decryptTokenDataWithKey(encryptedData, key) {
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
    decipher.setAAD(Buffer.from('token-data'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  startCleanupCycle() {
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, CLEANUP_INTERVAL);
  }

  async cleanupExpiredTokens() {
    try {
      let cleanedCount = 0;

      for (const [tokenId, storageObject] of this.tokenStore.entries()) {
        if (this.isTokenExpired(storageObject)) {
          this.tokenStore.delete(tokenId);
          await this.removeCachedToken(tokenId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired tokens`);

        logSecurityAudit('EXPIRED_TOKENS_CLEANED', {
          count: cleanedCount,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Failed to cleanup expired tokens:', error);
    }
  }
}

// Create singleton instance
const secureCredentialStorage = new SecureCredentialStorage();

export default secureCredentialStorage;
export { SecureCredentialStorage };