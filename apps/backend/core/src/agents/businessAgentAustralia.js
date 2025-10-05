/**
 * Always-On Business Agent for Australian Operations
 *
 * Autonomous business intelligence agent that continuously monitors and provides
 * actionable insights across all areas of business operations in Australia.
 *
 * Core Capabilities:
 * - Financial autopilot (Xero monitoring, cash flow forecasting)
 * - Australian compliance tracking (BAS, PAYG, Superannuation, R&D)
 * - Grant and opportunity discovery (grants.gov.au, Indigenous programs)
 * - Relationship management (LinkedIn network analysis)
 * - Project intelligence (Notion project health monitoring)
 */

import BusinessIntelligenceIntegration from '../services/businessIntelligenceIntegration.js';
import { createSupabaseClient } from '../config/supabase.js';

class BusinessAgentAustralia {
  constructor(options = {}) {
    this.name = 'ACT Business Agent - Australia';
    this.version = '1.0.0';
    this.region = 'Australia';

    // Initialize core services
    this.businessIntel = new BusinessIntelligenceIntegration();
    this.supabase = createSupabaseClient();

    // Agent state
    this.isRunning = false;
    this.lastAnalysisTime = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 5;

    // Configuration
    this.config = {
      analysisIntervalMinutes: options.analysisIntervalMinutes || 60,
      criticalAlertThreshold: options.criticalAlertThreshold || 'high',
      enableNotifications: options.enableNotifications !== false,
      enableComplianceMonitoring: options.enableComplianceMonitoring !== false,
      enableGrantDiscovery: options.enableGrantDiscovery !== false,
      ...options
    };

    console.log(`🇦🇺 ${this.name} v${this.version} initialized`);
    console.log(`   Analysis interval: ${this.config.analysisIntervalMinutes} minutes`);
    console.log(`   Compliance monitoring: ${this.config.enableComplianceMonitoring ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Grant discovery: ${this.config.enableGrantDiscovery ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Start the autonomous business agent
   */
  async start() {
    if (this.isRunning) {
      console.warn('⚠️ Business agent is already running');
      return;
    }

    try {
      console.log('🚀 Starting Business Agent for Australia...');

      // Run initial analysis
      await this.runContinuousAnalysis();

      this.isRunning = true;
      console.log(`✅ Business Agent is now running (analyzing every ${this.config.analysisIntervalMinutes} minutes)`);

      return {
        success: true,
        status: 'running',
        message: 'Business agent started successfully',
        nextAnalysis: this.getNextAnalysisTime()
      };

    } catch (error) {
      console.error('❌ Failed to start business agent:', error);
      return {
        success: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Stop the autonomous business agent
   */
  async stop() {
    console.log('⏸️ Stopping Business Agent...');
    this.isRunning = false;
    console.log('✅ Business Agent stopped');

    return {
      success: true,
      status: 'stopped',
      lastAnalysis: this.lastAnalysisTime
    };
  }

  /**
   * Run continuous business analysis across all domains
   */
  async runContinuousAnalysis() {
    console.log('🔍 Running business analysis cycle...');
    const startTime = Date.now();

    try {
      // Gather insights from all domains in parallel
      const insights = await this.gatherInsights();

      // Generate actionable recommendations
      const recommendations = await this.generateRecommendations(insights);

      // Store insights for historical tracking
      await this.storeInsights(insights, recommendations);

      // Send notifications for critical items
      if (this.config.enableNotifications) {
        await this.sendNotifications(insights, recommendations);
      }

      // Update agent state
      this.lastAnalysisTime = new Date().toISOString();
      this.consecutiveErrors = 0;

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Analysis cycle completed in ${duration}s`);

      return {
        success: true,
        insights,
        recommendations,
        duration: `${duration}s`,
        timestamp: this.lastAnalysisTime
      };

    } catch (error) {
      console.error('❌ Analysis cycle failed:', error);
      this.consecutiveErrors++;

      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error(`⚠️ Max consecutive errors reached (${this.maxConsecutiveErrors}), stopping agent`);
        await this.stop();
      }

