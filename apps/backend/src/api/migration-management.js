/**
 * Migration Management API Endpoints
 * 
 * Bulletproof API endpoints for Empathy Ledger migration
 * and platform integration management
 */

import { 
  validateMigrationReadiness,
  executeMigrationPlan,
  getMigrationStatus
} from '../migrations/empathy-ledger-migration.js';

import {
  initializePlatformIntegrations,
  syncEntityAcrossPlatforms,
  getPlatformStatus,
  performPlatformHealthCheck
} from '../integrations/unified-platform-manager.js';

import databaseManager from '../config/database.js';

/**
 * Setup migration and integration management routes
 */
export function setupMigrationManagement(app) {
  console.log('🔧 Setting up Migration Management API endpoints');

  // =============================================
  // EMPATHY LEDGER MIGRATION ENDPOINTS
  // =============================================

  /**
   * GET /api/migration/status
   * Get current migration status and data consistency
   */
  app.get('/api/migration/status', async (req, res) => {
    try {
      const status = await getMigrationStatus();
      const healthStatus = await databaseManager.getHealthStatus();
      
      res.json({
        success: true,
        migration: status,
        databases: healthStatus,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Migration status check failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /api/migration/validate
   * Validate migration readiness without executing migration
   */
  app.post('/api/migration/validate', async (req, res) => {
    try {
      console.log('📋 Validating migration readiness...');
      const validation = await validateMigrationReadiness();
      
      res.json({
        success: true,
        validation,
        ready: validation.ready,
        issues: validation.issues,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Migration validation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /api/migration/execute
   * Execute Empathy Ledger migration
   * Body: { dryRun: boolean, skipBackup: boolean }
   */
  app.post('/api/migration/execute', async (req, res) => {
    try {
      const { 
        dryRun = true, 
        skipBackup = false,
        validateOnly = false 
      } = req.body;

      console.log(`🚀 Executing migration (dryRun: ${dryRun}, skipBackup: ${skipBackup})`);
      
      const result = await executeMigrationPlan({
        dryRun,
        skipBackup,
        validateOnly
      });
      
      res.json({
        success: true,
        result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Migration execution failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/migration/consistency/:tableName
   * Check data consistency for specific table
   */
  app.get('/api/migration/consistency/:tableName', async (req, res) => {
    try {
      const { tableName } = req.params;
      const consistency = await databaseManager.checkDataConsistency(tableName);
      
      res.json({
        success: true,
        table: tableName,
        consistency,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Consistency check failed for ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // =============================================
  // PLATFORM INTEGRATION ENDPOINTS
  // =============================================

  /**
   * GET /api/integrations/status
   * Get status of all platform integrations
   */
  app.get('/api/integrations/status', async (req, res) => {
    try {
      const status = getPlatformStatus();
      
      res.json({
        success: true,
        status,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Platform status check failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /api/integrations/initialize
   * Initialize all platform integrations
   */
  app.post('/api/integrations/initialize', async (req, res) => {
    try {
      console.log('🚀 Initializing platform integrations...');
      await initializePlatformIntegrations();
      
      const status = getPlatformStatus();
      
      res.json({
        success: true,
        message: 'Platform integrations initialized',
        status,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Platform initialization failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /api/integrations/health-check
   * Perform health check on all integrations
   */
  app.post('/api/integrations/health-check', async (req, res) => {
    try {
      console.log('🏥 Performing platform health check...');
      const healthResults = await performPlatformHealthCheck();
      
      res.json({
        success: true,
        healthResults,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Platform health check failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /api/integrations/sync
   * Sync entity across all relevant platforms
   * Body: { entityType: string, entityData: object, operation: string }
   */
  app.post('/api/integrations/sync', async (req, res) => {
    try {
      const { entityType, entityData, operation = 'update' } = req.body;
      
      if (!entityType || !entityData) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: entityType, entityData',
          timestamp: new Date().toISOString()
        });
      }

      console.log(`🔄 Syncing ${entityType} across platforms...`);
      const syncResult = await syncEntityAcrossPlatforms(entityType, entityData, operation);
      
      res.json({
        success: true,
        syncResult,
        entityType,
        operation,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Entity sync failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // =============================================
  // DATABASE MANAGEMENT ENDPOINTS
  // =============================================

  /**
   * GET /api/database/health
   * Get comprehensive database health status
   */
  app.get('/api/database/health', async (req, res) => {
    try {
      const healthStatus = await databaseManager.getHealthStatus();
      
      res.json({
        success: true,
        health: healthStatus,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Database health check failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/database/schema/:tableName
   * Get table schema information
   */
  app.get('/api/database/schema/:tableName', async (req, res) => {
    try {
      const { tableName } = req.params;
      const { database = 'primary' } = req.query;
      
      const schema = await databaseManager.getTableSchema(tableName, database);
      const exists = await databaseManager.tableExists(tableName, database);
      
      res.json({
        success: true,
        table: tableName,
        database,
        exists,
        schema,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Schema check failed for ${req.params.tableName}:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // =============================================
  // SYSTEM ADMINISTRATION ENDPOINTS
  // =============================================

  /**
   * GET /api/admin/system-status
   * Comprehensive system status including all components
   */
  app.get('/api/admin/system-status', async (req, res) => {
    try {
      const [
        databaseHealth,
        migrationStatus,
        platformStatus,
        platformHealth
      ] = await Promise.allSettled([
        databaseManager.getHealthStatus(),
        getMigrationStatus(),
        getPlatformStatus(),
        performPlatformHealthCheck()
      ]);

      const systemStatus = {
        overall: 'healthy', // Will be calculated based on component health
        components: {
          databases: databaseHealth.status === 'fulfilled' ? databaseHealth.value : { error: databaseHealth.reason },
          migration: migrationStatus.status === 'fulfilled' ? migrationStatus.value : { error: migrationStatus.reason },
          integrations: platformStatus.status === 'fulfilled' ? platformStatus.value : { error: platformStatus.reason },
          platformHealth: platformHealth.status === 'fulfilled' ? platformHealth.value : { error: platformHealth.reason }
        },
        timestamp: new Date().toISOString()
      };

      // Calculate overall system health
      const hasErrors = Object.values(systemStatus.components).some(component => component.error);
      systemStatus.overall = hasErrors ? 'degraded' : 'healthy';
      
      res.json({
        success: true,
        system: systemStatus
      });
      
    } catch (error) {
      console.error('System status check failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /api/admin/emergency-stop
   * Emergency stop for all background processes
   */
  app.post('/api/admin/emergency-stop', async (req, res) => {
    try {
      console.log('🚨 Emergency stop initiated');
      
      // Close all database connections
      await databaseManager.closeAll();
      
      res.json({
        success: true,
        message: 'Emergency stop completed',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Emergency stop failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  console.log('✅ Migration Management API endpoints registered');
}

export default setupMigrationManagement;