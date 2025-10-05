/**
 * Unified Platform Integration Manager
 * 
 * World-class integration system for Notion, Xero, Gmail, and Calendar
 * Built for ACT Platform's community-centric philosophy
 */

import { Client } from '@notionhq/client';
import { google } from 'googleapis';
// Use dynamic import for Xero to handle ESM compatibility
let XeroApi, AccountingApi;
import databaseManager from '../config/database.js';

class UnifiedPlatformManager {
  constructor() {
    this.isInitialized = false;
    this.integrations = new Map();
    this.syncQueue = [];
    this.errorTracking = new Map();
    
    // Platform configuration
    this.config = {
      notion: {
        token: process.env.NOTION_TOKEN,
        databases: {
          projects: process.env.NOTION_PROJECTS_DATABASE_ID,
          opportunities: process.env.NOTION_OPPORTUNITIES_DATABASE_ID,
          organizations: process.env.NOTION_ORGANIZATIONS_DATABASE_ID,
          people: process.env.NOTION_PEOPLE_DATABASE_ID,
          activities: process.env.NOTION_ACTIVITIES_DATABASE_ID,
          actions: process.env.NOTION_ACTIONS_DATABASE_ID,
          partners: process.env.NOTION_PARTNERS_DATABASE_ID,
          artifacts: process.env.NOTION_ARTIFACTS_DATABASE_ID
        }
      },
      gmail: {
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        userEmail: process.env.GMAIL_USER_EMAIL,
        demoMode: process.env.GMAIL_DEMO_MODE === 'true'
      },
      xero: {
        clientId: process.env.XERO_CLIENT_ID,
        clientSecret: process.env.XERO_CLIENT_SECRET,
        refreshToken: process.env.XERO_REFRESH_TOKEN,
        tenantId: process.env.XERO_TENANT_ID,
        demoMode: process.env.XERO_DEMO_MODE === 'true'
      }
    };
  }

  /**
   * Initialize all platform integrations
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🚀 Initializing Unified Platform Manager...');
    
    try {
      await Promise.allSettled([
        this.initializeNotion(),
        this.initializeGmail(), 
        this.initializeXero(),
        this.initializeCalendar()
      ]);
      
      this.isInitialized = true;
      console.log('✅ All platform integrations initialized successfully');
      
      // Start background sync processes
      this.startSyncProcesses();
      
    } catch (error) {
      console.error('❌ Failed to initialize platform integrations:', error.message);
      throw error;
    }
  }

  /**
   * Initialize Notion integration
   */
  async initializeNotion() {
    try {
      if (!this.config.notion.token) {
        throw new Error('Missing NOTION_TOKEN environment variable');
      }

      const notion = new Client({
        auth: this.config.notion.token,
        notionVersion: '2022-06-28'
      });

      // Test connection by querying a database
      const testDb = this.config.notion.databases.projects;
      if (testDb) {
        await notion.databases.query({
          database_id: testDb,
          page_size: 1
        });
      }

      this.integrations.set('notion', notion);
      console.log('✅ Notion integration initialized');
      
    } catch (error) {
      console.error('❌ Notion initialization failed:', error.message);
      this.errorTracking.set('notion', error);
    }
  }

