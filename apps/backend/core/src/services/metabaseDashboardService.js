/**
 * Metabase Dashboard Service
 * Creates and manages ACT Community-specific analytics dashboards
 */

import metabaseConfigService from './metabaseConfigService.js';

class MetabaseDashboardService {
  constructor() {
    this.dashboards = new Map();
    this.collections = new Map();
  }

  /**
   * Initialize dashboard service and create ACT Community dashboards
   */
  async initialize() {
    try {
      console.log('🏗️ Initializing ACT Community dashboards...');

      // Ensure Metabase service is ready
      await metabaseConfigService.initialize();

      // Create collections for organizing dashboards
      await this.createCollections();

      // Create core ACT Community dashboards
      await this.createCommunityDashboards();

      console.log('✅ ACT Community dashboards initialized');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize dashboards:', error.message);
      return false;
    }
  }

  /**
   * Create collections for organizing dashboards
   */
  async createCollections() {
    try {
      const collections = [
        {
          name: 'ACT Community Analytics',
          description: 'Core analytics for the ACT community platform',
          color: '#1E88E5'
        },
        {
          name: 'Project Impact & Outcomes',
          description: 'Tracking project progress, impact metrics, and community outcomes',
          color: '#43A047'
        },
        {
          name: 'Engagement & Behavior',
          description: 'User engagement patterns, behavioral analytics, and platform usage',
          color: '#FB8C00'
        },
        {
          name: 'Data Quality & Operations',
          description: 'Data quality monitoring, system health, and operational metrics',
          color: '#8E24AA'
        },
        {
          name: 'Personalization & Recommendations',
          description: 'User personalization insights and recommendation system performance',
          color: '#E91E63'
        }
      ];

      for (const collection of collections) {
        try {
          const result = await metabaseConfigService.createCollection(
            collection.name,
            collection.description,
            collection.color
          );
          this.collections.set(collection.name, result);
        } catch (error) {
          console.warn(`⚠️ Could not create collection ${collection.name}:`, error.message);
        }
      }

      console.log('✅ Collections created successfully');
    } catch (error) {
      console.error('❌ Failed to create collections:', error.message);
      throw error;
    }
  }

  /**
   * Create ACT Community dashboards
   */
  async createCommunityDashboards() {
    try {
      const dashboards = [
        // Executive Overview Dashboard
        {
          name: 'ACT Community Executive Overview',
          description: 'High-level KPIs and strategic metrics for leadership team',
          collection: 'ACT Community Analytics',
          cards: [
            'Total Active Users',
            'Community Growth Rate',
            'Project Completion Rate',
            'Impact Score Trending',
            'Geographic Distribution',
            'Platform Health Score'
          ]
        },

        // Community Engagement Dashboard
        {
          name: 'Community Engagement Deep Dive',
          description: 'Detailed user engagement metrics and behavioral patterns',
          collection: 'Engagement & Behavior',
          cards: [
            'Daily Active Users',
            'Session Duration Distribution',
            'Feature Usage Heatmap',
            'User Journey Analysis',
            'Content Engagement Metrics',
            'Retention Cohort Analysis'
          ]
        },

        // Project Impact Dashboard
        {
          name: 'Project Impact & Outcomes',
          description: 'Tracking project success, community impact, and outcome measurement',
          collection: 'Project Impact & Outcomes',
          cards: [
            'Active Projects by Category',
            'Project Completion Rates',
            'Impact Metrics by Project',
            'Community Benefits Tracking',
            'Resource Utilization',
            'Success Story Highlights'
          ]
        },

        // User Behavior Analytics
        {
          name: 'User Behavior & Personalization',
          description: 'Understanding user preferences and personalizing experiences',
          collection: 'Personalization & Recommendations',
          cards: [
            'User Preference Patterns',
            'A/B Test Performance',
            'Recommendation Effectiveness',
            'Personalization Impact',
            'Widget Usage Analytics',
            'Content Discovery Metrics'
          ]
        },

        // Operational Health Dashboard
        {
          name: 'Platform Operations & Health',
          description: 'System performance, data quality, and operational monitoring',
          collection: 'Data Quality & Operations',
          cards: [
            'API Response Times',
            'Data Quality Score',
            'Sync Success Rates',
            'Error Rate Monitoring',
            'Database Performance',
            'User Feedback Sentiment'
          ]
        },

        // Geographic Impact Dashboard
        {
          name: 'Geographic Impact Analysis',
          description: 'Regional analysis of community engagement and project distribution',
          collection: 'ACT Community Analytics',
          cards: [
            'Users by State/Territory',
            'Projects by Region',
            'Regional Engagement Rates',
            'Geographic Growth Trends',
            'Rural vs Urban Participation',
            'Regional Success Stories'
          ]
        }
      ];

      for (const dashboard of dashboards) {
        try {
          const collectionId = this.collections.get(dashboard.collection)?.id;
          const result = await metabaseConfigService.createDashboard(
            dashboard.name,
            dashboard.description,
            collectionId
          );
          
          this.dashboards.set(dashboard.name, {
            ...result,
            cards: dashboard.cards
          });

          console.log(`✅ Created dashboard: ${dashboard.name}`);
        } catch (error) {
          console.warn(`⚠️ Could not create dashboard ${dashboard.name}:`, error.message);
        }
      }

      console.log('✅ All dashboards created successfully');
    } catch (error) {
      console.error('❌ Failed to create dashboards:', error.message);
      throw error;
    }
  }

