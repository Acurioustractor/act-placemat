/**
 * ACT Farmhand Unified Data Model
 * Central data model and ETL orchestration for all ACT systems
 */

import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

class UnifiedDataModel {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'act-unified-data-model',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    
    this.consumer = this.kafka.consumer({ groupId: 'act-data-model-group' });
    this.producer = this.kafka.producer();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Unified entity schemas
    this.schemas = this.initializeSchemas();
    
    // Data transformation pipelines
    this.transformers = new Map();
    this.setupTransformers();
    
    // Entity relationship mappings
    this.relationships = new Map();
    this.setupRelationships();
    
    console.log('🧠 Unified Data Model initialized');
  }

  initializeSchemas() {
    return {
      // Core entities
      person: {
        id: 'string',
        name: 'string',
        email: 'string',
        roles: ['string'],
        skills: ['string'],
        connection_strength: 'number',
        last_interaction: 'timestamp',
        cultural_protocols: 'object',
        privacy_settings: 'object',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      },
      
      project: {
        id: 'string',
        name: 'string',
        description: 'string',
        status: 'string',
        type: 'string', // goods, justice, picc, etc.
        lead_person_id: 'string',
        community_id: 'string',
        funding_sources: ['object'],
        budget_allocated: 'number',
        budget_spent: 'number',
        impact_metrics: 'object',
        cultural_considerations: 'object',
        start_date: 'timestamp',
        end_date: 'timestamp',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      },
      
      organization: {
        id: 'string',
        name: 'string',
        type: 'string', // partner, funder, community_org, government
        relationship_type: 'string',
        contact_person_id: 'string',
        funding_provided: ['object'],
        partnerships: ['object'],
        cultural_protocols: 'object',
        contact_info: 'object',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      },
      
      opportunity: {
        id: 'string',
        name: 'string',
        description: 'string',
        type: 'string', // grant, partnership, media, policy
        status: 'string',
        priority: 'string',
        amount: 'number',
        deadline: 'timestamp',
        eligibility_criteria: ['string'],
        alignment_score: 'number',
        assigned_to: 'string',
        related_projects: ['string'],
        application_status: 'string',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      },
      
      story: {
        id: 'string',
        title: 'string',
        content: 'string',
        storyteller_id: 'string',
        themes: ['string'],
        impact_area: 'string',
        privacy_level: 'string',
        consent_status: 'string',
        usage_permissions: 'object',
        cultural_protocols: 'object',
        verification_status: 'string',
        related_projects: ['string'],
        emotional_indicators: 'object',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      },
      
      artifact: {
        id: 'string',
        name: 'string',
        type: 'string', // document, media, tool, framework
        description: 'string',
        project_id: 'string',
        creator_id: 'string',
        file_path: 'string',
        metadata: 'object',
        usage_rights: 'object',
        cultural_sensitivity: 'string',
        accessibility_features: ['string'],
        version: 'string',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      },
      
      action: {
        id: 'string',
        title: 'string',
        description: 'string',
        type: 'string',
        status: 'string',
        priority: 'string',
        assigned_to: 'string',
        project_id: 'string',
        due_date: 'timestamp',
        dependencies: ['string'],
        completion_notes: 'string',
        impact_achieved: 'object',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      },
      
      // Financial entities
      financial_transaction: {
        id: 'string',
        type: 'string',
        amount: 'number',
        currency: 'string',
        description: 'string',
        date: 'timestamp',
        account_id: 'string',
        project_allocation: 'string',
        program_category: 'string',
        funding_source: 'string',
        tax_implications: 'object',
        approval_status: 'string',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      },
      
      // Communication entities
      communication: {
        id: 'string',
        type: 'string', // email, slack, meeting, call
        sender_id: 'string',
        recipients: ['string'],
        subject: 'string',
        content: 'string',
        channel: 'string',
        timestamp: 'timestamp',
        sentiment_score: 'number',
        action_items: ['string'],
        related_entities: ['object'],
        privacy_level: 'string',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      },
      
      // Analytics entities
      insight: {
        id: 'string',
        type: 'string',
        title: 'string',
        description: 'string',
        confidence_score: 'number',
        data_sources: ['string'],
        entities_involved: ['object'],
        recommendations: ['string'],
        impact_potential: 'string',
        generated_by: 'string',
        validated_by: 'string',
        status: 'string',
        source_systems: ['string'],
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }
    };
  }

  setupTransformers() {
    // Notion transformers
    this.transformers.set('notion.projects', (notionProject) => ({
      id: notionProject.id,
      name: notionProject.properties.Name?.title?.[0]?.plain_text || '',
      description: notionProject.properties.Description?.rich_text?.[0]?.plain_text || '',
      status: notionProject.properties.Status?.select?.name || 'unknown',
      type: notionProject.properties.Type?.select?.name || 'general',
      lead_person_id: notionProject.properties['Lead Person']?.people?.[0]?.id,
      start_date: notionProject.properties['Start Date']?.date?.start,
      end_date: notionProject.properties['End Date']?.date?.start,
      source_systems: ['notion'],
      created_at: notionProject.created_time,
      updated_at: notionProject.last_edited_time
    }));
    
    this.transformers.set('notion.people', (notionPerson) => ({
      id: notionPerson.id,
      name: notionPerson.properties.Name?.title?.[0]?.plain_text || '',
      email: notionPerson.properties.Email?.email || '',
      roles: notionPerson.properties.Roles?.multi_select?.map(r => r.name) || [],
      skills: notionPerson.properties.Skills?.multi_select?.map(s => s.name) || [],
      source_systems: ['notion'],
      created_at: notionPerson.created_time,
      updated_at: notionPerson.last_edited_time
    }));
    
    // Supabase story transformers
    this.transformers.set('supabase.stories', (story) => ({
      id: story.id.toString(),
      title: story.title || '',
      content: story.content || '',
      storyteller_id: story.storyteller_id?.toString(),
      themes: story.themes || [],
      impact_area: story.impact_area || '',
      privacy_level: story.privacy_level || 'private',
      consent_status: story.consent_status || 'pending',
      source_systems: ['supabase'],
      created_at: story.created_at,
      updated_at: story.updated_at
    }));
    
    // Slack communication transformers
    this.transformers.set('slack.messages', (slackMessage) => ({
      id: slackMessage.id || slackMessage.ts,
      type: 'slack_message',
      sender_id: slackMessage.user?.id,
      content: slackMessage.text || '',
      channel: slackMessage.channel?.name || slackMessage.channel?.id,
      timestamp: slackMessage.timestamp,
      sentiment_score: this.calculateSentiment(slackMessage.text),
      related_entities: this.extractRelatedEntities(slackMessage.text),
      source_systems: ['slack'],
      created_at: slackMessage.timestamp,
      updated_at: slackMessage.timestamp
    }));
    
    // Xero financial transformers
    this.transformers.set('xero.transactions', (xeroTransaction) => ({
      id: xeroTransaction.id,
      type: xeroTransaction.type || 'bank_transaction',
      amount: xeroTransaction.amount || 0,
      currency: 'AUD', // Assume AUD for ACT
      description: xeroTransaction.description || '',
      date: xeroTransaction.date,
      account_id: xeroTransaction.account?.id,
      project_allocation: this.inferProjectAllocation(xeroTransaction),
      program_category: xeroTransaction.act_relevance?.category || 'general',
      source_systems: ['xero'],
      created_at: xeroTransaction.timestamp,
      updated_at: xeroTransaction.xero_updated_at || xeroTransaction.timestamp
    }));
    
    console.log(`🔄 ${this.transformers.size} data transformers configured`);
  }

  setupRelationships() {
    // Define entity relationships for knowledge graph
    this.relationships.set('person_project', {
      type: 'WORKS_ON',
      properties: ['role', 'involvement_level', 'start_date', 'end_date']
    });
    
    this.relationships.set('project_organization', {
      type: 'FUNDED_BY',
      properties: ['amount', 'funding_type', 'start_date', 'conditions']
    });
    
    this.relationships.set('story_project', {
      type: 'RELATES_TO',
      properties: ['impact_connection', 'theme_overlap', 'verification_status']
    });
    
    this.relationships.set('person_story', {
      type: 'TELLS',
      properties: ['consent_level', 'cultural_protocol', 'sharing_permissions']
    });
    
    this.relationships.set('opportunity_project', {
      type: 'SUPPORTS',
      properties: ['alignment_score', 'funding_potential', 'strategic_fit']
    });
    
    this.relationships.set('action_project', {
      type: 'ADVANCES',
      properties: ['contribution_type', 'milestone_impact', 'completion_status']
    });
    
    this.relationships.set('artifact_project', {
      type: 'PRODUCES',
      properties: ['artifact_type', 'usage_rights', 'cultural_sensitivity']
    });
    
    console.log(`🔗 ${this.relationships.size} relationship types configured`);
  }

  async start() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      
      // Subscribe to all relevant topics
      const topics = [
        'act.notion.updates',
        'act.stories.created',
        'act.slack.messages',
        'act.finance.transactions',
        'act.gmail.intelligence'
      ];
      
      await this.consumer.subscribe({ topics, fromBeginning: false });
      
      // Start processing messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.processUnifiedMessage(topic, partition, message);
        },
      });
      
      console.log('✅ Unified Data Model started');
      
    } catch (error) {
      console.error('🚨 Failed to start Unified Data Model:', error);
      throw error;
    }
  }

  async processUnifiedMessage(topic, partition, message) {
    try {
      const key = message.key?.toString();
      const value = JSON.parse(message.value.toString());
      
      console.log(`🔄 Processing unified data from ${topic}`);
      
      // Determine entity type and transformer
      const { entityType, transformerKey } = this.determineEntityType(topic, value);
      
      if (!transformerKey || !this.transformers.has(transformerKey)) {
        console.warn(`No transformer found for ${topic}`);
        return;
      }
      
      // Transform data to unified format
      const transformer = this.transformers.get(transformerKey);
      const unifiedEntity = transformer(value);
      
      // Validate against schema
      const isValid = this.validateEntity(entityType, unifiedEntity);
      if (!isValid) {
        console.error(`Invalid entity data for ${entityType}`);
        return;
      }
      
      // Store in unified cache
      await this.storeUnifiedEntity(entityType, unifiedEntity);
      
      // Extract and store relationships
      const relationships = await this.extractRelationships(entityType, unifiedEntity, value);
      for (const relationship of relationships) {
        await this.storeRelationship(relationship);
      }
      
      // Generate insights
      const insights = await this.generateEntityInsights(entityType, unifiedEntity);
      for (const insight of insights) {
        await this.storeInsight(insight);
      }
      
      // Publish unified entity update
      await this.publishUnifiedUpdate(entityType, unifiedEntity);
      
    } catch (error) {
      console.error(`Error processing unified message from ${topic}:`, error);
    }
  }

  determineEntityType(topic, data) {
    const topicMappings = {
      'act.notion.updates': () => {
        if (data.projects) return { entityType: 'project', transformerKey: 'notion.projects' };
        if (data.people) return { entityType: 'person', transformerKey: 'notion.people' };
        if (data.organizations) return { entityType: 'organization', transformerKey: 'notion.organizations' };
        if (data.opportunities) return { entityType: 'opportunity', transformerKey: 'notion.opportunities' };
        return { entityType: 'unknown', transformerKey: null };
      },
      'act.stories.created': () => ({ entityType: 'story', transformerKey: 'supabase.stories' }),
      'act.slack.messages': () => ({ entityType: 'communication', transformerKey: 'slack.messages' }),
      'act.finance.transactions': () => ({ entityType: 'financial_transaction', transformerKey: 'xero.transactions' }),
      'act.gmail.intelligence': () => ({ entityType: 'communication', transformerKey: 'gmail.messages' })
    };
    
    const mapper = topicMappings[topic];
    return mapper ? mapper() : { entityType: 'unknown', transformerKey: null };
  }

  validateEntity(entityType, entity) {
    const schema = this.schemas[entityType];
    if (!schema) {
      console.warn(`No schema found for entity type: ${entityType}`);
      return false;
    }
    
    // Basic validation - check required fields exist
    const requiredFields = ['id', 'created_at', 'updated_at', 'source_systems'];
    for (const field of requiredFields) {
      if (!entity[field]) {
        console.error(`Missing required field ${field} for ${entityType}`);
        return false;
      }
    }
    
    return true;
  }

  async storeUnifiedEntity(entityType, entity) {
    const cacheKey = `unified:${entityType}:${entity.id}`;
    
    // Store in Redis with TTL
    await this.redis.setex(cacheKey, 86400, JSON.stringify({
      ...entity,
      unified_at: new Date().toISOString()
    }));
    
    // Also store in a searchable index
    await this.redis.sadd(`unified:entities:${entityType}`, entity.id);
    
    console.log(`💾 Stored unified ${entityType}: ${entity.id}`);
  }

  async extractRelationships(entityType, entity, originalData) {
    const relationships = [];
    
    // Extract relationships based on entity type
    switch (entityType) {
      case 'project':
        if (entity.lead_person_id) {
          relationships.push({
            from: { type: 'person', id: entity.lead_person_id },
            to: { type: 'project', id: entity.id },
            relationship: 'LEADS',
            properties: { role: 'project_lead' }
          });
        }
        break;
        
      case 'story':
        if (entity.storyteller_id) {
          relationships.push({
            from: { type: 'person', id: entity.storyteller_id },
            to: { type: 'story', id: entity.id },
            relationship: 'TELLS',
            properties: { consent_level: entity.consent_status }
          });
        }
        if (entity.related_projects) {
          for (const projectId of entity.related_projects) {
            relationships.push({
              from: { type: 'story', id: entity.id },
              to: { type: 'project', id: projectId },
              relationship: 'RELATES_TO',
              properties: { impact_connection: 'inferred' }
            });
          }
        }
        break;
        
      case 'financial_transaction':
        if (entity.project_allocation) {
          relationships.push({
            from: { type: 'financial_transaction', id: entity.id },
            to: { type: 'project', id: entity.project_allocation },
            relationship: 'FUNDS',
            properties: { amount: entity.amount }
          });
        }
        break;
    }
    
    return relationships;
  }

  async storeRelationship(relationship) {
    const relationshipKey = `relationship:${relationship.from.type}:${relationship.from.id}:${relationship.relationship}:${relationship.to.type}:${relationship.to.id}`;
    
    await this.redis.setex(relationshipKey, 86400, JSON.stringify({
      ...relationship,
      created_at: new Date().toISOString()
    }));
    
    // Add to relationship indexes
    await this.redis.sadd(`relationships:from:${relationship.from.type}:${relationship.from.id}`, relationshipKey);
    await this.redis.sadd(`relationships:to:${relationship.to.type}:${relationship.to.id}`, relationshipKey);
  }

  async generateEntityInsights(entityType, entity) {
    const insights = [];
    
    // Generate insights based on entity patterns
    switch (entityType) {
      case 'story':
        if (entity.themes && entity.themes.length > 0) {
          insights.push({
            id: `story_theme_${entity.id}_${Date.now()}`,
            type: 'theme_emergence',
            title: `New story themes identified: ${entity.themes.join(', ')}`,
            description: `Story "${entity.title}" introduces themes that may connect to existing projects`,
            confidence_score: 0.7,
            entities_involved: [{ type: 'story', id: entity.id }],
            recommendations: ['Consider connecting to relevant projects', 'Explore theme-based story clustering'],
            generated_by: 'unified_data_model',
            status: 'pending_review',
            source_systems: ['unified_etl'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        break;
        
      case 'financial_transaction':
        if (entity.amount > 10000) {
          insights.push({
            id: `large_transaction_${entity.id}_${Date.now()}`,
            type: 'financial_alert',
            title: `Large transaction detected: $${entity.amount}`,
            description: `Significant financial activity in ${entity.program_category}`,
            confidence_score: 0.9,
            entities_involved: [{ type: 'financial_transaction', id: entity.id }],
            recommendations: ['Verify budget allocation', 'Check approval processes'],
            generated_by: 'unified_data_model',
            status: 'pending_review',
            source_systems: ['unified_etl'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        break;
    }
    
    return insights;
  }

  async storeInsight(insight) {
    const insightKey = `insight:${insight.id}`;
    await this.redis.setex(insightKey, 604800, JSON.stringify(insight)); // 7 days
    
    // Add to insights index
    await this.redis.sadd(`insights:type:${insight.type}`, insight.id);
    await this.redis.sadd('insights:pending_review', insight.id);
    
    // Publish insight for immediate processing
    await this.producer.send({
      topic: 'act.farmhand.insights',
      messages: [{
        key: insight.id,
        value: JSON.stringify(insight)
      }]
    });
  }

  async publishUnifiedUpdate(entityType, entity) {
    await this.producer.send({
      topic: 'act.unified.entity_updates',
      messages: [{
        key: entity.id,
        value: JSON.stringify({
          entity_type: entityType,
          entity: entity,
          timestamp: new Date().toISOString()
        })
      }]
    });
  }

  calculateSentiment(text) {
    // Simple sentiment calculation - could be enhanced with ML
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'fantastic', 'wonderful'];
    const negativeWords = ['terrible', 'awful', 'hate', 'horrible', 'disappointing', 'frustrated'];
    
    const words = text.toLowerCase().split(' ');
    let score = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    }
    
    return Math.max(-1, Math.min(1, score / words.length));
  }

  extractRelatedEntities(text) {
    // Extract mentions of projects, people, etc. from text
    const entities = [];
    
    // Simple regex patterns - could be enhanced with NLP
    const projectPattern = /(goods|justicehub|picc|empathy ledger)/gi;
    const matches = text.match(projectPattern);
    
    if (matches) {
      for (const match of matches) {
        entities.push({
          type: 'project',
          name: match.toLowerCase(),
          confidence: 0.8
        });
      }
    }
    
    return entities;
  }

  inferProjectAllocation(transaction) {
    // Infer project allocation from transaction data
    const description = (transaction.description || '').toLowerCase();
    
    if (description.includes('goods')) return 'goods';
    if (description.includes('justice')) return 'justicehub';
    if (description.includes('picc')) return 'picc';
    if (description.includes('story') || description.includes('empathy')) return 'empathy_ledger';
    
    return 'general';
  }

  async getUnifiedEntity(entityType, entityId) {
    const cacheKey = `unified:${entityType}:${entityId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }

  async searchUnifiedEntities(entityType, query) {
    const entityIds = await this.redis.smembers(`unified:entities:${entityType}`);
    const entities = [];
    
    for (const entityId of entityIds) {
      const entity = await this.getUnifiedEntity(entityType, entityId);
      if (entity && this.entityMatchesQuery(entity, query)) {
        entities.push(entity);
      }
    }
    
    return entities;
  }

  entityMatchesQuery(entity, query) {
    const searchText = JSON.stringify(entity).toLowerCase();
    return searchText.includes(query.toLowerCase());
  }

  async disconnect() {
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
      await this.redis.quit();
      console.log('✅ Unified Data Model disconnected');
    } catch (error) {
      console.error('🚨 Error disconnecting Unified Data Model:', error);
    }
  }

  async healthCheck() {
    return {
      schemas_loaded: Object.keys(this.schemas).length,
      transformers_configured: this.transformers.size,
      relationships_defined: this.relationships.size,
      redis_connected: this.redis.status === 'ready'
    };
  }
}

export default UnifiedDataModel;