/**
 * Backward Compatibility Layer
 * Provides seamless transition from legacy API endpoints to unified v2 integrations API
 *
 * Features:
 * - Legacy endpoint routing to new UnifiedIntegrationService
 * - Data format transformation between old and new schemas
 * - Deprecation notices with migration guidance
 * - Request/response mapping for complex queries
 * - Gradual migration support with feature flags
 */

// import { logger } from '../utils/logger.js';
// Temporary workaround for logger import issue
const logger = console;
import { UnifiedIntegrationService } from '../services/unifiedIntegration/UnifiedIntegrationService.js';
import { LinkedInServiceAdapter } from '../services/unifiedIntegration/adapters/LinkedInServiceAdapter.js';
import { SupabaseServiceAdapter } from '../services/unifiedIntegration/adapters/SupabaseServiceAdapter.js';
import { NotionServiceAdapter } from '../services/unifiedIntegration/adapters/NotionServiceAdapter.js';
import { XeroFinanceServiceAdapter } from '../services/unifiedIntegration/adapters/XeroFinanceServiceAdapter.js';

// Initialize unified service for compatibility layer
let unifiedService = null;

const initializeUnifiedService = () => {
  if (!unifiedService) {
    const linkedInAdapter = new LinkedInServiceAdapter();
    const supabaseAdapter = new SupabaseServiceAdapter();
    const notionAdapter = new NotionServiceAdapter();
    const xeroAdapter = new XeroFinanceServiceAdapter();

    unifiedService = new UnifiedIntegrationService(
      linkedInAdapter,
      null, // Gmail adapter
      notionAdapter,
      supabaseAdapter,
      xeroAdapter,
      null  // Cache service
    );
  }
  return unifiedService;
};

// Legacy endpoint mapping configuration
const LEGACY_ENDPOINT_MAPPING = {
  '/api/gmail-contact-intelligence': {
    newEndpoint: '/api/v2/integrations/contacts',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/gmail-contacts',
    transformers: {
      request: transformGmailContactRequest,
      response: transformGmailContactResponse
    }
  },
  '/api/contact-intelligence': {
    newEndpoint: '/api/v2/integrations/contacts',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/contacts',
    transformers: {
      request: transformContactIntelligenceRequest,
      response: transformContactIntelligenceResponse
    }
  },
  '/api/calendar-contact-intelligence': {
    newEndpoint: '/api/v2/integrations/contacts',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/calendar-contacts',
    transformers: {
      request: transformCalendarContactRequest,
      response: transformCalendarContactResponse
    }
  },
  '/api/project-contact-linkage': {
    newEndpoint: '/api/v2/integrations/projects',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/project-contacts',
    transformers: {
      request: transformProjectContactRequest,
      response: transformProjectContactResponse
    }
  },
  '/api/notion-publish': {
    newEndpoint: '/api/v2/integrations/projects',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/notion-projects',
    transformers: {
      request: transformNotionPublishRequest,
      response: transformNotionPublishResponse
    }
  },
  '/api/financial-intelligence': {
    newEndpoint: '/api/v2/integrations/finance',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/financial-data',
    transformers: {
      request: transformFinancialIntelligenceRequest,
      response: transformFinancialIntelligenceResponse
    }
  }
};

/**
 * Main backward compatibility middleware
 */
