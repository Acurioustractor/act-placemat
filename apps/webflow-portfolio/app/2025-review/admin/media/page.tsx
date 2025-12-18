'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type MediaFileType = 'photo' | 'video' | 'document' | 'image';

interface MediaItem {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_type: MediaFileType | string;
  title?: string;
  description?: string;
  alt_text?: string;
  manual_tags?: string[];
  impact_themes?: string[];
  project_ids?: string[];
  created_at: string;
}

interface NotionProject {
  id: string;
  name: string;
  status?: string;
}

function uniqStrings(input: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of input) {
    const value = raw.trim();
    if (!value) continue;
    seen.add(value);
  }
  return Array.from(seen);
}

function parseCsv(input: string): string[] {
  if (!input.trim()) return [];
  return uniqStrings(input.split(','));
}

function isPhotoFile(item: Pick<MediaItem, 'file_type' | 'file_url' | 'thumbnail_url'>): boolean {
  if (item.file_type === 'photo' || item.file_type === 'image') return true;
  if (item.thumbnail_url) return true;
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(item.file_url);
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [projects, setProjects] = useState<NotionProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');

  // Selected media for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProjectId, setBulkProjectId] = useState('');
  const [bulkTagInput, setBulkTagInput] = useState('');

  // Modal state
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Modal edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAltText, setEditAltText] = useState('');
  const [editManualTags, setEditManualTags] = useState('');
  const [editImpactThemes, setEditImpactThemes] = useState('');
  const [editAddProjectId, setEditAddProjectId] = useState('');

  // Load media
  const loadMedia = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (search) params.set('search', search);

      const res = await fetch(`${API_BASE}/api/year-in-review/2025/media/all?${params}`);
      if (!res.ok) throw new Error('Failed to fetch media');

      const data = await res.json();
      setMedia(data.media || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Load Notion projects for tagging/filtering
  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/real/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      const projectList = (data.projects || [])
        .filter((p: any) => p.name && p.name !== 'Unknown')
        .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
      setProjects(projectList);
    } catch (err) {
      // Projects are optional; keep page usable without them.
      console.warn('Failed to load projects:', err);
    }
  }, []);

  useEffect(() => {
    loadMedia();
    loadProjects();
  }, [loadMedia, loadProjects]);

  useEffect(() => {
    if (!selectedMedia) return;
    setEditTitle(selectedMedia.title || '');
    setEditDescription(selectedMedia.description || '');
    setEditAltText(selectedMedia.alt_text || '');
    setEditManualTags((selectedMedia.manual_tags || []).join(', '));
    setEditImpactThemes((selectedMedia.impact_themes || []).join(', '));
    setEditAddProjectId('');
  }, [selectedMedia]);

  const updateMediaItem = useCallback(async (id: string, updates: Partial<MediaItem>) => {
    const res = await fetch(`${API_BASE}/api/media/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || `Failed to update media (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.media as MediaItem;
  }, []);

  // Filter media
  const filteredMedia = media.filter(item => {
    if (typeFilter !== 'all') {
      if (typeFilter === 'photo') {
        if (!(item.file_type === 'photo' || item.file_type === 'image')) return false;
      } else if (item.file_type !== typeFilter) {
        return false;
      }
    }
    if (tagFilter && !item.manual_tags?.includes(tagFilter) && !item.impact_themes?.includes(tagFilter)) return false;
    if (projectFilter && !item.project_ids?.includes(projectFilter)) return false;
    return true;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(
    media.flatMap(m => [...(m.manual_tags || []), ...(m.impact_themes || [])])
  )).sort();

  // Copy URL to clipboard
  const copyUrl = async (url: string, type: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      setError('Clipboard unavailable. Copy manually from the URL box.');
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all visible
  const selectAll = () => {
    if (selectedIds.size === filteredMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map(m => m.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkApply = async () => {
    if (selectedIds.size === 0) return;
    const tagsToAdd = parseCsv(bulkTagInput);
    const projectIdToAdd = bulkProjectId.trim();
    if (!projectIdToAdd && tagsToAdd.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const selected = media.filter(m => selectedIds.has(m.id));
      const updatedItems: MediaItem[] = [];
      for (const item of selected) {
        const manualTags = tagsToAdd.length > 0 ? uniqStrings([...(item.manual_tags || []), ...tagsToAdd]) : item.manual_tags;
        const projectIds =
          projectIdToAdd ? uniqStrings([...(item.project_ids || []), projectIdToAdd]) : item.project_ids;

        const updates: Partial<MediaItem> = {};
        if (manualTags !== undefined) updates.manual_tags = manualTags;
        if (projectIds !== undefined) updates.project_ids = projectIds;

        const updated = await updateMediaItem(item.id, updates);
        updatedItems.push(updated);
      }

      setMedia(prev => prev.map(m => updatedItems.find(u => u.id === m.id) || m));
      if (selectedMedia && selectedIds.has(selectedMedia.id)) {
        const updated = updatedItems.find(u => u.id === selectedMedia.id);
        if (updated) setSelectedMedia(updated);
      }
      setBulkProjectId('');
      setBulkTagInput('');
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update media');
    } finally {
      setSaving(false);
    }
  };

  const saveSelectedMediaEdits = async () => {
    if (!selectedMedia) return;
    setSaving(true);
    setError(null);
    try {
      const manual_tags = parseCsv(editManualTags);
      const impact_themes = parseCsv(editImpactThemes);
      const existingProjects = selectedMedia.project_ids || [];
      const project_ids = editAddProjectId ? uniqStrings([...existingProjects, editAddProjectId]) : existingProjects;

      const updated = await updateMediaItem(selectedMedia.id, {
        title: editTitle || undefined,
        description: editDescription || undefined,
        alt_text: editAltText || undefined,
        manual_tags,
        impact_themes,
        project_ids
      });

      setMedia(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      setSelectedMedia(updated);
      setEditAddProjectId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const removeProjectFromSelected = async (projectId: string) => {
    if (!selectedMedia) return;
    const nextProjects = (selectedMedia.project_ids || []).filter(id => id !== projectId);
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMediaItem(selectedMedia.id, { project_ids: nextProjects });
      setMedia(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      setSelectedMedia(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update projects');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/2025-review/admin"
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Media Library</h1>
                <p className="text-sm text-slate-400">{media.length} items catalogued</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <span className="text-sm text-teal-400">
                  {selectedIds.size} selected
                </span>
              )}
              <button
                onClick={loadMedia}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="photo">Photos</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
          </select>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Tag Filter */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          {/* Select All */}
          <button
            onClick={selectAll}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            {filteredMedia.length > 0 && selectedIds.size === filteredMedia.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-72">
                <label className="block text-xs text-slate-400 mb-1">Add Project (Notion)</label>
                <select
                  value={bulkProjectId}
                  onChange={(e) => setBulkProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                >
                  <option value="">Select project…</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-slate-400 mb-1">Add Tags (comma separated)</label>
                <input
                  type="text"
                  value={bulkTagInput}
                  onChange={(e) => setBulkTagInput(e.target.value)}
                  placeholder="community, workshop, portrait"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={bulkApply}
                  disabled={saving || (!bulkProjectId && !bulkTagInput.trim())}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? 'Applying…' : 'Apply'}
                </button>
                <button
                  onClick={clearSelection}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-sm transition-colors"
                >
                  Clear ({selectedIds.size})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Media Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-12">
        {filteredMedia.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400">No media found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className={`relative group rounded-xl overflow-hidden bg-slate-800 border-2 transition-all cursor-pointer ${
                  selectedIds.has(item.id)
                    ? 'border-teal-500 ring-2 ring-teal-500/30'
                    : 'border-transparent hover:border-slate-600'
                }`}
                onClick={() => setSelectedMedia(item)}
              >
                {/* Selection checkbox */}
                <div
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.id);
                  }}
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    selectedIds.has(item.id)
                      ? 'bg-teal-500 border-teal-500'
                      : 'bg-slate-900/80 border-slate-600 group-hover:border-slate-400'
                  }`}>
                    {selectedIds.has(item.id) && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="aspect-square">
                  {isPhotoFile(item) ? (
                    <img
                      src={item.thumbnail_url || item.file_url}
                      alt={item.alt_text || item.title || 'Media item'}
                      className="w-full h-full object-cover"
                    />
                  ) : item.file_type === 'video' ? (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Title overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white truncate">
                    {item.title || 'Untitled'}
                  </p>
                  {item.manual_tags && item.manual_tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.manual_tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="px-1 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Media Detail Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview */}
            <div className="relative aspect-video bg-slate-800">
              {isPhotoFile(selectedMedia) ? (
                <img
                  src={selectedMedia.file_url}
                  alt={selectedMedia.alt_text || selectedMedia.title || 'Media preview'}
                  className="w-full h-full object-contain"
                />
              ) : selectedMedia.file_type === 'video' ? (
                <video
                  src={selectedMedia.file_url}
                  controls
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-24 h-24 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-lg hover:bg-slate-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-white mb-1 truncate">
                      {selectedMedia.title || 'Untitled'}
                    </h3>
                    {selectedMedia.description && (
                      <p className="text-slate-400">{selectedMedia.description}</p>
                    )}
                  </div>
                  <a
                    href={selectedMedia.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors"
                  >
                    Open File
                  </a>
                </div>
              </div>

              {/* Tags */}
              {(selectedMedia.manual_tags?.length || selectedMedia.impact_themes?.length) && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMedia.manual_tags?.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-700 rounded text-sm text-slate-300">
                        {tag}
                      </span>
                    ))}
                    {selectedMedia.impact_themes?.map((theme, i) => (
                      <span key={i} className="px-2 py-1 bg-teal-900/50 rounded text-sm text-teal-300">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* URLs to copy */}
              <div className="space-y-2">
                <label className="block text-sm text-slate-400">Copy URL</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyUrl(selectedMedia.file_url, 'full')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copySuccess === 'full'
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {copySuccess === 'full' ? 'Copied!' : 'Full URL'}
                  </button>
                  {selectedMedia.thumbnail_url && (
                    <button
                      onClick={() => copyUrl(selectedMedia.thumbnail_url!, 'thumb')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        copySuccess === 'thumb'
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {copySuccess === 'thumb' ? 'Copied!' : 'Thumbnail URL'}
                    </button>
                  )}
                </div>
              </div>

              {/* URL display */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">File URL</label>
                <div className="p-3 bg-slate-800 rounded-lg text-xs text-slate-400 font-mono break-all">
                  {selectedMedia.file_url}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Type:</span>
                  <span className="ml-2 text-slate-300">{selectedMedia.file_type || (isPhotoFile(selectedMedia) ? 'photo' : 'unknown')}</span>
                </div>
                <div>
                  <span className="text-slate-500">Added:</span>
                  <span className="ml-2 text-slate-300">
                    {new Date(selectedMedia.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Projects */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Projects</label>
                {selectedMedia.project_ids && selectedMedia.project_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedMedia.project_ids.map(pid => (
                      <span key={pid} className="inline-flex items-center gap-2 px-2 py-1 bg-slate-800 rounded text-sm text-slate-200">
                        <span className="max-w-[260px] truncate">
                          {projects.find(p => p.id === pid)?.name || pid}
                        </span>
                        <button
                          onClick={() => removeProjectFromSelected(pid)}
                          disabled={saving}
                          className="text-slate-400 hover:text-white disabled:opacity-50"
                          title="Remove project"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No projects assigned</p>
                )}
              </div>

              {/* Edit metadata */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Edit Metadata</h4>
                  <button
                    onClick={saveSelectedMediaEdits}
                    disabled={saving}
                    className="px-3 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Title</label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Alt Text</label>
                    <input
                      value={editAltText}
                      onChange={(e) => setEditAltText(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tags</label>
                    <input
                      value={editManualTags}
                      onChange={(e) => setEditManualTags(e.target.value)}
                      placeholder="comma, separated, tags"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Impact Themes</label>
                    <input
                      value={editImpactThemes}
                      onChange={(e) => setEditImpactThemes(e.target.value)}
                      placeholder="comma, separated, themes"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Add Project</label>
                    <select
                      value={editAddProjectId}
                      onChange={(e) => setEditAddProjectId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                    >
                      <option value="">Select project…</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => copyUrl(selectedMedia.id, 'id')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copySuccess === 'id'
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {copySuccess === 'id' ? 'Copied!' : 'Copy Media ID'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy success toast */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-teal-600 text-white rounded-lg shadow-lg animate-fade-in">
          URL copied to clipboard
        </div>
      )}
    </div>
  );
}
