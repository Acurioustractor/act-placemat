// Tests for PersonService

import { describe, it, expect, vi, beforeEach } from 'vitest';
import PersonService from '../personService';
import { smartDataService } from '../smartDataService';
import { configService } from '../configService';
import { Person, PersonFilters, SortOption, RelationshipType, InfluenceLevel, CommunicationPreference, ContactFrequency, RelationshipStrength } from '../../types';

// Mock dependencies
vi.mock('../smartDataService');
vi.mock('../configService');

describe('PersonService', () => {
  let personService: PersonService;
  const mockSmartDataService = vi.mocked(smartDataService);
  const mockConfigService = vi.mocked(configService);

  const mockPeople: Person[] = [
    {
      id: 'person-1',
      fullName: 'John Doe',
      roleTitle: 'Director',
      organization: 'Test Org 1',
      email: 'john@test.com',
      phone: '555-1234',
      linkedin: 'linkedin.com/in/johndoe',
      location: 'Austin, TX',
      relationshipType: RelationshipType.COLLEAGUE,
      influenceLevel: InfluenceLevel.HIGH,
      communicationPreference: CommunicationPreference.EMAIL,
      relatedOpportunities: ['opp-1'],
      relatedProjects: ['proj-1'],
      sharedArtifacts: [],
      interests: ['Technology'],
      expertise: ['Software'],
      contactFrequency: ContactFrequency.WEEKLY,
      relationshipStrength: RelationshipStrength.STRONG,
      notes: '',
      personalInterests: '',
      lastModified: new Date('2023-01-01')
    },
    {
      id: 'person-2',
      fullName: 'Jane Smith',
      roleTitle: 'Manager',
      organization: 'Test Org 2',
      email: 'jane@test.com',
      phone: '555-5678',
      linkedin: 'linkedin.com/in/janesmith',
      location: 'Houston, TX',
      relationshipType: RelationshipType.PARTNER,
      influenceLevel: InfluenceLevel.MEDIUM,
      communicationPreference: CommunicationPreference.PHONE,
      relatedOpportunities: ['opp-2'],
      relatedProjects: ['proj-2'],
      sharedArtifacts: [],
      interests: ['Business'],
      expertise: ['Management'],
      contactFrequency: ContactFrequency.MONTHLY,
      relationshipStrength: RelationshipStrength.MODERATE,
      notes: '',
      personalInterests: '',
      lastModified: new Date('2023-01-02')
    }
  ];

  beforeEach(() => {
    // Create a fresh instance for each test
    personService = new PersonService();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockConfigService.getDatabaseId = vi.fn().mockResolvedValue('mock-database-id');
    mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockPeople);
  });

  describe('getPeople', () => {
    it('should fetch all people without filters', async () => {
      const people = await personService.getPeople();

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('people');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
      expect(people).toEqual(mockPeople);
      expect(people).toHaveLength(2);
    });

    it('should fetch people with organization filter', async () => {
      const filters: PersonFilters = {
        organization: ['Test Org']
      };

      await personService.getPeople(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Company',
              select: {
                equals: 'Test Org'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch people with email filter', async () => {
      const filters: PersonFilters = {
        email: 'john@test.com'
      };

      await personService.getPeople(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Email',
              email: {
                equals: 'john@test.com'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch people with mobile filter', async () => {
      const filters: PersonFilters = {
        mobile: '555-1234'
      };

      await personService.getPeople(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Mobile',
              phone_number: {
                equals: '555-1234'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch people with source filter', async () => {
      const filters: PersonFilters = {
        source: 'Conference'
      };

      await personService.getPeople(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Source',
              rich_text: {
                contains: 'Conference'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch people with search filter', async () => {
      const filters: PersonFilters = {
        search: 'john'
      };

      await personService.getPeople(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Email',
              email: {
                contains: 'john'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should fetch people with multiple filters combined', async () => {
      const filters: PersonFilters = {
        organization: ['Test Org'],
        email: 'john@test.com',
        source: 'Conference'
      };

      await personService.getPeople(filters);

      const expectedFilters = {
        and: [
          {
            property: 'Company',
            select: {
              equals: 'Test Org'
            }
          },
          {
            property: 'Email',
            email: {
              equals: 'john@test.com'
            }
          },
          {
            property: 'Source',
            rich_text: {
              contains: 'Conference'
            }
          }
        ]
      };

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: expectedFilters,
        sorts: []
      });
    });

    it('should fetch people with sort option', async () => {
      const sort: SortOption = {
        field: 'fullName',
        direction: 'asc',
        label: "Full Name"
      };

      await personService.getPeople(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Full Name',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should fetch people with descending sort', async () => {
      const sort: SortOption = {
        field: 'lastModified',
        direction: 'desc',
        label: "Last Modified"
      };

      await personService.getPeople(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
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

      const people = await personService.getPeople();

      expect(people).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {});

      consoleErrorSpy.mockRestore();
    });

  });

  describe('getPersonById', () => {
    it('should fetch a single person by ID', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([mockPeople[0]]);

      const person = await personService.getPersonById('person-1');

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('people');
      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {
          property: 'id',
          rich_text: {
            equals: 'person-1'
          }
        }
      });
      expect(person).toEqual(mockPeople[0]);
    });

    it('should return undefined when person is not found', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([]);

      const person = await personService.getPersonById('non-existent-id');

      expect(person).toBeUndefined();
    });

    it('should return first match when multiple people are returned', async () => {
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue(mockPeople);

      const person = await personService.getPersonById('person-1');

      expect(person).toEqual(mockPeople[0]);
    });

    it('should handle errors and return undefined', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));

      const person = await personService.getPersonById('person-1');

      expect(person).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getPeopleNeedingFollowUp', () => {
    it('should fetch people needing follow-up with default threshold', async () => {
      const today = new Date();
      const expectedThresholdDate = new Date();
      expectedThresholdDate.setDate(today.getDate() + 7);

      await personService.getPeopleNeedingFollowUp();

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('people');

      const callArgs = mockSmartDataService.fetchData.mock.calls[0][1];
      expect(callArgs.databaseId).toBe('mock-database-id');
      expect(callArgs.filters).toHaveProperty('property', 'Next Contact Date');
      expect(callArgs.filters).toHaveProperty('date');
      expect(callArgs.sorts).toEqual([
        {
          property: 'Next Contact Date',
          direction: 'ascending'
        }
      ]);
    });

    it('should fetch people needing follow-up with custom threshold', async () => {
      const today = new Date();
      const expectedThresholdDate = new Date();
      expectedThresholdDate.setDate(today.getDate() + 30);

      await personService.getPeopleNeedingFollowUp(30);

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('people');

      const callArgs = mockSmartDataService.fetchData.mock.calls[0][1];
      expect(callArgs.databaseId).toBe('mock-database-id');
      expect(callArgs.filters).toHaveProperty('property', 'Next Contact Date');
    });

    it('should handle errors and return fallback data', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConfigService.getDatabaseId = vi.fn().mockRejectedValue(new Error('Database error'));
      mockSmartDataService.fetchData = vi.fn().mockResolvedValue([]);

      const people = await personService.getPeopleNeedingFollowUp();

      expect(people).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle zero threshold', async () => {
      await personService.getPeopleNeedingFollowUp(0);

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('people');
      expect(mockSmartDataService.fetchData).toHaveBeenCalled();
    });

    it('should return people sorted by next contact date', async () => {
      const peopleWithDates = mockPeople.map((p, i) => ({
        ...p,
        nextContactDate: new Date(Date.now() + i * 86400000)
      }));

      mockSmartDataService.fetchData = vi.fn().mockResolvedValue(peopleWithDates);

      const result = await personService.getPeopleNeedingFollowUp(7);

      expect(result).toEqual(peopleWithDates);

      const callArgs = mockSmartDataService.fetchData.mock.calls[0][1];
      expect(callArgs.sorts).toEqual([
        {
          property: 'Next Contact Date',
          direction: 'ascending'
        }
      ]);
    });
  });

  describe('buildNotionFilters', () => {
    it('should build empty filter object when no filters provided', async () => {
      await personService.getPeople();

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle empty arrays in filters', async () => {
      const filters: PersonFilters = {
        organization: []
      };

      await personService.getPeople(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle only organization filter', async () => {
      const filters: PersonFilters = {
        organization: ['Acme Corp']
      };

      await personService.getPeople(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Company',
              select: {
                equals: 'Acme Corp'
              }
            }
          ]
        },
        sorts: []
      });
    });

    it('should handle empty string filters', async () => {
      const filters: PersonFilters = {
        email: '',
        mobile: '',
        source: '',
        search: ''
      };

      await personService.getPeople(filters);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });
  });

  describe('buildNotionSort', () => {
    it('should map fullName field to Full Name property', async () => {
      const sort: SortOption = {
        field: 'fullName',
        direction: 'asc',
        label: "Full Name"
      };

      await personService.getPeople(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Full Name',
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

      await personService.getPeople(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
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

      await personService.getPeople(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
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

      await personService.getPeople(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
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

    it('should map relationshipStrength field to Relationship Strength property', async () => {
      const sort: SortOption = {
        field: 'relationshipStrength',
        direction: 'desc',
        label: "Relationship Strength"
      };

      await personService.getPeople(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: [
          {
            property: 'Relationship Strength',
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

      await personService.getPeople(undefined, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
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
      await personService.getPeople(undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle null sort gracefully', async () => {
      await personService.getPeople(undefined, undefined);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {},
        sorts: []
      });
    });

    it('should handle both filters and sort together', async () => {
      const filters: PersonFilters = {
        organization: ['Test Org']
      };
      const sort: SortOption = {
        field: 'fullName',
        direction: 'asc',
        label: "Full Name"
      };

      await personService.getPeople(filters, sort);

      expect(mockSmartDataService.fetchData).toHaveBeenCalledWith('people', {
        databaseId: 'mock-database-id',
        filters: {
          and: [
            {
              property: 'Company',
              select: {
                equals: 'Test Org'
              }
            }
          ]
        },
        sorts: [
          {
            property: 'Full Name',
            direction: 'ascending'
          }
        ]
      });
    });

    it('should handle concurrent requests', async () => {
      const promise1 = personService.getPeople();
      const promise2 = personService.getPeople();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockPeople);
      expect(result2).toEqual(mockPeople);
      expect(mockConfigService.getDatabaseId).toHaveBeenCalledTimes(2);
    });

    it('should handle negative threshold for getPeopleNeedingFollowUp', async () => {
      await personService.getPeopleNeedingFollowUp(-7);

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('people');
      expect(mockSmartDataService.fetchData).toHaveBeenCalled();
    });

    it('should handle large threshold for getPeopleNeedingFollowUp', async () => {
      await personService.getPeopleNeedingFollowUp(365);

      expect(mockConfigService.getDatabaseId).toHaveBeenCalledWith('people');
      expect(mockSmartDataService.fetchData).toHaveBeenCalled();
    });
  });
});
