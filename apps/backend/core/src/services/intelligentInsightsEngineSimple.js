/**
 * Intelligent Insights Engine - Simplified Version
 * AI-powered pattern detection and insights without heavy ML dependencies
 */

import MultiProviderAI from './multiProviderAI.js';
import notionSyncEngine from './notionSyncEngine.js';
import { createClient } from '@supabase/supabase-js';
import natural from 'natural';
import Sentiment from 'sentiment';
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
    this.sentiment = new Sentiment();
    this.tfidf = new natural.TfIdf();
    
    // Simplified pattern detection
    this.patterns = {
      temporal: [],
      collaboration: [],
      impact: [],
      geographic: []
    };
    
    // Insight cache
    this.insightCache = new Map();
    this.predictionCache = new Map();
    
    console.log('🧠 Intelligent Insights Engine (Simplified) initialized');
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
      generated_at: new Date().toISOString()
    };
    
    // Cache insights
    this.insightCache.set(timeRange, insights);
    
    // Emit insights event
    this.emit('insights-generated', insights);
    
    return insights;
  }

  /**
   * Detect patterns using statistical analysis
   */
  async detectPatterns(timeRange) {
    const patterns = [];
    
    try {
      // Get data from Notion
      const notionData = await notionSyncEngine.getLatestData();
      
      // Analyze project growth
      if (notionData?.projects?.length > 0) {
        const projectGrowth = this.analyzeGrowth(notionData.projects);
        if (projectGrowth.trend !== 'stable') {
          patterns.push({
            type: 'temporal',
            pattern: `Project creation ${projectGrowth.trend}`,
            significance: projectGrowth.significance,
            insight: `${projectGrowth.percentage}% ${projectGrowth.trend === 'increasing' ? 'increase' : 'decrease'} in project activity`,
            recommendation: projectGrowth.recommendation
          });
        }
      }
      
      // Analyze collaboration patterns
      if (notionData?.people?.length > 0 && notionData?.projects?.length > 0) {
        const collabPatterns = this.analyzeCollaboration(notionData);
        patterns.push(...collabPatterns);
      }
      
      // Analyze themes
      if (notionData?.stories?.length > 0) {
        const themes = await this.analyzeThemes(notionData.stories);
        patterns.push(...themes);
      }
      
    } catch (error) {
      console.error('Pattern detection error:', error);
    }
    
    return patterns;
  }

  /**
   * Generate predictions using trend analysis
   */
  async generatePredictions() {
    const predictions = [];
    
    try {
      const notionData = await notionSyncEngine.getLatestData();
      
      // Growth predictions
      if (notionData?.projects?.length > 5) {
        const growthRate = this.calculateGrowthRate(notionData.projects);
        predictions.push({
          type: 'Community Growth',
          prediction: `Expected ${Math.round(growthRate * 100)}% growth in next 30 days`,
          confidence: 0.75,
          based_on: 'Historical project creation patterns'
        });
      }
      
      // Engagement predictions
      if (notionData?.stories?.length > 0) {
        const engagementTrend = this.analyzeEngagement(notionData.stories);
        predictions.push({
          type: 'Story Engagement',
          prediction: engagementTrend.prediction,
          confidence: engagementTrend.confidence,
          based_on: 'Story submission and theme patterns'
        });
      }
      
      // Add AI-powered prediction
      const aiPrediction = await this.getAIPrediction(notionData);
      if (aiPrediction) {
        predictions.push(aiPrediction);
      }
      
    } catch (error) {
      console.error('Prediction generation error:', error);
    }
    
    return predictions;
  }

  /**
   * Detect anomalies in data patterns
   */
  async detectAnomalies() {
    const anomalies = [];
    
    try {
      const notionData = await notionSyncEngine.getLatestData();
      
      // Check for unusual activity spikes
      if (notionData?.projects?.length > 0) {
        const activitySpikes = this.detectActivitySpikes(notionData.projects);
        anomalies.push(...activitySpikes);
      }
      
      // Check for gaps in activity
      const gaps = this.detectActivityGaps(notionData);
      anomalies.push(...gaps);
      
    } catch (error) {
      console.error('Anomaly detection error:', error);
    }
    
    return anomalies;
  }

  /**
   * Generate AI-powered recommendations
   */
  async generateRecommendations() {
    const recommendations = [];
    
    try {
      const notionData = await notionSyncEngine.getLatestData();
      
      // Get AI recommendations
      const prompt = `Based on the following community data, provide 3 specific, actionable recommendations:
        - ${notionData?.projects?.length || 0} active projects
        - ${notionData?.people?.length || 0} community members
        - ${notionData?.stories?.length || 0} impact stories
        - Recent themes: ${this.extractThemes(notionData?.stories || []).join(', ')}
        
        Format each recommendation as: { "action": "...", "impact": "...", "priority": "high/medium/low" }`;
      
      const aiResponse = await this.ai.generateContent(prompt, 'recommendations');
      
      if (aiResponse.success) {
        try {
          // Parse AI response
          const parsed = JSON.parse(aiResponse.content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
          recommendations.push(...(Array.isArray(parsed) ? parsed : [parsed]));
        } catch {
          // Fallback to text recommendation
          recommendations.push({
            action: aiResponse.content,
            impact: 'Potential positive impact on community growth',
            priority: 'medium'
          });
        }
      }
      
      // Add data-driven recommendations
      if (notionData?.projects?.length < 5) {
        recommendations.push({
          action: 'Focus on onboarding new projects',
          impact: 'Increase community activity and impact',
          priority: 'high'
        });
      }
      
      if (notionData?.stories?.length < notionData?.projects?.length) {
        recommendations.push({
          action: 'Encourage projects to share their impact stories',
          impact: 'Better showcase community achievements',
          priority: 'medium'
        });
      }
      
    } catch (error) {
      console.error('Recommendation generation error:', error);
    }
    
    return recommendations;
  }

  // Helper methods
  
  analyzeGrowth(items) {
    if (!items || items.length < 2) {
      return { trend: 'stable', significance: 0, percentage: 0 };
    }
    
    // Sort by date
    const sorted = items.sort((a, b) => 
      new Date(a.created_at || a.createdTime) - new Date(b.created_at || b.createdTime)
    );
    
    // Calculate growth rate
    const recent = sorted.slice(-Math.ceil(items.length / 3));
    const older = sorted.slice(0, Math.floor(items.length / 3));
    
    const recentRate = recent.length / 30; // items per month
    const olderRate = older.length / 30;
    
    const growthRate = ((recentRate - olderRate) / olderRate) * 100;
    
    return {
      trend: growthRate > 10 ? 'increasing' : growthRate < -10 ? 'decreasing' : 'stable',
      significance: Math.min(Math.abs(growthRate) / 100, 1),
      percentage: Math.round(Math.abs(growthRate)),
      recommendation: growthRate > 10 
        ? 'Capitalize on momentum with targeted outreach'
        : growthRate < -10 
        ? 'Re-engage community with events or campaigns'
        : 'Maintain current engagement strategies'
    };
  }
  
  analyzeCollaboration(data) {
    const patterns = [];
    
    // Find projects with multiple collaborators
    const multiCollabs = (data.projects || []).filter(p => 
      p.properties?.People?.relation?.length > 2
    );
    
    if (multiCollabs.length > 0) {
      patterns.push({
        type: 'collaboration',
        pattern: 'Multi-stakeholder projects emerging',
        significance: 0.8,
        insight: `${multiCollabs.length} projects involve 3+ collaborators`,
        recommendation: 'Facilitate cross-project knowledge sharing'
      });
    }
    
    return patterns;
  }
  
  async analyzeThemes(stories) {
    const patterns = [];
    const themes = this.extractThemes(stories);
    
    if (themes.length > 0) {
      const topThemes = themes.slice(0, 3);
      patterns.push({
        type: 'thematic',
        pattern: 'Emerging story themes',
        significance: 0.7,
        insight: `Top themes: ${topThemes.join(', ')}`,
        recommendation: 'Create content campaigns around these themes'
      });
    }
    
    return patterns;
  }
  
  extractThemes(stories) {
    if (!stories || stories.length === 0) return [];
    
    // Extract keywords from story titles and content
    const allText = stories.map(s => 
      `${s.properties?.Name?.title?.[0]?.plain_text || ''} ${s.properties?.Content?.rich_text?.[0]?.plain_text || ''}`
    ).join(' ');
    
    // Simple keyword extraction
    const words = this.tokenizer.tokenize(allText.toLowerCase());
    const filtered = words.filter(w => w.length > 4 && !this.isStopWord(w));
    
    // Count frequency
    const frequency = {};
    filtered.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Sort by frequency
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
  
  isStopWord(word) {
    const stopWords = ['about', 'after', 'being', 'before', 'could', 'during', 'every', 'having', 'should', 'these', 'those', 'through', 'under', 'where', 'which', 'while', 'would'];
    return stopWords.includes(word);
  }
  
  calculateGrowthRate(items) {
    if (!items || items.length < 2) return 0;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
    
    const recentItems = items.filter(i => 
      new Date(i.created_at || i.createdTime) > thirtyDaysAgo
    );
    
    const previousItems = items.filter(i => {
      const date = new Date(i.created_at || i.createdTime);
      return date > sixtyDaysAgo && date <= thirtyDaysAgo;
    });
    
    if (previousItems.length === 0) return 0.5; // Default growth
    
    return (recentItems.length - previousItems.length) / previousItems.length;
  }
  
  analyzeEngagement(stories) {
    const sentimentScores = stories.map(s => {
      const text = s.properties?.Content?.rich_text?.[0]?.plain_text || '';
      return this.sentiment.analyze(text).score;
    });
    
    const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
    
    return {
      prediction: avgSentiment > 0 
        ? 'Positive community sentiment will drive increased engagement'
        : 'Focus on celebrating wins to boost community morale',
      confidence: Math.min(Math.abs(avgSentiment) / 5, 0.9)
    };
  }
  
  async getAIPrediction(data) {
    try {
      const prompt = `Based on this community data: ${data?.projects?.length || 0} projects, ${data?.people?.length || 0} members, ${data?.stories?.length || 0} stories. Provide ONE specific prediction for the next 30 days. Format: { "type": "...", "prediction": "...", "confidence": 0.0-1.0 }`;
      
      const response = await this.ai.generateContent(prompt, 'prediction');
      
      if (response.success) {
        try {
          return JSON.parse(response.content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
        } catch {
          return null;
        }
      }
    } catch (error) {
      console.error('AI prediction error:', error);
    }
    return null;
  }
  
  detectActivitySpikes(items) {
    const anomalies = [];
    
    // Group by day
    const byDay = {};
    items.forEach(item => {
      const date = new Date(item.created_at || item.createdTime).toDateString();
      byDay[date] = (byDay[date] || 0) + 1;
    });
    
    const counts = Object.values(byDay);
    if (counts.length < 3) return anomalies;
    
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdDev = Math.sqrt(counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / counts.length);
    
    Object.entries(byDay).forEach(([date, count]) => {
      const zScore = (count - mean) / stdDev;
      if (Math.abs(zScore) > 2) {
        anomalies.push({
          type: 'activity_spike',
          date,
          severity: Math.abs(zScore) > 3 ? 'high' : 'medium',
          description: `Unusual activity: ${count} items (${zScore > 0 ? 'spike' : 'drop'})`
        });
      }
    });
    
    return anomalies;
  }
  
  detectActivityGaps(data) {
    const gaps = [];
    
    // Check for data gaps
    if (!data?.projects || data.projects.length === 0) {
      gaps.push({
        type: 'data_gap',
        severity: 'high',
        description: 'No project data available'
      });
    }
    
    if (!data?.stories || data.stories.length === 0) {
      gaps.push({
        type: 'data_gap',
        severity: 'medium',
        description: 'No story data available'
      });
    }
    
    return gaps;
  }
}

export default new IntelligentInsightsEngine();