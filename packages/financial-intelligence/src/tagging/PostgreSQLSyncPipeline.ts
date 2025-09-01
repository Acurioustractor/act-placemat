/**
 * PostgreSQL Sync Pipeline
 * 
 * Comprehensive pipeline for syncing data catalog metadata to PostgreSQL
 * with real-time capabilities, change detection, and Australian compliance
 */

import { EventEmitter } from 'events';
import { Pool, PoolClient } from 'pg';
import { 
  DataCatalogEntry, 
  PostgreSQLConfig, 
  SyncConfig, 
  SyncResult, 
  SyncStatistics,
  SyncError,
  SyncWarning,
  FieldTag,
  TagType,
  TagSource
} from './types';
import { DataCatalogInterface } from './DataCatalogInterface';
import { v4 as uuidv4 } from 'uuid';

/**
 * PostgreSQL sync pipeline for data catalog metadata
 */
export class PostgreSQLSyncPipeline extends EventEmitter {
  private pool: Pool;
  private config: PostgreSQLConfig;
  private syncConfig: SyncConfig;
  private isRunning: boolean = false;
  private currentOperation: string | null = null;

  constructor(config: PostgreSQLConfig, syncConfig: SyncConfig) {
    super();
    this.config = config;
    this.syncConfig = syncConfig;
    
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      host: config.connection.host,
      port: config.connection.port,
      database: config.connection.database,
      user: config.connection.user,
      password: config.connection.password,
      ssl: config.connection.ssl,
      max: config.connection.poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  }

  /**
   * Initialize the sync pipeline
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await this.createSchemas(client);
      await this.createTables(client);
      await this.createIndexes(client);
      await this.createFunctions(client);
      
      this.emit('initialized');
    } finally {
      client.release();
    }
  }

  /**
   * Perform full sync of all catalog entries
   */
  async performFullSync(catalogInterface: DataCatalogInterface): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync operation already in progress');
    }

    const operationId = uuidv4();
    const startTime = new Date();
    this.isRunning = true;
    this.currentOperation = 'full_sync';

    const statistics: SyncStatistics = {
      totalRecords: 0,
      inserted: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      failed: 0,
      tagsApplied: 0,
      complianceIssues: 0
    };

    const errors: SyncError[] = [];
    const warnings: SyncWarning[] = [];

    try {
      this.emit('sync_started', { operationId, type: 'full' });

      // Get all entries from catalog
      for await (const entryBatch of catalogInterface.getAllEntries()) {
        await this.processBatch(entryBatch, statistics, errors, warnings);
        
        this.emit('batch_processed', {
          operationId,
          batchSize: entryBatch.length,
          statistics: { ...statistics }
        });
      }

      // Clean up orphaned records
      await this.cleanupOrphanedRecords(statistics);

      const endTime = new Date();
      const result: SyncResult = {
        operationId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        status: errors.length > 0 ? 'partial' : 'success',
        statistics,
        errors,
        warnings
      };

      this.emit('sync_completed', result);
      return result;

    } catch (error) {
      const endTime = new Date();
      const result: SyncResult = {
        operationId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        status: 'failure',
        statistics,
        errors: [...errors, {
          id: uuidv4(),
          type: 'database',
          message: error.message,
          details: error,
          timestamp: new Date(),
          retryable: true
        }],
        warnings
      };

      this.emit('sync_failed', result);
      return result;

    } finally {
      this.isRunning = false;
      this.currentOperation = null;
    }
  }

  /**
   * Perform incremental sync of modified entries
   */
  async performIncrementalSync(
    catalogInterface: DataCatalogInterface, 
    since: Date
  ): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync operation already in progress');
    }

    const operationId = uuidv4();
    const startTime = new Date();
    this.isRunning = true;
    this.currentOperation = 'incremental_sync';

    const statistics: SyncStatistics = {
      totalRecords: 0,
      inserted: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      failed: 0,
      tagsApplied: 0,
      complianceIssues: 0
    };

    const errors: SyncError[] = [];
    const warnings: SyncWarning[] = [];

    try {
      this.emit('sync_started', { operationId, type: 'incremental', since });

      // Get modified entries from catalog
      for await (const entryBatch of catalogInterface.getModifiedSince(since)) {
        await this.processBatch(entryBatch, statistics, errors, warnings);
        
        this.emit('batch_processed', {
          operationId,
          batchSize: entryBatch.length,
          statistics: { ...statistics }
        });
      }

      const endTime = new Date();
      const result: SyncResult = {
        operationId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        status: errors.length > 0 ? 'partial' : 'success',
        statistics,
        errors,
        warnings
      };

      this.emit('sync_completed', result);
      return result;

    } catch (error) {
      const endTime = new Date();
      const result: SyncResult = {
        operationId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        status: 'failure',
        statistics,
        errors: [...errors, {
          id: uuidv4(),
          type: 'database',
          message: error.message,
          details: error,
          timestamp: new Date(),
          retryable: true
        }],
        warnings
      };

      this.emit('sync_failed', result);
      return result;

    } finally {
      this.isRunning = false;
      this.currentOperation = null;
    }
  }

  /**
   * Sync single entry
   */
  async syncEntry(entry: DataCatalogEntry): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Upsert catalog entry
      await this.upsertCatalogEntry(client, entry);
      
      // Sync schema fields
      await this.syncSchemaFields(client, entry);
      
      // Sync tags
      await this.syncTags(client, entry);
      
      // Sync governance metadata
      await this.syncGovernanceMetadata(client, entry);
      
      // Sync compliance metadata
      await this.syncComplianceMetadata(client, entry);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): { isRunning: boolean; currentOperation: string | null } {
    return {
      isRunning: this.isRunning,
      currentOperation: this.currentOperation
    };
  }

  /**
   * Cancel running sync operation
   */
  async cancelSync(): Promise<void> {
    if (this.isRunning) {
      this.isRunning = false;
      this.currentOperation = null;
      this.emit('sync_cancelled');
    }
  }

  /**
   * Shutdown the pipeline
   */
  async shutdown(): Promise<void> {
    await this.cancelSync();
    await this.pool.end();
    this.emit('shutdown');
  }

  // Private methods

  private async createSchemas(client: PoolClient): Promise<void> {
    const schemas = [
      this.config.schema.catalogSchema,
      this.config.schema.tagsSchema,
      this.config.schema.metadataSchema
    ];

    for (const schema of schemas) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    }
  }

  private async createTables(client: PoolClient): Promise<void> {
    // Create catalog entries table
    const catalogTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.schema.catalogSchema}.catalog_entries (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        source_type VARCHAR(50),
        connection_id VARCHAR(255),
        database_name VARCHAR(255),
        schema_name VARCHAR(255),
        table_name VARCHAR(255),
        path TEXT,
        location_metadata JSONB,
        last_modified TIMESTAMP WITH TIME ZONE,
        version VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        sync_status VARCHAR(20) DEFAULT 'synced',
        sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    await client.query(catalogTable);

    // Create schema fields table
    const fieldsTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.schema.catalogSchema}.schema_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        catalog_entry_id VARCHAR(255) NOT NULL,
        field_name VARCHAR(255) NOT NULL,
        field_type VARCHAR(100),
        nullable BOOLEAN DEFAULT TRUE,
        default_value TEXT,
        description TEXT,
        sensitivity VARCHAR(20),
        personal_data BOOLEAN DEFAULT FALSE,
        indigenous_data BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (catalog_entry_id) REFERENCES ${this.config.schema.catalogSchema}.catalog_entries(id) ON DELETE CASCADE,
        UNIQUE (catalog_entry_id, field_name)
      )
    `;
    await client.query(fieldsTable);

    // Create tags table
    const tagsTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.schema.tagsSchema}.field_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        field_id UUID,
        catalog_entry_id VARCHAR(255),
        field_name VARCHAR(255),
        tag_key VARCHAR(255) NOT NULL,
        tag_value TEXT NOT NULL,
        tag_type VARCHAR(50) NOT NULL,
        tag_source VARCHAR(50) NOT NULL,
        confidence DECIMAL(3,2) DEFAULT 1.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(255),
        FOREIGN KEY (field_id) REFERENCES ${this.config.schema.catalogSchema}.schema_fields(id) ON DELETE CASCADE,
        FOREIGN KEY (catalog_entry_id) REFERENCES ${this.config.schema.catalogSchema}.catalog_entries(id) ON DELETE CASCADE
      )
    `;
    await client.query(tagsTable);

    // Create governance metadata table
    const governanceTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.schema.metadataSchema}.governance_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        catalog_entry_id VARCHAR(255) NOT NULL,
        owner_id VARCHAR(255),
        steward_id VARCHAR(255),
        custodian_id VARCHAR(255),
        consent_required_level VARCHAR(50),
        consent_purposes TEXT[],
        consent_expiry_days INTEGER,
        explicit_consent_required BOOLEAN DEFAULT FALSE,
        withdrawal_allowed BOOLEAN DEFAULT TRUE,
        sovereignty_level VARCHAR(50),
        traditional_owners TEXT[],
        data_residency_country VARCHAR(100),
        data_residency_region VARCHAR(100),
        retention_years INTEGER,
        retention_reason TEXT,
        disposal_method VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (catalog_entry_id) REFERENCES ${this.config.schema.catalogSchema}.catalog_entries(id) ON DELETE CASCADE,
        UNIQUE (catalog_entry_id)
      )
    `;
    await client.query(governanceTable);

    // Create compliance metadata table
    const complianceTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.schema.metadataSchema}.compliance_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        catalog_entry_id VARCHAR(255) NOT NULL,
        privacy_act_applicable BOOLEAN DEFAULT FALSE,
        privacy_act_apps INTEGER[],
        privacy_act_cross_border BOOLEAN DEFAULT FALSE,
        acnc_applicable BOOLEAN DEFAULT FALSE,
        acnc_governance_standards INTEGER[],
        acnc_reporting_threshold VARCHAR(20),
        austrac_applicable BOOLEAN DEFAULT FALSE,
        austrac_reporting_required BOOLEAN DEFAULT FALSE,
        austrac_thresholds INTEGER[],
        indigenous_care_applicable BOOLEAN DEFAULT FALSE,
        indigenous_traditional_owners TEXT[],
        indigenous_cultural_protocols TEXT[],
        data_residency_required BOOLEAN DEFAULT TRUE,
        data_residency_allowed_regions TEXT[],
        compliance_status VARCHAR(20) DEFAULT 'under_review',
        risk_level VARCHAR(20) DEFAULT 'medium',
        last_review_date TIMESTAMP WITH TIME ZONE,
        next_review_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (catalog_entry_id) REFERENCES ${this.config.schema.catalogSchema}.catalog_entries(id) ON DELETE CASCADE,
        UNIQUE (catalog_entry_id)
      )
    `;
    await client.query(complianceTable);

    // Create sync operations log table
    const syncLogTable = `
      CREATE TABLE IF NOT EXISTS ${this.config.schema.metadataSchema}.sync_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operation_id VARCHAR(255) NOT NULL,
        operation_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE,
        duration_ms INTEGER,
        total_records INTEGER DEFAULT 0,
        inserted_records INTEGER DEFAULT 0,
        updated_records INTEGER DEFAULT 0,
        deleted_records INTEGER DEFAULT 0,
        failed_records INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    await client.query(syncLogTable);
  }

  private async createIndexes(client: PoolClient): Promise<void> {
    const indexes = [
      // Catalog entries indexes
      `CREATE INDEX IF NOT EXISTS idx_catalog_entries_type ON ${this.config.schema.catalogSchema}.catalog_entries (type)`,
      `CREATE INDEX IF NOT EXISTS idx_catalog_entries_last_modified ON ${this.config.schema.catalogSchema}.catalog_entries (last_modified DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_catalog_entries_sync_status ON ${this.config.schema.catalogSchema}.catalog_entries (sync_status)`,
      
      // Schema fields indexes
      `CREATE INDEX IF NOT EXISTS idx_schema_fields_catalog_entry ON ${this.config.schema.catalogSchema}.schema_fields (catalog_entry_id)`,
      `CREATE INDEX IF NOT EXISTS idx_schema_fields_sensitivity ON ${this.config.schema.catalogSchema}.schema_fields (sensitivity)`,
      `CREATE INDEX IF NOT EXISTS idx_schema_fields_personal_data ON ${this.config.schema.catalogSchema}.schema_fields (personal_data) WHERE personal_data = true`,
      `CREATE INDEX IF NOT EXISTS idx_schema_fields_indigenous_data ON ${this.config.schema.catalogSchema}.schema_fields (indigenous_data) WHERE indigenous_data = true`,
      
      // Tags indexes
      `CREATE INDEX IF NOT EXISTS idx_field_tags_field_id ON ${this.config.schema.tagsSchema}.field_tags (field_id)`,
      `CREATE INDEX IF NOT EXISTS idx_field_tags_catalog_entry ON ${this.config.schema.tagsSchema}.field_tags (catalog_entry_id)`,
      `CREATE INDEX IF NOT EXISTS idx_field_tags_key_value ON ${this.config.schema.tagsSchema}.field_tags (tag_key, tag_value)`,
      `CREATE INDEX IF NOT EXISTS idx_field_tags_type ON ${this.config.schema.tagsSchema}.field_tags (tag_type)`,
      
      // Governance metadata indexes
      `CREATE INDEX IF NOT EXISTS idx_governance_owner ON ${this.config.schema.metadataSchema}.governance_metadata (owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_governance_sovereignty ON ${this.config.schema.metadataSchema}.governance_metadata (sovereignty_level)`,
      `CREATE INDEX IF NOT EXISTS idx_governance_traditional_owners ON ${this.config.schema.metadataSchema}.governance_metadata USING GIN (traditional_owners)`,
      
      // Compliance metadata indexes
      `CREATE INDEX IF NOT EXISTS idx_compliance_privacy_act ON ${this.config.schema.metadataSchema}.compliance_metadata (privacy_act_applicable) WHERE privacy_act_applicable = true`,
      `CREATE INDEX IF NOT EXISTS idx_compliance_indigenous ON ${this.config.schema.metadataSchema}.compliance_metadata (indigenous_care_applicable) WHERE indigenous_care_applicable = true`,
      `CREATE INDEX IF NOT EXISTS idx_compliance_status ON ${this.config.schema.metadataSchema}.compliance_metadata (compliance_status)`,
      `CREATE INDEX IF NOT EXISTS idx_compliance_risk_level ON ${this.config.schema.metadataSchema}.compliance_metadata (risk_level)`,
      
      // Sync operations indexes
      `CREATE INDEX IF NOT EXISTS idx_sync_operations_operation_id ON ${this.config.schema.metadataSchema}.sync_operations (operation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_operations_start_time ON ${this.config.schema.metadataSchema}.sync_operations (start_time DESC)`
    ];

    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }
  }

  private async createFunctions(client: PoolClient): Promise<void> {
    // Function to automatically update updated_at timestamp
    const updateTimestampFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    await client.query(updateTimestampFunction);

    // Create triggers for updated_at columns
    const tables = [
      `${this.config.schema.catalogSchema}.catalog_entries`,
      `${this.config.schema.catalogSchema}.schema_fields`,
      `${this.config.schema.metadataSchema}.governance_metadata`,
      `${this.config.schema.metadataSchema}.compliance_metadata`
    ];

    for (const table of tables) {
      const triggerName = `update_${table.replace('.', '_')}_updated_at`;
      const triggerSQL = `
        CREATE OR REPLACE TRIGGER ${triggerName}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `;
      await client.query(triggerSQL);
    }
  }

  private async processBatch(
    entries: DataCatalogEntry[], 
    statistics: SyncStatistics,
    errors: SyncError[],
    warnings: SyncWarning[]
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      for (const entry of entries) {
        try {
          await client.query('BEGIN');
          
          statistics.totalRecords++;
          
          // Check if entry exists
          const existingEntry = await this.getExistingEntry(client, entry.id);
          
          if (existingEntry) {
            // Update existing entry
            await this.updateCatalogEntry(client, entry);
            statistics.updated++;
          } else {
            // Insert new entry
            await this.insertCatalogEntry(client, entry);
            statistics.inserted++;
          }
          
          // Sync all related metadata
          await this.syncSchemaFields(client, entry);
          await this.syncTags(client, entry);
          await this.syncGovernanceMetadata(client, entry);
          await this.syncComplianceMetadata(client, entry);
          
          // Count tags applied
          statistics.tagsApplied += this.countTotalTags(entry);
          
          // Detect compliance issues
          const complianceIssues = await this.detectComplianceIssues(entry);
          statistics.complianceIssues += complianceIssues.length;
          
          // Add warnings for compliance issues
          for (const issue of complianceIssues) {
            warnings.push({
              id: uuidv4(),
              recordId: entry.id,
              type: 'compliance',
              message: issue,
              severity: 'medium',
              timestamp: new Date()
            });
          }
          
          await client.query('COMMIT');
          
        } catch (error) {
          await client.query('ROLLBACK');
          statistics.failed++;
          
          errors.push({
            id: uuidv4(),
            recordId: entry.id,
            type: 'database',
            message: error.message,
            details: error,
            timestamp: new Date(),
            retryable: true
          });
          
          if (!this.syncConfig.errorHandling.continueOnError) {
            throw error;
          }
        }
      }
    } finally {
      client.release();
    }
  }

  private async upsertCatalogEntry(client: PoolClient, entry: DataCatalogEntry): Promise<void> {
    const sql = `
      INSERT INTO ${this.config.schema.catalogSchema}.catalog_entries (
        id, name, description, type, source_type, connection_id, database_name,
        schema_name, table_name, path, location_metadata, last_modified, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        source_type = EXCLUDED.source_type,
        connection_id = EXCLUDED.connection_id,
        database_name = EXCLUDED.database_name,
        schema_name = EXCLUDED.schema_name,
        table_name = EXCLUDED.table_name,
        path = EXCLUDED.path,
        location_metadata = EXCLUDED.location_metadata,
        last_modified = EXCLUDED.last_modified,
        version = EXCLUDED.version,
        sync_timestamp = NOW()
    `;

    const values = [
      entry.id,
      entry.name,
      entry.description,
      entry.type,
      entry.location.sourceType,
      entry.location.connectionId,
      entry.location.database,
      entry.location.schema,
      entry.location.table,
      entry.location.path,
      JSON.stringify(entry.location.metadata || {}),
      entry.lastModified,
      entry.version
    ];

    await client.query(sql, values);
  }

  private async getExistingEntry(client: PoolClient, entryId: string): Promise<any> {
    const sql = `SELECT id FROM ${this.config.schema.catalogSchema}.catalog_entries WHERE id = $1`;
    const result = await client.query(sql, [entryId]);
    return result.rows[0] || null;
  }

  private async insertCatalogEntry(client: PoolClient, entry: DataCatalogEntry): Promise<void> {
    await this.upsertCatalogEntry(client, entry);
  }

  private async updateCatalogEntry(client: PoolClient, entry: DataCatalogEntry): Promise<void> {
    await this.upsertCatalogEntry(client, entry);
  }

  private async syncSchemaFields(client: PoolClient, entry: DataCatalogEntry): Promise<void> {
    // Delete existing fields
    await client.query(
      `DELETE FROM ${this.config.schema.catalogSchema}.schema_fields WHERE catalog_entry_id = $1`,
      [entry.id]
    );

    // Insert new fields
    for (const field of entry.schema.fields) {
      const sql = `
        INSERT INTO ${this.config.schema.catalogSchema}.schema_fields (
          catalog_entry_id, field_name, field_type, nullable, default_value,
          description, sensitivity, personal_data, indigenous_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      const values = [
        entry.id,
        field.name,
        field.type,
        field.nullable,
        field.defaultValue,
        field.description,
        field.sensitivity,
        field.personalData,
        field.indigenousData
      ];

      const result = await client.query(sql, values);
      const fieldId = result.rows[0].id;

      // Sync field tags
      await this.syncFieldTags(client, fieldId, entry.id, field.name, field.tags);
    }
  }

  private async syncFieldTags(
    client: PoolClient, 
    fieldId: string, 
    catalogEntryId: string,
    fieldName: string,
    tags: FieldTag[]
  ): Promise<void> {
    for (const tag of tags) {
      const sql = `
        INSERT INTO ${this.config.schema.tagsSchema}.field_tags (
          field_id, catalog_entry_id, field_name, tag_key, tag_value,
          tag_type, tag_source, confidence, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const values = [
        fieldId,
        catalogEntryId,
        fieldName,
        tag.key,
        tag.value,
        tag.type,
        tag.source,
        tag.confidence,
        tag.createdAt,
        tag.createdBy
      ];

      await client.query(sql, values);
    }
  }

  private async syncTags(client: PoolClient, entry: DataCatalogEntry): Promise<void> {
    // This method handles entry-level tags if they exist
    // Field-level tags are handled in syncSchemaFields
  }

  private async syncGovernanceMetadata(client: PoolClient, entry: DataCatalogEntry): Promise<void> {
    const governance = entry.governance;
    
    const sql = `
      INSERT INTO ${this.config.schema.metadataSchema}.governance_metadata (
        catalog_entry_id, owner_id, steward_id, custodian_id,
        consent_required_level, consent_purposes, consent_expiry_days,
        explicit_consent_required, withdrawal_allowed, sovereignty_level,
        traditional_owners, data_residency_country, data_residency_region,
        retention_years, retention_reason, disposal_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (catalog_entry_id) DO UPDATE SET
        owner_id = EXCLUDED.owner_id,
        steward_id = EXCLUDED.steward_id,
        custodian_id = EXCLUDED.custodian_id,
        consent_required_level = EXCLUDED.consent_required_level,
        consent_purposes = EXCLUDED.consent_purposes,
        consent_expiry_days = EXCLUDED.consent_expiry_days,
        explicit_consent_required = EXCLUDED.explicit_consent_required,
        withdrawal_allowed = EXCLUDED.withdrawal_allowed,
        sovereignty_level = EXCLUDED.sovereignty_level,
        traditional_owners = EXCLUDED.traditional_owners,
        data_residency_country = EXCLUDED.data_residency_country,
        data_residency_region = EXCLUDED.data_residency_region,
        retention_years = EXCLUDED.retention_years,
        retention_reason = EXCLUDED.retention_reason,
        disposal_method = EXCLUDED.disposal_method
    `;

    const values = [
      entry.id,
      governance.owner,
      governance.steward,
      governance.custodian,
      governance.consent.requiredLevel,
      governance.consent.purposes,
      governance.consent.expiryDays,
      governance.consent.explicitRequired,
      governance.consent.withdrawalAllowed,
      governance.sovereignty.level,
      governance.sovereignty.traditionalOwners,
      governance.sovereignty.residency.country,
      governance.sovereignty.residency.region,
      governance.retention.years,
      governance.retention.reason,
      governance.retention.disposalMethod
    ];

    await client.query(sql, values);
  }

  private async syncComplianceMetadata(client: PoolClient, entry: DataCatalogEntry): Promise<void> {
    const compliance = entry.compliance;
    
    const sql = `
      INSERT INTO ${this.config.schema.metadataSchema}.compliance_metadata (
        catalog_entry_id, privacy_act_applicable, privacy_act_apps, privacy_act_cross_border,
        acnc_applicable, acnc_governance_standards, acnc_reporting_threshold,
        austrac_applicable, austrac_reporting_required, austrac_thresholds,
        indigenous_care_applicable, indigenous_traditional_owners, indigenous_cultural_protocols,
        data_residency_required, data_residency_allowed_regions,
        compliance_status, risk_level, last_review_date, next_review_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (catalog_entry_id) DO UPDATE SET
        privacy_act_applicable = EXCLUDED.privacy_act_applicable,
        privacy_act_apps = EXCLUDED.privacy_act_apps,
        privacy_act_cross_border = EXCLUDED.privacy_act_cross_border,
        acnc_applicable = EXCLUDED.acnc_applicable,
        acnc_governance_standards = EXCLUDED.acnc_governance_standards,
        acnc_reporting_threshold = EXCLUDED.acnc_reporting_threshold,
        austrac_applicable = EXCLUDED.austrac_applicable,
        austrac_reporting_required = EXCLUDED.austrac_reporting_required,
        austrac_thresholds = EXCLUDED.austrac_thresholds,
        indigenous_care_applicable = EXCLUDED.indigenous_care_applicable,
        indigenous_traditional_owners = EXCLUDED.indigenous_traditional_owners,
        indigenous_cultural_protocols = EXCLUDED.indigenous_cultural_protocols,
        data_residency_required = EXCLUDED.data_residency_required,
        data_residency_allowed_regions = EXCLUDED.data_residency_allowed_regions,
        compliance_status = EXCLUDED.compliance_status,
        risk_level = EXCLUDED.risk_level,
        last_review_date = EXCLUDED.last_review_date,
        next_review_date = EXCLUDED.next_review_date
    `;

    const values = [
      entry.id,
      compliance.australian.privacyAct.applicable,
      compliance.australian.privacyAct.apps,
      compliance.australian.privacyAct.crossBorder,
      compliance.australian.acnc?.applicable || false,
      compliance.australian.acnc?.governanceStandards || [],
      compliance.australian.acnc?.reportingThreshold,
      compliance.australian.austrac?.applicable || false,
      compliance.australian.austrac?.reportingRequired || false,
      compliance.australian.austrac?.thresholds || [],
      compliance.australian.indigenous?.careApplicable || false,
      compliance.australian.indigenous?.traditionalOwners || [],
      compliance.australian.indigenous?.culturalProtocols || [],
      compliance.australian.dataResidency.required,
      compliance.australian.dataResidency.allowedRegions,
      compliance.status.overall,
      compliance.status.riskLevel,
      compliance.lastReview,
      compliance.nextReview
    ];

    await client.query(sql, values);
  }

  private countTotalTags(entry: DataCatalogEntry): number {
    return entry.schema.fields.reduce((count, field) => count + field.tags.length, 0);
  }

  private async detectComplianceIssues(entry: DataCatalogEntry): Promise<string[]> {
    const issues: string[] = [];
    
    // Check for personal data without proper consent
    const hasPersonalData = entry.schema.fields.some(field => field.personalData);
    if (hasPersonalData && entry.governance.consent.requiredLevel === 'basic_consent') {
      issues.push('Personal data detected but only basic consent required');
    }
    
    // Check for Indigenous data without proper protocols
    const hasIndigenousData = entry.schema.fields.some(field => field.indigenousData);
    if (hasIndigenousData && !entry.compliance.australian.indigenous?.careApplicable) {
      issues.push('Indigenous data detected but CARE principles not applied');
    }
    
    // Check for high sensitivity data without proper governance
    const hasHighSensitivityData = entry.schema.fields.some(field => 
      field.sensitivity === 'restricted' || field.sensitivity === 'secret'
    );
    if (hasHighSensitivityData && entry.governance.retention.years < 7) {
      issues.push('High sensitivity data with insufficient retention period');
    }
    
    return issues;
  }

  private async cleanupOrphanedRecords(statistics: SyncStatistics): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // This would identify and clean up records that are no longer in the catalog
      // Implementation depends on specific cleanup requirements
      
    } finally {
      client.release();
    }
  }
}