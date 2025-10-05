/**
 * Knowledge Librarian Skill Pod - World-Class Graph Intelligence Engine
 * 
 * Philosophy: "Every connection tells a story, every pattern reveals possibility"
 * 
 * This sophisticated librarian orchestrates:
 * - Neo4j knowledge graph with semantic relationships
 * - Pattern recognition across 142+ entity connections
 * - Contextual memory and learning from interactions
 * - Predictive knowledge discovery
 * - Cultural knowledge preservation
 */

import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import neo4j from 'neo4j-driver';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

class KnowledgeLibrarian {
  constructor(agent) {
    this.agent = agent;
    this.name = 'Knowledge Librarian';
    
    // Initialize connections
    this.kafka = new Kafka({
      clientId: 'act-knowledge-librarian',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    
    this.producer = this.kafka.producer();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Neo4j for knowledge graph
    this.neo4j = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'actfarmhand2024'
      )
    );
    
    // Supabase for stories
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // OpenAI for semantic understanding
    this.openai = null;
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    // Knowledge domains and their relationships
    this.knowledgeDomains = this.initializeKnowledgeDomains();
    
    // Semantic relationship types
    this.relationshipTypes = this.initializeRelationshipTypes();
    
    // Query patterns and templates
    this.queryPatterns = this.initializeQueryPatterns();
    
    // Learning memory
    this.queryMemory = new Map();
    this.patternCache = new Map();
    
    console.log('📚 Knowledge Librarian initialized - Connecting all knowledge');
  }

  initializeKnowledgeDomains() {
    return {
      people: {
        entities: ['Person', 'Storyteller', 'Elder', 'Youth', 'Advocate'],
        attributes: ['skills', 'stories', 'connections', 'expertise', 'cultural_role'],
        relationships: ['KNOWS', 'MENTORS', 'COLLABORATES_WITH', 'ADVOCATES_FOR', 'LEARNS_FROM']
      },
      
      projects: {
        entities: ['Project', 'Initiative', 'Program', 'Campaign'],
        attributes: ['impact', 'budget', 'timeline', 'outcomes', 'community_benefit'],
        relationships: ['LEADS', 'FUNDS', 'IMPLEMENTS', 'BENEFITS_FROM', 'PRODUCES']
      },
      
      stories: {
        entities: ['Story', 'Testimony', 'CaseStudy', 'Narrative', 'Journey'],
        attributes: ['themes', 'emotions', 'impact', 'consent', 'cultural_significance'],
        relationships: ['TELLS', 'FEATURES_IN', 'INSPIRES', 'VALIDATES', 'CONNECTS_TO']
      },
      
      organizations: {
        entities: ['Organization', 'Partner', 'Funder', 'Community', 'Government'],
        attributes: ['mission', 'resources', 'reach', 'values', 'partnerships'],
        relationships: ['PARTNERS_WITH', 'FUNDS', 'SUPPORTS', 'ADVOCATES_FOR', 'SERVES']
      },
      
      opportunities: {
        entities: ['Opportunity', 'Grant', 'Partnership', 'Event', 'Policy'],
        attributes: ['deadline', 'amount', 'requirements', 'alignment', 'potential'],
        relationships: ['APPLIES_FOR', 'QUALIFIES_FOR', 'LEADS_TO', 'ENABLES', 'REQUIRES']
      },
      
      knowledge: {
        entities: ['Knowledge', 'Insight', 'Learning', 'Practice', 'Framework'],
        attributes: ['source', 'verification', 'application', 'cultural_protocol', 'sharing_permission'],
        relationships: ['DERIVES_FROM', 'APPLIES_TO', 'VALIDATES', 'CHALLENGES', 'BUILDS_ON']
      },
      
      impact: {
        entities: ['Impact', 'Outcome', 'Change', 'Transformation', 'Benefit'],
        attributes: ['measurement', 'timeline', 'beneficiaries', 'sustainability', 'scale'],
        relationships: ['RESULTS_FROM', 'CONTRIBUTES_TO', 'MULTIPLIES', 'SUSTAINS', 'TRANSFORMS']
      }
    };
  }

