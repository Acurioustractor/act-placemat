/**
 * User Role Management API
 * Manages user roles and permissions for dashboard access
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { 
  apiKeyOrAuth, 
  requireAdmin,
  checkDashboardAccess,
  filterDashboardsByAccess
} from '../middleware/auth.js';

const router = express.Router();

/**
 * Available user roles and their permissions
 */
const USER_ROLES = {
  user: {
    name: 'User',
    description: 'Basic authenticated user with limited dashboard access',
    analytics_level: 'basic',
    dashboard_access: ['public']
  },
  community_manager: {
    name: 'Community Manager',
    description: 'Manages community engagement and has access to community analytics',
    analytics_level: 'basic',
    dashboard_access: [
      'Community Engagement Deep Dive',
      'Geographic Impact Analysis',
      'Project Impact & Outcomes'
    ]
  },
  project_manager: {
    name: 'Project Manager',
    description: 'Manages projects with access to project impact dashboards',
    analytics_level: 'basic',
    dashboard_access: [
      'Project Impact & Outcomes'
    ]
  },
  analyst: {
    name: 'Data Analyst',
    description: 'Analyzes data with advanced analytics access',
    analytics_level: 'advanced',
    dashboard_access: [
      'Community Engagement Deep Dive',
      'Geographic Impact Analysis',
      'Project Impact & Outcomes',
      'User Behavior & Personalization'
    ]
  },
  data_scientist: {
    name: 'Data Scientist',
    description: 'Advanced data analysis and machine learning insights',
    analytics_level: 'advanced',
    dashboard_access: [
      'User Behavior & Personalization'
    ]
  },
  ops: {
    name: 'Operations',
    description: 'System operations and platform health monitoring',
    analytics_level: 'operational',
    dashboard_access: [
      'Platform Operations & Health'
    ]
  },
  leadership: {
    name: 'Leadership',
    description: 'Executive access to all strategic dashboards',
    analytics_level: 'executive',
    dashboard_access: [
      'ACT Community Executive Overview'
    ]
  },
  admin: {
    name: 'Administrator',
    description: 'Full administrative access to all dashboards and configurations',
    analytics_level: 'all',
    dashboard_access: 'all'
  },
  super_admin: {
    name: 'Super Administrator',
    description: 'Complete system access with all privileges',
    analytics_level: 'all',
    dashboard_access: 'all'
  }
};

/**
 * GET /api/user-roles
 * Get all available user roles and their permissions
 */
