// Tests for ArtifactService

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArtifactService from '../artifactService';
import { smartDataService } from '../smartDataService';
import { configService } from '../configService';
import { Artifact, ArtifactFilters, SortOption, ArtifactType, ArtifactFormat, ArtifactStatus, ArtifactPurpose, AccessLevel } from '../../types';

// Mock dependencies
vi.mock('../smartDataService');
vi.mock('../configService');

describe('ArtifactService', () => {
  let artifactService: ArtifactService;
  const mockSmartDataService = vi.mocked(smartDataService);
  const mockConfigService = vi.mocked(configService);

  const mockArtifacts: Artifact[] = [
    {
      id: 'artifact-1',
      name: 'Test Document 1',
      type: ArtifactType.REPORT,
      format: ArtifactFormat.PDF,
      status: ArtifactStatus.PUBLISHED,
      relatedOpportunities: ['opp-1'],
      relatedProjects: ['proj-1'],
      relatedOrganizations: ['org-1'],
      relatedPeople: ['person-1'],
      fileUrl: 'https://example.com/doc1.pdf',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      description: 'Description 1',
      audience: ['Internal'],
      purpose: ArtifactPurpose.FUNDER,
      version: 1,
      createdBy: 'John Doe',
      accessLevel: AccessLevel.INTERNAL,
      tags: ['tag1'],
      usageNotes: '',
      lastModified: new Date('2023-01-01')
    },
    {
      id: 'artifact-2',
      name: 'Test Presentation 2',
      type: ArtifactType.PRESENTATION,
      format: ArtifactFormat.SLIDE,
      status: ArtifactStatus.DRAFT,
      relatedOpportunities: ['opp-2'],
      relatedProjects: ['proj-2'],
      relatedOrganizations: ['org-2'],
      relatedPeople: ['person-2'],
      fileUrl: 'https://example.com/pres2.pptx',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      description: 'Description 2',
      audience: ['External'],
      purpose: ArtifactPurpose.MARKETING,
      version: 2,
      createdBy: 'Jane Smith',
      accessLevel: AccessLevel.PUBLIC,
      tags: ['tag2'],
      usageNotes: '',
      lastModified: new Date('2023-01-02')
    }
  ];

  beforeEach(() => {
    // Create a fresh instance for each test
    artifactService = new ArtifactService();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockConfigService.getDatabaseId = vi.fn().mockResolvedValue('mock-database-id');
    mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockArtifacts);
  });

  describe('getArtifacts', () => {
    it('should fetch all artifacts without filters', async () => {
      const artifacts = await artifactService.getArtifacts();

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('artifacts');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
      expect(artifacts).toEqual(mockArtifacts);
      expect(artifacts).toHaveLength(2);
    });

    it('should fetch artifacts with type filter', async () => {
      const filters: ArtifactFilters = {
        type: [ArtifactType.REPORT]
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Type',
              select: {
                equals: ArtifactType.REPORT
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch artifacts with format filter', async () => {
      const filters: ArtifactFilters = {
        format: ['PDF']
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Format',
              select: {
                equals: 'PDF'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch artifacts with status filter', async () => {
      const filters: ArtifactFilters = {
        status: [ArtifactStatus.PUBLISHED]
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Status',
              select: {
                equals: ArtifactStatus.PUBLISHED
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch artifacts with purpose filter', async () => {
      const filters: ArtifactFilters = {
        purpose: ['PROPOSAL']
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Purpose',
              select: {
                equals: 'PROPOSAL'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch artifacts with accessLevel filter', async () => {
      const filters: ArtifactFilters = {
        accessLevel: ['INTERNAL']
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Access Level',
              select: {
                equals: 'INTERNAL'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch artifacts with tags filter', async () => {
      const filters: ArtifactFilters = {
        tags: ['tag1']
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Tags',
              multi_select: {
                contains: 'tag1'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch artifacts with search filter', async () => {
      const filters: ArtifactFilters = {
        search: 'test'
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
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

    it('should fetch artifacts with multiple filters combined', async () => {
      const filters: ArtifactFilters = {
        type: [ArtifactType.REPORT],
        format: ['PDF'],
        status: [ArtifactStatus.PUBLISHED],
        accessLevel: ['INTERNAL']
      };

      await artifactService.getArtifacts(filters);

      const expectedFilters = {
        and: [
          {
            property: 'Type',
            select: {
              equals: ArtifactType.REPORT
            }
          },
          {
            property: 'Format',
            select: {
              equals: 'PDF'
            }
          },
          {
            property: 'Status',
            select: {
              equals: ArtifactStatus.PUBLISHED
            }
          },
          {
            property: 'Access Level',
            select: {
              equals: 'INTERNAL'
            }
          }
        ]
      };

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: expectedFilters,
        sorts: []
      });
    });

    it('should fetch artifacts with sort option', async () => {
      const sort: SortOption = {
        field: 'name',
        direction: 'asc',
        label: "Name"
      };

      await artifactService.getArtifacts(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
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

    it('should fetch artifacts with descending sort', async () => {
      const sort: SortOption = {
        field: 'lastModified',
        direction: 'desc',
        label: "Last Modified"
      };

      await artifactService.getArtifacts(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
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

    it('should handle errors and return empty array', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));

      const artifacts = await artifactService.getArtifacts();

      expect(artifacts).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

  });

  describe('getArtifactById', () => {
    it('should fetch a single artifact by ID', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([mockArtifacts[0]]);

      const artifact = await artifactService.getArtifactById('artifact-1');

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('artifacts');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          property: 'id',
          rich_text: {
            equals: 'artifact-1'
          }
        }
      });
      expect(artifact).toEqual(mockArtifacts[0]);
    });

    it('should return undefined when artifact is not found', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([]);

      const artifact = await artifactService.getArtifactById('non-existent-id');

      expect(artifact).toBeUndefined();
    });

    it('should return first match when multiple artifacts are returned', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockArtifacts);

      const artifact = await artifactService.getArtifactById('artifact-1');

      expect(artifact).toEqual(mockArtifacts[0]);
    });

    it('should handle errors and return undefined', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));

      const artifact = await artifactService.getArtifactById('artifact-1');

      expect(artifact).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getArtifactsForEntity', () => {
    it('should fetch artifacts for a project', async () => {
      await artifactService.getArtifactsForEntity('project', 'proj-1');

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('artifacts');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          property: 'Related Projects',
          relation: {
            contains: 'proj-1'
          }
        }
      });
    });

    it('should fetch artifacts for an opportunity', async () => {
      await artifactService.getArtifactsForEntity('opportunity', 'opp-1');

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('artifacts');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          property: 'Related Opportunities',
          relation: {
            contains: 'opp-1'
          }
        }
      });
    });

    it('should fetch artifacts for an organization', async () => {
      await artifactService.getArtifactsForEntity('organization', 'org-1');

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('artifacts');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          property: 'Related Organizations',
          relation: {
            contains: 'org-1'
          }
        }
      });
    });

    it('should fetch artifacts for a person', async () => {
      await artifactService.getArtifactsForEntity('person', 'person-1');

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('artifacts');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          property: 'Related People',
          relation: {
            contains: 'person-1'
          }
        }
      });
    });

    it('should throw error for invalid entity type', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // @ts-expect-error Testing invalid entity type
      const artifacts = await artifactService.getArtifactsForEntity('invalid', 'id-1');

      expect(artifacts).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors and return empty array', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));

      const artifacts = await artifactService.getArtifactsForEntity('project', 'proj-1');

      expect(artifacts).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should return artifacts when found for entity', async () => {
      const projectArtifacts = [mockArtifacts[0]];
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue(projectArtifacts);

      const artifacts = await artifactService.getArtifactsForEntity('project', 'proj-1');

      expect(artifacts).toEqual(projectArtifacts);
      expect(artifacts).toHaveLength(1);
    });

    it('should return empty array when no artifacts found for entity', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([]);

      const artifacts = await artifactService.getArtifactsForEntity('project', 'proj-999');

      expect(artifacts).toEqual([]);
    });
  });

  describe('buildNotionFilters', () => {
    it('should build empty filter object when no filters provided', async () => {
      await artifactService.getArtifacts();

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle empty arrays in filters', async () => {
      const filters: ArtifactFilters = {
        type: [],
        format: [],
        status: [],
        tags: []
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle only type filter', async () => {
      const filters: ArtifactFilters = {
        type: [ArtifactType.PRESENTATION]
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Type',
              select: {
                equals: ArtifactType.PRESENTATION
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should handle multiple type values by using first one', async () => {
      const filters: ArtifactFilters = {
        type: [ArtifactType.REPORT, ArtifactType.PRESENTATION, 'VIDEO']
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Type',
              select: {
                equals: ArtifactType.REPORT
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should handle empty string in search filter', async () => {
      const filters: ArtifactFilters = {
        search: ''
      };

      await artifactService.getArtifacts(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {},
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

      await artifactService.getArtifacts(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
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

      await artifactService.getArtifacts(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
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

    it('should map version field to Version property', async () => {
      const sort: SortOption = {
        field: 'version',
        direction: 'asc',
        label: "Version"
      };

      await artifactService.getArtifacts(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Version',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should map reviewDate field to Review Date property', async () => {
      const sort: SortOption = {
        field: 'reviewDate',
        direction: 'desc',
        label: "Review Date"
      };

      await artifactService.getArtifacts(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Review Date',
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

      await artifactService.getArtifacts(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
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
      await artifactService.getArtifacts(undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle null sort gracefully', async () => {
      await artifactService.getArtifacts(undefined, undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle both filters and sort together', async () => {
      const filters: ArtifactFilters = {
        type: [ArtifactType.REPORT]
      };
      const sort: SortOption = {
        field: 'name',
        direction: 'asc',
        label: "Name"
      };

      await artifactService.getArtifacts(filters, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('artifacts', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Type',
              select: {
                equals: ArtifactType.REPORT
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
      const promise1 = artifactService.getArtifacts();
      const promise2 = artifactService.getArtifacts();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockArtifacts);
      expect(result2).toEqual(mockArtifacts);
      expect(mockConfigService.getDatabaseId).toHaveBeenCalledTimes(2);
    });

    it('should handle all entity types in a single test', async () => {
      const entityTypes: Array<'project' | 'opportunity' | 'organization' | 'person'> = [
        'project',
        'opportunity',
        'organization',
        'person'
      ];

      for (const entityType of entityTypes) {
        vi.clearAllMocks();
        await artifactService.getArtifactsForEntity(entityType, 'test-id');
        expect(mockSmartDataService.fetchData).toHaveBeenCalled();
      }
    });

    it('should handle combination of all filter types', async () => {
      const filters: ArtifactFilters = {
        type: [ArtifactType.REPORT],
        format: ['PDF'],
        status: [ArtifactStatus.PUBLISHED],
        purpose: ['PROPOSAL'],
        accessLevel: ['INTERNAL'],
        tags: ['important'],
        search: 'quarterly'
      };

      await artifactService.getArtifacts(filters);

      const callArgs = mockSmartDataService.fetchData.mock.calls[0][1] as { filters: { and: unknown[] } };
      expect(callArgs.filters.and).toHaveLength(7);
    });
  });
});
