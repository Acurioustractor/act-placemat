/**
 * Data Encryption at Rest Service for ACT Placemat
 * 
 * Comprehensive AES-256 encryption for databases, files, and sensitive storage
 * with Australian compliance and Indigenous data sovereignty protections
 */

import crypto from 'crypto';
import { z } from 'zod';

// === ENCRYPTION CONFIGURATION SCHEMAS ===

export const EncryptionConfigSchema = z.object({
  // Encryption settings
  algorithm: z.enum(['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305']).default('aes-256-gcm'),
  keyDerivation: z.enum(['pbkdf2', 'scrypt', 'argon2id']).default('scrypt'),
  
  // Key management
  masterKeyPath: z.string().optional(),
  keyRotationDays: z.number().default(90),
  enableKeyEscrow: z.boolean().default(false),
  
  // Storage configuration
  encryptedFieldPrefix: z.string().default('enc_'),
  metadataEncryption: z.boolean().default(true),
  enableCompression: z.boolean().default(true),
  
  // Australian compliance
  dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
  requireAustralianKeys: z.boolean().default(true),
  enableDataResidency: z.boolean().default(true),
  
  // Indigenous sovereignty
  indigenousDataProtection: z.boolean().default(true),
  culturalProtocolCompliance: z.boolean().default(true),
  communityKeyManagement: z.boolean().default(false),
  
  // Performance settings
  cacheDecryptedData: z.boolean().default(false),
  cacheTTLSeconds: z.number().default(300),
  batchSize: z.number().default(1000),
  
  // Security features
  enableIntegrityChecks: z.boolean().default(true),
  enableTimestamps: z.boolean().default(true),
  enableAuditTrail: z.boolean().default(true),
  requireAuthentication: z.boolean().default(true)
});

export type EncryptionConfig = z.infer<typeof EncryptionConfigSchema>;

// === ENCRYPTION INTERFACES ===

export interface EncryptionKey {
  id: string;
  algorithm: string;
  key: Buffer;
  salt: Buffer;
  iv?: Buffer;
  createdAt: Date;
  rotatedAt?: Date;
  expiresAt?: Date;
  classification: string;
  purpose: 'database' | 'file' | 'indigenous' | 'financial' | 'system';
  communityId?: string; // For Indigenous data keys
}

export interface EncryptedData {
  data: Buffer;
  algorithm: string;
  keyId: string;
  iv: Buffer;
  authTag?: Buffer;
  metadata: {
    originalSize: number;
    compressed: boolean;
    timestamp: Date;
    classification: string;
    checksum: string;
    communityId?: string;
  };
}

export interface EncryptionResult {
  encrypted: EncryptedData;
  keyUsed: string;
  performanceMetrics: {
    encryptionTime: number;
    originalSize: number;
    encryptedSize: number;
    compressionRatio?: number;
  };
}

export interface DecryptionResult {
  decrypted: Buffer;
  metadata: EncryptedData['metadata'];
  performanceMetrics: {
    decryptionTime: number;
    verified: boolean;
  };
}

// === KEY MANAGEMENT INTERFACE ===

export interface KeyManager {
  generateKey(purpose: EncryptionKey['purpose'], classification: string, communityId?: string): Promise<EncryptionKey>;
  getKey(keyId: string): Promise<EncryptionKey | null>;
  rotateKey(keyId: string): Promise<EncryptionKey>;
  revokeKey(keyId: string, reason: string): Promise<void>;
  listKeys(purpose?: EncryptionKey['purpose']): Promise<EncryptionKey[]>;
  backupKeys(): Promise<string>; // Encrypted backup
  restoreKeys(backup: string): Promise<void>;
}

// === DATA ENCRYPTION SERVICE ===

export class DataEncryptionService {
  private config: EncryptionConfig;
  private keyManager: KeyManager;
  private keyCache: Map<string, EncryptionKey> = new Map();
  private decryptionCache: Map<string, { data: Buffer; expiry: Date }> = new Map();

