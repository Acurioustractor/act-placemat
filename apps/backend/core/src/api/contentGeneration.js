/**
 * Content Generation API Routes
 *
 * AI-powered content generation for Year in Review
 */

import express from 'express';
import ContentGenerationService from '../services/contentGenerationService.js';
import { createSupabaseClient } from '../config/supabase.js';

const router = express.Router();

// Singleton instance
let contentGenerator = null;

function getContentGenerator() {
  if (!contentGenerator) {
    contentGenerator = new ContentGenerationService();
  }
  return contentGenerator;
}

function getSupabase() {
  return createSupabaseClient();
}

/**
 * GET /api/content-generation/status
 * Check AI provider availability
 */
router.get('/status', async (req, res) => {
  try {
    const generator = getContentGenerator();
    const status = await generator.getProviderStatus();

    res.json({
      success: true,
      providers: status,
      available: Object.values(status).some(p => p.available)
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    res.status(500).json({ error: 'Failed to check AI status', details: error.message });
  }
});

/**
 * POST /api/content-generation/project-story
 * Generate content for a single project
 */
router.post('/project-story', async (req, res) => {
  try {
    const {
      projectId,      // Notion project ID or timeline entry ID
      projectData,    // Or provide project data directly
      depth = 'standard',
      includeQuote = true,
      focusAreas = []
    } = req.body;

    let project = projectData;

    // If projectId provided, fetch from Notion data
    if (projectId && !projectData) {
      // Try to find in timeline entries or fetch from Notion
      const supabase = getSupabase();

      // First check if it's a review_project
      const { data: reviewProject } = await supabase
        .from('review_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (reviewProject) {
        project = {
          name: reviewProject.title,
          description: reviewProject.subtitle,
          area: null,
          status: reviewProject.is_published ? 'Published' : 'Draft',
          themes: []
        };
      }
    }

    if (!project || !project.name) {
      return res.status(400).json({
        error: 'Project data required',
        help: 'Provide either projectId or projectData with at least a name'
      });
    }

    const generator = getContentGenerator();
    const result = await generator.generateProjectStory(project, {
      depth,
      includeQuote,
      focusAreas
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Generation failed',
        details: result.error
      });
    }

    res.json({
      success: true,
      projectName: project.name,
      generated: result.generated,
      ai: {
        provider: result.provider,
        model: result.model
      }
    });

  } catch (error) {
    console.error('Error generating project story:', error);
    res.status(500).json({ error: 'Failed to generate content', details: error.message });
  }
});

/**
 * POST /api/content-generation/timeline-description
 * Generate enriched description for a timeline entry
 */
router.post('/timeline-description', async (req, res) => {
  try {
    const {
      entryData,
      maxLength = 280,
      style = 'narrative'
    } = req.body;

    if (!entryData || !entryData.title) {
      return res.status(400).json({
        error: 'Entry data required',
        help: 'Provide entryData with at least title'
      });
    }

    const generator = getContentGenerator();
    const result = await generator.generateTimelineDescription(entryData, {
      maxLength,
      style
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Generation failed',
        details: result.error
      });
    }

    res.json({
      success: true,
      entryTitle: entryData.title,
      generated: result.generated,
      ai: { provider: result.provider }
    });

  } catch (error) {
    console.error('Error generating timeline description:', error);
    res.status(500).json({ error: 'Failed to generate description', details: error.message });
  }
});

/**
 * POST /api/content-generation/timeline-ideas
 * Generate suggestions for new timeline entries
 */
router.post('/timeline-ideas', async (req, res) => {
  try {
    const {
      year = 2025,
      existingEntries = [],
      notionData = {},
      count = 5,
      season = null,
      type = null
    } = req.body;

    const generator = getContentGenerator();
    const result = await generator.generateTimelineIdeas(
      existingEntries,
      notionData,
      { count, season, type }
    );

    res.json({
      success: result.success,
      year,
      suggestions: result.suggestions || [],
      analysis: result.analysis,
      ai: result.success ? { provider: result.provider } : undefined,
      error: result.error
    });

  } catch (error) {
    console.error('Error generating timeline ideas:', error);
    res.status(500).json({ error: 'Failed to generate ideas', details: error.message });
  }
});

/**
 * POST /api/content-generation/bulk-projects
 * Generate content for multiple projects
 */
router.post('/bulk-projects', async (req, res) => {
  try {
    const {
      projects,
      depth = 'standard',
      concurrency = 2
    } = req.body;

    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({
        error: 'Projects array required',
        help: 'Provide array of project objects with at least name field'
      });
    }

    // Limit to reasonable batch size
    const limitedProjects = projects.slice(0, 10);
    if (projects.length > 10) {
      console.log(`Limiting bulk generation to 10 projects (requested ${projects.length})`);
    }

    const generator = getContentGenerator();
    const result = await generator.bulkGenerateProjectStories(limitedProjects, {
      depth,
      concurrency
    });

    res.json({
      success: true,
      ...result,
      limitApplied: projects.length > 10
    });

  } catch (error) {
    console.error('Error in bulk generation:', error);
    res.status(500).json({ error: 'Bulk generation failed', details: error.message });
  }
});