router.get('/', asyncHandler(async (req, res) => {
  const { detailed = false } = req.query;
  
  if (detailed === 'true') {
    res.json({
      success: true,
      roles: USER_ROLES,
      timestamp: new Date().toISOString()
    });
  } else {
    // Return simplified list
    const rolesList = Object.entries(USER_ROLES).map(([key, role]) => ({
      role_id: key,
      name: role.name,
      description: role.description,
      analytics_level: role.analytics_level
    }));
    
    res.json({
      success: true,
      roles: rolesList,
      count: rolesList.length,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /api/user-roles/:role/permissions
 * Get permissions for a specific role
 */
router.get('/:role/permissions', asyncHandler(async (req, res) => {
  const { role } = req.params;
  const roleInfo = USER_ROLES[role];
  
  if (!roleInfo) {
    return res.status(404).json({
      success: false,
      error: 'Role not found',
      available_roles: Object.keys(USER_ROLES)
    });
  }
  
  res.json({
    success: true,
    role_id: role,
    role_info: roleInfo,
    permissions: {
      analytics_level: roleInfo.analytics_level,
      dashboard_access: roleInfo.dashboard_access,
      can_access_all: roleInfo.dashboard_access === 'all'
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/user-roles/:role/dashboards
 * Get accessible dashboards for a specific role
 */
router.get('/:role/dashboards', asyncHandler(async (req, res) => {
  const { role } = req.params;
  const roleInfo = USER_ROLES[role];
  
  if (!roleInfo) {
    return res.status(404).json({
      success: false,
      error: 'Role not found',
      available_roles: Object.keys(USER_ROLES)
    });
  }
  
  // Mock dashboard list for filtering
  const allDashboards = [
    { name: 'ACT Community Executive Overview' },
    { name: 'Community Engagement Deep Dive' },
    { name: 'Project Impact & Outcomes' },
    { name: 'User Behavior & Personalization' },
    { name: 'Platform Operations & Health' },
    { name: 'Geographic Impact Analysis' }
  ];
  
  const accessibleDashboards = filterDashboardsByAccess(allDashboards, role);
  
  res.json({
    success: true,
    role_id: role,
    role_name: roleInfo.name,
    accessible_dashboards: accessibleDashboards,
    count: accessibleDashboards.length,
    total_dashboards: allDashboards.length,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/user-roles/check-access
 * Check if a role has access to specific dashboard
 */
router.post('/check-access', asyncHandler(async (req, res) => {
  const { role, dashboard_name } = req.body;
  
  if (!role || !dashboard_name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required_fields: ['role', 'dashboard_name']
    });
  }
  
  if (!USER_ROLES[role]) {
    return res.status(404).json({
      success: false,
      error: 'Role not found',
      available_roles: Object.keys(USER_ROLES)
    });
  }
  
  const hasAccess = checkDashboardAccess(dashboard_name, role);
  
  res.json({
    success: true,
    role,
    dashboard_name,
    has_access: hasAccess,
    role_info: USER_ROLES[role],
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/user-roles/my-permissions
 * Get current user's role permissions and accessible dashboards
 */
router.get('/my-permissions', asyncHandler(async (req, res) => {
  const userRole = req.user?.role || 'user';
  const roleInfo = USER_ROLES[userRole] || USER_ROLES.user;
  
  // Mock dashboard list for filtering
  const allDashboards = [
    { name: 'ACT Community Executive Overview' },
    { name: 'Community Engagement Deep Dive' },
    { name: 'Project Impact & Outcomes' },
    { name: 'User Behavior & Personalization' },
    { name: 'Platform Operations & Health' },
    { name: 'Geographic Impact Analysis' }
  ];
  
  const accessibleDashboards = filterDashboardsByAccess(allDashboards, userRole);
  
  res.json({
    success: true,
    user_role: userRole,
    role_info: roleInfo,
    permissions: {
      analytics_level: roleInfo.analytics_level,
      dashboard_access: roleInfo.dashboard_access,
      can_access_all: roleInfo.dashboard_access === 'all'
    },
    accessible_dashboards: accessibleDashboards,
    dashboard_count: accessibleDashboards.length,
    timestamp: new Date().toISOString()
  });
}));

/**
 * PUT /api/user-roles/:userId/role
 * Update user role (admin only)
 */
router.put('/:userId/role', requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { new_role, reason } = req.body;
  
  if (!new_role) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: new_role'
    });
  }
  
  if (!USER_ROLES[new_role]) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role',
      available_roles: Object.keys(USER_ROLES)
    });
  }
  
  // In a real implementation, this would update the user in the database
  // For now, we'll return a success response with the role change details
  
  res.json({
    success: true,
    message: `User ${userId} role updated successfully`,
    user_id: userId,
    new_role: new_role,
    role_info: USER_ROLES[new_role],
    updated_by: req.user?.id || 'admin',
    reason: reason || 'Role update requested',
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/user-roles/analytics-levels
 * Get analytics access level definitions
 */
router.get('/analytics-levels', asyncHandler(async (req, res) => {
  const analyticsLevels = {
    basic: {
      name: 'Basic Analytics',
      description: 'Basic dashboard access for standard users',
      features: ['Public dashboards', 'Basic reporting', 'Standard filters']
    },
    advanced: {
      name: 'Advanced Analytics', 
      description: 'Advanced analytics features for analysts',
      features: ['Advanced dashboards', 'Custom queries', 'Data exports', 'Detailed filtering']
    },
    executive: {
      name: 'Executive Analytics',
      description: 'Strategic insights for leadership team',
      features: ['Executive dashboards', 'High-level KPIs', 'Strategic reporting']
    },
    operational: {
      name: 'Operational Analytics',
      description: 'System operations and health monitoring',
      features: ['System health dashboards', 'Performance metrics', 'Error monitoring']
    },
    all: {
      name: 'Full Access',
      description: 'Complete analytics access for administrators',
      features: ['All dashboards', 'System configuration', 'User management', 'Full data access']
    }
  };
  
  res.json({
    success: true,
    analytics_levels: analyticsLevels,
    timestamp: new Date().toISOString()
  });
}));

export default router;