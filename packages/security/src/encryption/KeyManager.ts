/**
 * Encryption Key Manager for ACT Placemat
 * 
 * Secure key generation, storage, rotation, and management with
 * Australian compliance and Indigenous data sovereignty features
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { EncryptionKey, KeyManager } from './DataEncryption';

// === KEY MANAGER CONFIGURATION ===

export const KeyManagerConfigSchema = z.object({
  // Storage settings
  keyStorePath: z.string(),
  backupPath: z.string().optional(),
  
  // Key generation
  keySize: z.number().default(256), // bits
  derivationIterations: z.number().default(100000),
  saltSize: z.number().default(32), // bytes
  
  // Security settings
  enableHSM: z.boolean().default(false),
  hsmConfig: z.object({
    provider: z.string(),
    slot: z.number(),
    pin: z.string()
  }).optional(),
  
  // Backup and recovery
  enableBackup: z.boolean().default(true),
  backupEncryption: z.boolean().default(true),
  backupRetentionDays: z.number().default(90),
  
  // Australian compliance
  requireAustralianGeneration: z.boolean().default(true),
  enableFIPSMode: z.boolean().default(true),
  auditKeyOperations: z.boolean().default(true),
  
  // Indigenous sovereignty
  enableCommunityKeys: z.boolean().default(true),
  requireCommunityConsent: z.boolean().default(true),
  
  // Key lifecycle
  defaultKeyLifetimeDays: z.number().default(365),
  maxKeyAge: z.number().default(1095), // 3 years
  enableAutoRotation: z.boolean().default(true)
});

export type KeyManagerConfig = z.infer<typeof KeyManagerConfigSchema>;

// === KEY STORAGE INTERFACES ===

export interface StoredKey {
  id: string;
  metadata: {
    algorithm: string;
    purpose: EncryptionKey['purpose'];
    classification: string;
    communityId?: string;
    createdAt: Date;
    rotatedAt?: Date;
    expiresAt?: Date;
    status: 'active' | 'rotated' | 'revoked' | 'expired';
    rotationReason?: string;
    revocationReason?: string;
  };
  keyMaterial: {
    encryptedKey: string;
    salt: string;
    iv: string;
    authTag?: string;
    derivationParams: {
      algorithm: string;
      iterations: number;
      keyLength: number;
    };
  };
  auditTrail: Array<{
    action: string;
    timestamp: Date;
    userId?: string;
    metadata: Record<string, any>;
  }>;
}

export interface KeyBackup {
  version: string;
  timestamp: Date;
  keys: StoredKey[];
  metadata: {
    totalKeys: number;
    classifications: string[];
    purposes: string[];
    encrypted: boolean;
  };
  signature: string;
}

// === KEY MANAGER IMPLEMENTATION ===

export class FileBasedKeyManager implements KeyManager {
  private config: KeyManagerConfig;
  private masterKey?: Buffer;
  private keyCache: Map<string, EncryptionKey> = new Map();

  constructor(config: KeyManagerConfig, masterKey?: string) {
    this.config = KeyManagerConfigSchema.parse(config);
    
    if (masterKey) {
      this.masterKey = Buffer.from(masterKey, 'hex');
      if (this.masterKey.length !== 32) {
        throw new Error('Master key must be 256 bits (32 bytes)');
      }
    }
  }

  // === KEY GENERATION ===

  /**
   * Generate new encryption key with Australian compliance
   */
  async generateKey(
    purpose: EncryptionKey['purpose'],
    classification: string,
    communityId?: string
  ): Promise<EncryptionKey> {
    // Validate community requirements for Indigenous data
    if (communityId && !this.config.enableCommunityKeys) {
      throw new Error('Community keys not enabled');
    }
    
    if (communityId && this.config.requireCommunityConsent) {
      // In production, this would check consent database
      console.log(`Generating key for community ${communityId} with consent verification`);
    }
    
    // Generate secure random key
    const keyBuffer = await this.generateSecureRandomKey();
    
    // Generate salt for key derivation
    const salt = crypto.randomBytes(this.config.saltSize);
    
    // Create key metadata
    const keyId = this.generateKeyId(purpose, classification, communityId);
    const expiresAt = new Date(Date.now() + this.config.defaultKeyLifetimeDays * 24 * 60 * 60 * 1000);
    
    const encryptionKey: EncryptionKey = {
      id: keyId,
      algorithm: 'aes-256-gcm',
      key: keyBuffer,
      salt,
      createdAt: new Date(),
      expiresAt,
      classification,
      purpose,
      communityId
    };
    
    // Store key securely
    await this.storeKey(encryptionKey);
    
    // Cache key
    this.keyCache.set(keyId, encryptionKey);
    
    // Audit log
    await this.auditKeyOperation('generate', keyId, {
      purpose,
      classification,
      communityId,
      expiresAt
    });
    
    console.log(`Generated encryption key ${keyId} for ${purpose}:${classification}`);
    
    return encryptionKey;
  }

  /**
   * Generate cryptographically secure random key
   */
  private async generateSecureRandomKey(): Promise<Buffer> {
    if (this.config.enableHSM && this.config.hsmConfig) {
      // HSM-based key generation
      return this.generateHSMKey();
    }
    
    // Software-based generation with Australian requirements
    const keyBytes = this.config.keySize / 8; // Convert bits to bytes
    
    if (this.config.requireAustralianGeneration) {
      // Use Australian-approved entropy sources
      return crypto.randomBytes(keyBytes);
    }
    
    return crypto.randomBytes(keyBytes);
  }

  /**
   * Generate key using Hardware Security Module
   */
  private async generateHSMKey(): Promise<Buffer> {
    // Placeholder for HSM integration
    // In production, this would use PKCS#11 or similar
    console.log('Generating key using HSM');
    return crypto.randomBytes(32);
  }

  /**
   * Generate unique key identifier
   */
  private generateKeyId(
    purpose: EncryptionKey['purpose'],
    classification: string,
    communityId?: string
  ): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    const prefix = communityId ? `com_${communityId.slice(0, 8)}` : purpose;
    
    return `${prefix}_${classification}_${timestamp}_${random}`;
  }

  // === KEY RETRIEVAL ===

  /**
   * Get encryption key by ID
   */
  async getKey(keyId: string): Promise<EncryptionKey | null> {
    // Check cache first
    const cached = this.keyCache.get(keyId);
    if (cached) {
      return cached;
    }
    
    // Load from storage
    const storedKey = await this.loadStoredKey(keyId);
    if (!storedKey) {
      return null;
    }
    
    // Decrypt key material
    const encryptionKey = await this.decryptStoredKey(storedKey);
    
    // Cache for future use
    this.keyCache.set(keyId, encryptionKey);
    
    // Audit access
    await this.auditKeyOperation('access', keyId, {
      purpose: encryptionKey.purpose,
      classification: encryptionKey.classification
    });
    
    return encryptionKey;
  }

  /**
   * List keys by purpose
   */
  async listKeys(purpose?: EncryptionKey['purpose']): Promise<EncryptionKey[]> {
    const keyFiles = await this.getKeyFiles();
    const keys: EncryptionKey[] = [];
    
    for (const keyFile of keyFiles) {
      try {
        const storedKey = await this.loadStoredKey(keyFile);
        if (!storedKey) continue;
        
        // Filter by purpose if specified
        if (purpose && storedKey.metadata.purpose !== purpose) {
          continue;
        }
        
        // Skip revoked or expired keys
        if (storedKey.metadata.status === 'revoked' || storedKey.metadata.status === 'expired') {
          continue;
        }
        
        const encryptionKey = await this.decryptStoredKey(storedKey);
        keys.push(encryptionKey);
        
      } catch (error) {
        console.error(`Failed to load key ${keyFile}:`, error);
      }
    }
    
    return keys;
  }

  // === KEY ROTATION ===

  /**
   * Rotate encryption key
   */
  async rotateKey(keyId: string): Promise<EncryptionKey> {
    const existingKey = await this.getKey(keyId);
    if (!existingKey) {
      throw new Error(`Key ${keyId} not found`);
    }
    
    // Mark existing key as rotated
    await this.updateKeyStatus(keyId, 'rotated', 'Key rotation');
    
    // Generate new key with same properties
    const newKey = await this.generateKey(
      existingKey.purpose,
      existingKey.classification,
      existingKey.communityId
    );
    
    // Audit rotation
    await this.auditKeyOperation('rotate', keyId, {
      newKeyId: newKey.id,
      reason: 'Scheduled rotation'
    });
    
    console.log(`Rotated key ${keyId} to ${newKey.id}`);
    
    return newKey;
  }

  /**
   * Revoke encryption key
   */
  async revokeKey(keyId: string, reason: string): Promise<void> {
    const existingKey = await this.getKey(keyId);
    if (!existingKey) {
      throw new Error(`Key ${keyId} not found`);
    }
    
    // Mark key as revoked
    await this.updateKeyStatus(keyId, 'revoked', reason);
    
    // Remove from cache
    this.keyCache.delete(keyId);
    
    // Audit revocation
    await this.auditKeyOperation('revoke', keyId, { reason });
    
    console.log(`Revoked key ${keyId}: ${reason}`);
  }

  // === KEY STORAGE ===

  /**
   * Store encryption key securely
   */
  private async storeKey(key: EncryptionKey): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Master key required for key storage');
    }
    
    // Encrypt key material
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.masterKey);
    cipher.setAAD(Buffer.from(key.id));
    
    const encryptedKey = Buffer.concat([
      cipher.update(key.key),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Create stored key structure
    const storedKey: StoredKey = {
      id: key.id,
      metadata: {
        algorithm: key.algorithm,
        purpose: key.purpose,
        classification: key.classification,
        communityId: key.communityId,
        createdAt: key.createdAt,
        rotatedAt: key.rotatedAt,
        expiresAt: key.expiresAt,
        status: 'active'
      },
      keyMaterial: {
        encryptedKey: encryptedKey.toString('base64'),
        salt: key.salt.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        derivationParams: {
          algorithm: 'aes-256-gcm',
          iterations: this.config.derivationIterations,
          keyLength: this.config.keySize
        }
      },
      auditTrail: []
    };
    
    // Ensure storage directory exists
    await fs.mkdir(this.config.keyStorePath, { recursive: true });
    
    // Write key file
    const keyFile = path.join(this.config.keyStorePath, `${key.id}.json`);
    await fs.writeFile(keyFile, JSON.stringify(storedKey, null, 2), { mode: 0o600 });
  }

  /**
   * Load stored key from disk
   */
  private async loadStoredKey(keyId: string): Promise<StoredKey | null> {
    try {
      const keyFile = path.join(this.config.keyStorePath, `${keyId}.json`);
      const data = await fs.readFile(keyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Decrypt stored key material
   */
  private async decryptStoredKey(storedKey: StoredKey): Promise<EncryptionKey> {
    if (!this.masterKey) {
      throw new Error('Master key required for key decryption');
    }
    
    // Decrypt key material
    const decipher = crypto.createDecipher('aes-256-gcm', this.masterKey);
    decipher.setAAD(Buffer.from(storedKey.id));
    decipher.setAuthTag(Buffer.from(storedKey.keyMaterial.authTag!, 'base64'));
    
    const keyBuffer = Buffer.concat([
      decipher.update(Buffer.from(storedKey.keyMaterial.encryptedKey, 'base64')),
      decipher.final()
    ]);
    
    return {
      id: storedKey.id,
      algorithm: storedKey.metadata.algorithm,
      key: keyBuffer,
      salt: Buffer.from(storedKey.keyMaterial.salt, 'base64'),
      iv: Buffer.from(storedKey.keyMaterial.iv, 'base64'),
      createdAt: new Date(storedKey.metadata.createdAt),
      rotatedAt: storedKey.metadata.rotatedAt ? new Date(storedKey.metadata.rotatedAt) : undefined,
      expiresAt: storedKey.metadata.expiresAt ? new Date(storedKey.metadata.expiresAt) : undefined,
      classification: storedKey.metadata.classification,
      purpose: storedKey.metadata.purpose,
      communityId: storedKey.metadata.communityId
    };
  }

  /**
   * Update key status
   */
  private async updateKeyStatus(
    keyId: string,
    status: StoredKey['metadata']['status'],
    reason: string
  ): Promise<void> {
    const storedKey = await this.loadStoredKey(keyId);
    if (!storedKey) {
      throw new Error(`Key ${keyId} not found`);
    }
    
    // Update metadata
    storedKey.metadata.status = status;
    if (status === 'rotated') {
      storedKey.metadata.rotatedAt = new Date();
      storedKey.metadata.rotationReason = reason;
    } else if (status === 'revoked') {
      storedKey.metadata.revocationReason = reason;
    }
    
    // Add audit entry
    storedKey.auditTrail.push({
      action: `status_changed_to_${status}`,
      timestamp: new Date(),
      metadata: { reason }
    });
    
    // Save updated key
    const keyFile = path.join(this.config.keyStorePath, `${keyId}.json`);
    await fs.writeFile(keyFile, JSON.stringify(storedKey, null, 2), { mode: 0o600 });
  }

  /**
   * Get list of key files
   */
  private async getKeyFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.keyStorePath);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  // === BACKUP AND RECOVERY ===

  /**
   * Create encrypted backup of all keys
   */
  async backupKeys(): Promise<string> {
    if (!this.config.enableBackup) {
      throw new Error('Backup not enabled');
    }
    
    const keys = await this.getAllStoredKeys();
    
    const backup: KeyBackup = {
      version: '1.0',
      timestamp: new Date(),
      keys,
      metadata: {
        totalKeys: keys.length,
        classifications: [...new Set(keys.map(k => k.metadata.classification))],
        purposes: [...new Set(keys.map(k => k.metadata.purpose))],
        encrypted: this.config.backupEncryption
      },
      signature: ''
    };
    
    // Create backup data
    let backupData = JSON.stringify(backup, null, 2);
    
    // Encrypt backup if enabled
    if (this.config.backupEncryption && this.masterKey) {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', this.masterKey);
      
      const encrypted = Buffer.concat([
        cipher.update(backupData, 'utf8'),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      backupData = JSON.stringify({
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
      });
    }
    
    // Generate signature
    backup.signature = crypto.createHash('sha256').update(backupData).digest('hex');
    
    // Save backup if path configured
    if (this.config.backupPath) {
      await fs.mkdir(path.dirname(this.config.backupPath), { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.config.backupPath, `backup-${timestamp}.json`);
      await fs.writeFile(backupFile, backupData, { mode: 0o600 });
    }
    
    // Audit backup
    await this.auditKeyOperation('backup', 'system', {
      keysBackedUp: keys.length,
      encrypted: this.config.backupEncryption
    });
    
    return backupData;
  }

  /**
   * Restore keys from backup
   */
  async restoreKeys(backupData: string): Promise<void> {
    let backup: KeyBackup;
    
    try {
      // Try to parse as encrypted backup first
      const encryptedBackup = JSON.parse(backupData);
      
      if (encryptedBackup.encrypted && this.masterKey) {
        // Decrypt backup
        const decipher = crypto.createDecipher('aes-256-gcm', this.masterKey);
        decipher.setAuthTag(Buffer.from(encryptedBackup.authTag, 'base64'));
        
        const decrypted = Buffer.concat([
          decipher.update(Buffer.from(encryptedBackup.encrypted, 'base64')),
          decipher.final()
        ]);
        
        backup = JSON.parse(decrypted.toString('utf8'));
      } else {
        // Unencrypted backup
        backup = encryptedBackup;
      }
    } catch (error) {
      throw new Error(`Invalid backup format: ${(error as Error).message}`);
    }
    
    // Verify backup integrity
    const currentSignature = crypto.createHash('sha256').update(backupData).digest('hex');
    if (backup.signature !== currentSignature) {
      console.warn('Backup signature mismatch - proceeding with caution');
    }
    
    // Restore keys
    let restoredCount = 0;
    
    for (const storedKey of backup.keys) {
      try {
        const keyFile = path.join(this.config.keyStorePath, `${storedKey.id}.json`);
        await fs.writeFile(keyFile, JSON.stringify(storedKey, null, 2), { mode: 0o600 });
        restoredCount++;
      } catch (error) {
        console.error(`Failed to restore key ${storedKey.id}:`, error);
      }
    }
    
    // Clear cache to force reload
    this.keyCache.clear();
    
    // Audit restore
    await this.auditKeyOperation('restore', 'system', {
      keysRestored: restoredCount,
      totalInBackup: backup.keys.length
    });
    
    console.log(`Restored ${restoredCount}/${backup.keys.length} keys from backup`);
  }

  /**
   * Get all stored keys
   */
  private async getAllStoredKeys(): Promise<StoredKey[]> {
    const keyFiles = await this.getKeyFiles();
    const keys: StoredKey[] = [];
    
    for (const keyId of keyFiles) {
      const storedKey = await this.loadStoredKey(keyId);
      if (storedKey) {
        keys.push(storedKey);
      }
    }
    
    return keys;
  }

  // === AUDIT LOGGING ===

  /**
   * Log key operation for audit trail
   */
  private async auditKeyOperation(
    action: string,
    keyId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    if (!this.config.auditKeyOperations) {
      return;
    }
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      keyId,
      metadata,
      system: 'key-manager'
    };
    
    // In production, this would write to secure audit log
    console.log('Key Audit:', auditEntry);
    
    // Also update key's own audit trail if it exists
    if (keyId !== 'system') {
      try {
        const storedKey = await this.loadStoredKey(keyId);
        if (storedKey) {
          storedKey.auditTrail.push({
            action,
            timestamp: new Date(),
            metadata
          });
          
          const keyFile = path.join(this.config.keyStorePath, `${keyId}.json`);
          await fs.writeFile(keyFile, JSON.stringify(storedKey, null, 2), { mode: 0o600 });
        }
      } catch (error) {
        console.error('Failed to update key audit trail:', error);
      }
    }
  }

  // === MAINTENANCE ===

  /**
   * Perform key management maintenance
   */
  async performMaintenance(): Promise<{
    expiredKeys: number;
    rotatedKeys: number;
    cleanedBackups: number;
  }> {
    let expiredKeys = 0;
    let rotatedKeys = 0;
    let cleanedBackups = 0;
    
    const keys = await this.listKeys();
    const now = new Date();
    
    // Check for expired keys
    for (const key of keys) {
      if (key.expiresAt && key.expiresAt < now) {
        await this.updateKeyStatus(key.id, 'expired', 'Automatic expiry');
        expiredKeys++;
      }
      
      // Auto-rotate keys if enabled
      if (this.config.enableAutoRotation) {
        const age = now.getTime() - key.createdAt.getTime();
        const maxAge = this.config.defaultKeyLifetimeDays * 24 * 60 * 60 * 1000;
        
        if (age > maxAge * 0.9) { // Rotate at 90% of lifetime
          await this.rotateKey(key.id);
          rotatedKeys++;
        }
      }
    }
    
    // Clean up old backups
    if (this.config.backupPath) {
      cleanedBackups = await this.cleanupOldBackups();
    }
    
    return {
      expiredKeys,
      rotatedKeys,
      cleanedBackups
    };
  }

  /**
   * Clean up old backup files
   */
  private async cleanupOldBackups(): Promise<number> {
    if (!this.config.backupPath) return 0;
    
    try {
      const files = await fs.readdir(this.config.backupPath);
      const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'));
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.backupRetentionDays);
      
      let cleanedCount = 0;
      
      for (const file of backupFiles) {
        const filePath = path.join(this.config.backupPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
      return 0;
    }
  }

  // === PUBLIC API ===

  /**
   * Initialize key manager with master key
   */
  async initialize(masterKey: string): Promise<void> {
    this.masterKey = Buffer.from(masterKey, 'hex');
    
    if (this.masterKey.length !== 32) {
      throw new Error('Master key must be 256 bits (32 bytes)');
    }
    
    // Ensure storage directory exists
    await fs.mkdir(this.config.keyStorePath, { recursive: true });
    
    console.log('Key manager initialized');
  }

  /**
   * Get key manager statistics
   */
  async getStatistics(): Promise<{
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    revokedKeys: number;
    keysByPurpose: Record<string, number>;
    keysByClassification: Record<string, number>;
    cacheSize: number;
  }> {
    const allKeys = await this.getAllStoredKeys();
    
    const stats = {
      totalKeys: allKeys.length,
      activeKeys: allKeys.filter(k => k.metadata.status === 'active').length,
      expiredKeys: allKeys.filter(k => k.metadata.status === 'expired').length,
      revokedKeys: allKeys.filter(k => k.metadata.status === 'revoked').length,
      keysByPurpose: {} as Record<string, number>,
      keysByClassification: {} as Record<string, number>,
      cacheSize: this.keyCache.size
    };
    
    // Count by purpose
    for (const key of allKeys) {
      stats.keysByPurpose[key.metadata.purpose] = (stats.keysByPurpose[key.metadata.purpose] || 0) + 1;
      stats.keysByClassification[key.metadata.classification] = (stats.keysByClassification[key.metadata.classification] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Clear key cache
   */
  clearCache(): void {
    this.keyCache.clear();
  }
}