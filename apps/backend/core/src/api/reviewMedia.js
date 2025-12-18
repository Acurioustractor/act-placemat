/**
 * Review Media API Routes
 *
 * API for managing media links, galleries, and videos for Year in Review
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
 * GET /api/year-in-review/:year/media
 * List all media for the year with optional filters
 */
router.get('/:year/media', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { season, tags, limit = 50, offset = 0 } = req.query;

    const supabase = getSupabase();

    let query = supabase
      .from('media_items')
      .select('*')
      .eq('year_in_review_year', year)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (season !== undefined) {
      query = query.eq('season_index', parseInt(season));
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      query = query.overlaps('review_tags', tagList);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      year,
      count: data?.length || 0,
      media: data || []
    });
  } catch (error) {
    console.error('Error fetching review media:', error);
    res.status(500).json({ error: 'Failed to fetch media', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year/media/all
 * Get all available media (from media_items) that can be used
 */
router.get('/:year/media/all', async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query;

    const supabase = getSupabase();

    let query = supabase
      .from('media_items')
      .select('id, file_url, thumbnail_url, file_type, title, description, alt_text, manual_tags, impact_themes, project_ids, created_at')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      media: data || []
    });
  } catch (error) {
    console.error('Error fetching all media:', error);
    res.status(500).json({ error: 'Failed to fetch media', details: error.message });
  }
});

/**
 * POST /api/year-in-review/:year/media/link
 * Link media to a Year in Review entity
 */
router.post('/:year/media/link', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const {
      mediaId,
      linkType,
      linkId,
      displayOrder = 0,
      caption,
      altText,
      isHero = false
    } = req.body;

    if (!mediaId || !linkType || !linkId) {
      return res.status(400).json({
        error: 'mediaId, linkType, and linkId are required'
      });
    }

    const validLinkTypes = ['timeline_entry', 'review_project', 'content_block', 'season', 'hero'];
    if (!validLinkTypes.includes(linkType)) {
      return res.status(400).json({
        error: `linkType must be one of: ${validLinkTypes.join(', ')}`
      });
    }

    const supabase = getSupabase();

    // If setting as hero, unset any existing hero for this entity
    if (isHero) {
      await supabase
        .from('review_media_links')
        .update({ is_hero: false })
        .eq('link_type', linkType)
        .eq('link_id', linkId)
        .eq('is_hero', true);
    }

    // Create the link (upsert to avoid duplicates)
    const { data, error } = await supabase
      .from('review_media_links')
      .upsert({
        media_id: mediaId,
        link_type: linkType,
        link_id: linkId,
        display_order: displayOrder,
        caption,
        alt_text: altText,
        is_hero: isHero
      }, {
        onConflict: 'media_id,link_type,link_id'
      })
      .select()
      .single();

    if (error) throw error;

    // Also update the media_items record for year association
    await supabase
      .from('media_items')
      .update({
        year_in_review_year: year,
        timeline_entry_id: linkType === 'timeline_entry' ? linkId : undefined,
        is_hero_image: isHero
      })
      .eq('id', mediaId);

    res.json({
      success: true,
      link: data
    });
  } catch (error) {
    console.error('Error linking media:', error);
    res.status(500).json({ error: 'Failed to link media', details: error.message });
  }
});

/**
 * DELETE /api/year-in-review/:year/media/link/:linkId
 * Remove a media link
 */
