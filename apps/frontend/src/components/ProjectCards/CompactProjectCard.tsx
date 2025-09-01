/**
 * 🗂️ Compact Project Card - Extended Details
 * Shows comprehensive info while staying condensed
 * Uses ACT Platform Design System v2
 */

import React, { useEffect, useState } from 'react';
import { 
  MapPin, Users, DollarSign, Target, Building, 
  Zap, ExternalLink, Award, TrendingUp 
} from 'lucide-react';
import type { Project, Place } from '../../services/apiClient';
import { apiClient } from '../../services/apiClient';

interface CompactProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  onProfileView?: (project: Project) => void;
  className?: string;
}

export const CompactProjectCard: React.FC<CompactProjectCardProps> = ({
  project,
  onClick,
  onProfileView,
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

  // Calculate connection counts
  const connectionCounts = apiClient.calculateConnectionCounts(project);
  
  // Determine location - prioritize Places data with Indigenous/Western names
  const displayLocation = places.length > 0 
    ? (places[0].indigenousName && places[0].westernName 
        ? `${places[0].indigenousName} / ${places[0].westernName}`
        : places[0].displayName || places[0].name)
    : project.location || 'Community Location';

  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    if (!amount || amount === 0) return '—';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div 
      className={`card-elegant ${className}`}
      style={{
        padding: 'var(--space-6)',
        transition: 'all var(--transition)',
        cursor: 'pointer'
      }}
      onClick={() => onClick?.(project)}
    >
      {/* Header */}
      <div className="split" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h3 className="heading-2" style={{ marginBottom: 'var(--space-2)' }}>
            {project.title || project.name}
          </h3>
          <div style={{
            display: 'inline-block',
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: project.status?.includes('Active') ? '#10B981' : 
                            project.status?.includes('Planning') ? '#3B82F6' : '#8B5CF6',
            color: 'white',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            fontWeight: '600'
          }}>
            {project.status}
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onProfileView?.(project);
          }}
          style={{
            color: 'var(--mist)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 'var(--space-2)',
            transition: 'color var(--transition)'
          }}
          title="View full profile"
        >
          <ExternalLink style={{ width: '20px', height: '20px' }} />
        </button>
      </div>

      {/* Project Lead */}
      {project.projectLead && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {project.projectLead.avatarUrl ? (
            <img 
              src={project.projectLead.avatarUrl} 
              alt={project.projectLead.name}
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--pearl)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Users style={{ width: '16px', height: '16px', color: 'var(--charcoal)' }} />
            </div>
          )}
          <div>
            <div className="text-body" style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
              {project.projectLead.name}
            </div>
            <div className="text-small" style={{ color: 'var(--mist)' }}>Project Lead</div>
          </div>
        </div>
      )}

      {/* Description Preview */}
      {(project.aiSummary || project.description) && (
        <p className="text-body" style={{ 
          color: 'var(--charcoal)', 
          marginBottom: 'var(--space-4)',
          lineHeight: '1.5',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {project.aiSummary || project.description}
        </p>
      )}

      {/* Key Metrics Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 'var(--space-4)', 
        marginBottom: 'var(--space-4)' 
      }}>
        {/* Location & Core Values */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <MapPin style={{ width: '16px', height: '16px', color: 'var(--mist)' }} />
            <span className="text-small" style={{ color: 'var(--charcoal)' }}>{displayLocation}</span>
          </div>
          {project.coreValues && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Target style={{ width: '16px', height: '16px', color: 'var(--mist)' }} />
              <span className="text-small" style={{ color: 'var(--charcoal)' }}>{project.coreValues}</span>
            </div>
          )}
        </div>

        {/* Financial Metrics */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <DollarSign style={{ width: '16px', height: '16px', color: 'var(--mist)' }} />
            <span className="text-small" style={{ color: 'var(--charcoal)' }}>Secured: {formatCurrency(project.actualIncoming)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--mist)' }} />
            <span className="text-small" style={{ color: 'var(--charcoal)' }}>Potential: {formatCurrency(project.potentialIncoming)}</span>
          </div>
        </div>
      </div>

      {/* Connection Breakdown */}
      <div style={{ borderTop: '1px solid var(--pearl)', paddingTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="split" style={{ marginBottom: 'var(--space-3)' }}>
          <h4 className="text-body" style={{ fontWeight: '600' }}>Network Connections</h4>
          <span className="text-small" style={{ color: 'var(--champagne)', fontWeight: '700' }}>
            {connectionCounts.total} total
          </span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '32px', 
              height: '32px', 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: 'var(--radius)', 
              margin: '0 auto var(--space-1)'
            }}>
              <Zap style={{ width: '16px', height: '16px', color: '#3B82F6' }} />
            </div>
            <div className="text-small" style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
              {connectionCounts.actions}
            </div>
            <div className="text-caption" style={{ color: 'var(--mist)' }}>Actions</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '32px', 
              height: '32px', 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              borderRadius: 'var(--radius)', 
              margin: '0 auto var(--space-1)'
            }}>
              <Target style={{ width: '16px', height: '16px', color: '#10B981' }} />
            </div>
            <div className="text-small" style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
              {connectionCounts.opportunities}
            </div>
            <div className="text-caption" style={{ color: 'var(--mist)' }}>Opps</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '32px', 
              height: '32px', 
              backgroundColor: 'rgba(139, 92, 246, 0.1)', 
              borderRadius: 'var(--radius)', 
              margin: '0 auto var(--space-1)'
            }}>
              <Building style={{ width: '16px', height: '16px', color: '#8B5CF6' }} />
            </div>
            <div className="text-small" style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
              {connectionCounts.organizations}
            </div>
            <div className="text-caption" style={{ color: 'var(--mist)' }}>Orgs</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '32px', 
              height: '32px', 
              backgroundColor: 'rgba(249, 115, 22, 0.1)', 
              borderRadius: 'var(--radius)', 
              margin: '0 auto var(--space-1)'
            }}>
              <Award style={{ width: '16px', height: '16px', color: '#F97316' }} />
            </div>
            <div className="text-small" style={{ fontWeight: '600', marginBottom: 'var(--space-1)' }}>
              {connectionCounts.resources}
            </div>
            <div className="text-caption" style={{ color: 'var(--mist)' }}>Resources</div>
          </div>
        </div>
      </div>

      {/* Tags & Themes */}
      {(project.themes?.length || project.tags?.length) && (
        <div style={{ borderTop: '1px solid var(--pearl)', paddingTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {project.themes?.slice(0, 3).map((theme, index) => (
              <span 
                key={index}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: '#1E40AF',
                  fontSize: 'var(--text-xs)',
                  fontWeight: '600'
                }}
              >
                {theme}
              </span>
            ))}
            {project.tags?.slice(0, 2).map((tag, index) => (
              <span 
                key={index}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius)',
                  backgroundColor: 'var(--pearl)',
                  color: 'var(--charcoal)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: '600'
                }}
              >
                {tag}
              </span>
            ))}
            {((project.themes?.length || 0) + (project.tags?.length || 0)) > 5 && (
              <span className="text-caption" style={{ color: 'var(--mist)' }}>
                +{((project.themes?.length || 0) + (project.tags?.length || 0)) - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        borderTop: '1px solid var(--pearl)', 
        paddingTop: 'var(--space-4)', 
        display: 'flex', 
        gap: 'var(--space-3)' 
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(project);
          }}
          className="btn btn-primary"
          style={{ flex: 1 }}
        >
          View Details
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://www.notion.so/acurioustractor/${project.id}`, '_blank');
          }}
          className="btn btn-secondary"
        >
          Edit in Notion
        </button>
      </div>
    </div>
  );
};

export default CompactProjectCard;