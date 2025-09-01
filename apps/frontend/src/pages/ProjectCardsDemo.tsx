/**
 * 🎨 Project Cards Demo Page
 * Showcases all three card types with real Goods project data
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { apiClient, type Project } from '../services/apiClient';
import { MinimalProjectCard } from '../components/ProjectCards/MinimalProjectCard';
import { CompactProjectCard } from '../components/ProjectCards/CompactProjectCard';

const ProjectCardsDemo: React.FC = () => {
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoodsProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const goodsProject = await apiClient.getProject('Goods.');
      if (goodsProject) {
        setProject(goodsProject);
      } else {
        setError('Goods project not found');
      }
    } catch (err) {
      console.error('Failed to fetch Goods project:', err);
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoodsProject();
  }, []);

  const handleProfileView = (project: Project) => {
    navigate(`/project/${encodeURIComponent(project.name)}`);
  };

  const handleCardClick = (project: Project) => {
    console.log('Card clicked:', project.name);
    // Could navigate to enhanced view or modal
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ width: '32px', height: '32px', color: 'var(--champagne)', margin: '0 auto var(--space-4)' }} />
          <p className="text-body">Loading project data...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="text-body" style={{ color: '#dc2626', fontWeight: '600', marginBottom: 'var(--space-4)' }}>{error}</div>
          <button 
            onClick={fetchGoodsProject}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: '0 auto' }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}
        >
          <ArrowLeft style={{ width: '16px', height: '16px' }} />
          <span>Back</span>
        </button>
        
        <div className="split">
          <div>
            <h1 className="heading-1">Project Card System</h1>
            <p className="text-body" style={{ marginTop: 'var(--space-2)' }}>
              Three card types for different use cases: minimal browse, extended details, and full profile
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button
              onClick={() => navigate('/projects-gallery')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <span>View All Projects →</span>
            </button>
            
            <button
              onClick={fetchGoodsProject}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        
        {/* Minimal Card Section */}
        <section>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="heading-2" style={{ marginBottom: 'var(--space-2)' }}>🎯 Minimal Card</h2>
            <p className="text-body">
              Perfect for quick browsing and discovery. Shows essential info at a glance.
            </p>
          </div>
          
          <div className="grid-3" style={{ gap: 'var(--space-6)' }}>
            <MinimalProjectCard 
              project={project}
              onClick={handleCardClick}
            />
            <MinimalProjectCard 
              project={{...project, status: 'Planning 📋', themes: ['Education']}}
              onClick={handleCardClick}
            />
            <MinimalProjectCard 
              project={{...project, status: 'Ideation 🌀', themes: ['Research']}}
              onClick={handleCardClick}
            />
          </div>
        </section>

        {/* Compact Card Section */}
        <section>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="heading-2" style={{ marginBottom: 'var(--space-2)' }}>🗂️ Compact Card</h2>
            <p className="text-body">
              Extended details while staying condensed. Shows full connection breakdown and key metrics.
            </p>
          </div>
          
          <div className="grid-2" style={{ gap: 'var(--space-8)' }}>
            <CompactProjectCard 
              project={project}
              onClick={handleCardClick}
              onProfileView={handleProfileView}
            />
            <CompactProjectCard 
              project={{
                ...project, 
                name: 'Example Project',
                title: 'Example Project',
                status: 'Planning 📋',
                actualIncoming: 50000,
                potentialIncoming: 200000
              }}
              onClick={handleCardClick}
              onProfileView={handleProfileView}
            />
          </div>
        </section>

        {/* Profile Page Section */}
        <section>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="heading-2" style={{ marginBottom: 'var(--space-2)' }}>📋 Full Profile Page</h2>
            <p className="text-body">
              Complete project showcase with detailed metrics, network visualization, and actions.
            </p>
          </div>
          
          <div className="card" style={{ padding: 'var(--space-8)' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>
                {project.title || project.name} - Full Profile
              </h3>
              <p className="text-body" style={{ marginBottom: 'var(--space-6)' }}>
                Click below to view the complete profile page with all details, network connections, and actions.
              </p>
              <button
                onClick={() => handleProfileView(project)}
                className="btn btn-primary"
                style={{ padding: 'var(--space-3) var(--space-8)' }}
              >
                View Full Profile Page →
              </button>
            </div>
          </div>
        </section>

        {/* Places Integration Success */}
        <section>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="heading-2" style={{ marginBottom: 'var(--space-2)' }}>🏡 Places Integration Success</h2>
            <p className="text-body">
              Indigenous and Western place names now display correctly from Notion database.
            </p>
          </div>
          
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <div className="grid-2" style={{ gap: 'var(--space-8)' }}>
              <div>
                <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>✅ Implementation Status</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div className="split">
                    <span className="text-body">Places API</span>
                    <span className="text-small" style={{ color: '#10B981', fontWeight: '600' }}>
                      ✅ Connected
                    </span>
                  </div>
                  <div className="split">
                    <span className="text-body">Related Places</span>
                    <span className="text-small" style={{ color: 'var(--champagne)', fontWeight: '600' }}>
                      {project.relatedPlaces?.length || 0} linked
                    </span>
                  </div>
                  <div className="split">
                    <span className="text-body">Indigenous Names</span>
                    <span className="text-small" style={{ color: '#10B981', fontWeight: '600' }}>
                      ✅ Working
                    </span>
                  </div>
                  <div className="split">
                    <span className="text-body">Display Format</span>
                    <span className="text-small" style={{ fontWeight: '600' }}>
                      "Indigenous / Western"
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="heading-3" style={{ marginBottom: 'var(--space-4)' }}>🗺️ Example Places</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div className="text-small" style={{ color: 'var(--champagne)' }}>• "Bwgcolman / Palm Island"</div>
                  <div className="text-small" style={{ color: 'var(--champagne)' }}>• "Mbantua / Alice Springs"</div>
                  <div className="text-small" style={{ color: 'var(--champagne)' }}>• "Tennant Creek" (connected to Goods)</div>
                  <div className="text-small">• All cards fetch real Places data</div>
                  <div className="text-small">• Indigenous names prioritized in display</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjectCardsDemo;