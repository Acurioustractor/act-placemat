/**
 * Data Consistency Validator Service
 * Validates and ensures data consistency between Supabase PostgreSQL and Neo4j Knowledge Graph
 * Detects inconsistencies, missing records, orphaned data, and provides repair mechanisms
 */

import { createClient } from '@supabase/supabase-js';

class DataConsistencyValidatorService {
  constructor() {
    this.supabase = null; // Will be initialized in initialize() method
    this.isInitialized = false;
    
    // Validation configuration
    this.config = {
      batchSize: 100,
      maxDiscrepancies: 1000,
      autoRepair: false, // Set to true to automatically repair simple issues
      reportFormat: 'detailed', // 'summary' or 'detailed'
      validationTimeout: 300000, // 5 minutes
      
      // Table mapping between Supabase and Neo4j
      tableMappings: {
        user_profiles: {
          neo4jLabel: 'User',
          keyField: 'user_id',
          requiredFields: ['email', 'display_name', 'account_status'],
          relationships: ['INTERESTED_IN', 'HAS_SKILL']
        },
        projects: {
          neo4jLabel: 'Project',
          keyField: 'id',
          requiredFields: ['name', 'status'],
          relationships: ['ADDRESSES_INTEREST', 'REQUIRES_SKILL']
        },
        project_outcomes: {
          neo4jLabel: 'Outcome', 
          keyField: 'id',
          requiredFields: ['title', 'verification_status'],
          relationships: ['PRODUCES_OUTCOME']
        }
      }
    };

    // Validation results
    this.validationResults = {
      timestamp: null,
      totalChecks: 0,
      inconsistencies: [],
      missing: {
        supabase: [], // Missing in Supabase but exists in Neo4j
        neo4j: []     // Missing in Neo4j but exists in Supabase
      },
      orphaned: {
        supabase: [], // Orphaned records in Supabase
        neo4j: []     // Orphaned nodes in Neo4j
      },
      relationshipIssues: [],
      repairActions: [],
      summary: {
        healthy: true,
        totalRecords: 0,
        consistentRecords: 0,
        inconsistentRecords: 0,
        missingRecords: 0,
        orphanedRecords: 0,
        consistencyPercentage: 0
      }
    };
  }

