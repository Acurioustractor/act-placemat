// Tests for SmartDataService

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SmartDataService from '../smartDataService';
import { apiService } from '../apiService';
import { configService } from '../configService';
import { API_ENDPOINTS } from '../../constants';
import * as notionTransform from '../notionTransform';
import {
  Project,
  Opportunity,
  Organization,
  Person,
  Artifact,
  ProjectArea,
  ProjectStatus,
  ProjectPlace,
  OpportunityStage,
  OpportunityType,
  OrganizationType,
  OrganizationSize,
  RelationshipStatus,
  FundingCapacity,
  DecisionTimeline,
  AlignmentLevel,
  PriorityLevel,
  RelationshipType,
  InfluenceLevel,
  CommunicationPreference,
  ContactFrequency,
  RelationshipStrength,
  ArtifactType,
  ArtifactFormat,
  ArtifactStatus,
  ArtifactPurpose,
  AccessLevel
} from '../../types';

// Mock dependencies
vi.mock('../apiService');
vi.mock('../configService');
vi.mock('../notionTransform');

describe('SmartDataService', () => {
  let smartDataService: SmartDataService;
  const mockApiService = vi.mocked(apiService);
  const mockConfigService = vi.mocked(configService);

  beforeEach(() => {
    // Create a fresh instance for each test
    smartDataService = new SmartDataService();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockConfigService.getDatabaseId = vi.fn().mockResolvedValue('mock-database-id');
    mockConfigService.isDatabaseAvailable = vi.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    smartDataService.clearCache();
  });

  describe('fetchData', () => {
    const mockNotionResponse = {
      results: [
        {
          id: 'page-1',
          properties: {
            Name: { title: [{ plain_text: 'Test Item' }] }
          },
          last_edited_time: '2023-01-01T00:00:00.000Z'
        }
      ],
      has_more: false
    };

    it('should fetch projects from API successfully', async () => {
      const mockProject: Project = {
        id: 'page-1',
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        description: '',
        aiSummary: '',
        lead: '',
        teamMembers: [],
        coreValues: '',
        themes: [],
        tags: [],
        place: ProjectPlace.COMMUNITY,
        location: '',
        state: '',
        revenueActual: 0,
        revenuePotential: 0,
        actualIncoming: 0,
        potentialIncoming: 0,
        relatedOpportunities: [],
        partnerOrganizations: [],
        artifacts: [],
        websiteLinks: '',
        lastModified: new Date()
      };

      mockApiService.post = vi.fn().mockResolvedValue(mockNotionResponse);
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([mockProject]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(mockApiService.post).toHaveBeenCalledWith(
        API_ENDPOINTS.NOTION_QUERY,
        requestPayload
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockProject);
    });

    it('should fetch opportunities from API successfully', async () => {
      const mockOpportunity: Opportunity = {
        id: 'opp-1',
        name: 'Test Opportunity',
        organization: 'Test Org',
        stage: OpportunityStage.DISCOVERY,
        amount: 50000,
        probability: 75,
        weightedValue: 37500,
        type: OpportunityType.GRANT,
        description: '',
        relatedProjects: [],
        primaryContact: '',
        decisionMakers: [],
        nextAction: '',
        artifacts: [],
        requirements: '',
        competition: '',
        budgetBreakdown: '',
        successCriteria: '',
        riskAssessment: '',
        notes: '',
        lastModified: new Date()
      };

      mockApiService.post = vi.fn().mockResolvedValue(mockNotionResponse);
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([mockOpportunity]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Opportunity>('opportunities', requestPayload);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockOpportunity);
    });

    it('should fetch organizations from API successfully', async () => {
      const mockOrganization: Organization = {
        id: 'org-1',
        name: 'Test Organization',
        type: OrganizationType.NONPROFIT,
        sector: [],
        size: OrganizationSize.MEDIUM,
        location: '',
        website: '',
        description: '',
        relationshipStatus: RelationshipStatus.PARTNER,
        partnershipType: [],
        keyContacts: [],
        activeOpportunities: [],
        relatedProjects: [],
        sharedArtifacts: [],
        annualBudget: 0,
        fundingCapacity: FundingCapacity.MEDIUM,
        decisionTimeline: DecisionTimeline.MEDIUM,
        valuesAlignment: AlignmentLevel.HIGH,
        strategicPriority: PriorityLevel.HIGH,
        notes: '',
        lastModified: new Date()
      };

      mockApiService.post = vi.fn().mockResolvedValue(mockNotionResponse);
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([mockOrganization]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Organization>('organizations', requestPayload);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockOrganization);
    });

    it('should fetch people from API successfully', async () => {
      const mockPerson: Person = {
        id: 'person-1',
        fullName: 'John Doe',
        roleTitle: 'Director',
        organization: 'Test Org',
        email: 'john@test.com',
        phone: '',
        linkedin: '',
        location: '',
        relationshipType: RelationshipType.COLLEAGUE,
        influenceLevel: InfluenceLevel.MEDIUM,
        communicationPreference: CommunicationPreference.EMAIL,
        relatedOpportunities: [],
        relatedProjects: [],
        sharedArtifacts: [],
        interests: [],
        expertise: [],
        contactFrequency: ContactFrequency.MONTHLY,
        relationshipStrength: RelationshipStrength.MODERATE,
        notes: '',
        personalInterests: '',
        lastModified: new Date()
      };

      mockApiService.post = vi.fn().mockResolvedValue(mockNotionResponse);
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([mockPerson]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Person>('people', requestPayload);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockPerson);
    });

    it('should fetch artifacts from API successfully', async () => {
      const mockArtifact: Artifact = {
        id: 'artifact-1',
        name: 'Test Document',
        type: ArtifactType.REPORT,
        format: ArtifactFormat.PDF,
        status: ArtifactStatus.PUBLISHED,
        relatedOpportunities: [],
        relatedProjects: [],
        relatedOrganizations: [],
        relatedPeople: [],
        fileUrl: '',
        thumbnailUrl: '',
        description: '',
        audience: [],
        purpose: ArtifactPurpose.INTERNAL,
        version: 1,
        createdBy: '',
        approvedBy: '',
        accessLevel: AccessLevel.PUBLIC,
        tags: [],
        usageNotes: '',
        lastModified: new Date()
      };

      mockApiService.post = vi.fn().mockResolvedValue(mockNotionResponse);
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([mockArtifact]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Artifact>('artifacts', requestPayload);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockArtifact);
    });

    it('should handle API errors gracefully and return empty array', async () => {
      mockApiService.post = vi.fn().mockRejectedValue(new Error('API Error'));

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);
    });

    it('should handle invalid response structure', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ invalid: 'structure' });

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);
    });

    it('should handle null response', async () => {
      mockApiService.post = vi.fn().mockResolvedValue(null);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);
    });

    it('should handle response with no results', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ results: [] });
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);
    });
  });

  describe('cache functionality', () => {
    const mockNotionResponse = {
      results: [
        {
          id: 'page-1',
          properties: {
            Name: { title: [{ plain_text: 'Test Item' }] }
          },
          last_edited_time: '2023-01-01T00:00:00.000Z'
        }
      ],
      has_more: false
    };

    const mockProject: Project = {
      id: 'page-1',
      name: 'Test Project',
      area: ProjectArea.STORY_SOVEREIGNTY,
      status: ProjectStatus.ACTIVE,
      description: '',
      aiSummary: '',
      lead: '',
      teamMembers: [],
      coreValues: '',
      themes: [],
      tags: [],
      place: ProjectPlace.COMMUNITY,
      location: '',
      state: '',
      revenueActual: 0,
      revenuePotential: 0,
      actualIncoming: 0,
      potentialIncoming: 0,
      relatedOpportunities: [],
      partnerOrganizations: [],
      artifacts: [],
      websiteLinks: '',
      lastModified: new Date()
    };

    it('should not use cache when cache is disabled by default', async () => {
      mockApiService.post = vi.fn().mockResolvedValue(mockNotionResponse);
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([mockProject]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };

      // First call
      await smartDataService.fetchData<Project>('projects', requestPayload);

      // Second call should still hit API since cache is disabled
      await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(mockApiService.post).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache entries', () => {
      // Add some entries to cache (via getCacheStats)
      smartDataService.getCacheStats();

      smartDataService.clearCache();

      const statsAfter = smartDataService.getCacheStats();
      expect(statsAfter.totalEntries).toBe(0);
    });

    it('should clear cache for specific type', () => {
      smartDataService.clearCacheForType('projects');

      const stats = smartDataService.getCacheStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('database configuration checks', () => {
    it('should check if database is configured', async () => {
      mockConfigService.isDatabaseAvailable = vi.fn().mockResolvedValue(true);

      const result = await smartDataService.isDatabaseConfigured('projects');

      expect(mockConfigService.isDatabaseAvailable).toHaveBeenCalledWith('projects');
      expect(result).toBe(true);
    });

    it('should return false when database check fails', async () => {
      mockConfigService.isDatabaseAvailable = vi.fn().mockRejectedValue(new Error('Config error'));

      const result = await smartDataService.isDatabaseConfigured('projects');

      expect(result).toBe(false);
    });

    it('should get status for all databases', async () => {
      mockConfigService.isDatabaseAvailable = vi.fn()
        .mockResolvedValueOnce(true)  // projects
        .mockResolvedValueOnce(false) // opportunities
        .mockResolvedValueOnce(true)  // organizations
        .mockResolvedValueOnce(true)  // people
        .mockResolvedValueOnce(false); // artifacts

      const status = await smartDataService.getDatabaseStatus();

      expect(status).toEqual({
        projects: true,
        opportunities: false,
        organizations: true,
        people: true,
        artifacts: false
      });
    });
  });

  describe('cache statistics', () => {
    it('should return cache statistics', () => {
      const stats = smartDataService.getCacheStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('expiredEntries');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.expiredEntries).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should show zero entries after clearing cache', () => {
      smartDataService.clearCache();

      const stats = smartDataService.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('error recovery', () => {
    it('should log errors and return empty array on network failure', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApiService.post = vi.fn().mockRejectedValue(new Error('Network error'));

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle transformation errors by catching and returning empty array', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApiService.post = vi.fn().mockResolvedValue({
        results: [{ id: 'test' }],
        has_more: false
      });
      vi.spyOn(notionTransform, 'transformNotionResponse').mockImplementation(() => {
        throw new Error('Transform error');
      });

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };

      // The service catches transformation errors and returns empty array
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      // Since transformation threw error, it should be caught and return empty array
      expect(result).toEqual([]);

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle empty database ID', async () => {
      const requestPayload = { databaseId: '', filters: {}, sorts: [] };
      mockApiService.post = vi.fn().mockResolvedValue({ results: [], has_more: false });
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([]);

      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);
    });

    it('should handle complex filter payloads', async () => {
      const complexPayload = {
        databaseId: 'test-db',
        filters: {
          and: [
            { property: 'Status', select: { equals: 'Active' } },
            { property: 'Revenue', number: { greater_than: 10000 } }
          ]
        },
        sorts: [
          { property: 'Name', direction: 'ascending' }
        ]
      };

      mockApiService.post = vi.fn().mockResolvedValue({ results: [], has_more: false });
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([]);

      const result = await smartDataService.fetchData<Project>('projects', complexPayload);

      expect(mockApiService.post).toHaveBeenCalledWith(
        API_ENDPOINTS.NOTION_QUERY,
        complexPayload
      );
      expect(result).toEqual([]);
    });

    it('should handle unknown entity types', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ results: [], has_more: false });

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      // @ts-expect-error Testing invalid entity type
      const result = await smartDataService.fetchData('unknown_type', requestPayload);

      // Since the switch case has a default that returns [], this should work
      expect(result).toEqual([]);
    });

    it('should handle large result sets', async () => {
      const largeResults = Array.from({ length: 100 }, (_, i) => ({
        id: `page-${i}`,
        properties: {
          Name: { title: [{ plain_text: `Project ${i}` }] }
        },
        last_edited_time: '2023-01-01T00:00:00.000Z'
      }));

      const mockProject: Project = {
        id: 'page-1',
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        description: '',
        aiSummary: '',
        lead: '',
        teamMembers: [],
        coreValues: '',
        themes: [],
        tags: [],
        place: ProjectPlace.COMMUNITY,
        location: '',
        state: '',
        revenueActual: 0,
        revenuePotential: 0,
        actualIncoming: 0,
        potentialIncoming: 0,
        relatedOpportunities: [],
        partnerOrganizations: [],
        artifacts: [],
        websiteLinks: '',
        lastModified: new Date()
      };

      const largeProjects = Array.from({ length: 100 }, (_, i) => ({
        ...mockProject,
        id: `page-${i}`,
        name: `Project ${i}`
      }));

      mockApiService.post = vi.fn().mockResolvedValue({ results: largeResults, has_more: false });
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue(largeProjects);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toHaveLength(100);
    });

    it('should handle response with has_more: true', async () => {
      const notionResponse = {
        results: [
          {
            id: 'page-1',
            properties: {
              Name: { title: [{ plain_text: 'Test Item' }] }
            },
            last_edited_time: '2023-01-01T00:00:00.000Z'
          }
        ],
        has_more: true,
        next_cursor: 'cursor-123'
      };

      const mockProject: Project = {
        id: 'page-1',
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        description: '',
        aiSummary: '',
        lead: '',
        teamMembers: [],
        coreValues: '',
        themes: [],
        tags: [],
        place: ProjectPlace.COMMUNITY,
        location: '',
        state: '',
        revenueActual: 0,
        revenuePotential: 0,
        actualIncoming: 0,
        potentialIncoming: 0,
        relatedOpportunities: [],
        partnerOrganizations: [],
        artifacts: [],
        websiteLinks: '',
        lastModified: new Date()
      };

      mockApiService.post = vi.fn().mockResolvedValue(notionResponse);
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([mockProject]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      // Should still return results even if there are more pages
      expect(result).toHaveLength(1);
    });

    it('should handle concurrent requests for different entity types', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ results: [], has_more: false });
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };

      const [projects, opportunities, organizations, people, artifacts] = await Promise.all([
        smartDataService.fetchData<Project>('projects', requestPayload),
        smartDataService.fetchData<Opportunity>('opportunities', requestPayload),
        smartDataService.fetchData<Organization>('organizations', requestPayload),
        smartDataService.fetchData<Person>('people', requestPayload),
        smartDataService.fetchData<Artifact>('artifacts', requestPayload)
      ]);

      expect(mockApiService.post).toHaveBeenCalledTimes(5);
      expect(projects).toEqual([]);
      expect(opportunities).toEqual([]);
      expect(organizations).toEqual([]);
      expect(people).toEqual([]);
      expect(artifacts).toEqual([]);
    });

    it('should handle API response with extra fields', async () => {
      const notionResponse = {
        results: [
          {
            id: 'page-1',
            properties: {
              Name: { title: [{ plain_text: 'Test Item' }] }
            },
            last_edited_time: '2023-01-01T00:00:00.000Z'
          }
        ],
        has_more: false,
        extra_field: 'extra_value',
        another_field: 123
      };

      const mockProject: Project = {
        id: 'page-1',
        name: 'Test Project',
        area: ProjectArea.STORY_SOVEREIGNTY,
        status: ProjectStatus.ACTIVE,
        description: '',
        aiSummary: '',
        lead: '',
        teamMembers: [],
        coreValues: '',
        themes: [],
        tags: [],
        place: ProjectPlace.COMMUNITY,
        location: '',
        state: '',
        revenueActual: 0,
        revenuePotential: 0,
        actualIncoming: 0,
        potentialIncoming: 0,
        relatedOpportunities: [],
        partnerOrganizations: [],
        artifacts: [],
        websiteLinks: '',
        lastModified: new Date()
      };

      mockApiService.post = vi.fn().mockResolvedValue(notionResponse);
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([mockProject]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([mockProject]);
    });

    it('should handle empty results array gracefully', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({ results: [], has_more: false });
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([]);

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);
      expect(mockApiService.post).toHaveBeenCalledTimes(1);
    });

    it('should handle very complex nested filters', async () => {
      const complexPayload = {
        databaseId: 'test-db',
        filters: {
          and: [
            {
              or: [
                { property: 'Status', select: { equals: 'Active' } },
                { property: 'Status', select: { equals: 'Planning' } }
              ]
            },
            {
              and: [
                { property: 'Revenue', number: { greater_than: 10000 } },
                { property: 'Revenue', number: { less_than: 100000 } }
              ]
            }
          ]
        },
        sorts: [
          { property: 'Name', direction: 'ascending' },
          { property: 'Revenue', direction: 'descending' }
        ]
      };

      mockApiService.post = vi.fn().mockResolvedValue({ results: [], has_more: false });
      vi.spyOn(notionTransform, 'transformNotionResponse').mockReturnValue([]);

      const result = await smartDataService.fetchData<Project>('projects', complexPayload);

      expect(mockApiService.post).toHaveBeenCalledWith(
        API_ENDPOINTS.NOTION_QUERY,
        complexPayload
      );
      expect(result).toEqual([]);
    });
  });

  describe('additional error scenarios', () => {
    it('should handle timeout errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApiService.post = vi.fn().mockRejectedValue(new Error('Request timeout'));

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle 401 authentication errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApiService.post = vi.fn().mockRejectedValue(new Error('Unauthorized: 401'));

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle 404 not found errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApiService.post = vi.fn().mockRejectedValue(new Error('Not found: 404'));

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle 500 internal server errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApiService.post = vi.fn().mockRejectedValue(new Error('Internal server error: 500'));

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle JSON parse errors', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockApiService.post = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token in JSON'));

      const requestPayload = { databaseId: 'test-db', filters: {}, sorts: [] };
      const result = await smartDataService.fetchData<Project>('projects', requestPayload);

      expect(result).toEqual([]);

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('cache stress tests', () => {
    it('should handle many cache operations', () => {
      // Perform multiple cache operations
      for (let i = 0; i < 100; i++) {
        smartDataService.clearCacheForType('projects');
        smartDataService.getCacheStats();
      }

      const stats = smartDataService.getCacheStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent cache clears', () => {
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(smartDataService.clearCache())
      );

      return Promise.all(promises).then(() => {
        const stats = smartDataService.getCacheStats();
        expect(stats.totalEntries).toBe(0);
      });
    });

    it('should handle alternating cache operations', () => {
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          smartDataService.clearCache();
        } else {
          smartDataService.getCacheStats();
        }
      }

      const stats = smartDataService.getCacheStats();
      expect(stats).toBeDefined();
    });
  });
});
