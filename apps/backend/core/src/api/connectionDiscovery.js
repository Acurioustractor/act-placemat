/**
 * Connection Discovery API
 * Automatically discover and link project connections using Gmail + AI
 *
 * Goal: Move 43 isolated projects → resilient by discovering 11-16 connections each
 */

import express from 'express';
import ConnectionDiscoveryService from '../services/connectionDiscoveryService.js';
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

export default router;
