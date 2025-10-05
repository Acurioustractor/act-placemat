/**
 * MINIMAL WORKING SERVER - ONLY ESSENTIAL APIS FOR FRONTEND
 *
 * This server includes ONLY the APIs that the frontend actually calls:
 * - /api/dashboard/* (overview, projects)
 * - /api/sync/* (events, publish)
 * - /api/crm/* (linkedin-contacts)
 * - /api/community/* (activity-feed, collaboration)
 * - /api/trpc (type-safe API)
 * - /api/intelligence/* (contextual insights)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = process.env.ACT_ENV_FILE || path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ESSENTIAL IMPORTS - Only APIs that frontend actually uses
import dashboardRouter from './api/dashboard.js';
import syncRouter from './api/sync.js';
import setupSupabaseCRM from './api/supabase-crm.js';
import financialRouter from './api/v1/financial.js';
import communityRouter from './api/community.js';

// Setup essential routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/sync', syncRouter);
setupSupabaseCRM(app); // This provides /api/crm/* endpoints
app.use('/api/community', communityRouter);
app.use('/api/v1/financial', financialRouter);

// Basic intelligence endpoint (stub for now)
app.get('/api/intelligence/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Intelligence dashboard endpoint - placeholder',
    data: {
      insights: [],
      metrics: {},
      timestamp: new Date().toISOString()
    }
  });
});

// Basic intelligence contextual insights
app.get('/api/intelligence/contextual-insights', (req, res) => {
  const { context, userId } = req.query;
  res.json({
    success: true,
    context: context || 'default',
    userId: userId || 'anonymous',
    insights: [
      {
        id: 'sample-1',
        type: 'suggestion',
        title: 'Sample Insight',
        description: 'This is a placeholder insight for development',
        priority: 'medium',
        timestamp: new Date().toISOString()
      }
    ]
  });
});

// Placeholder for other endpoints the frontend might call
app.get('/api/ask', (req, res) => {
  res.json({
    success: true,
    message: 'Ask endpoint placeholder',
    response: 'This is a placeholder response for the ask endpoint'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Minimal ACT Placemat backend running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/overview`);
  console.log(`👥 Contact API: http://localhost:${PORT}/api/crm/linkedin-contacts`);
  console.log(`🔄 Sync API: http://localhost:${PORT}/api/sync/events`);
  console.log(`🏘️ Community API: http://localhost:${PORT}/api/community/activity-feed`);
  console.log(`🧠 Intelligence API: http://localhost:${PORT}/api/intelligence/dashboard`);
});

export default app;
