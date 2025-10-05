/**
 * Zero-Trust Authentication Implementation
 * Following patterns from Stripe, Auth0, and modern security frameworks
 * 
 * Principles:
 * - Never trust, always verify
 * - Least privilege access
 * - Continuous authentication
 * - Context-aware security
 * - Comprehensive audit trails
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

/**
 * Security context analyzer
 * Evaluates risk based on request patterns and user behavior
 */
class SecurityContextAnalyzer {
  constructor() {
    this.userSessions = new Map();
    this.suspiciousPatterns = new Map();
    this.rateLimiters = new Map();
  }

  /**
   * Analyze request context for risk factors
   */
  analyzeContext(req, user) {
    const context = {
      timestamp: Date.now(),
      ip: this.extractIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      path: req.path,
      method: req.method,
      hasAPIKey: !!req.headers['x-api-key'],
      hasJWT: !!req.headers.authorization,
      origin: req.headers.origin,
      referer: req.headers.referer
    };

    // Calculate risk score (0 = low risk, 100 = high risk)
    let riskScore = 0;

    // IP-based risk factors
    if (this.isPrivateIP(context.ip)) {
      riskScore += 5; // Private IPs slightly less risky
    } else {
      riskScore += 10; // Public IPs need more scrutiny
    }

    // User agent risk factors
    if (!context.userAgent || context.userAgent === 'unknown') {
      riskScore += 20;
    } else if (this.isSuspiciousUserAgent(context.userAgent)) {
      riskScore += 30;
    }

    // Rate limiting check
    const rateLimitKey = user ? `user_${user.id}` : `ip_${context.ip}`;
    const requests = this.rateLimiters.get(rateLimitKey) || [];
    const recentRequests = requests.filter(time => Date.now() - time < 60000); // Last minute
    
    if (recentRequests.length > 100) {
      riskScore += 50; // Very high rate = suspicious
    } else if (recentRequests.length > 50) {
      riskScore += 25; // High rate = elevated risk
    }

    // Update rate limiter
    recentRequests.push(Date.now());
    this.rateLimiters.set(rateLimitKey, recentRequests.slice(-100)); // Keep last 100

    // Path-based risk factors
    if (req.path.includes('admin')) {
      riskScore += 15;
    }
    if (req.path.includes('delete') || req.method === 'DELETE') {
      riskScore += 10;
    }

    return { context, riskScore: Math.min(riskScore, 100) };
  }

  extractIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  isPrivateIP(ip) {
    const privateRanges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^127\./,
      /^localhost$/
    ];
    return privateRanges.some(range => range.test(ip));
  }

  isSuspiciousUserAgent(userAgent) {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /curl/i,
      /wget/i,
      /python/i,
      /node/i
    ];
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}

const securityAnalyzer = new SecurityContextAnalyzer();

/**
 * API Key Management System
 * Implements Stripe-style key hierarchy with scoped permissions
 */
class APIKeyManager {
  constructor() {
    this.keyCache = new Map();
    this.keyUsage = new Map();
  }

