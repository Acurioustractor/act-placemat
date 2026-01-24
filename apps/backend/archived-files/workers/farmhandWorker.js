/**
 * ACT Farmhand AI Agent Data Pipeline Worker
 * Processes real-time data streams from all integrated systems
 */

import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import ACTFarmhandAgent from '../services/actFarmhandAgent.js';
import notionService from '../services/notionService.js';
import { createClient } from '@supabase/supabase-js';

class FarmhandWorker {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'act-farmhand-worker',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    
    this.consumer = this.kafka.consumer({ groupId: 'act-farmhand-group' });
    this.producer = this.kafka.producer();
    
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.agent = new ACTFarmhandAgent();
    this.running = false;
    this.topics = [
      'act.notion.updates',
      'act.stories.created',
      'act.gmail.intelligence',
      'act.slack.messages',
      'act.compliance.alerts',
      'act.finance.transactions'
    ];
    
    console.log('🌾 ACT Farmhand Worker initialized');
  }

  async start() {
    try {
      console.log('🚜 Starting ACT Farmhand data pipeline worker...');
      
      // Initialize Kafka producer
      await this.producer.connect();
      
      // Initialize Kafka consumer
      await this.consumer.connect();
      await this.consumer.subscribe({ 
        topics: this.topics,
        fromBeginning: false 
      });
      
      // Start processing messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.processMessage(topic, partition, message);
        },
      });
      
      // Start background processes
      this.startBackgroundProcesses();
      
      this.running = true;
      console.log('✅ ACT Farmhand Worker started successfully');
      
      // Graceful shutdown handling
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      console.error('🚨 Failed to start Farmhand Worker:', error);
      process.exit(1);
    }
  }

  async processMessage(topic, partition, message) {
    try {
      const key = message.key?.toString();
      const value = JSON.parse(message.value.toString());
      const timestamp = new Date(parseInt(message.timestamp));
      
      console.log(`📨 Processing ${topic} message:`, { key, timestamp });
      
      // Route message to appropriate skill pod
      const skillPodResponse = await this.routeToSkillPod(topic, value);
      
      // Store processed data in Redis for quick access
      await this.cacheProcessedData(topic, key, skillPodResponse);
      
      // Check if this data triggers any alerts or actions
      const alerts = await this.checkForAlerts(topic, value, skillPodResponse);
      
      if (alerts.length > 0) {
        await this.publishAlerts(alerts);
      }
      
      // Update knowledge graph if relevant
      if (this.isKnowledgeGraphRelevant(topic)) {
        await this.updateKnowledgeGraph(value, skillPodResponse);
      }
      
    } catch (error) {
      console.error(`🚨 Error processing message from ${topic}:`, error);
      // Dead letter queue could be added here
    }
  }

  async routeToSkillPod(topic, data) {
    const topicPodMapping = {
      'act.notion.updates': ['knowledgeLibrarian', 'dnaGuardian'],
      'act.stories.created': ['storyWeaver', 'impactAnalyst'],
      'act.gmail.intelligence': ['opportunityScout', 'knowledgeLibrarian'],
      'act.slack.messages': ['dnaGuardian', 'systemsSeeder'],
      'act.compliance.alerts': ['complianceSentry'],
      'act.finance.transactions': ['financeCopilot']
    };
    
    const relevantPods = topicPodMapping[topic] || ['knowledgeLibrarian'];
    const responses = {};
    
    for (const podName of relevantPods) {
      const pod = this.agent.skillPods[podName];
      if (pod) {
        try {
          const response = await pod.process(`Process ${topic} data`, { [topic]: data });
          responses[podName] = response;
        } catch (error) {
          console.warn(`⚠️  ${podName} processing failed:`, error.message);
          responses[podName] = { error: error.message };
        }
      }
    }
    
    return responses;
  }

  async cacheProcessedData(topic, key, data) {
    const cacheKey = `farmhand:processed:${topic}:${key || 'unknown'}`;
    const ttl = 86400; // 24 hours
    
    await this.redis.setex(cacheKey, ttl, JSON.stringify({
      timestamp: new Date().toISOString(),
      topic,
      key,
      data
    }));
  }

  async checkForAlerts(topic, originalData, skillPodResponses) {
    const alerts = [];
    
    // DNA Guardian alerts for alignment issues
    const dnaResponse = skillPodResponses.dnaGuardian;
    if (dnaResponse?.flags?.length > 0) {
      alerts.push({
        type: 'alignment_warning',
        priority: 'high',
        message: `ACT values alignment issue detected in ${topic}`,
        details: dnaResponse.flags,
        timestamp: new Date().toISOString()
      });
    }
    
    // Compliance Sentry alerts for deadlines
    const complianceResponse = skillPodResponses.complianceSentry;
    if (complianceResponse?.alerts?.length > 0) {
      alerts.push(...complianceResponse.alerts.map(alert => ({
        type: 'compliance_alert',
        priority: 'urgent',
        ...alert,
        timestamp: new Date().toISOString()
      })));
    }
    
    // Finance Copilot alerts for budget issues
    const financeResponse = skillPodResponses.financeCopilot;
    if (financeResponse?.budget_warnings?.length > 0) {
      alerts.push(...financeResponse.budget_warnings.map(warning => ({
        type: 'budget_warning',
        priority: 'medium',
        ...warning,
        timestamp: new Date().toISOString()
      })));
    }
    
    // Opportunity Scout alerts for time-sensitive opportunities
    const opportunityResponse = skillPodResponses.opportunityScout;
    if (opportunityResponse?.urgent_opportunities?.length > 0) {
      alerts.push(...opportunityResponse.urgent_opportunities.map(opp => ({
        type: 'opportunity_alert',
        priority: 'high',
        message: `Time-sensitive opportunity: ${opp.name}`,
        details: opp,
        timestamp: new Date().toISOString()
      })));
    }
    
    return alerts;
  }

  async publishAlerts(alerts) {
    for (const alert of alerts) {
      try {
        await this.producer.send({
          topic: 'act.farmhand.alerts',
          messages: [{
            key: `alert_${Date.now()}`,
            value: JSON.stringify(alert)
          }]
        });
        
        // Also store in Redis for immediate access
        await this.redis.lpush('farmhand:alerts', JSON.stringify(alert));
        await this.redis.expire('farmhand:alerts', 604800); // 7 days
        
        console.log(`🚨 Alert published: ${alert.type} - ${alert.message}`);
      } catch (error) {
        console.error('Failed to publish alert:', error);
      }
    }
  }

  isKnowledgeGraphRelevant(topic) {
    return [
      'act.notion.updates',
      'act.stories.created',
      'act.gmail.intelligence'
    ].includes(topic);
  }

  async updateKnowledgeGraph(data, skillPodResponses) {
    // This would integrate with Neo4j to update the knowledge graph
    // For now, we'll cache the relationships
    try {
      const relationships = this.extractRelationships(data, skillPodResponses);
      
      if (relationships.length > 0) {
        await this.redis.lpush('farmhand:knowledge_updates', JSON.stringify({
          timestamp: new Date().toISOString(),
          relationships
        }));
        
        console.log(`📊 Updated knowledge graph with ${relationships.length} relationships`);
      }
    } catch (error) {
      console.warn('Failed to update knowledge graph:', error);
    }
  }

  extractRelationships(data, skillPodResponses) {
    const relationships = [];
    
    // Extract relationships from Knowledge Librarian response
    const knowledgeResponse = skillPodResponses.knowledgeLibrarian;
    if (knowledgeResponse?.relevant_projects?.length > 0) {
      relationships.push(...knowledgeResponse.relevant_projects.map(project => ({
        type: 'project_connection',
        source: data.id || data.name,
        target: project.id,
        strength: 0.8
      })));
    }
    
    if (knowledgeResponse?.relevant_people?.length > 0) {
      relationships.push(...knowledgeResponse.relevant_people.map(person => ({
        type: 'person_connection',
        source: data.id || data.name,
        target: person.id,
        strength: 0.7
      })));
    }
    
    // Extract relationships from Story Weaver response
    const storyResponse = skillPodResponses.storyWeaver;
    if (storyResponse?.story_themes?.length > 0) {
      relationships.push(...storyResponse.story_themes.map(theme => ({
        type: 'theme_connection',
        source: data.id || data.title,
        target: theme,
        strength: 0.6
      })));
    }
    
    return relationships;
  }

  startBackgroundProcesses() {
    // Weekly intelligence sprint
    this.weeklySprintInterval = setInterval(async () => {
      try {
        console.log('🌾 Running weekly intelligence sprint...');
        const sprintReport = await this.agent.runWeeklySprint();
        
        await this.producer.send({
          topic: 'act.farmhand.weekly_sprint',
          messages: [{
            key: `sprint_${Date.now()}`,
            value: JSON.stringify(sprintReport)
          }]
        });
        
        console.log('✅ Weekly sprint completed');
      } catch (error) {
        console.error('🚨 Weekly sprint failed:', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
    
    // Hourly data refresh
    this.dataRefreshInterval = setInterval(async () => {
      try {
        console.log('🔄 Refreshing Farm data...');
        await this.refreshAllData();
        console.log('✅ Data refresh completed');
      } catch (error) {
        console.error('🚨 Data refresh failed:', error);
      }
    }, 60 * 60 * 1000); // Hourly
    
    // System health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async refreshAllData() {
    const tasks = [
      this.refreshNotionData(),
      this.refreshStoriesData(),
      this.checkComplianceDeadlines(),
      this.updateFinancialMetrics()
    ];
    
    const results = await Promise.allSettled(tasks);
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      console.warn(`⚠️  ${failures.length} data refresh tasks failed`);
      failures.forEach(failure => console.warn(failure.reason));
    }
  }

  async refreshNotionData() {
    try {
      const [projects, people, organizations, opportunities] = await Promise.all([
        notionService.getProjects(),
        notionService.getPeople(),
        notionService.getOrganizations(),
        notionService.getOpportunities()
      ]);
      
      // Publish updates to Kafka
      await this.producer.send({
        topic: 'act.notion.updates',
        messages: [{
          key: 'bulk_refresh',
          value: JSON.stringify({ projects, people, organizations, opportunities })
        }]
      });
    } catch (error) {
      console.error('Failed to refresh Notion data:', error);
      throw error;
    }
  }

  async refreshStoriesData() {
    try {
      const { data: stories } = await this.supabase
        .from('stories')
        .select('*')
        .neq('privacy_level', 'private')
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (stories && stories.length > 0) {
        await this.producer.send({
          topic: 'act.stories.created',
          messages: stories.map(story => ({
            key: story.id.toString(),
            value: JSON.stringify(story)
          }))
        });
      }
    } catch (error) {
      console.error('Failed to refresh stories data:', error);
      throw error;
    }
  }

  async checkComplianceDeadlines() {
    // This would integrate with compliance tracking systems
    console.log('⚖️  Checking compliance deadlines...');
  }

  async updateFinancialMetrics() {
    // This would integrate with Xero or other financial systems
    console.log('💰 Updating financial metrics...');
  }

  async performHealthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      kafka: { status: 'unknown' },
      redis: { status: 'unknown' },
      supabase: { status: 'unknown' },
      openai: { status: this.agent.openaiAvailable ? 'healthy' : 'disabled' }
    };
    
    try {
      // Check Kafka
      await this.producer.send({
        topic: 'act.health.check',
        messages: [{ key: 'ping', value: JSON.stringify({ timestamp: Date.now() }) }]
      });
      health.kafka.status = 'healthy';
    } catch (error) {
      health.kafka.status = 'unhealthy';
      health.kafka.error = error.message;
    }
    
    try {
      // Check Redis
      await this.redis.ping();
      health.redis.status = 'healthy';
    } catch (error) {
      health.redis.status = 'unhealthy';
      health.redis.error = error.message;
    }
    
    try {
      // Check Supabase
      const { data } = await this.supabase.from('stories').select('count').limit(1);
      health.supabase.status = 'healthy';
    } catch (error) {
      health.supabase.status = 'unhealthy';
      health.supabase.error = error.message;
    }
    
    // Cache health status
    await this.redis.setex('farmhand:health', 300, JSON.stringify(health));
    
    const unhealthyServices = Object.entries(health)
      .filter(([key, value]) => key !== 'timestamp' && value.status === 'unhealthy')
      .map(([key]) => key);
    
    if (unhealthyServices.length > 0) {
      console.warn(`⚠️  Unhealthy services: ${unhealthyServices.join(', ')}`);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down ACT Farmhand Worker...');
    this.running = false;
    
    // Clear intervals
    if (this.weeklySprintInterval) clearInterval(this.weeklySprintInterval);
    if (this.dataRefreshInterval) clearInterval(this.dataRefreshInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
      await this.redis.quit();
      console.log('✅ ACT Farmhand Worker shut down gracefully');
    } catch (error) {
      console.error('🚨 Error during shutdown:', error);
    }
    
    process.exit(0);
  }
}

// Start the worker if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new FarmhandWorker();
  worker.start().catch(error => {
    console.error('🚨 Failed to start Farmhand Worker:', error);
    process.exit(1);
  });
}

export default FarmhandWorker;