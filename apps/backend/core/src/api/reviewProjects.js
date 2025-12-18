/**
 * Review Projects API Routes
 *
 * CRUD operations for Year in Review project pages with rich content
 */

import express from 'express';
import { createSupabaseClient } from '../config/supabase.js';

const router = express.Router();

/**
 * Helper to get Supabase client
 */
function getSupabase() {
  return createSupabaseClient();
}

/**
 * Helper to generate URL-friendly slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

/**
 * Helper to parse video URL and extract platform and ID
 */
function parseVideoUrl(url) {
  if (!url) return null;

  // Loom
  const loomMatch = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return {
      platform: 'loom',
      videoId: loomMatch[2],
      embedUrl: `https://www.loom.com/embed/${loomMatch[2]}`
    };
  }

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return {
      platform: 'youtube',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      platform: 'vimeo',
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }

  // Direct video URL
  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return {
      platform: 'direct',
      videoId: url,
      embedUrl: url
    };
  }

  return null;
}

/**
 * GET /api/year-in-review/:year/projects
 * List all published review projects for a year
 */
router.get('/:year/projects', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { includeUnpublished } = req.query;

    const supabase = getSupabase();

    let query = supabase
      .from('review_projects')
      .select(`
        id,
        year,
        timeline_entry_id,
        slug,
        title,
        subtitle,
        hero_image_id,
        hero_video_url,
        hero_video_type,
        is_featured,
        featured_order,
        is_published,
        published_at,
        created_at,
        updated_at
      `)
      .eq('year', year)
      .order('featured_order', { ascending: true, nullsLast: true })
      .order('created_at', { ascending: false });

    // Only show published by default (unless admin mode)
    if (!includeUnpublished) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch hero images for each project
    const projectsWithMedia = await Promise.all(
      (data || []).map(async (project) => {
        let heroImageUrl = null;
        if (project.hero_image_id) {
          const { data: media } = await supabase
            .from('media_items')
            .select('file_url, thumbnail_url')
            .eq('id', project.hero_image_id)
            .single();
          heroImageUrl = media?.file_url || media?.thumbnail_url;
        }
        return {
          ...project,
          heroImageUrl
        };
      })
    );

    res.json({
      success: true,
      year,
      count: projectsWithMedia.length,
      projects: projectsWithMedia
    });
  } catch (error) {
    console.error('Error fetching review projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year/projects/:slug
 * Get a single review project with full content
 */
router.get('/:year/projects/:slug', async (req, res) => {
  try {
    const { year, slug } = req.params;
    const { preview } = req.query;

    const supabase = getSupabase();

    let query = supabase
      .from('review_projects')
      .select('*')
      .eq('year', parseInt(year))
      .eq('slug', slug)
      .single();

    const { data: project, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw error;
    }

    // Check if published (unless preview mode)
    if (!project.is_published && !preview) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Fetch hero image
    let heroImageUrl = null;
    if (project.hero_image_id) {
      const { data: media } = await supabase
        .from('media_items')
        .select('file_url, thumbnail_url, alt_text')
        .eq('id', project.hero_image_id)
        .single();
      heroImageUrl = media?.file_url;
      project.heroImageAlt = media?.alt_text;
    }

    // Fetch associated media (gallery images)
    const { data: mediaLinks } = await supabase
      .from('review_media_links')
      .select(`
        id,
        display_order,
        caption,
        is_hero,
        media_id
      `)
      .eq('link_type', 'review_project')
      .eq('link_id', project.id)
      .order('display_order', { ascending: true });

    // Get media details for each link
    const gallery = await Promise.all(
      (mediaLinks || []).map(async (link) => {
        const { data: media } = await supabase
          .from('media_items')
          .select('id, file_url, thumbnail_url, title, alt_text, file_type')
          .eq('id', link.media_id)
          .single();
        return {
          ...link,
          ...media
        };
      })
    );

    // Fetch associated videos
    const { data: videos } = await supabase
      .from('review_videos')
      .select('*')
      .eq('link_type', 'review_project')
      .eq('link_id', project.id)
      .order('display_order', { ascending: true });

    res.json({
      success: true,
      project: {
        ...project,
        heroImageUrl,
        gallery: gallery.filter(g => !g.is_hero),
        videos: videos || []
      }
    });
  } catch (error) {
    console.error('Error fetching review project:', error);
    res.status(500).json({ error: 'Failed to fetch project', details: error.message });
  }
});

/**
 * POST /api/year-in-review/:year/projects
 * Create a new review project
 */
router.post('/:year/projects', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const {
      timelineEntryId,
      title,
      subtitle,
      heroImageId,
      heroVideoUrl,
      contentBlocks = []
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (!timelineEntryId) {
      return res.status(400).json({ error: 'timelineEntryId is required' });
    }

    const supabase = getSupabase();

    // Generate unique slug
    let slug = generateSlug(title);
    let slugSuffix = 0;
    let finalSlug = slug;

    // Check for slug conflicts
    while (true) {
      const { data: existing } = await supabase
        .from('review_projects')
        .select('id')
        .eq('slug', finalSlug)
        .single();

      if (!existing) break;

      slugSuffix++;
      finalSlug = `${slug}-${slugSuffix}`;
    }

    // Parse video URL if provided
    let videoType = null;
    let parsedVideoUrl = null;
    if (heroVideoUrl) {
      const parsed = parseVideoUrl(heroVideoUrl);
      if (parsed) {
        videoType = parsed.platform;
        parsedVideoUrl = parsed.embedUrl;
      }
    }

    const { data, error } = await supabase
      .from('review_projects')
      .insert({
        year,
        timeline_entry_id: timelineEntryId,
        slug: finalSlug,
        title,
        subtitle: subtitle || null,
        hero_image_id: heroImageId || null,
        hero_video_url: parsedVideoUrl,
        hero_video_type: videoType,
        content_blocks: contentBlocks,
        is_published: false
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      project: data,
      slug: finalSlug
    });
  } catch (error) {
    console.error('Error creating review project:', error);
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  }
});

/**
 * PUT /api/year-in-review/:year/projects/:slug
 * Update a review project
 */
router.put('/:year/projects/:slug', async (req, res) => {
  try {
    const { year, slug } = req.params;
    const {
      title,
      subtitle,
      heroImageId,
      heroVideoUrl,
      heroCaption,
      contentBlocks,
      isFeatured,
      featuredOrder,
      metaTitle,
      metaDescription
    } = req.body;

    const supabase = getSupabase();

    // Build update object
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (subtitle !== undefined) updates.subtitle = subtitle;
    if (heroImageId !== undefined) updates.hero_image_id = heroImageId;
    if (heroCaption !== undefined) updates.hero_caption = heroCaption;
    if (contentBlocks !== undefined) updates.content_blocks = contentBlocks;
    if (isFeatured !== undefined) updates.is_featured = isFeatured;
    if (featuredOrder !== undefined) updates.featured_order = featuredOrder;
    if (metaTitle !== undefined) updates.meta_title = metaTitle;
    if (metaDescription !== undefined) updates.meta_description = metaDescription;

    // Parse video URL if provided
    if (heroVideoUrl !== undefined) {
      if (heroVideoUrl) {
        const parsed = parseVideoUrl(heroVideoUrl);
        if (parsed) {
          updates.hero_video_url = parsed.embedUrl;
          updates.hero_video_type = parsed.platform;
        }
      } else {
        updates.hero_video_url = null;
        updates.hero_video_type = null;
      }
    }

    const { data, error } = await supabase
      .from('review_projects')
      .update(updates)
      .eq('year', parseInt(year))
      .eq('slug', slug)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw error;
    }

    res.json({
      success: true,
      project: data
    });
  } catch (error) {
    console.error('Error updating review project:', error);
    res.status(500).json({ error: 'Failed to update project', details: error.message });
  }
});

