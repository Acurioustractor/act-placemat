/**
 * API v1 Router
 *
 * Standardized API routes with runtime validation
 * Following ACT ecosystem best practices
 */

import { Router } from 'express';

// Import v1 route modules
import financialRoutes from './financial.js';
import intelligenceRoutes from './intelligence.js';
import integrationsRoutes from './integrations.js';
import platformRoutes from './platform.js';
import linkedinRoutes from './linkedin.js';

// Import new v1 standardized routes
import projectsRoutes from './projects.js';
import contactsRoutes from './contacts.js';
import mediaRoutes from './media.js';
import yearInReviewRoutes from './year-in-review.js';
import subscriptionsRoutes from './subscriptions.js';

// Import Farmhand agent proxy routes
import agentsRoutes from './agents.js';

// Import unified search routes
import searchRoutes from './search.js';

// Import Command Center routes
import commandCenterRoutes from './command-center.js';

// Import Contact Enrichment routes
import contactEnrichmentRoutes from './contact-enrichment.js';

// Import Personal Intelligence routes (migrated from act-personal-ai)
import personalIntelligenceRoutes from './personal-intelligence.js';

// Import Relationship Intelligence routes (migrated from act-personal-ai)
import relationshipIntelligenceRoutes from './relationship-intelligence.js';

const router = Router();

// Mount existing v1 routes
router.use('/financial', financialRoutes);
router.use('/intelligence', intelligenceRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/platform', platformRoutes);
router.use('/linkedin', linkedinRoutes);

// Mount new standardized v1 routes
router.use('/projects', projectsRoutes);
router.use('/contacts', contactsRoutes);
router.use('/media', mediaRoutes);
router.use('/year-in-review', yearInReviewRoutes);
router.use('/subscriptions', subscriptionsRoutes);

// Mount Farmhand agent proxy routes (ACT Personal AI)
router.use('/agents', agentsRoutes);

// Mount unified search routes
router.use('/search', searchRoutes);

// Mount Command Center routes
router.use('/command-center', commandCenterRoutes);

// Mount Contact Enrichment routes
router.use('/contact-enrichment', contactEnrichmentRoutes);

// Mount Personal Intelligence routes (migrated from act-personal-ai)
router.use('/personal', personalIntelligenceRoutes);

// Mount Relationship Intelligence routes (migrated from act-personal-ai)
router.use('/relationships', relationshipIntelligenceRoutes);

// API version information
router.get('/', (req, res) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      financial: '/api/v1/financial',
      intelligence: '/api/v1/intelligence',
      integrations: '/api/v1/integrations',
      platform: '/api/v1/platform',
      linkedin: '/api/v1/linkedin',
      projects: '/api/v1/projects',
      contacts: '/api/v1/contacts',
      media: '/api/v1/media',
      yearInReview: '/api/v1/year-in-review',
      subscriptions: '/api/v1/subscriptions',
      agents: '/api/v1/agents',
      search: '/api/v1/search',
      commandCenter: '/api/v1/command-center',
      contactEnrichment: '/api/v1/contact-enrichment',
      personal: '/api/v1/personal',
      relationships: '/api/v1/relationships',
    },
    documentation: '/api/v1/docs',
    deprecated: {
      message: 'Legacy routes will be deprecated on 2025-01-27',
      migrationGuide: '/api/v1/docs/migration',
    }
  });
});

export default router;
