/**
 * PostgreSQL Constitutional Repository
 * 
 * PostgreSQL implementation of the constitutional repository interface
 * for storing principles, prompts, configurations, and safety checks
 */

import crypto from 'crypto';
import {
  ConstitutionalRepository,
  ConstitutionalPrinciple,
  SafetyPrompt,
  ConstitutionalConfig,
  SafetyCheck,
  SafetyCheckQuery,
  Jurisdiction
} from './types';
import { AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES } from './principles';
import { CONSTITUTIONAL_SAFETY_PROMPTS } from './prompts';

export interface DatabaseConnection {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: any }>;
  transaction<T>(callback: (conn: DatabaseConnection) => Promise<T>): Promise<T>;
}

export class PostgreSQLConstitutionalRepository implements ConstitutionalRepository {
  private db: DatabaseConnection;
  private integrityKey: Buffer;

  constructor(db: DatabaseConnection, integrityKey: string) {
    this.db = db;
    this.integrityKey = Buffer.from(integrityKey, 'hex');
    
    if (this.integrityKey.length !== 32) {
      throw new Error('Integrity key must be 32 bytes (64 hex characters)');
    }
  }

  async getPrinciples(): Promise<ConstitutionalPrinciple[]> {
    const sql = `
      SELECT * FROM constitutional_principles 
      WHERE enabled = true 
      ORDER BY category, name
    `;

    try {
      const results = await this.db.query(sql);
      
      if (results.length === 0) {
        // Return default principles if none in database
        return AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES;
      }

      return results.map(row => this.mapRowToPrinciple(row));
    } catch (error) {
      // Fallback to default principles
      return AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES;
    }
  }

  async getPrompts(): Promise<SafetyPrompt[]> {
    const sql = `
      SELECT * FROM constitutional_prompts 
      WHERE enabled = true 
      ORDER BY severity DESC, prompt_type
    `;

    try {
      const results = await this.db.query(sql);
      
      if (results.length === 0) {
        // Return default prompts if none in database
        return CONSTITUTIONAL_SAFETY_PROMPTS;
      }

      return results.map(row => this.mapRowToPrompt(row));
    } catch (error) {
      // Fallback to default prompts
      return CONSTITUTIONAL_SAFETY_PROMPTS;
    }
  }

