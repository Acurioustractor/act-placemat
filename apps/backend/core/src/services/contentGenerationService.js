/**
 * Content Generation Service
 *
 * Uses AI to generate rich content for Year in Review:
 * - Project story ContentBlocks (paragraphs, headings, quotes)
 * - Timeline entry descriptions
 * - Timeline idea suggestions
 */

import { MultiProviderAI } from './multiProviderAI.js';

// ACT brand voice and style guide
const ACT_VOICE_GUIDE = `
You are writing content for ACT (A Curious Tractor), a social enterprise that creates regenerative systems
and supports rural/regional communities in Australia. The voice should be:

- Authentic and grounded - connected to land, place, and people
- Thoughtful and reflective - not corporate or salesy
- Community-focused - celebrating collective achievements
- First Nations respectful - acknowledging Country and Traditional Owners
- Practical yet visionary - rooted in real work with bigger picture thinking
- Warm and personal - like telling stories around a campfire

Use plain language. Avoid jargon. Write like you're explaining to a curious friend.
`;

export class ContentGenerationService {
  constructor() {
    this.ai = new MultiProviderAI();
  }

  /**
   * Generate rich ContentBlocks for a project story page
   */
  async generateProjectStory(projectData, options = {}) {
    const {
      depth = 'standard', // 'brief' | 'standard' | 'detailed'
      includeQuote = true,
      focusAreas = [] // e.g., ['impact', 'community', 'learnings']
    } = options;

    const paragraphCount = depth === 'brief' ? 2 : depth === 'detailed' ? 6 : 4;

    const prompt = `
Generate content for a Year in Review project story page.

PROJECT INFORMATION:
- Name: ${projectData.name}
- Description: ${projectData.description || 'No description provided'}
- AI Summary: ${projectData.aiSummary || 'None'}
- Area/Theme: ${projectData.area || 'General'}
- Status: ${projectData.status || 'Active'}
- Location: ${projectData.place || 'Australia'}
- Themes/Tags: ${(projectData.themes || []).join(', ') || 'None specified'}
${focusAreas.length > 0 ? `- Focus on: ${focusAreas.join(', ')}` : ''}

TASK:
Create a compelling project story with ${paragraphCount} main paragraphs. Structure:

1. **Opening Hook** (1 paragraph): A vivid, engaging opening that draws the reader in.
   Start with the WHY - what problem or opportunity drove this work?

2. **The Journey** (${paragraphCount > 2 ? '1-2 paragraphs' : '1 paragraph'}): What happened?
   Key milestones, challenges overcome, people involved.

3. **Impact & Outcomes** (1 paragraph): What changed as a result?
   Be specific about impacts on community, environment, or systems.

${depth === 'detailed' ? `
4. **Learnings** (1 paragraph): What did we learn?
   Insights that could help others on similar journeys.

5. **Looking Forward** (1 paragraph): What's next?
   How does this work continue or evolve?
` : ''}

${includeQuote ? `
Also create ONE memorable quote that captures the essence of this project.
The quote should feel authentic - something a community member or team member might say.
` : ''}

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "subtitle": "A short, compelling subtitle for the project (10-15 words)",
  "contentBlocks": [
    {
      "type": "heading",
      "data": { "text": "Heading text", "level": 2 }
    },
    {
      "type": "paragraph",
      "data": { "text": "Paragraph content..." }
    },
    {
      "type": "quote",
      "data": { "quoteText": "Quote text...", "quoteAuthor": "Author name or role" }
    }
  ],
  "suggestedTags": ["tag1", "tag2"],
  "metaDescription": "SEO-friendly description in 155 characters or less"
}

IMPORTANT:
- Write in first person plural ("we", "our") where appropriate
- Be specific, not generic - use real details from the project info
- Each paragraph should be 2-4 sentences, not walls of text
- The quote should feel real and grounded, not corporate
`;

    try {
      const result = await this.ai.generateResponse(prompt, {
        systemPrompt: ACT_VOICE_GUIDE,
        maxTokens: 2500,
        temperature: 0.7,
        preferQuality: true
      });

      // Parse the JSON response
      const content = this.parseJsonResponse(result.response);

      // Add IDs to content blocks
      if (content.contentBlocks) {
        content.contentBlocks = content.contentBlocks.map((block, idx) => ({
          ...block,
          id: `gen-${Date.now()}-${idx}`
        }));
      }

      return {
        success: true,
        generated: content,
        provider: result.provider,
        model: result.model
      };

    } catch (error) {
      console.error('Project story generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate enriched description for a timeline entry
   */
  async generateTimelineDescription(entryData, options = {}) {
    const {
      maxLength = 280, // Character limit
      style = 'narrative' // 'narrative' | 'bullet' | 'impact'
    } = options;

    const prompt = `
Generate an enriched description for a Year in Review timeline entry.

ENTRY INFORMATION:
- Title: ${entryData.title}
- Current Description: ${entryData.description || 'None'}
- Source: ${entryData.source} (${entryData.type})
- Date: ${entryData.date}
- Tags: ${(entryData.tags || []).join(', ') || 'None'}
${entryData.metadata ? `- Metadata: ${JSON.stringify(entryData.metadata)}` : ''}

TASK:
Write a ${style} description that:
${style === 'narrative' ? '- Tells a mini-story in 2-3 sentences' : ''}
${style === 'bullet' ? '- Highlights 2-3 key points concisely' : ''}
${style === 'impact' ? '- Focuses on the impact and significance' : ''}
- Maximum ${maxLength} characters
- Adds context and meaning beyond just facts
- Feels engaging for a year-in-review timeline

OUTPUT FORMAT:
Return a JSON object:
{
  "description": "The enriched description text",
  "suggestedTitle": "Optional improved title if current one could be better",
  "suggestedTags": ["tag1", "tag2"]
}
`;

    try {
      const result = await this.ai.generateResponse(prompt, {
        systemPrompt: ACT_VOICE_GUIDE,
        maxTokens: 500,
        temperature: 0.6,
        preferSpeed: true // Faster for timeline entries
      });

      const content = this.parseJsonResponse(result.response);

      return {
        success: true,
        generated: content,
        provider: result.provider
      };

    } catch (error) {
      console.error('Timeline description generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate timeline idea suggestions based on gaps and patterns
   */
  async generateTimelineIdeas(existingEntries, notionData, options = {}) {
    const {
      count = 5,
      season = null, // Focus on specific season if provided
      type = null // Focus on specific type
    } = options;

    // Analyze existing entries
    const typeBreakdown = {};
    const monthBreakdown = {};

    for (const entry of existingEntries) {
      typeBreakdown[entry.type] = (typeBreakdown[entry.type] || 0) + 1;
      const month = new Date(entry.date).getMonth();
      monthBreakdown[month] = (monthBreakdown[month] || 0) + 1;
    }

    // Find gaps
    const gaps = [];
    for (let m = 0; m < 12; m++) {
      if (!monthBreakdown[m] || monthBreakdown[m] < 2) {
        gaps.push(`Month ${m + 1} has few entries`);
      }
    }

    const prompt = `
Suggest ${count} new timeline entries for a Year in Review.

CONTEXT:
- Organization: ACT (A Curious Tractor) - social enterprise in rural Australia
- Year: 2025

EXISTING ENTRIES ANALYSIS:
- Total entries: ${existingEntries.length}
- Types: ${JSON.stringify(typeBreakdown)}
- Coverage gaps: ${gaps.join('; ') || 'Good coverage'}
${season !== null ? `- Focus on season: ${['Planting (Jan-Mar)', 'Growing (Apr-Jun)', 'Harvesting (Jul-Sep)', 'Resting (Oct-Dec)'][season]}` : ''}
${type ? `- Focus on type: ${type}` : ''}

AVAILABLE NOTION DATA:
- Projects: ${(notionData.projects || []).map(p => p.name).slice(0, 10).join(', ')}
- Opportunities: ${(notionData.opportunities || []).map(o => o.name).slice(0, 5).join(', ')}
- People engaged: ${notionData.people?.length || 0}

TASK:
Suggest ${count} timeline entries that would:
1. Fill gaps in coverage (low months, missing types)
2. Highlight work that might be under-represented
3. Add human moments (team celebrations, lessons learned, pivotal conversations)
4. Include both achievements and challenges (authentic storytelling)

Entry types to consider: project, milestone, partnership, funding, launch, communication, social

OUTPUT FORMAT:
Return a JSON object:
{
  "suggestions": [
    {
      "title": "Entry title",
      "description": "Entry description",
      "type": "milestone|project|partnership|etc",
      "suggestedDate": "2025-MM-DD",
      "suggestedSeason": 0-3,
      "tags": ["tag1", "tag2"],
      "reasoning": "Why this entry would add value"
    }
  ]
}
`;

    try {
      const result = await this.ai.generateResponse(prompt, {
        systemPrompt: ACT_VOICE_GUIDE,
        maxTokens: 2000,
        temperature: 0.8, // More creative for idea generation
        preferQuality: true
      });

      const content = this.parseJsonResponse(result.response);

      return {
        success: true,
        suggestions: content.suggestions || [],
        analysis: {
          typeBreakdown,
          monthBreakdown,
          gaps
        },
        provider: result.provider
      };

    } catch (error) {
      console.error('Timeline idea generation failed:', error);
      return {
        success: false,
        error: error.message,
        analysis: {
          typeBreakdown,
          monthBreakdown,
          gaps
        }
      };
    }
  }

  /**
   * Bulk generate content for multiple projects
   */
  async bulkGenerateProjectStories(projects, options = {}) {
    const {
      concurrency = 2, // Process this many at once
      depth = 'standard'
    } = options;

    const results = [];
    const batches = [];

    // Split into batches
    for (let i = 0; i < projects.length; i += concurrency) {
      batches.push(projects.slice(i, i + concurrency));
    }

    // Process batches sequentially, items within batch in parallel
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(project =>
          this.generateProjectStory(project, { depth })
            .then(result => ({
              projectId: project.id,
              projectName: project.name,
              ...result
            }))
        )
      );
      results.push(...batchResults);

      // Brief pause between batches to avoid rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      total: projects.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Regenerate a specific section of content
   */
  async regenerateSection(existingContent, sectionType, context, options = {}) {
    const {
      guidance = '' // User guidance for regeneration
    } = options;

    const prompt = `
Regenerate the ${sectionType} section of this project content.

EXISTING CONTENT CONTEXT:
${JSON.stringify(existingContent, null, 2)}

PROJECT CONTEXT:
${JSON.stringify(context, null, 2)}

${guidance ? `USER GUIDANCE: ${guidance}` : ''}

TASK:
Create a new, improved version of the ${sectionType} section.
- Keep the same structure (heading/paragraph/quote as appropriate)
- Make it more engaging, specific, or impactful
- Ensure it flows with the surrounding content

OUTPUT FORMAT:
Return a JSON object with the new content block:
{
  "contentBlock": {
    "type": "${sectionType === 'quote' ? 'quote' : 'paragraph'}",
    "data": { ... }
  }
}
`;

    try {
      const result = await this.ai.generateResponse(prompt, {
        systemPrompt: ACT_VOICE_GUIDE,
        maxTokens: 500,
        temperature: 0.7
      });

      const content = this.parseJsonResponse(result.response);

      return {
        success: true,
        contentBlock: {
          ...content.contentBlock,
          id: `regen-${Date.now()}`
        },
        provider: result.provider
      };

    } catch (error) {
      console.error('Section regeneration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse JSON from AI response, handling common issues
   */
  parseJsonResponse(response) {
    // Try to extract JSON from the response
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object in response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('JSON parse error:', error.message);
      console.error('Raw response:', response.substring(0, 500));

      // Return a fallback structure
      return {
        error: 'Failed to parse AI response',
        rawResponse: response.substring(0, 1000)
      };
    }
  }

  /**
   * Get available AI providers status
   */
  async getProviderStatus() {
    return this.ai.getProviderStatus();
  }
}

export default ContentGenerationService;
