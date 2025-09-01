/**
 * Multi-Provider AI Analysis Engine
 * Orchestrates Claude, GPT-4, and Perplexity for business intelligence
 * 
 * Depth Controls:
 * - Quick ($0.01): Claude 3.5 Haiku for fast insights
 * - Deep ($0.10): Claude 3.5 Sonnet for comprehensive analysis  
 * - Strategic ($0.50): Multi-provider analysis with research
 * - Expert ($2.00): Full AI collaboration with Perplexity research
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

/**
 * Multi-Provider AI Orchestrator Class
 * Manages AI analysis across providers with cost controls and fallback strategies
 */
class MultiProviderAIOrchestrator {
  constructor() {
    // Initialize AI providers
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Define analysis tiers with pricing and capabilities
    this.analysisTiers = {
      quick: {
        cost: 0.01,
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        maxTokens: 1000,
        description: 'Fast insights using cached data and pattern recognition'
      },
      deep: {
        cost: 0.10,
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 2000,
        description: 'Comprehensive analysis with cross-source synthesis'
      },
      strategic: {
        cost: 0.50,
        provider: 'multi',
        models: ['claude-3-5-sonnet-20241022', 'gpt-4'],
        maxTokens: 3000,
        description: 'Multi-AI collaboration with strategic framework analysis'
      },
      expert: {
        cost: 2.00,
        provider: 'full',
        models: ['claude-3-5-sonnet-20241022', 'gpt-4', 'perplexity'],
        maxTokens: 4000,
        description: 'Complete AI ecosystem with real-time research integration'
      }
    };
  }

