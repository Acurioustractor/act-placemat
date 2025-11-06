// Tests for OpportunityService

import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpportunityService from '../opportunityService';
import { smartDataService } from '../smartDataService';
import { configService } from '../configService';
import { Opportunity, OpportunityFilters, SortOption, OpportunityStage, OpportunityType } from '../../types';

// Mock dependencies
vi.mock('../smartDataService');
vi.mock('../configService');

describe('OpportunityService', () => {
  let opportunityService: OpportunityService;
  const mockSmartDataService = vi.mocked(smartDataService);
  const mockConfigService = vi.mocked(configService);

  const mockOpportunities: Opportunity[] = [
    {
      id: 'opp-1',
      name: 'Test Opportunity 1',
      organization: 'Test Organization 1',
      stage: OpportunityStage.DISCOVERY,
      amount: 50000,
      probability: 75,
      weightedValue: 37500,
      type: OpportunityType.GRANT,
      description: 'Description 1',
      relatedProjects: ['proj-1'],
      primaryContact: 'John Doe',
      decisionMakers: ['Jane Smith'],
      nextAction: 'Follow up',
      artifacts: [],
      requirements: '',
      competition: '',
      budgetBreakdown: '',
      successCriteria: '',
      riskAssessment: '',
      notes: '',
      lastModified: new Date('2023-01-01')
    },
    {
      id: 'opp-2',
      name: 'Test Opportunity 2',
      organization: 'Test Organization 2',
      stage: OpportunityStage.PROPOSAL,
      amount: 100000,
      probability: 50,
      weightedValue: 50000,
      type: OpportunityType.CONTRACT,
      description: 'Description 2',
      relatedProjects: ['proj-2'],
      primaryContact: 'Jane Smith',
      decisionMakers: ['John Doe'],
      nextAction: 'Submit proposal',
      artifacts: [],
      requirements: '',
      competition: '',
      budgetBreakdown: '',
      successCriteria: '',
      riskAssessment: '',
      notes: '',
      lastModified: new Date('2023-01-02')
    }
  ];

  beforeEach(() => {
    // Create a fresh instance for each test
    opportunityService = new OpportunityService();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockConfigService.getDatabaseId = vi.fn().mockResolvedValue('mock-database-id');
    mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockOpportunities);
  });

  describe('getOpportunities', () => {
    it('should fetch all opportunities without filters', async () => {
      const opportunities = await opportunityService.getOpportunities();

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('opportunities');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
      expect(opportunities).toEqual(mockOpportunities);
      expect(opportunities).toHaveLength(2);
    });

    it('should fetch opportunities with stage filter', async () => {
      const filters: OpportunityFilters = {
        stage: ['Proposal']
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Stage',
              select: {
                equals: 'Proposal'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch opportunities with organization filter', async () => {
      const filters: OpportunityFilters = {
        organization: ['Test Organization']
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Organisations',
              relation: {
                contains: 'Test Organization'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch opportunities with amount range filter', async () => {
      const filters: OpportunityFilters = {
        amountRange: {
          min: 25000,
          max: 75000
        }
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Amount',
              number: {
                greater_than_or_equal_to: 25000
              }
            },
            {
              property: 'Amount',
              number: {
                less_than_or_equal_to: 75000
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch opportunities with probability filter', async () => {
      const filters: OpportunityFilters = {
        probability: ['75%']
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Probability',
              select: {
                equals: '75%'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch opportunities with deadline range filter', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const filters: OpportunityFilters = {
        deadlineRange: {
          start: startDate,
          end: endDate
        }
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Deadline',
              date: {
                on_or_after: startDate.toISOString()
              }
            },
            {
              property: 'Deadline',
              date: {
                on_or_before: endDate.toISOString()
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch opportunities with search filter', async () => {
      const filters: OpportunityFilters = {
        search: 'test'
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
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

    it('should fetch opportunities with multiple filters combined', async () => {
      const filters: OpportunityFilters = {
        stage: ['Discovery'],
        organization: ['Test Org'],
        amountRange: {
          min: 10000,
          max: 100000
        },
        probability: ['50%']
      };

      await opportunityService.getOpportunities(filters);

      const expectedFilters = {
        and: [
          {
            property: 'Stage',
            select: {
              equals: 'Discovery'
            }
          },
          {
            property: 'Organisations',
            relation: {
              contains: 'Test Org'
            }
          },
          {
            property: 'Amount',
            number: {
              greater_than_or_equal_to: 10000
            }
          },
          {
            property: 'Amount',
            number: {
              less_than_or_equal_to: 100000
            }
          },
          {
            property: 'Probability',
            select: {
              equals: '50%'
            }
          }
        ]
      };

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: expectedFilters,
        sorts: []
      });
    });

    it('should fetch opportunities with sort option', async () => {
      const sort: SortOption = {
        field: 'amount',
        direction: 'desc',
        label: "Amount"
      };

      await opportunityService.getOpportunities(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Amount',
            direction: 'descending'
          }
        ]
      });
    });

    it('should handle errors and return fallback data', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([]);

      const opportunities = await opportunityService.getOpportunities();

      expect(opportunities).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {});

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getOpportunityById', () => {
    it('should fetch a single opportunity by ID', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([mockOpportunities[0]]);

      const opportunity = await opportunityService.getOpportunityById('opp-1');

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('opportunities');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          property: 'id',
          rich_text: {
            equals: 'opp-1'
          }
        }
      });
      expect(opportunity).toEqual(mockOpportunities[0]);
    });

    it('should return undefined when opportunity is not found', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([]);

      const opportunity = await opportunityService.getOpportunityById('non-existent-id');

      expect(opportunity).toBeUndefined();
    });

    it('should return first match when multiple opportunities are returned', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockOpportunities);

      const opportunity = await opportunityService.getOpportunityById('opp-1');

      expect(opportunity).toEqual(mockOpportunities[0]);
    });

    it('should handle errors and return undefined', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));

      const opportunity = await opportunityService.getOpportunityById('opp-1');

      expect(opportunity).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('calculatePipelineMetrics', () => {
    it('should calculate metrics for opportunities', () => {
      const metrics = opportunityService.calculatePipelineMetrics(mockOpportunities);

      expect(metrics.totalValue).toBe(150000); // 50000 + 100000
      expect(metrics.weightedValue).toBe(87500); // 37500 + 50000
      expect(metrics.averageProbability).toBe(62.5); // (75 + 50) / 2
      expect(metrics.totalCount).toBe(2);
      expect(metrics.byStage).toEqual({
        DISCOVERY: 1,
        PROPOSAL: 1
      });
    });

    it('should handle empty opportunities array', () => {
      const metrics = opportunityService.calculatePipelineMetrics([]);

      expect(metrics.totalValue).toBe(0);
      expect(metrics.weightedValue).toBe(0);
      expect(metrics.averageProbability).toBe(0);
      expect(metrics.totalCount).toBe(0);
      expect(metrics.byStage).toEqual({});
    });

    it('should handle opportunities with zero amounts', () => {
      const zeroAmountOpps: Opportunity[] = [
        {
          ...mockOpportunities[0],
          amount: 0,
          weightedValue: 0
        }
      ];

      const metrics = opportunityService.calculatePipelineMetrics(zeroAmountOpps);

      expect(metrics.totalValue).toBe(0);
      expect(metrics.weightedValue).toBe(0);
    });

    it('should count multiple opportunities in same stage', () => {
      const sameStageOpps: Opportunity[] = [
        mockOpportunities[0],
        { ...mockOpportunities[1], stage: OpportunityStage.DISCOVERY }
      ];

      const metrics = opportunityService.calculatePipelineMetrics(sameStageOpps);

      expect(metrics.byStage).toEqual({
        DISCOVERY: 2
      });
    });
  });

  describe('buildNotionFilters', () => {
    it('should build empty filter object when no filters provided', async () => {
      await opportunityService.getOpportunities();

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should build filter with only minimum amount', async () => {
      const filters: OpportunityFilters = {
        amountRange: {
          min: 25000
        }
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Amount',
              number: {
                greater_than_or_equal_to: 25000
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should build filter with only maximum amount', async () => {
      const filters: OpportunityFilters = {
        amountRange: {
          max: 75000
        }
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Amount',
              number: {
                less_than_or_equal_to: 75000
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should build filter with only start deadline', async () => {
      const startDate = new Date('2023-01-01');

      const filters: OpportunityFilters = {
        deadlineRange: {
          start: startDate
        }
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Deadline',
              date: {
                on_or_after: startDate.toISOString()
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should build filter with only end deadline', async () => {
      const endDate = new Date('2023-12-31');

      const filters: OpportunityFilters = {
        deadlineRange: {
          end: endDate
        }
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Deadline',
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
      const filters: OpportunityFilters = {
        stage: [],
        organization: [],
        probability: []
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
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

      await opportunityService.getOpportunities(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
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

      await opportunityService.getOpportunities(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
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

    it('should map amount field to Amount property', async () => {
      const sort: SortOption = {
        field: 'amount',
        direction: 'asc',
        label: "Amount"
      };

      await opportunityService.getOpportunities(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Amount',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should map weightedValue field to Weighted Value property', async () => {
      const sort: SortOption = {
        field: 'weightedValue',
        direction: 'desc',
        label: "Weighted Value"
      };

      await opportunityService.getOpportunities(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Weighted Value',
            direction: 'descending'
          }
        ]
      });
    });

    it('should map deadline field to Deadline property', async () => {
      const sort: SortOption = {
        field: 'deadline',
        direction: 'asc',
        label: "Deadline"
      };

      await opportunityService.getOpportunities(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Deadline',
            direction: 'ascending'
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

      await opportunityService.getOpportunities(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
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
      await opportunityService.getOpportunities(undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle null sort gracefully', async () => {
      await opportunityService.getOpportunities(undefined, undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle filters with only amount min set to 0', async () => {
      const filters: OpportunityFilters = {
        amountRange: {
          min: 0
        }
      };

      await opportunityService.getOpportunities(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('opportunities', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Amount',
              number: {
                greater_than_or_equal_to: 0
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should handle single opportunity in metrics calculation', () => {
      const metrics = opportunityService.calculatePipelineMetrics([mockOpportunities[0]]);

      expect(metrics.totalValue).toBe(50000);
      expect(metrics.weightedValue).toBe(37500);
      expect(metrics.averageProbability).toBe(75);
      expect(metrics.totalCount).toBe(1);
    });
  });
});
