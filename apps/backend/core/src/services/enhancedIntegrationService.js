/**
 * Enhanced Integration Service for Notion/Supabase Data Architecture Expansion
 * 
 * Features:
 * - OAuth authentication for both Notion and Supabase
 * - Real-time bidirectional data synchronization
 * - Event tracking and analytics integration
 * - Enhanced data models and relationships
 * - Cross-platform data consistency validation
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import notionService from './notionService.js';
import supabaseDataService from './supabaseDataService.js';
import { cacheService } from './cacheService.js';

class EnhancedIntegrationService {
  constructor() {
    // Initialize clients
    this.notion = null;
    this.supabase = null;
    this.syncActive = false;
    this.syncInterval = null;
    
    // Configuration
    this.config = {
      syncInterval: 5 * 60 * 1000, // 5 minutes
      batchSize: 50,
      retryAttempts: 3,
      retryDelay: 2000,
      realTimeEnabled: process.env.REAL_TIME_SYNC !== 'false' // Default to true
    };
    
    // Event tracking
    this.events = [];
    this.eventListeners = new Map();
    
    // OAuth credentials storage
    this.oauthCredentials = {
      notion: {
        clientId: process.env.NOTION_OAUTH_CLIENT_ID,
        clientSecret: process.env.NOTION_OAUTH_CLIENT_SECRET,
        redirectUri: process.env.NOTION_OAUTH_REDIRECT_URI
      },
      supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    };
    
    // Sync status tracking
    this.syncStatus = {
      lastSync: null,
      isRunning: false,
      errors: [],
      statistics: {
        totalSynced: 0,
        conflictsResolved: 0,
        lastSyncDuration: 0
      }
    };
    
    this.initialize();
  }

  /**
   * Initialize the service with OAuth authentication
   */
  async initialize() {
    try {
      await this.initializeNotionClient();
      await this.initializeSupabaseClient();
      
      if (this.config.realTimeEnabled) {
        await this.setupRealTimeSync();
      }
      
      console.log('🚀 Enhanced Integration Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Integration Service:', error.message);
    }
  }

  /**
   * Initialize Notion client with OAuth support
   */
  async initializeNotionClient() {
    // Check for OAuth token first, fallback to regular token
    const notionToken = process.env.NOTION_OAUTH_TOKEN || process.env.NOTION_TOKEN;
    
    if (!notionToken) {
      console.warn('⚠️ No Notion token found - OAuth authentication required');
      return;
    }

    this.notion = new Client({
      auth: notionToken,
      notionVersion: '2022-06-28' // Latest stable version
    });
    
    // Test connection
    try {
      await this.notion.users.me();
      console.log('✅ Notion client authenticated successfully');
    } catch (error) {
      console.warn('⚠️ Notion authentication failed:', error.message);
    }
  }

  /**
   * Initialize Supabase client with enhanced configuration
   */
  async initializeSupabaseClient() {
    if (!this.oauthCredentials.supabase.url || !this.oauthCredentials.supabase.serviceRoleKey) {
      console.warn('⚠️ Supabase OAuth credentials not configured');
      return;
    }

    this.supabase = createClient(
      this.oauthCredentials.supabase.url,
      this.oauthCredentials.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Client-Info': 'ACT-Enhanced-Integration-v2.0'
          }
        }
      }
    );

    // Test connection
    try {
      const { data, error } = await this.supabase.from('stories').select('id').limit(1);
      if (error) throw error;
      console.log('✅ Supabase client authenticated successfully');
    } catch (error) {
      console.warn('⚠️ Supabase authentication failed:', error.message);
    }
  }

  /**
   * Generate OAuth authorization URL for Notion
   */
  generateNotionOAuthUrl(state = '') {
    const { clientId, redirectUri } = this.oauthCredentials.notion;
    
    if (!clientId || !redirectUri) {
      // If OAuth not configured, provide helpful response about current token-based auth
      return {
        error: 'OAuth not configured',
        message: 'Notion OAuth credentials not configured. Currently using token-based authentication.',
        current_auth_method: 'token-based',
        has_notion_token: Boolean(process.env.NOTION_TOKEN),
        setup_instructions: {
          oauth_client_id: 'Set NOTION_OAUTH_CLIENT_ID environment variable',
          oauth_client_secret: 'Set NOTION_OAUTH_CLIENT_SECRET environment variable', 
          oauth_redirect_uri: 'Set NOTION_OAUTH_REDIRECT_URI environment variable'
        }
      };
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      owner: 'user',
      redirect_uri: redirectUri,
      state: state
    });

    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeNotionOAuthCode(code, redirectUri) {
    const { clientId, clientSecret } = this.oauthCredentials.notion;
    
    if (!clientId || !clientSecret) {
      throw new Error('Notion OAuth credentials not configured');
    }

    try {
      const response = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`OAuth token exchange failed: ${response.statusText}`);
      }

      const tokenData = await response.json();
      
      // Store the access token securely
      await this.storeOAuthToken('notion', tokenData);
      
      // Reinitialize Notion client with new token
      this.notion = new Client({
        auth: tokenData.access_token,
        notionVersion: '2022-06-28'
      });

      console.log('✅ Notion OAuth token exchanged successfully');
      return tokenData;
    } catch (error) {
      console.error('❌ Notion OAuth token exchange failed:', error.message);
      throw error;
    }
  }

  /**
   * Store OAuth tokens securely in Supabase
   */
  async storeOAuthToken(provider, tokenData) {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await this.supabase
        .from('oauth_tokens')
        .upsert({
          provider,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_in ? 
            new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
          token_type: tokenData.token_type,
          scope: tokenData.scope,
          workspace_name: tokenData.workspace_name,
          workspace_id: tokenData.workspace_id,
          bot_id: tokenData.bot_id,
          owner: tokenData.owner,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'provider'
        });

      if (error) throw error;
      console.log(`✅ ${provider} OAuth token stored securely`);
    } catch (error) {
      console.error(`❌ Failed to store ${provider} OAuth token:`, error.message);
      throw error;
    }
  }

  /**
   * Setup real-time synchronization between Notion and Supabase
   */
  async setupRealTimeSync() {
    if (!this.supabase) {
      console.warn('⚠️ Supabase client not available for real-time sync');
      return;
    }

    try {
      // Listen for changes in key Supabase tables
      const tables = ['stories', 'storytellers', 'organizations', 'projects'];
      
      for (const table of tables) {
        this.supabase
          .channel(`${table}_changes`)
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: table 
            }, 
            (payload) => this.handleRealtimeChange(table, payload)
          )
          .subscribe();
      }

      // Start periodic sync for Notion -> Supabase updates
      this.startPeriodicSync();
      
      console.log('🔄 Real-time synchronization enabled');
    } catch (error) {
      console.error('❌ Failed to setup real-time sync:', error.message);
    }
  }

  /**
   * Handle real-time changes from Supabase
   */
  async handleRealtimeChange(table, payload) {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      this.emitEvent('supabase_change', {
        table,
        eventType,
        newRecord,
        oldRecord,
        timestamp: new Date().toISOString()
      });

      // Implement bidirectional sync logic based on change type
      switch (eventType) {
        case 'INSERT':
          await this.syncToNotion(table, newRecord, 'create');
          break;
        case 'UPDATE':
          await this.syncToNotion(table, newRecord, 'update');
          break;
        case 'DELETE':
          await this.syncToNotion(table, oldRecord, 'delete');
          break;
      }

      console.log(`🔄 Processed real-time change: ${table}.${eventType}`);
    } catch (error) {
      console.error(`❌ Failed to handle real-time change for ${table}:`, error.message);
    }
  }

  /**
   * Start periodic synchronization from Notion to Supabase
   */
  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (!this.syncStatus.isRunning) {
        await this.performFullSync();
      }
    }, this.config.syncInterval);

    console.log(`🔄 Periodic sync started (interval: ${this.config.syncInterval / 1000}s)`);
  }

  /**
   * Perform full bidirectional synchronization
   */
  async performFullSync() {
    if (this.syncStatus.isRunning) {
      console.log('🔄 Sync already in progress, skipping...');
      return;
    }

    this.syncStatus.isRunning = true;
    this.syncStatus.lastSync = new Date().toISOString();
    const startTime = Date.now();

    try {
      console.log('🔄 Starting full synchronization...');
      
      // Sync from Notion to Supabase
      await this.syncNotionToSupabase();
      
      // Sync from Supabase to Notion (for any external updates)
      await this.syncSupabaseToNotion();
      
      // Update sync statistics
      this.syncStatus.statistics.lastSyncDuration = Date.now() - startTime;
      this.syncStatus.statistics.totalSynced++;
      
      this.emitEvent('sync_completed', {
        duration: this.syncStatus.statistics.lastSyncDuration,
        timestamp: this.syncStatus.lastSync
      });

      console.log(`✅ Full synchronization completed in ${this.syncStatus.statistics.lastSyncDuration}ms`);
    } catch (error) {
      this.syncStatus.errors.push({
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.emitEvent('sync_error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      console.error('❌ Full synchronization failed:', error.message);
    } finally {
      this.syncStatus.isRunning = false;
    }
  }

  /**
   * Sync data from Notion to Supabase
   */
  async syncNotionToSupabase() {
    if (!this.notion || !this.supabase) {
      throw new Error('Notion or Supabase client not available');
    }

    try {
      // Get all database mappings from Notion
      const databaseMappings = {
        partners: process.env.NOTION_PARTNERS_DATABASE_ID,
        projects: process.env.NOTION_PROJECTS_DATABASE_ID,
        opportunities: process.env.NOTION_OPPORTUNITIES_DATABASE_ID,
        organizations: process.env.NOTION_ORGANIZATIONS_DATABASE_ID
      };

      for (const [type, databaseId] of Object.entries(databaseMappings)) {
        if (!databaseId) continue;

        try {
          // Check if method exists
          const methodName = `get${type.charAt(0).toUpperCase() + type.slice(1)}`;
          if (typeof notionService[methodName] !== 'function') {
            console.warn(`⚠️ Method ${methodName} does not exist on notionService`);
            continue;
          }
          
          // Fetch fresh data from Notion
          const notionData = await notionService[methodName](false);
          
          // Transform and upsert to Supabase
          const transformedData = this.transformNotionDataForSupabase(type, notionData);
          
          if (transformedData.length > 0) {
            const { error } = await this.supabase
              .from(`notion_${type}`)
              .upsert(transformedData, {
                onConflict: 'notion_id'
              });

            if (error) throw error;
            console.log(`✅ Synced ${transformedData.length} ${type} records to Supabase`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to sync ${type}:`, {
            error: error.message,
            databaseId,
            methodName: `get${type.charAt(0).toUpperCase() + type.slice(1)}`,
            methodExists: typeof notionService[`get${type.charAt(0).toUpperCase() + type.slice(1)}`] === 'function',
            notionServiceAvailable: !!notionService
          });
        }
      }
    } catch (error) {
      console.error('❌ Notion to Supabase sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Sync data from Supabase to Notion (for external updates)
   */
  async syncSupabaseToNotion() {
    if (!this.notion || !this.supabase) {
      throw new Error('Notion or Supabase client not available');
    }

    try {
      console.log('🔄 Starting Supabase to Notion sync...');
      
      // Get tables that need sync from Supabase to Notion
      const tables = ['stories', 'storytellers', 'organizations', 'projects'];
      
      for (const table of tables) {
        try {
          // Get recently updated records (last 5 minutes)
          const cutoffTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          
          const { data: recentlyUpdated, error } = await this.supabase
            .from(table)
            .select('*')
            .gte('updated_at', cutoffTime);

          if (error) throw error;

          if (recentlyUpdated && recentlyUpdated.length > 0) {
            console.log(`📊 Found ${recentlyUpdated.length} recently updated ${table} records`);
            
            for (const record of recentlyUpdated) {
              await this.syncToNotion(table, record, 'update');
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to sync ${table} to Notion:`, error.message);
        }
      }

      console.log('✅ Supabase to Notion sync completed');
    } catch (error) {
      console.error('❌ Supabase to Notion sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle Notion webhook events
   */
  async handleNotionWebhook(payload) {
    try {
      const { object, event, page } = payload;
      
      if (object === 'page') {
        console.log(`📝 Received Notion page ${event}: ${page.id}`);
        
        switch (event) {
          case 'page.updated':
            await this.syncNotionPageToSupabase(page.id, 'update');
            break;
          case 'page.created':
            await this.syncNotionPageToSupabase(page.id, 'create');
            break;
          case 'page.deleted':
            await this.syncNotionPageToSupabase(page.id, 'delete');
            break;
        }

        this.emitEvent('notion_webhook_processed', {
          event,
          pageId: page.id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Failed to handle Notion webhook:', error.message);
      this.emitEvent('notion_webhook_error', {
        error: error.message,
        payload,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Sync individual Notion page to Supabase
   */
  async syncNotionPageToSupabase(pageId, operation) {
    if (!this.notion || !this.supabase) {
      console.warn('⚠️ Missing Notion or Supabase client for sync');
      return;
    }

    try {
      if (operation === 'delete') {
        // Handle page deletion - mark as archived in Supabase
        await this.markSupabaseRecordArchived(pageId);
        return;
      }

      // Fetch page data from Notion
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      const pageProperties = await this.extractNotionPageData(page);

      // Determine target Supabase table
      const targetTable = this.getSupabaseTableFromNotionPage(page);
      if (!targetTable) {
        console.warn(`⚠️ Cannot determine Supabase table for Notion page: ${pageId}`);
        return;
      }

      // Transform Notion data to Supabase format
      const supabaseData = this.transformNotionToSupabaseData(pageProperties, targetTable);
      supabaseData.notion_id = pageId;

      if (operation === 'create') {
        const { error } = await this.supabase
          .from(targetTable)
          .insert(supabaseData);
        
        if (error) throw error;
        console.log(`✅ Created ${targetTable} record from Notion page: ${pageId}`);
      } else if (operation === 'update') {
        const { error } = await this.supabase
          .from(targetTable)
          .update(supabaseData)
          .eq('notion_id', pageId);
        
        if (error) throw error;
        console.log(`✅ Updated ${targetTable} record from Notion page: ${pageId}`);
      }

    } catch (error) {
      console.error(`❌ Failed to sync Notion page ${pageId} to Supabase:`, error.message);
      throw error;
    }
  }

  /**
   * Extract data from Notion page
   */
  async extractNotionPageData(page) {
    const properties = {};
    
    for (const [key, property] of Object.entries(page.properties)) {
      switch (property.type) {
        case 'title':
          properties[key] = property.title.map(t => t.plain_text).join('');
          break;
        case 'rich_text':
          properties[key] = property.rich_text.map(t => t.plain_text).join('');
          break;
        case 'select':
          properties[key] = property.select?.name || null;
          break;
        case 'multi_select':
          properties[key] = property.multi_select.map(s => s.name);
          break;
        case 'number':
          properties[key] = property.number;
          break;
        case 'checkbox':
          properties[key] = property.checkbox;
          break;
        case 'date':
          properties[key] = property.date?.start || null;
          break;
        case 'email':
          properties[key] = property.email;
          break;
        case 'url':
          properties[key] = property.url;
          break;
        default:
          properties[key] = String(property);
      }
    }

    return properties;
  }

  /**
   * Determine Supabase table from Notion page
   */
  getSupabaseTableFromNotionPage(page) {
    const databaseId = page.parent.database_id;
    
    // Map Notion database IDs to Supabase tables
    const databaseMapping = {
      [process.env.NOTION_STORIES_DATABASE_ID]: 'stories',
      [process.env.NOTION_PEOPLE_DB]: 'storytellers', 
      [process.env.NOTION_ORGANIZATIONS_DB]: 'organizations',
      [process.env.NOTION_PROJECTS_DB || process.env.NOTION_DATABASE_ID]: 'projects',
      [process.env.NOTION_OPPORTUNITIES_DB]: 'opportunities'
    };

    return databaseMapping[databaseId] || null;
  }

  /**
   * Transform Notion data to Supabase format
   */
  transformNotionToSupabaseData(notionData, targetTable) {
    const fieldMapping = this.getReverseFieldMapping(targetTable);
    const supabaseData = {};

    for (const [supabaseField, notionField] of Object.entries(fieldMapping)) {
      const value = notionData[notionField];
      if (value !== undefined && value !== null) {
        supabaseData[supabaseField] = value;
      }
    }

    // Add sync metadata
    supabaseData.updated_at = new Date().toISOString();
    supabaseData.synced_from_notion = true;

    return supabaseData;
  }

  /**
   * Get reverse field mapping (Notion → Supabase)
   */
  getReverseFieldMapping(table) {
    const mappings = this.getFieldMapping(table);
    const reverseMapping = {};
    
    for (const [notionField, supabaseField] of Object.entries(mappings)) {
      reverseMapping[supabaseField] = notionField;
    }

    return reverseMapping;
  }

  /**
   * Mark Supabase record as archived
   */
  async markSupabaseRecordArchived(notionPageId) {
    try {
      const tables = ['stories', 'storytellers', 'organizations', 'projects'];
      
      for (const table of tables) {
        const { error } = await this.supabase
          .from(table)
          .update({ 
            archived: true, 
            archived_at: new Date().toISOString() 
          })
          .eq('notion_id', notionPageId);

        if (!error) {
          console.log(`✅ Marked ${table} record as archived for Notion page: ${notionPageId}`);
          break; // Found and updated the record
        }
      }
    } catch (error) {
      console.error(`❌ Failed to archive record for Notion page ${notionPageId}:`, error.message);
    }
  }

  /**
   * Transform Notion data for Supabase storage
   */
  transformNotionDataForSupabase(type, notionData) {
    return notionData.map(item => ({
      notion_id: item.id,
      name: item.name || item.title,
      data: item,
      type: type,
      last_synced: new Date().toISOString(),
      created_at: item.created_time || new Date().toISOString(),
      updated_at: item.last_edited_time || new Date().toISOString()
    }));
  }

  /**
   * Sync specific record to Notion
   */
  async syncToNotion(table, record, operation) {
    if (!this.notion) {
      console.warn('⚠️ Notion client not available for sync');
      return;
    }

    try {
      console.log(`🔄 Syncing ${table} record to Notion (${operation}):`, record.id);
      
      // Map Supabase table names to Notion database IDs
      const databaseMapping = {
        'stories': process.env.NOTION_STORIES_DATABASE_ID,
        'storytellers': process.env.NOTION_PEOPLE_DB,
        'organizations': process.env.NOTION_ORGANIZATIONS_DB,
        'projects': process.env.NOTION_PROJECTS_DB || process.env.NOTION_DATABASE_ID,
        'opportunities': process.env.NOTION_OPPORTUNITIES_DB
      };

      const databaseId = databaseMapping[table];
      if (!databaseId) {
        console.warn(`⚠️ No Notion database mapping found for table: ${table}`);
        return;
      }

      const fieldMapping = this.getFieldMapping(table);
      const notionProperties = this.transformSupabaseToNotionProperties(record, fieldMapping);

      switch (operation) {
        case 'create':
          await this.createNotionPage(databaseId, notionProperties, record);
          break;
        case 'update':
          await this.updateNotionPage(record.notion_id || record.id, notionProperties, record);
          break;
        case 'delete':
          await this.archiveNotionPage(record.notion_id || record.id);
          break;
      }

      this.emitEvent('notion_sync_completed', {
        table,
        operation,
        recordId: record.id,
        notionId: record.notion_id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Failed to sync ${table} record to Notion:`, error.message);
      this.emitEvent('notion_sync_error', {
        table,
        operation,
        recordId: record.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get field mapping configuration for table
   */
  getFieldMapping(table) {
    const mappings = {
      'stories': {
        'title': 'title',
        'content': 'content',
        'summary': 'summary',
        'author': 'storyteller_id',
        'themes': 'themes',
        'status': 'status',
        'privacy_level': 'privacy_level'
      },
      'storytellers': {
        'name': 'full_name',
        'bio': 'bio',
        'email': 'email',
        'expertise': 'expertise_areas',
        'location': 'location_id',
        'organization': 'organization_id'
      },
      'organizations': {
        'name': 'name',
        'description': 'description',
        'type': 'type',
        'website': 'website',
        'location': 'location'
      },
      'projects': {
        'name': 'name',
        'description': 'description',
        'status': 'status',
        'organization': 'organization_id',
        'budget': 'budget',
        'timeline': 'timeline'
      }
    };

    return mappings[table] || {};
  }

  /**
   * Transform Supabase record to Notion properties
   */
  transformSupabaseToNotionProperties(record, fieldMapping) {
    const properties = {};

    for (const [notionField, supabaseField] of Object.entries(fieldMapping)) {
      const value = record[supabaseField];
      if (value !== undefined && value !== null) {
        properties[notionField] = this.formatNotionProperty(notionField, value);
      }
    }

    return properties;
  }

  /**
   * Format value for Notion property type
   */
  formatNotionProperty(fieldName, value) {
    // Handle different Notion property types
    if (typeof value === 'string') {
      if (fieldName === 'title' || fieldName === 'name') {
        return {
          title: [{ text: { content: value } }]
        };
      } else {
        return {
          rich_text: [{ text: { content: value } }]
        };
      }
    } else if (Array.isArray(value)) {
      return {
        multi_select: value.map(item => ({ name: item }))
      };
    } else if (typeof value === 'number') {
      return {
        number: value
      };
    } else if (typeof value === 'boolean') {
      return {
        checkbox: value
      };
    }

    return {
      rich_text: [{ text: { content: String(value) } }]
    };
  }

  /**
   * Create new page in Notion
   */
  async createNotionPage(databaseId, properties, supabaseRecord) {
    try {
      const response = await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties: properties
      });

      // Update Supabase record with Notion ID for future syncs
      if (this.supabase && supabaseRecord.id) {
        await this.updateSupabaseWithNotionId(supabaseRecord, response.id);
      }

      console.log(`✅ Created Notion page: ${response.id}`);
      return response;
    } catch (error) {
      console.error('❌ Failed to create Notion page:', error.message);
      throw error;
    }
  }

  /**
   * Update existing page in Notion
   */
  async updateNotionPage(pageId, properties, supabaseRecord) {
    if (!pageId) {
      console.warn('⚠️ No Notion page ID provided for update');
      return;
    }

    try {
      const response = await this.notion.pages.update({
        page_id: pageId,
        properties: properties
      });

      console.log(`✅ Updated Notion page: ${pageId}`);
      return response;
    } catch (error) {
      console.error('❌ Failed to update Notion page:', error.message);
      throw error;
    }
  }

  /**
   * Archive page in Notion (soft delete)
   */
  async archiveNotionPage(pageId) {
    if (!pageId) {
      console.warn('⚠️ No Notion page ID provided for archiving');
      return;
    }

    try {
      const response = await this.notion.pages.update({
        page_id: pageId,
        archived: true
      });

      console.log(`🗄️ Archived Notion page: ${pageId}`);
      return response;
    } catch (error) {
      console.error('❌ Failed to archive Notion page:', error.message);
      throw error;
    }
  }

  /**
   * Update Supabase record with Notion page ID
   */
  async updateSupabaseWithNotionId(record, notionId) {
    try {
      // Determine table name from record type or use a mapping
      const tableName = this.getSupabaseTableName(record);
      
      const { error } = await this.supabase
        .from(tableName)
        .update({ notion_id: notionId })
        .eq('id', record.id);

      if (error) throw error;
      console.log(`✅ Updated ${tableName} record ${record.id} with Notion ID`);
    } catch (error) {
      console.error('❌ Failed to update Supabase with Notion ID:', error.message);
    }
  }

  /**
   * Get Supabase table name from record
   */
  getSupabaseTableName(record) {
    // Try to determine table from record structure
    if (record.storyteller_id) return 'stories';
    if (record.full_name && record.consent_given !== undefined) return 'storytellers';
    if (record.organization_id) return 'projects';
    if (record.type && record.website) return 'organizations';
    
    // Default fallback
    return 'stories';
  }

  /**
   * Event system for tracking changes and analytics
   */
  emitEvent(eventType, data) {
    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.events.push(event);
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Notify event listeners
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn(`⚠️ Event listener error for ${eventType}:`, error.message);
      }
    });
  }

  /**
   * Add event listener
   */
  addEventListener(eventType, listener) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType, listener) {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Get integration health status
   */
  async getHealthStatus() {
    const health = {
      overall: 'healthy',
      services: {
        notion: { status: 'unknown', authenticated: false },
        supabase: { status: 'unknown', authenticated: false }
      },
      sync: this.syncStatus,
      oauth: {
        notion_configured: Boolean(this.oauthCredentials.notion.clientId),
        supabase_configured: Boolean(this.oauthCredentials.supabase.url)
      },
      realtime_enabled: this.config.realTimeEnabled
    };

    // Test Notion connection
    if (this.notion) {
      try {
        await this.notion.users.me();
        health.services.notion = { status: 'healthy', authenticated: true };
      } catch (error) {
        health.services.notion = { status: 'error', authenticated: false, error: error.message };
        health.overall = 'degraded';
      }
    }

    // Test Supabase connection
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.from('stories').select('id').limit(1);
        if (error) throw error;
        health.services.supabase = { status: 'healthy', authenticated: true };
      } catch (error) {
        health.services.supabase = { status: 'error', authenticated: false, error: error.message };
        health.overall = 'degraded';
      }
    }

    return health;
  }

  /**
   * Get sync statistics and events
   */
  getSyncStatistics() {
    return {
      status: this.syncStatus,
      recent_events: this.events.slice(-50), // Last 50 events
      configuration: {
        sync_interval: this.config.syncInterval,
        batch_size: this.config.batchSize,
        realtime_enabled: this.config.realTimeEnabled
      }
    };
  }

  /**
   * Manually trigger synchronization
   */
  async triggerSync(type = 'full') {
    switch (type) {
      case 'full':
        return await this.performFullSync();
      case 'notion_to_supabase':
        return await this.syncNotionToSupabase();
      case 'supabase_to_notion':
        return await this.syncSupabaseToNotion();
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  }

  /**
   * Stop all synchronization processes
   */
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.syncActive = false;
    console.log('⏹️ Synchronization stopped');
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.stopSync();
    
    // Close Supabase real-time connections
    if (this.supabase) {
      await this.supabase.removeAllChannels();
    }
    
    // Clear caches
    cacheService.clearCache('enhanced_integration');
    
    console.log('🧹 Enhanced Integration Service cleanup completed');
  }
}

// Export singleton instance
export const enhancedIntegrationService = new EnhancedIntegrationService();
export default enhancedIntegrationService;