/**
 * 🌟 Community Showcase System
 * Displays all Notion projects using ACT's existing CSS system
 * Connected to REAL data via unified data lake service
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, RotateCcw } from 'lucide-react';

import { ProjectCard, ProjectData } from './ProjectCard';
import projectService from '../../services/projectService';

interface CommunityShowcaseProps {
  onProjectClick?: (project: ProjectData) => void;
  className?: string;
}

export const CommunityShowcase: React.FC<CommunityShowcaseProps> = ({
  onProjectClick = () => {},
  className = ''
}) => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load real project data on component mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const projectData = await projectService.getAllProjects();
        setProjects(projectData);
        setFilteredProjects(projectData);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Failed to load projects. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Filter projects based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProjects(projects);
      return;
    }

    const filtered = projects.filter(project => {
      const searchableText = [
        project.title,
        project.description,
        project.community_name,
        project.location,
        ...(project.tags || []),
        ...(project.collaborators || [])
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm.toLowerCase());
    });

    setFilteredProjects(filtered);
  }, [projects, searchTerm]);

  // Calculate stats for header
  const totalProjects = filteredProjects.length;
  const totalCollaborators = filteredProjects.reduce((sum, p) => sum + (p.collaborators?.length || 0), 0);
  const avgCommunityControl = filteredProjects.length > 0 
    ? Math.round(filteredProjects.reduce((sum, p) => sum + (p.community_control_percentage || 0), 0) / filteredProjects.length)
    : 0;

  const clearSearch = () => {
    setSearchTerm('');
  };

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid var(--pearl)', 
            borderTop: '4px solid var(--champagne)', 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto var(--space-4)'
          }} />
          <h2 className="heading-3" style={{ marginBottom: 'var(--space-2)' }}>Loading Projects</h2>
          <p className="text-body">Connecting to your Notion data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>Failed to Load Projects</h2>
          <p className="text-body" style={{ marginBottom: 'var(--space-6)' }}>{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`page ${className}`}>
      
      {/* Header */}
      <div className="page-header">
        <div className="split" style={{ marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 className="heading-1" style={{ marginBottom: 'var(--space-2)' }}>
              Community Projects
            </h1>
            <p className="text-body" style={{ maxWidth: '600px' }}>
              Real stories of transformation where communities lead, decide, and own their development.
              This is what systemic change looks like when power flows to the people.
            </p>
          </div>
          
          {/* Stats */}
          <div className="inline" style={{ gap: 'var(--space-6)' }}>
            <div className="metric">
              <div className="metric-value">{totalProjects}</div>
              <div className="metric-label">Projects</div>
            </div>
            <div className="metric">
              <div className="metric-value">{avgCommunityControl}%</div>
              <div className="metric-label">Avg Community Control</div>
            </div>
            <div className="metric">
              <div className="metric-value">{totalCollaborators}</div>
              <div className="metric-label">Collaborators</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="inline">
          <div style={{ position: 'relative', width: '400px' }}>
            <Search style={{ 
              position: 'absolute', 
              left: 'var(--space-3)', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--silver)',
              width: '20px',
              height: '20px'
            }} />
            <input
              type="text"
              placeholder="Search projects, communities, collaborations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-3) var(--space-3) var(--space-12)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: 'var(--radius)',
                fontSize: 'var(--text-base)',
                outline: 'none',
                transition: 'border-color var(--transition)'
              }}
            />
          </div>
          
          {searchTerm && (
            <button 
              className="btn btn-secondary"
              onClick={clearSearch}
            >
              <RotateCcw style={{ width: '16px', height: '16px', marginRight: 'var(--space-2)' }} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {searchTerm && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <p className="text-body">
            Showing <strong style={{ color: 'var(--sage)' }}>{filteredProjects.length}</strong> projects
            <span> matching "<strong>{searchTerm}</strong>"</span>
          </p>
        </div>
      )}

      {/* Project Cards Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={onProjectClick}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: 'var(--pearl)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-6)'
          }}>
            <Search style={{ width: '40px', height: '40px', color: 'var(--silver)' }} />
          </div>
          <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>No projects found</h3>
          <p className="text-body" style={{ marginBottom: 'var(--space-6)', maxWidth: '400px', margin: '0 auto var(--space-6)' }}>
            {searchTerm 
              ? 'Try adjusting your search terms to discover more community projects.'
              : 'No projects are currently available. Please check back later.'
            }
          </p>
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="btn btn-primary"
            >
              <RotateCcw style={{ width: '16px', height: '16px', marginRight: 'var(--space-2)' }} />
              Show All Projects
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityShowcase;

// Add spinning animation for loading indicator
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);