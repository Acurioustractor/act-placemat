'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectCard } from './ProjectCard';
import { Project, getProjects } from '../lib/api';
import { THEME_COLORS } from '../constants/themeColors';

export function ProjectGrid() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [filterType, setFilterType] = useState<'theme' | 'status'>('theme');

  useEffect(() => {
    getProjects()
      .then(data => {
        // Filter to only show Active projects for public view
        const activeProjects = data.filter(p => p.status === 'Active 🔥');
        setProjects(activeProjects);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load projects');
        setLoading(false);
      });
  }, []);

  const filterCounts = useMemo(() => {
    const themes: Record<string, number> = {};
    const statuses: Record<string, number> = {};

    projects.forEach(project => {
      const projectThemes = project.themes || [];
      projectThemes.forEach(theme => {
        themes[theme] = (themes[theme] || 0) + 1;
      });

      const status = project.status || 'No Status';
      statuses[status] = (statuses[status] || 0) + 1;
    });

    return { themes, statuses };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (activeFilter === 'all') return projects;

    if (filterType === 'theme') {
      return projects.filter(p => (p.themes || []).includes(activeFilter));
    }

    if (filterType === 'status') {
      return projects.filter(p => (p.status || 'No Status') === activeFilter);
    }

    return projects;
  }, [projects, activeFilter, filterType]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-6xl mb-4"
        >
          🚜
        </motion.div>
        <p className="text-lg text-gray-600">Loading projects from Notion...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Unable to load projects</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Filter Type Selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filterType === 'theme'
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => { setFilterType('theme'); setActiveFilter('all'); }}
        >
          By Theme
        </button>
        <button
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filterType === 'status'
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => { setFilterType('status'); setActiveFilter('all'); }}
        >
          By Status
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <motion.button
          className={`px-4 py-2 rounded-full font-semibold transition-colors ${
            activeFilter === 'all'
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => setActiveFilter('all')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          All Projects ({projects.length})
        </motion.button>

        {filterType === 'theme' && Object.entries(filterCounts.themes)
          .sort((a, b) => b[1] - a[1])
          .map(([theme, count]) => (
            <motion.button
              key={theme}
              className={`px-4 py-2 rounded-full font-semibold transition-colors border-2 ${
                activeFilter === theme
                  ? 'text-white'
                  : 'bg-white'
              }`}
              style={{
                borderColor: THEME_COLORS[theme] || '#95A5A6',
                ...(activeFilter === theme && {
                  background: THEME_COLORS[theme] || '#95A5A6',
                }),
                ...(activeFilter !== theme && {
                  color: THEME_COLORS[theme] || '#95A5A6',
                })
              }}
              onClick={() => setActiveFilter(theme)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {theme} ({count})
            </motion.button>
          ))
        }

        {filterType === 'status' && Object.entries(filterCounts.statuses)
          .sort((a, b) => b[1] - a[1])
          .map(([status, count]) => (
            <motion.button
              key={status}
              className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                activeFilter === status
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => setActiveFilter(status)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {status || 'No Status'} ({count})
            </motion.button>
          ))
        }
      </div>

      {/* Results Count */}
      <motion.div
        key={filteredProjects.length}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-gray-600 mb-6"
      >
        Showing {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
      </motion.div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="wait">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-gray-600 mb-4 text-lg">No projects match this filter.</p>
          <button
            onClick={() => setActiveFilter('all')}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
          >
            View All Projects
          </button>
        </motion.div>
      )}
    </div>
  );
}