export function createBackwardCompatibilityHandler(legacyEndpoint) {
  const mapping = LEGACY_ENDPOINT_MAPPING[legacyEndpoint];

  if (!mapping) {
    throw new Error(`No mapping found for legacy endpoint: ${legacyEndpoint}`);
  }

  return async (req, res, next) => {
    try {
      // Add deprecation headers
      addDeprecationHeaders(res, mapping);

      // Log legacy endpoint usage
      logLegacyEndpointUsage(req, legacyEndpoint, mapping);

      // Initialize unified service
      const service = initializeUnifiedService();

      // Transform request if needed
      const transformedRequest = mapping.transformers.request
        ? await mapping.transformers.request(req, res)
        : req;

      // Route to appropriate unified service method
      const result = await routeToUnifiedService(service, legacyEndpoint, transformedRequest);

      // Transform response if needed
      const transformedResponse = mapping.transformers.response
        ? await mapping.transformers.response(result, req)
        : result;

      // Send response with backward compatibility format
      res.json(transformedResponse);

    } catch (error) {
      logger.error(`Backward compatibility error for ${legacyEndpoint}:`, error);

      // Send error in legacy format
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        message: `Legacy endpoint ${legacyEndpoint} encountered an error`,
        migration_info: {
          new_endpoint: mapping.newEndpoint,
          migration_guide: mapping.migrationGuide,
          deprecation_date: mapping.deprecationDate
        },
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Add deprecation headers to response
 */
function addDeprecationHeaders(res, mapping) {
  const deprecationDate = new Date(mapping.deprecationDate);
  const now = new Date();
  const daysUntilDeprecation = Math.ceil((deprecationDate - now) / (1000 * 60 * 60 * 24));

  res.setHeader('Deprecation', `date="${mapping.deprecationDate}"`);
  res.setHeader('Sunset', mapping.deprecationDate);
  res.setHeader('Link', `<${mapping.newEndpoint}>; rel="successor-version"`);
  res.setHeader('X-API-Migration-Guide', mapping.migrationGuide);
  res.setHeader('X-Days-Until-Deprecation', daysUntilDeprecation.toString());

  // Add warning header
  if (daysUntilDeprecation < 90) {
    res.setHeader('Warning', `299 - "This API endpoint is deprecated and will be removed on ${mapping.deprecationDate}. Please migrate to ${mapping.newEndpoint}"`);
  }
}

/**
 * Log legacy endpoint usage for analytics
 */
function logLegacyEndpointUsage(req, legacyEndpoint, mapping) {
  logger.warn(`Legacy endpoint accessed`, {
    endpoint: legacyEndpoint,
    newEndpoint: mapping.newEndpoint,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    deprecationDate: mapping.deprecationDate,
    migrationGuide: mapping.migrationGuide,
    timestamp: new Date().toISOString()
  });
}

/**
 * Route legacy requests to appropriate unified service methods
 */
async function routeToUnifiedService(service, legacyEndpoint, req) {
  switch (legacyEndpoint) {
    case '/api/gmail-contact-intelligence':
    case '/api/contact-intelligence':
    case '/api/calendar-contact-intelligence':
      return await service.getContacts(req.transformedFilters || {});

    case '/api/project-contact-linkage':
    case '/api/notion-publish':
      return await service.getProjects(req.transformedFilters || {});

    case '/api/financial-intelligence':
      return await service.getFinanceData(req.transformedFilters || {});

    default:
      throw new Error(`Unsupported legacy endpoint: ${legacyEndpoint}`);
  }
}

/**
 * Request Transformers
 */

async function transformGmailContactRequest(req, res) {
  // Transform Gmail contact intelligence request to unified format
  const legacyQuery = req.query;
  const legacyBody = req.body;

  req.transformedFilters = {
    sources: ['gmail'],
    limit: legacyQuery.limit || legacyBody.limit || 50,
    includeEmails: true,
    includeEnrichment: legacyQuery.enrichment !== 'false'
  };

  if (legacyQuery.since || legacyBody.since) {
    req.transformedFilters.updatedSince = legacyQuery.since || legacyBody.since;
  }

  return req;
}

async function transformContactIntelligenceRequest(req, res) {
  // Transform general contact intelligence request
  const legacyQuery = req.query;

  req.transformedFilters = {
    sources: ['linkedin', 'gmail', 'notion'],
    limit: legacyQuery.limit || 50,
    includeAnalytics: legacyQuery.analytics === 'true',
    includeRelationships: legacyQuery.relationships !== 'false'
  };

  if (legacyQuery.search) {
    req.transformedFilters.search = legacyQuery.search;
  }

  return req;
}

async function transformCalendarContactRequest(req, res) {
  // Transform calendar contact intelligence request
  const legacyQuery = req.query;

  req.transformedFilters = {
    sources: ['google_calendar'],
    limit: legacyQuery.limit || 50,
    includeEvents: true,
    dateRange: {
      start: legacyQuery.start_date,
      end: legacyQuery.end_date
    }
  };

  return req;
}

async function transformProjectContactRequest(req, res) {
  // Transform project contact linkage request
  const legacyQuery = req.query;

  req.transformedFilters = {
    includeContacts: true,
    projectStatus: legacyQuery.status,
    limit: legacyQuery.limit || 50
  };

  if (legacyQuery.project_id) {
    req.transformedFilters.projectId = legacyQuery.project_id;
  }

  return req;
}

async function transformNotionPublishRequest(req, res) {
  // Transform Notion publish request to projects format
  const legacyBody = req.body;

  req.transformedFilters = {
    sources: ['notion'],
    status: 'published',
    limit: legacyBody.limit || 50
  };

  return req;
}

async function transformFinancialIntelligenceRequest(req, res) {
  // Transform financial intelligence request
  const legacyQuery = req.query;

  req.transformedFilters = {
    sources: ['xero'],
    dateRange: {
      start: legacyQuery.start_date,
      end: legacyQuery.end_date
    },
    categories: legacyQuery.categories?.split(','),
    includeAnalytics: true,
    limit: legacyQuery.limit || 100
  };

  return req;
}

/**
 * Response Transformers
 */

async function transformGmailContactResponse(unifiedData, req) {
  // Transform unified contacts response to Gmail contact intelligence format
  return {
    success: true,
    message: `Processed ${unifiedData.data?.length || 0} contacts from Gmail`,
    results: {
      contacts_processed: unifiedData.data?.length || 0,
      contacts_with_intelligence: unifiedData.data?.filter(c => c.enrichment).length || 0,
      contact_updates: unifiedData.data?.map(contact => ({
        contact_id: contact.id,
        email: contact.email,
        name: contact.name,
        intelligence_score: contact.enrichment?.score || 0,
        last_email_date: contact.lastEmailDate,
        email_frequency: contact.emailFrequency
      })) || [],
      gmail_specific: {
        total_emails_analyzed: unifiedData.metadata?.emailsAnalyzed || 0,
        email_threads: unifiedData.metadata?.threads || 0
      }
    },
    pagination: unifiedData.pagination,
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "This endpoint is deprecated. Please migrate to /api/v2/integrations/contacts",
      new_endpoint: "/api/v2/integrations/contacts",
      migration_guide: "https://docs.act.place/api-migration/gmail-contacts"
    }
  };
}

async function transformContactIntelligenceResponse(unifiedData, req) {
  // Transform unified contacts response to general contact intelligence format
  return {
    success: true,
    contacts: unifiedData.data?.map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      organization: contact.organization,
      title: contact.title,
      linkedin_url: contact.linkedinUrl,
      intelligence: {
        relationship_strength: contact.enrichment?.relationshipStrength || 'unknown',
        interaction_frequency: contact.enrichment?.interactionFrequency || 0,
        last_interaction: contact.enrichment?.lastInteraction,
        contact_source: contact.source,
        enrichment_score: contact.enrichment?.score || 0
      },
      metadata: contact.metadata
    })) || [],
    total_contacts: unifiedData.pagination?.total || 0,
    pagination: unifiedData.pagination,
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "This endpoint is deprecated. Please migrate to /api/v2/integrations/contacts",
      new_endpoint: "/api/v2/integrations/contacts"
    }
  };
}

async function transformCalendarContactResponse(unifiedData, req) {
  // Transform unified contacts response to calendar contact format
  return {
    success: true,
    calendar_contacts: unifiedData.data?.map(contact => ({
      contact_id: contact.id,
      name: contact.name,
      email: contact.email,
      meeting_frequency: contact.enrichment?.meetingFrequency || 0,
      last_meeting: contact.enrichment?.lastMeeting,
      upcoming_meetings: contact.enrichment?.upcomingMeetings || [],
      calendar_relationship: contact.enrichment?.calendarRelationship || 'unknown'
    })) || [],
    meeting_analytics: unifiedData.analytics?.meetings || {},
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "This endpoint is deprecated. Please migrate to /api/v2/integrations/contacts",
      new_endpoint: "/api/v2/integrations/contacts"
    }
  };
}

async function transformProjectContactResponse(unifiedData, req) {
  // Transform unified projects response to project contact linkage format
  return {
    success: true,
    project_contacts: unifiedData.data?.map(project => ({
      project_id: project.id,
      project_name: project.name,
      status: project.status,
      contacts: project.contacts?.map(contact => ({
        contact_id: contact.id,
        name: contact.name,
        email: contact.email,
        role_in_project: contact.roleInProject || 'participant',
        contribution_level: contact.contributionLevel || 'medium'
      })) || [],
      contact_count: project.contacts?.length || 0
    })) || [],
    total_projects: unifiedData.pagination?.total || 0,
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "This endpoint is deprecated. Please migrate to /api/v2/integrations/projects",
      new_endpoint: "/api/v2/integrations/projects"
    }
  };
}

