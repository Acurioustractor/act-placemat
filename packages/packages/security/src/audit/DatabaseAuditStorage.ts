/**
 * Database Audit Storage for ACT Placemat
 * 
 * Scalable database storage for audit logs with immutable records,
 * integrity constraints, and Australian compliance features
 */

import { z } from 'zod';
import crypto from 'crypto';
import { 
  AuditStorage, 
  AuditEvent, 
  AuditQueryCriteria, 
  AuditStatistics 
} from './AuditLogger';

// === DATABASE CONFIGURATION ===

export const DatabaseStorageConfigSchema = z.object({
  // Database connection
  connectionString: z.string(),
  tableName: z.string().default('audit_events'),
  indexTableName: z.string().default('audit_indexes'),
  archiveTableName: z.string().default('audit_archive'),
  
  // Database features
  enablePartitioning: z.boolean().default(true),
  partitionBy: z.enum(['date', 'event_type', 'severity']).default('date'),
  enableCompression: z.boolean().default(true),
  
  // Performance settings
  batchSize: z.number().default(1000),
  connectionPoolSize: z.number().default(10),
  queryTimeout: z.number().default(30000),
  enablePreparedStatements: z.boolean().default(true),
  
  // Integrity settings
  enableImmutableTables: z.boolean().default(true),
  enableRowLevelSecurity: z.boolean().default(true),
  enableChecksums: z.boolean().default(true),
  enableAuditTriggers: z.boolean().default(true),
  
  // Index settings
  enableCustomIndexes: z.boolean().default(true),
  indexColumns: z.array(z.string()).default([
    'event_type', 'severity', 'actor_id', 'timestamp', 'community_id'
  ]),
  enableFullTextSearch: z.boolean().default(true),
  
  // Australian compliance
  enableDataResidency: z.boolean().default(true),
  enableEncryptionAtRest: z.boolean().default(true),
  auditTableAccess: z.boolean().default(true)
});

export type DatabaseStorageConfig = z.infer<typeof DatabaseStorageConfigSchema>;

// === DATABASE INTERFACES ===

