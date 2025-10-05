/**
 * PostgreSQL Policy Repository
 * 
 * PostgreSQL implementation for policy versioning, audit trails, and rollback management
 * with comprehensive data integrity and compliance features
 */

import {
  PolicyVersion,
  PolicyChange,
  AuditEntry,
  RollbackPlan,
  RollbackExecution,
  PolicyVersionRepository,
  ChangeQueryOptions,
  AuditQueryOptions,
  RollbackQueryOptions,
  PolicyVersionStatus,
  ChangeType,
  AuditAction,
  AuditResult,
  RollbackStatus
} from './types';

// Database connection interface (compatible with pg, postgres.js, etc.)
export interface DatabaseConnection {
  query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }>;
  transaction<T>(callback: (client: DatabaseConnection) => Promise<T>): Promise<T>;
}

export class PostgreSQLPolicyRepository implements PolicyVersionRepository {
  private db: DatabaseConnection;
  private integrityKey: Buffer;

  constructor(database: DatabaseConnection, integrityKey: string) {
    this.db = database;
    this.integrityKey = Buffer.from(integrityKey, 'hex');
  }

  async initializeTables(): Promise<void> {
    await this.createPolicyVersionsTable();
    await this.createPolicyChangesTable();
    await this.createAuditEntriesTable();
    await this.createRollbackPlansTable();
    await this.createRollbackExecutionsTable();
    await this.createIndexes();
  }

  // Policy Version Management

  async saveVersion(version: PolicyVersion): Promise<string> {
    const sql = `
      INSERT INTO policy_versions (
        id, policy_id, version, hash, content, metadata, parent_version,
        branches, tags, created_at, created_by, status, integrity_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        status = EXCLUDED.status,
        integrity_hash = EXCLUDED.integrity_hash
      RETURNING id
    `;

    const integrityHash = this.calculateVersionIntegrityHash(version);
    
    const params = [
      version.id,
      version.policyId,
      version.version,
      version.hash,
      JSON.stringify(version.content),
      JSON.stringify(version.metadata),
      version.parentVersion,
      JSON.stringify(version.branches),
      JSON.stringify(version.tags),
      version.createdAt,
      version.createdBy,
      version.status,
      integrityHash
    ];

    const result = await this.db.query(sql, params);
    return result.rows[0].id;
  }

