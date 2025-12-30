'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { VideoEmbed, parseVideoUrl } from './VideoEmbed';
import { formatDate, getTypeColor } from '../lib/yearInReviewApi';
import type { TimelineEntry } from '../types/yearInReview';
import {
  Heartland,
  StorySpiral,
  ConnectionWeb,
  YarningCircle,
  OutwardArrow,
} from './icons/ACTIcons';

// Earth tone palette for ACT identity
const earthTones = {
  terracotta: '#C2704A',
  ochre: '#CC7A22',
  sage: '#7D9A6E',
  clay: '#A0785A',
  sand: '#D4B896',
  rust: '#B7472A',
};

// Source icons using ACT-style organic icons
function SourceIcon({ source, className }: { source: string; className?: string }) {
  const iconClass = className || 'w-4 h-4';
  switch (source) {
    case 'gmail':
      return <YarningCircle className={iconClass} />; // Conversations
    case 'notion':
      return <StorySpiral className={iconClass} />; // Stories/documentation
    case 'linkedin':
      return <ConnectionWeb className={iconClass} />; // Connections/networking
    default:
      return <StorySpiral className={iconClass} />;
  }
}

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
    <article className="relative group/article">
      <CardWrapper>
        {/* Organic background texture overlay */}
        <div className="relative bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-950/80 backdrop-blur-md border border-slate-600/40 rounded-3xl overflow-hidden hover:border-amber-700/40 transition-all duration-500 shadow-xl shadow-black/20">
          {/* Subtle organic pattern overlay */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, ${earthTones.terracotta}40 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${earthTones.sage}30 0%, transparent 50%)`,
          }} />
          {/* Hero Section - contained with proper overflow handling */}
          {hasHeroMedia && (
            <div className="relative w-full overflow-hidden" style={{ maxHeight: '320px' }}>
              {/* Fixed aspect ratio container */}
              <div className="relative w-full" style={{ paddingBottom: '42.86%' /* 21:9 aspect ratio */ }}>
                {videoInfo ? (
                  <div
                    className="absolute inset-0"
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
                  <div className="absolute inset-0">
                    <img
                      src={entry.heroImageUrl}
                      alt={entry.heroImageAlt || entry.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Strong gradient overlay to ensure text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-slate-900/20 pointer-events-none" />
                  </div>
                ) : null}
              </div>

              {/* Featured badge - positioned within the image area */}
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-md shadow-lg"
                  style={{ backgroundColor: `${seasonColor}`, color: '#fff' }}
                >
                  Featured
                </span>
              </div>

              {/* Project link indicator */}
              {hasProjectPage && (
                <div className="absolute top-4 right-4 z-10 pointer-events-none">
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-white text-xs font-medium shadow-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Read Full Story
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content - with solid background to prevent overlap */}
          <div className="relative p-6 md:p-8 bg-gradient-to-b from-slate-900 to-slate-950">
            {/* Top border accent */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-2 rounded-lg bg-slate-700/50 text-slate-300"
                title={`From ${entry.source}`}
              >
                <SourceIcon source={entry.source} className="w-5 h-5" />
              </div>
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
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 transition-colors drop-shadow group-hover:text-amber-200">
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
                    <span className="flex items-center gap-1.5">
                      <ConnectionWeb className="w-3 h-3" />
                      {entry.metadata.organization}
                    </span>
                  )}
                  {entry.metadata.likes !== undefined && (
                    <span className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors">
                      <Heartland className="w-4 h-4" />
                      {entry.metadata.likes}
                    </span>
                  )}
                </div>
              )}

              {/* Read more link - ACT style with earth tone accent */}
              {hasProjectPage && (
                <span className="flex items-center gap-2 font-medium transition-all group-hover:gap-3" style={{ color: earthTones.ochre }}>
                  Read Full Story
                  <OutwardArrow className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </div>
          </div>

          {/* Decorative corner accent - organic hand-drawn feel */}
          <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" stroke={earthTones.terracotta} strokeWidth="1">
              <path d="M100 100 Q80 90 70 100" opacity="0.6" />
              <path d="M100 90 Q70 75 60 90" opacity="0.4" />
              <path d="M100 80 Q60 60 50 80" opacity="0.3" />
            </svg>
          </div>
        </div>
      </CardWrapper>
    </article>
  );
}

export default FeaturedEntryCard;
