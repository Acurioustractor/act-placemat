/**
 * Unified Integration Service Interface
 * Defines the contract for consolidating Gmail, LinkedIn, Notion, and Supabase data
 */

export interface ContactFilters {
  search?: string;
  company?: string;
  strategicValue?: 'high' | 'medium' | 'low' | 'unknown';
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'company' | 'lastInteraction' | 'relationshipScore';
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectFilters {
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  assignee?: string;
  limit?: number;
  offset?: number;
}

export interface FinanceFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

export interface Contact {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  currentCompany?: string;
  currentPosition?: string;
  relationshipScore?: number;
  strategicValue?: 'high' | 'medium' | 'low' | 'unknown';
  engagementFrequency?: string;
  lastInteraction?: string;
  dataSource?: string;
  linkedinUrl?: string;
  notionId?: string;
  gmailThreads?: string[];
  enrichmentData?: Record<string, any>;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  assignee?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  actualCost?: number;
  progress?: number;
  contacts?: Contact[];
  notionId?: string;
  supabaseId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface FinanceData {
  id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  vendor?: string;
  projectId?: string;
  type: 'income' | 'expense';
  status: 'pending' | 'approved' | 'paid';
  xeroId?: string;
  supabaseId?: string;
  metadata?: Record<string, any>;
}

export interface IntegrationResponse<T> {
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata?: {
    sources: string[];
    cacheHit: boolean;
    processingTimeMs: number;
    correlationId: string;
  };
}

export interface IIntegrationService {
  /**
   * Fetch and merge contacts from multiple sources
   */
  getContacts(filters?: ContactFilters): Promise<IntegrationResponse<Contact[]>>;

  /**
   * Fetch and merge project data from multiple sources
   */
  getProjects(filters?: ProjectFilters): Promise<IntegrationResponse<Project[]>>;

  /**
   * Fetch and consolidate financial data from multiple sources
   */
  getFinanceData(filters?: FinanceFilters): Promise<IntegrationResponse<FinanceData[]>>;

  /**
   * Get service health status
   */
  getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: string; lastCheck: string; responseTime?: number }>;
    uptime: number;
  }>;
}