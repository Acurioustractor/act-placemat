'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sprout, MapPin, Building2, Play, Volume2, VolumeX } from 'lucide-react';
import type { RedevelopmentSite } from '../types/yearInReview';

interface LandRedevelopmentShowcaseProps {
  sites: RedevelopmentSite[];
  title?: string;
  subtitle?: string;
  introText?: string;
}

/**
 * Parse video URL and return embed info for various platforms
 * Prioritizes direct video links for better autoplay control
 */
function parseVideoUrl(url: string): { type: 'direct' | 'descript' | 'youtube' | 'vimeo' | 'loom'; embedUrl: string; originalUrl: string } | null {
  if (!url) return null;

  // Direct video file (mp4, webm, etc.) - BEST for autoplay
  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || url.includes('supabase.co/storage')) {
    return { type: 'direct', embedUrl: url, originalUrl: url };
  }

  // YouTube - mute=1 and playsinline=1 enable mobile autoplay
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&playsinline=1&controls=1&modestbranding=1`,
      originalUrl: url
    };
  }

  // Vimeo - muted=1 and playsinline=1 enable mobile autoplay
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&playsinline=1&controls=1`,
      originalUrl: url
    };
  }

  // Descript - embed with autoplay (works better on desktop, may need interaction on mobile)
  const descriptMatch = url.match(/share\.descript\.com\/(view|embed)\/([a-zA-Z0-9]+)/);
  if (descriptMatch) {
    return {
      type: 'descript',
      embedUrl: `https://share.descript.com/embed/${descriptMatch[2]}?autoplay=true&transcript=false`,
      originalUrl: url
    };
  }

  // Loom
  const loomMatch = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return {
      type: 'loom',
      embedUrl: `https://www.loom.com/embed/${loomMatch[2]}?autoplay=1&hide_owner=true&hide_share=true&hide_title=true`,
      originalUrl: url
    };
  }

  // Unknown - try as direct
  return { type: 'direct', embedUrl: url, originalUrl: url };
}

