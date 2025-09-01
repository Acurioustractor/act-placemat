/**
 * Audit Logger for Policy Middleware
 * 
 * Comprehensive audit logging for all middleware operations
 * with Australian compliance requirements and tamper-evident storage
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';
import { 
  PolicyEvaluatedRequest,
  PolicyEvaluation,
  MiddlewareError,
  DataTransformation
} from './types';
import { FinancialIntent, PolicyDecision } from '../types/financial';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  /** Unique audit log ID */
  id: string;
  
  /** Request ID for correlation */
  requestId: string;
  
  /** Timestamp of the event */
  timestamp: Date;
  
  /** Event type */
  eventType: AuditEventType;
  
  /** User context */
  userId?: string;
  organisationId?: string;
  
  /** Request details */
  request: {
    method: string;
    path: string;
    ipAddress: string;
    userAgent: string;
    headers: Record<string, any>;
    body: any;
  };
  
  /** Extracted intent */
  intent?: FinancialIntent;
  
  /** Policy evaluation result */
  evaluation?: PolicyEvaluation;
  
  /** Applied transformations */
  transformations?: DataTransformation[];
  
  /** Error details (if applicable) */
  error?: {
    type: string;
    message: string;
    stack?: string;
    retryable: boolean;
  };
  
  /** Performance metrics */
  performance: {
    extractionTime?: number;
    evaluationTime?: number;
    totalTime: number;
  };
  
  /** Compliance metadata */
  compliance: {
    frameworks: string[];
    consentLevel: string;
    sovereigntyLevel: string;
    dataClassification: string;
    retentionYears: number;
  };
  
  /** Integrity hash */
  hash: string;
  
  /** Previous log entry hash for chain integrity */
  previousHash?: string;
}

/**
 * Audit event types
 */
export enum AuditEventType {
  REQUEST_RECEIVED = 'request_received',
  INTENT_EXTRACTED = 'intent_extracted',
  POLICY_EVALUATED = 'policy_evaluated',
  REQUEST_ALLOWED = 'request_allowed',
  REQUEST_DENIED = 'request_denied',
  TRANSFORMATION_APPLIED = 'transformation_applied',
  ERROR_OCCURRED = 'error_occurred',
  CONSENT_REQUIRED = 'consent_required',
  COMPLIANCE_VIOLATION = 'compliance_violation'
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  /** Database connection */
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
    schema: string;
  };
  
  /** Logging configuration */
  logging: {
    level: 'minimal' | 'standard' | 'comprehensive';
    excludeFields: string[];
    includeRequestBody: boolean;
    includeResponseBody: boolean;
    maskSensitiveData: boolean;
  };
  
  /** Retention configuration */
  retention: {
    defaultYears: number;
    indigenousDataYears: number;
    financialDataYears: number;
    complianceDataYears: number;
  };
  
  /** Integrity configuration */
  integrity: {
    enableChaining: boolean;
    hashAlgorithm: string;
    signEntries: boolean;
    signingKey?: string;
  };
  
  /** Performance configuration */
  performance: {
    batchSize: number;
    flushInterval: number;
    enableAsyncLogging: boolean;
  };
}

/**
 * Audit logger implementation
 */
