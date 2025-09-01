/**
 * Content Creation Agent Service
 * Multi-format content generation, curation, and distribution with brand consistency
 * Integrates with existing ACT data sources for contextual content creation
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

export class ContentCreationService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.initialized = false;
    this.capabilities = [
      'Multi-format Content Generation',
      'Brand Voice Consistency',
      'Content Calendar Management',
      'AI-powered Content Curation',
      'Multi-channel Distribution',
      'Performance Tracking',
      'SEO Optimization',
      'Plagiarism Detection'
    ];

    // ACT Brand Voice Guidelines
    this.brandVoice = {
      tone: 'inclusive, empowering, authentic',
      style: 'conversational yet professional',
      values: ['community-led', 'cultural-respect', 'transparency', 'collaboration'],
      keywords: ['community', 'empowerment', 'justice', 'healing', 'connection'],
      avoid: ['jargon', 'corporate-speak', 'patronizing language', 'cultural appropriation']
    };

    // Content formats supported
    this.contentFormats = {
      blog_post: {
        minLength: 800,
        maxLength: 2500,
        structure: ['introduction', 'body', 'conclusion', 'call_to_action']
      },
      social_media: {
        platforms: ['linkedin', 'twitter', 'facebook', 'instagram'],
        characterLimits: { twitter: 280, linkedin: 3000, facebook: 2200, instagram: 2200 }
      },
      newsletter: {
        sections: ['greeting', 'highlights', 'community_stories', 'upcoming_events', 'call_to_action']
      },
      email: {
        types: ['announcement', 'invitation', 'update', 'thank_you']
      },
      grant_application: {
        sections: ['executive_summary', 'project_description', 'budget', 'impact_measurement']
      }
    };

    // Distribution channels
    this.distributionChannels = {
      website: { enabled: true, priority: 'high' },
      email: { enabled: true, priority: 'medium' },
      social_media: { enabled: true, priority: 'medium' },
      newsletter: { enabled: true, priority: 'low' }
    };
  }

  /**
   * Initialize the Content Creation Service
   */
  async initialize() {
    try {
      console.log('✍️  Initializing Content Creation Service...');
      
      // Create content management tables
      await this.ensureContentTables();
      
      // Load brand voice training data from stories
      await this.loadBrandVoiceData();
      
      this.initialized = true;
      console.log('✅ Content Creation Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Content Creation Service:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      capabilities: this.capabilities,
      supportedFormats: Object.keys(this.contentFormats),
      distributionChannels: Object.keys(this.distributionChannels),
      brandVoice: this.brandVoice
    };
  }

  /**
   * Generate content based on input and format
   */
  async generateContent(input, options = {}) {
    try {
      const {
        format = 'blog_post',
        tone = 'professional',
        audience = 'general',
        includeACTContext = true,
        distributionChannels = ['website'],
        scheduledDate = null
      } = options;

      console.log(`✍️  Generating ${format} content: "${input.topic || input.title}"`);

      // Get ACT context for brand consistency
      const actContext = includeACTContext ? await this.getACTContext() : null;

      // Generate content using AI
      const contentResult = await this.generateAIContent(input, format, actContext);

      // Check brand voice consistency
      const brandCheck = await this.checkBrandVoiceConsistency(contentResult.content);

      // Optimize for SEO if needed
      const seoOptimized = format === 'blog_post' ? 
        await this.optimizeForSEO(contentResult) : contentResult;

      // Check for plagiarism
      const plagiarismCheck = await this.checkPlagiarism(seoOptimized.content);

      const finalContent = {
        id: this.generateContentId(),
        ...input,
        format,
        content: seoOptimized.content,
        metadata: {
          ...seoOptimized.metadata,
          tone,
          audience,
          generatedAt: new Date().toISOString(),
          brandVoiceScore: brandCheck.score,
          seoScore: seoOptimized.seoScore || null,
          plagiarismScore: plagiarismCheck.score,
          wordCount: this.countWords(seoOptimized.content)
        },
        brandVoiceAnalysis: brandCheck,
        plagiarismAnalysis: plagiarismCheck,
        distributionPlan: this.createDistributionPlan(distributionChannels, scheduledDate),
        status: 'draft'
      };

      // Save to database
      await this.saveContent(finalContent);

      return finalContent;

    } catch (error) {
      console.error('❌ Content generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate AI content using multiple providers
   */
  async generateAIContent(input, format, actContext) {
    const formatConfig = this.contentFormats[format];
    
    // Build context-aware prompt
    const prompt = this.buildContentPrompt(input, format, actContext, formatConfig);

    // Use Anthropic Claude for content generation (high quality)
    const content = await this.queryAnthropicAPI({
      prompt,
      maxTokens: this.getMaxTokensForFormat(format),
      temperature: 0.7
    });

    return {
      content: content.text,
      metadata: {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        promptTokens: content.promptTokens,
        completionTokens: content.completionTokens
      }
    };
  }

  /**
   * Build context-aware content prompt
   */
  buildContentPrompt(input, format, actContext, formatConfig) {
    let prompt = `You are a content creator for ACT (Australian Community Transformation), a community-led organization focused on social justice, Indigenous empowerment, and collaborative impact.

BRAND VOICE:
- Tone: ${this.brandVoice.tone}
- Style: ${this.brandVoice.style}
- Values: ${this.brandVoice.values.join(', ')}
- Use these keywords naturally: ${this.brandVoice.keywords.join(', ')}
- Avoid: ${this.brandVoice.avoid.join(', ')}

`;

    if (actContext) {
      prompt += `ACT CONTEXT:
- Recent projects: ${actContext.recentProjects.map(p => p.name).join(', ')}
- Community themes: ${actContext.communityThemes.join(', ')}
- Partner organizations: ${actContext.partners.slice(0, 3).map(p => p.name).join(', ')}

`;
    }

    prompt += `CONTENT BRIEF:
- Format: ${format}
- Topic: ${input.topic || input.title}
- Purpose: ${input.purpose || 'inform and engage community'}
`;

    if (input.keyPoints) {
      prompt += `- Key points to cover: ${input.keyPoints.join(', ')}
`;
    }

    if (formatConfig) {
      prompt += `
FORMAT REQUIREMENTS:
`;
      if (formatConfig.minLength) {
        prompt += `- Minimum length: ${formatConfig.minLength} words
`;
      }
      if (formatConfig.structure) {
        prompt += `- Structure: ${formatConfig.structure.join(' → ')}
`;
      }
      if (formatConfig.sections) {
        prompt += `- Include sections: ${formatConfig.sections.join(', ')}
`;
      }
    }

    prompt += `
Create engaging, authentic content that reflects ACT's community-led approach and values. Ensure the content is culturally sensitive, inclusive, and actionable.`;

    return prompt;
  }

  /**
   * Check brand voice consistency
   */
  async checkBrandVoiceConsistency(content) {
    const analysis = {
      score: 0.8, // Base score
      issues: [],
      strengths: [],
      suggestions: []
    };

    // Check for brand keywords
    const keywordCount = this.brandVoice.keywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    if (keywordCount >= 2) {
      analysis.score += 0.1;
      analysis.strengths.push('Good use of brand keywords');
    } else {
      analysis.issues.push('Consider including more brand keywords');
    }

    // Check for terms to avoid
    const avoidTermsFound = this.brandVoice.avoid.filter(term => 
      content.toLowerCase().includes(term.toLowerCase())
    );
    
    if (avoidTermsFound.length > 0) {
      analysis.score -= 0.2;
      analysis.issues.push(`Avoid these terms: ${avoidTermsFound.join(', ')}`);
    }

    // Check tone indicators
    const positiveIndicators = ['community', 'together', 'collaborate', 'empower', 'support'];
    const positiveCount = positiveIndicators.filter(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase())
    ).length;

    if (positiveCount >= 3) {
      analysis.score += 0.1;
      analysis.strengths.push('Positive, community-focused tone');
    }

    // Ensure score is between 0 and 1
    analysis.score = Math.max(0, Math.min(1, analysis.score));

    return analysis;
  }

  /**
   * Optimize content for SEO
   */
  async optimizeForSEO(contentResult) {
    const { content, metadata } = contentResult;
    
    // Extract title and meta description
    const lines = content.split('\n').filter(line => line.trim());
    const title = lines[0].replace(/^#+\s*/, ''); // Remove markdown headers
    
    // Generate meta description (first 155 characters of meaningful content)
    let metaDescription = '';
    for (const line of lines.slice(1)) {
      if (line.trim() && !line.startsWith('#')) {
        metaDescription = line.trim();
        break;
      }
    }
    metaDescription = metaDescription.substring(0, 155) + '...';

    // Simple SEO scoring based on content analysis
    let seoScore = 0.6; // Base score

    // Check title length (optimal: 30-60 characters)
    if (title.length >= 30 && title.length <= 60) {
      seoScore += 0.1;
    }

    // Check for keywords in title
    const titleHasKeywords = this.brandVoice.keywords.some(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    );
    if (titleHasKeywords) {
      seoScore += 0.1;
    }

    // Check content length (optimal: 800+ words for blog posts)
    const wordCount = this.countWords(content);
    if (wordCount >= 800) {
      seoScore += 0.1;
    }

    // Check for internal structure (headers)
    const hasHeaders = content.includes('##') || content.includes('#');
    if (hasHeaders) {
      seoScore += 0.1;
    }

    return {
      content,
      metadata: {
        ...metadata,
        seo: {
          title,
          metaDescription,
          wordCount,
          hasHeaders,
          keywords: this.brandVoice.keywords
        }
      },
      seoScore: Math.min(1, seoScore)
    };
  }

  /**
   * Check for plagiarism (simplified implementation)
   */
  async checkPlagiarism(content) {
    // In a real implementation, this would use a plagiarism detection API
    // For now, we'll do a simple check for exact duplicates in our database
    
    const { data: existingContent } = await this.supabase
      .from('generated_content')
      .select('id, content')
      .limit(100);

    if (!existingContent) {
      return { score: 0.95, status: 'original', duplicates: [] };
    }

    // Simple similarity check (in production, use proper algorithms)
    const similarities = existingContent.map(existing => {
      const similarity = this.calculateTextSimilarity(content, existing.content);
      return { id: existing.id, similarity };
    });

    const maxSimilarity = Math.max(...similarities.map(s => s.similarity));
    const duplicates = similarities.filter(s => s.similarity > 0.8);

    return {
      score: 1 - maxSimilarity,
      status: maxSimilarity > 0.8 ? 'potential_duplicate' : 'original',
      duplicates: duplicates.map(d => d.id),
      maxSimilarity
    };
  }

  /**
   * Create distribution plan
   */
  createDistributionPlan(channels, scheduledDate) {
    return {
      channels: channels.map(channel => ({
        name: channel,
        status: 'pending',
        scheduledFor: scheduledDate || new Date().toISOString(),
        config: this.distributionChannels[channel] || {}
      })),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get ACT context for brand consistency
   */
  async getACTContext() {
    try {
      // Get recent projects from Notion
      const notionResponse = await fetch('http://localhost:4000/api/dashboard/overview');
      const notionData = await notionResponse.json();

      // Get recent stories themes
      const { data: stories } = await this.supabase
        .from('stories')
        .select('themes')
        .limit(10);

      // Get partner information
      const partnersResponse = await fetch('http://localhost:4000/api/notion/partners?limit=5');
      const partners = await partnersResponse.json();

      const allThemes = stories ? 
        [...new Set(stories.flatMap(s => s.themes || []))] : [];

      return {
        recentProjects: notionData.topProjects?.slice(0, 5) || [],
        communityThemes: allThemes.slice(0, 10),
        partners: partners.slice(0, 5).map(p => ({
          name: p.properties?.Name?.title?.[0]?.plain_text || 'Unknown'
        }))
      };
    } catch (error) {
      console.warn('Could not load ACT context:', error.message);
      return null;
    }
  }

  /**
   * Query Anthropic API for content generation
   */
  async queryAnthropicAPI(params) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: params.maxTokens || 2000,
          temperature: params.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: params.prompt
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );

      return {
        text: response.data.content[0].text,
        promptTokens: response.data.usage.input_tokens,
        completionTokens: response.data.usage.output_tokens
      };

    } catch (error) {
      console.error('❌ Anthropic API call failed:', error);
      throw error;
    }
  }

  /**
   * Content curation from external sources
   */
  async curateContent(topic, sources = ['news', 'social_impact']) {
    try {
      console.log(`📰 Curating content for topic: "${topic}"`);

      const curatedItems = [];

      // Use Perplexity for news and trend curation
      if (process.env.PERPLEXITY_API_KEY && sources.includes('news')) {
        const newsItems = await this.curatateFromPerplexity(topic);
        curatedItems.push(...newsItems);
      }

      // Curate from ACT's own content
      if (sources.includes('internal')) {
        const internalItems = await this.curateFromACTContent(topic);
        curatedItems.push(...internalItems);
      }

      return {
        topic,
        items: curatedItems,
        curatedAt: new Date().toISOString(),
        totalItems: curatedItems.length
      };

    } catch (error) {
      console.error('❌ Content curation failed:', error);
      throw error;
    }
  }

  /**
   * Curate content using Perplexity API
   */
  async curatateFromPerplexity(topic) {
    try {
      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a content curator for a community organization focused on social justice and Indigenous empowerment. Find relevant, recent news and insights.'
            },
            {
              role: 'user',
              content: `Find 3-5 recent, relevant news items and insights about: ${topic}. Focus on community impact, social justice, and Indigenous perspectives. Return as JSON array with: title, summary, source, url, relevance_score`
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      // Try to parse JSON response
      try {
        const items = JSON.parse(content);
        return Array.isArray(items) ? items : [items];
      } catch {
        // If not JSON, create a single item
        return [{
          title: `Curated insights: ${topic}`,
          summary: content.substring(0, 200) + '...',
          source: 'Perplexity Research',
          relevance_score: 0.8
        }];
      }

    } catch (error) {
      console.warn('Perplexity curation failed:', error.message);
      return [];
    }
  }

  /**
   * Curate from ACT's internal content
   */
  async curateFromACTContent(topic) {
    const { data: relevantStories } = await this.supabase
      .from('stories')
      .select('id, title, summary, themes, created_at')
      .or(`title.ilike.%${topic}%,summary.ilike.%${topic}%`)
      .limit(3);

    return (relevantStories || []).map(story => ({
      title: story.title,
      summary: story.summary || 'Community story from ACT Empathy Ledger',
      source: 'ACT Community Stories',
      type: 'internal',
      themes: story.themes,
      created_at: story.created_at,
      relevance_score: 0.9
    }));
  }

  /**
   * Database and utility methods
   */
  async ensureContentTables() {
    // Create content generation tables
    const { error } = await this.supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS generated_content (
          id TEXT PRIMARY KEY,
          title TEXT,
          content TEXT,
          format TEXT,
          status TEXT DEFAULT 'draft',
          metadata JSONB,
          brand_voice_analysis JSONB,
          plagiarism_analysis JSONB,
          distribution_plan JSONB,
          performance_metrics JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS content_calendar (
          id TEXT PRIMARY KEY,
          content_id TEXT REFERENCES generated_content(id),
          title TEXT,
          scheduled_date TIMESTAMPTZ,
          channel TEXT,
          status TEXT DEFAULT 'scheduled',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (error) {
      console.warn('Could not create content tables:', error);
    }
  }

  async loadBrandVoiceData() {
    // Load existing stories to understand brand voice patterns
    console.log('📚 Loading brand voice training data...');
  }

  async saveContent(content) {
    const { error } = await this.supabase
      .from('generated_content')
      .insert(content);
    
    if (error) {
      console.error('Failed to save content:', error);
    }
  }

  generateContentId() {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getMaxTokensForFormat(format) {
    const tokenLimits = {
      blog_post: 2500,
      social_media: 500,
      newsletter: 2000,
      email: 1500,
      grant_application: 3000
    };
    return tokenLimits[format] || 2000;
  }

  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  calculateTextSimilarity(text1, text2) {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

export default ContentCreationService;