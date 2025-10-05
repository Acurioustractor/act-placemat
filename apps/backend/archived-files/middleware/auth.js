/**
 * Authentication Middleware
 * Handles user authentication, session management, and OAuth token validation
 * 
 * Features:
 * - Session-based authentication
 * - OAuth token validation
 * - User context injection
 * - Security headers
 * - Rate limiting per user
 * 
 * Usage: app.use(authMiddleware)
 */

import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

// Mock user database (replace with real database)
const mockUsers = new Map([
  ['demo', {
    id: 'demo',
    email: 'demo@example.com',
    name: 'Demo User',
    tokens: {},
    preferences: {
      timezone: 'Australia/Melbourne',
      energyLevel: 'medium',
      defaultAvailableHours: 8
    }
  }]
]);

/**
 * Extract user from session token or create demo user
 */
export function extractUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // JWT token authentication
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
        req.user = decoded;
        return next();
      } catch (jwtError) {
        logger.warn('Invalid JWT token:', jwtError.message);
      }
    }

    if (sessionToken) {
      // Session token authentication (custom implementation)
      const user = mockUsers.get(sessionToken);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Default to demo user for development/testing
    req.user = mockUsers.get('demo');
    next();

  } catch (error) {
    logger.error('Authentication error:', error);
    req.user = mockUsers.get('demo'); // Fallback to demo user
    next();
  }
}

/**
 * Require authentication - return 401 if not authenticated
 */
export function requireAuth(req, res, next) {
  // In non-production, allow demo access for development convenience
  if (process.env.NODE_ENV !== 'production') {
    if (!req.user) {
      req.user = mockUsers.get('demo');
    }
    return next();
  }

  if (!req.user || req.user.id === 'demo') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please authenticate with Google or Slack to access this feature'
    });
  }
  next();
}

/**
 * Optional authentication - continue regardless of auth status
 */
export function optionalAuth(req, res, next) {
  // Just proceed - user extraction is handled by extractUser middleware
  next();
}

/**
 * API key or authentication middleware
 */
export function apiKeyOrAuth(req, res, next) {
  // Check for API key first
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (apiKey && apiKey === process.env.API_KEY) {
    // Valid API key, create a system user context
    req.user = {
      id: 'system',
      email: 'system@api',
      name: 'System API User',
      isSystemUser: true
    };
    return next();
  }
  
  // Fall back to regular authentication
  if (!req.user || req.user.id === 'demo') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide a valid API key or authenticate with Google/Slack'
    });
  }
  
  next();
}

/**
 * Admin authentication
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      message: 'This endpoint requires administrator privileges'
    });
  }
  next();
}

/**
 * Zero trust authentication
 */
export function zeroTrustAuth(req, res, next) {
  // Enhanced authentication with additional security checks
  if (!req.user || req.user.id === 'demo') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Zero trust policy requires authenticated access'
    });
  }
  
  // Additional security checks could go here
  // - IP whitelist
  // - Device trust
  // - Multi-factor authentication
  
  next();
}

/**
 * Authenticate function (alias for requireAuth)
 */
export const authenticate = requireAuth;

/**
 * Generate token pair (JWT + refresh token)
 */
export function generateTokenPair(user) {
  const accessToken = generateJWT(user);
  const refreshToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 604800 // 7 days in seconds
  };
}

/**
 * Generate API token
 */
export function generateToken(user) {
  return generateJWT(user);
}

/**
 * Authorize analytics access
 */
export function authorizeAnalytics(req, res, next) {
  // Check for analytics permission
  if (!req.user || (req.user.id === 'demo' && !req.user.isSystemUser)) {
    return res.status(401).json({
      success: false,
      error: 'Analytics access required',
      message: 'Please authenticate to access analytics features'
    });
  }
  
  // Check if user has analytics permission
  if (req.user.permissions && !req.user.permissions.includes('analytics')) {
    return res.status(403).json({
      success: false,
      error: 'Analytics permission required',
      message: 'Your account does not have permission to access analytics'
    });
  }
  
  next();
}

/**
 * Authorize dashboard access
 */
export function authorizeDashboard(req, res, next) {
  // Check for dashboard permission
  if (!req.user || req.user.id === 'demo') {
    return res.status(401).json({
      success: false,
      error: 'Dashboard access required',
      message: 'Please authenticate to access dashboard features'
    });
  }
  
  // Check if user has dashboard permission
  if (req.user.permissions && !req.user.permissions.includes('dashboard')) {
    return res.status(403).json({
      success: false,
      error: 'Dashboard permission required',
      message: 'Your account does not have permission to access dashboards'
    });
  }
  
  next();
}

/**
 * Filter dashboards by user access level
 */
