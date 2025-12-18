/**
 * Year in Review API Client
 *
 * Supports two data sources:
 * 1. Direct Supabase queries (preferred for production)
 * 2. Backend API (fallback, used in local development)
 */

import type { YearInReviewData, CuratedData, TimelineEntry, LinkedInPost } from '../types/yearInReview';
import curatedData2025 from '../data/curated-2025.json';

// API base URL - adjust for production
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Fetch complete year-in-review data
 */
export async function getYearInReviewData(year: number = 2025): Promise<YearInReviewData> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch year in review data: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch just the timeline
 */
export async function getTimeline(year: number = 2025) {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/timeline`);
  if (!res.ok) {
    throw new Error(`Failed to fetch timeline: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch just the metrics
 */
export async function getMetrics(year: number = 2025) {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/metrics`);
  if (!res.ok) {
    throw new Error(`Failed to fetch metrics: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch curated entries (admin-edited)
 * Priority: Supabase -> Backend API -> Static bundled data
 */
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function getCuratedEntries(year: number = 2025): Promise<CuratedData> {
  if (supabaseConfigured) {
    try {
      const { getCuratedEntriesFromSupabase } = await import('./yearInReviewSupabase');
      const supabaseData = await getCuratedEntriesFromSupabase(year);
      if (supabaseData.entries && supabaseData.entries.length > 0) {
        console.log(`✅ Loaded ${supabaseData.entries.length} curated entries from Supabase`);
        return supabaseData;
      }
    } catch (supabaseError) {
      console.warn('Supabase query failed:', supabaseError);
    }
  }

  // Try backend API second
  try {
    const res = await fetch(`${API_BASE}/api/year-in-review/${year}/curated`);
    if (res.ok) {
      const data = await res.json();
      if (data.entries && data.entries.length > 0) {
        console.log(`✅ Loaded ${data.entries.length} curated entries from API`);
        return data;
      }
    }
  } catch (apiError) {
    console.warn('Backend API failed:', apiError);
  }

  // Fall back to static bundled data (works in production without backend)
  if (year === 2025 && curatedData2025?.entries?.length > 0) {
    console.log(`✅ Loaded ${curatedData2025.entries.length} curated entries from static bundle`);
    return curatedData2025 as CuratedData;
  }

  return { entries: [], lastUpdated: null };
}

/**
 * Save curated entries
 */
export async function saveCuratedEntries(
  year: number,
  data: {
    entries: TimelineEntry[];
    seasons?: any[];
    settings?: any;
  }
): Promise<CuratedData> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/curated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to save curated entries: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Upload LinkedIn CSV/JSON file
 */
export async function uploadLinkedInFile(
  year: number,
  file: File,
  author: string
): Promise<{ success: boolean; count: number; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('year', year.toString());
  formData.append('author', author);

  const res = await fetch(`${API_BASE}/api/year-in-review/linkedin/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Failed to upload LinkedIn file: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Manually add LinkedIn posts
 */
export async function addLinkedInPosts(
  year: number,
  author: string,
  posts: LinkedInPost[]
): Promise<{ success: boolean; count: number }> {
  const res = await fetch(`${API_BASE}/api/year-in-review/linkedin/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, author, posts }),
  });
  if (!res.ok) {
    throw new Error(`Failed to add LinkedIn posts: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Export year in review data as JSON
 */
export async function exportYearData(year: number = 2025): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/export`);
  if (!res.ok) {
    throw new Error(`Failed to export data: ${res.statusText}`);
  }
  return res.blob();
}

/**
 * Delete a manual entry
 */
