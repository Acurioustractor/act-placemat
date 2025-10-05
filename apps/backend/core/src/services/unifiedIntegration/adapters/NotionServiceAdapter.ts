/**
 * Notion Service Adapter
 * Connects UnifiedIntegrationService to comprehensive Notion project and organizational data
 * Leverages existing NotionService with multi-database relationship mapping
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Project, ProjectFilters, Contact, ContactFilters } from '../interfaces/IIntegrationService.js';
import { IntegrationLogger } from '../utils/Logger.js';

interface NotionProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  partners?: any[];
  organizations?: any[];
  people?: any[];
  start_date?: string;
  end_date?: string;
  budget?: number;
  progress?: number;
  tags?: string[];
  metadata?: any;
}

interface NotionPerson {
  id: string;
  name: string;
  email?: string;
  organization?: string;
  role?: string;
  projects?: any[];
  tags?: string[];
  metadata?: any;
}

interface NotionOrganization {
  id: string;
  name: string;
  type?: string;
  sector?: string;
  website?: string;
  people?: any[];
  projects?: any[];
  metadata?: any;
}

export class NotionServiceAdapter {
  private readonly supabase: SupabaseClient;
  private readonly logger: IntegrationLogger;
  private readonly cache: Map<string, { data: any; timestamp: number }>;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.logger = IntegrationLogger.getInstance();
    this.cache = new Map();
  }

  /**
   * Get projects from Notion with contact relationship mapping
   */
  async getProjects(filters: ProjectFilters = {}): Promise<Project[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'NotionServiceAdapter', 'getProjects');

    try {
      timedLogger.info('Fetching projects from Notion', { filters });

      // Check cache first
      const cacheKey = `projects:${JSON.stringify(filters)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        timedLogger.info('Returning cached projects', { count: cached.length });
        return cached;
      }

      // Fetch projects from Notion via Supabase integration
      // This assumes Notion data is synchronized to Supabase tables
      let query = this.supabase
        .from('notion_projects')
        .select(`
          *,
          notion_project_people!inner(
            notion_people(*)
          ),
          notion_project_organizations!inner(
            notion_organizations(*)
          )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.assignee) {
        // Join with people to filter by assignee
        query = query.contains('assignees', [filters.assignee]);
      }

      // Apply pagination
      if (filters.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform to unified Project interface
      const projects = (data || []).map(this.transformToUnifiedProject);

      // Cache results
      this.setCachedData(cacheKey, projects);

      timedLogger.finish(true, { projectCount: projects.length });
      return projects;

    } catch (error) {
      timedLogger.error('Failed to fetch projects from Notion', error);
      timedLogger.finish(false);

      // Return empty array if Notion tables don't exist yet
      if (error.code === '42P01') {
        timedLogger.info('Notion sync tables not found, returning empty projects');
        return [];
      }

      throw error;
    }
  }

  /**
   * Get contacts from Notion People database
   */
  async getContacts(filters: ContactFilters = {}): Promise<Contact[]> {
    const correlationId = this.logger.generateCorrelationId();
    const timedLogger = this.logger.createTimedLogger(correlationId, 'NotionServiceAdapter', 'getContacts');

    try {
      timedLogger.info('Fetching contacts from Notion', { filters });

      // Check cache first
      const cacheKey = `contacts:${JSON.stringify(filters)}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch people from Notion via Supabase integration
      let query = this.supabase
        .from('notion_people')
        .select(`
          *,
          notion_project_people!inner(
            notion_projects(*)
          ),
          notion_organization_people!inner(
            notion_organizations(*)
          )
        `);

      // Apply filters
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,` +
          `email.ilike.%${filters.search}%,` +
          `organization.ilike.%${filters.search}%`
        );
      }

      if (filters.company) {
        query = query.ilike('organization', `%${filters.company}%`);
      }

      // Apply pagination
      if (filters.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform to unified Contact interface
      const contacts = (data || []).map(this.transformToUnifiedContact);

      // Cache results
      this.setCachedData(cacheKey, contacts);

      timedLogger.finish(true, { contactCount: contacts.length });
      return contacts;

    } catch (error) {
      timedLogger.error('Failed to fetch contacts from Notion', error);
      timedLogger.finish(false);

      // Return empty array if Notion tables don't exist yet
      if (error.code === '42P01') {
        return [];
      }

      throw error;
    }
  }

  /**
   * Get projects by status with enriched contact relationships
   */
  async getProjectsByStatus(status: string, limit = 50): Promise<Project[]> {
    return this.getProjects({ status, limit });
  }

  /**
   * Get active projects with contact assignments
   */
  async getActiveProjects(limit = 100): Promise<Project[]> {
    return this.getProjects({ status: 'active', limit });
  }

  /**
   * Get projects associated with specific contacts
   */
  async getProjectsForContact(contactId: string): Promise<Project[]> {
    try {
      const { data, error } = await this.supabase
        .from('notion_project_people')
        .select(`
          notion_projects(*)
        `)
        .eq('person_id', contactId);

      if (error) {
        throw error;
      }

      return (data || [])
        .map(item => item.notion_projects)
        .filter(Boolean)
        .map(this.transformToUnifiedProject);

    } catch (error) {
      this.logger.error('Failed to fetch projects for contact', error);
      return [];
    }
  }

  /**
   * Health check for Notion integration
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Check if key Notion sync tables exist and are accessible
      const checks = await Promise.all([
        this.supabase.from('notion_projects').select('count').limit(1),
        this.supabase.from('notion_people').select('count').limit(1),
        this.supabase.from('notion_organizations').select('count').limit(1)
      ]);

      return checks.every(check => !check.error);

    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive project statistics
   */
  async getProjectStatistics(): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    pausedProjects: number;
    projectsByPriority: Record<string, number>;
    averageProgress: number;
    totalBudget: number;
    projectsWithContacts: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('notion_projects')
        .select('status, priority, progress, budget');

      if (error) throw error;

      const totalProjects = data.length;
      const activeProjects = data.filter(p => p.status === 'active').length;
      const completedProjects = data.filter(p => p.status === 'completed').length;
      const pausedProjects = data.filter(p => p.status === 'paused').length;

      const projectsByPriority: Record<string, number> = {};
      data.forEach(project => {
        if (project.priority) {
          projectsByPriority[project.priority] = (projectsByPriority[project.priority] || 0) + 1;
        }
      });

      const progressValues = data.filter(p => p.progress !== null).map(p => p.progress);
      const averageProgress = progressValues.length > 0
        ? progressValues.reduce((sum, progress) => sum + progress, 0) / progressValues.length
        : 0;

      const budgetValues = data.filter(p => p.budget !== null).map(p => p.budget);
      const totalBudget = budgetValues.reduce((sum, budget) => sum + budget, 0);

      // Count projects with contact assignments
      const { count: projectsWithContacts } = await this.supabase
        .from('notion_project_people')
        .select('project_id', { count: 'exact', head: true });

      return {
        totalProjects,
        activeProjects,
        completedProjects,
        pausedProjects,
        projectsByPriority,
        averageProgress,
        totalBudget,
        projectsWithContacts: projectsWithContacts || 0
      };

    } catch (error) {
      this.logger.error('Failed to get project statistics', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private transformToUnifiedProject = (notionProject: any): Project => {
    return {
      id: `notion:${notionProject.id}`,
      title: notionProject.title || notionProject.name,
      description: notionProject.description,
      status: this.mapNotionStatusToUnified(notionProject.status),
      priority: notionProject.priority,
      assignee: notionProject.assignee,
      startDate: notionProject.start_date,
      endDate: notionProject.end_date,
      budget: notionProject.budget,
      actualCost: notionProject.actual_cost,
      progress: notionProject.progress,
      contacts: (notionProject.notion_project_people || []).map((pp: any) =>
        this.transformToUnifiedContact(pp.notion_people)
      ).filter(Boolean),
      notionId: notionProject.id,
      tags: notionProject.tags || [],
      metadata: {
        originalNotionData: notionProject,
        organizations: notionProject.notion_project_organizations || [],
        lastSyncAt: new Date().toISOString(),
        dataSource: 'notion'
      }
    };
  };

  private transformToUnifiedContact = (notionPerson: any): Contact => {
    if (!notionPerson) return null;

    return {
      id: `notion:${notionPerson.id}`,
      fullName: notionPerson.name,
      firstName: notionPerson.name?.split(' ')[0],
      lastName: notionPerson.name?.split(' ').slice(1).join(' '),
      emailAddress: notionPerson.email,
      currentCompany: notionPerson.organization,
      currentPosition: notionPerson.role,
      dataSource: 'notion',
      notionId: notionPerson.id,
      enrichmentData: {
        originalNotionData: notionPerson,
        projects: notionPerson.notion_project_people?.map((pp: any) => pp.notion_projects) || [],
        organizations: notionPerson.notion_organization_people?.map((op: any) => op.notion_organizations) || [],
        tags: notionPerson.tags || [],
        lastSyncAt: new Date().toISOString()
      }
    };
  };

  private mapNotionStatusToUnified(notionStatus: string): 'active' | 'completed' | 'paused' | 'cancelled' {
    const statusMap: Record<string, 'active' | 'completed' | 'paused' | 'cancelled'> = {
      'In Progress': 'active',
      'Active': 'active',
      'Done': 'completed',
      'Completed': 'completed',
      'Paused': 'paused',
      'On Hold': 'paused',
      'Cancelled': 'cancelled',
      'Archived': 'cancelled'
    };

    return statusMap[notionStatus] || 'active';
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (this.cache.size > 100) {
      const oldestKeys = Array.from(this.cache.keys()).slice(0, 20);
      oldestKeys.forEach(key => this.cache.delete(key));
    }
  }
}