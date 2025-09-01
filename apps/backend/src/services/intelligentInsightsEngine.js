/**
 * Intelligent Insights Engine
 * AI-powered pattern detection, predictive analytics, and automated insights
 * Transforms raw data into actionable intelligence
 */

import MultiProviderAI from './multiProviderAI.js';
import notionSyncEngine from './notionSyncEngine.js';
import { createClient } from '@supabase/supabase-js';
// import * as tf from '@tensorflow/tfjs-node'; // Temporarily disabled - heavy dependency
import natural from 'natural';
import { EventEmitter } from 'events';

class IntelligentInsightsEngine extends EventEmitter {
  constructor() {
    super();
    
    this.ai = new MultiProviderAI();
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // NLP tools
    this.tokenizer = new natural.WordTokenizer();
    this.sentiment = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
    this.tfidf = new natural.TfIdf();
    
    // Pattern detection models
    this.models = {
      engagement: null,
      impact: null,
      growth: null,
      collaboration: null
    };
    
    // Insight cache
    this.insightCache = new Map();
    this.predictionCache = new Map();
    
    // Thresholds for significance
    this.thresholds = {
      pattern_significance: 0.7,
      anomaly_detection: 2.5, // standard deviations
      trend_confidence: 0.8,
      impact_threshold: 0.6
    };
    
    console.log('🧠 Intelligent Insights Engine initialized');
    this.initializeModels();
  }

  /**
   * Initialize ML models for pattern detection
   */
  async initializeModels() {
    try {
      // Engagement prediction model
      this.models.engagement = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });
      
