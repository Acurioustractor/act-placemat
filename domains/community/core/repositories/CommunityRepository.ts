/**
 * Community Repository Interface (Port)
 *
 * Defines the contract for persisting and retrieving Community aggregates.
 * This is a port in the hexagonal architecture - the implementation (adapter)
 * will be in the infrastructure layer.
 */

import {
  Repository,
  ReadOnlyRepository,
  PaginatedResult,
  FilterCriteria,
} from '../../../shared/types';
import { Community } from '../entities/Community';
import { CommunityId } from '../value-objects/CommunityId';
import { GeographicLocation } from '../value-objects/GeographicLocation';

export interface CommunitySearchCriteria extends FilterCriteria {
  name?: string;
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  region?: string;
  isActive?: boolean;
  minMemberCount?: number;
  minStoryCount?: number;
  foundedAfter?: Date;
  foundedBefore?: Date;
}

export interface CommunityRepository extends Repository<Community, string> {
  // Basic repository operations (inherited from Repository)
  // - findById(id: string): Promise<Community | null>
  // - save(community: Community): Promise<void>
  // - delete(id: string): Promise<void>

  // Community-specific operations
  findByName(name: string): Promise<Community | null>;
  findByNamePattern(pattern: string): Promise<Community[]>;
  findNearLocation(
    location: GeographicLocation,
    radiusKm: number
  ): Promise<Community[]>;
  findByRegion(region: string): Promise<Community[]>;
  findActive(): Promise<Community[]>;
  findEstablished(): Promise<Community[]>;
  findHighImpact(): Promise<Community[]>;

  // Search and filtering
  search(criteria: CommunitySearchCriteria): Promise<Community[]>;
  searchPaginated(
    criteria: CommunitySearchCriteria,
    page: number,
    limit: number
  ): Promise<PaginatedResult<Community>>;

  // Analytics queries
  getActiveCommunityCount(): Promise<number>;
  getTotalMemberCount(): Promise<number>;
  getTotalStoryCount(): Promise<number>;
  getTotalImpact(): Promise<number>;
  getTopCommunitiesByImpact(limit: number): Promise<Community[]>;
  getTopCommunitiesByMembers(limit: number): Promise<Community[]>;
  getCommunityGrowthStats(timeframe: 'week' | 'month' | 'year'): Promise<{
    newCommunities: number;
    newMembers: number;
    newStories: number;
    period: string;
  }>;

  // Batch operations
  saveMany(communities: Community[]): Promise<void>;
  findByIds(ids: string[]): Promise<Community[]>;

  // Existence checks
  existsWithName(name: string): Promise<boolean>;
  existsAtLocation(location: GeographicLocation, radiusKm?: number): Promise<boolean>;
}

// Read-only projection for community listings and search
export interface CommunityReadRepository
  extends ReadOnlyRepository<CommunityListItem, string> {
  findForListing(): Promise<CommunityListItem[]>;
  findFeatured(): Promise<CommunityListItem[]>;
  searchByName(query: string): Promise<CommunityListItem[]>;
}

// Lightweight projection for listings
export interface CommunityListItem {
  id: string;
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    region: string;
  };
  memberCount: number;
  storyCount: number;
  totalImpact: number;
  isActive: boolean;
  foundedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Statistics projection
export interface CommunityStats {
  totalCommunities: number;
  activeCommunities: number;
  totalMembers: number;
  totalStories: number;
  totalImpact: number;
  averageImpactPerCommunity: number;
  averageMembersPerCommunity: number;
  averageStoriesPerCommunity: number;
  topRegions: Array<{
    region: string;
    communityCount: number;
    memberCount: number;
    impact: number;
  }>;
  growthTrends: {
    communitiesThisMonth: number;
    membersThisMonth: number;
    storiesThisMonth: number;
    impactThisMonth: number;
  };
}
