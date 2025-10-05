/**
 * Notion Sync Engine
 * Real-time synchronization between Notion and all ACT systems
 * Implements webhooks, polling, and intelligent caching
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import cron from 'node-cron';
import crypto from 'crypto';

class NotionSyncEngine extends EventEmitter {
  constructor() {
    super();
    
    // Initialize Notion client
    this.notion = new Client({
      auth: process.env.NOTION_INTEGRATION_TOKEN || process.env.NOTION_TOKEN,
    });
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Initialize Redis for caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });
    
    // Database configurations
    this.databases = {
      projects: process.env.NOTION_PROJECTS_DATABASE_ID,
      people: process.env.NOTION_PEOPLE_DATABASE_ID,
      opportunities: process.env.NOTION_OPPORTUNITIES_DATABASE_ID,
      organizations: process.env.NOTION_ORGANIZATIONS_DATABASE_ID,
      stories: process.env.NOTION_STORIES_DATABASE_ID || null,
      activities: process.env.NOTION_ACTIVITIES_DATABASE_ID,
      artifacts: process.env.NOTION_ARTIFACTS_DATABASE_ID
    };
    
    // Sync state tracking
    this.syncState = new Map();
    this.syncQueue = [];
    this.isProcessing = false;
    
    // WebSocket connections for real-time updates
    this.wsConnections = new Set();
    
    // Historical tracking
    this.historyBuffer = [];
    
    console.log('🔄 Notion Sync Engine initialized');
    this.setupScheduledSync();
    this.setupWebhookEndpoints();
  }

  /**
   * Setup webhook endpoints for Notion updates
   */
  setupWebhookEndpoints() {
    // This would be registered with Notion's webhook API when available
    // For now, we'll use polling with change detection
    console.log('📡 Webhook endpoints configured (using polling fallback)');
  }

  /**
   * Setup scheduled synchronization
   */
  setupScheduledSync() {
    // Check for updates every minute
    cron.schedule('* * * * *', () => {
      this.performIncrementalSync();
    });
    
    // Full sync every hour
    cron.schedule('0 * * * *', () => {
      this.performFullSync();
    });
    
    // Generate daily history snapshot
    cron.schedule('0 0 * * *', () => {
      this.createDailySnapshot();
    });
    
    console.log('⏰ Scheduled sync tasks configured');
  }

  /**
   * Perform incremental sync (changes only)
   */
  async performIncrementalSync() {
    try {
      console.log('🔄 Starting incremental sync...');
      const startTime = Date.now();
      
      for (const [dbName, dbId] of Object.entries(this.databases)) {
        if (!dbId) continue;
        
        const lastSync = await this.getLastSyncTime(dbName);
        const changes = await this.fetchChanges(dbId, lastSync);
        
        if (changes.length > 0) {
          console.log(`📝 Found ${changes.length} changes in ${dbName}`);
          await this.processChanges(dbName, changes);
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Incremental sync completed in ${duration}ms`);
      
    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
      this.emit('sync-error', error);
    }
  }

  /**
   * Perform full synchronization
   */
  async performFullSync() {
    try {
      console.log('🔄 Starting full sync...');
      const startTime = Date.now();
      
      const syncResults = {
        projects: 0,
        people: 0,
        opportunities: 0,
        organizations: 0,
        stories: 0,
        total: 0
      };
      
      for (const [dbName, dbId] of Object.entries(this.databases)) {
        if (!dbId) continue;
        
        const items = await this.fetchAllItems(dbId);
        syncResults[dbName] = items.length;
        syncResults.total += items.length;
        
        await this.syncToSupabase(dbName, items);
        await this.updateCache(dbName, items);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Full sync completed: ${syncResults.total} items in ${duration}ms`);
      
      // Emit sync complete event
      this.emit('sync-complete', syncResults);
      
      // Broadcast to WebSocket clients
      this.broadcastUpdate({
        type: 'sync_complete',
        data: syncResults,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      this.emit('sync-error', error);
    }
  }

  /**
   * Fetch changes from Notion since last sync
   */
  async fetchChanges(databaseId, lastSync) {
    try {
      const response = await this.notion.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        page_size: 100
      });
      
      return response.results;
    } catch (error) {
      console.error(`Failed to fetch changes from ${databaseId}:`, error);
      return [];
    }
  }

  /**
   * Fetch all items from a Notion database
   */
  async fetchAllItems(databaseId) {
    const items = [];
    let hasMore = true;
    let startCursor = undefined;
    
    while (hasMore) {
      try {
        const response = await this.notion.search({
          filter: {
            property: 'object',
            value: 'page'
          },
          start_cursor: startCursor,
          page_size: 100
        });
        
        items.push(...response.results);
        hasMore = response.has_more;
        startCursor = response.next_cursor;
        
      } catch (error) {
        console.error(`Failed to fetch items from ${databaseId}:`, error);
        hasMore = false;
      }
    }
    
    return items;
  }

  /**
   * Process changes and sync to all systems
   */
  async processChanges(dbName, changes) {
    for (const change of changes) {
      try {
        // Transform Notion data to internal format
        const transformedData = await this.transformNotionData(dbName, change);
        
        // Create historical snapshot
        await this.createSnapshot(dbName, change.id, transformedData);
        
        // Sync to Supabase
        await this.upsertToSupabase(dbName, transformedData);
        
        // Update cache
        await this.updateCacheItem(dbName, change.id, transformedData);
        
        // Emit change event
        this.emit('data-changed', {
          database: dbName,
          id: change.id,
          data: transformedData
        });
        
        // Broadcast real-time update
        this.broadcastUpdate({
          type: `${dbName}_update`,
          data: transformedData,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`Failed to process change for ${dbName}:${change.id}:`, error);
      }
    }
  }

  /**
   * Transform Notion data to internal schema
   */
  async transformNotionData(dbName, notionPage) {
    const properties = notionPage.properties;
    const baseData = {
      id: notionPage.id,
      notion_url: notionPage.url,
      created_at: notionPage.created_time,
      updated_at: notionPage.last_edited_time,
      archived: notionPage.archived
    };
    
    switch (dbName) {
      case 'projects':
        return {
          ...baseData,
          title: this.extractTitle(properties.Name || properties.Title),
          status: this.extractSelect(properties.Status),
          impact_area: this.extractMultiSelect(properties['Impact Area']),
          start_date: this.extractDate(properties['Start Date']),
          end_date: this.extractDate(properties['End Date']),
          description: await this.extractRichText(notionPage.id),
          goals: this.extractMultiSelect(properties.Goals),
          team: await this.extractRelations(properties.Team),
          organizations: await this.extractRelations(properties.Organizations),
          metrics: {
            people_impacted: this.extractNumber(properties['People Impacted']),
            funds_raised: this.extractNumber(properties['Funds Raised']),
            volunteer_hours: this.extractNumber(properties['Volunteer Hours'])
          },
          tags: this.extractMultiSelect(properties.Tags)
        };
      
      case 'people':
        return {
          ...baseData,
          full_name: this.extractTitle(properties.Name),
          email: this.extractEmail(properties.Email),
          role: this.extractSelect(properties.Role),
          bio: await this.extractRichText(notionPage.id),
          skills: this.extractMultiSelect(properties.Skills),
          interests: this.extractMultiSelect(properties.Interests),
          organization: await this.extractRelation(properties.Organization),
          projects: await this.extractRelations(properties.Projects),
          location: this.extractText(properties.Location),
          engagement_score: this.extractNumber(properties['Engagement Score']),
          joined_date: this.extractDate(properties['Joined Date'])
        };
      
      case 'stories':
        return {
          ...baseData,
          title: this.extractTitle(properties.Title),
          storyteller: await this.extractRelation(properties.Storyteller),
          content: await this.extractRichText(notionPage.id),
          themes: this.extractMultiSelect(properties.Themes),
          location: this.extractText(properties.Location),
          date_collected: this.extractDate(properties['Date Collected']),
          published: this.extractCheckbox(properties.Published),
          featured: this.extractCheckbox(properties.Featured),
          media_urls: this.extractFiles(properties.Media),
          related_projects: await this.extractRelations(properties['Related Projects']),
          impact_metrics: {
            views: this.extractNumber(properties.Views),
            shares: this.extractNumber(properties.Shares),
            engagement_rate: this.extractNumber(properties['Engagement Rate'])
          }
        };
      
      case 'opportunities':
        return {
          ...baseData,
          title: this.extractTitle(properties.Title || properties.Name),
          type: this.extractSelect(properties.Type),
          status: this.extractSelect(properties.Status),
          deadline: this.extractDate(properties.Deadline),
          value: this.extractNumber(properties.Value),
          description: await this.extractRichText(notionPage.id),
          requirements: this.extractMultiSelect(properties.Requirements),
          assigned_to: await this.extractRelations(properties['Assigned To']),
          related_projects: await this.extractRelations(properties['Related Projects']),
          alignment_score: this.extractNumber(properties['Alignment Score']),
          success_probability: this.extractNumber(properties['Success Probability']),
          effort_required: this.extractSelect(properties['Effort Required']),
          strategic_importance: this.extractNumber(properties['Strategic Importance'])
        };
      
      case 'organizations':
        return {
          ...baseData,
          name: this.extractTitle(properties.Name),
          type: this.extractSelect(properties.Type),
          description: await this.extractRichText(notionPage.id),
          website: this.extractUrl(properties.Website),
          contact_person: await this.extractRelation(properties['Contact Person']),
          partnership_status: this.extractSelect(properties['Partnership Status']),
          collaboration_areas: this.extractMultiSelect(properties['Collaboration Areas']),
          projects: await this.extractRelations(properties.Projects),
          funding_provided: this.extractNumber(properties['Funding Provided']),
          impact_alignment: {
            justice: this.extractNumber(properties['Justice Alignment']),
            land: this.extractNumber(properties['Land Alignment']),
            story: this.extractNumber(properties['Story Alignment'])
          }
        };
      
      default:
        return {
          ...baseData,
          properties: this.extractAllProperties(properties)
        };
    }
  }

  /**
   * Property extraction helpers
   */
  extractTitle(property) {
    if (!property || !property.title) return '';
    return property.title[0]?.plain_text || '';
  }
  
  extractText(property) {
    if (!property || !property.rich_text) return '';
    return property.rich_text[0]?.plain_text || '';
  }
  
  extractNumber(property) {
    return property?.number || 0;
  }
  
  extractSelect(property) {
    return property?.select?.name || null;
  }
  
  extractMultiSelect(property) {
    if (!property || !property.multi_select) return [];
    return property.multi_select.map(item => item.name);
  }
  
  extractDate(property) {
    return property?.date?.start || null;
  }
  
  extractCheckbox(property) {
    return property?.checkbox || false;
  }
  
  extractEmail(property) {
    return property?.email || null;
  }
  
  extractUrl(property) {
    return property?.url || null;
  }
  
  extractFiles(property) {
    if (!property || !property.files) return [];
    return property.files.map(file => file.file?.url || file.external?.url);
  }
  
  async extractRelation(property) {
    if (!property || !property.relation || property.relation.length === 0) return null;
    return property.relation[0].id;
  }
  
  async extractRelations(property) {
    if (!property || !property.relation) return [];
    return property.relation.map(rel => rel.id);
  }
  
  async extractRichText(pageId) {
    try {
      const blocks = await this.notion.blocks.children.list({
        block_id: pageId,
        page_size: 100
      });
      
      return blocks.results
        .filter(block => block.type === 'paragraph')
        .map(block => block.paragraph.rich_text.map(text => text.plain_text).join(''))
        .join('\n');
    } catch (error) {
      console.error(`Failed to extract rich text for ${pageId}:`, error);
      return '';
    }
  }
  
  extractAllProperties(properties) {
    const result = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value.type === 'title') {
        result[key] = this.extractTitle(value);
      } else if (value.type === 'rich_text') {
        result[key] = this.extractText(value);
      } else if (value.type === 'number') {
        result[key] = this.extractNumber(value);
      } else if (value.type === 'select') {
        result[key] = this.extractSelect(value);
      } else if (value.type === 'multi_select') {
        result[key] = this.extractMultiSelect(value);
      } else if (value.type === 'date') {
        result[key] = this.extractDate(value);
      } else if (value.type === 'checkbox') {
        result[key] = this.extractCheckbox(value);
      } else if (value.type === 'email') {
        result[key] = this.extractEmail(value);
      } else if (value.type === 'url') {
        result[key] = this.extractUrl(value);
      } else if (value.type === 'files') {
        result[key] = this.extractFiles(value);
      }
    }
    return result;
  }

  /**
   * Sync data to Supabase
   */
  async syncToSupabase(dbName, items) {
    const tableName = this.getSupabaseTable(dbName);
    if (!tableName) return;
    
    try {
      // Batch upsert for efficiency
      const { data, error } = await this.supabase
        .from(tableName)
        .upsert(items, { onConflict: 'notion_id' });
      
      if (error) {
        console.error(`Failed to sync ${dbName} to Supabase:`, error);
      } else {
        console.log(`✅ Synced ${items.length} ${dbName} to Supabase`);
      }
    } catch (error) {
      console.error(`Supabase sync error for ${dbName}:`, error);
    }
  }

  /**
   * Upsert single item to Supabase
   */
  async upsertToSupabase(dbName, item) {
    const tableName = this.getSupabaseTable(dbName);
    if (!tableName) return;
    
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .upsert({
          ...item,
          notion_id: item.id,
          synced_at: new Date().toISOString()
        }, { onConflict: 'notion_id' });
      
      if (error) {
        console.error(`Failed to upsert ${dbName}:${item.id} to Supabase:`, error);
      }
    } catch (error) {
      console.error(`Supabase upsert error for ${dbName}:${item.id}:`, error);
    }
  }

  /**
   * Get Supabase table name for database
   */
  getSupabaseTable(dbName) {
    const tableMap = {
      projects: 'projects',
      people: 'people',
      stories: 'stories',
      opportunities: 'opportunities',
      organizations: 'organizations',
      activities: 'activities',
      artifacts: 'artifacts'
    };
    return tableMap[dbName];
  }

  /**
   * Update Redis cache
   */
  async updateCache(dbName, items) {
    const cacheKey = `notion:${dbName}:all`;
    await this.redis.set(cacheKey, JSON.stringify(items), 'EX', 3600); // 1 hour TTL
    
    // Also cache individual items
    for (const item of items) {
      const itemKey = `notion:${dbName}:${item.id}`;
      await this.redis.set(itemKey, JSON.stringify(item), 'EX', 3600);
    }
  }

  /**
   * Update single cache item
   */
  async updateCacheItem(dbName, itemId, item) {
    const itemKey = `notion:${dbName}:${itemId}`;
    await this.redis.set(itemKey, JSON.stringify(item), 'EX', 3600);
    
    // Invalidate collection cache
    const cacheKey = `notion:${dbName}:all`;
    await this.redis.del(cacheKey);
  }

  /**
   * Get last sync time for database
   */
  async getLastSyncTime(dbName) {
    const key = `sync:lasttime:${dbName}`;
    const lastSync = await this.redis.get(key);
    return lastSync ? new Date(lastSync) : null;
  }

  /**
   * Update last sync time
   */
  async updateLastSyncTime(dbName) {
    const key = `sync:lasttime:${dbName}`;
    await this.redis.set(key, new Date().toISOString());
  }

  /**
   * Create historical snapshot
   */
  async createSnapshot(dbName, itemId, data) {
    const snapshot = {
      id: crypto.randomUUID(),
      database: dbName,
      item_id: itemId,
      timestamp: new Date().toISOString(),
      data: data,
      hash: this.generateHash(data)
    };
    
    // Store in Supabase history table
    await this.supabase
      .from('notion_history')
      .insert(snapshot);
    
    // Add to history buffer for analysis
    this.historyBuffer.push(snapshot);
    
    // Trim buffer if too large
    if (this.historyBuffer.length > 1000) {
      this.historyBuffer = this.historyBuffer.slice(-500);
    }
  }

  /**
   * Create daily snapshot of all data
   */
  async createDailySnapshot() {
    console.log('📸 Creating daily snapshot...');
    
    const snapshot = {
      date: new Date().toISOString().split('T')[0],
      databases: {}
    };
    
    for (const [dbName, dbId] of Object.entries(this.databases)) {
      if (!dbId) continue;
      
      const items = await this.fetchAllItems(dbId);
      snapshot.databases[dbName] = {
        count: items.length,
        items: items.map(item => ({
          id: item.id,
          updated_at: item.last_edited_time
        }))
      };
    }
    
    // Store snapshot
    await this.supabase
      .from('daily_snapshots')
      .insert({
        date: snapshot.date,
        data: snapshot,
        created_at: new Date().toISOString()
      });
    
    console.log('✅ Daily snapshot created');
  }

  /**
   * Generate hash for data comparison
   */
  generateHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Broadcast update to WebSocket clients
   */
  broadcastUpdate(update) {
    const message = JSON.stringify(update);
    
    for (const ws of this.wsConnections) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(message);
      }
    }
  }

  /**
   * Register WebSocket connection
   */
  registerWebSocket(ws) {
    this.wsConnections.add(ws);
    
    // Send initial state
    ws.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    }));
    
    // Clean up on close
    ws.on('close', () => {
      this.wsConnections.delete(ws);
    });
  }

  /**
   * Handle webhook from Notion (when available)
   */
  async handleWebhook(payload) {
    const { type, database_id, page_id, changes } = payload;
    
    console.log(`📨 Webhook received: ${type} for ${database_id}`);
    
    // Queue for processing
    this.syncQueue.push({
      type,
      database_id,
      page_id,
      changes,
      timestamp: new Date().toISOString()
    });
    
    // Process queue
    this.processQueue();
    
    return { success: true, queued: true };
  }

  /**
   * Process sync queue
   */
  async processQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.syncQueue.length > 0) {
      const job = this.syncQueue.shift();
      
      try {
        await this.processSyncJob(job);
      } catch (error) {
        console.error('Failed to process sync job:', error);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Process individual sync job
   */
  async processSyncJob(job) {
    const { type, database_id, page_id } = job;
    
    // Find database name
    const dbName = Object.keys(this.databases).find(
      name => this.databases[name] === database_id
    );
    
    if (!dbName) {
      console.warn(`Unknown database ID: ${database_id}`);
      return;
    }
    
    // Fetch latest data from Notion
    const page = await this.notion.pages.retrieve({ page_id });
    
    // Process the change
    await this.processChanges(dbName, [page]);
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const status = {
      databases: {},
      queue_length: this.syncQueue.length,
      is_processing: this.isProcessing,
      websocket_connections: this.wsConnections.size,
      history_buffer_size: this.historyBuffer.length
    };
    
    for (const dbName of Object.keys(this.databases)) {
      const lastSync = await this.getLastSyncTime(dbName);
      status.databases[dbName] = {
        last_sync: lastSync,
        cached_items: await this.redis.exists(`notion:${dbName}:all`)
      };
    }
    
    return status;
  }

  /**
   * Manual trigger for specific database sync
   */
  async syncDatabase(dbName) {
    const dbId = this.databases[dbName];
    if (!dbId) {
      throw new Error(`Database ${dbName} not configured`);
    }
    
    console.log(`🔄 Manual sync triggered for ${dbName}`);
    
    const items = await this.fetchAllItems(dbId);
    await this.syncToSupabase(dbName, items);
    await this.updateCache(dbName, items);
    await this.updateLastSyncTime(dbName);
    
    console.log(`✅ Manual sync completed for ${dbName}: ${items.length} items`);
    
    return { success: true, items_synced: items.length };
  }
}

// Export singleton instance
export default new NotionSyncEngine();