  initializeRelationshipTypes() {
    return {
      // People relationships
      MENTORS: { weight: 0.9, bidirectional: false, properties: ['since', 'area', 'frequency'] },
      COLLABORATES_WITH: { weight: 0.8, bidirectional: true, properties: ['project', 'role', 'duration'] },
      ADVOCATES_FOR: { weight: 0.85, bidirectional: false, properties: ['cause', 'impact', 'approach'] },
      
      // Story relationships
      TELLS: { weight: 1.0, bidirectional: false, properties: ['consent', 'privacy', 'purpose'] },
      INSPIRES: { weight: 0.7, bidirectional: false, properties: ['theme', 'action', 'reach'] },
      VALIDATES: { weight: 0.9, bidirectional: false, properties: ['evidence', 'method', 'confidence'] },
      
      // Project relationships
      FUNDS: { weight: 0.95, bidirectional: false, properties: ['amount', 'duration', 'conditions'] },
      IMPLEMENTS: { weight: 0.9, bidirectional: false, properties: ['role', 'timeline', 'deliverables'] },
      BENEFITS_FROM: { weight: 0.85, bidirectional: false, properties: ['type', 'scale', 'sustainability'] },
      
      // Knowledge relationships
      DERIVES_FROM: { weight: 0.8, bidirectional: false, properties: ['method', 'confidence', 'context'] },
      BUILDS_ON: { weight: 0.75, bidirectional: false, properties: ['extension', 'innovation', 'validation'] },
      CHALLENGES: { weight: 0.7, bidirectional: false, properties: ['aspect', 'evidence', 'alternative'] },
      
      // Impact relationships
      RESULTS_FROM: { weight: 0.9, bidirectional: false, properties: ['causality', 'timeframe', 'attribution'] },
      MULTIPLIES: { weight: 0.8, bidirectional: false, properties: ['factor', 'mechanism', 'reach'] },
      TRANSFORMS: { weight: 0.95, bidirectional: false, properties: ['before', 'after', 'catalyst'] }
    };
  }

  initializeQueryPatterns() {
    return {
      connection_discovery: [
        'MATCH (a)-[r*1..3]-(b) WHERE a.id = $entityId RETURN DISTINCT b, r',
        'MATCH path = shortestPath((a)-[*]-(b)) WHERE a.id = $id1 AND b.id = $id2 RETURN path'
      ],
      
      pattern_matching: [
        'MATCH (p:Project)-[:PRODUCES]->(s:Story)-[:INSPIRES]->(o:Outcome) RETURN p, s, o',
        'MATCH (person:Person)-[:TELLS]->(story:Story)-[:FEATURES_IN]->(project:Project) RETURN person, story, project'
      ],
      
      impact_tracing: [
        'MATCH (action)-[:RESULTS_FROM*1..4]->(root) WHERE action.type = "Impact" RETURN action, root',
        'MATCH (benefit:Benefit)-[:RESULTS_FROM]->(project:Project)-[:FUNDED_BY]->(org:Organization) RETURN benefit, project, org'
      ],
      
      knowledge_extraction: [
        'MATCH (k:Knowledge)-[:DERIVES_FROM]->(source) WHERE k.verified = true RETURN k, source',
        'MATCH (insight:Insight)-[:APPLIES_TO]->(context) RETURN insight, context'
      ],
      
      community_networks: [
        'MATCH (p1:Person)-[:KNOWS]-(p2:Person)-[:KNOWS]-(p3:Person) WHERE p1.community = $community RETURN p1, p2, p3',
        'MATCH (c:Community)-[:CONNECTS]->(p:Person)-[:PARTICIPATES_IN]->(project:Project) RETURN c, p, project'
      ]
    };
  }

  async process(query, context) {
    console.log(`📚 Knowledge Librarian processing: "${query}"`);
    
    try {
      // Parse query intent
      const intent = await this.parseQueryIntent(query);
      
      // Search knowledge graph
      const graphResults = await this.searchKnowledgeGraph(query, intent, context);
      
      // Search document repositories
      const documentResults = await this.searchDocuments(query, context);
      
      // Search story database
      const storyResults = await this.searchStories(query, context);
      
      // Discover patterns and connections
      const patterns = await this.discoverPatterns(graphResults, documentResults, storyResults);
      
      // Generate insights
      const insights = await this.generateInsights(query, graphResults, patterns);
      
      // Update knowledge graph with new learning
      await this.updateKnowledgeGraph(query, insights);
      
      // Cache for faster future retrieval
      await this.cacheKnowledge(query, graphResults, insights);
      
      const response = {
        pod: this.name,
        timestamp: new Date().toISOString(),
        
        query_understanding: {
          intent: intent,
          entities_identified: this.extractEntities(query),
          relationships_sought: this.identifyRelationshipQueries(query),
          temporal_context: this.extractTemporalContext(query)
        },
        
        knowledge_found: {
          graph_results: {
            nodes: graphResults.nodes?.length || 0,
            relationships: graphResults.relationships?.length || 0,
            primary_findings: graphResults.primary || [],
            related_findings: graphResults.related || []
          },
          
          document_results: {
            count: documentResults.length,
            relevance_scores: documentResults.map(d => d.relevance),
            top_documents: documentResults.slice(0, 5)
          },
          
          story_results: {
            count: storyResults.length,
            themes: this.extractThemes(storyResults),
            connections: this.mapStoryConnections(storyResults)
          }
        },
        
        patterns_discovered: patterns,
        
        insights: insights,
        
        recommendations: await this.generateRecommendations(query, graphResults, patterns, insights),
        
        knowledge_gaps: this.identifyKnowledgeGaps(query, graphResults),
        
        suggested_explorations: this.suggestExplorations(patterns, context)
      };
      
      // Publish findings to Kafka
      await this.publishKnowledgeDiscovery(response);
      
      return response;
      
    } catch (error) {
      console.error('🚨 Knowledge Librarian error:', error);
      throw error;
    }
  }

