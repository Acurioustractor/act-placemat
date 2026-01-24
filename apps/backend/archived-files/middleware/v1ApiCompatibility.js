/**
 * V1 API Backward Compatibility Layer
 * Provides backward compatibility for v1 API endpoints by routing to v2 unified API
 *
 * This extends the existing backward compatibility layer to handle v1 structured endpoints
 * that need to maintain their existing response formats while using the new unified service
 */

import { createBackwardCompatibilityHandler, LEGACY_ENDPOINT_MAPPING } from './backwardCompatibility.js';
import { UnifiedIntegrationService } from '../services/unifiedIntegration/UnifiedIntegrationService.js';
import { LinkedInServiceAdapter } from '../services/unifiedIntegration/adapters/LinkedInServiceAdapter.js';
import { SupabaseServiceAdapter } from '../services/unifiedIntegration/adapters/SupabaseServiceAdapter.js';
import { NotionServiceAdapter } from '../services/unifiedIntegration/adapters/NotionServiceAdapter.js';
import { XeroFinanceServiceAdapter } from '../services/unifiedIntegration/adapters/XeroFinanceServiceAdapter.js';
import { RedisCacheService } from '../services/unifiedIntegration/cache/RedisCacheService.js';

// Temporary logger workaround
const logger = console;

// Initialize unified service for v1 compatibility
let unifiedService = null;

const initializeUnifiedService = () => {
  if (!unifiedService) {
    const linkedInAdapter = new LinkedInServiceAdapter();
    const supabaseAdapter = new SupabaseServiceAdapter();
    const notionAdapter = new NotionServiceAdapter();
    const xeroAdapter = new XeroFinanceServiceAdapter();

    // Initialize Redis cache service
    let cacheService = null;
    try {
      cacheService = new RedisCacheService();
      logger.info('Redis cache service initialized for v1 compatibility');
    } catch (error) {
      logger.warn('Failed to initialize Redis cache service for v1 compatibility', { error: error.message });
    }

    unifiedService = new UnifiedIntegrationService(
      linkedInAdapter,
      null, // Gmail adapter
      notionAdapter,
      supabaseAdapter,
      xeroAdapter,
      cacheService  // Redis cache service
    );
  }
  return unifiedService;
};

// V1 API endpoint mappings
const V1_API_MAPPING = {
  '/api/v1/integrations': {
    newEndpoint: '/api/v2/integrations',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/v1-integrations',
    transformers: {
      request: transformV1IntegrationsRequest,
      response: transformV1IntegrationsResponse
    }
  },
  '/api/v1/financial': {
    newEndpoint: '/api/v2/integrations/finance',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/v1-financial',
    transformers: {
      request: transformV1FinancialRequest,
      response: transformV1FinancialResponse
    }
  },
  '/api/v1/intelligence': {
    newEndpoint: '/api/v2/integrations/analytics',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/v1-intelligence',
    transformers: {
      request: transformV1IntelligenceRequest,
      response: transformV1IntelligenceResponse
    }
  },
  '/api/v1/platform': {
    newEndpoint: '/api/v2/integrations',
    deprecationDate: '2025-12-31',
    migrationGuide: 'https://docs.act.place/api-migration/v1-platform',
    transformers: {
      request: transformV1PlatformRequest,
      response: transformV1PlatformResponse
    }
  }
};

/**
 * V1 API backward compatibility middleware
 */