async function transformNotionPublishResponse(unifiedData, req) {
  // Transform unified projects response to Notion publish format
  return {
    success: true,
    published_projects: unifiedData.data?.map(project => ({
      notion_page_id: project.id,
      title: project.name,
      status: project.status,
      published_date: project.publishedDate,
      last_updated: project.updatedAt,
      content_summary: project.description?.substring(0, 200) + '...',
      tags: project.tags || [],
      collaborators: project.contacts?.length || 0
    })) || [],
    total_published: unifiedData.pagination?.total || 0,
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "This endpoint is deprecated. Please migrate to /api/v2/integrations/projects",
      new_endpoint: "/api/v2/integrations/projects"
    }
  };
}

async function transformFinancialIntelligenceResponse(unifiedData, req) {
  // Transform unified finance response to financial intelligence format
  return {
    success: true,
    financial_intelligence: {
      summary: {
        total_transactions: unifiedData.data?.length || 0,
        total_amount: unifiedData.summary?.totalAmount || 0,
        currency: unifiedData.summary?.currency || 'AUD',
        date_range: {
          start: unifiedData.summary?.dateRange?.start,
          end: unifiedData.summary?.dateRange?.end
        }
      },
      transactions: unifiedData.data?.map(transaction => ({
        transaction_id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        category: transaction.category,
        contact_name: transaction.contactName,
        intelligence_flags: transaction.intelligenceFlags || []
      })) || [],
      analytics: unifiedData.analytics || {},
      recommendations: unifiedData.recommendations || []
    },
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "This endpoint is deprecated. Please migrate to /api/v2/integrations/finance",
      new_endpoint: "/api/v2/integrations/finance"
    }
  };
}

/**
 * Legacy endpoint wrapper factory
 */
export function createLegacyEndpointWrapper(legacyPath) {
  return {
    get: createBackwardCompatibilityHandler(legacyPath),
    post: createBackwardCompatibilityHandler(legacyPath),
    put: createBackwardCompatibilityHandler(legacyPath),
    delete: createBackwardCompatibilityHandler(legacyPath)
  };
}

/**
 * Migration health check endpoint
 */
export async function migrationHealthCheck(req, res) {
  try {
    const service = initializeUnifiedService();
    const healthStatus = await service.getHealthStatus();

    const migrationStatus = {
      unified_service_status: healthStatus.status,
      legacy_endpoints: Object.keys(LEGACY_ENDPOINT_MAPPING).map(endpoint => ({
        endpoint,
        status: 'active',
        deprecation_date: LEGACY_ENDPOINT_MAPPING[endpoint].deprecationDate,
        migration_guide: LEGACY_ENDPOINT_MAPPING[endpoint].migrationGuide,
        new_endpoint: LEGACY_ENDPOINT_MAPPING[endpoint].newEndpoint
      })),
      migration_recommendations: [
        "Update client applications to use /api/v2/integrations endpoints",
        "Test new endpoints in staging environment",
        "Update API documentation and client SDKs",
        "Plan for legacy endpoint sunset dates"
      ]
    };

    res.json({
      success: true,
      migration_status: migrationStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Migration health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Named exports for ES6 imports
export { LEGACY_ENDPOINT_MAPPING };

export default {
  createBackwardCompatibilityHandler,
  createLegacyEndpointWrapper,
  migrationHealthCheck,
  LEGACY_ENDPOINT_MAPPING
};