/**
 * Data Intelligence Service
 * The ultimate memory system that instantly knows all data capabilities and connections
 * NEVER SEARCH FOR DATA AGAIN - WE ALWAYS KNOW WHAT WE HAVE
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from '@notionhq/client';

class DataIntelligenceService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.notion = new Client({
      auth: process.env.NOTION_TOKEN
    });

    // Complete data lake architecture mapping
    this.dataLake = {
      // 🏗️ CORE DATA SOURCES (LIVE & WORKING)
      notion: {
        databases: {
          projects: {
            id: '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
            name: 'Projects',
            status: 'active',
            count: '55+',
            api: '/api/dashboard/real-projects',
            capabilities: ['create', 'read', 'update', 'query', 'real-time']
          },
          people: {
            id: '47bdc1c4-df99-4ddc-81c4-a0214c919d69',
            name: 'People',
            status: 'active',
            count: '100+',
            api: '/api/dashboard/real-contacts',
            capabilities: ['create', 'read', 'update', 'query', 'sync-gmail']
          },
          organizations: {
            id: '948f3946-7d1c-42f2-bd7e-1317a755e67b',
            name: 'Organizations',
            status: 'active',
            count: '50+',
            api: '/api/notion-proxy/organizations',
            capabilities: ['create', 'read', 'update', 'query']
          },
          opportunities: {
            id: '234ebcf9-81cf-804e-873f-f352f03c36da',
            name: 'Opportunities',
            status: 'active',
            count: '30+',
            api: '/api/notion-proxy/opportunities',
            capabilities: ['create', 'read', 'update', 'query', 'ai-analysis']
          },
          partners: {
            id: '1065e276-738e-4d38-9ceb-51497e00c3b4',
            name: 'Funding Partners',
            status: 'active', // Schema issues resolved
            count: '20+',
            api: '/api/notion-proxy/partners',
            capabilities: ['read', 'query']
          },
          actions: {
            id: '177ebcf9-81cf-8023-af6e-dff974284218',
            name: 'Actions',
            status: 'active',
            count: '200+',
            api: '/api/notion-proxy/actions',
            capabilities: ['create', 'read', 'update', 'query', 'task-tracking']
          },
          activities: {
            id: '6d9ccb03-ddab-48d3-9490-f08427897112',
            name: 'Activities',
            status: 'active',
            count: '100+',
            api: '/api/notion-proxy/activities',
            capabilities: ['create', 'read', 'update', 'query', 'calendar-sync']
          },
          artifacts: {
            id: '234ebcf9-81cf-8015-878d-eadb337662e4',
            name: 'Artifacts',
            status: 'active',
            count: '150+',
            api: '/api/notion-proxy/artifacts',
            capabilities: ['create', 'read', 'update', 'query', 'file-management']
          },
          stories: {
            id: '619ceac3-8d2a-4e30-bd73-0b81ccfadfc4',
            name: 'Stories',
            status: 'active',
            count: '80+',
            api: '/api/notion-proxy/stories',
            capabilities: ['create', 'read', 'update', 'query', 'ai-extraction']
          }
        },
        totalEntities: '1000+',
        realTimeCapable: true,
        aiEnhanced: true
      },

      // 🗄️ SUPABASE WAREHOUSE (15,020+ RECORDS)
      supabase: {
        tables: {
          linkedin_contacts: {
            records: '15,020+',
            status: 'active',
            capabilities: ['ml-recommendations', 'relationship-intelligence', 'network-analysis'],
            api: '/api/v1/linkedin/contacts'
          },
          linkedin_interactions: {
            records: '50,000+',
            status: 'active',
            capabilities: ['engagement-tracking', 'conversation-analysis'],
            api: '/api/v1/linkedin/interactions'
          },
          user_project_interactions: {
            records: '10,000+',
            status: 'active',
            capabilities: ['ml-training', 'recommendation-engine'],
            api: '/api/recommendations/interactions'
          },
          cached_recommendations: {
            records: '5,000+',
            status: 'active',
            capabilities: ['instant-recommendations', 'performance-optimization'],
            api: '/api/recommendations/cached'
          },
          dashboard_configs: {
            records: '100+',
            status: 'active',
            capabilities: ['personalization', 'adaptive-ui'],
            api: '/api/dashboard/config'
          },
          data_quality_audit: {
            status: 'schema_issues', // Column name mismatch detected
            issues: ['updated_at_column_missing']
          }
        },
        totalRecords: '80,000+',
        analyticsReady: true,
        mlPowered: true
      },

      // 🤖 AI & INTELLIGENCE LAYER (6 PROVIDERS ACTIVE)
      ai: {
        providers: {
          anthropic: {
            status: 'active',
            capabilities: ['analysis', 'reasoning', 'code-generation'],
            api: 'claude-3-5-sonnet'
          },
          openai: {
            status: 'active', 
            capabilities: ['completion', 'embedding', 'fine-tuning'],
            api: 'gpt-4o'
          },
          perplexity: {
            status: 'active',
            capabilities: ['web-research', 'real-time-search'],
            api: 'sonar-large-128k-online'
          },
          groq: {
            status: 'available',
            capabilities: ['fast-inference', 'reasoning']
          },
          google: {
            status: 'available',
            capabilities: ['multimodal', 'reasoning']
          },
          openrouter: {
            status: 'available',
            capabilities: ['model-aggregation', 'routing']
          }
        },
        activeProviders: 3,
        capabilities: ['intelligent-insights', 'pattern-detection', 'predictive-analytics', 'decision-intelligence']
      },

      // 🔗 INTEGRATION ECOSYSTEM
      integrations: {
        gmail: {
          status: 'connected',
          capabilities: ['email-sync', 'contact-intelligence', 'community-detection'],
          api: '/api/gmail-sync'
        },
        google: {
          status: 'ready',
          capabilities: ['calendar-sync', 'oauth', 'workspace-integration'],
          api: '/api/google'
        },
        xero: {
          status: 'needs_token_refresh',
          capabilities: ['financial-data', 'transaction-analysis', 'profit-sharing'],
          api: '/api/xero'
        },
        linkedin: {
          status: 'data-loaded',
          capabilities: ['network-analysis', 'relationship-mapping', 'opportunity-detection'],
          api: '/api/v1/linkedin'
        }
      },

      // ⚡ REAL-TIME CAPABILITIES
      realTime: {
        socketio: {
          status: 'active',
          port: 4000,
          capabilities: ['live-updates', 'room-based-subscriptions', 'event-broadcasting']
        },
        webhooks: {
          notion: 'configured',
          supabase: 'enabled'
        }
      }
    };

    // Initialize intelligent cache
    this.intelligenceCache = new Map();
    this.lastUpdateCheck = 0;
  }

  /**
   * 🧠 GET INSTANT DATA INTELLIGENCE
   * Returns immediate context about any data request
   */
  async getDataIntelligence(query) {
    const intelligence = {
      query,
      timestamp: new Date().toISOString(),
      recommendations: [],
      availableSources: [],
      bestApproach: null,
      apiEndpoints: [],
      capabilities: [],
      issues: []
    };

    // Intelligent query analysis
    const queryLower = query.toLowerCase();
    
    // 📊 PROJECT INTELLIGENCE
    if (queryLower.includes('project')) {
      intelligence.recommendations.push({
        type: 'primary_source',
        source: 'notion.projects',
        reason: '55+ active projects with full CRUD capabilities',
        api: '/api/dashboard/real-projects',
        confidence: 0.95
      });
      
      intelligence.availableSources.push('notion.projects', 'supabase.user_project_interactions');
      intelligence.capabilities.push('real-time-updates', 'ai-analysis', 'collaboration-features');
    }

    // 👥 CONTACT/PEOPLE INTELLIGENCE  
    if (queryLower.includes('contact') || queryLower.includes('people') || queryLower.includes('person')) {
      intelligence.recommendations.push({
        type: 'multi_source',
        sources: ['notion.people', 'supabase.linkedin_contacts'],
        reason: 'Combined 15,120+ contacts with relationship intelligence',
        apis: ['/api/dashboard/real-contacts', '/api/v1/linkedin/contacts'],
        confidence: 0.98
      });

      intelligence.availableSources.push('notion.people', 'supabase.linkedin_contacts', 'gmail.contacts');
      intelligence.capabilities.push('relationship-mapping', 'network-analysis', 'cross-referencing');
    }

    // 🏢 ORGANIZATION INTELLIGENCE
    if (queryLower.includes('organization') || queryLower.includes('company') || queryLower.includes('partner')) {
      intelligence.recommendations.push({
        type: 'notion_source',
        source: 'notion.organizations',
        reason: '50+ organizations with partnership data',
        api: '/api/notion-proxy/organizations',
        confidence: 0.90
      });

      if (queryLower.includes('partner')) {
        intelligence.recommendations.push({
          type: 'notion_source',
          source: 'notion.partners',
          reason: 'Active partners database with resolved schema',
          api: '/api/notion-proxy/partners',
          confidence: 0.95
        });
      }
    }

    // 💰 FINANCIAL INTELLIGENCE
    if (queryLower.includes('financial') || queryLower.includes('money') || queryLower.includes('funding')) {
      intelligence.recommendations.push({
        type: 'integration_source',
        source: 'xero',
        reason: 'Real-time financial data integration',
        api: '/api/xero',
        confidence: 0.75,
        status: 'needs_token_refresh'
      });
    }

    // 🤖 AI CAPABILITIES
    if (queryLower.includes('ai') || queryLower.includes('analysis') || queryLower.includes('intelligence')) {
      intelligence.capabilities.push('multi-provider-ai', 'web-research', 'pattern-detection', 'predictive-analytics');
      intelligence.recommendations.push({
        type: 'ai_powered',
        providers: ['anthropic', 'openai', 'perplexity'],
        reason: '3 active AI providers with specialized capabilities',
        confidence: 0.99
      });
    }

    // Determine best approach
    intelligence.bestApproach = this.determineBestApproach(intelligence);

    return intelligence;
  }

  /**
   * 🎯 DETERMINE OPTIMAL DATA APPROACH
   */
  determineBestApproach(intelligence) {
    if (intelligence.recommendations.length === 0) {
      return {
        type: 'general_search',
        suggestion: 'Use multi-source search across all available data sources'
      };
    }

    const highestConfidence = intelligence.recommendations.reduce((prev, current) => {
      return (prev.confidence > current.confidence) ? prev : current;
    });

    return {
      type: 'optimized',
      approach: highestConfidence,
      reasoning: `Highest confidence (${highestConfidence.confidence}) approach identified`
    };
  }

  /**
   * 🔍 GET ALL AVAILABLE APIS
   */
  getAllAPIs() {
    const apis = {
      // Core Platform APIs
      core: {
        health: 'GET /health',
        status: 'GET /status',
        dashboard_overview: 'GET /api/dashboard/overview',
        real_projects: 'GET /api/dashboard/real-projects',
        real_contacts: 'GET /api/dashboard/real-contacts'
      },

      // Notion Integration APIs
      notion: {
        projects: 'GET /api/notion-proxy/projects',
        partners: 'GET /api/notion-proxy/partners',
        create_page: 'POST /api/notion-proxy/create'
      },

      // Gmail & Google APIs
      gmail: {
        status: 'GET /api/gmail-sync/status',
        auth_start: 'POST /api/gmail-sync/auth/start',
        community_emails: 'GET /api/gmail-sync/community-emails'
      },

      // AI & Intelligence APIs
      intelligence: {
        analyze: 'POST /api/v1/intelligence/analyze',
        research: 'POST /api/v1/intelligence/research'
      },

      // Financial APIs
      financial: {
        xero_org: 'GET /api/xero/organisations',
        xero_transactions: 'GET /api/xero/transactions'
      },

      // Real-time APIs
      realtime: {
        socketio: 'ws://localhost:4000 (Socket.IO)',
        community_feed: 'GET /api/community/activity-feed'
      }
    };

    return apis;
  }

  /**
   * 🛠️ DIAGNOSE SYSTEM HEALTH
   */
  async diagnoseSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      services: {},
      issues: [],
      recommendations: []
    };

    // Check Notion databases
    for (const [key, db] of Object.entries(this.dataLake.notion.databases)) {
      try {
        await this.notion.databases.query({
          database_id: db.id,
          page_size: 1
        });
        health.services[`notion_${key}`] = 'healthy';
      } catch (error) {
        health.services[`notion_${key}`] = 'error';
        health.issues.push({
          service: `notion.${key}`,
          error: error.message,
          severity: 'warning'
        });
      }
    }

    // Check Supabase
    try {
      await this.supabase.from('linkedin_contacts').select('id').limit(1);
      health.services.supabase = 'healthy';
    } catch (error) {
      health.services.supabase = 'error';
      health.issues.push({
        service: 'supabase',
        error: error.message,
        severity: 'critical'
      });
    }

    // Generate recommendations
    if (health.issues.length > 0) {
      health.overall = 'degraded';
      health.recommendations.push(
        'Review Notion database schemas for property name mismatches',
        'Check Supabase table structures for missing columns',
        'Refresh expired authentication tokens'
      );
    }

    return health;
  }

  /**
   * 🧭 GET CONTEXTUAL GUIDANCE FOR NEW FEATURES
   */
  getFeatureGuidance(featureType) {
    const guidance = {
      featureType,
      recommendedDataSources: [],
      suggestedAPIs: [],
      aiCapabilities: [],
      implementationPattern: null,
      examples: []
    };

    switch (featureType.toLowerCase()) {
      case 'dashboard':
        guidance.recommendedDataSources = ['notion.projects', 'supabase.linkedin_contacts', 'realtime.socketio'];
        guidance.suggestedAPIs = ['/api/dashboard/real-projects', '/api/dashboard/real-contacts', 'Socket.IO'];
        guidance.aiCapabilities = ['intelligent-insights', 'pattern-detection'];
        guidance.implementationPattern = 'real-time-dashboard-with-ai';
        break;

      case 'contact-management':
        guidance.recommendedDataSources = ['notion.people', 'supabase.linkedin_contacts', 'gmail.contacts'];
        guidance.suggestedAPIs = ['/api/dashboard/real-contacts', '/api/gmail-sync/status'];
        guidance.aiCapabilities = ['relationship-mapping', 'contact-intelligence'];
        guidance.implementationPattern = 'multi-source-contact-system';
        break;

      case 'analytics':
        guidance.recommendedDataSources = ['supabase.user_project_interactions', 'supabase.linkedin_interactions'];
        guidance.suggestedAPIs = ['/api/v1/intelligence/analyze', '/api/recommendations/analytics'];
        guidance.aiCapabilities = ['predictive-analytics', 'pattern-detection'];
        guidance.implementationPattern = 'ai-powered-analytics';
        break;
    }

    return guidance;
  }
}

// Singleton instance
let dataIntelligenceService = null;

export const getDataIntelligenceService = () => {
  if (!dataIntelligenceService) {
    dataIntelligenceService = new DataIntelligenceService();
  }
  return dataIntelligenceService;
};

export default DataIntelligenceService;