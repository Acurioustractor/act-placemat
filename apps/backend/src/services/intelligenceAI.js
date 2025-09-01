/**
 * ACT Intelligence AI Service
 * Multi-model AI integration for deep decision analysis
 * - Anthropic Claude (primary)
 * - OpenAI (backup)
 * - Perplexity (research)
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import MultiProviderAI from './multiProviderAI.js';

class IntelligenceAI {
  constructor() {
    // Initialize Anthropic Claude (primary)
    this.anthropic = null;
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      console.log('🧠 Anthropic Claude initialized as primary AI');
    }

    // Initialize OpenAI (backup)
    this.openai = null;
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log('🔄 OpenAI initialized as backup AI');
    }

    // Initialize Perplexity (research)
    this.perplexity = null;
    if (process.env.PERPLEXITY_API_KEY) {
      this.perplexity = new OpenAI({
        apiKey: process.env.PERPLEXITY_API_KEY,
        baseURL: 'https://api.perplexity.ai'
      });
      console.log('🔍 Perplexity initialized for research');
    }

    // Initialize smart multi-provider AI system
    this.multiProvider = new MultiProviderAI();
    console.log('🚀 Multi-Provider AI system initialized');

    this.actContext = this.buildACTContext();
  }

  buildACTContext() {
    return `
# ACT (A Curious Tractor) Business Context

## Core Identity
A hybrid venture studio and not-for-profit reshaping justice, land, and story across Australia.

## Values
- Humility: Listen first, act with respect
- Curiosity: Ask better questions, explore deeply
- Disruption: Challenge harmful systems
- Truth: Transparent, evidence-based decisions

## Current Business State
- 52 active projects across justice, land, and story
- 100 people in community network
- 29 opportunities being cultivated
- Focus areas: Global Justice Innovation, Storytelling for Impact, Nature for Nurture
- Australian context with Indigenous cultural protocols
- Regulatory environment: Australian tax law, not-for-profit regulations, R&D incentives

## Decision Making Framework
- Community impact first
- Financial sustainability required
- Cultural protocols respected
- Systems thinking approach
- Evidence-based recommendations
`;
  }

  /**
   * Analyze business decision with full AI intelligence
   */
  async analyzeDecision(query, options = {}) {
    const {
      includeResearch = false,
      includeScenarios = true,
      businessContext = {},
      priority = 'medium'
    } = options;

    try {
      // Primary analysis with multi-provider AI system (best available model)
      console.log('🚀 Starting multi-provider AI analysis...');
      
      const multiProviderPrompt = `${this.actContext}

BUSINESS DECISION ANALYSIS REQUEST:
${query}

CURRENT BUSINESS CONTEXT:
${JSON.stringify(businessContext, null, 2)}

Please provide a comprehensive business analysis including:

1. **Immediate Recommendation** (clear yes/no/conditional with reasoning)
2. **Financial Impact Analysis** (costs, benefits, ROI, cash flow implications)
3. **Risk Assessment** (what could go wrong, mitigation strategies)
4. **Strategic Alignment** (how this fits ACT's mission and values)
5. **Implementation Timeline** (realistic steps and milestones)
6. **Success Metrics** (how to measure if this decision worked)
7. **Alternative Options** (other approaches to consider)

Focus on actionable, specific advice that considers ACT's unique position as a hybrid venture studio/not-for-profit in Australia. Consider Indigenous cultural protocols, Australian regulatory environment, and community impact.

Be direct, practical, and evidence-based. Provide specific numbers where possible.`;

      const multiProviderResult = await this.multiProvider.generateResponse(multiProviderPrompt, {
        systemPrompt: 'You are an expert business consultant specializing in Australian social enterprises, not-for-profits, and Indigenous businesses. Provide comprehensive, actionable analysis.',
        maxTokens: 2000,
        temperature: 0.3,
        preferQuality: priority === 'high',
        preferSpeed: priority === 'low'
      });

      console.log(`✅ Multi-provider analysis complete using ${multiProviderResult.provider} (${multiProviderResult.model})`);
      
      // Parse the multi-provider response
      const primaryAnalysis = this.parseClaudeResponse(multiProviderResult.response, query);
      primaryAnalysis.model_used = `${multiProviderResult.provider}-${multiProviderResult.model}`;
      primaryAnalysis.provider_quality = multiProviderResult.quality;
      
      // Research enhancement if requested
      let researchData = null;
      if (includeResearch && this.perplexity) {
        researchData = await this.getPerplexityResearch(query);
      }

      // Scenario analysis using multi-provider system
      let scenarios = [];
      if (includeScenarios) {
        scenarios = await this.generateScenariosMultiProvider(query, primaryAnalysis);
      }

      return {
        primary_analysis: primaryAnalysis,
        research_data: researchData,
        scenarios: scenarios,
        confidence: primaryAnalysis.confidence || 0.85,
        ai_models_used: [
          `${multiProviderResult.provider}-${multiProviderResult.model}`,
          ...(includeResearch && this.perplexity ? ['Perplexity-Llama-3.1'] : [])
        ],
        enhanced: Boolean(researchData),
        multi_provider_used: true,
        provider_attempt_count: multiProviderResult.attemptCount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Multi-provider AI analysis failed:', error);
      
      // Fallback to original Claude analysis
      if (this.anthropic && !error.message.includes('ANTHROPIC')) {
        console.log('🔄 Falling back to Claude analysis...');
        try {
          const primaryAnalysis = await this.getClaudeAnalysis(query, businessContext);
          
          let researchData = null;
          if (includeResearch && this.perplexity) {
            researchData = await this.getPerplexityResearch(query);
          }

          let scenarios = [];
          if (includeScenarios) {
            scenarios = await this.generateScenarios(query, primaryAnalysis);
          }

          return {
            primary_analysis: primaryAnalysis,
            research_data: researchData,
            scenarios: scenarios,
            confidence: primaryAnalysis.confidence || 0.85,
            ai_models_used: this.getModelsUsed(includeResearch),
            enhanced: Boolean(researchData),
            fallback_used: 'claude',
            timestamp: new Date().toISOString()
          };
        } catch (claudeError) {
          console.error('Claude fallback also failed:', claudeError);
        }
      }
      
      // Final fallback to OpenAI if available
      if (this.openai && !error.message.includes('OpenAI')) {
        console.log('🔄 Final fallback to OpenAI...');
        return await this.getOpenAIFallback(query, businessContext);
      }
      
      throw error;
    }
  }

  /**
   * Primary analysis using Anthropic Claude
   */
  async getClaudeAnalysis(query, businessContext) {
    if (!this.anthropic) {
      throw new Error('Anthropic API not configured');
    }

    const prompt = `${this.actContext}

BUSINESS DECISION ANALYSIS REQUEST:
${query}

CURRENT BUSINESS CONTEXT:
${JSON.stringify(businessContext, null, 2)}

Please provide a comprehensive business analysis including:

1. **Immediate Recommendation** (clear yes/no/conditional with reasoning)
2. **Financial Impact Analysis** (costs, benefits, ROI, cash flow implications)
3. **Risk Assessment** (what could go wrong, mitigation strategies)
4. **Strategic Alignment** (how this fits ACT's mission and values)
5. **Implementation Timeline** (realistic steps and milestones)
6. **Success Metrics** (how to measure if this decision worked)
7. **Alternative Options** (other approaches to consider)

Focus on actionable, specific advice that considers ACT's unique position as a hybrid venture studio/not-for-profit in Australia. Consider Indigenous cultural protocols, Australian regulatory environment, and community impact.

Be direct, practical, and evidence-based. Provide specific numbers where possible.`;

    // Add 5-second timeout to Anthropic API call
    const anthropicPromise = this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('ANTHROPIC_API_TIMEOUT')), 30000); // Increased to 30 seconds
    });

    const response = await Promise.race([anthropicPromise, timeoutPromise]);
    return this.parseClaudeResponse(response.content[0].text, query);
  }

  /**
   * Research enhancement using Perplexity
   */
  async getPerplexityResearch(query) {
    if (!this.perplexity) {
      return null;
    }

    try {
      // Enhanced research query for deeper insights and link collection
      const researchQuery = `Comprehensive research for: ${query}

Please provide:
1. Latest 2024-2025 information and developments
2. Specific Australian government programs, funding opportunities, or regulations
3. Key industry trends and best practices
4. Contact information for relevant organizations
5. Application deadlines and requirements
6. Success stories and case studies

Focus on: Australian business context, Indigenous businesses, technology sector, social enterprises, not-for-profits, tax implications, compliance requirements.

Include specific URLs, contact details, and actionable information where available.`;

      // Add 8-second timeout for deeper research
      const perplexityPromise = this.perplexity.chat.completions.create({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'user',
            content: researchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 2500, // Increased for more comprehensive research
        return_citations: true, // Request citations if available
        return_images: false
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PERPLEXITY_API_TIMEOUT')), 8000);
      });

      const response = await Promise.race([perplexityPromise, timeoutPromise]);
      const content = response.choices[0].message.content;

      // Extract URLs and sources from the response
      const urlRegex = /https?:\/\/[^\s)]+/g;
      const extractedUrls = content.match(urlRegex) || [];
      
      // Extract potential government websites and official sources
      const officialSources = extractedUrls.filter(url => 
        url.includes('.gov.au') || 
        url.includes('.org.au') || 
        url.includes('business.gov.au') ||
        url.includes('atp.gov.au') ||
        url.includes('innovation.gov.au')
      );

      return {
        research_summary: content,
        sources: 'Perplexity AI with real-time web search (enhanced)',
        extracted_urls: extractedUrls,
        official_sources: officialSources,
        url_count: extractedUrls.length,
        research_depth: 'comprehensive',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Perplexity research failed:', error.message);
      return {
        research_summary: 'Research enhancement unavailable',
        error: error.message
      };
    }
  }

  /**
   * Scenario analysis using multi-provider system
   */
  async generateScenariosMultiProvider(query, primaryAnalysis) {
    try {
      const scenarioPrompt = `Based on this business decision: "${query}"

Primary analysis: ${JSON.stringify(primaryAnalysis.summary || primaryAnalysis.recommendation || '', null, 2)}

Generate 3 scenarios for ACT:

1. **BEST CASE**: Everything goes perfectly, what's the upside?
2. **MOST LIKELY**: Realistic outcome with normal challenges
3. **WORST CASE**: What if things go wrong, how to mitigate?

For each scenario, provide:
- Probability (%)
- Financial impact ($)
- Timeline
- Key risks/benefits
- Action required

Keep each scenario concise but specific to ACT's context.`;

      const multiProviderResult = await this.multiProvider.generateResponse(scenarioPrompt, {
        systemPrompt: 'You are a strategic business analyst. Generate realistic scenarios for business decisions.',
        maxTokens: 1000,
        temperature: 0.4,
        preferSpeed: true // Scenarios can be faster
      });

      return this.parseScenarios(multiProviderResult.response);
    } catch (error) {
      console.warn('Multi-provider scenario generation failed, trying fallback:', error);
      // Fallback to original method
      return await this.generateScenarios(query, primaryAnalysis);
    }
  }

  /**
   * Scenario analysis (original Claude-only method as fallback)
   */
  async generateScenarios(query, primaryAnalysis) {
    if (!this.anthropic) {
      return [];
    }

    try {
      const scenarioPrompt = `Based on this business decision: "${query}"

Primary analysis: ${JSON.stringify(primaryAnalysis.summary || primaryAnalysis.recommendation || '', null, 2)}

Generate 3 scenarios for ACT:

1. **BEST CASE**: Everything goes perfectly, what's the upside?
2. **MOST LIKELY**: Realistic outcome with normal challenges
3. **WORST CASE**: What if things go wrong, how to mitigate?

For each scenario, provide:
- Probability (%)
- Financial impact ($)
- Timeline
- Key risks/benefits
- Action required

Keep each scenario concise but specific to ACT's context.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: scenarioPrompt
          }
        ]
      });

      return this.parseScenarios(response.content[0].text);
    } catch (error) {
      console.warn('Scenario generation failed:', error);
      return [];
    }
  }

  /**
   * OpenAI fallback analysis
   */
  async getOpenAIFallback(query, businessContext) {
    if (!this.openai) {
      throw new Error('No AI services available');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: this.actContext
        },
        {
          role: 'user',
          content: `Analyze this business decision for ACT: ${query}\n\nContext: ${JSON.stringify(businessContext, null, 2)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    return {
      recommendation: response.choices[0].message.content,
      confidence: 0.75,
      model_used: 'GPT-4 (fallback)',
      scenarios: [],
      research_data: null
    };
  }

  /**
   * Parse Claude response into structured format
   */
  parseClaudeResponse(text, originalQuery) {
    // Extract key sections using regex patterns
    const sections = {
      recommendation: this.extractSection(text, /immediate recommendation|recommendation/i),
      financial_impact: this.extractSection(text, /financial impact|financial/i),
      risks: this.extractSection(text, /risk assessment|risks/i),
      strategic_alignment: this.extractSection(text, /strategic alignment|alignment/i),
      timeline: this.extractSection(text, /implementation timeline|timeline/i),
      success_metrics: this.extractSection(text, /success metrics|metrics/i),
      alternatives: this.extractSection(text, /alternative options|alternatives/i)
    };

    // Extract confidence level if mentioned
    const confidenceMatch = text.match(/confidence[:\s]+(\d+)%/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.85;

    return {
      summary: text.substring(0, 500) + '...', // First 500 chars as summary
      recommendation: sections.recommendation || text,
      financial_impact: sections.financial_impact,
      risks: sections.risks,
      strategic_alignment: sections.strategic_alignment,
      timeline: sections.timeline,
      success_metrics: sections.success_metrics,
      alternatives: sections.alternatives,
      confidence: confidence,
      full_analysis: text,
      query: originalQuery
    };
  }

  /**
   * Extract section from text
   */
  extractSection(text, pattern) {
    if (!text || typeof text !== 'string') return null;
    
    const match = text.match(new RegExp(`${pattern.source}[:\n]([^#]*?)(?=\n#|\n[0-9]\\.|$)`, 'is'));
    return match && match[1] ? match[1].trim() : null;
  }

  /**
   * Parse scenarios from text
   */
  parseScenarios(text) {
    const scenarios = [];
    const scenarioPattern = /(?:BEST CASE|MOST LIKELY|WORST CASE)[:\s]*([^#]*?)(?=\n(?:BEST CASE|MOST LIKELY|WORST CASE)|$)/gis;
    
    let match;
    const types = ['best_case', 'most_likely', 'worst_case'];
    let index = 0;
    
    while ((match = scenarioPattern.exec(text)) !== null && index < 3) {
      scenarios.push({
        type: types[index],
        description: match[1].trim(),
        probability: this.extractProbability(match[1]),
        financial_impact: this.extractFinancialImpact(match[1])
      });
      index++;
    }
    
    return scenarios;
  }

  extractProbability(text) {
    const match = text.match(/(\d+)%/);
    return match ? parseInt(match[1]) : null;
  }

  extractFinancialImpact(text) {
    const match = text.match(/\$([0-9,]+)/);
    return match ? match[1].replace(/,/g, '') : null;
  }

  getModelsUsed(includeResearch) {
    const models = [];
    if (this.anthropic) models.push('Claude-3.5-Sonnet');
    if (this.openai) models.push('GPT-4');
    if (includeResearch && this.perplexity) models.push('Perplexity-Llama-3.1');
    return models;
  }

  /**
   * Deep research mode - comprehensive analysis
   */
  async deepResearch(query, businessContext = {}) {
    console.log('🔍 Starting deep research mode for:', query);

    // Step 1: Get comprehensive analysis
    const analysis = await this.analyzeDecision(query, {
      includeResearch: true,
      includeScenarios: true,
      businessContext
    });

    // Step 2: Follow-up research on key topics
    const followUpTopics = this.identifyFollowUpTopics(analysis);
    const deeperResearch = await Promise.all(
      followUpTopics.map(topic => this.getPerplexityResearch(topic))
    );

    // Step 3: Get expert perspectives
    const expertAnalysis = await this.getExpertPerspective(query, analysis);

    return {
      ...analysis,
      deep_research: {
        follow_up_topics: followUpTopics,
        additional_research: deeperResearch,
        expert_perspective: expertAnalysis,
        research_depth: 'comprehensive'
      },
      research_links: this.generateResearchLinks(query),
      timestamp: new Date().toISOString()
    };
  }

  identifyFollowUpTopics(analysis) {
    // Extract key terms for follow-up research
    const topics = [];
    
    if (analysis.primary_analysis?.financial_impact) {
      topics.push('Australian tax implications for social enterprises 2024');
    }
    
    if (analysis.primary_analysis?.risks) {
      topics.push('Risk management best practices for Australian not-for-profits');
    }
    
    topics.push('Latest Australian government grants for social impact organizations');
    
    return topics;
  }

  async getExpertPerspective(query, analysis) {
    if (!this.anthropic) return null;

    const expertPrompt = `You are an expert consultant specializing in Australian social enterprises and not-for-profits. 
    
Based on this analysis: ${JSON.stringify(analysis.primary_analysis, null, 2)}
    
For the decision: "${query}"
    
Provide expert insights covering:
1. Industry best practices
2. Regulatory considerations specific to Australia
3. Potential partnerships or collaborations
4. Long-term strategic implications
5. Similar case studies or precedents
    
Be specific and actionable.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.2,
        messages: [{ role: 'user', content: expertPrompt }]
      });

      return response.content[0].text;
    } catch (error) {
      console.warn('Expert perspective failed:', error);
      return null;
    }
  }

  generateResearchLinks(query) {
    const encodedQuery = encodeURIComponent(query + ' Australia social enterprise');
    
    return {
      government_resources: `https://www.business.gov.au/search?q=${encodedQuery}`,
      acnc_guidance: `https://www.acnc.gov.au/search?query=${encodedQuery}`,
      industry_reports: `https://scholar.google.com/scholar?q=${encodedQuery}`,
      case_studies: `https://www.socialenterprise.org.au/?s=${encodedQuery}`,
      tax_guidance: `https://www.ato.gov.au/search/?query=${encodedQuery}`,
      grants_database: `https://business.gov.au/grants-and-programs?keyword=${encodedQuery}`
    };
  }

  /**
   * Health check for all AI services
   */
  async healthCheck() {
    const status = {
      anthropic: Boolean(this.anthropic),
      openai: Boolean(this.openai),
      perplexity: Boolean(this.perplexity),
      primary_available: Boolean(this.anthropic),
      research_available: Boolean(this.perplexity),
      timestamp: new Date().toISOString()
    };

    // Test primary service
    if (this.anthropic) {
      try {
        await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        });
        status.anthropic_healthy = true;
      } catch (error) {
        status.anthropic_healthy = false;
        status.anthropic_error = error.message;
      }
    }

    return status;
  }
}

export default IntelligenceAI;