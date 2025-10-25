/**
 * Connection Discovery API
 * Automatically discover and link project connections using Gmail + AI
 *
 * Goal: Move 43 isolated projects → resilient by discovering 11-16 connections each
 */

import express from 'express';
import ConnectionDiscoveryService from '../services/connectionDiscoveryService.js';
import ConnectionLinkingService from '../services/connectionLinkingService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/v2/connections/discover-from-gmail
 * Discover connections for a project by mining Gmail emails
 */
router.post('/discover-from-gmail', async (req, res) => {
  try {
    const { projectId, lookbackDays = 365, minMentions = 2 } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Get services from app locals
    const { gmailService, notionService } = req.app.locals;

    if (!gmailService || !gmailService.gmail) {
      return res.status(503).json({
        error: 'Gmail not authenticated',
        message: 'Please authenticate Gmail first via /api/v2/gmail/sync/start'
      });
    }

    // Get project
    const project = await notionService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create discovery service
    const discoveryService = new ConnectionDiscoveryService(gmailService, notionService);

    // Discover connections from Gmail
    const results = await discoveryService.discoverFromGmail(project, {
      lookbackDays,
      minMentions
    });

    res.json(results);

  } catch (error) {
    logger.error('Gmail connection discovery failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/connections/discover-from-themes
 * Discover connections based on shared themes
 */
router.post('/discover-from-themes', async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const { gmailService, notionService } = req.app.locals;

    // Get project
    const project = await notionService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create discovery service
    const discoveryService = new ConnectionDiscoveryService(gmailService, notionService);

    // Discover theme-based connections
    const results = await discoveryService.discoverFromThemes(project);

    res.json(results);

  } catch (error) {
    logger.error('Theme connection discovery failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/connections/discover-all
 * Discover ALL connections (Gmail + Themes) for a project
 */
router.post('/discover-all', async (req, res) => {
  try {
    const { projectId, lookbackDays = 365 } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const { gmailService, notionService } = req.app.locals;

    // Get project
    const project = await notionService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const discoveryService = new ConnectionDiscoveryService(gmailService, notionService);

    // Run both discovery methods in parallel
    const [gmailResults, themeResults] = await Promise.all([
      gmailService.gmail
        ? discoveryService.discoverFromGmail(project, { lookbackDays })
        : Promise.resolve({ discovered: { organizations: [], people: [], relatedProjects: [], total: 0 } }),
      discoveryService.discoverFromThemes(project)
    ]);

    // Combine results
    const combined = {
      projectId,
      projectName: project.name,
      currentConnections: {
        supporters: project.supporters?.length || 0,
        organizations: project.relatedOrganisations?.length || 0,
        people: project.relatedPeople?.length || 0,
        projects: project.relatedProjects?.length || 0,
        total:
          (project.supporters?.length || 0) +
          (project.relatedOrganisations?.length || 0) +
          (project.relatedPeople?.length || 0) +
          (project.relatedProjects?.length || 0)
      },
      discovered: {
        fromGmail: gmailResults.discovered,
        fromThemes: themeResults.discovered,
        totalNew:
          (gmailResults.discovered?.total || 0) +
          (themeResults.discovered?.sameThemeProjects?.length || 0)
      },
      projectedConnections: {
        current: project.supporters?.length || 0 +
          (project.relatedOrganisations?.length || 0) +
          (project.relatedPeople?.length || 0) +
          (project.relatedProjects?.length || 0),
        afterLinking:
          (project.supporters?.length || 0) +
          (project.relatedOrganisations?.length || 0) +
          (project.relatedPeople?.length || 0) +
          (project.relatedProjects?.length || 0) +
          (gmailResults.discovered?.total || 0) +
          (themeResults.discovered?.sameThemeProjects?.length || 0)
      },
      beautifulObsolescenceImpact: calculateBOImpact(
        project,
        (gmailResults.discovered?.total || 0) +
        (themeResults.discovered?.sameThemeProjects?.length || 0)
      )
    };

    res.json(combined);

  } catch (error) {
    logger.error('Full connection discovery failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/connections/batch-discover
 * Discover connections for multiple projects (e.g., all 43 isolated projects)
 */
router.post('/batch-discover', async (req, res) => {
  try {
    const { projectIds, lookbackDays = 365, isolatedOnly = false } = req.body;

    const { gmailService, notionService } = req.app.locals;

    let targetProjectIds = projectIds;

    // If isolatedOnly, find all isolated projects (0-5 connections)
    if (isolatedOnly && !projectIds) {
      const allProjects = await notionService.getProjects();
      targetProjectIds = allProjects
        .filter(p => {
          const total =
            (p.supporters?.length || 0) +
            (p.relatedOrganisations?.length || 0) +
            (p.relatedPeople?.length || 0) +
            (p.relatedProjects?.length || 0);
          return total < 6; // Isolated = 0-5 connections
        })
        .map(p => p.id);

      logger.info(`🔴 Found ${targetProjectIds.length} isolated projects`);
    }

    if (!targetProjectIds || targetProjectIds.length === 0) {
      return res.status(400).json({ error: 'No projects to process' });
    }

    const discoveryService = new ConnectionDiscoveryService(gmailService, notionService);

    // Run batch discovery
    const results = await discoveryService.batchDiscover(targetProjectIds, { lookbackDays });

    res.json(results);

  } catch (error) {
    logger.error('Batch connection discovery failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Calculate Beautiful Obsolescence impact of new connections
 */
function calculateBOImpact(project, newConnections) {
  const currentConnections =
    (project.supporters?.length || 0) +
    (project.relatedOrganisations?.length || 0) +
    (project.relatedPeople?.length || 0) +
    (project.relatedProjects?.length || 0);

  const projectedConnections = currentConnections + newConnections;

  // Calculate density points
  const currentDensityPoints = currentConnections >= 31 ? 20 :
                                currentConnections >= 16 ? 15 :
                                currentConnections >= 6 ? 10 : 0;

  const projectedDensityPoints = projectedConnections >= 31 ? 20 :
                                  projectedConnections >= 16 ? 15 :
                                  projectedConnections >= 6 ? 10 : 0;

  const densityImprovement = projectedDensityPoints - currentDensityPoints;

  return {
    currentConnections,
    projectedConnections,
    newConnections,
    currentDensityPoints,
    projectedDensityPoints,
    densityImprovement,
    message: densityImprovement > 0
      ? `Adding ${newConnections} connections improves Beautiful Obsolescence score by ${densityImprovement} points!`
      : `Already at ${currentDensityPoints} density points`
  };
}

/**
 * POST /api/v2/connections/link
 * Link a single discovered connection
 */
router.post('/link', async (req, res) => {
  try {
    const { sourceProjectId, targetProjectId, metadata = {}, dryRun = false } = req.body;

    if (!sourceProjectId || !targetProjectId) {
      return res.status(400).json({ error: 'sourceProjectId and targetProjectId are required' });
    }

    const { notionService } = req.app.locals;
    const linkingService = new ConnectionLinkingService(notionService);

    const result = await linkingService.linkConnection(
      sourceProjectId,
      targetProjectId,
      metadata,
      { dryRun }
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to link connection:', error);
    res.status(500).json({ error: 'Failed to link connection', message: error.message });
  }
});

/**
 * POST /api/v2/connections/link-project
 * Link all discovered connections for a single project
 */
router.post('/link-project', async (req, res) => {
  try {
    const { projectId, discoveryResults, confidenceThreshold = 0.7, dryRun = false } = req.body;

    if (!projectId || !discoveryResults) {
      return res.status(400).json({ error: 'projectId and discoveryResults are required' });
    }

    const { notionService } = req.app.locals;
    const linkingService = new ConnectionLinkingService(notionService);

    const result = await linkingService.linkProjectConnections(
      projectId,
      discoveryResults,
      { confidenceThreshold, dryRun }
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to link project connections:', error);
    res.status(500).json({ error: 'Failed to link project connections', message: error.message });
  }
});

/**
 * POST /api/v2/connections/batch-link
 * Link connections for all projects from batch discovery
 */
router.post('/batch-link', async (req, res) => {
  try {
    const { batchDiscoveryResults, confidenceThreshold = 0.7, dryRun = false } = req.body;

    if (!batchDiscoveryResults) {
      return res.status(400).json({ error: 'batchDiscoveryResults is required' });
    }

    const { notionService } = req.app.locals;
    const linkingService = new ConnectionLinkingService(notionService);

    const result = await linkingService.batchLinkConnections(
      batchDiscoveryResults,
      { confidenceThreshold, dryRun }
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to batch link connections:', error);
    res.status(500).json({ error: 'Failed to batch link connections', message: error.message });
  }
});

/**
 * POST /api/v2/connections/discover-and-link
 * Convenience endpoint: discover + link in one operation
 */
router.post('/discover-and-link', async (req, res) => {
  try {
    const { projectId, confidenceThreshold = 0.7, dryRun = false } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const { notionService, gmailService } = req.app.locals;

    // Get project
    const project = await notionService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Discover connections (theme-based only, since Gmail requires auth)
    const discoveryService = new ConnectionDiscoveryService(gmailService, notionService);
    const discoveryResults = await discoveryService.discoverFromThemes(project);

    // Link discovered connections
    const linkingService = new ConnectionLinkingService(notionService);
    const linkingResults = await linkingService.linkProjectConnections(
      projectId,
      discoveryResults,
      { confidenceThreshold, dryRun }
    );

    res.json({
      discovery: discoveryResults,
      linking: linkingResults,
      summary: {
        discovered: discoveryResults.discovered?.sameThemeProjects?.length || 0,
        linked: linkingResults.linked,
        duplicates: linkingResults.duplicates
      }
    });
  } catch (error) {
    logger.error('Failed to discover and link:', error);
    res.status(500).json({ error: 'Failed to discover and link', message: error.message });
  }
});

export default router;
