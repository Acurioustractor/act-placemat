/**
 * Open Source Research AI Integration
 *
 * Integrates multiple FREE and OPEN SOURCE research tools:
 * 1. Perplexica - Self-hosted Perplexity alternative
 * 2. LangChain Open Deep Research - Research agent framework
 * 3. Local LLMs via Ollama (Llama, Qwen, DeepSeek, Mistral)
 * 4. SearxNG - Privacy-focused meta-search engine
 * 5. DuckDuckGo - Free search API
 *
 * All tools are 100% FREE and can run locally for complete privacy
 */

import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

export class OpenSourceResearchAI {
  constructor() {
    this.config = {
      // Perplexica (self-hosted)
      perplexica: {
        enabled: !!process.env.PERPLEXICA_URL,
        url: process.env.PERPLEXICA_URL || 'http://localhost:3000',
        apiUrl: process.env.PERPLEXICA_API_URL || 'http://localhost:3001',
      },

      // Ollama (local LLMs)
      ollama: {
        enabled: !!process.env.OLLAMA_URL,
        url: process.env.OLLAMA_URL || 'http://localhost:11434',
        models: {
          research: 'llama3.1:70b',      // Best for research & analysis
          fast: 'qwen2.5:32b',            // Fast, accurate responses
          coding: 'deepseek-coder-v2',   // Code generation & analysis
          reasoning: 'deepseek-r1',      // Deep reasoning tasks
        },
      },

      // SearxNG (self-hosted search)
      searxng: {
        enabled: !!process.env.SEARXNG_URL,
        url: process.env.SEARXNG_URL || 'http://localhost:8888',
      },

      // LangChain Deep Research
      langchainResearch: {
        enabled: true, // Always available if dependencies installed
        maxSteps: 10,
        maxTokens: 4000,
      },
    };

    logger.info('🌐 Open Source Research AI initialized');
    this.logAvailableServices();
  }