  async parseQueryIntent(query) {
    const intent = {
      type: 'unknown',
      action: 'search',
      focus: [],
      depth: 1
    };
    
    const queryLower = query.toLowerCase();
    
    // Determine query type
    if (queryLower.includes('who') || queryLower.includes('person')) {
      intent.type = 'people';
    } else if (queryLower.includes('what') || queryLower.includes('project')) {
      intent.type = 'projects';
    } else if (queryLower.includes('how') || queryLower.includes('process')) {
      intent.type = 'process';
    } else if (queryLower.includes('why') || queryLower.includes('impact')) {
      intent.type = 'impact';
    } else if (queryLower.includes('story') || queryLower.includes('narrative')) {
      intent.type = 'stories';
    }
    
    // Determine action
    if (queryLower.includes('connect') || queryLower.includes('relate')) {
      intent.action = 'connect';
      intent.depth = 3;
    } else if (queryLower.includes('impact') || queryLower.includes('result')) {
      intent.action = 'trace_impact';
      intent.depth = 4;
    } else if (queryLower.includes('pattern') || queryLower.includes('trend')) {
      intent.action = 'find_patterns';
      intent.depth = 2;
    } else if (queryLower.includes('recommend') || queryLower.includes('suggest')) {
      intent.action = 'recommend';
    }
    
    // Extract focus areas
    for (const [domain, config] of Object.entries(this.knowledgeDomains)) {
      for (const entity of config.entities) {
        if (queryLower.includes(entity.toLowerCase())) {
          intent.focus.push(domain);
          break;
        }
      }
    }
    
    // Use AI for deeper intent understanding if available
    if (this.openai) {
      const aiIntent = await this.analyzeIntentWithAI(query);
      if (aiIntent) {
        intent.ai_analysis = aiIntent;
      }
    }
    
    return intent;
  }

  async searchKnowledgeGraph(query, intent, context) {
    const session = this.neo4j.session();
    const results = {
      nodes: [],
      relationships: [],
      primary: [],
      related: []
    };
    
    try {
      // Build dynamic Cypher query based on intent
      let cypherQuery = '';
      const parameters = {};
      
      switch (intent.action) {
        case 'connect':
          cypherQuery = `
            MATCH path = (a)-[r*1..${intent.depth}]-(b)
            WHERE a.name CONTAINS $searchTerm OR a.description CONTAINS $searchTerm
            RETURN path, a, b, r
            LIMIT 50
          `;
          parameters.searchTerm = query;
          break;
          
        case 'trace_impact':
          cypherQuery = `
            MATCH (impact:Impact)-[:RESULTS_FROM*1..${intent.depth}]->(source)
            WHERE source.name CONTAINS $searchTerm OR impact.description CONTAINS $searchTerm
            RETURN impact, source, relationships(impact, source) as rels
            LIMIT 30
          `;
          parameters.searchTerm = query;
          break;
          
        case 'find_patterns':
          cypherQuery = `
            MATCH pattern = (n1)-[r1]-(n2)-[r2]-(n3)
            WHERE n1.domain IN $domains OR n2.domain IN $domains
            WITH pattern, n1, n2, n3, r1, r2
            WHERE r1.weight > 0.7 AND r2.weight > 0.7
            RETURN pattern, n1, n2, n3, r1, r2
            LIMIT 40
          `;
          parameters.domains = intent.focus.length > 0 ? intent.focus : ['projects', 'people', 'stories'];
          break;
          
        default:
          // General search
          cypherQuery = `
            MATCH (n)
            WHERE n.name CONTAINS $searchTerm 
               OR n.description CONTAINS $searchTerm
               OR n.title CONTAINS $searchTerm
            OPTIONAL MATCH (n)-[r]-(connected)
            RETURN n, collect(DISTINCT r) as relationships, collect(DISTINCT connected) as connections
            LIMIT 25
          `;
          parameters.searchTerm = query;
      }
      
      // Execute query
      const result = await session.run(cypherQuery, parameters);
      
      // Process results
      result.records.forEach(record => {
        // Extract nodes
        record.keys.forEach(key => {
          const value = record.get(key);
          if (value && value.labels) {
            results.nodes.push({
              id: value.identity.toString(),
              labels: value.labels,
              properties: value.properties
            });
          }
        });
        
        // Extract relationships
        if (record.has('relationships') || record.has('r')) {
          const rels = record.get('relationships') || record.get('r');
          if (Array.isArray(rels)) {
            rels.forEach(rel => {
              if (rel && rel.type) {
                results.relationships.push({
                  id: rel.identity?.toString(),
                  type: rel.type,
                  properties: rel.properties,
                  start: rel.start?.toString(),
                  end: rel.end?.toString()
                });
              }
            });
          }
        }
      });
      
      // Categorize results by relevance
      results.primary = results.nodes.filter(n => 
        n.properties.name?.toLowerCase().includes(query.toLowerCase()) ||
        n.properties.title?.toLowerCase().includes(query.toLowerCase())
      );
      
      results.related = results.nodes.filter(n => !results.primary.includes(n));
      
      // Check cache for additional historical patterns
      const cachedPatterns = await this.getCachedPatterns(query);
      if (cachedPatterns) {
        results.cached_patterns = cachedPatterns;
      }
      
    } catch (error) {
      console.error('Knowledge graph search error:', error);
    } finally {
      await session.close();
    }
    
    return results;
  }

