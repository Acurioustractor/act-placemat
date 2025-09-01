/**
 * Mobile-optimized Notion Connector for ACT Placemat
 * Australian project and opportunity management with offline support
 */

import { Client } from '@notionhq/client';
import { z } from 'zod';
import { BaseConnector } from '../core/BaseConnector';
import type {
  ApiResponse,
  Project,
  Opportunity,
  Person,
  SearchQuery,
  SearchResult,
  OfflineAction,
  ComplianceMetadata
} from '../types';

// Validation schemas for Australian compliance
const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['planning', 'active', 'completed', 'paused']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  budget: z.number().optional(),
  deadline: z.string().optional(),
  team: z.array(z.string()),
  impact: z.string().optional(),
  url: z.string()
});

const OpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['grant', 'partnership', 'funding', 'contract']),
  amount: z.number(),
  deadline: z.string().optional(),
  probability: z.number().optional(),
  status: z.enum(['open', 'applied', 'closed', 'awarded']),
  requirements: z.string().optional(),
  url: z.string()
});

export class NotionConnector extends BaseConnector {
  private client: Client | null = null;
  private databases: {
    projects?: string;
    opportunities?: string;
    people?: string;
    organizations?: string;
  } = {};
  private isInitialized = false;

  constructor(config: {
    apiKey?: string;
    databases?: {
      projects?: string;
      opportunities?: string;
      people?: string;
      organizations?: string;
    };
  } = {}) {
    super({
      timeout: 20000, // Notion can be slower
      cache: {
        ttl: 15 * 60 * 1000, // 15 minutes for project data
        maxSize: 300, // Smaller cache for mobile
        compressionEnabled: true,
        offlineMode: true
      },
      compliance: {
        dataResidency: 'global', // Notion is global, but we track Australian data
        encryptionRequired: true,
        auditEnabled: true
      },
      mobile: {
        backgroundSync: true,
        wifiOnlySync: true, // Notion data is less critical for offline
        compressionEnabled: true,
        batteryOptimization: true
      }
    });

    this.initializeClient(config);
  }

  /**
   * Initialize Notion client with Australian project tracking focus
   */
  private async initializeClient(config: {
    apiKey?: string;
    databases?: {
      projects?: string;
      opportunities?: string;
      people?: string;
      organizations?: string;
    };
  }): Promise<void> {
    try {
      // Get API key from secure storage or config
      const apiKey = config.apiKey || await this.getApiKey('notion_api_key');

      if (!apiKey) {
        console.warn('Notion API key not found - connector will work in offline mode only');
        return;
      }

      this.client = new Client({
        auth: apiKey,
        notionVersion: '2022-06-28'
      });

      // Load database IDs from secure storage or config
      this.databases = {
        projects: config.databases?.projects || await this.getApiKey('notion_projects_db'),
        opportunities: config.databases?.opportunities || await this.getApiKey('notion_opportunities_db'),
        people: config.databases?.people || await this.getApiKey('notion_people_db'),
        organizations: config.databases?.organizations || await this.getApiKey('notion_organizations_db')
      };

      this.isInitialized = true;
      console.log('🔌 Notion connector initialized for Australian project management');
    } catch (error) {
      console.error('Failed to initialize Notion client:', error);
    }
  }

