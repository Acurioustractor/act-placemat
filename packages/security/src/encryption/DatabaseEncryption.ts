/**
 * Database Encryption Service for ACT Placemat
 * 
 * Transparent database field encryption with automatic key management,
 * schema migration support, and Australian compliance features
 */

import { z } from 'zod';
import { DataEncryptionService, EncryptionConfig, EncryptedData, EncryptionResult } from './DataEncryption';
import { FileBasedKeyManager, KeyManagerConfig } from './KeyManager';

// === DATABASE ENCRYPTION CONFIGURATION ===

export const DatabaseEncryptionConfigSchema = z.object({
  // Field encryption settings
  encryptedFields: z.record(z.object({
    table: z.string(),
    field: z.string(),
    classification: z.string(),
    required: z.boolean().default(true),
    searchable: z.boolean().default(false), // Whether to support encrypted search
    communityField: z.string().optional() // Field containing community ID for sovereignty
  })),
  
  // Schema settings
  encryptedFieldSuffix: z.string().default('_encrypted'),
  metadataFieldSuffix: z.string().default('_metadata'),
  enableMigration: z.boolean().default(true),
  
  // Performance settings
  batchEncryptionSize: z.number().default(1000),
  enableQueryOptimization: z.boolean().default(true),
  cacheSearchTokens: z.boolean().default(true),
  
  // Search encryption (for searchable fields)
  enableSearchableEncryption: z.boolean().default(true),
  searchTokenLength: z.number().default(16),
  
  // Compliance settings
  auditAllAccess: z.boolean().default(true),
  enableIndigenousProtection: z.boolean().default(true),
  enforceDataClassification: z.boolean().default(true)
});

export type DatabaseEncryptionConfig = z.infer<typeof DatabaseEncryptionConfigSchema>;

// === ENCRYPTED FIELD INTERFACES ===

export interface EncryptedFieldDefinition {
  table: string;
  field: string;
  classification: string;
  required: boolean;
  searchable: boolean;
  communityField?: string;
}

export interface EncryptedRecord {
  [field: string]: {
    encrypted: EncryptedData;
    searchTokens?: string[];
    metadata: {
      classification: string;
      communityId?: string;
      encryptedAt: Date;
      keyId: string;
    };
  };
}

export interface SearchToken {
  token: string;
  field: string;
  classification: string;
  communityId?: string;
}

export interface DatabaseMigrationResult {
  tablesProcessed: number;
  recordsEncrypted: number;
  fieldsEncrypted: number;
  errors: Array<{
    table: string;
    record: any;
    error: string;
  }>;
  duration: number;
}

// === DATABASE ENCRYPTION SERVICE ===

export class DatabaseEncryptionService {
  private config: DatabaseEncryptionConfig;
  private encryptionService: DataEncryptionService;
  private fieldDefinitions: Map<string, EncryptedFieldDefinition> = new Map();
  private searchTokenCache: Map<string, string[]> = new Map();

  constructor(
    config: DatabaseEncryptionConfig,
    encryptionConfig: EncryptionConfig,
    keyManagerConfig: KeyManagerConfig,
    masterKey: string
  ) {
    this.config = DatabaseEncryptionConfigSchema.parse(config);
    
    // Initialize key manager and encryption service
    const keyManager = new FileBasedKeyManager(keyManagerConfig, masterKey);
    this.encryptionService = new DataEncryptionService(encryptionConfig, keyManager);
    
    // Process field definitions
    this.processFieldDefinitions();
  }

  // === INITIALIZATION ===

  /**
   * Process and validate field definitions
   */
  private processFieldDefinitions(): void {
    for (const [fieldKey, definition] of Object.entries(this.config.encryptedFields)) {
      const fieldDef: EncryptedFieldDefinition = {
        table: definition.table,
        field: definition.field,
        classification: definition.classification,
        required: definition.required,
        searchable: definition.searchable,
        communityField: definition.communityField
      };
      
      this.fieldDefinitions.set(fieldKey, fieldDef);
    }
  }

  // === RECORD ENCRYPTION ===

