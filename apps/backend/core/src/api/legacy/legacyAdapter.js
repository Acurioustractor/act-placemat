/**
 * Legacy API Adapter Routes
 * Wraps legacy endpoints with backward compatibility layer
 * Provides gradual migration path to unified v2 integrations API
 */

import express from 'express';
import {
  createBackwardCompatibilityHandler,
  migrationHealthCheck
} from '../../middleware/backwardCompatibility.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { extractUser, optionalAuth, requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// Apply user extraction to all legacy routes
router.use(extractUser);

/**
 * Gmail Contact Intelligence Legacy Endpoints
 * Redirects to unified contacts API with Gmail-specific transformations
 */
router.get('/gmail-contact-intelligence',
  optionalAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/gmail-contact-intelligence'))
);

router.post('/gmail-contact-intelligence/process-emails',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/gmail-contact-intelligence'))
);

router.get('/gmail-contact-intelligence/stats',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/gmail-contact-intelligence'))
);

/**
 * General Contact Intelligence Legacy Endpoints
 * Redirects to unified contacts API with general transformations
 */
router.get('/contact-intelligence',
  optionalAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/contact-intelligence'))
);

router.post('/contact-intelligence/search',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/contact-intelligence'))
);

router.get('/contact-intelligence/analytics',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/contact-intelligence'))
);

/**
 * Calendar Contact Intelligence Legacy Endpoints
 * Redirects to unified contacts API with calendar-specific transformations
 */
router.get('/calendar-contact-intelligence',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/calendar-contact-intelligence'))
);

router.post('/calendar-contact-intelligence/analyze',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/calendar-contact-intelligence'))
);

/**
 * Project Contact Linkage Legacy Endpoints
 * Redirects to unified projects API with contact linkage transformations
 */
router.get('/project-contact-linkage',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/project-contact-linkage'))
);

router.post('/project-contact-linkage/link',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/project-contact-linkage'))
);

router.get('/project-contact-linkage/projects/:projectId/contacts',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/project-contact-linkage'))
);

/**
 * Notion Publish Legacy Endpoints
 * Redirects to unified projects API with Notion-specific transformations
 */
router.get('/notion-publish',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/notion-publish'))
);

router.post('/notion-publish/publish',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/notion-publish'))
);

router.get('/notion-publish/status/:pageId',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/notion-publish'))
);

/**
 * Financial Intelligence Legacy Endpoints
 * Redirects to unified finance API with financial intelligence transformations
 */
router.get('/financial-intelligence',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/financial-intelligence'))
);

router.post('/financial-intelligence/analyze',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/financial-intelligence'))
);

router.get('/financial-intelligence/recommendations',
  requireAuth,
  asyncHandler(createBackwardCompatibilityHandler('/api/financial-intelligence'))
);

/**
 * Migration Health Check Endpoint
 * Provides status of migration progress and recommendations
 */
router.get('/migration/health', asyncHandler(migrationHealthCheck));

/**
 * Migration Guide Endpoint
 * Returns comprehensive migration information
 */
router.get('/migration/guide', asyncHandler(async (req, res) => {
  const migrationGuide = {
    overview: {
      title: "API Migration Guide: Legacy to Unified v2 Integrations",
      description: "Complete guide for migrating from legacy API endpoints to the new unified v2 integrations API",
      timeline: {
        announcement: "2025-09-15",
        deprecation_start: "2025-10-01",
        sunset_date: "2025-12-31"
      }
    },
    endpoint_mappings: {
      "/api/gmail-contact-intelligence": {
        new_endpoint: "/api/v2/integrations/contacts?sources=gmail",
        breaking_changes: [
          "Response format changed from nested 'results' to direct 'data' array",
          "Email-specific fields moved to 'enrichment' object",
          "Pagination format standardized"
        ],
        migration_example: {
          old_request: "GET /api/gmail-contact-intelligence?limit=50",
          new_request: "GET /api/v2/integrations/contacts?sources=gmail&limit=50",
          response_changes: {
            old_format: "{ success: true, results: { contacts_processed: 10, contact_updates: [...] } }",
            new_format: "{ success: true, data: [...], pagination: {...}, metadata: {...} }"
          }
        }
      },
      "/api/contact-intelligence": {
        new_endpoint: "/api/v2/integrations/contacts",
        breaking_changes: [
          "Unified contact schema across all sources",
          "Enhanced enrichment data structure",
          "Standardized relationship intelligence"
        ]
      },
      "/api/project-contact-linkage": {
        new_endpoint: "/api/v2/integrations/projects?includeContacts=true",
        breaking_changes: [
          "Project-centric response instead of contact-centric",
          "Enhanced project metadata",
          "Improved contact role definitions"
        ]
      },
      "/api/financial-intelligence": {
        new_endpoint: "/api/v2/integrations/finance?includeAnalytics=true",
        breaking_changes: [
          "Standardized transaction schema",
          "Enhanced financial analytics",
          "Improved categorization"
        ]
      }
    },
    migration_steps: [
      {
        step: 1,
        title: "Update Development Environment",
        description: "Test new endpoints in your development environment",
        tasks: [
          "Update API base URL to include /v2/integrations",
          "Update request parameters to new format",
          "Update response parsing logic",
          "Test with sample data"
        ]
      },
      {
        step: 2,
        title: "Update Client Applications",
        description: "Gradually migrate client applications",
        tasks: [
          "Create feature flags for new vs old API",
          "Implement new API client methods",
          "Update error handling for new response format",
          "Add deprecation warnings to old client methods"
        ]
      },
      {
        step: 3,
        title: "Production Migration",
        description: "Deploy to production with monitoring",
        tasks: [
          "Monitor API performance and error rates",
          "Gradually switch traffic to new endpoints",
          "Update documentation and client SDKs",
          "Remove old API client methods before sunset"
        ]
      }
    ],
    support_resources: {
      documentation: "https://docs.act.place/api/v2/integrations",
      migration_examples: "https://github.com/act-org/api-migration-examples",
      support_email: "api-support@act.place",
      slack_channel: "#api-migration"
    },
    backward_compatibility: {
      duration: "Legacy endpoints will remain functional until 2025-12-31",
      deprecation_headers: "All legacy responses include deprecation headers with migration guidance",
      feature_parity: "All legacy functionality is available in v2 API with enhanced features",
      monitoring: "Legacy endpoint usage is monitored and logged for migration tracking"
    }
  };

  res.json({
    success: true,
    migration_guide: migrationGuide,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Legacy endpoint usage analytics
 */
router.get('/migration/analytics',
  requireAuth,
  asyncHandler(async (req, res) => {
    // This would typically fetch from analytics database
    // For now, returning mock data structure
    const analytics = {
      legacy_endpoint_usage: {
        "/api/gmail-contact-intelligence": {
          daily_requests: 150,
          unique_users: 12,
          trend: "decreasing",
          last_7_days: [180, 165, 145, 150, 140, 135, 150]
        },
        "/api/contact-intelligence": {
          daily_requests: 89,
          unique_users: 8,
          trend: "stable",
          last_7_days: [95, 88, 92, 89, 85, 91, 89]
        },
        "/api/project-contact-linkage": {
          daily_requests: 45,
          unique_users: 5,
          trend: "decreasing",
          last_7_days: [55, 50, 48, 45, 42, 40, 45]
        }
      },
      migration_progress: {
        total_legacy_users: 25,
        migrated_users: 8,
        migration_percentage: 32,
        target_migration_date: "2025-12-01"
      },
      recommendations: [
        "Contact high-usage users for migration assistance",
        "Create migration incentives for early adopters",
        "Increase deprecation warning visibility",
        "Provide migration automation tools"
      ]
    };

    res.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    });
  })
);

export default router;