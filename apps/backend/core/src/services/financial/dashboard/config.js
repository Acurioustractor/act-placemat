/**
 * Dashboard Configuration
 * Centralized dashboard settings, refresh intervals, and widget layouts
 */

import { DASHBOARD_REFRESH_INTERVALS, ALERT_SEVERITY } from '../shared/constants.js';

/**
 * Initialize dashboard configuration
 * @returns {Object} Dashboard configuration
 */
export function initializeDashboardConfig() {
  return {
    refresh_intervals: {
      financial_metrics: DASHBOARD_REFRESH_INTERVALS.financial_metrics,
      operational_metrics: DASHBOARD_REFRESH_INTERVALS.operational_metrics,
      opportunity_scanning: DASHBOARD_REFRESH_INTERVALS.opportunity_scanning,
      compliance_monitoring: DASHBOARD_REFRESH_INTERVALS.compliance_monitoring
    },

    widget_layout: {
      executive_summary: {
        position: { x: 0, y: 0, w: 12, h: 4 },
        priority: 1,
        components: ['revenue_overview', 'cash_flow', 'key_metrics', 'alerts']
      },

      financial_dashboard: {
        position: { x: 0, y: 4, w: 6, h: 6 },
        priority: 2,
        components: ['revenue_trends', 'expense_breakdown', 'profitability', 'budget_variance']
      },

      operational_dashboard: {
        position: { x: 6, y: 4, w: 6, h: 6 },
        priority: 3,
        components: ['project_status', 'team_utilization', 'client_metrics', 'productivity']
      },

      opportunities_dashboard: {
        position: { x: 0, y: 10, w: 8, h: 4 },
        priority: 4,
        components: ['grant_opportunities', 'partnership_leads', 'market_trends', 'rd_credits']
      },

      compliance_dashboard: {
        position: { x: 8, y: 10, w: 4, h: 4 },
        priority: 5,
        components: ['regulatory_status', 'filing_deadlines', 'risk_indicators', 'audit_trail']
      }
    }
  };
}

/**
 * Dashboard types available
 */
export const DASHBOARD_TYPES = {
  EXECUTIVE: 'executive',
  FINANCIAL: 'financial',
  OPERATIONAL: 'operational',
  OPPORTUNITIES: 'opportunities',
  COMPLIANCE: 'compliance'
};

/**
 * Widget types
 */
export const WIDGET_TYPES = {
  METRIC_CARD: 'metric_card',
  GAUGE: 'gauge',
  HEALTH_INDICATOR: 'health_indicator',
  OPPORTUNITY_LIST: 'opportunity_list',
  LINE_CHART: 'line_chart',
  TASK_LIST: 'task_list',
  FINANCIAL_OVERVIEW: 'financial_overview',
  REVENUE_CHART: 'revenue_chart',
  PIE_CHART: 'pie_chart',
  PROJECTION_CHART: 'projection_chart',
  ALERT_PANEL: 'alert_panel'
};

/**
 * Default dashboard settings
 */
export const DEFAULT_DASHBOARD_CONFIG = {
  refreshRate: DASHBOARD_REFRESH_INTERVALS.financial_metrics,
  maxAlerts: 10,
  cacheEnabled: true,
  cacheTTL: 300
};

/**
 * Get dashboard configuration by type
 * @param {string} type - Dashboard type
 * @returns {Object} Dashboard configuration
 */
export function getDashboardConfigByType(type) {
  const config = initializeDashboardConfig();

  switch (type) {
    case DASHBOARD_TYPES.EXECUTIVE:
      return {
        ...config,
        widgets: ['revenue_overview', 'cash_flow_status', 'business_health', 'key_opportunities',
                  'performance_trends', 'action_items']
      };
    case DASHBOARD_TYPES.FINANCIAL:
      return {
        ...config,
        widgets: ['financial_summary', 'revenue_analysis', 'expense_breakdown',
                  'cash_flow_projection', 'financial_alerts']
      };
    case DASHBOARD_TYPES.OPERATIONAL:
      return {
        ...config,
        widgets: ['project_status', 'team_utilization', 'client_metrics', 'productivity']
      };
    case DASHBOARD_TYPES.OPPORTUNITIES:
      return {
        ...config,
        widgets: ['grant_opportunities', 'partnership_leads', 'market_trends', 'rd_credits']
      };
    case DASHBOARD_TYPES.COMPLIANCE:
      return {
        ...config,
        widgets: ['regulatory_status', 'filing_deadlines', 'risk_indicators', 'audit_trail']
      };
    default:
      return config;
  }
}

export default {
  initializeDashboardConfig,
  DASHBOARD_TYPES,
  WIDGET_TYPES,
  DEFAULT_DASHBOARD_CONFIG,
  getDashboardConfigByType
};
