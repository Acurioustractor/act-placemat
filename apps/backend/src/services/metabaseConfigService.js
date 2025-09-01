/**
 * Metabase Configuration Service
 * Automates Metabase setup, dashboard creation, and data source configuration
 */

import fetch from 'node-fetch';

class MetabaseConfigService {
  constructor() {
    this.baseUrl = process.env.METABASE_URL || 'http://localhost:3001';
    this.adminEmail = process.env.MB_ADMIN_EMAIL || 'admin@act.place';
    this.adminPassword = process.env.MB_ADMIN_PASSWORD || 'secure_password_123';
    this.sessionToken = null;
    this.setupCompleted = false;
  }

  /**
   * Initialize Metabase connection and authentication
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Metabase configuration service...');
      
      // Check if Metabase is running
      const healthCheck = await this.checkHealth();
      if (!healthCheck.success) {
        console.warn('⚠️ Metabase not available - configuration will be skipped');
        return false;
      }

      // Check if setup is needed
      const setupStatus = await this.checkSetupStatus();
      
      if (setupStatus.needsSetup) {
        console.log('📋 Metabase needs initial setup...');
        await this.performInitialSetup();
      } else {
        console.log('✅ Metabase already configured');
        await this.authenticateAdmin();
      }

      this.setupCompleted = true;
      console.log('🚀 Metabase configuration service ready');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Metabase service:', error.message);
      return false;
    }
  }

  /**
   * Check Metabase health status
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      return {
        success: response.ok,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if Metabase needs initial setup
   */
  async checkSetupStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/api/session/properties`);
      const data = await response.json();
      
      // If setup-token is present, Metabase needs setup
      // If it's null or undefined, Metabase is already configured
      const needsSetup = data['setup-token'] !== null && data['setup-token'] !== undefined;
      
      return {
        needsSetup,
        setupToken: data['setup-token']
      };
    } catch (error) {
      console.warn('⚠️ Could not check setup status:', error.message);
      return { needsSetup: false };
    }
  }

  /**
   * Perform initial Metabase setup
   */
  async performInitialSetup() {
    try {
      const setupData = {
        token: await this.getSetupToken(),
        user: {
          first_name: 'ACT',
          last_name: 'Administrator',
          email: this.adminEmail,
          password: this.adminPassword
        },
        database: null, // We'll add databases separately
        invite: null,
        prefs: {
          site_name: 'ACT Community Analytics',
          site_locale: 'en'
        }
      };

      const response = await fetch(`${this.baseUrl}/api/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(setupData)
      });

      if (!response.ok) {
        throw new Error(`Setup failed: ${response.status}`);
      }

      const result = await response.json();
      this.sessionToken = result.id;
      
      console.log('✅ Metabase initial setup completed');
      return result;

    } catch (error) {
      console.error('❌ Failed to perform initial setup:', error.message);
      throw error;
    }
  }

  /**
   * Get setup token for initial configuration
   */
  async getSetupToken() {
    try {
      const response = await fetch(`${this.baseUrl}/api/session/properties`);
      const data = await response.json();
      return data['setup-token'];
    } catch (error) {
      console.warn('⚠️ Could not get setup token:', error.message);
      return null;
    }
  }

  /**
   * Authenticate admin user
   */
  async authenticateAdmin() {
    try {
      const response = await fetch(`${this.baseUrl}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: this.adminEmail,
          password: this.adminPassword
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const result = await response.json();
      this.sessionToken = result.id;
      
      console.log('✅ Authenticated with Metabase');
      return result;

    } catch (error) {
      console.error('❌ Failed to authenticate:', error.message);
      throw error;
    }
  }

  /**
   * Add database connection to Metabase
   */
  async addDatabase(config) {
    try {
      if (!this.sessionToken) {
        throw new Error('Not authenticated with Metabase');
      }

      const databaseConfig = {
        engine: config.engine || 'postgres',
        name: config.name,
        details: {
          host: config.host,
          port: config.port || 5432,
          dbname: config.database,
          user: config.username,
          password: config.password,
          ssl: config.ssl || false,
          'tunnel-enabled': false
        },
        is_full_sync: true,
        is_on_demand: false,
        schedules: {
          metadata_sync: {
            schedule_day: null,
            schedule_frame: null,
            schedule_hour: 0,
            schedule_type: 'hourly'
          },
          cache_field_values: {
            schedule_day: null,
            schedule_frame: null,
            schedule_hour: 0,
            schedule_type: 'hourly'
          }
        }
      };

      const response = await fetch(`${this.baseUrl}/api/database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': this.sessionToken
        },
        body: JSON.stringify(databaseConfig)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to add database: ${error}`);
      }

      const result = await response.json();
      console.log(`✅ Added database: ${config.name}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to add database ${config.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Set up ACT Community databases
   */
  async setupACTDatabases() {
    try {
      console.log('🗄️ Setting up ACT Community databases...');

      // Main ACT Database (Supabase)
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseHost = new URL(process.env.SUPABASE_URL).hostname;
        
        await this.addDatabase({
          name: 'ACT Community Database',
          engine: 'postgres',
          host: supabaseHost,
          port: 5432,
          database: 'postgres',
          username: 'postgres',
          password: process.env.SUPABASE_SERVICE_ROLE_KEY,
          ssl: true
        });
      }

      // PostHog Analytics (if configured)
      if (process.env.POSTHOG_API_KEY) {
        console.log('📊 PostHog integration available but requires manual setup');
        // PostHog requires API-based integration rather than direct DB connection
      }

      console.log('✅ Database setup completed');

    } catch (error) {
      console.error('❌ Failed to setup databases:', error.message);
      throw error;
    }
  }

  /**
   * Create collection for organizing dashboards
   */
  async createCollection(name, description, color = '#509EE3') {
    try {
      if (!this.sessionToken) {
        throw new Error('Not authenticated with Metabase');
      }

      const collectionData = {
        name,
        description,
        color,
        parent_id: null
      };

      const response = await fetch(`${this.baseUrl}/api/collection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': this.sessionToken
        },
        body: JSON.stringify(collectionData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create collection: ${error}`);
      }

      const result = await response.json();
      console.log(`✅ Created collection: ${name}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to create collection ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Create a dashboard
   */
  async createDashboard(name, description, collectionId = null) {
    try {
      if (!this.sessionToken) {
        throw new Error('Not authenticated with Metabase');
      }

      const dashboardData = {
        name,
        description,
        collection_id: collectionId,
        parameters: []
      };

      const response = await fetch(`${this.baseUrl}/api/dashboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': this.sessionToken
        },
        body: JSON.stringify(dashboardData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create dashboard: ${error}`);
      }

      const result = await response.json();
      console.log(`✅ Created dashboard: ${name}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to create dashboard ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Set up default ACT Community dashboards
   */
  async setupDefaultDashboards() {
    try {
      console.log('📊 Setting up default dashboards...');

      // Create collections
      const communityCollection = await this.createCollection(
        'ACT Community Analytics',
        'Core analytics for the ACT community platform',
        '#509EE3'
      );

      const impactCollection = await this.createCollection(
        'Project Impact Tracking',
        'Dashboards focused on project outcomes and impact measurement',
        '#88BF4D'
      );

      const healthCollection = await this.createCollection(
        'Data Quality & Health',
        'Monitoring dashboards for data quality and system health',
        '#F9CF48'
      );

      // Create dashboards
      const dashboards = [
        {
          name: 'Community Overview',
          description: 'High-level metrics about community engagement and growth',
          collection: communityCollection.id
        },
        {
          name: 'Project Impact',
          description: 'Track project outcomes and community impact metrics',
          collection: impactCollection.id
        },
        {
          name: 'User Engagement',
          description: 'Deep dive into user behavior and engagement patterns',
          collection: communityCollection.id
        },
        {
          name: 'Community Health',
          description: 'Monitor community health metrics and data quality',
          collection: healthCollection.id
        }
      ];

      for (const dashboard of dashboards) {
        await this.createDashboard(
          dashboard.name,
          dashboard.description,
          dashboard.collection
        );
      }

      console.log('✅ Default dashboards created');

    } catch (error) {
      console.error('❌ Failed to setup dashboards:', error.message);
      throw error;
    }
  }

  /**
   * Get all databases
   */
  async getDatabases() {
    try {
      if (!this.sessionToken) {
        throw new Error('Not authenticated with Metabase');
      }

      const response = await fetch(`${this.baseUrl}/api/database`, {
        headers: {
          'X-Metabase-Session': this.sessionToken
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get databases: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Failed to get databases:', error.message);
      throw error;
    }
  }

  /**
   * Get all dashboards
   */
  async getDashboards() {
    try {
      if (!this.sessionToken) {
        throw new Error('Not authenticated with Metabase');
      }

      const response = await fetch(`${this.baseUrl}/api/dashboard`, {
        headers: {
          'X-Metabase-Session': this.sessionToken
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get dashboards: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Failed to get dashboards:', error.message);
      throw error;
    }
  }

  /**
   * Get configuration status
   */
  async getStatus() {
    const health = await this.checkHealth();
    
    let databases = [];
    let dashboards = [];
    
    if (this.sessionToken) {
      try {
        databases = await this.getDatabases();
        dashboards = await this.getDashboards();
      } catch (error) {
        console.warn('⚠️ Could not fetch Metabase data:', error.message);
      }
    }

    return {
      service_available: health.success,
      setup_completed: this.setupCompleted,
      authenticated: !!this.sessionToken,
      databases: databases.length,
      dashboards: dashboards.length,
      metabase_url: this.baseUrl
    };
  }

  /**
   * Perform complete setup
   */
  async performCompleteSetup() {
    try {
      console.log('🚀 Starting complete Metabase setup...');

      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Metabase service');
      }

      await this.setupACTDatabases();
      await this.setupDefaultDashboards();

      console.log('🎉 Metabase setup completed successfully!');
      return await this.getStatus();

    } catch (error) {
      console.error('❌ Complete setup failed:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const metabaseConfigService = new MetabaseConfigService();

export default metabaseConfigService;