/**
 * POST /api/year-in-review/:year/projects/:slug/publish
 * Publish a review project
 */
router.post('/:year/projects/:slug/publish', async (req, res) => {
  try {
    const { year, slug } = req.params;
    const { publish = true } = req.body;

    const supabase = getSupabase();

    const updates = {
      is_published: publish
    };

    if (publish) {
      updates.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('review_projects')
      .update(updates)
      .eq('year', parseInt(year))
      .eq('slug', slug)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw error;
    }

    res.json({
      success: true,
      project: data,
      message: publish ? 'Project published' : 'Project unpublished'
    });
  } catch (error) {
    console.error('Error publishing review project:', error);
    res.status(500).json({ error: 'Failed to publish project', details: error.message });
  }
});

/**
 * DELETE /api/year-in-review/:year/projects/:slug
 * Delete a review project
 */
router.delete('/:year/projects/:slug', async (req, res) => {
  try {
    const { year, slug } = req.params;

    const supabase = getSupabase();

    // First get the project ID for cleanup
    const { data: project } = await supabase
      .from('review_projects')
      .select('id')
      .eq('year', parseInt(year))
      .eq('slug', slug)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete associated media links
    await supabase
      .from('review_media_links')
      .delete()
      .eq('link_type', 'review_project')
      .eq('link_id', project.id);

    // Delete associated videos
    await supabase
      .from('review_videos')
      .delete()
      .eq('link_type', 'review_project')
      .eq('link_id', project.id);

    // Delete the project
    const { error } = await supabase
      .from('review_projects')
      .delete()
      .eq('id', project.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Project deleted'
    });
  } catch (error) {
    console.error('Error deleting review project:', error);
    res.status(500).json({ error: 'Failed to delete project', details: error.message });
  }
});

export default router;