export function LandRedevelopmentShowcase({
  sites,
  title = 'Transforming Land, Building Community',
  subtitle = 'Our partners in place-based regeneration',
  introText = 'Across Australia, we\'ve worked alongside First Nations communities and local partners to revitalize land and create spaces that honor both heritage and future generations.',
}: LandRedevelopmentShowcaseProps) {
  const [activeSite, setActiveSite] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [hasInteracted, setHasInteracted] = useState(false); // Track if user has tapped to play
  const [showPlayOverlay, setShowPlayOverlay] = useState(true); // Show play button on mobile
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSite = sites[activeSite];
  const [videoError, setVideoError] = useState(false);

  // Auto-rotate through sites
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveSite((prev) => (prev + 1) % sites.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isPlaying, sites.length]);

  useEffect(() => {
    setVideoError(false);
    setVideoPlaying(true);
    // Reset interaction state when site changes, but keep unmuted if user already unmuted
    setShowPlayOverlay(!hasInteracted);
  }, [activeSite, currentSite.droneVideo, hasInteracted]);

  // Handle play button click
  const handlePlayClick = useCallback(() => {
    setHasInteracted(true);
    setShowPlayOverlay(false);

    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }

    // For iframes, we need to reload with autoplay after interaction
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = src;
    }
  }, []);

  // Handle mute toggle for direct videos
  const handleMuteToggle = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  return (
    <section className="relative z-10 py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6" ref={containerRef}>
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-teal-400" />
            <span className="text-teal-400 text-sm uppercase tracking-[0.3em] font-medium">
              Year in Review Finale
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-teal-400" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            {title}
          </h2>

          <p className="text-xl md:text-2xl text-teal-400/80 mb-4">
            {subtitle}
          </p>

          <p className="text-slate-300 max-w-3xl mx-auto text-lg leading-relaxed">
            {introText}
          </p>
        </div>

        {/* Site Navigation Pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-12">
          {sites.map((site, idx) => (
            <button
              key={site.id}
              onClick={() => {
                setActiveSite(idx);
                setIsPlaying(false);
              }}
              className={`group relative px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base transition-all duration-300 ${
                idx === activeSite
                  ? 'bg-white/10 text-white scale-105'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="relative z-10 font-medium">{site.location}</span>
              {idx === activeSite && (
                <div
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{ background: `linear-gradient(135deg, ${site.accentColor}, transparent)` }}
                />
              )}
              {/* Progress indicator for active */}
              {idx === activeSite && isPlaying && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-white/50 rounded-full animate-progress" />
              )}
            </button>
          ))}
        </div>

        {/* Main Showcase Card */}
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${currentSite.accentColor}10 0%, transparent 50%)`,
            border: `1px solid ${currentSite.accentColor}20`
          }}
        >
          {/* Hero Media Section */}
          <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
            {(() => {
              const videoInfo = currentSite.droneVideo ? parseVideoUrl(currentSite.droneVideo) : null;

              // For non-direct videos (embeds), convert to direct video approach
              // This shouldn't happen if using MP4s, but fallback to showing image
              if (videoInfo && videoInfo.type !== 'direct') {
                return (
                  <div className="absolute inset-0" key={`video-container-${currentSite.id}`}>
                    {currentSite.droneImage ? (
                      <Image
                        src={currentSite.droneImage}
                        alt={`Aerial view of ${currentSite.location}`}
                        fill
                        sizes="100vw"
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, ${currentSite.accentColor}40 0%, ${currentSite.accentColor}10 50%, transparent 100%)`
                        }}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <a
                        href={videoInfo.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-white font-medium hover:bg-white/30 transition-all flex items-center gap-2"
                      >
                        <Play className="w-5 h-5 fill-white" />
                        Watch Video
                      </a>
                    </div>
                  </div>
                );
              }

              if (videoInfo && videoInfo.type === 'direct') {
                // Direct video file - best for autoplay control
                return (
                  <div className="absolute inset-0" key={`video-container-${currentSite.id}`}>
                    <video
                      key={`video-${currentSite.id}-${activeSite}`}
                      ref={videoRef}
                      src={videoInfo.embedUrl}
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                      onLoadedData={(e) => {
                        const video = e.currentTarget;
                        video.play().catch(() => {
                          setVideoError(true);
                          setShowPlayOverlay(true);
                        });
                        setShowPlayOverlay(false);
                      }}
                      onError={() => setVideoError(true)}
                    />
                    {/* Play overlay for direct video if autoplay fails */}
                    {showPlayOverlay && !videoError && (
                      <button
                        onClick={handlePlayClick}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10 group"
                      >
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all">
                          <Play className="w-10 h-10 md:w-12 md:h-12 text-white fill-white ml-1" />
                        </div>
                      </button>
                    )}
                    {/* Mute/Unmute button for direct videos */}
                    <button
                      onClick={handleMuteToggle}
                      className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors z-20"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                );
              }

              return null;
            })()}
            {!currentSite.droneVideo && currentSite.droneImage && (
              <Image
                src={currentSite.droneImage}
                alt={`Aerial view of ${currentSite.location}`}
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
            )}
            {!currentSite.droneVideo && !currentSite.droneImage && (
              /* Placeholder with animated gradient */
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${currentSite.accentColor}30 0%, ${currentSite.accentColor}10 50%, transparent 100%)`
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Sprout className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-400">Drone footage coming soon</p>
                  </div>
                </div>
              </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

            {/* Location badge */}
            <div className="absolute top-6 left-6">
              <div
                className="px-4 py-2 rounded-full backdrop-blur-sm text-white font-medium flex items-center gap-2"
                style={{ background: `${currentSite.accentColor}80` }}
              >
                <MapPin className="w-4 h-4" />
                {currentSite.traditionalName || currentSite.location}, {currentSite.region}
              </div>
            </div>

          </div>

          {/* Content Section */}
          <div className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Left: Description & Partner */}
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {currentSite.location} Redevelopment
                </h3>

                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  {currentSite.description}
                </p>

                {/* Partner Info */}
                <div
                  className="p-6 rounded-2xl"
                  style={{ background: `${currentSite.accentColor}10` }}
                >
                  <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">
                    In Partnership With
                  </p>
                  <div className="flex items-center gap-4 mb-3">
                    {currentSite.partner.logo && (
                      <Image
                        src={currentSite.partner.logo}
                        alt={currentSite.partner.name}
                        width={48}
                        height={48}
                        className="rounded-lg"
                      />
                    )}
                    <h4 className="text-xl font-semibold text-white">
                      {currentSite.partner.name}
                    </h4>
                  </div>
                  <p className="text-slate-300 text-sm">
                    {currentSite.partner.description}
                  </p>
                </div>
              </div>

              {/* Right: Stats & CTA */}
              <div>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {(currentSite.stats || []).map((stat, idx) => (
                    <div
                      key={idx}
                      className="p-6 rounded-2xl text-center"
                      style={{ background: `${currentSite.accentColor}15` }}
                    >
                      <div
                        className="text-3xl md:text-4xl font-bold mb-2"
                        style={{ color: currentSite.accentColor }}
                      >
                        {stat.value}
                      </div>
                      <div className="text-sm text-slate-400 uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Before/After Preview */}
                {(currentSite.beforeImage || currentSite.afterImage) && (
                  <div className="mb-8">
                    <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">
                      The Transformation
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {currentSite.beforeImage && (
                        <div className="relative h-32 rounded-xl overflow-hidden">
                        <Image
                          src={currentSite.beforeImage}
                          alt="Before"
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                        />
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                            Before
                          </div>
                        </div>
                      )}
                      {currentSite.afterImage && (
                        <div className="relative h-32 rounded-xl overflow-hidden">
                        <Image
                          src={currentSite.afterImage}
                          alt="After"
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                        />
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                            After
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CTA */}
                {currentSite.projectSlug && (
                  <Link
                    href={`/2025-review/${currentSite.projectSlug}`}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-slate-900 transition-all hover:scale-105 hover:shadow-xl w-full justify-center"
                    style={{ background: currentSite.accentColor }}
                  >
                    Explore {currentSite.location} Story
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* All Sites Grid Summary */}
        <div className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {sites.map((site, idx) => (
            <button
              key={site.id}
              onClick={() => {
                setActiveSite(idx);
                setIsPlaying(false);
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`group p-4 sm:p-6 rounded-2xl text-left transition-all duration-300 ${
                idx === activeSite
                  ? 'bg-white/10 scale-[1.02] sm:scale-105'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${site.accentColor}20`, color: site.accentColor }}
                >
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white group-hover:text-teal-400 transition-colors">
                    {site.location}
                  </h4>
                  <p className="text-sm text-slate-400">
                    {site.region}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    with {site.partner.name}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CSS for progress animation */}
      <style jsx>{`
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress 8s linear;
        }
      `}</style>
    </section>
  );
}
