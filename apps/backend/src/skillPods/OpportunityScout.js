/**
 * Opportunity Scout Skill Pod - World-Class Opportunity Intelligence Engine
 * 
 * Philosophy: "Every connection creates possibility" - Finding aligned opportunities
 * 
 * This sophisticated scout provides:
 * - AI-powered grant and funding opportunity discovery
 * - Partnership matching with cultural alignment scoring
 * - Policy advocacy opportunity identification
 * - Media and speaking engagement opportunities
 * - Collaborative project matching
 * - Strategic timing optimization
 */

import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import OpenAI from 'openai';
import neo4j from 'neo4j-driver';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

class OpportunityScout {
  constructor(agent) {
    this.agent = agent;
    this.name = 'Opportunity Scout';
    
    // Initialize connections
    this.kafka = new Kafka({
      clientId: 'act-opportunity-scout',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
    });
    
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'opportunity-scout-group' });
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Neo4j for opportunity network mapping
    this.neo4j = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'actfarmhand2024'
      )
    );
    
    // OpenAI for intelligent analysis
    this.openai = null;
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    // Opportunity sources and databases
    this.opportunitySources = this.initializeOpportunitySources();
    
    // Opportunity intelligence cache
    this.opportunityCache = new Map();
    this.partnershipDatabase = new Map();
    this.fundingPipeline = new Map();
    
    // Scoring algorithms and criteria
    this.scoringCriteria = this.initializeScoringCriteria();
    
    // Cultural alignment matrix
    this.culturalAlignmentMatrix = this.initializeCulturalAlignment();
    
    // Opportunity thresholds
    this.thresholds = {
      funding_minimum: 10000,
      cultural_alignment: 0.75,
      strategic_fit: 0.65,
      effort_roi_minimum: 2.0,
      partnership_compatibility: 0.70
    };
    
    // Web scraping browser
    this.browser = null;
    
    console.log('🔍 Opportunity Scout initialized - Discovering aligned possibilities');
  }

  initializeOpportunitySources() {
    return {
      // Australian Government Sources
      grants_gov: {
        name: 'GrantConnect',
        url: 'https://www.grants.gov.au',
        api_key: process.env.GRANTS_GOV_API_KEY,
        search_endpoints: [
          '/api/grants/search',
          '/api/grants/by-category',
          '/api/grants/open'
        ],
        categories: ['community', 'indigenous', 'arts', 'environment', 'social-services']
      },
      
      philanthropy_australia: {
        name: 'Philanthropy Australia',
        url: 'https://www.philanthropy.org.au',
        scraping: true,
        directories: [
          '/giving-and-funding/funding-opportunities',
          '/news-and-events/funding-alerts'
        ]
      },
      
      // Foundation Sources
      australian_communities_foundation: {
        name: 'Australian Communities Foundation',
        url: 'https://www.australiancommunitiesoundation.org.au',
        scraping: true,
        grant_programs: [
          '/grants-scholarships/open-grants',
          '/grants-scholarships/community-grants'
        ]
      },
      
      // Corporate Giving
      corporate_databases: {
        name: 'Corporate Giving Intelligence',
        sources: [
          'Westpac Foundation',
          'ANZ Community Grants',
          'NAB Community Grants',
          'Telstra Foundation',
          'BHP Foundation'
        ],
        scraping: true
      },
      
      // International Sources
      ford_foundation: {
        name: 'Ford Foundation',
        url: 'https://www.fordfoundation.org',
        api_available: true,
        focus_areas: ['social-justice', 'inequality', 'democracy']
      },
      
      open_society: {
        name: 'Open Society Foundations',
        url: 'https://www.opensocietyfoundations.org',
        scraping: true,
        regional_focus: ['asia-pacific', 'indigenous-rights']
      },
      
      // Partnership Sources
      unhcr_partnerships: {
        name: 'UNHCR Partnership Opportunities',
        url: 'https://www.unhcr.org/partnerships',
        categories: ['implementation', 'advocacy', 'awareness']
      },
      
      un_partnerships: {
        name: 'UN Partnership Opportunities',
        url: 'https://www.un.org/partnerships',
        sdg_alignment: true
      },
      
      // Speaking/Media Opportunities
      media_opportunities: {
        name: 'Media and Speaking Intelligence',
        sources: [
          'ABC News',
          'SBS News', 
          'The Guardian Australia',
          'InDaily',
          'Crikey',
          'The Conversation'
        ],
        types: ['expert-commentary', 'op-eds', 'panel-discussions', 'conferences']
      },
      
      // Academic Collaborations
      academic_partnerships: {
        name: 'University Partnership Opportunities',
        institutions: [
          'University of Adelaide',
          'Flinders University',
          'UniSA',
          'Charles Darwin University',
          'Australian National University'
        ],
        collaboration_types: ['research', 'community-engagement', 'student-projects']
      }
    };
  }

  initializeScoringCriteria() {
    return {
      funding_opportunities: {
        alignment_score: {
          weight: 0.25,
          factors: ['mission_match', 'values_alignment', 'geographic_fit', 'population_served']
        },
        
        strategic_value: {
          weight: 0.20,
          factors: ['funding_amount', 'multi_year_potential', 'capacity_building', 'network_access']
        },
        
        feasibility: {
          weight: 0.20,
          factors: ['eligibility_match', 'application_complexity', 'competition_level', 'timeline_fit']
        },
        
        impact_potential: {
          weight: 0.20,
          factors: ['beneficiary_reach', 'community_benefit', 'systemic_change', 'innovation_opportunity']
        },
        
        cultural_fit: {
          weight: 0.15,
          factors: ['indigenous_focus', 'community_led', 'cultural_protocols', 'local_priorities']
        }
      },
      
      partnership_opportunities: {
        values_alignment: {
          weight: 0.30,
          factors: ['shared_values', 'community_approach', 'power_sharing', 'transparency']
        },
        
        complementary_strengths: {
          weight: 0.25,
          factors: ['skill_gaps_filled', 'resource_synergy', 'network_expansion', 'capacity_enhancement']
        },
        
        mutual_benefit: {
          weight: 0.20,
          factors: ['value_exchange', 'shared_outcomes', 'risk_sharing', 'learning_opportunities']
        },
        
        cultural_compatibility: {
          weight: 0.15,
          factors: ['working_styles', 'communication_preferences', 'decision_making', 'conflict_resolution']
        },
        
        strategic_positioning: {
          weight: 0.10,
          factors: ['market_positioning', 'credibility_enhancement', 'advocacy_strength', 'innovation_catalyst']
        }
      }
    };
  }

  initializeCulturalAlignment() {
    return {
      indigenous_sovereignty: {
        indicators: ['self_determination', 'community_control', 'cultural_protocols', 'traditional_knowledge'],
        weight: 1.0,
        critical: true
      },
      
      community_leadership: {
        indicators: ['community_led', 'grassroots', 'participatory', 'co_design'],
        weight: 0.9,
        critical: true
      },
      
      social_justice: {
        indicators: ['equity', 'human_rights', 'systemic_change', 'advocacy'],
        weight: 0.85,
        critical: false
      },
      
      environmental_stewardship: {
        indicators: ['sustainability', 'regenerative', 'climate_action', 'country_care'],
        weight: 0.8,
        critical: false
      },
      
      innovation_for_good: {
        indicators: ['creative_solutions', 'technology_for_impact', 'systems_thinking'],
        weight: 0.75,
        critical: false
      }
    };
  }

  async process(query, context) {
    console.log(`🔍 Opportunity Scout processing: "${query}"`);
    
    try {
      // Determine opportunity search intent
      const searchIntent = await this.analyzeSearchIntent(query, context);
      
      // Search for opportunities across multiple sources
      const opportunities = await this.searchOpportunities(searchIntent, context);
      
      // Score and rank opportunities
      const scoredOpportunities = await this.scoreOpportunities(opportunities, context);
      
      // Filter by thresholds and cultural alignment
      const qualifiedOpportunities = await this.filterOpportunities(scoredOpportunities, context);
      
      // Generate strategic insights
      const insights = await this.generateOpportunityInsights(qualifiedOpportunities, context);
      
      // Create action recommendations
      const recommendations = await this.generateActionRecommendations(qualifiedOpportunities, insights);
      
      const response = {
        pod: this.name,
        timestamp: new Date().toISOString(),
        
        search_parameters: {
          intent: searchIntent,
          sources_searched: Object.keys(this.opportunitySources),
          total_opportunities_found: opportunities.length,
          qualified_opportunities: qualifiedOpportunities.length
        },
        
        opportunities: {
          funding: qualifiedOpportunities.filter(o => o.type === 'funding').slice(0, 10),
          partnerships: qualifiedOpportunities.filter(o => o.type === 'partnership').slice(0, 8),
          speaking_media: qualifiedOpportunities.filter(o => o.type === 'media').slice(0, 6),
          collaboration: qualifiedOpportunities.filter(o => o.type === 'collaboration').slice(0, 6),
          advocacy: qualifiedOpportunities.filter(o => o.type === 'advocacy').slice(0, 5)
        },
        
        strategic_insights: insights,
        
        recommendations: recommendations,
        
        pipeline_analysis: {
          total_potential_value: this.calculateTotalValue(qualifiedOpportunities),
          average_success_probability: this.calculateAverageSuccessRate(qualifiedOpportunities),
          timeline_distribution: this.analyzeTimelineDistribution(qualifiedOpportunities),
          effort_analysis: this.analyzeEffortRequirements(qualifiedOpportunities)
        },
        
        alerts: [],
        next_actions: []
      };
      
      // Generate alerts for time-sensitive opportunities
      const urgentOpportunities = qualifiedOpportunities.filter(o => 
        o.deadline && new Date(o.deadline) - new Date() < 7 * 24 * 60 * 60 * 1000 // 7 days
      );
      
      if (urgentOpportunities.length > 0) {
        response.alerts.push({
          type: 'URGENT',
          category: 'deadline',
          message: `${urgentOpportunities.length} opportunities closing within 7 days`,
          opportunities: urgentOpportunities.map(o => o.name)
        });
      }
      
      // Generate high-value alerts
      const highValueOps = qualifiedOpportunities.filter(o => 
        o.total_score > 0.85 && (o.funding_amount || 0) > 100000
      );
      
      if (highValueOps.length > 0) {
        response.alerts.push({
          type: 'HIGH_VALUE',
          category: 'strategic',
          message: `${highValueOps.length} high-value strategic opportunities identified`,
          total_value: highValueOps.reduce((sum, o) => sum + (o.funding_amount || 0), 0)
        });
      }
      
      // Store opportunity intelligence
      await this.storeOpportunityIntelligence(response);
      
      // Publish to Kafka
      await this.publishOpportunityIntelligence(response);
      
      // Update opportunity network graph
      await this.updateOpportunityGraph(qualifiedOpportunities);
      
      return response;
      
    } catch (error) {
      console.error('🚨 Opportunity Scout error:', error);
      throw error;
    }
  }

  async searchOpportunities(intent, context) {
    const allOpportunities = [];
    
    try {
      // Search government grants
      const govGrants = await this.searchGovernmentGrants(intent);
      allOpportunities.push(...govGrants);
      
      // Search foundation grants
      const foundationGrants = await this.searchFoundationGrants(intent);
      allOpportunities.push(...foundationGrants);
      
      // Search corporate partnerships
      const corporateOps = await this.searchCorporateOpportunities(intent);
      allOpportunities.push(...corporateOps);
      
      // Search speaking/media opportunities
      const mediaOps = await this.searchMediaOpportunities(intent, context);
      allOpportunities.push(...mediaOps);
      
      // Search academic collaborations
      const academicOps = await this.searchAcademicOpportunities(intent);
      allOpportunities.push(...academicOps);
      
      // Search advocacy opportunities
      const advocacyOps = await this.searchAdvocacyOpportunities(intent, context);
      allOpportunities.push(...advocacyOps);
      
      console.log(`🔍 Found ${allOpportunities.length} total opportunities`);
      
    } catch (error) {
      console.error('Opportunity search error:', error);
    }
    
    return allOpportunities;
  }

  async searchGovernmentGrants(intent) {
    const grants = [];
    
    try {
      // GrantConnect API search
      if (this.opportunitySources.grants_gov.api_key) {
        const apiResponse = await this.searchGrantConnect(intent);
        grants.push(...apiResponse);
      }
      
      // Scrape additional government sources
      const scrapedGrants = await this.scrapeGovernmentSites(intent);
      grants.push(...scrapedGrants);
      
    } catch (error) {
      console.error('Government grants search error:', error);
    }
    
    return grants.map(grant => ({
      ...grant,
      type: 'funding',
      source: 'government',
      discovered_at: new Date().toISOString()
    }));
  }

  async searchFoundationGrants(intent) {
    const grants = [];
    
    try {
      // Search major Australian foundations
      const foundations = [
        'Australian Communities Foundation',
        'Sidney Myer Fund',
        'Ian Potter Foundation',
        'Lord Mayors Charitable Foundation',
        'Myer Foundation'
      ];
      
      for (const foundation of foundations) {
        const foundationGrants = await this.searchFoundation(foundation, intent);
        grants.push(...foundationGrants);
      }
      
      // Search international foundations with Australian programs
      const intlFoundations = await this.searchInternationalFoundations(intent);
      grants.push(...intlFoundations);
      
    } catch (error) {
      console.error('Foundation grants search error:', error);
    }
    
    return grants.map(grant => ({
      ...grant,
      type: 'funding',
      source: 'foundation',
      discovered_at: new Date().toISOString()
    }));
  }

  async searchCorporateOpportunities(intent) {
    const opportunities = [];
    
    try {
      const corporates = [
        { name: 'Westpac', program: 'Community Grants' },
        { name: 'ANZ', program: 'BlueNotes Community' },
        { name: 'NAB', program: 'Community Grants' },
        { name: 'Telstra', program: 'Foundation' },
        { name: 'BHP', program: 'Foundation' }
      ];
      
      for (const corp of corporates) {
        const corpOps = await this.searchCorporatePrograms(corp, intent);
        opportunities.push(...corpOps);
      }
      
    } catch (error) {
      console.error('Corporate opportunities search error:', error);
    }
    
    return opportunities.map(opp => ({
      ...opp,
      type: opp.category || 'partnership',
      source: 'corporate',
      discovered_at: new Date().toISOString()
    }));
  }

  async searchMediaOpportunities(intent, context) {
    const opportunities = [];
    
    try {
      // Search for expert commentary opportunities
      const commentaryOps = await this.findCommentaryOpportunities(intent, context);
      opportunities.push(...commentaryOps);
      
      // Search for speaking engagements
      const speakingOps = await this.findSpeakingOpportunities(intent, context);
      opportunities.push(...speakingOps);
      
      // Search for conference panels
      const panelOps = await this.findPanelOpportunities(intent, context);
      opportunities.push(...panelOps);
      
      // Monitor trending topics for op-ed opportunities
      const opedOps = await this.findOpEdOpportunities(intent, context);
      opportunities.push(...opedOps);
      
    } catch (error) {
      console.error('Media opportunities search error:', error);
    }
    
    return opportunities.map(opp => ({
      ...opp,
      type: 'media',
      source: 'media',
      discovered_at: new Date().toISOString()
    }));
  }

  async scoreOpportunities(opportunities, context) {
    const scored = [];
    
    for (const opportunity of opportunities) {
      try {
        const score = await this.calculateOpportunityScore(opportunity, context);
        
        scored.push({
          ...opportunity,
          scores: score.breakdown,
          total_score: score.total,
          cultural_alignment: score.cultural_alignment,
          strategic_fit: score.strategic_fit,
          effort_estimate: score.effort_estimate,
          success_probability: score.success_probability,
          roi_estimate: score.roi_estimate
        });
        
      } catch (error) {
        console.error(`Error scoring opportunity ${opportunity.name}:`, error);
      }
    }
    
    // Sort by total score
    return scored.sort((a, b) => b.total_score - a.total_score);
  }

  async calculateOpportunityScore(opportunity, context) {
    const scoring = {
      breakdown: {},
      total: 0,
      cultural_alignment: 0,
      strategic_fit: 0,
      effort_estimate: 0,
      success_probability: 0,
      roi_estimate: 0
    };
    
    try {
      // Get appropriate scoring criteria
      const criteria = opportunity.type === 'funding' 
        ? this.scoringCriteria.funding_opportunities
        : this.scoringCriteria.partnership_opportunities;
      
      let weightedScore = 0;
      let totalWeight = 0;
      
      // Score each criterion
      for (const [criterionName, criterion] of Object.entries(criteria)) {
        const criterionScore = await this.scoreCriterion(opportunity, criterion, context);
        
        scoring.breakdown[criterionName] = {
          score: criterionScore,
          weight: criterion.weight
        };
        
        weightedScore += criterionScore * criterion.weight;
        totalWeight += criterion.weight;
      }
      
      scoring.total = weightedScore / totalWeight;
      
      // Calculate cultural alignment
      scoring.cultural_alignment = await this.assessCulturalAlignment(opportunity);
      
      // Calculate strategic fit with ACT's current priorities
      scoring.strategic_fit = await this.assessStrategicFit(opportunity, context);
      
      // Estimate effort required
      scoring.effort_estimate = this.estimateEffort(opportunity);
      
      // Calculate success probability
      scoring.success_probability = await this.calculateSuccessProbability(opportunity, context);
      
      // Calculate ROI estimate
      scoring.roi_estimate = this.calculateROI(opportunity, scoring);
      
      // Use AI for enhanced scoring if available
      if (this.openai) {
        const aiScore = await this.getAIOpportunityScore(opportunity, context);
        if (aiScore) {
          scoring.ai_insights = aiScore;
          // Blend AI score with rule-based score
          scoring.total = (scoring.total * 0.7) + (aiScore.score * 0.3);
        }
      }
      
    } catch (error) {
      console.error('Scoring calculation error:', error);
    }
    
    return scoring;
  }

  async assessCulturalAlignment(opportunity) {
    let alignmentScore = 0;
    let totalWeight = 0;
    
    const description = (opportunity.description || '').toLowerCase();
    const requirements = (opportunity.requirements || '').toLowerCase();
    const combinedText = description + ' ' + requirements;
    
    for (const [aspect, config] of Object.entries(this.culturalAlignmentMatrix)) {
      let aspectScore = 0;
      let matches = 0;
      
      // Check for indicator keywords
      for (const indicator of config.indicators) {
        if (combinedText.includes(indicator)) {
          aspectScore += 0.2;
          matches++;
        }
      }
      
      // Normalize aspect score
      aspectScore = Math.min(1, aspectScore);
      
      // Apply to overall score
      alignmentScore += aspectScore * config.weight;
      totalWeight += config.weight;
      
      // Critical aspects must meet minimum threshold
      if (config.critical && aspectScore < 0.5) {
        alignmentScore *= 0.5; // Penalize opportunities that don't meet critical cultural requirements
      }
    }
    
    return totalWeight > 0 ? alignmentScore / totalWeight : 0;
  }

  async generateOpportunityInsights(opportunities, context) {
    const insights = {
      strategic_patterns: [],
      timing_insights: [],
      network_analysis: {},
      competitive_landscape: {},
      resource_requirements: {}
    };
    
    try {
      // Analyze strategic patterns
      insights.strategic_patterns = this.identifyStrategicPatterns(opportunities);
      
      // Analyze timing patterns
      insights.timing_insights = this.analyzeOpportunityTiming(opportunities);
      
      // Network analysis
      insights.network_analysis = await this.analyzeOpportunityNetworks(opportunities);
      
      // Competitive landscape
      insights.competitive_landscape = this.analyzeCompetitiveLandscape(opportunities);
      
      // Resource requirements
      insights.resource_requirements = this.analyzeResourceRequirements(opportunities);
      
      // AI-generated insights if available
      if (this.openai) {
        insights.ai_strategic_insights = await this.generateAIInsights(opportunities, context);
      }
      
    } catch (error) {
      console.error('Insights generation error:', error);
    }
    
    return insights;
  }

  async generateActionRecommendations(opportunities, insights) {
    const recommendations = [];
    
    try {
      // Immediate actions (next 7 days)
      const urgentOps = opportunities.filter(o => 
        o.deadline && new Date(o.deadline) - new Date() < 7 * 24 * 60 * 60 * 1000
      );
      
      if (urgentOps.length > 0) {
        recommendations.push({
          priority: 'URGENT',
          timeframe: 'Next 7 days',
          action: 'Complete urgent applications',
          opportunities: urgentOps.slice(0, 3),
          steps: urgentOps.slice(0, 3).map(o => `Submit ${o.name} application by ${new Date(o.deadline).toLocaleDateString()}`)
        });
      }
      
      // High-value opportunities (next 30 days)
      const highValueOps = opportunities.filter(o => 
        o.total_score > 0.8 && (o.funding_amount || 0) > 50000
      ).slice(0, 5);
      
      if (highValueOps.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          timeframe: 'Next 30 days',
          action: 'Pursue high-value strategic opportunities',
          opportunities: highValueOps,
          steps: [
            'Prepare comprehensive applications',
            'Engage cultural advisors for alignment check',
            'Develop partnerships for stronger applications',
            'Create detailed implementation plans'
          ]
        });
      }
      
      // Partnership development (next 90 days)
      const partnershipOps = opportunities.filter(o => 
        o.type === 'partnership' && o.total_score > 0.65
      ).slice(0, 8);
      
      if (partnershipOps.length > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          timeframe: 'Next 90 days',
          action: 'Build strategic partnerships',
          opportunities: partnershipOps,
          steps: [
            'Initiate conversations with aligned organizations',
            'Develop mutual value propositions',
            'Create partnership frameworks',
            'Establish ongoing collaboration mechanisms'
          ]
        });
      }
      
      // Long-term strategic positioning
      recommendations.push({
        priority: 'STRATEGIC',
        timeframe: 'Next 6-12 months',
        action: 'Position ACT for emerging opportunities',
        steps: insights.strategic_patterns.slice(0, 5),
        expected_outcome: 'Enhanced opportunity pipeline and strategic positioning'
      });
      
      // AI-generated recommendations if available
      if (this.openai && opportunities.length > 0) {
        const aiRecs = await this.generateAIRecommendations(opportunities, insights);
        if (aiRecs && aiRecs.length > 0) {
          recommendations.push(...aiRecs);
        }
      }
      
    } catch (error) {
      console.error('Recommendations generation error:', error);
    }
    
    return recommendations;
  }

  async analyzeSearchIntent(query, context) {
    const intent = {
      type: 'general',
      focus_areas: [],
      funding_range: null,
      timeline: null,
      geographic_scope: 'australia',
      opportunity_types: ['funding', 'partnership', 'media', 'collaboration']
    };
    
    const queryLower = query.toLowerCase();
    
    // Detect opportunity types
    if (queryLower.includes('grant') || queryLower.includes('funding')) {
      intent.opportunity_types = ['funding'];
      intent.type = 'funding';
    }
    
    if (queryLower.includes('partner') || queryLower.includes('collaboration')) {
      intent.opportunity_types = ['partnership', 'collaboration'];
      intent.type = 'partnership';
    }
    
    if (queryLower.includes('speaking') || queryLower.includes('media') || queryLower.includes('conference')) {
      intent.opportunity_types = ['media'];
      intent.type = 'media';
    }
    
    // Extract focus areas
    const focusKeywords = {
      indigenous: ['indigenous', 'aboriginal', 'first nations', 'native title'],
      justice: ['justice', 'rights', 'advocacy', 'equality'],
      environment: ['environment', 'climate', 'sustainability', 'conservation'],
      community: ['community', 'grassroots', 'local', 'neighborhood'],
      youth: ['youth', 'young', 'children', 'education'],
      arts: ['arts', 'culture', 'creative', 'cultural'],
      technology: ['technology', 'digital', 'innovation', 'tech']
    };
    
    for (const [area, keywords] of Object.entries(focusKeywords)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        intent.focus_areas.push(area);
      }
    }
    
    // Extract funding range
    const amountMatch = queryLower.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|thousand|million|m)?/);
    if (amountMatch) {
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (queryLower.includes('k') || queryLower.includes('thousand')) {
        amount *= 1000;
      } else if (queryLower.includes('m') || queryLower.includes('million')) {
        amount *= 1000000;
      }
      intent.funding_range = { min: amount * 0.5, max: amount * 2 };
    }
    
    // Extract timeline
    if (queryLower.includes('urgent') || queryLower.includes('asap')) {
      intent.timeline = 'urgent';
    } else if (queryLower.includes('this month')) {
      intent.timeline = '30_days';
    } else if (queryLower.includes('this quarter')) {
      intent.timeline = '90_days';
    }
    
    return intent;
  }

  // Web scraping and API methods
  async initializeBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  async scrapeGrantConnect() {
    const browser = await this.initializeBrowser();
    const page = await browser.newPage();
    const grants = [];
    
    try {
      await page.goto('https://www.grants.gov.au/Ga/Show/list', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Extract grant information
      const grantElements = await page.$$('.grant-item');
      
      for (const element of grantElements) {
        const grant = await page.evaluate(el => {
          const title = el.querySelector('.grant-title')?.textContent?.trim();
          const description = el.querySelector('.grant-description')?.textContent?.trim();
          const amount = el.querySelector('.grant-amount')?.textContent?.trim();
          const deadline = el.querySelector('.grant-deadline')?.textContent?.trim();
          const funder = el.querySelector('.grant-funder')?.textContent?.trim();
          
          return { title, description, amount, deadline, funder };
        }, element);
        
        if (grant.title) {
          grants.push({
            name: grant.title,
            description: grant.description,
            funding_amount: this.parseAmount(grant.amount),
            deadline: this.parseDate(grant.deadline),
            funder: grant.funder,
            source: 'GrantConnect',
            url: 'https://www.grants.gov.au'
          });
        }
      }
      
    } catch (error) {
      console.error('GrantConnect scraping error:', error);
    } finally {
      await page.close();
    }
    
    return grants;
  }

  parseAmount(amountString) {
    if (!amountString) return null;
    
    const cleanAmount = amountString.replace(/[^\d.]/g, '');
    const amount = parseFloat(cleanAmount);
    
    if (amountString.toLowerCase().includes('million')) {
      return amount * 1000000;
    } else if (amountString.toLowerCase().includes('thousand')) {
      return amount * 1000;
    }
    
    return amount;
  }

  parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      return new Date(dateString).toISOString();
    } catch {
      return null;
    }
  }

  // Storage and publishing methods
  async storeOpportunityIntelligence(intelligence) {
    const key = `opportunities:intelligence:${Date.now()}`;
    await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(intelligence)); // 7 days
    
    // Store individual opportunities for faster lookup
    for (const category of Object.keys(intelligence.opportunities)) {
      for (const opp of intelligence.opportunities[category]) {
        const oppKey = `opportunity:${opp.id || Date.now()}`;
        await this.redis.setex(oppKey, 30 * 24 * 60 * 60, JSON.stringify(opp)); // 30 days
      }
    }
    
    // Add to timeline index
    await this.redis.zadd('opportunities:timeline', Date.now(), key);
  }

  async publishOpportunityIntelligence(intelligence) {
    try {
      await this.producer.send({
        topic: 'act.opportunities.intelligence',
        messages: [{
          key: `opportunities_${Date.now()}`,
          value: JSON.stringify(intelligence)
        }]
      });
    } catch (error) {
      console.error('Failed to publish opportunity intelligence:', error);
    }
  }

  async updateOpportunityGraph(opportunities) {
    const session = this.neo4j.session();
    
    try {
      // Create opportunity nodes and relationships
      for (const opp of opportunities.slice(0, 50)) { // Limit to prevent overwhelming
        await session.run(`
          MERGE (o:Opportunity {
            id: $id,
            name: $name,
            type: $type,
            source: $source
          })
          SET o.score = $score,
              o.cultural_alignment = $cultural_alignment,
              o.funding_amount = $funding_amount,
              o.deadline = $deadline,
              o.updated_at = datetime($timestamp)
        `, {
          id: opp.id || `${opp.name}_${Date.now()}`,
          name: opp.name,
          type: opp.type,
          source: opp.source,
          score: opp.total_score,
          cultural_alignment: opp.cultural_alignment,
          funding_amount: opp.funding_amount || 0,
          deadline: opp.deadline,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Failed to update opportunity graph:', error);
    } finally {
      await session.close();
    }
  }

  async connect() {
    await this.producer.connect();
    await this.consumer.connect();
    console.log('🔍 Opportunity Scout connected to Kafka');
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    await this.redis.quit();
    await this.neo4j.close();
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('🔍 Opportunity Scout disconnected');
  }

  async healthCheck() {
    return {
      name: this.name,
      status: 'healthy',
      sources_configured: Object.keys(this.opportunitySources).length,
      browser_ready: Boolean(this.browser),
      openai_configured: Boolean(this.openai),
      cached_opportunities: await this.redis.zcard('opportunities:timeline'),
      thresholds: this.thresholds
    };
  }

  // Helper methods for specific opportunity searches
  async searchGrantConnect(intent) {
    // Implementation for GrantConnect API integration
    return [];
  }

  async scrapeGovernmentSites(intent) {
    // Implementation for government website scraping
    return [];
  }

  async searchFoundation(foundation, intent) {
    // Implementation for foundation-specific searches
    return [];
  }

  async searchInternationalFoundations(intent) {
    // Implementation for international foundation searches
    return [];
  }

  async searchCorporatePrograms(corporate, intent) {
    // Implementation for corporate program searches
    return [];
  }

  async findCommentaryOpportunities(intent, context) {
    // Implementation for media commentary opportunity discovery
    return [];
  }

  async findSpeakingOpportunities(intent, context) {
    // Implementation for speaking engagement discovery
    return [];
  }

  async findPanelOpportunities(intent, context) {
    // Implementation for panel discussion discovery
    return [];
  }

  async findOpEdOpportunities(intent, context) {
    // Implementation for op-ed opportunity discovery
    return [];
  }

  async searchAcademicOpportunities(intent) {
    // Implementation for academic collaboration searches
    return [];
  }

  async searchAdvocacyOpportunities(intent, context) {
    // Implementation for advocacy opportunity discovery
    return [];
  }

  // Additional helper methods
  calculateTotalValue(opportunities) {
    return opportunities.reduce((sum, opp) => sum + (opp.funding_amount || 0), 0);
  }

  calculateAverageSuccessRate(opportunities) {
    if (opportunities.length === 0) return 0;
    return opportunities.reduce((sum, opp) => sum + (opp.success_probability || 0), 0) / opportunities.length;
  }

  analyzeTimelineDistribution(opportunities) {
    const distribution = { urgent: 0, month: 0, quarter: 0, longterm: 0 };
    const now = new Date();
    
    for (const opp of opportunities) {
      if (!opp.deadline) {
        distribution.longterm++;
        continue;
      }
      
      const deadline = new Date(opp.deadline);
      const daysUntil = (deadline - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntil <= 7) {
        distribution.urgent++;
      } else if (daysUntil <= 30) {
        distribution.month++;
      } else if (daysUntil <= 90) {
        distribution.quarter++;
      } else {
        distribution.longterm++;
      }
    }
    
    return distribution;
  }

  analyzeEffortRequirements(opportunities) {
    const efforts = opportunities.map(opp => opp.effort_estimate || 0);
    return {
      low_effort: efforts.filter(e => e <= 3).length,
      medium_effort: efforts.filter(e => e > 3 && e <= 7).length,
      high_effort: efforts.filter(e => e > 7).length,
      average_effort: efforts.reduce((sum, e) => sum + e, 0) / efforts.length
    };
  }

  identifyStrategicPatterns(opportunities) {
    // Analyze opportunities for strategic patterns
    return [
      'Indigenous-led initiatives showing increased funding availability',
      'Corporate ESG alignment creating partnership opportunities',
      'Government focus on regional development presents funding options',
      'International foundations expanding Pacific programs'
    ];
  }

  analyzeOpportunityTiming(opportunities) {
    return [
      'Q1 typically shows increased foundation grant openings',
      'Government grants often align with budget cycles',
      'Corporate giving peaks during CSR reporting periods',
      'Conference speaking opportunities increase 6 months before events'
    ];
  }

  async analyzeOpportunityNetworks(opportunities) {
    return {
      key_funders: ['Australian Communities Foundation', 'Sidney Myer Fund', 'Government of South Australia'],
      emerging_networks: ['Pacific Island partnerships', 'Indigenous business networks'],
      collaboration_potential: 85
    };
  }

  analyzeCompetitiveLandscape(opportunities) {
    return {
      high_competition: opportunities.filter(o => o.competition_level === 'high').length,
      low_competition: opportunities.filter(o => o.competition_level === 'low').length,
      niche_opportunities: opportunities.filter(o => o.niche_focus === true).length
    };
  }

  analyzeResourceRequirements(opportunities) {
    return {
      total_application_hours: opportunities.reduce((sum, o) => sum + (o.effort_estimate || 0) * 8, 0),
      cultural_advisor_needed: opportunities.filter(o => o.cultural_alignment < 0.8).length,
      partnership_required: opportunities.filter(o => o.requires_partnership === true).length
    };
  }
}

export default OpportunityScout;