  /**
   * Validate and analyze API key
   */
  validateAPIKey(apiKey, context) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, reason: 'missing_or_invalid_key' };
    }

    // Load valid keys from environment
    const validKeys = this.getValidKeys();
    const keyConfig = validKeys[apiKey];

    if (!keyConfig) {
      this.logKeyUsage(apiKey, 'invalid', context);
      return { valid: false, reason: 'key_not_found' };
    }

    // Check key expiration
    if (keyConfig.expiresAt && Date.now() > keyConfig.expiresAt) {
      this.logKeyUsage(apiKey, 'expired', context);
      return { valid: false, reason: 'key_expired' };
    }

    // Check rate limits for this key
    if (!this.checkKeyRateLimit(apiKey)) {
      this.logKeyUsage(apiKey, 'rate_limited', context);
      return { valid: false, reason: 'rate_limit_exceeded' };
    }

    // Check allowed origins (if specified)
    if (keyConfig.allowedOrigins && context.origin) {
      const originAllowed = keyConfig.allowedOrigins.some(allowed => {
        return typeof allowed === 'string' ? 
          allowed === context.origin : 
          allowed.test(context.origin);
      });

      if (!originAllowed) {
        this.logKeyUsage(apiKey, 'origin_blocked', context);
        return { valid: false, reason: 'origin_not_allowed' };
      }
    }

    // Check IP restrictions (if specified)
    if (keyConfig.allowedIPs && !keyConfig.allowedIPs.includes(context.ip)) {
      this.logKeyUsage(apiKey, 'ip_blocked', context);
      return { valid: false, reason: 'ip_not_allowed' };
    }

    this.logKeyUsage(apiKey, 'success', context);
    return { 
      valid: true, 
      keyConfig,
      permissions: keyConfig.permissions || ['read'],
      metadata: {
        keyType: keyConfig.type || 'standard',
        environment: keyConfig.environment || 'production',
        description: keyConfig.description || 'API Key'
      }
    };
  }

  getValidKeys() {
    // In production, this would come from a secure key management system
    const keys = process.env.VALID_API_KEYS || '';
    const keyConfigs = {};

    // Parse environment variable format: key1:config1,key2:config2
    if (keys === '*') {
      // Development wildcard - NEVER use in production
      return { 'dev-wildcard-key': { type: 'development', permissions: ['*'] } };
    }

    keys.split(',').forEach(keyEntry => {
      if (keyEntry.includes(':')) {
        const [key, configStr] = keyEntry.split(':');
        try {
          keyConfigs[key] = JSON.parse(configStr);
        } catch (e) {
          keyConfigs[key] = { type: 'standard', permissions: ['read'] };
        }
      } else if (keyEntry.trim()) {
        keyConfigs[keyEntry.trim()] = { type: 'standard', permissions: ['read', 'write'] };
      }
    });

    return keyConfigs;
  }

  checkKeyRateLimit(apiKey) {
    const usageKey = `key_${apiKey}`;
    const usage = this.keyUsage.get(usageKey) || [];
    const recent = usage.filter(time => Date.now() - time < 3600000); // Last hour
    
    // Different limits based on key type
    const keyConfig = this.getValidKeys()[apiKey];
    const limit = keyConfig?.rateLimit || 1000; // Default 1000 requests per hour
    
    if (recent.length >= limit) {
      return false;
    }

    recent.push(Date.now());
    this.keyUsage.set(usageKey, recent.slice(-limit));
    return true;
  }

  logKeyUsage(apiKey, status, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      keyHash: crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 8),
      status,
      ip: context.ip,
      userAgent: context.userAgent?.substring(0, 100),
      path: context.path,
      method: context.method
    };

    if (status === 'success') {
      if (process.env.DEBUG_API_KEYS) {
        console.log('🔑 API Key Used:', logEntry);
      }
    } else {
      console.warn('🚫 API Key Violation:', logEntry);
    }

    // TODO: Send to security monitoring service
  }
}

const apiKeyManager = new APIKeyManager();

/**
 * JWT Token Manager with enhanced security
 */
class JWTManager {
  constructor() {
    this.blacklistedTokens = new Set();
    this.tokenUsage = new Map();
  }

  validateJWT(token, context) {
    if (!token) {
      return { valid: false, reason: 'no_token' };
    }

    // Check blacklist
    if (this.blacklistedTokens.has(token)) {
      return { valid: false, reason: 'token_blacklisted' };
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: process.env.JWT_ISSUER || 'act-platform',
        audience: process.env.JWT_AUDIENCE || 'act-api'
      });

      // Check token freshness
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp - now < 300) { // Less than 5 minutes left
        console.warn('⚠️  JWT Token expiring soon:', {
          exp: decoded.exp,
          remaining: decoded.exp - now
        });
      }

      // Enhanced validation
      if (!decoded.sub || !decoded.iat) {
        return { valid: false, reason: 'invalid_token_structure' };
      }

      this.logTokenUsage(token, 'success', context, decoded);
      return { 
        valid: true, 
        decoded,
        user: {
          id: decoded.sub,
          role: decoded.role || 'user',
          permissions: decoded.permissions || [],
          metadata: decoded.metadata || {}
        }
      };

    } catch (error) {
      this.logTokenUsage(token, 'invalid', context, null, error.message);
      return { valid: false, reason: error.message };
    }
  }

  logTokenUsage(token, status, context, decoded, error) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex').slice(0, 8);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      tokenHash,
      status,
      userId: decoded?.sub || 'unknown',
      ip: context.ip,
      error: error || undefined
    };

    if (status === 'success') {
      if (process.env.DEBUG_JWT) {
        console.log('🎫 JWT Validated:', logEntry);
      }
    } else {
      console.warn('🚫 JWT Violation:', logEntry);
    }
  }

  blacklistToken(token) {
    this.blacklistedTokens.add(token);
    console.log('🔒 Token blacklisted:', {
      tokenHash: crypto.createHash('sha256').update(token).digest('hex').slice(0, 8),
      timestamp: new Date().toISOString()
    });
  }
}

