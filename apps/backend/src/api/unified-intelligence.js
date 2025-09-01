/**
 * Unified Intelligence Dashboard API
 * 
 * This is the magic system that connects:
 * - Notion: Projects, Organizations, Opportunities (source of truth for operational data)
 * - Supabase: Community stories, storytellers, consent management (human stories)
 * - Gmail: Contact intelligence, communication flows
 * - Calendar: Meeting data, project timelines
 * 
 * Logic: Pull live operational data from Notion, human stories from Supabase,
 * cross-reference with Gmail contacts and Calendar meetings for complete intelligence
 */

/**
 * Setup unified intelligence routes
 */
export function setupUnifiedIntelligence(app) {
  console.log('🧠 Setting up Unified Intelligence System...');

  /**
   * GET /api/intelligence/dashboard
   * The magic endpoint that combines all data sources intelligently
   */
  app.get('/api/intelligence/dashboard', async (req, res) => {
    try {
      console.log('🧠 Gathering intelligence from all sources...');
      
      // Get fresh data from all sources in parallel
      const [notionData, supabaseData, crmData, linkedinData] = await Promise.allSettled([
        // Notion: Source of truth for projects, organizations, opportunities
        fetch('http://localhost:4000/api/dashboard/overview').then(r => r.json()),
        
        // Supabase: Community stories and human connections
        fetch('http://localhost:4000/api/dashboard/real-community-stats').then(r => r.json()),
        
        // CRM: Contact intelligence and metrics
        fetch('http://localhost:4000/api/crm/metrics').then(r => r.json()),
        
        // LinkedIn: Professional network analytics
        fetch('http://localhost:4000/api/crm/linkedin-analytics').then(r => r.json())
      ]);

      // Extract the data safely
      const notion = notionData.status === 'fulfilled' ? notionData.value : null;
      const supabase = supabaseData.status === 'fulfilled' ? supabaseData.value : null;
      const crm = crmData.status === 'fulfilled' ? crmData.value : null;
      const linkedin = linkedinData.status === 'fulfilled' ? linkedinData.value : null;

      // Build unified intelligence
      const unifiedIntelligence = {
        // OPERATIONAL METRICS (from Notion - source of truth)
        operations: {
          totalProjects: notion?.metrics?.totalProjects || 0,
          activeProjects: notion?.metrics?.activeProjects || 0,
          completedProjects: notion?.metrics?.totalProjects - notion?.metrics?.activeProjects || 0,
          partnerOrganizations: notion?.metrics?.partnerOrganizations || 0,
          totalOpportunities: notion?.metrics?.totalOpportunities || 0,
          highValueOpportunities: notion?.metrics?.highValueOpportunities || 0,
          dataSource: 'notion_live_data'
        },

        // COMMUNITY METRICS (from Supabase - human stories)
        community: {
          totalStorytellers: supabase?.stats?.community?.totalStoryTellers || 0,
          consentedMembers: supabase?.stats?.community?.consentedMembers || 0,
          recentStorytellers: supabase?.stats?.community?.recentStoryTellers || 0,
          communityProjects: supabase?.stats?.projects?.total || 0, // Different from operational projects
          dataSource: 'supabase_community_data'
        },

        // NETWORK INTELLIGENCE (from CRM/LinkedIn)
        network: {
          totalContacts: crm?.totalPeople || linkedin?.analytics?.totalContacts || 0,
          linkedinContacts: crm?.linkedinContacts || linkedin?.analytics?.linkedinContacts || 0,
          strategicContacts: crm?.highValueContacts || linkedin?.analytics?.highValueContacts || 0,
          recentConnections: crm?.recentConnections || linkedin?.analytics?.recentConnections || 0,
          topCompanies: linkedin?.analytics?.topCompanies?.slice(0, 5) || [],
          topLocations: linkedin?.analytics?.topLocations?.slice(0, 5) || [],
          dataSource: 'crm_linkedin_intelligence'
        },

        // RECENT ACTIVITY (combined from all sources)
        recentActivity: [
          ...(notion?.recentActivity || []).map(activity => ({
            ...activity,
            source: 'notion',
            type: 'project_update'
          })),
          // TODO: Add Gmail recent emails, Calendar recent meetings
        ],

        // TOP PROJECTS (from Notion with community cross-reference)
        topProjects: (notion?.topProjects || []).slice(0, 5).map(project => ({
          ...project,
          communityStories: 0, // TODO: Cross-reference with Supabase storytellers
          lastActivity: project.lastUpdated || new Date().toISOString()
        })),

        // METADATA
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSources: {
            notion: notion ? 'connected' : 'unavailable',
            supabase: supabase ? 'connected' : 'unavailable', 
            crm: crm ? 'connected' : 'unavailable',
            linkedin: linkedin ? 'connected' : 'unavailable'
          },
          dataFreshness: {
            notion: notion?.timestamp || null,
            supabase: supabase?.timestamp || null,
            crm: new Date().toISOString(),
            linkedin: linkedin?.lastUpdated || null
          }
        }
      };

      // Log intelligence summary
      console.log('🧠 Unified Intelligence Summary:');
      console.log(`   📊 Operations: ${unifiedIntelligence.operations.activeProjects}/${unifiedIntelligence.operations.totalProjects} projects, ${unifiedIntelligence.operations.partnerOrganizations} orgs`);
      console.log(`   👥 Community: ${unifiedIntelligence.community.totalStorytellers} storytellers, ${unifiedIntelligence.community.consentedMembers} consented`);
      console.log(`   🌐 Network: ${unifiedIntelligence.network.linkedinContacts} LinkedIn, ${unifiedIntelligence.network.strategicContacts} strategic`);

      res.json({
        success: true,
        intelligence: unifiedIntelligence,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('🧠 Unified Intelligence failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        intelligence: null,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/intelligence/data-sources
   * Shows the logic and status of all data sources
   */
  app.get('/api/intelligence/data-sources', async (req, res) => {
    try {
      const dataSources = {
        notion: {
          purpose: 'Source of truth for projects, organizations, opportunities, and operational metrics',
          endpoints: [
            '/api/dashboard/overview',
            '/api/notion/partners'
          ],
          dataTypes: ['projects', 'organizations', 'opportunities', 'budgets', 'timelines'],
          updateFrequency: 'real-time',
          priority: 'primary'
        },
        supabase: {
          purpose: 'Community stories, storytellers, consent management, and human connections cache',
          endpoints: [
            '/api/dashboard/real-community-stats',
            '/api/dashboard/real-contacts',
            '/api/dashboard/real-projects'
          ],
          dataTypes: ['storytellers', 'stories', 'consent', 'privacy_preferences', 'community_cache'],
          updateFrequency: 'batch_sync',
          priority: 'secondary'
        },
        gmail: {
          purpose: 'Contact intelligence, communication flows, and relationship mapping',
          endpoints: [
            '/api/crm/metrics', 
            '/api/gmail/recent-contacts'
          ],
          dataTypes: ['emails', 'contacts', 'communication_frequency', 'relationship_strength'],
          updateFrequency: 'periodic_sync',
          priority: 'tertiary'
        },
        linkedin: {
          purpose: 'Professional network analytics and strategic contact intelligence',
          endpoints: [
            '/api/crm/linkedin-analytics'
          ],
          dataTypes: ['professional_network', 'company_intelligence', 'location_analytics', 'relationship_scores'],
          updateFrequency: 'daily_batch',
          priority: 'tertiary'
        },
        calendar: {
          purpose: 'Meeting intelligence, project timelines, and engagement tracking',
          endpoints: [
            '/api/calendar/meetings',
            '/api/calendar/project-timeline'
          ],
          dataTypes: ['meetings', 'project_milestones', 'engagement_frequency', 'availability'],
          updateFrequency: 'real-time',
          priority: 'secondary',
          status: 'not_implemented'
        }
      };

      res.json({
        success: true,
        dataSources,
        syncStrategy: {
          primary: 'Notion drives operational metrics - projects, orgs, opportunities',
          secondary: 'Supabase provides human stories and community intelligence',
          tertiary: 'Gmail/LinkedIn provide network and communication intelligence',
          calendar: 'Calendar provides timeline and engagement intelligence',
          logic: 'Always prefer live Notion data for operational metrics, use Supabase for community stories, cross-reference with network intelligence'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Data sources check failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /api/intelligence/sync
   * Triggers intelligent data sync across all platforms
   */
  app.post('/api/intelligence/sync', async (req, res) => {
    try {
      console.log('🔄 Starting intelligent cross-platform sync...');
      
      const syncResults = {
        notion: { status: 'pending', message: 'Fetching live project data...' },
        supabase: { status: 'pending', message: 'Syncing community stories...' },
        gmail: { status: 'pending', message: 'Updating contact intelligence...' },
        calendar: { status: 'not_implemented', message: 'Calendar sync not implemented yet' }
      };

      // TODO: Implement intelligent sync logic
      // 1. Fetch fresh Notion data
      // 2. Cross-reference with Supabase storytellers
      // 3. Update contact intelligence from Gmail
      // 4. Sync meeting data from Calendar
      // 5. Resolve conflicts intelligently

      res.json({
        success: true,
        message: 'Intelligent sync initiated',
        syncResults,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Intelligent sync failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  console.log('✅ Unified Intelligence System endpoints registered');
}

export default setupUnifiedIntelligence;