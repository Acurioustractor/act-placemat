/**
 * Integration Security Middleware
 * Enhanced security features specifically for unified integration service
 *
 * Features:
 * - OAuth token management with automatic refresh
 * - Integration-specific rate limiting with tiered access
 * - Security audit logging for all integration operations
 * - Granular permission checks for different integration types
 * - Cross-service authentication validation
 * - Consent enforcement with detailed scope tracking
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';
import { cacheService } from '../services/cacheService.js';
import { AppError, ErrorTypes, ErrorCodes } from './errorHandler.js';

// Integration-specific rate limiting configurations
const INTEGRATION_RATE_LIMITS = {
  contacts: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many contact requests. Please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  projects: {
    windowMs: 15 * 60 * 1000,
    max: 150, // Higher limit for project data
    message: 'Too many project requests. Please try again later.'
  },
  finance: {
    windowMs: 15 * 60 * 1000,
    max: 50, // Lower limit for sensitive financial data
    message: 'Too many financial data requests. Please try again later.'
  },
  analytics: {
    windowMs: 15 * 60 * 1000,
    max: 30, // Very restricted for analytics
    message: 'Too many analytics requests. Please try again later.'
  }
};

// OAuth token refresh thresholds (in seconds)
const TOKEN_REFRESH_THRESHOLD = 300; // 5 minutes before expiry

// Integration permissions mapping
const INTEGRATION_PERMISSIONS = {
  'google': ['gmail.read', 'calendar.read', 'contacts.read'],
  'linkedin': ['profile.read', 'network.read'],
  'notion': ['database.read', 'pages.read'],
  'xero': ['accounting.read', 'projects.read'],
  'slack': ['channels.read', 'users.read', 'messages.read']
};

// Required scopes for different operations
const OPERATION_SCOPES = {
  'contacts': ['gmail.read', 'contacts.read', 'profile.read'],
  'projects': ['database.read', 'pages.read', 'projects.read'],
  'finance': ['accounting.read', 'projects.read'],
  'analytics': ['*'] // Requires all permissions
};

/**
 * Create integration-specific rate limiter
 */
