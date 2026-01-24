/**
 * Security Middleware
 * Express middleware for applying security guardrails to all API requests
 */

import securityGuardrailsService from '../services/securityGuardrailsService.js';
import tracingService from '../services/tracingService.js';

/**
 * Input validation and sanitization middleware
 */
export const inputValidationMiddleware = async (req, res, next) => {
  try {
    const span = tracingService.startSpan('middleware.input_validation', {
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.user_agent': req.headers['user-agent'],
        'middleware.type': 'security_input_validation'
      }
    });

    // Get user ID from token if available
    const userId = req.user?.id || req.headers['x-user-id'] || null;
    const endpoint = req.route?.path || req.url;
    
    // Skip validation for health check endpoints
    if (endpoint.includes('/health') || endpoint.includes('/status')) {
      span.end();
      return next();
    }

    // Validate and sanitize request body
    if (req.body && Object.keys(req.body).length > 0) {
      try {
        const validation = await securityGuardrailsService.validateApiInput(
          req.body, 
          endpoint, 
          userId
        );
        
        // Replace request body with sanitized version
        req.body = validation.sanitizedInput;
        req.securityValidation = validation;
        
        span.setAttributes({
          'security.body_validated': true,
          'security.body_sanitized': validation.sanitizedInput !== validation.originalInput
        });
        
      } catch (error) {
        span.recordException(error);
        span.setStatus('ERROR');
        span.end();
        
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          message: error.message,
          code: 'SECURITY_VALIDATION_FAILED'
        });
      }
    }

    // Validate query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      try {
        const validation = await securityGuardrailsService.validateApiInput(
          req.query, 
          endpoint, 
          userId
        );
        
        req.query = validation.sanitizedInput;
        
        span.setAttributes({
          'security.query_validated': true,
          'security.query_sanitized': validation.sanitizedInput !== validation.originalInput
        });
        
      } catch (error) {
        span.recordException(error);
        span.setStatus('ERROR');
        span.end();
        
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          message: error.message,
          code: 'SECURITY_VALIDATION_FAILED'
        });
      }
    }

    span.setStatus('OK');
    span.end();
    next();
    
  } catch (error) {
    console.error('Security middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Security validation failed',
      code: 'SECURITY_MIDDLEWARE_ERROR'
    });
  }
};

/**
 * Rate limiting middleware
 */