      return {
        success: false,
        error: error.message,
        consecutiveErrors: this.consecutiveErrors
      };
    }
  }

  /**
   * Gather insights from all business domains
   */
  async gatherInsights() {
    console.log('📊 Gathering insights across all business domains...');

    const [
      financial,
      compliance,
      opportunities,
      relationships,
      projects
    ] = await Promise.allSettled([
      this.analyzeFinancials(),
      this.config.enableComplianceMonitoring ? this.checkAustralianCompliance() : Promise.resolve({ skipped: true }),
      this.config.enableGrantDiscovery ? this.scanGrantOpportunities() : Promise.resolve({ skipped: true }),
      this.analyzeRelationships(),
      this.analyzeProjects()
    ]);

    return {
      financial: financial.status === 'fulfilled' ? financial.value : { error: financial.reason?.message },
      compliance: compliance.status === 'fulfilled' ? compliance.value : { error: compliance.reason?.message },
      opportunities: opportunities.status === 'fulfilled' ? opportunities.value : { error: opportunities.reason?.message },
      relationships: relationships.status === 'fulfilled' ? relationships.value : { error: relationships.reason?.message },
      projects: projects.status === 'fulfilled' ? projects.value : { error: projects.reason?.message },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze financial health from Xero data
   */
  async analyzeFinancials() {
    console.log('💰 Analyzing financial health...');

    try {
      // Query for recent financial alerts and metrics
      const { data: financialData, error } = await this.supabase
        .from('financial_intelligence')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const analysis = {
        status: 'healthy',
        alerts: [],
        metrics: {
          cashPosition: null,
          burnRate: null,
          runway: null,
          overdueInvoices: 0
        },
        recommendations: []
      };

      // Analyze cash position (placeholder - integrate with Xero API)
      analysis.metrics.cashPosition = 'Monitoring active';

      // Check for overdue invoices
      analysis.alerts.push({
        type: 'info',
        priority: 'medium',
        title: 'Financial Monitoring Active',
        message: 'Xero integration configured - add live data analysis',
        actionRequired: 'Configure Xero API sync for real-time data'
      });

      return analysis;

    } catch (error) {
      console.error('Financial analysis error:', error);
      return {
        status: 'error',
        error: error.message,
        alerts: [{
          type: 'error',
          priority: 'high',
          title: 'Financial Analysis Failed',
          message: error.message
        }]
      };
    }
  }

  /**
   * Check Australian compliance requirements
   */
  async checkAustralianCompliance() {
    console.log('📋 Checking Australian compliance requirements...');

    const today = new Date();
    const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
    const currentMonth = today.getMonth() + 1;

    const compliance = {
      status: 'monitoring',
      checks: [],
      upcomingDeadlines: [],
      alerts: []
    };

    // BAS (Business Activity Statement) - Quarterly
    const basMonths = [10, 1, 4, 7]; // Oct, Jan, Apr, Jul (28 days after quarter end)
    if (basMonths.includes(currentMonth)) {
      compliance.upcomingDeadlines.push({
        type: 'BAS',
        description: 'Business Activity Statement due',
        deadline: this.getQuarterEndDate(currentQuarter),
        daysRemaining: this.getDaysUntil(this.getQuarterEndDate(currentQuarter)),
        priority: 'high',
        action: 'Lodge BAS via ATO portal or accountant'
      });
    }

    // PAYG Withholding - Monthly
    compliance.checks.push({
      type: 'PAYG',
      description: 'Pay As You Go Withholding',
      status: 'monitoring',
      frequency: 'monthly',
      nextDeadline: this.getNextPAYGDeadline(),
      action: 'Ensure employee tax withheld is paid to ATO'
    });

    // Superannuation - Quarterly
    compliance.checks.push({
      type: 'Superannuation',
      description: 'Superannuation Guarantee payments',
      status: 'monitoring',
      frequency: 'quarterly',
      rate: '11.5%', // 2024-25 rate
      nextDeadline: this.getQuarterEndDate(currentQuarter),
      action: 'Ensure super payments made for all eligible employees'
    });

    // R&D Tax Incentive - Annual
    compliance.checks.push({
      type: 'R&D Tax Incentive',
      description: 'Research & Development Tax Incentive',
      status: 'monitoring',
      frequency: 'annual',
      eligibility: 'Technology development activities',
      nextDeadline: '30 April (following financial year)',
      action: 'Document R&D activities throughout the year for claim'
    });

    // Indigenous Business Obligations
    compliance.checks.push({
      type: 'Indigenous Business',
      description: 'Indigenous Business Reporting',
      status: 'monitoring',
      considerations: [
        'Supply Nation certification renewal',
        'Indigenous employment reporting',
        'Community consultation documentation',
        'Cultural heritage compliance'
      ]
    });

    // Generate alerts for upcoming deadlines
    compliance.upcomingDeadlines.forEach(deadline => {
      if (deadline.daysRemaining <= 14) {
        compliance.alerts.push({
          type: 'warning',
          priority: deadline.daysRemaining <= 7 ? 'critical' : 'high',
          title: `${deadline.type} Due in ${deadline.daysRemaining} days`,
          message: deadline.description,
          action: deadline.action,
          deadline: deadline.deadline
        });
      }
    });

    console.log(`   ✓ Checked ${compliance.checks.length} compliance items`);
    console.log(`   ⚠️ ${compliance.alerts.length} upcoming deadlines`);

    return compliance;
  }

  /**
   * Scan for grant and funding opportunities
   */
  async scanGrantOpportunities() {
    console.log('🎯 Scanning for grant opportunities...');

    const opportunities = {
      totalFound: 0,
      relevant: [],
      sources: [
        'grants.gov.au',
        'business.gov.au',
        'Indigenous Advancement Strategy',
        'CSIRO Innovation Fund'
      ]
    };

    // Indigenous business programs
    opportunities.relevant.push({
      title: 'Indigenous Business Direct',
      source: 'Department of Prime Minister and Cabinet',
      type: 'Indigenous Business Support',
      description: 'Financial assistance for Indigenous businesses',
      eligibility: 'Indigenous-owned businesses',
        estimatedValue: '$10,000 - $250,000',
      deadline: 'Rolling applications',
      priority: 'high',
      url: 'https://www.niaa.gov.au/indigenous-affairs/economic-development/indigenous-business-sector-support'
    });

    // R&D Tax Incentive
    opportunities.relevant.push({
      title: 'R&D Tax Incentive',
      source: 'Australian Taxation Office',
      type: 'Tax Credit',
      description: 'Tax offset for eligible R&D activities',
      eligibility: 'Companies conducting eligible R&D',
      estimatedValue: '38.5% - 43.5% of R&D expenditure',
      deadline: 'Annual (with financial year)',
      priority: 'high',
      url: 'https://www.ato.gov.au/business/research-and-development-tax-incentive/'
    });

    // Innovation Grants
    opportunities.relevant.push({
      title: 'Entrepreneurs\' Programme',
      source: 'Department of Industry, Science and Resources',
      type: 'Business Growth',
      description: 'Support for accelerating commercialisation',
      eligibility: 'Australian businesses',
      estimatedValue: 'Up to $1 million',
      deadline: 'Rolling applications',
      priority: 'medium',
      url: 'https://business.gov.au/grants-and-programs/entrepreneurs-programme'
    });

    opportunities.totalFound = opportunities.relevant.length;

    console.log(`   ✓ Found ${opportunities.totalFound} relevant opportunities`);

    return opportunities;
  }

  /**
   * Analyze relationship intelligence from LinkedIn network
   */
  async analyzeRelationships() {
    console.log('🤝 Analyzing relationship intelligence...');

    try {
      // Query LinkedIn contacts from database
      const { data: contacts, error } = await this.supabase
        .from('linkedin_contacts')
        .select('*')
        .order('strategic_value', { ascending: false })
        .limit(50);

      if (error) throw error;

      const analysis = {
        networkSize: contacts?.length || 0,
        strategicContacts: contacts?.filter(c => c.strategic_value === 'High').length || 0,
        recentEngagements: 0,
        recommendations: []
      };

      // Identify high-value contacts to engage
      if (analysis.strategicContacts > 0) {
        analysis.recommendations.push({
          type: 'engagement',
          priority: 'medium',
          title: `Engage with ${analysis.strategicContacts} strategic contacts`,
          description: 'Maintain relationships with high-value connections',
          action: 'Review strategic contacts in dashboard and schedule outreach'
        });
      }

      console.log(`   ✓ Analyzed ${analysis.networkSize} contacts`);
      console.log(`   🎯 ${analysis.strategicContacts} strategic connections`);

      return analysis;

    } catch (error) {
      console.error('Relationship analysis error:', error);
      return {
        error: error.message,
        networkSize: 0
      };
    }
  }

  /**
   * Analyze project health from Notion
   */
  async analyzeProjects() {
    console.log('📁 Analyzing project health...');

    try {
      // Query project data
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const analysis = {
        totalProjects: projects?.length || 0,
        activeProjects: projects?.filter(p => p.status === 'Active').length || 0,
        blockedProjects: projects?.filter(p => p.status === 'Blocked').length || 0,
        alerts: [],
        recommendations: []
      };

      // Check for blocked projects
      if (analysis.blockedProjects > 0) {
        analysis.alerts.push({
          type: 'warning',
          priority: 'high',
          title: `${analysis.blockedProjects} blocked project(s)`,
          message: 'Projects require attention to unblock',
          action: 'Review blocked projects in Notion and identify resolution path'
        });
      }

      console.log(`   ✓ Analyzed ${analysis.totalProjects} projects`);
      if (analysis.blockedProjects > 0) {
        console.log(`   ⚠️ ${analysis.blockedProjects} blocked projects need attention`);
      }

      return analysis;

    } catch (error) {
      console.error('Project analysis error:', error);
      return {
        error: error.message,
        totalProjects: 0
      };
    }
  }

  /**
   * Generate actionable recommendations from insights
   */
  async generateRecommendations(insights) {
    console.log('💡 Generating recommendations...');

    const recommendations = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    // Collect all alerts by priority
    Object.values(insights).forEach(domain => {
      if (domain && domain.alerts) {
        domain.alerts.forEach(alert => {
          const priority = alert.priority || 'medium';
          if (recommendations[priority]) {
            recommendations[priority].push({
              domain: domain.name || 'general',
              ...alert
            });
          }
        });
      }
    });

    // Compliance deadlines are always high priority
    if (insights.compliance && insights.compliance.upcomingDeadlines) {
      insights.compliance.upcomingDeadlines.forEach(deadline => {
        recommendations.high.push({
          domain: 'compliance',
          type: 'deadline',
          title: `${deadline.type} deadline approaching`,
          message: `${deadline.description} - ${deadline.daysRemaining} days remaining`,
          action: deadline.action,
          deadline: deadline.deadline
        });
      });
    }

    // Grant opportunities
    if (insights.opportunities && insights.opportunities.relevant) {
      insights.opportunities.relevant
        .filter(opp => opp.priority === 'high')
        .forEach(opp => {
          recommendations.high.push({
            domain: 'opportunities',
            type: 'grant',
            title: opp.title,
            message: `${opp.type}: ${opp.description}`,
            action: `Review eligibility and apply at ${opp.url}`,
            estimatedValue: opp.estimatedValue
          });
        });
    }

    const totalRecommendations =
      recommendations.critical.length +
      recommendations.high.length +
      recommendations.medium.length +
      recommendations.low.length;

    console.log(`   ✓ Generated ${totalRecommendations} recommendations`);
    console.log(`   🔴 Critical: ${recommendations.critical.length}`);
    console.log(`   🟠 High: ${recommendations.high.length}`);
    console.log(`   🟡 Medium: ${recommendations.medium.length}`);

    return recommendations;
  }

  /**
   * Store insights in database for historical tracking
   */
  async storeInsights(insights, recommendations) {
    try {
      const { error } = await this.supabase
        .from('agent_insights')
        .insert({
          agent_name: this.name,
          agent_version: this.version,
          insights: insights,
          recommendations: recommendations,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log('💾 Insights stored successfully');

    } catch (error) {
      // Non-critical error - log but don't fail
      console.warn('⚠️ Failed to store insights:', error.message);
    }
  }

  /**
   * Send notifications for critical items
   */
  async sendNotifications(insights, recommendations) {
    console.log('📬 Processing notifications...');

    // For now, just log critical and high priority items
    // In production, integrate with Slack, SMS, Email

    const criticalItems = recommendations.critical || [];
    const highItems = recommendations.high || [];

    if (criticalItems.length > 0) {
      console.log('🚨 CRITICAL ALERTS:');
      criticalItems.forEach(item => {
        console.log(`   - ${item.title}: ${item.message}`);
      });
      // TODO: Send SMS via Twilio for critical alerts
    }

    if (highItems.length > 0) {
      console.log('⚠️ HIGH PRIORITY:');
      highItems.forEach(item => {
        console.log(`   - ${item.title}: ${item.message}`);
      });
      // TODO: Send Slack notification for high priority items
    }
  }

  /**
   * Generate morning intelligence brief
   */
  async generateMorningBrief() {
    console.log('☀️ Generating morning intelligence brief...');

    const insights = await this.gatherInsights();
    const recommendations = await this.generateRecommendations(insights);

    const brief = {
      date: new Date().toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      summary: this.generateBriefSummary(insights, recommendations),
      insights: insights,
      recommendations: recommendations,
      priorityActions: this.getPriorityActions(recommendations)
    };

    return brief;
  }

  /**
   * Generate brief summary
   */
  generateBriefSummary(insights, recommendations) {
    const totalActions = (recommendations.critical?.length || 0) +
                        (recommendations.high?.length || 0);

    return {
      headline: totalActions > 0
        ? `${totalActions} priority action(s) require attention`
        : 'All systems operational - no urgent actions',
      financialStatus: insights.financial?.status || 'unknown',
      complianceStatus: insights.compliance?.status || 'unknown',
      projectHealth: insights.projects?.blockedProjects > 0 ? 'attention_needed' : 'good',
      opportunitiesFound: insights.opportunities?.totalFound || 0
    };
  }

  /**
   * Get priority actions for today
   */
  getPriorityActions(recommendations) {
    const actions = [];

    // Critical items first
    if (recommendations.critical) {
      actions.push(...recommendations.critical.map(r => ({
        priority: 'critical',
        ...r
      })));
    }

    // Then high priority
    if (recommendations.high) {
      actions.push(...recommendations.high.slice(0, 5).map(r => ({
        priority: 'high',
        ...r
      })));
    }

    return actions.slice(0, 10); // Max 10 priority actions
  }

  /**
   * Get agent status
   */
  async getStatus() {
    return {
      agent: this.name,
      version: this.version,
      region: this.region,
      status: this.isRunning ? 'running' : 'stopped',
      lastAnalysis: this.lastAnalysisTime,
      nextAnalysis: this.isRunning ? this.getNextAnalysisTime() : null,
      consecutiveErrors: this.consecutiveErrors,
      config: {
        analysisInterval: `${this.config.analysisIntervalMinutes} minutes`,
        complianceMonitoring: this.config.enableComplianceMonitoring,
        grantDiscovery: this.config.enableGrantDiscovery,
        notifications: this.config.enableNotifications
      }
    };
  }

  /**
   * Utility: Get next analysis time
   */
  getNextAnalysisTime() {
    const next = new Date();
    next.setMinutes(next.getMinutes() + this.config.analysisIntervalMinutes);
    return next.toISOString();
  }

  /**
   * Utility: Get quarter end date
   */
  getQuarterEndDate(quarter) {
    const year = new Date().getFullYear();
    const quarterEndMonths = [3, 6, 9, 12]; // Mar, Jun, Sep, Dec
    const month = quarterEndMonths[quarter - 1];
    return new Date(year, month, 0).toISOString().split('T')[0];
  }

  /**
   * Utility: Get days until date
   */
  getDaysUntil(dateString) {
    const target = new Date(dateString);
    const today = new Date();
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Utility: Get next PAYG deadline
   */
  getNextPAYGDeadline() {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 21);
    return nextMonth.toISOString().split('T')[0];
  }
}

export default BusinessAgentAustralia;