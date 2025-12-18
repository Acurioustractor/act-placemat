/**
 * Year in Review - Direct Supabase Client
 * Queries curated entries directly from Supabase, bypassing the Railway backend
 */

import { createClient } from '@supabase/supabase-js';
import type { CuratedData, TimelineEntry } from '../types/yearInReview';

// Public Supabase client (anon key for public read access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Fetch curated entries from Supabase
 */
export async function getCuratedEntriesFromSupabase(year: number = 2025): Promise<CuratedData> {
  if (!supabase) {
    console.warn('Supabase client not configured, falling back to API');
    return { entries: [], lastUpdated: null };
  }

  try {
    // Fetch curated entries
    const { data: entries, error: entriesError } = await supabase
      .from('review_curated_entries')
      .select('*')
      .eq('year', year)
      .eq('included', true)
      .order('date', { ascending: false });

    if (entriesError) {
      console.error('Error fetching curated entries:', entriesError);
      return { entries: [], lastUpdated: null };
    }

    // Fetch year settings
    const { data: settings, error: settingsError } = await supabase
      .from('review_year_settings')
      .select('*')
      .eq('year', year)
      .single();

    // Transform Supabase rows to TimelineEntry format
    const transformedEntries: TimelineEntry[] = (entries || []).map(row => ({
      id: row.id,
      date: row.date,
      title: row.edited_title || row.title,
      description: row.edited_description || row.description,
      source: row.source,
      type: row.type,
      tags: row.tags || [],
      status: row.status,
      metadata: row.metadata || {},
      included: row.included,
      editedTitle: row.edited_title,
      editedDescription: row.edited_description,
      heroImageUrl: row.hero_image_url,
      heroImageId: row.hero_image_id,
      heroImageAlt: row.hero_image_alt,
      heroVideoUrl: row.hero_video_url,
      heroVideoPlatform: row.hero_video_platform,
      heroVideoTitle: row.hero_video_title,
      photos: row.photos || [],
      hasProjectPage: row.has_project_page,
      projectSlug: row.project_slug,
      seasonOrder: row.season_order,
      displayOrder: row.display_order,
    }));

    return {
      entries: transformedEntries,
      seasons: settings?.seasons || [],
      settings: settings?.settings || {},
      lastUpdated: settings?.last_updated || null
    };
  } catch (error) {
    console.error('Error fetching from Supabase:', error);
    return { entries: [], lastUpdated: null };
  }
}

/**
 * Fetch media links for timeline entries
 */
export async function getTimelineMediaFromSupabase(entryIds: string[]): Promise<Record<string, {
  hero: { url: string; alt?: string } | null;
  gallery: Array<{ url: string; alt?: string }>;
}>> {
  if (!supabase || entryIds.length === 0) {
    return {};
  }

  try {
    const { data: links, error } = await supabase
      .from('review_media_links')
      .select(`
        id,
        link_id,
        media_id,
        is_hero,
        display_order,
        caption,
        alt_text,
        media_items (
          id,
          file_url,
          thumbnail_url,
          file_type,
          title,
          alt_text
        )
      `)
      .eq('link_type', 'timeline_entry')
      .in('link_id', entryIds);

    if (error || !links) {
      console.error('Error fetching timeline media:', error);
      return {};
    }

    const byEntry: Record<string, { hero: { url: string; alt?: string } | null; gallery: Array<{ url: string; alt?: string }> }> = {};

    for (const link of links) {
      const entryId = link.link_id;
      const media = link.media_items as any;
      if (!entryId || !media) continue;

      if (!byEntry[entryId]) {
        byEntry[entryId] = { hero: null, gallery: [] };
      }

      const item = {
        url: media.file_url,
        alt: link.alt_text || media.alt_text || undefined
      };

      if (link.is_hero) {
        byEntry[entryId].hero = item;
      } else {
        byEntry[entryId].gallery.push(item);
      }
    }

    return byEntry;
  } catch (error) {
    console.error('Error fetching timeline media:', error);
    return {};
  }
}

/**
 * Fetch videos for timeline entries
 */
export async function getTimelineVideosFromSupabase(year: number, entryIds: string[]): Promise<Record<string, Array<{
  platform: string;
  embedUrl: string;
  title?: string;
}>>> {
  if (!supabase || entryIds.length === 0) {
    return {};
  }

  try {
    const { data: videos, error } = await supabase
      .from('review_videos')
      .select('id, platform, embed_url, title, link_id, display_order')
      .eq('year', year)
      .eq('link_type', 'timeline_entry')
      .in('link_id', entryIds)
      .order('display_order', { ascending: true });

    if (error || !videos) {
      console.error('Error fetching timeline videos:', error);
      return {};
    }

    const byEntry: Record<string, Array<{ platform: string; embedUrl: string; title?: string }>> = {};

    for (const video of videos) {
      if (!video.link_id) continue;
      if (!byEntry[video.link_id]) byEntry[video.link_id] = [];
      byEntry[video.link_id].push({
        platform: video.platform,
        embedUrl: video.embed_url,
        title: video.title
      });
    }

    return byEntry;
  } catch (error) {
    console.error('Error fetching timeline videos:', error);
    return {};
  }
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
