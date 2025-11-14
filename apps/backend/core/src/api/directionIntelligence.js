import { buildDirectionScorecard, buildGrantPursuitPlan } from '../services/directionIntelligenceService.js';

export default function directionIntelligenceRoutes(app) {
  app.get('/api/v2/direction/scorecard', async (req, res) => {
    try {
      const useCache = req.query.fresh !== 'true';
      const scorecard = await buildDirectionScorecard({ useCache });
      res.json({
        success: true,
        scorecard
      });
    } catch (error) {
      console.error('Direction scorecard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to build direction scorecard',
        message: error.message
      });
    }
  });

  app.post('/api/v2/opportunities/:opportunityId/pursue', async (req, res) => {
    try {
      const { opportunityId } = req.params;
      const { projectId } = req.body || {};

      const plan = await buildGrantPursuitPlan({ opportunityId, projectId });

      res.json({
        success: true,
        plan
      });
    } catch (error) {
      console.error('Grant pursuit workflow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to build grant pursuit plan',
        message: error.message
      });
    }
  });
}
