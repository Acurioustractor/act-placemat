import { useState, useMemo } from 'react';
import { useProjects, useOpportunities, useOrganizations } from '../../hooks';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import MetricsCards from '../../components/dashboard/MetricsCards';
import DashboardCharts from '../../components/charts/DashboardCharts';
import ArtifactGrid from '../../components/artifacts/ArtifactGrid';
import ProjectDetailModal from '../../components/projects/ProjectDetailModal';
import { OpportunityStage } from '../../types';

/**
 * Enhanced Dashboard Page - Modern Zero Interface Design
 * 
 * Features:
 * - Proactive intelligence with key metrics
 * - Interactive data visualizations  
 * - Context-aware project insights
 * - Artifact grid with thumbnails
 * - Real-time data integration
 * 
 * Based on research of modern dashboard patterns from:
 * - Zero interface design (2025 trend)
 * - Finance analytics tools (Stripe, QuickBooks)
 * - Database platforms (Retool, Notion, Airtable)
 */
const EnhancedDashboardPage = () => {
  const [selectedProject, setSelectedProject] = useState<Record<string, unknown> | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'insights' | 'artifacts'>('overview');

  // Fetch data with intelligent fallbacks
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: opportunities = [], isLoading: opportunitiesLoading, error: opportunitiesError } = useOpportunities();
  const { data: organizations = [], isLoading: organizationsLoading, error: organizationsError } = useOrganizations();

  const isLoading = projectsLoading || opportunitiesLoading || organizationsLoading;
  const hasError = projectsError || opportunitiesError || organizationsError;

  // Intelligent insights based on data patterns
  const insights = useMemo(() => {
    if (!projects.length) return [];

    const insights = [];

    // Revenue growth opportunity
    const totalActual = projects.reduce((sum, p) => sum + (p.revenueActual || 0), 0);
    const totalPotential = projects.reduce((sum, p) => sum + (p.revenuePotential || 0), 0);
    const growthPotential = totalPotential - totalActual;

    if (growthPotential > totalActual * 0.5) {
      insights.push({
        type: 'opportunity',
        title: 'Significant Revenue Growth Potential',
        description: `Projects show ${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(growthPotential)} in untapped revenue potential.`,
        action: 'Review high-potential projects',
        priority: 'high'
      });
    }

    // Active project concentration
    const activeProjects = projects.filter(p => p.status?.includes('Active'));
    const themes = activeProjects.reduce((acc: Record<string, number>, p) => {
      const projectThemes = Array.isArray(p.themes) ? p.themes : [];
      projectThemes.forEach(theme => {
        acc[theme] = (acc[theme] || 0) + 1;
      });
      return acc;
    }, {});

    const topTheme = Object.entries(themes).sort(([,a], [,b]) => (b as number) - (a as number))[0];
    if (topTheme && (topTheme[1] as number) > 2) {
      insights.push({
        type: 'trend',
        title: `Strong Focus on ${topTheme[0]}`,
        description: `${topTheme[1]} active projects are concentrated in this theme area.`,
        action: 'Explore synergies',
        priority: 'medium'
      });
    }

    // Partnership opportunity
    const appliedOpportunities = opportunities.filter(o => o.stage === OpportunityStage.PROPOSAL).length;
    if (appliedOpportunities > 3) {
      insights.push({
        type: 'action',
        title: 'Multiple Applications in Progress',
        description: `${appliedOpportunities} funding applications need follow-up attention.`,
        action: 'Check application status',
        priority: 'high'
      });
    }

    return insights;
  }, [projects, opportunities]);

  // Mock artifacts data (in real app, would come from API)
  const recentArtifacts = useMemo(() => [
    {
      id: '1',
      name: 'Youth Justice Strategy 2025',
      type: 'Strategy Document',
      format: 'PDF',
      description: 'Comprehensive strategy for youth justice reform initiatives across Queensland.',
      thumbnailUrl: '/api/placeholder/300/200', // Would be actual thumbnail from database
      status: 'Published',
      tags: ['Strategy', 'Youth Justice', 'Policy'],
      createdBy: 'Policy Team',
      lastModified: new Date('2024-01-15'),
      relatedProjects: ['proj-1', 'proj-2']
    },
    {
      id: '2', 
      name: 'Economic Freedom Impact Report',
      type: 'Research Report',
      format: 'PDF',
      description: 'Analysis of economic impact across ACT economic freedom initiatives.',
      thumbnailUrl: '/api/placeholder/300/200',
      status: 'Draft',
      tags: ['Research', 'Economic Freedom', 'Impact'],
      createdBy: 'Research Team',
      lastModified: new Date('2024-01-10'),
      relatedProjects: ['proj-3']
    },
    {
      id: '3',
      name: 'Indigenous Community Engagement Presentation',
      type: 'Presentation',
      format: 'PowerPoint',
      description: 'Community engagement strategy and outcomes presentation for stakeholders.',
      thumbnailUrl: '/api/placeholder/300/200',
      status: 'In Review',
      tags: ['Presentation', 'Indigenous', 'Engagement'],
      createdBy: 'Community Team',
      lastModified: new Date('2024-01-08'),
      relatedProjects: ['proj-4', 'proj-5']
    }
  ], []);

  const handleProjectClick = (project: Record<string, unknown>) => {
    setSelectedProject(project);
    setIsProjectModalOpen(true);
  };

  const handleArtifactClick = (artifact: { fileUrl?: string; [key: string]: unknown }) => {
    // In a real app, this might open an artifact viewer or navigate to detail page
    console.log('Artifact clicked:', artifact);
    if (artifact.fileUrl) {
      window.open(artifact.fileUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <ErrorState
        message="Error loading dashboard data"
        details="There was a problem fetching the dashboard data. Please try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header with Zero Interface Philosophy */}
      <div className="bg-gradient-to-r from-primary-50 via-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ACT Placemat Dashboard</h1>
            <p className="text-gray-600">Intelligent insights for social impact projects</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex rounded-lg border border-gray-200 bg-white">
              {['overview', 'insights', 'artifacts'].map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view as 'overview' | 'insights' | 'artifacts')}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    activeView === view
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  } ${view === 'overview' ? 'rounded-l-lg' : view === 'artifacts' ? 'rounded-r-lg' : ''}`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Proactive Insights - Zero Interface Design */}
        {insights.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">🧠 Intelligent Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, index) => (
                <Card key={index} className={`p-4 border-l-4 ${
                  insight.priority === 'high' ? 'border-l-red-500 bg-red-50' :
                  insight.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                  'border-l-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>
                      <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 p-0">
                        {insight.action} →
                      </Button>
                    </div>
                    <Badge variant={insight.priority === 'high' ? 'danger' : insight.priority === 'medium' ? 'warning' : 'primary'}>
                      {insight.type}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {activeView === 'overview' && (
        <>
          {/* Key Metrics - Finance Dashboard Inspired */}
          <MetricsCards 
            projects={projects} 
            opportunities={opportunities} 
            organizations={organizations} 
          />

          {/* Interactive Data Visualizations */}
          <DashboardCharts 
            projects={projects} 
            opportunities={opportunities} 
            organizations={organizations} 
          />

          {/* Recent Projects with Click-through */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
              <Button variant="ghost" size="sm">View All →</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.slice(0, 6).map((project) => (
                <Card 
                  key={project.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{project.name}</h3>
                    <Badge variant={project.status?.includes('Active') ? 'success' : 'default'} className="ml-2 flex-shrink-0">
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{project.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{project.location}</span>
                    <span className="font-medium text-green-600">
                      {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(project.revenueActual || 0)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </>
      )}

      {activeView === 'insights' && (
        <div className="space-y-6">
          {/* Advanced Analytics View */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Advanced Analytics</h2>
            <p className="text-gray-600 mb-4">Deep insights into project performance and opportunities.</p>
            <DashboardCharts 
              projects={projects} 
              opportunities={opportunities} 
              organizations={organizations} 
            />
          </Card>
        </div>
      )}

      {activeView === 'artifacts' && (
        <div className="space-y-6">
          {/* Artifact Grid with Thumbnails */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Artifacts</h2>
              <Badge variant="default">{recentArtifacts.length} items</Badge>
            </div>
            
            <ArtifactGrid 
              artifacts={recentArtifacts}
              onArtifactClick={handleArtifactClick}
            />
          </Card>
        </div>
      )}

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={selectedProject}
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setSelectedProject(null);
        }}
      />
    </div>
  );
};

export default EnhancedDashboardPage;