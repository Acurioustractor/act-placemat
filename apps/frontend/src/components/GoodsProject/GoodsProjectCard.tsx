/**
 * 🛍️ Goods Project Card - Specialized Component
 * Custom card for the Goods project showing available data and suggesting needed fields
 */

import React from 'react';
import { ExternalLink, MapPin, Users, DollarSign, Zap } from 'lucide-react';

interface GoodsProjectData {
  id: string;
  name: string;
  title?: string;
  status: string;
  connections?: number;
  
  // Rich Notion fields
  aiSummary?: string;
  description?: string;
  location?: string;
  coreValues?: string;
  themes?: string[];
  tags?: string[];
  
  // Financial data from Notion
  actualIncoming?: number;
  potentialIncoming?: number;
  revenueActual?: number;
  revenuePotential?: number;
  
  // Project leadership
  projectLead?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  
  // Impact metrics wrapper (for compatibility)
  impact_metrics?: {
    actualIncoming?: number;
    potentialIncoming?: number;
    revenueActual?: number;
    revenuePotential?: number;
    partnerCount?: number;
    projectLead?: string;
  };
  
  // Related data arrays (relation IDs from Notion)
  relatedOpportunities?: string[];
  relatedOrganisations?: string[];
  relatedActions?: string[];
  relatedResources?: string[];
  relatedArtifacts?: string[];
  relatedConversations?: string[];
  relatedPlaces?: string[];
  
  // Legacy fields
  related_opportunities?: any[];
  related_organisations?: any[];
  related_actions?: any[];
}

interface GoodsProjectCardProps {
  project: GoodsProjectData;
  onClick?: (project: GoodsProjectData) => void;
}

export const GoodsProjectCard: React.FC<GoodsProjectCardProps> = ({
  project,
  onClick
}) => {
  
  const handleClick = () => {
    if (onClick) {
      onClick(project);
    }
  };

  // Get financial data from either direct fields or impact_metrics wrapper
  const actualIncoming = project.actualIncoming || project.impact_metrics?.actualIncoming || 0;
  const potentialIncoming = project.potentialIncoming || project.impact_metrics?.potentialIncoming || 0;
  const revenueActual = project.revenueActual || project.impact_metrics?.revenueActual || 0;
  const revenuePotential = project.revenuePotential || project.impact_metrics?.revenuePotential || 0;
  
  // Calculate connection count from relations
  const connectionCount = project.connections || 
    (project.relatedActions?.length || 0) + 
    (project.relatedOpportunities?.length || 0) + 
    (project.relatedOrganisations?.length || 0) + 
    (project.relatedResources?.length || 0) +
    (project.relatedArtifacts?.length || 0) +
    (project.relatedConversations?.length || 0) +
    (project.relatedPlaces?.length || 0);
  
  // Use real funding data
  const totalFunding = actualIncoming + potentialIncoming;
  const wonFunding = actualIncoming; // Actual incoming is secured/won funding

  return (
    <div 
      className="card-elegant"
      onClick={handleClick}
      style={{ 
        cursor: 'pointer',
        transition: 'all var(--transition)',
        border: '2px solid var(--champagne)'
      }}
    >
      {/* Header with status */}
      <div className="split" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <span style={{
            padding: 'var(--space-1) var(--space-3)',
            backgroundColor: 'var(--success)',
            color: 'white',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            fontWeight: '500'
          }}>
            {project.status}
          </span>
        </div>
        <div>
          <Zap style={{ width: '20px', height: '20px', color: 'var(--champagne)' }} />
        </div>
      </div>

      {/* Project name */}
      <h2 className="heading-2" style={{ 
        marginBottom: 'var(--space-3)',
        color: 'var(--obsidian)'
      }}>
        {project.name}
      </h2>

      {/* Description - now showing REAL Notion AI Summary */}
      <p className="text-body" style={{ 
        marginBottom: 'var(--space-4)',
        color: project.aiSummary ? 'var(--obsidian)' : 'var(--silver)',
        fontStyle: project.aiSummary ? 'normal' : 'italic'
      }}>
        {project.aiSummary || project.description || "🤔 Add AI Summary field in Notion to show project description here"}
      </p>

      {/* Key Metrics */}
      <div className="grid-2" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="metric">
          <div className="metric-value" style={{ color: 'var(--sage)' }}>
            ${(wonFunding / 1000)}K
          </div>
          <div className="metric-label">Secured Funding</div>
        </div>
        
        <div className="metric">
          <div className="metric-value" style={{ color: 'var(--champagne)' }}>
            ${(totalFunding / 1000)}K
          </div>
          <div className="metric-label">Total Pipeline</div>
        </div>
      </div>

      {/* Connections - now showing REAL count from Notion relations */}
      <div className="inline" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <Users style={{ width: '16px', height: '16px', color: 'var(--silver)' }} />
        <span className="text-body">{connectionCount} connections</span>
      </div>

      {/* Location - now showing REAL Notion location data */}
      <div className="inline" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <MapPin style={{ width: '16px', height: '16px', color: 'var(--silver)' }} />
        <span className="text-body" style={{ 
          color: project.location ? 'var(--obsidian)' : 'var(--silver)', 
          fontStyle: project.location ? 'normal' : 'italic' 
        }}>
          {project.location || "Location not set"}
        </span>
      </div>

      {/* Tags suggestion */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {project.tags && project.tags.length > 0 ? (
            project.tags.map((tag, index) => (
              <span 
                key={index}
                className="tag tag-secondary"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-caption" style={{ color: 'var(--silver)', fontStyle: 'italic' }}>
              🏷️ Add Tags in Notion (e.g., "Social Enterprise", "Retail", "Community")
            </span>
          )}
        </div>
      </div>

      {/* Related opportunities preview - show real count from Notion */}
      <div style={{ 
        padding: 'var(--space-3)',
        backgroundColor: 'var(--pearl)',
        borderRadius: 'var(--radius)',
        marginBottom: 'var(--space-4)'
      }}>
        <h4 className="heading-4" style={{ marginBottom: 'var(--space-2)' }}>
          Funding Opportunities
        </h4>
        {(project.relatedOpportunities?.length || 0) > 0 ? (
          <>
            <div className="inline" style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <DollarSign style={{ width: '14px', height: '14px', color: 'var(--sage)' }} />
              <span className="text-sm">{project.relatedOpportunities?.length} opportunities connected</span>
              <span style={{
                padding: 'var(--space-1)',
                backgroundColor: 'var(--sage)',
                color: 'white',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)'
              }}>
                From Notion
              </span>
            </div>
            <div className="inline" style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <DollarSign style={{ width: '14px', height: '14px', color: 'var(--champagne)' }} />
              <span className="text-sm">${(totalFunding / 1000).toFixed(0)}K total funding pipeline</span>
            </div>
          </>
        ) : (
          <div className="text-sm" style={{ color: 'var(--silver)', fontStyle: 'italic' }}>
            🔗 Connect opportunities in Notion to show funding details
          </div>
        )}
      </div>

      {/* Action */}
      <button 
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        <ExternalLink style={{ width: '16px', height: '16px', marginRight: 'var(--space-2)' }} />
        View Goods Project Details
      </button>
    </div>
  );
};

export default GoodsProjectCard;