const jwtManager = new JWTManager();

/**
 * Zero-Trust Authentication Middleware
 * Implements continuous verification with risk-based access control
 */
export function createZeroTrustAuth(options = {}) {
  const {
    requireAuth = true,
    allowedRoles = [],
    maxRiskScore = 50,
    enableContinuousAuth = true
  } = options;

  return async (req, res, next) => {
    const startTime = performance.now();
    
    try {
      // Step 1: Analyze security context
      const { context, riskScore } = securityAnalyzer.analyzeContext(req, null);
      
      // Step 2: Check if authentication is required
      if (!requireAuth && riskScore < 30) {
        req.securityContext = { context, riskScore, authType: 'none' };
        return next();
      }

      // Step 3: Try API Key authentication first
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      if (apiKey) {
        const apiKeyResult = apiKeyManager.validateAPIKey(apiKey, context);
        
        if (apiKeyResult.valid) {
          req.user = {
            id: `api_key_user`,
            role: 'api',
            permissions: apiKeyResult.permissions,
            metadata: apiKeyResult.metadata,
            authType: 'api_key'
          };
          req.securityContext = { context, riskScore, authType: 'api_key' };
          
          // API keys bypass some risk checks but not all
          if (riskScore > 80) {
            return res.status(403).json({
              error: 'High risk context detected',
              message: 'Request blocked by security policy'
            });
          }
          
          return next();
        }
      }

      // Step 4: Try JWT authentication
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      
      if (token) {
        const jwtResult = jwtManager.validateJWT(token, context);
        
        if (jwtResult.valid) {
          const user = jwtResult.user;
          
          // Step 5: Role-based authorization
          if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            return res.status(403).json({
              error: 'Insufficient permissions',
              message: `Required roles: ${allowedRoles.join(', ')}`
            });
          }

          // Step 6: Risk-based access control
          if (riskScore > maxRiskScore) {
            console.warn('🚨 High risk access attempt:', {
              userId: user.id,
              riskScore,
              context: {
                ip: context.ip,
                userAgent: context.userAgent.substring(0, 100),
                path: context.path
              }
            });

            // Require step-up authentication for high risk
            if (riskScore > 75) {
              return res.status(403).json({
                error: 'Step-up authentication required',
                message: 'Additional verification needed for high-risk request',
                riskScore
              });
            }
          }

          req.user = { ...user, authType: 'jwt' };
          req.securityContext = { context, riskScore, authType: 'jwt' };
          return next();
        }
      }

      // Step 7: No valid authentication found
      if (requireAuth) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please provide valid API key or JWT token'
        });
      }

      // Step 8: Optional auth - continue without user
      req.securityContext = { context, riskScore, authType: 'none' };
      next();

    } catch (error) {
      console.error('🚨 Zero-trust authentication error:', error);
      res.status(500).json({
        error: 'Authentication system error',
        message: 'Please try again'
      });
    } finally {
      const duration = performance.now() - startTime;
      if (process.env.DEBUG_PERFORMANCE && duration > 100) {
        console.warn(`⚠️  Slow auth check: ${duration.toFixed(2)}ms for ${req.path}`);
      }
    }
  };
}

/**
 * Convenience middleware for common authentication patterns
 */
export const zeroTrustAuth = {
  // No authentication required
  optional: createZeroTrustAuth({ requireAuth: false }),
  
  // Basic authentication (any valid token)
  required: createZeroTrustAuth({ requireAuth: true }),
  
  // Admin-only access
  adminOnly: createZeroTrustAuth({ 
    requireAuth: true, 
    allowedRoles: ['admin', 'super_admin'],
    maxRiskScore: 30 // Lower risk tolerance for admin
  }),
  
  // API-only access
  apiOnly: createZeroTrustAuth({
    requireAuth: true,
    allowedRoles: ['api'],
    maxRiskScore: 60
  }),
  
  // High security operations
  highSecurity: createZeroTrustAuth({
    requireAuth: true,
    maxRiskScore: 20,
    enableContinuousAuth: true
  })
};

export default zeroTrustAuth;