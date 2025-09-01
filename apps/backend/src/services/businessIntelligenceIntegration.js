/**
 * Business Intelligence Integration Service
 * 
 * This service integrates the Business Intelligence Pod with the ACT Farmhand AI system
 * and provides comprehensive business operations support.
 */

import BusinessIntelligence from '../skillPods/BusinessIntelligence.js';
import BusinessDashboard from './businessDashboard.js';

class BusinessIntelligenceIntegration {
  constructor() {
    this.name = 'Business Intelligence Integration';
    
    // Initialize Business Intelligence Pod
    this.businessPod = new BusinessIntelligence({
      name: 'ACT Business Integration Orchestrator',
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve()
    });
    
    // Initialize Business Dashboard
    this.dashboard = new BusinessDashboard();
    
    // Business query routing patterns
    this.queryPatterns = this.initializeQueryPatterns();
    
    console.log('📊 Business Intelligence Integration initialized');
  }

  initializeQueryPatterns() {
    return {
      business_setup: [
        'how do i set up my business',
        'what business structure should i choose',
        'business registration requirements',
        'incorporating a business',
        'business entity formation'
      ],
      
      bookkeeping_payroll: [
        'bookkeeping setup',
        'payroll management',
        'accounting software',
        'employee taxes',
        'financial records'
      ],
      
      rd_credits: [
        'r&d tax credits',
        'sred claims',
        'research and development funding',
        'innovation tax credits',
        'experimental development'
      ],
      
      opportunities: [
        'government grants',
        'funding opportunities',
        'business programs',
        'indigenous business support',
        'grant applications'
      ],
      
      dashboard_analytics: [
        'business dashboard',
        'performance metrics',
        'financial analytics',
        'kpi tracking',
        'business intelligence reporting'
      ],
      
      compliance_legal: [
        'business compliance',
        'regulatory requirements',
        'tax obligations',
        'legal requirements',
        'filing deadlines'
      ]
    };
  }

