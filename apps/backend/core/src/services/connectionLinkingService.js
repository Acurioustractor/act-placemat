/**
 * Connection Linking Service - Auto-link discovered connections to Notion
 *
 * Features:
 * - Link project-to-project relationships
 * - Duplicate detection and prevention
 * - Confidence-based filtering
 * - Dry-run mode for testing
 * - Batch processing with progress tracking
 * - Beautiful Obsolescence impact calculations
 *
 * Usage:
 * const linkingService = new ConnectionLinkingService(notionService);
 * await linkingService.linkConnection(sourceId, targetId);
 */

import { logger } from '../utils/logger.js';

class ConnectionLinkingService {
  constructor(notionService) {
    this.notionService = notionService;
  }

  /**
   * Link a single discovered connection between two projects
   * @param {string} sourceProjectId - The project receiving the connection
   * @param {string} targetProjectId - The project to link to
   * @param {object} metadata - Connection metadata (confidence, themes, etc.)
   * @param {object} options - { dryRun, force }
   */
  async linkConnection(sourceProjectId, targetProjectId, metadata = {}, options = {}) {
    const { dryRun = false, force = false } = options;

    try {
      // 1. Get both projects from Notion
      const [sourceProject, targetProject] = await Promise.all([
        this.notionService.getProjectById(sourceProjectId),
        this.notionService.getProjectById(targetProjectId)
      ]);

      if (!sourceProject || !targetProject) {
        return {
          linked: false,
          error: true,
          message: `Project not found: ${!sourceProject ? sourceProjectId : targetProjectId}`
        };
      }

      // 2. Get current relationships (to prevent duplicates)
      const existingRelationIds = (sourceProject.relatedProjects || []).map(p => p.id);

      // 3. Check if connection already exists
      if (existingRelationIds.includes(targetProjectId) && !force) {
        logger.info(`🔗 Connection already exists: ${sourceProject.name} → ${targetProject.name}`);
        return {
          linked: false,
          duplicate: true,
          sourceProject: sourceProject.name,
          targetProject: targetProject.name,
          message: `Connection already exists: ${sourceProject.name} → ${targetProject.name}`
        };
      }

      // 4. Prepare updated relationship array
      const updatedRelationIds = [...existingRelationIds, targetProjectId];

      // 5. Dry run mode - don't actually update Notion
      if (dryRun) {
        logger.info(`🧪 [DRY RUN] Would link: ${sourceProject.name} → ${targetProject.name}`);
        return {
          linked: true,
          dryRun: true,
          sourceProject: sourceProject.name,
          targetProject: targetProject.name,
          metadata,
          message: `[DRY RUN] Would link ${sourceProject.name} → ${targetProject.name}`
        };
      }

      // 6. Update Notion with new relationship
      await this.notionService.notion.pages.update({
        page_id: sourceProjectId,
        properties: {
          'Related Projects': {
            relation: updatedRelationIds.map(id => ({ id }))
          }
        }
      });

      logger.info(`✅ Linked: ${sourceProject.name} → ${targetProject.name} (${metadata.sharedThemes?.join(', ') || 'theme-based'})`);

      return {
        linked: true,
        duplicate: false,
        sourceProject: sourceProject.name,
        targetProject: targetProject.name,
        metadata,
        previousConnectionCount: existingRelationIds.length,
        newConnectionCount: updatedRelationIds.length,
        message: `Successfully linked ${sourceProject.name} → ${targetProject.name}`
      };

    } catch (error) {
      logger.error(`Failed to link connection ${sourceProjectId} → ${targetProjectId}:`, error);
      return {
        linked: false,
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Link all discovered connections for a single project
   * @param {string} projectId - The project ID
   * @param {object} discoveryResults - Results from discoverFromThemes()
   * @param {object} options - { confidenceThreshold, dryRun }
   */
  async linkProjectConnections(projectId, discoveryResults, options = {}) {
    const { confidenceThreshold = 0.7, dryRun = false } = options;

    logger.info(`🔗 Linking connections for project ${projectId}`);
    logger.info(`   Confidence threshold: ${confidenceThreshold}`);
    logger.info(`   Dry run: ${dryRun}`);

    // Filter connections by confidence
    const sameThemeProjects = discoveryResults.discovered?.sameThemeProjects || [];
    const highConfidence = sameThemeProjects.filter(c => c.confidence >= confidenceThreshold);

    if (highConfidence.length === 0) {
      logger.info(`   No connections meet confidence threshold (${confidenceThreshold})`);
      return {
        projectId,
        attempted: 0,
        linked: 0,
        duplicates: 0,
        errors: 0,
        results: []
      };
    }

    logger.info(`   Found ${highConfidence.length} connections meeting threshold`);

    // Link each connection
    const results = [];
    for (const connection of highConfidence) {
      const result = await this.linkConnection(
        projectId,
        connection.id,
        {
          confidence: connection.confidence,
          sharedThemes: connection.sharedThemes,
          connectionType: 'theme-based'
        },
        { dryRun }
      );
      results.push(result);
    }

    const summary = {
      projectId,
      projectName: discoveryResults.project,
      attempted: highConfidence.length,
      linked: results.filter(r => r.linked && !r.dryRun).length,
      wouldLink: results.filter(r => r.dryRun).length,
      duplicates: results.filter(r => r.duplicate).length,
      errors: results.filter(r => r.error).length,
      results
    };

    logger.info(`✅ Linking complete for ${discoveryResults.project}:`);
    logger.info(`   Attempted: ${summary.attempted}`);
    logger.info(`   Linked: ${summary.linked}`);
    logger.info(`   Duplicates: ${summary.duplicates}`);
    logger.info(`   Errors: ${summary.errors}`);

    return summary;
  }

  /**
   * Batch link connections for multiple projects from batch discovery results
   * @param {object} batchDiscoveryResults - Results from batchDiscover()
   * @param {object} options - { confidenceThreshold, dryRun, projectFilter }
   */
  async batchLinkConnections(batchDiscoveryResults, options = {}) {
    const { confidenceThreshold = 0.7, dryRun = false, projectFilter = null } = options;

    logger.info(`🚀 Starting batch connection linking`);
    logger.info(`   Projects to process: ${batchDiscoveryResults.results.length}`);
    logger.info(`   Confidence threshold: ${confidenceThreshold}`);
    logger.info(`   Dry run: ${dryRun}`);

    const results = [];
    let processedCount = 0;

    for (const projectResult of batchDiscoveryResults.results) {
      // Skip projects without theme discoveries
      if (!projectResult.themes || !projectResult.themes.discovered) {
        continue;
      }

      // Apply project filter if provided
      if (projectFilter && !projectFilter(projectResult)) {
        continue;
      }

      processedCount++;
      logger.info(`\n📊 Processing project ${processedCount}: ${projectResult.projectName}`);

      const linkingResult = await this.linkProjectConnections(
        projectResult.projectId,
        projectResult.themes,
        { confidenceThreshold, dryRun }
      );

      results.push(linkingResult);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const totalLinked = results.reduce((sum, r) => sum + r.linked, 0);
    const totalWouldLink = results.reduce((sum, r) => sum + (r.wouldLink || 0), 0);
    const totalDuplicates = results.reduce((sum, r) => sum + r.duplicates, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    logger.info(`\n✅ Batch linking complete!`);
    logger.info(`   Projects processed: ${results.length}`);
    logger.info(`   Total linked: ${totalLinked}`);
    if (dryRun) {
      logger.info(`   Would link: ${totalWouldLink}`);
    }
    logger.info(`   Duplicates skipped: ${totalDuplicates}`);
    logger.info(`   Errors: ${totalErrors}`);

    return {
      projectsProcessed: results.length,
      totalLinked: dryRun ? 0 : totalLinked,
      totalWouldLink: dryRun ? totalWouldLink : 0,
      totalDuplicates,
      totalErrors,
      dryRun,
      results
    };
  }

  /**
   * Calculate Beautiful Obsolescence impact of linking connections
   * @param {string} projectId - The project ID
   * @param {number} newConnections - Number of new connections being added
   */
  async calculateBOImpact(projectId, newConnections) {
    try {
      const project = await this.notionService.getProjectById(projectId);

      // Count current connections
      const currentConnections =
        (project.relatedProjects?.length || 0) +
        (project.organizations?.length || 0) +
        (project.people?.length || 0) +
        (project.places?.length || 0);

      const projectedConnections = currentConnections + newConnections;

      // Relationship Density scoring (20% of BO score)
      const getCurrentDensityPoints = (count) => {
        if (count >= 31) return 20; // Antifragile
        if (count >= 16) return 15; // Resilient
        if (count >= 6) return 10;  // Developing
        return 5;                    // Isolated
      };

      const currentDensityPoints = getCurrentDensityPoints(currentConnections);
      const projectedDensityPoints = getCurrentDensityPoints(projectedConnections);

      const densityImprovement = projectedDensityPoints - currentDensityPoints;

      return {
        projectName: project.name,
        currentConnections,
        projectedConnections,
        newConnections,
        currentDensityTier: this.getDensityTier(currentConnections),
        projectedDensityTier: this.getDensityTier(projectedConnections),
        currentDensityPoints,
        projectedDensityPoints,
        densityImprovement,
        message: densityImprovement > 0
          ? `Adding ${newConnections} connections improves BO score by ${densityImprovement} points!`
          : `Adding ${newConnections} connections (no tier change yet)`
      };
    } catch (error) {
      logger.error(`Failed to calculate BO impact for ${projectId}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Get relationship density tier name
   */
  getDensityTier(connectionCount) {
    if (connectionCount >= 31) return 'ANTIFRAGILE';
    if (connectionCount >= 16) return 'RESILIENT';
    if (connectionCount >= 6) return 'DEVELOPING';
    return 'ISOLATED';
  }
}

export default ConnectionLinkingService;
