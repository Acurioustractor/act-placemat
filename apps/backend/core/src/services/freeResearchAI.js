/**
 * Free Research AI Service
 * Replaces Perplexity with free alternatives:
 * - Groq (FREE) for AI analysis 
 * - DuckDuckGo Instant Answer API (FREE) for search
 * - SerpAPI (100 searches/month free) as backup
 * - Tavily (1000 searches/month free) as premium option
 */

import fetch from 'node-fetch';

export class FreeResearchAI {
  constructor() {
    this.providers = {
      groq: process.env.GROQ_API_KEY,
      serpapi: process.env.SERPAPI_KEY, // 100 searches/month free
      tavily: process.env.TAVILY_API_KEY, // 1000 searches/month free
    };
    
    console.log('🔍 Free Research AI initialized with:', Object.keys(this.providers).filter(k => this.providers[k]).join(', '));
  }

  /**
   * Main research method - combines search + AI analysis
   */
  async research(query, options = {}) {
    try {
      // Step 1: Get search results
      const searchResults = await this.getSearchResults(query, options);
      
      // Step 2: Analyze with AI
      const analysis = await this.analyzeWithAI(query, searchResults, options);
      
      return {
        success: true,
        query,
        sources: searchResults.sources || [],
        analysis,
        provider: searchResults.provider,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Research failed:', error.message);
      return {
        success: false,
        error: error.message,
        query,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get search results from available providers
   */
  async getSearchResults(query, options = {}) {
    // Try Tavily first (best for research)
    if (this.providers.tavily) {
      try {
        return await this.tavilySearch(query, options);
      } catch (error) {
        console.warn('⚠️ Tavily failed, trying SerpAPI:', error.message);
      }
    }

    // Try SerpAPI second
    if (this.providers.serpapi) {
      try {
        return await this.serpApiSearch(query, options);
      } catch (error) {
        console.warn('⚠️ SerpAPI failed, trying DuckDuckGo:', error.message);
      }
    }

    // Fallback to DuckDuckGo (always free)
    return await this.duckDuckGoSearch(query, options);
  }

  /**
   * Tavily AI Search (1000 requests/month free)
   */
  async tavilySearch(query, options = {}) {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.providers.tavily}`
      },
      body: JSON.stringify({
        query,
        search_depth: options.depth || 'basic',
        include_answer: true,
        include_images: false,
        include_raw_content: false,
        max_results: options.maxResults || 5
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      provider: 'tavily',
      sources: data.results?.map(r => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score
      })) || [],
      answer: data.answer,
      raw: data
    };
  }

  /**
   * SerpAPI Search (100 searches/month free)
   */
  async serpApiSearch(query, options = {}) {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', this.providers.serpapi);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('num', options.maxResults || 5);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      provider: 'serpapi',
      sources: data.organic_results?.map(r => ({
        title: r.title,
        url: r.link,
        content: r.snippet,
        position: r.position
      })) || [],
      answerBox: data.answer_box,
      raw: data
    };
  }

  /**
   * DuckDuckGo Instant Answer API (FREE)
   */
  async duckDuckGoSearch(query, options = {}) {
    try {
      // DuckDuckGo Instant Answer API
      const url = new URL('https://api.duckduckgo.com/');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('no_html', '1');
      url.searchParams.set('skip_disambig', '1');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        provider: 'duckduckgo',
        sources: data.RelatedTopics?.slice(0, options.maxResults || 5).map(t => ({
          title: t.Text?.split(' - ')[0] || 'DuckDuckGo Result',
          url: t.FirstURL || '',
          content: t.Text || '',
          icon: t.Icon?.URL || ''
        })) || [],
        abstract: data.Abstract,
        definition: data.Definition,
        answer: data.Answer,
        raw: data
      };
    } catch (error) {
      // Fallback: return basic search info
      return {
        provider: 'fallback',
        sources: [{
          title: 'Search Query',
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          content: `Search results for: "${query}". Use the provided link to search manually.`,
        }],
        note: 'Limited search results available. Please use the provided link for comprehensive results.'
      };
    }
  }

  /**
   * Analyze search results with AI (using Groq for speed)
   */
  async analyzeWithAI(query, searchResults, options = {}) {
    if (!this.providers.groq) {
      return this.createBasicAnalysis(query, searchResults);
    }

    try {
      const systemPrompt = `You are a research analyst. Analyze the search results and provide a comprehensive, well-structured response to the user's query.

Focus on:
1. Direct answer to the query
2. Key insights from the search results
3. Supporting evidence and sources
4. Practical recommendations if applicable

Be concise but thorough. Cite sources when possible.`;

      const searchContent = searchResults.sources?.map(s => 
        `**${s.title}**\nURL: ${s.url}\nContent: ${s.content}`
      ).join('\n\n') || 'No search results available';

      const userPrompt = `Query: "${query}"

Search Results:
${searchContent}

${searchResults.answer ? `Answer from search: ${searchResults.answer}` : ''}
${searchResults.abstract ? `Abstract: ${searchResults.abstract}` : ''}

Please provide a comprehensive analysis of these results to answer the user's query.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.providers.groq}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || 'No analysis available',
        model: 'llama-3.3-70b-versatile',
        provider: 'groq',
        tokens: data.usage
      };

    } catch (error) {
      console.warn('⚠️ AI analysis failed, using basic analysis:', error.message);
      return this.createBasicAnalysis(query, searchResults);
    }
  }

  /**
   * Create basic analysis when AI is not available
   */
  createBasicAnalysis(query, searchResults) {
    const sources = searchResults.sources || [];
    const topResults = sources.slice(0, 3);
    
    let analysis = `Research Results for "${query}":\n\n`;
    
    if (searchResults.answer) {
      analysis += `**Quick Answer:** ${searchResults.answer}\n\n`;
    }
    
    if (searchResults.abstract) {
      analysis += `**Overview:** ${searchResults.abstract}\n\n`;
    }
    
    if (topResults.length > 0) {
      analysis += `**Top Sources:**\n`;
      topResults.forEach((source, i) => {
        analysis += `${i + 1}. **${source.title}**\n   ${source.content}\n   Source: ${source.url}\n\n`;
      });
    }
    
    analysis += `*This analysis was generated from ${sources.length} search results using ${searchResults.provider}.*`;
    
    return {
      content: analysis,
      provider: 'basic',
      sources: sources.length
    };
  }

  /**
   * Check health of all providers
   */
  async checkHealth() {
    const health = {
      groq: !!this.providers.groq,
      serpapi: !!this.providers.serpapi,
      tavily: !!this.providers.tavily,
      duckduckgo: true, // Always available
    };

    // Test Groq if available
    if (health.groq) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.providers.groq}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5
          })
        });
        health.groq = response.ok;
      } catch {
        health.groq = false;
      }
    }

    // Test Tavily if available
    if (health.tavily) {
      try {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.providers.tavily}`
          },
          body: JSON.stringify({
            query: 'test',
            max_results: 1
          })
        });
        health.tavily = response.ok;
      } catch {
        health.tavily = false;
      }
    }

    return {
      healthy: Object.values(health).some(h => h),
      providers: health,
      primary: health.tavily ? 'tavily' : health.serpapi ? 'serpapi' : 'duckduckgo',
      ai: health.groq ? 'groq' : 'basic'
    };
  }
}

// Export singleton instance
export const freeResearchAI = new FreeResearchAI();
export default freeResearchAI;