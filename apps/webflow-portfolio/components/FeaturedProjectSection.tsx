'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FeaturedSeasonProject as FeaturedProject } from '../types/yearInReview';

export type { FeaturedProject };

interface FeaturedProjectSectionProps {
  project: FeaturedProject;
  seasonName: string;
  seasonColor: string;
}

export function FeaturedProjectSection({ project, seasonName, seasonColor }: FeaturedProjectSectionProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const isVideoHero = !!project.heroVideo;
  const layoutLeft = project.layout === 'left' || !project.layout;

  return (
    <section className="relative z-10 py-16 md:py-24">
      {/* Season transition indicator */}
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="flex items-center gap-4">
          <div
            className="h-px flex-1"
            style={{ background: `linear-gradient(to right, transparent, ${seasonColor}, transparent)` }}
          />
          <span
            className="text-sm font-medium uppercase tracking-widest px-4"
            style={{ color: seasonColor }}
          >
            Featured from {seasonName}
          </span>
          <div
            className="h-px flex-1"
            style={{ background: `linear-gradient(to right, transparent, ${seasonColor}, transparent)` }}
          />
        </div>
      </div>

      {/* Main Feature Card */}
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: `linear-gradient(135deg, ${project.accentColor}15 0%, ${project.accentColor}05 50%, transparent 100%)`,
            border: `1px solid ${project.accentColor}30`
          }}
        >
          <div className={`grid md:grid-cols-2 gap-0 ${layoutLeft ? '' : 'md:grid-flow-col-dense'}`}>
            {/* Content Side */}
            <div className={`p-8 md:p-12 lg:p-16 flex flex-col justify-center ${layoutLeft ? '' : 'md:col-start-2'}`}>
              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: `${project.accentColor}20`,
                        color: project.accentColor
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {project.title}
              </h2>

              {/* Subtitle */}
              <p
                className="text-xl md:text-2xl mb-6 font-light"
                style={{ color: project.accentColor }}
              >
                {project.subtitle}
              </p>

              {/* Description */}
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                {project.description}
              </p>

              {/* Stats Grid */}
              {project.stats && project.stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {project.stats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="text-center p-4 rounded-xl"
                      style={{ background: `${project.accentColor}10` }}
                    >
                      <div
                        className="text-2xl md:text-3xl font-bold mb-1"
                        style={{ color: project.accentColor }}
                      >
                        {stat.value}
                      </div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quote */}
              {project.quote && (
                <blockquote className="border-l-4 pl-6 py-2 mb-8" style={{ borderColor: project.accentColor }}>
                  <p className="text-slate-200 italic text-lg mb-2">
                    &ldquo;{project.quote.text}&rdquo;
                  </p>
                  <footer className="text-sm">
                    <span style={{ color: project.accentColor }}>{project.quote.author}</span>
                    {project.quote.role && (
                      <span className="text-slate-500"> — {project.quote.role}</span>
                    )}
                  </footer>
                </blockquote>
              )}

              {/* CTA Button */}
              <Link
                href={`/2025-review/${project.slug}`}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full font-semibold text-slate-900 transition-all hover:scale-105 hover:shadow-xl self-start"
                style={{ background: project.accentColor }}
              >
                Explore the Story
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Media Side */}
            <div className={`relative min-h-[400px] md:min-h-[600px] ${layoutLeft ? '' : 'md:col-start-1 md:row-start-1'}`}>
              {isVideoHero ? (
                <>
                  {!videoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
                      <div
                        className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: `${project.accentColor} transparent transparent transparent` }}
                      />
                    </div>
                  )}
                  <video
                    src={project.heroVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onLoadedData={() => setVideoLoaded(true)}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </>
              ) : project.heroImage ? (
                <img
                  src={project.heroImage}
                  alt={project.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                /* Placeholder gradient */
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${project.accentColor}40 0%, ${project.accentColor}10 100%)`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="text-8xl opacity-20"
                      style={{ color: project.accentColor }}
                    >
                      ✦
                    </div>
                  </div>
                </div>
              )}

              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 ${layoutLeft ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} from-transparent via-transparent to-slate-950/80`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
