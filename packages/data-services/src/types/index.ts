/**
 * ACT Placemat Data Services Types
 * Mobile-optimized data structures for Australian community platform
 */

// Base response interface for all API operations
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  source: 'cache' | 'network' | 'offline';
  timestamp: string;
  cached?: boolean;
  compressed?: boolean;
}

// Network status for mobile connectivity awareness
export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  isMetered?: boolean; // For data usage awareness in Australia
}

// Cache configuration for mobile performance
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Max items in cache
  compressionEnabled: boolean;
  offlineMode: boolean;
}

// Australian compliance metadata
export interface ComplianceMetadata {
  dataResidency: 'australia' | 'global';
  privacyLevel: 'public' | 'community' | 'private';
  consentRequired: boolean;
  retentionPeriod?: number; // Days
  auditTrail: boolean;
}

// Story data structure (from Supabase analysis)
export interface Story {
  id: string;
  title: string;
  content: string;
  impact?: string;
  themes: string[];
  storyteller_id: string;
  storyteller?: Storyteller;
  is_public: boolean;
  consent_status: 'given' | 'pending' | 'revoked';
  created_at: string;
  location_id?: string;
  compliance: ComplianceMetadata;
}

export interface Storyteller {
  id: string;
  full_name: string;
  location_id?: string;
  bio?: string;
  consent_given: boolean;
  contact_preferences: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
}

// Project data structure (from Notion analysis)
export interface Project {
  id: string;
  title: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget?: number;
  deadline?: string;
  team: string[];
  impact?: string;
  url: string;
  location?: string;
  compliance: ComplianceMetadata;
}

// Opportunity data structure (from Notion analysis)
export interface Opportunity {
  id: string;
  title: string;
  type: 'grant' | 'partnership' | 'funding' | 'contract';
  amount: number;
  deadline?: string;
  probability?: number;
  status: 'open' | 'applied' | 'closed' | 'awarded';
  requirements?: string;
  contact_id?: string;
  url: string;
  eligibility: {
    geographic: string[];
    sectors: string[];
    organisationSize?: string;
  };
  compliance: ComplianceMetadata;
}

// Person/Contact data structure
export interface Person {
  id: string;
  name: string;
  role?: string;
  organisation?: string;
  email?: string;
  phone?: string;
  skills: string[];
  projects: string[];
  location?: string;
  privacy: {
    contactable: boolean;
    publicProfile: boolean;
    shareData: boolean;
  };
  compliance: ComplianceMetadata;
}

// Search and filter interfaces
export interface SearchQuery {
  query: string;
  filters?: {
    location?: string[];
    themes?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    type?: string[];
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
  facets?: Record<string, number>;
}

// Mobile-specific sync interfaces
export interface SyncStatus {
  lastSync: string;
  pendingUploads: number;
  pendingDownloads: number;
  conflictCount: number;
  syncInProgress: boolean;
}

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'story' | 'project' | 'opportunity' | 'person';
  data: unknown;
  timestamp: string;
  retryCount: number;
}

// Analytics and metrics for Australian compliance
export interface UsageMetrics {
  sessionId: string;
  userId?: string;
  actions: {
    type: string;
    timestamp: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  }[];
  dataUsage: {
    downloaded: number; // Bytes
    uploaded: number;
    cached: number;
  };
  location?: {
    state: string;
    country: 'AU'; // Australia-focused
  };
  compliance: {
    consentGiven: boolean;
    analyticsOptIn: boolean;
    dataProcessingBasis: string;
  };
}

// Configuration interfaces
export interface ConnectorConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  cache: CacheConfig;
  compliance: {
    dataResidency: 'australia' | 'global';
    encryptionRequired: boolean;
    auditEnabled: boolean;
  };
  mobile: {
    backgroundSync: boolean;
    wifiOnlySync: boolean;
    compressionEnabled: boolean;
    batteryOptimization: boolean;
  };
}

// Error handling for mobile environments
export interface ConnectorError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
  timestamp: string;
  context: {
    connector: string;
    operation: string;
    networkStatus?: NetworkStatus;
    offline?: boolean;
  };
}

// Export utility types
export type EntityType = 'story' | 'project' | 'opportunity' | 'person';
export type SyncDirection = 'upload' | 'download' | 'bidirectional';
export type DataSource = 'supabase' | 'notion' | 'cache' | 'offline';