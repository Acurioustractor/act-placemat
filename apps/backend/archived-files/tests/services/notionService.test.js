/**
 * Notion Service tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import notionService from '../../src/services/notionService.js';

describe('NotionService', () => {
  beforeEach(() => {
    // Clear cache before each test
    notionService.clearCache();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Data Extraction Methods', () => {
    it('should extract plain text from rich text array', () => {
      const richText = [
        { plain_text: 'Hello ' },
        { plain_text: 'World' }
      ];
      
      const result = notionService.extractPlainText(richText);
      expect(result).toBe('Hello World');
    });

    it('should handle empty rich text array', () => {
      const result = notionService.extractPlainText([]);
      expect(result).toBe('');
    });

    it('should handle null/undefined rich text', () => {
      expect(notionService.extractPlainText(null)).toBe('');
      expect(notionService.extractPlainText(undefined)).toBe('');
    });

    it('should extract title from title array', () => {
      const title = [
        { plain_text: 'Test Title' }
      ];
      
      const result = notionService.extractTitle(title);
      expect(result).toBe('Test Title');
    });

    it('should extract select value', () => {
      const select = { name: 'Active' };
      const result = notionService.extractSelect(select);
      expect(result).toBe('Active');
    });

    it('should handle null select', () => {
      const result = notionService.extractSelect(null);
      expect(result).toBe('');
    });

    it('should extract multi-select values', () => {
      const multiSelect = [
        { name: 'Tag1' },
        { name: 'Tag2' }
      ];
      
      const result = notionService.extractMultiSelect(multiSelect);
      expect(result).toEqual([{ name: 'Tag1' }, { name: 'Tag2' }]);
    });

    it('should extract number value', () => {
      expect(notionService.extractNumber(42)).toBe(42);
      expect(notionService.extractNumber(null)).toBe(0);
    });

    it('should extract date value', () => {
      const date = { start: '2024-01-15' };
      expect(notionService.extractDate(date)).toBe('2024-01-15');
      expect(notionService.extractDate(null)).toBe(null);
    });

    it('should extract checkbox value', () => {
      expect(notionService.extractCheckbox(true)).toBe(true);
      expect(notionService.extractCheckbox(false)).toBe(false);
      expect(notionService.extractCheckbox(null)).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should generate consistent cache keys', () => {
      const key1 = notionService.getCacheKey('partners', { status: 'active' });
      const key2 = notionService.getCacheKey('partners', { status: 'active' });
      expect(key1).toBe(key2);
    });

    it('should set and get cache data', () => {
      const testData = { id: 'test', name: 'Test Data' };
      const cacheKey = 'test-key';
      
      notionService.setCache(cacheKey, testData);
      expect(notionService.isCacheValid(cacheKey)).toBe(true);
      expect(notionService.getCache(cacheKey)).toEqual(testData);
    });

    it('should invalidate expired cache', (done) => {
      const testData = { id: 'test' };
      const cacheKey = 'test-key';
      
      // Temporarily reduce cache timeout for testing
      const originalTimeout = notionService.cacheTimeout;
      notionService.cacheTimeout = 10; // 10ms
      
      notionService.setCache(cacheKey, testData);
      expect(notionService.isCacheValid(cacheKey)).toBe(true);
      
      setTimeout(() => {
        expect(notionService.isCacheValid(cacheKey)).toBe(false);
        notionService.cacheTimeout = originalTimeout; // Restore
        done();
      }, 20);
    });

    it('should clear cache by pattern', () => {
      notionService.setCache('partners_all', { data: 'partners' });
      notionService.setCache('projects_all', { data: 'projects' });
      notionService.setCache('other_data', { data: 'other' });
      
      notionService.clearCache('partners');
      
      expect(notionService.isCacheValid('partners_all')).toBe(false);
      expect(notionService.isCacheValid('projects_all')).toBe(true);
      expect(notionService.isCacheValid('other_data')).toBe(true);
    });
  });

  describe('Partners Service', () => {
    it('should return fallback partners when Notion fails', async () => {
      // Mock the global MCP function to throw an error
      global.mcp__notion__query_notion_database = vi.fn().mockRejectedValue(new Error('Notion unavailable'));
      
      const partners = await notionService.getPartners();
      
      expect(Array.isArray(partners)).toBe(true);
      expect(partners.length).toBeGreaterThan(0);
      expect(partners[0]).toHaveProperty('name');
      expect(partners[0]).toHaveProperty('type');
    });

    it('should format Notion partner data correctly', async () => {
      const mockNotionData = {
        results: [
          {
            id: 'partner-1',
            properties: {
              Name: { title: [{ plain_text: 'Test Partner' }] },
              Type: { select: { name: 'Community' } },
              Category: { select: { name: 'Indigenous-led' } },
              Description: { rich_text: [{ plain_text: 'Test description' }] },
              Featured: { checkbox: true },
              'Logo URL': { url: 'https://example.com/logo.png' },
              Location: { rich_text: [{ plain_text: 'Australia' }] }
            }
          }
        ]
      };

      global.mcp__notion__query_notion_database = vi.fn().mockResolvedValue(mockNotionData);
      
      const partners = await notionService.getPartners();
      
      expect(partners).toHaveLength(1);
      expect(partners[0]).toEqual({
        id: 'partner-1',
        name: 'Test Partner',
        type: 'Community',
        category: 'Indigenous-led',
        description: 'Test description',
        contributionType: '',
        relationshipStrength: '',
        collaborationFocus: [],
        impactStory: '',
        featured: true,
        logoUrl: 'https://example.com/logo.png',
        location: 'Australia',
        establishedDate: null
      });
    });

    it('should use cache when available', async () => {
      const mockData = [{ id: 'cached-partner', name: 'Cached Partner' }];
      notionService.setCache('partners_{}', mockData);
      
      const partners = await notionService.getPartners(true);
      expect(partners).toEqual(mockData);
      
      // Verify MCP function was not called
      expect(global.mcp__notion__query_notion_database).not.toHaveBeenCalled();
    });
  });

  describe('Projects Service', () => {
    it('should return fallback projects when Notion fails', async () => {
      global.mcp__notion__query_notion_database = vi.fn().mockRejectedValue(new Error('Notion unavailable'));
      
      const projects = await notionService.getProjects();
      
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
      expect(projects[0]).toHaveProperty('name');
      expect(projects[0]).toHaveProperty('status');
    });

    it('should format Notion project data correctly', async () => {
      const mockNotionData = {
        results: [
          {
            id: 'project-1',
            properties: {
              Name: { title: [{ plain_text: 'Test Project' }] },
              Description: { rich_text: [{ plain_text: 'Test project description' }] },
              Status: { select: { name: 'Active' } },
              Area: { select: { name: 'Technology' } },
              Budget: { number: 50000 },
              Featured: { checkbox: true }
            }
          }
        ]
      };

      global.mcp__notion__query_notion_database = vi.fn().mockResolvedValue(mockNotionData);
      
      const projects = await notionService.getProjects();
      
      expect(projects).toHaveLength(1);
      expect(projects[0]).toEqual({
        id: 'project-1',
        name: 'Test Project',
        description: 'Test project description',
        status: 'Active',
        area: 'Technology',
        lead: '',
        funding: '',
        startDate: null,
        endDate: null,
        budget: 50000,
        tags: [],
        featured: true
      });
    });
  });

  describe('Health Check', () => {
    it('should report healthy status when all databases are accessible', async () => {
      // Mock successful responses for all database calls
      global.mcp__notion__query_notion_database = vi.fn().mockResolvedValue({
        results: [{ id: 'test' }]
      });

      const health = await notionService.healthCheck();
      
      expect(health.overall).toBe('healthy');
      expect(health.configured).toBeGreaterThan(0);
      expect(health.accessible).toBeGreaterThan(0);
    });

    it('should report degraded status when some databases fail', async () => {
      // Mock mixed success/failure responses
      global.mcp__notion__query_notion_database = vi.fn()
        .mockResolvedValueOnce({ results: [{ id: 'test' }] }) // First call succeeds
        .mockRejectedValue(new Error('Database unavailable')); // Subsequent calls fail

      const health = await notionService.healthCheck();
      
      expect(health.overall).toBe('degraded');
      expect(health.databases).toBeDefined();
    });

    it('should report unhealthy status when no databases are accessible', async () => {
      // Mock all calls to fail
      global.mcp__notion__query_notion_database = vi.fn().mockRejectedValue(new Error('All databases unavailable'));

      const health = await notionService.healthCheck();
      
      expect(health.overall).toBe('unhealthy');
      expect(health.accessible).toBe(0);
    });
  });

  describe('Search Functionality', () => {
    it('should handle search errors gracefully', async () => {
      global.mcp__notion__search_notion = vi.fn().mockRejectedValue(new Error('Search unavailable'));
      
      const results = await notionService.searchAll('test query');
      
      expect(results).toEqual({
        partners: [],
        projects: [],
        opportunities: [],
        organizations: [],
        total: 0,
        error: 'Search unavailable'
      });
    });

    it('should categorize search results correctly', async () => {
      const mockSearchResults = {
        results: [
          {
            id: 'result-1',
            parent: { database_id: process.env.NOTION_PARTNERS_DATABASE_ID },
            properties: {
              Name: { title: [{ plain_text: 'Search Result 1' }] }
            }
          }
        ]
      };

      global.mcp__notion__search_notion = vi.fn().mockResolvedValue(mockSearchResults);
      
      const results = await notionService.searchAll('test');
      
      expect(results.total).toBe(1);
      expect(results.partners).toHaveLength(1);
      expect(results.partners[0]).toEqual({
        id: 'result-1',
        name: 'Search Result 1',
        type: 'partner'
      });
    });
  });
});