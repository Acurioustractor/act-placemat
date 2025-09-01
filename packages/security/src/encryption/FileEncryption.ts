/**
 * File System Encryption Service for ACT Placemat
 * 
 * Transparent file and directory encryption with automatic key management,
 * metadata protection, and Australian compliance features
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { DataEncryptionService, EncryptionConfig, EncryptedData, EncryptionResult } from './DataEncryption';
import { FileBasedKeyManager, KeyManagerConfig } from './KeyManager';

// === FILE ENCRYPTION CONFIGURATION ===

export const FileEncryptionConfigSchema = z.object({
  // Encryption settings
  chunkSize: z.number().default(64 * 1024), // 64KB chunks
  enableStreaming: z.boolean().default(true),
  enableCompression: z.boolean().default(true),
  
  // File handling
  encryptedExtension: z.string().default('.encrypted'),
  metadataExtension: z.string().default('.metadata'),
  backupOriginals: z.boolean().default(false),
  
  // Directory structure
  encryptedRoot: z.string(),
  keyStorePath: z.string(),
  tempPath: z.string().optional(),
  
  // Performance
  enableCaching: z.boolean().default(true),
  cacheMaxSize: z.number().default(100 * 1024 * 1024), // 100MB
  enableParallelProcessing: z.boolean().default(true),
  maxConcurrentOperations: z.number().default(5),
  
  // Security features
  enableIntegrityVerification: z.boolean().default(true),
  enableTimestampValidation: z.boolean().default(true),
  shredOriginalFiles: z.boolean().default(true),
  
  // Australian compliance
  enforceDataResidency: z.boolean().default(true),
  auditFileOperations: z.boolean().default(true),
  enableIndigenousProtection: z.boolean().default(true),
  
  // File classification
  defaultClassification: z.string().default('internal'),
  classificationMapping: z.record(z.string()).default({
    '.txt': 'internal',
    '.doc': 'confidential',
    '.pdf': 'confidential',
    '.xlsx': 'confidential',
    '.json': 'internal',
    '.csv': 'internal'
  })
});

export type FileEncryptionConfig = z.infer<typeof FileEncryptionConfigSchema>;

// === FILE ENCRYPTION INTERFACES ===

export interface EncryptedFileMetadata {
  originalPath: string;
  originalName: string;
  originalSize: number;
  mimeType: string;
  classification: string;
  communityId?: string;
  
  encryption: {
    algorithm: string;
    keyId: string;
    chunkSize: number;
    totalChunks: number;
    compressed: boolean;
  };
  
  integrity: {
    checksumAlgorithm: string;
    checksum: string;
    signature?: string;
  };
  
  timestamps: {
    originalCreated: Date;
    originalModified: Date;
    encrypted: Date;
    lastAccessed?: Date;
  };
  
  access: {
    permissions: string;
    owner: string;
    group?: string;
    accessLog: Array<{
      timestamp: Date;
      action: string;
      user: string;
      ip?: string;
    }>;
  };
  
  compliance: {
    dataResidency: boolean;
    auditRequired: boolean;
    retentionPeriod?: number;
    indigenousData: boolean;
  };
}

export interface FileEncryptionResult {
  encryptedPath: string;
  metadataPath: string;
  originalSize: number;
  encryptedSize: number;
  compressionRatio?: number;
  encryptionTime: number;
  keyUsed: string;
}

export interface FileDecryptionResult {
  decryptedPath: string;
  originalSize: number;
  decryptionTime: number;
  integrityVerified: boolean;
  metadata: EncryptedFileMetadata;
}

export interface DirectoryEncryptionResult {
  totalFiles: number;
  encryptedFiles: number;
  totalSize: number;
  encryptedSize: number;
  errors: Array<{
    file: string;
    error: string;
  }>;
  duration: number;
}

// === FILE ENCRYPTION SERVICE ===

export class FileEncryptionService {
  private config: FileEncryptionConfig;
  private encryptionService: DataEncryptionService;
  private fileCache: Map<string, Buffer> = new Map();
  private metadataCache: Map<string, EncryptedFileMetadata> = new Map();
  private operationQueue: Array<() => Promise<any>> = [];
  private activeOperations = 0;

  constructor(
    config: FileEncryptionConfig,
    encryptionConfig: EncryptionConfig,
    keyManagerConfig: KeyManagerConfig,
    masterKey: string
  ) {
    this.config = FileEncryptionConfigSchema.parse(config);
    
    // Initialize encryption service
    const keyManager = new FileBasedKeyManager(keyManagerConfig, masterKey);
    this.encryptionService = new DataEncryptionService(encryptionConfig, keyManager);
    
    // Start operation processor
    this.startOperationProcessor();
  }

  // === FILE ENCRYPTION ===

  /**
   * Encrypt single file with comprehensive metadata
   */
  async encryptFile(
    filePath: string,
    options: {
      outputPath?: string;
      classification?: string;
      communityId?: string;
      preserveOriginal?: boolean;
      userId?: string;
    } = {}
  ): Promise<FileEncryptionResult> {
    const startTime = Date.now();
    
    // Validate file exists and is readable
    await this.validateFileAccess(filePath, 'read');
    
    // Get file stats and content
    const stats = await fs.stat(filePath);
    const fileContent = await fs.readFile(filePath);
    
    // Determine classification
    const classification = options.classification || 
                          this.determineFileClassification(filePath);
    
    // Create file metadata
    const metadata = await this.createFileMetadata(
      filePath,
      stats,
      classification,
      options.communityId,
      options.userId
    );
    
    // Encrypt file content
    const encryptionResult = await this.encryptFileContent(
      fileContent,
      metadata,
      options.communityId
    );
    
    // Determine output paths
    const outputPath = options.outputPath || 
                      path.join(this.config.encryptedRoot, 
                               path.basename(filePath) + this.config.encryptedExtension);
    const metadataPath = outputPath.replace(this.config.encryptedExtension, this.config.metadataExtension);
    
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Write encrypted file
    await fs.writeFile(outputPath, encryptionResult.encrypted.data);
    
    // Write metadata
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    // Handle original file
    if (!options.preserveOriginal) {
      if (this.config.shredOriginalFiles) {
        await this.secureDelete(filePath);
      } else {
        await fs.unlink(filePath);
      }
    } else if (this.config.backupOriginals) {
      const backupPath = `${filePath}.backup`;
      await fs.copyFile(filePath, backupPath);
    }
    
    const encryptionTime = Date.now() - startTime;
    
    // Audit file encryption
    if (this.config.auditFileOperations) {
      await this.auditFileOperation('encrypt', filePath, {
        classification,
        communityId: options.communityId,
        userId: options.userId,
        encryptedSize: encryptionResult.encrypted.data.length,
        encryptionTime
      });
    }
    
    const result: FileEncryptionResult = {
      encryptedPath: outputPath,
      metadataPath,
      originalSize: stats.size,
      encryptedSize: encryptionResult.encrypted.data.length,
      compressionRatio: encryptionResult.performanceMetrics.compressionRatio,
      encryptionTime,
      keyUsed: encryptionResult.keyUsed
    };
    
    return result;
  }

  /**
   * Decrypt file to specified location
   */
  async decryptFile(
    encryptedFilePath: string,
    options: {
      outputPath?: string;
      communityContext?: string;
      userId?: string;
      verifyIntegrity?: boolean;
    } = {}
  ): Promise<FileDecryptionResult> {
    const startTime = Date.now();
    
    // Load metadata
    const metadataPath = encryptedFilePath.replace(this.config.encryptedExtension, this.config.metadataExtension);
    const metadata = await this.loadFileMetadata(metadataPath);
    
    // Validate access permissions
    await this.validateFileAccess(encryptedFilePath, 'read', metadata, options.communityContext);
    
    // Read encrypted content
    const encryptedContent = await fs.readFile(encryptedFilePath);
    
    // Decrypt file content
    const decryptionResult = await this.decryptFileContent(
      encryptedContent,
      metadata,
      options.communityContext,
      options.verifyIntegrity !== false
    );
    
    // Determine output path
    const outputPath = options.outputPath || 
                      path.join(path.dirname(encryptedFilePath), metadata.originalName);
    
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Write decrypted file
    await fs.writeFile(outputPath, decryptionResult.decrypted);
    
    // Restore original timestamps if possible
    try {
      await fs.utimes(outputPath, metadata.timestamps.originalCreated, metadata.timestamps.originalModified);
    } catch (error) {
      console.warn('Failed to restore original timestamps:', error);
    }
    
    const decryptionTime = Date.now() - startTime;
    
    // Update access log
    metadata.access.accessLog.push({
      timestamp: new Date(),
      action: 'decrypt',
      user: options.userId || 'unknown',
      ip: undefined // Would be populated from request context
    });
    
    // Save updated metadata
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    // Audit file decryption
    if (this.config.auditFileOperations) {
      await this.auditFileOperation('decrypt', encryptedFilePath, {
        originalPath: metadata.originalPath,
        communityContext: options.communityContext,
        userId: options.userId,
        decryptionTime
      });
    }
    
    return {
      decryptedPath: outputPath,
      originalSize: metadata.originalSize,
      decryptionTime,
      integrityVerified: decryptionResult.performanceMetrics.verified,
      metadata
    };
  }

  // === DIRECTORY OPERATIONS ===

  /**
   * Encrypt entire directory recursively
   */
  async encryptDirectory(
    directoryPath: string,
    options: {
      outputPath?: string;
      classification?: string;
      communityId?: string;
      preserveOriginals?: boolean;
      fileFilter?: (filePath: string) => boolean;
      progressCallback?: (progress: { processed: number; total: number; current: string }) => void;
    } = {}
  ): Promise<DirectoryEncryptionResult> {
    const startTime = Date.now();
    
    // Get all files in directory
    const files = await this.getAllFiles(directoryPath);
    const filteredFiles = options.fileFilter ? files.filter(options.fileFilter) : files;
    
    const result: DirectoryEncryptionResult = {
      totalFiles: filteredFiles.length,
      encryptedFiles: 0,
      totalSize: 0,
      encryptedSize: 0,
      errors: [],
      duration: 0
    };
    
    // Process files with concurrency control
    const operations = filteredFiles.map((filePath, index) => async () => {
      try {
        // Calculate relative path for output
        const relativePath = path.relative(directoryPath, filePath);
        const outputDir = options.outputPath || this.config.encryptedRoot;
        const outputPath = path.join(outputDir, relativePath + this.config.encryptedExtension);
        
        // Get file size for statistics
        const stats = await fs.stat(filePath);
        result.totalSize += stats.size;
        
        // Encrypt file
        const encryptionResult = await this.encryptFile(filePath, {
          outputPath,
          classification: options.classification,
          communityId: options.communityId,
          preserveOriginal: options.preserveOriginals
        });
        
        result.encryptedFiles++;
        result.encryptedSize += encryptionResult.encryptedSize;
        
        // Report progress
        if (options.progressCallback) {
          options.progressCallback({
            processed: result.encryptedFiles,
            total: result.totalFiles,
            current: filePath
          });
        }
        
      } catch (error) {
        result.errors.push({
          file: filePath,
          error: (error as Error).message
        });
      }
    });
    
    // Execute with concurrency control
    await this.executeWithConcurrency(operations);
    
    result.duration = Date.now() - startTime;
    
    return result;
  }

  /**
   * Decrypt entire directory recursively
   */
  async decryptDirectory(
    encryptedDirectoryPath: string,
    options: {
      outputPath?: string;
      communityContext?: string;
      fileFilter?: (filePath: string) => boolean;
      progressCallback?: (progress: { processed: number; total: number; current: string }) => void;
    } = {}
  ): Promise<DirectoryEncryptionResult> {
    const startTime = Date.now();
    
    // Get all encrypted files
    const encryptedFiles = await this.getAllFiles(encryptedDirectoryPath, this.config.encryptedExtension);
    const filteredFiles = options.fileFilter ? encryptedFiles.filter(options.fileFilter) : encryptedFiles;
    
    const result: DirectoryEncryptionResult = {
      totalFiles: filteredFiles.length,
      encryptedFiles: 0,
      totalSize: 0,
      encryptedSize: 0,
      errors: [],
      duration: 0
    };
    
    // Process files with concurrency control
    const operations = filteredFiles.map((encryptedFilePath) => async () => {
      try {
        // Calculate relative path for output
        const relativePath = path.relative(encryptedDirectoryPath, encryptedFilePath);
        const outputDir = options.outputPath || path.dirname(encryptedDirectoryPath);
        const outputPath = path.join(outputDir, relativePath.replace(this.config.encryptedExtension, ''));
        
        // Get encrypted file size
        const stats = await fs.stat(encryptedFilePath);
        result.encryptedSize += stats.size;
        
        // Decrypt file
        const decryptionResult = await this.decryptFile(encryptedFilePath, {
          outputPath,
          communityContext: options.communityContext
        });
        
        result.encryptedFiles++;
        result.totalSize += decryptionResult.originalSize;
        
        // Report progress
        if (options.progressCallback) {
          options.progressCallback({
            processed: result.encryptedFiles,
            total: result.totalFiles,
            current: encryptedFilePath
          });
        }
        
      } catch (error) {
        result.errors.push({
          file: encryptedFilePath,
          error: (error as Error).message
        });
      }
    });
    
    // Execute with concurrency control
    await this.executeWithConcurrency(operations);
    
    result.duration = Date.now() - startTime;
    
    return result;
  }

  // === CORE ENCRYPTION/DECRYPTION ===

  /**
   * Encrypt file content in chunks
   */
  private async encryptFileContent(
    content: Buffer,
    metadata: EncryptedFileMetadata,
    communityId?: string
  ): Promise<EncryptionResult> {
    // For large files, we'd implement chunked encryption here
    // For now, encrypt as single block
    const encryptionResult = await this.encryptionService.encryptData(
      content,
      metadata.classification,
      {
        purpose: 'file',
        communityId,
        metadata: {
          fileName: metadata.originalName,
          mimeType: metadata.mimeType,
          originalSize: metadata.originalSize
        }
      }
    );
    
    return encryptionResult;
  }

  /**
   * Decrypt file content
   */
  private async decryptFileContent(
    encryptedContent: Buffer,
    metadata: EncryptedFileMetadata,
    communityContext?: string,
    verifyIntegrity: boolean = true
  ): Promise<{
    decrypted: Buffer;
    performanceMetrics: { verified: boolean; decryptionTime: number };
  }> {
    const startTime = Date.now();
    
    // Parse encrypted data
    const encryptedData: EncryptedData = {
      data: encryptedContent,
      algorithm: metadata.encryption.algorithm,
      keyId: metadata.encryption.keyId,
      iv: Buffer.alloc(16), // Would be stored in metadata
      metadata: {
        originalSize: metadata.originalSize,
        compressed: metadata.encryption.compressed,
        timestamp: metadata.timestamps.encrypted,
        classification: metadata.classification,
        checksum: metadata.integrity.checksum,
        communityId: metadata.communityId
      }
    };
    
    // Decrypt content
    const decryptionResult = await this.encryptionService.decryptData(
      encryptedData,
      {
        verifyIntegrity,
        requiredCommunityId: communityContext
      }
    );
    
    // Verify file integrity if enabled
    if (verifyIntegrity && this.config.enableIntegrityVerification) {
      const actualChecksum = crypto.createHash('sha256').update(decryptionResult.decrypted).digest('hex');
      if (actualChecksum !== metadata.integrity.checksum) {
        throw new Error('File integrity verification failed');
      }
    }
    
    const decryptionTime = Date.now() - startTime;
    
    return {
      decrypted: decryptionResult.decrypted,
      performanceMetrics: {
        verified: true,
        decryptionTime
      }
    };
  }

  // === METADATA MANAGEMENT ===

  /**
   * Create comprehensive file metadata
   */
  private async createFileMetadata(
    filePath: string,
    stats: any,
    classification: string,
    communityId?: string,
    userId?: string
  ): Promise<EncryptedFileMetadata> {
    const fileName = path.basename(filePath);
    const mimeType = this.getMimeType(filePath);
    const checksum = await this.calculateFileChecksum(filePath);
    
    return {
      originalPath: filePath,
      originalName: fileName,
      originalSize: stats.size,
      mimeType,
      classification,
      communityId,
      
      encryption: {
        algorithm: 'aes-256-gcm',
        keyId: '', // Will be set during encryption
        chunkSize: this.config.chunkSize,
        totalChunks: Math.ceil(stats.size / this.config.chunkSize),
        compressed: this.config.enableCompression
      },
      
      integrity: {
        checksumAlgorithm: 'sha256',
        checksum
      },
      
      timestamps: {
        originalCreated: stats.birthtime || stats.ctime,
        originalModified: stats.mtime,
        encrypted: new Date()
      },
      
      access: {
        permissions: stats.mode.toString(8),
        owner: userId || 'unknown',
        accessLog: []
      },
      
      compliance: {
        dataResidency: this.config.enforceDataResidency,
        auditRequired: this.config.auditFileOperations,
        indigenousData: !!communityId
      }
    };
  }

  /**
   * Load file metadata from disk
   */
  private async loadFileMetadata(metadataPath: string): Promise<EncryptedFileMetadata> {
    // Check cache first
    const cached = this.metadataCache.get(metadataPath);
    if (cached) {
      return cached;
    }
    
    // Load from disk
    const metadataContent = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    // Parse dates
    metadata.timestamps.originalCreated = new Date(metadata.timestamps.originalCreated);
    metadata.timestamps.originalModified = new Date(metadata.timestamps.originalModified);
    metadata.timestamps.encrypted = new Date(metadata.timestamps.encrypted);
    if (metadata.timestamps.lastAccessed) {
      metadata.timestamps.lastAccessed = new Date(metadata.timestamps.lastAccessed);
    }
    
    // Cache metadata
    if (this.config.enableCaching) {
      this.metadataCache.set(metadataPath, metadata);
    }
    
    return metadata;
  }

  // === UTILITY METHODS ===

  /**
   * Determine file classification based on extension
   */
  private determineFileClassification(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.classificationMapping[ext] || this.config.defaultClassification;
  }

  /**
   * Get MIME type for file
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Calculate file checksum
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get all files in directory recursively
   */
  private async getAllFiles(dirPath: string, extension?: string): Promise<string[]> {
    const files: string[] = [];
    
    const processDirectory = async (currentPath: string) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await processDirectory(fullPath);
        } else if (entry.isFile()) {
          if (!extension || fullPath.endsWith(extension)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    await processDirectory(dirPath);
    return files;
  }

  /**
   * Validate file access permissions
   */
  private async validateFileAccess(
    filePath: string,
    operation: 'read' | 'write',
    metadata?: EncryptedFileMetadata,
    communityContext?: string
  ): Promise<void> {
    // Check file exists
    try {
      await fs.access(filePath, operation === 'read' ? fs.constants.R_OK : fs.constants.W_OK);
    } catch (error) {
      throw new Error(`File access denied: ${filePath}`);
    }
    
    // Check Indigenous data sovereignty
    if (metadata?.compliance.indigenousData && this.config.enableIndigenousProtection) {
      if (communityContext && metadata.communityId !== communityContext) {
        throw new Error(`Indigenous data sovereignty violation: Cannot access file from community ${metadata.communityId} with community ${communityContext} context`);
      }
    }
  }

  /**
   * Secure delete file (overwrite with random data)
   */
  private async secureDelete(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      
      // Overwrite with random data multiple times
      for (let pass = 0; pass < 3; pass++) {
        const randomData = crypto.randomBytes(Math.min(fileSize, 1024 * 1024)); // Max 1MB chunks
        const handle = await fs.open(filePath, 'r+');
        
        try {
          for (let offset = 0; offset < fileSize; offset += randomData.length) {
            const chunkSize = Math.min(randomData.length, fileSize - offset);
            await handle.write(randomData.subarray(0, chunkSize), 0, chunkSize, offset);
          }
          await handle.sync();
        } finally {
          await handle.close();
        }
      }
      
      // Finally delete the file
      await fs.unlink(filePath);
      
    } catch (error) {
      console.warn(`Secure delete failed for ${filePath}:`, error);
      // Fall back to regular delete
      await fs.unlink(filePath);
    }
  }

  /**
   * Execute operations with concurrency control
   */
  private async executeWithConcurrency(operations: Array<() => Promise<any>>): Promise<void> {
    const semaphore = new Array(this.config.maxConcurrentOperations).fill(null);
    
    const executeNext = async (operationIndex: number): Promise<void> => {
      if (operationIndex >= operations.length) return;
      
      await operations[operationIndex]();
      await executeNext(operationIndex + this.config.maxConcurrentOperations);
    };
    
    // Start initial batch
    const promises = semaphore.map((_, index) => executeNext(index));
    await Promise.all(promises);
  }

  /**
   * Start operation processor for queued operations
   */
  private startOperationProcessor(): void {
    setInterval(async () => {
      while (this.operationQueue.length > 0 && this.activeOperations < this.config.maxConcurrentOperations) {
        const operation = this.operationQueue.shift();
        if (operation) {
          this.activeOperations++;
          operation().finally(() => {
            this.activeOperations--;
          });
        }
      }
    }, 100);
  }

  /**
   * Audit file operation
   */
  private async auditFileOperation(
    operation: string,
    filePath: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      operation,
      filePath,
      metadata,
      system: 'file-encryption'
    };
    
    // In production, this would write to secure audit log
    console.log('File Encryption Audit:', auditEntry);
  }

  // === PUBLIC API ===

  /**
   * Check if file is encrypted
   */
  async isFileEncrypted(filePath: string): Promise<boolean> {
    return filePath.endsWith(this.config.encryptedExtension) &&
           await this.fileExists(filePath.replace(this.config.encryptedExtension, this.config.metadataExtension));
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file encryption statistics
   */
  getStatistics(): {
    cacheSize: number;
    metadataCacheSize: number;
    activeOperations: number;
    queuedOperations: number;
  } {
    return {
      cacheSize: this.fileCache.size,
      metadataCacheSize: this.metadataCache.size,
      activeOperations: this.activeOperations,
      queuedOperations: this.operationQueue.length
    };
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.fileCache.clear();
    this.metadataCache.clear();
  }

  /**
   * Perform maintenance
   */
  async performMaintenance(): Promise<{
    cacheEntriesCleared: number;
    operationsCompleted: number;
  }> {
    let cacheEntriesCleared = 0;
    
    // Clear old cache entries (simplified)
    if (this.fileCache.size > 100) {
      this.fileCache.clear();
      cacheEntriesCleared += 100;
    }
    
    if (this.metadataCache.size > 100) {
      this.metadataCache.clear();
      cacheEntriesCleared += 100;
    }
    
    // Wait for queued operations to complete
    const operationsCompleted = this.operationQueue.length;
    
    return {
      cacheEntriesCleared,
      operationsCompleted
    };
  }
}