export const rateLimitingMiddleware = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    try {
      const span = tracingService.startSpan('middleware.rate_limiting', {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'middleware.type': 'rate_limiting',
          'rate_limit.max_requests': maxRequests,
          'rate_limit.window_ms': windowMs
        }
      });

      // Create identifier from IP, user ID, or API key
      const userId = req.user?.id || req.headers['x-user-id'];
      const apiKey = req.headers['x-api-key'];
      const ip = req.ip || req.connection.remoteAddress;
      
      const identifier = userId || apiKey || ip;
      
      const rateLimit = securityGuardrailsService.checkRateLimit(
        identifier, 
        maxRequests, 
        windowMs
      );
      
      span.setAttributes({
        'rate_limit.identifier_type': userId ? 'user' : (apiKey ? 'api_key' : 'ip'),
        'rate_limit.request_count': rateLimit.requestCount,
        'rate_limit.allowed': rateLimit.allowed
      });

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': rateLimit.remaining || 0,
        'X-RateLimit-Reset': rateLimit.resetTime || Date.now() + windowMs
      });

      if (!rateLimit.allowed) {
        span.setStatus('ERROR');
        span.end();
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again after ${new Date(rateLimit.resetTime).toISOString()}`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }

      span.setStatus('OK');
      span.end();
      next();
      
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      // Continue on error - don't block requests due to rate limiting issues
      next();
    }
  };
};

/**
 * Database query security middleware (for routes that execute queries)
 */
export const databaseSecurityMiddleware = async (req, res, next) => {
  // Add database query validation functions to request object
  req.validateDatabaseQuery = async (query, parameters = {}, operation = 'SELECT') => {
    try {
      return await securityGuardrailsService.validateDatabaseQuery(query, parameters, operation);
    } catch (error) {
      throw new Error(`Database security violation: ${error.message}`);
    }
  };

  req.validateNeo4jQuery = async (cypher, parameters = {}) => {
    try {
      return await securityGuardrailsService.validateNeo4jQuery(cypher, parameters);
    } catch (error) {
      throw new Error(`Neo4j security violation: ${error.message}`);
    }
  };

  next();
};

/**
 * Content sanitization middleware
 */
export const contentSanitizationMiddleware = (req, res, next) => {
  // Add sanitization function to request object
  req.sanitizeContent = (content, allowBasicHtml = false) => {
    return securityGuardrailsService.sanitizeUserContent(content, allowBasicHtml);
  };

  // Sanitize common content fields in request body
  if (req.body) {
    const fieldsToSanitize = [
      'title', 'description', 'content', 'message', 'comment', 
      'summary', 'bio', 'notes', 'feedback'
    ];

    for (const field of fieldsToSanitize) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = securityGuardrailsService.sanitizeUserContent(req.body[field]);
      }
    }
  }

  next();
};

/**
 * Security headers middleware
 */
export const securityHeadersMiddleware = (req, res, next) => {
  // Set comprehensive security headers
  res.set({
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Strict transport security (HTTPS only)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Content security policy
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self';
      frame-ancestors 'none';
      object-src 'none';
      base-uri 'self'
    `.replace(/\s+/g, ' ').trim(),
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': `
      camera=(),
      microphone=(),
      geolocation=(),
      gyroscope=(),
      magnetometer=(),
      payment=()
    `.replace(/\s+/g, ' ').trim()
  });

  next();
};

/**
 * Request logging middleware with security context
 */
export const securityLoggingMiddleware = (req, res, next) => {
  const span = tracingService.startSpan('middleware.security_logging', {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.user_agent': req.headers['user-agent'],
      'middleware.type': 'security_logging'
    }
  });

  // Log security-relevant request information
  const securityContext = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || req.headers['x-user-id'],
    hasBody: !!req.body && Object.keys(req.body).length > 0,
    hasQuery: !!req.query && Object.keys(req.query).length > 0,
    contentLength: req.headers['content-length'] || 0,
    authorization: !!req.headers.authorization
  };

  // Add security context to request for downstream middleware
  req.securityContext = securityContext;

  // Log suspicious patterns
  const suspiciousPatterns = [
    /admin/i,
    /login/i,
    /auth/i,
    /password/i,
    /token/i,
    /api\/v\d+\/.*\/(delete|drop|truncate)/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || pattern.test(req.headers['user-agent'] || '')
  );

  if (isSuspicious) {
    span.setAttributes({
      'security.suspicious_request': true,
      'security.suspicious_patterns': suspiciousPatterns
        .filter(pattern => pattern.test(req.url) || pattern.test(req.headers['user-agent'] || ''))
        .length
    });

    console.warn('🔍 Suspicious request detected:', {
      url: req.url,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: securityContext.ip
    });
  }

  span.setStatus('OK');
  span.end();
  next();
};

/**
 * Combined security middleware stack
 */
export const fullSecurityMiddleware = [
  securityHeadersMiddleware,
  securityLoggingMiddleware,
  rateLimitingMiddleware(100, 60000), // 100 requests per minute
  inputValidationMiddleware,
  contentSanitizationMiddleware,
  databaseSecurityMiddleware
];

/**
 * API security middleware (lighter version for API endpoints)
 */
export const apiSecurityMiddleware = [
  rateLimitingMiddleware(200, 60000), // 200 requests per minute for API
  inputValidationMiddleware,
  databaseSecurityMiddleware
];

export default {
  inputValidationMiddleware,
  rateLimitingMiddleware,
  databaseSecurityMiddleware,
  contentSanitizationMiddleware,
  securityHeadersMiddleware,
  securityLoggingMiddleware,
  fullSecurityMiddleware,
  apiSecurityMiddleware
};