router.delete('/:year/media/link/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;

    const supabase = getSupabase();

    const { error } = await supabase
      .from('review_media_links')
      .delete()
      .eq('id', linkId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Media link removed'
    });
  } catch (error) {
    console.error('Error removing media link:', error);
    res.status(500).json({ error: 'Failed to remove link', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year/media/gallery/:linkType/:linkId
 * Get all media for a specific entity (gallery)
 */
router.get('/:year/media/gallery/:linkType/:linkId', async (req, res) => {
  try {
    const { linkType, linkId } = req.params;

    const supabase = getSupabase();

    // Get media links
    const { data: links, error: linksError } = await supabase
      .from('review_media_links')
      .select('*')
      .eq('link_type', linkType)
      .eq('link_id', linkId)
      .order('is_hero', { ascending: false })
      .order('display_order', { ascending: true });

    if (linksError) throw linksError;

    // Get media details for each link
    const gallery = await Promise.all(
      (links || []).map(async (link) => {
        const { data: media } = await supabase
          .from('media_items')
          .select('id, file_url, thumbnail_url, file_type, title, description, alt_text, dimensions')
          .eq('id', link.media_id)
          .single();

        return {
          linkId: link.id,
          displayOrder: link.display_order,
          caption: link.caption,
          isHero: link.is_hero,
          media: media || null
        };
      })
    );

    res.json({
      success: true,
      linkType,
      linkId,
      count: gallery.length,
      hero: gallery.find(g => g.isHero) || null,
      gallery: gallery.filter(g => !g.isHero)
    });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery', details: error.message });
  }
});

/**
 * PUT /api/year-in-review/:year/media/gallery/:linkType/:linkId/reorder
 * Reorder gallery items
 */
router.put('/:year/media/gallery/:linkType/:linkId/reorder', async (req, res) => {
  try {
    const { linkType, linkId } = req.params;
    const { order } = req.body;

    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ error: 'order array is required' });
    }

    const supabase = getSupabase();

    // Update each item's display_order
    await Promise.all(
      order.map((itemLinkId, index) =>
        supabase
          .from('review_media_links')
          .update({ display_order: index })
          .eq('id', itemLinkId)
          .eq('link_type', linkType)
          .eq('link_id', linkId)
      )
    );

    res.json({
      success: true,
      message: 'Gallery reordered'
    });
  } catch (error) {
    console.error('Error reordering gallery:', error);
    res.status(500).json({ error: 'Failed to reorder gallery', details: error.message });
  }
});

// =============================================
// VIDEO ENDPOINTS
// =============================================

/**
 * POST /api/year-in-review/:year/videos
 * Add a video embed
 */
router.post('/:year/videos', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const {
      url,
      title,
      description,
      linkType = 'standalone',
      linkId,
      displayOrder = 0,
      isFeatured = false,
      projectId
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    // Parse video URL
    let platform = 'direct';
    let videoId = url;
    let embedUrl = url;

    // Loom
    const loomMatch = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
    if (loomMatch) {
      platform = 'loom';
      videoId = loomMatch[2];
      embedUrl = `https://www.loom.com/embed/${loomMatch[2]}`;
    }

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      platform = 'youtube';
      videoId = ytMatch[1];
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      platform = 'vimeo';
      videoId = vimeoMatch[1];
      embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    const supabase = getSupabase();

    // If projectId is provided, set linkType to 'review_project' and linkId to projectId
    const finalLinkType = projectId ? 'review_project' : linkType;
    const finalLinkId = projectId || linkId || null;

    const { data, error } = await supabase
      .from('review_videos')
      .insert({
        year,
        platform,
        video_id: videoId,
        embed_url: embedUrl,
        title,
        description,
        link_type: finalLinkType,
        link_id: finalLinkId,
        display_order: displayOrder,
        is_featured: isFeatured
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      video: data
    });
  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({ error: 'Failed to add video', details: error.message });
  }
});

/**
 * GET /api/year-in-review/:year/videos
 * Get all videos for a year
 */
router.get('/:year/videos', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { linkType, linkId, featured, projectId } = req.query;

    const supabase = getSupabase();

    let query = supabase
      .from('review_videos')
      .select('*')
      .eq('year', year)
      .order('display_order', { ascending: true });

    if (linkType) {
      query = query.eq('link_type', linkType);
    }

    if (linkId) {
      query = query.eq('link_id', linkId);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      year,
      count: data?.length || 0,
      videos: data || []
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos', details: error.message });
  }
});

