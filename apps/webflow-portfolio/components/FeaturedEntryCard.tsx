'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { VideoEmbed, parseVideoUrl } from './VideoEmbed';
import { formatDate, getSourceIcon, getTypeColor } from '../lib/yearInReviewApi';
import type { TimelineEntry } from '../types/yearInReview';

interface FeaturedEntryCardProps {
  entry: TimelineEntry;
  seasonColor: string;
  onClick?: (entry: TimelineEntry) => void;
}

/**
 * Large featured entry card with hero image/video support
 */
export function FeaturedEntryCard({ entry, seasonColor, onClick }: FeaturedEntryCardProps) {
  const hasHeroMedia = entry.heroImageUrl || entry.heroVideoUrl;
  const hasProjectPage = entry.hasProjectPage && entry.projectSlug;

  // Parse video URL to get platform info
  const videoInfo = useMemo(() => {
    if (entry.heroVideoUrl) {
      return parseVideoUrl(entry.heroVideoUrl);
    }
    return null;
  }, [entry.heroVideoUrl]);

  const handleClick = () => {
    if (onClick) {
      onClick(entry);
    }
  };

  const CardWrapper = hasProjectPage
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={`/2025-review/${entry.projectSlug}`} className="block group">
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className={`group ${onClick ? 'cursor-pointer' : ''}`} onClick={handleClick}>
          {children}
        </div>
      );

  return (
    <article className="relative">
      <CardWrapper>
        <div className="relative bg-slate-900/70 backdrop-blur-md border border-slate-600/50 rounded-3xl overflow-hidden hover:bg-slate-900/80 hover:border-slate-500/60 transition-all duration-300 shadow-lg">
          {/* Hero Section */}
          {hasHeroMedia && (
            <div className="relative aspect-[21/9] md:aspect-[21/8]">
              {videoInfo ? (
                <div
                  className="w-full h-full"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <VideoEmbed
                    platform={videoInfo.platform}
                    embedUrl={videoInfo.embedUrl}
                    title={entry.heroVideoTitle || entry.title}
                    thumbnail={entry.heroImageUrl}
                    className="rounded-none"
                  />
                </div>
              ) : entry.heroImageUrl ? (
                <>
                  <img
                    src={entry.heroImageUrl}
                    alt={entry.heroImageAlt || entry.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Gradient overlay - only on images, not videos */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent pointer-events-none" />
                </>
              ) : null}

              {/* Featured badge - pointer-events-none so it doesn't block video */}
              <div className="absolute top-4 left-4 pointer-events-none">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-sm"
                  style={{ backgroundColor: `${seasonColor}90`, color: '#fff' }}
                >
                  Featured
                </span>
              </div>

              {/* Project link indicator - pointer-events-none so it doesn't block video */}
              {hasProjectPage && (
                <div className="absolute top-4 right-4 pointer-events-none">
                  <span className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Read Full Story
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl" title={`From ${entry.source}`}>
                {getSourceIcon(entry.source)}
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${seasonColor}20`, color: seasonColor }}
              >
                {formatDate(entry.date)}
              </span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide"
                style={{ backgroundColor: `${getTypeColor(entry.type)}20`, color: getTypeColor(entry.type) }}
              >
                {entry.type}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-teal-300 transition-colors drop-shadow">
              {entry.editedTitle || entry.title}
            </h3>

            {/* Description */}
            <p className="text-slate-200 leading-relaxed text-lg line-clamp-3">
              {entry.editedDescription || entry.description}
            </p>

            {/* Quote */}
            {entry.quote && (
              <blockquote className="mt-6 pl-4 border-l-2 italic text-slate-300" style={{ borderColor: seasonColor }}>
                &ldquo;{entry.quote.text}&rdquo;
                <cite className="block mt-1 text-sm text-slate-500 not-italic">
                  &mdash; {entry.quote.author}
                </cite>
              </blockquote>
            )}

            {/* Photos (if no hero and has photos) */}
            {!hasHeroMedia && entry.photos && entry.photos.length > 0 && (
              <div className="mt-6 grid grid-cols-3 gap-2">
                {entry.photos.slice(0, 3).map((photo, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-700">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            {entry.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-slate-700/50 text-slate-300 text-sm rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between">
              {/* Metadata */}
              {(entry.metadata?.organization || entry.metadata?.likes !== undefined) && (
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  {entry.metadata.organization && (
                    <span>{entry.metadata.organization}</span>
                  )}
                  {entry.metadata.likes !== undefined && (
                    <span className="flex items-center gap-1">
                      <span>❤️</span>
                      {entry.metadata.likes}
                    </span>
                  )}
                </div>
              )}

              {/* Read more link */}
              {hasProjectPage && (
                <span className="flex items-center gap-2 text-teal-400 font-medium group-hover:text-teal-300 transition-colors">
                  Read Full Story
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              )}
            </div>
          </div>
        </div>
      </CardWrapper>
    </article>
  );
}

export default FeaturedEntryCard;
