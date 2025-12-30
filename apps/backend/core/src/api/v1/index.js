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
    },
    documentation: '/api/v1/docs',
    deprecated: {
      message: 'Legacy routes will be deprecated on 2025-01-27',
      migrationGuide: '/api/v1/docs/migration',
    }
  });
});

export default router;
