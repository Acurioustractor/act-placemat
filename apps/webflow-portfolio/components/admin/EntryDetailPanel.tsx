'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Mail, Briefcase, Pencil, FileText } from 'lucide-react';
import type { TimelineEntry, MediaItem, VideoEmbed, ReviewProject } from '../../types/yearInReview';
import { generateTimelineDescription } from '../../lib/yearInReviewApi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface EntryDetailPanelProps {
  entry: TimelineEntry;
  onClose: () => void;
  onUpdate: (updates: Partial<TimelineEntry>) => void;
  onSetHeroImage: () => void;
  onAddVideo: () => void;
  onDelete: () => void;
  projects: ReviewProject[];
  onLinkProject: (project: ReviewProject | null) => void;
  onCreateProject: () => void;
}

export function EntryDetailPanel({
  entry,
  onClose,
  onUpdate,
  onSetHeroImage,
  onAddVideo,
  onDelete,
  projects,
  onLinkProject,
  onCreateProject,
}: EntryDetailPanelProps) {
  const [editedTitle, setEditedTitle] = useState(entry.editedTitle || entry.title);
  const [editedDescription, setEditedDescription] = useState(entry.editedDescription || entry.description);
  const [quickNote, setQuickNote] = useState('');
  const [gallery, setGallery] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<VideoEmbed[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectSlug, setSelectedProjectSlug] = useState(entry.projectSlug || '');
  const [generating, setGenerating] = useState(false);
  const [genStyle, setGenStyle] = useState<'narrative' | 'bullet' | 'impact'>('narrative');

  // Load entry's media
  useEffect(() => {
    loadEntryMedia();
  }, [entry.id]);

  const loadEntryMedia = async () => {
    try {
      // Load gallery
      const galleryRes = await fetch(`${API_BASE}/api/year-in-review/2025/media/gallery/timeline_entry/${entry.id}`);
      if (galleryRes.ok) {
        const data = await galleryRes.json();
        setGallery(data.items || []);
      }

      // Load videos for this entry
      const videosRes = await fetch(`${API_BASE}/api/year-in-review/2025/videos?linkType=timeline_entry&linkId=${entry.id}`);
      if (videosRes.ok) {
        const data = await videosRes.json();
        setVideos(data.videos || []);
      }
    } catch (e) {
      console.error('Failed to load entry media:', e);
    }
  };

  const handleSave = () => {
    const updates: Partial<TimelineEntry> = {};

    if (editedTitle !== entry.title) {
      updates.editedTitle = editedTitle;
    }
    if (editedDescription !== entry.description) {
      updates.editedDescription = editedDescription;
    }

    onUpdate(updates);
  };

  const currentProject = projects.find((project) => project.slug === entry.projectSlug);

  useEffect(() => {
    setSelectedProjectSlug(entry.projectSlug || '');
  }, [entry.projectSlug]);

  const handleProjectChange = (slug: string) => {
    setSelectedProjectSlug(slug);
    const project = projects.find((p) => p.slug === slug) || null;
    onLinkProject(project);
  };

  const handleAddQuickNote = () => {
    if (!quickNote.trim()) return;

    const newDescription = editedDescription
      ? `${editedDescription}\n\n---\n${quickNote}`
      : quickNote;

    setEditedDescription(newDescription);
    setQuickNote('');
    onUpdate({ editedDescription: newDescription });
  };

  // AI Generate description
  const handleGenerateDescription = async () => {
    setGenerating(true);
    try {
      const result = await generateTimelineDescription(
        {
          title: editedTitle,
          description: editedDescription,
          source: entry.source,
          type: entry.type,
          date: entry.date,
          tags: entry.tags,
          metadata: entry.metadata,
        },
        { style: genStyle }
      );

      if (result.success && result.generated) {
        setEditedDescription(result.generated.description);
        onUpdate({ editedDescription: result.generated.description });
        // If there's a suggested title, offer it
        if (result.generated.suggestedTitle && result.generated.suggestedTitle !== editedTitle) {
          if (confirm(`AI suggests a better title: "${result.generated.suggestedTitle}"\n\nUse this title?`)) {
            setEditedTitle(result.generated.suggestedTitle);
            onUpdate({ editedTitle: result.generated.suggestedTitle });
          }
        }
      } else {
        alert(`Generation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Generation error:', err);
      alert('Failed to generate. Check console.');
    } finally {
      setGenerating(false);
    }
  };

  const getSourceIcon = (source: string) => {
    const iconClass = 'w-4 h-4';
    switch (source) {
      case 'notion':
        return <BookOpen className={iconClass} />;
      case 'gmail':
        return <Mail className={iconClass} />;
      case 'linkedin':
        return <Briefcase className={iconClass} />;
      case 'manual':
        return <Pencil className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project':
        return 'bg-blue-500/20 text-blue-400';
      case 'milestone':
        return 'bg-teal-500/20 text-teal-400';
      case 'partnership':
        return 'bg-purple-500/20 text-purple-400';
      case 'funding':
        return 'bg-green-500/20 text-green-400';
      case 'launch':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/95">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getSourceIcon(entry.source)}</span>
          <div>
            <h2 className="font-semibold text-white text-lg">Entry Details</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(entry.type)}`}>
                {entry.type}
              </span>
              <span className="text-slate-500 text-xs">
                {new Date(entry.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Hero Media */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Hero Media</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Hero Image */}
            <button
              onClick={onSetHeroImage}
              className="aspect-video bg-slate-700 rounded-lg border-2 border-dashed border-slate-600 hover:border-teal-500 transition-colors flex flex-col items-center justify-center gap-2 overflow-hidden"
            >
              {entry.heroImageUrl ? (
                <img src={entry.heroImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <>
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-slate-500">Add Hero Image</span>
                </>
              )}
            </button>

            {/* Hero Video */}
            <button
              onClick={onAddVideo}
              className="aspect-video bg-slate-700 rounded-lg border-2 border-dashed border-slate-600 hover:border-teal-500 transition-colors flex flex-col items-center justify-center gap-2 overflow-hidden"
            >
              {entry.heroVideoUrl ? (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                  <svg className="w-12 h-12 text-teal-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="absolute bottom-1 left-1 text-xs bg-black/50 px-1 rounded">
                    {entry.heroVideoPlatform}
                  </span>
                </div>
              ) : (
                <>
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-slate-500">Add Video</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Title</label>
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSave}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-400">Description</label>
            <div className="flex items-center gap-2">
              <select
                value={genStyle}
                onChange={(e) => setGenStyle(e.target.value as typeof genStyle)}
                className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-300"
              >
                <option value="narrative">Narrative</option>
                <option value="bullet">Bullet</option>
                <option value="impact">Impact</option>
              </select>
              <button
                onClick={handleGenerateDescription}
                disabled={generating}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white rounded font-medium transition-colors"
              >
                {generating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Generate
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            onBlur={handleSave}
            rows={4}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 resize-none"
          />
        </div>

        {/* Quick Note */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Add Quick Note</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Add a note..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddQuickNote()}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={handleAddQuickNote}
              disabled={!quickNote.trim()}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-600 disabled:text-slate-400 text-slate-900 font-medium rounded-lg transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Project page link */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Project Page</label>
          <div className="flex flex-col gap-2">
            <select
              value={selectedProjectSlug}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">Not linked to a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.slug}>
                  {project.title || project.slug}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onCreateProject}
                className="px-3 py-1.5 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Create project page
              </button>
              {entry.projectSlug && currentProject && (
                <>
                  <a
                    href={`/2025-review/admin/projects/${entry.projectSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition-colors"
                  >
                    Open project editor
                  </a>
                  <a
                    href={`/2025-review/${entry.projectSlug}?preview=true`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                  >
                    View project page
                  </a>
                  <button
                    type="button"
                    onClick={() => handleProjectChange('')}
                    className="px-3 py-1.5 rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors"
                  >
                    Unlink project
                  </button>
                </>
              )}
              {currentProject && (
                <span className="text-slate-400 truncate max-w-[200px]">
                  Linked to: {currentProject.title || currentProject.slug}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Gallery */}
        {gallery.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Gallery ({gallery.length})</h3>
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((item) => (
                <div key={item.id} className="aspect-square bg-slate-700 rounded-lg overflow-hidden">
                  <img
                    src={item.thumbnailUrl || item.fileUrl}
                    alt={item.altText || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {videos.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Videos ({videos.length})</h3>
            <div className="space-y-2">
              {videos.map((video) => (
                <div key={video.id} className="flex items-center gap-3 bg-slate-700 rounded-lg p-3">
                  <div className="w-16 h-10 bg-slate-800 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-teal-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{video.title || 'Untitled'}</p>
                    <p className="text-xs text-slate-500">{video.platform}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Tags</label>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Metadata</label>
            <div className="bg-slate-700 rounded-lg p-3 text-xs font-mono text-slate-400">
              <pre className="whitespace-pre-wrap">{JSON.stringify(entry.metadata, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/95">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ included: !entry.included })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                entry.included
                  ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'
                  : 'bg-slate-600/50 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {entry.included ? 'Included' : 'Excluded'}
            </button>
            <button
              onClick={() => onUpdate({ isFeatured: !entry.isFeatured })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                entry.isFeatured
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-slate-600/50 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {entry.isFeatured ? '★ Featured' : '☆ Feature'}
            </button>
            <button
              onClick={onDelete}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !entry.included
                  ? 'bg-red-600/30 text-red-400 hover:bg-red-600/50'
                  : 'bg-slate-600/50 text-slate-500 hover:bg-red-600/20 hover:text-red-400'
              }`}
            >
              {entry.source === 'manual' ? '🗑️ Delete' : '✕ Exclude'}
            </button>
          </div>
          {entry.hasProjectPage ? (
            <a
              href={`/2025-review/admin/projects/${entry.projectSlug}`}
              className="text-teal-400 hover:text-teal-300 text-sm"
            >
              Edit Project Page →
            </a>
          ) : (
            <span className="text-slate-500 text-sm">No project page</span>
          )}
        </div>
      </div>
    </div>
  );
}
