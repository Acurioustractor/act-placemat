/**
 * Shared API Types for tRPC
 * Used by both frontend and backend for type-safe communication
 */

// Common data types
export interface LinkedInContact {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email_address?: string;
  linkedin_url?: string;
  current_company?: string;
  current_position?: string;
  location?: string;
  relationship_score: number;
  strategic_value: 'high' | 'medium' | 'low' | 'unknown';
  data_source: 'ben' | 'nic';
  raw_data?: any;
  created_at: string;
  updated_at: string;
}

export interface ContactsFilter {
  strategic_value?: string;
  data_source?: string;
  company?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ContactUpdate {
  relationship_score?: number;
  strategic_value?: 'high' | 'medium' | 'low' | 'unknown';
  notes?: string;
}

export interface ContactStats {
  total: number;
  by_strategic_value: Record<string, number>;
  by_data_source: Record<string, number>;
  average_score: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Projects and opportunities
export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  funding_amount?: number;
  deadline?: string;
  source: string;
  status: 'open' | 'applied' | 'closed' | 'awarded';
  created_at: string;
  updated_at: string;
}

// API error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Request/Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

// Health check
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down';
    supabase: 'up' | 'down';
    notion: 'up' | 'down';
  };
  version: string;
  uptime: number;
}

// Intelligence and analytics
export interface IntelligenceQuery {
  query: string;
  sources?: string[];
  filters?: Record<string, any>;
  limit?: number;
}

export interface IntelligenceResult {
  id: string;
  query: string;
  results: any[];
  confidence: number;
  sources: string[];
  timestamp: string;
}

// Community and stories
export interface Story {
  id: string;
  title: string;
  content: string;
  author: string;
  tags: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoryFilter {
  author?: string;
  tags?: string[];
  published?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}