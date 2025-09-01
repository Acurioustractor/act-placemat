/**
 * ACT Platform - Base Database Connector
 *
 * Standardized base class for all database integrations.
 * Provides common database operations and transaction management.
 */

import { BaseConnector } from './BaseConnector.js';
import type {
  DatabaseConnectorInterface,
  ConnectionInfo,
} from '../types/integrationTypes.js';

export abstract class BaseDatabaseConnector
  extends BaseConnector
  implements DatabaseConnectorInterface
{
  protected transactionActive: boolean = false;
  protected queryCount: number = 0;
  protected connectionPool?: {
    active: number;
    idle: number;
    max: number;
  };

  constructor(name: string, config: any = {}) {
    super(name, config);

    // Set default database configuration
    this.config = {
      maxConnections: 10,
      queryTimeout: 30000, // 30 seconds
      idleTimeout: 300000, // 5 minutes
      ...config,
    };
  }

  // Abstract methods that must be implemented by specific database connectors
  abstract query(sql: string, params?: any[]): Promise<any>;
  abstract execute(sql: string, params?: any[]): Promise<any>;

  // Optional transaction methods - implement if database supports transactions
  async beginTransaction(): Promise<void> {
    if (this.transactionActive) {
      throw new Error('Transaction already active');
    }

    await this.executeTransaction('BEGIN');
    this.transactionActive = true;
    this.emitEvent('transaction-started', { timestamp: new Date() });
  }

  async commitTransaction(): Promise<void> {
    if (!this.transactionActive) {
      throw new Error('No active transaction to commit');
    }

    try {
      await this.executeTransaction('COMMIT');
      this.transactionActive = false;
      this.emitEvent('transaction-committed', { timestamp: new Date() });
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.transactionActive) {
      throw new Error('No active transaction to rollback');
    }

    try {
      await this.executeTransaction('ROLLBACK');
    } finally {
      this.transactionActive = false;
      this.emitEvent('transaction-rolled-back', { timestamp: new Date() });
    }
  }

  // Helper method for transaction commands - implement in concrete classes
  protected abstract executeTransaction(command: string): Promise<void>;

  // CRUD operations with standard interface
  async insert(table: string, data: any): Promise<any> {
    this.validateTableName(table);
    this.updateLastActivity();

    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    return await this.retry(() => this.query(sql, values), `insert into ${table}`);
  }

  async update(table: string, data: any, where: any): Promise<any> {
    this.validateTableName(table);
    this.updateLastActivity();

    const setClause = Object.keys(data)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    const whereClause = Object.keys(where)
      .map((key, index) => `${key} = $${index + Object.keys(data).length + 1}`)
      .join(' AND ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const params = [...Object.values(data), ...Object.values(where)];

    return await this.retry(() => this.query(sql, params), `update ${table}`);
  }

  async delete(table: string, where: any): Promise<any> {
    this.validateTableName(table);
    this.updateLastActivity();

    const whereClause = Object.keys(where)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    const sql = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
    const params = Object.values(where);

    return await this.retry(() => this.query(sql, params), `delete from ${table}`);
  }

  async select(table: string, fields: string[] = ['*'], where?: any): Promise<any> {
    this.validateTableName(table);
    this.updateLastActivity();

    const selectFields = fields.join(', ');
    let sql = `SELECT ${selectFields} FROM ${table}`;
    let params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params = Object.values(where);
    }

    return await this.retry(() => this.query(sql, params), `select from ${table}`);
  }

  // Schema operations
  async createTable(tableName: string, schema: any): Promise<void> {
    this.validateTableName(tableName);

    if (!schema || typeof schema !== 'object') {
      throw new Error('Schema must be a valid object');
    }

    // This is a basic implementation - override in specific connectors for better schema handling
    const columns = Object.entries(schema)
      .map(([name, type]) => `${name} ${type}`)
      .join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;

    await this.retry(() => this.execute(sql), `create table ${tableName}`);

    this.emitEvent('table-created', { table: tableName, schema });
  }

  async dropTable(tableName: string): Promise<void> {
    this.validateTableName(tableName);

    const sql = `DROP TABLE IF EXISTS ${tableName}`;

    await this.retry(() => this.execute(sql), `drop table ${tableName}`);

    this.emitEvent('table-dropped', { table: tableName });
  }

  // Connection info with database-specific details
  getConnectionInfo(): ConnectionInfo {
    const baseInfo = super.getConnectionInfo();
    return {
      ...baseInfo,
      database: this.config.database,
      schema: this.config.schema,
      connectionPool: this.connectionPool,
    };
  }

  // Query execution with metrics
  protected async executeQuery(sql: string, params?: any[]): Promise<any> {
    const startTime = Date.now();
    this.queryCount++;

    try {
      const result = await this.query(sql, params);
      const duration = Date.now() - startTime;

      this.emitEvent('query-executed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        duration,
        rowCount: Array.isArray(result) ? result.length : result?.rowCount || 0,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.emitEvent('query-failed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        duration,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  // Validation helpers
  protected validateTableName(tableName: string): void {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Table name must be a non-empty string');
    }

    // Basic SQL injection protection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Invalid table name format');
    }
  }

  // Transaction helper for consistent error handling
  async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    await this.beginTransaction();

    try {
      const result = await operation();
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  // Get database statistics
  getStats() {
    return {
      queryCount: this.queryCount,
      transactionActive: this.transactionActive,
      connectionPool: this.connectionPool,
      lastActivity: this.connectionInfo.lastActivity,
    };
  }

  // Reset statistics (useful for testing)
  resetStats(): void {
    this.queryCount = 0;
  }
}