/**
 * PUT /api/year-in-review/:year/videos/:videoId
 * Update a video
 */
router.put('/:year/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, description, displayOrder, isFeatured, projectId, linkType, linkId } = req.body;

    const supabase = getSupabase();

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (displayOrder !== undefined) updates.display_order = displayOrder;
    if (isFeatured !== undefined) updates.is_featured = isFeatured;
    // Handle project linking via link_type/link_id
    if (projectId !== undefined) {
      updates.link_type = projectId ? 'review_project' : 'standalone';
      updates.link_id = projectId || null;
    } else if (linkType !== undefined) {
      updates.link_type = linkType;
      updates.link_id = linkId || null;
    }

    const { data, error } = await supabase
      .from('review_videos')
      .update(updates)
      .eq('id', videoId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      video: data
    });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video', details: error.message });
  }
});

/**
 * DELETE /api/year-in-review/:year/videos/:videoId
 * Delete a video
 */
router.delete('/:year/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    const supabase = getSupabase();

    const { error } = await supabase
      .from('review_videos')
      .delete()
      .eq('id', videoId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Video deleted'
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video', details: error.message });
  }
});

// =============================================
// TIMELINE ENTRY MEDIA HELPERS
// =============================================

/**
 * PUT /api/year-in-review/:year/entries/:entryId/hero
 * Set hero image for a timeline entry
 */
router.put('/:year/entries/:entryId/hero', async (req, res) => {
  try {
    const { year, entryId } = req.params;
    const { mediaId } = req.body;

    if (!mediaId) {
      return res.status(400).json({ error: 'mediaId is required' });
    }

    const supabase = getSupabase();

    // Remove existing hero
    await supabase
      .from('review_media_links')
      .delete()
      .eq('link_type', 'timeline_entry')
      .eq('link_id', entryId)
      .eq('is_hero', true);

    // Set new hero
    const { data, error } = await supabase
      .from('review_media_links')
      .upsert({
        media_id: mediaId,
        link_type: 'timeline_entry',
        link_id: entryId,
        is_hero: true,
        display_order: 0
      }, {
        onConflict: 'media_id,link_type,link_id'
      })
      .select()
      .single();

    if (error) throw error;

    // Update media_items
    await supabase
      .from('media_items')
      .update({
        year_in_review_year: parseInt(year),
        timeline_entry_id: entryId,
        is_hero_image: true
      })
      .eq('id', mediaId);

    res.json({
      success: true,
      link: data
    });
  } catch (error) {
    console.error('Error setting hero image:', error);
    res.status(500).json({ error: 'Failed to set hero image', details: error.message });
  }
});

/**
 * PUT /api/year-in-review/:year/entries/:entryId/video
 * Set video for a timeline entry
 */
router.put('/:year/entries/:entryId/video', async (req, res) => {
  try {
    const { year, entryId } = req.params;
    const { url, title } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const supabase = getSupabase();

    // Remove existing video for this entry
    await supabase
      .from('review_videos')
      .delete()
      .eq('link_type', 'timeline_entry')
      .eq('link_id', entryId);

    // Parse and add new video
    let platform = 'direct';
    let videoId = url;
    let embedUrl = url;

    const loomMatch = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
    if (loomMatch) {
      platform = 'loom';
      videoId = loomMatch[2];
      embedUrl = `https://www.loom.com/embed/${loomMatch[2]}`;
    }

    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      platform = 'youtube';
      videoId = ytMatch[1];
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      platform = 'vimeo';
      videoId = vimeoMatch[1];
      embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    const { data, error } = await supabase
      .from('review_videos')
      .insert({
        year: parseInt(year),
        platform,
        video_id: videoId,
        embed_url: embedUrl,
        title,
        link_type: 'timeline_entry',
        link_id: entryId
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      video: data
    });
  } catch (error) {
    console.error('Error setting entry video:', error);
    res.status(500).json({ error: 'Failed to set video', details: error.message });
  }
});

export default router;
