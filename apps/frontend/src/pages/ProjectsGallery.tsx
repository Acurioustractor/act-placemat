/**
 * 🗂️ Projects Gallery - Complete Project Discovery
 * Browsable grid of all projects with search, filtering, and click-through navigation
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, ArrowLeft, RefreshCw, Grid, List, 
  MapPin, Users, DollarSign, Activity, Zap 
} from 'lucide-react';
import { apiClient, type Project } from '../services/apiClient';
import { MinimalProjectCard } from '../components/ProjectCards/MinimalProjectCard';

const ProjectsGallery: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch all projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const allProjects = await apiClient.getProjects();
      setProjects(allProjects);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Filtering and search logic
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search filter
      const matchesSearch = !searchQuery || 
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.aiSummary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.themes?.some(theme => theme.toLowerCase().includes(searchQuery.toLowerCase())) ||
        project.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        project.status?.toLowerCase().includes(statusFilter.toLowerCase());

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    const statuses = projects.map(p => p.status).filter(Boolean);
    return [...new Set(statuses)];
  }, [projects]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status?.includes('Active')).length;
    const totalFunding = projects.reduce((sum, p) => sum + (p.actualIncoming || 0), 0);
    const totalConnections = projects.reduce((sum, p) => 
      sum + (p.relatedActions?.length || 0) + 
            (p.relatedOpportunities?.length || 0) + 
            (p.relatedOrganisations?.length || 0) + 
            (p.relatedResources?.length || 0), 0);
    
    return { totalProjects, activeProjects, totalFunding, totalConnections };
  }, [projects]);

  // Handle project card click - navigate to profile
  const handleProjectClick = (project: Project) => {
    // Use project name for URL-friendly routing
    navigate(`/project/${encodeURIComponent(project.name)}`);
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Activity style={{ 
            width: '48px', 
            height: '48px', 
            color: 'var(--champagne)', 
            margin: '0 auto var(--space-4)',
            animation: 'pulse 2s infinite'
          }} />
          <h2 className="heading-3" style={{ marginBottom: 'var(--space-2)' }}>
            Loading Projects Gallery
          </h2>
          <p className="text-body" style={{ color: 'var(--mist)' }}>
            Fetching all projects from Notion database...
          </p>
        </div>
      </div>
    );
  }

  if (error || projects.length === 0) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="text-body" style={{ color: '#dc2626', fontWeight: '600', marginBottom: 'var(--space-4)' }}>
            {error || 'No projects found'}
          </div>
          <button 
            onClick={fetchProjects}
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
      {/* Header with Navigation */}
      <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}
        >
          <ArrowLeft style={{ width: '16px', height: '16px' }} />
          <span>Back</span>
        </button>

        <div className="split" style={{ marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 className="heading-1">Projects Gallery</h1>
            <p className="text-body" style={{ marginTop: 'var(--space-2)', color: 'var(--charcoal)' }}>
              Discover and explore all community projects with Indigenous place names and live connection data
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              {viewMode === 'grid' ? <List style={{ width: '16px', height: '16px' }} /> : <Grid style={{ width: '16px', height: '16px' }} />}
              <span>{viewMode === 'grid' ? 'List View' : 'Grid View'}</span>
            </button>
            
            <button
              onClick={fetchProjects}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid-4" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <div className="text-large" style={{ fontWeight: '700', color: 'var(--champagne)' }}>
              {stats.totalProjects}
            </div>
            <div className="text-small" style={{ color: 'var(--mist)' }}>Total Projects</div>
          </div>
          
          <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <div className="text-large" style={{ fontWeight: '700', color: '#10B981' }}>
              {stats.activeProjects}
            </div>
            <div className="text-small" style={{ color: 'var(--mist)' }}>Active Projects</div>
          </div>
          
          <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <div className="text-large" style={{ fontWeight: '700', color: '#3B82F6' }}>
              {formatCurrency(stats.totalFunding)}
            </div>
            <div className="text-small" style={{ color: 'var(--mist)' }}>Total Secured</div>
          </div>
          
          <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <div className="text-large" style={{ fontWeight: '700', color: '#8B5CF6' }}>
              {stats.totalConnections}
            </div>
            <div className="text-small" style={{ color: 'var(--mist)' }}>Network Connections</div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search style={{ 
                position: 'absolute', 
                left: 'var(--space-3)', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                width: '16px', 
                height: '16px', 
                color: 'var(--mist)' 
              }} />
              <input
                type="text"
                placeholder="Search projects by name, description, themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: 'var(--space-10)', width: '100%' }}
              />
            </div>
            
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Filter style={{ width: '16px', height: '16px', color: 'var(--mist)' }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
                style={{ minWidth: '140px' }}
              >
                <option value="all">All Status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            {/* Results Count */}
            <div className="text-small" style={{ color: 'var(--mist)' }}>
              {filteredProjects.length} of {projects.length} projects
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        {filteredProjects.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <h3 className="heading-3" style={{ marginBottom: 'var(--space-2)' }}>
              No projects found
            </h3>
            <p className="text-body" style={{ color: 'var(--mist)', marginBottom: 'var(--space-4)' }}>
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div 
            className={viewMode === 'grid' ? 'grid-3' : 'grid-1'} 
            style={{ gap: 'var(--space-6)' }}
          >
            {filteredProjects.map((project) => (
              <MinimalProjectCard
                key={project.id}
                project={project}
                onClick={handleProjectClick}
                className={viewMode === 'list' ? 'list-mode' : ''}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <h3 className="heading-3" style={{ marginBottom: 'var(--space-2)' }}>
          🏡 Places Integration Active
        </h3>
        <p className="text-body" style={{ color: 'var(--charcoal)' }}>
          All project cards display Indigenous and Western place names from the Notion Places database. 
          Click any project to view its full profile with network connections and detailed information.
        </p>
      </div>
    </div>
  );
};

export default ProjectsGallery;