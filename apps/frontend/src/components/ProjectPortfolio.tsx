import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectCard } from './ProjectCard';
import { Project } from '../types/project';
import { THEME_COLORS } from '../constants/themeColors';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function ProjectPortfolio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [filterType, setFilterType] = useState<'theme' | 'status' | 'health'>('theme');

  // Fetch projects from backend
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/api/real/projects`, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.projects || !Array.isArray(data.projects)) {
          throw new Error('Invalid data format received');
        }

        setProjects(data.projects);
      } catch (err: unknown) {
        console.error('Error fetching projects:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const themes: Record<string, number> = {};
    const statuses: Record<string, number> = {};

    projects.forEach(project => {
      // Count themes
      const projectThemes = project.themes || [];
      projectThemes.forEach(theme => {
        themes[theme] = (themes[theme] || 0) + 1;
      });

      // Count statuses
      const status = project.status || 'No Status';
      statuses[status] = (statuses[status] || 0) + 1;
    });

    return { themes, statuses };
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (activeFilter === 'all') return projects;

    if (filterType === 'theme') {
      return projects.filter(p => (p.themes || []).includes(activeFilter));
    }

    if (filterType === 'status') {
      return projects.filter(p => (p.status || 'No Status') === activeFilter);
    }

    if (filterType === 'health') {
      return projects.filter(p => {
        const score = p.autonomyScore || 0;
        if (activeFilter === 'healthy') return score >= 80;
        if (activeFilter === 'at-risk') return score >= 40 && score < 80;
        if (activeFilter === 'critical') return score < 40;
        return true;
      });
    }

    return projects;
  }, [projects, activeFilter, filterType]);

  // Loading state
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

  // Error state
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Our Project Portfolio
          </h1>
          <p className="text-lg text-gray-600">
            {projects.length} projects building community strength and sovereignty
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <button
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              filterType === 'health'
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => { setFilterType('health'); setActiveFilter('all'); }}
          >
            By Health
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

          {filterType === 'health' && (
            <>
              <motion.button
                className={`px-4 py-2 rounded-full font-semibold transition-colors border-2 ${
                  activeFilter === 'healthy'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-green-600 border-green-600 hover:bg-green-50'
                }`}
                onClick={() => setActiveFilter('healthy')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Healthy (80-100)
              </motion.button>
              <motion.button
                className={`px-4 py-2 rounded-full font-semibold transition-colors border-2 ${
                  activeFilter === 'at-risk'
                    ? 'bg-yellow-600 text-white border-yellow-600'
                    : 'bg-white text-yellow-600 border-yellow-600 hover:bg-yellow-50'
                }`}
                onClick={() => setActiveFilter('at-risk')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                At Risk (40-79)
              </motion.button>
              <motion.button
                className={`px-4 py-2 rounded-full font-semibold transition-colors border-2 ${
                  activeFilter === 'critical'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-red-600 border-red-600 hover:bg-red-50'
                }`}
                onClick={() => setActiveFilter('critical')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Critical (0-39)
              </motion.button>
            </>
          )}
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
              <ProjectCard
                key={project.id}
                project={project}
              />
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
    </div>
  );
}
