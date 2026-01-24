/**
 * Compatibility Interceptor Middleware
 * Automatically intercepts v1 API requests and adds backward compatibility features
 *
 * This middleware runs before existing v1 route handlers to:
 * - Add deprecation headers
 * - Log usage for migration tracking
 * - Inject migration information into responses
 * - Provide fallback handling when v1 endpoints fail
 */

import { createV1CompatibilityHandler, V1_API_MAPPING } from './v1ApiCompatibility.js';

// Temporary logger workaround
const logger = console;

/**
 * Intercept v1 API requests and add compatibility features
 */
export function v1CompatibilityInterceptor(req, res, next) {
  const originalPath = req.path;

  // Check if this is a v1 API request
  if (!originalPath.startsWith('/api/v1/')) {
    return next();
  }

  // Determine the base v1 endpoint
  const baseEndpoint = getBaseV1Endpoint(originalPath);
  const subPath = getV1SubPath(originalPath, baseEndpoint);

  // Check if we have a mapping for this endpoint
  const mapping = V1_API_MAPPING[baseEndpoint];
  if (!mapping) {
    return next(); // Let the original handler deal with it
  }

  // Add deprecation headers to all v1 responses
  addV1DeprecationHeaders(res, mapping, originalPath);

  // Log v1 endpoint usage
  logV1EndpointUsage(req, originalPath, mapping);

  // Intercept the response to add migration information
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function(data) {
    const modifiedData = addMigrationInfoToResponse(data, mapping, originalPath);
    return originalSend.call(this, modifiedData);
  };

  res.json = function(data) {
    const modifiedData = addMigrationInfoToResponse(data, mapping, originalPath);
    return originalJson.call(this, modifiedData);
  };

  // Continue to the original handler
  next();
}

/**
 * Create a fallback handler for v1 endpoints that don't exist or fail
 */
export function v1FallbackHandler(req, res, next) {
  const originalPath = req.path;

  // Only handle v1 API requests
  if (!originalPath.startsWith('/api/v1/')) {
    return next();
  }

  const baseEndpoint = getBaseV1Endpoint(originalPath);
  const subPath = getV1SubPath(originalPath, baseEndpoint);
  const mapping = V1_API_MAPPING[baseEndpoint];

  if (mapping) {
    // Try to handle with unified service
    try {
      const compatibilityHandler = createV1CompatibilityHandler(baseEndpoint, subPath);
      return compatibilityHandler(req, res, next);
    } catch (error) {
      logger.error(`V1 fallback handler failed for ${originalPath}:`, error);
    }
  }

  // If we get here, provide a helpful migration response
  res.status(404).json({
    success: false,
    error: 'V1 endpoint not found or no longer supported',
    message: `The requested V1 endpoint ${originalPath} is not available`,
    migration_info: mapping ? {
      new_endpoint: mapping.newEndpoint,
      migration_guide: mapping.migrationGuide,
      deprecation_date: mapping.deprecationDate
    } : {
      message: 'Please check the API documentation for current endpoints',
      documentation: 'https://docs.act.place/api/v2',
      contact: 'api-support@act.place'
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Extract base v1 endpoint from full path
 */
function getBaseV1Endpoint(path) {
  const pathParts = path.split('/');
  // For /api/v1/integrations/notion/proxy -> /api/v1/integrations
  if (pathParts.length >= 4) {
    return `/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}`;
  }
  return path;
}

/**
 * Extract sub-path from full path
 */
function getV1SubPath(fullPath, baseEndpoint) {
  if (fullPath.length <= baseEndpoint.length) {
    return '';
  }
  const subPath = fullPath.substring(baseEndpoint.length + 1);
  return subPath.replace(/^\//, ''); // Remove leading slash
}

/**
 * Add deprecation headers to v1 responses
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

  // Add warning for endpoints close to deprecation
  if (daysUntilDeprecation < 90) {
    res.setHeader('Warning', `299 - "V1 API endpoint ${fullPath} will be removed on ${mapping.deprecationDate}. Please migrate to ${mapping.newEndpoint}"`);
  }
}

/**
 * Log v1 endpoint usage for analytics
 */
function logV1EndpointUsage(req, fullPath, mapping) {
  logger.warn(`V1 API endpoint accessed (intercepted)`, {
    endpoint: fullPath,
    method: req.method,
    newEndpoint: mapping.newEndpoint,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    deprecationDate: mapping.deprecationDate,
    timestamp: new Date().toISOString()
  });
}

/**
 * Add migration information to response data
 */
function addMigrationInfoToResponse(data, mapping, originalPath) {
  let responseData;

  // Handle different data types
  if (typeof data === 'string') {
    try {
      responseData = JSON.parse(data);
    } catch {
      // If it's not JSON, wrap it
      responseData = { data: data };
    }
  } else if (typeof data === 'object' && data !== null) {
    responseData = { ...data };
  } else {
    responseData = { data: data };
  }

  // Add migration info if not already present
  if (!responseData.migration_info) {
    responseData.migration_info = {
      message: `V1 endpoint ${originalPath} is deprecated`,
      new_endpoint: mapping.newEndpoint,
      migration_guide: mapping.migrationGuide,
      deprecation_date: mapping.deprecationDate,
      days_until_deprecation: Math.ceil((new Date(mapping.deprecationDate) - new Date()) / (1000 * 60 * 60 * 24))
    };
  }

  // Return as string if original was string
  return typeof data === 'string' ? JSON.stringify(responseData) : responseData;
}

/**
 * Middleware to apply v1 compatibility globally
 */
export function applyV1Compatibility(app) {
  // Add the interceptor before v1 routes
  app.use('/api/v1/*', v1CompatibilityInterceptor);

  // Add fallback handler after all v1 routes (this should be applied last)
  app.use('/api/v1/*', v1FallbackHandler);

  logger.info('V1 API backward compatibility middleware applied');
}

/**
 * Create a wrapper for existing v1 route handlers
 */
export function wrapV1RouteHandler(originalHandler, endpointPath) {
  return async (req, res, next) => {
    try {
      // First try the original handler
      await originalHandler(req, res, next);
    } catch (error) {
      logger.error(`V1 route handler failed for ${endpointPath}:`, error);

      // If original handler fails, try the compatibility handler
      const baseEndpoint = getBaseV1Endpoint(endpointPath);
      const subPath = getV1SubPath(endpointPath, baseEndpoint);
      const mapping = V1_API_MAPPING[baseEndpoint];

      if (mapping) {
        try {
          const compatibilityHandler = createV1CompatibilityHandler(baseEndpoint, subPath);
          return await compatibilityHandler(req, res, next);
        } catch (compatibilityError) {
          logger.error(`V1 compatibility handler also failed:`, compatibilityError);
        }
      }

      // If both fail, send a helpful error response
      res.status(500).json({
        success: false,
        error: 'V1 endpoint encountered an error',
        message: error.message,
        migration_info: mapping ? {
          message: 'Consider migrating to the new v2 API for better reliability',
          new_endpoint: mapping.newEndpoint,
          migration_guide: mapping.migrationGuide
        } : null,
        timestamp: new Date().toISOString()
      });
    }
  };
}

export default {
  v1CompatibilityInterceptor,
  v1FallbackHandler,
  applyV1Compatibility,
  wrapV1RouteHandler
};