export function createV1CompatibilityHandler(v1Endpoint, subPath = '') {
  const fullPath = v1Endpoint + (subPath ? '/' + subPath : '');
  const mapping = V1_API_MAPPING[v1Endpoint];

  if (!mapping) {
    throw new Error(`No V1 mapping found for endpoint: ${v1Endpoint}`);
  }

  return async (req, res, next) => {
    try {
      // Add v1 deprecation headers
      addV1DeprecationHeaders(res, mapping, fullPath);

      // Log v1 endpoint usage
      logV1EndpointUsage(req, fullPath, mapping);

      // Initialize unified service
      const service = initializeUnifiedService();

      // Parse the sub-path and method to determine the action
      const action = determineV1Action(v1Endpoint, subPath, req.method);

      // Transform request if needed
      const transformedRequest = mapping.transformers.request
        ? await mapping.transformers.request(req, res, action)
        : req;

      // Route to appropriate unified service method
      const result = await routeV1ToUnifiedService(service, action, transformedRequest);

      // Transform response if needed
      const transformedResponse = mapping.transformers.response
        ? await mapping.transformers.response(result, req, action)
        : result;

      // Send response with v1 compatibility format
      res.json(transformedResponse);

    } catch (error) {
      logger.error(`V1 compatibility error for ${fullPath}:`, error);

      // Send error in v1 format
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        details: error.details || null,
        timestamp: new Date().toISOString(),
        migration_info: {
          message: `V1 endpoint ${fullPath} is deprecated`,
          new_endpoint: mapping.newEndpoint,
          migration_guide: mapping.migrationGuide,
          deprecation_date: mapping.deprecationDate
        }
      });
    }
  };
}

/**
 * Determine the action based on v1 endpoint and sub-path
 */
function determineV1Action(v1Endpoint, subPath, method) {
  const key = `${v1Endpoint}${subPath ? '/' + subPath : ''}:${method}`;

  const actionMap = {
    // V1 Integrations
    '/api/v1/integrations/status:GET': 'getIntegrationStatus',
    '/api/v1/integrations/registry:GET': 'getServiceRegistry',
    '/api/v1/integrations/health:GET': 'getIntegrationHealth',
    '/api/v1/integrations/notion/proxy:POST': 'notionProxy',
    '/api/v1/integrations/notion/publish:POST': 'notionPublish',
    '/api/v1/integrations/notion/templates:GET': 'notionTemplates',
    '/api/v1/integrations/gmail/sync:POST': 'gmailSync',
    '/api/v1/integrations/gmail/intelligence:POST': 'gmailIntelligence',
    '/api/v1/integrations/xero/auth:GET': 'xeroAuth',
    '/api/v1/integrations/xero/organizations:GET': 'xeroOrganizations',

    // V1 Financial
    '/api/v1/financial/status:GET': 'getFinancialStatus',
    '/api/v1/financial/health:GET': 'getFinancialHealth',
    '/api/v1/financial/transactions:GET': 'getTransactions',
    '/api/v1/financial/transactions/sync:POST': 'syncTransactions',
    '/api/v1/financial/transactions/export:GET': 'exportTransactions',
    '/api/v1/financial/reports/summary:GET': 'getFinancialSummary',
    '/api/v1/financial/reports/cashflow:GET': 'getCashflow',
    '/api/v1/financial/reports/vendors:GET': 'getVendorReports',
    '/api/v1/financial/aging:GET': 'getAging',
    '/api/v1/financial/rules:GET': 'getCategorizationRules',
    '/api/v1/financial/rules:POST': 'createCategorizationRule',
    '/api/v1/financial/rules/apply:POST': 'applyCategorizationRules',

    // Default actions
    '/api/v1/intelligence:GET': 'getIntelligence',
    '/api/v1/platform:GET': 'getPlatformData'
  };

  return actionMap[key] || 'getGenericData';
}

/**
 * Route V1 requests to unified service
 */
async function routeV1ToUnifiedService(service, action, req) {
  switch (action) {
    // Integration actions
    case 'getIntegrationStatus':
    case 'getIntegrationHealth':
      return await service.getHealthStatus();

    case 'getServiceRegistry':
      return await service.getAvailableServices();

    // Contact/Gmail actions
    case 'gmailSync':
    case 'gmailIntelligence':
      return await service.getContacts(req.transformedFilters || { sources: ['gmail'] });

    // Project/Notion actions
    case 'notionProxy':
    case 'notionPublish':
    case 'notionTemplates':
      return await service.getProjects(req.transformedFilters || { sources: ['notion'] });

    // Financial actions
    case 'getFinancialStatus':
    case 'getFinancialHealth':
    case 'getTransactions':
    case 'syncTransactions':
    case 'exportTransactions':
    case 'getFinancialSummary':
    case 'getCashflow':
    case 'getVendorReports':
    case 'getAging':
    case 'getCategorizationRules':
    case 'createCategorizationRule':
    case 'applyCategorizationRules':
      return await service.getFinanceData(req.transformedFilters || { sources: ['xero'] });

    // Xero actions
    case 'xeroAuth':
    case 'xeroOrganizations':
      return await service.getFinanceData(req.transformedFilters || { sources: ['xero'], action: action });

    // Generic actions
    case 'getIntelligence':
      return await service.getAnalytics(req.transformedFilters || {});

    case 'getPlatformData':
      return await service.getContacts(req.transformedFilters || {});

    default:
      return await service.getHealthStatus();
  }
}

