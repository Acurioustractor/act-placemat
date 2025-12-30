/**
 * Project Alignment API (v3)
 * Full backend enrichment + alignment endpoints
 */

import express from 'express';
import projectAlignmentService from '../../services/projectAlignmentService.js';

const router = express.Router();

router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      status: projectAlignmentService.getStatus(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    await projectAlignmentService.syncProjectIntelligence(req.body || {});
    res.json({
      success: true,
      message: 'Project intelligence synced successfully',
      status: projectAlignmentService.getStatus(),
    });
  } catch (error) {
    console.error('Project sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/align', async (req, res) => {
  try {
    await projectAlignmentService.buildContactAlignments(req.body || {});
    res.json({
      success: true,
      message: 'Contact alignments generated successfully',
      status: projectAlignmentService.getStatus(),
    });
  } catch (error) {
    console.error('Alignment generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    await projectAlignmentService.refreshAll(req.body || {});
    res.json({
      success: true,
      message: 'Projects and alignments refreshed successfully',
      status: projectAlignmentService.getStatus(),
    });
  } catch (error) {
    console.error('Refresh failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/projects', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const projects = await projectAlignmentService.listEnrichedProjects(limit);
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:projectId/matches', async (req, res) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;
    const matches = await projectAlignmentService.getProjectAlignments(projectId, limit);
    res.json({ success: true, projectId, matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:projectId/outreach-plan', async (req, res) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 5;
    const plan = await projectAlignmentService.getProjectOutreachPlan(projectId, limit);
    res.json({ success: true, projectId, plan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default function projectAlignmentRoutes(app) {
  app.use('/api/v3/project-alignment', router);
  console.log('🤝 Project Alignment API routes registered');
}