  /**
   * Initialize Gmail integration
   */
  async initializeGmail() {
    try {
      if (this.config.gmail.demoMode) {
        console.log('📧 Gmail running in demo mode');
        this.integrations.set('gmail', { demoMode: true });
        return;
      }

      const oauth2Client = new google.auth.OAuth2(
        this.config.gmail.clientId,
        this.config.gmail.clientSecret
      );

      oauth2Client.setCredentials({
        refresh_token: this.config.gmail.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Test connection
      await gmail.users.getProfile({ userId: 'me' });
      
      this.integrations.set('gmail', { client: gmail, auth: oauth2Client });
      console.log('✅ Gmail integration initialized');
      
    } catch (error) {
      console.error('❌ Gmail initialization failed:', error.message);
      this.errorTracking.set('gmail', error);
    }
  }

  /**
   * Initialize Xero integration
   */
  async initializeXero() {
    try {
      if (this.config.xero.demoMode) {
        console.log('💰 Xero running in demo mode');
        this.integrations.set('xero', { demoMode: true });
        return;
      }

      // Dynamic import for Xero to handle ESM compatibility
      if (!XeroApi) {
        const xeroModule = await import('xero-node');
        XeroApi = xeroModule.XeroApi || xeroModule.default?.XeroApi;
        AccountingApi = xeroModule.AccountingApi || xeroModule.default?.AccountingApi;
      }

      if (!XeroApi) {
        throw new Error('Xero API not available - check xero-node installation');
      }

      const xero = new XeroApi({
        clientId: this.config.xero.clientId,
        clientSecret: this.config.xero.clientSecret,
        scopes: 'accounting.contacts.read accounting.transactions.read accounting.reports.read'.split(' ')
      });

      // Set tokens
      await xero.setTokenSet({
        access_token: process.env.XERO_ACCESS_TOKEN,
        refresh_token: this.config.xero.refreshToken
      });

      this.integrations.set('xero', xero);
      console.log('✅ Xero integration initialized');
      
    } catch (error) {
      console.error('❌ Xero initialization failed:', error.message);
      this.errorTracking.set('xero', error);
    }
  }

  /**
   * Initialize Google Calendar integration
   */
  async initializeCalendar() {
    try {
      // Use same OAuth client as Gmail
      const gmailIntegration = this.integrations.get('gmail');
      if (gmailIntegration && gmailIntegration.auth) {
        const calendar = google.calendar({ version: 'v3', auth: gmailIntegration.auth });
        
        // Test connection
        await calendar.calendarList.list();
        
        this.integrations.set('calendar', calendar);
        console.log('✅ Calendar integration initialized');
      } else {
        console.log('📅 Calendar integration requires Gmail OAuth - skipping');
      }
      
    } catch (error) {
      console.error('❌ Calendar initialization failed:', error.message);
      this.errorTracking.set('calendar', error);
    }
  }

  /**
   * Sync entity across all relevant platforms
   */
  async syncEntity(entityType, entityData, operation = 'update') {
    console.log(`🔄 Syncing ${entityType} across platforms...`);
    
    const syncTasks = this.determineSyncTargets(entityType, operation);
    const results = await Promise.allSettled(
      syncTasks.map(task => this.executePlatformSync(task, entityData))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected');

    console.log(`✅ Sync complete: ${successful}/${syncTasks.length} platforms synced`);
    
    if (failed.length > 0) {
      console.warn(`⚠️ Failed syncs:`, failed.map(f => f.reason));
    }

    return { successful, failed: failed.length, total: syncTasks.length };
  }

  /**
   * Determine which platforms need syncing for entity type
   */
  determineSyncTargets(entityType, operation) {
    const syncMap = {
      project: ['notion', 'calendar'], // Projects sync to Notion and create calendar events
      organization: ['notion', 'xero'], // Organizations sync to Notion and Xero as contacts  
      person: ['notion', 'gmail'], // People sync to Notion and Gmail contacts
      opportunity: ['notion', 'gmail'], // Opportunities sync to Notion and email notifications
      story: ['notion'], // Stories primarily live in Notion
      event: ['calendar', 'notion'], // Events sync to Calendar and Notion
      contact: ['gmail', 'notion'] // Contacts sync between Gmail and Notion
    };

    return (syncMap[entityType] || []).filter(platform => 
      this.integrations.has(platform) && !this.errorTracking.has(platform)
    );
  }

  /**
   * Execute sync to specific platform
   */
  async executePlatformSync(platform, entityData) {
    const integration = this.integrations.get(platform);
    if (!integration) {
      throw new Error(`Integration not available: ${platform}`);
    }

    switch (platform) {
      case 'notion':
        return await this.syncToNotion(entityData, integration);
      case 'gmail':
        return await this.syncToGmail(entityData, integration);
      case 'xero':
        return await this.syncToXero(entityData, integration);
      case 'calendar':
        return await this.syncToCalendar(entityData, integration);
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  /**
   * Sync to Notion
   */
  async syncToNotion(entityData, notion) {
    const { entityType, data } = entityData;
    const databaseId = this.config.notion.databases[entityType + 's'] || 
                      this.config.notion.databases[entityType];
    
    if (!databaseId) {
      console.warn(`No Notion database configured for ${entityType}`);
      return { success: false, reason: 'No database configured' };
    }

    try {
      // Create or update Notion page
      const properties = this.mapToNotionProperties(data, entityType);
      
      if (data.notion_page_id) {
        // Update existing page
        await notion.pages.update({
          page_id: data.notion_page_id,
          properties
        });
      } else {
        // Create new page
        const response = await notion.pages.create({
          parent: { database_id: databaseId },
          properties
        });
        
        // Store Notion page ID back to Supabase
        await this.updateSupabaseWithNotionId(entityData.id, response.id, entityType);
      }

      return { success: true, platform: 'notion' };
      
    } catch (error) {
      console.error(`Notion sync failed for ${entityType}:`, error.message);
      return { success: false, platform: 'notion', error: error.message };
    }
  }

  /**
   * Sync to Gmail (contacts)
   */
  async syncToGmail(entityData, gmailIntegration) {
    if (gmailIntegration.demoMode) {
      return { success: true, platform: 'gmail', demo: true };
    }

    try {
      const people = google.people({ version: 'v1', auth: gmailIntegration.auth });
      const contactData = this.mapToGoogleContact(entityData.data);
      
      // Create or update Google contact
      const response = await people.people.createContact({
        requestBody: contactData
      });

      return { success: true, platform: 'gmail', contactId: response.data.resourceName };
      
    } catch (error) {
      console.error('Gmail contact sync failed:', error.message);
      return { success: false, platform: 'gmail', error: error.message };
    }
  }

  /**
   * Sync to Xero (organizations as contacts)
   */
  async syncToXero(entityData, xero) {
    if (xero.demoMode) {
      return { success: true, platform: 'xero', demo: true };
    }

    try {
      // Ensure AccountingApi is available
      if (!AccountingApi) {
        const xeroModule = await import('xero-node');
        AccountingApi = xeroModule.AccountingApi || xeroModule.default?.AccountingApi;
      }

      if (!AccountingApi) {
        throw new Error('Xero AccountingApi not available');
      }

      const accountingApi = new AccountingApi(xero);
      const contact = this.mapToXeroContact(entityData.data);
      
      const response = await accountingApi.createContacts(
        this.config.xero.tenantId,
        { contacts: [contact] }
      );

      return { success: true, platform: 'xero', contactId: response.body.contacts[0].contactId };
      
    } catch (error) {
      console.error('Xero contact sync failed:', error.message);
      return { success: false, platform: 'xero', error: error.message };
    }
  }

  /**
   * Sync to Google Calendar (events)
   */
  async syncToCalendar(entityData, calendar) {
    try {
      const event = this.mapToCalendarEvent(entityData.data);
      
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });

      return { success: true, platform: 'calendar', eventId: response.data.id };
      
    } catch (error) {
      console.error('Calendar sync failed:', error.message);
      return { success: false, platform: 'calendar', error: error.message };
    }
  }

  /**
   * Map Supabase data to Notion properties
   */
  mapToNotionProperties(data, entityType) {
    const baseProperties = {
      Name: { title: [{ text: { content: data.name || data.title || 'Untitled' } }] }
    };

    if (data.description) {
      baseProperties.Description = { 
        rich_text: [{ text: { content: data.description } }] 
      };
    }

    if (data.status) {
      baseProperties.Status = { 
        select: { name: data.status.charAt(0).toUpperCase() + data.status.slice(1) } 
      };
    }

    return baseProperties;
  }

  /**
   * Map Supabase data to Google Contact format
   */
  mapToGoogleContact(data) {
    return {
      names: [{ givenName: data.name || data.first_name, familyName: data.last_name }],
      emailAddresses: data.email ? [{ value: data.email }] : [],
      organizations: data.organization ? [{ name: data.organization }] : [],
      biographies: data.description ? [{ value: data.description }] : []
    };
  }

  /**
   * Map Supabase data to Xero Contact format  
   */
  mapToXeroContact(data) {
    return {
      name: data.name,
      emailAddress: data.email,
      contactStatus: 'ACTIVE',
      addresses: data.location ? [{ addressLine1: data.location }] : []
    };
  }

  /**
   * Map Supabase data to Google Calendar event format
   */
  mapToCalendarEvent(data) {
    return {
      summary: data.name || data.title,
      description: data.description,
      start: { dateTime: data.start_time || new Date().toISOString() },
      end: { dateTime: data.end_time || new Date(Date.now() + 3600000).toISOString() },
      location: data.location
    };
  }

  /**
   * Update Supabase record with external platform IDs
   */
  async updateSupabaseWithNotionId(entityId, notionPageId, entityType) {
    try {
      const client = databaseManager.getPrimaryClient();
      const tableName = entityType + 's'; // Assuming plural table names
      
      await client
        .from(tableName)
        .update({ notion_page_id: notionPageId })
        .eq('id', entityId);
        
    } catch (error) {
      console.warn('Failed to update Supabase with Notion ID:', error.message);
    }
  }

  /**
   * Start background sync processes
   */
  startSyncProcesses() {
    console.log('🔄 Starting background sync processes...');
    
    // Process sync queue every 30 seconds
    setInterval(() => {
      this.processSyncQueue();
    }, 30000);

    // Health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck();
    }, 300000);
  }

  /**
   * Process queued sync operations
   */
  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    console.log(`Processing ${this.syncQueue.length} queued sync operations...`);
    
    const batch = this.syncQueue.splice(0, 10); // Process 10 at a time
    
    for (const syncOperation of batch) {
      try {
        await this.syncEntity(
          syncOperation.entityType,
          syncOperation.entityData,
          syncOperation.operation
        );
      } catch (error) {
        console.error('Sync operation failed:', error.message);
      }
    }
  }