  async searchDocuments(query, context) {
    const documents = [];
    
    try {
      // Search Redis cache for documents
      const docKeys = await this.redis.keys('doc:*');
      
      for (const key of docKeys) {
        const doc = await this.redis.get(key);
        if (doc) {
          const parsed = JSON.parse(doc);
          const relevance = this.calculateRelevance(query, parsed);
          
          if (relevance > 0.3) {
            documents.push({
              ...parsed,
              relevance,
              source: 'cache'
            });
          }
        }
      }
      
      // Sort by relevance
      documents.sort((a, b) => b.relevance - a.relevance);
      
    } catch (error) {
      console.error('Document search error:', error);
    }
    
    return documents;
  }

  async searchStories(query, context) {
    const stories = [];
    
    try {
      // Search Supabase stories
      const { data, error } = await this.supabase
        .from('stories')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,themes.cs.{${query}}`)
        .neq('privacy_level', 'private')
        .limit(20);
      
      if (!error && data) {
        for (const story of data) {
          stories.push({
            id: story.id,
            title: story.title,
            themes: story.themes || [],
            excerpt: story.content?.substring(0, 200),
            storyteller_id: story.storyteller_id,
            impact_area: story.impact_area,
            relevance: this.calculateStoryRelevance(query, story),
            connections: await this.getStoryConnections(story.id)
          });
        }
      }
      
    } catch (error) {
      console.error('Story search error:', error);
    }
    
    return stories;
  }

  async discoverPatterns(graphResults, documentResults, storyResults) {
    const patterns = {
      recurring_themes: [],
      relationship_clusters: [],
      impact_chains: [],
      knowledge_flows: [],
      community_networks: []
    };
    
    // Analyze recurring themes across all results
    const allThemes = new Map();
    
    // Extract themes from graph results
    graphResults.nodes?.forEach(node => {
      if (node.properties.themes) {
        node.properties.themes.forEach(theme => {
          allThemes.set(theme, (allThemes.get(theme) || 0) + 1);
        });
      }
    });
    
    // Extract themes from stories
    storyResults.forEach(story => {
      story.themes.forEach(theme => {
        allThemes.set(theme, (allThemes.get(theme) || 0) + 1);
      });
    });
    
    // Identify recurring themes
    patterns.recurring_themes = Array.from(allThemes.entries())
      .filter(([theme, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => ({ theme, frequency: count }));
    
    // Analyze relationship clusters
    const relationshipTypes = new Map();
    graphResults.relationships?.forEach(rel => {
      const key = rel.type;
      if (!relationshipTypes.has(key)) {
        relationshipTypes.set(key, []);
      }
      relationshipTypes.get(key).push(rel);
    });
    
    patterns.relationship_clusters = Array.from(relationshipTypes.entries())
      .map(([type, rels]) => ({
        type,
        count: rels.length,
        strength: rels.reduce((sum, r) => sum + (r.properties?.weight || 0.5), 0) / rels.length
      }))
      .sort((a, b) => b.count - a.count);
    
    // Identify impact chains
    const impactNodes = graphResults.nodes?.filter(n => 
      n.labels.includes('Impact') || n.labels.includes('Outcome')
    ) || [];
    
    for (const impactNode of impactNodes) {
      const chain = await this.traceImpactChain(impactNode.id);
      if (chain.length > 1) {
        patterns.impact_chains.push({
          impact: impactNode.properties.name || impactNode.properties.description,
          chain_length: chain.length,
          chain: chain
        });
      }
    }
    
    // Map knowledge flows
    const knowledgeNodes = graphResults.nodes?.filter(n =>
      n.labels.includes('Knowledge') || n.labels.includes('Insight')
    ) || [];
    
    patterns.knowledge_flows = knowledgeNodes.map(node => ({
      knowledge: node.properties.name || node.properties.description,
      source: node.properties.source,
      applications: node.properties.applications || [],
      verification_status: node.properties.verified || false
    }));
    
    // Detect community networks
    const peopleNodes = graphResults.nodes?.filter(n => n.labels.includes('Person')) || [];
    if (peopleNodes.length > 2) {
      const networks = await this.detectCommunityNetworks(peopleNodes);
      patterns.community_networks = networks;
    }
    
    return patterns;
  }

  async generateInsights(query, graphResults, patterns) {
    const insights = [];
    
    // Insight 1: Connection density
    if (graphResults.relationships?.length > graphResults.nodes?.length * 1.5) {
      insights.push({
        type: 'connection_density',
        title: 'Highly Connected Knowledge Area',
        description: `This query reveals a densely connected knowledge network with ${graphResults.relationships.length} relationships between ${graphResults.nodes.length} entities`,
        significance: 'high',
        recommendation: 'Explore specific relationship types for deeper understanding'
      });
    }
    
    // Insight 2: Theme convergence
    if (patterns.recurring_themes.length > 3) {
      const topThemes = patterns.recurring_themes.slice(0, 3).map(t => t.theme).join(', ');
      insights.push({
        type: 'theme_convergence',
        title: 'Converging Themes Identified',
        description: `Strong thematic convergence around: ${topThemes}`,
        significance: 'medium',
        recommendation: 'Consider creating targeted initiatives around these themes'
      });
    }
    
    // Insight 3: Impact potential
    if (patterns.impact_chains.length > 0) {
      const longestChain = patterns.impact_chains.reduce((max, chain) => 
        chain.chain_length > (max?.chain_length || 0) ? chain : max, null
      );
      
      insights.push({
        type: 'impact_potential',
        title: 'Impact Multiplication Opportunity',
        description: `Identified impact chain of length ${longestChain.chain_length} starting from "${longestChain.impact}"`,
        significance: 'high',
        recommendation: 'Strengthen this chain for multiplied community benefit'
      });
    }
    
    // Insight 4: Knowledge gaps
    const knowledgeGaps = this.identifyKnowledgeGaps(query, graphResults);
    if (knowledgeGaps.length > 0) {
      insights.push({
        type: 'knowledge_gap',
        title: 'Knowledge Gap Identified',
        description: `Missing connections or information in: ${knowledgeGaps.join(', ')}`,
        significance: 'medium',
        recommendation: 'Conduct targeted research or community consultation'
      });
    }
    
    // Insight 5: Community network strength
    if (patterns.community_networks.length > 0) {
      const strongestNetwork = patterns.community_networks[0];
      insights.push({
        type: 'community_strength',
        title: 'Strong Community Network Detected',
        description: `Community network with ${strongestNetwork.size} members and ${strongestNetwork.connections} connections`,
        significance: 'high',
        recommendation: 'Leverage this network for community-led initiatives'
      });
    }
    
    // Use AI for deeper insights if available
    if (this.openai) {
      const aiInsights = await this.generateAIInsights(query, graphResults, patterns);
      if (aiInsights) {
        insights.push(...aiInsights);
      }
    }
    
    return insights;
  }

  async generateRecommendations(query, graphResults, patterns, insights) {
    const recommendations = [];
    
    // Based on patterns found
    if (patterns.recurring_themes.length > 0) {
      recommendations.push({
        type: 'thematic_focus',
        action: 'Develop thematic programs',
        rationale: `Strong themes identified: ${patterns.recurring_themes[0].theme}`,
        priority: 'medium',
        resources_needed: ['Community consultation', 'Program design', 'Funding alignment']
      });
    }
    
    // Based on relationship clusters
    if (patterns.relationship_clusters.some(c => c.type === 'MENTORS' && c.count > 3)) {
      recommendations.push({
        type: 'mentorship_program',
        action: 'Formalize mentorship program',
        rationale: 'Strong mentorship relationships already exist',
        priority: 'high',
        resources_needed: ['Mentor training', 'Program structure', 'Recognition system']
      });
    }
    
    // Based on impact chains
    if (patterns.impact_chains.some(chain => chain.chain_length > 3)) {
      recommendations.push({
        type: 'impact_amplification',
        action: 'Document and replicate successful impact chains',
        rationale: 'Long impact chains show multiplication potential',
        priority: 'high',
        resources_needed: ['Impact measurement', 'Case study development', 'Replication guide']
      });
    }
    
    // Based on knowledge flows
    if (patterns.knowledge_flows.filter(k => !k.verification_status).length > 2) {
      recommendations.push({
        type: 'knowledge_verification',
        action: 'Verify and document emerging knowledge',
        rationale: 'Unverified knowledge needs validation for use',
        priority: 'medium',
        resources_needed: ['Research capacity', 'Community validation', 'Documentation']
      });
    }
    
    // Based on insights
    insights.forEach(insight => {
      if (insight.recommendation) {
        recommendations.push({
          type: insight.type,
          action: insight.recommendation,
          rationale: insight.description,
          priority: insight.significance === 'high' ? 'high' : 'medium',
          resources_needed: this.identifyResourcesForAction(insight.recommendation)
        });
      }
    });
    
    return recommendations;
  }

  async updateKnowledgeGraph(query, insights) {
    const session = this.neo4j.session();
    
    try {
      // Create query node
      await session.run(
        `
        CREATE (q:Query {
          id: $id,
          text: $query,
          timestamp: datetime($timestamp),
          insight_count: $insightCount
        })
        `,
        {
          id: `query_${Date.now()}`,
          query: query,
          timestamp: new Date().toISOString(),
          insightCount: insights.length
        }
      );
      
      // Link insights to query
      for (const insight of insights) {
        await session.run(
          `
          MATCH (q:Query {id: $queryId})
          CREATE (i:Insight {
            id: $insightId,
            type: $type,
            title: $title,
            description: $description,
            significance: $significance
          })
          CREATE (q)-[:GENERATED]->(i)
          `,
          {
            queryId: `query_${Date.now()}`,
            insightId: `insight_${Date.now()}_${Math.random()}`,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            significance: insight.significance
          }
        );
      }
      
      // Update query patterns for learning
      await this.updateQueryPatterns(query, insights);
      
    } catch (error) {
      console.error('Failed to update knowledge graph:', error);
    } finally {
      await session.close();
    }
  }

  async cacheKnowledge(query, results, insights) {
    const cacheKey = `knowledge:${this.hashQuery(query)}`;
    const cacheData = {
      query,
      timestamp: new Date().toISOString(),
      results: {
        node_count: results.nodes?.length || 0,
        relationship_count: results.relationships?.length || 0,
        primary_count: results.primary?.length || 0
      },
      insights: insights.map(i => ({ type: i.type, title: i.title })),
      ttl: 3600 // 1 hour
    };
    
    await this.redis.setex(cacheKey, cacheData.ttl, JSON.stringify(cacheData));
    
    // Update query memory
    this.queryMemory.set(query, {
      timestamp: Date.now(),
      results: results.nodes?.length || 0,
      insights: insights.length
    });
    
    // Maintain memory size
    if (this.queryMemory.size > 500) {
      const oldestKey = Array.from(this.queryMemory.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.queryMemory.delete(oldestKey);
    }
  }

  // Helper methods...

  calculateRelevance(query, document) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const docText = (document.title + ' ' + document.content).toLowerCase();
    
    let matches = 0;
    for (const word of queryWords) {
      if (docText.includes(word)) matches++;
    }
    
    return matches / queryWords.length;
  }

  calculateStoryRelevance(query, story) {
    const queryLower = query.toLowerCase();
    let relevance = 0;
    
    if (story.title?.toLowerCase().includes(queryLower)) relevance += 0.4;
    if (story.content?.toLowerCase().includes(queryLower)) relevance += 0.3;
    if (story.themes?.some(t => t.toLowerCase().includes(queryLower))) relevance += 0.2;
    if (story.impact_area?.toLowerCase().includes(queryLower)) relevance += 0.1;
    
    return Math.min(1, relevance);
  }

  async getStoryConnections(storyId) {
    // Fetch story connections from Neo4j
    const session = this.neo4j.session();
    const connections = [];
    
    try {
      const result = await session.run(
        'MATCH (s:Story {id: $storyId})-[r]-(connected) RETURN connected, r LIMIT 10',
        { storyId: storyId.toString() }
      );
      
      result.records.forEach(record => {
        const connected = record.get('connected');
        const relationship = record.get('r');
        
        connections.push({
          entity_id: connected.identity?.toString(),
          entity_type: connected.labels?.[0],
          relationship_type: relationship.type
        });
      });
    } catch (error) {
      console.error('Error fetching story connections:', error);
    } finally {
      await session.close();
    }
    
    return connections;
  }

  extractEntities(query) {
    // Simple entity extraction - could be enhanced with NER
    const entities = [];
    const words = query.split(/\s+/);
    
    for (const word of words) {
      if (word[0] === word[0].toUpperCase() && word.length > 2) {
        entities.push({ text: word, type: 'PROPER_NOUN' });
      }
    }
    
    return entities;
  }

  identifyRelationshipQueries(query) {
    const relationships = [];
    const relationshipKeywords = {
      'connects': 'CONNECTION',
      'relates': 'RELATION',
      'impacts': 'IMPACT',
      'funds': 'FUNDING',
      'supports': 'SUPPORT',
      'mentors': 'MENTORSHIP'
    };
    
    const queryLower = query.toLowerCase();
    for (const [keyword, type] of Object.entries(relationshipKeywords)) {
      if (queryLower.includes(keyword)) {
        relationships.push(type);
      }
    }
    
    return relationships;
  }

  extractTemporalContext(query) {
    const temporal = {
      timeframe: null,
      specific_dates: [],
      relative_time: null
    };
    
    // Check for specific dates
    const datePattern = /\d{4}-\d{2}-\d{2}/g;
    const dates = query.match(datePattern);
    if (dates) {
      temporal.specific_dates = dates;
    }
    
    // Check for relative time
    if (query.includes('recent')) temporal.relative_time = 'recent';
    if (query.includes('last month')) temporal.relative_time = 'last_month';
    if (query.includes('this year')) temporal.relative_time = 'this_year';
    
    return temporal;
  }

  extractThemes(stories) {
    const themes = new Map();
    
    stories.forEach(story => {
      story.themes?.forEach(theme => {
        themes.set(theme, (themes.get(theme) || 0) + 1);
      });
    });
    
    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => ({ theme, count }));
  }

  mapStoryConnections(stories) {
    const connectionMap = new Map();
    
    stories.forEach(story => {
      story.connections?.forEach(conn => {
        const key = `${conn.entity_type}:${conn.relationship_type}`;
        connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
      });
    });
    
    return Array.from(connectionMap.entries())
      .map(([key, count]) => {
        const [entity_type, relationship_type] = key.split(':');
        return { entity_type, relationship_type, count };
      });
  }

  async traceImpactChain(impactNodeId) {
    const session = this.neo4j.session();
    const chain = [];
    
    try {
      const result = await session.run(
        `
        MATCH path = (impact)-[:RESULTS_FROM*1..5]->(source)
        WHERE impact.id = $impactId
        RETURN nodes(path) as chain
        LIMIT 1
        `,
        { impactId: impactNodeId }
      );
      
      if (result.records.length > 0) {
        const nodes = result.records[0].get('chain');
        chain.push(...nodes.map(n => ({
          id: n.identity?.toString(),
          type: n.labels?.[0],
          name: n.properties?.name || n.properties?.description
        })));
      }
    } catch (error) {
      console.error('Error tracing impact chain:', error);
    } finally {
      await session.close();
    }
    
    return chain;
  }

  async detectCommunityNetworks(peopleNodes) {
    const networks = [];
    const session = this.neo4j.session();
    
    try {
      // Find clusters of connected people
      const result = await session.run(
        `
        MATCH (p1:Person)-[:KNOWS|COLLABORATES_WITH*1..2]-(p2:Person)
        WHERE p1.id IN $personIds AND p2.id IN $personIds
        WITH p1, collect(DISTINCT p2) as network
        WHERE size(network) > 2
        RETURN p1, network
        LIMIT 5
        `,
        { personIds: peopleNodes.map(n => n.id) }
      );
      
      result.records.forEach(record => {
        const central = record.get('p1');
        const network = record.get('network');
        
        networks.push({
          central_person: central.properties?.name,
          size: network.length + 1,
          connections: network.length * (network.length - 1) / 2,
          density: 'high'
        });
      });
    } catch (error) {
      console.error('Error detecting community networks:', error);
    } finally {
      await session.close();
    }
    
    return networks;
  }

  identifyKnowledgeGaps(query, graphResults) {
    const gaps = [];
    
    // Check for missing connections
    if (graphResults.nodes?.length > 0 && graphResults.relationships?.length === 0) {
      gaps.push('Missing relationship data');
    }
    
    // Check for incomplete nodes
    const incompleteNodes = graphResults.nodes?.filter(n => 
      !n.properties.description && !n.properties.details
    ) || [];
    
    if (incompleteNodes.length > graphResults.nodes?.length * 0.3) {
      gaps.push('Incomplete entity information');
    }
    
    // Check for unverified information
    const unverifiedNodes = graphResults.nodes?.filter(n => 
      n.properties.verified === false
    ) || [];
    
    if (unverifiedNodes.length > 0) {
      gaps.push('Unverified information present');
    }
    
    return gaps;
  }

  suggestExplorations(patterns, context) {
    const suggestions = [];
    
    // Based on patterns
    if (patterns.recurring_themes.length > 0) {
      suggestions.push({
        exploration: `Deep dive into theme: ${patterns.recurring_themes[0].theme}`,
        rationale: 'High frequency theme detected',
        query_suggestion: `Show all projects and stories related to ${patterns.recurring_themes[0].theme}`
      });
    }
    
    if (patterns.relationship_clusters.some(c => c.count > 5)) {
      const cluster = patterns.relationship_clusters.find(c => c.count > 5);
      suggestions.push({
        exploration: `Explore ${cluster.type} relationship network`,
        rationale: `Strong cluster of ${cluster.count} relationships`,
        query_suggestion: `Map all ${cluster.type} relationships and their impact`
      });
    }
    
    if (patterns.impact_chains.length > 0) {
      suggestions.push({
        exploration: 'Trace complete impact journey',
        rationale: 'Impact chains show multiplication potential',
        query_suggestion: 'Show how initial actions led to community outcomes'
      });
    }
    
    return suggestions;
  }

  identifyResourcesForAction(recommendation) {
    const resourceMap = {
      'consultation': ['Community engagement', 'Meeting facilitation', 'Documentation'],
      'research': ['Research capacity', 'Data collection', 'Analysis tools'],
      'development': ['Technical skills', 'Development time', 'Testing resources'],
      'training': ['Training materials', 'Facilitators', 'Venue and logistics'],
      'documentation': ['Writing capacity', 'Review process', 'Publication platform']
    };
    
    const resources = [];
    for (const [key, values] of Object.entries(resourceMap)) {
      if (recommendation.toLowerCase().includes(key)) {
        resources.push(...values);
      }
    }
    
    return resources.length > 0 ? resources : ['Assessment needed'];
  }

  async getCachedPatterns(query) {
    const cacheKey = `patterns:${this.hashQuery(query)}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      this.patternCache.set(query, JSON.parse(cached));
      return JSON.parse(cached);
    }
    
    return null;
  }