  async processBusinessQuery(query, context = {}) {
    console.log(`📊 Processing business intelligence query: "${query}"`);
    
    try {
      // Determine query type
      const queryType = this.categorizeBusinessQuery(query);
      
      // Process through Business Intelligence Pod
      const businessResponse = await this.businessPod.process(query, {
        ...context,
        query_type: queryType,
        integration_mode: true
      });

      // Enhance with dashboard data if needed
      if (this.requiresDashboardData(queryType)) {
        const dashboardData = await this.dashboard.generateLiveDashboard(
          context.user_id, 
          this.getDashboardType(queryType)
        );
        
        businessResponse.dashboard_data = dashboardData;
      }

      // Add integration-specific enhancements
      return this.enhanceBusinessResponse(businessResponse, queryType, context);

    } catch (error) {
      console.error('Business intelligence processing error:', error);
      return {
        error: 'Business intelligence processing failed',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  categorizeBusinessQuery(query) {
    const queryLower = query.toLowerCase();
    
    for (const [type, patterns] of Object.entries(this.queryPatterns)) {
      if (patterns.some(pattern => queryLower.includes(pattern))) {
        return type;
      }
    }
    
    return 'general_business';
  }

  requiresDashboardData(queryType) {
    return ['dashboard_analytics', 'general_business'].includes(queryType);
  }

  getDashboardType(queryType) {
    const typeMapping = {
      'dashboard_analytics': 'executive',
      'bookkeeping_payroll': 'financial',
      'opportunities': 'opportunities',
      'compliance_legal': 'compliance'
    };
    
    return typeMapping[queryType] || 'executive';
  }

  async enhanceBusinessResponse(response, queryType, context) {
    // Add ACT-specific business considerations
    response.act_specific_considerations = this.getACTSpecificConsiderations(queryType);
    
    // Add next steps and action items
    response.immediate_next_steps = this.generateImmediateNextSteps(response, queryType);
    
    // Add relevant resources and contacts
    response.resources = this.getRelevantResources(queryType);
    
    return response;
  }

  getACTSpecificConsiderations(queryType) {
    const considerations = {
      business_setup: [
        'Consider Indigenous business development programs for additional support',
        'Explore community-owned business structures that align with ACT values',
        'Investigate tax benefits available to Indigenous businesses',
        'Consider cultural protocols in business decision-making processes'
      ],
      
      bookkeeping_payroll: [
        'Track community benefit and social impact metrics alongside financial metrics',
        'Consider Indigenous-specific accounting categories for traditional activities',
        'Explore hiring incentives for Indigenous employees',
        'Maintain records that support grant reporting requirements'
      ],
      
      rd_credits: [
        'Indigenous technology development may qualify for enhanced rates',
        'Document traditional knowledge integration in R&D projects',
        'Consider partnerships with Indigenous institutions for R&D collaboration',
        'Explore Indigenous-specific innovation funding programs'
      ],
      
      opportunities: [
        'Prioritize Indigenous business development programs',
        'Consider community consultation requirements for certain grants',
        'Explore partnership opportunities with other Indigenous organizations',
        'Align funding applications with community benefit objectives'
      ]
    };
    
    return considerations[queryType] || [
      'Ensure business decisions align with ACT community values',
      'Consider long-term community benefit in all business activities',
      'Maintain cultural sensitivity in all business operations'
    ];
  }

  generateImmediateNextSteps(response, queryType) {
    const steps = [];
    
    if (response.recommendations && response.recommendations.length > 0) {
      const highPriorityRecs = response.recommendations
        .filter(r => r.priority === 'high')
        .slice(0, 3);
      
      steps.push(...highPriorityRecs.map(r => ({
        action: r.action,
        timeline: r.timeline || 'ASAP',
        priority: 'immediate'
      })));
    }
    
    // Add query-specific next steps
    const specificSteps = this.getQuerySpecificSteps(queryType);
    steps.push(...specificSteps);
    
    return steps.slice(0, 5); // Limit to 5 immediate steps
  }

  getQuerySpecificSteps(queryType) {
    const steps = {
      business_setup: [
        { action: 'Research Indigenous business development programs', timeline: '1 week', priority: 'immediate' },
        { action: 'Consult with business lawyer or advisor', timeline: '2 weeks', priority: 'immediate' }
      ],
      
      bookkeeping_payroll: [
        { action: 'Set up cloud-based accounting software', timeline: '3 days', priority: 'immediate' },
        { action: 'Register for required tax accounts', timeline: '1 week', priority: 'immediate' }
      ],
      
      rd_credits: [
        { action: 'Document current R&D activities', timeline: 'ongoing', priority: 'immediate' },
        { action: 'Consult with SR&ED specialist', timeline: '2 weeks', priority: 'immediate' }
      ]
    };
    
    return steps[queryType] || [];
  }

  getRelevantResources(queryType) {
    const resources = {
      business_setup: [
        { name: 'Indigenous Business Development Program', type: 'government_program', url: 'https://www.sac-isc.gc.ca/eng/1100100033498/1100100033499' },
        { name: 'Canadian Council for Aboriginal Business', type: 'organization', url: 'https://www.ccab.com/' },
        { name: 'Indigenous Services Canada Business Development', type: 'government', url: 'https://www.sac-isc.gc.ca/' }
      ],
      
      bookkeeping_payroll: [
        { name: 'QuickBooks Online', type: 'software', url: 'https://quickbooks.intuit.com/ca/' },
        { name: 'CRA Payroll Information', type: 'government', url: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll.html' },
        { name: 'Xero Accounting Software', type: 'software', url: 'https://www.xero.com/ca/' }
      ],
      
      rd_credits: [
        { name: 'CRA SR&ED Program', type: 'government', url: 'https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html' },
        { name: 'NRC Industrial Research Assistance Program', type: 'government', url: 'https://nrc.canada.ca/en/support-technology-innovation/about-nrc-irap' }
      ]
    };
    
    return resources[queryType] || [];
  }

  async generateBusinessIntelligenceReport() {
    const report = {
      report_id: `business_intel_${Date.now()}`,
      generated_at: new Date().toISOString(),
      sections: {}
    };

    try {
      // Financial overview
      report.sections.financial = await this.dashboard.getFinancialSummary();
      
      // Business health assessment
      report.sections.health = await this.dashboard.getBusinessHealthScore();
      
      // Opportunity pipeline
      report.sections.opportunities = await this.dashboard.getKeyOpportunities();
      
      // Action items and alerts
      report.sections.action_items = await this.dashboard.getPriorityActionItems();
      report.sections.alerts = await this.dashboard.getCurrentAlerts();
      
      console.log('📊 Business intelligence report generated');
      return report;

    } catch (error) {
      console.error('Report generation error:', error);
      return {
        error: 'Report generation failed',
        message: error.message
      };
    }
  }

  async healthCheck() {
    const health = {
      service: this.name,
      status: 'operational',
      components: {}
    };

    try {
      // Check Business Intelligence Pod
      const podHealth = await this.businessPod.healthCheck();
      health.components.business_pod = podHealth;

      // Check Business Dashboard
      const dashboardHealth = await this.dashboard.healthCheck();
      health.components.dashboard = dashboardHealth;

      // Overall health assessment
      const allHealthy = Object.values(health.components)
        .every(c => c.status === 'healthy' || c.status === 'operational');
      
      health.status = allHealthy ? 'operational' : 'degraded';

    } catch (error) {
      health.status = 'error';
      health.error = error.message;
    }

    return health;
  }

  async close() {
    await this.businessPod.disconnect();
    await this.dashboard.close();
    console.log('📊 Business Intelligence Integration closed');
  }
}

export default BusinessIntelligenceIntegration;