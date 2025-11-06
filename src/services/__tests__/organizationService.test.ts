// Tests for OrganizationService

import { describe, it, expect, vi, beforeEach } from 'vitest';
import OrganizationService from '../organizationService';
import { smartDataService } from '../smartDataService';
import { configService } from '../configService';
import { Organization, OrganizationFilters, SortOption, OrganizationType, OrganizationSize, RelationshipStatus, FundingCapacity, DecisionTimeline, AlignmentLevel, PriorityLevel } from '../../types';

// Mock dependencies
vi.mock('../smartDataService');
vi.mock('../configService');

describe('OrganizationService', () => {
  let organizationService: OrganizationService;
  const mockSmartDataService = vi.mocked(smartDataService);
  const mockConfigService = vi.mocked(configService);

  const mockOrganizations: Organization[] = [
    {
      id: 'org-1',
      name: 'Test Organization 1',
      type: OrganizationType.NONPROFIT,
      sector: ['Education'],
      size: OrganizationSize.MEDIUM,
      location: 'Austin, TX',
      website: 'https://org1.com',
      description: 'Description 1',
      relationshipStatus: RelationshipStatus.PARTNER,
      partnershipType: ['Strategic'],
      keyContacts: ['person-1'],
      activeOpportunities: ['opp-1'],
      relatedProjects: ['proj-1'],
      sharedArtifacts: [],
      fundingCapacity: FundingCapacity.MEDIUM,
      decisionTimeline: DecisionTimeline.MEDIUM,
      valuesAlignment: AlignmentLevel.HIGH,
      strategicPriority: PriorityLevel.HIGH,
      notes: '',
      lastModified: new Date('2023-01-01')
    },
    {
      id: 'org-2',
      name: 'Test Organization 2',
      type: OrganizationType.GOVERNMENT,
      sector: ['Technology'],
      size: OrganizationSize.LARGE,
      location: 'Houston, TX',
      website: 'https://org2.com',
      description: 'Description 2',
      relationshipStatus: RelationshipStatus.PROSPECT,
      partnershipType: ['Funding'],
      keyContacts: ['person-2'],
      activeOpportunities: ['opp-2'],
      relatedProjects: ['proj-2'],
      sharedArtifacts: [],
      fundingCapacity: FundingCapacity.HIGH,
      decisionTimeline: DecisionTimeline.VERY_SLOW,
      valuesAlignment: AlignmentLevel.MEDIUM,
      strategicPriority: PriorityLevel.MEDIUM,
      notes: '',
      lastModified: new Date('2023-01-02')
    }
  ];

  beforeEach(() => {
    // Create a fresh instance for each test
    organizationService = new OrganizationService();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockConfigService.getDatabaseId = vi.fn().mockResolvedValue('mock-database-id');
    mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockOrganizations);
  });

  describe('getOrganizations', () => {
    it('should fetch all organizations without filters', async () => {
      const organizations = await organizationService.getOrganizations();

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('organizations');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
      expect(organizations).toEqual(mockOrganizations);
      expect(organizations).toHaveLength(2);
    });

    it('should fetch organizations with status filter', async () => {
      const filters: OrganizationFilters = {
        status: ['Contacted']
      };

      await organizationService.getOrganizations(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Status',
              select: {
                equals: 'Contacted'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch organizations with type filter', async () => {
      const filters: OrganizationFilters = {
        type: [OrganizationType.NONPROFIT]
      };

      await organizationService.getOrganizations(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Status',
              select: {
                equals: OrganizationType.NONPROFIT
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch organizations with relationship status filter', async () => {
      const filters: OrganizationFilters = {
        relationshipStatus: ['PARTNER']
      };

      await organizationService.getOrganizations(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Status',
              select: {
                equals: 'PARTNER'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch organizations with search filter', async () => {
      const filters: OrganizationFilters = {
        search: 'test'
      };

      await organizationService.getOrganizations(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Name',
              title: {
                contains: 'test'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch organizations with multiple filters combined', async () => {
      const filters: OrganizationFilters = {
        status: ['Contacted'],
        type: [OrganizationType.NONPROFIT],
        search: 'test'
      };

      await organizationService.getOrganizations(filters);

      const expectedFilters = {
        and: [
          {
            property: 'Status',
            select: {
              equals: 'Contacted'
            }
          },
          {
            property: 'Status',
            select: {
              equals: OrganizationType.NONPROFIT
            }
          },
          {
            property: 'Name',
            title: {
              contains: 'test'
            }
          }
        ]
      };

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: expectedFilters,
        sorts: []
      });
    });

    it('should fetch organizations with sort option', async () => {
      const sort: SortOption = {
        field: 'name',
        direction: 'asc',
        label: "Name"
      };

      await organizationService.getOrganizations(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Name',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should fetch organizations with descending sort', async () => {
      const sort: SortOption = {
        field: 'lastModified',
        direction: 'desc',
        label: "Last Modified"
      };

      await organizationService.getOrganizations(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'last_edited_time',
            direction: 'descending'
          }
        ]
      });
    });

    it('should handle errors and return fallback data', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([]);

      const organizations = await organizationService.getOrganizations();

      expect(organizations).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {});

      consoleErrorSpy.mockRestore();
    });

  });

  describe('getOrganizationById', () => {
    it('should fetch a single organization by ID', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([mockOrganizations[0]]);

      const organization = await organizationService.getOrganizationById('org-1');

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('organizations');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {
          property: 'id',
          rich_text: {
            equals: 'org-1'
          }
        }
      });
      expect(organization).toEqual(mockOrganizations[0]);
    });

    it('should return undefined when organization is not found', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([]);

      const organization = await organizationService.getOrganizationById('non-existent-id');

      expect(organization).toBeUndefined();
    });

    it('should return first match when multiple organizations are returned', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockOrganizations);

      const organization = await organizationService.getOrganizationById('org-1');

      expect(organization).toEqual(mockOrganizations[0]);
    });

    it('should handle errors and return undefined', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));

      const organization = await organizationService.getOrganizationById('org-1');

      expect(organization).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('buildNotionFilters', () => {
    it('should build empty filter object when no filters provided', async () => {
      await organizationService.getOrganizations();

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle empty arrays in filters', async () => {
      const filters: OrganizationFilters = {
        status: [],
        type: [],
        relationshipStatus: []
      };

      await organizationService.getOrganizations(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle only status filter', async () => {
      const filters: OrganizationFilters = {
        status: ['Research']
      };

      await organizationService.getOrganizations(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Status',
              select: {
                equals: 'Research'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should handle multiple status values by using first one', async () => {
      const filters: OrganizationFilters = {
        status: ['Research', 'Contacted', 'Pitched']
      };

      await organizationService.getOrganizations(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Status',
              select: {
                equals: 'Research'
              }
            }
          ]
        },
        sorts: []
      });
    });
  });

  describe('buildNotionSort', () => {
    it('should map name field to Name property', async () => {
      const sort: SortOption = {
        field: 'name',
        direction: 'asc',
        label: "Name"
      };

      await organizationService.getOrganizations(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Name',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should map lastModified field to last_edited_time property', async () => {
      const sort: SortOption = {
        field: 'lastModified',
        direction: 'desc',
        label: "Last Modified"
      };

      await organizationService.getOrganizations(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'last_edited_time',
            direction: 'descending'
          }
        ]
      });
    });

    it('should map lastContactDate field to Last Contact Date property', async () => {
      const sort: SortOption = {
        field: 'lastContactDate',
        direction: 'asc',
        label: "Last Contact Date"
      };

      await organizationService.getOrganizations(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Last Contact Date',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should map nextContactDate field to Next Contact Date property', async () => {
      const sort: SortOption = {
        field: 'nextContactDate',
        direction: 'asc',
        label: "Next Contact Date"
      };

      await organizationService.getOrganizations(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Next Contact Date',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should map strategicPriority field to Strategic Priority property', async () => {
      const sort: SortOption = {
        field: 'strategicPriority',
        direction: 'desc',
        label: "Strategic Priority"
      };

      await organizationService.getOrganizations(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Strategic Priority',
            direction: 'descending'
          }
        ]
      });
    });

    it('should handle unmapped field names', async () => {
      const sort: SortOption = {
        field: 'customField',
        direction: 'asc',
        label: "Custom Field"
      };

      await organizationService.getOrganizations(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'customField',
            direction: 'ascending'
          }
        ]
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null filters gracefully', async () => {
      await organizationService.getOrganizations(undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle null sort gracefully', async () => {
      await organizationService.getOrganizations(undefined, undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle empty string in search filter', async () => {
      const filters: OrganizationFilters = {
        search: ''
      };

      await organizationService.getOrganizations(filters);

      // Empty string is falsy, so it should be treated as no filter
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle both filters and sort together', async () => {
      const filters: OrganizationFilters = {
        status: ['Contacted']
      };
      const sort: SortOption = {
        field: 'name',
        direction: 'asc',
        label: "Name"
      };

      await organizationService.getOrganizations(filters, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('organizations', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Status',
              select: {
                equals: 'Contacted'
              }
            }
          ]
        },
        sorts: [
          {
            property: 'Name',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should handle concurrent requests', async () => {
      const promise1 = organizationService.getOrganizations();
      const promise2 = organizationService.getOrganizations();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockOrganizations);
      expect(result2).toEqual(mockOrganizations);
      expect(mockConfigService.getDatabaseId).toHaveBeenCalledTimes(2);
    });
  });
});
