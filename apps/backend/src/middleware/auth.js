/**
 * Authentication middleware for JWT-based auth
 */
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.js';

/**
 * Generate JWT access token
 */
export const generateToken = payload => {
  // Clean payload of JWT reserved claims to avoid conflicts
  const { iat, exp, aud, iss, ...cleanPayload } = payload;

  return jwt.sign(cleanPayload, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.expiresIn,
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience,
  });
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = payload => {
  // Clean payload of JWT reserved claims to avoid conflicts
  const { iat, exp, aud, iss, ...cleanPayload } = payload;

  return jwt.sign({ ...cleanPayload, type: 'refresh' }, authConfig.jwt.secret, {
    expiresIn: '7d', // Refresh tokens last 7 days
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience,
  });
};

/**
 * Generate token pair (access + refresh)
 */
export const generateTokenPair = payload => {
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    expiresIn: authConfig.jwt.expiresIn,
    tokenType: 'Bearer',
  };
};

/**
 * Verify JWT token
 */
export const verifyToken = token => {
  try {
    return jwt.verify(token, authConfig.jwt.secret, {
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Authentication middleware
 * Verifies JWT tokens and adds user info to request
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid authentication token',
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid token',
      message: error.message,
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't require it
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we'll continue without authentication
      console.warn('Invalid token provided:', error.message);
    }
  }

  next();
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate to access this resource',
      });
    }

    const userRole = req.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Admin-only authorization middleware
 */
export const requireAdmin = authorize('admin', 'super_admin');

/**
 * Editor authorization middleware (admin or editor)
 */
export const requireEditor = authorize('admin', 'super_admin', 'editor');

/**
 * API key or JWT authentication middleware
 * Allows access with either valid API key or JWT token
 */
export const apiKeyOrAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (apiKey) {
    // Try API key authentication first
    const validApiKeys = (process.env.VALID_API_KEYS || '').split(',').filter(Boolean);

    if (validApiKeys.length > 0 && validApiKeys.includes(apiKey)) {
      req.user = { role: 'api', api_key: true };
      return next();
    }
  }

  // Fall back to JWT authentication
  authenticate(req, res, next);
};

/**
 * Dashboard access control definitions
 */
const DASHBOARD_ACCESS = {
  // Executive dashboards - admin/leadership only
  'ACT Community Executive Overview': ['admin', 'super_admin', 'leadership'],
  'Platform Operations & Health': ['admin', 'super_admin', 'ops'],

  // Community analytics - accessible to community managers and above
  'Community Engagement Deep Dive': [
    'admin',
    'super_admin',
    'community_manager',
    'analyst',
  ],
  'Geographic Impact Analysis': [
    'admin',
    'super_admin',
    'community_manager',
    'analyst',
  ],

  // Project impact - accessible to project managers and above
  'Project Impact & Outcomes': [
    'admin',
    'super_admin',
    'project_manager',
    'community_manager',
    'analyst',
  ],

  // User behavior - analyst level and above
  'User Behavior & Personalization': [
    'admin',
    'super_admin',
    'analyst',
    'data_scientist',
  ],

  // Public dashboards - accessible to authenticated users
  public: [
    'admin',
    'super_admin',
    'user',
    'community_manager',
    'project_manager',
    'analyst',
    'data_scientist',
    'ops',
    'leadership',
  ],
};

/**
 * Check dashboard access permissions
 */
export const checkDashboardAccess = (dashboardName, userRole = 'user') => {
  // API users have full access
  if (userRole === 'api') {
    return true;
  }

  // Check specific dashboard permissions
  const allowedRoles = DASHBOARD_ACCESS[dashboardName];
  if (allowedRoles) {
    return allowedRoles.includes(userRole);
  }

  // Default to public access if dashboard not found in access control list
  return DASHBOARD_ACCESS.public.includes(userRole);
};

/**
 * Dashboard authorization middleware
 * Checks if user has access to specific dashboard
 */
export const authorizeDashboard = (req, res, next) => {
  const dashboardName = req.params.name || req.params.dashboardId || req.body.name;

  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate to access dashboards',
    });
  }

  const userRole = req.user.role || 'user';
  const hasAccess = checkDashboardAccess(dashboardName, userRole);

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Dashboard access denied',
      message: `Insufficient permissions to access dashboard: ${dashboardName}`,
      required_roles: DASHBOARD_ACCESS[dashboardName] || DASHBOARD_ACCESS.public,
    });
  }

  next();
};

/**
 * Filter dashboards based on user permissions
 */
export const filterDashboardsByAccess = (dashboards, userRole = 'user') => {
  if (userRole === 'api' || userRole === 'admin' || userRole === 'super_admin') {
    // API users and admins see all dashboards
    return dashboards;
  }

  return dashboards.filter(dashboard => {
    return checkDashboardAccess(dashboard.name, userRole);
  });
};

/**
 * Analytics access levels middleware
 * Different levels of analytics access based on user role
 */
export const authorizeAnalytics = (level = 'basic') => {
  const ACCESS_LEVELS = {
    basic: ['admin', 'super_admin', 'user', 'community_manager', 'project_manager'],
    advanced: [
      'admin',
      'super_admin',
      'analyst',
      'community_manager',
      'data_scientist',
    ],
    executive: ['admin', 'super_admin', 'leadership'],
    operational: ['admin', 'super_admin', 'ops', 'analyst'],
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate to access analytics',
      });
    }

    const userRole = req.user.role || 'user';
    const allowedRoles = ACCESS_LEVELS[level] || ACCESS_LEVELS.basic;

    if (!allowedRoles.includes(userRole) && userRole !== 'api') {
      return res.status(403).json({
        error: 'Analytics access denied',
        message: `Insufficient permissions for ${level} analytics access`,
        required_roles: allowedRoles,
      });
    }

    next();
  };
};

export default {
  generateToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  authenticate,
  optionalAuth,
  authorize,
  requireAdmin,
  requireEditor,
  apiKeyOrAuth,
  checkDashboardAccess,
  authorizeDashboard,
  filterDashboardsByAccess,
  authorizeAnalytics,
};
