/**
 * Data Consistency Validator API Endpoints
 * RESTful API for data consistency validation between Supabase and Neo4j
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { apiKeyOrAuth, requireAdmin } from '../middleware/auth.js';
import dataConsistencyValidatorService from '../services/dataConsistencyValidatorService.js';

const router = express.Router();

/**
 * Get data consistency validator service status
 */
router.get('/status', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📊 Getting data consistency validator status...');
  
  const status = dataConsistencyValidatorService.getStatus();
  
  res.json({
    success: true,
    service_name: 'Data Consistency Validator Service',
    status,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Perform quick health check
 */
router.get('/health', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('🏥 Performing data consistency health check...');
  
  const healthCheck = await dataConsistencyValidatorService.quickHealthCheck();
  
  const httpStatus = healthCheck.healthy ? 200 : 503;
  
  res.status(httpStatus).json({
    success: healthCheck.success,
    healthy: healthCheck.healthy,
    health_check: healthCheck,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Perform full data consistency validation
 */
router.post('/validate', requireAdmin, asyncHandler(async (req, res) => {
  const { 
    autoRepair = false,
    batchSize = 100,
    reportFormat = 'detailed',
    tables = null // Specific tables to validate, null for all
  } = req.body;

  console.log('🔍 Starting full data consistency validation...');
  console.log(`Configuration: autoRepair=${autoRepair}, batchSize=${batchSize}, format=${reportFormat}`);
  
  try {
    if (!dataConsistencyValidatorService.isInitialized) {
      const initialized = await dataConsistencyValidatorService.initialize();
      if (!initialized) {
        return res.status(500).json({
          success: false,
          message: 'Failed to initialize data consistency validator'
        });
      }
    }

    const options = {
      autoRepair,
      batchSize,
      reportFormat
    };

    // Filter tables if specified
    if (tables && Array.isArray(tables)) {
      const validTables = ['user_profiles', 'projects', 'project_outcomes'];
      const filteredTables = tables.filter(table => validTables.includes(table));
      
      if (filteredTables.length > 0) {
        const fullMappings = dataConsistencyValidatorService.config.tableMappings;
        options.tableMappings = {};
        
        for (const table of filteredTables) {
          if (fullMappings[table]) {
            options.tableMappings[table] = fullMappings[table];
          }
        }
      }
    }

    const result = await dataConsistencyValidatorService.performFullValidation(options);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Data consistency validation completed',
        validation: result,
        summary: result.summary,
        duration_ms: result.duration
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Data consistency validation failed',
        error: result.error,
        duration_ms: result.duration
      });
    }
  } catch (error) {
    console.error('❌ Data consistency validation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Data consistency validation failed',
      error: error.message
    });
  }
}));

/**
 * Get latest validation results
 */
router.get('/results', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📋 Getting latest validation results...');
  
  const results = dataConsistencyValidatorService.getValidationResults();
  
  if (!results.timestamp) {
    return res.status(404).json({
      success: false,
      message: 'No validation results available. Run validation first.',
      results: null
    });
  }

  res.json({
    success: true,
    results,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get validation summary only
 */
router.get('/summary', apiKeyOrAuth, asyncHandler(async (req, res) => {
  console.log('📈 Getting validation summary...');
  
  const results = dataConsistencyValidatorService.getValidationResults();
  
  if (!results.timestamp) {
    return res.status(404).json({
      success: false,
      message: 'No validation results available. Run validation first.',
      summary: null
    });
  }

  res.json({
    success: true,
    summary: results.summary,
    validation_timestamp: results.timestamp,
    service_status: results.service_status,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get inconsistencies details
 */
router.get('/inconsistencies', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { type = null, table = null, limit = 50 } = req.query;
  
  console.log('🔍 Getting inconsistencies details...');
  
  const results = dataConsistencyValidatorService.getValidationResults();
  
  if (!results.timestamp) {
    return res.status(404).json({
      success: false,
      message: 'No validation results available. Run validation first.'
    });
  }

  let inconsistencies = [
    ...results.inconsistencies,
    ...results.relationshipIssues
  ];

  // Apply filters
  if (type) {
    inconsistencies = inconsistencies.filter(item => item.type === type);
  }
  
  if (table) {
    inconsistencies = inconsistencies.filter(item => item.table === table);
  }

  // Apply limit
  inconsistencies = inconsistencies.slice(0, parseInt(limit));

  res.json({
    success: true,
    inconsistencies,
    total_found: inconsistencies.length,
    filters: { type, table, limit },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get missing records details
 */
router.get('/missing', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { source = 'all', table = null, limit = 50 } = req.query;
  
  console.log('📋 Getting missing records details...');
  
  const results = dataConsistencyValidatorService.getValidationResults();
  
  if (!results.timestamp) {
    return res.status(404).json({
      success: false,
      message: 'No validation results available. Run validation first.'
    });
  }

  let missing = [];
  
  if (source === 'all' || source === 'supabase') {
    missing.push(...results.missing.supabase.map(item => ({ ...item, missing_from: 'supabase' })));
  }
  
  if (source === 'all' || source === 'neo4j') {
    missing.push(...results.missing.neo4j.map(item => ({ ...item, missing_from: 'neo4j' })));
  }

  // Apply table filter
  if (table) {
    missing = missing.filter(item => item.table === table);
  }

  // Apply limit
  missing = missing.slice(0, parseInt(limit));

  res.json({
    success: true,
    missing_records: missing,
    total_found: missing.length,
    filters: { source, table, limit },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Get orphaned records details
 */
router.get('/orphaned', apiKeyOrAuth, asyncHandler(async (req, res) => {
  const { source = 'all', table = null, limit = 50 } = req.query;
  
  console.log('🗑️ Getting orphaned records details...');
  
  const results = dataConsistencyValidatorService.getValidationResults();
  
  if (!results.timestamp) {
    return res.status(404).json({
      success: false,
      message: 'No validation results available. Run validation first.'
    });
  }

  let orphaned = [];
  
  if (source === 'all' || source === 'supabase') {
    orphaned.push(...results.orphaned.supabase.map(item => ({ ...item, orphaned_in: 'supabase' })));
  }
  
  if (source === 'all' || source === 'neo4j') {
    orphaned.push(...results.orphaned.neo4j.map(item => ({ ...item, orphaned_in: 'neo4j' })));
  }

  // Apply table filter
  if (table) {
    orphaned = orphaned.filter(item => item.table === table);
  }

  // Apply limit
  orphaned = orphaned.slice(0, parseInt(limit));

  res.json({
    success: true,
    orphaned_records: orphaned,
    total_found: orphaned.length,
    filters: { source, table, limit },
    timestamp: new Date().toISOString()
  });
}));

/**
 * Perform manual repair operations
 */
router.post('/repair', requireAdmin, asyncHandler(async (req, res) => {
  const {
    repairType = 'all', // 'missing', 'orphaned', 'inconsistent', 'all'
    dryRun = true,
    limit = 10
  } = req.body;

  console.log(`🔧 ${dryRun ? 'Simulating' : 'Performing'} manual repair operations...`);
  console.log(`Repair type: ${repairType}, limit: ${limit}`);
  
  try {
    if (!dataConsistencyValidatorService.isInitialized) {
      const initialized = await dataConsistencyValidatorService.initialize();
      if (!initialized) {
        return res.status(500).json({
          success: false,
          message: 'Failed to initialize data consistency validator'
        });
      }
    }

    // Get current validation results
    const results = dataConsistencyValidatorService.getValidationResults();
    
    if (!results.timestamp) {
      return res.status(400).json({
        success: false,
        message: 'No validation results available. Run validation first.'
      });
    }

    const repairActions = [];
    let processedCount = 0;

    // Process missing records in Neo4j
    if ((repairType === 'all' || repairType === 'missing') && results.missing.neo4j.length > 0) {
      for (const missing of results.missing.neo4j.slice(0, limit - processedCount)) {
        if (processedCount >= limit) break;

        const action = {
          type: 'sync_missing_to_neo4j',
          table: missing.table,
          keyValue: missing.keyValue,
          planned: true
        };

        if (!dryRun) {
          try {
            if (missing.table === 'user_profiles') {
              await dataConsistencyValidatorService.knowledgeGraphSyncService
                .syncUserToKnowledgeGraph(missing.supabaseRecord);
              action.executed = true;
              action.success = true;
            }
          } catch (error) {
            action.executed = true;
            action.success = false;
            action.error = error.message;
          }
        }

        repairActions.push(action);
        processedCount++;
      }
    }

    // Process orphaned nodes in Neo4j
    if ((repairType === 'all' || repairType === 'orphaned') && results.orphaned.neo4j.length > 0) {
      for (const orphaned of results.orphaned.neo4j.slice(0, limit - processedCount)) {
        if (processedCount >= limit) break;

        const action = {
          type: 'delete_orphaned_from_neo4j',
          table: orphaned.table,
          keyValue: orphaned.keyValue,
          label: orphaned.label,
          planned: true
        };

        if (!dryRun) {
          try {
            const deleteQuery = `
              MATCH (n:${orphaned.label} {${orphaned.keyField}: $keyValue})
              DETACH DELETE n
            `;
            
            await dataConsistencyValidatorService.knowledgeGraphService
              .executeWrite(deleteQuery, { keyValue: orphaned.keyValue });
            
            action.executed = true;
            action.success = true;
          } catch (error) {
            action.executed = true;
            action.success = false;
            action.error = error.message;
          }
        }

        repairActions.push(action);
        processedCount++;
      }
    }

    const successCount = repairActions.filter(a => a.success).length;
    const failCount = repairActions.filter(a => a.success === false).length;

    res.json({
      success: true,
      message: `${dryRun ? 'Simulated' : 'Performed'} ${processedCount} repair operations`,
      dry_run: dryRun,
      repair_actions: repairActions,
      summary: {
        planned: repairActions.length,
        executed: dryRun ? 0 : repairActions.filter(a => a.executed).length,
        succeeded: successCount,
        failed: failCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual repair failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Manual repair operation failed',
      error: error.message
    });
  }
}));

/**
 * Initialize the data consistency validator service
 */
router.post('/initialize', requireAdmin, asyncHandler(async (req, res) => {
  console.log('🚀 Initializing data consistency validator service...');
  
  try {
    const initialized = await dataConsistencyValidatorService.initialize();
    
    if (initialized) {
      res.json({
        success: true,
        message: 'Data consistency validator service initialized successfully',
        status: dataConsistencyValidatorService.getStatus()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to initialize data consistency validator service'
      });
    }
  } catch (error) {
    console.error('❌ Failed to initialize service:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize data consistency validator service',
      error: error.message
    });
  }
}));

/**
 * Get supported validation options
 */
router.get('/config', apiKeyOrAuth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    config: {
      supported_tables: Object.keys(dataConsistencyValidatorService.config.tableMappings),
      repair_types: ['missing', 'orphaned', 'inconsistent', 'all'],
      report_formats: ['summary', 'detailed'],
      validation_options: {
        autoRepair: 'boolean - automatically repair simple issues',
        batchSize: 'number - records to process per batch (default: 100)',
        reportFormat: 'string - summary or detailed (default: detailed)',
        tables: 'array - specific tables to validate (default: all)'
      }
    },
    table_mappings: dataConsistencyValidatorService.config.tableMappings,
    timestamp: new Date().toISOString()
  });
}));

export default router;