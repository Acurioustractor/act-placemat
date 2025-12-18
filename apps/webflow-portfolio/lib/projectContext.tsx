'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SelectedProject {
  id: string;
  name: string;
  coverImage?: string;
  status?: string;
}

interface ProjectContextType {
  selectedProject: SelectedProject | null;
  setSelectedProject: (project: SelectedProject | null) => void;
  clearProject: () => void;
  isProjectSelected: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'act-selected-project';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProjectState] = useState<SelectedProject | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedProjectState(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load selected project:', e);
    }
  }, []);

  // Save to localStorage when changed
  const setSelectedProject = (project: SelectedProject | null) => {
    setSelectedProjectState(project);
    try {
      if (project) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save selected project:', e);
    }
  };

  const clearProject = () => setSelectedProject(null);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ProjectContext.Provider
      value={{
        selectedProject,
        setSelectedProject,
        clearProject,
        isProjectSelected: !!selectedProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

// Helper to check if content matches selected project
export function matchesProject(
  selectedProject: SelectedProject | null,
  item: { project_ids?: string[]; projectId?: string; projectSlug?: string; tags?: string[]; manual_tags?: string[] }
): boolean {
  if (!selectedProject) return true; // No filter, show all

  const projectId = selectedProject.id;
  const projectName = selectedProject.name.toLowerCase();

  // Check project_ids array (media items)
  if (item.project_ids?.includes(projectId)) return true;

  // Check direct projectId
  if (item.projectId === projectId) return true;

  // Check project slug match
  if (item.projectSlug?.toLowerCase() === projectName) return true;

  // Check tags for project name (normalized)
  const normalizedName = projectName.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const allTags = [...(item.tags || []), ...(item.manual_tags || [])].map(t => t.toLowerCase());

  if (allTags.some(tag =>
    tag === normalizedName ||
    tag.includes(normalizedName) ||
    normalizedName.includes(tag)
  )) {
    return true;
  }

  return false;
}