  /**
   * Encrypt database record fields
   */
  async encryptRecord(
    tableName: string,
    record: Record<string, any>,
    options: {
      communityContext?: string;
      skipValidation?: boolean;
    } = {}
  ): Promise<{
    encryptedRecord: Record<string, any>;
    encryptionResults: Record<string, EncryptionResult>;
  }> {
    const encryptedRecord = { ...record };
    const encryptionResults: Record<string, EncryptionResult> = {};
    
    // Find fields to encrypt for this table
    const fieldsToEncrypt = Array.from(this.fieldDefinitions.values())
      .filter(def => def.table === tableName);
    
    for (const fieldDef of fieldsToEncrypt) {
      const fieldValue = record[fieldDef.field];
      
      // Skip if field is empty and not required
      if (!fieldValue && !fieldDef.required) {
        continue;
      }
      
      // Validate required fields
      if (!fieldValue && fieldDef.required) {
        throw new Error(`Required encrypted field ${fieldDef.field} is missing`);
      }
      
      // Determine community ID for sovereignty
      const communityId = options.communityContext || 
                         (fieldDef.communityField ? record[fieldDef.communityField] : undefined);
      
      // Validate Indigenous data protection
      if (this.config.enableIndigenousProtection && communityId) {
        this.validateIndigenousDataAccess(fieldDef, communityId);
      }
      
      // Encrypt field value
      const encryptionResult = await this.encryptionService.encryptData(
        JSON.stringify(fieldValue),
        fieldDef.classification,
        {
          purpose: 'database',
          communityId,
          metadata: {
            table: tableName,
            field: fieldDef.field,
            originalType: typeof fieldValue
          }
        }
      );
      
      // Store encrypted data
      const encryptedFieldName = `${fieldDef.field}${this.config.encryptedFieldSuffix}`;
      const metadataFieldName = `${fieldDef.field}${this.config.metadataFieldSuffix}`;
      
      encryptedRecord[encryptedFieldName] = this.serializeEncryptedData(encryptionResult.encrypted);
      encryptedRecord[metadataFieldName] = {
        classification: fieldDef.classification,
        communityId,
        encryptedAt: new Date(),
        keyId: encryptionResult.keyUsed,
        searchable: fieldDef.searchable
      };
      
      // Generate search tokens if field is searchable
      if (fieldDef.searchable && this.config.enableSearchableEncryption) {
        const searchTokens = await this.generateSearchTokens(
          fieldValue,
          fieldDef,
          communityId
        );
        encryptedRecord[`${fieldDef.field}_search_tokens`] = searchTokens;
      }
      
      // Remove original field for security
      delete encryptedRecord[fieldDef.field];
      
      encryptionResults[fieldDef.field] = encryptionResult;
    }
    
    // Audit record encryption
    if (this.config.auditAllAccess) {
      await this.auditDatabaseOperation('encrypt_record', tableName, {
        fieldsEncrypted: Object.keys(encryptionResults),
        communityContext: options.communityContext
      });
    }
    
    return { encryptedRecord, encryptionResults };
  }

