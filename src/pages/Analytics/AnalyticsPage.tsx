import { useState } from 'react';
import { Card, LoadingSpinner } from '../../components/ui';
import { useProjects, useOpportunities, useOrganizations, usePeople, useArtifacts } from '../../hooks';
import CommunityImpactRadar from '../../components/charts/CommunityImpactRadar';
import GeographicImpactMap from '../../components/charts/GeographicImpactMap';
import OpportunityPipelineFunnel from '../../components/charts/OpportunityPipelineFunnel';
import TimeSeriesAnalytics from '../../components/charts/TimeSeriesAnalytics';
import RelationshipNetworkGraph from '../../components/charts/RelationshipNetworkGraph';
import PredictiveAnalytics from '../../components/charts/PredictiveAnalytics';
import { COMMUNITY_COLORS } from '../../constants/designSystem';
import { OpportunityStage } from '../../types';

/**
 * Advanced Analytics Intelligence Center
 * Comprehensive insights dashboard with sophisticated visualizations
 * Built for strategic decision-making and community impact analysis
 */
const AnalyticsPage = () => {
  const [activeView, setActiveView] = useState<'overview' | 'predictive' | 'network' | 'trends'>('overview');
  
  // Fetch all data sources
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: opportunities = [], isLoading: oppsLoading } = useOpportunities();
  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();
  const { data: people = [], isLoading: peopleLoading } = usePeople();
  const { data: artifacts = [], isLoading: artifactsLoading } = useArtifacts();

  const isLoading = projectsLoading || oppsLoading || orgsLoading || peopleLoading || artifactsLoading;

  // Calculate comprehensive metrics
  const metrics = {
    totalProjects: projects.length,
    totalRevenue: projects.reduce((sum, p) => sum + (p.revenueActual || 0), 0),
    totalOpportunities: opportunities.length,
    pipelineValue: opportunities.reduce((sum, o) => sum + (o.amount || 0), 0),
    networkSize: organizations.length + people.length,
    knowledgeAssets: artifacts.length,
    activeProjects: projects.filter(p => p.status === 'Active 🔥').length,
    conversionRate: opportunities.length > 0 ?
      (opportunities.filter(o => o.stage === OpportunityStage.CLOSED_WON).length / opportunities.length) * 100 : 0
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Elegant Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Intelligence Center</h1>
            <p className="text-gray-600">Advanced insights and predictive analytics for strategic community impact</p>
          </div>
          
          {/* View Selector */}
          <div className="flex rounded-xl border border-gray-200 bg-white p-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'predictive', label: 'Predictive', icon: '🔮' },
              { id: 'network', label: 'Network', icon: '🕸️' },
              { id: 'trends', label: 'Trends', icon: '📈' }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as 'overview' | 'projects' | 'opportunities' | 'network' | 'trends')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeView === view.id
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: activeView === view.id ? COMMUNITY_COLORS.primary[600] : 'transparent'
                }}
              >
                <span className="mr-2">{view.icon}</span>
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Executive Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl border border-teal-200">
          <div className="text-2xl font-bold text-teal-700 mb-1">
            {metrics.totalProjects}
          </div>
          <div className="text-sm text-teal-600">Total Projects</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <div className="text-2xl font-bold text-green-700 mb-1">
            ${Math.round(metrics.totalRevenue / 1000)}K
          </div>
          <div className="text-sm text-green-600">Revenue Generated</div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
          <div className="text-2xl font-bold text-amber-700 mb-1">
            {metrics.totalOpportunities}
          </div>
          <div className="text-sm text-amber-600">Opportunities</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <div className="text-2xl font-bold text-blue-700 mb-1">
            ${Math.round(metrics.pipelineValue / 1000)}K
          </div>
          <div className="text-sm text-blue-600">Pipeline Value</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
          <div className="text-2xl font-bold text-purple-700 mb-1">
            {metrics.networkSize}
          </div>
          <div className="text-sm text-purple-600">Network Entities</div>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
          <div className="text-2xl font-bold text-indigo-700 mb-1">
            {metrics.knowledgeAssets}
          </div>
          <div className="text-sm text-indigo-600">Knowledge Assets</div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
          <div className="text-2xl font-bold text-red-700 mb-1">
            {metrics.activeProjects}
          </div>
          <div className="text-sm text-red-600">Active Projects</div>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl border border-cyan-200">
          <div className="text-2xl font-bold text-cyan-700 mb-1">
            {metrics.conversionRate.toFixed(1)}%
          </div>
          <div className="text-sm text-cyan-600">Success Rate</div>
        </div>
      </div>

      {/* Dynamic Content Based on Selected View */}
      {activeView === 'overview' && (
        <div className="space-y-8">
          {/* Core Analytics */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <Card className="p-6">
              <CommunityImpactRadar 
                projects={projects}
                height={500}
                className="mb-4"
              />
            </Card>

            <Card className="p-6">
              <OpportunityPipelineFunnel 
                opportunities={opportunities}
                height={500}
                className="mb-4"
              />
            </Card>
          </div>

          {/* Geographic Analysis */}
          <Card className="p-6">
            <GeographicImpactMap 
              projects={projects}
              height={450}
              className="mb-4"
            />
          </Card>
        </div>
      )}

      {activeView === 'predictive' && (
        <div className="space-y-8">
          <Card className="p-6">
            <PredictiveAnalytics 
              opportunities={opportunities}
              projects={projects}
              height={600}
              className="mb-4"
            />
          </Card>
        </div>
      )}

      {activeView === 'network' && (
        <div className="space-y-8">
          <Card className="p-6">
            <RelationshipNetworkGraph 
              projects={projects}
              organizations={organizations}
              people={people}
              height={600}
              className="mb-4"
            />
          </Card>
        </div>
      )}

      {activeView === 'trends' && (
        <div className="space-y-8">
          <Card className="p-6">
            <TimeSeriesAnalytics 
              projects={projects}
              opportunities={opportunities}
              height={500}
              className="mb-4"
            />
          </Card>
          
          {/* Additional trend analysis */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <Card className="p-6">
              <CommunityImpactRadar 
                projects={projects}
                height={400}
                className="mb-4"
              />
            </Card>

            <Card className="p-6">
              <GeographicImpactMap 
                projects={projects}
                height={400}
                className="mb-4"
              />
            </Card>
          </div>
        </div>
      )}
      
      {/* Strategic Insights Footer */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Intelligence Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Community Impact</h4>
            <p className="text-sm text-gray-600">
              {metrics.totalProjects} projects spanning multiple focus areas with ${Math.round(metrics.totalRevenue / 1000)}K in generated revenue, 
              demonstrating strong community engagement and sustainable impact.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Growth Pipeline</h4>
            <p className="text-sm text-gray-600">
              ${Math.round(metrics.pipelineValue / 1000)}K in pipeline value across {metrics.totalOpportunities} opportunities, 
              with a {metrics.conversionRate.toFixed(1)}% success rate indicating healthy growth potential.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Network Strength</h4>
            <p className="text-sm text-gray-600">
              Robust ecosystem of {metrics.networkSize} connected entities supported by {metrics.knowledgeAssets} knowledge assets, 
              creating a foundation for sustained collaboration and impact.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;