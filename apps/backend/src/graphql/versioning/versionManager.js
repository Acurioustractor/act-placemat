/**
 * GraphQL API Version Manager
 * Handles schema versioning and backward compatibility for the ACT ecosystem
 */

import { mergeSchemas } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';

// Version configurations
export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2', // Future version
  LATEST: 'v1', // Current latest version
};

// Deprecation warnings
export const DEPRECATION_WARNINGS = {
  // Track deprecated fields and their replacements
  'User.profile_image': {
    reason: 'Use User.avatar instead',
    deprecatedInVersion: 'v1.1',
    removedInVersion: 'v2.0',
  },
  'Project.owner': {
    reason: 'Use Project.createdBy instead',
    deprecatedInVersion: 'v1.2',
    removedInVersion: 'v2.0',
  },
};

// Version-specific feature flags
export const VERSION_FEATURES = {
  v1: {
    culturalSafetyScoring: true,
    advancedSearch: false,
    realTimeCollaboration: false,
    aiInsights: false,
  },
  v2: {
    culturalSafetyScoring: true,
    advancedSearch: true,
    realTimeCollaboration: true,
    aiInsights: true,
  },
};

/**
 * Gets the API version from request headers or defaults to latest
 */
export function getAPIVersion(req) {
  const headerVersion = req.headers['api-version'] || req.headers['x-api-version'];
  const queryVersion = req.query.version;

  // Priority: query param > header > latest
  const requestedVersion = queryVersion || headerVersion || API_VERSIONS.LATEST;

  // Validate version
  if (!Object.values(API_VERSIONS).includes(requestedVersion)) {
    return API_VERSIONS.LATEST;
  }

  return requestedVersion;
}

/**
 * Version-specific middleware for Express
 */
export function apiVersionMiddleware(req, res, next) {
  req.apiVersion = getAPIVersion(req);

  // Add version info to response headers
  res.set('API-Version', req.apiVersion);
  res.set('API-Supported-Versions', Object.values(API_VERSIONS).join(', '));

  // Add deprecation warnings if using deprecated features
  const deprecationWarnings = [];
  Object.entries(DEPRECATION_WARNINGS).forEach(([field, info]) => {
    if (req.body?.query?.includes(field)) {
      deprecationWarnings.push(`${field}: ${info.reason}`);
    }
  });

  if (deprecationWarnings.length > 0) {
    res.set('Deprecation-Warning', deprecationWarnings.join('; '));
  }

  next();
}

/**
 * Creates version-aware GraphQL context
 */
export function createVersionedContext(baseContext, req) {
  const version = req.apiVersion || API_VERSIONS.LATEST;

  return {
    ...baseContext,
    version,
    features: VERSION_FEATURES[version] || VERSION_FEATURES[API_VERSIONS.LATEST],
    isFeatureEnabled: feature => {
      const versionFeatures =
        VERSION_FEATURES[version] || VERSION_FEATURES[API_VERSIONS.LATEST];
      return versionFeatures[feature] || false;
    },
    addDeprecationWarning: (field, reason) => {
      if (!req.deprecationWarnings) {
        req.deprecationWarnings = [];
      }
      req.deprecationWarnings.push({ field, reason });
    },
  };
}

/**
 * Version-specific schema transformations
 */
export function transformSchemaForVersion(schema, version) {
  switch (version) {
    case 'v1':
      // V1 schema - current production schema
      return schema;

    case 'v2':
      // V2 schema - future enhancements (placeholder for now)
      return schema;

    default:
      return schema;
  }
}

/**
 * Schema versioning utilities
 */
export class SchemaVersionManager {
  constructor() {
    this.schemas = new Map();
    this.resolvers = new Map();
  }

  // Register a versioned schema
  registerVersion(version, typeDefs, resolvers) {
    this.schemas.set(version, typeDefs);
    this.resolvers.set(version, resolvers);
  }

  // Get schema for specific version
  getVersionedSchema(version) {
    const typeDefs = this.schemas.get(version);
    const resolvers = this.resolvers.get(version);

    if (!typeDefs || !resolvers) {
      throw new Error(`Schema version ${version} not found`);
    }

    return { typeDefs, resolvers };
  }