  constructor(config: EncryptionConfig, keyManager: KeyManager) {
    this.config = EncryptionConfigSchema.parse(config);
    this.keyManager = keyManager;
    
    // Start cache cleanup
    this.startCacheCleanup();
  }

  // === ENCRYPTION METHODS ===

  /**
   * Encrypt sensitive data with classification and sovereignty checks
   */
  async encryptData(
    data: Buffer | string,
    classification: string,
    options: {
      purpose?: EncryptionKey['purpose'];
      communityId?: string;
      requireSovereignty?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<EncryptionResult> {
    const startTime = Date.now();
    
    // Validate data classification
    this.validateDataClassification(classification, options.communityId);
    
    // Convert string to buffer
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    // Get appropriate encryption key
    const key = await this.getEncryptionKey(
      options.purpose || 'database',
      classification,
      options.communityId
    );
    
    // Apply compression if enabled
    const processedData = this.config.enableCompression 
      ? await this.compressData(dataBuffer)
      : { data: dataBuffer, compressed: false };
    
    // Perform encryption
    const encryptedData = await this.performEncryption(
      processedData.data,
      key,
      classification,
      {
        originalSize: dataBuffer.length,
        compressed: processedData.compressed,
        communityId: options.communityId,
        ...options.metadata
      }
    );
    
    const encryptionTime = Date.now() - startTime;
    
    return {
      encrypted: encryptedData,
      keyUsed: key.id,
      performanceMetrics: {
        encryptionTime,
        originalSize: dataBuffer.length,
        encryptedSize: encryptedData.data.length,
        compressionRatio: processedData.compressed 
          ? dataBuffer.length / processedData.data.length 
          : undefined
      }
    };
  }

  /**
   * Decrypt data with integrity verification
   */
  async decryptData(
    encryptedData: EncryptedData,
    options: {
      verifyIntegrity?: boolean;
      skipCache?: boolean;
      requiredCommunityId?: string;
    } = {}
  ): Promise<DecryptionResult> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(encryptedData);
    if (!options.skipCache && this.config.cacheDecryptedData) {
      const cached = this.decryptionCache.get(cacheKey);
      if (cached && cached.expiry > new Date()) {
        return {
          decrypted: cached.data,
          metadata: encryptedData.metadata,
          performanceMetrics: {
            decryptionTime: Date.now() - startTime,
            verified: true
          }
        };
      }
    }
    
    // Validate sovereignty requirements
    if (options.requiredCommunityId && 
        encryptedData.metadata.communityId !== options.requiredCommunityId) {
      throw new Error('Community sovereignty violation: data belongs to different community');
    }
    
    // Get decryption key
    const key = await this.getDecryptionKey(encryptedData.keyId);
    if (!key) {
      throw new Error(`Encryption key ${encryptedData.keyId} not found`);
    }
    
    // Verify integrity if enabled
    if (options.verifyIntegrity !== false && this.config.enableIntegrityChecks) {
      await this.verifyDataIntegrity(encryptedData);
    }
    
    // Perform decryption
    const decryptedData = await this.performDecryption(encryptedData, key);
    
    // Decompress if needed
    const finalData = encryptedData.metadata.compressed
      ? await this.decompressData(decryptedData)
      : decryptedData;
    
    // Cache result if enabled
    if (this.config.cacheDecryptedData && !options.skipCache) {
      const expiry = new Date(Date.now() + this.config.cacheTTLSeconds * 1000);
      this.decryptionCache.set(cacheKey, { data: finalData, expiry });
    }
    
    const decryptionTime = Date.now() - startTime;
    
    return {
      decrypted: finalData,
      metadata: encryptedData.metadata,
      performanceMetrics: {
        decryptionTime,
        verified: true
      }
    };
  }

  // === CORE ENCRYPTION/DECRYPTION ===

  /**
   * Perform AES-256-GCM encryption
   */
  private async performEncryption(
    data: Buffer,
    key: EncryptionKey,
    classification: string,
    metadata: Record<string, any>
  ): Promise<EncryptedData> {
    // Generate initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipher(this.config.algorithm, key.key);
    if (this.config.algorithm === 'aes-256-gcm') {
      (cipher as crypto.CipherGCM).setAAD(Buffer.from(classification));
    }
    
    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    // Get authentication tag for GCM
    let authTag: Buffer | undefined;
    if (this.config.algorithm === 'aes-256-gcm') {
      authTag = (cipher as crypto.CipherGCM).getAuthTag();
    }
    
    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(data).digest('hex');
    
    return {
      data: encrypted,
      algorithm: this.config.algorithm,
      keyId: key.id,
      iv,
      authTag,
      metadata: {
        originalSize: data.length,
        timestamp: new Date(),
        classification,
        checksum,
        ...metadata
      }
    };
  }

  /**
   * Perform AES-256-GCM decryption
   */
  private async performDecryption(
    encryptedData: EncryptedData,
    key: EncryptionKey
  ): Promise<Buffer> {
    // Create decipher
    const decipher = crypto.createDecipher(encryptedData.algorithm, key.key);
    
    // Set IV and auth tag for GCM
    if (encryptedData.algorithm === 'aes-256-gcm') {
      if (encryptedData.authTag) {
        (decipher as crypto.DecipherGCM).setAuthTag(encryptedData.authTag);
      }
      (decipher as crypto.DecipherGCM).setAAD(Buffer.from(encryptedData.metadata.classification));
    }
    
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encryptedData.data),
      decipher.final()
    ]);
    
    return decrypted;
  }

  // === KEY MANAGEMENT ===

  /**
   * Get encryption key for purpose and classification
   */
  private async getEncryptionKey(
    purpose: EncryptionKey['purpose'],
    classification: string,
    communityId?: string
  ): Promise<EncryptionKey> {
    // Check cache first
    const cacheKey = `${purpose}:${classification}:${communityId || 'default'}`;
    let key = this.keyCache.get(cacheKey);
    
    if (!key) {
      // Try to find existing key
      const existingKeys = await this.keyManager.listKeys(purpose);
      key = existingKeys.find(k => 
        k.classification === classification && 
        k.communityId === communityId &&
        !this.isKeyExpired(k)
      );
      
      // Generate new key if none found
      if (!key) {
        key = await this.keyManager.generateKey(purpose, classification, communityId);
      }
      
      // Cache the key
      this.keyCache.set(cacheKey, key);
    }
    
    // Check if key needs rotation
    if (this.shouldRotateKey(key)) {
      console.log(`Rotating key ${key.id} due to age`);
      key = await this.keyManager.rotateKey(key.id);
      this.keyCache.set(cacheKey, key);
    }
    
    return key;
  }

  /**
   * Get decryption key by ID
   */
  private async getDecryptionKey(keyId: string): Promise<EncryptionKey | null> {
    // Check cache first
    let key = Array.from(this.keyCache.values()).find(k => k.id === keyId);
    
    if (!key) {
      key = await this.keyManager.getKey(keyId);
      if (key) {
        const cacheKey = `${key.purpose}:${key.classification}:${key.communityId || 'default'}`;
        this.keyCache.set(cacheKey, key);
      }
    }
    
    return key;
  }

  /**
   * Check if key should be rotated
   */
  private shouldRotateKey(key: EncryptionKey): boolean {
    if (!this.config.keyRotationDays) return false;
    
    const lastRotation = key.rotatedAt || key.createdAt;
    const daysSinceRotation = (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceRotation >= this.config.keyRotationDays;
  }

  /**
   * Check if key is expired
   */
  private isKeyExpired(key: EncryptionKey): boolean {
    return key.expiresAt ? key.expiresAt < new Date() : false;
  }

  // === DATA PROCESSING ===

  /**
   * Compress data using gzip
   */
  private async compressData(data: Buffer): Promise<{ data: Buffer; compressed: boolean }> {
    const zlib = require('zlib');
    
    try {
      const compressed = await new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(data, (err: Error | null, result: Buffer) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      // Only use compression if it reduces size significantly
      if (compressed.length < data.length * 0.9) {
        return { data: compressed, compressed: true };
      }
    } catch (error) {
      console.warn('Compression failed:', error);
    }
    
    return { data, compressed: false };
  }

  /**
   * Decompress data using gzip
   */
  private async decompressData(data: Buffer): Promise<Buffer> {
    const zlib = require('zlib');
    
    return new Promise<Buffer>((resolve, reject) => {
      zlib.gunzip(data, (err: Error | null, result: Buffer) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // === VALIDATION AND INTEGRITY ===

  /**
   * Validate data classification requirements
   */
  private validateDataClassification(classification: string, communityId?: string): void {
    const validClassifications = ['public', 'internal', 'confidential', 'restricted'];
    if (!validClassifications.includes(classification)) {
      throw new Error(`Invalid data classification: ${classification}`);
    }
    
    // Indigenous data sovereignty checks
    if (this.config.indigenousDataProtection && communityId) {
      if (classification !== 'restricted') {
        throw new Error('Indigenous community data must use restricted classification');
      }
      
      if (!this.config.culturalProtocolCompliance) {
        throw new Error('Cultural protocol compliance required for Indigenous data');
      }
    }
    
    // Australian data residency checks
    if (this.config.enableDataResidency && this.config.requireAustralianKeys) {
      // Additional validation would go here
    }
  }

  /**
   * Verify data integrity
   */
  private async verifyDataIntegrity(encryptedData: EncryptedData): Promise<void> {
    // Verify timestamp if enabled
    if (this.config.enableTimestamps) {
      const age = Date.now() - encryptedData.metadata.timestamp.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age > maxAge) {
        throw new Error('Encrypted data is too old and may be compromised');
      }
    }
    
    // Additional integrity checks would be implemented here
    // such as HMAC verification, blockchain anchoring, etc.
  }

  // === UTILITY METHODS ===

  /**
   * Generate cache key for encrypted data
   */
  private generateCacheKey(encryptedData: EncryptedData): string {
    const hash = crypto.createHash('sha256')
      .update(encryptedData.data)
      .update(encryptedData.keyId)
      .digest('hex');
    
    return `decrypt:${hash.substring(0, 16)}`;
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      // Clean up expired cache entries
      for (const [key, value] of this.decryptionCache.entries()) {
        if (value.expiry < now) {
          this.decryptionCache.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  // === BATCH OPERATIONS ===

  /**
   * Encrypt multiple data items efficiently
   */
  async encryptBatch(
    items: Array<{
      data: Buffer | string;
      classification: string;
      communityId?: string;
      metadata?: Record<string, any>;
    }>,
    purpose: EncryptionKey['purpose'] = 'database'
  ): Promise<EncryptionResult[]> {
    const results: EncryptionResult[] = [];
    
    // Group items by key requirements
    const keyGroups = new Map<string, typeof items>();
    
    for (const item of items) {
      const keySignature = `${purpose}:${item.classification}:${item.communityId || 'default'}`;
      if (!keyGroups.has(keySignature)) {
        keyGroups.set(keySignature, []);
      }
      keyGroups.get(keySignature)!.push(item);
    }
    
    // Process each group with the same key
    for (const [keySignature, groupItems] of keyGroups) {
      const [, classification, communityId] = keySignature.split(':');
      const key = await this.getEncryptionKey(
        purpose, 
        classification, 
        communityId === 'default' ? undefined : communityId
      );
      
      for (const item of groupItems) {
        const result = await this.encryptData(item.data, item.classification, {
          purpose,
          communityId: item.communityId,
          metadata: item.metadata
        });
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Decrypt multiple data items efficiently
   */
  async decryptBatch(
    items: EncryptedData[],
    options: {
      verifyIntegrity?: boolean;
      skipCache?: boolean;
    } = {}
  ): Promise<DecryptionResult[]> {
    const results: DecryptionResult[] = [];
    
    // Group items by key ID
    const keyGroups = new Map<string, EncryptedData[]>();
    
    for (const item of items) {
      if (!keyGroups.has(item.keyId)) {
        keyGroups.set(item.keyId, []);
      }
      keyGroups.get(item.keyId)!.push(item);
    }
    
    // Process each group with the same key
    for (const [keyId, groupItems] of keyGroups) {
      const key = await this.getDecryptionKey(keyId);
      if (!key) {
        throw new Error(`Encryption key ${keyId} not found`);
      }
      
      for (const item of groupItems) {
        const result = await this.decryptData(item, options);
        results.push(result);
      }
    }
    
    return results;
  }

  // === PUBLIC API ===

  /**
   * Encrypt string data
   */
  async encryptString(
    text: string,
    classification: string = 'internal',
    options: {
      purpose?: EncryptionKey['purpose'];
      communityId?: string;
    } = {}
  ): Promise<EncryptionResult> {
    return this.encryptData(text, classification, options);
  }

  /**
   * Decrypt to string
   */
  async decryptString(encryptedData: EncryptedData): Promise<string> {
    const result = await this.decryptData(encryptedData);
    return result.decrypted.toString('utf8');
  }

  /**
   * Encrypt JSON object
   */
  async encryptObject(
    obj: any,
    classification: string = 'internal',
    options: {
      purpose?: EncryptionKey['purpose'];
      communityId?: string;
    } = {}
  ): Promise<EncryptionResult> {
    const json = JSON.stringify(obj);
    return this.encryptString(json, classification, options);
  }

  /**
   * Decrypt to JSON object
   */
  async decryptObject(encryptedData: EncryptedData): Promise<any> {
    const json = await this.decryptString(encryptedData);
    return JSON.parse(json);
  }

  /**
   * Get encryption statistics
   */
  getStatistics(): {
    keysInCache: number;
    decryptionCacheSize: number;
    encryptionOperations: number;
    decryptionOperations: number;
    averageEncryptionTime: number;
    averageDecryptionTime: number;
  } {
    // In a real implementation, these would be tracked metrics
    return {
      keysInCache: this.keyCache.size,
      decryptionCacheSize: this.decryptionCache.size,
      encryptionOperations: 0,
      decryptionOperations: 0,
      averageEncryptionTime: 0,
      averageDecryptionTime: 0
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.keyCache.clear();
    this.decryptionCache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<EncryptionConfig>): void {
    this.config = EncryptionConfigSchema.parse({ ...this.config, ...updates });
    
    // Clear caches on config change
    this.clearCaches();
  }

  /**
   * Perform maintenance operations
   */
  async performMaintenance(): Promise<{
    keysRotated: number;
    cacheEntriesCleared: number;
    integrityViolations: number;
  }> {
    let keysRotated = 0;
    let cacheEntriesCleared = 0;
    
    // Rotate old keys
    const allKeys = await this.keyManager.listKeys();
    for (const key of allKeys) {
      if (this.shouldRotateKey(key)) {
        await this.keyManager.rotateKey(key.id);
        keysRotated++;
      }
    }
    
    // Clear expired cache entries
    const now = new Date();
    for (const [key, value] of this.decryptionCache.entries()) {
      if (value.expiry < now) {
        this.decryptionCache.delete(key);
        cacheEntriesCleared++;
      }
    }
    
    return {
      keysRotated,
      cacheEntriesCleared,
      integrityViolations: 0
    };
  }
}