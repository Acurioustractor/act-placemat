/**
 * PostgreSQL Decision Logger
 * 
 * Comprehensive decision logging implementation using PostgreSQL
 * with Australian compliance features and audit capabilities
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { 
  DecisionLog, 
  AuditQuery, 
  AuditQueryResult, 
  FinancialOperation 
} from './types';

/**
 * PostgreSQL configuration for decision logging
 */
export interface PostgreSQLLoggerConfig {
  /** Database connection details */
  connection: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    connectionTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    max?: number; // max connections in pool
  };
  
  /** Table configuration */
  tables: {
    decisionsTable: string;
    auditTable: string;
    complianceTable: string;
    indexPrefix: string;
  };
  
  /** Partitioning configuration */
  partitioning: {
    enabled: boolean;
    strategy: 'monthly' | 'quarterly' | 'yearly';
    retentionPeriod: number; // in months
  };
  
  /** Encryption configuration */
  encryption: {
    enabled: boolean;
    keyId?: string;
    encryptedFields: string[];
  };
  
  /** Performance configuration */
  performance: {
    batchSize: number;
    flushInterval: number; // seconds
    enableAsyncWrites: boolean;
  };
  
  /** Compliance configuration */
  compliance: {
    auditRetentionYears: number;
    complianceRetentionYears: number;
    indigenousDataRetentionYears: number;
    enableDataResidencyChecks: boolean;
  };
}

/**
 * PostgreSQL Decision Logger with Australian compliance features
 */
export class PostgreSQLDecisionLogger {
  private pool: Pool;
  private config: PostgreSQLLoggerConfig;
  private batchBuffer: DecisionLog[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: PostgreSQLLoggerConfig) {
    this.config = config;
    this.pool = new Pool({
      host: config.connection.host,
      port: config.connection.port,
      database: config.connection.database,
      user: config.connection.user,
      password: config.connection.password,
      ssl: config.connection.ssl,
      connectionTimeoutMillis: config.connection.connectionTimeoutMillis || 5000,
      idleTimeoutMillis: config.connection.idleTimeoutMillis || 30000,
      max: config.connection.max || 20
    });
  }

  /**
   * Initialize the logger with database schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await this.createSchema(client);
      await this.createIndexes(client);
      
      if (this.config.partitioning.enabled) {
        await this.setupPartitioning(client);
      }
      
      // Start flush timer for batched writes
      if (this.config.performance.enableAsyncWrites) {
        this.startFlushTimer();
      }
      
    } finally {
      client.release();
    }
  }

  /**
   * Log a policy decision
   */
  async log(log: DecisionLog): Promise<void> {
    if (this.config.performance.enableAsyncWrites) {
      this.batchBuffer.push(log);
      
      if (this.batchBuffer.length >= this.config.performance.batchSize) {
        await this.flushBatch();
      }
    } else {
      await this.writeSingle(log);
    }
  }