      // Impact scoring model
      this.models.impact = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [15], units: 128, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 64, activation: 'relu' }),
          tf.layers.dense({ units: 3, activation: 'softmax' }) // low, medium, high impact
        ]
      });
      
      console.log('✅ ML models initialized');
    } catch (error) {
      console.error('Failed to initialize ML models:', error);
    }
  }

  /**
   * Generate comprehensive insights from all data sources
   */
  async generateInsights(timeRange = '7d') {
    console.log('🔍 Generating intelligent insights...');
    
    const insights = {
      patterns: await this.detectPatterns(timeRange),
      predictions: await this.generatePredictions(),
      anomalies: await this.detectAnomalies(),
      recommendations: await this.generateRecommendations(),
      network_effects: await this.analyzeNetworkEffects(),
      story_impact: await this.measureStoryImpact(),
      growth_trajectories: await this.predictGrowthTrajectories(),
      collaboration_opportunities: await this.identifyCollaborationOpportunities(),
      content_suggestions: await this.generateContentSuggestions(),
      risk_alerts: await this.identifyRisks(),
      success_factors: await this.analyzeSuccessFactors(),
      generated_at: new Date().toISOString()
    };
    
    // Cache insights
    this.insightCache.set(timeRange, insights);
    
    // Emit insights event
    this.emit('insights-generated', insights);
    
    return insights;
  }

  /**
   * Detect patterns in organizational data
   */
  async detectPatterns(timeRange) {
    const patterns = [];
    
    try {
      // Fetch historical data
      const { data: projects } = await this.supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data: stories } = await this.supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data: people } = await this.supabase
        .from('people')
        .select('*');
      
      // Temporal patterns
      const temporalPatterns = this.detectTemporalPatterns(projects, stories);
      patterns.push(...temporalPatterns);
      
      // Collaboration patterns
      const collaborationPatterns = this.detectCollaborationPatterns(projects, people);
      patterns.push(...collaborationPatterns);
      
      // Impact patterns
      const impactPatterns = this.detectImpactPatterns(stories, projects);
      patterns.push(...impactPatterns);
      
      // Theme emergence patterns
      const themePatterns = await this.detectThemeEmergence(stories);
      patterns.push(...themePatterns);
      
      // Geographic patterns
      const geoPatterns = this.detectGeographicPatterns(projects, stories, people);
      patterns.push(...geoPatterns);
      
    } catch (error) {
      console.error('Pattern detection failed:', error);
    }
    
    return patterns.filter(p => p.significance > this.thresholds.pattern_significance);
  }

  /**
   * Detect temporal patterns in data
   */
  detectTemporalPatterns(projects, stories) {
    const patterns = [];
    
    // Story submission patterns
    const storyDates = stories.map(s => new Date(s.created_at));
    const storyFrequency = this.calculateFrequencyPattern(storyDates);
    
    if (storyFrequency.trend !== 'stable') {
      patterns.push({
        type: 'temporal',
        category: 'story_submission',
        pattern: `Story submissions are ${storyFrequency.trend}`,
        trend: storyFrequency.trend,
        change_rate: storyFrequency.changeRate,
        significance: Math.abs(storyFrequency.changeRate),
        insight: `${storyFrequency.trend === 'increasing' ? 'Growing' : 'Declining'} community engagement`,
        recommendation: storyFrequency.trend === 'decreasing' 
          ? 'Consider engagement campaigns to boost story submissions'
          : 'Capitalize on momentum with story showcases'
      });
    }
    
    // Project completion patterns
    const completedProjects = projects.filter(p => p.status === 'completed');
    const completionRate = completedProjects.length / projects.length;
    
    patterns.push({
      type: 'temporal',
      category: 'project_completion',
      pattern: `Project completion rate: ${(completionRate * 100).toFixed(1)}%`,
      metric: completionRate,
      significance: 0.8,
      insight: completionRate > 0.7 ? 'High project success rate' : 'Opportunity to improve project completion',
      recommendation: completionRate < 0.5 
        ? 'Review project scoping and resource allocation'
        : 'Document success factors for replication'
    });
    
    // Seasonal patterns
    const monthlyActivity = this.detectSeasonalPatterns(projects, stories);
    if (monthlyActivity.pattern) {
      patterns.push(monthlyActivity);
    }
    
    return patterns;
  }

  /**
   * Detect collaboration patterns
   */
  detectCollaborationPatterns(projects, people) {
    const patterns = [];
    
    // Team size patterns
    const teamSizes = projects.map(p => p.team?.length || 0);
    const avgTeamSize = teamSizes.reduce((a, b) => a + b, 0) / teamSizes.length;
    
    patterns.push({
      type: 'collaboration',
      category: 'team_dynamics',
      pattern: `Average team size: ${avgTeamSize.toFixed(1)} members`,
      metric: avgTeamSize,
      significance: 0.7,
      insight: avgTeamSize > 5 ? 'Large collaborative teams' : 'Small focused teams',
      recommendation: avgTeamSize < 3 
        ? 'Consider increasing collaboration for complex projects'
        : 'Maintain effective team sizes'
    });
    
    // Cross-project collaboration
    const collaborators = new Map();
    projects.forEach(project => {
      (project.team || []).forEach(person => {
        if (!collaborators.has(person)) {
          collaborators.set(person, []);
        }
        collaborators.set(person, [...collaborators.get(person), project.id]);
      });
    });
    
    const multiProjectCollaborators = Array.from(collaborators.entries())
      .filter(([_, projects]) => projects.length > 1);
    
    if (multiProjectCollaborators.length > 0) {
      patterns.push({
        type: 'collaboration',
        category: 'cross_pollination',
        pattern: `${multiProjectCollaborators.length} people working across multiple projects`,
        metric: multiProjectCollaborators.length,
        significance: 0.85,
        insight: 'Strong knowledge transfer between projects',
        recommendation: 'Leverage these connectors for best practice sharing',
        key_connectors: multiProjectCollaborators.slice(0, 5).map(([person]) => person)
      });
    }
    
    return patterns;
  }

  /**
   * Detect impact patterns
   */
  detectImpactPatterns(stories, projects) {
    const patterns = [];
    
    // Story impact correlation
    const highImpactStories = stories.filter(s => 
      (s.impact_metrics?.views > 500) || 
      (s.impact_metrics?.shares > 50)
    );
    
    if (highImpactStories.length > 0) {
      // Analyze common themes
      const themes = {};
      highImpactStories.forEach(story => {
        (story.themes || []).forEach(theme => {
          themes[theme] = (themes[theme] || 0) + 1;
        });
      });
      
      const topThemes = Object.entries(themes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      patterns.push({
        type: 'impact',
        category: 'story_resonance',
        pattern: `High-impact stories share common themes`,
        themes: topThemes.map(([theme]) => theme),
        metric: highImpactStories.length,
        significance: 0.9,
        insight: `Stories about ${topThemes[0][0]} resonate most with audience`,
        recommendation: `Focus on ${topThemes.map(([t]) => t).join(', ')} themes for maximum impact`
      });
    }
    
    // Project impact distribution
    const projectImpacts = projects.map(p => ({
      id: p.id,
      name: p.title,
      people_impacted: p.metrics?.people_impacted || 0
    })).sort((a, b) => b.people_impacted - a.people_impacted);
    
    const totalImpact = projectImpacts.reduce((sum, p) => sum + p.people_impacted, 0);
    const top20PercentProjects = projectImpacts.slice(0, Math.ceil(projects.length * 0.2));
    const top20Impact = top20PercentProjects.reduce((sum, p) => sum + p.people_impacted, 0);
    
    if (totalImpact > 0) {
      const concentrationRatio = top20Impact / totalImpact;
      
      patterns.push({
        type: 'impact',
        category: 'pareto_distribution',
        pattern: `Top 20% of projects deliver ${(concentrationRatio * 100).toFixed(0)}% of impact`,
        metric: concentrationRatio,
        significance: concentrationRatio > 0.6 ? 0.95 : 0.7,
        insight: concentrationRatio > 0.8 
          ? 'High impact concentration in few projects' 
          : 'Impact well distributed across projects',
        recommendation: concentrationRatio > 0.8
          ? 'Study and replicate success factors from top projects'
          : 'Continue balanced portfolio approach',
        top_projects: top20PercentProjects.slice(0, 3)
      });
    }
    
    return patterns;
  }

  /**
   * Detect theme emergence using NLP
   */
  async detectThemeEmergence(stories) {
    const patterns = [];
    
    // Build TF-IDF model from story content
    stories.forEach(story => {
      if (story.content) {
        this.tfidf.addDocument(story.content);
      }
    });
    
    // Find emerging themes
    const recentStories = stories.filter(s => {
      const storyDate = new Date(s.created_at);
      const daysSince = (Date.now() - storyDate) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });
    
    const emergingTerms = new Map();
    recentStories.forEach((story, idx) => {
      this.tfidf.listTerms(idx).slice(0, 10).forEach(term => {
        emergingTerms.set(term.term, (emergingTerms.get(term.term) || 0) + term.tfidf);
      });
    });
    
    const topEmergingThemes = Array.from(emergingTerms.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([term]) => term);
    
    if (topEmergingThemes.length > 0) {
      // Get AI interpretation of themes
      const themeAnalysis = await this.ai.generateResponse(
        `Analyze these emerging themes from community stories: ${topEmergingThemes.join(', ')}. 
         What do they indicate about community needs and interests?`,
        {
          systemPrompt: 'You are a community insights analyst',
          maxTokens: 500,
          temperature: 0.3
        }
      );
      
      patterns.push({
        type: 'thematic',
        category: 'emerging_themes',
        pattern: 'New themes emerging in community narratives',
        themes: topEmergingThemes,
        significance: 0.85,
        insight: themeAnalysis.response,
        recommendation: 'Align upcoming projects with these emerging themes'
      });
    }
    
    return patterns;
  }

  /**
   * Generate predictions using ML models
   */
  async generatePredictions() {
    const predictions = [];
    
    try {
      // Engagement predictions
      const engagementPrediction = await this.predictEngagement();
      predictions.push(engagementPrediction);
      
      // Growth predictions
      const growthPrediction = await this.predictGrowth();
      predictions.push(growthPrediction);
      
      // Project success predictions
      const successPredictions = await this.predictProjectSuccess();
      predictions.push(...successPredictions);
      
      // Story impact predictions
      const impactPredictions = await this.predictStoryImpact();
      predictions.push(...impactPredictions);
      
    } catch (error) {
      console.error('Prediction generation failed:', error);
    }
    
    return predictions;
  }

  /**
   * Predict future engagement levels
   */
  async predictEngagement() {
    // Fetch recent engagement data
    const { data: recentActivity } = await this.supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    // Calculate engagement trend
    const engagementByDay = {};
    recentActivity.forEach(activity => {
      const day = new Date(activity.created_at).toISOString().split('T')[0];
      engagementByDay[day] = (engagementByDay[day] || 0) + 1;
    });
    
    const trend = this.calculateTrend(Object.values(engagementByDay));
    
    return {
      type: 'engagement',
      prediction: `Engagement expected to ${trend.direction} by ${Math.abs(trend.percentage)}% next week`,
      confidence: trend.confidence,
      factors: [
        'Recent story submission rate',
        'Project participation levels',
        'Community interaction frequency'
      ],
      recommendation: trend.direction === 'decrease' 
        ? 'Launch engagement campaign to maintain momentum'
        : 'Prepare infrastructure for increased activity'
    };
  }

  /**
   * Predict community growth
   */
  async predictGrowth() {
    const { data: people } = await this.supabase
      .from('people')
      .select('created_at')
      .order('created_at', { ascending: true });
    
    // Calculate growth rate
    const monthlyGrowth = {};
    people.forEach(person => {
      const month = new Date(person.created_at).toISOString().substring(0, 7);
      monthlyGrowth[month] = (monthlyGrowth[month] || 0) + 1;
    });
    
    const growthRates = Object.values(monthlyGrowth);
    const avgGrowthRate = growthRates.slice(-3).reduce((a, b) => a + b, 0) / 3;
    
    // Project future growth
    const nextMonthPrediction = Math.round(avgGrowthRate * 1.1);
    const nextQuarterPrediction = Math.round(avgGrowthRate * 3.5);
    
    return {
      type: 'growth',
      prediction: `Expected ${nextMonthPrediction} new community members next month`,
      quarterly_projection: nextQuarterPrediction,
      confidence: 0.75,
      current_size: people.length,
      growth_rate: `${((avgGrowthRate / people.length) * 100).toFixed(1)}% monthly`,
      factors: [
        'Historical growth patterns',
        'Seasonal variations',
        'Project pipeline'
      ]
    };
  }

  /**
   * Detect anomalies in data
   */
  async detectAnomalies() {
    const anomalies = [];
    
    try {
      // Unusual activity spikes
      const activityAnomalies = await this.detectActivityAnomalies();
      anomalies.push(...activityAnomalies);
      
      // Engagement anomalies
      const engagementAnomalies = await this.detectEngagementAnomalies();
      anomalies.push(...engagementAnomalies);
      
      // Project timeline anomalies
      const timelineAnomalies = await this.detectTimelineAnomalies();
      anomalies.push(...timelineAnomalies);
      
    } catch (error) {
      console.error('Anomaly detection failed:', error);
    }
    
    return anomalies.filter(a => a.severity > 0.5);
  }

  /**
   * Generate AI-powered recommendations
   */
  async generateRecommendations() {
    const recommendations = [];
    
    try {
      // Get current state analysis
      const { data: projects } = await this.supabase
        .from('projects')
        .select('*')
        .eq('status', 'active');
      
      const { data: opportunities } = await this.supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'open');
      
      // Generate strategic recommendations
      const strategicPrompt = `
        Based on this organizational state:
        - ${projects.length} active projects
        - ${opportunities.length} open opportunities
        - Focus areas: ${[...new Set(projects.map(p => p.impact_area).flat())].join(', ')}
        
        Provide 3 specific, actionable recommendations for maximizing impact and growth.
      `;
      
      const aiRecommendations = await this.ai.generateResponse(strategicPrompt, {
        systemPrompt: 'You are a strategic advisor for a social impact organization',
        temperature: 0.4
      });
      
      // Parse AI response into structured recommendations
      const parsed = this.parseAIRecommendations(aiRecommendations.response);
      recommendations.push(...parsed);
      
      // Data-driven recommendations
      if (opportunities.length > 5) {
        recommendations.push({
          type: 'operational',
          priority: 'high',
          title: 'Opportunity Pipeline Management',
          description: `You have ${opportunities.length} open opportunities. Consider prioritizing based on alignment scores.`,
          action: 'Review and prioritize top 3 opportunities this week',
          impact: 'Improved resource allocation and success rate'
        });
      }
      
    } catch (error) {
      console.error('Recommendation generation failed:', error);
    }
    
    return recommendations;
  }

  /**
   * Analyze network effects in community
   */
  async analyzeNetworkEffects() {
    const analysis = {
      network_density: 0,
      clustering_coefficient: 0,
      key_connectors: [],
      collaboration_clusters: [],
      growth_potential: 0
    };
    
    try {
      // Fetch relationship data
      const { data: people } = await this.supabase
        .from('people')
        .select('*, projects(*)');
      
      // Build network graph
      const network = this.buildNetworkGraph(people);
      
      // Calculate network metrics
      analysis.network_density = this.calculateNetworkDensity(network);
      analysis.clustering_coefficient = this.calculateClusteringCoefficient(network);
      analysis.key_connectors = this.identifyKeyConnectors(network);
      analysis.collaboration_clusters = this.identifyCollaborationClusters(network);
      
      // Calculate growth potential based on network structure
      analysis.growth_potential = this.calculateGrowthPotential(network);
      
      // Generate insights
      analysis.insights = await this.generateNetworkInsights(analysis);
      
    } catch (error) {
      console.error('Network analysis failed:', error);
    }
    
    return analysis;
  }

  /**
   * Measure story impact with advanced metrics
   */
  async measureStoryImpact() {
    const impactAnalysis = {
      total_reach: 0,
      engagement_rate: 0,
      sentiment_distribution: {},
      viral_stories: [],
      impact_trends: [],
      theme_performance: {}
    };
    
    try {
      const { data: stories } = await this.supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Calculate reach and engagement
      stories.forEach(story => {
        const views = story.impact_metrics?.views || 0;
        const shares = story.impact_metrics?.shares || 0;
        
        impactAnalysis.total_reach += views;
        
        // Identify viral stories
        if (shares > 50 || views > 1000) {
          impactAnalysis.viral_stories.push({
            id: story.id,
            title: story.title,
            views,
            shares,
            virality_score: (shares / Math.max(views, 1)) * 100
          });
        }
        
        // Analyze sentiment
        if (story.content) {
          const sentimentScore = this.sentiment.getSentiment(
            this.tokenizer.tokenize(story.content)
          );
          const sentimentCategory = sentimentScore > 0.5 ? 'positive' 
            : sentimentScore < -0.5 ? 'negative' : 'neutral';
          
          impactAnalysis.sentiment_distribution[sentimentCategory] = 
            (impactAnalysis.sentiment_distribution[sentimentCategory] || 0) + 1;
        }
        
        // Theme performance
        (story.themes || []).forEach(theme => {
          if (!impactAnalysis.theme_performance[theme]) {
            impactAnalysis.theme_performance[theme] = {
              count: 0,
              total_views: 0,
              total_shares: 0,
              avg_engagement: 0
            };
          }
          
          const themeStats = impactAnalysis.theme_performance[theme];
          themeStats.count++;
          themeStats.total_views += views;
          themeStats.total_shares += shares;
          themeStats.avg_engagement = (themeStats.total_views + themeStats.total_shares * 10) / themeStats.count;
        });
      });
      
      // Calculate overall engagement rate
      impactAnalysis.engagement_rate = stories.length > 0 
        ? (impactAnalysis.viral_stories.length / stories.length) * 100 
        : 0;
      
      // Sort themes by performance
      impactAnalysis.top_performing_themes = Object.entries(impactAnalysis.theme_performance)
        .sort(([,a], [,b]) => b.avg_engagement - a.avg_engagement)
        .slice(0, 5)
        .map(([theme, stats]) => ({ theme, ...stats }));
      
    } catch (error) {
      console.error('Story impact measurement failed:', error);
    }
    
    return impactAnalysis;
  }

  /**
   * Predict growth trajectories
   */
  async predictGrowthTrajectories() {
    const trajectories = {
      community: [],
      projects: [],
      impact: [],
      timeline: []
    };
    
    try {
      // Historical data for trend analysis
      const { data: historicalSnapshots } = await this.supabase
        .from('daily_snapshots')
        .select('*')
        .order('date', { ascending: true })
        .limit(90); // Last 90 days
      
      if (historicalSnapshots.length > 0) {
        // Extract growth trends
        const communityGrowth = historicalSnapshots.map(s => s.data?.databases?.people?.count || 0);
        const projectGrowth = historicalSnapshots.map(s => s.data?.databases?.projects?.count || 0);
        
        // Use linear regression for simple projection
        const communityTrend = this.linearRegression(communityGrowth);
        const projectTrend = this.linearRegression(projectGrowth);
        
        // Generate 90-day projections
        for (let i = 1; i <= 90; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          
          trajectories.timeline.push(date.toISOString().split('T')[0]);
          trajectories.community.push(Math.round(communityTrend.predict(communityGrowth.length + i)));
          trajectories.projects.push(Math.round(projectTrend.predict(projectGrowth.length + i)));
          trajectories.impact.push(Math.round(
            (communityTrend.predict(communityGrowth.length + i) * 
             projectTrend.predict(projectGrowth.length + i)) / 100
          ));
        }
        
        trajectories.insights = {
          community_growth_rate: `${communityTrend.slope.toFixed(1)} people/day`,
          project_growth_rate: `${projectTrend.slope.toFixed(2)} projects/day`,
          projected_community_size_90d: trajectories.community[89],
          projected_projects_90d: trajectories.projects[89],
          confidence: communityTrend.r2
        };
      }
      
    } catch (error) {
      console.error('Growth trajectory prediction failed:', error);
    }
    
    return trajectories;
  }

  /**
   * Identify collaboration opportunities
   */
  async identifyCollaborationOpportunities() {
    const opportunities = [];
    
    try {
      const { data: people } = await this.supabase
        .from('people')
        .select('*, projects(*), skills, interests');
      
      const { data: projects } = await this.supabase
        .from('projects')
        .select('*');
      
      // Find skill gaps in projects
      projects.forEach(project => {
        const requiredSkills = project.required_skills || [];
        const teamSkills = new Set();
        
        (project.team || []).forEach(memberId => {
          const member = people.find(p => p.id === memberId);
          if (member?.skills) {
            member.skills.forEach(skill => teamSkills.add(skill));
          }
        });
        
        const missingSkills = requiredSkills.filter(skill => !teamSkills.has(skill));
        
        if (missingSkills.length > 0) {
          // Find people with missing skills
          const candidates = people.filter(person => 
            !project.team?.includes(person.id) &&
            person.skills?.some(skill => missingSkills.includes(skill))
          );
          
          if (candidates.length > 0) {
            opportunities.push({
              type: 'skill_match',
              project: project.title,
              project_id: project.id,
              missing_skills: missingSkills,
              candidates: candidates.slice(0, 3).map(c => ({
                id: c.id,
                name: c.full_name,
                matching_skills: c.skills.filter(s => missingSkills.includes(s))
              })),
              priority: 'high',
              action: `Connect project "${project.title}" with skilled contributors`
            });
          }
        }
      });
      
      // Find complementary interests
      const interestGroups = {};
      people.forEach(person => {
        (person.interests || []).forEach(interest => {
          if (!interestGroups[interest]) {
            interestGroups[interest] = [];
          }
          interestGroups[interest].push(person);
        });
      });
      
      // Identify potential collaboration clusters
      Object.entries(interestGroups).forEach(([interest, group]) => {
        if (group.length >= 3) {
          const notCollaborating = group.filter(person => {
            const personProjects = person.projects?.map(p => p.id) || [];
            return !group.some(other => 
              other.id !== person.id &&
              other.projects?.some(p => personProjects.includes(p.id))
            );
          });
          
          if (notCollaborating.length >= 2) {
            opportunities.push({
              type: 'interest_cluster',
              interest,
              potential_collaborators: notCollaborating.slice(0, 5).map(p => ({
                id: p.id,
                name: p.full_name
              })),
              priority: 'medium',
              action: `Create project or working group around "${interest}"`
            });
          }
        }
      });
      
    } catch (error) {
      console.error('Collaboration opportunity identification failed:', error);
    }
    
    return opportunities;
  }

  /**
   * Generate content suggestions based on patterns
   */
  async generateContentSuggestions() {
    const suggestions = [];
    
    try {
      // Analyze content gaps
      const { data: stories } = await this.supabase
        .from('stories')
        .select('themes, created_at');
      
      const { data: projects } = await this.supabase
        .from('projects')
        .select('impact_area, status');
      
      // Find underrepresented themes
      const projectThemes = new Set(projects.map(p => p.impact_area).flat());
      const storyThemes = new Set(stories.map(s => s.themes).flat());
      
      const missingThemes = Array.from(projectThemes).filter(theme => !storyThemes.has(theme));
      
      if (missingThemes.length > 0) {
        suggestions.push({
          type: 'content_gap',
          title: 'Story Collection Opportunity',
          description: `Projects in ${missingThemes.join(', ')} lack supporting stories`,
          action: 'Prioritize story collection from these project areas',
          priority: 'high',
          potential_impact: 'Improved project narrative and engagement'
        });
      }
      
      // Suggest content based on high-performing themes
      const themePerformance = await this.measureStoryImpact();
      const topThemes = themePerformance.top_performing_themes;
      
      if (topThemes.length > 0) {
        suggestions.push({
          type: 'content_optimization',
          title: 'Focus on High-Impact Themes',
          description: `Stories about "${topThemes[0].theme}" generate ${topThemes[0].avg_engagement.toFixed(0)}x engagement`,
          action: `Create more content around: ${topThemes.slice(0, 3).map(t => t.theme).join(', ')}`,
          priority: 'medium',
          expected_reach: topThemes[0].total_views
        });
      }
      
      // Timing suggestions
      const postingPattern = this.analyzePostingPatterns(stories);
      if (postingPattern.recommendation) {
        suggestions.push(postingPattern.recommendation);
      }
      
    } catch (error) {
      console.error('Content suggestion generation failed:', error);
    }
    
    return suggestions;
  }

  /**
   * Helper: Calculate trend from time series data
   */
  calculateTrend(values) {
    if (values.length < 2) {
      return { direction: 'stable', percentage: 0, confidence: 0 };
    }
    
    const recent = values.slice(-Math.min(7, values.length));
    const previous = values.slice(-Math.min(14, values.length), -7);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / Math.max(previous.length, 1);
    
    const change = ((recentAvg - previousAvg) / Math.max(previousAvg, 1)) * 100;
    
    return {
      direction: change > 10 ? 'increase' : change < -10 ? 'decrease' : 'stable',
      percentage: Math.abs(change).toFixed(1),
      confidence: Math.min(0.95, 0.5 + (recent.length / 14) * 0.45)
    };
  }

  /**
   * Helper: Linear regression for predictions
   */
  linearRegression(values) {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * i + intercept), 2), 0);
    const r2 = 1 - (ssResidual / ssTotal);
    
    return {
      slope,
      intercept,
      r2,
      predict: (x) => slope * x + intercept
    };
  }

  /**
   * Helper: Calculate frequency pattern
   */
  calculateFrequencyPattern(dates) {
    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push(dates[i] - dates[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const recentInterval = intervals.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, intervals.length);
    
    const changeRate = (recentInterval - avgInterval) / avgInterval;
    
    return {
      trend: changeRate < -0.2 ? 'increasing' : changeRate > 0.2 ? 'decreasing' : 'stable',
      changeRate: Math.abs(changeRate),
      avgDaysBetween: avgInterval / (1000 * 60 * 60 * 24)
    };
  }

  /**
   * Helper: Parse AI recommendations
   */
  parseAIRecommendations(aiResponse) {
    const recommendations = [];
    
    // Simple parsing - in production, use more sophisticated NLP
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    lines.forEach((line, idx) => {
      if (line.match(/^\d+\.|^-|^•/)) {
        recommendations.push({
          type: 'strategic',
          priority: idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low',
          title: `Strategic Initiative ${idx + 1}`,
          description: line.replace(/^\d+\.|^-|^•/, '').trim(),
          source: 'AI Analysis',
          confidence: 0.8
        });
      }
    });
    
    return recommendations;
  }

  /**
   * Real-time insight generation for updates
   */
  async generateRealTimeInsight(update) {
    try {
      const insight = await this.ai.generateResponse(
        `Generate a brief insight about this update: ${JSON.stringify(update)}`,
        {
          systemPrompt: 'You are a data analyst. Provide a one-sentence insight.',
          maxTokens: 100,
          temperature: 0.3,
          preferSpeed: true
        }
      );
      
      return {
        update,
        insight: insight.response,
        significance: this.calculateUpdateSignificance(update),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Real-time insight generation failed:', error);
      return null;
    }
  }

  /**
   * Calculate significance of an update
   */
  calculateUpdateSignificance(update) {
    let significance = 0.5; // Base significance
    
    // Adjust based on update type
    if (update.type === 'new_project') significance += 0.2;
    if (update.type === 'project_completed') significance += 0.3;
    if (update.type === 'new_story') significance += 0.1;
    if (update.type === 'milestone_reached') significance += 0.25;
    
    // Adjust based on metrics
    if (update.metrics?.people_impacted > 100) significance += 0.2;
    if (update.metrics?.funds_raised > 10000) significance += 0.15;
    
    return Math.min(1.0, significance);
  }
}

// Export singleton instance
export default new IntelligentInsightsEngine();