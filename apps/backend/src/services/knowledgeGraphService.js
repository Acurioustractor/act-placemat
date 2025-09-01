/**
 * Knowledge Graph Service
 * Neo4j v5 connection and query service for ACT Community relationships
 */

import neo4j from 'neo4j-driver';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class KnowledgeGraphService {
  constructor() {
    this.driver = null;
    this.session = null;
    this.isConnected = false;
    this.connectionString = process.env.NEO4J_URI || 'bolt://localhost:7687';
    this.username = process.env.NEO4J_USERNAME || 'neo4j';
    this.password = process.env.NEO4J_PASSWORD || 'actneo4jpassword';
    this.database = process.env.NEO4J_DATABASE || 'neo4j';
    
    // Connection configuration
    this.config = {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      disableLosslessIntegers: true,
      logging: {
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        logger: (level, message) => console.log(`[Neo4j ${level.toUpperCase()}]: ${message}`)
      }
    };
  }

  /**
   * Initialize connection to Neo4j database
   */
  async initialize() {
    try {
      console.log('🔗 Connecting to Neo4j knowledge graph...');
      
      // Create driver with authentication
      this.driver = neo4j.driver(
        this.connectionString,
        neo4j.auth.basic(this.username, this.password),
        this.config
      );

      // Test connection
      const session = this.driver.session({ database: this.database });
      await session.run('RETURN 1 as test');
      await session.close();

      this.isConnected = true;
      console.log('✅ Neo4j knowledge graph connected');

      // Initialize schema if needed
      await this.initializeSchema();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Neo4j:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get a new session for database operations
   */
  getSession(mode = 'READ') {
    if (!this.driver || !this.isConnected) {
      throw new Error('Neo4j driver not initialized. Call initialize() first.');
    }

    const sessionMode = mode === 'WRITE' ? neo4j.session.WRITE : neo4j.session.READ;
    return this.driver.session({ 
      database: this.database,
      defaultAccessMode: sessionMode
    });
  }

  /**
   * Execute a read query
   */
  async executeRead(query, parameters = {}) {
    const session = this.getSession('READ');
    try {
      const result = await session.run(query, parameters);
      return {
        success: true,
        records: result.records.map(record => record.toObject()),
        summary: result.summary
      };
    } catch (error) {
      console.error('❌ Neo4j read query failed:', error.message);
      return {
        success: false,
        error: error.message,
        records: []
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Execute a write query
   */
  async executeWrite(query, parameters = {}) {
    const session = this.getSession('WRITE');
    try {
      const result = await session.run(query, parameters);
      return {
        success: true,
        records: result.records.map(record => record.toObject()),
        summary: result.summary
      };
    } catch (error) {
      console.error('❌ Neo4j write query failed:', error.message);
      return {
        success: false,
        error: error.message,
        records: []
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction(queries) {
    const session = this.getSession('WRITE');
    const tx = session.beginTransaction();
    
    try {
      const results = [];
      
      for (const { query, parameters = {} } of queries) {
        const result = await tx.run(query, parameters);
        results.push({
          success: true,
          records: result.records.map(record => record.toObject()),
          summary: result.summary
        });
      }
      
      await tx.commit();
      return {
        success: true,
        results,
        transactionCommitted: true
      };
    } catch (error) {
      await tx.rollback();
      console.error('❌ Neo4j transaction failed:', error.message);
      return {
        success: false,
        error: error.message,
        results: [],
        transactionRolledBack: true
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Initialize database schema and constraints
   */
  async initializeSchema() {
    try {
      console.log('🏗️ Initializing Neo4j knowledge graph schema...');
      
      // Load schema from file
      const schemaPath = join(__dirname, '../database/neo4j-knowledge-graph-schema.cypher');
      if (!existsSync(schemaPath)) {
        console.warn('⚠️ Schema file not found, skipping schema initialization');
        return false;
      }

      const schemaContent = readFileSync(schemaPath, 'utf8');
      const statements = schemaContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('//') && !stmt.startsWith('--'));

      console.log(`📋 Executing ${statements.length} schema statements...`);
      
      // Execute schema statements
      for (const statement of statements) {
        if (statement.startsWith(':schema') || statement.includes('CREATE')) {
          try {
            await this.executeWrite(statement);
          } catch (error) {
            // Ignore constraint already exists errors
            if (!error.message.includes('already exists')) {
              console.warn(`⚠️ Schema statement failed: ${error.message}`);
            }
          }
        }
      }

      console.log('✅ Knowledge graph schema initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize schema:', error.message);
      return false;
    }
  }

  /**
   * Health check for Neo4j connection
   */
  async checkHealth() {
    try {
      if (!this.isConnected || !this.driver) {
        return {
          healthy: false,
          error: 'Not connected to Neo4j'
        };
      }

      const result = await this.executeRead('RETURN 1 as health_check');
      
      if (result.success) {
        const serverInfo = this.driver.session().lastBookmark();
        return {
          healthy: true,
          connected: true,
          database: this.database,
          connection_string: this.connectionString.replace(/\/\/.*:.*@/, '//***:***@'),
          server_info: serverInfo || 'Available'
        };
      } else {
        return {
          healthy: false,
          connected: false,
          error: result.error
        };
      }
    } catch (error) {
      return {
        healthy: false,
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    try {
      const queries = [
        { name: 'node_count', query: 'MATCH (n) RETURN count(n) as count' },
        { name: 'relationship_count', query: 'MATCH ()-[r]->() RETURN count(r) as count' },
        { name: 'user_count', query: 'MATCH (u:User) RETURN count(u) as count' },
        { name: 'project_count', query: 'MATCH (p:Project) RETURN count(p) as count' },
        { name: 'skill_count', query: 'MATCH (s:Skill) RETURN count(s) as count' },
        { name: 'interest_count', query: 'MATCH (i:Interest) RETURN count(i) as count' },
        { name: 'outcome_count', query: 'MATCH (o:Outcome) RETURN count(o) as count' }
      ];

      const stats = {};
      for (const { name, query } of queries) {
        const result = await this.executeRead(query);
        if (result.success && result.records.length > 0) {
          stats[name] = result.records[0].count;
        } else {
          stats[name] = 0;
        }
      }

      return {
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to get Neo4j statistics:', error.message);
      return {
        success: false,
        error: error.message,
        statistics: {}
      };
    }
  }

  /**
   * Sync user data from PostgreSQL to Neo4j
   */
  async syncUser(userData) {
    try {
      const query = `
        MERGE (u:User {user_id: $user_id})
        SET u.email = $email,
            u.display_name = $display_name,
            u.account_status = $account_status,
            u.created_at = $created_at,
            u.last_active_at = $last_active_at,
            u.location = $location,
            u.onboarding_completed = $onboarding_completed,
            u.updated_at = timestamp()
        RETURN u
      `;

      const parameters = {
        user_id: userData.user_id,
        email: userData.email || '',
        display_name: userData.display_name || '',
        account_status: userData.account_status || 'active',
        created_at: userData.created_at || new Date().toISOString(),
        last_active_at: userData.last_active_at || null,
        location: userData.location ? JSON.stringify(userData.location) : null,
        onboarding_completed: userData.onboarding_completed || false
      };

      const result = await this.executeWrite(query, parameters);
      
      if (result.success) {
        // Sync interests and skills if provided
        if (userData.interests && userData.interests.length > 0) {
          await this.syncUserInterests(userData.user_id, userData.interests);
        }
        
        if (userData.expertise_areas && userData.expertise_areas.length > 0) {
          await this.syncUserSkills(userData.user_id, userData.expertise_areas);
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to sync user:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync user interests
   */
  async syncUserInterests(userId, interests) {
    const queries = interests.map(interest => ({
      query: `
        MERGE (i:Interest {name: $interest_name})
        WITH i
        MATCH (u:User {user_id: $user_id})
        MERGE (u)-[r:INTERESTED_IN]->(i)
        SET r.interest_level = "medium",
            r.since_date = coalesce(r.since_date, date()),
            r.updated_at = timestamp()
        RETURN u, r, i
      `,
      parameters: {
        user_id: userId,
        interest_name: interest.toLowerCase()
      }
    }));

    return await this.executeTransaction(queries);
  }

  /**
   * Sync user skills
   */
  async syncUserSkills(userId, skills) {
    const queries = skills.map(skill => ({
      query: `
        MERGE (s:Skill {name: $skill_name})
        SET s.category = "expertise"
        WITH s
        MATCH (u:User {user_id: $user_id})
        MERGE (u)-[r:HAS_SKILL]->(s)
        SET r.proficiency_level = "intermediate",
            r.verified_by = "self_reported",
            r.acquired_date = coalesce(r.acquired_date, date()),
            r.updated_at = timestamp()
        RETURN u, r, s
      `,
      parameters: {
        user_id: userId,
        skill_name: skill.toLowerCase()
      }
    }));

    return await this.executeTransaction(queries);
  }

  /**
   * Find potential collaborators for a user
   */
  async findCollaborators(userId, limit = 10) {
    const query = `
      MATCH (u:User {user_id: $user_id})-[:INTERESTED_IN]->(i:Interest)<-[:INTERESTED_IN]-(collaborator:User)
      WHERE collaborator.user_id <> $user_id
      WITH collaborator, count(i) as shared_interests
      
      OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)<-[:WANTS_TO_LEARN]-(collaborator)
      WITH collaborator, shared_interests, count(s) as skill_teaching_potential
      
      OPTIONAL MATCH (u)-[:WANTS_TO_LEARN]->(s2:Skill)<-[:HAS_SKILL]-(collaborator)
      WITH collaborator, shared_interests, skill_teaching_potential, count(s2) as skill_learning_potential
      
      WITH collaborator, 
           (shared_interests * 2 + skill_teaching_potential * 3 + skill_learning_potential * 3) as collaboration_score
      WHERE collaboration_score > 0
      
      RETURN collaborator.user_id as user_id,
             collaborator.display_name as display_name,
             collaborator.location as location,
             shared_interests,
             skill_teaching_potential,
             skill_learning_potential,
             collaboration_score
      ORDER BY collaboration_score DESC
      LIMIT $limit
    `;

    return await this.executeRead(query, { user_id: userId, limit });
  }

  /**
   * Get project recommendations for a user
   */
  async getProjectRecommendations(userId, limit = 5) {
    const query = `
      MATCH (u:User {user_id: $user_id})-[:INTERESTED_IN]->(i:Interest)<-[:ADDRESSES_INTEREST]-(p:Project)
      WHERE p.status IN ['active', 'seed']
      WITH p, count(i) as interest_alignment
      
      OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(p)
      WITH p, interest_alignment, count(s) as skill_match
      
      WITH p, (interest_alignment * 2 + skill_match * 3) as recommendation_score
      WHERE recommendation_score > 0
      
      RETURN p.project_id as project_id,
             p.name as project_name,
             p.status as project_status,
             p.summary as project_summary,
             interest_alignment,
             skill_match,
             recommendation_score
      ORDER BY recommendation_score DESC
      LIMIT $limit
    `;

    return await this.executeRead(query, { user_id: userId, limit });
  }

  /**
   * Close all connections
   */
  async close() {
    try {
      if (this.session) {
        await this.session.close();
        this.session = null;
      }
      
      if (this.driver) {
        await this.driver.close();
        this.driver = null;
      }
      
      this.isConnected = false;
      console.log('✅ Neo4j knowledge graph connection closed');
    } catch (error) {
      console.error('❌ Error closing Neo4j connection:', error.message);
    }
  }
}

// Create singleton instance
const knowledgeGraphService = new KnowledgeGraphService();

export default knowledgeGraphService;