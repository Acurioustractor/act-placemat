/**
 * 🌟 Community Project Card Component
 * Using ACT's existing CSS system and REAL Notion data
 * 
 * Fixed version that:
 * - Uses existing CSS classes instead of Tailwind
 * - Connects to REAL Notion data via unified data lake
 * - Follows existing component patterns
 */

import React, { useState } from 'react';

// Types based on REAL Notion data structure
export interface ProjectData {
  id: string;
  title: string;
  description: string;
  community_name?: string;
  location?: string;
  status?: string;
  tags?: string[];
  collaborators?: string[];
  impact_metrics?: Record<string, any>;
  community_control_percentage?: number;
  created_date?: string;
  
  // New real Notion fields
  core_values?: string;
  themes?: string[];
  related_opportunities?: string[];
  related_organisations?: string[];
  related_actions?: string[];
  related_resources?: string[];
  related_artifacts?: string[];
  last_updated?: string;
}

interface ProjectCardProps {
  project: ProjectData;
  onClick: (project: ProjectData) => void;
  className?: string;
}

/**
 * 🌟 Project Card Component using existing CSS system
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onClick, 
  className = '' 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Use the project data as it comes from Notion
  const displayTitle = project.title || 'Untitled Project';
  const displayDescription = project.description || 'No description available';
  const communityName = project.community_name || 'Community Project';
  const location = project.location || 'Location TBD';
  const status = project.status || 'active';
  const tags = project.tags || [];
  const collaborators = project.collaborators || [];
  
  return (
    <div 
      className={`card-elegant ${className}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(project)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* Header with community name and status */}
      <div className="split" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h3 className="heading-4" style={{ marginBottom: 'var(--space-1)' }}>
            {communityName}
          </h3>
          <div className="text-small">
            📍 {location}
          </div>
        </div>
        
        <div className={`status-${status === 'active' ? 'success' : 'info'}`}>
          <span className="status-dot"></span>
          <span className="text-small" style={{ textTransform: 'capitalize' }}>
            {status}
          </span>
        </div>
      </div>

      {/* Project title and description */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="heading-3" style={{ marginBottom: 'var(--space-2)' }}>
          {displayTitle}
        </h2>
        <p className="text-body" style={{ 
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {displayDescription}
        </p>
      </div>

      {/* Community control percentage if available and > 0 */}
      {project.community_control_percentage && project.community_control_percentage > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="text-small" style={{ marginBottom: 'var(--space-1)' }}>
            Community Control
          </div>
          <div className="inline">
            <div style={{
              width: '100px',
              height: '6px',
              backgroundColor: 'var(--pearl)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${project.community_control_percentage}%`,
                height: '100%',
                backgroundColor: 'var(--sage)',
                transition: 'width var(--transition)'
              }} />
            </div>
            <span className="text-small" style={{ fontWeight: '600', color: 'var(--sage)' }}>
              {project.community_control_percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {tags.slice(0, 4).map((tag, index) => (
              <span 
                key={index}
                className="text-caption"
                style={{
                  padding: 'var(--space-1) var(--space-2)',
                  backgroundColor: 'rgba(5, 150, 105, 0.1)',
                  color: 'var(--sage)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: '500'
                }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-caption" style={{ color: 'var(--silver)' }}>
                +{tags.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Collaborators */}
      {collaborators.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div className="text-small" style={{ marginBottom: 'var(--space-2)', color: 'var(--dove)' }}>
            Collaborators ({collaborators.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
            {collaborators.slice(0, 3).map((collaborator, index) => (
              <div 
                key={index}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--champagne)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--obsidian)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: '600'
                }}
                title={collaborator}
              >
                {typeof collaborator === 'string' ? collaborator.charAt(0).toUpperCase() : '?'}
              </div>
            ))}
            {collaborators.length > 3 && (
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--pearl)',
                  border: '1px solid var(--silver)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--dove)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: '600'
                }}
              >
                +{collaborators.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer with created date */}
      <div className="split">
        <div className="text-small" style={{ color: 'var(--silver)' }}>
          {project.created_date ? new Date(project.created_date).getFullYear() : 'Recent'}
        </div>
        
        <div 
          className="text-small"
          style={{ 
            color: 'var(--champagne)', 
            fontWeight: '500',
            transition: 'all var(--transition)',
            transform: isHovered ? 'translateX(4px)' : 'translateX(0)'
          }}
        >
          Learn More →
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;