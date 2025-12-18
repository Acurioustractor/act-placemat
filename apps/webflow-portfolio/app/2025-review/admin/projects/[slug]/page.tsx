'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BlockEditor } from '../../../../../components/admin/BlockEditor';
import { MediaPicker } from '../../../../../components/admin/MediaPicker';
import { MediaQuickAdd } from '../../../../../components/admin/MediaQuickAdd';
import { VideoEmbed, parseVideoUrl } from '../../../../../components/VideoEmbed';
import { ContentBlockRenderer } from '../../../../../components/ContentBlockRenderer';
import {
  getReviewProject,
  updateReviewProject,
  publishReviewProject,
  deleteReviewProject
} from '../../../../../lib/reviewProjectsApi';
import { generateProjectStory, type GeneratedProjectContent } from '../../../../../lib/yearInReviewApi';
import type { ReviewProject, ContentBlock, MediaItem } from '../../../../../types/yearInReview';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ProjectEditorPage({ params }: PageProps) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [project, setProject] = useState<ReviewProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageId, setHeroImageId] = useState<string | null>(null);
  const [heroVideoUrl, setHeroVideoUrl] = useState('');
  const [heroCaption, setHeroCaption] = useState('');
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // UI state
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showContentMediaPicker, setShowContentMediaPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'hero' | 'seo'>('content');

  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [genDepth, setGenDepth] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [showGenOptions, setShowGenOptions] = useState(false);

  const defaultNotionProjectId =
    project?.timelineEntryId?.startsWith('notion-')
      ? project.timelineEntryId.replace(/^notion-/, '')
      : undefined;

  // Load project data
  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    const loadProject = async () => {
      try {
        const data = await getReviewProject(2025, slug, true);
        if (!data) {
          setError('Project not found');
          return;
        }
        setProject(data);
        setTitle(data.title);
        setSubtitle(data.subtitle || '');
        setHeroImageUrl(data.heroImageUrl || '');
        setHeroImageId(data.heroImageId || null);
        setHeroVideoUrl(data.heroVideoUrl || '');
        setHeroCaption(data.heroCaption || '');
        setContentBlocks(data.contentBlocks || []);
        setMetaTitle(data.metaTitle || '');
        setMetaDescription(data.metaDescription || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [slug]);

  // Save project
  const handleSave = async () => {
    if (!slug) return;

    setSaving(true);
    setError(null);

    try {
      // Parse video URL if provided
      let videoUrl = heroVideoUrl;
      if (heroVideoUrl) {
        const parsed = parseVideoUrl(heroVideoUrl);
        if (parsed) {
          videoUrl = parsed.embedUrl;
        }
      }

      await updateReviewProject(2025, slug, {
        title,
        subtitle: subtitle || undefined,
        heroImageId: heroImageId || undefined,
        heroVideoUrl: videoUrl || undefined,
        heroCaption: heroCaption || undefined,
        contentBlocks,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined
      });

      // Reload project to get updated data
      const updated = await getReviewProject(2025, slug, true);
      if (updated) {
        setProject(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Publish/unpublish
  const handlePublish = async (publish: boolean) => {
    if (!slug) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await publishReviewProject(2025, slug, publish);
      setProject(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!slug) return;

    try {
      await deleteReviewProject(2025, slug);
      router.push('/2025-review/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Select hero image
  const handleHeroImageSelect = (media: MediaItem) => {
    setHeroImageId(media.id);
    setHeroImageUrl(media.fileUrl);
    setShowMediaPicker(false);
  };

  // AI Generate content
  const handleGenerateContent = async () => {
    setGenerating(true);
    setShowGenOptions(false);

    try {
      const result = await generateProjectStory(
        {
          name: title,
          description: subtitle,
        },
        {
          depth: genDepth,
          includeQuote: true,
        }
      );

      if (result.success && result.generated) {
        // Update subtitle if generated
        if (result.generated.subtitle) {
          setSubtitle(result.generated.subtitle);
        }

        // Update content blocks
        if (result.generated.contentBlocks && result.generated.contentBlocks.length > 0) {
          setContentBlocks(result.generated.contentBlocks);
        }

        // Update meta description if generated
        if (result.generated.metaDescription) {
          setMetaDescription(result.generated.metaDescription);
        }
      } else {
        alert(`Generation failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Generation error:', err);
      alert('Failed to generate content. Check console.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/2025-review/admin" className="text-teal-400 hover:underline">
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
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
                <h1 className="text-xl font-bold text-white">{project?.title || 'Edit Project'}</h1>
                <p className="text-sm text-slate-400">
                  {project?.isPublished ? (
                    <span className="text-green-400">Published</span>
                  ) : (
                    <span className="text-amber-400">Draft</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Preview */}
              <Link
                href={`/2025-review/${slug}?preview=true`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </Link>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                Save
              </button>

              {/* Publish/Unpublish */}
              {project?.isPublished ? (
                <button
                  onClick={() => handlePublish(false)}
                  disabled={saving}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Unpublish
                </button>
              ) : (
                <button
                  onClick={() => handlePublish(true)}
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Publish
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex gap-1 p-1 bg-slate-900 rounded-lg w-fit">
          {(['content', 'hero', 'seo'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 pb-12">
        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white uppercase tracking-wide">Story content</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr),minmax(0,2fr)]">
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-xl font-bold placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    placeholder="Project title..."
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    placeholder="A brief description..."
                  />
                </div>

                {/* Block Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-400">Content</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowGenOptions(!showGenOptions)}
                        disabled={generating || !title}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {generating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Generate Content
                          </>
                        )}
                      </button>
                      {showGenOptions && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 z-10">
                          <p className="text-xs text-slate-400 mb-3">
                            Generate story content from the project title and subtitle
                          </p>
                          <div className="mb-3">
                            <label className="text-xs text-slate-400 block mb-1">Content depth</label>
                            <select
                              value={genDepth}
                              onChange={(e) => setGenDepth(e.target.value as typeof genDepth)}
                              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                            >
                              <option value="brief">Brief (2 paragraphs)</option>
                              <option value="standard">Standard (4 paragraphs)</option>
                              <option value="detailed">Detailed (6 paragraphs)</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowGenOptions(false)}
                              className="flex-1 px-3 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleGenerateContent}
                              className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-medium transition-colors"
                            >
                              Generate
                            </button>
                          </div>
                          {contentBlocks.length > 0 && (
                            <p className="text-xs text-amber-400 mt-2">
                              Warning: This will replace existing content
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <BlockEditor
                    content={contentBlocks}
                    onChange={setContentBlocks}
                    placeholder="Tell your story..."
                  />
                </div>

                {/* Media Quick Add */}
                <MediaQuickAdd
                  onAddBlock={(block) => {
                    setContentBlocks(prev => [...prev, block]);
                  }}
                  className="mt-4"
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div>
                    <p className="text-sm font-medium text-white">Upload & insert photos</p>
                    <p className="text-xs text-slate-400">Adds selected media as image blocks in the story.</p>
                  </div>
                  <button
                    onClick={() => setShowContentMediaPicker(true)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Add Photos
                  </button>
                </div>

                {/* Simple reorder/delete helpers */}
                {contentBlocks.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-white">Blocks ({contentBlocks.length})</p>
                      <button
                        onClick={() => {
                          if (confirm('Clear all blocks?')) setContentBlocks([]);
                        }}
                        className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-2">
                      {contentBlocks.map((b, idx) => {
                        const label =
                          b.type === 'heading'
                            ? `Heading ${(b.data as any)?.level || 2}`
                            : b.type.charAt(0).toUpperCase() + b.type.slice(1);
                        const snippet =
                          (b.data as any)?.text ||
                          (b.data as any)?.quoteText ||
                          (b.data as any)?.mediaUrl ||
                          (b.data as any)?.videoUrl ||
                          '';

                        return (
                          <div key={b.id || idx} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg p-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white">{label}</p>
                              {snippet && <p className="text-xs text-slate-500 truncate">{String(snippet)}</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  if (idx === 0) return;
                                  setContentBlocks(prev => {
                                    const next = [...prev];
                                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                    return next;
                                  });
                                }}
                                disabled={idx === 0}
                                className="px-2 py-1 text-slate-300 hover:text-white disabled:opacity-40"
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => {
                                  if (idx === contentBlocks.length - 1) return;
                                  setContentBlocks(prev => {
                                    const next = [...prev];
                                    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                    return next;
                                  });
                                }}
                                disabled={idx === contentBlocks.length - 1}
                                className="px-2 py-1 text-slate-300 hover:text-white disabled:opacity-40"
                                title="Move down"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => {
                                  setContentBlocks(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="px-2 py-1 text-slate-300 hover:text-red-400"
                                title="Delete block"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Live preview column */}
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white">Live preview</p>
                    <a
                      href={`/2025-review/${slug}?preview=true`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-teal-400 hover:underline"
                    >
                      Open full page preview →
                    </a>
                  </div>
                  {contentBlocks.length === 0 ? (
                    <p className="text-slate-500 text-sm">
                      Content blocks will appear here as you build the story.
                    </p>
                  ) : (
                    <ContentBlockRenderer blocks={contentBlocks} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Tab */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            {/* Hero Image */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Hero Image</label>
              {heroImageUrl ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                  <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button
                      onClick={() => setShowMediaPicker(true)}
                      className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
                    >
                      Change
                    </button>
                    <button
                      onClick={() => {
                        setHeroImageUrl('');
                        setHeroImageId(null);
                      }}
                      className="px-4 py-2 bg-red-500/50 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-red-500/70 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowMediaPicker(true)}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-600 bg-slate-900/50 flex flex-col items-center justify-center gap-3 transition-colors"
                >
                  <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-500">Click to add hero image</span>
                </button>
              )}
            </div>

            {/* Hero Video */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Hero Video (optional)</label>
              <input
                type="text"
                value={heroVideoUrl}
                onChange={e => setHeroVideoUrl(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                placeholder="Paste Loom, YouTube, or Vimeo URL..."
              />
              {heroVideoUrl && parseVideoUrl(heroVideoUrl) && (
                <div className="mt-4">
                  <VideoEmbed
                    platform={parseVideoUrl(heroVideoUrl)!.platform}
                    embedUrl={parseVideoUrl(heroVideoUrl)!.embedUrl}
                  />
                </div>
              )}
            </div>

            {/* Hero Caption */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Hero Caption</label>
              <input
                type="text"
                value={heroCaption}
                onChange={e => setHeroCaption(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                placeholder="Photo credit or description..."
              />
            </div>
          </div>
        )}

        {/* SEO Tab */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={e => setMetaTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                placeholder="SEO title (defaults to project title)"
              />
              <p className="mt-1 text-xs text-slate-500">{metaTitle.length || title.length}/60 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={e => setMetaDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 resize-none"
                placeholder="Brief description for search engines..."
              />
              <p className="mt-1 text-xs text-slate-500">{metaDescription.length}/160 characters</p>
            </div>

            {/* Preview */}
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Search Preview</p>
              <div className="space-y-1">
                <p className="text-blue-400 text-lg">{metaTitle || title || 'Project Title'}</p>
                <p className="text-green-400 text-sm">act.place/2025-review/{slug}</p>
                <p className="text-slate-400 text-sm line-clamp-2">
                  {metaDescription || subtitle || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <h3 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h3>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-900/30 border border-red-800 text-red-400 rounded-lg font-medium hover:bg-red-900/50 transition-colors"
          >
            Delete Project
          </button>
        </div>
      </main>

      {/* Media Picker */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleHeroImageSelect}
        mediaType="photo"
        title="Select Hero Image"
        defaultProjectId={defaultNotionProjectId}
      />

      {/* Content Media Picker */}
      <MediaPicker
        isOpen={showContentMediaPicker}
        onClose={() => setShowContentMediaPicker(false)}
        onSelect={() => {}}
        multiSelect
        onMultiSelect={(items) => {
          const now = Date.now();
          const blocks: ContentBlock[] = items.map((m, index) => ({
            id: `img-${now}-${index}`,
            type: 'image',
            data: {
              mediaId: m.id,
              mediaUrl: m.fileUrl,
              altText: m.altText || m.title || undefined,
              caption: m.title || undefined
            }
          }));
          setContentBlocks(prev => [...prev, ...blocks]);
          setShowContentMediaPicker(false);
        }}
        mediaType="photo"
        title="Add Photos"
        defaultProjectId={defaultNotionProjectId}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Delete Project?</h3>
            <p className="text-slate-400 mb-6">
              This action cannot be undone. The project and all its content will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