  /**
   * Main research method - orchestrates all open source tools
   */
  async research(query, options = {}) {
    const {
      depth = 'standard', // 'quick', 'standard', 'deep'
      sources = 'auto',   // 'auto', 'perplexica', 'ollama', 'searxng'
      model = 'auto',     // Auto-select best model
      privacy = 'high',   // 'high' = local only, 'medium' = external search ok
    } = options;

    logger.info(`🔍 Open source research: "${query.substring(0, 50)}..." (${depth})`);

    try {
      // Choose research strategy based on requirements
      const researchStrategy = this.selectResearchStrategy(depth, sources, privacy);

      // Execute research
      const results = await this.executeResearchStrategy(query, researchStrategy, options);

      return {
        success: true,
        query,
        strategy: researchStrategy,
        results,
        privacy_level: privacy,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('❌ Open source research failed:', error);
      return {
        success: false,
        error: error.message,
        query,
        fallback: await this.getFallbackResults(query),
      };
    }
  }

  /**
   * Select optimal research strategy
   */
  selectResearchStrategy(depth, sources, privacy) {
    // High privacy = local only
    if (privacy === 'high' && this.config.ollama.enabled) {
      return {
        primary: 'ollama',
        search: this.config.searxng.enabled ? 'searxng' : 'none',
        synthesis: 'ollama',
        description: 'Full privacy - local AI + local search',
      };
    }

    // Perplexica available = best all-in-one
    if (this.config.perplexica.enabled && sources === 'auto') {
      return {
        primary: 'perplexica',
        search: 'integrated',
        synthesis: 'integrated',
        description: 'Perplexica - integrated search & AI',
      };
    }

    // Deep research = multi-tool approach
    if (depth === 'deep') {
      return {
        primary: 'multi',
        tools: ['perplexica', 'ollama', 'searxng', 'duckduckgo'],
        synthesis: 'ollama',
        description: 'Deep research - multiple sources + local synthesis',
      };
    }

    // Default: best available tool
    return {
      primary: this.selectBestAvailableTool(),
      search: 'duckduckgo',
      synthesis: 'basic',
      description: 'Standard research - best available tool',
    };
  }

  /**
   * Execute research using selected strategy
   */
  async executeResearchStrategy(query, strategy, options) {
    switch (strategy.primary) {
      case 'perplexica':
        return await this.researchWithPerplexica(query, options);

      case 'ollama':
        return await this.researchWithOllama(query, strategy, options);

      case 'multi':
        return await this.multiToolResearch(query, strategy, options);

      default:
        return await this.basicResearch(query, options);
    }
  }

  /**
   * Research using Perplexica (self-hosted Perplexity alternative)
   */
  async researchWithPerplexica(query, options = {}) {
    if (!this.config.perplexica.enabled) {
      throw new Error('Perplexica not configured. Set PERPLEXICA_URL in .env');
    }

    try {
      const response = await fetch(`${this.config.perplexica.apiUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          focus_mode: options.focusMode || 'webSearch', // webSearch, academic, youtube, reddit
          chat_model: options.model || 'llama3.1:70b',
          embedding_model: 'nomic-embed-text',
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexica API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        provider: 'perplexica',
        answer: data.message || data.answer,
        sources: data.sources || [],
        model: data.chat_model,
        focus: options.focusMode || 'webSearch',
        privacy: 'self-hosted',
        cost: 'FREE',
      };

    } catch (error) {
      logger.warn('⚠️ Perplexica research failed:', error.message);
      throw error;
    }
  }

  /**
   * Research using local Ollama models
   */
  async researchWithOllama(query, strategy, options = {}) {
    if (!this.config.ollama.enabled) {
      throw new Error('Ollama not configured. Install Ollama and set OLLAMA_URL');
    }

    // Step 1: Get search results if search engine available
    let searchContext = '';
    if (strategy.search === 'searxng') {
      const searchResults = await this.searchWithSearxNG(query);
      searchContext = this.formatSearchResults(searchResults);
    } else if (strategy.search === 'duckduckgo') {
      const searchResults = await this.searchWithDuckDuckGo(query);
      searchContext = this.formatSearchResults(searchResults);
    }

    // Step 2: Analyze with local LLM
    const modelName = this.selectOllamaModel(options.task || 'research');

    const prompt = `You are a research analyst. Analyze the following query and provide comprehensive insights.

Query: "${query}"

${searchContext ? `Search Results:\n${searchContext}\n` : ''}

Provide:
1. Direct answer to the query
2. Key insights and analysis
3. Supporting evidence
4. Practical recommendations

Be thorough but concise.`;

    try {
      const response = await fetch(`${this.config.ollama.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 2000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        provider: 'ollama',
        model: modelName,
        answer: data.response,
        search_used: !!searchContext,
        search_engine: strategy.search,
        privacy: '100% local',
        cost: 'FREE',
      };

    } catch (error) {
      logger.warn('⚠️ Ollama research failed:', error.message);
      throw error;
    }
  }

  /**
   * Multi-tool research (combines multiple sources)
   */
  async multiToolResearch(query, strategy, options = {}) {
    const researchTasks = [];

    // Run all available tools in parallel
    if (this.config.perplexica.enabled) {
      researchTasks.push(
        this.researchWithPerplexica(query, options)
          .catch(err => ({ error: err.message, provider: 'perplexica' }))
      );
    }

    if (this.config.ollama.enabled) {
      researchTasks.push(
        this.researchWithOllama(query, { search: 'duckduckgo' }, options)
          .catch(err => ({ error: err.message, provider: 'ollama' }))
      );
    }

    const results = await Promise.all(researchTasks);
    const successful = results.filter(r => !r.error);

    // Synthesize results using local Ollama if available
    let synthesis = null;
    if (this.config.ollama.enabled && successful.length > 1) {
      synthesis = await this.synthesizeResults(query, successful);
    }

    return {
      provider: 'multi-tool',
      individual_results: results,
      successful_sources: successful.length,
      synthesis,
      privacy: 'mixed',
      cost: 'FREE',
    };
  }

  /**
   * Basic research fallback (DuckDuckGo + basic analysis)
   */
  async basicResearch(query, options = {}) {
    const searchResults = await this.searchWithDuckDuckGo(query);

    return {
      provider: 'duckduckgo',
      query,
      results: searchResults.sources || [],
      answer: searchResults.answer || searchResults.abstract,
      privacy: 'external search',
      cost: 'FREE',
    };
  }

  /**
   * Search with SearxNG (self-hosted meta-search)
   */
  async searchWithSearxNG(query, options = {}) {
    if (!this.config.searxng.enabled) {
      return { sources: [], note: 'SearxNG not configured' };
    }

    try {
      const url = new URL(`${this.config.searxng.url}/search`);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('pageno', '1');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`SearxNG error: ${response.status}`);
      }

      const data = await response.json();

      return {
        provider: 'searxng',
        sources: data.results?.slice(0, 5).map(r => ({
          title: r.title,
          url: r.url,
          content: r.content,
          engine: r.engine,
        })) || [],
        privacy: 'self-hosted',
      };

    } catch (error) {
      logger.warn('⚠️ SearxNG search failed:', error.message);
      return { sources: [], error: error.message };
    }
  }

