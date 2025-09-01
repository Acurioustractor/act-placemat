/**
 * Empathy Ledger Platform: Auto-Managing Multi-Tenant Media API
 * Zero manual folder management, infinite scale, trial-ready with ACT
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
    fileSize: 100 * 1024 * 1024, // 100MB limit for platform scalability
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedTypes = ['image/', 'video/', 'application/pdf', 'application/msword'];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Please upload images, videos, or documents.'), false);
    }
  }
});

// =============================================
// ORGANIZATION AUTO-MANAGEMENT
// =============================================

// Middleware: Auto-resolve or create organization
const resolveOrganization = async (req, res, next) => {
  try {
    // Multiple ways to identify organization
    const orgIdentifier = 
      req.params.org ||                    // /api/act/media/upload
      req.headers['x-organization'] ||     // Header-based
      req.query.org ||                     // Query parameter
      'act';                               // Default for trial
    
    // Validate organization slug format
    if (!/^[a-z0-9-]+$/.test(orgIdentifier)) {
      return res.status(400).json({ 
        error: 'Invalid organization identifier. Use lowercase letters, numbers, and hyphens only.' 
      });
    }
    
    // Get existing organization
    let { data: org, error } = await supabase
      .from('platform_organizations')
      .select('*')
      .eq('slug', orgIdentifier)
      .single();
    
    // Auto-create organization on first API call
    if (!org && !error?.message?.includes('multiple')) {
      console.log(`🏗️ Auto-creating organization: ${orgIdentifier}`);
      
      const { data: newOrg, error: createError } = await supabase
        .from('platform_organizations')
        .insert({
          slug: orgIdentifier,
          name: orgIdentifier.charAt(0).toUpperCase() + orgIdentifier.slice(1).replace('-', ' '),
          subscription_tier: 'starter'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating organization:', createError);
        return res.status(500).json({ 
          error: 'Failed to create organization',
          message: createError.message 
        });
      }
      
      org = newOrg;
      console.log(`✅ Organization created: ${org.slug} (${org.storage_prefix})`);
    } else if (error) {
      console.error('Error fetching organization:', error);
      return res.status(500).json({ 
        error: 'Failed to resolve organization',
        message: error.message 
      });
    }
    
    // Set organization context for RLS
    await supabase.rpc('set_platform_organization_context', { org_slug: org.slug });
    
    req.organization = org;
    next();
    
  } catch (error) {
    console.error('Organization resolution error:', error);
    res.status(500).json({
      error: 'Failed to resolve organization',
      message: error.message
    });
  }
};

// =============================================
// STORAGE PATH MANAGEMENT
// =============================================

// Auto-generate optimal storage paths
const generateStoragePath = (organization, file, category = 'community', subcategory = null) => {
  const fileId = uuidv4();
  const fileExt = file.originalname.split('.').pop().toLowerCase();
  const fileName = `${fileId}.${fileExt}`;
  
  // Determine media type and base folder
  let mediaType;
  if (file.mimetype.startsWith('image/')) {
    mediaType = 'photos';
  } else if (file.mimetype.startsWith('video/')) {
    mediaType = 'videos';
  } else {
    mediaType = 'documents';
  }
  
  // Build hierarchical path
  const pathParts = [organization.storage_prefix, mediaType, category];
  if (subcategory) {
    pathParts.push(subcategory);
  }
  pathParts.push(fileName);
  
  const storagePath = pathParts.join('/');
  
  return {
    bucket: 'empathy-ledger-media',
    path: storagePath,
    fileName,
    fileId,
    mediaType,
    category,
    subcategory
  };
};

// Generate thumbnail path
const generateThumbnailPath = (organization, fileId) => {
  return {
    bucket: 'empathy-ledger-media',
    path: `${organization.storage_prefix}/thumbnails/${fileId}_thumb.jpg`
  };
};

// =============================================
// UPLOAD ENDPOINT: Auto-Managing
// =============================================

// Organization-aware upload endpoint
router.post('/:org/upload', resolveOrganization, upload.single('file'), async (req, res) => {
  try {
    const { organization } = req;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    console.log(`📤 Upload request for ${organization.slug}: ${file.originalname} (${file.mimetype})`);
    
    // Extract metadata from request
    const {
      title,
      description,
      category = 'community',
      subcategory,
      tags,
      photographer,
      captureDate,
      impactThemes
    } = req.body;
    
    // Generate storage paths
    const storagePath = generateStoragePath(organization, file, category, subcategory);
    console.log(`📍 Storage path: ${storagePath.path}`);
    
    // Process file buffer and metadata
    const fileBuffer = file.buffer;
    let dimensions = {};
    let thumbnailUrl = null;
    
    // Image processing
    if (file.mimetype.startsWith('image/')) {
      try {
        const image = sharp(file.buffer);
        const metadata = await image.metadata();
        
        dimensions = {
          width: metadata.width,
          height: metadata.height
        };
        
        // Generate thumbnail
        const thumbnailBuffer = await image
          .resize(400, 400, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
        
        // Upload thumbnail
        const thumbnailPath = generateThumbnailPath(organization, storagePath.fileId);
        const { error: thumbError } = await supabase.storage
          .from(thumbnailPath.bucket)
          .upload(thumbnailPath.path, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });
        
        if (thumbError) {
          console.warn('Thumbnail upload warning:', thumbError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from(thumbnailPath.bucket)
            .getPublicUrl(thumbnailPath.path);
          thumbnailUrl = publicUrl;
        }
        
      } catch (imageError) {
        console.warn('Image processing warning:', imageError);
      }
    }
    
    // Video processing (basic metadata)
    if (file.mimetype.startsWith('video/')) {
      // Could add video duration extraction here
      dimensions = { duration: null }; // Placeholder for video metadata
    }
    
    // Upload main file to organization-specific path
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(storagePath.bucket)
      .upload(storagePath.path, fileBuffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({
        error: 'File upload failed',
        message: uploadError.message
      });
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(storagePath.bucket)
      .getPublicUrl(storagePath.path);
    
    // Save media item to database with organization context
    const { data: mediaItem, error: dbError } = await supabase
      .from('platform_media_items')
      .insert({
        platform_organization_id: organization.id,
        bucket_name: storagePath.bucket,
        storage_path: storagePath.path,
        file_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        
        // File metadata
        file_type: storagePath.mediaType === 'photos' ? 'photo' : 
                  storagePath.mediaType === 'videos' ? 'video' : 'document',
        file_size: file.size,
        dimensions,
        mime_type: file.mimetype,
        original_filename: file.originalname,
        
        // Content metadata
        title: title || file.originalname.replace(/\.[^/.]+$/, ''),
        description,
        content_category: category,
        content_subcategory: subcategory,
        
        // Tags and themes
        manual_tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        impact_themes: impactThemes ? impactThemes.split(',').map(theme => theme.trim()).filter(Boolean) : [],
        
        // Attribution
        photographer,
        capture_date: captureDate || new Date().toISOString().split('T')[0],
        consent_verified: true, // Would be handled by upload form/agreement
        community_approved: false // Requires manual approval workflow
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file on database error
      await supabase.storage.from(storagePath.bucket).remove([storagePath.path]);
      
      return res.status(500).json({
        error: 'Failed to save media metadata',
        message: dbError.message
      });
    }
    
    // Schedule AI processing job
    await supabase
      .from('platform_media_processing_jobs')
      .insert({
        platform_organization_id: organization.id,
        media_id: mediaItem.id,
        job_type: 'ai-tag',
        status: 'pending',
        input_data: {
          file_url: publicUrl,
          file_type: mediaItem.file_type,
          mime_type: file.mimetype
        }
      });
    
    console.log(`✅ Upload complete: ${mediaItem.id} for ${organization.slug}`);
    
    res.json({
      success: true,
      media: mediaItem,
      organization: {
        slug: organization.slug,
        name: organization.name
      },
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
// MEDIA BROWSING: Organization-Scoped
// =============================================

// Get organization's media items
router.get('/:org/items', resolveOrganization, async (req, res) => {
  try {
    const { organization } = req;
    const {
      type,
      category,
      tags,
      limit = 20,
      offset = 0,
      search,
      collection_id
    } = req.query;
    
    // Build query with organization context
    let query = supabase
      .from('platform_media_items')
      .select(`
        id, file_url, thumbnail_url, file_type, title, description,
        content_category, content_subcategory, manual_tags, impact_themes,
        photographer, capture_date, file_size, created_at,
        platform_organization_id
      `)
      .eq('platform_organization_id', organization.id)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (type) {
      query = query.eq('file_type', type);
    }
    
    if (category) {
      query = query.eq('content_category', category);
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query = query.overlaps('manual_tags', tagArray);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Handle collection filter
    if (collection_id) {
      const { data: collectionMedia } = await supabase
        .from('platform_collection_media')
        .select('media_id')
        .eq('collection_id', collection_id)
        .order('sort_order');
      
      if (collectionMedia && collectionMedia.length > 0) {
        const mediaIds = collectionMedia.map(cm => cm.media_id);
        query = query.in('id', mediaIds);
      }
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    res.json({
      media: data || [],
      organization: {
        slug: organization.slug,
        name: organization.name
      },
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: count || 0,
        hasMore: (parseInt(offset) + parseInt(limit)) < (count || 0)
      }
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
router.get('/:org/items/:id', resolveOrganization, async (req, res) => {
  try {
    const { organization } = req;
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('platform_media_items')
      .select('*')
      .eq('id', id)
      .eq('platform_organization_id', organization.id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Media item not found' });
    }
    
    res.json({
      media: data,
      organization: {
        slug: organization.slug,
        name: organization.name
      }
    });
    
  } catch (error) {
    console.error('Error fetching media item:', error);
    res.status(500).json({
      error: 'Failed to fetch media item',
      message: error.message
    });
  }
});

// =============================================
// COLLECTIONS: Organization-Scoped
// =============================================

// Get organization's collections
router.get('/:org/collections', resolveOrganization, async (req, res) => {
  try {
    const { organization } = req;
    const { type, featured, limit = 10 } = req.query;
    
    let query = supabase
      .from('platform_media_collections')
      .select(`
        id, name, description, type, featured, public_visible,
        created_at, updated_at,
        cover_image:cover_image_id(file_url, thumbnail_url, title)
      `)
      .eq('platform_organization_id', organization.id)
      .eq('public_visible', true)
      .order('created_at', { ascending: false });
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (featured === 'true') {
      query = query.eq('featured', true);
    }
    
    query = query.limit(parseInt(limit));
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      collections: data || [],
      organization: {
        slug: organization.slug,
        name: organization.name
      }
    });
    
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({
      error: 'Failed to fetch collections',
      message: error.message
    });
  }
});

// =============================================
// ORGANIZATION INFO & STATS
// =============================================

// Get organization information and statistics
router.get('/:org/info', resolveOrganization, async (req, res) => {
  try {
    const { organization } = req;
    
    // Get organization stats
    const { data: stats, error: statsError } = await supabase
      .from('platform_organization_stats')
      .select('*')
      .eq('id', organization.id)
      .single();
    
    if (statsError) {
      console.warn('Stats error:', statsError);
    }
    
    res.json({
      organization: {
        ...organization,
        stats: stats || {
          total_media_items: 0,
          photo_count: 0,
          video_count: 0,
          collection_count: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching organization info:', error);
    res.status(500).json({
      error: 'Failed to fetch organization information',
      message: error.message
    });
  }
});

// =============================================
// HEALTH CHECK
// =============================================

// Platform health check
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('platform_organizations')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    res.json({
      status: 'healthy',
      platform: 'empathy-ledger',
      timestamp: new Date().toISOString(),
      database: 'connected',
      bucket: 'empathy-ledger-media'
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;