/**
 * V1 Request Transformers
 */

async function transformV1IntegrationsRequest(req, res, action) {
  const query = req.query;
  const body = req.body;

  req.transformedFilters = {
    action: action,
    ...query,
    ...body
  };

  return req;
}

async function transformV1FinancialRequest(req, res, action) {
  const query = req.query;

  req.transformedFilters = {
    sources: ['xero'],
    action: action,
    dateRange: {
      start: query.startDate || query.start_date,
      end: query.endDate || query.end_date
    },
    categories: query.categories?.split(','),
    limit: parseInt(query.limit) || 50,
    includeAnalytics: action.includes('report') || action.includes('summary')
  };

  return req;
}

async function transformV1IntelligenceRequest(req, res, action) {
  const query = req.query;

  req.transformedFilters = {
    sources: ['linkedin', 'notion', 'xero'],
    includeAnalytics: true,
    limit: parseInt(query.limit) || 50
  };

  return req;
}

async function transformV1PlatformRequest(req, res, action) {
  const query = req.query;

  req.transformedFilters = {
    sources: ['linkedin', 'notion', 'gmail'],
    limit: parseInt(query.limit) || 50
  };

  return req;
}

/**
 * V1 Response Transformers
 */

async function transformV1IntegrationsResponse(unifiedData, req, action) {
  // Transform based on the specific v1 integrations action
  if (action === 'getIntegrationStatus' || action === 'getIntegrationHealth') {
    return {
      success: true,
      overall_status: unifiedData.status === 'healthy' ? 'operational' : 'degraded',
      integrations: {
        notion: {
          available: Boolean(process.env.NOTION_API_KEY),
          status: process.env.NOTION_API_KEY ? 'configured' : 'not_configured',
          endpoints: ['proxy', 'calendar', 'publish', 'templates']
        },
        gmail: {
          available: Boolean(process.env.GMAIL_CLIENT_ID),
          status: process.env.GMAIL_CLIENT_ID ? 'configured' : 'not_configured',
          endpoints: ['sync', 'intelligence', 'linkedin-integration']
        },
        xero: {
          available: Boolean(process.env.XERO_CLIENT_ID),
          status: process.env.XERO_CLIENT_ID ? 'configured' : 'not_configured',
          endpoints: ['auth', 'accounting']
        }
      },
      timestamp: new Date().toISOString(),
      migration_info: {
        message: "V1 integrations API is deprecated. Please migrate to /api/v2/integrations",
        new_endpoint: "/api/v2/integrations"
      }
    };
  }

  return {
    success: true,
    data: unifiedData.data || unifiedData,
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "V1 integrations API is deprecated. Please migrate to /api/v2/integrations",
      new_endpoint: "/api/v2/integrations"
    }
  };
}

