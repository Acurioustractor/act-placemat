/**
 * Year in Review Shared Types
 *
 * SOURCE: ACT Main Website - /src/types/shared/year-in-review.ts
 * SYNCED: 2025-12-27
 *
 * DO NOT MODIFY - This file is copied from ACT Main Website (source of truth)
 * Any changes must be made in the source repository first
 */

export type DataSource = 'gmail' | 'notion' | 'linkedin' | 'manual';
export type EntryType = 'project' | 'milestone' | 'partnership' | 'funding' | 'launch' | 'communication' | 'social';
export type VideoPlatform = 'loom' | 'youtube' | 'vimeo' | 'direct' | 'descript' | 'unknown';
export type ContentBlockType = 'paragraph' | 'heading' | 'image' | 'gallery' | 'video' | 'quote' | 'callout' | 'divider' | 'stats';

export interface Season {
  name: string;
  months: number[];
  subtitle: string;
  color: string;
  index: number;
  entries: TimelineEntry[];
}

export interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  source: DataSource;
  type: EntryType;
  tags: string[];
  photos?: string[];
  quote?: {
    text: string;
    author: string;
  };
  metadata?: {
    notionUrl?: string;
    amount?: number;
    organization?: string;
    from?: string;
    author?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    area?: string;
    funding?: string;
    status?: string;
    videoUrl?: string;
    imageUrl?: string;
  };
  // Admin curation fields
  included?: boolean;
  editedTitle?: string;
  editedDescription?: string;
  seasonOverride?: number;
  sortOrder?: number;

  // Hero media (from review_media_links)
  heroImageId?: string;
  heroImageUrl?: string;
  heroImageAlt?: string;

  // Video embed (from review_videos)
  heroVideoUrl?: string;
  heroVideoPlatform?: VideoPlatform;
  heroVideoTitle?: string;

  // Project page link
  hasProjectPage?: boolean;
  projectSlug?: string;

  // Featured status
  isFeatured?: boolean;
  featuredOrder?: number;
}

export interface YearMetrics {
  // Human-centered metrics
  peopleEngaged: number;
  conversationsHad: number;
  kmsTraveled: number;
  countriesVisited: number;
  communitiesReached: number;

  // Project metrics
  projectsCompleted: number;
  projectsActive: number;
  milestonesReached: number;

  // Story & content metrics
  storiesCaptured: number;
  eventsAttended: number;
  workshopsRun: number;

  // Connection metrics
  partnershipsFormed: number;
  introductionsMade: number;

  // Creative extras
  cupsOfTea: number;
  sunrisesMissed: number;
  lateNights: number;

  themes: Record<string, number>;
  places: string[];

  // Cultural & personal sections (optional)
  favouriteTunes?: TuneItem[];
  concertsAttended?: ConcertItem[];
  inspiringArt?: ArtItem[];
  familyMoments?: FamilyMoment[];
  internationalTrips?: TripItem[];
}

// Cultural section types
export interface TuneItem {
  title: string;
  artist: string;
  albumArt?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  whyWeLoveIt?: string;
}

export interface ConcertItem {
  artist: string;
  venue: string;
  city: string;
  date: string;
  image?: string;
  highlight?: string;
  ticketStub?: string;
}

export interface ArtItem {
  title: string;
  artist: string;
  image?: string;
  medium?: string;
  inspiration?: string;
  link?: string;
  aspectRatio?: number;
}

export interface FamilyMoment {
  description: string;
  image?: string;
  date?: string;
  people?: string[];
}

export interface TripItem {
  destination: string;
  country: string;
  flag?: string;
  purpose: string;
  highlights?: string[];
  image?: string;
}

export interface YearInReviewData {
  year: number;
  seasons: Season[];
  timeline: Season[];
  metrics: YearMetrics;
  rawData: {
    notion: {
      projects: any[];
      people: any[];
      opportunities: any[];
      activities: any[];
      stories: any[];
    };
    gmail: any[];
    linkedin: any[];
  };
}

export interface CuratedData {
  entries: TimelineEntry[];
  seasons?: Season[];
  settings?: {
    heroTitle?: string;
    heroSubtitle?: string;
    introText?: string;
    featuredProjects?: Record<number, FeaturedSeasonProject>;
    redevelopmentSites?: RedevelopmentSite[];
    deletedEntryIds?: string[];
    // Cultural & personal sections
    favouriteTunes?: TuneItem[];
    concertsAttended?: ConcertItem[];
    inspiringArt?: ArtItem[];
    familyMoments?: FamilyMoment[];
    internationalTrips?: TripItem[];
  };
  lastUpdated: string | null;
}

export interface FeaturedSeasonProject {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage?: string;
  heroVideo?: string;
  stats?: Array<{
    value: string;
    label: string;
  }>;
  quote?: {
    text: string;
    author: string;
    role?: string;
  };
  tags?: string[];
  accentColor: string;
  layout?: 'left' | 'right' | 'center';
}

export interface RedevelopmentSite {
  id: string;
  location: string;
  traditionalName?: string;
  region: string;
  projectSlug?: string;
  description: string;
  partner: {
    name: string;
    logo?: string;
    description: string;
  };
  beforeImage?: string;
  afterImage?: string;
  droneVideo?: string;
  droneImage?: string;
  stats?: Array<{
    value: string;
    label: string;
  }>;
  accentColor: string;
}

export interface LinkedInPost {
  date: string;
  content: string;
  author?: string;
  likes?: number;
  comments?: number;
  shares?: number;
}

// Constellation canvas types
export interface ConstellationNode {
  id: string;
  x: number;
  y: number;
  seasonIndex: number;
  entry: TimelineEntry;
  connections: string[]; // IDs of connected nodes
}

export interface ConstellationParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  layer: number; // For parallax depth
}

// =============================================
// Review Project Types (Rich Content Pages)
// =============================================

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  data: {
    // Text content
    text?: string;
    level?: 1 | 2 | 3; // For headings

    // Media
    mediaId?: string;
    mediaUrl?: string;
    mediaIds?: string[]; // For galleries
    mediaUrls?: string[]; // For galleries

    // Video
    videoUrl?: string;
    platform?: VideoPlatform;
    videoTitle?: string;

    // Quote
    quoteText?: string;
    quoteAuthor?: string;

    // Callout
    calloutType?: 'info' | 'success' | 'warning' | 'highlight';
    calloutTitle?: string;

    // Display options
    caption?: string;
    altText?: string;
    alignment?: 'left' | 'center' | 'right' | 'full';
  };
}

export interface ReviewProject {
  id: string;
  year: number;
  timelineEntryId: string;
  slug: string;
  title: string;
  subtitle?: string;

  // Template fields
  description?: string;  // Main description text
  tags?: string[];       // Tags for filtering
  season?: string;       // Planting, Growing, Harvesting, Resting

  // Additional project fields
  aiSummary?: string;    // AI-generated summary
  projectLead?: {        // Project lead information
    name: string;
    role?: string;
    avatar?: string;
  };
  lead?: string;         // Simple lead name (legacy)

  // Hero section
  heroImageId?: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
  heroVideoUrl?: string;
  heroVideoType?: VideoPlatform;
  heroCaption?: string;

  // Description video (Loom/YouTube)
  descriptionVideoUrl?: string;
  descriptionVideoType?: VideoPlatform;
  descriptionVideoTitle?: string;

  // Featured photos (up to 6)
  featuredPhotos?: string[];  // Array of image URLs

  // Content
  contentBlocks: ContentBlock[];

  // External links
  liveUrl?: string;      // Live project URL
  repoUrl?: string;      // GitHub/repo URL
  notionUrl?: string;    // Notion page URL

  // Status
  isFeatured: boolean;
  featuredOrder?: number;
  isPublished: boolean;
  publishedAt?: string;

  // SEO
  metaTitle?: string;
  metaDescription?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Associated media (loaded separately)
  gallery?: MediaItem[];
  videos?: VideoEmbed[];
}

export interface MediaItem {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileType: 'photo' | 'video' | 'document';
  title?: string;
  description?: string;
  altText?: string;
  caption?: string;
  isHero?: boolean;
  displayOrder?: number;
}

export interface VideoEmbed {
  id: string;
  platform: VideoPlatform;
  videoId: string;
  embedUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  durationSeconds?: number;
  isFeatured?: boolean;
  displayOrder?: number;
}
