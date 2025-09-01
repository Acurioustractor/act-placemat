/**
 * Real Dashboard Data API
 * 
 * Provides actual community data for the frontend dashboard
 * NO FAKE DATA - only real community stories and connections
 */

/**
 * Setup real dashboard data routes
 */
export function setupRealDashboardData(app) {
  console.log('🏠 Setting up Real Dashboard Data API endpoints');

  /**
   * GET /api/dashboard/real-contacts
   * Get real recent contacts from storytellers
   */
  app.get('/api/dashboard/real-contacts', async (req, res) => {
    try {
      const { limit = 5 } = req.query;
      
      // Import database manager dynamically
      const { default: databaseManager } = await import('../config/database.js');
      const supabase = databaseManager.getPrimaryClient();
      
      // Get recent storytellers with their real names and details
      const { data: contacts, error } = await supabase
        .from('storytellers')
        .select('id, full_name, bio, role, organization_id, project_id, created_at, consent_given')
        .eq('consent_given', true) // Only include people who have given consent
        .not('full_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;

      // Format the data for the dashboard
      const formattedContacts = contacts?.map(contact => ({
        id: contact.id,
        name: contact.full_name.trim(),
        role: contact.role || 'Community Member',
        bio: contact.bio?.substring(0, 100) + '...',
        isRecent: new Date(contact.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Within 30 days
        joinedDate: contact.created_at,
        hasProject: !!contact.project_id,
        hasOrganization: !!contact.organization_id
      })) || [];

      res.json({
        success: true,
        contacts: formattedContacts,
        total: formattedContacts.length,
        metadata: {
          source: 'real_storytellers_data',
          consentVerified: true,
          lastUpdated: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Real contacts fetch failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        contacts: [],
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/dashboard/real-projects
   * Get real active projects from the database
   */
  app.get('/api/dashboard/real-projects', async (req, res) => {
    try {
      const { limit = 5 } = req.query;
      
      // Import database manager dynamically
      const { default: databaseManager } = await import('../config/database.js');
      const supabase = databaseManager.getPrimaryClient();
      
      // Get real projects
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, description, status, location, organization_id, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;

      // Get organization names for projects
      const projectsWithOrgs = await Promise.all(
        (projects || []).map(async project => {
          let organizationName = null;
          
          if (project.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('name')
              .eq('id', project.organization_id)
              .single();
            organizationName = org?.name;
          }

          return {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status || 'Active',
            location: project.location,
            organization: organizationName,
            lastUpdated: project.updated_at,
            isActive: project.status !== 'completed',
            daysSinceUpdate: Math.floor((new Date() - new Date(project.updated_at)) / (1000 * 60 * 60 * 24))
          };
        })
      );

      res.json({
        success: true,
        projects: projectsWithOrgs,
        total: projectsWithOrgs.length,
        metadata: {
          source: 'real_projects_data',
          lastUpdated: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Real projects fetch failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        projects: [],
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/dashboard/real-community-overview
   * Get comprehensive real community overview focusing on impact and reach
   */
  app.get('/api/dashboard/real-community-overview', async (req, res) => {
    try {
      // Import database manager dynamically
      const { default: databaseManager } = await import('../config/database.js');
      const supabase = databaseManager.getPrimaryClient();
      
      // Get comprehensive stats
      const [storytellersResult, projectsResult, organizationsResult, usersResult] = await Promise.allSettled([
        supabase.from('storytellers').select('id, consent_given, created_at').eq('consent_given', true),
        supabase.from('projects').select('id, status, created_at'),
        supabase.from('organizations').select('id, type, created_at'),
        supabase.from('users').select('id, created_at')
      ]);

      const storytellers = storytellersResult.status === 'fulfilled' ? storytellersResult.value.data || [] : [];
      const projects = projectsResult.status === 'fulfilled' ? projectsResult.value.data || [] : [];
      const organizations = organizationsResult.status === 'fulfilled' ? organizationsResult.value.data || [] : [];
      const users = usersResult.status === 'fulfilled' ? usersResult.value.data || [] : [];

      // Calculate recent activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentStorytellers = storytellers.filter(s => new Date(s.created_at) > thirtyDaysAgo);
      const recentProjects = projects.filter(p => new Date(p.created_at) > thirtyDaysAgo);

      // Project status breakdown
      const activeProjects = projects.filter(p => p.status === 'active').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const plannedProjects = projects.filter(p => p.status === 'planned' || !p.status).length;

      // Organization types
      const organizationTypes = organizations.reduce((acc, org) => {
        acc[org.type || 'unknown'] = (acc[org.type || 'unknown'] || 0) + 1;
        return acc;
      }, {});

      const stats = {
        community: {
          totalStoryTellers: storytellers.length,
          recentStoryTellers: recentStorytellers.length,
          totalUsers: users.length,
          consentedMembers: storytellers.filter(s => s.consent_given).length
        },
        projects: {
          total: projects.length,
          active: activeProjects,
          completed: completedProjects,
          planned: plannedProjects,
          recent: recentProjects.length
        },
        organizations: {
          total: organizations.length,
          byType: organizationTypes
        },
        activity: {
          last30Days: {
            newMembers: recentStorytellers.length,
            newProjects: recentProjects.length
          }
        },
        metadata: {
          source: 'real_community_data',
          dataFreshness: new Date().toISOString(),
          privacyCompliant: true
        }
      };

      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Community stats fetch failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/dashboard/real-recent-activity
   * Get real recent activity from the community
   */
  app.get('/api/dashboard/real-recent-activity', async (req, res) => {
    try {
      // Import database manager dynamically
      const { default: databaseManager } = await import('../config/database.js');
      const supabase = databaseManager.getPrimaryClient();
      
      // Get recent activity from multiple sources
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const [recentStorytellers, recentProjects, recentOrganizations] = await Promise.allSettled([
        supabase
          .from('storytellers')
          .select('id, full_name, created_at, bio')
          .gte('created_at', sevenDaysAgo.toISOString())
          .eq('consent_given', true)
          .order('created_at', { ascending: false })
          .limit(10),
        
        supabase
          .from('projects')
          .select('id, name, status, updated_at, created_at')
          .gte('updated_at', sevenDaysAgo.toISOString())
          .order('updated_at', { ascending: false })
          .limit(10),
          
        supabase
          .from('organizations')
          .select('id, name, type, created_at')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const activity = [];

      // Add storyteller activities
      if (recentStorytellers.status === 'fulfilled' && recentStorytellers.value.data) {
        recentStorytellers.value.data.forEach(storyteller => {
          activity.push({
            id: `storyteller-${storyteller.id}`,
            type: 'storyteller_joined',
            title: `${storyteller.full_name} joined the community`,
            description: storyteller.bio?.substring(0, 100) + '...' || 'New community storyteller',
            timestamp: storyteller.created_at,
            icon: '👥'
          });
        });
      }

      // Add project activities
      if (recentProjects.status === 'fulfilled' && recentProjects.value.data) {
        recentProjects.value.data.forEach(project => {
          const isNew = new Date(project.created_at) > sevenDaysAgo;
          activity.push({
            id: `project-${project.id}`,
            type: isNew ? 'project_created' : 'project_updated',
            title: isNew ? `New project: ${project.name}` : `Updated: ${project.name}`,
            description: `Status: ${project.status || 'Active'}`,
            timestamp: project.updated_at || project.created_at,
            icon: isNew ? '🚀' : '📝'
          });
        });
      }

      // Add organization activities
      if (recentOrganizations.status === 'fulfilled' && recentOrganizations.value.data) {
        recentOrganizations.value.data.forEach(org => {
          activity.push({
            id: `org-${org.id}`,
            type: 'organization_added',
            title: `New organization: ${org.name}`,
            description: `Type: ${org.type || 'Community'}`,
            timestamp: org.created_at,
            icon: '🏢'
          });
        });
      }

      // Sort all activity by timestamp
      activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({
        success: true,
        activity: activity.slice(0, 15), // Return top 15 most recent
        total: activity.length,
        metadata: {
          source: 'real_activity_data',
          period: 'last_7_days',
          lastUpdated: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Recent activity fetch failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        activity: [],
        timestamp: new Date().toISOString()
      });
    }
  });

  console.log('✅ Real Dashboard Data API endpoints registered');
}

export default setupRealDashboardData;