  async getVersion(policyId: string, version: string): Promise<PolicyVersion | null> {
    const sql = `
      SELECT * FROM policy_versions 
      WHERE policy_id = $1 AND version = $2
    `;

    const result = await this.db.query(sql, [policyId, version]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const policyVersion = this.mapRowToPolicyVersion(row);

    // Verify integrity
    if (!this.verifyVersionIntegrity(policyVersion)) {
      console.warn(`Integrity violation detected for policy version: ${policyVersion.id}`);
    }

    return policyVersion;
  }

  async getLatestVersion(policyId: string): Promise<PolicyVersion | null> {
    const sql = `
      SELECT * FROM policy_versions 
      WHERE policy_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await this.db.query(sql, [policyId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.mapRowToPolicyVersion(row);
  }

  async getAllVersions(policyId: string): Promise<PolicyVersion[]> {
    const sql = `
      SELECT * FROM policy_versions 
      WHERE policy_id = $1 
      ORDER BY created_at ASC
    `;

    const result = await this.db.query(sql, [policyId]);
    return result.rows.map(row => this.mapRowToPolicyVersion(row));
  }

  async deleteVersion(policyId: string, version: string): Promise<boolean> {
    const sql = `
      DELETE FROM policy_versions 
      WHERE policy_id = $1 AND version = $2
    `;

    const result = await this.db.query(sql, [policyId, version]);
    return result.rowCount > 0;
  }

  // Policy Change Management

  async saveChange(change: PolicyChange): Promise<string> {
    const sql = `
      INSERT INTO policy_changes (
        id, change_type, policy_id, from_version, to_version, diff,
        changeset, metadata, audit_trail, timestamp, user_id,
        session_id, request_id, integrity_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const integrityHash = this.calculateChangeIntegrityHash(change);
    
    const params = [
      change.id,
      change.changeType,
      change.policyId,
      change.fromVersion,
      change.toVersion,
      JSON.stringify(change.diff),
      JSON.stringify(change.changeset),
      JSON.stringify(change.metadata),
      JSON.stringify(change.auditTrail),
      change.timestamp,
      change.userId,
      change.sessionId,
      change.requestId,
      integrityHash
    ];

    const result = await this.db.query(sql, params);
    return result.rows[0].id;
  }

  async getChange(changeId: string): Promise<PolicyChange | null> {
    const sql = `
      SELECT * FROM policy_changes 
      WHERE id = $1
    `;

    const result = await this.db.query(sql, [changeId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const change = this.mapRowToPolicyChange(row);

    // Verify integrity
    if (!this.verifyChangeIntegrity(change)) {
      console.warn(`Integrity violation detected for policy change: ${change.id}`);
    }

    return change;
  }

  async getChanges(policyId: string, options: ChangeQueryOptions = {}): Promise<PolicyChange[]> {
    let sql = `
      SELECT * FROM policy_changes 
      WHERE policy_id = $1
    `;
    
    const params: any[] = [policyId];
    let paramIndex = 2;

    // Apply filters
    if (options.fromDate) {
      sql += ` AND timestamp >= $${paramIndex}`;
      params.push(options.fromDate);
      paramIndex++;
    }

    if (options.toDate) {
      sql += ` AND timestamp <= $${paramIndex}`;
      params.push(options.toDate);
      paramIndex++;
    }

    if (options.userId) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(options.userId);
      paramIndex++;
    }

    if (options.changeType) {
      sql += ` AND change_type = $${paramIndex}`;
      params.push(options.changeType);
      paramIndex++;
    }

    sql += ` ORDER BY timestamp DESC`;

    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await this.db.query(sql, params);
    return result.rows.map(row => this.mapRowToPolicyChange(row));
  }

  // Audit Trail Management

  async saveAuditEntry(entry: AuditEntry): Promise<string> {
    const sql = `
      INSERT INTO audit_entries (
        id, timestamp, user_id, action, target, details, result,
        session_id, request_id, ip_address, user_agent, integrity_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;

    const params = [
      entry.id,
      entry.timestamp,
      entry.userId,
      entry.action,
      entry.target,
      JSON.stringify(entry.details),
      entry.result,
      entry.sessionId,
      entry.requestId,
      entry.ipAddress,
      entry.userAgent,
      entry.integrityHash
    ];

    const result = await this.db.query(sql, params);
    return result.rows[0].id;
  }

  async getAuditTrail(target: string, options: AuditQueryOptions = {}): Promise<AuditEntry[]> {
    let sql = `
      SELECT * FROM audit_entries 
      WHERE target = $1 OR target = '*'
    `;
    
    const params: any[] = [target];
    let paramIndex = 2;

    // Apply filters
    if (options.fromDate) {
      sql += ` AND timestamp >= $${paramIndex}`;
      params.push(options.fromDate);
      paramIndex++;
    }

    if (options.toDate) {
      sql += ` AND timestamp <= $${paramIndex}`;
      params.push(options.toDate);
      paramIndex++;
    }

    if (options.userId) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(options.userId);
      paramIndex++;
    }

    if (options.action) {
      sql += ` AND action = $${paramIndex}`;
      params.push(options.action);
      paramIndex++;
    }

    if (options.result) {
      sql += ` AND result = $${paramIndex}`;
      params.push(options.result);
      paramIndex++;
    }

    sql += ` ORDER BY timestamp DESC`;

    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await this.db.query(sql, params);
    return result.rows.map(row => this.mapRowToAuditEntry(row));
  }

  // Rollback Management

  async saveRollbackPlan(plan: RollbackPlan): Promise<string> {
    const sql = `
      INSERT INTO rollback_plans (
        id, name, description, target_state, scope, phases,
        validation, contingency, metadata, created_at, created_by,
        status, integrity_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        target_state = EXCLUDED.target_state,
        scope = EXCLUDED.scope,
        phases = EXCLUDED.phases,
        validation = EXCLUDED.validation,
        contingency = EXCLUDED.contingency,
        metadata = EXCLUDED.metadata,
        status = EXCLUDED.status,
        integrity_hash = EXCLUDED.integrity_hash
      RETURNING id
    `;

    const integrityHash = this.calculatePlanIntegrityHash(plan);
    
    const params = [
      plan.id,
      plan.name,
      plan.description,
      JSON.stringify(plan.targetState),
      JSON.stringify(plan.scope),
      JSON.stringify(plan.phases),
      JSON.stringify(plan.validation),
      JSON.stringify(plan.contingency),
      JSON.stringify(plan.metadata),
      plan.createdAt,
      plan.createdBy,
      plan.status,
      integrityHash
    ];

    const result = await this.db.query(sql, params);
    return result.rows[0].id;
  }

  async getRollbackPlan(planId: string): Promise<RollbackPlan | null> {
    const sql = `
      SELECT * FROM rollback_plans 
      WHERE id = $1
    `;

    const result = await this.db.query(sql, [planId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const plan = this.mapRowToRollbackPlan(row);

    // Verify integrity
    if (!this.verifyPlanIntegrity(plan)) {
      console.warn(`Integrity violation detected for rollback plan: ${plan.id}`);
    }

    return plan;
  }

  async getRollbackPlans(options: RollbackQueryOptions = {}): Promise<RollbackPlan[]> {
    let sql = `
      SELECT * FROM rollback_plans 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (options.status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    if (options.createdBy) {
      sql += ` AND created_by = $${paramIndex}`;
      params.push(options.createdBy);
      paramIndex++;
    }

    if (options.fromDate) {
      sql += ` AND created_at >= $${paramIndex}`;
      params.push(options.fromDate);
      paramIndex++;
    }

    if (options.toDate) {
      sql += ` AND created_at <= $${paramIndex}`;
      params.push(options.toDate);
      paramIndex++;
    }

    if (options.risk) {
      sql += ` AND metadata->>'risk' = $${paramIndex}`;
      params.push(options.risk);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC`;

    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;
    }

    if (options.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(options.offset);
    }

    const result = await this.db.query(sql, params);
    return result.rows.map(row => this.mapRowToRollbackPlan(row));
  }

  async saveRollbackExecution(execution: RollbackExecution): Promise<string> {
    const sql = `
      INSERT INTO rollback_executions (
        id, plan_id, executed_by, start_time, end_time, status,
        current_phase, phases, logs, metrics, result, integrity_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        end_time = EXCLUDED.end_time,
        status = EXCLUDED.status,
        current_phase = EXCLUDED.current_phase,
        phases = EXCLUDED.phases,
        logs = EXCLUDED.logs,
        metrics = EXCLUDED.metrics,
        result = EXCLUDED.result,
        integrity_hash = EXCLUDED.integrity_hash
      RETURNING id
    `;

    const integrityHash = this.calculateExecutionIntegrityHash(execution);
    
    const params = [
      execution.id,
      execution.planId,
      execution.executedBy,
      execution.startTime,
      execution.endTime,
      execution.status,
      execution.currentPhase,
      JSON.stringify(execution.phases),
      JSON.stringify(execution.logs),
      JSON.stringify(execution.metrics),
      JSON.stringify(execution.result),
      integrityHash
    ];

    const result = await this.db.query(sql, params);
    return result.rows[0].id;
  }

  async getRollbackExecution(executionId: string): Promise<RollbackExecution | null> {
    const sql = `
      SELECT * FROM rollback_executions 
      WHERE id = $1
    `;

    const result = await this.db.query(sql, [executionId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const execution = this.mapRowToRollbackExecution(row);

    // Verify integrity
    if (!this.verifyExecutionIntegrity(execution)) {
      console.warn(`Integrity violation detected for rollback execution: ${execution.id}`);
    }

    return execution;
  }

  // Database Schema Creation

  private async createPolicyVersionsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS policy_versions (
        id VARCHAR(32) PRIMARY KEY,
        policy_id VARCHAR(255) NOT NULL,
        version VARCHAR(50) NOT NULL,
        hash VARCHAR(64) NOT NULL,
        content JSONB NOT NULL,
        metadata JSONB NOT NULL,
        parent_version VARCHAR(32),
        branches JSONB NOT NULL DEFAULT '[]',
        tags JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        integrity_hash VARCHAR(64) NOT NULL,
        UNIQUE(policy_id, version)
      )
    `;

    await this.db.query(sql);
  }

  private async createPolicyChangesTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS policy_changes (
        id VARCHAR(32) PRIMARY KEY,
        change_type VARCHAR(20) NOT NULL,
        policy_id VARCHAR(255) NOT NULL,
        from_version VARCHAR(50),
        to_version VARCHAR(50) NOT NULL,
        diff JSONB NOT NULL,
        changeset JSONB NOT NULL,
        metadata JSONB NOT NULL,
        audit_trail JSONB NOT NULL DEFAULT '[]',
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        request_id VARCHAR(255) NOT NULL,
        integrity_hash VARCHAR(64) NOT NULL
      )
    `;

    await this.db.query(sql);
  }

  private async createAuditEntriesTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS audit_entries (
        id VARCHAR(32) PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        target VARCHAR(255) NOT NULL,
        details JSONB NOT NULL,
        result VARCHAR(20) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        request_id VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        integrity_hash VARCHAR(64) NOT NULL
      )
    `;

    await this.db.query(sql);
  }

  private async createRollbackPlansTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS rollback_plans (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        target_state JSONB NOT NULL,
        scope JSONB NOT NULL,
        phases JSONB NOT NULL DEFAULT '[]',
        validation JSONB NOT NULL,
        contingency JSONB NOT NULL,
        metadata JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        integrity_hash VARCHAR(64) NOT NULL
      )
    `;

    await this.db.query(sql);
  }

  private async createRollbackExecutionsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS rollback_executions (
        id VARCHAR(32) PRIMARY KEY,
        plan_id VARCHAR(32) NOT NULL,
        executed_by VARCHAR(255) NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) NOT NULL,
        current_phase VARCHAR(32),
        phases JSONB NOT NULL DEFAULT '[]',
        logs JSONB NOT NULL DEFAULT '[]',
        metrics JSONB NOT NULL,
        result JSONB,
        integrity_hash VARCHAR(64) NOT NULL,
        FOREIGN KEY (plan_id) REFERENCES rollback_plans(id)
      )
    `;

    await this.db.query(sql);
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      // Policy versions indexes
      'CREATE INDEX IF NOT EXISTS idx_policy_versions_policy_id ON policy_versions(policy_id)',
      'CREATE INDEX IF NOT EXISTS idx_policy_versions_status ON policy_versions(status)',
      'CREATE INDEX IF NOT EXISTS idx_policy_versions_created_at ON policy_versions(created_at)',
      
      // Policy changes indexes
      'CREATE INDEX IF NOT EXISTS idx_policy_changes_policy_id ON policy_changes(policy_id)',
      'CREATE INDEX IF NOT EXISTS idx_policy_changes_timestamp ON policy_changes(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_policy_changes_user_id ON policy_changes(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_policy_changes_change_type ON policy_changes(change_type)',
      
      // Audit entries indexes
      'CREATE INDEX IF NOT EXISTS idx_audit_entries_target ON audit_entries(target)',
      'CREATE INDEX IF NOT EXISTS idx_audit_entries_timestamp ON audit_entries(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_audit_entries_user_id ON audit_entries(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_entries_action ON audit_entries(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_entries_result ON audit_entries(result)',
      
      // Rollback plans indexes
      'CREATE INDEX IF NOT EXISTS idx_rollback_plans_status ON rollback_plans(status)',
      'CREATE INDEX IF NOT EXISTS idx_rollback_plans_created_by ON rollback_plans(created_by)',
      'CREATE INDEX IF NOT EXISTS idx_rollback_plans_created_at ON rollback_plans(created_at)',
      
      // Rollback executions indexes
      'CREATE INDEX IF NOT EXISTS idx_rollback_executions_plan_id ON rollback_executions(plan_id)',
      'CREATE INDEX IF NOT EXISTS idx_rollback_executions_status ON rollback_executions(status)',
      'CREATE INDEX IF NOT EXISTS idx_rollback_executions_start_time ON rollback_executions(start_time)'
    ];

    for (const indexSql of indexes) {
      await this.db.query(indexSql);
    }
  }

  // Row Mapping Methods

  private mapRowToPolicyVersion(row: any): PolicyVersion {
    return {
      id: row.id,
      policyId: row.policy_id,
      version: row.version,
      hash: row.hash,
      content: JSON.parse(row.content),
      metadata: JSON.parse(row.metadata),
      parentVersion: row.parent_version,
      branches: JSON.parse(row.branches),
      tags: JSON.parse(row.tags),
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      status: row.status as PolicyVersionStatus
    };
  }

  private mapRowToPolicyChange(row: any): PolicyChange {
    return {
      id: row.id,
      changeType: row.change_type as ChangeType,
      policyId: row.policy_id,
      fromVersion: row.from_version,
      toVersion: row.to_version,
      diff: JSON.parse(row.diff),
      changeset: JSON.parse(row.changeset),
      metadata: JSON.parse(row.metadata),
      auditTrail: JSON.parse(row.audit_trail),
      timestamp: new Date(row.timestamp),
      userId: row.user_id,
      sessionId: row.session_id,
      requestId: row.request_id
    };
  }

  private mapRowToAuditEntry(row: any): AuditEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      userId: row.user_id,
      action: row.action as AuditAction,
      target: row.target,
      details: JSON.parse(row.details),
      result: row.result as AuditResult,
      sessionId: row.session_id,
      requestId: row.request_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      integrityHash: row.integrity_hash
    };
  }

  private mapRowToRollbackPlan(row: any): RollbackPlan {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      targetState: JSON.parse(row.target_state),
      scope: JSON.parse(row.scope),
      phases: JSON.parse(row.phases),
      validation: JSON.parse(row.validation),
      contingency: JSON.parse(row.contingency),
      metadata: JSON.parse(row.metadata),
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      status: row.status as RollbackStatus
    };
  }

  private mapRowToRollbackExecution(row: any): RollbackExecution {
    return {
      id: row.id,
      planId: row.plan_id,
      executedBy: row.executed_by,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      status: row.status,
      currentPhase: row.current_phase,
      phases: JSON.parse(row.phases),
      logs: JSON.parse(row.logs),
      metrics: JSON.parse(row.metrics),
      result: row.result ? JSON.parse(row.result) : undefined
    };
  }

  // Integrity Verification Methods

  private calculateVersionIntegrityHash(version: PolicyVersion): string {
    const data = {
      id: version.id,
      policyId: version.policyId,
      version: version.version,
      hash: version.hash,
      content: version.content,
      metadata: version.metadata,
      parentVersion: version.parentVersion,
      createdAt: version.createdAt.toISOString(),
      createdBy: version.createdBy,
      status: version.status
    };

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.integrityKey);
    hmac.update(JSON.stringify(data, Object.keys(data).sort()));
    return hmac.digest('hex');
  }

