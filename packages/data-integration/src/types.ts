/**
 * Types for ACT Placemat Data Integration
 * Australian community-focused data structures
 */

// Re-export common types from data-services
export type {
  ApiResponse,
  SearchQuery,
  SearchResult,
  SyncStatus,
  NetworkStatus,
  EntityType,
  ComplianceMetadata
} from '@act-placemat/data-services';

// Australian community-specific types
export interface Story {
  id: string;
  title: string;
  content: string;
  location: string;
  community: string;
  created_at: Date;
  updated_at: Date;
  tags: string[];
  isPublic: boolean;
  verification: {
    isVerified: boolean;
    verifiedBy?: string;
    verificationDate?: Date;
  };
  privacy: {
    consentGiven: boolean;
    dataResidency: 'australia' | 'international';
    retentionPeriod: number; // days
  };
}

export interface Project {
  id: string;
  title: string;
  impact: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  location: string;
  community: string;
  funding: {
    required: number;
    secured: number;
    sources: string[];
  };
  timeline: {
    startDate: Date;
    endDate: Date;
    milestones: { name: string; date: Date; completed: boolean }[];
  };
  collaborators: string[];
  impactMetrics: {
    beneficiaries: number;
    outcomes: string[];
    sustainability: 'low' | 'medium' | 'high';
  };
  lastEdited?: string;
  created_at?: Date;
}

export interface Opportunity {
  id: string;
  title: string;
  requirements: string;
  type: 'grant' | 'collaboration' | 'volunteer' | 'employment' | 'training';
  organisation: string;
  location: string;
  eligibility: string[];
  funding: {
    amount: number;
    currency: 'AUD';
    deadline: Date;
  };
  requirementsList: string[];
  contact: {
    name: string;
    email: string;
    phone?: string;
  };
  tags: string[];
  australianFocus: boolean;
  lastEdited?: string;
  created_at?: Date;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  organisation?: string;
  location: string;
  skills: string[];
  interests: string[];
  contact: {
    email: string;
    phone?: string;
    linkedin?: string;
  };
  privacy: {
    isPublic: boolean;
    shareContact: boolean;
    dataRetention: 'standard' | 'extended' | 'minimal';
  };
  verification: {
    isVerified: boolean;
    verificationMethod?: 'community' | 'government' | 'organisation';
  };
  lastEdited?: string;
  created_at?: Date;
}

// Mobile-specific types
export interface MobileDataState {
  stories: Story[];
  projects: Project[];
  opportunities: Opportunity[];
  people: Person[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  error: string | null;
}

export interface MobileSyncOptions {
  forceRefresh?: boolean;
  backgroundSync?: boolean;
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
}

export interface AustralianComplianceOptions {
  requireConsent?: boolean;
  enforceDataResidency?: boolean;
  auditTrail?: boolean;
  retentionPeriod?: number;
}

// Search and filter types
export interface MobileSearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
  filters?: {
    location?: string;
    community?: string;
    status?: string;
    type?: string;
    australianContent?: boolean;
  };
}

// Cache and storage types
export interface CacheMetadata {
  key: string;
  size: number;
  createdAt: Date;
  lastAccessed: Date;
  ttl: number;
  compressed: boolean;
}

export interface StorageQuota {
  used: number;
  available: number;
  limit: number;
  percentage: number;
}