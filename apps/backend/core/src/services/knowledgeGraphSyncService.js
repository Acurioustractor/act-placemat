/**
 * Knowledge Graph Sync Service
 * Bidirectional sync between Supabase PostgreSQL and Neo4j Knowledge Graph
 */

import { createClient } from '@supabase/supabase-js';
import knowledgeGraphService from './knowledgeGraphService.js';
import tracingService, { traceSync, traceDatabase } from './tracingService.js';

class KnowledgeGraphSyncService {
  constructor() {
    this.supabase = null; // Will be initialized in initialize() method
    this.isInitialized = false;
    this.syncQueue = [];
    this.isProcessingQueue = false;
    
    // Track sync status
    this.lastSyncTimestamps = {
      users: null,
      projects: null,
      outcomes: null,
      events: null
    };
  }

  /**
   * Initialize the sync service
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Knowledge Graph Sync Service...');
      
      // Initialize Supabase client
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Ensure knowledge graph is initialized
      if (!knowledgeGraphService.isConnected) {
        await knowledgeGraphService.initialize();
      }

      // Test Supabase connection
      const { data, error } = await this.supabase.from('user_profiles').select('id').limit(1);
      if (error && error.code !== '42P01') { // Ignore table doesn't exist error
        throw error;
      }

      this.isInitialized = true;
      console.log('✅ Knowledge Graph Sync Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Knowledge Graph Sync Service:', error.message);
      return false;
    }
  }

  /**
   * Sync user data from Supabase to Neo4j
   */
  async syncUsersToKnowledgeGraph(options = {}) {
    const { limit = 100, since = null } = options;
    
    return await traceSync('users', 'supabase', 'neo4j', async (span) => {
      try {
        span.setAttributes({
          'sync.limit': limit,
          'sync.incremental': !!since,
          'sync.since': since || 'full'
        });
        
        console.log('👤 Syncing users from Supabase to Knowledge Graph...');
        
        const users = await traceDatabase('select', 'user_profiles', async () => {
          let query = this.supabase
            .from('user_profiles')
            .select('*')
            .eq('account_status', 'active')
            .limit(limit);

          if (since) {
            query = query.gt('updated_at', since);
          }

          const { data, error } = await query;
          if (error) throw error;
          return data;
        });

        let syncedCount = 0;
        let errorCount = 0;

        for (const user of users || []) {
          const userSpan = tracingService.startSpan('sync.user', {
            attributes: {
              'user.id': user.user_id,
              'user.email': user.email
            }
          });
          
          try {
            await this.syncUserToKnowledgeGraph(user);
            syncedCount++;
            userSpan.setStatus('OK');
          } catch (syncError) {
            console.warn(`Failed to sync user ${user.user_id}:`, syncError.message);
            errorCount++;
            userSpan.recordException(syncError);
            userSpan.setStatus('ERROR');
          } finally {
            userSpan.end();
          }
        }

        this.lastSyncTimestamps.users = new Date().toISOString();
        
        span.setAttributes({
          'sync.users_processed': users?.length || 0,
          'sync.users_synced': syncedCount,
          'sync.users_errors': errorCount
        });
        
        console.log(`✅ User sync completed: ${syncedCount} synced, ${errorCount} errors`);
        return {
          success: true,
          synced: syncedCount,
          errors: errorCount,
          total: users?.length || 0,
          processed: users?.length || 0
        };
      } catch (error) {
        console.error('❌ User sync failed:', error.message);
        span.recordException(error);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  /**
   * Sync single user to knowledge graph
   */
  async syncUserToKnowledgeGraph(userProfile) {
    const userData = {
      user_id: userProfile.user_id,
      email: userProfile.email,
      display_name: userProfile.display_name,
      account_status: userProfile.account_status,
      created_at: userProfile.created_at,
      last_active_at: userProfile.last_active_at,
      location: userProfile.location && Object.keys(userProfile.location).length > 0 ? userProfile.location : null,
      interests: Array.isArray(userProfile.interests) ? userProfile.interests : [],
      expertise_areas: Array.isArray(userProfile.expertise_areas) ? userProfile.expertise_areas : [],
      onboarding_completed: userProfile.onboarding_completed || false
    };

    return await knowledgeGraphService.syncUser(userData);
  }

  /**
   * Sync project data from Supabase to Neo4j
   */
  async syncProjectsToKnowledgeGraph(options = {}) {
    const { limit = 50, since = null } = options;
    
    return await traceSync('projects', 'supabase', 'neo4j', async (span) => {
      try {
        span.setAttributes({
          'sync.limit': limit,
          'sync.incremental': !!since,
          'sync.since': since || 'full'
        });
        
        console.log('🎯 Syncing projects from Supabase to Knowledge Graph...');
        
        const projects = await traceDatabase('select', 'projects', async () => {
          let query = this.supabase
            .from('projects')
            .select('*')
            .limit(limit);

          if (since) {
            query = query.gt('updated_at', since);
          }

          const { data, error } = await query;
          if (error) throw error;
          return data;
        });

        let syncedCount = 0;
        let errorCount = 0;

        for (const project of projects || []) {
          const projectSpan = tracingService.startSpan('sync.project', {
            attributes: {
              'project.id': project.id,
              'project.name': project.name || project.title,
              'project.status': project.status
            }
          });
          
          try {
            await this.syncProjectToKnowledgeGraph(project);
            syncedCount++;
            projectSpan.setStatus('OK');
          } catch (syncError) {
            console.warn(`Failed to sync project ${project.id}:`, syncError.message);
            errorCount++;
            projectSpan.recordException(syncError);
            projectSpan.setStatus('ERROR');
          } finally {
            projectSpan.end();
          }
        }

        this.lastSyncTimestamps.projects = new Date().toISOString();
        
        span.setAttributes({
          'sync.projects_processed': projects?.length || 0,
          'sync.projects_synced': syncedCount,
          'sync.projects_errors': errorCount
        });
        
        console.log(`✅ Project sync completed: ${syncedCount} synced, ${errorCount} errors`);
        return {
          success: true,
          synced: syncedCount,
          errors: errorCount,
          total: projects?.length || 0,
          processed: projects?.length || 0
        };
      } catch (error) {
        console.error('❌ Project sync failed:', error.message);
        span.recordException(error);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  /**
   * Sync single project to knowledge graph
   */
  async syncProjectToKnowledgeGraph(project) {
    const query = `
      MERGE (p:Project {project_id: $project_id})
      SET p.name = $name,
          p.slug = $slug,
          p.status = $status,
          p.summary = $summary,
          p.created_at = $created_at,
          p.updated_at = $updated_at,
          p.category = $category,
          p.location = $location
      RETURN p
    `;

    const parameters = {
      project_id: project.id,
      name: project.name || project.title || 'Untitled Project',
      slug: project.slug || project.name?.toLowerCase().replace(/\s+/g, '-') || 'untitled',
      status: project.status || 'active',
      summary: project.summary || project.description || '',
      created_at: project.created_at,
      updated_at: project.updated_at,
      category: project.category || 'community',
      location: project.location || {}
    };

    return await knowledgeGraphService.executeWrite(query, parameters);
  }

  /**
   * Sync project outcomes to create outcome relationships
   */
  async syncProjectOutcomes(options = {}) {
    const { limit = 50, since = null } = options;
    
    try {
      console.log('📊 Syncing project outcomes to Knowledge Graph...');
      
      let query = this.supabase
        .from('project_outcomes')
        .select('*')
        .eq('verification_status', 'verified')
        .limit(limit);

      if (since) {
        query = query.gt('updated_at', since);
      }

      const { data: outcomes, error } = await query;
      
      if (error) {
        throw error;
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const outcome of outcomes || []) {
        try {
          await this.syncOutcomeToKnowledgeGraph(outcome);
          syncedCount++;
        } catch (syncError) {
          console.warn(`Failed to sync outcome ${outcome.id}:`, syncError.message);
          errorCount++;
        }
      }

      this.lastSyncTimestamps.outcomes = new Date().toISOString();
      
      console.log(`✅ Outcome sync completed: ${syncedCount} synced, ${errorCount} errors`);
      return {
        success: true,
        synced: syncedCount,
        errors: errorCount,
        total: outcomes?.length || 0
      };
    } catch (error) {
      console.error('❌ Outcome sync failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync single outcome to knowledge graph
   */
  async syncOutcomeToKnowledgeGraph(outcome) {
    const queries = [];

    // Create outcome node
    queries.push({
      query: `
        MERGE (o:Outcome {outcome_id: $outcome_id})
        SET o.title = $title,
            o.description = $description,
            o.outcome_type = $outcome_type,
            o.outcome_category = $outcome_category,
            o.verification_status = $verification_status,
            o.status = $status,
            o.confidence_level = $confidence_level,
            o.created_at = $created_at,
            o.updated_at = $updated_at
        RETURN o
      `,
      parameters: {
        outcome_id: outcome.id,
        title: outcome.title,
        description: outcome.description,
        outcome_type: outcome.outcome_type,
        outcome_category: outcome.outcome_category,
        verification_status: outcome.verification_status,
        status: outcome.status,
        confidence_level: outcome.confidence_level,
        created_at: outcome.created_at,
        updated_at: outcome.updated_at
      }
    });

    // Link outcome to project if project_id exists
    if (outcome.project_id) {
      queries.push({
        query: `
          MATCH (p:Project {project_id: $project_id})
          MATCH (o:Outcome {outcome_id: $outcome_id})
          MERGE (p)-[r:PRODUCES_OUTCOME]->(o)
          SET r.created_at = $created_at
          RETURN p, r, o
        `,
        parameters: {
          project_id: outcome.project_id,
          outcome_id: outcome.id,
          created_at: outcome.created_at
        }
      });
    }

    return await knowledgeGraphService.executeTransaction(queries);
  }

  /**
   * Full bidirectional sync
   */
  async performFullSync(options = {}) {
    const { incremental = false } = options;
    
    try {
      console.log('🔄 Starting full bidirectional sync...');
      
      const syncOptions = incremental ? {
        since: this.getLastSyncTimestamp()
      } : {};

      const results = {
        users: await this.syncUsersToKnowledgeGraph(syncOptions),
        projects: await this.syncProjectsToKnowledgeGraph(syncOptions),
        outcomes: await this.syncProjectOutcomes(syncOptions)
      };

      // Sync knowledge graph insights back to Supabase
      await this.syncKnowledgeGraphInsightsToSupabase();

      console.log('✅ Full bidirectional sync completed');
      return {
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Full sync failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync knowledge graph insights back to Supabase
   */
  async syncKnowledgeGraphInsightsToSupabase() {
    try {
      console.log('💡 Syncing knowledge graph insights back to Supabase...');

      // Get collaboration recommendations for active users
      const { data: activeUsers } = await this.supabase
        .from('user_profiles')
        .select('user_id')
        .eq('account_status', 'active')
        .limit(20);

      let insightsCount = 0;

      for (const user of activeUsers || []) {
        try {
          // Get collaborator recommendations
          const collaborators = await knowledgeGraphService.findCollaborators(user.user_id, 5);
          
          if (collaborators.success && collaborators.records?.length > 0) {
            // Store recommendations in Supabase
            await this.storeCollaborationRecommendations(user.user_id, collaborators.records);
            insightsCount++;
          }
        } catch (error) {
          console.warn(`Failed to sync insights for user ${user.user_id}:`, error.message);
        }
      }

      console.log(`✅ Synced insights for ${insightsCount} users`);
      return { success: true, insights_synced: insightsCount };
    } catch (error) {
      console.error('❌ Failed to sync insights to Supabase:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store collaboration recommendations in Supabase
   */
  async storeCollaborationRecommendations(userId, recommendations) {
    const recommendationData = {
      user_id: userId,
      recommendation_type: 'collaboration',
      recommendations: recommendations.map(rec => ({
        user_id: rec.user_id,
        display_name: rec.display_name,
        collaboration_score: rec.collaboration_score,
        shared_interests: rec.shared_interests,
        skill_teaching_potential: rec.skill_teaching_potential,
        skill_learning_potential: rec.skill_learning_potential
      })),
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    // Upsert recommendations (assumes we have a recommendations table)
    const { error } = await this.supabase
      .from('ai_recommendations')
      .upsert(recommendationData, { 
        onConflict: 'user_id,recommendation_type',
        ignoreDuplicates: false 
      });

    if (error) {
      console.warn('Failed to store recommendations:', error.message);
    }
  }

  /**
   * Get the latest sync timestamp for incremental syncing
   */
  getLastSyncTimestamp() {
    const timestamps = Object.values(this.lastSyncTimestamps).filter(Boolean);
    if (timestamps.length === 0) return null;
    return Math.min(...timestamps.map(ts => new Date(ts).getTime()));
  }

  /**
   * Add sync operation to queue for processing
   */
  queueSync(operation) {
    this.syncQueue.push({
      operation,
      timestamp: new Date().toISOString(),
      attempts: 0
    });

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process queued sync operations
   */
  async processQueue() {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.syncQueue.length > 0) {
        const syncOperation = this.syncQueue.shift();
        
        try {
          await syncOperation.operation();
          console.log('✅ Queued sync operation completed');
        } catch (error) {
          syncOperation.attempts++;
          
          // Retry up to 3 times
          if (syncOperation.attempts < 3) {
            console.warn(`Sync operation failed, retrying (${syncOperation.attempts}/3):`, error.message);
            this.syncQueue.unshift(syncOperation); // Add back to front of queue
          } else {
            console.error('❌ Sync operation failed after 3 attempts:', error.message);
          }
        }

        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get sync service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      last_sync_timestamps: this.lastSyncTimestamps,
      queue_length: this.syncQueue.length,
      processing_queue: this.isProcessingQueue,
      knowledge_graph_connected: knowledgeGraphService.isConnected
    };
  }

  /**
   * Close all connections
   */
  async close() {
    console.log('🔄 Closing Knowledge Graph Sync Service...');
    // Supabase client doesn't need explicit closing
    // Knowledge graph service will be closed by its own close method
    this.isInitialized = false;
    console.log('✅ Knowledge Graph Sync Service closed');
  }
}

// Create singleton instance
const knowledgeGraphSyncService = new KnowledgeGraphSyncService();

export default knowledgeGraphSyncService;