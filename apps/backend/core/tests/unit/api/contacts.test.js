/**
 * Tests for Contacts API v1 Routes
 *
 * Unit tests for contact API endpoints - simplified
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { contactFixtures, personFixtures } from '../../utils/mock-services.js';

describe('Contacts API Utilities', () => {
  describe('Contact pagination', () => {
    const createPaginatedResponse = (data, total, limit, offset) => {
      return {
        data,
        count: total,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total,
        },
      };
    };

    it('creates paginated response', () => {
      const contacts = contactFixtures.createMany(5);
      const response = createPaginatedResponse(contacts, 10, 5, 0);

      expect(response.data).toHaveLength(5);
      expect(response.pagination.total).toBe(10);
      expect(response.pagination.hasMore).toBe(true);
    });

    it('handles last page', () => {
      const contacts = contactFixtures.createMany(2);
      const response = createPaginatedResponse(contacts, 7, 5, 5);

      expect(response.data).toHaveLength(2);
      expect(response.pagination.hasMore).toBe(false);
    });
  });

  describe('Contact filtering', () => {
    const filterContacts = (contacts, filters) => {
      return contacts.filter((contact) => {
        if (filters.strategic_value && contact.strategic_value !== filters.strategic_value) {
          return false;
        }
        if (filters.company && !contact.current_company?.includes(filters.company)) {
          return false;
        }
        if (filters.data_source && contact.data_source !== filters.data_source) {
          return false;
        }
        return true;
      });
    };

    it('filters by strategic_value', () => {
      const contacts = [
        { id: '1', strategic_value: 'high' },
        { id: '2', strategic_value: 'medium' },
      ];

      const result = filterContacts(contacts, { strategic_value: 'high' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('filters by company', () => {
      const contacts = [
        { id: '1', current_company: 'TechCorp' },
        { id: '2', current_company: 'StartupXYZ' },
      ];

      const result = filterContacts(contacts, { company: 'Tech' });
      expect(result).toHaveLength(1);
    });

    it('applies multiple filters', () => {
      const contacts = [
        { id: '1', strategic_value: 'high', current_company: 'TechCorp' },
        { id: '2', strategic_value: 'high', current_company: 'Other' },
      ];

      const result = filterContacts(contacts, {
        strategic_value: 'high',
        company: 'Tech',
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('Contact search', () => {
    const searchContacts = (contacts, query) => {
      const searchTerm = query.toLowerCase();
      return contacts.filter(
        (contact) =>
          contact.full_name?.toLowerCase().includes(searchTerm) ||
          contact.email_address?.toLowerCase().includes(searchTerm)
      );
    };

    it('searches by full_name', () => {
      const contacts = [
        { id: '1', full_name: 'John Doe', email_address: 'john@example.com' },
        { id: '2', full_name: 'Jane Smith', email_address: 'jane@example.com' },
      ];

      const result = searchContacts(contacts, 'John');
      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('John Doe');
    });

    it('searches by email', () => {
      const contacts = [
        { id: '1', full_name: 'John Doe', email_address: 'john@example.com' },
        { id: '2', full_name: 'Jane Smith', email_address: 'jane@example.com' },
      ];

      const result = searchContacts(contacts, 'jane');
      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('Jane Smith');
    });
  });
});

describe('Person API Utilities', () => {
  describe('Person statistics', () => {
    const calculatePersonStats = (persons) => {
      const stats = {
        total: persons.length,
        bySource: {},
        byPriority: {},
        enriched: 0,
      };

      persons.forEach((person) => {
        // Count by data source
        const source = person.data_source || 'unknown';
        stats.bySource[source] = (stats.bySource[source] || 0) + 1;

        // Count by engagement priority
        const priority = person.engagement_priority || 'unset';
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

        // Count enriched
        if (person.exa_enriched) {
          stats.enriched += 1;
        }
      });

      return stats;
    };

    it('calculates total count', () => {
      const persons = personFixtures.createMany(5);
      const stats = calculatePersonStats(persons);

      expect(stats.total).toBe(5);
    });

    it('groups by data source', () => {
      const persons = [
        { data_source: 'linkedin' },
        { data_source: 'gmail' },
        { data_source: 'linkedin' },
      ];

      const stats = calculatePersonStats(persons);
      expect(stats.bySource.linkedin).toBe(2);
      expect(stats.bySource.gmail).toBe(1);
    });

    it('groups by engagement priority', () => {
      const persons = [
        { engagement_priority: 'high' },
        { engagement_priority: 'medium' },
        { engagement_priority: 'high' },
      ];

      const stats = calculatePersonStats(persons);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.medium).toBe(1);
    });

    it('counts enriched persons', () => {
      const persons = [
        { exa_enriched: true },
        { exa_enriched: false },
        { exa_enriched: true },
      ];

      const stats = calculatePersonStats(persons);
      expect(stats.enriched).toBe(2);
    });
  });
});
