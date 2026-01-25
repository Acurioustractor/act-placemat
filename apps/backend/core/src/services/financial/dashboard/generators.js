/**
 * Dashboard Generators
 * Generates dashboard widgets and views for different dashboard types
 */

/**
 * Generate executive dashboard widgets
 * @param {Object} metrics - Metrics data
 * @returns {Object[]} Array of widgets
 */
export async function generateExecutiveDashboard(metrics) {
  return [
    {
      id: 'revenue_overview',
      title: 'Revenue Overview',
      type: 'metric_card',
      data: metrics.revenueOverview || { current_month: 0, previous_month: 0, growth_rate: 0 },
      position: { x: 0, y: 0, w: 3, h: 2 },
      refresh_interval: 300000
    },
    {
      id: 'cash_flow_status',
      title: 'Cash Flow Status',
      type: 'gauge',
      data: metrics.cashFlowStatus || { current_balance: 0, runway_months: 0 },
      position: { x: 3, y: 0, w: 3, h: 2 },
      refresh_interval: 300000
    },
    {
      id: 'business_health',
      title: 'Business Health Score',
      type: 'health_indicator',
      data: metrics.businessHealth || { overall_score: 0 },
      position: { x: 6, y: 0, w: 3, h: 2 },
      refresh_interval: 600000
    },
    {
      id: 'key_opportunities',
      title: 'Key Opportunities',
      type: 'opportunity_list',
      data: metrics.opportunities || [],
      position: { x: 9, y: 0, w: 3, h: 2 },
      refresh_interval: 3600000
    },
    {
      id: 'performance_trends',
      title: 'Performance Trends',
      type: 'line_chart',
      data: metrics.trends || [],
      position: { x: 0, y: 2, w: 6, h: 4 },
      refresh_interval: 600000
    },
    {
      id: 'action_items',
      title: 'Priority Action Items',
      type: 'task_list',
      data: metrics.actionItems || [],
      position: { x: 6, y: 2, w: 6, h: 4 },
      refresh_interval: 600000
    }
  ];
}

/**
 * Generate financial dashboard widgets
 * @param {Object} metrics - Financial metrics
 * @returns {Object[]} Array of widgets
 */
export async function generateFinancialDashboard(metrics) {
  return [
    {
      id: 'financial_summary',
      title: 'Financial Summary',
      type: 'financial_overview',
      data: metrics.financialSummary || {},
      position: { x: 0, y: 0, w: 12, h: 2 }
    },
    {
      id: 'revenue_analysis',
      title: 'Revenue Analysis',
      type: 'revenue_chart',
      data: metrics.revenueAnalysis || {},
      position: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'expense_breakdown',
      title: 'Expense Breakdown',
      type: 'pie_chart',
      data: metrics.expenseBreakdown || {},
      position: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'cash_flow_projection',
      title: 'Cash Flow Projection',
      type: 'projection_chart',
      data: metrics.cashFlowProjection || {},
      position: { x: 0, y: 6, w: 8, h: 4 }
    },
    {
      id: 'financial_alerts',
      title: 'Financial Alerts',
      type: 'alert_panel',
      data: metrics.alerts || [],
      position: { x: 8, y: 6, w: 4, h: 4 }
    }
  ];
}

/**
 * Generate operational dashboard widgets
 * @param {Object} metrics - Operational metrics
 * @returns {Object[]} Array of widgets
 */
export async function generateOperationalDashboard(metrics) {
  return [
    {
      id: 'project_status',
      title: 'Project Status',
      type: 'project_overview',
      data: metrics.projectStatus || {},
      position: { x: 0, y: 0, w: 6, h: 4 }
    },
    {
      id: 'team_utilization',
      title: 'Team Utilization',
      type: 'utilization_chart',
      data: metrics.teamUtilization || {},
      position: { x: 6, y: 0, w: 6, h: 4 }
    },
    {
      id: 'client_metrics',
      title: 'Client Metrics',
      type: 'client_dashboard',
      data: metrics.clientMetrics || {},
      position: { x: 0, y: 4, w: 6, h: 4 }
    },
    {
      id: 'productivity',
      title: 'Productivity',
      type: 'productivity_chart',
      data: metrics.productivity || {},
      position: { x: 6, y: 4, w: 6, h: 4 }
    }
  ];
}

/**
 * Generate opportunities dashboard widgets
 * @param {Object} metrics - Opportunity metrics
 * @returns {Object[]} Array of widgets
 */
export async function generateOpportunitiesDashboard(metrics) {
  return [
    {
      id: 'grant_opportunities',
      title: 'Grant Opportunities',
      type: 'grant_list',
      data: metrics.grants || [],
      position: { x: 0, y: 0, w: 6, h: 4 }
    },
    {
      id: 'partnership_leads',
      title: 'Partnership Leads',
      type: 'partnership_list',
      data: metrics.partnerships || [],
      position: { x: 6, y: 0, w: 6, h: 4 }
    },
    {
      id: 'market_trends',
      title: 'Market Trends',
      type: 'trend_chart',
      data: metrics.marketTrends || {},
      position: { x: 0, y: 4, w: 6, h: 4 }
    },
    {
      id: 'rd_credits',
      title: 'R&D Credits',
      type: 'credits_summary',
      data: metrics.rdCredits || {},
      position: { x: 6, y: 4, w: 6, h: 4 }
    }
  ];
}

/**
 * Generate compliance dashboard widgets
 * @param {Object} metrics - Compliance metrics
 * @returns {Object[]} Array of widgets
 */
export async function generateComplianceDashboard(metrics) {
  return [
    {
      id: 'regulatory_status',
      title: 'Regulatory Status',
      type: 'status_panel',
      data: metrics.regulatoryStatus || {},
      position: { x: 0, y: 0, w: 6, h: 4 }
    },
    {
      id: 'filing_deadlines',
      title: 'Filing Deadlines',
      type: 'deadline_list',
      data: metrics.filingDeadlines || [],
      position: { x: 6, y: 0, w: 6, h: 4 }
    },
    {
      id: 'risk_indicators',
      title: 'Risk Indicators',
      type: 'risk_panel',
      data: metrics.riskIndicators || {},
      position: { x: 0, y: 4, w: 6, h: 4 }
    },
    {
      id: 'audit_trail',
      title: 'Audit Trail',
      type: 'audit_log',
      data: metrics.auditTrail || [],
      position: { x: 6, y: 4, w: 6, h: 4 }
    }
  ];
}

/**
 * Generate dashboard based on type
 * @param {string} dashboardType - Type of dashboard
 * @param {Object} metrics - Metrics data
 * @returns {Object[]} Array of widgets
 */
export async function generateDashboard(dashboardType, metrics) {
  switch (dashboardType) {
    case 'executive':
      return generateExecutiveDashboard(metrics);
    case 'financial':
      return generateFinancialDashboard(metrics);
    case 'operational':
      return generateOperationalDashboard(metrics);
    case 'opportunities':
      return generateOpportunitiesDashboard(metrics);
    case 'compliance':
      return generateComplianceDashboard(metrics);
    default:
      return generateExecutiveDashboard(metrics);
  }
}

export default {
  generateExecutiveDashboard,
  generateFinancialDashboard,
  generateOperationalDashboard,
  generateOpportunitiesDashboard,
  generateComplianceDashboard,
  generateDashboard
};
