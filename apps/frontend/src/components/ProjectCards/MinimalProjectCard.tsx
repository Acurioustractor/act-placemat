/**
 * 🎯 Minimal Project Card - Super Crispy Design
 * Perfect for quick browsing and discovery
 */

import React, { useEffect, useState } from 'react';
import { MapPin, Users, ExternalLink } from 'lucide-react';
import type { Project, Place } from '../../services/apiClient';
import { apiClient } from '../../services/apiClient';

interface MinimalProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  className?: string;
}

export const MinimalProjectCard: React.FC<MinimalProjectCardProps> = ({
  project,
  onClick,
  className = ''
}) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch places data for this project
  useEffect(() => {
    const fetchPlaces = async () => {
      if (!project.relatedPlaces || project.relatedPlaces.length === 0) {
        return;
      }

      try {
        setLoading(true);
        const projectPlaces = await apiClient.getProjectPlaces(project);
        setPlaces(projectPlaces);
      } catch (error) {
        console.warn('Failed to fetch places for project:', project.name, error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, [project.relatedPlaces, project.id]);

  // Calculate total connections
  const totalConnections = (project.relatedActions?.length || 0) +
                          (project.relatedOpportunities?.length || 0) +
                          (project.relatedOrganisations?.length || 0) +
                          (project.relatedResources?.length || 0) +
                          (project.relatedArtifacts?.length || 0);

  // Get primary theme
  const primaryTheme = project.themes?.[0] || 'Community';

  // Determine location - prioritize Places data, then fallback to project location
  const displayLocation = places.length > 0 
    ? places[0].displayName || places[0].name
    : project.location || 'Community Location';

  // Status badge styling
  const getStatusStyle = (status: string) => {
    if (status?.includes('Active')) return 'bg-green-100 text-green-800 border-green-200';
    if (status?.includes('Planning')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (status?.includes('Ideation')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div 
      className={`card ${className}`}
      onClick={() => onClick?.(project)}
      style={{ 
        cursor: 'pointer',
        padding: 'var(--space-4)',
        transition: 'all var(--transition)',
        ...(className?.includes('list-mode') ? {
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-6)',
          padding: 'var(--space-6)'
        } : {})
      }}
    >
      {/* Header: Name + Status */}
      <div className="split" style={{ marginBottom: 'var(--space-3)' }}>
        <div>
          <h3 className="heading-3" style={{ marginBottom: 'var(--space-1)' }}>
            {project.title || project.name}
          </h3>
          <div style={{
            display: 'inline-block',
            padding: 'var(--space-1) var(--space-2)',
            backgroundColor: project.status?.includes('Active') ? '#10B981' : 
                            project.status?.includes('Planning') ? '#3B82F6' : '#8B5CF6',
            color: 'white',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-xs)',
            fontWeight: '600'
          }}>
            {project.status}
          </div>
        </div>
        
        <ExternalLink style={{ width: '16px', height: '16px', color: 'var(--mist)' }} />
      </div>

      {/* Lead Person */}
      {project.projectLead && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {project.projectLead.avatarUrl ? (
            <img 
              src={project.projectLead.avatarUrl} 
              alt={project.projectLead.name}
              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--mist)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Users style={{ width: '12px', height: '12px', color: 'var(--charcoal)' }} />
            </div>
          )}
          <span className="text-small" style={{ color: 'var(--charcoal)' }}>
            {project.projectLead.name}
          </span>
        </div>
      )}

      {/* Location + Theme */}
      <div className="split" style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <MapPin style={{ width: '12px', height: '12px', color: 'var(--mist)' }} />
          <span className="text-small" style={{ color: 'var(--charcoal)' }}>{displayLocation}</span>
        </div>
        
        <span style={{
          backgroundColor: 'var(--pearl)',
          color: 'var(--charcoal)',
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius)',
          fontSize: 'var(--text-xs)',
          fontWeight: '500'
        }}>
          {primaryTheme}
        </span>
      </div>

      {/* Connection Summary */}
      <div className="split" style={{ paddingTop: 'var(--space-2)', borderTop: '1px solid var(--pearl)' }}>
        <div className="text-small" style={{ color: 'var(--charcoal)' }}>
          <span style={{ fontWeight: '600', color: 'var(--obsidian)' }}>{totalConnections}</span> connections
        </div>
        
        {project.coreValues && (
          <div className="text-caption" style={{ color: 'var(--champagne)', fontWeight: '600' }}>
            {project.coreValues}
          </div>
        )}
      </div>
    </div>
  );
};

export default MinimalProjectCard;