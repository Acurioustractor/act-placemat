'use client';

import { useState, useEffect, useRef } from 'react';
import { useProject, SelectedProject } from '../../lib/projectContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Core 2025 projects - these are the main projects for this year's review
// This list can be managed/updated as needed
const CORE_2025_PROJECT_NAMES = [
  'Your Project Pages',
  // Add more core project names here as they are identified
];

interface Project {
  id: string;
  name: string;
  coverImage?: string;
  status?: string;
}

interface ProjectSelectorProps {
  coreProjectsOnly?: boolean; // If true, only show core 2025 projects
}

export function ProjectSelector({ coreProjectsOnly = false }: ProjectSelectorProps) {
  const { selectedProject, setSelectedProject, clearProject } = useProject();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [coreProjects, setCoreProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAllProjects, setShowAllProjects] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch(`${API_BASE}/api/real/projects`);
        if (res.ok) {
          const data = await res.json();
          const projectList = (data.projects || [])
            .filter((p: Project) => p.name && p.name !== 'Unknown')
            .sort((a: Project, b: Project) => a.name.localeCompare(b.name));
          setAllProjects(projectList);

          // Filter to core projects
          const core = projectList.filter((p: Project) =>
            CORE_2025_PROJECT_NAMES.some(name =>
              p.name.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(p.name.toLowerCase())
            )
          );
          setCoreProjects(core);
        }
      } catch (e) {
        console.error('Failed to load projects:', e);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Use core or all projects based on mode
  const projects = (coreProjectsOnly && !showAllProjects) ? coreProjects : allProjects;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (project: Project) => {
    setSelectedProject({
      id: project.id,
      name: project.name,
      coverImage: project.coverImage,
      status: project.status,
    });
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Selected project display / trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all ${
          selectedProject
            ? 'bg-teal-900/50 border-teal-500 text-teal-100'
            : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
        }`}
      >
        {selectedProject ? (
          <>
            {/* Project indicator */}
            <div className="flex items-center gap-2">
              {selectedProject.coverImage ? (
                <img
                  src={selectedProject.coverImage}
                  alt=""
                  className="w-6 h-6 rounded object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-xs font-bold text-white">
                  {selectedProject.name.charAt(0)}
                </div>
              )}
              <span className="font-medium max-w-[200px] truncate">
                {selectedProject.name}
              </span>
            </div>
            {/* Clear button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearProject();
              }}
              className="ml-2 p-1 hover:bg-teal-800 rounded transition-colors"
              title="Clear project filter"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Select Project</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
              autoFocus
            />
          </div>

          {/* Project list */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-400">Loading...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-slate-400">No projects found</div>
            ) : (
              <div className="py-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelect(project)}
                    className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-700 transition-colors ${
                      selectedProject?.id === project.id ? 'bg-teal-900/30' : ''
                    }`}
                  >
                    {project.coverImage ? (
                      <img
                        src={project.coverImage}
                        alt=""
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
                        {project.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white font-medium truncate">{project.name}</div>
                      {project.status && (
                        <div className="text-xs text-slate-400 capitalize">{project.status}</div>
                      )}
                    </div>
                    {selectedProject?.id === project.id && (
                      <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer with toggle and clear options */}
          <div className="p-2 border-t border-slate-700 space-y-1">
            {/* Toggle between core and all projects */}
            {coreProjectsOnly && (
              <button
                onClick={() => setShowAllProjects(!showAllProjects)}
                className="w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-sm flex items-center justify-between"
              >
                <span>{showAllProjects ? 'Show core projects only' : 'Show all 75 projects'}</span>
                <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                  {showAllProjects ? coreProjects.length : allProjects.length}
                </span>
              </button>
            )}

            {/* Clear selection */}
            {selectedProject && (
              <button
                onClick={() => {
                  clearProject();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-sm"
              >
                Clear selection (show all content)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
