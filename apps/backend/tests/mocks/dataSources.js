/**
 * Mock Data Sources for Testing
 * Provides in-memory mock implementations of PostgreSQL, Redis, and Neo4j
 */

// Mock PostgreSQL Data Source
class MockPostgreSQLDataSource {
  constructor() {
    this.data = new Map(); // Table -> Array of records
    this.isConnected = true;
    this.initializeTables();
  }

  initializeTables() {
    // Initialize with empty tables
    this.data.set('users', []);
    this.data.set('user_profiles', []);
    this.data.set('projects', []);
    this.data.set('stories', []);
    this.data.set('events', []);
    this.data.set('organisations', []);
    this.data.set('opportunities', []);
    this.data.set('transactions', []);
  }

  async initialize() {
    this.isConnected = true;
    return this;
  }

  getClient() {
    return this;
  }

  async query(table, options = {}) {
    const records = this.data.get(table) || [];
    let result = [...records];

    // Apply filters
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        result = result.filter(record => record[key] === value);
      });
    }

    if (options.gte) {
      Object.entries(options.gte).forEach(([key, value]) => {
        result = result.filter(record => record[key] >= value);
      });
    }

    if (options.ilike) {
      Object.entries(options.ilike).forEach(([key, pattern]) => {
        const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
        result = result.filter(record => regex.test(record[key] || ''));
      });
    }

    // Apply ordering
    if (options.orderBy) {
      const { column, ascending = true } = options.orderBy;
      result.sort((a, b) => {
        const aVal = a[column];
        const bVal = b[column];
        if (aVal === bVal) return 0;
        const comparison = aVal < bVal ? -1 : 1;
        return ascending ? comparison : -comparison;
      });
    }

    // Apply limit
    if (options.limit) {
      result = result.slice(0, options.limit);
    }

    // Apply range
    if (options.range) {
      result = result.slice(options.range.from, options.range.to + 1);
    }

    return result;
  }

  async insert(table, data, options = {}) {
    const records = this.data.get(table) || [];
    const newRecord = {
      id: `test-${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data,
    };

    records.push(newRecord);
    this.data.set(table, records);

    return [newRecord];
  }

  async update(table, data, filters, options = {}) {
    const records = this.data.get(table) || [];
    const updatedRecords = [];

    for (const record of records) {
      let matches = true;

      if (filters.eq) {
        Object.entries(filters.eq).forEach(([key, value]) => {
          if (record[key] !== value) matches = false;
        });
      }

      if (matches) {
        Object.assign(record, data, {
          updated_at: new Date().toISOString(),
        });
        updatedRecords.push(record);
      }
    }

    return updatedRecords;
  }

  async delete(table, filters) {
    const records = this.data.get(table) || [];
    const remainingRecords = [];

    for (const record of records) {
      let matches = true;

      if (filters.eq) {
        Object.entries(filters.eq).forEach(([key, value]) => {
          if (record[key] !== value) matches = false;
        });
      }

      if (!matches) {
        remainingRecords.push(record);
      }
    }

    this.data.set(table, remainingRecords);
    return true;
  }

  async healthCheck() {
    return {
      status: 'healthy',
      connected: this.isConnected,
      error: null,
    };
  }

  async clearMockData() {
    this.initializeTables();
  }
}

// Mock Redis Data Source
class MockRedisDataSource {
  constructor() {
    this.data = new Map(); // Key -> Value
    this.expiry = new Map(); // Key -> Expiry timestamp
    this.isConnected = true;
  }

  async initialize() {
    this.isConnected = true;
    return this;
  }

  getClient() {
    return this;
  }

  async set(key, value, ttl = null) {
    this.data.set(key, JSON.stringify(value));

    if (ttl) {
      this.expiry.set(key, Date.now() + ttl * 1000);
    } else {
      this.expiry.delete(key);
    }

    return true;
  }

  async get(key) {
    // Check expiry
    if (this.expiry.has(key) && Date.now() > this.expiry.get(key)) {
      this.data.delete(key);
      this.expiry.delete(key);
      return null;
    }

    const value = this.data.get(key);
    if (value === undefined) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async del(key) {
    const existed = this.data.has(key);
    this.data.delete(key);
    this.expiry.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key) {
    return this.data.has(key) ? 1 : 0;
  }

  async expire(key, seconds) {
    if (this.data.has(key)) {
      this.expiry.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async keys(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async flushCache() {
    this.data.clear();
    this.expiry.clear();
    return 'OK';
  }

  async cacheUserSession(userId, sessionData, ttl) {
    return this.set(`session:${userId}`, sessionData, ttl);
  }

  async getUserSession(userId) {
    return this.get(`session:${userId}`);
  }

  async trackUserActivity(userId, activity) {
    const key = `activity:${userId}`;
    const activities = (await this.get(key)) || [];
    const activityWithTimestamp = { ...activity, timestamp: Date.now() };

    activities.unshift(activityWithTimestamp);

    // Keep only last 100 activities
    if (activities.length > 100) {
      activities.splice(100);
    }

    await this.set(key, activities);
  }

  async getUserActivity(userId, limit = 20) {
    const activities = (await this.get(`activity:${userId}`)) || [];
    return activities.slice(0, limit);
  }

  async rateLimitCheck(identifier, limit, windowSeconds) {
    const key = `ratelimit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

    const current = (await this.get(key)) || 0;
    const newCount = current + 1;

    await this.set(key, newCount, windowSeconds);

    return {
      allowed: newCount <= limit,
      count: newCount,
      remaining: Math.max(0, limit - newCount),
      resetTime: Math.ceil(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000,
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      connected: this.isConnected,
      error: null,
    };
  }

  async clearMockData() {
    this.data.clear();
    this.expiry.clear();
  }
}

// Mock Neo4j Data Source
class MockNeo4jDataSource {
  constructor() {
    this.nodes = new Map(); // ID -> Node
    this.relationships = []; // Array of relationships
    this.isConnected = true;
  }

  async initialize() {
    this.isConnected = true;
    return this;
  }

  getDriver() {
    return this;
  }

  async runQuery(cypher, parameters = {}) {
    // Mock implementation - return empty results for most queries
    // In a real test environment, you might want more sophisticated mocking
    return [];
  }

  async createUser(userData) {
    const user = {
      id: userData.id,
      labels: ['User'],
      properties: {
        ...userData,
        createdAt: new Date().toISOString(),
      },
    };

    this.nodes.set(userData.id, user);
    return user.properties;
  }

  async createProject(projectData) {
    const project = {
      id: projectData.id,
      labels: ['Project'],
      properties: {
        ...projectData,
        createdAt: new Date().toISOString(),
      },
    };

    this.nodes.set(projectData.id, project);
    return project.properties;
  }

  async createRelationship(
    fromId,
    fromLabel,
    toId,
    toLabel,
    relationshipType,
    properties = {}
  ) {
    const relationship = {
      id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromId,
      toId,
      type: relationshipType,
      properties: {
        ...properties,
        createdAt: new Date().toISOString(),
      },
    };

    this.relationships.push(relationship);
    return relationship.properties;
  }

  async findUserCollaborations(userId) {
    return this.relationships
      .filter(rel => rel.fromId === userId || rel.toId === userId)
      .map(rel => ({
        user: this.nodes.get(userId)?.properties || {},
        relationship: {
          type: rel.type,
          properties: rel.properties,
        },
        target:
          this.nodes.get(rel.fromId === userId ? rel.toId : rel.fromId)?.properties ||
          {},
      }));
  }

  async calculateNetworkMetrics(nodeId, nodeLabel) {
    const nodeRelationships = this.relationships.filter(
      rel => rel.fromId === nodeId || rel.toId === nodeId
    );

    return {
      nodeId,
      degree: nodeRelationships.length,
      totalRelationships: nodeRelationships.length,
      relationshipTypes: [...new Set(nodeRelationships.map(rel => rel.type))],
      clusteringCoefficient: 0, // Simplified mock
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      connected: this.isConnected,
      error: null,
    };
  }

  async close() {
    this.isConnected = false;
  }

  async clearMockData() {
    this.nodes.clear();
    this.relationships = [];
  }
}

// Factory function to create mock data sources
export function createMockDataSources() {
  const postgres = new MockPostgreSQLDataSource();
  const redis = new MockRedisDataSource();
  const neo4j = new MockNeo4jDataSource();

  return {
    supabase: postgres, // Keep compatibility
    postgres,
    redis,
    neo4j,
  };
}

export { MockPostgreSQLDataSource, MockRedisDataSource, MockNeo4jDataSource };
