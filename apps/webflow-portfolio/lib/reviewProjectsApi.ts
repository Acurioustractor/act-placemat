/**
 * Review Projects API Client
 * Primary: Supabase (fast, reliable)
 * Fallback: Railway API (for write operations)
 */

import { createClient } from '@supabase/supabase-js';
import type { ReviewProject, ContentBlock, MediaItem, VideoEmbed } from '../types/yearInReview';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Supabase client - PRIMARY data source
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// =============================================
// Review Projects
// =============================================

/**
 * Get all published review projects for a year
 * Uses Supabase as primary source (faster, more reliable)
 */
export async function getReviewProjects(year: number = 2025, includeUnpublished = false): Promise<ReviewProject[]> {
  // Primary: Supabase
  if (supabase) {
    try {
      let query = supabase
        .from('review_projects')
        .select('*')
        .eq('year', year)
        .order('created_at', { ascending: false });

      if (!includeUnpublished) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      const projects = (data || []).map(transformProject);
      if (projects.length > 0) {
        console.log(`✅ Loaded ${projects.length} projects from Supabase`);
        return projects;
      }
    } catch (supabaseError) {
      console.warn('Supabase query failed, trying Railway API:', supabaseError);
    }
  }

  // Fallback: Railway API
  try {
    const url = new URL(`${API_BASE}/api/year-in-review/${year}/projects`);
    if (includeUnpublished) {
      url.searchParams.set('includeUnpublished', 'true');
    }

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      const projects = (data.projects || []).map(transformProject);
      console.log(`✅ Loaded ${projects.length} projects from Railway API`);
      return projects;
    }
  } catch (apiError) {
    console.error('Railway API also unavailable:', apiError);
  }

  return [];
}

/**
 * Get a single review project by slug
 * Uses Supabase as primary source
 */
export async function getReviewProject(year: number, slug: string, preview = false): Promise<ReviewProject | null> {
  // Primary: Supabase
  if (supabase) {
    try {
      let query = supabase
        .from('review_projects')
        .select('*')
        .eq('year', year)
        .eq('slug', slug);

      if (!preview) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query.single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      if (data) {
        return transformProject(data);
      }
    } catch (supabaseError) {
      console.warn('Supabase query failed, trying Railway API:', supabaseError);
    }
  }

  // Fallback: Railway API
  try {
    const url = new URL(`${API_BASE}/api/year-in-review/${year}/projects/${slug}`);
    if (preview) {
      url.searchParams.set('preview', 'true');
    }

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      return transformProject(data.project);
    }
  } catch (apiError) {
    console.error('Railway API also unavailable:', apiError);
  }

  return null;
}

/**
 * Create a new review project
 */
export async function createReviewProject(
  year: number,
  data: {
    timelineEntryId: string;
    title: string;
    subtitle?: string;
    heroImageId?: string;
    heroVideoUrl?: string;
    contentBlocks?: ContentBlock[];
  }
): Promise<{ project: ReviewProject; slug: string }> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`Failed to create review project: ${res.statusText}`);
  }

  const result = await res.json();
  return {
    project: transformProject(result.project),
    slug: result.slug
  };
}

/**
 * Update a review project
 */
export async function updateReviewProject(
  year: number,
  slug: string,
  updates: Partial<{
    title: string;
    subtitle: string;
    heroImageId: string;
    heroVideoUrl: string;
    heroCaption: string;
    contentBlocks: ContentBlock[];
    isFeatured: boolean;
    featuredOrder: number;
    metaTitle: string;
    metaDescription: string;
  }>
): Promise<ReviewProject> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/projects/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    throw new Error(`Failed to update review project: ${res.statusText}`);
  }

  const data = await res.json();
  return transformProject(data.project);
}

/**
 * Publish or unpublish a review project
 */
export async function publishReviewProject(year: number, slug: string, publish = true): Promise<ReviewProject> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/projects/${slug}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publish })
  });

  if (!res.ok) {
    throw new Error(`Failed to publish review project: ${res.statusText}`);
  }

  const data = await res.json();
  return transformProject(data.project);
}

/**
 * Delete a review project
 */
export async function deleteReviewProject(year: number, slug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/projects/${slug}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    throw new Error(`Failed to delete review project: ${res.statusText}`);
  }
}

// =============================================
// Media Links
// =============================================

/**
 * Link media to a review entity
 */
export async function linkMedia(
  year: number,
  data: {
    mediaId: string;
    linkType: 'timeline_entry' | 'review_project' | 'season' | 'hero';
    linkId: string;
    displayOrder?: number;
    caption?: string;
    altText?: string;
    isHero?: boolean;
  }
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/media/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`Failed to link media: ${res.statusText}`);
  }
}

/**
 * Unlink media
 */
export async function unlinkMedia(year: number, linkId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/media/link/${linkId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    throw new Error(`Failed to unlink media: ${res.statusText}`);
  }
}

