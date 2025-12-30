'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getYearInReviewData,
  getCuratedEntries,
  saveCuratedEntries,
  uploadLinkedInFile,
  addLinkedInPosts,
  formatDate,
  getSourceIcon,
  deleteManualEntry,
} from '../../../lib/yearInReviewApi';
import {
  getReviewProjects,
  createReviewProject,
  updateReviewProject,
  linkMedia,
  getVideos,
  addVideo,
  updateVideo,
  deleteVideo,
  setEntryHeroImage,
  setEntryVideo,
} from '../../../lib/reviewProjectsApi';
import { DEFAULT_FEATURED_PROJECTS } from '../../../lib/featuredProjects';
import { DEFAULT_REDEVELOPMENT_SITES, cloneRedevelopmentSites } from '../../../lib/redevelopmentSites';
import { MediaPicker } from '../../../components/admin/MediaPicker';
import { ProjectSelector } from '../../../components/admin/ProjectSelector';
import { QuickEntryForm } from '../../../components/admin/QuickEntryForm';
import { EntryDetailPanel } from '../../../components/admin/EntryDetailPanel';
import { ToastProvider, useToast, ToastStyles } from '../../../components/admin/Toast';
import { useAdminShortcuts, useUnsavedChangesWarning } from '../../../components/admin/useAdminShortcuts';
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from '../../../components/admin/KeyboardShortcutsHelp';
import { useProject, matchesProject } from '../../../lib/projectContext';
import type {
  YearInReviewData,
  CuratedData,
  TimelineEntry,
  LinkedInPost,
  ReviewProject,
  MediaItem,
  VideoEmbed,
  FeaturedSeasonProject,
  RedevelopmentSite,
} from '../../../types/yearInReview';

const SEASONS = ['Planting', 'Growing', 'Harvesting', 'Resting'];
const SEASON_COLORS = ['#59c3c3', '#ffa857', '#f7a399', '#d8d8f6'];
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Helper to extract platform and videoId from embed URL
function parseVideoUrl(embedUrl: string): { platform: string; videoId: string | null } {
  if (!embedUrl) return { platform: 'direct', videoId: null };

  // YouTube patterns
  // youtube.com/watch?v=VIDEO_ID
  // youtube.com/embed/VIDEO_ID
  // youtu.be/VIDEO_ID
  const youtubeMatch = embedUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return { platform: 'youtube', videoId: youtubeMatch[1] };
  }

  // Loom patterns
  // loom.com/share/VIDEO_ID
  // loom.com/embed/VIDEO_ID
  const loomMatch = embedUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return { platform: 'loom', videoId: loomMatch[1] };
  }

  // Vimeo patterns
  // vimeo.com/VIDEO_ID
  // player.vimeo.com/video/VIDEO_ID
  const vimeoMatch = embedUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch) {
    return { platform: 'vimeo', videoId: vimeoMatch[1] };
  }

  // Descript patterns
  // share.descript.com/view/VIDEO_ID
  // share.descript.com/embed/VIDEO_ID
  const descriptMatch = embedUrl.match(/share\.descript\.com\/(?:view|embed)\/([a-zA-Z0-9]+)/);
  if (descriptMatch) {
    return { platform: 'descript', videoId: descriptMatch[1] };
  }

  // Direct video files
  if (embedUrl.match(/\.(mp4|webm|ogg|mov|m4v)($|\?|#)/i)) {
    return { platform: 'direct', videoId: null };
  }

  return { platform: 'unknown', videoId: null };
}

// Helper to get proper embed URL for iframe (handles Descript /view/ vs /embed/)
function getProperEmbedUrl(embedUrl: string): string {
  if (!embedUrl) return '';
  // Descript URLs need /embed/ not /view/ for iframe embedding
  if (embedUrl.includes('share.descript.com/view/')) {
    return embedUrl.replace('/view/', '/embed/');
  }
  // Loom URLs need /embed/ not /share/
  if (embedUrl.includes('loom.com/share/')) {
    return embedUrl.replace('/share/', '/embed/');
  }
  return embedUrl;
}

// Helper to get video thumbnail URL - parses from embedUrl
function getVideoThumbnailUrl(embedUrl: string, existingThumbnail?: string): string | null {
  if (existingThumbnail) return existingThumbnail;
  if (!embedUrl) return null;

  const { platform, videoId } = parseVideoUrl(embedUrl);
  if (!videoId) return null;

  switch (platform) {
    case 'youtube':
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    case 'loom':
      return `https://cdn.loom.com/sessions/thumbnails/${videoId}-with-play.gif`;
    case 'descript':
    case 'vimeo':
      // These platforms don't have public thumbnail APIs
      // Will use branded placeholder instead
      return null;
    default:
      return null;
  }
}

// Platform badge colors for video library
function getVideoPlatformColor(platform?: string): string {
  switch (platform) {
    case 'youtube': return 'bg-red-500';
    case 'loom': return 'bg-purple-500';
    case 'vimeo': return 'bg-blue-500';
    case 'descript': return 'bg-teal-500';
    default: return 'bg-slate-500';
  }
}

type TabType =
  | 'entries'
  | 'projects'
  | 'featured'
  | 'featuredProjects'
  | 'redevelopment'
  | 'media'
  | 'videos'
  | 'linkedin'
  | 'settings';
type FeaturedProjectsBySeason = Record<number, FeaturedSeasonProject>;
const TAB_ORDER: TabType[] = [
  'entries',
  'projects',
  'featured',
  'featuredProjects',
  'redevelopment',
  'media',
  'videos',
  'linkedin',
  'settings',
];
const TAB_LABELS: Record<TabType, string> = {
  entries: 'entries',
  projects: 'projects',
  featured: 'featured entries',
  featuredProjects: 'featured projects',
  redevelopment: 'land redevelopment',
  media: 'media',
  videos: 'videos',
  linkedin: 'linkedin',
  settings: 'settings',
};

// Wrapper component with ToastProvider
export default function YearInReviewAdmin() {
  return (
    <ToastProvider>
      <ToastStyles />
      <YearInReviewAdminInner />
    </ToastProvider>
  );
}

function YearInReviewAdminInner() {
  const router = useRouter();
  const toast = useToast();
  const { selectedProject, isProjectSelected } = useProject();
  const keyboardHelp = useKeyboardShortcutsHelp();
  const [data, setData] = useState<YearInReviewData | null>(null);
  const [curated, setCurated] = useState<CuratedData | null>(null);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [videos, setVideos] = useState<VideoEmbed[]>([]);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('entries');

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<string>('');

  // Bulk selection for entries
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [filterSeason, setFilterSeason] = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<{
    heroTitle: string;
    heroSubtitle: string;
    introText: string;
    featuredProjects: FeaturedProjectsBySeason;
    redevelopmentSites: RedevelopmentSite[];
    deletedEntryIds: string[];
  }>({
    heroTitle: 'Growing Curious',
    heroSubtitle: 'Our Journey Through the 2025 Seasons',
    introText: '',
    featuredProjects: {},
    redevelopmentSites: cloneRedevelopmentSites(),
    deletedEntryIds: [],
  });

  // LinkedIn upload state
  const [linkedInAuthor, setLinkedInAuthor] = useState('');
  const [linkedInPosts, setLinkedInPosts] = useState<LinkedInPost[]>([{ date: '', content: '' }]);

  // Media picker state
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  type RedevelopmentMediaField = 'beforeImage' | 'afterImage' | 'droneImage';
  type MediaPickerTarget =
    | { type: 'entry'; id: string }
    | { type: 'season'; id: string }
    | { type: 'featuredProject'; id: string }
    | { type: 'redevelopmentSite'; siteId: string; field: RedevelopmentMediaField };
  const [mediaPickerTarget, setMediaPickerTarget] = useState<MediaPickerTarget | null>(null);

  // Video input state
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoInputTarget, setVideoInputTarget] = useState<{ type: string; id: string } | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  // Video editing state
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState('');
  const [editVideoDescription, setEditVideoDescription] = useState('');
  const [editVideoProjectId, setEditVideoProjectId] = useState<string>('');
  const [videoSaving, setVideoSaving] = useState(false);

  // Media management state
  const [notionProjects, setNotionProjects] = useState<{id: string; name: string; coverImage?: string; status?: string}[]>([]);
  const [mediaViewMode, setMediaViewMode] = useState<'grid' | 'list'>('list');
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [mediaSearchTerm, setMediaSearchTerm] = useState('');
  const [bulkProjectId, setBulkProjectId] = useState('');
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);

  // Project management state
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectSubtitle, setNewProjectSubtitle] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [creatingProjectId, setCreatingProjectId] = useState<string | null>(null);

  // Quick entry and detail panel state
  const [showQuickEntryForm, setShowQuickEntryForm] = useState(false);
  const [selectedEntryForDetail, setSelectedEntryForDetail] = useState<TimelineEntry | null>(null);

  // Video filter state
  const [videoProjectFilter, setVideoProjectFilter] = useState<string>('');

  // Drag and drop state for featured entries
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [dragOverEntryId, setDragOverEntryId] = useState<string | null>(null);

  // Ref for search input (for keyboard shortcut focus)
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track unsaved changes
  useEffect(() => {
    const currentState = JSON.stringify({ entries, settings });
    if (lastSavedState && currentState !== lastSavedState) {
      setHasUnsavedChanges(true);
    }
  }, [entries, settings, lastSavedState]);

  // Warn before leaving with unsaved changes
  useUnsavedChangesWarning(hasUnsavedChanges);

  // Keyboard shortcuts
  useAdminShortcuts({
    onSave: () => {
      if (!saving) handleSave();
    },
    onSearch: () => {
      searchInputRef.current?.focus();
    },
    onNewEntry: () => {
      if (activeTab === 'entries') setShowQuickEntryForm(true);
    },
    onEscape: () => {
      // Close modals and clear selections
      if (selectedEntryForDetail) {
        setSelectedEntryForDetail(null);
      } else if (showQuickEntryForm) {
        setShowQuickEntryForm(false);
      } else if (showMediaPicker) {
        setShowMediaPicker(false);
      } else if (showVideoInput) {
        setShowVideoInput(false);
      } else if (selectedEntryIds.size > 0) {
        setSelectedEntryIds(new Set());
      } else if (keyboardHelp.isOpen) {
        keyboardHelp.close();
      }
    },
    onSelectAll: () => {
      if (activeTab === 'entries') {
        const allIds = new Set(filteredEntries.map(e => e.id));
        setSelectedEntryIds(allIds);
      }
    },
    enabled: true,
  });

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const [yearData, curatedData, projectsData, videosData] = await Promise.all([
          getYearInReviewData(2025),
          getCuratedEntries(2025),
          getReviewProjects(2025, true).catch(() => []),
          getVideos(2025).catch(() => [])
        ]);

        setData(yearData);
        setCurated(curatedData);
        setProjects(projectsData);
        setVideos(videosData);

        // Build entries list: use curated entries as base, only add NEW entries from timeline
        const curatedIds = new Set(curatedData.entries.map((c) => c.id));

        // Start with curated entries (preserves deletions)
        const deletedIds = new Set((curatedData.settings?.deletedEntryIds as string[]) || []);

        const curatedEntriesWithProjects = curatedData.entries
          .filter((c) => !deletedIds.has(c.id))
          .map((c) => {
            const project = projectsData.find((p: ReviewProject) => p.timelineEntryId === c.id);
            return {
              ...c,
              hasProjectPage: !!project,
              projectSlug: project?.slug,
            };
          });

        // Find truly NEW entries from Notion that aren't in curated data yet
        const newEntries = yearData.timeline.flatMap((season) =>
          season.entries
            .filter((e) => !curatedIds.has(e.id) && !deletedIds.has(e.id))
            .map((e) => {
              const project = projectsData.find((p: ReviewProject) => p.timelineEntryId === e.id);
              return {
                ...e,
                included: true, // New entries default to included
                hasProjectPage: !!project,
                projectSlug: project?.slug,
              };
            })
        );

        // Combine: curated entries + new entries
        const allEntries = [...curatedEntriesWithProjects, ...newEntries];

        setEntries(allEntries);

        if (curatedData.settings) {
          setSettings(prev => {
            const curatedSettings = curatedData.settings as any;
            const redevelopmentSites =
              curatedSettings.redevelopmentSites && curatedSettings.redevelopmentSites.length > 0
                ? curatedSettings.redevelopmentSites
                : cloneRedevelopmentSites();

            return {
              ...prev,
              ...curatedSettings,
              redevelopmentSites,
            };
          });
        }

        // Load media items
        try {
          const mediaRes = await fetch(`${API_BASE}/api/year-in-review/2025/media/all?limit=500`);
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            setMediaItems(mediaData.media || []);
          }
        } catch (e) {
          console.error('Failed to load media:', e);
        }

        // Load Notion projects for tagging
        try {
          const projectsRes = await fetch(`${API_BASE}/api/real/projects`);
          if (projectsRes.ok) {
            const projectsData = await projectsRes.json();
            const projectList = (projectsData.projects || [])
              .filter((p: any) => p.name && p.name !== 'Unknown')
              .sort((a: any, b: any) => a.name.localeCompare(b.name));
            setNotionProjects(projectList);
          }
        } catch (e) {
          console.error('Failed to load projects:', e);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Save curated entries
  const handleSave = useCallback(
    async (overrides?: { entries?: TimelineEntry[]; settings?: Record<string, unknown> }) => {
      setSaving(true);
      try {
        const entriesToSave = overrides?.entries ?? entries;
        const settingsToSave = overrides?.settings ?? settings;
      await saveCuratedEntries(2025, {
        entries: entriesToSave,
        settings: settingsToSave,
      });
      const currentState = JSON.stringify({ entries: entriesToSave, settings: settingsToSave });
      setLastSavedState(currentState);
      setHasUnsavedChanges(false);
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  }, [entries, settings, toast]);

  // Toggle entry inclusion
  const toggleEntry = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, included: !e.included } : e)));
  };

  // Toggle featured
  const toggleFeatured = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, isFeatured: !e.isFeatured } : e)));
  };

  // Update entry
  const updateEntry = (id: string, updates: Partial<TimelineEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  // Drag and drop handlers for featured entries reordering
  const handleFeaturedDragStart = (e: React.DragEvent, entryId: string) => {
    setDraggedEntryId(entryId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', entryId);
    // Add drag image styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleFeaturedDragEnd = (e: React.DragEvent) => {
    setDraggedEntryId(null);
    setDragOverEntryId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleFeaturedDragOver = (e: React.DragEvent, entryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (entryId !== draggedEntryId) {
      setDragOverEntryId(entryId);
    }
  };

  const handleFeaturedDrop = (e: React.DragEvent, targetId: string, seasonIndex: number) => {
    e.preventDefault();
    if (!draggedEntryId || draggedEntryId === targetId) {
      setDraggedEntryId(null);
      setDragOverEntryId(null);
      return;
    }

    // Get all featured entries for this season, sorted by order
    const seasonFeatured = entries
      .filter(entry => {
        if (!entry.isFeatured) return false;
        const month = new Date(entry.date).getMonth();
        const entrySeason = entry.seasonOverride ?? Math.floor(month / 3);
        return entrySeason === seasonIndex;
      })
      .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));

    const draggedIndex = seasonFeatured.findIndex(e => e.id === draggedEntryId);
    const targetIndex = seasonFeatured.findIndex(e => e.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedEntryId(null);
      setDragOverEntryId(null);
      return;
    }

    // Reorder the array
    const reordered = [...seasonFeatured];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Update featuredOrder for all items in this season
    const orderUpdates = new Map<string, number>();
    reordered.forEach((entry, index) => {
      orderUpdates.set(entry.id, index + 1);
    });

    setEntries(prev => prev.map(entry => {
      const newOrder = orderUpdates.get(entry.id);
      if (newOrder !== undefined) {
        return { ...entry, featuredOrder: newOrder };
      }
      return entry;
    }));

    setHasUnsavedChanges(true);
    setDraggedEntryId(null);
    setDragOverEntryId(null);
  };

  // Move featured entry up or down within its season
  const moveFeaturedEntry = (entryId: string, direction: 'up' | 'down', seasonIndex: number) => {
    const seasonFeatured = entries
      .filter(entry => {
        if (!entry.isFeatured) return false;
        const month = new Date(entry.date).getMonth();
        const entrySeason = entry.seasonOverride ?? Math.floor(month / 3);
        return entrySeason === seasonIndex;
      })
      .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));

    const currentIndex = seasonFeatured.findIndex(e => e.id === entryId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= seasonFeatured.length) return;

    // Swap the items
    const reordered = [...seasonFeatured];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];

    // Update featuredOrder
    const orderUpdates = new Map<string, number>();
    reordered.forEach((entry, index) => {
      orderUpdates.set(entry.id, index + 1);
    });

    setEntries(prev => prev.map(entry => {
      const newOrder = orderUpdates.get(entry.id);
      if (newOrder !== undefined) {
        return { ...entry, featuredOrder: newOrder };
      }
      return entry;
    }));

    setHasUnsavedChanges(true);
  };

  const upsertFeaturedProject = (seasonIndex: number, updates: Partial<FeaturedSeasonProject>) => {
    setSettings(prev => {
      const fromDefaults = (DEFAULT_FEATURED_PROJECTS as Record<number, FeaturedSeasonProject>)[seasonIndex] ?? {
        id: `featured-${seasonIndex}`,
        slug: '',
        title: '',
        subtitle: '',
        description: '',
        accentColor: SEASON_COLORS[seasonIndex] || '#59c3c3',
        layout: seasonIndex % 2 === 0 ? 'left' : 'right',
      };
      const existing = prev.featuredProjects?.[seasonIndex] || fromDefaults;

      return {
        ...prev,
        featuredProjects: {
          ...prev.featuredProjects,
          [seasonIndex]: { ...existing, ...updates }
        }
      };
    });
  };

  const getRedevelopmentSites = (source?: RedevelopmentSite[]) =>
    source && source.length > 0 ? source : cloneRedevelopmentSites();

  const updateRedevelopmentSite = (siteId: string, updates: Partial<RedevelopmentSite>) => {
    setSettings(prev => {
      const sites = getRedevelopmentSites(prev.redevelopmentSites);
      return {
        ...prev,
        redevelopmentSites: sites.map(site => (site.id === siteId ? { ...site, ...updates } : site)),
      };
    });
  };

  const addRedevelopmentSite = () => {
    setSettings(prev => {
      const base = getRedevelopmentSites(prev.redevelopmentSites);
      const newSite: RedevelopmentSite = {
        id: `redevelopment-${Date.now()}`,
        location: 'New Site',
        region: '',
        description: '',
        partner: {
          name: '',
          description: '',
        },
        accentColor: '#59c3c3',
        stats: [],
      };
      return {
        ...prev,
        redevelopmentSites: [...base, newSite],
      };
    });
  };

  const removeRedevelopmentSite = (siteId: string) => {
    setSettings(prev => ({
      ...prev,
      redevelopmentSites: (prev.redevelopmentSites || []).filter(site => site.id !== siteId),
    }));
  };

  const updateRedevelopmentSiteStat = (
    siteId: string,
    index: number,
    updates: Partial<{ value: string; label: string }>
  ) => {
    setSettings(prev => {
      const sites = prev.redevelopmentSites || [];
      return {
        ...prev,
        redevelopmentSites: sites.map(site => {
          if (site.id !== siteId) return site;
          const stats = site.stats ? [...site.stats] : [];
          stats[index] = { ...stats[index], ...updates };
          return { ...site, stats };
        }),
      };
    });
  };

  const addRedevelopmentSiteStat = (siteId: string) => {
    setSettings(prev => {
      const sites = prev.redevelopmentSites || [];
      return {
        ...prev,
        redevelopmentSites: sites.map(site => {
          if (site.id !== siteId) return site;
          const stats = site.stats ? [...site.stats, { value: '', label: '' }] : [{ value: '', label: '' }];
          return { ...site, stats };
        }),
      };
    });
  };

  const removeRedevelopmentSiteStat = (siteId: string, index: number) => {
    setSettings(prev => {
      const sites = prev.redevelopmentSites || [];
      return {
        ...prev,
        redevelopmentSites: sites.map(site => {
          if (site.id !== siteId) return site;
          const stats = site.stats ? site.stats.filter((_, i) => i !== index) : [];
          return { ...site, stats };
        }),
      };
    });
  };

  const parseTags = (value: string): string[] =>
    value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

  const openFeaturedHeroPicker = (seasonIndex: number) => {
    setMediaPickerTarget({ type: 'featuredProject', id: String(seasonIndex) });
    setShowMediaPicker(true);
  };

  const openRedevelopmentMediaPicker = (siteId: string, field: RedevelopmentMediaField) => {
    setMediaPickerTarget({ type: 'redevelopmentSite', siteId, field });
    setShowMediaPicker(true);
  };

  const autofillFeaturedFromProject = (seasonIndex: number, slug: string) => {
    const project = projects.find(p => p.slug === slug);
    if (!project) return;
    upsertFeaturedProject(seasonIndex, {
      slug: project.slug,
      title: project.title,
      subtitle: project.subtitle || '',
      description: project.metaDescription || project.subtitle || '',
      heroImage: project.heroImageUrl || undefined,
    });
  };

  // Sync featured status to database when a project is added/removed from featured
  const syncFeaturedStatus = async (slug: string, isFeatured: boolean) => {
    try {
      await updateReviewProject(2025, slug, { isFeatured });
      // Update local state
      setProjects(prev => prev.map(p =>
        p.slug === slug ? { ...p, isFeatured } : p
      ));
    } catch (err) {
      console.error('Failed to sync featured status:', err);
    }
  };

  // Handle featured project selection with database sync
  const handleFeaturedProjectChange = async (seasonIndex: number, newSlug: string) => {
    // Get the old slug before updating
    const oldSlug = settings.featuredProjects?.[seasonIndex]?.slug;

    // Update the settings
    upsertFeaturedProject(seasonIndex, { slug: newSlug });
    if (newSlug) autofillFeaturedFromProject(seasonIndex, newSlug);

    // Sync featured status to database
    if (oldSlug && oldSlug !== newSlug) {
      // Check if oldSlug is still featured in another season
      const stillFeatured = Object.entries(settings.featuredProjects || {})
        .some(([idx, fp]) => parseInt(idx) !== seasonIndex && fp.slug === oldSlug);
      if (!stillFeatured) {
        syncFeaturedStatus(oldSlug, false);
      }
    }
    if (newSlug) {
      syncFeaturedStatus(newSlug, true);
    }
  };

  // Create project page for entry
  const handleCreateProject = async (entry: TimelineEntry) => {
    try {
      const result = await createReviewProject(2025, {
        timelineEntryId: entry.id,
        title: entry.editedTitle || entry.title,
        subtitle: (entry.editedDescription || entry.description).substring(0, 200),
      });

      const newProject = result.project;
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === newProject.id);
        return exists ? prev : [...prev, newProject];
      });

      updateEntry(entry.id, {
        hasProjectPage: true,
        projectSlug: result.slug,
      });
      if (selectedEntryForDetail?.id === entry.id) {
        setSelectedEntryForDetail((prev) =>
          prev ? { ...prev, hasProjectPage: true, projectSlug: result.slug } : null
        );
      }

      router.push(`/2025-review/admin/projects/${result.slug}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project page');
    }
  };

  const handleLinkEntryToProject = (entry: TimelineEntry, project: ReviewProject | null) => {
    const updates: Partial<TimelineEntry> = {
      hasProjectPage: !!project,
      projectSlug: project?.slug,
    };
    updateEntry(entry.id, updates);
    if (selectedEntryForDetail?.id === entry.id) {
      setSelectedEntryForDetail((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  // Set hero image for entry
  const handleSetHeroImage = async (media: MediaItem) => {
    if (!mediaPickerTarget) return;

    try {
      if (mediaPickerTarget.type === 'entry') {
        await setEntryHeroImage(2025, mediaPickerTarget.id, media.id);
        const updates = { heroImageUrl: media.fileUrl, heroImageId: media.id };
        setEntries(prev => prev.map(e =>
          e.id === mediaPickerTarget.id
            ? { ...e, ...updates }
            : e
        ));
        // Also update the sidebar entry if it's the same one
        if (selectedEntryForDetail?.id === mediaPickerTarget.id) {
          setSelectedEntryForDetail(prev => prev ? { ...prev, ...updates } : null);
        }
      } else if (mediaPickerTarget.type === 'featuredProject') {
        const seasonIndex = parseInt(mediaPickerTarget.id);
        if (Number.isFinite(seasonIndex)) {
          upsertFeaturedProject(seasonIndex, { heroImage: media.fileUrl });
        }
      } else if (mediaPickerTarget.type === 'redevelopmentSite') {
        updateRedevelopmentSite(mediaPickerTarget.siteId, {
          [mediaPickerTarget.field]: media.fileUrl,
        });
      }
    } catch (error) {
      console.error('Failed to set hero image:', error);
      toast.error('Failed to set hero image');
    }

    setShowMediaPicker(false);
    setMediaPickerTarget(null);
  };

  const redevelopmentSites = getRedevelopmentSites(settings.redevelopmentSites);

  // Add video
  const handleAddVideo = async () => {
    if (!newVideoUrl || !videoInputTarget) return;

    try {
      const video = await addVideo(2025, {
        url: newVideoUrl,
        title: newVideoTitle,
        linkType: videoInputTarget.type,
        linkId: videoInputTarget.id,
      });

      if (videoInputTarget.type === 'timeline_entry') {
        const updates = { heroVideoUrl: video.embedUrl, heroVideoPlatform: video.platform };
        setEntries(prev => prev.map(e =>
          e.id === videoInputTarget.id
            ? { ...e, ...updates }
            : e
        ));
        // Also update the sidebar entry if it's the same one
        if (selectedEntryForDetail?.id === videoInputTarget.id) {
          setSelectedEntryForDetail(prev => prev ? { ...prev, ...updates } : null);
        }
      }

      setVideos(prev => [...prev, video]);
    } catch (error) {
      console.error('Failed to add video:', error);
      toast.error('Failed to add video');
    }

    setShowVideoInput(false);
    setVideoInputTarget(null);
    setNewVideoUrl('');
    setNewVideoTitle('');
  };

  // Delete video
  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteVideo(2025, videoId);
      setVideos(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Failed to delete video:', error);
      toast.error('Failed to delete video');
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entry: TimelineEntry) => {
    if (entry.source === 'manual') {
      // Manual entries can be fully deleted
      if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
      try {
        await deleteManualEntry(2025, entry.id);
        const newEntries = entries.filter((e) => e.id !== entry.id);
        setEntries(newEntries);
        await handleSave({ entries: newEntries });
        toast.success(`Deleted "${entry.title}"`);
        // Close sidebar if this entry was open
        if (selectedEntryForDetail?.id === entry.id) {
          setSelectedEntryForDetail(null);
        }
      } catch (error) {
        console.error('Failed to delete entry:', error);
        toast.error('Failed to delete entry');
      }
    } else {
      // Source entries (notion/gmail/linkedin) - mark as excluded/deleted from timeline
      if (!confirm(`Delete "${entry.title}" from the timeline? It can be restored by re-including it later.`)) return;
      const newEntries = entries.map((e) => (e.id === entry.id ? { ...e, included: false } : e));
      const updatedSettings = {
        ...settings,
        deletedEntryIds: Array.from(new Set([...(settings.deletedEntryIds || []), entry.id]))
      };
      setEntries(newEntries);
      setSettings(updatedSettings);
      await handleSave({ entries: newEntries, settings: updatedSettings });
      toast.success(`Deleted "${entry.title}"`);
    }
  };

  // Bulk delete ALL excluded entries (removes from timeline permanently)
  const handleBulkDeleteExcluded = async () => {
    const excludedEntries = entries.filter(e => e.included === false);
    if (excludedEntries.length === 0) {
      toast.info('No excluded entries to delete');
      return;
    }
    if (!confirm(`Permanently delete ${excludedEntries.length} excluded entries? This cannot be undone.`)) return;

    // Delete manual entries from database
    const excludedManualEntries = excludedEntries.filter(e => e.source === 'manual');
    for (const entry of excludedManualEntries) {
      try {
        await deleteManualEntry(2025, entry.id);
      } catch (error) {
        console.error(`Failed to delete manual entry ${entry.id}:`, error);
      }
    }

    const newEntries = entries.filter(e => e.included !== false);
    setEntries(newEntries);
    await handleSave({ entries: newEntries });
    toast.success(`Deleted ${excludedEntries.length} excluded entries`);
  };

  // Start editing video
  const startEditingVideo = (video: VideoEmbed & { project_id?: string }) => {
    setEditingVideoId(video.id);
    setEditVideoTitle(video.title || '');
    setEditVideoDescription(video.description || '');
    setEditVideoProjectId((video as any).project_id || '');
  };

  // Cancel editing video
  const cancelEditingVideo = () => {
    setEditingVideoId(null);
    setEditVideoTitle('');
    setEditVideoDescription('');
    setEditVideoProjectId('');
  };

  // Save video edits
  const handleUpdateVideo = async () => {
    if (!editingVideoId) return;
    setVideoSaving(true);
    try {
      const updated = await updateVideo(2025, editingVideoId, {
        title: editVideoTitle,
        description: editVideoDescription,
        projectId: editVideoProjectId || null
      });
      setVideos(prev => prev.map(v =>
        v.id === editingVideoId ? { ...v, title: updated.title, description: updated.description, project_id: editVideoProjectId || null } as any : v
      ));
      cancelEditingVideo();
    } catch (error) {
      console.error('Failed to update video:', error);
      toast.error('Failed to update video');
    } finally {
      setVideoSaving(false);
    }
  };

  // Toggle video featured status
  const toggleVideoFeatured = async (videoId: string, currentlyFeatured: boolean) => {
    try {
      const updated = await updateVideo(2025, videoId, { isFeatured: !currentlyFeatured });
      setVideos(prev => prev.map(v =>
        v.id === videoId ? { ...v, isFeatured: updated.isFeatured } : v
      ));
    } catch (error) {
      console.error('Failed to toggle featured:', error);
    }
  };

  // Media management functions
  const toggleMediaSelection = (id: string) => {
    setSelectedMediaIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllMedia = () => {
    const filteredIds = filteredMediaItems.map(m => m.id);
    setSelectedMediaIds(new Set(filteredIds));
  };

  const clearMediaSelection = () => {
    setSelectedMediaIds(new Set());
  };

  // Update single media item
  const updateMediaItem = async (mediaId: string, updates: { title?: string; manual_tags?: string[]; project_ids?: string[] }) => {
    setMediaLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/media/items/${mediaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) throw new Error('Failed to update');

      // Update local state
      setMediaItems(prev => prev.map(m =>
        m.id === mediaId ? { ...m, ...updates } : m
      ));
      setEditingMediaId(null);
    } catch (error) {
      console.error('Failed to update media:', error);
      toast.error('Failed to update media item');
    } finally {
      setMediaLoading(false);
    }
  };

  // Bulk tag media items
  const bulkTagMedia = async () => {
    if (selectedMediaIds.size === 0) {
      toast.warning('Select some media items first');
      return;
    }

    const updates: { project_ids?: string[]; manual_tags?: string[] } = {};
    if (bulkProjectId) {
      updates.project_ids = [bulkProjectId];
    }
    if (bulkTagInput.trim()) {
      updates.manual_tags = bulkTagInput.split(',').map(t => t.trim()).filter(t => t);
    }

    if (!updates.project_ids && !updates.manual_tags) {
      toast.warning('Select a project or enter tags');
      return;
    }

    setMediaLoading(true);
    try {
      const promises = Array.from(selectedMediaIds).map(async (mediaId) => {
        const res = await fetch(`${API_BASE}/api/media/items/${mediaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        return res.ok;
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;

      // Update local state
      setMediaItems(prev => prev.map(m => {
        if (selectedMediaIds.has(m.id)) {
          return {
            ...m,
            project_ids: updates.project_ids ? [...(m.project_ids || []), ...updates.project_ids] : m.project_ids,
            manual_tags: updates.manual_tags ? [...(m.manual_tags || []), ...updates.manual_tags] : m.manual_tags
          };
        }
        return m;
      }));

      toast.success(`Updated ${successCount} of ${selectedMediaIds.size} items`);
      clearMediaSelection();
      setBulkProjectId('');
      setBulkTagInput('');
    } catch (error) {
      console.error('Bulk tag failed:', error);
      toast.error('Failed to update some items');
    } finally {
      setMediaLoading(false);
    }
  };

  // Refresh media list
  const refreshMedia = async () => {
    setMediaLoading(true);
    try {
      const mediaRes = await fetch(`${API_BASE}/api/year-in-review/2025/media/all?limit=500`);
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        setMediaItems(mediaData.media || []);
      }
    } catch (e) {
      console.error('Failed to refresh media:', e);
    } finally {
      setMediaLoading(false);
    }
  };

  // Project management functions
  const filteredNotionProjects = notionProjects.filter((p) => {
    if (!projectSearchTerm) return true;
    return p.name.toLowerCase().includes(projectSearchTerm.toLowerCase());
  });

  const toggleProjectSelection = (id: string) => {
    setSelectedProjectIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const createNewProject = async () => {
    if (!newProjectTitle.trim()) {
      toast.warning('Please enter a project title');
      return;
    }

    setProjectsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/year-in-review/2025/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newProjectTitle,
          subtitle: newProjectSubtitle,
          timelineEntryId: `manual-${Date.now()}` // Generate a unique ID for manual projects
        })
      });

      if (!res.ok) throw new Error('Failed to create project');

      const data = await res.json();
      setProjects(prev => [...prev, data.project]);
      setShowNewProjectModal(false);
      setNewProjectTitle('');
      setNewProjectSubtitle('');

      // Navigate to edit the new project
      router.push(`/2025-review/admin/projects/${data.slug}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setProjectsLoading(false);
    }
  };

  const deleteProject = async (projectId: string, slug: string) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }

    setProjectsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/year-in-review/2025/projects/${slug}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete project');

      setProjects(prev => prev.filter(p => p.id !== projectId));
      setSelectedProjectIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    } finally {
      setProjectsLoading(false);
    }
  };

  const deleteSelectedProjects = async () => {
    if (selectedProjectIds.size === 0) return;

    if (!confirm(`Delete ${selectedProjectIds.size} project(s)? This cannot be undone.`)) {
      return;
    }

    setProjectsLoading(true);
    try {
      const projectsToDelete = projects.filter(p => selectedProjectIds.has(p.id));

      await Promise.all(
        projectsToDelete.map(p =>
          fetch(`${API_BASE}/api/year-in-review/2025/projects/${p.slug}`, { method: 'DELETE' })
        )
      );

      setProjects(prev => prev.filter(p => !selectedProjectIds.has(p.id)));
      setSelectedProjectIds(new Set());
    } catch (error) {
      console.error('Failed to delete projects:', error);
      toast.error('Failed to delete some projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  // Create project from Notion project
  const createFromNotionProject = async (notionProject: {id: string; name: string}) => {
    setCreatingProjectId(notionProject.id);
    try {
      const res = await fetch(`${API_BASE}/api/year-in-review/2025/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notionProject.name,
          subtitle: '',
          timelineEntryId: `notion-${notionProject.id}`
        })
      });

      if (!res.ok) throw new Error('Failed to create project');

      const data = await res.json();

      // Add to local projects list (so it shows as "Already created")
      setProjects(prev => [...prev, {
        ...data.project,
        heroImageUrl: null
      }]);

      // Clear the creating state after a moment to show success
      setTimeout(() => {
        setCreatingProjectId(null);
      }, 500);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
      setCreatingProjectId(null);
    }
  };

  // Entry filter state
  const [filterHasProject, setFilterHasProject] = useState(false);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'month'>('list');

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    // Project filter - check if entry matches selected project
    if (selectedProject) {
      const entryMatchesProject = matchesProject(selectedProject, {
        project_ids: (e as any).project_ids,
        projectId: (e as any).projectId,
        projectSlug: e.projectSlug,
        tags: (e as any).tags,
        manual_tags: (e as any).manual_tags,
      });
      if (!entryMatchesProject) return false;
    }
    if (filterSeason !== null) {
      const month = new Date(e.date).getMonth();
      const season = Math.floor(month / 3);
      if (e.seasonOverride !== undefined ? e.seasonOverride !== filterSeason : season !== filterSeason) return false;
    }
    if (filterSource && e.source !== filterSource) return false;
    if (searchTerm && !e.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterHasProject && !e.hasProjectPage) return false;
    if (filterMonth !== null) {
      const month = new Date(e.date).getMonth();
      if (month !== filterMonth) return false;
    }
    return true;
  });

  // Group entries by month for month view
  const entriesByMonth = filteredEntries.reduce((acc, entry) => {
    const date = new Date(entry.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[monthKey]) {
      acc[monthKey] = { name: monthName, entries: [] };
    }
    acc[monthKey].entries.push(entry);
    return acc;
  }, {} as Record<string, { name: string; entries: TimelineEntry[] }>);

  // Featured entries
  const featuredEntries = entries.filter(e => e.isFeatured);

  // Filtered media items
  const filteredMediaItems = mediaItems.filter((m: any) => {
    // Project filter - check if media matches selected project
    if (selectedProject) {
      const mediaMatchesProject = matchesProject(selectedProject, {
        project_ids: m.project_ids,
        tags: m.tags,
        manual_tags: m.manual_tags,
      });
      if (!mediaMatchesProject) return false;
    }
    if (!mediaSearchTerm) return true;
    const term = mediaSearchTerm.toLowerCase();
    return (
      m.title?.toLowerCase().includes(term) ||
      m.description?.toLowerCase().includes(term) ||
      m.manual_tags?.some((t: string) => t.toLowerCase().includes(term))
    );
  });

  // Handle LinkedIn file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !linkedInAuthor) {
      toast.warning('Please enter an author name first');
      return;
    }

    try {
      const result = await uploadLinkedInFile(2025, file, linkedInAuthor);
      toast.success(`Uploaded ${result.count} posts from ${linkedInAuthor}`);
      window.location.reload();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Check console for details.');
    }
  };

  // Handle manual LinkedIn post submission
  const handleManualLinkedIn = async () => {
    if (!linkedInAuthor) {
      toast.warning('Please enter an author name');
      return;
    }

    const validPosts = linkedInPosts.filter((p) => p.date && p.content);
    if (validPosts.length === 0) {
      toast.warning('Please add at least one post with date and content');
      return;
    }

    try {
      const result = await addLinkedInPosts(2025, linkedInAuthor, validPosts);
      toast.success(`Added ${result.count} posts`);
      setLinkedInPosts([{ date: '', content: '' }]);
      window.location.reload();
    } catch (error) {
      console.error('Failed to add posts:', error);
      toast.error('Failed to add posts. Check console for details.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold">2025 in Review - Admin</h1>
              <p className="text-slate-400 text-sm">Curate entries, manage media, and create project pages</p>
            </div>
            {/* Project Selector */}
            <ProjectSelector coreProjectsOnly={true} />
          </div>
          <div className="flex items-center gap-4">
            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <span className="flex items-center gap-1.5 text-amber-400 text-sm">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                Unsaved
              </span>
            )}
            <Link
              href="/2025-review/admin/generate"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Generate
            </Link>
            <a href="/2025-review" target="_blank" className="text-teal-400 hover:text-teal-300 text-sm">
              Preview Page →
            </a>
            {/* Keyboard shortcuts help */}
            <button
              onClick={keyboardHelp.open}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className={`font-semibold px-6 py-2 rounded-lg transition-colors ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                  : 'bg-teal-500 hover:bg-teal-400 disabled:bg-slate-600 text-slate-900'
              }`}
            >
              {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes*' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TAB_ORDER.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-teal-400 border-b-2 border-teal-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {TAB_LABELS[tab]}
                {tab === 'featured' && featuredEntries.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-teal-500/20 text-teal-400 rounded">
                    {featuredEntries.length}
                  </span>
                )}
                {tab === 'videos' && videos.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-teal-500/20 text-teal-400 rounded">
                    {videos.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Entries Tab */}
        {activeTab === 'entries' && (
          <div>
            {/* Filters */}
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-slate-400 mb-1">Search <kbd className="ml-1 px-1 py-0.5 text-xs bg-slate-600 rounded">Cmd+K</kbd></label>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Season</label>
                  <select
                    value={filterSeason ?? ''}
                    onChange={(e) => setFilterSeason(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">All Seasons</option>
                    {SEASONS.map((s, i) => (
                      <option key={s} value={i}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Month</label>
                  <select
                    value={filterMonth ?? ''}
                    onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">All Months</option>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                      <option key={m} value={i}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Source</label>
                  <select
                    value={filterSource ?? ''}
                    onChange={(e) => setFilterSource(e.target.value || null)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">All Sources</option>
                    <option value="notion">Notion</option>
                    <option value="gmail">Gmail</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                {/* View mode toggle */}
                <div className="flex bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-sm rounded ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1.5 text-sm rounded ${viewMode === 'month' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
                  >
                    By Month
                  </button>
                </div>
              </div>

              {/* Quick filters row */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterHasProject}
                    onChange={(e) => setFilterHasProject(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-300">Has Project Page</span>
                  <span className="text-xs px-1.5 py-0.5 bg-teal-500/20 text-teal-400 rounded">
                    {entries.filter(e => e.hasProjectPage).length}
                  </span>
                </label>
                <span className="text-slate-600">|</span>
                <button
                  onClick={() => {
                    setFilterHasProject(false);
                    setFilterSeason(null);
                    setFilterMonth(null);
                    setFilterSource(null);
                    setSearchTerm('');
                  }}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Clear all filters
                </button>
                <span className="text-slate-600">|</span>
                {/* Bulk selection controls */}
                <button
                  onClick={() => setSelectedEntryIds(new Set(filteredEntries.map(e => e.id)))}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Select all <kbd className="ml-1 px-1 py-0.5 text-xs bg-slate-600 rounded">Cmd+A</kbd>
                </button>
                {selectedEntryIds.size > 0 && (
                  <>
                    <button
                      onClick={() => setSelectedEntryIds(new Set())}
                      className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      Clear selection ({selectedEntryIds.size})
                    </button>
                    <button
                      onClick={() => {
                        const newEntries = entries.map(e =>
                          selectedEntryIds.has(e.id) ? { ...e, included: false } : e
                        );
                        setEntries(newEntries);
                        setHasUnsavedChanges(true);
                        toast.success(`Excluded ${selectedEntryIds.size} entries`);
                        setSelectedEntryIds(new Set());
                      }}
                      className="text-sm px-2 py-0.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                    >
                      Exclude selected
                    </button>
                    <button
                      onClick={() => {
                        const newEntries = entries.map(e =>
                          selectedEntryIds.has(e.id) ? { ...e, included: true } : e
                        );
                        setEntries(newEntries);
                        setHasUnsavedChanges(true);
                        toast.success(`Included ${selectedEntryIds.size} entries`);
                        setSelectedEntryIds(new Set());
                      }}
                      className="text-sm px-2 py-0.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors"
                    >
                      Include selected
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      onClick={() => {
                        const maxOrder = Math.max(0, ...entries.filter(e => e.isFeatured).map(e => e.featuredOrder ?? 0));
                        let order = maxOrder;
                        const newEntries = entries.map(e => {
                          if (selectedEntryIds.has(e.id) && !e.isFeatured) {
                            order++;
                            return { ...e, isFeatured: true, featuredOrder: order };
                          }
                          return e;
                        });
                        setEntries(newEntries);
                        setHasUnsavedChanges(true);
                        const count = [...selectedEntryIds].filter(id => !entries.find(e => e.id === id)?.isFeatured).length;
                        toast.success(`Featured ${count} entries`);
                        setSelectedEntryIds(new Set());
                      }}
                      className="text-sm px-2 py-0.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors"
                    >
                      ★ Feature selected
                    </button>
                    <button
                      onClick={() => {
                        const newEntries = entries.map(e =>
                          selectedEntryIds.has(e.id) ? { ...e, isFeatured: false, featuredOrder: undefined } : e
                        );
                        setEntries(newEntries);
                        setHasUnsavedChanges(true);
                        const count = [...selectedEntryIds].filter(id => entries.find(e => e.id === id)?.isFeatured).length;
                        toast.success(`Unfeatured ${count} entries`);
                        setSelectedEntryIds(new Set());
                      }}
                      className="text-sm px-2 py-0.5 bg-slate-600/50 text-slate-400 hover:bg-slate-600 rounded transition-colors"
                    >
                      ☆ Unfeature selected
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Showing {filteredEntries.length} of {entries.length} entries
                <span className="mx-2">•</span>
                {entries.filter((e) => e.included).length} included
                <span className="mx-2">•</span>
                <span className="text-red-400">{entries.filter((e) => !e.included).length} excluded</span>
                <span className="mx-2">•</span>
                {entries.filter(e => e.hasProjectPage).length} with project pages
                <span className="mx-2">•</span>
                {featuredEntries.length} featured
              </div>
              <div className="flex gap-2">
                {entries.filter(e => e.included === false).length > 0 && (
                  <button
                    onClick={handleBulkDeleteExcluded}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-lg transition-colors"
                    title="Permanently delete all excluded entries"
                  >
                    🗑️ Delete Excluded ({entries.filter(e => e.included === false).length})
                  </button>
                )}
                <button
                  onClick={() => setShowQuickEntryForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Entry
                </button>
              </div>
            </div>

            {/* Entries List or Month View */}
            {viewMode === 'list' ? (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`bg-slate-800 border rounded-lg p-4 ${
                      entry.included ? 'border-slate-700' : 'border-slate-700/50 opacity-50'
                    } ${entry.hasProjectPage ? 'ring-1 ring-teal-500/30' : ''} ${
                      selectedEntryIds.has(entry.id) ? 'ring-2 ring-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection checkbox for bulk actions */}
                      <input
                        type="checkbox"
                        checked={selectedEntryIds.has(entry.id)}
                        onChange={() => {
                          const newSet = new Set(selectedEntryIds);
                          if (newSet.has(entry.id)) {
                            newSet.delete(entry.id);
                          } else {
                            newSet.add(entry.id);
                          }
                          setSelectedEntryIds(newSet);
                        }}
                        className="mt-1 w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                        title="Select for bulk actions"
                      />
                      {/* Include/Exclude checkbox */}
                      <input
                        type="checkbox"
                        checked={entry.included}
                        onChange={() => toggleEntry(entry.id)}
                        className="mt-1 w-5 h-5 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"
                        title={entry.included ? 'Click to exclude' : 'Click to include'}
                      />

                      {/* Hero image thumbnail */}
                      {entry.heroImageUrl && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                          <img src={entry.heroImageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xl">{getSourceIcon(entry.source)}</span>
                          {/* Editable date */}
                          <input
                            type="date"
                            value={entry.date ? entry.date.split('T')[0] : ''}
                            onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                            className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-teal-500"
                          />
                          <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">{entry.type}</span>
                          <select
                            value={entry.seasonOverride ?? Math.floor(new Date(entry.date).getMonth() / 3)}
                            onChange={(e) => updateEntry(entry.id, { seasonOverride: parseInt(e.target.value) })}
                            className="text-xs bg-slate-700 border-none rounded px-2 py-1 text-slate-300"
                          >
                            {SEASONS.map((s, i) => (
                              <option key={s} value={i}>
                                {s}
                              </option>
                            ))}
                          </select>
                          {entry.isFeatured && (
                            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Featured</span>
                          )}
                          {entry.hasProjectPage && (
                            <a
                              href={`/2025-review/admin/projects/${entry.projectSlug}`}
                              className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30"
                            >
                              Edit Project Page →
                            </a>
                          )}
                        </div>

                        <input
                          type="text"
                          value={entry.editedTitle || entry.title}
                          onChange={(e) => updateEntry(entry.id, { editedTitle: e.target.value })}
                          className="w-full bg-transparent border-b border-slate-700 text-white font-semibold mb-2 focus:outline-none focus:border-teal-500"
                        />

                        <textarea
                          value={entry.editedDescription || entry.description}
                          onChange={(e) => updateEntry(entry.id, { editedDescription: e.target.value })}
                          rows={2}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded p-2 text-slate-300 text-sm resize-none focus:outline-none focus:border-teal-500"
                        />

                        {/* Action buttons */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleFeatured(entry.id)}
                            className={`text-xs px-3 py-1.5 rounded transition-colors ${
                              entry.isFeatured
                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            {entry.isFeatured ? '★ Featured' : '☆ Feature'}
                          </button>
                          <button
                            onClick={() => {
                              setMediaPickerTarget({ type: 'entry', id: entry.id });
                              setShowMediaPicker(true);
                            }}
                            className="text-xs px-3 py-1.5 bg-slate-700 text-slate-400 hover:bg-slate-600 rounded transition-colors"
                          >
                            🖼️ Set Hero Image
                          </button>
                          <button
                            onClick={() => {
                              setVideoInputTarget({ type: 'timeline_entry', id: entry.id });
                              setShowVideoInput(true);
                            }}
                            className="text-xs px-3 py-1.5 bg-slate-700 text-slate-400 hover:bg-slate-600 rounded transition-colors"
                          >
                            🎬 Add Video
                          </button>
                          {!entry.hasProjectPage && (
                            <button
                              onClick={() => handleCreateProject(entry)}
                              className="text-xs px-3 py-1.5 bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 rounded transition-colors"
                            >
                              + Create Project Page
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedEntryForDetail(entry)}
                            className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded transition-colors"
                          >
                            Details →
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            className={`text-xs px-3 py-1.5 rounded transition-colors ${
                              !entry.included
                                ? 'bg-red-600/30 text-red-400 hover:bg-red-600/50'
                                : 'bg-slate-700 text-slate-500 hover:bg-red-600/20 hover:text-red-400'
                            }`}
                          >
                            🗑️ Delete
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Month View - Full editing capabilities */
              <div className="space-y-8">
                {Object.entries(entriesByMonth)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([monthKey, { name, entries: monthEntries }]) => (
                    <div key={monthKey} className="bg-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-slate-700/50 px-4 py-3 flex items-center justify-between">
                        <h3 className="font-semibold text-white">{name}</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-400">
                            {monthEntries.length} entries
                          </span>
                          <span className="text-sm text-teal-400">
                            {monthEntries.filter(e => e.included).length} included
                          </span>
                          <span className="text-sm text-purple-400">
                            {monthEntries.filter(e => e.hasProjectPage).length} with projects
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-700">
                        {monthEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={`p-4 ${
                              !entry.included ? 'opacity-50' : ''
                            } ${entry.hasProjectPage ? 'bg-teal-500/5' : ''}`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                checked={entry.included}
                                onChange={() => toggleEntry(entry.id)}
                                className="mt-1 w-5 h-5 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"
                              />

                              {/* Hero image thumbnail */}
                              {entry.heroImageUrl && (
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                                  <img src={entry.heroImageUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {/* Top row: metadata */}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="text-lg">{getSourceIcon(entry.source)}</span>
                                  <input
                                    type="date"
                                    value={entry.date ? entry.date.split('T')[0] : ''}
                                    onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                                    className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-teal-500"
                                  />
                                  <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">{entry.type}</span>
                                  <select
                                    value={entry.seasonOverride ?? Math.floor(new Date(entry.date).getMonth() / 3)}
                                    onChange={(e) => updateEntry(entry.id, { seasonOverride: parseInt(e.target.value) })}
                                    className="text-xs bg-slate-700 border-none rounded px-2 py-1 text-slate-300"
                                  >
                                    {SEASONS.map((s, i) => (
                                      <option key={s} value={i}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                  {entry.isFeatured && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">Featured</span>
                                  )}
                                  {entry.hasProjectPage && (
                                    <a
                                      href={`/2025-review/admin/projects/${entry.projectSlug}`}
                                      className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded hover:bg-teal-500/30"
                                    >
                                      Edit Project Page →
                                    </a>
                                  )}
                                </div>

                                {/* Editable title */}
                                <input
                                  type="text"
                                  value={entry.editedTitle || entry.title}
                                  onChange={(e) => updateEntry(entry.id, { editedTitle: e.target.value })}
                                  className="w-full bg-transparent border-b border-slate-700 text-white font-semibold mb-2 focus:outline-none focus:border-teal-500"
                                />

                                {/* Editable description */}
                                <textarea
                                  value={entry.editedDescription || entry.description}
                                  onChange={(e) => updateEntry(entry.id, { editedDescription: e.target.value })}
                                  rows={2}
                                  className="w-full bg-slate-700/50 border border-slate-600 rounded p-2 text-slate-300 text-sm resize-none focus:outline-none focus:border-teal-500"
                                />

                                {/* Action buttons */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => toggleFeatured(entry.id)}
                                    className={`text-xs px-3 py-1.5 rounded transition-colors ${
                                      entry.isFeatured
                                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                                  >
                                    {entry.isFeatured ? '★ Featured' : '☆ Feature'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setMediaPickerTarget({ type: 'entry', id: entry.id });
                                      setShowMediaPicker(true);
                                    }}
                                    className="text-xs px-3 py-1.5 bg-slate-700 text-slate-400 hover:bg-slate-600 rounded transition-colors"
                                  >
                                    🖼️ Set Hero Image
                                  </button>
                                  <button
                                    onClick={() => {
                                      setVideoInputTarget({ type: 'timeline_entry', id: entry.id });
                                      setShowVideoInput(true);
                                    }}
                                    className="text-xs px-3 py-1.5 bg-slate-700 text-slate-400 hover:bg-slate-600 rounded transition-colors"
                                  >
                                    🎬 Add Video
                                  </button>
                                  {!entry.hasProjectPage && (
                                    <button
                                      onClick={() => handleCreateProject(entry)}
                                      className="text-xs px-3 py-1.5 bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 rounded transition-colors"
                                    >
                                      + Create Project Page
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setSelectedEntryForDetail(entry)}
                                    className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded transition-colors"
                                  >
                                    Details →
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(entry)}
                                    className={`text-xs px-3 py-1.5 rounded transition-colors ${
                                      !entry.included
                                        ? 'bg-red-600/30 text-red-400 hover:bg-red-600/50'
                                        : 'bg-slate-700 text-slate-500 hover:bg-red-600/20 hover:text-red-400'
                                    }`}
                                  >
                              🗑️ Delete
                                  </button>
                                </div>

                                {/* Tags */}
                                {entry.tags && entry.tags.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {entry.tags.map((tag) => (
                                      <span key={tag} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
        )}
      </div>
    )}

    {/* Land Redevelopment Tab */}
    {activeTab === 'redevelopment' && (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Land Redevelopment Showcase</h2>
            <p className="text-slate-400 text-sm">
              Configure the “Transforming Land, Building Community” finale—link sites to project stories, add stats, and manage all media in one place.
            </p>
          </div>
          <button
            onClick={addRedevelopmentSite}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
          >
            Add Site
          </button>
        </div>

        <div className="space-y-6">
          {redevelopmentSites.map((site) => (
            <div key={site.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{site.location || 'New site'}</h3>
                  <p className="text-xs text-slate-400">{site.region || 'Region'}</p>
                </div>
                <button
                  onClick={() => removeRedevelopmentSite(site.id)}
                  className="text-sm text-red-400 hover:text-white"
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400">Location</label>
                    <input
                      value={site.location}
                      onChange={(e) => updateRedevelopmentSite(site.id, { location: e.target.value })}
                      className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Region</label>
                    <input
                      value={site.region}
                      onChange={(e) => updateRedevelopmentSite(site.id, { region: e.target.value })}
                      className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Project Page</label>
                    <select
                      value={site.projectSlug || ''}
                      onChange={(e) =>
                        updateRedevelopmentSite(site.id, { projectSlug: e.target.value || undefined })
                      }
                      className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">None</option>
                      {projects.map((project) => (
                        <option key={project.slug} value={project.slug}>
                          {project.title} {project.isPublished ? '' : '(Draft)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Accent</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={site.accentColor}
                        onChange={(e) => updateRedevelopmentSite(site.id, { accentColor: e.target.value })}
                        className="h-10 w-12 rounded border border-slate-700 bg-slate-900"
                      />
                      <input
                        value={site.accentColor}
                        onChange={(e) => updateRedevelopmentSite(site.id, { accentColor: e.target.value })}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Description</label>
                    <textarea
                      value={site.description}
                      onChange={(e) => updateRedevelopmentSite(site.id, { description: e.target.value })}
                      rows={3}
                      className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm text-slate-400">Partner</label>
                    <input
                      value={site.partner.name}
                      onChange={(e) =>
                        updateRedevelopmentSite(site.id, {
                          partner: { ...site.partner, name: e.target.value },
                        })
                      }
                      placeholder="Partner name"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                    <textarea
                      value={site.partner.description}
                      onChange={(e) =>
                        updateRedevelopmentSite(site.id, {
                          partner: { ...site.partner, description: e.target.value },
                        })
                      }
                      placeholder="Partner description"
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm text-slate-400 uppercase tracking-wider">Stats</label>
                    <div className="space-y-2">
                      {(site.stats || []).map((stat, statIndex) => (
                        <div key={`${site.id}-stat-${statIndex}`} className="flex gap-2 items-center">
                          <input
                            value={stat.label}
                            onChange={(e) => updateRedevelopmentSiteStat(site.id, statIndex, { label: e.target.value })}
                            placeholder="Label"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                          />
                          <input
                            value={stat.value}
                            onChange={(e) => updateRedevelopmentSiteStat(site.id, statIndex, { value: e.target.value })}
                            placeholder="Value"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                          />
                          <button
                            onClick={() => removeRedevelopmentSiteStat(site.id, statIndex)}
                            className="text-xs text-red-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addRedevelopmentSiteStat(site.id)}
                      className="text-xs text-teal-400 hover:text-white"
                    >
                      + Add stat
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm text-slate-400 uppercase tracking-wider">Before Image</label>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                      {site.beforeImage ? (
                        <img src={site.beforeImage} alt={`${site.location} before`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center text-slate-500 text-sm h-full">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openRedevelopmentMediaPicker(site.id, 'beforeImage')}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                      >
                        Upload / Pick
                      </button>
                      <button
                        onClick={() => updateRedevelopmentSite(site.id, { beforeImage: undefined })}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <input
                      value={site.beforeImage || ''}
                      onChange={(e) => updateRedevelopmentSite(site.id, { beforeImage: e.target.value || undefined })}
                      placeholder="Image URL"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm text-slate-400 uppercase tracking-wider">After Image</label>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                      {site.afterImage ? (
                        <img src={site.afterImage} alt={`${site.location} after`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center text-slate-500 text-sm h-full">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openRedevelopmentMediaPicker(site.id, 'afterImage')}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                      >
                        Upload / Pick
                      </button>
                      <button
                        onClick={() => updateRedevelopmentSite(site.id, { afterImage: undefined })}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <input
                      value={site.afterImage || ''}
                      onChange={(e) => updateRedevelopmentSite(site.id, { afterImage: e.target.value || undefined })}
                      placeholder="Image URL"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm text-slate-400 uppercase tracking-wider">Drone Image</label>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                      {site.droneImage ? (
                        <img src={site.droneImage} alt={`${site.location} drone`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center text-slate-500 text-sm h-full">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openRedevelopmentMediaPicker(site.id, 'droneImage')}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                      >
                        Upload / Pick
                      </button>
                      <button
                        onClick={() => updateRedevelopmentSite(site.id, { droneImage: undefined })}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <input
                      value={site.droneImage || ''}
                      onChange={(e) => updateRedevelopmentSite(site.id, { droneImage: e.target.value || undefined })}
                      placeholder="Image URL"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-400">Drone Video (optional)</label>
                    <input
                      value={site.droneVideo || ''}
                      onChange={(e) => updateRedevelopmentSite(site.id, { droneVideo: e.target.value || undefined })}
                      placeholder="https://"
                      className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-600 text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Land Showcase'}
          </button>
        </div>
      </div>
    )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Project Stories</h2>
                <p className="text-slate-400 text-sm">
                  {projects.length} project pages created
                  {selectedProjectIds.size > 0 && ` • ${selectedProjectIds.size} selected`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedProjectIds.size > 0 && (
                  <button
                    onClick={deleteSelectedProjects}
                    disabled={projectsLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Selected
                  </button>
                )}
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-slate-400 mb-1">Search Projects</label>
                  <input
                    type="text"
                    placeholder="Search by title..."
                    value={projectSearchTerm}
                    onChange={e => setProjectSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <button
                  onClick={() => setSelectedProjectIds(new Set(projects.map(p => p.id)))}
                  className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Select All
                </button>
                {selectedProjectIds.size > 0 && (
                  <button
                    onClick={() => setSelectedProjectIds(new Set())}
                    className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Clear ({selectedProjectIds.size})
                  </button>
                )}
              </div>
            </div>

            {/* Existing Projects */}
            {projects.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl mb-8">
                <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-slate-400">No project pages yet</p>
                <p className="text-slate-500 text-sm mt-1">Create projects to build detailed story pages</p>
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                {/* Get slugs of projects that are featured in the Featured Projects tab */}
                {(() => {
                  const featuredSlugs = new Set(
                    Object.values(settings.featuredProjects || {})
                      .map(fp => fp.slug)
                      .filter(Boolean)
                  );
                  const nonFeaturedProjects = projects.filter(p => !featuredSlugs.has(p.slug));
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-white mb-3">Your Project Pages ({nonFeaturedProjects.length})</h3>
                      {nonFeaturedProjects
                        .filter(p => !projectSearchTerm || p.title.toLowerCase().includes(projectSearchTerm.toLowerCase()))
                        .map((project) => (
                  <div
                    key={project.id}
                    className={`flex items-center gap-4 p-4 bg-slate-800 rounded-lg ${
                      selectedProjectIds.has(project.id) ? 'ring-2 ring-teal-500' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.has(project.id)}
                      onChange={() => toggleProjectSelection(project.id)}
                      className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"
                    />

                    {/* Hero image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                      {project.heroImageUrl ? (
                        <img src={project.heroImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{project.title}</p>
                      {project.subtitle && (
                        <p className="text-sm text-slate-400 truncate">{project.subtitle}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {project.isPublished ? (
                          <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">Published</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">Draft</span>
                        )}
                        {project.isFeatured && (
                          <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">Featured</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {project.isFeatured ? (
                        // Featured projects go to their dedicated Year in Review page
                        <a
                          href={`/2025-review/${project.slug}`}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          View Featured Page
                        </a>
                      ) : (
                        // Regular projects go to the admin editor
                        <>
                          <a
                            href={`/2025-review/admin/projects/${project.slug}`}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Edit
                          </a>
                          <a
                            href={`/2025-review/${project.slug}`}
                            target="_blank"
                            className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
                            title="Preview"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => deleteProject(project.id, project.slug)}
                        disabled={projectsLoading}
                        className="px-3 py-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                        ))}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Import from Notion Projects */}
            <div className="border-t border-slate-700 pt-8">
              <h3 className="text-lg font-semibold text-white mb-3">
                Import from Notion ({filteredNotionProjects.length} available)
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Select a Notion project to create a detailed story page for it.
              </p>

              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search all projects..."
                    value={projectSearchTerm}
                    onChange={e => setProjectSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-10 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {projectSearchTerm && (
                    <button
                      onClick={() => setProjectSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <span className="text-sm text-slate-400">
                  {filteredNotionProjects.length} of {notionProjects.length} projects
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
                {filteredNotionProjects.map((notionProject) => {
                  const alreadyCreated = projects.some(p =>
                    p.title === notionProject.name ||
                    p.timelineEntryId === `notion-${notionProject.id}`
                  );
                  const isCreating = creatingProjectId === notionProject.id;

                  return (
                    <div
                      key={notionProject.id}
                      className={`p-3 rounded-lg border transition-all ${
                        isCreating
                          ? 'bg-teal-900/30 border-teal-500 animate-pulse'
                          : alreadyCreated
                          ? 'bg-green-900/20 border-green-700/50'
                          : 'bg-slate-800 border-slate-700 hover:border-teal-500 cursor-pointer'
                      }`}
                      onClick={() => !alreadyCreated && !isCreating && createFromNotionProject(notionProject)}
                    >
                      <div className="flex items-center gap-2">
                        {isCreating && (
                          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        {alreadyCreated && !isCreating && (
                          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        <p className="font-medium text-white truncate flex-1">{notionProject.name}</p>
                      </div>
                      {isCreating && (
                        <p className="text-xs text-teal-400 mt-1">Creating...</p>
                      )}
                      {alreadyCreated && !isCreating && (
                        <p className="text-xs text-green-400 mt-1">Added</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {filteredNotionProjects.length === 0 && projectSearchTerm && (
                <p className="text-sm text-slate-500 mt-2">
                  No projects match &ldquo;{projectSearchTerm}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowNewProjectModal(false)}>
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <div
              className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Project Title *</label>
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={e => setNewProjectTitle(e.target.value)}
                    placeholder="Enter project title..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Subtitle (optional)</label>
                  <input
                    type="text"
                    value={newProjectSubtitle}
                    onChange={e => setNewProjectSubtitle(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewProject}
                  disabled={projectsLoading || !newProjectTitle.trim()}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  {projectsLoading ? 'Creating...' : 'Create & Edit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Featured Tab */}
        {activeTab === 'featured' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Featured Entries</h2>
              <p className="text-slate-400 text-sm">
                Featured entries display with larger hero images in the timeline. Drag to reorder, or use arrow buttons.
              </p>
            </div>

            {featuredEntries.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <p className="text-slate-400">No featured entries yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Go to the Entries tab and click &ldquo;Feature&rdquo; on entries you want to highlight.
                  <br />
                  You can also select multiple entries and click &ldquo;★ Feature selected&rdquo; for bulk featuring.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {SEASONS.map((season, seasonIndex) => {
                  const seasonFeatured = featuredEntries
                    .filter(e => {
                      const month = new Date(e.date).getMonth();
                      const entrySeason = e.seasonOverride ?? Math.floor(month / 3);
                      return entrySeason === seasonIndex;
                    })
                    .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));

                  if (seasonFeatured.length === 0) return null;

                  return (
                    <div key={season} className="bg-slate-800 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg" style={{ color: SEASON_COLORS[seasonIndex] }}>
                          {season}
                        </h3>
                        <span className="text-sm text-slate-500">{seasonFeatured.length} featured</span>
                      </div>
                      <div className="space-y-2">
                        {seasonFeatured.map((entry, entryIndex) => (
                          <div
                            key={entry.id}
                            draggable
                            onDragStart={(e) => handleFeaturedDragStart(e, entry.id)}
                            onDragEnd={handleFeaturedDragEnd}
                            onDragOver={(e) => handleFeaturedDragOver(e, entry.id)}
                            onDrop={(e) => handleFeaturedDrop(e, entry.id, seasonIndex)}
                            className={`flex items-center gap-4 p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                              draggedEntryId === entry.id
                                ? 'opacity-50 bg-slate-600/50'
                                : dragOverEntryId === entry.id
                                ? 'bg-teal-500/20 ring-2 ring-teal-500'
                                : 'bg-slate-700/50 hover:bg-slate-700'
                            }`}
                          >
                            {/* Drag handle */}
                            <div className="text-slate-500 hover:text-slate-300 cursor-grab">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>

                            {/* Order number */}
                            <span className="w-6 h-6 flex items-center justify-center bg-slate-600 rounded text-xs font-mono text-slate-300">
                              {entryIndex + 1}
                            </span>

                            {/* Hero image */}
                            {entry.heroImageUrl ? (
                              <img src={entry.heroImageUrl} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-16 h-16 rounded bg-slate-600/50 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}

                            {/* Entry info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{entry.editedTitle || entry.title}</p>
                              <p className="text-sm text-slate-400">{formatDate(entry.date)}</p>
                            </div>

                            {/* Move up/down buttons */}
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => moveFeaturedEntry(entry.id, 'up', seasonIndex)}
                                disabled={entryIndex === 0}
                                className="p-1 rounded hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
                                title="Move up"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => moveFeaturedEntry(entry.id, 'down', seasonIndex)}
                                disabled={entryIndex === seasonFeatured.length - 1}
                                className="p-1 rounded hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
                                title="Move down"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            {/* Remove button */}
                            <button
                              onClick={() => toggleFeatured(entry.id)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Remove from featured"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Featured Projects Tab */}
        {activeTab === 'featuredProjects' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Featured Projects</h2>
              <p className="text-slate-400 text-sm">
                These control the large featured project sections that appear between seasons on <a className="text-teal-400 hover:underline" href="/2025-review" target="_blank" rel="noreferrer">/2025-review</a>.
              </p>
            </div>

            <div className="grid gap-6">
              {SEASONS.map((seasonName, seasonIndex) => {
                const fp: FeaturedSeasonProject =
                  settings.featuredProjects?.[seasonIndex] ||
                  (DEFAULT_FEATURED_PROJECTS as any)?.[seasonIndex] ||
                  ({
                    id: `featured-${seasonIndex}`,
                    slug: '',
                    title: '',
                    subtitle: '',
                    description: '',
                    accentColor: SEASON_COLORS[seasonIndex] || '#59c3c3',
                    layout: seasonIndex % 2 === 0 ? 'left' : 'right',
                  } as FeaturedSeasonProject);

                const sortedProjects = [...projects].sort((a, b) => (a.title || '').localeCompare(b.title || ''));

                return (
                  <div key={seasonName} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{seasonName}</h3>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: `${fp.accentColor}20`, color: fp.accentColor }}
                          >
                            Accent {fp.accentColor}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          Pick a project page and customize the featured section copy/media.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {fp.slug && (
                          <a
                            href={`/2025-review/${fp.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            View Featured Page →
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Media */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-400">Hero Image</label>
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                          {fp.heroImage ? (
                            <img src={fp.heroImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                              No hero image
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openFeaturedHeroPicker(seasonIndex)}
                            className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Upload / Pick
                          </button>
                          <button
                            onClick={() => upsertFeaturedProject(seasonIndex, { heroImage: undefined })}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Middle: Project selection + layout */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Project Page</label>
                          <select
                            value={fp.slug}
                            onChange={(e) => handleFeaturedProjectChange(seasonIndex, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                          >
                            <option value="">None</option>
                            {sortedProjects.map(p => (
                              <option key={p.slug} value={p.slug}>
                                {p.title} {p.isPublished ? '' : '(Draft)'}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => fp.slug && autofillFeaturedFromProject(seasonIndex, fp.slug)}
                              disabled={!fp.slug}
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg text-sm transition-colors"
                            >
                              Autofill from page
                            </button>
                            <button
                              onClick={() => {
                                handleFeaturedProjectChange(seasonIndex, '');
                                upsertFeaturedProject(seasonIndex, { title: '', subtitle: '', description: '', tags: [], heroImage: undefined });
                              }}
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Layout</label>
                            <select
                              value={fp.layout || 'left'}
                              onChange={(e) => upsertFeaturedProject(seasonIndex, { layout: e.target.value as any })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                            >
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                              <option value="center">Center</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Accent</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={fp.accentColor}
                                onChange={(e) => upsertFeaturedProject(seasonIndex, { accentColor: e.target.value })}
                                className="h-10 w-12 rounded bg-slate-900 border border-slate-700"
                              />
                              <input
                                type="text"
                                value={fp.accentColor}
                                onChange={(e) => upsertFeaturedProject(seasonIndex, { accentColor: e.target.value })}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Copy */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Title</label>
                          <input
                            type="text"
                            value={fp.title}
                            onChange={(e) => upsertFeaturedProject(seasonIndex, { title: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Subtitle</label>
                          <input
                            type="text"
                            value={fp.subtitle}
                            onChange={(e) => upsertFeaturedProject(seasonIndex, { subtitle: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                          <textarea
                            value={fp.description}
                            onChange={(e) => upsertFeaturedProject(seasonIndex, { description: e.target.value })}
                            rows={4}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white resize-none focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Tags (comma separated)</label>
                          <input
                            type="text"
                            value={(fp.tags || []).join(', ')}
                            onChange={(e) => upsertFeaturedProject(seasonIndex, { tags: parseTags(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                            placeholder="community, systems, youth"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-600 text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Featured Projects'}
              </button>
            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Media Library</h2>
                <p className="text-slate-400 text-sm">
                  {filteredMediaItems.length} of {mediaItems.length} items
                  {selectedMediaIds.size > 0 && ` • ${selectedMediaIds.size} selected`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/2025-review/admin/media"
                  target="_blank"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                >
                  Full Media Library
                </Link>
                <button
                  onClick={refreshMedia}
                  disabled={mediaLoading}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Refresh"
                >
                  <svg className={`w-5 h-5 ${mediaLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {/* View toggle */}
                <div className="flex bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setMediaViewMode('list')}
                    className={`p-1.5 rounded ${mediaViewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setMediaViewMode('grid')}
                    className={`p-1.5 rounded ${mediaViewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => {
                    setMediaPickerTarget(null);
                    setShowMediaPicker(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Media
                </button>
              </div>
            </div>

            {/* Search and Bulk Actions */}
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm text-slate-400 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search by title, description, or tags..."
                    value={mediaSearchTerm}
                    onChange={e => setMediaSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Selection controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllMedia}
                    className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Select All
                  </button>
                  {selectedMediaIds.size > 0 && (
                    <button
                      onClick={clearMediaSelection}
                      className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Clear ({selectedMediaIds.size})
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk tagging panel */}
              {selectedMediaIds.size > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm font-medium text-white mb-3">
                    Bulk tag {selectedMediaIds.size} selected item{selectedMediaIds.size !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="w-64">
                      <label className="block text-sm text-slate-400 mb-1">Assign to Project</label>
                      <select
                        value={bulkProjectId}
                        onChange={e => setBulkProjectId(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="">Select project...</option>
                        {notionProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm text-slate-400 mb-1">Add Tags (comma separated)</label>
                      <input
                        type="text"
                        placeholder="tag1, tag2, tag3"
                        value={bulkTagInput}
                        onChange={e => setBulkTagInput(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <button
                      onClick={bulkTagMedia}
                      disabled={mediaLoading || (!bulkProjectId && !bulkTagInput.trim())}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    >
                      {mediaLoading ? 'Updating...' : 'Apply to Selected'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Media Content */}
            {filteredMediaItems.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-400">No media found</p>
                <p className="text-slate-500 text-sm mt-1">
                  {mediaItems.length > 0 ? 'Try a different search term' : 'Upload images and videos to get started'}
                </p>
              </div>
            ) : mediaViewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredMediaItems.map((item: any) => (
                  <div
                    key={item.id}
                    className={`aspect-square rounded-lg overflow-hidden bg-slate-800 group relative cursor-pointer ${
                      selectedMediaIds.has(item.id) ? 'ring-2 ring-teal-500' : ''
                    }`}
                    onClick={() => toggleMediaSelection(item.id)}
                  >
                    <img
                      src={item.thumbnail_url || item.file_url}
                      alt={item.title || 'Media'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedMediaIds.has(item.id) ? 'bg-teal-500 border-teal-500' : 'border-white/60 bg-black/30'
                      }`}>
                        {selectedMediaIds.has(item.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs truncate">{item.title || 'Untitled'}</p>
                      {item.manual_tags?.length > 0 && (
                        <p className="text-slate-400 text-xs truncate">{item.manual_tags.slice(0, 2).join(', ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-2">
                {filteredMediaItems.map((item: any) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-3 bg-slate-800 rounded-lg ${
                      selectedMediaIds.has(item.id) ? 'ring-2 ring-teal-500' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedMediaIds.has(item.id)}
                      onChange={() => toggleMediaSelection(item.id)}
                      className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"
                    />

                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                      <img
                        src={item.thumbnail_url || item.file_url}
                        alt={item.title || 'Media'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {editingMediaId === item.id ? (
                        <input
                          type="text"
                          defaultValue={item.title || ''}
                          onBlur={e => updateMediaItem(item.id, { title: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateMediaItem(item.id, { title: (e.target as HTMLInputElement).value });
                            }
                            if (e.key === 'Escape') {
                              setEditingMediaId(null);
                            }
                          }}
                          autoFocus
                          className="w-full bg-slate-700 border border-teal-500 rounded px-2 py-1 text-white text-sm focus:outline-none"
                        />
                      ) : (
                        <p
                          className="font-medium text-white truncate cursor-pointer hover:text-teal-400"
                          onClick={e => { e.stopPropagation(); setEditingMediaId(item.id); }}
                          title="Click to edit title"
                        >
                          {item.title || 'Untitled'}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.manual_tags?.slice(0, 5).map((tag: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                            {tag}
                          </span>
                        ))}
                        {item.manual_tags?.length > 5 && (
                          <span className="text-xs text-slate-500">+{item.manual_tags.length - 5} more</span>
                        )}
                      </div>
                    </div>

                    {/* Project */}
                    <div className="w-48 flex-shrink-0">
                      <select
                        value={item.project_ids?.[0] || ''}
                        onChange={e => updateMediaItem(item.id, { project_ids: e.target.value ? [e.target.value] : [] })}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="">No project</option>
                        {notionProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div className="w-24 text-sm text-slate-400 flex-shrink-0">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold mb-2">Video Library</h2>
                <p className="text-slate-400 text-sm">
                  {videos.length} videos • Filter by project to find videos for project pages
                </p>
              </div>
              <button
                onClick={() => {
                  setVideoInputTarget({ type: 'standalone', id: '' });
                  setShowVideoInput(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Video
              </button>
            </div>

            {/* Project Filter */}
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <label className="block text-sm text-slate-400 mb-1">Filter by Project</label>
                  <select
                    value={videoProjectFilter}
                    onChange={(e) => setVideoProjectFilter(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">All Videos</option>
                    <option value="untagged">Untagged Videos</option>
                    {notionProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {videoProjectFilter && (
                  <button
                    onClick={() => setVideoProjectFilter('')}
                    className="text-sm text-slate-400 hover:text-white mt-6"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>

            {videos.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-400">No videos yet</p>
                <p className="text-slate-500 text-sm mt-1">Add Loom, YouTube, or Vimeo videos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos
                  .filter((video: any) => {
                    if (!videoProjectFilter) return true;
                    if (videoProjectFilter === 'untagged') return !video.project_id;
                    return video.project_id === videoProjectFilter;
                  })
                  .map((video) => {
                    const { platform: detectedPlatform } = parseVideoUrl(video.embedUrl);
                    const thumbnailUrl = getVideoThumbnailUrl(video.embedUrl, video.thumbnailUrl);
                    return (
                  <div key={video.id} className="bg-slate-800 rounded-xl overflow-hidden group">
                    {editingVideoId === video.id ? (
                      // Editing mode with video preview
                      <div className="space-y-4">
                        {/* Video Preview */}
                        <div className="relative aspect-video bg-slate-900">
                          <iframe
                            src={getProperEmbedUrl(video.embedUrl)}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                          {/* Platform badge */}
                          <div className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-bold text-white ${getVideoPlatformColor(detectedPlatform)}`}>
                            {detectedPlatform.toUpperCase()}
                          </div>
                        </div>

                        {/* Edit form */}
                        <div className="p-4 space-y-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Title</label>
                            <input
                              type="text"
                              value={editVideoTitle}
                              onChange={(e) => setEditVideoTitle(e.target.value)}
                              placeholder="Video title"
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Description</label>
                            <textarea
                              value={editVideoDescription}
                              onChange={(e) => setEditVideoDescription(e.target.value)}
                              placeholder="Video description (optional)"
                              rows={2}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Link to Project</label>
                            <select
                              value={editVideoProjectId}
                              onChange={(e) => setEditVideoProjectId(e.target.value)}
                              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                            >
                              <option value="">No project</option>
                              {notionProjects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              onClick={cancelEditingVideo}
                              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateVideo}
                              disabled={videoSaving}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >
                              {videoSaving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Display mode with video preview
                      <>
                        {/* Video Preview */}
                        <div className="relative aspect-video bg-slate-900">
                          <iframe
                            src={getProperEmbedUrl(video.embedUrl)}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            loading="lazy"
                          />

                          {/* Platform badge */}
                          <div className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-bold text-white ${getVideoPlatformColor(detectedPlatform)} z-10`}>
                            {detectedPlatform.toUpperCase()}
                          </div>

                          {/* Featured star */}
                          {video.isFeatured && (
                            <div className="absolute top-3 right-3 z-10">
                              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-3">
                          <h4 className="font-medium text-white truncate">{video.title || 'Untitled video'}</h4>
                          {video.description && (
                            <p className="text-sm text-slate-400 truncate mt-1">{video.description}</p>
                          )}
                          {(video as any).project_id && (
                            <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                              {notionProjects.find(p => p.id === (video as any).project_id)?.name || 'Project'}
                            </span>
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-700">
                            <button
                              onClick={() => toggleVideoFeatured(video.id, video.isFeatured || false)}
                              className={`p-2 transition-colors ${video.isFeatured ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`}
                              title={video.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                            >
                              <svg className="w-5 h-5" fill={video.isFeatured ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => startEditingVideo(video)}
                              className="p-2 text-slate-400 hover:text-teal-400 transition-colors"
                              title="Edit video"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <a
                              href={video.embedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                              title="Open video"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            <button
                              onClick={() => handleDeleteVideo(video.id)}
                              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete video"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* LinkedIn Tab */}
        {activeTab === 'linkedin' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold mb-6">Add LinkedIn Posts</h2>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-4">Option 1: Upload LinkedIn Export</h3>
              <p className="text-slate-400 text-sm mb-4">
                Download your LinkedIn data from Settings → Data Privacy → Get a copy of your data, then upload the Posts
                file here.
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Author name (e.g., Nic)"
                  value={linkedInAuthor}
                  onChange={(e) => setLinkedInAuthor(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-500 file:text-slate-900 file:font-semibold hover:file:bg-teal-400"
                />
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Option 2: Add Posts Manually</h3>
              <p className="text-slate-400 text-sm mb-4">Copy-paste your LinkedIn posts here.</p>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Author name (e.g., Ben)"
                  value={linkedInAuthor}
                  onChange={(e) => setLinkedInAuthor(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />

                {linkedInPosts.map((post, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                    <input
                      type="date"
                      value={post.date}
                      onChange={(e) => {
                        const newPosts = [...linkedInPosts];
                        newPosts[index].date = e.target.value;
                        setLinkedInPosts(newPosts);
                      }}
                      className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-white text-sm focus:outline-none focus:border-teal-500"
                    />
                    <textarea
                      placeholder="Post content..."
                      value={post.content}
                      onChange={(e) => {
                        const newPosts = [...linkedInPosts];
                        newPosts[index].content = e.target.value;
                        setLinkedInPosts(newPosts);
                      }}
                      rows={4}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-slate-300 text-sm resize-none focus:outline-none focus:border-teal-500"
                    />
                  </div>
                ))}

                <button
                  onClick={() => setLinkedInPosts([...linkedInPosts, { date: '', content: '' }])}
                  className="text-teal-400 hover:text-teal-300 text-sm"
                >
                  + Add another post
                </button>

                <button
                  onClick={handleManualLinkedIn}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold py-3 rounded-lg transition-colors"
                >
                  Save Posts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold mb-6">Page Settings</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Hero Title</label>
                <input
                  type="text"
                  value={settings.heroTitle}
                  onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Hero Subtitle</label>
                <input
                  type="text"
                  value={settings.heroSubtitle}
                  onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Introduction Text</label>
                <textarea
                  value={settings.introText}
                  onChange={(e) => setSettings({ ...settings, introText: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white resize-none focus:outline-none focus:border-teal-500"
                  placeholder="Each season has brought its own harvest of learning..."
                />
              </div>

              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-600 text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => {
          setShowMediaPicker(false);
          setMediaPickerTarget(null);
        }}
        onSelect={mediaPickerTarget ? handleSetHeroImage : () => setShowMediaPicker(false)}
        mediaType="photo"
        title={mediaPickerTarget ? 'Select Hero Image' : 'Upload Media'}
        defaultProjectId={(() => {
          if (!mediaPickerTarget) return undefined;
          if (mediaPickerTarget.type !== 'featuredProject') return undefined;
          const seasonIndex = parseInt(mediaPickerTarget.id);
          if (!Number.isFinite(seasonIndex)) return undefined;
          const slug = settings.featuredProjects?.[seasonIndex]?.slug;
          if (!slug) return undefined;
          const project = projects.find(p => p.slug === slug);
          const timelineEntryId = project?.timelineEntryId;
          if (!timelineEntryId || !timelineEntryId.startsWith('notion-')) return undefined;
          return timelineEntryId.replace(/^notion-/, '');
        })()}
        defaultUploadTags={mediaPickerTarget?.type === 'featuredProject' ? 'featured, 2025' : ''}
      />

      {/* Video Input Modal */}
      {showVideoInput && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowVideoInput(false)}>
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Add Video</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Video URL</label>
                <input
                  type="text"
                  value={newVideoUrl}
                  onChange={e => setNewVideoUrl(e.target.value)}
                  placeholder="Paste Loom, YouTube, or Vimeo URL..."
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Title (optional)</label>
                <input
                  type="text"
                  value={newVideoTitle}
                  onChange={e => setNewVideoTitle(e.target.value)}
                  placeholder="Video title..."
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowVideoInput(false);
                  setVideoInputTarget(null);
                  setNewVideoUrl('');
                  setNewVideoTitle('');
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVideo}
                disabled={!newVideoUrl}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Add Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Entry Form Modal */}
      {showQuickEntryForm && (
        <QuickEntryForm
          onClose={() => setShowQuickEntryForm(false)}
          onEntryCreated={(entry) => {
            setEntries(prev => [entry, ...prev]);
            setShowQuickEntryForm(false);
          }}
          notionProjects={notionProjects}
        />
      )}

      {/* Entry Detail Panel */}
      {selectedEntryForDetail && (
      <EntryDetailPanel
        entry={selectedEntryForDetail}
        onClose={() => setSelectedEntryForDetail(null)}
        onUpdate={(updates) => {
          updateEntry(selectedEntryForDetail.id, updates);
          setSelectedEntryForDetail(prev => prev ? { ...prev, ...updates } : null);
        }}
        onSetHeroImage={() => {
          setMediaPickerTarget({ type: 'entry', id: selectedEntryForDetail.id });
          setShowMediaPicker(true);
        }}
        onAddVideo={() => {
          setVideoInputTarget({ type: 'timeline_entry', id: selectedEntryForDetail.id });
          setShowVideoInput(true);
        }}
        onDelete={() => handleDeleteEntry(selectedEntryForDetail)}
        projects={projects}
        onLinkProject={(project) => handleLinkEntryToProject(selectedEntryForDetail, project)}
        onCreateProject={() => handleCreateProject(selectedEntryForDetail)}
      />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp isOpen={keyboardHelp.isOpen} onClose={keyboardHelp.close} />
    </div>
  );
}
