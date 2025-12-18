'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sprout, MapPin, Building2, Volume2, VolumeX } from 'lucide-react';
import type { RedevelopmentSite } from '../types/yearInReview';

interface LandRedevelopmentShowcaseProps {
  sites: RedevelopmentSite[];
  title?: string;
  subtitle?: string;
  introText?: string;
}


export function LandRedevelopmentShowcase({
  sites,
  title = 'Transforming Land, Building Community',
  subtitle = 'Our partners in place-based regeneration',
  introText = 'Across Australia, we\'ve worked alongside First Nations communities and local partners to revitalize land and create spaces that honor both heritage and future generations.',
}: LandRedevelopmentShowcaseProps) {
  const [activeSite, setActiveSite] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSite = sites[activeSite];

  // Auto-rotate through sites
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveSite((prev) => (prev + 1) % sites.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isPlaying, sites.length]);

  // Reset video state when site changes
  useEffect(() => {
    setVideoError(false);
    setIsMuted(true);
  }, [activeSite]);

  // Handle mute toggle
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
            {/* Direct MP4 video - autoplay muted */}
            {currentSite.droneVideo && (
              <div className="absolute inset-0" key={`video-container-${currentSite.id}`}>
                <video
                  key={`video-${currentSite.id}-${activeSite}`}
                  ref={videoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setVideoError(true)}
                >
                  <source src={currentSite.droneVideo} type="video/mp4" />
                </video>
                {/* Mute/Unmute button */}
                {!videoError && (
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
                )}
              </div>
            )}
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
