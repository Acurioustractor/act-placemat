/**
 * Alert Rules Configuration
 * Defines alert thresholds and rules for dashboard monitoring
 */

import { ALERT_SEVERITY } from '../shared/constants.js';

/**
 * Initialize alert rules
 * @returns {Object} Alert rules configuration
 */
export function initializeAlertRules() {
  return {
    financial_alerts: [
      {
        name: 'Low Cash Flow Warning',
        condition: 'cash_flow_days_remaining < 90',
        severity: ALERT_SEVERITY.HIGH,
        action: 'immediate_review_required'
      },
      {
        name: 'Budget Variance Alert',
        condition: 'budget_variance > 15%',
        severity: ALERT_SEVERITY.MEDIUM,
        action: 'budget_review_needed'
      },
      {
        name: 'Revenue Target Miss',
        condition: 'monthly_revenue < 80% of target',
        severity: ALERT_SEVERITY.HIGH,
        action: 'sales_strategy_review'
      }
    ],

    operational_alerts: [
      {
        name: 'Project Delay Warning',
        condition: 'project_delay > 14 days',
        severity: ALERT_SEVERITY.MEDIUM,
        action: 'project_review_required'
      },
      {
        name: 'Team Capacity Alert',
        condition: 'team_utilization > 90%',
        severity: ALERT_SEVERITY.MEDIUM,
        action: 'resource_planning_needed'
      }
    ],

    opportunity_alerts: [
      {
        name: 'Grant Deadline Approaching',
        condition: 'grant_deadline < 30 days',
        severity: ALERT_SEVERITY.MEDIUM,
        action: 'application_preparation'
      },
      {
        name: 'New Opportunity Available',
        condition: 'new_opportunity_match_score > 80%',
        severity: ALERT_SEVERITY.LOW,
        action: 'opportunity_evaluation'
      }
    ],

    compliance_alerts: [
      {
        name: 'Tax Filing Deadline',
        condition: 'tax_deadline < 14 days',
        severity: ALERT_SEVERITY.HIGH,
        action: 'immediate_filing_required'
      },
      {
        name: 'Regulatory Change',
        condition: 'new_regulation_impact_score > 70%',
        severity: ALERT_SEVERITY.MEDIUM,
        action: 'compliance_review_needed'
      }
    ]
  };
}

/**
 * Evaluate alert condition
 * @param {string} condition - Condition to evaluate
 * @param {Object} data - Data to use in evaluation
 * @returns {boolean} Whether condition is met
 */
export function evaluateAlertCondition(condition, data) {
  try {
    let evaluationExpression = condition;
    for (const [key, value] of Object.entries(data)) {
      evaluationExpression = evaluationExpression.replace(key, value);
    }
    return eval(evaluationExpression);
  } catch (error) {
    console.error('Condition evaluation error:', error);
    return false;
  }
}

/**
 * Check alerts against data
 * @param {Object} data - Data to check
 * @param {Object} alertRules - Alert rules to check against
 * @returns {Object[]} Triggered alerts
 */
export function checkAlerts(data, alertRules) {
  const alerts = [];

  for (const rule of alertRules.financial_alerts || []) {
    if (evaluateAlertCondition(rule.condition, data)) {
      alerts.push({
        type: 'financial',
        ...rule,
        triggered_at: new Date().toISOString()
      });
    }
  }

  for (const rule of alertRules.operational_alerts || []) {
    if (evaluateAlertCondition(rule.condition, data)) {
      alerts.push({
        type: 'operational',
        ...rule,
        triggered_at: new Date().toISOString()
      });
    }
  }

  for (const rule of alertRules.opportunity_alerts || []) {
    if (evaluateAlertCondition(rule.condition, data)) {
      alerts.push({
        type: 'opportunity',
        ...rule,
        triggered_at: new Date().toISOString()
      });
    }
  }

  for (const rule of alertRules.compliance_alerts || []) {
    if (evaluateAlertCondition(rule.condition, data)) {
      alerts.push({
        type: 'compliance',
        ...rule,
        triggered_at: new Date().toISOString()
      });
    }
  }

  return alerts;
}

/**
 * Get alert by severity
 * @param {Object[]} alerts - Alerts to filter
 * @param {string} severity - Severity level
 * @returns {Object[]} Filtered alerts
 */
export function getAlertsBySeverity(alerts, severity) {
  return alerts.filter(alert => alert.severity === severity);
}

/**
 * Sort alerts by priority
 * @param {Object[]} alerts - Alerts to sort
 * @returns {Object[]} Sorted alerts
 */
export function sortAlertsByPriority(alerts) {
  const severityOrder = { [ALERT_SEVERITY.HIGH]: 0, [ALERT_SEVERITY.MEDIUM]: 1, [ALERT_SEVERITY.LOW]: 2 };
  return [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export default {
  initializeAlertRules,
  evaluateAlertCondition,
  checkAlerts,
  getAlertsBySeverity,
  sortAlertsByPriority
};