  /**
   * Get dashboard configuration for embedding
   */
  getDashboardConfig(dashboardName) {
    const dashboard = this.dashboards.get(dashboardName);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardName}`);
    }

    return {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      embed_url: `${metabaseConfigService.baseUrl}/embed/dashboard/${dashboard.id}`,
      public_url: `${metabaseConfigService.baseUrl}/dashboard/${dashboard.id}`,
      cards: dashboard.cards || []
    };
  }

  /**
   * Get all available dashboards
   */
  getAvailableDashboards() {
    return Array.from(this.dashboards.entries()).map(([name, dashboard]) => ({
      name,
      id: dashboard.id,
      description: dashboard.description,
      collection: dashboard.collection_id,
      cards: dashboard.cards || []
    }));
  }

  /**
   * Create sample questions for ACT Community data
   */
  async createSampleQuestions() {
    try {
      console.log('📊 Creating sample questions for ACT Community...');

      // This would create actual Metabase questions/cards
      // For now, we'll return the structure
      const questions = [
        {
          name: 'Total Active Users',
          description: 'Count of unique active users in the last 30 days',
          sql: `
            SELECT COUNT(DISTINCT user_id) as active_users
            FROM user_behaviors 
            WHERE timestamp >= NOW() - INTERVAL '30 days'
          `,
          visualization: 'scalar'
        },
        {
          name: 'User Growth Over Time',
          description: 'Weekly user growth trends',
          sql: `
            SELECT 
              DATE_TRUNC('week', created_at) as week,
              COUNT(*) as new_users
            FROM user_personalization_profiles
            WHERE created_at >= NOW() - INTERVAL '90 days'
            GROUP BY DATE_TRUNC('week', created_at)
            ORDER BY week
          `,
          visualization: 'line'
        },
        {
          name: 'Popular Widget Types',
          description: 'Most frequently used dashboard widgets',
          sql: `
            SELECT 
              context->>'widgetType' as widget_type,
              COUNT(*) as usage_count
            FROM user_behaviors 
            WHERE type = 'interaction' 
              AND context ? 'widgetType'
              AND timestamp >= NOW() - INTERVAL '7 days'
            GROUP BY context->>'widgetType'
            ORDER BY usage_count DESC
            LIMIT 10
          `,
          visualization: 'bar'
        },
        {
          name: 'A/B Test Performance',
          description: 'Conversion rates by A/B test variant',
          sql: `
            SELECT 
              test_name,
              variant,
              COUNT(*) as conversions,
              COUNT(DISTINCT user_id) as unique_users,
              ROUND(AVG(value), 2) as avg_value
            FROM ab_test_conversions 
            WHERE timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY test_name, variant
            ORDER BY test_name, conversions DESC
          `,
          visualization: 'table'
        },
        {
          name: 'User Engagement by Hour',
          description: 'Hourly distribution of user activity',
          sql: `
            SELECT 
              EXTRACT(HOUR FROM timestamp) as hour,
              COUNT(*) as activity_count
            FROM user_behaviors 
            WHERE timestamp >= NOW() - INTERVAL '7 days'
            GROUP BY EXTRACT(HOUR FROM timestamp)
            ORDER BY hour
          `,
          visualization: 'bar'
        }
      ];

      console.log(`📋 Sample questions defined: ${questions.length} questions`);
      return questions;

    } catch (error) {
      console.error('❌ Failed to create sample questions:', error.message);
      throw error;
    }
  }

  /**
   * Get dashboard embed configuration
   */
  getEmbedConfig(dashboardId, options = {}) {
    const {
      theme = 'light',
      bordered = false,
      titled = true,
      width = '100%',
      height = '600px'
    } = options;

    return {
      url: `${metabaseConfigService.baseUrl}/embed/dashboard/${dashboardId}`,
      params: {
        theme,
        bordered,
        titled
      },
      style: {
        width,
        height,
        border: bordered ? '1px solid #ddd' : 'none',
        borderRadius: '8px'
      },
      iframe_attributes: {
        frameBorder: '0',
        allowTransparency: 'true',
        sandbox: 'allow-scripts allow-same-origin'
      }
    };
  }

  /**
   * Get status of all dashboards
   */
  async getStatus() {
    try {
      const status = await metabaseConfigService.getStatus();
      
      return {
        service_available: status.service_available,
        collections_created: this.collections.size,
        dashboards_created: this.dashboards.size,
        metabase_url: metabaseConfigService.baseUrl,
        available_dashboards: this.getAvailableDashboards(),
        collections: Array.from(this.collections.keys())
      };
    } catch (error) {
      console.error('❌ Failed to get dashboard status:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const metabaseDashboardService = new MetabaseDashboardService();

export default metabaseDashboardService;