  /**
   * Query audit logs with comprehensive filtering
   */
  async query(query: AuditQuery): Promise<AuditQueryResult> {
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      const { sql, params } = this.buildQuery(query);
      const countSql = this.buildCountQuery(query);
      
      // Execute count query
      const countResult = await client.query(countSql.sql, countSql.params);
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Execute main query
      const result = await client.query(sql, params);
      
      const logs = result.rows.map(row => this.mapRowToDecisionLog(row));
      
      return {
        logs,
        totalCount,
        pagination: {
          offset: query.pagination?.offset || 0,
          limit: query.pagination?.limit || 50,
          hasMore: (query.pagination?.offset || 0) + logs.length < totalCount
        },
        performance: {
          queryTime: Date.now() - startTime,
          resultsFromCache: false
        }
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(
    startDate: Date,
    endDate: Date,
    reportType: 'privacy_act' | 'acnc' | 'austrac' | 'indigenous'
  ): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      let sql: string;
      const params = [startDate, endDate];
      
      switch (reportType) {
        case 'privacy_act':
          sql = this.buildPrivacyActReportQuery();
          break;
        case 'acnc':
          sql = this.buildACNCReportQuery();
          break;
        case 'austrac':
          sql = this.buildAUSTRACReportQuery();
          break;
        case 'indigenous':
          sql = this.buildIndigenousDataReportQuery();
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
      
      const result = await client.query(sql, params);
      return this.formatComplianceReport(result.rows, reportType);
      
    } finally {
      client.release();
    }
  }

  /**
   * Purge old logs based on retention policies
   */
  async purgeOldLogs(): Promise<{ deletedCount: number; freedSpace: string }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let totalDeleted = 0;
      
      // Delete standard logs older than retention period
      const standardCutoff = new Date();
      standardCutoff.setFullYear(standardCutoff.getFullYear() - this.config.compliance.auditRetentionYears);
      
      const standardResult = await client.query(`
        DELETE FROM ${this.config.tables.decisionsTable}
        WHERE timestamp < $1
        AND audit_retention_years = $2
        AND compliance_privacy_act_applicable = false
        AND compliance_indigenous_data_involved = false
      `, [standardCutoff, this.config.compliance.auditRetentionYears]);
      
      totalDeleted += standardResult.rowCount || 0;
      
      // Delete compliance logs older than compliance retention period
      const complianceCutoff = new Date();
      complianceCutoff.setFullYear(complianceCutoff.getFullYear() - this.config.compliance.complianceRetentionYears);
      
      const complianceResult = await client.query(`
        DELETE FROM ${this.config.tables.decisionsTable}
        WHERE timestamp < $1
        AND compliance_privacy_act_applicable = true
        AND compliance_indigenous_data_involved = false
      `, [complianceCutoff]);
      
      totalDeleted += complianceResult.rowCount || 0;
      
      // Delete Indigenous data logs older than Indigenous data retention period
      const indigenousCutoff = new Date();
      indigenousCutoff.setFullYear(indigenousCutoff.getFullYear() - this.config.compliance.indigenousDataRetentionYears);
      
      const indigenousResult = await client.query(`
        DELETE FROM ${this.config.tables.decisionsTable}
        WHERE timestamp < $1
        AND compliance_indigenous_data_involved = true
      `, [indigenousCutoff]);
      
      totalDeleted += indigenousResult.rowCount || 0;
      
      // Get freed space estimate
      const spaceResult = await client.query('SELECT pg_size_pretty(pg_total_relation_size($1)) as size', 
        [this.config.tables.decisionsTable]);
      
      await client.query('COMMIT');
      
      return {
        deletedCount: totalDeleted,
        freedSpace: spaceResult.rows[0]?.size || 'Unknown'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check for database connectivity
   */
  async healthCheck(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  /**
   * Shutdown the logger
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush any remaining batched logs
    if (this.batchBuffer.length > 0) {
      await this.flushBatch();
    }
    
    await this.pool.end();
  }

  // Private methods

  private async createSchema(client: PoolClient): Promise<void> {
    // Create main decisions table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.tables.decisionsTable} (
        id UUID PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        
        -- Intent data
        intent_id VARCHAR(255) NOT NULL,
        intent_operation VARCHAR(100) NOT NULL,
        intent_user_id VARCHAR(255) NOT NULL,
        intent_user_roles TEXT[],
        intent_amount BIGINT,
        intent_currency VARCHAR(10),
        intent_categories TEXT[],
        intent_sensitivity VARCHAR(20),
        intent_personal_data BOOLEAN,
        
        -- Decision data
        decision VARCHAR(20) NOT NULL,
        decision_reason TEXT,
        decision_policies TEXT[],
        decision_conditions JSONB,
        decision_execution_time INTEGER,
        decision_cache_hit BOOLEAN,
        
        -- OPA specific data
        opa_decision_id UUID,
        opa_query TEXT,
        opa_result JSONB,
        opa_explanation JSONB,
        opa_trace JSONB,
        
        -- Audit metadata
        audit_trace_id VARCHAR(255),
        audit_session_id VARCHAR(255),
        audit_user_id VARCHAR(255),
        audit_user_roles TEXT[],
        audit_service VARCHAR(100),
        audit_version VARCHAR(50),
        audit_compliance_flags TEXT[],
        audit_sovereignty_context TEXT[],
        audit_data_classification VARCHAR(20),
        audit_retention_years INTEGER,
        
        -- Compliance tracking
        compliance_privacy_act_applicable BOOLEAN,
        compliance_acnc_reporting BOOLEAN,
        compliance_austrac_reporting BOOLEAN,
        compliance_indigenous_data_involved BOOLEAN,
        
        -- Australian specific fields
        user_location_country VARCHAR(100),
        user_location_region VARCHAR(100),
        data_residency_country VARCHAR(100),
        data_residency_region VARCHAR(100),
        
        -- Indigenous data specific
        indigenous_traditional_owners TEXT[],
        indigenous_care_compliance JSONB,
        indigenous_cultural_protocols JSONB,
        indigenous_sacred_knowledge BOOLEAN,
        
        -- Encrypted sensitive data (if encryption enabled)
        encrypted_data BYTEA,
        encryption_key_id VARCHAR(255),
        
        -- Partitioning helper
        partition_date DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED
      );
    `;
    
    await client.query(createTableSQL);

    // Create audit tracking table
    const createAuditTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.tables.auditTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        operation VARCHAR(50) NOT NULL,
        table_name VARCHAR(100),
        record_id UUID,
        user_id VARCHAR(255),
        changes JSONB,
        compliance_impact BOOLEAN DEFAULT false
      );
    `;
    
    await client.query(createAuditTableSQL);

    // Create compliance reporting table
    const createComplianceTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.tables.complianceTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_date DATE NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        report_data JSONB NOT NULL,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        generated_by VARCHAR(255)
      );
    `;
    
    await client.query(createComplianceTableSQL);
  }

  private async createIndexes(client: PoolClient): Promise<void> {
    const indexes = [
      // Performance indexes
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_timestamp_idx ON ${this.config.tables.decisionsTable} (timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_user_id_idx ON ${this.config.tables.decisionsTable} (intent_user_id)`,
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_operation_idx ON ${this.config.tables.decisionsTable} (intent_operation)`,
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_decision_idx ON ${this.config.tables.decisionsTable} (decision)`,
      
      // Compliance indexes
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_privacy_act_idx ON ${this.config.tables.decisionsTable} (compliance_privacy_act_applicable) WHERE compliance_privacy_act_applicable = true`,
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_acnc_idx ON ${this.config.tables.decisionsTable} (compliance_acnc_reporting) WHERE compliance_acnc_reporting = true`,
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_austrac_idx ON ${this.config.tables.decisionsTable} (compliance_austrac_reporting) WHERE compliance_austrac_reporting = true`,
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_indigenous_idx ON ${this.config.tables.decisionsTable} (compliance_indigenous_data_involved) WHERE compliance_indigenous_data_involved = true`,
      
      // Australian specific indexes
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_location_idx ON ${this.config.tables.decisionsTable} (user_location_country, user_location_region)`,
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_residency_idx ON ${this.config.tables.decisionsTable} (data_residency_country, data_residency_region)`,
      
      // Audit indexes
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_trace_id_idx ON ${this.config.tables.decisionsTable} (audit_trace_id)`,
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_session_id_idx ON ${this.config.tables.decisionsTable} (audit_session_id)`,
      
      // Composite indexes for common queries
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_user_time_idx ON ${this.config.tables.decisionsTable} (intent_user_id, timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS ${this.config.tables.indexPrefix}_compliance_time_idx ON ${this.config.tables.decisionsTable} (compliance_privacy_act_applicable, timestamp DESC) WHERE compliance_privacy_act_applicable = true`
    ];

    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
  }

  private async setupPartitioning(client: PoolClient): Promise<void> {
    if (this.config.partitioning.strategy === 'monthly') {
      // Create monthly partitions for the next 12 months
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        const partitionName = `${this.config.tables.decisionsTable}_${year}_${month}`;
        const startDate = `${year}-${month}-01`;
        const endDate = i === 11 ? '2099-12-31' : `${year}-${String(date.getMonth() + 2).padStart(2, '0')}-01`;
        
        const partitionSQL = `
          CREATE TABLE IF NOT EXISTS ${partitionName} 
          PARTITION OF ${this.config.tables.decisionsTable}
          FOR VALUES FROM ('${startDate}') TO ('${endDate}')
        `;
        
        await client.query(partitionSQL);
      }
    }
  }

  private async writeSingle(log: DecisionLog): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const insertSQL = `
        INSERT INTO ${this.config.tables.decisionsTable} (
          id, timestamp, intent_id, intent_operation, intent_user_id, intent_user_roles,
          intent_amount, intent_currency, intent_categories, intent_sensitivity, intent_personal_data,
          decision, decision_reason, decision_policies, decision_conditions, decision_execution_time,
          decision_cache_hit, opa_decision_id, opa_query, opa_result, opa_explanation, opa_trace,
          audit_trace_id, audit_session_id, audit_user_id, audit_user_roles, audit_service,
          audit_version, audit_compliance_flags, audit_sovereignty_context, audit_data_classification,
          audit_retention_years, compliance_privacy_act_applicable, compliance_acnc_reporting,
          compliance_austrac_reporting, compliance_indigenous_data_involved, user_location_country,
          user_location_region, data_residency_country, data_residency_region,
          indigenous_traditional_owners, indigenous_care_compliance, indigenous_cultural_protocols,
          indigenous_sacred_knowledge
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44
        )
      `;
      
      const values = this.extractValues(log);
      await client.query(insertSQL, values);
      
    } finally {
      client.release();
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;
    
    const client = await this.pool.connect();
    const batch = [...this.batchBuffer];
    this.batchBuffer = [];
    
    try {
      await client.query('BEGIN');
      
      for (const log of batch) {
        const insertSQL = `
          INSERT INTO ${this.config.tables.decisionsTable} (
            id, timestamp, intent_id, intent_operation, intent_user_id, intent_user_roles,
            intent_amount, intent_currency, intent_categories, intent_sensitivity, intent_personal_data,
            decision, decision_reason, decision_policies, decision_conditions, decision_execution_time,
            decision_cache_hit, opa_decision_id, opa_query, opa_result, opa_explanation, opa_trace,
            audit_trace_id, audit_session_id, audit_user_id, audit_user_roles, audit_service,
            audit_version, audit_compliance_flags, audit_sovereignty_context, audit_data_classification,
            audit_retention_years, compliance_privacy_act_applicable, compliance_acnc_reporting,
            compliance_austrac_reporting, compliance_indigenous_data_involved, user_location_country,
            user_location_region, data_residency_country, data_residency_region,
            indigenous_traditional_owners, indigenous_care_compliance, indigenous_cultural_protocols,
            indigenous_sacred_knowledge
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
            $39, $40, $41, $42, $43, $44
          )
        `;
        
        const values = this.extractValues(log);
        await client.query(insertSQL, values);
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private extractValues(log: DecisionLog): any[] {
    return [
      log.id, // $1
      log.timestamp, // $2
      log.intent.id, // $3
      log.intent.operation, // $4
      log.intent.user.id, // $5
      log.intent.user.roles, // $6
      log.intent.financial.amount, // $7
      log.intent.financial.currency, // $8
      log.intent.financial.categories, // $9
      log.intent.financial.sensitivity, // $10
      log.intent.financial.containsPersonalData, // $11
      log.decision.decision, // $12
      log.decision.reason, // $13
      log.decision.evaluatedPolicies, // $14
      log.decision.conditions ? JSON.stringify(log.decision.conditions) : null, // $15
      log.decision.performance.evaluationTime, // $16
      log.decision.performance.cacheHit, // $17
      log.decision.opa.decisionId, // $18
      log.decision.opa.query, // $19
      log.decision.opa.result ? JSON.stringify(log.decision.opa.result) : null, // $20
      log.decision.opa.explanation ? JSON.stringify(log.decision.opa.explanation) : null, // $21
      log.decision.opa.trace ? JSON.stringify(log.decision.opa.trace) : null, // $22
      log.audit.traceId, // $23
      log.audit.sessionId, // $24
      log.audit.userId, // $25
      log.audit.userRoles, // $26
      log.audit.service, // $27
      log.audit.version, // $28
      log.audit.complianceFlags, // $29
      log.audit.sovereigntyContext, // $30
      log.audit.dataClassification, // $31
      log.audit.retentionYears, // $32
      log.compliance.privacyActApplicable, // $33
      log.compliance.acncReporting, // $34
      log.compliance.austracReporting, // $35
      log.compliance.indigenousDataInvolved, // $36
      log.intent.user.location.country, // $37
      log.intent.user.location.region, // $38
      log.intent.compliance.dataResidency.country, // $39
      log.intent.compliance.dataResidency.region, // $40
      log.intent.financial.indigenousData?.traditionalOwners || null, // $41
      log.intent.financial.indigenousData?.careCompliance ? JSON.stringify(log.intent.financial.indigenousData.careCompliance) : null, // $42
      log.intent.financial.indigenousData?.culturalProtocols ? JSON.stringify(log.intent.financial.indigenousData.culturalProtocols) : null, // $43
      log.intent.financial.indigenousData?.containsSacredKnowledge || false // $44
    ];
  }

  private buildQuery(query: AuditQuery): { sql: string; params: any[] } {
    let sql = `SELECT * FROM ${this.config.tables.decisionsTable} WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    // Time range filter
    sql += ` AND timestamp >= $${paramIndex} AND timestamp <= $${paramIndex + 1}`;
    params.push(query.timeRange.start, query.timeRange.end);
    paramIndex += 2;

    // Apply filters
    if (query.filters?.userId) {
      sql += ` AND intent_user_id = $${paramIndex}`;
      params.push(query.filters.userId);
      paramIndex++;
    }

    if (query.filters?.operation) {
      sql += ` AND intent_operation = $${paramIndex}`;
      params.push(query.filters.operation);
      paramIndex++;
    }

    if (query.filters?.decision) {
      sql += ` AND decision = $${paramIndex}`;
      params.push(query.filters.decision);
      paramIndex++;
    }

    if (query.filters?.policies && query.filters.policies.length > 0) {
      sql += ` AND decision_policies && $${paramIndex}`;
      params.push(query.filters.policies);
      paramIndex++;
    }

    if (query.filters?.complianceFlags && query.filters.complianceFlags.length > 0) {
      sql += ` AND audit_compliance_flags && $${paramIndex}`;
      params.push(query.filters.complianceFlags);
      paramIndex++;
    }

    if (query.filters?.dataClassification && query.filters.dataClassification.length > 0) {
      sql += ` AND audit_data_classification = ANY($${paramIndex})`;
      params.push(query.filters.dataClassification);
      paramIndex++;
    }

    // Sorting
    if (query.sort) {
      const sortField = this.mapSortField(query.sort.field);
      sql += ` ORDER BY ${sortField} ${query.sort.direction.toUpperCase()}`;
    } else {
      sql += ' ORDER BY timestamp DESC';
    }

    // Pagination
    if (query.pagination) {
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(query.pagination.limit, query.pagination.offset);
    }

    return { sql, params };
  }

  private buildCountQuery(query: AuditQuery): { sql: string; params: any[] } {
    const mainQuery = this.buildQuery(query);
    // Remove ORDER BY, LIMIT, OFFSET from count query
    let countSql = mainQuery.sql.replace(/ORDER BY.*$/, '').replace(/LIMIT.*$/, '');
    countSql = countSql.replace('SELECT *', 'SELECT COUNT(*)');
    
    return { 
      sql: countSql, 
      params: mainQuery.params.slice(0, -2) // Remove pagination params
    };
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'timestamp': 'timestamp',
      'userId': 'intent_user_id',
      'operation': 'intent_operation',
      'decision': 'decision',
      'executionTime': 'decision_execution_time'
    };

    return fieldMap[field] || 'timestamp';
  }

  private mapRowToDecisionLog(row: any): DecisionLog {
    // Map database row back to DecisionLog object
    // This is a simplified version - full implementation would reconstruct the complete object
    return {
      id: row.id,
      timestamp: row.timestamp,
      intent: {
        id: row.intent_id,
        operation: row.intent_operation,
        user: {
          id: row.intent_user_id,
          roles: row.intent_user_roles,
          consentLevels: [],
          authentication: { verified: true, mfaCompleted: true, sessionAge: 0, lastPasswordChange: 0 },
          location: { country: row.user_location_country, region: row.user_location_region, verified: true },
          network: { type: 'corporate', securityVerified: true, ipAddress: '' }
        },
        financial: {
          amount: row.intent_amount,
          currency: row.intent_currency,
          categories: row.intent_categories,
          sensitivity: row.intent_sensitivity,
          containsPersonalData: row.intent_personal_data
        },
        request: {
          timestamp: row.timestamp,
          requestId: row.audit_trace_id,
          sessionId: row.audit_session_id,
          endpoint: '',
          method: ''
        },
        compliance: {
          privacyAct: {
            personalDataInvolved: row.intent_personal_data,
            consentObtained: true,
            purposeLimitation: [],
            crossBorderTransfer: false
          },
          dataResidency: {
            country: row.data_residency_country,
            region: row.data_residency_region,
            governmentApproved: true
          }
        }
      },
      decision: {
        decision: row.decision,
        evaluatedPolicies: row.decision_policies,
        policyResults: [],
        reason: row.decision_reason,
        conditions: row.decision_conditions ? JSON.parse(row.decision_conditions) : undefined,
        performance: {
          evaluationTime: row.decision_execution_time,
          cacheHit: row.decision_cache_hit,
          policiesEvaluated: row.decision_policies?.length || 0
        },
        opa: {
          decisionId: row.opa_decision_id,
          query: row.opa_query,
          result: row.opa_result ? JSON.parse(row.opa_result) : null,
          explanation: row.opa_explanation ? JSON.parse(row.opa_explanation) : undefined,
          trace: row.opa_trace ? JSON.parse(row.opa_trace) : undefined
        }
      },
      audit: {
        traceId: row.audit_trace_id,
        sessionId: row.audit_session_id,
        userId: row.audit_user_id,
        userRoles: row.audit_user_roles,
        service: row.audit_service,
        version: row.audit_version,
        complianceFlags: row.audit_compliance_flags,
        sovereigntyContext: row.audit_sovereignty_context,
        dataClassification: row.audit_data_classification,
        retentionYears: row.audit_retention_years
      },
      compliance: {
        privacyActApplicable: row.compliance_privacy_act_applicable,
        acncReporting: row.compliance_acnc_reporting,
        austracReporting: row.compliance_austrac_reporting,
        indigenousDataInvolved: row.compliance_indigenous_data_involved
      }
    };
  }

  private buildPrivacyActReportQuery(): string {
    return `
      SELECT 
        DATE_TRUNC('day', timestamp) as report_date,
        COUNT(*) as total_decisions,
        COUNT(*) FILTER (WHERE compliance_privacy_act_applicable = true) as privacy_act_decisions,
        COUNT(*) FILTER (WHERE intent_personal_data = true) as personal_data_decisions,
        COUNT(*) FILTER (WHERE user_location_country != 'Australia') as cross_border_decisions,
        COUNT(*) FILTER (WHERE decision = 'deny' AND compliance_privacy_act_applicable = true) as privacy_denials
      FROM ${this.config.tables.decisionsTable}
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY report_date DESC
    `;
  }

  private buildACNCReportQuery(): string {
    return `
      SELECT 
        DATE_TRUNC('day', timestamp) as report_date,
        COUNT(*) FILTER (WHERE compliance_acnc_reporting = true) as acnc_decisions,
        COUNT(*) FILTER (WHERE intent_operation = 'distribute_benefits') as benefit_distributions,
        COUNT(*) FILTER (WHERE intent_operation = 'allocate_funds') as fund_allocations
      FROM ${this.config.tables.decisionsTable}
      WHERE timestamp >= $1 AND timestamp <= $2 AND compliance_acnc_reporting = true
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY report_date DESC
    `;
  }

  private buildAUSTRACReportQuery(): string {
    return `
      SELECT 
        DATE_TRUNC('day', timestamp) as report_date,
        COUNT(*) FILTER (WHERE compliance_austrac_reporting = true) as austrac_decisions,
        SUM(intent_amount) FILTER (WHERE compliance_austrac_reporting = true) as total_amount,
        COUNT(*) FILTER (WHERE intent_amount >= 1000000) as large_transactions
      FROM ${this.config.tables.decisionsTable}
      WHERE timestamp >= $1 AND timestamp <= $2 AND compliance_austrac_reporting = true
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY report_date DESC
    `;
  }

  private buildIndigenousDataReportQuery(): string {
    return `
      SELECT 
        DATE_TRUNC('day', timestamp) as report_date,
        COUNT(*) FILTER (WHERE compliance_indigenous_data_involved = true) as indigenous_decisions,
        COUNT(*) FILTER (WHERE indigenous_sacred_knowledge = true) as sacred_knowledge_decisions,
        array_agg(DISTINCT unnest(indigenous_traditional_owners)) FILTER (WHERE indigenous_traditional_owners IS NOT NULL) as traditional_owners_involved
      FROM ${this.config.tables.decisionsTable}
      WHERE timestamp >= $1 AND timestamp <= $2 AND compliance_indigenous_data_involved = true
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY report_date DESC
    `;
  }

  private formatComplianceReport(rows: any[], reportType: string): any {
    return {
      reportType,
      generatedAt: new Date(),
      totalRecords: rows.length,
      data: rows,
      summary: this.calculateReportSummary(rows, reportType)
    };
  }

  private calculateReportSummary(rows: any[], reportType: string): any {
    if (rows.length === 0) return {};
    
    switch (reportType) {
      case 'privacy_act':
        return {
          totalDecisions: rows.reduce((sum, row) => sum + parseInt(row.total_decisions), 0),
          privacyActDecisions: rows.reduce((sum, row) => sum + parseInt(row.privacy_act_decisions), 0),
          crossBorderDecisions: rows.reduce((sum, row) => sum + parseInt(row.cross_border_decisions), 0),
          privacyDenials: rows.reduce((sum, row) => sum + parseInt(row.privacy_denials), 0)
        };
      case 'austrac':
        return {
          totalAustracDecisions: rows.reduce((sum, row) => sum + parseInt(row.austrac_decisions), 0),
          totalAmount: rows.reduce((sum, row) => sum + parseInt(row.total_amount || 0), 0),
          largeTransactions: rows.reduce((sum, row) => sum + parseInt(row.large_transactions), 0)
        };
      case 'indigenous':
        const allOwners = rows.flatMap(row => row.traditional_owners_involved || []);
        return {
          totalIndigenousDecisions: rows.reduce((sum, row) => sum + parseInt(row.indigenous_decisions), 0),
          sacredKnowledgeDecisions: rows.reduce((sum, row) => sum + parseInt(row.sacred_knowledge_decisions), 0),
          uniqueTraditionalOwners: [...new Set(allOwners)].length
        };
      default:
        return {};
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      if (this.batchBuffer.length > 0) {
        try {
          await this.flushBatch();
        } catch (error) {
          console.error('Error flushing batch:', error);
        }
      }
    }, this.config.performance.flushInterval * 1000);
  }
}