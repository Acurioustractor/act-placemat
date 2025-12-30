'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Mail, BookOpen, Briefcase, FileText, Heart, MessageCircle } from 'lucide-react';
import { formatDate, getTypeColor } from '../lib/yearInReviewApi';
import { VideoEmbed, parseVideoUrl } from './VideoEmbed';
import type { TimelineEntry } from '../types/yearInReview';

// Elegant source icons using Lucide
function SourceIcon({ source, className }: { source: string; className?: string }) {
  const iconClass = className || 'w-5 h-5';
  switch (source) {
    case 'gmail':
      return <Mail className={iconClass} />;
    case 'notion':
      return <BookOpen className={iconClass} />;
    case 'linkedin':
      return <Briefcase className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}

interface TimelineEntryCardProps {
  entry: TimelineEntry;
  index: number;
  seasonColor: string;
  onClick?: (entry: TimelineEntry) => void;
}

export function TimelineEntryCard({ entry, index, seasonColor, onClick }: TimelineEntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const isEven = index % 2 === 0;

  // Parse video URL if present
  const videoInfo = useMemo(() => {
    if (entry.heroVideoUrl) {
      return parseVideoUrl(entry.heroVideoUrl);
    }
    return null;
  }, [entry.heroVideoUrl]);

  const hasVideo = !!videoInfo;
  const hasImage = !!entry.heroImageUrl;
  const showVideoOnly = hasVideo && !hasImage;

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCardClick = () => {
    if (onClick) {
      onClick(entry);
    }
  };

  return (
    <article
      ref={cardRef}
      className={`
        relative group
        ${isEven ? 'md:pr-[50%]' : 'md:pl-[50%]'}
        ${onClick ? 'cursor-pointer' : ''}
        transition-all duration-700 ease-out
        ${isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
        }
      `}
      style={{
        transitionDelay: `${(index % 5) * 100}ms`,
      }}
      onClick={handleCardClick}
    >
      {/* Timeline connector line - desktop only */}
      <div
        className="hidden md:block absolute top-8 left-1/2 w-12 h-0.5 transition-all duration-300 group-hover:w-16"
        style={{ backgroundColor: `${seasonColor}40` }}
      >
        {/* Animated pulse dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all duration-300 group-hover:scale-125"
          style={{
            backgroundColor: seasonColor,
            borderColor: seasonColor,
            left: isEven ? 'auto' : '-6px',
            right: isEven ? '-6px' : 'auto',
            boxShadow: `0 0 12px ${seasonColor}60`,
          }}
        />
        {/* Pulse ring animation */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full animate-ping opacity-30"
          style={{
            backgroundColor: seasonColor,
            left: isEven ? 'auto' : '-6px',
            right: isEven ? '-6px' : 'auto',
          }}
        />
      </div>

      {/* Card with glassmorphism */}
      <div
        className={`
          relative overflow-hidden
          bg-slate-900/60 backdrop-blur-xl
          border border-slate-500/30
          rounded-2xl md:rounded-3xl
          p-5 md:p-6
          shadow-lg shadow-slate-950/50
          transition-all duration-500 ease-out
          hover:bg-slate-800/70
          hover:border-slate-400/40
          hover:shadow-xl hover:shadow-slate-950/60
          hover:-translate-y-1
          group-hover:scale-[1.01]
        `}
      >
        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${seasonColor}08 0%, transparent 50%)`
          }}
        />

        {/* Floating accent corner */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-30 pointer-events-none"
          style={{ backgroundColor: seasonColor }}
        />

        {/* Header */}
        <div className="relative flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Source icon with tooltip */}
            <div
              className="p-1.5 rounded-lg bg-slate-700/50 text-slate-300 transition-all duration-300 group-hover:scale-110 group-hover:bg-slate-600/50"
              title={`From ${entry.source}`}
            >
              <SourceIcon source={entry.source} className="w-4 h-4" />
            </div>

            {/* Date pill */}
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-all duration-300 group-hover:scale-105"
              style={{ backgroundColor: `${seasonColor}25`, color: seasonColor }}
            >
              {formatDate(entry.date)}
            </span>

            {/* Type badge */}
            <span
              className="px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide transition-all duration-300"
              style={{ backgroundColor: `${getTypeColor(entry.type)}20`, color: getTypeColor(entry.type) }}
            >
              {entry.type}
            </span>
          </div>

          {/* External link if available */}
          {entry.metadata?.notionUrl && (
            <a
              href={entry.metadata.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 -m-2 text-slate-500 hover:text-white transition-all duration-300 hover:scale-110 rounded-lg hover:bg-slate-700/50"
              title="Open in Notion"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Hero Media (Image, Video, or Both) */}
        {(hasImage || hasVideo) && (
          <div className="relative -mx-4 md:-mx-6 -mt-5 mb-4">
            {/* Video Only - Show video player directly */}
            {showVideoOnly && videoInfo && (
              <div className="relative overflow-hidden rounded-[22px] border border-slate-800/60 bg-slate-950/60 shadow-inner shadow-slate-950/70" onClick={(e) => e.stopPropagation()}>
                <VideoEmbed
                  platform={videoInfo.platform}
                  embedUrl={videoInfo.embedUrl}
                  title={entry.title}
                  className="rounded-[22px]"
                />
              </div>
            )}

            {/* Image with optional video overlay */}
            {hasImage && !isVideoPlaying && (
              <div className="relative h-40 sm:h-44 md:h-56 overflow-hidden rounded-[22px] border border-slate-800/60 bg-slate-950/60 shadow-inner shadow-slate-950/70">
                <img
                  src={entry.heroImageUrl}
                  alt={entry.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                {/* Play button overlay if there's also a video */}
                {hasVideo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVideoPlaying(true);
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group/play"
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white/90 rounded-full flex items-center justify-center shadow-xl transform transition-transform group-hover/play:scale-110">
                      <svg className="w-6 h-6 md:w-7 md:h-7 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Video player when playing (with image as fallback) */}
            {hasImage && isVideoPlaying && videoInfo && (
              <div className="relative overflow-hidden rounded-[22px] border border-slate-800/60 bg-slate-950/60 shadow-inner shadow-slate-950/70" onClick={(e) => e.stopPropagation()}>
                <VideoEmbed
                  platform={videoInfo.platform}
                  embedUrl={videoInfo.embedUrl}
                  title={entry.title}
                  autoplay={true}
                  className="rounded-[22px]"
                />
              </div>
            )}
          </div>
        )}

        {/* Title + Description */}
        <div className="space-y-3">
          <h3
            className="relative text-lg md:text-xl font-bold text-white transition-colors duration-300 group-hover:text-teal-200"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
          >
            {entry.title}
          </h3>

          <p className={`text-slate-300 text-sm md:text-base leading-relaxed ${!expanded && 'line-clamp-3'}`}>
            {entry.description}
          </p>
        </div>

        {entry.description.length > 200 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mt-2 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1"
          >
            {expanded ? (
              <>
                Show less
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Read more
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}

        {/* Quote (if present) */}
        {entry.quote && (
          <blockquote
            className="mt-4 pl-4 border-l-2 italic text-slate-300 bg-slate-800/30 py-3 pr-3 rounded-r-lg"
            style={{ borderColor: seasonColor }}
          >
            &ldquo;{entry.quote.text}&rdquo;
            <cite className="block mt-2 text-sm text-slate-500 not-italic font-medium">
              &mdash; {entry.quote.author}
            </cite>
          </blockquote>
        )}

        {/* Photos (if present) */}
        {entry.photos && entry.photos.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {entry.photos.slice(0, 3).map((photo, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl overflow-hidden bg-slate-800 ring-1 ring-slate-700/50 transition-transform duration-300 hover:scale-105"
              >
                <img
                  src={photo}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 md:gap-2">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-slate-700/40 text-slate-400 text-xs rounded-lg border border-slate-600/30 transition-all duration-300 hover:bg-slate-600/40 hover:text-slate-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}


        {/* Metadata footer */}
        {(entry.metadata?.amount || entry.metadata?.likes !== undefined) && (
          <div className="mt-4 pt-4 border-t border-slate-700/40 flex flex-wrap items-center gap-3 md:gap-4 text-sm text-slate-400">
            {entry.metadata.amount && (
              <span className="flex items-center gap-1.5 bg-teal-500/10 px-2.5 py-1 rounded-lg">
                <span className="text-teal-400 font-medium">$</span>
                <span className="font-medium">{entry.metadata.amount.toLocaleString()}</span>
              </span>
            )}
            {entry.metadata.likes !== undefined && (
              <span className="flex items-center gap-1.5 text-rose-400">
                <Heart className="w-4 h-4" />
                <span>{entry.metadata.likes}</span>
              </span>
            )}
            {entry.metadata.comments !== undefined && (
              <span className="flex items-center gap-1.5 text-blue-400">
                <MessageCircle className="w-4 h-4" />
                <span>{entry.metadata.comments}</span>
              </span>
            )}
            {entry.metadata.organization && (
              <span className="text-slate-500 truncate max-w-[150px]" title={entry.metadata.organization}>
                {entry.metadata.organization}
              </span>
            )}
          </div>
        )}

        {/* Click indicator */}
        {onClick && (
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            <div
              className="p-2 rounded-full"
              style={{ backgroundColor: `${seasonColor}20` }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke={seasonColor}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