export function filterDashboardsByAccess(req, res, next) {
  // Add filtering logic to request context
  req.dashboardFilter = {
    userId: req.user?.id,
    role: req.user?.role || 'user',
    permissions: req.user?.permissions || [],
    isSystemUser: req.user?.isSystemUser || false
  };
  
  next();
}

/**
 * Require specific service authentication (Google, Slack, etc.)
 */
export function requireServiceAuth(service) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate to access this feature'
      });
    }

    const serviceToken = req.user.tokens?.[service];
    if (!serviceToken || !serviceToken.accessToken) {
      return res.status(401).json({
        success: false,
        error: `${service} authentication required`,
        message: `Please connect your ${service} account to access this feature`
      });
    }

    // Check token expiration
    if (serviceToken.expiresAt && new Date() > new Date(serviceToken.expiresAt)) {
      return res.status(401).json({
        success: false,
        error: `${service} token expired`,
        message: `Please re-authenticate with ${service}`
      });
    }

    next();
  };
}

/**
 * Store OAuth tokens for user
 */
export function storeTokens(req, res, next) {
  if (req.body.accessToken && req.user) {
    const service = req.path.includes('google') ? 'google' : 
                   req.path.includes('slack') ? 'slack' : 'unknown';
    
    if (service !== 'unknown') {
      if (!req.user.tokens) req.user.tokens = {};
      
      req.user.tokens[service] = {
        accessToken: req.body.accessToken,
        refreshToken: req.body.refreshToken,
        expiresAt: req.body.expiresAt,
        updatedAt: new Date().toISOString()
      };

      logger.info(`Stored ${service} tokens for user ${req.user.id}`);
    }
  }
  next();
}

/**
 * Generate JWT token for user
 */
export function generateJWT(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-key', {
    expiresIn: '7d',
    issuer: 'life-orchestrator',
    subject: user.id
  });
}

/**
 * Create user session
 */
export async function createSession(user) {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // In a real app, store this in database
  mockUsers.set(sessionToken, {
    ...user,
    sessionToken,
    expiresAt
  });

  return {
    sessionToken,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  };
}

/**
 * Rate limiting per user
 */
const rateLimitMap = new Map();

export function rateLimitByUser(windowMs = 15 * 60 * 1000, maxRequests = 100) {
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitMap.has(userId)) {
      rateLimitMap.set(userId, []);
    }

    const userRequests = rateLimitMap.get(userId);
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => time > windowStart);
    rateLimitMap.set(userId, recentRequests);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);

    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(req, res, next) {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add user context to response headers (for debugging)
  if (req.user) {
    res.setHeader('X-User-Context', req.user.id);
  }

  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userInfo = req.user ? `user:${req.user.id}` : 'anonymous';
    
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${userInfo}`);
    
    // Log slow requests
    if (duration > 2000) {
      logger.warn(`Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });

  next();
}

/**
 * Error handling for authentication
 */
export function authErrorHandler(error, req, res, next) {
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Please authenticate again'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Please authenticate again'
    });
  }

  if (error.message && error.message.includes('authentication')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }

  next(error);
}

// Helper functions
function generateSessionToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
}

/**
 * Mock user management functions (replace with real database operations)
 */
export const userService = {
  async createUser(userData) {
    const user = {
      id: generateUserId(),
      email: userData.email,
      name: userData.name,
      tokens: {},
      preferences: {
        timezone: 'Australia/Melbourne',
        energyLevel: 'medium',
        defaultAvailableHours: 8,
        ...userData.preferences
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockUsers.set(user.id, user);
    return user;
  },

  async getUserById(id) {
    return mockUsers.get(id) || null;
  },

  async getUserByEmail(email) {
    for (const user of mockUsers.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  },

  async updateUser(id, updates) {
    const user = mockUsers.get(id);
    if (user) {
      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      mockUsers.set(id, updatedUser);
      return updatedUser;
    }
    return null;
  },

  async deleteUser(id) {
    return mockUsers.delete(id);
  },

  async updateUserTokens(id, service, tokens) {
    const user = mockUsers.get(id);
    if (user) {
      if (!user.tokens) user.tokens = {};
      user.tokens[service] = {
        ...tokens,
        updatedAt: new Date().toISOString()
      };
      user.updatedAt = new Date().toISOString();
      return user;
    }
    return null;
  }
};

function generateUserId() {
  return 'user_' + Math.random().toString(36).substring(2, 15);
}

// Export all middleware as default
export default {
  extractUser,
  requireAuth,
  optionalAuth,
  apiKeyOrAuth,
  requireAdmin,
  zeroTrustAuth,
  authenticate,
  generateTokenPair,
  generateToken,
  authorizeAnalytics,
  authorizeDashboard,
  filterDashboardsByAccess,
  requireServiceAuth,
  storeTokens,
  generateJWT,
  createSession,
  rateLimitByUser,
  securityHeaders,
  requestLogger,
  authErrorHandler,
  userService
};
