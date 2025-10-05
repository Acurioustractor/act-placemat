/**
 * PostgreSQL Data Source Service with Field-Level Encryption
 * Handles PostgreSQL operations via Supabase client with automatic encryption/decryption
 */

import { createClient } from '@supabase/supabase-js';
import {
  encryptObjectSensitiveFields,
  decryptObjectSensitiveFields,
  isSensitiveField,
  DATA_CLASSIFICATION,
} from '../encryptionService.js';

class PostgreSQLDataSource {
  constructor() {
    this.supabase = null;
    this.isConnected = false;
    this.encryptionEnabled = process.env.NODE_ENV !== 'test'; // Disable encryption in tests
    this.sensitiveTableFields = {
      // Define which fields should be encrypted for each table
      users: ['email', 'phone', 'address', 'password_hash', 'api_keys'],
      user_profiles: ['bio', 'contact_info', 'personal_details'],
      stories: ['author_contact', 'sensitive_content'],
      organisations: ['contact_email', 'phone', 'address'],
      opportunities: ['contact_details', 'application_data'],
      transactions: ['account_details', 'payment_info', 'customer_data'],
    };
  }

  async initialize() {
    try {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Test connection
      const { data, error } = await this.supabase.from('stories').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      this.isConnected = true;
      return this.supabase;
    } catch (error) {
      console.error('PostgreSQL initialization failed:', error);
      throw error;
    }
  }

  getClient() {
    return this.supabase;
  }

  /**
   * Encrypt sensitive fields in data before storage
   */
  async encryptSensitiveData(table, data) {
    if (!this.encryptionEnabled || !data) {
      return data;
    }

    const forceEncrypt = this.sensitiveTableFields[table] || [];

    try {
      return await encryptObjectSensitiveFields(data, {
        encryptionKey: `${table}_data`,
        forceEncrypt,
      });
    } catch (error) {
      console.warn(`⚠️ Failed to encrypt data for table ${table}:`, error.message);
      return data; // Return original data if encryption fails
    }
  }

  /**
   * Decrypt sensitive fields in data after retrieval
   */
  async decryptSensitiveData(data) {
    if (!this.encryptionEnabled || !data) {
      return data;
    }

    try {
      // Handle both single objects and arrays
      if (Array.isArray(data)) {
        return Promise.all(data.map(item => decryptObjectSensitiveFields(item)));
      } else {
        return await decryptObjectSensitiveFields(data);
      }
    } catch (error) {
      console.warn('⚠️ Failed to decrypt data:', error.message);
      return data; // Return original data if decryption fails
    }
  }

  async query(table, options = {}) {
    if (!this.supabase) {
      throw new Error('PostgreSQL client not initialized');
    }

    try {
      let query = this.supabase.from(table);

      // Apply select fields
      if (options.select) {
        query = query.select(options.select);
      } else {
        query = query.select('*');
      }

      // Apply filters
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.in) {
        Object.entries(options.in).forEach(([key, values]) => {
          query = query.in(key, values);
        });
      }

      if (options.gte) {
        Object.entries(options.gte).forEach(([key, value]) => {
          query = query.gte(key, value);
        });
      }

      if (options.lte) {
        Object.entries(options.lte).forEach(([key, value]) => {
          query = query.lte(key, value);
        });
      }

      if (options.ilike) {
        Object.entries(options.ilike).forEach(([key, value]) => {
          query = query.ilike(key, value);
        });
      }

      if (options.textSearch) {
        query = query.textSearch(options.textSearch.column, options.textSearch.query);
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending !== false,
        });
      }

      // Apply pagination
      if (options.range) {
        query = query.range(options.range.from, options.range.to);
      } else if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Decrypt sensitive fields in retrieved data
      const decryptedData = await this.decryptSensitiveData(data);

      return decryptedData;
    } catch (error) {
      console.error('PostgreSQL query error:', error);
      throw error;
    }
  }

  async insert(table, data, options = {}) {
    if (!this.supabase) {
      throw new Error('PostgreSQL client not initialized');
    }

    try {
      // Encrypt sensitive fields before insertion
      const encryptedData = await this.encryptSensitiveData(table, data);

      let query = this.supabase.from(table).insert(encryptedData);

      if (options.returning) {
        query = query.select(options.returning);
      }

      const { data: result, error } = await query;

      if (error) {
        throw error;
      }

      // Decrypt returned data
      const decryptedResult = await this.decryptSensitiveData(result);

      return decryptedResult;
    } catch (error) {
      console.error('PostgreSQL insert error:', error);
      throw error;
    }
  }

  async update(table, data, filters, options = {}) {
    if (!this.supabase) {
      throw new Error('PostgreSQL client not initialized');
    }

    try {
      // Encrypt sensitive fields before update
      const encryptedData = await this.encryptSensitiveData(table, data);

      let query = this.supabase.from(table).update(encryptedData);

      // Apply filters
      if (filters.eq) {
        Object.entries(filters.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options.returning) {
        query = query.select(options.returning);
      }

      const { data: result, error } = await query;

      if (error) {
        throw error;
      }

      // Decrypt returned data
      const decryptedResult = await this.decryptSensitiveData(result);

      return decryptedResult;
    } catch (error) {
      console.error('PostgreSQL update error:', error);
      throw error;
    }
  }

  async delete(table, filters) {
    if (!this.supabase) {
      throw new Error('PostgreSQL client not initialized');
    }

    try {
      let query = this.supabase.from(table).delete();

      // Apply filters
      if (filters.eq) {
        Object.entries(filters.eq).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('PostgreSQL delete error:', error);
      throw error;
    }
  }

  async rpc(functionName, params = {}) {
    if (!this.supabase) {
      throw new Error('PostgreSQL client not initialized');
    }

    try {
      const { data, error } = await this.supabase.rpc(functionName, params);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('PostgreSQL RPC error:', error);
      throw error;
    }
  }

  // Cultural safety aware queries
  async queryWithCulturalSafety(table, options = {}) {
    const minCulturalSafety = options.minCulturalSafety || 80;

    return this.query(table, {
      ...options,
      gte: {
        ...options.gte,
        cultural_safety_score: minCulturalSafety,
      },
    });
  }

  // Paginated query with count
  async queryWithCount(table, options = {}) {
    const { data, count, error } = await this.supabase
      .from(table)
      .select('*', { count: 'exact' })
      .range(options.from || 0, options.to || 49);

    if (error) {
      throw error;
    }

    // Decrypt sensitive fields in retrieved data
    const decryptedData = await this.decryptSensitiveData(data);

    return { data: decryptedData, count };
  }

  async healthCheck() {
    try {
      const { data, error } = await this.supabase.from('stories').select('id').limit(1);

      return {
        status: error ? 'unhealthy' : 'healthy',
        connected: !error,
        error: error?.message,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
      };
    }
  }
}

export default PostgreSQLDataSource;
