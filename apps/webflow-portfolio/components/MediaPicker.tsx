'use client';

import { useState, useEffect, useRef } from 'react';
import { useProject, matchesProject } from '../lib/projectContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MediaItem {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  file_type: 'photo' | 'video';
  manual_tags?: string[];
  project_ids?: string[];
  capture_date?: string;
}

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, mediaItem?: MediaItem) => void;
  defaultTags?: string[];
  allowedTypes?: ('photo' | 'video')[];
  filterByProject?: boolean; // Whether to filter by selected project
}

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  defaultTags = [],  // Start with no filters to show all media
  allowedTypes = ['photo'],
  filterByProject = true
}: MediaPickerProps) {
  const { selectedProject } = useProject();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTags, setSearchTags] = useState<string[]>(defaultTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Load media from API
  const loadMedia = async (tags: string[] = searchTags) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (tags.length > 0) {
        params.set('tags', tags.join(','));
      }
      if (allowedTypes.length === 1) {
        params.set('type', allowedTypes[0]);
      }
      params.set('limit', '100');

      const res = await fetch(`${API_BASE}/api/media/items?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load media');

      const data = await res.json();
      let items = data.media || [];

      // Filter by selected project if enabled
      if (filterByProject && selectedProject) {
        items = items.filter((m: MediaItem) =>
          matchesProject(selectedProject, {
            project_ids: m.project_ids,
            tags: m.manual_tags,
            manual_tags: m.manual_tags,
          })
        );
      }

      setMedia(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  // Search media
  const searchMedia = async () => {
    if (!searchQuery.trim()) {
      loadMedia();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      if (allowedTypes.length === 1) {
        params.set('type', allowedTypes[0]);
      }
      params.set('limit', '50');

      const res = await fetch(`${API_BASE}/api/media/search?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to search media');

      const data = await res.json();
      setMedia(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search media');
    } finally {
      setLoading(false);
    }
  };

  // Load on open (once)
  useEffect(() => {
    if (isOpen && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMedia(searchTags);
      setSelectedId(null);
    }
    if (!isOpen) {
      hasLoadedRef.current = false;
    }
  }, [isOpen]);

  // Reload when tags change
  useEffect(() => {
    if (isOpen && hasLoadedRef.current) {
      loadMedia(searchTags);
    }
  }, [searchTags]);

  // Reload when project filter changes
  useEffect(() => {
    if (isOpen && hasLoadedRef.current) {
      loadMedia(searchTags);
    }
  }, [selectedProject]);

  // Handle tag toggle
  const toggleTag = (tag: string) => {
    setSearchTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Handle select
  const handleSelect = () => {
    const item = media.find(m => m.id === selectedId);
    if (item) {
      onSelect(item.file_url, item);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Select from Media Library</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-700 bg-slate-800/50">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchMedia()}
                  placeholder="Search by title or description..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Tag filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Filter:</span>
              {['timeline', '2025-review', 'community', 'goods'].map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    searchTags.includes(tag)
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {searchTags.length > 0 && (
                <button
                  onClick={() => setSearchTags([])}
                  className="text-xs text-slate-400 hover:text-white ml-1"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadMedia()}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button onClick={() => loadMedia()} className="mt-2 text-teal-400 hover:text-teal-300">
                Try again
              </button>
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-400">No media found</p>
              <p className="text-sm text-slate-500 mt-1">
                {searchTags.length > 0 ? 'Try removing some filters' : 'Upload some media to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {media.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedId === item.id
                      ? 'border-teal-500 ring-2 ring-teal-500/50 scale-[1.02]'
                      : 'border-transparent hover:border-slate-600'
                  }`}
                >
                  <img
                    src={item.thumbnail_url || item.file_url}
                    alt={item.title || 'Media item'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Selection indicator */}
                  {selectedId === item.id && (
                    <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                      <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {/* Video indicator */}
                  {item.file_type === 'video' && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                      </svg>
                    </div>
                  )}
                  {/* Title tooltip */}
                  {item.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs text-white truncate">{item.title}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800">
          <p className="text-sm text-slate-400">
            {media.length} items
            {filterByProject && selectedProject && ` • Project: ${selectedProject.name}`}
            {searchTags.length > 0 && ` • Tags: ${searchTags.join(', ')}`}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedId}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Select Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
