/**
 * ACT Media Management API
 * Handles photos, videos, galleries, and AI-powered content organization
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

// =============================================
// MEDIA ITEMS ENDPOINTS
// =============================================

// Get all public media items
router.get('/items', async (req, res) => {
  try {
    const { 
      type, 
      tags, 
      project_id, 
      story_id, 
      limit = 20, 
      offset = 0,
      collection_id 
    } = req.query;

    let query = supabase
      .from('public_media_with_collections')
      .select('*')
      .order('capture_date', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('file_type', type);
    }

    if (tags) {
      const tagArray = tags.split(',');
      query = query.overlaps('manual_tags', tagArray);
    }

    if (project_id) {
      query = query.contains('project_ids', [project_id]);
    }

    if (story_id) {
      query = query.contains('story_ids', [story_id]);
    }

    // If requesting items from a specific collection
    if (collection_id) {
      const { data: collectionMedia } = await supabase
        .from('collection_media')
        .select('media_id')
        .eq('collection_id', collection_id)
        .order('sort_order');

      if (collectionMedia && collectionMedia.length > 0) {
        const mediaIds = collectionMedia.map(cm => cm.media_id);
        query = query.in('id', mediaIds);
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      media: data || [],
      total: count || 0,
      hasMore: (offset + limit) < (count || 0)
    });

  } catch (error) {
    console.error('Error fetching media items:', error);
    res.status(500).json({
      error: 'Failed to fetch media items',
      message: error.message
    });
  }
});

// Get single media item
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('public_media_with_collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    res.json(data);

  } catch (error) {
    console.error('Error fetching media item:', error);
    res.status(500).json({
      error: 'Failed to fetch media item',
      message: error.message
    });
  }
});

// Upload new media item
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const {
      title,
      description,
      alt_text,
      manual_tags,
      impact_themes,
      photographer,
      project_ids,
      story_ids,
      capture_date
    } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileId = uuidv4();
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${fileId}.${fileExt}`;
    
    // Multi-bucket architecture - use dedicated buckets
    const getStorageConfig = (mimetype) => {
      if (mimetype.startsWith('image/')) {
        return {
          bucket: 'photos',
          folder: 'community', // Default folder, could be dynamic based on metadata
          fullPath: `community/${fileName}`
        };
      } else if (mimetype.startsWith('video/')) {
        return {
          bucket: 'videos',
          folder: 'stories', // Default folder, could be dynamic based on metadata  
          fullPath: `stories/${fileName}`
        };
      } else {
        // Fallback to media bucket for other file types
        return {
          bucket: 'media',
          folder: 'documents',
          fullPath: `documents/${fileName}`
        };
      }
    };
    
    const storageConfig = getStorageConfig(file.mimetype);
    const filePath = storageConfig.fullPath;

    // Process image if it's a photo
    let fileBuffer = file.buffer;
    let dimensions = {};

    if (file.mimetype.startsWith('image/')) {
      const image = sharp(file.buffer);
      const metadata = await image.metadata();
      
      dimensions = {
        width: metadata.width,
        height: metadata.height
      };

      // Create thumbnail
      const thumbnailBuffer = await image
        .resize(400, 400, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Upload thumbnail to media bucket
      const thumbnailPath = `thumbnails/${fileId}_thumb.jpg`;
      const { error: thumbError } = await supabase.storage
        .from('media')
        .upload(thumbnailPath, thumbnailBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (thumbError) {
        console.error('Thumbnail upload error:', thumbError);
      }
    }

    // Upload main file to appropriate bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(storageConfig.bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // Get public URL from correct bucket
    const { data: { publicUrl } } = supabase.storage
      .from(storageConfig.bucket)
      .getPublicUrl(filePath);

    const thumbnailUrl = file.mimetype.startsWith('image/') 
      ? supabase.storage.from('media').getPublicUrl(`thumbnails/${fileId}_thumb.jpg`).data.publicUrl
      : null;

    // Save media item to database
    const { data: mediaItem, error: dbError } = await supabase
      .from('media_items')
      .insert({
        file_url: publicUrl,
        file_type: file.mimetype.startsWith('video/') ? 'video' : 'photo',
        title: title || file.originalname,
        description,
        alt_text,
        file_size: file.size,
        dimensions,
        manual_tags: manual_tags ? manual_tags.split(',').map(tag => tag.trim()) : [],
        impact_themes: impact_themes ? impact_themes.split(',').map(theme => theme.trim()) : [],
        photographer,
        project_ids: project_ids ? project_ids.split(',') : [],
        story_ids: story_ids ? story_ids.split(',') : [],
        capture_date: capture_date || new Date().toISOString().split('T')[0],
        thumbnail_url: thumbnailUrl,
        consent_verified: true, // Would be handled by upload form
        community_approved: false // Needs manual approval
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Schedule AI processing (placeholder for future implementation)
    await supabase
      .from('media_processing_jobs')
      .insert({
        media_id: mediaItem.id,
        job_type: 'ai-tag',
        status: 'pending'
      });

    res.json({
      success: true,
      media: mediaItem,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

// =============================================
// MEDIA COLLECTIONS ENDPOINTS
// =============================================

// Get all public collections
router.get('/collections', async (req, res) => {
  try {
    const { type, featured, project_id, limit = 10 } = req.query;

    let query = supabase
      .from('media_collections')
      .select(`
        *,
        cover_media:cover_image_id(file_url, thumbnail_url, alt_text),
        media_count:collection_media(count)
      `)
      .eq('public_visible', true)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (featured === 'true') {
      query = query.eq('featured', true);
    }

    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    res.json(data || []);

  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({
      error: 'Failed to fetch collections',
      message: error.message
    });
  }
});

// Get collection with media items
router.get('/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get collection details
    const { data: collection, error: collectionError } = await supabase
      .from('media_collections')
      .select('*')
      .eq('id', id)
      .eq('public_visible', true)
      .single();

    if (collectionError) throw collectionError;

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Get media items in collection
    const { data: collectionMedia, error: mediaError } = await supabase
      .from('collection_media')
      .select(`
        sort_order,
        caption,
        media:media_id(*)
      `)
      .eq('collection_id', id)
      .order('sort_order');

    if (mediaError) throw mediaError;

    res.json({
      ...collection,
      media: collectionMedia?.map(cm => ({
        ...cm.media,
        sort_order: cm.sort_order,
        caption: cm.caption
      })) || []
    });

  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({
      error: 'Failed to fetch collection',
      message: error.message
    });
  }
});

// Create new collection
router.post('/collections', async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'gallery',
      project_id,
      story_id,
      media_ids = [],
      featured = false
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    // Create collection
    const { data: collection, error: collectionError } = await supabase
      .from('media_collections')
      .insert({
        name,
        description,
        type,
        project_id,
        story_id,
        featured,
        public_visible: true
      })
      .select()
      .single();

    if (collectionError) throw collectionError;

    // Add media items to collection
    if (media_ids.length > 0) {
      const collectionMediaItems = media_ids.map((mediaId, index) => ({
        collection_id: collection.id,
        media_id: mediaId,
        sort_order: index
      }));

      const { error: mediaError } = await supabase
        .from('collection_media')
        .insert(collectionMediaItems);

      if (mediaError) throw mediaError;
    }

    res.json({
      success: true,
      collection,
      message: 'Collection created successfully'
    });

  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({
      error: 'Failed to create collection',
      message: error.message
    });
  }
});

// =============================================
// SEARCH AND DISCOVERY
// =============================================

// Search media by tags and content
router.get('/search', async (req, res) => {
  try {
    const { q, type, themes, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let query = supabase
      .from('public_media_with_collections')
      .select('*');

    // Text search in title and description
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

    // Filter by type
    if (type) {
      query = query.eq('file_type', type);
    }

    // Filter by themes
    if (themes) {
      const themeArray = themes.split(',');
      query = query.overlaps('impact_themes', themeArray);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      results: data || [],
      query: q,
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// Get media suggestions based on content
router.get('/suggest/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    // Get current media item
    const { data: currentMedia, error: currentError } = await supabase
      .from('media_items')
      .select('manual_tags, impact_themes, project_ids')
      .eq('id', id)
      .single();

    if (currentError) throw currentError;

    if (!currentMedia) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    // Find similar media based on tags and themes
    let query = supabase
      .from('public_media_with_collections')
      .select('*')
      .neq('id', id);

    // Match by tags or themes
    if (currentMedia.manual_tags?.length > 0) {
      query = query.overlaps('manual_tags', currentMedia.manual_tags);
    } else if (currentMedia.impact_themes?.length > 0) {
      query = query.overlaps('impact_themes', currentMedia.impact_themes);
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      suggestions: data || [],
      based_on: {
        tags: currentMedia.manual_tags,
        themes: currentMedia.impact_themes
      }
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

export default router;