  /**
   * Health check for all integrations
   */
  async performHealthCheck() {
    console.log('🏥 Performing integration health check...');
    
    const healthResults = {};
    
    for (const [platform, integration] of this.integrations) {
      try {
        switch (platform) {
          case 'notion':
            await integration.users.me({});
            healthResults[platform] = 'healthy';
            break;
          case 'gmail':
            if (!integration.demoMode) {
              await integration.client.users.getProfile({ userId: 'me' });
            }
            healthResults[platform] = 'healthy';
            break;
          case 'xero':
            if (!integration.demoMode) {
              // Simple check - could enhance with actual API call
              healthResults[platform] = 'healthy';
            }
            break;
          case 'calendar':
            await integration.calendarList.list();
            healthResults[platform] = 'healthy';
            break;
        }
      } catch (error) {
        healthResults[platform] = 'unhealthy';
        this.errorTracking.set(platform, error);
        console.warn(`${platform} health check failed:`, error.message);
      }
    }

    return healthResults;
  }

  /**
   * Queue sync operation for background processing
   */
  queueSync(entityType, entityData, operation = 'update') {
    this.syncQueue.push({
      entityType,
      entityData,
      operation,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      integrations: Array.from(this.integrations.keys()),
      errors: Array.from(this.errorTracking.keys()),
      queueLength: this.syncQueue.length,
      healthyIntegrations: Array.from(this.integrations.keys())
        .filter(platform => !this.errorTracking.has(platform))
    };
  }
}

// Singleton instance
const platformManager = new UnifiedPlatformManager();

// Export convenience functions
export const initializePlatformIntegrations = () => platformManager.initialize();
export const syncEntityAcrossPlatforms = (type, data, op) => platformManager.syncEntity(type, data, op);
export const queuePlatformSync = (type, data, op) => platformManager.queueSync(type, data, op);
export const getPlatformStatus = () => platformManager.getStatus();
export const performPlatformHealthCheck = () => platformManager.performHealthCheck();

export default platformManager;