  // Get all supported versions
  getSupportedVersions() {
    return Array.from(this.schemas.keys());
  }

  // Check if version is supported
  isVersionSupported(version) {
    return this.schemas.has(version);
  }
}

// Global schema version manager instance
export const schemaVersionManager = new SchemaVersionManager();

/**
 * Backwards compatibility utilities
 */
export class BackwardsCompatibilityManager {
  constructor() {
    this.fieldMappings = new Map();
    this.typeTransformations = new Map();
  }

  // Add field mapping for backwards compatibility
  addFieldMapping(oldField, newField, transformation = null) {
    this.fieldMappings.set(oldField, { newField, transformation });
  }

  // Add type transformation
  addTypeTransformation(oldType, newType, transformation) {
    this.typeTransformations.set(oldType, { newType, transformation });
  }

  // Apply backwards compatibility transformations
  transformResult(result, version) {
    if (version === API_VERSIONS.LATEST) {
      return result; // No transformation needed for latest version
    }

    // Apply field mappings and transformations
    return this.applyTransformations(result, version);
  }

  applyTransformations(obj, version) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.applyTransformations(item, version));
    }

    const transformed = { ...obj };

    // Apply field mappings
    this.fieldMappings.forEach((mapping, oldField) => {
      if (oldField in transformed && mapping.newField in transformed) {
        // If both old and new fields exist, prefer new field but keep old for compatibility
        if (mapping.transformation) {
          transformed[oldField] = mapping.transformation(transformed[mapping.newField]);
        } else {
          transformed[oldField] = transformed[mapping.newField];
        }
      }
    });

    // Recursively transform nested objects
    Object.keys(transformed).forEach(key => {
      transformed[key] = this.applyTransformations(transformed[key], version);
    });

    return transformed;
  }
}

// Global backwards compatibility manager
export const compatibilityManager = new BackwardsCompatibilityManager();

// Setup default field mappings for backwards compatibility
compatibilityManager.addFieldMapping('User.profile_image', 'User.avatar');
compatibilityManager.addFieldMapping('Project.owner', 'Project.createdBy');

/**
 * Version-aware error handling
 */
export function formatVersionedError(error, version) {
  const baseError = {
    message: error.message,
    path: error.path,
    timestamp: new Date().toISOString(),
    version,
  };

  // Add version-specific error information
  switch (version) {
    case 'v1':
      // V1 error format - simplified
      return {
        ...baseError,
        code: error.extensions?.code || 'UNKNOWN_ERROR',
      };

    case 'v2':
      // V2 error format - enhanced with more details
      return {
        ...baseError,
        code: error.extensions?.code || 'UNKNOWN_ERROR',
        category: error.extensions?.category || 'APPLICATION',
        details: error.extensions?.details || {},
        suggestions: error.extensions?.suggestions || [],
      };

    default:
      return baseError;
  }
}

/**
 * Generate version documentation
 */
export function generateVersionDocumentation() {
  return {
    currentVersion: API_VERSIONS.LATEST,
    supportedVersions: Object.values(API_VERSIONS),
    versioningStrategy: 'Header-based versioning with query parameter fallback',

    headers: {
      'API-Version': 'Specify the API version to use (e.g., "v1")',
      'X-API-Version': 'Alternative header for API version',
    },

    queryParameters: {
      version: 'Specify API version via query parameter (e.g., ?version=v1)',
    },

    deprecations: Object.entries(DEPRECATION_WARNINGS).map(([field, info]) => ({
      field,
      reason: info.reason,
      deprecatedIn: info.deprecatedInVersion,
      removedIn: info.removedInVersion,
    })),

    features: VERSION_FEATURES,

    compatibilityNotes: [
      'Field mappings are automatically applied for backwards compatibility',
      'Deprecated fields will include warnings in response headers',
      'Breaking changes are only introduced in major version updates',
    ],

    migrationGuides: {
      'v1-to-v2': {
        description: 'Migration guide from v1 to v2',
        changes: [
          'Enhanced search capabilities with AI-powered insights',
          'Real-time collaboration features',
          'Improved cultural safety scoring algorithms',
        ],
        breakingChanges: [
          'Removal of deprecated User.profile_image field',
          'Project.owner field replaced with Project.createdBy',
        ],
      },
    },
  };
}
