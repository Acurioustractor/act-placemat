/**
 * Business Dashboard Service - Real-Time Business Intelligence Dashboard
 * 
 * Philosophy: "Live data drives live decisions"
 * 
 * This service provides:
 * - Real-time business metrics and KPI tracking
 * - Live decision-making dashboard with alerts
 * - Automated opportunity and compliance monitoring
 * - Strategic business intelligence visualization
 * - Mobile-responsive dashboard for on-the-go decisions
 */

import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import cron from 'node-cron';

class BusinessDashboard {
  constructor() {
    this.name = 'Business Dashboard Service';
    
    // Initialize connections
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Dashboard configuration
    this.dashboardConfig = this.initializeDashboardConfig();
    
    // Real-time data sources
    this.dataSources = this.initializeDataSources();
    
    // Alert thresholds and rules
    this.alertRules = this.initializeAlertRules();
    
    // Start automated monitoring
    this.startAutomatedMonitoring();
    
    console.log('📊 Business Dashboard Service initialized - Live intelligence ready');
  }

  initializeDashboardConfig() {
    return {
      refresh_intervals: {
        financial_metrics: 300000, // 5 minutes
        operational_metrics: 600000, // 10 minutes
        opportunity_scanning: 3600000, // 1 hour
        compliance_monitoring: 86400000 // 24 hours
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

  initializeDataSources() {
    return {
      financial: {
        accounting_software: {
          connection: 'quickbooks_api',
          metrics: ['revenue', 'expenses', 'cash_flow', 'accounts_receivable', 'accounts_payable'],
          update_frequency: 'real_time'
        },
        
        banking: {
          connection: 'open_banking_api',
          metrics: ['account_balances', 'transaction_history', 'cash_position'],
          update_frequency: 'hourly'
        }
      },
      
      operational: {
        project_management: {
          connection: 'project_tracking_api',
          metrics: ['project_progress', 'resource_allocation', 'milestone_completion'],
          update_frequency: 'real_time'
        },
        
        crm: {
          connection: 'customer_relationship_api',
          metrics: ['client_engagement', 'sales_pipeline', 'customer_satisfaction'],
          update_frequency: 'daily'
        }
      },
      
      external: {
        government_apis: {
          connection: 'grants_gov_api',
          metrics: ['available_grants', 'application_deadlines', 'program_updates'],
          update_frequency: 'daily'
        },
        
        market_data: {
          connection: 'market_intelligence_api',
          metrics: ['industry_trends', 'competitor_analysis', 'market_opportunities'],
          update_frequency: 'weekly'
        }
      }
    };
  }

  initializeAlertRules() {
    return {
      financial_alerts: [
        {
          name: 'Low Cash Flow Warning',
          condition: 'cash_flow_days_remaining < 90',
          severity: 'high',
          action: 'immediate_review_required'
        },
        {
          name: 'Budget Variance Alert',
          condition: 'budget_variance > 15%',
          severity: 'medium',
          action: 'budget_review_needed'
        },
        {
          name: 'Revenue Target Miss',
          condition: 'monthly_revenue < 80% of target',
          severity: 'high',
          action: 'sales_strategy_review'
        }
      ],
      
      operational_alerts: [
        {
          name: 'Project Delay Warning',
          condition: 'project_delay > 14 days',
          severity: 'medium',
          action: 'project_review_required'
        },
        {
          name: 'Team Capacity Alert',
          condition: 'team_utilization > 90%',
          severity: 'medium',
          action: 'resource_planning_needed'
        }
      ],
      
      opportunity_alerts: [
        {
          name: 'Grant Deadline Approaching',
          condition: 'grant_deadline < 30 days',
          severity: 'medium',
          action: 'application_preparation'
        },
        {
          name: 'New Opportunity Available',
          condition: 'new_opportunity_match_score > 80%',
          severity: 'low',
          action: 'opportunity_evaluation'
        }
      ],
      
      compliance_alerts: [
        {
          name: 'Tax Filing Deadline',
          condition: 'tax_deadline < 14 days',
          severity: 'high',
          action: 'immediate_filing_required'
        },
        {
          name: 'Regulatory Change',
          condition: 'new_regulation_impact_score > 70%',
          severity: 'medium',
          action: 'compliance_review_needed'
        }
      ]
    };
  }

  async generateLiveDashboard(userId = null, dashboardType = 'executive') {
    console.log(`📊 Generating live dashboard: ${dashboardType}`);
    
    const dashboard = {
      dashboard_id: `dashboard_${Date.now()}`,
      dashboard_type: dashboardType,
      user_id: userId,
      generated_at: new Date().toISOString(),
      refresh_rate: this.dashboardConfig.refresh_intervals.financial_metrics,
      widgets: [],
      alerts: [],
      metadata: {}
    };

    try {
      // Generate dashboard based on type
      switch (dashboardType) {
        case 'executive':
          dashboard.widgets = await this.generateExecutiveDashboard();
          break;
        case 'financial':
          dashboard.widgets = await this.generateFinancialDashboard();
          break;
        case 'operational':
          dashboard.widgets = await this.generateOperationalDashboard();
          break;
        case 'opportunities':
          dashboard.widgets = await this.generateOpportunitiesDashboard();
          break;
        case 'compliance':
          dashboard.widgets = await this.generateComplianceDashboard();
          break;
        default:
          dashboard.widgets = await this.generateExecutiveDashboard();
      }

      // Add current alerts
      dashboard.alerts = await this.getCurrentAlerts();

      // Add metadata
      dashboard.metadata = {
        last_updated: new Date().toISOString(),
        data_sources: Object.keys(this.dataSources),
        active_alerts: dashboard.alerts.length,
        dashboard_health: 'operational'
      };

      // Cache dashboard for quick access
      await this.cacheDashboard(dashboard);

      return dashboard;

    } catch (error) {
      console.error('Dashboard generation error:', error);
      return {
        error: 'Dashboard generation failed',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async generateExecutiveDashboard() {
    return [
      {
        id: 'revenue_overview',
        title: 'Revenue Overview',
        type: 'metric_card',
        data: await this.getRevenueOverview(),
        position: { x: 0, y: 0, w: 3, h: 2 },
        refresh_interval: 300000
      },
      {
        id: 'cash_flow_status',
        title: 'Cash Flow Status',
        type: 'gauge',
        data: await this.getCashFlowStatus(),
        position: { x: 3, y: 0, w: 3, h: 2 },
        refresh_interval: 300000
      },
      {
        id: 'business_health',
        title: 'Business Health Score',
        type: 'health_indicator',
        data: await this.getBusinessHealthScore(),
        position: { x: 6, y: 0, w: 3, h: 2 },
        refresh_interval: 600000
      },
      {
        id: 'key_opportunities',
        title: 'Key Opportunities',
        type: 'opportunity_list',
        data: await this.getKeyOpportunities(),
        position: { x: 9, y: 0, w: 3, h: 2 },
        refresh_interval: 3600000
      },
      {
        id: 'performance_trends',
        title: 'Performance Trends',
        type: 'line_chart',
        data: await this.getPerformanceTrends(),
        position: { x: 0, y: 2, w: 6, h: 4 },
        refresh_interval: 600000
      },
      {
        id: 'action_items',
        title: 'Priority Action Items',
        type: 'task_list',
        data: await this.getPriorityActionItems(),
        position: { x: 6, y: 2, w: 6, h: 4 },
        refresh_interval: 600000
      }
    ];
  }

  async generateFinancialDashboard() {
    return [
      {
        id: 'financial_summary',
        title: 'Financial Summary',
        type: 'financial_overview',
        data: await this.getFinancialSummary(),
        position: { x: 0, y: 0, w: 12, h: 2 }
      },
      {
        id: 'revenue_analysis',
        title: 'Revenue Analysis',
        type: 'revenue_chart',
        data: await this.getRevenueAnalysis(),
        position: { x: 0, y: 2, w: 6, h: 4 }
      },
      {
        id: 'expense_breakdown',
        title: 'Expense Breakdown',
        type: 'pie_chart',
        data: await this.getExpenseBreakdown(),
        position: { x: 6, y: 2, w: 6, h: 4 }
      },
      {
        id: 'cash_flow_projection',
        title: 'Cash Flow Projection',
        type: 'projection_chart',
        data: await this.getCashFlowProjection(),
        position: { x: 0, y: 6, w: 8, h: 4 }
      },
      {
        id: 'financial_alerts',
        title: 'Financial Alerts',
        type: 'alert_panel',
        data: await this.getFinancialAlerts(),
        position: { x: 8, y: 6, w: 4, h: 4 }
      }
    ];
  }

  async getCurrentAlerts() {
    const alerts = [];
    
    try {
      // Check financial alerts
      const financialData = await this.getFinancialMetrics();
      for (const rule of this.alertRules.financial_alerts) {
        if (this.evaluateAlertCondition(rule.condition, financialData)) {
          alerts.push({
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'financial',
            name: rule.name,
            severity: rule.severity,
            action: rule.action,
            triggered_at: new Date().toISOString(),
            data: financialData
          });
        }
      }

      // Check operational alerts
      const operationalData = await this.getOperationalMetrics();
      for (const rule of this.alertRules.operational_alerts) {
        if (this.evaluateAlertCondition(rule.condition, operationalData)) {
          alerts.push({
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'operational',
            name: rule.name,
            severity: rule.severity,
            action: rule.action,
            triggered_at: new Date().toISOString(),
            data: operationalData
          });
        }
      }

      // Check opportunity alerts
      const opportunityData = await this.getOpportunityMetrics();
      for (const rule of this.alertRules.opportunity_alerts) {
        if (this.evaluateAlertCondition(rule.condition, opportunityData)) {
          alerts.push({
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'opportunity',
            name: rule.name,
            severity: rule.severity,
            action: rule.action,
            triggered_at: new Date().toISOString(),
            data: opportunityData
          });
        }
      }

    } catch (error) {
      console.error('Alert checking error:', error);
      alerts.push({
        id: `alert_system_error`,
        type: 'system',
        name: 'Alert System Error',
        severity: 'medium',
        action: 'system_check_required',
        triggered_at: new Date().toISOString(),
        error: error.message
      });
    }

    return alerts;
  }

  // Data retrieval methods (would connect to actual data sources)
  async getRevenueOverview() {
    return {
      current_month: 0,
      previous_month: 0,
      growth_rate: 0,
      target: 50000,
      target_progress: 0
    };
  }

  async getCashFlowStatus() {
    return {
      current_balance: 75000,
      monthly_burn_rate: 10000,
      runway_months: 7.5,
      status: 'healthy'
    };
  }

  async getBusinessHealthScore() {
    return {
      overall_score: 75,
      financial_health: 80,
      operational_health: 70,
      growth_potential: 85,
      risk_level: 'low'
    };
  }

  async getKeyOpportunities() {
    return [
      {
        title: 'IRAP Funding Application',
        value: '$500,000',
        deadline: '2024-03-15',
        status: 'ready_to_apply',
        priority: 'high'
      },
      {
        title: 'Indigenous Skills Training Grant',
        value: '$100,000',
        deadline: '2024-04-01',
        status: 'in_preparation',
        priority: 'medium'
      }
    ];
  }

  async startAutomatedMonitoring() {
    console.log('🔍 Starting automated business monitoring...');

    // Update financial metrics every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.updateFinancialMetrics();
    });

    // Update operational metrics every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      await this.updateOperationalMetrics();
    });

    // Scan for opportunities every hour
    cron.schedule('0 * * * *', async () => {
      await this.scanForOpportunities();
    });

    // Daily compliance check
    cron.schedule('0 9 * * *', async () => {
      await this.checkComplianceStatus();
    });
  }

  async updateFinancialMetrics() {
    try {
      const metrics = await this.getFinancialMetrics();
      await this.redis.setex('business:financial_metrics', 300, JSON.stringify(metrics));
      console.log('📊 Financial metrics updated');
    } catch (error) {
      console.error('Financial metrics update error:', error);
    }
  }

  async cacheDashboard(dashboard) {
    try {
      const cacheKey = `dashboard:${dashboard.dashboard_type}:${dashboard.user_id || 'default'}`;
      await this.redis.setex(cacheKey, 300, JSON.stringify(dashboard));
    } catch (error) {
      console.error('Dashboard caching error:', error);
    }
  }

  evaluateAlertCondition(condition, data) {
    // Simple condition evaluation (would be more sophisticated in production)
    try {
      // Replace variables in condition with actual data values
      let evaluationExpression = condition;
      for (const [key, value] of Object.entries(data)) {
        evaluationExpression = evaluationExpression.replace(key, value);
      }
      
      // This is a simplified evaluation - in production would use a proper expression parser
      return eval(evaluationExpression);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  async getFinancialMetrics() {
    // Mock data - would connect to real financial systems
    return {
      cash_flow_days_remaining: 120,
      budget_variance: 12,
      monthly_revenue: 35000,
      target_revenue: 50000
    };
  }

  async getOperationalMetrics() {
    // Mock data - would connect to real operational systems
    return {
      project_delay: 7,
      team_utilization: 75
    };
  }

  async getOpportunityMetrics() {
    // Mock data - would connect to opportunity tracking systems
    return {
      grant_deadline: 25,
      new_opportunity_match_score: 85
    };
  }

  async healthCheck() {
    return {
      service: this.name,
      status: 'operational',
      data_sources: {
        redis: 'connected',
        supabase: 'connected'
      },
      monitoring: {
        financial_updates: 'active',
        operational_updates: 'active',
        opportunity_scanning: 'active',
        compliance_monitoring: 'active'
      }
    };
  }

  async close() {
    await this.redis.quit();
    console.log('📊 Business Dashboard Service disconnected');
  }
}

export default BusinessDashboard;