  async getConfig(): Promise<ConstitutionalConfig> {
    const sql = `
      SELECT * FROM constitutional_config 
      WHERE active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    try {
      const results = await this.db.query(sql);
      
      if (results.length === 0) {
        return this.getDefaultConfig();
      }

      const row = results[0];
      return {
        enabled: row.enabled,
        strictMode: row.strict_mode,
        defaultJurisdiction: row.default_jurisdiction as Jurisdiction,
        emergencyOverrideEnabled: row.emergency_override_enabled,
        emergencyOverrideRoles: JSON.parse(row.emergency_override_roles || '[]'),
        auditRetentionDays: row.audit_retention_days,
        escalationTimeoutMinutes: row.escalation_timeout_minutes,
        principlesConfig: JSON.parse(row.principles_config || '{}')
      };
    } catch (error) {
      return this.getDefaultConfig();
    }
  }

  async storeSafetyCheck(check: SafetyCheck): Promise<string> {
    const sql = `
      INSERT INTO constitutional_safety_checks (
        id, agent_id, event_type, timestamp, context, triggered_prompts,
        result, resolution, audit_trail, created_at, integrity_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        triggered_prompts = EXCLUDED.triggered_prompts,
        result = EXCLUDED.result,
        resolution = EXCLUDED.resolution,
        audit_trail = EXCLUDED.audit_trail,
        integrity_hash = EXCLUDED.integrity_hash
    `;

    const integrityHash = this.calculateIntegrityHash(check);

    const params = [
      check.id,
      check.agentId,
      check.eventType,
      check.timestamp,
      JSON.stringify(check.context),
      JSON.stringify(check.triggeredPrompts),
      check.result,
      JSON.stringify(check.resolution),
      JSON.stringify(check.auditTrail),
      new Date(),
      integrityHash
    ];

    try {
      await this.db.execute(sql, params);
      
      // Log the storage operation
      await this.logOperation('store_safety_check', check.id, 'system', {
        agentId: check.agentId,
        eventType: check.eventType,
        result: check.result,
        promptCount: check.triggeredPrompts.length
      });

      return check.id;
    } catch (error) {
      throw new Error(`Failed to store safety check: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSafetyCheck(id: string): Promise<SafetyCheck | null> {
    const sql = `
      SELECT * FROM constitutional_safety_checks 
      WHERE id = $1
    `;

    try {
      const results = await this.db.query(sql, [id]);
      
      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      
      // Verify integrity
      const check = this.mapRowToSafetyCheck(row);
      const expectedHash = this.calculateIntegrityHash(check);
      
      if (row.integrity_hash !== expectedHash) {
        throw new Error(`Integrity violation detected for safety check ${id}`);
      }

      // Log the retrieval operation
      await this.logOperation('retrieve_safety_check', id, 'system', {
        accessed: true
      });

      return check;
    } catch (error) {
      throw new Error(`Failed to retrieve safety check: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateSafetyCheck(id: string, updates: Partial<SafetyCheck>): Promise<boolean> {
    const sql = `
      UPDATE constitutional_safety_checks 
      SET triggered_prompts = $1,
          result = $2,
          resolution = $3,
          audit_trail = $4,
          integrity_hash = $5
      WHERE id = $6
    `;

    try {
      // Get current check to merge updates
      const current = await this.getSafetyCheck(id);
      if (!current) {
        return false;
      }

      const updated = { ...current, ...updates };
      const newIntegrityHash = this.calculateIntegrityHash(updated);

      const result = await this.db.execute(sql, [
        JSON.stringify(updated.triggeredPrompts),
        updated.result,
        JSON.stringify(updated.resolution),
        JSON.stringify(updated.auditTrail),
        newIntegrityHash,
        id
      ]);

      if (result.affectedRows > 0) {
        await this.logOperation('update_safety_check', id, 'system', {
          updatedFields: Object.keys(updates)
        });
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Failed to update safety check: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async queryChecks(criteria: SafetyCheckQuery): Promise<SafetyCheck[]> {
    let sql = `
      SELECT * FROM constitutional_safety_checks 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause based on criteria
    if (criteria.startDate) {
      sql += ` AND timestamp >= $${paramIndex++}`;
      params.push(criteria.startDate);
    }

    if (criteria.endDate) {
      sql += ` AND timestamp <= $${paramIndex++}`;
      params.push(criteria.endDate);
    }

    if (criteria.agentId) {
      sql += ` AND agent_id = $${paramIndex++}`;
      params.push(criteria.agentId);
    }

    if (criteria.userId) {
      sql += ` AND context::jsonb->>'userId' = $${paramIndex++}`;
      params.push(criteria.userId);
    }

    if (criteria.eventTypes && criteria.eventTypes.length > 0) {
      sql += ` AND event_type = ANY($${paramIndex++})`;
      params.push(criteria.eventTypes);
    }

    if (criteria.results && criteria.results.length > 0) {
      sql += ` AND result = ANY($${paramIndex++})`;
      params.push(criteria.results);
    }

    if (criteria.jurisdictions && criteria.jurisdictions.length > 0) {
      sql += ` AND context::jsonb->>'jurisdiction' = ANY($${paramIndex++})`;
      params.push(criteria.jurisdictions);
    }

    if (criteria.principleIds && criteria.principleIds.length > 0) {
      sql += ` AND triggered_prompts::jsonb @> ANY($${paramIndex++})`;
      params.push(criteria.principleIds.map(id => JSON.stringify([{ principleId: id }])));
    }

    // Add ordering
    sql += ` ORDER BY timestamp DESC`;

    // Add pagination
    if (criteria.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(criteria.limit);
    }

    if (criteria.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(criteria.offset);
    }

    try {
      const results = await this.db.query(sql, params);
      return results.map(row => this.mapRowToSafetyCheck(row));
    } catch (error) {
      throw new Error(`Failed to query safety checks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Initialize database tables if they don't exist
  async initializeTables(): Promise<void> {
    const tables = [
      this.createPrinciplesTable(),
      this.createPromptsTable(),
      this.createConfigTable(),
      this.createSafetyChecksTable(),
      this.createAuditLogTable()
    ];

    for (const tableSQL of tables) {
      await this.db.execute(tableSQL);
    }

    // Insert default data if tables are empty
    await this.insertDefaultData();
  }

  // Private helper methods

  private getDefaultConfig(): ConstitutionalConfig {
    return {
      enabled: true,
      strictMode: false,
      defaultJurisdiction: Jurisdiction.FEDERAL,
      emergencyOverrideEnabled: true,
      emergencyOverrideRoles: ['constitutional_officer', 'emergency_coordinator'],
      auditRetentionDays: 2555, // 7 years
      escalationTimeoutMinutes: 60,
      principlesConfig: {}
    };
  }

  private calculateIntegrityHash(check: SafetyCheck): string {
    const signingData = {
      id: check.id,
      agentId: check.agentId,
      eventType: check.eventType,
      timestamp: check.timestamp.toISOString(),
      result: check.result,
      triggeredPrompts: check.triggeredPrompts.length
    };

    const dataString = JSON.stringify(signingData, Object.keys(signingData).sort());
    
    return crypto
      .createHmac('sha256', this.integrityKey)
      .update(dataString)
      .digest('hex');
  }

  private mapRowToPrinciple(row: any): ConstitutionalPrinciple {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      source: row.source,
      enforcementLevel: row.enforcement_level,
      applicableJurisdictions: JSON.parse(row.applicable_jurisdictions || '[]'),
      relatedPrinciples: JSON.parse(row.related_principles || '[]')
    };
  }

  private mapRowToPrompt(row: any): SafetyPrompt {
    return {
      id: row.id,
      principleId: row.principle_id,
      trigger: JSON.parse(row.trigger),
      promptType: row.prompt_type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      reasoning: row.reasoning,
      suggestedActions: JSON.parse(row.suggested_actions || '[]'),
      escalationRequired: row.escalation_required,
      humanReviewRequired: row.human_review_required,
      blockingConditions: JSON.parse(row.blocking_conditions || '[]'),
      exemptions: JSON.parse(row.exemptions || '[]')
    };
  }

  private mapRowToSafetyCheck(row: any): SafetyCheck {
    return {
      id: row.id,
      agentId: row.agent_id,
      eventType: row.event_type,
      timestamp: new Date(row.timestamp),
      context: JSON.parse(row.context),
      triggeredPrompts: JSON.parse(row.triggered_prompts || '[]'),
      result: row.result,
      resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
      auditTrail: JSON.parse(row.audit_trail || '[]')
    };
  }

  private async logOperation(
    operation: string,
    entityId: string,
    performedBy: string,
    metadata: any
  ): Promise<void> {
    const sql = `
      INSERT INTO constitutional_audit_log (
        id, operation, entity_id, performed_by, performed_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.execute(sql, [
      crypto.randomUUID(),
      operation,
      entityId,
      performedBy,
      new Date(),
      JSON.stringify(metadata)
    ]);
  }

  private createPrinciplesTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS constitutional_principles (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        source VARCHAR(50) NOT NULL,
        enforcement_level VARCHAR(20) NOT NULL,
        applicable_jurisdictions JSONB NOT NULL,
        related_principles JSONB NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `;
  }

  private createPromptsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS constitutional_prompts (
        id VARCHAR(10) PRIMARY KEY,
        principle_id VARCHAR(10) NOT NULL,
        trigger JSONB NOT NULL,
        prompt_type VARCHAR(20) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        suggested_actions JSONB NOT NULL,
        escalation_required BOOLEAN NOT NULL DEFAULT false,
        human_review_required BOOLEAN NOT NULL DEFAULT false,
        blocking_conditions JSONB NOT NULL,
        exemptions JSONB,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (principle_id) REFERENCES constitutional_principles(id)
      )
    `;
  }

  private createConfigTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS constitutional_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        enabled BOOLEAN NOT NULL DEFAULT true,
        strict_mode BOOLEAN NOT NULL DEFAULT false,
        default_jurisdiction VARCHAR(20) NOT NULL DEFAULT 'federal',
        emergency_override_enabled BOOLEAN NOT NULL DEFAULT true,
        emergency_override_roles JSONB NOT NULL DEFAULT '[]',
        audit_retention_days INTEGER NOT NULL DEFAULT 2555,
        escalation_timeout_minutes INTEGER NOT NULL DEFAULT 60,
        principles_config JSONB NOT NULL DEFAULT '{}',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_by VARCHAR(255) NOT NULL DEFAULT 'system'
      )
    `;
  }

  private createSafetyChecksTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS constitutional_safety_checks (
        id UUID PRIMARY KEY,
        agent_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        context JSONB NOT NULL,
        triggered_prompts JSONB NOT NULL,
        result VARCHAR(20) NOT NULL,
        resolution JSONB,
        audit_trail JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        integrity_hash VARCHAR(64) NOT NULL
      )
    `;
  }

  private createAuditLogTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS constitutional_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operation VARCHAR(100) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        performed_by VARCHAR(255) NOT NULL,
        performed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        metadata JSONB NOT NULL
      )
    `;
  }

  private async insertDefaultData(): Promise<void> {
    // Check if principles exist
    const principleCount = await this.db.query('SELECT COUNT(*) FROM constitutional_principles');
    if (principleCount[0].count === '0') {
      // Insert default principles
      for (const principle of AUSTRALIAN_CONSTITUTIONAL_PRINCIPLES) {
        const sql = `
          INSERT INTO constitutional_principles (
            id, name, description, category, source, enforcement_level,
            applicable_jurisdictions, related_principles
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `;
        
        await this.db.execute(sql, [
          principle.id,
          principle.name,
          principle.description,
          principle.category,
          principle.source,
          principle.enforcementLevel,
          JSON.stringify(principle.applicableJurisdictions),
          JSON.stringify(principle.relatedPrinciples)
        ]);
      }
    }

    // Check if prompts exist
    const promptCount = await this.db.query('SELECT COUNT(*) FROM constitutional_prompts');
    if (promptCount[0].count === '0') {
      // Insert default prompts
      for (const prompt of CONSTITUTIONAL_SAFETY_PROMPTS) {
        const sql = `
          INSERT INTO constitutional_prompts (
            id, principle_id, trigger, prompt_type, severity, title, message,
            reasoning, suggested_actions, escalation_required, human_review_required,
            blocking_conditions, exemptions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `;
        
        await this.db.execute(sql, [
          prompt.id,
          prompt.principleId,
          JSON.stringify(prompt.trigger),
          prompt.promptType,
          prompt.severity,
          prompt.title,
          prompt.message,
          prompt.reasoning,
          JSON.stringify(prompt.suggestedActions),
          prompt.escalationRequired,
          prompt.humanReviewRequired,
          JSON.stringify(prompt.blockingConditions),
          JSON.stringify(prompt.exemptions || [])
        ]);
      }
    }

    // Insert default config if none exists
    const configCount = await this.db.query('SELECT COUNT(*) FROM constitutional_config WHERE active = true');
    if (configCount[0].count === '0') {
      const defaultConfig = this.getDefaultConfig();
      const sql = `
        INSERT INTO constitutional_config (
          enabled, strict_mode, default_jurisdiction, emergency_override_enabled,
          emergency_override_roles, audit_retention_days, escalation_timeout_minutes,
          principles_config, active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await this.db.execute(sql, [
        defaultConfig.enabled,
        defaultConfig.strictMode,
        defaultConfig.defaultJurisdiction,
        defaultConfig.emergencyOverrideEnabled,
        JSON.stringify(defaultConfig.emergencyOverrideRoles),
        defaultConfig.auditRetentionDays,
        defaultConfig.escalationTimeoutMinutes,
        JSON.stringify(defaultConfig.principlesConfig),
        true,
        'system'
      ]);
    }
  }
}