  async updateQueryPatterns(query, insights) {
    const patternKey = `patterns:${this.hashQuery(query)}`;
    const patterns = {
      query,
      insights: insights.map(i => i.type),
      timestamp: Date.now(),
      frequency: 1
    };
    
    // Check if pattern exists and update frequency
    const existing = await this.redis.get(patternKey);
    if (existing) {
      const parsed = JSON.parse(existing);
      patterns.frequency = parsed.frequency + 1;
    }
    
    await this.redis.setex(patternKey, 7 * 24 * 60 * 60, JSON.stringify(patterns)); // 7 days
  }

  hashQuery(query) {
    // Simple hash for query caching
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  async analyzeIntentWithAI(query) {
    if (!this.openai) return null;
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Analyze the query intent and identify: 1) Primary goal, 2) Entity types involved, 3) Relationship queries, 4) Depth of exploration needed.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.warn('AI intent analysis failed:', error);
      return null;
    }
  }

  async generateAIInsights(query, graphResults, patterns) {
    if (!this.openai) return [];
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Generate strategic insights from the knowledge graph results and patterns. Focus on actionable recommendations for community benefit.'
          },
          {
            role: 'user',
            content: JSON.stringify({ query, results_summary: {
              nodes: graphResults.nodes?.length,
              relationships: graphResults.relationships?.length,
              patterns: patterns
            }}, null, 2)
          }
        ],
        temperature: 0.5,
        max_tokens: 400
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.warn('AI insight generation failed:', error);
      return [];
    }
  }

  async publishKnowledgeDiscovery(response) {
    try {
      await this.producer.send({
        topic: 'act.knowledge.discoveries',
        messages: [{
          key: `discovery_${Date.now()}`,
          value: JSON.stringify({
            timestamp: response.timestamp,
            query_intent: response.query_understanding.intent,
            nodes_found: response.knowledge_found.graph_results.nodes,
            insights_generated: response.insights.length,
            patterns_discovered: response.patterns_discovered
          })
        }]
      });
    } catch (error) {
      console.error('Failed to publish knowledge discovery:', error);
    }
  }

  async connect() {
    await this.producer.connect();
    console.log('📚 Knowledge Librarian connected to Kafka');
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.redis.quit();
    await this.neo4j.close();
    console.log('📚 Knowledge Librarian disconnected');
  }

  async healthCheck() {
    return {
      name: this.name,
      status: 'healthy',
      openai_configured: Boolean(this.openai),
      query_memory_size: this.queryMemory.size,
      pattern_cache_size: this.patternCache.size,
      knowledge_domains: Object.keys(this.knowledgeDomains).length,
      relationship_types: Object.keys(this.relationshipTypes).length
    };
  }
}

export default KnowledgeLibrarian;