export class AuditLogger extends EventEmitter {
  private config: AuditLoggerConfig;
  private pool: Pool;
  private logQueue: AuditLogEntry[] = [];
  private lastHash?: string;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: AuditLoggerConfig) {
    super();
    this.config = config;
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    this.setupFlushTimer();
  }

  /**
   * Initialize audit logger
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await this.createAuditTables(client);
      await this.loadLastHash(client);
      this.emit('audit_logger:initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Log request received event
   */
  async logRequestReceived(req: PolicyEvaluatedRequest, startTime: number): Promise<void> {
    const entry = await this.createBaseLogEntry(
      req,
      AuditEventType.REQUEST_RECEIVED,
      startTime
    );

    await this.addToQueue(entry);
  }

  /**
   * Log intent extraction event
   */
  async logIntentExtracted(
    req: PolicyEvaluatedRequest,
    intent: FinancialIntent,
    extractionTime: number,
    startTime: number
  ): Promise<void> {
    const entry = await this.createBaseLogEntry(
      req,
      AuditEventType.INTENT_EXTRACTED,
      startTime
    );

    entry.intent = this.sanitizeIntent(intent);
    entry.performance.extractionTime = extractionTime;

    await this.addToQueue(entry);
  }

  /**
   * Log policy evaluation event
   */
  async logPolicyEvaluated(
    req: PolicyEvaluatedRequest,
    evaluation: PolicyEvaluation,
    startTime: number
  ): Promise<void> {
    const entry = await this.createBaseLogEntry(
      req,
      AuditEventType.POLICY_EVALUATED,
      startTime
    );

    entry.evaluation = this.sanitizeEvaluation(evaluation);
    entry.performance.evaluationTime = evaluation.evaluationTime;

    await this.addToQueue(entry);
  }

  /**
   * Log request allowed event
   */
  async logRequestAllowed(
    req: PolicyEvaluatedRequest,
    transformations: DataTransformation[],
    startTime: number
  ): Promise<void> {
    const entry = await this.createBaseLogEntry(
      req,
      AuditEventType.REQUEST_ALLOWED,
      startTime
    );

    entry.transformations = transformations;

    await this.addToQueue(entry);
  }

  /**
   * Log request denied event
   */
  async logRequestDenied(
    req: PolicyEvaluatedRequest,
    reason: string,
    suggestions: string[],
    startTime: number
  ): Promise<void> {
    const entry = await this.createBaseLogEntry(
      req,
      AuditEventType.REQUEST_DENIED,
      startTime
    );

    entry.error = {
      type: 'request_denied',
      message: reason,
      retryable: false
    };

    await this.addToQueue(entry);
  }

  /**
   * Log transformation applied event
   */
  async logTransformationApplied(
    req: PolicyEvaluatedRequest,
    transformation: DataTransformation,
    startTime: number
  ): Promise<void> {
    const entry = await this.createBaseLogEntry(
      req,
      AuditEventType.TRANSFORMATION_APPLIED,
      startTime
    );

    entry.transformations = [transformation];

    await this.addToQueue(entry);
  }

  /**
   * Log error event
   */
  async logError(
    req: PolicyEvaluatedRequest,
    error: MiddlewareError,
    startTime: number
  ): Promise<void> {
    const entry = await this.createBaseLogEntry(
      req,
      AuditEventType.ERROR_OCCURRED,
      startTime
    );

    entry.error = {
      type: error.type,
      message: error.message,
      stack: error.stack,
      retryable: error.retryable
    };

    await this.addToQueue(entry);
  }

  /**
   * Log consent required event
   */
  async logConsentRequired(
    req: PolicyEvaluatedRequest,
    consentRequirements: any[],
    startTime: number
  ): Promise<void> {
    const entry = await this.createBaseLogEntry(
      req,
      AuditEventType.CONSENT_REQUIRED,
      startTime
    );

    // Add consent requirements to entry
    entry.compliance = {
      ...entry.compliance,
      consentRequirements
    } as any;

    await this.addToQueue(entry);
  }

  /**
   * Flush queued log entries to database
   */
  async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const entries = this.logQueue.splice(0);
      
      for (const entry of entries) {
        await this.writeLogEntry(client, entry);
      }
      
      await client.query('COMMIT');
      
      this.emit('audit_logs:flushed', { count: entries.length });
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Re-add entries to queue on failure
      this.logQueue.unshift(...this.logQueue.splice(0));
      
      this.emit('audit_logs:flush_failed', { error });
      throw error;
      
    } finally {
      client.release();
    }
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    organisationId?: string;
    eventType?: AuditEventType;
    requestId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    const client = await this.pool.connect();
    
    try {
      let sql = `
        SELECT * FROM ${this.config.database.schema}.audit_logs
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.startDate) {
        sql += ` AND timestamp >= $${paramIndex++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += ` AND timestamp <= $${paramIndex++}`;
        params.push(filters.endDate);
      }

      if (filters.userId) {
        sql += ` AND user_id = $${paramIndex++}`;
        params.push(filters.userId);
      }

      if (filters.organisationId) {
        sql += ` AND organisation_id = $${paramIndex++}`;
        params.push(filters.organisationId);
      }

      if (filters.eventType) {
        sql += ` AND event_type = $${paramIndex++}`;
        params.push(filters.eventType);
      }

      if (filters.requestId) {
        sql += ` AND request_id = $${paramIndex++}`;
        params.push(filters.requestId);
      }

      sql += ` ORDER BY timestamp DESC`;

      if (filters.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await client.query(sql, params);
      return result.rows.map(row => this.deserializeLogEntry(row));
      
    } finally {
      client.release();
    }
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(startDate?: Date, endDate?: Date): Promise<{
    valid: boolean;
    brokenChain?: number;
    tamperedEntries?: string[];
  }> {
    if (!this.config.integrity.enableChaining) {
      return { valid: true };
    }

    const client = await this.pool.connect();
    
    try {
      let sql = `
        SELECT id, hash, previous_hash, data_hash 
        FROM ${this.config.database.schema}.audit_logs
        WHERE 1=1
      `;
      const params: any[] = [];

      if (startDate) {
        sql += ` AND timestamp >= $1`;
        params.push(startDate);
      }

      if (endDate) {
        sql += ` AND timestamp <= $${params.length + 1}`;
        params.push(endDate);
      }

      sql += ` ORDER BY timestamp ASC`;

      const result = await client.query(sql, params);
      const entries = result.rows;

      let previousHash: string | undefined;
      const tamperedEntries: string[] = [];
      let brokenChain: number | undefined;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        
        // Verify chain integrity
        if (i > 0 && entry.previous_hash !== previousHash) {
          brokenChain = i;
          break;
        }
        
        // Verify entry integrity
        const expectedHash = this.calculateEntryHash(entry);
        if (entry.hash !== expectedHash) {
          tamperedEntries.push(entry.id);
        }
        
        previousHash = entry.hash;
      }

      return {
        valid: brokenChain === undefined && tamperedEntries.length === 0,
        brokenChain,
        tamperedEntries: tamperedEntries.length > 0 ? tamperedEntries : undefined
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Shutdown audit logger
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    await this.flush();
    await this.pool.end();
    
    this.emit('audit_logger:shutdown');
  }

  // Private methods

  private async createBaseLogEntry(
    req: PolicyEvaluatedRequest,
    eventType: AuditEventType,
    startTime: number
  ): Promise<AuditLogEntry> {
    const now = new Date();
    const totalTime = now.getTime() - startTime;

    const entry: AuditLogEntry = {
      id: uuidv4(),
      requestId: req.auditTrailId || uuidv4(),
      timestamp: now,
      eventType,
      userId: req.userContext?.id,
      organisationId: req.userContext?.organisationId,
      request: {
        method: req.method,
        path: req.path,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        headers: this.sanitizeHeaders(req.headers),
        body: this.config.logging.includeRequestBody ? 
          this.sanitizeRequestBody(req.body) : {}
      },
      performance: {
        totalTime
      },
      compliance: {
        frameworks: req.userIntent?.compliance?.frameworks || [],
        consentLevel: req.userIntent?.compliance?.consentLevel || 'unknown',
        sovereigntyLevel: req.userIntent?.compliance?.sovereigntyLevel || 'unknown',
        dataClassification: req.userIntent?.compliance?.dataClassification || 'unknown',
        retentionYears: this.calculateRetentionYears(req)
      },
      hash: '', // Will be calculated before storage
      previousHash: this.lastHash
    };

    // Calculate hash
    entry.hash = this.calculateEntryHash(entry);

    return entry;
  }

  private sanitizeIntent(intent: FinancialIntent): FinancialIntent {
    if (!this.config.logging.maskSensitiveData) {
      return intent;
    }

    const sanitized = { ...intent };
    
    // Mask financial amounts if not in comprehensive mode
    if (this.config.logging.level !== 'comprehensive' && sanitized.financial?.amount) {
      sanitized.financial = {
        ...sanitized.financial,
        amount: -1 // Masked amount
      };
    }

    return sanitized;
  }

  private sanitizeEvaluation(evaluation: PolicyEvaluation): PolicyEvaluation {
    // Remove potentially sensitive information from decision details
    const sanitized = { ...evaluation };
    
    if (sanitized.decision?.metadata) {
      const { metadata, ...decision } = sanitized.decision;
      sanitized.decision = decision;
    }

    return sanitized;
  }

  private sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const [key, value] of Object.entries(headers)) {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = value;
      } else {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return {};
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'ssn', 'tax_file_number'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private calculateRetentionYears(req: PolicyEvaluatedRequest): number {
    if (req.userIntent?.compliance?.australian?.indigenous?.careApplicable) {
      return this.config.retention.indigenousDataYears;
    }
    
    if (req.userIntent?.financial?.amount !== undefined) {
      return this.config.retention.financialDataYears;
    }
    
    if (req.userIntent?.compliance?.frameworks?.length > 0) {
      return this.config.retention.complianceDataYears;
    }
    
    return this.config.retention.defaultYears;
  }

  private calculateEntryHash(entry: AuditLogEntry): string {
    const hashData = {
      id: entry.id,
      requestId: entry.requestId,
      timestamp: entry.timestamp.toISOString(),
      eventType: entry.eventType,
      userId: entry.userId,
      organisationId: entry.organisationId,
      request: entry.request,
      intent: entry.intent,
      evaluation: entry.evaluation,
      previousHash: entry.previousHash
    };

    return crypto
      .createHash(this.config.integrity.hashAlgorithm)
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  private async addToQueue(entry: AuditLogEntry): Promise<void> {
    this.logQueue.push(entry);
    this.lastHash = entry.hash;

    // Flush immediately if not using async logging
    if (!this.config.performance.enableAsyncLogging) {
      await this.flush();
    } else if (this.logQueue.length >= this.config.performance.batchSize) {
      await this.flush();
    }
  }

  private setupFlushTimer(): void {
    if (this.config.performance.enableAsyncLogging) {
      this.flushTimer = setInterval(
        () => this.flush().catch(error => this.emit('flush_error', error)),
        this.config.performance.flushInterval
      );
    }
  }

  private async createAuditTables(client: PoolClient): Promise<void> {
    const schema = this.config.database.schema;
    
    // Create schema if it doesn't exist
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

    // Create audit logs table
    const auditTableSQL = `
      CREATE TABLE IF NOT EXISTS ${schema}.audit_logs (
        id UUID PRIMARY KEY,
        request_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        user_id VARCHAR(255),
        organisation_id VARCHAR(255),
        request_data JSONB NOT NULL,
        intent_data JSONB,
        evaluation_data JSONB,
        transformations JSONB,
        error_data JSONB,
        performance_data JSONB NOT NULL,
        compliance_data JSONB NOT NULL,
        hash VARCHAR(255) NOT NULL,
        previous_hash VARCHAR(255),
        data_hash VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        retention_until TIMESTAMP WITH TIME ZONE
      )
    `;
    
    await client.query(auditTableSQL);

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON ${schema}.audit_logs (timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON ${schema}.audit_logs (request_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON ${schema}.audit_logs (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_organisation_id ON ${schema}.audit_logs (organisation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON ${schema}.audit_logs (event_type)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_retention ON ${schema}.audit_logs (retention_until)`
    ];

    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
  }

  private async loadLastHash(client: PoolClient): Promise<void> {
    const sql = `
      SELECT hash FROM ${this.config.database.schema}.audit_logs
      ORDER BY timestamp DESC, created_at DESC
      LIMIT 1
    `;
    
    const result = await client.query(sql);
    if (result.rows.length > 0) {
      this.lastHash = result.rows[0].hash;
    }
  }

  private async writeLogEntry(client: PoolClient, entry: AuditLogEntry): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + entry.compliance.retentionYears);

    const sql = `
      INSERT INTO ${this.config.database.schema}.audit_logs (
        id, request_id, timestamp, event_type, user_id, organisation_id,
        request_data, intent_data, evaluation_data, transformations,
        error_data, performance_data, compliance_data,
        hash, previous_hash, retention_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;

    const values = [
      entry.id,
      entry.requestId,
      entry.timestamp,
      entry.eventType,
      entry.userId,
      entry.organisationId,
      JSON.stringify(entry.request),
      entry.intent ? JSON.stringify(entry.intent) : null,
      entry.evaluation ? JSON.stringify(entry.evaluation) : null,
      entry.transformations ? JSON.stringify(entry.transformations) : null,
      entry.error ? JSON.stringify(entry.error) : null,
      JSON.stringify(entry.performance),
      JSON.stringify(entry.compliance),
      entry.hash,
      entry.previousHash,
      retentionDate
    ];

    await client.query(sql, values);
  }

  private deserializeLogEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      requestId: row.request_id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      userId: row.user_id,
      organisationId: row.organisation_id,
      request: JSON.parse(row.request_data),
      intent: row.intent_data ? JSON.parse(row.intent_data) : undefined,
      evaluation: row.evaluation_data ? JSON.parse(row.evaluation_data) : undefined,
      transformations: row.transformations ? JSON.parse(row.transformations) : undefined,
      error: row.error_data ? JSON.parse(row.error_data) : undefined,
      performance: JSON.parse(row.performance_data),
      compliance: JSON.parse(row.compliance_data),
      hash: row.hash,
      previousHash: row.previous_hash
    };
  }
}

/**
 * Create default audit logger configuration
 */
export const createDefaultAuditLoggerConfig = (): AuditLoggerConfig => ({
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'financial_intelligence',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: process.env.NODE_ENV === 'production',
    schema: 'audit_logs'
  },
  logging: {
    level: 'standard',
    excludeFields: ['password', 'secret', 'token'],
    includeRequestBody: true,
    includeResponseBody: false,
    maskSensitiveData: true
  },
  retention: {
    defaultYears: 7,
    indigenousDataYears: 50,
    financialDataYears: 10,
    complianceDataYears: 15
  },
  integrity: {
    enableChaining: true,
    hashAlgorithm: 'sha256',
    signEntries: false
  },
  performance: {
    batchSize: 100,
    flushInterval: 5000, // 5 seconds
    enableAsyncLogging: true
  }
});