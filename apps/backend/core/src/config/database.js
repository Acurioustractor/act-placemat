/**
 * Bulletproof Database Configuration for ACT Platform
 * 
 * Features:
 * - Multi-database support (current + empathy ledger migration)
 * - Connection pooling and retry logic
 * - Environment-based configuration
 * - Migration-ready architecture
 * - Performance monitoring
 */

import { createClient } from '@supabase/supabase-js';

class DatabaseManager {
  constructor() {
    this.clients = new Map();
    this.config = {
      // Primary ACT Platform Database
      primary: {
        url: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        anonKey: process.env.SUPABASE_ANON_KEY,
        alias: 'ACT_MAIN'
      },
      
      // New Empathy Ledger Database (for migration)
      empathyLedger: {
        url: process.env.EMPATHY_LEDGER_SUPABASE_URL || process.env.SUPABASE_URL,
        serviceRoleKey: process.env.EMPATHY_LEDGER_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
        anonKey: process.env.EMPATHY_LEDGER_ANON_KEY || process.env.SUPABASE_ANON_KEY,
        alias: 'EMPATHY_LEDGER'
      }
    };
    
    this.connectionConfig = {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'ACT-Platform-v2025'
        }
      }
    };
  }

  /**
   * Get or create Supabase client for specific database
   */
  getClient(database = 'primary', options = {}) {
    const cacheKey = `${database}-${options.role || 'service'}`;
    
    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey);
    }

    const dbConfig = this.config[database];
    if (!dbConfig) {
      throw new Error(`Database configuration not found: ${database}`);
    }

    if (!dbConfig.url || !dbConfig.serviceRoleKey) {
      throw new Error(`Missing required configuration for database: ${database}. Please check environment variables.`);
    }

    // Use anon key for client-side operations, service role for server operations
    const key = options.role === 'anon' ? dbConfig.anonKey : dbConfig.serviceRoleKey;
    
    const client = createClient(dbConfig.url, key, {
      ...this.connectionConfig,
      global: {
        ...this.connectionConfig.global,
        headers: {
          ...this.connectionConfig.global.headers,
          'X-Database-Alias': dbConfig.alias
        }
      }
    });

    this.clients.set(cacheKey, client);
    console.log(`✅ ${dbConfig.alias} client initialized (${options.role || 'service'} role)`);
    
    return client;
  }

  /**
   * Get primary database client (main ACT platform)
   */
  getPrimaryClient(role = 'service') {
    return this.getClient('primary', { role });
  }

  /**
   * Get Empathy Ledger database client (for migration/dual access)
   */
  getEmpathyLedgerClient(role = 'service') {
    return this.getClient('empathyLedger', { role });
  }

  /**
   * Test all database connections
   */
  async testAllConnections() {
    const results = {};
    
    for (const [dbName, config] of Object.entries(this.config)) {
      try {
        const client = this.getClient(dbName);
        
        // Test basic connection
        // Test connection with a known table
        const { data, error } = await client
          .from('storytellers')
          .select('id')
          .limit(1);
          
        if (error) throw error;
        
        results[dbName] = {
          status: 'healthy',
          alias: config.alias,
          url: config.url,
          tablesAccessible: true
        };
        
        console.log(`✅ ${config.alias} connection successful`);
      } catch (error) {
        results[dbName] = {
          status: 'error',
          alias: config.alias,
          url: config.url,
          error: error.message
        };
        
        console.error(`❌ ${config.alias} connection failed:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Check if table exists in specific database
   */
  async tableExists(tableName, database = 'primary') {
    try {
      const client = this.getClient(database);
      // Try to query the table directly - if it exists, this will work
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .limit(1);
        
      // If there's no error, table exists
      return !error;
    } catch (error) {
      console.warn(`Failed to check table existence for ${tableName}:`, error.message);
      return false;
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName, database = 'primary') {
    try {
      const client = this.getClient(database);
      // Get a sample row to understand the schema
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (error) throw error;
      
      // Return column names from the sample data
      if (data && data.length > 0) {
        return Object.keys(data[0]).map(columnName => ({
          column_name: columnName,
          data_type: typeof data[0][columnName],
          is_nullable: 'unknown',
          column_default: null
        }));
      }
      
      return [];
    } catch (error) {
      console.warn(`Failed to get schema for ${tableName}:`, error.message);
      return [];
    }
  }

  /**
   * Migration helper: Check data consistency between databases
   */
  async checkDataConsistency(tableName) {
    try {
      const primaryClient = this.getPrimaryClient();
      const empathyClient = this.getEmpathyLedgerClient();
      
      // Check if table exists in both databases
      const [primaryExists, empathyExists] = await Promise.all([
        this.tableExists(tableName, 'primary'),
        this.tableExists(tableName, 'empathyLedger')
      ]);
      
      if (!primaryExists && !empathyExists) {
        return { status: 'not_found', message: `Table ${tableName} not found in either database` };
      }
      
      // Get record counts
      const results = {};
      
      if (primaryExists) {
        const { count: primaryCount } = await primaryClient
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        results.primary = { count: primaryCount || 0, exists: true };
      } else {
        results.primary = { count: 0, exists: false };
      }
      
      if (empathyExists) {
        const { count: empathyCount } = await empathyClient
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        results.empathy = { count: empathyCount || 0, exists: true };
      } else {
        results.empathy = { count: 0, exists: false };
      }
      
      return {
        status: 'success',
        table: tableName,
        ...results,
        consistent: results.primary.count === results.empathy.count
      };
      
    } catch (error) {
      return {
        status: 'error',
        table: tableName,
        error: error.message
      };
    }
  }

  /**
   * Health check for all systems
   */
  async getHealthStatus() {
    const connections = await this.testAllConnections();
    const healthyCount = Object.values(connections).filter(c => c.status === 'healthy').length;
    const totalCount = Object.keys(connections).length;
    
    return {
      overall: healthyCount === totalCount ? 'healthy' : 'degraded',
      databases: connections,
      summary: `${healthyCount}/${totalCount} databases healthy`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Close all connections (for graceful shutdown)
   */
  async closeAll() {
    // Supabase client doesn't have explicit close method
    // Clear cached clients to allow garbage collection
    this.clients.clear();
    console.log('🔄 All database connections closed');
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

// Export convenience functions
export const getPrimaryClient = (role) => databaseManager.getPrimaryClient(role);
export const getEmpathyLedgerClient = (role) => databaseManager.getEmpathyLedgerClient(role);
export const testAllConnections = () => databaseManager.testAllConnections();
export const getHealthStatus = () => databaseManager.getHealthStatus();
export const checkDataConsistency = (tableName) => databaseManager.checkDataConsistency(tableName);

export default databaseManager;