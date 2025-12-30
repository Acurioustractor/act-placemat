'use client';

import { useState } from 'react';
import Link from 'next/link';
import { VideoEmbed, parseVideoUrl } from './VideoEmbed';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import type { ReviewProject } from '../types/yearInReview';

function getActionLines(blocks?: ReviewProject['contentBlocks']) {
  if (!blocks || blocks.length === 0) return [];
  const lines: string[] = [];

  blocks.forEach((block) => {
    const text = block.data.text;
    if (!text) return;
    text.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const isBullet = trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.includes('—');
      const cleaned = trimmed.replace(/^[-•\s]+/, '').trim();
      if (isBullet) {
        lines.push(cleaned);
      }
    });
  });

  return lines.filter(Boolean);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ProjectStoryPageProps {
  project: ReviewProject;
  isPreview?: boolean;
}

/**
 * Clean project story page with conditional sections
 * - Only shows sections that have content
 * - Simple, focused template
 */
export function ProjectStoryPage({ project, isPreview = false }: ProjectStoryPageProps) {
  const hasHeroMedia = project.heroImageUrl || project.heroVideoUrl;
  const hasDescriptionVideo = project.descriptionVideoUrl || project.heroVideoUrl;
  const hasFeaturedPhotos = project.featuredPhotos && project.featuredPhotos.length > 0;
  const hasGallery = project.gallery && project.gallery.length > 0;
  const hasVideos = project.videos && project.videos.length > 0;
  const hasContent = project.contentBlocks && project.contentBlocks.length > 0;
  const hasExternalLinks = project.liveUrl || project.repoUrl || project.notionUrl;
  const hasTags = project.tags && project.tags.length > 0;
  const listenText = project.aiSummary || project.description || 'We listened to the community in their own words.';
  const curiosityText =
    project.subtitle ||
    (project.description && project.description !== listenText
      ? project.description
      : 'Curiosity fuels the next season of this work.');
  const actionItems = getActionLines(project.contentBlocks);
  const artText = project.heroCaption || project.subtitle || `Visual expression of ${project.title}.`;
  const themeLabel = project.tags && project.tags.length > 0 ? project.tags.join(', ') : 'Theme coming soon';
  const leadName = typeof project.projectLead === 'object'
    ? project.projectLead.name
    : project.projectLead || project.lead || 'The ACT Team';
  const cleanLeadName = leadName.replace(/^@/, '');
  const leadHandle = `@${cleanLeadName.replace(/\s+/g, '')}`;
  const ctaUrl = project.liveUrl || project.notionUrl || project.repoUrl;

  // Contact form state
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/messages/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: contactMessage,
          projectTitle: project.title,
          projectSlug: project.slug,
          source: '2025-review'
        })
      });

      if (!res.ok) throw new Error('Failed to send');

      setSent(true);
      setTimeout(() => {
        setShowContactModal(false);
        setSent(false);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      }, 2000);
    } catch {
      // Fallback to email
      const subject = encodeURIComponent(`Question about: ${project.title}`);
      const body = encodeURIComponent(`Hi,\n\nI have a question about "${project.title}":\n\n${contactMessage}\n\n---\nFrom: ${contactName} (${contactEmail})`);
      window.open(`mailto:hello@act.place?subject=${subject}&body=${body}`, '_blank');
      setShowContactModal(false);
    } finally {
      setSending(false);
    }
  };

  // Parse description video URL
  const descriptionVideo = project.descriptionVideoUrl
    ? parseVideoUrl(project.descriptionVideoUrl)
    : project.heroVideoUrl
      ? parseVideoUrl(project.heroVideoUrl)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Preview Banner */}
      {isPreview && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-amber-950 text-center py-2 text-sm font-medium">
          Preview Mode - This project is not yet published
        </div>
      )}

      {/* Navigation */}
      <nav className={`sticky ${isPreview ? 'top-8' : 'top-0'} z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/2025-review"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to 2025 Review
          </Link>

          <div className="flex items-center gap-3">
            {isPreview && !project.isFeatured && (
              <Link
                href={`/2025-review/admin/projects/${project.slug}`}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Edit Project
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative">
        {hasHeroMedia ? (
          <div className="relative h-[50vh] md:h-[60vh]">
            {project.heroVideoUrl ? (
              <div className="absolute inset-0">
                <VideoEmbed
                  platform={project.heroVideoType || 'direct'}
                  embedUrl={project.heroVideoUrl}
                  autoplay
                  className="h-full rounded-none"
                />
              </div>
            ) : project.heroImageUrl ? (
              <img
                src={project.heroImageUrl}
                alt={project.heroImageAlt || project.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

            {/* Title overlay */}
            <div className="absolute inset-0 flex items-end">
              <div className="w-full max-w-6xl mx-auto px-6 pb-12">
                {/* Season & Tags */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {project.season && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-teal-500/20 text-teal-300">
                      {project.season}
                    </span>
                  )}
                  {hasTags && project.tags?.slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs bg-slate-700/50 text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg mb-4">
                  {project.title}
                </h1>
                {project.subtitle && (
                  <p className="text-xl md:text-2xl text-slate-200 max-w-3xl drop-shadow">
                    {project.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Simple header without hero media
          <div className="pt-16 pb-12 md:pt-24 md:pb-16 bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-6xl mx-auto px-6">
              {/* Season & Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {project.season && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-teal-500/20 text-teal-300">
                    {project.season}
                  </span>
                )}
                {hasTags && project.tags?.slice(0, 3).map((tag, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs bg-slate-700/50 text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg mb-4">
                {project.title}
              </h1>
              {project.subtitle && (
                <p className="text-xl md:text-2xl text-slate-300 max-w-3xl">
                  {project.subtitle}
                </p>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">

          <section className="mb-10">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-10 space-y-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-purple-300 mb-2">Theme</p>
                  <p className="text-2xl font-semibold text-white">{themeLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-purple-300 mb-2">Lead</p>
                  <p className="text-lg font-semibold text-white">{leadHandle}</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-teal-300 flex items-center gap-2">
                    <span aria-hidden>🎧</span>
                    Listen
                  </h3>
                  <p className="text-slate-200 leading-relaxed">{listenText}</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                    <span aria-hidden>🔍</span>
                    Curiosity
                  </h3>
                  <p className="text-slate-200 leading-relaxed">{curiosityText}</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
                    <span aria-hidden>⚡</span>
                    Action
                  </h3>
                  <ul className="list-disc list-inside text-slate-200 space-y-1 text-sm">
                    {(actionItems.length > 0 ? actionItems : [
                      'Add action bullets (prefixed with “-” or “—” in content blocks) to highlight what has happened.'
                    ]).map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                  {ctaUrl && (
                    <a
                      href={ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 bg-white text-slate-900 font-semibold rounded-full hover:bg-slate-300 transition-colors"
                    >
                      Learn more
                    </a>
                  )}
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-fuchsia-300 flex items-center gap-2">
                    <span aria-hidden>🎨</span>
                    Art
                  </h3>
                  <p className="text-slate-200 leading-relaxed">{artText}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Description Section */}
          {project.description && (
            <section className="mb-12">
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-4xl">
                {project.description}
              </p>
            </section>
          )}

          {/* Two-column layout for video + photos */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">

            {/* Description Video (only if URL exists) */}
            {hasDescriptionVideo && descriptionVideo && (
              <section className="lg:col-span-1">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Project Overview
                </h2>
                <div className="rounded-2xl overflow-hidden">
                  <VideoEmbed
                    platform={descriptionVideo.platform}
                    embedUrl={descriptionVideo.embedUrl}
                    title={project.descriptionVideoTitle || `${project.title} overview`}
                  />
                </div>
              </section>
            )}

            {/* Featured Photos Grid (only if photos exist) */}
            {hasFeaturedPhotos && (
              <section className={hasDescriptionVideo && descriptionVideo ? 'lg:col-span-1' : 'lg:col-span-2'}>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Photos
                </h2>
                <div className={`grid gap-3 ${
                  project.featuredPhotos!.length === 1 ? 'grid-cols-1' :
                  project.featuredPhotos!.length === 2 ? 'grid-cols-2' :
                  project.featuredPhotos!.length <= 4 ? 'grid-cols-2' :
                  'grid-cols-3'
                }`}>
                  {project.featuredPhotos!.map((photoUrl, index) => (
                    <div
                      key={index}
                      className={`rounded-xl overflow-hidden bg-slate-800 ${
                        project.featuredPhotos!.length === 1 ? 'aspect-video' :
                        index === 0 && project.featuredPhotos!.length > 2 ? 'col-span-2 row-span-2 aspect-square' :
                        'aspect-square'
                      }`}
                    >
                      <img
                        src={photoUrl}
                        alt={`${project.title} photo ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Gallery from media library (only if exists) */}
          {hasGallery && (
            <section className="mb-12 pt-8 border-t border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {project.gallery!.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="aspect-square rounded-xl overflow-hidden bg-slate-800"
                  >
                    <img
                      src={item.thumbnailUrl || item.fileUrl}
                      alt={item.altText || item.title || `Gallery image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Content Blocks */}
          {hasContent && (
            <section className="mb-12">
              <article className="max-w-4xl">
                <ContentBlockRenderer blocks={project.contentBlocks} />
              </article>
            </section>
          )}

          {/* Additional Videos (only if exists) */}
          {hasVideos && (
            <section className="mb-12 pt-8 border-t border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">More Videos</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {project.videos!.map((video, index) => (
                  <div key={video.id || index}>
                    <VideoEmbed
                      platform={video.platform}
                      embedUrl={video.embedUrl}
                      title={video.title}
                      thumbnail={video.thumbnailUrl}
                    />
                    {video.title && (
                      <p className="mt-3 text-slate-300 font-medium">{video.title}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* External Links (only if exists) */}
          {hasExternalLinks && (
            <section className="mb-12 pt-8 border-t border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">Links</h2>
              <div className="flex flex-wrap gap-3">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit Live Site
                  </a>
                )}
                {project.repoUrl && (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    View Repository
                  </a>
                )}
                {project.notionUrl && (
                  <a
                    href={project.notionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
                    </svg>
                    Notion Page
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Call to Action */}
          <section className="pt-8 border-t border-slate-800">
            <div className="bg-gradient-to-r from-teal-900/30 to-slate-800/30 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-3">Interested in this project?</h2>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                Get in touch to learn more or discuss collaboration opportunities.
              </p>
              <button
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Get in Touch
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Get in Touch</h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-medium">Message sent!</p>
                <p className="text-slate-400 text-sm mt-1">We&apos;ll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Message</label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-teal-500 focus:outline-none resize-none"
                    placeholder={`I'd like to learn more about ${project.title}...`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white rounded-lg font-semibold transition-colors"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Edit Link - only for non-featured projects */}
      {!isPreview && !project.isFeatured && (
        <div className="fixed bottom-4 right-4 z-50 opacity-20 hover:opacity-100 transition-opacity">
          <Link
            href={`/2025-review/admin/projects/${project.slug}`}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Edit
          </Link>
        </div>
      )}
    </div>
  );
}

export default ProjectStoryPage;