/**
 * POST /api/content-generation/regenerate-section
 * Regenerate a specific section of content
 */
router.post('/regenerate-section', async (req, res) => {
  try {
    const {
      existingContent,
      sectionType,
      context,
      guidance = ''
    } = req.body;

    if (!sectionType || !context) {
      return res.status(400).json({
        error: 'Section type and context required'
      });
    }

    const generator = getContentGenerator();
    const result = await generator.regenerateSection(
      existingContent,
      sectionType,
      context,
      { guidance }
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Regeneration failed',
        details: result.error
      });
    }

    res.json({
      success: true,
      contentBlock: result.contentBlock,
      ai: { provider: result.provider }
    });

  } catch (error) {
    console.error('Error regenerating section:', error);
    res.status(500).json({ error: 'Failed to regenerate section', details: error.message });
  }
});

/**
 * POST /api/content-generation/apply-to-project/:slug
 * Generate and directly apply content to a review project
 */
router.post('/apply-to-project/:year/:slug', async (req, res) => {
  try {
    const { year, slug } = req.params;
    const {
      projectData,
      depth = 'standard',
      includeQuote = true,
      focusAreas = [],
      autoSave = false // If true, save directly to database
    } = req.body;

    const supabase = getSupabase();

    // Get existing project
    const { data: existingProject, error: fetchError } = await supabase
      .from('review_projects')
      .select('*')
      .eq('year', parseInt(year))
      .eq('slug', slug)
      .single();

    if (fetchError || !existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Merge with provided data for better generation
    const mergedData = {
      name: existingProject.title,
      description: existingProject.subtitle,
      ...projectData
    };

    const generator = getContentGenerator();
    const result = await generator.generateProjectStory(mergedData, {
      depth,
      includeQuote,
      focusAreas
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Generation failed',
        details: result.error
      });
    }

    // If autoSave, apply to database
    if (autoSave) {
      const updates = {};

      if (result.generated.subtitle) {
        updates.subtitle = result.generated.subtitle;
      }

      if (result.generated.contentBlocks) {
        // Merge with existing or replace
        updates.content_blocks = result.generated.contentBlocks;
      }

      if (result.generated.metaDescription) {
        updates.meta_description = result.generated.metaDescription;
      }

      const { data: updatedProject, error: updateError } = await supabase
        .from('review_projects')
        .update(updates)
        .eq('id', existingProject.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to save generated content:', updateError);
        // Still return the generated content
      }

      return res.json({
        success: true,
        saved: !updateError,
        project: updatedProject || existingProject,
        generated: result.generated,
        ai: { provider: result.provider, model: result.model }
      });
    }

    // Return for preview without saving
    res.json({
      success: true,
      saved: false,
      project: existingProject,
      generated: result.generated,
      ai: { provider: result.provider, model: result.model }
    });

  } catch (error) {
    console.error('Error applying content to project:', error);
    res.status(500).json({ error: 'Failed to apply content', details: error.message });
  }
});

/**
 * POST /api/content-generation/from-notion/:projectId
 * Generate content directly from a Notion project
 */
router.post('/from-notion/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      depth = 'standard',
      includeQuote = true,
      focusAreas = []
    } = req.body;

    // Fetch project from Notion
    const { Client } = await import('@notionhq/client');
    const notion = new Client({
      auth: process.env.NOTION_TOKEN || process.env.NOTION_INTEGRATION_TOKEN
    });

    const page = await notion.pages.retrieve({ page_id: projectId });

    // Parse Notion properties
    const props = page.properties || {};
    const getNotionText = (prop) => {
      if (!prop) return '';
      if (prop.title) return prop.title.map(t => t.plain_text).join('');
      if (prop.rich_text) return prop.rich_text.map(t => t.plain_text).join('');
      return '';
    };
    const getNotionSelect = (prop) => prop?.select?.name || '';
    const getNotionMultiSelect = (prop) => (prop?.multi_select || []).map(s => s.name);

    const projectData = {
      id: page.id,
      name: getNotionText(props.Name || props.name || props.Title),
      description: getNotionText(props.Description || props.description),
      aiSummary: getNotionText(props['AI Summary'] || props.aiSummary),
      area: getNotionSelect(props.Area || props.area),
      status: getNotionSelect(props.Status || props.status),
      themes: getNotionMultiSelect(props.Themes || props.themes),
      place: getNotionText(props.Place || props.place),
      url: page.url
    };

    if (!projectData.name) {
      return res.status(400).json({
        error: 'Could not extract project name from Notion page'
      });
    }

    const generator = getContentGenerator();
    const result = await generator.generateProjectStory(projectData, {
      depth,
      includeQuote,
      focusAreas
    });

    res.json({
      success: result.success,
      notionProject: projectData,
      generated: result.generated,
      ai: result.success ? { provider: result.provider, model: result.model } : undefined,
      error: result.error
    });

  } catch (error) {
    console.error('Error generating from Notion:', error);

    if (error.code === 'object_not_found') {
      return res.status(404).json({
        error: 'Notion page not found',
        details: 'Check the project ID and ensure the integration has access'
      });
    }

    res.status(500).json({ error: 'Failed to generate from Notion', details: error.message });
  }
});

export default router;