  /**
   * Decrypt database record fields
   */
  async decryptRecord(
    tableName: string,
    encryptedRecord: Record<string, any>,
    options: {
      fields?: string[];
      communityContext?: string;
      skipIntegrityCheck?: boolean;
    } = {}
  ): Promise<Record<string, any>> {
    const decryptedRecord = { ...encryptedRecord };
    
    // Find encrypted fields for this table
    const fieldsToDecrypt = Array.from(this.fieldDefinitions.values())
      .filter(def => def.table === tableName);
    
    for (const fieldDef of fieldsToDecrypt) {
      // Skip if specific fields requested and this isn't one
      if (options.fields && !options.fields.includes(fieldDef.field)) {
        continue;
      }
      
      const encryptedFieldName = `${fieldDef.field}${this.config.encryptedFieldSuffix}`;
      const metadataFieldName = `${fieldDef.field}${this.config.metadataFieldSuffix}`;
      
      // Skip if encrypted field doesn't exist
      if (!encryptedRecord[encryptedFieldName]) {
        continue;
      }
      
      // Parse metadata
      const metadata = encryptedRecord[metadataFieldName];
      if (!metadata) {
        throw new Error(`Missing metadata for encrypted field ${fieldDef.field}`);
      }
      
      // Validate community access for Indigenous data
      if (this.config.enableIndigenousProtection && metadata.communityId) {
        this.validateIndigenousDataAccess(fieldDef, metadata.communityId, options.communityContext);
      }
      
      // Parse encrypted data
      const encryptedData = this.deserializeEncryptedData(encryptedRecord[encryptedFieldName]);
      
      // Decrypt field value
      const decryptionResult = await this.encryptionService.decryptData(
        encryptedData,
        {
          verifyIntegrity: !options.skipIntegrityCheck,
          requiredCommunityId: options.communityContext
        }
      );
      
      // Parse original value
      const originalValue = JSON.parse(decryptionResult.decrypted.toString('utf8'));
      decryptedRecord[fieldDef.field] = originalValue;
      
      // Remove encrypted fields from result
      delete decryptedRecord[encryptedFieldName];
      delete decryptedRecord[metadataFieldName];
      delete decryptedRecord[`${fieldDef.field}_search_tokens`];
    }
    
    // Audit record decryption
    if (this.config.auditAllAccess) {
      await this.auditDatabaseOperation('decrypt_record', tableName, {
        fieldsDecrypted: options.fields || fieldsToDecrypt.map(f => f.field),
        communityContext: options.communityContext
      });
    }
    
    return decryptedRecord;
  }

  // === BATCH OPERATIONS ===

  /**
   * Encrypt multiple records efficiently
   */
  async encryptRecordBatch(
    tableName: string,
    records: Record<string, any>[],
    options: {
      communityContext?: string;
      batchSize?: number;
    } = {}
  ): Promise<{
    encryptedRecords: Record<string, any>[];
    totalEncrypted: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    const batchSize = options.batchSize || this.config.batchEncryptionSize;
    const encryptedRecords: Record<string, any>[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    let totalEncrypted = 0;
    
    // Process records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const recordIndex = i + j;
        
        try {
          const { encryptedRecord } = await this.encryptRecord(
            tableName,
            batch[j],
            options
          );
          
          encryptedRecords.push(encryptedRecord);
          totalEncrypted++;
          
        } catch (error) {
          errors.push({
            index: recordIndex,
            error: (error as Error).message
          });
          
          // Add original record for partial success
          encryptedRecords.push(batch[j]);
        }
      }
    }
    
