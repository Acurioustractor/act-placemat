'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getReviewProjects } from '../lib/reviewProjectsApi';
import type { ReviewProject } from '../types/yearInReview';

// Theme definitions with colors
const THEMES = [
  { name: 'All Projects', color: '#ffffff', tags: [] },
  { name: 'Storytelling', color: '#E67E22', tags: ['storytelling', 'story', 'narrative', 'cultural'] },
  { name: 'Youth Justice', color: '#1ABC9C', tags: ['youth', 'justice', 'detention', 'community programs'] },
  { name: 'Indigenous', color: '#8B4513', tags: ['indigenous', 'first nations', 'aboriginal', 'ocap'] },
  { name: 'Community', color: '#27AE60', tags: ['community', 'remote', 'partnership', 'place-based'] },
  { name: 'Technology', color: '#9B59B6', tags: ['technology', 'platform', 'digital', 'data'] },
];

// Season colors mapping
const SEASON_COLORS: Record<string, string> = {
  'planting': '#59c3c3',
  'growing': '#ffa857',
  'harvesting': '#f7a399',
  'resting': '#d8d8f6',
};

// Get theme for a project based on its tags
function getProjectTheme(project: ReviewProject): string {
  const projectTags = (project.tags || []).map(t => t.toLowerCase());
  const titleLower = project.title.toLowerCase();
  const subtitleLower = (project.subtitle || '').toLowerCase();

  for (const theme of THEMES) {
    if (theme.tags.length === 0) continue;
    for (const tag of theme.tags) {
      if (projectTags.some(pt => pt.includes(tag)) ||
          titleLower.includes(tag) ||
          subtitleLower.includes(tag)) {
        return theme.name;
      }
    }
  }
  return 'Community'; // Default theme
}

// Get theme color
function getThemeColor(themeName: string): string {
  const theme = THEMES.find(t => t.name === themeName);
  return theme?.color || '#27AE60';
}

// Project Icons based on theme
function ProjectIcon({ theme, className = '' }: { theme: string; className?: string }) {
  const iconClass = `w-6 h-6 ${className}`;

  switch (theme) {
    case 'Storytelling':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'Youth Justice':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      );
    case 'Indigenous':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'Technology':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    default: // Community
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
  }
}

interface ProjectDiscoveryProps {
  className?: string;
}

