/**
 * Neo4j Data Source Service
 * Handles graph database operations for relationships and network analysis
 */

import neo4j from 'neo4j-driver';

class Neo4jDataSource {
  constructor() {
    this.driver = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      if (
        !process.env.NEO4J_URI ||
        !process.env.NEO4J_USER ||
        !process.env.NEO4J_PASSWORD
      ) {
        throw new Error('Neo4j configuration missing');
      }

      this.driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
      );

      // Test connection
      await this.verifyConnectivity();
      this.isConnected = true;
      return this.driver;
    } catch (error) {
      console.error('Neo4j initialization failed:', error);
      throw error;
    }
  }

  async verifyConnectivity() {
    const session = this.driver.session();
    try {
      await session.run('RETURN 1');
    } finally {
      await session.close();
    }
  }

  getDriver() {
    return this.driver;
  }

  async runQuery(cypher, parameters = {}) {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, parameters);
      return result.records.map(record => record.toObject());
    } catch (error) {
      console.error('Neo4j query error:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async writeTransaction(work) {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    try {
      return await session.writeTransaction(work);
    } catch (error) {
      console.error('Neo4j write transaction error:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async readTransaction(work) {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    try {
      return await session.readTransaction(work);
    } catch (error) {
      console.error('Neo4j read transaction error:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Graph-specific methods for ACT ecosystem

  async createUser(userData) {
    const cypher = `
      CREATE (u:User {
        id: $id,
        name: $name,
        email: $email,
        role: $role,
        culturalBackground: $culturalBackground,
        createdAt: datetime()
      })
      RETURN u
    `;

    return this.writeTransaction(async tx => {
      const result = await tx.run(cypher, userData);
      return result.records[0]?.get('u').properties;
    });
  }

  async createOrganisation(orgData) {
    const cypher = `
      CREATE (o:Organisation {
        id: $id,
        name: $name,
        type: $type,
        location: $location,
        culturalAlignment: $culturalAlignment,
        createdAt: datetime()
      })
      RETURN o
    `;

    return this.writeTransaction(async tx => {
      const result = await tx.run(cypher, orgData);
      return result.records[0]?.get('o').properties;
    });
  }

  async createProject(projectData) {
    const cypher = `
      CREATE (p:Project {
        id: $id,
        name: $name,
        description: $description,
        status: $status,
        culturalSafetyScore: $culturalSafetyScore,
        budget: $budget,
        createdAt: datetime()
      })
      RETURN p
    `;

    return this.writeTransaction(async tx => {
      const result = await tx.run(cypher, projectData);
      return result.records[0]?.get('p').properties;
    });
  }

  async createRelationship(
    fromId,
    fromLabel,
    toId,
    toLabel,
    relationshipType,
    properties = {}
  ) {
    const cypher = `
      MATCH (a:${fromLabel} {id: $fromId}), (b:${toLabel} {id: $toId})
      CREATE (a)-[r:${relationshipType} $properties]->(b)
      RETURN r
    `;

    return this.writeTransaction(async tx => {
      const result = await tx.run(cypher, { fromId, toId, properties });
      return result.records[0]?.get('r').properties;
    });
  }

  async findUserCollaborations(userId) {
    const cypher = `
      MATCH (u:User {id: $userId})-[r:COLLABORATES_WITH|PARTNERS_WITH|WORKS_ON]->(target)
      RETURN u, r, target
      ORDER BY r.createdAt DESC
      LIMIT 50
    `;

    return this.readTransaction(async tx => {
      const result = await tx.run(cypher, { userId });
      return result.records.map(record => ({
        user: record.get('u').properties,
        relationship: {
          type: record.get('r').type,
          properties: record.get('r').properties,
        },
        target: record.get('target').properties,
      }));
    });
  }

  async findOrganisationNetwork(orgId, depth = 2) {
    const cypher = `
      MATCH (o:Organisation {id: $orgId})-[*1..${depth}]-(connected)
      WHERE connected <> o
      RETURN DISTINCT connected, labels(connected) as nodeLabels
      LIMIT 100
    `;

    return this.readTransaction(async tx => {
      const result = await tx.run(cypher, { orgId });
      return result.records.map(record => ({
        node: record.get('connected').properties,
        labels: record.get('nodeLabels'),
      }));
    });
  }

  async findProjectStakeholders(projectId) {
    const cypher = `
      MATCH (p:Project {id: $projectId})<-[r]-(stakeholder)
      RETURN stakeholder, labels(stakeholder) as nodeLabels, r
      ORDER BY r.createdAt DESC
    `;

    return this.readTransaction(async tx => {
      const result = await tx.run(cypher, { projectId });
      return result.records.map(record => ({
        stakeholder: record.get('stakeholder').properties,
        labels: record.get('nodeLabels'),
        relationship: {
          type: record.get('r').type,
          properties: record.get('r').properties,
        },
      }));
    });
  }

  async findCulturalConnections(culturalBackground) {
    const cypher = `
      MATCH (n {culturalBackground: $culturalBackground})
      MATCH (n)-[r]-(connected)
      RETURN n, r, connected
      LIMIT 100
    `;

    return this.readTransaction(async tx => {
      const result = await tx.run(cypher, { culturalBackground });
      return result.records.map(record => ({
        source: record.get('n').properties,
        relationship: {
          type: record.get('r').type,
          properties: record.get('r').properties,
        },
        target: record.get('connected').properties,
      }));
    });
  }

  async calculateNetworkMetrics(nodeId, nodeLabel) {
    const cypher = `
      MATCH (n:${nodeLabel} {id: $nodeId})
      OPTIONAL MATCH (n)-[r]-(connected)
      WITH n, count(DISTINCT connected) as degree,
           count(DISTINCT r) as totalRelationships,
           collect(DISTINCT type(r)) as relationshipTypes
      
      // Calculate clustering coefficient
      OPTIONAL MATCH (n)-[]-(neighbor1)-[r2]-(neighbor2)-[]-(n)
      WHERE neighbor1 <> neighbor2
      WITH n, degree, totalRelationships, relationshipTypes,
           count(DISTINCT r2) as triangles
      
      RETURN {
        nodeId: n.id,
        degree: degree,
        totalRelationships: totalRelationships,
        relationshipTypes: relationshipTypes,
        clusteringCoefficient: CASE 
          WHEN degree > 1 THEN toFloat(triangles) / (degree * (degree - 1))
          ELSE 0.0 
        END
      } as metrics
    `;

    return this.readTransaction(async tx => {
      const result = await tx.run(cypher, { nodeId });
      return result.records[0]?.get('metrics');
    });
  }

  async findShortestPath(fromId, fromLabel, toId, toLabel, maxDepth = 6) {
    const cypher = `
      MATCH (start:${fromLabel} {id: $fromId}), (end:${toLabel} {id: $toId})
      MATCH path = shortestPath((start)-[*..${maxDepth}]-(end))
      RETURN path, length(path) as pathLength
    `;

    return this.readTransaction(async tx => {
      const result = await tx.run(cypher, { fromId, toId });
      if (result.records.length === 0) return null;

      const record = result.records[0];
      const path = record.get('path');
      const pathLength = record.get('pathLength');

      return {
        pathLength: pathLength.toNumber(),
        nodes: path.segments
          .flatMap((segment, index) =>
            index === 0 ? [segment.start, segment.end] : [segment.end]
          )
          .map(node => ({
            id: node.properties.id,
            labels: node.labels,
            properties: node.properties,
          })),
        relationships: path.segments.map(segment => ({
          type: segment.relationship.type,
          properties: segment.relationship.properties,
        })),
      };
    });
  }

  async getNetworkCommunities(algorithm = 'louvain') {
    // This would require Graph Data Science library in Neo4j
    const cypher = `
      CALL gds.${algorithm}.stream('ActEcosystem')
      YIELD nodeId, communityId
      RETURN gds.util.asNode(nodeId) as node, communityId
      ORDER BY communityId
    `;

    try {
      return this.readTransaction(async tx => {
        const result = await tx.run(cypher);
        return result.records.map(record => ({
          node: record.get('node').properties,
          communityId: record.get('communityId').toNumber(),
        }));
      });
    } catch (error) {
      console.warn('Community detection not available:', error.message);
      return [];
    }
  }

  async healthCheck() {
    try {
      await this.verifyConnectivity();
      return {
        status: 'healthy',
        connected: true,
        error: null,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
      };
    }
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
      this.isConnected = false;
    }
  }
}

export default Neo4jDataSource;
