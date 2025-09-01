/**
 * 🌟 Project Detail Page
 * Displays full details of a single project from Notion
 * Connected to real data via unified API
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Calendar, ExternalLink, Activity, Target, Award } from 'lucide-react';

interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  status?: string;
  area?: string;
  location?: string;
  createdTime?: string;
  lastEditedTime?: string;
  tags?: string[];
  url?: string;
  relatedPeople?: any[];
  relatedOrganizations?: any[];
  relatedOpportunities?: any[];
  communityControlPercentage?: number;
  impactMetrics?: Record<string, any>;
  milestones?: any[];
  challenges?: string[];
  outcomes?: string[];
}

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) {
        setError('No project ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch from unified API
        const response = await fetch(`/api/unified/projects/${projectId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          setProject(result.data);
        } else {
          throw new Error('Project not found');
        }
      } catch (err) {
        console.error('Failed to load project details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [projectId]);

  if (loading) {
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
          <h2 className="heading-3">Loading Project Details</h2>
          <p className="text-body">Fetching from Notion...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)', color: 'var(--error)' }}>
            Failed to Load Project
          </h2>
          <p className="text-body" style={{ marginBottom: 'var(--space-6)' }}>
            {error || 'Project not found'}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/showcase')}
          >
            <ArrowLeft style={{ width: '16px', height: '16px', marginRight: 'var(--space-2)' }} />
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    if (!status) return 'var(--silver)';
    if (status.includes('Active') || status.includes('🔥')) return 'var(--success)';
    if (status.includes('Ideation') || status.includes('🌀')) return 'var(--champagne)';
    if (status.includes('Complete') || status.includes('✅')) return 'var(--sage)';
    return 'var(--silver)';
  };

  return (
    <div className="page">
      {/* Navigation */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/showcase')}
        >
          <ArrowLeft style={{ width: '16px', height: '16px', marginRight: 'var(--space-2)' }} />
          Back to Projects
        </button>
      </div>

      {/* Project Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="split">
          <div>
            <h1 className="heading-1" style={{ marginBottom: 'var(--space-3)' }}>
              {project.name}
            </h1>
            
            <div className="inline" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              {project.status && (
                <span style={{
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: getStatusColor(project.status),
                  color: 'white',
                  borderRadius: 'var(--radius)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: '500'
                }}>
                  {project.status}
                </span>
              )}
              
              {project.location && (
                <span className="inline" style={{ gap: 'var(--space-1)', color: 'var(--silver)' }}>
                  <MapPin style={{ width: '16px', height: '16px' }} />
                  {project.location}
                </span>
              )}
            </div>

            {project.description && (
              <p className="text-body" style={{ maxWidth: '800px' }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Key Metrics */}
          {project.communityControlPercentage && (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
              <div className="metric">
                <div className="metric-value" style={{ fontSize: 'var(--text-4xl)', color: 'var(--sage)' }}>
                  {project.communityControlPercentage}%
                </div>
                <div className="metric-label">Community Control</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid-2" style={{ gap: 'var(--space-6)' }}>
        
        {/* Project Details */}
        <div className="card">
          <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
            <Target style={{ width: '20px', height: '20px', marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
            Project Details
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {project.area && (
              <div>
                <strong className="text-body" style={{ color: 'var(--silver)' }}>Focus Area:</strong>
                <p className="text-body">{project.area}</p>
              </div>
            )}
            
            <div>
              <strong className="text-body" style={{ color: 'var(--silver)' }}>Created:</strong>
              <p className="text-body">{formatDate(project.createdTime)}</p>
            </div>
            
            <div>
              <strong className="text-body" style={{ color: 'var(--silver)' }}>Last Updated:</strong>
              <p className="text-body">{formatDate(project.lastEditedTime)}</p>
            </div>

            {project.url && (
              <a 
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start' }}
              >
                <ExternalLink style={{ width: '16px', height: '16px', marginRight: 'var(--space-2)' }} />
                View in Notion
              </a>
            )}
          </div>
        </div>

        {/* Collaborators */}
        <div className="card">
          <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
            <Users style={{ width: '20px', height: '20px', marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
            Collaborators & Partners
          </h2>
          
          {project.relatedPeople && project.relatedPeople.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {project.relatedPeople.map((person, index) => (
                <div key={index} className="inline" style={{ gap: 'var(--space-3)' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--pearl)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-sm)',
                    fontWeight: '600',
                    color: 'var(--obsidian)'
                  }}>
                    {person.name?.substring(0, 1).toUpperCase() || '?'}
                  </div>
                  <span className="text-body">{person.name || 'Unknown'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body" style={{ color: 'var(--silver)' }}>
              No collaborators listed yet
            </p>
          )}

          {project.relatedOrganizations && project.relatedOrganizations.length > 0 && (
            <>
              <h3 className="heading-4" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-3)' }}>
                Partner Organizations
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {project.relatedOrganizations.map((org, index) => (
                  <span key={index} className="tag">
                    {org.name || 'Unknown Organization'}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Outcomes & Impact */}
        {(project.outcomes || project.impactMetrics) && (
          <div className="card">
            <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
              <Award style={{ width: '20px', height: '20px', marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
              Outcomes & Impact
            </h2>
            
            {project.outcomes && project.outcomes.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {project.outcomes.map((outcome, index) => (
                  <li key={index} className="text-body" style={{ 
                    marginBottom: 'var(--space-2)',
                    paddingLeft: 'var(--space-6)',
                    position: 'relative'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      color: 'var(--sage)'
                    }}>✓</span>
                    {outcome}
                  </li>
                ))}
              </ul>
            )}

            {project.impactMetrics && Object.keys(project.impactMetrics).length > 0 && (
              <div className="inline" style={{ gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                {Object.entries(project.impactMetrics).map(([key, value]) => (
                  <div key={key} className="metric" style={{ textAlign: 'center' }}>
                    <div className="metric-value">{value as string}</div>
                    <div className="metric-label">{key.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Related Opportunities */}
        {project.relatedOpportunities && project.relatedOpportunities.length > 0 && (
          <div className="card">
            <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
              <Activity style={{ width: '20px', height: '20px', marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
              Related Opportunities
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {project.relatedOpportunities.map((opp, index) => (
                <div key={index} style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--pearl)',
                  borderRadius: 'var(--radius)',
                  borderLeft: '3px solid var(--champagne)'
                }}>
                  <h4 className="heading-4" style={{ marginBottom: 'var(--space-1)' }}>
                    {opp.name || 'Unnamed Opportunity'}
                  </h4>
                  {opp.stage && (
                    <span className="text-sm" style={{ color: 'var(--silver)' }}>
                      Stage: {opp.stage}
                    </span>
                  )}
                  {opp.amount && (
                    <p className="text-body" style={{ marginTop: 'var(--space-2)' }}>
                      Amount: ${opp.amount.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="card">
            <h2 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
              Project Tags
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {project.tags.map((tag, index) => (
                <span key={index} className="tag tag-secondary">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage;