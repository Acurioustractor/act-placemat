'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MediaItem } from '../../types/yearInReview';
import { useProject, matchesProject } from '../../lib/projectContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
  onMultiSelect?: (media: MediaItem[]) => void;
  multiSelect?: boolean;
  mediaType?: 'photo' | 'video' | 'all';
  title?: string;
  filterByProject?: boolean; // Whether to filter by selected project
  defaultProjectId?: string; // Default project for uploads
  defaultUploadTags?: string; // Default manual tags (comma-separated)
}

interface ApiMediaItem {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  file_type: string;
  title?: string;
  description?: string;
  alt_text?: string;
  manual_tags?: string[];
  created_at: string;
}

interface NotionProject {
  id: string;
  name: string;
  status?: string;
}

/**
 * Media picker modal for selecting or uploading media
 */
export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  onMultiSelect,
  multiSelect = false,
  mediaType = 'all',
  title = 'Select Media',
  filterByProject = true,
  defaultProjectId,
  defaultUploadTags = ''
}: MediaPickerProps) {
  const { selectedProject: globalSelectedProject } = useProject();
  const [media, setMedia] = useState<ApiMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project tagging state
  const [projects, setProjects] = useState<NotionProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [uploadTags, setUploadTags] = useState<string>('');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  // Fetch media from API
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${API_BASE}/api/year-in-review/2025/media/all`);
      url.searchParams.set('limit', '200');
      if (search) {
        url.searchParams.set('search', search);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch media');

      const data = await res.json();
      let items = data.media || [];

      // Filter by type if needed
      if (mediaType !== 'all') {
        items = items.filter((m: ApiMediaItem) =>
          mediaType === 'photo'
            ? m.file_type === 'photo' || m.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            : m.file_type === 'video' || m.file_url?.match(/\.(mp4|webm|ogg)$/i)
        );
      }

      // Filter by selected project if enabled
      if (filterByProject && globalSelectedProject) {
        items = items.filter((m: ApiMediaItem & { project_ids?: string[] }) =>
          matchesProject(globalSelectedProject, {
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
  }, [search, mediaType, filterByProject, globalSelectedProject]);

  // Fetch projects for tagging dropdown
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/real/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      const projectList = (data.projects || [])
        .filter((p: any) => p.name && p.name !== 'Unknown')
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setProjects(projectList);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      fetchProjects();
      setSelected(new Set());
      setShowUploadPanel(false);
      setFilesToUpload([]);
      // Auto-select the global project for uploads if one is selected
      setSelectedProject(defaultProjectId || globalSelectedProject?.id || '');
      setUploadTags(defaultUploadTags);
    }
  }, [isOpen, fetchMedia, fetchProjects, globalSelectedProject, defaultProjectId, defaultUploadTags]);

  // Handle file selection - show upload panel for bulk tagging
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFilesToUpload(Array.from(files));
    setShowUploadPanel(true);
  };

  // Handle actual upload with project tagging
  const handleUpload = async (files: FileList | null) => {
    // For direct upload without panel (legacy support)
    const filesToProcess = filesToUpload.length > 0 ? filesToUpload : (files ? Array.from(files) : []);
    if (filesToProcess.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadTotal(filesToProcess.length);
    setUploadCurrent(0);
    setError(null);

    const errors: string[] = [];

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setUploadCurrent(i + 1);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

        // Add project ID if selected
        if (selectedProject) {
          formData.append('project_ids', selectedProject);
        }

        // Add manual tags if provided
        if (uploadTags.trim()) {
          formData.append('manual_tags', uploadTags.trim());
        }

        try {
          const res = await fetch(`${API_BASE}/api/media/upload`, {
            method: 'POST',
            body: formData
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP ${res.status}`);
          }
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Failed'}`);
        }

        setUploadProgress(((i + 1) / filesToProcess.length) * 100);
      }

      // Show any errors
      if (errors.length > 0) {
        setError(`Failed to upload ${errors.length} file(s):\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`);
      }

      // Refresh media list
      await fetchMedia();

      // Reset upload panel
      setShowUploadPanel(false);
      setFilesToUpload([]);
      setSelectedProject('');
      setUploadTags('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadTotal(0);
      setUploadCurrent(0);
    }
  };

  // Handle media selection
  const handleSelect = (item: ApiMediaItem) => {
    if (multiSelect) {
      const newSelected = new Set(selected);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelected(newSelected);
    } else {
      // Single select - immediately return
      const mediaItem: MediaItem = {
        id: item.id,
        fileUrl: item.file_url,
        thumbnailUrl: item.thumbnail_url,
        fileType: item.file_type as 'photo' | 'video' | 'document',
        title: item.title,
        description: item.description,
        altText: item.alt_text
      };
      onSelect(mediaItem);
      onClose();
    }
  };

  // Confirm multi-select
  const handleConfirm = () => {
    if (multiSelect && onMultiSelect) {
      const selectedMedia = media
        .filter(m => selected.has(m.id))
        .map(item => ({
          id: item.id,
          fileUrl: item.file_url,
          thumbnailUrl: item.thumbnail_url,
          fileType: item.file_type as 'photo' | 'video' | 'document',
          title: item.title,
          description: item.description,
          altText: item.alt_text
        }));
      onMultiSelect(selectedMedia);
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 p-4 border-b border-slate-700/50">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search media..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={e => handleFileSelect(e.target.files)}
          />
        </div>

        {/* Bulk Upload Panel with Project Tagging */}
        {showUploadPanel && filesToUpload.length > 0 && (
          <div className="p-4 bg-slate-800/80 border-b border-slate-700">
            <div className="flex items-start gap-4">
              {/* File preview */}
              <div className="flex-1">
                <h3 className="text-white font-medium mb-2">
                  {filesToUpload.length} file{filesToUpload.length !== 1 ? 's' : ''} selected
                </h3>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {filesToUpload.slice(0, 10).map((file, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-sm text-slate-300">
                      <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate max-w-[120px]">{file.name}</span>
                    </div>
                  ))}
                  {filesToUpload.length > 10 && (
                    <span className="px-2 py-1 text-sm text-slate-400">
                      +{filesToUpload.length - 10} more
                    </span>
                  )}
                </div>
              </div>

              {/* Project selection */}
              <div className="w-64">
                <label className="block text-sm text-slate-400 mb-1">Tag with Project</label>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="">No project (upload only)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleUpload(null)}
                  disabled={uploading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {uploading ? `Uploading ${uploadCurrent}/${uploadTotal}...` : 'Start Upload'}
                </button>
                <button
                  onClick={() => {
                    setShowUploadPanel(false);
                    setFilesToUpload([]);
                    setSelectedProject('');
                    setUploadTags('');
                  }}
                  disabled={uploading}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Upload tags */}
            <div className="mt-3">
              <label className="block text-sm text-slate-400 mb-1">Add Tags (comma separated)</label>
              <input
                type="text"
                value={uploadTags}
                onChange={e => setUploadTags(e.target.value)}
                placeholder="e.g. aerial, workshop, portrait"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="px-4 py-2 bg-slate-800/50">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm text-slate-400">
                Uploading {uploadCurrent} of {uploadTotal}...
              </span>
              <span className="text-sm text-teal-400">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-400">No media found</p>
              <p className="text-slate-500 text-sm mt-1">Upload some images or videos to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {media.map(item => {
                const isSelected = selected.has(item.id);
                const isVideo = item.file_type === 'video' || item.file_url?.match(/\.(mp4|webm|ogg)$/i);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`relative aspect-square rounded-lg overflow-hidden bg-slate-800 group transition-all ${
                      isSelected
                        ? 'ring-2 ring-teal-500 ring-offset-2 ring-offset-slate-900'
                        : 'hover:ring-2 hover:ring-slate-500'
                    }`}
                  >
                    <img
                      src={item.thumbnail_url || item.file_url}
                      alt={item.alt_text || item.title || 'Media'}
                      className="w-full h-full object-cover"
                    />

                    {/* Video indicator */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Selection indicator */}
                    {multiSelect && (
                      <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-teal-500 border-teal-500'
                          : 'border-white/60 group-hover:border-white'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Hover overlay with title */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate">{item.title || 'Untitled'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer (for multi-select) */}
        {multiSelect && selected.size > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-800/50">
            <p className="text-slate-400">
              {selected.size} item{selected.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSelected(new Set())}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors"
              >
                Add Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaPicker;