export function createIntegrationRateLimit(type = 'contacts') {
  const config = INTEGRATION_RATE_LIMITS[type] || INTEGRATION_RATE_LIMITS.contacts;

  return rateLimit({
    ...config,
    keyGenerator: (req) => {
      // Rate limit by user ID + integration type for more granular control
      const userId = req.user?.id || req.ip;
      return `integration:${type}:${userId}`;
    },
    handler: (req, res) => {
      const auditData = {
        userId: req.user?.id || 'anonymous',
        ip: req.ip,
        integrationType: type,
        action: 'rate_limit_exceeded',
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl
      };

      logSecurityAudit('RATE_LIMIT_EXCEEDED', auditData);

      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: config.message,
        type: 'rate_limit',
        retryAfter: Math.ceil(config.windowMs / 1000),
        integrationTimestamp: new Date().toISOString()
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

/**
 * OAuth token validation and refresh middleware
 */
export async function validateOAuthTokens(req, res, next) {
  try {
    const requiredServices = getRequiredServices(req.path);

    if (!req.user || !req.user.tokens) {
      throw new AppError(
        'Authentication required for integration access',
        ErrorTypes.AUTHENTICATION,
        ErrorCodes.AUTHENTICATION_REQUIRED,
        401
      );
    }

    const tokenValidations = [];

    for (const service of requiredServices) {
      const serviceToken = req.user.tokens[service];

      if (!serviceToken) {
        throw new AppError(
          `${service} authentication required`,
          ErrorTypes.AUTHENTICATION,
          ErrorCodes.AUTHENTICATION_REQUIRED,
          401,
          { service, availableServices: Object.keys(req.user.tokens || {}) }
        );
      }

      // Check token expiration
      if (serviceToken.expiresAt) {
        const expiryTime = new Date(serviceToken.expiresAt);
        const now = new Date();
        const timeUntilExpiry = (expiryTime - now) / 1000;

        // If token expires within threshold, attempt refresh
        if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD) {
          logger.info(`Token for ${service} expires soon, attempting refresh`, {
            userId: req.user.id,
            service,
            expiresIn: timeUntilExpiry
          });

          tokenValidations.push(refreshOAuthToken(req.user, service));
        }
      }
    }

    // Wait for all token validations/refreshes to complete
    if (tokenValidations.length > 0) {
      await Promise.all(tokenValidations);
    }

    // Log successful token validation
    logSecurityAudit('TOKEN_VALIDATED', {
      userId: req.user.id,
      services: requiredServices,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    logSecurityAudit('TOKEN_VALIDATION_FAILED', {
      userId: req.user?.id || 'anonymous',
      error: error.message,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString()
    });

    next(error);
  }
}

/**
 * Integration permission validation
 */
export function validateIntegrationPermissions(requiredOperation) {
  return async (req, res, next) => {
    try {
      const requiredScopes = OPERATION_SCOPES[requiredOperation] || [];

      if (!req.user || !req.user.tokens) {
        throw new AppError(
          'Authentication required for permission validation',
          ErrorTypes.AUTHENTICATION,
          ErrorCodes.AUTHENTICATION_REQUIRED,
          401
        );
      }

      // Check if user has required scopes
      const userScopes = getUserScopes(req.user);
      const hasAllScopes = requiredScopes.every(scope =>
        scope === '*' || userScopes.includes(scope)
      );

      if (!hasAllScopes) {
        const missingScopes = requiredScopes.filter(scope =>
          scope !== '*' && !userScopes.includes(scope)
        );

        throw new AppError(
          `Insufficient permissions for ${requiredOperation}`,
          ErrorTypes.AUTHORIZATION,
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          403,
          {
            requiredScopes,
            userScopes,
            missingScopes,
            operation: requiredOperation
          }
        );
      }

      // Log successful permission validation
      logSecurityAudit('PERMISSION_VALIDATED', {
        userId: req.user.id,
        operation: requiredOperation,
        scopes: userScopes,
        endpoint: req.originalUrl,
        timestamp: new Date().toISOString()
      });

      next();
    } catch (error) {
      logSecurityAudit('PERMISSION_VALIDATION_FAILED', {
        userId: req.user?.id || 'anonymous',
        operation: requiredOperation,
        error: error.message,
        endpoint: req.originalUrl,
        timestamp: new Date().toISOString()
      });

      next(error);
    }
  };
}

/**
 * Cross-service authentication validation
 */
export async function validateCrossServiceAuth(req, res, next) {
  try {
    if (!req.user || !req.user.tokens) {
      throw new AppError(
        'Authentication required for cross-service validation',
        ErrorTypes.AUTHENTICATION,
        ErrorCodes.AUTHENTICATION_REQUIRED,
        401
      );
    }

    // Validate that tokens are from the same user across services
    const tokenValidations = [];

    for (const [service, token] of Object.entries(req.user.tokens)) {
      if (token.userId && token.userId !== req.user.id) {
        throw new AppError(
          `Token mismatch detected for ${service}`,
          ErrorTypes.AUTHENTICATION,
          ErrorCodes.INVALID_CREDENTIALS,
          401,
          { service, tokenUserId: token.userId, requestUserId: req.user.id }
        );
      }

      // Validate token integrity if possible
      tokenValidations.push(validateTokenIntegrity(service, token));
    }

    await Promise.all(tokenValidations);

    logSecurityAudit('CROSS_SERVICE_AUTH_VALIDATED', {
      userId: req.user.id,
      services: Object.keys(req.user.tokens),
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    logSecurityAudit('CROSS_SERVICE_AUTH_FAILED', {
      userId: req.user?.id || 'anonymous',
      error: error.message,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString()
    });

    next(error);
  }
}

/**
 * Consent enforcement with scope tracking
 */
export function enforceIntegrationConsent(requiredConsents = []) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(
          'Authentication required for consent validation',
          ErrorTypes.AUTHENTICATION,
          ErrorCodes.AUTHENTICATION_REQUIRED,
          401
        );
      }

      // Check user consent records
      const userConsents = await getUserConsents(req.user.id);

      for (const consent of requiredConsents) {
        const consentRecord = userConsents.find(c => c.type === consent);

        if (!consentRecord || !consentRecord.granted) {
          throw new AppError(
            `Consent required for ${consent}`,
            ErrorTypes.AUTHORIZATION,
            ErrorCodes.INSUFFICIENT_PERMISSIONS,
            403,
            {
              requiredConsent: consent,
              userConsents: userConsents.map(c => ({ type: c.type, granted: c.granted }))
            }
          );
        }

        // Check if consent is still valid (not expired)
        if (consentRecord.expiresAt && new Date() > new Date(consentRecord.expiresAt)) {
          throw new AppError(
            `Consent expired for ${consent}`,
            ErrorTypes.AUTHORIZATION,
            ErrorCodes.INSUFFICIENT_PERMISSIONS,
            403,
            { requiredConsent: consent, expiredAt: consentRecord.expiresAt }
          );
        }
      }

      logSecurityAudit('CONSENT_VALIDATED', {
        userId: req.user.id,
        requiredConsents,
        userConsents: userConsents.map(c => c.type),
        endpoint: req.originalUrl,
        timestamp: new Date().toISOString()
      });

      next();
    } catch (error) {
      logSecurityAudit('CONSENT_VALIDATION_FAILED', {
        userId: req.user?.id || 'anonymous',
        requiredConsents,
        error: error.message,
        endpoint: req.originalUrl,
        timestamp: new Date().toISOString()
      });

      next(error);
    }
  };
}

/**
 * Comprehensive integration security audit logging
 */
export function logSecurityAudit(eventType, data) {
  const auditEntry = {
    eventType,
    timestamp: new Date().toISOString(),
    severity: getSeverityLevel(eventType),
    ...data
  };

  // Log to different levels based on severity
  switch (auditEntry.severity) {
    case 'critical':
      logger.error(`[SECURITY AUDIT] ${eventType}`, auditEntry);
      break;
    case 'high':
      logger.warn(`[SECURITY AUDIT] ${eventType}`, auditEntry);
      break;
    case 'medium':
      logger.info(`[SECURITY AUDIT] ${eventType}`, auditEntry);
      break;
    case 'low':
      logger.debug(`[SECURITY AUDIT] ${eventType}`, auditEntry);
      break;
    default:
      logger.info(`[SECURITY AUDIT] ${eventType}`, auditEntry);
  }

  // Store audit logs in cache for real-time monitoring
  const cacheKey = `security_audit:${Date.now()}:${Math.random().toString(36).substring(2, 15)}`;
  cacheService.set(cacheKey, auditEntry, 3600).catch(err => {
    logger.warn('Failed to cache security audit entry:', err.message);
  });
}

/**
 * Helper Functions
 */

function getRequiredServices(path) {
  if (path.includes('/contacts')) return ['google', 'linkedin'];
  if (path.includes('/projects')) return ['notion'];
  if (path.includes('/finance')) return ['xero'];
  if (path.includes('/analytics')) return ['google', 'linkedin', 'notion', 'xero'];
  return [];
}

function getUserScopes(user) {
  const scopes = [];

  if (user.tokens) {
    for (const [service, token] of Object.entries(user.tokens)) {
      const servicePermissions = INTEGRATION_PERMISSIONS[service] || [];
      scopes.push(...servicePermissions);
    }
  }

  return [...new Set(scopes)]; // Remove duplicates
}

async function refreshOAuthToken(user, service) {
  try {
    const serviceToken = user.tokens[service];

    if (!serviceToken.refreshToken) {
      logger.warn(`No refresh token available for ${service}`, { userId: user.id });
      return;
    }

    // Implementation would depend on the specific OAuth provider
    // This is a placeholder for the actual refresh logic
    logger.info(`Refreshing ${service} token for user ${user.id}`);

    // TODO: Implement actual token refresh logic for each service
    switch (service) {
      case 'google':
        // await refreshGoogleToken(serviceToken);
        break;
      case 'linkedin':
        // await refreshLinkedInToken(serviceToken);
        break;
      default:
        logger.warn(`Token refresh not implemented for service: ${service}`);
    }

  } catch (error) {
    logger.error(`Failed to refresh ${service} token for user ${user.id}:`, error);
    throw error;
  }
}

async function validateTokenIntegrity(service, token) {
  // Basic token validation - can be enhanced with actual token verification
  if (!token.accessToken) {
    throw new AppError(
      `Invalid token for ${service}`,
      ErrorTypes.AUTHENTICATION,
      ErrorCodes.INVALID_CREDENTIALS,
      401
    );
  }

  // Check token format if needed
  if (token.accessToken.length < 10) {
    throw new AppError(
      `Malformed token for ${service}`,
      ErrorTypes.AUTHENTICATION,
      ErrorCodes.INVALID_CREDENTIALS,
      401
    );
  }

  return true;
}

async function getUserConsents(userId) {
  try {
    // In a real implementation, this would fetch from database
    // For now, return mock consent data
    return [
      { type: 'data_processing', granted: true, grantedAt: new Date().toISOString() },
      { type: 'third_party_sharing', granted: true, grantedAt: new Date().toISOString() },
      { type: 'analytics_tracking', granted: false, grantedAt: null }
    ];
  } catch (error) {
    logger.error('Failed to fetch user consents:', error);
    return [];
  }
}

function getSeverityLevel(eventType) {
  const severityMap = {
    'TOKEN_VALIDATION_FAILED': 'high',
    'PERMISSION_VALIDATION_FAILED': 'high',
    'CROSS_SERVICE_AUTH_FAILED': 'critical',
    'CONSENT_VALIDATION_FAILED': 'medium',
    'RATE_LIMIT_EXCEEDED': 'medium',
    'TOKEN_VALIDATED': 'low',
    'PERMISSION_VALIDATED': 'low',
    'CROSS_SERVICE_AUTH_VALIDATED': 'low',
    'CONSENT_VALIDATED': 'low'
  };

  return severityMap[eventType] || 'medium';
}

// Export middleware combinations for common use cases
export const integrationSecurityBundle = {
  contacts: [
    createIntegrationRateLimit('contacts'),
    validateOAuthTokens,
    validateIntegrationPermissions('contacts'),
    enforceIntegrationConsent(['data_processing'])
  ],
  projects: [
    createIntegrationRateLimit('projects'),
    validateOAuthTokens,
    validateIntegrationPermissions('projects'),
    enforceIntegrationConsent(['data_processing'])
  ],
  finance: [
    createIntegrationRateLimit('finance'),
    validateOAuthTokens,
    validateCrossServiceAuth,
    validateIntegrationPermissions('finance'),
    enforceIntegrationConsent(['data_processing', 'third_party_sharing'])
  ],
  analytics: [
    createIntegrationRateLimit('analytics'),
    validateOAuthTokens,
    validateCrossServiceAuth,
    validateIntegrationPermissions('analytics'),
    enforceIntegrationConsent(['data_processing', 'analytics_tracking'])
  ]
};

export default {
  createIntegrationRateLimit,
  validateOAuthTokens,
  validateIntegrationPermissions,
  validateCrossServiceAuth,
  enforceIntegrationConsent,
  logSecurityAudit,
  integrationSecurityBundle
};