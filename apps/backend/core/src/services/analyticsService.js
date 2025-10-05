/**
 * Advanced Analytics Service for ACT Placemat
 * Provides real-time KPIs and executive overview data
 */

const { logger } = require('../../utils/logger');
const { makeNotionRequest } = require('../../utils/apiUtils');
const { cacheService } = require('./cacheService');

class AnalyticsService {
  constructor(config) {
    this.config = config;
    this.kpiCache = new Map();
    this.kpiTTL = 300000; // 5 minutes for KPIs
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics() {
    try {
      const [
        projectMetrics,
        opportunityMetrics,
        organizationMetrics,
        peopleMetrics,
        relationshipMetrics,
        performanceMetrics
      ] = await Promise.all([
        this.getProjectMetrics(),
        this.getOpportunityMetrics(),
        this.getOrganizationMetrics(),
        this.getPeopleMetrics(),
        this.getRelationshipMetrics(),
        this.getPerformanceMetrics()
      ]);

      return {
        overview: {
          totalProjects: projectMetrics.total,
          activeProjects: projectMetrics.active,
          totalRevenue: projectMetrics.totalRevenue,
          pipelineValue: opportunityMetrics.pipelineValue,
          networkSize: organizationMetrics.total + peopleMetrics.total,
          winRate: opportunityMetrics.winRate
        },
        projects: projectMetrics,
        opportunities: opportunityMetrics,
        organizations: organizationMetrics,
        people: peopleMetrics,
        relationships: relationshipMetrics,
        performance: performanceMetrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Get project-specific metrics
   */
  async getProjectMetrics() {
    const cacheKey = 'project_metrics';
    const cached = this.getCachedKPI(cacheKey);
    if (cached) return cached;

    try {
      const projectsData = await this.fetchDatabaseData(this.config.notion.databases.projects);
      
      if (!projectsData || !projectsData.results) {
        return this.getEmptyProjectMetrics();
      }

      const projects = projectsData.results;
      const now = new Date();
      
      const metrics = {
        total: projects.length,
        active: 0,
        completed: 0,
        planning: 0,
        onHold: 0,
        totalRevenue: 0,
        potentialRevenue: 0,
        byStatus: {},
        byArea: {},
        byTheme: {},
        recentActivity: [],
        topPerformers: [],
        monthlyTrend: this.calculateMonthlyTrend(projects, 'created_time')
      };

      projects.forEach(project => {
        const properties = project.properties || {};
        
        // Status analysis
        const status = properties.Status?.select?.name || 'Unknown';
        metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
        
        switch (status.toLowerCase()) {
          case 'active':
          case 'building':
          case 'growing':
            metrics.active++;
            break;
          case 'completed':
          case 'harvest':
            metrics.completed++;
            break;
          case 'planning':
          case 'sprouting':
            metrics.planning++;
            break;
          case 'on hold':
          case 'dormant':
            metrics.onHold++;
            break;
        }

        // Area analysis
        const area = properties.Area?.select?.name || properties['Project Area']?.select?.name || 'Uncategorized';
        metrics.byArea[area] = (metrics.byArea[area] || 0) + 1;

        // Theme analysis
        const themes = properties.Tags?.multi_select || [];
        themes.forEach(theme => {
          metrics.byTheme[theme.name] = (metrics.byTheme[theme.name] || 0) + 1;
        });

        // Revenue analysis
        const actualRevenue = properties['Revenue Actual']?.number || 0;
        const potentialRevenue = properties['Revenue Potential']?.number || 0;
        metrics.totalRevenue += actualRevenue;
        metrics.potentialRevenue += potentialRevenue;

        // Recent activity (projects created in last 30 days)
        const createdTime = new Date(project.created_time);
        const daysSinceCreated = (now - createdTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreated <= 30) {
          metrics.recentActivity.push({
            id: project.id,
            name: properties.Name?.title?.[0]?.plain_text || 'Untitled',
            status: status,
            area: area,
            daysAgo: Math.floor(daysSinceCreated)
          });
        }

        // Top performers (by revenue)
        if (actualRevenue > 0) {
          metrics.topPerformers.push({
            id: project.id,
            name: properties.Name?.title?.[0]?.plain_text || 'Untitled',
            revenue: actualRevenue,
            potential: potentialRevenue,
            status: status,
            area: area
          });
        }
      });

      // Sort and limit arrays
      metrics.recentActivity.sort((a, b) => a.daysAgo - b.daysAgo);
      metrics.topPerformers.sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      this.setCachedKPI(cacheKey, metrics);
      return metrics;

    } catch (error) {
      logger.error('Error calculating project metrics:', error);
      return this.getEmptyProjectMetrics();
    }
  }

  /**
   * Get opportunity pipeline metrics
   */
  async getOpportunityMetrics() {
    const cacheKey = 'opportunity_metrics';
    const cached = this.getCachedKPI(cacheKey);
    if (cached) return cached;

    try {
      const opportunitiesData = await this.fetchDatabaseData(this.config.notion.databases.opportunities);
      
      if (!opportunitiesData || !opportunitiesData.results) {
        return this.getEmptyOpportunityMetrics();
      }

      const opportunities = opportunitiesData.results;
      
      const metrics = {
        total: opportunities.length,
        won: 0,
        lost: 0,
        inProgress: 0,
        pipelineValue: 0,
        wonValue: 0,
        averageDealSize: 0,
        winRate: 0,
        byStage: {},
        byProbability: { high: 0, medium: 0, low: 0 },
        recentWins: [],
        monthlyTrend: this.calculateMonthlyTrend(opportunities, 'created_time')
      };

      let totalValue = 0;
      let dealsWithValue = 0;

      opportunities.forEach(opportunity => {
        const properties = opportunity.properties || {};
        
        // Stage analysis
        const stage = properties.Stage?.select?.name || 'Unknown';
        metrics.byStage[stage] = (metrics.byStage[stage] || 0) + 1;
        
        // Status classification
        switch (stage.toLowerCase()) {
          case 'closed won':
          case 'won':
            metrics.won++;
            break;
          case 'closed lost':
          case 'lost':
            metrics.lost++;
            break;
          default:
            metrics.inProgress++;
            break;
        }

        // Value analysis
        const amount = properties.Amount?.number || 0;
        if (amount > 0) {
          totalValue += amount;
          dealsWithValue++;
          
          if (stage.toLowerCase().includes('won')) {
            metrics.wonValue += amount;
          } else if (!stage.toLowerCase().includes('lost')) {
            metrics.pipelineValue += amount;
          }
        }

        // Probability analysis
        const probability = properties.Probability?.select?.name || properties.Probability?.number || 0;
        const probValue = typeof probability === 'string' ? 
          this.parseProbabilityString(probability) : probability;
        
        if (probValue >= 75) {
          metrics.byProbability.high++;
        } else if (probValue >= 25) {
          metrics.byProbability.medium++;
        } else {
          metrics.byProbability.low++;
        }

        // Recent wins (last 30 days)
        if (stage.toLowerCase().includes('won')) {
          const lastEditedTime = new Date(opportunity.last_edited_time);
          const daysSinceWon = (new Date() - lastEditedTime) / (1000 * 60 * 60 * 24);
          
          if (daysSinceWon <= 30) {
            metrics.recentWins.push({
              id: opportunity.id,
              name: properties.Name?.title?.[0]?.plain_text || 'Untitled',
              amount: amount,
              daysAgo: Math.floor(daysSinceWon)
            });
          }
        }
      });

      // Calculate derived metrics
      metrics.averageDealSize = dealsWithValue > 0 ? totalValue / dealsWithValue : 0;
      metrics.winRate = (metrics.won + metrics.lost) > 0 ? 
        (metrics.won / (metrics.won + metrics.lost)) * 100 : 0;

      // Sort recent wins
      metrics.recentWins.sort((a, b) => a.daysAgo - b.daysAgo);

      this.setCachedKPI(cacheKey, metrics);
      return metrics;

    } catch (error) {
      logger.error('Error calculating opportunity metrics:', error);
      return this.getEmptyOpportunityMetrics();
    }
  }

  /**
   * Get organization network metrics
   */
  async getOrganizationMetrics() {
    const cacheKey = 'organization_metrics';
    const cached = this.getCachedKPI(cacheKey);
    if (cached) return cached;

    try {
      const organizationsData = await this.fetchDatabaseData(this.config.notion.databases.organizations);
      
      if (!organizationsData || !organizationsData.results) {
        return { total: 0, byType: {}, byStatus: {}, activeConnections: 0 };
      }

      const organizations = organizationsData.results;
      
      const metrics = {
        total: organizations.length,
        byType: {},
        byStatus: {},
        activeConnections: 0,
        newThisMonth: 0,
        topPartners: []
      };

      organizations.forEach(org => {
        const properties = org.properties || {};
        
        // Type analysis
        const type = properties.Type?.select?.name || 'Unknown';
        metrics.byType[type] = (metrics.byType[type] || 0) + 1;
        
        // Status analysis
        const status = properties.Status?.select?.name || 'Unknown';
        metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
        
        if (status.toLowerCase().includes('active')) {
          metrics.activeConnections++;
        }

        // Recent additions
        const createdTime = new Date(org.created_time);
        const now = new Date();
        const daysSinceCreated = (now - createdTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreated <= 30) {
          metrics.newThisMonth++;
        }

        // Top partners (organizations with active projects)
        const activeProjects = properties['Active Projects']?.rollup?.number || 0;
        if (activeProjects > 0) {
          metrics.topPartners.push({
            id: org.id,
            name: properties.Name?.title?.[0]?.plain_text || 'Untitled',
            type: type,
            activeProjects: activeProjects
          });
        }
      });

      // Sort top partners
      metrics.topPartners.sort((a, b) => b.activeProjects - a.activeProjects).slice(0, 10);

      this.setCachedKPI(cacheKey, metrics);
      return metrics;

    } catch (error) {
      logger.error('Error calculating organization metrics:', error);
      return { total: 0, byType: {}, byStatus: {}, activeConnections: 0 };
    }
  }

  /**
   * Get people/contacts metrics
   */
  async getPeopleMetrics() {
    const cacheKey = 'people_metrics';
    const cached = this.getCachedKPI(cacheKey);
    if (cached) return cached;

    try {
      const peopleData = await this.fetchDatabaseData(this.config.notion.databases.people);
      
      if (!peopleData || !peopleData.results) {
        return { total: 0, activeMeetings: 0, recentContacts: [] };
      }

      const people = peopleData.results;
      
      const metrics = {
        total: people.length,
        activeMeetings: 0,
        recentContacts: [],
        byRole: {},
        newContacts: 0
      };

      people.forEach(person => {
        const properties = person.properties || {};
        
        // Role analysis
        const role = properties.Role?.rich_text?.[0]?.plain_text || 'Unknown';
        metrics.byRole[role] = (metrics.byRole[role] || 0) + 1;
        
        // Active meetings
        const nextMeeting = properties['Next Meeting']?.date?.start;
        if (nextMeeting) {
          const meetingDate = new Date(nextMeeting);
          const now = new Date();
          if (meetingDate >= now) {
            metrics.activeMeetings++;
          }
        }

        // Recent contacts (added in last 30 days)
        const createdTime = new Date(person.created_time);
        const now = new Date();
        const daysSinceCreated = (now - createdTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreated <= 30) {
          metrics.newContacts++;
          metrics.recentContacts.push({
            id: person.id,
            name: properties.Name?.title?.[0]?.plain_text || 'Untitled',
            role: role,
            daysAgo: Math.floor(daysSinceCreated)
          });
        }
      });

      // Sort recent contacts
      metrics.recentContacts.sort((a, b) => a.daysAgo - b.daysAgo);

      this.setCachedKPI(cacheKey, metrics);
      return metrics;

    } catch (error) {
      logger.error('Error calculating people metrics:', error);
      return { total: 0, activeMeetings: 0, recentContacts: [] };
    }
  }

  /**
   * Analyze cross-database relationships
   */
  async getRelationshipMetrics() {
    const cacheKey = 'relationship_metrics';
    const cached = this.getCachedKPI(cacheKey);
    if (cached) return cached;

    try {
      // This would require cross-database analysis
      // For now, return basic relationship health metrics
      const metrics = {
        projectOrganizationLinks: 0,
        opportunityOrganizationLinks: 0,
        peopleMeetingsScheduled: 0,
        overallHealthScore: 0,
        recommendations: []
      };

      // Calculate relationship health score
      const projectMetrics = await this.getProjectMetrics();
      const opportunityMetrics = await this.getOpportunityMetrics();
      const peopleMetrics = await this.getPeopleMetrics();

      // Basic health scoring
      let healthScore = 0;
      if (projectMetrics.active > 0) healthScore += 25;
      if (opportunityMetrics.pipelineValue > 0) healthScore += 25;
      if (opportunityMetrics.winRate > 20) healthScore += 25;
      if (peopleMetrics.activeMeetings > 0) healthScore += 25;

      metrics.overallHealthScore = healthScore;

      // Generate recommendations
      if (opportunityMetrics.winRate < 30) {
        metrics.recommendations.push("Consider reviewing opportunity qualification criteria to improve win rate");
      }
      if (peopleMetrics.activeMeetings < 5) {
        metrics.recommendations.push("Schedule more client meetings to strengthen relationships");
      }
      if (projectMetrics.active < 10) {
        metrics.recommendations.push("Increase active project pipeline for sustained growth");
      }

      this.setCachedKPI(cacheKey, metrics);
      return metrics;

    } catch (error) {
      logger.error('Error calculating relationship metrics:', error);
      return { projectOrganizationLinks: 0, opportunityOrganizationLinks: 0, overallHealthScore: 0, recommendations: [] };
    }
  }

  /**
   * Get system performance metrics
   */
  getPerformanceMetrics() {
    return cacheService.getPerformanceStats();
  }

  /**
   * Helper methods
   */
  async fetchDatabaseData(databaseId) {
    if (!databaseId) return null;
    
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.notion.token}`,
        'Notion-Version': this.config.notion.apiVersion,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 100 })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch database ${databaseId}: ${response.status}`);
    }

    return await response.json();
  }

  calculateMonthlyTrend(items, dateField) {
    const monthCounts = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[key] = 0;
    }

    items.forEach(item => {
      const itemDate = new Date(item[dateField]);
      const key = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthCounts.hasOwnProperty(key)) {
        monthCounts[key]++;
      }
    });

    return Object.entries(monthCounts).map(([month, count]) => ({ month, count }));
  }

  parseProbabilityString(probString) {
    const match = probString.match(/(\d+)%?/);
    return match ? parseInt(match[1]) : 0;
  }

  getCachedKPI(key) {
    const cached = this.kpiCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.kpiTTL) {
      return cached.data;
    }
    return null;
  }

  setCachedKPI(key, data) {
    this.kpiCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Empty metrics fallbacks
  getEmptyProjectMetrics() {
    return {
      total: 0, active: 0, completed: 0, planning: 0, onHold: 0,
      totalRevenue: 0, potentialRevenue: 0, byStatus: {}, byArea: {}, byTheme: {},
      recentActivity: [], topPerformers: [], monthlyTrend: []
    };
  }

  getEmptyOpportunityMetrics() {
    return {
      total: 0, won: 0, lost: 0, inProgress: 0, pipelineValue: 0, wonValue: 0,
      averageDealSize: 0, winRate: 0, byStage: {}, byProbability: { high: 0, medium: 0, low: 0 },
      recentWins: [], monthlyTrend: []
    };
  }
}

module.exports = AnalyticsService;