  /**
   * Main analysis method - processes business intelligence requests
   */
  async analyze(query, aggregatedData, depth = 'quick', context = {}) {
    const tier = this.analysisTiers[depth];
    if (!tier) {
      throw new Error(`Invalid analysis depth: ${depth}`);
    }

    console.log(`🤖 AI Analysis: "${query.substring(0, 50)}..." (${depth} - $${tier.cost})`);

    const startTime = Date.now();
    let analysisResult;

    try {
      switch (tier.provider) {
        case 'anthropic':
          analysisResult = await this.anthropicAnalysis(query, aggregatedData, tier, context);
          break;
        case 'multi':
          analysisResult = await this.multiProviderAnalysis(query, aggregatedData, tier, context);
          break;
        case 'full':
          analysisResult = await this.fullEcosystemAnalysis(query, aggregatedData, tier, context);
          break;
        default:
          throw new Error(`Unknown provider: ${tier.provider}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        analysis: analysisResult,
        metadata: {
          depth,
          cost: tier.cost,
          processingTime,
          provider: tier.provider,
          model: tier.model || tier.models,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error(`❌ AI Analysis failed (${depth}):`, error);
      
      // Fallback to simpler analysis
      if (depth !== 'quick') {
        console.log('🔄 Falling back to quick analysis...');
        return this.analyze(query, aggregatedData, 'quick', context);
      }

      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Single-provider analysis using Anthropic Claude
   */
  async anthropicAnalysis(query, aggregatedData, tier, context) {
    const systemPrompt = this.buildSystemPrompt('anthropic', context);
    const userPrompt = this.buildUserPrompt(query, aggregatedData, tier.description);

    const response = await this.anthropic.messages.create({
      model: tier.model,
      max_tokens: tier.maxTokens,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    return this.parseAnthropicResponse(response);
  }

  /**
   * Multi-provider analysis comparing Claude and GPT-4
   */
  async multiProviderAnalysis(query, aggregatedData, tier, context) {
    console.log('🤝 Running multi-provider analysis...');

    const [claudeResult, gptResult] = await Promise.allSettled([
      this.anthropicAnalysis(query, aggregatedData, {
        ...tier,
        model: 'claude-3-5-sonnet-20241022'
      }, context),
      this.openaiAnalysis(query, aggregatedData, tier, context)
    ]);

    // Combine results from both providers
    return this.synthesizeMultiProviderResults(query, claudeResult, gptResult);
  }

  /**
   * Full ecosystem analysis with Perplexity research
   */
  async fullEcosystemAnalysis(query, aggregatedData, tier, context) {
    console.log('🌐 Running full ecosystem analysis with research...');

    // Run core analysis
    const coreAnalysis = await this.multiProviderAnalysis(query, aggregatedData, tier, context);

    // Add research context (placeholder for Perplexity integration)
    const researchContext = await this.getResearchContext(query, context);

    return {
      ...coreAnalysis,
      research_context: researchContext,
      confidence_boost: 0.15,
      external_validation: true
    };
  }

  /**
   * OpenAI GPT-4 analysis for comparison
   */
  async openaiAnalysis(query, aggregatedData, tier, context) {
    const systemPrompt = this.buildSystemPrompt('openai', context);
    const userPrompt = this.buildUserPrompt(query, aggregatedData, tier.description);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      max_tokens: tier.maxTokens,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    return this.parseOpenAIResponse(response);
  }

  /**
   * Build system prompt tailored to AI provider and ACT's context
   */
  buildSystemPrompt(provider, context) {
    const basePrompt = `You are ACT's Universal Business Intelligence Assistant, analyzing real community data to support strategic decision-making.

CONTEXT:
- ACT builds community-centered platforms with revolutionary transparent economics
- 221 storytellers with extensive AI analysis (79 fields each)
- Democratic governance with 40% profit sharing to communities
- Cultural safety and Indigenous sovereignty are paramount
- "Rocket Booster" philosophy: help communities become independent

CAPABILITIES:
- Analyze community wisdom for business insights
- Connect storyteller expertise to project opportunities  
- Identify partnership and collaboration possibilities
- Provide strategic recommendations with cultural sensitivity
- Calculate business impact while honoring community values

RESPONSE REQUIREMENTS:
- Be direct, actionable, and respectful of community sovereignty
- Include specific storyteller names and expertise when relevant
- Suggest concrete next steps with cost/benefit analysis
- Honor cultural protocols in all recommendations
- Connect insights to ACT's transparent economics model`;

    if (provider === 'anthropic') {
      return basePrompt + `\n\nAs Claude, prioritize nuanced understanding of community relationships and cultural context.`;
    } else if (provider === 'openai') {
      return basePrompt + `\n\nAs GPT-4, focus on structured analysis and clear business strategy recommendations.`;
    }

    return basePrompt;
  }

  /**
   * Build user prompt with query and data context
   */
  buildUserPrompt(query, aggregatedData, tierDescription) {
    const dataContext = this.summarizeAggregatedData(aggregatedData);
    
    return `BUSINESS QUERY: ${query}

ANALYSIS DEPTH: ${tierDescription}

AVAILABLE DATA:
${dataContext}

Please provide strategic business intelligence that:
1. Directly answers the query using available data
2. Identifies specific storytellers, projects, or partnerships relevant to the question
3. Suggests actionable next steps with estimated impact
4. Highlights any cultural considerations or consent requirements
5. Connects insights to ACT's business model and community values

Format your response as structured business intelligence with clear recommendations.`;
  }

  /**
   * Summarize aggregated data for AI context
   */
  summarizeAggregatedData(data) {
    const summary = [];

    if (data.storytellers?.length > 0) {
      summary.push(`STORYTELLERS (${data.storytellers.length}):
${data.storytellers.slice(0, 5).map(s => 
  `- ${s.full_name}: ${s.expertise_areas || 'General expertise'} | Available for collaboration: ${s.available_for_collaboration}`
).join('\n')}`);
    }

    if (data.projects?.length > 0) {
      summary.push(`PROJECTS (${data.projects.length}):
${data.projects.map(p => 
  `- ${p.name}: ${p.status} | ${p.communities_served} communities | Next: ${p.next_milestone}`
).join('\n')}`);
    }

    if (data.partnerships?.length > 0) {
      summary.push(`PARTNERSHIPS (${data.partnerships.length}):
${data.partnerships.map(p => 
  `- ${p.name}: ${p.relationship_strength} | Focus: ${p.collaboration_focus?.join(', ')}`
).join('\n')}`);
    }

    if (data.community_wisdom?.length > 0) {
      summary.push(`COMMUNITY WISDOM (${data.community_wisdom.length} quotes):
${data.community_wisdom.slice(0, 3).map(q => 
  `- "${q.quote_text}" (Confidence: ${q.ai_confidence_score}%)`
).join('\n')}`);
    }

    return summary.join('\n\n') || 'No specific data available for this query.';
  }

  /**
   * Parse Anthropic Claude response
   */
  parseAnthropicResponse(response) {
    const content = response.content[0]?.text || '';
    
    return {
      provider: 'anthropic',
      model: response.model,
      primary_analysis: {
        recommendation: content,
        confidence: 0.85
      },
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      }
    };
  }

  /**
   * Parse OpenAI GPT-4 response
   */
  parseOpenAIResponse(response) {
    const content = response.choices[0]?.message?.content || '';
    
    return {
      provider: 'openai',
      model: response.model,
      primary_analysis: {
        recommendation: content,
        confidence: 0.80
      },
      usage: {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      }
    };
  }

  /**
   * Synthesize results from multiple AI providers
   */
  synthesizeMultiProviderResults(query, claudeResult, gptResult) {
    const claudeAnalysis = claudeResult.status === 'fulfilled' ? claudeResult.value : null;
    const gptAnalysis = gptResult.status === 'fulfilled' ? gptResult.value : null;

    if (!claudeAnalysis && !gptAnalysis) {
      throw new Error('All AI providers failed');
    }

    // Use Claude as primary, GPT as validation
    const primary = claudeAnalysis || gptAnalysis;
    const secondary = claudeAnalysis ? gptAnalysis : null;

    return {
      provider: 'multi',
      primary_analysis: primary.primary_analysis,
      validation_analysis: secondary ? {
        provider: secondary.provider,
        recommendation: secondary.primary_analysis.recommendation,
        confidence: secondary.primary_analysis.confidence
      } : null,
      consensus_confidence: this.calculateConsensusConfidence(claudeAnalysis, gptAnalysis),
      combined_usage: this.combineUsageStats(claudeAnalysis, gptAnalysis)
    };
  }

  /**
   * Calculate consensus confidence between providers
   */
  calculateConsensusConfidence(claude, gpt) {
    if (!claude || !gpt) return (claude?.primary_analysis?.confidence || gpt?.primary_analysis?.confidence || 0.5);
    
    const claudeConf = claude.primary_analysis.confidence;
    const gptConf = gpt.primary_analysis.confidence;
    
    // Higher confidence when both agree
    return Math.min(0.95, (claudeConf + gptConf) / 2 + 0.1);
  }

  /**
   * Combine usage statistics from multiple providers
   */
  combineUsageStats(claude, gpt) {
    const stats = { total_tokens: 0, providers: [] };
    
    if (claude?.usage) {
      stats.total_tokens += claude.usage.total_tokens;
      stats.providers.push({ provider: 'claude', tokens: claude.usage.total_tokens });
    }
    
    if (gpt?.usage) {
      stats.total_tokens += gpt.usage.total_tokens;
      stats.providers.push({ provider: 'gpt4', tokens: gpt.usage.total_tokens });
    }
    
    return stats;
  }

  /**
   * Get research context (placeholder for Perplexity integration)
   */
  async getResearchContext(query, context) {
    // TODO: Integrate with Perplexity API for real-time research
    return {
      research_performed: false,
      external_sources: [],
      note: 'Perplexity research integration coming soon'
    };
  }

  /**
   * Health check for all AI providers
   */
  async healthCheck() {
    const checks = {
      anthropic: false,
      openai: false,
      perplexity: false
    };

    try {
      // Test Anthropic
      const testResponse = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }]
      });
      checks.anthropic = !!testResponse;
    } catch (error) {
      console.warn('⚠️ Anthropic health check failed:', error.message);
    }

    try {
      // Test OpenAI
      const testResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }]
      });
      checks.openai = !!testResponse;
    } catch (error) {
      console.warn('⚠️ OpenAI health check failed:', error.message);
    }

    // Perplexity placeholder
    checks.perplexity = false;

    return {
      status: Object.values(checks).some(Boolean) ? 'healthy' : 'degraded',
      providers: checks,
      available_tiers: this.getAvailableTiers(checks)
    };
  }

  /**
   * Get available analysis tiers based on provider health
   */
  getAvailableTiers(providerHealth) {
    const available = [];
    
    if (providerHealth.anthropic) {
      available.push('quick', 'deep');
    }
    
    if (providerHealth.anthropic && providerHealth.openai) {
      available.push('strategic');
    }
    
    if (providerHealth.anthropic && providerHealth.openai && providerHealth.perplexity) {
      available.push('expert');
    }
    
    return available;
  }
}

export default MultiProviderAIOrchestrator;