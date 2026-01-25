/**
 * Privacy Guardian - Access Control Module
 *
 * Access control enforcement and permission management.
 * Part of the Privacy Guardian modular architecture.
 */

/**
 * Creates the access control module
 * @param {Object} dependencies - Injected dependencies
 * @returns {Object} Access control methods
 */
export function createAccessModule(dependencies = {}) {
  const { logger = console } = dependencies;

  /**
   * Enforces access controls for a given operation
   * @param {Object} context - Processing context
   * @param {string} operation - Operation being performed
   * @returns {Object} Access control settings
   */
  async function enforceAccessControls(context, operation) {
    const controls = {
      access_level: 'none',
      permitted_users: [],
      permitted_roles: [],
      time_restrictions: {},
      purpose_restrictions: [],
      monitoring_level: 'standard'
    };

    try {
      controls.access_level = determineAccessLevel(context);
      controls.permitted_users = determinePermittedUsers(context, operation);
      controls.permitted_roles = determinePermittedRoles(context, operation);
      controls.time_restrictions = applyTimeRestrictions(context);
      controls.purpose_restrictions = setPurposeRestrictions(context, operation);
      controls.monitoring_level = determineMonitoringLevel(context);

    } catch (error) {
      logger.error('Access control enforcement error:', error);
      controls.error = error.message;
    }

    return controls;
  }

  /**
   * Determines the appropriate access level based on context
   * @param {Object} context - Processing context
   * @returns {string} Access level (none, standard, limited, restricted)
   */
  function determineAccessLevel(context) {
    if (context.sensitivity_level === 'high') return 'restricted';
    if (context.sensitivity_level === 'medium') return 'limited';
    if (context.sensitivity_level === 'low') return 'standard';
    return 'standard';
  }

  /**
   * Determines which users are permitted access
   * @param {Object} context - Processing context
   * @param {string} operation - Operation type
   * @returns {string[]} Array of permitted user IDs
   */
  function determinePermittedUsers(context, operation) {
    if (context.user_id) {
      return [context.user_id];
    }

    if (context.permitted_users) {
      return context.permitted_users;
    }

    return [];
  }

  /**
   * Determines which roles are permitted access
   * @param {Object} context - Processing context
   * @param {string} operation - Operation type
   * @returns {string[]} Array of permitted role names
   */
  function determinePermittedRoles(context, operation) {
    const roleMappings = {
      read: ['admin', 'user', 'viewer'],
      write: ['admin', 'editor'],
      update: ['admin', 'editor'],
      delete: ['admin'],
      share: ['admin'],
      export: ['admin', 'manager']
    };

    return roleMappings[operation] || ['admin', 'editor'];
  }

  /**
   * Applies time-based restrictions to access
   * @param {Object} context - Processing context
   * @returns {Object} Time restriction settings
   */
  function applyTimeRestrictions(context) {
    return {
      valid_from: context.valid_from || new Date().toISOString(),
      valid_until: context.valid_until || null,
      time_zone: context.time_zone || 'UTC',
      allowed_hours: context.allowed_hours || { start: '00:00', end: '23:59' },
      days_of_week: context.days_of_week || [0, 1, 2, 3, 4, 5, 6]
    };
  }

  /**
   * Sets purpose-based restrictions
   * @param {Object} context - Processing context
   * @param {string} operation - Operation type
   * @returns {string[]} Array of allowed purposes
   */
  function setPurposeRestrictions(context, operation) {
    return [operation, context.purpose].filter(Boolean);
  }

  /**
   * Determines the monitoring level for access
   * @param {Object} context - Processing context
   * @returns {string} Monitoring level (standard, enhanced, none)
   */
  function determineMonitoringLevel(context) {
    if (context.high_risk) return 'enhanced';
    if (context.no_logging) return 'none';
    return 'standard';
  }

  /**
   * Validates if a user has permission for an operation
   * @param {Object} accessControls - Access control settings
   * @param {Object} requester - Requester information
   * @returns {Object} Permission validation result
   */
  function validatePermission(accessControls, requester) {
    const result = {
      granted: false,
      reason: '',
      conditions: []
    };

    // Check user permission
    if (accessControls.permitted_users.length > 0) {
      if (!accessControls.permitted_users.includes(requester.user_id)) {
        result.reason = 'User not in permitted users list';
        return result;
      }
    }

    // Check role permission
    if (accessControls.permitted_roles.length > 0) {
      const hasRole = requester.roles?.some(role =>
        accessControls.permitted_roles.includes(role)
      );
      if (!hasRole) {
        result.reason = 'Requester role not in permitted roles list';
        return result;
      }
    }

    // Check time restrictions
    const timeCheck = checkTimeRestrictions(accessControls.time_restrictions);
    if (!timeCheck.valid) {
      result.reason = timeCheck.reason;
      return result;
    }
    if (timeCheck.conditions.length > 0) {
      result.conditions.push(...timeCheck.conditions);
    }

    result.granted = true;
    result.reason = 'All access checks passed';
    return result;
  }

  /**
   * Checks if current time is within allowed restrictions
   * @param {Object} timeRestrictions - Time restriction settings
   * @returns {Object} Check result with validity and conditions
   */
  function checkTimeRestrictions(timeRestrictions) {
    const result = { valid: true, reason: '', conditions: [] };
    const now = new Date();

    // Check valid_from
    if (timeRestrictions.valid_from) {
      if (new Date(timeRestrictions.valid_from) > now) {
        result.valid = false;
        result.reason = 'Access not yet valid';
        return result;
      }
    }

    // Check valid_until
    if (timeRestrictions.valid_until) {
      if (new Date(timeRestrictions.valid_until) < now) {
        result.valid = false;
        result.reason = 'Access has expired';
        return result;
      }
    }

    // Check allowed hours
    if (timeRestrictions.allowed_hours) {
      const currentHour = now.getHours();
      const [startHour, startMin] = timeRestrictions.allowed_hours.start.split(':').map(Number);
      const [endHour, endMin] = timeRestrictions.allowed_hours.end.split(':').map(Number);
      const currentMinutes = currentHour * 60 + now.getMinutes();
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        result.conditions.push('Outside standard hours - enhanced monitoring');
      }
    }

    // Check day of week
    if (timeRestrictions.days_of_week) {
      if (!timeRestrictions.days_of_week.includes(now.getDay())) {
        result.conditions.push('Weekend/holiday - additional logging');
      }
    }

    return result;
  }

  /**
   * Checks if a purpose is allowed for the data
   * @param {string} purpose - Purpose to check
   * @param {string[]} allowedPurposes - List of allowed purposes
   * @returns {boolean} Whether purpose is allowed
   */
  function isPurposeAllowed(purpose, allowedPurposes) {
    return allowedPurposes.includes(purpose);
  }

  /**
   * Grants temporary elevated access
   * @param {Object} context - Current context
   * @param {string} userId - User ID requesting access
   * @param {string} reason - Reason for elevated access
   * @param {number} durationMinutes - Duration in minutes
   * @returns {Object} Temporary access grant
   */
  function grantTemporaryAccess(context, userId, reason, durationMinutes = 30) {
    return {
      user_id: userId,
      access_level: 'elevated',
      granted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
      reason,
      original_context: context,
      audit_trail: {
        granted_by: 'system',
        granted_at: new Date().toISOString(),
        expires_automatically: true
      }
    };
  }

  /**
   * Revokes temporary access
   * @param {Object} accessGrant - Access grant to revoke
   * @param {string} revokedBy - User ID revoking access
   * @param {string} reason - Reason for revocation
   * @returns {Object} Revocation confirmation
   */
  function revokeTemporaryAccess(accessGrant, revokedBy, reason) {
    return {
      revoked: true,
      access_grant_id: accessGrant.user_id,
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      reason,
      was_used: false
    };
  }

  /**
   * Generates an access audit log entry
   * @param {Object} accessControls - Applied access controls
   * @param {Object} requester - Who made the request
   * @param {string} operation - Operation performed
   * @param {boolean} granted - Whether access was granted
   * @returns {Object} Audit log entry
   */
  function createAccessAuditLog(accessControls, requester, operation, granted) {
    return {
      timestamp: new Date().toISOString(),
      user_id: requester.user_id,
      user_roles: requester.roles,
      operation,
      access_level: accessControls.access_level,
      granted,
      monitoring_level: accessControls.monitoring_level,
      purpose_restrictions: accessControls.purpose_restrictions,
      time_restrictions: accessControls.time_restrictions
    };
  }

  return {
    enforceAccessControls,
    determineAccessLevel,
    determinePermittedUsers,
    determinePermittedRoles,
    applyTimeRestrictions,
    setPurposeRestrictions,
    determineMonitoringLevel,
    validatePermission,
    checkTimeRestrictions,
    isPurposeAllowed,
    grantTemporaryAccess,
    revokeTemporaryAccess,
    createAccessAuditLog
  };
}

export default {
  createAccessModule
};