  /**
   * Initialize the validation service
   */
  async initialize() {
    try {
      console.log('🔍 Initializing Data Consistency Validator Service...');
      
      // Initialize Supabase client
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Test Supabase connection
      const { data, error } = await this.supabase.from('user_profiles').select('id').limit(1);
      if (error && error.code !== '42P01') {
        throw new Error(`Supabase connection test failed: ${error.message}`);
      }

      // Dynamic import of knowledge graph services
      const { default: knowledgeGraphService } = await import('./knowledgeGraphService.js');
      this.knowledgeGraphService = knowledgeGraphService;
      
      const { default: knowledgeGraphSyncService } = await import('./knowledgeGraphSyncService.js');
      this.knowledgeGraphSyncService = knowledgeGraphSyncService;
      
      // Ensure knowledge graph is initialized
      if (!this.knowledgeGraphService.isConnected) {
        await this.knowledgeGraphService.initialize();
      }

      this.isInitialized = true;
      console.log('✅ Data Consistency Validator Service initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Data Consistency Validator Service:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Perform comprehensive data consistency validation
   */
  async performFullValidation(options = {}) {
    if (!this.isInitialized) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    console.log('🔍 Starting comprehensive data consistency validation...');

    try {
      // Reset validation results
      this.resetValidationResults();
      this.validationResults.timestamp = new Date().toISOString();

      // Apply options
      const config = { ...this.config, ...options };

      // Validate each table mapping
      for (const [tableName, mapping] of Object.entries(config.tableMappings)) {
        try {
          console.log(`📊 Validating ${tableName} → ${mapping.neo4jLabel}...`);
          await this.validateTableConsistency(tableName, mapping, config);
        } catch (error) {
          console.error(`❌ Failed to validate ${tableName}:`, error.message);
          this.validationResults.inconsistencies.push({
            type: 'validation_error',
            table: tableName,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Validate relationships
      console.log('🔗 Validating relationship consistency...');
      await this.validateRelationshipConsistency(config);

      // Generate summary
      this.generateValidationSummary();

      // Perform auto-repair if enabled
      if (config.autoRepair) {
        console.log('🔧 Performing automatic repairs...');
        await this.performAutoRepair();
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Data consistency validation completed in ${duration}ms`);

      return {
        success: true,
        results: this.validationResults,
        duration,
        summary: this.validationResults.summary
      };

    } catch (error) {
      console.error('❌ Data consistency validation failed:', error.message);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Validate consistency for a specific table
   */
  async validateTableConsistency(tableName, mapping, config) {
    const batchSize = config.batchSize;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      // Get batch from Supabase
      const { data: supabaseRecords, error } = await this.supabase
        .from(tableName)
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (error) {
        throw new Error(`Failed to fetch ${tableName} from Supabase: ${error.message}`);
      }

      if (!supabaseRecords || supabaseRecords.length === 0) {
        hasMore = false;
        break;
      }

      // Validate each record
      for (const record of supabaseRecords) {
        await this.validateRecord(tableName, record, mapping);
        this.validationResults.totalChecks++;
      }

      offset += batchSize;
      hasMore = supabaseRecords.length === batchSize;
    }

    // Check for orphaned nodes in Neo4j
    await this.checkOrphanedNeo4jNodes(tableName, mapping);
  }

  /**
   * Validate a single record consistency
   */
  async validateRecord(tableName, supabaseRecord, mapping) {
    const keyValue = supabaseRecord[mapping.keyField];
    
    // Query Neo4j for corresponding node
    const neo4jQuery = `
      MATCH (n:${mapping.neo4jLabel} {${mapping.keyField}: $keyValue})
      RETURN n
    `;

    const neo4jResult = await this.knowledgeGraphService.executeRead(neo4jQuery, { keyValue });

    if (!neo4jResult.success || neo4jResult.records.length === 0) {
      // Record missing in Neo4j
      this.validationResults.missing.neo4j.push({
        table: tableName,
        keyField: mapping.keyField,
        keyValue: keyValue,
        supabaseRecord: supabaseRecord,
        issue: 'missing_in_neo4j'
      });
      return;
    }

    const neo4jRecord = neo4jResult.records[0].n;

    // Validate required fields
    for (const field of mapping.requiredFields) {
      const supabaseValue = supabaseRecord[field];
      const neo4jValue = neo4jRecord[field];

      if (this.normalizeValue(supabaseValue) !== this.normalizeValue(neo4jValue)) {
        this.validationResults.inconsistencies.push({
          type: 'field_mismatch',
          table: tableName,
          keyField: mapping.keyField,
          keyValue: keyValue,
          field: field,
          supabaseValue: supabaseValue,
          neo4jValue: neo4jValue,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Validate relationships if defined
    if (mapping.relationships && mapping.relationships.length > 0) {
      await this.validateRecordRelationships(tableName, supabaseRecord, mapping);
    }
  }

  /**
   * Validate relationships for a record
   */
  async validateRecordRelationships(tableName, supabaseRecord, mapping) {
    const keyValue = supabaseRecord[mapping.keyField];

    for (const relationshipType of mapping.relationships) {
      const relationshipQuery = `
        MATCH (n:${mapping.neo4jLabel} {${mapping.keyField}: $keyValue})-[r:${relationshipType}]->(target)
        RETURN count(r) as relationship_count, collect(target) as targets
      `;

      const result = await this.knowledgeGraphService.executeRead(relationshipQuery, { keyValue });
      
      if (result.success && result.records.length > 0) {
        const relationshipCount = result.records[0].relationship_count;
        
        // For user interests and skills, validate against Supabase arrays
        if (tableName === 'user_profiles') {
          let expectedCount = 0;
          
          if (relationshipType === 'INTERESTED_IN' && supabaseRecord.interests) {
            expectedCount = Array.isArray(supabaseRecord.interests) ? supabaseRecord.interests.length : 0;
          } else if (relationshipType === 'HAS_SKILL' && supabaseRecord.expertise_areas) {
            expectedCount = Array.isArray(supabaseRecord.expertise_areas) ? supabaseRecord.expertise_areas.length : 0;
          }

          if (relationshipCount !== expectedCount) {
            this.validationResults.relationshipIssues.push({
              type: 'relationship_count_mismatch',
              table: tableName,
              keyValue: keyValue,
              relationshipType: relationshipType,
              expectedCount: expectedCount,
              actualCount: relationshipCount,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
  }

  /**
   * Check for orphaned nodes in Neo4j
   */
  async checkOrphanedNeo4jNodes(tableName, mapping) {
    const orphanQuery = `
      MATCH (n:${mapping.neo4jLabel})
      RETURN n.${mapping.keyField} as keyValue
    `;

    const result = await this.knowledgeGraphService.executeRead(orphanQuery);
    
    if (result.success && result.records.length > 0) {
      for (const record of result.records) {
        const keyValue = record.keyValue;
        
        // Check if this exists in Supabase
        const { data, error } = await this.supabase
          .from(tableName)
          .select(mapping.keyField)
          .eq(mapping.keyField, keyValue)
          .single();

        if (error && error.code === 'PGRST116') { // Not found
          this.validationResults.orphaned.neo4j.push({
            table: tableName,
            label: mapping.neo4jLabel,
            keyField: mapping.keyField,
            keyValue: keyValue,
            issue: 'orphaned_in_neo4j'
          });
        }
      }
    }
  }

  /**
   * Validate relationship consistency across the graph
   */
  async validateRelationshipConsistency(config) {
    // Check for dangling relationships
    const danglingRelQuery = `
      MATCH (n)-[r]->(m)
      WHERE n:User AND m:Interest OR n:User AND m:Skill
      WITH n, type(r) as relType, count(m) as targetCount
      WHERE targetCount = 0
      RETURN n.user_id as userId, relType, targetCount
    `;

    const result = await this.knowledgeGraphService.executeRead(danglingRelQuery);
    
    if (result.success) {
      for (const record of result.records) {
        this.validationResults.relationshipIssues.push({
          type: 'dangling_relationship',
          userId: record.userId,
          relationshipType: record.relType,
          issue: 'relationship_with_no_target',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check for duplicate relationships
    const duplicateRelQuery = `
      MATCH (n)-[r]->(m)
      WITH n, m, type(r) as relType, count(r) as relCount
      WHERE relCount > 1
      RETURN n.user_id as userId, m.name as targetName, relType, relCount
    `;

    const duplicateResult = await this.knowledgeGraphService.executeRead(duplicateRelQuery);
    
    if (duplicateResult.success) {
      for (const record of duplicateResult.records) {
        this.validationResults.relationshipIssues.push({
          type: 'duplicate_relationship',
          userId: record.userId,
          targetName: record.targetName,
          relationshipType: record.relType,
          count: record.relCount,
          issue: 'duplicate_relationships',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Generate validation summary
   */
  generateValidationSummary() {
    const summary = this.validationResults.summary;
    
    summary.totalRecords = this.validationResults.totalChecks;
    summary.inconsistentRecords = this.validationResults.inconsistencies.length;
    summary.missingRecords = this.validationResults.missing.supabase.length + 
                             this.validationResults.missing.neo4j.length;
    summary.orphanedRecords = this.validationResults.orphaned.supabase.length + 
                              this.validationResults.orphaned.neo4j.length;
    summary.consistentRecords = summary.totalRecords - summary.inconsistentRecords - summary.missingRecords;
    
    if (summary.totalRecords > 0) {
      summary.consistencyPercentage = Math.round(
        (summary.consistentRecords / summary.totalRecords) * 100
      );
    }

    summary.healthy = summary.consistencyPercentage >= 95 && 
                      this.validationResults.relationshipIssues.length < 10;

    console.log(`📊 Validation Summary:`);
    console.log(`   Total Records: ${summary.totalRecords}`);
    console.log(`   Consistent: ${summary.consistentRecords} (${summary.consistencyPercentage}%)`);
    console.log(`   Inconsistent: ${summary.inconsistentRecords}`);
    console.log(`   Missing: ${summary.missingRecords}`);
    console.log(`   Orphaned: ${summary.orphanedRecords}`);
    console.log(`   Relationship Issues: ${this.validationResults.relationshipIssues.length}`);
    console.log(`   Overall Health: ${summary.healthy ? '✅ Healthy' : '⚠️ Issues Detected'}`);
  }

  /**
   * Perform automatic repair of simple issues
   */
  async performAutoRepair() {
    let repairedCount = 0;

    try {
      // Repair missing records in Neo4j (sync from Supabase)
      for (const missing of this.validationResults.missing.neo4j) {
        if (missing.table === 'user_profiles') {
          try {
            await this.knowledgeGraphSyncService.syncUserToKnowledgeGraph(missing.supabaseRecord);
            this.validationResults.repairActions.push({
              action: 'sync_user_to_neo4j',
              keyValue: missing.keyValue,
              success: true,
              timestamp: new Date().toISOString()
            });
            repairedCount++;
          } catch (error) {
            this.validationResults.repairActions.push({
              action: 'sync_user_to_neo4j',
              keyValue: missing.keyValue,
              success: false,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Remove orphaned nodes from Neo4j
      for (const orphaned of this.validationResults.orphaned.neo4j) {
        try {
          const deleteQuery = `
            MATCH (n:${orphaned.label} {${orphaned.keyField}: $keyValue})
            DETACH DELETE n
          `;
          
          await this.knowledgeGraphService.executeWrite(deleteQuery, { keyValue: orphaned.keyValue });
          
          this.validationResults.repairActions.push({
            action: 'delete_orphaned_node',
            keyValue: orphaned.keyValue,
            label: orphaned.label,
            success: true,
            timestamp: new Date().toISOString()
          });
          repairedCount++;
        } catch (error) {
          this.validationResults.repairActions.push({
            action: 'delete_orphaned_node',
            keyValue: orphaned.keyValue,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log(`🔧 Auto-repair completed: ${repairedCount} issues repaired`);
      
    } catch (error) {
      console.error('❌ Auto-repair failed:', error.message);
    }
  }

  /**
   * Quick health check
   */
  async quickHealthCheck() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🔍 Performing quick data consistency health check...');

      // Check basic counts
      const supabaseUserCount = await this.getSupabaseRecordCount('user_profiles');
      const neo4jUserCount = await this.getNeo4jNodeCount('User');

      const issues = [];
      
      if (Math.abs(supabaseUserCount - neo4jUserCount) > 5) {
        issues.push({
          type: 'count_discrepancy',
          table: 'user_profiles',
          supabaseCount: supabaseUserCount,
          neo4jCount: neo4jUserCount,
          difference: Math.abs(supabaseUserCount - neo4jUserCount)
        });
      }

      return {
        success: true,
        healthy: issues.length === 0,
        counts: {
          supabase_users: supabaseUserCount,
          neo4j_users: neo4jUserCount
        },
        issues,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get record count from Supabase table
   */
  async getSupabaseRecordCount(tableName) {
    const { count, error } = await this.supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count ${tableName}: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get node count from Neo4j
   */
  async getNeo4jNodeCount(label) {
    const query = `MATCH (n:${label}) RETURN count(n) as count`;
    const result = await this.knowledgeGraphService.executeRead(query);
    
    if (!result.success || result.records.length === 0) {
      throw new Error(`Failed to count ${label} nodes`);
    }

    return result.records[0].count || 0;
  }

  /**
   * Normalize values for comparison
   */
  normalizeValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  /**
   * Reset validation results
   */
  resetValidationResults() {
    this.validationResults = {
      timestamp: null,
      totalChecks: 0,
      inconsistencies: [],
      missing: { supabase: [], neo4j: [] },
      orphaned: { supabase: [], neo4j: [] },
      relationshipIssues: [],
      repairActions: [],
      summary: {
        healthy: true,
        totalRecords: 0,
        consistentRecords: 0,
        inconsistentRecords: 0,
        missingRecords: 0,
        orphanedRecords: 0,
        consistencyPercentage: 0
      }
    };
  }

  /**
   * Get current validation results
   */
  getValidationResults() {
    return {
      ...this.validationResults,
      service_status: {
        initialized: this.isInitialized,
        last_validation: this.validationResults.timestamp
      }
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      config: this.config,
      last_validation: this.validationResults.timestamp,
      validation_summary: this.validationResults.summary
    };
  }
}

// Create singleton instance
const dataConsistencyValidatorService = new DataConsistencyValidatorService();

export default dataConsistencyValidatorService;