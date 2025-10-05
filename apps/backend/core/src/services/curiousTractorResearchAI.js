import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

/**
 * Curious Tractor Deep Research AI
 * Uses local Ollama + Perplexica + Claude for comprehensive business research
 */
export class CuriousTractorResearchAI {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.config = {
      ollama: {
        url: process.env.OLLAMA_URL || 'http://localhost:11434',
        model: 'llama3.1:8b',
      },
      perplexica: {
        url: process.env.PERPLEXICA_URL || 'http://localhost:3030',
      },
      searxng: {
        url: process.env.SEARXNG_URL || 'http://localhost:4000',
      },
    };
  }

  /**
   * Phase 1: Entity Structure Research
   */
  async researchEntityStructure() {
    console.log('🏢 Starting Entity Structure Research...');

    const queries = [
      'Australian entity structures for community land ownership and social enterprise - cooperative vs company vs trust comparison 2025',
      'Best legal structure for Aboriginal community business with land acquisition and R&D tax benefits Australia',
      'Hybrid entity models: B Corp, Community Benefit Company, cooperative structures for innovation projects',
      'Tax optimization strategies for community-owned technology businesses in Australia',
    ];

    const results = await Promise.all([
      this.deepResearch(queries[0], { tool: 'perplexica', depth: 'deep' }),
      this.deepResearch(queries[1], { tool: 'perplexica', depth: 'deep' }),
      this.deepResearch(queries[2], { tool: 'ollama', depth: 'standard' }),
      this.deepResearch(queries[3], { tool: 'claude', depth: 'fast' }),
    ]);

    // Synthesize findings with Claude
    const synthesis = await this.synthesizeFindings({
      topic: 'Entity Structure for A Curious Tractor',
      findings: results,
      focusAreas: [
        'Community land ownership',
        'R&D tax optimization',
        'Aboriginal governance integration',
        'Multi-project structure',
      ],
    });

    return {
      topic: 'entity_structure',
      rawResearch: results,
      synthesis,
      recommendations: synthesis.topOptions,
      nextSteps: synthesis.actionPlan,
    };
  }

  /**
   * Phase 2: R&D Tax Credit Research
   */
  async researchRnDTaxCredits() {
    console.log('💰 Starting R&D Tax Credit Research...');

    const queries = [
      'Australian R&D tax incentive 2025-2026: software development eligibility and claim process',
      'How to document software R&D activities for ATO compliance - AI, data sovereignty, community platforms',
      'R&D tax offset calculation examples for small businesses turnover under $20M',
      'State government innovation grants Queensland 2025 - technology, community, Indigenous business',
    ];

    const results = await Promise.all([
      this.deepResearch(queries[0], { tool: 'claude', depth: 'deep', includeSearch: true }),
      this.deepResearch(queries[1], { tool: 'perplexica', depth: 'deep' }),
      this.deepResearch(queries[2], { tool: 'claude', depth: 'standard', includeSearch: true }),
      this.deepResearch(queries[3], { tool: 'perplexica', depth: 'deep' }),
    ]);

    const synthesis = await this.synthesizeFindings({
      topic: 'R&D Tax Credits & Innovation Grants',
      findings: results,
      focusAreas: [
        'Software R&D eligibility',
        'AI/ML development qualifying activities',
        'Documentation requirements',
        'Tax offset calculations',
        'State grant opportunities',
      ],
    });

    return {
      topic: 'rnd_tax_credits',
      rawResearch: results,
      synthesis,
      estimatedBenefit: synthesis.financialProjections,
      complianceGuide: synthesis.documentationRequirements,
    };
  }

  /**
   * Phase 3: Triday Integration Research
   */
  async researchTridayIntegration() {
    console.log('📊 Starting Triday Integration Research...');

    const queries = [
      'Triday accounting software API documentation and integration examples',
      'Best AI tools for automated receipt categorization and R&D expense tracking Australia',
      'Xero vs MYOB vs Triday feature comparison for small community businesses',
      'Open source accounting automation tools compatible with Australian GST/BAS',
    ];

    const results = await Promise.all([
      this.deepResearch(queries[0], { tool: 'perplexica', depth: 'deep' }),
      this.deepResearch(queries[1], { tool: 'claude', depth: 'standard', includeSearch: true }),
      this.deepResearch(queries[2], { tool: 'ollama', depth: 'standard' }),
      this.deepResearch(queries[3], { tool: 'perplexica', depth: 'deep' }),
    ]);

    const synthesis = await this.synthesizeFindings({
      topic: 'Triday Integration & AI Bookkeeping',
      findings: results,
      focusAreas: [
        'Triday API capabilities',
        'AI receipt categorization',
        'R&D expense tracking',
        'GST/BAS automation',
        'Integration architecture',
      ],
    });

    return {
      topic: 'triday_integration',
      rawResearch: results,
      synthesis,
      technicalSpec: synthesis.integrationPlan,
      costBenefit: synthesis.financialAnalysis,
    };
  }

  /**
   * Phase 4: Innovation Economics Research
   */
  async researchInnovationEconomics() {
    console.log('🌱 Starting Innovation Economics Research...');

    const queries = [
      'Community wealth building through asset ownership - economic models and case studies',
      'Circular economy business models for community-owned enterprises',
      'Innovation commons and shared IP structures for community benefit',
      'Economic theory of planned obsolescence vs community asset longevity',
      'Indigenous economic development models Australia - land-based business integration',
    ];

    // Use multi-AI synthesis for deep economic research
    const results = await Promise.all([
      this.deepResearch(queries[0], { tool: 'claude', depth: 'deep', includeSearch: true }),
      this.deepResearch(queries[1], { tool: 'perplexica', depth: 'deep' }),
      this.deepResearch(queries[2], { tool: 'ollama', depth: 'deep' }),
      this.deepResearch(queries[3], { tool: 'claude', depth: 'deep', includeSearch: true }),
      this.deepResearch(queries[4], { tool: 'perplexica', depth: 'deep' }),
    ]);

    const synthesis = await this.synthesizeFindings({
      topic: 'Innovation Economics & Community Wealth',
      findings: results,
      focusAreas: [
        'Community ownership models',
        'Circular economy integration',
        'Obsolescence resistance',
        'Indigenous economic frameworks',
        'Value distribution mechanisms',
      ],
    });

    return {
      topic: 'innovation_economics',
      rawResearch: results,
      synthesis,
      economicModel: synthesis.proposedFramework,
      casStudies: synthesis.relevantExamples,
    };
  }

  /**
   * Phase 5: AI Assistant Architecture Research
   */
  async researchAIAssistantArchitecture() {
    console.log('🤖 Starting AI Assistant Architecture Research...');

    const queries = [
      'Privacy-preserving CRM systems with AI relationship intelligence',
      'Automated contact management with cultural protocols and consent',
      'Self-hosted AI assistant architectures using Ollama and local models',
      'LinkedIn and Gmail API integration for proactive relationship monitoring',
      'Low-cost always-on AI infrastructure using Raspberry Pi or edge devices',
    ];

    const results = await Promise.all([
      this.deepResearch(queries[0], { tool: 'perplexica', depth: 'deep' }),
      this.deepResearch(queries[1], { tool: 'claude', depth: 'standard', includeSearch: true }),
      this.deepResearch(queries[2], { tool: 'ollama', depth: 'deep' }),
      this.deepResearch(queries[3], { tool: 'perplexica', depth: 'standard' }),
      this.deepResearch(queries[4], { tool: 'ollama', depth: 'standard' }),
    ]);

    const synthesis = await this.synthesizeFindings({
      topic: 'Always-On AI Assistant Architecture',
      findings: results,
      focusAreas: [
        'Privacy and consent framework',
        'Cultural protocol integration',
        'Self-hosted infrastructure',
        'Relationship intelligence',
        'Cost optimization (<$100/month)',
      ],
    });

    return {
      topic: 'ai_assistant',
      rawResearch: results,
      synthesis,
      architecture: synthesis.technicalDesign,
      implementationRoadmap: synthesis.buildPlan,
    };
  }

  /**
   * Core Research Methods
   */

  async deepResearch(query, options = {}) {
    const { tool = 'perplexica', depth = 'deep', includeSearch = true } = options;

    try {
      switch (tool) {
        case 'perplexica':
          return await this.perplexicaResearch(query, depth);

        case 'ollama':
          return await this.ollamaResearch(query, depth);

        case 'claude':
          return await this.claudeResearch(query, includeSearch);

        default:
          throw new Error(`Unknown research tool: ${tool}`);
      }
    } catch (error) {
      console.error(`Research failed for query: ${query}`, error);
      return {
        query,
        error: error.message,
        fallback: await this.claudeResearch(query, false),
      };
    }
  }

  async perplexicaResearch(query, depth = 'deep') {
    console.log(`🔍 Perplexica researching: ${query.substring(0, 60)}...`);

    try {
      const response = await axios.post(`${this.config.perplexica.url}/api/search`, {
        query,
        search_mode: depth === 'deep' ? 'copilot' : 'speed',
        focus_mode: 'webSearch',
      }, {
        timeout: 120000, // 2 minutes for deep research
      });

      return {
        query,
        tool: 'perplexica',
        depth,
        answer: response.data.message || response.data.answer,
        sources: response.data.sources || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Perplexica research error:', error.message);
      // Fallback to Ollama if Perplexica fails
      return await this.ollamaResearch(query, depth);
    }
  }

  async ollamaResearch(query, depth = 'standard') {
    console.log(`🦙 Ollama researching: ${query.substring(0, 60)}...`);

    const systemPrompt = depth === 'deep'
      ? 'You are a deep research analyst. Provide comprehensive, well-structured analysis with specific examples, data points, and actionable recommendations. Include Australian context where relevant.'
      : 'You are a research assistant. Provide clear, concise analysis with key findings and recommendations.';

    try {
      const response = await axios.post(`${this.config.ollama.url}/api/generate`, {
        model: this.config.ollama.model,
        prompt: `${systemPrompt}\n\nResearch Query: ${query}\n\nProvide detailed research findings:`,
        stream: false,
      }, {
        timeout: 180000, // 3 minutes for deep thinking
      });

      return {
        query,
        tool: 'ollama',
        depth,
        answer: response.data.response,
        model: this.config.ollama.model,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Ollama research error:', error.message);
      throw new Error(`Ollama research failed: ${error.message}`);
    }
  }

  async claudeResearch(query, includeSearch = true) {
    console.log(`🧠 Claude researching: ${query.substring(0, 60)}...`);

    const systemPrompt = includeSearch
      ? 'You are an expert business researcher specializing in Australian regulations, Indigenous business models, and community enterprises. Provide detailed, actionable research with specific citations and examples.'
      : 'You are a business analysis expert. Synthesize knowledge to provide clear recommendations.';

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: query,
        }],
      });

      return {
        query,
        tool: 'claude',
        model: 'claude-sonnet-4-5',
        answer: response.content[0].text,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Claude research error:', error.message);
      throw new Error(`Claude research failed: ${error.message}`);
    }
  }

  async synthesizeFindings(params) {
    const { topic, findings, focusAreas } = params;

    console.log(`🔬 Synthesizing findings for: ${topic}`);

    const findingsText = findings.map((f, i) =>
      `## Finding ${i + 1}: ${f.query}\n\n${f.answer}\n\n---\n`
    ).join('\n');

    const synthesisPrompt = `You are synthesizing research findings for A Curious Tractor, a community-owned business focused on innovation, land ownership, and Aboriginal cultural protocols.

TOPIC: ${topic}

FOCUS AREAS:
${focusAreas.map(area => `- ${area}`).join('\n')}

RESEARCH FINDINGS:
${findingsText}

Provide a comprehensive synthesis that includes:

1. **Executive Summary** (3-4 paragraphs)
2. **Key Findings** (bullet points)
3. **Top 3 Recommendations** with rationale
4. **Implementation Action Plan** (prioritized steps)
5. **Risk Assessment** (potential challenges)
6. **Financial Projections** (if applicable)
7. **Next Steps** (immediate actions)

Format as markdown with clear sections.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        temperature: 0.5,
        messages: [{
          role: 'user',
          content: synthesisPrompt,
        }],
      });

      const synthesisText = response.content[0].text;

      return {
        topic,
        synthesis: synthesisText,
        timestamp: new Date().toISOString(),
        sourcesUsed: findings.length,
        focusAreas,
      };
    } catch (error) {
      console.error('Synthesis error:', error.message);
      return {
        topic,
        synthesis: 'Synthesis failed. See raw research findings.',
        error: error.message,
        rawFindings: findings,
      };
    }
  }

  /**
   * Master Research Orchestrator
   * Runs all 5 research phases and generates comprehensive report
   */
  async runFullResearchProgram() {
    console.log('🚀 Starting Full Research Program for A Curious Tractor...\n');

    const startTime = Date.now();
    const results = {};

    try {
      // Phase 1: Entity Structure (3-4 hours AI time)
      console.log('\n📋 PHASE 1: Entity Structure Research');
      results.entityStructure = await this.researchEntityStructure();
      console.log('✅ Phase 1 complete\n');

      // Phase 2: R&D Tax Credits (1-2 hours AI time)
      console.log('\n📋 PHASE 2: R&D Tax Credits Research');
      results.rndTaxCredits = await this.researchRnDTaxCredits();
      console.log('✅ Phase 2 complete\n');

      // Phase 3: Triday Integration (1-2 hours AI time)
      console.log('\n📋 PHASE 3: Triday Integration Research');
      results.tridayIntegration = await this.researchTridayIntegration();
      console.log('✅ Phase 3 complete\n');

      // Phase 4: Innovation Economics (2-3 hours AI time)
      console.log('\n📋 PHASE 4: Innovation Economics Research');
      results.innovationEconomics = await this.researchInnovationEconomics();
      console.log('✅ Phase 4 complete\n');

      // Phase 5: AI Assistant Architecture (2 hours AI time)
      console.log('\n📋 PHASE 5: AI Assistant Architecture Research');
      results.aiAssistant = await this.researchAIAssistantArchitecture();
      console.log('✅ Phase 5 complete\n');

      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

      return {
        success: true,
        researchProgram: 'A Curious Tractor - Comprehensive Business Setup',
        completedPhases: 5,
        duration: `${duration} minutes`,
        results,
        summary: await this.generateExecutiveSummary(results),
      };
    } catch (error) {
      console.error('Research program error:', error);
      return {
        success: false,
        error: error.message,
        partialResults: results,
      };
    }
  }

  async generateExecutiveSummary(allResults) {
    console.log('📊 Generating Executive Summary...');

    const summaryPrompt = `Create an executive summary for A Curious Tractor based on comprehensive research across 5 areas:

1. Entity Structure: ${JSON.stringify(allResults.entityStructure?.synthesis).substring(0, 500)}...
2. R&D Tax Credits: ${JSON.stringify(allResults.rndTaxCredits?.synthesis).substring(0, 500)}...
3. Triday Integration: ${JSON.stringify(allResults.tridayIntegration?.synthesis).substring(0, 500)}...
4. Innovation Economics: ${JSON.stringify(allResults.innovationEconomics?.synthesis).substring(0, 500)}...
5. AI Assistant: ${JSON.stringify(allResults.aiAssistant?.synthesis).substring(0, 500)}...

Provide:
- 2-paragraph executive summary
- Top 5 immediate action items (prioritized)
- Critical decisions needed
- Estimated timeline for setup (0-3 months, 3-6 months, 6-12 months)
- Estimated costs and potential savings/revenue`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0.4,
      messages: [{
        role: 'user',
        content: summaryPrompt,
      }],
    });

    return response.content[0].text;
  }
}

// Export singleton instance
export const curiousTractorAI = new CuriousTractorResearchAI();
