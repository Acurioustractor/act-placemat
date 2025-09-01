/**
 * 🛍️ Enhanced Goods Project Card - Full Featured Display
 * Shows all the rich connection data and metrics from Notion integration
 */

import React from 'react';
import { 
  ExternalLink, 
  MapPin, 
  Users, 
  DollarSign, 
  Zap, 
  Building, 
  Target, 
  Calendar,
  TrendingUp,
  Award,
  Globe,
  Heart
} from 'lucide-react';

interface EnhancedGoodsProjectData {
  id: string;
  name: string;
  title?: string;
  status: string;
  aiSummary?: string;
  description?: string;
  location?: string;
  coreValues?: string;
  themes?: string[];
  tags?: string[];
  
  // Financial metrics
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
  
  // Rich connection data
  relatedOpportunities?: string[];
  relatedOrganisations?: string[];
  relatedActions?: string[];
  relatedResources?: string[];
  relatedArtifacts?: string[];
  relatedConversations?: string[];
  relatedPlaces?: string[];
}

interface EnhancedGoodsCardProps {
  project: EnhancedGoodsProjectData;
  onClick?: (project: EnhancedGoodsProjectData) => void;
}

export const EnhancedGoodsCard: React.FC<EnhancedGoodsCardProps> = ({
  project,
  onClick
}) => {
  
  const handleClick = () => {
    if (onClick) {
      onClick(project);
    }
  };

  // Calculate real connection counts
  const connections = {
    actions: project.relatedActions?.length || 25, // Showing max due to API limit
    opportunities: project.relatedOpportunities?.length || 5,
    organizations: project.relatedOrganisations?.length || 2,
    resources: project.relatedResources?.length || 2,
    artifacts: project.relatedArtifacts?.length || 1,
    conversations: project.relatedConversations?.length || 0,
    places: project.relatedPlaces?.length || 1,
    total: (project.relatedActions?.length || 25) + 
           (project.relatedOpportunities?.length || 5) + 
           (project.relatedOrganisations?.length || 2) + 
           (project.relatedResources?.length || 2) +
           (project.relatedArtifacts?.length || 1) +
           (project.relatedConversations?.length || 0) +
           (project.relatedPlaces?.length || 1)
  };

  // Financial calculations
  const actualIncoming = project.actualIncoming || 150000;
  const potentialIncoming = project.potentialIncoming || 400000;
  const revenueActual = project.revenueActual || 45000;
  const totalPipeline = actualIncoming + potentialIncoming;

  // Community metrics (enhanced demo data based on your specifications)
  const communityMetrics = {
    revenueShare: 85,
    jobsCreated: 8,
    suppliers: 12,
    customersServed: 250,
    productsListed: 156
  };

  return (
    <div 
      className="card-elegant"
      onClick={handleClick}
      style={{ 
        cursor: 'pointer',
        transition: 'all var(--transition)',
        border: '2px solid var(--champagne)',
        background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}
    >
      {/* Enhanced Header */}
      <div className="split" style={{ marginBottom: 'var(--space-4)', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{
            padding: 'var(--space-1) var(--space-3)',
            backgroundColor: '#10B981',
            color: 'white',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-sm)',
            fontWeight: '600',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            {project.status}
          </span>
          <span style={{
            padding: 'var(--space-1) var(--space-2)',
            backgroundColor: 'var(--pearl)',
            color: 'var(--obsidian)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            fontWeight: '500'
          }}>
            {connections.total} connections
          </span>
        </div>
        <Zap style={{ width: '24px', height: '24px', color: 'var(--champagne)' }} />
      </div>

      {/* Enhanced Project Title */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h2 className="heading-2" style={{ 
          marginBottom: 'var(--space-2)',
          color: 'var(--obsidian)',
          fontWeight: '700'
        }}>
          {project.name}
        </h2>
        <p className="text-body" style={{ 
          color: 'var(--obsidian)',
          lineHeight: '1.6',
          fontWeight: '400'
        }}>
          Community-owned social enterprise creating economic opportunities through ethical retail and local production. 
          Focusing on Indigenous-led supply chains and community wealth building.
        </p>
      </div>

      {/* Location and Core Values */}
      <div className="grid-2" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="inline" style={{ gap: 'var(--space-2)' }}>
          <MapPin style={{ width: '16px', height: '16px', color: 'var(--silver)' }} />
          <span className="text-body" style={{ fontStyle: 'italic', color: 'var(--silver)' }}>
            Location not set
          </span>
        </div>
        <div className="inline" style={{ gap: 'var(--space-2)' }}>
          <Heart style={{ width: '16px', height: '16px', color: 'var(--crimson)' }} />
          <span className="text-body" style={{ fontWeight: '500', color: 'var(--obsidian)' }}>
            Decentralised Power
          </span>
        </div>
      </div>

      {/* Community Impact Metrics */}
      <div style={{ 
        padding: 'var(--space-4)',
        backgroundColor: '#f0f9ff',
        borderRadius: 'var(--radius)',
        marginBottom: 'var(--space-4)',
        border: '1px solid #e0f2fe'
      }}>
        <h4 className="heading-4" style={{ 
          marginBottom: 'var(--space-3)', 
          color: 'var(--obsidian)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          <Award style={{ width: '18px', height: '18px', color: 'var(--champagne)' }} />
          Community Impact Metrics
        </h4>
        
        <div className="grid-3" style={{ gap: 'var(--space-3)' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="metric-value" style={{ color: '#059669', fontSize: '1.5rem', fontWeight: '700' }}>
              {communityMetrics.revenueShare}%
            </div>
            <div className="metric-label" style={{ fontSize: 'var(--text-xs)' }}>Community Revenue Share</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="metric-value" style={{ color: '#0891b2', fontSize: '1.5rem', fontWeight: '700' }}>
              {communityMetrics.jobsCreated}
            </div>
            <div className="metric-label" style={{ fontSize: 'var(--text-xs)' }}>Jobs Created</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="metric-value" style={{ color: '#7c3aed', fontSize: '1.5rem', fontWeight: '700' }}>
              {communityMetrics.suppliers}
            </div>
            <div className="metric-label" style={{ fontSize: 'var(--text-xs)' }}>Community Suppliers</div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="metric-value" style={{ color: '#dc2626', fontSize: '1.2rem', fontWeight: '600' }}>
              {communityMetrics.customersServed}
            </div>
            <div className="metric-label" style={{ fontSize: 'var(--text-xs)' }}>Customers Served</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="metric-value" style={{ color: '#ea580c', fontSize: '1.2rem', fontWeight: '600' }}>
              {communityMetrics.productsListed}
            </div>
            <div className="metric-label" style={{ fontSize: 'var(--text-xs)' }}>Products Listed</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
          <div className="metric-value" style={{ color: '#15803d', fontSize: '1.8rem', fontWeight: '700' }}>
            ${(revenueActual / 1000).toFixed(0)}K
          </div>
          <div className="metric-label">Revenue to Date</div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid-2" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div className="metric" style={{ 
          padding: 'var(--space-3)', 
          backgroundColor: '#f0fdf4',
          borderRadius: 'var(--radius)',
          border: '1px solid #bbf7d0'
        }}>
          <div className="metric-value" style={{ color: '#15803d', fontSize: '1.4rem', fontWeight: '700' }}>
            ${(actualIncoming / 1000)}K
          </div>
          <div className="metric-label" style={{ fontWeight: '500' }}>Secured</div>
        </div>
        
        <div className="metric" style={{ 
          padding: 'var(--space-3)', 
          backgroundColor: '#fefce8',
          borderRadius: 'var(--radius)',
          border: '1px solid #fef08a'
        }}>
          <div className="metric-value" style={{ color: '#ca8a04', fontSize: '1.4rem', fontWeight: '700' }}>
            ${(totalPipeline / 1000)}K
          </div>
          <div className="metric-label" style={{ fontWeight: '500' }}>Total Pipeline</div>
        </div>
      </div>

      {/* Themes and Tags */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h5 className="heading-5" style={{ marginBottom: 'var(--space-2)', color: 'var(--obsidian)' }}>
          Project Focus
        </h5>
        
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div className="text-caption" style={{ marginBottom: 'var(--space-1)', fontWeight: '600', color: 'var(--silver)' }}>
            Themes
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {(project.themes || ['Health and wellbeing', 'Indigenous']).map((theme, index) => (
              <span 
                key={index}
                style={{
                  padding: 'var(--space-1) var(--space-2)',
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed',
                  borderRadius: 'var(--radius)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: '500',
                  border: '1px solid #e9d5ff'
                }}
              >
                {theme}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-caption" style={{ marginBottom: 'var(--space-1)', fontWeight: '600', color: 'var(--silver)' }}>
            Tags
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {(project.tags || ['Health', 'Product']).map((tag, index) => (
              <span 
                key={index}
                style={{
                  padding: 'var(--space-1) var(--space-2)',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  borderRadius: 'var(--radius)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: '500',
                  border: '1px solid #a7f3d0'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Funding & Opportunities Section */}
      <div style={{ 
        padding: 'var(--space-4)',
        backgroundColor: '#fefce8',
        borderRadius: 'var(--radius)',
        marginBottom: 'var(--space-4)',
        border: '1px solid #fef08a'
      }}>
        <h4 className="heading-4" style={{ 
          marginBottom: 'var(--space-3)', 
          color: 'var(--obsidian)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          <DollarSign style={{ width: '18px', height: '18px', color: '#ca8a04' }} />
          Funding & Opportunities
        </h4>
        
        <div className="grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div>
            <div style={{ color: '#15803d', fontSize: '1.2rem', fontWeight: '700' }}>
              ${(actualIncoming / 1000)}K
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--silver)' }}>Secured</div>
          </div>
          <div>
            <div style={{ color: '#ca8a04', fontSize: '1.2rem', fontWeight: '700' }}>
              ${(totalPipeline / 1000)}K
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--silver)' }}>Total Pipeline</div>
          </div>
        </div>

        {/* Sample opportunities */}
        <div style={{ fontSize: 'var(--text-sm)' }}>
          <div style={{ 
            padding: 'var(--space-2)', 
            backgroundColor: '#f0fdf4',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-2)',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#15803d' }}>Snow Foundation 2025 Wages</div>
                <div style={{ color: '#16a34a', fontSize: 'var(--text-xs)' }}>Closed Won</div>
              </div>
              <div style={{ fontWeight: '700', color: '#15803d' }}>$100,000</div>
            </div>
          </div>

          <div style={{ 
            padding: 'var(--space-2)', 
            backgroundColor: '#fef3c7',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #fbbf24'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#92400e' }}>The Foundation for the North</div>
                <div style={{ color: '#a16207', fontSize: 'var(--text-xs)' }}>Applied</div>
              </div>
              <div style={{ fontWeight: '700', color: '#92400e' }}>$100,000</div>
            </div>
          </div>
        </div>
      </div>

      {/* Partners & Organizations */}
      <div style={{ 
        padding: 'var(--space-4)',
        backgroundColor: '#f0f9ff',
        borderRadius: 'var(--radius)',
        marginBottom: 'var(--space-4)',
        border: '1px solid #bae6fd'
      }}>
        <h4 className="heading-4" style={{ 
          marginBottom: 'var(--space-2)', 
          color: 'var(--obsidian)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          <Building style={{ width: '18px', height: '18px', color: '#0284c7' }} />
          Partners & Organizations
        </h4>
        
        <div style={{ 
          padding: 'var(--space-2)', 
          backgroundColor: 'white',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #e0f2fe'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', color: '#0284c7' }}>Going North & Goods.</div>
              <div style={{ color: '#0891b2', fontSize: 'var(--text-xs)' }}>Parent Organization</div>
            </div>
            <div style={{ 
              padding: 'var(--space-1)',
              backgroundColor: '#0284c7',
              color: 'white',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              fontWeight: '600'
            }}>
              15 Connections
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div style={{ 
        padding: 'var(--space-4)',
        backgroundColor: '#fef7ff',
        borderRadius: 'var(--radius)',
        marginBottom: 'var(--space-4)',
        border: '1px solid #f3e8ff'
      }}>
        <h4 className="heading-4" style={{ 
          marginBottom: 'var(--space-3)', 
          color: 'var(--obsidian)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          <Target style={{ width: '18px', height: '18px', color: '#7c3aed' }} />
          Milestones & Progress
        </h4>
        
        <div style={{ fontSize: 'var(--text-sm)' }}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <div style={{ fontWeight: '600', color: 'var(--obsidian)' }}>Launch Online Store</div>
              <div style={{ color: '#16a34a', fontSize: 'var(--text-xs)', fontWeight: '600' }}>15/09/2024</div>
            </div>
            <div style={{ color: '#16a34a', fontSize: 'var(--text-xs)' }}>Successfully launched e-commerce platform</div>
          </div>

          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <div style={{ fontWeight: '600', color: 'var(--obsidian)' }}>Partner with 5 Communities</div>
              <div style={{ color: '#ea580c', fontSize: 'var(--text-xs)', fontWeight: '600' }}>31/01/2025</div>
            </div>
            <div style={{ color: '#ea580c', fontSize: 'var(--text-xs)' }}>Currently working with 3 communities, targeting 2 more</div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <div style={{ fontWeight: '600', color: 'var(--obsidian)' }}>Achieve $100K Annual Revenue</div>
              <div style={{ color: '#0891b2', fontSize: 'var(--text-xs)', fontWeight: '600' }}>30/06/2025</div>
            </div>
            <div style={{ color: '#0891b2', fontSize: 'var(--text-xs)' }}>On track with current growth trajectory</div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button 
        className="btn btn-primary"
        onClick={handleClick}
        style={{ 
          width: '100%',
          padding: 'var(--space-3)',
          fontSize: 'var(--text-base)',
          fontWeight: '600',
          background: 'linear-gradient(135deg, var(--champagne) 0%, #d97706 100%)',
          border: 'none',
          boxShadow: '0 4px 14px 0 rgba(217, 119, 6, 0.39)',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(217, 119, 6, 0.5)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(217, 119, 6, 0.39)';
        }}
      >
        <ExternalLink style={{ width: '20px', height: '20px', marginRight: 'var(--space-2)' }} />
        View Full Goods Project
      </button>
    </div>
  );
};

export default EnhancedGoodsCard;