/**
 * Get gallery for an entity
 */
export async function getGallery(
  year: number,
  linkType: string,
  linkId: string
): Promise<{ hero: MediaItem | null; gallery: MediaItem[] }> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/media/gallery/${linkType}/${linkId}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch gallery: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    hero: data.hero ? transformMediaItem(data.hero) : null,
    gallery: (data.gallery || []).map(transformMediaItem)
  };
}

// =============================================
// Videos
// =============================================

/**
 * Add a video embed
 */
export async function addVideo(
  year: number,
  data: {
    url: string;
    title?: string;
    description?: string;
    linkType?: string;
    linkId?: string;
    displayOrder?: number;
    isFeatured?: boolean;
  }
): Promise<VideoEmbed> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`Failed to add video: ${res.statusText}`);
  }

  const result = await res.json();
  return transformVideoEmbed(result.video);
}

/**
 * Get videos for a year or entity
 */
export async function getVideos(
  year: number,
  filters?: { linkType?: string; linkId?: string; featured?: boolean }
): Promise<VideoEmbed[]> {
  const url = new URL(`${API_BASE}/api/year-in-review/${year}/videos`);
  if (filters?.linkType) url.searchParams.set('linkType', filters.linkType);
  if (filters?.linkId) url.searchParams.set('linkId', filters.linkId);
  if (filters?.featured) url.searchParams.set('featured', 'true');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch videos: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.videos || []).map(transformVideoEmbed);
}

/**
 * Update a video
 */
export async function updateVideo(
  year: number,
  videoId: string,
  updates: Partial<{
    title: string;
    description: string;
    displayOrder: number;
    isFeatured: boolean;
    projectId: string | null;
  }>
): Promise<VideoEmbed> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/videos/${videoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    throw new Error(`Failed to update video: ${res.statusText}`);
  }

  const data = await res.json();
  return transformVideoEmbed(data.video);
}

/**
 * Delete a video
 */
export async function deleteVideo(year: number, videoId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/videos/${videoId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    throw new Error(`Failed to delete video: ${res.statusText}`);
  }
}

// =============================================
// Timeline Entry Helpers
// =============================================

/**
 * Set hero image for a timeline entry
 */
export async function setEntryHeroImage(year: number, entryId: string, mediaId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/entries/${entryId}/hero`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaId })
  });

  if (!res.ok) {
    throw new Error(`Failed to set hero image: ${res.statusText}`);
  }
}

/**
 * Set video for a timeline entry
 */
export async function setEntryVideo(year: number, entryId: string, url: string, title?: string): Promise<VideoEmbed> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/entries/${entryId}/video`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title })
  });

  if (!res.ok) {
    throw new Error(`Failed to set video: ${res.statusText}`);
  }

  const data = await res.json();
  return transformVideoEmbed(data.video);
}

// =============================================
// Transform Functions (snake_case to camelCase)
// =============================================

function transformProject(data: any): ReviewProject {
  return {
    id: data.id,
    year: data.year,
    timelineEntryId: data.timeline_entry_id,
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle,
    heroImageId: data.hero_image_id,
    heroImageUrl: data.heroImageUrl || data.hero_image_url,
    heroImageAlt: data.heroImageAlt,
    heroVideoUrl: data.hero_video_url,
    heroVideoType: data.hero_video_type,
    heroCaption: data.hero_caption,
    contentBlocks: data.content_blocks || [],
    isFeatured: data.is_featured || false,
    featuredOrder: data.featured_order,
    isPublished: data.is_published || false,
    publishedAt: data.published_at,
    metaTitle: data.meta_title,
    metaDescription: data.meta_description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    gallery: data.gallery?.map(transformMediaItem),
    videos: data.videos?.map(transformVideoEmbed)
  };
}

function transformMediaItem(data: any): MediaItem {
  return {
    id: data.id || data.media?.id,
    fileUrl: data.fileUrl || data.file_url || data.media?.file_url,
    thumbnailUrl: data.thumbnailUrl || data.thumbnail_url || data.media?.thumbnail_url,
    fileType: data.fileType || data.file_type || data.media?.file_type,
    title: data.title || data.media?.title,
    description: data.description || data.media?.description,
    altText: data.altText || data.alt_text || data.media?.alt_text,
    caption: data.caption,
    isHero: data.isHero || data.is_hero,
    displayOrder: data.displayOrder || data.display_order
  };
}

function transformVideoEmbed(data: any): VideoEmbed {
  return {
    id: data.id,
    platform: data.platform,
    videoId: data.video_id,
    embedUrl: data.embed_url,
    thumbnailUrl: data.thumbnail_url,
    title: data.title,
    description: data.description,
    durationSeconds: data.duration_seconds,
    isFeatured: data.is_featured,
    displayOrder: data.display_order
  };
}