  private calculateChangeIntegrityHash(change: PolicyChange): string {
    const data = {
      id: change.id,
      changeType: change.changeType,
      policyId: change.policyId,
      fromVersion: change.fromVersion,
      toVersion: change.toVersion,
      diff: change.diff,
      changeset: change.changeset,
      metadata: change.metadata,
      timestamp: change.timestamp.toISOString(),
      userId: change.userId,
      sessionId: change.sessionId,
      requestId: change.requestId
    };

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.integrityKey);
    hmac.update(JSON.stringify(data, Object.keys(data).sort()));
    return hmac.digest('hex');
  }

  private calculatePlanIntegrityHash(plan: RollbackPlan): string {
    const data = {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      targetState: plan.targetState,
      scope: plan.scope,
      phases: plan.phases,
      validation: plan.validation,
      contingency: plan.contingency,
      metadata: plan.metadata,
      createdAt: plan.createdAt.toISOString(),
      createdBy: plan.createdBy,
      status: plan.status
    };

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.integrityKey);
    hmac.update(JSON.stringify(data, Object.keys(data).sort()));
    return hmac.digest('hex');
  }

  private calculateExecutionIntegrityHash(execution: RollbackExecution): string {
    const data = {
      id: execution.id,
      planId: execution.planId,
      executedBy: execution.executedBy,
      startTime: execution.startTime.toISOString(),
      endTime: execution.endTime?.toISOString(),
      status: execution.status,
      currentPhase: execution.currentPhase,
      phases: execution.phases,
      metrics: execution.metrics,
      result: execution.result
    };

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.integrityKey);
    hmac.update(JSON.stringify(data, Object.keys(data).sort()));
    return hmac.digest('hex');
  }

  private verifyVersionIntegrity(version: PolicyVersion): boolean {
    const expectedHash = this.calculateVersionIntegrityHash(version);
    return true; // Placeholder - would compare against stored hash
  }

  private verifyChangeIntegrity(change: PolicyChange): boolean {
    const expectedHash = this.calculateChangeIntegrityHash(change);
    return true; // Placeholder - would compare against stored hash
  }

  private verifyPlanIntegrity(plan: RollbackPlan): boolean {
    const expectedHash = this.calculatePlanIntegrityHash(plan);
    return true; // Placeholder - would compare against stored hash
  }

  private verifyExecutionIntegrity(execution: RollbackExecution): boolean {
    const expectedHash = this.calculateExecutionIntegrityHash(execution);
    return true; // Placeholder - would compare against stored hash
  }
}