export function ProjectDiscovery({ className = '' }: ProjectDiscoveryProps) {
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState('All Projects');
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [randomProject, setRandomProject] = useState<ReviewProject | null>(null);
  const [showSurprise, setShowSurprise] = useState(false);

  // Fetch all projects from API
  useEffect(() => {
    async function loadProjects() {
      try {
        const allProjects = await getReviewProjects(2025, true); // Include unpublished for admin preview
        setProjects(allProjects);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Filter projects by theme
  const filteredProjects = activeTheme === 'All Projects'
    ? projects
    : projects.filter(p => getProjectTheme(p) === activeTheme);

  // Surprise Me function
  const handleSurpriseMe = useCallback(() => {
    if (projects.length === 0) return;

    setIsShuffling(true);
    setShowSurprise(true);

    // Shuffle animation
    let count = 0;
    const shuffleInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * projects.length);
      setRandomProject(projects[randomIndex]);
      count++;

      if (count >= 8) {
        clearInterval(shuffleInterval);
        setIsShuffling(false);
      }
    }, 100);
  }, [projects]);

  // Close surprise modal
  const closeSurprise = useCallback(() => {
    setShowSurprise(false);
    setRandomProject(null);
  }, []);

  // Get season color for a project
  const getSeasonColor = (project: ReviewProject): string => {
    if (project.season) {
      return SEASON_COLORS[project.season.toLowerCase()] || '#59c3c3';
    }
    // Default based on created date month
    const month = project.createdAt ? new Date(project.createdAt).getMonth() : 0;
    const seasons = ['planting', 'planting', 'planting', 'growing', 'growing', 'growing',
                     'harvesting', 'harvesting', 'harvesting', 'resting', 'resting', 'resting'];
    return SEASON_COLORS[seasons[month]] || '#59c3c3';
  };

  // Get season name
  const getSeasonName = (project: ReviewProject): string => {
    if (project.season) return project.season;
    const month = project.createdAt ? new Date(project.createdAt).getMonth() : 0;
    const seasons = ['Planting', 'Planting', 'Planting', 'Growing', 'Growing', 'Growing',
                     'Harvesting', 'Harvesting', 'Harvesting', 'Resting', 'Resting', 'Resting'];
    return seasons[month];
  };

  if (loading) {
    return (
      <section className={`relative py-16 px-6 ${className}`}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading projects...</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`relative py-16 px-6 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Explore Our Impact
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            {projects.length} projects shaping communities across Australia. Each one tells a story of collaboration, innovation, and hope.
          </p>
        </div>

        {/* Theme Filter + Surprise Me */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {/* Theme Pills */}
          {THEMES.map((theme) => {
            const count = theme.name === 'All Projects'
              ? projects.length
              : projects.filter(p => getProjectTheme(p) === theme.name).length;

            return (
              <button
                key={theme.name}
                onClick={() => setActiveTheme(theme.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTheme === theme.name
                    ? 'bg-white text-slate-900 shadow-lg scale-105'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
                style={{
                  borderLeft: activeTheme === theme.name ? `3px solid ${theme.color}` : 'none'
                }}
              >
                {theme.name}
                {count > 0 && (
                  <span className="ml-2 text-xs opacity-60">({count})</span>
                )}
              </button>
            );
          })}

          {/* Surprise Me Button */}
          <button
            onClick={handleSurpriseMe}
            disabled={isShuffling || projects.length === 0}
            className="group relative px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-70"
          >
            <span className="flex items-center gap-2">
              <svg className={`w-4 h-4 ${isShuffling ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Surprise Me
            </span>
            <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Project Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project, index) => {
              const theme = getProjectTheme(project);
              const themeColor = getThemeColor(theme);
              const seasonColor = getSeasonColor(project);
              const seasonName = getSeasonName(project);

              return (
                <Link
                  key={project.id}
                  href={`/2025-review/${project.slug}`}
                  className="group relative"
                  onMouseEnter={() => setHoveredProject(project.id)}
                  onMouseLeave={() => setHoveredProject(null)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 h-full transition-all duration-500 ${
                      hoveredProject === project.id
                        ? 'scale-[1.02] shadow-2xl border-opacity-100'
                        : 'hover:border-opacity-70'
                    }`}
                    style={{
                      borderColor: hoveredProject === project.id ? seasonColor : undefined,
                      boxShadow: hoveredProject === project.id ? `0 20px 40px -20px ${seasonColor}40` : undefined
                    }}
                  >
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 flex gap-1">
                      {!project.isPublished && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300">
                          Draft
                        </span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${seasonColor}20`,
                          color: seasonColor
                        }}
                      >
                        {seasonName}
                      </span>
                    </div>

                    {/* Hero Image or Icon */}
                    {project.heroImageUrl ? (
                      <div className="w-full h-24 rounded-xl overflow-hidden mb-4 -mt-1">
                        <img
                          src={project.heroImageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${themeColor}20` }}
                      >
                        <ProjectIcon theme={theme} className="text-white" />
                      </div>
                    )}

                    {/* Content */}
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-white/90 transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                      {project.subtitle || 'No description'}
                    </p>

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {project.tags.length > 3 && (
                          <span className="text-xs text-slate-500">+{project.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Hover Arrow */}
                    <div className={`absolute bottom-4 right-4 transition-all duration-300 ${
                      hoveredProject === project.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>

                    {/* Theme Tag */}
                    <div
                      className="absolute bottom-4 left-5 px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: `${themeColor}15`,
                        color: themeColor
                      }}
                    >
                      {theme}
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Add New Project Card */}
            <Link
              href="/2025-review/admin"
              className="group relative"
            >
              <div className="relative overflow-hidden rounded-2xl bg-slate-800/30 backdrop-blur-sm border-2 border-dashed border-slate-700/50 p-5 h-full min-h-[200px] transition-all duration-300 hover:border-teal-500/50 hover:bg-slate-800/50 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mb-3 group-hover:bg-teal-500/20 transition-colors">
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-teal-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-slate-400 group-hover:text-teal-400 font-medium transition-colors">Add Project</span>
                <span className="text-xs text-slate-500 mt-1">Go to Admin</span>
              </div>
            </Link>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">No projects found for this theme.</p>
            <button
              onClick={() => setActiveTheme('All Projects')}
              className="mt-4 text-teal-400 hover:text-teal-300"
            >
              Show all projects
            </button>
          </div>
        )}

        {/* Quick Stats Bar */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-teal-400">{projects.length}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Projects</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div>
            <div className="text-2xl font-bold text-amber-400">
              {projects.filter(p => p.isPublished).length}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Published</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div>
            <div className="text-2xl font-bold text-pink-400">
              {new Set(projects.flatMap(p => p.tags || [])).size}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Tags</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {THEMES.filter(t => t.name !== 'All Projects' && projects.some(p => getProjectTheme(p) === t.name)).length}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Themes</div>
          </div>
        </div>
      </div>

      {/* Surprise Me Modal */}
      {showSurprise && randomProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={closeSurprise}
        >
          <div
            className={`relative bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-700 shadow-2xl transform transition-all duration-500 ${
              isShuffling ? 'scale-95 opacity-80' : 'scale-100 opacity-100'
            }`}
            onClick={e => e.stopPropagation()}
            style={{
              boxShadow: `0 0 100px ${getSeasonColor(randomProject)}30`
            }}
          >
            {/* Close Button */}
            <button
              onClick={closeSurprise}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Shuffling Animation */}
            {isShuffling && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 rounded-3xl z-10">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Finding your surprise...</p>
                </div>
              </div>
            )}

            {/* Project Card */}
            <div className="text-center">
              {randomProject.heroImageUrl ? (
                <div className="w-full h-32 rounded-2xl overflow-hidden mb-6">
                  <img
                    src={randomProject.heroImageUrl}
                    alt={randomProject.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: `${getThemeColor(getProjectTheme(randomProject))}20` }}
                >
                  <ProjectIcon theme={getProjectTheme(randomProject)} className="w-10 h-10 text-white" />
                </div>
              )}

              <div
                className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-4"
                style={{
                  backgroundColor: `${getSeasonColor(randomProject)}20`,
                  color: getSeasonColor(randomProject)
                }}
              >
                {getSeasonName(randomProject)} Season
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">{randomProject.title}</h3>
              <p className="text-slate-400 mb-6">{randomProject.subtitle || 'Discover this project'}</p>

              {/* Tags */}
              {randomProject.tags && randomProject.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {randomProject.tags.slice(0, 4).map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleSurpriseMe}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Try Again
                </button>
                <Link
                  href={`/2025-review/${randomProject.slug}`}
                  className="px-6 py-2 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
                >
                  Explore Project
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProjectDiscovery;