interface DatabaseConnection {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<{ rowsAffected: number }>;
  transaction<T>(callback: (conn: DatabaseConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

interface AuditEventRow {
  id: string;
  event_type: string;
  severity: string;
  action: string;
  description: string;
  outcome: string;
  timestamp: Date;
  
  // Actor information
  actor_type: string;
  actor_id: string;
  actor_name?: string;
  actor_roles: string; // JSON array
  actor_ip?: string;
  actor_user_agent?: string;
  actor_session_id?: string;
  
  // Source information
  source_service: string;
  source_component: string;
  source_version?: string;
  
  // Target information
  target_type?: string;
  target_id?: string;
  target_name?: string;
  target_attributes: string; // JSON object
  
  // Request/Response data
  request_method?: string;
  request_endpoint?: string;
  request_parameters: string; // JSON object
  request_headers: string; // JSON object
  response_status_code?: number;
  response_time?: number;
  response_data_size?: number;
  
  // Security context
  security_classification: string;
  security_risk_level: string;
  security_requires_notification: boolean;
  security_compliance_frameworks: string; // JSON array
  
  // Sovereignty context
  community_id?: string;
  sovereignty_data_type?: string;
  sovereignty_consent_required: boolean;
  
  // Metadata
  metadata: string; // JSON object
  
  // Compliance tracking
  compliance_australian_privacy_act: boolean;
  compliance_indigenous_sovereignty: boolean;
  compliance_data_residency: boolean;
  compliance_retention_period?: number;
  compliance_archive_required: boolean;
  
  // Integrity protection
  integrity_hash?: string;
  integrity_signature?: string;
  integrity_previous_hash?: string;
  integrity_sequence_number?: number;
  
  // System fields
  created_at: Date;
  checksum: string;
}

// === DATABASE AUDIT STORAGE ===

export class DatabaseAuditStorage implements AuditStorage {
  private config: DatabaseStorageConfig;
  private connection?: DatabaseConnection;
  private insertStatement?: string;
  private batchBuffer: AuditEvent[] = [];
  private lastSequenceNumber = 0;
  private lastEventHash = '';

  constructor(config: DatabaseStorageConfig) {
    this.config = DatabaseStorageConfigSchema.parse(config);
  }

  // === INITIALIZATION ===

  /**
   * Initialize database connection and schema
   */
  async initialize(): Promise<void> {
    // Connect to database
    this.connection = await this.createConnection();
    
    // Create tables if they don't exist
    await this.createTables();
    
    // Create indexes for performance
    await this.createIndexes();
    
    // Load sequence state
    await this.loadSequenceState();
    
    // Prepare statements
    if (this.config.enablePreparedStatements) {
      this.insertStatement = this.buildInsertStatement();
    }
    
    console.log('Database audit storage initialized');
  }

  /**
   * Create database connection
   */
  private async createConnection(): Promise<DatabaseConnection> {
    // This is a placeholder for actual database connection implementation
    // In production, this would use appropriate database drivers (pg, mysql2, etc.)
    
    return {
      async query(sql: string, params?: any[]): Promise<any[]> {
        console.log('Database query:', sql, params);
        return [];
      },
      
      async execute(sql: string, params?: any[]): Promise<{ rowsAffected: number }> {
        console.log('Database execute:', sql, params);
        return { rowsAffected: 1 };
      },
      
      async transaction<T>(callback: (conn: DatabaseConnection) => Promise<T>): Promise<T> {
        return callback(this);
      },
      
      async close(): Promise<void> {
        console.log('Database connection closed');
      }
    };
  }

  /**
   * Create audit tables with immutable and compliance features
   */
  private async createTables(): Promise<void> {
    if (!this.connection) throw new Error('Database not connected');

    // Main audit events table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        id VARCHAR(36) PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        action VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        outcome VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP(3) NOT NULL,
        
        -- Actor information
        actor_type VARCHAR(50) NOT NULL,
        actor_id VARCHAR(255) NOT NULL,
        actor_name VARCHAR(255),
        actor_roles JSON,
        actor_ip VARCHAR(45),
        actor_user_agent TEXT,
        actor_session_id VARCHAR(255),
        
        -- Source information
        source_service VARCHAR(100) NOT NULL,
        source_component VARCHAR(100) NOT NULL,
        source_version VARCHAR(50),
        
        -- Target information
        target_type VARCHAR(100),
        target_id VARCHAR(255),
        target_name VARCHAR(255),
        target_attributes JSON,
        
        -- Request/Response data
        request_method VARCHAR(10),
        request_endpoint VARCHAR(500),
        request_parameters JSON,
        request_headers JSON,
        response_status_code INTEGER,
        response_time INTEGER,
        response_data_size INTEGER,
        
        -- Security context
        security_classification VARCHAR(20) NOT NULL,
        security_risk_level VARCHAR(20) NOT NULL,
        security_requires_notification BOOLEAN DEFAULT FALSE,
        security_compliance_frameworks JSON,
        
        -- Sovereignty context
        community_id VARCHAR(255),
        sovereignty_data_type VARCHAR(100),
        sovereignty_consent_required BOOLEAN DEFAULT FALSE,
        
        -- Metadata
        metadata JSON,
        
        -- Compliance tracking
        compliance_australian_privacy_act BOOLEAN DEFAULT FALSE,
        compliance_indigenous_sovereignty BOOLEAN DEFAULT FALSE,
        compliance_data_residency BOOLEAN DEFAULT FALSE,
        compliance_retention_period INTEGER,
        compliance_archive_required BOOLEAN DEFAULT FALSE,
        
        -- Integrity protection
        integrity_hash VARCHAR(64),
        integrity_signature TEXT,
        integrity_previous_hash VARCHAR(64),
        integrity_sequence_number INTEGER,
        
        -- System fields
        created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
        checksum VARCHAR(64) NOT NULL
        
      ) ${this.config.enableImmutableTables ? 'WITH (immutable = true)' : ''}
      ${this.config.enablePartitioning ? `PARTITION BY RANGE (${this.getPartitionColumn()})` : ''}
    `;

    await this.connection.execute(createTableSQL);

    // Archive table with same structure
    const createArchiveTableSQL = createTableSQL.replace(
      this.config.tableName,
      this.config.archiveTableName
    );
    
    await this.connection.execute(createArchiveTableSQL);

    // Audit indexes table for metadata
    const createIndexTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.indexTableName} (
        table_name VARCHAR(100) NOT NULL,
        column_name VARCHAR(100) NOT NULL,
        index_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
        statistics JSON,
        PRIMARY KEY (table_name, column_name, index_type)
      )
    `;

    await this.connection.execute(createIndexTableSQL);

    // Create audit triggers if enabled
    if (this.config.enableAuditTriggers) {
      await this.createAuditTriggers();
    }
  }

  /**
   * Create database indexes for performance
   */
  private async createIndexes(): Promise<void> {
    if (!this.connection || !this.config.enableCustomIndexes) return;

    const indexes = [
      // Core query indexes
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_timestamp ON ${this.config.tableName} (timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_event_type ON ${this.config.tableName} (event_type)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_severity ON ${this.config.tableName} (severity)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_actor ON ${this.config.tableName} (actor_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_outcome ON ${this.config.tableName} (outcome)`,
      
      // Compliance indexes
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_community ON ${this.config.tableName} (community_id) WHERE community_id IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_classification ON ${this.config.tableName} (security_classification)`,
      
      // Composite indexes for common queries
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_type_severity ON ${this.config.tableName} (event_type, severity, timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_actor_time ON ${this.config.tableName} (actor_id, timestamp DESC)`,
      
      // Integrity indexes
      `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_sequence ON ${this.config.tableName} (integrity_sequence_number) WHERE integrity_sequence_number IS NOT NULL`
    ];

    // Full-text search index
    if (this.config.enableFullTextSearch) {
      indexes.push(
        `CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_fulltext ON ${this.config.tableName} USING gin(to_tsvector('english', description || ' ' || action))`
      );
    }

    for (const indexSQL of indexes) {
      try {
        await this.connection.execute(indexSQL);
      } catch (error) {
        console.warn('Failed to create index:', indexSQL, error);
      }
    }
  }

  /**
   * Create audit triggers for immutability
   */
  private async createAuditTriggers(): Promise<void> {
    if (!this.connection) return;

    // Trigger to prevent updates/deletes
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION prevent_audit_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Audit records cannot be deleted for compliance reasons';
        END IF;
        
        IF TG_OP = 'UPDATE' THEN
          RAISE EXCEPTION 'Audit records cannot be updated for compliance reasons';
        END IF;
        
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER prevent_${this.config.tableName}_modification
        BEFORE UPDATE OR DELETE ON ${this.config.tableName}
        FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
    `;

    try {
      await this.connection.execute(triggerSQL);
    } catch (error) {
      console.warn('Failed to create audit triggers:', error);
    }
  }

  /**
   * Load current sequence state for blockchain-like chaining
   */
  private async loadSequenceState(): Promise<void> {
    if (!this.connection) return;

    try {
      const result = await this.connection.query(`
        SELECT 
          integrity_sequence_number,
          integrity_hash
        FROM ${this.config.tableName}
        WHERE integrity_sequence_number IS NOT NULL
        ORDER BY integrity_sequence_number DESC
        LIMIT 1
      `);

      if (result.length > 0) {
        this.lastSequenceNumber = result[0].integrity_sequence_number || 0;
        this.lastEventHash = result[0].integrity_hash || '';
      }
    } catch (error) {
      console.warn('Failed to load sequence state:', error);
    }
  }

  // === STORAGE OPERATIONS ===

  /**
   * Store single audit event
   */
  async store(event: AuditEvent): Promise<void> {
    if (this.config.batchSize > 1) {
      this.batchBuffer.push(event);
      
      if (this.batchBuffer.length >= this.config.batchSize) {
        await this.flushBatch();
      }
    } else {
      await this.insertEvent(event);
    }
  }

  /**
   * Store batch of audit events
   */
  async storeBatch(events: AuditEvent[]): Promise<void> {
    if (!this.connection) throw new Error('Database not connected');

    await this.connection.transaction(async (conn) => {
      for (const event of events) {
        await this.insertEvent(event, conn);
      }
    });
  }

  /**
   * Insert single event into database
   */
  private async insertEvent(event: AuditEvent, conn?: DatabaseConnection): Promise<void> {
    const connection = conn || this.connection;
    if (!connection) throw new Error('Database not connected');

    // Convert event to database row
    const row = this.eventToRow(event);
    
    // Add integrity protection
    this.addIntegrityProtection(row, event);
    
    // Calculate checksum
    row.checksum = this.calculateRowChecksum(row);

    // Insert into database
    const sql = this.buildInsertStatement();
    const params = this.rowToParams(row);

    await connection.execute(sql, params);
  }

  /**
   * Convert audit event to database row
   */
  private eventToRow(event: AuditEvent): AuditEventRow {
    return {
      id: event.id,
      event_type: event.eventType,
      severity: event.severity,
      action: event.action,
      description: event.description,
      outcome: event.outcome,
      timestamp: event.timestamp,
      
      // Actor information
      actor_type: event.actor.type,
      actor_id: event.actor.id,
      actor_name: event.actor.name,
      actor_roles: JSON.stringify(event.actor.roles || []),
      actor_ip: event.actor.ipAddress,
      actor_user_agent: event.actor.userAgent,
      actor_session_id: event.actor.sessionId,
      
      // Source information
      source_service: event.source.service,
      source_component: event.source.component,
      source_version: event.source.version,
      
      // Target information
      target_type: event.target?.type,
      target_id: event.target?.id,
      target_name: event.target?.name,
      target_attributes: JSON.stringify(event.target?.attributes || {}),
      
      // Request/Response data
      request_method: event.request?.method,
      request_endpoint: event.request?.endpoint,
      request_parameters: JSON.stringify(event.request?.parameters || {}),
      request_headers: JSON.stringify(event.request?.headers || {}),
      response_status_code: event.response?.statusCode,
      response_time: event.response?.responseTime,
      response_data_size: event.response?.dataSize,
      
      // Security context
      security_classification: event.security.classification,
      security_risk_level: event.security.riskLevel,
      security_requires_notification: event.security.requiresNotification,
      security_compliance_frameworks: JSON.stringify(event.security.complianceFrameworks),
      
      // Sovereignty context
      community_id: event.security.sovereigntyContext?.involvedCommunities[0],
      sovereignty_data_type: event.security.sovereigntyContext?.dataType,
      sovereignty_consent_required: event.security.sovereigntyContext?.consentRequired || false,
      
      // Metadata
      metadata: JSON.stringify(event.metadata),
      
      // Compliance tracking
      compliance_australian_privacy_act: event.compliance.australianPrivacyAct,
      compliance_indigenous_sovereignty: event.compliance.indigenousSovereignty,
      compliance_data_residency: event.compliance.dataResidency,
      compliance_retention_period: event.compliance.retentionPeriod,
      compliance_archive_required: event.compliance.archiveRequired,
      
      // Integrity (will be set by addIntegrityProtection)
      integrity_hash: '',
      integrity_signature: '',
      integrity_previous_hash: '',
      integrity_sequence_number: 0,
      
      // System fields
      created_at: new Date(),
      checksum: ''
    };
  }

  /**
   * Add integrity protection to database row
   */
  private addIntegrityProtection(row: AuditEventRow, event: AuditEvent): void {
    // Use integrity data from event if available
    if (event.integrity?.hash) {
      row.integrity_hash = event.integrity.hash;
      row.integrity_signature = event.integrity.signature;
      row.integrity_previous_hash = event.integrity.previousHash;
      row.integrity_sequence_number = event.integrity.sequenceNumber;
    } else {
      // Generate integrity data
      const rowData = this.getRowDataForHashing(row);
      row.integrity_hash = crypto.createHash('sha256').update(rowData).digest('hex');
      row.integrity_previous_hash = this.lastEventHash;
      row.integrity_sequence_number = ++this.lastSequenceNumber;
      
      this.lastEventHash = row.integrity_hash;
    }
  }

  /**
   * Calculate row checksum
   */
  private calculateRowChecksum(row: AuditEventRow): string {
    const { checksum, created_at, ...rowData } = row;
    const dataString = JSON.stringify(rowData, Object.keys(rowData).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Get row data for integrity hashing
   */
  private getRowDataForHashing(row: AuditEventRow): string {
    const { integrity_hash, integrity_signature, integrity_previous_hash, integrity_sequence_number, created_at, checksum, ...hashData } = row;
    return JSON.stringify(hashData, Object.keys(hashData).sort());
  }

  // === QUERY OPERATIONS ===

  /**
   * Query audit events with criteria
   */
  async query(criteria: AuditQueryCriteria): Promise<AuditEvent[]> {
    if (!this.connection) throw new Error('Database not connected');

    const { sql, params } = this.buildQuerySQL(criteria);
    const rows = await this.connection.query(sql, params);

    return rows.map(row => this.rowToEvent(row));
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<AuditEvent | null> {
    if (!this.connection) throw new Error('Database not connected');

    const sql = `SELECT * FROM ${this.config.tableName} WHERE id = $1`;
    const rows = await this.connection.query(sql, [id]);

    return rows.length > 0 ? this.rowToEvent(rows[0]) : null;
  }

  /**
   * Build SQL query from criteria
   */
  private buildQuerySQL(criteria: AuditQueryCriteria): { sql: string; params: any[] } {
    let sql = `SELECT * FROM ${this.config.tableName} WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    // Event types filter
    if (criteria.eventTypes && criteria.eventTypes.length > 0) {
      const placeholders = criteria.eventTypes.map(() => `$${paramIndex++}`).join(',');
      sql += ` AND event_type IN (${placeholders})`;
      params.push(...criteria.eventTypes);
    }

    // Severities filter
    if (criteria.severities && criteria.severities.length > 0) {
      const placeholders = criteria.severities.map(() => `$${paramIndex++}`).join(',');
      sql += ` AND severity IN (${placeholders})`;
      params.push(...criteria.severities);
    }

    // Outcomes filter
    if (criteria.outcomes && criteria.outcomes.length > 0) {
      const placeholders = criteria.outcomes.map(() => `$${paramIndex++}`).join(',');
      sql += ` AND outcome IN (${placeholders})`;
      params.push(...criteria.outcomes);
    }

    // Actor IDs filter
    if (criteria.actorIds && criteria.actorIds.length > 0) {
      const placeholders = criteria.actorIds.map(() => `$${paramIndex++}`).join(',');
      sql += ` AND actor_id IN (${placeholders})`;
      params.push(...criteria.actorIds);
    }

    // Date range filter
    if (criteria.dateRange) {
      sql += ` AND timestamp >= $${paramIndex++} AND timestamp <= $${paramIndex++}`;
      params.push(criteria.dateRange.from, criteria.dateRange.to);
    }

    // Classifications filter
    if (criteria.classifications && criteria.classifications.length > 0) {
      const placeholders = criteria.classifications.map(() => `$${paramIndex++}`).join(',');
      sql += ` AND security_classification IN (${placeholders})`;
      params.push(...criteria.classifications);
    }

    // Community IDs filter
    if (criteria.communityIds && criteria.communityIds.length > 0) {
      const placeholders = criteria.communityIds.map(() => `$${paramIndex++}`).join(',');
      sql += ` AND community_id IN (${placeholders})`;
      params.push(...criteria.communityIds);
    }

    // Sorting
    if (criteria.sortBy) {
      const sortColumn = this.getSortColumn(criteria.sortBy);
      const sortOrder = criteria.sortOrder || 'desc';
      sql += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
    } else {
      sql += ` ORDER BY timestamp DESC`;
    }

    // Pagination
    if (criteria.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(criteria.limit);
    }

    if (criteria.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(criteria.offset);
    }

    return { sql, params };
  }

  /**
   * Convert database row to audit event
   */
  private rowToEvent(row: any): AuditEvent {
    return {
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      action: row.action,
      description: row.description,
      outcome: row.outcome,
      timestamp: new Date(row.timestamp),
      
      source: {
        service: row.source_service,
        component: row.source_component,
        version: row.source_version
      },
      
      actor: {
        type: row.actor_type,
        id: row.actor_id,
        name: row.actor_name,
        roles: JSON.parse(row.actor_roles || '[]'),
        ipAddress: row.actor_ip,
        userAgent: row.actor_user_agent,
        sessionId: row.actor_session_id
      },
      
      target: row.target_type ? {
        type: row.target_type,
        id: row.target_id,
        name: row.target_name,
        attributes: JSON.parse(row.target_attributes || '{}')
      } : undefined,
      
      request: row.request_method ? {
        method: row.request_method,
        endpoint: row.request_endpoint,
        parameters: JSON.parse(row.request_parameters || '{}'),
        headers: JSON.parse(row.request_headers || '{}')
      } : undefined,
      
      response: row.response_status_code ? {
        statusCode: row.response_status_code,
        responseTime: row.response_time,
        dataSize: row.response_data_size
      } : undefined,
      
      security: {
        classification: row.security_classification,
        riskLevel: row.security_risk_level,
        requiresNotification: row.security_requires_notification,
        complianceFrameworks: JSON.parse(row.security_compliance_frameworks || '[]'),
        sovereigntyContext: row.community_id ? {
          involvedCommunities: [row.community_id],
          dataType: row.sovereignty_data_type,
          consentRequired: row.sovereignty_consent_required
        } : undefined
      },
      
      metadata: JSON.parse(row.metadata || '{}'),
      
      compliance: {
        australianPrivacyAct: row.compliance_australian_privacy_act,
        indigenousSovereignty: row.compliance_indigenous_sovereignty,
        dataResidency: row.compliance_data_residency,
        retentionPeriod: row.compliance_retention_period,
        archiveRequired: row.compliance_archive_required
      },
      
      integrity: row.integrity_hash ? {
        hash: row.integrity_hash,
        signature: row.integrity_signature,
        previousHash: row.integrity_previous_hash,
        sequenceNumber: row.integrity_sequence_number
      } : undefined
    };
  }

  // === UTILITY METHODS ===

  /**
   * Build parameterized INSERT statement
   */
  private buildInsertStatement(): string {
    const columns = [
      'id', 'event_type', 'severity', 'action', 'description', 'outcome', 'timestamp',
      'actor_type', 'actor_id', 'actor_name', 'actor_roles', 'actor_ip', 'actor_user_agent', 'actor_session_id',
      'source_service', 'source_component', 'source_version',
      'target_type', 'target_id', 'target_name', 'target_attributes',
      'request_method', 'request_endpoint', 'request_parameters', 'request_headers',
      'response_status_code', 'response_time', 'response_data_size',
      'security_classification', 'security_risk_level', 'security_requires_notification', 'security_compliance_frameworks',
      'community_id', 'sovereignty_data_type', 'sovereignty_consent_required',
      'metadata',
      'compliance_australian_privacy_act', 'compliance_indigenous_sovereignty', 'compliance_data_residency',
      'compliance_retention_period', 'compliance_archive_required',
      'integrity_hash', 'integrity_signature', 'integrity_previous_hash', 'integrity_sequence_number',
      'checksum'
    ];

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
    
    return `INSERT INTO ${this.config.tableName} (${columns.join(',')}) VALUES (${placeholders})`;
  }

  /**
   * Convert row to parameter array
   */
  private rowToParams(row: AuditEventRow): any[] {
    return [
      row.id, row.event_type, row.severity, row.action, row.description, row.outcome, row.timestamp,
      row.actor_type, row.actor_id, row.actor_name, row.actor_roles, row.actor_ip, row.actor_user_agent, row.actor_session_id,
      row.source_service, row.source_component, row.source_version,
      row.target_type, row.target_id, row.target_name, row.target_attributes,
      row.request_method, row.request_endpoint, row.request_parameters, row.request_headers,
      row.response_status_code, row.response_time, row.response_data_size,
      row.security_classification, row.security_risk_level, row.security_requires_notification, row.security_compliance_frameworks,
      row.community_id, row.sovereignty_data_type, row.sovereignty_consent_required,
      row.metadata,
      row.compliance_australian_privacy_act, row.compliance_indigenous_sovereignty, row.compliance_data_residency,
      row.compliance_retention_period, row.compliance_archive_required,
      row.integrity_hash, row.integrity_signature, row.integrity_previous_hash, row.integrity_sequence_number,
      row.checksum
    ];
  }

  /**
   * Get partition column based on configuration
   */
  private getPartitionColumn(): string {
    switch (this.config.partitionBy) {
      case 'date':
        return 'timestamp';
      case 'event_type':
        return 'event_type';
      case 'severity':
        return 'severity';
      default:
        return 'timestamp';
    }
  }

  /**
   * Get sort column from criteria
   */
  private getSortColumn(sortBy: string): string {
    switch (sortBy) {
      case 'timestamp':
        return 'timestamp';
      case 'severity':
        return 'severity';
      case 'eventType':
        return 'event_type';
      default:
        return 'timestamp';
    }
  }

  /**
   * Flush batch buffer
   */
  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const events = this.batchBuffer.splice(0);
    await this.storeBatch(events);
  }

  // === INTEGRITY VERIFICATION ===

  /**
   * Verify integrity of audit logs
   */
  async verifyIntegrity(eventId?: string): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.connection) throw new Error('Database not connected');

    const errors: string[] = [];
    let eventsChecked = 0;

    try {
      let sql = `
        SELECT id, checksum, integrity_hash, integrity_previous_hash, integrity_sequence_number
        FROM ${this.config.tableName}
      `;
      
      if (eventId) {
        sql += ` WHERE id = $1`;
      } else {
        sql += ` ORDER BY integrity_sequence_number`;
      }

      const rows = await this.connection.query(sql, eventId ? [eventId] : []);
      
      let previousHash = '';
      let expectedSequence = 1;

      for (const row of rows) {
        eventsChecked++;

        // Verify checksum
        if (this.config.enableChecksums) {
          const event = await this.getEventById(row.id);
          if (event) {
            const eventRow = this.eventToRow(event);
            const expectedChecksum = this.calculateRowChecksum(eventRow);
            
            if (row.checksum !== expectedChecksum) {
              errors.push(`Checksum mismatch for event ${row.id}`);
            }
          }
        }

        // Verify hash chain
        if (row.integrity_sequence_number) {
          if (row.integrity_sequence_number !== expectedSequence) {
            errors.push(`Sequence number mismatch for event ${row.id}: expected ${expectedSequence}, got ${row.integrity_sequence_number}`);
          }

          if (previousHash && row.integrity_previous_hash !== previousHash) {
            errors.push(`Hash chain broken at event ${row.id}`);
          }

          previousHash = row.integrity_hash;
          expectedSequence++;
        }
      }

    } catch (error) {
      errors.push(`Integrity verification failed: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : [`Verified ${eventsChecked} events successfully`]
    };
  }

  // === ARCHIVE OPERATIONS ===

  /**
   * Archive old events to separate table
   */
  async archive(beforeDate: Date): Promise<{ archived: number; errors: string[] }> {
    if (!this.connection) throw new Error('Database not connected');

    const errors: string[] = [];
    let archived = 0;

    try {
      await this.connection.transaction(async (conn) => {
        // Copy old events to archive table
        const insertSQL = `
          INSERT INTO ${this.config.archiveTableName}
          SELECT * FROM ${this.config.tableName}
          WHERE timestamp < $1
        `;
        
        const result = await conn.execute(insertSQL, [beforeDate]);
        archived = result.rowsAffected;

        // Delete from main table if immutable tables are not enabled
        if (!this.config.enableImmutableTables) {
          const deleteSQL = `
            DELETE FROM ${this.config.tableName}
            WHERE timestamp < $1
          `;
          
          await conn.execute(deleteSQL, [beforeDate]);
        }
      });

    } catch (error) {
      errors.push(`Archive operation failed: ${(error as Error).message}`);
    }

    return { archived, errors };
  }

  // === STATISTICS ===

  /**
   * Get audit statistics
   */
  async getStatistics(): Promise<AuditStatistics> {
    if (!this.connection) throw new Error('Database not connected');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get basic statistics
    const statsSQL = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN timestamp >= $1 THEN 1 END) as events_today,
        COUNT(CASE WHEN timestamp >= $2 THEN 1 END) as events_this_week,
        COUNT(CASE WHEN timestamp >= $3 AND severity = 'critical' THEN 1 END) as critical_events_last_hour,
        COUNT(CASE WHEN checksum != integrity_hash THEN 1 END) as integrity_violations
      FROM ${this.config.tableName}
    `;

    const [statsRow] = await this.connection.query(statsSQL, [today, weekAgo, hourAgo]);

    // Get events by type
    const typeSQL = `
      SELECT event_type, COUNT(*) as count
      FROM ${this.config.tableName}
      GROUP BY event_type
    `;
    
    const typeRows = await this.connection.query(typeSQL);
    const eventsByType: Record<string, number> = {};
    for (const row of typeRows) {
      eventsByType[row.event_type] = parseInt(row.count);
    }

    // Get events by severity
    const severitySQL = `
      SELECT severity, COUNT(*) as count
      FROM ${this.config.tableName}
      GROUP BY severity
    `;
    
    const severityRows = await this.connection.query(severitySQL);
    const eventsBySeverity: Record<string, number> = {};
    for (const row of severityRows) {
      eventsBySeverity[row.severity] = parseInt(row.count);
    }

    // Get storage size (database-specific)
    let storageSize = 0;
    try {
      const sizeSQL = `
        SELECT pg_total_relation_size('${this.config.tableName}') as size
      `;
      const [sizeRow] = await this.connection.query(sizeSQL);
      storageSize = parseInt(sizeRow?.size || '0');
    } catch (error) {
      // Storage size calculation may fail on different databases
    }

    return {
      totalEvents: parseInt(statsRow.total_events),
      eventsByType,
      eventsBySeverity,
      eventsToday: parseInt(statsRow.events_today),
      eventsThisWeek: parseInt(statsRow.events_this_week),
      criticalEventsLastHour: parseInt(statsRow.critical_events_last_hour),
      integrityViolations: parseInt(statsRow.integrity_violations),
      storageSize
    };
  }

  // === CLEANUP ===

  /**
   * Shutdown database connection
   */
  async shutdown(): Promise<void> {
    // Flush any remaining batch
    await this.flushBatch();

    // Close database connection
    if (this.connection) {
      await this.connection.close();
    }

    console.log('Database audit storage shutdown complete');
  }
}