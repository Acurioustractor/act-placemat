// Tests for ProjectService

import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectService from '../projectService';
import { smartDataService } from '../smartDataService';
import { configService } from '../configService';
import { Project, ProjectFilters, SortOption, ProjectArea, ProjectStatus, ProjectPlace } from '../../types';

// Mock dependencies
vi.mock('../smartDataService');
vi.mock('../configService');

describe('ProjectService', () => {
  let projectService: ProjectService;
  const mockSmartDataService = vi.mocked(smartDataService);
  const mockConfigService = vi.mocked(configService);

  const mockProjects: Project[] = [
    {
      id: 'project-1',
      name: 'Test Project 1',
      area: ProjectArea.STORY_SOVEREIGNTY,
      status: ProjectStatus.ACTIVE,
      description: 'Description 1',
      aiSummary: '',
      lead: 'John Doe',
      teamMembers: [],
      coreValues: '',
      themes: ['Economic Freedom'],
      tags: ['tag1'],
      place: ProjectPlace.COMMUNITY,
      location: 'Austin',
      state: 'TX',
      revenueActual: 10000,
      revenuePotential: 20000,
      actualIncoming: 5000,
      potentialIncoming: 10000,
      relatedOpportunities: [],
      partnerOrganizations: [],
      artifacts: [],
      websiteLinks: '',
      lastModified: new Date('2023-01-01')
    },
    {
      id: 'project-2',
      name: 'Test Project 2',
      area: ProjectArea.ECONOMIC_FREEDOM,
      status: ProjectStatus.IDEATION,
      description: 'Description 2',
      aiSummary: '',
      lead: 'Jane Smith',
      teamMembers: [],
      coreValues: '',
      themes: ['Story Sovereignty'],
      tags: ['tag2'],
      place: ProjectPlace.REGIONAL,
      location: 'Houston',
      state: 'TX',
      revenueActual: 15000,
      revenuePotential: 30000,
      actualIncoming: 7500,
      potentialIncoming: 15000,
      relatedOpportunities: [],
      partnerOrganizations: [],
      artifacts: [],
      websiteLinks: '',
      lastModified: new Date('2023-01-02')
    }
  ];

  beforeEach(() => {
    // Create a fresh instance for each test
    projectService = new ProjectService();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockConfigService.getDatabaseId = vi.fn().mockResolvedValue('mock-database-id');
    mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockProjects);
  });

  describe('getProjects', () => {
    it('should fetch all projects without filters', async () => {
      const projects = await projectService.getProjects();

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('projects');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
      expect(projects).toEqual(mockProjects);
      expect(projects).toHaveLength(2);
    });

    it('should fetch projects with status filter', async () => {
      const filters: ProjectFilters = {
        status: ['Active']
      };

      const projects = await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Status',
              select: {
                equals: 'Active'
              }
            }
          ]
        },
        sorts: []
      });
      expect(projects).toEqual(mockProjects);
    });

    it('should fetch projects with area filter', async () => {
      const filters: ProjectFilters = {
        area: ['Economic Freedom']
      };

      const projects = await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Theme',
              multi_select: {
                contains: 'Economic Freedom'
              }
            }
          ]
        },
        sorts: []
      });
      expect(projects).toEqual(mockProjects);
    });

    it('should fetch projects with location filter', async () => {
      const filters: ProjectFilters = {
        location: ['Austin']
      };

      const projects = await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Location',
              select: {
                equals: 'Austin'
              }
            }
          ]
        },
        sorts: []
      });
      expect(projects).toEqual(mockProjects);
    });

    it('should fetch projects with tags filter', async () => {
      const filters: ProjectFilters = {
        tags: ['tag1']
      };

      const projects = await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
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
      expect(projects).toEqual(mockProjects);
    });

    it('should fetch projects with revenue range filter', async () => {
      const filters: ProjectFilters = {
        revenueRange: {
          min: 5000,
          max: 20000
        }
      };

      const projects = await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Revenue Actual',
              number: {
                greater_than_or_equal_to: 5000
              }
            },
            {
              property: 'Revenue Actual',
              number: {
                less_than_or_equal_to: 20000
              }
            }
          ]
        },
        sorts: []
      });
      expect(projects).toEqual(mockProjects);
    });

    it('should fetch projects with date range filter', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const filters: ProjectFilters = {
        dateRange: {
          start: startDate,
          end: endDate
        }
      };

      const projects = await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Start Date',
              date: {
                on_or_after: startDate.toISOString()
              }
            },
            {
              property: 'End Date',
              date: {
                on_or_before: endDate.toISOString()
              }
            }
          ]
        },
        sorts: []
      });
      expect(projects).toEqual(mockProjects);
    });

    it('should fetch projects with search filter', async () => {
      const filters: ProjectFilters = {
        search: 'test'
      };

      const projects = await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
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
      expect(projects).toEqual(mockProjects);
    });

    it('should fetch projects with multiple filters combined', async () => {
      const filters: ProjectFilters = {
        status: ['Active'],
        area: ['Economic Freedom'],
        location: ['Austin'],
        revenueRange: {
          min: 5000,
          max: 20000
        }
      };

      const projects = await projectService.getProjects(filters);

      const expectedFilters = {
        and: [
          {
            property: 'Theme',
            multi_select: {
              contains: 'Economic Freedom'
            }
          },
          {
            property: 'Status',
            select: {
              equals: 'Active'
            }
          },
          {
            property: 'Location',
            select: {
              equals: 'Austin'
            }
          },
          {
            property: 'Revenue Actual',
            number: {
              greater_than_or_equal_to: 5000
            }
          },
          {
            property: 'Revenue Actual',
            number: {
              less_than_or_equal_to: 20000
            }
          }
        ]
      };

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: expectedFilters,
        sorts: []
      });
      expect(projects).toEqual(mockProjects);
    });

    it('should fetch projects with sort option', async () => {
      const sort: SortOption = {
        field: 'name',
        direction: 'asc',
        label: 'Name'
      };

      const projects = await projectService.getProjects(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Name',
            direction: 'ascending'
          }
        ]
      });
      expect(projects).toEqual(mockProjects);
    });

    it('should fetch projects with descending sort', async () => {
      const sort: SortOption = {
        field: 'lastModified',
        direction: 'desc',
        label: 'Last Modified'
      };

      const projects = await projectService.getProjects(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'last_edited_time',
            direction: 'descending'
          }
        ]
      });
      expect(projects).toEqual(mockProjects);
    });

    it('should handle errors and return empty array', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));

      const projects = await projectService.getProjects();

      expect(projects).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch projects:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getProjectById', () => {
    it('should fetch a single project by ID', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([mockProjects[0]]);

      const project = await projectService.getProjectById('project-1');

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('projects');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          property: 'id',
          rich_text: {
            equals: 'project-1'
          }
        }
      });
      expect(project).toEqual(mockProjects[0]);
    });

    it('should return undefined when project is not found', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([]);

      const project = await projectService.getProjectById('non-existent-id');

      expect(project).toBeUndefined();
    });

    it('should return first match when multiple projects are returned', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockProjects);

      const project = await projectService.getProjectById('project-1');

      expect(project).toEqual(mockProjects[0]);
    });

    it('should handle errors and return undefined', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));

      const project = await projectService.getProjectById('project-1');

      expect(project).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('buildNotionFilters', () => {
    it('should build empty filter object when no filters provided', async () => {
      await projectService.getProjects();

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should build filter with only minimum revenue', async () => {
      const filters: ProjectFilters = {
        revenueRange: {
          min: 5000
        }
      };

      await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Revenue Actual',
              number: {
                greater_than_or_equal_to: 5000
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should build filter with only maximum revenue', async () => {
      const filters: ProjectFilters = {
        revenueRange: {
          max: 20000
        }
      };

      await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Revenue Actual',
              number: {
                less_than_or_equal_to: 20000
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should build filter with only start date', async () => {
      const startDate = new Date('2023-01-01');

      const filters: ProjectFilters = {
        dateRange: {
          start: startDate
        }
      };

      await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Start Date',
              date: {
                on_or_after: startDate.toISOString()
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should build filter with only end date', async () => {
      const endDate = new Date('2023-12-31');

      const filters: ProjectFilters = {
        dateRange: {
          end: endDate
        }
      };

      await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'End Date',
              date: {
                on_or_before: endDate.toISOString()
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should handle empty arrays in filters', async () => {
      const filters: ProjectFilters = {
        status: [],
        area: [],
        location: [],
        tags: []
      };

      await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
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
        label: 'Name'
      };

      await projectService.getProjects(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
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
        label: 'Last Modified'
      };

      await projectService.getProjects(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
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

    it('should map revenueActual field to Revenue Actual property', async () => {
      const sort: SortOption = {
        field: 'revenueActual',
        direction: 'asc',
        label: 'Revenue Actual'
      };

      await projectService.getProjects(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Revenue Actual',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should map revenuePotential field to Revenue Potential property', async () => {
      const sort: SortOption = {
        field: 'revenuePotential',
        direction: 'desc',
        label: 'Revenue Potential'
      };

      await projectService.getProjects(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Revenue Potential',
            direction: 'descending'
          }
        ]
      });
    });

    it('should map nextMilestone field to Next Milestone property', async () => {
      const sort: SortOption = {
        field: 'nextMilestone',
        direction: 'asc',
        label: 'Next Milestone'
      };

      await projectService.getProjects(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Next Milestone',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should handle unmapped field names', async () => {
      const sort: SortOption = {
        field: 'customField',
        direction: 'asc',
        label: 'Custom Field'
      };

      await projectService.getProjects(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
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
      await projectService.getProjects(undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle null sort gracefully', async () => {
      await projectService.getProjects(undefined, undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle filters with only revenue range min set to 0', async () => {
      const filters: ProjectFilters = {
        revenueRange: {
          min: 0
        }
      };

      await projectService.getProjects(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('projects', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Revenue Actual',
              number: {
                greater_than_or_equal_to: 0
              }
            }
          ]
        },
        sorts: []
      });
    });
  });
});
