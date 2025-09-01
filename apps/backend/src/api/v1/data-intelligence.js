/**
 * Data Intelligence API v1
 * Provides instant access to complete data lake intelligence and capabilities
 * NEVER SEARCH FOR DATA AGAIN - WE ALWAYS KNOW WHAT WE HAVE
 */

const express = require('express');
const { getDataIntelligenceService } = require('../../services/dataIntelligenceService');

const router = express.Router();

/**
 * @route   GET /api/v1/data-intelligence/query
 * @desc    Get instant data intelligence for any query
 * @access  Public
 */
router.get('/query', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const dataIntelligence = getDataIntelligenceService();
    const intelligence = await dataIntelligence.getDataIntelligence(query);

    res.json({
      success: true,
      data: intelligence
    });
  } catch (error) {
    console.error('Data intelligence query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data intelligence',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/v1/data-intelligence/apis
 * @desc    Get all available APIs and endpoints
 * @access  Public
 */
router.get('/apis', async (req, res) => {
  try {
    const dataIntelligence = getDataIntelligenceService();
    const apis = dataIntelligence.getAllAPIs();

    res.json({
      success: true,
      data: apis
    });
  } catch (error) {
    console.error('API listing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API listing',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/v1/data-intelligence/health
 * @desc    Get system health and diagnose issues
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    const dataIntelligence = getDataIntelligenceService();
    const health = await dataIntelligence.diagnoseSystemHealth();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check system health',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/v1/data-intelligence/guidance/:featureType
 * @desc    Get contextual guidance for new feature development
 * @access  Public
 */
router.get('/guidance/:featureType', async (req, res) => {
  try {
    const { featureType } = req.params;
    
    const dataIntelligence = getDataIntelligenceService();
    const guidance = dataIntelligence.getFeatureGuidance(featureType);

    res.json({
      success: true,
      data: guidance
    });
  } catch (error) {
    console.error('Feature guidance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feature guidance',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/v1/data-intelligence/overview
 * @desc    Get complete data lake architecture overview
 * @access  Public
 */
router.get('/overview', async (req, res) => {
  try {
    const dataIntelligence = getDataIntelligenceService();
    
    const overview = {
      timestamp: new Date().toISOString(),
      totalDataSources: Object.keys(dataIntelligence.dataLake.notion.databases).length + 
                        Object.keys(dataIntelligence.dataLake.supabase.tables).length,
      totalAPIs: Object.keys(dataIntelligence.getAllAPIs()).reduce((acc, category) => 
                   acc + Object.keys(dataIntelligence.getAllAPIs()[category]).length, 0),
      aiProviders: dataIntelligence.dataLake.ai.activeProviders,
      integrations: Object.keys(dataIntelligence.dataLake.integrations).length,
      architecture: {
        notion: dataIntelligence.dataLake.notion,
        supabase: {
          totalRecords: dataIntelligence.dataLake.supabase.totalRecords,
          analyticsReady: dataIntelligence.dataLake.supabase.analyticsReady,
          mlPowered: dataIntelligence.dataLake.supabase.mlPowered
        },
        ai: dataIntelligence.dataLake.ai.capabilities,
        realTime: dataIntelligence.dataLake.realTime
      }
    };

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Data lake overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data lake overview',
      details: error.message
    });
  }
});

module.exports = router;