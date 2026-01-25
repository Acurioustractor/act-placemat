/**
 * Test Database Helper
 *
 * Utilities for creating mock database responses and testing database interactions
 */
import { vi } from 'vitest';

/**
 * Creates a mock Supabase client for testing
 * @param {Object} options - Mock configuration options
 * @returns {Object} Mock Supabase client
 */
export function createMockSupabaseClient(options = {}) {
  const {
    tables = ['linkedin_contacts', 'person_identity_map', 'project_contact_matches', 'contact_communications'],
    error = null,
    data = []
  } = options;

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn().mockResolvedValue({ data, error }),
  };

  const mockFrom = vi.fn((tableName) => {
    if (tables.includes(tableName)) {
      return mockQueryBuilder;
    }
    return {
      ...mockQueryBuilder,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Row not found' } }),
    };
  });

  return {
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data, error }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
  };
}

/**
 * Creates a mock Supabase response for single record
 * @param {Object} data - The record data
 * @param {Error|null} error - Optional error
 * @returns {Object} Mock response
 */
export function createMockSingleResponse(data, error = null) {
  return { data, error, count: error ? null : 1 };
}

/**
 * Creates a mock Supabase response for collection
 * @param {Array} data - Array of records
 * @param {number} count - Total count
 * @param {Error|null} error - Optional error
 * @returns {Object} Mock response
 */
export function createMockCollectionResponse(data, count, error = null) {
  return { data, error, count };
}

/**
 * Creates a paginated mock response
 * @param {Array} data - Array of records for current page
 * @param {number} total - Total records
 * @param {number} limit - Page limit
 * @param {number} offset - Page offset
 * @returns {Object} Paginated response
 */
export function createMockPaginatedResponse(data, total, limit, offset) {
  return {
    data,
    error: null,
    count: total,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * Mock database helper for integration tests
 */
export class MockDatabaseHelper {
  constructor() {
    this.tables = {};
    this.queries = [];
  }

  /**
   * Register a table with mock data
   * @param {string} tableName - Table name
   * @param {Array} records - Initial records
   */
  registerTable(tableName, records = []) {
    this.tables[tableName] = [...records];
  }

  /**
   * Get mock client for Supabase
   */
  getClient() {
    return createMockSupabaseClient({ tables: Object.keys(this.tables) });
  }

  /**
   * Reset all tables
   */
  reset() {
    Object.keys(this.tables).forEach(key => {
      this.tables[key] = [];
    });
    this.queries = [];
  }

  /**
   * Seed tables with test data
   * @param {Object} seedData - Object with table names as keys and arrays as values
   */
  seed(seedData) {
    Object.entries(seedData).forEach(([tableName, records]) => {
      this.registerTable(tableName, records);
    });
  }
}

export const mockDbHelper = new MockDatabaseHelper();
