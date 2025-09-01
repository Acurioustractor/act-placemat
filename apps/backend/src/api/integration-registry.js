/**
 * ACT Platform - Integration Registry API
 *
 * Provides API endpoints for querying and managing the integration registry.
 * Useful for monitoring, debugging, and documentation generation.
 */

import express from 'express';
import { integrationRegistry } from '../integrations/registry.js';

const router = express.Router();

/**
 * GET /api/integration-registry
 * Get overview of all registered integrations
 */
router.get('/', async (req, res) => {
  try {
    const stats = integrationRegistry.getStats();
    const integrations = integrationRegistry.exportForDocumentation();

    res.json({
      success: true,
      data: {
        stats,
        integrations: integrations.map(integration => ({
          key: integration.key,
          name: integration.name,
          type: integration.type,
          status: integration.status,
          owner: integration.owner,
          dataFlow: integration.dataFlow,
          lastHealthCheck: integration.lastHealthCheck,
        })),
      },
    });
  } catch (error) {
    console.error('Integration registry overview failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration registry overview',
    });
  }
});

/**
 * GET /api/integration-registry/stats
 * Get detailed statistics about the integration registry
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = integrationRegistry.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Integration registry stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration registry stats',
    });
  }
});

/**
 * GET /api/integration-registry/:key
 * Get detailed information about a specific integration
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const integration = integrationRegistry.get(key);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: `Integration '${key}' not found`,
      });
    }

    // Get connection info and events if available
    const connectionInfo = integration.connector?.getConnectionInfo?.() || null;
    const events = integration.connector?.getEvents?.() || [];
    const lastError = integration.connector?.getLastError?.() || null;

    res.json({
      success: true,
      data: {
        key,
        ...integration,
        connectionInfo,
        recentEvents: events.slice(-10), // Last 10 events
        lastError,
      },
    });
  } catch (error) {
    console.error(`Integration registry get '${req.params.key}' failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration details',
    });
  }
});

/**
 * GET /api/integration-registry/type/:type
 * Get all integrations of a specific type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const integrations = integrationRegistry.getByType(type);

    res.json({
      success: true,
      data: {
        type,
        count: integrations.length,
        integrations: integrations.map(integration => ({
          name: integration.name,
          status: integration.status,
          owner: integration.owner,
          dataFlow: integration.dataFlow,
          lastHealthCheck: integration.lastHealthCheck,
        })),
      },
    });
  } catch (error) {
    console.error(`Integration registry get type '${req.params.type}' failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integrations by type',
    });
  }
});

/**
 * GET /api/integration-registry/owner/:owner
 * Get all integrations owned by a specific team/person
 */
router.get('/owner/:owner', async (req, res) => {
  try {
    const { owner } = req.params;
    const allIntegrations = integrationRegistry.exportForDocumentation();
    const ownerIntegrations = allIntegrations.filter(integration =>
      integration.owner.toLowerCase().includes(owner.toLowerCase())
    );

    res.json({
      success: true,
      data: {
        owner,
        count: ownerIntegrations.length,
        integrations: ownerIntegrations,
      },
    });
  } catch (error) {
    console.error(
      `Integration registry get owner '${req.params.owner}' failed:`,
      error
    );
    res.status(500).json({
      success: false,
      error: 'Failed to get integrations by owner',
    });
  }
});

/**
 * POST /api/integration-registry/health-check
 * Run health checks for all integrations
 */
router.post('/health-check', async (req, res) => {
  try {
    const results = await integrationRegistry.runHealthChecks();
    const stats = integrationRegistry.getStats();

    res.json({
      success: true,
      data: {
        healthCheckResults: Object.fromEntries(results),
        stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Integration registry health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run integration health checks',
    });
  }
});

/**
 * POST /api/integration-registry/:key/health-check
 * Run health check for a specific integration
 */
router.post('/:key/health-check', async (req, res) => {
  try {
    const { key } = req.params;
    const integration = integrationRegistry.get(key);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: `Integration '${key}' not found`,
      });
    }

    if (!integration.connector?.performHealthCheck) {
      return res.status(400).json({
        success: false,
        error: `Integration '${key}' does not support health checks`,
      });
    }

    const isHealthy = await integration.connector.performHealthCheck();
    const connectionInfo = integration.connector.getConnectionInfo?.() || null;

    res.json({
      success: true,
      data: {
        key,
        healthy: isHealthy,
        status: integration.status,
        connectionInfo,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`Integration health check for '${req.params.key}' failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to run integration health check',
    });
  }
});

/**
 * GET /api/integration-registry/export/documentation
 * Export registry data for documentation generation
 */
router.get('/export/documentation', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const data = integrationRegistry.exportForDocumentation();

    if (format === 'json') {
      res.json({
        success: true,
        data,
        exportedAt: new Date().toISOString(),
      });
    } else if (format === 'markdown') {
      // Generate markdown documentation
      let markdown = '# ACT Platform - Integration Registry\n\n';
      markdown += `Generated on: ${new Date().toISOString()}\n\n`;

      const stats = integrationRegistry.getStats();
      markdown += `## Overview\n\n`;
      markdown += `- **Total Integrations**: ${stats.total}\n`;
      markdown += `- **Active**: ${stats.healthy}\n`;
      markdown += `- **Unhealthy**: ${stats.unhealthy}\n\n`;

      markdown += `## Integrations by Type\n\n`;
      Object.entries(stats.byType).forEach(([type, count]) => {
        markdown += `- **${type}**: ${count}\n`;
      });

      markdown += `\n## Integration Details\n\n`;
      data.forEach(integration => {
        markdown += `### ${integration.name}\n\n`;
        markdown += `- **Type**: ${integration.type}\n`;
        markdown += `- **Status**: ${integration.status}\n`;
        markdown += `- **Owner**: ${integration.owner}\n`;
        markdown += `- **Data Flow**: ${integration.dataFlow}\n`;
        markdown += `- **Description**: ${integration.description}\n`;
        if (integration.documentationUrl) {
          markdown += `- **Documentation**: ${integration.documentationUrl}\n`;
        }
        if (integration.rateLimits) {
          markdown += `- **Rate Limits**: ${JSON.stringify(integration.rateLimits)}\n`;
        }
        markdown += '\n';
      });

      res.set('Content-Type', 'text/markdown');
      res.send(markdown);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported format. Use "json" or "markdown"',
      });
    }
  } catch (error) {
    console.error('Integration registry export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export integration registry',
    });
  }
});

/**
 * GET /api/integration-registry/data-sources
 * Get all data source connectors for direct access
 */
router.get('/data-sources', async (req, res) => {
  try {
    const dataSources = integrationRegistry
      .getByType('database')
      .concat(integrationRegistry.getByType('graph-database'))
      .concat(integrationRegistry.getByType('cache'));

    res.json({
      success: true,
      data: {
        count: dataSources.length,
        dataSources: dataSources.map(ds => ({
          name: ds.name,
          type: ds.type,
          status: ds.status,
          dataClassification: ds.dataClassification,
          connectionInfo: ds.connector?.getConnectionInfo?.() || null,
        })),
      },
    });
  } catch (error) {
    console.error('Integration registry data sources failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data sources',
    });
  }
});

export default router;