async function transformV1FinancialResponse(unifiedData, req, action) {
  // Transform based on the specific v1 financial action
  if (action === 'getFinancialStatus' || action === 'getFinancialHealth') {
    return {
      success: true,
      financial: {
        xeroStatus: unifiedData.status === 'healthy' ? 'connected' : 'disconnected',
        xeroInfo: unifiedData.metadata || {},
        features: [
          'Xero transaction management',
          'Automated receipt processing',
          'Financial reporting and analytics',
          'Rule-based categorisation'
        ]
      },
      timestamp: new Date().toISOString(),
      migration_info: {
        message: "V1 financial API is deprecated. Please migrate to /api/v2/integrations/finance",
        new_endpoint: "/api/v2/integrations/finance"
      }
    };
  }

  if (action === 'getTransactions') {
    return {
      success: true,
      transactions: unifiedData.data?.map(transaction => ({
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        contact: transaction.contactName,
        status: transaction.status,
        type: transaction.type,
        bank_account: transaction.bankAccount,
        suggested_category: transaction.category,
        confidence: transaction.confidence
      })) || [],
      pagination: unifiedData.pagination,
      timestamp: new Date().toISOString(),
      migration_info: {
        message: "V1 financial API is deprecated. Please migrate to /api/v2/integrations/finance",
        new_endpoint: "/api/v2/integrations/finance"
      }
    };
  }

  return {
    success: true,
    data: unifiedData.data || unifiedData,
    summary: unifiedData.summary,
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "V1 financial API is deprecated. Please migrate to /api/v2/integrations/finance",
      new_endpoint: "/api/v2/integrations/finance"
    }
  };
}

async function transformV1IntelligenceResponse(unifiedData, req, action) {
  return {
    success: true,
    intelligence: unifiedData.analytics || unifiedData.data,
    insights: unifiedData.insights || [],
    recommendations: unifiedData.recommendations || [],
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "V1 intelligence API is deprecated. Please migrate to /api/v2/integrations/analytics",
      new_endpoint: "/api/v2/integrations/analytics"
    }
  };
}

async function transformV1PlatformResponse(unifiedData, req, action) {
  return {
    success: true,
    platform_data: unifiedData.data || unifiedData,
    metadata: unifiedData.metadata,
    timestamp: new Date().toISOString(),
    migration_info: {
      message: "V1 platform API is deprecated. Please migrate to /api/v2/integrations",
      new_endpoint: "/api/v2/integrations"
    }
  };
}

/**
 * Add V1 specific deprecation headers
 */
function addV1DeprecationHeaders(res, mapping, fullPath) {
  const deprecationDate = new Date(mapping.deprecationDate);
  const now = new Date();
  const daysUntilDeprecation = Math.ceil((deprecationDate - now) / (1000 * 60 * 60 * 24));

  res.setHeader('Deprecation', `date="${mapping.deprecationDate}"`);
  res.setHeader('Sunset', mapping.deprecationDate);
  res.setHeader('Link', `<${mapping.newEndpoint}>; rel="successor-version"`);
  res.setHeader('X-API-Migration-Guide', mapping.migrationGuide);
  res.setHeader('X-Days-Until-Deprecation', daysUntilDeprecation.toString());
  res.setHeader('X-API-Version', 'v1-deprecated');

  // Add stronger warning for v1 endpoints
  if (daysUntilDeprecation < 120) {
    res.setHeader('Warning', `299 - "V1 API endpoint ${fullPath} is deprecated and will be removed on ${mapping.deprecationDate}. Please migrate to ${mapping.newEndpoint} immediately."`);
  }
}

/**
 * Log V1 endpoint usage
 */
function logV1EndpointUsage(req, fullPath, mapping) {
  logger.warn(`V1 API endpoint accessed`, {
    endpoint: fullPath,
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
 * Create comprehensive compatibility wrapper that handles both legacy and v1 endpoints
 */
export function createUniversalCompatibilityWrapper(endpoint, subPath = '') {
  // Determine if this is a v1 endpoint or legacy endpoint
  if (endpoint.includes('/api/v1/')) {
    return createV1CompatibilityHandler(endpoint, subPath);
  } else if (LEGACY_ENDPOINT_MAPPING[endpoint]) {
    return createBackwardCompatibilityHandler(endpoint);
  } else {
    throw new Error(`No compatibility handler found for endpoint: ${endpoint}`);
  }
}

// Named exports for ES6 imports
export { V1_API_MAPPING };

export default {
  createV1CompatibilityHandler,
  createUniversalCompatibilityWrapper,
  V1_API_MAPPING
};