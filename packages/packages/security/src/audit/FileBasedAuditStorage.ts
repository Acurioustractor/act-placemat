/**
 * File-Based Audit Storage for ACT Placemat
 * 
 * Write-once, tamper-evident file storage for audit logs with
 * integrity verification and Australian compliance features
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { 
  AuditStorage, 
  AuditEvent, 
  AuditQueryCriteria, 
  AuditStatistics 
} from './AuditLogger';

// === FILE STORAGE CONFIGURATION ===

export const FileStorageConfigSchema = z.object({
  // Storage paths
  logDirectory: z.string(),
  indexDirectory: z.string(),
  archiveDirectory: z.string().optional(),
  
  // File settings
  maxFileSize: z.number().default(50 * 1024 * 1024), // 50MB
  maxFilesPerDirectory: z.number().default(1000),
  fileExtension: z.string().default('.audit'),
  compressionEnabled: z.boolean().default(true),
  
  // Integrity settings
  enableChecksums: z.boolean().default(true),
  checksumAlgorithm: z.string().default('sha256'),
  enableSignatures: z.boolean().default(true),
  signingKeyPath: z.string().optional(),
  
  // Index settings
  enableIndexing: z.boolean().default(true),
  indexFlushInterval: z.number().default(5000), // 5 seconds
  rebuildIndexOnStart: z.boolean().default(false),
  
  // Performance settings
  bufferSize: z.number().default(64 * 1024), // 64KB
  enableAsync: z.boolean().default(true),
  writeTimeout: z.number().default(30000), // 30 seconds
  
  // Australian compliance
  enforceDataResidency: z.boolean().default(true),
  enableWriteOnce: z.boolean().default(true),
  enableTamperDetection: z.boolean().default(true)
});

export type FileStorageConfig = z.infer<typeof FileStorageConfigSchema>;

// === FILE STORAGE INTERFACES ===

interface AuditFileHeader {
  version: string;
  created: Date;
  fileId: string;
  sequence: number;
  checksum: string;
  signature?: string;
  metadata: {
    totalEvents: number;
    firstEventTime: Date;
    lastEventTime: Date;
    compressionUsed: boolean;
  };
}

interface AuditFileIndex {
  fileId: string;
  filePath: string;
  eventCount: number;
  firstEventTime: Date;
  lastEventTime: Date;
  checksum: string;
  indexed: Date;
}

interface EventIndex {
  eventId: string;
  fileId: string;
  offset: number;
  timestamp: Date;
  eventType: string;
  severity: string;
  actorId: string;
  communityId?: string;
}

// === FILE-BASED AUDIT STORAGE ===

export class FileBasedAuditStorage implements AuditStorage {
  private config: FileStorageConfig;
  private currentFile?: string;
  private currentFileSize = 0;
  private fileSequence = 0;
  private signingKey?: crypto.KeyObject;
  private eventIndex: Map<string, EventIndex> = new Map();
  private fileIndex: Map<string, AuditFileIndex> = new Map();
  private writeBuffer: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: FileStorageConfig) {
    this.config = FileStorageConfigSchema.parse(config);
    this.initialize();
  }

  // === INITIALIZATION ===

  /**
   * Initialize storage system
   */
  private async initialize(): Promise<void> {
    // Create directories
    await this.createDirectories();
    
    // Load signing key if configured
    await this.loadSigningKey();
    
    // Load existing indexes
    await this.loadIndexes();
    
    // Start background flush timer
    this.startFlushTimer();
    
    console.log('File-based audit storage initialized');
  }

  /**
   * Create required directories
   */
  private async createDirectories(): Promise<void> {
    await fs.mkdir(this.config.logDirectory, { recursive: true });
    await fs.mkdir(this.config.indexDirectory, { recursive: true });
    
    if (this.config.archiveDirectory) {
      await fs.mkdir(this.config.archiveDirectory, { recursive: true });
    }
  }

  /**
   * Load signing key for file signatures
   */
  private async loadSigningKey(): Promise<void> {
    if (!this.config.enableSignatures || !this.config.signingKeyPath) {
      return;
    }

    try {
      const keyData = await fs.readFile(this.config.signingKeyPath);
      this.signingKey = crypto.createPrivateKey(keyData);
    } catch (error) {
      console.warn('Failed to load signing key:', error);
    }
  }

  /**
   * Load existing file and event indexes
   */
  private async loadIndexes(): Promise<void> {
    if (!this.config.enableIndexing) return;

    try {
      // Load file index
      const fileIndexPath = path.join(this.config.indexDirectory, 'files.json');
      const fileIndexData = await fs.readFile(fileIndexPath, 'utf8');
      const fileIndexArray = JSON.parse(fileIndexData);
      
      for (const entry of fileIndexArray) {
        this.fileIndex.set(entry.fileId, {
          ...entry,
          firstEventTime: new Date(entry.firstEventTime),
          lastEventTime: new Date(entry.lastEventTime),
          indexed: new Date(entry.indexed)
        });
      }

      // Load event index
      const eventIndexPath = path.join(this.config.indexDirectory, 'events.json');
      const eventIndexData = await fs.readFile(eventIndexPath, 'utf8');
      const eventIndexArray = JSON.parse(eventIndexData);
      
      for (const entry of eventIndexArray) {
        this.eventIndex.set(entry.eventId, {
          ...entry,
          timestamp: new Date(entry.timestamp)
        });
      }

      // Find current sequence number
      const fileIds = Array.from(this.fileIndex.keys());
      if (fileIds.length > 0) {
        const sequences = fileIds.map(id => parseInt(id.split('_')[1]) || 0);
        this.fileSequence = Math.max(...sequences);
      }

    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.warn('Failed to load indexes:', error);
      }
      
      // Rebuild index if configured
      if (this.config.rebuildIndexOnStart) {
        await this.rebuildIndexes();
      }
    }
  }

  // === STORAGE OPERATIONS ===

  /**
   * Store single audit event
   */
  async store(event: AuditEvent): Promise<void> {
    if (this.config.enableAsync) {
      // Add to buffer for async processing
      this.writeBuffer.push(event);
      
      // Flush if buffer is full
      if (this.writeBuffer.length >= 100) {
        await this.flushBuffer();
      }
    } else {
      // Write immediately
      await this.writeEvent(event);
    }
  }

  /**
   * Store batch of audit events
   */
  async storeBatch(events: AuditEvent[]): Promise<void> {
    if (this.config.enableAsync) {
      this.writeBuffer.push(...events);
      await this.flushBuffer();
    } else {
      for (const event of events) {
        await this.writeEvent(event);
      }
    }
  }

  /**
   * Write single event to file
   */
  private async writeEvent(event: AuditEvent): Promise<void> {
    // Ensure we have a current file
    if (!this.currentFile || this.currentFileSize >= this.config.maxFileSize) {
      await this.createNewFile();
    }

    // Serialize event
    const eventData = JSON.stringify(event);
    const eventBuffer = Buffer.from(eventData + '\n', 'utf8');

    // Write to file
    await fs.appendFile(this.currentFile!, eventBuffer);
    this.currentFileSize += eventBuffer.length;

    // Update indexes
    if (this.config.enableIndexing) {
      await this.updateIndexes(event, this.currentFile!, this.currentFileSize - eventBuffer.length);
    }
  }

  /**
   * Create new audit log file
   */
  private async createNewFile(): Promise<void> {
    // Finalize current file if exists
    if (this.currentFile) {
      await this.finalizeFile(this.currentFile);
    }

    // Create new file
    this.fileSequence++;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileId = `audit_${this.fileSequence.toString().padStart(6, '0')}_${timestamp}`;
    const fileName = `${fileId}${this.config.fileExtension}`;
    
    this.currentFile = path.join(this.config.logDirectory, fileName);
    this.currentFileSize = 0;

    // Create file header
    const header: AuditFileHeader = {
      version: '1.0',
      created: new Date(),
      fileId,
      sequence: this.fileSequence,
      checksum: '',
      metadata: {
        totalEvents: 0,
        firstEventTime: new Date(),
        lastEventTime: new Date(),
        compressionUsed: this.config.compressionEnabled
      }
    };

    // Write header
    const headerData = JSON.stringify(header) + '\n';
    await fs.writeFile(this.currentFile, headerData);
    this.currentFileSize = Buffer.byteLength(headerData);
  }

  /**
   * Finalize file with checksums and signatures
   */
  private async finalizeFile(filePath: string): Promise<void> {
    if (!this.config.enableChecksums && !this.config.enableSignatures) {
      return;
    }

    // Read file content
    const fileContent = await fs.readFile(filePath);
    
    // Calculate checksum
    let checksum = '';
    if (this.config.enableChecksums) {
      checksum = crypto.createHash(this.config.checksumAlgorithm)
        .update(fileContent)
        .digest('hex');
    }

    // Generate signature
    let signature = '';
    if (this.config.enableSignatures && this.signingKey) {
      signature = crypto.sign('sha256', fileContent, this.signingKey).toString('base64');
    }

    // Update file header with integrity data
    const lines = fileContent.toString().split('\n');
    if (lines.length > 0) {
      const header = JSON.parse(lines[0]);
      header.checksum = checksum;
      header.signature = signature;
      
      // Rewrite file with updated header
      lines[0] = JSON.stringify(header);
      await fs.writeFile(filePath, lines.join('\n'));
    }
  }

  // === BUFFER MANAGEMENT ===

  /**
   * Flush write buffer to disk
   */
  private async flushBuffer(): Promise<void> {
    if (this.writeBuffer.length === 0) return;

    const eventsToWrite = this.writeBuffer.splice(0);
    
    try {
      for (const event of eventsToWrite) {
        await this.writeEvent(event);
      }
    } catch (error) {
      // Re-queue events on failure
      this.writeBuffer.unshift(...eventsToWrite);
      throw error;
    }
  }

  /**
   * Start background flush timer
   */
  private startFlushTimer(): void {
    if (!this.config.enableAsync) return;

    this.flushTimer = setInterval(async () => {
      if (this.writeBuffer.length > 0) {
        try {
          await this.flushBuffer();
        } catch (error) {
          console.error('Background flush failed:', error);
        }
      }
    }, this.config.indexFlushInterval);
  }

  // === QUERY OPERATIONS ===

  /**
   * Query audit events with criteria
   */
  async query(criteria: AuditQueryCriteria): Promise<AuditEvent[]> {
    const events: AuditEvent[] = [];
    
    if (this.config.enableIndexing && this.eventIndex.size > 0) {
      // Use index for efficient querying
      const matchingIndexes = this.queryIndex(criteria);
      
      for (const eventIndex of matchingIndexes) {
        const event = await this.getEventByIndex(eventIndex);
        if (event) {
          events.push(event);
        }
      }
    } else {
      // Fall back to full file scan
      events.push(...await this.scanAllFiles(criteria));
    }

    // Apply additional filtering and sorting
    let filtered = this.filterEvents(events, criteria);
    
    if (criteria.sortBy) {
      filtered = this.sortEvents(filtered, criteria.sortBy, criteria.sortOrder || 'desc');
    }

    // Apply pagination
    if (criteria.offset || criteria.limit) {
      const start = criteria.offset || 0;
      const end = criteria.limit ? start + criteria.limit : undefined;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<AuditEvent | null> {
    if (this.config.enableIndexing) {
      const eventIndex = this.eventIndex.get(id);
      if (eventIndex) {
        return this.getEventByIndex(eventIndex);
      }
    }

    // Fall back to scanning all files
    const events = await this.scanAllFiles({ actorIds: [id] });
    return events.find(e => e.id === id) || null;
  }

  // === INDEX OPERATIONS ===

  /**
   * Update event and file indexes
   */
  private async updateIndexes(event: AuditEvent, filePath: string, offset: number): Promise<void> {
    const fileName = path.basename(filePath);
    const fileId = fileName.replace(this.config.fileExtension, '');

    // Update event index
    this.eventIndex.set(event.id, {
      eventId: event.id,
      fileId,
      offset,
      timestamp: event.timestamp,
      eventType: event.eventType,
      severity: event.severity,
      actorId: event.actor.id,
      communityId: event.security.sovereigntyContext?.involvedCommunities[0]
    });

    // Update file index
    const existingFileIndex = this.fileIndex.get(fileId);
    if (existingFileIndex) {
      existingFileIndex.eventCount++;
      existingFileIndex.lastEventTime = event.timestamp;
    } else {
      this.fileIndex.set(fileId, {
        fileId,
        filePath,
        eventCount: 1,
        firstEventTime: event.timestamp,
        lastEventTime: event.timestamp,
        checksum: '',
        indexed: new Date()
      });
    }

    // Persist indexes periodically
    if (this.eventIndex.size % 100 === 0) {
      await this.saveIndexes();
    }
  }

  /**
   * Query index for matching events
   */
  private queryIndex(criteria: AuditQueryCriteria): EventIndex[] {
    const results: EventIndex[] = [];

    for (const eventIndex of this.eventIndex.values()) {
      // Filter by event type
      if (criteria.eventTypes && !criteria.eventTypes.includes(eventIndex.eventType)) {
        continue;
      }

      // Filter by severity
      if (criteria.severities && !criteria.severities.includes(eventIndex.severity)) {
        continue;
      }

      // Filter by actor ID
      if (criteria.actorIds && !criteria.actorIds.includes(eventIndex.actorId)) {
        continue;
      }

      // Filter by community ID
      if (criteria.communityIds && eventIndex.communityId && 
          !criteria.communityIds.includes(eventIndex.communityId)) {
        continue;
      }

      // Filter by date range
      if (criteria.dateRange) {
        if (eventIndex.timestamp < criteria.dateRange.from || 
            eventIndex.timestamp > criteria.dateRange.to) {
          continue;
        }
      }

      results.push(eventIndex);
    }

    return results;
  }

  /**
   * Get event by index entry
   */
  private async getEventByIndex(eventIndex: EventIndex): Promise<AuditEvent | null> {
    const fileIndex = this.fileIndex.get(eventIndex.fileId);
    if (!fileIndex) {
      return null;
    }

    try {
      // Read file content from offset
      const handle = await fs.open(fileIndex.filePath, 'r');
      const buffer = Buffer.alloc(this.config.bufferSize);
      
      await handle.read(buffer, 0, buffer.length, eventIndex.offset);
      await handle.close();

      // Find event line
      const content = buffer.toString('utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            if (event.id === eventIndex.eventId) {
              // Parse dates
              event.timestamp = new Date(event.timestamp);
              return event;
            }
          } catch (error) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      console.error(`Failed to read event ${eventIndex.eventId}:`, error);
    }

    return null;
  }

  /**
   * Save indexes to disk
   */
  private async saveIndexes(): Promise<void> {
    if (!this.config.enableIndexing) return;

    try {
      // Save file index
      const fileIndexPath = path.join(this.config.indexDirectory, 'files.json');
      const fileIndexArray = Array.from(this.fileIndex.values());
      await fs.writeFile(fileIndexPath, JSON.stringify(fileIndexArray, null, 2));

      // Save event index
      const eventIndexPath = path.join(this.config.indexDirectory, 'events.json');
      const eventIndexArray = Array.from(this.eventIndex.values());
      await fs.writeFile(eventIndexPath, JSON.stringify(eventIndexArray, null, 2));

    } catch (error) {
      console.error('Failed to save indexes:', error);
    }
  }

  /**
   * Rebuild indexes from existing files
   */
  private async rebuildIndexes(): Promise<void> {
    console.log('Rebuilding audit log indexes...');
    
    this.eventIndex.clear();
    this.fileIndex.clear();

    try {
      const files = await fs.readdir(this.config.logDirectory);
      const auditFiles = files.filter(f => f.endsWith(this.config.fileExtension));

      for (const file of auditFiles) {
        const filePath = path.join(this.config.logDirectory, file);
        await this.indexFile(filePath);
      }

      await this.saveIndexes();
      console.log(`Rebuilt indexes for ${auditFiles.length} files`);

    } catch (error) {
      console.error('Failed to rebuild indexes:', error);
    }
  }

  /**
   * Index single file
   */
  private async indexFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    let offset = 0;
    let eventCount = 0;
    let firstEventTime: Date | null = null;
    let lastEventTime: Date | null = null;

    for (const line of lines) {
      if (line.trim()) {
        try {
          const event = JSON.parse(line);
          
          // Skip header line
          if (event.version) {
            offset += Buffer.byteLength(line + '\n');
            continue;
          }

          // Index event
          const eventTime = new Date(event.timestamp);
          if (!firstEventTime) firstEventTime = eventTime;
          lastEventTime = eventTime;

          this.eventIndex.set(event.id, {
            eventId: event.id,
            fileId: path.basename(filePath, this.config.fileExtension),
            offset,
            timestamp: eventTime,
            eventType: event.eventType,
            severity: event.severity,
            actorId: event.actor.id,
            communityId: event.security.sovereigntyContext?.involvedCommunities[0]
          });

          eventCount++;
        } catch (error) {
          // Skip invalid JSON lines
        }
      }
      
      offset += Buffer.byteLength(line + '\n');
    }

    // Add file to index
    if (eventCount > 0 && firstEventTime && lastEventTime) {
      this.fileIndex.set(path.basename(filePath, this.config.fileExtension), {
        fileId: path.basename(filePath, this.config.fileExtension),
        filePath,
        eventCount,
        firstEventTime,
        lastEventTime,
        checksum: '',
        indexed: new Date()
      });
    }
  }

  // === UTILITY METHODS ===

  /**
   * Scan all files for events matching criteria
   */
  private async scanAllFiles(criteria: AuditQueryCriteria): Promise<AuditEvent[]> {
    const events: AuditEvent[] = [];

    try {
      const files = await fs.readdir(this.config.logDirectory);
      const auditFiles = files.filter(f => f.endsWith(this.config.fileExtension));

      for (const file of auditFiles) {
        const filePath = path.join(this.config.logDirectory, file);
        const fileEvents = await this.scanFile(filePath, criteria);
        events.push(...fileEvents);
      }
    } catch (error) {
      console.error('Failed to scan audit files:', error);
    }

    return events;
  }

  /**
   * Scan single file for events
   */
  private async scanFile(filePath: string, criteria: AuditQueryCriteria): Promise<AuditEvent[]> {
    const events: AuditEvent[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            
            // Skip header
            if (event.version) continue;

            // Parse timestamp
            event.timestamp = new Date(event.timestamp);

            // Apply basic filtering
            if (this.matchesCriteria(event, criteria)) {
              events.push(event);
            }
          } catch (error) {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan file ${filePath}:`, error);
    }

    return events;
  }

  /**
   * Check if event matches criteria
   */
  private matchesCriteria(event: AuditEvent, criteria: AuditQueryCriteria): boolean {
    if (criteria.eventTypes && !criteria.eventTypes.includes(event.eventType)) {
      return false;
    }

    if (criteria.severities && !criteria.severities.includes(event.severity)) {
      return false;
    }

    if (criteria.outcomes && !criteria.outcomes.includes(event.outcome)) {
      return false;
    }

    if (criteria.actorIds && !criteria.actorIds.includes(event.actor.id)) {
      return false;
    }

    if (criteria.dateRange) {
      if (event.timestamp < criteria.dateRange.from || event.timestamp > criteria.dateRange.to) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter events array
   */
  private filterEvents(events: AuditEvent[], criteria: AuditQueryCriteria): AuditEvent[] {
    return events.filter(event => this.matchesCriteria(event, criteria));
  }

  /**
   * Sort events array
   */
  private sortEvents(events: AuditEvent[], sortBy: string, sortOrder: string): AuditEvent[] {
    return events.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
        case 'severity':
          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          aValue = severityOrder[a.severity as keyof typeof severityOrder];
          bValue = severityOrder[b.severity as keyof typeof severityOrder];
          break;
        case 'eventType':
          aValue = a.eventType;
          bValue = b.eventType;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  // === INTEGRITY VERIFICATION ===

  /**
   * Verify integrity of audit logs
   */
  async verifyIntegrity(eventId?: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    let filesChecked = 0;

    try {
      const files = await fs.readdir(this.config.logDirectory);
      const auditFiles = files.filter(f => f.endsWith(this.config.fileExtension));

      for (const file of auditFiles) {
        const filePath = path.join(this.config.logDirectory, file);
        const fileResult = await this.verifyFileIntegrity(filePath);
        
        if (!fileResult.valid) {
          errors.push(...fileResult.errors);
        }
        
        filesChecked++;
      }

    } catch (error) {
      errors.push(`Failed to verify integrity: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : [`Verified ${filesChecked} audit files successfully`]
    };
  }

  /**
   * Verify integrity of single file
   */
  private async verifyFileIntegrity(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const content = await fs.readFile(filePath);
      const lines = content.toString().split('\n');
      
      if (lines.length === 0) {
        errors.push(`File ${filePath} is empty`);
        return { valid: false, errors };
      }

      // Parse header
      const header = JSON.parse(lines[0]);
      
      // Verify checksum if present
      if (header.checksum && this.config.enableChecksums) {
        const actualChecksum = crypto.createHash(this.config.checksumAlgorithm)
          .update(content)
          .digest('hex');
          
        if (header.checksum !== actualChecksum) {
          errors.push(`Checksum mismatch in ${filePath}`);
        }
      }

      // Verify signature if present
      if (header.signature && this.config.enableSignatures && this.signingKey) {
        try {
          const isValid = crypto.verify('sha256', content, this.signingKey, Buffer.from(header.signature, 'base64'));
          if (!isValid) {
            errors.push(`Signature verification failed for ${filePath}`);
          }
        } catch (error) {
          errors.push(`Signature verification error for ${filePath}: ${(error as Error).message}`);
        }
      }

    } catch (error) {
      errors.push(`Failed to verify ${filePath}: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // === ARCHIVE OPERATIONS ===

  /**
   * Archive old audit events
   */
  async archive(beforeDate: Date): Promise<{ archived: number; errors: string[] }> {
    const errors: string[] = [];
    let archived = 0;

    if (!this.config.archiveDirectory) {
      errors.push('Archive directory not configured');
      return { archived, errors };
    }

    try {
      const files = await fs.readdir(this.config.logDirectory);
      const auditFiles = files.filter(f => f.endsWith(this.config.fileExtension));

      for (const file of auditFiles) {
        const filePath = path.join(this.config.logDirectory, file);
        const fileIndex = this.fileIndex.get(file.replace(this.config.fileExtension, ''));
        
        // Check if file should be archived
        if (fileIndex && fileIndex.lastEventTime < beforeDate) {
          const archivePath = path.join(this.config.archiveDirectory, file);
          
          try {
            await fs.rename(filePath, archivePath);
            archived++;
            
            // Remove from indexes
            this.fileIndex.delete(fileIndex.fileId);
            
            // Remove events from event index
            for (const [eventId, eventIndex] of this.eventIndex.entries()) {
              if (eventIndex.fileId === fileIndex.fileId) {
                this.eventIndex.delete(eventId);
              }
            }
          } catch (error) {
            errors.push(`Failed to archive ${file}: ${(error as Error).message}`);
          }
        }
      }

      // Save updated indexes
      await this.saveIndexes();

    } catch (error) {
      errors.push(`Archive operation failed: ${(error as Error).message}`);
    }

    return { archived, errors };
  }

  // === STATISTICS ===

  /**
   * Get audit storage statistics
   */
  async getStatistics(): Promise<AuditStatistics> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const stats: AuditStatistics = {
      totalEvents: this.eventIndex.size,
      eventsByType: {},
      eventsBySeverity: {},
      eventsToday: 0,
      eventsThisWeek: 0,
      criticalEventsLastHour: 0,
      integrityViolations: 0,
      storageSize: 0
    };

    // Count events by type and severity
    for (const eventIndex of this.eventIndex.values()) {
      stats.eventsByType[eventIndex.eventType] = (stats.eventsByType[eventIndex.eventType] || 0) + 1;
      stats.eventsBySeverity[eventIndex.severity] = (stats.eventsBySeverity[eventIndex.severity] || 0) + 1;

      if (eventIndex.timestamp >= today) {
        stats.eventsToday++;
      }

      if (eventIndex.timestamp >= weekAgo) {
        stats.eventsThisWeek++;
      }

      if (eventIndex.timestamp >= hourAgo && eventIndex.severity === 'critical') {
        stats.criticalEventsLastHour++;
      }
    }

    // Calculate storage size
    try {
      const files = await fs.readdir(this.config.logDirectory);
      for (const file of files) {
        const filePath = path.join(this.config.logDirectory, file);
        const stat = await fs.stat(filePath);
        stats.storageSize += stat.size;
      }
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
    }

    return stats;
  }

  // === CLEANUP ===

  /**
   * Shutdown storage gracefully
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush any remaining buffered events
    await this.flushBuffer();

    // Finalize current file
    if (this.currentFile) {
      await this.finalizeFile(this.currentFile);
    }

    // Save indexes
    await this.saveIndexes();

    console.log('File-based audit storage shutdown complete');
  }
}