    return {
      encryptedRecords,
      totalEncrypted,
      errors
    };
  }

  /**
   * Decrypt multiple records efficiently
   */
  async decryptRecordBatch(
    tableName: string,
    encryptedRecords: Record<string, any>[],
    options: {
      fields?: string[];
      communityContext?: string;
      batchSize?: number;
    } = {}
  ): Promise<{
    decryptedRecords: Record<string, any>[];
    totalDecrypted: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    const batchSize = options.batchSize || this.config.batchEncryptionSize;
    const decryptedRecords: Record<string, any>[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    let totalDecrypted = 0;
    
    // Process records in batches
    for (let i = 0; i < encryptedRecords.length; i += batchSize) {
      const batch = encryptedRecords.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const recordIndex = i + j;
        
        try {
          const decryptedRecord = await this.decryptRecord(
            tableName,
            batch[j],
            options
          );
          
          decryptedRecords.push(decryptedRecord);
          totalDecrypted++;
          
        } catch (error) {
          errors.push({
            index: recordIndex,
            error: (error as Error).message
          });
          
          // Add original record for partial success
          decryptedRecords.push(batch[j]);
        }
      }
    }
    
    return {
      decryptedRecords,
      totalDecrypted,
      errors
    };
  }

  // === SEARCHABLE ENCRYPTION ===

  /**
   * Generate search tokens for searchable fields
   */
  private async generateSearchTokens(
    value: any,
    fieldDef: EncryptedFieldDefinition,
    communityId?: string
  ): Promise<string[]> {
    if (!fieldDef.searchable) {
      return [];
    }
    
    const searchText = String(value).toLowerCase();
    const tokens: string[] = [];
    
    // Generate word tokens
    const words = searchText.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const token = await this.createSearchToken(word, fieldDef, communityId);
      tokens.push(token);
    }
    
    // Generate n-gram tokens for partial matching
    for (let i = 0; i < searchText.length - 2; i++) {
      const ngram = searchText.substring(i, i + 3);
      const token = await this.createSearchToken(ngram, fieldDef, communityId);
      tokens.push(token);
    }
    
    return [...new Set(tokens)]; // Remove duplicates
  }

  /**
   * Create encrypted search token
   */
  private async createSearchToken(
    text: string,
    fieldDef: EncryptedFieldDefinition,
    communityId?: string
  ): Promise<string> {
    const cacheKey = `${fieldDef.table}:${fieldDef.field}:${text}:${communityId || 'default'}`;
    
    // Check cache first
    const cached = this.searchTokenCache.get(cacheKey);
    if (cached && cached.length > 0) {
      return cached[0];
    }
    
    // Generate deterministic token using HMAC
    const crypto = require('crypto');
    const key = `${fieldDef.table}:${fieldDef.field}:${communityId || 'default'}`;
    const token = crypto.createHmac('sha256', key).update(text).digest('hex').substring(0, this.config.searchTokenLength);
    
    // Cache for reuse
    if (this.config.cacheSearchTokens) {
      this.searchTokenCache.set(cacheKey, [token]);
    }
    
    return token;
  }

  /**
   * Search encrypted records by token
   */
  async searchEncryptedRecords(
    tableName: string,
    searchQuery: string,
    field: string,
    options: {
      communityContext?: string;
      limit?: number;
    } = {}
  ): Promise<{
    searchTokens: string[];
    query: string; // SQL WHERE clause for search tokens
  }> {
    const fieldDef = Array.from(this.fieldDefinitions.values())
      .find(def => def.table === tableName && def.field === field);
    
    if (!fieldDef || !fieldDef.searchable) {
      throw new Error(`Field ${field} is not searchable`);
    }
    
    // Generate search tokens for query
    const searchTokens = await this.generateSearchTokens(
      searchQuery,
      fieldDef,
      options.communityContext
    );
    
    // Build SQL query for token matching
    const tokenField = `${field}_search_tokens`;
    const conditions = searchTokens.map(token => 
      `JSON_CONTAINS(${tokenField}, '"${token}"')`
    );
    
    const query = conditions.length > 0 
      ? `(${conditions.join(' OR ')})` 
      : '1=0'; // No results if no tokens
    
    return {
      searchTokens,
      query
    };
  }

  // === SCHEMA MIGRATION ===

  /**
   * Migrate existing database to encrypted fields
   */
  async migrateDatabase(
    tableNames: string[],
    options: {
      dryRun?: boolean;
      batchSize?: number;
      progressCallback?: (progress: { table: string; processed: number; total: number }) => void;
    } = {}
  ): Promise<DatabaseMigrationResult> {
    if (!this.config.enableMigration) {
      throw new Error('Database migration not enabled');
    }
    
    const startTime = Date.now();
    const result: DatabaseMigrationResult = {
      tablesProcessed: 0,
      recordsEncrypted: 0,
      fieldsEncrypted: 0,
      errors: [],
      duration: 0
    };
    
    for (const tableName of tableNames) {
      try {
        const migrationResult = await this.migrateTable(tableName, options);
        
        result.recordsEncrypted += migrationResult.recordsProcessed;
        result.fieldsEncrypted += migrationResult.fieldsEncrypted;
        result.errors.push(...migrationResult.errors);
        result.tablesProcessed++;
        
      } catch (error) {
        result.errors.push({
          table: tableName,
          record: null,
          error: (error as Error).message
        });
      }
    }
    
    result.duration = Date.now() - startTime;
    
    return result;
  }

  /**
   * Migrate single table
   */
  private async migrateTable(
    tableName: string,
    options: {
      dryRun?: boolean;
      batchSize?: number;
      progressCallback?: (progress: { table: string; processed: number; total: number }) => void;
    }
  ): Promise<{
    recordsProcessed: number;
    fieldsEncrypted: number;
    errors: Array<{ table: string; record: any; error: string }>;
  }> {
    // This is a placeholder for actual database migration
    // In production, this would:
    // 1. Add encrypted field columns
    // 2. Process existing records in batches
    // 3. Encrypt field values
    // 4. Update records with encrypted data
    // 5. Drop original columns (with backup)
    
    console.log(`${options.dryRun ? 'DRY RUN: ' : ''}Migrating table ${tableName}`);
    
    return {
      recordsProcessed: 0,
      fieldsEncrypted: 0,
      errors: []
    };
  }

  // === VALIDATION AND COMPLIANCE ===

  /**
   * Validate Indigenous data access
   */
  private validateIndigenousDataAccess(
    fieldDef: EncryptedFieldDefinition,
    dataCommunityId: string,
    accessCommunityId?: string
  ): void {
    // Check if access is from same community
    if (accessCommunityId && accessCommunityId !== dataCommunityId) {
      throw new Error(`Indigenous data sovereignty violation: Cannot access data from community ${dataCommunityId} with community ${accessCommunityId} context`);
    }
    
    // Additional sovereignty validation would go here
    // such as checking CARE principles compliance
  }

  // === UTILITY METHODS ===

  /**
   * Serialize encrypted data for database storage
   */
  private serializeEncryptedData(encryptedData: EncryptedData): string {
    return JSON.stringify({
      data: encryptedData.data.toString('base64'),
      algorithm: encryptedData.algorithm,
      keyId: encryptedData.keyId,
      iv: encryptedData.iv.toString('base64'),
      authTag: encryptedData.authTag?.toString('base64'),
      metadata: encryptedData.metadata
    });
  }

  /**
   * Deserialize encrypted data from database
   */
  private deserializeEncryptedData(serialized: string): EncryptedData {
    const parsed = JSON.parse(serialized);
    
    return {
      data: Buffer.from(parsed.data, 'base64'),
      algorithm: parsed.algorithm,
      keyId: parsed.keyId,
      iv: Buffer.from(parsed.iv, 'base64'),
      authTag: parsed.authTag ? Buffer.from(parsed.authTag, 'base64') : undefined,
      metadata: parsed.metadata
    };
  }

  /**
   * Audit database operation
   */
  private async auditDatabaseOperation(
    operation: string,
    tableName: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      operation,
      tableName,
      metadata,
      system: 'database-encryption'
    };
    
    // In production, this would write to secure audit log
    console.log('Database Encryption Audit:', auditEntry);
  }

  // === PUBLIC API ===

  /**
   * Get field definitions for table
   */
  getTableFieldDefinitions(tableName: string): EncryptedFieldDefinition[] {
    return Array.from(this.fieldDefinitions.values())
      .filter(def => def.table === tableName);
  }

  /**
   * Check if field is encrypted
   */
  isFieldEncrypted(tableName: string, fieldName: string): boolean {
    return Array.from(this.fieldDefinitions.values())
      .some(def => def.table === tableName && def.field === fieldName);
  }

  /**
   * Get encryption statistics
   */
  getStatistics(): {
    encryptedTables: number;
    encryptedFields: number;
    searchableFields: number;
    cacheSize: number;
  } {
    const fieldDefs = Array.from(this.fieldDefinitions.values());
    const tables = new Set(fieldDefs.map(def => def.table));
    
    return {
      encryptedTables: tables.size,
      encryptedFields: fieldDefs.length,
      searchableFields: fieldDefs.filter(def => def.searchable).length,
      cacheSize: this.searchTokenCache.size
    };
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.searchTokenCache.clear();
    this.encryptionService.clearCaches();
  }

  /**
   * Perform maintenance
   */
  async performMaintenance(): Promise<void> {
    // Clear expired cache entries
    this.clearCaches();
    
    // Perform encryption service maintenance
    await this.encryptionService.performMaintenance();
  }
}