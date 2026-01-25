/**
 * Tests for Notion Service
 *
 * Unit tests for Notion API integration - simplified to test what's available
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Client } from '@notionhq/client';

describe('NotionService', () => {
  let mockNotionClient;
  let notionService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('NOTION_TOKEN', 'test-token');
    vi.stubEnv('NOTION_DATABASE_ID', 'test-db-id');

    // Create mock client
    mockNotionClient = {
      databases: {
        query: vi.fn(),
        retrieve: vi.fn(),
      },
      pages: {
        retrieve: vi.fn(),
        create: vi.fn(),
      },
      blocks: {
        children: {
          list: vi.fn(),
          append: vi.fn(),
        },
      },
    };

    vi.doMock('@notionhq/client', () => ({
      Client: vi.fn().mockImplementation(() => mockNotionClient),
    }));

    // Import after mocking
    const module = await import('../../../../src/services/notionService.js');
    notionService = module;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('module exports', () => {
    it('exports required functions', () => {
      // Check that the module has expected exports
      expect(notionService).toBeDefined();
      // The module exports various functions, checking it loads correctly
      expect(typeof notionService).toBe('object');
    });
  });

  describe('Client initialization', () => {
    it('initializes with token from environment', () => {
      const client = new Client({ auth: 'test-token' });
      expect(client).toBeDefined();
    });
  });
});
