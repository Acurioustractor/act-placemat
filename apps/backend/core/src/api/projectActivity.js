import express from 'express';
import projectActivityService from '../services/projectActivityService.js';
import notionService from '../services/notionService.js';

const router = express.Router();

router.post('/sync', async (req, res) => {
  try {
    const projects = await notionService.getProjects({ useCache: false });
    const summaries = [];

    for (const project of projects) {
      const summary = await projectActivityService.refreshProjectActivity(project);
      summaries.push(summary);
    }

    res.json({
      success: true,
      count: summaries.length,
      summaries
    });
  } catch (error) {
    console.error('Project activity sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/communications', async (req, res) => {
  try {
    const { projectId = null, limit = '20', days = '60' } = req.query;
    const result = await projectActivityService.getProjectCommunications({
      projectId: projectId || null,
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      days: Math.max(parseInt(days, 10) || 60, 1)
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Project communications fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const summary = await projectActivityService.getActivitySummary(projectId);
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