export async function deleteManualEntry(year: number, entryId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/year-in-review/${year}/entries/manual/${entryId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete entry: ${res.statusText}`);
  }
}

/**
 * Helper: Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Helper: Format date as month/day
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Helper: Get season name from month
 */
export function getSeasonFromMonth(month: number): string {
  if (month >= 0 && month <= 2) return 'Planting';
  if (month >= 3 && month <= 5) return 'Growing';
  if (month >= 6 && month <= 8) return 'Harvesting';
  return 'Resting';
}

/**
 * Helper: Source icon
 */
export function getSourceIcon(source: string): string {
  switch (source) {
    case 'gmail':
      return '📧';
    case 'notion':
      return '📚';
    case 'linkedin':
      return '💼';
    default:
      return '📝';
  }
}

/**
 * Helper: Entry type color
 */
export function getTypeColor(type: string): string {
  switch (type) {
    case 'project':
      return '#3a7ca5';
    case 'milestone':
      return '#ffa857';
    case 'funding':
      return '#59c3c3';
    case 'partnership':
      return '#f7a399';
    case 'launch':
      return '#d8d8f6';
    case 'social':
      return '#0077b5'; // LinkedIn blue
    default:
      return '#64748b';
  }
}

// ========================================
// CONTENT GENERATION API
// ========================================

export interface GeneratedProjectContent {
  subtitle?: string;
  contentBlocks: ContentBlock[];
  suggestedTags?: string[];
  metaDescription?: string;
}

export interface ContentBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'quote' | 'image' | 'video' | 'callout' | 'divider';
  data: {
    text?: string;
    level?: 1 | 2 | 3;
    quoteText?: string;
    quoteAuthor?: string;
    [key: string]: unknown;
  };
}

export interface GeneratedTimelineDescription {
  description: string;
  suggestedTitle?: string;
  suggestedTags?: string[];
}

export interface TimelineSuggestion {
  title: string;
  description: string;
  type: string;
  suggestedDate: string;
  suggestedSeason: number;
  tags: string[];
  reasoning: string;
}

export interface ContentGenerationResult<T> {
  success: boolean;
  generated?: T;
  error?: string;
  ai?: {
    provider: string;
    model?: string;
  };
}

/**
 * Check AI provider status
 */
export async function getAIStatus(): Promise<{
  success: boolean;
  providers: Record<string, { available: boolean; model?: string; quality?: string }>;
  available: boolean;
}> {
  const res = await fetch(`${API_BASE}/api/content-generation/status`);
  if (!res.ok) {
    throw new Error(`Failed to check AI status: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Generate content for a project story page
 */
export async function generateProjectStory(
  projectData: {
    name: string;
    description?: string;
    aiSummary?: string;
    area?: string;
    status?: string;
    place?: string;
    themes?: string[];
  },
  options: {
    depth?: 'brief' | 'standard' | 'detailed';
    includeQuote?: boolean;
    focusAreas?: string[];
  } = {}
): Promise<ContentGenerationResult<GeneratedProjectContent>> {
  const res = await fetch(`${API_BASE}/api/content-generation/project-story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectData, ...options }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    return { success: false, error: error.error || res.statusText };
  }
  return res.json();
}

/**
 * Generate enriched description for a timeline entry
 */
export async function generateTimelineDescription(
  entryData: {
    title: string;
    description?: string;
    source?: string;
    type?: string;
    date?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  },
  options: {
    maxLength?: number;
    style?: 'narrative' | 'bullet' | 'impact';
  } = {}
): Promise<ContentGenerationResult<GeneratedTimelineDescription>> {
  const res = await fetch(`${API_BASE}/api/content-generation/timeline-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryData, ...options }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    return { success: false, error: error.error || res.statusText };
  }
  return res.json();
}

/**
 * Generate suggestions for new timeline entries
 */
export async function generateTimelineIdeas(
  existingEntries: TimelineEntry[],
  notionData: {
    projects?: { id: string; name: string }[];
    opportunities?: { id: string; name: string }[];
    people?: { id: string; name: string }[];
  } = {},
  options: {
    count?: number;
    season?: number | null;
    type?: string | null;
  } = {}
): Promise<{
  success: boolean;
  suggestions: TimelineSuggestion[];
  analysis?: {
    typeBreakdown: Record<string, number>;
    monthBreakdown: Record<number, number>;
    gaps: string[];
  };
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/content-generation/timeline-ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      year: 2025,
      existingEntries,
      notionData,
      ...options,
    }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    return { success: false, suggestions: [], error: error.error || res.statusText };
  }
  return res.json();
}

/**
 * Generate content for multiple projects at once
 */
export async function bulkGenerateProjectStories(
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    area?: string;
    themes?: string[];
  }>,
  options: {
    depth?: 'brief' | 'standard' | 'detailed';
    concurrency?: number;
  } = {}
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    projectId: string;
    projectName: string;
    success: boolean;
    generated?: GeneratedProjectContent;
    error?: string;
  }>;
}> {
  const res = await fetch(`${API_BASE}/api/content-generation/bulk-projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects, ...options }),
  });
  if (!res.ok) {
    throw new Error(`Bulk generation failed: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Generate and apply content to an existing review project
 */
export async function generateAndApplyToProject(
  year: number,
  slug: string,
  projectData: Record<string, unknown> = {},
  options: {
    depth?: 'brief' | 'standard' | 'detailed';
    includeQuote?: boolean;
    focusAreas?: string[];
    autoSave?: boolean;
  } = {}
): Promise<{
  success: boolean;
  saved: boolean;
  project: Record<string, unknown>;
  generated: GeneratedProjectContent;
  ai?: { provider: string; model: string };
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/content-generation/apply-to-project/${year}/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectData, ...options }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || res.statusText);
  }
  return res.json();
}

/**
 * Generate content directly from a Notion project
 */
export async function generateFromNotionProject(
  notionProjectId: string,
  options: {
    depth?: 'brief' | 'standard' | 'detailed';
    includeQuote?: boolean;
    focusAreas?: string[];
  } = {}
): Promise<ContentGenerationResult<GeneratedProjectContent> & { notionProject?: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/api/content-generation/from-notion/${notionProjectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    return { success: false, error: error.error || res.statusText };
  }
  return res.json();
}
