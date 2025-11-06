// Tests for ConfigService

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConfigService, { AppConfig, HealthStatus } from '../configService';
import { apiService } from '../api';
import { API_ENDPOINTS } from '../../constants';

// Mock the api service
vi.mock('../api');

describe('ConfigService', () => {
  let configService: ConfigService;
  const mockApiService = vi.mocked(apiService);

  const mockConfig: AppConfig = {
    databases: {
      projects: 'db-projects-123',
      opportunities: 'db-opportunities-456',
      organizations: 'db-organizations-789',
      people: 'db-people-012',
      artifacts: 'db-artifacts-345'
    },
    status: {
      notion_configured: true,
      projects_available: true,
      opportunities_available: true,
      organizations_available: true,
      people_available: true,
      artifacts_available: true
    }
  };

  const mockHealthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: '2023-01-01T00:00:00.000Z',
    version: '1.0.0',
    environment: 'production',
    notion_token: 'configured',
    notion_database: 'configured'
  };

  beforeEach(() => {
    // Create a fresh instance for each test
    configService = new ConfigService();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementation
    mockApiService.get = vi.fn() as typeof mockApiService.get;
  });

  afterEach(() => {
    // Clear cache after each test
    configService.clearCache();
  });

  describe('getConfig', () => {
    it('should fetch and return configuration from backend', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      const config = await configService.getConfig();

      expect(mockApiService.get).toHaveBeenCalledWith(API_ENDPOINTS.CONFIG);
      expect(config).toEqual(mockConfig);
      expect(config.databases.projects).toBe('db-projects-123');
      expect(config.status.notion_configured).toBe(true);
    });

    it('should cache configuration after first fetch', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      // First call
      const config1 = await configService.getConfig();

      // Second call should use cache
      const config2 = await configService.getConfig();

      expect(mockApiService.get).toHaveBeenCalledTimes(1);
      expect(config1).toEqual(config2);
    });

    it('should reuse pending promise when multiple requests are made simultaneously', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      // Make multiple simultaneous requests
      const [config1, config2, config3] = await Promise.all([
        configService.getConfig(),
        configService.getConfig(),
        configService.getConfig()
      ]);

      // Should only call API once
      expect(mockApiService.get).toHaveBeenCalledTimes(1);
      expect(config1).toEqual(config2);
      expect(config2).toEqual(config3);
    });

    it('should throw error when backend request fails in production', async () => {
      // Mock production environment
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = false;

      mockApiService.get = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(configService.getConfig()).rejects.toThrow();

      // Restore environment
      import.meta.env.DEV = originalEnv;
    });

    it('should provide fallback configuration in development when API fails', async () => {
      // Mock development environment
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      mockApiService.get = vi.fn().mockRejectedValue(new Error('Network error'));

      const config = await configService.getConfig();

      expect(config).toEqual({
        databases: {
          projects: '',
          opportunities: '',
          organizations: '',
          people: '',
          artifacts: ''
        },
        status: {
          notion_configured: false,
          projects_available: false,
          opportunities_available: false,
          organizations_available: false,
          people_available: false,
          artifacts_available: false
        }
      });

      // Restore environment
      import.meta.env.DEV = originalEnv;
    });

    it('should allow retry after failed fetch', async () => {
      mockApiService.get = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockConfig);

      // Mock development to use fallback
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      // First call fails and returns fallback
      const config1 = await configService.getConfig();
      expect(config1.databases.projects).toBe('');

      // Clear cache to allow retry
      configService.clearCache();

      // Second call succeeds
      const config2 = await configService.getConfig();
      expect(config2).toEqual(mockConfig);

      import.meta.env.DEV = originalEnv;
    });
  });

  describe('refreshConfig', () => {
    it('should clear cache and fetch fresh configuration', async () => {
      mockApiService.get = vi.fn()
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce({
          ...mockConfig,
          databases: { ...mockConfig.databases, projects: 'db-projects-new' }
        });

      // First call
      const config1 = await configService.getConfig();
      expect(config1.databases.projects).toBe('db-projects-123');

      // Refresh config
      const config2 = await configService.refreshConfig();
      expect(config2.databases.projects).toBe('db-projects-new');

      // Should have called API twice
      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during refresh', async () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = false;

      mockApiService.get = vi.fn().mockRejectedValue(new Error('API Error'));

      await expect(configService.refreshConfig()).rejects.toThrow('API Error');

      import.meta.env.DEV = originalEnv;
    });
  });

  describe('getDatabaseId', () => {
    it('should return database ID for projects', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      const databaseId = await configService.getDatabaseId('projects');

      expect(databaseId).toBe('db-projects-123');
    });

    it('should return database ID for opportunities', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      const databaseId = await configService.getDatabaseId('opportunities');

      expect(databaseId).toBe('db-opportunities-456');
    });

    it('should return database ID for organizations', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      const databaseId = await configService.getDatabaseId('organizations');

      expect(databaseId).toBe('db-organizations-789');
    });

    it('should return database ID for people', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      const databaseId = await configService.getDatabaseId('people');

      expect(databaseId).toBe('db-people-012');
    });

    it('should return database ID for artifacts', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      const databaseId = await configService.getDatabaseId('artifacts');

      expect(databaseId).toBe('db-artifacts-345');
    });

    it('should throw error when database ID is not configured', async () => {
      const incompleteConfig = {
        ...mockConfig,
        databases: { ...mockConfig.databases, projects: '' }
      };

      mockApiService.get = vi.fn().mockResolvedValue(incompleteConfig);

      await expect(configService.getDatabaseId('projects'))
        .rejects.toThrow('Database ID for "projects" is not configured in the backend');
    });

    it('should use cached config for database ID retrieval', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      // First call
      await configService.getDatabaseId('projects');

      // Second call should use cache
      await configService.getDatabaseId('opportunities');

      expect(mockApiService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('isDatabaseAvailable', () => {
    it('should return true when database is available', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      const isAvailable = await configService.isDatabaseAvailable('projects');

      expect(isAvailable).toBe(true);
    });

    it('should return false when database is not available', async () => {
      const unavailableConfig = {
        ...mockConfig,
        status: { ...mockConfig.status, projects_available: false }
      };

      mockApiService.get = vi.fn().mockResolvedValue(unavailableConfig);

      const isAvailable = await configService.isDatabaseAvailable('projects');

      expect(isAvailable).toBe(false);
    });

    it('should handle all database types', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      const projectsAvailable = await configService.isDatabaseAvailable('projects');
      const opportunitiesAvailable = await configService.isDatabaseAvailable('opportunities');
      const organizationsAvailable = await configService.isDatabaseAvailable('organizations');
      const peopleAvailable = await configService.isDatabaseAvailable('people');
      const artifactsAvailable = await configService.isDatabaseAvailable('artifacts');

      expect(projectsAvailable).toBe(true);
      expect(opportunitiesAvailable).toBe(true);
      expect(organizationsAvailable).toBe(true);
      expect(peopleAvailable).toBe(true);
      expect(artifactsAvailable).toBe(true);

      // Should only call API once due to caching
      expect(mockApiService.get).toHaveBeenCalledTimes(1);
    });

    it('should return false for undefined availability status', async () => {
      const incompleteConfig = {
        databases: mockConfig.databases,
        status: {
          notion_configured: true,
          projects_available: true,
          opportunities_available: true,
          organizations_available: true,
          people_available: true,
          // artifacts_available is missing
        }
      } as AppConfig;

      mockApiService.get = vi.fn().mockResolvedValue(incompleteConfig);

      const isAvailable = await configService.isDatabaseAvailable('artifacts');

      expect(isAvailable).toBe(false);
    });
  });

  describe('isNotionConfigured', () => {
    it('should return true when Notion is configured', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      const isConfigured = await configService.isNotionConfigured();

      expect(isConfigured).toBe(true);
    });

    it('should return false when Notion is not configured', async () => {
      const notConfigured = {
        ...mockConfig,
        status: { ...mockConfig.status, notion_configured: false }
      };

      mockApiService.get = vi.fn().mockResolvedValue(notConfigured);

      const isConfigured = await configService.isNotionConfigured();

      expect(isConfigured).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should fetch and return health status', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockHealthStatus);

      const health = await configService.getHealthStatus();

      expect(mockApiService.get).toHaveBeenCalledWith(API_ENDPOINTS.HEALTH);
      expect(health).toEqual(mockHealthStatus);
      expect(health.status).toBe('healthy');
      expect(health.version).toBe('1.0.0');
    });

    it('should throw error when health check fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApiService.get = vi.fn().mockRejectedValue(new Error('Health check failed'));

      await expect(configService.getHealthStatus())
        .rejects.toThrow('Health check failed');

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should not cache health status (fresh check each time)', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockHealthStatus);

      // First call
      await configService.getHealthStatus();

      // Second call should hit API again (not cached)
      await configService.getHealthStatus();

      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearCache', () => {
    it('should clear cached configuration', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      // First call - fetch from API
      await configService.getConfig();
      expect(mockApiService.get).toHaveBeenCalledTimes(1);

      // Clear cache
      configService.clearCache();

      // Second call - should fetch from API again
      await configService.getConfig();
      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });

    it('should clear pending promise', async () => {
      mockApiService.get = vi.fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockConfig), 100)));

      // Start a request (don't await)
      const promise1 = configService.getConfig();

      // Clear cache while request is pending
      configService.clearCache();

      // Start another request
      const promise2 = configService.getConfig();

      // Wait for both
      await Promise.all([promise1, promise2]);

      // Should have made 2 separate API calls
      expect(mockApiService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle partial config responses', async () => {
      const partialConfig = {
        databases: {
          projects: 'db-123',
          opportunities: '',
          organizations: '',
          people: '',
          artifacts: ''
        },
        status: {
          notion_configured: true,
          projects_available: true,
          opportunities_available: false,
          organizations_available: false,
          people_available: false,
          artifacts_available: false
        }
      };

      mockApiService.get = vi.fn().mockResolvedValue(partialConfig);

      const config = await configService.getConfig();

      expect(config.databases.projects).toBe('db-123');
      expect(config.databases.opportunities).toBe('');
      expect(config.status.projects_available).toBe(true);
      expect(config.status.opportunities_available).toBe(false);
    });

    it('should handle malformed config responses gracefully', async () => {
      const malformedConfig = {
        databases: null,
        status: null
      };

      mockApiService.get = vi.fn().mockResolvedValue(malformedConfig);

      const config = await configService.getConfig();

      // Should still return the response even if structure is unexpected
      expect(config).toEqual(malformedConfig);
    });

    it('should handle network timeout errors', async () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      mockApiService.get = vi.fn().mockRejectedValue(new Error('Request timeout'));

      const config = await configService.getConfig();

      // Should return fallback config in development
      expect(config.status.notion_configured).toBe(false);

      import.meta.env.DEV = originalEnv;
    });

    it('should handle concurrent refresh calls', async () => {
      mockApiService.get = vi.fn()
        .mockResolvedValue(mockConfig);

      // Make concurrent refresh calls
      const [config1, config2] = await Promise.all([
        configService.refreshConfig(),
        configService.refreshConfig()
      ]);

      // Both should succeed and return same config
      expect(config1).toEqual(mockConfig);
      expect(config2).toEqual(mockConfig);
    });

    it('should handle API returning undefined', async () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      mockApiService.get = vi.fn().mockRejectedValue(new Error('API returned undefined'));

      const config = await configService.getConfig();

      // Should return fallback config in development
      expect(config.databases).toBeDefined();
      expect(config.status).toBeDefined();
      expect(config.status.notion_configured).toBe(false);

      import.meta.env.DEV = originalEnv;
    });

    it('should handle empty database IDs for all database types', async () => {
      const emptyConfig = {
        databases: {
          projects: '',
          opportunities: '',
          organizations: '',
          people: '',
          artifacts: ''
        },
        status: mockConfig.status
      };

      mockApiService.get = vi.fn().mockResolvedValue(emptyConfig);

      await expect(configService.getDatabaseId('projects')).rejects.toThrow();
      await expect(configService.getDatabaseId('opportunities')).rejects.toThrow();
      await expect(configService.getDatabaseId('organizations')).rejects.toThrow();
      await expect(configService.getDatabaseId('people')).rejects.toThrow();
      await expect(configService.getDatabaseId('artifacts')).rejects.toThrow();
    });

    it('should handle rapid successive getConfig calls', async () => {
      mockApiService.get = vi.fn().mockResolvedValue(mockConfig);

      // Make many rapid calls
      const promises = Array.from({ length: 10 }, () => configService.getConfig());
      const results = await Promise.all(promises);

      // Should only call API once due to promise caching
      expect(mockApiService.get).toHaveBeenCalledTimes(1);
      // All results should be identical
      results.forEach(result => expect(result).toEqual(mockConfig));
    });

    it('should recover after failed request followed by successful one', async () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      mockApiService.get = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce(mockConfig);

      // First call fails
      const config1 = await configService.getConfig();
      expect(config1.status.notion_configured).toBe(false);

      // Clear cache to allow retry
      configService.clearCache();

      // Second call succeeds
      const config2 = await configService.getConfig();
      expect(config2).toEqual(mockConfig);
      expect(config2.status.notion_configured).toBe(true);

      import.meta.env.DEV = originalEnv;
    });

    it('should handle different error types', async () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      const errorTypes = [
        new Error('Network error'),
        new TypeError('Type error'),
        new RangeError('Range error'),
        { message: 'Custom error object' }
      ];

      for (const error of errorTypes) {
        mockApiService.get = vi.fn().mockRejectedValue(error);
        configService.clearCache();

        const config = await configService.getConfig();
        expect(config.status.notion_configured).toBe(false);
      }

      import.meta.env.DEV = originalEnv;
    });

    it('should handle health status with missing fields', async () => {
      const incompleteHealth = {
        status: 'healthy',
        timestamp: '2023-01-01T00:00:00.000Z'
        // Missing version, environment, etc.
      };

      mockApiService.get = vi.fn().mockResolvedValue(incompleteHealth);

      const health = await configService.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBe('2023-01-01T00:00:00.000Z');
      expect(health.version).toBeUndefined();
    });

    it('should handle unhealthy status in health check', async () => {
      const unhealthyStatus = {
        ...mockHealthStatus,
        status: 'unhealthy',
        notion_token: 'not_configured',
        notion_database: 'not_configured'
      };

      mockApiService.get = vi.fn().mockResolvedValue(unhealthyStatus);

      const health = await configService.getHealthStatus();

      expect(health.status).toBe('unhealthy');
      expect(health.notion_token).toBe('not_configured');
      expect(health.notion_database).toBe('not_configured');
    });

    it('should maintain separate cache for config and health', async () => {
      mockApiService.get = vi.fn()
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce(mockHealthStatus)
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce(mockHealthStatus);

      // Get config (cached)
      await configService.getConfig();
      await configService.getConfig();

      // Get health (not cached)
      await configService.getHealthStatus();
      await configService.getHealthStatus();

      // Config called once (cached), health called twice (not cached)
      const configCalls = mockApiService.get.mock.calls.filter(
        call => call[0] === API_ENDPOINTS.CONFIG
      );
      const healthCalls = mockApiService.get.mock.calls.filter(
        call => call[0] === API_ENDPOINTS.HEALTH
      );

      expect(configCalls).toHaveLength(1);
      expect(healthCalls).toHaveLength(2);
    });
  });
});
