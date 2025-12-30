/**
 * Shared TypeScript types for ACT Placemat API
 * Used by both frontend and backend for type safety
 */

// Contact Types
export interface LinkedInContact {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email_address?: string;
  current_company?: string;
  current_position?: string;
  relationship_score?: number;
  strategic_value?: 'high' | 'medium' | 'low' | 'unknown';
  data_source?: string;
  engagement_frequency?: string;
  last_interaction?: string;
  person_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
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

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

// Opportunity Types
export interface Opportunity {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'applied' | 'closed' | 'awarded';
  organization?: string;
  deadline?: string;
  value?: number;
  created_at?: string;
  updated_at?: string;
}

// Story Types
export interface Story {
  id: string;
  title: string;
  story_copy?: string;
  summary?: string;
  themes?: string[];
  is_public?: boolean;
  storyteller_id?: string;
  created_at?: string;
  updated_at?: string;
  story_image_url?: string;
}

export interface StoryFilter {
  author?: string;
  tags?: string[];
  published?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// Health Check Types
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, 'up' | 'down' | 'degraded'>;
  version: string;
  uptime: number;
  timestamp?: string;
}

// Intelligence Types
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

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
}

// Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}