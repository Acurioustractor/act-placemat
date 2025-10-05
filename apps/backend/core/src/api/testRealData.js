/**
 * TEST API - Forces real Notion data, no fallback allowed
 */

import express from 'express';
const router = express.Router();

// Import the FIXED service
import notionServiceFixed from '../services/notionServiceFix.js';

router.get('/test/real-projects', async (req, res) => {
  try {
    console.log('🚀 FETCHING REAL PROJECTS - NO FALLBACK');

    // Test connection first
    const connected = await notionServiceFixed.testConnection();
    if (!connected) {
      return res.status(500).json({
        error: 'NOTION NOT CONNECTED',
        message: 'Fix your fucking environment variables'
      });
    }

    // Get REAL projects
    const projects = await notionServiceFixed.getProjects({ limit: 10 });

    res.json({
      success: true,
      count: projects.length,
      isRealData: true,
      noFallbackBullshit: true,
      projects: projects
    });
  } catch (error) {
    console.error('❌ REAL DATA FETCH FAILED:', error);
    res.status(500).json({
      error: 'FAILED TO GET REAL DATA',
      message: error.message,
      stack: error.stack
    });
  }
});

router.get('/test/notion-status', async (req, res) => {
  try {
    const connected = await notionServiceFixed.testConnection();

    res.json({
      connected: connected,
      hasToken: !!process.env.NOTION_TOKEN,
      databases: {
        projects: !!process.env.NOTION_PROJECTS_DATABASE_ID,
        partners: !!process.env.NOTION_PARTNERS_DATABASE_ID,
        opportunities: !!process.env.NOTION_OPPORTUNITIES_DATABASE_ID
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;