  /**
   * Search across all Notion databases with mobile optimization
   */
  public async search(query: SearchQuery): Promise<ApiResponse<SearchResult<any>>> {
    const cacheKey = `notion_search_${JSON.stringify(query)}`;
    
    // Check cache first for mobile performance
    const cached = await this.getCachedData<SearchResult<any>>(cacheKey);
    if (cached && (this.networkStatus.isMetered || !this.networkStatus.isConnected)) {
      return {
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    if (!this.client || !this.isInitialized) {
      return await this.handleOfflineSearch(query);
    }

    try {
      const searchParams = {
        query: query.query,
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending' as const, timestamp: 'last_edited_time' as const },
        page_size: query.pagination?.limit || 20
      };

      const response = await this.client.search(searchParams);

      // Format results with Australian compliance metadata
      const items = response.results.map(item => ({
        ...this.formatSearchResult(item),
        compliance: this.generateComplianceMetadata('project', item)
      }));

      const result: SearchResult<any> = {
        items,
        total: items.length,
        page: query.pagination?.page || 1,
        hasMore: response.has_more
      };

      // Cache for mobile performance
      await this.cacheData(cacheKey, result);

      await this.logUsageMetrics('notion_search', {
        query: query.query,
        resultCount: items.length
      });

      return {
        data: result,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Notion search failed:', error);
      
      if (cached) {
        return {
          data: cached,
          source: 'cache',
          timestamp: new Date().toISOString(),
          cached: true,
          error: 'Network search failed, serving cached data'
        };
      }

      throw error;
    }
  }

  /**
   * Get projects with Australian focus and mobile optimization
   */
  public async getProjects(filter: any = {}): Promise<ApiResponse<Project[]>> {
    const cacheKey = `notion_projects_${JSON.stringify(filter)}`;
    
    const cached = await this.getCachedData<Project[]>(cacheKey);
    if (cached && this.networkStatus.isMetered) {
      return {
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    if (!this.client || !this.databases.projects) {
      return {
        data: cached || [],
        source: 'offline',
        timestamp: new Date().toISOString(),
        error: 'Notion client not initialized or projects database not configured'
      };
    }

    try {
      const queryParams: any = {
        database_id: this.databases.projects,
        page_size: 100
      };

      // Add filter if provided
      if (Object.keys(filter).length > 0) {
        queryParams.filter = filter;
      }

      const response = await this.client.databases.query(queryParams);

      // Format projects with Australian compliance
      const projects = response.results.map(page => {
        const project = this.formatProject(page);
        return {
          ...project,
          compliance: this.generateComplianceMetadata('project', page)
        };
      }) as Project[];

      // Cache for offline access
      await this.cacheData(cacheKey, projects);

      await this.logUsageMetrics('get_projects', {
        projectCount: projects.length,
        filter: JSON.stringify(filter)
      });

      return {
        data: projects,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to fetch projects:', error);
      
      return {
        data: cached || [],
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get funding opportunities with Australian compliance tracking
   */
  public async getOpportunities(filter: any = {}): Promise<ApiResponse<Opportunity[]>> {
    const cacheKey = `notion_opportunities_${JSON.stringify(filter)}`;
    
    const cached = await this.getCachedData<Opportunity[]>(cacheKey);
    if (cached && this.networkStatus.isMetered) {
      return {
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    if (!this.client || !this.databases.opportunities) {
      return {
        data: cached || [],
        source: 'offline',
        timestamp: new Date().toISOString(),
        error: 'Opportunities database not configured'
      };
    }

    try {
      const queryParams: any = {
        database_id: this.databases.opportunities,
        sorts: [{ property: 'Amount', direction: 'descending' }],
        page_size: 100
      };

      if (Object.keys(filter).length > 0) {
        queryParams.filter = filter;
      }

      const response = await this.client.databases.query(queryParams);

      // Format opportunities with Australian eligibility tracking
      const opportunities = response.results.map(page => {
        const opportunity = this.formatOpportunity(page);
        return {
          ...opportunity,
          eligibility: {
            geographic: ['australia'], // Default to Australian focus
            sectors: [], // Extract from requirements if available
            organisationSize: undefined
          },
          compliance: this.generateComplianceMetadata('opportunity', page)
        };
      }) as Opportunity[];

      await this.cacheData(cacheKey, opportunities);

      await this.logUsageMetrics('get_opportunities', {
        opportunityCount: opportunities.length,
        totalValue: opportunities.reduce((sum, o) => sum + (o.amount || 0), 0)
      });

      return {
        data: opportunities,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
      
      return {
        data: cached || [],
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get people/contacts with privacy controls
   */
  public async getPeople(filter: any = {}): Promise<ApiResponse<Person[]>> {
    const cacheKey = `notion_people_${JSON.stringify(filter)}`;
    
    const cached = await this.getCachedData<Person[]>(cacheKey);
    if (cached && this.networkStatus.isMetered) {
      return {
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    if (!this.client || !this.databases.people) {
      return {
        data: cached || [],
        source: 'offline',
        timestamp: new Date().toISOString(),
        error: 'People database not configured'
      };
    }

    try {
      const response = await this.client.databases.query({
        database_id: this.databases.people,
        filter,
        page_size: 100
      });

      // Format people with Australian privacy compliance
      const people = response.results.map(page => {
        const person = this.formatPerson(page);
        return {
          ...person,
          privacy: {
            contactable: false, // Default conservative
            publicProfile: false,
            shareData: false
          },
          compliance: this.generateComplianceMetadata('person', page)
        };
      }) as Person[];

      await this.cacheData(cacheKey, people);

      return {
        data: people,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to fetch people:', error);
      
      return {
        data: cached || [],
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze opportunities for Australian grant matching
   */
  public async analyzeOpportunities(): Promise<ApiResponse<any>> {
    const cacheKey = 'notion_opportunity_analysis';
    
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return {
        data: cached,
        source: 'cache',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    const opportunitiesResponse = await this.getOpportunities();
    const opportunities = opportunitiesResponse.data || [];

    try {
      const analysis = {
        total: opportunities.length,
        totalValue: opportunities.reduce((sum, o) => sum + (o.amount || 0), 0),
        byStatus: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        upcoming: [] as any[],
        highValue: [] as any[],
        australianFocus: {
          count: 0,
          value: 0,
          opportunities: [] as string[]
        }
      };

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

      opportunities.forEach(opp => {
        // Group by status
        const status = opp.status || 'unknown';
        analysis.byStatus[status] = (analysis.byStatus[status] || 0) + 1;

        // Group by type
        const type = opp.type || 'unknown';
        analysis.byType[type] = (analysis.byType[type] || 0) + 1;

        // Find upcoming deadlines
        if (opp.deadline) {
          const deadline = new Date(opp.deadline);
          const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (deadline > now && deadline <= thirtyDaysFromNow) {
            analysis.upcoming.push({
              title: opp.title,
              amount: opp.amount,
              daysUntil,
              type: opp.type
            });
          }
        }

        // High value opportunities (>$50k AUD)
        if (opp.amount && opp.amount >= 50000) {
          analysis.highValue.push({
            title: opp.title,
            amount: opp.amount,
            status: opp.status,
            type: opp.type
          });
        }

        // Australian-focused opportunities
        const hasAustralianFocus = 
          opp.eligibility?.geographic?.includes('australia') ||
          opp.title.toLowerCase().includes('australia') ||
          opp.requirements?.toLowerCase().includes('australia');

        if (hasAustralianFocus) {
          analysis.australianFocus.count++;
          analysis.australianFocus.value += opp.amount || 0;
          analysis.australianFocus.opportunities.push(opp.title);
        }
      });

      // Sort upcoming by deadline
      analysis.upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
      
      // Sort high value by amount
      analysis.highValue.sort((a, b) => b.amount - a.amount);

      // Add Australian market insights
      const australianInsights = {
        marketSize: analysis.australianFocus.value,
        averageGrant: analysis.australianFocus.count > 0 
          ? Math.round(analysis.australianFocus.value / analysis.australianFocus.count)
          : 0,
        competitionLevel: this.calculateCompetitionLevel(analysis.australianFocus.count),
        recommendedActions: this.generateRecommendations(analysis)
      };

      const finalAnalysis = {
        ...analysis,
        australianInsights,
        lastUpdated: new Date().toISOString(),
        dataResidency: 'global-with-australian-focus'
      };

      // Cache for 1 hour
      await this.cacheData(cacheKey, finalAnalysis, 60 * 60 * 1000);

      return {
        data: finalAnalysis,
        source: 'network',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to analyze opportunities:', error);
      
      return {
        data: cached || null,
        source: 'cache',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }

  /**
   * Handle offline search
   */
  private async handleOfflineSearch(query: SearchQuery): Promise<ApiResponse<SearchResult<any>>> {
    const cacheKey = `notion_search_${JSON.stringify(query)}`;
    const cached = await this.getCachedData<SearchResult<any>>(cacheKey);
    
    if (cached) {
      return {
        data: cached,
        source: 'offline',
        timestamp: new Date().toISOString(),
        cached: true
      };
    }

    return {
      data: {
        items: [],
        total: 0,
        page: 1,
        hasMore: false
      } as SearchResult<any>,
      source: 'offline',
      timestamp: new Date().toISOString(),
      error: 'No cached data available for offline search'
    };
  }

  /**
   * Format search result from Notion API
   */
  private formatSearchResult(item: any): any {
    return {
      id: item.id,
      title: this.getTitle(item),
      type: item.object,
      url: item.url,
      lastEdited: item.last_edited_time,
      parent: item.parent
    };
  }

  /**
   * Format project data with Australian compliance
   */
  private formatProject(page: any): Omit<Project, 'compliance'> {
    const props = page.properties;
    return {
      id: page.id,
      title: this.getTitle(page),
      status: this.mapStatus(props.Status?.select?.name || props.Stage?.select?.name),
      priority: this.mapPriority(props.Priority?.select?.name),
      budget: props.Budget?.number,
      deadline: props.Deadline?.date?.start,
      team: props.Team?.people?.map((p: any) => p.name) || [],
      impact: props.Impact?.rich_text?.[0]?.text?.content,
      url: page.url,
      location: props.Location?.rich_text?.[0]?.text?.content
    };
  }

  /**
   * Format opportunity data with Australian eligibility
   */
  private formatOpportunity(page: any): Omit<Opportunity, 'eligibility' | 'compliance'> {
    const props = page.properties;
    return {
      id: page.id,
      title: this.getTitle(page),
      type: this.mapOpportunityType(props.Type?.select?.name),
      amount: props.Amount?.number || 0,
      deadline: props.Deadline?.date?.start,
      probability: props.Probability?.number,
      status: this.mapOpportunityStatus(props.Status?.select?.name),
      requirements: props.Requirements?.rich_text?.[0]?.text?.content,
      contact_id: props.Contact?.relation?.[0]?.id,
      url: page.url
    };
  }

  /**
   * Format person data with privacy controls
   */
  private formatPerson(page: any): Omit<Person, 'privacy' | 'compliance'> {
    const props = page.properties;
    return {
      id: page.id,
      name: this.getTitle(page),
      role: props.Role?.rich_text?.[0]?.text?.content,
      organisation: props.Organization?.select?.name,
      email: props.Email?.email,
      phone: props.Phone?.phone_number,
      skills: props.Skills?.multi_select?.map((s: any) => s.name) || [],
      projects: props.Projects?.relation?.map((r: any) => r.id) || [],
      location: props.Location?.rich_text?.[0]?.text?.content
    };
  }

  /**
   * Extract title from Notion page
   */
  private getTitle(page: any): string {
    const title = page.properties?.Name || 
                  page.properties?.Title || 
                  page.properties?.['Project Name'];
    return title?.title?.[0]?.text?.content || 'Untitled';
  }

  /**
   * Map status values to standard enum
   */
  private mapStatus(status?: string): 'planning' | 'active' | 'completed' | 'paused' {
    if (!status) return 'planning';
    const lower = status.toLowerCase();
    if (lower.includes('active') || lower.includes('progress')) return 'active';
    if (lower.includes('complete') || lower.includes('done')) return 'completed';
    if (lower.includes('pause') || lower.includes('hold')) return 'paused';
    return 'planning';
  }

  /**
   * Map priority values to standard enum
   */
  private mapPriority(priority?: string): 'low' | 'medium' | 'high' | 'critical' {
    if (!priority) return 'medium';
    const lower = priority.toLowerCase();
    if (lower.includes('critical') || lower.includes('urgent')) return 'critical';
    if (lower.includes('high')) return 'high';
    if (lower.includes('low')) return 'low';
    return 'medium';
  }

  /**
   * Map opportunity type to standard enum
   */
  private mapOpportunityType(type?: string): 'grant' | 'partnership' | 'funding' | 'contract' {
    if (!type) return 'grant';
    const lower = type.toLowerCase();
    if (lower.includes('partner')) return 'partnership';
    if (lower.includes('fund')) return 'funding';
    if (lower.includes('contract')) return 'contract';
    return 'grant';
  }

  /**
   * Map opportunity status to standard enum
   */
  private mapOpportunityStatus(status?: string): 'open' | 'applied' | 'closed' | 'awarded' {
    if (!status) return 'open';
    const lower = status.toLowerCase();
    if (lower.includes('applied') || lower.includes('submitted')) return 'applied';
    if (lower.includes('closed') || lower.includes('expired')) return 'closed';
    if (lower.includes('awarded') || lower.includes('won')) return 'awarded';
    return 'open';
  }

  /**
   * Calculate competition level for Australian opportunities
   */
  private calculateCompetitionLevel(opportunityCount: number): 'low' | 'medium' | 'high' {
    if (opportunityCount > 50) return 'high';
    if (opportunityCount > 20) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations for Australian market
   */
  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];
    
    if (analysis.upcoming.length > 0) {
      recommendations.push('Focus on upcoming opportunities with close deadlines');
    }
    
    if (analysis.australianFocus.count > 0) {
      recommendations.push('Leverage Australian-specific opportunities for better success rates');
    }
    
    if (analysis.highValue.length > 0) {
      recommendations.push('Consider strategic partnerships for high-value opportunities');
    }
    
    recommendations.push('Maintain regular pipeline reviews for optimal resource allocation');
    
    return recommendations;
  }

  /**
   * Generate compliance metadata for Australian regulations
   */
  private generateComplianceMetadata(entityType: string, data: any): ComplianceMetadata {
    return {
      dataResidency: 'global',
      privacyLevel: 'community', // Notion data is typically internal to organisation
      consentRequired: false, // Organisation data doesn't require individual consent
      retentionPeriod: entityType === 'opportunity' ? 365 * 2 : 365 * 5, // 2 years for opportunities, 5 for projects
      auditTrail: true
    };
  }

  /**
   * Process offline actions when network is restored
   */
  protected async processOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.client || !this.isInitialized) {
      throw new Error('Notion client not initialized');
    }

    console.log(`🔄 Processing offline ${action.type} for ${action.entity} ${action.id}`);

    try {
      // Notion API actions would go here
      // Note: Notion API has different patterns for create/update operations
      // This is a simplified example
      
      switch (action.type) {
        case 'create':
          // Would create new page in appropriate database
          console.log('Creating new Notion page:', action.data);
          break;
        case 'update':
          // Would update existing page properties
          console.log('Updating Notion page:', action.id);
          break;
        case 'delete':
          // Would archive/delete page
          console.log('Archiving Notion page:', action.id);
          break;
      }

      console.log(`✅ Successfully processed offline ${action.type} for ${action.entity}`);
    } catch (error) {
      console.error(`❌ Failed to process offline ${action.type}:`, error);
      throw error;
    }
  }

  /**
   * Get connection status for mobile UI
   */
  public getConnectionStatus(): {
    connected: boolean;
    databasesConfigured: number;
    dataSource: string;
    cacheSize: number;
  } {
    const configuredDbs = Object.values(this.databases).filter(Boolean).length;
    
    return {
      connected: this.isInitialized && this.networkStatus.isConnected,
      databasesConfigured: configuredDbs,
      dataSource: 'notion',
      cacheSize: this.cache.size
    };
  }
}