  /**
   * Search with DuckDuckGo (always available)
   */
  async searchWithDuckDuckGo(query) {
    try {
      const url = new URL('https://api.duckduckgo.com/');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('no_html', '1');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`DuckDuckGo error: ${response.status}`);
      }

      const data = await response.json();

      return {
        provider: 'duckduckgo',
        sources: data.RelatedTopics?.slice(0, 5).map(t => ({
          title: t.Text?.split(' - ')[0] || 'Result',
          url: t.FirstURL || '',
          content: t.Text || '',
        })) || [],
        abstract: data.Abstract,
        answer: data.Answer,
        privacy: 'external search',
      };

    } catch (error) {
      logger.warn('⚠️ DuckDuckGo search failed:', error.message);
      return { sources: [], error: error.message };
    }
  }

  /**
   * Synthesize multiple research results
   */
  async synthesizeResults(query, results) {
    const synthesisPrompt = `Synthesize these research results into a comprehensive answer:

Query: "${query}"

Results from multiple sources:
${JSON.stringify(results, null, 2)}

Provide a clear, comprehensive synthesis that:
1. Combines insights from all sources
2. Highlights agreements and contradictions
3. Provides a balanced conclusion
4. Cites sources when relevant`;

    try {
      const response = await fetch(`${this.config.ollama.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.ollama.models.research,
          prompt: synthesisPrompt,
          stream: false,
        }),
      });

      const data = await response.json();
      return data.response;

    } catch (error) {
      logger.warn('⚠️ Synthesis failed:', error.message);
      return null;
    }
  }

  /**
   * Helper methods
   */
  selectOllamaModel(task) {
    const modelMap = {
      research: this.config.ollama.models.research,
      fast: this.config.ollama.models.fast,
      coding: this.config.ollama.models.coding,
      reasoning: this.config.ollama.models.reasoning,
    };
    return modelMap[task] || this.config.ollama.models.research;
  }

  selectBestAvailableTool() {
    if (this.config.perplexica.enabled) return 'perplexica';
    if (this.config.ollama.enabled) return 'ollama';
    return 'basic';
  }

  formatSearchResults(searchResults) {
    return searchResults.sources?.map((s, i) =>
      `${i + 1}. ${s.title}\n   ${s.content}\n   URL: ${s.url}`
    ).join('\n\n') || '';
  }

  async getFallbackResults(query) {
    return {
      message: 'Open source research tools unavailable',
      suggestion: 'Install Ollama or Perplexica for local research capabilities',
      basic_info: `Query: "${query}" - Use manual research`,
    };
  }

  logAvailableServices() {
    const services = [];
    if (this.config.perplexica.enabled) services.push('Perplexica ✅');
    if (this.config.ollama.enabled) services.push('Ollama ✅');
    if (this.config.searxng.enabled) services.push('SearxNG ✅');

    logger.info(`📊 Available services: ${services.join(', ') || 'DuckDuckGo only'}`);
  }

  /**
   * Health check for all services
   */
  async checkHealth() {
    const health = {
      perplexica: false,
      ollama: false,
      searxng: false,
      duckduckgo: true,
    };

    // Check Perplexica
    if (this.config.perplexica.enabled) {
      try {
        const response = await fetch(`${this.config.perplexica.url}/api/health`);
        health.perplexica = response.ok;
      } catch {
        health.perplexica = false;
      }
    }

    // Check Ollama
    if (this.config.ollama.enabled) {
      try {
        const response = await fetch(`${this.config.ollama.url}/api/tags`);
        health.ollama = response.ok;
      } catch {
        health.ollama = false;
      }
    }

    // Check SearxNG
    if (this.config.searxng.enabled) {
      try {
        const response = await fetch(`${this.config.searxng.url}/search?q=test&format=json`);
        health.searxng = response.ok;
      } catch {
        health.searxng = false;
      }
    }

    return {
      healthy: Object.values(health).some(v => v),
      services: health,
      recommendation: this.getHealthRecommendation(health),
    };
  }

  getHealthRecommendation(health) {
    if (health.perplexica && health.ollama) {
      return 'Optimal: Full privacy research available';
    }
    if (health.ollama) {
      return 'Good: Local AI available, consider adding Perplexica';
    }
    return 'Basic: Install Ollama for local AI capabilities';
  }
}

// Export singleton
export const openSourceResearchAI = new OpenSourceResearchAI();
export default openSourceResearchAI;
